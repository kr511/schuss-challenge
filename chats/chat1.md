# Coding task briefing

_Started 2026-06-23 18:55 UTC_

---

## User

hIer sind die sachen die du coden sollst. gib das soweit aus das es für claude code reicht

## Assistant

_[tool: read_file]_

_[tool: list_files]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: list_files]_

_[tool: list_files]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: update_todos]_

_[tool: update_todos]_

Ich baue jetzt alle 10 Screens.

_[tool: dc_write]_

## Assistant

_[tool: dc_write]_

## Assistant

_[tool: dc_write]_

_[tool: ready_for_verification]_

_[tool: update_todos]_

**„Schuss-Challenge Handoff.dc.html"** ist fertig — alle 10 Screens aus deiner Prompt-Liste, pixelgenau nach dem Design System.

Was drin ist:

| # | Screen |
|---|--------|
| 02 | Splash / Loading Screen |
| 03 | In-Game · LG 40 Schuss (Kreisscheibe, Bot-Row, SCHUSS-Button) |
| 04 | Ergebnis · Sieg (Score-Card, Verteilung, XP-Bar) |
| 05 | Ergebnis · Niederlage (Revanche, Motivationstext) |
| 09 | Onboarding · Schritt 1 |
| 06 | Profil-Karte / Share Card (9:16) |
| 08 | Club-Rangliste Widget |
| 01 | App Icon (180 / 90 / 48 px) |
| 07 | Achievement Badges 2×2 (Erster Schuss, 10er Streak, Scharfschütze, Legende) |
| 10 | Marketing Banner 1280×720 |

Plus unten ein **Design Tokens Panel** (Farben, Typo, Radien, Hairlines) direkt als Copy-Paste-Referenz für Claude Code.

## User

die datei wurde geändert mach zu neuen prompts auch neue bilder zu den bestehenden

## Assistant

_[tool: read_file]_

_[tool: snip]_

_[tool: dc_html_str_replace]_

_[tool: ready_for_verification]_

Fertig — alle 16 Screens sind drin:

**Neu hinzugefügt (Screens 11–16):**

| # | Screen |
|---|--------|
| 11 | Home · Start-Tab (Tagesziel-Ring, Stat-Tiles, Letztes Training, FAB) |
| 12 | Training-Tab (Segmented Tabs, 5 Modi-Cards, Heatmap) |
| 13 | Challenges-Tab (Daily Challenge Card, Weitere Aufgaben, Club-Challenge) |
| 14 | Freunde-Tab (Duel-Banner, Online-Freunde, Freundescode-Card) |
| 15 | Profil-Tab (Hero-Card, Inner Tabs, Stats 2×2, Auszeichnungen) |
| 16 | Bottom Nav · 3 States (Start / Training / Profil aktiv) |

Das Dokument hat jetzt 7 Sektionen (01–07) und ist komplett als Claude Code Handoff nutzbar.

