/**
 * aaron/api.ts — the ONLY server-side code Aaron uses.
 *
 * It has exactly one job: hold the LLM provider key and pass the Anthropic
 * Messages wire format through to a configurable upstream, streaming the
 * response back untouched.
 *
 * WHAT RUNS HERE (the complete list):
 *   1. An access-token check.
 *   2. A model-id remap, if AARON_MODEL_MAP is set.
 *   3. fetch() to the upstream, with the provider key attached.
 *   4. The upstream's body streamed back verbatim, plus its rate-limit headers.
 *   5. On /spend only: a read-only reporting call with a SEPARATE admin key,
 *      aggregated to a few numbers, memoized in memory for 60s.
 *
 * WHAT DOES NOT RUN HERE — deliberately, so the agent loop stays in the tab:
 *   - No prompt or response logging. Bodies are never read, only forwarded.
 *   - No persistent storage. No database, no files. The only state is the 60s
 *     spend memo above: aggregate dollar figures, never prompt data.
 *   - No tool execution. Tools run in the browser; the server never sees a
 *     tool result it didn't just proxy as opaque JSON.
 *   - No conversation state. Every request carries its own full history.
 *   - No system-prompt injection, no model defaults, no retry logic.
 *   - The admin key is never used for inference, and never leaves this file.
 *
 * WHY THE ANTHROPIC WIRE FORMAT IS THE CANONICAL CONTRACT: Anthropic,
 * OpenRouter (`/api/v1/messages`), and LiteLLM (`/v1/messages`) all speak it.
 * That makes switching providers a config change rather than a translation
 * layer — and a translation layer would be the expensive kind, because
 * thinking blocks and their signatures have no OpenAI-shaped equivalent.
 *
 * CONFIG (all via env, none of it ever sent to the browser):
 *   AARON_ACCESS_TOKEN  required. Shared secret the page must present.
 *                       Unset => this endpoint refuses every request (503).
 *   AARON_PROVIDER      anthropic (default) | openrouter | litellm | custom
 *   AARON_LLM_KEY       provider key. Falls back to ANTHROPIC_API_KEY when
 *                       provider is anthropic.
 *   AARON_LLM_BASE_URL  required for `custom`; overrides the base for others.
 *   AARON_LLM_PATH      defaults to /v1/messages (or /api/v1/messages for
 *                       openrouter).
 *   AARON_MODEL_MAP     optional JSON, e.g. {"claude-opus-5":"anthropic/claude-opus-4.5"}
 *                       Provider model slugs differ; nothing is guessed for you.
 *   AARON_ADMIN_KEY     optional, /spend only. Deliberately separate from
 *                       AARON_LLM_KEY because it is a different, broader
 *                       credential: Anthropic wants an admin key (org-wide
 *                       read), OpenRouter a management key. Unset => /spend
 *                       reports unavailable and everything else still works.
 *
 * ON "HOW MUCH IS LEFT": Anthropic has no balance endpoint at any auth level —
 * cost_report gives spend, so remaining is null and the UI must not imply
 * otherwise. OpenRouter's /credits does return purchased-vs-used, so on that
 * provider a true remaining balance exists. Same route, honestly different
 * answers; `kind` tells the client which it got.
 */

const PROVIDERS: Record<string, { base: string; path: string; auth: (k: string) => Record<string, string>; extra?: Record<string, string> }> = {
  anthropic: {
    base: "https://api.anthropic.com",
    path: "/v1/messages",
    auth: (k) => ({ "x-api-key": k, "anthropic-version": "2023-06-01" }),
  },
  openrouter: {
    base: "https://openrouter.ai",
    path: "/api/v1/messages",
    auth: (k) => ({ authorization: `Bearer ${k}`, "anthropic-version": "2023-06-01" }),
    // OpenRouter attributes traffic by referer/title. Harmless, and it makes
    // Aaron's usage identifiable in their dashboard.
    extra: { "http-referer": "https://aaron.weolopez.com", "x-title": "Aaron" },
  },
  litellm: {
    // Dormant on this box (container exited, /root/litellm has no config).
    // Point AARON_LLM_BASE_URL at it once it's running again.
    base: "http://127.0.0.1:4000",
    path: "/v1/messages",
    auth: (k) => ({ authorization: `Bearer ${k}`, "anthropic-version": "2023-06-01" }),
  },
  custom: {
    base: "",
    path: "/v1/messages",
    auth: (k) => ({ authorization: `Bearer ${k}`, "anthropic-version": "2023-06-01" }),
  },
};

const env = (k: string) => Deno.env.get(k)?.trim() || "";

function config() {
  const name = env("AARON_PROVIDER") || "anthropic";
  const p = PROVIDERS[name] ?? PROVIDERS.custom;
  const key = env("AARON_LLM_KEY") || (name === "anthropic" ? env("ANTHROPIC_API_KEY") : "");
  return {
    name,
    base: env("AARON_LLM_BASE_URL") || p.base,
    path: env("AARON_LLM_PATH") || p.path,
    key,
    headers: p.auth(key),
    extra: p.extra ?? {},
    token: env("AARON_ACCESS_TOKEN"),
    // Separate from `key` on purpose: broader credential, reporting only.
    adminKey: env("AARON_ADMIN_KEY"),
  };
}

const SPEND_PROVIDERS = new Set(["anthropic", "openrouter"]);

function modelMap(): Record<string, string> {
  try { return JSON.parse(env("AARON_MODEL_MAP") || "{}"); } catch { return {}; }
}

/* --------------------------------------------------------------- spend ----
   Read-only reporting, one implementation per provider because the shapes
   genuinely differ — and so does what's knowable.                          */

type Spend = {
  provider: string;
  kind: "cost_report" | "credits";
  currency: string;
  spend: number;              // dollars
  remaining: number | null;   // null when the provider has no notion of one
  total_credits: number | null;
  since: string | null;
  until: string;
  buckets: { date: string; amount: number }[];
  note: string;
};

// Anthropic admin keys go on x-api-key; OAuth tokens go on Authorization.
const adminAuth = (key: string): Record<string, string> =>
  key.startsWith("sk-ant-")
    ? { "x-api-key": key, "anthropic-version": "2023-06-01" }
    : { authorization: `Bearer ${key}`, "anthropic-version": "2023-06-01" };

async function anthropicSpend(key: string, days: number): Promise<Spend> {
  // Snap to the start of a UTC day; cost_report buckets daily.
  const start = new Date(Date.now() - days * 86_400_000);
  start.setUTCHours(0, 0, 0, 0);

  const buckets: { date: string; amount: number }[] = [];
  let cents = 0, currency = "USD", page: string | null = null, guard = 0;

  do {
    const q = new URLSearchParams({ starting_at: start.toISOString(), bucket_width: "1d", limit: "31" });
    if (page) q.set("page", page);
    const r = await fetch(`https://api.anthropic.com/v1/organizations/cost_report?${q}`, { headers: adminAuth(key) });
    if (!r.ok) throw new Error(`cost_report returned HTTP ${r.status}: ${(await r.text()).slice(0, 300)}`);
    const body = await r.json();

    for (const b of body.data ?? []) {
      // `amount` is in the currency's LOWEST units (cents) as a decimal
      // string — "123.45" is $1.23, not $123.45. Sum first, divide once.
      let bucketCents = 0;
      for (const item of b.results ?? []) {
        bucketCents += Number(item.amount ?? 0);
        if (item.currency) currency = item.currency;
      }
      cents += bucketCents;
      buckets.push({ date: String(b.starting_at ?? "").slice(0, 10), amount: bucketCents / 100 });
    }
    page = body.has_more ? body.next_page : null;
  } while (page && ++guard < 12);

  return {
    provider: "anthropic", kind: "cost_report", currency,
    spend: cents / 100,
    remaining: null, total_credits: null,
    since: start.toISOString(), until: new Date().toISOString(),
    buckets,
    note: "Anthropic reports spend, not balance — no API exposes remaining credit.",
  };
}

async function openrouterSpend(key: string): Promise<Spend> {
  const r = await fetch("https://openrouter.ai/api/v1/credits", { headers: { authorization: `Bearer ${key}` } });
  if (!r.ok) throw new Error(`credits returned HTTP ${r.status}: ${(await r.text()).slice(0, 300)}`);
  const d = (await r.json()).data ?? {};
  // Already dollars here, unlike Anthropic's cents.
  const total = Number(d.total_credits ?? 0), used = Number(d.total_usage ?? 0);
  return {
    provider: "openrouter", kind: "credits", currency: "USD",
    spend: used,
    remaining: total - used, total_credits: total,
    since: null, until: new Date().toISOString(),
    buckets: [],
    note: "Lifetime totals for the key, not a windowed report.",
  };
}

// 60s memo: the meter may be polled on every reload, and these are slow,
// rate-limited reporting endpoints. Aggregates only.
let spendMemo: { at: number; days: number; value: Spend } | null = null;

async function getSpend(provider: string, key: string, days: number): Promise<Spend> {
  if (spendMemo && spendMemo.days === days && Date.now() - spendMemo.at < 60_000) return spendMemo.value;
  const value = provider === "openrouter" ? await openrouterSpend(key) : await anthropicSpend(key, days);
  spendMemo = { at: Date.now(), days, value };
  return value;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

const fail = (status: number, message: string, hint?: string) =>
  json({ type: "error", error: { type: "aaron_proxy_error", message, hint } }, status);

export async function handleAaronApi(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const route = url.pathname.replace(/^\/aaron\/api\/?/, "");

  if (req.method === "OPTIONS") return new Response(null, { status: 204 });

  const cfg = config();

  // Fail closed. An LLM proxy holding a billable key must never be reachable
  // without a secret, so a missing token disables the endpoint outright
  // rather than defaulting to open.
  if (!cfg.token) {
    return fail(503, "Aaron's proxy is not configured.", "Set AARON_ACCESS_TOKEN in .env and restart http-server.service.");
  }

  // What the page is allowed to know: which upstream is live and whether it
  // is usable. Never the key, never the token.
  if (route === "config") {
    return json({
      provider: cfg.name,
      upstream: cfg.base + cfg.path,
      has_key: Boolean(cfg.key),
      model_map: modelMap(),
      // Lets the UI decide whether to offer real spend at all, without
      // making a slow reporting call just to find out.
      spend: { available: Boolean(cfg.adminKey && SPEND_PROVIDERS.has(cfg.name)), provider: cfg.name },
    });
  }

  if (route === "spend") {
    if (req.headers.get("x-aaron-token") !== cfg.token) {
      return fail(401, "Bad or missing access token.");
    }
    if (!SPEND_PROVIDERS.has(cfg.name)) {
      return fail(501, `No spend reporter for provider "${cfg.name}".`,
        "Anthropic (cost_report) and OpenRouter (credits) are implemented.");
    }
    if (!cfg.adminKey) {
      return fail(503, "No reporting key configured.",
        cfg.name === "openrouter"
          ? "Set AARON_ADMIN_KEY to an OpenRouter management key."
          : "Set AARON_ADMIN_KEY to an Anthropic admin key (sk-ant-admin...). It is org-wide read — keep it out of the browser.");
    }
    const days = Math.min(Math.max(Number(url.searchParams.get("days")) || 30, 1), 365);
    try {
      return json(await getSpend(cfg.name, cfg.adminKey, days));
    } catch (e) {
      return fail(502, "Reporting call failed.", String((e as Error)?.message ?? e));
    }
  }

  if (route !== "llm") return fail(404, `No such route: /aaron/api/${route}`, "Routes: llm, config, spend.");
  if (req.method !== "POST") return fail(405, "POST only.");

  if (req.headers.get("x-aaron-token") !== cfg.token) {
    return fail(401, "Bad or missing access token.", "Open the Access panel in Aaron and paste the token from .env.");
  }
  if (!cfg.key) {
    return fail(503, `No provider key configured for "${cfg.name}".`, "Set AARON_LLM_KEY (or ANTHROPIC_API_KEY) in .env and restart http-server.service.");
  }
  if (!cfg.base) {
    return fail(503, "No upstream base URL configured.", "Set AARON_LLM_BASE_URL in .env.");
  }

  // The body is parsed for exactly one reason: remapping the model id, since
  // provider slugs differ. Nothing else is inspected, kept, or logged.
  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return fail(400, "Body must be JSON in the Anthropic Messages shape.");
  }
  const map = modelMap();
  if (typeof payload.model === "string" && map[payload.model]) payload.model = map[payload.model];

  let upstream: Response;
  try {
    upstream = await fetch(cfg.base + cfg.path, {
      method: "POST",
      headers: { "content-type": "application/json", ...cfg.headers, ...cfg.extra },
      body: JSON.stringify(payload),
      signal: req.signal, // client hits Stop -> we drop the upstream request too
    });
  } catch (e) {
    return fail(502, `Could not reach ${cfg.name} at ${cfg.base}.`, String((e as Error)?.message ?? e));
  }

  // Forward rate-limit and request-id headers so the browser's usage meter
  // keeps reading the provider's real numbers rather than a local guess.
  const out = new Headers({
    "content-type": upstream.headers.get("content-type") ?? "application/json",
    "cache-control": "no-store",
    "x-aaron-provider": cfg.name,
  });
  for (const [k, v] of upstream.headers) {
    if (k.startsWith("anthropic-ratelimit-") || k === "retry-after" || k === "request-id") out.set(k, v);
  }

  // Body streams straight through — SSE frames are never buffered or rewritten,
  // which is what keeps the loop's streaming behavior identical to direct calls.
  return new Response(upstream.body, { status: upstream.status, headers: out });
}

export default handleAaronApi;
