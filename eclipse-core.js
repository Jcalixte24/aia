/* eclipse-core.js : calcul des éclipses (Soleil et Lune) depuis n'importe quel lieu, par catalogue.
   Soleil : éléments de Bessel de la NASA (Fred Espenak, GSFC) + méthode de J. Meeus / NASA Explanatory Supplement.
   Lune   : heures du maximum et durées du catalogue NASA ; hauteur de la Lune calculée (Soleil basse précision).
   https://eclipse.gsfc.nasa.gov/SEbeselm/  ·  https://eclipse.gsfc.nasa.gov/LEdecade/
   Précision : contacts de l'ordre de la seconde, occultation à ±0,2 point près. */
(function (root) {
  var D2R = Math.PI / 180, R2D = 180 / Math.PI;

  /* ---------- Catalogue ---------- */
  function S(date, type, t0, dT, tf1, tf2, x, y, d, l1, l2, mu, zones) {
    var p = date.split('-').map(Number);
    return { id: date, kind: 'solar', type: type, date: date, zones: zones || '',
      e: { t0: t0, dT: dT, tf1: tf1, tf2: tf2, x: x, y: y, d: d, l1: l1, l2: l2, mu: mu,
           epochUT: Date.UTC(p[0], p[1] - 1, p[2], t0, 0, 0) - dT * 1000 } };
  }
  function L(date, type, greatestTD, umbral, partialMin, totalMin, dT, zones) {
    return { id: date + 'L', kind: 'lunar', type: type, date: date, zones: zones || '',
      greatest: Date.parse(date + 'T' + greatestTD + 'Z') - dT * 1000, umbral: umbral, partialMin: partialMin, totalMin: totalMin };
  }

  var CATALOG = [
    L('2026-08-28', 'partial', '04:14:04', 0.930, 198, 0, 71.3, 'Pacifique est, Amériques, Europe, Afrique'),
    S('2027-02-06', 'annular', 16, 71.6, 0.0047426, 0.0047190,
      [0.111743, 0.4664823, -0.0000325, -0.0000032], [-0.273277, 0.2031840, 0.0001025, -0.0000025],
      [-15.54794, 0.012383, -0.000004, 0], [0.571927, -0.0000653, -0.0000101, 0], [0.025661, -0.0000650, -0.0000100, 0], [56.49306, 15.000512, 0, 0],
      'Chili, Argentine, Uruguay, Atlantique sud, puis Côte d\'Ivoire (Abidjan), Ghana, Togo, Bénin, Nigeria'),
    L('2027-02-20', 'penumbral', '23:14:06', -0.057, 0, 0, 71.6, 'Amériques, Europe, Afrique, Asie'),
    L('2027-07-18', 'penumbral', '16:04:09', -1.068, 0, 0, 71.7, 'Afrique est, Asie, Australie, Pacifique'),
    S('2027-08-02', 'total', 10, 71.7, 0.0046064, 0.0045834,
      [-0.019645, 0.5447105, -0.0000444, -0.0000091], [0.160063, -0.2111569, -0.0001217, 0.0000037],
      [17.76247, -0.010181, -0.000004, 0], [0.530596, 0.0000138, -0.0000128, 0], [-0.015464, 0.0000137, -0.0000128, 0], [328.42249, 15.002093, 0, 0],
      'Espagne, Maroc, Algérie, Tunisie, Libye, Égypte (Louxor), Soudan, Arabie saoudite, Yémen, Somalie'),
    L('2027-08-17', 'penumbral', '07:14:59', -0.525, 0, 0, 71.7, 'Pacifique, Amériques'),
    S('2028-01-26', 'annular', 15, 71.9, 0.0047501, 0.0047264,
      [-0.205226, 0.4742711, -0.0000377, -0.0000070], [0.340278, 0.1738579, 0.0000968, -0.0000020],
      [-18.72825, 0.010073, 0.000005, 0], [0.574116, 0.0000420, -0.0000099, 0], [0.027839, 0.0000418, -0.0000099, 0], [41.89120, 14.998972, 0, 0],
      'Équateur, Colombie, Venezuela, Guyana, Suriname, Atlantique, Portugal, Espagne'),
    L('2028-01-12', 'partial', '04:14:13', 0.066, 56, 0, 71.9, 'Amériques, Europe, Afrique'),
    L('2028-07-06', 'partial', '18:20:57', 0.389, 141, 0, 72.2, 'Europe, Afrique, Asie, Australie'),
    L('2028-12-31', 'total', '16:53:15', 1.246, 209, 71, 72.5, 'Europe, Afrique, Asie, Australie, Pacifique'),
    L('2029-06-26', 'total', '03:23:22', 1.844, 220, 102, 73, 'Amériques, Europe, Afrique, Moyen-Orient'),
    L('2029-12-20', 'total', '22:43:12', 1.117, 213, 54, 74, 'Amériques, Europe, Afrique, Asie'),
    L('2030-06-15', 'partial', '18:34:34', 0.502, 144, 0, 76, 'Europe, Afrique, Asie, Australie'),
    S('2030-06-01', 'annular', 6, 76.9, 0.0046120, 0.0045890,
      [-0.269346, 0.5056356, 0.0000191, -0.0000058], [0.551976, 0.0210146, -0.0001586, -0.0000001],
      [22.06130, 0.005582, -0.000006, 0], [0.566149, -0.0000130, -0.0000097, 0], [0.019911, -0.0000129, -0.0000097, 0], [270.53992, 14.999707, 0, 0],
      'Algérie, Tunisie, Grèce, Turquie, Russie, Chine, Japon (Hokkaido)'),
    L('2030-12-09', 'penumbral', '22:28:51', -0.163, 0, 0, 77, 'Amériques, Europe, Afrique, Asie'),
    S('2030-11-25', 'total', 7, 77.3, 0.0047361, 0.0047125,
      [0.044200, 0.5787731, 0.0000157, -0.0000099], [-0.392726, -0.0551896, 0.0001744, 0.0000008],
      [-20.76100, -0.007989, 0.000005, 0], [0.538213, -0.0000379, -0.0000130, 0], [-0.007886, -0.0000377, -0.0000130, 0], [288.27457, 14.998360, 0, 0],
      'Namibie, Botswana, Afrique du Sud, Australie'),
    S('2031-05-21', 'annular', 7, 77.6, 0.0046208, 0.0045978,
      [-0.114762, 0.5112374, 0.0000074, -0.0000059], [-0.211215, 0.0579329, -0.0001182, -0.0000006],
      [20.15915, 0.008339, -0.000005, 0], [0.562404, 0.0000807, -0.0000100, 0], [0.016185, 0.0000802, -0.0000100, 0], [285.85107, 15.000616, 0, 0],
      'Angola, RD Congo, Zambie, Tanzanie, océan Indien, Sri Lanka, Malaisie'),
    L('2031-05-07', 'penumbral', '03:52:02', -0.090, 0, 0, 77.6, 'Amériques, Europe, Afrique'),
    S('2031-11-14', 'hybrid', 21, 77.9, 0.0047260, 0.0047025,
      [-0.019800, 0.5509453, 0.0000338, -0.0000087], [0.314937, -0.0890646, 0.0001047, 0.0000012],
      [-18.33681, -0.010535, 0.000005, 0], [0.547773, -0.0001068, -0.0000120, 0], [0.001627, -0.0001063, -0.0000119, 0], [138.89400, 14.999763, 0, 0],
      'Pacifique'),
    L('2032-04-25', 'total', '15:14:51', 1.191, 211, 66, 78, 'Afrique, Asie, Australie, Pacifique'),
    S('2032-05-09', 'annular', 13, 78.2, 0.0046310, 0.0046079,
      [-0.074307, 0.5359519, 0.0000052, -0.0000073], [-0.965423, 0.0954054, -0.0000701, -0.0000012],
      [17.59291, 0.010694, -0.000004, 0], [0.548851, 0.0001272, -0.0000112, 0], [0.002700, 0.0001266, -0.0000112, 0], [15.88910, 15.001745, 0, 0],
      'Atlantique sud, Afrique australe'),
    L('2032-10-18', 'total', '19:03:40', 1.103, 196, 47, 78.4, 'Afrique, Europe, Asie, Australie'),
    S('2032-11-03', 'partial', 6, 78.6, 0.0047141, 0.0046906,
      [0.449308, 0.5120148, 0.0000178, -0.0000058], [0.990812, -0.1128682, 0.0000451, 0.0000013],
      [-15.23991, -0.012633, 0.000003, 0], [0.562604, -0.0001127, -0.0000106, 0], [0.016384, -0.0001121, -0.0000105, 0], [274.11911, 15.001218, 0, 0], ''),
    S('2033-03-30', 'total', 18, 78.9, 0.0046807, 0.0046574,
      [-0.318785, 0.5554225, 0.0000227, -0.0000094], [0.924678, 0.1756610, -0.0000800, -0.0000029],
      [4.09368, 0.015719, -0.000001, 0], [0.534941, 0.0000276, -0.0000130, 0], [-0.011141, 0.0000275, -0.0000129, 0], [88.92808, 15.004456, 0, 0],
      'Alaska, Russie'),
    L('2033-04-14', 'total', '19:13:51', 1.094, 215, 49, 78.9, 'Europe, Afrique, Asie, Australie'),
    S('2033-09-23', 'partial', 14, 79.2, 0.0046607, 0.0046375,
      [-0.309952, 0.4815372, 0.0000086, -0.0000048], [-1.117031, -0.1545432, 0.0000478, 0.0000016],
      [-0.33982, -0.015845, 0, 0], [0.568897, 0.0000318, -0.0000098, 0], [0.022646, 0.0000316, -0.0000097, 0], [31.94244, 15.004807, 0, 0], ''),
    L('2033-10-08', 'total', '10:56:23', 1.350, 202, 79, 79.2, 'Asie, Australie, Pacifique, Amériques'),
    S('2034-03-20', 'total', 10, 79.5, 0.0046951, 0.0046718,
      [-0.259593, 0.5481665, 0.0000230, -0.0000094], [0.220828, 0.1755788, -0.0000080, -0.0000028],
      [-0.05513, 0.016042, 0, 0], [0.538630, -0.0000665, -0.0000127, 0], [-0.007470, -0.0000662, -0.0000126, 0], [328.13922, 15.004398, 0, 0], ''),
    L('2034-04-03', 'penumbral', '19:06:59', -0.227, 0, 0, 79.5, 'Europe, Afrique, Asie, Australie'),
    S('2034-09-12', 'annular', 16, 79.9, 0.0046461, 0.0046230,
      [-0.280883, 0.5028280, -0.0000115, -0.0000056], [-0.324349, -0.1577848, -0.0000008, 0.0000019],
      [3.97191, -0.015534, -0.000001, 0], [0.557800, 0.0001188, -0.0000106, 0], [0.011604, 0.0001182, -0.0000105, 0], [60.94970, 15.004902, 0, 0], ''),
    L('2034-09-28', 'partial', '02:47:37', 0.014, 27, 0, 79.9, 'Amériques, Europe, Afrique'),
    L('2035-08-19', 'partial', '01:12:15', 0.104, 77, 0, 80.3, 'Amériques, Europe, Afrique, Moyen-Orient')
  ];
  CATALOG.forEach(function (c) { c.time = c.kind === 'solar' ? c.e.epochUT + 0 : c.greatest; });
  CATALOG.sort(function (a, b) { return a.time - b.time; });

  /* ---------- Soleil : éléments de Bessel ---------- */
  function poly(c, t) { return c[0] + t * (c[1] + t * (c[2] + t * c[3])); }
  function observer(latDeg, h) {
    var phi = latDeg * D2R, u = Math.atan(0.99664719 * Math.tan(phi)), hh = (h || 0) / 6378140;
    return { s: 0.99664719 * Math.sin(u) + hh * Math.sin(phi), c: Math.cos(u) + hh * Math.cos(phi), phi: phi };
  }
  function obscuration(S, M, m) {
    if (m >= S + M) return 0;
    if (m <= Math.abs(S - M)) return S >= M ? (M * M) / (S * S) : 1;
    var a = (m * m + S * S - M * M) / (2 * m * S), b = (m * m + M * M - S * S) / (2 * m * M);
    var A = S * S * Math.acos(a) + M * M * Math.acos(b) - 0.5 * Math.sqrt((-m + S + M) * (m + S - M) * (m - S + M) * (m + S + M));
    return A / (Math.PI * S * S);
  }
  function at(E, t, latDeg, lonEast, h) {
    var o = observer(latDeg, h), d = poly(E.d, t) * D2R, H = (poly(E.mu, t) + lonEast) * D2R;
    var x = poly(E.x, t), y = poly(E.y, t);
    var xi = o.c * Math.sin(H), eta = o.s * Math.cos(d) - o.c * Math.sin(d) * Math.cos(H), zeta = o.s * Math.sin(d) + o.c * Math.cos(d) * Math.cos(H);
    var u = x - xi, v = y - eta, L1 = poly(E.l1, t) - zeta * E.tf1, L2 = poly(E.l2, t) - zeta * E.tf2;
    var m = Math.sqrt(u * u + v * v), Sr = (L1 + L2) / 2, Mr = (L1 - L2) / 2;
    var alt = Math.asin(Math.sin(o.phi) * Math.sin(d) + Math.cos(o.phi) * Math.cos(d) * Math.cos(H)) * R2D;
    var az = (Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(o.phi) - Math.tan(d) * Math.cos(o.phi)) * R2D + 180 + 360) % 360;
    /* angle de position du centre de la Lune par rapport au Soleil (vers le haut du ciel) pour le dessin */
    var north = Math.atan2(u, v);          // direction (est, nord) de l'ombre dans le plan fondamental
    return { t: t, u: u, v: v, m: m, L1: L1, L2: L2, S: Sr, M: Mr, mag: (L1 - m) / (L1 + L2), obsc: obscuration(Sr, Mr, m), alt: alt, az: az, north: north };
  }
  function bisect(f, a, b) { var fa = f(a); for (var i = 0; i < 60; i++) { var c = (a + b) / 2, fc = f(c); if ((fa < 0) === (fc < 0)) { a = c; fa = fc; } else b = c; } return (a + b) / 2; }
  function toDate(E, t) { return new Date(E.epochUT + t * 3600e3); }

  function solarLocal(E, latDeg, lonEast, h) {
    var g = function (t) { return at(E, t, latDeg, lonEast, h); };
    var lo = -3.5, hi = 3.5, i, a, b;
    for (i = 0; i < 90; i++) { a = lo + (hi - lo) / 3; b = hi - (hi - lo) / 3; if (g(a).m < g(b).m) hi = b; else lo = a; }
    var tm = (lo + hi) / 2, mx = g(tm), r = { kind: 'solar', tMax: tm, max: mx, dateMax: toDate(E, tm), visible: mx.m < mx.L1 };
    if (!r.visible) return r;
    var p1 = bisect(function (t) { var s = g(t); return s.m - s.L1; }, tm - 3.5, tm), p4 = bisect(function (t) { var s = g(t); return s.m - s.L1; }, tm, tm + 3.5);
    r.c1 = { t: p1, date: toDate(E, p1), s: g(p1) }; r.c4 = { t: p4, date: toDate(E, p4), s: g(p4) };
    r.central = mx.L2 !== 0 && mx.m < Math.abs(mx.L2);
    r.annular = r.central && mx.L2 > 0; r.total = r.central && mx.L2 < 0;
    if (r.central) {
      var a2 = bisect(function (t) { var s = g(t); return s.m - Math.abs(s.L2); }, tm - 1.2, tm), a3 = bisect(function (t) { var s = g(t); return s.m - Math.abs(s.L2); }, tm, tm + 1.2);
      r.c2 = { t: a2, date: toDate(E, a2), s: g(a2) }; r.c3 = { t: a3, date: toDate(E, a3), s: g(a3) };
      r.centralSeconds = (a3 - a2) * 3600;
    }
    r.sunAbove = mx.alt > -0.8 || r.c1.s.alt > -0.8;          // le Soleil est visible à un moment de l'éclipse
    return r;
  }

  function centralPoint(E, t) {
    var x = poly(E.x, t), y = poly(E.y, t), d = poly(E.d, t) * D2R, r2 = x * x + y * y;
    if (r2 >= 1) return null;
    var zeta = Math.sqrt(1 - r2), phiP = Math.asin(y * Math.cos(d) + zeta * Math.sin(d));
    var H = Math.atan2(x, zeta * Math.cos(d) - y * Math.sin(d)) * R2D, lon = ((H - poly(E.mu, t) + 540) % 360) - 180;
    return { lat: Math.atan(Math.tan(phiP) / 0.99664719 / 0.99664719) * R2D, lon: lon };
  }
  /* point du globe au plus près de l'axe de l'ombre (éclipse partielle : l'axe passe à côté de la Terre) */
  function shadowFootprint(E, t) {
    var x = poly(E.x, t), y = poly(E.y, t), d = poly(E.d, t) * D2R, r2 = x * x + y * y, k = r2 > 0.9999 ? 0.9999 / Math.sqrt(r2) : 1;
    x *= k; y *= k; r2 = x * x + y * y;
    var zeta = Math.sqrt(1 - r2), phiP = Math.asin(y * Math.cos(d) + zeta * Math.sin(d));
    var H = Math.atan2(x, zeta * Math.cos(d) - y * Math.sin(d)) * R2D, lon = ((H - poly(E.mu, t) + 540) % 360) - 180;
    return { lat: Math.atan(Math.tan(phiP) / 0.99664719 / 0.99664719) * R2D, lon: lon, onEarth: r2 < 1 && x * x + y * y === r2 };
  }

  /* ---------- Soleil / Lune : position basse précision (±0,02°) ---------- */
  function sunEq(ms) {
    var n = ms / 864e5 + 2440587.5 - 2451545.0;
    var Lm = (280.460 + 0.9856474 * n) % 360, g = ((357.528 + 0.9856003 * n) % 360) * D2R;
    var lam = (Lm + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) * D2R, eps = (23.439 - 0.0000004 * n) * D2R;
    var ra = Math.atan2(Math.cos(eps) * Math.sin(lam), Math.cos(lam)), dec = Math.asin(Math.sin(eps) * Math.sin(lam));
    var gmst = ((280.46061837 + 360.98564736629 * n) % 360 + 360) % 360;
    return { ra: ra * R2D, dec: dec * R2D, gmst: gmst };
  }
  /* hauteur de la Lune en opposition au Soleil, au lieu donné (déclinaison lunaire ≈ −déclinaison solaire ; erreur ≤ 1,3°) */
  function moonAlt(ms, latDeg, lonEast, gammaApprox) {
    var q = sunEq(ms), ra = (q.ra + 180) % 360, dec = -q.dec + (gammaApprox || 0) * 0.9;
    var H = (q.gmst + lonEast - ra) * D2R, phi = latDeg * D2R, de = dec * D2R;
    return { alt: Math.asin(Math.sin(phi) * Math.sin(de) + Math.cos(phi) * Math.cos(de) * Math.cos(H)) * R2D,
             az: (Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(phi) - Math.tan(de) * Math.cos(phi)) * R2D + 180 + 360) % 360 };
  }
  function lunarLocal(c, latDeg, lonEast) {
    var G = c.greatest, r = { kind: 'lunar', dateMax: new Date(G), type: c.type };
    var half = function (min) { return min * 30000; };
    r.max = { mag: c.umbral, alt: moonAlt(G, latDeg, lonEast).alt, az: moonAlt(G, latDeg, lonEast).az };
    if (c.partialMin) { r.u1 = new Date(G - half(c.partialMin)); r.u4 = new Date(G + half(c.partialMin)); }
    if (c.totalMin) { r.u2 = new Date(G - half(c.totalMin)); r.u3 = new Date(G + half(c.totalMin)); }
    var ends = [r.u1, r.u4].filter(Boolean).map(function (d) { return moonAlt(d.getTime(), latDeg, lonEast).alt; });
    r.altStart = ends[0]; r.altEnd = ends[1];
    r.visible = c.umbral > 0 && (r.max.alt > -0.5 || (ends.length && Math.max.apply(null, ends) > -0.5));
    r.moonUp = r.max.alt > 0;
    return r;
  }

  /* ---------- sélection de « l'éclipse la plus proche » ---------- */
  function endTime(c) { return c.kind === 'solar' ? c.e.epochUT + 3.6 * 3600e3 : c.greatest + (c.partialMin || 180) * 30000 + 3600e3; }
  var TYPES = { annular: 'annulaire', total: 'totale', hybrid: 'hybride', partial: 'partielle', penumbral: 'par la pénombre' };
  function title(c) {
    if (c.kind === 'solar') return 'Éclipse ' + (c.type === 'hybrid' ? 'hybride' : TYPES[c.type]) + ' de Soleil';
    return c.type === 'penumbral' ? 'Éclipse de Lune par la pénombre' : 'Éclipse ' + TYPES[c.type] + ' de Lune';
  }
  function summary(c, lat, lon) {
    var r = c.kind === 'solar' ? solarLocal(c.e, lat, lon) : lunarLocal(c, lat, lon);
    var notable, label;
    if (c.kind === 'solar') {
      var pc = r.visible ? r.max.obsc * 100 : 0;
      notable = r.visible && r.sunAbove && r.max.obsc >= 0.10;
      label = !r.visible || pc < 0.5 ? 'Non visible' : !r.sunAbove ? 'Soleil couché' :
        r.central ? (r.annular ? 'Annulaire · ' : 'Totale · ') + Math.round(pc) + ' %' : 'Partielle · ' + (pc < 1 ? '< 1' : Math.round(pc)) + ' %';
    } else {
      notable = r.visible && c.umbral >= 0.15 && r.moonUp;
      label = c.umbral <= 0 ? 'Pénombrale (à peine visible)' : !r.visible ? "Lune sous l'horizon" : (c.type === 'total' ? 'Totale' : 'Partielle') + (r.moonUp ? ' · visible' : ' · Lune basse');
    }
    return { c: c, r: r, notable: notable, label: label };
  }
  /* l'éclipse la plus proche dans le temps (hors éclipses de Lune par la pénombre, quasi invisibles) */
  function nextEclipse(nowMs, lat, lon) {
    var list = CATALOG.filter(function (c) { return endTime(c) >= nowMs && c.type !== 'penumbral'; });
    if (!list.length) list = CATALOG.filter(function (c) { return endTime(c) >= nowMs; });
    return list.length ? summary(list[0], lat, lon) : null;
  }
  /* la prochaine éclipse réellement observable depuis le lieu */
  function nextVisible(nowMs, lat, lon) {
    var list = CATALOG.filter(function (c) { return endTime(c) >= nowMs; });
    for (var i = 0; i < list.length; i++) { var s = summary(list[i], lat, lon); if (s.notable) return s; }
    return null;
  }
  function upcoming(nowMs, lat, lon, n) {
    return CATALOG.filter(function (c) { return endTime(c) >= nowMs; }).slice(0, n || 8).map(function (c) { return summary(c, lat, lon); });
  }

  var api = { CATALOG: CATALOG, solarLocal: solarLocal, lunarLocal: lunarLocal, at: at, centralPoint: centralPoint, shadowFootprint: shadowFootprint,
              title: title, TYPES: TYPES, toDate: toDate, obscuration: obscuration, moonAlt: moonAlt, sunEq: sunEq, nextEclipse: nextEclipse, nextVisible: nextVisible, upcoming: upcoming, summary: summary, endTime: endTime, poly: poly };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.ECL = api;
})(typeof window !== 'undefined' ? window : this);
