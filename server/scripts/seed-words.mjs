/**
 * Bulk-insert wordbank.generated.json into Supabase.
 * Requires server/.env with SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 * Run: node server/scripts/seed-words.mjs
 */
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in server/.env");
  process.exit(1);
}

const JSON_PATH = path.join(__dirname, "../data/wordbank.generated.json");
const sb = createClient(url, key, { auth: { persistSession: false } });

const BATCH = 400;

async function main() {
  if (!fs.existsSync(JSON_PATH)) {
    console.error("Missing", JSON_PATH, "— run: npm run build:words");
    process.exit(1);
  }
  const data = JSON.parse(fs.readFileSync(JSON_PATH, "utf-8"));
  const rows = [];
  for (const [category, words] of Object.entries(data)) {
    if (!Array.isArray(words)) continue;
    for (const word of words) {
      rows.push({ category, word: String(word) });
    }
  }
  console.log(`Inserting ${rows.length} rows…`);

  const cats = [
    "sports",
    "countries",
    "objects",
    "places",
    "animals",
    "transport",
    "technology",
    "science",
  ];
  const { error: delErr } = await sb.from("words").delete().in("category", cats);
  if (delErr) console.warn("Pre-delete:", delErr.message);

  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    const { error } = await sb.from("words").insert(chunk, { defaultToNull: true });
    if (error) {
      console.error("Insert failed at", i, error);
      process.exit(1);
    }
    process.stdout.write(`\r  ${Math.min(i + BATCH, rows.length)}/${rows.length}`);
  }
  console.log("\nDone.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
