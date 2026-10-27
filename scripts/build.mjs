// Generates the two hand-made images the README uses:
//   assets/header.svg      portrait, white backdrop knocked out, graded dark
//   assets/skill-radar.svg two radar charts drawn from RADARS below
// Run from the repo root:  node scripts/build.mjs

import { readFileSync, writeFileSync } from 'node:fs';

// Self-assessed, 0 to 100. Edit these and rerun the script.
const RADARS = [
  {
    title: 'skill areas',
    axes: [
      ['Frontend', 80], ['Backend', 80], ['Databases', 75], ['Blockchain', 75],
      ['Security', 65], ['DSA', 65], ['Git &amp; tools', 80],
    ],
  },
  {
    title: 'languages',
    axes: [
      ['JavaScript', 85], ['Java', 70], ['Python', 65],
      ['SQL', 75], ['Solidity', 70], ['C', 60],
    ],
  },
];

const BG = '#0d1117';     // GitHub dark canvas, so the panels sit flush there
const GREEN = '#39d353';
const GRID = '#30363d';
const MUTED = '#8b949e';
const MONO = "ui-monospace,SFMono-Regular,'SF Mono',Menlo,Consolas,monospace";

// Collects keyframes for one SMIL track. Each frame is [time 0..1, value,
// ease into the next frame]; frames at the same time make an instant jump.
function track(frames) {
  const EASE = '.45 0 .25 1', LINEAR = '0 0 1 1';
  return `values="${frames.map(f => f[1]).join(';')}" keyTimes="${frames.map(f => f[0].toFixed(5)).join(';')}" ` +
    `calcMode="spline" keySplines="${frames.slice(0, -1).map(f => (f[2] ? EASE : LINEAR)).join(';')}"`;
}

function header() {
  const jpg = readFileSync('assets/portrait.jpg').toString('base64');
  const W = 840, H = 400, S = 360, x = (W - S) / 2, y = 20;
  // The photo is already lit orange on a dark field, so it only needs its
  // square edges dissolved into the panel. A soft glow behind it breathes.
  //
  // It comes out of a printer whose slot runs along the bottom of the panel.
  // Each cycle the head shuttles across the slot laying down one swath, then
  // the sheet feeds up by a swath; passes alternate direction like an inkjet.
  // Once the sheet is out, the printer fades and a shine crosses the photo.
  // SMIL rather than CSS: clip geometry animated from CSS is not supported
  // everywhere an <img>-embedded SVG gets drawn.
  const ROWS = 20, PRINT = 8, START = 0.5, PASS = 0.78;
  const band = S / ROWS, slot = y + S, f = (n) => n.toFixed(2), eps = 0.0002;
  const timing = `dur="${PRINT}s" begin="${START}s" fill="freeze"`;
  const done = `begin="${START + PRINT}s" fill="freeze"`;

  // Rows already printed grow in whole swaths; discrete, so no easing needed.
  const rowsKT = Array.from({ length: ROWS + 1 }, (_, i) => (i / ROWS).toFixed(5)).join(';');
  const doneH = Array.from({ length: ROWS + 1 }, (_, i) => f(i * band)).join(';');
  const swathY = Array.from({ length: ROWS + 1 }, (_, i) => f(y + Math.min(i, ROWS - 1) * band)).join(';');

  const swathX = [], swathW = [], headX = [], feed = [];
  for (let i = 0; i < ROWS; i++) {
    const ltr = i % 2 === 0, last = i === ROWS - 1;
    const t0 = i / ROWS, tp = (i + PASS) / ROWS, t1 = (i + 1) / ROWS;
    const from = ltr ? x : x + S, to = ltr ? x + S : x;
    swathX.push([t0, f(from), true], [tp, f(x), false]);
    swathW.push([t0, '0', true], [tp, f(S), false]);
    headX.push([t0, `${f(from)},${slot}`, true], [tp, `${f(to)},${slot}`, false]);
    // Sheet offset that puts swath i right at the slot, then the feed to i+1.
    feed.push([t0, `0,${f(S - (i + 1) * band)}`, false], [tp, `0,${f(S - (i + 1) * band)}`, !last]);
    if (!last) { swathX.push([t1 - eps, f(x), false]); swathW.push([t1 - eps, f(S), false]); }
  }
  const end = (a) => { if (a[a.length - 1][0] < 1) a.push([1, a[a.length - 1][1], false]); return a; };
  feed.push([1, '0,0', false]);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <style>
    .glow { animation: breathe 6s ease-in-out infinite; }
    .led { animation: blink .5s steps(2, jump-none) infinite; }
    @keyframes breathe { 0%,100% { opacity: .45; } 50% { opacity: .8; } }
    @keyframes blink { 0% { opacity: 1; } 100% { opacity: .25; } }
  </style>
  <defs>
    <radialGradient id="fade" cx="50%" cy="45%" r="52%">
      <stop offset="55%" stop-color="#fff"/>
      <stop offset="100%" stop-color="#000"/>
    </radialGradient>
    <mask id="vignette"><rect x="${x}" y="${y}" width="${S}" height="${S}" fill="url(#fade)"/></mask>
    <clipPath id="printed">
      <rect x="${x}" y="${y}" width="${S}" height="0">
        <animate attributeName="height" values="${doneH}" keyTimes="${rowsKT}" calcMode="discrete" ${timing}/>
      </rect>
      <rect x="${x}" y="${y}" width="0" height="${f(band)}">
        <animate attributeName="y" values="${swathY}" keyTimes="${rowsKT}" calcMode="discrete" ${timing}/>
        <animate attributeName="x" ${track(end(swathX))} ${timing}/>
        <animate attributeName="width" ${track(end(swathW))} ${timing}/>
      </rect>
    </clipPath>
    <clipPath id="above-slot"><rect x="0" y="0" width="${W}" height="${slot}"/></clipPath>
    <radialGradient id="ember" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#e8590c" stop-opacity=".5"/>
      <stop offset="100%" stop-color="#e8590c" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="body" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#2d333d"/>
      <stop offset="1" stop-color="#14181e"/>
    </linearGradient>
    <linearGradient id="beam" x1="0" x2="1">
      <stop offset="0" stop-color="#ff8a3d" stop-opacity="0"/>
      <stop offset=".5" stop-color="#ffb37a"/>
      <stop offset="1" stop-color="#ff8a3d" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="shine" x1="0" x2="1">
      <stop offset="0" stop-color="#fff" stop-opacity="0"/>
      <stop offset=".5" stop-color="#fff" stop-opacity=".28"/>
      <stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>
    <radialGradient id="mist" cx="50%" cy="100%" r="80%">
      <stop offset="0" stop-color="#ffcf9e" stop-opacity=".75"/>
      <stop offset="1" stop-color="#ffcf9e" stop-opacity="0"/>
    </radialGradient>
    <filter id="soft" x="-20%" y="-200%" width="140%" height="500%"><feGaussianBlur stdDeviation="3"/></filter>
  </defs>
  <rect width="${W}" height="${H}" rx="12" fill="${BG}"/>
  <ellipse class="glow" cx="${W / 2}" cy="${y + S * 0.5}" rx="${S * 0.7}" ry="${S * 0.55}" fill="url(#ember)"/>

  <g clip-path="url(#above-slot)">
    <g transform="translate(0,${f(S - band)})">
      <animateTransform attributeName="transform" type="translate" ${track(feed)} ${timing}/>
      <g mask="url(#vignette)">
        <image href="data:image/jpeg;base64,${jpg}" x="${x}" y="${y}" width="${S}" height="${S}" clip-path="url(#printed)"/>
      </g>
    </g>
  </g>

  <g mask="url(#vignette)" style="mix-blend-mode:screen">
    <rect x="${x - 160}" y="${y}" width="140" height="${S}" fill="url(#shine)" transform="skewX(-18)" opacity="0">
      <animate attributeName="x" from="${x - 160}" to="${x + S + 300}" dur="1.4s" ${done} calcMode="spline" keySplines=".45 0 .25 1" keyTimes="0;1"/>
      <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;.15;.85;1" dur="1.4s" ${done}/>
    </rect>
  </g>

  <g>
    <animate attributeName="opacity" from="1" to="0" dur=".7s" ${done}/>
    <animateTransform attributeName="transform" type="translate" from="0,0" to="0,14" dur=".7s" ${done} calcMode="spline" keySplines=".45 0 .25 1" keyTimes="0;1"/>
    <rect x="${x - 40}" y="${slot + 2}" width="${S + 80}" height="16" rx="8" fill="url(#body)" stroke="#3a414b"/>
    <rect x="${x - 24}" y="${slot}" width="${S + 48}" height="4" rx="2" fill="url(#beam)" filter="url(#soft)" opacity=".9"/>
    <rect x="${x - 24}" y="${slot + 1}" width="${S + 48}" height="1.5" fill="url(#beam)"/>
    <circle class="led" cx="${x + S + 26}" cy="${slot + 10}" r="2.2" fill="${GREEN}"/>
    <g transform="translate(${x},${slot})">
      <animateTransform attributeName="transform" type="translate" ${track(end(headX))} ${timing}/>
      <ellipse cx="0" cy="-2" rx="22" ry="${f(band * 0.8)}" fill="url(#mist)"/>
      <rect x="-28" y="-20" width="56" height="26" rx="7" fill="url(#body)" stroke="#525b67"/>
      <rect x="-22" y="-17" width="44" height="1.2" rx=".6" fill="#ffffff" opacity=".18"/>
      <rect x="-16" y="1" width="6" height="2.5" rx="1" fill="#00b7eb"/>
      <rect x="-7" y="1" width="6" height="2.5" rx="1" fill="#ec008c"/>
      <rect x="2" y="1" width="6" height="2.5" rx="1" fill="#ffe600"/>
      <rect x="11" y="1" width="6" height="2.5" rx="1" fill="#c9d1d9"/>
      <circle class="led" cx="20" cy="-10" r="1.8" fill="#ff8a3d"/>
    </g>
  </g>
</svg>
`;
}

function radar({ title, axes }, cx, cy, r) {
  const n = axes.length;
  const pt = (i, f) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    return [cx + Math.cos(a) * r * f, cy + Math.sin(a) * r * f];
  };
  const ring = (f) => axes.map((_, i) => pt(i, f).map(v => v.toFixed(1)).join(',')).join(' ');
  const rings = [0.25, 0.5, 0.75, 1]
    .map(f => `<polygon points="${ring(f)}" fill="none" stroke="${GRID}"/>`).join('');
  const spokes = axes
    .map((_, i) => { const [x, y] = pt(i, 1); return `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="${GRID}"/>`; })
    .join('');
  const shape = axes.map(([, v], i) => pt(i, v / 100).map(c => c.toFixed(1)).join(',')).join(' ');
  const dots = axes
    .map(([, v], i) => { const [x, y] = pt(i, v / 100); return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3" fill="${GREEN}"/>`; })
    .join('');
  const labels = axes.map(([name, v], i) => {
    const [x, y] = pt(i, 1.2);
    const anchor = Math.abs(x - cx) < 4 ? 'middle' : x > cx ? 'start' : 'end';
    return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="${anchor}" class="lbl">${name}<tspan class="val"> ${v}</tspan></text>`;
  }).join('');
  return `<g>
    <text x="${cx}" y="${cy - r - 44}" text-anchor="middle" class="ttl">${title}</text>
    ${rings}${spokes}
    <g class="shape" style="transform-origin:${cx}px ${cy}px">
      <polygon points="${shape}" fill="${GREEN}" fill-opacity=".22" stroke="${GREEN}" stroke-width="2" stroke-linejoin="round"/>
      ${dots}
    </g>
    ${labels}
  </g>`;
}

function radars() {
  const W = 840, H = 400;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <style>
    text { font-family: ${MONO}; }
    .ttl { fill: #c9d1d9; font-size: 15px; font-weight: 600; }
    .lbl { fill: ${MUTED}; font-size: 12px; dominant-baseline: middle; }
    .val { fill: ${GREEN}; }
    .shape { animation: grow 1.4s cubic-bezier(.2,.7,.2,1) both; }
    g + g .shape { animation-delay: .25s; }
    @keyframes grow { from { transform: scale(0); opacity: 0; } to { transform: scale(1); opacity: 1; } }
  </style>
  <rect width="${W}" height="${H}" rx="12" fill="${BG}"/>
  ${radar(RADARS[0], 210, 215, 120)}
  ${radar(RADARS[1], 630, 215, 120)}
</svg>
`;
}

writeFileSync('assets/header.svg', header());
writeFileSync('assets/skill-radar.svg', radars());
console.log('wrote assets/header.svg, assets/skill-radar.svg');
