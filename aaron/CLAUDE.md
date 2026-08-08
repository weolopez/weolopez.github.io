# Aaron — browser-only agent harness

Scope: this folder only (`/root/weolopez.github.io/aaron`). Everything outside it is read-only.
Live at **https://aaron.weolopez.com** (served from `index.html`).

## What this is

A complete agentic loop that runs **in the tab**. The page streams the response,
executes tool calls in the browser, and feeds results back. No build step, no
bundler, no framework — one HTML file with an inline ES module.

There is now exactly one server file, `api.ts`, and its only job is to hold the
provider key. **The loop did not move to the server and must not.**

## Non-negotiable constraints

- **The agent loop stays in the browser.** Tool execution, the `stop_reason`
  loop, skills, and transcript assembly live in `index.html`. If something can't
  be done from the browser, that limitation is the interesting part — surface it.
  Amending this needs the same conversation the proxy got.
- **The server stays a passthrough, read-only reporting, and dumb storage.**
  `api.ts` forwards the Anthropic Messages format to a configurable upstream,
  reports spend, and stores config and skill records. It must not gain: prompt
  or response logging, conversation state, tool or skill execution,
  system-prompt injection, or retry logic. The file's header comment is the
  canonical list of what runs there — keep it accurate, and if you add an
  endpoint, add it to that list first.
- **Skill code is opaque to the server.** `/skills` stores and returns records
  verbatim. It must never compile, execute, lint, or introspect `code` — the
  browser is the only place a skill runs, and that is what keeps a stored
  string from becoming server-side code execution.
- **Skills are never shared across accounts.** Keyed `["aaron_skills", email,
  slug]`. The browser compiles skill code with `AsyncFn` and runs it under the
  signed-in session, so serving one account's skill to another is stored code
  execution against that user. A shared toolbox needs its own explicit
  decision, not a widened prefix scan.
- **No build step.** Native ES modules, no imports from a CDN (nothing external
  loads). Everything ships in the file.
- **Single file by default.** Split into `*.js` modules in this folder only when
  `index.html` genuinely stops being readable.

## The server (`api.ts`)

Mounted at `/aaron/api/*` by `claude-rc-ctl wire aaron`, which regenerates
`site-routes.generated.ts` — **do not hand-edit `static-server.ts`**; that file is
outside this folder and the agent fence makes it read-only anyway.

Three routes, and that's the whole surface:

| Route | Does |
|---|---|
| `POST /aaron/api/llm` | Checks `x-aaron-token`, remaps the model id if `AARON_MODEL_MAP` is set, forwards to the upstream with the provider key, streams the body back verbatim and forwards `anthropic-ratelimit-*` |
| `GET /aaron/api/config` | Reports `{provider, upstream, has_key, spend:{available}}` so the UI can say where the key lives and whether spend is offered. Never returns a secret. |
| `GET /aaron/api/spend?days=N` | Read-only reporting with `AARON_ADMIN_KEY`, aggregated to a few numbers and memoized 60s. Session-gated. |
| `POST /aaron/api/login` | Verifies a Google `id_token`, checks the allowlist, mints a session in KV, sets an HttpOnly cookie |
| `GET /aaron/api/me` | `{authenticated, user}` from the cookie. Never echoes the session id. |
| `POST /aaron/api/logout` | Deletes the session server-side and expires the cookie |
| `GET/PUT/DELETE /aaron/api/skills[/<slug>]` | Per-account skill mirror. Stores records verbatim, never runs them. DELETE writes a tombstone. |

## Saying which state you're in

The header carries a permanently-visible `#who` chip — **outside** the mobile
tray on purpose, because "am I signed in?" must be answerable without opening
anything. Four states, distinguished by colour as well as text: `checking…`
(grey, until detection *and* the session check settle — it never asserts an
unverified state), `signed out` (red), the address local-part (green), and amber
for the two "a secret is on this device" cases (`key on device` in direct mode,
`token` for break-glass). The chip is also the shortcut — tap to sign in or out —
and `keyBtn` renames itself Key → Account in proxy mode.

If you find yourself unable to tell whether you're signed in, that's a bug in
this chip, not a thing to explain in a panel.

## Who gets in

Google sign-in with sessions in Deno KV (`./aaron/aaron.db`), the same shape as
`epl/api.ts` — see `docs/features/google-auth.md` for the shared recipe. **Full-page
redirect, never the GSI popup**: iOS blocks popups in standalone mode, which is
precisely how this gets used on a phone.

**`redirect_uri` is `location.origin` — no trailing slash.** Google matches it
byte-for-byte against the Authorized redirect URIs, and `https://aaron.weolopez.com`
is what's registered (unlike `admin`, which is registered *with* a slash — the
shared recipe's "trailing slash matters" is right about it mattering and wrong
about which way for this site). Adding a `/` here breaks sign-in with an error
that only surfaces at Google, never in our logs.

You can check what's registered without touching the Console — request the
authorize URL and grep for `redirect_uri_mismatch`:

```sh
curl -s -L "https://accounts.google.com/o/oauth2/v2/auth?client_id=$CID\
&redirect_uri=https%3A%2F%2Faaron.weolopez.com&response_type=id_token\
&scope=openid%20email%20profile&nonce=p" | grep -qi redirect_uri_mismatch \
  && echo mismatch || echo accepted
```

The browser holds an **HttpOnly** cookie it cannot read, so in proxy mode there is
no bearer secret on the device at all. That is the whole point — don't reintroduce
one by stashing a session id in `localStorage`.

Two hardening details that go beyond the shared recipe, both load-bearing:

- **`aud` is checked** against `GOOGLE_CLIENT_ID`. Without it, an `id_token`
  minted for *any other* Google app would be accepted here.
- **`GOOGLE_CLIENT_ID` has no hardcoded fallback.** With one, the
  "no way to authenticate anyone" 503 could never fire, and a fail-closed guard
  that cannot fire is worse than none. `.env` and the systemd unit both set it.

`AARON_ALLOWED_EMAILS` (comma-separated) is the allowlist; a non-listed address
gets a 403 **naming the address**, because signing in with the wrong Google
account is the overwhelmingly common cause.

`AARON_ACCESS_TOKEN` survives only as an opt-in break-glass fallback and is
honoured just when it's set — unset it once sign-in works, and the token box
disappears from the UI on its own.

## Config lives in the database, not `.env`

`["aaron_settings", k]` is readable (provider, base_url, path, model_map,
allowed_emails); `["aaron_secrets", k]` is **write-only** (llm_key, admin_key) —
stored, never read back, not even to a signed-in admin. Precedence is always
**DB > env**, and env survives only as a migration fallback; `GET /settings`
reports `from_env` per value so the UI can show what hasn't moved across yet.

`SETTING_KEYS` / `SECRET_KEYS` are a fixed whitelist. Don't turn this into a
general key-value store: anyone signed in can reach these routes.

Two guards that exist because losing them is unrecoverable without shell access:

- **An allowlist edit that would remove the editor is refused** (400, not a
  silent lockout), and an empty allowlist is refused outright.
- **A blank secret field means "leave it alone", not "clear it"** — the client
  omits blanks entirely, so saving the panel never wipes a key you didn't retype.
  Sending an explicit `""` is the deliberate way to clear one.

**Bootstrap:** the allowlist is in the DB, but editing it needs a session, which
needs to already be on it. `aaron/seed.ts` breaks that circle — run it once from
a shell with the addresses that should have access. It refuses to seed secrets on
purpose: a key on a command line ends up in shell history.

**`AARON_ADMIN_KEY` is deliberately a second variable.** It is a broader
credential than the inference key — Anthropic wants an admin key with org-wide
read, OpenRouter a management key — so it never touches `/llm` and never reaches
the browser. Unset means `/spend` reports unavailable and nothing else changes.

**Spend is not balance, and the two providers differ.** Anthropic's
`cost_report` returns spend only (`remaining: null`) — there is no balance
endpoint at any auth level. OpenRouter's `/credits` returns purchased vs used, so
`remaining` is real there. The `kind` field says which you got, and the UI must
never render a balance that doesn't exist. Two units traps worth remembering:
Anthropic's `amount` is **cents as a decimal string** (`"123.45"` = $1.23);
OpenRouter's credits are already dollars.

**Provider-agnostic by wire format, not by abstraction layer.** Anthropic,
OpenRouter (`/api/v1/messages`) and LiteLLM (`/v1/messages`) all speak the
Anthropic Messages format — verified: OpenRouter 401s on that path and 404s on a
bogus one. So swapping providers is `AARON_PROVIDER` + a key, with no translation
code. Resist adding an OpenAI-shape adapter: thinking blocks and their signatures
have no equivalent there, and the loop depends on echoing them back byte-identical.

Fails closed: no `AARON_ACCESS_TOKEN` means every request gets a 503. An LLM proxy
holding a billable key must never be reachable without a secret.

## Two transports (`transport` in `index.html`)

Detected at load via `/aaron/api/config`, never hardcoded:

- **proxy** — the config route answered. Identity is the Google session cookie
  (`credentials: "include"`); the provider key and `anthropic-version` are the
  server's business. `x-aaron-token` is sent only if a break-glass token was pasted.
- **direct** — nothing answered (or the proxy is unconfigured). Falls back to
  calling `api.anthropic.com` from the page with `x-api-key` from `localStorage`
  plus `anthropic-dangerous-direct-browser-access: true`.

This is why the live site keeps working when the server side is down or unwired.
The access panel states which mode is live and therefore where the secret sits —
**that wording is the security notice; don't soften it.** In direct mode the
`localStorage` key warning stays.

## The wire contract

The request body is the **Anthropic Messages** shape in both transports — the payload
is byte-identical whichever way it goes out, which is what keeps one loop working
against both.

- Upstream endpoint `POST /v1/messages`, `anthropic-version: 2023-06-01` (the server
  adds the version header in proxy mode; the page adds it in direct mode).
- Direct-from-browser additionally requires **`anthropic-dangerous-direct-browser-access: true`**.
  Without it the request is CORS-rejected. This is what made the original design possible
  and it still carries the fallback.
- Secrets by mode: `localStorage["aaron.accessToken"]` (proxy — scoped, buys nothing
  elsewhere) or `localStorage["aaron.apiKey"]` (direct — billable, and the UI says so).

## Usage & cost — what the browser can and cannot know

**There is no balance.** The Anthropic API exposes no remaining-credit endpoint at
all; remaining credit lives in the Console. The org-level usage and cost reports
(`/v1/organizations/cost_report`, `/v1/organizations/usage_report/messages`) need an
admin key *and* return **no `access-control-allow-origin` header** — verified — so a
browser fetch is CORS-blocked regardless of key type. Don't try to route around it:
that's the constraint this folder exists to surface.

In proxy mode the server closes part of this gap: `/aaron/api/spend` returns the
provider's own spend (and, on OpenRouter, a real remaining balance). The meter
shows reported figures in the accent colour and demotes the local number to
"local est." when both are present — **a guess and a fact must never look
alike.** Everything below still applies to direct mode, and to spend on
Anthropic, where balance remains unknowable.

Two things the browser can read on its own, and the meter uses both:

- **Token counts**, from the stream: `message_start` carries input and cache counts,
  `message_delta` carries the running output count. Both are cumulative — assign,
  never add. Priced locally by `PRICES` ($/Mtok, cache read ×0.1, write ×1.25, with
  date-gated intro rates), accumulated per model into `localStorage["aaron.usage"]`.
  This is an **estimate**, and the UI says so — keep that disclaimer.
- **Rate-limit headroom**, from response headers: the API sends
  `access-control-expose-headers: *`, so `anthropic-ratelimit-*` and `retry-after`
  are readable from JS. The meter groups `anthropic-ratelimit-<name>-<field>`
  generically and renders whatever arrives — no hardcoded header names to rot.

Keep `PRICES` in sync with the published rates when a model is added; an unpriced
model still counts tokens and requests, it just contributes no cost.

## Phone layout

One breakpoint at **700px**, plus a short landscape rule for when vertical space
is the scarce thing. The header's nine controls collapse into `#controls` behind
the `⋯` `#menuBtn`; on desktop that button is `display:none` and the tray is
always open, so the JS is inert there.

Four things here are load-bearing and easy to undo by accident:

- **16px form text on phones.** Below 16px, iOS zooms the whole page on focus
  and the layout ends up sideways mid-sentence. Never shrink `#prompt` /
  `#banner input` under 16px in the phone block.
- **`100dvh`, behind `@supports`.** Plain `100vh` leaves the composer stranded
  under a collapsing URL bar.
- **`env(safe-area-inset-*)`.** `footer` pads its bottom at *every* width (iPad
  portrait is wider than the breakpoint and still has an inset); header and
  drawer pad their top.
- **`stick`-aware `scroll()`.** Auto-scroll only happens when the reader is
  already within 120px of the bottom. Restoring unconditional scrolling would
  yank people back down mid-sentence every time a token lands, which is the
  worst thing a streaming UI can do on a phone. Sending re-arms it deliberately.

iOS Add-to-Home-Screen works via the `apple-mobile-web-app-*` meta tags — **no
`manifest.json` on purpose**, so the page stays self-contained per the no-extra-
files rule. There's no service worker and shouldn't be: offline caching has
nothing useful to offer a loop whose whole job is calling a live API.

## Loop invariants (break these and it fails subtly)

- Append the **full `content` array** to `messages`, never just the text. Thinking
  blocks must be echoed back byte-identical (`thinking` + `signature`) on the same model.
- Streamed tool inputs arrive as `input_json_delta` fragments — concatenate
  `partial_json` per block index and `JSON.parse` at `content_block_stop`.
- Return **every** `tool_result` for a turn in **one** user message. Splitting them
  across messages trains the model out of parallel tool calls.
- A failed tool returns a `tool_result` with `is_error: true` — never a dropped result.
- Continue only while `stop_reason === "tool_use"`. Handle `refusal` and `max_tokens`
  explicitly rather than treating them as normal completion.

## Skills

A skill is a **named, persisted JavaScript function** — the durable half of the
toolbox, where `js_eval` is the scratchpad. Records live in
`localStorage["aaron.skills"]` as `{name, description, code, tags, example, runs,
created, updated, last_run}`, keyed by slug.

`code` is the **body** of an async function compiled with two arguments in scope:
`input` (the arguments object) and `skill(name, input)` (call another saved skill,
guarded at depth 5). It is recompiled on every call, so an edit takes effect
immediately and nothing carries state between runs.

Six tools implement the loop: `skill_search` (weighted over name 5 / tags 4 /
description 2 / code 1) → `skill_save` / `skill_get` → `skill_run` → and
`skill_list` / `skill_delete` for housekeeping.

Two design points that carry the behavior, don't undo them:

- **`example` is required and doubles as a self-test.** `skill_save` compiles
  (rejecting syntax errors *before* storing), saves, then runs the example and
  returns the output — or the stack trace, labelled loudly. The model finds out a
  skill is broken while it still has the context to fix it.
- **Saving over the same name is an update**, preserving `created`, `runs`, and any
  `tags` the call omits. The system prompt pushes refining a near-miss over forking
  a parallel copy; the storage has to reward that.

The drawer (`#drawer`, "Skills · n" in the header) renders straight from
localStorage on every mutation, so what the user sees is exactly what the model
would find and run. Deleting there deletes for real.

### Syncing (`syncSkills()`)

`localStorage` stays the **working copy** — the loop reads it synchronously and
has to keep working offline and in direct mode. The server is a per-account
mirror the client reconciles against, on sign-in and on `visibilitychange`
(when another device's edits are most likely to have landed). Sync is a no-op
unless `transport.mode === "proxy" && me.authenticated`, so direct mode is
unaffected.

The merge unit is one skill, so two devices editing *different* skills never
conflict. Within a skill:

- newer `updated` wins outright;
- `runs` merges by `max` and `last_run` by most-recent, so **running** a skill
  can never roll back an edit made elsewhere;
- a delete travels as a `{deleted: true, updated}` tombstone. A bare delete
  would let a device that still holds the skill re-upload it as a local-only
  addition on the next merge and resurrect it. A local edit newer than the
  tombstone deliberately wins — that's an undelete, not a bug.

**Local tombstones (`aaron.skillGraves`) are load-bearing.** Server-side
tombstones stop a *remote* delete from being undone; they do nothing for a
delete made while offline or before signing in, where the DELETE never lands.
Without a local grave, the next sync sees "server has it, we don't", adopts it
back, and the deletion silently reverses — verified before the fix. So every
delete records `{id: now}` locally, and sync turns an unsent one into a real
DELETE. A grave is dropped once the server carries the tombstone, when the
skill legitimately comes back, or after 90 days. `skill_save` and import both
**clear** the grave, or a re-created skill would be deleted on next sync.

`skill_save` and both delete paths push immediately; **runs deliberately do
not**. Pushing on every execution would mean a write per tool call just for a
counter, and the next reconcile takes the high-water mark anyway. Fetch
failures are swallowed on purpose: the local copy stands and the next sync
reconciles.

### Export / import (the backup sync isn't)

`Export` / `Import` in the skills drawer write and read a plain JSON file
(`{type:"aaron.skills", version, exported, skills}`). This is the only path that
works with **no proxy, no account, and no network** — and the only one that
survives the account or the server going away. It matters most on a phone: iOS
evicts `localStorage` for sites you haven't opened in a while, so "it's saved
locally" is not a durable claim.

**Import merges, never replaces** — same newest-`updated`-wins rule as sync,
with `runs` taking the high-water mark. Replacing would let restoring a phone
backup silently wipe desktop-only skills. A bare `{slug: record}` map is also
accepted, so a hand-written or older file still imports. Entries without a
`code` string are skipped rather than stored, and a malformed file leaves the
existing store untouched.

## Adding a tool

Add an entry to the `TOOLS` object in `index.html`: `description`, `input_schema`,
and an async `run(input)` returning a string. The schema list and the dispatcher are
both derived from that object — nothing else to touch. Be prescriptive in the
description about *when* to call it, not just what it does.

## Models

Default `claude-opus-5`. Adaptive thinking with `display: "summarized"` (the default
`"omitted"` streams empty thinking blocks and reads as a long stall). Effort is a
UI control — `medium` is a good default; raise it for hard agentic work.
