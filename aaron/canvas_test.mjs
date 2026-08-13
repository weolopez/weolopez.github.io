/* Exercises the canvas panel's API against a stub DOM, pulling the real code
   out of index.html rather than re-typing it — same approach as tts_test.mjs,
   so the test cannot drift from what ships. */
const html = await Deno.readTextFile(new URL("./index.html", import.meta.url));

const a = html.indexOf("const canvasEl = () => $(\"wc-canvas\");");
const b = html.indexOf("/* --------------------------------------------------------------- prefs ----");
if (a < 0) throw new Error("canvas section moved — update this test");
const source = html.slice(a, html.indexOf("$(\"canvasBtn\").onclick", a));

// --- stub DOM -------------------------------------------------------------
class El {
  constructor(id = "") { this.id = id; this.children = []; this.hidden = false; this.className = ""; this._text = ""; }
  set textContent(v) { this._text = v; this.children = []; }
  get textContent() { return this._text + this.children.map((c) => c.textContent).join(""); }
  append(...k) { this.children.push(...k.flatMap((n) => (n?.__frag ? n.children : [n]))); }
  replaceChildren(...k) { this.children = []; if (k.length) this.append(...k); }
}
class Template extends El {
  set innerHTML(v) { this.content = { __frag: true, children: [Object.assign(new El(), { _text: v, __html: v })] }; }
}

const els = { "wc-canvas": new El("wc-canvas"), "wc-mount": new El("wc-mount") };
globalThis.$ = (id) => els[id];
globalThis.document = { createElement: (t) => (t === "template" ? new Template() : new El()) };
globalThis.Node = El;
globalThis.scroll = () => {};

let prefs = {};
globalThis.savePref = (k, v) => { prefs[k] = v; };
globalThis.loadPrefs = () => prefs;

const { canvas } = await import(
  "data:text/javascript," + encodeURIComponent(source + "\nexport { canvas };"));

let pass = 0, fail = 0;
const check = (name, cond) => { cond ? (pass++, console.log(`  ok   ${name}`)) : (fail++, console.log(`  FAIL ${name}`)); };
const mount = els["wc-mount"];
const panel = els["wc-canvas"];

panel.hidden = true; mount.replaceChildren();

canvas.render("<my-widget>one</my-widget>");
check("render shows the panel", canvas.open && panel.hidden === false);
check("render puts content in the mount", mount.children.length === 1);
check("opening persists to prefs", prefs.canvas === true);

canvas.render("<my-widget>two</my-widget>");
check("a second render REPLACES, never appends", mount.children.length === 1);
check("...and it is the new content", mount.children[0].__html.includes("two"));

const node = new El("live-node");
canvas.render(node);
check("render accepts a Node directly", mount.children.length === 1 && mount.children[0].id === "live-node");

canvas.clear();
check("clear empties the mount (placeholder only)", mount.children.length === 1 && mount.children[0].className === "empty");
check("clear does NOT close the panel", canvas.open === true);

canvas.hide();
check("hide closes", canvas.open === false && panel.hidden === true);
check("closing persists to prefs", prefs.canvas === false);

canvas.toggle();
check("toggle reopens", canvas.open === true);
canvas.toggle();
check("toggle closes again", canvas.open === false);

check("show/hide/clear/render/toggle all chain", canvas.show().clear().hide() === canvas);

console.log(`\n${pass} passed, ${fail} failed`);
Deno.exit(fail ? 1 : 0);
