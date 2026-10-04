import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useMusic } from '../system/MusicContext';
import { useWM } from '../system/WindowManager';
import { getBatteryManager } from '../system/batteryLog';
import { ISLAND_ASSIST, ISLAND_EVT, ISLAND_REC, ISLAND_TORCH, getAssist, isRecording, isTorch, islandTorch, type AssistState, type IslandPing } from '../system/island';
import { useSettings } from '../system/SettingsContext';
import { onNotify, openAppLink } from '../system/notify';
import { AppIcon, type IconName } from './AppIcons';
import { cancelTimer, pauseTimer, resumeTimer, timerActive, useTimer } from '../system/timer';
import { toggleScreenRecording, useScreenRecording } from '../system/screenCapture';
import { CCIcon } from './ios/CCIcons';
import { SysIcon, SYS_ICON_NAMES } from './SysIcons';
import { getLang } from '../system/i18n';

type Lng = 'en' | 'si' | 'ta';
/** v10.3 — Dynamic Island captions in English, Sinhala and Tamil (follows the interface language) */
const TX = {
  charging: { en: 'Charging', si: 'ආරෝපණය වෙමින්', ta: 'சார்ஜ் ஆகிறது' },
  lowBattery: { en: 'Low Battery', si: 'බැටරිය අඩුයි', ta: 'பேட்டரி குறைவு' },
  focus: { en: 'Focus', si: 'අවධානය', ta: 'கவனம்' },
  dnd: { en: 'Do Not Disturb', si: 'බාධා නොකරන්න', ta: 'தொந்தரவு செய்ய வேண்டாம்' },
  work: { en: 'Work', si: 'වැඩ', ta: 'பணி' },
  sleep: { en: 'Sleep', si: 'නින්ද', ta: 'உறக்கம்' },
  personal: { en: 'Personal', si: 'පුද්ගලික', ta: 'தனிப்பட்ட' },
  on: { en: 'On', si: 'ක්‍රියාත්මකයි', ta: 'இயக்கத்தில்' },
  off: { en: 'Off', si: 'අක්‍රියයි', ta: 'முடக்கத்தில்' },
  silent: { en: 'Silent', si: 'නිහඬ', ta: 'அமைதி' },
  ring: { en: 'Ring', si: 'නාදය', ta: 'ஒலி' },
  incoming: { en: 'Incoming', si: 'ලැබෙන ඇමතුම', ta: 'உள்வரும் அழைப்பு' },
  calling: { en: 'Calling', si: 'අමතමින්', ta: 'அழைக்கிறது' },
  thinking: { en: 'Thinking…', si: 'සිතමින්…', ta: 'யோசிக்கிறது…' },
  listening: { en: 'Listening…', si: 'සවන් දෙමින්…', ta: 'கேட்கிறது…' },
  speaking: { en: 'Speaking…', si: 'කතා කරමින්…', ta: 'பேசுகிறது…' },
  paused: { en: 'Paused', si: 'විරාම කර ඇත', ta: 'இடைநிறுத்தப்பட்டது' },
  previous: { en: 'Previous', si: 'පෙර', ta: 'முந்தையது' },
  pause: { en: 'Pause', si: 'විරාම කරන්න', ta: 'இடைநிறுத்து' },
  play: { en: 'Play', si: 'වාදනය කරන්න', ta: 'இயக்கு' },
  next: { en: 'Next', si: 'ඊළඟ', ta: 'அடுத்தது' },
  openMusic: { en: 'Open Music', si: 'Music විවෘත කරන්න', ta: 'Music-ஐத் திற' },
  resumeTimer: { en: 'Resume timer', si: 'ටයිමරය නැවත අරඹන්න', ta: 'டைமரைத் தொடர்' },
  pauseTimer: { en: 'Pause timer', si: 'ටයිමරය විරාම කරන්න', ta: 'டைமரை இடைநிறுத்து' },
  cancelTimer: { en: 'Cancel timer', si: 'ටයිමරය අවලංගු කරන්න', ta: 'டைமரை ரத்துசெய்' },
  timer: { en: 'Timer', si: 'ටයිමරය', ta: 'டைமர்' },
  demoCall: { en: '{app} (demo call)', si: '{app} (නිදර්ශන ඇමතුම)', ta: '{app} (மாதிரி அழைப்பு)' },
  connecting: { en: 'Connecting…', si: 'සම්බන්ධ වෙමින්…', ta: 'இணைக்கிறது…' },
  open: { en: 'Open', si: 'විවෘත කරන්න', ta: 'திற' },
  stop: { en: 'Stop', si: 'නවත්වන්න', ta: 'நிறுத்து' },
  screenRec: { en: 'Screen Recording', si: 'තිර පටිගත කිරීම', ta: 'திரைப் பதிவு' },
  assistant: { en: 'Portfolio Assistant', si: 'Portfolio සහායක', ta: 'Portfolio உதவியாளர்' },
  islandLabel: { en: 'Dynamic Island — {mode}. Tap to open, hold to expand.', si: 'Dynamic Island — {mode}. විවෘත කිරීමට තට්ටු කරන්න, විශාල කිරීමට ඔබාගෙන සිටින්න.', ta: 'Dynamic Island — {mode}. திறக்கத் தட்டுங்கள், விரிவாக்க அழுத்திப் பிடியுங்கள்.' },
  alsoRunning: { en: 'Also running: {act}. Tap to show it.', si: 'මෙයද ක්‍රියාත්මකයි: {act}. පෙන්වීමට තට්ටු කරන්න.', ta: 'இதுவும் இயங்குகிறது: {act}. காட்டத் தட்டுங்கள்.' },
  act_call: { en: 'call', si: 'ඇමතුම', ta: 'அழைப்பு' },
  act_assist: { en: 'assist', si: 'සහායක', ta: 'உதவியாளர்' },
  act_rec: { en: 'rec', si: 'පටිගත කිරීම', ta: 'பதிவு' },
  act_timer: { en: 'timer', si: 'ටයිමරය', ta: 'டைமர்' },
  act_music: { en: 'music', si: 'සංගීතය', ta: 'இசை' },
  act_torch: { en: 'torch', si: 'විදුලි පන්දම', ta: 'டார்ச்' },
} satisfies Record<string, Record<Lng, string>>;
/** translate a key; `l` defaults to the current interface language (kept in sync with Settings) */
const tx = (k: keyof typeof TX, vars: Record<string, string> = {}, l: Lng = getLang()) => TX[k][l].replace(/\{(\w+)\}/g, (_, v: string) => vars[v] ?? '');
/** v10.3 — island ping icons: SysIcon names (or a few legacy symbols mapped to them) */
const PING_MAP: Record<string, string> = { '🔔': 'bell', '⏰': 'alarm', '⏱': 'stopwatch', '✉︎': 'mail', '✉': 'mail', '✓': 'check', '↗': 'share', '🔦': 'torch', '☾': 'moon' };
const SYS_SET = new Set<string>(SYS_ICON_NAMES);
const pingGlyph = (icon?: string) => {
  const n = icon && (SYS_SET.has(icon) ? icon : PING_MAP[icon]);
  return n ? <SysIcon n={n} size={18} /> : (icon ?? '•');
};

interface CallState {
  phase: string;
  started: number;
  video: boolean;
  app: string;
}

type Act = 'call' | 'assist' | 'rec' | 'timer' | 'music' | 'torch';
const fmt = (s: number) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(Math.floor(s % 60)).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
};

function Bars({ on, color = '#ff6fa3', n = 5 }: { on: boolean; color?: string; n?: number }) {
  return (
    <span className={`di-bars ${on ? 'on' : ''}`} style={{ ['--bar' as string]: color }} aria-hidden="true">
      {Array.from({ length: n }, (_, i) => (
        <i key={i} style={{ animationDelay: `${-(i * 0.17) % 0.9}s` }} />
      ))}
    </span>
  );
}

function Ring({ p, color }: { p: number; color: string }) {
  const c = 2 * Math.PI * 9;
  return (
    <svg className="di-ring" viewBox="0 0 22 22" aria-hidden="true">
      <circle cx="11" cy="11" r="9" stroke="rgba(255,255,255,0.18)" strokeWidth="2.6" fill="none" />
      <circle cx="11" cy="11" r="9" stroke={color} strokeWidth="2.6" fill="none" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - Math.max(0, Math.min(1, p)))} transform="rotate(-90 11 11)" />
    </svg>
  );
}

function Orb({ state }: { state: AssistState }) {
  return <span className={`di-orb ${state}`} aria-hidden="true" />;
}

/**
 * v10.2 — Dynamic Island. A small state machine of live activities that are
 * really happening in the portfolio:
 *   call (demo calls you start) · assistant (listening / speaking) · recording
 *   (Voice Memos or a real screen recording) · timer (Clock) · music · torch
 * plus short pings (Focus, Silent Mode, charging, low battery, notifications on Mac).
 *
 * idle → compact (one activity) → split (two: a detached bubble on iPhone)
 *      → expanded (long-press / hover) → interaction → collapse.
 * Tap opens the activity's app; long-press (or hover on Mac) expands it.
 */
export function DynamicIsland({ variant }: { variant: 'iphone' | 'mac' }) {
  const music = useMusic();
  const wm = useWM();
  const { settings, motionReduced } = useSettings();
  const lng: Lng = settings.language === 'si' || settings.language === 'ta' ? settings.language : 'en';
  const t = (k: keyof typeof TX, vars: Record<string, string> = {}) => tx(k, vars, lng);
  const timer = useTimer();
  const screenRec = useScreenRecording();
  const [call, setCall] = useState<CallState | null>(null);
  const [vmRec, setVmRec] = useState(isRecording());
  const [recSince, setRecSince] = useState<number | null>(null);
  const [torch, setTorch] = useState(isTorch());
  const [assist, setAssist] = useState<AssistState>(getAssist());
  const [ping, setPing] = useState<(IslandPing & { node?: ReactNode; right?: string; cls?: string }) | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [prefer, setPrefer] = useState<Act | null>(null);
  const [, tick] = useState(0);
  const pingT = useRef(0);
  const ref = useRef<HTMLDivElement>(null);
  const press = useRef<{ t: number; long: boolean } | null>(null);

  const show = (p: IslandPing & { node?: ReactNode; right?: string; cls?: string }) => {
    setPing(p);
    window.clearTimeout(pingT.current);
    pingT.current = window.setTimeout(() => setPing(null), p.ms ?? 2600);
  };

  const diNotifRef = useRef(true);
  diNotifRef.current = settings.diShow?.notif !== false;
  useEffect(() => {
    const onCall = (e: Event) => setCall((e as CustomEvent<CallState | null>).detail);
    const onRec = (e: Event) => setVmRec(!!(e as CustomEvent<boolean>).detail);
    const onTorch = (e: Event) => setTorch(!!(e as CustomEvent<boolean>).detail);
    const onAssist = (e: Event) => setAssist((e as CustomEvent<AssistState>).detail);
    const onPing = (e: Event) => show((e as CustomEvent<IslandPing>).detail);
    // Mac: every (non-silent) notification also pings the notch; iPhone: only notifications marked for the Island
    const offNotify = onNotify((n) => {
      if (variant === 'mac' ? n.silent || !diNotifRef.current : !n.island) return;
      show({
        title: n.title,
        sub: n.body ?? n.app,
        ms: variant === 'mac' ? 2600 : 4200,
        node: n.icon ? (
          <span className="di-app-ico">
            <AppIcon name={n.icon as IconName} />
          </span>
        ) : undefined,
        icon: n.icon ? undefined : 'bell',
        onTap: n.onClick ?? (variant === 'mac' ? () => window.dispatchEvent(new CustomEvent('mra-open-nc')) : undefined),
      });
    });
    window.addEventListener('mra-call-state', onCall);
    window.addEventListener(ISLAND_REC, onRec);
    window.addEventListener(ISLAND_TORCH, onTorch);
    window.addEventListener(ISLAND_ASSIST, onAssist);
    window.addEventListener(ISLAND_EVT, onPing);
    // charging / low battery from the real Battery API (when the browser shares it)
    let mgr: Awaited<ReturnType<typeof getBatteryManager>> = null;
    let lowShown = false;
    const pct = () => Math.round((mgr?.level ?? 0) * 100);
    const chg = () => {
      if (mgr?.charging) show({ title: tx('charging'), right: `${pct()}%`, cls: 'charge', node: <BatteryGlyph level={mgr.level} color="#32d74b" />, ms: 2600, onTap: () => openAppLink('settings', { pane: 'battery' }) });
    };
    const lvl = () => {
      if (!mgr || mgr.charging) return;
      if (mgr.level <= 0.2 && !lowShown) {
        lowShown = true;
        show({ title: tx('lowBattery'), right: `${pct()}%`, cls: 'lowbat', node: <BatteryGlyph level={mgr.level} color="#ff453a" />, ms: 3200, onTap: () => openAppLink('settings', { pane: 'battery' }) });
      } else if (mgr.level > 0.25) lowShown = false;
    };
    void getBatteryManager().then((m) => {
      mgr = m;
      m?.addEventListener('chargingchange', chg);
      m?.addEventListener('levelchange', lvl);
    });
    return () => {
      window.removeEventListener('mra-call-state', onCall);
      window.removeEventListener(ISLAND_REC, onRec);
      window.removeEventListener(ISLAND_TORCH, onTorch);
      window.removeEventListener(ISLAND_ASSIST, onAssist);
      window.removeEventListener(ISLAND_EVT, onPing);
      mgr?.removeEventListener('chargingchange', chg);
      mgr?.removeEventListener('levelchange', lvl);
      offNotify();
      window.clearTimeout(pingT.current);
    };
  }, [variant]);

  // Focus changes → the Focus ping
  const focusRef = useRef(settings.focusMode);
  useEffect(() => {
    if (focusRef.current === settings.focusMode) return;
    focusRef.current = settings.focusMode;
    const label = tx(({ off: 'focus', dnd: 'dnd', work: 'work', sleep: 'sleep', personal: 'personal' } as const)[settings.focusMode ?? 'off']);
    const on = settings.focusMode !== 'off';
    show({ title: label, right: on ? tx('on') : tx('off'), cls: `focus ${on ? '' : 'off'}`, node: <span className="di-pill-ico purple"><CCIcon n="moon" size={15} fill /></span>, onTap: () => openAppLink('settings', { pane: 'focus' }) });
  }, [settings.focusMode]);

  // Silent Mode (the portfolio's mute) → the Silent ping
  const muteRef = useRef(music.muted);
  useEffect(() => {
    if (muteRef.current === music.muted) return;
    muteRef.current = music.muted;
    show({ title: music.muted ? tx('silent') : tx('ring'), right: music.muted ? tx('on') : '', cls: music.muted ? 'silent' : 'ring', node: <span className={`di-pill-ico ${music.muted ? 'red' : 'grey'}`}><CCIcon n={music.muted ? 'bellslash' : 'bell'} size={14} /></span>, ms: 1800, onTap: () => openAppLink('settings', { pane: 'sounds' }) });
  }, [music.muted]);

  // recording start time (Voice Memos or screen)
  const recOn = vmRec || screenRec !== null;
  useEffect(() => {
    setRecSince(recOn ? (screenRec ?? Date.now()) : null);
  }, [recOn, screenRec]);

  const ds = settings.diShow ?? {};
  const allow = (k: 'music' | 'timer' | 'call' | 'rec' | 'torch') => ds[k] !== false;
  const acts: Act[] = [];
  if (call && allow('call')) acts.push('call');
  if (assist !== 'idle') acts.push('assist');
  if (recOn && allow('rec')) acts.push('rec');
  if (timerActive(timer) && allow('timer')) acts.push('timer');
  if (music.playing && allow('music')) acts.push('music');
  if (torch && allow('torch')) acts.push('torch');
  // a tapped bubble comes to the front — but calls and the assistant always lead
  if (prefer && acts.includes(prefer) && acts[0] !== 'call' && acts[0] !== 'assist') acts.sort((a, b) => (a === prefer ? -1 : b === prefer ? 1 : 0));
  const primary: Act | null = acts[0] ?? null;
  const secondary: Act | null = variant === 'iphone' && !ping && !expanded ? (acts[1] ?? null) : null;
  useEffect(() => {
    if (!primary) setExpanded(false);
  }, [primary]);

  const live = !!call || recOn || timer.end !== null;
  useEffect(() => {
    if (!live) return;
    const t = window.setInterval(() => tick((x) => x + 1), 500);
    return () => window.clearInterval(t);
  }, [live]);

  // collapse when tapping elsewhere
  useEffect(() => {
    if (!expanded) return;
    const off = (e: PointerEvent) => {
      if (!ref.current?.parentElement?.contains(e.target as Node)) setExpanded(false);
    };
    document.addEventListener('pointerdown', off, true);
    return () => document.removeEventListener('pointerdown', off, true);
  }, [expanded]);

  const callSecs = call && call.phase === 'active' ? (Date.now() - call.started) / 1000 : 0;
  const recSecs = recSince ? (Date.now() - recSince) / 1000 : 0;
  const tLeft = timer.left / 1000;
  const tP = timer.total ? timer.left / timer.total : 0;
  const art = <span className="di-art" style={{ background: `linear-gradient(135deg, ${music.track.art[0]}, ${music.track.art[1]})` }} />;

  const compact = (a: Act): [ReactNode, ReactNode] => {
    switch (a) {
      case 'call':
        return [<span key="l" className="di-pill-ico green"><CCIcon n={call?.video ? 'camera' : 'phone'} size={13} fill={!call?.video} /></span>, <span key="r" className="di-txt green">{call?.phase === 'active' ? fmt(callSecs) : call?.phase === 'incoming' ? t('incoming') : t('calling')}</span>];
      case 'assist':
        return [<Orb key="l" state={assist} />, assist === 'speaking' || assist === 'listening' ? <Bars key="r" on color={assist === 'listening' ? '#64d2ff' : '#bf5af2'} /> : <span key="r" className="di-txt dim">{t('thinking')}</span>];
      case 'rec':
        return [<span key="l" className="di-rec" />, <span key="r" className="di-txt red">{fmt(recSecs)}</span>];
      case 'timer':
        return [<span key="l" className="di-ico orange"><CCIcon n="timer" size={16} /></span>, <span key="r" className="di-txt orange">{timer.paused !== null ? t('paused') : fmt(Math.ceil(tLeft))}</span>];
      case 'music':
        return [art, <Bars key="r" on={music.playing} />];
      case 'torch':
        return [<span key="l" className="di-ico"><CCIcon n="torch" size={15} /></span>, <span key="r" className="di-txt">{t('on')}</span>];
    }
  };
  const bubble = (a: Act) => {
    switch (a) {
      case 'timer':
        return <Ring p={tP} color="#ff9f0a" />;
      case 'music':
        return art;
      case 'rec':
        return <span className="di-rec" />;
      case 'call':
        return <span className="di-pill-ico green small"><CCIcon n="phone" size={11} fill /></span>;
      case 'assist':
        return <Orb state={assist} />;
      case 'torch':
        return <CCIcon n="torch" size={13} />;
    }
  };

  const openAct = (a: Act | null) => {
    setExpanded(false);
    switch (a) {
      case 'music':
        return wm.open('music');
      case 'timer':
        return wm.open('clock', { tab: 'timer' });
      case 'call':
        return wm.open(call?.app === 'whatsapp' ? 'whatsapp' : 'facetime');
      case 'rec':
        return screenRec !== null ? void toggleScreenRecording() : wm.open('voicememos');
      case 'assist':
        return wm.open('siri');
      case 'torch':
        return islandTorch(false);
      default:
        return undefined;
    }
  };

  type Mode = 'idle' | 'ping' | Act;
  const mode = (ping ? 'ping' : (primary ?? 'idle')) as Mode;
  let lead: ReactNode = null;
  let trail: ReactNode = null;
  if (mode === 'ping' && ping) {
    lead = ping.node ?? (
      <span className="di-ico" style={{ color: ping.tint }}>
        {pingGlyph(ping.icon)}
      </span>
    );
    trail = null;
  } else if (primary) [lead, trail] = compact(primary);

  const expandable = primary === 'music' || primary === 'timer' || primary === 'call' || primary === 'rec' || primary === 'assist';
  const onDown = () => {
    if (mode === 'ping') {
      press.current = { t: Date.now(), long: false };
      return;
    }
    if (mode === 'idle') return;
    const p = { t: Date.now(), long: false };
    press.current = p;
    window.setTimeout(() => {
      if (press.current === p && expandable) {
        p.long = true;
        setExpanded(true);
      }
    }, 450);
  };
  const onUp = () => {
    const p = press.current;
    press.current = null;
    if (!p || p.long) return;
    // v10.3 — tapping a short alert opens what it is about, then the alert closes
    if (mode === 'ping' && ping) {
      const tap = ping.onTap;
      window.clearTimeout(pingT.current);
      setPing(null);
      tap?.();
      return;
    }
    if (expanded) return;
    if (variant === 'mac' && expandable) setExpanded((x) => !x);
    else openAct(primary);
  };

  return (
    <div className={`di-host di-host-${variant} ${secondary ? 'has-sec' : ''}`}>
      <div
        ref={ref}
        className={`di di-${variant} di-${mode} ${ping?.cls ? ping.cls.split(' ').filter(Boolean).map((c) => `di-p-${c}`).join(' ') : ''} ${expanded && primary ? `di-exp di-exp-${primary}` : ''} ${mode !== 'idle' ? 'di-live' : ''} ${motionReduced ? 'di-calm' : ''}`}
        role={mode === 'idle' ? undefined : 'button'}
        tabIndex={mode === 'idle' ? -1 : 0}
        aria-label={mode === 'idle' ? undefined : mode === 'ping' ? `${ping?.title ?? ''} ${ping?.right ?? ping?.sub ?? ''}` : t('islandLabel', { mode: t(`act_${mode}`) })}
        aria-expanded={expandable ? expanded : undefined}
        onPointerDown={onDown}
        onPointerUp={onUp}
        onPointerLeave={(e) => {
          press.current = null;
          if (variant === 'mac' && e.pointerType === 'mouse') setExpanded(false);
        }}
        onPointerEnter={(e) => variant === 'mac' && e.pointerType === 'mouse' && expandable && setExpanded(true)}
        onContextMenu={(e) => (e.preventDefault(), expandable && setExpanded(true))}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            if (mode === 'ping' && ping?.onTap) return void (ping.onTap(), setPing(null));
            openAct(primary);
          }
          if (e.key === ' ' && expandable) (e.preventDefault(), setExpanded((x) => !x));
          if (e.key === 'Escape') setExpanded(false);
        }}
      >
        {!expanded && mode === 'ping' && ping && (
          <span className="di-ping-row">
            <span className="di-lead">{lead}</span>
            <span className="di-ping-t">
              <b>{ping.title}</b>
              {!ping.right && ping.sub && <small>{ping.sub}</small>}
            </span>
            {ping.right && <span className="di-ping-r">{ping.right}</span>}
          </span>
        )}
        {!expanded && mode !== 'ping' && (
          <>
            <span className="di-lead">{lead}</span>
            <span className="di-cam" aria-hidden="true" />
            <span className="di-trail">{trail}</span>
          </>
        )}
        {expanded && primary === 'music' && (
          <div className="di-card di-card-music" onPointerDown={(e) => e.stopPropagation()} onPointerUp={(e) => e.stopPropagation()}>
            <div className="di-card-row">
              <span className="di-card-art" style={{ background: `linear-gradient(135deg, ${music.track.art[0]}, ${music.track.art[1]})` }} />
              <div className="di-card-meta">
                <b>{music.track.title}</b>
                <small>{music.track.artist}</small>
              </div>
              <Bars on={music.playing} n={6} />
            </div>
            <div className="di-prog-row">
              <span>{fmt(music.currentTime)}</span>
              <span className="di-prog">
                <i style={{ width: `${music.duration ? (music.currentTime / music.duration) * 100 : 0}%` }} />
              </span>
              <span>-{fmt(Math.max(0, music.duration - music.currentTime))}</span>
            </div>
            <div className="di-card-ctl">
              <button type="button" aria-label={t('previous')} onClick={music.prev}>
                <span><CCIcon n="prev" size={26} fill /></span>
              </button>
              <button type="button" aria-label={music.playing ? t('pause') : t('play')} onClick={music.toggle}>
                <CCIcon n={music.playing ? 'pause' : 'play'} size={28} fill />
              </button>
              <button type="button" aria-label={t('next')} onClick={music.next}>
                <span><CCIcon n="next" size={26} fill /></span>
              </button>
              <button type="button" aria-label={t('openMusic')} onClick={() => openAct('music')}>
                <CCIcon n="music" size={18} />
              </button>
            </div>
          </div>
        )}
        {expanded && primary === 'timer' && (
          <div className="di-card di-card-timer" onPointerDown={(e) => e.stopPropagation()} onPointerUp={(e) => e.stopPropagation()}>
            <button type="button" className="di-round orange" aria-label={timer.paused !== null ? t('resumeTimer') : t('pauseTimer')} onClick={() => (timer.paused !== null ? resumeTimer() : pauseTimer())}>
              <CCIcon n={timer.paused !== null ? 'play' : 'pause'} size={20} fill />
            </button>
            <button type="button" className="di-round grey" aria-label={t('cancelTimer')} onClick={() => cancelTimer()}>
              <CCIcon n="x" size={18} />
            </button>
            <span className="di-timer-r" onClick={() => openAct('timer')} role="button" tabIndex={0}>
              <small>{t('timer')}</small>
              <b>{fmt(Math.ceil(tLeft))}</b>
            </span>
          </div>
        )}
        {expanded && primary === 'call' && (
          <div className="di-card" onPointerDown={(e) => e.stopPropagation()} onPointerUp={(e) => e.stopPropagation()}>
            <span className="di-big green">
              <CCIcon n={call?.video ? 'camera' : 'phone'} size={24} fill={!call?.video} />
            </span>
            <div className="di-card-meta">
              <small>{t('demoCall', { app: call?.app === 'whatsapp' ? 'WhatsApp' : 'FaceTime' })}</small>
              <b className="di-num green">{call?.phase === 'active' ? fmt(callSecs) : t('connecting')}</b>
            </div>
            <div className="di-card-ctl">
              <button type="button" onClick={() => openAct('call')}>
                {t('open')}
              </button>
            </div>
          </div>
        )}
        {expanded && primary === 'rec' && (
          <div className="di-card" onPointerDown={(e) => e.stopPropagation()} onPointerUp={(e) => e.stopPropagation()}>
            <span className="di-big red">
              <span className="di-rec big" />
            </span>
            <div className="di-card-meta">
              <small>{screenRec !== null ? t('screenRec') : 'Voice Memos'}</small>
              <b className="di-num red">{fmt(recSecs)}</b>
            </div>
            <div className="di-card-ctl">
              <button type="button" onClick={() => openAct('rec')}>
                {screenRec !== null ? t('stop') : t('open')}
              </button>
            </div>
          </div>
        )}
        {expanded && primary === 'assist' && (
          <div className="di-card" onPointerDown={(e) => e.stopPropagation()} onPointerUp={(e) => e.stopPropagation()}>
            <Orb state={assist} />
            <div className="di-card-meta">
              <small>{t('assistant')}</small>
              <b>{assist === 'listening' ? t('listening') : assist === 'speaking' ? t('speaking') : t('thinking')}</b>
            </div>
            <div className="di-card-ctl">
              <button type="button" onClick={() => openAct('assist')}>
                {t('open')}
              </button>
            </div>
          </div>
        )}
      </div>
      {secondary && (
        <button type="button" className="di-sec" aria-label={t('alsoRunning', { act: t(`act_${secondary}`) })} onClick={() => setPrefer(secondary)}>
          {bubble(secondary)}
        </button>
      )}
    </div>
  );
}

function BatteryGlyph({ level, color }: { level: number; color: string }) {
  return (
    <svg className="di-bat" viewBox="0 0 30 14" aria-hidden="true">
      <rect x="0.75" y="0.75" width="25" height="12.5" rx="3.5" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="1.5" />
      <rect x="27" y="4.5" width="2" height="5" rx="1" fill="rgba(255,255,255,0.45)" />
      <rect x="2.5" y="2.5" width={Math.max(2, 21.5 * level)} height="9" rx="2" fill={color} />
    </svg>
  );
}
