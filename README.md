# Atlante

Applicazione per promotori editoriali universitari: un'anagrafica condivisa di manuali e
framework di valutazione, più quattro aree di lavoro che la usano — Offerta formativa,
Confronto manuali, Analisi di un programma, Piano di promozione — su un modello multi-tenant
(un editore = un "cliente", con utenti gestore/promotore).

Per lo stato dettagliato del progetto e le decisioni ancora aperte, vedi
[`Recap_Atlante_e_Decisioni_Aperte.html`](Recap_Atlante_e_Decisioni_Aperte.html) — è il
documento da tenere aggiornato e da rileggere prima di riprendere in mano il progetto.

## Stack

- **Frontend**: file statici in [`app/`](app) — HTML/CSS/JS puro, nessun framework, nessun
  build step.
- **Backend**: [Supabase](https://supabase.com) — Postgres con Row Level Security per
  l'isolamento multi-tenant, Auth (magic link via email), Edge Function per le operazioni
  privilegiate, Storage per i dataset di Offerta formativa.
- **Hosting**: [Netlify](https://netlify.com), deploy automatico a ogni push su `main`
  (vedi [`netlify.toml`](netlify.toml) — pubblica solo `app/`, non la root del repo).
- **Email transazionali**: [Resend](https://resend.com), dominio verificato
  `atlante-editoriale.com`, sia come SMTP custom di Supabase Auth (login/inviti) sia via API
  diretta dalle Edge Function (notifiche).

## Sviluppo locale

```bash
node scripts/dev-server.mjs
```

Serve `app/` sulla porta 5500, URL **senza** prefisso `/app/` (es.
`http://localhost:5500/login.html`).

In alternativa, Live Server di VS Code aperto sulla radice del repo serve con prefisso
`/app/` (es. `http://127.0.0.1:5500/app/login.html`) — occhio a quale dei due sta girando,
cambia l'URL.

## Database e Edge Function

Non c'è una CLI Supabase collegata in locale (nessun `supabase/config.toml`): le migration si
applicano a mano.

- **Migration** ([`supabase/migrations/`](supabase/migrations)): incollare il contenuto in
  Supabase → **SQL Editor** → Run, in ordine di data.
- **Edge Function** ([`supabase/functions/`](supabase/functions)): Supabase → **Edge
  Functions** → *Deploy a new function* (o apri quella esistente) → **Via Editor** → incolla
  → Deploy.
- **Secret** (chiavi API esterne, es. `OPENAI_API_KEY`, `RESEND_API_KEY`): Supabase → **Edge
  Functions** → **Secrets**.

## Automazioni

[`.github/workflows/keep-alive.yml`](.github/workflows/keep-alive.yml) fa un ping leggero al
database due volte a settimana, per evitare la pausa per inattività del piano Free di
Supabase.

## Altri documenti nel repo

- [`Piano_Accesso_e_Modello_Commerciale.html`](Piano_Accesso_e_Modello_Commerciale.html) — le
  decisioni originali sul modello di accesso/commerciale (punti A-G).
- [`Percorso_Reale_Accesso_B_E.html`](Percorso_Reale_Accesso_B_E.html) — walkthrough
  interattivo con dati reali dal codice deployato.
- [`Simulazione_Processo_Accesso.html`](Simulazione_Processo_Accesso.html) — il mockup
  interattivo originale (dati inventati), costruito prima dell'implementazione.
