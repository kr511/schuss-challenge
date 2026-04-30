/**
 * Schützen-Challenges – seriöse Trainingsaufgaben.
 *
 * Quelle der Wahrheit für Trainings- und Übungsdaten der „Schützen Challenge“.
 * Bewusst sportlich/technisch formuliert. Keine taktischen, militärischen oder
 * gewaltbezogenen Inhalte – nur Sportschießen (Luftgewehr / Kleinkaliber).
 *
 * Kategorien:
 *   sicherheit | grundlagen | atmung | stand | abzug | zielbild |
 *   trockenuebung | konzentration | wettkampf | auswertung
 *
 * Schwierigkeit: anfaenger | fortgeschritten | profi
 *
 * Live-Fire vs. Dry-Fire ist explizit getrennt:
 *   - isDryFire=true       → ohne Munition, daheim oder am Stand erlaubt.
 *   - isLiveFire=true      → NUR auf zugelassenem Schießstand mit Aufsicht
 *                            nach Standordnung des Vereins/Betreibers.
 *
 * Jede Challenge MUSS eine `safetyNote` enthalten.
 */
(function () {
  'use strict';

  /** @type {ReadonlyArray<{
   *   id: string,
   *   title: string,
   *   description: string,
   *   category: string,
   *   difficulty: 'anfaenger'|'fortgeschritten'|'profi',
   *   durationMinutes: number,
   *   safetyNote: string,
   *   requiredEquipment: string[],
   *   instructions: string[],
   *   scoringType: 'checklist'|'shots'|'time'|'self',
   *   successCriteria: string,
   *   isDryFire: boolean,
   *   isLiveFire: boolean
   * }>}
   */
  const SHOOTER_CHALLENGES = Object.freeze([
    {
      id: 'safety-precheck',
      title: 'Sicherheitscheck vor dem Training',
      description: 'Vor jedem Training: Standordnung lesen, Waffe sichern, Munition prüfen.',
      category: 'sicherheit',
      difficulty: 'anfaenger',
      durationMinutes: 5,
      safetyNote: 'Waffe immer als geladen behandeln. Lauf nur in sichere Richtung.',
      requiredEquipment: ['Waffe (entladen)', 'Standordnung', 'Augenschutz'],
      instructions: [
        'Standordnung des Schießstandes durchlesen.',
        'Sichtprüfung der Waffe: Verschluss offen, Patronenlager leer.',
        'Munition auf Kaliber und Beschädigung prüfen.',
        'Gehörschutz und ggf. Schießbrille bereitlegen.'
      ],
      scoringType: 'checklist',
      successCriteria: 'Alle 4 Punkte abgehakt.',
      isDryFire: true,
      isLiveFire: false
    },
    {
      id: 'stand-check-luftgewehr',
      title: 'Standposition Luftgewehr prüfen',
      description: 'Stabile, entspannte Schießstellung im Stand mit dem Luftgewehr.',
      category: 'stand',
      difficulty: 'anfaenger',
      durationMinutes: 10,
      safetyNote: 'Trockenübung. Waffe entladen, Sicherung nicht gegen Personen richten.',
      requiredEquipment: ['Luftgewehr (entladen)', 'Spiegel oder Trainingspartner'],
      instructions: [
        'Füße schulterbreit, Gewicht gleichmäßig verteilt.',
        'Hüfte leicht zur Schussrichtung gedreht.',
        'Linker Ellenbogen auf Beckenkamm aufsetzen (Rechtsschütze).',
        'Kopf entspannt anlegen, Visierlinie ohne Verspannung.'
      ],
      scoringType: 'self',
      successCriteria: 'Stellung 60 Sekunden ohne Korrektur halten.',
      isDryFire: true,
      isLiveFire: false
    },
    {
      id: 'breathing-rhythm',
      title: 'Atemrhythmus beobachten',
      description: 'Atempause finden – ruhig und reproduzierbar.',
      category: 'atmung',
      difficulty: 'anfaenger',
      durationMinutes: 8,
      safetyNote: 'Reine Trockenübung. Waffe nicht erforderlich.',
      requiredEquipment: ['Stuhl oder ruhige Schießposition'],
      instructions: [
        'Ruhig sitzen oder in Schießstellung gehen.',
        '4 Sekunden einatmen, 4 Sekunden ausatmen.',
        'Nach dem Ausatmen 3–5 Sekunden Atempause.',
        '10 Zyklen ohne Verspannung absolvieren.'
      ],
      scoringType: 'time',
      successCriteria: 'Stabile Atempause über 10 Zyklen.',
      isDryFire: true,
      isLiveFire: false
    },
    {
      id: 'sight-picture-hold',
      title: 'Ruhiges Zielbild halten',
      description: 'Visier und Zielobjekt ruhig zueinander führen, Wackler beobachten.',
      category: 'zielbild',
      difficulty: 'fortgeschritten',
      durationMinutes: 10,
      safetyNote: 'Trockenübung – Waffe entladen, Lauf nur in den Kugelfang oder ein sicheres Ziel.',
      requiredEquipment: ['Luftgewehr/KK (entladen)', 'Trainingsziel an der Wand'],
      instructions: [
        'Zielbild aufnehmen, ohne den Abzug zu betätigen.',
        '8 Sekunden ruhiges Halten anstreben.',
        'Nach 8 Sekunden absetzen und neu aufbauen.',
        '6 Wiederholungen, mit kurzer Pause dazwischen.'
      ],
      scoringType: 'self',
      successCriteria: 'In 4 von 6 Wiederholungen sauberes Zielbild.',
      isDryFire: true,
      isLiveFire: false
    },
    {
      id: 'dry-trigger-clean',
      title: 'Sauberer Trockenabzug',
      description: 'Den Abzug ohne Verreißen kontrolliert auslösen.',
      category: 'abzug',
      difficulty: 'fortgeschritten',
      durationMinutes: 12,
      safetyNote: 'Reine Trockenübung. Waffe entladen, Magazin/Patronenlager kontrollieren. Trockenabzug nur, wenn vom Hersteller freigegeben.',
      requiredEquipment: ['Waffe (entladen, Trockenabzug freigegeben)'],
      instructions: [
        'Zielbild aufnehmen, Atempause.',
        'Druckpunkt fühlen, gleichmäßig durchziehen.',
        'Nach dem Klick Visier kurz halten („Follow-Through“).',
        '15 Trockenabzüge dokumentieren.'
      ],
      scoringType: 'shots',
      successCriteria: '12 von 15 Auslösungen ohne sichtbares Verreißen.',
      isDryFire: true,
      isLiveFire: false
    },
    {
      id: 'shot-routine',
      title: 'Schussroutine festlegen',
      description: 'Eigene Schussroutine schriftlich fixieren und einüben.',
      category: 'grundlagen',
      difficulty: 'fortgeschritten',
      durationMinutes: 15,
      safetyNote: 'Routine deckt Sicherheitschecks ab: Stand frei, Lauf in Schussrichtung, Finger erst am Abzug nach Aufnahme des Zielbilds.',
      requiredEquipment: ['Notizbuch', 'Stift'],
      instructions: [
        'Routine in 5–7 klaren Schritten notieren.',
        'Routine 5× im Trockenen durchspielen.',
        'Schwachstellen markieren.',
        'Routine ins Trainingstagebuch übernehmen.'
      ],
      scoringType: 'checklist',
      successCriteria: 'Schriftliche Routine vorhanden + 5 Trockendurchgänge.',
      isDryFire: true,
      isLiveFire: false
    },
    {
      id: 'focus-block-10min',
      title: 'Konzentrationsblock 10 Minuten',
      description: 'Strukturierte Aufmerksamkeit ohne Ablenkung.',
      category: 'konzentration',
      difficulty: 'anfaenger',
      durationMinutes: 10,
      safetyNote: 'Reine Konzentrationsübung. Keine Waffenhandhabung erforderlich.',
      requiredEquipment: ['Timer', 'Ruhiger Raum'],
      instructions: [
        'Telefon stummschalten, Timer auf 10 Minuten.',
        'Augen schließen, Atem zählen (1–10, dann neu).',
        'Bei Ablenkung freundlich zum Atem zurück.',
        'Notiere danach kurz, was schwer war.'
      ],
      scoringType: 'time',
      successCriteria: '10 Minuten ohne Abbruch.',
      isDryFire: true,
      isLiveFire: false
    },
    {
      id: 'live-five-shot-group-lg',
      title: '5er-Gruppe Luftgewehr live',
      description: 'Auf zugelassenem Stand: 5 ruhige Schüsse, Gruppe bewerten.',
      category: 'wettkampf',
      difficulty: 'fortgeschritten',
      durationMinutes: 15,
      safetyNote: 'Nur auf zugelassenem Schießstand, Standordnung beachten, Aufsicht je nach Stand. Gehörschutz/Augenschutz bei Bedarf.',
      requiredEquipment: ['Luftgewehr', 'Diabolos', 'Scheibe', 'Gehörschutz wenn vorgeschrieben'],
      instructions: [
        'Sicherheits-Briefing der Standaufsicht abwarten.',
        'Probeschüsse zur Visierkontrolle.',
        '5 Wertungsschüsse mit voller Routine schießen.',
        'Trefferbild fotografieren oder eintragen.'
      ],
      scoringType: 'shots',
      successCriteria: 'Ringdurchschnitt für die 5 Schüsse erfasst und gespeichert.',
      isDryFire: false,
      isLiveFire: true
    },
    {
      id: 'live-ten-shot-kk-prone',
      title: '10 Schüsse KK liegend',
      description: 'Klassische Liegend-Übung mit Kleinkaliber, Fokus auf gleicher Anschlag.',
      category: 'wettkampf',
      difficulty: 'profi',
      durationMinutes: 25,
      safetyNote: 'Nur Schießstand mit KK-Zulassung. Standordnung, Aufsicht und Schießleiteranweisungen befolgen. Gehörschutz Pflicht.',
      requiredEquipment: ['KK-Gewehr', 'Munition (zugelassen)', 'Schießmatte', 'Riemen', 'Gehörschutz'],
      instructions: [
        'Liegend-Position einnehmen, Riemen einstellen.',
        '2–3 Probeschüsse zur Lagekontrolle.',
        '10 Wertungsschüsse, gleichmäßiger Rhythmus.',
        'Trefferbild auswerten und eintragen.'
      ],
      scoringType: 'shots',
      successCriteria: 'Alle 10 Schüsse abgegeben, Ringergebnis dokumentiert.',
      isDryFire: false,
      isLiveFire: true
    },
    {
      id: 'follow-through-drill',
      title: 'Follow-Through trainieren',
      description: 'Visier nach dem Schuss bewusst nachhalten.',
      category: 'abzug',
      difficulty: 'fortgeschritten',
      durationMinutes: 10,
      safetyNote: 'Trockenübung. Waffe entladen, Lauf in sichere Richtung.',
      requiredEquipment: ['Luftgewehr (entladen)'],
      instructions: [
        'Trockenabzug auslösen.',
        'Visier 2 Sekunden weiter halten.',
        'Position bewerten: Wo war das Korn beim Klick?',
        '10 Wiederholungen.'
      ],
      scoringType: 'shots',
      successCriteria: 'In 8 von 10 Wiederholungen Korn ruhig nach dem Klick.',
      isDryFire: true,
      isLiveFire: false
    },
    {
      id: 'pre-comp-routine',
      title: 'Wettkampfroutine durchspielen',
      description: 'Den Ablauf vor dem ersten Wertungsschuss üben.',
      category: 'wettkampf',
      difficulty: 'fortgeschritten',
      durationMinutes: 20,
      safetyNote: 'Trocken oder live laut Standordnung. Keine Hektik, keine improvisierten Abläufe.',
      requiredEquipment: ['Trainingsplatz oder Stand', 'Equipment-Liste'],
      instructions: [
        'Equipment kontrollieren.',
        'Einlauf, Anschlag, Probeschüsse simulieren.',
        'Mentaler Anker (1 Wort) festlegen.',
        'Routine schriftlich abhaken.'
      ],
      scoringType: 'checklist',
      successCriteria: 'Komplette Routine ohne Auslassung absolviert.',
      isDryFire: true,
      isLiveFire: false
    },
    {
      id: 'shot-log-eval',
      title: 'Trefferbild auswerten',
      description: 'Letzte 10 Schüsse strukturiert analysieren.',
      category: 'auswertung',
      difficulty: 'anfaenger',
      durationMinutes: 10,
      safetyNote: 'Auswertung am Tisch. Waffe gesichert/entladen abgelegt.',
      requiredEquipment: ['Schießbuch', 'Schussbild oder Foto'],
      instructions: [
        'Streukreis auf der Scheibe markieren.',
        'Mittelpunkt bestimmen (links/rechts/hoch/tief).',
        'Mögliche Ursache notieren (Atmung/Abzug/Stand).',
        'Eine Maßnahme für nächste Einheit definieren.'
      ],
      scoringType: 'self',
      successCriteria: 'Eintrag im Trainingstagebuch mit Maßnahme.',
      isDryFire: true,
      isLiveFire: false
    },
    {
      id: 'mental-anchor',
      title: 'Mentaler Anker',
      description: 'Ein Wort, das deine Schussroutine startet.',
      category: 'konzentration',
      difficulty: 'fortgeschritten',
      durationMinutes: 8,
      safetyNote: 'Mentale Übung – kein Gerät erforderlich.',
      requiredEquipment: ['Notizbuch'],
      instructions: [
        'Wähle ein neutrales Wort (z. B. „ruhig“).',
        'Verknüpfe Wort mit Atempause + Druckpunkt.',
        '10× im Trockenen üben.',
        'Wort im nächsten Training bewusst einsetzen.'
      ],
      scoringType: 'self',
      successCriteria: 'Anker definiert + 10 Trockendurchgänge.',
      isDryFire: true,
      isLiveFire: false
    },
    {
      id: 'kneel-position',
      title: 'Kniend stabilisieren',
      description: 'Kniende Anschlagsposition aufbauen und prüfen.',
      category: 'stand',
      difficulty: 'fortgeschritten',
      durationMinutes: 12,
      safetyNote: 'Trockenübung. Waffe entladen, Kniegelenk schonen, ggf. Knierolle benutzen.',
      requiredEquipment: ['Luftgewehr/KK (entladen)', 'Knierolle'],
      instructions: [
        'Sitzbein auf Ferse, Knierolle korrekt platzieren.',
        'Linker Ellenbogen vor das Knie.',
        'Visierlinie ohne Verkrampfung.',
        '3× 60 Sekunden halten.'
      ],
      scoringType: 'time',
      successCriteria: '3 Halteperioden ohne Korrektur.',
      isDryFire: true,
      isLiveFire: false
    },
    {
      id: 'prone-position',
      title: 'Liegend stabilisieren',
      description: 'Liegend-Anschlag einrichten und Riemen prüfen.',
      category: 'stand',
      difficulty: 'fortgeschritten',
      durationMinutes: 12,
      safetyNote: 'Trockenübung oder am Stand laut Standordnung. Keine Munition während Anschlagsaufbau.',
      requiredEquipment: ['Schießmatte', 'Riemen', 'Waffe (entladen)'],
      instructions: [
        'Schräglage 10–20°, Beine entspannt.',
        'Riemen so einstellen, dass er ohne Muskelkraft hält.',
        'Korn in Visierlinie ohne Druck halten.',
        '5 Trockenabzüge im Anschlag.'
      ],
      scoringType: 'shots',
      successCriteria: '5 saubere Trockenauslösungen.',
      isDryFire: true,
      isLiveFire: false
    },
    {
      id: 'standing-balance',
      title: 'Stehend Balance',
      description: 'Schwankungen im Stehendanschlag reduzieren.',
      category: 'stand',
      difficulty: 'profi',
      durationMinutes: 10,
      safetyNote: 'Trockenübung. Waffe entladen.',
      requiredEquipment: ['Luftgewehr (entladen)'],
      instructions: [
        'Augen kurz schließen, neu zentrieren.',
        'Stand entlang Sehnen statt Muskeln.',
        '4× 30 Sekunden Halten + 30 Sekunden Pause.',
        'Schwankungsmuster notieren.'
      ],
      scoringType: 'time',
      successCriteria: '4 Halteperioden, schriftliche Notiz.',
      isDryFire: true,
      isLiveFire: false
    },
    {
      id: 'self-coaching-after-session',
      title: 'Selbst-Coaching nach der Einheit',
      description: '3 Fragen am Ende jedes Trainings beantworten.',
      category: 'auswertung',
      difficulty: 'anfaenger',
      durationMinutes: 5,
      safetyNote: 'Reine Auswertung. Waffe vorher gesichert/entladen.',
      requiredEquipment: ['Trainingstagebuch'],
      instructions: [
        'Was war heute mein bester Schuss – warum?',
        'Welcher Fehler trat mehrfach auf?',
        'Was übe ich gezielt im nächsten Training?'
      ],
      scoringType: 'checklist',
      successCriteria: 'Drei Antworten schriftlich erfasst.',
      isDryFire: true,
      isLiveFire: false
    },
    {
      id: 'dry-trigger-rhythm',
      title: 'Abzugsrhythmus 6 Sekunden',
      description: 'Konstantes Timing vom Aufnehmen bis zum Klick.',
      category: 'abzug',
      difficulty: 'fortgeschritten',
      durationMinutes: 10,
      safetyNote: 'Trockenübung. Waffe entladen, Trockenabzug nur wenn freigegeben.',
      requiredEquipment: ['Waffe (entladen)', 'Stoppuhr'],
      instructions: [
        'Vom Anlegen bis zur Auslösung 6 Sekunden anstreben.',
        '10 Wiederholungen mit Stoppuhr.',
        'Abweichung < 1 Sekunde.',
        'Werte notieren.'
      ],
      scoringType: 'time',
      successCriteria: '8 von 10 Versuchen im Korridor.',
      isDryFire: true,
      isLiveFire: false
    },
    {
      id: 'safe-storage-check',
      title: 'Aufbewahrung prüfen',
      description: 'Tresor, Verschlusssicherung, Munitionslagerung kontrollieren.',
      category: 'sicherheit',
      difficulty: 'anfaenger',
      durationMinutes: 10,
      safetyNote: 'Aufbewahrung gemäß Waffengesetz und Vereinsregeln. Munition getrennt verschließen.',
      requiredEquipment: ['Waffenschrank', 'Schlüssel oder Code'],
      instructions: [
        'Tresor-Sicherheitsstufe prüfen.',
        'Verriegelung der Waffen kontrollieren.',
        'Munition getrennt und verschlossen prüfen.',
        'Ergebnis im Logbuch eintragen.'
      ],
      scoringType: 'checklist',
      successCriteria: 'Alle 4 Punkte abgehakt.',
      isDryFire: true,
      isLiveFire: false
    },
    {
      id: 'cleaning-routine',
      title: 'Reinigungsroutine',
      description: 'Waffe nach dem Schießen sachgerecht reinigen.',
      category: 'grundlagen',
      difficulty: 'anfaenger',
      durationMinutes: 20,
      safetyNote: 'Vor der Reinigung Waffe entladen und Lauf prüfen. Lösungsmittel nur nach Anleitung.',
      requiredEquipment: ['Reinigungsset', 'Tuch', 'Öl laut Hersteller'],
      instructions: [
        'Sichtkontrolle: Patronenlager leer.',
        'Lauf reinigen wie vom Hersteller angegeben.',
        'Bewegliche Teile leicht ölen.',
        'Reinigung im Logbuch eintragen.'
      ],
      scoringType: 'checklist',
      successCriteria: 'Alle 4 Schritte erledigt.',
      isDryFire: true,
      isLiveFire: false
    },
    {
      id: 'tempo-control-live-lg',
      title: 'Live: Tempo-Kontrolle Luftgewehr',
      description: 'Bewusst gleichmäßiges Tempo zwischen 10 Schüssen.',
      category: 'wettkampf',
      difficulty: 'profi',
      durationMinutes: 20,
      safetyNote: 'Nur auf zugelassenem Stand. Standordnung beachten.',
      requiredEquipment: ['Luftgewehr', 'Diabolos', 'Stoppuhr'],
      instructions: [
        'Probeschüsse zur Visierkontrolle.',
        '10 Wertungsschüsse mit Ziel: 30–40 s pro Schuss.',
        'Pro Schuss Notiz: zu schnell / passt / zu langsam.',
        'Trefferbild und Tempo gemeinsam auswerten.'
      ],
      scoringType: 'shots',
      successCriteria: '10 Schüsse + Tempotagebuch.',
      isDryFire: false,
      isLiveFire: true
    },
    {
      id: 'progress-review-week',
      title: 'Wochenrückblick Training',
      description: 'Trainingstagebuch der Woche reflektieren.',
      category: 'auswertung',
      difficulty: 'anfaenger',
      durationMinutes: 15,
      safetyNote: 'Reine Reflexion. Keine Waffenhandhabung.',
      requiredEquipment: ['Trainingstagebuch'],
      instructions: [
        'Trainingseinträge der Woche durchgehen.',
        'Top 1 Stärke + Top 1 Baustelle markieren.',
        'Ein Mini-Ziel für nächste Woche definieren.',
        'Nächsten Trainingstermin festhalten.'
      ],
      scoringType: 'checklist',
      successCriteria: 'Mini-Ziel + Termin notiert.',
      isDryFire: true,
      isLiveFire: false
    }
  ]);

  const VALID_CATEGORIES = Object.freeze([
    'sicherheit', 'grundlagen', 'atmung', 'stand', 'abzug',
    'zielbild', 'trockenuebung', 'konzentration', 'wettkampf', 'auswertung'
  ]);

  function getAll() { return SHOOTER_CHALLENGES; }
  function getById(id) { return SHOOTER_CHALLENGES.find((c) => c.id === id) || null; }
  function getByCategory(cat) {
    if (!VALID_CATEGORIES.includes(cat)) return [];
    return SHOOTER_CHALLENGES.filter((c) => c.category === cat);
  }
  function getDryFireOnly() { return SHOOTER_CHALLENGES.filter((c) => c.isDryFire && !c.isLiveFire); }
  function getLiveFire() { return SHOOTER_CHALLENGES.filter((c) => c.isLiveFire); }

  const api = Object.freeze({
    SHOOTER_CHALLENGES,
    VALID_CATEGORIES,
    getAll,
    getById,
    getByCategory,
    getDryFireOnly,
    getLiveFire,
  });

  if (typeof window !== 'undefined') {
    window.ShooterChallenges = api;
  }
  if (typeof globalThis !== 'undefined' && !globalThis.ShooterChallenges) {
    globalThis.ShooterChallenges = api;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})();
