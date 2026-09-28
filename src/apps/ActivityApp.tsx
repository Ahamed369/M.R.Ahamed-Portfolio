import { useEffect, useRef, useState } from 'react';
import { AppIcon } from '../components/AppIcons';
import { useWM } from '../system/WindowManager';
import { APPS } from '../system/apps';
import { fmtDuration, useScreenTime } from '../system/screenTime';
import type { AppId } from '../system/types';
import type { AppProps } from '../components/Desktop';

/**
 * v9 — Activity Monitor with real measurements from this browser tab:
 * frame rate & main-thread load (requestAnimationFrame timing), JS heap
 * (Chrome's performance.memory), DOM nodes per window, network transfers
 * (Resource Timing) and focused time (Screen Time). "Quit" closes the window.
 */
type Tab = 'cpu' | 'memory' | 'energy' | 'network';
interface Sample {
  fps: number;
  load: number;
  heap: number | null;
}

const firstSeen = new Map<AppId, number>();

export default function ActivityApp(_: AppProps) {
  const wm = useWM();
  const st = useScreenTime();
  const [tab, setTab] = useState<Tab>('cpu');
  const [sel, setSel] = useState<AppId | null>(null);
  const [hist, setHist] = useState<Sample[]>([]);
  const [, force] = useState(0);
  const frames = useRef<number[]>([]);

  // frame timing → fps + "load" (share of frames that took longer than 1.5× the ideal frame)
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (t: number) => {
      frames.current.push(t - last);
      last = t;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    const iv = window.setInterval(() => {
      const f = frames.current.splice(0);
      if (!f.length) return;
      const avg = f.reduce((a, b) => a + b, 0) / f.length;
      const ideal = Math.min(...f.filter((x) => x > 2), 16.7);
      const slow = f.filter((x) => x > ideal * 1.5).length / f.length;
      const mem = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;
      setHist((h) => [...h.slice(-59), { fps: Math.round(1000 / avg), load: Math.min(100, Math.round(slow * 100)), heap: mem ? mem.usedJSHeapSize : null }]);
      force((x) => x + 1);
    }, 1000);
    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(iv);
    };
  }, []);

  wm.windows.forEach((w) => !firstSeen.has(w.id) && firstSeen.set(w.id, Date.now()));
  const procs = wm.windows.map((w) => {
    const el = document.querySelector(`[data-win-id="${w.id}"]`);
    const nodes = el ? el.getElementsByTagName('*').length : 0;
    return { id: w.id, nodes, since: firstSeen.get(w.id) ?? Date.now(), focus: st.perApp[w.id] ?? 0, state: w.phase === 'minimized' ? 'Minimized' : wm.focusedId === w.id ? 'Active' : 'Background' };
  });
  const totalNodes = document.getElementsByTagName('*').length;
  const res = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
  const bytes = res.reduce((a, r) => a + (r.transferSize || 0), 0);
  const cur = hist[hist.length - 1];
  const fmtB = (b: number) => (b > 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.round(b / 1e3)} KB`);

  const cols =
    tab === 'cpu'
      ? ['Process Name', 'Status', 'Focused today', 'Open for']
      : tab === 'memory'
        ? ['Process Name', 'DOM nodes', 'Share of page', 'Status']
        : tab === 'energy'
          ? ['Process Name', 'Status', 'Energy (est.)', 'App Nap']
          : ['Process Name', 'Status', 'Open for', ''];

  return (
    <div className="am">
      <div className="am-bar">
        <button type="button" className="am-quit" disabled={!sel} onClick={() => sel && (wm.close(sel), setSel(null))} title="Quit the selected process">
          ⊗ Quit
        </button>
        <div className="am-tabs" role="tablist">
          {(['cpu', 'memory', 'energy', 'network'] as Tab[]).map((t) => (
            <button key={t} type="button" role="tab" aria-selected={tab === t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>
              {t === 'cpu' ? 'CPU' : t[0].toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>
      <div className="am-table">
        <div className="am-row am-head">
          {cols.map((c) => (
            <span key={c}>{c}</span>
          ))}
        </div>
        <div className="am-body">
          {procs.map((p) => (
            <button key={p.id} type="button" className={`am-row ${sel === p.id ? 'sel' : ''}`} onClick={() => setSel(p.id)} onDoubleClick={() => wm.open(p.id)}>
              <span className="am-name">
                <AppIcon name={APPS[p.id].icon} className="am-ico" />
                {APPS[p.id].title}
              </span>
              {tab === 'cpu' && (
                <>
                  <span>{p.state}</span>
                  <span>{fmtDuration(p.focus)}</span>
                  <span>{fmtDuration(Date.now() - p.since)}</span>
                </>
              )}
              {tab === 'memory' && (
                <>
                  <span>{p.nodes.toLocaleString()}</span>
                  <span>{totalNodes ? `${((p.nodes / totalNodes) * 100).toFixed(1)}%` : '—'}</span>
                  <span>{p.state}</span>
                </>
              )}
              {tab === 'energy' && (
                <>
                  <span>{p.state}</span>
                  <span>{p.state === 'Active' ? 'Normal' : p.state === 'Minimized' ? 'Very low' : 'Low'}</span>
                  <span>{p.state === 'Minimized' ? 'Yes' : 'No'}</span>
                </>
              )}
              {tab === 'network' && (
                <>
                  <span>{p.state}</span>
                  <span>{fmtDuration(Date.now() - p.since)}</span>
                  <span />
                </>
              )}
            </button>
          ))}
          {!procs.length && <p className="am-empty">No apps are open.</p>}
        </div>
      </div>
      <div className="am-foot">
        {tab === 'cpu' && (
          <>
            <div className="am-stats">
              <span>
                Frame rate <b>{cur ? `${cur.fps} fps` : '…'}</b>
              </span>
              <span>
                Main-thread load <b>{cur ? `${cur.load}%` : '…'}</b>
              </span>
              <span>
                Cores <b>{navigator.hardwareConcurrency || '—'}</b>
              </span>
              <span>
                Windows <b>{procs.length}</b>
              </span>
            </div>
            <Graph values={hist.map((h) => h.load)} max={100} label="CPU LOAD" color="#30d158" />
          </>
        )}
        {tab === 'memory' && (
          <>
            <div className="am-stats">
              <span>
                JS heap <b>{cur?.heap ? fmtB(cur.heap) : 'Not reported'}</b>
              </span>
              <span>
                DOM nodes <b>{totalNodes.toLocaleString()}</b>
              </span>
              <span>
                Device memory <b>{(navigator as Navigator & { deviceMemory?: number }).deviceMemory ? `≥ ${(navigator as Navigator & { deviceMemory?: number }).deviceMemory} GB` : '—'}</b>
              </span>
            </div>
            <Graph values={hist.map((h) => (h.heap ? h.heap / 1e6 : 0))} max={Math.max(50, ...hist.map((h) => (h.heap ? h.heap / 1e6 : 0)))} label="MEMORY (MB)" color="#ff9f0a" />
          </>
        )}
        {tab === 'energy' && (
          <>
            <div className="am-stats">
              <span>
                Frame rate <b>{cur ? `${cur.fps} fps` : '…'}</b>
              </span>
              <span>
                Low Power Mode <b>{document.documentElement.dataset.lowpowerActive === 'on' ? 'On' : 'Off'}</b>
              </span>
            </div>
            <Graph values={hist.map((h) => h.fps)} max={Math.max(60, ...hist.map((h) => h.fps))} label="FRAMES PER SECOND" color="#0a84ff" />
          </>
        )}
        {tab === 'network' && (
          <>
            <div className="am-stats">
              <span>
                Data received <b>{fmtB(bytes)}</b>
              </span>
              <span>
                Requests <b>{res.length}</b>
              </span>
              <span>
                Connection <b>{(navigator as Navigator & { connection?: { effectiveType?: string } }).connection?.effectiveType?.toUpperCase() ?? (navigator.onLine ? 'Online' : 'Offline')}</b>
              </span>
            </div>
            <Graph values={hist.map((h) => h.fps)} max={Math.max(60, ...hist.map((h) => h.fps))} label="ACTIVITY" color="#bf5af2" />
          </>
        )}
      </div>
    </div>
  );
}

function Graph({ values, max, label, color }: { values: number[]; max: number; label: string; color: string }) {
  const w = 300;
  const h = 60;
  const pts = values.map((v, i) => `${(i / 59) * w},${h - (Math.min(v, max) / max) * h}`).join(' ');
  return (
    <div className="am-graph">
      <small>{label}</small>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
        {values.length > 1 && (
          <>
            <polygon points={`0,${h} ${pts} ${((values.length - 1) / 59) * w},${h}`} fill={color} opacity="0.25" />
            <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" />
          </>
        )}
      </svg>
    </div>
  );
}
