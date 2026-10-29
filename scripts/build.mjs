// Generates the two hand-made images the README uses, and points the README
// at them:
//   assets/header-<hash>.svg      ASCII portrait beside a neofetch-style panel
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
// Opacity of each portrait shade, darkest first; portrait-ascii.ps1 writes
// as many shades as there are entries here.
const SHADES = [0.13, 0.25, 0.43, 0.63, 0.83, 1];
const MONO ="ui-monospace,SFMono-Regular,'SF Mono',Menlo,Consolas,monospace";

// The terminal panel beside the ASCII portrait, neofetch style. A null key is
// a blank line; a key with no value is a section heading.
const INFO = [
  ['shamith@github'],
  ['-'.repeat(14)],
  ['Name', 'Shamith S Poojari'],
  ['Role', 'Full-stack developer'],
  ['Education', 'B.E. Computer Science, MITE'],
  ['Graduating', '2027'],
  ['Focus', 'Blockchain · Cybersecurity · IoT'],
  ['Location', 'Moodbidri, Karnataka'],
  ['Status', 'Open to internships &amp; roles'],
  [null],
  ['Languages.Code', 'Java, Python, JavaScript, C'],
  ['Languages.Chain', 'Solidity'],
  ['Languages.Data', 'MySQL, PostgreSQL'],
  ['Stack.Web', 'React, Node.js, Express'],
  ['Stack.Tools', 'Git, Postman, VS Code'],
  [null],
  ['Building', 'Chain of Custody'],
  ['Interned', 'Ankyah Nexus, 2026'],
  [null],
  ['Contact'],
  ['Email', 'shamithgoogl@gmail.com'],
  ['LinkedIn', 'shamith-s-poojari'],
  ['Portfolio', 'shamith-s-poojari.github.io'],
];

function header() {
  // Made by scripts/portrait-ascii.ps1 from assets/portrait.jpg.
  // Spaces become no-break spaces, since some renderers collapse leading
  // whitespace in SVG text even with xml:space set.
  const art = readFileSync('assets/portrait-ascii.txt', 'utf8').split(/\r?\n/);
  const esc = (l) => l.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/ /g, ' ');
  const W = 840, H = 440;
  // Terminal cells, twice as tall as wide, so the face keeps its shape. Each
  // row is stretched to an exact width, because monospace fonts differ in
  // how wide a character is and the portrait would squash or spread.
  const ALH = (H - 36) / art.length, ACW = ALH / 2, AFS = ALH / 1.15;
  const IFS = 11.5, ILH = (H - 48) / INFO.length;
  const WIDTH = 52;                        // info line length in characters
  const ax = 22, ay = (H - art.length * ALH) / 2 + AFS, ix = 452, iy = 24 + IFS;
  // Both halves print in top to bottom, a line at a time. SMIL rather than
  // CSS, because CSS animation delays are not honoured everywhere an
  // <img>-embedded SVG gets drawn. Everything is visible by default and the
  // animation hides it until its turn, so anywhere that does not animate
  // (the GitHub mobile app, reduced motion) still shows the finished image.
  const show = (t) => `<animate attributeName="opacity" values="0;1" keyTimes="0;.999" calcMode="discrete" dur="${t.toFixed(2)}s" fill="freeze"/>`;
  // Each row is drawn once per shade, dim to bright, holding only that
  // shade's characters, so the light on the face follows the photo. The
  // layers of a row are all the row's full length and land on one grid.
  const tone = readFileSync('assets/portrait-tone.txt', 'utf8').split(/\r?\n/);
  const rows = art.map((line, i) => {
    const y = (ay + i * ALH).toFixed(1);
    const fit = ` textLength="${(line.length * ACW).toFixed(1)}" lengthAdjust="spacingAndGlyphs"`;
    const layers = SHADES.map((_, s) => {
      const only = [...line].map((ch, c) => (tone[i]?.[c] === String(s) ? ch : ' ')).join('');
      return only.trim() ? `<text x="${ax}" y="${y}" class="art s${s}"${fit}>${esc(only)}</text>` : '';
    }).join('');
    return `<g>${show(0.3 + i * 0.07)}${layers}</g>`;
  }).join('\n  ');
  const len = (s) => s.replace(/&amp;/g, '&').length;
  const lines = INFO.map(([key, value], i) => {
    const y = (iy + i * ILH).toFixed(1);
    if (key == null) return '';
    let body;
    if (i === 0) body = `<tspan class="key">${key}</tspan>`;
    else if (value == null) body = `<tspan class="${i === 1 ? 'dots' : 'key'}">${key}</tspan>`;
    else {
      const dots = '.'.repeat(Math.max(2, WIDTH - key.length - len(value) - 3));
      body = `<tspan class="key">${key}</tspan><tspan class="dots">: ${dots} </tspan><tspan class="val">${value}</tspan>`;
    }
    return `<text x="${ix}" y="${y}" class="info">${body}${show(0.5 + i * 0.1)}</text>`;
  }).filter(Boolean).join('\n  ');
  const cy = iy + INFO.length * ILH - IFS;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <style>
    text { font-family: ${MONO}; white-space: pre; }
    .art { fill: #ffffff; font-size: ${AFS}px; }
    ${SHADES.map((o, s) => `.s${s} { opacity: ${o}; }`).join(' ')}
    .info { font-size: ${IFS}px; }
    .key { fill: #ffffff; font-weight: 700; }
    .dots { fill: #484f58; }
    .val { fill: #c9d1d9; }
    .cursor { animation: blink 1s steps(1) infinite; }
    @keyframes blink { 0% { opacity: 1; } 50% { opacity: 0; } }
  </style>
  <rect width="${W}" height="${H}" rx="12" fill="${BG}"/>
  <g xml:space="preserve">
  ${rows}
  ${lines}
  </g>
  <g>${show(0.5 + INFO.length * 0.1)}
    <rect x="${ix}" y="${(cy + ILH * 0.6).toFixed(1)}" width="${(IFS * 0.6).toFixed(1)}" height="${IFS}" fill="#ffffff" class="cursor"/>
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
