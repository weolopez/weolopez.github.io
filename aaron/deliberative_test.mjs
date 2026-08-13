/* Exercises deliberative.js directly — it has no DOM or storage dependency, so
   unlike canvas_test.mjs there is nothing to stub. Run: deno test -A deliberative_test.mjs */

import { assert, assertEquals, assertStringIncludes } from "jsr:@std/assert";
import {
  merge, render, blank, isEmpty, CAPS, FIELDS, DELIBERATIVE_MAX_CHARS, DELIBERATIVE_KEY,
} from "./deliberative.js";

const T0 = "2026-08-12T00:00:00.000Z";

/* store.js reads localStorage lazily, inside functions, so a stub installed
   before the import is enough to exercise the real primer path.

   defineProperty, not assignment: Deno ships its own `localStorage` as a getter
   on globalThis, and a plain assignment is silently ignored — the getter keeps
   winning and every read comes back empty, which reads exactly like a broken
   primer rather than a broken stub. */
const store = {};
Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
  },
});
const { memoryBackend, loadDeliberativeState, putDeliberativeState, DELIB_ID } = await import("./store.js");
const setMemory = (obj) => { store["aaron.memory"] = JSON.stringify(obj); };
const clearAll = () => { for (const k of Object.keys(store)) delete store[k]; };

Deno.test("a patch merges onto existing state without touching omitted fields", () => {
  const a = merge(blank(), { questions: ["does the primer fire?"], tensions: ["rich vs maintainable"] }, T0);
  const b = merge(a, { questions: ["and is it read?"] }, T0);

  assertEquals(b.questions, ["and is it read?"]);
  // The whole point of the incremental habit: writing one field is cheap and
  // does not silently discard the rest.
  assertEquals(b.tensions, ["rich vs maintainable"]);
});

Deno.test("an explicitly empty list clears it — pruning has to be possible", () => {
  const a = merge(blank(), { tensions: ["stale"] }, T0);
  assertEquals(merge(a, { tensions: [] }, T0).tensions, []);
});

Deno.test("lists are capped, so the note cannot grow past what gets maintained", () => {
  const many = Array.from({ length: 20 }, (_, i) => `q${i}`);
  assertEquals(merge(blank(), { questions: many }, T0).questions.length, CAPS.questions);
});

Deno.test("malformed entries are dropped, not thrown on", () => {
  const s = merge(blank(), {
    threads: [{ topic: "" }, { where: "no topic" }, { topic: "real", where: "here", next: "there" }],
    questions: ["", "   ", "kept"],
  }, T0);
  assertEquals(s.threads.length, 1);
  assertEquals(s.questions, ["kept"]);
});

Deno.test("a close call keeps the reasoning, which is the part nothing else stores", () => {
  const s = merge(blank(), {
    close_calls: [{ decision: "prompt part", alternative: "identity.js", why: "identity_update would wipe it", unsettled: true }],
  }, T0);
  const out = render(s, { now: Date.parse(T0) });
  assertStringIncludes(out, "chose prompt part over identity.js");
  assertStringIncludes(out, "still unsettled");
  assertStringIncludes(out, "because: identity_update would wipe it");
});

Deno.test("render states its own age, and says so loudly once stale", () => {
  const s = merge(blank(), { questions: ["x"] }, T0);
  const fresh = render(s, { now: Date.parse(T0) + 2 * 60 * 60 * 1000 });
  assertStringIncludes(fresh, "last updated 2 hours ago");
  assert(!fresh.includes("This is old"));

  const old = render(s, { now: Date.parse(T0) + 30 * 24 * 60 * 60 * 1000 });
  assertStringIncludes(old, "last updated 30 days ago");
  // A note that presents itself as current when it is not is the failure mode.
  assertStringIncludes(old, "This is old");
});

Deno.test("empty state renders to nothing — no tokens spent saying there is nothing", () => {
  assertEquals(render(blank()), "");
  assertEquals(render(null), "");
  assert(isEmpty(blank()));
});

Deno.test("over budget, whole entries are dropped and the cut is reported", () => {
  const long = (n) => Array.from({ length: n }, (_, i) => "q".repeat(300) + i);
  const s = merge(blank(), { questions: long(6) }, T0);
  const out = render(s, { now: Date.parse(T0) });

  assert(out.length <= DELIBERATIVE_MAX_CHARS + 200, `render was ${out.length} chars`);
  assertStringIncludes(out, "not shown");
  // Never a mid-structure slice: every rendered question is intact.
  for (const line of out.split("\n").filter((l) => l.startsWith("  - q"))) {
    assert(/^ {2}- q{300}\d+$/.test(line), `truncated mid-entry: ${line.slice(0, 40)}…`);
  }
});

Deno.test("themes survive truncation first — they are the least recoverable", () => {
  // A theme built over many sessions cannot be re-derived from one, so it must
  // outrank the in-flight deliberation when the budget is tight.
  const s = merge(blank(), {
    themes: [{ theme: "THEME-KEPT", noticed: "n".repeat(200) }],
    questions: Array.from({ length: 6 }, (_, i) => "q".repeat(400) + i),
  }, T0);
  const out = render(s, { now: Date.parse(T0) });
  assertStringIncludes(out, "THEME-KEPT");
  assertStringIncludes(out, "not shown");
});

Deno.test("the primer header disclaims itself — background, not fact, not the user's words", () => {
  const out = render(merge(blank(), { questions: ["x"] }, T0), { now: Date.parse(T0) });
  assertStringIncludes(out, "Not written by the user");
  // Told to influence, not to recite: a narrated subconscious is worse than none.
  assertStringIncludes(out, "do not recite it back");
});

Deno.test("every field survives a round trip through merge and render", () => {
  const s = merge(blank(), {
    themes: [{ theme: "Weo prefers mechanism over instruction", noticed: "contextFor, plan gates", pull: "build it in code" }],
    threads: [{ topic: "wake-up ritual", where: "prompt part written", next: "wire contextFor" }],
    close_calls: [{ decision: "own module", alternative: "inline in store.js", why: "one idea per module" }],
    tensions: ["density vs upkeep"],
    hypotheses: [{ claim: "instructions alone will not fire", against: "untested", confidence: "high" }],
    questions: ["is beforeunload worth it?"],
  }, T0);

  for (const f of FIELDS) assertEquals(s[f].length, 1, `${f} did not round trip`);
  const out = render(s, { now: Date.parse(T0) });
  for (const needle of ["mechanism over instruction", "wake-up ritual", "own module", "density vs upkeep", "instructions alone", "beforeunload"]) {
    assertStringIncludes(out, needle);
  }
});

/* --- the wake-up read, through the real store.js primer path -------------- */

Deno.test("contextFor carries the background note in — code, not an instruction", () => {
  setMemory({ [DELIBERATIVE_KEY]: merge(blank(), { questions: ["UNIQUE-OPEN-Q"] }) });
  // Nothing asked for this: the primer is folded into turn one by run(), so
  // the one session Aaron forgets to look is still a session it remembers.
  assertStringIncludes(memoryBackend.contextFor("hello"), "UNIQUE-OPEN-Q");
});

Deno.test("persona and background state are separate blocks, each budgeted", () => {
  setMemory({
    persona: { name: "Weo", note: "P".repeat(5000) },
    [DELIBERATIVE_KEY]: merge(blank(), { themes: [{ theme: "UNIQUE-THEME" }] }),
  });
  const out = memoryBackend.contextFor("hello");
  // A long persona record must not crowd out the note, or which one survived
  // would come down to field order rather than anything principled.
  assertStringIncludes(out, "persisted memory");
  assertStringIncludes(out, "UNIQUE-THEME");
  assertStringIncludes(out, "truncated");
});

Deno.test("nothing stored means nothing injected — an empty note costs no tokens", () => {
  setMemory({});
  assertEquals(memoryBackend.contextFor("hello"), "");
  setMemory({ [DELIBERATIVE_KEY]: blank() });
  assertEquals(memoryBackend.contextFor("hello"), "");
});

Deno.test("a legacy persona-only memory still primes exactly as before", () => {
  setMemory({ persona: { name: "Weo" } });
  const out = memoryBackend.contextFor("hello");
  assertStringIncludes(out, '[persisted memory');
  assert(!out.includes("background state"));
});

/* --- the synced store, and the move out of aaron.memory ------------------- */

Deno.test("the note lives in its own synced store, not in aaron.memory", () => {
  clearAll();
  putDeliberativeState(merge(blank(), { tensions: ["durable vs device-local"] }));
  // aaron.memory never mirrors to the server; a note kept there dies with one
  // device's localStorage, which is the failure this move exists to prevent.
  assert(store["aaron.deliberative"], "must write to the synced store");
  assert(!store["aaron.memory"], "must not fall back to the unsynced map");
  assertStringIncludes(memoryBackend.contextFor("hi"), "durable vs device-local");
});

Deno.test("a note written before the move is still read", () => {
  clearAll();
  setMemory({ [DELIBERATIVE_KEY]: merge(blank(), { questions: ["LEGACY-Q"] }) });
  assertStringIncludes(memoryBackend.contextFor("hi"), "LEGACY-Q");
});

Deno.test("the new store wins over the legacy copy once written", () => {
  clearAll();
  setMemory({ [DELIBERATIVE_KEY]: merge(blank(), { questions: ["LEGACY-Q"] }) });
  putDeliberativeState(merge(blank(), { questions: ["CURRENT-Q"] }));
  const out = memoryBackend.contextFor("hi");
  assertStringIncludes(out, "CURRENT-Q");
  assert(!out.includes("LEGACY-Q"), "the stale copy must not shadow the live one");
});

Deno.test("the record carries what the server mirror requires", () => {
  clearAll();
  const rec = putDeliberativeState(merge(blank(), { questions: ["q"] }));
  // syncStore merges on `updated` and the server rejects a record without one.
  assertEquals(rec.id, DELIB_ID);
  assert(typeof rec.updated === "string" && rec.updated, "needs an updated timestamp");
  assert(typeof rec.created === "string" && rec.created, "needs a created timestamp");
});

Deno.test("created survives a rewrite, updated moves", () => {
  clearAll();
  const first = putDeliberativeState(merge(blank(), { questions: ["a"] }, "2026-01-01T00:00:00.000Z"));
  const second = putDeliberativeState(merge(blank(), { questions: ["b"] }, "2026-06-01T00:00:00.000Z"));
  assertEquals(second.created, first.created);
  assertEquals(second.updated, "2026-06-01T00:00:00.000Z");
});

Deno.test("a deleted record does not resurrect through the legacy fallback", () => {
  clearAll();
  setMemory({ [DELIBERATIVE_KEY]: merge(blank(), { questions: ["LEGACY-Q"] }) });
  store["aaron.deliberative"] = JSON.stringify({ [DELIB_ID]: { deleted: true, updated: "2026-08-12T10:00:00.000Z" } });
  // A tombstone is a decision. Falling back past it would undo the delete on
  // every device that still had the old copy lying around.
  assertEquals(loadDeliberativeState(), null);
  assertEquals(memoryBackend.contextFor("hi"), "");
});

/* --- the reflection pass: what it can and cannot do ----------------------- */

const { applyReflection, reflectionInput, textOf } = await import("./deliberative.js");

const NOTE = () => merge(blank(), {
  themes: [{ theme: "theme A", noticed: "here" }, { theme: "theme B" }],
  tensions: ["tension one", "tension two"],
  questions: ["q one", "q two"],
}, T0);

Deno.test("reflection drops the entries it names and leaves the rest alone", () => {
  const { state, changed } = applyReflection(NOTE(), { drops: [{ field: "questions", index: 0 }] });
  assertEquals(changed, 1);
  assertEquals(state.questions, ["q two"]);
  assertEquals(state.tensions.length, 2, "an untouched field must not move");
});

Deno.test("a flag annotates without rewriting a single word", () => {
  const { state } = applyReflection(NOTE(), { flags: [{ field: "themes", index: 0, note: "contradicted by theme B" }] });
  assertEquals(state.themes[0].theme, "theme A", "Aaron's text is never edited");
  assertEquals(state.themes[0].noticed, "here");
  assertEquals(state.themes[0].flagged, "contradicted by theme B");
});

Deno.test("a flagged string entry keeps its text verbatim in the object form", () => {
  const { state } = applyReflection(NOTE(), { flags: [{ field: "tensions", index: 1, note: "resolved?" }] });
  assertEquals(textOf(state.tensions[1]), "tension two");
  assertEquals(state.tensions[1].flagged, "resolved?");
});

Deno.test("THE GUARANTEE: a pass cannot add content, only remove and annotate", () => {
  // Everything a hostile or confused reply might try: new entries, rewritten
  // text, a brand-new field. None of it has anywhere to land, because the only
  // thing applyReflection reads is drops and flags.
  const before = NOTE();
  const { state } = applyReflection(before, {
    drops: [], flags: [],
    themes: [{ theme: "INVENTED BY THE PASS" }],
    questions: ["ALSO INVENTED"],
    newField: ["nonsense"],
  });
  const dump = JSON.stringify(state);
  assert(!dump.includes("INVENTED"), "the pass must never originate content");
  assert(!dump.includes("nonsense"));
  assertEquals(state.newField, undefined);
  // Output is always a subset of input.
  for (const f of FIELDS) assert(state[f].length <= before[f].length, `${f} grew`);
});

Deno.test("a flag is capped, so a margin note cannot become the note", () => {
  const { state } = applyReflection(NOTE(), { flags: [{ field: "questions", index: 0, note: "x".repeat(500) }] });
  assert(state.questions[0].flagged.length <= 160);
});

Deno.test("garbled operations are a no-op, not a lost note", () => {
  for (const ops of [null, {}, { drops: "nope" }, { drops: [{ field: "bogus", index: 0 }] }, { drops: [{ field: "questions", index: 99 }] }]) {
    const { state, changed } = applyReflection(NOTE(), ops);
    assertEquals(changed, 0, `ops ${JSON.stringify(ops)} should change nothing`);
    assertEquals(state.questions.length, 2);
  }
});

Deno.test("no change means no write — the fixpoint guard depends on it", () => {
  const before = NOTE();
  const { state, changed } = applyReflection(before, { drops: [], flags: [] });
  assertEquals(changed, 0);
  // `updated` must NOT move, or the poller would see a change it caused itself
  // and come back forever.
  assertEquals(state.updated, before.updated);
  assertEquals(state.reflected ?? null, null);
});

Deno.test("a real change stamps both updated and reflected", () => {
  const { state } = applyReflection(NOTE(), { drops: [{ field: "questions", index: 1 }] }, "2026-09-09T00:00:00.000Z");
  assertEquals(state.updated, "2026-09-09T00:00:00.000Z");
  assertEquals(state.reflected, "2026-09-09T00:00:00.000Z");
});

Deno.test("the reader is told a pass ran, and that the words are still theirs", () => {
  const { state } = applyReflection(NOTE(), { drops: [{ field: "questions", index: 0 }] }, "2026-09-09T00:00:00.000Z");
  const out = render(state, { now: Date.parse("2026-09-09T00:00:00.000Z") });
  assertStringIncludes(out, "consolidation pass reviewed this on 2026-09-09");
  assertStringIncludes(out, "every remaining word is yours");
});

Deno.test("reflected survives a later write by Aaron", () => {
  const { state } = applyReflection(NOTE(), { drops: [{ field: "questions", index: 0 }] }, "2026-09-09T00:00:00.000Z");
  const after = merge(state, { questions: ["a new one"] }, "2026-09-10T00:00:00.000Z");
  assertEquals(after.reflected, "2026-09-09T00:00:00.000Z", "a patch must not erase that a pass ran");
});

Deno.test("reflectionInput numbers every entry so the model can answer in indices", () => {
  const input = reflectionInput(NOTE());
  assertStringIncludes(input, "themes:");
  assertStringIncludes(input, "[0]");
  assertStringIncludes(input, "[1]");
  assertStringIncludes(input, "tension two");
  // Not render(): that text is framed to persuade the reader the note is their
  // own thinking, which is the wrong frame for judging it coldly.
  assert(!input.includes("do not recite it back"));
});
