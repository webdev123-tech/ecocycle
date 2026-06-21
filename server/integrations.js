/* ===========================================================================
   EcoCycle — External integrations: Email, SMS, Payments, Google
   Each runs REAL when its keys are present in .env, otherwise a clearly-labelled
   sandbox fallback so the app still works. Flip live by adding the key.
   =========================================================================== */
const nodemailer = require('nodemailer');

const env = process.env;
const has = (...keys) => keys.every(k => env[k] && String(env[k]).trim().length > 0);

/* ---------------- EMAIL (SMTP via nodemailer) ---------------- */
let mailer = null;
const EMAIL_LIVE = has('SMTP_HOST', 'SMTP_USER', 'SMTP_PASS');
if (EMAIL_LIVE) {
  mailer = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: Number(env.SMTP_PORT || 587),
    secure: Number(env.SMTP_PORT) === 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
  });
}
async function sendEmail(to, subject, text, html) {
  if (!EMAIL_LIVE) { console.log(`📧 [SANDBOX EMAIL] to=${to} | ${subject} | ${text}`); return { sandbox: true }; }
  const from = env.SMTP_FROM || `EcoCycle <${env.SMTP_USER}>`;
  await mailer.sendMail({ from, to, subject, text, html: html || `<p>${text}</p>` });
  return { sent: true };
}

/* ---------------- SMS (Africa's Talking OR Twilio) ---------------- */
const SMS_AT = has('AT_USERNAME', 'AT_API_KEY');
const SMS_TWILIO = has('TWILIO_SID', 'TWILIO_TOKEN', 'TWILIO_FROM');
const SMS_LIVE = SMS_AT || SMS_TWILIO;
async function sendSMS(to, message) {
  try {
    if (SMS_AT) {
      const body = new URLSearchParams({ username: env.AT_USERNAME, to, message });
      if (env.AT_SENDER_ID) body.set('from', env.AT_SENDER_ID);
      const r = await fetch('https://api.africastalking.com/version1/messaging', {
        method: 'POST',
        headers: { apiKey: env.AT_API_KEY, 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
        body,
      });
      return { sent: true, provider: 'africastalking', resp: await r.json().catch(() => ({})) };
    }
    if (SMS_TWILIO) {
      const body = new URLSearchParams({ To: to, From: env.TWILIO_FROM, Body: message });
      const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_SID}/Messages.json`, {
        method: 'POST',
        headers: { Authorization: 'Basic ' + Buffer.from(`${env.TWILIO_SID}:${env.TWILIO_TOKEN}`).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });
      return { sent: true, provider: 'twilio', resp: await r.json().catch(() => ({})) };
    }
  } catch (e) { console.error('SMS error', e.message); return { error: e.message }; }
  console.log(`📱 [SANDBOX SMS] to=${to} | ${message}`);
  return { sandbox: true };
}

/* ---------------- PAYMENTS (Flutterwave) ---------------- */
const PAY_LIVE = has('FLW_SECRET_KEY');
async function initPayment({ amount, email, phone, name, reference, redirectUrl, method }) {
  if (!PAY_LIVE) {
    console.log(`💳 [SANDBOX PAYMENT] ${amount} UGX ref=${reference}`);
    return { sandbox: true, reference, status: 'sandbox',
      message: 'Sandbox mode — add FLW_SECRET_KEY to .env for live MoMo/card checkout.' };
  }
  const r = await fetch('https://api.flutterwave.com/v3/payments', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.FLW_SECRET_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tx_ref: reference, amount, currency: env.FLW_CURRENCY || 'UGX',
      redirect_url: redirectUrl,
      payment_options: method === 'card' ? 'card' : 'mobilemoneyuganda,card',
      customer: { email, phonenumber: phone, name },
      customizations: { title: 'EcoCycle', description: 'Waste service payment' },
    }),
  });
  const data = await r.json();
  return { live: true, reference, status: data.status, link: data?.data?.link, raw: data };
}
async function verifyPayment(transactionId) {
  if (!PAY_LIVE) return { sandbox: true, status: 'successful' };
  const r = await fetch(`https://api.flutterwave.com/v3/transactions/${transactionId}/verify`, {
    headers: { Authorization: `Bearer ${env.FLW_SECRET_KEY}` },
  });
  return r.json();
}

/* ---------------- GOOGLE OAuth (verify ID token) ---------------- */
const GOOGLE_LIVE = has('GOOGLE_CLIENT_ID');
let googleClient = null;
if (GOOGLE_LIVE) { const { OAuth2Client } = require('google-auth-library'); googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID); }
async function verifyGoogle(idToken) {
  if (!GOOGLE_LIVE) return { sandbox: true };
  const ticket = await googleClient.verifyIdToken({ idToken, audience: env.GOOGLE_CLIENT_ID });
  const p = ticket.getPayload();
  return { email: p.email, name: p.name, picture: p.picture, sub: p.sub, verified: p.email_verified };
}

const status = {
  email: EMAIL_LIVE ? 'live' : 'sandbox',
  sms: SMS_LIVE ? (SMS_AT ? 'live (africastalking)' : 'live (twilio)') : 'sandbox',
  payments: PAY_LIVE ? 'live' : 'sandbox',
  google: GOOGLE_LIVE ? 'live' : 'sandbox',
};

module.exports = { sendEmail, sendSMS, initPayment, verifyPayment, verifyGoogle, status,
  flags: { EMAIL_LIVE, SMS_LIVE, PAY_LIVE, GOOGLE_LIVE } };
