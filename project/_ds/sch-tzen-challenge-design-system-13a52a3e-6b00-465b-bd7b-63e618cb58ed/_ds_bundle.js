/* @ds-bundle: {"format":3,"namespace":"SchTzenChallengeDesignSystem_13a52a","components":[],"sourceHashes":{"ui_kits/app/app.jsx":"c931f4c75781","ui_kits/app/flows.jsx":"e8b06c361edb","ui_kits/app/icons.jsx":"23d1d86af922","ui_kits/app/screens.jsx":"d837bf0da7e0"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.SchTzenChallengeDesignSystem_13a52a = window.SchTzenChallengeDesignSystem_13a52a || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// ui_kits/app/app.jsx
try { (() => {
/* App shell — header, bottom nav, routing between tabs + flows. */
(function () {
  const {
    Icon,
    StartTab,
    TrainingTab,
    ChallengesTab,
    FreundeTab,
    ProfilTab,
    Welcome,
    DuelSetup,
    DuelResult
  } = window;
  const HEADERS = {
    start: {
      kind: 'greeting',
      sub: 'Bereit für dein nächstes Training?'
    },
    training: {
      title: 'Training',
      sub: 'Verbessere dich. Jeden Schuss.'
    },
    challenges: {
      title: 'Challenges',
      sub: 'Fordere Freunde heraus!'
    },
    freunde: {
      title: 'Freunde',
      sub: 'Trainiere zusammen. Fordere dich heraus.'
    },
    profil: {
      title: 'Profil',
      sub: 'Deine Statistiken. Dein Fortschritt.'
    }
  };
  function Header({
    tab,
    name
  }) {
    const h = HEADERS[tab];
    return /*#__PURE__*/React.createElement("header", {
      className: "app-header"
    }, /*#__PURE__*/React.createElement("div", {
      className: "ah-title-block"
    }, h.kind === 'greeting' ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      className: "ah-greeting-title"
    }, "Hallo, ", name, "! \uD83D\uDC4B"), /*#__PURE__*/React.createElement("div", {
      className: "ah-greeting-sub"
    }, h.sub)) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      className: "ah-page-title"
    }, h.title), /*#__PURE__*/React.createElement("div", {
      className: "ah-page-sub"
    }, h.sub))), /*#__PURE__*/React.createElement("div", {
      className: "ah-actions"
    }, (tab === 'training' || tab === 'challenges') && /*#__PURE__*/React.createElement("button", {
      className: "ah-icon-btn"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "filter",
      size: 18
    })), tab === 'freunde' && /*#__PURE__*/React.createElement("button", {
      className: "ah-icon-btn"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "search",
      size: 18
    })), tab === 'profil' && /*#__PURE__*/React.createElement("button", {
      className: "ah-icon-btn"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "settings",
      size: 18
    })), /*#__PURE__*/React.createElement("button", {
      className: "ah-icon-btn"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "bell",
      size: 18
    }))));
  }
  const NAV = [{
    id: 'start',
    icon: 'home',
    label: 'Start'
  }, {
    id: 'training',
    icon: 'activity',
    label: 'Training'
  }, {
    id: 'challenges',
    icon: 'swords',
    label: 'Challenges'
  }, {
    id: 'freunde',
    icon: 'users',
    label: 'Freunde'
  }, {
    id: 'profil',
    icon: 'user',
    label: 'Profil'
  }];
  function BottomNav({
    tab,
    onTab
  }) {
    return /*#__PURE__*/React.createElement("nav", {
      className: "bottom-nav"
    }, NAV.map(n => /*#__PURE__*/React.createElement("button", {
      key: n.id,
      className: 'bn-tab' + (tab === n.id ? ' active' : ''),
      onClick: () => onTab(n.id)
    }, /*#__PURE__*/React.createElement("div", {
      className: "bn-wrap"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: n.icon,
      size: 22,
      sw: 1.8
    })), /*#__PURE__*/React.createElement("span", {
      className: "bn-label"
    }, n.label))));
  }
  function App() {
    const [name, setName] = React.useState(() => localStorage.getItem('sc_name') || '');
    const [tab, setTab] = React.useState('start');
    const [duel, setDuel] = React.useState(false);
    const [result, setResult] = React.useState(null);
    const scrollRef = React.useRef(null);
    const onTab = t => {
      setTab(t);
      if (scrollRef.current) scrollRef.current.scrollTop = 0;
    };
    const start = n => {
      setName(n);
      localStorage.setItem('sc_name', n);
    };
    if (!name) return /*#__PURE__*/React.createElement("div", {
      className: "phone"
    }, /*#__PURE__*/React.createElement("div", {
      className: "notch"
    }), /*#__PURE__*/React.createElement(Welcome, {
      onStart: start
    }));
    return /*#__PURE__*/React.createElement("div", {
      className: "phone"
    }, /*#__PURE__*/React.createElement("div", {
      className: "notch"
    }), /*#__PURE__*/React.createElement(Header, {
      tab: tab,
      name: name
    }), /*#__PURE__*/React.createElement("div", {
      className: "scroll",
      ref: scrollRef
    }, tab === 'start' && /*#__PURE__*/React.createElement(StartTab, {
      name: name,
      onDuel: () => setDuel(true),
      goToTab: onTab
    }), tab === 'training' && /*#__PURE__*/React.createElement(TrainingTab, {
      onDuel: () => setDuel(true)
    }), tab === 'challenges' && /*#__PURE__*/React.createElement(ChallengesTab, {
      onDuel: () => setDuel(true)
    }), tab === 'freunde' && /*#__PURE__*/React.createElement(FreundeTab, null), tab === 'profil' && /*#__PURE__*/React.createElement(ProfilTab, {
      name: name
    })), (tab === 'start' || tab === 'training') && /*#__PURE__*/React.createElement("button", {
      className: "fab",
      onClick: () => setDuel(true)
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "swords",
      size: 18
    }), "Duell starten"), /*#__PURE__*/React.createElement(BottomNav, {
      tab: tab,
      onTab: onTab
    }), duel && /*#__PURE__*/React.createElement(DuelSetup, {
      onClose: () => setDuel(false),
      onStart: cfg => {
        setDuel(false);
        setResult(cfg);
      }
    }), result && /*#__PURE__*/React.createElement(DuelResult, {
      cfg: result,
      onClose: () => setResult(null)
    }));
  }
  ReactDOM.createRoot(document.getElementById('root')).render(/*#__PURE__*/React.createElement(App, null));
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/app.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/flows.jsx
try { (() => {
/* Onboarding + duel-setup + result flows for the UI kit. */
(function () {
  const {
    Icon
  } = window;

  /* ════════ WELCOME / ONBOARDING ════════ */
  function Welcome({
    onStart
  }) {
    const [val, setVal] = React.useState('');
    return /*#__PURE__*/React.createElement("div", {
      className: "welcome"
    }, /*#__PURE__*/React.createElement("div", {
      className: "welcome-card"
    }, /*#__PURE__*/React.createElement("div", {
      className: "welcome-icon"
    }, "\uD83C\uDFAF"), /*#__PURE__*/React.createElement("div", {
      className: "welcome-title"
    }, "WILLKOMMEN"), /*#__PURE__*/React.createElement("div", {
      className: "welcome-sub"
    }, "W\xE4hle deinen Sch\xFCtzennamen.", /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: '0.78em',
        opacity: 0.6
      }
    }, "Wird dauerhaft gespeichert \xB7 Einmalige Anmeldung")), /*#__PURE__*/React.createElement("input", {
      className: "welcome-inp",
      placeholder: "Dein Name\u2026",
      maxLength: 15,
      value: val,
      onChange: e => setVal(e.target.value),
      onKeyDown: e => {
        if (e.key === 'Enter' && val.trim()) onStart(val.trim());
      }
    }), /*#__PURE__*/React.createElement("button", {
      className: "btn-primary",
      onClick: () => onStart(val.trim() || 'Schütze')
    }, "\uD83D\uDE80 JETZT STARTEN"), /*#__PURE__*/React.createElement("div", {
      className: "welcome-foot"
    }, "Dein Name erscheint in der Weltrangliste")));
  }

  /* ════════ DUEL SETUP SHEET ════════ */
  const SHOTS = {
    lg: [{
      n: '40',
      u: 'Schuss'
    }, {
      n: '60',
      u: 'Schuss'
    }],
    kk: [{
      n: '50m',
      u: 'Distanz'
    }, {
      n: '100m',
      u: 'Distanz'
    }, {
      n: '3×20',
      u: 'Programm'
    }]
  };
  const DIFFS = [{
    k: 'easy',
    ico: '🟢',
    name: 'Einfach'
  }, {
    k: 'real',
    ico: '🔵',
    name: 'Realistisch'
  }, {
    k: 'hard',
    ico: '🔴',
    name: 'Schwer'
  }, {
    k: 'elite',
    ico: '⭐',
    name: 'Elite'
  }];
  function DuelSetup({
    onClose,
    onStart
  }) {
    const [weapon, setWeapon] = React.useState('lg');
    const [shots, setShots] = React.useState('40');
    const [diff, setDiff] = React.useState('real');
    const shotOpts = SHOTS[weapon];
    const pickWeapon = w => {
      setWeapon(w);
      setShots(SHOTS[w][0].n);
    };
    return /*#__PURE__*/React.createElement("div", {
      className: "overlay",
      onClick: onClose
    }, /*#__PURE__*/React.createElement("div", {
      className: "sheet",
      onClick: e => e.stopPropagation()
    }, /*#__PURE__*/React.createElement("div", {
      className: "sheet-handle"
    }), /*#__PURE__*/React.createElement("div", {
      className: "sheet-title"
    }, "Duell vorbereiten"), /*#__PURE__*/React.createElement("div", {
      className: "sheet-sub"
    }, "Gegen den adaptiven Bot antreten."), /*#__PURE__*/React.createElement("div", {
      className: "field-label"
    }, "Disziplin"), /*#__PURE__*/React.createElement("div", {
      className: "opt-row"
    }, /*#__PURE__*/React.createElement("div", {
      className: 'opt' + (weapon === 'lg' ? ' active' : ''),
      onClick: () => pickWeapon('lg')
    }, /*#__PURE__*/React.createElement("span", {
      className: "opt-ico"
    }, "\uD83C\uDF2C\uFE0F"), /*#__PURE__*/React.createElement("span", {
      className: "opt-name"
    }, "Luftgewehr")), /*#__PURE__*/React.createElement("div", {
      className: 'opt' + (weapon === 'kk' ? ' active' : ''),
      onClick: () => pickWeapon('kk')
    }, /*#__PURE__*/React.createElement("span", {
      className: "opt-ico"
    }, "\uD83C\uDFAF"), /*#__PURE__*/React.createElement("span", {
      className: "opt-name"
    }, "Kleinkaliber"))), /*#__PURE__*/React.createElement("div", {
      className: "field-label"
    }, "Programm"), /*#__PURE__*/React.createElement("div", {
      className: "opt-row"
    }, shotOpts.map(s => /*#__PURE__*/React.createElement("div", {
      key: s.n,
      className: 'opt' + (shots === s.n ? ' active' : ''),
      onClick: () => setShots(s.n)
    }, /*#__PURE__*/React.createElement("span", {
      className: "opt-n"
    }, s.n), /*#__PURE__*/React.createElement("span", {
      className: "opt-u"
    }, s.u)))), /*#__PURE__*/React.createElement("div", {
      className: "field-label"
    }, "Schwierigkeit"), /*#__PURE__*/React.createElement("div", {
      className: "opt-row",
      style: {
        flexWrap: 'wrap'
      }
    }, DIFFS.map(d => /*#__PURE__*/React.createElement("div", {
      key: d.k,
      style: {
        flex: '1 1 40%'
      },
      className: 'opt diff ' + d.k + (diff === d.k ? ' active' : ''),
      onClick: () => setDiff(d.k)
    }, /*#__PURE__*/React.createElement("span", {
      className: "opt-ico"
    }, d.ico), /*#__PURE__*/React.createElement("span", {
      className: "opt-name"
    }, d.name)))), /*#__PURE__*/React.createElement("div", {
      className: "info-row"
    }, /*#__PURE__*/React.createElement("span", {
      className: "info-ico"
    }, "\uD83D\uDCF7"), /*#__PURE__*/React.createElement("span", {
      className: "info-txt"
    }, "Ergebnisse ", /*#__PURE__*/React.createElement("b", null, "manuell eingeben"), " oder per Foto-Beta erfassen. Bitte immer pr\xFCfen \u2014 keine elektronische Trefferanlage.")), /*#__PURE__*/React.createElement("button", {
      className: "btn-primary",
      onClick: () => onStart({
        weapon,
        shots,
        diff
      })
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "swords",
      size: 18
    }), "DUELL STARTEN"), /*#__PURE__*/React.createElement("button", {
      className: "btn-ghost",
      onClick: onClose
    }, "Abbrechen")));
  }

  /* ════════ RESULT SCREEN ════════ */
  function DuelResult({
    cfg,
    onClose
  }) {
    // deterministic-ish demo scores
    const shotsCount = cfg.shots.includes('×') ? cfg.shots.split('×').reduce((a, b) => a * parseInt(b, 10), 1) : parseInt(cfg.shots, 10) || 60;
    const max = shotsCount * 10.9;
    const player = (max * 0.92).toFixed(1).replace('.', ',');
    const bot = (max * 0.88).toFixed(1).replace('.', ',');
    const win = parseFloat(player.replace(',', '.')) >= parseFloat(bot.replace(',', '.'));
    const discName = cfg.weapon === 'lg' ? 'Luftgewehr' : 'Kleinkaliber';
    return /*#__PURE__*/React.createElement("div", {
      className: "result"
    }, /*#__PURE__*/React.createElement("div", {
      className: "result-badge"
    }, win ? '🏆' : '💔'), /*#__PURE__*/React.createElement("div", {
      className: "result-title"
    }, win ? 'SIEG!' : 'KNAPP'), /*#__PURE__*/React.createElement("div", {
      className: "result-meta"
    }, discName, " \xB7 ", cfg.shots), /*#__PURE__*/React.createElement("div", {
      className: "result-score"
    }, /*#__PURE__*/React.createElement("div", {
      className: "rs-col"
    }, /*#__PURE__*/React.createElement("div", {
      className: "rs-name"
    }, "Du"), /*#__PURE__*/React.createElement("div", {
      className: 'rs-val ' + (win ? 'win' : '')
    }, player)), /*#__PURE__*/React.createElement("div", {
      className: "rs-vs"
    }, "vs"), /*#__PURE__*/React.createElement("div", {
      className: "rs-col"
    }, /*#__PURE__*/React.createElement("div", {
      className: "rs-name"
    }, "Bot"), /*#__PURE__*/React.createElement("div", {
      className: 'rs-val ' + (win ? '' : 'lose')
    }, bot))), /*#__PURE__*/React.createElement("div", {
      className: "result-xp"
    }, win ? '+120 XP · 🎯 Tagesziel erreicht!' : '+40 XP · Weiter so!'), /*#__PURE__*/React.createElement("button", {
      className: "btn-primary",
      style: {
        maxWidth: 260,
        marginTop: 20
      },
      onClick: onClose
    }, "WEITER"));
  }
  Object.assign(window, {
    Welcome,
    DuelSetup,
    DuelResult
  });
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/flows.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/icons.jsx
try { (() => {
/* Icon set — Feather/Lucide-style line icons used across the app.
   Each is a 24×24 stroke icon. <Icon name="..." /> */
(function () {
  const P = {
    target: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
      cx: "12",
      cy: "12",
      r: "10"
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "12",
      cy: "12",
      r: "6"
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "12",
      cy: "12",
      r: "2"
    })),
    home: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
    }), /*#__PURE__*/React.createElement("polyline", {
      points: "9 22 9 12 15 12 15 22"
    })),
    activity: /*#__PURE__*/React.createElement("polyline", {
      points: "22 12 18 12 15 21 9 3 6 12 2 12"
    }),
    swords: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M14.5 17.5L3 6V3h3l11.5 11.5"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M13 19l6-6"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M16 16l3.5 3.5"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M19 21l-3-3"
    })),
    users: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "9",
      cy: "7",
      r: "4"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M23 21v-2a4 4 0 0 0-3-3.87"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M16 3.13a4 4 0 0 1 0 7.75"
    })),
    user: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
      cx: "12",
      cy: "8",
      r: "4"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M4 21v-1a6 6 0 0 1 12 0v1"
    })),
    userPlus: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "8.5",
      cy: "7",
      r: "4"
    }), /*#__PURE__*/React.createElement("line", {
      x1: "20",
      y1: "8",
      x2: "20",
      y2: "14"
    }), /*#__PURE__*/React.createElement("line", {
      x1: "23",
      y1: "11",
      x2: "17",
      y2: "11"
    })),
    bell: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M13.73 21a2 2 0 0 1-3.46 0"
    })),
    trophy: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M6 9H4.5a2.5 2.5 0 0 1 0-5H6"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M18 9h1.5a2.5 2.5 0 0 0 0-5H18"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M4 22h16"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M18 2H6v7a6 6 0 0 0 12 0V2z"
    })),
    zap: /*#__PURE__*/React.createElement("path", {
      d: "M13 2L3 14h9l-1 8 10-12h-9l1-8z"
    }),
    barChart: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("line", {
      x1: "18",
      y1: "20",
      x2: "18",
      y2: "10"
    }), /*#__PURE__*/React.createElement("line", {
      x1: "12",
      y1: "20",
      x2: "12",
      y2: "4"
    }), /*#__PURE__*/React.createElement("line", {
      x1: "6",
      y1: "20",
      x2: "6",
      y2: "14"
    })),
    trendUp: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("polyline", {
      points: "23 6 13.5 15.5 8.5 10.5 1 18"
    }), /*#__PURE__*/React.createElement("polyline", {
      points: "17 6 23 6 23 12"
    })),
    check: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M22 11.08V12a10 10 0 1 1-5.93-9.14"
    }), /*#__PURE__*/React.createElement("polyline", {
      points: "22 4 12 14.01 9 11.01"
    })),
    clock: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
      cx: "12",
      cy: "12",
      r: "10"
    }), /*#__PURE__*/React.createElement("polyline", {
      points: "12 6 12 12 16 14"
    })),
    calendar: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("rect", {
      x: "3",
      y: "4",
      width: "18",
      height: "18",
      rx: "2"
    }), /*#__PURE__*/React.createElement("line", {
      x1: "16",
      y1: "2",
      x2: "16",
      y2: "6"
    }), /*#__PURE__*/React.createElement("line", {
      x1: "8",
      y1: "2",
      x2: "8",
      y2: "6"
    }), /*#__PURE__*/React.createElement("line", {
      x1: "3",
      y1: "10",
      x2: "21",
      y2: "10"
    })),
    settings: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
      cx: "12",
      cy: "12",
      r: "3"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
    })),
    search: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
      cx: "11",
      cy: "11",
      r: "8"
    }), /*#__PURE__*/React.createElement("line", {
      x1: "21",
      y1: "21",
      x2: "16.65",
      y2: "16.65"
    })),
    filter: /*#__PURE__*/React.createElement("polygon", {
      points: "22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"
    }),
    plus: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("line", {
      x1: "12",
      y1: "5",
      x2: "12",
      y2: "19"
    }), /*#__PURE__*/React.createElement("line", {
      x1: "5",
      y1: "12",
      x2: "19",
      y2: "12"
    })),
    chevR: /*#__PURE__*/React.createElement("polyline", {
      points: "9 18 15 12 9 6"
    }),
    chevL: /*#__PURE__*/React.createElement("polyline", {
      points: "15 18 9 12 15 6"
    }),
    edit: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
    })),
    chat: /*#__PURE__*/React.createElement("path", {
      d: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
    }),
    copy: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("rect", {
      x: "9",
      y: "9",
      width: "13",
      height: "13",
      rx: "2"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
    })),
    share: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"
    }), /*#__PURE__*/React.createElement("polyline", {
      points: "16 6 12 2 8 6"
    }), /*#__PURE__*/React.createElement("line", {
      x1: "12",
      y1: "2",
      x2: "12",
      y2: "15"
    })),
    x: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("line", {
      x1: "18",
      y1: "6",
      x2: "6",
      y2: "18"
    }), /*#__PURE__*/React.createElement("line", {
      x1: "6",
      y1: "6",
      x2: "18",
      y2: "18"
    })),
    camera: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "12",
      cy: "13",
      r: "4"
    })),
    shield: /*#__PURE__*/React.createElement("path", {
      d: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
    })
  };
  function Icon({
    name,
    size = 22,
    sw = 2,
    style,
    className
  }) {
    return /*#__PURE__*/React.createElement("svg", {
      viewBox: "0 0 24 24",
      width: size,
      height: size,
      className: className,
      style: {
        stroke: 'currentColor',
        fill: 'none',
        strokeWidth: sw,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        ...style
      }
    }, P[name] || null);
  }
  window.Icon = Icon;
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/icons.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/screens.jsx
try { (() => {
/* Tab panels for the Schützen Challenge UI kit. */
(function () {
  const {
    Icon
  } = window;

  /* ── Sample data ── */
  const FRIENDS = [{
    name: 'Lena M.',
    av: 'L',
    status: 'online',
    best: '98,2',
    avg: '95,1'
  }, {
    name: 'Tobias K.',
    av: 'T',
    status: 'online',
    best: '96,7',
    avg: '93,4'
  }, {
    name: 'SV Adler',
    av: '🏹',
    status: 'away',
    best: '99,1',
    avg: '96,8'
  }, {
    name: 'Marie B.',
    av: 'M',
    status: 'offline',
    best: '94,3',
    avg: '91,0'
  }];
  const HISTORY = [{
    disc: 'Luftgewehr · 10m',
    date: '28. Mai · 19:40',
    score: '96,4',
    cls: '',
    shots: 10
  }, {
    disc: 'Kleinkaliber · 50m',
    date: '26. Mai · 17:10',
    score: '92,1',
    cls: 'yellow',
    shots: 20
  }, {
    disc: 'Luftgewehr · 10m',
    date: '24. Mai · 20:05',
    score: '88,7',
    cls: 'orange',
    shots: 10
  }, {
    disc: 'Luftgewehr · 10m',
    date: '22. Mai · 18:30',
    score: '95,9',
    cls: '',
    shots: 10
  }];
  const Empty = ({
    icon,
    text,
    sub
  }) => /*#__PURE__*/React.createElement("div", {
    className: "empty"
  }, /*#__PURE__*/React.createElement("div", {
    className: "empty-icon"
  }, icon), /*#__PURE__*/React.createElement("div", null, text), sub && /*#__PURE__*/React.createElement("div", {
    className: "empty-sub"
  }, sub));

  /* ════════ START ════════ */
  function StartTab({
    name,
    onDuel,
    goToTab
  }) {
    return /*#__PURE__*/React.createElement("div", {
      className: "page"
    }, /*#__PURE__*/React.createElement("div", {
      className: "goal-card"
    }, /*#__PURE__*/React.createElement("div", {
      className: "gc-top"
    }, /*#__PURE__*/React.createElement("div", {
      className: "gc-icon"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "target"
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "gc-label"
    }, "Dein heutiges Ziel"), /*#__PURE__*/React.createElement("div", {
      className: "gc-goal"
    }, "Treffe 95+ Ringe")), /*#__PURE__*/React.createElement("div", {
      className: "gc-ring"
    }, /*#__PURE__*/React.createElement("svg", {
      viewBox: "0 0 64 64",
      width: "56",
      height: "56"
    }, /*#__PURE__*/React.createElement("circle", {
      className: "gc-ring-bg",
      cx: "32",
      cy: "32",
      r: "26"
    }), /*#__PURE__*/React.createElement("circle", {
      className: "gc-ring-fill",
      cx: "32",
      cy: "32",
      r: "26",
      style: {
        strokeDashoffset: 163 - 163 * 0.78
      }
    })), /*#__PURE__*/React.createElement("div", {
      className: "gc-ring-pct"
    }, "78%"))), /*#__PURE__*/React.createElement("div", {
      className: "gc-bar-wrap"
    }, /*#__PURE__*/React.createElement("div", {
      className: "gc-bar-label"
    }, "Fortschritt: 96,4 / 95 Ringe"), /*#__PURE__*/React.createElement("div", {
      className: "gc-bar"
    }, /*#__PURE__*/React.createElement("div", {
      className: "gc-bar-fill",
      style: {
        width: '100%'
      }
    })))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: "section-hdr",
      style: {
        marginBottom: 12
      }
    }, /*#__PURE__*/React.createElement("span", {
      className: "section-title"
    }, "\xDCbersicht"), /*#__PURE__*/React.createElement("button", {
      className: "section-link",
      onClick: () => goToTab('training')
    }, "Alle anzeigen")), /*#__PURE__*/React.createElement("div", {
      className: "stat-tiles"
    }, /*#__PURE__*/React.createElement(Tile, {
      icon: "trendUp",
      cls: "green",
      value: "96,4",
      label: /*#__PURE__*/React.createElement(React.Fragment, null, "\xD8 Ringe", /*#__PURE__*/React.createElement("br", null), "Diese Woche"),
      delta: "\u25B2 1,2"
    }), /*#__PURE__*/React.createElement(Tile, {
      icon: "trophy",
      cls: "blue",
      value: "12",
      label: /*#__PURE__*/React.createElement(React.Fragment, null, "Challenges", /*#__PURE__*/React.createElement("br", null), "Gewonnen")
    }), /*#__PURE__*/React.createElement(Tile, {
      icon: "target",
      cls: "purple",
      value: "87",
      label: /*#__PURE__*/React.createElement(React.Fragment, null, "Trainings", /*#__PURE__*/React.createElement("br", null), "Gesamt")
    }))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: "section-title",
      style: {
        marginBottom: 12
      }
    }, "Letztes Training"), /*#__PURE__*/React.createElement("div", {
      className: "lt-card"
    }, /*#__PURE__*/React.createElement("div", {
      className: "lt-top"
    }, /*#__PURE__*/React.createElement("div", {
      className: "lt-thumb"
    }, "\uD83C\uDFAF"), /*#__PURE__*/React.createElement("div", {
      className: "lt-info"
    }, /*#__PURE__*/React.createElement("div", {
      className: "lt-disc"
    }, "Luftgewehr \xB7 10m"), /*#__PURE__*/React.createElement("div", {
      className: "lt-date"
    }, "28. Mai \xB7 19:40")), /*#__PURE__*/React.createElement("div", {
      className: "lt-badge"
    }, /*#__PURE__*/React.createElement("div", {
      className: "lt-bval"
    }, "96,4"), /*#__PURE__*/React.createElement("div", {
      className: "lt-blbl"
    }, "Ringe"))), /*#__PURE__*/React.createElement("div", {
      className: "lt-stats"
    }, /*#__PURE__*/React.createElement("div", {
      className: "lt-stat"
    }, /*#__PURE__*/React.createElement("div", {
      className: "lt-sv"
    }, "10"), /*#__PURE__*/React.createElement("div", {
      className: "lt-sl"
    }, "Sch\xFCsse")), /*#__PURE__*/React.createElement("div", {
      className: "lt-stat"
    }, /*#__PURE__*/React.createElement("div", {
      className: "lt-sv"
    }, "96,4"), /*#__PURE__*/React.createElement("div", {
      className: "lt-sl"
    }, "\xD8 Ringe")), /*#__PURE__*/React.createElement("div", {
      className: "lt-stat"
    }, /*#__PURE__*/React.createElement("div", {
      className: "lt-sv"
    }, "10,4"), /*#__PURE__*/React.createElement("div", {
      className: "lt-sl"
    }, "Beste Serie"))))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: "section-hdr",
      style: {
        marginBottom: 12
      }
    }, /*#__PURE__*/React.createElement("span", {
      className: "section-title"
    }, "Aktive Challenges"), /*#__PURE__*/React.createElement("button", {
      className: "section-link",
      onClick: () => goToTab('challenges')
    }, "Alle anzeigen")), /*#__PURE__*/React.createElement("div", {
      className: "challenge-preview",
      onClick: () => goToTab('challenges')
    }, /*#__PURE__*/React.createElement("div", {
      className: "cp-icon"
    }, "\uD83C\uDFAF"), /*#__PURE__*/React.createElement("div", {
      className: "cp-info"
    }, /*#__PURE__*/React.createElement("div", {
      className: "cp-title"
    }, "Tagesaufgaben"), /*#__PURE__*/React.createElement("div", {
      className: "cp-meta"
    }, "2 von 3 Missionen erledigt"), /*#__PURE__*/React.createElement("div", {
      className: "cp-bar"
    }, /*#__PURE__*/React.createElement("div", {
      className: "cp-bar-fill",
      style: {
        width: '66%'
      }
    }))), /*#__PURE__*/React.createElement(Icon, {
      name: "chevR",
      size: 18,
      style: {
        stroke: 'rgba(255,255,255,0.25)',
        flexShrink: 0
      }
    }))));
  }

  /* ════════ TRAINING ════════ */
  function TrainingTab({
    onDuel
  }) {
    const [inner, setInner] = React.useState('verlauf');
    return /*#__PURE__*/React.createElement("div", {
      className: "page"
    }, /*#__PURE__*/React.createElement("div", {
      className: "inner-tabs"
    }, /*#__PURE__*/React.createElement(InnerTab, {
      active: inner === 'verlauf',
      onClick: () => setInner('verlauf'),
      icon: "activity",
      label: "Verlauf"
    }), /*#__PURE__*/React.createElement(InnerTab, {
      active: inner === 'statistiken',
      onClick: () => setInner('statistiken'),
      icon: "barChart",
      label: "Statistiken"
    })), inner === 'verlauf' && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      className: "card"
    }, /*#__PURE__*/React.createElement("div", {
      className: "overview-hdr"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "trendUp"
    }), "\xDCbersicht"), /*#__PURE__*/React.createElement("div", {
      className: "stat-tiles-4"
    }, /*#__PURE__*/React.createElement(Tile, {
      icon: "target",
      cls: "green",
      value: "93,7",
      label: "\xD8 Ringe"
    }), /*#__PURE__*/React.createElement(Tile, {
      icon: "trendUp",
      cls: "blue",
      value: "96,4",
      label: "Bestes"
    }), /*#__PURE__*/React.createElement(Tile, {
      icon: "zap",
      cls: "purple",
      value: "6",
      label: "Diese Wo."
    }), /*#__PURE__*/React.createElement(Tile, {
      icon: "calendar",
      cls: "gold",
      value: "87",
      label: "Gesamt"
    }))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: "section-title",
      style: {
        marginBottom: 12
      }
    }, "Training Verlauf"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 10
      }
    }, HISTORY.map((h, i) => /*#__PURE__*/React.createElement("div", {
      className: "ts-card",
      key: i
    }, /*#__PURE__*/React.createElement("div", {
      className: "ts-target"
    }, "\uD83C\uDFAF"), /*#__PURE__*/React.createElement("div", {
      className: "ts-info"
    }, /*#__PURE__*/React.createElement("div", {
      className: "ts-head"
    }, /*#__PURE__*/React.createElement("span", {
      className: "ts-disc"
    }, h.disc), /*#__PURE__*/React.createElement("span", {
      className: 'ts-score ' + h.cls
    }, h.score)), /*#__PURE__*/React.createElement("div", {
      className: "ts-date"
    }, h.date, " \xB7 ", h.shots, " Sch\xFCsse")), /*#__PURE__*/React.createElement(Icon, {
      name: "chevR",
      size: 16,
      className: "ts-chev"
    }))))), /*#__PURE__*/React.createElement("button", {
      className: "cta-card",
      onClick: onDuel
    }, /*#__PURE__*/React.createElement("div", {
      className: "cta-icon"
    }, "\uD83D\uDCF7"), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "cta-title"
    }, "Neues Training erfassen"), /*#__PURE__*/React.createElement("div", {
      className: "cta-sub"
    }, "Ergebnisse hochladen oder manuell eingeben")))), inner === 'statistiken' && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      className: "card"
    }, /*#__PURE__*/React.createElement("div", {
      className: "overview-hdr"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "barChart"
    }), "Performance"), /*#__PURE__*/React.createElement("div", {
      className: "stat-tiles"
    }, /*#__PURE__*/React.createElement(Tile, {
      icon: "trendUp",
      cls: "green",
      value: "84%",
      label: "Konstanz"
    }), /*#__PURE__*/React.createElement(Tile, {
      icon: "clock",
      cls: "blue",
      value: "24m",
      label: "\xD8 Dauer"
    }), /*#__PURE__*/React.createElement(Tile, {
      icon: "zap",
      cls: "purple",
      value: "10,6",
      label: "Top Treffer"
    }))), /*#__PURE__*/React.createElement("div", {
      className: "card"
    }, /*#__PURE__*/React.createElement("div", {
      className: "overview-hdr",
      style: {
        justifyContent: 'space-between'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'flex',
        gap: 8,
        alignItems: 'center'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "activity"
    }), "Leistungskurve")), /*#__PURE__*/React.createElement(Sparkline, null)), /*#__PURE__*/React.createElement("div", {
      className: "card"
    }, /*#__PURE__*/React.createElement("div", {
      className: "overview-hdr"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "target"
    }), "Disziplinen"), /*#__PURE__*/React.createElement(DiscRow, {
      ico: "\uD83C\uDF2C\uFE0F",
      tone: "green",
      name: "Luftgewehr \xB7 10m",
      meta: "62 Trainings \xB7 \xD8 94,1",
      val: "94,1"
    }), /*#__PURE__*/React.createElement(DiscRow, {
      ico: "\uD83C\uDFAF",
      tone: "blue",
      name: "Kleinkaliber \xB7 50m",
      meta: "25 Trainings \xB7 \xD8 92,3",
      val: "92,3"
    }))));
  }
  function DiscRow({
    ico,
    tone,
    name,
    meta,
    val
  }) {
    const c = tone === 'green' ? 'var(--accent)' : '#00c3ff';
    const bg = tone === 'green' ? 'rgba(34,197,94,0.15)' : 'rgba(0,195,255,0.15)';
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 0',
        borderTop: '1px solid rgba(255,255,255,0.06)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 36,
        height: 36,
        borderRadius: 10,
        background: bg,
        color: c,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '1.1rem'
      }
    }, ico), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: '0.82rem',
        fontWeight: 700,
        color: '#fff'
      }
    }, name), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: '0.66rem',
        color: 'rgba(255,255,255,0.4)',
        marginTop: 2
      }
    }, meta)), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--font-display)',
        fontSize: '1.4rem',
        color: c
      }
    }, val));
  }
  function Sparkline() {
    const pts = [62, 70, 58, 78, 74, 86, 80, 92, 88, 96];
    const W = 300,
      H = 120,
      max = 100,
      min = 50;
    const path = pts.map((p, i) => {
      const x = i / (pts.length - 1) * W;
      const y = H - (p - min) / (max - min) * H;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
    return /*#__PURE__*/React.createElement("div", {
      style: {
        height: 130
      }
    }, /*#__PURE__*/React.createElement("svg", {
      viewBox: `0 0 ${W} ${H}`,
      width: "100%",
      height: "130",
      preserveAspectRatio: "none"
    }, /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("linearGradient", {
      id: "spark",
      x1: "0",
      y1: "0",
      x2: "0",
      y2: "1"
    }, /*#__PURE__*/React.createElement("stop", {
      offset: "0%",
      stopColor: "rgba(34,197,94,0.35)"
    }), /*#__PURE__*/React.createElement("stop", {
      offset: "100%",
      stopColor: "rgba(34,197,94,0)"
    }))), /*#__PURE__*/React.createElement("path", {
      d: `${path} L${W},${H} L0,${H} Z`,
      fill: "url(#spark)"
    }), /*#__PURE__*/React.createElement("path", {
      d: path,
      fill: "none",
      stroke: "#22c55e",
      strokeWidth: "2.5",
      strokeLinecap: "round",
      strokeLinejoin: "round"
    })));
  }

  /* ════════ CHALLENGES ════════ */
  function ChallengesTab({
    onDuel
  }) {
    const [inner, setInner] = React.useState('aktiv');
    return /*#__PURE__*/React.createElement("div", {
      className: "page"
    }, /*#__PURE__*/React.createElement("div", {
      className: "inner-tabs"
    }, /*#__PURE__*/React.createElement(InnerTab, {
      active: inner === 'aktiv',
      onClick: () => setInner('aktiv'),
      icon: "swords",
      label: "Aktiv"
    }), /*#__PURE__*/React.createElement(InnerTab, {
      active: inner === 'einladungen',
      onClick: () => setInner('einladungen'),
      icon: "users",
      label: "Einladungen"
    }), /*#__PURE__*/React.createElement(InnerTab, {
      active: inner === 'abgeschlossen',
      onClick: () => setInner('abgeschlossen'),
      icon: "check",
      label: "Erledigt"
    })), inner === 'aktiv' && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      className: "section-title"
    }, "Deine aktiven Challenges"), /*#__PURE__*/React.createElement(DailyMission, {
      ico: "\uD83C\uDFAF",
      title: "10 Schuss \xFCber 9,5",
      meta: "Heute \xB7 Luftgewehr",
      pct: 100,
      done: true
    }), /*#__PURE__*/React.createElement(DailyMission, {
      ico: "\uD83D\uDD25",
      title: "3 Trainings diese Woche",
      meta: "2 von 3 erledigt",
      pct: 66
    }), /*#__PURE__*/React.createElement(DailyMission, {
      ico: "\u2694\uFE0F",
      title: "Gewinne ein Bot-Duell",
      meta: "Schwierigkeit: Realistisch",
      pct: 0
    }), /*#__PURE__*/React.createElement("button", {
      className: "cta-card",
      onClick: onDuel,
      style: {
        marginTop: 2
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "cta-icon"
    }, "\u2694\uFE0F"), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "cta-title"
    }, "Neues Duell starten"), /*#__PURE__*/React.createElement("div", {
      className: "cta-sub"
    }, "Gegen Bot oder Freunde antreten")))), inner === 'einladungen' && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      className: "card",
      style: {
        display: 'flex',
        justifyContent: 'space-around',
        textAlign: 'center'
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--font-display)',
        fontSize: '1.7rem',
        color: '#fff'
      }
    }, "1"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: '0.6rem',
        color: 'rgba(255,255,255,0.4)',
        textTransform: 'uppercase',
        letterSpacing: '.1em'
      }
    }, "Eingehend")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--font-display)',
        fontSize: '1.7rem',
        color: '#fff'
      }
    }, "2"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: '0.6rem',
        color: 'rgba(255,255,255,0.4)',
        textTransform: 'uppercase',
        letterSpacing: '.1em'
      }
    }, "Gesendet")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--font-display)',
        fontSize: '1.7rem',
        color: 'var(--accent)'
      }
    }, "3"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: '0.6rem',
        color: 'rgba(255,255,255,0.4)',
        textTransform: 'uppercase',
        letterSpacing: '.1em'
      }
    }, "Ausstehend"))), /*#__PURE__*/React.createElement("div", {
      className: "section-title",
      style: {
        fontSize: '0.92rem'
      }
    }, "Eingehende Einladungen"), /*#__PURE__*/React.createElement(InviteRow, {
      name: "Tobias K.",
      meta: "Luftgewehr \xB7 vor 2 Std.",
      incoming: true
    }), /*#__PURE__*/React.createElement("div", {
      className: "section-title",
      style: {
        fontSize: '0.92rem'
      }
    }, "Gesendete Einladungen"), /*#__PURE__*/React.createElement(InviteRow, {
      name: "Lena M.",
      meta: "Kleinkaliber \xB7 vor 1 Tag"
    })), inner === 'abgeschlossen' && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      className: "card"
    }, /*#__PURE__*/React.createElement("div", {
      className: "overview-hdr"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "check"
    }), "Bilanz"), /*#__PURE__*/React.createElement("div", {
      className: "stat-tiles"
    }, /*#__PURE__*/React.createElement(Tile, {
      icon: "check",
      cls: "green",
      value: "34",
      label: "Siege"
    }), /*#__PURE__*/React.createElement(Tile, {
      icon: "x",
      cls: "orange",
      value: "11",
      label: "Niederlagen"
    }), /*#__PURE__*/React.createElement(Tile, {
      icon: "trophy",
      cls: "gold",
      value: "76%",
      label: "Siegquote"
    }))), /*#__PURE__*/React.createElement("div", {
      className: "section-title"
    }, "Abgeschlossene Challenges"), /*#__PURE__*/React.createElement(ResultRow, {
      ico: "\uD83C\uDFC6",
      win: true,
      disc: "Luftgewehr \xB7 Realistisch",
      date: "27. Mai",
      a: "96",
      b: "92"
    }), /*#__PURE__*/React.createElement(ResultRow, {
      ico: "\uD83D\uDC94",
      disc: "Kleinkaliber \xB7 Schwer",
      date: "25. Mai",
      a: "89",
      b: "94"
    }), /*#__PURE__*/React.createElement(ResultRow, {
      ico: "\uD83C\uDFC6",
      win: true,
      disc: "Luftgewehr \xB7 Einfach",
      date: "23. Mai",
      a: "98",
      b: "90"
    })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: "section-hdr",
      style: {
        marginBottom: 12
      }
    }, /*#__PURE__*/React.createElement("span", {
      className: "section-title"
    }, "Beliebte Challenges")), /*#__PURE__*/React.createElement("div", {
      className: "pop-scroll"
    }, /*#__PURE__*/React.createElement(Pop, {
      ico: "\u2694\uFE0F",
      title: "Freundschaftsduell",
      m1: "Luftgewehr \xB7 10m",
      m2: "1 vs 1"
    }), /*#__PURE__*/React.createElement(Pop, {
      ico: "\uD83D\uDC65",
      title: "Vereins-Challenge",
      m1: "Alle Disziplinen",
      m2: "5\u201350 Teilnehmer"
    }), /*#__PURE__*/React.createElement(Pop, {
      ico: "\uD83C\uDFC6",
      title: "Monats-Challenge",
      m1: "Wechselnd",
      m2: "Global"
    }))));
  }
  function DailyMission({
    ico,
    title,
    meta,
    pct,
    done
  }) {
    return /*#__PURE__*/React.createElement("div", {
      className: "challenge-preview"
    }, /*#__PURE__*/React.createElement("div", {
      className: "cp-icon",
      style: done ? {
        background: 'rgba(34,197,94,0.18)'
      } : {}
    }, ico), /*#__PURE__*/React.createElement("div", {
      className: "cp-info"
    }, /*#__PURE__*/React.createElement("div", {
      className: "cp-title"
    }, title), /*#__PURE__*/React.createElement("div", {
      className: "cp-meta"
    }, meta), /*#__PURE__*/React.createElement("div", {
      className: "cp-bar"
    }, /*#__PURE__*/React.createElement("div", {
      className: "cp-bar-fill",
      style: {
        width: pct + '%'
      }
    }))), done ? /*#__PURE__*/React.createElement(Icon, {
      name: "check",
      size: 20,
      style: {
        stroke: 'var(--accent)',
        flexShrink: 0
      }
    }) : /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: '0.72rem',
        fontWeight: 800,
        color: 'rgba(255,255,255,0.5)',
        flexShrink: 0
      }
    }, pct, "%"));
  }
  function InviteRow({
    name,
    meta,
    incoming
  }) {
    return /*#__PURE__*/React.createElement("div", {
      className: "friend-row"
    }, /*#__PURE__*/React.createElement("div", {
      className: "fr-avatar"
    }, "\u2694\uFE0F"), /*#__PURE__*/React.createElement("div", {
      className: "fr-info"
    }, /*#__PURE__*/React.createElement("div", {
      className: "fr-name"
    }, name), /*#__PURE__*/React.createElement("div", {
      className: "fr-status-text",
      style: {
        color: 'rgba(255,255,255,0.4)'
      }
    }, meta)), incoming ? /*#__PURE__*/React.createElement("button", {
      className: "outline-btn",
      style: {
        background: 'var(--accent)',
        color: '#000',
        border: 'none'
      }
    }, "Annehmen") : /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: '0.68rem',
        color: 'rgba(255,255,255,0.3)'
      }
    }, "Wartet\u2026"));
  }
  function ResultRow({
    ico,
    win,
    disc,
    date,
    a,
    b
  }) {
    return /*#__PURE__*/React.createElement("div", {
      className: "friend-row",
      style: {
        gap: 12
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "fr-avatar",
      style: {
        background: 'rgba(255,255,255,0.05)',
        fontSize: '1.3rem'
      }
    }, ico), /*#__PURE__*/React.createElement("div", {
      className: "fr-info"
    }, /*#__PURE__*/React.createElement("div", {
      className: "fr-name",
      style: {
        fontSize: '0.84rem'
      }
    }, disc), /*#__PURE__*/React.createElement("div", {
      className: "fr-status-text",
      style: {
        color: 'rgba(255,255,255,0.4)'
      }
    }, date)), /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: 'right'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: '1rem',
        fontWeight: 800,
        color: win ? 'var(--accent)' : '#f08070'
      }
    }, a, " \u2013 ", b), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: '0.6rem',
        color: 'rgba(255,255,255,0.3)'
      }
    }, "Ringe")));
  }
  function Pop({
    ico,
    title,
    m1,
    m2
  }) {
    return /*#__PURE__*/React.createElement("div", {
      className: "pop"
    }, /*#__PURE__*/React.createElement("div", {
      className: "pop-icon"
    }, ico), /*#__PURE__*/React.createElement("div", {
      className: "pop-title"
    }, title), /*#__PURE__*/React.createElement("div", {
      className: "pop-meta"
    }, m1), /*#__PURE__*/React.createElement("div", {
      className: "pop-meta"
    }, m2));
  }

  /* ════════ FREUNDE ════════ */
  function FreundeTab() {
    return /*#__PURE__*/React.createElement("div", {
      className: "page"
    }, /*#__PURE__*/React.createElement("div", {
      className: "friends-header"
    }, /*#__PURE__*/React.createElement("div", {
      className: "fhc-top"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: "fhc-title"
    }, "Deine Freunde ", /*#__PURE__*/React.createElement("span", {
      className: "count-badge"
    }, "4")), /*#__PURE__*/React.createElement("div", {
      className: "fhc-sub"
    }, "Gemeinsam besser werden!")), /*#__PURE__*/React.createElement("button", {
      className: "outline-btn"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "share",
      size: 14
    }), "Einladen")), /*#__PURE__*/React.createElement("div", {
      className: "stat-tiles-4"
    }, /*#__PURE__*/React.createElement(Tile, {
      icon: "target",
      cls: "green",
      value: "94,5",
      label: /*#__PURE__*/React.createElement(React.Fragment, null, "\xD8 Ringe", /*#__PURE__*/React.createElement("br", null), "Freunde")
    }), /*#__PURE__*/React.createElement(Tile, {
      icon: "trendUp",
      cls: "blue",
      value: "9",
      label: /*#__PURE__*/React.createElement(React.Fragment, null, "Trainings", /*#__PURE__*/React.createElement("br", null), "Woche")
    }), /*#__PURE__*/React.createElement(Tile, {
      icon: "swords",
      cls: "purple",
      value: "23",
      label: /*#__PURE__*/React.createElement(React.Fragment, null, "Duelle", /*#__PURE__*/React.createElement("br", null), "gespielt")
    }), /*#__PURE__*/React.createElement(Tile, {
      icon: "zap",
      cls: "orange",
      value: "14",
      label: /*#__PURE__*/React.createElement(React.Fragment, null, "Tage", /*#__PURE__*/React.createElement("br", null), "Folge")
    }))), /*#__PURE__*/React.createElement("div", {
      className: "section-hdr"
    }, /*#__PURE__*/React.createElement("span", {
      className: "section-title",
      style: {
        fontSize: '0.92rem'
      }
    }, "Freundesliste"), /*#__PURE__*/React.createElement("button", {
      className: "section-link"
    }, "Online \u2193")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 10
      }
    }, FRIENDS.map((f, i) => /*#__PURE__*/React.createElement("div", {
      className: "friend-row",
      key: i
    }, /*#__PURE__*/React.createElement("div", {
      className: "fr-avatar-wrap"
    }, /*#__PURE__*/React.createElement("div", {
      className: "fr-avatar"
    }, f.av), /*#__PURE__*/React.createElement("span", {
      className: 'fr-status-dot ' + f.status
    })), /*#__PURE__*/React.createElement("div", {
      className: "fr-info"
    }, /*#__PURE__*/React.createElement("div", {
      className: "fr-name"
    }, f.name), /*#__PURE__*/React.createElement("div", {
      className: 'fr-status-text ' + f.status
    }, f.status === 'online' ? 'Online' : f.status === 'away' ? 'Abwesend' : 'Offline')), /*#__PURE__*/React.createElement("div", {
      className: "fr-best"
    }, /*#__PURE__*/React.createElement("div", {
      className: "fr-best-val"
    }, f.best), /*#__PURE__*/React.createElement("div", {
      className: "fr-best-lbl"
    }, "Bestes")), /*#__PURE__*/React.createElement("button", {
      className: "fr-chat-btn"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "chat",
      size: 16,
      style: {
        stroke: 'rgba(255,255,255,0.4)',
        strokeWidth: 1.8
      }
    }))))));
  }

  /* ════════ PROFIL ════════ */
  function ProfilTab({
    name
  }) {
    return /*#__PURE__*/React.createElement("div", {
      className: "page"
    }, /*#__PURE__*/React.createElement("div", {
      className: "profile-hero"
    }, /*#__PURE__*/React.createElement("div", {
      className: "ph-avatar"
    }, "\uD83C\uDFAF"), /*#__PURE__*/React.createElement("div", {
      className: "ph-info"
    }, /*#__PURE__*/React.createElement("div", {
      className: "ph-name-row"
    }, /*#__PURE__*/React.createElement("span", {
      className: "ph-name"
    }, name), /*#__PURE__*/React.createElement("span", {
      className: "plan-badge"
    }, "Free")), /*#__PURE__*/React.createElement("div", {
      className: "ph-club"
    }, "\uD83D\uDCCD SV Gr\xFCnwald \xB7 Sch\xFCtze"), /*#__PURE__*/React.createElement("div", {
      className: "ph-level-row"
    }, /*#__PURE__*/React.createElement("span", {
      className: "ph-level-label"
    }, "Level 6"), /*#__PURE__*/React.createElement("span", {
      className: "ph-xp-text"
    }, "1.250 / 1.500 XP")), /*#__PURE__*/React.createElement("div", {
      className: "ph-xp-bar"
    }, /*#__PURE__*/React.createElement("div", {
      className: "ph-xp-fill",
      style: {
        width: '72%'
      }
    })))), /*#__PURE__*/React.createElement("div", {
      className: "stat-tiles-4"
    }, /*#__PURE__*/React.createElement(Tile, {
      icon: "target",
      cls: "green",
      value: "93,7",
      label: "\xD8 Ringe"
    }), /*#__PURE__*/React.createElement(Tile, {
      icon: "calendar",
      cls: "blue",
      value: "87",
      label: "Trainings"
    }), /*#__PURE__*/React.createElement(Tile, {
      icon: "trophy",
      cls: "purple",
      value: "34",
      label: "Siege"
    }), /*#__PURE__*/React.createElement(Tile, {
      icon: "zap",
      cls: "orange",
      value: "14",
      label: "Streak"
    })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: "section-title",
      style: {
        marginBottom: 12
      }
    }, "Deine Auszeichnungen"), /*#__PURE__*/React.createElement("div", {
      className: "achievements-scroll"
    }, /*#__PURE__*/React.createElement(Ach, {
      hex: "",
      ico: "\uD83C\uDFAF",
      name: "Treffsicher"
    }), /*#__PURE__*/React.createElement(Ach, {
      hex: "blue",
      ico: "\uD83D\uDCC5",
      name: "Konstant"
    }), /*#__PURE__*/React.createElement(Ach, {
      hex: "purple",
      ico: "\u2694\uFE0F",
      name: "Duellant"
    }), /*#__PURE__*/React.createElement(Ach, {
      hex: "gold",
      ico: "\uD83C\uDFC5",
      name: "Perfekt"
    }), /*#__PURE__*/React.createElement(Ach, {
      hex: "locked",
      ico: "\uD83D\uDD12",
      name: "Meister"
    }))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: "section-title",
      style: {
        marginBottom: 12
      }
    }, "Pers\xF6nliche Bestleistungen"), /*#__PURE__*/React.createElement("div", {
      className: "pb-grid"
    }, /*#__PURE__*/React.createElement("div", {
      className: "pb-card"
    }, /*#__PURE__*/React.createElement("div", {
      className: "pb-label"
    }, "Beste Serie"), /*#__PURE__*/React.createElement("div", {
      className: "pb-val"
    }, "10,6")), /*#__PURE__*/React.createElement("div", {
      className: "pb-card"
    }, /*#__PURE__*/React.createElement("div", {
      className: "pb-label"
    }, "Bestes \xD8"), /*#__PURE__*/React.createElement("div", {
      className: "pb-val"
    }, "98,2")), /*#__PURE__*/React.createElement("div", {
      className: "pb-card"
    }, /*#__PURE__*/React.createElement("div", {
      className: "pb-label"
    }, "Meiste Ringe"), /*#__PURE__*/React.createElement("div", {
      className: "pb-val"
    }, "196")), /*#__PURE__*/React.createElement("div", {
      className: "pb-card"
    }, /*#__PURE__*/React.createElement("div", {
      className: "pb-label"
    }, "L\xE4ngster Streak"), /*#__PURE__*/React.createElement("div", {
      className: "pb-val"
    }, "21")))));
  }
  function Ach({
    hex,
    ico,
    name
  }) {
    return /*#__PURE__*/React.createElement("div", {
      className: "ach"
    }, /*#__PURE__*/React.createElement("div", {
      className: 'ach-hex ' + hex
    }, ico), /*#__PURE__*/React.createElement("div", {
      className: "ach-name"
    }, name));
  }

  /* ── Shared atoms ── */
  function Tile({
    icon,
    cls,
    value,
    label,
    delta
  }) {
    return /*#__PURE__*/React.createElement("div", {
      className: "stat-tile"
    }, /*#__PURE__*/React.createElement("div", {
      className: 'st-icon ' + cls
    }, /*#__PURE__*/React.createElement(Icon, {
      name: icon
    })), /*#__PURE__*/React.createElement("div", {
      className: "st-value"
    }, value), /*#__PURE__*/React.createElement("div", {
      className: "st-label"
    }, label), delta && /*#__PURE__*/React.createElement("div", {
      className: "st-delta positive"
    }, delta));
  }
  function InnerTab({
    active,
    onClick,
    icon,
    label
  }) {
    return /*#__PURE__*/React.createElement("button", {
      className: 'it-tab' + (active ? ' active' : ''),
      onClick: onClick
    }, /*#__PURE__*/React.createElement(Icon, {
      name: icon,
      size: 14
    }), label);
  }
  Object.assign(window, {
    StartTab,
    TrainingTab,
    ChallengesTab,
    FreundeTab,
    ProfilTab
  });
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/screens.jsx", error: String((e && e.message) || e) }); }

})();
