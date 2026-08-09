# Aaron — browser-only agent harness

Scope: this folder only (`/root/weolopez.github.io/aaron`). Everything outside it is read-only.
Live at **https://aaron.weolopez.com** (served from `index.html`).

## What this is

A complete agentic loop that runs **in the tab**. The page streams the response,
executes tool calls in the browser, and feeds results back. No build step, no
bundler, no framework — `index.html` plus a handful of native ES modules it
imports directly (`store.js`, `tools.js`, `baton.js`, `system.js` and its
`persona/` parts). Nothing is compiled and nothing external loads.

There is now exactly one server file, `api.ts`, and its only job is to hold the
provider key. **The loop did not move to the server and must not.**

## Non-negotiable constraints

- **The agent loop stays in the browser.** Tool execution, the `stop_reason`
  loop, skills, and transcript assembly live in the page and the modules it
  imports — never on the server. If something can't be done from the browser,
  that limitation is the interesting part — surface it. Amending this needs the
  same conversation the proxy got.
- **The server stays a passthrough, read-only reporting, and dumb storage.**
  `api.ts` forwards the Anthropic Messages format to a configurable upstream,
  reports spend, and stores config and skill records. It must not gain: prompt
  or response logging, conversation state, tool or skill execution,
  system-prompt injection, or retry logic. The file's header comment is the
  canonical list of what runs there — keep it accurate, and if you add an
  endpoint, add it to that list first.
- **Stored records are opaque to the server.** `/skills` and `/plans` store and
  return records verbatim. The server must never compile, execute, lint, or
  introspect `code` — the browser is the only place a skill runs, and that is
  what keeps a stored string from becoming server-side code execution — and it
  must never read, rank, or act on a plan, least of all set its approval.
- **Records are never shared across accounts.** Keyed `["aaron_skills", email,
  slug]` and `["aaron_plans", email, slug]`. The browser compiles skill code
  with `AsyncFn` and runs it under the signed-in session, so serving one
  account's skill to another is stored code execution against that user. A
  shared toolbox needs its own explicit decision, not a widened prefix scan.
- **No build step.** Native ES modules loaded by the browser, no bundler, no
  imports from a CDN. Nothing external ever loads.
- **Split only when readability demands it.** `index.html` held everything until
  it stopped being followable; the modules that exist each own one concern
  (`store.js` data and sync, `tools.js` tool definitions, `baton.js` reload
  survival, `persona/*` prompt parts). Keep new files to that bar — a module per
  idea, not a module per function.

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
| `GET/PUT/DELETE /aaron/api/plans[/<slug>]` | Per-account plan mirror, same contract via the shared `MIRRORS` table. Never sets or clears approval. |

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
- **The first turn's sent content and displayed content are allowed to diverge —
  deliberately, in exactly one place.** `run()` folds `memoryBackend.contextFor()`
  into `messages[0].content` only when `messages.length === 0` (a fresh
  conversation or a baton resume), so the model gets persisted memory as data,
  not just as a prompt instruction it might not follow. The rendered turn still
  shows only what was typed — `turn()` sets `.body.textContent` from the raw
  `userText`, never the primed string. Every other message in `messages` is
  exactly what appears on screen; do not let this pattern spread past turn one,
  or "what you see is what the model saw" stops being true anywhere.

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

### Syncing (`syncStore(kind)`)

Skills and plans share **one** implementation — `STORES` in `index.html` holds
what differs (localStorage key, grave key, route, renderer, per-kind merge) and
everything else is common. Two copies of this logic would drift, and the parts
that drift are the parts that silently lose work.

`localStorage` stays the **working copy** — the loop reads it synchronously and
has to keep working offline and in direct mode. The server is a per-account
mirror the client reconciles against, on sign-in and on `visibilitychange`
(when another device's edits are most likely to have landed). `syncAll()` is a
no-op unless `transport.mode === "proxy" && me.authenticated`, so direct mode is
unaffected.

The merge unit is one record, so two devices editing *different* skills — or
*different* plans — never conflict. Within a record:

- newer `updated` wins outright;
- **skills** additionally merge `runs` by `max` and `last_run` by most-recent,
  so **running** a skill can never roll back an edit made elsewhere;
- **plans** keep nothing extra: a plan is one document, and its approval rides
  inside it like any other field. This is why approving bumps `updated` —
  otherwise a device that merely *read* the plan could win the next merge and
  quietly un-approve it;
- a delete travels as a `{deleted: true, updated}` tombstone. A bare delete
  would let a device that still holds the record re-upload it as a local-only
  addition on the next merge and resurrect it. A local edit newer than the
  tombstone deliberately wins — that's an undelete, not a bug.

**Local tombstones (`aaron.skillGraves`, `aaron.planGraves`) are load-bearing.**
Server-side tombstones stop a *remote* delete from being undone; they do nothing
for a delete made while offline or before signing in, where the DELETE never
lands. Without a local grave, the next sync sees "server has it, we don't",
adopts it back, and the deletion silently reverses — verified before the fix. So
every delete records `{id: now}` locally, and sync turns an unsent one into a
real DELETE. A grave is dropped once the server carries the tombstone, when the
record legitimately comes back, or after 90 days. `skill_save`, `plan_save`, and
import all **clear** the grave, or a re-created record would be deleted on the
next sync.

`skill_save`, `plan_save`, `plan_step_update`, approval, and every delete path
push immediately; **skill runs deliberately do not**. Pushing on every execution
would mean a write per tool call just for a counter, and the next reconcile takes
the high-water mark anyway. Fetch failures are swallowed on purpose: the local
copy stands and the next sync reconciles.

### Export / import (the backup sync isn't)

`Export` / `Import` in the drawer write and read a plain JSON file
(`{type:"aaron.backup", version: 2, exported, skills, plans}`). **One file
carries both stores**: a backup that saves your skills and loses the plan you
spent an afternoon arguing over is not a backup. This is the only path that
works with **no proxy, no account, and no network** — and the only one that
survives the account or the server going away. It matters most on a phone: iOS
evicts `localStorage` for sites you haven't opened in a while, so "it's saved
locally" is not a durable claim.

**Import merges, never replaces** — same newest-`updated`-wins rule as sync,
with `runs` taking the high-water mark. Replacing would let restoring a phone
backup silently wipe desktop-only work. Older files still import: a
`{type:"aaron.skills", skills}` v1 export, and a bare `{slug: record}` map,
are both read as skills. Entries that fail the per-kind `VALID` check (a skill
needs `code`, a plan needs `title` and `steps`) are skipped rather than stored,
and a malformed file leaves the existing store untouched.

## Plans

The other durable store, and the one that changes how a conversation goes. A
plan is what a design discussion leaves behind: the goal, the context you
established, the ordered steps, the risks, the questions still open. It exists
so the thinking outlives the transcript — and so approval is a dated event
rather than a line of chat two people remember differently.

**There is no explicit mode, by design.** No `/plan` command, nothing to enter
or forget you're in. The system prompt teaches the *cues* — the person
describes a situation rather than asking a question, the work spans several
parts or sessions, order matters, mistakes are expensive to undo — and the
counter-cues that matter just as much: one determinate answer, a job that's a
tool call or two, or "just do it". Making someone sit through a planning
conversation for a five-minute task is the failure mode here, and it is worse
than not planning at all.

The inference is made **visible without chrome**: Aaron signals "I think we're
planning" by producing a draft plan card you can ignore, revise, or approve.
There is no badge to check and no state to get stuck in.

**Approval is human-only, and this is the load-bearing constraint.** There is
deliberately no `plan_approve` tool. A model that can approve its own plan
turns "I'd like to sign this off" into a formality it performs on your behalf,
which is precisely what the feature exists to prevent. `setApproval()` is
reachable only from the button, and `plan_step_update` **refuses on a draft**,
so the work cannot start before the agreement exists. If you ever want the
model to be able to approve, that needs the same conversation the proxy got.

Five tools: `plan_save` (create or revise) → the person approves →
`plan_step_update` as each step lands, with `plan_get` / `plan_list` /
`plan_delete` for the rest. Records live in `localStorage["aaron.plans"]` as
`{name, title, goal, context, steps:[{title, detail, status, note}], risks,
open_questions, status, approved_at, revision, created, updated}`, keyed by
slug, and mirror to the server like skills.

Three behaviours carry the design — don't undo them:

- **Every save is a draft, including a revision of an approved plan.** Keeping
  approval through an edit would let the approved text drift away from the text
  that was actually read. `plan_save` says so loudly when it happens.
- **A revision carries step status across by title.** Re-planning around
  something you learned at step 3 is normal and must never silently mark
  finished work undone. Which is why step titles want to stay stable.
- **One card builder, two places.** `planEl()` renders both the transcript card
  (where the plan was written, so approving isn't a scavenger hunt) and the
  drawer list. Two renderings would eventually disagree, and the whole thing
  rests on approving exactly the text you read. `renderPlans()` refreshes every
  card in the log, so approving in one place updates the other.

The `Plans · n` header button stays `display:none` until a plan exists — an
empty panel isn't worth a control — and goes amber while any plan is waiting on
a person, because a draft is a question addressed to you.

## Surviving a reload (`baton.js`)

`messages` is a plain in-memory array. A reload erases the entire conversation,
which means Aaron cannot do anything that *requires* one: reloading to pick up a
change it just made to a file the page only reads at load, clearing a wedged
DOM, or coming back after iOS evicted the tab. `memory_write` persists, but
nothing reads it back on its own — after a reload there is nobody left to ask.

A **baton** closes that gap. `reload_and_continue` writes one note, the page
reloads, and on load `checkBaton()` hands that note straight back to the loop as
the opening user message.

**Only the baton survives — the transcript does not**, and the tool description
says so in capitals. That is the design, not a limitation to fix later: a
handoff you are forced to write is a handoff worth reading, and persisting a
real transcript would mean round-tripping thinking-block signatures byte-exact
under a ~5MB localStorage cap. Plans and skills *do* survive, so the note is
told to name them by slug — re-reading a plan is the fastest way back in.

**A baton that fires unconditionally is a loop that restarts itself forever**
(write → reload → the continuation writes another → reload), spending money with
nobody watching. Four things stop that, and all four are load-bearing:

- **Single use.** Consumed and deleted *before* the loop starts, so a throw
  mid-turn or a second crash cannot re-fire it. One wasted turn is recoverable;
  a baton that re-arms every load is not.
- **The chain is capped** at `BATON_MAX_CHAIN` (5). Each baton carries its
  generation, `setBatonGeneration()` seeds it from the one being consumed, and
  `writeBaton()` **throws instead of writing** at the cap — the model gets the
  refusal as a tool error while it still has the context to say what is stuck.
- **Batons go stale** after `BATON_FRESH_MS` (15 min). Come back on Monday and
  the page must not silently resume something you have forgotten.
- **No secret, no auto-resume.** Checked after `detectTransport()` settles,
  because `haveSecret()` means different things per transport.

Every guard still leaves the baton **resumable by hand** — `offerBaton()` renders
the note with a Resume button. The person can always overrule a guard; they just
have to be present to do it.

**Resuming is never silent.** It renders as a `data-role=resume` turn labelled
`resumed · reload N of M`, in the same amber the UI uses everywhere for "this
happened on its own and you should know". A page that starts talking to itself
with no explanation is indistinguishable from a bug. `run(text, as)` only
relabels the turn — the text the model reads and the text on screen stay the
same string.

The loop stops the moment `pendingReload()` is set, right after the tool card
paints: sending that `tool_result` would open a request on a page about to be
destroyed mid-stream, and the baton already holds anything worth keeping.

**The baton is device-local and deliberately not one of the synced `STORES`.** A
baton that followed you to another device would resume a task on a tab that
never started it.

## From approved plan to actual work

Aaron cannot touch the filesystem, so a plan it writes usually contains steps it
can only describe — it tags them `[REPO ACCESS REQUIRED]`. The shell-side agent
(`claude-rc@aaron`, fenced to this folder) is the other end of that handoff.

**The handoff is a pull, never a push.** There is no endpoint that shells out.
An LLM in a browser tab triggering a shell agent on the host would be arbitrary
code execution wearing a REST costume, and it is the one option in this design
that was rejected outright. Instead: approving a plan writes a record, and the
shell side notices.

| Piece | Does |
|---|---|
| `plan-kv.ts` | Reads plans from `["aaron_plans", email, slug]` and writes step status back. `list`, `pending`, `get`, `step`. |
| `.claude/skills/work-plan/` | The judgement: which steps are actually ours, verify before marking done, what to do when a step's premise has gone stale. |
| `plan-poll.ts` + `systemd/` | Notices a changed plan and invokes that same skill. |

**The write-back is what makes it feel alive.** `plan-kv.ts step` bumps
`updated`, so the browser's newest-wins merge adopts it on the next
`visibilitychange` — steps tick over on the phone as the work lands. No new
protocol; the sync design already tolerated a second writer.

Three guards, each load-bearing:

- **`step` refuses on a plan that is not approved**, and there is deliberately
  no `approve` command. A shell tool that could grant approval would make the
  whole gate decorative.
- **Only `status` and `note` are writable.** Titles, details, goal and risks
  belong to the browser side; overwriting them would silently rewrite the text
  someone approved.
- **The poller runs only when the plan's state has changed since its last
  attempt, and stops when an attempt changes nothing.** The signature is
  `revision` plus the count of unfinished steps: progress moves it, so it comes
  back for the rest; no progress leaves it identical, so it stops. That
  fixpoint — not a retry count — is what keeps an unfinishable plan from
  becoming an unbounded spend loop. `MAX_ATTEMPTS` is a blunt second backstop.

**The autonomous path is fenced exactly like the interactive one.** The timer
unit repeats `claude-rc@aaron`'s `ReadOnlyPaths` / `ReadWritePaths` verbatim.
That kernel boundary, not a permission prompt, is what lets the unit skip
permission prompts safely — and it means a plan can only ever change Aaron
itself. Steps needing anything outside this folder are `blocked`, naming the
agent that owns that path.

The timer is staged in `systemd/` rather than installed: enabling it is the
moment a plan approval starts commissioning an agent, and that should be a
deliberate act. `plan-poll.ts --dry-run` reports what it would start without
touching state.

## Adding a tool

Add an entry to the `TOOLS` object in `index.html`: `description`, `input_schema`,
and an async `run(input)` returning a string. The schema list and the dispatcher are
both derived from that object — nothing else to touch. Be prescriptive in the
description about *when* to call it, not just what it does.

## Models

Default `claude-opus-5`. Adaptive thinking with `display: "summarized"` (the default
`"omitted"` streams empty thinking blocks and reads as a long stall). Effort is a
UI control — `medium` is a good default; raise it for hard agentic work.

**Model and effort persist across reloads**, in `localStorage["aaron.prefs"]` —
deliberately *not* through the server database. They're a per-device UI choice,
not project state, so they don't belong next to skills (which are meant to
follow you) or settings (which are shared, account-wide config). `restorePrefs()`
runs once at load, before anything else touches the selects, and only applies a
saved value if it's still a real `<option>` — a retired model name in storage
must never leave a `<select>` on a blank value; it just falls back to whatever
the markup defaults to.
<!-- AARON-PROBE-223895aa46c84959 -->
