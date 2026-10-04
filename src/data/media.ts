/**
 * ─────────────────────────────────────────────────────────────
 *  MEDIA REGISTRY — photos, screenshots, wallpapers, music
 * ─────────────────────────────────────────────────────────────
 *  All files live in /public/assets/… (see README → Assets).
 *  To add a photo / wallpaper / track, drop the file into its folder
 *  and add one entry below.
 */

/* ───────────────────────────── Photos ───────────────────────────── */

export type Album = 'Portraits' | 'Screenshots' | 'Wallpapers' | 'Imports';

export interface Photo {
  id: string;
  src: string;
  title: string;
  album: Album;
  /** width / height — used for the justified grid */
  ratio: number;
}

/** M.R. Ahamed's own photographs (unaltered, only resized for the web). */
export const photos: Photo[] = [
  { id: 'p01', src: './assets/photos/ahamed-01.jpg', title: 'Grey suit · window light', album: 'Portraits', ratio: 2 / 3 },
  { id: 'p02', src: './assets/photos/ahamed-02.jpg', title: 'Black suit · studio', album: 'Portraits', ratio: 3 / 4 },
  { id: 'p03', src: './assets/photos/ahamed-03.jpg', title: 'Navy double-breasted', album: 'Portraits', ratio: 0.68 },
  { id: 'p04', src: './assets/photos/ahamed-04.jpg', title: 'Lounge portrait', album: 'Portraits', ratio: 1 },
  { id: 'p05', src: './assets/photos/ahamed-05.jpg', title: 'Three-piece suit', album: 'Portraits', ratio: 0.71 },
  { id: 'p06', src: './assets/photos/ahamed-06.jpg', title: 'Beige suit · studio', album: 'Portraits', ratio: 2 / 3 },
  { id: 'p07', src: './assets/photos/ahamed-07.jpg', title: 'Grey suit · wood panel', album: 'Portraits', ratio: 2 / 3 },
  { id: 'p08', src: './assets/photos/ahamed-08.jpg', title: 'Neon portrait', album: 'Portraits', ratio: 3 / 4 },
  { id: 'p09', src: './assets/photos/ahamed-09.jpg', title: 'Casual studio', album: 'Portraits', ratio: 0.73 },
  { id: 'p10', src: './images/ahamed.jpg', title: 'Headshot', album: 'Portraits', ratio: 0.714 },
  /* Screenshots of this portfolio */
  { id: 's01', src: './assets/screenshots/desktop.jpg', title: 'Portfolio desktop', album: 'Screenshots', ratio: 1.6 },
  { id: 's02', src: './assets/screenshots/xcode.jpg', title: 'Projects in Xcode', album: 'Screenshots', ratio: 1.6 },
  { id: 's03', src: './assets/screenshots/notes.jpg', title: 'Skills in Notes', album: 'Screenshots', ratio: 1.6 },
  { id: 's04', src: './assets/screenshots/experience.jpg', title: 'Experience in Finder', album: 'Screenshots', ratio: 1.6 },
  { id: 's05', src: './assets/screenshots/achievements.jpg', title: 'Achievements deck', album: 'Screenshots', ratio: 1.6 },
  { id: 's06', src: './assets/screenshots/dark-mode.jpg', title: 'Dark Mode', album: 'Screenshots', ratio: 1.6 },
  /* v9 */
  { id: 's07', src: './assets/screenshots/services.jpg', title: 'My Services — Expertise & Capabilities', album: 'Screenshots', ratio: 1.6 },
  { id: 's08', src: './assets/screenshots/system-preferences.jpg', title: 'System Preferences', album: 'Screenshots', ratio: 1.6 },
  { id: 's09', src: './assets/screenshots/appearance.jpg', title: 'Appearance & Liquid Glass', album: 'Screenshots', ratio: 1.6 },
  { id: 's10', src: './assets/screenshots/grapher.jpg', title: 'Grapher', album: 'Screenshots', ratio: 1.6 },
  { id: 's11', src: './assets/screenshots/applications.jpg', title: 'Launchpad', album: 'Screenshots', ratio: 1.6 },
  /* v10 */
  { id: 's12', src: './assets/screenshots/iphone-home.jpg', title: 'iPhone Home Screen', album: 'Screenshots', ratio: 786 / 1704 },
  { id: 's13', src: './assets/screenshots/ipad-home.jpg', title: 'iPad Home Screen', album: 'Screenshots', ratio: 1180 / 820 },
  { id: 's14', src: './assets/screenshots/casestudies-dark.jpg', title: 'Case Studies in Dark Mode', album: 'Screenshots', ratio: 1.6 },
];

/* ───────────────────────────── Videos ───────────────────────────── */

export interface Video {
  id: string;
  title: string;
  description: string;
  src: string;
  poster: string;
  /** seconds (approximate, for display before metadata loads) */
  length: number;
}

/** Screen recordings of this portfolio (recorded from the portfolio itself). */
export const videos: Video[] = [
  { id: 'v-tour', title: 'Desktop Tour', description: 'Start-up, lock screen and the macOS-style desktop.', src: './assets/videos/desktop-tour.mp4', poster: './assets/videos/desktop-tour.jpg', length: 21 },
  { id: 'v-iphone', title: 'iPhone Tour', description: 'Home Screen pages, an app opening, Control Centre and the App Switcher.', src: './assets/videos/iphone-tour.mp4', poster: './assets/videos/iphone-tour.jpg', length: 21 },
  { id: 'v-apps', title: 'Apps in Action', description: 'Opening Xcode, Notes, Photos, Music and Case Studies.', src: './assets/videos/apps-tour.mp4', poster: './assets/videos/apps-tour.jpg', length: 17 },
  { id: 'v-launchpad', title: 'Launchpad & Mission Control', description: 'Mission Control, switching desktops and Launchpad.', src: './assets/videos/launchpad.mp4', poster: './assets/videos/launchpad.jpg', length: 18 },
  { id: 'v-dark', title: 'Dark Mode & Wallpapers', description: 'Switching appearance and wallpapers.', src: './assets/videos/dark-mode.mp4', poster: './assets/videos/dark-mode.jpg', length: 16 },
];

/* ───────────────────────────── Wallpapers ───────────────────────────── */

export type WallpaperCategory = 'Colorful' | 'Dark' | 'Light' | 'Landscape' | 'Minimal' | 'Abstract' | 'Custom';

/** v10.2 — library categories (a wallpaper can be in several) */
export type WallCat = 'Featured' | 'Dynamic' | 'Live' | 'Light' | 'Dark' | 'Abstract' | 'Gradient' | 'Nature' | 'Space' | 'Minimal' | 'Color' | 'Portfolio';
export const WALL_CATS: WallCat[] = ['Featured', 'Dynamic', 'Live', 'Light', 'Dark', 'Abstract', 'Gradient', 'Nature', 'Space', 'Minimal', 'Color', 'Portfolio'];
export type WallDevice = 'mac' | 'ipad' | 'iphone';
/** v10.2 — 'photo' = image file · 'art' = drawn in code (sharp at any size, composed for the screen shape) · 'dynamic' = changes with time / appearance · 'live' = gentle motion */
export type WallKind = 'photo' | 'art' | 'dynamic' | 'live';

export interface WallpaperDef {
  id: string;
  name: string;
  category: WallpaperCategory;
  kind?: WallKind;
  cats?: WallCat[];
  /** devices it is offered on (default: all) */
  devices?: WallDevice[];
  /** main colours (for matching app-icon tints) */
  palette?: string[];
  /** Brightness of the upper area — decides menu-bar text colour. */
  tone: 'light' | 'dark';
  src: string;
  thumb: string;
}

const wp = (id: string, name: string, category: WallpaperCategory, tone: 'light' | 'dark', cats: WallCat[] = [], devices: WallDevice[] = ['mac', 'ipad', 'iphone'], palette: string[] = []): WallpaperDef => ({
  id,
  name,
  category,
  kind: 'photo',
  cats,
  devices,
  palette,
  tone,
  src: `./assets/wallpapers/${id}.jpg`,
  thumb: `./assets/wallpapers/thumbs/thumb-${id}.jpg`,
});

/** Wallpapers: original ones created for this portfolio, plus ones supplied by M.R. Ahamed. */
export const wallpapers: WallpaperDef[] = [
  wp('sonoma', 'Sonoma Hills', 'Colorful', 'dark', ['Featured', 'Color', 'Nature'], ['mac', 'ipad', 'iphone'], ['#d9466f', '#7a5af8', '#2f9e44']),
  wp('tahoe', 'Tahoe', 'Colorful', 'dark', ['Nature', 'Color'], ['mac', 'ipad'], ['#3b82c4', '#1e3a5f', '#f2a65a']),
  wp('sunset', 'Sunset', 'Colorful', 'dark', ['Color', 'Gradient'], ['mac', 'ipad', 'iphone'], ['#ff7a45', '#d6336c', '#5f3dc4']),
  wp('galaxy', 'Galaxy', 'Dark', 'dark', ['Space', 'Dark'], ['mac', 'ipad', 'iphone'], ['#5f3dc4', '#1c1b4b', '#e64980']),
  wp('graphite', 'Graphite', 'Dark', 'dark', ['Dark', 'Minimal'], ['mac', 'ipad', 'iphone'], ['#495057', '#212529', '#868e96']),
  wp('aurora', 'Aurora', 'Colorful', 'dark', ['Color', 'Abstract'], ['mac', 'ipad', 'iphone'], ['#20c997', '#7048e8', '#1c7ed6']),
  wp('flame', 'Flame Waves', 'Colorful', 'dark', ['Color', 'Abstract'], ['mac', 'ipad', 'iphone'], ['#ff6b35', '#e03131', '#ffa94d']),
  wp('midnight', 'Midnight', 'Dark', 'dark', ['Dark', 'Minimal'], ['mac', 'ipad', 'iphone'], ['#1b2a4a', '#0b1020', '#4263eb']),
  wp('cloud', 'Cloud', 'Light', 'light', ['Light', 'Nature'], ['mac', 'ipad'], ['#a5d8ff', '#e7f5ff', '#748ffc']),
  wp('peaks', 'Peaks at Dusk', 'Landscape', 'dark', ['Nature', 'Dark'], ['mac', 'ipad'], ['#5c3d8a', '#f08c00', '#1a1a40']),
  wp('lake', 'Morning Lake', 'Landscape', 'light', ['Nature', 'Light'], ['mac', 'ipad'], ['#74c0fc', '#ffd8a8', '#2b8a3e']),
  wp('pro-dark', 'Pro Dark', 'Minimal', 'dark', ['Minimal', 'Dark'], ['mac', 'ipad', 'iphone'], ['#343a40', '#5c7cfa', '#212529']),
  wp('pro-light', 'Pro Light', 'Minimal', 'light', ['Minimal', 'Light'], ['mac', 'ipad', 'iphone'], ['#e9ecef', '#748ffc', '#adb5bd']),
  /* Supplied by M.R. Ahamed */
  wp('navy-waves', 'Midnight Waves', 'Dark', 'dark', ['Dark', 'Abstract'], ['mac', 'ipad', 'iphone'], ['#1c2a5a', '#3b5bdb', '#0b1020']),
  wp('champagne-waves', 'Champagne Waves', 'Light', 'light', ['Light', 'Abstract'], ['mac', 'ipad', 'iphone'], ['#e6c9a8', '#f8f0e3', '#b08968']),
  wp('violet-fan', 'Violet Fan', 'Colorful', 'dark', ['Color', 'Abstract'], ['mac', 'ipad', 'iphone'], ['#7950f2', '#e64980', '#3b5bdb']),
  wp('liquid-glass', 'Liquid Glass', 'Colorful', 'dark', ['Featured', 'Abstract', 'Color'], ['mac', 'ipad', 'iphone'], ['#4dabf7', '#9775fa', '#f783ac']),
  wp('ocean-shore', 'Ocean Shore', 'Landscape', 'dark', ['Nature'], ['mac', 'ipad'], ['#1971c2', '#e9ecef', '#495057']),
  wp('big-sur-waves', 'Big Sur Waves', 'Colorful', 'dark', ['Abstract', 'Color'], ['mac', 'ipad', 'iphone'], ['#1098ad', '#f76707', '#5c940d']),
  wp('alpine-glow', 'Alpine Glow', 'Landscape', 'dark', ['Nature'], ['mac', 'ipad'], ['#f08c00', '#5c3d8a', '#e9ecef']),
  wp('violet-pills', 'Violet Pills', 'Colorful', 'dark', ['Abstract', 'Color'], ['mac', 'ipad', 'iphone'], ['#845ef7', '#cc5de8', '#4c6ef5']),
  wp('black-curves', 'Black Curves', 'Dark', 'dark', ['Dark', 'Abstract', 'Minimal'], ['mac', 'ipad', 'iphone'], ['#212529', '#495057', '#000000']),
  /* v8 — supplied by M.R. Ahamed */
  wp('desert-night', 'Desert Night', 'Landscape', 'dark', ['Nature', 'Dark', 'Space'], ['mac', 'ipad', 'iphone'], ['#5f3dc4', '#e8590c', '#1a1b4b']),
  wp('lone-cypress', 'Lone Cypress', 'Landscape', 'light', ['Nature', 'Light'], ['mac', 'ipad'], ['#74c0fc', '#2f9e44', '#ffe066']),
  wp('sage-waves', 'Sage Waves', 'Minimal', 'light', ['Minimal', 'Light'], ['mac', 'ipad', 'iphone'], ['#8ce99a', '#d3f9d8', '#5c940d']),
  /* v9 — new original 4K wallpapers created for this portfolio */
  wp('mesh-coral', 'Coral Mesh', 'Abstract', 'light', ['Gradient', 'Light', 'Abstract'], ['mac', 'ipad', 'iphone'], ['#ff8787', '#ffd8a8', '#da77f2']),
  wp('mesh-ocean', 'Ocean Mesh', 'Abstract', 'dark', ['Gradient', 'Dark'], ['mac', 'ipad', 'iphone'], ['#1864ab', '#0b7285', '#5f3dc4']),
  wp('glass-orbs', 'Glass Orbs', 'Abstract', 'dark', ['Abstract', 'Dark'], ['mac', 'ipad', 'iphone'], ['#4c6ef5', '#ae3ec9', '#15aabf']),
  wp('northern-lights', 'Northern Lights', 'Landscape', 'dark', ['Featured', 'Nature', 'Space'], ['mac', 'ipad', 'iphone'], ['#20c997', '#5f3dc4', '#0b1020']),
  wp('layered-hills', 'Layered Hills', 'Landscape', 'light', ['Nature', 'Light'], ['mac', 'ipad'], ['#ffa94d', '#9775fa', '#ffd8a8']),
  wp('dune-dusk', 'Dune Dusk', 'Landscape', 'dark', ['Nature'], ['mac', 'ipad', 'iphone'], ['#e8590c', '#5f3dc4', '#ffd8a8']),
];

/* The wallpapers also appear in Photos → Albums → Wallpapers. */
photos.push(...wallpapers.map((w): Photo => ({ id: `w-${w.id}`, src: w.src, title: `${w.name} wallpaper`, album: 'Wallpapers', ratio: 1.6 })));

/* v8 — Dynamic wallpaper: changes with the time of day (morning lake → daytime Sonoma →
   sunset → desert night). Added after the Photos album so it isn't duplicated there. */
const dynamicPick = (): WallpaperDef => {
  const h = new Date().getHours();
  const id = h >= 5 && h < 9 ? 'lake' : h >= 9 && h < 17 ? 'sonoma' : h >= 17 && h < 19 ? 'sunset' : 'desert-night';
  return wallpapers.find((w) => w.id === id) ?? wallpapers[0];
};
wallpapers.push({
  id: 'dynamic',
  name: 'Time of Day (photos)',
  category: 'Colorful',
  kind: 'dynamic',
  cats: ['Dynamic', 'Nature'],
  devices: ['mac', 'ipad'],
  get palette() {
    return dynamicPick().palette;
  },
  get tone() {
    return dynamicPick().tone;
  },
  get src() {
    return dynamicPick().src;
  },
  get thumb() {
    return dynamicPick().thumb;
  },
});

/* v10.2 — wallpapers drawn in code (components/ProcWall.tsx): they stay sharp at any size and are
   composed for the screen they are on (tall phone, iPad in either orientation, wide Mac). */
const art = (id: string, name: string, kind: WallKind, tone: 'light' | 'dark', cats: WallCat[], palette: string[], devices: WallDevice[] = ['mac', 'ipad', 'iphone']): WallpaperDef => ({ id, name, category: 'Abstract', kind, cats, devices, palette, tone, src: '', thumb: '' });
wallpapers.push(
  // live (gentle motion)
  art('live-aurora', 'Aurora', 'live', 'dark', ['Featured', 'Live', 'Space', 'Dark'], ['#2be4a4', '#7c4dff', '#0b1236']),
  art('live-flow', 'Flow', 'live', 'dark', ['Featured', 'Live', 'Gradient', 'Color'], ['#ff5f9e', '#5b5bff', '#16c6d6']),
  art('live-orbs', 'Glass Orbs', 'live', 'dark', ['Live', 'Abstract'], ['#5c7cfa', '#cc5de8', '#22b8cf']),
  art('live-waves', 'Ocean Waves', 'live', 'dark', ['Live', 'Nature', 'Abstract'], ['#1c7ed6', '#15aabf', '#0b2545']),
  art('live-space', 'Deep Space', 'live', 'dark', ['Live', 'Space', 'Dark'], ['#9775fa', '#4dabf7', '#05060f']),
  art('live-clouds', 'Drifting Clouds', 'live', 'light', ['Live', 'Nature', 'Light'], ['#74c0fc', '#ffffff', '#ffa8a8']),
  // dynamic
  art('dyn-sky', 'Sky (time of day)', 'dynamic', 'dark', ['Featured', 'Dynamic', 'Nature'], ['#ff922b', '#4dabf7', '#1b1f4b']),
  art('dyn-theme', 'Light & Dark', 'dynamic', 'dark', ['Dynamic', 'Gradient', 'Minimal'], ['#748ffc', '#e599f7', '#212529']),
  // drawn, static
  art('art-ribbons', 'Ribbons', 'art', 'dark', ['Featured', 'Abstract', 'Color'], ['#ff6b9a', '#845ef7', '#22b8cf']),
  art('art-bloom', 'Bloom', 'art', 'dark', ['Color', 'Abstract'], ['#f06595', '#ffa94d', '#7048e8']),
  art('grad-sunrise', 'Sunrise', 'art', 'light', ['Gradient', 'Light'], ['#ffc078', '#f783ac', '#9775fa']),
  art('grad-ocean', 'Deep Ocean', 'art', 'dark', ['Gradient', 'Dark'], ['#0b7285', '#1864ab', '#0b1020']),
  art('space-nebula', 'Nebula', 'art', 'dark', ['Space', 'Dark', 'Color'], ['#e64980', '#5f3dc4', '#0b0b1e']),
  art('min-ink', 'Ink', 'art', 'dark', ['Minimal', 'Dark', 'Portfolio'], ['#3b5bdb', '#212529', '#868e96']),
  art('min-paper', 'Paper', 'art', 'light', ['Minimal', 'Light'], ['#adb5bd', '#f8f9fa', '#748ffc']),
  art('portfolio-mra', 'M.R. Ahamed', 'art', 'dark', ['Featured', 'Portfolio', 'Gradient'], ['#4c6ef5', '#ae3ec9', '#0b1020']),
  art('portfolio-code', 'Code', 'art', 'dark', ['Portfolio', 'Dark', 'Minimal'], ['#51cf66', '#339af0', '#0d1117']),
  // v10.3 — light partner for Ribbons, and a separate iPad set in light + dark
  art('art-ribbons-light', 'Ribbons (Light)', 'art', 'light', ['Abstract', 'Light', 'Color'], ['#ff6b9a', '#845ef7', '#f6f2fb']),
  art('ipad-folds-light', 'Folds (Light)', 'art', 'light', ['Featured', 'Abstract', 'Light'], ['#7aa2ff', '#b48cff', '#ff9cc8'], ['ipad']),
  art('ipad-folds-dark', 'Folds (Dark)', 'art', 'dark', ['Featured', 'Abstract', 'Dark'], ['#4c3cf0', '#9b3ff2', '#ff5aa5'], ['ipad']),
  art('ipad-halo-light', 'Halo (Light)', 'art', 'light', ['Minimal', 'Light', 'Gradient'], ['#8fb3ff', '#c4b0ff', '#8ee6ef'], ['ipad']),
  art('ipad-halo-dark', 'Halo (Dark)', 'art', 'dark', ['Minimal', 'Dark', 'Gradient'], ['#2f6bff', '#7b5cff', '#00c2d1'], ['ipad']),
  art('ipad-dunes-light', 'Dunes (Light)', 'art', 'light', ['Nature', 'Light'], ['#f6a26b', '#ffb88a', '#b25440'], ['ipad']),
  art('ipad-dunes-dark', 'Dunes (Dark)', 'art', 'dark', ['Nature', 'Dark', 'Space'], ['#3b2f6b', '#2a2457', '#f1ecff'], ['ipad']),
);

/** per-device default wallpapers (a phone, a tablet and a desktop each get their own) */
export const DEVICE_DEFAULT_WALL: Record<WallDevice, string> = { mac: 'sonoma', ipad: 'liquid-glass', iphone: 'art-ribbons' };
export const wallCats = (w: WallpaperDef): WallCat[] => w.cats ?? [];
export const wallFor = (dev: WallDevice) => wallpapers.filter((w) => (w.devices ?? ['mac', 'ipad', 'iphone']).includes(dev));
export const isProcWall = (w: WallpaperDef) => w.kind === 'art' || w.kind === 'live' || (w.kind === 'dynamic' && w.id !== 'dynamic');

/* v9 — "Custom": any photo from Photos, or an image the visitor uploads (Settings → Wallpaper). */
let customSrc = '';
let customTone: 'light' | 'dark' = 'dark';
export const setCustomWallpaper = (src: string, tone: 'light' | 'dark' = 'dark') => {
  customSrc = src;
  customTone = tone;
};
const customDef: WallpaperDef = {
  id: 'custom',
  name: 'Your Photo',
  category: 'Custom',
  get tone() {
    return customTone;
  },
  get src() {
    return customSrc || wallpapers[0].src;
  },
  get thumb() {
    return customSrc || wallpapers[0].thumb;
  },
};

export const wallpaperById = (id: string): WallpaperDef => (id === 'custom' ? customDef : wallpapers.find((w) => w.id === id) ?? wallpapers[0]);

/* ───────────────────────────── Music ───────────────────────────── */

export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  src: string;
  /** artwork gradient */
  art: [string, string];
  /** v10.3 — language style (instrumentals are labelled by the style they are written in) */
  lang?: MusicLang;
  genre?: string;
  moods?: MusicMood[];
  /** true for songs the visitor added from their own device (stored in this browser only) */
  user?: boolean;
}

export type MusicMood = 'Focus' | 'Chill' | 'Coding' | 'Upbeat' | 'Relaxing' | 'Night' | 'Travel';
export type MusicLang = 'inst' | 'en' | 'si' | 'ta' | 'ar' | 'hi';
export const MUSIC_LANGS: { id: MusicLang; label: string; native: string; art: [string, string]; search: string }[] = [
  { id: 'en', label: 'English', native: 'English', art: ['#ff5f6d', '#ffc371'], search: 'english pop hits' },
  { id: 'si', label: 'Sinhala', native: 'සිංහල', art: ['#f7971e', '#8e0e00'], search: 'sinhala songs' },
  { id: 'ta', label: 'Tamil', native: 'தமிழ்', art: ['#e52d27', '#b31217'], search: 'tamil songs' },
  { id: 'ar', label: 'Arabic', native: 'العربية', art: ['#c79081', '#3a1c71'], search: 'arabic songs' },
  { id: 'hi', label: 'Hindi', native: 'हिन्दी', art: ['#ff9966', '#5f2c82'], search: 'hindi songs' },
  { id: 'inst', label: 'Instrumental', native: 'Lo-Fi & Ambient', art: ['#4facfe', '#1e3c72'], search: 'lofi instrumental' },
];

/**
 * Original, royalty-free ambient loops generated specifically for this
 * portfolio (no commercial music is bundled). Replace or add your own
 * licensed MP3s in /public/assets/music and list them here.
 */
export const tracks: Track[] = [
  { id: 't1', title: 'Kandy Morning', artist: 'Portfolio Ambient', album: 'Desktop Sessions', src: './assets/music/kandy-morning.mp3', art: ['#ff9f6b', '#c2185b'], lang: 'inst', genre: 'Ambient', moods: ['Relaxing', 'Travel'] },
  { id: 't2', title: 'Lake Drive', artist: 'Portfolio Ambient', album: 'Desktop Sessions', src: './assets/music/lake-drive.mp3', art: ['#4fc3f7', '#283593'], lang: 'inst', genre: 'Ambient', moods: ['Chill', 'Travel'] },
  { id: 't3', title: 'Midnight Build', artist: 'Portfolio Ambient', album: 'Desktop Sessions', src: './assets/music/midnight-build.mp3', art: ['#7c4dff', '#1a1036'], lang: 'inst', genre: 'Ambient', moods: ['Coding', 'Night', 'Focus'] },
  { id: 't4', title: 'Temple Bells', artist: 'Portfolio Ambient', album: 'Hill Country', src: './assets/music/temple-bells.mp3', art: ['#ffd36e', '#b8621b'], lang: 'inst', genre: 'Ambient', moods: ['Relaxing'] },
  { id: 't5', title: 'Tea Country', artist: 'Portfolio Ambient', album: 'Hill Country', src: './assets/music/tea-country.mp3', art: ['#7ee081', '#1d6b43'], lang: 'inst', genre: 'Ambient', moods: ['Relaxing', 'Travel'] },
  { id: 't6', title: 'City Lights', artist: 'Portfolio Ambient', album: 'Night Shift', src: './assets/music/city-lights.mp3', art: ['#ff6ec7', '#3a0ca3'], lang: 'inst', genre: 'Ambient', moods: ['Night', 'Chill'] },
  { id: 't7', title: 'Rainy Commit', artist: 'Portfolio Ambient', album: 'Night Shift', src: './assets/music/rainy-commit.mp3', art: ['#90a4ae', '#263238'], lang: 'inst', genre: 'Ambient', moods: ['Coding', 'Focus'] },
  { id: 't8', title: 'Deploy Day', artist: 'Portfolio Ambient', album: 'Desktop Sessions', src: './assets/music/deploy-day.mp3', art: ['#40c9ff', '#e81cff'], lang: 'inst', genre: 'Ambient', moods: ['Upbeat', 'Coding'] },
  { id: 't9', title: 'Sunrise Sprint', artist: 'Portfolio Ambient', album: 'Hill Country', src: './assets/music/sunrise-sprint.mp3', art: ['#ffb199', '#ff0844'], lang: 'inst', genre: 'Ambient', moods: ['Upbeat'] },
  { id: 't10', title: 'Lagoon Drift', artist: 'Portfolio Ambient', album: 'Night Shift', src: './assets/music/lagoon-drift.mp3', art: ['#43e97b', '#1f6f8b'], lang: 'inst', genre: 'Ambient', moods: ['Chill', 'Relaxing'] },
  /* v8 — original lo-fi tracks, synthesised for this portfolio (royalty-free, no samples) */
  { id: 't11', title: 'Ceylon Rain', artist: 'Portfolio Lo-Fi', album: 'Lo-Fi Kandy', src: './assets/music/ceylon-rain.mp3', art: ['#6a85b6', '#1e2a4a'], lang: 'inst', genre: 'Lo-Fi', moods: ['Chill', 'Focus'] },
  { id: 't12', title: 'Lotus Pond', artist: 'Portfolio Lo-Fi', album: 'Lo-Fi Kandy', src: './assets/music/lotus-pond.mp3', art: ['#f9a8d4', '#7e22ce'], lang: 'inst', genre: 'Lo-Fi', moods: ['Relaxing'] },
  { id: 't13', title: 'Night Compile', artist: 'Portfolio Lo-Fi', album: 'Code & Chill', src: './assets/music/night-compile.mp3', art: ['#22d3ee', '#0f172a'], lang: 'inst', genre: 'Lo-Fi', moods: ['Coding', 'Night'] },
  { id: 't14', title: 'Peradeniya Walk', artist: 'Portfolio Lo-Fi', album: 'Lo-Fi Kandy', src: './assets/music/peradeniya-walk.mp3', art: ['#86efac', '#166534'], lang: 'inst', genre: 'Lo-Fi', moods: ['Upbeat', 'Travel'] },
  { id: 't15', title: 'Monsoon Code', artist: 'Portfolio Lo-Fi', album: 'Code & Chill', src: './assets/music/monsoon-code.mp3', art: ['#94a3b8', '#1e293b'], lang: 'inst', genre: 'Lo-Fi', moods: ['Coding', 'Focus'] },
  { id: 't16', title: 'Galle Sunset', artist: 'Portfolio Lo-Fi', album: 'Lo-Fi Kandy', src: './assets/music/galle-sunset.mp3', art: ['#fdba74', '#be123c'], lang: 'inst', genre: 'Lo-Fi', moods: ['Chill', 'Travel'] },
  { id: 't17', title: 'Focus Mode', artist: 'Portfolio Lo-Fi', album: 'Code & Chill', src: './assets/music/focus-mode.mp3', art: ['#a5b4fc', '#312e81'], lang: 'inst', genre: 'Lo-Fi', moods: ['Focus'] },
  { id: 't18', title: 'Ella Train', artist: 'Portfolio Lo-Fi', album: 'Code & Chill', src: './assets/music/ella-train.mp3', art: ['#fde68a', '#0f766e'], lang: 'inst', genre: 'Lo-Fi', moods: ['Travel', 'Upbeat'] },
  /* v9 — more original lo-fi (synthesised, royalty-free) */
  { id: 't19', title: 'Sigiriya Dawn', artist: 'Portfolio Lo-Fi', album: 'Lo-Fi Kandy', src: './assets/music/sigiriya-dawn.mp3', art: ['#ffd194', '#d1913c'], lang: 'inst', genre: 'Lo-Fi', moods: ['Relaxing'] },
  { id: 't20', title: 'Hill Train', artist: 'Portfolio Lo-Fi', album: 'Lo-Fi Kandy', src: './assets/music/hill-train-lofi.mp3', art: ['#a8e063', '#2f6b2f'], lang: 'inst', genre: 'Lo-Fi', moods: ['Travel'] },
  { id: 't21', title: 'Tea Break', artist: 'Portfolio Lo-Fi', album: 'Study Beats', src: './assets/music/tea-break.mp3', art: ['#f6d365', '#fda085'], lang: 'inst', genre: 'Lo-Fi', moods: ['Chill'] },
  { id: 't22', title: 'Late Night Review', artist: 'Portfolio Lo-Fi', album: 'Study Beats', src: './assets/music/late-night-review.mp3', art: ['#434343', '#6a3093'], lang: 'inst', genre: 'Lo-Fi', moods: ['Night', 'Focus'] },
  /* v10.3 — original instrumentals in five language styles (synthesised for this portfolio, royalty-free, no samples) */
  { id: 'w1', title: 'Sunlit Avenue', artist: 'Portfolio Originals', album: 'English Pop Instrumentals', src: './assets/music/en-sunlit-avenue.mp3', art: ['#ff5f6d', '#ffc371'], lang: 'en', genre: 'Acoustic Pop', moods: ['Upbeat', 'Travel'] },
  { id: 'w2', title: 'Neon Skyline', artist: 'Portfolio Originals', album: 'English Pop Instrumentals', src: './assets/music/en-neon-skyline.mp3', art: ['#00c6ff', '#7f00ff'], lang: 'en', genre: 'Synth-Pop', moods: ['Upbeat', 'Night'] },
  { id: 'w3', title: 'Baila Breeze', artist: 'Portfolio Originals', album: 'Sinhala Style', src: './assets/music/si-baila-breeze.mp3', art: ['#f7971e', '#8e0e00'], lang: 'si', genre: 'Baila', moods: ['Upbeat'] },
  { id: 'w4', title: 'Raban Village', artist: 'Portfolio Originals', album: 'Sinhala Style', src: './assets/music/si-raban-village.mp3', art: ['#d4a373', '#344e41'], lang: 'si', genre: 'Folk', moods: ['Relaxing', 'Travel'] },
  { id: 'w5', title: 'Kuthu Street', artist: 'Portfolio Originals', album: 'Tamil Style', src: './assets/music/ta-kuthu-street.mp3', art: ['#e52d27', '#b31217'], lang: 'ta', genre: 'Kuthu', moods: ['Upbeat'] },
  { id: 'w6', title: 'Veena Dawn', artist: 'Portfolio Originals', album: 'Tamil Style', src: './assets/music/ta-veena-dawn.mp3', art: ['#f9d423', '#e65c00'], lang: 'ta', genre: 'Carnatic', moods: ['Focus', 'Relaxing'] },
  { id: 'w7', title: 'Desert Maqam', artist: 'Portfolio Originals', album: 'Arabic Style', src: './assets/music/ar-desert-maqam.mp3', art: ['#c79081', '#3a1c71'], lang: 'ar', genre: 'Maqam', moods: ['Night', 'Relaxing'] },
  { id: 'w8', title: 'Oasis Nights', artist: 'Portfolio Originals', album: 'Arabic Style', src: './assets/music/ar-oasis-nights.mp3', art: ['#e0c3fc', '#2c3e50'], lang: 'ar', genre: 'Maqam', moods: ['Night', 'Chill'] },
  { id: 'w9', title: 'Raga Evening', artist: 'Portfolio Originals', album: 'Hindi Style', src: './assets/music/hi-raga-evening.mp3', art: ['#ff9966', '#5f2c82'], lang: 'hi', genre: 'Classical', moods: ['Focus', 'Relaxing'] },
  { id: 'w10', title: 'Monsoon Lo-Fi', artist: 'Portfolio Originals', album: 'Hindi Style', src: './assets/music/hi-monsoon-lofi.mp3', art: ['#56ab2f', '#1d4350'], lang: 'hi', genre: 'Lo-Fi', moods: ['Chill', 'Focus'] },
];
