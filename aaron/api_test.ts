/**
 * Tests for the proxy. Run: deno test --allow-env --allow-net api_test.ts
 * The upstream is stubbed by monkey-patching globalThis.fetch, so nothing
 * here reaches a provider or needs a real key.
 */
import { handleAaronApi } from "./api.ts";

// Hand-rolled so this file, like the page, pulls in nothing external.
function assert(cond: unknown, msg = "assertion failed"): void {
  if (!cond) throw new Error(msg);
}
function assertEquals<T>(actual: T, expected: T, msg?: string): void {
  assert(actual === expected, msg ?? `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}
function assertStringIncludes(haystack: string, needle: string): void {
  assert(haystack.includes(needle), `expected ${JSON.stringify(haystack)} to include ${JSON.stringify(needle)}`);
}

const TOKEN = "test-token-abc";
const post = (body: unknown, headers: Record<string, string> = {}) =>
  new Request("https://aaron.weolopez.com/aaron/api/llm", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
const get = (route: string) => new Request(`https://aaron.weolopez.com/aaron/api/${route}`);

function env(vars: Record<string, string | undefined>) {
  // Every var the module reads must be cleared, or state leaks between tests.
  for (const k of ["AARON_ACCESS_TOKEN", "AARON_PROVIDER", "AARON_LLM_KEY", "ANTHROPIC_API_KEY",
                   "AARON_LLM_BASE_URL", "AARON_LLM_PATH", "AARON_MODEL_MAP",
                   "AARON_ADMIN_KEY"]) Deno.env.delete(k);
  for (const [k, v] of Object.entries(vars)) if (v !== undefined) Deno.env.set(k, v);
}

// Captures what the proxy sent upstream.
let sent: { url: string; headers: Headers; body: Record<string, unknown> } | null = null;
const realFetch = globalThis.fetch;
function stubUpstream(status = 200, extraHeaders: Record<string, string> = {}) {
  globalThis.fetch = ((url: string | URL | Request, init?: RequestInit) => {
    sent = { url: String(url), headers: new Headers(init?.headers), body: JSON.parse(String(init?.body)) };
    return Promise.resolve(new Response("event: ping\ndata: {}\n\n", {
      status,
      headers: { "content-type": "text/event-stream", "anthropic-ratelimit-requests-remaining": "47", ...extraHeaders },
    }));
  }) as typeof fetch;
}

Deno.test("fails closed with no access token configured", async () => {
  env({ ANTHROPIC_API_KEY: "sk-ant-x" });
  const r = await handleAaronApi(post({ model: "claude-opus-5" }));
  assertEquals(r.status, 503);
  assertStringIncludes((await r.json()).error.hint, "AARON_ACCESS_TOKEN");
});

Deno.test("rejects a missing or wrong token", async () => {
  env({ AARON_ACCESS_TOKEN: TOKEN, ANTHROPIC_API_KEY: "sk-ant-x" });
  assertEquals((await handleAaronApi(post({}))).status, 401);
  assertEquals((await handleAaronApi(post({}, { "x-aaron-token": "nope" }))).status, 401);
});

Deno.test("503s when the token is set but no provider key is", async () => {
  env({ AARON_ACCESS_TOKEN: TOKEN });
  const r = await handleAaronApi(post({}, { "x-aaron-token": TOKEN }));
  assertEquals(r.status, 503);
  assertStringIncludes((await r.json()).error.message, "No provider key");
});

Deno.test("config route reports state and leaks no secret", async () => {
  env({ AARON_ACCESS_TOKEN: TOKEN, ANTHROPIC_API_KEY: "sk-ant-supersecret" });
  const r = await handleAaronApi(get("config"));
  const body = await r.text();
  assertEquals(r.status, 200);
  const c = JSON.parse(body);
  assertEquals(c.provider, "anthropic");
  assertEquals(c.has_key, true);
  assert(!body.includes("sk-ant-supersecret"), "config must not echo the key");
  assert(!body.includes(TOKEN), "config must not echo the access token");
});

Deno.test("anthropic: forwards with x-api-key + version, streams body back", async () => {
  env({ AARON_ACCESS_TOKEN: TOKEN, ANTHROPIC_API_KEY: "sk-ant-x" });
  stubUpstream();
  const r = await handleAaronApi(post({ model: "claude-opus-5", stream: true }, { "x-aaron-token": TOKEN }));
  assertEquals(r.status, 200);
  assertEquals(sent!.url, "https://api.anthropic.com/v1/messages");
  assertEquals(sent!.headers.get("x-api-key"), "sk-ant-x");
  assertEquals(sent!.headers.get("anthropic-version"), "2023-06-01");
  // The browser's token must never be forwarded upstream.
  assertEquals(sent!.headers.get("x-aaron-token"), null);
  assertStringIncludes(await r.text(), "event: ping");
});

Deno.test("forwards rate-limit headers so the meter keeps working", async () => {
  env({ AARON_ACCESS_TOKEN: TOKEN, ANTHROPIC_API_KEY: "sk-ant-x" });
  stubUpstream();
  const r = await handleAaronApi(post({}, { "x-aaron-token": TOKEN }));
  assertEquals(r.headers.get("anthropic-ratelimit-requests-remaining"), "47");
  assertEquals(r.headers.get("x-aaron-provider"), "anthropic");
  await r.text();
});

Deno.test("openrouter: bearer auth, its own path, attribution headers", async () => {
  env({ AARON_ACCESS_TOKEN: TOKEN, AARON_PROVIDER: "openrouter", AARON_LLM_KEY: "sk-or-x" });
  stubUpstream();
  const r = await handleAaronApi(post({ model: "claude-opus-5" }, { "x-aaron-token": TOKEN }));
  assertEquals(sent!.url, "https://openrouter.ai/api/v1/messages");
  assertEquals(sent!.headers.get("authorization"), "Bearer sk-or-x");
  assertEquals(sent!.headers.get("x-title"), "Aaron");
  await r.text();
});

Deno.test("model map remaps ids, leaves unmapped ones alone", async () => {
  env({
    AARON_ACCESS_TOKEN: TOKEN, AARON_PROVIDER: "openrouter", AARON_LLM_KEY: "sk-or-x",
    AARON_MODEL_MAP: '{"claude-opus-5":"anthropic/claude-opus-4.5"}',
  });
  stubUpstream();
  let r = await handleAaronApi(post({ model: "claude-opus-5" }, { "x-aaron-token": TOKEN }));
  assertEquals(sent!.body.model, "anthropic/claude-opus-4.5");
  await r.text();
  r = await handleAaronApi(post({ model: "claude-haiku-4-5" }, { "x-aaron-token": TOKEN }));
  assertEquals(sent!.body.model, "claude-haiku-4-5");
  await r.text();
});

Deno.test("a malformed model map degrades to no mapping, not a crash", async () => {
  env({ AARON_ACCESS_TOKEN: TOKEN, ANTHROPIC_API_KEY: "sk-ant-x", AARON_MODEL_MAP: "{not json" });
  stubUpstream();
  const r = await handleAaronApi(post({ model: "claude-opus-5" }, { "x-aaron-token": TOKEN }));
  assertEquals(sent!.body.model, "claude-opus-5");
  await r.text();
});

Deno.test("custom provider with no base URL is refused", async () => {
  env({ AARON_ACCESS_TOKEN: TOKEN, AARON_PROVIDER: "custom", AARON_LLM_KEY: "k" });
  const r = await handleAaronApi(post({}, { "x-aaron-token": TOKEN }));
  assertEquals(r.status, 503);
  assertStringIncludes((await r.json()).error.hint, "AARON_LLM_BASE_URL");
});

Deno.test("upstream errors pass through with their status", async () => {
  env({ AARON_ACCESS_TOKEN: TOKEN, ANTHROPIC_API_KEY: "sk-ant-x" });
  stubUpstream(429, { "retry-after": "12" });
  const r = await handleAaronApi(post({}, { "x-aaron-token": TOKEN }));
  assertEquals(r.status, 429);
  assertEquals(r.headers.get("retry-after"), "12");
  await r.text();
});

Deno.test("unreachable upstream becomes a 502, not a hang", async () => {
  env({ AARON_ACCESS_TOKEN: TOKEN, AARON_PROVIDER: "litellm", AARON_LLM_KEY: "k" });
  globalThis.fetch = (() => Promise.reject(new Error("connection refused"))) as typeof fetch;
  const r = await handleAaronApi(post({}, { "x-aaron-token": TOKEN }));
  assertEquals(r.status, 502);
  assertStringIncludes((await r.json()).error.hint, "connection refused");
});

Deno.test("unknown routes and wrong methods are refused", async () => {
  env({ AARON_ACCESS_TOKEN: TOKEN, ANTHROPIC_API_KEY: "sk-ant-x" });
  assertEquals((await handleAaronApi(get("no-such-route"))).status, 404);
  assertEquals((await handleAaronApi(get("llm"))).status, 405);
  globalThis.fetch = realFetch;
});

/* ------------------------------------------------------------ /spend ---- */

const spendReq = (qs = "", headers: Record<string, string> = { "x-aaron-token": TOKEN }) =>
  new Request(`https://aaron.weolopez.com/aaron/api/spend${qs}`, { headers });

// Two daily buckets. Amounts are CENTS as decimal strings: 12345 + 5000 cents
// across bucket one = $173.45, bucket two 100 cents = $1.00. Total $174.45.
const COST_REPORT = {
  data: [
    {
      starting_at: "2026-08-01T00:00:00Z", ending_at: "2026-08-02T00:00:00Z",
      results: [
        { amount: "12345", currency: "USD", cost_type: "tokens" },
        { amount: "5000", currency: "USD", cost_type: "web_search" },
      ],
    },
    {
      starting_at: "2026-08-02T00:00:00Z", ending_at: "2026-08-03T00:00:00Z",
      results: [{ amount: "100", currency: "USD", cost_type: "tokens" }],
    },
  ],
  has_more: false,
  next_page: null,
};

function stubJson(payload: unknown, status = 200) {
  globalThis.fetch = ((url: string | URL | Request, init?: RequestInit) => {
    sent = { url: String(url), headers: new Headers(init?.headers), body: {} };
    return Promise.resolve(new Response(JSON.stringify(payload), {
      status, headers: { "content-type": "application/json" },
    }));
  }) as typeof fetch;
}

// The memo is module state; bust it by varying `days` between tests.
let uniqueDays = 40;
const freshDays = () => `?days=${uniqueDays++}`;

Deno.test("spend: 503s with no reporting key, and llm still works", async () => {
  env({ AARON_ACCESS_TOKEN: TOKEN, ANTHROPIC_API_KEY: "sk-ant-x" });
  const r = await handleAaronApi(spendReq(freshDays()));
  assertEquals(r.status, 503);
  assertStringIncludes((await r.json()).error.hint, "AARON_ADMIN_KEY");
  stubUpstream();
  assertEquals((await handleAaronApi(post({}, { "x-aaron-token": TOKEN }))).status, 200);
});

Deno.test("spend: token-gated", async () => {
  env({ AARON_ACCESS_TOKEN: TOKEN, ANTHROPIC_API_KEY: "sk-ant-x", AARON_ADMIN_KEY: "sk-ant-admin-x" });
  assertEquals((await handleAaronApi(spendReq(freshDays(), {}))).status, 401);
});

Deno.test("spend: anthropic sums cents into dollars, reports no balance", async () => {
  env({ AARON_ACCESS_TOKEN: TOKEN, ANTHROPIC_API_KEY: "sk-ant-x", AARON_ADMIN_KEY: "sk-ant-admin-x" });
  stubJson(COST_REPORT);
  const s = await (await handleAaronApi(spendReq(freshDays()))).json();
  assertEquals(s.kind, "cost_report");
  assertEquals(s.spend, 174.45);              // NOT 17445 — cents, not dollars
  assertEquals(s.remaining, null);            // Anthropic has no balance
  assertEquals(s.buckets.length, 2);
  assertEquals(s.buckets[0].amount, 173.45);
  assertEquals(s.buckets[1].amount, 1);
  assertStringIncludes(sent!.url, "/v1/organizations/cost_report");
  assertStringIncludes(sent!.url, "bucket_width=1d");
});

Deno.test("spend: admin key goes on x-api-key and is never the inference key", async () => {
  env({ AARON_ACCESS_TOKEN: TOKEN, ANTHROPIC_API_KEY: "sk-ant-inference", AARON_ADMIN_KEY: "sk-ant-admin-report" });
  stubJson(COST_REPORT);
  await (await handleAaronApi(spendReq(freshDays()))).json();
  assertEquals(sent!.headers.get("x-api-key"), "sk-ant-admin-report");
  // And the inference path must never see the admin key.
  stubUpstream();
  await (await handleAaronApi(post({}, { "x-aaron-token": TOKEN }))).text();
  assertEquals(sent!.headers.get("x-api-key"), "sk-ant-inference");
});

Deno.test("spend: an OAuth-style reporting token goes on Authorization", async () => {
  env({ AARON_ACCESS_TOKEN: TOKEN, ANTHROPIC_API_KEY: "sk-ant-x", AARON_ADMIN_KEY: "oat-abc123" });
  stubJson(COST_REPORT);
  await (await handleAaronApi(spendReq(freshDays()))).json();
  assertEquals(sent!.headers.get("authorization"), "Bearer oat-abc123");
  assertEquals(sent!.headers.get("x-api-key"), null);
});

Deno.test("spend: openrouter returns a real remaining balance, in dollars", async () => {
  env({ AARON_ACCESS_TOKEN: TOKEN, AARON_PROVIDER: "openrouter", AARON_LLM_KEY: "sk-or-x", AARON_ADMIN_KEY: "sk-or-mgmt" });
  stubJson({ data: { total_credits: 100.5, total_usage: 25.75 } });
  const s = await (await handleAaronApi(spendReq(freshDays()))).json();
  assertEquals(s.kind, "credits");
  assertEquals(s.spend, 25.75);
  assertEquals(s.remaining, 74.75);   // the thing Anthropic cannot tell us
  assertEquals(s.total_credits, 100.5);
  assertStringIncludes(sent!.url, "/api/v1/credits");
});

Deno.test("spend: paginates cost_report", async () => {
  env({ AARON_ACCESS_TOKEN: TOKEN, ANTHROPIC_API_KEY: "sk-ant-x", AARON_ADMIN_KEY: "sk-ant-admin-x" });
  let call = 0;
  globalThis.fetch = ((url: string | URL | Request, init?: RequestInit) => {
    call++;
    sent = { url: String(url), headers: new Headers(init?.headers), body: {} };
    const first = { ...COST_REPORT, has_more: true, next_page: "page_2" };
    const second = {
      data: [{ starting_at: "2026-08-03T00:00:00Z", results: [{ amount: "555", currency: "USD" }] }],
      has_more: false, next_page: null,
    };
    return Promise.resolve(new Response(JSON.stringify(call === 1 ? first : second), {
      status: 200, headers: { "content-type": "application/json" },
    }));
  }) as typeof fetch;
  const s = await (await handleAaronApi(spendReq(freshDays()))).json();
  assertEquals(call, 2);
  assertStringIncludes(sent!.url, "page=page_2");
  assertEquals(s.spend, 174.45 + 5.55);
  assertEquals(s.buckets.length, 3);
});

Deno.test("spend: memoizes within the window, refetches for a new window", async () => {
  env({ AARON_ACCESS_TOKEN: TOKEN, ANTHROPIC_API_KEY: "sk-ant-x", AARON_ADMIN_KEY: "sk-ant-admin-x" });
  let calls = 0;
  globalThis.fetch = (() => {
    calls++;
    return Promise.resolve(new Response(JSON.stringify(COST_REPORT), {
      status: 200, headers: { "content-type": "application/json" },
    }));
  }) as typeof fetch;
  const d = freshDays();
  await (await handleAaronApi(spendReq(d))).json();
  await (await handleAaronApi(spendReq(d))).json();
  assertEquals(calls, 1, "second identical request should hit the memo");
  await (await handleAaronApi(spendReq(freshDays()))).json();
  assertEquals(calls, 2, "a different window must refetch");
});

Deno.test("spend: a failing report is a 502, not a fake zero", async () => {
  env({ AARON_ACCESS_TOKEN: TOKEN, ANTHROPIC_API_KEY: "sk-ant-x", AARON_ADMIN_KEY: "sk-ant-admin-x" });
  stubJson({ error: { message: "invalid x-api-key" } }, 401);
  const r = await handleAaronApi(spendReq(freshDays()));
  assertEquals(r.status, 502);
  assertStringIncludes((await r.json()).error.hint, "HTTP 401");
});

Deno.test("spend: unsupported provider is a 501", async () => {
  env({ AARON_ACCESS_TOKEN: TOKEN, AARON_PROVIDER: "litellm", AARON_LLM_KEY: "k", AARON_ADMIN_KEY: "k2" });
  const r = await handleAaronApi(spendReq(freshDays()));
  assertEquals(r.status, 501);
  assertStringIncludes((await r.json()).error.message, "No spend reporter");
});

Deno.test("config advertises spend availability without calling it", async () => {
  env({ AARON_ACCESS_TOKEN: TOKEN, ANTHROPIC_API_KEY: "sk-ant-x" });
  let c = await (await handleAaronApi(get("config"))).json();
  assertEquals(c.spend.available, false);
  env({ AARON_ACCESS_TOKEN: TOKEN, ANTHROPIC_API_KEY: "sk-ant-x", AARON_ADMIN_KEY: "sk-ant-admin-x" });
  const body = await (await handleAaronApi(get("config"))).text();
  c = JSON.parse(body);
  assertEquals(c.spend.available, true);
  assert(!body.includes("sk-ant-admin-x"), "config must not echo the admin key");
});

Deno.test("non-JSON body is a 400", async () => {
  env({ AARON_ACCESS_TOKEN: TOKEN, ANTHROPIC_API_KEY: "sk-ant-x" });
  const r = await handleAaronApi(new Request("https://x/aaron/api/llm", {
    method: "POST", headers: { "content-type": "application/json", "x-aaron-token": TOKEN }, body: "not json",
  }));
  assertEquals(r.status, 400);
  await r.text();
});
