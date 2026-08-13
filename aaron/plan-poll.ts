#!/usr/bin/env -S deno run -A --unstable-kv
/**
 * aaron/plan-poll.ts — notice an approved plan with work left, and hand it to
 * the work-plan skill.
 *
 * There is no way for the browser to reach a shell agent directly, and there
 * should not be: an endpoint that shells out would be arbitrary code execution
 * driven by an LLM in a tab. So the handoff is a *pull*. Approving a plan on
 * your phone writes a record; this timer notices it and starts the work.
 *
 * It runs the same `work-plan` skill you would invoke by hand — the autonomous
 * path and the interactive path are the same path, so there is one set of rules
 * to keep correct.
 *
 * THE LOOP GUARD IS THE WHOLE DESIGN. An agent that starts work every tick, on
 * a plan it cannot finish, is an unbounded spend loop with nobody watching. So:
 *
 *   Run only when the plan's state has CHANGED since the last attempt, and stop
 *   when an attempt changes nothing.
 *
 * The signature is the plan's revision plus its count of unfinished steps.
 * Make progress and the signature moves, so we come back for the rest. Make
 * none — everything left is blocked, or belongs to the browser, or to a person
 * — and the signature is identical, so we stop and stay stopped until something
 * external changes it. A new revision, or a step reopened in the UI, is a new
 * signature and starts us again. MAX_ATTEMPTS is a second, blunter backstop in
 * case a run oscillates between two states.
 *
 * Nothing here decides *what* to implement. That judgement lives in the skill,
 * where it can be read and argued with.
 */

const HERE = new URL(".", import.meta.url).pathname;
// Runtime state lives outside the repo: it is not source, the repo root's
// .gitignore is read-only from inside this fence, and an untracked state file
// sitting in a working tree is a thing that eventually gets committed.
const VAR = "/var/lib/aaron-plan-poll/";
const STATE = VAR + "state.json";
const LOCK = VAR + "lock";
const CLAUDE = "/root/.local/bin/claude";
const MAX_ATTEMPTS = 3;
// --dry-run reports what it would start and touches no state, so the detection
// and loop-guard logic can be checked without commissioning an agent.
const DRY = Deno.args.includes("--dry-run");

const log = (...a: unknown[]) => console.log(new Date().toISOString(), ...a);

Deno.mkdirSync(VAR, { recursive: true });   // before the lock, which lives there

type Entry = { signature: string; attempts: number; last: string };
const loadState = (): Record<string, Entry> => {
  try { return JSON.parse(Deno.readTextFileSync(STATE)); } catch { return {}; }
};
const saveState = (s: Record<string, Entry>) => Deno.writeTextFileSync(STATE, JSON.stringify(s, null, 2));

// Overlapping runs would have two agents editing the same files with the same
// plan open. One at a time, and a stale lock from a killed run is not fatal.
function lock(): boolean {
  try {
    Deno.writeTextFileSync(LOCK, String(Deno.pid), { createNew: true });
    return true;
  } catch {
    try {
      const age = Date.now() - Deno.statSync(LOCK).mtime!.getTime();
      if (age > 60 * 60 * 1000) { log("clearing stale lock"); Deno.removeSync(LOCK); return lock(); }
    } catch { /* vanished under us; next tick tries again */ }
    return false;
  }
}
const unlock = () => { try { Deno.removeSync(LOCK); } catch { /* already gone */ } };

async function pending() {
  const cmd = new Deno.Command("/root/.deno/bin/deno", {
    args: ["run", "-A", "--unstable-kv", HERE + "plan-kv.ts", "pending", "--json"],
    stdout: "piped", stderr: "piped",
  });
  const { code, stdout } = await cmd.output();
  if (code !== 0) return [];                       // exit 1 = nothing pending
  try { return JSON.parse(new TextDecoder().decode(stdout)); } catch { return []; }
}

if (!lock()) { log("another run is in progress — skipping"); Deno.exit(0); }

try {
  const plans = await pending();
  if (!plans.length) { log("nothing pending"); Deno.exit(0); }

  const state = loadState();

  for (const p of plans) {
    const key = `${p.slug}@${p.revision}`;
    const signature = `open:${p.open}`;
    const seen = state[key];

    if (seen?.signature === signature) {
      log(`${key} unchanged since last attempt (${signature}) — nothing new to do`);
      continue;
    }
    if (seen && seen.attempts >= MAX_ATTEMPTS) {
      log(`${key} hit MAX_ATTEMPTS (${MAX_ATTEMPTS}) — leaving it alone until the revision changes`);
      continue;
    }

    const attempts = (seen?.attempts ?? 0) + 1;
    if (DRY) {
      log(`WOULD work ${p.slug} (rev ${p.revision}, ${p.open} step(s) open, attempt ${attempts})`);
      for (const s of p.open_steps ?? []) log(`    ${s.n}. [${s.status}] ${s.title}`);
      continue;
    }

    // Recorded BEFORE the run: if the run dies, this attempt still counts, and
    // an unchanged signature afterwards is what stops us.
    state[key] = { signature, attempts, last: new Date().toISOString() };
    saveState(state);

    log(`working ${p.slug} (rev ${p.revision}, ${p.open} step(s) open, attempt ${attempts})`);

    // Same skill a person would invoke by hand. The systemd unit applies the
    // same read-only fence as the interactive agent, so skipping permission
    // prompts here does not widen what this process can reach — the kernel
    // does, not a prompt.
    const run = new Deno.Command(CLAUDE, {
      args: [
        "-p", `/work-plan ${p.slug}`,
        "--dangerously-skip-permissions",
        "--output-format", "text",
      ],
      cwd: HERE,
      env: { ...Deno.env.toObject(), HOME: "/root" },
      stdout: "piped", stderr: "piped",
    });
    const { code, stdout, stderr } = await run.output();
    const out = new TextDecoder().decode(stdout).trim();
    const err = new TextDecoder().decode(stderr).trim();
    log(`${p.slug} finished with exit ${code}`);
    if (out) log("--- agent output ---\n" + out);
    if (err) log("--- stderr ---\n" + err);
  }
} finally {
  unlock();
}
