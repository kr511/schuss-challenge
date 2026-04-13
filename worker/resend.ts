/**
 * Resend Email Service Integration
 * Handles sending emails via Resend API
 * Free tier: 3,000 emails/month
 * Get API key: https://resend.com/api-keys
 */

interface ResendEmailRequest {
  to: string;
  subject: string;
  html: string;
  text: string;
  fromEmail?: string;
  fromName?: string;
}

export async function sendEmailViaResend(
  apiKey: string,
  adminEmail: string,
  options: ResendEmailRequest,
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!apiKey) {
    return {
      success: false,
      error: "Resend API key not configured",
    };
  }

  const fromEmail = options.fromEmail || "onboarding@resend.dev";
  const fromName = options.fromName || "Schuss Challenge";
  const from = `${fromName} <${fromEmail}>`;

  const payload = {
    from,
    to: [options.to],
    subject: options.subject,
    html: options.html,
    text: options.text,
  };

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      const data = await response.json();
      return {
        success: true,
        messageId: data.id || "unknown",
      };
    }

    const errorData = await response.json();
    return {
      success: false,
      error: `Resend API error: ${response.status} ${JSON.stringify(errorData)}`,
    };
  } catch (error) {
    return {
      success: false,
      error: `Resend error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Generate HTML email for feedback submission
 */
export function generateFeedbackEmailHtml(
  feedbackType: string,
  title: string,
  message: string,
  userEmail: string,
  timestamp: number,
): string {
  const typeLabel = {
    bug: "🐛 Bug Report",
    feature_request: "💡 Feature Request",
    general: "💬 General Feedback",
  }[feedbackType] || "Feedback";

  const formattedDate = new Date(timestamp).toLocaleString();

  return `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #333; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9; }
      .header { background: #2563eb; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
      .content { background: white; padding: 20px; border: 1px solid #e5e7eb; border-top: none; }
      .footer { background: #f3f4f6; padding: 15px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; font-size: 12px; color: #666; }
      .label { font-weight: bold; color: #2563eb; margin-top: 15px; margin-bottom: 5px; }
      .value { background: #f3f4f6; padding: 10px; border-radius: 4px; word-wrap: break-word; }
      .badges { display: inline-block; padding: 4px 12px; background: #dbeafe; color: #1e40af; border-radius: 16px; font-size: 12px; font-weight: 500; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h2 style="margin: 0;">New Feedback Received</h2>
        <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">${typeLabel}</p>
      </div>
      <div class="content">
        <div class="label">📧 From:</div>
        <div class="value">${userEmail}</div>

        <div class="label">⏰ Received:</div>
        <div class="value">${formattedDate}</div>

        <div class="label">📝 Title:</div>
        <div class="value"><strong>${title}</strong></div>

        <div class="label">💬 Message:</div>
        <div class="value" style="white-space: pre-wrap; line-height: 1.6;">
${message}
        </div>

        <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0; font-size: 12px; color: #666;">
            <strong>Quick Action:</strong> Reply to ${userEmail} to respond to this feedback.
          </p>
        </div>
      </div>
      <div class="footer">
        <p style="margin: 0;">
          This is an automated email from <strong>Schuss Challenge</strong> feedback system.
          <br>
          Do not reply to this email address.
        </p>
      </div>
    </div>
  </body>
</html>
  `;
}

/**
 * Generate plain text email for feedback submission
 */
export function generateFeedbackEmailText(
  feedbackType: string,
  title: string,
  message: string,
  userEmail: string,
  timestamp: number,
): string {
  const typeLabel = {
    bug: "Bug Report",
    feature_request: "Feature Request",
    general: "General Feedback",
  }[feedbackType] || "Feedback";

  const formattedDate = new Date(timestamp).toLocaleString();

  return `
NEW FEEDBACK RECEIVED

Type: ${typeLabel}
From: ${userEmail}
Received: ${formattedDate}

Title:
${title}

Message:
${message}

---
This is an automated email from Schuss Challenge feedback system.
Do not reply to this email address.
  `.trim();
}
