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
//
// NOTA (05/08/2026): insegnamenti_cineca_20252026.csv (~46 MB, il file piu' grande)
// fallisce sistematicamente l'upload con "fetch failed" (verificato su 3 tentativi
// consecutivi, sempre sullo stesso file) — sembra un limite di dimensione/timeout
// lato Supabase Storage o del client JS, non un problema di rete casuale. Lo script
// inoltre ricarica SEMPRE tutti i 30 file ad ogni lancio, anche quelli il cui
// contenuto non e' cambiato dall'ultimo upload. Miglioramenti da considerare:
// 1) caricare solo i file effettivamente modificati (confronto hash/mtime);
// 2) gestire i file grandi con upload a chunk o aumentando il timeout del client.
// Non bloccante per gli aggiornamenti dei singoli atenei diversi da quelli su
// piattaforma Cineca condivisa (es. l'aggiornamento docenti Unimi del 05/08/2026
// e' stato caricato correttamente prima che lo script si fermasse su questo file).
//
// NOTA (05/08/2026): punto debole strutturale dello script, non ancora corretto.
// uploadFile() rilancia l'errore con `throw` (riga 52), che risale non gestito fino a
// main().catch() e termina l'intero script con process.exit(1) — quindi se UN QUALSIASI
// file fallisce PRIMA del blocco "Carico manifest.json" (righe 85-93), quel blocco non
// viene mai eseguito e il manifest nel bucket resta quello vecchio. Nel caso Unimi/Cineca
// di oggi non ha avuto conseguenze visibili (il path del file Unimi non e' cambiato, quindi
// l'Edge Function continua a firmare correttamente lo stesso path anche con un manifest
// non aggiornato) — ma se in futuro un file fallisse PRIMA nell'ordine di caricamento
// (rispetto a un file nuovo o rinominato), il manifest disallineato diventerebbe un
// problema reale: l'Edge Function non conoscerebbe il nuovo percorso e non lo firmerebbe.
// Fix da considerare: try/catch per singolo file con proseguimento e report finale degli
// errori, invece di un fallimento totale; oppure caricare comunque il manifest a fine
// esecuzione anche in presenza di errori parziali, segnalandoli separatamente.

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import 'dotenv/config';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MYUNIVERSITY_DATA_DIR = process.env.MYUNIVERSITY_DATA_DIR;
// Generato da elenco-docenti/script/genera_lookup_atlante.py — vedi quello script per come
// si rigenera. Facoltativo: se assente, l'upload di insegnamenti/lauree procede comunque e
// il manifest non include la chiave "docenti" (l'app tratta la tabella come vuota).
const ELENCO_DOCENTI_LOOKUP = process.env.ELENCO_DOCENTI_LOOKUP;

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
    docenti: [],
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

  console.log('\nCarico il CSV docenti (elenco docenti → Offerta formativa)...');
  if (ELENCO_DOCENTI_LOOKUP && existsSync(ELENCO_DOCENTI_LOOKUP)) {
    await uploadFile(ELENCO_DOCENTI_LOOKUP, 'docenti_nazionale.csv', 'text/csv');
    manifestPerBucket.docenti = ['docenti_nazionale.csv'];
  } else {
    console.log('  saltato: ELENCO_DOCENTI_LOOKUP non impostata o file non trovato in .env');
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
