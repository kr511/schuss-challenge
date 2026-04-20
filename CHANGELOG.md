# Changelog

Alle wichtigen Änderungen an diesem Projekt werden in dieser Datei dokumentiert.

Das Format basiert lose auf [Keep a Changelog](https://keepachangelog.com/de/1.1.0/), und das Projekt folgt [Semantic Versioning](https://semver.org/lang/de/). Für technische Deep-Dives zu einzelnen Bugfixes siehe `BUGFIXES.md`.

## [4.1.1] – 2026-04-20

Hotfix-Patch für Cache-Staleness der v4.1-Fixes.

### Fixed
- Friends-Button (👥) im Dashboard war nach v4.1-Deploy unklickbar, weil der Service-Worker den alten `friends.js?v=4.1` lieferte, der `window.FriendsSystem` erst nach `init()` setzte. Cache-Invalidation via `?v=4.1.1` und `CACHE_VERSION=v4.1.1`.
- Profile-Overlay (`showFriendProfileOverlay`) in `friends.js` jetzt self-contained — keine harte Abhängigkeit mehr auf das nicht geladene `friends-ui.js`.
- `.friends-overlay` bekommt `visibility:hidden` im Inaktiv-Zustand, verhindert „Code kopieren / Freund hinzufügen"-Durchsickern beim Scrollen auf Mobile.

### Changed
- Service-Worker `PRECACHE` vervollständigt: `friends.js`, `async-challenge.js`, `updates.js`, `modern-ux.js`, `reward-system.js`, `ProfileView.js`, `mobile-responsive.js`, `gemini-ai.js`, `modern-animations.css` explizit gelistet.

## [4.1.0] – 2026-04-19

Social & Multiplayer Quick-Wins – alle Tier-1-Features.

### Added
- **Freundes-Profil-Overlay**: 👤-Button in der Freundesliste öffnet Profil-Karte mit persönlichen Bestwerten und direktem Herausforderungs-Button (`friends-ui.js`).
- **Challenge-Kommentar**: Beim Erstellen einer Challenge kann ein kurzer Text (max. 120 Zeichen) mitgeschickt werden – erscheint im Accept-Toast und im Ergebnis-Overlay.
- **Revanche-Button**: Nach jedem Async-Duell-Ergebnis direkt eine Revanche mit den Original-Settings starten.
- **Leaderboard Zeitraum-Filter**: Heute / Woche / Gesamt — Daily & Weekly nutzen Worker-API (`/api/leaderboard?period=`), Gesamt lädt weiterhin aus Firebase.
- **Leaderboard Nur-Freunde-Filter**: „👥 Nur Freunde" blendet alle Einträge aus, die nicht zum eigenen Freundeskreis gehören (`SocialSystem.getFriends()`).
- **Challenge-Button verdrahtet**: 🎯-Button in der Freundesliste ruft jetzt `AsyncChallenge.createChallenge(uid, username)` auf (vorher nur Alert).

### Fixed
- Syntax-Bug in `async-challenge.js:19`: `availableChallenges` hatte keinen Wert, was zu einem `SyntaxError: Unexpected token ':'` führte.
- XSS: `escapeHtml` jetzt durchgängig in Challenge-Overlay-Render-Pfaden (`async-challenge.js`, `friends-ui.js`).

## [4.0.0] – 2026-04-19

Erstes Major-Release nach umfassender Security-Härtung, Backend-Validierung und Stabilisierung der Sync-Pipeline.

### Security
- XSS-Härtung: `escapeHtml()` wird konsequent beim Rendern von Badges, Dashboard-Greeting und Feedback-Titeln angewendet.
- Backend-Validierung: UUID v4 Format-Check, Zod-Schemas für alle API-Payloads, strikte `FeedbackStatus`-Enum-Prüfung.
- CORS-Hardening und `ADMIN_USER_IDS`-Whitelist für Admin-Endpunkte im Cloudflare Worker.
- Neue Migration `0002` mit zusätzlichen Constraints in der D1-Datenbank.

### Added
- Test-Suite: `test_api_direct.mjs` (14 Backend-Tests) und `test_xss_direct.mjs` (32 XSS-Tests) – 46/46 grün.
- `npm test`-Script kombiniert API- und XSS-Suite.
- `version`-Felder in `package.json` und `manifest.json` für einheitliches Release-Schema.
- `CHANGELOG.md` (diese Datei) als kuratierte Release-Historie.

### Changed
- Cloud-Sync-Debounce für kritische Events (XP, Battle-Result, Streak) von 2000 ms → 500 ms für spürbar schnellere Konsistenz.
- Service-Worker-Cache auf `schussduell-v4.0` gebumpt; alte Caches werden beim `activate` automatisch gelöscht.
- Einheitliches `?v=4.0` für alle JS/CSS-Query-Strings in `index.html`.

### Fixed
- Duel-Setup-Modal: Blur-Layer bleibt beim Öffnen nicht mehr aktiv.
- Phase 2 Hardening (B13–B16): Abgearbeiteter TypeScript-Debt, strengere Typen im Worker.
- Phase 0+1 Bug-Remediation: 10 Bugs gefixt (Edge-Cases bei Auth, Sync, Reward-Cooldown, API-Validierung).

## [3.4.0] – 2026-04-14

Stabilitäts- und Kompatibilitäts-Release. Technische Langfassung siehe `BUGFIXES.md`.

### Fixed
- **Critical**: Share-Overlay restauriert `body.overflow` jetzt auch beim Schließen über X-Button oder Klick auf Kind-Elemente.
- **Critical**: iOS-Safari Profile-Overlay – asynchroner `overflow`-Reset verhindert Scroll-Block bei Orientation-Change.
- **Critical**: Null-Check für `DOM.shotLogWrap` in `startBattle` – verhindert Crash bei frühem Zugriff.
- **Medium**: Race-Condition in `autoScrollShotLog` während Burst-Mode behoben (Double-rAF + Debounce 100 ms → 50 ms).
- **Medium**: iOS-Safari Orientation-Change – Target-Redraw mit 200 ms Delay.
- **Medium**: Null-Check für `DOM.slPills` im 3×20-Modus.

### Changed
- Stabile anonyme User-ID für Challenges (Cache-Version-Bump auf `v3.4`).
- Core-Integrity-, Security- und Stabilitäts-Fixes in Sync, Physics, API-Validierung und Reward-Cooldown.
