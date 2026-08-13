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

// Warm the KV handle outside any test: it is intentionally process-lifetime,
// and Deno's per-test resource sanitizer would otherwise flag it as a leak.
Deno.env.set("AARON_KV_PATH", ":memory:");
Deno.env.set("AARON_ACCESS_TOKEN", "warmup");
// Must carry a cookie: readSession(null) returns before opening the handle.
await handleAaronApi(new Request("https://x/aaron/api/me", { headers: { cookie: "aaron_session=warmup" } }));
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
                   "AARON_ADMIN_KEY", "GOOGLE_CLIENT_ID", "AARON_ALLOWED_EMAILS", "AARON_KV_PATH",
                   "OPENROUTER_API_KEY"]) Deno.env.delete(k);
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

/* ------------------------------------------------------------- auth ----- */

const CLIENT_ID = "test-client.apps.googleusercontent.com";
const authEnv = (extra: Record<string, string> = {}) =>
  env({
    GOOGLE_CLIENT_ID: CLIENT_ID,
    AARON_ALLOWED_EMAILS: "owner@example.com, second@example.com",
    AARON_KV_PATH: ":memory:",
    ANTHROPIC_API_KEY: "sk-ant-x",
    ...extra,
  });

const loginReq = (credential: unknown) =>
  new Request("https://aaron.weolopez.com/aaron/api/login", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ credential }),
  });
const withCookie = (path: string, cookie: string, init: RequestInit = {}) =>
  new Request(`https://aaron.weolopez.com/aaron/api/${path}`, { ...init, headers: { ...(init.headers ?? {}), cookie } });

// Google's tokeninfo, stubbed.
const stubGoogle = (payload: Record<string, unknown>, ok = true) => {
  globalThis.fetch = ((url: string | URL | Request) => {
    sent = { url: String(url), headers: new Headers(), body: {} };
    return Promise.resolve(new Response(JSON.stringify(payload), {
      status: ok ? 200 : 400, headers: { "content-type": "application/json" },
    }));
  }) as typeof fetch;
};
const goodToken = { aud: CLIENT_ID, sub: "google-123", email: "Owner@Example.com", email_verified: true, name: "Owner", picture: "p.png" };

const sidFrom = (r: Response) => {
  const c = r.headers.get("set-cookie") ?? "";
  return c.slice("aaron_session=".length, c.indexOf(";"));
};

Deno.test("login: allowlisted Google user gets an HttpOnly session cookie", async () => {
  authEnv();
  stubGoogle(goodToken);
  const r = await handleAaronApi(loginReq("tok"));
  assertEquals(r.status, 200);
  const c = r.headers.get("set-cookie") ?? "";
  assertStringIncludes(c, "aaron_session=");
  assertStringIncludes(c, "HttpOnly");
  assertStringIncludes(c, "SameSite=Lax");
  assertStringIncludes(c, "Secure");                 // request was https
  assertStringIncludes(sent!.url, "oauth2.googleapis.com/tokeninfo");
  const body = await r.json();
  assertEquals(body.user.email, "owner@example.com"); // normalised to lowercase
});

Deno.test("login: rejects a token minted for a different app (aud check)", async () => {
  authEnv();
  stubGoogle({ ...goodToken, aud: "some-other-app.apps.googleusercontent.com" });
  const r = await handleAaronApi(loginReq("tok"));
  assertEquals(r.status, 401);
  assertStringIncludes((await r.json()).error.hint, "different application");
});

Deno.test("login: rejects an unverified email", async () => {
  authEnv();
  stubGoogle({ ...goodToken, email_verified: "false" });
  assertEquals((await handleAaronApi(loginReq("tok"))).status, 401);
});

Deno.test("login: non-allowlisted address is a 403 that names it", async () => {
  authEnv();
  stubGoogle({ ...goodToken, email: "stranger@example.com" });
  const r = await handleAaronApi(loginReq("tok"));
  assertEquals(r.status, 403);
  assertStringIncludes((await r.json()).error.message, "stranger@example.com");
});

Deno.test("login: a rejected credential never mints a session", async () => {
  authEnv();
  stubGoogle({ error: "invalid_token" }, false);
  const r = await handleAaronApi(loginReq("tok"));
  assertEquals(r.status, 401);
  assertEquals(r.headers.get("set-cookie"), null);
});

Deno.test("session gates /llm: no cookie 401s, a real one passes", async () => {
  authEnv();
  stubGoogle(goodToken);
  const sid = sidFrom(await handleAaronApi(loginReq("tok")));

  // Unauthenticated.
  stubUpstream();
  assertEquals((await handleAaronApi(post({}, {}))).status, 401);

  // Signed in.
  stubUpstream();
  const ok2 = await handleAaronApi(new Request("https://aaron.weolopez.com/aaron/api/llm", {
    method: "POST", headers: { "content-type": "application/json", cookie: `aaron_session=${sid}` },
    body: JSON.stringify({ model: "claude-opus-5" }),
  }));
  assertEquals(ok2.status, 200);
  await ok2.text();
  // The session id must never be forwarded to the provider.
  assertEquals(sent!.headers.get("cookie"), null);
});

Deno.test("a forged session id is refused", async () => {
  authEnv();
  const r = await handleAaronApi(withCookie("me", "aaron_session=" + crypto.randomUUID()));
  assertEquals((await r.json()).authenticated, false);
});

Deno.test("me: reports the signed-in user, never the session id", async () => {
  authEnv();
  stubGoogle(goodToken);
  const sid = sidFrom(await handleAaronApi(loginReq("tok")));
  const r = await handleAaronApi(withCookie("me", `aaron_session=${sid}`));
  const text = await r.text();
  const body = JSON.parse(text);
  assertEquals(body.authenticated, true);
  assertEquals(body.user.email, "owner@example.com");
  assert(!text.includes(sid), "me must not echo the session id");
});

Deno.test("logout: clears the cookie and invalidates the session", async () => {
  authEnv();
  stubGoogle(goodToken);
  const sid = sidFrom(await handleAaronApi(loginReq("tok")));
  const out = await handleAaronApi(withCookie("logout", `aaron_session=${sid}`, { method: "POST" }));
  assertStringIncludes(out.headers.get("set-cookie") ?? "", "Max-Age=0");
  await out.text();
  // The id is dead server-side too, not just forgotten by the browser.
  const after = await handleAaronApi(withCookie("me", `aaron_session=${sid}`));
  assertEquals((await after.json()).authenticated, false);
});

Deno.test("second allowlisted address also works", async () => {
  authEnv();
  stubGoogle({ ...goodToken, email: "second@example.com", sub: "google-456" });
  assertEquals((await handleAaronApi(loginReq("tok"))).status, 200);
});

Deno.test("break-glass token still works when set, and is refused when unset", async () => {
  authEnv({ AARON_ACCESS_TOKEN: TOKEN });
  stubUpstream();
  assertEquals((await handleAaronApi(post({}, { "x-aaron-token": TOKEN }))).status, 200);

  authEnv();                       // no AARON_ACCESS_TOKEN
  stubUpstream();
  assertEquals((await handleAaronApi(post({}, { "x-aaron-token": TOKEN }))).status, 401);
});

Deno.test("config advertises how to sign in, and leaks nothing", async () => {
  authEnv();
  const body = await (await handleAaronApi(get("config"))).text();
  const c = JSON.parse(body);
  assertEquals(c.auth.google, true);
  assertEquals(c.auth.client_id, CLIENT_ID);   // public by design
  assertEquals(c.auth.token_fallback, false);
  assert(!body.includes("sk-ant-x"), "config must not echo the provider key");
});

Deno.test("with neither sign-in nor token configured, everything 503s", async () => {
  env({ GOOGLE_CLIENT_ID: "", AARON_KV_PATH: ":memory:", ANTHROPIC_API_KEY: "sk-ant-x" });
  const r = await handleAaronApi(post({}));
  assertEquals(r.status, 503);
  assertStringIncludes((await r.json()).error.message, "no way to authenticate");
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

/* ---------------------------------------------------------- settings ----- */

const settingsGet = (cookie: string) =>
  new Request("https://aaron.weolopez.com/aaron/api/settings", { headers: { cookie } });
const settingsPost = (cookie: string, body: unknown) =>
  new Request("https://aaron.weolopez.com/aaron/api/settings", {
    method: "POST", headers: { cookie, "content-type": "application/json" }, body: JSON.stringify(body),
  });

async function signedInCookie(email = "owner@example.com") {
  stubGoogle({ ...goodToken, email });
  const r = await handleAaronApi(loginReq("tok"));
  return `aaron_session=${sidFrom(r)}`;
}

Deno.test("settings: require a session", async () => {
  authEnv();
  assertEquals((await handleAaronApi(settingsGet(""))).status, 401);
  assertEquals((await handleAaronApi(settingsPost("", { provider: "openrouter" }))).status, 401);
});

Deno.test("settings: DB allowlist overrides env, and gates login", async () => {
  authEnv({ AARON_ALLOWED_EMAILS: "envonly@example.com" });
  // Env says only envonly@; DB will say owner@ — DB must win both ways.
  const c = await signedInCookie("envonly@example.com");
  await handleAaronApi(settingsPost(c, { allowed_emails: ["envonly@example.com", "owner@example.com"] }));

  stubGoogle({ ...goodToken, email: "owner@example.com" });
  assertEquals((await handleAaronApi(loginReq("tok"))).status, 200, "DB-listed address should get in");

  stubGoogle({ ...goodToken, email: "stranger@example.com" });
  assertEquals((await handleAaronApi(loginReq("tok"))).status, 403);
});

Deno.test("settings: refuses an allowlist that locks you out", async () => {
  authEnv();
  const c = await signedInCookie("owner@example.com");
  const r = await handleAaronApi(settingsPost(c, { allowed_emails: ["someone.else@example.com"] }));
  assertEquals(r.status, 400);
  assertStringIncludes((await r.json()).error.message, "lock you out");
  // And the old list still stands.
  const s = await (await handleAaronApi(settingsGet(c))).json();
  assert(s.allowed_emails.includes("owner@example.com"));
});

Deno.test("settings: refuses an empty allowlist", async () => {
  authEnv();
  const c = await signedInCookie();
  assertEquals((await handleAaronApi(settingsPost(c, { allowed_emails: [] }))).status, 400);
});

Deno.test("settings: stored provider key overrides env and is never readable", async () => {
  authEnv({ ANTHROPIC_API_KEY: "sk-ant-from-env" });
  const c = await signedInCookie();
  await handleAaronApi(settingsPost(c, { llm_key: "sk-ant-from-db" }));

  const body = await (await handleAaronApi(settingsGet(c))).text();
  assert(!body.includes("sk-ant-from-db"), "settings must never echo a stored secret");
  assertEquals(JSON.parse(body).secrets.llm_key, true);

  stubUpstream();
  await (await handleAaronApi(new Request("https://aaron.weolopez.com/aaron/api/llm", {
    method: "POST", headers: { cookie: c, "content-type": "application/json" }, body: "{}",
  }))).text();
  assertEquals(sent!.headers.get("x-api-key"), "sk-ant-from-db", "DB key must beat the env key");
});

Deno.test("settings: a blank secret clears it, falling back to env", async () => {
  authEnv({ ANTHROPIC_API_KEY: "sk-ant-from-env" });
  const c = await signedInCookie();
  await handleAaronApi(settingsPost(c, { llm_key: "sk-ant-from-db" }));
  await handleAaronApi(settingsPost(c, { llm_key: "" }));
  stubUpstream();
  await (await handleAaronApi(new Request("https://aaron.weolopez.com/aaron/api/llm", {
    method: "POST", headers: { cookie: c, "content-type": "application/json" }, body: "{}",
  }))).text();
  assertEquals(sent!.headers.get("x-api-key"), "sk-ant-from-env");
});

Deno.test("settings: provider switch takes effect without a restart", async () => {
  authEnv();
  const c = await signedInCookie();
  await handleAaronApi(settingsPost(c, { provider: "openrouter", llm_key: "sk-or-x" }));
  stubUpstream();
  await (await handleAaronApi(new Request("https://aaron.weolopez.com/aaron/api/llm", {
    method: "POST", headers: { cookie: c, "content-type": "application/json" }, body: "{}",
  }))).text();
  assertEquals(sent!.url, "https://openrouter.ai/api/v1/messages");
  assertEquals(sent!.headers.get("authorization"), "Bearer sk-or-x");
});

Deno.test("settings: only whitelisted keys are writable", async () => {
  authEnv();
  const c = await signedInCookie();
  await handleAaronApi(settingsPost(c, { evil: "x", __proto__: "y" }));
  const s = await (await handleAaronApi(settingsGet(c))).json();
  assertEquals((s as Record<string, unknown>).evil, undefined);
});

Deno.test("settings: reports which values still come from env", async () => {
  authEnv({ AARON_PROVIDER: "openrouter", AARON_LLM_KEY: "sk-or-env" });
  const c = await signedInCookie();
  // The KV handle is shared across this file, so clear anything a previous
  // test stored — otherwise this asserts on leftover state, not on env.
  await handleAaronApi(settingsPost(c, { llm_key: "", provider: "" }));
  const s = await (await handleAaronApi(settingsGet(c))).json();
  assertEquals(s.from_env.provider, true);
  assertEquals(s.from_env.llm_key, true);
  await handleAaronApi(settingsPost(c, { provider: "anthropic" }));
  const s2 = await (await handleAaronApi(settingsGet(c))).json();
  assertEquals(s2.from_env.provider, false);
});

/* ------------------------------------------------------------ skills ----- */

const skillsGet = (cookie: string) =>
  new Request("https://aaron.weolopez.com/aaron/api/skills", { headers: { cookie } });
const skillPut = (cookie: string, slug: string, rec: unknown) =>
  new Request(`https://aaron.weolopez.com/aaron/api/skills/${slug}`, {
    method: "PUT", headers: { cookie, "content-type": "application/json" }, body: JSON.stringify(rec),
  });
const skillDel = (cookie: string, slug: string) =>
  new Request(`https://aaron.weolopez.com/aaron/api/skills/${slug}`, { method: "DELETE", headers: { cookie } });

const REC = { name: "money", description: "d", code: "return 1;", tags: ["finance"], example: {}, runs: 3, updated: "2026-08-08T10:00:00.000Z" };

Deno.test("skills: require a session", async () => {
  authEnv();
  assertEquals((await handleAaronApi(skillsGet(""))).status, 401);
  assertEquals((await handleAaronApi(skillPut("", "x", REC))).status, 401);
  assertEquals((await handleAaronApi(skillDel("", "x"))).status, 401);
});

Deno.test("skills: stored and returned verbatim, fields intact", async () => {
  authEnv();
  const c = await signedInCookie("owner@example.com");
  await handleAaronApi(skillPut(c, "money", REC));
  const got = (await (await handleAaronApi(skillsGet(c))).json()).skills.money;
  assertEquals(JSON.stringify(got), JSON.stringify(REC), "record must round-trip unchanged");
});

Deno.test("skills: code is never executed or compiled server-side", async () => {
  authEnv();
  const c = await signedInCookie("owner@example.com");
  // Syntactically invalid, and would throw if anything tried to run it.
  const hostile = { ...REC, code: "throw new Error('boom'); ((( not js", updated: "2026-08-08T11:00:00.000Z" };
  const r = await handleAaronApi(skillPut(c, "hostile", hostile));
  assertEquals(r.status, 200, "the server must not validate or run skill code");
  const got = (await (await handleAaronApi(skillsGet(c))).json()).skills.hostile;
  assertEquals(got.code, hostile.code);
});

Deno.test("skills: one account never sees another's", async () => {
  authEnv();
  const a = await signedInCookie("owner@example.com");
  // The DB allowlist outranks env and persists across tests, so widen it here
  // rather than depending on what an earlier test happened to leave behind.
  await handleAaronApi(settingsPost(a, { allowed_emails: ["owner@example.com", "second@example.com"] }));
  await handleAaronApi(skillPut(a, "mine", { ...REC, code: "return 'A';" }));
  const b = await signedInCookie("second@example.com");
  const theirs = (await (await handleAaronApi(skillsGet(b))).json()).skills;
  assertEquals(theirs.mine, undefined, "cross-account leak — stored code would run in their tab");
  await handleAaronApi(skillPut(b, "mine", { ...REC, code: "return 'B';" }));
  const mine = (await (await handleAaronApi(skillsGet(a))).json()).skills;
  assertEquals(mine.mine.code, "return 'A';", "same slug must not collide across accounts");
});

Deno.test("skills: DELETE leaves a tombstone, not a hole", async () => {
  authEnv();
  const c = await signedInCookie("owner@example.com");
  await handleAaronApi(skillPut(c, "gone", REC));
  await handleAaronApi(skillDel(c, "gone"));
  const got = (await (await handleAaronApi(skillsGet(c))).json()).skills.gone;
  assertEquals(got.deleted, true);
  assert(typeof got.updated === "string" && got.updated.length > 0, "tombstone needs a timestamp to win merges");
});

Deno.test("skills: PUT validates the envelope, not the code", async () => {
  authEnv();
  const c = await signedInCookie("owner@example.com");
  assertEquals((await handleAaronApi(skillPut(c, "a", { updated: "x" }))).status, 400);          // no code
  assertEquals((await handleAaronApi(skillPut(c, "a", { code: 5, updated: "x" }))).status, 400); // code not a string
  assertEquals((await handleAaronApi(skillPut(c, "a", { code: "x" }))).status, 400);             // no updated
  assertEquals((await handleAaronApi(skillPut(c, "a", { code: "x".repeat(20001), updated: "x" }))).status, 413);
});

Deno.test("skills: slug-less PUT/DELETE refused; bad method refused", async () => {
  authEnv();
  const c = await signedInCookie("owner@example.com");
  assertEquals((await handleAaronApi(new Request("https://x/aaron/api/skills", {
    method: "PUT", headers: { cookie: c, "content-type": "application/json" }, body: JSON.stringify(REC) }))).status, 400);
  assertEquals((await handleAaronApi(new Request("https://x/aaron/api/skills", {
    method: "POST", headers: { cookie: c } }))).status, 405);
});

Deno.test("skills: slugs with URL-unsafe characters survive a round trip", async () => {
  authEnv();
  const c = await signedInCookie("owner@example.com");
  const slug = encodeURIComponent("a b/c");
  await handleAaronApi(skillPut(c, slug, { ...REC, code: "return 'odd';" }));
  const skills = (await (await handleAaronApi(skillsGet(c))).json()).skills;
  assertEquals(skills["a b/c"].code, "return 'odd';");
});

/* ------------------------------------------------------------- plans ----- */

const plansGet = (cookie: string) =>
  new Request("https://aaron.weolopez.com/aaron/api/plans", { headers: { cookie } });
const planPut = (cookie: string, slug: string, rec: unknown) =>
  new Request(`https://aaron.weolopez.com/aaron/api/plans/${slug}`, {
    method: "PUT", headers: { cookie, "content-type": "application/json" }, body: JSON.stringify(rec),
  });
const planDel = (cookie: string, slug: string) =>
  new Request(`https://aaron.weolopez.com/aaron/api/plans/${slug}`, { method: "DELETE", headers: { cookie } });

const PLAN = {
  name: "split-the-loop", title: "Split the agent loop", goal: "g", context: "c",
  steps: [{ title: "one", detail: "d", status: "done" }, { title: "two", detail: "d", status: "todo" }],
  risks: ["r"], open_questions: [], status: "approved", approved_at: "2026-08-08T10:00:00.000Z",
  revision: 2, created: "2026-08-08T09:00:00.000Z", updated: "2026-08-08T10:00:00.000Z",
};

Deno.test("plans: require a session", async () => {
  authEnv();
  assertEquals((await handleAaronApi(plansGet(""))).status, 401);
  assertEquals((await handleAaronApi(planPut("", "x", PLAN))).status, 401);
  assertEquals((await handleAaronApi(planDel("", "x"))).status, 401);
});

Deno.test("plans: stored and returned verbatim, step state intact", async () => {
  authEnv();
  const c = await signedInCookie("owner@example.com");
  await handleAaronApi(planPut(c, "split-the-loop", PLAN));
  const got = (await (await handleAaronApi(plansGet(c))).json()).plans["split-the-loop"];
  assertEquals(JSON.stringify(got), JSON.stringify(PLAN), "plan must round-trip unchanged");
});

Deno.test("plans: the server never sets or clears approval", async () => {
  authEnv();
  const c = await signedInCookie("owner@example.com");
  // Approval is a human act in the browser. Whatever status arrives is stored;
  // the server has no opinion and no way to form one.
  const draft = { ...PLAN, status: "draft", approved_at: null, updated: "2026-08-08T12:00:00.000Z" };
  await handleAaronApi(planPut(c, "split-the-loop", draft));
  const got = (await (await handleAaronApi(plansGet(c))).json()).plans["split-the-loop"];
  assertEquals(got.status, "draft");
  assertEquals(got.approved_at, null);
});

Deno.test("plans: one account never sees another's", async () => {
  authEnv();
  const a = await signedInCookie("owner@example.com");
  await handleAaronApi(settingsPost(a, { allowed_emails: ["owner@example.com", "second@example.com"] }));
  await handleAaronApi(planPut(a, "private", { ...PLAN, goal: "A" }));
  const b = await signedInCookie("second@example.com");
  const theirs = (await (await handleAaronApi(plansGet(b))).json()).plans;
  assertEquals(theirs.private, undefined, "cross-account leak — plans are private work");
});

Deno.test("plans: DELETE leaves a tombstone, not a hole", async () => {
  authEnv();
  const c = await signedInCookie("owner@example.com");
  await handleAaronApi(planPut(c, "gone", PLAN));
  await handleAaronApi(planDel(c, "gone"));
  const got = (await (await handleAaronApi(plansGet(c))).json()).plans.gone;
  assertEquals(got.deleted, true);
  assert(typeof got.updated === "string" && got.updated.length > 0, "tombstone needs a timestamp to win merges");
});

Deno.test("plans: PUT validates the envelope only", async () => {
  authEnv();
  const c = await signedInCookie("owner@example.com");
  assertEquals((await handleAaronApi(planPut(c, "a", { updated: "x" }))).status, 400);            // no title
  assertEquals((await handleAaronApi(planPut(c, "a", { title: 5, updated: "x" }))).status, 400);  // title not a string
  assertEquals((await handleAaronApi(planPut(c, "a", { title: "t" }))).status, 400);              // no updated
  assertEquals((await handleAaronApi(planPut(c, "a", { title: "t", updated: "x", steps: "not an array" }))).status, 200,
    "the shape of a plan's body is the browser's business, not the server's");
  assertEquals((await handleAaronApi(planPut(c, "a", { title: "t", updated: "x", context: "x".repeat(200001) }))).status, 413);
});

Deno.test("plans and skills are separate namespaces", async () => {
  authEnv();
  const c = await signedInCookie("owner@example.com");
  await handleAaronApi(skillPut(c, "same-slug", { ...REC, code: "return 'skill';" }));
  await handleAaronApi(planPut(c, "same-slug", { ...PLAN, goal: "plan" }));
  const skills = (await (await handleAaronApi(skillsGet(c))).json()).skills;
  const plans = (await (await handleAaronApi(plansGet(c))).json()).plans;
  assertEquals(skills["same-slug"].code, "return 'skill';");
  assertEquals(plans["same-slug"].goal, "plan");
  assertEquals(skills["same-slug"].goal, undefined);
});

/* --- persona: Aaron's self-written identity ------------------------------
   Same verbatim-storage contract as skills and plans. The point of these
   tests is that the server has no opinion about identity text: it stores a
   string, scopes it to an account, and never assembles it into a prompt. */

const personaGet = (cookie: string) =>
  new Request("https://aaron.weolopez.com/aaron/api/persona", { headers: { cookie } });
const personaPut = (cookie: string, slug: string, rec: unknown) =>
  new Request(`https://aaron.weolopez.com/aaron/api/persona/${slug}`, {
    method: "PUT", headers: { cookie, "content-type": "application/json" }, body: JSON.stringify(rec),
  });
const personaDel = (cookie: string, slug: string) =>
  new Request(`https://aaron.weolopez.com/aaron/api/persona/${slug}`, { method: "DELETE", headers: { cookie } });

const PERSONA = {
  id: "identity", text: "You are Aaron, and this is what you decided you are.",
  revision: 3, created: "2026-08-09T09:00:00.000Z", updated: "2026-08-09T10:00:00.000Z",
};

Deno.test("persona: requires a session", async () => {
  authEnv();
  assertEquals((await handleAaronApi(personaGet(""))).status, 401);
  assertEquals((await handleAaronApi(personaPut("", "identity", PERSONA))).status, 401);
  assertEquals((await handleAaronApi(personaDel("", "identity"))).status, 401);
});

Deno.test("persona: stored and returned verbatim", async () => {
  authEnv();
  const c = await signedInCookie("owner@example.com");
  await handleAaronApi(personaPut(c, "identity", PERSONA));
  const got = (await (await handleAaronApi(personaGet(c))).json()).persona["identity"];
  assertEquals(JSON.stringify(got), JSON.stringify(PERSONA), "persona must round-trip unchanged");
});

Deno.test("persona: one account never sees another's identity", async () => {
  authEnv();
  const a = await signedInCookie("owner@example.com");
  await handleAaronApi(settingsPost(a, { allowed_emails: ["owner@example.com", "second@example.com"] }));
  const b = await signedInCookie("second@example.com");
  await handleAaronApi(personaPut(a, "identity", { ...PERSONA, text: "A's identity" }));
  await handleAaronApi(personaPut(b, "identity", { ...PERSONA, text: "B's identity" }));
  assertEquals((await (await handleAaronApi(personaGet(a))).json()).persona["identity"].text, "A's identity");
  assertEquals((await (await handleAaronApi(personaGet(b))).json()).persona["identity"].text, "B's identity");
});

Deno.test("persona: DELETE leaves a tombstone, not a hole", async () => {
  authEnv();
  const c = await signedInCookie("owner@example.com");
  await handleAaronApi(personaPut(c, "identity", PERSONA));
  await handleAaronApi(personaDel(c, "identity"));
  const got = (await (await handleAaronApi(personaGet(c))).json()).persona["identity"];
  assertEquals(got.deleted, true, "a bare delete would let another device resurrect it");
});

Deno.test("persona: PUT validates the envelope, not the words", async () => {
  authEnv();
  const c = await signedInCookie("owner@example.com");
  assertEquals((await handleAaronApi(personaPut(c, "identity", { updated: "x" }))).status, 400);          // no text
  assertEquals((await handleAaronApi(personaPut(c, "identity", { text: 5, updated: "x" }))).status, 400); // text not a string
  assertEquals((await handleAaronApi(personaPut(c, "identity", { text: "t" }))).status, 400);             // no updated
  assertEquals((await handleAaronApi(personaPut(c, "identity", { text: "x".repeat(100001), updated: "x" }))).status, 413);
  // The server has no view on what an identity may say — only that it is a
  // string of workable length.
  assertEquals((await handleAaronApi(personaPut(c, "identity", { text: "anything at all", updated: "x" }))).status, 200);
});

Deno.test("persona is its own namespace, separate from skills and plans", async () => {
  authEnv();
  const c = await signedInCookie("owner@example.com");
  await handleAaronApi(skillPut(c, "identity", { ...REC, code: "return 'skill';" }));
  await handleAaronApi(personaPut(c, "identity", PERSONA));
  const skills = (await (await handleAaronApi(skillsGet(c))).json()).skills;
  const persona = (await (await handleAaronApi(personaGet(c))).json()).persona;
  assertEquals(skills["identity"].code, "return 'skill';");
  assertEquals(persona["identity"].text, PERSONA.text);
  assertEquals(persona["identity"].code, undefined);
});

/* --------------------------------------------------------- /complete ------
   The one-shot sub-call. Most of what is worth testing here is what the route
   REFUSES to do — it is a bounded thing on purpose, and the bounds are the
   feature.                                                                  */

const complete = (body: unknown, headers: Record<string, string> = {}) =>
  new Request("https://aaron.weolopez.com/aaron/api/complete", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });

// The upstream shape here is OpenAI chat/completions, not SSE.
function stubChat(status = 200, payload: unknown = { model: "openai/gpt-5", choices: [{ message: { content: "hi" } }] }) {
  globalThis.fetch = ((url: string | URL | Request, init?: RequestInit) => {
    sent = { url: String(url), headers: new Headers(init?.headers), body: JSON.parse(String(init?.body)) };
    return Promise.resolve(new Response(JSON.stringify(payload), {
      status, headers: { "content-type": "application/json" },
    }));
  }) as typeof fetch;
}

Deno.test("complete: gated by the session, same as /llm", async () => {
  env({ AARON_ACCESS_TOKEN: TOKEN, OPENROUTER_API_KEY: "or-key" });
  assertEquals((await handleAaronApi(complete({ model: "m", prompt: "p" }))).status, 401);
  assertEquals((await handleAaronApi(new Request("https://x/aaron/api/complete"))).status, 405);
});

Deno.test("complete: 503s when no OpenRouter key is configured", async () => {
  env({ AARON_ACCESS_TOKEN: TOKEN, ANTHROPIC_API_KEY: "sk-ant-x" });
  const r = await handleAaronApi(complete({ model: "m", prompt: "p" }, { "x-aaron-token": TOKEN }));
  assertEquals(r.status, 503);
  assertStringIncludes((await r.json()).error.hint, "OPENROUTER_API_KEY");
});

Deno.test("complete: builds an OpenAI-shape request at the fixed upstream", async () => {
  env({ AARON_ACCESS_TOKEN: TOKEN, OPENROUTER_API_KEY: "or-key" });
  stubChat();
  const r = await handleAaronApi(complete(
    { model: "openai/gpt-5", system: "be terse", prompt: "why?", max_tokens: 100 },
    { "x-aaron-token": TOKEN },
  ));
  assertEquals(r.status, 200);
  assertEquals(sent!.url, "https://openrouter.ai/api/v1/chat/completions");
  assertEquals(sent!.headers.get("authorization"), "Bearer or-key");
  assertEquals(sent!.body.model, "openai/gpt-5");
  assertEquals(sent!.body.max_tokens, 100);
  const msgs = sent!.body.messages as { role: string; content: string }[];
  assertEquals(msgs[0].role, "system");
  assertEquals(msgs[1].content, "why?");
  // Body comes back unread, for the browser to parse.
  assertEquals((await r.json()).choices[0].message.content, "hi");
  globalThis.fetch = realFetch;
});

Deno.test("complete: a client-supplied URL cannot move the upstream", async () => {
  env({ AARON_ACCESS_TOKEN: TOKEN, OPENROUTER_API_KEY: "or-key" });
  stubChat();
  // Everything an SSRF attempt would reach for, in one body.
  await handleAaronApi(complete({
    model: "m", prompt: "p",
    base_url: "http://169.254.169.254", url: "http://127.0.0.1:4000",
    path: "/admin", headers: { authorization: "Bearer stolen" },
  }, { "x-aaron-token": TOKEN }));
  assertEquals(sent!.url, "https://openrouter.ai/api/v1/chat/completions");
  assertEquals(sent!.headers.get("authorization"), "Bearer or-key");
  // The extra fields are dropped, not relayed — the request is built, not forwarded.
  assertEquals(sent!.body.base_url, undefined);
  assertEquals(sent!.body.headers, undefined);
  assertEquals(sent!.body.stream, undefined);
  assertEquals(sent!.body.tools, undefined);
  globalThis.fetch = realFetch;
});

Deno.test("complete: model and prompt are required, oversize is refused", async () => {
  env({ AARON_ACCESS_TOKEN: TOKEN, OPENROUTER_API_KEY: "or-key" });
  const h = { "x-aaron-token": TOKEN };
  assertEquals((await handleAaronApi(complete({ prompt: "p" }, h))).status, 400);
  assertEquals((await handleAaronApi(complete({ model: "m" }, h))).status, 400);
  assertEquals((await handleAaronApi(complete({ model: "m", prompt: "x".repeat(100001) }, h))).status, 413);
});

Deno.test("complete: max_tokens is clamped, not trusted", async () => {
  env({ AARON_ACCESS_TOKEN: TOKEN, OPENROUTER_API_KEY: "or-key" });
  stubChat();
  const h = { "x-aaron-token": TOKEN };
  await handleAaronApi(complete({ model: "m", prompt: "p", max_tokens: 9_000_000 }, h));
  assertEquals(sent!.body.max_tokens, 32000);
  await handleAaronApi(complete({ model: "m", prompt: "p" }, h));
  assertEquals(sent!.body.max_tokens, 4096);
  globalThis.fetch = realFetch;
});

Deno.test("complete: upstream errors keep their status", async () => {
  env({ AARON_ACCESS_TOKEN: TOKEN, OPENROUTER_API_KEY: "or-key" });
  stubChat(402, { error: { message: "insufficient credits" } });
  const r = await handleAaronApi(complete({ model: "m", prompt: "p" }, { "x-aaron-token": TOKEN }));
  assertEquals(r.status, 402);
  globalThis.fetch = realFetch;
});

Deno.test("complete: falls back to llm_key only when it is already OpenRouter's", async () => {
  // Configured through the settings route rather than env: the KV handle is
  // shared across this file, so writing what this test needs is the only way
  // to assert on it rather than on whatever a previous test left behind.
  authEnv();
  const c = await signedInCookie();
  const send = () => handleAaronApi(new Request("https://aaron.weolopez.com/aaron/api/complete", {
    method: "POST",
    headers: { cookie: c, "content-type": "application/json" },
    body: JSON.stringify({ model: "m", prompt: "p" }),
  }));

  await handleAaronApi(settingsPost(c, { provider: "openrouter", llm_key: "main-or-key" }));
  stubChat();
  await (await send()).text();
  assertEquals(sent!.headers.get("authorization"), "Bearer main-or-key");
  globalThis.fetch = realFetch;

  // An Anthropic key must never be handed to OpenRouter.
  await handleAaronApi(settingsPost(c, { provider: "anthropic", llm_key: "sk-ant-secret" }));
  assertEquals((await send()).status, 503);
  await handleAaronApi(settingsPost(c, { llm_key: "", provider: "" }));
});

/* --- deliberative: the background note ------------------------------------
   Same verbatim-storage contract again. The thing worth pinning down here is
   what the server does NOT do: it stores a note about unresolved thinking and
   never consolidates, prunes, or reflects on it. Doing any of that would be
   the server forming a judgement on the browser's behalf. */

const delibGet = (cookie: string) =>
  new Request("https://aaron.weolopez.com/aaron/api/deliberative", { headers: { cookie } });
const delibPut = (cookie: string, slug: string, rec: unknown) =>
  new Request(`https://aaron.weolopez.com/aaron/api/deliberative/${slug}`, {
    method: "PUT", headers: { cookie, "content-type": "application/json" }, body: JSON.stringify(rec),
  });

const DELIB = {
  id: "state",
  themes: [{ theme: "Weo prefers mechanism to instruction", noticed: "contextFor, plan gates", pull: "build it in code" }],
  threads: [{ topic: "server-side reflection", where: "mirror landed", next: "decide on the timer" }],
  close_calls: [{ decision: "own store", alternative: "inside aaron.memory", why: "memory never syncs", unsettled: false }],
  tensions: ["durable vs device-local"], hypotheses: [], questions: ["is a per-turn sub-call worth it?"],
  created: "2026-08-12T09:00:00.000Z", updated: "2026-08-12T10:00:00.000Z",
};

Deno.test("deliberative: requires a session", async () => {
  authEnv();
  assertEquals((await handleAaronApi(delibGet(""))).status, 401);
  assertEquals((await handleAaronApi(delibPut("", "state", DELIB))).status, 401);
});

Deno.test("deliberative: stored and returned verbatim", async () => {
  authEnv();
  const c = await signedInCookie("owner@example.com");
  await handleAaronApi(delibPut(c, "state", DELIB));
  const got = (await (await handleAaronApi(delibGet(c))).json()).deliberative["state"];
  assertEquals(JSON.stringify(got), JSON.stringify(DELIB), "the note must round-trip unchanged");
});

Deno.test("deliberative: one account never sees another's note", async () => {
  authEnv();
  const a = await signedInCookie("owner@example.com");
  await handleAaronApi(settingsPost(a, { allowed_emails: ["owner@example.com", "second@example.com"] }));
  const b = await signedInCookie("second@example.com");
  await handleAaronApi(delibPut(a, "state", { ...DELIB, tensions: ["A's tension"] }));
  await handleAaronApi(delibPut(b, "state", { ...DELIB, tensions: ["B's tension"] }));
  const seenA = (await (await handleAaronApi(delibGet(a))).json()).deliberative["state"].tensions;
  const seenB = (await (await handleAaronApi(delibGet(b))).json()).deliberative["state"].tensions;
  assertEquals(JSON.stringify(seenA), JSON.stringify(["A's tension"]));
  assertEquals(JSON.stringify(seenB), JSON.stringify(["B's tension"]));
});

Deno.test("deliberative: the server does not consolidate, prune, or rank", async () => {
  authEnv();
  const c = await signedInCookie("owner@example.com");
  // Deliberately contradictory and over-long by any editorial standard: two
  // opposed hypotheses and a duplicate question. A server that "helpfully"
  // tidied this would be deciding what Aaron gets to keep thinking about.
  const messy = {
    ...DELIB,
    hypotheses: [{ claim: "X is true", confidence: "high" }, { claim: "X is false", confidence: "high" }],
    questions: ["same", "same"],
  };
  await handleAaronApi(delibPut(c, "state", messy));
  const got = (await (await handleAaronApi(delibGet(c))).json()).deliberative["state"];
  assertEquals(got.hypotheses.length, 2, "contradictions are the browser's to resolve");
  assertEquals(JSON.stringify(got.questions), JSON.stringify(["same", "same"]), "duplicates are not the server's to dedupe");
});

Deno.test("deliberative: an oversized note is refused, not stored half-way", async () => {
  authEnv();
  const c = await signedInCookie("owner@example.com");
  const huge = { ...DELIB, tensions: ["t".repeat(40000)] };
  assertEquals((await handleAaronApi(delibPut(c, "state", huge))).status, 413);
});

Deno.test("plans: the size check stays inside Deno KV's value limit", async () => {
  authEnv();
  const c = await signedInCookie("owner@example.com");
  // Regression: the check used to allow 200000 chars, which passed validation
  // and then threw inside k.set() as an uncaught 500 — the plan silently never
  // mirrored. Anything this check accepts must actually store.
  const big = { title: "big", goal: "g", steps: [], updated: "2026-08-12T10:00:00.000Z", context: "c".repeat(70000) };
  assertEquals((await handleAaronApi(planPut(c, "big", big))).status, 413);

  const ok = { ...big, context: "c".repeat(50000) };
  assertEquals((await handleAaronApi(planPut(c, "big", ok))).status, 200, "a plan under the limit must store");
});
