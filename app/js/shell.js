// Sidebar comune a tutte le pagine interne di Atlante.
//
//   <body class="a-shell">
//     <aside class="sidebar" id="sidebar"></aside>
//     <main class="a-main"> ... </main>
//     <script src="js/shell.js" data-attiva="analisi"></script>
//
// data-attiva vale: offerta | confronto | analisi | piano | catalogo | utenti, oppure ""
// per la home (nessuna voce evidenziata).
//
// La classe `a-shell` sta nel markup, NON viene aggiunta da qui: aggiungerla a
// DOMContentLoaded produceva un flash di layout non-grid al primo paint.
//
// Non è un router: si naviga con <a href> classici verso gli altri file .html.

(function () {
  const CURRENT = document.currentScript.dataset.attiva || '';

  const AREE = [
    { id: 'offerta',   dot: 'var(--voce-offerta)',   href: 'offerta-formativa.html', titolo: 'Offerta formativa',   sotto: 'Insegnamenti, lauree, docenti' },
    { id: 'confronto', dot: 'var(--voce-confronto)', href: 'confronto.html',         titolo: 'Confronto manuali',   sotto: 'Un framework, più testi' },
    { id: 'analisi',   dot: 'var(--voce-analisi)',   href: 'analisi-programma.html', titolo: 'Analisi di un programma', sotto: 'Un programma vs manuali' },
    { id: 'piano',     dot: 'var(--voce-piano)',     href: 'piano-promozione.html',  titolo: 'Piano di promozione', sotto: 'Campagne su target' },
  ];
  const RIFERIMENTO = [
    { id: 'utilita',   dot: 'var(--voce-utilita)',   href: 'utilita.html',           titolo: 'Utilità',             sotto: 'Manuali, framework, risorse' },
    { id: 'utenti',    dot: 'var(--voce-utilita)',   href: 'utenti.html',            titolo: 'Utenti',              sotto: 'Chi ha accesso' },
  ];

  function voceHtml(v) {
    const attiva = v.id === CURRENT;
    return `<a class="nav-voce${attiva ? ' attivo' : ''}"
               style="--dot: ${v.dot}"
               href="${v.href}"
               data-voce="${v.id}"
               ${attiva ? 'aria-current="page"' : ''}>
              <span class="dot"></span>
              <span>
                <strong>${v.titolo}</strong>
                <span>${attiva ? 'Sei qui' : v.sotto}</span>
              </span>
            </a>`;
  }

  // I valori del tenant e dell'utente partono come "—": arrivano da Supabase in
  // asincrono, e mostrare un nome finto nel frattempo sarebbe peggio del trattino.
  const HTML = `
    <div class="brand">
      <a href="home.html"><span class="logo">Atlante<em>.</em></span></a>
      <span class="badge-prod">v2</span>
    </div>

    <div class="tenant" id="sidebar-tenant">
      <span class="avatar">—</span>
      <span class="meta"><strong>—</strong><span></span></span>
    </div>

    <div class="side-label">Aree di lavoro</div>
    ${AREE.map(voceHtml).join('')}

    <div class="side-label">Riferimento</div>
    ${RIFERIMENTO.map(voceHtml).join('')}

    <div class="user-chip" id="sidebar-utente">
      <span class="av">—</span>
      <span class="info"><strong>—</strong><span></span></span>
      <button class="esci" id="sidebar-esci" type="button" title="Esci da Atlante" aria-label="Esci da Atlante">⎋</button>
    </div>
  `;

  function montaShell() {
    const aside = document.getElementById('sidebar');
    if (!aside) return;
    aside.innerHTML = HTML;

    // hamburger + scrim: esistono solo sotto i 1200px (vedi shell.css §11)
    if (!document.querySelector('.menu-toggle')) {
      const toggle = document.createElement('button');
      toggle.className = 'menu-toggle';
      toggle.type = 'button';
      toggle.setAttribute('aria-label', 'Apri il menu');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.textContent = '☰';

      const scrim = document.createElement('div');
      scrim.className = 'sidebar-scrim';

      const chiudi = () => {
        document.body.classList.remove('menu-aperto');
        toggle.setAttribute('aria-expanded', 'false');
      };
      toggle.addEventListener('click', () => {
        const aperto = document.body.classList.toggle('menu-aperto');
        toggle.setAttribute('aria-expanded', String(aperto));
      });
      scrim.addEventListener('click', chiudi);
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape') chiudi(); });

      document.body.appendChild(toggle);
      document.body.appendChild(scrim);
    }
  }

  // Gli script stanno in fondo al body, quindi il DOM è già pronto: montiamo
  // subito. Il ramo su DOMContentLoaded copre il caso in cui qualcuno sposti il
  // tag nell'<head>.
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', montaShell);
  else montaShell();
})();

// ---------------------------------------------------------------------------
// Riempimento con i dati reali. Va chiamata dopo avviaSessione(), da ogni pagina.
// ---------------------------------------------------------------------------
function popolaSidebar(sessione, supabaseClient) {
  if (!sessione) return;
  const { session, profilo } = sessione;
  const cliente = (profilo && profilo.clienti) || {};
  const nomeCliente = cliente.nome || '—';
  const nomeUtente = (profilo && profilo.nome_completo) || (session.user.email || '').split('@')[0] || '—';

  const iniziali = nomeUtente
    .split(/[\s.]+/).filter(Boolean).slice(0, 2)
    .map(p => p[0]).join('').toUpperCase() || '—';

  const tenant = document.getElementById('sidebar-tenant');
  if (tenant) {
    tenant.querySelector('.avatar').textContent = (nomeCliente[0] || '—').toUpperCase();
    tenant.querySelector('.meta strong').textContent = nomeCliente;
    tenant.querySelector('.meta span').textContent = cliente.editore_proprio
      ? `editore proprio: ${cliente.editore_proprio}` : '';
    tenant.title = nomeCliente;
  }

  const utente = document.getElementById('sidebar-utente');
  if (utente) {
    utente.querySelector('.av').textContent = iniziali;
    utente.querySelector('.info strong').textContent = nomeUtente;
    // niente zona: profili non ce l'ha (vedi HANDOFF.md §9.2)
    utente.querySelector('.info span').textContent = (profilo && profilo.ruolo) || '';
    utente.title = session.user.email || '';
  }

  const esci = document.getElementById('sidebar-esci');
  if (esci && supabaseClient) {
    esci.addEventListener('click', async () => {
      await supabaseClient.auth.signOut();
      window.location.href = 'login.html';
    });
  }

  // Ogni voce a pacchetto (punto D) esiste solo per i clienti che l'hanno inclusa
  const VOCI_A_PACCHETTO = {
    offerta: 'offerta_formativa_inclusa',
    confronto: 'confronto_manuali_incluso',
    analisi: 'analisi_programma_incluso',
    piano: 'piano_promozione_incluso',
  };
  Object.keys(VOCI_A_PACCHETTO).forEach((id) => {
    if (!cliente[VOCI_A_PACCHETTO[id]]) {
      const voce = document.querySelector(`.nav-voce[data-voce="${id}"]`);
      if (voce) voce.remove();
    }
  });

  // Il pannello utenti (punto C) è riservato al gestore
  if (!profilo || profilo.ruolo !== 'gestore') {
    const voceUtenti = document.querySelector('.nav-voce[data-voce="utenti"]');
    if (voceUtenti) voceUtenti.remove();
  }

  // Il breadcrumb di ogni pagina ha uno slot per il nome cliente
  document.querySelectorAll('#crumb-cliente').forEach(el => { el.textContent = nomeCliente; });
}
