---
name: claude-rc
description: Manage scoped Claude Code Remote Control instances ("agents"). Each agent is a named, folder-scoped Claude that runs as its own systemd service (e.g. "lucas" works only inside /root/weolopez.github.io/lucas). TRIGGER on "start/launch the <name> agent", "stop/restart the <name> agent", "create/delete an agent", or "list agents". "Start the <name> agent" bootstraps the site via the new-site skill if its folder is missing, then starts the instance.
---

# Claude Remote Control Instances

Use this skill when the user asks to **create / start / stop / restart / delete / list** a
remote-control instance, or to "make a Claude that only works in folder X".

## Mental model

- The **base server** is `weolopez-server` (systemd unit `claude-rc.service`), rooted at the repo. **Never touch it** with this skill.
- Each **scoped instance** is a systemd *template* unit `claude-rc@<name>`:
  - runs `claude --remote-control weolopez-<name>`
  - working directory = `/root/weolopez.github.io/<name>`
  - **kernel-fenced**: the rest of the repo is read-only, so the instance can only write inside its own folder (`ReadOnlyPaths` + `ReadWritePaths` in the unit).
- All operations go through one script: **`/root/weolopez.github.io/bin/claude-rc-ctl`** (also on PATH as `claude-rc-ctl`).

## Commands

Run these with the Bash tool. The script is the single source of truth — prefer it over raw `systemctl`.

```bash
claude-rc-ctl ensure  <name>                # idempotent "start the agent"; exits 4 if the folder is missing
claude-rc-ctl create  <name> [--no-start]   # mkdir folder if needed, enable + start
claude-rc-ctl start    <name>
claude-rc-ctl stop     <name>
claude-rc-ctl restart  <name>
claude-rc-ctl delete   <name> [--purge]     # stop + disable; keeps folder data (purge only prints the rm command)
claude-rc-ctl wire     <name>               # mount <name>/api.ts into the Deno server (regen + restart, rollback on failure)
claude-rc-ctl unwire   <name>               # remove <name>/api.ts from the Deno server
claude-rc-ctl list                          # table of all instances + the base server
claude-rc-ctl status   <name>
claude-rc-ctl logs     <name> [-f]
```

Instance names: lowercase letters, digits, `-`, `_`; must start alphanumeric. `server` is reserved.

## "Start the <name> agent" (bootstrap + start)

When the user says **"start the vacation agent"** (or any `start/launch the <name> agent`), run this exact procedure:

1. **Parse `<name>`** from the request (lowercase; e.g. "vacation").
2. **Run `claude-rc-ctl ensure <name>`.**
   - If it succeeds → the agent is now running (or already was). Skip to step 4.
   - If it exits **non-zero with `FOLDER_MISSING`** → the folder `/root/weolopez.github.io/<name>` doesn't exist yet. Go to step 3.
3. **Bootstrap the site, then start:**
   - Invoke the **`new-site`** skill to create `<name>.weolopez.com` (it creates the folder + page, wires `static-server.ts`, and sets up the proxy host).
   - Then run `claude-rc-ctl create <name>` to start the agent in the new folder.
4. **Verify & report:** run `claude-rc-ctl list`, then tell the user the agent's state, control name (`weolopez-<name>`), and scope folder. Remind them it may need pairing in the Remote Control app if it's brand new.

Do **not** mkdir the folder yourself to skip step 3 — a real subdomain needs the full `new-site` wiring, not just an empty directory.

## Giving a site server-side logic (backend API)

A fenced agent can write files inside its own folder but **cannot** edit `static-server.ts`
or restart the server. So adding a backend is a two-part flow:

1. **The agent writes `<site>/api.ts`** (inside its scope) exporting a request handler —
   any of `export default`, `export function handler`, or `export function handle<Site>Api` —
   with signature `(req: Request) => Response | Promise<Response>`, routing on the full
   pathname, e.g. `/<site>/api/...`. It persists data under its own folder (e.g.
   `Deno.openKv("/root/weolopez.github.io/<site>/<site>.db")`) and the frontend calls
   `/<site>/api/...`.
2. **A privileged step mounts it:** run `claude-rc-ctl wire <site>`. This regenerates
   `site-routes.generated.ts` (imported by `static-server.ts`) and restarts the Deno
   server. If the new `api.ts` breaks startup, `wire` **automatically rolls back** and
   restarts, so a bad site can't take down the shared server.

`claude-rc-ctl unwire <site>` removes the routes. **Note:** wired site code runs *in the
main server process* (as root) — `wire` is the trusted gate, so only mount code you trust.
The agent itself can't run `wire` (it's privileged); you or the base server runs it.

## Typical flows

**Create an instance for an existing folder** (e.g. `lucas`):
```bash
claude-rc-ctl create lucas
claude-rc-ctl list
```

**Stop / start later:**
```bash
claude-rc-ctl stop lucas
claude-rc-ctl start lucas
```

**Delete (keeps the folder and its files):**
```bash
claude-rc-ctl delete lucas
```

## Things to tell the user / watch for

- **Pairing:** a freshly started instance registers as `weolopez-<name>` and may need to be paired/approved in the Remote Control app, same as the base server.
- **Cost:** each instance is a full Claude process (~0.5 GB RAM). Fine for a handful; don't run dozens.
- **Scope guarantee:** the instance cannot modify other folders *inside the repo*. It is not a full system sandbox — it can still touch paths outside the repo (e.g. `/tmp`). To harden to a full sandbox, add `ProtectSystem=strict` + the needed `ReadWritePaths` to `/etc/systemd/system/claude-rc@.service` and `systemctl daemon-reload`.
- **Delete never removes folder data** unless the user explicitly runs the `rm -rf` that `--purge` prints.
- After editing the template unit, run `systemctl daemon-reload` before restarting instances.

## Files

- Control script: `/root/weolopez.github.io/bin/claude-rc-ctl`
- Template unit:  `/etc/systemd/system/claude-rc@.service`
- Base server:    `/etc/systemd/system/claude-rc.service` (do not manage here)
