/* Direzione A — sidebar comune.
   Uso:  <script src="shell.js" data-attiva="analisi"></script>
   Voci disponibili: offerta | confronto | analisi | piano | catalogo
   Emette anche l'user-chip e il selettore tenant fittizio. */

(function () {
  const CURRENT = document.currentScript.dataset.attiva || '';

  const voci = [
    { id: 'offerta',   dot: 'var(--voce-offerta)',   href: 'A-offerta-formativa.html', titolo: 'Offerta formativa', sotto: 'Insegnamenti, lauree' },
    { id: 'confronto', dot: 'var(--voce-confronto)', href: 'A-confronto.html',         titolo: 'Confronto manuali', sotto: 'Un framework, più testi' },
    { id: 'analisi',   dot: 'var(--voce-analisi)',   href: 'A-analisi-programma.html', titolo: 'Analisi programma', sotto: 'Un programma vs manuali' },
    { id: 'piano',     dot: 'var(--voce-piano)',     href: 'A-piano-promozione.html',  titolo: 'Piano di promozione', sotto: 'Campagne su target' },
  ];
  const rif = [
    { id: 'catalogo',  dot: 'var(--voce-utilita)',   href: 'A-catalogo.html',          titolo: 'Catalogo', sotto: 'Manuali & framework' },
  ];

  function nav(v) {
    const on = v.id === CURRENT;
    return `<a class="nav-voce ${on ? 'attivo' : ''}"
              style="--dot: ${v.dot}"
              href="${v.href}"
              ${on ? 'aria-current="page"' : ''}>
              <span class="dot"></span>
              <span>
                <strong>${v.titolo}</strong>
                <span>${on ? 'Sei qui' : v.sotto}</span>
              </span>
            </a>`;
  }

  const html = `
    <div class="brand">
      <a href="A-home.html" style="text-decoration:none; color:inherit; display:inline-flex; align-items:baseline; gap:8px;">
        <span class="logo">Atlante<em>.</em></span>
      </a>
      <span class="badge-prod">v2</span>
    </div>

    <div class="tenant" title="Cambia editore">
      <span class="avatar">Z</span>
      <span class="meta"><strong>Zanichelli</strong><span>Editore proprio</span></span>
      <span class="caret">▾</span>
    </div>

    <div class="side-label">Aree di lavoro</div>
    ${voci.map(nav).join('')}

    <div class="side-label">Riferimento</div>
    ${rif.map(nav).join('')}

    <div class="user-chip">
      <span class="av">SS</span>
      <span class="info"><strong>Sergio Sartini</strong><span>promotore · Nord-Ovest</span></span>
    </div>
  `;

  document.addEventListener('DOMContentLoaded', () => {
    const s = document.getElementById('sidebar');
    if (s) s.innerHTML = html;
    document.body.classList.add('a-shell');
  });
})();
