-- Manca la policy DELETE su framework, stesso bug già corretto in 20260722020000
-- per programmi/campagne/campagna_target: con RLS attiva e nessuna policy per un
-- comando, quel comando non tocca nessuna riga ma non restituisce errore — una
-- DELETE dalla UI catalogo fallirebbe silenziosamente (0 righe cancellate).

create policy framework_delete on framework for delete
  using (ruolo_corrente() = 'gestore');
