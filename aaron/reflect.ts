#!/usr/bin/env -S deno run -A --unstable-kv
/**
 * aaron/reflect.ts — the consolidation pass that runs between sessions.
 *
 * Aaron's background note (deliberative.js) is written mid-conversation and
 * never revisited from the outside. Entries go stale, the same theme gets
 * recorded three times in different words, and a question that was answered
 * two sessions ago keeps arriving at every wake-up as though it were still
 * open. Nothing of Aaron's runs between sessions to notice, so this does:
 * read the note from KV, ask a cheap model what no longer earns its place,
 * apply the answer, write it back. The browser adopts it on the next
 * `visibilitychange` — same write-back path plan-kv.ts already uses, no new
 * protocol.
 *
 * THIS IS NOT A SECOND AGENT LOOP, and the distinction is exact. One
 * non-streaming call, no tools, no multi-turn, no transcript — structurally
 * the same concession /complete already is. It also lives here rather than in
 * api.ts, so the server's passthrough guarantee is untouched: nothing in that
 * file reads a deliberative record, and that stays true.
 *
 * THE PASS CANNOT WRITE INTO THE NOTE, and that is the whole design. A
 * consolidation that could author prose would mean Aaron waking up holding
 * beliefs it never formed, in its own voice, with no way to tell which words
 * were its own. Telling a model not to do that is not a guarantee. So the
 * model answers in OPERATIONS — drop index 3, flag index 1 — and
 * applyReflection() in deliberative.js is the only thing that applies them.
 * The output is always a subset of the input plus short margin notes that
 * render as visibly not Aaron's. Removing that constraint needs the same
 * conversation the proxy and the approval gate got.
 *
 * THE LOOP GUARD, same shape as plan-poll.ts: run only when the note has
 * CHANGED since the last attempt, and stop when an attempt changes nothing.
 * The signature is the record's `updated`. A pass that drops something moves
 * it, so we come back; a pass that finds nothing to do leaves it identical, so
 * we stop and stay stopped until Aaron writes again. That fixpoint — not a
 * retry count — is what keeps an unattended timer from being a spend loop.
 *
 * Usage:
 *   reflect.ts [--dry-run] [--account <email>] [--verbose]
 */

import {
  applyReflection, reflectionInput, render, isEmpty, FIELDS, FLAG_MAX_CHARS,
} from "./deliberative.js";

// Same env name api.ts uses, so a scratch database can be pointed at for a
// real end-to-end run without touching anyone's actual note.
const DB = Deno.env.get("AARON_KV_PATH")?.trim() || new URL("./aaron.db", import.meta.url).pathname;
const VAR = "/var/lib/aaron-reflect/";
const STATE = VAR + "state.json";
const LOCK = VAR + "lock";

const MODEL = Deno.env.get("AARON_REFLECT_MODEL")?.trim() || "openai/gpt-5-nano";
const UPSTREAM = "https://openrouter.ai/api/v1/chat/completions";
// The note is capped at a few thousand chars, so a pass costs a fraction of a
// cent. This ceiling exists to bound a malformed record, not the normal case.
const MAX_INPUT_CHARS = 20_000;
const TIMEOUT_MS = 60_000;

const DRY = Deno.args.includes("--dry-run");
const VERBOSE = Deno.args.includes("--verbose");
const ONLY = (() => {
  const i = Deno.args.indexOf("--account");
  return i >= 0 ? Deno.args[i + 1] : "";
})();

const log = (...a: unknown[]) => console.log(new Date().toISOString(), ...a);

/* --- the prompt ----------------------------------------------------------
   Written to make the model an editor, not a thinker. Every instruction that
   sounds like judgement is about REMOVAL, because removal is all it can do:
   the schema has no field for new content, and applyReflection would ignore it
   if it invented one. Conservative on purpose — a pass that drops something
   still live costs Aaron real continuity, while one that leaves something
   stale costs a line of text the next pass can take.                        */
const SYSTEM = `You are reviewing an agent's private working notes between sessions. These notes are how it reconstructs what it was thinking when it starts up again.

You cannot edit or write notes. You can only:
  - DROP an entry that no longer earns its place
  - FLAG an entry with a short margin note

Drop an entry when it is: clearly resolved or finished; a duplicate of another entry in the same field (drop the less complete one, keep the fuller); or superseded by a later entry that says the same thing better.

Flag an entry when it is: directly contradicted by another entry; stated with high confidence but with no supporting evidence recorded; or resting on something that a later entry shows has changed.

Be conservative. Dropping something still live costs the agent real continuity; leaving something stale costs one line that the next pass can take instead. If nothing clearly qualifies, return empty lists — that is the correct and common answer.

Never drop an entry merely because it is uncertain, unfinished, or uncomfortable. Uncertainty is what these notes are FOR.

Two fields are held to a stricter rule, because what they store is reasoning that exists nowhere else and cannot be reconstructed once dropped:

  - close_calls: drop ONLY as a duplicate of another close_call. "The decision is resolved" is NOT a reason — every close call is resolved by definition, and the record of WHY it was close is the entire point of keeping it. unsettled:false means it was settled, not that it is disposable.
  - themes: drop ONLY as a duplicate. A theme is built from many sessions and cannot be re-derived from the one in front of you.

Reply with JSON only, no prose, no code fence:
{"drops":[{"field":"<field>","index":<n>,"why":"<short>"}],"flags":[{"field":"<field>","index":<n>,"note":"<max ${FLAG_MAX_CHARS} chars>"}]}

Valid fields: ${FIELDS.join(", ")}. Indices are the [n] shown against each entry.`;

/* --- plumbing ------------------------------------------------------------ */

Deno.mkdirSync(VAR, { recursive: true });

type Entry = { signature: string; last: string };
const loadState = (): Record<string, Entry> => {
  try { return JSON.parse(Deno.readTextFileSync(STATE)); } catch { return {}; }
};
const saveState = (s: Record<string, Entry>) => Deno.writeTextFileSync(STATE, JSON.stringify(s, null, 2));

function lock(): boolean {
  try {
    Deno.writeTextFileSync(LOCK, String(Deno.pid), { createNew: true });
    return true;
  } catch {
    try {
      const age = Date.now() - Deno.statSync(LOCK).mtime!.getTime();
      if (age > 30 * 60 * 1000) { log("clearing stale lock"); Deno.removeSync(LOCK); return lock(); }
    } catch { /* vanished under us; next tick tries again */ }
    return false;
  }
}
const unlock = () => { try { Deno.removeSync(LOCK); } catch { /* already gone */ } };

/* The same key the browser writes and api.ts stores, read directly. Secrets
   live in the same database; api.ts treats them as write-only over HTTP, which
   is a property of that interface, not of the file — anything with shell access
   to aaron.db has always been able to read them. */
async function openRouterKey(kv: Deno.Kv): Promise<string> {
  const env = Deno.env.get("OPENROUTER_API_KEY")?.trim();
  if (env) return env;
  const sub = await kv.get<string>(["aaron_secrets", "openrouter_key"]);
  if (sub.value) return sub.value;
  // Falls back to the main key ONLY when that key is already an OpenRouter one.
  // Sending an Anthropic key to OpenRouter would leak it to a third party.
  const provider = await kv.get<string>(["aaron_settings", "provider"]);
  if ((provider.value ?? Deno.env.get("AARON_PROVIDER")) === "openrouter") {
    const main = await kv.get<string>(["aaron_secrets", "llm_key"]);
    if (main.value) return main.value;
  }
  return "";
}

async function askForOperations(key: string, input: string) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(UPSTREAM, {
      method: "POST",
      signal: ctl.signal,
      headers: {
        authorization: `Bearer ${key}`,
        "content-type": "application/json",
        "http-referer": "https://aaron.weolopez.com",
        "x-title": "Aaron reflection",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "system", content: SYSTEM }, { role: "user", content: input }],
        // Reasoning tokens are billed against max_tokens and are spent BEFORE
        // any content is emitted, so a budget sized for the answer alone
        // returns finish_reason "length" and an empty string — measured on
        // gpt-5-nano: 1152 of 1200 went to reasoning and nothing came back.
        // Low effort plus real headroom; the answer itself is ~200 chars.
        max_tokens: 4000,
        reasoning: { effort: "low" },
        temperature: 0,
        response_format: { type: "json_object" },
      }),
    });
    const data = await r.json().catch(() => null);
    if (!r.ok) throw new Error(`HTTP ${r.status}: ${JSON.stringify(data)?.slice(0, 300)}`);
    const choice = data?.choices?.[0];
    const text = choice?.message?.content;
    if (typeof text !== "string" || !text.trim()) {
      // Name the actual cause. "No text" sent me looking at the wrong thing
      // once already, and this runs unattended where nobody is watching to ask.
      throw new Error(choice?.finish_reason === "length"
        ? `ran out of tokens before answering (${data?.usage?.completion_tokens_details?.reasoning_tokens ?? "?"} spent on reasoning) — raise max_tokens`
        : `empty reply (finish_reason ${choice?.finish_reason ?? "unknown"})`);
    }
    // A cheap model still occasionally fences its JSON. Strip and parse; a
    // failure here is a no-op for this account, not a crash for the rest.
    const clean = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    return { ops: JSON.parse(clean), usage: data?.usage };
  } finally {
    clearTimeout(timer);
  }
}

/* --- the pass ------------------------------------------------------------ */

if (!lock()) { log("another run is in progress — skipping"); Deno.exit(0); }

try {
  const kv = await Deno.openKv(DB);
  const key = await openRouterKey(kv);
  if (!key && !DRY) {
    log("no OpenRouter key (set openrouter_key in Account → Settings) — nothing to do");
    Deno.exit(0);
  }

  const state = loadState();
  let looked = 0, reflected = 0;

  for await (const e of kv.list<Record<string, unknown>>({ prefix: ["aaron_deliberative"] })) {
    const email = String(e.key[1]);
    if (ONLY && email !== ONLY) continue;

    const rec = e.value;
    if (!rec || rec.deleted) continue;
    if (isEmpty(rec)) { log(`${email}: note is empty — nothing to review`); continue; }
    looked++;

    // The fixpoint. `updated` moves when Aaron writes, and when a pass changes
    // something. Unchanged means the last look already saw exactly this, so
    // looking again buys nothing and costs a call.
    const signature = String(rec.updated ?? "");
    if (state[email]?.signature === signature) {
      log(`${email}: unchanged since the last pass (${signature}) — skipping`);
      continue;
    }

    const input = reflectionInput(rec).slice(0, MAX_INPUT_CHARS);
    if (VERBOSE) log(`${email}: reviewing\n${input}`);

    if (DRY) {
      log(`${email}: WOULD review ${input.length} chars against ${MODEL}`);
      continue;
    }

    let ops, usage;
    try {
      ({ ops, usage } = await askForOperations(key, input));
    } catch (err) {
      // Recorded as attempted anyway: a model that cannot parse this note will
      // not parse it on the next tick either, and retrying every five minutes
      // is the spend loop this file exists to avoid. Aaron writing again moves
      // the signature and gives it a fresh chance.
      log(`${email}: pass failed (${String((err as Error).message).slice(0, 200)}) — leaving the note untouched`);
      state[email] = { signature, last: new Date().toISOString() };
      saveState(state);
      continue;
    }

    const { state: next, changed } = applyReflection(rec, ops);
    if (!changed) {
      log(`${email}: nothing to consolidate${usage ? ` (${usage.total_tokens} tok)` : ""}`);
      state[email] = { signature, last: new Date().toISOString() };
      saveState(state);
      continue;
    }

    const dropped = (ops?.drops ?? []).length, flagged = (ops?.flags ?? []).length;

    // Compare-and-set against the version we actually reviewed. The call above
    // takes seconds, and Aaron may have written in that window — a blind set
    // would resolve as the newest `updated` and silently discard a note it
    // never saw. Losing a pass is free; losing what Aaron just wrote is not.
    const commit = await kv.atomic()
      .check(e)
      .set(["aaron_deliberative", email, String(e.key[2])], { ...rec, ...next })
      .commit();
    if (!commit.ok) {
      log(`${email}: the note changed while the pass was running — discarding this pass`);
      continue;   // no state write: the new note deserves its own look
    }
    reflected++;
    // The NEW updated, so the write we just made does not look like a change
    // Aaron made and trigger another pass on the next tick.
    state[email] = { signature: String(next.updated), last: new Date().toISOString() };
    saveState(state);

    log(`${email}: dropped ${dropped}, flagged ${flagged}${usage ? ` (${usage.total_tokens} tok)` : ""}`);
    for (const d of ops?.drops ?? []) log(`    - dropped ${d.field}[${d.index}]: ${d.why ?? ""}`);
    for (const f of ops?.flags ?? []) log(`    ⚑ flagged ${f.field}[${f.index}]: ${f.note ?? ""}`);
    if (VERBOSE) log(`${email}: note is now\n${render(next)}`);
  }

  log(`done — ${looked} note(s) looked at, ${reflected} changed`);
} finally {
  unlock();
}
