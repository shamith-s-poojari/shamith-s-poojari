// Generates the two hand-made images the README uses, and points the README
// at them:
//   assets/header-<hash>.svg      portrait printed in under a soft glow
//   assets/skill-radar-<hash>.svg two radar charts drawn from RADARS below
// Run from the repo root:  node scripts/build.mjs

import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';

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
const ACCENT = '#ffffff';
const GRID = '#30363d';
const MUTED = '#8b949e';
const MONO = "ui-monospace,SFMono-Regular,'SF Mono',Menlo,Consolas,monospace";

function header() {
  const jpg = readFileSync('assets/portrait.jpg').toString('base64');
  const W = 840, H = 400, S = 360, x = (W - S) / 2, y = 20;
  // The photo is already lit orange on a dark field, so it only needs its
  // square edges dissolved into the panel. A soft glow behind it breathes.
  //
  // It is printed in, row by row, under a glowing print head. SMIL rather
  // than CSS, because animating a clip rect's height from CSS is not
  // supported everywhere an <img>-embedded SVG gets drawn.
  const ROWS = 60, PRINT = 4.5;
  const band = S / ROWS;
  const steps = Array.from({ length: ROWS + 1 }, (_, i) => (i * band).toFixed(2));
  const heights = steps.join(';');
  const heads = steps.map(h => (y + Number(h) - 2.5).toFixed(2)).join(';');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <style>
    .glow { animation: breathe 6s ease-in-out infinite; }
    @keyframes breathe { 0%,100% { opacity: .45; } 50% { opacity: .8; } }
  </style>
  <defs>
    <radialGradient id="fade" cx="50%" cy="45%" r="52%">
      <stop offset="55%" stop-color="#fff"/>
      <stop offset="100%" stop-color="#000"/>
    </radialGradient>
    <mask id="vignette"><rect x="${x}" y="${y}" width="${S}" height="${S}" fill="url(#fade)"/></mask>
    <clipPath id="printed">
      <rect x="${x}" y="${y}" width="${S}" height="0">
        <animate attributeName="height" values="${heights}" dur="${PRINT}s" begin=".4s" calcMode="discrete" fill="freeze"/>
      </rect>
    </clipPath>
    <linearGradient id="head" x1="0" x2="1">
      <stop offset="0" stop-color="#ffb37a" stop-opacity="0"/>
      <stop offset=".5" stop-color="#ffc999"/>
      <stop offset="1" stop-color="#ffb37a" stop-opacity="0"/>
    </linearGradient>
    <filter id="soft" x="-10%" y="-300%" width="120%" height="700%"><feGaussianBlur stdDeviation="3"/></filter>
    <radialGradient id="ember" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#e8590c" stop-opacity=".5"/>
      <stop offset="100%" stop-color="#e8590c" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" rx="12" fill="${BG}"/>
  <ellipse class="glow" cx="${W / 2}" cy="${y + S * 0.5}" rx="${S * 0.7}" ry="${S * 0.55}" fill="url(#ember)"/>
  <g mask="url(#vignette)">
    <image href="data:image/jpeg;base64,${jpg}" x="${x}" y="${y}" width="${S}" height="${S}" clip-path="url(#printed)"/>
  </g>
  <rect x="${x + S * 0.1}" y="${y}" width="${S * 0.8}" height="5" fill="url(#head)" filter="url(#soft)" opacity="0">
    <animate attributeName="y" values="${heads}" dur="${PRINT}s" begin=".4s" calcMode="discrete" fill="freeze"/>
    <animate attributeName="opacity" values="0;.6;.6;0" keyTimes="0;.02;.96;1" dur="${PRINT}s" begin=".4s" fill="freeze"/>
  </rect>
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
    .map(([, v], i) => { const [x, y] = pt(i, v / 100); return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3" fill="${ACCENT}"/>`; })
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
      <polygon points="${shape}" fill="${ACCENT}" fill-opacity=".22" stroke="${ACCENT}" stroke-width="2" stroke-linejoin="round"/>
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
    .val { fill: ${ACCENT}; }
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

// GitHub's raw CDN and browsers both cache these for minutes, and the CDN
// drops query strings, so each build gets a content-hashed filename and the
// README is pointed at it. Unchanged content keeps its old name.
let readme = readFileSync('README.md', 'utf8');
for (const [name, svg] of [['header', header()], ['skill-radar', radars()]]) {
  const file = `assets/${name}-${createHash('sha1').update(svg).digest('hex').slice(0, 8)}.svg`;
  for (const old of readdirSync('assets')) {
    if (new RegExp(`^${name}(-[0-9a-f]{8})?\\.svg$`).test(old) && `assets/${old}` !== file) unlinkSync(`assets/${old}`);
  }
  writeFileSync(file, svg);
  readme = readme.replace(new RegExp(`assets/${name}(-[0-9a-f]{8})?\\.svg`, 'g'), file);
  console.log(`wrote ${file}`);
}
writeFileSync('README.md', readme);
