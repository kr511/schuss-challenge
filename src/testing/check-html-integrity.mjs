import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const htmlPath = resolve(rootDir, 'index.html');
const html = readFileSync(htmlPath, 'utf8');
const htmlWithoutComments = html.replace(/<!--[\s\S]*?-->/g, '');
const tabNavigation = readFileSync(resolve(rootDir, 'tab-navigation.js'), 'utf8');

function getAttr(tag, name) {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'i'));
  return match ? (match[1] ?? match[2] ?? '').trim() : '';
}

function duplicates(items) {
  const seen = new Map();
  for (const item of items) {
    seen.set(item, (seen.get(item) || 0) + 1);
  }
  return [...seen.entries()].filter(([, count]) => count > 1);
}

const errors = [];

const ids = [...htmlWithoutComments.matchAll(/\bid\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)]
  .map(match => match[1] ?? match[2])
  .filter(Boolean);

for (const [id, count] of duplicates(ids)) {
  errors.push(`Duplicate id "${id}" appears ${count} times.`);
}

const scriptTags = [...htmlWithoutComments.matchAll(/<script\b[^>]*>/gi)].map(match => match[0]);
const scriptSrcs = scriptTags
  .map(tag => getAttr(tag, 'src'))
  .filter(Boolean)
  .map(src => src.replace(/&amp;/g, '&'));

for (const [src, count] of duplicates(scriptSrcs)) {
  errors.push(`Duplicate script source "${src}" appears ${count} times.`);
}

// Linked stylesheets. Overlays mit `position:fixed` brauchen ihr CSS, sonst
// bleiben sie als in-flow Block im Dokument und erzeugen Phantom-Scrollraum.
const linkTags = [...htmlWithoutComments.matchAll(/<link\b[^>]*>/gi)].map(match => match[0]);
const styleHrefs = linkTags
  .filter(tag => /\brel\s*=\s*(?:"stylesheet"|'stylesheet')/i.test(tag))
  .map(tag => getAttr(tag, 'href'))
  .filter(Boolean)
  .map(href => href.replace(/&amp;/g, '&'));

// duel-setup.css wird zur Laufzeit injiziert; alle anderen Overlay-Stylesheets
// müssen statisch verlinkt sein.
const requiredOverlayStylesheets = [
  { marker: /\bic-overlay\b/, css: 'image-compare.css', what: 'Foto-Auswertungs-Overlay (#icOverlay)' },
];
for (const { marker, css, what } of requiredOverlayStylesheets) {
  if (marker.test(htmlWithoutComments) && !styleHrefs.some(h => h.split('?')[0].endsWith(css))) {
    errors.push(`${what} ist im HTML, aber "${css}" ist nicht als Stylesheet verlinkt (Overlay bliebe in-flow → Phantom-Scroll).`);
  }
}

const profileTabTags = [...htmlWithoutComments.matchAll(/<[^>]*\bclass\s*=\s*(?:"[^"]*\bps-tab\b[^"]*"|'[^']*\bps-tab\b[^']*')[^>]*>/gi)]
  .map(match => match[0]);
const profileTabs = profileTabTags
  .map(tag => getAttr(tag, 'data-tab'))
  .filter(Boolean);
const panelIds = new Set(ids.filter(id => id.startsWith('psPanel-')));

for (const tab of profileTabs) {
  const expectedPanelId = `psPanel-${tab}`;
  if (!panelIds.has(expectedPanelId)) {
    errors.push(`Profile tab "${tab}" has no matching panel "${expectedPanelId}".`);
  }
}

if (!profileTabs.includes('settings')) {
  errors.push('Profile tab "settings" is missing.');
}

if (!panelIds.has('psPanel-settings')) {
  errors.push('Profile panel "psPanel-settings" is missing.');
}

const hasFriendSortToggle = /\bdata-friend-sort-toggle\b/i.test(htmlWithoutComments);
const friendSortOrders = [...htmlWithoutComments.matchAll(/\bdata-friend-sort\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)]
  .map(match => match[1] ?? match[2]);
const hasLegacySortControls = friendSortOrders.length === 2
  && friendSortOrders.includes('online-first')
  && friendSortOrders.includes('offline-first');
if (!hasFriendSortToggle && !hasLegacySortControls) {
  errors.push('Friend list must expose a sort toggle (data-friend-sort-toggle) or the "online-first"/"offline-first" sort controls.');
}

// Profile topbar buttons moved to Konto mini-tab (V0.8.4 redesign) — check relaxed.

// Dynamic profile header buttons moved to Konto mini-tab (V0.8.4 redesign) — check relaxed.

for (const scannerId of ['v2ScannerView', 'v2ScannerVideo', 'v2ScannerCanvas', 'btnStopLiveScan']) {
  const count = ids.filter(id => id === scannerId).length;
  if (count !== 1) {
    errors.push(`Scanner id "${scannerId}" should appear exactly once, found ${count}.`);
  }
}

// Mobile: viewport-fit=cover muss gesetzt sein, sonst sind alle env(safe-area-inset-*)
// Regeln auf Geräten mit Notch/Home-Indicator wirkungslos.
const viewportTag = (htmlWithoutComments.match(/<meta\b[^>]*\bname\s*=\s*(?:"viewport"|'viewport')[^>]*>/i) || [])[0] || '';
if (!viewportTag) {
  errors.push('Viewport meta tag is missing.');
} else if (!/viewport-fit\s*=\s*cover/i.test(getAttr(viewportTag, 'content'))) {
  errors.push('Viewport meta is missing "viewport-fit=cover" (safe-area insets would be ignored on notched devices).');
}

// Der globale Error-Guard muss eingebunden sein und als erstes Script laden.
const guardIndex = scriptSrcs.findIndex(src => /(^|\/)error-guard\.js(\?|$)/.test(src));
if (guardIndex === -1) {
  errors.push('error-guard.js is not loaded in index.html.');
} else if (guardIndex !== 0) {
  errors.push(`error-guard.js should be the first script (found at position ${guardIndex + 1}).`);
}

if (errors.length) {
  console.error('HTML integrity check failed:');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(`HTML integrity check passed (${ids.length} ids, ${scriptSrcs.length} script sources, ${profileTabs.length} profile tabs).`);
