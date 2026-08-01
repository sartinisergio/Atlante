# Report comparativo: quale API LLM scegliere (luglio 2026)

*Preparato per UNI-Map · Atlante Editoriale — il modulo "chiamata LLM sicura" della Fase 4, con supporto multi-provider configurabile per cliente*

---

## 1. Sintesi per decidere in fretta

| Se il tuo criterio principale è... | Scegli |
|---|---|
| Miglior rapporto qualità/prezzo generale | **Claude Sonnet 5** (Anthropic) — $2/$10 promo fino al 31 agosto, poi $3/$15 |
| Costo minimo per task semplici (estrazione, classificazione, scraping) | **Claude Haiku 4.5** ($1/$5) o **Gemini 3.1 Flash-Lite** ($0.25/$1.50) |
| Massima qualità di ragionamento (analisi comparativa contenuti-indice) | **Claude Opus 4.8** ($5/$25) o **GPT-5.5** ($5/$30) |
| Contesto lunghissimo (interi PDF di programmi di corso) | **Gemini 3.1 Pro** (fino a 2M token) |
| Ecosistema tool/agenti più maturo | **OpenAI GPT-5.x** |

Per una pipeline come la tua — tre agenti sequenziali con compiti diversi — la scelta più sensata **non è un unico modello**, ma un routing: modello economico per lo scraping/estrazione, modello di fascia media per il confronto contenuti, modello di punta solo per la generazione del piano promozionale (dove la qualità del testo conta di più).

---

## 2. Anthropic (Claude) — prezzi per milione di token

| Modello | Input | Output | Contesto | Note |
|---|---|---|---|---|
| Claude Haiku 4.5 | $1.00 | $5.00 | 200K–1M | Il più economico della gamma attuale, buono per estrazione/classificazione/routing |
| Claude Sonnet 5 | $2.00 (promo fino al 31/8) → $3.00 dal 1/9 | $10.00 → $15.00 | 1M | Miglior rapporto qualità/prezzo, adatto a coding e produzione |
| Claude Opus 4.8 | $5.00 | $25.00 | 1M | Flagship per ragionamento complesso e lavoro agentico ad alta autonomia |
| Claude Fable 5 / Mythos 5 | $10.00 | $50.00 | 1M | Fascia "Mythos", accesso più recente e con salvaguardie aggiuntive (Fable) |

<cite index="9-1">Anthropic Claude pricing va da $1,00 per milione di token in input (Haiku 4.5) al prezzo pubblicato di $10,00 per milione per Claude Fable 5 e Claude Mythos 5, con Claude Sonnet 5 ora disponibile a un prezzo introduttivo di $2,00 in input e $10,00 in output fino al 31 agosto 2026</cite>, dopodiché torna al prezzo standard di $3/$15. <cite index="9-1">Il caching dei prompt riduce il costo dell'input in cache del 90%</cite>.

**Leve di risparmio:**
- **Prompt caching**: -90% sull'input ripetuto (utile se ripeti lo stesso prompt di sistema/indice del libro a ogni chiamata)
- **Batch API**: <cite index="2-1">-50% sull'elaborazione batch</cite> — ideale per lo scraping massivo su ~96 università, che non richiede risposta in tempo reale
- **Routing tra modelli**: <cite index="2-1">crea uno spread di costo 5–25x tra i vari livelli</cite>

---

## 3. OpenAI (GPT) — prezzi per milione di token

| Modello | Input | Output | Contesto | Note |
|---|---|---|---|---|
| GPT-5 nano / GPT-5.4 nano | $0.05–0.20 | $1.25 | ~400K | Fascia ultra-economica per task semplici |
| GPT-5.4 mini | $0.75 | $4.50 | ~400K | Buon compromesso per chatbot/FAQ |
| GPT-5 | $1.25 | $10.00 | 400K | |
| GPT-5.4 | $2.50 | $15.00 | ~270K–400K | |
| GPT-5.6 Terra | $2.50 | $15.00 | 1M | Nuova famiglia (GA 9 luglio 2026) |
| GPT-5.5 | $5.00 | $30.00 | 1M | Flagship attuale, prezzo raddoppiato rispetto a GPT-5.4 |
| GPT-5.5 Pro / GPT-5.6 | fino a $30 | fino a $180 | 1M | Massima potenza, costo molto elevato |

<cite index="17-1">OpenAI ha la scala di prezzi più ampia tra i provider, da 0,05 dollari per milione di token in input (GPT-5 nano) a 30/180 dollari (GPT-5.5 Pro), uno spread di 600 volte</cite>. <cite index="17-1">Il livello flagship si è ormai allineato: GPT-5.6 Sol e GPT-5.5 a 5/30 dollari si confrontano con Claude Opus 4.8 a 5/25 dollari — stesso prezzo in input, Anthropic più economico del 17% in output</cite>.

**Leve di risparmio:**
- Batch API: -50%
- Cached input: circa 10% del prezzo standard
- Attenzione: i **token di ragionamento** (reasoning) dei modelli "thinking" vengono fatturati come output — possono far lievitare il costo reale ben oltre la stima basata sul solo prompt

---

## 4. Google (Gemini) — prezzi per milione di token

| Modello | Input | Output | Contesto | Note |
|---|---|---|---|---|
| Gemini 3.1 Flash-Lite | $0.25 | $1.50 | 1M | Il più economico, utile per classificazione/estrazione di massa |
| Gemini 3 Flash | $0.50 | $3.00 | 1M | |
| Gemini 3.5 Flash | $1.50 | $9.00 | 1M | Miglior rapporto qualità/prezzo Google attuale, batte 3.1 Pro su coding |
| Gemini 3.1 Pro | $2.00 (fino a 200K) → $4.00 oltre | $12.00 → $18.00 | fino a 2M | Contesto più ampio della categoria |

<cite index="21-1">Gemini offre una finestra di contesto di 1 milione di token su ogni modello, compreso quello più economico — un vantaggio che i concorrenti non replicano ancora ai livelli entry-level</cite>. <cite index="25-1">Gemini 3.1 Pro supporta fino a 2 milioni di token di contesto, il doppio di Claude Opus 4.8 e circa 7 volte GPT-5.4</cite>.

**Leve di risparmio:**
- <cite index="22-1">Batch: Gemini 3.1 Pro scende a $1,00/$6,00 (metà prezzo), Gemini 2.5 Pro a $0,625/$5</cite>
- Cache hit: sconto del 90% sull'input

---

## 5. Applicazione al vero caso d'uso: Atlante Editoriale

Il contesto qui non è una pipeline interna, ma un **prodotto multi-tenant venduto a editori**, dove il costo dei token è a tutti gli effetti un COGS (costo del venduto) da tenere sotto controllo per cliente, e dove il modulo "chiamata LLM sicura" di Fase 4 deve esporre **il provider/modello come parametro configurabile per cliente**, non un valore fisso nel codice.

### 5.1 Cosa ha davvero bisogno di un LLM (e cosa no)

Dal piano emerge una scelta di design già presa, e vale la pena rispettarla nel dimensionamento dei costi: **punteggi e confronti oggettivi restano calcolati in JS**, mai generati da un modello — il che significa che il volume reale di chiamate LLM è più basso di quanto sembrerebbe guardando solo alle funzionalità. I tre moduli attivi/da attivare hanno profili di uso molto diversi:

| Modulo | Stato | Uso dell'LLM | Volume/frequenza |
|---|---|---|---|
| 1. Analisi comparativa di manuali | Fatto | Minimo — confronto sui criteri è calcolato, non generato | Basso |
| 2. Analisi di un programma | Fatto | Giudizi qualitativi su moduli/dimensioni + guida al colloquio condizionale | Medio — un programma alla volta, testo non lunghissimo |
| 3. Piano di promozione | Da fare, prossimo passo | Generazione di piano su più programmi reali, testo lungo e articolato | Alto — è il modulo con l'uso più intensivo, verosimilmente quello che pesa di più sul COGS |

### 5.2 Architettura del modulo "chiamata LLM sicura" (Fase 4)

Dato che hai confermato **multi-provider configurabile per cliente**, il modulo va pensato come un'astrazione con tre livelli:

1. **Interfaccia unica** — una funzione `chiamaLLM(prompt, schema_atteso, opzioni_cliente)` che non sa nulla del provider sottostante; ogni funzionalità (voce 2, voce 3) la chiama sempre allo stesso modo
2. **Adapter per provider** — un adapter per Anthropic, uno per OpenAI, uno per Google, ciascuno che traduce la stessa richiesta nel formato dell'API specifica e normalizza la risposta (qui ricade anche il "parsing JSON robusto" già previsto in Fase 4, che va scritto una volta sola a livello di adapter, non ripetuto per ogni chiamata)
3. **Configurazione per cliente** — nella tabella `cliente_id` già prevista in Fase 1, un campo che indica provider/modello preferito (e magari un fallback se il provider primario è irraggiungibile). Questo permette anche di offrire piani differenziati: un cliente pilota su modello economico, un cliente enterprise su modello di punta

**Un dettaglio da non sottovalutare per un servizio a pagamento**: se il costo LLM è variabile per cliente, ti serve anche un modo per **misurare e attribuire** il consumo di token per cliente (anche solo un log `cliente_id, modulo, token_input, token_output, modello, costo_stimato` scritto ad ogni chiamata) — altrimenti non saprai mai se il piano tariffario di UNI-Map copre davvero il costo reale di quel cliente.

### 5.3 Raccomandazioni di default per modulo

Non vincolanti — sono il punto di partenza ragionevole prima che il cliente eventualmente lo cambi:

- **Voce 2, Analisi di un programma**: **Claude Sonnet 5** ($2/$10 in promo) come default. Buon rapporto qualità/prezzo per giudizi qualitativi ripetuti, frequenza medio-bassa
- **Voce 3, Piano di promozione**: qui vale la pena partire da un modello di fascia alta come default — **Claude Opus 4.8** ($5/$25) o **GPT-5.5** ($5/$30) — perché è testo che il cliente userà quasi direttamente nella propria attività commerciale; puoi comunque offrire un'opzione "economica" (Sonnet 5) per clienti pilota o per bozze prima della versione finale
- **Fallback economico trasversale**: **Claude Haiku 4.5** ($1/$5) o **Gemini 3.1 Flash-Lite** ($0.25/$1.50) per eventuali task di supporto (es. classificazione, pre-elaborazione testo caricato dall'utente nel pattern "rilevamento qualità + completamento manuale" di Fase 4)

### 5.4 Nota sul COGS per un servizio con più clienti

Con un solo cliente pilota (Zanichelli) il costo LLM resta comunque contenuto — l'ordine di grandezza realistico è decine di dollari/mese anche usando modelli di fascia alta per il Piano di promozione, dato che il volume di programmi analizzati per cliente non è enorme. Il punto in cui la scelta multi-provider inizia a contare davvero è quando aggiungerai un secondo/terzo editore: a quel punto poter instradare i clienti a basso margine verso modelli più economici, senza toccare il codice, è esattamente il vantaggio che l'architettura ad adapter del §5.2 ti dà.

---

## 6. Nota su un'alternativa emergente

Diverse fonti segnalano **DeepSeek V3.2** ($0.28 input / $0.40 output) come opzione ultra-economica per classificazione ed estrazione, potenzialmente interessante per l'Agente 1 se vuoi testare un quarto provider — ma con minore garanzia di supporto enterprise/SLA rispetto a Anthropic, OpenAI e Google.

---

## 7. Avvertenze

- I prezzi promozionali (es. Sonnet 5 a $2/$10) hanno scadenze note: verifica sempre la pagina ufficiale prima di dimensionare un budget a lungo termine.
- I prezzi "oltre soglia" (es. Gemini 3.1 Pro oltre 200K token) possono raddoppiare il costo se lavori con documenti molto lunghi (interi piani di studio).
- Non è consigliabile ottimizzare solo sul prezzo per-token: la qualità dell'Agente 3 (piano promozionale) incide direttamente sul valore commerciale del tuo output finale.

*Fonti: pagine di pricing ufficiali di Anthropic, OpenAI e Google, verificate da fonti terze aggiornate a luglio 2026. Prezzi soggetti a modifica — verificare sempre sulla pagina ufficiale del provider prima di un impegno di budget.*
