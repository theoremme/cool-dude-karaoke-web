const { Resend } = require('resend');

const FROM_EMAIL = process.env.FROM_EMAIL || 'Cool Dude Karaoke <noreply@cooldudekaraoke.com>';

let resend;
function getResend() {
  if (!resend) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY not configured');
    }
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

const sendPasswordResetEmail = async (to, resetToken) => {
  const baseUrl = process.env.APP_URL || 'https://cool-dude-karaoke-web-production.up.railway.app';
  const resetUrl = `${baseUrl}/reset-password/${resetToken}`;

  await getResend().emails.send({
    from: FROM_EMAIL,
    to,
    subject: 'Reset Your Password — Cool Dude Karaoke',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #e040fb;">Cool Dude Karaoke</h2>
        <p>Someone requested a password reset for your account. If that was you, click below:</p>
        <a href="${resetUrl}" style="display: inline-block; background: #e040fb; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; margin: 16px 0;">
          Reset Password
        </a>
        <p style="color: #888; font-size: 14px;">This link expires in 1 hour. If you didn't request this, just ignore this email.</p>
      </div>
    `,
  });
};

module.exports = { sendPasswordResetEmail };
