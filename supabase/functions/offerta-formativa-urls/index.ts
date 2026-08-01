// Gate d'accesso per la voce "Offerta formativa" (vedi Piano_Sviluppo_Offerta_Formativa.html, sez. 4).
// Il bucket "offerta-formativa" e privato e senza policy per anon/authenticated: l'unico
// modo di leggerlo e passare da qui. La funzione:
//   1) verifica il JWT dell'utente che chiama (stesso Supabase Auth del login Atlante)
//   2) verifica che il suo cliente abbia clienti.offerta_formativa_inclusa = true
//   3) se si, genera URL firmati temporanei (createSignedUrl, nativo Storage) per
//      manifest.json + ogni CSV elencato al suo interno, e li restituisce
// Il motore DuckDB-WASM lato client non cambia: cambia solo da dove arrivano i file.

import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const BUCKET = "offerta-formativa";
const SIGNED_URL_TTL_SECONDS = 900; // 10-15 minuti: solo il tempo del caricamento iniziale

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return jsonResponse({ error: "Autenticazione mancante." }, 401);
  }

  // client "come l'utente": rispetta le RLS gia definite su profili/clienti,
  // niente logica di autorizzazione duplicata qui oltre alla lettura del flag.
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData?.user) {
    return jsonResponse({ error: "Sessione non valida." }, 401);
  }

  const { data: profilo, error: profiloError } = await userClient
    .from("profili")
    .select("clienti(offerta_formativa_inclusa)")
    .eq("id", userData.user.id)
    .maybeSingle();

  if (profiloError || !profilo) {
    return jsonResponse({ error: "Nessun profilo collegato." }, 403);
  }

  const cliente = (profilo as { clienti: { offerta_formativa_inclusa: boolean } | null }).clienti;
  if (!cliente?.offerta_formativa_inclusa) {
    return jsonResponse({ error: "Il tuo cliente non ha accesso a Offerta formativa." }, 403);
  }

  // service role: unico lettore ammesso del bucket privato, mai esposto al client
  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: manifestFile, error: manifestError } = await adminClient.storage
    .from(BUCKET)
    .download("manifest.json");
  if (manifestError || !manifestFile) {
    return jsonResponse({ error: "Manifest non trovato nel bucket." }, 500);
  }

  const manifest = JSON.parse(await manifestFile.text()) as {
    anno_accademico: string;
    insegnamenti: string[];
    lauree: string[];
  };

  async function signAll(paths: string[]) {
    const results: { path: string; url: string }[] = [];
    for (const path of paths) {
      const { data, error } = await adminClient.storage
        .from(BUCKET)
        .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
      if (error || !data) throw new Error(`Firma URL fallita per ${path}: ${error?.message}`);
      results.push({ path, url: data.signedUrl });
    }
    return results;
  }

  try {
    const [insegnamenti, lauree] = await Promise.all([
      signAll(manifest.insegnamenti || []),
      signAll(manifest.lauree || []),
    ]);
    return jsonResponse({
      anno_accademico: manifest.anno_accademico,
      insegnamenti,
      lauree,
    });
  } catch (err) {
    return jsonResponse({ error: (err as Error).message }, 500);
  }
});
