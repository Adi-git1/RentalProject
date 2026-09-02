// One-shot Vercel deploy: pushes env vars from .env.local, deploys to prod,
// then sets NEXT_PUBLIC_SITE_URL / auth redirect URLs to the real domain and
// redeploys.
//
// Prereqs (run once yourself — they need a browser):
//   npx vercel login
//   npx vercel link            # pick or create the project
//
// Then:
//   npm run deploy
import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";

const NPX = process.platform === "win32" ? "npx.cmd" : "npx";

function vercel(args, opts = {}) {
  return execFileSync(NPX, ["vercel", ...args], {
    encoding: "utf8",
    stdio: opts.capture ? ["pipe", "pipe", "inherit"] : "inherit",
    input: opts.input,
  });
}

// --- checks ---
try {
  const who = vercel(["whoami"], { capture: true }).trim();
  console.log(`Vercel user: ${who}`);
} catch {
  console.error("Not logged in. Run:  npx vercel login   then  npx vercel link");
  process.exit(1);
}
if (!existsSync(".vercel/project.json")) {
  console.error("Project not linked. Run:  npx vercel link");
  process.exit(1);
}

// --- parse .env.local ---
const env = {};
for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (!m) continue;
  let v = m[2];
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1);
  }
  env[m[1]] = v;
}

// Vars we do NOT push (local-only or set later)
const SKIP = new Set(["SUPABASE_DB_URL", "NEXT_PUBLIC_SITE_URL"]);
const TARGETS = ["production", "preview", "development"];

console.log("\nPushing env vars to Vercel...");
for (const [key, value] of Object.entries(env)) {
  if (SKIP.has(key) || !value) continue;
  for (const target of TARGETS) {
    try {
      vercel(["env", "rm", key, target, "-y"], { capture: true });
    } catch {
      /* not set yet */
    }
    vercel(["env", "add", key, target], { input: value + "\n" });
  }
  console.log(`  ✓ ${key}`);
}

// --- first deploy ---
console.log("\nDeploying to production...");
const out = vercel(["--prod", "--yes"], { capture: true });
const url = (out.match(/https:\/\/[^\s]+\.vercel\.app/g) || []).pop();
console.log(out);
if (!url) {
  console.error("Could not determine the deployment URL from Vercel output.");
  process.exit(1);
}

// --- set site URL + redeploy ---
console.log(`\nSetting NEXT_PUBLIC_SITE_URL=${url} and redeploying...`);
for (const target of TARGETS) {
  try {
    vercel(["env", "rm", "NEXT_PUBLIC_SITE_URL", target, "-y"], { capture: true });
  } catch {
    /* noop */
  }
  vercel(["env", "add", "NEXT_PUBLIC_SITE_URL", target], { input: url + "\n" });
}
vercel(["--prod", "--yes"]);

console.log(`\n✅ Deployed: ${url}`);
console.log(`
Next steps:
  1. Supabase → Authentication → URL Configuration:
       Site URL:      ${url}
       Redirect URLs: ${url}/auth/callback
  2. Stripe → Developers → Webhooks → Add endpoint:
       ${url}/api/stripe/webhook   (events: checkout.session.completed, checkout.session.expired)
     Put its signing secret in Vercel:  npx vercel env add STRIPE_WEBHOOK_SECRET production
     then redeploy:  npx vercel --prod
  3. Replace the invalid RESEND_API_KEY the same way when you have a working key.
  4. Run migrations against the same DB if you haven't:  npm run db:migrate && npm run seed
`);
