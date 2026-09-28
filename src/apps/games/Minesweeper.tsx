import { useRef, useState } from 'react';
import { Overlay, tone, useTicker, fmtSecs, type GameProps } from './core';

const LEVELS = { Easy: [9, 9, 10], Medium: [12, 12, 24], Hard: [16, 16, 40] } as const;
type Level = keyof typeof LEVELS;
interface Cell {
  mine: boolean;
  n: number;
  open: boolean;
  flag: boolean;
}

function build(w: number, h: number, mines: number, safe: number): Cell[] {
  const c: Cell[] = Array.from({ length: w * h }, () => ({ mine: false, n: 0, open: false, flag: false }));
  const sx = safe % w;
  const sy = Math.floor(safe / w);
  let placed = 0;
  while (placed < mines) {
    const i = Math.floor(Math.random() * w * h);
    const x = i % w;
    const y = Math.floor(i / w);
    if (c[i].mine || (Math.abs(x - sx) <= 1 && Math.abs(y - sy) <= 1)) continue;
    c[i].mine = true;
    placed++;
  }
  c.forEach((cell, i) => {
    const x = i % w;
    const y = Math.floor(i / w);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < w && ny < h && c[ny * w + nx].mine) cell.n++;
    }
  });
  return c;
}

export default function Minesweeper({ api }: GameProps) {
  const [level, setLevel] = useState<Level>('Easy');
  const [w, h, mines] = LEVELS[level];
  const [cells, setCells] = useState<Cell[] | null>(null);
  const [state, setState] = useState<'play' | 'won' | 'lost'>('play');
  const [secs, setSecs] = useState(0);
  const [flagMode, setFlagMode] = useState(false);
  const press = useRef<number>(0);
  useTicker(!!cells && state === 'play' && !api.paused, 1000, () => setSecs((s) => s + 1));

  const reset = (l: Level = level) => {
    setLevel(l);
    setCells(null);
    setState('play');
    setSecs(0);
  };
  const reveal = (i: number) => {
    if (state !== 'play') return;
    let c = cells ?? build(w, h, mines, i);
    if (c[i].flag || c[i].open) return;
    c = c.map((x) => ({ ...x }));
    if (c[i].mine) {
      c.forEach((x) => x.mine && (x.open = true));
      setCells(c);
      setState('lost');
      tone(120, 400, 'sawtooth');
      api.finish(0);
      return;
    }
    const stack = [i];
    while (stack.length) {
      const k = stack.pop()!;
      if (c[k].open || c[k].flag) continue;
      c[k].open = true;
      if (c[k].n === 0) {
        const x = k % w;
        const y = Math.floor(k / w);
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && ny >= 0 && nx < w && ny < h) stack.push(ny * w + nx);
        }
      }
    }
    tone(700, 30);
    setCells(c);
    if (c.every((x) => x.mine || x.open)) {
      setState('won');
      api.achieve('mines-clear');
      api.finish(Math.max(1, secs), { win: true, note: level });
    }
  };
  const flag = (i: number) => {
    if (!cells || state !== 'play' || cells[i].open) return;
    setCells(cells.map((x, k) => (k === i ? { ...x, flag: !x.flag } : x)));
    tone(900, 40);
  };
  const flags = cells?.filter((c) => c.flag).length ?? 0;
  const COLORS = ['', '#0a84ff', '#34c759', '#ff453a', '#5e5ce6', '#ff9f0a', '#30b0c7', '#1d1d1f', '#8e8e93'];

  return (
    <div className="gm-ms">
      <div className="gm-toolbar">
        {(Object.keys(LEVELS) as Level[]).map((l) => (
          <button key={l} type="button" className={`btn ${l === level ? 'btn-primary' : ''}`} onClick={() => reset(l)}>{l}</button>
        ))}
        <button type="button" className={`btn ${flagMode ? 'btn-primary' : ''}`} onClick={() => setFlagMode((f) => !f)} aria-pressed={flagMode}>🚩 Flag mode</button>
        <span className="gm-hint">💣 {mines - flags} · ⏱ {fmtSecs(secs)}</span>
      </div>
      <div className="gm-ms-board" style={{ gridTemplateColumns: `repeat(${w}, 1fr)`, aspectRatio: `${w} / ${h}` }}>
        {Array.from({ length: w * h }, (_, i) => {
          const c = cells?.[i];
          return (
            <button
              key={i}
              type="button"
              className={`gm-ms-cell ${c?.open ? 'open' : ''} ${c?.open && c.mine ? 'boom' : ''}`}
              style={{ color: c?.open ? COLORS[c.n] : undefined }}
              onClick={() => (flagMode ? flag(i) : reveal(i))}
              onContextMenu={(e) => {
                e.preventDefault();
                flag(i);
              }}
              onPointerDown={(e) => {
                if (e.pointerType !== 'touch') return;
                press.current = window.setTimeout(() => {
                  flag(i);
                  press.current = -1;
                }, 450);
              }}
              onPointerUp={() => press.current > 0 && window.clearTimeout(press.current)}
              aria-label={`Cell ${i + 1}`}
            >
              {c?.open ? (c.mine ? '💣' : c.n || '') : c?.flag ? '🚩' : ''}
            </button>
          );
        })}
        {state !== 'play' && (
          <Overlay title={state === 'won' ? 'Field cleared!' : 'Boom!'} sub={state === 'won' ? `${level} in ${fmtSecs(secs)}.` : 'You hit a mine.'} tone={state === 'won' ? 'win' : 'lose'}>
            <button type="button" className="btn btn-primary" onClick={() => reset()}>Play again</button>
          </Overlay>
        )}
      </div>
      <p className="gm-hint">Right-click, long-press or use Flag mode to flag. Your first click is always safe.</p>
    </div>
  );
}
