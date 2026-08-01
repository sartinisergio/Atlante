// Proxy AI con crediti — Punto E del Piano di accesso (vedi Piano_Accesso_e_Modello_Commerciale.html).
// Sostituisce la chiave OpenAI personale incollata dall'utente (Confronto manuali, Analisi di
// un programma, Piano di promozione): da qui in poi la chiave e' quella di Sergio, e ogni
// chiamata passa da un controllo di entitlement + uno scalo atomico di crediti prima di
// raggiungere OpenAI. Il prompt resta costruito lato client (non e' un segreto, solo la
// chiave lo e') — questa function inoltra { model, temperature, max_tokens, response_format,
// messages } cosi' come arrivano, non reimplementa la logica di ciascuna pagina.

import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;

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

// Numeri segnaposto (come nel resto del Piano di accesso), in attesa del log di consumo
// reale per calibrarli. voce -> colonna entitlement su clienti (punto D); unita -> costo.
const VOCI: Record<string, { entitlement: string; unita: Record<string, number> }> = {
  confronto: {
    entitlement: "confronto_manuali_incluso",
    unita: { manuale: 2, reciproco: 1 },
  },
  analisi: {
    entitlement: "analisi_programma_incluso",
    // nucleo: quadro + valutazione moduli, sempre eseguiti; manuale_comparativo: una per
    // manuale (adottato/alternativo/proprio) confrontato col programma; sintesi: sintesi
    // ranking tra propri, se ce ne sono almeno 2; avanzata: le 5 chiamate extra della
    // modalità avanzata (motivazioni, profilo docente, insights, guida colloquio, executive)
    unita: { nucleo: 2, manuale_comparativo: 2, sintesi: 1, avanzata: 2 },
  },
  piano: {
    entitlement: "piano_promozione_incluso",
    unita: { preclassifica: 2, generazione: 4 },
  },
};

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
    voce?: string;
    unita?: string;
    model?: string;
    temperature?: number;
    max_tokens?: number;
    response_format?: unknown;
    messages?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Corpo della richiesta non valido." }, 400);
  }

  const voceDef = body.voce ? VOCI[body.voce] : undefined;
  const costo = voceDef && body.unita ? voceDef.unita[body.unita] : undefined;
  if (!voceDef || costo === undefined) {
    return jsonResponse({ error: "Voce o unità di lavoro non riconosciuta." }, 400);
  }
  if (!body.messages) {
    return jsonResponse({ error: "Nessun messaggio da inoltrare." }, 400);
  }

  // client "come l'utente": verifica sessione + entitlement rispettando le RLS reali
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData?.user) {
    return jsonResponse({ error: "Sessione non valida." }, 401);
  }

  const { data: profilo, error: profiloError } = await userClient
    .from("profili")
    .select(`cliente_id, clienti(${voceDef.entitlement})`)
    .eq("id", userData.user.id)
    .maybeSingle();
  if (profiloError || !profilo) {
    return jsonResponse({ error: "Nessun profilo collegato." }, 403);
  }
  const cliente = profilo.clienti as unknown as Record<string, boolean> | null;
  if (!cliente || !cliente[voceDef.entitlement]) {
    return jsonResponse({ error: "Questa voce non è inclusa nel tuo piano." }, 403);
  }

  // service role: unica chiamante ammessa di scala_crediti() e unica scrittrice di
  // consumo_log — lo scalo è atomico (verifica+decremento in un'unica UPDATE dentro la
  // funzione SQL), mai "leggi il saldo lato client, poi scrivi -N"
  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: nuovoSaldo, error: scaloError } = await adminClient.rpc("scala_crediti", {
    p_cliente_id: profilo.cliente_id,
    p_costo: costo,
  });
  if (scaloError) {
    return jsonResponse({ error: "Verifica crediti non riuscita: " + scaloError.message }, 500);
  }
  if (nuovoSaldo === null) {
    return jsonResponse({ error: "Crediti esauriti per questo cliente." }, 402);
  }

  await adminClient.from("consumo_log").insert({
    cliente_id: profilo.cliente_id,
    profilo_id: userData.user.id,
    voce: body.voce,
    unita: body.unita,
    crediti: costo,
  });

  const rispostaOpenAI = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: body.model,
      temperature: body.temperature,
      max_tokens: body.max_tokens,
      response_format: body.response_format,
      messages: body.messages,
    }),
  });

  const testoRisposta = await rispostaOpenAI.text();
  return new Response(testoRisposta, {
    status: rispostaOpenAI.status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
});
