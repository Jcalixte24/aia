/* eclipse.js : fenêtre immersive « Éclipse » (module chargé à la demande par le bouton de la page).
   Choisit tout seul l'éclipse la plus proche de la date du jour (catalogue NASA dans eclipse-core.js),
   calcule les circonstances locales de n'importe quelle ville et les montre en 3D (Soleil/Lune vus du sol,
   globe avec bande de centralité), avec compte à rebours, explications et simulateurs. */
import * as THREE from 'three';

const ECL = window.ECL;
const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
const esc = t => String(t == null ? '' : t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const D2R = Math.PI / 180, clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

/* ---------- lieux ---------- */
const CI = 'Côte d’Ivoire', GG = 'Golfe de Guinée et alentours', WW = 'Ailleurs dans le monde';
const PLACES = [
  { g: CI, n: 'Abidjan', lat: 5.3600, lon: -4.0083, tz: 'Africa/Abidjan' }, { g: CI, n: 'Grand-Bassam', lat: 5.2118, lon: -3.7388, tz: 'Africa/Abidjan' },
  { g: CI, n: 'Aboisso', lat: 5.4678, lon: -3.2072, tz: 'Africa/Abidjan' }, { g: CI, n: 'Dabou', lat: 5.3250, lon: -4.3770, tz: 'Africa/Abidjan' },
  { g: CI, n: 'San-Pédro', lat: 4.7485, lon: -6.6363, tz: 'Africa/Abidjan' }, { g: CI, n: 'Sassandra', lat: 4.9500, lon: -6.0833, tz: 'Africa/Abidjan' },
  { g: CI, n: 'Divo', lat: 5.8372, lon: -5.3572, tz: 'Africa/Abidjan' }, { g: CI, n: 'Gagnoa', lat: 6.1319, lon: -5.9506, tz: 'Africa/Abidjan' },
  { g: CI, n: 'Abengourou', lat: 6.7297, lon: -3.4964, tz: 'Africa/Abidjan' }, { g: CI, n: 'Yamoussoukro', lat: 6.8276, lon: -5.2893, tz: 'Africa/Abidjan' },
  { g: CI, n: 'Daloa', lat: 6.8774, lon: -6.4502, tz: 'Africa/Abidjan' }, { g: CI, n: 'Bouaké', lat: 7.6906, lon: -5.0303, tz: 'Africa/Abidjan' },
  { g: CI, n: 'Man', lat: 7.4125, lon: -7.5538, tz: 'Africa/Abidjan' }, { g: CI, n: 'Séguéla', lat: 7.9611, lon: -6.6731, tz: 'Africa/Abidjan' },
  { g: CI, n: 'Bondoukou', lat: 8.0402, lon: -2.8000, tz: 'Africa/Abidjan' }, { g: CI, n: 'Korhogo', lat: 9.4580, lon: -5.6297, tz: 'Africa/Abidjan' },
  { g: CI, n: 'Ferkessédougou', lat: 9.5928, lon: -5.1944, tz: 'Africa/Abidjan' }, { g: CI, n: 'Odienné', lat: 9.5051, lon: -7.5645, tz: 'Africa/Abidjan' },
  { g: GG, n: 'Accra (Ghana)', lat: 5.5560, lon: -0.1969, tz: 'Africa/Accra' }, { g: GG, n: 'Lomé (Togo)', lat: 6.1319, lon: 1.2228, tz: 'Africa/Lome' },
  { g: GG, n: 'Cotonou (Bénin)', lat: 6.3703, lon: 2.3912, tz: 'Africa/Porto-Novo' }, { g: GG, n: 'Lagos (Nigeria)', lat: 6.5244, lon: 3.3792, tz: 'Africa/Lagos' },
  { g: GG, n: 'Ouagadougou (Burkina)', lat: 12.3714, lon: -1.5197, tz: 'Africa/Ouagadougou' }, { g: GG, n: 'Bamako (Mali)', lat: 12.6392, lon: -8.0029, tz: 'Africa/Bamako' },
  { g: GG, n: 'Conakry (Guinée)', lat: 9.6412, lon: -13.5784, tz: 'Africa/Conakry' }, { g: GG, n: 'Dakar (Sénégal)', lat: 14.6928, lon: -17.4467, tz: 'Africa/Dakar' },
  { g: WW, n: 'Paris', lat: 48.8566, lon: 2.3522, tz: 'Europe/Paris' }, { g: WW, n: 'Le Caire', lat: 30.0444, lon: 31.2357, tz: 'Africa/Cairo' },
  { g: WW, n: 'Buenos Aires', lat: -34.6037, lon: -58.3816, tz: 'America/Argentina/Buenos_Aires' }, { g: WW, n: 'Santiago du Chili', lat: -33.4489, lon: -70.6693, tz: 'America/Santiago' }
];

/* ---------- formats ---------- */
const fT = (d, tz, sec) => new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', ...(sec ? { second: '2-digit' } : {}), hourCycle: 'h23', timeZone: tz }).format(d);
const fD = (d, tz) => new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: tz }).format(d);
const fDs = (d, tz) => new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: tz }).format(d);
const dur = s => s >= 60 ? `${Math.floor(s / 60)} min ${String(Math.round(s % 60)).padStart(2, '0')} s` : `${Math.round(s)} s`;
const pc = x => `${(x * 100).toFixed(x >= 0.995 ? 0 : 1).replace('.', ',')} %`;
const de = n => /^[AEIOUYÉÈÊÀÂÎÔÛH]/i.test(n) ? 'd’' + n : 'de ' + n;
const cardinal = a => ['nord', 'nord-est', 'est', 'sud-est', 'sud', 'sud-ouest', 'ouest', 'nord-ouest'][Math.round(a / 45) % 8];

/* ---------- état ---------- */
const S = { entry: null, place: PLACES[0], r: null, T: 0, t0: 0, t1: 0, playing: false, speed: 240, filter: true, orient: true, live: false, userSeek: false };
let root = null, built = false, openFlag = false, sky = null, globe = null, tickId = 0, lastFocus = null;

/* ---------- facts propres à certaines éclipses (sources : NASA / Wikipédia) ---------- */
const FACTS = {
  '2027-02-06': [
    ['Maximum mondial', '16 h 00 min 48 s UTC, au large de l’Uruguay et du Brésil (31° S, 48° O)'],
    ['Durée maximale de l’anneau', '7 min 51 s'], ['Largeur maximale de la bande', '282 km'],
    ['Magnitude maximale', '0,928 : la Lune cache 92,8 % du diamètre du Soleil'],
    ['Pourquoi un anneau ?', 'La Lune était à l’apogée le 3 février, soit 3 jours plus tôt : elle paraît petite et ne couvre pas tout le Soleil'],
    ['Série', 'Saros 131, 51e éclipse sur 70']
  ]
};

/* ============================================================
   CONSTRUCTION DE LA FENÊTRE
   ============================================================ */
function build() {
  if (built) return; built = true;
  root = document.createElement('div');
  root.id = 'ecl'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-label', 'Tout savoir sur la prochaine éclipse');
  root.setAttribute('data-lenis-prevent', '');
  root.innerHTML = `
  <button class="ecl-x" id="ecl-x" aria-label="Fermer la fenêtre éclipse">×</button>
  <div class="ecl-scroll" id="ecl-sc">
    <header class="ecl-top ew">
      <div class="ey" id="ecl-ey">Prochaine éclipse</div>
      <h2 id="ecl-title"></h2>
      <div class="sub" id="ecl-sub"></div>
      <div id="ecl-badge"></div>
      <div class="cdw" id="ecl-cd" aria-live="off"></div>
      <div class="cdl" id="ecl-cdl"></div>
      <div class="ecl-ctl">
        <select id="ecl-place" aria-label="Choisir une ville"></select>
        <button class="btn ghost" id="ecl-geo" type="button">Me localiser</button>
        <button class="btn ghost" id="ecl-share" type="button">Copier le lien</button>
      </div>
    </header>
    <nav class="ecl-nav" id="ecl-nav" aria-label="Sections de la fenêtre">
      <button data-go="s-sky" class="on">Vue du ciel</button><button data-go="s-info">Chiffres</button><button data-go="s-where">Villes</button><button data-go="s-globe">Vue de l’espace</button>
      <button data-go="s-learn">Comprendre</button><button data-go="s-safe">Sécurité</button><button data-go="s-next">Autres éclipses</button>
    </nav>

    <section class="ecl-sec" id="s-sky"><div class="ew">
      <h3 id="ecl-h-sky">Vue depuis ta ville</h3>
      <p class="lead2" id="ecl-sky-lead"></p>
      <div class="stage3" id="ecl-stage">
        <canvas id="eclsky" aria-label="Simulation 3D de l’éclipse"></canvas>
        <div class="hud"><div class="pl" id="hud-pl"></div><div class="tm" id="hud-tm"></div><div class="ph" id="hud-ph"></div></div>
        <div class="hud2"><div><b id="hud-ob">0 %</b><span id="hud-obl">DU SOLEIL CACHÉ</span></div><div><b id="hud-alt" style="font-size:clamp(20px,3vw,34px);color:var(--ink)">0°</b><span id="hud-altl">HAUTEUR DU SOLEIL</span></div></div>
        <div class="warn3" id="hud-warn"></div>
        <div class="tools3">
          <div class="trk"><div id="ecl-mk"></div><input type="range" id="ecl-slider" min="0" max="1000" value="0" aria-label="Faire défiler l’éclipse dans le temps"></div>
          <div class="row3">
            <div class="grp"><button class="pill play" id="ecl-play" aria-label="Lecture">▶</button><button class="pill" data-sp="60">×60</button><button class="pill on" data-sp="240">×240</button><button class="pill" data-sp="900">×900</button><button class="pill" id="ecl-tomax">Aller au maximum</button></div>
            <div class="grp" id="ecl-opts"></div>
          </div>
          <div class="note3" id="ecl-note3"></div>
        </div>
      </div>
    </div></section>

    <section class="ecl-sec" id="s-info" style="padding-top:20px"><div class="ew">
      <h3>Les chiffres chez toi</h3>
      <div class="kc" id="ecl-cards"></div>
      <div class="verdict" id="ecl-verdict"></div>
    </div></section>

    <section class="ecl-sec" id="s-where"><div class="ew">
      <h3>Heure, pourcentage et durée, ville par ville</h3>
      <p class="lead2" id="ecl-where-lead"></p>
      <div class="tw"><table class="ct" id="ecl-table"></table></div>
      <p class="ctn" id="ecl-ctn"></p>
    </div></section>

    <section class="ecl-sec" id="s-globe"><div class="ew">
      <h3>Vue de l’espace</h3>
      <div class="g3">
        <div class="g3w" id="ecl-gw"><canvas id="eclglobe" aria-label="Globe terrestre avec la trajectoire de l’ombre"></canvas></div>
        <div class="g3t"><p id="ecl-globe-lead"></p><ul id="ecl-globe-li"></ul>
          <div class="row3" style="margin-top:16px;justify-content:flex-start"><button class="pill on" id="g-follow">Suivre l’ombre</button><button class="pill" id="g-me">Revenir à ma ville</button></div></div>
      </div>
    </div></section>

    <section class="ecl-sec" id="s-learn"><div class="ew">
      <h3>Comprendre l’éclipse en 2 minutes</h3>
      <p class="lead2" id="ecl-learn-lead"></p>
      <div class="lr" id="ecl-learn"></div>
      <div class="dg"><div class="tabs" id="dg-tabs"></div><div id="dg-svg"></div><p class="cap" id="dg-cap"></p></div>
      <div class="sim">
        <canvas id="simc" width="360" height="360" aria-label="Simulateur : taille apparente de la Lune et du Soleil"></canvas>
        <div><h4>À toi de jouer : éloigne ou rapproche la Lune</h4>
          <p>La Lune tourne autour de la Terre sur une orbite ovale. Déplace-la et regarde ce que devient l’éclipse.</p>
          <input type="range" id="sim-r" min="356400" max="406700" step="100" aria-label="Distance de la Lune en kilomètres">
          <div class="res" id="sim-res"></div><p id="sim-txt"></p>
          <div class="pr"><button class="pill" data-d="356400">Périgée (la plus proche)</button><button class="pill" data-d="406700">Apogée (la plus loin)</button><button class="pill" id="sim-day">Le jour de l’éclipse</button></div>
        </div>
      </div>
    </div></section>

    <section class="ecl-sec" id="s-safe"><div class="ew">
      <h3>Observer sans se brûler les yeux</h3>
      <p class="lead2">Une éclipse de Soleil est magnifique et dangereuse : la rétine n’a pas de nerfs de la douleur, les dégâts sont silencieux et définitifs.</p>
      <div class="sf">
        <ul id="ecl-safe"></ul>
        <div class="chk"><h4>Ma checklist avant le jour J</h4><div id="ecl-chk"></div><div class="rs" id="ecl-chk-rs"></div></div>
      </div>
    </div></section>

    <section class="ecl-sec" id="s-next"><div class="ew">
      <h3>Les prochaines éclipses</h3>
      <p class="lead2">Le catalogue se met à jour tout seul avec la date : clique sur une éclipse pour la découvrir.</p>
      <div class="un" id="ecl-un"></div>
    </div></section>

    <section class="ecl-sec" id="s-src"><div class="ew">
      <h3>Sources et précision</h3>
      <div class="srcl" id="ecl-src"></div>
    </div></section>
    <div class="ecl-end ew"><button class="btn solid" id="ecl-close2" type="button">Retour au site de l’AIA</button></div>
  </div>`;
  document.body.appendChild(root);

  $('#ecl-x').onclick = $('#ecl-close2').onclick = () => close();
  $('#ecl-nav').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; $('#' + b.dataset.go).scrollIntoView({ behavior: 'smooth', block: 'start' }); });
  $('#ecl-sc').addEventListener('scroll', navSpy, { passive: true });
  $('#ecl-place').addEventListener('change', e => { const p = PLACES.find(x => x.n === e.target.value); if (p) setPlace(p); });
  $('#ecl-geo').onclick = locate;
  $('#ecl-share').onclick = () => { const u = location.origin + location.pathname + '#eclipse'; (navigator.clipboard ? navigator.clipboard.writeText(u) : Promise.reject()).then(() => toast('Lien copié.'), () => toast(u)); };
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && openFlag) close(); });
  window.addEventListener('popstate', () => { if (openFlag && location.hash !== '#eclipse') close(true); });
  $('#ecl-slider').addEventListener('input', e => { S.T = S.t0 + (S.t1 - S.t0) * (e.target.value / 1000); S.playing = false; S.userSeek = true; $('#ecl-play').textContent = '▶'; });
  $('#ecl-play').onclick = () => { S.playing = !S.playing; S.userSeek = true; $('#ecl-play').textContent = S.playing ? '❚❚' : '▶'; if (S.playing && S.T >= S.t1 - 1000) S.T = S.t0; };
  $$('[data-sp]').forEach(b => b.onclick = () => { S.speed = +b.dataset.sp; $$('[data-sp]').forEach(x => x.classList.toggle('on', x === b)); });
  $('#ecl-tomax').onclick = () => { S.T = S.r.dateMax.getTime(); S.playing = false; S.userSeek = true; $('#ecl-play').textContent = '▶'; };
  $('#g-follow').onclick = e => { globe && (globe.follow = !globe.follow); e.currentTarget.classList.toggle('on', globe && globe.follow); };
  $('#g-me').onclick = () => { globe && globe.focusPlace(); };
}

let toastEl;
function toast(m) { if (!toastEl) { toastEl = document.createElement('div'); toastEl.style.cssText = 'position:fixed;left:50%;bottom:26px;transform:translateX(-50%);z-index:300;padding:12px 20px;border-radius:999px;background:#141C45;border:1px solid #F5A623;color:#EAF0FF;font:600 14px Open Sans,sans-serif;opacity:0;transition:.3s;pointer-events:none;max-width:90vw;text-align:center'; document.body.appendChild(toastEl); } toastEl.textContent = m; toastEl.style.opacity = 1; clearTimeout(toast.t); toast.t = setTimeout(() => toastEl.style.opacity = 0, 2600); }

function navSpy() {
  const sc = $('#ecl-sc'), ids = ['s-sky', 's-info', 's-where', 's-globe', 's-learn', 's-safe', 's-next'];
  let cur = ids[0]; ids.forEach(id => { if ($('#' + id).getBoundingClientRect().top < innerHeight * 0.4) cur = id; });
  $$('#ecl-nav button').forEach(b => b.classList.toggle('on', b.dataset.go === cur));
}

/* ============================================================
   OUVERTURE / FERMETURE
   ============================================================ */
export function open(entryId) {
  build();
  lastFocus = document.activeElement;
  const lat = S.place.lat, lon = S.place.lon;
  const entry = entryId ? ECL.CATALOG.find(c => c.id === entryId) : (ECL.nextEclipse(Date.now(), lat, lon) || {}).c;
  if (!entry) { toast('Aucune éclipse dans le catalogue pour le moment.'); return; }
  S.entry = entry; S.userSeek = false; S.playing = false;
  root.classList.add('on'); openFlag = true;
  document.body.style.overflow = 'hidden'; if (window.AIA_LENIS) window.AIA_LENIS.stop();
  if (location.hash !== '#eclipse') history.pushState({ eclipse: 1 }, '', '#eclipse');
  fillPlaceSelect(); renderAll();
  $('#ecl-sc').scrollTop = 0;
  setTimeout(() => $('#ecl-x').focus(), 400);
  startTick();
}
export function close(fromPop) {
  if (!openFlag) return;
  openFlag = false; root.classList.remove('on');
  document.body.style.overflow = ''; if (window.AIA_LENIS) window.AIA_LENIS.start();
  if (!fromPop && location.hash === '#eclipse') history.back();
  stopScenes(); clearInterval(tickId);
  if (lastFocus && lastFocus.focus) lastFocus.focus();
}

function fillPlaceSelect() {
  const sel = $('#ecl-place'); let h = '', g = '';
  PLACES.forEach(p => { if (p.g !== g) { if (g) h += '</optgroup>'; h += `<optgroup label="${esc(p.g)}">`; g = p.g; } h += `<option value="${esc(p.n)}"${p.n === S.place.n ? ' selected' : ''}>${esc(p.n)}</option>`; });
  if (S.place.custom) h = `<optgroup label="Position"><option value="${esc(S.place.n)}" selected>${esc(S.place.n)}</option></optgroup>` + h + '</optgroup>'; else h += '</optgroup>';
  sel.innerHTML = h;
}
function setPlace(p) { S.place = p; S.userSeek = false; renderAll(true); }
function locate() {
  if (!navigator.geolocation) { toast('La localisation n’est pas disponible sur cet appareil.'); return; }
  toast('Localisation en cours…');
  navigator.geolocation.getCurrentPosition(pos => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    setPlace({ g: 'Position', n: 'Ma position', lat: pos.coords.latitude, lon: pos.coords.longitude, tz, custom: true }); fillPlaceSelect();
  }, () => toast('Impossible de te localiser : autorise la localisation ou choisis une ville.'), { enableHighAccuracy: true, timeout: 12000 });
}

/* ============================================================
   RENDU DES TEXTES
   ============================================================ */
function sunsetOf(E, p, r) {
  /* instant (ms) où le Soleil passe sous l'horizon pendant l'éclipse, ou null */
  const a = r.c1.date.getTime(), b = r.c4.date.getTime() + 1800e3;
  const alt = ms => ECL.at(E, (ms - E.epochUT) / 3600e3, p.lat, p.lon).alt;
  if (alt(a) < -0.833) return { ms: a, before: true };
  if (alt(b) > -0.833) return null;
  let lo = a, hi = b; for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (alt(m) > -0.833) lo = m; else hi = m; }
  return { ms: (lo + hi) / 2, before: false };
}

function renderAll(placeOnly) {
  const e = S.entry, p = S.place, tz = p.tz;
  S.r = e.kind === 'solar' ? ECL.solarLocal(e.e, p.lat, p.lon) : ECL.lunarLocal(e, p.lat, p.lon);
  const r = S.r, solar = e.kind === 'solar';
  S.sunset = solar && r.visible ? sunsetOf(e.e, p, r) : null;

  /* fenêtre de temps du curseur */
  if (solar) { if (r.visible) { S.t0 = r.c1.date.getTime() - 8 * 60e3; S.t1 = r.c4.date.getTime() + 8 * 60e3; } else { S.t0 = r.dateMax.getTime() - 100 * 60e3; S.t1 = r.dateMax.getTime() + 100 * 60e3; } }
  else { const half = (e.partialMin ? e.partialMin * 30000 : 135 * 60e3); S.t0 = e.greatest - half - 35 * 60e3; S.t1 = e.greatest + half + 35 * 60e3; lunarParams(); }
  const now = Date.now(); S.live = now >= S.t0 && now <= S.t1;
  if (!S.userSeek) S.T = S.live ? now : r.dateMax.getTime();
  S.T = clamp(S.T, S.t0, S.t1);

  $('#ecl-ey').textContent = e.kind === 'solar' ? 'Éclipse de Soleil' : 'Éclipse de Lune';
  $('#ecl-title').textContent = ECL.title(e).replace(/^Éclipse /, 'Éclipse ');
  $('#ecl-sub').textContent = `${fD(r.dateMax, tz)} · ${p.n}`;
  const sum = ECL.summary(e, p.lat, p.lon);
  $('#ecl-badge').innerHTML = `<span class="badge-v${sum.notable ? '' : ' no'}"><i></i>${esc(p.n)} : ${esc(sum.label)}</span>`;
  const days = Math.ceil((r.dateMax.getTime() - now) / 864e5);
  $('#ecl-h-sky').textContent = solar ? `Le ciel ${de(p.n)} pendant l’éclipse` : `La Lune vue ${de(p.n)}`;
  $('#ecl-sky-lead').innerHTML = skyLead(e, r, p, days);
  buildOptions(); renderCards(); renderWhere(); renderLearn(); renderSafety(); renderNext(); renderSources(); renderMarkers();
  rebuildStage(); rebuildGlobe(); updateCountdown();
  $('#ecl-where-lead').textContent = solar ? 'Chaque ligne est calculée pour la ville : clique sur une ville pour voir son ciel en 3D.' : 'Les heures sont celles de la ville. Clique sur une ville pour voir si la Lune est au-dessus de l’horizon.';
  $('#ecl-nav button.on') || $$('#ecl-nav button')[0].classList.add('on');
}

function skyLead(e, r, p, days) {
  if (e.kind === 'lunar') {
    return `Fais glisser la scène pour zoomer, ou lance la lecture : l’ombre de la Terre traverse la Lune. ${r.moonUp ? 'Depuis ' + esc(p.n) + ', la Lune est au-dessus de l’horizon au maximum.' : 'Attention : depuis ' + esc(p.n) + ' la Lune est sous l’horizon au maximum.'}`;
  }
  if (!r.visible) return `Depuis ${esc(p.n)}, le disque de la Lune ne touche pas le Soleil : l’éclipse n’est pas visible ici. Choisis une autre ville pour voir où elle s’observe.`;
  const kind = r.annular ? 'un anneau de feu' : r.total ? 'une totalité' : 'une éclipse partielle';
  return `Fais défiler le temps avec le curseur ou lance la lecture. Tu verras exactement ce que verraient tes yeux, protégés par des lunettes, depuis ${esc(p.n)} : ${kind}, avec ${pc(r.max.obsc)} du disque solaire caché au maximum.`;
}

function centralRange(E, lat, lon) {
  let mn = 1e9, mx = 0, lost = false;
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, q = ECL.solarLocal(E, lat + Math.sin(a) * .05, lon + Math.cos(a) * .05); if (q.central) { mn = Math.min(mn, q.centralSeconds); mx = Math.max(mx, q.centralSeconds); } else lost = true; }
  return { mn, mx, lost, ok: mx > 0 };
}
function rangeNote(E, p, r) {
  if (!r.central) return '';
  const q = centralRange(E, p.lat, p.lon); if (!q.ok) return '';
  return ` À quelques kilomètres près, la durée change : ${dur(q.mn)} à ${dur(q.mx)} selon le quartier${q.lost ? ', et l’anneau disparaît sur le bord de la bande (l’éclipse n’y est plus que partielle)' : ''}.`;
}
function renderCards() {
  const e = S.entry, r = S.r, tz = S.place.tz, solar = e.kind === 'solar', c = [];
  const K = (l, v, s, g) => `<div class="kcd"><small>${l}</small><b${g ? ' class="g"' : ''}>${v}</b><span>${s || ''}</span></div>`;
  if (solar && r.visible) {
    const ss = S.sunset;
    c.push(K('Début', fT(r.c1.date, tz, true), 'premier contact' + (ss && ss.before ? ' (Soleil déjà couché)' : '')));
    c.push(K('Maximum', fT(r.dateMax, tz, true), 'heure locale', true));
    const endv = ss && !ss.before ? `${fT(new Date(ss.ms), tz)} (coucher)` : fT(r.c4.date, tz, true);
    c.push(K('Fin visible', endv, ss && !ss.before ? 'le Soleil se couche avant la fin de l’éclipse' : 'dernier contact'));
    c.push(K('Soleil caché', pc(r.max.obsc), 'de la surface du disque', true));
    c.push(K('Magnitude', r.max.mag.toFixed(3).replace('.', ','), 'part du diamètre couverte'));
    if (r.central) c.push(K(r.annular ? 'Anneau de feu' : 'Totalité', dur(r.centralSeconds), 'de ' + fT(r.c2.date, tz, true) + ' à ' + fT(r.c3.date, tz, true) + (() => { const q = centralRange(S.entry.e, S.place.lat, S.place.lon); return q.ok && q.mx - q.mn > 20 ? ' · selon le quartier : ' + dur(q.mn) + ' à ' + dur(q.mx) : ''; })(), true));
    c.push(K('Soleil au maximum', r.max.alt.toFixed(1).replace('.', ',') + '°', 'au-dessus de l’horizon, plein ' + cardinal(r.max.az) + ' (' + Math.round(r.max.az) + '°)'));
    c.push(K('Durée de l’éclipse', Math.round((r.c4.date - r.c1.date) / 60e3) + ' min', 'du premier au dernier contact'));
  } else if (!solar) {
    const gl = e.greatest;
    if (r.u1) c.push(K('Entrée dans l’ombre', fT(r.u1, tz), 'début de la phase partielle'));
    c.push(K('Maximum', fT(new Date(gl), tz, true), 'heure locale', true));
    if (r.u4) c.push(K('Sortie de l’ombre', fT(r.u4, tz), 'fin de la phase partielle'));
    c.push(K('Magnitude', e.umbral.toFixed(3).replace('.', ','), e.umbral > 1 ? 'la Lune est entièrement dans l’ombre' : e.umbral > 0 ? 'part du diamètre lunaire dans l’ombre' : 'seule la pénombre touche la Lune'));
    if (r.u2) c.push(K('Totalité', Math.round(e.totalMin) + ' min', 'de ' + fT(r.u2, tz) + ' à ' + fT(r.u3, tz), true));
    c.push(K('Lune au maximum', r.max.alt.toFixed(0) + '°', r.max.alt > 0 ? 'au-dessus de l’horizon' : 'sous l’horizon, invisible d’ici'));
  } else {
    c.push(K('Maximum (à ' + esc(S.place.n) + ')', fT(r.dateMax, tz), 'le Soleil n’est pas touché'));
  }
  $('#ecl-cards').innerHTML = c.join('');
  $('#ecl-verdict').className = 'verdict' + (ECL.summary(e, S.place.lat, S.place.lon).notable ? '' : ' no');
  $('#ecl-verdict').innerHTML = verdict(e, r);
}

function verdict(e, r) {
  const p = esc(S.place.n);
  if (e.kind === 'lunar') {
    if (e.umbral <= 0) return `<b>Éclipse par la pénombre.</b> La Lune s’assombrit à peine : on ne la remarque presque pas à l’œil nu.`;
    const v = r.moonUp ? `La Lune est haute dans le ciel de ${p} : <b>elle est observable sans aucune protection</b>, à l’œil nu, aux jumelles ou au télescope.` : `Au maximum, la Lune est <b>sous l’horizon de ${p}</b>. Choisis une autre ville pour voir où elle est visible.`;
    return v + ' Contrairement au Soleil, regarder une éclipse de Lune est sans danger.';
  }
  if (!r.visible) return `<b>Non visible depuis ${p}.</b> ${e.zones ? 'Elle se voit surtout depuis : ' + esc(e.zones) + '.' : 'Regarde le globe 3D pour voir où passe l’ombre.'}`;
  const ss = S.sunset;
  if (r.annular) return `<b>Anneau de feu observable depuis ${p} !</b> Le Soleil se transforme en anneau pendant <b>${dur(r.centralSeconds)}</b> vers <b>${fT(r.dateMax, S.place.tz)}</b>, avec ${pc(r.max.obsc)} du Soleil caché.${rangeNote(e.e, S.place, r)} ${ss ? 'Le Soleil est très bas (' + r.max.alt.toFixed(0) + '° au-dessus de l’horizon, plein ' + cardinal(r.max.az) + ') et se couche pendant l’éclipse : cherche un horizon ouest dégagé.' : ''}`;
  if (r.total) return `<b>Éclipse totale depuis ${p} !</b> Le jour devient nuit pendant <b>${dur(r.centralSeconds)}</b> vers <b>${fT(r.dateMax, S.place.tz)}</b>. Seule cette phase se regarde sans protection.`;
  const share = r.max.obsc < 0.1 ? 'Très discrète : à peine une petite morsure sur le Soleil.' : r.max.obsc < 0.5 ? 'Une belle « morsure » sur le disque solaire.' : 'Le Soleil devient un croissant.';
  return `<b>Éclipse partielle depuis ${p} :</b> ${pc(r.max.obsc)} du Soleil est caché au maximum, vers <b>${fT(r.dateMax, S.place.tz)}</b>. ${share} ${ss ? 'Le Soleil se couche pendant l’éclipse.' : ''}`;
}

function renderWhere() {
  const e = S.entry, solar = e.kind === 'solar', list = PLACES.filter(p => p.g !== WW || true);
  let h = '<thead><tr><th>Ville</th>' + (solar ? '<th>Début</th><th>Maximum</th><th>Fin</th><th>Soleil caché</th><th>Anneau / totalité</th><th>Soleil (hauteur)</th>' : '<th>Entrée ombre</th><th>Maximum</th><th>Sortie ombre</th><th>Magnitude</th><th>Lune (hauteur)</th><th>Visible ?</th>') + '</tr></thead><tbody>';
  list.forEach(p => {
    const r = solar ? ECL.solarLocal(e.e, p.lat, p.lon) : ECL.lunarLocal(e, p.lat, p.lon), tz = p.tz, sel = p.n === S.place.n ? ' class="sel"' : '';
    if (solar) {
      if (!r.visible) { h += `<tr data-p="${esc(p.n)}"${sel}><td>${esc(p.n)}</td><td colspan="6" style="color:var(--ink-dim)">Pas d’éclipse visible depuis cette ville</td></tr>`; return; }
      const set = r.max.alt < -0.8 || (r.c1.s.alt < -0.8 && !r.sunAbove);
      const ssn = sunsetOf(e.e, p, r), endTxt = ssn && !ssn.before ? `<span title="Le Soleil se couche avant la fin de l’éclipse">${fT(new Date(ssn.ms), tz)} ☾</span>` : fT(r.c4.date, tz);
      h += `<tr data-p="${esc(p.n)}"${sel}><td>${esc(p.n)}</td><td>${fT(r.c1.date, tz)}</td><td>${fT(r.dateMax, tz, true)}</td><td>${endTxt}</td>` +
        `<td><span class="bar" style="width:${Math.round(r.max.obsc * 70)}px"></span>${pc(r.max.obsc)}</td>` +
        `<td>${r.central ? `<span class="tg2 g">${r.annular ? 'Anneau' : 'Totalité'} ${dur(r.centralSeconds)}</span>` : '<span class="tg2">Partielle</span>'}</td>` +
        `<td>${set ? '<span style="color:#ff9b8a">Soleil couché</span>' : r.max.alt.toFixed(1).replace('.', ',') + '°'}</td></tr>`;
    } else {
      h += `<tr data-p="${esc(p.n)}"${sel}><td>${esc(p.n)}</td><td>${r.u1 ? fT(r.u1, tz) : '—'}</td><td>${fT(r.dateMax, tz)}</td><td>${r.u4 ? fT(r.u4, tz) : '—'}</td><td>${e.umbral.toFixed(2).replace('.', ',')}</td><td>${r.max.alt.toFixed(0)}°</td><td>${r.moonUp ? '<span class="tg2 g">Oui</span>' : '<span class="tg2">Lune basse ou couchée</span>'}</td></tr>`;
    }
  });
  $('#ecl-table').innerHTML = h + '</tbody>';
  $$('#ecl-table tbody tr').forEach(tr => tr.onclick = () => { const p = PLACES.find(x => x.n === tr.dataset.p); if (p) { setPlace(p); fillPlaceSelect(); $('#s-sky').scrollIntoView({ behavior: 'smooth' }); } });
  $('#ecl-ctn').textContent = solar ? 'Heures locales de chaque ville. ☾ = le Soleil se couche avant la fin de l’éclipse : c’est l’heure du coucher qui compte. Près du bord de la bande d’annularité, l’anneau est plus court : quelques kilomètres changent tout.' : 'Heures locales de chaque ville.';
}

/* ---------- éléments d'apprentissage ---------- */
function renderLearn() {
  const e = S.entry, solar = e.kind === 'solar', y = new Date(e.kind === 'solar' ? e.e.epochUT : e.greatest).getUTCFullYear();
  const facts = FACTS[e.date];
  $('#ecl-learn-lead').textContent = solar ? 'Tout ce qu’il faut savoir pour comprendre ce que tu vas voir.' : 'Les éclipses de Lune sont les plus faciles à observer : aucun matériel, aucun danger.';
  const cards = [
    ['1', 'Qu’est-ce qu’une éclipse ?', 'Une éclipse est un jeu d’ombres : le Soleil, la Lune et la Terre s’alignent presque parfaitement. Quand la Lune passe devant le Soleil, c’est une éclipse de Soleil. Quand la Terre passe entre le Soleil et la Lune, c’est une éclipse de Lune.'],
    ['2', 'Pourquoi pas tous les mois ?', 'L’orbite de la Lune est inclinée d’environ 5° par rapport à celle de la Terre. La plupart du temps, la Lune passe donc un peu au-dessus ou en dessous du Soleil. L’alignement parfait n’arrive que 2 à 5 fois par an.'],
    ['3', solar ? 'Totale, annulaire ou partielle ?' : 'Pourquoi la Lune devient rouge ?', solar ? 'Tout dépend de la distance de la Lune. Proche de la Terre, elle paraît plus grande que le Soleil et le cache entièrement : éclipse totale. Plus loin, elle paraît plus petite et laisse un anneau lumineux : éclipse annulaire. Hors de la bande centrale, on voit une éclipse partielle.' : 'La Lune n’est pas noire dans l’ombre : l’atmosphère de la Terre dévie la lumière rouge du Soleil vers elle, comme si tous les couchers et levers de Soleil du monde l’éclairaient en même temps. C’est la « Lune de sang ».'],
    ['4', solar ? 'Occultation ou magnitude ?' : 'Pénombre, ombre : quelle différence ?', solar ? 'Deux chiffres à ne pas confondre : l’occultation est la part de la surface du Soleil cachée (celle qui change la lumière), la magnitude est la part de son diamètre couverte. La magnitude est toujours un peu plus grande, tant que l’éclipse n’est pas totale.' : 'L’ombre de la Terre a un cœur sombre, l’ombre, entouré d’une zone plus claire, la pénombre. Une éclipse de Lune est dite totale ou partielle quand la Lune entre dans l’ombre, et seulement pénombrale quand elle ne traverse que la pénombre : on la remarque à peine.']
  ];
  if (facts) facts.slice(0, 2).forEach((f, i) => cards.push([String(5 + i), f[0], f[1]]));
  $('#ecl-learn').innerHTML = cards.map(c => `<div class="lc"><i>${c[0]}</i><h4>${esc(c[1])}</h4><p>${esc(c[2])}</p></div>`).join('');
  if (facts && facts.length > 2) $('#ecl-learn').innerHTML += `<div class="lc" style="grid-column:1/-1"><i>＋</i><h4>Fiche technique</h4><p>${facts.slice(2).map(f => `<b>${esc(f[0])} :</b> ${esc(f[1])}`).join('<br>')}</p></div>`;
  if (e.zones && !FACTS[e.date]) $('#ecl-learn').innerHTML += `<div class="lc" style="grid-column:1/-1"><i>🌍</i><h4>Où la voir ?</h4><p>${esc(e.zones)}</p></div>`;
  buildDiagram(); buildSim();
}

function buildDiagram() {
  const solar = S.entry.kind === 'solar';
  const modes = solar ? [['total', 'Totale'], ['annular', 'Annulaire'], ['partial', 'Partielle']] : [['lt', 'Totale'], ['lp', 'Partielle'], ['ln', 'Pénombrale']];
  const start = S.entry.type === 'hybrid' ? 'total' : S.entry.type;
  const startKey = solar ? (['total', 'annular', 'partial'].includes(start) ? start : 'total') : ({ total: 'lt', partial: 'lp', penumbral: 'ln' }[S.entry.type]);
  $('#dg-tabs').innerHTML = modes.map(m => `<button class="pill${m[0] === startKey ? ' on' : ''}" data-m="${m[0]}">${m[1]}</button>`).join('');
  const draw = k => { $('#dg-svg').innerHTML = diagramSvg(k); $('#dg-cap').textContent = diagramCap(k); };
  $('#dg-tabs').onclick = e => { const b = e.target.closest('button'); if (!b) return; $$('#dg-tabs button').forEach(x => x.classList.toggle('on', x === b)); draw(b.dataset.m); };
  draw(startKey);
}
function diagramSvg(k) {
  if (k[0] === 'l') {
    const earthX = 170, moonX = 560, moonY = k === 'lt' ? 110 : k === 'lp' ? 138 : 190;
    return `<svg viewBox="0 0 720 240" role="img" aria-label="Schéma d’une éclipse de Lune"><defs><linearGradient id="sg" x1="0" x2="1"><stop offset="0" stop-color="#F5A623"/><stop offset="1" stop-color="#FFD084"/></linearGradient></defs>
    <circle cx="36" cy="120" r="30" fill="url(#sg)"/><text x="36" y="176" fill="#A9B4DB" font-size="13" text-anchor="middle">Soleil</text>
    <polygon points="${earthX},84 700,${k === 'ln' ? 108 : 100} 700,${k === 'ln' ? 132 : 140} ${earthX},156" fill="rgba(234,240,255,.07)"/>
    <polygon points="${earthX},94 520,116 520,124 ${earthX},146" fill="rgba(5,8,22,.9)" stroke="rgba(245,166,35,.5)"/>
    <circle cx="${earthX}" cy="120" r="30" fill="#1D6FB8"/><text x="${earthX}" y="176" fill="#A9B4DB" font-size="13" text-anchor="middle">Terre</text>
    <circle cx="${moonX}" cy="${moonY}" r="14" fill="${k === 'lt' ? '#8a2f1a' : k === 'lp' ? '#c9c4bb' : '#e6e2da'}" stroke="rgba(234,240,255,.4)"/><text x="${moonX}" y="${moonY + 36}" fill="#A9B4DB" font-size="13" text-anchor="middle">Lune</text>
    <text x="300" y="204" fill="#A9B4DB" font-size="12">ombre (cône sombre) et pénombre (zone claire)</text></svg>`;
  }
  const Sx = 80, Sy = 120, R = 60, Mx = 360, r = 14, D = Mx - Sx, tip = Sx + D * R / (R - r);
  const earthX = k === 'total' ? 436 : k === 'annular' ? 520 : 470, earthY = k === 'partial' ? 150 : 120;
  const pen = (dx) => { const sl = (R + r) / D; return `${Mx + dx},${Sy - r - sl * dx} ${Mx + dx},${Sy + r + sl * dx}`; };
  return `<svg viewBox="0 0 720 240" role="img" aria-label="Schéma d’une éclipse de Soleil"><defs><linearGradient id="sg" x1="0" x2="1"><stop offset="0" stop-color="#F5A623"/><stop offset="1" stop-color="#FFD084"/></linearGradient></defs>
  <circle cx="${Sx}" cy="${Sy}" r="${R}" fill="url(#sg)"/><text x="${Sx}" y="${Sy + R + 22}" fill="#A9B4DB" font-size="13" text-anchor="middle">Soleil</text>
  <polygon points="${Mx},${Sy - r} 700,${Sy - r - ((R + r) / D) * (700 - Mx)} 700,${Sy + r + ((R + r) / D) * (700 - Mx)} ${Mx},${Sy + r}" fill="rgba(234,240,255,.07)"/>
  <polygon points="${Mx},${Sy - r} ${tip},${Sy} ${Mx},${Sy + r}" fill="rgba(5,8,22,.95)" stroke="rgba(245,166,35,.6)"/>
  ${k === 'annular' ? `<polygon points="${tip},${Sy} 700,${Sy - r * (700 - tip) / (tip - Mx)} 700,${Sy + r * (700 - tip) / (tip - Mx)}" fill="rgba(245,166,35,.12)" stroke="rgba(245,166,35,.45)" stroke-dasharray="4 4"/>` : ''}
  <circle cx="${Mx}" cy="${Sy}" r="${r}" fill="#9a958d" stroke="rgba(234,240,255,.5)"/><text x="${Mx}" y="${Sy + 36}" fill="#A9B4DB" font-size="13" text-anchor="middle">Lune</text>
  <circle cx="${earthX}" cy="${earthY}" r="30" fill="#1D6FB8"/><text x="${earthX}" y="${earthY + 52}" fill="#A9B4DB" font-size="13" text-anchor="middle">Terre</text>
  ${k === 'partial' ? '<text x="500" y="46" fill="#A9B4DB" font-size="12">Terre dans la pénombre seulement</text>' : ''}</svg>`;
}
function diagramCap(k) {
  return ({ total: 'Éclipse totale : le cône d’ombre de la Lune atteint la Terre. Les personnes dans cette petite zone voient le Soleil entièrement caché.', annular: 'Éclipse annulaire : la Lune est trop loin, la pointe de son ombre s’arrête avant la Terre. Dans le prolongement (en pointillés), la Lune ne cache pas tout le Soleil : un anneau de feu apparaît.', partial: 'Éclipse partielle : la Terre traverse seulement la pénombre. Le Soleil est partiellement caché, jamais totalement.', lt: 'Éclipse totale de Lune : la Lune traverse le cœur de l’ombre de la Terre et devient rouge cuivré.', lp: 'Éclipse partielle de Lune : une partie de la Lune entre dans l’ombre, le reste reste éclairé.', ln: 'Éclipse pénombrale : la Lune ne traverse que la pénombre, très légèrement plus sombre.' })[k];
}

function buildSim() {
  const c = $('#simc'), g = c.getContext('2d'), rng = $('#sim-r');
  const d0 = 384400, e = S.entry, solar = e.kind === 'solar';
  /* distance apparente de la Lune le jour de l'éclipse, déduite des éléments de Bessel : rapport Lune/Soleil au point central */
  let ratioDay = null;
  if (solar) { const cp = ECL.centralPoint(e.e, 0) || { lat: 0, lon: 0 }; const s = ECL.at(e.e, 0, cp.lat, cp.lon); ratioDay = s.M / s.S; }
  const date = new Date(solar ? e.e.epochUT : e.greatest), n = date.getTime() / 864e5 + 2440587.5 - 2451545, gg = (357.528 + 0.9856003 * n) * D2R;
  const rAU = 1.00014 - 0.01671 * Math.cos(gg) - 0.00014 * Math.cos(2 * gg), sunDeg = 0.5332 / rAU; // diamètre apparent du Soleil (°)
  const moonDeg = d => 2 * Math.atan(1737.4 / d) / D2R;
  const draw = () => {
    const d = +rng.value, ms = moonDeg(d), ratio = ms / sunDeg;
    g.clearRect(0, 0, 360, 360); g.fillStyle = '#050816'; g.fillRect(0, 0, 360, 360);
    const R = 120, rm = R * ratio;
    const gr = g.createRadialGradient(180, 180, R * 0.6, 180, 180, R * 1.5); gr.addColorStop(0, 'rgba(255,200,120,.35)'); gr.addColorStop(1, 'rgba(255,200,120,0)'); g.fillStyle = gr; g.beginPath(); g.arc(180, 180, R * 1.5, 0, 7); g.fill();
    g.fillStyle = '#ffc470'; g.beginPath(); g.arc(180, 180, R, 0, 7); g.fill();
    g.fillStyle = '#05060b'; g.beginPath(); g.arc(180, 180, rm, 0, 7); g.fill(); g.strokeStyle = 'rgba(255,255,255,.12)'; g.stroke();
    $('#sim-res').textContent = ratio >= 1 ? (ratio > 1.02 ? 'Éclipse totale' : 'Totalité très courte') : 'Éclipse annulaire';
    $('#sim-txt').textContent = `Lune à ${Math.round(d).toLocaleString('fr-FR')} km : elle paraît ${ratio >= 1 ? 'plus grande' : 'plus petite'} que le Soleil (${Math.round(ratio * 100)} % de son diamètre). ${ratio >= 1 ? 'Elle le cache entièrement.' : 'Un anneau de ' + Math.round((1 - ratio) * 100) + ' % du diamètre reste visible.'}`;
  };
  rng.oninput = draw;
  $$('.sim [data-d]').forEach(b => b.onclick = () => { rng.value = b.dataset.d; draw(); });
  const day = $('#sim-day'); day.style.display = solar && ratioDay ? '' : 'none';
  day.onclick = () => { if (!ratioDay) return; rng.value = clamp(Math.round(1737.4 / Math.tan(sunDeg * ratioDay * D2R / 2)), 356400, 406700); draw(); };
  rng.value = solar && ratioDay ? clamp(Math.round(1737.4 / Math.tan(sunDeg * ratioDay * D2R / 2)), 356400, 406700) : d0; draw();
}

function renderSafety() {
  const solar = S.entry.kind === 'solar';
  if (!solar) {
    $('#ecl-safe').innerHTML = `<li class="ok"><b>Aucun danger</b><span>On peut regarder une éclipse de Lune à l’œil nu, aux jumelles ou au télescope.</span></li><li class="ok"><b>Cherche un ciel dégagé</b><span>Éloigne-toi des lampadaires et laisse tes yeux s’habituer à l’obscurité pendant 15 à 20 minutes.</span></li><li class="ok"><b>Prends un appareil photo</b><span>Un trépied, un téléphone posé et un peu de patience suffisent pour de belles images.</span></li>`;
    $('#ecl-chk').innerHTML = ['J’ai repéré où se lève ou se couche la Lune', 'Je suis loin des lumières', 'J’ai prévenu mes amis'].map((t, i) => `<label><input type="checkbox" data-c>${t}</label>`).join('');
  } else {
    $('#ecl-safe').innerHTML = [
      ['Jamais à l’œil nu', 'Même quand le Soleil est presque entièrement caché ou très bas sur l’horizon. Seule la totalité (quand le Soleil est complètement caché) se regarde sans protection ; ce n’est pas le cas d’une éclipse annulaire.', 0],
      ['Lunettes ISO 12312-2 uniquement', 'Elles portent la mention « ISO 12312-2 » et le marquage CE. Les lunettes de soleil, les verres fumés, les radiographies, les CD et l’écran d’un téléphone ne protègent pas.', 1],
      ['Jamais d’appareil photo, de jumelles ou de télescope sans filtre solaire', 'Ils concentrent la lumière et peuvent brûler la rétine en une seconde, même à travers des lunettes d’éclipse placées devant ton œil.', 0],
      ['La projection par trou d’épingle', 'Perce un petit trou dans un carton, tourne le dos au Soleil et regarde l’ombre sur un mur ou un sol : tu y verras le croissant. Les feuilles des arbres font la même chose.', 1],
      ['Surveille les enfants', 'Fais-leur porter des lunettes adaptées à leur taille et ne les laisse pas retirer les lunettes pendant l’éclipse.', 1]
    ].map(a => `<li${a[2] ? ' class="ok"' : ''}><div><b>${a[0]}</b><span>${a[1]}</span></div></li>`).join('');
    $('#ecl-chk').innerHTML = ['Mes lunettes portent « ISO 12312-2 »', 'Elles ne sont ni rayées ni percées', 'J’ai repéré un horizon ouest dégagé', 'Je sais utiliser la projection par trou d’épingle', 'J’ai prévenu ma famille et mes amis'].map(t => `<label><input type="checkbox" data-c>${t}</label>`).join('');
  }
  const upd = () => { const all = $$('#ecl-chk [data-c]'), n = all.filter(x => x.checked).length, rs = $('#ecl-chk-rs'); rs.className = 'rs' + (n === all.length ? ' ok' : ''); rs.textContent = n === all.length ? 'Tu es prêt(e) !' : `${n} sur ${all.length} : encore un effort.`; };
  $('#ecl-chk').onchange = upd; upd();
}

function renderNext() {
  const p = S.place, list = ECL.upcoming(Date.now(), p.lat, p.lon, 12), vis = ECL.nextVisible(Date.now(), p.lat, p.lon);
  $('#ecl-un').innerHTML = list.map(s => `<button class="uc${s.c.id === S.entry.id ? ' cur' : ''}" data-id="${s.c.id}"><small>${s.c.kind === 'solar' ? 'Soleil' : 'Lune'}${vis && vis.c.id === s.c.id ? ' · prochaine visible d’ici' : ''}</small><h4>${esc(fDs(new Date(s.c.kind === 'solar' ? s.c.e.epochUT : s.c.greatest), 'UTC'))}</h4><p>${esc(ECL.title(s.c))}<br><b style="color:${s.notable ? 'var(--gold)' : 'inherit'}">${esc(p.n)} : ${esc(s.label)}</b></p></button>`).join('');
  $$('#ecl-un .uc').forEach(b => b.onclick = () => { S.entry = ECL.CATALOG.find(c => c.id === b.dataset.id); S.userSeek = false; renderAll(); $('#ecl-sc').scrollTo({ top: 0, behavior: 'smooth' }); });
}
function renderSources() {
  $('#ecl-src').innerHTML = `<p>Tous les calculs sont faits dans ton navigateur à partir des éléments de Bessel de la NASA, avec la méthode de Jean Meeus. Les heures de contact sont précises à quelques secondes ; l’occultation à environ 0,2 point près. Quelques kilomètres de décalage peuvent changer la durée d’un anneau près du bord de la bande. Tu peux vérifier les valeurs sur ces sites :</p>
  <p><a href="https://eclipse.gsfc.nasa.gov/" target="_blank" rel="noopener">NASA · Eclipse Predictions (Fred Espenak)</a> · <a href="https://eclipse.gsfc.nasa.gov/SEbeselm/SEbeselm2001/SE2027Feb06Abeselm.html" target="_blank" rel="noopener">Éléments de Bessel du 6 février 2027</a> · <a href="https://en.wikipedia.org/wiki/Solar_eclipse_of_February_6,_2027" target="_blank" rel="noopener">Wikipédia</a> · <a href="https://www.timeanddate.com/eclipse/" target="_blank" rel="noopener">timeanddate.com</a> · <a href="https://eclipse.previplus.fr/" target="_blank" rel="noopener">Prévi+ (éclipse du 2 août 2027 en France)</a></p>
  <p>Catalogue embarqué : éclipses de 2026 à 2035. Au-delà, il devra être mis à jour par l’AIA.</p>`;
}

/* ============================================================
   COMPTE À REBOURS
   ============================================================ */
function startTick() { clearInterval(tickId); tickId = setInterval(updateCountdown, 1000); updateCountdown(); }
function updateCountdown() {
  if (!S.entry || !S.r || !openFlag) return;
  const e = S.entry, r = S.r, now = Date.now(), solar = e.kind === 'solar';
  const start = solar ? (r.visible ? r.c1.date.getTime() : r.dateMax.getTime()) : (r.u1 ? r.u1.getTime() : e.greatest - 2 * 3600e3);
  const end = solar ? (r.visible ? r.c4.date.getTime() : r.dateMax.getTime()) : (r.u4 ? r.u4.getTime() : e.greatest + 2 * 3600e3);
  const tz = S.place.tz, mx = r.dateMax.getTime();
  if (now > end + 3600e3 && now > ECL.endTime(e)) { /* l'éclipse est passée : passer à la suivante automatiquement */
    const nx = ECL.nextEclipse(now, S.place.lat, S.place.lon); if (nx && nx.c.id !== e.id) { S.entry = nx.c; S.userSeek = false; renderAll(); return; }
  }
  let big, lbl;
  if (now < start) { const d = start - now; big = d; lbl = `Début à <b>${fT(new Date(start), tz, true)}</b> · maximum à <b>${fT(new Date(mx), tz, true)}</b> (heure de ${esc(S.place.n)})`; }
  else if (now <= end) { big = 0; lbl = '<b style="color:#7be0a8">● L’éclipse est en cours</b>'; }
  else { big = 0; lbl = 'Cette éclipse est terminée. La suivante s’affichera automatiquement.'; }
  const d = Math.floor(big / 864e5), h = Math.floor(big % 864e5 / 36e5), m = Math.floor(big % 36e5 / 6e4), s = Math.floor(big % 6e4 / 1e3);
  const box = (v, l) => `<div class="cdb"><b>${String(v).padStart(2, '0')}</b><span>${l}</span></div>`;
  $('#ecl-cd').innerHTML = box(d, d > 1 ? 'JOURS' : 'JOUR') + box(h, 'HEURES') + box(m, 'MINUTES') + box(s, 'SECONDES');
  $('#ecl-cdl').innerHTML = lbl;
}

/* ============================================================
   SCÈNES 3D
   ============================================================ */
function stopScenes() {
  [sky, globe].forEach(x => { if (x) x.dispose(); }); sky = null; globe = null;
  freshCanvas('eclsky'); freshCanvas('eclglobe');
}
/* un canvas dont le contexte a été perdu (forceContextLoss) ne peut plus servir : on le remplace */
function freshCanvas(id) {
  const old = document.getElementById(id);
  if (!old) return;
  const c = old.cloneNode(false);
  old.replaceWith(c);
}
function rebuildStage() {
  if (sky) { sky.dispose(); sky = null; }
  freshCanvas('eclsky');
  requestAnimationFrame(() => { if (!openFlag) return; sky = S.entry.kind === 'solar' ? solarStage() : lunarStage(); });
}
function rebuildGlobe() {
  if (globe) { globe.dispose(); globe = null; }
  freshCanvas('eclglobe');
  requestAnimationFrame(() => { if (!openFlag) return; globe = globeStage(); });
}

const TEX = new THREE.TextureLoader();
const tex = n => { const t = TEX.load('images/' + n); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };

function starfield(count, spreadX, spreadY, z0, z1, size) {
  const g = new THREE.BufferGeometry(), p = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) { p[i * 3] = (Math.random() - .5) * spreadX; p[i * 3 + 1] = (Math.random() - .5) * spreadY; p[i * 3 + 2] = z0 + Math.random() * (z1 - z0); }
  g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  return new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size, sizeAttenuation: true, transparent: true, opacity: 0, depthWrite: false }));
}

/* ---- options (lunettes, orientation) ---- */
function buildOptions() {
  const solar = S.entry.kind === 'solar', box = $('#ecl-opts');
  box.innerHTML = solar ? `<button class="pill${S.filter ? ' on' : ''}" id="o-filter" title="Simule la vue à travers des lunettes ISO 12312-2">🕶 Avec lunettes</button><button class="pill${S.orient ? ' on' : ''}" id="o-orient" title="Haut = zénith, comme au sol">Vue du sol</button><button class="pill" id="o-reset">Recentrer</button>` : `<button class="pill" id="o-reset">Recentrer</button>`;
  const f = $('#o-filter'); if (f) f.onclick = () => { S.filter = !S.filter; f.classList.toggle('on', S.filter); };
  const o = $('#o-orient'); if (o) o.onclick = () => { S.orient = !S.orient; o.classList.toggle('on', S.orient); };
  $('#o-reset').onclick = () => { if (sky) sky.reset(); };
  $('#ecl-note3').textContent = solar ? (S.filter ? 'Simulation avec lunettes d’éclipse. Fais glisser pour regarder autour, molette ou pincement pour zoomer.' : '') : 'Fais glisser pour incliner la scène, molette ou pincement pour zoomer.';
}

/* ---- repère du ciel : où sont le nord et l'est célestes dans l'image ? ---- */
function skyBasis(latDeg, altDeg, azDeg) {
  const phi = latDeg * D2R, h = altDeg * D2R, A = azDeg * D2R;
  const s = [Math.cos(h) * Math.sin(A), Math.cos(h) * Math.cos(A), Math.sin(h)], p = [0, Math.cos(phi), Math.sin(phi)];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], sub = (a, b, k) => [a[0] - k * b[0], a[1] - k * b[1], a[2] - k * b[2]];
  const nr = a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return a.map(v => v / l); };
  const cr = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const n = nr(sub(p, s, dot(p, s))), z = nr(sub([0, 0, 1], s, s[2])), right = cr(s, z), east = cr(n, s);
  return { nx: dot(n, right), ny: dot(n, z), ex: dot(east, right), ey: dot(east, z) };
}

/* ------------------------------------------------------------
   Éclipse de Soleil : Soleil, couronne, Lune réelle, ciel
   ------------------------------------------------------------ */
function solarStage() {
  const canvas = $('#eclsky'), box = $('#ecl-stage'), E = S.entry.e, p = S.place;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(34, 1, 0.1, 200);
  const CZ = 7.5; let zoom = 1, yaw = 0, pitch = 0, ty = 0, tp = 0, tz2 = 1;
  const fit = () => { const w = box.clientWidth, h = box.clientHeight; renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); };
  fit(); const ro = new ResizeObserver(fit); ro.observe(box);

  /* ciel */
  const bgMat = new THREE.ShaderMaterial({ uniforms: { uDark: { value: 0 }, uWarm: { value: 0 }, uNight: { value: 0 } },
    vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `varying vec2 vUv;uniform float uDark,uWarm,uNight;
      void main(){float h=vUv.y;
        vec3 dayLow=vec3(.62,.74,.92),dayTop=vec3(.16,.32,.66);vec3 warmLow=vec3(1.,.5,.2),warmTop=vec3(.28,.2,.42);
        vec3 lowC=mix(dayLow,warmLow,uWarm),topC=mix(dayTop,warmTop,uWarm);
        vec3 c=mix(lowC,topC,smoothstep(0.,1.,h));c*=1.-uDark;
        vec3 nl=vec3(.05,.05,.11),nt=vec3(.005,.01,.04);c=mix(c,mix(nl,nt,h),uNight);gl_FragColor=vec4(c,1.);}`, depthWrite: false });
  const bg = new THREE.Mesh(new THREE.PlaneGeometry(120, 70), bgMat); bg.position.z = -30; scene.add(bg);
  const stars = starfield(1100, 70, 40, -28, -24, 0.16); scene.add(stars);

  /* corona + halo */
  const coronaMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uC: { value: 0 }, uG: { value: 0.3 }, uSeed: { value: Math.random() * 6 } },
    vertexShader: 'varying vec2 vP;void main(){vP=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `varying vec2 vP;uniform float uC,uG,uSeed;
      void main(){float r=length(vP);float a=atan(vP.y,vP.x);
        float base=exp(-(r-1.)*1.9)*step(1.,r);
        float st=.55+.45*sin(a*7.+uSeed)*sin(a*3.+1.7)+.28*sin(a*13.+uSeed*2.);
        float corona=base*(.3+st*.7)*uC;
        float glare=exp(-(r-1.)*3.2)*step(1.,r)*uG+exp(-r*.55)*uG*.22;
        float c=corona+glare;gl_FragColor=vec4(vec3(.95,.97,1.)*c,c);}` });
  const corona = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), coronaMat); corona.position.z = -.2; scene.add(corona);

  /* Soleil */
  const sunMat = new THREE.ShaderMaterial({ transparent: true, uniforms: { uTint: { value: 0 }, uF: { value: 1 }, uB: { value: 1 } },
    vertexShader: 'varying vec2 vP;void main(){vP=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `varying vec2 vP;uniform float uTint,uF,uB;
      void main(){float r=length(vP);float al=1.-smoothstep(.992,1.,r);if(al<=0.)discard;
        float mu=sqrt(max(0.,1.-r*r));float limb=1.-.62*(1.-mu)-.1*(1.-mu)*(1.-mu);
        vec3 core=mix(vec3(1.,.78,.45),vec3(1.,.97,.88),mu);vec3 col=core*limb*1.3;
        col=mix(col,col*vec3(1.,.6,.32),uTint);
        vec3 fc=vec3(1.,.52,.14)*limb*.95;col=mix(col,fc,uF);
        col*=uB;gl_FragColor=vec4(col,al);}` });
  const sun = new THREE.Mesh(new THREE.PlaneGeometry(2.04, 2.04), sunMat); scene.add(sun);
  const chromo = new THREE.Mesh(new THREE.RingGeometry(1.0, 1.035, 128), new THREE.MeshBasicMaterial({ color: 0xff3a5c, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })); chromo.position.z = .01; scene.add(chromo);

  /* Lune */
  const moonMat = new THREE.ShaderMaterial({ uniforms: { map: { value: tex('moon_1024.jpg') }, uRim: { value: .5 } },
    vertexShader: 'varying vec2 vUv;varying vec3 vN;varying vec3 vV;void main(){vUv=uv;vN=normalize(normalMatrix*normal);vec4 mv=modelViewMatrix*vec4(position,1.);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}',
    fragmentShader: `uniform sampler2D map;uniform float uRim;varying vec2 vUv;varying vec3 vN;varying vec3 vV;
      void main(){vec3 t=texture2D(map,vUv).rgb;float rim=pow(1.-abs(dot(normalize(vN),normalize(vV))),3.);
        vec3 col=t*.05+vec3(1.,.72,.42)*rim*uRim;gl_FragColor=vec4(col,1.);}` });
  const moon = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 48), moonMat); moon.rotation.y = -Math.PI / 2; scene.add(moon);
  const MZ = .6, K = (CZ - MZ) / CZ;

  /* interaction */
  const el = renderer.domElement; let drag = null;
  const pd = e => { drag = { x: e.clientX, y: e.clientY, ty, tp }; el.setPointerCapture(e.pointerId); };
  const pm = e => { if (!drag) return; ty = clamp(drag.ty + (e.clientX - drag.x) * .004, -.5, .5); tp = clamp(drag.tp + (e.clientY - drag.y) * .004, -.35, .35); };
  const pu = () => drag = null, wh = e => { e.preventDefault(); tz2 = clamp(tz2 * (e.deltaY > 0 ? 1.08 : .92), .45, 2.4); };
  el.addEventListener('pointerdown', pd); el.addEventListener('pointermove', pm); el.addEventListener('pointerup', pu); el.addEventListener('pointercancel', pu); el.addEventListener('wheel', wh, { passive: false });
  let pinch = null; el.addEventListener('touchmove', e => { if (e.touches.length === 2) { const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); if (pinch) tz2 = clamp(tz2 * pinch / d, .45, 2.4); pinch = d; e.preventDefault(); } }, { passive: false }); el.addEventListener('touchend', () => pinch = null);

  const markers = { stars: 0 }; let raf = 0, last = performance.now(), hudT = 0, dead = false;
  const hud = { pl: $('#hud-pl'), tm: $('#hud-tm'), ph: $('#hud-ph'), ob: $('#hud-ob'), alt: $('#hud-alt'), warn: $('#hud-warn'), sl: $('#ecl-slider'), obl: $('#hud-obl'), altl: $('#hud-altl') };
  hud.obl.textContent = 'DU SOLEIL CACHÉ'; hud.altl.textContent = 'HAUTEUR DU SOLEIL';

  function frame(now) {
    if (dead) return; raf = requestAnimationFrame(frame);
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    if (S.playing) { S.T += dt * S.speed * 1000; if (S.T >= S.t1) { S.T = S.t1; S.playing = false; $('#ecl-play').textContent = '▶'; } }
    else if (S.live && !S.userSeek) S.T = clamp(Date.now(), S.t0, S.t1);
    const T = S.T, th = (T - E.epochUT) / 3600e3, s = ECL.at(E, th, p.lat, p.lon), r = S.r;
    const ratioM = s.M / s.S, basis = skyBasis(p.lat, s.alt, s.az);
    /* position de la Lune par rapport au Soleil, en rayons solaires, dans le repère de l'écran */
    const du = s.u / s.S, dv = s.v / s.S;
    let X = du * basis.ex + dv * basis.nx, Y = du * basis.ey + dv * basis.ny;
    if (!S.orient) { X = du; Y = dv; }
    /* la Lune doit passer devant : positions mises à l'échelle de la perspective */
    moon.position.set(X * K, Y * K, MZ); moon.scale.setScalar(ratioM * K);
    /* couleurs / luminosité */
    const horizon = smooth(14, 1, s.alt), below = smooth(-.3, -1.6, s.alt), obs = s.obsc;
    const isCentral = r.central && s.m < Math.abs(s.L2);
    const total = isCentral && s.L2 < 0, annular = isCentral && s.L2 > 0;
    sunMat.uniforms.uTint.value = horizon * .75; sunMat.uniforms.uF.value = S.filter ? 1 : 0; sunMat.uniforms.uB.value = (S.filter ? .96 : 1.25) * (1 - below);
    const dark = Math.pow(obs, 2.2) * (total ? .98 : .55);
    bgMat.uniforms.uDark.value = dark; bgMat.uniforms.uWarm.value = clamp(horizon * 1.1, 0, 1); bgMat.uniforms.uNight.value = clamp(below + (total ? .85 : 0), 0, 1);
    stars.material.opacity = clamp(below * .9 + smooth(.93, 1, obs) * .9 + (total ? .8 : 0), 0, 1);
    coronaMat.uniforms.uC.value = total ? .95 : 0; chromo.material.opacity = total ? .85 : (isCentral ? 0 : 0);
    coronaMat.uniforms.uG.value = (S.filter ? .05 : .55) * (1 - smooth(.7, 1, obs) * .8) * (1 - below);
    moonMat.uniforms.uRim.value = (total ? .8 : .35) * (1 - below);
    sun.visible = s.alt > -3.5 || true;
    /* caméra */
    yaw += (ty - yaw) * .08; pitch += (tp - pitch) * .08; zoom += (tz2 - zoom) * .1;
    const R2 = CZ * zoom; cam.position.set(Math.sin(yaw) * R2 * Math.cos(pitch), Math.sin(pitch) * R2, Math.cos(yaw) * R2 * Math.cos(pitch)); cam.lookAt(0, -(cam.aspect < 1 ? 1.35 : .8), 0);
    renderer.render(scene, cam);
    /* HUD à 10 Hz */
    hudT += dt; if (hudT > .1) { hudT = 0;
      hud.pl.textContent = p.n; hud.tm.textContent = fT(new Date(T), p.tz, true);
      let ph; if (s.alt < -0.83) ph = 'Soleil couché'; else if (s.m >= s.L1) ph = T < r.dateMax.getTime() ? 'Avant l’éclipse' : 'Éclipse terminée'; else if (annular) ph = 'ANNEAU DE FEU'; else if (total) ph = 'TOTALITÉ'; else ph = 'Phase partielle';
      hud.ph.textContent = (S.live && !S.userSeek ? '● EN DIRECT · ' : '') + ph; hud.ph.className = 'ph' + (S.live && !S.userSeek ? ' live' : '');
      hud.ob.textContent = pc(Math.max(0, obs)); hud.alt.textContent = (s.alt >= 0 ? s.alt.toFixed(1) : '< 0').replace('.', ',') + '°';
      hud.sl.value = Math.round((T - S.t0) / (S.t1 - S.t0) * 1000);
      let w = ''; if (s.alt < -0.83) w = 'Le Soleil est sous l’horizon : cette partie de l’éclipse n’est pas visible depuis ' + p.n + '.'; else if (!S.filter) w = '⚠ Ne regarde jamais le Soleil sans lunettes ISO 12312-2.';
      if (!r.visible) w = 'Le Soleil n’est pas touché par la Lune depuis ' + p.n + '.';
      hud.warn.style.display = w ? 'block' : 'none'; hud.warn.textContent = w; hud.warn.style.top = w && s.alt < -0.83 ? '50%' : '16%'; }
  }
  raf = requestAnimationFrame(frame);
  return { dispose() { dead = true; cancelAnimationFrame(raf); ro.disconnect(); el.removeEventListener('wheel', wh); scene.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) { const m = o.material; (Array.isArray(m) ? m : [m]).forEach(x => { if (x.uniforms && x.uniforms.map && x.uniforms.map.value) x.uniforms.map.value.dispose(); x.dispose(); }); } }); renderer.dispose(); renderer.forceContextLoss(); },
           reset() { ty = tp = 0; tz2 = 1; } };
}

/* ------------------------------------------------------------
   Éclipse de Lune : la Lune dans l'ombre de la Terre
   ------------------------------------------------------------ */
const LP = { k: 2.55, kp: 4.8, g: 0, vel: 1.3 };
function lunarParams() {
  const e = S.entry, k = LP.k, kp = LP.kp;
  if (e.umbral > 0) { LP.g = Math.max(0, k + 1 - 2 * e.umbral); LP.vel = 2 * Math.sqrt(Math.max(0.2, (k + 1) ** 2 - LP.g ** 2)) / ((e.partialMin || 200) / 60); }
  else { LP.g = Math.max(0, k + 1 - 2 * e.umbral); LP.vel = 2 * Math.sqrt(Math.max(0.2, (kp + 1) ** 2 - LP.g ** 2)) / 4.6; }
}
function lunarStage() {
  const canvas = $('#eclsky'), box = $('#ecl-stage'), e = S.entry, p = S.place;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(32, 1, 0.1, 100); let z = 4.3, tz = 4.3;
  const fit = () => { const w = box.clientWidth, h = box.clientHeight; renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); };
  fit(); const ro = new ResizeObserver(fit); ro.observe(box);
  scene.background = new THREE.Color(0x02030a);
  const stars = starfield(1400, 40, 24, -14, -8, 0.1); stars.material.opacity = .9; scene.add(stars);
  const mat = new THREE.ShaderMaterial({ uniforms: { map: { value: tex('moon_1024.jpg') }, uS: { value: new THREE.Vector2(-9, 0) }, uK: { value: LP.k }, uKp: { value: LP.kp }, uTot: { value: 1 } },
    vertexShader: 'varying vec2 vUv;varying vec2 vW;void main(){vUv=uv;vec4 w=modelMatrix*vec4(position,1.);vW=w.xy;gl_Position=projectionMatrix*viewMatrix*w;}',
    fragmentShader: `uniform sampler2D map;uniform vec2 uS;uniform float uK,uKp;varying vec2 vUv;varying vec2 vW;
      void main(){vec3 t=texture2D(map,vUv).rgb*1.12;float d=length(vW-uS);
        float pen=1.-smoothstep(uK*1.0,uKp*1.0,d);
        float um=1.-smoothstep(uK*.985,uK*1.03,d);
        float edge=smoothstep(uK*.93,uK*1.0,d)*(1.-smoothstep(uK*1.0,uK*1.09,d));
        vec3 col=t*mix(1.,.8,pen*.75);
        vec3 umb=vec3(.52,.13,.05)*(.25+.75*dot(t,vec3(.33)))*1.05+vec3(.04,.06,.08)*edge*.7;
        col=mix(col,umb,um);col+=vec3(.15,.35,.38)*edge*.18*(1.-um);
        gl_FragColor=vec4(col,1.);}` });
  const moon = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 64), mat); moon.rotation.y = -Math.PI / 2; scene.add(moon);
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uA: { value: .12 } }, vertexShader: 'varying vec2 vP;void main(){vP=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}', fragmentShader: 'varying vec2 vP;uniform float uA;void main(){float r=length(vP);float c=exp(-(r-1.)*3.)*step(1.,r)*uA;gl_FragColor=vec4(vec3(.8,.85,1.)*c,c);}' })); glow.position.z = -.2; scene.add(glow);
  const el = renderer.domElement, wh = ev => { ev.preventDefault(); tz = clamp(tz * (ev.deltaY > 0 ? 1.08 : .92), 2.3, 8); };
  let drag = null, rx = 0, ry = 0; el.addEventListener('wheel', wh, { passive: false });
  el.addEventListener('pointerdown', ev => { drag = { x: ev.clientX, y: ev.clientY, rx, ry }; el.setPointerCapture(ev.pointerId); });
  el.addEventListener('pointermove', ev => { if (!drag) return; ry = clamp(drag.ry + (ev.clientX - drag.x) * .004, -.4, .4); rx = clamp(drag.rx + (ev.clientY - drag.y) * .004, -.3, .3); });
  el.addEventListener('pointerup', () => drag = null);
  const hud = { pl: $('#hud-pl'), tm: $('#hud-tm'), ph: $('#hud-ph'), ob: $('#hud-ob'), alt: $('#hud-alt'), warn: $('#hud-warn'), sl: $('#ecl-slider'), obl: $('#hud-obl'), altl: $('#hud-altl') };
  hud.obl.textContent = 'MAGNITUDE DANS L’OMBRE'; hud.altl.textContent = 'HAUTEUR DE LA LUNE';
  let raf = 0, last = performance.now(), hudT = 0, dead = false;
  function frame(now) {
    if (dead) return; raf = requestAnimationFrame(frame); const dt = Math.min(.1, (now - last) / 1000); last = now;
    if (S.playing) { S.T += dt * S.speed * 1000; if (S.T >= S.t1) { S.T = S.t1; S.playing = false; $('#ecl-play').textContent = '▶'; } } else if (S.live && !S.userSeek) S.T = clamp(Date.now(), S.t0, S.t1);
    const tau = (S.T - e.greatest) / 3600e3, sx = LP.vel * tau, sy = -LP.g, d = Math.hypot(sx, sy), k = LP.k, kp = LP.kp;
    mat.uniforms.uS.value.set(sx, sy);
    z += (tz - z) * .1; cam.position.set(Math.sin(ry) * z, Math.sin(rx) * z, Math.cos(ry) * z * Math.cos(rx)); cam.lookAt(0, -(cam.aspect < 1 ? .5 : .32), 0);
    renderer.render(scene, cam);
    hudT += dt; if (hudT > .1) { hudT = 0;
      const mag = clamp((k + 1 - d) / 2, 0, 3), m = ECL.moonAlt(S.T, p.lat, p.lon);
      let ph; if (d >= kp + 1) ph = tau < 0 ? 'Avant l’éclipse' : 'Éclipse terminée'; else if (d >= k + 1) ph = 'Pénombre : la Lune s’assombrit à peine'; else if (e.totalMin && d <= k - 1) ph = 'TOTALITÉ · Lune rouge'; else ph = 'Phase partielle : l’ombre mord la Lune';
      hud.pl.textContent = p.n; hud.tm.textContent = fT(new Date(S.T), p.tz, true); hud.ph.textContent = (S.live && !S.userSeek ? '● EN DIRECT · ' : '') + ph; hud.ph.className = 'ph' + (S.live && !S.userSeek ? ' live' : '');
      hud.ob.textContent = mag.toFixed(2).replace('.', ','); hud.alt.textContent = m.alt.toFixed(0) + '°'; hud.sl.value = Math.round((S.T - S.t0) / (S.t1 - S.t0) * 1000);
      hud.warn.style.display = m.alt < 0 ? 'block' : 'none'; hud.warn.style.top = '50%'; hud.warn.textContent = m.alt < 0 ? 'À cet instant, la Lune est sous l’horizon de ' + p.n + '.' : '';
      stars.material.opacity = .9; }
  }
  raf = requestAnimationFrame(frame);
  return { dispose() { dead = true; cancelAnimationFrame(raf); ro.disconnect(); el.removeEventListener('wheel', wh); mat.uniforms.map.value.dispose(); scene.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material && o.material.dispose) o.material.dispose(); }); renderer.dispose(); renderer.forceContextLoss(); }, reset() { rx = ry = 0; tz = 4.3; } };
}

/* ---- marqueurs du curseur de temps ---- */
function renderMarkers() {
  const r = S.r, e = S.entry, tz = S.place.tz, mk = [], span = S.t1 - S.t0, put = (ms, l, cls) => { if (ms < S.t0 || ms > S.t1) return; mk.push(`<div class="mk ${cls || ''}" style="left:${((ms - S.t0) / span * 100).toFixed(2)}%">${l}</div>`); };
  if (e.kind === 'solar' && r.visible) { put(r.c1.date.getTime(), 'DÉBUT'); if (r.central) { put(r.c2.date.getTime(), r.annular ? 'ANNEAU' : 'TOTALITÉ'); put(r.c3.date.getTime(), ''); } else put(r.dateMax.getTime(), 'MAX'); put(r.c4.date.getTime(), 'FIN'); if (S.sunset && !S.sunset.before) put(S.sunset.ms, 'COUCHER', 'sun'); }
  else if (e.kind === 'lunar') { if (r.u1) put(r.u1.getTime(), 'OMBRE'); if (r.u2) put(r.u2.getTime(), 'TOTALITÉ'); put(e.greatest, 'MAX'); if (r.u3) put(r.u3.getTime(), 'FIN TOT.'); if (r.u4) put(r.u4.getTime(), 'SORTIE'); }
  else put(r.dateMax.getTime(), 'MAX');
  $('#ecl-mk').innerHTML = mk.join('');
}

/* ------------------------------------------------------------
   Globe : bande de centralité et ombre en mouvement
   ------------------------------------------------------------ */
function globeStage() {
  const canvas = $('#eclglobe'), box = $('#ecl-gw'), e = S.entry, p = S.place;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(30, 1, .1, 100); cam.position.z = 7.2;
  const fit = () => { const w = box.clientWidth; renderer.setSize(w, w, false); }; fit(); const ro = new ResizeObserver(fit); ro.observe(box);
  const earth = new THREE.Mesh(new THREE.SphereGeometry(1.5, 96, 96), new THREE.MeshPhongMaterial({ map: tex('earth_atmos_2048.jpg'), specularMap: TEX.load('images/earth_specular_2048.jpg'), specular: new THREE.Color(0x335577), shininess: 18 }));
  const clouds = new THREE.Mesh(new THREE.SphereGeometry(1.512, 64, 64), new THREE.MeshLambertMaterial({ map: tex('earth_clouds_1024.png'), transparent: true, opacity: .45, depthWrite: false }));
  const atm = new THREE.Mesh(new THREE.SphereGeometry(1.7, 64, 64), new THREE.ShaderMaterial({ transparent: true, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false, vertexShader: 'varying vec3 n;void main(){n=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}', fragmentShader: 'varying vec3 n;void main(){float i=pow(.62-dot(n,vec3(0.,0.,1.)),3.);gl_FragColor=vec4(.35,.6,1.,1.)*i*1.6;}' }));
  const grp = new THREE.Group(); grp.add(earth, clouds); scene.add(grp, atm);
  scene.add(new THREE.AmbientLight(0x6677aa, .55)); const sun = new THREE.DirectionalLight(0xfff2dd, 2.2); sun.position.set(-4, 2.5, 4); scene.add(sun);
  const V = (lat, lon, R) => { const ph = (90 - lat) * D2R, th = (lon + 180) * D2R; return new THREE.Vector3(-R * Math.sin(ph) * Math.cos(th), R * Math.cos(ph), R * Math.sin(ph) * Math.sin(th)); };
  const faceAngles = (lat, lon) => { const v = V(lat, lon, 1); return { y: Math.atan2(-v.x, v.z), x: Math.asin(clamp(v.y, -1, 1)) * .8 }; };

  /* trajectoire centrale */
  let pathPts = []; if (e.kind === 'solar') for (let t = -4; t <= 4; t += .04) { const c = ECL.centralPoint(e.e, t); if (c) pathPts.push(V(c.lat, c.lon, 1.508)); }
  let pathLen = pathPts.length;
  if (pathLen > 3) { const curve = new THREE.CatmullRomCurve3(pathPts); const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, Math.min(400, pathLen * 3), .011, 6, false), new THREE.MeshBasicMaterial({ color: 0xF5A623 })); grp.add(tube); }
  /* marqueur du lieu */
  const mk = new THREE.Mesh(new THREE.SphereGeometry(.03, 16, 16), new THREE.MeshBasicMaterial({ color: 0xffffff })); mk.position.copy(V(p.lat, p.lon, 1.515)); grp.add(mk);
  const ring = new THREE.Mesh(new THREE.RingGeometry(.05, .062, 40), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, side: THREE.DoubleSide })); ring.position.copy(V(p.lat, p.lon, 1.516)); ring.lookAt(V(p.lat, p.lon, 3)); grp.add(ring);
  /* ombre en mouvement */
  const sc = document.createElement('canvas'); sc.width = sc.height = 128; const sx = sc.getContext('2d'); const gr = sx.createRadialGradient(64, 64, 4, 64, 64, 64); gr.addColorStop(0, 'rgba(0,0,0,.75)'); gr.addColorStop(.55, 'rgba(0,0,0,.45)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); sx.fillStyle = gr; sx.fillRect(0, 0, 128, 128);
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(1, 48), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), transparent: true, depthWrite: false })); grp.add(shadow);
  const dot = new THREE.Mesh(new THREE.SphereGeometry(.035, 16, 16), new THREE.MeshBasicMaterial({ color: 0xFF5A36 })); grp.add(dot);

  const f0 = faceAngles(p.lat, p.lon); let ry = f0.y, rx = .25, tgY = ry, tgX = rx, drag = null, dead = false, raf = 0, idle = 99;
  const api = { follow: false, focusPlace() { const f = faceAngles(S.place.lat, S.place.lon); tgY = f.y; tgX = f.x; idle = 0; api.follow = false; $('#g-follow').classList.remove('on'); } };
  const el = renderer.domElement;
  box.addEventListener('pointerdown', ev => { drag = { x: ev.clientX, y: ev.clientY, ry: tgY, rx: tgX }; box.setPointerCapture(ev.pointerId); api.follow = false; $('#g-follow').classList.remove('on'); idle = 0; });
  box.addEventListener('pointermove', ev => { if (!drag) return; tgY = drag.ry + (ev.clientX - drag.x) * .008; tgX = clamp(drag.rx + (ev.clientY - drag.y) * .006, -1, 1); });
  box.addEventListener('pointerup', () => drag = null);

  const list = $('#ecl-globe-li'), lead = $('#ecl-globe-lead');
  lead.textContent = e.kind === 'solar' ? (pathLen > 3 ? 'La ligne dorée est la bande où l’éclipse est ' + (e.type === 'total' || e.type === 'hybrid' ? 'totale' : 'annulaire') + '. Le disque sombre est l’ombre de la Lune qui balaie la Terre ; fais glisser le curseur du temps pour la voir avancer. Ton lieu est le point blanc.' : 'Cette éclipse est partielle : l’axe de l’ombre passe à côté de la Terre. Le disque sombre montre la zone où la Lune cache une partie du Soleil.') : 'Une éclipse de Lune se voit de tout l’hémisphère où la Lune est au-dessus de l’horizon : la nuit, pour tous ceux qui la regardent.';
  list.innerHTML = e.kind === 'solar' ? (e.zones ? `<li><b>Zones :</b> ${esc(e.zones)}</li>` : '') + '<li>Fais glisser le globe pour le tourner.</li>' : '';
  const set = ECL.sunEq;
  let dispose = () => { dead = true; cancelAnimationFrame(raf); ro.disconnect(); earth.material.map.dispose(); clouds.material.map.dispose(); shadow.material.map.dispose(); scene.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material && o.material.dispose) o.material.dispose(); }); renderer.dispose(); renderer.forceContextLoss(); };
  function frame() {
    if (dead) return; raf = requestAnimationFrame(frame); idle += .016;
    let tgt = null;
    if (e.kind === 'solar') {
      const th = (S.T - e.e.epochUT) / 3600e3, c = ECL.shadowFootprint(e.e, th), L1 = ECL.poly(e.e.l1, th);
      const pos = V(c.lat, c.lon, 1.514); shadow.position.copy(pos); shadow.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), pos.clone().normalize()); const ang = Math.asin(clamp(L1 * .92, .1, .98)); shadow.scale.setScalar(Math.sin(ang) * 1.5 * (c.onEarth ? 1 : .55)); dot.position.copy(V(c.lat, c.lon, 1.52)); dot.visible = c.onEarth && (Math.hypot(ECL.poly(e.e.x, th), ECL.poly(e.e.y, th)) < 1);
      if (api.follow) { const f = faceAngles(c.lat, c.lon); tgY = f.y; tgX = f.x * .9; }
    } else { shadow.visible = false; dot.visible = false; if (idle > 3) tgY += .002; }
    ry += (tgY - ry) * .06; rx += (tgX - rx) * .06; grp.rotation.y = ry; grp.rotation.x = rx; clouds.rotation.y += .0003;
    ring.scale.setScalar(1 + (performance.now() % 1400) / 1400 * 1.8); ring.material.opacity = 1 - (performance.now() % 1400) / 1400;
    renderer.render(scene, cam);
  }
  raf = requestAnimationFrame(frame);
  api.dispose = dispose; $('#g-follow').classList.toggle('on', false);
  return api;
}

/* accessible depuis la page */
window.AIA_ECLIPSE = { open, close };
