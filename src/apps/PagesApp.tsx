import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type MouseEvent as RMouseEvent } from 'react';
import { cvBusinessRole, education, leadership, personal, projects, skillNotes, socials, spokenLanguages, ventures } from '../data/portfolio';
import { readStore, writeStore } from '../system/storage';
import { usePersisted } from '../system/useStore';
import { notify } from '../system/notify';
import { AppIcon } from '../components/AppIcons';

/* ───────────────────────────── Document generation ───────────────────────────── */

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const strip = (u: string) => u.replace(/^https?:\/\/(www\.)?/, '');

/** Résumé built only from src/data/portfolio.ts. */
function resumeHtml(): string {
  const contact = [
    `<a href="${esc(socials.email)}">${esc(personal.email)}</a>`,
    esc(personal.phone),
    esc(personal.location),
    `<a href="${esc(socials.github)}">${esc(strip(socials.github))}</a>`,
    `<a href="${esc(socials.linkedin)}">${esc(strip(socials.linkedin))}</a>`,
  ].join(' &nbsp;·&nbsp; ');

  const edu = education
    .map(
      (e) =>
        `<h3>${esc(e.qualification)}<span class="r">${esc(e.period)}</span></h3><p class="org">${esc(e.institution)}${e.location ? `, ${esc(e.location)}` : ''}</p>${
          e.details?.length ? `<ul>${e.details.map((d) => `<li>${esc(d)}</li>`).join('')}</ul>` : ''
        }`,
    )
    .join('');

  const proj = projects
    .map((p) => {
      const stack = Array.from(new Set([...(p.stack.frontend ?? []), ...(p.stack.backend ?? []), ...(p.stack.mobile ?? []), ...(p.stack.database ?? []), ...(p.stack.apis ?? [])]));
      return `<h3>${esc(p.name)}${p.period ? `<span class="r">${esc(p.period)}</span>` : ''}</h3><p class="org">${esc(p.category)}${p.repo ? ` · <a href="${esc(p.repo)}">${esc(strip(p.repo))}</a>` : ''}</p><p>${esc(p.description)}</p><p class="stack"><b>Stack:</b> ${esc(stack.join(', '))}</p>`;
    })
    .join('');

  const business = `<h3>${esc(cvBusinessRole.title)}<span class="r">${esc(cvBusinessRole.period)}</span></h3><p class="org">${esc(cvBusinessRole.org)}</p><ul>${cvBusinessRole.bullets.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>${ventures
    .map((v) => `<h3>${esc(v.role)} — ${esc(v.company)}<span class="r">${esc(v.duration)}</span></h3><p>${esc(v.summary)}</p>`)
    .join('')}`;

  const lead = `<ul>${leadership.map((l) => `<li><b>${esc(l.role)}</b> — ${esc(l.org)} (${esc(l.period)})</li>`).join('')}</ul>`;

  const skills = `<ul class="skills">${skillNotes
    .filter((n) => !['about', 'languages'].includes(n.id))
    .map((n) => `<li><b>${esc(n.title)}:</b> ${esc(n.tags.join(', '))}</li>`)
    .join('')}</ul>`;

  const langs = `<p>${spokenLanguages.map((l) => `<b>${esc(l.name)}</b> — ${esc(l.level)}`).join(' &nbsp;·&nbsp; ')}</p>`;

  return [
    `<h1 class="name">${esc(personal.name)}</h1>`,
    `<p class="headline">${esc(personal.headline)}</p>`,
    `<p class="contact">${contact}</p>`,
    `<h2>Profile</h2><p>${esc(personal.summary)} ${esc(personal.objective)}</p>`,
    `<h2>Education</h2>${edu}`,
    `<h2>Projects</h2>${proj}`,
    `<h2>Business Experience</h2>${business}`,
    `<h2>Leadership &amp; Activities</h2>${lead}`,
    `<h2>Technical Skills</h2>${skills}`,
    `<h2>Languages</h2>${langs}`,
  ].join('');
}

const BLANK = '<h1>Untitled</h1><p>Start typing…</p>';
const BLANK_LANDSCAPE = '<h1>Untitled</h1><p>A landscape page — great for posters, schedules and slides-style handouts.</p>';

/** Cover letter to a hiring manager — every fact comes from the portfolio data; brackets mark what to fill in. */
function coverLetterHtml(): string {
  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const edu = education[0];
  const top = projects.slice(0, 3);
  const skills = skillNotes
    .filter((n) => !['about', 'languages', 'soft'].includes(n.id))
    .flatMap((n) => n.tags)
    .slice(0, 8);
  return [
    `<div class="tpl-letter">`,
    `<p class="lh-name">${esc(personal.name)}</p>`,
    `<p class="lh-contact">${esc(personal.location)} &nbsp;·&nbsp; ${esc(personal.email)} &nbsp;·&nbsp; ${esc(personal.phone)} &nbsp;·&nbsp; <a href="${esc(socials.linkedin)}">${esc(strip(socials.linkedin))}</a></p>`,
    `<p class="date">${esc(today)}</p>`,
    `<p>Hiring Manager<br>[Company Name]<br>[Company Address]</p>`,
    `<p><b>Re: IT Internship — [Position Title]</b></p>`,
    `<p>Dear Hiring Manager,</p>`,
    `<p>I am writing to apply for the [Position Title] internship at [Company Name]. I am a ${esc(personal.headline.split('·')[0].trim())}${edu ? ` studying ${esc(edu.qualification)} at ${esc(edu.institution)}` : ''}, based in ${esc(personal.location)}.</p>`,
    `<p>${esc(personal.summary)}</p>`,
    `<p>Recent work includes ${top.map((p) => `<b>${esc(p.name)}</b> (${esc(p.category)})`).join(', ')}. Across these projects I have worked with ${esc(skills.join(', '))}.</p>`,
    `<p>${esc(personal.objective)} I would welcome the opportunity to discuss how I can contribute to your team. My portfolio and CV are available at <a href="${esc(socials.github)}">${esc(strip(socials.github))}</a>.</p>`,
    `<p>Thank you for your time and consideration.</p>`,
    `<p>Sincerely,<br><br><b>${esc(personal.name)}</b></p>`,
    `</div>`,
  ].join('');
}

/** Project report generated from one project's data. */
function projectReportHtml(id: string): string {
  const p = projects.find((x) => x.id === id) ?? projects[0];
  const stackRows = (Object.entries(p.stack) as [string, string[] | undefined][])
    .filter(([, v]) => v && v.length)
    .map(([k, v]) => `<tr><th>${esc(k[0].toUpperCase() + k.slice(1))}</th><td>${esc((v ?? []).join(', '))}</td></tr>`)
    .join('');
  return [
    `<div class="tpl-report" style="--rep:${esc(p.preview.accent)}">`,
    `<p class="kicker">Project Report · ${esc(p.category)}</p>`,
    `<h1>${esc(p.name)}</h1>`,
    `<p class="lede">${esc(p.description)}</p>`,
    `<p class="meta">${esc(personal.name)}${p.period ? ` &nbsp;·&nbsp; ${esc(p.period)}` : ''} &nbsp;·&nbsp; ${esc(p.status)}${p.repo ? ` &nbsp;·&nbsp; <a href="${esc(p.repo)}">${esc(strip(p.repo))}</a>` : ''}</p>`,
    `<h2>Overview</h2><p>${esc(p.overview)}</p>`,
    p.features.length ? `<h2>Key Features</h2><ul>${p.features.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>` : '',
    p.responsibilities?.length ? `<h2>My Responsibilities</h2><ul>${p.responsibilities.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>` : '',
    stackRows ? `<h2>Technology Stack</h2><table>${stackRows}</table>` : '',
    p.architecture ? `<h2>Architecture</h2><p>${esc(p.architecture)}</p>` : '',
    `</div>`,
  ].join('');
}

/** Certificate-style card: a reusable template; the bracketed fields are placeholders to type over. */
function certificateHtml(): string {
  return [
    `<div class="tpl-cert">`,
    `<p class="c-kicker">Certificate of Achievement</p>`,
    `<p class="c-small">This certificate is presented to</p>`,
    `<h1>[Recipient Name]</h1>`,
    `<p class="c-small">in recognition of</p>`,
    `<p class="c-for">[Achievement or course title]</p>`,
    `<div class="c-sign"><div><span>[Date]</span><em>Date</em></div><div><span>[Signature]</span><em>Signature</em></div></div>`,
    `<p class="c-note">Template · replace the bracketed text</p>`,
    `</div>`,
  ].join('');
}

/** Contact card built from the portfolio data. */
function contactCardHtml(): string {
  return [
    `<div class="tpl-card">`,
    `<div class="k-front"><h1>${esc(personal.name)}</h1><p class="k-title">${esc(personal.shortTitle)}</p><p class="k-status">${esc(personal.status)}</p></div>`,
    `<div class="k-back"><p><b>Email</b> ${esc(personal.email)}</p><p><b>Phone</b> ${esc(personal.phone)}</p><p><b>Location</b> ${esc(personal.location)}</p><p><b>GitHub</b> <a href="${esc(socials.github)}">${esc(strip(socials.github))}</a></p><p><b>LinkedIn</b> <a href="${esc(socials.linkedin)}">${esc(strip(socials.linkedin))}</a></p></div>`,
    `</div>`,
  ].join('');
}

type Category = 'Basic' | 'Reports' | 'Resumes' | 'Letters' | 'Cards';
interface TemplateDef {
  id: string;
  name: string;
  category: Category;
  landscape?: boolean;
  /** shown in the Format inspector */
  source: string;
  html: () => string;
}

const TEMPLATES: TemplateDef[] = [
  { id: 'blank', name: 'Blank', category: 'Basic', source: 'Blank', html: () => BLANK },
  { id: 'blank-landscape', name: 'Blank Landscape', category: 'Basic', landscape: true, source: 'Blank (landscape)', html: () => BLANK_LANDSCAPE },
  { id: 'resume', name: `Résumé — ${personal.name}`, category: 'Resumes', source: 'Generated from portfolio data', html: resumeHtml },
  { id: 'cover', name: 'Cover Letter', category: 'Letters', source: 'Cover letter pre-filled from portfolio data', html: coverLetterHtml },
  ...projects.map<TemplateDef>((p) => ({ id: `report-${p.id}`, name: `${p.name} Report`, category: 'Reports', source: `Project report generated from “${p.name}”`, html: () => projectReportHtml(p.id) })),
  { id: 'certificate', name: 'Certificate', category: 'Cards', landscape: true, source: 'Certificate template (placeholders)', html: certificateHtml },
  { id: 'contact-card', name: 'Contact Card', category: 'Cards', source: 'Contact card from portfolio data', html: contactCardHtml },
];
const CATEGORIES: Category[] = ['Basic', 'Reports', 'Resumes', 'Letters', 'Cards'];
const tplById = (id: string) => TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];

/** Stylesheet shared by the on-screen paper (scoped under .pg-paper) and the exported print window. */
const DOC_CSS = `
.doc{font-family:"Helvetica Neue",Helvetica,Arial,sans-serif;font-size:10.5pt;line-height:1.45;color:#1d1d1f}
.doc h1{font-size:22pt;margin:0 0 4pt;font-weight:700;letter-spacing:-.2pt}
.doc h1.name{font-size:26pt;text-align:center;margin-bottom:2pt}
.doc .headline{text-align:center;font-size:11.5pt;color:#3a3a3c;margin:0 0 4pt}
.doc .contact{text-align:center;font-size:9pt;color:#555;margin:0 0 12pt}
.doc h2{font-size:12pt;text-transform:uppercase;letter-spacing:1pt;color:#1f4e8c;border-bottom:1.2pt solid #1f4e8c;padding-bottom:2pt;margin:14pt 0 6pt}
.doc h3{font-size:10.8pt;margin:8pt 0 1pt;display:flex;justify-content:space-between;gap:12pt}
.doc h3 .r{font-weight:500;color:#555;font-size:9.5pt;white-space:nowrap}
.doc p{margin:0 0 5pt}
.doc .org{color:#555;font-style:italic;font-size:9.5pt;margin-bottom:3pt}
.doc .stack{font-size:9.3pt;color:#3a3a3c}
.doc ul{margin:2pt 0 6pt;padding-left:16pt}
.doc li{margin:0 0 2pt}
.doc a{color:#1f4e8c;text-decoration:none}
.doc .tpl-letter{font-size:11pt;line-height:1.55}
.doc .tpl-letter .lh-name{font-size:22pt;font-weight:700;margin:0;letter-spacing:-.3pt}
.doc .tpl-letter .lh-contact{font-size:9pt;color:#555;border-bottom:1.2pt solid #d4502a;padding-bottom:8pt;margin-bottom:18pt}
.doc .tpl-letter .date{color:#555;margin-bottom:12pt}
.doc .tpl-letter p{margin:0 0 9pt}
.doc .tpl-report .kicker{text-transform:uppercase;letter-spacing:1.2pt;font-size:8.5pt;font-weight:700;color:var(--rep,#1f4e8c);margin:0 0 4pt}
.doc .tpl-report h1{font-size:28pt;line-height:1.1;margin:0 0 6pt}
.doc .tpl-report .lede{font-size:12.5pt;color:#3a3a3c;margin:0 0 6pt}
.doc .tpl-report .meta{font-size:9pt;color:#666;padding-bottom:10pt;border-bottom:3pt solid var(--rep,#1f4e8c);margin-bottom:6pt}
.doc .tpl-report h2{color:var(--rep,#1f4e8c);border-color:var(--rep,#1f4e8c)}
.doc .tpl-report table{border-collapse:collapse;width:100%;font-size:9.5pt}
.doc .tpl-report th,.doc .tpl-report td{border:.8pt solid #ddd;padding:4pt 6pt;text-align:left;vertical-align:top}
.doc .tpl-report th{background:#f4f4f6;width:24%}
.doc .tpl-cert{border:6pt double #b8862b;padding:40pt 30pt;text-align:center;min-height:520px;box-sizing:border-box;background:linear-gradient(180deg,#fffdf6,#fff8e6)}
.doc .tpl-cert .c-kicker{font-family:Georgia,serif;font-size:24pt;letter-spacing:2pt;text-transform:uppercase;color:#8a6516;margin:0 0 20pt}
.doc .tpl-cert .c-small{font-style:italic;color:#666;margin:0 0 6pt}
.doc .tpl-cert h1{font-family:Georgia,serif;font-size:34pt;font-weight:400;margin:6pt 0 14pt;border-bottom:1pt solid #d9c08a;display:inline-block;padding:0 30pt 6pt}
.doc .tpl-cert .c-for{font-size:15pt;font-weight:600;margin:0 0 34pt}
.doc .tpl-cert .c-sign{display:flex;justify-content:space-around;gap:30pt}
.doc .tpl-cert .c-sign div{display:flex;flex-direction:column;min-width:160pt;border-top:1pt solid #999;padding-top:4pt}
.doc .tpl-cert .c-sign em{font-size:8.5pt;color:#888}
.doc .tpl-cert .c-note{margin-top:24pt;font-size:8pt;color:#aaa}
.doc .tpl-card{display:flex;flex-direction:column;gap:18pt;align-items:center}
.doc .tpl-card>div{width:3.5in;height:2in;box-sizing:border-box;border-radius:10pt;padding:18pt 20pt;box-shadow:0 0 0 .8pt #ddd}
.doc .tpl-card .k-front{background:linear-gradient(135deg,#1f3a5f,#2f6fb5);color:#fff;display:flex;flex-direction:column;justify-content:flex-end}
.doc .tpl-card .k-front h1{font-size:20pt;margin:0;color:#fff}
.doc .tpl-card .k-title{margin:2pt 0 0;font-size:9.5pt;opacity:.9}
.doc .tpl-card .k-status{margin:8pt 0 0;font-size:8pt;opacity:.75}
.doc .tpl-card .k-back{font-size:9pt;display:flex;flex-direction:column;justify-content:center}
.doc .tpl-card .k-back p{margin:0 0 3pt}
.doc .tpl-card .k-back b{display:inline-block;width:56pt;color:#666;font-weight:600}
`;

/* ───────────────────────────── Store ───────────────────────────── */

type Zoom = 'fit' | '75' | '100' | '125';
interface Stored {
  /** template id (see TEMPLATES) — '' shows the chooser */
  template: string;
  html: string;
  zoom: Zoom;
}
const KEY = 'mra-pages-v1';
const PAGE_W = 794; // A4 @ 96 dpi
const PAGE_H = 1123;

/* ───────────────────────────── App ───────────────────────────── */

export default function PagesApp() {
  const [store, setStore] = useState<Stored>(() => readStore<Stored>(KEY, { template: '', html: '', zoom: 'fit' }));
  const [docKey, setDocKey] = useState(0);
  const [words, setWords] = useState(0);
  const [block, setBlock] = useState('p');
  const [fontSize, setFontSize] = useState(14);
  const [inspector, setInspector] = useState(true);
  const [fit, setFit] = useState(1);
  const [saved, setSaved] = useState(true);
  const editor = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLDivElement>(null);
  const range = useRef<Range | null>(null);
  const saveT = useRef<number | undefined>(undefined);
  const resume = useMemo(resumeHtml, []);
  const [choosing, setChoosing] = useState(false);
  /* v8 — document library: Save As · Open · Rename · Duplicate · Delete */
  const [docs, setDocs] = usePersisted<{ id: string; name: string; template: string; html: string; at: number }[]>('mra-pages-docs-v8', []);
  const [lib, setLib] = useState(false);
  const [saveName, setSaveName] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const tpl = tplById(store.template);
  const pageW = tpl.landscape ? PAGE_H : PAGE_W;
  const pageH = tpl.landscape ? PAGE_W : PAGE_H;

  const persist = useCallback((patch: Partial<Stored>) => {
    setStore((s) => {
      const n = { ...s, ...patch };
      writeStore(KEY, n);
      return n;
    });
  }, []);

  const countWords = () => {
    const t = editor.current?.innerText ?? '';
    setWords(t.trim() ? t.trim().split(/\s+/).length : 0);
  };

  // load the stored HTML into the editable page whenever a document is (re)opened
  useLayoutEffect(() => {
    if (!editor.current || !store.template) return;
    editor.current.innerHTML = store.html || (store.template === 'resume' ? resume : tplById(store.template).html());
    countWords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docKey, store.template]);

  // fit-to-width zoom
  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setFit(Math.min(1, Math.max(0.3, (el.clientWidth - 40) / pageW))));
    ro.observe(el);
    return () => ro.disconnect();
  }, [store.template, choosing, pageW]);

  // remember the caret / selection inside the page so toolbar controls can restore it
  useEffect(() => {
    const onSel = () => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0 || !editor.current) return;
      const r = sel.getRangeAt(0);
      if (!editor.current.contains(r.commonAncestorContainer)) return;
      range.current = r.cloneRange();
      let n: Node | null = r.startContainer;
      if (n && n.nodeType === 3) n = n.parentNode;
      const el = n as HTMLElement | null;
      if (el) {
        const b = el.closest('h1,h2,h3,p,li');
        setBlock(b ? (b.tagName === 'LI' ? 'p' : b.tagName.toLowerCase()) : 'p');
        setFontSize(Math.round(parseFloat(getComputedStyle(el).fontSize) || 14));
      }
    };
    document.addEventListener('selectionchange', onSel);
    return () => document.removeEventListener('selectionchange', onSel);
  }, []);

  useEffect(() => () => window.clearTimeout(saveT.current), []);

  const onInput = () => {
    countWords();
    setSaved(false);
    window.clearTimeout(saveT.current);
    saveT.current = window.setTimeout(() => {
      if (editor.current) persist({ html: editor.current.innerHTML });
      setSaved(true);
    }, 600);
  };

  const restore = () => {
    const el = editor.current;
    if (!el) return;
    el.focus();
    const sel = window.getSelection();
    if (range.current && sel) {
      sel.removeAllRanges();
      sel.addRange(range.current);
    }
  };

  const exec = (cmd: string, value?: string) => {
    restore();
    document.execCommand(cmd, false, value);
    onInput();
  };

  const applyFontSize = (px: number) => {
    const size = Math.max(8, Math.min(72, px));
    restore();
    document.execCommand('styleWithCSS', false, 'false');
    document.execCommand('fontSize', false, '7');
    editor.current?.querySelectorAll('font[size="7"]').forEach((f) => {
      const span = document.createElement('span');
      span.style.fontSize = `${size}px`;
      span.innerHTML = f.innerHTML;
      f.replaceWith(span);
    });
    setFontSize(size);
    onInput();
  };

  const choose = (t: string) => {
    persist({ template: t, html: t === 'resume' ? resume : tplById(t).html() });
    setChoosing(false);
    setDocKey((k) => k + 1);
  };

  const reset = () => {
    if (!store.template) return;
    persist({ html: store.template === 'resume' ? resume : tpl.html() });
    setDocKey((k) => k + 1);
    notify({
      app: 'Pages',
      icon: 'pages',
      title: 'Document reset',
      body: store.template === 'resume' ? 'Restored the original résumé from the portfolio data.' : tpl.id.startsWith('blank') ? 'Blank document restored.' : `Restored “${tpl.name}”.`,
    });
  };

  const exportPdf = () => {
    const html = editor.current?.innerHTML ?? '';
    const w = window.open('', '_blank', 'width=900,height=1000');
    if (!w) {
      notify({ app: 'Pages', icon: 'pages', title: 'Pop-up blocked', body: 'Allow pop-ups for this site to export the document as PDF.' });
      return;
    }
    const title = store.template === 'resume' ? `${personal.name} — Résumé` : tpl.id.startsWith('blank') ? 'Untitled' : `${personal.name} — ${tpl.name}`;
    w.document.write(
      `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>@page{size:A4${tpl.landscape ? ' landscape' : ''};margin:16mm 16mm 16mm}html,body{margin:0;background:#fff}${DOC_CSS}.doc h2,.doc h3{break-after:avoid}.doc li,.doc p{break-inside:avoid}</style></head><body><div class="doc">${html}</div><script>window.onload=function(){setTimeout(function(){window.focus();window.print();},250)};<\/script></body></html>`,
    );
    w.document.close();
    notify({ app: 'Pages', icon: 'pages', title: 'Export PDF…', body: 'Choose “Save as PDF” in the print dialog.' });
  };

  const zoom = store.zoom === 'fit' ? fit : Number(store.zoom) / 100;
  const keep = (e: RMouseEvent) => e.preventDefault(); // keep the text selection when clicking toolbar buttons

  if (!store.template || choosing) return <Chooser current={store.template} onChoose={choose} onCancel={store.template ? () => setChoosing(false) : undefined} />;

  return (
    <div className={`pg ${inspector ? 'pg-insp-on' : ''}`}>
      <div className="pg-toolbar" role="toolbar" aria-label="Formatting">
        <select
          className="pg-style"
          aria-label="Paragraph style"
          value={['h1', 'h2', 'h3'].includes(block) ? block : 'p'}
          onChange={(e) => {
            exec('formatBlock', e.target.value);
            setBlock(e.target.value);
          }}
        >
          <option value="h1">Heading 1</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
          <option value="p">Body</option>
        </select>
        <span className="pg-sep" />
        <div className="pg-group">
          <button type="button" aria-label="Bold" title="Bold (⌘B)" onMouseDown={keep} onClick={() => exec('bold')}>
            <b>B</b>
          </button>
          <button type="button" aria-label="Italic" title="Italic (⌘I)" onMouseDown={keep} onClick={() => exec('italic')}>
            <i style={{ fontFamily: 'Georgia, serif' }}>I</i>
          </button>
          <button type="button" aria-label="Underline" title="Underline (⌘U)" onMouseDown={keep} onClick={() => exec('underline')}>
            <u>U</u>
          </button>
        </div>
        <div className="pg-group">
          <button type="button" aria-label="Bulleted list" title="Bulleted list" onMouseDown={keep} onClick={() => exec('insertUnorderedList')}>
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <circle cx="4" cy="5" r="1.5" />
              <circle cx="4" cy="10" r="1.5" />
              <circle cx="4" cy="15" r="1.5" />
              <path d="M8 5h9M8 10h9M8 15h9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
          <button type="button" aria-label="Align left" title="Align left" onMouseDown={keep} onClick={() => exec('justifyLeft')}>
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="M3 5h14M3 9h9M3 13h14M3 17h9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
          <button type="button" aria-label="Align center" title="Align center" onMouseDown={keep} onClick={() => exec('justifyCenter')}>
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="M3 5h14M5.5 9h9M3 13h14M5.5 17h9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <span className="pg-sep" />
        <select className="pg-zoom" aria-label="Zoom" value={store.zoom} onChange={(e) => persist({ zoom: e.target.value as Zoom })}>
          <option value="fit">Fit ({Math.round(fit * 100)}%)</option>
          <option value="75">75%</option>
          <option value="100">100%</option>
          <option value="125">125%</option>
        </select>
        <span className="pg-grow" />
        <button type="button" className="pg-tbtn" onClick={() => setChoosing(true)} title="Choose a template">
          Templates
        </button>
        <button type="button" className="pg-tbtn" onClick={reset}>
          Reset to Original
        </button>
        <button type="button" className="pg-tbtn" onClick={() => setSaveName(store.template === 'resume' ? 'My Résumé' : tpl.name)}>
          Save As…
        </button>
        <button type="button" className="pg-tbtn" onClick={() => setLib(true)}>
          Documents{docs.length ? ` (${docs.length})` : ''}
        </button>
        <button type="button" className="pg-tbtn pg-primary" onClick={exportPdf}>
          Export PDF…
        </button>
        <button type="button" className={`pg-ibtn ${inspector ? 'on' : ''}`} aria-label="Toggle Format inspector" aria-pressed={inspector} onClick={() => setInspector((v) => !v)}>
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <path d="M5 4.5 12 4.5M3.5 10h13M8 15.5h7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <path d="m13.5 3 2 2-6 6H7.5v-2z" fill="currentColor" opacity=".8" />
          </svg>
        </button>
      </div>

      <div className="pg-body">
        <div className="pg-canvas scroll-smooth" ref={canvas}>
          <div className="pg-paper-wrap" style={{ width: pageW * zoom }}>
            <div className="pg-paper" style={{ zoom, minHeight: pageH, width: pageW }}>
              <div
                ref={editor}
                className="doc pg-doc"
                contentEditable
                suppressContentEditableWarning
                spellCheck
                role="textbox"
                aria-multiline="true"
                aria-label="Document"
                onInput={onInput}
                onBlur={() => {
                  if (!saved && editor.current) {
                    window.clearTimeout(saveT.current);
                    persist({ html: editor.current.innerHTML });
                    setSaved(true);
                  }
                }}
              />
            </div>
          </div>
        </div>

        <aside className="pg-insp" aria-label="Format inspector">
          <div className="pg-insp-title">Format</div>
          <h4>Paragraph Style</h4>
          <div className="pg-styles">
            {[
              ['h1', 'Heading 1'],
              ['h2', 'Heading 2'],
              ['h3', 'Heading 3'],
              ['p', 'Body'],
            ].map(([v, l]) => (
              <button key={v} type="button" className={block === v ? 'on' : ''} onMouseDown={keep} onClick={() => { exec('formatBlock', v); setBlock(v); }}>
                <span className={`pg-sty-${v}`}>{l}</span>
              </button>
            ))}
          </div>
          <h4>Font</h4>
          <div className="pg-font">
            <span className="pg-font-name">Helvetica Neue</span>
            <div className="pg-stepper">
              <button type="button" aria-label="Decrease font size" onMouseDown={keep} onClick={() => applyFontSize(fontSize - 1)}>
                −
              </button>
              <span aria-live="polite">{fontSize} px</span>
              <button type="button" aria-label="Increase font size" onMouseDown={keep} onClick={() => applyFontSize(fontSize + 1)}>
                +
              </button>
            </div>
          </div>
          <div className="pg-sizes">
            {[11, 13, 14, 16, 20, 28].map((s) => (
              <button key={s} type="button" onMouseDown={keep} onClick={() => applyFontSize(s)} className={fontSize === s ? 'on' : ''}>
                {s}
              </button>
            ))}
          </div>
          <div className="pg-bius">
            <button type="button" aria-label="Bold" onMouseDown={keep} onClick={() => exec('bold')}>
              <b>B</b>
            </button>
            <button type="button" aria-label="Italic" onMouseDown={keep} onClick={() => exec('italic')}>
              <i style={{ fontFamily: 'Georgia, serif' }}>I</i>
            </button>
            <button type="button" aria-label="Underline" onMouseDown={keep} onClick={() => exec('underline')}>
              <u>U</u>
            </button>
          </div>
          <h4>Document</h4>
          <dl className="pg-meta">
            <dt>Paper</dt>
            <dd>{tpl.landscape ? 'A4 landscape · 297 × 210 mm' : 'A4 · 210 × 297 mm'}</dd>
            <dt>Words</dt>
            <dd>{words.toLocaleString()}</dd>
            <dt>Source</dt>
            <dd>{tpl.source}</dd>
            <dt>Template</dt>
            <dd>{tpl.name}</dd>
          </dl>
        </aside>
      </div>

      <footer className="pg-foot">
        <span>{words.toLocaleString()} words</span>
        <span className="pg-grow" />
        <span className={`pg-saved ${saved ? '' : 'busy'}`}>{saved ? 'Saved' : 'Saving…'}</span>
        <span>A4 · {Math.round(zoom * 100)}%</span>
      </footer>
      <style>{DOC_CSS}</style>
      {saveName !== null && (
        <div className="pg8-sheet-back" onPointerDown={(e) => e.target === e.currentTarget && setSaveName(null)}>
          <form
            className="pg8-sheet"
            onSubmit={(e) => {
              e.preventDefault();
              const name = saveName.trim() || 'Untitled';
              const html = editor.current?.innerHTML ?? store.html;
              setDocs((l) => [{ id: `d${Date.now().toString(36)}`, name, template: store.template, html, at: Date.now() }, ...l]);
              setSaveName(null);
              notify({ app: 'Pages', icon: 'pages', title: 'Document saved', body: `“${name}” — saved in this browser.` });
            }}
          >
            <h3>Save As</h3>
            <input value={saveName} onChange={(e) => setSaveName(e.target.value)} autoFocus aria-label="Document name" maxLength={60} />
            <div>
              <button type="button" onClick={() => setSaveName(null)}>
                Cancel
              </button>
              <button type="submit" className="primary">
                Save
              </button>
            </div>
          </form>
        </div>
      )}
      {lib && (
        <div className="pg8-sheet-back" onPointerDown={(e) => e.target === e.currentTarget && setLib(false)}>
          <div className="pg8-sheet wide" role="dialog" aria-label="Documents">
            <h3>Documents</h3>
            {docs.length === 0 && <p className="pg8-none">No saved documents yet — use “Save As…”.</p>}
            <ul className="pg8-docs">
              {docs.map((d) => (
                <li key={d.id}>
                  <span className="pg8-ico">📄</span>
                  {renaming === d.id ? (
                    <input
                      defaultValue={d.name}
                      autoFocus
                      onBlur={(e) => {
                        const v = e.target.value.trim();
                        if (v) setDocs((l) => l.map((x) => (x.id === d.id ? { ...x, name: v } : x)));
                        setRenaming(null);
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                    />
                  ) : (
                    <span className="pg8-name">
                      <b>{d.name}</b>
                      <small>
                        {tplById(d.template).name} · {new Date(d.at).toLocaleString()}
                      </small>
                    </span>
                  )}
                  <span className="pg8-acts">
                    <button
                      type="button"
                      className="primary"
                      onClick={() => {
                        persist({ template: d.template, html: d.html });
                        setDocKey((k) => k + 1);
                        setLib(false);
                        notify({ app: 'Pages', icon: 'pages', title: `Opened “${d.name}”` });
                      }}
                    >
                      Open
                    </button>
                    <button type="button" onClick={() => setRenaming(d.id)}>
                      Rename
                    </button>
                    <button type="button" onClick={() => setDocs((l) => [{ ...d, id: `d${Date.now().toString(36)}`, name: `${d.name} copy`, at: Date.now() }, ...l])}>
                      Duplicate
                    </button>
                    <button type="button" className="danger" onClick={() => setDocs((l) => l.filter((x) => x.id !== d.id))}>
                      Delete
                    </button>
                  </span>
                </li>
              ))}
            </ul>
            <div>
              <button type="button" onClick={() => setLib(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ───────────────────────────── Template chooser ───────────────────────────── */

function Thumb({ t }: { t: TemplateDef }) {
  const html = useMemo(() => t.html(), [t]);
  const w = t.landscape ? PAGE_H : PAGE_W;
  const h = t.landscape ? PAGE_W : PAGE_H;
  return (
    <span className={`pg7-thumb ${t.landscape ? 'land' : ''}`} style={{ ['--pw' as string]: w, ['--ph' as string]: h }}>
      <span className="pg7-thumb-page" style={{ width: w, height: h }}>
        <span className="doc" dangerouslySetInnerHTML={{ __html: html }} />
      </span>
    </span>
  );
}

function Chooser({ current, onChoose, onCancel }: { current: string; onChoose: (t: string) => void; onCancel?: () => void }) {
  const [pick, setPick] = useState<string>(current || 'resume');
  const [cat, setCat] = useState<Category | 'All'>('All');
  const [q, setQ] = useState('');
  const cats = (cat === 'All' ? CATEGORIES : [cat]).map((c) => ({
    c,
    items: TEMPLATES.filter((t) => t.category === c && (!q.trim() || t.name.toLowerCase().includes(q.trim().toLowerCase()))),
  }));
  const CAT_ICON: Record<Category | 'All', string> = { All: '▦', Basic: '▢', Reports: '↗', Resumes: '☰', Letters: '✉', Cards: '▭' };
  return (
    <div className="pg7-ch">
      <style>{DOC_CSS}</style>
      <nav className="pg7-cats" aria-label="Template categories">
        {(['All', ...CATEGORIES] as (Category | 'All')[]).map((c) => (
          <button key={c} type="button" className={cat === c ? 'on' : ''} aria-pressed={cat === c} onClick={() => setCat(c)}>
            <span aria-hidden="true">{CAT_ICON[c]}</span>
            {c === 'All' ? 'All Templates' : c}
            <small>{c === 'All' ? TEMPLATES.length : TEMPLATES.filter((t) => t.category === c).length}</small>
          </button>
        ))}
        <p className="pg7-cats-note">
          <AppIcon name="pages" />
          Templates are filled in from {personal.name}’s portfolio data.
        </p>
      </nav>
      <div className="pg7-body">
        <header className="pg7-head">
          <h2>Choose a Template</h2>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search templates" aria-label="Search templates" />
        </header>
        <div className="pg7-scroll scroll-smooth" role="radiogroup" aria-label="Templates">
          {cats
            .filter((g) => g.items.length)
            .map((g) => (
              <section key={g.c} className="pg7-sec">
                <h3>{g.c}</h3>
                <div className="pg7-grid">
                  {g.items.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      role="radio"
                      aria-checked={pick === t.id}
                      className={`pg7-card ${pick === t.id ? 'on' : ''}`}
                      onClick={() => setPick(t.id)}
                      onDoubleClick={() => onChoose(t.id)}
                    >
                      <Thumb t={t} />
                      <span className="pg7-label">{t.name}</span>
                    </button>
                  ))}
                </div>
              </section>
            ))}
          {cats.every((g) => !g.items.length) && <p className="pg7-none">No templates match “{q}”.</p>}
        </div>
        <footer className="pg7-foot">
          <span className="pg7-foot-sel">{tplById(pick).name}</span>
          <button type="button" className="btn" onClick={onCancel} disabled={!onCancel}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary pg7-create" onClick={() => onChoose(pick)}>
            Create
          </button>
        </footer>
      </div>
    </div>
  );
}
