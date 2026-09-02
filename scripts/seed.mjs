// Seeds an admin user + sample inventory so the site looks real immediately.
// Reads inventory.csv from the project root if present, otherwise uses samples.
// Run: npm run seed
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const adminEmail = process.env.ADMIN_EMAIL;
const adminPassword = process.env.SEED_ADMIN_PASSWORD || "AnyTimeRental!2026";

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const slugify = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const photos = (slug, n = 3) =>
  Array.from({ length: n }, (_, i) => `https://picsum.photos/seed/atr-${slug}-${i + 1}/1200/900`);

const SAMPLE_ITEMS = [
  {
    name: "6ft Folding Table",
    category: "Tables & Seating",
    description:
      "Sturdy 6-foot rectangular folding table, seats 6–8. Wipe-clean top, folds flat for transport.",
    specs: { Length: "72 in", Width: "30 in", Material: "HDPE top, steel frame" },
    dimensions: '72" x 30" x 29"',
    weight: "32 lb",
    price_day: 12,
    price_weekend: 20,
    price_week: 45,
    deposit: 20,
    quantity: 40,
  },
  {
    name: "White Resin Folding Chair",
    category: "Tables & Seating",
    description:
      "Classic white padded folding chair. Indoor/outdoor, stackable, great for ceremonies and receptions.",
    specs: { Color: "White", "Weight capacity": "300 lb" },
    dimensions: '18" x 19" x 34"',
    weight: "8 lb",
    price_day: 2.5,
    price_weekend: 4,
    price_week: 10,
    deposit: 2,
    quantity: 200,
  },
  {
    name: "10x10 Canopy Tent",
    category: "Tents & Canopies",
    description:
      "Pop-up 10x10 canopy with white top. Shade for a vendor booth, dessert table, or backyard party.",
    specs: { Footprint: "10 x 10 ft", "Peak height": "10.5 ft", Setup: "2 people, ~10 min" },
    dimensions: "10 x 10 ft",
    weight: "48 lb",
    price_day: 55,
    price_weekend: 85,
    price_week: 210,
    deposit: 75,
    quantity: 8,
  },
  {
    name: "20x20 Frame Tent",
    category: "Tents & Canopies",
    description:
      "400 sq ft white frame tent, no center pole. Seats ~40 guests banquet-style. Delivery & setup recommended.",
    specs: { Size: "20 x 20 ft", Capacity: "~40 seated", "Install": "Owner setup" },
    dimensions: "20 x 20 ft",
    weight: "300 lb",
    price_day: 220,
    price_weekend: 300,
    price_week: 850,
    deposit: 200,
    quantity: 3,
  },
  {
    name: "Castle Bounce House",
    category: "Bounce Houses",
    description:
      "13x13 castle-themed bounce house with safety netting and front ramp. Includes blower. Adult supervision required.",
    specs: { Size: "13 x 13 x 12 ft", Capacity: "6–8 kids", Power: "1x standard outlet within 50 ft" },
    dimensions: "13 x 13 x 12 ft",
    weight: "180 lb",
    price_day: 145,
    price_weekend: 200,
    price_week: 600,
    deposit: 150,
    quantity: 4,
  },
  {
    name: "Water Slide Combo (Wet/Dry)",
    category: "Bounce Houses",
    description:
      "18ft dual-lane inflatable slide with splash pool. Can run wet or dry. Blower included.",
    specs: { Height: "18 ft", Lanes: "2", Hose: "Customer provides garden hose" },
    dimensions: "31 x 13 x 18 ft",
    weight: "260 lb",
    price_day: 245,
    price_weekend: 320,
    price_week: 950,
    deposit: 200,
    quantity: 2,
  },
  {
    name: "Powered PA Speaker + Stand",
    category: "Audio & Lighting",
    description:
      "15-inch 1000W powered speaker with tripod stand. Bluetooth + XLR/1-4 inch inputs. Great for speeches and playlists up to ~150 guests.",
    specs: { Power: "1000W peak", Inputs: "Bluetooth, XLR, 1/4 in", Includes: "Speaker, stand, cable" },
    dimensions: '14" x 13" x 27"',
    weight: "34 lb",
    price_day: 45,
    price_weekend: 70,
    price_week: 180,
    deposit: 100,
    quantity: 6,
  },
  {
    name: "Wireless Microphone Pair",
    category: "Audio & Lighting",
    description:
      "Dual handheld UHF wireless mic system with receiver. Pairs with any speaker that has an XLR or 1/4-inch input.",
    specs: { Channels: "2", Range: "~100 ft", Batteries: "AA (included)" },
    dimensions: "Rack receiver + 2 mics",
    weight: "6 lb",
    price_day: 25,
    price_weekend: 40,
    price_week: 100,
    deposit: 60,
    quantity: 8,
  },
  {
    name: "Warm White String Lights (100 ft)",
    category: "Audio & Lighting",
    description:
      "Commercial-grade Edison bulb string lights, 100 ft with 50 shatterproof bulbs. Warm ambient glow for tents and patios.",
    specs: { Length: "100 ft", Bulbs: "50 x S14 LED", Connectors: "End-to-end linkable" },
    dimensions: "100 ft coil",
    weight: "9 lb",
    price_day: 20,
    price_weekend: 32,
    price_week: 80,
    deposit: 25,
    quantity: 15,
  },
  {
    name: "Popcorn Machine (8 oz)",
    category: "Concessions",
    description:
      "Tabletop 8-ounce kettle popcorn machine with tempered glass. Makes ~40 servings per hour. Starter pack of 4 kits included.",
    specs: { Kettle: "8 oz", Output: "~40 servings/hr", Includes: "4 popcorn kits, scoop, bags" },
    dimensions: '18" x 14" x 24"',
    weight: "38 lb",
    price_day: 45,
    price_weekend: 65,
    price_week: 170,
    deposit: 60,
    quantity: 5,
  },
  {
    name: "Cotton Candy Machine",
    category: "Concessions",
    description:
      "Stainless bowl cotton candy machine with bubble cover. Includes 2 tubs of floss sugar and 50 cones.",
    specs: { Bowl: '20" stainless', Includes: "2 sugar tubs, 50 cones", Power: "Standard outlet" },
    dimensions: '22" x 22" x 18"',
    weight: "45 lb",
    price_day: 45,
    price_weekend: 65,
    price_week: 170,
    deposit: 60,
    quantity: 4,
  },
  {
    name: "65qt Rolling Cooler",
    category: "Coolers & Catering",
    description:
      "Heavy-duty 65-quart wheeled cooler. Holds ~85 cans plus ice. Keeps ice 3+ days.",
    specs: { Capacity: "65 qt", Cans: "~85", Wheels: "Yes" },
    dimensions: '31" x 17" x 19"',
    weight: "23 lb",
    price_day: 18,
    price_weekend: 28,
    price_week: 70,
    deposit: 30,
    quantity: 10,
  },
  {
    name: "5-Gallon Beverage Dispenser",
    category: "Coolers & Catering",
    description:
      "Insulated 5-gallon drink dispenser for lemonade, iced tea, or water. Drip-free spigot, carry handles.",
    specs: { Capacity: "5 gal", Insulated: "Yes", "Keeps cold": "~8 hr" },
    dimensions: '12" x 12" x 21"',
    weight: "7 lb",
    price_day: 10,
    price_weekend: 16,
    price_week: 40,
    deposit: 15,
    quantity: 12,
  },
  {
    name: "6ft Round Banquet Table",
    category: "Tables & Seating",
    description:
      "60-inch round table, seats 8–10 guests. Pairs with standard 120-inch round linens.",
    specs: { Diameter: "60 in", Seats: "8–10" },
    dimensions: '60" round x 30" H',
    weight: "40 lb",
    price_day: 14,
    price_weekend: 22,
    price_week: 55,
    deposit: 25,
    quantity: 25,
  },
  {
    name: "Cornhole Set (Regulation)",
    category: "Games & Fun",
    description:
      "Pair of regulation 2x4 cornhole boards with 8 all-weather bags. Folding legs, carry handles.",
    specs: { Boards: "24 x 48 in", Bags: "8 (4 per color)", Regulation: "ACL spec" },
    dimensions: '48" x 24" folded pair',
    weight: "50 lb",
    price_day: 20,
    price_weekend: 30,
    price_week: 75,
    deposit: 30,
    quantity: 8,
  },
  {
    name: "Uplighting Package (8 LED Cans)",
    category: "Decor",
    description:
      "Eight battery-powered LED uplights with remote. Set any color to wash walls, tents, or a head table. ~8 hr runtime.",
    specs: { Fixtures: "8", Control: "IR remote", Runtime: "~8 hr" },
    dimensions: "Road case 20 x 14 x 12 in",
    weight: "28 lb",
    price_day: 60,
    price_weekend: 90,
    price_week: 240,
    deposit: 100,
    quantity: 3,
  },
];

function parseCsv(text) {
  const rows = [];
  let field = "";
  let record = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      record.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      if (field !== "" || record.length) {
        record.push(field);
        rows.push(record);
        record = [];
        field = "";
      }
    } else {
      field += c;
    }
  }
  if (field !== "" || record.length) {
    record.push(field);
    rows.push(record);
  }
  return rows;
}

function itemsFromCsv(path) {
  const rows = parseCsv(readFileSync(path, "utf8")).filter((r) => r.some((c) => c.trim() !== ""));
  const header = rows.shift().map((h) => h.trim().toLowerCase());
  const idx = (name) => header.indexOf(name);
  return rows.map((r) => {
    const get = (name) => (idx(name) >= 0 ? r[idx(name)]?.trim() : undefined);
    const num = (name) => {
      const v = get(name);
      return v ? Number(v.replace(/[^0-9.]/g, "")) : undefined;
    };
    let specs = {};
    const rawSpecs = get("specs");
    if (rawSpecs) {
      try {
        specs = JSON.parse(rawSpecs);
      } catch {
        specs = {};
      }
    }
    return {
      name: get("name"),
      category: get("category") || "Games & Fun",
      description: get("description") || "",
      specs,
      dimensions: get("dimensions") || null,
      weight: get("weight") || null,
      price_day: num("price_day") ?? 0,
      price_weekend: num("price_weekend") ?? null,
      price_week: num("price_week") ?? null,
      deposit: num("deposit") ?? 0,
      quantity: num("quantity") ?? 1,
    };
  });
}

async function ensureAdmin() {
  if (!adminEmail) {
    console.warn("ADMIN_EMAIL not set — skipping admin user creation");
    return;
  }
  await supabase.from("admin_allowlist").upsert({ email: adminEmail.toLowerCase() });

  const { data: created, error } = await supabase.auth.admin.createUser({
    email: adminEmail,
    password: adminPassword,
    email_confirm: true,
    user_metadata: { name: "AnyTimeRental Owner" },
  });

  let userId = created?.user?.id;
  if (error && !/already/i.test(error.message)) {
    console.warn("createUser:", error.message);
  }
  if (!userId) {
    const { data: list } = await supabase.auth.admin.listUsers();
    userId = list?.users?.find((u) => u.email?.toLowerCase() === adminEmail.toLowerCase())?.id;
  }
  if (userId) {
    await supabase
      .from("users")
      .upsert({ id: userId, email: adminEmail, role: "admin", name: "AnyTimeRental Owner" });
    console.log(`✓ Admin user ready: ${adminEmail} / ${adminPassword}`);
  } else {
    console.warn("Could not resolve admin user id");
  }
}

async function seedItems() {
  const csvPath = join(root, "inventory.csv");
  const items = existsSync(csvPath) ? itemsFromCsv(csvPath) : SAMPLE_ITEMS;
  console.log(`Seeding ${items.length} items ${existsSync(csvPath) ? "from inventory.csv" : "(samples)"}`);

  for (const item of items) {
    if (!item.name) continue;
    const slug = slugify(item.name);
    const { data: upserted, error } = await supabase
      .from("items")
      .upsert(
        {
          name: item.name,
          slug,
          category: item.category,
          description: item.description,
          specs: item.specs,
          dimensions: item.dimensions,
          weight: item.weight,
          price_day: item.price_day,
          price_weekend: item.price_weekend,
          price_week: item.price_week,
          deposit: item.deposit,
          quantity: item.quantity,
          active: true,
        },
        { onConflict: "slug" },
      )
      .select("id")
      .single();

    if (error) {
      console.warn(`  ! ${item.name}: ${error.message}`);
      continue;
    }

    await supabase.from("item_photos").delete().eq("item_id", upserted.id);
    await supabase.from("item_photos").insert(
      photos(slug).map((url, i) => ({ item_id: upserted.id, url, sort: i })),
    );
    console.log(`  ✓ ${item.name}`);
  }
}

async function main() {
  await ensureAdmin();
  await seedItems();
  console.log("\nSeed complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
