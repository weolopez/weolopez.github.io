#!/usr/bin/env -S deno run -A --unstable-kv
/**
 * aaron/plan-kv.ts — read and update Aaron's plans from the shell.
 *
 * Plans are written by the browser and mirrored into Deno KV by api.ts under
 * ["aaron_plans", <email>, <slug>]. This is the other end of that mirror: the
 * shell-side agent reads an approved plan as a work order, and writes step
 * status back into the same record.
 *
 * The write-back is the point. Because the browser reconciles on
 * `visibilitychange` and the merge takes the newest `updated`, a step marked
 * done here shows up on the phone the next time the tab is looked at — the
 * plan you approved fills itself in as the work lands.
 *
 * WHAT THIS DELIBERATELY WILL NOT DO:
 *   - Approve a plan. Approval is a human act performed in the browser, and a
 *     shell tool that could grant it would make the approval gate decorative.
 *     `step` refuses outright on a plan that is not already approved.
 *   - Create or delete plans. Authoring belongs in the conversation that
 *     produced it, not in a cron job.
 *
 * Usage:
 *   plan-kv.ts list [--json]              every plan, with status and progress
 *   plan-kv.ts pending [--json]           approved plans with unfinished steps
 *   plan-kv.ts get <slug> [--json]        one plan in full
 *   plan-kv.ts step <slug> <n> <status> [note]
 *                                         set step n (1-based) to
 *                                         todo|doing|done|blocked
 */

const DB = new URL("./aaron.db", import.meta.url).pathname;
const STEP_STATES = ["todo", "doing", "done", "blocked"];
const MARK: Record<string, string> = { todo: "[ ]", doing: "[~]", done: "[x]", blocked: "[!]" };

type Plan = {
  name: string; title: string; goal: string; context?: string;
  steps: { title: string; detail?: string; status: string; note?: string }[];
  risks?: string[]; open_questions?: string[];
  status: string; approved_at?: string | null; revision?: number;
  created?: string; updated: string;
};

const done = (p: Plan) => (p.steps ?? []).filter((s) => s.status === "done").length;
const open = (p: Plan) => (p.steps ?? []).filter((s) => s.status !== "done").length;

async function all(): Promise<{ email: string; plan: Plan }[]> {
  const kv = await Deno.openKv(DB);
  const out: { email: string; plan: Plan }[] = [];
  for await (const e of kv.list<Plan>({ prefix: ["aaron_plans"] })) {
    const v = e.value as Plan & { deleted?: boolean };
    if (!v || v.deleted || !v.steps) continue;   // skip tombstones
    out.push({ email: String(e.key[1]), plan: v });
  }
  kv.close();
  return out.sort((a, b) => String(b.plan.updated).localeCompare(String(a.plan.updated)));
}

// A slug is unique per account but not across accounts, so an ambiguous slug is
// an error rather than a coin flip about whose plan gets edited.
async function one(slug: string) {
  const hits = (await all()).filter((x) => x.plan.name === slug);
  if (!hits.length) throw new Error(`no plan named "${slug}"`);
  if (hits.length > 1) throw new Error(`"${slug}" exists for ${hits.map((h) => h.email).join(", ")} — ambiguous`);
  return hits[0];
}

function render(p: Plan): string {
  const steps = (p.steps ?? []).map((s, i) =>
    `${String(i + 1).padStart(2)}. ${MARK[s.status] ?? "[ ]"} ${s.title}` +
    (s.detail ? `\n      ${s.detail}` : "") +
    (s.note ? `\n      note: ${s.note}` : ""));
  const list = (label: string, xs?: string[]) => xs?.length ? `\n${label}:\n` + xs.map((x) => `  - ${x}`).join("\n") : "";
  return [
    `# ${p.title}  (${p.name})`,
    `status: ${p.status.toUpperCase()}${p.approved_at ? ` — approved ${p.approved_at}` : ""} · revision ${p.revision} · ${done(p)}/${p.steps.length} done`,
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

const [cmd, ...args] = Deno.args;
const json = args.includes("--json");
const rest = args.filter((a) => a !== "--json");

try {
  if (cmd === "list" || cmd === "pending") {
    let rows = await all();
    if (cmd === "pending") rows = rows.filter((r) => r.plan.status === "approved" && open(r.plan) > 0);
    if (json) {
      console.log(JSON.stringify(rows.map(({ email, plan }) => ({
        email, slug: plan.name, title: plan.title, status: plan.status,
        revision: plan.revision, updated: plan.updated,
        done: done(plan), open: open(plan),
        open_steps: plan.steps.map((s, i) => ({ n: i + 1, ...s })).filter((s) => s.status !== "done"),
      })), null, 2));
    } else if (!rows.length) {
      console.log(cmd === "pending" ? "no approved plans with unfinished steps." : "no plans.");
    } else {
      for (const { email, plan } of rows) {
        console.log(`${plan.name} — ${plan.title} [${plan.status}] ${done(plan)}/${plan.steps.length} done · rev ${plan.revision} · ${email} · updated ${plan.updated}`);
      }
    }
    Deno.exit(rows.length ? 0 : 1);   // exit 1 = nothing to do, so the poller can branch on it
  }

  if (cmd === "get") {
    const { plan } = await one(rest[0]);
    console.log(json ? JSON.stringify(plan, null, 2) : render(plan));
    Deno.exit(0);
  }

  if (cmd === "step") {
    const [slug, nRaw, status, ...noteParts] = rest;
    const { email, plan } = await one(slug);
    if (plan.status !== "approved") {
      throw new Error(`plan "${slug}" is ${plan.status}, not approved — refusing to touch its steps`);
    }
    if (!STEP_STATES.includes(status)) throw new Error(`status must be one of: ${STEP_STATES.join(", ")}`);
    const n = Number(nRaw);
    if (!Number.isInteger(n) || n < 1 || n > plan.steps.length) {
      throw new Error(`plan "${slug}" has ${plan.steps.length} steps — no step ${nRaw}`);
    }
    const note = noteParts.join(" ").trim();
    if (status === "blocked" && !note) throw new Error("a blocked step needs a note saying what is blocking it");

    plan.steps[n - 1] = {
      ...plan.steps[n - 1],
      status,
      note: note || plan.steps[n - 1].note || "",
    };
    // Newer than whatever the browser holds, so the merge adopts this write and
    // the phone shows the progress on its next reconcile.
    plan.updated = new Date().toISOString();

    const kv = await Deno.openKv(DB);
    await kv.set(["aaron_plans", email, slug], plan);
    kv.close();
    console.log(`step ${n} of "${slug}" → ${status}${note ? ` (${note})` : ""}`);
    console.log(`${done(plan)}/${plan.steps.length} done · ${open(plan)} remaining`);
    Deno.exit(0);
  }

  console.error(new TextDecoder().decode(await Deno.readFile(new URL(import.meta.url)))
    .split("\n").filter((l) => l.startsWith(" *")).map((l) => l.slice(2)).join("\n"));
  Deno.exit(2);
} catch (e) {
  console.error(String((e as Error)?.message ?? e));
  Deno.exit(2);
}
