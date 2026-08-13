/* aaron/baton.js — surviving a page reload.

   The transcript is a plain in-memory array. A reload wipes it, which means
   Aaron cannot do anything that requires one: reloading to pick up a change it
   just made to the page, clearing a wedged DOM, or coming back after the tab
   was evicted. A *baton* is the handoff it leaves behind — what it was doing
   and what to do next — which the page finds on load and hands straight back
   to the loop as a user message.

   Only the baton survives. The conversation does not, and the tool description
   says so plainly: everything Aaron does not write down is gone. That is the
   deliberate shape — a handoff you have to actually write is a handoff worth
   reading, and persisting a whole transcript through localStorage would mean
   round-tripping thinking-block signatures under a 5MB cap.

   Device-local on purpose, and NOT one of the synced STORES: a baton that
   followed you to another device would resume a task on a tab that never
   started it.

   No DOM and no network. The page decides how to show a baton; this module
   decides only what a baton is and when one may fire.                        */

export const BATON_STORE = "aaron.baton";

/* Two guards, both load-bearing, because a baton that fires unconditionally is
   an agent loop that can restart itself forever: write baton → reload →
   continuation writes another → reload, spending money with nobody watching.

   - The chain is capped. Each baton carries the generation it belongs to and
     refuses to extend past the cap, so a task that is not converging stops and
     says so instead of looping.
   - A baton goes stale. Close the tab, come back on Monday, and the page must
     not silently resume a task you have forgotten about. Past this age it is
     offered, not taken. */
export const BATON_MAX_CHAIN = 5;
export const BATON_FRESH_MS = 15 * 60 * 1000;

/* How many reloads deep the current page load is. Set once at startup from the
   baton being consumed, so the next baton written during this run extends the
   same chain rather than starting a fresh one at zero. */
let generation = 0;
export const batonGeneration = () => generation;
export const setBatonGeneration = (n) => { generation = Number(n) || 0; };

/* Set when a reload has been requested and not yet happened. The agent loop
   polls this after each tool call: the tool_result would otherwise go out on a
   request the page is about to destroy, and the baton already carries anything
   worth keeping. */
let pending = null;
export const pendingReload = () => pending;

export const loadBaton = () => {
  try { return JSON.parse(localStorage.getItem(BATON_STORE)); } catch { return null; }
};

export const dropBaton = () => localStorage.removeItem(BATON_STORE);

/* Writes the baton and arms the reload. Throws rather than writes when the
   chain is at its cap — the model gets the refusal as a tool error, with the
   context to explain what is stuck, which is the useful outcome. */
export function writeBaton({ note, reason }) {
  const next = generation + 1;
  if (next > BATON_MAX_CHAIN) {
    throw new Error(
      `refusing to reload: this would be reload ${next} in a row and the chain caps at ${BATON_MAX_CHAIN}. ` +
      `Something is not converging. Stop and say what is stuck instead of reloading again.`);
  }
  if (!String(note ?? "").trim()) throw new Error("a baton with no note is a reload that loses the task — write the handoff");

  const rec = { note, reason: reason ?? "", generation: next, written: new Date().toISOString() };
  localStorage.setItem(BATON_STORE, JSON.stringify(rec));
  pending = rec;
  return rec;
}

/* What the resumed page sends back into the loop. The framing matters: the
   model has to know its memory is gone, or it will answer as though the
   conversation is still in front of it. */
export function batonMessage(b) {
  return [
    `[resumed after a page reload you requested — reload ${b.generation} of at most ${BATON_MAX_CHAIN}]`,
    b.reason ? `\nWhy you reloaded: ${b.reason}` : "",
    `\nThe note you left yourself:\n${b.note}`,
    `\nThe transcript from before the reload is gone; that note is everything that carried over. Pick up from there. If the note is not enough to continue safely, say so and ask, rather than guessing at what you meant.`,
  ].filter(Boolean).join("\n");
}

export const ageMs = (b) => {
  const t = Date.parse(b?.written ?? "");
  return Number.isFinite(t) ? Date.now() - t : NaN;
};

export function humanAge(ms) {
  if (!Number.isFinite(ms)) return "an unknown time";
  const m = Math.round(ms / 60000);
  if (m < 60) return `${m} minute${m === 1 ? "" : "s"}`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h} hour${h === 1 ? "" : "s"}`;
  return `${Math.round(h / 24)} days`;
}

/* Why this baton may not fire on its own, or null if it may. Every reason
   still leaves the baton resumable by hand — the person can always overrule
   the guard, they just have to be present to do it. */
export function batonBlocker(b, hasSecret) {
  if (!hasSecret) return "there is no key or session on this device yet";
  const age = ageMs(b);
  if (!Number.isFinite(age) || age > BATON_FRESH_MS) return `it was written ${humanAge(age)} ago`;
  if ((b.generation ?? 0) > BATON_MAX_CHAIN) return `the reload chain reached its limit of ${BATON_MAX_CHAIN}`;
  return null;
}
