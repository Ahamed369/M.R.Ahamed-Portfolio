/**
 * v8 — interface language (System Settings → General → Language & Region,
 * the menu-bar language extra, or the Terminal `lang` command).
 * System surfaces (menu bar, notifications, lock screen, Control Center,
 * Hire Me, Guestbook, Share) are translated; portfolio content stays in
 * English, the language of the CV.
 */
export type Lang = 'en' | 'si' | 'ta';

let current: Lang = 'en';
export const setLang = (l: Lang) => {
  current = l;
};
export const getLang = () => current;

export const LANGS: { id: Lang; label: string; native: string }[] = [
  { id: 'en', label: 'English', native: 'English' },
  { id: 'si', label: 'Sinhala', native: 'සිංහල' },
  { id: 'ta', label: 'Tamil', native: 'தமிழ்' },
];

const D = {
  welcomeTitle: {
    en: 'Welcome!',
    si: 'සාදරයෙන් පිළිගනිමු!',
    ta: 'வரவேற்கிறோம்!',
  },
  welcomeBody: {
    en: 'Read the Guidebook to discover how this portfolio works and explore all its interactive features.',
    si: 'මෙම portfolio එක ක්‍රියා කරන ආකාරය සහ එහි සියලු අන්තර්ක්‍රියාකාරී විශේෂාංග දැනගැනීමට Guidebook කියවන්න.',
    ta: 'இந்த portfolio எப்படி இயங்குகிறது என்பதையும் அதன் அனைத்து ஊடாடும் அம்சங்களையும் அறிய Guidebook-ஐப் படியுங்கள்.',
  },
  openGuide: { en: 'Open Guidebook', si: 'Guidebook විවෘත කරන්න', ta: 'Guidebook-ஐத் திற' },
  takeTour: { en: 'Take the Tour', si: 'චාරිකාව අරඹන්න', ta: 'சுற்றிப் பாருங்கள்' },
  hireMe: { en: 'Hire Me', si: 'මාව බඳවා ගන්න', ta: 'என்னை பணியமர்த்துங்கள்' },
  followLabel: { en: 'Stay connected', si: 'සම්බන්ධව සිටින්න', ta: 'இணைந்திருங்கள்' },
  followTitle: { en: 'Follow me on social media', si: 'සමාජ මාධ්‍යයේ මාව follow කරන්න', ta: 'சமூக ஊடகங்களில் என்னைப் பின்தொடருங்கள்' },
  followBody: {
    en: 'Tap an icon to open my profile — GitHub, LinkedIn, Instagram, Facebook, Threads, WhatsApp and Spotify.',
    si: 'මගේ profile එක විවෘත කිරීමට icon එකක් ඔබන්න — GitHub, LinkedIn, Instagram, Facebook, Threads, WhatsApp සහ Spotify.',
    ta: 'என் profile-ஐத் திறக்க ஒரு icon-ஐத் தட்டுங்கள் — GitHub, LinkedIn, Instagram, Facebook, Threads, WhatsApp, Spotify.',
  },
  sharePortfolio: { en: 'Share Portfolio', si: 'Portfolio බෙදාගන්න', ta: 'Portfolio-ஐப் பகிருங்கள்' },
  timeSensitive: { en: 'Time Sensitive', si: 'කාලීන', ta: 'நேர முக்கியம்' },
  today: { en: 'Today', si: 'අද', ta: 'இன்று' },
  markCompleted: { en: 'Mark as Completed', si: 'සම්පූර්ණ ලෙස සලකුණු කරන්න', ta: 'முடிந்ததாகக் குறி' },
  remindHour: { en: 'Remind Me in an Hour', si: 'පැයකින් මතක් කරන්න', ta: 'ஒரு மணி நேரத்தில் நினைவூட்டு' },
  remindAfternoon: { en: 'Remind Me This Afternoon', si: 'අද දහවල් මතක් කරන්න', ta: 'இன்று மதியம் நினைவூட்டு' },
  remindTomorrow: { en: 'Remind Me Tomorrow', si: 'හෙට මතක් කරන්න', ta: 'நாளை நினைவூட்டு' },
  weatherBody: { en: 'Tap for the full forecast.', si: 'සම්පූර්ණ අනාවැකිය සඳහා ඔබන්න.', ta: 'முழு முன்னறிவிப்புக்கு தட்டுங்கள்.' },
  caseStudy: { en: 'Case study', si: 'සිද්ධි අධ්‍යයනය', ta: 'வழக்கு ஆய்வு' },
  read: { en: 'Read', si: 'කියවන්න', ta: 'படிக்க' },
  /* menu bar */
  mFile: { en: 'File', si: 'ගොනුව', ta: 'கோப்பு' },
  mEdit: { en: 'Edit', si: 'සංස්කරණය', ta: 'திருத்து' },
  mView: { en: 'View', si: 'දසුන', ta: 'காட்சி' },
  mGo: { en: 'Go', si: 'යන්න', ta: 'செல்' },
  mWindow: { en: 'Window', si: 'කවුළුව', ta: 'சாளரம்' },
  mHelp: { en: 'Help', si: 'උදව්', ta: 'உதவி' },
  downloadCv: { en: 'Download CV', si: 'CV බාගන්න', ta: 'CV பதிவிறக்கு' },
  sleep: { en: 'Sleep', si: 'නිද්‍රාව', ta: 'உறக்கம்' },
  restart: { en: 'Restart…', si: 'නැවත අරඹන්න…', ta: 'மறுதொடக்கம்…' },
  shutDown: { en: 'Shut Down…', si: 'වසා දමන්න…', ta: 'அணை…' },
  lockScreen: { en: 'Lock Screen', si: 'තිරය අගුළු දමන්න', ta: 'திரையைப் பூட்டு' },
  /* lock screen */
  swipeUp: { en: 'Swipe up, click or press Enter to unlock', si: 'විවෘත කිරීමට ඉහළට swipe කරන්න හෝ Enter ඔබන්න', ta: 'திறக்க மேலே swipe செய்யவும் அல்லது Enter அழுத்தவும்' },
  /* control center */
  focus: { en: 'Focus', si: 'අවධානය', ta: 'கவனம்' },
  display: { en: 'Display', si: 'තිරය', ta: 'திரை' },
  sound: { en: 'Sound', si: 'ශබ්දය', ta: 'ஒலி' },
  /* guestbook */
  guestbook: { en: 'Guestbook', si: 'අමුත්තන්ගේ පොත', ta: 'விருந்தினர் புத்தகம்' },
  leaveMessage: { en: 'Leave a message', si: 'පණිවිඩයක් තබන්න', ta: 'ஒரு செய்தியை விடுங்கள்' },
  yourName: { en: 'Your name', si: 'ඔබේ නම', ta: 'உங்கள் பெயர்' },
  message: { en: 'Message', si: 'පණිවිඩය', ta: 'செய்தி' },
  sign: { en: 'Sign the Guestbook', si: 'අමුත්තන්ගේ පොතේ අත්සන් කරන්න', ta: 'விருந்தினர் புத்தகத்தில் கையொப்பமிடு' },
  /* hire me */
  availableFor: { en: 'Available for IT internships', si: 'IT පුහුණුවීම් සඳහා ලබා ගත හැක', ta: 'IT பயிற்சிப் பணிகளுக்குத் தயார்' },
  bookCall: { en: 'Book a Call', si: 'ඇමතුමක් වෙන් කරන්න', ta: 'அழைப்பை முன்பதிவு செய்' },
  emailMe: { en: 'Email Me', si: 'මට Email කරන්න', ta: 'எனக்கு மின்னஞ்சல் அனுப்பு' },
  share: { en: 'Share', si: 'බෙදාගන්න', ta: 'பகிர்' },
  language: { en: 'Language', si: 'භාෂාව', ta: 'மொழி' },
  /* v10.1 — iPhone / iPad shell */
  iSwipeOpen: { en: 'Swipe up to open', si: 'විවෘත කිරීමට ඉහළට swipe කරන්න', ta: 'திறக்க மேலே swipe செய்யவும்' },
  iUnlocked: { en: 'Unlocked', si: 'අගුළු හැර ඇත', ta: 'திறக்கப்பட்டது' },
  iNC: { en: 'Notification Centre', si: 'දැනුම්දීම් මධ්‍යස්ථානය', ta: 'அறிவிப்பு மையம்' },
  iNoOlder: { en: 'No Older Notifications', si: 'පැරණි දැනුම්දීම් නැත', ta: 'பழைய அறிவிப்புகள் இல்லை' },
  iClear: { en: 'Clear', si: 'ඉවත් කරන්න', ta: 'அழி' },
  iSearch: { en: 'Search', si: 'සොයන්න', ta: 'தேடு' },
  iAppLibrary: { en: 'App Library', si: 'යෙදුම් පුස්තකාලය', ta: 'செயலி நூலகம்' },
  iDone: { en: 'Done', si: 'අවසන්', ta: 'முடிந்தது' },
  iEdit: { en: 'Edit', si: 'සංස්කරණය', ta: 'திருத்து' },
  iCancel: { en: 'Cancel', si: 'අවලංගු කරන්න', ta: 'ரத்து செய்' },
  iSiriSugg: { en: 'Siri Suggestions', si: 'Siri යෝජනා', ta: 'Siri பரிந்துரைகள்' },
  iSuggested: { en: 'Suggested', si: 'යෝජිත', ta: 'பரிந்துரைக்கப்பட்டவை' },
  iPowerOff: { en: 'slide to power off', si: 'ක්‍රියා විරහිත කිරීමට ලිස්සන්න', ta: 'அணைக்க ஸ்லைடு செய்யவும்' },
  iShowLess: { en: 'Show less', si: 'අඩුවෙන් පෙන්වන්න', ta: 'குறைவாகக் காட்டு' },
  iControlCentre: { en: 'Control Centre', si: 'පාලන මධ්‍යස්ථානය', ta: 'கட்டுப்பாட்டு மையம்' },
} satisfies Record<string, Record<Lang, string>>;

export type I18nKey = keyof typeof D;

export function t(k: I18nKey): string {
  const e = D[k];
  return e[current] || e.en;
}
