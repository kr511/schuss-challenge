# Schuss-Challenge — Roadmap

## V0.6 — Tech-Grundlage ✓
- [x] V0.6.1 — adaptive-bot.js aufräumen (Duplikate + Discipline-Key)
- [x] V0.6.2 — best_stats TEXT → JSONB (Migration 0018)
- [x] V0.6.3 — Achievements-Screen im Profil (Mount-Punkt + Tab)

## V0.7 — Security & Feature-Aktivierung ✓
- [x] V0.7.1 — Rate Limiting (Cloudflare KV)
- [x] V0.7.2 — Aktivitäts-Heatmap (Worker-Daten)
- [x] V0.7.3 — Daily-Challenge Post-Game-Hook

## V0.8 — Social + Push + Redesign ✓
- [x] V0.8.1 — Echte Push-Notifications (Web Push API, Migration 0019)
- [x] V0.8.2 — Club-Rangliste (Wöchentlich)
- [x] V0.8.3 — Kader-Vergleich (Freund + Disziplin-Ø)
- [x] V0.8.4 — Visuelles Redesign (Theme + Game-Screens)

## V0.9 — Freundesprofil ✓
- [x] V0.9.1 — Freundesprofil-Overlay (Tabs: Übersicht, H2H, Erfolge, Aktivität)
- [x] V0.9.2 — 6 Stat-Tiles + Head-to-Head-Vergleich
- [x] V0.9.3 — Erfolge-Tab + Aktivitäts-Tab im Freundesprofil

---

## V1.0-Pre — Pilotphase & Strategie-Validation 🔬

> **Muss abgeschlossen sein bevor V1.0-Code beginnt.**
> Council-Erkenntnis: 25 Features ohne validierten User = Wishlist-Dokument.
> Ziel: 1 Verein, 1 Trainer, 10 Schützen, 30 Tage Core-Features → dann V1.0 starten.

- [ ] V1.0-Pre.1 — Wettbewerbsanalyse
  - Direkte Recherche: Sius-Ascor, Megalink, SCATT, TopTarget, Shot Coach, ClubDesk
  - Fragen: Was nutzen DSB-Vereine heute? Welche Lücke besteht wirklich?
  - Output: 1-seitiger Positionierungsvergleich → definiert den echten Differentiator

- [ ] V1.0-Pre.2 — DSGVO-Konzept (vor erstem Pilotverein)
  - Datenschutzerklärung für Vereinsmitglieder (Schusswaffe + Leistung + Standort = sensibel)
  - Datenspeicherung-Übersicht: welche Daten wo, wie lange, Löschkonzept
  - Vereinsvertrag-Template für Pilotpartner
  - Kein Pilot ohne DSGVO-Dokument

- [ ] V1.0-Pre.3 — Community-Validierung via Forum + Pilotverein finden
  - Forum-Post in DSB-nahen Schützen-Foren (z.B. Schützen-Forum.de, Facebook-Gruppen DSB, Reddit r/shooting)
  - Post-Inhalt: kurze Demo (Screenshot/GIF), konkreter Aufruf: "Suche 1 Verein für kostenlosen 30-Tage-Test"
  - Ziel: 3–5 interessierte Trainer/Vorstände identifizieren → dann 1 auswählen
  - Bonus: Forum-Reaktionen zeigen bereits welche Features resonieren und welche Fragen kommen
  - Pilotverein-Onboarding: 10 aktive Schützen, wöchentliches Feedback-Gespräch mit Trainer
  - Alles außer Duel + Profil + Freunde während Pilot gesperrt (Feature-Freeze)

- [ ] V1.0-Pre.4 — Pilot-Auswertung & Business-Modell finalisieren
  - Retention nach 30 Tagen messen (wöchentliche Aktive / Anmeldungen)
  - Trainer-Interview: Welche 3 Features wurden wirklich genutzt?
  - Vereinslizenz-Preisfindung: Ist 50–150€/Jahr realistisch? (direkt fragen)
  - DSB-Partnerschaft: Erstgespräch mit einem Landesverband → offizielles Digitalisierungsprojekt?
  - Go/No-Go-Entscheidung für V1.0 basierend auf Daten, nicht Annahmen

---

## V1.0 — DSB-Vereins-B2B-Launch 🎯

> Modell-Flip gegenüber ursprünglichem Plan (Council-Entscheidung):
> **B2B Vereinslizenz (50–150€/Jahr/Verein)** statt B2C Freemium (2,99€/Mo/Schütze).
> Adoptions-Anker: Trainer-Dashboard. Viral-Loop: Club-vs-Club.
> OCR-Feature erst nach Pilot-Evaluation (nicht in V1.0 versprochen).
>
> **Design-Screens (2026-06-25):** Aktivitäten-Tab (Social Feed), Benachrichtigungen-Center,
> Premium-Modal, KI-Coach-Modal — alle 4 neuen Screens 1:1 nach Handoff implementiert.
> Bottom Nav: Start | Training | Aktivitäten | Challenges | Profil.

---

### Sprint 1 — Fundament & Compliance

- [ ] V1.0.1 — ISSF/DSB-Wettkampfmodus
  - Eigener Modus: keine Hints, strenge Zeitlimits pro Schuss (LG: 75s, KK: 45s)
  - Disziplin-Auswahl nur nach DSB-Standard (LG40, LG60, KK50, KK100, KK3×20)
  - Kein Score-Feedback zwischen den Schüssen
  - Migration 0020: `game_sessions.mode` Enum ('training' | 'duel' | 'official')

- [ ] V1.0.2 — Onboarding-Flow (vereinfacht, Pilot-Learnings eingearbeitet)
  - Geführter Erststart: Disziplin wählen → Skill-Assessment-Duel → Club-Code eingeben
  - Trainer-Einladungslink als primärer Onboarding-Kanal (kein kalter Start)
  - Inhalte basieren auf Pilot-Feedback aus V1.0-Pre.3

- [ ] V1.0.3 — Multi-Device Sync (Cloud-first)
  - Eingeloggte User: Supabase als primärer Speicher, localStorage als Cache
  - Sync-Konflikte: Server-wins für XP/Stats, merged für Achievements
  - Migration 0021: `user_devices` Tabelle für Sync-Tracking

---

### Sprint 2 — Vereinslizenz & Trainer-Dashboard

- [ ] V1.0.4 — Vereinslizenz-Modell (B2B, kein LemonSqueezy)
  - Lizenz-Stufen: Free (1 Club, max. 15 Mitglieder), Pro (50–150€/Jahr, unlimitiert)
  - Zahlung per SEPA-Überweisung oder Rechnung — Vereinskassen-kompatibel
  - Migration 0022: `club_licenses` (club_id, plan, valid_until, invoice_ref)
  - Worker-Endpoint `GET /api/club/license-status` — JWT-Check pro API-Request
  - Keine Kreditkarte erforderlich; Freischaltung manuell nach Zahlungseingang (Phase 1)

- [ ] V1.0.5 — Trainer-Dashboard (primärer Adoptions-Anker)
  - Eigener Tab/Screen für Trainer-Rolle (club_role = 'trainer')
  - Übersicht aller Mitglieder: letztes Training, Ø-Ringe-Trend, aktive Streak
  - Wöchentlicher Vereins-Bericht: Top-Schützen, Gesamt-Sessions, Disziplin-Verteilung
  - "Einladungslink generieren" — Trainer lädt Schützen direkt ein (kein App-Store nötig)
  - Migration 0023: `club_members.role` Enum erweitert um 'trainer'

- [ ] V1.0.6 — Lizenz-Angebot-Screen (Upgrade-UI für Club-Owner)
  - Klarer Vergleich: Free-Limits vs. Pro-Features
  - CTA: "Vereinslizenz anfragen" → Formular (Name, Verein, E-Mail) → manuelle Bearbeitung
  - Kein Stripe/Webhook-Chaos in Phase 1; Automatisierung in V1.1

---

### Sprint 3 — Club vs. Club (Viral-Loop)

- [ ] V1.0.7 — Club-Match-Schema (Migration 0024)
  - Tabellen: `club_matches` (challenger, opponent, discipline, status, scheduled_at)
  - `club_match_lineups` (match_id, user_id, club_id, score, played_at)
  - RLS: nur Club-Member können eigene Lineup-Einträge einfügen
  - Worker-Endpoints: `POST /api/club-matches`, `GET /api/club-matches/:id`
  - Nur für Clubs mit aktiver Lizenz (Free: max. 2 offene Matches)

- [ ] V1.0.8 — Aufstellungs-UI + Async Match-Flow
  - Owner/Trainer wählt N Schützen aus Club-Mitgliedern
  - Gegner-Club bestätigt + stellt eigene Mannschaft auf
  - Jeder Schütze spielt in eigenem Tempo (7-Tage-Fenster)
  - Score wird nach Duel-Ende automatisch in Lineup geschrieben

- [ ] V1.0.9 — Match-Auswertung + Push-Benachrichtigung
  - Worker-Cron: prüft täglich, ob alle Slots gefüllt oder Frist abgelaufen
  - Summen-Wertung, Sieger-Ermittlung, Status → 'completed'
  - Push an alle Teilnehmer + beide Trainer bei Match-Ende
  - Ergebnis-Screen: Club-Gegenüberstellung, Top-Scorer, Margin

---

### Sprint 4 — DSB-Saison-Liga

> **Voraussetzung:** DSB-Verbandsrecht-Klärung muss vor Sprint-Start abgeschlossen sein.
> Formale Anerkennung einer digitalen Liga erfordert Verbandsbeschluss — frühzeitig initiieren.

- [ ] V1.0.10 — DSB-Verbandsrecht-Schritt
  - Gespräch mit DSB-Landesverband: Kann die App-Liga offiziell anerkannt werden?
  - Falls nein → Liga läuft als "inoffizieller Community-Wettbewerb" (kein Showstopper)
  - Falls ja → rechtliche Rahmenbedingungen dokumentieren, Liga als "DSB-offiziell" labeln
  - Saison-Design erst nach diesem Gespräch finalisieren

- [ ] V1.0.11 — Liga-Schema (Migration 0025)
  - Tabellen: `league_seasons`, `league_divisions`, `league_standings`, `league_matches`
  - Worker-Endpoints: CRUD für Saison + Standings
  - Saisonstart/Ende konfigurierbar durch App-Admin

- [ ] V1.0.12 — Tabellen-UI + Spielplan-UI
  - Division-Tabs (Liga 1, Liga 2, …), Auf/Abstieg-Indikatoren
  - Matchday-Übersicht: ausstehend / läuft / abgeschlossen
  - Nur für Clubs mit aktiver Pro-Lizenz spielbar; Free-Clubs können zuschauen

- [ ] V1.0.13 — Saison-Ende-Workflow
  - Worker-Cron: Auf/Abstieg berechnen, Saison-Badges vergeben
  - Saison-End-Screen mit Ceremony (Aufstieg / Abstieg / Verbleib)
  - Cosmetics: Saison-Titel + Profilrahmen für Liga-Platzierungen (kostenlos, kein Paywall)

---

### Sprint 5 — KI-Coach & Shot-Analyse

> **KI-Coach ist Pro-only.** Ohne Cost-Cap kein Launch.
> OCR-Foto-Score ist **nicht** in V1.0 — wird nach Pilot-Daten neu bewertet.

- [ ] V1.0.14 — Shot-Pattern-Analyse (lokal, kein API-Kosten)
  - Berechnet aus letzten 50 Spielen: Schuss-Position (1–N) mit tiefstem Durchschnitt
  - Erkennt Muster: Einbruch zweite Hälfte, Zeitdruck, Disziplin-spezifische Schwächen
  - Visualisierung: Shot-Heatmap der schwachen Slots
  - Kein API-Call — reine Frontend-Berechnung, kostenlos für alle

- [ ] V1.0.15 — KI-Coach via Claude API (nur Pro-Clubs)
  - Worker-Endpoint `POST /api/coach/analyze` — nur bei aktiver Vereinslizenz Pro
  - Übergibt komprimierte Stats (letzte 20 Games, Shot-Ø) an Claude API
  - **Cost-Cap:** Max. 1 Coach-Request pro User pro 24h; Antwort 24h gecacht
  - **Budget-Alarm:** Worker-KV zählt tägliche API-Calls; Endpoint deaktiviert bei Overage
  - Trainingsplan auf Deutsch, DSB-terminologiegerecht

- [ ] V1.0.16 — Wettkampf-Kalender
  - Trainer trägt echte Wettkampf-Termine ein (Datum, Disziplin, Ort)
  - Countdown zum nächsten Termin im Profil + Trainer-Dashboard
  - Push-Reminder 24h + 1h vor Wettkampf

---

### Sprint 6 — Elo, Social Feed & Launch-Readiness

- [ ] V1.0.17 — Elo-Rating-System
  - Elo-Wert pro Disziplin (Start: 1000), berechnet nach Duel-Ende
  - Migration 0026: `user_elo` (user_id, discipline, rating, games_played)
  - Matchmaking beim Async-Challenge: schlägt Gegner in ±150 Elo-Range vor
  - Elo-Verlauf im Profil (letzte 30 Games als Kurve)

- [ ] V1.0.18 — Social Activity-Feed
  - Freunde-Feed: Duel-Siege, Achievements, Liga-Auf/Abstieg, Saison-Titel
  - Reactions: 👍 🔥 🎯 — kein Kommentarsystem
  - Migration 0027: `activity_events` (user_id, event_type, payload, created_at)
  - Feed Worker-gecacht (60s)

- [ ] V1.0.19 — In-App Notification-Center
  - Zentraler Hub: Duel-Anfragen, Club-News, Match-Ergebnisse, Liga-Updates
  - Unread-Badge im Topbar; offline-fähig via Cache

- [ ] V1.0.20 — PWA-Distribution-Strategie
  - Trainer-Einladungslink als primärer Kanal (kein App-Store-Discovery nötig)
  - QR-Code für Vereinsaushang → direkt zur PWA-Install-Seite
  - Install-Prompt-Optimierung: erscheint nach erster vollständiger Session
  - Offline-Fallback für Game, Profil, Freunde

- [ ] V1.0.21 — Performance-Audit, DSGVO-Check & Security-Review
  - Lighthouse Mobile ≥ 90 (Performance, Accessibility, PWA)
  - DSGVO-Audit: alle neuen Datenpunkte gegen Datenschutzkonzept aus V1.0-Pre.2 prüfen
  - OWASP-Check aller neuen Endpoints (SQLi, XSS, IDOR, Auth-Bypass)
  - Rate-Limits auf allen neuen Worker-Endpoints
  - Deployment-Checkliste: CACHE_VERSION, wrangler secret, supabase:apply, Smoke-Test

---

## Geplant nach V1.0 (nicht in V1.0 versprochen)

- **OCR-Foto-Score** — Beta-Feature, erst nach Pilotphase re-evaluiert.
  Zeigt sich im Pilot, ob Schützen das tatsächlich nutzen wollen.
  Falsches Ergebnis in Wettkampfkontext = PR-Schaden. Frühestens V1.1.

- **LemonSqueezy / Stripe B2C** — Nur relevant wenn B2B-Lizenzmodell scheitert.
  Erst nach Pilotdaten entscheiden.

- **Automatisiertes Billing** — V1.0 nutzt manuelle Rechnungsstellung.
  Automatisierung (Webhook, Self-Service) kommt in V1.1 sobald 10+ Vereinslizenzen.

- **ISSF-Globalrollout** — Technisches Fundament ist in V1.0.1 gelegt.
  Strategie erst nach stabiler DSB-Basis (mindestens 20 aktive Vereine).

- **Analytics-Export PDF** — Nice-to-have, kein Adoptions-Argument. V1.1.

---

## Technische Abhängigkeiten V1.0

```
Migration-Reihenfolge:
0020 (mode Enum) → 0021 (user_devices) → 0022 (club_licenses) →
0023 (trainer role) → 0024 (club_matches) → 0025 (league) →
0026 (user_elo) → 0027 (activity_events)

Neue Worker-Secrets:
ANTHROPIC_API_KEY      — KI-Coach Endpoint
COACH_CACHE_KV         — KV-Namespace für Coach-Antwort-Cache + Call-Counter

Neue KV-Namespaces:
RATE_LIMITER (existiert) + COACH_CACHE (neu)

Weggefallen:
LEMON_SQUEEZY_SECRET   — kein B2C-Payment in V1.0
```

## Definitions of Done (V1.0)

- Pilotphase (V1.0-Pre) abgeschlossen: Pilot-Auswertung dokumentiert
- Wettbewerbsanalyse: min. 3 Konkurrenten verglichen
- DSGVO-Dokument: Datenschutzerklärung live, Vereinsvertrag-Template fertig
- Alle 21 V1.0-Items `[x]`
- `npm test` grün
- Lighthouse Mobile ≥ 90 (Performance + PWA)
- ISSF-Modus: manuelle QA mit Zeitlimit-Tests auf Mobile
- KI-Coach Cost-Cap: Budget-Alarm getestet (künstlich überschreiten + Deaktivierung prüfen)
- Vereinslizenz: min. 1 echter Verein hat Pro-Lizenz aktiviert (auch wenn manuell)
- Mindestens 1 vollständiges Club-vs-Club-Match durchgespielt
- Mindestens 1 Liga-Saison (Testdaten) mit Auf/Abstieg-Berechnung verifiziert
- OCR: explizit als "nicht in V1.0" kommuniziert (kein offenes Versprechen)
