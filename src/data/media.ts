/**
 * ─────────────────────────────────────────────────────────────
 *  MEDIA REGISTRY — photos, screenshots, wallpapers, music
 * ─────────────────────────────────────────────────────────────
 *  All files live in /public/assets/… (see README → Assets).
 *  To add a photo / wallpaper / track, drop the file into its folder
 *  and add one entry below.
 */

/* ───────────────────────────── Photos ───────────────────────────── */

export type Album = 'Portraits' | 'Screenshots' | 'Wallpapers';

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
  { id: 's11', src: './assets/screenshots/applications.jpg', title: 'Applications pop-up', album: 'Screenshots', ratio: 1.6 },
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
  { id: 'v-apps', title: 'Apps in Action', description: 'Opening Xcode, Notes, Photos and Music.', src: './assets/videos/apps-tour.mp4', poster: './assets/videos/apps-tour.jpg', length: 21 },
  { id: 'v-launchpad', title: 'Launchpad & Mission Control', description: 'Browsing every app and arranging windows.', src: './assets/videos/launchpad.mp4', poster: './assets/videos/launchpad.jpg', length: 21 },
  { id: 'v-dark', title: 'Dark Mode & Wallpapers', description: 'Switching appearance and wallpapers.', src: './assets/videos/dark-mode.mp4', poster: './assets/videos/dark-mode.jpg', length: 13 },
];

/* ───────────────────────────── Wallpapers ───────────────────────────── */

export type WallpaperCategory = 'Colorful' | 'Dark' | 'Light' | 'Landscape' | 'Minimal' | 'Abstract' | 'Custom';

export interface WallpaperDef {
  id: string;
  name: string;
  category: WallpaperCategory;
  /** Brightness of the upper area — decides menu-bar text colour. */
  tone: 'light' | 'dark';
  src: string;
  thumb: string;
}

const wp = (id: string, name: string, category: WallpaperCategory, tone: 'light' | 'dark'): WallpaperDef => ({
  id,
  name,
  category,
  tone,
  src: `./assets/wallpapers/${id}.jpg`,
  thumb: `./assets/wallpapers/thumbs/thumb-${id}.jpg`,
});

/** Wallpapers: original ones created for this portfolio, plus ones supplied by M.R. Ahamed. */
export const wallpapers: WallpaperDef[] = [
  wp('sonoma', 'Sonoma Hills', 'Colorful', 'dark'),
  wp('tahoe', 'Tahoe', 'Colorful', 'dark'),
  wp('sunset', 'Sunset', 'Colorful', 'dark'),
  wp('galaxy', 'Galaxy', 'Dark', 'dark'),
  wp('graphite', 'Graphite', 'Dark', 'dark'),
  wp('aurora', 'Aurora', 'Colorful', 'dark'),
  wp('flame', 'Flame Waves', 'Colorful', 'dark'),
  wp('midnight', 'Midnight', 'Dark', 'dark'),
  wp('cloud', 'Cloud', 'Light', 'light'),
  wp('peaks', 'Peaks at Dusk', 'Landscape', 'dark'),
  wp('lake', 'Morning Lake', 'Landscape', 'light'),
  wp('pro-dark', 'Pro Dark', 'Minimal', 'dark'),
  wp('pro-light', 'Pro Light', 'Minimal', 'light'),
  /* Supplied by M.R. Ahamed */
  wp('navy-waves', 'Midnight Waves', 'Dark', 'dark'),
  wp('champagne-waves', 'Champagne Waves', 'Light', 'light'),
  wp('violet-fan', 'Violet Fan', 'Colorful', 'dark'),
  wp('liquid-glass', 'Liquid Glass', 'Colorful', 'dark'),
  wp('ocean-shore', 'Ocean Shore', 'Landscape', 'dark'),
  wp('big-sur-waves', 'Big Sur Waves', 'Colorful', 'dark'),
  wp('alpine-glow', 'Alpine Glow', 'Landscape', 'dark'),
  wp('violet-pills', 'Violet Pills', 'Colorful', 'dark'),
  wp('black-curves', 'Black Curves', 'Dark', 'dark'),
  /* v8 — supplied by M.R. Ahamed */
  wp('desert-night', 'Desert Night', 'Landscape', 'dark'),
  wp('lone-cypress', 'Lone Cypress', 'Landscape', 'light'),
  wp('sage-waves', 'Sage Waves', 'Minimal', 'light'),
  /* v9 — new original 4K wallpapers created for this portfolio */
  wp('mesh-coral', 'Coral Mesh', 'Abstract', 'light'),
  wp('mesh-ocean', 'Ocean Mesh', 'Abstract', 'dark'),
  wp('glass-orbs', 'Glass Orbs', 'Abstract', 'dark'),
  wp('northern-lights', 'Northern Lights', 'Landscape', 'dark'),
  wp('layered-hills', 'Layered Hills', 'Landscape', 'light'),
  wp('dune-dusk', 'Dune Dusk', 'Landscape', 'dark'),
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
  name: 'Dynamic (time of day)',
  category: 'Colorful',
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
}

/**
 * Original, royalty-free ambient loops generated specifically for this
 * portfolio (no commercial music is bundled). Replace or add your own
 * licensed MP3s in /public/assets/music and list them here.
 */
export const tracks: Track[] = [
  { id: 't1', title: 'Kandy Morning', artist: 'Portfolio Ambient', album: 'Desktop Sessions', src: './assets/music/kandy-morning.mp3', art: ['#ff9f6b', '#c2185b'] },
  { id: 't2', title: 'Lake Drive', artist: 'Portfolio Ambient', album: 'Desktop Sessions', src: './assets/music/lake-drive.mp3', art: ['#4fc3f7', '#283593'] },
  { id: 't3', title: 'Midnight Build', artist: 'Portfolio Ambient', album: 'Desktop Sessions', src: './assets/music/midnight-build.mp3', art: ['#7c4dff', '#1a1036'] },
  { id: 't4', title: 'Temple Bells', artist: 'Portfolio Ambient', album: 'Hill Country', src: './assets/music/temple-bells.mp3', art: ['#ffd36e', '#b8621b'] },
  { id: 't5', title: 'Tea Country', artist: 'Portfolio Ambient', album: 'Hill Country', src: './assets/music/tea-country.mp3', art: ['#7ee081', '#1d6b43'] },
  { id: 't6', title: 'City Lights', artist: 'Portfolio Ambient', album: 'Night Shift', src: './assets/music/city-lights.mp3', art: ['#ff6ec7', '#3a0ca3'] },
  { id: 't7', title: 'Rainy Commit', artist: 'Portfolio Ambient', album: 'Night Shift', src: './assets/music/rainy-commit.mp3', art: ['#90a4ae', '#263238'] },
  { id: 't8', title: 'Deploy Day', artist: 'Portfolio Ambient', album: 'Desktop Sessions', src: './assets/music/deploy-day.mp3', art: ['#40c9ff', '#e81cff'] },
  { id: 't9', title: 'Sunrise Sprint', artist: 'Portfolio Ambient', album: 'Hill Country', src: './assets/music/sunrise-sprint.mp3', art: ['#ffb199', '#ff0844'] },
  { id: 't10', title: 'Lagoon Drift', artist: 'Portfolio Ambient', album: 'Night Shift', src: './assets/music/lagoon-drift.mp3', art: ['#43e97b', '#1f6f8b'] },
  /* v8 — original lo-fi tracks, synthesised for this portfolio (royalty-free, no samples) */
  { id: 't11', title: 'Ceylon Rain', artist: 'Portfolio Lo-Fi', album: 'Lo-Fi Kandy', src: './assets/music/ceylon-rain.mp3', art: ['#6a85b6', '#1e2a4a'] },
  { id: 't12', title: 'Lotus Pond', artist: 'Portfolio Lo-Fi', album: 'Lo-Fi Kandy', src: './assets/music/lotus-pond.mp3', art: ['#f9a8d4', '#7e22ce'] },
  { id: 't13', title: 'Night Compile', artist: 'Portfolio Lo-Fi', album: 'Code & Chill', src: './assets/music/night-compile.mp3', art: ['#22d3ee', '#0f172a'] },
  { id: 't14', title: 'Peradeniya Walk', artist: 'Portfolio Lo-Fi', album: 'Lo-Fi Kandy', src: './assets/music/peradeniya-walk.mp3', art: ['#86efac', '#166534'] },
  { id: 't15', title: 'Monsoon Code', artist: 'Portfolio Lo-Fi', album: 'Code & Chill', src: './assets/music/monsoon-code.mp3', art: ['#94a3b8', '#1e293b'] },
  { id: 't16', title: 'Galle Sunset', artist: 'Portfolio Lo-Fi', album: 'Lo-Fi Kandy', src: './assets/music/galle-sunset.mp3', art: ['#fdba74', '#be123c'] },
  { id: 't17', title: 'Focus Mode', artist: 'Portfolio Lo-Fi', album: 'Code & Chill', src: './assets/music/focus-mode.mp3', art: ['#a5b4fc', '#312e81'] },
  { id: 't18', title: 'Ella Train', artist: 'Portfolio Lo-Fi', album: 'Code & Chill', src: './assets/music/ella-train.mp3', art: ['#fde68a', '#0f766e'] },
  /* v9 — more original lo-fi (synthesised, royalty-free) */
  { id: 't19', title: 'Sigiriya Dawn', artist: 'Portfolio Lo-Fi', album: 'Lo-Fi Kandy', src: './assets/music/sigiriya-dawn.mp3', art: ['#ffd194', '#d1913c'] },
  { id: 't20', title: 'Hill Train', artist: 'Portfolio Lo-Fi', album: 'Lo-Fi Kandy', src: './assets/music/hill-train-lofi.mp3', art: ['#a8e063', '#2f6b2f'] },
  { id: 't21', title: 'Tea Break', artist: 'Portfolio Lo-Fi', album: 'Study Beats', src: './assets/music/tea-break.mp3', art: ['#f6d365', '#fda085'] },
  { id: 't22', title: 'Late Night Review', artist: 'Portfolio Lo-Fi', album: 'Study Beats', src: './assets/music/late-night-review.mp3', art: ['#434343', '#6a3093'] },
];
