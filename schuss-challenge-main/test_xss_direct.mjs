// Headless XSS tests — replays the same logic as verify_xss.html in jsdom.
import { JSDOM } from 'jsdom';

const dom = new JSDOM(`<!doctype html><html><body>
  <div id="pdGreeting"></div>
  <div id="pdUserName"></div>
  <div id="badgesGrid"></div>
  <div id="fbResultTitle"></div>
</body></html>`);
const { window } = dom;
const document = window.document;

// ─── Copies of the FIXED functions ────────────────────────────
function escHtml(s) {
  return String(s ?? '').replace(/[&<>"'`/]/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;',
    '"': '&quot;', "'": '&#39;', '`': '&#x60;', '/': '&#x2F;',
  }[c]));
}

function renderPdGreeting(greeting, name) {
  const pdGreeting = document.getElementById('pdGreeting');
  pdGreeting.textContent = '';
  pdGreeting.textContent = greeting + ', ';
  const nameSpan = document.createElement('span');
  nameSpan.className = 'pd-name';
  nameSpan.id = 'pdUserName';
  nameSpan.style.color = '#7ab030';
  nameSpan.textContent = name || 'Schütze';
  pdGreeting.appendChild(nameSpan);
  pdGreeting.appendChild(document.createTextNode('!'));
}

function renderBadges(displayBadges, unlockedAchievements) {
  const grid = document.getElementById('badgesGrid');
  grid.innerHTML = displayBadges.map(badge => {
    const isUnlocked = unlockedAchievements.includes(badge);
    const rawName = String(badge.name ?? '');
    const nameParts = rawName.length > 12
      ? [rawName.substring(0, 12).split(' ').slice(0, -1).join(' '),
         rawName.substring(12).split(' ').slice(1).join(' ')]
      : rawName.split(' ');
    const nameLines = nameParts.map(p => escHtml(p)).join('<br>');
    const progressText = isUnlocked ? 'Freigeschaltet' : '+' + escHtml(badge.xp) + ' XP';
    return '<div data-badge>'
      + '<div data-icon>' + escHtml(badge.icon) + '</div>'
      + '<div data-name>' + nameLines + '</div>'
      + '<div data-progress>' + progressText + '</div>'
      + '</div>';
  }).join('');
}

function renderFbTitle(data) {
  const meta = { color: '#7ab030', text: 'Sieg' };
  const titleEl = document.getElementById('fbResultTitle');
  const name = data.opponent || data.discipline;
  titleEl.innerHTML = escHtml(name) + ' — <span style="color:' + meta.color + '">' + meta.text + '</span>';
}

// ─── Test Runner ───────────────────────────────────────────────
window.__xssFired = false;
window.__xssProbe = () => { window.__xssFired = true; };

let pass = 0, fail = 0;
function log(ok, label, detail = '') {
  const icon = ok ? '✅' : '❌';
  const color = ok ? '\x1b[32m' : '\x1b[31m';
  console.log(`${color}${icon} ${label}\x1b[0m ${detail}`);
  if (ok) pass++; else fail++;
}

function runCase(label, fn) {
  window.__xssFired = false;
  let error = null;
  try { fn(); } catch (e) { error = e; }
  const ok = !window.__xssFired && !error;
  log(ok, label, error ? '(' + error.message + ')' : '');
}

const PAYLOADS = [
  { label: '<img onerror>',          raw: '<img src=x onerror="window.__xssProbe()">' },
  { label: '<script>',               raw: '<script>window.__xssProbe()</script>' },
  { label: '<svg onload>',           raw: '<svg onload="window.__xssProbe()">' },
  { label: 'quote-break',            raw: '"><img src=x onerror="window.__xssProbe()">' },
  { label: 'backtick/template',      raw: '`${window.__xssProbe()}`' },
  { label: 'closing-tag injection',  raw: '</span><img src=x onerror="window.__xssProbe()">' },
];

console.log('\n── B5 · pdGreeting (DOM-API) ──');
for (const p of PAYLOADS) {
  runCase('B5 pdGreeting · ' + p.label, () => {
    renderPdGreeting('Guten Tag', p.raw);
    const g = document.getElementById('pdGreeting');
    if (g.querySelector('img, svg, script')) throw new Error('injected element found');
  });
}

console.log('\n── B7 · Badge-Grid (escHtml auf name/icon) ──');
for (const p of PAYLOADS) {
  runCase('B7 Badge name · ' + p.label, () => {
    const badge = { name: p.raw, icon: '🎯', xp: 50, category: 'consistency' };
    renderBadges([badge], [badge]);
    const g = document.getElementById('badgesGrid');
    if (g.querySelector('img, svg, script')) throw new Error('injected element found');
  });
}
for (const p of PAYLOADS) {
  runCase('B7 Badge icon · ' + p.label, () => {
    const badge = { name: 'Test', icon: p.raw, xp: 50, category: 'consistency' };
    renderBadges([badge], [badge]);
    const g = document.getElementById('badgesGrid');
    if (g.querySelector('img, svg, script')) throw new Error('injected element found');
  });
}

console.log('\n── B8 · fbResultTitle (escHtml auf name) ──');
for (const p of PAYLOADS) {
  runCase('B8 fbTitle · ' + p.label, () => {
    renderFbTitle({ opponent: p.raw, discipline: 'LG', result: 'win', score: '350' });
    const el = document.getElementById('fbResultTitle');
    if (el.querySelector('img, svg, script')) throw new Error('injected element found');
  });
}

console.log('\n── escHtml · Unit-Tests ──');
const escTests = [
  ['ampersand', () => escHtml('A & B') === 'A &amp; B'],
  ['tags',      () => escHtml('<img>') === '&lt;img&gt;'],
  ['backtick (neu)',        () => !escHtml('`a`').includes('`')],
  ['forward slash (neu)',   () => !escHtml('</script>').includes('/')],
  ['null → ""',             () => escHtml(null) === ''],
  ['undefined → ""',        () => escHtml(undefined) === ''],
  ['quotes',                () => escHtml(`"'`) === '&quot;&#39;'],
  ['already-escaped → &amp;amp;', () => escHtml('&amp;') === '&amp;amp;'],
];
for (const [label, fn] of escTests) {
  try { log(fn(), 'escHtml · ' + label); } catch (e) { log(false, 'escHtml · ' + label, '(' + e.message + ')'); }
}

console.log('\n─────────────────────────────────────────────');
if (fail === 0) {
  console.log(`\x1b[32m  ✅ ${pass}/${pass} XSS-Tests passed — alle Frontend-Fixes halten.\x1b[0m`);
  process.exit(0);
} else {
  console.log(`\x1b[31m  ❌ ${fail}/${pass + fail} XSS-Tests failed\x1b[0m`);
  process.exit(1);
}
