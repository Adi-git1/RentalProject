// One-shot Vercel deploy: pushes env vars from .env.local, deploys to prod,
// sets NEXT_PUBLIC_SITE_URL to the resulting domain, redeploys.
//
// Prereqs (run once yourself — they need a browser):
//   npx vercel login
//   npx vercel link
//
// Then:  npm run deploy
import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";

function vercel(args, { capture = false } = {}) {
  const cmd = ["npx", "vercel", ...args].join(" ");
  return execFileSync(cmd, {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    shell: true,
    stdio: capture ? ["ignore", "pipe", "inherit"] : "inherit",
  });
}

function sh(cmd) {
  return execFileSync(cmd, { encoding: "utf8", shell: true, maxBuffer: 64 * 1024 * 1024 });
}

// --- checks ---
try {
  console.log(`Vercel user: ${vercel(["whoami"], { capture: true }).trim()}`);
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
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
  if (!m) continue;
  let v = m[2];
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1);
  }
  env[m[1]] = v;
}

const skip = (k) =>
  k.startsWith("VERCEL_") ||
  ["SUPABASE_DB_URL", "NEXT_PUBLIC_SITE_URL"].includes(k);

function setEnv(key, value, envs = "production,preview,development") {
  // config = readable later (fine for NEXT_PUBLIC_*, which ship to the browser
  // anyway); secret = write-only. Both decrypt at build time.
  const type = key.startsWith("NEXT_PUBLIC_") ? "config" : "secret";
  const safe = String(value).replace(/'/g, `'\\''`);
  sh(
    `npx vercel env add ${key} ${envs} --type ${type} --force --yes --value '${safe}'`,
  );
}

console.log("\nPushing env vars to Vercel...");
for (const [key, value] of Object.entries(env)) {
  if (skip(key) || !value) continue;
  setEnv(key, value);
  console.log(`  ✓ ${key}`);
}

// --- first deploy ---
console.log("\nDeploying to production (this builds — a few minutes)...");
const out = vercel(["--prod", "--yes"], { capture: true });
process.stdout.write(out);
const url = (out.match(/https:\/\/[^\s]+\.vercel\.app/g) || []).pop();
if (!url) {
  console.error("\nCould not read the deployment URL from Vercel output.");
  process.exit(1);
}

// --- set site URL + redeploy ---
console.log(`\nSetting NEXT_PUBLIC_SITE_URL=${url} and redeploying...`);
setEnv("NEXT_PUBLIC_SITE_URL", url);
vercel(["--prod", "--yes"]);

console.log(`\n✅ Deployed: ${url}\n`);
console.log(`Finish setup:
  1. Supabase → Authentication → URL Configuration
       Site URL:       ${url}
       Redirect URLs:  ${url}/auth/callback
  2. Stripe → Developers → Webhooks → Add endpoint
       ${url}/api/stripe/webhook   (checkout.session.completed, checkout.session.expired)
     Then:  npx vercel env add STRIPE_WEBHOOK_SECRET production,preview --type secret --force
            npx vercel --prod
  3. Replace RESEND_API_KEY (current one is invalid) the same way.
`);
