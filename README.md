# Schuss Challenge – Precision Shooting Trainer PWA

**Schuss Challenge** is a modern **Progressive Web App (PWA)** designed to help shooters train precision, consistency, and grouping — whether you're using air rifles, smallbore, pistol, or dry-fire practice.

Take real shots on paper targets → take a photo with your phone → get instant AI-powered scoring, feedback, and coaching.

No extra hardware. No subscriptions. Just your browser and a target.

## ✨ Key Features

- **Real photo scoring** — Upload or capture photos of your shot targets → AI detects hits, calculates points, measures grouping (extreme spread, mean radius, etc.)
- **Gemini AI Coaching** — Get smart, personalized feedback on your groups, tendencies (high/low/left/right), and improvement tips
- **Adaptive Training Bot** — Difficulty and target size adjust automatically based on your performance
- **Multiple Training Modes** — Standard 10-shot groups, timed challenges, weak-hand only, stress drills, and more
- **Haptic & Sound Feedback** — Vibration and audio cues on hit/miss (great on mobile)
- **Offline-first PWA** — Installable on phone/home screen, works without internet after first load
- **Progress Tracking & Achievements** — Local stats, best groups, improvement graphs
- **Mobile-optimized** — Touch controls, camera integration, responsive design

## 🚀 Quick Start

1. Open the app:  
   https://schuss-challenge.pages.dev (or your own deployment)

2. Or run locally:
   ```bash
   git clone https://github.com/kr59/schuss-challenge.git
   cd schuss-challenge
   # Open index.html in your browser (or use a local server like:
   npx serve .
   ```

## Cloud Sync Backend (Cloudflare D1 + Worker API)

### 1) Install dependencies
```bash
npm install
```

### 2) Create D1 database and bind it
```bash
npx wrangler d1 create schuss_challenge
```

Copy the generated `database_id` into `wrangler.jsonc` (`d1_databases[0].database_id`).

### 3) Run migration
```bash
npx wrangler d1 execute schuss_challenge --file=./migrations/0001_initial.sql --local
```

### 4) Start worker locally
```bash
npx wrangler dev
```

### 5) Quick API smoke tests
```bash
# Create test session
curl -X POST http://127.0.0.1:8787/api/sessions ^
  -H "content-type: application/json" ^
  -H "user_id: test-user-1" ^
  -d "{\"mode\":\"standard\",\"score\":578,\"shotsFired\":60,\"durationSeconds\":1800,\"playedDate\":\"2026-04-01\"}"

# Read sessions back
curl "http://127.0.0.1:8787/api/sessions?limit=20" -H "user_id: test-user-1"

# Unlock and list achievements
curl -X POST http://127.0.0.1:8787/api/achievements -H "content-type: application/json" -H "user_id: test-user-1" -d "{\"type\":\"first_10\"}"
curl http://127.0.0.1:8787/api/achievements -H "user_id: test-user-1"

# Stats and leaderboard
curl http://127.0.0.1:8787/api/stats -H "user_id: test-user-1"
curl "http://127.0.0.1:8787/api/leaderboard?mode=standard&period=weekly"
```

### 6) Streak test (3 days in a row => currentStreak = 3)
```bash
curl -X POST http://127.0.0.1:8787/api/sessions -H "content-type: application/json" -H "user_id: streak-user" -d "{\"mode\":\"standard\",\"score\":500,\"shotsFired\":60,\"durationSeconds\":1600,\"playedDate\":\"2026-04-01\"}"
curl -X POST http://127.0.0.1:8787/api/sessions -H "content-type: application/json" -H "user_id: streak-user" -d "{\"mode\":\"standard\",\"score\":510,\"shotsFired\":60,\"durationSeconds\":1600,\"playedDate\":\"2026-04-02\"}"
curl -X POST http://127.0.0.1:8787/api/sessions -H "content-type: application/json" -H "user_id: streak-user" -d "{\"mode\":\"standard\",\"score\":520,\"shotsFired\":60,\"durationSeconds\":1600,\"playedDate\":\"2026-04-03\"}"
curl http://127.0.0.1:8787/api/stats -H "user_id: streak-user"
```

Validation errors return:
```json
{ "error": true, "code": "VALIDATION_ERROR", "message": "..." }
```
