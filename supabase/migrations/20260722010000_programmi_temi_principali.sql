-- Lacuna trovata durante la costruzione della Campagna (voce 3, passo 4): la
-- pre-classificazione IA di piano-promozione.html estrae temi_principali ma la
-- prima migration di questa voce non aveva la colonna per salvarli. Servono per
-- l'overlap tematico libro<->programma nel targeting delle campagne.

alter table programmi add column temi_principali jsonb not null default '[]'::jsonb;
