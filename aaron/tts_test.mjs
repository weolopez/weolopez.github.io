/* Exercises injectSpeakButtons' branching against a stub DOM, by pulling the
   real function text out of index.html rather than re-typing it. */
const html = await Deno.readTextFile("/root/weolopez.github.io/aaron/index.html");

const grab = (startMarker, endMarker) => {
  const a = html.indexOf(startMarker);
  const b = html.indexOf(endMarker, a);
  if (a < 0 || b < 0) throw new Error(`could not locate ${startMarker}`);
  return html.slice(a, b);
};

// The whole speaking section: VOICE_DEFAULTS through the end of
// injectSpeakButtons, stopping before the auto-scroll code that follows it.
const source = grab("const VOICE_DEFAULTS", "/* Auto-scroll only while");

// --- stub DOM -------------------------------------------------------------
class El {
  constructor(cls = "") { this.className = cls; this.children = []; this.dataset = {}; this._text = ""; this.attrs = {}; }
  set textContent(v) { this._text = v; this.children = []; }
  get textContent() { return this._text + this.children.map((c) => c.textContent).join(""); }
  append(...k) { this.children.push(...k); }
  setAttribute(k, v) { this.attrs[k] = v; }
  classList = { _s: new Set(), add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); }, contains(c) { return this._s.has(c); } };
  querySelector(sel) {
    const want = sel.replace(".", "");
    const walk = (n) => {
      for (const c of n.children) {
        if (String(c.className).split(" ").includes(want)) return c;
        const hit = walk(c); if (hit) return hit;
      }
      return null;
    };
    return walk(this);
  }
}
const makeTurn = ({ role = "assistant", body = "", think = null }) => {
  const t = new El("turn"); t.dataset.role = role;
  t.append(new El("role"));
  if (think !== null) { const th = new El("think"); th.textContent = think; t.append(th); }
  const b = new El("body"); b.textContent = body; t.append(b);
  return t;
};

globalThis.document = { createElement: () => new El() };
globalThis.window = { speechSynthesis: {} };
globalThis.speechSynthesis = { getVoices: () => [], speak() {}, cancel() {} };
globalThis.loadMemory = () => globalThis.__mem ?? {};
globalThis.__writes = [];
globalThis.memoryBackend = {
  set(k, v) { globalThis.__writes.push([k, v]); (globalThis.__mem ??= {})[k] = v; },
};
globalThis.console = console;

const { injectSpeakButtons, voiceConfig, pickVoice, listVoices } = await import(
  "data:text/javascript," + encodeURIComponent(source + "\nexport { injectSpeakButtons, voiceConfig, pickVoice, listVoices };")
);

const btns = (t) => t.querySelector(".speak")?.children.map((b) => b.textContent) ?? [];
let pass = 0, fail = 0;
const check = (name, cond) => { cond ? (pass++, console.log(`  ok   ${name}`)) : (fail++, console.log(`  FAIL ${name}`)); };

globalThis.__mem = {};

let t = makeTurn({ body: "hello there", think: "hmm" });
injectSpeakButtons(t);
check("body + think -> both buttons, think first", JSON.stringify(btns(t)) === '["🧠","🔊"]');

injectSpeakButtons(t);
check("idempotent (second call adds nothing)", btns(t).length === 2);

t = makeTurn({ body: "just an answer" });
injectSpeakButtons(t);
check("no .think -> only 🔊", JSON.stringify(btns(t)) === '["🔊"]');

t = makeTurn({ body: "", think: "thought only" });
injectSpeakButtons(t);
check("tool-only hop (empty body) -> only 🧠", JSON.stringify(btns(t)) === '["🧠"]');

t = makeTurn({ body: "", think: "   " });
injectSpeakButtons(t);
check("nothing to say -> no .speak wrapper at all", t.querySelector(".speak") === null);

t = makeTurn({ role: "user", body: "typed by a person" });
injectSpeakButtons(t);
check("user turn -> never injected", t.querySelector(".speak") === null);

globalThis.__mem = { voice_config: { body_voice: "Alex", body_label: "📢" } };
t = makeTurn({ body: "custom voice" });
injectSpeakButtons(t);
check("memory overrides label", JSON.stringify(btns(t)) === '["📢"]');
check("partial config keeps defaults for the rest", voiceConfig().think_voice === "Samantha" && voiceConfig().body_voice === "Alex");

// --- write-back: the defaults are Aaron's decision, so they get recorded -----
globalThis.__mem = {}; globalThis.__writes = [];
let cfg = voiceConfig();
check("absent config -> persists the defaults once", globalThis.__writes.length === 1 &&
  globalThis.__writes[0][0] === "voice_config" &&
  globalThis.__writes[0][1].body_voice === "Daniel" &&
  globalThis.__writes[0][1].think_voice === "Samantha");
check("...and returns them", cfg.body_voice === "Daniel");

globalThis.__writes = [];
voiceConfig();
check("second read does not write again", globalThis.__writes.length === 0);

globalThis.__mem = { voice_config: { body_voice: "Alex" } }; globalThis.__writes = [];
cfg = voiceConfig();
check("partial config is an override -> never backfilled", globalThis.__writes.length === 0);
check("...but missing keys still resolve from defaults", cfg.body_voice === "Alex" && cfg.think_voice === "Samantha");

globalThis.__mem = { voice_config: null }; globalThis.__writes = [];
cfg = voiceConfig();
check("corrupt config -> not repaired, not written", globalThis.__writes.length === 0);
check("...and still yields a working voice", cfg.body_voice === "Daniel");

// --- voice ranking: premium variants win when installed, silently -----------
const V = (name, lang = "en-US") => ({ name, lang, localService: true });
const withVoices = (list, fn) => {
  const prev = speechSynthesis.getVoices;
  speechSynthesis.getVoices = () => list;
  try { return fn(); } finally { speechSynthesis.getVoices = prev; }
};

check("compact only -> exact match, unchanged behaviour",
  withVoices([V("Samantha"), V("Daniel")], () => pickVoice("Samantha").name) === "Samantha");

check("enhanced installed -> upgraded automatically",
  withVoices([V("Samantha"), V("Samantha (Enhanced)")], () => pickVoice("Samantha").name) === "Samantha (Enhanced)");

check("premium beats enhanced",
  withVoices([V("Samantha"), V("Samantha (Enhanced)"), V("Samantha (Premium)")],
    () => pickVoice("Samantha").name) === "Samantha (Premium)");

check("upgrade never crosses to a different voice",
  withVoices([V("Samantha"), V("Daniel (Premium)")], () => pickVoice("Samantha").name) === "Samantha");

check("an explicitly configured variant is honoured verbatim",
  withVoices([V("Samantha"), V("Samantha (Enhanced)"), V("Samantha (Premium)")],
    () => pickVoice("Samantha (Enhanced)").name) === "Samantha (Enhanced)");

check("unknown voice -> first English",
  withVoices([V("Zarvox", "en-GB"), V("Bruno", "fr-FR")], () => pickVoice("Nobody").name) === "Zarvox");

check("no voices loaded yet -> null, engine default",
  withVoices([], () => pickVoice("Samantha")) === null);

check("listVoices tags quality and sorts best-first",
  withVoices([V("Samantha"), V("Ava (Premium)"), V("Tom (Enhanced)")], () => {
    const l = listVoices();
    return l[0].quality === "premium" && l[0].name === "Ava (Premium)" &&
           l[2].quality === "compact" && l.length === 3;
  }));

check("only the Enhanced entry exists (no plain) -> still matches",
  withVoices([V("Samantha (Enhanced)"), V("Daniel (Enhanced)")],
    () => pickVoice("Samantha").name) === "Samantha (Enhanced)");

check("no Premium tier for this voice -> settles on Enhanced",
  withVoices([V("Daniel"), V("Daniel (Enhanced)"), V("Ava (Premium)")],
    () => pickVoice("Daniel").name) === "Daniel (Enhanced)");

check("Enhanced data served under the plain name -> plain is correct",
  withVoices([V("Samantha")], () => pickVoice("Samantha").name) === "Samantha");

console.log(`\n${pass} passed, ${fail} failed`);
Deno.exit(fail ? 1 : 0);
