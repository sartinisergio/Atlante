-- Voce "Offerta formativa" (base MyUniversity 2.0) — vedi Piano_Sviluppo_Offerta_Formativa.html
-- Due pezzi minimi per il gate d'accesso, prima di toccare l'interfaccia:
--   1) entitlement per-cliente (decisione 1 del piano: campo booleano semplice, non un tier generale)
--   2) bucket Storage privato dove vivrà la copia dei CSV di MyUniversity (oggi statici pubblici su Netlify)
--
-- Il bucket resta privato e SENZA policy storage.objects per anon/authenticated: l'unico
-- lettore previsto è l'Edge Function che genera URL firmati, e usa la service role key,
-- che bypassa RLS/policy per definizione. Aggiungere policy qui vorrebbe dire aprire
-- accesso diretto al bucket, esattamente ciò che il gate deve evitare.

alter table clienti
  add column offerta_formativa_inclusa boolean not null default false;

insert into storage.buckets (id, name, public)
values ('offerta-formativa', 'offerta-formativa', false)
on conflict (id) do nothing;
