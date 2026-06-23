# Mobile PWA QA – Schützen Challenge

Stand: Mai 2026 | Beta-Stabilisierung

## Testgeräte & Browser

| Gerät | OS | Browser | Status |
|---|---|---|---|
| iPhone 14 Pro | iOS 17 | Safari | Pflicht |
| iPad Air (M1) | iPadOS 17 | Safari | Pflicht |
| Pixel 8 | Android 14 | Chrome | Pflicht |
| Samsung Galaxy A54 | Android 14 | Samsung Internet | Gut-haben |

---

## Checkliste: PWA-Grundfunktionen

### Installation

- [ ] „Zum Home-Bildschirm hinzufügen" erscheint auf iOS Safari
- [ ] „App installieren"-Banner erscheint auf Android Chrome
- [ ] App-Icon + Name „Schützen Challenge" auf Home-Screen korrekt
- [ ] Splash-Screen beim Start (kein weißes Aufblitzen)
- [ ] Standalone-Modus aktiv (keine Browser-Adressleiste im App-Fenster)

### Offline-Verhalten

- [ ] App startet ohne Netzwerk (Cached Shell lädt)
- [ ] `offline.html` erscheint bei Navigation ohne Netz
- [ ] Quick-Training-Ergebnisse werden lokal gespeichert (`sd_`-Prefix in localStorage)
- [ ] Nach Wiederverbindung: Sync-Badge erscheint und Upload läuft durch
- [ ] `/api/*`-Requests werden nicht gecacht (SW passthrough korrekt)

### Service Worker

- [ ] `sw.js` registriert sich ohne Fehler in DevTools → Application → Service Workers
- [ ] Cache-Version bei Release erhöht (`CACHE_VERSION` in `sw.js` + `?v=X.X` in `index.html`)
- [ ] Kein Stale-Asset-Problem nach Update: Nutzer bekommt neue Version beim nächsten App-Start

---

## Checkliste: Scroll & Touch

### Scroll-Lock bei Modals

Kritisch auf iOS Safari – fehlende Restore führt zu komplettem Scroll-Freeze der App.

- [ ] Feedback-Modal öffnen → Hintergrund nicht scrollbar → Modal schließen → Seite wieder scrollbar
- [ ] Quick-Training-Detail öffnen/schließen → kein Scroll-Freeze
- [ ] Freundesanfrage-Dialog öffnen/schließen → kein Scroll-Freeze
- [ ] `body.style.overflow` und `position` werden **synchron** (nicht in `requestAnimationFrame`) restauriert
- [ ] Overlay-Tap schließt Modal und restauriert Scroll

### Touchziele

- [ ] Alle Buttons mindestens 44 × 44 pt (Apple HIG)
- [ ] Kein unbeabsichtigtes Doppel-Submit durch schnelles Doppeltippen
  - Quick-Training „Speichern": Button disabled während Request läuft
  - Duell-Ergebnis „Weiter": Einmalig auslösbar
- [ ] Horizontal swipeable Tabs ohne seitliches Überlaufen

---

## Checkliste: Authentifizierung

- [ ] Google OAuth-Login startet auf Mobile (Safari/Chrome)
- [ ] Redirect nach Login landet korrekt in der App (kein `localhost`-Leak)
- [ ] Abgebrochener OAuth-Flow zeigt deutschen Fehlertext (kein JS-Absturz)
- [ ] Auth-Gate: ohne Login → lokaler Spielmodus verfügbar
- [ ] Auth-Gate: nach Login → Profil-Daten geladen, kein CORS-Fehler

---

## Checkliste: Disziplinen & Spielmodi

| Disziplin | Kurzcheck |
|---|---|
| LG 40 (Luftgewehr) | Duell starten, Ergebnis sehen |
| LG 60 | Ergebnis-Berechnung korrekt |
| KK 50 | Bot-Punktebereich plausibel |
| KK 100 | Dito |
| KK 3×20 | Positions-Wechsel (liegend/kniend/stehend) wird angezeigt |

- [ ] Bot-Schussduell: Schwierigkeiten easy / real / hard / elite starten durch
- [ ] Punkte-Anzeige: keine NaN, keine Null-Scores
- [ ] Async-Duell: Herausforderung senden → Gegner empfängt Einladung

---

## Checkliste: Online-Status & Social

- [ ] Online-Indikator erscheint wenn Netz verfügbar, verschwindet offline
- [ ] Freundesliste lädt korrekt (keine leere Liste bei angemeldetem User mit Freunden)
- [ ] Freundesanfrage-Flow: senden → empfangen → akzeptieren funktioniert end-to-end
- [ ] Leaderboard lädt (öffentlich, kein Login erforderlich)

---

## Checkliste: Scanner (Beta)

Der Score-Scanner ist als **Beta** gekennzeichnet und optional.

- [ ] Kamera-Permission-Dialog erscheint korrekt (nicht zweimal)
- [ ] Scanner-Ansicht schließt sauber (kein Memory-Leak bei wiederholtem Öffnen/Schließen)
- [ ] Monitor-vs-Papier-Klassifikation (TF.js) läuft on-device – kein Netzwerk-Traffic mit Bilddaten
- [ ] Bei fehlender Kamera: saubere Fehlermeldung statt Crash

---

## Bekannte iOS-Safari-Gotchas

| Problem | Workaround im Code |
|---|---|
| `position: fixed` + Scroll friert nach Modal-Schließen ein | `overflow` synchron restaurieren, kein `requestAnimationFrame` |
| `vh`-Einheit berücksichtigt nicht die Browser-Toolbar | Nutze `dvh` oder `window.innerHeight` für Vollbild-Layouts |
| `getUserMedia` nur über HTTPS verfügbar | In Produktion kein Problem; lokal HTTPS oder wrangler dev nutzen |
| PWA ohne Standalone friert Inputs ein | `viewport-fit=cover` in Manifest und Meta-Tag gesetzt |

---

## Offene Punkte (Stand Beta)

| Priorität | Problem | Status |
|---|---|---|
| Hoch | Scroll-Freeze nach Feedback-Modal auf iOS 17 Safari noch nicht verifiziert | Testen |
| Mittel | Samsung Internet: Fonts laden träge (kein Impact) | Beobachten |
| Niedrig | Kamera-Permission nach erstem Ablehnen nicht erneut anforderbar (Browser-Einschränkung) | Dokumentiert |

---

## Reproduktion eines Fehlers

1. Gerät im Flugzeugmodus → App öffnen → Offline-Mode testen
2. `chrome://inspect` (Android) oder Safari Web Inspector (iOS) anschließen
3. Console-Errors und Network-Tab prüfen
4. `localStorage` Inhalt prüfen: `sd_`-Keys für lokale Trainingsdaten
