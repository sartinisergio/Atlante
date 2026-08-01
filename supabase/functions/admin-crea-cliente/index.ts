// Attivazione cliente — Punto A del Piano di accesso (vedi Piano_Accesso_e_Modello_Commerciale.html).
// A differenza di invita-utente, qui il cliente non esiste ancora: non c'e' nessuna riga
// profili/RLS a cui appoggiarsi per autorizzare l'operazione. L'unico modo di proteggerla e'
// controllare CHI chiama (la sua email, contro un elenco fisso di amministratori), poi usare
// la service role per tutto il resto — un'operazione di bootstrap genuinamente privilegiata,
// non un caso in cui la RLS possa essere l'autorita' reale.

import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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

  let body: {
    nome_cliente?: string;
    editore_proprio?: string;
    referente_email?: string;
    roster_emails?: string[];
    voci?: Record<string, boolean>;
    redirectTo?: string;
  };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Corpo della richiesta non valido." }, 400);
  }

  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData?.user) {
    return jsonResponse({ error: "Sessione non valida." }, 401);
  }
  if (!ADMIN_EMAILS.includes((userData.user.email || "").toLowerCase())) {
    return jsonResponse({ error: "Solo l'amministratore di Atlante può attivare un cliente." }, 403);
  }

  const nomeCliente = (body.nome_cliente || "").trim();
  const editoreProprio = (body.editore_proprio || "").trim();
  const referenteEmail = (body.referente_email || "").trim().toLowerCase();
  const rosterEmails = (body.roster_emails || [])
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e && e !== referenteEmail);
  const redirectTo = body.redirectTo;
  const voci = body.voci || {};

  if (!nomeCliente || !editoreProprio || !referenteEmail) {
    return jsonResponse({ error: "Nome cliente, editore proprio ed email del referente sono obbligatori." }, 400);
  }

  // service role: unica scrittrice ammessa qui, non c'e' nessuna RLS applicabile a un
  // cliente che ancora non esiste
  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: cliente, error: clienteError } = await adminClient
    .from("clienti")
    .insert({
      nome: nomeCliente,
      editore_proprio: editoreProprio,
      offerta_formativa_inclusa: !!voci.offerta_formativa_inclusa,
      confronto_manuali_incluso: !!voci.confronto_manuali_incluso,
      analisi_programma_incluso: !!voci.analisi_programma_incluso,
      piano_promozione_incluso: !!voci.piano_promozione_incluso,
    })
    .select()
    .single();

  if (clienteError || !cliente) {
    return jsonResponse({ error: "Creazione cliente non riuscita: " + (clienteError?.message || "errore sconosciuto") }, 500);
  }

  async function invitaEProfila(email: string, ruolo: "gestore" | "promotore") {
    const invito = await adminClient.auth.admin.inviteUserByEmail(email, { redirectTo });
    let utenteId: string;

    if (invito.error) {
      if (invito.error.code !== "email_exists") {
        throw new Error(`${email}: invito non riuscito (${invito.error.message})`);
      }
      const { data: elenco, error: elencoError } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
      if (elencoError) throw new Error(`${email}: verifica email esistente non riuscita (${elencoError.message})`);
      const esistente = elenco.users.find((u) => (u.email || "").toLowerCase() === email);
      if (!esistente) throw new Error(`${email}: invito non riuscito (${invito.error.message})`);
      utenteId = esistente.id;

      const { data: profiloEsistente } = await adminClient.from("profili").select("cliente_id").eq("id", utenteId).maybeSingle();
      if (profiloEsistente) throw new Error(`${email}: ha già un profilo su Atlante (altro cliente o già questo)`);
    } else {
      utenteId = invito.data.user.id;
    }

    const { data: profilo, error: insertError } = await adminClient
      .from("profili")
      .insert({ id: utenteId, cliente_id: cliente.id, ruolo, stato: "pending", email })
      .select()
      .single();
    if (insertError) throw new Error(`${email}: creazione profilo non riuscita (${insertError.message})`);
    return profilo;
  }

  // Il referente deve riuscire: se fallisce, il cliente appena creato resterebbe orfano
  // (nessun gestore), quindi lo elimino invece di lasciare uno scarto a metà.
  let referenteProfilo;
  try {
    referenteProfilo = await invitaEProfila(referenteEmail, "gestore");
  } catch (err) {
    await adminClient.from("clienti").delete().eq("id", cliente.id);
    return jsonResponse({ error: "Referente non invitato, nessun cliente creato: " + (err as Error).message }, 500);
  }

  // Il roster e' un extra: un errore su una singola email non deve invalidare tutto
  // il resto, che ha gia' avuto successo.
  const profiliRoster = [];
  const erroriRoster = [];
  for (const email of rosterEmails) {
    try {
      profiliRoster.push(await invitaEProfila(email, "promotore"));
    } catch (err) {
      erroriRoster.push((err as Error).message);
    }
  }

  return jsonResponse({
    cliente,
    profili: [referenteProfilo, ...profiliRoster],
    errori_roster: erroriRoster,
  });
});
