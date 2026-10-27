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

function header() {
  const jpg = readFileSync('assets/portrait.jpg').toString('base64');
  const W = 840, H = 400, S = 360, x = (W - S) / 2, y = 20;
  // The photo is already lit orange on a dark field, so it only needs its
  // square edges dissolved into the panel, with a still glow behind it.
  //
  // It develops in from the top behind a soft edge: a tall gradient, opaque
  // above and clear below, slides down the frame. SMIL rather than CSS,
  // because mask geometry animated from CSS is not supported everywhere an
  // <img>-embedded SVG gets drawn.
  const REVEAL = 4, START = 0.3, FEATHER = 0.12;
  // The soft edge is the bottom of the gradient, so whatever it has passed
  // stays covered. It starts just above the frame and ends just below it.
  const from = y - S * 2, to = y - S + S * FEATHER * 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <radialGradient id="fade" cx="50%" cy="45%" r="52%">
      <stop offset="55%" stop-color="#fff"/>
      <stop offset="100%" stop-color="#000"/>
    </radialGradient>
    <mask id="vignette"><rect x="${x}" y="${y}" width="${S}" height="${S}" fill="url(#fade)"/></mask>
    <linearGradient id="edge" x1="0" y1="0" x2="0" y2="1">
      <stop offset="${1 - FEATHER}" stop-color="#fff"/>
      <stop offset="1" stop-color="#000"/>
    </linearGradient>
    <mask id="develop" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}">
      <rect x="${x}" y="${from}" width="${S}" height="${S * 2}" fill="url(#edge)">
        <animate attributeName="y" from="${from}" to="${to}" dur="${REVEAL}s" begin="${START}s" fill="freeze"
          calcMode="spline" keyTimes="0;1" keySplines=".3 .1 .3 1"/>
      </rect>
    </mask>
    <radialGradient id="ember" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#e8590c" stop-opacity=".35"/>
      <stop offset="100%" stop-color="#e8590c" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" rx="12" fill="${BG}"/>
  <ellipse cx="${W / 2}" cy="${y + S * 0.5}" rx="${S * 0.7}" ry="${S * 0.55}" fill="url(#ember)"/>
  <g mask="url(#vignette)">
    <g mask="url(#develop)">
      <image href="data:image/jpeg;base64,${jpg}" x="${x}" y="${y}" width="${S}" height="${S}"/>
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
