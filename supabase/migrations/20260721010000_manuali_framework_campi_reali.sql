-- Allinea manuali/framework ai campi realmente presenti nelle fonti,
-- verificati leggendo il codice sorgente locale (non i documenti di piano):
-- - MAP: Desktop/applicazioni AI/MAP/MAP Manual Analyses Platform/js/{app,admin}.js
--   + lettura diretta via Firestore REST pubblica (progetto analisi-manuali-zanichelli)
-- - MATRIX: Desktop/applicazioni AI/Matrix-Intelligence/.../public/static/data/
--   catalogo_manuali.json (85 voci) e catalogo_framework.json (21 voci)
--
-- isbn non esiste in nessuna delle due fonti: era una colonna ipotizzata nella
-- prima migration, qui rimossa. autore/materia/volume invece esistono in entrambe
-- (MAP: author/subject/volume — MATRIX: author/subject) e vanno promossi da dati jsonb
-- a colonne reali perché servono per ricerca/filtro.

alter table manuali add column autore text;
alter table manuali add column materia text;
alter table manuali add column volume int;
alter table manuali drop column isbn;

-- framework.disciplina rinominata in materia: stesso concetto di manuali.materia
-- (entrambe le fonti usano "subject" con gli stessi valori, es. "Chimica Generale"),
-- nome coerente per poter incrociare le due tabelle nella stessa query.
alter table framework rename column disciplina to materia;
