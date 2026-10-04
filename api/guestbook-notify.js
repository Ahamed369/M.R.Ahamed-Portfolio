/**
 * Optional Guestbook owner notification for Vercel (v10.3).
 *
 * Sends M.R. Ahamed a private email when someone signs the Guestbook.
 * The visitor's email is used ONLY as the reply-to address of this message —
 * it is never stored, logged or shown in the public guestbook.
 *
 * Setup (all optional — without them the guestbook still works, it just skips the email):
 *   1. Vercel → Project → Settings → Environment Variables:
 *        RESEND_API_KEY       your Resend API key (https://resend.com)
 *        GUESTBOOK_NOTIFY_TO  the inbox that should receive the notifications
 *        GUESTBOOK_NOTIFY_FROM (optional) a verified sender, e.g. "Portfolio <guestbook@yourdomain.com>"
 *   2. In src/data/portfolio.ts set integrations.guestbookNotify = true.
 *
 * Returns { ok: true } only when the email provider accepted the message.
 */
const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]{2,}$/;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'POST only' });
  const key = process.env.RESEND_API_KEY;
  const to = process.env.GUESTBOOK_NOTIFY_TO;
  if (!key || !to) return res.status(503).json({ ok: false, error: 'Notifications not configured' });
  try {
    const { name = '', email = '', message = '', mood = '', at = Date.now() } = req.body || {};
    if (typeof name !== 'string' || typeof message !== 'string' || !name.trim() || !message.trim()) return res.status(400).json({ ok: false, error: 'Missing name or message' });
    if (name.length > 80 || message.length > 2000) return res.status(400).json({ ok: false, error: 'Too long' });
    const reply = typeof email === 'string' && email.length <= 254 && EMAIL_RE.test(email.trim()) ? email.trim() : '';
    const when = new Date(Number(at) || Date.now()).toUTCString();
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.GUESTBOOK_NOTIFY_FROM || 'Portfolio Guestbook <onboarding@resend.dev>',
        to: [to],
        ...(reply ? { reply_to: reply } : {}),
        subject: `New guestbook message from ${name.trim().slice(0, 60)}`,
        text: `${name.trim()} signed your guestbook ${mood ? `(${mood}) ` : ''}on ${when}:\n\n${message.trim()}\n\n${reply ? `Reply to: ${reply}` : 'No email was left.'}`,
        html: `<p><b>${esc(name.trim())}</b> signed your guestbook ${mood ? `(${esc(mood)}) ` : ''}on ${esc(when)}:</p><blockquote>${esc(message.trim()).replace(/\n/g, '<br>')}</blockquote><p>${reply ? `Reply to: ${esc(reply)}` : 'No email was left.'}</p>`,
      }),
    });
    if (!r.ok) return res.status(502).json({ ok: false, error: 'Email provider rejected the message' });
    return res.status(200).json({ ok: true });
  } catch {
    return res.status(500).json({ ok: false, error: 'Notification failed' });
  }
}
