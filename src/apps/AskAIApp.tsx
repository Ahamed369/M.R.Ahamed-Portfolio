import { useEffect, useRef, useState, type FormEvent } from 'react';
import { DragBar, Lights } from '../components/Window';
import { AppIcon } from '../components/AppIcons';
import { allSkills, cv, education, leadership, personal, projects, projectsUsing, socials, spokenLanguages, ventures, type Project } from '../data/portfolio';
import { caseStudyById } from '../data/caseStudies';
import { useWM } from '../system/WindowManager';
import { usePersisted, uid } from '../system/useStore';
import { copyText } from '../system/share';
import type { AppId } from '../system/types';

/**
 * v8 — "Ask Me AI": an on-device assistant that answers questions about
 * M.R. Ahamed using only the portfolio data (no API key, nothing is sent to
 * an AI service). It matches intents and project / skill names, and says so
 * when something isn't in the portfolio instead of guessing.
 */
interface Msg {
  id: string;
  from: 'me' | 'ai';
  text: string;
  actions?: { label: string; app?: AppId; args?: Record<string, string>; href?: string }[];
  t: number;
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9+#.\s-]/g, ' ');

function findProject(q: string): Project | undefined {
  const n = norm(q);
  return projects.find((p) => n.includes(p.name.toLowerCase()) || n.includes(p.id) || p.name.toLowerCase().split(' ').filter((w) => w.length > 4).some((w) => n.includes(w)));
}

function findSkill(q: string): string | undefined {
  const n = ` ${norm(q)} `;
  const sorted = [...allSkills].sort((a, b) => b.length - a.length);
  return sorted.find((s) => {
    const k = s.toLowerCase();
    return k.length > 1 && (n.includes(` ${k} `) || n.includes(` ${k}?`) || n.includes(` ${k},`));
  });
}

function answer(q: string): Omit<Msg, 'id' | 't' | 'from'> {
  const n = norm(q);
  const has = (...w: string[]) => w.some((x) => n.includes(x));
  const p = findProject(q);

  if (p && !has('all projects', 'list')) {
    const cs = caseStudyById(p.id);
    const tech = Object.values(p.stack).flat().slice(0, 8).join(', ');
    return {
      text: `**${p.name}** — ${p.category}${p.period ? ` (${p.period})` : ''}.\n\n${p.description}\n\n${cs ? `Problem it solves: ${cs.problem}\n\n` : ''}Built with: ${tech}.${p.repo ? '\n\nThe code is public on GitHub.' : ''}`,
      actions: [{ label: 'Read the case study', app: 'casestudies', args: { project: p.id } }, ...(p.repo ? [{ label: 'View on GitHub', href: p.repo }] : []), { label: 'Open in Xcode', app: 'xcode' as AppId, args: { project: p.id } }],
    };
  }
  if (has('hello', 'hi ', 'hey', 'good morning', 'good evening') && n.length < 24) {
    return { text: `Hi! 👋 I’m an assistant that knows ${personal.name}’s portfolio. Ask about his projects, skills, experience, education or how to contact him.` };
  }
  if (has('hire', 'internship', 'available', 'availability', 'job', 'recruit', 'open to', 'work with')) {
    return {
      text: `${personal.name} is **${personal.status.toLowerCase()}**. ${personal.objective}\n\nHe’s based in ${personal.location} (UTC+05:30) and can be reached at ${personal.email} or ${personal.phone}.`,
      actions: [{ label: 'Hire Me', app: 'hireme' }, { label: 'Book a call', app: 'hireme', args: { tab: 'book' } }, { label: 'Download CV', href: cv.url }],
    };
  }
  if (has('contact', 'email', 'phone', 'call', 'reach', 'whatsapp', 'number')) {
    return {
      text: `📧 ${personal.email}\n📞 ${personal.phone}\n💬 WhatsApp: ${personal.phone}\n🔗 LinkedIn and GitHub (@${socials.githubHandle}) are linked below.`,
      actions: [{ label: 'Write an email', app: 'mail', args: { compose: '1' } }, { label: 'WhatsApp', href: socials.whatsapp }, { label: 'LinkedIn', href: socials.linkedin }],
    };
  }
  if (has('cv', 'resume', 'résumé', 'curriculum')) {
    return { text: `You can read the CV in Preview or download the PDF (${cv.fileName}).`, actions: [{ label: 'Open CV', app: 'preview' }, { label: 'Download PDF', href: cv.url }] };
  }
  const skill = findSkill(q);
  if (skill && has('know', 'use', 'skill', 'experience with', 'work with', 'can he', 'does he', 'familiar', 'used', skill.toLowerCase())) {
    const used = projectsUsing(skill);
    return {
      text: used.length
        ? `Yes — **${skill}** is part of his toolkit and appears in ${used.length} project${used.length === 1 ? '' : 's'}: ${used.map((x) => x.name).join(', ')}.`
        : `**${skill}** is listed among his skills, but none of the portfolio projects uses it directly.`,
      actions: [...used.slice(0, 3).map((x) => ({ label: x.name, app: 'casestudies' as AppId, args: { project: x.id } })), { label: 'All skills', app: 'notes' as AppId }],
    };
  }
  if (has('skill', 'tech', 'stack', 'language', 'framework', 'good at', 'know')) {
    if (has('speak', 'spoken', 'sinhala', 'tamil', 'english')) {
      return { text: `He speaks ${spokenLanguages.map((l) => `${l.name} (${l.level})`).join(', ')}.` };
    }
    return {
      text: `Core strengths: Java, Python, JavaScript, React and Node.js, plus PHP/MySQL, MongoDB, REST APIs, authentication (JWT, Auth0) and security testing.\n\nFull list: ${allSkills.slice(0, 30).join(', ')}…`,
      actions: [{ label: 'Skills in Notes', app: 'notes' }],
    };
  }
  if (has('project', 'built', 'portfolio', 'work', 'apps', 'best')) {
    const best = projects.slice(0, 4);
    return {
      text: `He has built ${projects.length} projects across web, mobile, desktop and APIs:\n\n${projects.map((x) => `• **${x.name}** — ${x.category}`).join('\n')}\n\nA good place to start: ${best.map((x) => x.name).join(', ')}.`,
      actions: [{ label: 'Case Studies', app: 'casestudies' }, { label: 'Projects in Xcode', app: 'xcode' }],
    };
  }
  if (has('education', 'study', 'studies', 'degree', 'university', 'uni', 'sliit', 'school', 'college')) {
    return {
      text: education.map((e) => `• **${e.qualification}** — ${e.institution} (${e.period})`).join('\n'),
      actions: [{ label: 'Education folder', app: 'finder', args: { folder: 'education' } }],
    };
  }
  if (has('experience', 'business', 'founder', 'venture', 'company', 'career')) {
    return {
      text: `Alongside his studies he has entrepreneurial experience:\n\n${ventures.map((v) => `• **${v.role}**, ${v.company} (${v.duration})`).join('\n')}\n\nThat work built client communication, requirements analysis and negotiation skills.`,
      actions: [{ label: 'Experience folder', app: 'finder', args: { folder: 'all' } }],
    };
  }
  if (has('leader', 'society', 'club', 'representative', 'sport', 'extracurricular')) {
    return { text: leadership.map((l) => `• ${l.role} — ${l.org} (${l.period})`).join('\n') };
  }
  if (has('where', 'location', 'live', 'based', 'from', 'time zone', 'timezone')) {
    return { text: `He’s based in ${personal.location} — time zone Asia/Colombo (UTC+05:30).`, actions: [{ label: 'View on Map', app: 'maps' }] };
  }
  if (has('github', 'repo', 'code', 'source')) {
    return { text: `His GitHub is @${socials.githubHandle} with ${projects.filter((x) => x.repo).length} public project repositories in this portfolio.`, actions: [{ label: 'Open GitHub', href: socials.github }, { label: 'Case Studies', app: 'casestudies' }] };
  }
  if (has('who', 'about', 'yourself', 'introduce', 'summary', 'tell me')) {
    return { text: `${personal.summary}\n\n${personal.objective}`, actions: [{ label: 'About Me', app: 'about' }] };
  }
  if (has('guestbook', 'message', 'feedback')) {
    return { text: 'You can leave a message in the Guestbook — it’s the brown book icon in Launchpad.', actions: [{ label: 'Open Guestbook', app: 'guestbook' }] };
  }
  // Fallback: free-text search over project text
  const words = n.split(/\s+/).filter((w) => w.length > 3);
  const scored = projects
    .map((x) => ({ x, s: words.filter((w) => `${x.name} ${x.description} ${x.overview} ${x.features.join(' ')}`.toLowerCase().includes(w)).length }))
    .filter((r) => r.s > 0)
    .sort((a, b) => b.s - a.s);
  if (scored.length) {
    const top = scored.slice(0, 3).map((r) => r.x);
    return { text: `I found related work: ${top.map((x) => `**${x.name}** (${x.category})`).join(', ')}.`, actions: top.map((x) => ({ label: x.name, app: 'casestudies' as AppId, args: { project: x.id } })) };
  }
  return {
    text: `I only know what’s in ${personal.name}’s portfolio, and I couldn’t find that. Try asking about his projects, skills, education, experience or availability — or email him directly.`,
    actions: [{ label: 'Email him', app: 'mail', args: { compose: '1' } }],
  };
}

const SUGGEST = ['Is he available for an internship?', 'What projects has he built?', 'Does he know React?', 'Tell me about HealthForge', 'What is his education?', 'How can I contact him?'];

function Rich({ text }: { text: string }) {
  return (
    <>
      {text.split('\n').map((line, i) => (
        <p key={i}>
          {line.split(/(\*\*[^*]+\*\*)/).map((part, j) => (part.startsWith('**') ? <b key={j}>{part.slice(2, -2)}</b> : <span key={j}>{part}</span>))}
        </p>
      ))}
    </>
  );
}

const WELCOME: Msg = { id: 'w', from: 'ai', t: 0, text: `Hi! I’m **Ask Me AI** — I answer questions about ${personal.name} using his portfolio data. What would you like to know?` };

export default function AskAIApp() {
  const wm = useWM();
  const [msgs, setMsgs] = usePersisted<Msg[]>('mra-askai-v8', [WELCOME]);
  const [q, setQ] = useState('');
  const [typing, setTyping] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), [msgs.length, typing]);

  const ask = (text: string, e?: FormEvent) => {
    e?.preventDefault();
    const v = text.trim();
    if (!v || typing !== null) return;
    setQ('');
    setMsgs((m) => [...m, { id: uid('m'), from: 'me', text: v, t: Date.now() }]);
    const a = answer(v);
    // typewriter reveal
    let i = 0;
    setTyping('');
    const step = () => {
      i = Math.min(a.text.length, i + Math.max(2, Math.round(a.text.length / 60)));
      setTyping(a.text.slice(0, i));
      if (i < a.text.length) window.setTimeout(step, 16);
      else {
        setTyping(null);
        setMsgs((m) => [...m, { id: uid('m'), from: 'ai', text: a.text, actions: a.actions, t: Date.now() }]);
      }
    };
    window.setTimeout(step, 380);
  };

  return (
    <div className="ai">
      <DragBar className="ai-bar">
        <Lights />
        <span className="ai-title">
          <AppIcon name="askai" /> Ask Me AI
        </span>
        <button type="button" className="ai-clear" onClick={() => setMsgs([WELCOME])} title="New chat">
          ✎ New chat
        </button>
      </DragBar>
      <div className="ai-scroll scroll-smooth" aria-live="polite">
        {msgs.map((m) => (
          <div key={m.id} className={`ai-msg ${m.from}`}>
            {m.from === 'ai' && (
              <span className="ai-av">
                <AppIcon name="askai" />
              </span>
            )}
            <div className="ai-bubble">
              <Rich text={m.text} />
              {m.actions && m.actions.length > 0 && (
                <div className="ai-actions">
                  {m.actions.map((a) =>
                    a.href ? (
                      <a key={a.label} href={a.href} target="_blank" rel="noopener noreferrer" className="ai-act">
                        {a.label} ↗
                      </a>
                    ) : (
                      <button key={a.label} type="button" className="ai-act" onClick={() => a.app && wm.open(a.app, a.args)}>
                        {a.label}
                      </button>
                    ),
                  )}
                </div>
              )}
              {m.from === 'ai' && m.id !== 'w' && (
                <button type="button" className="ai-copy" onClick={() => void copyText(m.text.replace(/\*\*/g, ''))} title="Copy answer">
                  Copy
                </button>
              )}
            </div>
          </div>
        ))}
        {typing !== null && (
          <div className="ai-msg ai">
            <span className="ai-av">
              <AppIcon name="askai" />
            </span>
            <div className="ai-bubble">{typing ? <Rich text={typing} /> : <span className="ai-dots"><i /><i /><i /></span>}</div>
          </div>
        )}
        <div ref={endRef} />
      </div>
      <div className="ai-suggest">
        {SUGGEST.map((s) => (
          <button key={s} type="button" onClick={() => ask(s)}>
            {s}
          </button>
        ))}
      </div>
      <form className="ai-input" onSubmit={(e) => ask(q, e)}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Ask about ${personal.name}…`} aria-label="Your question" />
        <button type="submit" disabled={!q.trim() || typing !== null} aria-label="Send">
          ↑
        </button>
      </form>
      <small className="ai-note">Answers come only from this portfolio’s data — runs in your browser, nothing is sent to an AI service.</small>
    </div>
  );
}
