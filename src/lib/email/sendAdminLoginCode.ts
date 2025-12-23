import { Resend } from 'resend';

function formatExpiry(expiresAtIso: string) {
  const d = new Date(expiresAtIso);
  if (Number.isNaN(d.getTime())) return expiresAtIso;
  return d.toLocaleString();
}

export async function sendAdminLoginCodeEmail(email: string, code: string, expiresAtIso: string) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY not configured');
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #222;">
      <h2 style="margin: 0 0 12px 0;">Glamour Girls Admin Login</h2>
      <p style="margin: 0 0 12px 0;">Your 6-digit verification code is:</p>
      <div style="font-size: 28px; letter-spacing: 4px; font-weight: 700; padding: 12px 16px; background: #f5f5f5; display: inline-block; border-radius: 8px;">
        ${code}
      </div>
      <p style="margin: 12px 0 0 0; color: #555;">This code expires at <strong>${formatExpiry(expiresAtIso)}</strong>.</p>
      <p style="margin: 12px 0 0 0; color: #777; font-size: 12px;">If you didn’t request this, you can ignore this email.</p>
    </div>
  `;

  const { error } = await resend.emails.send({
    from: fromEmail,
    to: email,
    subject: 'Your Glamour Girls admin login code',
    html,
  });

  if (error) {
    throw new Error(error.message || 'Failed to send email');
  }
}


