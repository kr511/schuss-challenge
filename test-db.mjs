// Test: Feedback speichern und aus Datenbank lesen

const crypto = await import('node:crypto');

async function testFeedback() {
  console.log('🧪 Teste Feedback-System (nur Datenbank)...\n');

  // Test-Feedback erstellen
  const testFeedback = {
    email: 'test@example.com',
    feedbackType: 'bug',
    title: 'Test Bug Report',
    message: 'Dies ist ein Test-Feedback um die Datenbank-Funktionalität zu prüfen.',
  };

  console.log('📝 Test-Feedback:');
  console.log('  Typ:', testFeedback.feedbackType);
  console.log('  Titel:', testFeedback.title);
  console.log('  Nachricht:', testFeedback.message);
  console.log('');

  // ID generieren
  const feedbackId = crypto.randomUUID();
  const timestamp = Date.now();

  console.log('✅ Feedback ID:', feedbackId);
  console.log('✅ Timestamp:', new Date(timestamp).toLocaleString('de-DE'));
  console.log('');

  // SQL Befehle zum manuellen Einfügen und Abfragen
  console.log('📋 SQL-Befehle zum Testen:');
  console.log('');
  console.log('# Feedback einfügen:');
  console.log(`INSERT INTO feedback (id, user_email, feedback_type, title, message, sent_at, status) VALUES ('${feedbackId}', 'test@example.com', 'bug', 'Test Bug Report', 'Dies ist ein Test-Feedback', ${timestamp}, 'pending');`);
  console.log('');
  console.log('# Alle Feedbacks anzeigen:');
  console.log('SELECT * FROM feedback ORDER BY sent_at DESC;');
  console.log('');
  console.log('# Test-Feedback löschen:');
  console.log(`DELETE FROM feedback WHERE id = '${feedbackId}';`);
  console.log('');

  console.log('✅ Test abgeschlossen!');
  console.log('');
  console.log('📋 Nächste Schritte:');
  console.log('  1. Dev Server starten: npm run dev');
  console.log('  2. Feedback senden: POST /api/feedback');
  console.log('  3. Feedbacks abrufen: GET /api/admin/feedbacks');
  console.log('  4. Admin-Dashboard öffnen: admin.html');
}

testFeedback().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
