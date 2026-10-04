import { DragBar, Lights } from '../components/Window';
import { useSettings } from '../system/SettingsContext';

type Lng = 'en' | 'si' | 'ta';

/**
 * v10.2 — the portfolio's own change history (not an Apple software update).
 * v10.3 — optional Sinhala and Tamil (`tr`) per entry; entries without it stay English.
 */
const LOG: { v: string; date: string; items: string[]; tr?: Record<'si' | 'ta', string[]> }[] = [
  {
    v: '10.3',
    date: 'October 2026',
    items: [
      'Original music in five language styles — English, Sinhala, Tamil, Arabic and Hindi — with Browse by language, genre and mood',
      'Real Recently Played, your own playlists, and add your own songs (stored in your browser only)',
      'Widget gallery redesigned: macOS Sonoma style on Mac, iOS 18 / iPadOS 18 style on iPhone and iPad',
      'Widgets move only in edit mode and snap to a grid',
      'Smart Stack editing and folders',
      'Every widget opens its app',
      'Dynamic Island alerts are tappable, and notifications are clearer',
      'A Welcome notification and the new Guidebook app (an A–Z guide)',
      'New apps: Learning Hub quizzes, Flashcards, Focus Planner, Goals & Tasks, Business Planner, Code Playground and Documents',
      'Settings search jumps to the exact setting',
      'Lock Screen clock font and colour',
      'New iPad wallpapers in light and dark',
      'Control Centre gallery browsable by app',
      'Refined system icons',
    ],
    tr: {
      si: [
        'භාෂා ශෛලීන් පහකින් මුල් සංගීතය — English, සිංහල, දෙමළ, අරාබි සහ හින්දි — භාෂාව, ප්‍රභේදය සහ මනෝභාවය අනුව බ්‍රවුස් කිරීම සමඟ',
        'සැබෑ "මෑතකදී වාදනය කළ" ලැයිස්තුව, ඔබේම playlists, සහ ඔබේම ගීත එක් කිරීම (ඔබේ browser එකේ පමණක් ගබඩා වේ)',
        'Widget ගැලරිය නැවත නිර්මාණය කළා: Mac හි macOS Sonoma ශෛලිය, iPhone සහ iPad හි iOS 18 / iPadOS 18 ශෛලිය',
        'Widgets චලනය වන්නේ සංස්කරණ ප්‍රකාරයේ පමණක් වන අතර ජාලකයකට ඇලී පිහිටයි',
        'Smart Stack සංස්කරණය සහ ෆෝල්ඩර',
        'සෑම widget එකක්ම එහි යෙදුම විවෘත කරයි',
        'Dynamic Island ඇඟවීම් තට්ටු කළ හැකි අතර දැනුම්දීම් වඩාත් පැහැදිලියි',
        'පිළිගැනීමේ දැනුම්දීමක් සහ නව Guidebook යෙදුම (A–Z මාර්ගෝපදේශයක්)',
        'නව යෙදුම්: Learning Hub ප්‍රශ්නාවලි, Flashcards, Focus Planner, Goals & Tasks, Business Planner, Code Playground සහ Documents',
        'Settings සෙවීම ඔබව නිශ්චිත සැකසුමටම රැගෙන යයි',
        'Lock Screen ඔරලෝසුවේ අකුරු මෝස්තරය සහ වර්ණය',
        'ආලෝක සහ අඳුරු ආකාරවලින් නව iPad බිතුපත්',
        'Control Centre ගැලරිය යෙදුම අනුව බ්‍රවුස් කළ හැකියි',
        'පිරිපහදු කළ පද්ධති අයිකන',
      ],
      ta: [
        'ஐந்து மொழி பாணிகளில் அசல் இசை — ஆங்கிலம், சிங்களம், தமிழ், அரபு மற்றும் இந்தி — மொழி, வகை மற்றும் மனநிலை வாரியாக உலாவும் வசதியுடன்',
        'உண்மையான "சமீபத்தில் இயக்கியவை", உங்கள் சொந்த playlists, மற்றும் உங்கள் சொந்தப் பாடல்களைச் சேர்த்தல் (உங்கள் browser-இல் மட்டுமே சேமிக்கப்படும்)',
        'Widget தொகுப்பு மறுவடிவமைக்கப்பட்டது: Mac-இல் macOS Sonoma பாணி, iPhone மற்றும் iPad-இல் iOS 18 / iPadOS 18 பாணி',
        'Widgets திருத்தப் பயன்முறையில் மட்டுமே நகரும், ஒரு கட்டத்தில் சரியாகப் பொருந்தும்',
        'Smart Stack திருத்தம் மற்றும் கோப்புறைகள்',
        'ஒவ்வொரு widget-உம் அதன் செயலியைத் திறக்கும்',
        'Dynamic Island அறிவிப்புகளைத் தட்டலாம், அறிவிப்புகள் இன்னும் தெளிவாக உள்ளன',
        'வரவேற்பு அறிவிப்பு மற்றும் புதிய Guidebook செயலி (A–Z வழிகாட்டி)',
        'புதிய செயலிகள்: Learning Hub வினாடி வினாக்கள், Flashcards, Focus Planner, Goals & Tasks, Business Planner, Code Playground மற்றும் Documents',
        'Settings தேடல் சரியான அமைப்புக்கே நேரடியாகச் செல்லும்',
        'Lock Screen கடிகார எழுத்துரு மற்றும் நிறம்',
        'ஒளி மற்றும் இருண்ட பாணிகளில் புதிய iPad வால்பேப்பர்கள்',
        'Control Centre தொகுப்பைச் செயலி வாரியாக உலாவலாம்',
        'மெருகூட்டப்பட்ட கணினி ஐகான்கள்',
      ],
    },
  },
  { v: '10.2', date: 'October 2026', items: ['Control Centre for iPhone and iPad: groups, Edit mode, Add a Control gallery, resize and rearrange', 'Dynamic Island: timer controls, split activities, assistant, silent mode and battery states', 'Wallpaper library per device: live, dynamic and drawn wallpapers, previews, Lock Screen wallpapers', 'Saved Lock Screens you can switch between', 'Portfolio Modes (Recruiter, Client, Developer, Presentation) and a welcome guide', 'Learning Hub, QR contact card, What’s New', 'iPhone Dock: Phone · Safari · Messages · Music; a roomier iPad Dock with App Library'] },
  { v: '10.1', date: 'October 2026', items: ['My Files with drag & drop, tags and Finder tabs', 'Safari tabs, Private Browsing and Reading List', 'Picture in Picture, Dictation, Screen Time limits and Downtime', 'Time Machine and iPhone Mirroring', 'Per-app notification settings and Scheduled Summary'] },
  { v: '10.0', date: 'October 2026', items: ['iPhone and iPad versions with their own Home Screens, Control Centre and Notification Centre', 'Content updated from the new CV', 'Ask Me AI proxy, crash recovery, offline page'] },
  { v: '9', date: 'September 2026', items: ['Original 4K wallpapers, Screen Time history, Desktop & Dock settings'] },
  { v: '8', date: '2026', items: ['Languages (English, Sinhala, Tamil), badges, Game Center, Wallet'] },
  { v: '7', date: '2026', items: ['Case Studies, Photos library, TV app, Mission Control and Spaces'] },
];

const MONTHS: Record<string, Record<'si' | 'ta', string>> = {
  October: { si: 'ඔක්තෝබර්', ta: 'அக்டோபர்' },
  September: { si: 'සැප්තැම්බර්', ta: 'செப்டம்பர்' },
};

const TX = {
  title: { en: 'What’s New in the Portfolio', si: 'Portfolio හි අලුත් දේ', ta: 'Portfolio-இல் புதியவை' },
  version: { en: 'Version {v}', si: '{v} සංස්කරණය', ta: 'பதிப்பு {v}' },
  note: {
    en: 'These are updates to this portfolio website — not Apple software updates.',
    si: 'මේවා මෙම portfolio වෙබ් අඩවියේ යාවත්කාලීන කිරීම් වේ — Apple මෘදුකාංග යාවත්කාලීන කිරීම් නොවේ.',
    ta: 'இவை இந்த portfolio இணையதளத்தின் புதுப்பிப்புகள் — Apple மென்பொருள் புதுப்பிப்புகள் அல்ல.',
  },
} satisfies Record<string, Record<Lng, string>>;

export default function WhatsNewApp() {
  const { settings } = useSettings();
  const lng: Lng = settings.language === 'si' || settings.language === 'ta' ? settings.language : 'en';
  const tx = (k: keyof typeof TX, vars: Record<string, string> = {}) => TX[k][lng].replace(/\{(\w+)\}/g, (_, v: string) => vars[v] ?? '');
  const date = (d: string) => (lng === 'en' ? d : d.replace(/[A-Za-z]+/g, (m) => MONTHS[m]?.[lng] ?? m));
  return (
    <div className="wn">
      <DragBar className="wn-bar">
        <Lights />
        <b>{tx('title')}</b>
      </DragBar>
      <div className="wn-body">
        {LOG.map((r, i) => (
          <section key={r.v} className={i === 0 ? 'latest' : ''}>
            <h3>
              {tx('version', { v: r.v })} <small>{date(r.date)}</small>
            </h3>
            <ul>
              {(lng !== 'en' && r.tr ? r.tr[lng] : r.items).map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </section>
        ))}
        <p className="wn-note">{tx('note')}</p>
      </div>
    </div>
  );
}
