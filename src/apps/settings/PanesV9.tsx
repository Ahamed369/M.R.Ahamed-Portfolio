import { useEffect, useState, type PointerEvent as RPointerEvent } from 'react';
import { Hero, Note, PopUp, Row, Section, Seg, Toggle, usePrefs } from '../SettingsApp';
import { useSettings } from '../../system/SettingsContext';
import { useSystem } from '../../system/SystemContext';
import { useWM } from '../../system/WindowManager';
import { useAccount, setAccount, requireSignIn } from '../../system/account';
import { readStore, writeStore } from '../../system/storage';
import { usePersisted } from '../../system/useStore';
import { AppIcon } from '../../components/AppIcons';
import { PinchRow } from './PanesV10';
import { SysIcon } from '../../components/SysIcons';
import { personal, socials } from '../../data/portfolio';

/* ════════════════════════════ Trackpad ════════════════════════════ */

export function TrackpadPane() {
  const { settings, update } = useSettings();
  const [tab, setTab] = useState<'point' | 'scroll' | 'more'>('point');
  const [probe, setProbe] = useState<string>('Click, tap, right-click or press firmly here');
  const [pressure, setPressure] = useState(0);
  const onProbe = (e: RPointerEvent<HTMLDivElement>) => {
    const p = e.pressure || 0;
    setPressure(p);
    const kind = e.pointerType === 'touch' ? 'Tap' : e.pointerType === 'pen' ? 'Pen' : 'Click';
    if (e.button === 2) setProbe('Secondary click detected');
    else if (p > 0.6 && e.pointerType !== 'mouse') setProbe(`Force ${kind} detected (pressure ${p.toFixed(2)})`);
    else setProbe(`${kind} detected`);
  };
  return (
    <>
      <div className="ss-tp-hero" aria-hidden="true">
        <div className={`ss-tp-pad tab-${tab}`}>
          <i className="f1" />
          <i className="f2" />
          <i className="f3" />
        </div>
      </div>
      <div className="ss-tp-tabs">
        <Seg
          label="Trackpad settings"
          value={tab}
          options={[
            ['point', 'Point & Click'],
            ['scroll', 'Scroll & Zoom'],
            ['more', 'More Gestures'],
          ]}
          onChange={setTab}
        />
      </div>
      {tab === 'point' && (
        <>
          <Section title="Try it" sub="The portfolio reacts to clicks, taps, right-clicks and (on supporting devices) pressure.">
            <div className="ss-tp-probe" onPointerDown={onProbe} onContextMenu={(e) => (e.preventDefault(), setProbe('Secondary click detected'))} role="button" tabIndex={0} aria-label="Trackpad test area">
              <b>{probe}</b>
              <span className="ss-tp-meter">
                <i style={{ width: `${Math.round(pressure * 100)}%` }} />
              </span>
            </div>
          </Section>
          <Note>Tracking speed, click pressure, Force Click, Tap to click and secondary-click options belong to your computer — change them in your Mac’s (or PC’s) own settings. A website can’t, so they aren’t shown here as fake switches.</Note>
        </>
      )}
      {tab === 'scroll' && (
        <Section>
          <Row label="Natural scrolling" sub="Content tracks finger movement. Turn off to reverse wheel and trackpad scrolling inside the portfolio.">
            <Toggle label="Natural scrolling" on={settings.naturalScroll !== false} onChange={(v) => update({ naturalScroll: v })} />
          </Row>
          <PinchRow />
          <Row label="Swipe between desktops" sub="Swipe left or right with two fingers on the desktop">
            <Toggle label="Swipe between desktops" on={settings.swipeSpaces !== false} onChange={(v) => update({ swipeSpaces: v })} />
          </Row>
        </Section>
      )}
      {tab === 'more' && (
        <Section title="Gestures and their shortcuts in this portfolio" sub="Browsers only pass on scrolling and pinching, so the other macOS gestures have keyboard shortcuts here.">
          {(
            [
              ['Mission Control', 'Pinch in, F3 or ⌃↑'],
              ['Launchpad', 'Pinch in further, F4 or the Launchpad icon'],
              ['Switch desktops', 'Two-finger swipe or ⌃← / ⌃→'],
              ['Notification Center', 'Click the date and time in the menu bar'],
              ['App Switcher', '⌘ Tab (or ⌃ Tab)'],
              ['Show Desktop', 'F11 or a hot corner'],
            ] as const
          ).map(([l, d]) => (
            <Row key={l} label={l}>
              <small className="ss-kbd-hint">{d}</small>
            </Row>
          ))}
        </Section>
      )}
      {tab === 'scroll' && <Note>Natural scrolling, pinch and desktop swipes are applied inside this portfolio.</Note>}
    </>
  );
}

/* ════════════════════════════ Keyboard ════════════════════════════ */

export function KeyboardPane() {
  const { flag, setFlag } = usePrefs();
  const [last, setLast] = useState<string>('Press any key…');
  const [text, setText] = useState('');
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const mods = [e.metaKey && '⌘', e.ctrlKey && '⌃', e.altKey && '⌥', e.shiftKey && '⇧'].filter(Boolean).join('');
      setLast(`${mods}${e.key === ' ' ? 'Space' : e.key.length === 1 ? e.key.toUpperCase() : e.key}  ·  code ${e.code}`);
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, []);
  return (
    <>
      <Hero glyph="keyboard" color="#8e8e93" title="Keyboard" desc="Keyboard shortcuts, input sources and a live key tester for this portfolio." />
      <Section>
        <Row label="Keyboard navigation" sub="Shows a clear focus ring on the control you reach with Tab / Shift-Tab">
          <Toggle label="Keyboard navigation" on={flag('kb-nav', true)} onChange={(v) => setFlag('kb-nav', v)} />
        </Row>
        <Row label="Keyboard Shortcuts…">
          <button type="button" className="ss-btn" onClick={() => window.dispatchEvent(new Event('mra-shortcuts'))}>
            Show Shortcuts
          </button>
        </Row>
      </Section>
      <Section title="Try your keyboard">
        <div className="ss-kb-live" aria-live="polite">
          <kbd>{last}</kbd>
        </div>
        <textarea className="ss-kb-text" value={text} onChange={(e) => setText(e.target.value)} placeholder="Type here to test key repeat…" aria-label="Keyboard test" />
      </Section>
      <Note>Key repeat rate and delay come from your computer’s own keyboard settings — a website can’t change them.</Note>
    </>
  );
}

/* ════════════════════════════ Menu Bar ════════════════════════════ */

export function MenuBarPane() {
  const { settings, update } = useSettings();
  const wm = useWM();
  const ex = settings.menuExtras ?? { cv: true, nowPlaying: true, language: true };
  const setEx = (k: keyof typeof ex, v: boolean) => update({ menuExtras: { ...ex, [k]: v } });
  return (
    <>
      <Hero glyph="menubar" color="#0a84ff" title="Menu Bar" desc="Choose what appears in the menu bar and how it behaves." />
      <Section>
        <Row label="Automatically hide and show the menu bar">
          <PopUp
            label="Automatically hide and show the menu bar"
            value={settings.menubarAutohide ?? 'never'}
            options={[
              ['never', 'Never'],
              ['fullscreen', 'In Full Screen Only'],
              ['always', 'Always'],
            ]}
            onChange={(v) => update({ menubarAutohide: v })}
          />
        </Row>
        <Row label="Show menu bar background">
          <Toggle label="Show menu bar background" on={settings.menubarBg !== false} onChange={(v) => update({ menubarBg: v })} />
        </Row>
      </Section>
      <Section title="Menu Bar Controls">
        <Row label="Download CV" glyph={<AppIcon name="cv" className="ss-appicon" />}>
          <Toggle label="Download CV" on={ex.cv !== false} onChange={(v) => setEx('cv', v)} />
        </Row>
        <Row label="Now Playing" sub="Shown while music plays" glyph={<AppIcon name="music" className="ss-appicon" />}>
          <Toggle label="Now Playing" on={ex.nowPlaying !== false} onChange={(v) => setEx('nowPlaying', v)} />
        </Row>
        <Row label="Language" sub="EN · සි · த" glyph={<AppIcon name="translate" className="ss-appicon" />}>
          <Toggle label="Language" on={ex.language !== false} onChange={(v) => setEx('language', v)} />
        </Row>
        <Row label="Privacy Shield" glyph={<AppIcon name="shield" className="ss-appicon" />}>
          <Toggle label="Privacy Shield" on={settings.showShield} onChange={(v) => update({ showShield: v })} />
        </Row>
        <Row label="Battery percentage" glyph={<AppIcon name="battery" className="ss-appicon" />}>
          <Toggle label="Battery percentage" on={settings.showBatteryPct} onChange={(v) => update({ showBatteryPct: v })} />
        </Row>
      </Section>
      <div className="ss-btnrow">
        <button type="button" className="ss-btn" onClick={() => wm.open('settings', { pane: 'controlcenter' })}>
          Control Center Modules…
        </button>
      </div>
    </>
  );
}

/* ════════════════════════════ Assistant (the portfolio's own — not Apple's Siri) ════════════════════════════ */

export function SiriPane() {
  const wm = useWM();
  const { flag, setFlag, choice, setChoice } = usePrefs();
  const [siri, setSiri] = useState(() => readStore<{ speak: boolean; voice?: string }>('mra-siri', { speak: false }));
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  useEffect(() => {
    if (!('speechSynthesis' in window)) return;
    const load = () => setVoices(window.speechSynthesis.getVoices().filter((v) => /^en|^si|^ta/i.test(v.lang)));
    load();
    window.speechSynthesis.addEventListener('voiceschanged', load);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', load);
  }, []);
  const save = (p: Partial<typeof siri>) => {
    const n = { ...siri, ...p };
    setSiri(n);
    writeStore('mra-siri', n);
  };
  const preview = () => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(`Hi, I'm the portfolio assistant. Ask me about ${personal.name}'s projects and skills.`);
    const v = voices.find((x) => x.name === siri.voice);
    if (v) u.voice = v;
    window.speechSynthesis.speak(u);
  };
  return (
    <>
      <Hero glyph="siri" color="#bf5af2" title="Assistant" desc="The portfolio’s own assistant (not Apple’s Siri). Ask about M.R. Ahamed by voice or text — answers come from the portfolio’s own data." />
      <Section title="Assistant">
        <Row label="Assistant" sub="Answers questions and opens apps, sets timers and changes wallpapers">
          <Toggle label="Assistant" on={flag('siri-on', true)} onChange={(v) => setFlag('siri-on', v)} />
        </Row>
        <Row label="Keyboard shortcut" sub="Opens the Assistant from anywhere">
          <PopUp
            label="Keyboard shortcut"
            value={choice('siri-key', 'opt-space') as 'opt-space' | 'off'}
            options={[
              ['opt-space', 'Press ⌥ Space'],
              ['off', 'Off'],
            ]}
            onChange={(v) => setChoice('siri-key', v)}
          />
        </Row>
        <Row label="Speak responses" sub="The Assistant reads its answers aloud">
          <Toggle label="Speak responses" on={siri.speak} onChange={(v) => save({ speak: v })} />
        </Row>
        <Row label="Voice" sub={voices.length ? `${voices.length} voices on this device` : 'Voices come from your browser'}>
          <PopUp label="Assistant voice" value={siri.voice ?? ''} options={[['', 'System default'], ...voices.map((v) => [v.name, `${v.name} (${v.lang})`] as [string, string])]} onChange={(v) => save({ voice: v || undefined })} />
        </Row>
      </Section>
      <div className="ss-btnrow">
        <button type="button" className="ss-btn" onClick={preview}>
          Preview Voice
        </button>
        <button type="button" className="ss-btn" onClick={() => wm.open('askai')}>
          Open Ask Me AI
        </button>
        <button type="button" className="ss-btn ss-btn-primary" onClick={() => wm.open('siri')} disabled={!flag('siri-on', true)}>
          Open Assistant
        </button>
      </div>
      <Note>Speech recognition and voices are provided by your browser. Nothing you say is stored.</Note>
    </>
  );
}

/* ════════════════════════════ Touch ID & Password ════════════════════════════ */

export function TouchIdPane() {
  const wm = useWM();
  const [platform, setPlatform] = useState<'checking' | 'yes' | 'no'>('checking');
  useEffect(() => {
    const P = window.PublicKeyCredential as (typeof PublicKeyCredential & { isUserVerifyingPlatformAuthenticatorAvailable?: () => Promise<boolean> }) | undefined;
    if (!P?.isUserVerifyingPlatformAuthenticatorAvailable) {
      setPlatform('no');
      return;
    }
    P.isUserVerifyingPlatformAuthenticatorAvailable()
      .then((v) => setPlatform(v ? 'yes' : 'no'))
      .catch(() => setPlatform('no'));
  }, []);
  return (
    <>
      <Hero glyph="lock" color="#ff375f" title="Login & Password" desc="How unlocking works in this portfolio. There are no fingerprints, faces or real passwords anywhere here." />
      <Section title="Unlocking">
        <Row label="Lock Screen" sub="Click, press Enter or swipe up — no password and no biometrics">
          <button type="button" className="ss-btn" onClick={() => wm.open('settings', { pane: 'lock' })}>
            Lock Screen Settings…
          </button>
        </Row>
        <Row label="Built-in biometric / passkey support on this device" sub="Reported by your browser (WebAuthn). The portfolio never uses it.">
          {platform === 'checking' ? 'Checking…' : platform === 'yes' ? 'Available' : 'Not available'}
        </Row>
      </Section>
      <Section title="Password">
        <Row label="Demo login for Wallet & Passwords" sub="Use only these demo details — never enter a real password here">
          <code className="ss-code">guest / portfolio2026</code>
        </Row>
        <Row label="Passwords app">
          <button type="button" className="ss-btn" onClick={() => wm.open('passwords')}>
            Open Passwords
          </button>
        </Row>
      </Section>
    </>
  );
}

/* ════════════════════════════ Internet Accounts ════════════════════════════ */

export function InternetAccountsPane() {
  const acct = useAccount();
  return (
    <>
      <Hero glyph="at" color="#0a84ff" title="Internet Accounts" desc="Accounts you use in this portfolio. Everything stays in this browser." />
      <Section title="Your account">
        {acct ? (
          <Row label={acct.name} sub={acct.kind === 'google' ? `Google · ${acct.email ?? ''}` : 'Portfolio ID (demo, no password)'} glyph={<AppIcon name={acct.kind === 'google' ? 'google' : 'contacts'} className="ss-appicon" />}>
            <button type="button" className="ss-btn" onClick={() => setAccount(null)}>
              Sign Out
            </button>
          </Row>
        ) : (
          <Row label="Not signed in" sub="Sign in to install apps from the App Store and Google Play demos">
            <button type="button" className="ss-btn ss-btn-primary" onClick={() => void requireSignIn('Add an account to this portfolio')}>
              Add Account…
            </button>
          </Row>
        )}
      </Section>
      <Section title={`${personal.name}’s profiles`}>
        {(
          [
            ['GitHub', socials.github, 'github'],
            ['LinkedIn', socials.linkedin, 'linkedin'],
            ['WhatsApp', socials.whatsapp, 'whatsapp'],
            ['Instagram', socials.instagram, 'instagram'],
            ['Facebook', socials.facebook, 'facebook'],
          ] as const
        ).map(([l, u, ic]) => (
          <Row key={l} label={l} sub={u.replace(/^https:\/\/(www\.)?/, '')} glyph={<AppIcon name={ic} className="ss-appicon" />}>
            <a className="ss-btn" href={u} target="_blank" rel="noopener noreferrer">
              Open ↗
            </a>
          </Row>
        ))}
      </Section>
    </>
  );
}

/* ════════════════════════════ Game Center ════════════════════════════ */

export function GameCenterPane() {
  const wm = useWM();
  const { flag, setFlag } = usePrefs();
  const [gc, setGc] = useState(() => readStore<{ name: string; played: string[]; ach: string[]; streak?: { count: number } }>('mra-gamecenter-v1', { name: 'Guest', played: [], ach: [] }));
  const rename = (name: string) => {
    const full = readStore<Record<string, unknown>>('mra-gamecenter-v1', {});
    writeStore('mra-gamecenter-v1', { ...full, name });
    setGc((g) => ({ ...g, name }));
  };
  return (
    <>
      <Hero glyph="gamepad" color="#ff2d55" title="Game Center" desc="Your player profile for the 20 games in Game Center." />
      <Section>
        <Row label="Nickname">
          <input className="ss-input" value={gc.name} onChange={(e) => rename(e.target.value.slice(0, 20))} aria-label="Game Center nickname" />
        </Row>
        <Row label="Games played">{gc.played?.length ?? 0}</Row>
        <Row label="Achievements">{gc.ach?.length ?? 0}</Row>
        <Row label="Daily challenge streak">{gc.streak?.count ?? 0} days</Row>
        <Row label="Game sounds" sub="Also in each game">
          <Toggle label="Game sounds" on={flag('gc-sounds', true)} onChange={(v) => setFlag('gc-sounds', v)} />
        </Row>
      </Section>
      <div className="ss-btnrow">
        <button type="button" className="ss-btn ss-btn-primary" onClick={() => wm.open('gamecenter')}>
          Open Game Center
        </button>
      </div>
    </>
  );
}

/* ════════════════════════════ Wallet & Pay ════════════════════════════ */

export function WalletPane() {
  const wm = useWM();
  const [mine] = usePersisted<unknown[]>('mra-wallet-v8', []);
  return (
    <>
      <Hero glyph="card" color="#1c1c1e" title="Wallet & Pay" desc="Certificates, passes and cards in the Wallet app." />
      <Section>
        <Row label="Passes you added">{mine.length}</Row>
        <Row label="Payments" sub="This portfolio never takes payments or card numbers">Disabled</Row>
        <Row label="Demo login" sub="Use only these demo details — never enter a real password here">
          <code className="ss-code">guest / portfolio2026</code>
        </Row>
      </Section>
      <div className="ss-btnrow">
        <button type="button" className="ss-btn ss-btn-primary" onClick={() => wm.open('wallet')}>
          Open Wallet
        </button>
      </div>
    </>
  );
}

/* ════════════════════════════ Printers & Scanners ════════════════════════════ */

export function PrintersPane() {
  const { choice, setChoice } = usePrefs();
  const sys = useSystem();
  const wm = useWM();
  return (
    <>
      <Hero glyph="printer" color="#8e8e93" title="Printers & Scanners" desc="Printing uses your browser’s print dialog — choose a printer or Save as PDF there." />
      <Section title="Printers">
        <Row label="System Print Dialog" sub="Default · via your browser" glyph={<span className="ss-printer" aria-hidden="true"><SysIcon n="doc" size={20} /></span>}>
          <button type="button" className="ss-btn" onClick={() => (sys.setOverlay('none'), window.setTimeout(() => window.print(), 50))}>
            Print Test Page
          </button>
        </Row>
        <Row label="Default paper size" sub="Used when you print or save a page as PDF">
          <PopUp
            label="Default paper size"
            value={choice('paper', 'a4') as 'a4' | 'letter'}
            options={[
              ['a4', 'A4'],
              ['letter', 'US Letter'],
            ]}
            onChange={(v) => setChoice('paper', v)}
          />
        </Row>
      </Section>
      <Section title="Documents">
        <Row label="CV — print or save as PDF">
          <button type="button" className="ss-btn" onClick={() => wm.open('preview')}>
            Open CV
          </button>
        </Row>
      </Section>
    </>
  );
}
