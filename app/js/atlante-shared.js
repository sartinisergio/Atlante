// Funzioni condivise fra tutte le pagine di Atlante.
// Script classico (non un modulo): caricato con <script src="js/atlante-shared.js">
// prima di shell.js e dello script della pagina, le dichiarazioni finiscono nello
// stesso scope globale.

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}

// estrazione tollerante dell'indice di un manuale da dati.raw (import MAP/MATRIX):
// prova indice a capitoli, poi riassunto testuale, poi temi chiave — in quest'ordine
function estraiIndiceManuale(m) {
  const raw = (m && m.dati && m.dati.raw) || {};
  if (Array.isArray(raw.index_chapters) && raw.index_chapters.length > 0) {
    const testo = raw.index_chapters.map(c => {
      const sezioni = Array.isArray(c.sections) ? c.sections.map(s => s.title).filter(Boolean).join('; ') : '';
      return `Cap. ${c.number != null ? c.number : ''}: ${c.title || ''}${sezioni ? ' — ' + sezioni : ''}`;
    }).join('\n');
    return testo.trim() || null;
  }
  if (typeof raw.chapters_summary === 'string' && raw.chapters_summary.trim()) return raw.chapters_summary.trim();
  if (Array.isArray(raw.temi_chiave) && raw.temi_chiave.length > 0) return raw.temi_chiave.join('\n');
  return null;
}

// ---------------------------------------------------------------------------
// Taglio "sicuro" del testo mandato all'IA (indici manuali, testo di un programma).
// Come .slice(0, limite), ma se taglia davvero qualcosa lo registra nell'array
// `avvisi` passato dalla pagina chiamante — un limite silenzioso fa dichiarare
// "assente" argomenti che il modello non ha mai visto (bug trovato confrontando
// Botta/Hart, 29 luglio 2026): un limite che avvisa quando scatta è affidabile,
// uno che taglia senza dirlo no. `avvisi` è un array a livello di pagina, svuotato
// a ogni nuova analisi da chi chiama.
// ---------------------------------------------------------------------------
function taglia(testo, limite, avvisi, etichetta) {
  const s = String(testo == null ? '' : testo);
  if (s.length > limite && avvisi) {
    avvisi.push(etichetta ? `${etichetta} (${s.length.toLocaleString('it-IT')} caratteri, limite ${limite.toLocaleString('it-IT')})` : `testo di ${s.length.toLocaleString('it-IT')} caratteri troncato a ${limite.toLocaleString('it-IT')}`);
  }
  return s.slice(0, limite);
}

function bloccoAvvisiTaglio(avvisi) {
  if (!avvisi || avvisi.length === 0) return '';
  // stesso testo può passare più volte da taglia() (es. lo stesso "testo del programma" usato
  // in più prompt della stessa analisi): l'utente deve vedere l'avviso una volta sola
  const unici = [...new Set(avvisi)];
  return `<div class="helper attesa"><span class="ic">!</span><div><strong>Alcuni testi superano il limite gestito e sono stati troncati</strong> — l'analisi su quella parte potrebbe essere incompleta: ${unici.map(escapeHtml).join('; ')}.</div></div>`;
}

// scala di giudizio qualitativa a 6 livelli, mai un voto numerico (richiesta esplicita di Sergio)
const GIUDIZI = ['insufficiente', 'sufficiente', 'discreto', 'buono', 'molto buono', 'eccellente'];
function normalizzaGiudizio(s) {
  if (!s) return null;
  const t = String(s).trim().toLowerCase();
  return GIUDIZI.includes(t) ? t : null;
}
function rangoGiudizio(g) {
  const i = GIUDIZI.indexOf(g);
  return i === -1 ? -1 : i;
}
const RANGO_STATO = { assente: 0, parziale: 1, presente: 2 };

// ---------------------------------------------------------------------------
// Dato -> classe CSS.
// Prima le classi venivano costruite concatenando il valore ("stato-" + stato),
// che con "n/d" produceva una classe contenente uno slash — da cui l'orrendo
// selettore .stato-n\/d nel CSS. Queste mappe rendono esplicito l'insieme
// chiuso di classi che shell.css definisce davvero.
// ---------------------------------------------------------------------------
const CLASSE_STATO = { presente: 's-pres', parziale: 's-parz', assente: 's-ass' };
function classeStato(s) { return CLASSE_STATO[String(s || '').trim().toLowerCase()] || 's-idle'; }

const CLASSE_GIUDIZIO = {
  'insufficiente': 'g-insuf',
  'sufficiente': 'g-suff',
  'discreto': 'g-discreto',
  'buono': 'g-buono',
  'molto buono': 'g-molto-buono',
  'eccellente': 'g-eccellente',
};
function classeGiudizio(g) { return CLASSE_GIUDIZIO[normalizzaGiudizio(g)] || 'g-nd'; }

// badge pronti all'uso, con le classi di shell.css
function badgeStato(s) {
  const testo = s ? String(s).replace(/_/g, ' ') : 'n/d';
  return `<span class="status ${classeStato(s)}">${escapeHtml(testo)}</span>`;
}
function badgeGiudizio(g) {
  const norm = normalizzaGiudizio(g) || 'n/d';
  return `<span class="giud-pill ${classeGiudizio(g)}">${escapeHtml(norm)}</span>`;
}

// ---------------------------------------------------------------------------
// Chiave/modello OpenAI: solo sessionStorage, mai localStorage — sparisce chiudendo
// la scheda/il browser, mai scritta su disco né su Supabase, stessa filosofia in
// tutta Atlante.
// ---------------------------------------------------------------------------
const CHIAVE_LS_OPENAI_KEY = 'atlante_openai_key';
const CHIAVE_LS_OPENAI_MODELLO = 'atlante_openai_modello';
function leggiChiaveOpenAI() { return sessionStorage.getItem(CHIAVE_LS_OPENAI_KEY) || ''; }
function salvaChiaveOpenAI(chiave) { sessionStorage.setItem(CHIAVE_LS_OPENAI_KEY, chiave); }
function leggiModelloOpenAI() { return sessionStorage.getItem(CHIAVE_LS_OPENAI_MODELLO) || ''; }
function salvaModelloOpenAI(modello) { sessionStorage.setItem(CHIAVE_LS_OPENAI_MODELLO, modello); }

// ---------------------------------------------------------------------------
// Bootstrap comune: sessione + profilo + cliente.
// Prima ogni pagina ripeteva la stessa query con select diverse; questa è il
// superset di tutte. Restituisce null (dopo aver rediretto al login) se non c'è
// sessione; { session, profilo: null } se l'utente è autenticato ma senza profilo
// collegato.
// ---------------------------------------------------------------------------
async function avviaSessione(supabaseClient, opzioni) {
  const { redirect = true } = opzioni || {};
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) {
    if (redirect) window.location.href = 'login.html';
    return null;
  }
  const { data: profilo } = await supabaseClient
    .from('profili')
    .select('ruolo, cliente_id, nome_completo, stato, clienti(nome, editore_proprio, offerta_formativa_inclusa, confronto_manuali_incluso, analisi_programma_incluso, piano_promozione_incluso, crediti_residui)')
    .eq('id', session.user.id)
    .maybeSingle();

  // Un profilo rimosso perde l'accesso: stessa forma di "nessun profilo collegato" per
  // tutte le pagine che già gestiscono sessione.profilo === null (punto C, soft-delete).
  if (profilo && profilo.stato === 'rimosso') {
    return { session, profilo: null };
  }

  // Il link di invito è esso stesso l'autenticazione (punto C): al primo accesso dopo
  // averlo cliccato, il profilo passa da pending ad attivo qui, prima che qualunque altra
  // pagina lo usi.
  if (profilo && profilo.stato === 'pending') {
    await supabaseClient.from('profili').update({ stato: 'attivo' }).eq('id', session.user.id);
    profilo.stato = 'attivo';
  }

  return { session, profilo: profilo || null };
}

// Blocco da mostrare al posto del contenuto quando l'utente è autenticato ma non
// ha un profilo collegato: senza cliente_id nessuna query di Atlante ha senso.
function bloccoSenzaProfilo(email) {
  return `<div class="empty">
    <h4>Nessun profilo collegato</h4>
    <p>Sei autenticato come <strong>${escapeHtml(email)}</strong>, ma il tuo utente non è ancora
    collegato a un editore. Contatta l'amministratore di Atlante per l'abilitazione.</p>
  </div>`;
}

// ---------------------------------------------------------------------------
// Progresso narrativo delle chiamate AI (usato da Analisi e Confronto).
//
// Sostituisce lo spinner muto: mostra le fasi con nomi comprensibili, quali
// sono già chiuse, quale è in corso, e l'anteprima del primo testo disponibile.
// Il numero di fasi NON è fisso: dipende da quanti manuali sono selezionati e
// dal tipo di analisi, quindi l'elenco si costruisce a ogni esecuzione.
//
//   const lav = creaLavorazione(box, { titolo: '…', fasi: [{titolo, dettaglio}] });
//   lav.fase(0, 'now');  … lav.fase(0, 'done', '2 843 parole');
//   lav.anteprima(sintesi);
//   lav.ferma();
// ---------------------------------------------------------------------------
function creaLavorazione(contenitore, opzioni) {
  const fasi = opzioni.fasi || [];
  const romani = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
  const inizio = Date.now();

  contenitore.innerHTML = `
    <div class="lavorazione">
      <div class="lav-head">
        <span class="lav-kicker">§ In elaborazione</span>
        <span class="lav-timer"><span class="live"></span><span data-lav="orologio">00:00</span></span>
      </div>
      <h2 class="lav-title" data-lav="titolo">${opzioni.titolo || 'Elaborazione in corso…'}</h2>
      <div class="progressbar"><div class="fill" data-lav="barra"></div></div>
      <div class="fasi" data-lav="fasi">
        ${fasi.map((f, i) => `
          <div class="fase next" data-fase="${escapeHtml(f.id != null ? f.id : i)}">
            <div class="indicator"><span class="rom">${romani[i] || (i + 1)}</span></div>
            <div class="body">
              <h4>${escapeHtml(f.titolo)}</h4>
              <p>${escapeHtml(f.dettaglio || '')}</p>
            </div>
            <span class="durata"></span>
          </div>`).join('')}
      </div>
      <div class="anteprima" data-lav="anteprima" hidden>
        <h4>Prima sintesi (già disponibile)</h4>
        <blockquote data-lav="anteprima-testo"></blockquote>
      </div>
    </div>`;

  const el = s => contenitore.querySelector(`[data-lav="${s}"]`);
  let ultimoAvvio = Date.now();

  const orologio = setInterval(() => {
    const s = Math.floor((Date.now() - inizio) / 1000);
    el('orologio').textContent = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  }, 1000);

  // `rif` è l'indice della fase, oppure il suo id se la fase ne dichiara uno:
  // gli id servono quando il numero di fasi dipende dai dati (es. un manuale
  // proprio per fase) e un indice numerico sarebbe fragile.
  function fase(rif, stato, dettaglio) {
    const nodo = contenitore.querySelector(`[data-fase="${CSS.escape(String(rif))}"]`);
    if (!nodo) return;
    nodo.className = 'fase ' + stato;
    if (dettaglio != null) nodo.querySelector('p').textContent = dettaglio;
    if (stato === 'now') {
      ultimoAvvio = Date.now();
      nodo.querySelector('.durata').textContent = '';
    } else if (stato === 'done' || stato === 'errore') {
      nodo.querySelector('.durata').textContent = Math.max(1, Math.round((Date.now() - ultimoAvvio) / 1000)) + ' s';
    }
    const fatte = contenitore.querySelectorAll('.fase.done').length;
    el('barra').style.width = fasi.length ? Math.round(fatte / fasi.length * 100) + '%' : '0%';
  }

  return {
    fase,
    titolo(t) { el('titolo').innerHTML = t; },
    anteprima(testo) {
      if (!testo) return;
      el('anteprima').hidden = false;
      el('anteprima-testo').textContent = testo;
    },
    ferma() { clearInterval(orologio); },
  };
}

// ---------------------------------------------------------------------------
// Formattazioni ricorrenti
// ---------------------------------------------------------------------------
function formattaNumero(n) {
  return (n == null || Number.isNaN(Number(n))) ? '—' : Number(n).toLocaleString('it-IT');
}

// "3 ore fa", "ieri", "4 giorni fa" — usato dall'attività recente della home
function tempoRelativo(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const min = Math.round((Date.now() - d.getTime()) / 60000);
  if (min < 1) return 'adesso';
  if (min < 60) return `${min} min fa`;
  const ore = Math.round(min / 60);
  if (ore < 24) return `${ore} or${ore === 1 ? 'a' : 'e'} fa`;
  const giorni = Math.round(ore / 24);
  if (giorni === 1) return 'ieri';
  if (giorni < 30) return `${giorni} giorni fa`;
  return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' });
}
