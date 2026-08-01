-- Punto D del Piano di accesso — entitlement per voce (Confronto, Analisi, Piano di promozione).
-- Vedi Piano_Accesso_e_Modello_Commerciale.html, sezione D.
--
-- Offerta formativa aveva già offerta_formativa_inclusa; qui si aggiungono le altre tre.
-- Default false (coerente con offerta_formativa_inclusa), ma i clienti già esistenti vengono
-- portati subito a true: senza questo backfill, la migration toglierebbe di colpo l'accesso a
-- voci oggi illimitate.

alter table clienti add column confronto_manuali_incluso boolean not null default false;
alter table clienti add column analisi_programma_incluso boolean not null default false;
alter table clienti add column piano_promozione_incluso boolean not null default false;

update clienti set
  confronto_manuali_incluso = true,
  analisi_programma_incluso = true,
  piano_promozione_incluso = true;

-- Confronto manuali e Analisi di un programma non leggono/scrivono nulla di specifico del
-- cliente su Supabase oggi (solo il catalogo condiviso manuali/framework + la chiave OpenAI
-- dell'utente, mai su Supabase): nessuna tabella da proteggere con RLS per quelle due voci,
-- il gate resta lato pagina. Piano di promozione invece scrive su programmi/campagne/
-- campagna_target: qui un gate reale ha senso.
create or replace function piano_promozione_abilitato() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(c.piano_promozione_incluso, false) from clienti c where c.id = cliente_corrente();
$$;

drop policy programmi_select on programmi;
create policy programmi_select on programmi for select
  using (cliente_id = cliente_corrente() and piano_promozione_abilitato());

drop policy programmi_insert on programmi;
create policy programmi_insert on programmi for insert
  with check (cliente_id = cliente_corrente() and piano_promozione_abilitato());

drop policy programmi_update on programmi;
create policy programmi_update on programmi for update
  using (cliente_id = cliente_corrente() and piano_promozione_abilitato());

drop policy programmi_delete on programmi;
create policy programmi_delete on programmi for delete
  using (cliente_id = cliente_corrente() and piano_promozione_abilitato());

drop policy campagne_select on campagne;
create policy campagne_select on campagne for select
  using (cliente_id = cliente_corrente() and piano_promozione_abilitato());

drop policy campagne_insert on campagne;
create policy campagne_insert on campagne for insert
  with check (cliente_id = cliente_corrente() and piano_promozione_abilitato());

drop policy campagne_update on campagne;
create policy campagne_update on campagne for update
  using (cliente_id = cliente_corrente() and piano_promozione_abilitato());

drop policy campagne_delete on campagne;
create policy campagne_delete on campagne for delete
  using (cliente_id = cliente_corrente() and piano_promozione_abilitato());

drop policy campagna_target_select on campagna_target;
create policy campagna_target_select on campagna_target for select
  using (exists (
    select 1 from campagne c where c.id = campagna_target.campagna_id and c.cliente_id = cliente_corrente()
  ) and piano_promozione_abilitato());

drop policy campagna_target_insert on campagna_target;
create policy campagna_target_insert on campagna_target for insert
  with check (exists (
    select 1 from campagne c where c.id = campagna_target.campagna_id and c.cliente_id = cliente_corrente()
  ) and piano_promozione_abilitato());

drop policy campagna_target_update on campagna_target;
create policy campagna_target_update on campagna_target for update
  using (exists (
    select 1 from campagne c where c.id = campagna_target.campagna_id and c.cliente_id = cliente_corrente()
  ) and piano_promozione_abilitato());

drop policy campagna_target_delete on campagna_target;
create policy campagna_target_delete on campagna_target for delete
  using (exists (
    select 1 from campagne c where c.id = campagna_target.campagna_id and c.cliente_id = cliente_corrente()
  ) and piano_promozione_abilitato());
