import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const SUPABASE_URL = (process.env.SUPABASE_URL || "https://idurlccrarznnnqixxsd.supabase.co").replace(/\/+$/, "");
const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY;
if (!SUPABASE_KEY) throw new Error("Missing SUPABASE_KEY / SUPABASE_ANON_KEY.");

const CATEGORIES = ["hostels", "tiffins", "libraries", "cafes", "bookstores"];
const PUBLIC_STATUSES = "in.(active,published,approved,live)";
const PAGE_SIZE = 500;
const OUTPUT = path.join(ROOT, "data", "public-listings.json");

function makeUrl(table, select) {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
  url.searchParams.set("select", select);
  return url;
}
function authHeaders(extra = {}) {
  return { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, ...extra };
}
async function fetchActiveRows(table) {
  const rows = [];
  let exactCount = null;
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const url = makeUrl(table, "*");
    url.searchParams.set("status", PUBLIC_STATUSES);
    url.searchParams.set("order", "created_at.desc,id.asc");
    const response = await fetch(url, { headers: authHeaders({
      Range: `${offset}-${offset + PAGE_SIZE - 1}`,
      "Range-Unit": "items",
      Prefer: "count=exact"
    }) });
    if (!response.ok) throw new Error(`Supabase listing read failed for ${table}: HTTP ${response.status} ${(await response.text()).slice(0, 400)}`);
    const contentRange = response.headers.get("content-range") || "";
    const countMatch = contentRange.match(/\/(\d+)$/);
    if (countMatch) exactCount = Number(countMatch[1]);
    const batch = await response.json();
    if (!Array.isArray(batch)) throw new Error(`Unexpected response for ${table}`);
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) break;
  }
  return { rows, total: exactCount ?? rows.length };
}
async function main() {
  const listings = {}, counts = {};
  await Promise.all(CATEGORIES.map(async table => {
    const result = await fetchActiveRows(table);
    listings[table] = result.rows;
    counts[table] = result.total;
    console.log(`${table}: ${result.rows.length} public active rows; ${result.total} public active count`);
  }));
  const stablePayload = { schemaVersion: 1, counts, listings };
  let previous = null;
  try { previous = JSON.parse(await readFile(OUTPUT, "utf8")); } catch {}
  const stable = value => JSON.stringify({
    schemaVersion: value?.schemaVersion, counts: value?.counts, listings: value?.listings
  });
  if (previous && stable(previous) === stable(stablePayload)) {
    console.log("Public listing snapshot unchanged; skipping file write and Git commit.");
    return;
  }
  const payload = { schemaVersion: 1, generatedAt: new Date().toISOString(), counts, listings };
  await mkdir(path.dirname(OUTPUT), { recursive: true });
  const json = JSON.stringify(payload) + "\n";
  await writeFile(OUTPUT, json, "utf8");
  console.log(`Wrote public snapshot: ${Object.values(listings).reduce((sum, rows) => sum + rows.length, 0)} listings, ${Buffer.byteLength(json)} bytes.`);
}
main().catch(error => { console.error(error); process.exit(1); });

// The output is intentionally committed only when the public listing data changes.
