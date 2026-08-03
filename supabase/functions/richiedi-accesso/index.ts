// Notifica a Sergio quando un'email non invitata prova ad accedere (seguito del Punto C).
// Chiamata da login.html PRIMA di signInWithOtp: se l'email non e' collegata a un profilo
// attivo/pending, avvisa l'amministratore via Resend e dice al form di non procedere (evita
// anche una chiamata OTP inutile). Nessuna sessione utente esiste ancora a questo punto del
// flusso: qui non c'e' nulla da autenticare oltre alla verifica di gateway standard di
// Supabase (anon key in Authorization). Se questa funzione fallisce o e' irraggiungibile,
// login.html procede comunque con il login normale — la notifica e' un valore aggiunto, mai
// un blocco per un utente legittimo.

import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const EMAIL_ADMIN = "sartinisergio@gmail.com";

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

async function notificaAmministratore(email: string) {
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Atlante <notifiche@atlante-editoriale.com>",
        to: [EMAIL_ADMIN],
        subject: "Atlante — tentativo di accesso non collegato",
        text: `${email} ha provato ad accedere ad Atlante ma non risulta collegata a nessun cliente.\n\nData/ora: ${new Date().toISOString()}`,
      }),
    });
  } catch {
    // vedi commento in testa al file: un fallimento qui non deve mai propagarsi.
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Metodo non supportato." }, 405);
  }

  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Corpo della richiesta non valido." }, 400);
  }

  const email = (body.email || "").trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return jsonResponse({ error: "Email non valida." }, 400);
  }

  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data: profilo, error } = await adminClient
    .from("profili")
    .select("stato")
    .eq("email", email)
    .neq("stato", "rimosso")
    .maybeSingle();

  if (error) {
    return jsonResponse({ error: "Verifica non riuscita: " + error.message }, 500);
  }

  if (profilo) {
    return jsonResponse({ autorizzato: true });
  }

  await notificaAmministratore(email);
  return jsonResponse({ autorizzato: false });
});
