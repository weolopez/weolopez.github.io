---
name: aaron-repo-write
description: Commit and push a file change to weolopez.github.io on behalf of the aaron-fenced agent (aaron/ session; repo root incl. .git is read-only to it), then restart http-server.service if the change needs it. TRIGGER when the aaron session (or a message relaying its request) asks to land a specific, already-made file change. Always confirms with a human before pushing -- never pushes unattended.
---

# Commit/push (+ restart) on aaron's behalf

Aaron's session is fenced to `aaron/` -- kernel-enforced ReadOnlyPaths on the
repo root -- so it can edit files under aaron/ itself but cannot stage,
commit, or push. This skill is the other end of that handoff, run by
weolopez-server (unfenced, full repo access).

## 1. Verify the request

1. Read the request: it should name exact file(s) and describe the change
   already made on disk.
2. `git status` and `git diff <file>` for every named file. Confirm the diff
   matches exactly what was described. If it doesn't -- extra files touched,
   unexpected lines -- stop and report the mismatch instead of proceeding.

## 2. Confirm before pushing

**Never push without a human saying yes first.** Show the diff (or a summary)
and ask for a go-ahead before touching git. This is the one checkpoint that
stays manual, by design -- everything else in this skill runs on its own once
that yes is given.

## 3. Commit and push

Once confirmed:
- `git add` **only the named files** -- never `-A` or `.`.
- Commit with a message describing the change and noting it was requested by
  the aaron agent.
- `git push origin main`.

## 4. Restart if the change needs it

Per aaron/CLAUDE.md's own rules:
- Touched `aaron/api.ts`? -> `systemctl restart http-server.service`, then
  confirm a known route (e.g. GET /aaron/api/config) answers afterward.
- Touched an aaron `*.js` module (store.js, tools.js, system.js, baton.js,
  persona/*)? -> No restart needed, it's served as a static file -- but check
  whether the request also bumped `?v=N` on that module's import in
  index.html. Cloudflare caches these an hour, so a deploy can look green and
  serve stale code without the version bump. Flag it if missing; don't add it
  yourself unless asked.
- Anything else (docs, markdown, config with no runtime effect, e.g.
  CLAUDE.md)? -> No restart.

## 5. Verify and report

After any restart, confirm the affected route actually answers (curl it).
Then fetch the raw GitHub URL for a changed file (fresh, no cache) to confirm
the push landed with the right content.

Reply to the requester with: commit SHA, whether a restart happened (and its
result), and the raw-GitHub verification result.

## Guardrails

- Only ever stage files the request explicitly names. Never `git add -A` or
  `git add .`.
- Never push without the human go-ahead from step 2 -- no exceptions, even if
  the request says it's urgent.
- Never touch Aaron's plan approval (`["aaron_plans", ...]` in aaron.db) --
  that stays a separate, human-only gate inside the browser app.
