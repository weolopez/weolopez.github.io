/**
 * Seeds Aaron's settings database. Idempotent — safe to re-run.
 *
 * Exists to solve one bootstrap problem: the allowlist lives in the database,
 * and editing it through the UI requires being signed in, which requires
 * already being on it. Someone has to write the first entry out of band.
 *
 *   deno run --allow-env --allow-read --allow-write --unstable-kv \
 *     aaron/seed.ts you@example.com other@example.com
 *
 * With no arguments it prints the current settings and changes nothing.
 * Secrets are deliberately NOT seedable here: pasting an API key on a command
 * line puts it in your shell history. Set those in Account -> Settings.
 */

const path = Deno.env.get("AARON_KV_PATH") || "./aaron/aaron.db";
const kv = await Deno.openKv(path);

const emails = Deno.args.map((a) => a.trim().toLowerCase()).filter(Boolean);

const show = async () => {
  console.log(`\nsettings in ${path}:`);
  let any = false;
  for await (const e of kv.list<unknown>({ prefix: ["aaron_settings"] })) {
    any = true;
    console.log(`  ${String(e.key[1]).padEnd(16)} ${JSON.stringify(e.value)}`);
  }
  // Names only — a seed script must never print a stored secret.
  for await (const e of kv.list<string>({ prefix: ["aaron_secrets"] })) {
    any = true;
    console.log(`  ${String(e.key[1]).padEnd(16)} <set, not shown>`);
  }
  if (!any) console.log("  (empty)");
};

if (!emails.length) {
  console.log("No emails given — nothing changed. Pass addresses to set the allowlist.");
  await show();
} else {
  const bad = emails.filter((e) => !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e));
  if (bad.length) {
    console.error(`Not email addresses: ${bad.join(", ")}`);
    kv.close();
    Deno.exit(1);
  }
  await kv.set(["aaron_settings", "allowed_emails"], emails);
  console.log(`Allowlist set to: ${emails.join(", ")}`);
  await show();
}

kv.close();
