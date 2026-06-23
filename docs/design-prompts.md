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
