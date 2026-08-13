---
name: work-plan
description: Implement the repo-side steps of an approved Aaron plan. Reads the plan from Deno KV (where the browser mirrored it), does the work that requires filesystem access, and writes step status back so progress shows up in the Aaron UI. TRIGGER on "work the plan", "implement plan <slug>", "do the repo steps", or when the plan poller invokes it. Refuses on plans that are not approved.
---

# Work an approved plan

A plan is written and approved in the browser at aaron.weolopez.com, then
mirrored into `aaron/aaron.db` by `api.ts`. Aaron itself cannot touch the
filesystem, so it tags the steps it can't do — usually `[REPO ACCESS REQUIRED]`
— and those are yours. This skill is the other end of that handoff.

Everything here runs through `aaron/plan-kv.ts`, which reads and writes the same
record the browser syncs against.

## 1. Find the work

```sh
deno run -A --unstable-kv aaron/plan-kv.ts pending        # approved, unfinished
deno run -A --unstable-kv aaron/plan-kv.ts get <slug>     # the whole plan
```

If invoked with a slug, use it. If not, use `pending`; if that lists more than
one plan, ask which — do not pick for them.

**Read the whole plan before touching anything**, including `context`, `risks`,
and `open_questions`. The context is where the discussion that produced the plan
was compressed, and it usually contains the reason a step is written the way it
is. `plan-kv.ts step` refuses on a plan that is not approved, but check the
status yourself too and stop early rather than doing work you can't record.

## 2. Decide what is actually yours

Work only the steps that genuinely need this machine:

- Steps tagged `[REPO ACCESS REQUIRED]`, or that edit files, config, or services.
- Anything else `todo` or `blocked` **whose premise still holds**.

Leave alone:

- Steps the browser agent can do itself — writing an Aaron skill, writing a
  memory record, anything that is purely `localStorage` or prompt-level. Doing
  those here takes work away from the side that can verify them.
- Steps waiting on a person (a refresh, a decision, an approval).

**You are fenced to `aaron/`.** The rest of the repo is mounted read-only and
writes fail with EROFS. A step needing changes outside this folder is `blocked`,
with a note naming the path and the agent that owns it — never a workaround.

## 3. Check the premise before you build

Plans are written against the code as it was understood at the time, sometimes
by an agent that could only see the deployed page. **Verify the step's premise
against the current tree before implementing it.** If a step says "in the inline
`<script>`" and that code now lives in `store.js`, implement the step's *intent*
in the right place and say so in the note.

If the premise is wrong in a way that changes what should be built — the step
asks for something already done, or now unnecessary, or unsafe — do **not**
improvise a replacement. Mark it `blocked`, explain what you found, and let the
plan be revised in the conversation that owns it. Revising a plan is the
browser's job and returns it to draft on purpose.

## 4. Work one step at a time

For each step you take:

```sh
deno run -A --unstable-kv aaron/plan-kv.ts step <slug> <n> doing
```

Do the work. **Verify it** — run the tests, check the file, hit the URL. Then:

```sh
deno run -A --unstable-kv aaron/plan-kv.ts step <slug> <n> done "what you did and how you verified it"
deno run -A --unstable-kv aaron/plan-kv.ts step <slug> <n> blocked "what is stopping it"
```

Rules that matter:

- **Never mark `done` on faith.** Done means you observed it working. If you
  couldn't verify, the step is `doing` or `blocked`, not done.
- **The note is read on a phone**, in the plan card. One or two plain sentences:
  what changed, how it was checked. Not a changelog.
- **Only status and note are yours.** Never edit a step's title or detail, the
  goal, the risks, or the plan's status — that is the browser's side of the
  mirror, and overwriting it silently rewrites what someone approved.
- **Never approve a plan.** `plan-kv.ts` has no such command by design.

## 5. Aaron-specific mechanics

Read `aaron/CLAUDE.md` first — it is the constraint list, and several of its
rules are the kind that fail silently when broken. In particular:

- **Bump `?v=N` on the module imports in `index.html`** after editing any
  `*.js` module. They are cached an hour at Cloudflare and are *not* auto-
  stamped, so a deploy will look green and change nothing. Verify with
  `curl -s 'https://aaron.weolopez.com/tools.js?v=N' | grep <new symbol>`.
- **Restart with `systemctl restart http-server.service`** after touching
  `api.ts`, then confirm the route answers.
- **Run the tests**: `deno test -A aaron/api_test.ts`.
- Never hand-edit `static-server.ts` or anything outside `aaron/`.

## 6. Report

Finish with: which steps you moved and to what, what you verified, and what you
left alone and why. Say plainly if you did nothing — a plan whose remaining
steps all belong to the browser or to a person is a correct outcome, not a
failure.

Progress lands in the Aaron UI on its own: the browser reconciles on
`visibilitychange`, so the steps tick over next time the tab is looked at.
