/**
 * Generates `src/constants/cities.json` — `{ [ISO-3166 alpha-2]: string[] }`,
 * city names only, for the register form's city picker.
 *
 * Source: dr5hn/countries-states-cities-database (ODbL-1.0 — attribution
 * required, see ATTRIBUTION below). We ship our own trimmed copy instead of an
 * npm package: `country-state-city` is GPL-3.0 + unmaintained + 8 MB, and
 * `@countrystatecity/countries` bundles 46 MB under Metro.
 *
 * Re-run to refresh: `npm run cities:build`. Bump RELEASE to pull newer data.
 */
import { writeFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';

const RELEASE = 'v3.2-export.7';
const SOURCE_URL = `https://github.com/dr5hn/countries-states-cities-database/releases/download/${RELEASE}/csv-cities.csv.gz`;
const OUT = new URL('../src/constants/cities.json', import.meta.url);

// Admin-area duplicates of real towns ("Bashkia Berat" next to "Berat",
// "Rrethi i Tiranës", "Durrës District", "Ohrid Opština").
const NOISE = /^(Bashkia |Rrethi i )| District$| Opština$/;

// Local spelling for our audience: Albanian names in Albania and Kosovo (the
// dataset mixes in English/Serbian forms), Latin script in North Macedonia
// (the dataset mixes in Cyrillic).
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
  MK: {
    Арачиново: 'Aračinovo',
    Идризово: 'Idrizovo',
    Јурумлери: 'Jurumleri',
    Клечовце: 'Klečovce',
    Петровец: 'Petrovec',
    Ранковце: 'Rankovce',
    Слупчане: 'Slupčane',
    Сопиште: 'Sopište',
    'Старо Нагоричане': 'Staro Nagoričane',
    'Чучер - Сандево': 'Čučer-Sandevo',
  },
};

// Municipality seats the dataset is missing, checked against the official
// lists: Albania's 61 bashki, Kosovo's 38 komuna, North Macedonia's towns.
const ADD = {
  AL: ['Belsh', 'Cërrik', 'Elbasan', 'Has', 'Prrenjas'],
  XK: ['Junik', 'Mitrovicë e Veriut'],
  MK: ['Debar'],
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
  let name = r[nameIdx]?.trim();
  if (!code || !name || NOISE.test(name)) continue;
  name = RENAME[code]?.[name] ?? name;
  (byCountry[code] ??= new Set()).add(name);
}
for (const [code, names] of Object.entries(ADD)) names.forEach((n) => byCountry[code].add(n));

const out = Object.fromEntries(
  Object.keys(byCountry)
    .sort()
    .map((code) => [code, [...byCountry[code]].sort((a, b) => a.localeCompare(b))]),
);
writeFileSync(OUT, JSON.stringify(out));
console.log(
  `cities.json: ${Object.keys(out).length} countries, ${rows.length} source rows (${RELEASE})`,
);
