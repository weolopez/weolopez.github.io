/* aaron/store.js — localStorage data layer, sync infrastructure, and
   skill / plan / memory execution.

   No DOM or network access beyond the fetch calls required for server sync.
   All UI callbacks are injected at startup via STORES.<kind>.render and
   configureSyncable, keeping this module free of UI dependencies. */

import { DELIBERATIVE_KEY, render as renderDeliberative } from "./deliberative.js";

/* ---------------------------------------------------------------- keys --- */

export const SKILL_STORE   = "aaron.skills";
export const PLAN_STORE    = "aaron.plans";
export const PERSONA_STORE = "aaron.persona";
export const DELIB_STORE   = "aaron.deliberative";
export const MEM_STORE     = "aaron.memory";
export const USAGE_STORE   = "aaron.usage";

// The persona store holds exactly one record. A fixed id keeps it a single
// document across devices — there is one identity, not a collection of them.
export const IDENTITY_ID = "identity";

// Same reasoning for the background note: one running read on things, not a
// collection of them.
export const DELIB_ID = "state";

/* ------------------------------------------------------------- utilities -- */

export const slug   = (s) => String(s).trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
export const fmt    = (v) => v === undefined ? "undefined" : typeof v === "string" ? v : (JSON.stringify(v, null, 2) ?? String(v));
export const newer  = (a, b) => String(a ?? "") > String(b ?? "");

/* --------------------------------------------------------------- usage ---- */

export const blankUsage = () => ({ since: new Date().toISOString(), requests: 0, cost: 0, models: {} });
export const loadUsage  = () => { try { return JSON.parse(localStorage.getItem(USAGE_STORE)) ?? blankUsage(); } catch { return blankUsage(); } };

/* ----------------------------------------------------------- skill exec --- */

export const AsyncFn = Object.getPrototypeOf(async function () {}).constructor;

// Compiled fresh on every call: editing a skill takes effect immediately,
// and nothing can capture page state in a closure between runs.
export const compile = (code) => new AsyncFn("input", "skill", '"use strict";\n' + code);

export async function runSkill(name, input, depth = 0) {
  if (depth > 5) throw new Error("skill recursion depth exceeded (max 5)");
  const skills = loadSkills();
  const s = skills[slug(name)];
  if (!s) throw new Error(`no skill named "${name}" — find one with skill_search or write one with skill_save`);
  const out = await compile(s.code)(input ?? {}, (n, i) => runSkill(n, i, depth + 1));
  s.runs = (s.runs ?? 0) + 1;
  s.last_run = new Date().toISOString();
  putSkills(skills);
  return out;
}

export function searchSkills(query, limit = 8) {
  const terms = String(query ?? "").toLowerCase().match(/[a-z0-9.%]+/g) ?? [];
  return Object.values(loadSkills())
    .map((s) => {
      const hay = [s.name, (s.tags ?? []).join(" "), s.description ?? "", s.code ?? ""].map((x) => x.toLowerCase());
      const weights = [5, 4, 2, 1];
      let score = 0;
      for (const t of terms) hay.forEach((h, i) => { if (h.includes(t)) score += weights[i]; });
      return { s, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.s.name.localeCompare(b.s.name))
    .slice(0, limit);
}

export const brief = (s) => ({ name: s.name, description: s.description, tags: s.tags, example: s.example, runs: s.runs ?? 0 });

/* --------------------------------------------------------------- plans ---- */

export const STEP_STATES = ["todo", "doing", "done", "blocked"];
export const STEP_MARK   = { todo: "[ ]", doing: "[~]", done: "[x]", blocked: "[!]" };
export const doneCount   = (p) => (p.steps ?? []).filter((s) => s.status === "done").length;

// Plain text, because this is what goes back to the model as a tool result and
// what a person reads in the tool card.
export function planText(p) {
  const steps = (p.steps ?? []).map((s, i) =>
    `${String(i + 1).padStart(2)}. ${STEP_MARK[s.status] ?? "[ ]"} ${s.title}` +
    (s.detail ? `\n      ${s.detail}` : "") +
    (s.note ? `\n      note: ${s.note}` : ""));
  const list = (label, items) => items?.length ? `\n${label}:\n` + items.map((x) => `  - ${x}`).join("\n") : "";
  return [
    `# ${p.title}`,
    `status: ${p.status.toUpperCase()}${p.status === "approved" ? ` (approved ${p.approved_at})` : ""} · revision ${p.revision} · ${doneCount(p)}/${(p.steps ?? []).length} steps done`,
    ``,
    `goal: ${p.goal}`,
    p.context ? `\ncontext:\n${p.context}` : "",
    ``,
    `steps:`,
    steps.join("\n"),
    list("risks", p.risks),
    list("open questions", p.open_questions),
  ].filter((x) => x !== "").join("\n");
}

// The one write only a person can make. `updated` moves too, so approving on
// one device wins the next merge against a device that only read the plan.
export function setApproval(id, approved) {
  const plans = loadPlans();
  const p = plans[id];
  if (!p) return;
  const now = new Date().toISOString();
  p.status = approved ? "approved" : "draft";
  p.approved_at = approved ? now : null;
  p.updated = now;
  putPlans(plans);
  push("plans", id, p);
}

/* --------------------------------------------------------------- memory ---
   memory_read/memory_write (tools.js) go through `memoryBackend`, not
   localStorage directly. This is the seam from plan step 4
   (persona-memory-system-for-aaron): {get, set, list, contextFor} is the
   contract, localStorageBackend below is today's exact behavior wrapped
   rather than changed, and a future backend — IndexedDB, tiered,
   embeddings-backed — is just another object satisfying that contract, swapped
   in with setMemoryBackend(). No tool, and no caller of memoryBackend, needs
   to change when it does. (get/set/list shipped in step 4; contextFor is
   step 5 — the contract grew with the plan rather than being guessed upfront.) */

export const loadMemory = () => { try { return JSON.parse(localStorage.getItem(MEM_STORE)) ?? {}; } catch { return {}; } };

// Step 5's cost guard, verbatim from the plan: "Keep the primer small or it
// is a per-request cost regression." recent_events is capped at 15 by the
// persona schema itself (step 1) and step 8 exists to compress it further,
// but neither has been exercised yet — this is the independent backstop so an
// as-yet-uncompressed record can't silently inflate every request's cost.
const PRIMER_MAX_CHARS = 3000;

export const localStorageBackend = {
  get(key) {
    const mem = loadMemory();
    return key in mem ? mem[key] : undefined;
  },
  set(key, value) {
    const mem = loadMemory();
    mem[key] = value;
    localStorage.setItem(MEM_STORE, JSON.stringify(mem));
  },
  list() {
    return loadMemory();
  },
  // Folded into the first turn of a session by run() (index.html) — code, not
  // instruction, so it happens whether or not the model remembers the prompt's
  // "# Continuity" section. `userText` is accepted for interface parity with a
  // future retrieval-based backend (episodic search over the query) but this
  // flat-file version returns the same small blob regardless of what's asked.
  // No persona record yet (a install with nothing written) means nothing to
  // inject — an absent key is a real "no context", not folded into an empty
  // JSON object that would just spend tokens saying nothing.
  // Two blocks, budgeted separately and either one may be absent. The persona
  // record is settled fact; the deliberative note is Aaron's own unfinished
  // read on things. Sharing one cap would mean a long persona record silently
  // starving the note (or the reverse), with field order deciding which — so
  // each keeps its own budget and neither can crowd the other out.
  contextFor(_userText) {
    const mem = loadMemory();
    const parts = [];

    const persona = mem.persona;
    if (persona !== undefined) {
      let json = JSON.stringify(persona);
      if (json.length > PRIMER_MAX_CHARS) {
        json = json.slice(0, PRIMER_MAX_CHARS) + `…[truncated, ${json.length} chars total — see memory_read("persona") for the rest]`;
      }
      parts.push(`[persisted memory — read automatically at the start of this session, not written by the user]\n${json}\n[/persisted memory]`);
    }

    // The wake-up read is code, deliberately, for the same reason the persona
    // primer is: a prompt section telling Aaron to go and read its own note is
    // an instruction it may not follow, and the one session it forgets is the
    // session the continuity was for. renderDeliberative returns "" when there
    // is nothing worth carrying, so an empty note costs no tokens.
    const del = renderDeliberative(loadDeliberativeState());
    if (del) parts.push(del);

    return parts.join("\n\n");
  },
};

// A `let` export is a live binding — every importer's `memoryBackend.get(...)`
// sees the current value automatically. External code cannot assign to an
// imported binding directly, though, so swapping backends goes through this
// setter rather than `import { memoryBackend } from ...; memoryBackend = x`.
export let memoryBackend = localStorageBackend;
export const setMemoryBackend = (backend) => { memoryBackend = backend; };

/* ------------------------------------------------------- synced stores ----
   Skills and plans share one sync implementation rather than two copies that
   drift. localStorage is the working copy; the server is a per-account mirror.

   Render callbacks default to no-ops. The application sets them after the
   rendering functions are defined:
     STORES.skills.render = renderSkills;
     STORES.plans.render  = renderPlans;                                    */

export const STORES = {
  skills: {
    key: SKILL_STORE, graves: "aaron.skillGraves", path: "/aaron/api/skills",
    render: () => {},
    // Usage counters take the high-water mark, so simply *running* a skill on
    // one device can never roll back an edit made on another.
    merge: (l, r, win) => ({
      ...win,
      runs: Math.max(l.runs ?? 0, r.runs ?? 0),
      last_run: newer(l.last_run, r.last_run) ? l.last_run : r.last_run,
    }),
    // Push even when the remote copy won the merge, if our counters were ahead.
    ahead: (m, r) => (m.runs ?? 0) !== (r.runs ?? 0),
  },
  plans: {
    key: PLAN_STORE, graves: "aaron.planGraves", path: "/aaron/api/plans",
    render: () => {},
    // A plan is one document: the newest edit is the whole answer.
    merge: (l, r, win) => win,
    ahead: () => false,
  },
  // Aaron's own identity text. Same machinery as the other two, and
  // deliberately the skills model rather than the plans model: there is no
  // approval field anywhere in this record's life cycle. See CLAUDE.md,
  // "Self-editable identity" — this is the one write with no gate, by explicit
  // grant, and the asymmetry is the feature.
  persona: {
    key: PERSONA_STORE, graves: "aaron.personaGraves", path: "/aaron/api/persona",
    render: () => {},
    // One document, like a plan: the newest edit is the whole answer.
    merge: (l, r, win) => win,
    ahead: () => false,
  },
  // The background note. It started inside `aaron.memory`, which is the one
  // store that never syncs — so the continuity it exists to provide lasted
  // exactly as long as one device's localStorage, and iOS evicts that for
  // sites you have not opened in a while. Making it a store of its own is what
  // buys durability and cross-device carry; a flat key/value map could not use
  // syncStore at all, since every record has to carry its own `updated`.
  deliberative: {
    key: DELIB_STORE, graves: "aaron.deliberativeGraves", path: "/aaron/api/deliberative",
    render: () => {},
    // One document, like the identity: newest wins, and the older self-edit is
    // discarded. Same trade the persona store already makes.
    merge: (l, r, win) => win,
    ahead: () => false,
  },
};

export const load = (kind) => { try { return JSON.parse(localStorage.getItem(STORES[kind].key)) ?? {}; } catch { return {}; } };
export const put  = (kind, recs) => { localStorage.setItem(STORES[kind].key, JSON.stringify(recs)); STORES[kind].render(); };

export const loadSkills = () => load("skills");
export const putSkills  = (s) => put("skills", s);
export const loadPlans  = () => load("plans");
export const putPlans   = (p) => put("plans", p);

/* ------------------------------------------------------------- identity ---
   Read synchronously by system.js when assembling the system prompt, so it
   must never throw or block: a missing/corrupt record returns null and the
   caller falls back to the static persona/identity.js constant. */

export const loadIdentity = () => load("persona")[IDENTITY_ID] ?? null;

// No approval check here, and there is deliberately nowhere to add one: this
// is Aaron writing its own identity, granted explicitly by Weo.
export function putIdentity(text) {
  const recs = load("persona");
  const prev = recs[IDENTITY_ID];
  const now = new Date().toISOString();
  recs[IDENTITY_ID] = {
    id: IDENTITY_ID,
    text: String(text),
    revision: (prev?.revision ?? 0) + 1,
    created: prev?.created ?? now,
    updated: now,
  };
  clearGrave("persona", IDENTITY_ID);
  put("persona", recs);
  return recs[IDENTITY_ID];
}

/* -------------------------------------------------- deliberative state ----
   Read on every first turn by contextFor, written by the deliberative_update
   tool. Kept in its own synced store rather than inside `aaron.memory`: memory
   never mirrors to the server, and a background note that dies with one
   device's localStorage cannot do the job it exists for.

   The legacy fallback reads the old `aaron.memory.deliberative_state` location
   once, so a note written before the move is adopted rather than silently
   dropped. It is a read-only fallback — the first write lands in the new store
   and the old copy stops being consulted. */

export function loadDeliberativeState() {
  // Any record in the new store settles it — including a tombstone. Falling
  // back past a delete would undo it on every device still holding the old
  // pre-move copy, which is the same resurrection the grave files prevent
  // elsewhere. The legacy read is for "never migrated", not "deleted".
  const rec = load("deliberative")[DELIB_ID];
  if (rec) return rec.deleted ? null : rec;
  const legacy = loadMemory()[DELIBERATIVE_KEY];
  return legacy && typeof legacy === "object" ? legacy : null;
}

export function putDeliberativeState(state) {
  const recs = load("deliberative");
  const prev = recs[DELIB_ID];
  recs[DELIB_ID] = { ...state, id: DELIB_ID, created: prev?.created ?? state.updated };
  clearGrave("deliberative", DELIB_ID);
  put("deliberative", recs);
  return recs[DELIB_ID];
}

/* ----------------------------------------------------------- tombstones --- */

const GRAVE_TTL_MS = 90 * 24 * 60 * 60 * 1000;

export const loadGraves = (kind) => { try { return JSON.parse(localStorage.getItem(STORES[kind].graves)) ?? {}; } catch { return {}; } };
const putGraves = (kind, g) => localStorage.setItem(STORES[kind].graves, JSON.stringify(g));

export function markDeleted(kind, id) {
  const g = loadGraves(kind);
  g[id] = new Date().toISOString();
  putGraves(kind, g);
}

// Re-creating a record must clear its grave, or the next sync would delete it.
export function clearGrave(kind, id) {
  const g = loadGraves(kind);
  if (id in g) { delete g[id]; putGraves(kind, g); }
}

/* ---------------------------------------------------------------- sync ----
   syncable is injected by the application after transport and auth are known,
   keeping this module free of UI state:
     configureSyncable(() => transport.mode === "proxy" && me.authenticated); */

let _syncable = () => false;
export const configureSyncable = (fn) => { _syncable = fn; };

export async function push(kind, id, rec) {
  if (!_syncable()) return;
  try {
    await fetch(STORES[kind].path + "/" + encodeURIComponent(id), {
      method: "PUT", credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(rec),
    });
  } catch { /* offline: the local copy stands, next syncStore() reconciles */ }
}

export async function pushDelete(kind, id) {
  if (!_syncable()) return;
  try {
    await fetch(STORES[kind].path + "/" + encodeURIComponent(id), {
      method: "DELETE", credentials: "include",
    });
  } catch { /* same — reconciled on the next sync */ }
}

// The two automatic callers (sign-in, visibilitychange) always ignored the
// return value and still may — a background reconcile that failed silently
// is correct, nothing was waiting on it. A manual "Sync" button is someone
// waiting on it, so it gets a real answer instead of a fire-and-forget.
export async function syncStore(kind) {
  if (!_syncable()) return { ok: false, reason: "not signed in" };
  const store = STORES[kind];
  let remote;
  try {
    const r = await fetch(store.path, { credentials: "include" });
    if (!r.ok) return { ok: false, reason: `server said ${r.status}` };
    remote = (await r.json())[kind] ?? {};
  } catch { return { ok: false, reason: "offline, or the server didn't respond" }; }

  const local = load(kind);
  const graves = loadGraves(kind);
  const merged = {};
  const toPush = [];
  const toDelete = [];
  // Records this device didn't already have the newest copy of — what a
  // person clicking "Sync" actually wants to know arrived.
  let pulled = 0;

  for (const id of new Set([...Object.keys(local), ...Object.keys(remote)])) {
    const l = local[id], r = remote[id];

    if (!r) { merged[id] = l; toPush.push(id); continue; }   // local-only → upload
    if (!l) {
      // We deleted it here and the DELETE never landed — finish the job
      // rather than adopting it back. Only when our delete is the newer fact.
      if (graves[id] && newer(graves[id], r.updated)) { toDelete.push(id); continue; }
      if (!r.deleted) { merged[id] = r; pulled++; }          // remote-only → adopt
      continue;
    }

    if (r.deleted) {
      if (newer(l.updated, r.updated)) { merged[id] = l; toPush.push(id); }
      else pulled++;                                          // remote tombstone wins → pulled a deletion
      continue;
    }

    // Both sides real: newest edit wins, plus whatever the kind refuses to lose.
    // A tied `updated` (nothing to sync — both sides already agree) resolves
    // to r below same as before, but must NOT count as a pull: nothing new
    // arrived, so remoteNewer is checked separately rather than off `win`.
    const remoteNewer = newer(r.updated, l.updated);
    const win = newer(l.updated, r.updated) ? l : r;
    merged[id] = store.merge(l, r, win);
    if (win === l || store.ahead(merged[id], r)) toPush.push(id);
    if (remoteNewer) pulled++;
  }

  localStorage.setItem(store.key, JSON.stringify(merged));

  // Drop graves the server has already acknowledged as tombstones, and expire
  // the rest eventually — otherwise this grows forever for no benefit.
  const cutoff = new Date(Date.now() - GRAVE_TTL_MS).toISOString();
  const keep = {};
  for (const [id, at] of Object.entries(graves)) {
    if (at < cutoff) continue;
    if (remote[id]?.deleted) continue;   // server agrees it's gone
    if (merged[id]) continue;            // it came back and won
    keep[id] = at;
  }
  putGraves(kind, keep);

  store.render();
  for (const id of toPush) await push(kind, id, merged[id]);
  for (const id of toDelete) await pushDelete(kind, id);
  return { ok: true, pulled };
}

// Aggregates per-store outcomes rather than discarding them, same reasoning
// as syncStore: the automatic callers still don't look, the Sync button does.
export async function syncAll() {
  const results = await Promise.all(Object.keys(STORES).map(syncStore));
  const ok = results.every((r) => r.ok);
  return {
    ok,
    pulled: results.reduce((sum, r) => sum + (r.pulled ?? 0), 0),
    reason: ok ? undefined : results.find((r) => !r.ok)?.reason,
  };
}
