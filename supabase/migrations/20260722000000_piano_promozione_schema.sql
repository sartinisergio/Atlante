-- Voce di menu 3 "Piano di promozione" — base MATRIX Intelligence Plus (vedi
-- Piano_Sviluppo_Piano_Promozione.html per l'analisi e le decisioni prese il 22 luglio 2026).
--
-- Prima tabella di ATLANTE con dati di lavoro privati per cliente (non condivisi come
-- manuali/framework): un programma caricato o una campagna appartengono a un cliente,
-- non a tutti. RLS quindi condivisa fra il team dello stesso cliente (come profili),
-- non pubblica a chiunque sia autenticato (come manuali/framework).
--
-- Ingresso B (Excel MyUniversity + scraping) è rimandato: solo provenienza='pdf' per ora,
-- niente colonna qualita_estrazione finché quello sviluppo non viene ripreso.

create table programmi (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clienti(id) on delete cascade,
  creato_da uuid references profili(id) on delete set null,

  provenienza text not null default 'pdf' check (provenienza = 'pdf'),

  docente_nome text,
  docente_email text,
  ateneo text,
  corso_laurea text,
  classe_laurea text,
  materia_inferita text,

  manuali_citati jsonb not null default '[]'::jsonb, -- [{titolo,autore,editore,ruolo:'principale'|'alternativo'}]

  manual_catalog_id uuid references manuali(id),
  manual_catalog_stato text check (manual_catalog_stato in ('confermato', 'NOT_IN_CATALOG', 'NO_MANUAL', 'NOT_SPECIFIED')),

  relazione_docente_manuale text not null default 'nessuna'
    check (relazione_docente_manuale in ('nessuna', 'autore', 'coautore', 'curatore', 'traduttore', 'collega_ateneo', 'collega_dipartimento')),

  -- calcolato rispetto a clienti.editore_proprio al momento della pre-classificazione,
  -- poi validato/corretto in JS (mai preso per buono così come lo restituisce l'IA) —
  -- vedi validateZanichelliScenario nell'originale, da riscrivere con editoreProprio a runtime
  scenario_editore_proprio text check (scenario_editore_proprio in ('principale', 'alternativo', 'assente')),

  testo_programma text not null,

  stato text not null default 'staging' check (stato in ('staging', 'confermato')),
  dati_verificati boolean not null default false,

  created_at timestamptz not null default now()
);

create table campagne (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clienti(id) on delete cascade,
  creato_da uuid references profili(id) on delete set null,

  tipo text not null default 'novita' check (tipo in ('novita', 'monitoraggio')),
  materia text not null,

  -- campi per tipo='novita' (promozione di un solo volume)
  libro_titolo text,
  libro_autore text,
  libro_editore text,
  libro_indice text,
  libro_temi jsonb, -- ["tema1","tema2",...], estratti dall'indice via IA o inseriti a mano

  -- campi per tipo='monitoraggio' (confronto fino a 5 volumi propri sulla stessa materia)
  volumi_monitoraggio jsonb, -- [{manuale_id, titolo, autore, temi}]
  sintesi_disciplina jsonb, -- contatori + nota strategica IA, prodotti dalla prioritizzazione

  fase text check (fase in ('pre_valutazione', 'completa')), -- solo tipo='novita'
  stato text not null default 'bozza' check (stato in ('bozza', 'completata')),

  created_at timestamptz not null default now(),

  check (
    (tipo = 'novita' and libro_titolo is not null)
    or
    (tipo = 'monitoraggio' and volumi_monitoraggio is not null)
  )
);

-- una riga per docente/programma per campagna — tabella dedicata, non JSONB annidato
-- (decisione presa: query di dashboard/filtro molto più semplici di un array in campagne)
create table campagna_target (
  id uuid primary key default gen_random_uuid(),
  campagna_id uuid not null references campagne(id) on delete cascade,
  programma_id uuid not null references programmi(id) on delete cascade,

  -- esito targeting, tipo='novita': banda qualitativa, mai una percentuale mostrata
  -- (il calcolo numerico di overlap/framework score resta interno, solo per ordinare
  -- i target al momento della generazione, mai persistito)
  rilevanza text check (rilevanza in ('alta', 'media', 'bassa')),
  overlap_giudizio text check (overlap_giudizio in ('alto', 'medio', 'basso')),
  framework_giudizio text check (framework_giudizio in ('alto', 'medio', 'basso')),

  -- peso di ciascun modulo del framework per QUESTO programma (alto/medio/basso),
  -- stesso principio di analisi-programma.html: esteso qui fin dalla prima versione,
  -- mai un'assenza trattata come lacuna se il docente non le dà peso
  peso_riferimento jsonb, -- [{modulo, peso}]

  -- esito, tipo='monitoraggio'
  volume_consigliato text,
  tipo_azione text check (tipo_azione in ('DIFESA', 'UPGRADE', 'CONQUISTA', 'DA_VERIFICARE')),
  urgenza text check (urgenza in ('alta', 'media', 'bassa')),
  allineamento text check (allineamento in ('alto', 'medio', 'basso')),
  analisi_cattedra jsonb, -- {scheda, taglio, specificita, manuale_attuale, gap_opportunita, leve_cambio}
  valutazioni_volumi jsonb, -- [{titolo, autore, allineamento, temi_coperti, temi_scoperti, punti_forza, nota_promotore}]

  -- motivazione strutturata (JSON), mai testo libero da re-parsare con regex come nell'originale
  motivazione jsonb,

  email_oggetto text,
  email_corpo text,

  created_at timestamptz not null default now(),

  unique (campagna_id, programma_id)
);

alter table programmi enable row level security;
alter table campagne enable row level security;
alter table campagna_target enable row level security;

-- dati di lavoro condivisi fra tutto il team dello stesso cliente (stesso spirito
-- collaborativo di profili/clienti): un gestore deve poter correggere lo staging
-- caricato da un promotore, non solo il proprio. Nessuna restrizione per singolo utente.

create policy programmi_select on programmi for select
  using (cliente_id = cliente_corrente());

create policy programmi_insert on programmi for insert
  with check (cliente_id = cliente_corrente());

create policy programmi_update on programmi for update
  using (cliente_id = cliente_corrente());

create policy campagne_select on campagne for select
  using (cliente_id = cliente_corrente());

create policy campagne_insert on campagne for insert
  with check (cliente_id = cliente_corrente());

create policy campagne_update on campagne for update
  using (cliente_id = cliente_corrente());

create policy campagna_target_select on campagna_target for select
  using (exists (
    select 1 from campagne c where c.id = campagna_target.campagna_id and c.cliente_id = cliente_corrente()
  ));

create policy campagna_target_insert on campagna_target for insert
  with check (exists (
    select 1 from campagne c where c.id = campagna_target.campagna_id and c.cliente_id = cliente_corrente()
  ));

create policy campagna_target_update on campagna_target for update
  using (exists (
    select 1 from campagne c where c.id = campagna_target.campagna_id and c.cliente_id = cliente_corrente()
  ));
