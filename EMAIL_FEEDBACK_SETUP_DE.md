# 📧 Schuss Challenge - Email Feedback System Setup (Deutsch)

## ✅ Was wurde implementiert

Deine App hat jetzt ein **komplettes Email-Feedback-System**, das:
- ✅ Nutzer-Feedback akzeptiert (Bugs, Feature Requests, Feedback)
- ✅ Feedback in D1 Datenbank speichert
- ✅ Sofort Email-Benachrichtigungen via SendGrid versendet
- ✅ Benutzerfreundliches Formular anbietet
- ✅ Ohne Authentifizierung funktioniert (auch für anonyme Nutzer)

---

## 🚀 Schnellanleitung

### Schritt 1: SendGrid API Key holen

1. Gehe zu https://sendgrid.com (Account erstellen wenn nötig - KOSTENLOS)
2. Gehe zu **Settings → API Keys**
3. Klick auf **Create API Key**
4. Name eingeben: `SchussChallenge`
5. "Full Access" wählen (oder nur "Mail Send" für minimal Permissions)
6. API Key kopieren (brauchst du in Schritt 2)

### Schritt 2: Cloudflare Worker konfigurieren

#### Für lokale Entwicklung:
```bash
# .env.local Datei erstellen
SENDGRID_API_KEY=SG.xxxxx_dein_actual_key_xxxxx
ADMIN_EMAIL=deine-email@example.com
```

Dann Dev Server starten:
```bash
npm run dev
```

#### Für Produktion (Cloudflare Dashboard):

1. Gehe zu **Cloudflare Dashboard → Workers → Secrets**
2. Add Secret: `SENDGRID_API_KEY`
   - Value: Dein SendGrid API Key aus Schritt 1
3. Set Variable: `ADMIN_EMAIL`
   - Value: Die Email, wo du Feedback-Benachrichtigungen bekommen möchtest

**ODER** mit Wrangler CLI:
```bash
wrangler secret put SENDGRID_API_KEY --env production
# Paste dein SendGrid API Key wenn aufgefordert

wrangler publish --env production
```

### Schritt 3: Datenbank Migration

Führe die D1 Migration aus um die Feedback-Tabellen zu erstellen:
```bash
npm run d1:migrate:local    # Für lokale Entwicklung
npm run d1:migrate:remote   # Für Produktion
```

### Schritt 4: Feedback Form zur App hinzufügen

In deinem React Component:

```tsx
import { FeedbackForm } from './src/pages/FeedbackForm';

export function App() {
  const [showFeedback, setShowFeedback] = useState(false);

  return (
    <>
      <button onClick={() => setShowFeedback(true)}>
        📧 Feedback senden
      </button>

      {showFeedback && (
        <div style={{ position: 'fixed', top: '50%', left: '50%', 
                     transform: 'translate(-50%, -50%)', zIndex: 1000 }}>
          <FeedbackForm
            onClose={() => setShowFeedback(false)}
            onSubmitSuccess={() => setShowFeedback(false)}
          />
        </div>
      )}
    </>
  );
}
```

---

## 📡 API Endpoint Reference

### POST /api/feedback
Neues Feedback einreichen

**Request:**
```json
{
  "email": "nutzer@example.com",
  "feedbackType": "bug|feature_request|general",
  "title": "Kurze Zusammenfassung (3-200 Zeichen)",
  "message": "Detaillierte Nachricht (10-5000 Zeichen)"
}
```

**Response (Erfolg):**
```json
{
  "ok": true,
  "feedbackId": "uuid",
  "message": "Feedback erfolgreich eingereicht. Wir überprüfen es bald!"
}
```

---

## 📧 Email-Benachrichtigungen

Wenn Feedback eingereicht wird, erhältst du eine Email wie:

```
Subject: [Schuss Challenge] 🐛 Bug: App stürzt beim Foto-Upload ab

From: feedback@schuss-challenge.com
To: deine-email@example.com

---

NEUES FEEDBACK ERHALTEN

Typ: Bug Report
Von: nutzer@example.com
Empfangen: 13. April 2026, 14:35 Uhr

Titel:
App stürzt beim Foto-Upload ab

Nachricht:
Wenn ich versuche, ein Foto auf dem Handy (iPhone 12) hochzuladen,
friert die App ein und stürzt dann ab. Das passiert mit JPEG Dateien
die größer als 2MB sind.

---
```

**Um zu antworten:** Einfach auf die Email antworten - sie wird an die Nutzer-Email versendet.

---

## 🗄️ Datenbank Schema

### feedback Tabelle
```sql
CREATE TABLE feedback (
  id TEXT PRIMARY KEY,                    -- UUID
  user_email TEXT,                       -- Nutzer Email
  feedback_type TEXT,                    -- 'bug' | 'feature_request' | 'general'
  title TEXT NOT NULL,                   -- 3-200 Zeichen
  message TEXT NOT NULL,                 -- 10-5000 Zeichen
  sent_at INTEGER,                       -- Zeitstempel (Millisekunden)
  status TEXT DEFAULT 'pending'          -- 'pending' | 'sent' | 'failed'
)
```

---

## 🛠️ Troubleshooting

### Emails werden nicht versendet?

**Check 1: SendGrid API Key Gültig?**
```bash
curl -X POST "https://api.sendgrid.com/v3/mail/send" \
  -H "Authorization: Bearer DEIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"personalizations":[{"to":[{"email":"test@example.com"}]}],"from":{"email":"test@example.com"},"subject":"Test","content":[{"type":"text/plain","value":"Test"}]}'
```

**Check 2: Environment Variables gesetzt?**
```bash
wrangler secret list --env production
```

**Check 3: SendGrid Limits überschritten?**
- Kostenlos: 100 Emails/Tag
- Bezahlt: Unbegrenzt
- Wenn Limit überschritten: Emails scheitern automatisch

**Check 4: Absender-Email verifiziert?**
- Deine `ADMIN_EMAIL` muss in SendGrid verifiziert sein
- Gehe zu https://app.sendgrid.com/settings/sender_auth
- Click "Create new sender" und verifizierung abschließen

### Formulier-Validierungsfehler?

**Email ungültig:**
- Muss Format sein: `nutzer@example.com`

**Titel zu kurz:**
- Minimum 3 Zeichen
- Maximum 200 Zeichen

**Nachricht zu kurz/lang:**
- Minimum 10 Zeichen
- Maximum 5000 Zeichen

---

## 🔐 Sicherheitshinweise

✅ Alle Validierung erfolgt Server-seitig
✅ SendGrid API Key ist sicher als Secret gespeichert
✅ Rate Limiting sollte vor Produktion hinzugefügt werden
✅ Erwäge CAPTCHA wenn du Spam bekommst

**Optional: Rate Limiting hinzufügen**

```ts
// In api.ts
const feedbackRateLimit = new Map<string, number[]>();

async function handlePostFeedback(request: Request, env: Env): Promise<Response> {
  const clientIp = request.headers.get('cf-connecting-ip');
  const now = Date.now();
  const windowStart = now - 3600000; // 1 Stunde
  
  const timestamps = feedbackRateLimit.get(clientIp!) || [];
  const recentRequests = timestamps.filter(t => t > windowStart);
  
  if (recentRequests.length >= 5) { // Max 5 pro Stunde pro IP
    return json({
      error: true,
      code: 'RATE_LIMITED',
      message: 'Zu viele Feedback-Einreichungen. Versuche es später erneut.',
    }, 429);
  }
  
  recentRequests.push(now);
  feedbackRateLimit.set(clientIp!, recentRequests);
  
  // ... Rest des Handlers
}
```

---

## 📊 Monitoring & Analytik

### Alle ausstehenden Feedbacks anzeigen:
```bash
# Lokal
wrangler d1 execute schuss_challenge --local \
  "SELECT * FROM feedback WHERE status = 'pending' ORDER BY sent_at DESC LIMIT 10"

# Produktion
wrangler d1 execute schuss_challenge \
  "SELECT * FROM feedback ORDER BY sent_at DESC LIMIT 10"
```

### Fehlgeschlagene Emails anzeigen:
```bash
wrangler d1 execute schuss_challenge --local \
  "SELECT * FROM feedback WHERE status = 'failed'"
```

---

## 📝 Nächste Schritte

1. ✅ SendGrid Account aufsetzen
2. ✅ Cloudflare Secrets konfigurieren
3. ✅ D1 Migration ausführen
4. ✅ FeedbackForm zur App hinzufügen
5. ⏳ Lokal testen: `npm run dev`
6. ⏳ In Produktion testen
7. ⏳ Eingehendes Feedback überwachen
8. ⏳ Per Email auf Nutzer-Feedback antworten

---

## 💡 Beispiel: Komplette Feedback-Seite

```tsx
// pages/FeedbackPage.tsx
import React from 'react';
import { FeedbackForm } from '../components/FeedbackForm';

export default function FeedbackPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '40px 20px' }}>
      <FeedbackForm
        onSubmitSuccess={() => {
          console.log('Feedback eingereicht!');
          // Weiterleiten oder Erfolgsmeldung anzeigen
        }}
      />
    </div>
  );
}
```

---

## 📧 Zusammenfassung der konfigurierten Dateien

**Neue Dateien:**
- ✅ `worker/sendgrid.ts` - SendGrid API Integration
- ✅ `src/pages/FeedbackForm.tsx` - React Feedback Form Component
- ✅ `EMAIL_FEEDBACK_SETUP.md` - English Setup Guide
- ✅ `EMAIL_FEEDBACK_SETUP_DE.md` - Deutsche Setup Anleitung (diese Datei)

**Modifizierte Dateien:**
- ✅ `migrations/0001_initial.sql` - Neue `feedback` Tabelle
- ✅ `worker/types.ts` - `Feedback` Type + Env vars
- ✅ `worker/db.ts` - Feedback Datenbank Funktionen
- ✅ `worker/api.ts` - `/api/feedback` POST Endpoint
- ✅ `wrangler.jsonc` - SendGrid Secret/Var Konfiguration

---

**Fragen?** Schaue in deinem SendGrid Dashboard oder Cloudflare Worker Logs nach Fehler-Details.

Viel Erfolg! 🚀
