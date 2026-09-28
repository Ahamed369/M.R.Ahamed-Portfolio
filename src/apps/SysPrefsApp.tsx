import { useMemo, useState } from 'react';
import { Glyph, type GlyphName } from './SettingsApp';
import { useWM } from '../system/WindowManager';
import { useAccount } from '../system/account';
import { personal } from '../data/portfolio';
import type { AppProps } from '../components/Desktop';

/**
 * v9 — classic "System Preferences" (icon grid, like macOS Monterey).
 * Every icon opens the matching pane in the modern System Settings.
 */
interface Pref {
  label: string;
  glyph: GlyphName;
  color: string;
  pane: string;
  keys?: string;
}

const ROWS: Pref[][] = [
  [
    { label: 'General', glyph: 'gear', color: '#8e8e93', pane: 'general' },
    { label: 'Desktop & Screen Saver', glyph: 'wallpaper', color: '#32ade6', pane: 'wallpaper', keys: 'wallpaper background saver' },
    { label: 'Dock & Menu Bar', glyph: 'dock', color: '#1c1c1e', pane: 'dock', keys: 'dock menu bar' },
    { label: 'Mission Control', glyph: 'grid', color: '#5e5ce6', pane: 'dock', keys: 'hot corners spaces' },
    { label: 'Siri', glyph: 'siri', color: '#bf5af2', pane: 'siri' },
    { label: 'Spotlight', glyph: 'spotlight', color: '#8e8e93', pane: 'spotlight', keys: 'search' },
    { label: 'Language & Region', glyph: 'globe', color: '#0a84ff', pane: 'general/language' },
    { label: 'Notifications & Focus', glyph: 'bell', color: '#ff3b30', pane: 'notifications', keys: 'focus alerts' },
  ],
  [
    { label: 'Internet Accounts', glyph: 'at', color: '#0a84ff', pane: 'internet' },
    { label: 'Passwords', glyph: 'fingerprint', color: '#8e8e93', pane: 'touchid' },
    { label: 'Wallet & Pay', glyph: 'card', color: '#1c1c1e', pane: 'wallet' },
    { label: 'Users & Groups', glyph: 'users', color: '#0a84ff', pane: 'users' },
    { label: 'Accessibility', glyph: 'accessibility', color: '#0a84ff', pane: 'accessibility' },
    { label: 'Screen Time', glyph: 'hourglass', color: '#5e5ce6', pane: 'screentime' },
    { label: 'Appearance', glyph: 'appearance', color: '#1c1c1e', pane: 'appearance', keys: 'dark light accent glass' },
    { label: 'Security & Privacy', glyph: 'hand', color: '#0a84ff', pane: 'privacy' },
  ],
  [
    { label: 'Software Update', glyph: 'update', color: '#8e8e93', pane: 'general/update' },
    { label: 'Network', glyph: 'network', color: '#0a84ff', pane: 'network' },
    { label: 'Bluetooth', glyph: 'bluetooth', color: '#0a84ff', pane: 'bluetooth' },
    { label: 'Sound', glyph: 'sound', color: '#ff2d55', pane: 'sound' },
    { label: 'Touch ID', glyph: 'fingerprint', color: '#ff375f', pane: 'touchid' },
    { label: 'Keyboard', glyph: 'keyboard', color: '#8e8e93', pane: 'keyboard' },
    { label: 'Trackpad', glyph: 'trackpad', color: '#8e8e93', pane: 'trackpad' },
    { label: 'Control Center', glyph: 'controlcenter', color: '#8e8e93', pane: 'controlcenter' },
  ],
  [
    { label: 'Displays', glyph: 'display', color: '#0a84ff', pane: 'display', keys: 'resolution refresh brightness' },
    { label: 'Printers & Scanners', glyph: 'printer', color: '#8e8e93', pane: 'printers' },
    { label: 'Battery', glyph: 'battery', color: '#30c55a', pane: 'battery' },
    { label: 'Date & Time', glyph: 'calendar', color: '#0a84ff', pane: 'general/datetime' },
    { label: 'Sharing', glyph: 'airdrop', color: '#0a84ff', pane: 'general/airdrop', keys: 'airdrop handoff' },
    { label: 'Storage', glyph: 'storage', color: '#8e8e93', pane: 'general/storage', keys: 'disk startup' },
    { label: 'Lock Screen', glyph: 'lock', color: '#1c1c1e', pane: 'lock' },
    { label: 'Game Center', glyph: 'gamepad', color: '#ff2d55', pane: 'gamecenter' },
  ],
];

export default function SysPrefsApp(_: AppProps) {
  const wm = useWM();
  const acct = useAccount();
  const [q, setQ] = useState('');
  const needle = q.trim().toLowerCase();
  const hit = useMemo(() => (p: Pref) => !needle || `${p.label} ${p.keys ?? ''}`.toLowerCase().includes(needle), [needle]);
  const open = (p: Pref) => wm.open('settings', { pane: p.pane });
  const matches = ROWS.flat().filter(hit);
  return (
    <div className="spx">
      <div className="spx-bar">
        <span className="spx-grid-ico" aria-hidden="true">
          ▦
        </span>
        <b>System Preferences</b>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && matches[0] && open(matches[0])}
          placeholder="Search"
          aria-label="Search System Preferences"
        />
      </div>
      <div className="spx-account">
        <img src={personal.avatar} alt="" />
        <div>
          <b>{acct?.name ?? 'Guest Visitor'}</b>
          <span>{acct ? (acct.kind === 'google' ? acct.email : 'Portfolio ID') : 'Sign in to install apps and sync nothing — it stays in this browser'}</span>
        </div>
        <button type="button" className="spx-acct-btn" onClick={() => wm.open('settings', { pane: 'internet' })}>
          <Glyph name="at" color="#0a84ff" size={34} />
          <small>Portfolio ID</small>
        </button>
        <button type="button" className="spx-acct-btn" onClick={() => wm.open('settings', { pane: 'users' })}>
          <Glyph name="users" color="#8e8e93" size={34} />
          <small>About Me</small>
        </button>
      </div>
      <div className={`spx-rows ${needle ? 'searching' : ''}`}>
        {ROWS.map((row, i) => (
          <div key={i} className="spx-row">
            {row.map((p) => (
              <button key={p.label} type="button" className={`spx-item ${needle ? (hit(p) ? 'hit' : 'dim') : ''}`} onClick={() => open(p)} title={p.label}>
                <Glyph name={p.glyph} color={p.color} size={40} />
                <span>{p.label}</span>
              </button>
            ))}
          </div>
        ))}
      </div>
      {needle && !matches.length && <p className="spx-none">No preferences match “{q}”.</p>}
    </div>
  );
}
