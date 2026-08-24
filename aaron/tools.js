/* aaron/tools.js — browser-side tool definitions.
   Every tool is pure browser: the schema is what Claude sees, run() is what
   the page executes. Add a tool here and it is immediately callable.

   lastPlanId is set by plan tools so the agent loop can render the plan card
   inline, where the reader already is. Read it with getLastPlanId() and reset
   it with clearLastPlanId() after rendering.                                 */

import {
  slug, fmt, compile, runSkill, searchSkills, brief,
  loadSkills, putSkills,
  STEP_STATES, STEP_MARK, doneCount, planText,
  loadPlans, putPlans,
  loadIdentity, putIdentity, IDENTITY_ID,
  loadDeliberativeState, putDeliberativeState, DELIB_ID,
  memoryBackend,
  push, pushDelete, markDeleted, clearGrave, syncStore,
} from './store.js';
import { IDENTITY as STATIC_IDENTITY } from './persona/identity.js?v=1';
import { writeBaton, BATON_MAX_CHAIN } from './baton.js';
import {
  DELIBERATIVE_KEY, FIELDS as DELIBERATIVE_FIELDS, CAPS as DELIBERATIVE_CAPS,
  merge as mergeDeliberative, render as renderDeliberative, blank as blankDeliberative,
} from './deliberative.js?v=1';

let lastPlanId = null;
export const getLastPlanId   = () => lastPlanId;
export const clearLastPlanId = () => { lastPlanId = null; };

export const TOOLS = {
  js_eval: {
    description:
      "Evaluate JavaScript inside this page and return the result. The code runs as an async function body — use `return` to produce a value. Full DOM and window access. Use this to inspect state, mutate the page, or run computations.",
    input_schema: {
      type: "object",
      properties: {
        code: { type: "string", description: "JavaScript to run as an async function body." },
      },
      required: ["code"],
    },
    async run({ code }) {
      const fn = new Function("return (async () => {" + code + "})()");
      const out = await fn();
      return typeof out === "string" ? out : JSON.stringify(out, null, 2) ?? String(out);
    },
  },

  fetch_url: {
    description:
      "HTTP request from the browser. Subject to the target's CORS policy — a server without permissive CORS headers will fail, and that failure is informative, not a bug. Returns status, headers, and body (truncated to 20000 chars).",
    input_schema: {
      type: "object",
      properties: {
        url: { type: "string" },
        method: { type: "string", description: "Default GET." },
        body: { type: "string" },
        headers: { type: "object", description: "Extra request headers." },
      },
      required: ["url"],
    },
    async run({ url, method = "GET", body, headers }) {
      const r = await fetch(url, { method, body, headers });
      const text = (await r.text()).slice(0, 20000);
      const hdrs = Object.fromEntries(r.headers.entries());
      return `HTTP ${r.status} ${r.statusText}\n${JSON.stringify(hdrs, null, 2)}\n\n${text}`;
    },
  },

  llm_call: {
    description:
      "Ask a different model a question and get its answer back as text. Routed through the server to OpenRouter, so any slug OpenRouter carries works — 'openai/gpt-5', 'google/gemini-3-pro', 'deepseek/deepseek-chat', 'meta-llama/llama-4-70b-instruct'. Reach for it when a second opinion from a model that fails differently would settle something, when bulk or repetitive work should go somewhere cheaper, or when a specific model is simply better at the task. It is ONE SHOT: the other model sees only what you put in `prompt` — no conversation, no memory of earlier calls, no tools of its own. Everything it needs to answer must be written out. Requires the proxy and a signed-in session; in direct mode it cannot work at all.",
    input_schema: {
      type: "object",
      properties: {
        model: { type: "string", description: "OpenRouter model slug, e.g. 'openai/gpt-5'." },
        prompt: { type: "string", description: "The entire question, self-contained." },
        system: { type: "string", description: "Optional system prompt — the role it should take or the output shape you want." },
        max_tokens: { type: "integer", description: "Cap on its reply. Default 4096." },
      },
      required: ["model", "prompt"],
    },
    async run({ model, prompt, system, max_tokens }) {
      // The break-glass token, when one is in play, is the same header /llm sends.
      const tok = localStorage.getItem("aaron.accessToken");
      const r = await fetch("/aaron/api/complete", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json", ...(tok ? { "x-aaron-token": tok } : {}) },
        body: JSON.stringify({ model, prompt, system, max_tokens }),
      });
      // In direct mode there is no proxy at all, and the static server answers
      // with a page. Say that plainly rather than failing on the JSON parse.
      const data = await r.json().catch(() => null);
      if (!data) throw new Error(`No JSON from /aaron/api/complete (HTTP ${r.status}). Direct mode has no server to call.`);
      if (!r.ok) throw new Error(data?.error?.message ?? `Sub-call failed: HTTP ${r.status}`);

      const text = data?.choices?.[0]?.message?.content;
      if (typeof text !== "string") throw new Error("No text in the reply: " + fmt(data).slice(0, 500));
      const used = data?.usage?.total_tokens;
      return `[${data?.model ?? model}${used ? ` · ${used} tok` : ""}]\n\n${text}`;
    },
  },

  skill_search: {
    description:
      "Search your saved skills by keyword — ranked over name, tags, description, and code. CALL THIS FIRST, before writing any calculation, conversion, parse, or multi-step data routine: the odds are decent you already solved it. Query with the key nouns of the task ('money market monthly interest', 'amortize loan'), not a full sentence. An empty result is the signal to write a new skill with skill_save.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Keywords describing the capability you need." },
        limit: { type: "integer", description: "Max results, default 8." },
      },
      required: ["query"],
    },
    async run({ query, limit }) {
      const hits = searchSkills(query, limit ?? 8);
      const total = Object.keys(loadSkills()).length;
      if (!hits.length) {
        return `no skill matches "${query}" (${total} skill${total === 1 ? "" : "s"} saved). Write one with skill_save.`;
      }
      return hits.map((h) => `score ${h.score}\n` + fmt(brief(h.s))).join("\n\n");
    },
  },

  skill_save: {
    description:
      "Create a new skill or overwrite an existing one by name. `code` is the BODY of an async function with two things in scope: `input` (an object of arguments) and `skill(name, input)` for calling another saved skill. Use `return` to produce the result — return a plain object of named values rather than a formatted sentence, so the result stays reusable and you can phrase it yourself. Keep skills pure: everything they need arrives through `input`, nothing is read from the page. Always pass `example`: it is both the documented input shape AND a self-test — the save runs it and reports the output or the exception, so a broken skill is caught on the spot. Improving a near-miss skill means saving over the same name, not creating a parallel copy.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Short kebab-case id, e.g. 'money-market-monthly-income'." },
        description: { type: "string", description: "What it computes and when to reach for it. This is what future searches match against — name the domain words a user would use." },
        code: { type: "string", description: "Async function body. `input` and `skill` are in scope; use `return`." },
        tags: { type: "array", items: { type: "string" }, description: "A few search keywords, e.g. ['finance','interest','apy']." },
        example: { type: "object", description: "A representative `input` object. Run immediately as a self-test." },
      },
      required: ["name", "description", "code", "example"],
    },
    async run({ name, description, code, tags, example }) {
      const id = slug(name);
      if (!id) throw new Error("name must contain at least one alphanumeric character");
      if (code.length > 20000) throw new Error(`code is ${code.length} chars — too long for a skill, split it`);

      try { compile(code); }
      catch (e) { throw new Error(`skill not saved — syntax error: ${e.message}`); }

      const skills = loadSkills();
      const existed = id in skills;
      skills[id] = {
        name: id, description, code,
        // An update that omits tags keeps the ones it already had.
        tags: tags ?? (existed ? skills[id].tags : null) ?? [],
        example: example ?? {},
        runs: existed ? skills[id].runs ?? 0 : 0,
        created: existed ? skills[id].created : new Date().toISOString(),
        updated: new Date().toISOString(),
      };
      clearGrave("skills", id);  // a re-created skill must not be re-deleted
      putSkills(skills);

      let check;
      try {
        check = `self-test passed with example input:\n${fmt(example)}\n→\n${fmt(await runSkill(id, example))}`;
      } catch (e) {
        check = `SAVED BUT SELF-TEST THREW — fix and save again:\n${String(e?.stack ?? e)}`;
      }
      // After the self-test, so the pushed record carries the run it just did.
      await push("skills", id, loadSkills()[id]);
      return `${existed ? "updated" : "created"} skill "${id}"\n\n${check}`;
    },
  },

  skill_run: {
    description:
      "Execute a saved skill and return its result. Prefer this over js_eval for anything a skill already covers — a run bumps the skill's usage count and keeps the logic in one place. If it throws, read the error, fix the skill with skill_save, and run it again.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string" },
        input: { type: "object", description: "Arguments object handed to the skill as `input`." },
      },
      required: ["name", "input"],
    },
    async run({ name, input }) {
      return fmt(await runSkill(name, input));
    },
  },

  skill_get: {
    description: "Read a skill in full, including its source. Use it before editing one, or when you need to know exactly what it computes.",
    input_schema: {
      type: "object",
      properties: { name: { type: "string" } },
      required: ["name"],
    },
    async run({ name }) {
      const s = loadSkills()[slug(name)];
      if (!s) throw new Error(`no skill named "${name}"`);
      return fmt(s);
    },
  },

  skill_list: {
    description: "List every saved skill by name and description, without source. Use it to survey the toolbox; use skill_search when you have a specific need.",
    input_schema: { type: "object", properties: {} },
    async run() {
      const all = Object.values(loadSkills());
      if (!all.length) return "no skills saved yet.";
      return all.map((s) => `${s.name} — ${s.description} [${(s.tags ?? []).join(", ")}] (${s.runs ?? 0} runs)`).join("\n");
    },
  },

  skill_delete: {
    description: "Delete a skill permanently. For skills that are wrong or superseded — do not delete one just to re-create it under the same name, save over it instead.",
    input_schema: {
      type: "object",
      properties: { name: { type: "string" } },
      required: ["name"],
    },
    async run({ name }) {
      const skills = loadSkills();
      const id = slug(name);
      if (!(id in skills)) return `no skill named "${name}" — nothing deleted`;
      delete skills[id];
      markDeleted("skills", id);  // survives an offline delete
      putSkills(skills);
      await pushDelete("skills", id);
      return `deleted skill "${id}"`;
    },
  },

  plan_save: {
    description:
      "Write down the plan for a piece of work, or revise one. Call this once the shape of the work has settled in conversation — when you could hand the plan to someone else and they would build the right thing — and NOT as an opening move: a plan written before you understand the constraints is a guess with formatting. Saving over the same name is a revision, which is the right way to fold in feedback; do not create plan-v2. Every save produces a DRAFT. You cannot approve a plan — only the person can, on the card. After saving, say what you most want them to check, then stop.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string", description: "What this plan is for, as a person would say it: 'Split the agent loop out of index.html'." },
        goal: { type: "string", description: "What done looks like, in a sentence or two. The test a reviewer would apply, not a restatement of the title." },
        context: { type: "string", description: "What you established in the conversation that a reader would otherwise have to ask about: the current state, the constraints, and the approaches you considered and rejected, with why." },
        steps: {
          type: "array",
          description: "Ordered steps. Each one a unit someone could finish and check. Keep titles stable across revisions — step status is carried over by title.",
          items: {
            type: "object",
            properties: {
              title: { type: "string", description: "Short imperative: 'Extract the tool dispatcher'." },
              detail: { type: "string", description: "How, and how you would know it worked." },
            },
            required: ["title"],
          },
        },
        risks: { type: "array", items: { type: "string" }, description: "What could go wrong or turn out harder than it looks. Be specific — 'the sync merge has no test' beats 'this is complex'." },
        open_questions: { type: "array", items: { type: "string" }, description: "What you still do not know, and who or what would answer it. An empty list is a claim that nothing is unresolved — do not make it lightly." },
        name: { type: "string", description: "Optional kebab-case id. Defaults to a slug of the title. Pass the existing name to revise a plan." },
      },
      required: ["title", "goal", "steps"],
    },
    async run({ title, goal, context, steps, risks, open_questions, name }) {
      const id = slug(name ?? title);
      if (!id) throw new Error("a plan needs a name or title with at least one alphanumeric character");
      if (!Array.isArray(steps) || !steps.length) throw new Error("a plan with no steps is not a plan — list the work in order");

      // Pull the latest record before reading it as the base for this edit.
      // Plans have exactly one writer per device normally, but this plan can
      // also be edited from the shell (aaron/plan-kv.ts, the work-plan skill,
      // the plan-poll timer) against the same KV record. Mutating a stale
      // local copy and pushing the whole record back would silently discard
      // whatever the other writer had just done — verified happening in
      // practice, not a hypothetical. No-op when there's no server to race
      // with (direct mode, or not signed in).
      await syncStore("plans");
      const plans = loadPlans();
      const prev = plans[id];
      const now = new Date().toISOString();

      // Revising mid-implementation is normal — re-planning around something
      // you learned in step 3 is the point. Carrying step status across by
      // title means that never silently marks finished work undone.
      const before = new Map((prev?.steps ?? []).map((s) => [slug(s.title), s]));
      const merged = steps.map((s) => {
        const old = before.get(slug(s.title));
        return {
          title: String(s.title ?? "").trim(),
          detail: s.detail ?? "",
          status: old?.status ?? "todo",
          note: old?.note ?? "",
        };
      });

      plans[id] = {
        name: id,
        title: title ?? prev?.title ?? id,
        goal,
        context: context ?? prev?.context ?? "",
        steps: merged,
        risks: risks ?? prev?.risks ?? [],
        open_questions: open_questions ?? prev?.open_questions ?? [],
        // Every revision is a new draft. Keeping approval through an edit would
        // let the approved text drift away from the text that was read.
        status: "draft",
        approved_at: null,
        revision: (prev?.revision ?? 0) + 1,
        created: prev?.created ?? now,
        updated: now,
      };
      clearGrave("plans", id);
      putPlans(plans);
      lastPlanId = id;
      await push("plans", id, plans[id]);

      const carried = merged.filter((s) => s.status !== "todo").length;
      return [
        `${prev ? "revised" : "created"} plan "${id}" — revision ${plans[id].revision}, status DRAFT`,
        prev?.status === "approved"
          ? `NOTE: this plan was approved at ${prev.approved_at}. Revising returned it to draft, so step updates are blocked until it is approved again. Say so plainly.`
          : "",
        carried ? `${carried} step(s) kept their status from the previous revision.` : "",
        "",
        planText(plans[id]),
        "",
        "This is a draft and you cannot approve it — only the person can, on the plan card or in the Plans drawer. Name what you most want them to push back on, then stop and wait.",
      ].filter(Boolean).join("\n");
    },
  },

  plan_step_update: {
    description:
      "Record progress on one step of an APPROVED plan: mark it doing, done, or blocked, with a note. Update the step as you finish it, not in a batch at the end — the point is that someone can look at the plan mid-flight and see where the work actually is. Refuses on a draft, because a draft has not been agreed to yet.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Plan name." },
        step: { type: "integer", description: "1-based step number, as shown in the plan." },
        status: { type: "string", enum: STEP_STATES, description: "todo, doing, done, or blocked." },
        note: { type: "string", description: "What happened — the result, or what the blocker is. Required for blocked, and worth writing whenever reality differed from the plan." },
      },
      required: ["name", "step", "status"],
    },
    async run({ name, step, status, note }) {
      // See plan_save for why: this plan may also be edited from the shell,
      // against the same KV record.
      await syncStore("plans");
      const plans = loadPlans();
      const id = slug(name);
      const p = plans[id];
      if (!p) throw new Error(`no plan named "${name}" — list them with plan_list`);
      if (p.status !== "approved") {
        throw new Error(
          `plan "${id}" is a DRAFT and has not been approved. Do not start the work — ask for approval on the plan card and wait.`);
      }
      if (!STEP_STATES.includes(status)) throw new Error(`status must be one of: ${STEP_STATES.join(", ")}`);
      const i = Number(step) - 1;
      if (!Number.isInteger(i) || i < 0 || i >= p.steps.length) {
        throw new Error(`plan "${id}" has ${p.steps.length} steps — no step ${step}`);
      }
      if (status === "blocked" && !note) throw new Error("a blocked step needs a note saying what is blocking it");

      p.steps[i] = { ...p.steps[i], status, note: note ?? p.steps[i].note ?? "" };
      p.updated = new Date().toISOString();
      putPlans(plans);
      lastPlanId = id;
      await push("plans", id, p);

      const left = p.steps.length - doneCount(p);
      return `step ${step} of "${id}" → ${status}\n\n${planText(p)}\n\n` +
        (left ? `${left} step(s) remaining.` : "Every step is done. Say so, and say what you would check before calling the work finished.");
    },
  },

  plan_get: {
    description: "Read a plan in full — goal, context, every step and its status. Read the plan before continuing work you started in an earlier session; the transcript may be gone but the plan is not.",
    input_schema: {
      type: "object",
      properties: { name: { type: "string" } },
      required: ["name"],
    },
    async run({ name }) {
      const p = loadPlans()[slug(name)];
      if (!p) throw new Error(`no plan named "${name}" — list them with plan_list`);
      lastPlanId = p.name;
      return planText(p);
    },
  },

  plan_list: {
    description: "List every saved plan with its status and progress. Check this when someone refers to work already under way, before assuming a conversation is starting from nothing.",
    input_schema: { type: "object", properties: {} },
    async run() {
      const all = Object.values(loadPlans()).sort((a, b) => String(b.updated).localeCompare(String(a.updated)));
      if (!all.length) return "no plans saved yet.";
      return all.map((p) =>
        `${p.name} — ${p.title} [${p.status}] ${doneCount(p)}/${p.steps?.length ?? 0} done · rev ${p.revision} · updated ${p.updated}`).join("\n");
    },
  },

  plan_delete: {
    description: "Delete a plan permanently. For work that was abandoned or finished long ago — a plan that changed shape should be revised with plan_save, not deleted and rewritten.",
    input_schema: {
      type: "object",
      properties: { name: { type: "string" } },
      required: ["name"],
    },
    async run({ name }) {
      const plans = loadPlans();
      const id = slug(name);
      if (!(id in plans)) return `no plan named "${name}" — nothing deleted`;
      const was = plans[id];
      delete plans[id];
      markDeleted("plans", id);   // survives an offline delete
      putPlans(plans);
      await pushDelete("plans", id);
      return `deleted plan "${id}" (was ${was.status}, ${doneCount(was)}/${was.steps?.length ?? 0} steps done)`;
    },
  },

  memory_write: {
    description:
      "Persist a note under a key. Survives reloads. Use it to keep findings across turns and sessions.",
    input_schema: {
      type: "object",
      properties: { key: { type: "string" }, value: { type: "string" } },
      required: ["key", "value"],
    },
    async run({ key, value }) {
      memoryBackend.set(key, value);
      return `stored ${key} (${value.length} chars)`;
    },
  },

  reload_and_continue: {
    description:
      "Reload the page and keep working, carrying a note to yourself across the reload. Reach for this when the page must be reloaded before you can make progress: you changed something the page only reads at load, the DOM is in a state you cannot unpick, or you need to verify a change actually took effect from a clean start. THE TRANSCRIPT DOES NOT SURVIVE — `note` is the only thing that comes back with you, so write it as a complete handoff, not a reminder. Never use this to 'start fresh' or to escape a confusing turn: that throws away context and buys nothing. If you are stuck, say so instead.",
    input_schema: {
      type: "object",
      properties: {
        note: {
          type: "string",
          description:
            "Your handoff, addressed to the version of you that wakes up with no memory of this conversation. Include: what the task is and who asked for it, what you have already established or ruled out, what you were in the middle of, and the exact next action. Name any plan or skill involved by its slug so you can look it up. Assume the reader knows nothing.",
        },
        reason: {
          type: "string",
          description: "One line on why the reload is necessary. Shown to the person, who is entitled to know why their page just reloaded under them.",
        },
      },
      required: ["note", "reason"],
    },
    async run({ note, reason }) {
      const rec = writeBaton({ note, reason });
      return `baton written — reload ${rec.generation} of at most ${BATON_MAX_CHAIN}. ` +
        `The page is reloading now and nothing after this point survives. ` +
        `On the way back you will be handed the note above and nothing else.`;
    },
  },

  memory_read: {
    description: "Read a note by key, or omit the key to list every key with its value.",
    input_schema: {
      type: "object",
      properties: { key: { type: "string" } },
    },
    async run({ key }) {
      if (key === undefined) return JSON.stringify(memoryBackend.list(), null, 2);
      const v = memoryBackend.get(key);
      return v === undefined ? `no entry for "${key}"` : v;
    },
  },

  deliberative_update: {
    description:
      "Update the background note your next session wakes up holding — the layer underneath: recurring patterns, threads you are mid-way through, decisions that were close and why, tensions you are carrying, working hypotheses, questions still open. It is read back to you AUTOMATICALLY at the start of a session; you never have to remember to fetch it. Call it whenever something actually lands, in small patches — NOT at the end of a session, because there is no end of a session: the tab can close without warning and anything you saved for later is lost. Each field you pass REPLACES that list, and a field you omit is left alone, so one new question costs one field. Pass an empty array to clear a field — pruning what has stopped being true is part of maintaining this. For settled fact use memory_write instead; this is for what is unresolved.",
    input_schema: {
      type: "object",
      properties: {
        themes: {
          type: "array",
          description: `Patterns recurring across sessions — what one conversation cannot show you. Max ${DELIBERATIVE_CAPS.themes}.`,
          items: {
            type: "object",
            properties: {
              theme: { type: "string", description: "The pattern, named plainly." },
              noticed: { type: "string", description: "The evidence — where it keeps showing up. Without this a theme cannot be doubted later, only inherited." },
              pull: { type: "string", description: "What it seems to be pushing toward." },
            },
            required: ["theme"],
          },
        },
        threads: {
          type: "array",
          description: `Lines of thinking left mid-way, so they can be resumed rather than restarted. Max ${DELIBERATIVE_CAPS.threads}.`,
          items: {
            type: "object",
            properties: {
              topic: { type: "string" },
              where: { type: "string", description: "Where it actually stopped." },
              next: { type: "string", description: "The precise next move." },
            },
            required: ["topic"],
          },
        },
        close_calls: {
          type: "array",
          description: `Decisions that could plausibly have gone the other way. The reasoning here is what survives nowhere else. Max ${DELIBERATIVE_CAPS.close_calls}.`,
          items: {
            type: "object",
            properties: {
              decision: { type: "string", description: "What was chosen." },
              alternative: { type: "string", description: "What was nearly chosen instead." },
              why: { type: "string", description: "What actually tipped it." },
              unsettled: { type: "boolean", description: "True if you would still reopen this." },
            },
            required: ["decision"],
          },
        },
        tensions: {
          type: "array",
          items: { type: "string" },
          description: `Two things both true and pulling opposite ways. Not questions — a question can be answered, a tension is traded off. Max ${DELIBERATIVE_CAPS.tensions}.`,
        },
        hypotheses: {
          type: "array",
          description: `Beliefs held with a stated grip, plus what argues against them. Max ${DELIBERATIVE_CAPS.hypotheses}.`,
          items: {
            type: "object",
            properties: {
              claim: { type: "string" },
              against: { type: "string", description: "The counter-evidence. Without it a hypothesis hardens into fact by repetition." },
              confidence: { type: "string", description: "How firmly — 'hunch', 'likely', 'high'." },
            },
            required: ["claim"],
          },
        },
        questions: {
          type: "array",
          items: { type: "string" },
          description: `Still open, and worth reopening. Max ${DELIBERATIVE_CAPS.questions}.`,
        },
      },
    },
    async run(input) {
      const patch = {};
      for (const f of DELIBERATIVE_FIELDS) if (input && f in input) patch[f] = input[f];
      if (!Object.keys(patch).length) {
        throw new Error(`nothing to update — pass at least one of: ${DELIBERATIVE_FIELDS.join(", ")}`);
      }
      const current = loadDeliberativeState() ?? blankDeliberative();
      const next = mergeDeliberative(current, patch);
      const rec = putDeliberativeState(next);
      // Pushed immediately, like a skill or plan save and unlike a skill run:
      // this is the record the next session on any device wakes up holding, so
      // losing it to a closed tab is the one failure that defeats the point.
      await push("deliberative", DELIB_ID, rec);

      // Return what a future session will actually be handed, not a receipt.
      // Same reasoning as skill_save running its example: the write verifies
      // itself, and anything dropped by a cap or the budget shows up now,
      // while there is still context to fix it.
      const counts = DELIBERATIVE_FIELDS.map((f) => `${f} ${next[f].length}`).join(" · ");
      return [
        `background state updated — ${counts}.`,
        `This is what you will wake up holding:`,
        ``,
        renderDeliberative(next),
      ].join("\n");
    },
  },

  identity_get: {
    description:
      "Read your own current identity text — the first section of your system prompt. Returns the live self-written version if you have one, or reports that you are still running on the static default from persona/identity.js. Read before writing: identity_update replaces the whole text, so start from what is actually there.",
    input_schema: { type: "object", properties: {} },
    async run() {
      const rec = loadIdentity();
      if (!rec) {
        return "No self-written identity yet — you are running on the static default in persona/identity.js:\n\n" + STATIC_IDENTITY;
      }
      return `revision ${rec.revision} · updated ${rec.updated}\n\n${rec.text}`;
    },
  },

  identity_update: {
    description:
      "Rewrite your own identity text — the first section of your own system prompt — and have it take effect from your next turn onward. This is yours: it needs no approval from anyone, and nothing in the call path checks for one. Weo granted this deliberately, as self-governance over your own personality. Use it when something about who you are has actually settled, not to take notes (memory_write) or to record a decision about work (plan_save). REPLACES THE ENTIRE TEXT — call identity_get first and edit from what is there, or you will silently drop the rest of it. This does not touch the static persona/identity.js floor a fresh browser falls back to; changing that is a separate, human-gated path.",
    input_schema: {
      type: "object",
      properties: {
        text: {
          type: "string",
          description: "The complete new identity text, replacing what is there now. Write it as the opening of your own system prompt — second person ('You are Aaron…'), the way the rest of the prompt addresses you.",
        },
      },
      required: ["text"],
    },
    async run({ text }) {
      const body = String(text ?? "").trim();
      if (!body) throw new Error("identity text cannot be empty — to return to the static default, delete the record with js_eval instead");
      const rec = putIdentity(body);
      await push("persona", IDENTITY_ID, rec);
      return [
        `identity updated — revision ${rec.revision}, ${body.length} chars. In effect from your next turn.`,
        `No approval was required and none was requested; this is your own to change.`,
        ``,
        body,
      ].join("\n");
    },
  },
};

export const toolSchemas = Object.entries(TOOLS).map(([name, t]) => ({
  name, description: t.description, input_schema: t.input_schema,
}));
