-- Atlante Editoriale — schema di base
-- Fase 1 (identità/ruoli multi-tenant) + fondamenta Fase 2 (catalogo condiviso manuali/framework)
-- Le sei app esistenti (MyUniversity, MAP, MATRIX, ecc.) non sono toccate da questo schema:
-- qui si costruisce solo la nuova applicazione, a fianco.

create extension if not exists pgcrypto;

create type ruolo_utente as enum ('promotore', 'gestore');

-- un cliente = un editore che usa il servizio (Zanichelli è il primo, non l'unico previsto)
create table clienti (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  editore_proprio text not null, -- usato per calcolare proprio/competitor sui manuali, vedi manuale_tipo()
  created_at timestamptz not null default now()
);

-- estende auth.users con cliente_id e ruolo; niente ruoli nascosti solo in UI
create table profili (
  id uuid primary key references auth.users(id) on delete cascade,
  cliente_id uuid not null references clienti(id) on delete restrict,
  ruolo ruolo_utente not null default 'promotore',
  nome_completo text,
  created_at timestamptz not null default now()
);

-- catalogo condiviso tra tutti i clienti: niente cliente_id qui.
-- dati: campi non ancora mappati durante l'import da MAP/MATRIX (schema reale da confermare in Fase 2)
create table manuali (
  id uuid primary key default gen_random_uuid(),
  titolo text not null,
  publisher text not null, -- editore reale del manuale (es. "Pearson"), oggettivo e uguale per tutti i clienti
  isbn text,
  edizione text,
  anno_pubblicazione int,
  dati jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table framework (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  disciplina text,
  versione text,
  coverage_type text,
  dati jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table clienti enable row level security;
alter table profili enable row level security;
alter table manuali enable row level security;
alter table framework enable row level security;

create or replace function cliente_corrente() returns uuid
language sql stable security definer set search_path = public as $$
  select cliente_id from profili where id = auth.uid();
$$;

create or replace function ruolo_corrente() returns ruolo_utente
language sql stable security definer set search_path = public as $$
  select ruolo from profili where id = auth.uid();
$$;

create policy clienti_select on clienti for select
  using (id = cliente_corrente());

create policy profili_select on profili for select
  using (cliente_id = cliente_corrente());

create policy profili_update_self on profili for update
  using (id = auth.uid());

-- manuali/framework: catalogo condiviso, leggibile da chiunque sia autenticato;
-- scrittura riservata al ruolo gestore (voce "Utilità" della Fase 3)
create policy manuali_select on manuali for select
  using (auth.role() = 'authenticated');

create policy manuali_insert on manuali for insert
  with check (ruolo_corrente() = 'gestore');

create policy manuali_update on manuali for update
  using (ruolo_corrente() = 'gestore');

create policy framework_select on framework for select
  using (auth.role() = 'authenticated');

create policy framework_insert on framework for insert
  with check (ruolo_corrente() = 'gestore');

create policy framework_update on framework for update
  using (ruolo_corrente() = 'gestore');

-- proprio/competitor: mai salvato, calcolato al volo per il cliente che interroga
-- (decisione Fase 2: publisher è oggettivo, il confronto è per-cliente)
create or replace function manuale_tipo(p_manuale_id uuid) returns text
language sql stable as $$
  select case
    when m.publisher = c.editore_proprio then 'proprio'
    else 'competitor'
  end
  from manuali m, clienti c
  where m.id = p_manuale_id and c.id = cliente_corrente();
$$;
