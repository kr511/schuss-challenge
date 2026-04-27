# Supabase Setup – Schussduell

Vollständige Anleitung zur Einrichtung der Supabase-Integration.

---

## Übersicht

Die Architektur verwendet **zwei Supabase-Zugangswege**:

| Weg | Wer | Schlüssel | Zweck |
|-----|-----|-----------|-------|
| Cloudflare Worker → Supabase REST | Worker (`db.ts`) | `service_role` | Spiel-Daten (Sessions, Achievements, Streaks, Leaderboard, Feedback) |
| Browser → Supabase JS SDK | Frontend (`supabase-social.js`) | `anon` + JWT | Soziale Features (Freunde, Friend-Codes, Online-Status, Challenges) |

Der Worker validiert das Supabase JWT des Users und leitet dann alle Datenbank-Operationen mit dem Service-Role-Key weiter.

---

## 1. Supabase-Datenbank einrichten

Führe die SQL-Dateien im **Supabase SQL Editor** aus (Dashboard → SQL Editor → New query).

### Reihenfolge

```
supabase/migrations/0001_social_tables.sql     ← Social-Tabellen (profiles, friends, …)
supabase/migrations/0002_social_indexes.sql    ← Indizes
supabase/migrations/0003_social_rls.sql        ← Row Level Security Policies
supabase/migrations/0004_social_rpc.sql        ← RPCs (accept_friend_request, touch_my_profile)
supabase/migrations/0005_worker_api_tables.sql ← Worker-API-Tabellen (users, game_sessions, …)
supabase/migrations/0006_social_remove_friend_rpc.sql ← remove_friend RPC
```

**Alternativ (all-in-one für Social):**  
`supabase/schema-social.sql` enthält alles aus 0001-0004 + RPCs in einer Datei.  
Danach noch `0005_worker_api_tables.sql` und `0006_social_remove_friend_rpc.sql` ausführen.

### Tabellen nach dem Setup

**Social-Tabellen** (Frontend via anon key):
- `profiles` – Nutzerprofile mit Anzeigenamen
- `friend_codes` – 6-stellige Freundescodes
- `friend_requests` – Freundschaftsanfragen
- `friends` – Freundesliste (bidirektional)
- `online_status` – Präsenz-Heartbeat
- `async_challenges` – Asynchrone Duell-Herausforderungen
- `async_results` – Duell-Ergebnisse

**Worker-API-Tabellen** (nur über Worker mit service_role):
- `users` – User-Identität (wird automatisch beim ersten API-Call angelegt)
- `game_sessions` – Spielsitzungen
- `achievements` – Freigeschaltete Achievements
- `streaks` – Spielserien (Tage in Folge)
- `feedback` – User-Feedback
- `api_profiles` – Öffentliche Profile für Leaderboard
- `activity_log` – Live-Aktivitätsfeed

---

## 2. Google OAuth konfigurieren

1. Supabase Dashboard → **Authentication** → **Providers** → **Google**
2. "Enable" aktivieren
3. Google Cloud Console → OAuth 2.0 Client erstellen:
   - Authorized redirect URI: `https://fknftkvozwfkcarldzms.supabase.co/auth/v1/callback`
4. Client ID + Client Secret in Supabase eintragen
5. Speichern

---

## 3. Cloudflare Worker Secrets setzen

Die Worker-Secrets werden **nicht** in `wrangler.jsonc` gespeichert (wären sonst im Code sichtbar).

```bash
# Production secrets
wrangler secret put SUPABASE_SERVICE_KEY
wrangler secret put SUPABASE_JWT_SECRET

# Optional (für Admin-E-Mail-Benachrichtigungen)
wrangler secret put SENDGRID_API_KEY
```

Werte findest du im Supabase Dashboard unter **Settings → API**:
- `service_role` → SUPABASE_SERVICE_KEY
- `JWT Secret` → SUPABASE_JWT_SECRET

---

## 4. Lokale Entwicklung

```bash
# 1. .dev.vars anlegen (wird von wrangler dev automatisch geladen)
cp .dev.vars.example .dev.vars
# → .dev.vars mit echten Secrets aus dem Supabase Dashboard füllen

# 2. Worker starten
npm run dev
# → http://localhost:8787

# 3. Tests ausführen
node test_xss_direct.mjs          # XSS-Tests (kein Supabase nötig)
npx tsx test_api_direct.mjs       # Worker-API-Tests (benötigt .dev.vars)
```

**Dev-Auth-Modus** (nur lokal): Wenn `ALLOW_INSECURE_DEV_AUTH=true` und der Request von localhost kommt, kann statt eines JWT-Tokens der Header `x-dev-user-id: <id>` verwendet werden.

---

## 5. ENV-Variablen-Referenz

| Variable | Wo | Required | Beschreibung |
|----------|-----|----------|--------------|
| `SUPABASE_URL` | `wrangler.jsonc` vars | ✅ | Supabase Projekt-URL |
| `SUPABASE_SERVICE_KEY` | Wrangler Secret | ✅ | Service-Role-Key (bypasses RLS) |
| `SUPABASE_JWT_SECRET` | Wrangler Secret | ✅ | JWT-Verifizierung im Worker |
| `ALLOW_INSECURE_DEV_AUTH` | `wrangler.jsonc` vars | – | `true` nur lokal |
| `ALLOWED_ORIGINS_CSV` | `wrangler.jsonc` vars | – | Zusätzliche erlaubte Origins |
| `ADMIN_USER_IDS` | `wrangler.jsonc` vars | – | Supabase User-IDs für /api/admin/* |
| `SENDGRID_API_KEY` | Wrangler Secret | – | E-Mail-Benachrichtigungen |
| `ADMIN_EMAIL` | Wrangler Secret | – | Empfänger-Adresse |

---

## 6. Frontend-Konfiguration

Die folgenden Werte sind im Frontend hardcoded und müssen bei Projekt-Wechsel angepasst werden:

**`supabase-client.js`** (Zeile 5-6):
```javascript
var SUPABASE_URL = 'https://fknftkvozwfkcarldzms.supabase.co';
var SUPABASE_ANON = 'eyJhbGciOiJIUzI1...'; // Anon Key (öffentlich, sicher)
```

**`auth-gate.js`** (Zeile 6-10): Gleicher Anon Key (aufgeteilt zur Lesbarkeit)

Der `anon` Key ist intentionell öffentlich – er ist auf die RLS-Policies beschränkt.

---

## 7. Production Deployment

```bash
# Worker deployen
wrangler deploy --env production

# Oder mit explizitem Environment
wrangler deploy
```

Sicherstellen vor Deployment:
- [ ] `SUPABASE_SERVICE_KEY` via `wrangler secret put` gesetzt
- [ ] `SUPABASE_JWT_SECRET` via `wrangler secret put` gesetzt
- [ ] `ALLOW_INSECURE_DEV_AUTH` ist `false` in `env.production.vars`
- [ ] Alle SQL-Migrations ausgeführt (Schritt 1)
- [ ] Google OAuth konfiguriert (Schritt 2)
- [ ] `CACHE_VERSION` in `sw.js` und `?v=X.X` in `index.html` erhöht

---

## 8. Firebase – Status und Abhängigkeiten

Firebase bleibt für bestimmte Features bestehen:

| Feature | Status | Grund |
|---------|--------|-------|
| **User Auth** | ✅ Supabase | `auth-gate.js` ersetzt Firebase Auth vollständig |
| **Google Sign-In** | ✅ Supabase OAuth | In `auth-gate.js` via `supabase.auth.signInWithOAuth` |
| **Friends / Requests** | ✅ Supabase primär | `supabase-social.js` → Fallback auf Firebase wenn kein JWT |
| **Online-Präsenz** | ✅ Supabase primär | `supabase-social.js` → Firebase als Fallback |
| **Spieldaten sync** | ✅ Supabase | `backend-sync.js` → Worker API → Supabase DB |
| **Friend-Challenges** | ⚠️ Firebase | `friend-challenges.js` nutzt Firebase Realtime DB |
| **Async Challenges** | ⚠️ Firebase primär | `async-challenge.js` + `src/features/async-challenge.js` |

`friend-challenges.js` und `async-challenge.js` verwenden noch Firebase für Echtzeit-Challenges. Die Supabase-Infrastruktur dafür existiert bereits (`async_challenges`, `async_results` Tabellen in Supabase). Eine vollständige Firebase-Migration dieser Features ist als optionaler Folgeschritt möglich.

---

## 9. Troubleshooting

### "Supabase configuration is incomplete"
→ `SUPABASE_SERVICE_KEY` fehlt. Via `wrangler secret put SUPABASE_SERVICE_KEY` setzen.

### "AUTH_REQUIRED" bei API-Calls
→ Das Frontend sendet keinen Bearer Token. Prüfen ob der User eingeloggt ist (nicht Local Mode) und `window.SupabaseRuntime.getAccessToken()` einen Wert zurückgibt.

### Google OAuth Redirect-Error
→ Redirect URI in Google Cloud Console muss exakt `https://fknftkvozwfkcarldzms.supabase.co/auth/v1/callback` sein (kein Slash am Ende).

### Test `test_api_direct.mjs` schlägt fehl
→ `.dev.vars` fehlt oder enthält Platzhalter. Echte Keys aus dem Supabase Dashboard eintragen.

### Freunde laden nicht
→ SQL-Migrations 0001-0004 (oder `schema-social.sql`) müssen im Supabase Dashboard ausgeführt worden sein. Im Browser-Devtools prüfen ob Supabase-Queries Fehler zurückgeben.
