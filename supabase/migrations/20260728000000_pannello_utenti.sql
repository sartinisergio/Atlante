-- Punto C del Piano di accesso — pannello utenti (invito, ruoli, rimozione).
-- Vedi Piano_Accesso_e_Modello_Commerciale.html, sezione C.
--
-- profili oggi ha solo id/cliente_id/ruolo/nome_completo/created_at, una sola policy
-- select e una update-self senza WITH CHECK (bug latente, mai sfruttato: nessuna pagina
-- fa .update() su profili oggi). Questa migration aggiunge stato/rimozione/email e le
-- policy insert/update reali per il gestore.

create type profilo_stato as enum ('pending', 'attivo', 'rimosso');

alter table profili add column stato profilo_stato not null default 'attivo';
alter table profili add column rimosso_il timestamptz;

-- auth.users non è leggibile dal client con la anon key: senza una copia su profili,
-- il pannello utenti non avrebbe modo di mostrare l'email dei colleghi.
alter table profili add column email text unique;
update profili p set email = u.email from auth.users u where u.id = p.id;

-- cliente_corrente()/ruolo_corrente() sono usate da TUTTE le RLS esistenti (manuali,
-- framework, programmi, campagne, campagna_target, clienti, profili stesso): escludere
-- qui gli stati 'rimosso' basta a interrompere l'accesso di un profilo rimosso ovunque
-- nell'app, non solo su profili — implementa da subito l'"interruzione immediata"
-- richiesta dal punto C, senza aspettare il gate dedicato del punto D.
--
-- Si esclude solo 'rimosso', non anche 'pending': se un pending venisse escluso qui, la
-- UPDATE che lo promuove da solo a 'attivo' (vedi profili_update_self sotto) fallirebbe,
-- perché il suo stesso WITH CHECK chiama cliente_corrente()/ruolo_corrente(), che in
-- quello stesso statement vedrebbe ancora la riga non committata con stato 'pending' e
-- restituirebbe NULL. Un pending non ha comunque mai un JWT valido prima di cliccare il
-- link di invito, quindi includerlo qui non apre nessun varco reale.
create or replace function cliente_corrente() returns uuid
language sql stable security definer set search_path = public as $$
  select cliente_id from profili where id = auth.uid() and stato <> 'rimosso';
$$;

create or replace function ruolo_corrente() returns ruolo_utente
language sql stable security definer set search_path = public as $$
  select ruolo from profili where id = auth.uid() and stato <> 'rimosso';
$$;

-- Sostituisce la policy di self-update esistente: prima non aveva WITH CHECK, quindi in
-- teoria un utente poteva auto-modificarsi cliente_id/ruolo (mai sfruttato, nessuna
-- pagina scrive su profili oggi, ma un buco da chiudere visto che tocchiamo comunque
-- questa policy). Ora un utente può sempre aggiornare i propri campi "innocui"
-- (nome_completo, email, far scattare pending->attivo), mai cliente_id/ruolo. La clausola
-- USING esclude le righe già 'rimosso': un utente rimosso non può più toccare la propria
-- riga in alcun modo, nemmeno per riscriversi stato='attivo' da solo.
drop policy profili_update_self on profili;
create policy profili_update_self on profili for update
  using (id = auth.uid() and stato <> 'rimosso')
  with check (id = auth.uid() and cliente_id = cliente_corrente() and ruolo = ruolo_corrente());

-- Nuove policy per il gestore: può creare/modificare solo profili del proprio cliente_id,
-- mai di un altro cliente. L'insert vero e proprio (durante l'invito) passa dal client
-- "come l'utente" nella Edge Function invita-utente, non dal service role: questa policy
-- è l'autorità reale, non solo un controllo applicativo duplicato lì.
create policy profili_insert_gestore on profili for insert
  with check (ruolo_corrente() = 'gestore' and cliente_id = cliente_corrente());

create policy profili_update_gestore on profili for update
  using (ruolo_corrente() = 'gestore' and cliente_id = cliente_corrente())
  with check (cliente_id = cliente_corrente());
