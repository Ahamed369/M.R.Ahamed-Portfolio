import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type DragEvent } from 'react';
import type { AppProps } from '../components/Desktop';
import { DragBar, Lights } from '../components/Window';
import { cv, personal } from '../data/portfolio';
import { readStore, writeStore } from '../system/storage';
import { usePersisted, fmtWhen } from '../system/useStore';
import { useSettings } from '../system/SettingsContext';
import { useWM } from '../system/WindowManager';
import { addFiles, fileUrl, fmtSize, kindOf, removeFile, useFileUrls, useMyFiles, type MyFile } from '../system/myFiles';

/**
 * v10.3 — Documents: one place for every document in the portfolio —
 * the CV (page images + original PDF), the visitor's notes, plans and code
 * projects saved from other apps, and files the visitor added to My Files.
 * Each type opens in a fitting viewer; anything that can't be shown inline
 * gets a clear Download / Open card.
 */

/* ───────────────────────────── i18n ───────────────────────────── */

type Lang = 'en' | 'si' | 'ta';
const T = {
  title: { en: 'Documents', si: 'ලේඛන', ta: 'ஆவணங்கள்' },
  all: { en: 'All Documents', si: 'සියලු ලේඛන', ta: 'அனைத்து ஆவணங்கள்' },
  cv: { en: 'CV', si: 'CV', ta: 'CV' },
  notes: { en: 'Notes', si: 'සටහන්', ta: 'குறிப்புகள்' },
  plans: { en: 'Plans', si: 'සැලසුම්', ta: 'திட்டங்கள்' },
  code: { en: 'Code', si: 'කේත', ta: 'குறியீடு' },
  files: { en: 'My Files', si: 'මගේ ගොනු', ta: 'என் கோப்புகள்' },
  recents: { en: 'Recents', si: 'මෑත', ta: 'சமீபத்தியவை' },
  browse: { en: 'Browse', si: 'බ්‍රවුස්', ta: 'உலாவு' },
  locations: { en: 'Locations', si: 'ස්ථාන', ta: 'இடங்கள்' },
  search: { en: 'Search documents', si: 'ලේඛන සොයන්න', ta: 'ஆவணங்களைத் தேடு' },
  sortName: { en: 'Name', si: 'නම', ta: 'பெயர்' },
  sortDate: { en: 'Date', si: 'දිනය', ta: 'தேதி' },
  sortKind: { en: 'Kind', si: 'වර්ගය', ta: 'வகை' },
  sortBy: { en: 'Sort by', si: 'අනුපිළිවෙළ', ta: 'வரிசைப்படுத்து' },
  grid: { en: 'Icons', si: 'අයිකන', ta: 'ஐகான்கள்' },
  list: { en: 'List', si: 'ලැයිස්තුව', ta: 'பட்டியல்' },
  add: { en: 'Add Files', si: 'ගොනු එක් කරන්න', ta: 'கோப்புகளைச் சேர்' },
  share: { en: 'Share', si: 'බෙදාගන්න', ta: 'பகிர்' },
  download: { en: 'Download', si: 'බාගන්න', ta: 'பதிவிறக்கு' },
  openPdf: { en: 'Open PDF', si: 'PDF විවෘත කරන්න', ta: 'PDF திற' },
  open: { en: 'Open', si: 'විවෘත කරන්න', ta: 'திற' },
  openNotes: { en: 'Open in Notes', si: 'සටහන් තුළ විවෘත කරන්න', ta: 'குறிப்புகளில் திற' },
  del: { en: 'Delete', si: 'මකන්න', ta: 'நீக்கு' },
  cancel: { en: 'Cancel', si: 'අවලංගු', ta: 'ரத்து' },
  back: { en: 'Back', si: 'ආපසු', ta: 'பின்' },
  close: { en: 'Close', si: 'වසන්න', ta: 'மூடு' },
  expand: { en: 'Full view', si: 'සම්පූර්ණ දසුන', ta: 'முழு காட்சி' },
  run: { en: 'Run preview', si: 'පෙරදසුන ධාවනය', ta: 'முன்னோட்டம் இயக்கு' },
  showCode: { en: 'Show code', si: 'කේතය පෙන්වන්න', ta: 'குறியீட்டைக் காட்டு' },
  page: { en: 'Page', si: 'පිටුව', ta: 'பக்கம்' },
  of: { en: 'of', si: '/', ta: '/' },
  pages: { en: 'pages', si: 'පිටු', ta: 'பக்கங்கள்' },
  zoomIn: { en: 'Zoom in', si: 'විශාල කරන්න', ta: 'பெரிதாக்கு' },
  zoomOut: { en: 'Zoom out', si: 'කුඩා කරන්න', ta: 'சிறிதாக்கு' },
  copied: { en: 'Copied to clipboard', si: 'පසුරු පුවරුවට පිටපත් විය', ta: 'கிளிப்போர்டுக்கு நகலெடுக்கப்பட்டது' },
  copyFail: { en: 'Couldn’t copy — your browser blocked it', si: 'පිටපත් කළ නොහැක', ta: 'நகலெடுக்க முடியவில்லை' },
  selectHint: { en: 'Select a document to preview it here.', si: 'මෙහි පෙරදසුන සඳහා ලේඛනයක් තෝරන්න.', ta: 'முன்னோட்டத்திற்கு ஒரு ஆவணத்தைத் தேர்ந்தெடு.' },
  noPreview: { en: 'This type can’t be previewed here', si: 'මෙම වර්ගය මෙහි පෙන්විය නොහැක', ta: 'இந்த வகையை இங்கே முன்னோட்டமிட முடியாது' },
  noPreviewSub: { en: 'Download it, or open it with an app on your device.', si: 'එය බාගන්න, නැතහොත් ඔබේ උපාංගයේ යෙදුමකින් විවෘත කරන්න.', ta: 'பதிவிறக்கவும், அல்லது உங்கள் சாதனத்தில் உள்ள செயலியில் திறக்கவும்.' },
  pdfPhone: { en: 'PDFs open best in your device’s viewer.', si: 'PDF ඔබේ උපාංගයේ දර්ශකයේ හොඳින් විවෘත වේ.', ta: 'PDF கள் உங்கள் சாதன பார்வையாளரில் சிறப்பாகத் திறக்கும்.' },
  loading: { en: 'Loading…', si: 'පූරණය වෙමින්…', ta: 'ஏற்றுகிறது…' },
  missing: { en: 'This file is no longer stored in this browser.', si: 'මෙම ගොනුව තවදුරටත් මෙම බ්‍රවුසරයේ නැත.', ta: 'இந்தக் கோப்பு இனி இந்த உலாவியில் இல்லை.' },
  dropHere: { en: 'Drop files to add them to My Files', si: 'මගේ ගොනු වෙත එක් කිරීමට ගොනු මෙහි දමන්න', ta: 'என் கோப்புகளில் சேர்க்க கோப்புகளை இங்கே விடு' },
  confirmDel: { en: 'Delete “{x}”?', si: '“{x}” මකන්නද?', ta: '“{x}” ஐ நீக்கவா?' },
  confirmSub: { en: 'It is removed from this browser and can’t be recovered here.', si: 'එය මෙම බ්‍රවුසරයෙන් ඉවත් වේ.', ta: 'இது இந்த உலாவியிலிருந்து அகற்றப்படும்.' },
  emptyAll: { en: 'Nothing here yet. Add files, save a plan from Business Planner, or write a note.', si: 'තවම කිසිවක් නැත. ගොනු එක් කරන්න, ව්‍යාපාර සැලසුම්කරුගෙන් සැලසුමක් සුරකින්න, නැතහොත් සටහනක් ලියන්න.', ta: 'இன்னும் எதுவும் இல்லை. கோப்புகளைச் சேர்க்கவும், வணிகத் திட்டமிடலில் இருந்து திட்டத்தைச் சேமிக்கவும், அல்லது குறிப்பு எழுதவும்.' },
  emptyNotes: { en: 'No notes yet. Write one in Notes, or use “Save to Notes” in Learning Hub.', si: 'තවම සටහන් නැත. සටහන් යෙදුමේ එකක් ලියන්න.', ta: 'இன்னும் குறிப்புகள் இல்லை. குறிப்புகளில் ஒன்றை எழுதவும்.' },
  emptyPlans: { en: 'No plans yet. Save a plan from Business Planner and it appears here.', si: 'තවම සැලසුම් නැත. ව්‍යාපාර සැලසුම්කරුගෙන් සැලසුමක් සුරකින්න.', ta: 'இன்னும் திட்டங்கள் இல்லை. வணிகத் திட்டமிடலில் இருந்து ஒரு திட்டத்தைச் சேமிக்கவும்.' },
  emptyCode: { en: 'No code projects yet. Save a project from Code Playground and it appears here.', si: 'තවම කේත ව්‍යාපෘති නැත. Code Playground වෙතින් ව්‍යාපෘතියක් සුරකින්න.', ta: 'இன்னும் குறியீட்டுத் திட்டங்கள் இல்லை. Code Playground இல் ஒரு திட்டத்தைச் சேமிக்கவும்.' },
  emptyFiles: { en: 'Drop files here or choose Add Files. They stay only in this browser.', si: 'ගොනු මෙහි දමන්න හෝ “ගොනු එක් කරන්න” තෝරන්න. ඒවා මෙම බ්‍රවුසරයේ පමණක් රැඳේ.', ta: 'கோப்புகளை இங்கே விடவும் அல்லது “கோப்புகளைச் சேர்” என்பதைத் தேர்வு செய்யவும். அவை இந்த உலாவியில் மட்டுமே இருக்கும்.' },
  emptyRecents: { en: 'Documents you open will appear here.', si: 'ඔබ විවෘත කරන ලේඛන මෙහි දිස්වේ.', ta: 'நீங்கள் திறக்கும் ஆவணங்கள் இங்கே தோன்றும்.' },
  noResults: { en: 'No documents match “{x}”.', si: '“{x}” ට ගැළපෙන ලේඛන නැත.', ta: '“{x}” உடன் பொருந்தும் ஆவணங்கள் இல்லை.' },
  openNotesApp: { en: 'Open Notes', si: 'සටහන් විවෘත කරන්න', ta: 'குறிப்புகளைத் திற' },
  openPlanner: { en: 'Open Business Planner', si: 'ව්‍යාපාර සැලසුම්කරු විවෘත කරන්න', ta: 'வணிகத் திட்டமிடலைத் திற' },
  openPlayground: { en: 'Open Code Playground', si: 'Code Playground විවෘත කරන්න', ta: 'Code Playground ஐத் திற' },
  items: { en: 'items', si: 'අයිතම', ta: 'உருப்படிகள்' },
  rows: { en: 'Showing the first {x} rows', si: 'පළමු පේළි {x} පෙන්වයි', ta: 'முதல் {x} வரிசைகள் காட்டப்படுகின்றன' },
  truncated: { en: 'Showing the first part of a long file — download it to see everything.', si: 'දිගු ගොනුවක පළමු කොටස පමණි — සියල්ල බැලීමට බාගන්න.', ta: 'நீண்ட கோப்பின் முதல் பகுதி மட்டும் — முழுவதும் பார்க்க பதிவிறக்கவும்.' },
  savedFrom: { en: 'Saved from {x}', si: '{x} වෙතින් සුරකින ලදී', ta: '{x} இலிருந்து சேமிக்கப்பட்டது' },
  localOnly: { en: 'Kept only in this browser', si: 'මෙම බ්‍රවුසරයේ පමණි', ta: 'இந்த உலாவியில் மட்டும்' },
  sandboxNote: { en: 'Runs in a sandbox — it can’t reach this page or your data.', si: 'සුරක්ෂිත පෙට්ටියක ධාවනය වේ.', ta: 'பாதுகாப்பான சாண்ட்பாக்ஸில் இயங்குகிறது.' },
} as const;
type Key = keyof typeof T;

/* ───────────────────────────── icons (original) ───────────────────────────── */

const P: Record<string, ReactNode> = {
  all: <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5h3.4l1.8 1.8h5.8A2.5 2.5 0 0 1 20 9.3v7.2a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5z" />,
  cv: (
    <>
      <path d="M7 3.5h6.5L18 8v11a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 19V5A1.5 1.5 0 0 1 7 3.5z" />
      <circle cx="12" cy="11" r="2.2" fill="#fff" stroke="none" />
      <path d="M8.6 17c.6-1.8 1.9-2.7 3.4-2.7s2.8.9 3.4 2.7" stroke="#fff" fill="none" strokeWidth="1.6" strokeLinecap="round" />
    </>
  ),
  notes: (
    <>
      <rect x="5" y="4" width="14" height="16.5" rx="2.5" />
      <path d="M8.5 9h7M8.5 12.5h7M8.5 16h4.5" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" fill="none" />
    </>
  ),
  plans: (
    <>
      <rect x="4.5" y="4.5" width="15" height="15" rx="3" />
      <path d="M8 15.5v-3M12 15.5V9M16 15.5v-5" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" fill="none" />
    </>
  ),
  code: (
    <>
      <rect x="3.5" y="5" width="17" height="14" rx="3" />
      <path d="M9.5 9.5 7 12l2.5 2.5M14.5 9.5 17 12l-2.5 2.5" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  ),
  files: <path d="M3.8 7.2A2.2 2.2 0 0 1 6 5h3.6l1.9 2H18a2.2 2.2 0 0 1 2.2 2.2v8.6A2.2 2.2 0 0 1 18 20H6a2.2 2.2 0 0 1-2.2-2.2z" />,
  recents: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" fill="none" />
    </>
  ),
};
const SEC_COLOR: Record<string, string> = { all: '#0a84ff', cv: '#ff453a', notes: '#ffb300', plans: '#30b158', code: '#5e5ce6', files: '#2f9bff', recents: '#8e8e93' };

function Glyph({ name, size = 22 }: { name: string; size?: number }) {
  return (
    <span className="dc-glyph" style={{ background: SEC_COLOR[name] ?? '#8e8e93', width: size, height: size }} aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="#fff">
        {P[name]}
      </svg>
    </span>
  );
}

const LINE: Record<string, ReactNode> = {
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6" />
      <path d="m15 15 4.5 4.5" />
    </>
  ),
  grid: (
    <>
      <rect x="4" y="4" width="6.5" height="6.5" rx="1.6" />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.6" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.6" />
      <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.6" />
    </>
  ),
  list: <path d="M8.5 6.5H20M8.5 12H20M8.5 17.5H20M4.5 6.5h.01M4.5 12h.01M4.5 17.5h.01" />,
  share: (
    <>
      <path d="M12 14.5V3.8M8.2 7.3 12 3.5l3.8 3.8" />
      <path d="M8 10.5H6.5A1.5 1.5 0 0 0 5 12v7a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19v-7a1.5 1.5 0 0 0-1.5-1.5H16" />
    </>
  ),
  download: (
    <>
      <path d="M12 4v11M7.5 10.8 12 15.3l4.5-4.5" />
      <path d="M5 19.5h14" />
    </>
  ),
  trash: (
    <>
      <path d="M4.5 7h15M9.5 7V5.2c0-.7.5-1.2 1.2-1.2h2.6c.7 0 1.2.5 1.2 1.2V7" />
      <path d="M6.5 7l.9 11.6c.1 1 .9 1.9 1.9 1.9h5.4c1 0 1.8-.8 1.9-1.9L17.5 7" />
    </>
  ),
  back: <path d="M14.5 5.5 8 12l6.5 6.5" />,
  close: <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  play: <path d="M8 5.5v13l10.5-6.5z" />,
  expand: <path d="M14 4.5h5.5V10M10 19.5H4.5V14M19.5 4.5 13.5 10.5M4.5 19.5l6-6" />,
  open: (
    <>
      <path d="M13.5 4.5h6v6M19.5 4.5l-8 8" />
      <path d="M17 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h4" />
    </>
  ),
  codeview: <path d="M9 7.5 4.5 12 9 16.5M15 7.5l4.5 4.5-4.5 4.5" />,
  chev: <path d="M9.5 5.5 16 12l-6.5 6.5" />,
};
function Ico({ name }: { name: string }) {
  return (
    <svg className="dc-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {LINE[name]}
    </svg>
  );
}

/* ───────────────────────────── data ───────────────────────────── */

type Section = 'all' | 'cv' | 'notes' | 'plans' | 'code' | 'files' | 'recents';
const SECTIONS: Section[] = ['all', 'cv', 'notes', 'plans', 'code', 'files', 'recents'];

interface NoteRec {
  id: string;
  title: string;
  body: string;
  at: number;
}
interface SavedRec {
  id: string;
  title: string;
  kind: string;
  body: string;
  at: number;
  source?: string;
}
type FileView = 'image' | 'video' | 'audio' | 'pdf' | 'csv' | 'text' | 'other';
interface Doc {
  id: string;
  title: string;
  sec: Exclude<Section, 'all' | 'recents'>;
  kind: string;
  at: number;
  meta: string;
  text?: string;
  html?: boolean;
  saved?: SavedRec;
  note?: NoteRec;
  file?: MyFile;
  fv?: FileView;
  ext?: string;
}

const TEXT_EXT = /^(txt|md|markdown|log|json|js|mjs|cjs|ts|tsx|jsx|css|scss|html?|xml|svg|ya?ml|toml|ini|py|java|c|h|cpp|hpp|cs|go|rs|rb|php|sh|bash|sql|kt|swift|dart|vue|env|gitignore)$/;
const extOf = (n: string) => (n.includes('.') ? n.split('.').pop()!.toLowerCase() : '');
function fileView(f: MyFile): FileView {
  const e = extOf(f.name);
  const t = f.type;
  if (e === 'csv' || e === 'tsv' || t === 'text/csv' || t === 'text/tab-separated-values') return 'csv';
  if (t.startsWith('image/') && e !== 'svg') return 'image';
  if (t.startsWith('video/')) return 'video';
  if (t.startsWith('audio/')) return 'audio';
  if (t === 'application/pdf' || e === 'pdf') return 'pdf';
  if (t.startsWith('text/') || t === 'application/json' || t === 'application/javascript' || t === 'application/xml' || t === 'image/svg+xml' || TEXT_EXT.test(e)) return 'text';
  return 'other';
}
const OFFICE: Record<string, string> = { doc: 'Word Document', docx: 'Word Document', ppt: 'Presentation', pptx: 'Presentation', key: 'Presentation', xls: 'Spreadsheet', xlsx: 'Spreadsheet', numbers: 'Spreadsheet', pages: 'Document', odt: 'Document', zip: 'Archive', rtf: 'Rich Text' };
function fileKind(f: MyFile, fv: FileView): string {
  const e = extOf(f.name);
  if (fv === 'csv') return 'CSV Spreadsheet';
  if (fv === 'text') return e === 'md' || e === 'markdown' ? 'Markdown' : e === 'txt' || e === 'log' ? 'Plain Text' : `${e.toUpperCase() || 'Text'} Source`;
  if (OFFICE[e]) return OFFICE[e];
  return kindOf(f.type);
}
const looksHtml = (s: string) => /<\/?[a-z][\s\S]*?>/i.test(s);
const plain = (s: string) => (looksHtml(s) ? s.replace(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>/gi, ' ').replace(/<[^>]+>/g, ' ') : s).replace(/\s+/g, ' ').trim();

/** strips anything executable from saved HTML before it is rendered */
function sanitize(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('script,style,iframe,frame,frameset,object,embed,link,meta,base,form,input,button,textarea,select,option,svg,math,template,noscript,audio,video,source,portal').forEach((e) => e.remove());
  doc.body.querySelectorAll('*').forEach((el) => {
    for (const a of Array.from(el.attributes)) {
      const n = a.name.toLowerCase();
      const v = a.value.replace(/[\s\u0000-\u001f]/g, '').toLowerCase();
      if (n.startsWith('on') || n === 'srcdoc' || n === 'formaction' || n === 'style' || n === 'class' || n === 'id') el.removeAttribute(a.name);
      else if (['href', 'src', 'xlink:href', 'action', 'srcset', 'poster', 'background'].includes(n) && /^(javascript|vbscript|data):/.test(v) && !(n === 'src' && el.tagName === 'IMG' && v.startsWith('data:image/'))) el.removeAttribute(a.name);
    }
    if (el.tagName === 'A') {
      el.setAttribute('target', '_blank');
      el.setAttribute('rel', 'noopener noreferrer');
    }
  });
  return doc.body.innerHTML;
}

function parseCsv(src: string, sep: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let q = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (q) {
      if (c === '"' && src[i + 1] === '"') (cell += '"'), i++;
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === sep) row.push(cell), (cell = '');
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      if (rows.length > 1000) return rows;
    } else cell += c;
  }
  if (cell !== '' || row.length) row.push(cell), rows.push(row);
  return rows;
}

function useDevice(): string {
  const [d, setD] = useState(() => document.documentElement.dataset.device ?? 'mac');
  useEffect(() => {
    const mo = new MutationObserver(() => setD(document.documentElement.dataset.device ?? 'mac'));
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-device'] });
    return () => mo.disconnect();
  }, []);
  return d;
}

/** re-reads a localStorage list when other apps change it */
function useStoreList<R>(key: string): R[] {
  const read = useCallback(() => {
    try {
      return window.localStorage.getItem(key) ?? '';
    } catch {
      return '';
    }
  }, [key]);
  const [raw, setRaw] = useState(read);
  useEffect(() => {
    const on = () => setRaw((cur) => {
      const n = read();
      return n === cur ? cur : n;
    });
    const t = window.setInterval(on, 2500);
    window.addEventListener('focus', on);
    window.addEventListener('storage', on);
    window.addEventListener('mra-store-restored', on);
    window.addEventListener('mra-store-change', on);
    window.addEventListener('mra-docs-refresh', on);
    return () => {
      window.clearInterval(t);
      window.removeEventListener('focus', on);
      window.removeEventListener('storage', on);
      window.removeEventListener('mra-store-restored', on);
      window.removeEventListener('mra-store-change', on);
      window.removeEventListener('mra-docs-refresh', on);
    };
  }, [read]);
  return useMemo(() => {
    void raw;
    const l = readStore<{ list: R[] }>(key, { list: [] }).list;
    return Array.isArray(l) ? l.filter((x) => x && typeof x === 'object') : [];
  }, [raw, key]);
}

function triggerDownload(href: string, name: string) {
  const a = document.createElement('a');
  a.href = href;
  a.download = name;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
}
const safeName = (s: string) => s.replace(/[\\/:*?"<>|]+/g, '-').trim().slice(0, 80) || 'document';

/* ───────────────────────────── app ───────────────────────────── */

interface Prefs {
  view: 'grid' | 'list';
  sort: 'name' | 'date' | 'kind';
  recents: { id: string; at: number }[];
}

export default function DocumentsApp({ win }: Partial<AppProps>) {
  const wm = useWM();
  const { settings, motionReduced } = useSettings();
  const lang: Lang = (['en', 'si', 'ta'] as const).includes(settings.language as Lang) ? (settings.language as Lang) : 'en';
  const t = useCallback((k: Key, x?: string) => (T[k][lang] as string).replace('{x}', x ?? ''), [lang]);
  const device = useDevice();
  const rootRef = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(1000);
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const layout: 'phone' | 'tablet' | 'mac' = device === 'iphone' || w < 620 ? 'phone' : device === 'ipad' || w < 900 ? 'tablet' : 'mac';

  const [prefs, setPrefs] = usePersisted<Prefs>('mra-documents-v1', { view: 'grid', sort: 'date', recents: [] });
  const initialSec = (SECTIONS as string[]).includes(win?.args?.section ?? '') ? (win!.args!.section as Section) : 'all';
  const [sec, setSec] = useState<Section>(initialSec);
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<string | null>(win?.args?.doc ?? (win?.args?.section === 'cv' ? 'cv' : null));
  const [full, setFull] = useState(win?.args?.section === 'cv' || !!win?.args?.doc);
  const [phoneTab, setPhoneTab] = useState<'recents' | 'browse'>('browse');
  const [phoneSec, setPhoneSec] = useState<Section | null>(win?.args?.section ? initialSec : null);
  const [dragging, setDragging] = useState(false);
  const [confirm, setConfirm] = useState<Doc | null>(null);
  const [toast, setToast] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);

  const notes = useStoreList<NoteRec>('mra-notes-mine');
  const saved = useStoreList<SavedRec>('mra-docs-saved-v1');
  const myFiles = useMyFiles();

  const docs = useMemo<Doc[]>(() => {
    const out: Doc[] = [{ id: 'cv', title: cv.displayName, sec: 'cv', kind: 'PDF Document', at: 0, meta: `PDF · ${cv.pages.length} ${T.pages[lang]}`, text: `${personal.name} CV curriculum vitae resume` }];
    notes.forEach((n) => out.push({ id: `note:${n.id}`, title: String(n.title || 'Untitled note'), sec: 'notes', kind: 'Note', at: Number(n.at) || 0, meta: '', text: String(n.body ?? ''), note: n }));
    saved.forEach((s) => {
      const k = String(s.kind || 'document');
      const body = String(s.body ?? '');
      const sc: Doc['sec'] = k === 'code' ? 'code' : k === 'note' ? 'notes' : 'plans';
      out.push({ id: `saved:${s.id}`, title: String(s.title || 'Untitled'), sec: sc, kind: k === 'code' ? 'Code Project' : k === 'plan' ? 'Plan' : k === 'note' ? 'Note' : k.charAt(0).toUpperCase() + k.slice(1), at: Number(s.at) || 0, meta: s.source ? String(s.source) : '', text: body, html: k !== 'code' && looksHtml(body), saved: s });
    });
    myFiles.forEach((f) => {
      const fv = fileView(f);
      out.push({ id: `file:${f.id}`, title: f.name, sec: 'files', kind: fileKind(f, fv), at: f.added, meta: fmtSize(f.size), file: f, fv, ext: extOf(f.name) });
    });
    return out;
  }, [notes, saved, myFiles, lang]);

  const byId = useMemo(() => new Map(docs.map((d) => [d.id, d])), [docs]);
  const recentIds = prefs.recents.filter((r) => byId.has(r.id));
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: docs.length, recents: recentIds.length };
    docs.forEach((d) => (c[d.sec] = (c[d.sec] ?? 0) + 1));
    return c;
  }, [docs, recentIds.length]);

  const activeSec: Section = layout === 'phone' ? (phoneTab === 'recents' ? 'recents' : (phoneSec ?? 'all')) : sec;
  const shown = useMemo(() => {
    let l = activeSec === 'all' ? docs : activeSec === 'recents' ? recentIds.map((r) => byId.get(r.id)!) : docs.filter((d) => d.sec === activeSec);
    const s = q.trim().toLowerCase();
    if (s) l = (activeSec === 'recents' ? l : docs).filter((d) => `${d.title} ${d.kind} ${d.meta} ${d.text ? plain(d.text).slice(0, 4000) : ''}`.toLowerCase().includes(s));
    if (activeSec === 'recents' && !s) return l;
    const sorted = [...l];
    if (prefs.sort === 'name') sorted.sort((a, b) => a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: 'base' }));
    else if (prefs.sort === 'kind') sorted.sort((a, b) => a.kind.localeCompare(b.kind) || a.title.localeCompare(b.title));
    else sorted.sort((a, b) => b.at - a.at || a.title.localeCompare(b.title));
    return sorted;
  }, [activeSec, docs, recentIds, byId, q, prefs.sort]);

  const current = sel ? (byId.get(sel) ?? null) : null;
  useEffect(() => {
    // the document was deleted elsewhere (files load asynchronously, so wait for them)
    if (sel && !byId.has(sel) && !(sel.startsWith('file:') && !myFiles.length)) (setSel(null), setFull(false));
  }, [sel, byId, myFiles.length]);

  const openDoc = (d: Doc, expand?: boolean) => {
    setSel(d.id);
    if (expand || layout !== 'mac') setFull(true);
    setPrefs((p) => ({ ...p, recents: [{ id: d.id, at: Date.now() }, ...p.recents.filter((r) => r.id !== d.id)].slice(0, 30) }));
  };
  const closeViewer = () => {
    setFull(false);
    if (layout !== 'mac') setSel(null);
  };

  const flash = (m: string) => {
    setToast(m);
    window.setTimeout(() => setToast((c) => (c === m ? '' : c)), 2200);
  };
  const onAdd = async (files: FileList | File[] | null) => {
    if (!files || !files.length) return;
    const added = await addFiles(files);
    if (added.length) {
      if (layout === 'phone') (setPhoneTab('browse'), setPhoneSec('files'));
      else setSec('files');
      setQ('');
    }
  };

  // keyboard: Space = Quick Look, Esc = close
  useEffect(() => {
    if (layout !== 'mac') return;
    const el = rootRef.current;
    if (!el) return;
    const on = (e: KeyboardEvent) => {
      const tg = e.target as HTMLElement;
      if (/INPUT|TEXTAREA|SELECT/.test(tg.tagName)) return;
      if (e.key === ' ' && current) (e.preventDefault(), setFull((f) => !f));
      if (e.key === 'Escape' && full) setFull(false);
    };
    el.addEventListener('keydown', on);
    return () => el.removeEventListener('keydown', on);
  }, [layout, current, full]);

  const doDelete = async (d: Doc) => {
    setConfirm(null);
    if (d.saved) {
      const cur = readStore<{ list: SavedRec[] }>('mra-docs-saved-v1', { list: [] }).list ?? [];
      writeStore('mra-docs-saved-v1', { list: cur.filter((s) => s.id !== d.saved!.id) });
      window.dispatchEvent(new Event('mra-docs-refresh'));
    } else if (d.file) await removeFile(d.file.id);
    if (sel === d.id) (setSel(null), setFull(false));
    setPrefs((p) => ({ ...p, recents: p.recents.filter((r) => r.id !== d.id) }));
  };

  const thumbIds = useMemo(() => myFiles.filter((f) => fileView(f) === 'image').map((f) => f.id), [myFiles]);
  const thumbs = useFileUrls(thumbIds);

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files?.length) void onAdd(e.dataTransfer.files);
  };
  const dragProps = {
    onDragOver: (e: DragEvent) => {
      if (Array.from(e.dataTransfer.types).includes('Files')) (e.preventDefault(), setDragging(true));
    },
    onDragLeave: (e: DragEvent) => {
      if (e.currentTarget === e.target || !(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) setDragging(false);
    },
    onDrop,
  };

  const secLabel = (s: Section) => t(s === 'all' ? 'all' : s);
  const emptyFor = (s: Section) => {
    if (q.trim()) return <Empty icon="all" text={t('noResults', q.trim())} />;
    if (s === 'notes') return <Empty icon="notes" text={t('emptyNotes')} action={{ label: t('openNotesApp'), run: () => wm.open('notes') }} />;
    if (s === 'plans') return <Empty icon="plans" text={t('emptyPlans')} action={{ label: t('openPlanner'), run: () => wm.open('bizplanner') }} />;
    if (s === 'code') return <Empty icon="code" text={t('emptyCode')} action={{ label: t('openPlayground'), run: () => wm.open('playground') }} />;
    if (s === 'files') return <Empty icon="files" text={t('emptyFiles')} action={{ label: t('add'), run: () => fileInput.current?.click() }} />;
    if (s === 'recents') return <Empty icon="recents" text={t('emptyRecents')} />;
    return <Empty icon="all" text={t('emptyAll')} />;
  };

  const viewer = current ? (
    <Viewer
      key={current.id}
      d={current}
      t={t}
      layout={layout}
      device={device}
      full={full}
      motionReduced={motionReduced}
      onBack={closeViewer}
      onExpand={layout === 'mac' ? () => setFull((f) => !f) : undefined}
      onDelete={current.saved || current.file ? () => setConfirm(current) : undefined}
      onOpenNotes={() => wm.open('notes')}
      flash={flash}
    />
  ) : null;

  const listing = (
    <DocList
      docs={shown}
      view={layout === 'phone' ? 'list' : prefs.view}
      sel={sel}
      thumbs={thumbs}
      t={t}
      showSec={activeSec === 'all' || activeSec === 'recents' || !!q.trim()}
      onSelect={(d) => (layout === 'mac' ? (setSel(d.id), setPrefs((p) => ({ ...p, recents: [{ id: d.id, at: Date.now() }, ...p.recents.filter((r) => r.id !== d.id)].slice(0, 30) }))) : openDoc(d))}
      onOpen={(d) => openDoc(d, true)}
      empty={emptyFor(activeSec)}
      lang={lang}
    />
  );

  const searchBox = (
    <label className="dc-search" data-nodrag>
      <Ico name="search" />
      <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('search')} aria-label={t('search')} />
    </label>
  );
  const sortCtl = (
    <label className="dc-sort" data-nodrag title={t('sortBy')}>
      <span className="sr">{t('sortBy')}</span>
      <select value={prefs.sort} onChange={(e) => setPrefs((p) => ({ ...p, sort: e.target.value as Prefs['sort'] }))} aria-label={t('sortBy')}>
        <option value="date">{t('sortDate')}</option>
        <option value="name">{t('sortName')}</option>
        <option value="kind">{t('sortKind')}</option>
      </select>
    </label>
  );
  const addBtn = (
    <button type="button" className="dc-tbtn" onClick={() => fileInput.current?.click()} aria-label={t('add')} title={t('add')} data-nodrag>
      <Ico name="plus" />
    </button>
  );
  const hiddenInput = (
    <input
      ref={fileInput}
      type="file"
      multiple
      hidden
      className="dc-file-input"
      onChange={(e) => {
        void onAdd(e.target.files ? Array.from(e.target.files) : null);
        e.target.value = '';
      }}
    />
  );
  const overlays = (
    <>
      {dragging && (
        <div className="dc-drop" aria-hidden="true">
          <div>
            <Glyph name="files" size={44} />
            <b>{t('dropHere')}</b>
          </div>
        </div>
      )}
      {confirm && (
        <div className="dc-modal" role="dialog" aria-modal="true" aria-label={t('del')} onClick={() => setConfirm(null)}>
          <div className="dc-alert" onClick={(e) => e.stopPropagation()}>
            <b>{t('confirmDel', confirm.title)}</b>
            <p>{t('confirmSub')}</p>
            <div>
              <button type="button" onClick={() => setConfirm(null)} autoFocus>
                {t('cancel')}
              </button>
              <button type="button" className="danger" onClick={() => void doDelete(confirm)}>
                {t('del')}
              </button>
            </div>
          </div>
        </div>
      )}
      {toast && (
        <div className="dc-toast" role="status">
          {toast}
        </div>
      )}
    </>
  );

  /* ───── iPhone: Files-app style ───── */
  if (layout === 'phone') {
    const inSection = phoneTab === 'browse' && phoneSec;
    return (
      <div ref={rootRef} className={`dc dc-phone ${motionReduced ? 'dc-still' : ''}`} {...dragProps} tabIndex={-1}>
        <DragBar className="dc-bar">
          <Lights />
          {inSection ? (
            <button type="button" className="dc-back" onClick={() => (setPhoneSec(null), setQ(''))} data-nodrag>
              <Ico name="back" />
              {t('browse')}
            </button>
          ) : (
            <span className="dc-bar-sp" />
          )}
          <span className="dc-bar-sp" />
          {phoneTab === 'browse' && phoneSec && phoneSec !== 'recents' && sortCtl}
          {addBtn}
        </DragBar>
        <div className="dc-phone-body">
          <h1 className="dc-large">{phoneTab === 'recents' ? t('recents') : inSection ? secLabel(phoneSec!) : t('browse')}</h1>
          <div className="dc-phone-search">{searchBox}</div>
          {phoneTab === 'browse' && !phoneSec && !q.trim() ? (
            <div className="dc-locs">
              <h2>{t('locations')}</h2>
              <div className="dc-group">
                {(['all', 'cv', 'notes', 'plans', 'code', 'files'] as Section[]).map((s) => (
                  <button key={s} type="button" className="dc-loc" onClick={() => setPhoneSec(s)}>
                    <Glyph name={s} size={30} />
                    <span>{secLabel(s)}</span>
                    <small>{counts[s] ?? 0}</small>
                    <Ico name="chev" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            listing
          )}
        </div>
        <nav className="dc-tabs" aria-label={t('title')}>
          {(['recents', 'browse'] as const).map((k) => (
            <button key={k} type="button" className={phoneTab === k ? 'on' : ''} onClick={() => (k === phoneTab && k === 'browse' ? setPhoneSec(null) : setPhoneTab(k), setQ(''))}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                {k === 'recents' ? P.recents : P.files}
              </svg>
              <span>{t(k)}</span>
            </button>
          ))}
        </nav>
        {current && full && <div className="dc-full">{viewer}</div>}
        {hiddenInput}
        {overlays}
      </div>
    );
  }

  /* ───── Mac / iPad ───── */
  return (
    <div ref={rootRef} className={`dc dc-${layout} ${motionReduced ? 'dc-still' : ''}`} {...dragProps} tabIndex={-1}>
      <DragBar className="dc-bar">
        <Lights />
        <b className="dc-title">{q.trim() ? t('search') : secLabel(sec)}</b>
        <span className="dc-bar-sp" />
        <div className="dc-seg" role="group" aria-label={`${t('grid')} / ${t('list')}`} data-nodrag>
          {(['grid', 'list'] as const).map((v) => (
            <button key={v} type="button" className={prefs.view === v ? 'on' : ''} onClick={() => setPrefs((p) => ({ ...p, view: v }))} aria-label={t(v)} aria-pressed={prefs.view === v} title={t(v)}>
              <Ico name={v} />
            </button>
          ))}
        </div>
        {sortCtl}
        {addBtn}
        {searchBox}
      </DragBar>
      <div className={`dc-body ${layout === 'mac' ? 'with-pane' : ''}`}>
        <nav className="dc-side" aria-label={t('locations')}>
          {SECTIONS.map((s) => (
            <button
              key={s}
              type="button"
              className={sec === s && !q.trim() ? 'on' : ''}
              onClick={() => {
                setSec(s);
                setQ('');
                if (layout !== 'mac') (setSel(null), setFull(false));
                else setFull(false);
              }}
            >
              <Glyph name={s} />
              <span>{secLabel(s)}</span>
              <small>{counts[s] ?? 0}</small>
            </button>
          ))}
          <p className="dc-side-note">{t('localOnly')}</p>
        </nav>
        <main className="dc-main">
          {listing}
          {current && full && <div className="dc-full">{viewer}</div>}
        </main>
        {layout === 'mac' && (
          <aside className="dc-pane" aria-label="Preview">
            {current && !full ? (
              viewer
            ) : (
              <div className="dc-pane-empty">
                <Glyph name="all" size={44} />
                <small>{t('selectHint')}</small>
              </div>
            )}
          </aside>
        )}
      </div>
      {hiddenInput}
      {overlays}
    </div>
  );
}

/* ───────────────────────────── list / grid ───────────────────────────── */

function Empty({ icon, text, action }: { icon: string; text: string; action?: { label: string; run: () => void } }) {
  return (
    <div className="dc-empty">
      <Glyph name={icon} size={46} />
      <p>{text}</p>
      {action && (
        <button type="button" className="dc-btn primary" onClick={action.run}>
          {action.label}
        </button>
      )}
    </div>
  );
}

function Thumb({ d, thumbs }: { d: Doc; thumbs: Record<string, string> }) {
  if (d.sec === 'cv')
    return (
      <span className="dc-thumb page">
        <img src={cv.pages[0]} alt="" loading="lazy" />
      </span>
    );
  if (d.file && d.fv === 'image' && thumbs[d.file.id])
    return (
      <span className="dc-thumb photo">
        <img src={thumbs[d.file.id]} alt="" loading="lazy" />
      </span>
    );
  if (d.text !== undefined)
    return (
      <span className={`dc-thumb page text ${d.sec === 'code' ? 'codey' : ''}`}>
        <span>{(d.sec === 'code' ? d.text : plain(d.text)).slice(0, 260)}</span>
        <i className={`dc-badge b-${d.sec}`}>{d.sec === 'code' ? '</>' : d.sec === 'notes' ? 'NOTE' : d.kind.slice(0, 5).toUpperCase()}</i>
      </span>
    );
  const e = (d.ext || '').slice(0, 4).toUpperCase() || 'FILE';
  const tone = d.fv === 'pdf' ? 'pdf' : d.fv === 'video' ? 'video' : d.fv === 'audio' ? 'audio' : d.fv === 'csv' || /^(XLS|XLSX|NUMB)/.test(e) ? 'sheet' : /^(PPT|PPTX|KEY)/.test(e) ? 'slides' : /^(DOC|DOCX|PAGE|ODT|RTF)/.test(e) ? 'word' : 'gen';
  return (
    <span className={`dc-thumb page file t-${tone}`}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        {d.fv === 'video' ? <path d="M8 6.5v11l9-5.5z" /> : d.fv === 'audio' ? <path d="M10 17.5a2.5 2.5 0 1 1-2.5-2.5H10V6l8-1.5v10a2.5 2.5 0 1 1-2.5-2.5H18" /> : <path d="M7 3.5h6.5L18 8v11a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 19V5A1.5 1.5 0 0 1 7 3.5z" />}
      </svg>
      <i className="dc-badge">{e}</i>
    </span>
  );
}

function DocList({ docs, view, sel, thumbs, t, showSec, onSelect, onOpen, empty, lang }: { docs: Doc[]; view: 'grid' | 'list'; sel: string | null; thumbs: Record<string, string>; t: (k: Key, x?: string) => string; showSec: boolean; onSelect: (d: Doc) => void; onOpen: (d: Doc) => void; empty: ReactNode; lang: Lang }) {
  if (!docs.length) return <div className="dc-scroll">{empty}</div>;
  return (
    <div className="dc-scroll">
      <ul className={`dc-items ${view}`} aria-label={t('title')}>
        {docs.map((d) => (
          <li key={d.id}>
            <button type="button" className={`dc-item ${sel === d.id ? 'on' : ''}`} onClick={() => onSelect(d)} onDoubleClick={() => onOpen(d)} data-doc={d.id}>
              <Thumb d={d} thumbs={thumbs} />
              <span className="dc-item-txt">
                <b>{d.title}</b>
                <small>
                  {showSec && view === 'list' ? `${T[d.sec][lang]} · ` : ''}
                  {d.sec === 'cv' ? d.meta : d.at ? fmtWhen(d.at) : d.kind}
                  {view === 'list' && d.sec !== 'cv' ? ` · ${d.file ? d.meta : d.kind}` : ''}
                </small>
              </span>
            </button>
          </li>
        ))}
      </ul>
      <p className="dc-count">
        {docs.length} {t('items')}
      </p>
    </div>
  );
}

/* ───────────────────────────── viewers ───────────────────────────── */

interface VProps {
  d: Doc;
  t: (k: Key, x?: string) => string;
  layout: 'phone' | 'tablet' | 'mac';
  device: string;
  full: boolean;
  motionReduced: boolean;
  onBack: () => void;
  onExpand?: () => void;
  onDelete?: () => void;
  onOpenNotes: () => void;
  flash: (m: string) => void;
}

function Viewer({ d, t, layout, device, full, onBack, onExpand, onDelete, onOpenNotes, flash }: VProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);
  const [run, setRun] = useState(false);
  useEffect(() => {
    if (!d.file) return;
    let live = true;
    void fileUrl(d.file.id).then((u) => {
      if (!live) return;
      if (u) setUrl(u);
      else setMissing(true);
    });
    return () => {
      live = false;
    };
  }, [d.file]);

  const savedName = () => {
    const ext = d.sec === 'code' || d.html ? 'html' : 'txt';
    return `${safeName(d.title)}.${ext}`;
  };
  const download = () => {
    if (d.sec === 'cv') return triggerDownload(cv.url, cv.fileName);
    if (d.file) return url && triggerDownload(url, d.file.name);
    if (d.text !== undefined) {
      const isHtml = d.sec === 'code' || d.html;
      const content = d.sec === 'notes' && !d.html ? `${d.title}\n\n${d.text}` : d.text;
      const u = URL.createObjectURL(new Blob([content], { type: isHtml ? 'text/html;charset=utf-8' : 'text/plain;charset=utf-8' }));
      triggerDownload(u, savedName());
      window.setTimeout(() => URL.revokeObjectURL(u), 4000);
    }
  };
  const textForShare = () => (d.text !== undefined ? (d.html ? plain(d.text) : d.text) : '');
  const canShareFile = !!d.file && typeof navigator.share === 'function';
  const share = async () => {
    const abs = new URL(cv.url, location.href).href;
    try {
      if (typeof navigator.share === 'function') {
        if (d.sec === 'cv') return void (await navigator.share({ title: cv.displayName, url: abs }));
        if (d.file && url) {
          const blob = await (await fetch(url)).blob();
          const f = new File([blob], d.file.name, { type: d.file.type });
          if (navigator.canShare?.({ files: [f] })) return void (await navigator.share({ files: [f], title: d.title }));
          return triggerDownload(url, d.file.name);
        }
        return void (await navigator.share({ title: d.title, text: textForShare() }));
      }
      const txt = d.sec === 'cv' ? abs : `${d.title}\n\n${textForShare()}`;
      await navigator.clipboard.writeText(txt);
      flash(t('copied'));
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') return;
      flash(t('copyFail'));
    }
  };
  const showShare = d.sec === 'cv' || d.text !== undefined || canShareFile;

  const subtitle = d.sec === 'cv' ? d.meta : [d.kind, d.file ? d.meta : '', d.at ? fmtWhen(d.at) : '', d.saved?.source ? t('savedFrom', d.saved.source) : ''].filter(Boolean).join(' · ');
  const showBack = layout !== 'mac' || full;

  return (
    <section className="dc-viewer" aria-label={d.title}>
      <header className="dc-vhead">
        {showBack && (
          <button type="button" className="dc-back" onClick={onBack} aria-label={layout === 'mac' ? t('close') : t('back')}>
            <Ico name={layout === 'mac' ? 'close' : 'back'} />
            {layout !== 'mac' && <span className="dc-back-l">{t('back')}</span>}
          </button>
        )}
        <div className="dc-vtitle">
          <b title={d.title}>{d.title}</b>
          <small>{subtitle}</small>
        </div>
        <div className="dc-vacts">
          {onExpand && !full && (
            <button type="button" className="dc-tbtn" onClick={onExpand} aria-label={t('expand')} title={t('expand')}>
              <Ico name="expand" />
            </button>
          )}
          {showShare && (
            <button type="button" className="dc-tbtn" onClick={() => void share()} aria-label={t('share')} title={t('share')}>
              <Ico name="share" />
            </button>
          )}
          <button type="button" className="dc-tbtn" onClick={download} aria-label={t('download')} title={t('download')} disabled={!!d.file && !url}>
            <Ico name="download" />
          </button>
          {onDelete && (
            <button type="button" className="dc-tbtn danger" onClick={onDelete} aria-label={t('del')} title={t('del')}>
              <Ico name="trash" />
            </button>
          )}
        </div>
      </header>
      <div className="dc-vbody">
        {d.sec === 'cv' ? (
          <CvView t={t} />
        ) : d.note || (d.sec === 'notes' && !d.html) ? (
          <div className="dc-doc">
            <article className="dc-paper">
              <h2>{d.title}</h2>
              <div className="dc-pre">{d.text}</div>
            </article>
            {d.note && (
              <div className="dc-actrow">
                <button type="button" className="dc-btn primary" onClick={onOpenNotes}>
                  {t('openNotes')}
                </button>
              </div>
            )}
          </div>
        ) : d.sec === 'code' ? (
          <div className="dc-codewrap">
            <div className="dc-actrow top">
              <div className="dc-seg wide" role="group">
                <button type="button" className={!run ? 'on' : ''} onClick={() => setRun(false)}>
                  <Ico name="codeview" /> {t('showCode')}
                </button>
                <button type="button" className={run ? 'on' : ''} onClick={() => setRun(true)}>
                  <Ico name="play" /> {t('run')}
                </button>
              </div>
            </div>
            {run ? (
              <>
                <iframe className="dc-run" title={`${d.title} preview`} sandbox="allow-scripts" srcDoc={d.text} />
                <p className="dc-fine">{t('sandboxNote')}</p>
              </>
            ) : (
              <CodeBlock text={d.text ?? ''} />
            )}
          </div>
        ) : d.saved ? (
          <div className="dc-doc">
            <article className="dc-paper">
              <h2>{d.title}</h2>
              {d.html ? <div className="dc-rich" dangerouslySetInnerHTML={{ __html: sanitize(d.text ?? '') }} /> : <div className="dc-pre">{d.text}</div>}
            </article>
          </div>
        ) : d.file ? (
          missing ? (
            <Fallback t={t} title={t('missing')} />
          ) : !url ? (
            <div className="dc-loading">{t('loading')}</div>
          ) : (
            <FileBody d={d} url={url} t={t} device={device} download={download} />
          )
        ) : null}
      </div>
    </section>
  );
}

function CodeBlock({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <pre className="dc-code">
      <code>
        {lines.map((l, i) => (
          <span key={i} className="ln">
            <i aria-hidden="true">{i + 1}</i>
            {l || ' '}
          </span>
        ))}
      </code>
    </pre>
  );
}

function CvView({ t }: { t: (k: Key, x?: string) => string }) {
  const [zoom, setZoom] = useState(1);
  const [page, setPage] = useState(0);
  const sc = useRef<HTMLDivElement>(null);
  const refs = useRef<(HTMLDivElement | null)[]>([]);
  const onScroll = () => {
    const el = sc.current;
    if (!el) return;
    const mid = el.scrollTop + el.clientHeight / 3;
    let cur = 0;
    refs.current.forEach((p, i) => p && p.offsetTop - el.offsetTop <= mid && (cur = i));
    setPage(cur);
  };
  const z = (dz: number) => setZoom((v) => Math.max(0.5, Math.min(3, +(v + dz).toFixed(2))));
  return (
    <div className="dc-cv">
      <div className="dc-cvbar">
        <span className="dc-pg">
          {t('page')} {page + 1} {t('of')} {cv.pages.length}
        </span>
        <div className="dc-seg">
          <button type="button" onClick={() => z(-0.25)} aria-label={t('zoomOut')} disabled={zoom <= 0.5}>
            <Ico name="minus" />
          </button>
          <button type="button" className="dc-zv" onClick={() => setZoom(1)} aria-label="100%">
            {Math.round(zoom * 100)}%
          </button>
          <button type="button" onClick={() => z(0.25)} aria-label={t('zoomIn')} disabled={zoom >= 3}>
            <Ico name="plus" />
          </button>
        </div>
        <span className="dc-bar-sp" />
        <a className="dc-btn" href={cv.url} target="_blank" rel="noopener noreferrer">
          <Ico name="open" />
          {t('openPdf')}
        </a>
        <a className="dc-btn primary" href={cv.url} download={cv.fileName}>
          <Ico name="download" />
          {t('download')}
        </a>
      </div>
      <div className="dc-cvscroll" ref={sc} onScroll={onScroll}>
        {cv.pages.map((src, i) => (
          <div
            key={src}
            className="dc-sheet"
            style={{ width: `${zoom * 100}%`, maxWidth: zoom <= 1 ? 820 : 'none' }}
            ref={(el) => {
              refs.current[i] = el;
            }}
            onDoubleClick={() => setZoom((v) => (v > 1 ? 1 : 2))}
          >
            <img src={src} alt={`${personal.name} CV — ${t('page')} ${i + 1}`} loading={i === 0 ? 'eager' : 'lazy'} draggable={false} />
          </div>
        ))}
      </div>
    </div>
  );
}

function Fallback({ t, title, sub, url, name, children }: { t: (k: Key, x?: string) => string; title: string; sub?: string; url?: string; name?: string; children?: ReactNode }) {
  return (
    <div className="dc-fallback">
      {children}
      <b>{title}</b>
      {sub && <p>{sub}</p>}
      {url && name && (
        <div className="dc-actrow">
          <a className="dc-btn" href={url} target="_blank" rel="noopener noreferrer">
            <Ico name="open" />
            {t('open')}
          </a>
          <a className="dc-btn primary" href={url} download={name}>
            <Ico name="download" />
            {t('download')}
          </a>
        </div>
      )}
    </div>
  );
}

const MAX_TEXT = 400_000;
function FileBody({ d, url, t, device }: { d: Doc; url: string; t: (k: Key, x?: string) => string; device: string; download: () => void }) {
  const f = d.file!;
  const [text, setText] = useState<string | null>(null);
  const [err, setErr] = useState(false);
  const needsText = d.fv === 'text' || d.fv === 'csv';
  useEffect(() => {
    if (!needsText) return;
    let live = true;
    fetch(url)
      .then((r) => r.text())
      .then((s) => live && setText(s))
      .catch(() => live && setErr(true));
    return () => {
      live = false;
    };
  }, [url, needsText]);

  if (d.fv === 'image')
    return (
      <div className="dc-media">
        <img src={url} alt={f.name} />
      </div>
    );
  if (d.fv === 'video')
    return (
      <div className="dc-media">
        <video src={url} controls playsInline preload="metadata" />
      </div>
    );
  if (d.fv === 'audio')
    return (
      <div className="dc-media audio">
        <Glyph name="files" size={64} />
        <b>{f.name}</b>
        <audio src={url} controls preload="metadata" />
      </div>
    );
  if (d.fv === 'pdf') {
    if (device === 'iphone')
      return (
        <Fallback t={t} title={f.name} sub={t('pdfPhone')} url={url} name={f.name}>
          <span className="dc-thumb page file t-pdf big">
            <i className="dc-badge">PDF</i>
          </span>
        </Fallback>
      );
    return (
      <div className="dc-pdf">
        <iframe src={url} title={f.name} />
        <div className="dc-actrow">
          <a className="dc-btn" href={url} target="_blank" rel="noopener noreferrer">
            <Ico name="open" />
            {t('open')}
          </a>
        </div>
      </div>
    );
  }
  if (needsText) {
    if (err) return <Fallback t={t} title={t('noPreview')} sub={t('noPreviewSub')} url={url} name={f.name} />;
    if (text === null) return <div className="dc-loading">{t('loading')}</div>;
    const cut = text.length > MAX_TEXT;
    const body = cut ? text.slice(0, MAX_TEXT) : text;
    if (d.fv === 'csv') {
      const sep = d.ext === 'tsv' || (!body.split('\n')[0].includes(',') && body.split('\n')[0].includes('\t')) ? '\t' : body.split('\n')[0].split(';').length > body.split('\n')[0].split(',').length ? ';' : ',';
      const rows = parseCsv(body, sep).filter((r) => r.some((c) => c.trim() !== ''));
      const shown = rows.slice(0, 500);
      const cols = Math.max(1, ...shown.map((r) => r.length));
      const [head, ...rest] = shown;
      return (
        <div className="dc-tablewrap">
          <table className="dc-table">
            {head && (
              <thead>
                <tr>
                  <th className="rn" />
                  {Array.from({ length: cols }, (_, i) => (
                    <th key={i}>{head[i] ?? ''}</th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {rest.map((r, ri) => (
                <tr key={ri}>
                  <td className="rn">{ri + 1}</td>
                  {Array.from({ length: cols }, (_, i) => (
                    <td key={i} className={/^-?[\d.,]+%?$/.test((r[i] ?? '').trim()) ? 'num' : ''}>
                      {r[i] ?? ''}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {(rows.length > 500 || cut) && <p className="dc-fine">{t('rows', '500')}</p>}
        </div>
      );
    }
    const isCode = !/^(txt|md|markdown|log)$/.test(d.ext ?? '') && d.ext !== '';
    return (
      <div className="dc-doc">
        {isCode ? (
          <CodeBlock text={body} />
        ) : (
          <article className="dc-paper">
            <div className="dc-pre">{body}</div>
          </article>
        )}
        {cut && <p className="dc-fine">{t('truncated')}</p>}
      </div>
    );
  }
  return (
    <Fallback t={t} title={t('noPreview')} sub={`${d.kind} · ${fmtSize(f.size)} — ${t('noPreviewSub')}`} url={url} name={f.name}>
      <Thumb d={d} thumbs={{}} />
    </Fallback>
  );
}
