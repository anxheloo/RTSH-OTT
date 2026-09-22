/**
 * Generates `src/constants/cities.json` — `{ [ISO-3166 alpha-2]: string[] }`,
 * city names only, for the register form's city picker.
 *
 * Two tiers, because the audience is two-tiered:
 *  - FULL_COUNTRIES (Albania, Kosovo, Montenegro): every town, from
 *    dr5hn/countries-states-cities-database (ODbL-1.0), curated below.
 *  - Every other country: only its TOP_N most populous cities, capital always
 *    included, from GeoNames `cities15000` (CC BY 4.0). The picker's pinned
 *    "Other" covers everyone else. dr5hn can't rank these — its `type` puts
 *    Munich and Milan in the same bucket as regions like Upper Bavaria, and it
 *    has no Belgrade at all — so population + GeoNames' capital flag decide.
 *
 * Both licences require attribution; the app shows it under Settings
 * (`settings.credits`). We ship our own trimmed copy instead of an npm package:
 * `country-state-city` is GPL-3.0 + unmaintained + 8 MB, and
 * `@countrystatecity/countries` bundles 46 MB under Metro.
 *
 * Re-run to refresh: `npm run cities:build` (needs `unzip` on PATH). Bump
 * RELEASE to pull newer dr5hn data; GeoNames always serves its latest dump.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';

const RELEASE = 'v3.2-export.7';
const SOURCE_URL = `https://github.com/dr5hn/countries-states-cities-database/releases/download/${RELEASE}/csv-cities.csv.gz`;
const GEONAMES_URL = 'https://download.geonames.org/export/dump/cities15000.zip';
const OUT = new URL('../src/constants/cities.json', import.meta.url);

/** Countries whose full town list ships; the rest get their largest cities only. */
const FULL_COUNTRIES = new Set(['AL', 'XK', 'ME']);
const TOP_N = 20;

// Admin-area duplicates of real towns ("Bashkia Berat" next to "Berat",
// "Rrethi i Tiranës", "Durrës District", "Ohrid Opština").
const NOISE = /^(Bashkia |Rrethi i )| District$| Opština$/;

// Local spelling for our audience: Albanian names in Albania and Kosovo (the
// dataset mixes in English/Serbian forms).
const RENAME = {
  AL: { Tirana: 'Tiranë' },
  XK: {
    Pristina: 'Prishtinë',
    Glogovac: 'Drenas',
    Orahovac: 'Rahovec',
    'Kosovo Polje': 'Fushë Kosovë',
    'Suva Reka': 'Suharekë',
    Mališevo: 'Malishevë',
    Kamenica: 'Kamenicë',
    Vitina: 'Viti',
    Istok: 'Istog',
    Klina: 'Klinë',
    Srbica: 'Skënderaj',
    Kačanik: 'Kaçanik',
    Gračanica: 'Graçanicë',
    Lipljan: 'Lipjan',
    Podujeva: 'Podujevë',
    Zvečan: 'Zveçan',
    Štrpce: 'Shtërpcë',
    Mamuša: 'Mamushë',
    Klokot: 'Kllokot',
    Ranilug: 'Ranillug',
    'Novo Brdo': 'Novobërdë',
  },
};

// Municipality seats the dataset is missing, checked against the official
// lists: Albania's 61 bashki, Kosovo's 38 komuna.
const ADD = {
  AL: ['Belsh', 'Cërrik', 'Elbasan', 'Has', 'Prrenjas'],
  XK: ['Junik', 'Mitrovicë e Veriut'],
};

/** Minimal RFC-4180 parser: quoted fields may contain commas, quotes, newlines. */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') ((field += '"'), i++);
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') (row.push(field), (field = ''));
    else if (c === '\n') (row.push(field), rows.push(row), (row = []), (field = ''));
    else if (c !== '\r') field += c;
  }
  if (field || row.length) (row.push(field), rows.push(row));
  return rows;
}

const res = await fetch(SOURCE_URL);
if (!res.ok) throw new Error(`Download failed: ${res.status} ${SOURCE_URL}`);
const [header, ...rows] = parseCsv(
  gunzipSync(Buffer.from(await res.arrayBuffer())).toString('utf8'),
);
const nameIdx = header.indexOf('name');
const codeIdx = header.indexOf('country_code');

const byCountry = {};
for (const r of rows) {
  const code = r[codeIdx];
  if (!FULL_COUNTRIES.has(code)) continue;
  let name = r[nameIdx]?.trim();
  if (!name || NOISE.test(name)) continue;
  name = RENAME[code]?.[name] ?? name;
  (byCountry[code] ??= new Set()).add(name);
}
for (const [code, names] of Object.entries(ADD)) names.forEach((n) => byCountry[code].add(n));

// ---- Everyone else: the TOP_N largest cities per country (GeoNames) ----------
// Tab-separated, no header: [1] name · [7] feature code · [8] country · [14] population.
// PPLX (a district of a city: "Paris 15 Vaugirard", "Zürich (Kreis 11)") and
// historical / abandoned places are dropped; PPLC marks the capital.
const SKIP_FEATURES = new Set(['PPLX', 'PPLH', 'PPLQ', 'PPLW']);
const zipRes = await fetch(GEONAMES_URL);
if (!zipRes.ok) throw new Error(`Download failed: ${zipRes.status} ${GEONAMES_URL}`);
const zipPath = join(mkdtempSync(join(tmpdir(), 'cities-')), 'cities15000.zip');
writeFileSync(zipPath, Buffer.from(await zipRes.arrayBuffer()));
const geonames = execFileSync('unzip', ['-p', zipPath, 'cities15000.txt'], {
  maxBuffer: 64 * 1024 * 1024,
}).toString('utf8');

const ranked = {};
for (const line of geonames.split('\n')) {
  const f = line.split('\t');
  const [name, feature, code, population] = [f[1]?.trim(), f[7], f[8], Number(f[14]) || 0];
  if (!name || !code || FULL_COUNTRIES.has(code) || SKIP_FEATURES.has(feature)) continue;
  (ranked[code] ??= []).push({ name, population, capital: feature === 'PPLC' });
}
for (const [code, places] of Object.entries(ranked)) {
  places.sort((a, b) => b.population - a.population);
  const names = new Set(places.filter((p) => p.capital).map((p) => p.name));
  for (const p of places) {
    if (names.size >= TOP_N) break;
    // GeoNames codes some city districts as plain PPL ("Paris 15 Vaugirard");
    // they always extend a larger, already-kept city's name with a number or bracket.
    const isDistrict = [...names].some(
      (n) => p.name.startsWith(`${n} `) && /[\d(]/.test(p.name[n.length + 1]),
    );
    if (isDistrict) continue;
    names.add(p.name);
  }
  byCountry[code] = names;
}

const out = Object.fromEntries(
  Object.keys(byCountry)
    .sort()
    .map((code) => [code, [...byCountry[code]].sort((a, b) => a.localeCompare(b))]),
);
writeFileSync(OUT, JSON.stringify(out));
console.log(
  `cities.json: ${Object.keys(out).length} countries (full: ${[...FULL_COUNTRIES].join(', ')}; top ${TOP_N} elsewhere)`,
);
