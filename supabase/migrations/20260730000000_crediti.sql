-- Punto E del Piano di accesso — crediti per Confronto/Analisi/Piano di promozione.
-- Vedi Piano_Accesso_e_Modello_Commerciale.html, sezione E.
--
-- Nessuna tabella abbonamenti/livelli qui: dipende dal Punto F (Stripe), non ancora
-- costruito. Oggi ogni cliente ha un solo pool di crediti, sempre attivo — equivale a
-- "sempre in prova" finché F non introduce un vero stato di abbonamento.

alter table clienti add column crediti_residui integer not null default 100;

-- log per attribuire ogni consumo a chi lo ha generato (gestore o promotore),
-- non solo al saldo condiviso del cliente
create table consumo_log (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clienti(id) on delete cascade,
  profilo_id uuid references profili(id) on delete set null,
  voce text not null,
  unita text not null,
  crediti integer not null,
  created_at timestamptz not null default now()
);

alter table consumo_log enable row level security;

-- lettura condivisa dal team dello stesso cliente (stesso spirito di profili/programmi);
-- solo la service role (Edge Function ai-proxy) scrive, nessuna policy insert per il client
create policy consumo_log_select on consumo_log for select
  using (cliente_id = cliente_corrente());

-- Decremento atomico: verifica e scalo in un'unica UPDATE, mai "leggi il saldo lato client,
-- poi scrivi -N" — altrimenti due chiamate parallele potrebbero spendere lo stesso credito
-- residuo. security definer perche' la chiama solo la Edge Function con la service role;
-- restituisce il nuovo saldo se la UPDATE ha toccato una riga, NULL se il saldo era
-- insufficiente (0 righe toccate) — la Edge Function interpreta NULL come "crediti esauriti".
create or replace function scala_crediti(p_cliente_id uuid, p_costo integer) returns integer
language sql security definer set search_path = public as $$
  update clienti
  set crediti_residui = crediti_residui - p_costo
  where id = p_cliente_id and crediti_residui >= p_costo
  returning crediti_residui;
$$;
