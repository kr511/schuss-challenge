# Schuss Challenge – Precision Shooting Trainer PWA

**Schuss Challenge** is a modern **Progressive Web App (PWA)** designed to help shooters train precision, consistency, and grouping — whether you're using air rifles, smallbore, pistol, or dry-fire practice.

Take real shots on paper targets → take a photo with your phone → get scoring support, feedback, and coaching-style training hints.

No extra hardware. No subscriptions. Just your browser and a target.

## ✨ Key Features

- **Photo scoring support** — Upload or capture photos of your shot targets and use assisted scoring workflows
- **Offline-first PWA** — Installable on phone/home screen and usable for many local training functions after first load
- **Local progress tracking** — Stats, XP, achievements, best groups and training history can be stored in the browser
- **Optional online account features** — Login, leaderboard and sync features use online services
- **Advanced Target Preprocessing** — Built-in Moiré-reduction, adaptive thresholding and correction helpers for target/display images
- **Adaptive Training Bot** — Difficulty and target size adjust automatically based on your performance
- **Multiple Training Modes** — Standard groups, timed challenges, training drills and duel modes
- **Haptic & Sound Feedback** — Vibration and audio cues on hit/miss, especially useful on mobile
- **Mobile-optimized** — Touch controls, camera integration and responsive design

## 🔒 Datenschutz & Online-Funktionen

Schuss Challenge ist **offline-first** und speichert viele Trainingsdaten lokal im Browser. Trotzdem sind nicht alle Funktionen komplett offline oder lokal.

Einige Funktionen benötigen Internet:

- **Login und Account-Funktionen** über Supabase
- **Ranglisten / Sync** über Firebase

Die Foto- und OCR-Funktionen sollen ohne externe KI-API auskommen. Gemini/Google-KI ist nicht Bestandteil der aktuellen App-Konfiguration.

## 🚀 Quick Start

1. Open the app:  
   https://kr511.github.io/schuss-challenge/

2. Or run locally:
   ```bash
   git clone https://github.com/kr511/schuss-challenge.git
   cd schuss-challenge
   npx serve .
   ```

## 🧑‍💻 Project Status

This is an active learning and development project. Feedback, bug reports and improvement ideas are welcome.
