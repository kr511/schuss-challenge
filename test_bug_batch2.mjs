/**
 * Regression: Bug-Batch-2 (20 Bugs aus 7 Dateien)
 */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const profile   = await readFile(new URL('./ProfileView.js',        import.meta.url), 'utf8');
const friends   = await readFile(new URL('./friends.js',            import.meta.url), 'utf8');
const chat      = await readFile(new URL('./chat-view.js',          import.meta.url), 'utf8');
const fpv       = await readFile(new URL('./friend-profile-view.js',import.meta.url), 'utf8');
const reward    = await readFile(new URL('./reward-system.js',      import.meta.url), 'utf8');
const lb        = await readFile(new URL('./leaderboard-modern.js', import.meta.url), 'utf8');
const supa      = await readFile(new URL('./supabase-social.js',    import.meta.url), 'utf8');
const app       = await readFile(new URL('./app.js',                import.meta.url), 'utf8');

// ── ProfileView: Bug 1 — syncProfile() nicht definiert ──────────────────
console.log('Bug 1: ProfileView.syncProfile() jetzt definiert');
assert.match(profile, /syncProfile:\s*renderProfile/, 'syncProfile muss als Alias exportiert werden');
assert.ok(!profile.includes("onclick=\"ProfileView.syncProfile()\"") || profile.includes('syncProfile: renderProfile'),
  'syncProfile muss verfügbar sein');
console.log('  ✓');

// ── ProfileView: Bug 13 — kein .catch() auf renderProfile ───────────────
console.log('Bug 13: renderProfile/renderLiveTicker haben .catch()');
assert.match(profile, /renderProfile\(\)\.catch/, '.catch() auf renderProfile');
assert.match(profile, /renderLiveTicker\(\)\.catch/, '.catch() auf renderLiveTicker');
console.log('  ✓');

// ── ProfileView: Bug 18 — EnhancedAnalytics ohne Guard ──────────────────
console.log('Bug 18: EnhancedAnalytics wird mit Guard aufgerufen');
assert.match(profile, /window\.EnhancedAnalytics && typeof window\.EnhancedAnalytics\.getPersonalBests/,
  'Guard vor EnhancedAnalytics');
assert.match(profile, /best && best\.score != null/, 'null-Guard für best.score');
assert.ok(!profile.includes('EnhancedAnalytics.getPersonalBests()') ||
  profile.includes('window.EnhancedAnalytics &&'),
  'Ungeschützter EnhancedAnalytics-Zugriff entfernt');
console.log('  ✓');

// ── friends.js: Bug 7 — force=true bypass _initInProgress ───────────────
console.log('Bug 7: _initInProgress blockiert auch force=true');
assert.match(friends, /if \(_initInProgress\) return true/, 'Guard ohne !force');
assert.ok(!friends.includes('if (!force && _initInProgress)'), 'Alter Guard mit !force entfernt');
console.log('  ✓');

// ── friends.js: Bug 8 — bootstrapRetryTimer nie gecancellt ──────────────
console.log('Bug 8: bootstrapRetryTimer wird nach erfolgreichem init gecancellt');
assert.match(friends, /function _clearRetryTimer/, '_clearRetryTimer Hilfsfunktion vorhanden');
assert.match(friends, /_clearRetryTimer\(\)/, '_clearRetryTimer wird aufgerufen');
console.log('  ✓');

// ── chat-view.js: Bug 2 — popstate Listener leakt bei re-open ───────────
console.log('Bug 2: Alter popstate-Handler wird vor Neuregistrierung entfernt');
assert.match(chat, /if \(state\.popHandler\)[\s\S]{0,100}removeEventListener\('popstate', state\.popHandler\)/,
  'removeEventListener vor neuem popstate');
console.log('  ✓');

// ── chat-view.js: Bug 10 — kein Send-Guard ──────────────────────────────
console.log('Bug 10: sendMessage hat Guard gegen Doppelsend');
assert.match(chat, /isSending:\s*false/, 'isSending im State');
assert.match(chat, /state\.isSending\) return/, 'Guard in sendMessage');
assert.match(chat, /finally.*isSending = false/s, 'isSending im finally zurückgesetzt');
console.log('  ✓');

// ── chat-view.js: Bug 11 — markRead ohne .catch() ───────────────────────
console.log('Bug 11: markRead hat .catch()');
assert.match(chat, /markRead\(client, myId, friendId\)\.catch/, '.catch() auf markRead');
console.log('  ✓');

// ── friend-profile-view.js: Bug 3 — doppelter Click-Listener ───────────
console.log('Bug 3: friend-profile-view wireActions hat Guard');
assert.match(fpv, /ov\._fpWired/, '_fpWired Guard');
assert.match(fpv, /if \(!ov \|\| ov\._fpWired\) return/, 'Guard vor addEventListener');
console.log('  ✓');

// ── friend-profile-view.js: Bug 19 — > 0 versteckt Null-Werte ──────────
console.log('Bug 19: barRow nutzt >= 0 statt > 0 für Count-Stats');
assert.match(fpv, /Number\.isFinite\(me\) && me >= 0/, '>= 0 Guard für me');
assert.match(fpv, /Number\.isFinite\(them\) && them >= 0/, '>= 0 Guard für them');
console.log('  ✓');

// ── reward-system.js: Bug 4 — forceLootbox Counter-Reset falsch ─────────
console.log('Bug 4: forceLootbox setzt Counter auf 0');
assert.match(reward, /forceLootbox\(\)[\s\S]{0,50}duelsSinceLastLootbox = 0/,
  'duelsSinceLastLootbox = 0 in forceLootbox');
assert.ok(!reward.match(/forceLootbox[\s\S]{0,100}duelsSinceLastLootbox = this\.config\.lootboxInterval/),
  'Alter Reset-Wert entfernt');
console.log('  ✓');

// ── reward-system.js: Bug 12 — unhandled promise in animateLootbox ──────
console.log('Bug 12: animateLootbox hat .catch() und finally');
assert.match(reward, /animateLootbox[\s\S]{0,300}\.catch/, '.catch() auf animateLootbox');
assert.match(reward, /animateLootbox[\s\S]{0,400}\.finally/, '.finally() auf animateLootbox');
console.log('  ✓');

// ── leaderboard-modern.js: Bug 20 — applyFilters ohne scope ─────────────
console.log('Bug 20: applyFilters übergibt currentScope');
assert.match(lb, /currentScope:\s*'global'/, 'currentScope Property initialisiert');
assert.match(lb, /this\.currentScope = scope/, 'currentScope wird in load() gesetzt');
assert.match(lb, /this\.render\(filtered, this\.currentScope\)/, 'currentScope in applyFilters übergeben');
console.log('  ✓');

// ── supabase-social.js: Bug 6 — update() Fehler nicht geprüft ───────────
console.log('Bug 6: Challenge-Status-Update Fehler wird geprüft');
assert.match(supa, /completed\.error\) throw completed\.error/, 'update() Fehlerprüfung');
console.log('  ✓');

// ── supabase-social.js: Bug 17 — duplicate detection zu eng ─────────────
console.log('Bug 17: Duplicate-Detection prüft auch .details');
assert.match(supa, /inserted\.error\.details/, '.details in Fehlerprüfung');
assert.match(supa, /includes\('unique'\)/, "auch 'unique' Constraint geprüft");
console.log('  ✓');

// ── app.js: Bug 14 — Division durch G.maxShots = 0 ──────────────────────
console.log('Bug 14: G.maxShots Guard vor Division');
assert.match(app, /G\.maxShots > 0 \? \(fired \/ G\.maxShots\)/, 'Guard vor Division');
console.log('  ✓');

// ── app.js: Bug 15 — doppelter DOMContentLoaded ─────────────────────────
console.log('Bug 15: Nur ein DOMContentLoaded Listener');
const domListeners = [...app.matchAll(/addEventListener\('DOMContentLoaded'/g)];
assert.ok(domListeners.length === 1, `Genau 1 DOMContentLoaded Listener (gefunden: ${domListeners.length})`);
assert.match(app, /refreshPremiumDashboard.*DOMContentLoaded|DOMContentLoaded[\s\S]{0,200}refreshPremiumDashboard/,
  'refreshPremiumDashboard im einzigen DOMContentLoaded');
console.log('  ✓');

// ── app.js: Bug 16 — fbSubmitPending stuck bei Exception ────────────────
console.log('Bug 16: fbSubmitPending im finally zurückgesetzt');
assert.match(app, /finally\s*\{\s*\n?\s*fbSubmitPending = false/, 'finally Block für fbSubmitPending');
console.log('  ✓');

console.log('\n✅ Alle 17 Bug-Batch-2-Regressionstests bestanden.');
