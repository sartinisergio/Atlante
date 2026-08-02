-- Governo del catalogo condiviso (manuali/framework) — decisione del 2 agosto 2026.
-- Prima qualunque gestore, di qualunque cliente, poteva scrivere direttamente sul catalogo
-- condiviso (nessun cliente_id su manuali/framework, la RLS controllava solo il ruolo). Un
-- gestore di un editore poteva quindi modificare o cancellare dati su cui un altro editore,
-- concorrente, fa affidamento. Nuovo modello:
--   - un gestore non scrive mai più direttamente su manuali/framework: puo' solo proporre
--     un inserimento/modifica/cancellazione, che finisce in coda qui
--   - solo l'amministratore di Atlante (stessa email fissa gia' usata in admin-crea-cliente)
--     scrive davvero sul catalogo, sia decidendo una richiesta sia di propria iniziativa
--
-- dati_proposti rispecchia esattamente la forma dell'oggetto che verrebbe passato a
-- .insert()/.update() su manuali o framework (stessi nomi di campo) — così l'Edge Function
-- che applica una decisione non deve tradurre nulla, la applica cosi' com'e' (o con
-- dati_decisi al posto di dati_proposti, se l'amministratore ha corretto qualcosa prima di
-- approvare).

create type richiesta_tipo_catalogo as enum ('manuale', 'framework');
create type richiesta_tipo_operazione as enum ('inserimento', 'modifica', 'cancellazione');
create type richiesta_stato as enum ('in_attesa', 'approvata', 'approvata_con_modifiche', 'rifiutata');

create table richieste_catalogo (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clienti(id) on delete cascade,
  creato_da uuid references profili(id) on delete set null,

  tipo_catalogo richiesta_tipo_catalogo not null,
  tipo_operazione richiesta_tipo_operazione not null,
  riferimento_id uuid, -- null per un inserimento, altrimenti la riga di manuali/framework coinvolta

  dati_proposti jsonb not null default '{}'::jsonb,
  dati_decisi jsonb, -- valorizzato solo se l'amministratore corregge qualcosa prima di approvare

  stato richiesta_stato not null default 'in_attesa',
  messaggio_admin text,
  decisa_il timestamptz,

  created_at timestamptz not null default now()
);

alter table richieste_catalogo enable row level security;

-- lettura condivisa dal team dello stesso cliente (stesso spirito di programmi/consumo_log):
-- un promotore può vedere cosa il proprio gestore ha proposto, anche se solo un gestore
-- può proporre (vedi insert)
create policy richieste_catalogo_select on richieste_catalogo for select
  using (cliente_id = cliente_corrente());

create policy richieste_catalogo_insert on richieste_catalogo for insert
  with check (ruolo_corrente() = 'gestore' and cliente_id = cliente_corrente() and creato_da = auth.uid());

-- nessuna policy update/delete per il client: solo la Edge Function catalogo-admin (service
-- role) decide una richiesta, esattamente come consumo_log è scritto solo da ai-proxy.

-- Scrittura diretta su manuali/framework: prima "ruolo gestore" bastava, ora serve anche
-- essere l'amministratore (stessa email fissa di ADMIN_EMAILS in admin-crea-cliente,
-- duplicata qui perché le RLS non possono importare una costante TypeScript — se in futuro
-- gli amministratori diventano più di uno, aggiornare entrambi i posti).
drop policy manuali_insert on manuali;
drop policy manuali_update on manuali;
drop policy framework_insert on framework;
drop policy framework_update on framework;
drop policy framework_delete on framework;

create policy manuali_insert on manuali for insert
  with check (ruolo_corrente() = 'gestore' and auth.jwt() ->> 'email' = 'sartinisergio@gmail.com');
create policy manuali_update on manuali for update
  using (ruolo_corrente() = 'gestore' and auth.jwt() ->> 'email' = 'sartinisergio@gmail.com');
create policy manuali_delete on manuali for delete
  using (ruolo_corrente() = 'gestore' and auth.jwt() ->> 'email' = 'sartinisergio@gmail.com');

create policy framework_insert on framework for insert
  with check (ruolo_corrente() = 'gestore' and auth.jwt() ->> 'email' = 'sartinisergio@gmail.com');
create policy framework_update on framework for update
  using (ruolo_corrente() = 'gestore' and auth.jwt() ->> 'email' = 'sartinisergio@gmail.com');
create policy framework_delete on framework for delete
  using (ruolo_corrente() = 'gestore' and auth.jwt() ->> 'email' = 'sartinisergio@gmail.com');
