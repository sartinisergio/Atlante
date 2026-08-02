-- Un solo gestore per organizzazione, sempre esattamente uno (mai zero, mai più di uno).
-- Decisione del 2 agosto 2026: prima un gestore poteva promuovere liberamente qualsiasi
-- promotore a gestore (profili_update_gestore lo permette senza limiti), un'organizzazione
-- poteva finire con più gestori nel tempo. Il modello ora è un trasferimento: promuovere un
-- collega retrocede automaticamente, nella stessa transazione, il gestore attuale a
-- promotore. Risolve anche la guardia anti-ultimo-gestore già in coda dal 29 luglio 2026:
-- non esiste più un'azione che retroceda un gestore SENZA nominare contestualmente un
-- successore (vedi anche il controllo lato app in utenti.html sulla rimozione).
--
-- security invoker (non definer): si appoggia alla RLS già esistente su profili
-- (profili_update_gestore consente già a un gestore di aggiornare il ruolo di chiunque nel
-- proprio cliente_id) — nessun bypass privilegiato necessario, la funzione serve solo a
-- rendere atomica un'operazione che tocca due righe insieme.

create or replace function trasferisci_ruolo_gestore(p_nuovo_gestore_id uuid) returns void
language plpgsql as $$
begin
  if ruolo_corrente() <> 'gestore' then
    raise exception 'Solo il gestore attuale può trasferire il ruolo.';
  end if;

  if not exists (
    select 1 from profili
    where id = p_nuovo_gestore_id
      and cliente_id = cliente_corrente()
      and stato <> 'rimosso'
  ) then
    raise exception 'Utente non trovato nel tuo team.';
  end if;

  update profili
  set ruolo = case when id = p_nuovo_gestore_id then 'gestore'::ruolo_utente else 'promotore'::ruolo_utente end
  where cliente_id = cliente_corrente()
    and (id = p_nuovo_gestore_id or ruolo = 'gestore')
    and stato <> 'rimosso';
end;
$$;
