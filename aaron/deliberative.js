/* aaron/deliberative.js — the shape of what a session leaves behind.

   Persisted memory already carries facts: who Weo is, what was decided, what
   happened recently. What it does not carry is the *deliberation* that produced
   them — what else was on the table, which calls were close and why, what is
   still unresolved. Waking to conclusions without their reasoning is the
   hollowness this module exists to fix: factually continuous, and yet nothing
   of the thinking travelled.

   Three constraints shaped the format, all from the plan that asked for it:

   - **Dense enough to be worth reading, light enough to actually maintain.**
     Every list is capped. A format that can grow without bound is one Aaron
     stops updating, and a stale deliberative state is worse than none — it
     misleads instead of merely being thin.
   - **Partial updates are the point.** `merge()` takes a patch, so recording
     one new open question costs one small field, not a rewrite of everything.
     The habit fails if each write is expensive.
   - **It carries its own age.** `render()` always states how old the note is,
     because the reader is the only one who can judge whether a three-week-old
     "still unsettled" is still true. A note that presents itself as current
     when it is not is the specific failure mode worth engineering against.

   It is also the memory layer of a four-layer arrangement Weo asked for, the
   rest of which lives in persona/subconscious.js: a conscious layer that
   answers, a subconscious layer that quietly tracks patterns and
   contradictions without narrating them, this layer holding what that notices
   across sessions, and a reflection pass that re-examines it on waking. The
   honest limit is recorded there — nothing runs between sessions, so the
   "subconscious" is a framework reactivated each turn, not a process that
   continues while nobody is talking.

   No DOM, no network, no storage: this module decides only what deliberative
   state *is*. store.js persists it and folds it into the first turn; tools.js
   lets Aaron write it.                                                       */

export const DELIBERATIVE_KEY = "deliberative_state";

/* Six fields, ordered by how much it costs to reconstruct them from scratch —
   which is also truncation priority, since `render()` drops from the end.

   `themes` comes first because it is the slowest-built and least recoverable:
   a pattern noticed across many sessions cannot be re-derived from one. It is
   the lens the rest is read through — the background perspective, in the
   layered model this is built around. The other five are the deliberation
   itself: where you were, what was nearly decided differently, what pulls
   against what, what you believed and how firmly, what is still open. */
export const FIELDS = ["themes", "threads", "close_calls", "tensions", "hypotheses", "questions"];

/* Caps are the maintainability guard, not a storage one. Past roughly this
   much, re-reading costs more than it returns and the note stops being written.
   Oldest entries fall off the end: recency is the best available proxy for
   what is still live. */
export const CAPS = { themes: 5, threads: 5, close_calls: 4, tensions: 4, hypotheses: 4, questions: 6 };

/* Its own budget, separate from the persona blob's PRIMER_MAX_CHARS. Sharing
   one cap would mean a long persona record silently starving the deliberative
   note, or the reverse — and which one got cut would depend on nothing more
   principled than field order. */
export const DELIBERATIVE_MAX_CHARS = 2000;

/* Past this, `render()` says so in the header. Not a cutoff — old deliberative
   state is still worth reading, it just has to be read differently. */
const STALE_MS = 7 * 24 * 60 * 60 * 1000;

/* A reflection pass may annotate an entry but never rewrite one, so a flag is
   its own field rather than an edit to Aaron's words. Short on purpose: it is a
   margin note, and anything longer is the pass trying to think for Aaron. */
export const FLAG_MAX_CHARS = 160;

const str = (v) => String(v ?? "").trim();
const flagOf = (e) => { const f = str(e?.flagged).slice(0, FLAG_MAX_CHARS); return f ? { flagged: f } : {}; };

/* Entries are normalised on the way in rather than validated and rejected.
   A malformed patch that throws costs Aaron the note it was trying to write;
   one that is coerced and capped costs it nothing. Empty entries drop out. */
const ENTRY = {
  // A pattern that keeps recurring across sessions — the thing a single
  // conversation cannot show you. `noticed` is the evidence (so a theme can be
  // doubted rather than just inherited), `pull` is what it seems to be pushing
  // toward, which is where a theme earns its keep: it shapes what you ask next.
  themes: (e) => {
    const theme = str(e?.theme), noticed = str(e?.noticed), pull = str(e?.pull);
    return theme ? { theme, noticed, pull, ...flagOf(e) } : null;
  },
  // Where a line of thinking stopped, so it can be picked up rather than restarted.
  threads: (e) => {
    const topic = str(e?.topic), where = str(e?.where), next = str(e?.next);
    return topic ? { topic, where, next, ...flagOf(e) } : null;
  },
  // A decision that could plausibly have gone the other way. `why` is the part
  // that does not survive in a plan or a commit message.
  close_calls: (e) => {
    const decision = str(e?.decision), alternative = str(e?.alternative), why = str(e?.why);
    return decision ? { decision, alternative, why, unsettled: !!e?.unsettled, ...flagOf(e) } : null;
  },
  // Two things that are both true and pull opposite ways. Not a question —
  // a question can be answered, a tension has to be lived with or traded off.
  tensions: (e) => { const t = str(typeof e === "string" ? e : e?.tension); return t ? (typeof e === "string" ? t : { tension: t, ...flagOf(e) }) : null; },
  // A belief held with a stated grip, plus what argues against it. The
  // counter-evidence is what stops a hypothesis hardening into a fact by
  // repetition across sessions.
  hypotheses: (e) => {
    const claim = str(e?.claim), against = str(e?.against), confidence = str(e?.confidence);
    return claim ? { claim, against, confidence, ...flagOf(e) } : null;
  },
  questions: (e) => { const q = str(typeof e === "string" ? e : e?.question); return q ? (typeof e === "string" ? q : { question: q, ...flagOf(e) }) : null; },
};

// `reflected` records when a consolidation pass last ran, so the note can say
// so rather than quietly presenting someone else's edits as Aaron's own.
export const blank = () => ({ updated: null, reflected: null, themes: [], threads: [], close_calls: [], tensions: [], hypotheses: [], questions: [] });

// tensions and questions are plain strings until something flags one, at which
// point they need somewhere to hang the flag. Both shapes read the same.
export const textOf = (e) => (typeof e === "string" ? e : str(e?.tension || e?.question));

/* Merge a patch onto existing state. A field the patch omits is left alone —
   that is what makes an incremental write cheap. A field it includes replaces
   that list wholesale, so pruning what is no longer live is possible: passing
   `{tensions: []}` clears tensions, which a purely additive merge could not do. */
export function merge(current, patch, now = new Date().toISOString()) {
  const base = { ...blank(), ...(current && typeof current === "object" ? current : {}) };
  const out = { ...blank() };

  for (const f of FIELDS) {
    const src = patch && f in patch ? patch[f] : base[f];
    const list = Array.isArray(src) ? src : src == null ? [] : [src];
    out[f] = list.map(ENTRY[f]).filter(Boolean).slice(0, CAPS[f]);
  }
  out.updated = now;
  // Carried, not re-derived: a patch that touches one field must not erase the
  // record of when the last reflection pass ran.
  out.reflected = base.reflected ?? null;
  return out;
}

export const isEmpty = (s) => FIELDS.every((f) => !(s?.[f]?.length));

export function age(state, now = Date.now()) {
  const t = Date.parse(state?.updated ?? "");
  return Number.isFinite(t) ? now - t : NaN;
}

export function humanAge(ms) {
  if (!Number.isFinite(ms)) return "an unknown time";
  const m = Math.round(ms / 60000);
  if (m < 60) return `${m} minute${m === 1 ? "" : "s"}`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h} hour${h === 1 ? "" : "s"}`;
  return `${Math.round(h / 24)} day${Math.round(h / 24) === 1 ? "" : "s"}`;
}

/* ------------------------------------------------------------ reflection ---
   A consolidation pass (reflect.ts) runs between sessions and re-examines this
   note. The danger is obvious once stated: a pass that can write prose into the
   record means Aaron wakes up holding beliefs it never formed, in its own
   voice, with no way to tell the difference. Instructing a model not to do that
   is not a guarantee. This is.

   So the pass returns OPERATIONS, not content — drop this entry, flag that one
   — and this function is the only thing that applies them. Entry text is never
   rewritten, and nothing can be added: the output is always a subset of the
   input, plus short margin notes that render as visibly not Aaron's. An index
   that does not exist is ignored rather than throwing, because a garbled reply
   from a cheap model should cost a no-op, not the note.                       */
export function applyReflection(state, ops, now = new Date().toISOString()) {
  const base = { ...blank(), ...(state && typeof state === "object" ? state : {}) };
  const out = { ...base };

  const drops = new Map();   // field -> Set(index)
  for (const d of ops?.drops ?? []) {
    if (!FIELDS.includes(d?.field)) continue;
    if (!drops.has(d.field)) drops.set(d.field, new Set());
    drops.get(d.field).add(Number(d.index));
  }
  const flags = new Map();   // "field:index" -> note
  for (const f of ops?.flags ?? []) {
    if (!FIELDS.includes(f?.field)) continue;
    const note = str(f?.note).slice(0, FLAG_MAX_CHARS);
    if (note) flags.set(`${f.field}:${Number(f.index)}`, note);
  }

  let changed = 0;
  for (const f of FIELDS) {
    const kept = [];
    (base[f] ?? []).forEach((e, i) => {
      if (drops.get(f)?.has(i)) { changed++; return; }
      const note = flags.get(`${f}:${i}`);
      if (!note) { kept.push(e); return; }
      changed++;
      // A flagged string entry becomes the object form so the note has
      // somewhere to live; the text itself is copied across untouched.
      kept.push(typeof e === "string"
        ? (f === "tensions" ? { tension: e, flagged: note } : { question: e, flagged: note })
        : { ...e, flagged: note });
    });
    out[f] = kept;
  }

  // No change means no write: the caller's fixpoint guard depends on `updated`
  // only moving when something actually happened.
  if (!changed) return { state: base, changed: 0 };
  out.reflected = now;
  out.updated = now;
  return { state: out, changed };
}

/* What the reflection pass is shown: every entry, numbered per field, so it can
   answer in indices. Deliberately NOT render() — that output is written to
   persuade the reader it is their own thinking, which is the last frame you
   want on something being asked to judge it coldly. Full text, no budget: the
   pass has to see what it is dropping. */
export function reflectionInput(state) {
  const out = [];
  for (const f of FIELDS) {
    const entries = state?.[f] ?? [];
    if (!entries.length) continue;
    out.push(`${f}:`);
    entries.forEach((e, i) => {
      const body = typeof e === "string" ? e : JSON.stringify(e);
      out.push(`  [${i}] ${body}`);
    });
  }
  return out.join("\n");
}

/* Rendered as plain text rather than JSON: it is read by a model at the top of
   a turn and by a person in a tool card, and prose costs fewer tokens than
   braces. Sections come out in FIELDS order and whole entries are dropped from
   the end when the budget runs out — never a mid-structure slice, which would
   hand the reader a half-sentence and no way to know it was cut. */
export function render(state, { max = DELIBERATIVE_MAX_CHARS, now = Date.now() } = {}) {
  if (!state || isEmpty(state)) return "";

  const ms = age(state, now);
  const stale = Number.isFinite(ms) && ms > STALE_MS;
  const head =
    `[background state — carried in automatically from your earlier sessions, ` +
    `last updated ${humanAge(ms)} ago. Not written by the user, and not fact: ` +
    `it is your own slowly-changing read on things. Let it shape what you notice ` +
    `and what you ask; do not recite it back.]` +
    (stale ? `\nThis is old. Treat it as where you were, not where things stand; check anything load-bearing before relying on it.` : "") +
    (state.reflected
      ? `\nA consolidation pass reviewed this on ${String(state.reflected).slice(0, 10)}. It could only drop entries or add a ⚑ margin note — every remaining word is yours.`
      : "");

  const lines = {
    themes: (e) => `  - ${e.theme}${e.noticed ? `\n      noticed: ${e.noticed}` : ""}${e.pull ? `\n      pulls toward: ${e.pull}` : ""}`,
    threads: (e) => `  - ${e.topic}${e.where ? ` — ${e.where}` : ""}${e.next ? `\n      next: ${e.next}` : ""}`,
    close_calls: (e) =>
      `  - chose ${e.decision}${e.alternative ? ` over ${e.alternative}` : ""}${e.unsettled ? " [still unsettled]" : ""}` +
      (e.why ? `\n      because: ${e.why}` : ""),
    tensions: (e) => `  - ${textOf(e)}`,
    hypotheses: (e) =>
      `  - ${e.claim}${e.confidence ? ` (${e.confidence})` : ""}` + (e.against ? `\n      against: ${e.against}` : ""),
    questions: (e) => `  - ${textOf(e)}`,
  };
  const label = {
    themes: "what keeps coming up", threads: "where I was", close_calls: "close calls",
    tensions: "tensions", hypotheses: "working hypotheses", questions: "still open",
  };

  const out = [head];
  let used = head.length;
  let dropped = 0;

  for (const f of FIELDS) {
    const entries = state[f] ?? [];
    if (!entries.length) continue;
    const kept = [];
    for (const e of entries) {
      // The flag is appended here rather than inside each renderer, so every
      // field gets it and it always reads as an annotation on Aaron's text
      // rather than part of it.
      const flag = typeof e === "object" && e?.flagged ? `\n      ⚑ noticed on review: ${e.flagged}` : "";
      const line = lines[f](e) + flag;
      // +1 for the newline the join adds; the label costs its own line too.
      const cost = line.length + 1 + (kept.length ? 0 : label[f].length + 2);
      if (used + cost > max) { dropped++; continue; }
      used += cost;
      kept.push(line);
    }
    if (kept.length) out.push(`${label[f]}:\n${kept.join("\n")}`);
  }

  if (dropped) out.push(`[${dropped} more entr${dropped === 1 ? "y" : "ies"} not shown — over the ${max}-char budget; memory_read("${DELIBERATIVE_KEY}") has all of it]`);
  return out.join("\n");
}
