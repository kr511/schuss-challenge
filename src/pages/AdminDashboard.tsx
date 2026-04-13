import { useState, useEffect } from 'react';

interface Feedback {
  id: string;
  user_email: string;
  feedback_type: 'bug' | 'feature_request' | 'general';
  title: string;
  message: string;
  sent_at: number;
  status: 'pending' | 'sent' | 'failed';
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';

export function AdminDashboard() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'bug' | 'feature_request' | 'general'>('all');

  useEffect(() => {
    loadFeedbacks();
  }, []);

  async function loadFeedbacks() {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/admin/feedbacks`);
      if (!response.ok) {
        throw new Error('Failed to load feedbacks');
      }
      const data = await response.json();
      setFeedbacks(data.feedbacks || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  const filteredFeedbacks = filter === 'all'
    ? feedbacks
    : feedbacks.filter(f => f.feedback_type === filter);

  const typeConfig = {
    bug: { label: '🐛 Bug', color: '#ef4444', bg: '#fee2e2' },
    feature_request: { label: '💡 Feature', color: '#3b82f6', bg: '#dbeafe' },
    general: { label: '💬 Feedback', color: '#10b981', bg: '#d1fae5' },
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <div style={{ background: 'white', padding: '40px', borderRadius: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
          <h2 style={{ margin: '0 0 8px 0', color: '#1f2937' }}>Laden...</h2>
          <p style={{ margin: 0, color: '#6b7280' }}>Feedbacks werden geladen</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <div style={{ background: 'white', padding: '40px', borderRadius: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>❌</div>
          <h2 style={{ margin: '0 0 8px 0', color: '#ef4444' }}>Fehler</h2>
          <p style={{ margin: '0 0 16px 0', color: '#6b7280' }}>{error}</p>
          <button
            onClick={loadFeedbacks}
            style={{ padding: '12px 24px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 500 }}
          >
            Erneut versuchen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '40px 20px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1 style={{ fontSize: '48px', margin: '0 0 8px 0', color: 'white', fontWeight: 700 }}>
            📊 Admin Dashboard
          </h1>
          <p style={{ fontSize: '20px', margin: 0, color: 'rgba(255,255,255,0.9)' }}>
            {feedbacks.length} Feedback{feedbacks.length !== 1 ? 's' : ''} erhalten
          </p>
        </div>

        {/* Filter */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: '32px', flexWrap: 'wrap' }}>
          {(['all', 'bug', 'feature_request', 'general'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              style={{
                padding: '12px 24px',
                background: filter === type ? 'white' : 'rgba(255,255,255,0.2)',
                color: filter === type ? '#667eea' : 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: filter === type ? 600 : 400,
                fontSize: '16px',
                transition: 'all 0.2s',
              }}
            >
              {type === 'all' ? 'Alle' : typeConfig[type].label}
            </button>
          ))}
        </div>

        {/* Feedback Cards */}
        <div style={{ display: 'grid', gap: '20px' }}>
          {filteredFeedbacks.length === 0 ? (
            <div style={{ background: 'white', padding: '60px 40px', borderRadius: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: '64px', marginBottom: '16px' }}>📭</div>
              <h2 style={{ margin: '0 0 8px 0', color: '#1f2937' }}>Keine Feedbacks</h2>
              <p style={{ margin: 0, color: '#6b7280' }}>Noch keine Feedbacks eingereicht</p>
            </div>
          ) : (
            filteredFeedbacks.map((feedback) => {
              const config = typeConfig[feedback.feedback_type];
              const date = new Date(feedback.sent_at).toLocaleString('de-DE');

              return (
                <div
                  key={feedback.id}
                  style={{
                    background: 'white',
                    borderRadius: '12px',
                    padding: '24px',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                  }}
                >
                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '8px' }}>
                        <span
                          style={{
                            padding: '4px 12px',
                            background: config.bg,
                            color: config.color,
                            borderRadius: '16px',
                            fontSize: '14px',
                            fontWeight: 600,
                          }}
                        >
                          {config.label}
                        </span>
                        <span style={{ fontSize: '14px', color: '#6b7280' }}>
                          {date}
                        </span>
                      </div>
                      <h3 style={{ margin: '0 0 4px 0', color: '#1f2937', fontSize: '20px' }}>
                        {feedback.title}
                      </h3>
                    </div>
                  </div>

                  {/* Content */}
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>
                      <strong>Von:</strong> {feedback.user_email}
                    </div>
                    <div
                      style={{
                        background: '#f9fafb',
                        padding: '16px',
                        borderRadius: '8px',
                        whiteSpace: 'pre-wrap',
                        lineHeight: '1.6',
                        color: '#374151',
                      }}
                    >
                      {feedback.message}
                    </div>
                  </div>

                  {/* Footer */}
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span
                      style={{
                        padding: '4px 12px',
                        background: feedback.status === 'pending' ? '#fef3c7' : feedback.status === 'sent' ? '#d1fae5' : '#fee2e2',
                        color: feedback.status === 'pending' ? '#92400e' : feedback.status === 'sent' ? '#065f46' : '#991b1b',
                        borderRadius: '16px',
                        fontSize: '12px',
                        fontWeight: 600,
                      }}
                    >
                      {feedback.status === 'pending' ? '⏳ Ausstehend' : feedback.status === 'sent' ? '✅ Gesendet' : '❌ Fehlgeschlagen'}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Refresh Button */}
        <div style={{ textAlign: 'center', marginTop: '32px' }}>
          <button
            onClick={loadFeedbacks}
            style={{
              padding: '12px 32px',
              background: 'white',
              color: '#667eea',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '16px',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            }}
          >
            🔄 Aktualisieren
          </button>
        </div>
      </div>
    </div>
  );
}
