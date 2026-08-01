-- Bug trovato testando "Rigenera target": la migration 20260722000000 definiva
-- policy select/insert/update per programmi/campagne/campagna_target ma NON delete.
-- Su Postgres, senza una policy per un comando, quel comando non tocca nessuna riga
-- ma non restituisce nemmeno un errore: la DELETE su campagna_target prima di
-- reinserire i target rigenerati falliva silenziosamente (0 righe cancellate),
-- causando poi un conflitto sul vincolo unique (campagna_id, programma_id)
-- all'inserimento dei nuovi. Stesso problema silente probabile sul bottone
-- "Elimina" dello staging (programmi).

create policy programmi_delete on programmi for delete
  using (cliente_id = cliente_corrente());

create policy campagne_delete on campagne for delete
  using (cliente_id = cliente_corrente());

create policy campagna_target_delete on campagna_target for delete
  using (exists (
    select 1 from campagne c where c.id = campagna_target.campagna_id and c.cliente_id = cliente_corrente()
  ));
