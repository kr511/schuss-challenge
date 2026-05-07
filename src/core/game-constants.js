/* ─── DISZIPLIN CONFIG ───────────────────── */
const DISC = {
  // Luftgewehr
  lg40: {
    name: 'LG 40', weapon: 'lg', shots: 40, dist: '10', is3x20: false,
    timeMins: 50, desc: '40 Schuss · 50 Min', icon: '🎯',
    info: '<b>LG 40</b> – Klassische Luftgewehr-Disziplin. 40 Schuss auf 10 m. Zeitlimit: 50 Minuten.'
  },
  lg60: {
    name: 'LG 60', weapon: 'lg', shots: 60, dist: '10', is3x20: false,
    timeMins: 70, desc: '60 Schuss · 70 Min', icon: '⭐',
    info: '<b>LG 60</b> – Erweiterte Luftgewehr-Disziplin. 60 Schuss auf 10 m. Zeitlimit: 70 Minuten.'
  },
  // KK
  kk50: {
    name: 'KK 50m', weapon: 'kk', shots: 60, dist: '50', is3x20: false,
    timeMins: 50, desc: '60 Schuss · 50 Min', icon: '🎯',
    info: '<b>KK 60 / 50m</b> – 60 Schuss KK auf 50 Meter. Zeitlimit: 50 Minuten.'
  },
  kk100: {
    name: 'KK 100m', weapon: 'kk', shots: 60, dist: '100', is3x20: false,
    timeMins: 70, desc: '60 Schuss · 70 Min', icon: '🎯',
    info: '<b>KK 60 / 100m</b> – 60 Schuss KK auf 100 Meter. Extreme Präzision. Zeitlimit: 70 Minuten.'
  },
  kk3x20: {
    name: 'KK 3×20', weapon: 'kk', shots: 60, dist: '50', is3x20: true,
    timeMins: 105, desc: '3 x 20 Schuss · 105 Min', icon: '🏆',
    positions: ['Kniend', 'Liegend', 'Stehend'], posIcons: ['🦵', '🛏️', '🧍'],
    info: '<b>KK 3×20</b> – Je 20 Schuss kniend, liegend und stehend mit KK auf 50 m. Zeitlimit: 105 Minuten inkl. Positionswechsel.'
  },
};

// Disziplinen pro Waffe
const WEAPON_DISCS = {
  lg: ['lg40', 'lg60'],
  kk: ['kk50', 'kk100', 'kk3x20'],
};

const LEADERBOARD_DISCIPLINE_ROOT = 'leaderboard_disciplines_v1';
const ACCOUNT_LINK_ROOT = 'account_links_v1';
const SEASON_ROOT = 'seasons_v1';
const ADMIN_ACCOUNTS_ROOT = 'admin_accounts_v1';

/* ─── CONFIG ─────────────────────────────── */
const DIST_INFO = {
  lg: {
    '10': '<b>10 Meter</b> – Luftgewehr-Standarddistanz. Höchste Präzision gefordert.'
  },
  kk: {
    '50': '<b>50 Meter</b> – KK-Standarddistanz. Klassische Königsdisziplin!',
    '100': '<b>100 Meter</b> – Extreme KK-Distanz. Maximale Konzentration und Technik gefordert!'
  }
};

const SIGMA = { '10': 18, '50': 46, '100': 72 };

const DIFF = {
  easy: {
    mult: 0.33, noise: 5, lbl: '😊 EINFACH', cls: 'easy',
    info: '<b>Einfach</b> – Solider Einstieg. ~360–375 Pkt. Schaffbar mit Konzentration!'
  },
  real: {
    mult: 0.30, noise: 3.0, lbl: '🎯 MITTEL', cls: 'real',
    info: '<b>Mittel</b> – Fast nur 9er und 10er. ~380–390 Pkt. Kein Spaziergang!'
  },
  hard: {
    mult: 0.28, noise: 0.5, lbl: '💪 ELITE', cls: 'hard',
    info: '<b>Elite</b> – Trifft sehr präzise. ~395–405 Pkt. Kaum zu schlagen!'
  },
  elite: {
    mult: 0.25, noise: 0.08, lbl: '💫 PROFI', cls: 'elite',
    info: '<b>Profi</b> – Immer ≥410 Zehntel. Extrem präzise. Viel Glück!'
  }
};

// Disziplinspezifische Schwierigkeits-Infos
const DIFF_INFO_BY_DISC = {
  // LG 60 hat höhere Punktwerte (60 Schuss, Zehntel)
  lg60: {
    easy: '<b>Einfach</b> – Solider Einstieg. ~575–585 Pkt. Schaffbar mit Konzentration!',
    real: '<b>Mittel</b> – Fast nur 9er und 10er. ~590–605 Pkt. Kein Spaziergang!',
    hard: '<b>Elite</b> – Trifft sehr präzise. ~610–618 Pkt. Kaum zu schlagen!',
    elite: '<b>Profi</b> – Schießt immer ≥620 Pkt. Extrem präzise. Viel Glück!'
  },
  // KK 50m / 100m: 60 Schuss Liegend mit Zehntel-Wertung
  kk50: {
    easy: '<b>Einfach</b> – Solider Einstieg. ~580–588 Zehntel. Schaffbar mit Konzentration!',
    real: '<b>Mittel</b> – Starke Präzision. ~590–600 Zehntel. Kein Spaziergang!',
    hard: '<b>Elite</b> – Trifft sehr präzise. ~602–610 Zehntel. Kaum zu schlagen!',
    elite: '<b>Profi</b> – Schießt ≥612 Zehntel. Extrem präzise. Viel Glück!'
  },
  kk100: {
    easy: '<b>Einfach</b> – Solider Einstieg. ~580–588 Zehntel. Schaffbar mit Konzentration!',
    real: '<b>Mittel</b> – Starke Präzision. ~590–600 Zehntel. Kein Spaziergang!',
    hard: '<b>Elite</b> – Trifft sehr präzise. ~602–610 Zehntel. Kaum zu schlagen!',
    elite: '<b>Profi</b> – Schießt ≥612 Zehntel. Extrem präzise. Viel Glück!'
  },
  // KK 3×20: Gesamt 60 Schuss, nur ganze Zahlen
  kk3x20: {
    easy: '<b>Einfach</b> – Solider Einstieg. Gesamt ~530–542 Ringe. Schaffbar mit Konzentration!',
    real: '<b>Mittel</b> – Fast nur 9er und 10er. Gesamt ~544–555 Ringe. Kein Spaziergang!',
    hard: '<b>Elite</b> – Trifft sehr präzise. Gesamt ~557–565 Ringe. Kaum zu schlagen!',
    elite: '<b>Profi</b> – Gesamt ≥567 Ringe. Extrem präzise. Viel Glück!'
  }
};

const WEAPON_CFG = {
  lg: {
    icon: '🌬️', name: 'Luftgewehr', badgeCls: 'lg', defaultDist: '10',
    allowedDists: ['10'],
    setupTag: (disc, dist) => `◆ LUFTGEWEHR · ${(DISC[disc]?.name || disc).toUpperCase()} · ${dist} METER ◆`
  },
  kk: {
    icon: '🎯', name: 'Kleinkaliber', badgeCls: 'kk', defaultDist: '50',
    allowedDists: ['50', '100'],
    setupTag: (disc, dist) => `◆ KLEINKALIBER · ${(DISC[disc]?.name || disc).toUpperCase()} · ${dist} METER ◆`
  }
};
