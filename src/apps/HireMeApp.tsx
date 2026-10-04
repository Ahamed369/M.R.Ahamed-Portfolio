import { useMemo, useState, type FormEvent } from 'react';
import { QRSheet } from '../components/QRCode';
import { vcard } from '../components/ios/IOSControlCentre';
import { DragBar, Lights } from '../components/Window';
import { AppIcon, type IconName } from '../components/AppIcons';
import { allSkills, cv, education, integrations, personal, projects, socials, spokenLanguages } from '../data/portfolio';
import { useWM } from '../system/WindowManager';
import { notify, openExternal } from '../system/notify';
import { deepLink, sharePortfolio } from '../system/share';
import { t } from '../system/i18n';
import type { AppProps } from '../components/Desktop';
import { SysIcon } from '../components/SysIcons';

/* ───────────────────────── Book a Call ─────────────────────────
 * With integrations.bookingUrl set (Calendly etc.) the button opens it.
 * Otherwise the visitor picks a slot, and the request goes out by email or
 * WhatsApp with an .ics calendar invite they can download.
 */
const pad = (n: number) => String(n).padStart(2, '0');
function icsDate(d: Date) {
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
}
function nextWeekday(add = 1) {
  const d = new Date();
  d.setDate(d.getDate() + add);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function BookCall({ compact }: { compact?: boolean }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [date, setDate] = useState(nextWeekday);
  const [time, setTime] = useState('10:00');
  const [len, setLen] = useState('30');
  const [topic, setTopic] = useState('Internship opportunity');
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');
  const [sent, setSent] = useState(false);

  if (integrations.bookingUrl) {
    return (
      <div className="hm-book">
        <p>Pick a time that suits you on my booking page.</p>
        <button type="button" className="hm-btn primary" onClick={() => openExternal(integrations.bookingUrl, { app: 'Calendar', icon: 'calendar', title: 'Opening booking page' })}>
          <SysIcon n="calendar" size={15} /> {t('bookCall')}
        </button>
      </div>
    );
  }

  const build = () => {
    const start = new Date(`${date}T${time}:00`);
    const end = new Date(start.getTime() + Number(len) * 60000);
    const when = `${start.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} at ${start.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })} (your time, ${len} min)`;
    const body = `Hi ${personal.name},\n\nI'd like to book a ${len}-minute call about: ${topic}.\nProposed time: ${when}\n${note ? `\nNotes: ${note}\n` : ''}\n— ${name}${email ? `\nReply to: ${email}` : ''}`;
    return { start, end, when, body };
  };
  const validate = () => {
    if (!name.trim()) return 'Please add your name.';
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'That email address doesn’t look right.';
    const start = new Date(`${date}T${time}:00`);
    if (Number.isNaN(start.getTime())) return 'Please choose a date and time.';
    if (start.getTime() < Date.now()) return 'Please choose a time in the future.';
    return '';
  };
  const ics = () => {
    const { start, end, body } = build();
    const txt = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//MR Ahamed Portfolio//Book a Call//EN',
      'BEGIN:VEVENT',
      `UID:${Date.now()}@mr-ahamed-portfolio`,
      `DTSTAMP:${icsDate(new Date())}`,
      `DTSTART:${icsDate(start)}`,
      `DTEND:${icsDate(end)}`,
      `SUMMARY:Call with ${personal.name} — ${topic}`,
      `DESCRIPTION:${body.replace(/\n/g, '\\n')}`,
      `ORGANIZER;CN=${personal.name}:mailto:${personal.email}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');
    const url = URL.createObjectURL(new Blob([txt], { type: 'text/calendar' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'call-with-mr-ahamed.ics';
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
  };
  const send = (via: 'mail' | 'whatsapp', e?: FormEvent) => {
    e?.preventDefault();
    const v = validate();
    setErr(v);
    if (v) return;
    const { body } = build();
    if (via === 'mail') window.location.href = `mailto:${personal.email}?subject=${encodeURIComponent(`Call request — ${topic}`)}&body=${encodeURIComponent(body)}`;
    else window.open(`${socials.whatsapp}?text=${encodeURIComponent(body)}`, '_blank', 'noopener,noreferrer');
    setSent(true);
    notify({ app: 'Calendar', icon: 'calendar', title: 'Call request ready', body: `Your request is opening in ${via === 'mail' ? 'your email app' : 'WhatsApp'} — press Send there.` });
  };

  return (
    <form className={`hm-book ${compact ? 'compact' : ''}`} onSubmit={(e) => send('mail', e)} noValidate>
      <div className="hm-book-grid">
        <label>
          <span>Your name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Recruiter" autoComplete="name" />
        </label>
        <label>
          <span>Email (optional)</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" autoComplete="email" />
        </label>
        <label>
          <span>Date</span>
          <input type="date" value={date} min={nextWeekday(0)} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label>
          <span>Time</span>
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </label>
        <label>
          <span>Length</span>
          <select value={len} onChange={(e) => setLen(e.target.value)}>
            <option value="15">15 minutes</option>
            <option value="30">30 minutes</option>
            <option value="45">45 minutes</option>
            <option value="60">1 hour</option>
          </select>
        </label>
        <label>
          <span>Topic</span>
          <select value={topic} onChange={(e) => setTopic(e.target.value)}>
            <option>Internship opportunity</option>
            <option>Interview</option>
            <option>Project collaboration</option>
            <option>Freelance work</option>
            <option>Just saying hello</option>
          </select>
        </label>
      </div>
      <label className="hm-book-note">
        <span>Notes</span>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Anything I should prepare?" rows={2} />
      </label>
      {err && (
        <div className="hm-err" role="alert">
          {err}
        </div>
      )}
      <div className="hm-book-actions">
        <button type="submit" className="hm-btn primary">
          <SysIcon n="mail" size={15} /> Request by Email
        </button>
        <button type="button" className="hm-btn" onClick={() => send('whatsapp')}>
          <SysIcon n="message" size={15} /> Request on WhatsApp
        </button>
        <button type="button" className="hm-btn" onClick={() => (validate() ? setErr(validate()) : ics())}>
          <SysIcon n="download" size={15} /> Download invite (.ics)
        </button>
      </div>
      {sent && <p className="hm-ok">Thanks! I’ll confirm the time as soon as I see your message.</p>}
    </form>
  );
}

/* ───────────────────────── Hire Me ───────────────────────── */

const TOP = ['healthforge', 'highstreet', 'ndi', 'fidenz', 'restaurant-pos', 'freshmart'];

export default function HireMeApp({ win }: AppProps) {
  const wm = useWM();
  const [tab, setTab] = useState<'overview' | 'book'>(win.args?.tab === 'book' ? 'book' : 'overview');
  const [qr, setQr] = useState(false);
  const top = useMemo(() => TOP.map((id) => projects.find((p) => p.id === id)).filter(Boolean) as typeof projects, []);
  const edu = education[0];
  const contact: { icon: IconName; label: string; sub: string; go: () => void }[] = [
    { icon: 'mail', label: t('emailMe'), sub: personal.email, go: () => wm.open('mail', { compose: '1' }) },
    { icon: 'whatsapp', label: 'WhatsApp', sub: personal.phone, go: () => openExternal(socials.whatsapp, { app: 'WhatsApp', icon: 'whatsapp', title: 'Opening WhatsApp chat' }) },
    { icon: 'phone', label: 'Call', sub: personal.phone, go: () => (window.location.href = personal.phoneHref) },
    { icon: 'linkedin', label: 'LinkedIn', sub: 'M.R. Ahamed', go: () => openExternal(socials.linkedin, { app: 'LinkedIn', icon: 'linkedin', title: 'Opening LinkedIn' }) },
    { icon: 'github', label: 'GitHub', sub: `@${socials.githubHandle}`, go: () => openExternal(socials.github, { app: 'GitHub', icon: 'github', title: 'Opening GitHub' }) },
    { icon: 'maps', label: 'View on Map', sub: personal.location, go: () => wm.open('maps') },
  ];
  return (
    <div className="hm">
      {qr && <QRSheet title={`${personal.name} — Contact Card`} text={vcard()} caption="Scan with a phone camera to save his phone, email and portfolio link." onClose={() => setQr(false)} />}
      <DragBar className="hm-bar">
        <Lights />
        <div className="hm-seg" role="tablist">
          <button type="button" role="tab" aria-selected={tab === 'overview'} className={tab === 'overview' ? 'on' : ''} onClick={() => setTab('overview')}>
            Overview
          </button>
          <button type="button" role="tab" aria-selected={tab === 'book'} className={tab === 'book' ? 'on' : ''} onClick={() => setTab('book')}>
            {t('bookCall')}
          </button>
        </div>
        <button type="button" className="hm-share" onClick={() => void sharePortfolio({ url: deepLink('hireme') })} title="Share">
          <AppIcon name="share" />
        </button>
      </DragBar>
      <div className="hm-scroll scroll-smooth fade-swap" key={tab}>
        {tab === 'book' ? (
          <section className="hm-sec">
            <h2>
              <SysIcon n="calendar" size={20} /> {t('bookCall')}
            </h2>
            <p className="hm-muted">Choose a time (shown in your time zone — I’m in Sri Lanka, UTC+05:30). The request is sent to me by email or WhatsApp.</p>
            <BookCall />
          </section>
        ) : (
          <>
            <header className="hm-hero">
              <img src={personal.photo} alt={personal.name} className="hm-photo" />
              <div className="hm-hero-text">
                <span className="hm-status">
                  <i /> {t('availableFor')}
                </span>
                <h1>{personal.name}</h1>
                <p>{personal.headline}</p>
                <p className="hm-muted">
                  <SysIcon n="location" size={13} /> {personal.location} · <SysIcon n="graduation" size={13} /> {edu.qualification} ({edu.period})
                </p>
                <div className="hm-cta">
                  <a className="hm-btn primary" href={cv.url} download={cv.fileName}>
                    <SysIcon n="download" size={15} /> {t('downloadCv')}
                  </a>
                  <button type="button" className="hm-btn" onClick={() => setTab('book')}>
                    <SysIcon n="calendar" size={15} /> {t('bookCall')}
                  </button>
                  <button type="button" className="hm-btn" onClick={() => wm.open('mail', { compose: '1' })}>
                    <SysIcon n="mail" size={15} /> {t('emailMe')}
                  </button>
                  <button type="button" className="hm-btn" onClick={() => wm.open('askai')}>
                    <SysIcon n="sparkles" size={15} /> Ask Me AI
                  </button>
                  <button type="button" className="hm-btn" onClick={() => setQr(true)}>
                    ▦ Contact QR Code
                  </button>
                  <button type="button" className="hm-btn" onClick={() => void navigator.clipboard?.writeText(`${personal.name}\n${personal.email}\n${personal.phone}\n${socials.portfolio}`).then(() => notify({ app: 'Hire Me', icon: 'hireme', title: 'Contact details copied', silent: true })).catch(() => notify({ app: 'Hire Me', icon: 'hireme', title: 'Couldn’t copy', body: 'Your browser blocked the clipboard.' }))}>
                    ⧉ Copy Contact
                  </button>
                </div>
              </div>
            </header>

            <section className="hm-sec">
              <h2>Why me — in 30 seconds</h2>
              <ul className="hm-why">
                <li>
                  <b>Full-stack builder.</b> {projects.length} projects across web, mobile, desktop and APIs — PHP/MySQL, Node.js/Express/MongoDB, React, Java (Android & Swing) and Python.
                </li>
                <li>
                  <b>Security-aware.</b> JWT, role-based access, password hashing, Auth0 — and an authorised academic security assessment.
                </li>
                <li>
                  <b>Business sense.</b> Founder / co-founder experience: client communication, requirements analysis and negotiation.
                </li>
                <li>
                  <b>Languages.</b> {spokenLanguages.map((l) => l.name).join(', ')} — professional working proficiency.
                </li>
              </ul>
            </section>

            <section className="hm-sec">
              <h2>Top projects</h2>
              <div className="hm-projects">
                {top.map((p) => (
                  <button key={p.id} type="button" className="hm-proj" style={{ ['--c' as string]: p.preview.accent }} onClick={() => wm.open('casestudies', { project: p.id })}>
                    <span className="hm-proj-bar" />
                    <b>{p.name}</b>
                    <span>{p.category}</span>
                    <small>{Object.values(p.stack).flat().slice(0, 4).join(' · ')}</small>
                    <i>Read case study →</i>
                  </button>
                ))}
              </div>
            </section>

            <section className="hm-sec">
              <h2>Skills</h2>
              <div className="hm-tags">
                {allSkills.slice(0, 28).map((s) => (
                  <span key={s}>{s}</span>
                ))}
              </div>
            </section>

            <section className="hm-sec">
              <h2>Get in touch</h2>
              <div className="hm-contact">
                {contact.map((c) => (
                  <button key={c.label} type="button" className="hm-c" onClick={c.go}>
                    <AppIcon name={c.icon} />
                    <span>
                      <b>{c.label}</b>
                      <small>{c.sub}</small>
                    </span>
                  </button>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
