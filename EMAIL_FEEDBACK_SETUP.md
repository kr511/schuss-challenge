# 📧 Schuss Challenge - Email Feedback System Setup

## ✅ What was implemented

Your app now has a **complete real-time feedback system** that:
- ✅ Accepts user feedback (bugs, feature requests, general feedback)
- ✅ Stores feedback in D1 database
- ✅ Sends instant email notifications via SendGrid
- ✅ Provides user-friendly form component
- ✅ No authentication required (works for anonymous users)

---

## 🚀 Quick Start

### Step 1: Get a SendGrid API Key

1. Go to https://sendgrid.com (Create account if needed - FREE tier available)
2. Navigate to **Settings → API Keys**
3. Click **Create API Key**
4. Choose name: `SchussChallenge`
5. Select "Full Access" (or just "Mail Send" for minimum permissions)
6. Copy the key (you'll need it in Step 2)

### Step 2: Configure Cloudflare Worker

#### For Local Development:
```bash
# Create a .env.local file in your project root
SENDGRID_API_KEY=SG.xxxxx_your_actual_key_xxxxx
ADMIN_EMAIL=your-email@example.com
```

Then start dev server:
```bash
npm run dev
```

#### For Production (Cloudflare Dashboard):

1. Go to **Cloudflare Dashboard → Workers → Secrets**
2. Add Secret: `SENDGRID_API_KEY`
   - Value: Your SendGrid API key from Step 1
3. Set Variable: `ADMIN_EMAIL`
   - Value: The email where you want to receive feedback notifications

**OR** use Wrangler CLI:
```bash
wrangler secret put SENDGRID_API_KEY --env production
# Paste your SendGrid API key when prompted

wrangler publish --env production
```

### Step 3: Database Migration

Run the D1 migration to add feedback tables:
```bash
npm run d1:migrate:local    # For local env
npm run d1:migrate:remote   # For production
```

### Step 4: Add Feedback Form to Your App

In your React component or page:

```tsx
import { FeedbackForm } from './src/pages/FeedbackForm';

export function App() {
  const [showFeedback, setShowFeedback] = useState(false);

  return (
    <>
      <button onClick={() => setShowFeedback(true)}>
        📧 Send Feedback
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
Submit new feedback

**Request:**
```json
{
  "email": "user@example.com",
  "feedbackType": "bug|feature_request|general",
  "title": "Brief summary (3-200 chars)",
  "message": "Detailed message (10-5000 chars)"
}
```

**Response (Success):**
```json
{
  "ok": true,
  "feedbackId": "uuid",
  "message": "Feedback submitted successfully. We'll review it shortly!"
}
```

**Response (SendGrid not configured):**
```json
{
  "ok": true,
  "feedbackId": "uuid",
  "message": "Feedback submitted. Email service not configured.",
  "warning": "SendGrid not configured"
}
```

---

## 📧 Email Notifications

When feedback is submitted, you'll receive an email like:

```
Subject: [Schuss Challenge] 🐛 Bug: App crashes on photo upload

From: feedback@schuss-challenge.com
To: your-email@example.com

---

NEW FEEDBACK RECEIVED

Type: Bug Report
From: user@example.com
Received: April 13, 2026, 2:35 PM

Title:
App crashes on photo upload

Message:
When I try to upload a photo on mobile (iPhone 12), 
the app freezes and then crashes. This happens with 
JPEG files larger than 2MB.

---
```

**To reply:** Simply reply to the email - it will be sent to the user's email address.

---

## 🗄️ Database Schema

### feedback table
```sql
CREATE TABLE feedback (
  id TEXT PRIMARY KEY,                    -- UUID
  user_email TEXT,                       -- Comma-separated or first email if multiple
  feedback_type TEXT,                    -- 'bug' | 'feature_request' | 'general'
  title TEXT NOT NULL,                   -- 3-200 characters
  message TEXT NOT NULL,                 -- 10-5000 characters
  sent_at INTEGER,                       -- Timestamp (milliseconds)
  status TEXT DEFAULT 'pending'          -- 'pending' | 'sent' | 'failed'
)
```

---

## 🛠️ Troubleshooting

### Email not being sent?

**Check 1: SendGrid API Key**
```bash
# Test your API key
curl -X POST "https://api.sendgrid.com/v3/mail/send" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"personalizations":[{"to":[{"email":"test@example.com"}]}],"from":{"email":"test@example.com"},"subject":"Test","content":[{"type":"text/plain","value":"Test"}]}'
```

**Check 2: Environment Variables**
```bash
# Check if secrets are set
wrangler secret list --env production
```

**Check 3: SendGrid Limits**
- Free tier: 100 emails/day
- Paid tier: Unlimited
- If you exceed limits, emails will fail silently

**Check 4: From Address**
- Your `ADMIN_EMAIL` must be verified in SendGrid
- Go to https://app.sendgrid.com/settings/sender_auth
- Click "Create new sender" and complete verification

### Form validation errors?

**Email invalid:**
- Ensure email format: `user@example.com`

**Title too short:**
- Minimum 3 characters
- Maximum 200 characters

**Message too short/long:**
- Minimum 10 characters
- Maximum 5000 characters

---

## 🔐 Security Notes

✅ All validation happens server-side
✅ SendGrid API key is stored securely as a secret
✅ Rate limiting should be added before production
✅ Consider CAPTCHA if getting spam

**Optional: Add Rate Limiting**

```ts
// In api.ts
const feedbackRateLimit = new Map<string, number[]>();

async function handlePostFeedback(request: Request, env: Env): Promise<Response> {
  const clientIp = request.headers.get('cf-connecting-ip');
  const now = Date.now();
  const windowStart = now - 3600000; // 1 hour
  
  const timestamps = feedbackRateLimit.get(clientIp!) || [];
  const recentRequests = timestamps.filter(t => t > windowStart);
  
  if (recentRequests.length >= 5) { // Max 5 per hour per IP
    return json({
      error: true,
      code: 'RATE_LIMITED',
      message: 'Too many feedback submissions. Please try again later.',
    }, 429);
  }
  
  recentRequests.push(now);
  feedbackRateLimit.set(clientIp!, recentRequests);
  
  // ... rest of handler
}
```

---

## 📊 Monitoring & Analytics

### View pending feedbacks:
```bash
# Local
wrangler d1 execute schuss_challenge --local \
  "SELECT * FROM feedback WHERE status = 'pending' ORDER BY sent_at DESC LIMIT 10"

# Production
wrangler d1 execute schuss_challenge \
  "SELECT * FROM feedback ORDER BY sent_at DESC LIMIT 10"
```

### Email delivery stats:
```bash
# Check failed emails
wrangler d1 execute schuss_challenge --local \
  "SELECT * FROM feedback WHERE status = 'failed'"
```

---

## 📝 Next Steps

1. ✅ Set up SendGrid account
2. ✅ Configure Cloudflare secrets
3. ✅ Run D1 migration
4. ✅ Add FeedbackForm to your app
5. ⏳ Test locally: `npm run dev`
6. ⏳ Test in production
7. ⏳ Monitor incoming feedback
8. ⏳ Reply to users via email

---

## 💡 Usage Example (Full Page)

```tsx
// pages/FeedbackPage.tsx
import React, { useState } from 'react';
import { FeedbackForm } from '../components/FeedbackForm';

export default function FeedbackPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '40px 20px' }}>
      <FeedbackForm
        onSubmitSuccess={() => {
          console.log('Feedback submitted!');
          // Redirect or show success message
        }}
      />
    </div>
  );
}
```

---

**Questions?** Check your SendGrid Dashboard or Cloudflare Worker logs for error details.

Good luck! 🚀
