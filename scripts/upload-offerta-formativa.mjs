// Copia una tantum dei CSV di MyUniversity-web-2.0 nel bucket Storage privato di Atlante
// (vedi Piano_Sviluppo_Offerta_Formativa.html, sezione 4 — gate di accesso).
// MyUniversity non viene toccata: questo script solo legge i suoi file locali e li carica
// nel bucket "offerta-formativa" (creato dalla migration 20260725000000_offerta_formativa.sql).
//
// Il manifest caricato nel bucket NON è una copia identica di data/manifest.json: i percorsi
// interni hanno il prefisso "data/" rimosso, perché nel bucket non esiste una sottocartella
// "data" (il bucket stesso è la radice). L'Edge Function legge questo manifest e firma
// esattamente i percorsi che contiene, quindi la coerenza sta tutta qui.
//
// Da rilanciare quando MyUniversity aggiorna l'offerta formativa (oggi annuale, vedi
// decisione 3 del piano — aggiornamento manuale, non ancora automatizzato).

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import 'dotenv/config';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MYUNIVERSITY_DATA_DIR = process.env.MYUNIVERSITY_DATA_DIR;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !MYUNIVERSITY_DATA_DIR) {
  console.error('Mancano variabili in .env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, MYUNIVERSITY_DATA_DIR');
  process.exit(1);
}

const BUCKET = 'offerta-formativa';
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function stripDataPrefix(p) {
  return p.startsWith('data/') ? p.slice('data/'.length) : p;
}

async function uploadFile(localPath, storagePath, contentType) {
  const buffer = readFileSync(localPath);
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, buffer, { contentType, upsert: true });
  if (error) throw new Error(`Upload fallito per ${storagePath}: ${error.message}`);
  console.log(`  ok  ${storagePath}  (${(buffer.length / 1024).toFixed(0)} KB)`);
}

async function main() {
  const manifestPath = join(MYUNIVERSITY_DATA_DIR, 'manifest.json');
  if (!existsSync(manifestPath)) {
    console.error(`manifest.json non trovato in ${manifestPath}`);
    process.exit(1);
  }
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));

  const manifestPerBucket = {
    anno_accademico: manifest.anno_accademico,
    insegnamenti: (manifest.insegnamenti || []).map(stripDataPrefix),
    lauree: (manifest.lauree || []).map(stripDataPrefix),
  };

  console.log(`Anno accademico: ${manifestPerBucket.anno_accademico}`);
  console.log(`File insegnamenti: ${manifestPerBucket.insegnamenti.length}, file lauree: ${manifestPerBucket.lauree.length}`);

  console.log('\nCarico i CSV insegnamenti...');
  for (const relPath of manifest.insegnamenti || []) {
    const local = join(MYUNIVERSITY_DATA_DIR, relPath.replace(/^data\//, ''));
    await uploadFile(local, stripDataPrefix(relPath), 'text/csv');
  }

  console.log('\nCarico i CSV lauree...');
  for (const relPath of manifest.lauree || []) {
    const local = join(MYUNIVERSITY_DATA_DIR, relPath.replace(/^data\//, ''));
    await uploadFile(local, stripDataPrefix(relPath), 'text/csv');
  }

  console.log('\nCarico manifest.json...');
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload('manifest.json', Buffer.from(JSON.stringify(manifestPerBucket, null, 2)), {
      contentType: 'application/json',
      upsert: true,
    });
  if (error) throw new Error(`Upload manifest fallito: ${error.message}`);
  console.log('  ok  manifest.json');

  console.log('\nFatto.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
