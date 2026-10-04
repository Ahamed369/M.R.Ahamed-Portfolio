import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { DEVICE_DEFAULT_WALL, WALL_CATS, wallCats, wallFor, wallpaperById, type WallCat, type WallDevice } from '../data/media';
import { useSettings } from '../system/SettingsContext';
import { deviceWall, lockWallFor, setDeviceWall } from '../system/wallpaperCycle';
import { WallImage } from './Wallpaper';
import { personal } from '../data/portfolio';

type Lng = 'en' | 'si' | 'ta';
const TX = {
  kPhoto: { en: 'Photo', si: 'ඡායාරූපය', ta: 'புகைப்படம்' },
  kArt: { en: 'Drawn for this screen', si: 'මෙම තිරය සඳහා ඇඳි', ta: 'இந்தத் திரைக்காக வரையப்பட்டது' },
  kDynamic: { en: 'Dynamic', si: 'ගතික', ta: 'மாறும்' },
  kLive: { en: 'Live', si: 'සජීවී', ta: 'நேரடி' },
  desktop: { en: 'Desktop', si: 'Desktop', ta: 'Desktop' },
  homeScreen: { en: 'Home Screen', si: 'මුල් තිරය', ta: 'முகப்புத் திரை' },
  lockScreen: { en: 'Lock Screen', si: 'අගුළු තිරය', ta: 'பூட்டுத் திரை' },
  sameAs: { en: 'Same as {name}', si: '{name} හා සමානයි', ta: '{name} போன்றதே' },
  motion: { en: 'Motion', si: 'චලනය', ta: 'அசைவு' },
  pausedRM: { en: 'Paused by Reduce Motion', si: 'Reduce Motion මඟින් නවතා ඇත', ta: 'Reduce Motion-ஆல் இடைநிறுத்தப்பட்டது' },
  pausedLP: { en: 'Paused by Low Power Mode', si: 'Low Power Mode මඟින් නවතා ඇත', ta: 'Low Power Mode-ஆல் இடைநிறுத்தப்பட்டது' },
  liveMove: { en: 'Live wallpapers move gently', si: 'සජීවී බිතුපත් මෘදුව චලනය වේ', ta: 'நேரடி வால்பேப்பர்கள் மெதுவாக அசையும்' },
  blurHome: { en: 'Blur Home Screen', si: 'මුල් තිරය බොඳ කරන්න', ta: 'முகப்புத் திரையை மங்கலாக்கு' },
  blurNote: { en: 'Softens a busy wallpaper behind icons', si: 'අයිකන පිටුපස ඇති කාර්යබහුල බිතුපතක් මෘදු කරයි', ta: 'ஐகான்களுக்குப் பின்னால் உள்ள நெரிசலான வால்பேப்பரை மென்மையாக்கும்' },
  blurAria: { en: 'Blur Home Screen wallpaper', si: 'මුල් තිරයේ බිතුපත බොඳ කරන්න', ta: 'முகப்புத் திரை வால்பேப்பரை மங்கலாக்கு' },
  tint: { en: 'Tint wallpaper in Dark Mode', si: 'Dark Mode හි බිතුපත අඳුරු කරන්න', ta: 'Dark Mode-இல் வால்பேப்பருக்கு நிழல் சேர்' },
  tintNote: { en: 'A darker desktop at night', si: 'රාත්‍රියේ වඩා අඳුරු desktop එකක්', ta: 'இரவில் இருண்ட desktop' },
  restore: { en: 'Restore Default Wallpaper', si: 'පෙරනිමි බිතුපත ප්‍රතිසාධනය කරන්න', ta: 'இயல்புநிலை வால்பேப்பரை மீட்டமை' },
  search: { en: 'Search wallpapers', si: 'බිතුපත් සොයන්න', ta: 'வால்பேப்பர்களைத் தேடு' },
  cats: { en: 'Wallpaper categories', si: 'බිතුපත් වර්ග', ta: 'வால்பேப்பர் வகைகள்' },
  all: { en: 'All', si: 'සියල්ල', ta: 'அனைத்தும்' },
  liveBadge: { en: 'LIVE', si: 'සජීවී', ta: 'நேரடி' },
  dynBadge: { en: 'DYNAMIC', si: 'ගතික', ta: 'மாறும்' },
  itemAria: { en: '{name} — preview', si: '{name} — පෙරදසුන', ta: '{name} — முன்னோட்டம்' },
  noMatch: { en: 'No wallpapers match.', si: 'ගැළපෙන බිතුපත් නැත.', ta: 'பொருந்தும் வால்பேப்பர்கள் இல்லை.' },
  fPhone: { en: 'a tall phone screen', si: 'උස දුරකථන තිරයක්', ta: 'உயரமான தொலைபேசித் திரை' },
  fIpad: { en: 'an iPad in portrait and landscape', si: 'සිරස් හා තිරස් ලෙස iPad එකක්', ta: 'நெடுவாக்கிலும் கிடைவாக்கிலும் iPad' },
  fDesk: { en: 'a wide desktop', si: 'පුළුල් desktop එකක්', ta: 'அகலமான desktop' },
  note: {
    en: 'Original wallpapers made for this portfolio — photos, and designs drawn in code that are composed for {target} — plus some supplied by {name}. Choices are saved on this device.',
    si: 'මෙම portfolio එක සඳහා සාදන ලද මුල් බිතුපත් — ඡායාරූප සහ {target} සඳහා සකස් කළ, code මඟින් ඇඳි නිර්මාණ — සමඟ {name} විසින් සපයන ලද සමහරක්. ඔබේ තේරීම් මෙම උපාංගයේ සුරැකේ.',
    ta: 'இந்த portfolio-க்காக உருவாக்கப்பட்ட அசல் வால்பேப்பர்கள் — புகைப்படங்கள், மற்றும் {target}-க்காக code-இல் வரையப்பட்ட வடிவமைப்புகள் — மேலும் {name} வழங்கிய சில. தேர்வுகள் இந்தச் சாதனத்தில் சேமிக்கப்படும்.',
  },
  previewAria: { en: 'Preview {name}', si: '{name} පෙරදසුන', ta: '{name} முன்னோட்டம்' },
  light: { en: 'Light', si: 'ආලෝක', ta: 'வெளிர்' },
  dark: { en: 'Dark', si: 'අඳුරු', ta: 'இருள்' },
  portrait: { en: 'Portrait', si: 'සිරස්', ta: 'நெடுவாக்கு' },
  landscape: { en: 'Landscape', si: 'තිරස්', ta: 'கிடைவாக்கு' },
  setDeskLock: { en: 'Set Desktop & Lock Screen', si: 'Desktop සහ අගුළු තිරය ලෙස සකසන්න', ta: 'Desktop & பூட்டுத் திரையாக அமை' },
  deskOnly: { en: 'Desktop Only', si: 'Desktop පමණක්', ta: 'Desktop மட்டும்' },
  lockOnly: { en: 'Lock Screen Only', si: 'අගුළු තිරය පමණක්', ta: 'பூட்டுத் திரை மட்டும்' },
  setPair: { en: 'Set as Wallpaper Pair', si: 'බිතුපත් යුගලය ලෙස සකසන්න', ta: 'வால்பேப்பர் ஜோடியாக அமை' },
  homeOnly: { en: 'Home Screen Only', si: 'මුල් තිරය පමණක්', ta: 'முகப்புத் திரை மட்டும்' },
  cancel: { en: 'Cancel', si: 'අවලංගු කරන්න', ta: 'ரத்துசெய்' },
} satisfies Record<string, Record<Lng, string>>;
type TxKey = keyof typeof TX;
const useTx = () => {
  const { settings } = useSettings();
  const lng: Lng = settings.language === 'si' || settings.language === 'ta' ? settings.language : 'en';
  return (k: TxKey, vars: Record<string, string> = {}) => TX[k][lng].replace(/\{(\w+)\}/g, (_, v: string) => vars[v] ?? '');
};
const KIND_LABEL = { photo: 'kPhoto', art: 'kArt', dynamic: 'kDynamic', live: 'kLive' } as const;

/**
 * v10.2 — the wallpaper library shared by Mac System Settings and iPhone / iPad
 * Settings: a separate curated set per device, categories, search, a preview
 * (Home Screen / Desktop and Lock Screen, light and dark) and Apply to Home,
 * Lock or both. Live wallpapers pause with Reduce Motion, Low Power Mode or the
 * Motion switch; Dynamic ones follow the time of day or Light / Dark.
 */
export function WallpaperLibrary({ device }: { device: WallDevice }) {
  const { settings, update, motionReduced } = useSettings();
  const tx = useTx();
  const [cat, setCat] = useState<WallCat | 'All'>('Featured');
  const [q, setQ] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const home = deviceWall(settings, device);
  const lock = lockWallFor(settings, device);
  const list = useMemo(
    () =>
      wallFor(device).filter((w) => (cat === 'All' || wallCats(w).includes(cat)) && (!q.trim() || `${w.name} ${wallCats(w).join(' ')} ${w.kind}`.toLowerCase().includes(q.trim().toLowerCase()))),
    [device, cat, q],
  );
  const cats = WALL_CATS.filter((c) => wallFor(device).filter((w) => wallCats(w).includes(c)).length >= 2);
  const homeName = device === 'mac' ? tx('desktop') : tx('homeScreen');
  return (
    <div className={`wl2 wl2-${device}`}>
      <div className="wl2-current">
        <figure>
          <span className={`wl2-frame f-${device}`}>
            <WallImage id={home} live />
          </span>
          <figcaption>
            {homeName}
            <small>{wallpaperById(home).name}</small>
          </figcaption>
        </figure>
        <figure>
          <span className={`wl2-frame f-${device} lock`}>
            <WallImage id={lock} />
            <b className="wl2-clock">{new Date().toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }).replace(/\s?[AP]M$/i, '')}</b>
          </span>
          <figcaption>
            {tx('lockScreen')}
            <small>{lock === home ? tx('sameAs', { name: homeName }) : wallpaperById(lock).name}</small>
          </figcaption>
        </figure>
      </div>
      <div className="wl2-opts">
        <label className="wl2-opt">
          <span>
            {tx('motion')}
            <small>{motionReduced ? tx('pausedRM') : settings.lowPowerMode === 'always' ? tx('pausedLP') : tx('liveMove')}</small>
          </span>
          <input type="checkbox" className="wl2-switch" checked={settings.wallMotion !== false} onChange={(e) => update({ wallMotion: e.target.checked })} />
        </label>
        {device !== 'mac' && (
          <label className="wl2-opt">
            <span>
              {tx('blurHome')}
              <small>{tx('blurNote')}</small>
            </span>
            <input type="range" min={0} max={20} step={1} value={settings.wallBlur ?? 0} onChange={(e) => update({ wallBlur: Number(e.target.value) })} aria-label={tx('blurAria')} />
          </label>
        )}
        {device === 'mac' && (
          <label className="wl2-opt">
            <span>
              {tx('tint')}
              <small>{tx('tintNote')}</small>
            </span>
            <input type="checkbox" className="wl2-switch" checked={!!settings.darkWallpaperTint} onChange={(e) => update({ darkWallpaperTint: e.target.checked })} />
          </label>
        )}
        <button type="button" className="wl2-link" disabled={home === DEVICE_DEFAULT_WALL[device] && lock === home} onClick={() => (setDeviceWall(DEVICE_DEFAULT_WALL[device], device, 'both'))}>
          {tx('restore')}
        </button>
      </div>
      <div className="wl2-bar">
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={tx('search')} aria-label={tx('search')} data-nodictation />
      </div>
      <div className="wl2-cats" role="tablist" aria-label={tx('cats')}>
        {(['All', ...cats] as const).map((c) => (
          <button key={c} type="button" role="tab" aria-selected={cat === c} className={cat === c ? 'on' : ''} onClick={() => setCat(c)}>
            {c === 'All' ? tx('all') : c}
          </button>
        ))}
      </div>
      <div className={`wl2-grid g-${device}`}>
        {list.map((w) => (
          <button key={w.id} type="button" className={`wl2-item ${home === w.id ? 'on' : ''}`} onClick={() => setPreview(w.id)} aria-label={tx('itemAria', { name: w.name })}>
            <span className={`wl2-thumb f-${device}`}>
              <WallImage id={w.id} thumb />
              {w.kind && w.kind !== 'photo' && w.kind !== 'art' && <i className={`wl2-badge ${w.kind}`}>{w.kind === 'live' ? tx('liveBadge') : tx('dynBadge')}</i>}
            </span>
            <span className="wl2-name">{w.name}</span>
          </button>
        ))}
        {!list.length && <p className="wl2-empty">{tx('noMatch')}</p>}
      </div>
      <p className="wl2-note">
        {tx('note', { target: device === 'iphone' ? tx('fPhone') : device === 'ipad' ? tx('fIpad') : tx('fDesk'), name: personal.name })}
      </p>
      {preview && createPortal(<Preview id={preview} device={device} onClose={() => setPreview(null)} />, document.body)}
    </div>
  );
}

function Preview({ id, device, onClose }: { id: string; device: WallDevice; onClose: () => void }) {
  const tx = useTx();
  const def = wallpaperById(id);
  const [mode, setMode] = useState<'home' | 'lock'>('home');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'));
  const [orient, setOrient] = useState<'portrait' | 'landscape'>(device === 'ipad' ? 'landscape' : device === 'mac' ? 'landscape' : 'portrait');
  const apply = (target: 'home' | 'lock' | 'both') => {
    setDeviceWall(id, device, target);
    onClose();
  };
  return (
    <div className="wl2-pv-back" onClick={onClose}>
      <div className="wl2-pv" role="dialog" aria-label={tx('previewAria', { name: def.name })} onClick={(e) => e.stopPropagation()}>
        <header>
          <b>{def.name}</b>
          <small>
            {tx(KIND_LABEL[def.kind ?? 'photo'])} · {wallCats(def).join(' · ')}
          </small>
        </header>
        <div className="wl2-pv-seg">
          <span className="wl2-seg">
            <button type="button" className={mode === 'home' ? 'on' : ''} onClick={() => setMode('home')}>
              {device === 'mac' ? tx('desktop') : tx('homeScreen')}
            </button>
            <button type="button" className={mode === 'lock' ? 'on' : ''} onClick={() => setMode('lock')}>
              {tx('lockScreen')}
            </button>
          </span>
          <span className="wl2-seg">
            <button type="button" className={theme === 'light' ? 'on' : ''} onClick={() => setTheme('light')}>
              {tx('light')}
            </button>
            <button type="button" className={theme === 'dark' ? 'on' : ''} onClick={() => setTheme('dark')}>
              {tx('dark')}
            </button>
          </span>
          {device === 'ipad' && (
            <span className="wl2-seg">
              <button type="button" className={orient === 'portrait' ? 'on' : ''} onClick={() => setOrient('portrait')}>
                {tx('portrait')}
              </button>
              <button type="button" className={orient === 'landscape' ? 'on' : ''} onClick={() => setOrient('landscape')}>
                {tx('landscape')}
              </button>
            </span>
          )}
        </div>
        <div className={`wl2-pv-dev d-${device} o-${orient} t-${theme} m-${mode}`}>
          <WallImage id={id} live />
          {theme === 'dark' && <i className="wl2-pv-dim" />}
          {mode === 'lock' ? (
            <span className="wl2-pv-lock">
              <small>{new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</small>
              <b>{new Date().toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }).replace(/\s?[AP]M$/i, '')}</b>
            </span>
          ) : device === 'mac' ? (
            <span className="wl2-pv-mac">
              <i className="mb" />
              <i className="dk" />
              <i className="win" />
            </span>
          ) : (
            <span className="wl2-pv-home">
              {Array.from({ length: device === 'ipad' ? 12 : 16 }, (_, i) => (
                <i key={i} />
              ))}
              <em />
            </span>
          )}
        </div>
        <div className="wl2-pv-btns">
          {device === 'mac' ? (
            <>
              <button type="button" className="primary" onClick={() => apply('both')}>
                {tx('setDeskLock')}
              </button>
              <button type="button" onClick={() => apply('home')}>
                {tx('deskOnly')}
              </button>
              <button type="button" onClick={() => apply('lock')}>
                {tx('lockOnly')}
              </button>
            </>
          ) : (
            <>
              <button type="button" className="primary" onClick={() => apply('both')}>
                {tx('setPair')}
              </button>
              <button type="button" onClick={() => apply('home')}>
                {tx('homeOnly')}
              </button>
              <button type="button" onClick={() => apply('lock')}>
                {tx('lockOnly')}
              </button>
            </>
          )}
          <button type="button" className="ghost" onClick={onClose}>
            {tx('cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}
