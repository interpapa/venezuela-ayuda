// Syncs structural damage reports from terremotovenezuela.com API.
// Idempotent: upserts records safely via PostgREST resolution=merge-duplicates
// based on (source, external_id) unique constraint.

import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";

const DRY = process.argv.includes("--dry");
const API_URL = "https://api.terremotovenezuela.com/api/v1/reports";

const VALID_SEVERITIES = new Set(['CRACKS', 'PARTIAL', 'COLLAPSE_RISK', 'COLLAPSED']);

async function fetchExternalReports() {
  try {
    const res = await fetch(API_URL, { headers: { "User-Agent": "venezuela-ayuda-sync/1.0" } });
    if (!res.ok) throw new Error(`terremotovenezuela API HTTP ${res.status}`);
    const json = await res.json();
    const records = Array.isArray(json.data) ? json.data : (Array.isArray(json) ? json : []);
    
    const out = [];
    for (const r of records) {
      if (!r.latitude || !r.longitude) continue;
      
      const lat = parseFloat(r.latitude);
      const lng = parseFloat(r.longitude);
      if (isNaN(lat) || isNaN(lng)) continue;
      
      const originalId = r.id || r._id;
      if (!originalId) {
        console.warn("Skipping record without valid external ID");
        continue;
      }

      out.push({
        external_id: `terremoto_${originalId}`,
        place_name: String(r.title || r.name || r.place_name || "Reporte externo"),
        description: typeof r.description === 'string' ? r.description : (typeof r.details === 'string' ? r.details : null),
        severity: VALID_SEVERITIES.has(r.severity) ? r.severity : "PARTIAL",
        city: typeof r.city === 'string' ? r.city : null,
        latitude: lat,
        longitude: lng,
        source: "terremotovenezuela.com",
        source_url: typeof r.url === 'string' ? r.url : `https://terremotovenezuela.com/`,
        dedup_key: `${lat.toFixed(4)},${lng.toFixed(4)}`,
      });
    }
    return out;
  } catch (err) {
    console.error("Error fetching from Terremoto API:", err.message);
    process.exit(1); // Fail loudly so CI catches API outages
  }
}

const rows = await fetchExternalReports();
console.log(`Fetched ${rows.length} valid rows from terremotovenezuela.com`);

if (DRY) {
  console.log("DRY RUN sample: ", rows[0]);
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

// Perform UPSERT via internal RPC to enforce HUB contract (audit logging).
const rpcPayload = {
  p_table: "damaged_reports",
  p_rows: rows,
  p_partner: "11111111-1111-4111-8111-111111111111", // Default platform partner
  p_source: "terremotovenezuela.com",
  p_request_id: randomUUID(),
  p_ip: "",
  p_user_agent: "sync-terremoto-action"
};

const ins = await fetch(`${REST}/rpc/ingest_reports`,
  { 
    method: "POST", 
    headers: H, 
    body: JSON.stringify(rpcPayload) 
  });
if (!ins.ok) { console.error(`insert failed: ${ins.status} ${await ins.text()}`); process.exit(1); }

console.log(`Successfully synced ${rows.length} rows to ${URL_}`);
