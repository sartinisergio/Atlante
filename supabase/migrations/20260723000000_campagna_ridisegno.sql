-- Ridisegno della voce "Piano di promozione" richiesto da Sergio dopo il primo giro di
-- test (23 luglio 2026), vedi Piano_Sviluppo_Piano_Promozione.html per il contesto.
--
-- 1. programmi: due analisi che NON dipendono dalla campagna — la valutazione del
--    programma rispetto al framework, e la valutazione del manuale adottato — vengono
--    calcolate una volta sola e riusate da qualunque campagna tocchi lo stesso docente
--    in futuro, mai rigenerate ad ogni campagna (risparmio di chiamate IA).
-- 2. campagne: "modalita" sostituisce "tipo" — volume_singolo (quello gia' costruito e
--    testato, prima chiamato 'novita') oppure catalogo_materia (selezione manuale di
--    alcuni manuali propri della stessa materia, con un limite, come nell'originale
--    MATRIX Intelligence Plus): stessa idea del "monitoraggio disciplinare" previsto in
--    origine come funzione a parte, qui e' solo una modalita' della campagna.
-- 3. campagna_target: via le colonne specifiche del vecchio "monitoraggio"
--    (tipo_azione/urgenza/allineamento/analisi_cattedra/valutazioni_volumi/
--    volume_consigliato — le etichette DIFESA/UPGRADE/CONQUISTA di MATRIX Intelligence
--    Plus, sostituite su richiesta esplicita): resta solo opzioni_catalogo, l'unica
--    parte davvero specifica di ogni campagna (le prime due valutazioni vivono ora su
--    programmi, vedi punto 1).
--
-- Dati di test esistenti (11 programmi, 1 campagna): nessun dato di produzione da
-- preservare, la campagna/i target di test vanno rigenerati dopo questa migration.

alter table programmi add column valutazione_programma jsonb;
alter table programmi add column valutazione_manuale_adottato jsonb;

alter table campagne rename column tipo to modalita;
alter table campagne rename column volumi_monitoraggio to volumi_selezionati;
alter table campagne alter column modalita set default 'volume_singolo';

-- elimina TUTTI i check constraint esistenti su campagne (tipo/stato/fase + quello
-- combinato) PRIMA di toccare i valori — se lo si fa dopo, il vecchio vincolo (ancora
-- attivo, ora riferito a "modalita" dopo il rename ma con gli stessi valori ammessi di
-- prima: 'novita'/'monitoraggio') rifiuta l'update che scrive 'volume_singolo', perche'
-- quel valore non esisteva nella lista consentita dal vincolo originale (bug reale
-- incontrato al primo tentativo di questa migration)
do $$
declare r record;
begin
  for r in select conname from pg_constraint where conrelid = 'campagne'::regclass and contype = 'c'
  loop
    execute format('alter table campagne drop constraint %I', r.conname);
  end loop;
end $$;

-- ORA che non c'e' piu' nessun vincolo attivo, e' sicuro tradurre i valori esistenti
-- (dati di test: 'novita'/'monitoraggio') nei nuovi nomi
update campagne set modalita = 'volume_singolo' where modalita = 'novita';
update campagne set modalita = 'catalogo_materia' where modalita = 'monitoraggio';

alter table campagne add constraint campagne_modalita_check check (modalita in ('volume_singolo', 'catalogo_materia'));
alter table campagne add constraint campagne_stato_check check (stato in ('bozza', 'completata'));
alter table campagne add constraint campagne_fase_check check (fase in ('pre_valutazione', 'completa'));
alter table campagne add constraint campagne_check check (
  (modalita = 'volume_singolo' and libro_titolo is not null)
  or
  (modalita = 'catalogo_materia' and volumi_selezionati is not null)
);

alter table campagna_target drop column volume_consigliato;
alter table campagna_target drop column tipo_azione;
alter table campagna_target drop column urgenza;
alter table campagna_target drop column allineamento;
alter table campagna_target drop column analisi_cattedra;
alter table campagna_target drop column valutazioni_volumi;

-- unica parte specifica di ogni campagna: [{manuale_id, titolo, autore, editore,
-- vantaggi, copertura_gap, ...}], ordinato per rilevanza — per modalita'='volume_singolo'
-- l'array ha sempre una sola voce (il volume promosso)
alter table campagna_target add column opzioni_catalogo jsonb;
