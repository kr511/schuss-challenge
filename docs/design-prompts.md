# Design Prompts — Schuss-Challenge

Fertige Copy-Paste-Prompts für Claude Design / Canva AI / Figma AI.
Alle Prompts benutzen das bestehende Design-System der App.

---

## Inhaltsverzeichnis

**Screens & Tabs (neu)**
- [11. Home / Start-Tab](#11-home--start-tab)
- [12. Training-Tab](#12-training-tab)
- [13. Challenges-Tab](#13-challenges-tab)
- [14. Freunde-Tab](#14-freunde-tab)
- [15. Profil-Tab](#15-profil-tab)
- [16. Bottom-Navigation-Bar](#16-bottom-navigation-bar)
- [17. Spielerprofil Freund B (V0.9)](#17-spielerprofil-freund-b-v09)
- [18. Onboarding Flow — 3 Schritte](#18-onboarding-flow--3-schritte)
- [19. In-Game Screen — Topbar Redesign](#19-in-game-screen--topbar-redesign)

**V1.0 Screens (neu)**
- [20. Onboarding Flow V1.0 — Skill-Assessment + Club-Join (Schritte 4–5)](#20-onboarding-flow-v10--skill-assessment--club-join-schritte-45)
- [21. ISSF/DSB-Wettkampfmodus Screen](#21-issfdsb-wettkampfmodus-screen)
- [22. Club-Match Aufstellung (Lineup-UI)](#22-club-match-aufstellung-lineup-ui)
- [23. Club-Match Ergebnis-Screen (Club A vs. Club B)](#23-club-match-ergebnis-screen-club-a-vs-club-b)
- [24. Liga-Tabelle & Spielplan](#24-liga-tabelle--spielplan)
- [25. Saison-Ende Ceremony Screen](#25-saison-ende-ceremony-screen)
- [26. Upgrade / Paywall Screen](#26-upgrade--paywall-screen)
- [27. KI-Coach Analyse-Screen](#27-ki-coach-analyse-screen)
- [28. Social Activity-Feed](#28-social-activity-feed)
- [29. Notification-Center](#29-notification-center)

**Einzelne Screens (bestehend)**
- 01 App Icon · 02 Splash · 03 In-Game · 04 Win · 05 Loss · 06 Profil-Karte · 07 Achievement Badges · 08 Club-Rangliste Widget · 09 Onboarding · 10 Marketing Banner

---

## Design-System Referenz

```
Hintergrund:     #0a0a0a  (fast schwarz)
Karte:           #121212  (dunkles Grau)
Karte erhöht:    #1a1a1a  (etwas heller)
Akzent-Grün:     #22c55e  (Haupt-Akzent)
Akzent hell:     #4ade80  (Hover / Glühen)
Akzent dunkel:   #16a34a  (gedrückt)

Text primär:     #ffffff
Text sekundär:   rgba(255,255,255,0.65)
Text gedämpft:   rgba(255,255,255,0.38)
Border subtil:   rgba(255,255,255,0.08)

Blau (Stats):    #00c3ff
Lila (Erfolge):  #aa5aff
Gold (Rang):     #ffc840
Orange (Streak): #ff9500
Rot (Verlust):   #ff4a4a
```

---

## 1. App Icon

```
Design a mobile app icon for "Schuss-Challenge", a shooting sports training app.

Style: Glassmorphism meets precision sports — dark, premium, minimal.

Visual: A stylized rifle target sight (crosshair / Kreisscheibe) centered in the icon.
The rings of the target glow from the center outward:
- Inner bullseye: bright #4ade80 (green glow)
- Middle rings: #22c55e fading outward
- Outer rings: very subtle, barely visible on dark background

Background: Deep black radial gradient (#0a0a0a at center, slightly lighter #111 at edges),
with a very subtle green radial glow at center (rgba(34,197,94,0.15)).

No text. No borders. Rounded corners (iOS style, ~22% corner radius).
The icon should feel like a precision instrument display — like a night-vision scope.
```

---

## 2. Splash Screen / Loading Screen

```
Design a mobile splash screen for "Schuss-Challenge".

Layout: Centered vertically and horizontally on a near-black background (#0a0a0a).

Elements (top to bottom):
1. Crosshair target icon (stylized Kreisscheibe), ~80px, glowing green (#4ade80 center ring)
2. App name "SCHUSS" in bold white uppercase, 32px, letter-spacing 0.15em
3. "CHALLENGE" underneath in #22c55e, 14px, letter-spacing 0.4em
4. Thin progress bar at bottom: dark track (#1a1a1a), green fill (#22c55e),
   2px height, 120px wide, rounded, subtle glow

Background: Black (#0a0a0a) with a very faint radial green gradient at center
(rgba(34,197,94,0.06) blooming outward, barely visible).

Minimal. No decorative elements. Pure precision.
```

---

## 3. In-Game Schießscheibe (Game Screen)

```
Design a mobile game UI screen for a shooting sports training app.

Screen: Dark (#0a0a0a background), portrait orientation (390×844px).

Top bar:
- Left: "LG 40" label in white, muted subtitle "Schießen"
- Center: Score display "385.6" in large white bold (36px), "Ringe" label below in rgba(255,255,255,0.4)
- Right: Round indicator "3 / 40" in small white text

Main element — Shooting target (Kreisscheibe):
- Centered, takes up ~55% of screen width
- Concentric rings from center outward: 10 rings total
- Colors: center (10er ring) = #22c55e glow, inner rings fade through white to dark gray
- The target disc has a subtle drop shadow: 0 0 40px rgba(34,197,94,0.2)
- Black background behind the disc with a barely visible green ambient glow

Recent shots row (below target):
- Horizontal chip list of last shots: "10", "9.8", "10", "9.6"
- Each chip: dark card (rgba(255,255,255,0.06)), rounded, small white text
- 10er chips have a subtle green tint (rgba(34,197,94,0.2) background)

Bottom section:
- Bot avatar area (left): small circle with "Bot" label, bot score "383.2" in red (#ff4a4a)
- Large green button (right): "SCHUSS" — full-width won't fit, so just a wide capsule button
  with #22c55e background, black text, subtle glow

Font: Inter or SF Pro Display style (clean, modern, no serifs).
Overall mood: Precision instrument, night-vision scope aesthetic.
```

---

## 4. Ergebnis-Screen (Win)

```
Design a mobile result/victory screen for a shooting sports app.

Background: #0a0a0a with a radial green glow blooming from top center
(rgba(34,197,94,0.18) → transparent).

Top section — Hero:
- Large "GEWONNEN" text, white, bold, 28px, centered
- Subtitle: "+20 XP" in #4ade80, 18px, with a subtle sparkle effect

Score comparison card (center):
- Dark card (rgba(18,18,18,0.95)), rounded 20px, border rgba(255,255,255,0.08)
- Left column "Du": score "387.4" in large white, "Ringe" label
- Divider line (rgba(255,255,255,0.1)) vertical
- Right column "Bot": score "383.1" in rgba(255,255,255,0.5), smaller
- Delta badge at top: "+4.3" in white on #22c55e pill background

Shot distribution mini chart (below card):
- Small horizontal bar chart showing ring distribution (9er, 10er count)
- Bars in #22c55e, background rgba(255,255,255,0.06)
- Labels "10er: 12", "9er: 20", "8er: 8" in small muted text

XP progress bar:
- Dark track, green fill (#22c55e), glowing
- "Rang: Schütze — 220 / 300 XP" label

Two buttons at bottom:
- Primary: "Nochmal" — full width, #22c55e background, black text, bold
- Secondary: "Profil" — below, ghost style, white text, transparent background

Mood: Celebration but restrained. Premium sports app energy, not cartoon.
```

---

## 5. Ergebnis-Screen (Niederlage)

```
Design a mobile result/defeat screen for a shooting sports app.

Same layout as the win screen but:
- Hero text: "KNAPP VERLOREN" in white (no red — keep it motivational)
- No green radial glow — use a very subtle white ambient instead
- Score: your score (small, muted) vs bot score (larger, rgba(255,255,255,0.9))
- Delta badge: "-2.1" in rgba(255,255,255,0.7) on dark pill (rgba(255,255,255,0.1))
- XP bar still shows a small +5 XP gain (consolation XP)
- Primary button: "Revanche" in #22c55e
- Below: motivational micro-text "Noch 0.5 Ringe gefehlt" in muted green

Overall mood: Respectful, not demotivating. The app feels supportive, not punishing.
```

---

## 6. Profil-Karte (Visitenkarte / Share Card)

```
Design a shareable profile card for a shooting sports training app. Format: 9:16 tall card,
~390×693px, for sharing on Instagram Stories or WhatsApp.

Background: Dark (#0a0a0a) with a very subtle green radial bloom at the top center.

Top section:
- Large emoji avatar centered: "🎯" (60px)
- Username below: "EliteSchütze" in white bold 22px
- Rank badge: "⭐ Meister" in #ffc840, small pill background rgba(255,200,64,0.12)

Stats grid (2×2 cards, each card rounded, dark surface rgba(255,255,255,0.05)):
- 🏆 "Siege: 142" — label muted, value white
- 🔥 "Streak: 12" — label muted, value in #ff9500
- 📊 "Winrate: 71%" — label muted, value in #22c55e
- ⭐ "XP: 1.240" — label muted, value in #ffc840

Best score bar:
- "Bestleistung LG: 392.4 Ringe"
- Dark track, green fill proportional to score (392 out of 400)

Bottom:
- App logo / wordmark: "SCHUSS-CHALLENGE" in small muted white, letter-spaced
- QR code placeholder (simple rounded square outline, 40px) — bottom right

Border: thin, ~1px, rgba(255,255,255,0.08), rounded 24px overall.
Drop shadow: 0 20px 60px rgba(0,0,0,0.8).
```

---

## 7. Achievement Badge Set

```
Design a set of 4 achievement badge icons for a shooting sports app.
Each badge: 80×80px, circular, for use in a dark UI.

Style: Flat icon on a dark circular background, with a subtle colored glow ring.

Badge 1 — "Erster Schuss" (beginner):
- Icon: Simple crosshair target, line art
- Background: rgba(255,255,255,0.06) dark circle
- Ring: rgba(34,197,94,0.3) subtle border
- Icon color: rgba(255,255,255,0.6) (muted, not yet unlocked feel)

Badge 2 — "10er Streak" (intermediate, unlocked):
- Icon: Flame 🔥 or stylized fire lines
- Background: rgba(255,149,0,0.12)
- Ring: #ff9500 glowing border (2px, with drop-shadow glow)
- Icon color: #ff9500

Badge 3 — "Scharfschütze" (score achievement, unlocked):
- Icon: Medal ribbon or target with star
- Background: rgba(255,200,64,0.12)
- Ring: #ffc840 glowing border
- Icon color: #ffc840

Badge 4 — "Legende" (top tier, rare):
- Icon: Crown
- Background: rgba(170,90,255,0.15)
- Ring: #aa5aff glowing border, stronger glow (0 0 12px rgba(170,90,255,0.5))
- Icon color: #aa5aff

All badges: perfectly circular, 80px diameter. Locked badges are desaturated and at 40% opacity.
Present all 4 in a 2×2 grid on a #0a0a0a background for context.
```

---

## 8. Club-Rangliste Widget

```
Design a mobile UI widget for a club leaderboard in a shooting sports app.

Widget size: Full-width card, ~390px wide, dark surface.

Header row:
- Left: "🏛 Mein Verein" label in white, "Diese Woche" subtitle in muted green (#22c55e, small)
- Right: "Alle sehen →" link in #22c55e, small

Leaderboard rows (3 visible):
Row 1 (Rank #1):
- Gold medal icon 🥇 (16px)
- Avatar emoji "🎯" in small circle
- Name "MaxMuster" in white bold
- Score "412 Ringe" right-aligned in white
- Subtle green left border (3px, #22c55e) — current user highlight

Row 2 (Rank #2):
- Silver medal 🥈
- Name "AnnaS." in rgba(255,255,255,0.8)
- Score "398 Ringe" right-aligned, muted

Row 3 (Rank #3):
- Bronze medal 🥉
- Name "KlausP." muted
- Score "391 Ringe" muted

Each row: 48px height, subtle divider (rgba(255,255,255,0.06)).
Card background: rgba(18,18,18,0.95), rounded 16px, border rgba(255,255,255,0.08).
```

---

## 9. Onboarding Screen (Welcome)

```
Design a mobile onboarding screen for "Schuss-Challenge", a shooting sports training app.

Background: #0a0a0a, full bleed.

Illustration area (top 55%):
- Stylized shooting range target (Kreisscheibe) from a slight angle/perspective
- The target glows: inner rings in #22c55e, outer rings in very dark gray
- Small trajectory lines (bullet paths) converging on the 10er ring
- Ambient green light reflecting off the "floor" (subtle gradient)

Text section (bottom 45%):
- Headline: "Trainiere wie ein Profi." — white, bold, 28px, line-height 1.2
- Subtext: "Duell gegen den adaptiven Bot. Dein Niveau. Dein Tempo."
  in rgba(255,255,255,0.55), 16px, max 2 lines

Progress dots (3 dots, step 1 of 3):
- Active dot: #22c55e, 8px wide pill
- Inactive dots: rgba(255,255,255,0.2), 6px circles

CTA button: "Jetzt starten" — full width, #22c55e background, black text, bold, rounded 14px,
subtle glow: box-shadow 0 0 20px rgba(34,197,94,0.3).

Skip link: "Überspringen" top right, small, rgba(255,255,255,0.3).

Mood: Confident, athletic, premium. Not gamey or cartoonish.
```

---

## 10. Marketing Banner (16:9 für Social / Discord)

```
Design a 16:9 marketing banner (1280×720px) for "Schuss-Challenge".

Background: Deep black (#0a0a0a) with:
- Large radial green glow at left center (rgba(34,197,94,0.15) → transparent, ~600px radius)
- Subtle grid pattern (like a scope reticle overlay) at very low opacity (3%)

Left side (text):
- Small label "APP FÜR SCHIESSSPORT" in #22c55e, uppercase, 12px, letter-spacing 0.3em
- Main headline "TRAINIERE SMARTER." white, bold, 64px
- Subline "Adaptiver Bot · Tägliche Challenges · Club-Ranglisten"
  in rgba(255,255,255,0.55), 18px
- CTA button: "Jetzt trainieren →" in #22c55e background, black text

Right side (visual):
- Stylized phone mockup (dark, minimal frame, ~375×812 proportion)
- Inside the phone: the in-game shooting screen (Kreisscheibe target with green glow)
- Slight angle tilt (5°) for dynamic feel
- Phone casts a subtle green shadow on the dark background

Bottom right: App wordmark "SCHUSS-CHALLENGE" in small muted white.

Style: Premium sports tech. Think Nike Training meets target shooting.
No gradients that feel cheap. No neon. Pure precision.
```

---

## 11. Home / Start-Tab

```
Design a mobile home screen (Start-Tab) for "Schuss-Challenge", a shooting sports training PWA.
Portrait orientation, 390×844px, dark OLED aesthetic.

Fonts: Bebas Neue (display numbers), Outfit (UI/body), DM Mono (XP/stats).
Background: #0a0a0a with a very faint radial green bloom at top-center
(rgba(34,197,94,0.10) → transparent, 60% radius of screen width).

── HEADER (top, no top nav bar, safe-area spacing) ──
- Greeting row:
  Left: small eyebrow "MONTAG, 23. JUNI" in rgba(255,255,255,0.25), 9px, 0.28em letter-spacing, uppercase
  Below it: "Hallo, Max 👋" in Outfit 700, 22px, white
- Right: icon button (42×42px, circle, rgba(255,255,255,0.07) background, 1px border rgba(255,255,255,0.1))
  containing a bell SVG (stroke rgba(255,255,255,0.6))

── TAGESZIEL CARD (goal card) ──
Full-width card, 20px border-radius.
Background: linear-gradient(160deg, rgba(34,197,94,0.14), rgba(18,18,18,0.92) 60%)
Border: 1px solid rgba(34,197,94,0.22)
Box-shadow: 0 8px 24px rgba(0,0,0,0.55)

Top row (flex, align-items center, gap 14px):
- Left icon square (44×44px, radius 12px, rgba(34,197,94,0.15) bg):
  crosshair SVG in #22c55e stroke
- Center text block:
  Eyebrow: "Dein heutiges Ziel" rgba(255,255,255,0.45), 9px
  Goal title: "390+ Ringe schießen" Outfit 800, 17px, white
- Right: circular progress ring (56×56px):
  Background ring: rgba(255,255,255,0.1) stroke, 5px wide
  Fill ring: #22c55e stroke, 5px wide, stroke-linecap round, 73% filled
  Drop-shadow: drop-shadow(0 0 4px rgba(34,197,94,0.5))
  Center text: "73%" in #22c55e, 12px, 800 weight

Progress bar below (margin-top 14px):
- Label row: "Fortschritt: 284 Ringe" left, "Heute 18:00" right — both rgba(255,255,255,0.45), 11px
- Track: rgba(255,255,255,0.08), 7px height, radius 4px
- Fill: linear-gradient(90deg, #16a34a, #4ade80), 73% width

── ÜBERSICHT SECTION ──
Section header: "Übersicht" Outfit 700, 16px, white + "Alle anzeigen →" link right in #22c55e, 12px

3-column stat tile grid (gap 10px):
Each tile: rgba(18,18,18,0.92) bg, 1px border rgba(255,255,255,0.07), 16px radius, padding 13px 10px

Tile 1 (green icon): trend-up SVG
  Value "387,2" white 800, 21px
  Label "Ø Ringe\nDiese Woche" rgba(255,255,255,0.4), 10px

Tile 2 (blue icon): trophy SVG
  Value "12" white 800, 21px
  Label "Challenges\nGewonnen" rgba(255,255,255,0.4)

Tile 3 (purple icon): target-circle SVG
  Value "48" white 800, 21px
  Label "Trainings\nGesamt" rgba(255,255,255,0.4)

── LETZTES TRAINING CARD ──
Full-width card, rgba(18,18,18,0.92) bg, 1px border, 20px radius, overflow hidden.

Top row (padding 15px 16px, flex, gap 14px):
- Thumb square (56×56px, radius 12px, rgba(255,255,255,0.04) bg, border rgba(255,255,255,0.08)):
  🎯 emoji centered, 26px
- Info block:
  "LG 40 · 10m" Outfit 700, 15px, white
  "Heute · 09:30 Uhr" rgba(255,255,255,0.4), 11px
- Score badge right (padding 8px 12px, radius 14px, rgba(34,197,94,0.12) bg, border rgba(34,197,94,0.25)):
  "391,4" #22c55e 800, 21px, line-height 1
  "Ringe" rgba(255,255,255,0.4), 9px, uppercase, letter-spaced

Bottom stats strip (border-top rgba(255,255,255,0.06), 3 columns, each 12px 8px padding, text-center):
- "40" white 700, 14px / "Schuss" label
- "96.8%" white 700, 14px / "Ø Ring" label
- "+20 XP" #22c55e 700, 14px / "Belohnung" label

── FAB BUTTON (floating) ──
Centered at bottom (above nav), not full-width but wide pill:
"DUELL STARTEN" in Outfit 800, 14px, black text
Background: #22c55e, border-radius 100px, padding 13px 22px
Box-shadow: 0 8px 28px rgba(34,197,94,0.4)
Left of text: small target SVG icon in black stroke

Overall scroll area has padding-bottom: 96px for nav clearance.
Bottom navigation visible (see Prompt 16).
```

---

## 12. Training-Tab

```
Design the Training tab screen for "Schuss-Challenge" (390×844px, dark OLED).

Background: #0a0a0a. Fonts: Outfit (UI), Bebas Neue (numbers), DM Mono (stats).

── HEADER ──
- "Training" in Outfit 800, 27px, white, letter-spacing -0.02em
- Subtitle: "5 Modi · Deine Woche" in rgba(255,255,255,0.38), 12px

── SEGMENTED FILTER TABS (inner tabs) ──
Full-width pill container (background rgba(255,255,255,0.04), radius 18px, padding 4px, flex, gap 2px):
- "Alle" — active tab: rgba(255,255,255,0.09) bg, white text, 800, radius 14px
- "LG" — inactive: rgba(255,255,255,0.4) text
- "KK" — inactive

── 5 TRAINING MODE CARDS (vertical list, gap 12px) ──
Each card: full-width, rgba(18,18,18,0.92) bg, 1px border rgba(255,255,255,0.08), 18px radius, padding 14px 16px

Card 1 — "Geschwindigkeit" (unlocked):
- Left: icon square (44×44px, radius 12px, rgba(255,107,53,0.15) bg) with ⚡ emoji
- Center: "Geschwindigkeit" Outfit 700, 15px, white / "60 Sek · 30 Schuss max" rgba(255,255,255,0.4), 11px
- Medals row below: 🥉🥈🥇 tiny (16px), grayed out if not earned
- Right: "▶" chevron button (32×32px, radius 10px, rgba(255,255,255,0.05) bg)

Card 2 — "Präzision" (#4ecdc4 teal):
Similar layout, icon bg rgba(78,205,196,0.15)

Card 3 — "Ausdauer" (#45b7d1 blue):
Icon bg rgba(69,183,209,0.15)

Card 4 — "Druck" (#f7b731 gold):
Icon bg rgba(247,183,49,0.15). Medal 🥉 earned (full color).

Card 5 — "Technik" (#a55eea purple):
Icon bg rgba(165,94,234,0.15)

── HEATMAP SECTION ──
Section title "Deine Woche" + 12 × 7 cell GitHub-style grid.
Cells: 10px × 10px, radius 3px, gap 3px.
Empty: rgba(255,255,255,0.05). Active days: #22c55e with varying opacity (1 session=0.4, 2=0.65, 3+=1.0).
Week labels (Mo Di Mi Do Fr Sa So) above in rgba(255,255,255,0.2), 9px.
Month label "Jun" left in rgba(255,255,255,0.2), 9px.
```

---

## 13. Challenges-Tab

```
Design the Challenges tab screen for "Schuss-Challenge" (390×844px, dark OLED).

Background: #0a0a0a. Green sport-green accent #22c55e throughout.

── HEADER ──
"Challenges" Outfit 800, 27px, white
"Tages-Aufgaben · Club" rgba(255,255,255,0.38), 12px

── DAILY CHALLENGE CARD (prominent, full-width) ──
Full-width card, background: linear-gradient(160deg, rgba(34,197,94,0.14), rgba(18,18,18,0.95) 55%)
Border: 1px solid rgba(34,197,94,0.22), border-radius 20px, padding 16px

Top row:
- Left: "⚡ TAGES-CHALLENGE" eyebrow in #22c55e, 9px, 0.28em letter-spacing, uppercase, 600 weight
- Right: countdown pill "04:22:11" in DM Mono, 12px, rgba(255,255,255,0.4), small pill bg rgba(255,255,255,0.06)

Challenge title: "Schieße 5 Duelle auf Schwierigkeit Mittel" Outfit 700, 16px, white, margin-top 10px

Progress section (margin-top 12px):
- Label row: "3 / 5 Duelle" left #22c55e 700 12px + "60%" right rgba(255,255,255,0.4) 11px
- Track: rgba(255,255,255,0.08), 7px, radius 4px
- Fill: linear-gradient(90deg,#16a34a,#4ade80), 60%

Reward badge row (margin-top 12px, flex, gap 8px):
- "+25 XP" pill: rgba(255,200,64,0.12) bg, border rgba(255,200,64,0.25), #ffc840 text, 12px, 700
- "🎯 Disziplin: LG 40" pill: rgba(255,255,255,0.05) bg, rgba(255,255,255,0.5) text

── 3 WEITERE CHALLENGES (list) ──
Section header "Weitere Aufgaben" + "Alle →" link

Challenge row style: flex, gap 12px, rgba(18,18,18,0.92) card, 1px border, 16px radius, 12px 14px padding

Row 1 (completed ✓):
- Icon circle (36×36px, radius 50%): rgba(34,197,94,0.12) bg, border 2px solid #22c55e, ✅ emoji
- "Schieße 1 Schuss in den 10er Ring" Outfit 600, 14px, rgba(255,255,255,0.5) (muted — done)
- Right: green checkmark ✓ icon

Row 2 (active):
- Icon circle: rgba(255,149,0,0.12) bg, border rgba(255,149,0,0.3), 🔥 emoji
- "Streak: 3 Duelle in Folge gewinnen" Outfit 700, 14px, white
- "+15 XP" small pill right

Row 3 (locked):
- Icon circle: rgba(255,255,255,0.04) bg, border rgba(255,255,255,0.1), 🔒 emoji (muted)
- "Foto-Challenge: Lade ein Scheibenfoto hoch" rgba(255,255,255,0.3), 14px
- "Morgen" small muted label right

── CLUB-CHALLENGE SECTION ──
Section header "🏛 Club-Challenge" + "Alle →"

Single prominent card, rgba(18,18,18,0.95) bg, border rgba(255,255,255,0.08), 18px radius, 14px 16px padding:
- "Wochenliga: 395+ Ringe erzielen" Outfit 800, 15px, white
- Club name "SV Präzision e.V." rgba(255,255,255,0.4), 12px, margin-top 4px
- Bottom row: participants "👥 8 Teilnehmer" left + reward "🏆 500 XP" right in #ffc840
```

---

## 14. Freunde-Tab

```
Design the Freunde (Friends) tab screen for "Schuss-Challenge" (390×844px, dark OLED).

Background: #0a0a0a. Font: Outfit (UI). Accent: #22c55e.

── HEADER ──
"Freunde" Outfit 800, 27px, white
"5 online · 12 Freunde gesamt" rgba(255,255,255,0.38), 12px

Top-right: "＋ Hinzufügen" outlined pill button
(border 1px solid rgba(34,197,94,0.35), color #22c55e, radius 100px, padding 8px 14px, 12px font)

── AKTIVE DUELL-EINLADUNG BANNER ──
Full-width card, border-left 3px solid #22c55e, rgba(34,197,94,0.06) bg, 14px 16px padding, 14px radius

"📨 MaxM. fordert dich heraus!" Outfit 700, 14px, white
"LG 40 · Mittel · Läuft noch 22h" rgba(255,255,255,0.45), 11px, margin-top 2px

Right: "Annehmen" button (rgba(34,197,94,0.14) bg, border rgba(34,197,94,0.3), #22c55e text, 12px, 700, radius 100px, padding 7px 14px)

── ONLINE FRIENDS (section) ──
Section header: "Jetzt online" in white 700, 16px + count badge (green pill "5")

Friend row style (full-width, rgba(18,18,18,0.92) bg, 1px border rgba(255,255,255,0.07), 16px radius, 11px 14px padding, flex, gap 12px):

Avatar wrap: 42×42px circle, linear-gradient(135deg,rgba(34,197,94,0.3),rgba(0,195,255,0.25)) bg
Emoji letter centered, white 700, 16px
Status dot (11×11px, border-radius 50%, border 2px solid #0f0f0f):
  Online: #22c55e
  Away: #ffc840
  Offline: rgba(255,255,255,0.3)

Row 1 — MaxMuster (online):
Avatar "M", status dot #22c55e
Name "MaxMuster" white 700, 14px / "Online · LG 40 üben" #22c55e 10px
Right: best score "392" white 800, 16px + "Ringe" rgba(255,255,255,0.3) 9px + chat button

Row 2 — AnnaS (away, #ffc840):
Status "Vor 5 min · KK 50m" in #ffc840

Row 3 — KlausP (offline):
Status "Offline · Vor 2h" rgba(255,255,255,0.35)

── ALLE FREUNDE (section, collapsible look) ──
Header "Alle Freunde (12)" white 700 14px + "↕ Sortieren" link #22c55e right

3 more friend rows, muted (offline), same structure

── FRIEND-CODE SHARE CARD ──
Bottom card, rgba(18,18,18,0.92) bg, border rgba(255,255,255,0.08), 16px radius, 14px padding
"Dein Freundescode" eyebrow rgba(255,255,255,0.35), 9px uppercase
"XK4R9P" DM Mono, 28px, white, letter-spacing 0.2em, centered, margin-top 6px
"Teilen →" button below: #22c55e bg, black text, full-width, radius 12px, Outfit 700, 14px

Overall mood: Active, social. Green = online, gold = away, subtle grays for offline. Clean rows.
```

---

## 15. Profil-Tab

```
Design the Profil (Profile) tab screen for "Schuss-Challenge" (390×844px, dark OLED).

Background: #0a0a0a. Fonts: Outfit + Bebas Neue + DM Mono.

── PROFILE HERO CARD ──
Full-width card, background: linear-gradient(160deg, rgba(34,197,94,0.12), rgba(18,18,18,0.92) 55%)
Border: 1px solid rgba(34,197,94,0.18), border-radius 22px, padding 18px 16px

Top row (flex, gap 14px, align-items center):
- Avatar circle (64×64px, border-radius 50%, rgba(34,197,94,0.14) bg, border 2px solid #22c55e,
  box-shadow 0 0 20px rgba(34,197,94,0.25)): "🎯" emoji, 32px
- Info block:
  Name row: "MaxMuster" Outfit 800, 21px, white + small "Öffentlich" badge (rgba(255,255,255,0.08) bg, rgba(255,255,255,0.6) text, rounded pill, 9px)
  Club: "🏛 SV Präzision e.V." rgba(255,255,255,0.4), 12px, margin-top 4px

XP bar section (margin-top 10px):
- Row: "⭐ MEISTER" #22c55e 700 11px left + "820 / 1000 XP" DM Mono rgba(255,255,255,0.4) 11px right
- Track: rgba(255,255,255,0.08), 6px, radius 3px
- Fill: linear-gradient(90deg,#16a34a,#4ade80), 82% width

── INNER TABS ──
Segmented pill row (4 tabs): "Stats" · "Erfolge" · "Verlauf" · "Konto"
Active tab: rgba(255,255,255,0.09) bg, white text
Inactive: rgba(255,255,255,0.4) text

── STATS TAB (active) ──
Big stats 2×2 grid (gap 10px):
Card 1 (blue icon — wins): "142" Bebas Neue 36px, #22c55e / "Siege" label
Card 2 (purple icon — streak): "12" Bebas Neue 36px, #ff9500 / "Aktueller Streak" label
Card 3 (gold icon — winrate): "71%" Bebas Neue 36px, #ffc840 / "Siegesrate" label
Card 4 (green icon — XP): "1.240" Bebas Neue 36px, white / "XP Gesamt" label

Each card: rgba(18,18,18,0.92) bg, 1px border rgba(255,255,255,0.07), 16px radius, 13px 14px padding

Weapon breakdown row (2 cards side by side):
- "🎯 LG" card: "15 Siege · 42 Spiele" + win-rate bar
- "🎯 KK" card: similar

── ACHIEVEMENTS SCROLL (below stats) ──
Horizontal scroll row of achievement badges:
Each badge: 76px wide, centered column (badge square + name below)
Square: 56×56px, 16px radius

Badge 1 (green, unlocked): "🔥" on rgba(34,197,94,0.14) bg, border rgba(34,197,94,0.3)
Badge 2 (blue, unlocked): "🏆" on rgba(0,195,255,0.14) bg, border rgba(0,195,255,0.3)
Badge 3 (gold, unlocked): "⭐" on rgba(255,200,64,0.14) bg, border rgba(255,200,64,0.35)
Badge 4 (locked/greyed): "👑" greyscale, opacity 0.4, rgba(255,255,255,0.04) bg

Badge names below: 9px rgba(255,255,255,0.55) Outfit 600

Mood: Premium, athletic profile. Stats feel like a sports card. Not a social media profile.
```

---

## 16. Bottom-Navigation-Bar

```
Design the bottom navigation bar for "Schuss-Challenge" (390px wide, 72px height).

Style: Frosted glass over dark, no harsh lines.

Container:
- Position: fixed bottom 0, full width
- Background: rgba(10,10,10,0.92)
- Backdrop-filter: blur(28px) saturate(1.8)
- Border-top: 1px solid rgba(255,255,255,0.08)
- Height: 72px
- Display: flex, 5 equal columns

Each tab button (flex column, center):
- Icon wrap: 44×28px, flex center, border-radius 12px
- Icon SVG: 20×20px, stroke 1.8px
- Label: 9px Outfit 600, letter-spacing 0.02em

States:
ACTIVE tab (e.g. "Start"):
- Icon color: #22c55e
- Icon wrap background: rgba(34,197,94,0.12)
- Icon drop-shadow: drop-shadow(0 0 5px rgba(34,197,94,0.6))
- Label color: #22c55e
- Label weight: 700

INACTIVE tabs:
- Icon color: rgba(255,255,255,0.32)
- Label color: rgba(255,255,255,0.32)

5 Tabs (left to right):

1. Start (active):
   Icon: house SVG (filled path + polyline for door)
   Label: "Start"

2. Training:
   Icon: concentric circles SVG (3 circles = target)
   Label: "Training"

3. Challenges:
   Icon: scissors/flag/lightning bolt — or a medal ribbon SVG
   Label: "Challenges"

4. Freunde:
   Icon: two people SVG (standard users icon)
   Label: "Freunde"

5. Profil:
   Icon: person circle SVG
   Label: "Profil"

Show the bar in 3 states side by side:
- State A: "Start" active
- State B: "Training" active
- State C: "Profil" active

Background below the bar: just #0a0a0a, no content needed.
Include safe-area bottom spacing (env(safe-area-inset-bottom)) as extra bottom padding.
```

---

## 17. Spielerprofil Freund B (V0.9)

> **Session-Prompt** — Copy-Paste in ein neues Claude-Code-Gespräch um V0.9.1 zu implementieren.

```
# Schuss-Challenge — V0.9 Session: Spielerprofil für Freund B

## Kontext
Projekt: Schuss-Challenge (Schützen-App), PWA mit Cloudflare Worker + Supabase.
V0.8 ist komplett deployed (Push, Club-Rangliste, Kader-Vergleich, Redesign).
Wir starten jetzt V0.9, erstes Item: reichhaltiges Freundesprofil.

## Was existiert
`friend-profile-view.js` + `friend-profile.css` — ein Overlay das beim Antippen
einer Freundeszeile öffnet. Zeigt bereits:
- Hero-Karte (Avatar, Name, Online-Status, Mitglied-seit)
- Aktions-Buttons (Nachricht, Duell, Freund-Remove)
- Stat-Tiles (Ø-Ringe, Beste Ringe, aus Social-Daten)
- Kader-Vergleich (ich vs. Freund, von V0.8.3)

`visitenkarte.html` — eigene sharable Profilseite, als Referenz für Daten-Layout.
`worker/api.ts` — Route `GET /api/profile/:publicId` gibt bestStats JSONB zurück.
`src/features/enhanced-achievements.js` — 14 Achievement-Definitionen mit renderUI().
`training-heatmap.js` — Heatmap-Komponente, nimmt optionales sessions-Array.

## Was fehlt / zu bauen
Ziel: Das Overlay wird zur vollständigen Profil-Ansicht von Freund B.

### A — Tabs im Overlay
Drei Tabs unter dem Hero-Bereich (analog zu eigenem Profil-Sheet):
- Statistik (Standard) — bestehende Stat-Tiles + Kader-Vergleich
- Erfolge — Achievements von Freund B (aus bestStats oder eigenem Achievement-System)
- Aktivität — Mini-Heatmap der letzten 12 Wochen

### B — Statistik-Tab erweitern
Aktuell nur Ø + Best aus Social-Daten. Ergänzen aus workerProfile.bestStats:
- Siegquote (winRate → %)
- Gesamtspiele (totalGames)
- Lieblingsdisziplin (favDiscipline, falls vorhanden)
Jedes Stat-Tile mit Icon + Label + Wert, gleiche Designsprache wie redesign.css.

### C — Erfolge-Tab
bestStats enthält kein Achievement-Array für Freunde → Fallback: Zeige nur
freigeschaltete Basis-Badges basierend auf verfügbaren Stats:
- 🎯 "Scharfschütze" → bestScore ≥ 390
- 🔥 "Auf Achse" → totalGames ≥ 10
- 🏆 "Duell-Profi" → winRate ≥ 0.6
- ⚡ "Schnellstarter" → immer (alle haben es)
Gesperrte Achievements: ausgegraut mit Schloss-Icon (kein konkreter Wert anzeigen).

### D — Aktivitäts-Tab
`GET /api/sessions?userId=<publicId>&limit=100` existiert NICHT für fremde User →
Worker-Endpunkt `GET /api/profile/:publicId/activity` hinzufügen:
- Auth optional (Rate-Limit: 20 req/60s)
- Query: game_sessions WHERE user_id = (SELECT id FROM api_profiles WHERE public_id = :publicId)
  ORDER BY played_at DESC LIMIT 100
- Gibt zurück: [{ date: "2026-06-20", count: 3 }] (gruppiert nach Tag)

In friend-profile-view.js: beim Tab-Wechsel zu "Aktivität" Daten laden,
TrainingHeatmap.render(sessions) aufrufen in #fpHeatmapMount.

### E — Head-to-Head Rekord
Oben im Statistik-Tab, direkt unter Hero: kleines Banner
"Du vs. [Name]: X Siege — Y Niederlagen"
Daten aus localStorage sd_history: Einträge die opponentId === friend.userId haben
(falls vorhanden — graceful skip wenn nicht).

## Technische Constraints
- Kein neuer npm-Package
- worker/api.ts: bestehende checkRateLimit() + supabaseRequest() Pattern nutzen
- friend-profile-view.js: bestehende state{} Struktur beibehalten
- XSS-Schutz: immer esc() für User-Content

## Dateien die du anfassen wirst
- `friend-profile-view.js` — Tabs + Tab-Switching + renderBody() erweitern
- `friend-profile.css` — Styles für Tabs + Heatmap-Wrapper + Achievement-Badges
- `worker/api.ts` — neuer Endpunkt /api/profile/:publicId/activity
- `worker/db.ts` — getFriendActivity(env, publicId): → [{date, count}]

## Verifikation
1. `npm run check:js` — kein Syntaxfehler
2. `npm test` — alle Tests grün
3. Freundesprofil öffnen → drei Tabs erscheinen
4. Statistik-Tab → bestStats-Werte sichtbar
5. Erfolge-Tab → Badges angezeigt, gesperrte ausgegraut
6. Aktivität-Tab → Heatmap lädt (oder leerer State wenn keine Daten)

## ROADMAP.md Update nach Abschluss
Neuen Abschnitt an ROADMAP.md anhängen:

## V0.9 — Spielerprofil & Polish
- [x] V0.9.1 — Spielerprofil Freund B (Tabs: Statistik, Erfolge, Aktivität)

Fang mit `friend-profile-view.js` an und lies die Datei vollständig.
```

---

## 18. Onboarding Flow — 3 Schritte

```
Design a 3-step full-screen onboarding flow for "Schuss-Challenge" (390×844px, dark OLED).
Background: radial-gradient(ellipse 70% 50% at 50% -5%, rgba(34,197,94,0.10) 0%, transparent 55%), #0a0a0a
Font: Outfit. Accent: #22c55e.

── SHARED ELEMENTS (all 3 steps) ──
Top-right skip link: "Überspringen" Outfit 500 13px rgba(255,255,255,0.3)
Bottom progress dots (flex row, gap 6px, margin-bottom 22px):
  Active dot: 20×7px, #22c55e, border-radius 4px
  Inactive dot: 7×7px, rgba(255,255,255,0.2), border-radius 50%

── STEP 1: WELCOME (matches Handoff Screen 09) ──
Top 55%: Shooting target SVG (260×260px perspective-tilted), centered
  Rings from outside in: #060606 → #0c0c0c → #111 → #171717 → #1e1e1e → cream inner rings → rgba(34,197,94,0.35) → #22c55e bullseye → #4ade80 center
  SVG filter: drop-shadow(0 0 40px rgba(34,197,94,0.25))
  Below illustration: gradient fade rgba(34,197,94,0.07) to transparent

Bottom 45%:
  Dots: ● ○ ○
  H1 "Trainiere wie ein Profi." Outfit 800, 28px, white, letter-spacing -0.02em
  P "Duell gegen den adaptiven Bot. Dein Niveau. Dein Tempo." 15px rgba(255,255,255,0.55)
  CTA button "JETZT STARTEN": full-width, #22c55e bg, #000 text, Outfit 800 16px,
    letter-spacing 0.05em, border-radius 14px, padding 16px, box-shadow 0 0 20px rgba(34,197,94,0.3)

── STEP 2: DISCIPLINE SELECTION ──
Top area (130px, no illustration):
  Eyebrow "SCHRITT 2 / 3" #22c55e 11px 700 uppercase letter-spacing 0.25em
  Title "Deine Lieblingsdisziplin?" Outfit 800, 22px, white

2-column card grid (gap 14px, full-width):
  Card style: rgba(18,18,18,0.95) bg, 2px border, border-radius 18px, padding 22px 16px, text-center, cursor pointer
  UNSELECTED: border rgba(255,255,255,0.08)
  SELECTED: border #22c55e, background rgba(34,197,94,0.08)

  Card "LG":
    Icon 🌬️ 40px (filter: drop-shadow(0 0 8px rgba(34,197,94,0.6)) when selected)
    Name "LG" Outfit 800 18px (white / #4ade80 when selected)
    Sub "Luftgewehr\n10m · 40/60 Schuss" 12px rgba(255,255,255,0.4)

  Card "KK":
    Icon 🎯 40px
    Name "KK" Outfit 800 18px
    Sub "Kleinkaliber\n50m / 100m" 12px rgba(255,255,255,0.4)

  Below: "Du kannst das später jederzeit ändern." 14px rgba(255,255,255,0.4)

Dots: ○ ● ○
CTA "WEITER" (opacity 0.45 until selection, 1.0 after) — same style as step 1

── STEP 3: NAME + AGE ──
Top area (130px):
  Eyebrow "SCHRITT 3 / 3" #22c55e
  Title "Wie sollen wir dich nennen?" Outfit 800, 22px
  Sub "Dein Name erscheint im Profil und in der Rangliste." 14px rgba(255,255,255,0.4)

Input fields (full-width):
  Label: uppercase 11px rgba(255,255,255,0.38) letter-spacing 0.12em margin-bottom 8px
  Input field: rgba(18,18,18,0.95) bg, border 1px rgba(255,255,255,0.12), border-radius 14px,
    padding 15px 16px, Outfit 600 16px white, placeholder rgba(255,255,255,0.2),
    focus: border rgba(34,197,94,0.55)

  Field 1 "DEIN NAME / SPITZNAME" — placeholder "z.B. MaxMuster"
  Field 2 "ALTER (OPTIONAL)" — placeholder "z.B. 24", type number

Dots: ○ ○ ●
CTA "LOS GEHT'S 🎯" (opacity 0.45 until ≥2 chars in name input, 1.0 after) — same style

Show all 3 steps side by side in iPhone mockups.
Mood: Welcoming, sportlich, premium dark. Green glow = Energie.
```

---

## 19. In-Game Screen — Topbar Redesign

```
Design the in-game battle screen for "Schuss-Challenge" (390×844px, dark OLED).
Matches Handoff Screen 03: LG 40 Schuss.

Background: radial-gradient(ellipse 70% 50% at 50% -5%, rgba(34,197,94,0.10) 0%, transparent 60%), #0a0a0a

── TOP BAR (3-column, padding 0 22px) ──
Left column (align left):
  "LG 40" Outfit 700 18px white / line-height 1.1
  "Schießen" 11px rgba(255,255,255,0.4) margin-top 1px

Center column (align center):
  "385,6" Bebas Neue 38px white letter-spacing 0.02em / line-height 1
  "RINGE" 10px rgba(255,255,255,0.4) uppercase letter-spacing 0.12em margin-top 1px

Right column (align right):
  "3 / 40" Outfit 700 15px white / line-height 1.1
  "Schuss" 11px rgba(255,255,255,0.4) margin-top 1px

── TARGET (center flex area) ──
SVG shooting target 216×216px, same ring structure as onboarding target but smaller (r=108 outermost)
Radial glow behind: position absolute, inset -24px, radial-gradient circle rgba(34,197,94,0.13) center → transparent 65%, border-radius 50%

── RECENT SHOTS ROW (padding 12px 22px) ──
Horizontal flex, gap 8px:
  10er chip: rgba(34,197,94,0.2) bg, border 1px rgba(34,197,94,0.35), border-radius 20px, padding 6px 13px, 14px 700 #4ade80
  9.8 chip: rgba(255,255,255,0.06) bg, border rgba(255,255,255,0.1), 14px 600 white
  (repeat pattern for recent shots)

── BOT CARD (padding 12px 22px, above button) ──
Background: rgba(255,74,74,0.06), border 1px rgba(255,74,74,0.12), border-radius 14px, padding 11px 14px
Flex row, gap 12px:
  Left: 38×38px circle, rgba(255,74,74,0.15) bg, border 1px rgba(255,74,74,0.25), center: 🤖 emoji 16px
  Middle (flex 1):
    "Bot · Realistisch" 11px rgba(255,255,255,0.4) margin-bottom 1px
    "383,2" Bebas Neue 22px #ff4a4a letter-spacing 0.02em line-height 1
  Right: "−2,4" 12px rgba(255,74,74,0.65) font-weight 600

── SCHUSS BUTTON ──
Full-width, padding 16px, #22c55e bg, #000 text, border-radius 14px
Outfit 800, 16px, letter-spacing 0.06em
Box-shadow: 0 4px 20px rgba(34,197,94,0.35)
Text: "SCHUSS" (no emoji)

Show: game in progress (3 shots fired, score building up). Energy: focused, sport, dark precision.
```

---

## 20. Onboarding Flow V1.0 — Skill-Assessment + Club-Join (Schritte 4–5)

> Ergänzt Prompt 18 (Schritte 1–3). Zeigt die zwei neuen V1.0-Schritte.

```
Design 2 additional onboarding steps (step 4 and 5 of 5) for "Schuss-Challenge" (390×844px, dark OLED).
Fonts: Outfit. Accent: #22c55e. Background: radial-gradient(ellipse 70% 50% at 50% -5%, rgba(34,197,94,0.10) 0%, transparent 55%), #0a0a0a

── SHARED ELEMENTS ──
Top-right: "Überspringen" Outfit 500 13px rgba(255,255,255,0.3)
Progress dots (5 dots): active = 20×7px #22c55e radius 4px, inactive = 7×7px rgba(255,255,255,0.2) circle
Step 4 dots: ○ ○ ○ ● ○   Step 5 dots: ○ ○ ○ ○ ●

── STEP 4: SKILL-ASSESSMENT ──
Eyebrow "SCHRITT 4 / 5" #22c55e 11px 700 uppercase letter-spacing 0.25em
Title "Lass uns deinen Level bestimmen." Outfit 800, 22px, white, margin-top 10px
Sub "Schieße 5 Probeschüsse — kein Druck, kein Score." 14px rgba(255,255,255,0.45)

Mini in-game preview card (full-width, rgba(18,18,18,0.95) bg, border rgba(255,255,255,0.08), 20px radius, padding 20px):
  Center: Shooting target SVG, 120×120px, same ring structure (10 rings), #22c55e bullseye glow
  Below target: 5 empty shot slots as small circles (36×36px, border-radius 50%, border 1.5px dashed rgba(255,255,255,0.2), gap 8px, flex row center)
    Slot 1 filled: #22c55e bg, border none, "10" Bebas Neue 14px black center
    Slots 2–5: empty dashed circles
  Caption below: "5 Schüsse · automatische Einstufung" rgba(255,255,255,0.35) 11px center

Difficulty row (margin-top 16px, flex, gap 10px, justify center):
  "Einsteiger" pill (selected): rgba(34,197,94,0.12) bg, border 1.5px solid #22c55e, #4ade80 text, 12px 700, radius 100px, padding 8px 16px
  "Mittel" pill (unselected): rgba(255,255,255,0.05) bg, border rgba(255,255,255,0.12), rgba(255,255,255,0.55) text
  "Profi" pill (unselected): same as Mittel

Dots row. CTA "ASSESSMENT STARTEN" — same button style (#22c55e bg, #000 text, full-width, radius 14px, padding 16px, Outfit 800 16px)

── STEP 5: CLUB BEITRETEN ──
Eyebrow "SCHRITT 5 / 5" #22c55e 11px 700
Title "Deinem Verein beitreten?" Outfit 800, 22px, white
Sub "Optional — du kannst das auch später tun." 14px rgba(255,255,255,0.45)

Two option cards (gap 12px, full-width):

Card A — "Club beitreten" (primary, has slight green tint):
  Background: rgba(34,197,94,0.07), border 1.5px solid rgba(34,197,94,0.3), radius 18px, padding 16px
  Left: icon square 44×44px, radius 12px, rgba(34,197,94,0.15) bg → 🏛 emoji 22px
  Right text block:
    "Club beitreten" Outfit 700 15px white
    "Gib den Einladungscode deines Vereins ein." 12px rgba(255,255,255,0.4) margin-top 3px
  Below (animated in when card tapped): input field, full-width, rgba(18,18,18,0.95) bg, border rgba(34,197,94,0.35), radius 12px, padding 13px 16px
    Placeholder "Club-Code (z.B. PRÄZ7)" DM Mono 15px rgba(255,255,255,0.25)
    Focus state: border #22c55e, box-shadow 0 0 12px rgba(34,197,94,0.2)

Card B — "Ohne Club starten":
  Background: rgba(18,18,18,0.95), border rgba(255,255,255,0.08), radius 18px, padding 16px
  Left: icon square 44×44px rgba(255,255,255,0.05) bg → 🎯 emoji 22px
  Right text block:
    "Jetzt solo starten" Outfit 700 15px white
    "Du kannst später einem Verein beitreten." 12px rgba(255,255,255,0.4)

Dots row. CTA "FERTIG — LOS GEHT'S" — same button style, full-width, rounded, #22c55e bg

Show both steps side by side in iPhone mockups.
Mood: Welcoming transition from onboarding to real gameplay. Step 4 feels like a game, Step 5 feels like joining a community.
```

---

## 21. ISSF/DSB-Wettkampfmodus Screen

```
Design the official competition mode in-game screen for "Schuss-Challenge" (390×844px, dark OLED).
This is a strict variant of the training screen — no hints, no bot comparison, ISSF rules.

Background: #0a0a0a (no green ambient glow — the absence of glow signals "serious mode").

── MODE BADGE (top center, above topbar) ──
Pill badge, centered: rgba(255,200,64,0.12) bg, border 1px solid rgba(255,200,64,0.3), border-radius 100px, padding 5px 14px
"🏅 DSB-WETTKAMPFMODUS" #ffc840 700 10px uppercase letter-spacing 0.22em

── TOP BAR (3-column, padding 0 22px, margin-top 8px) ──
Left: "LG 40" Outfit 700 18px white / "Wettkampf" 11px rgba(255,200,64,0.7) (gold instead of muted — signals official mode)
Center: "285,6" Bebas Neue 38px white letter-spacing 0.02em / "RINGE" 10px rgba(255,255,255,0.4) uppercase
Right: "7 / 40" Outfit 700 15px white / "Schuss" 11px rgba(255,255,255,0.4)

── SHOT TIMER (below topbar, full-width) ──
A prominent countdown ring + bar combo:

  Outer container: full-width, padding 0 22px
  Timer ring: 64×64px SVG circle, stroke-width 5px
    Background ring: rgba(255,255,255,0.08)
    Countdown fill: starts gold #ffc840, transitions orange → red as time runs out
    Current fill: 60% (45s of 75s LG limit)
    Center text: "45" Bebas Neue 22px, color matches ring fill color
  Below ring: thin linear progress track (full-width, 5px, radius 3px)
    Track: rgba(255,255,255,0.06)
    Fill: #ffc840 → 60% width (same time ratio)
    Right label: "75s pro Schuss" rgba(255,255,255,0.3) 10px

── TARGET ──
Same SVG target, 216×216px centered
No radial green glow — instead, very faint white ambient: radial-gradient circle rgba(255,255,255,0.04) → transparent
Ring 10 (bullseye): rgba(255,255,255,0.9) not green — neutral, official look

── NO HINTS STRIP ──
Between target and button, a narrow info bar:
  rgba(255,255,255,0.04) bg, border-y rgba(255,255,255,0.06), padding 8px 22px
  Flex row, gap 6px, items center:
  🚫 icon rgba(255,255,255,0.25) 12px + "Keine Zwischeninfo" rgba(255,255,255,0.3) 11px 600
  Spacer. 🚫 icon + "Kein Vergleich" rgba(255,255,255,0.3) 11px 600

── SCHUSS BUTTON ──
Full-width, padding 16px, border-radius 14px
Background: rgba(255,200,64,0.14), border 1.5px solid rgba(255,200,64,0.35)
Text: "SCHUSS" #ffc840, Outfit 800 16px, letter-spacing 0.06em
Box-shadow: 0 4px 20px rgba(255,200,64,0.15)
(Gold instead of green — visually separates official mode from training)

Show: shot 7 of 40, timer at 60%, score building. Energy: austere, focused, official. No color noise.
```

---

## 22. Club-Match Aufstellung (Lineup-UI)

```
Design the Club Match lineup selection screen for "Schuss-Challenge" (390×844px, dark OLED).
This is the Club-Owner's UI for creating a Club vs. Club challenge and selecting players.

Background: #0a0a0a. Fonts: Outfit (UI), Bebas Neue (numbers). Accent: #22c55e.

── HEADER ──
Back chevron (←) + "Neue Herausforderung" Outfit 800 22px white (inline, left-aligned)
Sub: "SV Präzision e.V." rgba(255,255,255,0.4) 12px margin-top 2px

── MATCH DETAILS CARD ──
Full-width card, rgba(18,18,18,0.95) bg, border rgba(255,255,255,0.08), radius 18px, padding 16px, margin-bottom 18px

Row 1 (flex, gap 12px, align-items center):
  Left: icon square 44×44px radius 12px rgba(0,195,255,0.12) bg → 🏛 emoji 22px
  Middle:
    "SC Berlin Schützen" Outfit 700 15px white (opponent club name)
    "Herausgefordert via Code BRLNS9" rgba(255,255,255,0.38) 11px margin-top 3px

Divider rgba(255,255,255,0.06) 1px full-width margin 14px 0

Detail grid (2-column, gap 10px):
  Left cell: eyebrow "DISZIPLIN" rgba(255,255,255,0.35) 9px uppercase letter-spacing 0.15em / "LG 40" Outfit 700 14px white
  Right cell: eyebrow "SCHÜSSE" / "40 Schuss" Outfit 700 14px white
  Left cell: eyebrow "FRIST" / "7 Tage" white
  Right cell: eyebrow "MODUS" / "Training" white (or "DSB-Wettkampf" if official)

── AUFSTELLUNG SECTION ──
Section header row:
  "Aufstellung" Outfit 700 16px white (left) + selected counter "3 / 5" pill right:
    rgba(34,197,94,0.12) bg, border rgba(34,197,94,0.25), #22c55e text, 12px 700, radius 100px, padding 4px 12px

Scrollable member list (gap 10px):

Member row style (full-width, radius 14px, padding 11px 14px, flex, gap 12px, border 1.5px):
  SELECTED: rgba(34,197,94,0.08) bg, border #22c55e
  UNSELECTED: rgba(18,18,18,0.92) bg, border rgba(255,255,255,0.07)

Row 1 (selected — Max Muster):
  Left: 42×42px avatar circle, linear-gradient(135deg,rgba(34,197,94,0.3),rgba(0,195,255,0.2)) bg
    "M" white 700 16px center. Selection indicator: small checkmark circle (18×18px, #22c55e bg, ✓ black) at bottom-right of avatar
  Middle (flex 1):
    "Max Muster" Outfit 700 14px white
    "Ø 389,2 Ringe · LG 40" rgba(255,255,255,0.4) 11px margin-top 2px
  Right: "Kapitän" small pill — rgba(34,197,94,0.12) bg, #22c55e text, 9px 700, radius 100px, padding 3px 10px

Row 2 (selected — Anna S.):
  Avatar "A", gradient rgba(170,90,255,0.3)→rgba(34,197,94,0.2). Check present.
  "Anna Schmidt" / "Ø 391,4 Ringe · LG 40"

Row 3 (selected — Klaus P.):
  Avatar "K". Check present.
  "Klaus Probst" / "Ø 385,1 Ringe · LG 40"

Row 4 (unselected — Lisa M.):
  Avatar "L", gradient rgba(255,149,0,0.3)→rgba(255,74,74,0.15). No check.
  "Lisa Maier" / "Ø 381,7 Ringe · LG 40"

Row 5 (unavailable — Tom R.):
  Avatar "T" opacity 0.45. No check.
  "Tom Richter" Outfit 700 14px rgba(255,255,255,0.4)
  "Noch kein LG 40 gespielt" rgba(255,255,255,0.25) 11px
  Right: "Nicht verfügbar" small muted pill, rgba(255,255,255,0.06) bg, rgba(255,255,255,0.3) text

── BOTTOM AREA (fixed, above safe-area) ──
Hint text center: "Wähle 3–6 Schützen für deine Aufstellung" rgba(255,255,255,0.3) 12px

CTA "HERAUSFORDERUNG SENDEN" full-width, #22c55e bg, #000 text, Outfit 800 15px,
  border-radius 14px, padding 15px, box-shadow 0 4px 20px rgba(34,197,94,0.3)
  (opacity 0.45 until min. 3 selected, 1.0 after)

Mood: Strategic, team-focused. The green selection state creates clear visual hierarchy of who's in the lineup.
```

---

## 23. Club-Match Ergebnis-Screen (Club A vs. Club B)

```
Design the Club vs. Club match result screen for "Schuss-Challenge" (390×844px, dark OLED).
This is the post-match overview showing both teams' results side by side.

Background: #0a0a0a with a very subtle radial glow at top (rgba(34,197,94,0.09) for win, rgba(255,255,255,0.04) neutral).

── WINNER BANNER (top, full-width) ──
Full-width, padding 22px 22px 18px, text center:
  Eyebrow "MATCH BEENDET" rgba(255,255,255,0.35) 10px uppercase letter-spacing 0.28em
  Winner label "SV PRÄZISION GEWINNT!" Outfit 800 23px white letter-spacing -0.01em margin-top 8px
  Score gap pill: "271 Ringe Vorsprung" rgba(34,197,94,0.12) bg, border rgba(34,197,94,0.25), #4ade80 text, 13px 700, radius 100px, padding 6px 16px, margin-top 8px

── TEAM VERSUS CARD (full-width, main centerpiece) ──
Card: rgba(18,18,18,0.95) bg, border rgba(255,255,255,0.08), radius 22px, padding 18px 16px

Club row (flex, 3 columns: left-club | VS | right-club):

Left — SV Präzision (winner):
  Club icon: 48×48px circle, rgba(34,197,94,0.14) bg, border 2px solid #22c55e, "🏛" emoji 24px
    box-shadow: 0 0 16px rgba(34,197,94,0.3)
  Club name: "SV Präzision" Outfit 700 14px white, margin-top 6px, text-center
  Score: "1.947" Bebas Neue 34px #22c55e letter-spacing 0.02em, text-center
  Label: "RINGE GESAMT" rgba(255,255,255,0.35) 9px uppercase letter-spacing 0.15em, text-center

Center — VS:
  "VS" Bebas Neue 18px rgba(255,255,255,0.2) letter-spacing 0.1em
  Below: winner crown icon 🏆 14px (only visible if match complete)

Right — SC Berlin (loser):
  Club icon: 48×48px circle rgba(255,255,255,0.05) bg, border rgba(255,255,255,0.12), "🎯" emoji 24px (dimmer)
  Club name: "SC Berlin" rgba(255,255,255,0.6) 14px text-center
  Score: "1.676" Bebas Neue 34px rgba(255,255,255,0.55) text-center
  Label: "RINGE GESAMT" same as left but muted

Divider rgba(255,255,255,0.06) 1px full-width margin 14px 0

── INDIVIDUAL SCORES TABLE ──
Section eyebrow "EINZELERGEBNISSE" rgba(255,255,255,0.35) 9px uppercase letter-spacing 0.15em, margin-bottom 10px

Table-like list: flex rows, each 44px height, padding 0 4px

Header row: "#" · "Schütze" · "SV Präz." · "SC Berlin" — all rgba(255,255,255,0.3) 10px 600

Data rows (3 visible, "Alle anzeigen →" link):

Row 1:
  "#1" rgba(255,255,255,0.35) 12px DM Mono
  "Max M." Outfit 600 13px white (left team name only shown for own team)
  "391,4" Outfit 700 14px #22c55e (winner column)
  "385,2" Outfit 700 14px rgba(255,255,255,0.5) (loser column)
  Crown micro-icon 🥇 10px beside winner score

Row 2:
  "#2" · "Anna S." · "389,2" #22c55e · "381,7" muted

Row 3:
  "#3" · "Klaus P." · "383,8" muted vs "388,3" rgba(255,149,0,0.9) (SC Berlin wins this row — row highlight: rgba(255,149,0,0.04) bg)

── TOP-SCHÜTZE BADGE ──
Bottom of card: full-width strip, rgba(255,200,64,0.06) bg, border-top rgba(255,200,64,0.12), padding 10px 14px
Flex row: ⭐ emoji 16px + "Top-Schütze: Max M. — 391,4 Ringe" Outfit 600 13px rgba(255,200,64,0.9)

── ACTION BUTTONS ──
"Erneut herausfordern" — full-width, rgba(34,197,94,0.12) bg, border rgba(34,197,94,0.3), #22c55e text, radius 14px, padding 14px, Outfit 700 14px
"Zur Liga-Tabelle →" — ghost link below, rgba(255,255,255,0.45) text, no border, padding 12px, text-center, 13px

Mood: Competitive, data-dense. Green = winning team, muted = losing team. The score comparison is the hero.
```

---

## 24. Liga-Tabelle & Spielplan

```
Design the League (Liga) screen for "Schuss-Challenge" (390×844px, dark OLED).
Two inner tabs: "Tabelle" and "Spielplan".

Background: #0a0a0a. Fonts: Outfit (UI), Bebas Neue (numbers), DM Mono (codes). Accent: #22c55e.

── HEADER ──
"DSB-Liga" Outfit 800 27px white
"Saison 2026/1 · LG 40 · Division 1" rgba(255,255,255,0.4) 12px margin-top 3px

Season countdown pill (right or below header):
  rgba(255,200,64,0.1) bg, border rgba(255,200,64,0.22), "⏱ Noch 42 Tage" #ffc840 11px 700, radius 100px, padding 5px 12px

── INNER TABS ──
Full-width pill container (rgba(255,255,255,0.04) bg, radius 18px, padding 4px, flex, gap 2px):
  "Tabelle" — ACTIVE: rgba(255,255,255,0.09) bg, white text 800, radius 14px
  "Spielplan" — INACTIVE: rgba(255,255,255,0.4) text

══ TAB 1: TABELLE (ACTIVE) ══

Division selector (horizontal scroll chips, gap 8px, margin-bottom 14px):
  "Division 1" — selected: #22c55e bg, #000 text, 11px 800, radius 100px, padding 6px 14px
  "Division 2" — unselected: rgba(255,255,255,0.06) bg, rgba(255,255,255,0.5) text

Column headers (flex, padding 0 4px, margin-bottom 4px):
  "#" 28px width · "Verein" flex-1 · "Sp" 32px · "S" 28px · "N" 28px · "Pkt" 36px
  All: rgba(255,255,255,0.3) 10px 600 uppercase, text-right except "Verein" left

Standing rows (gap 0, each 54px height):

Row 1 (rank #1 — Aufsteiger, green left indicator):
  Left bar: 3px wide, #22c55e, full row height (promotion zone indicator)
  "#1" DM Mono 13px rgba(34,197,94,0.9) 700, width 28px
  Club area (flex-1, flex row, gap 8px, align-items center):
    Club icon 32×32px circle, rgba(34,197,94,0.14) bg, border rgba(34,197,94,0.3): "🏛" 16px
    "SV Präzision" Outfit 700 13px white
  "8" DM Mono 13px white, text-right, width 32px
  "7" DM Mono 13px #22c55e, width 28px (Siege in green)
  "1" DM Mono 13px rgba(255,255,255,0.45), width 28px
  "21" DM Mono 14px 700 white, width 36px

Row 2 (rank #2):
  Same structure, no color accent. "SG Westend" / 7 Sp / 5 S / 2 N / 15 Pkt

Row 3 (rank #3 — CURRENT USER'S CLUB highlighted):
  Full row: rgba(34,197,94,0.05) bg, border-left 3px solid rgba(34,197,94,0.35)
  "SC Precision" Outfit 700 13px white + small "Du" badge (rgba(34,197,94,0.12) bg, #22c55e text, 9px, radius 100px, padding 2px 7px, margin-left 6px)
  Stats: 7 Sp / 4 S / 3 N / 12 Pkt

Row 4 (rank #4 — Abstiegszone, red right indicator):
  Right bar: 3px wide, rgba(255,74,74,0.7), full row height (relegation zone)
  "SC Berlin" / 7 / 3 / 4 / 9 Pkt. All text rgba(255,255,255,0.65) (slightly dimmed)

Row 5 (rank #5 — Abstieg):
  Same red right indicator. "SV Mitte" / 7 / 1 / 6 / 3 Pkt. More muted.

Zone legend (below table, flex row, gap 16px):
  "● Aufstieg" — #22c55e dot 8px + rgba(255,255,255,0.4) 10px
  "● Abstieg" — rgba(255,74,74,0.7) dot + rgba(255,255,255,0.4) 10px

══ TAB 2: SPIELPLAN ══

Matchday selector (horizontal chips, gap 8px):
  "Spieltag 1" · "Spieltag 2" · "Spieltag 3" (ACTIVE) · "Spieltag 4" (future, muted)

Match cards (gap 12px):

Completed match card (rgba(18,18,18,0.92) bg, radius 16px, padding 14px 16px):
  Top row: "Spieltag 3 · 18. Jun 2026" rgba(255,255,255,0.3) 10px 600 + "Abgeschlossen" green pill (rgba(34,197,94,0.12) bg, #22c55e text, 9px 700, radius 100px, padding 3px 9px)
  VS row (flex, 3 columns):
    "SV Präzision" Outfit 700 14px white (left, left-aligned)
    Score center: "1.947" Bebas Neue 22px #22c55e + " — " rgba(255,255,255,0.3) + "1.676" 22px rgba(255,255,255,0.5)
    "SC Berlin" rgba(255,255,255,0.55) 14px right-aligned

Upcoming match card (border rgba(34,197,94,0.2), rgba(34,197,94,0.04) bg):
  Top row: "Spieltag 4 · 25. Jun 2026" + "Bald" pill in #ffc840 style
  VS row: "SV Präzision" vs. "SG Westend" — no scores yet, dash "— · —" center in muted
  "Mitspielen →" link right in #22c55e 12px 700

Mood: Sports app standings page — data-dense but legible. Green accent for promotion zones, red for relegation. Your club row always stands out.
```

---

## 25. Saison-Ende Ceremony Screen

```
Design the season-end celebration/reveal screen for "Schuss-Challenge" (390×844px, dark OLED).
This full-screen overlay appears when the season concludes. It reveals promotion, relegation, or retention.

Background: #0a0a0a with a dramatic radial glow at top-center:
  Promotion: rgba(34,197,94,0.22) → transparent (green)
  Relegation: rgba(255,74,74,0.14) → transparent (red)
  Retention: rgba(255,200,64,0.14) → transparent (gold)
(Show all 3 variants side by side)

── PROMOTION VARIANT ──

Top section (padding-top 60px, text-center):
  Confetti particles: ~30 small elongated rectangles (4×10px, random rotate, random colors: #22c55e #ffc840 #4ade80 #fff #ff9500), scattered across top 60% of screen with varying opacity 0.4–0.9
  🏆 trophy emoji, 72px, centered, drop-shadow 0 0 40px rgba(255,200,64,0.5)
  "AUFSTIEG!" Bebas Neue 52px #22c55e letter-spacing 0.04em margin-top 16px
  "Du spielst nächste Saison in Division 1!" Outfit 700 16px white margin-top 8px
  "SV Präzision e.V." rgba(255,255,255,0.55) 13px margin-top 4px

Season stats card (margin-top 28px, rgba(18,18,18,0.95) bg, border rgba(34,197,94,0.2), radius 20px, padding 18px):
  Header "Deine Saison 2026/1" Outfit 700 14px rgba(255,255,255,0.55) text-center, margin-bottom 14px
  4-column mini stats (each column: value Bebas Neue 28px, label rgba(255,255,255,0.4) 10px):
    "8" / "Spiele" · "7" white / "Siege" · "1.947" #22c55e / "Ringe" · "#1" #ffc840 / "Rang"

Badge unlock strip (margin-top 14px, padding-top 14px, border-top rgba(255,255,255,0.07)):
  Center badge (96×96px, centered):
    Octagon shape (SVG), gradient border: #ffc840 → #22c55e (2px, solid)
    Inner: rgba(255,200,64,0.1) bg, "🥇" emoji 44px center
    Box-shadow: 0 0 32px rgba(255,200,64,0.4), 0 0 8px rgba(34,197,94,0.3)
  Below: "Saison-Badge freigeschaltet!" Outfit 700 14px white
  "Liga-Meister 2026/1" rgba(255,200,64,0.8) 12px 600 margin-top 4px

── RELEGATION VARIANT ──
Similar layout, red theme:
  😤 emoji (no crying — respectful)
  "ABSTIEG" Bebas Neue 52px rgba(255,74,74,0.85)
  "Nächste Saison in Division 2. Komm zurück!" Outfit 700 16px white
  Same stats card, border rgba(255,74,74,0.18)
  Badge: "Kämpfer" badge (shield shape, rgba(255,74,74,0.12) inner) — even losing gets a memento

── SHARED BOTTOM BUTTONS ──
"Nächste Saison anmelden" full-width #22c55e bg #000 text, radius 14px, padding 15px, Outfit 800 15px
"Saison-Bericht ansehen →" ghost link below, rgba(255,255,255,0.45) 13px text-center, padding 12px

Mood: Emotion-first. The promotion screen should feel like a real sports moment. Even relegation ends with respect, not shame.
```

---

## 26. Upgrade / Paywall Screen

```
Design the Premium upgrade / paywall screen for "Schuss-Challenge" (390×844px, dark OLED).
This screen appears when a free user taps a Premium-gated feature.

Background: #0a0a0a with a subtle radial gold glow at top (rgba(255,200,64,0.10) → transparent).
Fonts: Outfit (UI), Bebas Neue (numbers), DM Mono (price).

── HEADER ──
"✦ Schuss-Challenge" Outfit 700 14px rgba(255,200,64,0.8) text-center (premium wordmark)
"Premium" Bebas Neue 44px white letter-spacing 0.04em text-center margin-top 8px
"Heb dein Training auf das nächste Level." Outfit 500 15px rgba(255,255,255,0.5) text-center margin-top 6px

── FEATURE LIST CARD ──
Full-width card, rgba(18,18,18,0.95) bg, border rgba(255,255,255,0.08), radius 20px, padding 18px

Feature rows (gap 0, each 48px height, border-bottom rgba(255,255,255,0.06)):

Row style: flex, gap 14px, align-items center
Left: 38×38px icon square, radius 10px
Center: feature name Outfit 700 14px white + sub Outfit 400 11px rgba(255,255,255,0.4) margin-top 1px
Right: ✓ icon for free, or ✓ in green for premium, or lock icon for locked-for-free

Feature 1 — KI-Coach (Premium):
  Icon square: rgba(34,197,94,0.14) bg, border rgba(34,197,94,0.25) → 🤖 emoji 18px
  "KI-Coach" / "Personalisierte Trainingsanalyse via Claude"
  Right: ✓ in #22c55e (18px, bold)

Feature 2 — Analytics-Export (Premium):
  Icon: rgba(0,195,255,0.12) bg → 📊 emoji
  "Analytics-Export" / "PDF-Bericht · Langzeit-Trends"
  Right: ✓ #22c55e

Feature 3 — Cosmetics & Saison-Titel (Premium):
  Icon: rgba(255,200,64,0.12) bg → ✨ emoji
  "Saison-Cosmetics" / "Exklusive Titel, Profilrahmen, Badges"
  Right: ✓ #22c55e

Feature 4 — Challenges unlimitiert (Premium):
  Icon: rgba(170,90,255,0.12) bg → ⚡ emoji
  "Unlimitierte Challenges" / "Free: max. 5 offen. Premium: unbegrenzt."
  Right: ✓ #22c55e

Feature 5 — Basis-Spielen (Free):
  Icon: rgba(255,255,255,0.05) bg → 🎯 emoji
  "Training & Duelle" / "Immer kostenlos, für alle."
  Right: ✓ in rgba(255,255,255,0.4)

── SOCIAL PROOF ──
Below card, text-center, margin-top 16px:
  Small avatar row: 3 overlapping circles (32×32px each, -8px margin, same avatar gradient style), +43 badge (small circle, rgba(255,255,255,0.08) bg, "+43" rgba(255,255,255,0.6) 9px)
  "847 Schützen sind Premium" rgba(255,255,255,0.4) 12px margin-top 8px

── PRICE + CTA ──
Price row (text-center, margin-top 20px):
  "2,99 €" DM Mono 36px white + " / Monat" rgba(255,255,255,0.4) Outfit 400 14px (inline)
  "Jederzeit kündbar" rgba(255,255,255,0.3) 11px margin-top 6px

CTA button: "JETZT PREMIUM WERDEN" full-width, background: linear-gradient(135deg, #ffc840, #ff9500),
  #000 text, Outfit 800 15px, border-radius 14px, padding 16px,
  box-shadow: 0 4px 24px rgba(255,200,64,0.35)

Below CTA: "Kostenlos weiterspielen →" rgba(255,255,255,0.35) 13px text-center, padding 12px, underline

Mood: Aspirational but not aggressive. The feature list is the hero — "look what you unlock". Price is clear, no tricks, no dark patterns.
```

---

## 27. KI-Coach Analyse-Screen

```
Design the AI Coach (KI-Coach) screen for "Schuss-Challenge" (390×844px, dark OLED).
Premium-only feature. Powered by Claude API. Shows personalized shot-pattern analysis and training tips.

Background: #0a0a0a with a very subtle radial green-teal glow at top (rgba(34,197,94,0.08) → transparent).
Fonts: Outfit (UI), Bebas Neue (numbers), DM Mono (stats).

── HEADER ──
"🤖 KI-Coach" Outfit 800 22px white (left-aligned, with emoji)
"Analyse der letzten 50 Spiele · LG 40" rgba(255,255,255,0.4) 12px
Small "PREMIUM" badge inline with header: rgba(255,200,64,0.12) bg, border rgba(255,200,64,0.25), #ffc840 text, 9px 700, radius 100px, padding 3px 8px

── STÄRKEN & SCHWÄCHEN CARD ──
Full-width card, rgba(18,18,18,0.95) bg, border rgba(255,255,255,0.08), radius 20px, padding 16px, margin-bottom 14px

Section label "ANALYSE" rgba(255,255,255,0.3) 9px uppercase letter-spacing 0.2em, margin-bottom 12px

Shot position heatmap row (this is the key visual):
  Label: "Schwache Schuss-Positionen" Outfit 600 13px rgba(255,255,255,0.7), margin-bottom 10px
  Horizontal bar visualization (40 slots for LG40):
    Container: full-width, 36px height, radius 8px, overflow hidden, flex row (no gap)
    Each slot: ~1/40 of width, height 100%
    Color: intensity based on Ø-ring-value for that shot position:
      ≥ 9.5: rgba(34,197,94,0.8) (strong, no label)
      8.5–9.4: rgba(34,197,94,0.35)
      7.5–8.4: rgba(255,149,0,0.5)
      < 7.5: rgba(255,74,74,0.7) (weak shot position)
    Weak positions (e.g., slots 12, 13, 28, 29) have slightly taller height or a red dot above
  Below: x-axis mini labels "1" and "40" (DM Mono 9px rgba(255,255,255,0.3)) at left and right ends
  Below that: "Schuss 12–13 und 28–29 sind dein größtes Verbesserungspotenzial." rgba(255,255,255,0.5) 11px

Two insight pills (flex row, gap 8px, margin-top 12px):
  "⚠️ Konzentration lässt nach Schuss 25 nach" — rgba(255,149,0,0.1) bg, border rgba(255,149,0,0.25), rgba(255,149,0,0.9) text, 11px 600, radius 100px, padding 6px 12px
  "✅ Erste 10 Schüsse konstant stark" — rgba(34,197,94,0.1) bg, border rgba(34,197,94,0.25), #4ade80 text

── KI-COACH NACHRICHT CARD ──
Full-width card, rgba(18,18,18,0.95) bg, border rgba(34,197,94,0.15), radius 20px, padding 16px

Top row (flex, gap 12px, align-items center):
  Bot avatar: 44×44px circle, linear-gradient(135deg, rgba(34,197,94,0.25), rgba(0,195,255,0.2)) bg, border 1.5px solid rgba(34,197,94,0.35): 🤖 emoji 22px
  "Dein KI-Coach" Outfit 700 14px white / "Personalisierter Trainingsplan" rgba(255,255,255,0.4) 11px

Message text area (margin-top 12px):
  Text block simulating Claude's response — Outfit 400 13px rgba(255,255,255,0.8) line-height 1.6, max 5 lines visible
  Example: "Ich sehe, dass deine Schüsse 12 und 13 im Schnitt 0.4 Ringe unter deinem Gesamtdurchschnitt liegen. Das ist ein klassisches Zeichen von mentaler Ermüdung in der mittleren Serienphase. Empfehlung: Baue eine kurze 3-Sekunden-Atemübung..."
  (Text fades at bottom with a gradient rgba(18,18,18,0) → rgba(18,18,18,0.95) overlay if longer)
  "Mehr lesen →" link, #22c55e 12px 700, below fade

── TRAININGSPLAN ROW ──
Section header "WOCHENPLAN" rgba(255,255,255,0.3) 9px uppercase letter-spacing 0.2em, margin-bottom 10px

3 small plan cards (horizontal scroll, gap 10px):
Each card: 140×80px, rgba(18,18,18,0.95) bg, border rgba(255,255,255,0.07), radius 14px, padding 12px

Card 1: "Mo + Mi" rgba(255,255,255,0.4) 9px / "Schuss 10–15 Fokus" Outfit 700 12px white / "20 Minuten" rgba(34,197,94,0.8) 11px
Card 2: "Di + Do" / "Atemtechnik" / "15 Minuten"
Card 3: "Freitag" / "Vollserie LG40" / "45 Minuten"

── BOTTOM CTA ──
"Training jetzt starten →" — full-width, #22c55e bg, #000 text, radius 14px, padding 14px, Outfit 800 14px

"Analyse aktualisiert vor 3h · nächste Aktualisierung in 21h" rgba(255,255,255,0.2) 10px text-center, margin-top 10px

Mood: Scientific + warm. The shot heatmap is the killer feature. The coach message feels personal, not robotic. Premium but approachable.
```

---

## 28. Social Activity-Feed

```
Design the Social Activity Feed screen for "Schuss-Challenge" (390×844px, dark OLED).
Strava-style friend activity stream. Shows what friends are doing in the app.

Background: #0a0a0a. Fonts: Outfit (UI), Bebas Neue (numbers). Accent: #22c55e.

── HEADER ──
"Aktivitäten" Outfit 800 27px white
"Von deinen Freunden" rgba(255,255,255,0.4) 12px

── ONLINE STORIES ROW ──
Horizontal scroll, padding 0 0 14px, gap 12px:
  Each story circle: 56×56px outer (full), 52×52px inner avatar circle, gap 2px between
  Avatar border for "online now": 2px gradient border (linear-gradient(135deg, #22c55e, #4ade80))
  Avatar: gradient bg circle + letter initial, 20px Outfit 700 white
  Name below: 9px rgba(255,255,255,0.55) Outfit 600, max-width 56px, truncate

  Show 5 stories: "Max" (online, green border) · "Anna" (online) · "Klaus" (offline, rgba(255,255,255,0.15) border) · "Lisa" (online) · "Tom" (offline)
  "Du" story (first): border #22c55e, center "+" icon instead of initial — "Neue Challenge"

── ACTIVITY FEED (vertical, gap 14px) ──

Activity card base: full-width, rgba(18,18,18,0.92) bg, border 1px rgba(255,255,255,0.07), radius 18px, overflow hidden

━━ CARD 1 — Duel Win ━━
Top row (padding 13px 14px, flex, gap 10px, align-items flex-start):
  Avatar: 40×40px circle, rgba(34,197,94,0.15) bg, border rgba(34,197,94,0.3) → "M" white 700 16px
  Right block (flex 1):
    "Max Muster" Outfit 700 14px white + "hat gewonnen" rgba(255,255,255,0.55) 14px (inline)
    "LG 40 · Mittel · Heute, 09:30 Uhr" rgba(255,255,255,0.3) 11px margin-top 2px
  Timestamp "9m" rgba(255,255,255,0.25) 11px top-right

Stat bar (border-top rgba(255,255,255,0.06), padding 10px 14px, flex, gap 20px):
  "391,4" Bebas Neue 24px #22c55e + " Ringe" rgba(255,255,255,0.4) 11px (result)
  "vs. Bot 386,2" rgba(255,255,255,0.35) 12px
  Spacer.
  "+20 XP" rgba(255,200,64,0.8) 12px 700

Reaction row (border-top rgba(255,255,255,0.06), padding 8px 14px, flex, gap 6px):
  Each reaction button: emoji + count — minimal pill (rgba(255,255,255,0.05) bg, radius 100px, padding 5px 10px, border rgba(255,255,255,0.08)):
    "🔥 3" — rgba(255,149,0,0.12) bg, #ff9500 text (if reacted)
    "🎯 1"
    "👍 0"
  Add reaction button: "+" rgba(255,255,255,0.3) 14px, same pill style

━━ CARD 2 — Achievement Unlock ━━
Top row: Avatar "A" purple gradient border. "Anna Schmidt hat ein Erfolg freigeschaltet" + timestamp "1h"
Achievement badge inline: 32×32px square radius 10px, rgba(170,90,255,0.15) bg, border rgba(170,90,255,0.3), "👑" emoji 16px center
"Unbesiegbar · 20 Siege in Serie" Outfit 700 13px white + rgba(255,255,255,0.4) 11px sub
Reactions: "👑 5" · "🔥 2"

━━ CARD 3 — Liga Aufstieg ━━
Top row: Club icon 40×40px circle (🏛), gold border rgba(255,200,64,0.4). "SV Präzision ist aufgestiegen!" + "2h"
"Division 2 → Division 1" Outfit 700 14px white / gold accent
Stat: "Saison 2026/1 · 7 Siege · Platz #1" rgba(255,255,255,0.45) 12px
Reactions: "🎉 12" · "🔥 8" · "👍 5"

━━ EMPTY STATE (no friends yet) ━━
Centered card (rgba(18,18,18,0.6) bg, border dashed rgba(255,255,255,0.08), radius 20px, padding 36px 22px):
  "🎯" emoji 48px center
  "Noch keine Aktivitäten" Outfit 700 17px white margin-top 14px text-center
  "Füge Freunde hinzu um ihren Fortschritt zu sehen." rgba(255,255,255,0.4) 14px text-center margin-top 6px
  "Freunde finden →" outlined button, border rgba(34,197,94,0.35), #22c55e text, radius 12px, padding 12px 24px, Outfit 700 13px, margin-top 16px

Mood: Social, athletic, warm. Reactions create micro-dopamine. The feed feels alive. Less Instagram, more Strava.
```

---

## 29. Notification-Center

```
Design the in-app Notification Center screen for "Schuss-Challenge" (390×844px, dark OLED).
Central hub for all events: duel requests, club news, achievements, league updates.

Background: #0a0a0a. Fonts: Outfit (UI). Accent: #22c55e.

── HEADER ──
"Benachrichtigungen" Outfit 800 22px white (left-aligned)
Right: "Alle gelesen" ghost link — rgba(255,255,255,0.4) 13px, underline, Outfit 500

Unread count badge inline with title (or in bottom nav): small filled circle #22c55e, "4" white 700 10px, 18×18px

── FILTER TABS ──
Full-width horizontal scroll chips, gap 8px, padding-bottom 4px:
  "Alle" — ACTIVE: #22c55e bg, #000 text, 11px 800, radius 100px, padding 6px 14px
  "Duelle" — inactive pill style
  "Club" — inactive
  "Liga" — inactive
  "Erfolge" — inactive

── NOTIFICATION GROUPS ──

Group header style: "HEUTE" rgba(255,255,255,0.3) 10px 700 uppercase letter-spacing 0.18em, margin 16px 0 8px

━━ UNREAD NOTIFICATIONS (left accent bar) ━━

Notification row style:
  Container: full-width, rgba(18,18,18,0.95) bg, border-left 3px solid (color per type), radius 0 14px 14px 0, padding 12px 14px
  Flex row, gap 12px

Notif 1 — Duel Request (border #22c55e):
  Icon circle 40×40px, rgba(34,197,94,0.14) bg, border rgba(34,197,94,0.3): ⚔️ emoji 18px
  Content (flex 1):
    "MaxMuster fordert dich heraus" Outfit 700 14px white
    "LG 40 · Schwer · Läuft noch 22 Stunden" rgba(255,255,255,0.4) 11px margin-top 2px
  Right side: "Annehmen" button, rgba(34,197,94,0.14) bg, border rgba(34,197,94,0.3), #22c55e text, 11px 700, radius 100px, padding 6px 12px
  Timestamp "5m" rgba(255,255,255,0.25) 10px top-right

Notif 2 — Club Match Ergebnis (border #00c3ff):
  Icon: 🏛 emoji, rgba(0,195,255,0.12) bg, border rgba(0,195,255,0.25)
  "Club-Match abgeschlossen: SV Präzision gewinnt!" Outfit 700 14px white
  "1.947 — 1.676 · gegen SC Berlin" rgba(255,255,255,0.4) 11px
  No action button. "12m" timestamp.

Notif 3 — Achievement (border #aa5aff):
  Icon: 👑 emoji, rgba(170,90,255,0.12) bg
  "Erfolg freigeschaltet: Serien-Meister" Outfit 700 14px white
  "10 Siege in Serie — +300 XP" rgba(255,255,255,0.4) 11px
  "1h" timestamp.

Notif 4 — Liga Update (border #ffc840):
  Icon: 🏆 emoji, rgba(255,200,64,0.12) bg
  "Saison-Ende in 7 Tagen!" Outfit 700 14px white
  "Division 1 · SV Präzision auf Platz #3" rgba(255,255,255,0.4) 11px
  "3h" timestamp.

━━ READ NOTIFICATIONS ━━

Group header "GESTERN" — same style.

Read row style (same structure, no left border, lower contrast):
  Container: rgba(14,14,14,0.8) bg (darker/dimmer). All text slightly more muted.

Two more rows: older duel result + achievement — muted, no action buttons.

── EMPTY STATE ──
(shown when filter tab has no matching items)
Center column: 🔔 emoji 40px, opacity 0.3. "Keine Benachrichtigungen" rgba(255,255,255,0.3) 14px Outfit 700 text-center.

── SETTINGS LINK (bottom) ──
"Benachrichtigungseinstellungen verwalten →" rgba(255,255,255,0.3) 12px Outfit 500 text-center, padding 16px.

Mood: Utilitarian but styled. The colored left border per notification type creates instant visual scanning. Unread = pop, read = recede. No overwhelm.
```
