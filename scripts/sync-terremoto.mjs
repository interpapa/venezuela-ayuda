// Syncs structural damage reports from terremotovenezuela.com API.
// Idempotent: clears prior feed-sourced rows (external_id like 'terremoto_%')
// and re-inserts.

import { readFileSync } from "node:fs";

const DRY = process.argv.includes("--dry");
const API_URL = "https://api.terremotovenezuela.com/api/v1/reports";

async function fetchExternalReports() {
  try {
    const res = await fetch(API_URL, { headers: { "User-Agent": "venezuela-ayuda-sync/1.0" } });
    if (!res.ok) throw new Error(`terremotovenezuela API HTTP ${res.status}`);
    const json = await res.json();
    const records = Array.isArray(json.data) ? json.data : (Array.isArray(json) ? json : []);
    
    const out = [];
    for (const r of records) {
      if (!r.latitude || !r.longitude) continue;
      out.push({
        external_id: `terremoto_${r.id || r._id || Math.random().toString(36).slice(2)}`,
        place_name: r.title || r.name || r.place_name || "Reporte externo",
        description: r.description || r.details || null,
        severity: r.severity || "PARTIAL",
        city: r.city || null,
        latitude: parseFloat(r.latitude),
        longitude: parseFloat(r.longitude),
        status: "OPEN",
        source: "terremotovenezuela.com",
        source_url: r.url || `https://terremotovenezuela.com/`,
        dedup_key: `${parseFloat(r.latitude).toFixed(4)},${parseFloat(r.longitude).toFixed(4)}`,
      });
    }
    return out;
  } catch (err) {
    console.error("Error fetching from Terremoto API:", err.message);
    return [];
  }
}

const rows = await fetchExternalReports();
console.log(`Fetched ${rows.length} valid rows from terremotovenezuela.com`);

if (DRY) {
  console.log("DRY RUN: ", rows[0]);
  process.exit(0);
}

if (!rows.length) {
  console.log("No rows to sync. Exiting.");
  process.exit(0);
}

let env = {};
try {
  env = Object.fromEntries(readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n").filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }));
} catch {}
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SECRET_KEY || env.SUPABASE_SECRET_KEY;
const REST = URL_ && KEY ? `${URL_}/rest/v1` : null;
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };

if (!REST) { console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY"); process.exit(1); }

const del = await fetch(`${REST}/damaged_reports?external_id=like.terremoto_*`,
  { method: "DELETE", headers: { ...H, Prefer: "return=minimal" } });
if (!del.ok) { console.error(`delete failed: ${del.status} ${await del.text()}`); process.exit(1); }

const ins = await fetch(`${REST}/damaged_reports`,
  { method: "POST", headers: { ...H, Prefer: "return=minimal" }, body: JSON.stringify(rows) });
if (!ins.ok) { console.error(`insert failed: ${ins.status} ${await ins.text()}`); process.exit(1); }

console.log(`Successfully synced ${rows.length} rows to ${URL_}`);
