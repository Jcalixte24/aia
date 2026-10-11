/* cms.js : lit le contenu modifié dans /admin et le met dans la page, sans redéploiement.
   Si la base est vide ou injoignable, la page garde son contenu d'origine (écrit dans le HTML). */
(function () {
  var CFG = window.AIA_CMS || {};
  var LIVE = !!CFG.databaseURL;
  var DEMO_KEY = 'aia-cms-demo-v1';
  var D = document;
  function $(s, c) { return (c || D).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || D).querySelectorAll(s)); }

  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function url(u) { u = String(u || '').trim(); return /^(https?:\/\/|mailto:|tel:|\/|#)/i.test(u) ? u : ''; }
  function img(u) { u = String(u || '').trim(); return /^(https?:\/\/|images\/|\/|data:image\/(jpeg|png|webp);base64,)/i.test(u) ? u : ''; }
  function arr(x) { if (!x) return []; if (Array.isArray(x)) return x.filter(Boolean); return Object.keys(x).map(function (k) { return x[k]; }); }
  function today() { return new Date().toISOString().slice(0, 10); }

  function load() {
    if (LIVE) {
      return fetch(CFG.databaseURL.replace(/\/$/, '') + '/cms.json', { cache: 'no-store' })
        .then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
    }
    try { return Promise.resolve(JSON.parse(localStorage.getItem(DEMO_KEY) || 'null')); } catch (e) { return Promise.resolve(null); }
  }

  /* ---------- rendu ---------- */
  var CST = [
    'M40 220 L110 150 L170 175 L240 70', 'M50 90 L120 130 L150 220 L250 190 L230 80',
    'M60 200 L100 110 L190 140 L220 60 M190 140 L240 230', 'M50 210 L120 120 L190 170 L250 60',
    'M60 80 L130 150 L90 230 M130 150 L230 130 L250 220'
  ];
  function initials(n) {
    var p = String(n || '').replace(/^(dr|pr|m|mme|mlle)\.?\s+/i, '').split(/\s+/).filter(Boolean);
    return ((p[0] || '?').charAt(0) + (p.length > 1 ? p[p.length - 1].charAt(0) : '')).toUpperCase();
  }
  function rich(t) {
    return String(t || '').split(/\n{2,}/).map(function (b) {
      var ls = b.split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
      if (!ls.length) return '';
      if (ls.every(function (l) { return /^[-•]\s+/.test(l); })) return '<ul>' + ls.map(function (l) { return '<li>' + esc(l.replace(/^[-•]\s+/, '')) + '</li>'; }).join('') + '</ul>';
      return '<p>' + esc(ls.join(' ')) + '</p>';
    }).join('');
  }
  function linksHtml(ls) {
    var out = arr(ls).filter(function (l) { return l && url(l.url); }).map(function (l) { return '<a href="' + esc(url(l.url)) + '" target="_blank" rel="noopener">' + esc(l.label || 'Lire la suite') + ' ↗</a>'; });
    return out.join(' · ');
  }
  function daysFrom(iso) { var a = new Date(iso + 'T00:00:00Z').getTime(), b = new Date(today() + 'T00:00:00Z').getTime(); return Math.round((a - b) / 864e5); }

  function eventCard(e) {
    var ph = img(e.image) ? '<img src="' + esc(img(e.image)) + '" alt="" loading="lazy">' : '<div class="big">' + esc(e.bigText || String(e.title || '').slice(0, 18)) + '</div>';
    return '<article class="ev"><div class="ph">' + ph + '</div><div class="tx"><time>' + esc(String(e.dateLabel || '').toUpperCase()) + '</time><h3>' + esc(e.title) + '</h3><p>' + esc(e.description) + '</p>' + (e.place ? '<span class="pl">' + esc(e.place) + '</span>' : '') + '</div></article>';
  }
  function upcomingCard(e) {
    var d = String(e.start || '').split('-'), M = ['JANV.', 'FÉVR.', 'MARS', 'AVR.', 'MAI', 'JUIN', 'JUIL.', 'AOÛT', 'SEPT.', 'OCT.', 'NOV.', 'DÉC.'];
    var n = daysFrom(e.start), jn = n > 1 ? 'Dans ' + n + ' jours' : n === 1 ? 'Demain' : n === 0 ? "Aujourd'hui" : 'En cours';
    var u = url(e.link);
    return '<article class="upc"><div class="dd"><b>' + esc(+d[2] || '') + '</b><span>' + esc(M[(+d[1] || 1) - 1] || '') + ' ' + esc(d[0] || '') + '</span><em class="jn">' + jn + '</em></div>' +
      '<div class="dx"><h3>' + esc(e.title) + '</h3>' + (e.place ? '<p class="pl">' + esc(e.place) + '</p>' : '') + '<p>' + esc(e.description) + '</p></div>' +
      (u ? '<a class="btn solid" href="' + esc(u) + '" target="_blank" rel="noopener">' + esc(e.linkLabel || 'En savoir plus') + '</a>' : '') + '</article>';
  }
  function articleItem(a) {
    var l = linksHtml(a.links);
    return '<details class="art"><summary><time>' + esc(String(a.dateLabel || '').toUpperCase()) + '</time><span class="src">' + esc(String(a.source || 'AIA').toUpperCase()) + '</span><h3>' + esc(a.title) + '</h3></summary><div class="body">' + rich(a.body) + (l ? l : '') + '</div></details>';
  }
  function teamCard(m, i) {
    var ph = img(m.photo)
      ? '<img src="' + esc(img(m.photo)) + '" alt="' + esc(m.name) + '" loading="lazy">' + (m.badge ? '<span class="badge">' + esc(String(m.badge).toUpperCase()) + '</span>' : '')
      : '<svg class="cst" viewBox="0 0 300 300" aria-hidden="true"><path d="' + CST[i % CST.length] + '" fill="none" stroke="#F5A623" stroke-width="1.2"/></svg><div class="mono">' + esc(initials(m.name)) + '</div>' + (m.badge ? '<span class="badge">' + esc(String(m.badge).toUpperCase()) + '</span>' : '');
    return '<article class="pcard"><div class="pph">' + ph + '</div><div class="pbody"><small>' + esc(m.role) + '</small><h3>' + esc(m.name) + '</h3><p>' + esc(m.bio) + '</p></div></article>';
  }

  var ICONS = {
    instagram: '<path d="M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4zm5 5a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm5.500-2a1 1 0 1 0 0 2 1 1 0 0 0 0-2z" fill="none" stroke="currentColor" stroke-width="1.8"/>',
    youtube: '<path d="M22 8.500a3 3 0 0 0-2-2C18 6 12 6 12 6s-6 0-8 .5a3 3 0 0 0-2 2C1.500 10.500 1.500 12 1.500 12s0 1.500.5 3.500a3 3 0 0 0 2 2c2 .5 8 .5 8 .5s6 0 8-.5a3 3 0 0 0 2-2c.5-2 .5-3.500.5-3.500s0-1.500-.5-3.500zM10 15V9l5 3z" fill="currentColor"/>',
    x: '<path d="M4 4l16 16M20 4L4 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    linkedin: '<path d="M4 9h4v11H4zM6 3.500a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM10 9h3.800v1.600c.6-1 1.900-1.900 3.800-1.900 3.500 0 4.400 2.300 4.400 5.300V20h-4v-5.300c0-1.300 0-2.800-1.800-2.800s-2.200 1.300-2.200 2.700V20h-4z" fill="currentColor"/>',
    tiktok: '<path d="M14 3v11.500a3.500 3.500 0 1 1-3.500-3.500M14 3c.3 2.500 2 4.200 4.500 4.500" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    site: '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.800"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" fill="none" stroke="currentColor" stroke-width="1.500"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="1.800"/><path d="M3 7l9 6 9-6" fill="none" stroke="currentColor" stroke-width="1.800"/>'
  };

  function apply(c) {
    if (!c) return;
    var ev = arr(c.events), ar = arr(c.articles), tm = arr(c.team), st = c.settings || {};

    if (ev.length) {
      var t = today();
      var up = ev.filter(function (e) { return (e.end || e.start || '') >= t; }).sort(function (a, b) { return String(a.start).localeCompare(String(b.start)); });
      var past = ev.filter(function (e) { return (e.end || e.start || '') < t; }).sort(function (a, b) { return String(b.start).localeCompare(String(a.start)); });
      var strip = $('#strip'); if (strip && past.length) strip.innerHTML = past.map(eventCard).join('');
      var upl = $('#upl'), mission = $('#upcoming'), title = $('#evtitle');
      if (upl && mission) {
        if (up.length) { upl.innerHTML = up.map(upcomingCard).join(''); mission.style.display = 'none'; if (title) title.innerHTML = 'Prochaines <em>missions.</em>'; }
        else { upl.innerHTML = ''; mission.style.display = ''; }
      }
    }
    if (ar.length) {
      var box = $('.arts');
      if (box) box.innerHTML = ar.sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); }).map(articleItem).join('');
    }
    if (tm.length) {
      var track = $('#hstrack');
      if (track) {
        $$('.pcard:not(.join)', track).forEach(function (n) { n.remove(); });
        var join = $('.pcard.join', track);
        var html = tm.map(teamCard).join('');
        if (join) join.insertAdjacentHTML('beforebegin', html); else track.insertAdjacentHTML('beforeend', html);
      }
    }

    /* réglages */
    if (st.heroLead) { var lead = $('#hcopy .lead'); if (lead) lead.textContent = st.heroLead; }
    if (st.whatsapp) window.AIA_WA = String(st.whatsapp).replace(/\D/g, '');
    if (st.whatsapp) $$('a[href^="https://wa.me/"]').forEach(function (a) { a.href = 'https://wa.me/' + window.AIA_WA; });
    if (st.phone) {
      var tel = 'tel:' + String(st.phone).replace(/[^\d+]/g, '');
      $$('a[href^="tel:"]').forEach(function (a) { a.href = tel; if (!a.querySelector('svg') && /\d/.test(a.textContent)) a.textContent = st.phone; });
    }
    if (st.facebook && url(st.facebook)) $$('a[href="https://www.facebook.com/Association.Ivoirienne.Astronomie"]').forEach(function (a) { a.href = url(st.facebook); });
    if (st.facebookReels && url(st.facebookReels)) $$('a[href$="/reels_tab"]').forEach(function (a) { a.href = url(st.facebookReels); });
    if (st.followers) $$('footer .fcol a[href*="facebook.com"]').forEach(function (a) { if (/abonnés/.test(a.textContent)) a.textContent = st.followers + ' abonnés sur Facebook'; });
    var soc = $('footer .soc');
    if (soc) {
      arr(st.networks).forEach(function (n) {
        if (!n || !url(n.url)) return;
        var k = ICONS[n.type] ? n.type : 'site', lbl = n.label || n.type || 'Site';
        soc.insertAdjacentHTML('beforeend', '<a href="' + esc(url(n.url)) + '" target="_blank" rel="noopener" aria-label="' + esc(lbl) + '" title="' + esc(lbl) + '"><svg viewBox="0 0 24 24">' + ICONS[k] + '</svg></a>');
      });
      if (st.email) {
        var ul = soc.nextElementSibling;
        if (ul && ul.tagName === 'UL') ul.insertAdjacentHTML('beforeend', '<li><a href="mailto:' + esc(st.email) + '">' + esc(st.email) + '</a></li>');
      }
    }
    if (st.banner && !sessionStorage.getItem('aia-banner-closed')) {
      var b = D.createElement('div'); b.className = 'annonce'; b.setAttribute('role', 'status');
      var l2 = url(st.bannerLink);
      b.innerHTML = '<span>' + esc(st.banner) + '</span>' + (l2 ? '<a href="' + esc(l2) + '"' + (/^https?:/.test(l2) ? ' target="_blank" rel="noopener"' : '') + '>' + esc(st.bannerLabel || 'En savoir plus') + '</a>' : '') + '<button type="button" aria-label="Fermer l\'annonce">×</button>';
      b.querySelector('button').onclick = function () { b.remove(); try { sessionStorage.setItem('aia-banner-closed', '1'); } catch (e) { } };
      D.body.appendChild(b);
    }
    if (window.ScrollTrigger) setTimeout(function () { window.ScrollTrigger.refresh(); }, 150);
  }

  load().then(apply);
})();
