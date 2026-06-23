# Design Prompts — Schuss-Challenge

Fertige Copy-Paste-Prompts für Claude Design / Canva AI / Figma AI.
Alle Prompts benutzen das bestehende Design-System der App.

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
