import { useEffect, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import { Hero, Note, PopUp, Row, Section, Seg, Sim, Slider, Toggle, usePrefs } from '../SettingsApp';
import { useSettings } from '../../system/SettingsContext';
import { useSystem } from '../../system/SystemContext';
import { useWM } from '../../system/WindowManager';
import { useAccount, setAccount, requireSignIn } from '../../system/account';
import { readStore, writeStore } from '../../system/storage';
import { usePersisted } from '../../system/useStore';
import { notify } from '../../system/notify';
import { AppIcon } from '../../components/AppIcons';
import { personal, socials } from '../../data/portfolio';

/* ════════════════════════════ Trackpad ════════════════════════════ */

export function TrackpadPane() {
  const { settings, update } = useSettings();
  const { flag, setFlag, choice, setChoice } = usePrefs();
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
          <Section>
            <Row label="Tracking speed" sub={<>Pointer speed comes from your device settings <Sim>Device</Sim></>}>
              <Slider label="Tracking speed" min={0} max={9} step={1} value={Number(choice('tp-speed', '5'))} onChange={(v) => setChoice('tp-speed', String(v))} left={<small>Slow</small>} right={<small>Fast</small>} />
            </Row>
            <Row label="Click">
              <Slider label="Click pressure" min={0} max={2} step={1} value={Number(choice('tp-click', '1'))} onChange={(v) => setChoice('tp-click', String(v))} left={<small>Light</small>} right={<small>Firm</small>} />
            </Row>
            <Row label="Force Click and haptic feedback" sub="Click, then press firmly to enable Force Click and haptic feedback">
              <Toggle label="Force Click and haptic feedback" on={flag('tp-force', true)} onChange={(v) => setFlag('tp-force', v)} />
            </Row>
            <Row label="Look up & data detectors">
              <PopUp
                label="Look up & data detectors"
                value={choice('tp-lookup', 'force') as 'force' | 'three' | 'off'}
                options={[
                  ['force', 'Force Click with One Finger'],
                  ['three', 'Tap with Three Fingers'],
                  ['off', 'Off'],
                ]}
                onChange={(v) => setChoice('tp-lookup', v)}
              />
            </Row>
            <Row label="Secondary click">
              <PopUp
                label="Secondary click"
                value={choice('tp-secondary', 'two') as 'two' | 'br' | 'bl' | 'off'}
                options={[
                  ['two', 'Click or Tap with Two Fingers'],
                  ['br', 'Click in Bottom Right Corner'],
                  ['bl', 'Click in Bottom Left Corner'],
                  ['off', 'Off'],
                ]}
                onChange={(v) => setChoice('tp-secondary', v)}
              />
            </Row>
            <Row label="Tap to click" sub="Tap with one finger">
              <Toggle label="Tap to click" on={flag('tp-tap', true)} onChange={(v) => setFlag('tp-tap', v)} />
            </Row>
          </Section>
          <Section title="Try it">
            <div className="ss-tp-probe" onPointerDown={onProbe} onContextMenu={(e) => (e.preventDefault(), setProbe('Secondary click detected'))} role="button" tabIndex={0} aria-label="Trackpad test area">
              <b>{probe}</b>
              <span className="ss-tp-meter">
                <i style={{ width: `${Math.round(pressure * 100)}%` }} />
              </span>
            </div>
          </Section>
        </>
      )}
      {tab === 'scroll' && (
        <Section>
          <Row label="Natural scrolling" sub="Content tracks finger movement. Turn off to reverse wheel and trackpad scrolling inside the portfolio.">
            <Toggle label="Natural scrolling" on={settings.naturalScroll !== false} onChange={(v) => update({ naturalScroll: v })} />
          </Row>
          <Row label="Zoom in or out" sub="Pinch with two fingers. Turn off to stop pinch-zooming the page.">
            <Toggle label="Zoom in or out" on={settings.pinchZoom !== false} onChange={(v) => update({ pinchZoom: v })} />
          </Row>
          <Row label="Smart zoom" sub="Double-tap with two fingers">
            <Toggle label="Smart zoom" on={flag('tp-smartzoom', true)} onChange={(v) => setFlag('tp-smartzoom', v)} />
          </Row>
          <Row label="Rotate" sub="Rotate with two fingers">
            <Toggle label="Rotate" on={flag('tp-rotate', true)} onChange={(v) => setFlag('tp-rotate', v)} />
          </Row>
        </Section>
      )}
      {tab === 'more' && (
        <Section>
          {(
            [
              ['tp-pages', 'Swipe between pages', 'Scroll left or right with two fingers'],
              ['tp-fsapps', 'Swipe between full-screen applications', 'Swipe left or right with three fingers'],
              ['tp-nc', 'Notification Center', 'Swipe left from the right edge with two fingers'],
              ['tp-mc', 'Mission Control', 'Swipe up with three fingers'],
              ['tp-expose', 'App Exposé', 'Swipe down with three fingers'],
              ['tp-lp', 'Launchpad', 'Pinch with thumb and three fingers'],
              ['tp-desktop', 'Show Desktop', 'Spread with thumb and three fingers'],
            ] as const
          ).map(([k, l, d]) => (
            <Row key={k} label={l} sub={d}>
              <Toggle label={l} on={flag(k, k !== 'tp-expose')} onChange={(v) => setFlag(k, v)} />
            </Row>
          ))}
        </Section>
      )}
      <Note>Gestures are handled by your device. Natural scrolling and pinch-to-zoom settings are applied inside this portfolio.</Note>
    </>
  );
}

/* ════════════════════════════ Keyboard ════════════════════════════ */

export function KeyboardPane() {
  const { choice, setChoice, flag, setFlag } = usePrefs();
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
        <Row label="Key repeat rate">
          <Slider label="Key repeat rate" min={0} max={7} step={1} value={Number(choice('kb-repeat', '5'))} onChange={(v) => setChoice('kb-repeat', String(v))} left={<small>Off</small>} right={<small>Fast</small>} />
        </Row>
        <Row label="Delay until repeat">
          <Slider label="Delay until repeat" min={0} max={5} step={1} value={Number(choice('kb-delay', '3'))} onChange={(v) => setChoice('kb-delay', String(v))} left={<small>Long</small>} right={<small>Short</small>} />
        </Row>
        <Row label="Keyboard navigation" sub="Use Tab to move focus between controls">
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
      <Note>Key repeat and delay are handled by your device — the sliders show how macOS arranges them.</Note>
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

/* ════════════════════════════ Intelligence & Siri ════════════════════════════ */

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
      <Hero glyph="siri" color="#bf5af2" title="Intelligence & Siri" desc="Ask questions about M.R. Ahamed by voice or text. Answers come from the portfolio’s own data." />
      <Section title="Siri">
        <Row label="Siri" sub="Answers questions and opens apps">
          <Toggle label="Siri" on={flag('siri-on', true)} onChange={(v) => setFlag('siri-on', v)} />
        </Row>
        <Row label="Keyboard shortcut">
          <PopUp
            label="Keyboard shortcut"
            value={choice('siri-key', 'app') as 'app' | 'off'}
            options={[
              ['app', 'Open from the Dock or Spotlight'],
              ['off', 'Off'],
            ]}
            onChange={(v) => setChoice('siri-key', v)}
          />
        </Row>
        <Row label="Voice responses" sub="Siri speaks its answers">
          <Toggle label="Voice responses" on={siri.speak} onChange={(v) => save({ speak: v })} />
        </Row>
        <Row label="Voice" sub={voices.length ? `${voices.length} voices on this device` : 'Voices come from your browser'}>
          <PopUp label="Siri voice" value={siri.voice ?? ''} options={[['', 'System default'], ...voices.map((v) => [v.name, `${v.name} (${v.lang})`] as [string, string])]} onChange={(v) => save({ voice: v || undefined })} />
        </Row>
        <Row label="Show captions" sub="Always show Siri’s answers on screen">
          <Toggle label="Show captions" on={flag('siri-captions', true)} onChange={(v) => setFlag('siri-captions', v)} />
        </Row>
      </Section>
      <div className="ss-btnrow">
        <button type="button" className="ss-btn" onClick={preview}>
          Preview Voice
        </button>
        <button type="button" className="ss-btn" onClick={() => wm.open('askai')}>
          Open Ask Me AI
        </button>
        <button type="button" className="ss-btn ss-btn-primary" onClick={() => wm.open('siri')}>
          Ask Siri
        </button>
      </div>
      <Note>Speech recognition and voices are provided by your browser. Nothing you say is stored.</Note>
    </>
  );
}

/* ════════════════════════════ Touch ID & Password ════════════════════════════ */

export function TouchIdPane() {
  const { flag, setFlag } = usePrefs();
  const wm = useWM();
  const [platform, setPlatform] = useState<'checking' | 'yes' | 'no'>('checking');
  const [prints, setPrints] = usePersisted<string[]>('mra-touchid-v9', []);
  const [scan, setScan] = useState<number | null>(null);
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
  const timer = useRef(0);
  const add = () => {
    if (prints.length >= 3) return;
    setScan(0);
    let p = 0;
    window.clearInterval(timer.current);
    timer.current = window.setInterval(() => {
      p += 12;
      setScan(Math.min(100, p));
      if (p >= 100) {
        window.clearInterval(timer.current);
        setPrints((x) => [...x, `Finger ${x.length + 1}`]);
        setScan(null);
        notify({ app: 'Touch ID', icon: 'passwords', title: 'Fingerprint added (demo)', body: 'Nothing was scanned — this portfolio only simulates Touch ID.' });
      }
    }, 120);
  };
  useEffect(() => () => window.clearInterval(timer.current), []);
  return (
    <>
      <Hero glyph="fingerprint" color="#ff375f" title="Touch ID & Password" desc="A demo of Touch ID settings. The portfolio never reads fingerprints or real passwords." />
      <Section title="Touch ID">
        <div className="ss-fp-row">
          {prints.map((p, i) => (
            <div key={p} className="ss-fp">
              <span className="ss-fp-ico">☝︎</span>
              <small>{p}</small>
              <button type="button" aria-label={`Delete ${p}`} onClick={() => setPrints((x) => x.filter((_, k) => k !== i))}>
                ×
              </button>
            </div>
          ))}
          {prints.length < 3 && (
            <button type="button" className="ss-fp add" onClick={add} disabled={scan !== null}>
              {scan === null ? (
                <>
                  <span className="ss-fp-ico">＋</span>
                  <small>Add Fingerprint</small>
                </>
              ) : (
                <>
                  <span className="ss-fp-ring" style={{ ['--p' as string]: `${scan}%` }} />
                  <small>Place finger… {scan}%</small>
                </>
              )}
            </button>
          )}
        </div>
        <Row label="Use Touch ID to unlock the portfolio lock screen" sub={<Sim />}>
          <Toggle label="Use Touch ID to unlock" on={flag('tid-unlock', true)} onChange={(v) => setFlag('tid-unlock', v)} />
        </Row>
        <Row label="Use Touch ID for Wallet" sub={<Sim />}>
          <Toggle label="Use Touch ID for Wallet" on={flag('tid-wallet', false)} onChange={(v) => setFlag('tid-wallet', v)} />
        </Row>
        <Row label="Use Touch ID for autofilling passwords" sub={<Sim />}>
          <Toggle label="Use Touch ID for autofilling passwords" on={flag('tid-autofill', true)} onChange={(v) => setFlag('tid-autofill', v)} />
        </Row>
      </Section>
      <Section title="This device">
        <Row label="Built-in biometric / passkey support" sub="Reported by your browser (WebAuthn)">
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
        <Row label="System Print Dialog" sub="Default · via your browser" glyph={<span className="ss-printer" aria-hidden="true">🖨</span>}>
          <button type="button" className="ss-btn" onClick={() => (sys.setOverlay('none'), window.setTimeout(() => window.print(), 50))}>
            Print Test Page
          </button>
        </Row>
        <Row label="Default paper size">
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
