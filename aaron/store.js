/* aaron/store.js — localStorage data layer, sync infrastructure, and
   skill / plan / memory execution.

   No DOM or network access beyond the fetch calls required for server sync.
   All UI callbacks are injected at startup via STORES.<kind>.render and
   configureSyncable, keeping this module free of UI dependencies. */

/* ---------------------------------------------------------------- keys --- */

export const SKILL_STORE  = "aaron.skills";
export const PLAN_STORE   = "aaron.plans";
export const MEM_STORE    = "aaron.memory";
export const USAGE_STORE  = "aaron.usage";

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

/* --------------------------------------------------------------- memory --- */

export const loadMemory = () => { try { return JSON.parse(localStorage.getItem(MEM_STORE)) ?? {}; } catch { return {}; } };

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
};

export const load = (kind) => { try { return JSON.parse(localStorage.getItem(STORES[kind].key)) ?? {}; } catch { return {}; } };
export const put  = (kind, recs) => { localStorage.setItem(STORES[kind].key, JSON.stringify(recs)); STORES[kind].render(); };

export const loadSkills = () => load("skills");
export const putSkills  = (s) => put("skills", s);
export const loadPlans  = () => load("plans");
export const putPlans   = (p) => put("plans", p);

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

export async function syncStore(kind) {
  if (!_syncable()) return;
  const store = STORES[kind];
  let remote;
  try {
    const r = await fetch(store.path, { credentials: "include" });
    if (!r.ok) return;
    remote = (await r.json())[kind] ?? {};
  } catch { return; }

  const local = load(kind);
  const graves = loadGraves(kind);
  const merged = {};
  const toPush = [];
  const toDelete = [];

  for (const id of new Set([...Object.keys(local), ...Object.keys(remote)])) {
    const l = local[id], r = remote[id];

    if (!r) { merged[id] = l; toPush.push(id); continue; }   // local-only → upload
    if (!l) {
      // We deleted it here and the DELETE never landed — finish the job
      // rather than adopting it back. Only when our delete is the newer fact.
      if (graves[id] && newer(graves[id], r.updated)) { toDelete.push(id); continue; }
      if (!r.deleted) merged[id] = r;                        // remote-only → adopt
      continue;
    }

    if (r.deleted) { if (newer(l.updated, r.updated)) { merged[id] = l; toPush.push(id); } continue; }

    // Both sides real: newest edit wins, plus whatever the kind refuses to lose.
    const win = newer(l.updated, r.updated) ? l : r;
    merged[id] = store.merge(l, r, win);
    if (win === l || store.ahead(merged[id], r)) toPush.push(id);
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
}

export const syncAll = () => Promise.all(Object.keys(STORES).map(syncStore));
