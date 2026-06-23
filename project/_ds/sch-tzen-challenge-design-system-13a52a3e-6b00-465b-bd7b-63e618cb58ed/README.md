# Schützen Challenge — Design System

A design system distilled from the **Schützen Challenge** product: a dark, gamified,
mobile-first PWA for sport shooters (Luftgewehr / air rifle & Kleinkaliber / small-bore).
It blends serious training & safety documentation with a playful, achievement-driven
game loop — train, log your rings, complete challenges, and duel a bot or friends.

> "Eine Schuss-Challenge wo man gegen Bot oder Spieler schießen kann mit Challenges und weiteren."

## Sources

This system was reverse-engineered from the product source code:

- **GitHub:** [`kr511/schuss-challenge`](https://github.com/kr511/schuss-challenge) — the live PWA (HTML/CSS/vanilla JS, Supabase backend, Cloudflare Worker). Explore this repo to build higher-fidelity designs; the canonical styling lives in `styles.css` and `redesign.css`, structure in `index.html`, and navigation in `tab-navigation.js`.

Nothing here assumes you have repo access — all extracted tokens, assets and component
recreations are stored locally in this project. If you *do* have access, the repo is the
ground truth.

## The product at a glance

Schützen Challenge ("Schussduell" is the legacy name for the bot/duel mode) is a **Beta PWA**.
Core surfaces, all inside one bottom-tab mobile shell:

| Tab | German label | What it does |
|-----|--------------|--------------|
| **Start** | Start | Daily-goal ring tracker, overview stat tiles, last training, active challenges |
| **Training** | Training | Quick-training entry (10 shots → total/avg/best), history, performance charts |
| **Challenges** | Challenges | Daily missions, bot duels, friend challenges, invitations, completed results |
| **Friends** | Freunde | Friend list with online status, friend code, requests, blocked users |
| **Profile** | Profil | Avatar, level/XP, rank, achievements (hex badges), personal bests, club |

Supporting flows: a **welcome/onboarding** overlay (pick a name → optional club code),
**duel setup** (shot count, distance, difficulty: Einfach/Realistisch/Schwer/Elite),
**level-up** and **healthy-break** overlays, club system, chat, and a Beta
**photo/OCR scoring** assist (always manually verified — no electronic target).

Everything works **offline / locally** (StorageManager + `sd_`-prefixed localStorage);
Supabase adds login, friends, ranglisten and async challenges when configured.

---

## CONTENT FUNDAMENTALS

**Language.** German (de-DE) throughout — `lang="de"`. Recreations should stay in German.

**Voice — direct, warm, second-person *du*.** Copy speaks to one shooter as a coach would:
`"Bereit für dein nächstes Training?"`, `"Verbessere dich. Jeden Schuss."`,
`"Trainiere zusammen. Fordere dich heraus."`, `"Gemeinsam besser werden!"`. It's
encouraging, never corporate.

**Casing.**
- Page titles & greetings: sentence/Title case — `"Training"`, `"Hallo, Schütze! 👋"`.
- Big CTA buttons & overlay titles: **ALL CAPS** — `"JETZT STARTEN"`, `"WILLKOMMEN"`, `"LEVEL UP!"`, `"2 MIN PAUSE"`.
- Tiny eyebrow labels above stats: UPPERCASE with wide letter-spacing — `"Ø RINGE DIESE WOCHE"`, `"DEIN HEUTIGES ZIEL"`.

**Tone is dual.** Gamified excitement (`"🎯 Tagesziel erreicht! +50 XP"`, `"🏆 VEREIN BEITRETEN"`)
sits next to sober, safety-first seriousness in the training/duel flows (the README stresses
*"Ergebnis bitte immer manuell prüfen"* and visible Sicherheitshinweise). Match the register
to the surface: hype on the dashboard, calm precision in scoring.

**Emoji are part of the brand.** Used liberally and meaningfully as inline iconography:
🎯 (the mascot/target, everywhere), 🌬️ Luftgewehr, 🎯 Kleinkaliber, ⚔️ duel, 🔥 streak,
🏆 win, 💔 loss, 🤝 draw, 👥 friends, 🏹 club, 🫶 healthy break, 👋 greeting, 🚀/🏅/📥/📤.
Don't strip them — they carry meaning and set the playful tone.

**Number style.** German formatting — comma decimal (`9,7`), `Ringe` as the unit, `Ø` for
average, `de` locale number grouping for XP. Scores shown to one decimal (`95.4`).

**Vocabulary.** Schütze (shooter), Ringe (rings/points), Serie (series), Duell, Challenge,
Verein (club), Disziplin, LG (Luftgewehr 10m) / KK (Kleinkaliber 50m), Streak, Tagesziel,
Auszeichnungen (awards), Bestleistung (personal best).

---

## VISUAL FOUNDATIONS

**Overall vibe.** A premium, dark, **OLED-black gaming dashboard** for a niche sport.
Think competitive-app energy (neon-green accents, glowing stats, badges, streaks) with a
muted, grown-up restraint — one saturated hue on near-black, never rainbow.

**Color.** Single hero accent: **sport green `#22c55e`** (bright `#4ade80`, deep `#16a34a`).
The PWA theme-color and logo lean a more olive lime (`#7ab030` / `#8ecf40`). Surfaces are
**near-black** (`#0a0a0a` canvas, `rgba(18,18,18,.92)` cards). Semantic accents are used
sparingly and consistently: **blue `#00c3ff`/`#70aaf0`** = Kleinkaliber & info, **gold
`#ffc840`** = elite/rewards/win-rate, **purple `#aa5aff`** = streak/totals, **red `#ff4a4a`**
= loss/danger/low-ammo, **orange `#ff9500`** = warning. Medal tiers bronze/silver/gold.

**Type.** Three families. **Bebas Neue** — tall condensed caps for the wordmark and all big
stat numerals (gives the "scoreboard" feel). **Outfit** — the UI workhorse (300–800), titles
at 800 with tight `-0.02em` tracking, body at 400. **DM Mono** — friend codes, XP readouts,
anything tabular. Eyebrow labels are 0.55rem uppercase at `.28em` tracking.

**Backgrounds.** Layered, not flat: a near-black base **plus** soft radial green glows
(`radial-gradient(... rgba(34,197,94,0.12) ...)` top-center and a fainter one bottom-right),
**plus a subtle fractal-noise grain overlay** (SVG `feTurbulence`, ~4% opacity) for texture.
No photos as page backgrounds; imagery is contained inside cards. No busy gradients on content.

**Glass & blur.** Sticky header and bottom nav use **backdrop-blur** (`blur(24–28px)
saturate(1.6–1.8)`) over translucent black — the iOS-style frosted chrome. Sheets/overlays
dim the page with `rgba(0,0,0,.55)` + `blur(4px)`.

**Cards.** Translucent dark fill (`rgba(18,18,18,.92)`), **1px hairline border**
(`rgba(255,255,255,.07)`), radius **16px (md)** for tiles / **20px (lg)** for feature cards,
soft drop shadow (`0 8px 24px rgba(0,0,0,.55)`). Accent cards swap the hairline for a green
border + green-tinted fill and may add a green glow shadow (`--sh-accent`). Avoid the
"rounded card with a single colored left-border" trope — borders here are full hairlines.

**Corner radii.** sm 10px · md 16px · lg 20px · xl 28px · pills/full 100px. Icon chips and
small buttons use 10–12px; avatars and status dots are full circles.

**Glows & shadows.** Active/important text gets a colored `text-shadow` glow
(`0 0 10px rgba(34,197,94,.4)`); active nav icons get `drop-shadow`. This neon-glow accenting
is a signature — use it on the active accent, sparingly.

**Borders/dividers.** Internal card sections are split by 1px `rgba(255,255,255,.06)` rules.

**Buttons & states.**
- *Primary* — solid green fill, **black text**, pill or 12–16px radius, `--sh-accent` glow.
- *Outline* — transparent with a green hairline + green text.
- *Icon button* — 44×44 circle, `rgba(255,255,255,.07)` fill, faint border.
- *Hover* (where present, desktop): subtle lighten of the translucent fill.
- *Press*: **scale down** `transform: scale(0.91–0.95)` and/or darken — the tactile,
  app-like feedback is everywhere (`:active { transform: scale(...) }`). Hit targets ≥ 44px.

**Animation.** Spring-y, short, purposeful. Sheets slide up with a bounce
(`cubic-bezier(.32,1.2,.64,1)`), tab underlines scale-x in with overshoot
(`cubic-bezier(.34,1.56,.64,1)`), XP bars ease over `.6s`, low-ammo numbers pulse. Muzzle-flash
and level-up moments are celebratory. Default transitions are fast (`.12–.22s`). No gratuitous
parallax; motion reinforces feedback and reward.

**Transparency.** Heavy, deliberate use of `rgba(255,255,255,α)` for borders/fills layered on
black — gives depth without introducing new colors. Active tints are the accent at 12–15% alpha.

**Imagery vibe.** Dark and contained. The mascot target, reward chest (gold), and bell icons
are warm-on-dark. No grainy photography; the "grain" is the texture overlay, not photos.

**Layout rules.** Fixed sticky header (frosted) + fixed bottom tab bar (frosted), scrolling
content between. Content max-width ~420–480px (phone-first), 16–20px gutters, 10–13px gaps.
A center FAB ("Duell starten") floats above the nav on Start/Training. Stat tiles in 3- or
4-column grids. Everything assumes one-handed mobile use.

---

## ICONOGRAPHY

See the **ICONOGRAPHY** section in [`assets/`](assets/) and the notes here:

**Two parallel icon systems, used together.**

1. **Inline SVG line icons — Feather/Lucide style.** The app hand-codes its UI glyphs as inline
   `<svg viewBox="0 0 24 24">` with `stroke: currentColor; fill: none; stroke-width: 1.8–2.5;
   stroke-linecap/linejoin: round`. These are the **Feather icon set** (target/concentric-circles,
   bell, trophy, users, zap/lightning, bar-chart, swords, filter-funnel, settings-gear, search,
   chevrons, plus, check-circle). For recreations, pull the matching icons from
   **[Lucide](https://lucide.dev)** (the maintained Feather successor) via CDN — stroke-width
   1.8–2 matches. This is a **substitution** of the equivalent set, flagged here.

2. **Emoji as semantic icons.** Used everywhere alongside the line icons for warmth and meaning
   (see Content Fundamentals). 🎯 is effectively the mascot. Keep emoji where the source uses them.

**Raster brand assets** (copied into `assets/`):
- `logo-192.png` / `logo-512.png` — the **app icon / logo**: a bullseye target — concentric
  green rings (olive→lime) on near-black with a coral-red center pip and white crosshairs.
- `glocke.png` — gold notification **bell**.
- `gold-toolbox.png` — gold **reward chest** (daily-reward / loot art).

No icon font is bundled. Unicode arrows (`↓`, `–`) appear in a few labels. Active icons get a
green `drop-shadow` glow (see Visual Foundations).

---

## Index — what's in this system

| File / folder | What it is |
|---|---|
| `README.md` | This document — context, content, visual & icon guidelines |
| `colors_and_type.css` | All color + type tokens (base + semantic CSS vars) |
| `SKILL.md` | Agent-Skills manifest so this system works in Claude Code |
| `assets/` | Logos, bell, reward chest — copy these into deliverables |
| `preview/` | Small HTML cards rendering the system (Design System tab) |
| `ui_kits/app/` | High-fidelity recreation of the mobile PWA (see its README) |

**Fonts:** Bebas Neue, Outfit, DM Mono — all on Google Fonts; `colors_and_type.css` imports
them via CDN (matching the source app). No local TTFs were needed. ⚠️ If you want self-hosted
font files instead of the CDN import, ask and I'll add them.
