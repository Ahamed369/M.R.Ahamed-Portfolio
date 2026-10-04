import { useEffect, useState } from 'react';
import { useSystem } from '../system/SystemContext';
import { useSettings } from '../system/SettingsContext';
import { personal } from '../data/portfolio';
import { openAppLink } from '../system/notify';
import { ModePicker } from './ModeBar';
import { SysIcon } from './SysIcons';
import { FirstHints } from './FirstHints';

const KEY = 'mra-onboarded-v10';
export const replayOnboarding = () => window.dispatchEvent(new Event('mra-onboarding'));

type Lng = 'en' | 'si' | 'ta';
type Dev = 'mac' | 'ipad' | 'iphone';
type Tx = Record<Lng, string>;

/** v10.3 — short hints per device (English · Sinhala · Tamil) */
const HINTS: Record<Dev, [Tx, Tx][]> = {
  mac: [
    [
      { en: 'Dock', si: 'Dock', ta: 'Dock' },
      { en: 'Click an app to open it. Hover to magnify; right-click for options.', si: 'යෙදුමක් විවෘත කිරීමට එය ක්ලික් කරන්න. විශාල කිරීමට hover කරන්න; විකල්ප සඳහා right-click කරන්න.', ta: 'ஒரு செயலியைத் திறக்க அதைக் கிளிக் செய்யுங்கள். பெரிதாக்க hover செய்யுங்கள்; விருப்பங்களுக்கு right-click செய்யுங்கள்.' },
    ],
    [
      { en: 'Launchpad & Spotlight', si: 'Launchpad සහ Spotlight', ta: 'Launchpad & Spotlight' },
      { en: 'Launchpad shows every app. Press ⌘K or Ctrl+Space to search.', si: 'Launchpad හි සියලු යෙදුම් පෙන්වයි. සෙවීමට ⌘K හෝ Ctrl+Space ඔබන්න.', ta: 'Launchpad எல்லா செயலிகளையும் காட்டும். தேட ⌘K அல்லது Ctrl+Space அழுத்துங்கள்.' },
    ],
    [
      { en: 'Windows', si: 'කවුළු', ta: 'சாளரங்கள்' },
      { en: 'Drag, resize, minimise with the Genie effect, or tile with the green button.', si: 'ඇදගෙන යන්න, ප්‍රමාණය වෙනස් කරන්න, Genie ආකාරයෙන් කුඩා කරන්න, නැතහොත් කොළ බොත්තමෙන් පෙළගස්වන්න.', ta: 'இழுக்கவும், அளவை மாற்றவும், Genie விளைவுடன் சிறிதாக்கவும், அல்லது பச்சை பொத்தானால் அடுக்கவும்.' },
    ],
    [
      { en: 'Widgets', si: 'Widgets', ta: 'Widgets' },
      { en: 'Right-click the desktop → Edit Widgets to add, move or remove them. They only move while editing.', si: 'Desktop එක right-click කර → Edit Widgets මගින් එකතු කරන්න, ගෙනයන්න හෝ ඉවත් කරන්න. ඒවා ගෙනයන්නේ සංස්කරණයේදී පමණි.', ta: 'Desktop-ஐ right-click செய்து → Edit Widgets மூலம் சேர்க்க, நகர்த்த அல்லது நீக்கலாம். திருத்தும்போது மட்டுமே நகரும்.' },
    ],
    [
      { en: 'Control Center', si: 'පාලන මධ්‍යස්ථානය', ta: 'கட்டுப்பாட்டு மையம்' },
      { en: 'The switches icon in the menu bar: appearance, sound, Focus and more.', si: 'මෙනු තීරුවේ ස්විච අයිකනය: පෙනුම, ශබ්දය, Focus සහ තවත් දේ.', ta: 'மெனு பட்டியில் உள்ள சுவிட்ச் ஐகான்: தோற்றம், ஒலி, Focus மற்றும் பல.' },
    ],
  ],
  ipad: [
    [
      { en: 'Home Screen', si: 'මුල් තිරය', ta: 'முகப்புத் திரை' },
      { en: 'Tap an app. Touch and hold to edit, add widgets or make folders.', si: 'යෙදුමක් තට්ටු කරන්න. සංස්කරණයට, widgets එකතු කිරීමට හෝ ෆෝල්ඩර සෑදීමට ඔබාගෙන සිටින්න.', ta: 'ஒரு செயலியைத் தட்டுங்கள். திருத்த, widgets சேர்க்க அல்லது கோப்புறைகள் உருவாக்க அழுத்திப் பிடியுங்கள்.' },
    ],
    [
      { en: 'Dock & App Library', si: 'Dock සහ යෙදුම් පුස්තකාලය', ta: 'Dock & செயலி நூலகம்' },
      { en: 'Favourites, recent apps and the App Library live in the Dock.', si: 'ප්‍රියතම, මෑත යෙදුම් සහ යෙදුම් පුස්තකාලය Dock එකේ ඇත.', ta: 'பிடித்தவை, சமீபத்திய செயலிகள் மற்றும் செயலி நூலகம் Dock-இல் உள்ளன.' },
    ],
    [
      { en: 'Control Centre', si: 'පාලන මධ්‍යස්ථානය', ta: 'கட்டுப்பாட்டு மையம்' },
      { en: 'Swipe down from the top-right corner (or tap the status icons).', si: 'ඉහළ දකුණු කෙළවරේ සිට පහළට swipe කරන්න (හෝ තත්ව අයිකන තට්ටු කරන්න).', ta: 'மேல் வலது மூலையிலிருந்து கீழே ஸ்வைப் செய்யுங்கள் (அல்லது நிலை ஐகான்களைத் தட்டுங்கள்).' },
    ],
    [
      { en: 'Multitasking', si: 'බහුකාර්ය', ta: 'பல்பணி' },
      { en: 'Open two apps side by side, or switch with the App Switcher.', si: 'යෙදුම් දෙකක් පැත්තෙන් පැත්තට විවෘත කරන්න, නැතහොත් App Switcher මගින් මාරු වන්න.', ta: 'இரண்டு செயலிகளை அருகருகே திறக்கவும், அல்லது App Switcher மூலம் மாறவும்.' },
    ],
  ],
  iphone: [
    [
      { en: 'Home Screen', si: 'මුල් තිරය', ta: 'முகப்புத் திரை' },
      { en: 'Tap an app; swipe up from the bottom to go home. Touch and hold to edit widgets.', si: 'යෙදුමක් තට්ටු කරන්න; මුලට යාමට පහළ සිට ඉහළට swipe කරන්න. Widgets සංස්කරණයට ඔබාගෙන සිටින්න.', ta: 'ஒரு செயலியைத் தட்டுங்கள்; முகப்புக்குச் செல்ல கீழிருந்து மேலே ஸ்வைப் செய்யுங்கள். Widgets திருத்த அழுத்திப் பிடியுங்கள்.' },
    ],
    [
      { en: 'Control Centre', si: 'පාලන මධ්‍යස්ථානය', ta: 'கட்டுப்பாட்டு மையம்' },
      { en: 'Swipe down from the top-right corner.', si: 'ඉහළ දකුණු කෙළවරේ සිට පහළට swipe කරන්න.', ta: 'மேல் வலது மூலையிலிருந்து கீழே ஸ்வைப் செய்யுங்கள்.' },
    ],
    [
      { en: 'Notification Centre', si: 'දැනුම්දීම් මධ්‍යස්ථානය', ta: 'அறிவிப்பு மையம்' },
      { en: 'Swipe down from the top-left.', si: 'ඉහළ වම් පැත්තේ සිට පහළට swipe කරන්න.', ta: 'மேல் இடப்புறத்திலிருந்து கீழே ஸ்வைப் செய்யுங்கள்.' },
    ],
    [
      { en: 'Dynamic Island', si: 'Dynamic Island', ta: 'Dynamic Island' },
      { en: 'Shows music, timers and alerts — tap to open, hold to expand.', si: 'සංගීතය, ටයිමර සහ ඇඟවීම් පෙන්වයි — විවෘත කිරීමට තට්ටු කරන්න, විශාල කිරීමට ඔබාගෙන සිටින්න.', ta: 'இசை, டைமர்கள் மற்றும் அறிவிப்புகளைக் காட்டும் — திறக்கத் தட்டுங்கள், விரிவாக்க அழுத்திப் பிடியுங்கள்.' },
    ],
  ],
};

const TX = {
  guide: { en: 'Welcome guide', si: 'පිළිගැනීමේ මාර්ගෝපදේශය', ta: 'வரவேற்பு வழிகாட்டி' },
  skip: { en: 'Skip', si: 'මඟ හරින්න', ta: 'தவிர்' },
  welcome: { en: 'Welcome to {name}’s Portfolio', si: '{name} ගේ Portfolio වෙත සාදරයෙන් පිළිගනිමු', ta: '{name}-இன் Portfolio-க்கு வரவேற்கிறோம்' },
  intro: {
    en: 'An interactive portfolio inspired by macOS, iPadOS and iOS. Everything here works — apps, settings, Control Centre and more — and it all tells you about {name}, a {title} in {city}.',
    si: 'macOS, iPadOS සහ iOS ආශ්‍රයෙන් සැකසූ අන්තර්ක්‍රියාකාරී portfolio එකකි. මෙහි සියල්ල ක්‍රියා කරයි — යෙදුම්, සැකසුම්, පාලන මධ්‍යස්ථානය සහ තවත් — සියල්ල {city} හි {title} කෙනෙකු වන {name} ගැන පවසයි.',
    ta: 'macOS, iPadOS மற்றும் iOS-ஆல் ஈர்க்கப்பட்ட ஊடாடும் portfolio. இங்கே எல்லாமே இயங்கும் — செயலிகள், அமைப்புகள், கட்டுப்பாட்டு மையம் மற்றும் பல — அனைத்தும் {city}-இல் உள்ள {title} {name} பற்றிச் சொல்கின்றன.',
  },
  notApple: {
    en: 'It isn’t made by or affiliated with Apple. Nothing you do here leaves your browser unless you choose to contact him.',
    si: 'මෙය Apple විසින් සාදන ලද්දක් හෝ Apple හා සම්බන්ධ දෙයක් නොවේ. ඔබ ඔහු හා සම්බන්ධ වීමට තෝරා නොගන්නේ නම් ඔබ කරන කිසිවක් ඔබේ browser එකෙන් පිටතට නොයයි.',
    ta: 'இது Apple-ஆல் உருவாக்கப்பட்டதோ Apple-உடன் தொடர்புடையதோ அல்ல. நீங்கள் அவரைத் தொடர்பு கொள்ளத் தேர்ந்தெடுக்காவிட்டால் நீங்கள் செய்யும் எதுவும் உங்கள் browser-ஐ விட்டு வெளியேறாது.',
  },
  using: { en: 'Using the {dev} version', si: '{dev} සංස්කරණය භාවිතය', ta: '{dev} பதிப்பைப் பயன்படுத்துதல்' },
  explore: { en: 'How would you like to explore?', si: 'ඔබ ගවේෂණය කිරීමට කැමති කෙසේද?', ta: 'எப்படி ஆராய விரும்புகிறீர்கள்?' },
  modeNote: { en: 'You can change this any time in Settings → Portfolio Mode.', si: 'ඔබට මෙය ඕනෑම වේලාවක Settings → Portfolio Mode හි වෙනස් කළ හැක.', ta: 'இதை எப்போது வேண்டுமானாலும் Settings → Portfolio Mode-இல் மாற்றலாம்.' },
  set: { en: 'You’re all set', si: 'ඔබ සූදානම්', ta: 'நீங்கள் தயார்' },
  finishText: {
    en: 'Open About Me to start, or ask the Assistant anything about {name}. For every feature, gesture and app explained step by step, open the full Guidebook — it’s always in the Help menu, Settings and Spotlight.',
    si: 'ආරම්භ කිරීමට About Me විවෘත කරන්න, නැතහොත් {name} ගැන ඕනෑම දෙයක් Assistant ගෙන් අසන්න. සෑම විශේෂාංගයක්, අභිනයක් සහ යෙදුමක් පියවරෙන් පියවර පැහැදිලි කිරීමට සම්පූර්ණ Guidebook විවෘත කරන්න — එය සැමවිටම Help මෙනුව, Settings සහ Spotlight හි ඇත.',
    ta: 'தொடங்க About Me-ஐத் திறக்கவும், அல்லது {name} பற்றி எதையும் Assistant-இடம் கேளுங்கள். ஒவ்வொரு அம்சம், சைகை மற்றும் செயலியையும் படிப்படியாக அறிய முழு Guidebook-ஐத் திறக்கவும் — அது எப்போதும் Help மெனு, Settings மற்றும் Spotlight-இல் உள்ளது.',
  },
  fullGuide: { en: 'Full Guidebook', si: 'සම්පූර්ණ Guidebook', ta: 'முழு Guidebook' },
  back: { en: 'Back', si: 'ආපසු', ta: 'பின்' },
  cont: { en: 'Continue', si: 'ඉදිරියට', ta: 'தொடர்க' },
  next: { en: 'Next', si: 'ඊළඟ', ta: 'அடுத்து' },
  finish: { en: 'Finish', si: 'අවසන්', ta: 'முடி' },
} satisfies Record<string, Tx>;

/**
 * v10.2 — a short first-visit guide: welcome, how to use this device, pick a
 * Portfolio Mode, done. Skippable, shown once, and replayable from Settings or
 * the Help menu. v10.3 — a "Full Guidebook" button opens the complete A–Z
 * Guidebook app; Sinhala and Tamil follow the interface language.
 */
export function Onboarding({ device }: { device: Dev }) {
  const sys = useSystem();
  const { settings } = useSettings();
  const lng: Lng = settings.language === 'si' || settings.language === 'ta' ? settings.language : 'en';
  const tx = (k: keyof typeof TX, vars: Record<string, string> = {}) => TX[k][lng].replace(/\{(\w+)\}/g, (_, v: string) => vars[v] ?? '');
  const [open, setOpen] = useState(() => {
    try {
      return !localStorage.getItem(KEY);
    } catch {
      return false;
    }
  });
  const [step, setStep] = useState(0);
  useEffect(() => {
    const on = () => (setStep(0), setOpen(true));
    window.addEventListener('mra-onboarding', on);
    return () => window.removeEventListener('mra-onboarding', on);
  }, []);
  if (!open || sys.phase !== 'ready' || sys.locked) return <FirstHints device={device} paused={open} />;
  const done = () => {
    try {
      localStorage.setItem(KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
    setOpen(false);
  };
  const openGuide = () => {
    done();
    window.setTimeout(() => openAppLink('guidebook'), 120);
  };
  const last = 3;
  const devName = device === 'mac' ? 'Mac' : device === 'ipad' ? 'iPad' : 'iPhone';
  const vars = { name: personal.name, title: personal.shortTitle.toLowerCase(), city: personal.city, dev: devName };
  return (
    <div className={`ob-back ob-${device}`} role="dialog" aria-modal="true" aria-label={tx('guide')}>
      <div className="ob">
        <button type="button" className="ob-skip" onClick={done}>
          {tx('skip')}
        </button>
        <div className="ob-dots" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => (
            <i key={i} className={i === step ? 'on' : ''} />
          ))}
        </div>
        {step === 0 && (
          <div className="ob-page">
            <span className="ob-emblem" aria-hidden="true">
              &lt;/&gt;
            </span>
            <h2>{tx('welcome', vars)}</h2>
            <p>{tx('intro', vars)}</p>
            <p className="ob-small">{tx('notApple')}</p>
          </div>
        )}
        {step === 1 && (
          <div className="ob-page">
            <h2>{tx('using', vars)}</h2>
            <ul className="ob-hints">
              {HINTS[device].map(([t, d]) => (
                <li key={t.en}>
                  <b>{t[lng]}</b>
                  <span>{d[lng]}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {step === 2 && (
          <div className="ob-page">
            <h2>{tx('explore')}</h2>
            <p className="ob-small">{tx('modeNote')}</p>
            <ModePicker />
          </div>
        )}
        {step === 3 && (
          <div className="ob-page">
            <span className="ob-emblem ok" aria-hidden="true">
              <SysIcon n="check" size={30} />
            </span>
            <h2>{tx('set')}</h2>
            <p>{tx('finishText', vars)}</p>
          </div>
        )}
        <button type="button" className="ob-guide" onClick={openGuide}>
          <SysIcon n="info" size={15} /> {tx('fullGuide')}
        </button>
        <div className="ob-btns">
          {step > 0 ? (
            <button type="button" onClick={() => setStep(step - 1)}>
              {tx('back')}
            </button>
          ) : (
            <span />
          )}
          {step < last ? (
            <button type="button" className="primary" onClick={() => setStep(step + 1)}>
              {step === 0 ? tx('cont') : tx('next')}
            </button>
          ) : (
            <button type="button" className="primary" onClick={done}>
              {tx('finish')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
