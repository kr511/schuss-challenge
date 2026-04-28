import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const htmlPath = resolve(rootDir, 'index.html');
const html = readFileSync(htmlPath, 'utf8');
const htmlWithoutComments = html.replace(/<!--[\s\S]*?-->/g, '');

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

for (const scannerId of ['v2ScannerView', 'v2ScannerVideo', 'v2ScannerCanvas', 'btnStopLiveScan']) {
  const count = ids.filter(id => id === scannerId).length;
  if (count !== 1) {
    errors.push(`Scanner id "${scannerId}" should appear exactly once, found ${count}.`);
  }
}

if (errors.length) {
  console.error('HTML integrity check failed:');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(`HTML integrity check passed (${ids.length} ids, ${scriptSrcs.length} script sources, ${profileTabs.length} profile tabs).`);
