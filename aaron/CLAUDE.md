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
- **The server stays a passthrough plus read-only reporting.** `api.ts` forwards
  the Anthropic Messages format to a configurable upstream, and reports spend.
  It must not gain: prompt or response logging, persistent storage, tool
  execution, conversation state, system-prompt injection, or retry logic. The
  file's header comment is the canonical list of what runs there — keep it
  accurate, and if you add an endpoint, add it to that list first.
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
| `GET /aaron/api/spend?days=N` | Read-only reporting with `AARON_ADMIN_KEY`, aggregated to a few numbers and memoized 60s. Token-gated. |

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

- **proxy** — the config route answered. Sends `x-aaron-token`; the provider key
  and `anthropic-version` are the server's business.
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

## Adding a tool

Add an entry to the `TOOLS` object in `index.html`: `description`, `input_schema`,
and an async `run(input)` returning a string. The schema list and the dispatcher are
both derived from that object — nothing else to touch. Be prescriptive in the
description about *when* to call it, not just what it does.

## Models

Default `claude-opus-5`. Adaptive thinking with `display: "summarized"` (the default
`"omitted"` streams empty thinking blocks and reads as a long stall). Effort is a
UI control — `medium` is a good default; raise it for hard agentic work.
