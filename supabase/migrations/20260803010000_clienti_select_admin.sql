-- Completa 20260803000000_vista_utenti_admin.sql: profili(clienti(nome, editore_proprio)) è
-- un embed che rispetta ANCHE la RLS di clienti, non solo quella di profili — senza questa
-- policy, nome cliente ed editore proprio risultano null (quindi "—" in UI) per ogni cliente
-- diverso da quello dell'amministratore. Bug reale trovato verificando dal vivo la vista
-- "Utenti per cliente" appena costruita.

create policy clienti_select_admin on clienti for select
  using (auth.jwt() ->> 'email' = 'sartinisergio@gmail.com');
