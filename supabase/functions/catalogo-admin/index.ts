// Governo del catalogo condiviso — seguito della decisione del 2 agosto 2026 (vedi migration
// 20260802010000_richieste_catalogo.sql). Un gestore non scrive più direttamente su
// manuali/framework: propone (richieste_catalogo), e solo l'amministratore decide.
//
// Come admin-crea-cliente: nessuna riga profili per l'amministratore da cui la RLS possa
// partire, quindi l'unica protezione reale è verificare CHI chiama (email contro un elenco
// fisso), poi usare la service role per il resto — qui in più per due motivi:
//   1) l'amministratore deve vedere le richieste di TUTTI i clienti, non solo del proprio
//      (se anche avesse un profilo, cliente_corrente() lo limiterebbe a un solo cliente)
//   2) l'invio dell'email di esito (Resend) richiede comunque un secret lato server

import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;

const ADMIN_EMAILS = ["sartinisergio@gmail.com"];

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

async function notificaGestore(email: string, esito: string, oggetto: string, messaggio: string | null) {
  const testoEsito = {
    approvata: "è stata approvata così come l'avevi inviata",
    approvata_con_modifiche: "è stata approvata, con alcune correzioni dell'amministratore",
    rifiutata: "è stata rifiutata",
  }[esito] || esito;
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Atlante <notifiche@atlante-editoriale.com>",
        to: [email],
        subject: `Atlante — richiesta catalogo: ${testoEsito}`,
        text: `La tua richiesta su "${oggetto}" ${testoEsito}.` +
          (messaggio ? `\n\nMessaggio dell'amministratore:\n${messaggio}` : ""),
      }),
    });
  } catch {
    // la notifica è un valore aggiunto, un suo fallimento non deve mai bloccare la risposta
  }
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

  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData?.user) {
    return jsonResponse({ error: "Sessione non valida." }, 401);
  }
  if (!ADMIN_EMAILS.includes((userData.user.email || "").toLowerCase())) {
    return jsonResponse({ error: "Riservato all'amministratore di Atlante." }, 403);
  }

  let body: {
    azione?: "lista" | "decidi";
    richiesta_id?: string;
    esito?: "approvata" | "approvata_con_modifiche" | "rifiutata";
    dati_decisi?: Record<string, unknown>;
    messaggio?: string;
  };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Corpo della richiesta non valido." }, 400);
  }

  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  if (body.azione === "lista") {
    const { data, error } = await adminClient
      .from("richieste_catalogo")
      .select("id, cliente_id, tipo_catalogo, tipo_operazione, riferimento_id, dati_proposti, dati_decisi, stato, messaggio_admin, decisa_il, created_at, clienti(nome), profili(nome_completo, email)")
      .order("created_at", { ascending: false });
    if (error) return jsonResponse({ error: "Lettura richieste non riuscita: " + error.message }, 500);
    return jsonResponse({ richieste: data });
  }

  if (body.azione === "decidi") {
    const richiestaId = body.richiesta_id;
    const esito = body.esito;
    if (!richiestaId || !esito) {
      return jsonResponse({ error: "richiesta_id ed esito sono obbligatori." }, 400);
    }

    const { data: richiesta, error: erroreRichiesta } = await adminClient
      .from("richieste_catalogo")
      .select("*, profili(email)")
      .eq("id", richiestaId)
      .maybeSingle();
    if (erroreRichiesta || !richiesta) {
      return jsonResponse({ error: "Richiesta non trovata." }, 404);
    }
    if (richiesta.stato !== "in_attesa") {
      return jsonResponse({ error: "Questa richiesta è già stata decisa." }, 409);
    }

    const tabella = richiesta.tipo_catalogo === "manuale" ? "manuali" : "framework";

    if (esito === "approvata" || esito === "approvata_con_modifiche") {
      const dati = esito === "approvata_con_modifiche" ? (body.dati_decisi || richiesta.dati_proposti) : richiesta.dati_proposti;
      let erroreApplicazione: string | null = null;

      if (richiesta.tipo_operazione === "inserimento") {
        const { error } = await adminClient.from(tabella).insert(dati);
        if (error) erroreApplicazione = error.message;
      } else if (richiesta.tipo_operazione === "modifica") {
        const { error } = await adminClient.from(tabella).update(dati).eq("id", richiesta.riferimento_id);
        if (error) erroreApplicazione = error.message;
      } else if (richiesta.tipo_operazione === "cancellazione") {
        const { error } = await adminClient.from(tabella).delete().eq("id", richiesta.riferimento_id);
        if (error) erroreApplicazione = error.message;
      }

      if (erroreApplicazione) {
        return jsonResponse({ error: "Applicazione al catalogo non riuscita: " + erroreApplicazione }, 500);
      }
    }

    const { error: erroreUpdate } = await adminClient
      .from("richieste_catalogo")
      .update({
        stato: esito,
        messaggio_admin: body.messaggio || null,
        dati_decisi: esito === "approvata_con_modifiche" ? (body.dati_decisi || null) : null,
        decisa_il: new Date().toISOString(),
      })
      .eq("id", richiestaId);
    if (erroreUpdate) {
      return jsonResponse({ error: "Richiesta applicata al catalogo ma non aggiornata: " + erroreUpdate.message }, 500);
    }

    const emailGestore = (richiesta as { profili?: { email?: string } }).profili?.email;
    const oggetto = (richiesta.dati_proposti as { titolo?: string; nome?: string })?.titolo
      || (richiesta.dati_proposti as { titolo?: string; nome?: string })?.nome
      || richiesta.tipo_catalogo;
    if (emailGestore) {
      await notificaGestore(emailGestore, esito, oggetto, body.messaggio || null);
    }

    return jsonResponse({ ok: true });
  }

  return jsonResponse({ error: "Azione non riconosciuta." }, 400);
});
