-- CEA (Casa Editrice Ambrosiana) è un marchio di Zanichelli, ma in `manuali` era
-- salvato come editore distinto ("CEA" vs "Zanichelli") — il confronto esatto usato
-- ovunque nell'app per capire se un manuale è "proprio" (m.publisher === editoreProprio,
-- vedi confronto.html/analisi-programma.html/piano-promozione.html/utilita.html) trattava
-- quindi tutti i libri CEA come competitor. Unifica la stringa editore: nessun codice
-- da toccare, il matching esistente funziona così com'è una volta allineato il dato.
--
-- Prima di eseguire, verificare con:
--   select publisher, count(*) from manuali where publisher in ('CEA', 'Zanichelli') group by publisher;
--   select id, nome, editore_proprio from clienti where editore_proprio in ('CEA', 'Zanichelli');
-- per controllare che non ci siano varianti di grafia (spazi, maiuscole) che il filtro
-- esatto sotto non catturerebbe.

update manuali
set publisher = 'Zanichelli-CEA'
where trim(publisher) in ('CEA', 'Zanichelli');

update clienti
set editore_proprio = 'Zanichelli-CEA'
where trim(editore_proprio) in ('CEA', 'Zanichelli');
