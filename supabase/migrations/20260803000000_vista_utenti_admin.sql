-- Vista utenti cross-cliente per l'amministratore — rifinitura deferita dal 29 luglio 2026,
-- ora sensata perché esiste un secondo cliente reale. profili_select esistente limita già
-- correttamente ogni utente al proprio cliente_id (cliente_corrente()): questa è una seconda
-- policy SELECT, permissiva, che si somma in OR alla prima (comportamento standard di
-- Postgres per più policy permissive sullo stesso comando) — un gestore normale continua a
-- vedere solo il proprio team, l'amministratore (stessa email fissa già usata altrove) vede
-- tutti i clienti.

create policy profili_select_admin on profili for select
  using (auth.jwt() ->> 'email' = 'sartinisergio@gmail.com');
