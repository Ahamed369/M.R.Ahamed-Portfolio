import type { IconName } from '../components/AppIcons';
import type { AppId } from './types';
import { cv, personal, socials } from '../data/portfolio';

/**
 * Everything that can be "launched" — internal apps (optionally with
 * arguments) and external web apps. Used by Launchpad, Spotlight, the Dock
 * and desktop context menus so launch behaviour is defined once.
 */
export type LaunchAction = { app: AppId; args?: Record<string, string> } | { url: string; notifyTitle?: string } | { overlay: 'missioncontrol' | 'spotlight' };

export interface LaunchItem {
  id: string;
  label: string;
  icon: IconName;
  group: 'Portfolio' | 'Developer' | 'Internet & Social' | 'System' | 'Media';
  action: LaunchAction;
  keywords?: string;
}

export const LAUNCH_ITEMS: LaunchItem[] = [
  /* Portfolio */
  { id: 'about', label: 'About Me', icon: 'finder', group: 'Portfolio', action: { app: 'about' }, keywords: 'profile bio photo ahamed' },
  { id: 'projects', label: 'Projects', icon: 'xcode', group: 'Portfolio', action: { app: 'xcode' }, keywords: 'xcode portfolio repositories code' },
  { id: 'skills', label: 'My Skills', icon: 'notes', group: 'Portfolio', action: { app: 'notes' }, keywords: 'notes technologies stack' },
  { id: 'experience', label: 'Experience', icon: 'briefcase', group: 'Portfolio', action: { app: 'finder', args: { folder: 'all' } }, keywords: 'ventures business work founder' },
  { id: 'education', label: 'Education', icon: 'graduation', group: 'Portfolio', action: { app: 'finder', args: { folder: 'education' } }, keywords: 'sliit degree university diploma' },
  { id: 'leadership', label: 'Leadership', icon: 'star', group: 'Portfolio', action: { app: 'finder', args: { folder: 'leadership' } }, keywords: 'activities batch representative' },
  { id: 'timeline', label: 'Timeline', icon: 'timeline', group: 'Portfolio', action: { app: 'finder', args: { folder: 'timeline' } }, keywords: 'history milestones dates' },
  { id: 'achievements', label: 'Achievements', icon: 'slides', group: 'Portfolio', action: { app: 'slides' }, keywords: 'deck pptx highlights metrics' },
  { id: 'cv', label: 'CV — Resume', icon: 'pdf', group: 'Portfolio', action: { app: 'preview' }, keywords: 'resume curriculum vitae pdf download' },
  /* Developer */
  { id: 'xcode', label: 'Xcode', icon: 'xcode', group: 'Developer', action: { app: 'xcode' } },
  { id: 'terminal', label: 'Terminal', icon: 'terminal', group: 'Developer', action: { app: 'terminal' }, keywords: 'shell command zsh' },
  { id: 'github', label: 'GitHub', icon: 'github', group: 'Developer', action: { url: socials.github, notifyTitle: 'Opening GitHub — Ahamed369' }, keywords: 'repositories code' },
  { id: 'figma', label: 'Figma', icon: 'figma', group: 'Developer', action: { url: 'https://www.figma.com/', notifyTitle: 'Opening Figma' }, keywords: 'design ui ux' },
  { id: 'w3schools', label: 'W3Schools', icon: 'w3schools', group: 'Developer', action: { url: 'https://www.w3schools.com/', notifyTitle: 'Opening W3Schools' }, keywords: 'learn web reference' },
  /* Internet & Social */
  { id: 'safari', label: 'Safari', icon: 'safari', group: 'Internet & Social', action: { app: 'safari' }, keywords: 'browser web favorites' },
  { id: 'linkedin', label: 'LinkedIn', icon: 'linkedin', group: 'Internet & Social', action: { url: socials.linkedin, notifyTitle: 'Opening LinkedIn — M.R. Ahamed' } },
  { id: 'instagram', label: 'Instagram', icon: 'instagram', group: 'Internet & Social', action: { url: socials.instagram, notifyTitle: 'Opening Instagram — @__mr.ahamed__' } },
  { id: 'facebook', label: 'Facebook', icon: 'facebook', group: 'Internet & Social', action: { url: socials.facebook, notifyTitle: 'Opening Facebook' } },
  { id: 'threads', label: 'Threads', icon: 'threads', group: 'Internet & Social', action: { url: socials.threads, notifyTitle: 'Opening Threads — @__mr.ahamed__' } },
  { id: 'youtube', label: 'YouTube', icon: 'youtube', group: 'Internet & Social', action: { url: 'https://www.youtube.com/', notifyTitle: 'Opening YouTube' }, keywords: 'video' },
  /* System */
  { id: 'finder', label: 'Finder', icon: 'folder', group: 'System', action: { app: 'finder', args: { folder: 'all' } } },
  { id: 'messages', label: 'Messages', icon: 'messages', group: 'System', action: { app: 'messages' }, keywords: 'sms text chat contact phone' },
  { id: 'mail', label: 'Mail', icon: 'mail', group: 'System', action: { app: 'mail' }, keywords: `email contact ${personal.email}` },
  { id: 'calendar', label: 'Calendar', icon: 'calendar', group: 'System', action: { app: 'calendar' }, keywords: 'dates milestones month' },
  { id: 'photos', label: 'Photos', icon: 'photos', group: 'System', action: { app: 'photos' }, keywords: 'gallery pictures portraits images' },
  { id: 'reminders', label: 'Reminders', icon: 'reminders', group: 'System', action: { app: 'reminders' }, keywords: 'todo tasks list checklist' },
  { id: 'maps', label: 'Maps', icon: 'maps', group: 'System', action: { app: 'maps' }, keywords: 'google maps location kandy sri lanka directions' },
  { id: 'google', label: 'Google', icon: 'google', group: 'Internet & Social', action: { app: 'google' }, keywords: 'search web' },
  { id: 'contacts', label: 'Contacts', icon: 'contacts', group: 'System', action: { app: 'contacts' }, keywords: 'contact card vcard phone email address book' },
  { id: 'clock', label: 'Clock', icon: 'clock', group: 'System', action: { app: 'clock' }, keywords: 'world clock time stopwatch timer' },
  { id: 'calculator', label: 'Calculator', icon: 'calculator', group: 'System', action: { app: 'calculator' }, keywords: 'math calc numbers' },
  { id: 'settings', label: 'System Settings', icon: 'settings', group: 'System', action: { app: 'settings' }, keywords: 'preferences wallpaper dark mode appearance dock' },
  { id: 'camera', label: 'Camera', icon: 'camera', group: 'Media', action: { app: 'camera' }, keywords: 'photo booth selfie webcam picture video' },
  { id: 'voicememos', label: 'Voice Memos', icon: 'voicememos', group: 'Media', action: { app: 'voicememos' }, keywords: 'record audio microphone voice recorder' },
  { id: 'weather', label: 'Weather', icon: 'weather', group: 'System', action: { app: 'weather' }, keywords: 'forecast temperature rain kandy' },
  { id: 'findmy', label: 'Find My', icon: 'findmy', group: 'System', action: { app: 'findmy' }, keywords: 'location device people locate' },
  { id: 'home', label: 'Home', icon: 'home', group: 'System', action: { app: 'home' }, keywords: 'smart home lights scenes accessories' },
  { id: 'measure', label: 'Measure', icon: 'measure', group: 'System', action: { app: 'measure' }, keywords: 'ruler level distance pixels' },
  { id: 'tips', label: 'Tips', icon: 'tips', group: 'System', action: { app: 'tips' }, keywords: 'help shortcuts how to guide' },
  { id: 'pages', label: 'Pages', icon: 'pages', group: 'Portfolio', action: { app: 'pages' }, keywords: 'resume document word writer' },
  { id: 'numbers', label: 'Numbers', icon: 'numbers', group: 'Portfolio', action: { app: 'numbers' }, keywords: 'spreadsheet table projects chart' },
  { id: 'appstore', label: 'App Store', icon: 'appstore', group: 'Portfolio', action: { app: 'appstore' }, keywords: 'apps projects store download repositories' },
  /* v7 apps */
  { id: 'facetime', label: 'FaceTime', icon: 'facetime', group: 'Media', action: { app: 'facetime' }, keywords: 'video call camera' },
  { id: 'photobooth', label: 'Photo Booth', icon: 'photobooth', group: 'Media', action: { app: 'camera' }, keywords: 'camera selfie effects' },
  { id: 'podcasts', label: 'Podcasts', icon: 'podcasts', group: 'Media', action: { app: 'podcasts' }, keywords: 'listen episodes shows' },
  { id: 'tv', label: 'TV', icon: 'tv', group: 'Media', action: { app: 'tv' }, keywords: 'apple tv video watch movies clips' },
  { id: 'books', label: 'Books', icon: 'books', group: 'Media', action: { app: 'books' }, keywords: 'read library pdf ebooks' },
  { id: 'keynote', label: 'Keynote', icon: 'keynote', group: 'Portfolio', action: { app: 'slides' }, keywords: 'presentation slides deck achievements' },
  { id: 'journal', label: 'Journal', icon: 'journal', group: 'Portfolio', action: { app: 'journal' }, keywords: 'diary entries milestones' },
  { id: 'stocks', label: 'Stocks', icon: 'stocks', group: 'System', action: { app: 'stocks' }, keywords: 'market chart finance' },
  { id: 'freeform', label: 'Freeform', icon: 'freeform', group: 'Portfolio', action: { app: 'freeform' }, keywords: 'whiteboard draw sketch board' },
  { id: 'siri', label: 'Assistant', icon: 'siri', group: 'System', action: { app: 'siri' }, keywords: 'assistant siri ask voice question ai' },
  { id: 'passwords', label: 'Passwords', icon: 'passwords', group: 'System', action: { app: 'passwords' }, keywords: 'password generator strength security' },
  { id: 'dictionary', label: 'Dictionary', icon: 'dictionary', group: 'System', action: { app: 'dictionary' }, keywords: 'define word meaning thesaurus' },
  { id: 'gamecenter', label: 'Game Center', icon: 'gamecenter', group: 'Media', action: { app: 'gamecenter' }, keywords: 'games play snake sudoku 2048 puzzle' },
  { id: 'pdfreader', label: 'PDF Reader', icon: 'pdfreader', group: 'System', action: { app: 'preview' }, keywords: 'pdf viewer cv resume document' },
  { id: 'gmail', label: 'Gmail', icon: 'gmail', group: 'Internet & Social', action: { app: 'webapp', args: { service: 'gmail' } }, keywords: 'email mail google' },
  { id: 'drive', label: 'Google Drive', icon: 'drive', group: 'Internet & Social', action: { app: 'webapp', args: { service: 'drive' } }, keywords: 'files storage google' },
  { id: 'gphotos', label: 'Google Photos', icon: 'gphotos', group: 'Internet & Social', action: { app: 'webapp', args: { service: 'gphotos' } }, keywords: 'pictures google' },
  { id: 'classroom', label: 'Google Classroom', icon: 'classroom', group: 'Internet & Social', action: { app: 'webapp', args: { service: 'classroom' } }, keywords: 'school class google' },
  { id: 'word', label: 'Microsoft Word', icon: 'word', group: 'Internet & Social', action: { app: 'webapp', args: { service: 'word' } }, keywords: 'document docx office' },
  { id: 'excel', label: 'Microsoft Excel', icon: 'excel', group: 'Internet & Social', action: { app: 'webapp', args: { service: 'excel' } }, keywords: 'spreadsheet xlsx office' },
  { id: 'powerpoint', label: 'Microsoft PowerPoint', icon: 'powerpoint', group: 'Internet & Social', action: { app: 'webapp', args: { service: 'powerpoint' } }, keywords: 'presentation pptx office' },
  { id: 'chatgpt', label: 'ChatGPT', icon: 'chatgpt', group: 'Internet & Social', action: { app: 'webapp', args: { service: 'chatgpt' } }, keywords: 'ai chatbot openai' },
  { id: 'claude', label: 'Claude', icon: 'claude', group: 'Internet & Social', action: { app: 'webapp', args: { service: 'claude' } }, keywords: 'ai chatbot anthropic' },
  { id: 'gemini', label: 'Gemini', icon: 'gemini', group: 'Internet & Social', action: { app: 'webapp', args: { service: 'gemini' } }, keywords: 'ai chatbot google' },
  { id: 'deepseek', label: 'DeepSeek', icon: 'deepseek', group: 'Internet & Social', action: { app: 'webapp', args: { service: 'deepseek' } }, keywords: 'ai chatbot' },
  { id: 'shazam', label: 'Shazam', icon: 'shazam', group: 'Internet & Social', action: { app: 'webapp', args: { service: 'shazam' } }, keywords: 'music identify song' },
  { id: 'snapchat', label: 'Snapchat', icon: 'snapchat', group: 'Internet & Social', action: { app: 'webapp', args: { service: 'snapchat' } }, keywords: 'social camera' },
  /* v8 apps */
  { id: 'hireme', label: 'Hire Me', icon: 'hireme', group: 'Portfolio', action: { app: 'hireme' }, keywords: 'hire recruit internship job cv contact book call availability' },
  { id: 'casestudies', label: 'Case Studies', icon: 'casestudies', group: 'Portfolio', action: { app: 'casestudies' }, keywords: 'projects case study problem solution github process' },
  { id: 'askai', label: 'Ask Me AI', icon: 'askai', group: 'Portfolio', action: { app: 'askai' }, keywords: 'ai chat questions assistant about ahamed' },
  { id: 'guestbook', label: 'Guestbook', icon: 'guestbook', group: 'Portfolio', action: { app: 'guestbook' }, keywords: 'visitors messages sign comments feedback' },
  { id: 'wallet', label: 'Wallet', icon: 'wallet', group: 'System', action: { app: 'wallet' }, keywords: 'cards certificates passes login' },
  { id: 'whatsapp', label: 'WhatsApp', icon: 'whatsapp', group: 'Internet & Social', action: { app: 'whatsapp' }, keywords: 'chat message whatsapp' },
  { id: 'telegram', label: 'Telegram', icon: 'telegram', group: 'Internet & Social', action: { app: 'telegram' }, keywords: 'chat message channel' },
  { id: 'xapp', label: 'X', icon: 'xapp', group: 'Internet & Social', action: { app: 'xapp' }, keywords: 'twitter x posts tweet timeline' },
  { id: 'yahoomail', label: 'Yahoo Mail', icon: 'yahoomail', group: 'Internet & Social', action: { app: 'yahoomail' }, keywords: 'email yahoo inbox' },
  { id: 'playstore', label: 'Google Play', icon: 'playstore', group: 'Internet & Social', action: { app: 'webapp', args: { service: 'playstore' } }, keywords: 'play store android apps install' },
  /* v10 */
  { id: 'phone', label: 'Phone', icon: 'phoneapp', group: 'System', action: { app: 'phone' }, keywords: 'call dial keypad contact recents voicemail' },
  { id: 'shortcuts', label: 'Shortcuts', icon: 'shortcuts', group: 'System', action: { app: 'shortcuts' }, keywords: 'automation actions workflow run' },
  { id: 'chess', label: 'Chess', icon: 'chess', group: 'Media', action: { app: 'chess' }, keywords: 'game board play' },
  { id: 'textedit', label: 'TextEdit', icon: 'textedit', group: 'System', action: { app: 'textedit' }, keywords: 'text editor write document rtf plain' },
  /* v9 */
  { id: 'services', label: 'My Services', icon: 'services', group: 'Portfolio', action: { app: 'services' }, keywords: 'services expertise capabilities technology business automotive trade property sales marketing web development pos' },
  { id: 'sysprefs', label: 'System Preferences', icon: 'sysprefs', group: 'System', action: { app: 'sysprefs' }, keywords: 'preferences settings control panel classic' },
  { id: 'activity', label: 'Activity Monitor', icon: 'activity', group: 'System', action: { app: 'activity' }, keywords: 'cpu memory processes performance fps energy' },
  { id: 'timemachine', label: 'Time Machine', icon: 'timemachine', group: 'System', action: { app: 'timemachine' }, keywords: 'backup restore snapshot history time machine' },
  { id: 'mirroring', label: 'iPhone Mirroring', icon: 'mirroring', group: 'System', action: { app: 'mirroring' }, keywords: 'iphone phone mirror mobile view' },
  { id: 'learning', label: 'Learning Hub', icon: 'learning', group: 'Portfolio', action: { app: 'learning' }, keywords: 'learn study it programming english career courses tutorials resources w3schools' },
  { id: 'flashcards', label: 'Flashcards', icon: 'flashcards', group: 'Portfolio', action: { app: 'flashcards' }, keywords: 'flashcards quiz study revise spaced repetition cards test practice' },
  { id: 'focusplanner', label: 'Focus Planner', icon: 'focusplanner', group: 'Portfolio', action: { app: 'focusplanner' }, keywords: 'focus pomodoro study planner timetable timer schedule productivity' },
  { id: 'goals', label: 'Goals & Tasks', icon: 'goals', group: 'Portfolio', action: { app: 'goals' }, keywords: 'goals tasks kanban todo board milestones progress plan' },
  { id: 'bizplanner', label: 'Business Planner', icon: 'bizplanner', group: 'Portfolio', action: { app: 'bizplanner' }, keywords: 'business model canvas swot budget entrepreneur startup idea checklist plan' },
  { id: 'playground', label: 'Code Playground', icon: 'playground', group: 'Portfolio', action: { app: 'playground' }, keywords: 'code html css javascript editor playground run live preview programming' },
  { id: 'documents', label: 'Documents', icon: 'documents', group: 'Portfolio', action: { app: 'documents' }, keywords: 'documents files cv pdf viewer notes exports office' },
  { id: 'guidebook', label: 'Guidebook', icon: 'guidebook', group: 'Portfolio', action: { app: 'guidebook' }, keywords: 'guide guidebook help how to tutorial manual tips start learn portfolio a-z' },
  { id: 'whatsnew', label: 'What’s New', icon: 'whatsnew', group: 'Portfolio', action: { app: 'whatsnew' }, keywords: 'changelog updates version history new features' },
  { id: 'stickies', label: 'Stickies', icon: 'stickies', group: 'System', action: { app: 'stickies' }, keywords: 'sticky notes post-it memo' },
  { id: 'translate', label: 'Translate', icon: 'translate', group: 'System', action: { app: 'translate' }, keywords: 'translation language sinhala tamil english' },
  { id: 'fontbook', label: 'Font Book', icon: 'fontbook', group: 'Developer', action: { app: 'fontbook' }, keywords: 'fonts typography typeface' },
  { id: 'grapher', label: 'Grapher', icon: 'grapher', group: 'Developer', action: { app: 'grapher' }, keywords: 'graph plot math function equation' },
  { id: 'colormeter', label: 'Digital Color Meter', icon: 'colormeter', group: 'Developer', action: { app: 'colormeter' }, keywords: 'color picker eyedropper hex rgb' },
  { id: 'discord', label: 'Discord', icon: 'discord', group: 'Internet & Social', action: { app: 'webapp', args: { service: 'discord' } }, keywords: 'chat community voice' },
  { id: 'reddit', label: 'Reddit', icon: 'reddit', group: 'Internet & Social', action: { app: 'webapp', args: { service: 'reddit' } }, keywords: 'community forum' },
  { id: 'stackoverflow', label: 'Stack Overflow', icon: 'stackoverflow', group: 'Developer', action: { app: 'webapp', args: { service: 'stackoverflow' } }, keywords: 'questions answers code help' },
  { id: 'pinterest', label: 'Pinterest', icon: 'pinterest', group: 'Internet & Social', action: { app: 'webapp', args: { service: 'pinterest' } }, keywords: 'ideas inspiration boards' },
  { id: 'canva', label: 'Canva', icon: 'canva', group: 'Developer', action: { app: 'webapp', args: { service: 'canva' } }, keywords: 'design graphics poster' },
  { id: 'gdocs', label: 'Google Docs', icon: 'gdocs', group: 'Internet & Social', action: { app: 'webapp', args: { service: 'gdocs' } }, keywords: 'documents google write' },
  /* Media */
  { id: 'music', label: 'Music', icon: 'music', group: 'Media', action: { app: 'music' }, keywords: 'player audio songs now playing' },
  { id: 'notes', label: 'Notes', icon: 'notes', group: 'System', action: { app: 'notes' }, keywords: 'notes app writing' },
  { id: 'preview', label: 'Preview', icon: 'preview', group: 'System', action: { app: 'preview' }, keywords: 'pdf viewer cv resume document' },
  { id: 'missioncontrol', label: 'Mission Control', icon: 'missioncontrol', group: 'System', action: { overlay: 'missioncontrol' }, keywords: 'windows overview spaces expose f3' },
  { id: 'spotify', label: 'Spotify', icon: 'spotify', group: 'Media', action: { url: socials.spotify, notifyTitle: 'Opening Spotify profile' }, keywords: 'music playlist' },
];

export const LAUNCH_GROUPS: LaunchItem['group'][] = ['Portfolio', 'Developer', 'Internet & Social', 'System', 'Media'];

/* ─────────────── Launchpad layout (macOS-like order + folders) ─────────────── */

export type LaunchFolderId = 'utilities' | 'other' | 'google' | 'office' | 'ai' | 'social';

export interface LaunchFolder {
  id: LaunchFolderId;
  label: string;
  items: string[];
}

export const LAUNCH_FOLDERS: LaunchFolder[] = [
  { id: 'utilities', label: 'Utilities', items: ['terminal', 'activity', 'colormeter', 'fontbook', 'grapher', 'measure', 'pdfreader', 'dictionary', 'passwords'] },
  { id: 'google', label: 'Google', items: ['google', 'gmail', 'drive', 'gdocs', 'gphotos', 'classroom', 'playstore'] },
  { id: 'office', label: 'Microsoft 365', items: ['word', 'excel', 'powerpoint'] },
  { id: 'ai', label: 'AI Assistants', items: ['chatgpt', 'claude', 'gemini', 'deepseek'] },
  { id: 'other', label: 'Other', items: ['github', 'linkedin', 'instagram', 'facebook', 'threads', 'youtube', 'snapchat', 'shazam', 'figma', 'w3schools', 'spotify', 'stackoverflow', 'canva'] },
  { id: 'social', label: 'Social', items: ['whatsapp', 'telegram', 'xapp', 'yahoomail', 'discord', 'reddit', 'pinterest'] },
];

/**
 * Top-level Launchpad order. Strings are LAUNCH_ITEMS ids; `folder:<id>` places
 * a folder tile. Items that live in a folder are not repeated on the pages.
 * ('projects' is omitted because it is the same app as Xcode — it stays
 * searchable.)
 */
export const LAUNCHPAD_ORDER: string[] = [
  'appstore', 'safari', 'mail', 'contacts', 'calendar', 'reminders', 'notes', 'clock',
  'facetime', 'messages', 'maps', 'findmy', 'photobooth', 'photos', 'music', 'preview',
  'podcasts', 'tv', 'voicememos', 'keynote', 'numbers', 'pages', 'journal', 'weather',
  'stocks', 'books', 'xcode', 'calculator', 'freeform', 'home', 'tips', 'siri',
  'gamecenter', 'missioncontrol', 'passwords', 'settings', 'folder:utilities', 'folder:other',
  'folder:google', 'folder:office', 'folder:ai', 'hireme', 'casestudies', 'askai', 'guestbook', 'wallet',
  'folder:social', 'camera', 'finder', 'services', 'sysprefs', 'stickies', 'translate', 'timemachine', 'mirroring', 'learning', 'whatsnew',
  'flashcards', 'focusplanner', 'goals', 'bizplanner', 'playground', 'documents', 'guidebook',
  'about', 'skills', 'experience', 'education', 'leadership', 'timeline', 'cv',
];

export const cvDownload = { href: cv.url, fileName: cv.fileName };
