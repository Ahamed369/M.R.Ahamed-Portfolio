import { useEffect, useRef, useState } from 'react';
import { AppIcon } from '../../components/AppIcons';
import { cv, personal, projects } from '../../data/portfolio';
import { photos } from '../../data/media';
import { requireSignIn, setAccount, useAccount } from '../../system/account';
import { usePersisted, uid } from '../../system/useStore';
import { notify, openExternal } from '../../system/notify';
import { useWM } from '../../system/WindowManager';
import { installPwa, usePwaInstall } from '../../system/pwa';

/**
 * v8 — in-portfolio libraries for Google Drive, Google Photos and Google Play.
 * Browsing is open to everyone; downloading, uploading, saving and installing
 * first asks the visitor to sign in (Portfolio ID or Google).
 */

function AccountBar({ service }: { service: string }) {
  const a = useAccount();
  return (
    <div className="wl8-acct">
      {a ? (
        <>
          <span className="wl8-av">{a.picture ? <img src={a.picture} alt="" referrerPolicy="no-referrer" /> : a.name.slice(0, 1).toUpperCase()}</span>
          <span>
            Signed in as <b>{a.name}</b> {a.kind === 'google' ? '(Google)' : '(Portfolio ID demo)'}
          </span>
          <button type="button" onClick={() => setAccount(null)}>
            Sign out
          </button>
        </>
      ) : (
        <>
          <span>Browse freely — sign in to download, upload or install.</span>
          <button type="button" className="primary" onClick={() => void requireSignIn(`Sign in to use ${service}.`)}>
            Sign in
          </button>
        </>
      )}
    </div>
  );
}

const gate = (why: string, fn: () => void) => () => void requireSignIn(why).then((ok) => ok && fn());

function download(href: string, name: string) {
  const a = document.createElement('a');
  a.href = href;
  a.download = name;
  a.click();
}

/* ───────────── Drive ───────────── */
interface DFile {
  id: string;
  name: string;
  kind: 'pdf' | 'folder' | 'image' | 'zip' | 'file';
  size?: string;
  href?: string;
  mine?: boolean;
  starred?: boolean;
}
function Drive() {
  const [mine, setMine] = usePersisted<DFile[]>('mra-drive-v8', []);
  const [stars, setStars] = usePersisted<string[]>('mra-drive-stars', []);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [name, setName] = useState('');
  const urls = useRef(new Map<string, string>());
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => () => urls.current.forEach((u) => URL.revokeObjectURL(u)), []);
  const base: DFile[] = [
    { id: 'cv', name: cv.fileName, kind: 'pdf', size: 'PDF', href: cv.url },
    ...projects.filter((p) => p.repo).map<DFile>((p) => ({ id: `z-${p.id}`, name: `${p.name}.zip`, kind: 'zip', size: 'Source · GitHub', href: `${p.repo}/archive/HEAD.zip` })),
    { id: 'shots', name: 'Portfolio screenshots', kind: 'folder' },
  ];
  const files = [...base, ...mine].map((f) => ({ ...f, starred: stars.includes(f.id), href: f.href ?? urls.current.get(f.id) }));
  const upload = (list: FileList | null) => {
    if (!list) return;
    const added: DFile[] = [];
    Array.from(list).forEach((f) => {
      if (f.size > 8 * 1024 * 1024) {
        notify({ app: 'Google Drive', icon: 'drive', title: 'File too large', body: `${f.name} is over 8 MB.` });
        return;
      }
      const id = uid('f');
      urls.current.set(id, URL.createObjectURL(f));
      added.push({ id, name: f.name, kind: f.type.startsWith('image/') ? 'image' : f.type === 'application/pdf' ? 'pdf' : 'file', size: `${Math.max(1, Math.round(f.size / 1024))} KB`, mine: true });
    });
    if (added.length) {
      setMine((l) => [...l, ...added]);
      notify({ app: 'Google Drive', icon: 'drive', title: `Uploaded ${added.length} file${added.length === 1 ? '' : 's'}`, body: 'Kept in this browser session only — nothing leaves your device.' });
    }
  };
  const wm = useWM();
  return (
    <div className="wl8">
      <AccountBar service="Google Drive" />
      <div className="wl8-tools">
        <button type="button" onClick={gate('Sign in to upload files to Drive.', () => fileRef.current?.click())}>
          ⬆︎ Upload
        </button>
        <button type="button" onClick={gate('Sign in to create folders.', () => setMine((l) => [...l, { id: uid('d'), name: 'New Folder', kind: 'folder', mine: true }]))}>
          ＋ New folder
        </button>
        <input ref={fileRef} type="file" multiple hidden onChange={(e) => (upload(e.target.files), (e.target.value = ''))} />
      </div>
      <div className="wl8-files">
        {files.map((f) => (
          <div key={f.id} className="wl8-file">
            <span className="wl8-fico">{f.kind === 'folder' ? '📁' : f.kind === 'pdf' ? '📄' : f.kind === 'zip' ? '🗜' : f.kind === 'image' ? '🖼' : '📎'}</span>
            {renaming === f.id ? (
              <input
                className="wl8-rename"
                value={name}
                autoFocus
                onChange={(e) => setName(e.target.value)}
                onBlur={() => {
                  if (name.trim()) setMine((l) => l.map((x) => (x.id === f.id ? { ...x, name: name.trim() } : x)));
                  setRenaming(null);
                }}
                onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
              />
            ) : (
              <span className="wl8-fname">
                <b>{f.name}</b>
                <small>{f.size ?? (f.kind === 'folder' ? 'Folder' : '')}</small>
              </span>
            )}
            <span className="wl8-factions">
              <button type="button" title={f.starred ? 'Unstar' : 'Star'} onClick={() => setStars((s) => (s.includes(f.id) ? s.filter((x) => x !== f.id) : [...s, f.id]))}>
                {f.starred ? '★' : '☆'}
              </button>
              {f.kind === 'folder' && f.id === 'shots' && (
                <button type="button" onClick={() => wm.open('photos', { album: 'Screenshots' })}>
                  Open
                </button>
              )}
              {f.href && (
                <button type="button" onClick={gate(`Sign in to download ${f.name}.`, () => (f.kind === 'zip' ? openExternal(f.href!) : download(f.href!, f.name)))}>
                  ⬇︎ Download
                </button>
              )}
              {f.mine && (
                <>
                  <button type="button" onClick={() => (setRenaming(f.id), setName(f.name))}>
                    Rename
                  </button>
                  <button type="button" className="danger" onClick={() => setMine((l) => l.filter((x) => x.id !== f.id))}>
                    Delete
                  </button>
                </>
              )}
            </span>
          </div>
        ))}
      </div>
      <p className="wl8-note">Portfolio files from {personal.name}. Uploads stay in this browser tab only.</p>
    </div>
  );
}

/* ───────────── Photos ───────────── */
function GPhotos() {
  const [fav, setFav] = usePersisted<string[]>('mra-gphotos-fav', []);
  const [album, setAlbum] = useState<'all' | 'fav'>('all');
  const list = photos.filter((p) => album === 'all' || fav.includes(p.id)).slice(0, 40);
  return (
    <div className="wl8">
      <AccountBar service="Google Photos" />
      <div className="wl8-tools">
        <button type="button" className={album === 'all' ? 'on' : ''} onClick={() => setAlbum('all')}>
          Photos
        </button>
        <button type="button" className={album === 'fav' ? 'on' : ''} onClick={() => setAlbum('fav')}>
          ★ Favourites ({fav.length})
        </button>
      </div>
      <div className="wl8-grid">
        {list.map((p) => (
          <figure key={p.id} className="wl8-ph">
            <img src={p.src} alt={p.title} loading="lazy" />
            <figcaption>
              <span>{p.title}</span>
              <span>
                <button type="button" title="Favourite" onClick={gate('Sign in to save favourites.', () => setFav((f) => (f.includes(p.id) ? f.filter((x) => x !== p.id) : [...f, p.id])))}>
                  {fav.includes(p.id) ? '★' : '☆'}
                </button>
                <button type="button" title="Download" onClick={gate('Sign in to download photos.', () => download(p.src, `${p.id}.jpg`))}>
                  ⬇︎
                </button>
              </span>
            </figcaption>
          </figure>
        ))}
        {list.length === 0 && <p className="wl8-note">No favourites yet.</p>}
      </div>
    </div>
  );
}

/* ───────────── Play ───────────── */
function Play() {
  const wm = useWM();
  const pwa = usePwaInstall();
  const [lib, setLib] = usePersisted<string[]>('mra-play-library', []);
  const android = projects.filter((p) => p.stack.mobile?.length);
  const add = (id: string, name: string) =>
    gate(`Sign in to install ${name}.`, () => {
      setLib((l) => (l.includes(id) ? l : [...l, id]));
      notify({ app: 'Google Play', icon: 'playstore', title: `${name} added to your library` });
    })();
  return (
    <div className="wl8">
      <AccountBar service="Google Play" />
      <h3 className="wl8-h">Install this portfolio</h3>
      <div className="wl8-app">
        <span className="wl8-aico">
          <AppIcon name="xcode" />
        </span>
        <span className="wl8-atext">
          <b>{personal.name} — Portfolio</b>
          <small>Progressive Web App · works offline · no store needed</small>
        </span>
        <button
          type="button"
          className="primary"
          onClick={gate('Sign in to install the portfolio app.', async () => {
            const r = await installPwa();
            notify({ app: 'Google Play', icon: 'playstore', title: r === 'accepted' ? 'Portfolio installed 🎉' : r === 'unavailable' ? 'Install from your browser menu' : 'Install cancelled', body: r === 'unavailable' ? 'Use “Install app” / “Add to Home Screen” in your browser’s menu.' : undefined });
          })}
        >
          {pwa.installed ? 'Installed' : 'Install'}
        </button>
      </div>
      <h3 className="wl8-h">Android apps by {personal.name}</h3>
      {android.map((p) => (
        <div key={p.id} className="wl8-app">
          <span className="wl8-aico" style={{ background: `linear-gradient(145deg, ${p.preview.accent}, ${p.preview.accent2})` }}>
            📱
          </span>
          <span className="wl8-atext">
            <b>{p.name}</b>
            <small>{p.category} · open source</small>
          </span>
          {lib.includes(p.id) ? (
            <>
              <button type="button" onClick={() => wm.open('casestudies', { project: p.id })}>
                Open
              </button>
              <button type="button" onClick={() => p.repo && openExternal(p.repo)}>
                Source ↗
              </button>
            </>
          ) : (
            <button type="button" className="primary" onClick={() => add(p.id, p.name)}>
              Install
            </button>
          )}
        </div>
      ))}
      <p className="wl8-note">These apps aren’t published on the real Google Play store — “Install” adds them to your library here, with the source code on GitHub (build it in Android Studio).</p>
    </div>
  );
}

export function WebLibrary({ id }: { id: string }) {
  if (id === 'drive') return <Drive />;
  if (id === 'gphotos') return <GPhotos />;
  if (id === 'playstore') return <Play />;
  return null;
}
export const HAS_LIBRARY = new Set(['drive', 'gphotos', 'playstore']);
