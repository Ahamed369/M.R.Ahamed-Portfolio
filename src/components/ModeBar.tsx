import { useEffect, useRef } from 'react';
import { useSettings } from '../system/SettingsContext';
import { useWM } from '../system/WindowManager';
import { personal, socials } from '../data/portfolio';
import type { AppId, PortfolioMode } from '../system/types';

type Item = { label: string; app?: AppId; args?: Record<string, string>; href?: string };

/** v10.2 — what each portfolio mode puts first */
export const MODES: Record<Exclude<PortfolioMode, 'explore'>, { label: string; desc: string; items: Item[] }> = {
  recruiter: {
    label: 'Recruiter',
    desc: 'About, skills, projects, experience, education, CV and contact — one tap each.',
    items: [
      { label: 'About', app: 'about' },
      { label: 'Skills', app: 'notes' },
      { label: 'Projects', app: 'xcode' },
      { label: 'Experience', app: 'finder', args: { folder: 'all' } },
      { label: 'Education', app: 'finder', args: { folder: 'education' } },
      { label: 'CV', app: 'preview' },
      { label: 'Contact', app: 'hireme' },
    ],
  },
  client: {
    label: 'Client',
    desc: 'Services, work, business experience and the quickest ways to get in touch.',
    items: [
      { label: 'About', app: 'about' },
      { label: 'Services', app: 'services' },
      { label: 'Work', app: 'casestudies' },
      { label: 'Business', app: 'finder', args: { folder: 'business' } },
      { label: 'Contact', app: 'hireme' },
      { label: 'Email', href: `mailto:${personal.email}` },
      { label: 'WhatsApp', href: socials.whatsapp },
    ],
  },
  developer: {
    label: 'Developer',
    desc: 'Skills and stacks, projects and case studies, GitHub and the Terminal.',
    items: [
      { label: 'Skills', app: 'notes' },
      { label: 'Projects', app: 'xcode' },
      { label: 'Case Studies', app: 'casestudies' },
      { label: 'Terminal', app: 'terminal' },
      { label: 'GitHub', href: socials.github },
      { label: 'Learning Hub', app: 'learning' },
    ],
  },
  presentation: {
    label: 'Presentation',
    desc: 'A guided walk-through: Welcome → About → Skills → Projects → Experience → Education → Contact.',
    items: [],
  },
};

const STEPS: (Item & { caption: string })[] = [
  { label: 'Welcome', caption: `Welcome — this is ${personal.name}’s interactive portfolio.` },
  { label: 'About', app: 'about', caption: `${personal.shortTitle} based in ${personal.city}.` },
  { label: 'Skills', app: 'notes', caption: 'Skills, each with the projects that prove it.' },
  { label: 'Projects', app: 'xcode', caption: 'Projects with their stacks and source code.' },
  { label: 'Experience', app: 'finder', args: { folder: 'all' }, caption: 'Experience across technology, business and leadership.' },
  { label: 'Education', app: 'finder', args: { folder: 'education' }, caption: 'Education and qualifications.' },
  { label: 'Contact', app: 'hireme', caption: `${personal.status} — here’s how to get in touch.` },
];

type Lng = 'en' | 'si' | 'ta';

/** v10.3 — Sinhala and Tamil for the labels above (translated at display time; ids stay English). */
const LABELS: Record<string, Record<'si' | 'ta', string>> = {
  Recruiter: { si: 'බඳවා ගන්නා', ta: 'ஆட்சேர்ப்பாளர்' },
  Client: { si: 'සේවාදායක', ta: 'வாடிக்கையாளர்' },
  Developer: { si: 'සංවර්ධක', ta: 'டெவலப்பர்' },
  Presentation: { si: 'ඉදිරිපත් කිරීම', ta: 'விளக்கக்காட்சி' },
  Welcome: { si: 'සාදරයෙන් පිළිගනිමු', ta: 'வரவேற்பு' },
  About: { si: 'මා ගැන', ta: 'என்னைப் பற்றி' },
  Skills: { si: 'කුසලතා', ta: 'திறன்கள்' },
  Projects: { si: 'ව්‍යාපෘති', ta: 'திட்டங்கள்' },
  Experience: { si: 'අත්දැකීම්', ta: 'அனுபவம்' },
  Education: { si: 'අධ්‍යාපනය', ta: 'கல்வி' },
  CV: { si: 'CV', ta: 'CV' },
  Contact: { si: 'සම්බන්ධ වන්න', ta: 'தொடர்பு' },
  Services: { si: 'සේවා', ta: 'சேவைகள்' },
  Work: { si: 'කාර්යයන්', ta: 'பணிகள்' },
  Business: { si: 'ව්‍යාපාර', ta: 'வணிகம்' },
  Email: { si: 'ඊමේල්', ta: 'மின்னஞ்சல்' },
  'Case Studies': { si: 'සිද්ධි අධ්‍යයන', ta: 'வழக்கு ஆய்வுகள்' },
  Terminal: { si: 'Terminal', ta: 'Terminal' },
  'Learning Hub': { si: 'Learning Hub', ta: 'Learning Hub' },
};

const TX = {
  recruiterDesc: {
    en: 'About, skills, projects, experience, education, CV and contact — one tap each.',
    si: 'මා ගැන, කුසලතා, ව්‍යාපෘති, අත්දැකීම්, අධ්‍යාපනය, CV සහ සම්බන්ධතා — සෑම එකක්ම එක් තට්ටුවකින්.',
    ta: 'என்னைப் பற்றி, திறன்கள், திட்டங்கள், அனுபவம், கல்வி, CV மற்றும் தொடர்பு — ஒவ்வொன்றும் ஒரே தட்டலில்.',
  },
  clientDesc: {
    en: 'Services, work, business experience and the quickest ways to get in touch.',
    si: 'සේවා, කාර්යයන්, ව්‍යාපාරික අත්දැකීම් සහ සම්බන්ධ වීමට ඉක්මන්ම ක්‍රම.',
    ta: 'சேவைகள், பணிகள், வணிக அனுபவம் மற்றும் தொடர்பு கொள்ள விரைவான வழிகள்.',
  },
  developerDesc: {
    en: 'Skills and stacks, projects and case studies, GitHub and the Terminal.',
    si: 'කුසලතා සහ තාක්ෂණ ස්ටැක්, ව්‍යාපෘති සහ සිද්ධි අධ්‍යයන, GitHub සහ Terminal.',
    ta: 'திறன்கள் மற்றும் தொழில்நுட்பத் தொகுப்புகள், திட்டங்கள் மற்றும் வழக்கு ஆய்வுகள், GitHub மற்றும் Terminal.',
  },
  presentationDesc: {
    en: 'A guided walk-through: Welcome → About → Skills → Projects → Experience → Education → Contact.',
    si: 'මඟපෙන්වූ ගමනක්: සාදරයෙන් පිළිගනිමු → මා ගැන → කුසලතා → ව්‍යාපෘති → අත්දැකීම් → අධ්‍යාපනය → සම්බන්ධ වන්න.',
    ta: 'வழிகாட்டப்பட்ட சுற்றுப்பயணம்: வரவேற்பு → என்னைப் பற்றி → திறன்கள் → திட்டங்கள் → அனுபவம் → கல்வி → தொடர்பு.',
  },
  capWelcome: { en: 'Welcome — this is {name}’s interactive portfolio.', si: 'සාදරයෙන් පිළිගනිමු — මෙය {name} ගේ අන්තර්ක්‍රියාකාරී portfolio එකයි.', ta: 'வரவேற்கிறோம் — இது {name}-இன் ஊடாடும் portfolio.' },
  capAbout: { en: '{title} based in {city}.', si: '{city} හි පදිංචි {title}.', ta: '{city}-இல் உள்ள {title}.' },
  capSkills: { en: 'Skills, each with the projects that prove it.', si: 'කුසලතා, ඒ සෑම එකක්ම සනාථ කරන ව්‍යාපෘති සමඟ.', ta: 'திறன்கள், ஒவ்வொன்றும் அதை நிரூபிக்கும் திட்டங்களுடன்.' },
  capProjects: { en: 'Projects with their stacks and source code.', si: 'තාක්ෂණ ස්ටැක් සහ මූලාශ්‍ර කේතය සහිත ව්‍යාපෘති.', ta: 'தொழில்நுட்பத் தொகுப்புகள் மற்றும் மூலக் குறியீட்டுடன் திட்டங்கள்.' },
  capExperience: { en: 'Experience across technology, business and leadership.', si: 'තාක්ෂණය, ව්‍යාපාර සහ නායකත්වය පුරා අත්දැකීම්.', ta: 'தொழில்நுட்பம், வணிகம் மற்றும் தலைமைத்துவம் முழுவதும் அனுபவம்.' },
  capEducation: { en: 'Education and qualifications.', si: 'අධ්‍යාපනය සහ සුදුසුකම්.', ta: 'கல்வி மற்றும் தகுதிகள்.' },
  capContact: { en: '{status} — here’s how to get in touch.', si: '{status} — සම්බන්ධ වන්නේ මෙසේයි.', ta: '{status} — தொடர்பு கொள்வது இப்படித்தான்.' },
  previous: { en: '‹ Previous', si: '‹ පෙර', ta: '‹ முந்தைய' },
  previousAria: { en: 'Previous step', si: 'පෙර පියවර', ta: 'முந்தைய படி' },
  next: { en: 'Next ›', si: 'ඊළඟ ›', ta: 'அடுத்து ›' },
  finish: { en: 'Finish', si: 'අවසන්', ta: 'முடி' },
  exitPresentation: { en: 'Exit Presentation', si: 'ඉදිරිපත් කිරීමෙන් ඉවත් වන්න', ta: 'விளக்கக்காட்சியிலிருந்து வெளியேறு' },
  modeAria: { en: '{mode} mode', si: '{mode} ප්‍රකාරය', ta: '{mode} பயன்முறை' },
  exitMode: { en: 'Exit {mode} mode', si: '{mode} ප්‍රකාරයෙන් ඉවත් වන්න', ta: '{mode} பயன்முறையிலிருந்து வெளியேறு' },
  modeName: { en: '{mode} Mode', si: '{mode} ප්‍රකාරය', ta: '{mode} பயன்முறை' },
  exploreFreely: { en: 'Explore freely', si: 'නිදහසේ ගවේෂණය කරන්න', ta: 'சுதந்திரமாக ஆராயுங்கள்' },
  exploreDesc: { en: 'Everything, your way.', si: 'සියල්ල, ඔබේ ආකාරයට.', ta: 'எல்லாமே, உங்கள் வழியில்.' },
  portfolioMode: { en: 'Portfolio mode', si: 'Portfolio ප්‍රකාරය', ta: 'Portfolio பயன்முறை' },
} satisfies Record<string, Record<Lng, string>>;

const STEP_CAPS: (keyof typeof TX)[] = ['capWelcome', 'capAbout', 'capSkills', 'capProjects', 'capExperience', 'capEducation', 'capContact'];
const DESC_KEYS: Record<Exclude<PortfolioMode, 'explore'>, keyof typeof TX> = {
  recruiter: 'recruiterDesc',
  client: 'clientDesc',
  developer: 'developerDesc',
  presentation: 'presentationDesc',
};
const CAP_VARS = { name: personal.name, title: personal.shortTitle, city: personal.city, status: personal.status };

const makeTx = (lng: Lng) => (k: keyof typeof TX, vars: Record<string, string> = {}) => TX[k][lng].replace(/\{(\w+)\}/g, (_, v: string) => vars[v] ?? '');
const makeLbl = (lng: Lng) => (s: string) => (lng === 'en' ? s : (LABELS[s]?.[lng] ?? s));

/**
 * v10.2 — Portfolio Modes. A small bar that puts the right things first for a
 * recruiter, a client or a developer, or walks through the portfolio step by
 * step (Presentation). Switch modes in Settings, the  menu, the Assistant, or
 * the bar itself; Exit returns to free exploring.
 */
export function ModeBar({ variant }: { variant: 'mac' | 'ios' }) {
  const { settings, update } = useSettings();
  const lng: Lng = settings.language === 'si' || settings.language === 'ta' ? settings.language : 'en';
  const tx = makeTx(lng);
  const lbl = makeLbl(lng);
  const wm = useWM();
  const mode = settings.portfolioMode ?? 'explore';
  const step = Math.max(0, Math.min(STEPS.length - 1, settings.presentStep ?? 0));
  const opened = useRef<AppId | null>(null);
  const run = (it: Item) => {
    if (it.href) window.open(it.href, '_blank', 'noopener,noreferrer');
    else if (it.app) wm.open(it.app, it.args);
  };
  // presentation: open the step's app (and close the previous step's window on the Mac)
  useEffect(() => {
    if (mode !== 'presentation') return;
    const s = STEPS[step];
    if (variant === 'mac' && opened.current && opened.current !== s.app) wm.close(opened.current);
    if (s.app) wm.open(s.app, s.args);
    opened.current = s.app ?? null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, step]);
  useEffect(() => {
    if (mode !== 'presentation') return;
    const k = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest?.('input, textarea, [contenteditable="true"]')) return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown') update({ presentStep: Math.min(STEPS.length - 1, step + 1) });
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') update({ presentStep: Math.max(0, step - 1) });
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [mode, step, update]);
  if (mode === 'explore') return null;
  const exit = () => update({ portfolioMode: 'explore', presentStep: 0 });
  if (mode === 'presentation') {
    const s = STEPS[step];
    return (
      <div className={`modebar mb-${variant} present`} role="region" aria-label={lbl('Presentation')}>
        <span className="mb-steps" aria-hidden="true">
          {STEPS.map((x, i) => (
            <i key={x.label} className={i === step ? 'on' : i < step ? 'done' : ''} />
          ))}
        </span>
        <span className="mb-cap">
          <b>
            {step + 1}/{STEPS.length} · {lbl(s.label)}
          </b>
          <small>{lng === 'en' ? s.caption : tx(STEP_CAPS[step], CAP_VARS)}</small>
        </span>
        <button type="button" onClick={() => update({ presentStep: step - 1 })} disabled={step === 0} aria-label={tx('previousAria')}>
          {tx('previous')}
        </button>
        {step < STEPS.length - 1 ? (
          <button type="button" className="primary" onClick={() => update({ presentStep: step + 1 })}>
            {tx('next')}
          </button>
        ) : (
          <button type="button" className="primary" onClick={exit}>
            {tx('finish')}
          </button>
        )}
        <button type="button" className="mb-x" onClick={exit} aria-label={tx('exitPresentation')}>
          ✕
        </button>
      </div>
    );
  }
  const m = MODES[mode];
  return (
    <div className={`modebar mb-${variant}`} role="toolbar" aria-label={tx('modeAria', { mode: lbl(m.label) })}>
      <span className="mb-tag">{lbl(m.label)}</span>
      <span className="mb-items">
        {m.items.map((it) => (
          <button key={it.label} type="button" onClick={() => run(it)}>
            {lbl(it.label)}
            {it.href && <i aria-hidden="true"> ↗</i>}
          </button>
        ))}
      </span>
      <button type="button" className="mb-x" onClick={exit} aria-label={tx('exitMode', { mode: lbl(m.label) })}>
        ✕
      </button>
    </div>
  );
}

export function ModePicker({ onPick }: { onPick?: () => void }) {
  const { settings, update } = useSettings();
  const lng: Lng = settings.language === 'si' || settings.language === 'ta' ? settings.language : 'en';
  const tx = makeTx(lng);
  const lbl = makeLbl(lng);
  const cur = settings.portfolioMode ?? 'explore';
  const all: [PortfolioMode, string, string][] = [['explore', tx('exploreFreely'), tx('exploreDesc')], ...(Object.entries(MODES) as [Exclude<PortfolioMode, 'explore'>, { label: string; desc: string }][]).map(([k, v]) => [k, tx('modeName', { mode: lbl(v.label) }), lng === 'en' ? v.desc : tx(DESC_KEYS[k])] as [PortfolioMode, string, string])];
  return (
    <div className="mode-pick" role="radiogroup" aria-label={tx('portfolioMode')}>
      {all.map(([k, l, d]) => (
        <button key={k} type="button" role="radio" aria-checked={cur === k} className={cur === k ? 'on' : ''} onClick={() => (update({ portfolioMode: k, presentStep: 0 }), onPick?.())}>
          <b>{l}</b>
          <small>{d}</small>
        </button>
      ))}
    </div>
  );
}
