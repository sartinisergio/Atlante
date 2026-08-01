# Atlante — Piano di implementazione del restyling (Direzione A · "Editoria matura")

**Versione documento**: 3 — 25 luglio 2026. La v2 era il piano; questa versione registra anche
**l'implementazione, che è stata eseguita**, e le decisioni prese sui punti che il piano lasciava
aperti. Scritta dopo lettura integrale sia dei mockup in `revisione design Atlante/project/` sia del
codice in `app/`.

**Per chi legge**: le sezioni 1-8 sono la mappa del lavoro — servono a capire *perché* il codice è
fatto così, e restano il riferimento per chi lo tocca da qui in avanti. La **§0** dice cosa è stato
fatto e cosa manca; la **§9** registra le decisioni prese sui punti in cui il mockup prometteva più
di quanto i dati potessero produrre.

**Regola di precedenza**: se questo documento e un mockup HTML sono in disaccordo su un **dettaglio
visivo**, vince il mockup. Se sono in disaccordo su **cosa fa il codice o cosa contiene il
database**, vince questo documento — le sezioni 2, 7 e 9 sono state verificate leggendo i file.

---

## 0. Stato dell'implementazione — 25 luglio 2026

**Il restyling descritto in questo documento è stato implementato.** Tutte e 7 le pagine di `app/`
usano la Direzione A. Questa sezione registra cosa è stato fatto, con quali decisioni, e cosa resta
aperto: le sezioni 1-8 restano la mappa di riferimento del lavoro, la §9 registra le decisioni prese.

### 0.1 File creati

| File | Righe | Contenuto |
|---|---|---|
| `app/css/tokens.css` | ~140 | Palette, scala dei giudizi, font, spaziature, raggi, ombre. Nessun `@import` di font: i `<link>` a Google Fonts stanno nell'`<head>` di ogni pagina, con fallback Georgia. |
| `app/css/shell.css` | ~840 | Sidebar, layout, e **tutti** i componenti condivisi: bottoni, campi, card, badge, status, giudizi, tabelle, matrici, stepper, split view, form-card, lavorazione, modali, empty state, accordion, responsive, stampa. |
| `app/js/shell.js` | ~170 | Sidebar generata client-side + hamburger sotto i 1200px + `popolaSidebar()` che la riempie coi dati reali. |

### 0.2 File modificati

- **`app/js/atlante-shared.js`** — da 45 a ~230 righe. Aggiunti: `classeStato()` / `classeGiudizio()`
  (§4.4), `badgeStato()` / `badgeGiudizio()` centralizzati, `avviaSessione()` (bootstrap comune di
  sessione + profilo + cliente), `bloccoSenzaProfilo()`, `creaLavorazione()` (progresso narrativo
  condiviso da Analisi e Confronto), `formattaNumero()`, `tempoRelativo()`.
- **Le 7 pagine HTML** — `<head>`, `<style>` e markup riscritti; JS di rendering adattato alle nuove
  classi. Tutta la logica di dominio (prompt, query, calcoli, DuckDB, delta, export) è invariata.

### 0.3 Cosa NON è stato toccato, come previsto dalla §1.3

Nessun prompt AI, nessuna migration, nessun calcolo non-AI, nessuno script in `scripts/`, nessuna
modifica al pipeline dati dell'Offerta formativa. `scripts/dev-server.mjs` non è stato modificato:
i font restano su Google Fonts, quindi la mappa MIME non ha bisogno di `.woff2`.

### 0.4 Verifica eseguita

- Le 7 pagine caricano senza errori in console; il JS inline di tutte è stato validato con un parse
  test (`new Function`) — l'unico che non può essere validato così è il modulo ESM dell'Offerta, di
  cui è stata verificata l'esecuzione fino a `main()`.
- Sidebar, voce attiva, breadcrumb e collasso sotto i 1200px verificati a schermo.
- Le viste dei risultati (Confronto: scoreboard, matrice A, verdetti, matrice B, reciproco, adozione
  — Analisi: le 12 card di §4.5 — Piano: pipeline, lista campagne, tabella target, drawer) verificate
  a schermo con dati di prova iniettati, non con dati reali: **manca ancora un giro end-to-end con
  Supabase e una chiave OpenAI vera** (vedi §0.6).

### 0.5 Un file rimasto in piedi

`app/css/atlante-theme.css` **non è più referenziato da nessuna pagina** (verificato con grep, anche
sugli attributi `style=`) e i suoi token non sono più usati. Non è stato cancellato perché il
progetto non è sotto controllo di versione: la cancellazione va fatta a mano quando si è pronti.

```bash
rm "app/css/atlante-theme.css"
```

Lo shim di compatibilità dei vecchi nomi di token (§7.1) non è stato scritto: serviva solo a far
convivere pagine migrate e non migrate durante una migrazione incrementale, mentre qui sono state
migrate tutte in un passaggio unico.

### 0.6 Cosa resta da fare prima di considerarlo chiuso

1. **Giro funzionale completo con dati reali** — la checklist di §8.2, con un utente `promotore` e
   uno `gestore`, un cliente con e uno senza `offerta_formativa_inclusa`, e una chiave OpenAI valida.
   È l'unica parte del piano che non può essere fatta senza credenziali.
2. Le decisioni ancora aperte elencate in §9.
3. La cancellazione di `atlante-theme.css` qui sopra.

---

## 1. Scopo e perimetro del restyling

### 1.1 In una frase

Sostituire la UI delle 7 pagine HTML in `app/` con il linguaggio visivo della Direzione A
(sidebar persistente, coppia tipografica Fraunces + Inter, design tokens centralizzati, split view
e stepper per i flussi lunghi), **mantenendo intatta tutta la logica JavaScript esistente**:
autenticazione Supabase, query, prompt OpenAI, DuckDB-WASM, export, delta localStorage.

### 1.2 Dentro il perimetro

| Ambito | Cosa si fa |
|---|---|
| Markup delle 7 pagine | Riscritto secondo i mockup `A-*.html` |
| CSS | Nuovi `tokens.css` + `shell.css`; gli attuali `<style>` inline delle pagine vengono riscritti |
| Navigazione | Sidebar persistente condivisa (`shell.js`) al posto dei link `← Menu` |
| Componenti | Bottoni, campi, card, badge, tabelle, modali, accordion, stepper, drawer: unificati |
| Rendering dei risultati AI | Cambia solo il **template HTML** in cui i dati vengono iniettati |
| Stati mancanti | Aggiunti empty state, stato "lavorazione" e stato errore dove i mockup li mostrano |

### 1.3 Fuori dal perimetro (non toccare)

- **I prompt OpenAI.** `costruisciPromptQuadro`, `costruisciPromptValutazione`,
  `costruisciPromptManualeVsProgramma`, `costruisciPromptMotivazioniScelta`,
  `costruisciPromptProfiloDocente`, `costruisciPromptInsightsCommerciali`,
  `costruisciPromptGuidaColloquio`, `costruisciPromptExecutiveSummary`,
  `costruisciPromptSintesiRanking` (in `app/analisi-programma.html`),
  `costruisciPromptSingoloManuale`, `costruisciPromptReciproco` (in `app/confronto.html`),
  `costruisciPromptPreClassificazione`, `costruisciPromptValutazioneProgramma`,
  `costruisciPromptValutazioneManualeAdottato`, `costruisciPromptOpzioniCatalogo`,
  `bloccoScenarioEmail` (in `app/piano-promozione.html`). Se un output va mostrato diversamente,
  si cambia il rendering, non il prompt.
- **Lo schema Supabase.** Nessuna migration è necessaria *per il restyling*. Le migration
  eventualmente necessarie per le funzionalità nuove promesse dai mockup sono elencate in §9 come
  decisioni da prendere **prima** di implementarle, non come parte di questo lavoro.
- **La logica di calcolo non-AI**: `calcolaConteggioModuli`, `calcolaArgomentiAdozione`,
  `calcolaSintesiClassiDiLaurea`, `calcolaMappaColloquio`, `calcolaEsitoColloquio`,
  `calcolaFallbackColloquio`, `calcolaRilevanzaTarget`, `pesoModulo`, `levenshteinSimilarity`,
  `checkSubjectMatch`.
- **Il pipeline dati dell'Offerta formativa**: DuckDB-WASM, Cache Storage, Edge Function
  `offerta-formativa-urls`, i limiti `LIMITE_RIGHE_INSEGNAMENTI` / `LIMITE_RIGHE_LAUREE`.
- **Gli script Node** in `scripts/` e le migration in `supabase/`.

### 1.4 Cosa contiene il pacchetto di design

Tutto in `revisione design Atlante/project/`:

```
tokens.css                              ← 95 righe: palette, font, spaziature, raggi, ombre
shell.css                               ← 201 righe: sidebar + layout comune + componenti base
shell.js                                ←  64 righe: sidebar generata client-side

A-home.html                             ← ex app/home.html
A-login.html                            ← ex app/login.html
A-offerta-formativa.html                ← ex app/offerta-formativa.html
A-confronto.html                        ← ex app/confronto.html
A-analisi-programma.html                ← ex app/analisi-programma.html (stato risultato)
A-analisi-programma-input.html          ← stesso file, stato "form vuoto"
A-analisi-programma-lavorazione.html    ← stesso file, stato "AI in corso"
A-piano-promozione.html                 ← ex app/piano-promozione.html (tab Campagne aperto)
A-catalogo.html                         ← ex app/catalogo.html

index.html                              ← galleria di presentazione dei mockup. NON va in produzione.
C-offerta-formativa.html                ← direzione alternativa "C", archivio. NON va in produzione.
C-analisi-programma.html                ← idem. Vedi §9.8 (possibile riuso per la vista di stampa).
originale/*.html                        ← copia di riferimento delle 7 pagine attuali
*.srcmap.json, .thumbnail.jpg,          ← artefatti dell'editor dei mockup. Da ignorare.
.gitattributes
```

**I file `A-*.html` contengono dati fittizi** (Zanichelli, Farmacologia, prof. Bianchi, Katzung,
Goodman & Gilman): mostrano la UI *popolata*, non sono funzionanti — nessuna chiamata Supabase o
OpenAI. I nomi hardcoded (`Z` nell'avatar tenant, `SS` nell'user chip, `Sergio Sartini`,
`223.481`, `348`, `17`, `64`) vanno **tutti** sostituiti con dati reali: l'elenco puntuale è in §4.

**Nota importante**: `originale/*.html` è **byte-identico** ai file in `app/` (verificato con
`diff`). Non è una versione più vecchia: è esattamente la produzione al 25 luglio 2026. Puoi usarla
per confrontare vecchio e nuovo markup senza uscire dalla cartella dei mockup.

---

## 2. Il punto di partenza: com'era `app/` prima del restyling

Questa sezione fotografa il sito **prima** dell'intervento. Serve a due cose: capire da cosa si
parte quando si legge un pezzo di codice sopravvissuto al restyling, e ritrovare ciò che è stato
spostato. Le copie intatte delle 7 pagine originali sono in
`revisione design Atlante/project/originale/`.

### 2.1 Struttura dei file

```
app/
├── login.html                 76 righe   — magic link Supabase, nessuna sidebar
├── home.html                 232 righe   — sidebar (già presente!) + hero con SVG inline
├── catalogo.html             471 righe   — manuali + framework, accordion per materia, form CRUD
├── confronto.html            907 righe   — N manuali su un framework, 2 tabelle + export
├── analisi-programma.html  1.624 righe   — 1 programma vs manuali, la pagina più complessa
├── offerta-formativa.html  1.954 righe   — DuckDB-WASM su ~223k insegnamenti, 3 tab, 7 modali
├── piano-promozione.html   1.846 righe   — 4 tab: carica → staging → database → campagne
├── css/atlante-theme.css      64 righe   — variabili palette calda + componente .come-funziona
└── js/atlante-shared.js       45 righe   — escapeHtml, estraiIndiceManuale, GIUDIZI, chiave OpenAI
```

Nessun framework (no React/Vue), nessun bundler, nessun `npm run build` per il front-end.
Ogni pagina è un file HTML autonomo con `<style>` inline e `<script>` inline.

### 2.2 Come si esegue in locale

```bash
node scripts/dev-server.mjs
```

Server statico minimo (`scripts/dev-server.mjs`, 23 righe) su **http://localhost:5500**, root =
`app/`, `/` → `login.html`. È già registrato in `.claude/launch.json` come configurazione
`atlante-dev`. Il server locale è necessario (non `file://`) perché i magic link Supabase non
possono puntare a un file locale.

⚠️ **Attenzione**: la mappa MIME del dev-server copre solo `.html`, `.js`, `.css`
(`scripts/dev-server.mjs:10`). Qualsiasi altro tipo viene servito come
`application/octet-stream`. Se decidi di **self-hostare i font** (`.woff2`) o aggiungere immagini
(`.svg`, `.png`), devi aggiungere le voci corrispondenti a `MIME` — è l'unica modifica al di fuori
di `app/` che il restyling può richiedere.

### 2.3 Dipendenze runtime (tutte da CDN, nessuna in `package.json`)

`package.json` contiene solo le dipendenze degli **script Node di import**
(`@supabase/supabase-js`, `dotenv`): il front-end non ne usa nessuna.

| Libreria | Versione | Usata in |
|---|---|---|
| `@supabase/supabase-js` (UMD) | 2 | tutte le 7 pagine |
| `pdf.js` | 3.11.174 | `analisi-programma.html`, `piano-promozione.html` |
| `jspdf` + `jspdf-autotable` | 2.5.2 / 3.8.4 | `analisi-programma.html`, `confronto.html` |
| `jquery` | 3.7.0 | `offerta-formativa.html` (solo per DataTables) |
| `DataTables` | 1.13.6 | `offerta-formativa.html` (CSS + JS) |
| `Choices.js` | latest | `offerta-formativa.html` (select multipli con chip) |
| `@duckdb/duckdb-wasm` | 1.28.0 (ESM) | `offerta-formativa.html:759` |

`offerta-formativa.html` è l'unica pagina con `<script type="module">` (riga 758) — le altre usano
script classici. Questo è rilevante: `shell.js` è uno script classico e funziona in entrambi i casi,
ma le funzioni definite dentro il modulo di `offerta-formativa.html` **non sono globali** e quindi
non richiamabili da `onclick=` inline. La pagina infatti registra i suoi handler in
`inizializzaEventListeners()` (riga 1833) — mantieni quel pattern quando riscrivi il markup.

### 2.4 Backend Supabase

Progetto `qnozhdoyczxgxqvehuwc`. URL e anon key sono **hardcoded in ogni pagina** (es.
`app/login.html:32-33`) — il restyling non cambia questa scelta, ma se sposti codice fai attenzione
a non perderle.

Tabelle realmente esistenti (`supabase/migrations/`):

| Tabella | Colonne chiave | Chi la usa |
|---|---|---|
| `clienti` | `nome`, `editore_proprio`, `offerta_formativa_inclusa` | tutte (via join su `profili`) |
| `profili` | `id`, `cliente_id`, `ruolo` (`promotore`\|`gestore`), `nome_completo` | tutte |
| `manuali` | `titolo`, `autore`, `publisher`, `materia`, `edizione`, `anno_pubblicazione`, `volume`, `dati` (jsonb) | home, catalogo, confronto, analisi, piano |
| `framework` | `nome`, `materia`, `versione`, `coverage_type`, `dati` (jsonb) | idem |
| `programmi` | `docente_nome`, `docente_email`, `ateneo`, `corso_laurea`, `classe_laurea`, `materia_inferita`, `manuali_citati`, `manual_catalog_id`, `manual_catalog_stato`, `relazione_docente_manuale`, `scenario_editore_proprio`, `testo_programma`, `temi_principali`, `valutazione_programma`, `valutazione_manuale_adottato`, `stato` (`staging`\|`confermato`), `dati_verificati` | piano |
| `campagne` | `modalita` (`volume_singolo`\|`catalogo_materia`), `materia`, `libro_*`, `libro_temi`, `volumi_selezionati`, `sintesi_disciplina`, `fase` (`pre_valutazione`\|`completa`), `stato` (`bozza`\|`completata`), `created_at` | piano |
| `campagna_target` | `rilevanza`, `overlap_giudizio`, `framework_giudizio`, `peso_riferimento`, `motivazione`, `opzioni_catalogo`, `email_oggetto`, `email_corpo` | piano |

**Tabelle che NON esistono** (la versione 1 di questo documento le citava per errore):
`analisi` e `ricerche_salvate`. Conseguenze operative:

- **Le analisi non vengono salvate da nessuna parte.** `analisi-programma.html` e `confronto.html`
  producono il risultato in memoria (`ultimoRisultato`) e lo perdono al reload. L'unico modo di
  conservarlo è l'export Markdown/HTML/PDF.
- **Le ricerche salvate dell'Offerta formativa sono in localStorage**, chiavi
  `atlante_offerta_ricerche_ins_v1` e `atlante_offerta_ricerche_lau_v1`
  (`app/offerta-formativa.html:790-791`).

RLS: `manuali` e `framework` sono un catalogo condiviso leggibile da qualunque utente autenticato,
scrivibile solo da `ruolo = 'gestore'` — `catalogo.html` mostra i form CRUD solo in quel caso
(riga 458). `programmi`, `campagne`, `campagna_target` sono filtrati per `cliente_id`.

### 2.5 Stato della UI attuale, pagina per pagina

**`login.html`** — Colonna singola, `max-width: 420px`, `margin: 80px auto`. `#email` (con valore
di default `sartinisergio@gmail.com` hardcoded!), `#invia`, `#stato` con classi `.ok/.attesa/.errore`.
`verificaSessione()` reindirizza a `home.html` se esiste un `profili` collegato.

**`home.html`** — **Ha già una sidebar** (`.shell` grid `240px 1fr`, `.sidebar`, 5 `.nav-voce` con
pallino colorato) più un `.hero` con una grossa **illustrazione SVG inline** (libreria con 5 volumi
colorati come le voci + portatile, righe 85-176) e 3 pill statistiche. Etichette attuali delle voci:
"Offerta formativa", "Analisi comparativa", "Analisi di un programma", "Piano di promozione",
"Utilità". La voce Offerta è nascosta se `clienti.offerta_formativa_inclusa` è false. Le stat
mostrano il conteggio reale di `manuali` e `framework` e la stringa **hardcoded** "oltre 200.000
insegnamenti" (riga 225).

**Le altre 5 pagine** condividono lo stesso schema:
- `html`/`body` con `background: color-mix(in srgb, var(--paper) 80%, var(--voce-XXX-tint) 20%)` —
  è il "tint di pagina" che la Direzione A elimina;
- `max-width: 900–1100px; margin: 40px auto` (l'Offerta usa `.container { max-width: 1400px }`);
- `<h1>Atlante — nome sezione</h1>` in Georgia, `#chi` con `email · ruolo · cliente`,
  `<nav><a href="home.html">← Menu</a></nav>`;
- un `<details class="come-funziona" style="--voce-corrente: var(--voce-XXX)">` (componente
  definito in `app/css/atlante-theme.css:48-64`);
- `#contenuto` con `display:none` finché l'autenticazione non è risolta, e `#stato` per gli errori;
- `<h2>1. …</h2>`, `<h2>2. …</h2>` come numerazione dei passi del form;
- `offerta-formativa.html` in più ha un `<header>` a fascia piena color `--voce-offerta` con
  `#header-delta-badge`, una `.catalogo-bar` e `.tab-nav` con `.tab-btn.attivo`.

**Colori hardcoded da eliminare** (la Direzione A li sostituisce con token): in
`offerta-formativa.html` gli header dei modali usano `background:#6b7280` (riga 618),
`background:#1e40af` (riga 643) e altri; `analisi-programma.html` usa `#cfe0d0`, `#f5faf6`,
`#f1dbd7`, `#d6e8f5` ecc. nelle regole `.giudizio-*` e `.adozione`; `piano-promozione.html` usa
`#9c3b30`, `#dcece3`, `#f1dbd7` inline nei render.

### 2.6 Il modulo condiviso `app/js/atlante-shared.js`

45 righe, script classico caricato **prima** dello script di pagina in `analisi-programma.html`,
`confronto.html`, `piano-promozione.html` (non in `catalogo.html`, che ridefinisce localmente il
proprio `escapeHtml`, e non in `home.html`/`login.html`/`offerta-formativa.html`). Espone:

- `escapeHtml(s)` — escape di `& < >`, tollerante a `null`;
- `estraiIndiceManuale(m)` — estrae l'indice da `manuali.dati.raw` provando in ordine
  `index_chapters` → `chapters_summary` → `temi_chiave`;
- `GIUDIZI` = `['insufficiente','sufficiente','discreto','buono','molto buono','eccellente']`,
  più `normalizzaGiudizio`, `rangoGiudizio`, `RANGO_STATO`;
- **chiave e modello OpenAI in `sessionStorage`**, chiavi `atlante_openai_key` e
  `atlante_openai_modello`, via `leggiChiaveOpenAI` / `salvaChiaveOpenAI` / `leggiModelloOpenAI` /
  `salvaModelloOpenAI`.

⚠️ **Correzione rispetto alla versione 1 di questo documento**: la chiave OpenAI è in
**`sessionStorage`, non `localStorage`** — scelta esplicita e commentata nel codice
(`app/js/atlante-shared.js:38-39`): sparisce chiudendo la scheda, non viene mai scritta su disco né
su Supabase. Il restyling **non deve cambiarla** e i testi delle label che la spiegano
("usata solo dal tuo browser, non viene salvata su Atlante") vanno mantenuti.

---

## 3. Sintesi del design di riferimento (Direzione A)

### 3.1 I sette principi (invariati rispetto alla v1 — restano validi)

**1 · Sidebar persistente, non `← Menu`.** 260px a sinistra, `position: sticky; top: 0;
height: 100vh; overflow-y: auto`. L'utente non torna mai alla home per cambiare sezione. È il
cambiamento singolo più importante e va rispettato ovunque tranne che nel login.

**2 · Colori-voce come segno, non come sfondo.** Le 5 aree hanno un colore identificativo, ma **non**
si usa più come tint dello sfondo pagina (`color-mix(paper, voce-tint)` va rimosso da tutte le 5
pagine interne). Si usa come: pallino nella sidebar (`.nav-voce .dot`), barra colorata a sinistra
delle card (`.card.marked::before`, 3px), colore dei bottoni primari della sezione (`--v`), accento
nel titolo (`h1.page em`).

**3 · Multi-tenant a livello di UI.** Un selettore tenant `.tenant` in cima alla sidebar mostra il
cliente collegato. Oggi è a un solo valore (il `clienti` del proprio `profili`): il `▾` è
predisposizione, non funzionalità — vedi §9.2.

**4 · Font: Fraunces (serif) + Inter (sans).** Serif per titoli e valori numerici importanti, sans
per UI/form/tabelle. Sostituibili cambiando `--font-serif` / `--font-sans` in `tokens.css`.

**5 · Flussi lunghi → stepper.** Analisi (4 passi), Confronto (3 passi), Piano (4 stadi, chiamato
`.pipeline`). Stati per passo: idle (default), `.on` (corrente), `.done` (completato).

**6 · Split view per Analisi e Confronto.** `.split { grid-template-columns: 420px 1fr }`, colonna
sinistra `.form-col { position: sticky; top: 20px }` con il form, destra con il risultato. Risolve
un problema concreto dell'app attuale: oggi form e risultato sono in scroll continuo e rilanciare
l'analisi fa perdere di vista il rapporto che si stava leggendo.

**7 · Tre stati per l'AI: input vuoto → lavorazione → risultato.** L'app oggi ha solo il terzo
(più uno spinner `#msg.attesa`). Vedi §5, Fase 6.

**8 · Niente punteggi numerici, sempre giudizi qualitativi.** Conferma di una scelta già presente
nell'app (`GIUDIZI` a 6 livelli, stati `presente/parziale/assente`). Il restyling la rispetta:
`.status` e `.giud .val` non mostrano numeri.

### 3.2 Design tokens (`tokens.css`)

`@import` da Google Fonts di Fraunces (300–700, asse `opsz` variabile), Inter (400–700), JetBrains
Mono (400–500). Poi:

- **Neutri carta**: `--paper #f7f3ec`, `--paper-warm #efe8d9`, `--paper-deep #e7dfcd`,
  `--surface #ffffff`, `--surface-2 #f2ecdf`.
- **Inchiostri**: `--ink #1c1a17`, `--ink-2 #35312a`, `--ink-muted #6b6455`, `--ink-faint #948b78`.
- **Linee**: `--line #d8cfb8`, `--line-soft #e6dec9`.
- **Voci** — ognuna con tripletta base / `-soft` (sfondo tint) / `-ink` (testo su tint):

  | Voce | base | soft | ink | Nome |
  |---|---|---|---|---|
  | `--voce-offerta` | `#b8862a` | `#efe0b8` | `#6b4c0f` | ocra manoscritto |
  | `--voce-confronto` | `#5a7f5a` | `#d9e3d3` | `#2f4a2f` | verde muschio |
  | `--voce-analisi` | `#446a8a` | `#d5dfe8` | `#21384c` | blu carta geografica |
  | `--voce-piano` | `#7a4e8a` | `#e3d5e8` | `#422152` | prugna |
  | `--voce-utilita` | `#a8552a` | `#ecd8c7` | `#6b2f14` | terracotta |

- **Semantici**: `--ok #4f7a2f`, `--warn #a5771a`, `--err #9c3b30`, `--info #446a8a`, ciascuno con
  `-soft`.
- **Spaziature** `--s-1`…`--s-8` (4, 8, 12, 16, 24, 32, 48, 64px).
- **Raggi** `--r-sm 4` / `--r-md 8` / `--r-lg 12` / `--r-xl 20`.
- **Ombre** `--sh-1` / `--sh-2` / `--sh-3`, basse e calde.
- Reset: `* { box-sizing: border-box }`, `html, body { margin/padding 0 }`, font-smoothing.

⚠️ I nomi dei token **cambiano** rispetto a `app/css/atlante-theme.css`: `--voce-XXX-tint` diventa
`--voce-XXX-soft`, `--voce-XXX-strong` diventa `--voce-XXX-ink`, e i vecchi `--accent`,
`--accent-strong`, `--accent-tint`, `--amber`, `--amber-tint`, `--brick`, `--brick-tint`, `--green`,
`--green-tint` **non esistono più**. Vedi §7.1 per la strategia di compatibilità.

I valori dei colori-voce sono anche **più desaturati** dei precedenti (es. Offerta passa da
`#d9a463` a `#b8862a`): la Direzione A li usa come inchiostro su carta, non come pastello di sfondo.
Un effetto collaterale voluto: il contrasto testo su `-soft` migliora.

### 3.3 Shell condivisa (`shell.css`)

- `body.a-shell { display: grid; grid-template-columns: 260px 1fr; min-height: 100vh }`
- `aside.sidebar` — sticky, full-height, `overflow-y: auto`. Contiene: `.brand` (logo serif
  "Atlante." con il punto in corsivo colorato + `.badge-prod` "v2"), `.tenant` (avatar quadrato,
  nome cliente, `▾`), `.side-label` "Aree di lavoro", 4 `.nav-voce`, `.side-label` "Riferimento",
  1 `.nav-voce`, `.user-chip` (`margin-top: auto`, iniziali + nome + "ruolo · zona").
- `.nav-voce.attivo` prende `var(--voce-corrente-soft)` come sfondo e `var(--voce-corrente-ink)`
  come testo, ma **il pallino di ogni voce mantiene sempre il proprio colore** (via `style="--dot: …"`
  inline): la sidebar resta un promemoria delle altre aree. Comportamento voluto, non un bug.
- `main.a-main { padding: 28px 40px 60px; max-width: 1520px }` — le singole pagine restringono:
  1240px (home), 1320px (catalogo), 1520px (analisi).
- `.crumb` (breadcrumb `Atlante › Cliente › Sezione`), `h1.page` (34px Fraunces 400, `em` colorato),
  `.subtitle`.
- **Componenti riusabili già in `shell.css`**: `.btn` + `.btn-primary` / `.btn-ghost` / `.btn-quiet`;
  `.field` (+ `textarea.field`); `.card` e `.card.marked`; `.helper` (callout tipo "come funziona");
  `.badge` + `.b-tri` / `.b-mag` / `.b-cu` / `.b-ok` / `.b-warn` / `.b-err`;
  `.status` + `.s-pres` / `.s-parz` / `.s-ass` / `.s-idle`.

### 3.4 Sidebar dinamica (`shell.js`)

64 righe. Uso: `<script src="shell.js" data-attiva="analisi"></script>`, valori ammessi
`offerta | confronto | analisi | piano | catalogo` o `""` (home). Legge
`document.currentScript.dataset.attiva` all'esecuzione, poi su `DOMContentLoaded` scrive
`innerHTML` in `#sidebar` e aggiunge `a-shell` a `document.body`.

Etichette usate nel mockup: "Offerta formativa" / "Confronto manuali" / "Analisi programma" /
"Piano di promozione" (sotto "Aree di lavoro") e "Catalogo" (sotto "Riferimento").

⚠️ Tre punti da correggere in fase di integrazione (vedi Fase 2):
1. Gli `href` puntano ai nomi dei mockup (`A-home.html`, `A-offerta-formativa.html`, …).
2. `document.body.classList.add('a-shell')` avviene su `DOMContentLoaded` → **flash di layout**
   non-grid al primo paint. Va messo `class="a-shell"` direttamente nel markup di ogni pagina.
3. Tenant e user chip sono hardcoded (`Z`, `Zanichelli`, `SS`, `Sergio Sartini`,
   `promotore · Nord-Ovest`).

### 3.5 Responsive: stato reale del design

**Solo `A-login.html` ha una media query** (`@media (max-width: 900px)`, riga 166: la griglia
diventa a colonna singola). Verificato: nessun'altra pagina della Direzione A e né `shell.css` né
`tokens.css` contengono `@media`. Il design è pensato per **desktop ≥ 1440px** e non è prototipato
sotto i 1200px. Vedi §6.7 e §9.7.

### 3.6 Asset

**Zero asset binari.** Nessun `<img>`, nessun `<svg>`, nessun `url(...)` a parte l'import dei
Google Fonts. Tutta la grafica dei mockup è CSS (gradienti, bordi, pseudo-elementi) più glifi
tipografici: `▾ ▸ ✓ ✕ × ★ ⌕ ✉ ＋ ↓ ↺ ↻ ➔ § ✎ ⋯` e numeri romani (`I`–`VII`) in Fraunces corsivo.

Conseguenza: **l'illustrazione SVG della home attuale (`app/home.html:85-176`) non ha un
corrispettivo nella Direzione A.** È una decisione da prendere — vedi §9.1.

---

## 4. Mappatura pagine e componenti

### 4.1 Pagine

| Produzione | Mockup | Voce sidebar (`data-attiva`) | Colore-voce |
|---|---|---|---|
| `app/login.html` | `A-login.html` | *(nessuna sidebar)* | `--voce-analisi` |
| `app/home.html` | `A-home.html` | `""` | `--voce-utilita` |
| `app/offerta-formativa.html` | `A-offerta-formativa.html` | `offerta` | `--voce-offerta` |
| `app/confronto.html` | `A-confronto.html` | `confronto` | `--voce-confronto` |
| `app/analisi-programma.html` | `A-analisi-programma*.html` (3 stati) | `analisi` | `--voce-analisi` |
| `app/piano-promozione.html` | `A-piano-promozione.html` | `piano` | `--voce-piano` |
| `app/catalogo.html` | `A-catalogo.html` | `catalogo` | `--voce-utilita` |

**Non rinominare i file di produzione.** La v1 di questo documento consigliava di rinominarli
togliendo il prefisso `A-`: è **sbagliato**, e va invertito. I nomi attuali sono referenziati da:
`app/login.html:66` (`window.location.href = 'home.html'`), i cinque `href` della sidebar in
`app/home.html:60-79`, i cinque link `← Menu`, e — soprattutto — la **allow-list di redirect URL
configurata nel dashboard Supabase** per il magic link (`emailRedirectTo: window.location.href`,
`app/login.html:48`), che non è versionata in questo repo. La strada corretta è **modificare gli
`href` in `shell.js`** per puntare a `home.html`, `offerta-formativa.html`, `confronto.html`,
`analisi-programma.html`, `piano-promozione.html`, `catalogo.html`.

### 4.2 Rinominazioni di etichette (decisione di copy, vedi §9.3)

| Oggi in `app/home.html` | Nella Direzione A |
|---|---|
| "Analisi comparativa" | "Confronto manuali" |
| "Utilità" | "Catalogo" |
| "Analisi di un programma" | "Analisi programma" in `shell.js`, "Analisi di un programma" in `A-home.html` — **incoerenza nei mockup**, da uniformare |

### 4.3 Componenti: da → a

| Componente attuale | Dove | Nuovo | Note |
|---|---|---|---|
| `<nav><a href="home.html">← Menu</a></nav>` | 5 pagine | `aside.sidebar` + `.crumb` | Il breadcrumb sostituisce il link di ritorno |
| `#chi` (`email · ruolo · cliente`) | 6 pagine | `.tenant` (cliente) + `.user-chip` (utente) in sidebar | Il dato si sdoppia |
| `<h1>Atlante — sezione</h1>` | 6 pagine | `h1.page` + `p.subtitle` | Serif 34px, `em` colorato |
| `<details class="come-funziona">` | 5 pagine | `.helper` (callout aperto, non richiudibile) | Il testo esistente si riusa **integralmente**: è buon copy |
| `<h2>1. Titolo passo</h2>` | analisi, confronto | `.stepper` + `.fc-section` numerate | La numerazione si sposta nello stepper |
| `.tab-nav` / `.tab-btn.attivo` | offerta | `.tabs` + `button.on` | Segmented control |
| `.tab-btn` (4 tab) | piano | `nav.pipeline` + `.pipe-step.done/.on` + `.badge-c` | Da tab a pipeline con conteggi |
| `<details><summary>Materia (n)</summary>` | catalogo | `.materia-block` / `.materia-head` / `.materia-block.closed` | Da elemento nativo a accordion JS |
| `.badge.proprio` / `.badge.competitor` | catalogo | `.badge.b-proprio` / `.badge.b-competitor` | ⚠️ definite in `A-catalogo.html:156-157`, **non** in `shell.css` — vanno promosse |
| `.stato-badge.stato-presente/-parziale/-assente/-n\/d` | analisi | `.status.s-pres/.s-parz/.s-ass/.s-idle` | Serve una funzione di mapping, vedi §4.4 |
| `.giudizio-badge.giudizio-*` (6 livelli) | analisi | `.giud .val.<livello>` | ⚠️ il mockup ne stila solo 3, vedi §4.4 |
| `.rilevanza-badge` | piano | `.rilevanza.r-alta/.r-media/.r-bassa` | |
| `.scenario-badge` | piano | `.scenario.sc-princ/.sc-alt/.sc-ass` | |
| `.stato-badge.bozza/.completata` + `.fase-badge` | piano | `.stato-campagna.sc-bozza/.sc-attiva/.sc-completata` | ⚠️ `sc-attiva` non ha corrispettivo nel DB, vedi §9.5 |
| `.semaforo.verde/.rosso` (3 check staging) | piano | *(nessun corrispettivo nei mockup)* | Vedi §9.6 |
| `.callout-fb` | catalogo | `.callout` | Matrix Framework Builder |
| `.modal-*-overlay` / `.modal-edit-box` con header a colore pieno | offerta | modale con `border-bottom: 1px solid var(--line)` e titolo serif | Vedi §6.6 |
| `.motiv-box` + `.email-box` | piano | `.drawer-motiv` dentro un `<tr>` espanso | Il pezzo più innovativo del redesign |
| `.esportazioni button` | analisi, confronto | `.res-head .exports button` | |
| `#msg.attesa` + `.spinner` | analisi, confronto | `.lavorazione` (`.fasi`, `.progressbar`, `.lav-timer`, `.anteprima`) | Vedi Fase 6 |
| `.hero` + SVG inline | home | *(nessun corrispettivo)* | Vedi §9.1 |
| `.filtri-grid` / `.filtro-gruppo` + Choices.js | offerta | `.filter-card` / `.filter-grid` / `.field.multi` + `.chip` | |
| `.ricerche-salvate-bar` | offerta | `.saved` (pill con dropdown) | |
| `table.dataTable` | offerta | `table.data` dentro `.table-wrap` + `.tfoot` con `.pager` | |
| `table.risultato` | analisi | `.mod-table` (dentro `.card`) | |
| `table.target` | piano | `table.target` (stesso nome, stile nuovo) | |
| `.elenco-manuali` / `.riga-manuale` | analisi, confronto | `.alt-list`/`.alt-item` (analisi), `.lista-manuali`/`.m-item` (confronto) | Due nomi per lo stesso componente: uniformare |
| `.adozione` (verde chiaro) | analisi, confronto | `.insight` (analisi), `.adozione` (confronto) | Gradient `--v-soft` → transparent + barra 3px |
| `.filtri` (input + select) | catalogo | `.toolbar-cat` + `.search-box` + `.filter` | |
| `.form` / `.campi` (CRUD) | catalogo | `.btn-primary "＋ Aggiungi manuale"` → modale | Vedi §9.4 |

### 4.4 Due funzioni di mapping da scrivere

Il codice attuale costruisce i nomi delle classi CSS **direttamente dai valori dei dati**. Con le
nuove classi serve un livello di traduzione. Da aggiungere in `app/js/atlante-shared.js`:

```js
// stato di copertura di un modulo → classe .status di shell.css
const CLASSE_STATO = { presente: 's-pres', parziale: 's-parz', assente: 's-ass' };
function classeStato(s) { return CLASSE_STATO[s] || 's-idle'; }

// giudizio qualitativo (6 livelli di GIUDIZI) → classe di .giud .val
const CLASSE_GIUDIZIO = {
  'insufficiente': 'g-insuf', 'sufficiente': 'g-suff', 'discreto': 'g-discreto',
  'buono': 'g-buono', 'molto buono': 'g-molto-buono', 'eccellente': 'g-eccellente',
};
function classeGiudizio(g) { return CLASSE_GIUDIZIO[normalizzaGiudizio(g)] || 'g-nd'; }
```

Sostituiscono `badgeStato()` (`app/analisi-programma.html:1016-1019`, che genera oggi
`stato-${stato}` e produce la classe illegale-da-scrivere `stato-n/d`, motivo dell'orrendo
`.stato-n\/d` nel CSS di riga 50) e `badgeGiudizio()` (riga 1012-1015).

⚠️ **Il mockup stila solo 3 dei 6 giudizi**: `A-analisi-programma.html:179-181` definisce
`.val.buono`, `.val.discreto`, `.val.eccellente`. Mancano `insufficiente`, `sufficiente`,
`molto buono` e il caso `n/d`. Palette suggerita, coerente con i token e con la scala a 6 gradi già
usata in `app/analisi-programma.html:54-60`:

```css
.giud .val.g-insuf       { color: var(--err); }
.giud .val.g-suff        { color: #96591b; }
.giud .val.g-discreto    { color: var(--warn); }
.giud .val.g-buono       { color: var(--ok); }
.giud .val.g-molto-buono { color: #2f6b4f; }
.giud .val.g-eccellente  { color: #1f5c8a; }
.giud .val.g-nd          { color: var(--ink-faint); }
```

Da mettere in `shell.css`, non nella pagina: servono anche al Piano.

### 4.5 Mappatura del rapporto dell'Analisi: attenzione, il mockup è più povero del prodotto

`renderRisultato()` (`app/analisi-programma.html:1042-1214`) produce **oltre 12 blocchi**. Il mockup
`A-analisi-programma.html` ne mostra 7 (§0–§6) e ne lascia uno chiuso. Mappatura completa —
**nessuno di questi blocchi va perso**:

| Blocco prodotto oggi | Righe | Card nel mockup | Azione |
|---|---|---|---|
| `.panoramiche` (denominazione, ateneo, docente, materia/framework/classe/CFU/ore, giudizio complessivo, sintesi) | 1045-1049 | `.res-head` + `§0 Sintesi` | Split: metadati in `.res-head .meta`, testo in `§0` |
| `executiveSummary` (5 voci) | 1051-1060 | — | **Manca.** Va aggiunta come card in cima, prima di `§0`, o come `.insight` secondario |
| `quadroGenerale` (tipologia, note, livello complessità, distribuzione tematica) | 1062-1067 | `§1 Quadro generale` (3 `.qbox`) | I 3 box coprono tipologia / complessità / allineamento. `note` e `distribuzione_tematica` non hanno posto: aggiungere un `<p>` e una lista sotto la griglia |
| `profiloPedagogico` (approccio, livello, stile, orientamento, enfasi, metodologia) | 1068-1072 | `§2 Profilo pedagogico` (`.taglist` + `<p>`) | Mapping diretto: i 4 attributi → `.tag`, l'`enfasi` → `.tag.neutro`, `metodologia` → `<p>` |
| `allineamentoClasse` | 1074-1078 | — | **Manca.** Il valore complessivo va nel 3° `.qbox` di `§1`; le `valutazioni` in una lista dentro `§1` |
| `criteriDisciplinari` | 1080-1082 | — | **Manca.** Aggiungere come card `§2bis` o lista in `§1` |
| `valutazioneProgramma` (4 dimensioni) | 1084-1086 | `§3 Giudizi qualitativi` (`.giud-row`, 4 `.giud`) | Mapping 1:1 perfetto |
| `valutazioneProgramma.moduli` | 1087-1088 | `§4` colonna "Nel programma" della `.mod-table` | Con `.peso` sotto il badge |
| `motivazioniScelta` (priorità docente, motivazioni, natura scelta, ruolo alternativi, profilo decisionale) | 1090-1105 | — | **Manca, ed è tanta roba.** Serve una card dedicata "§ Perché ha scelto questo manuale" |
| `profiloDocente` (avanzata) | 1107-1117 | — | **Manca.** Fondere con `§2` o card dedicata |
| `analisiAdottato` + `alternativi` | 1119-1125 | `§5 I manuali a confronto` (`.manuale-box`) + colonne di `§4` | Le note per modulo alimentano le colonne della `.mod-table`; forza/debolezza i `<ul class="forza/debol">` |
| `insightsCommerciali` | 1127-1138 | `.insight` "Opportunità commerciale" | Mapping buono: `punti_forza_commerciali` e `aspetti_migliorabili` nelle 2 `.colonne`, `opportunita_manuale`/`benefici_cambio` in `.opp-box`. `gap_critici_impatto` non ha posto: aggiungere una lista |
| `analisiPropri` + ranking + `quasiPareggioPropri` + `notaSelezionePropri` | 1140-1165 | — | **Manca.** È la classifica dei manuali propri: serve una card dedicata con l'avviso di quasi-pareggio |
| `mappaColloquio` + `esitoColloquio` + `fallbackColloquio` + `guidaColloquio` | 1167-1210 | `§6` (card mostrata chiusa, `opacity:0.6`) | Il mockup la accenna soltanto. Il contenuto reale è grosso: `.esito-box`, N `.regola-colloquio`, `.fallback-box`, pitch di apertura, più un disclaimer lungo e importante (riga 1170) sull'autonomia del docente che **va conservato integralmente** |

**Conclusione operativa**: la colonna destra della Direzione A va estesa con almeno 4 card che il
mockup non prevede. Usa `.card.marked` con `h3 > span.num` e prosegui la numerazione `§7`, `§8`…
oppure rinumera. Non inventare componenti nuovi se `.card` basta.

### 4.6 Mappatura del Confronto

| Prodotto oggi (`app/confronto.html`) | Righe | Nel mockup |
|---|---|---|
| `renderPanoramiche` | 501-508 | `.verdetto-grid` / `.verdetto` (uno per manuale, `.proprio` evidenziato) |
| `renderConteggioOggettivo` | 509-516 | `.score-card .cifre` (presenti / parziale / assente) + `.cov-bar` |
| `renderTabellaA` (moduli × manuali) | 517-529 | `table.matrix` in `.matrix-wrap`, colonna `td.proprio` evidenziata |
| `renderTabellaB` (**idoneità per classe di laurea**) | 530-542 | **Manca completamente nel mockup** |
| `renderSintesiClassi` | 543-556 | **Manca** (dipende da B) |
| `renderArgomentiAdozione` | 557-580 | `.adozione` ("Perché è il più adatto" + "Attenzione") |
| `renderConfrontoReciproco` | 581-604 | `.card-reciproco` con `.rec-common` + `.reciproco-grid` |
| `#avviso-conteggio` | markup 116 | Nessun corrispettivo esplicito: metterlo come `.helper` sopra la matrice |

Per la Tabella B: riusa `table.matrix` (stessa struttura moduli × manuali → classi × manuali) e
mettila in un secondo `.matrix-wrap` intitolato "Idoneità per classe di laurea", con la sintesi
calcolata sotto come lista. Nessun componente nuovo necessario.

### 4.7 Mappatura del Piano di promozione

| Prodotto oggi | Righe | Nel mockup |
|---|---|---|
| `.tab-nav` 4 tab | markup 124-128 | `nav.pipeline`, 4 `.pipe-step` con `.badge-c` numerico |
| `renderCoda` (file in attesa) | 669-680 | Nessun corrispettivo (tab 1 non mostrato) |
| `renderStaging` + `trovaSemafori` (3 semafori) | 779-815 | Nessun corrispettivo (tab 2 non mostrato) — vedi §9.6 |
| `renderDatabase` + filtri | 622-656 | Nessun corrispettivo (tab 3 non mostrato) |
| `renderListaCampagne` | 1101-1117 | `.campagne-list` / `.campagna` / `.top-c` con 3 `.metric` + `.stato-campagna` |
| `renderDettaglioCampagna` + `table.target` | 1292-1340 | `.target-table-wrap` + `.target-head` + `table.target` |
| `mostraMotivazione` (`.motiv-box`) | 1694-1737 | `.drawer-motiv .body` (h5 + `<p>` + `.pesi`) |
| `mostraEmail` (`.email-box` con input+textarea) | 1807-1815 | `.email-box` (monospace, `white-space: pre-wrap`) + `.email-actions` |
| Alert `relazione_docente_manuale` | 1714-1717 | **Manca.** ⚠️ Critico: avverte che il docente è autore/curatore del manuale adottato e che non va proposta una sostituzione. Va portato in cima al `.drawer-motiv .body` come `.helper` con `--v: var(--err)` |

**Colonne della tabella target — attenzione, non coincidono:**

| Oggi | Nel mockup |
|---|---|
| Docente | Docente & ateneo *(l'ateneo era già nel sub-testo, ok)* |
| — | **Insegnamento** (nome + "4° anno · 9 CFU") ⚠️ dati non presenti nel DB, vedi §9.5 |
| Manuale adottato | Manuale adottato |
| Scenario | Scenario |
| Rilevanza | Rilevanza |
| **Overlap tematico** | — ⚠️ da non perdere |
| **Framework** | — ⚠️ da non perdere |
| Azioni (fino a 7 bottoni) | Email *(stato)* + Azioni (1 bottone espandi) |

I giudizi `overlap_giudizio` e `framework_giudizio` esistono nel DB e sono informazione reale: non
eliminarli. Spostali dentro il `.drawer-motiv` come due `.badge` sotto il titolo, oppure come
sub-testo della colonna Rilevanza.

I 7 bottoni per riga di oggi (`Genera analisi`, `Vedi analisi`, `Ricalcola tutto da zero`,
`Genera email`, `Vedi email`, `Rigenera classificazione`, `Correggi`) vanno collassati: il mockup
ne prevede 1 in tabella (`▸ apri`) più 3 nel drawer (`Rigenera`, `Modifica`, `Approva & copia`). Le
azioni residue vanno dentro il drawer o in un menu `⋯`. **Non rimuovere nessuna azione**: sono tutte
funzionalità operative, con tooltip che spiegano casi limite reali (es. il warning ⚠️ quando
`dati_verificati` è false, riga 1310).

---

## 5. Piano di implementazione in fasi

**Tutte le fasi qui sotto sono state eseguite** (vedi §0). Restano scritte al presente perché
descrivono com'è fatto il codice adesso e perché: sono il riferimento per chi dovrà rimetterci mano.

Ordine studiato per far salire il rischio gradualmente: si arriva alle pagine complesse quando la
shell è già stabile. Ogni fase è rilasciabile in autonomia (le pagine non sono accoppiate).

---

### Fase 0 · Preparazione (mezza giornata)

**File toccati**: `app/css/tokens.css` (nuovo), `app/css/shell.css` (nuovo), `app/js/shell.js`
(nuovo), `scripts/dev-server.mjs` (solo se self-hosti i font).

1. Copia `tokens.css` e `shell.css` in `app/css/`, `shell.js` in `app/js/`.
2. **Non cancellare `app/css/atlante-theme.css`.** Finché non hai migrato tutte le 7 pagine, ogni
   pagina non ancora migrata continua a dipenderne. Vedi §7.1 per lo shim di compatibilità.
3. Nei link, i mockup usano path piatti (`href="tokens.css"`). In produzione diventano
   `href="css/tokens.css"` e `src="js/shell.js"`.
4. In `app/js/shell.js`: sostituisci i 5 `href` con i nomi di produzione (§4.1) e rimuovi
   `document.body.classList.add('a-shell')` (§3.4, punto 2) — la classe va nel markup.
5. Verifica il caricamento dei font: apri il Network tab e controlla che le richieste a
   `fonts.googleapis.com` / `fonts.gstatic.com` diano 200. Se l'app deve funzionare offline o
   dietro un proxy aziendale che blocca Google, **decidi ora** se self-hostare (vedi §7.4).
6. **Baseline visiva**: prima di toccare qualsiasi pagina, salva uno screenshot a 1440px di
   ciascuna delle 7 pagine attuali. Serviranno per il confronto in Fase 9.

**Fatto quando**: una pagina di prova vuota con `<link>` a `tokens.css` + `shell.css`,
`<body class="a-shell">`, `<aside id="sidebar">` e `<script src="js/shell.js" data-attiva="">`
mostra la sidebar con i link corretti e senza flash di layout.

---

### Fase 1 · Login (2–3 ore, rischio basso)

**File**: `app/login.html` ← `A-login.html`.

La pagina più semplice: 76 righe, nessuna sidebar, nessun dato di catalogo.

1. Sostituisci `<head>`/`<style>`/markup con quelli di `A-login.html`. Link a `css/tokens.css`
   (`shell.css` **non serve**: il login non usa la shell).
2. Cabla:
   - `#email` → stesso ID di oggi, nessuna modifica JS necessaria;
   - `button.btn-login` → serve un `id="invia"` (il mockup ha un `<button type="button">` senza id):
     aggiungilo, così `app/login.html:42` continua a funzionare;
   - `.stato` → il JS attuale usa `#stato` con `mostra(classe, testo)` e classi `.ok/.attesa/.errore`
     (righe 36-40). Il mockup ha un `div.stato` sempre visibile con contenuto statico. Scelta
     consigliata: dai al div `id="stato"`, parti con `style="display:none"`, e in `mostra()` aggiungi
     `stato.style.display = 'block'`. Definisci `.stato.ok`, `.stato.attesa`, `.stato.errore`
     variando `background`/`color` con `--ok-soft/--ok`, `--warn-soft/--warn`, `--err-soft/--err`.
3. **Rimuovi il valore hardcoded** `value="sartinisergio@gmail.com"` (presente sia in
   `app/login.html:25` che in `A-login.html:211`). Va sostituito con il `placeholder` del mockup
   (`tuo.nome@editore.it`) — un indirizzo personale nel markup di produzione è un errore.
4. Il testo del pannello sinistro ("Il tuo ecosistema editoriale, in un unico posto") riprende la
   `.tagline` di `app/home.html:83`: coerente, tienilo.
5. Il `.helper-tiny` menziona "il tuo profilo è collegato al cliente **Zanichelli**": è statico nel
   mockup. Prima del login non conosci il cliente — sostituisci con un testo generico ("Se non hai
   ancora un profilo, scrivi all'amministratore") oppure popolalo dopo che `verificaSessione()` ha
   letto il profilo.
6. La media query a 900px del mockup funziona: tienila.

**Fatto quando**: il flusso magic-link completo (invio → email → click → redirect a `home.html`)
funziona esattamente come prima, e i tre stati di `#stato` sono visivamente distinti.

---

### Fase 2 · Sidebar condivisa (mezza giornata, rischio basso)

**File**: `app/js/shell.js`, `app/js/atlante-shared.js`.

Prima di migrare la seconda pagina, risolvi il problema che si presenterà su tutte: **tenant e user
chip devono venire dai dati reali**, e ogni pagina fa già la stessa query di bootstrap.

1. Aggiungi in `app/js/atlante-shared.js` una funzione condivisa (è il posto giusto: è già lo
   modulo comune, caricato come script classico prima dello script di pagina):

```js
// bootstrap comune: sessione + profilo + cliente. Restituisce null e reindirizza al login
// se non c'è sessione; restituisce { session, profilo } se tutto ok.
async function avviaSessione(supabaseClient, { redirect = true } = {}) {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) { if (redirect) window.location.href = 'login.html'; return null; }
  const { data: profilo, error } = await supabaseClient
    .from('profili')
    .select('ruolo, cliente_id, nome_completo, clienti(nome, editore_proprio, offerta_formativa_inclusa)')
    .eq('id', session.user.id)
    .maybeSingle();
  if (error || !profilo) return { session, profilo: null };
  return { session, profilo };
}
```

   ⚠️ Le sei pagine oggi selezionano insiemi **diversi** di colonne (`home.html:201` prende
   `ruolo, clienti(nome, offerta_formativa_inclusa)`; `catalogo.html:423` prende
   `ruolo, clienti(nome, editore_proprio)`; `piano-promozione.html:1826` prende
   `ruolo, cliente_id, clienti(nome, editore_proprio)`). La select unificata sopra è il superset:
   verifica che le policy RLS di `clienti` (`clienti_select`, `id = cliente_corrente()`) la
   permettano — lo fanno, ma provalo.

2. Espone anche i riempitori della sidebar, chiamati dopo `avviaSessione()`:

```js
function popolaSidebar({ session, profilo }) {
  const cliente = profilo?.clienti?.nome || '—';
  const nome = profilo?.nome_completo || session.user.email;
  const iniziali = nome.split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase();
  document.querySelector('.tenant .avatar').textContent = cliente[0] || '?';
  document.querySelector('.tenant .meta strong').textContent = cliente;
  document.querySelector('.user-chip .av').textContent = iniziali;
  document.querySelector('.user-chip .info strong').textContent = nome;
  document.querySelector('.user-chip .info span').textContent = profilo?.ruolo || '';
  // voce Offerta visibile solo se il cliente l'ha inclusa — stessa regola di home.html:212
  if (!profilo?.clienti?.offerta_formativa_inclusa) {
    document.querySelector('.nav-voce[href="offerta-formativa.html"]')?.remove();
  }
}
```

   Il `.tenant .meta span` del mockup dice "Editore proprio": usa `clienti.editore_proprio`.
   Il `.user-chip .info span` del mockup dice "promotore · Nord-Ovest": **la zona non esiste in
   `profili`** — vedi §9.2. Per ora metti solo il ruolo.

3. **Rimuovi la vecchia logica di evidenziazione** della voce attiva: non ce n'è (l'app attuale non
   evidenzia niente, ogni pagina interna ha solo `← Menu`). Non c'è nulla da smontare, ma i
   `<nav><a href="home.html">← Menu</a></nav>` delle 5 pagine vanno eliminati man mano.

4. **Sequenza di rendering**: `shell.js` scrive la sidebar su `DOMContentLoaded`; `popolaSidebar()`
   gira dopo la risposta di Supabase. Fra i due istanti la sidebar mostra i valori di default:
   metti `—` come testo iniziale del tenant e dell'user chip in `shell.js`, non `Zanichelli`/`SS`.

5. `shell.js` non è un router: naviga con `<a href>` classici. Se in futuro si passa a SPA va
   riscritto, ma oggi è la scelta coerente col resto dell'app.

**Fatto quando**: la sidebar mostra cliente e utente reali su una pagina di prova, non evidenzia
nulla se `data-attiva=""`, ed evidenzia la voce giusta con `data-attiva="analisi"`.

---

### Fase 3 · Home (mezza giornata, rischio basso)

**File**: `app/home.html` ← `A-home.html`.

1. Struttura: `<body class="a-shell">`, `<aside class="sidebar" id="sidebar">`, `<main class="a-main">`
   (`max-width: 1240px`), `<script src="js/shell.js" data-attiva="">`. Nota che `A-home.html` mette
   `--voce-corrente-soft: transparent` e `--voce-corrente-ink: var(--ink)`: nessuna voce evidenziata.
2. `.hello` — `h1.page` "Buongiorno, <em>Nome</em>." con `nome_completo` (o la parte prima della `@`
   dell'email). `.now` con data e ora locale: `new Date().toLocaleDateString('it-IT', { weekday:
   'long', day: 'numeric', month: 'long', year: 'numeric' })`. Nel `.subtitle` sostituisci
   "Zanichelli" col nome del cliente.
3. `.numeri` — 4 `.n-card`. Cosa mettere e da dove:

   | Card | Label mockup | Fonte reale |
   |---|---|---|
   | 1 | Insegnamenti / `223.481` / "+1.204 vs anno scorso · 98 atenei" | ⚠️ Il conteggio vive in DuckDB, in `offerta-formativa.html`. La home oggi mostra la stringa **hardcoded** "oltre 200.000" (riga 225). Vedi §9.1 |
   | 2 | Manuali a catalogo / `348` / "42 Zanichelli · 306 competitor" | `count(manuali)` (già fatto, riga 218) + due `count` con `.eq('publisher', editoreProprio)` e `.neq(...)`. Query nuove ma banali |
   | 3 | Framework disponibili / `17` / "14 materie · 3 aggiornati questo mese" | `count(framework)` (riga 219) + `count(distinct materia)`. "aggiornati questo mese" richiede una colonna `updated_at` che **non esiste** |
   | 4 | Programmi analizzati / `64` / "12 nuovi questa settimana" | ⚠️ Non esiste una tabella `analisi`. L'unico proxy è `count(programmi where stato='confermato')`. Vedi §9.1 |

   Le `.n-card` prendono il colore-voce da `style="--voce: var(--voce-XXX)"` inline: mantienilo.
4. `.voci-grid` — 5 `.porta` + 1 tessera tratteggiata "Guida rapida". Cabla gli `href` ai nomi di
   produzione. La porta Offerta va nascosta se `offerta_formativa_inclusa` è false (stessa regola
   della sidebar). Le righe `.quick` ("ultima ricerca: …", "in coda: 3 programmi in staging") sono
   dati che oggi non hai in modo omogeneo: **rendile condizionali** — mostra `.quick` solo dove
   riesci a popolarla (la Offerta può leggere `atlante_offerta_ricerche_ins_v1` da localStorage; il
   Piano può fare `count(programmi where stato='staging')`), e omettila altrove. Non lasciare
   placeholder finti.
5. La tessera "Guida rapida" punta a un tour che non esiste. Vedi §9.1.
6. `.attivita` — 5 righe con dot colorato, titolo, sub, `.quando` (tempo relativo), `.apri`.
   **Non esiste un log di attività.** Approccio incrementale consigliato:
   - **fase 1 (subito)**: costruisci l'elenco unendo ciò che esiste — le ultime `programmi` per
     `created_at desc`, le ultime `campagne`, gli ultimi `manuali` — con un `.dot` colorato per
     tipo. Bastano 2 query e un `sort` client-side;
   - **fase 2 (dopo)**: valuta una vista o una tabella di log. Vedi §9.1.
   Se l'elenco è vuoto, mostra un empty state (`.attivita` con un solo `.riga` di testo grigio), non
   una sezione vuota.
7. `.tip` in fondo ("Sapevi che puoi collegare le sezioni?") descrive un passaggio Offerta →
   Analisi con framework e manuale pre-compilati che **non esiste**. Vedi §9.1.
8. **Il grosso SVG della home attuale non ha posto nella Direzione A.** Vedi §9.1: decidi prima di
   iniziare la fase, perché cambia il layout.
9. `#stato-iniziale` (il "Caricamento…" attuale) va mantenuto come schermata di attesa: la Direzione
   A non lo prevede, ma la home ha un caricamento asincrono reale. Riusalo con lo stile di
   `.subtitle` centrato.

**Fatto quando**: home a 1440px con sidebar, saluto reale, 4 numeri (di cui almeno 2 reali e 2
dichiaratamente da definire), 5 porte funzionanti, attività recente popolata o in empty state.

---

### Fase 4 · Catalogo (1 giorno, rischio basso)

**File**: `app/catalogo.html` ← `A-catalogo.html`.

La pagina più piccola fra le "interne" (471 righe) e la migliore per rompere il ghiaccio con la
shell su una pagina che carica dati.

1. Shell standard, `data-attiva="catalogo"`, `--v: var(--voce-utilita)`,
   `main.a-main { max-width: 1320px }`. Rimuovi il `html/body { background: color-mix(...) }` di
   riga 8-9.
2. `.cat-stats` — 6 celle. Tutte calcolabili dai dati che `main()` già carica in `tuttiManuali` e
   `tuttiFramework` (righe 436-448), **senza nuove query**:
   - Manuali totali → `tuttiManuali.length`
   - `<cliente>` (editore proprio) → `tuttiManuali.filter(m => m.publisher === editoreProprio).length`
   - Competitor → la differenza
   - Con indice caricato + % → `tuttiManuali.filter(m => estraiIndiceManuale(m) !== null).length`
     ⚠️ richiede di caricare `js/atlante-shared.js` in questa pagina, che oggi non lo fa. Fallo:
     rimuove anche la duplicazione di `escapeHtml` (`catalogo.html:138-140`)
   - Framework → `tuttiFramework.length`
   - Materie coperte → `new Set([...manuali, ...framework].map(x => x.materia).filter(Boolean)).size`
3. `.callout` sostituisce `.callout-fb`: stesso link a MATRIX Framework Builder
   (`https://matrix-framework-builder.netlify.app/`), stesso testo, `target="_blank" rel="noopener"`.
4. `.switch-view` — toggle Manuali / Framework con conteggio. Oggi le due liste sono **entrambe
   visibili** in sequenza (`<h2>Manuali</h2>` … `<h2>Framework</h2>`). Il toggle è JS nuovo, banale:
   due `<div>` contenitori, `hidden` su uno dei due, e `button.on` che si sposta.
5. `.toolbar-cat` — `#ricerca` va dentro `.search-box input`, `#materiaFiltro` diventa un
   `.filter` (nel mockup è un finto dropdown: puoi mantenere una `<select>` nativa stilata, è più
   semplice e accessibile). Il mockup aggiunge un filtro **Editore** e un bottone **Esporta CSV**:
   il primo è banale (`new Set(publisher)`), il secondo è funzionalità nuova — vedi §9.4.
6. `.materia-block` sostituisce `<details>`. Riscrivi `renderManualiRaggruppati()`
   (`catalogo.html:183-192`) e `renderFrameworkRaggruppati()` (212-221) per emettere:

```html
<div class="materia-block${chiuso ? ' closed' : ''}">
  <div class="materia-head">
    <span class="arrow">▾</span>
    <h3>${materia}</h3>
    <span class="n"><b>${nManuali}</b> manuali · <b>${nPropri}</b> ${cliente} · <b>${nFw}</b> framework</span>
  </div>
  ${tabellaManualiHtml(gruppo)}
</div>
```

   Regola di apertura: apri **solo la prima materia** (o quella con più manuali), chiudi le altre
   con `.closed`. Il click su `.materia-head` fa `classList.toggle('closed')`.
   ⚠️ `<details>` gestiva l'apertura gratis; ora serve un listener. Usa **delegazione** su
   `#gruppiManuali` (il contenuto è rigenerato a ogni filtro, i listener diretti si perderebbero).
7. `table.libri` sostituisce `<table>`. Colonne del mockup: Autore | Titolo | Editore | Edizione |
   Tipo | Indice | Azioni. Colonne di oggi (`catalogo.html:150`): Autore | Titolo | Editore |
   Materia | Tipo | (azioni). Differenze:
   - **Materia sparisce** dalla tabella: è già il titolo dell'accordion. Corretto.
   - **Edizione entra**: il dato esiste (`manuali.edizione`, `manuali.anno_pubblicazione`). Formato
     mockup: `12ª · 2024`.
   - **Indice entra**: `<span class="badge b-idxok">✓ caricato</span>` /
     `<span class="badge b-idxno">— da caricare</span>`, calcolato con
     `estraiIndiceManuale(m) !== null`. È informazione preziosa che oggi è sepolta nel `<pre>` dei
     dettagli.
   - Badge tipo: find/replace `.badge.proprio` → `.badge.b-proprio`, `.badge.competitor` →
     `.badge.b-competitor`. Definizioni in `A-catalogo.html:156-157` → **promuovile in `shell.css`**
     (servono anche a Confronto e Analisi).
   - `.r-act` con bottoni che appaiono in hover al posto dei link `.azione`. ⚠️ Attenzione
     all'accessibilità: `opacity: 0` nasconde ma non rimuove dal tab order — è accettabile (i
     bottoni restano raggiungibili da tastiera), ma aggiungi `:focus-within { opacity: 1 }` sulla
     riga, altrimenti chi naviga da tastiera non vede dove è.
8. Il `<pre class="dettaglio">` con il JSON grezzo (`toggleDettagli`, riga 142) non ha corrispettivo
   nel mockup. Il bottone `Vedi` di `.r-act` è il candidato naturale: apri il JSON in un modale
   invece che in una riga espansa. Se vuoi ridurre il lavoro, tieni la riga espansa e stilala con
   `background: var(--ink); color: var(--paper)`.
9. I due form CRUD (`#formManualiBox`, `#formFrameworkBox`, visibili solo a `ruolo === 'gestore'`)
   nel mockup sono rappresentati solo dal bottone `＋ Aggiungi manuale`. Vedi §9.4.
   ⚠️ La logica di auto-compilazione da JSON incollato (`catalogo.html:268-283` e `362-375`) è
   funzionalità reale e non ovvia: qualunque forma prenda il form, **quei due listener `input`
   devono sopravvivere**.

**Fatto quando**: accordion apre/chiude, filtro testo e materia funzionano dopo il re-render,
badge proprio/competitor e indice corretti, il form CRUD appare solo al gestore e salva ancora.

---

### Fase 5 · Offerta formativa (2 giorni, rischio medio)

**File**: `app/offerta-formativa.html` ← `A-offerta-formativa.html`.

1.954 righe, la più densa di dati. Il restyling è però **quasi tutto visivo**: la pipeline
DuckDB/Cache/Edge Function non si tocca.

1. **Regola d'oro di questa pagina**: il grosso dello script è dentro `<script type="module">`
   (riga 758). Le funzioni **non sono globali**. Tutti gli handler passano da
   `inizializzaEventListeners()` (riga 1833) — quando riscrivi il markup, aggiorna i selettori là
   dentro, non aggiungere `onclick=` inline (non funzionerebbero).
2. Shell standard, `data-attiva="offerta"`, `--v: var(--voce-offerta)`. Elimina:
   - il `<header>` a fascia piena `background: var(--voce-offerta)` (righe 22-31 del CSS) — il
     titolo passa a `h1.page`;
   - il `body { background: color-mix(...) }` (riga 14);
   - la `.topbar` con `#chi` e `← Menu` (righe 429-431).
3. `#header-delta-badge` (il contatore "🔄 N modifiche locali", `aggiornaBadgeHeader()` riga 820)
   perde il suo header. Nuova collocazione: accanto a `h1.page` come `.badge.b-warn`, oppure nella
   `.catalogo-bar` restilizzata. **Non eliminarlo**: è l'unico segnale che l'utente ha modifiche
   locali non condivise.
4. `.tabs` sostituisce `.tab-nav`/`.tab-btn`. I 3 pannelli restano `#tab-insegnamenti`,
   `#tab-lauree`, `#tab-ateneo` con la classe `.attivo` — `mostraTab` non esiste qui (è nel Piano);
   l'attuale switch è in `inizializzaEventListeners`. Il mockup mette un conteggio in
   `.tabs button .n`: alimentalo con i totali (223.481 / 4.702 / 98) da una query
   `SELECT count(*)` in DuckDB, una volta caricati i CSV.
5. `.filter-card` + `.filter-grid` (4 colonne) sostituiscono `.filtri`/`.filtri-grid`. I 14 filtri
   di oggi (`#f-ateneo`, `#f-tipologia`, `#f-classe`, `#f-ssd`, `#f-newssd`, `#f-anno`,
   `#f-insegnamento`, `#f-docente`, `#f-regione`, `#f-zona`, `#f-lingua` + i 6 `#fl-*` delle lauree)
   **mantengono gli stessi ID**: `cercaInsegnamenti()` (riga 1373) e `cercaLauree()` (1429) li
   leggono per costruire il SQL. Non rinominarli.
6. **Choices.js**: il mockup mostra i multi-select come `.field.multi` con `.chip` rimovibili.
   Choices.js produce già un markup a chip (`.choices__item`). Due strade:
   - **(a) consigliata)** tieni Choices.js e sovrascrivi il suo CSS per far somigliare
     `.choices__inner` a `.field.multi` e `.choices__item` a `.chip`. Zero rischio funzionale;
     serve CSS più specifico del suo (caricato prima in `<head>`, riga 9).
   - **(b)** sostituisci con `<select multiple>` nativi. Più pulito, ma perdi la ricerca dentro il
     dropdown su liste da ~100 atenei: è una regressione d'uso concreta. Sconsigliata.
   In entrambi i casi `inizializzaChoices()` (riga 1246) e `choicesMap`/`choicesMapLauree` restano.
   ⚠️ La **cascata SSD → classe di laurea** (`aggiornaCascataSsdClasse()`, riga 1273) ricostruisce
   le opzioni dinamicamente: testala presto, è il punto più fragile.
7. `.filter-more` per i filtri secondari (regione, zona, lingua): oggi sono in un blocco
   `.filtri-extra`. `.filter-actions` per Cerca / Reset / Export Excel / Raggruppa: gli ID dei
   bottoni non cambiano.
8. `.saved` — la `.ricerche-salvate-bar` (righe 463-476) diventa una pill con dropdown. Le funzioni
   coinvolte sono 6: `aggiornaSelectRicerche`, `salvaRicercaCorrente`,
   `confermaSalvataggioRicerca`, `annullaSalvataggioRicerca`, `caricaRicercaSalvata`,
   `eliminaRicercaSalvata`, `rinominaRicercaSalvata` (righe 836-998). Il refactor è **cosmetico**,
   ma devi trovare posto per rinomina ed elimina: mettile nel dropdown come voci per-riga.
   Il mockup mostra una sola pill: ci sono **due** set di ricerche salvate (insegnamenti e lauree),
   uno per tab.
9. `.stats-row` — il `#contatore` attuale diventa `.count` con `<b>127</b> insegnamenti trovati
   <small>su 223.481 totali · 34 atenei · 3 classi di laurea</small>`. I sotto-conteggi sono query
   DuckDB aggiuntive sulla stessa clausola WHERE: fattibili, ma verifica il costo (i CSV sono
   ~100MB in memoria — misura prima di aggiungere 3 query per ogni ricerca).
10. `table.data` in `.table-wrap` sostituisce `table.dataTable`. **Tieni DataTables** (riga 1309
    `inizializzaTabella()`, 1316 `inizializzaTabellaLauree()`): dà ordinamento e paginazione già
    funzionanti. Applica lo stile di `table.data` sovrascrivendo il CSS di DataTables — basta
    specificità maggiore, e `jquery.dataTables.min.css` è caricato prima nel `<head>` (riga 8).
    Il `.tfoot` con `.pager` del mockup **duplicherebbe** la paginazione di DataTables: scegli.
    Consigliato: stila i controlli DataTables (`.dataTables_paginate .paginate_button`) come
    `.tfoot .pager button`, e non aggiungere un secondo paginatore.
    ⚠️ Le colonne del mockup (Insegnamento / Docente / Ateneo·Corso / Anno / CFU / Azioni) sono
    **meno** di quelle di oggi: verifica in `cercaInsegnamenti()` quali colonne il `<table>` genera
    davvero prima di eliminarne. Il mockup mostra anche l'**email del docente** nel sub-testo
    (`M.Bianchi@unito.it`): la colonna esiste nei CSV, ma valuta se esporla — vedi §9.5.
11. `.row-actions` sostituisce i link/bottoni per riga. Gli handler chiamano
    `mostraPianoDiStudi(...)` (1453), `apriModificaInsegnamento(idx)` (1623), `apriDisattiva(idx)`
    (1629): ⚠️ passano un **indice** in `ultimiRisultati`, non un id. Se cambi come i bottoni sono
    generati, mantieni l'indice o passa a una chiave stabile — un disallineamento qui modifica il
    record sbagliato.
12. **I 7 modali** (`#modal-piano-overlay`, `#modal-edit-overlay`, `#modal-disattiva-overlay`,
    `#modal-aggiungi-ins-overlay`, `#modal-aggiungi-corso-overlay`, `#modal-delta-overlay`,
    `#modal-raggruppa-overlay`) hanno header a colore pieno con **hex hardcoded** (`#6b7280`
    riga 618, `#1e40af` riga 643, ecc.). Il mockup non li mostra: applica il pattern di §6.6.
13. **Import/export delta** (`esportaDelta` 1641, `importaDelta` 1642, `aggiornaStatsDelta` 1640,
    `leggiFileDelta` 1905) e le 4 chiavi localStorage `atlante_offerta_*_v1` **non si toccano**. La
    `.helper` del mockup (riga 267-270) spiega bene il meccanismo: riusa quel testo.
    ⚠️ In `leggiFileDelta` (riga 1905) ci sono hex hardcoded dentro una template string
    (`#f0fff7`, `#a7f3d0`, `#fef2f2`, `#fca5a5`): sostituiscili con `--ok-soft`/`--err-soft`.
14. **Vista ateneo** (`costruisciVistaAteneo()` 1476, `filtroAlbero()` 1621, `.albero-container`,
    `.ateneo-node`, `.corso-item`) non è prototipata: il mockup la elenca solo come terza tab. Vedi
    §9.7.

**Fatto quando**: caricamento CSV (con cache hit e cache miss), ricerca insegnamenti, ricerca
lauree, vista ateneo, salvataggio/caricamento ricerca, i 7 modali, export Excel, export/import
delta, raggruppamento per denominazione: tutti verificati.

---

### Fase 6 · Analisi programma (2–3 giorni, rischio alto)

**File**: `app/analisi-programma.html` ← `A-analisi-programma.html` +
`A-analisi-programma-input.html` + `A-analisi-programma-lavorazione.html`.

La pagina più complessa (1.624 righe) e quella dove i mockup promettono più di quanto l'app faccia.
Leggi §4.5 e §9.5 **prima** di iniziare.

**6a · Struttura a tre stati.** Consiglio forte: **una sola pagina** che scambia tre template via
JS, non tre file HTML. Motivo: se navighi fra file, i parametri già compilati si perdono e l'utente
che torna dal risultato deve ricompilare tutto — un peggioramento rispetto a oggi.

```js
// stato.fase: 'input' | 'lavorazione' | 'risultato'
// La colonna sinistra (.form-col) è LA STESSA in tutti e tre gli stati, cambia solo modalità:
//   input        → form editabile, .fc-section con .on/.idle progressive
//   lavorazione  → <dl class="riepilogo"> readonly + bottone "× Annulla"
//   risultato    → form editabile + "↻ Rilancia analisi" + "Salva bozza"
// Cambia solo la colonna DESTRA: .empty-hero | .lavorazione | le card §0…§N
```

**6b · Stepper (4 passi).** Cabla gli stati con la validazione che già esiste in
`aggiornaStatoBottone()` (riga 307): quel metodo sa già quando il bottone Analizza può essere
abilitato. Regola: uno step è `.done` quando i suoi campi minimi sono compilati, il primo step
incompleto è `.on`, gli altri `idle`.
⚠️ `.step.idle` è usato in `A-analisi-programma-input.html` ma la regola CSS corrispondente non
esiste (lo stile idle è il default di `.step`). Definiscila esplicitamente in `shell.css` o rimuovi
la classe dal markup: lasciare una classe senza regola è confondente.

**6c · Stato "input vuoto".** La colonna destra è un `.empty-hero` che spiega cosa aspettarsi: le 6
sezioni del rapporto (`.cosa-otterrai` con `.co-item` numerati `§I`–`§VI`), `.timing` con tempo e
costo stimati, `.riprendi` con le bozze salvate, `.side-note`. Non è spazio sprecato: è onboarding
contestuale, ed è la sezione dove l'app oggi non ha nulla.
⚠️ `.timing` mostra "30–45 secondi", "~0,05 $", "~0,12 $": stime plausibili ma **non misurate**.
`.riprendi` promette "2 bozze salvate" e "64 analisi complete nell'archivio": **né bozze né archivio
esistono** (§2.4). Vedi §9.5.

**6d · Stato "lavorazione".** `.lavorazione` con `.lav-timer`, `.progressbar .fill`, 7 `.fase` con
stati `.done` / `.now` / `.next`, `.anteprima` con la prima sintesi disponibile.

Come cablarlo con `eseguiAnalisi()` (riga 730): la funzione esegue già una sequenza di chiamate
nell'ordine `costruisciPromptQuadro` → `costruisciPromptValutazione` → per ogni manuale
`costruisciPromptManualeVsProgramma` → `costruisciPromptMotivazioniScelta` →
`costruisciPromptProfiloDocente` → `costruisciPromptGuidaColloquio` →
`costruisciPromptInsightsCommerciali` → `costruisciPromptExecutiveSummary` →
`costruisciPromptSintesiRanking`. Inserisci una callback prima di ogni `chiamaOpenAI` (riga 793):

```js
function segnalaFase(indice, etichetta, dettaglio) { /* aggiorna .fase[.done/.now/.next] e .progressbar */ }
```

Le 7 fasi del mockup sono un raggruppamento sensato di quelle chiamate. **Il numero reale di fasi è
variabile** (dipende da quanti manuali alternativi sono selezionati e da base vs avanzata): genera
l'elenco `.fasi` dinamicamente, non con 7 righe fisse.
La `.anteprima` mostra `r.valutazioneProgramma.sintesi`, che è la prima cosa realmente disponibile
(prodotta da `costruisciPromptValutazione`).

⚠️ **Il mockup promette due cose che l'architettura attuale non può mantenere**: «Puoi lasciare la
pagina — ti mando una notifica quando è pronto» e «l'analisi resta in coda e ti troverai il rapporto
pronto nell'archivio». Le chiamate OpenAI partono dal browser dell'utente: chiudere la scheda le
annulla. Vedi §9.5 — vanno **riscritti i testi**, oppure va progettato un backend.
Il bottone `× Annulla` è invece implementabile subito con un `AbortController` passato ai `fetch`.

**6e · Stato "risultato".** Riscrivi `renderRisultato()` (riga 1042) usando le classi del mockup e
seguendo la tabella di §4.5. Punti di attenzione:
- `.mod-table` di `§4` è una **heatmap moduli × manuali**: la prima colonna dati è "Nel programma"
  (da `valutazioneProgramma.moduli`), poi una colonna per ogni manuale analizzato (da
  `analisiAdottato.moduli` e `alternativi[].analisi.moduli`). Oggi le stesse informazioni sono in
  tabelle **separate** (`renderTabellaModuliProgramma` riga 1021, `renderTabellaModuli` riga 1026,
  chiamata una volta per manuale). Serve un **join per nome modulo**: i moduli vengono dal
  framework, quindi le chiavi coincidono, ma gestisci il caso di un modulo mancante in una risposta
  AI (→ `.s-idle`).
- `.peso` sotto il badge della colonna programma: il dato è
  `quadroGenerale.distribuzione_tematica[].peso`, letto già da `pesoModulo()` (riga 585).
- `.manuale-box .cov` è una barra a 3 segmenti (`.p1` ok, `.p2` warn, `.p3` err) con i `flex`
  proporzionali: alimentali coi conteggi presente/parziale/assente per quel manuale. `.cov-lab` usa
  `etichettaCopertura` (`etichettaCopertura()` riga 215).
- `.insight` per l'opportunità commerciale: mapping in §4.5.
- **Aggiungi le 4+ card che il mockup non prevede** (executive summary, motivazioni della scelta,
  classifica dei manuali propri, guida al colloquio). Il disclaimer lungo sull'autonomia del docente
  (riga 1170) è testo importante e va conservato: mettilo come `.helper` dentro la card del
  colloquio.
- `.res-head .exports` sostituisce `#esportazioni`: i tre bottoni `#espMarkdown`, `#espHtml`,
  `#espPdf` mantengono gli ID.
- Non toccare `costruisciBlocchi()` (riga 1228): è la rappresentazione comune dei 3 export ed è
  indipendente dal DOM. Ma vedi §6.5 per lo stile dell'HTML esportato.

**6f · Colonna sinistra.** `.form-card` con `.fc-head` / `.fc-body` / `.fc-foot`. Gli ID esistenti
non cambiano: `#selFramework`, `#selContesto`, `#inputContestoAltro`, `#inputCfu`, `#inputOre`,
`#selManualeAdottato`, `#elencoAlternativi`, `#fileInput`, `#testoInput`,
`input[name=tipoAnalisi]`, `#apiKey`, `#modello`, `#analizza`.
- ⚠️ Il mockup unisce CFU e Ore in un unico campo `value="9 · 72"`. Sono **due input numerici
  distinti** (`#inputCfu`, `#inputOre`) letti separatamente da `costruisciPromptQuadro`. Tieni due
  campi affiancati in `.row2` con label "CFU" e "Ore": non fondere.
- `.book-pick` (manuale adottato con copertina finta e badge "indice ✓") sostituisce una `<select>`.
  ⚠️ Il selettore deve restare **funzionante**: serve un componente a scelta (modale di ricerca,
  o `<select>` stilata con una riga di preview sotto). Il `.book-pick` del mockup è una
  *visualizzazione* dello stato selezionato, non un selettore. Il badge "indice ✓" si calcola con
  `estraiIndiceManuale()`.
- `.alt-list` / `.alt-item` sostituisce `.elenco-manuali` / `.riga-manuale`: mapping quasi 1:1
  (`renderElencoAlternativi()`, riga 283). I badge `.disponibile` / `.non-disponibile` diventano
  `.badge-ok` / `.badge-nd`.
- `.upload-drop` con drag&drop: `#fileInput` esiste già, il drag&drop è **nuovo** (~15 righe:
  `dragover`/`drop` + `estraiTestoDaPdf`, riga 313). Il textarea `#testoInput` resta.
- `.radio-row` / `.radio-btn.on` sostituisce i radio `base`/`avanzata`. Mantieni radio reali
  nascosti dietro le label per l'accessibilità, non solo dei `<div>` cliccabili.
- `.cost-hint` ("stima ~0,08 $ · 32 s") è un dato che non esisteva: o lo calcoli da una tabella di
  costi per modello × numero di chiamate previste, o lo ometti. Non inventare un numero fisso.
- `Salva bozza` → funzionalità nuova, vedi §9.5.

**Fatto quando**: i tre stati si alternano correttamente, un'analisi base e una avanzata girano
end-to-end, tutti i blocchi di §4.5 sono presenti nel risultato, i tre export producono lo stesso
contenuto di prima.

---

### Fase 7 · Confronto manuali (1 giorno, rischio medio)

**File**: `app/confronto.html` ← `A-confronto.html`.

Stesso pattern dell'Analisi ma più semplice: nessun testo di programma, nessun PDF, stepper a 3
passi.

1. Shell, `data-attiva="confronto"`, `--v: var(--voce-confronto)`. Riusa `.split`, `.form-col`,
   `.form-card`, `.res-head`, `.stepper` — a questo punto sono già in `shell.css` (§6.1).
2. Colonna sinistra: `#selFramework` in un `.campo`, `#elencoManuali` → `.lista-manuali` con
   `.m-item.selezionato` (mapping da `renderElencoManuali()`, riga 176), `#apiKey` e `#modello` in
   un `.row2`, `#confronta` in `.fc-foot`.
3. `.scoreboard` con N `.score-card`: alimentate da `renderConteggioOggettivo()` (riga 509) e
   `renderPanoramiche()` (501). `.winner` va sul manuale con più moduli presenti, `.proprio` su
   quelli con `publisher === editoreProprio`.
   ⚠️ Il mockup mostra 3 card in una riga. Il numero di manuali confrontabili **non ha un massimo**
   nell'app: con 5+ manuali la riga diventa illeggibile. Aggiungi `grid-template-columns:
   repeat(auto-fit, minmax(220px, 1fr))` e verifica a 5.
4. `table.matrix` in `.matrix-wrap`: da `renderTabellaA()` (riga 517). La colonna dell'editore
   proprio prende `.proprio` sia in `<th>` che nei `<td>`.
5. **Aggiungi il secondo `.matrix-wrap` per la Tabella B** (idoneità per classe di laurea), da
   `renderTabellaB()` (530) + `renderSintesiClassi()` (543). Il mockup la dimentica; il dato esiste
   e è utile. Riusa `table.matrix` senza CSS nuovo.
6. `.verdetto-grid` per le panoramiche per manuale; `.card-reciproco` con `.rec-common` +
   `.reciproco-grid` per `renderConfrontoReciproco()` (581) — nota che questo blocco esiste solo con
   2+ manuali; `.adozione` per `renderArgomentiAdozione()` (557).
   ⚠️ La nota sul significato di "distintivo" (`confronto.html:617`) e l'avviso che gli argomenti di
   adozione sono "a supporto di una conversazione commerciale, non un giudizio editoriale neutro"
   (riga 692) sono disclaimer voluti: conservali come `.dek` o `.helper`.
7. `#avviso-conteggio` (riga 116) → `.helper` sopra la matrice.
8. Progress narrativo: riusa `.lavorazione` di Fase 6d. Le fasi qui sono
   `costruisciPromptSingoloManuale` × N + `costruisciPromptReciproco`, quindi N+1 fasi generate
   dinamicamente.

**Fatto quando**: confronto con 1, 2 e 4 manuali; entrambe le tabelle presenti; i 3 export
identici a prima.

---

### Fase 8 · Piano di promozione (2–3 giorni, rischio alto)

**File**: `app/piano-promozione.html` ← `A-piano-promozione.html`.

1.846 righe, 4 tab, 4 modali dinamici via `#overlayModale`. Il mockup ne prototipa **solo la quarta
tab** (Campagne). Le altre tre vanno restilizzate per analogia — vedi §9.6.

1. Shell, `data-attiva="piano"`, `--v: var(--voce-piano)`.
2. `nav.pipeline` sostituisce `.tab-nav`. I 4 `.pipe-step` sono link cliccabili: cabla il click a
   `mostraTab('carica'|'staging'|'database'|'campagne')` (riga 570), che già gestisce
   `.tab-btn.attivo` e il `display` delle 4 `<section>` — sostituisci lì la classe con `.on` sul
   `.pipe-step`. I `.badge-c` con i conteggi:
   - Carica → `count(programmi)` per il cliente (tutti gli stati)
   - Staging → `stagingList.length` (già in `#countStaging`, riga 773)
   - Database → `count(programmi where stato='confermato')` (già calcolato in `renderDatabase`)
   - Campagne → `campagneList.length`
   ⚠️ `.pipe-step.done` nel mockup è su tutti i passi precedenti a quello corrente. Qui non è un
   flusso lineare per singolo oggetto ma quattro viste sempre disponibili: usa `.done` per "ha
   contenuto" e `.on` per "sei qui", non per "completato".
3. **Tab Campagne (prototipata).**
   - `.sec-head` con `h2` "Le tue campagne" + `.btn-primary "＋ Nuova campagna"`. Il form "Nuova
     campagna" attuale (righe 191-217: modalità, `#cMateria`, `#cTitolo`, `#cAutore`, `#cEditore`,
     `#cIndice`, `#elencoVolumiCatalogo`, `#btnCreaCampagna`) diventa un modale o una sezione
     rivelabile — nel mockup è sempre chiuso. Mantieni gli ID.
   - `.toolbar-p` con `.search-box` + 3 `.pill-filter` (Materia, Stato, Volume): **filtri nuovi**,
     ma banali da implementare client-side su `campagneList`.
   - `.campagne-list` / `.campagna` / `.top-c`: da `renderListaCampagne()` (riga 1101). I 3
     `.metric` sono ⚠️ tutti nuovi: "Programmi in scope", "Docenti target", "Email pronte". Il
     secondo è `count(campagna_target)`; il terzo è
     `count(campagna_target where email_corpo is not null)`; il primo richiede di rieseguire il
     criterio di selezione dei programmi — **costoso**. Vedi §9.5.
   - `.campagna.open .body-c` con 4 `.row-info`: "Manuale promosso" (`libro_titolo` + `libro_autore`
     + `libro_editore` — ok), "Framework" (⚠️ non è memorizzato su `campagne`: viene risolto a
     runtime da `fetchFrameworkPerMateria(materia)`, riga 1454 — puoi mostrarlo, ma è un lookup),
     "Criterio di selezione" (⚠️ non memorizzato: è la logica di `calcolaRilevanzaTarget`, riga
     1351 — puoi scriverlo come testo fisso che descrive la logica), "Modello + stima costo"
     (⚠️ non esiste).
   - `.stato-campagna`: ⚠️ il mockup ha 3 stati (`sc-bozza` "Bozza", `sc-attiva` "Attiva",
     `sc-completata` "Completata") ma il DB ne ammette **2** (`stato in ('bozza','completata')`).
     Più il `fase` (`pre_valutazione`/`completa`) che il mockup non rappresenta. Vedi §9.5.
4. **Tabella target**: `.target-table-wrap` + `.target-head` (con i contatori di rilevanza, che si
   calcolano da `targetListAperta`) + `table.target`. Colonne: vedi §4.7 — **non perdere overlap e
   framework**, e l'"Insegnamento" non è disponibile.
5. **`.drawer-motiv`** — la parte più innovativa. Sostituisce `mostraMotivazione()` (1694) e
   `mostraEmail()` (1807), che oggi scrivono entrambi nello **stesso** `#boxMotivazioneEmail` sotto
   la tabella (quindi mostrare l'email cancella la motivazione: un difetto reale che il drawer
   risolve, perché le tiene insieme).
   Struttura da produrre:
   - `.helper` con `--v: var(--err)` per l'alert `relazione_docente_manuale` ⚠️ (§4.7);
   - `h5 "Sintesi della motivazione"` + `<p>` da `valutazione_programma.sintesi` /
     `valutazione_manuale_adottato.sintesi`;
   - `h5 "Fattori decisivi…"` + `.pesi .p` da `peso_riferimento` (`[{modulo, peso}]`);
   - le liste `gap` / `punti_forza` / `opportunita_upgrade` / `opzioni_catalogo` di oggi: il mockup
     non le prevede — aggiungile come `h5` + liste dentro il `.body` del drawer, non eliminarle
     (le `opzioni_catalogo` con `copertura_gap` sono il cuore del suggerimento commerciale);
   - `h5 "Email suggerita"` + `.email-box` + `.email-actions` con `Rigenera` / `Modifica` /
     `✓ Approva & copia`.
   ⚠️ `.email-box` nel mockup è un `<div>` in sola lettura, mentre oggi l'email è **editabile**
   (`<input id="emailOggetto">` + `<textarea>`, riga 1810-1811). Il bottone `Modifica` del mockup
   suggerisce un passaggio a modalità editabile: implementalo (toggle `contenteditable` o scambio
   div↔textarea), altrimenti perdi la possibilità di correggere l'email prima di inviarla.
   ⚠️ `✓ Approva & copia` implica uno stato "approvata" che **non esiste** nel DB. Vedi §9.5. La
   parte "copia" è banale (`navigator.clipboard.writeText`).
   ⚠️ Il drawer sta dentro un `<tr><td colspan="7">`. DataTables **non è caricato in questa pagina**
   (verificato: `piano-promozione.html:228-230` carica solo supabase-js, pdf.js, atlante-shared),
   quindi nessuna interferenza. Ma se un giorno lo aggiungi, l'espansione va rifatta con la sua API.
6. **Tab Carica** (non prototipata): `#fileInput` multiple, `#coda` (`renderCoda()` 669), `#apiKey`,
   `#modello`, `#avvia`, `#msgCarica`. Restilizza con `.form-card` + `.upload-drop` + `.helper`.
   Riusa `.fase` dello stepper per la coda in elaborazione (`elaboraCoda()` 713 processa i file uno
   a uno: è già un progresso narrativo che non viene mostrato).
7. **Tab Staging** (non prototipata): `.staging-card` con `.semafori` (3 check: dati verificati /
   framework materia / catalogo materia) e 6 bottoni azione. Restilizza con `.card.marked` e i 3
   semafori come `.status.s-pres` / `.s-ass`. Il bottone "Promuovi al piano" resta disabilitato
   finché `tuttiVerdi` è false: comportamento importante, non rimuoverlo.
8. **Tab Database** (non prototipata): filtri `#dbCerca`, `#dbFiltroMateria`, `#dbFiltroScenario` →
   `.toolbar-p`; l'elenco → `table.data` (riusa da Fase 5) o `.card` per riga.
9. **I 4 modali dinamici** (`apriVerifica` 819, `apriModifica` 906, `apriModificaManualeAdottato`
   501, `apriModificaCampagna` 1224, più `chiudiModale` 817) sono generati come stringhe HTML in
   `#overlayModale`. Applica il pattern di §6.6. ⚠️ `mmRigaHtml`/`mmRenderRighe`/`mmOnChange`/
   `mmOnClick` (righe 444-500) gestiscono l'editing dei manuali citati con delegazione di eventi:
   se cambi il markup, aggiorna i selettori in `mmOnChange`/`mmOnClick`.

**Fatto quando**: tutte e 4 le tab funzionano; caricamento PDF → staging → promozione → campagna →
generazione target → motivazione → email, tutto verificato; l'alert `relazione_docente_manuale`
compare quando deve.

---

### Fase 9 · Pulizia, QA e stati mancanti (1 giorno)

1. **Rimuovi `app/css/atlante-theme.css`** e lo shim di compatibilità (§7.1) — solo dopo aver
   verificato con un `grep -r "\-\-accent\|\-\-brick\|\-\-amber\|\-\-green\|\-\-voce-.*-tint\|\-\-voce-.*-strong" app/`
   che nessun riferimento sia rimasto.
2. Il componente `.come-funziona` di `atlante-theme.css` è ora `.helper`: verifica che tutti e 5 i
   testi esplicativi siano stati trasferiti (sono buon copy, scritto per gli utenti reali).
3. **Promuovi in `shell.css`** tutto ciò che appare in 2+ pagine: l'elenco completo è in §6.1.
4. Rimuovi le regole `.btn`, `.field`, `.status`, `.s-pres/.s-parz/.s-ass` duplicate nelle pagine
   (sono già in `shell.css`, e le versioni di pagina hanno valori **divergenti** — §6.1).
5. Aggiungi gli **stati mancanti** che nessun mockup copre (§9.8): errore 401/403 di sessione
   scaduta, empty state delle liste, conferme distruttive.
6. Esegui la checklist di test di §8.

---

## 6. Layout, design system, tipografia, colori, asset, responsive

### 6.1 Cosa promuovere in `shell.css` (e cosa non duplicare)

I mockup, essendo file autonomi, ripetono molte definizioni. Analisi delle classi definite in
ciascuna pagina A (verificata): questi componenti compaiono in **2 o più** pagine e vanno in
`shell.css`, definiti **una volta**.

| Componente | Pagine dei mockup in cui è duplicato | Nota |
|---|---|---|
| `.stepper`, `.step`, `.step-sep` | analisi ×3, confronto | Aggiungi anche `.step.idle` (usata nel markup, mai definita) |
| `.split`, `.form-col` | analisi ×3, confronto | |
| `.form-card`, `.fc-head`, `.fc-body`, `.fc-foot` | analisi ×3, confronto | |
| `.row2` | analisi ×2, confronto | |
| `.res-head` (+ `.exports`) | analisi, confronto | |
| `.cost-hint` | analisi ×2, confronto | |
| `.radio-row`, `.radio-btn` | analisi ×2 | |
| `.upload-drop` | analisi ×2 | |
| `.search-box` | catalogo, piano | Identica |
| `.field`, `.btn` + varianti, `.status` + varianti | ⚠️ già in `shell.css`, **ridefinite** in A-analisi e A-offerta | Vedi sotto |
| `.b-proprio`, `.b-competitor` | definite solo in A-catalogo, servono anche a confronto/analisi (che usano stili inline) | |
| `.giud .val.*` (6 giudizi + n/d) | solo 3 su 7 definite | §4.4 |

⚠️ **Conflitti reali da risolvere**, non solo duplicazioni:

| Selettore | `shell.css` | `A-analisi-programma.html` |
|---|---|---|
| `.btn` | `padding: 8px 16px; font-weight: 500` | `padding: 9px 18px; font-weight: 600` |

La pagina vince (il `<style>` viene dopo il `<link>`). Scegli **una** versione e usala per tutte le
pagine: due misure di bottone identico su pagine diverse è esattamente il tipo di incoerenza che il
restyling deve eliminare. Consigliato: tieni quella di `shell.css` (più leggera) e cancella la
ridefinizione.

**Componenti che hanno due nomi per la stessa cosa** — scegline uno e uniforma:

| Cosa | Nome A | Nome B | Consiglio |
|---|---|---|---|
| Segmented control | `.tabs` (offerta) | `.switch-view` (catalogo) | `.tabs` |
| Azioni in hover per riga | `.row-actions` (offerta) | `.r-act` (catalogo) | `.row-actions` |
| Toolbar filtri | `.toolbar-cat` + `.filter` (catalogo) | `.toolbar-p` + `.pill-filter` (piano) | `.toolbar` + `.pill-filter` |
| Elenco manuali selezionabili | `.alt-list`/`.alt-item` (analisi) | `.lista-manuali`/`.m-item` (confronto) | `.lista-manuali`/`.m-item` |
| Bottone piccolo per riga | `.r-act button` | `.m-btn` (piano) | `.m-btn` |

Regola per il futuro: se ti serve un componente che non c'è, definiscilo nel `<style>` della pagina;
**se lo usi in 2+ pagine, spostalo in `shell.css`. Non prima.**

### 6.2 Struttura minima di ogni pagina interna

Corretta rispetto alla v1 (`class="a-shell"` nel markup, path reali, `<meta viewport>`):

```html
<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Atlante — {NOME PAGINA}</title>
  <link rel="stylesheet" href="css/tokens.css" />
  <link rel="stylesheet" href="css/shell.css" />
  <style>
    /* colore-voce di QUESTA pagina */
    :root {
      --v:                    var(--voce-XXX);
      --v-soft:               var(--voce-XXX-soft);
      --v-ink:                var(--voce-XXX-ink);
      --voce-corrente-soft:   var(--voce-XXX-soft);
      --voce-corrente-ink:    var(--voce-XXX-ink);
    }
    /* solo stili specifici di questa pagina */
  </style>
</head>
<body class="a-shell">
  <aside class="sidebar" id="sidebar"></aside>
  <main class="a-main">
    <div class="crumb">
      <a href="home.html">Atlante</a><span class="sep">›</span>
      <span id="crumb-cliente">—</span><span class="sep">›</span>
      <span>{Sezione}</span>
    </div>
    <h1 class="page">{Titolo}<em>.</em></h1>
    <p class="subtitle">{Sottotitolo}</p>
    <!-- contenuto -->
  </main>

  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js"></script>
  <script src="js/atlante-shared.js"></script>
  <script src="js/shell.js" data-attiva="XXX"></script>
  <script>/* script della pagina */</script>
</body>
</html>
```

`XXX` ∈ `offerta | confronto | analisi | piano | catalogo`; `""` per la home.
Nota: `<meta name="viewport">` oggi c'è **solo** in `offerta-formativa.html` (riga 5). Aggiungilo a
tutte, altrimenti su mobile il browser applica il viewport desktop virtuale e nemmeno le media query
che scriverai funzioneranno.

### 6.3 Tipografia

| Uso | Font | Peso | Dimensione |
|---|---|---|---|
| `h1.page` | `--font-serif` | 400 | 34px (44px in home e login) |
| `h2.section` | `--font-serif` | 400 | 22px |
| `.card h3` | `--font-serif` | 500 | 16px |
| Valori numerici importanti (`.n-card .v`, `.cat-stats .v`, `.stats-row .count`) | `--font-serif` | 400 | 22–34px, `font-variant-numeric: tabular-nums` |
| Giudizi qualitativi (`.giud .val`) | `--font-serif` | 500 corsivo | 16px |
| Corpo, form, tabelle, bottoni | `--font-sans` | 400/500/600 | 12–14px |
| Label di campo | `--font-sans` | 600 | 10.5px, uppercase, `letter-spacing: 0.06em` |
| Codice, email generata, CFU, conteggi tecnici | `--font-mono` | 400/500 | 12–12.5px |

Il `<em>` corsivo colorato dopo il titolo (`Analisi di un programma<em>.</em>`) è la firma tipografica
della Direzione A: applicalo su tutti gli `h1.page` e i titoli di sezione.

Il font serif attuale è **Georgia** (`app/*.html`, `font-family: Georgia, 'Times New Roman', serif`)
e il sans è lo stack di sistema. Fraunces è più marcato: verifica che i titoli lunghi ("Analisi di un
programma") non vadano a capo male a 1440px.

### 6.4 Colori: regole d'uso

1. **Mai un hex hardcoded in un componente.** Tutti i colori passano da un token. Ricerca da fare
   alla fine: `grep -nE "#[0-9a-fA-F]{3,6}" app/*.html app/css/*.css` — l'unica eccezione ammessa è
   `#fff` sui testi dentro i bottoni primari (già così nei mockup) e le tre triplette dei giudizi in
   §4.4.
2. **Il colore-voce non è mai uno sfondo di pagina.** Elimina i 5 `color-mix(paper, voce-tint)`.
3. `--v-soft` come sfondo, `--v-ink` come testo su quello sfondo: la coppia è progettata per essere
   leggibile. Non usare `--v` come testo su `--v-soft`.
4. I semantici (`--ok/--warn/--err/--info`) sono per gli **stati**, non per le voci. Un badge
   "presente" è verde in ogni sezione, anche in quella prugna.
5. Per un altro editore che vuole colori diversi: si cambia la tripletta in `tokens.css` e cambia
   ovunque. Questa è la ragione della regola 1.

### 6.5 Asset e il caso dell'HTML esportato

- Nessun asset binario da produrre (§3.6).
- ⚠️ **L'HTML esportato ha una palette sua, grigio-bluastra**, incompatibile con la Direzione A:
  `costruisciHtmlCompleto()` in `app/analisi-programma.html:1435-1448` e in `app/confronto.html:747`
  incorpora `color: #1b2430`, `border: 1px solid #e2e6ea`, `background: #f7f8fa`. Decidi: se
  l'export deve avere lo stesso tono editoriale del sito, riscrivi quel `<style>` con i valori
  **letterali** dei token (non `var(...)`: il file è standalone e non carica `tokens.css`) e con
  `font-family: Georgia, serif` (i Google Fonts potrebbero non essere raggiungibili dove il file
  viene aperto).
- ⚠️ **Trappola in quel codice**: le stringhe contengono `<\/style>`, `<\/script>` con la barra
  spezzata di proposito, perché un tag di chiusura scritto per intero dentro la template string
  verrebbe interpretato come fine del `<script>` reale. Il commento a riga 1436-1438 lo spiega.
  Se modifichi quelle stringhe, **mantieni l'escape**.
- `esportaPdf()` (`analisi-programma.html:1462`, `confronto.html:777`) disegna con jsPDF: font e
  colori sono impostati programmaticamente, indipendenti dal CSS. Il restyling non lo tocca, ma se
  vuoi coerenza visiva è un lavoro a parte.

### 6.6 Pattern per i modali (non prototipato — usa questo)

Nessun mockup mostra un modale, ma l'app ne ha **11** (7 in Offerta, 4 dinamici nel Piano). Pattern
canonico, da mettere in `shell.css`:

```css
.modal-overlay {
  position: fixed; inset: 0; z-index: 100;
  background: rgba(28, 26, 23, 0.45);
  display: none; align-items: center; justify-content: center; padding: 24px;
}
.modal-overlay.aperto { display: flex; }
.modal-box {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  box-shadow: var(--sh-3);
  max-width: 720px; width: 100%; max-height: 90vh;
  display: flex; flex-direction: column; overflow: hidden;
}
.modal-box > header {
  padding: 16px 22px;
  border-bottom: 1px solid var(--line);   /* NON un colore pieno */
  display: flex; align-items: baseline; justify-content: space-between;
}
.modal-box > header h3 {
  font-family: var(--font-serif); font-weight: 500; font-size: 17px;
  letter-spacing: -0.01em; margin: 0;
}
.modal-box > header h3 em { font-style: italic; color: var(--v); }
.modal-box > .body { padding: 20px 22px; overflow-y: auto; }
.modal-box > footer {
  padding: 14px 22px; background: var(--paper-warm);
  border-top: 1px solid var(--line);
  display: flex; gap: 8px; justify-content: flex-end;
}
```

Sostituisce gli header a colore pieno con hex hardcoded (`#6b7280`, `#1e40af`, `var(--voce-offerta)`)
di `offerta-formativa.html`. La classe `.aperto` è già quella usata dal JS attuale
(`classList.add('aperto')`, righe 1623/1629/1637/1638): mantienila, così non devi toccare il JS.
Per le **conferme distruttive** (elimina campagna, elimina staging, disattiva insegnamento): stesso
modale con `--v: var(--err)` locale e `.btn-primary` che diventa rosso automaticamente.

### 6.7 Responsive: cosa fare visto che il design non lo copre

Il design è solo desktop (§3.5). Non inventare un design mobile completo: definisci un
comportamento **degradato ma corretto**, e segnala che il design mobile è un lavoro a parte (§9.7).

Minimo indispensabile da aggiungere a `shell.css`:

```css
/* ≤ 1200px: sidebar collassata a icone o fuori flusso */
@media (max-width: 1200px) {
  body.a-shell { grid-template-columns: 1fr; }
  aside.sidebar {
    position: fixed; left: 0; top: 0; z-index: 90;
    width: 260px; transform: translateX(-100%);
    transition: transform .2s;
    box-shadow: var(--sh-3);
  }
  body.a-shell.menu-aperto aside.sidebar { transform: none; }
  main.a-main { padding: 20px 20px 48px; }
  /* serve un bottone hamburger: aggiungilo in shell.js, prima del .crumb */
}

/* ≤ 900px: gli split e le griglie a colonne fisse diventano verticali */
@media (max-width: 900px) {
  .split       { grid-template-columns: 1fr; }
  .form-col    { position: static; }          /* lo sticky non ha senso a colonna singola */
  .numeri,
  .voci-grid,
  .filter-grid,
  .quadro-grid,
  .giud-row,
  .manuali-row { grid-template-columns: 1fr; }
  .stepper     { flex-wrap: wrap; }
  .step-sep    { display: none; }
}
```

Le tabelle larghe (`table.data`, `table.matrix`, `table.target`, `.mod-table`) hanno bisogno di
`overflow-x: auto` sul contenitore (`.table-wrap`, `.matrix-wrap`, `.target-table-wrap` già
esistono: aggiungi la proprietà lì). Non tentare card-per-riga su mobile: è una riprogettazione.

⚠️ `.form-col { position: sticky; top: 20px }` a colonna singola blocca il form in cima e rende il
risultato irraggiungibile. La regola `position: static` sopra non è un dettaglio.

---

## 7. Dipendenze tecniche, rischi, compatibilità, regressioni

### 7.1 Il rischio principale: i nomi dei token cambiano

`app/css/atlante-theme.css` definisce 26 variabili. `tokens.css` ne definisce ~50 con nomi
**parzialmente diversi**. Durante la migrazione progressiva convivranno pagine vecchie e nuove.

**Strategia prevista: shim di compatibilità temporaneo.** ⚠️ *Nell'implementazione effettiva lo shim
non è stato scritto: le 7 pagine sono state migrate in un passaggio unico, quindi non è mai esistito
un momento in cui pagine vecchie e nuove convivevano. Questa ricetta resta qui per il caso in cui
una migrazione incrementale serva in futuro.* Andrebbe aggiunto in fondo a `app/css/tokens.css`, con
un commento che dica chiaramente che va rimosso:

```css
/* ============ SHIM TEMPORANEO — rimuovere alla fine della Fase 9 ============
   Mappa i vecchi nomi di atlante-theme.css sui nuovi token, così le pagine non
   ancora migrate continuano a funzionare caricando solo tokens.css.        */
:root {
  --accent:              var(--voce-utilita);
  --accent-strong:       var(--voce-utilita-ink);
  --accent-tint:         var(--voce-utilita-soft);
  --amber:               var(--warn);
  --amber-tint:          var(--warn-soft);
  --brick:               var(--err);
  --brick-tint:          var(--err-soft);
  --green:               var(--ok);
  --green-tint:          var(--ok-soft);
  --voce-offerta-tint:   var(--voce-offerta-soft);
  --voce-offerta-strong: var(--voce-offerta-ink);
  /* … idem per confronto, analisi, piano, utilita … */
}
```

⚠️ Non è una mappatura perfetta: `--paper` passa da `#f6f2e9` a `#f7f3ec` e i colori-voce sono più
desaturati, quindi una pagina non migrata cambierà **leggermente** aspetto. È accettabile e
temporaneo. Se non lo è, l'alternativa è caricare **entrambi** i CSS nelle pagine non migrate
(`atlante-theme.css` **dopo** `tokens.css`, così vince sui neutri) — più sicuro, più verboso.

**Rischio da grep**: `--voce-corrente` (usata da `.come-funziona`) e `--voce-XXX-tint` sono
referenziate **inline nel markup** (`style="--voce-corrente: var(--voce-analisi)"`), non solo nei
CSS. Il grep finale deve coprire anche gli attributi `style=`.

### 7.2 Rischi per pagina

| Pagina | Rischio | Mitigazione |
|---|---|---|
| Offerta formativa | Il CSS di DataTables e Choices.js è caricato **prima** del nostro: serve specificità maggiore, e ogni loro aggiornamento può rompere gli override | Scrivi gli override in un blocco commentato e isolato. Fissa le versioni CDN (già fatto per DataTables 1.13.6; ⚠️ Choices.js è caricato **senza versione** — `choices.js/public/assets/...`: fissala) |
| Offerta formativa | Le funzioni sono dentro un `<script type="module">` e non sono globali: un `onclick=` inline aggiunto per errore fallisce silenziosamente | Tutti gli handler in `inizializzaEventListeners()` |
| Offerta formativa | ~100MB di CSV in memoria; aggiungere query aggregate per i sotto-conteggi può degradare la ricerca | Misura prima/dopo con `performance.now()` intorno a `cercaInsegnamenti()` |
| Offerta formativa | `apriModificaInsegnamento(idx)` / `apriDisattiva(idx)` prendono un **indice** in `ultimiRisultati`: un re-render fuori sincrono modifica il record sbagliato | Non cambiare il modo in cui i bottoni sono generati; se lo fai, passa a `chiaveRecord(row)` |
| Analisi programma | `renderRisultato()` è 170 righe di template string con ~12 blocchi condizionali: è facilissimo perderne uno | Usa la tabella di §4.5 come checklist e spuntala |
| Analisi programma | `stato-n/d` produce una classe con `/`: qualunque approccio "classe dal dato" ha lo stesso problema | Usa `classeStato`/`classeGiudizio` di §4.4 |
| Analisi / Confronto | La heatmap moduli × manuali richiede un join per nome modulo fra risposte AI distinte: se un nome differisce, la riga si sdoppia | Prendi i moduli dal **framework** (`estraiModuliFramework`) come chiavi canoniche, non dalle risposte AI; `.s-idle` per i mancanti |
| Piano | 4 modali generati come stringhe HTML con handler in delegazione (`mmOnChange`, `mmOnClick`) | Cambia il markup e i selettori nello stesso commit |
| Piano | Il drawer dentro `<tr><td colspan>` è fragile se un giorno arriva DataTables | Documenta la dipendenza nel commento sopra il drawer |
| Tutte | `shell.js` scrive la sidebar su `DOMContentLoaded`; l'auth risolve dopo. Fra i due istanti la sidebar mostra i default | Default `—`, non dati finti |
| Tutte | Il `.crumb` include il nome cliente, che arriva in asincrono | `id="crumb-cliente"` con `—` iniziale |
| Tutte | La sidebar è visibile anche prima che l'auth sia risolta: un utente non autenticato vede la struttura del prodotto | `avviaSessione()` reindirizza a `login.html`; la sidebar dura una frazione di secondo. Accettabile — non ci sono dati dentro |

### 7.3 Regressioni possibili (checklist di controllo)

- [ ] La chiave OpenAI resta in `sessionStorage`, non finisce in `localStorage` né in un `value=`
- [ ] I 6 filtri dell'Offerta con cascata SSD→classe funzionano ancora
- [ ] Le ricerche salvate esistenti (in localStorage degli utenti) si caricano ancora: le chiavi
      `atlante_offerta_ricerche_*_v1` e il formato di `_raccogliFiltriRicerca()` non cambiano
- [ ] I delta esistenti (`atlante_offerta_modifiche_v1` ecc.) si importano ancora
- [ ] Il form CRUD del catalogo appare solo a `ruolo === 'gestore'`
- [ ] L'auto-compilazione da JSON incollato funziona in entrambi i form del catalogo
- [ ] Il bottone "Promuovi al piano" resta disabilitato se i 3 semafori non sono verdi
- [ ] L'alert `relazione_docente_manuale` compare nel drawer quando il valore è ≠ `'nessuna'`
- [ ] Il warning ⚠️ sul bottone "Genera email" quando `dati_verificati` è false
- [ ] La voce Offerta è nascosta se `offerta_formativa_inclusa` è false (sidebar **e** home)
- [ ] I 3 export (Markdown/HTML/PDF) di Analisi e Confronto producono lo stesso contenuto di prima
- [ ] Nessuna delle 4 tabelle di risultato (Analisi §4, Confronto A e B, target) ha perso colonne
- [ ] I disclaimer testuali sono tutti al loro posto (§7.5)

### 7.4 Font: la dipendenza da Google Fonts

`tokens.css:6` fa `@import url('https://fonts.googleapis.com/...')`. Implicazioni:

- **Blocca il rendering**: un `@import` in un CSS è la forma più lenta di caricare font. Sposta i
  `<link rel="preconnect">` + `<link rel="stylesheet">` nell'`<head>` di ogni pagina, prima di
  `tokens.css`, e togli l'`@import`.
- **Fallback**: `--font-serif: 'Fraunces', 'Newsreader', Georgia, serif` — se Fraunces non carica si
  ottiene Georgia, cioè esattamente il font attuale. Degrado accettabile.
- **Privacy / rete aziendale**: se Google Fonts è bloccato (GDPR, proxy), tutto il tono editoriale
  svanisce. Se questo è un rischio reale, self-hosta: scarica i `.woff2` in `app/css/fonts/`, scrivi
  le `@font-face`, e **aggiungi `.woff2` alla mappa MIME di `scripts/dev-server.mjs`** (§2.2).
- **Peso**: Fraunces è caricato con 5 pesi (300–700) più l'asse `opsz` variabile. Nei mockup si usano
  di fatto 400 e 500. Riducendo a `400;500` risparmi banda senza perdere nulla di visibile.

### 7.5 Testo da non perdere

Il codice attuale contiene testi scritti con cura per gli utenti reali, che il markup dei mockup non
riporta. Sono contenuto, non decorazione:

1. I 5 blocchi `.come-funziona` (uno per pagina interna).
2. Il disclaimer sull'autonomia del docente e sul peso dei gap (`analisi-programma.html:1170`) —
   ~500 caratteri, spiega perché un modulo assente non è una lacuna. È la premessa metodologica di
   tutto il prodotto.
3. La nota sul significato di "distintivo" nel confronto reciproco (`confronto.html:617`).
4. L'avviso che gli argomenti di adozione sono "a supporto di una conversazione commerciale, non un
   giudizio editoriale neutro" (`confronto.html:692`).
5. Le label che spiegano dove finisce la chiave API ("usata solo dal tuo browser, non viene salvata
   su Atlante") — presenti in 3 pagine.
6. Il tooltip che spiega "Ricalcola tutto da zero" (`piano-promozione.html:1310`).
7. L'avviso di quasi-pareggio fra manuali propri (`analisi-programma.html:1145`).
8. La nota "Nessun indice fornito: la campagna resta in pre-valutazione" (`piano-promozione.html:1327`).

---

## 8. Strategia di test e verifica

Non ci sono test automatici nel repo (nessun `test/`, nessuno script di test in `package.json`). La
verifica è manuale + visiva. Questo è il minimo accettabile per un restyling di questa ampiezza.

### 8.1 Prerequisiti

- `node scripts/dev-server.mjs` → http://localhost:5500
- Un account con `ruolo = 'promotore'` **e** uno con `ruolo = 'gestore'`: le UI differiscono
  (catalogo CRUD).
- Un cliente con `offerta_formativa_inclusa = true` e uno con `false`, per verificare la voce
  nascosta in sidebar e home.
- Una chiave OpenAI valida per i test end-to-end di Analisi, Confronto e Piano. Costo indicativo con
  `gpt-4o-mini`: pochi centesimi per analisi.
- Dati di prova: almeno 1 framework con moduli, 3 manuali della stessa materia di cui 1 con
  `publisher === editore_proprio`, almeno 1 manuale **senza** indice (per verificare `b-idxno` e
  `badge-nd`), 1 programma in staging e 1 confermato, 1 campagna con target.

### 8.2 Test funzionali per fase

**Fase 1 — Login**: invio magic link → email ricevuta → click → redirect a `home.html`. Email
inesistente → messaggio d'errore. Utente autenticato senza `profili` → messaggio "nessun profilo
collegato". Sessione già attiva → redirect immediato.

**Fase 2–3 — Sidebar e home**: sidebar con cliente e utente reali; nessuna voce evidenziata in home;
voce Offerta assente con `offerta_formativa_inclusa = false`; i 4 numeri corrispondono a un
`select count(*)` fatto a mano su Supabase; le 5 porte navigano correttamente; attività recente
popolata, e in empty state su un cliente nuovo.

**Fase 4 — Catalogo**: accordion apre/chiude; ricerca testo; filtro materia; ricerca + filtro
combinati; il badge indice corrisponde a `estraiIndiceManuale`; `b-proprio` solo su
`publisher === editore_proprio`; con `ruolo = 'promotore'` i form CRUD sono assenti; con `gestore`
salvano e la lista si aggiorna; incolla-JSON auto-compila; JSON malformato → messaggio d'errore.

**Fase 5 — Offerta formativa**: primo caricamento (cache vuota, ~100MB scaricati) e secondo
caricamento (cache hit — verifica in Application → Cache Storage → `atlante-offerta-formativa-v1`);
ricerca con 1 filtro, con 6 filtri, con 0 risultati; cascata SSD→classe; le tre tab; salva ricerca →
ricarica pagina → carica ricerca → i filtri si ripopolano; rinomina; elimina; modifica insegnamento
→ badge delta incrementa; disattiva; riattiva; aggiungi insegnamento; aggiungi corso; export delta →
importa delta in una sessione pulita; export Excel insegnamenti e lauree; raggruppa per
denominazione; piano di studi; vista ateneo con filtro albero.

**Fase 6 — Analisi programma**: stato input vuoto → stepper solo passo 1 `.on`; compila
progressivamente e verifica che gli step diventino `.done`; carica un PDF (drag&drop **e** file
picker); incolla testo; analisi **base** end-to-end; analisi **avanzata** end-to-end; durante
l'attesa le `.fase` avanzano e l'anteprima appare; `× Annulla` interrompe; cambia un parametro e
rilancia → il risultato precedente resta leggibile finché il nuovo non è pronto; **spunta la tabella
di §4.5 blocco per blocco**; i 3 export; chiave API errata → messaggio d'errore leggibile; nessun
manuale proprio per la materia → il messaggio dedicato appare.

**Fase 7 — Confronto**: 1 manuale (no confronto reciproco), 2 manuali, 4 manuali (verifica il
layout dello `.scoreboard`); Tabella A e Tabella B presenti; argomenti di adozione con e senza
manuali propri; i 3 export.

**Fase 8 — Piano**: pipeline con i 4 conteggi corretti; carica 1 PDF e 3 PDF in coda; staging con i
3 semafori nelle 8 combinazioni possibili (almeno: tutti verdi, uno rosso); verifica; modifica;
modifica manuali citati; promuovi (bloccato se non tutti verdi); database con i 3 filtri; crea
campagna volume singolo con e senza indice (→ badge pre-valutazione); crea campagna catalogo
materia; genera target; genera motivazione; drawer con motivazione + pesi + opzioni catalogo;
**alert `relazione_docente_manuale`** su un programma dove è ≠ `'nessuna'`; genera email; modifica
email; approva & copia (verifica il clipboard); il warning ⚠️ su `dati_verificati = false`; elimina
staging; elimina campagna.

### 8.3 Verifica visiva

- **Prima/dopo a 1440px** per tutte e 7 le pagine, confrontando con gli screenshot di baseline di
  Fase 0 e con il mockup corrispondente aperto affiancato.
- **Breakpoint**: 1920, 1440, 1280, 1200 (collasso sidebar), 900 (split verticali), 768, 375.
  A ogni breakpoint verifica che **nessuna pagina scrolli orizzontalmente** — l'unico scroll
  orizzontale ammesso è dentro i contenitori di tabella.
- **Confronto token**: apri DevTools su una pagina migrata e cerca hex hardcoded nei Computed
  Styles dei componenti principali.
- **Font**: con Network → Disable cache, verifica che Fraunces e Inter arrivino; poi blocca
  `fonts.gstatic.com` (Network → Block request domain) e ricarica: la pagina deve restare leggibile
  con Georgia + stack di sistema.
- **Stampa**: `Ctrl+P` sulla pagina di risultato dell'Analisi. Oggi non c'è CSS di stampa; con la
  sidebar sticky il risultato è probabilmente pessimo. Aggiungi almeno
  `@media print { aside.sidebar { display: none } body.a-shell { display: block } }`.

### 8.4 Accessibilità (minimo)

- **Contrasto**: verifica le coppie `--v-ink` su `--v-soft` per tutte e 5 le voci e i semantici su
  `-soft`. Target AA (4.5:1) per il testo normale. `--ink-faint #948b78` su `--surface` dà ~3.4:1:
  **non usarlo per testo essenziale**, solo per label decorative già in uppercase e bold.
- **Focus visibile**: `.field:focus` cambia solo `border-color`, che a 1px è un segnale debole.
  Aggiungi `outline: 2px solid var(--v); outline-offset: 1px` in `shell.css` per tutti gli elementi
  interattivi (`:focus-visible`).
- **Azioni in hover**: `.row-actions` / `.r-act` con `opacity: 0` sono invisibili ma tabbabili.
  Aggiungi `tr:focus-within .row-actions { opacity: 1 }`.
- **Radio finti**: `.radio-btn` e `.tabs button` devono essere veri `<input type="radio">`/`<button>`
  con `role="tab"` e `aria-selected`, non `<div>` cliccabili (nei mockup lo sono in parte).
- **Tastiera**: naviga con Tab l'intero form dell'Analisi e l'accordion del Catalogo. L'accordion
  passato da `<details>` a `<div>` perde il comportamento nativo: serve `role="button"`,
  `tabindex="0"`, `aria-expanded` e la gestione di Enter/Spazio.
- **Lingua**: `lang="it"` presente su tutte le pagine (già ok).

---

## 9. Decisioni prese, e cosa resta aperto

Questa sezione era l'elenco delle cose che il mockup mostrava e che i dati non potevano produrre.
Le decisioni 1-5 sono state prese e implementate; la 6 (email dei docenti) è stata rinviata perché
l'app non è ancora in produzione. Le voci "aperto" sono quelle che richiedono una scelta di prodotto
o una migration, e che non sono state fatte.

### 9.1 Home — deciso

| Elemento del mockup | Decisione | Come è stato risolto |
|---|---|---|
| `.n-card` "Insegnamenti 223.481" | **Costante documentata** | `TOTALE_INSEGNAMENTI` e `TOTALE_ATENEI` in cima allo script di `home.html`, con la data dell'ultimo allineamento e il commento che spiega perché non è una query (i CSV vivono in DuckDB, ~100MB). Vanno riallineate quando si rigenerano i CSV con `scripts/upload-offerta-formativa.mjs`. La card compare solo se `offerta_formativa_inclusa`. |
| `.n-card` "Manuali a catalogo" | Query reale | `count(manuali)` + due `count` filtrati su `publisher = editore_proprio` e complemento. |
| `.n-card` "Framework" | Query reale | `count(framework)` + `count(distinct materia)`. Il sotto-testo "3 aggiornati questo mese" **è stato tolto**: `framework` non ha `updated_at`. |
| `.n-card` "Programmi analizzati 64" | **Rinominata** | Diventa **"Programmi in database"** = `count(programmi where stato='confermato')`, col sotto-testo "N in attesa di verifica in staging". Onesta: non esiste una tabella `analisi`. |
| `.attivita` | **Unione client-side** | Le ultime 5 righe di `programmi`, `campagne` e `manuali` per `created_at desc`, unite e riordinate in JS (3 query, nessuna vista nuova). Con dati vuoti mostra un empty state che invita a partire dal Catalogo o dal Piano. |
| `.porta .quick` | **Condizionali** | Compaiono solo dove c'è un dato vero: programmi in staging per il Piano, conteggi per il Catalogo, ultima ricerca salvata (da `localStorage`) per l'Offerta. Niente placeholder finti. |
| Tessera "Guida rapida" | **Rimossa** | Il tour di 3 minuti non esiste. |
| `.tip` "puoi collegare le sezioni" | **Riscritta** | Il vecchio testo descriveva un deep-link Offerta → Analisi con framework e manuale pre-compilati che **non esiste**. Ora descrive il collegamento reale: il Catalogo è l'unica anagrafica, i programmi del Piano restano disponibili alle campagne future. |
| L'illustrazione SVG (92 righe) | **Rimossa** | La home diventa la dashboard proposta dal mockup: saluto, numeri, cinque porte, attività. L'SVG resta recuperabile da `revisione design Atlante/project/originale/home.html:85-176` se un giorno lo si vuole rimettere. |

**Ancora aperto**: se si vuole il numero reale degli insegnamenti senza costante, serve un aggregato
salvato su Supabase (una tabella `metriche_catalogo` popolata dallo script di upload). Se si vuole
un archivio delle analisi, serve la tabella `analisi` — è funzionalità nuova, non restyling.

### 9.2 Multi-tenant e user chip — deciso

- **Il caret `▾` del selettore tenant è stato rimosso**, insieme al `cursor: pointer`. `profili` ha
  un solo `cliente_id` e la RLS filtra su `cliente_corrente()`: uno switch richiederebbe una
  relazione N:N utente↔cliente e una revisione delle policy. Un controllo che non fa niente è peggio
  che non averlo. Il `.tenant` resta come identificazione del cliente: nome + `editore_proprio`.
- **La zona non viene mostrata**: `profili` non ce l'ha. L'user chip mostra `nome_completo` (con
  fallback alla parte prima della `@` dell'email) e il ruolo. Aggiunto un **bottone di logout**
  (`⎋`) che prima non esisteva da nessuna parte.

**Ancora aperto**: `profili.zona` come colonna nuova, se serve nella firma delle email del Piano.

### 9.3 Copy e naming — deciso

Adottati i nomi del mockup: "Confronto manuali" (era "Analisi comparativa") e "Catalogo" (era
"Utilità"). L'incoerenza fra `shell.js` ("Analisi programma") e `A-home.html` ("Analisi di un
programma") è stata risolta a favore della forma lunga, **"Analisi di un programma"**, ovunque:
sidebar, home, breadcrumb, titolo di pagina. Il badge `v2` è stato mantenuto.

**Da confermare con chi usa il prodotto**: i due nomi cambiati sono quelli con cui il promotore
pensa alle sezioni. Se "Analisi comparativa" è il termine che usa davvero, si cambia in `shell.js`.

### 9.4 Catalogo — deciso

- **I form CRUD sono diventati modali**, aperti da `＋ Aggiungi manuale` / `＋ Aggiungi framework`,
  visibili solo a `ruolo = 'gestore'` come prima. I due listener di auto-compilazione dal JSON
  incollato sono stati portati dentro invariati.
- **`↓ Esporta CSV` è stato implementato**: esporta i manuali attualmente in memoria con tipo
  proprio/competitor e presenza dell'indice, separatore `;` e BOM (senza, Excel in italiano sbaglia
  gli accenti).
- **Filtro Editore aggiunto** accanto a Materia, ricavato dai `publisher` presenti.
- **Le statistiche in cima sono tutte calcolate dai dati già caricati**, nessuna query nuova:
  totali, propri/competitor, con indice + percentuale, framework, materie coperte.
- **La paginazione dentro l'accordion non è stata implementata**: la materia si apre intera.
  L'accordion apre di default solo la prima materia (quella con più voci), e si apre tutto quando
  c'è un filtro attivo — chi cerca vuole vedere.
- Il JSON grezzo di `dati` è passato dalla riga espansa a un **modale** aperto dal bottone `Vedi`.

### 9.5 Analisi, Confronto, Piano — deciso

1. **«Ti mando una notifica», «l'analisi resta in coda», «archivio»** → **testi riscritti**. Le
   chiamate partono dal browser con la chiave in `sessionStorage`: non esiste una coda lato server.
   L'empty hero ora dice: *«L'analisi gira nel tuo browser con la tua chiave OpenAI: resta su questa
   pagina fino al termine — se la chiudi, l'analisi si interrompe e va rilanciata.»*
   In compenso **`× Annulla` è stato implementato davvero**, con un `AbortController` passato a
   tutte le `fetch`: interrompe le chiamate in volo, in Analisi e in Confronto.
2. **`Salva bozza`** → **implementato in versione minima**: un solo slot in `localStorage`
   (`atlante_analisi_bozza_v1`) con framework, classe, CFU/ore, manuale adottato, alternativi
   selezionati, tipo di analisi e testo del programma. **Mai la chiave API.** Se c'è una bozza,
   l'empty hero mostra un riquadro *Riprendi / Scarta*.
   *Aperto*: più bozze con nome, o bozze condivise fra dispositivi, richiedono una tabella.
3. **«64 analisi complete nell'archivio»** → **rimosso dall'empty hero**. Non esiste una tabella
   `analisi`.
4. **`.cost-hint` "~0,08 $ · 32 s"** → **sostituito con un dato vero e verificabile**: il `.timing`
   dell'empty hero mostra il **numero di chiamate AI** (3 + 1 per alternativo in analisi base;
   8 + 1 per manuale valutato in avanzata) invece di un costo inventato. Il `.cost-hint` accanto al
   bottone Analizza mostra ora i **campi obbligatori mancanti**, che è l'informazione che serve lì.
5. **Piano, colonna "Insegnamento · 4° anno · 9 CFU"** → **opzione (b)**: la colonna mostra
   `materia_inferita` e `corso_laurea` + `classe_laurea`, che esistono. `programmi` non ha
   `insegnamento`, `anno`, `cfu`, e aggiungerli avrebbe richiesto di toccare un prompt.
6. **Piano, `.metric` "Programmi in scope"** → **omessa**. Restano **"Docenti target"** e
   **"Email pronte"**, calcolate con una sola query su `campagna_target` per tutte le campagne.
7. **Piano, stato campagna `sc-attiva`** → **opzione (b)**, nessuna migration: lo stato mostrato è
   derivato — `completata` se `stato = 'completata'`, altrimenti `attiva` se `fase = 'completa'`
   (campagna pronta a partire ma non chiusa), altrimenti `bozza`.
8. **Piano, stato email per riga e `Approva & copia`** → **derivato**: `email_corpo is null` →
   "da generare", altrimenti "pronta". Il bottone è diventato **`✓ Copia negli appunti`**
   (`navigator.clipboard`), senza la parola "Approva" che implicherebbe uno stato inesistente.
   Il bottone **`Modifica` rende l'email editabile** prima della copia (`contenteditable` sul corpo,
   input sull'oggetto): la vecchia UI aveva textarea editabili e non si voleva perdere quella
   possibilità.
   *Aperto*: una colonna `campagna_target.email_stato` (`bozza | approvata | inviata`) renderebbe
   tracciabile "email inviate". È una migration piccola e utile, ma è funzionalità nuova.
9. **Piano, "Framework" e "Criterio di selezione"** nella card campagna → il criterio è scritto come
   testo che descrive la logica reale di `calcolaRilevanzaTarget()`, con la precisazione che è un
   calcolo e non un output dell'AI. La riga "Framework" è stata omessa: non è memorizzata su
   `campagne`, viene risolta a runtime per materia.
10. **Offerta, email del docente in tabella** → **rinviata** (punto 6 della lista di decisioni).
    La colonna non è stata aggiunta: l'app non è ancora in produzione e la scelta ha implicazioni
    di trattamento dati che vanno prese con chi ne ha la responsabilità, non in fase di restyling.
11. **Offerta, "aggiornato 3 giorni fa"** → **non implementato**. Va verificato prima che
    `manifest.json` contenga davvero una data utilizzabile; il posto dove metterla è il `.tfoot`.

**Altre due cose fatte in Analisi che il piano prevedeva:**
- La **selezione dei manuali propri** (quando sono più di 5) è stata spostata **prima** delle
  chiamate AI, non più a metà: così l'elenco delle fasi mostrato durante la lavorazione è già
  definitivo e il promotore sa in anticipo quante chiamate costerà.
- Le fasi della lavorazione hanno **id stabili** (`quadro`, `adottato`, `alt-<id>`, `proprio-<id>`…)
  invece di indici numerici, perché il loro numero dipende dai dati.

### 9.6 Le tre viste del Piano non prototipate — fatto

Carica, Staging e Database sono state restilizzate con i componenti già definiti, senza inventarne
di nuovi:
- **Carica**: `.form-card` + `.upload-drop` con drag & drop (prima c'era solo il file picker) +
  coda con `.status` per riga.
- **Staging**: `.card.marked` con i tre semafori resi come `.status.s-pres` / `.s-ass` e le stesse
  etichette ("Dati verificati", "Framework materia", "Catalogo materia"). Il bottone "Promuovi al
  piano" resta disabilitato finché non sono tutti verdi.
- **Database**: `.toolbar` + `.search-box` + `.pill-filter` per i tre filtri, card per riga.

Le quattro **modali dinamiche** costruite come stringhe HTML in `#overlayModale` (Verifica, Modifica,
Modifica manuali citati, Modifica campagna) non sono state riscritte: i loro nomi di classe storici
(`.modale`, `.modale-azioni`, `.riepilogo-riga`, `.lista-manuali-citati`) sono stati ridefiniti nel
linguaggio di `shell.css` dentro il `<style>` della pagina. Riscriverne il markup avrebbe voluto
dire rimettere mano a `mmOnChange`/`mmOnClick` e alla loro delegazione di eventi, con un rischio
sproporzionato al guadagno. Se un giorno le si riscrive, quelle regole CSS si cancellano.

### 9.7 Responsive — deciso: degrado corretto, non design mobile

Implementato quanto previsto dalla §6.7, e nulla di più:
- **≤ 1200px**: la sidebar esce dal flusso e diventa un pannello a scomparsa con hamburger e scrim
  (chiudibile con Esc); lo split passa a 360px + resto.
- **≤ 900px**: split, griglie a colonne fisse, `.row2`/`.row3` e `.form-grid` diventano verticali;
  `.form-col` perde lo `sticky` (a colonna singola bloccherebbe il form in cima rendendo il
  risultato irraggiungibile); le azioni per riga diventano sempre visibili invece che in hover.
- **≤ 620px**: padding ridotti, stepper a una colonna.
- Tutte le tabelle larghe scrollano dentro il proprio contenitore (`.table-scroll`).
- Aggiunto `<meta name="viewport">` a tutte le pagine: prima c'era solo nell'Offerta.

**Resta aperto** il design mobile vero. I casi che richiedono riprogettazione, non media query, sono
sempre quelli: heatmap moduli × manuali, matrice del Confronto, tabella dell'Offerta con DataTables,
vista ateneo ad albero, drawer dentro una riga di tabella.

### 9.8 Stati non coperti da nessun mockup — fatti

- **Errori**: `.helper.errore` (variante rossa del callout) usata per gli errori di form e di rete
  in Analisi, Confronto, Catalogo, Offerta.
- **Empty state**: `.empty` promosso in `shell.css` e usato ovunque — nessun risultato di ricerca nel
  Catalogo, nessuna campagna, nessun target, nessun confronto ancora lanciato, analisi annullata.
- **Sessione**: `avviaSessione()` reindirizza al login quando non c'è sessione (con
  `{ redirect: false }` le pagine mostrano invece il link, per non far sparire la pagina sotto i
  piedi durante il caricamento). Utente autenticato senza profilo → `bloccoSenzaProfilo()`, che
  spiega cosa fare invece di lasciare la pagina vuota.
- **Conferme distruttive**: il pattern `.modal-box.pericolo` è in `shell.css` ed è usato dal modale
  Disattiva dell'Offerta. Le eliminazioni del Piano (`eliminaStaging`, elimina campagna) usano
  ancora `confirm()` nativo: **non convertite**, è la cosa più piccola rimasta aperta.

### 9.9 La Direzione C — invariata

`C-offerta-formativa.html` e `C-analisi-programma.html` restano in archivio, non in produzione.
L'idea di riusarla per la vista stampabile del rapporto resta un lavoro a parte; nel frattempo
`shell.css` ha un blocco `@media print` che nasconde sidebar, form, stepper ed export e impedisce
alle card di spezzarsi a metà pagina.

---

## 10. Riepilogo dell'effort

Stima originale per uno sviluppatore che conosce l'app, tenuta come riferimento per lavori simili.
Non include le funzionalità nuove elencate come "aperte" in §9.

| Fase | Contenuto | Giorni | Rischio |
|---|---|---|---|
| 0 | Preparazione, token, shell, baseline visiva | 0,5 | basso |
| 1 | Login | 0,5 | basso |
| 2 | Sidebar condivisa + bootstrap sessione | 0,5 | basso |
| 3 | Home | 0,5 | basso |
| 4 | Catalogo | 1 | basso |
| 5 | Offerta formativa | 2 | medio |
| 6 | Analisi programma (3 stati) | 2,5 | **alto** |
| 7 | Confronto manuali | 1 | medio |
| 8 | Piano di promozione | 2,5 | **alto** |
| 9 | Pulizia, QA, stati mancanti, responsive degradato | 1 | medio |
| | **Totale** | **~12 giorni** | |

Le fasi 1–4 sono rilasciabili come primo incremento (l'utente vede subito la sidebar persistente,
che è il valore principale del redesign). Le fasi 5–8 sono indipendenti fra loro e possono essere
rilasciate una alla volta: durante la transizione conviverebbero pagine vecchie e nuove — è
accettabile grazie allo shim di §7.1, ed è il motivo per cui quella ricetta esiste.

Nell'esecuzione reale le fasi sono state fatte tutte di seguito, quindi lo shim non è servito.

---

## 11. Domande frequenti

**«Posso implementarlo un pezzo alla volta?»**
Sì: le pagine sono autonome, serve solo lo shim CSS di §7.1 durante la transizione. Nel lavoro già
svolto sono state migrate tutte insieme, quindi lo shim non è stato scritto.

**«Devo tenere Fraunces?»**
No, ma tieni **un** serif per titoli e valori. Se il cliente ha un font di brand, sostituisci
`--font-serif` in `tokens.css`. Il pattern "serif per l'accento editoriale, sans per la UI" è ciò
che rende riconoscibile la Direzione A, non Fraunces in particolare.

**«E se il cliente vuole un colore diverso per una voce?»**
Cambia la tripletta `--voce-XXX` / `-soft` / `-ink` in `tokens.css`. Nessun altro file. È la ragione
della regola "mai un hex hardcoded in un componente".

**«Devo rinominare i file per togliere il prefisso `A-`?»**
No — **al contrario**. Tieni i nomi di produzione e modifica gli `href` in `shell.js`. La v1 di
questo documento consigliava di rinominare: era sbagliato, perché la allow-list dei redirect URL del
magic link Supabase (non versionata in questo repo) è configurata sui nomi attuali. Vedi §4.1.

**«L'app ha JS che aggiunge `.attivo` alle voci di nav — devo togliere quel codice?»**
Non esiste: l'app attuale non evidenzia alcuna voce (ogni pagina interna ha solo `← Menu`).
`shell.js` gestisce l'evidenziazione da sé in base a `data-attiva`. Quello che va rimosso sono i 5
`<nav><a href="home.html">← Menu</a></nav>`.

**«Posso vedere gli originali per confronto?»**
Sono in `originale/` dentro questa stessa cartella, e sono **byte-identici** ai file in `app/`. Il
markup è cambiato molto, ma la logica JS di ogni pagina è mantenibile intatta.

**«Il mockup e questo documento dicono cose diverse: a chi credo?»**
Su un **dettaglio visivo** (spaziatura, colore, dimensione, ordine degli elementi) vince il mockup.
Su **cosa fa il codice o cosa contiene il database** vince questo documento: le sezioni 2, 7 e 9
sono state scritte leggendo `app/`, `supabase/migrations/` e `scripts/`, non i documenti di piano.

**«Manca un componente che nell'app c'è ma che il redesign non ha previsto. Cosa faccio?»**
Applica il pattern più vicino: `background: var(--surface)`, `border: 1px solid var(--line)`,
`border-radius: var(--r-lg)`, `box-shadow: var(--sh-2)`, header con
`border-bottom: 1px solid var(--line)` (mai un colore pieno), titolo in `var(--font-serif)` peso 500.
Definiscilo nel `<style>` della pagina; se lo riusi in una seconda pagina, spostalo in `shell.css`.
