import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as RPointerEvent, type ReactNode } from 'react';
import { useSystem } from '../../system/SystemContext';
import { useSettings, defaultSettings } from '../../system/SettingsContext';
import { useMusic } from '../../system/MusicContext';
import { islandTorch, isTorch, ISLAND_TORCH } from '../../system/island';
import { takeScreenshot, toggleScreenRecording, useScreenRecording, captureSupported } from '../../system/screenCapture';
import { getBatteryManager } from '../../system/batteryLog';
import { personal, socials } from '../../data/portfolio';
import { useIOS } from './ctx';
import { CCIcon } from './CCIcons';
import { AppIcon } from '../AppIcons';
import { APPS } from '../../system/apps';
import { QRSheet } from '../QRCode';
import type { AppId, CCItem, CCSize } from '../../system/types';
import { getLang } from '../../system/i18n';

/* ═════════════════════════ translations ═════════════════════════ */

type Lng = 'en' | 'si' | 'ta';
/** v10.3 — Control Centre chrome in English, Sinhala and Tamil (follows the interface language, kept in sync with Settings) */
const TX = {
  on: { en: 'On', si: 'ක්‍රියාත්මකයි', ta: 'இயக்கத்தில்' },
  off: { en: 'Off', si: 'අක්‍රියයි', ta: 'முடக்கத்தில்' },
  aeroplane: { en: 'Aeroplane Mode', si: 'ගුවන්යානා ප්‍රකාරය', ta: 'விமானப் பயன்முறை' },
  mobileData: { en: 'Mobile Data', si: 'ජංගම දත්ත', ta: 'மொபைல் டேட்டா' },
  offline: { en: 'Offline', si: 'නොබැඳි', ta: 'ஆஃப்லைன்' },
  contactsOnly: { en: 'Contacts Only', si: 'සම්බන්ධතා පමණි', ta: 'தொடர்புகள் மட்டும்' },
  connNote: { en: 'These switch the portfolio’s own status icons — your real connection isn’t changed.', si: 'මේවා portfolio එකේම තත්ත්ව අයිකන පමණක් මාරු කරයි — ඔබේ සැබෑ සම්බන්ධතාවය වෙනස් නොවේ.', ta: 'இவை portfolio-வின் சொந்த நிலை ஐகான்களை மட்டுமே மாற்றும் — உங்கள் உண்மையான இணைப்பு மாறாது.' },
  previous: { en: 'Previous', si: 'පෙර', ta: 'முந்தையது' },
  pause: { en: 'Pause', si: 'විරාම කරන්න', ta: 'இடைநிறுத்து' },
  play: { en: 'Play', si: 'වාදනය කරන්න', ta: 'இயக்கு' },
  next: { en: 'Next', si: 'ඊළඟ', ta: 'அடுத்தது' },
  openMusic: { en: 'Open Music', si: 'Music විවෘත කරන්න', ta: 'Music-ஐத் திற' },
  notPlaying: { en: 'Not Playing', si: 'වාදනය නොවේ', ta: 'இயங்கவில்லை' },
  position: { en: 'Position', si: 'ස්ථානය', ta: 'நிலை' },
  volume: { en: 'Volume', si: 'ශබ්ද මට්ටම', ta: 'ஒலியளவு' },
  brightness: { en: 'Brightness', si: 'දීප්තිය', ta: 'ஒளிர்வு' },
  battery: { en: 'Battery', si: 'බැටරිය', ta: 'பேட்டரி' },
  charging: { en: 'Charging', si: 'ආරෝපණය වෙමින්', ta: 'சார்ஜ் ஆகிறது' },
  onBattery: { en: 'On battery', si: 'බැටරියෙන්', ta: 'பேட்டரியில்' },
  notShared: { en: 'Not shared by this browser', si: 'මෙම browser එක බෙදා නොගනී', ta: 'இந்த browser பகிரவில்லை' },
  textPct: { en: 'Text {n}%', si: 'අකුරු {n}%', ta: 'எழுத்து {n}%' },
  recording: { en: 'Recording', si: 'පටිගත වෙමින්', ta: 'பதிவாகிறது' },
  focus_off: { en: 'Focus', si: 'අවධානය', ta: 'கவனம்' },
  focus_dnd: { en: 'Do Not Disturb', si: 'බාධා නොකරන්න', ta: 'தொந்தரவு செய்ய வேண்டாம்' },
  focus_work: { en: 'Work', si: 'වැඩ', ta: 'பணி' },
  focus_sleep: { en: 'Sleep', si: 'නින්ද', ta: 'உறக்கம்' },
  focus_personal: { en: 'Personal', si: 'පුද්ගලික', ta: 'தனிப்பட்ட' },
  added: { en: 'Added', si: 'එක් කළා', ta: 'சேர்க்கப்பட்டது' },
  addControl: { en: 'Add a Control', si: 'පාලකයක් එක් කරන්න', ta: 'கட்டுப்பாட்டைச் சேர்' },
  done: { en: 'Done', si: 'නිමයි', ta: 'முடிந்தது' },
  searchControls: { en: 'Search Controls', si: 'පාලක සොයන්න', ta: 'கட்டுப்பாடுகளைத் தேடு' },
  all: { en: 'All', si: 'සියල්ල', ta: 'அனைத்தும்' },
  byApp: { en: 'By App', si: 'යෙදුම අනුව', ta: 'செயலி வாரியாக' },
  system: { en: 'System', si: 'පද්ධතිය', ta: 'அமைப்பு' },
  noMatch: { en: 'No controls match “{q}”.', si: '“{q}” ට ගැළපෙන පාලක නැත.', ta: '“{q}” உடன் பொருந்தும் கட்டுப்பாடுகள் இல்லை.' },
  restore: { en: 'Restore Default Controls', si: 'පෙරනිමි පාලක ප්‍රතිසාධනය කරන්න', ta: 'இயல்புநிலைக் கட்டுப்பாடுகளை மீட்டமை' },
  remove: { en: 'Remove {x}', si: '{x} ඉවත් කරන්න', ta: '{x}-ஐ அகற்று' },
  resize: { en: 'Resize {x}', si: '{x} ප්‍රමාණය වෙනස් කරන්න', ta: '{x}-இன் அளவை மாற்று' },
  controlCentre: { en: 'Control Centre', si: 'පාලන මධ්‍යස්ථානය', ta: 'கட்டுப்பாட்டு மையம்' },
  doneEditing: { en: 'Done editing controls', si: 'පාලක සංස්කරණය නිමයි', ta: 'கட்டுப்பாடுகளைத் திருத்துவது முடிந்தது' },
  editControls: { en: 'Edit controls', si: 'පාලක සංස්කරණය කරන්න', ta: 'கட்டுப்பாடுகளைத் திருத்து' },
  power: { en: 'Power', si: 'බලය', ta: 'மின்சக்தி' },
  favourites: { en: 'Favourites', si: 'ප්‍රියතම', ta: 'பிடித்தவை' },
  nowPlaying: { en: 'Now Playing', si: 'දැන් වාදනය වේ', ta: 'இப்போது இயங்குகிறது' },
  connectivity: { en: 'Connectivity', si: 'සම්බන්ධතා', ta: 'இணைப்பு' },
  portfolio: { en: 'Portfolio', si: 'Portfolio', ta: 'Portfolio' },
  portfolioControls: { en: 'Portfolio controls', si: 'Portfolio පාලක', ta: 'Portfolio கட்டுப்பாடுகள்' },
  controlGroups: { en: 'Control groups', si: 'පාලක කාණ්ඩ', ta: 'கட்டுப்பாட்டுக் குழுக்கள்' },
  openOther: { en: 'Open on Another Device', si: 'වෙනත් උපාංගයක විවෘත කරන්න', ta: 'வேறு சாதனத்தில் திற' },
  contactTitle: { en: '{name} — Contact', si: '{name} — සම්බන්ධතා', ta: '{name} — தொடர்பு' },
  scanSite: { en: 'Scan with any phone camera to open this portfolio.', si: 'මෙම portfolio එක විවෘත කිරීමට ඕනෑම දුරකථන කැමරාවකින් ස්කෑන් කරන්න.', ta: 'இந்த portfolio-வைத் திறக்க எந்த ஃபோன் கேமராவாலும் ஸ்கேன் செய்யுங்கள்.' },
  scanContact: { en: 'Scan to save the contact card.', si: 'සම්බන්ධතා කාඩ්පත සුරැකීමට ස්කෑන් කරන්න.', ta: 'தொடர்பு அட்டையைச் சேமிக்க ஸ்கேன் செய்யுங்கள்.' },
} satisfies Record<string, Record<Lng, string>>;
const tx = (k: keyof typeof TX, vars: Record<string, string> = {}) => TX[k][getLang()].replace(/\{(\w+)\}/g, (_, v: string) => vars[v] ?? '');

/** gallery categories (the English value stays the key used for filtering) */
const CAT_TX: Record<string, Record<Exclude<Lng, 'en'>, string>> = {
  Connectivity: { si: 'සම්බන්ධතා', ta: 'இணைப்பு' },
  Media: { si: 'මාධ්‍ය', ta: 'ஊடகம்' },
  'Display & Sound': { si: 'සංදර්ශකය සහ ශබ්දය', ta: 'திரை & ஒலி' },
  'Focus & Accessibility': { si: 'අවධානය සහ ප්‍රවේශ්‍යතාව', ta: 'கவனம் & அணுகல்தன்மை' },
  Utilities: { si: 'උපයෝගිතා', ta: 'பயன்பாடுகள்' },
  Capture: { si: 'ග්‍රහණය', ta: 'பதிவுசெய்தல்' },
  'Web & Safari': { si: 'වෙබ් සහ Safari', ta: 'இணையம் & Safari' },
  Portfolio: { si: 'Portfolio', ta: 'Portfolio' },
  All: { si: 'සියල්ල', ta: 'அனைத்தும்' },
  'By App': { si: 'යෙදුම අනුව', ta: 'செயலி வாரியாக' },
  System: { si: 'පද්ධතිය', ta: 'அமைப்பு' },
};
const catName = (k: string) => {
  const l = getLang();
  return l === 'en' ? k : (CAT_TX[k]?.[l] ?? k);
};

/** control labels and gallery descriptions: [label, desc] per language ({h} GitHub handle, {p} phone) */
const CC_TX: Record<string, Record<Exclude<Lng, 'en'>, [string, string]>> = {
  connectivity: { si: ['සම්බන්ධතා', 'ගුවන්යානා ප්‍රකාරය, AirDrop, Wi-Fi සහ Bluetooth'], ta: ['இணைப்பு', 'விமானப் பயன்முறை, AirDrop, Wi-Fi மற்றும் Bluetooth'] },
  cellular: { si: ['ජංගම දත්ත', 'Portfolio ජංගම දත්ත අයිකනය'], ta: ['மொபைல் டேட்டா', 'Portfolio மொபைல் டேட்டா ஐகான்'] },
  nowplaying: { si: ['දැන් වාදනය වේ', 'Music හි වාදනය, විරාමය සහ මඟහැරීම'], ta: ['இப்போது இயங்குகிறது', 'Music-இல் இயக்கு, இடைநிறுத்து, தவிர்'] },
  brightness: { si: ['දීප්තිය', 'Portfolio තිරයේ දීප්තිය'], ta: ['ஒளிர்வு', 'Portfolio திரையின் ஒளிர்வு'] },
  volume: { si: ['ශබ්ද මට්ටම', 'සංගීතයේ සහ ශබ්දයේ මට්ටම'], ta: ['ஒலியளவு', 'இசை மற்றும் ஒலியின் அளவு'] },
  silent: { si: ['නිහඬ ප්‍රකාරය', 'Portfolio හි සියලු ශබ්ද නිහඬ කරයි'], ta: ['அமைதிப் பயன்முறை', 'Portfolio-வின் எல்லா ஒலிகளையும் முடக்கும்'] },
  darkmode: { si: ['අඳුරු ප්‍රකාරය', 'ආලෝක / අඳුරු මාරු කරන්න'], ta: ['இருண்ட பயன்முறை', 'ஒளி / இருள் மாற்று'] },
  nightshift: { si: ['රාත්‍රී මාරුව', 'උණුසුම් වර්ණ'], ta: ['இரவு மாற்றம்', 'வெதுவெதுப்பான நிறங்கள்'] },
  textsize: { si: ['අකුරු ප්‍රමාණය', 'අකුරු ප්‍රමාණය වරින් වර වෙනස් කරන්න'], ta: ['எழுத்து அளவு', 'எழுத்து அளவைச் சுழற்சியாக மாற்று'] },
  focus: { si: ['අවධානය', 'බාධා නොකරන්න, වැඩ, නින්ද, පුද්ගලික'], ta: ['கவனம்', 'தொந்தரவு செய்ய வேண்டாம், பணி, உறக்கம், தனிப்பட்ட'] },
  rotlock: { si: ['දිශානති අගුල', 'සිරස් පිරිසැලසුම රඳවා තබයි (StandBy නැත)'], ta: ['திசைப் பூட்டு', 'செங்குத்து அமைப்பை வைத்திருக்கும் (StandBy இல்லை)'] },
  lowpower: { si: ['අඩු බල ප්‍රකාරය', 'අඩු සජීවිකරණ සහ ප්‍රයෝග'], ta: ['குறைந்த மின் பயன்முறை', 'குறைவான அனிமேஷன்கள் மற்றும் விளைவுகள்'] },
  battery: { si: ['බැටරිය', 'ඔබේ උපාංගයේ බැටරි මට්ටම (browser එක එය බෙදා ගන්නේ නම්)'], ta: ['பேட்டரி', 'உங்கள் சாதனத்தின் பேட்டரி நிலை (browser பகிர்ந்தால்)'] },
  torch: { si: ['විදුලි පන්දම', 'කැමරා ෆ්ලෑෂ් එක, නැතහොත් දීප්තිමත් තිරයක්'], ta: ['டார்ச்', 'கேமரா ஃபிளாஷ், அல்லது பிரகாசமான திரை'] },
  timer: { si: ['ටයිමරය', 'Clock → Timer විවෘත කරයි'], ta: ['டைமர்', 'Clock → Timer-ஐத் திறக்கும்'] },
  stopwatch: { si: ['විරාම ඔරලෝසුව', 'Clock → Stopwatch විවෘත කරයි'], ta: ['ஸ்டாப்வாட்ச்', 'Clock → Stopwatch-ஐத் திறக்கும்'] },
  alarm: { si: ['එලාමය', 'Clock → Alarm විවෘත කරයි'], ta: ['அலாரம்', 'Clock → Alarm-ஐத் திறக்கும்'] },
  calculator: { si: ['ගණක යන්ත්‍රය', 'Calculator විවෘත කරයි'], ta: ['கால்குலேட்டர்', 'Calculator-ஐத் திறக்கும்'] },
  quicknote: { si: ['ඉක්මන් සටහන', 'නව ඇලෙන සටහනක්'], ta: ['விரைவுக் குறிப்பு', 'புதிய ஒட்டுக் குறிப்பு'] },
  translate: { si: ['පරිවර්තනය', 'Translate විවෘත කරයි'], ta: ['மொழிபெயர்ப்பு', 'Translate-ஐத் திறக்கும்'] },
  assistant: { si: ['සහායක', 'Portfolio සහායකගෙන් අසන්න'], ta: ['உதவியாளர்', 'Portfolio உதவியாளரிடம் கேளுங்கள்'] },
  settings: { si: ['සැකසුම්', 'Settings විවෘත කරයි'], ta: ['அமைப்புகள்', 'Settings-ஐத் திறக்கும்'] },
  camera: { si: ['කැමරාව', 'Camera විවෘත කරයි'], ta: ['கேமரா', 'Camera-வைத் திறக்கும்'] },
  screenshot: { si: ['තිර රුව', 'සැබෑ තිර රුවක් (desktop browsers)'], ta: ['திரைப்பிடிப்பு', 'உண்மையான திரைப்பிடிப்பு (desktop browsers)'] },
  screenrec: { si: ['තිර පටිගත කිරීම', 'සැබෑ පටිගත කිරීමක් (desktop browsers)'], ta: ['திரைப் பதிவு', 'உண்மையான பதிவு (desktop browsers)'] },
  voicememo: { si: ['හඬ සටහන', 'Voice Memos විවෘත කරයි'], ta: ['குரல் குறிப்பு', 'Voice Memos-ஐத் திறக்கும்'] },
  mirroring: { si: ['වෙනත් උපාංගයක විවෘත කරන්න', 'ස්කෑන් කිරීමට මෙම portfolio එකේ QR කේතයක්'], ta: ['வேறு சாதனத்தில் திற', 'ஸ்கேன் செய்ய இந்த portfolio-வின் QR குறியீடு'] },
  safari: { si: ['Safari', 'Safari විවෘත කරයි'], ta: ['Safari', 'Safari-ஐத் திறக்கும்'] },
  websearch: { si: ['වෙබයේ සොයන්න', 'සෙවුම් ක්ෂේත්‍රය සූදානම් කළ Safari'], ta: ['இணையத்தில் தேடு', 'தேடல் புலம் தயாராக உள்ள Safari'] },
  website: { si: ['Portfolio වෙබ් අඩවිය', 'සජීවී portfolio අඩවිය විවෘත කරයි'], ta: ['Portfolio இணையதளம்', 'நேரலை portfolio தளத்தைத் திறக்கும்'] },
  github: { si: ['GitHub', 'github.com/{h} විවෘත කරයි'], ta: ['GitHub', 'github.com/{h}-ஐத் திறக்கும்'] },
  cv: { si: ['CV', 'CV එක විවෘත කරයි'], ta: ['CV', 'CV-ஐத் திறக்கும்'] },
  hireme: { si: ['මාව බඳවා ගන්න', 'සම්බන්ධ වීමේ විකල්ප'], ta: ['என்னை பணியமர்த்துங்கள்', 'தொடர்பு விருப்பங்கள்'] },
  projects: { si: ['ව්‍යාපෘති', 'Projects විවෘත කරයි'], ta: ['திட்டங்கள்', 'Projects-ஐத் திறக்கும்'] },
  call: { si: ['අමතන්න', '{p} අමතයි'], ta: ['அழை', '{p}-ஐ அழைக்கும்'] },
  qr: { si: ['සම්බන්ධතා QR', 'ස්කෑන් කළ හැකි සම්බන්ධතා කාඩ්පතක්'], ta: ['தொடர்பு QR', 'ஸ்கேன் செய்யக்கூடிய தொடர்பு அட்டை'] },
};
const defText = (d: { id: string; label: string; desc: string }, i: 0 | 1) => {
  const l = getLang();
  const en = i === 0 ? d.label : d.desc;
  const tr = l === 'en' ? undefined : CC_TX[d.id]?.[l]?.[i];
  return tr ? tr.replace('{h}', socials.githubHandle).replace('{p}', personal.phone) : en;
};
/** the shown label / description of a control (the English `label` stays the source) */
const defLabel = (d: { id: string; label: string; desc: string }) => defText(d, 0);
const defDesc = (d: { id: string; label: string; desc: string }) => defText(d, 1);

/* ═════════════════════════ control registry ═════════════════════════ */

type Cat = 'Connectivity' | 'Media' | 'Display & Sound' | 'Focus & Accessibility' | 'Utilities' | 'Capture' | 'Web & Safari' | 'Portfolio';
interface Def {
  id: string;
  label: string;
  cat: Cat;
  icon: string;
  sizes: CCSize[];
  /** a short line shown in the gallery */
  desc: string;
}

/** every control here does something real in the portfolio (or on your device, where the browser allows it) */
export const CC_DEFS: Def[] = [
  { id: 'connectivity', label: 'Connectivity', cat: 'Connectivity', icon: 'wifi', sizes: ['l'], desc: 'Aeroplane Mode, AirDrop, Wi-Fi and Bluetooth' },
  { id: 'cellular', label: 'Mobile Data', cat: 'Connectivity', icon: 'cell', sizes: ['s', 'm'], desc: 'Portfolio mobile-data icon' },
  { id: 'nowplaying', label: 'Now Playing', cat: 'Media', icon: 'music', sizes: ['l', 'm'], desc: 'Play, pause and skip in Music' },
  { id: 'brightness', label: 'Brightness', cat: 'Display & Sound', icon: 'sun', sizes: ['t'], desc: 'Screen brightness of the portfolio' },
  { id: 'volume', label: 'Volume', cat: 'Display & Sound', icon: 'speaker', sizes: ['t'], desc: 'Music and sound volume' },
  { id: 'silent', label: 'Silent Mode', cat: 'Display & Sound', icon: 'bellslash', sizes: ['s', 'm'], desc: 'Mutes every portfolio sound' },
  { id: 'darkmode', label: 'Dark Mode', cat: 'Display & Sound', icon: 'contrast', sizes: ['s', 'm'], desc: 'Switch Light / Dark' },
  { id: 'nightshift', label: 'Night Shift', cat: 'Display & Sound', icon: 'nightshift', sizes: ['s', 'm'], desc: 'Warmer colours' },
  { id: 'textsize', label: 'Text Size', cat: 'Focus & Accessibility', icon: 'textsize', sizes: ['s', 'm'], desc: 'Cycle the text size' },
  { id: 'focus', label: 'Focus', cat: 'Focus & Accessibility', icon: 'moon', sizes: ['m', 's'], desc: 'Do Not Disturb, Work, Sleep, Personal' },
  { id: 'rotlock', label: 'Orientation Lock', cat: 'Focus & Accessibility', icon: 'rotlock', sizes: ['s', 'm'], desc: 'Keeps the portrait layout (no StandBy)' },
  { id: 'lowpower', label: 'Low Power Mode', cat: 'Focus & Accessibility', icon: 'battery', sizes: ['s', 'm'], desc: 'Fewer animations and effects' },
  { id: 'battery', label: 'Battery', cat: 'Focus & Accessibility', icon: 'battery', sizes: ['m'], desc: 'Your device’s battery level (when the browser shares it)' },
  { id: 'torch', label: 'Torch', cat: 'Utilities', icon: 'torch', sizes: ['s', 'm'], desc: 'Camera flash, or a bright screen' },
  { id: 'timer', label: 'Timer', cat: 'Utilities', icon: 'timer', sizes: ['s', 'm'], desc: 'Opens Clock → Timer' },
  { id: 'stopwatch', label: 'Stopwatch', cat: 'Utilities', icon: 'stopwatch', sizes: ['s', 'm'], desc: 'Opens Clock → Stopwatch' },
  { id: 'alarm', label: 'Alarm', cat: 'Utilities', icon: 'alarm', sizes: ['s', 'm'], desc: 'Opens Clock → Alarm' },
  { id: 'calculator', label: 'Calculator', cat: 'Utilities', icon: 'calc', sizes: ['s', 'm'], desc: 'Opens Calculator' },
  { id: 'quicknote', label: 'Quick Note', cat: 'Utilities', icon: 'note', sizes: ['s', 'm'], desc: 'A new sticky note' },
  { id: 'translate', label: 'Translate', cat: 'Utilities', icon: 'translate', sizes: ['s', 'm'], desc: 'Opens Translate' },
  { id: 'assistant', label: 'Assistant', cat: 'Utilities', icon: 'sparkle', sizes: ['s', 'm'], desc: 'Ask the portfolio assistant' },
  { id: 'settings', label: 'Settings', cat: 'Utilities', icon: 'gear', sizes: ['s', 'm'], desc: 'Opens Settings' },
  { id: 'camera', label: 'Camera', cat: 'Capture', icon: 'camera', sizes: ['s', 'm'], desc: 'Opens Camera' },
  { id: 'screenshot', label: 'Screenshot', cat: 'Capture', icon: 'shot', sizes: ['s', 'm'], desc: 'Real screenshot (desktop browsers)' },
  { id: 'screenrec', label: 'Screen Recording', cat: 'Capture', icon: 'record', sizes: ['s', 'm'], desc: 'Real recording (desktop browsers)' },
  { id: 'voicememo', label: 'Voice Memo', cat: 'Capture', icon: 'mic', sizes: ['s', 'm'], desc: 'Opens Voice Memos' },
  { id: 'mirroring', label: 'Open on Another Device', cat: 'Web & Safari', icon: 'mirror', sizes: ['s', 'm'], desc: 'A QR code of this portfolio to scan' },
  { id: 'safari', label: 'Safari', cat: 'Web & Safari', icon: 'compass', sizes: ['s', 'm'], desc: 'Opens Safari' },
  { id: 'websearch', label: 'Search the Web', cat: 'Web & Safari', icon: 'search', sizes: ['s', 'm'], desc: 'Safari with the search field ready' },
  { id: 'website', label: 'Portfolio Website', cat: 'Web & Safari', icon: 'globe', sizes: ['s', 'm'], desc: 'Opens the live portfolio site' },
  { id: 'github', label: 'GitHub', cat: 'Web & Safari', icon: 'globe', sizes: ['s', 'm'], desc: `Opens github.com/${socials.githubHandle}` },
  { id: 'cv', label: 'CV', cat: 'Portfolio', icon: 'doc', sizes: ['s', 'm'], desc: 'Opens the CV' },
  { id: 'hireme', label: 'Hire Me', cat: 'Portfolio', icon: 'person', sizes: ['s', 'm'], desc: 'Contact options' },
  { id: 'projects', label: 'Projects', cat: 'Portfolio', icon: 'briefcase', sizes: ['s', 'm'], desc: 'Opens Projects' },
  { id: 'call', label: 'Call', cat: 'Portfolio', icon: 'phone', sizes: ['s', 'm'], desc: `Calls ${personal.phone}` },
  { id: 'qr', label: 'Contact QR', cat: 'Portfolio', icon: 'qr', sizes: ['s', 'm'], desc: 'A scannable contact card' },
];
const DEF = Object.fromEntries(CC_DEFS.map((d) => [d.id, d])) as Record<string, Def>;
export const CC_CATS: Cat[] = ['Connectivity', 'Media', 'Display & Sound', 'Focus & Accessibility', 'Utilities', 'Capture', 'Web & Safari', 'Portfolio'];

export const DEFAULT_FAV: CCItem[] = defaultSettings.ccLayout.fav;
export const DEFAULT_WORK: CCItem[] = defaultSettings.ccLayout.work;
type GroupId = 'fav' | 'media' | 'conn' | 'work';
const GROUPS: { id: GroupId; label: string; icon: string }[] = [
  { id: 'fav', label: 'Favourites', icon: 'heart' },
  { id: 'media', label: 'Now Playing', icon: 'music' },
  { id: 'conn', label: 'Connectivity', icon: 'wifi' },
  { id: 'work', label: 'Portfolio', icon: 'briefcase' },
];
const GROUP_TX: Record<GroupId, keyof typeof TX> = { fav: 'favourites', media: 'nowPlaying', conn: 'connectivity', work: 'portfolio' };

const FOCI = ['off', 'dnd', 'work', 'sleep', 'personal'] as const;
const FOCUS_NAME = { off: 'Focus', dnd: 'Do Not Disturb', work: 'Work', sleep: 'Sleep', personal: 'Personal' } as const;
const TEXT_STEPS = [0.9, 1, 1.1, 1.2];

/* ═════════════════════════ state + actions ═════════════════════════ */

function useCC() {
  const ios = useIOS();
  const sys = useSystem();
  const music = useMusic();
  const { settings, update } = useSettings();
  const recSince = useScreenRecording();
  const [torch, setTorch] = useState(isTorch());
  const [battery, setBattery] = useState<{ level: number; charging: boolean } | null>(null);
  const [qr, setQr] = useState<null | 'site' | 'contact'>(null);
  useEffect(() => {
    const on = (e: Event) => setTorch(!!(e as CustomEvent<boolean>).detail);
    window.addEventListener(ISLAND_TORCH, on);
    let m: Awaited<ReturnType<typeof getBatteryManager>> = null;
    const upd = () => m && setBattery({ level: m.level, charging: m.charging });
    void getBatteryManager().then((x) => {
      m = x;
      upd();
      m?.addEventListener('levelchange', upd);
      m?.addEventListener('chargingchange', upd);
    });
    return () => {
      window.removeEventListener(ISLAND_TORCH, on);
      m?.removeEventListener('levelchange', upd);
      m?.removeEventListener('chargingchange', upd);
    };
  }, []);
  const open = (id: AppId, args?: Record<string, string>) => {
    ios.setPanel('none');
    ios.openApp(id, args);
  };
  const external = (url: string) => window.open(url, '_blank', 'noopener,noreferrer');
  const focus = (settings.focusMode ?? 'off') as (typeof FOCI)[number];
  /** is a toggle-style control on? */
  const isOn = (id: string): boolean => {
    switch (id) {
      case 'cellular':
        return sys.cellular && !sys.airplane;
      case 'silent':
        return music.muted;
      case 'darkmode':
        return settings.appearance === 'dark';
      case 'nightshift':
        return sys.nightShift;
      case 'focus':
        return focus !== 'off';
      case 'rotlock':
        return sys.rotationLock;
      case 'lowpower':
        return settings.lowPowerMode === 'always';
      case 'torch':
        return torch;
      case 'screenrec':
        return recSince !== null;
      default:
        return false;
    }
  };
  const tint: Record<string, string> = { silent: 'red', rotlock: 'red', lowpower: 'yellow', torch: 'white', screenrec: 'red', focus: 'purple', nightshift: 'orange', cellular: 'green', darkmode: 'white' };
  const run = (id: string) => {
    switch (id) {
      case 'cellular':
        return sys.set({ cellular: !sys.cellular });
      case 'silent':
        return music.toggleMute(); // the Dynamic Island shows the Silent / Ring ping
      case 'darkmode':
        return update({ appearance: settings.appearance === 'dark' ? 'light' : 'dark', autoAppearance: 'off' });
      case 'nightshift':
        return sys.set({ nightShift: !sys.nightShift });
      case 'textsize': {
        const i = TEXT_STEPS.findIndex((x) => Math.abs(x - (settings.textScale ?? 1)) < 0.01);
        return update({ textScale: TEXT_STEPS[(i + 1) % TEXT_STEPS.length] });
      }
      case 'focus': {
        const next = FOCI[(FOCI.indexOf(focus) + 1) % FOCI.length];
        update({ focusMode: next });
        return sys.set({ focus: next !== 'off' });
      }
      case 'rotlock':
        return sys.set({ rotationLock: !sys.rotationLock });
      case 'lowpower':
        return update({ lowPowerMode: settings.lowPowerMode === 'always' ? 'never' : 'always' });
      case 'torch':
        return islandTorch(!torch);
      case 'timer':
        return open('clock', { tab: 'timer' });
      case 'stopwatch':
        return open('clock', { tab: 'stopwatch' });
      case 'alarm':
        return open('clock', { tab: 'alarm' });
      case 'calculator':
        return open('calculator');
      case 'quicknote':
        return open('stickies');
      case 'translate':
        return open('translate');
      case 'assistant':
        return open('siri');
      case 'settings':
        return open('settings');
      case 'camera':
        return open('camera');
      case 'voicememo':
        return open('voicememos');
      case 'screenshot':
        ios.setPanel('none');
        return captureSupported() ? void takeScreenshot() : window.setTimeout(() => window.dispatchEvent(new Event('mra-screenshot')), 350);
      case 'screenrec':
        ios.setPanel('none');
        return void toggleScreenRecording();
      case 'mirroring':
        return setQr('site');
      case 'qr':
        return setQr('contact');
      case 'safari':
        return open('safari');
      case 'websearch':
        return open('safari', { focus: '1' });
      case 'website':
        return external(socials.portfolio);
      case 'github':
        return external(socials.github);
      case 'cv':
        return open('preview');
      case 'hireme':
        return open('hireme');
      case 'projects':
        return open('xcode');
      case 'call':
        return (location.href = personal.phoneHref);
      default:
        return undefined;
    }
  };
  return { ios, sys, music, settings, update, isOn, tint, run, focus, battery, qr, setQr, recSince };
}
type CCX = ReturnType<typeof useCC>;

/* ═════════════════════════ pieces ═════════════════════════ */

function VSlider({ value, onChange, icon, label, muted }: { value: number; onChange: (v: number) => void; icon: string; label: string; muted?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const set = (e: RPointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    onChange(Math.min(1, Math.max(0, 1 - (e.clientY - r.top) / r.height)));
  };
  return (
    <div
      ref={ref}
      className="xcc-slider"
      role="slider"
      aria-label={label}
      aria-valuenow={Math.round(value * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'ArrowUp' || e.key === 'ArrowRight') onChange(Math.min(1, value + 0.1));
        if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') onChange(Math.max(0, value - 0.1));
      }}
      onPointerDown={(e) => {
        e.stopPropagation();
        e.currentTarget.setPointerCapture(e.pointerId);
        set(e);
      }}
      onPointerMove={(e) => e.buttons && set(e)}
    >
      <i style={{ height: `${value * 100}%` }} />
      <span className={muted ? 'muted' : ''}>
        <CCIcon n={muted ? 'mute' : icon} size={26} />
      </span>
    </div>
  );
}

function Connectivity({ c, big }: { c: CCX; big?: boolean }) {
  const { sys } = c;
  type Row = [string, string, boolean, () => void, string];
  const show = (label: string) => (label === 'Aeroplane Mode' ? tx('aeroplane') : label === 'Mobile Data' ? tx('mobileData') : label);
  // v10.3 — same order as iOS: Aeroplane · Mobile Data · Wi-Fi · Bluetooth (AirDrop in the expanded view)
  const rows: Row[] = [
    ['plane', 'Aeroplane Mode', sys.airplane, () => sys.set({ airplane: !sys.airplane }), 'orange'],
    ['cell', 'Mobile Data', sys.cellular && !sys.airplane, () => sys.set({ cellular: !sys.cellular }), 'green'],
    ['wifi', 'Wi-Fi', sys.wifi && !sys.airplane, () => sys.set({ wifi: !sys.wifi }), 'blue'],
    ['bt', 'Bluetooth', sys.bluetooth && !sys.airplane, () => sys.set({ bluetooth: !sys.bluetooth }), 'blue'],
  ];
  const airdrop: Row = ['airdrop', 'AirDrop', sys.airdrop !== 'off' && !sys.airplane, () => sys.set({ airdrop: sys.airdrop === 'off' ? 'contacts' : 'off' }), 'blue'];
  if (big)
    return (
      <div className="xcc-conn-list">
        {[...rows, airdrop].map(([ic, label, on, fn, col]) => (
          <button key={label} type="button" className={`xcc-conn-row ${on ? `on ${col}` : ''}`} onClick={fn} aria-pressed={on}>
            <i>
              <CCIcon n={ic} size={20} fill={ic === 'plane'} />
            </i>
            <span>
              <b>{show(label)}</b>
              <small>{label === 'Wi-Fi' && on ? (navigator.onLine ? 'Portfolio-Net' : tx('offline')) : label === 'AirDrop' && on ? tx('contactsOnly') : on ? tx('on') : tx('off')}</small>
            </span>
          </button>
        ))}
        <p className="xcc-note">{tx('connNote')}</p>
      </div>
    );
  return (
    <div className="xcc-conn">
      {rows.map(([ic, label, on, fn, col]) => (
        <button key={label} type="button" className={`xcc-round ${on ? `on ${col}` : ''}`} onClick={fn} aria-pressed={on} aria-label={show(label)}>
          <CCIcon n={ic} size={22} fill={ic === 'plane'} />
        </button>
      ))}
    </div>
  );
}

function NowPlaying({ c, size }: { c: CCX; size: CCSize | 'page' }) {
  const m = c.music;
  const art = <span className="xcc-art" style={{ background: `linear-gradient(135deg, ${m.track.art[0]}, ${m.track.art[1]})` }} aria-hidden="true" />;
  const ctl = (
    <div className="xcc-np-ctl">
      <button type="button" onClick={m.prev} aria-label={tx('previous')}>
        <CCIcon n="prev" size={24} fill />
      </button>
      <button type="button" className="pp" onClick={m.toggle} aria-label={m.playing ? tx('pause') : tx('play')}>
        <CCIcon n={m.playing ? 'pause' : 'play'} size={26} fill />
      </button>
      <button type="button" onClick={m.next} aria-label={tx('next')}>
        <CCIcon n="next" size={24} fill />
      </button>
    </div>
  );
  if (size === 'm')
    return (
      <div className="xcc-np mid">
        {art}
        <span className="xcc-np-t">
          <b>{m.track.title}</b>
        </span>
        <button type="button" className="pp" onClick={m.toggle} aria-label={m.playing ? tx('pause') : tx('play')}>
          <CCIcon n={m.playing ? 'pause' : 'play'} size={20} fill />
        </button>
      </div>
    );
  return (
    <div className={`xcc-np ${size === 'page' ? 'page' : ''}`}>
      <div className="xcc-np-top">
        {art}
        <button type="button" className="xcc-np-open" aria-label={tx('openMusic')} onClick={() => (c.ios.setPanel('none'), c.ios.openApp('music'))}>
          <CCIcon n="music" size={16} />
        </button>
      </div>
      <span className="xcc-np-t">
        <b>{m.playing || m.currentTime > 0 ? m.track.title : tx('notPlaying')}</b>
        <small>{m.track.artist}</small>
      </span>
      {size === 'page' && (
        <>
          <input type="range" className="xcc-seek" min={0} max={Math.max(1, m.duration)} step={0.5} value={m.currentTime} onChange={(e) => m.seek(Number(e.target.value))} aria-label={tx('position')} />
          <div className="xcc-times">
            <span>{fmt(m.currentTime)}</span>
            <span>-{fmt(Math.max(0, m.duration - m.currentTime))}</span>
          </div>
        </>
      )}
      {ctl}
      {size === 'page' && (
        <label className="xcc-vol">
          <CCIcon n="speaker" size={16} />
          <input type="range" min={0} max={1} step={0.01} value={m.muted ? 0 : m.volume} onChange={(e) => m.setVolume(Number(e.target.value))} aria-label={tx('volume')} />
        </label>
      )}
    </div>
  );
}
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

function Control({ item, c }: { item: CCItem; c: CCX }) {
  const d = DEF[item.id];
  if (!d) return null;
  switch (item.id) {
    case 'connectivity':
      return <Connectivity c={c} />;
    case 'nowplaying':
      return <NowPlaying c={c} size={item.s} />;
    case 'brightness':
      return <VSlider value={c.sys.brightness} onChange={(v) => c.sys.set({ brightness: Math.max(0.15, v) })} icon="sun" label={tx('brightness')} />;
    case 'volume':
      return <VSlider value={c.music.muted ? 0 : c.music.volume} onChange={(v) => c.music.setVolume(v)} icon="speaker" label={tx('volume')} muted={c.music.muted} />;
    case 'battery': {
      const b = c.battery;
      return (
        <div className="xcc-tile m info" aria-label={tx('battery')}>
          <span className="xcc-ic">
            <CCIcon n="battery" />
          </span>
          <span className="xcc-lbl">
            <b>{b ? `${Math.round(b.level * 100)}%` : tx('battery')}</b>
            <small>{b ? (b.charging ? tx('charging') : tx('onBattery')) : tx('notShared')}</small>
          </span>
        </div>
      );
    }
    default: {
      const on = c.isOn(item.id);
      const label = item.id === 'focus' ? (getLang() === 'en' ? FOCUS_NAME[c.focus] : tx(`focus_${c.focus}`)) : item.id === 'textsize' ? tx('textPct', { n: String(Math.round((c.settings.textScale ?? 1) * 100)) }) : defLabel(d);
      return (
        <button type="button" className={`xcc-tile ${item.s} ${on ? `on ${c.tint[item.id] ?? 'blue'}` : ''}`} onClick={() => c.run(item.id)} aria-pressed={on || undefined} aria-label={defLabel(d)}>
          <span className="xcc-ic">
            <CCIcon n={d.icon} />
          </span>
          {item.s === 'm' && (
            <span className="xcc-lbl">
              <b>{label}</b>
              {item.id === 'focus' && <small>{on ? tx('on') : tx('off')}</small>}
              {item.id === 'screenrec' && c.recSince !== null && <small>{tx('recording')}</small>}
            </span>
          )}
        </button>
      );
    }
  }
}

/* ═════════════════════════ gallery (Add a Control) ═════════════════════════ */

/** v10.3 — which app each control belongs to, so the gallery can be browsed by app (like iOS 18) */
const CC_APP: Record<string, AppId> = {
  nowplaying: 'music',
  timer: 'clock',
  stopwatch: 'clock',
  alarm: 'clock',
  calculator: 'calculator',
  quicknote: 'stickies',
  translate: 'translate',
  assistant: 'siri',
  settings: 'settings',
  camera: 'camera',
  voicememo: 'voicememos',
  safari: 'safari',
  websearch: 'safari',
  website: 'safari',
  hireme: 'hireme',
  call: 'phone',
  qr: 'contacts',
};
const appGroupOf = (d: Def): string => (CC_APP[d.id] ? (APPS[CC_APP[d.id]]?.menuName ?? 'System') : d.cat === 'Portfolio' || d.cat === 'Web & Safari' ? 'Portfolio' : 'System');

function Gallery({ used, onAdd, onClose, onReset }: { used: string[]; onAdd: (id: string) => void; onClose: () => void; onReset: () => void }) {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<Cat | 'All' | 'By App'>('All');
  const list = CC_DEFS.filter((d) => (cat === 'All' || cat === 'By App' || d.cat === cat) && `${d.label} ${d.desc} ${d.cat} ${appGroupOf(d)}${getLang() === 'en' ? '' : ` ${defLabel(d)} ${defDesc(d)} ${catName(d.cat)} ${catName(appGroupOf(d))}`}`.toLowerCase().includes(q.trim().toLowerCase()));
  const item = (d: Def) => {
    const has = used.includes(d.id);
    return (
      <button key={d.id} type="button" className={`xcc-gal-item ${has ? 'added' : ''}`} disabled={has} onClick={() => onAdd(d.id)}>
        <span className="xcc-gal-prev">
          <CCIcon n={d.icon} size={24} />
        </span>
        <span className="xcc-gal-t">
          <b>{defLabel(d)}</b>
          <small>{defDesc(d)}</small>
        </span>
        <span className="xcc-gal-add">{has ? tx('added') : <CCIcon n="plus" size={16} />}</span>
      </button>
    );
  };
  const groups = cat === 'By App' ? [...new Set(list.map(appGroupOf))].sort((a, b) => Number(a === 'System') - Number(b === 'System') || a.localeCompare(b)) : [];
  const groupIcon = (g: string) => {
    const id = Object.values(CC_APP).find((a) => APPS[a]?.menuName === g);
    return id ? <AppIcon name={APPS[id].icon} className="xcc-gal-appico" /> : <span className="xcc-gal-appico sys"><CCIcon n={g === 'Portfolio' ? 'briefcase' : 'gear'} size={14} /></span>;
  };
  return (
    <div className="xcc-gal-back" onClick={(e) => (e.stopPropagation(), onClose())}>
      <div className="xcc-gal" role="dialog" aria-label={tx('addControl')} onClick={(e) => e.stopPropagation()}>
        <header>
          <b>{tx('addControl')}</b>
          <button type="button" onClick={onClose}>
            {tx('done')}
          </button>
        </header>
        <label className="xcc-gal-q">
          <CCIcon n="search" size={16} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tx('searchControls')} aria-label={tx('searchControls')} data-nodictation />
        </label>
        <div className="xcc-gal-cats" role="tablist">
          {(['All', 'By App', ...CC_CATS] as const).map((k) => (
            <button key={k} type="button" role="tab" aria-selected={cat === k} className={cat === k ? 'on' : ''} onClick={() => setCat(k)}>
              {catName(k)}
            </button>
          ))}
        </div>
        <div className="xcc-gal-list">
          {cat === 'By App'
            ? groups.map((g) => (
                <section key={g} className="xcc-gal-sec">
                  <h4>
                    {groupIcon(g)}
                    {g === 'System' || g === 'Portfolio' ? catName(g) : g}
                  </h4>
                  {list.filter((d) => appGroupOf(d) === g).map(item)}
                </section>
              ))
            : list.map(item)}
          {!list.length && <p className="xcc-note">{tx('noMatch', { q })}</p>}
        </div>
        <button type="button" className="xcc-gal-reset" onClick={onReset}>
          {tx('restore')}
        </button>
      </div>
    </div>
  );
}

/* ═════════════════════════ the editable grid ═════════════════════════ */

const SPAN: Record<CCSize, [number, number]> = { s: [1, 1], m: [2, 1], t: [1, 2], l: [2, 2] };

function Grid({ items, c, editing, onChange }: { items: CCItem[]; c: CCX; editing: boolean; onChange: (l: CCItem[]) => void }) {
  const drag = useRef<{ i: number; x: number; y: number; moved: boolean } | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const [dragI, setDragI] = useState<number | null>(null);
  const indexAt = (x: number, y: number) => {
    const el = document.elementsFromPoint(x, y).find((n) => (n as HTMLElement).dataset?.ccIndex !== undefined) as HTMLElement | undefined;
    return el ? Number(el.dataset.ccIndex) : null;
  };
  return (
    <div className={`xcc-grid ${editing ? 'editing' : ''}`}>
      {items.map((it, i) => {
        const d = DEF[it.id];
        if (!d) return null;
        const [w, h] = SPAN[it.s];
        const style: CSSProperties = { gridColumn: `span ${w}`, gridRow: `span ${h}`, ['--jig' as string]: `${(i % 4) * 0.06}s` };
        return (
          <div
            key={it.id}
            data-cc-index={i}
            className={`xcc-cell s-${it.s} ${dragI === i ? 'dragging' : ''} ${over === i && dragI !== null && dragI !== i ? 'drop' : ''}`}
            style={style}
            onPointerDown={(e) => {
              if (!editing || (e.target as HTMLElement).closest('.xcc-minus, .xcc-resize')) return;
              drag.current = { i, x: e.clientX, y: e.clientY, moved: false };
              e.currentTarget.setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
              const dr = drag.current;
              if (!dr) return;
              if (!dr.moved && Math.hypot(e.clientX - dr.x, e.clientY - dr.y) > 8) {
                dr.moved = true;
                setDragI(dr.i);
              }
              if (dr.moved) setOver(indexAt(e.clientX, e.clientY));
            }}
            onPointerUp={(e) => {
              const dr = drag.current;
              drag.current = null;
              setDragI(null);
              setOver(null);
              if (!dr?.moved) return;
              const to = indexAt(e.clientX, e.clientY);
              if (to === null || to === dr.i) return;
              const l = [...items];
              const [m] = l.splice(dr.i, 1);
              l.splice(to, 0, m);
              onChange(l);
            }}
            onPointerCancel={() => {
              drag.current = null;
              setDragI(null);
              setOver(null);
            }}
          >
            <div className="xcc-cell-in" inert={editing || undefined}>
              <Control item={it} c={c} />
            </div>
            {editing && (
              <>
                <button type="button" className="xcc-minus" aria-label={tx('remove', { x: defLabel(d) })} onClick={() => onChange(items.filter((_, k) => k !== i))}>
                  −
                </button>
                {d.sizes.length > 1 && (
                  <button type="button" className="xcc-resize" aria-label={tx('resize', { x: defLabel(d) })} onClick={() => onChange(items.map((x, k) => (k === i ? { ...x, s: d.sizes[(d.sizes.indexOf(x.s) + 1) % d.sizes.length] } : x)))}>
                    <i />
                  </button>
                )}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ═════════════════════════ Control Centre ═════════════════════════ */

/**
 * v10.2 — Control Centre for iPhone and iPad: groups (Favourites, Now Playing,
 * Connectivity, Portfolio) with an icon rail, Edit mode with remove /
 * resize / drag-to-rearrange, an "Add a Control" gallery with categories and
 * search, and everything saved in Settings.
 */
export function IOSControlCentre() {
  const c = useCC();
  const { settings, update, ios } = c;
  const [editing, setEditing] = useState(false);
  const [gallery, setGallery] = useState(false);
  const [group, setGroup] = useState<GroupId>('fav');
  const pages = useRef<HTMLDivElement>(null);
  const layout = settings.ccLayout ?? { fav: DEFAULT_FAV, work: DEFAULT_WORK };
  const fav = layout.fav ?? DEFAULT_FAV;
  const work = layout.work ?? DEFAULT_WORK;
  const setFav = (l: CCItem[]) => update({ ccLayout: { ...layout, fav: l } });
  const setWork = (l: CCItem[]) => update({ ccLayout: { ...layout, work: l } });
  const editTarget: 'fav' | 'work' = group === 'work' ? 'work' : 'fav';
  const used = (editTarget === 'work' ? work : fav).map((x) => x.id);
  const go = (g: GroupId) => {
    setGroup(g);
    pages.current?.querySelector<HTMLElement>(`[data-group="${g}"]`)?.scrollIntoView({ behavior: settings.reduceMotion ? 'auto' : 'smooth', block: 'start' });
  };
  // keep the rail in sync while scrolling between groups
  useEffect(() => {
    const el = pages.current;
    if (!el) return;
    const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && setGroup((e.target as HTMLElement).dataset.group as GroupId)), { root: el, threshold: 0.55 });
    el.querySelectorAll('[data-group]').forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && (gallery ? setGallery(false) : editing ? setEditing(false) : ios.setPanel('none'));
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [gallery, editing, ios]);
  const close = () => (editing ? setEditing(false) : ios.setPanel('none'));
  const statusRight = useMemo(() => {
    const parts: ReactNode[] = [];
    if (c.sys.airplane) parts.push(<CCIcon key="p" n="plane" size={14} fill />);
    else if (c.sys.wifi) parts.push(<CCIcon key="w" n="wifi" size={14} />);
    if (c.battery) parts.push(<span key="b">{Math.round(c.battery.level * 100)}%</span>);
    return parts;
  }, [c.sys.airplane, c.sys.wifi, c.battery]);
  return (
    <div className={`xcc-back ${editing ? 'is-editing' : ''}`} onClick={close}>
      <div className="xcc" role="dialog" aria-label={tx('controlCentre')} onClick={(e) => e.stopPropagation()}>
        <div className="xcc-top">
          <button type="button" className={`xcc-top-btn ${editing ? 'on' : ''}`} aria-label={editing ? tx('doneEditing') : tx('editControls')} onClick={() => setEditing((x) => !x)}>
            {editing ? tx('done') : <CCIcon n="plus" size={18} />}
          </button>
          <span className="xcc-status">{statusRight}</span>
          <button type="button" className="xcc-top-btn" aria-label={tx('power')} onClick={() => ios.setPanel('poweroff')}>
            <CCIcon n="power" size={18} />
          </button>
        </div>
        <div className="xcc-body">
          <div className="xcc-pages" ref={pages} onClick={(e) => e.target === e.currentTarget && close()}>
            <section className="xcc-page" data-group="fav" aria-label={tx('favourites')} onClick={(e) => e.target === e.currentTarget && close()}>
              <Grid items={fav} c={c} editing={editing} onChange={setFav} />
            </section>
            <section className="xcc-page" data-group="media" aria-label={tx('nowPlaying')}>
              <NowPlaying c={c} size="page" />
            </section>
            <section className="xcc-page" data-group="conn" aria-label={tx('connectivity')}>
              <Connectivity c={c} big />
            </section>
            <section className="xcc-page" data-group="work" aria-label={tx('portfolioControls')} onClick={(e) => e.target === e.currentTarget && close()}>
              <Grid items={work} c={c} editing={editing} onChange={setWork} />
            </section>
          </div>
          <nav className="xcc-rail" aria-label={tx('controlGroups')}>
            {GROUPS.map((g) => (
              <button key={g.id} type="button" className={group === g.id ? 'on' : ''} aria-label={tx(GROUP_TX[g.id])} aria-current={group === g.id || undefined} onClick={() => go(g.id)}>
                <CCIcon n={g.icon} size={15} fill={g.id === 'fav' && group === g.id} />
              </button>
            ))}
          </nav>
        </div>
        {editing && (
          <button type="button" className="xcc-add" onClick={() => setGallery(true)}>
            <CCIcon n="plus" size={16} /> {tx('addControl')}
          </button>
        )}
      </div>
      {gallery && (
        <Gallery
          used={used}
          onClose={() => setGallery(false)}
          onAdd={(id) => {
            const d = DEF[id];
            const item: CCItem = { id, s: d.sizes[0] };
            if (editTarget === 'work') setWork([...work, item]);
            else setFav([...fav, item]);
            if (group === 'media' || group === 'conn') go('fav');
          }}
          onReset={() => update({ ccLayout: defaultSettings.ccLayout })}
        />
      )}
      {c.qr && (
        <QRSheet
          title={c.qr === 'site' ? tx('openOther') : tx('contactTitle', { name: personal.name })}
          text={c.qr === 'site' ? socials.portfolio : vcard()}
          caption={c.qr === 'site' ? tx('scanSite') : tx('scanContact')}
          onClose={() => c.setQr(null)}
        />
      )}
    </div>
  );
}

export function vcard() {
  const [first, ...rest] = personal.name.split(' ');
  return ['BEGIN:VCARD', 'VERSION:3.0', `N:${rest.join(' ')};${first};;;`, `FN:${personal.name}`, `TEL;TYPE=CELL:${personal.phone.replace(/\s/g, '')}`, `EMAIL:${personal.email}`, `URL:${socials.portfolio}`, 'END:VCARD'].join('\n');
}
