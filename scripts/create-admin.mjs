// Create (or promote) an administrator login.
// Usage:
//   node scripts/create-admin.mjs <email> <password>
//   node scripts/create-admin.mjs you@example.com "S0me-Strong-Pass"
//
// - Adds the email to admin_allowlist so it stays admin on any future sign-in.
// - Creates a confirmed auth user (or updates the password if it already exists).
// - Sets the public.users role to 'admin'.
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });

const [, , emailArg, passwordArg] = process.argv;
const email = (emailArg || process.env.ADMIN_EMAIL || "").trim();
const password = passwordArg || process.env.SEED_ADMIN_PASSWORD || "";

if (!email || !password) {
  console.error("Usage: node scripts/create-admin.mjs <email> <password>");
  process.exit(1);
}
if (password.length < 8) {
  console.error("Password must be at least 8 characters.");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  await supabase.from("admin_allowlist").upsert({ email: email.toLowerCase() });

  const { data: created, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name: "AnyTimeRental Admin" },
  });

  let userId = created?.user?.id;
  if (error && !/already|registered|exists/i.test(error.message)) {
    console.error("createUser:", error.message);
  }

  if (!userId) {
    const { data: list } = await supabase.auth.admin.listUsers();
    userId = list?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase())?.id;
    if (userId) {
      await supabase.auth.admin.updateUserById(userId, { password, email_confirm: true });
      console.log("Existing user — password updated.");
    }
  }

  if (!userId) {
    console.error("Could not create or find the user.");
    process.exit(1);
  }

  await supabase
    .from("users")
    .upsert({ id: userId, email, role: "admin", name: "AnyTimeRental Admin" });

  console.log(`\n✅ Admin ready:`);
  console.log(`   email:    ${email}`);
  console.log(`   password: ${password}`);
  console.log(`   sign in at /login (Password tab), then open /admin`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
