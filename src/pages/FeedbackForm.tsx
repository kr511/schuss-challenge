import React, { useState } from 'react';

interface FeedbackFormProps {
  onSubmitSuccess?: () => void;
  onClose?: () => void;
}

export const FeedbackForm: React.FC<FeedbackFormProps> = ({
  onSubmitSuccess,
  onClose,
}) => {
  const [formData, setFormData] = useState({
    email: '',
    feedbackType: 'general' as 'bug' | 'feature_request' | 'general',
    title: '',
    message: '',
  });

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to submit feedback');
      }

      setSubmitted(true);
      setTimeout(() => {
        setFormData({
          email: '',
          feedbackType: 'general',
          title: '',
          message: '',
        });
        setSubmitted(false);
        onSubmitSuccess?.();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div style={styles.container}>
        <div style={styles.successMessage}>
          <div style={styles.successIcon}>✓</div>
          <h3>Thank you for your feedback!</h3>
          <p>We'll review it shortly and get back to you if needed.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2>Send us Feedback</h2>
        {onClose && (
          <button
            onClick={onClose}
            style={styles.closeButton}
            aria-label="Close"
          >
            ✕
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} style={styles.form}>
        {error && <div style={styles.errorMessage}>{error}</div>}

        <div style={styles.formGroup}>
          <label style={styles.label}>
            Email Address *
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            placeholder="your-email@example.com"
            style={styles.input}
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>
            Feedback Type *
          </label>
          <select
            name="feedbackType"
            value={formData.feedbackType}
            onChange={handleChange}
            style={styles.select}
          >
            <option value="general">💬 General Feedback</option>
            <option value="feature_request">💡 Feature Request</option>
            <option value="bug">🐛 Bug Report</option>
          </select>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>
            Title *
          </label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
            placeholder="Brief summary"
            minLength={3}
            maxLength={200}
            style={styles.input}
          />
          <small style={styles.fieldHint}>
            {formData.title.length}/200
          </small>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>
            Message *
          </label>
          <textarea
            name="message"
            value={formData.message}
            onChange={handleChange}
            required
            placeholder="Tell us more..."
            minLength={10}
            maxLength={5000}
            rows={6}
            style={styles.textarea}
          />
          <small style={styles.fieldHint}>
            {formData.message.length}/5000
          </small>
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            ...styles.submitButton,
            opacity: loading ? 0.6 : 1,
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Sending...' : 'Send Feedback'}
        </button>
      </form>

      <div style={styles.footer}>
        <p style={styles.footerText}>
          Your feedback helps us improve Schuss Challenge. Thank you! 🙏
        </p>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    maxWidth: '500px',
    margin: '0 auto',
    padding: '20px',
    background: 'white',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    borderBottom: '2px solid #e5e7eb',
    paddingBottom: '15px',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#666',
    padding: '0',
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    marginBottom: '20px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontWeight: '600',
    color: '#333',
    fontSize: '14px',
  },
  input: {
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    fontFamily: 'inherit',
    transition: 'border-color 0.2s',
  },
  select: {
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    fontFamily: 'inherit',
    background: 'white',
    cursor: 'pointer',
  },
  textarea: {
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    fontFamily: 'inherit',
    resize: 'vertical',
    minHeight: '120px',
  },
  fieldHint: {
    fontSize: '12px',
    color: '#999',
    textAlign: 'right',
  },
  submitButton: {
    padding: '12px 20px',
    background: '#2563eb',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    marginTop: '10px',
  },
  errorMessage: {
    padding: '12px',
    background: '#fee2e2',
    color: '#991b1b',
    borderRadius: '6px',
    fontSize: '13px',
    marginBottom: '10px',
  },
  successMessage: {
    textAlign: 'center',
    padding: '30px',
  },
  successIcon: {
    fontSize: '48px',
    marginBottom: '15px',
  },
  footer: {
    textAlign: 'center',
    paddingTop: '15px',
    borderTop: '1px solid #e5e7eb',
  },
  footerText: {
    fontSize: '13px',
    color: '#666',
    margin: '0',
  },
};
