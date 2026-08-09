/**
 * aaron/api.ts — the ONLY server-side code Aaron uses.
 *
 * It has exactly one job: hold the LLM provider key and pass the Anthropic
 * Messages wire format through to a configurable upstream, streaming the
 * response back untouched.
 *
 * WHAT RUNS HERE (the complete list):
 *   1. Identity: a Google session looked up in the database.
 *   2. A model-id remap, if a model map is configured.
 *   3. fetch() to the upstream, with the provider key attached.
 *   4. The upstream's body streamed back verbatim, plus its rate-limit headers.
 *   5. On /spend only: a read-only reporting call with a SEPARATE admin key,
 *      aggregated to a few numbers, memoized in memory for 60s.
 *   6. Reading and writing a fixed set of config keys (see SETTING_KEYS /
 *      SECRET_KEYS) so the app is configurable without shell access.
 *   7. On /skills and /plans only: storing records verbatim, per account, so a
 *      toolbox written on one device — or a plan drafted on it — shows up on
 *      another. Storage only: skill code is NEVER executed, compiled, or
 *      inspected here, and a plan is never read, ranked, or acted on. Both are
 *      opaque blobs to this file and mean something only in the browser.
 *
 * WHAT DOES NOT RUN HERE — deliberately, so the agent loop stays in the tab:
 *   - No prompt or response logging. Bodies are never read, only forwarded.
 *     The database holds sessions, config, skills, and plans — never
 *     conversation data.
 *   - No arbitrary key-value storage: the settings routes accept a fixed key
 *     whitelist, and /skills and /plans are scoped to one account's own
 *     namespace, because anyone signed in can reach all three.
 *   - No cross-account reads. Records are keyed by email and never shared:
 *     the browser compiles skill code into a function and runs it, so serving
 *     one user's code to another would be stored code execution.
 *   - No plan approval. Approval is a human act performed in the browser; the
 *     server stores whatever status arrives and never sets one itself.
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
 * WHO GETS IN: Google sign-in, sessions in Deno KV (./aaron/aaron.db), same
 * pattern as EPL predict-the-score. The browser holds an HttpOnly cookie it
 * cannot read, so there is no longer a bearer secret sitting in localStorage
 * on a phone you carry around. AARON_ACCESS_TOKEN survives only as an
 * explicitly-opt-in break-glass fallback; unset it once sign-in works.
 *
 * CONFIG lives in the database (Account -> Settings), with env as a read-only
 * fallback during migration. Precedence is always DB > env. Secrets are
 * write-only: stored, never read back, not even to an admin.
 *
 * ENV FALLBACKS (none of it ever sent to the browser):
 *   GOOGLE_CLIENT_ID    OAuth client. The id_token's `aud` is checked against
 *                       it, so a token minted for another app is rejected.
 *   AARON_ALLOWED_EMAILS  comma-separated allowlist. Defaults to the repo
 *                       owner. Anyone else gets a 403 with their address named.
 *   AARON_KV_PATH       KV file, default ./aaron/aaron.db
 *   AARON_ACCESS_TOKEN  optional break-glass shared secret. Unset it to make
 *                       Google sign-in the only way in.
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

/* ------------------------------------------------------------- settings ---
   Configuration lives in the database, with env as a read-only fallback so
   nothing breaks mid-migration. Precedence is always DB > env, so writing a
   setting shadows the environment permanently.

   Two namespaces, treated differently on the way out:
     ["aaron_settings", k]  readable — provider, model map, allowlist
     ["aaron_secrets",  k]  write-only — API keys. Never leave this file.

   Only these keys exist. There is no arbitrary key-value store here, because
   the settings routes are reachable by anyone signed in.                    */

const SETTING_KEYS = ["provider", "base_url", "path", "model_map", "allowed_emails"] as const;
const SECRET_KEYS = ["llm_key", "admin_key"] as const;
type SettingKey = (typeof SETTING_KEYS)[number];
type SecretKey = (typeof SECRET_KEYS)[number];

/* Per-account mirrors. Two record types, one storage contract: stored verbatim
   under ["<kv>", email, slug], scoped to the account, never interpreted here.
   Skill `code` is compiled and run by the browser; a plan is read by a person.
   Either way this file only ever sees an opaque blob, and that is exactly what
   keeps a stored string from becoming server-side code execution.

   `check` validates the envelope — enough to keep junk and unbounded blobs out
   of the database, deliberately not enough to be a schema the server depends
   on. A record may carry any other field the browser wants; it round-trips. */

type MirrorCheck = (rec: Record<string, unknown>) => [number, string] | null;
const MIRRORS: Record<string, { kv: string; noun: string; check: MirrorCheck }> = {
  skills: {
    kv: "aaron_skills",
    noun: "skill",
    check: (r) =>
      typeof r?.code !== "string"
        ? [400, "A skill needs a `code` string."]
        : (r.code as string).length > 20000
        ? [413, "Skill code exceeds 20000 chars."]
        : null,
  },
  plans: {
    kv: "aaron_plans",
    noun: "plan",
    check: (r) =>
      typeof r?.title !== "string"
        ? [400, "A plan needs a `title` string."]
        : JSON.stringify(r).length > 200000
        ? [413, "Plan exceeds 200000 chars."]
        : null,
  },
};

// One read per request, so a settings change takes effect on the next call
// rather than needing a restart — the point of moving off .env.
async function loadStore(): Promise<{ settings: Record<string, unknown>; secrets: Record<string, string> }> {
  const k = await db();
  const settings: Record<string, unknown> = {};
  const secrets: Record<string, string> = {};
  for await (const e of k.list<unknown>({ prefix: ["aaron_settings"] })) settings[String(e.key[1])] = e.value;
  for await (const e of k.list<string>({ prefix: ["aaron_secrets"] })) secrets[String(e.key[1])] = e.value;
  return { settings, secrets };
}

async function putSetting(key: SettingKey, value: unknown) {
  await (await db()).set(["aaron_settings", key], value);
}
async function putSecret(key: SecretKey, value: string) {
  const k = await db();
  // Empty clears rather than storing "", so a blank field means "fall back to env".
  if (value) await k.set(["aaron_secrets", key], value);
  else await k.delete(["aaron_secrets", key]);
}

function config(store?: { settings: Record<string, unknown>; secrets: Record<string, string> }) {
  const s = store?.settings ?? {};
  const sec = store?.secrets ?? {};
  const pick = (dbKey: string, envKey: string) => String(s[dbKey] ?? "") || env(envKey);
  const name = pick("provider", "AARON_PROVIDER") || "anthropic";
  const p = PROVIDERS[name] ?? PROVIDERS.custom;
  const key = sec.llm_key || env("AARON_LLM_KEY") || (name === "anthropic" ? env("ANTHROPIC_API_KEY") : "");
  return {
    name,
    base: pick("base_url", "AARON_LLM_BASE_URL") || p.base,
    path: pick("path", "AARON_LLM_PATH") || p.path,
    key,
    headers: p.auth(key),
    extra: p.extra ?? {},
    token: env("AARON_ACCESS_TOKEN"),
    // Separate from `key` on purpose: broader credential, reporting only.
    adminKey: sec.admin_key || env("AARON_ADMIN_KEY"),
    modelMap: (s.model_map as Record<string, string>) ?? modelMapFromEnv(),
    allowed: Array.isArray(s.allowed_emails)
      ? (s.allowed_emails as string[]).map((e) => String(e).trim().toLowerCase()).filter(Boolean)
      : allowedFromEnv(),
  };
}

const SPEND_PROVIDERS = new Set(["anthropic", "openrouter"]);

function modelMapFromEnv(): Record<string, string> {
  try { return JSON.parse(env("AARON_MODEL_MAP") || "{}"); } catch { return {}; }
}
const allowedFromEnv = () =>
  (env("AARON_ALLOWED_EMAILS") || "weolopez@gmail.com")
    .split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);

/* ----------------------------------------------------------------- auth ---
   Google sign-in with sessions in Deno KV, matching epl/api.ts. The client
   never holds a credential it can read: the session id is an HttpOnly cookie,
   and the Google id_token is spent once at login and discarded.            */

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
// No hardcoded fallback on purpose: with one, the "no way to authenticate"
// check below could never fire, and a fail-closed guard that cannot fire is
// worse than none at all. .env and the systemd unit both provide this.
const GOOGLE_CLIENT_ID = () => env("GOOGLE_CLIENT_ID");

type Session = { sub: string; email: string; name: string; avatar: string; at: number };

// Opened lazily so tests can point AARON_KV_PATH at :memory: before first use.
let _kv: Deno.Kv | null = null;
const db = async () => (_kv ??= await Deno.openKv(env("AARON_KV_PATH") || "./aaron/aaron.db"));

async function createSession(s: Session): Promise<string> {
  const id = crypto.randomUUID();
  await (await db()).set(["aaron_sessions", id], s, { expireIn: WEEK_MS });
  return id;
}
async function readSession(id: string | null): Promise<Session | null> {
  if (!id) return null;
  return (await (await db()).get<Session>(["aaron_sessions", id])).value ?? null;
}
async function dropSession(id: string | null): Promise<void> {
  if (id) await (await db()).delete(["aaron_sessions", id]);
}

function cookie(req: Request, name: string): string | null {
  const m = (req.headers.get("cookie") || "").split(";").map((s) => s.trim())
    .find((s) => s.startsWith(name + "="));
  return m ? m.slice(name.length + 1) : null;
}

const sessionCookie = (req: Request, id: string, maxAge = 604800) =>
  `aaron_session=${id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}` +
  // Secure would make the cookie undeliverable over plain http on localhost.
  (new URL(req.url).protocol === "https:" ? "; Secure" : "");

/**
 * Verifies a Google id_token. Beyond the shared recipe this also checks `aud`
 * and `email_verified` — without the aud check, an id_token minted for any
 * other Google app would be accepted here.
 */
async function verifyGoogle(credential: string): Promise<Session> {
  const r = await fetch("https://oauth2.googleapis.com/tokeninfo?id_token=" + encodeURIComponent(credential));
  if (!r.ok) throw new Error("Google rejected the credential");
  const p = await r.json();
  if (p.aud !== GOOGLE_CLIENT_ID()) throw new Error("Token was issued for a different application");
  if (p.email_verified === "false" || p.email_verified === false) throw new Error("Google account has no verified email");
  if (!p.email) throw new Error("Token carries no email");
  return { sub: p.sub, email: String(p.email).toLowerCase(), name: p.name ?? "", avatar: p.picture ?? "", at: Date.now() };
}

/** A valid session, or the Response explaining why not. */
async function authorize(req: Request, tokenFallback: string): Promise<Session | Response> {
  const s = await readSession(cookie(req, "aaron_session"));
  if (s) return s;
  if (tokenFallback && req.headers.get("x-aaron-token") === tokenFallback) {
    return { sub: "break-glass", email: "token@local", name: "Token", avatar: "", at: Date.now() };
  }
  return fail(401, "Not signed in.", "Sign in with Google in Aaron, or present the break-glass token if one is configured.");
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

  const store = await loadStore();
  const cfg = config(store);

  // Fail closed. An LLM proxy holding a billable key must never be reachable
  // without a way to say who you are, so with neither sign-in nor a token the
  // endpoint disables itself rather than defaulting to open.
  if (!GOOGLE_CLIENT_ID() && !cfg.token) {
    return fail(503, "Aaron's proxy has no way to authenticate anyone.",
      "Set GOOGLE_CLIENT_ID (preferred) or AARON_ACCESS_TOKEN in .env, then restart http-server.service.");
  }

  // What the page is allowed to know: which upstream is live, whether it is
  // usable, and how to sign in. Never a key, never a session id.
  if (route === "config") {
    return json({
      provider: cfg.name,
      upstream: cfg.base + cfg.path,
      has_key: Boolean(cfg.key),
      model_map: cfg.modelMap,
      // Lets the UI decide whether to offer real spend at all, without
      // making a slow reporting call just to find out.
      spend: { available: Boolean(cfg.adminKey && SPEND_PROVIDERS.has(cfg.name)), provider: cfg.name },
      auth: {
        google: Boolean(GOOGLE_CLIENT_ID()),
        client_id: GOOGLE_CLIENT_ID(),   // public by design; it appears in the redirect URL
        token_fallback: Boolean(cfg.token),
      },
    });
  }

  /* --- sign in / out ---------------------------------------------------- */

  if (route === "login") {
    if (req.method !== "POST") return fail(405, "POST only.");
    let credential: string;
    try { credential = (await req.json()).credential; } catch { return fail(400, "Body must be JSON."); }
    if (!credential) return fail(400, "Missing credential.");

    let who: Session;
    try { who = await verifyGoogle(credential); }
    catch (e) { return fail(401, "Sign-in failed.", String((e as Error)?.message ?? e)); }

    if (!cfg.allowed.includes(who.email)) {
      // Naming the address makes a wrong-Google-account mixup obvious, which
      // is the overwhelmingly common cause of this 403.
      return fail(403, `${who.email} is not on Aaron's allowlist.`,
        "Ask someone already signed in to add it under Account \u2192 Settings.");
    }

    const id = await createSession(who);
    return new Response(JSON.stringify({ ok: true, user: { email: who.email, name: who.name, avatar: who.avatar } }), {
      headers: { "content-type": "application/json", "cache-control": "no-store", "set-cookie": sessionCookie(req, id) },
    });
  }

  if (route === "me") {
    const s = await readSession(cookie(req, "aaron_session"));
    return json({
      authenticated: Boolean(s),
      user: s ? { email: s.email, name: s.name, avatar: s.avatar } : null,
      token_fallback: Boolean(cfg.token),
    });
  }

  /* --- settings, stored in the DB rather than .env ---------------------- */

  if (route === "settings") {
    const who = await authorize(req, cfg.token);
    if (who instanceof Response) return who;

    if (req.method === "GET") {
      return json({
        provider: cfg.name,
        base_url: store.settings.base_url ?? "",
        path: store.settings.path ?? "",
        model_map: cfg.modelMap,
        allowed_emails: cfg.allowed,
        // Presence only — a stored secret is never readable back, by anyone.
        secrets: { llm_key: Boolean(cfg.key), admin_key: Boolean(cfg.adminKey) },
        // So the UI can say which values are still coming from the environment.
        from_env: {
          provider: !store.settings.provider && Boolean(env("AARON_PROVIDER")),
          allowed_emails: !Array.isArray(store.settings.allowed_emails),
          llm_key: !store.secrets.llm_key && Boolean(cfg.key),
          admin_key: !store.secrets.admin_key && Boolean(cfg.adminKey),
        },
      });
    }

    if (req.method !== "POST") return fail(405, "GET or POST.");

    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { return fail(400, "Body must be JSON."); }

    // Refuse to write an allowlist that locks the current user out — the
    // fastest way to make this app unrecoverable without shell access.
    if ("allowed_emails" in body) {
      const list = (Array.isArray(body.allowed_emails) ? body.allowed_emails : [])
        .map((e) => String(e).trim().toLowerCase()).filter(Boolean);
      if (!list.length) return fail(400, "The allowlist cannot be empty.");
      if (who.email !== "token@local" && !list.includes(who.email)) {
        return fail(400, `That would lock you out — ${who.email} must stay on the list.`);
      }
      await putSetting("allowed_emails", list);
    }

    for (const k of SETTING_KEYS) {
      if (k === "allowed_emails" || !(k in body)) continue;
      if (k === "model_map" && typeof body[k] !== "object") return fail(400, "model_map must be an object.");
      if (k !== "model_map" && typeof body[k] !== "string") return fail(400, `${k} must be a string.`);
      await putSetting(k, body[k]);
    }
    for (const k of SECRET_KEYS) {
      if (!(k in body)) continue;
      if (typeof body[k] !== "string") return fail(400, `${k} must be a string.`);
      await putSecret(k, String(body[k]).trim());
    }

    spendMemo = null;   // provider or key may have changed under it
    return json({ ok: true });
  }

  /* --- skills and plans, mirrored per account ---------------------------- */

  const kind = route.split("/")[0];
  const mirror = MIRRORS[kind];
  if (mirror) {
    const who = await authorize(req, cfg.token);
    if (who instanceof Response) return who;
    // Not split("/")[1]: a slug may legitimately contain a slash, and it has
    // to survive the round trip intact.
    const slug = decodeURIComponent(route.slice(kind.length + 1));

    if (req.method === "GET") {
      const k = await db();
      const out: Record<string, unknown> = {};
      // Keyed by account: one user's code must never be handed to another's
      // tab, because the browser compiles it into a function and runs it.
      for await (const e of k.list({ prefix: [mirror.kv, who.email] })) {
        out[String(e.key[2])] = e.value;
      }
      return json({ [kind]: out });
    }

    if (req.method === "PUT") {
      if (!slug) return fail(400, `PUT /aaron/api/${kind}/<slug>.`);
      let rec: Record<string, unknown>;
      try { rec = await req.json(); } catch { return fail(400, "Body must be JSON."); }
      const bad = mirror.check(rec);
      if (bad) return fail(bad[0], bad[1]);
      if (typeof rec?.updated !== "string") return fail(400, `A ${mirror.noun} needs an \`updated\` timestamp.`);
      const k = await db();
      await k.set([mirror.kv, who.email, slug], rec);
      return json({ ok: true });
    }

    if (req.method === "DELETE") {
      if (!slug) return fail(400, `DELETE /aaron/api/${kind}/<slug>.`);
      const k = await db();
      // A tombstone, not a bare delete: without it, a device that still has
      // the record would treat it as a local-only addition on the next merge
      // and resurrect it.
      await k.set([mirror.kv, who.email, slug], { deleted: true, updated: new Date().toISOString() });
      return json({ ok: true });
    }

    return fail(405, "GET, PUT, or DELETE.");
  }

  if (route === "logout") {
    await dropSession(cookie(req, "aaron_session"));
    return new Response(JSON.stringify({ ok: true }), {
      headers: { "content-type": "application/json", "set-cookie": sessionCookie(req, "", 0) },
    });
  }

  if (route === "spend") {
    const who = await authorize(req, cfg.token);
    if (who instanceof Response) return who;
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

  if (route !== "llm") {
    return fail(404, `No such route: /aaron/api/${route}`, "Routes: llm, config, spend, skills, plans, login, me, logout.");
  }
  if (req.method !== "POST") return fail(405, "POST only.");

  const who = await authorize(req, cfg.token);
  if (who instanceof Response) return who;
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
  const map = cfg.modelMap;
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
