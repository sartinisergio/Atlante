// Import una tantum, sola lettura sulle fonti, nel catalogo condiviso Atlante (Fase 2).
// Fonti:
//   MAP    -> Firestore pubblico (progetto analisi-manuali-zanichelli, regole allow read: if true
//             su manuals/frameworks — verificato in firebase-rules-sicure.txt e via REST diretta)
//   MATRIX -> catalogo_manuali.json / catalogo_framework.json, copia locale del JSON pubblico
//             (public/static/data del checkout locale di Matrix-Intelligence)
//
// Non scrive né richiama nessuna delle app esistenti. Non decide da solo i doppioni:
// li segnala in import-report/possibili-doppioni-manuali.json per revisione manuale,
// come da piano ("deduplica manuale dei doppioni prevedibili").

import { createClient } from '@supabase/supabase-js';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import 'dotenv/config';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MATRIX_DATA_DIR = process.env.MATRIX_DATA_DIR;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !MATRIX_DATA_DIR) {
  console.error('Mancano variabili in .env (vedi .env.example): SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, MATRIX_DATA_DIR');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const MAP_PROJECT_ID = 'analisi-manuali-zanichelli';

// ---- Firestore REST: valori tipizzati -> valori JS normali ----
function parseFirestoreValue(v) {
  if (v == null) return null;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('nullValue' in v) return null;
  if ('timestampValue' in v) return v.timestampValue;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(parseFirestoreValue);
  if ('mapValue' in v) return parseFirestoreFields(v.mapValue.fields || {});
  return null;
}
function parseFirestoreFields(fields) {
  const out = {};
  for (const [k, v] of Object.entries(fields)) out[k] = parseFirestoreValue(v);
  return out;
}

async function fetchMapCollection(collection) {
  const docs = [];
  let pageToken;
  do {
    const url = new URL(
      `https://firestore.googleapis.com/v1/projects/${MAP_PROJECT_ID}/databases/(default)/documents/${collection}`
    );
    url.searchParams.set('pageSize', '300');
    if (pageToken) url.searchParams.set('pageToken', pageToken);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`MAP ${collection}: HTTP ${res.status}`);
    const body = await res.json();
    for (const d of body.documents || []) {
      const id = d.name.split('/').pop();
      docs.push({ id, ...parseFirestoreFields(d.fields || {}) });
    }
    pageToken = body.nextPageToken;
  } while (pageToken);
  return docs;
}

// ---- normalizzazione per il confronto doppioni (solo per il report, non per decidere da soli) ----
function normalizza(s) {
  if (!s) return '';
  return s
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// ---- MAP: manuals / frameworks ----
async function caricaMap() {
  const [manuals, frameworks] = await Promise.all([
    fetchMapCollection('manuals'),
    fetchMapCollection('frameworks'),
  ]);

  const manuali = manuals.map((m) => ({
    titolo: m.title || null,
    autore: m.author || (Array.isArray(m.authors) ? m.authors.join(', ') : null),
    publisher: m.publisher || null,
    materia: m.subject || null,
    edizione: m.edition || null,
    anno_pubblicazione: typeof m.year === 'number' ? m.year : null,
    volume: typeof m.volume === 'number' ? m.volume : null,
    dati: { import_source: 'map', import_source_id: m.id, raw: m },
  }));

  const framework = frameworks.map((f) => ({
    nome: f.name || null,
    materia: f.subject || null,
    versione: f.content?.framework?.version || null,
    coverage_type: null,
    dati: { import_source: 'map', import_source_id: f.id, raw: f },
  }));

  return { manuali, framework };
}

// ---- MATRIX: catalogo_manuali.json / catalogo_framework.json ----
function caricaMatrix() {
  const manualiJson = JSON.parse(readFileSync(join(MATRIX_DATA_DIR, 'catalogo_manuali.json'), 'utf-8'));
  const frameworkJson = JSON.parse(readFileSync(join(MATRIX_DATA_DIR, 'catalogo_framework.json'), 'utf-8'));

  const manuali = (manualiJson.manuals || []).map((m) => ({
    titolo: m.title || null,
    autore: m.author || null,
    publisher: m.publisher || null,
    materia: m.subject || null,
    edizione: null,
    anno_pubblicazione: null,
    volume: null,
    dati: { import_source: 'matrix', import_source_id: m.id, raw: m },
  }));

  const framework = (frameworkJson.frameworks || []).map((f) => ({
    nome: f.name || null,
    materia: f.subject || null,
    versione: null,
    coverage_type: null,
    dati: { import_source: 'matrix', import_source_id: f.id, raw: f },
  }));

  return { manuali, framework };
}

// ---- report doppioni manuali (titolo+autore normalizzati), nessuna decisione automatica ----
function trovaPossibiliDoppioni(manualiMap, manualiMatrix) {
  const candidati = [];
  for (const a of manualiMap) {
    const ta = normalizza(a.titolo);
    const aa = normalizza(a.autore).split(' ')[0] || '';
    if (!ta) continue;
    for (const b of manualiMatrix) {
      const tb = normalizza(b.titolo);
      const ab = normalizza(b.autore).split(' ')[0] || '';
      if (!tb) continue;
      const stessoTitolo = ta === tb || ta.includes(tb) || tb.includes(ta);
      const stessoAutore = aa && ab && aa === ab;
      if (stessoTitolo && stessoAutore) {
        candidati.push({
          map: { titolo: a.titolo, autore: a.autore, publisher: a.publisher, id: a.dati.import_source_id },
          matrix: { titolo: b.titolo, autore: b.autore, publisher: b.publisher, id: b.dati.import_source_id },
        });
      }
    }
  }
  return candidati;
}

async function inserisci(tabella, righe) {
  if (righe.length === 0) return { count: 0 };
  const { error, count } = await supabase.from(tabella).insert(righe, { count: 'exact' });
  if (error) throw new Error(`Insert su ${tabella} fallito: ${error.message}`);
  return { count: count ?? righe.length };
}

// "Senza titolo" e "Competitor" sono placeholder gia' usati dentro MAP stesso
// (vedi MAP Manual Analyses Platform/js/admin.js) per schede compilate a meta'
// da un promotore: non sono dati mancanti da indovinare, sono dati incompleti
// alla fonte, quindi si escludono come le righe senza titolo.
const PLACEHOLDER = new Set(['senza titolo', 'competitor', 'autore sconosciuto']);
function segnoDiPlaceholder(v) {
  return !v || !v.trim() || PLACEHOLDER.has(v.trim().toLowerCase());
}
function separaScartati(manuali) {
  const validi = [];
  const scartati = [];
  for (const m of manuali) {
    if (!segnoDiPlaceholder(m.titolo) && !segnoDiPlaceholder(m.publisher)) validi.push(m);
    else scartati.push(m);
  }
  return { validi, scartati };
}

async function main() {
  console.log('Lettura MAP (Firestore pubblico)...');
  const map = await caricaMap();
  console.log(`  manuali: ${map.manuali.length}, framework: ${map.framework.length}`);

  console.log('Lettura MATRIX (JSON locale)...');
  const matrix = caricaMatrix();
  console.log(`  manuali: ${matrix.manuali.length}, framework: ${matrix.framework.length}`);

  // titolo è NOT NULL sul catalogo condiviso: righe senza titolo (dati incompleti
  // alla fonte, es. generazione fallita lato MATRIX) vengono escluse, non indovinate,
  // e segnalate a parte per completamento manuale.
  const mapSep = separaScartati(map.manuali);
  const matrixSep = separaScartati(matrix.manuali);
  map.manuali = mapSep.validi;
  matrix.manuali = matrixSep.validi;
  const scartati = [...mapSep.scartati, ...matrixSep.scartati];
  if (scartati.length > 0) {
    mkdirSync('import-report', { recursive: true });
    writeFileSync('import-report/manuali-senza-titolo-scartati.json', JSON.stringify(scartati, null, 2), 'utf-8');
    console.log(`Manuali senza titolo esclusi dall'import: ${scartati.length} -> import-report/manuali-senza-titolo-scartati.json`);
  }

  const doppioni = trovaPossibiliDoppioni(map.manuali, matrix.manuali);
  mkdirSync('import-report', { recursive: true });
  writeFileSync(
    'import-report/possibili-doppioni-manuali.json',
    JSON.stringify(doppioni, null, 2),
    'utf-8'
  );
  console.log(`Possibili doppioni MAP/MATRIX trovati: ${doppioni.length} -> import-report/possibili-doppioni-manuali.json`);
  console.log('Nessuno viene scartato automaticamente: revisiona il file e cancella a mano i doppioni dalla tabella dopo l\'import.');

  console.log('Scrittura su Supabase...');
  const rManualiMap = await inserisci('manuali', map.manuali);
  const rManualiMatrix = await inserisci('manuali', matrix.manuali);
  const rFrameworkMap = await inserisci('framework', map.framework);
  const rFrameworkMatrix = await inserisci('framework', matrix.framework);

  console.log('Fatto.');
  console.log(`  manuali importati:   ${rManualiMap.count + rManualiMatrix.count} (MAP ${rManualiMap.count} + MATRIX ${rManualiMatrix.count})`);
  console.log(`  framework importati: ${rFrameworkMap.count + rFrameworkMatrix.count} (MAP ${rFrameworkMap.count} + MATRIX ${rFrameworkMatrix.count})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
