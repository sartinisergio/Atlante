// Invito di un collega — Punto C del Piano di accesso (vedi Piano_Accesso_e_Modello_Commerciale.html).
// Serve una Edge Function perche' creare l'utente in auth.users richiede la Admin API
// (inviteUserByEmail), che a sua volta richiede la service role key: non puo' mai finire
// nel browser. Stesso scheletro di offerta-formativa-urls/index.ts:
//   1) verifica il JWT di chi chiama (client "come l'utente", rispetta le RLS reali)
//   2) verifica che chi chiama sia gestore
//   3) usa l'admin client SOLO per l'operazione privilegiata (creare l'utente Auth)
//   4) l'insert su profili passa dal client "come l'utente": la RLS profili_insert_gestore
//      resta l'autorita' reale, non solo un controllo applicativo duplicato qui

import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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
  if (req.method !== "POST") {
    return jsonResponse({ error: "Metodo non supportato." }, 405);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return jsonResponse({ error: "Autenticazione mancante." }, 401);
  }

  let body: { email?: string; ruolo?: string; redirectTo?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Corpo della richiesta non valido." }, 400);
  }

  const email = (body.email || "").trim().toLowerCase();
  const ruolo = body.ruolo === "gestore" ? "gestore" : "promotore";
  const redirectTo = body.redirectTo;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return jsonResponse({ error: "Email non valida." }, 400);
  }

  // client "come l'utente": rispetta le RLS gia' definite su profili/clienti
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData?.user) {
    return jsonResponse({ error: "Sessione non valida." }, 401);
  }

  const { data: chiamante, error: chiamanteError } = await userClient
    .from("profili")
    .select("cliente_id, ruolo")
    .eq("id", userData.user.id)
    .maybeSingle();

  if (chiamanteError || !chiamante) {
    return jsonResponse({ error: "Nessun profilo collegato." }, 403);
  }
  if (chiamante.ruolo !== "gestore") {
    return jsonResponse({ error: "Solo un gestore puo' invitare un collega." }, 403);
  }

  // service role: unica lettrice/scrittrice ammessa di auth.users, mai esposta al client
  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  let nuovoUtenteId: string;
  const invito = await adminClient.auth.admin.inviteUserByEmail(email, { redirectTo });

  if (invito.error) {
    if (invito.error.code !== "email_exists") {
      return jsonResponse({ error: "Invito non riuscito: " + invito.error.message }, 500);
    }
    // Email gia' registrata in auth.users: nessun modo diretto di risolvere id da email
    // con la Admin API, si scorre listUsers (accettabile alla scala odierna di Atlante).
    const { data: elenco, error: elencoError } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
    if (elencoError) {
      return jsonResponse({ error: "Verifica email esistente non riuscita: " + elencoError.message }, 500);
    }
    const utenteEsistente = elenco.users.find((u) => (u.email || "").toLowerCase() === email);
    if (!utenteEsistente) {
      return jsonResponse({ error: "Invito non riuscito: " + invito.error.message }, 500);
    }
    nuovoUtenteId = utenteEsistente.id;

    const { data: profiloEsistente } = await adminClient
      .from("profili")
      .select("cliente_id")
      .eq("id", nuovoUtenteId)
      .maybeSingle();

    if (profiloEsistente) {
      if (profiloEsistente.cliente_id === chiamante.cliente_id) {
        return jsonResponse({ error: "Questa email fa gia' parte del tuo team." }, 409);
      }
      return jsonResponse({ error: "Questa email e' gia' associata a un altro cliente Atlante." }, 409);
    }
    // auth.users esiste ma profili no (caso raro): procede all'insert sotto.
  } else {
    nuovoUtenteId = invito.data.user.id;
  }

  const { data: nuovoProfilo, error: insertError } = await userClient
    .from("profili")
    .insert({
      id: nuovoUtenteId,
      cliente_id: chiamante.cliente_id,
      ruolo,
      stato: "pending",
      email,
    })
    .select()
    .single();

  if (insertError) {
    return jsonResponse({ error: "Creazione profilo non riuscita: " + insertError.message }, 500);
  }

  return jsonResponse({ profilo: nuovoProfilo });
});
