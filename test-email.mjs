import { sendEmailViaResend, generateFeedbackEmailHtml, generateFeedbackEmailText } from './worker/resend.ts';

const RESEND_API_KEY = 're_VGqpAAZH_4McxBgnEJjALF9hMfGPuJoQM';
const ADMIN_EMAIL = 'eliaskummel@gmail.com';
const FROM_EMAIL = 'onboarding@resend.dev'; // Resend Test-Domain

async function testEmail() {
  console.log('🧪 Teste E-Mail-Versand via Resend...');
  
  const timestamp = Date.now();
  const htmlContent = generateFeedbackEmailHtml(
    'bug',
    'Test E-Mail Funktion',
    'Dies ist ein Test, um zu prüfen ob der E-Mail-Versand mit Resend funktioniert.',
    'test@example.com',
    timestamp
  );
  
  const textContent = generateFeedbackEmailText(
    'bug',
    'Test E-Mail Funktion',
    'Dies ist ein Test, um zu prüfen ob der E-Mail-Versand mit Resend funktioniert.',
    'test@example.com',
    timestamp
  );
  
  const result = await sendEmailViaResend(RESEND_API_KEY, ADMIN_EMAIL, {
    to: ADMIN_EMAIL,
    subject: '[Schuss Challenge] 🐛 Bug: Test E-Mail Funktion',
    html: htmlContent,
    text: textContent,
    fromEmail: FROM_EMAIL,
    fromName: 'Schuss Challenge'
  });
  
  if (result.success) {
    console.log('✅ E-Mail erfolgreich gesendet!');
    console.log('Message ID:', result.messageId);
  } else {
    console.error('❌ E-Mail-Versand fehlgeschlagen!');
    console.error('Fehler:', result.error);
  }
}

testEmail().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
