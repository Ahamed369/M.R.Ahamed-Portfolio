import { useState } from 'react';
import { DragBar, Lights } from '../components/Window';
import { LoginGate } from '../components/LoginGate';
import { cv, education, personal, socials, spokenLanguages, ventures } from '../data/portfolio';
import { usePersisted, uid } from '../system/useStore';
import { notify } from '../system/notify';
import { copyText } from '../system/share';

/**
 * v8 — Wallet: M.R. Ahamed's "passes" (contact card, education, ventures,
 * languages) plus visitor-made passes (add · edit · duplicate · reorder ·
 * delete). Opens behind a demo username + password lock screen.
 * No payment cards — this is a portfolio.
 */
interface Pass {
  id: string;
  kind: 'contact' | 'education' | 'venture' | 'languages' | 'custom';
  title: string;
  sub: string;
  lines: [string, string][];
  color: string;
  color2: string;
  mine?: boolean;
}

const BUILT: Pass[] = [
  {
    id: 'contact',
    kind: 'contact',
    title: personal.name,
    sub: personal.shortTitle,
    lines: [
      ['Email', personal.email],
      ['Phone', personal.phone],
      ['Location', personal.location],
      ['Status', personal.status],
    ],
    color: '#0a84ff',
    color2: '#5e5ce6',
  },
  ...education.slice(0, 3).map<Pass>((e, i) => ({
    id: `edu-${e.id}`,
    kind: 'education',
    title: e.qualification,
    sub: e.institution,
    lines: [
      ['Period', e.period],
      ['Location', e.location ?? '—'],
    ],
    color: ['#1d4ed8', '#7c3aed', '#0f766e'][i] ?? '#1d4ed8',
    color2: ['#0b1f5c', '#3b0764', '#064e3b'][i] ?? '#0b1f5c',
  })),
  ...ventures.map<Pass>((v, i) => ({
    id: `v-${v.id}`,
    kind: 'venture',
    title: v.company,
    sub: v.role,
    lines: [['Duration', v.duration]],
    color: ['#f59e0b', '#dc2626', '#059669', '#6b7280'][i % 4],
    color2: ['#92400e', '#7f1d1d', '#064e3b', '#1f2937'][i % 4],
  })),
  {
    id: 'langs',
    kind: 'languages',
    title: 'Languages',
    sub: spokenLanguages.map((l) => l.name).join(' · '),
    lines: spokenLanguages.map((l) => [l.name, l.level] as [string, string]),
    color: '#ec4899',
    color2: '#831843',
  },
];

const COLORS: [string, string][] = [
  ['#34c759', '#0b6b2a'],
  ['#ff9f0a', '#8a4b00'],
  ['#af52de', '#4b1869'],
  ['#ff375f', '#7d0f25'],
  ['#64d2ff', '#0b4f6c'],
  ['#8e8e93', '#2c2c2e'],
];

function vcard() {
  const v = ['BEGIN:VCARD', 'VERSION:3.0', `FN:${personal.name}`, `TITLE:${personal.shortTitle}`, `EMAIL;TYPE=INTERNET:${personal.email}`, `TEL;TYPE=CELL:${personal.phone.replace(/\s/g, '')}`, `ADR;TYPE=HOME:;;;Kandy;;;Sri Lanka`, `URL:${socials.github}`, `URL:${socials.linkedin}`, 'END:VCARD'].join('\r\n');
  const url = URL.createObjectURL(new Blob([v], { type: 'text/vcard' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'M.R. Ahamed.vcf';
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function Wallet({ lock }: { lock: () => void }) {
  const [mine, setMine] = usePersisted<Pass[]>('mra-wallet-v8', []);
  const [hidden, setHidden] = usePersisted<string[]>('mra-wallet-hidden', []);
  const [open, setOpen] = useState<string | null>(null);
  const [form, setForm] = useState<{ id?: string; title: string; sub: string; note: string; c: number } | null>(null);
  const passes = [...BUILT.filter((p) => !hidden.includes(p.id)), ...mine];
  const cur = passes.find((p) => p.id === open);

  const save = () => {
    if (!form || !form.title.trim()) return;
    const [c1, c2] = COLORS[form.c % COLORS.length];
    const p: Pass = { id: form.id ?? uid('p'), kind: 'custom', title: form.title.trim(), sub: form.sub.trim(), lines: form.note.trim() ? [['Note', form.note.trim()]] : [], color: c1, color2: c2, mine: true };
    setMine((l) => (form.id ? l.map((x) => (x.id === form.id ? p : x)) : [...l, p]));
    notify({ app: 'Wallet', icon: 'wallet', title: form.id ? 'Pass updated' : 'Pass added', body: p.title });
    setForm(null);
    setOpen(p.id);
  };
  const del = (p: Pass) => {
    if (p.mine) setMine((l) => l.filter((x) => x.id !== p.id));
    else setHidden((h) => [...h, p.id]);
    setOpen(null);
    notify({ app: 'Wallet', icon: 'wallet', title: 'Pass removed', body: p.mine ? p.title : `${p.title} — restore it from “Show hidden passes”.` });
  };
  const move = (p: Pass, d: -1 | 1) => setMine((l) => {
    const i = l.findIndex((x) => x.id === p.id);
    const j = i + d;
    if (i < 0 || j < 0 || j >= l.length) return l;
    const n = [...l];
    [n[i], n[j]] = [n[j], n[i]];
    return n;
  });

  return (
    <div className="wl">
      <DragBar className="wl-bar">
        <Lights />
        <span className="wl-title">Wallet</span>
        <button type="button" className="wl-btn" onClick={() => setForm({ title: '', sub: '', note: '', c: mine.length })}>
          ＋ Add Pass
        </button>
        {hidden.length > 0 && (
          <button type="button" className="wl-btn" onClick={() => setHidden([])}>
            Show hidden passes ({hidden.length})
          </button>
        )}
        <button type="button" className="wl-btn" onClick={lock}>
          🔒 Lock
        </button>
      </DragBar>
      <div className="wl-body">
        <div className="wl-stack scroll-smooth">
          {passes.map((p, i) => (
            <button
              key={p.id}
              type="button"
              className={`wl-card ${open === p.id ? 'on' : ''}`}
              style={{ ['--c1' as string]: p.color, ['--c2' as string]: p.color2, ['--i' as string]: i }}
              onClick={() => setOpen(open === p.id ? null : p.id)}
              onContextMenu={(e) => {
                e.preventDefault();
                setOpen(p.id);
              }}
            >
              <span className="wl-kind">{p.kind === 'contact' ? 'CONTACT' : p.kind === 'education' ? 'EDUCATION' : p.kind === 'venture' ? 'EXPERIENCE' : p.kind === 'languages' ? 'LANGUAGES' : 'PASS'}</span>
              <b>{p.title}</b>
              <small>{p.sub}</small>
            </button>
          ))}
          {passes.length === 0 && <p className="wl-empty">No passes — add one or show hidden passes.</p>}
        </div>
        <section className="wl-detail">
          {form ? (
            <div className="wl-form">
              <h3>{form.id ? 'Edit pass' : 'New pass'}</h3>
              <label>
                <span>Title</span>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={40} autoFocus placeholder="e.g. Hackathon ticket" />
              </label>
              <label>
                <span>Subtitle</span>
                <input value={form.sub} onChange={(e) => setForm({ ...form, sub: e.target.value })} maxLength={50} placeholder="e.g. Kandy · 12 Oct" />
              </label>
              <label>
                <span>Note</span>
                <textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} rows={3} maxLength={200} />
              </label>
              <div className="wl-colors">
                {COLORS.map(([c], i) => (
                  <button key={c} type="button" style={{ background: c }} className={form.c % COLORS.length === i ? 'on' : ''} onClick={() => setForm({ ...form, c: i })} aria-label={`Colour ${i + 1}`} />
                ))}
              </div>
              <p className="wl-warn">Demo passes only — please don’t store card numbers or passwords.</p>
              <div className="wl-row">
                <button type="button" className="wl-btn primary" onClick={save} disabled={!form.title.trim()}>
                  Save
                </button>
                <button type="button" className="wl-btn" onClick={() => setForm(null)}>
                  Cancel
                </button>
              </div>
            </div>
          ) : cur ? (
            <div className="wl-open" style={{ ['--c1' as string]: cur.color, ['--c2' as string]: cur.color2 }}>
              <div className="wl-big">
                <span className="wl-kind">{cur.kind.toUpperCase()}</span>
                <h2>{cur.title}</h2>
                <p>{cur.sub}</p>
                <dl>
                  {cur.lines.map(([k, v]) => (
                    <div key={k}>
                      <dt>{k}</dt>
                      <dd>{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
              <div className="wl-row wrap">
                {cur.kind === 'contact' && (
                  <>
                    <button type="button" className="wl-btn primary" onClick={vcard}>
                      Add to Contacts (.vcf)
                    </button>
                    <a className="wl-btn" href={cv.url} download={cv.fileName}>
                      Download CV
                    </a>
                  </>
                )}
                <button type="button" className="wl-btn" onClick={() => void copyText(`${cur.title} — ${cur.sub}\n${cur.lines.map(([k, v]) => `${k}: ${v}`).join('\n')}`).then(() => notify({ app: 'Wallet', icon: 'wallet', title: 'Pass copied' }))}>
                  Copy
                </button>
                {cur.mine && (
                  <>
                    <button type="button" className="wl-btn" onClick={() => setForm({ id: cur.id, title: cur.title, sub: cur.sub, note: cur.lines[0]?.[1] ?? '', c: Math.max(0, COLORS.findIndex(([c]) => c === cur.color)) })}>
                      Edit
                    </button>
                    <button type="button" className="wl-btn" onClick={() => setMine((l) => [...l, { ...cur, id: uid('p'), title: `${cur.title} copy` }])}>
                      Duplicate
                    </button>
                    <button type="button" className="wl-btn" onClick={() => move(cur, -1)}>
                      ↑ Move up
                    </button>
                    <button type="button" className="wl-btn" onClick={() => move(cur, 1)}>
                      ↓ Move down
                    </button>
                  </>
                )}
                <button type="button" className="wl-btn danger" onClick={() => del(cur)}>
                  {cur.mine ? 'Delete' : 'Hide'}
                </button>
              </div>
            </div>
          ) : (
            <div className="wl-hint">
              <span>👛</span>
              <p>Select a pass to open it.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default function WalletApp() {
  return (
    <LoginGate id="wallet" title="Wallet" icon="wallet">
      {(lock) => <Wallet lock={lock} />}
    </LoginGate>
  );
}
