import { useState } from 'react';
import { Overlay, fmtSecs, shuffle, useKeys, useTicker, type GameProps } from './core';

type Diff = 'Easy' | 'Medium' | 'Hard';
const HOLES: Record<Diff, number> = { Easy: 40, Medium: 50, Hard: 58 };
let lastDiff: Diff = 'Easy';

function ok(g: number[], i: number, v: number): boolean {
  const r = Math.floor(i / 9);
  const c = i % 9;
  for (let k = 0; k < 9; k++) {
    if (g[r * 9 + k] === v || g[k * 9 + c] === v) return false;
  }
  const br = r - (r % 3);
  const bc = c - (c % 3);
  for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) if (g[(br + y) * 9 + bc + x] === v) return false;
  return true;
}

function fill(g: number[]): boolean {
  const i = g.indexOf(0);
  if (i < 0) return true;
  for (const v of shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9])) {
    if (ok(g, i, v)) {
      g[i] = v;
      if (fill(g)) return true;
      g[i] = 0;
    }
  }
  return false;
}

/** Counts solutions up to `limit` (picks the most constrained empty cell first). */
function count(g: number[], limit = 2): number {
  let best = -1;
  let bestOpts: number[] = [];
  for (let i = 0; i < 81; i++) {
    if (g[i]) continue;
    const opts: number[] = [];
    for (let v = 1; v <= 9; v++) if (ok(g, i, v)) opts.push(v);
    if (!opts.length) return 0;
    if (best < 0 || opts.length < bestOpts.length) {
      best = i;
      bestOpts = opts;
      if (opts.length === 1) break;
    }
  }
  if (best < 0) return 1;
  let n = 0;
  for (const v of bestOpts) {
    g[best] = v;
    n += count(g, limit - n);
    g[best] = 0;
    if (n >= limit) break;
  }
  return n;
}

function generate(diff: Diff): { puzzle: number[]; solution: number[] } {
  const solution = Array(81).fill(0) as number[];
  fill(solution);
  const puzzle = solution.slice();
  let holes = 0;
  for (const i of shuffle(Array.from({ length: 81 }, (_, k) => k))) {
    if (holes >= HOLES[diff]) break;
    const keep = puzzle[i];
    puzzle[i] = 0;
    if (count(puzzle.slice()) !== 1) puzzle[i] = keep;
    else holes++;
  }
  return { puzzle, solution };
}

export default function Sudoku({ api }: GameProps) {
  const [diff, setDiff] = useState<Diff>(lastDiff);
  const [game, setGame] = useState(() => generate(lastDiff));
  const [cells, setCells] = useState<number[]>(() => game.puzzle.slice());
  const [notes, setNotes] = useState<number[][]>(() => Array.from({ length: 81 }, () => []));
  const [sel, setSel] = useState(-1);
  const [noteMode, setNoteMode] = useState(false);
  const [secs, setSecs] = useState(0);
  const [state, setState] = useState<'play' | 'won' | 'solved'>('play');
  const [checked, setChecked] = useState(false);

  useTicker(state === 'play' && !api.paused, 1000, () => {
    setSecs(secs + 1);
    api.setScore(secs + 1);
  });

  const newGame = (d: Diff) => {
    lastDiff = d;
    const g = generate(d);
    setDiff(d);
    setGame(g);
    setCells(g.puzzle.slice());
    setNotes(Array.from({ length: 81 }, () => []));
    setSel(-1);
    setSecs(0);
    api.setScore(0);
    setState('play');
    setChecked(false);
  };

  const conflict = (i: number): boolean => {
    const v = cells[i];
    if (!v) return false;
    const r = Math.floor(i / 9);
    const c = i % 9;
    for (let k = 0; k < 81; k++) {
      if (k === i || cells[k] !== v) continue;
      const kr = Math.floor(k / 9);
      const kc = k % 9;
      if (kr === r || kc === c || (Math.floor(kr / 3) === Math.floor(r / 3) && Math.floor(kc / 3) === Math.floor(c / 3))) return true;
    }
    return false;
  };

  const put = (v: number) => {
    if (sel < 0 || state !== 'play' || game.puzzle[sel]) return;
    setChecked(false);
    if (noteMode && v) {
      setNotes((ns) => ns.map((n, i) => (i === sel ? (n.includes(v) ? n.filter((x) => x !== v) : [...n, v].sort()) : n)));
      return;
    }
    const next = cells.map((x, i) => (i === sel ? (x === v ? 0 : v) : x));
    setCells(next);
    if (v) setNotes((ns) => ns.map((n, i) => (i === sel ? [] : n)));
    if (next.every((x, i) => x === game.solution[i])) {
      setState('won');
      api.setScore(secs);
      api.finish(secs, { win: true, note: diff });
      api.achieve('sudoku-solve');
    }
  };

  useKeys(api.focused, (e) => {
    if (/^[1-9]$/.test(e.key)) put(Number(e.key));
    else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') put(0);
    else if (e.key === 'n' || e.key === 'N') setNoteMode((m) => !m);
    else if (e.key.startsWith('Arrow')) {
      e.preventDefault();
      const s = sel < 0 ? 40 : sel;
      const r = Math.floor(s / 9);
      const c = s % 9;
      const d = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[e.key] ?? [0, 0];
      setSel(((r + d[0] + 9) % 9) * 9 + ((c + d[1] + 9) % 9));
    }
  });

  const selV = sel >= 0 ? cells[sel] : 0;
  const peer = (i: number) => {
    if (sel < 0) return false;
    const r = Math.floor(i / 9), c = i % 9, sr = Math.floor(sel / 9), sc = sel % 9;
    return r === sr || c === sc || (Math.floor(r / 3) === Math.floor(sr / 3) && Math.floor(c / 3) === Math.floor(sc / 3));
  };
  const remaining = (v: number) => 9 - cells.filter((x) => x === v).length;

  return (
    <div className="gm-stage gm-sudoku">
      <div className="gm-toolbar">
        <div className="gm-seg" role="group" aria-label="Difficulty">
          {(['Easy', 'Medium', 'Hard'] as Diff[]).map((d) => (
            <button key={d} type="button" className={diff === d ? 'on' : ''} onClick={() => newGame(d)}>{d}</button>
          ))}
        </div>
        <span className="gm-chip" aria-label="Time">⏱ {fmtSecs(secs)}</span>
      </div>
      <div className="gm-sudoku-board" role="grid" aria-label="Sudoku board">
        {cells.map((v, i) => {
          const given = !!game.puzzle[i];
          const wrong = checked && v && v !== game.solution[i];
          const cls = [
            'gm-sd-cell',
            given ? 'given' : 'user',
            i === sel ? 'sel' : peer(i) ? 'peer' : '',
            selV && v === selV ? 'same' : '',
            conflict(i) || wrong ? 'bad' : '',
            i % 9 === 2 || i % 9 === 5 ? 'br' : '',
            Math.floor(i / 9) === 2 || Math.floor(i / 9) === 5 ? 'bb' : '',
          ].join(' ');
          return (
            <button key={i} type="button" className={cls} onClick={() => setSel(i)} aria-label={`Row ${Math.floor(i / 9) + 1} column ${(i % 9) + 1}${v ? `, ${v}` : ', empty'}`}>
              {v ? v : notes[i].length ? (
                <span className="gm-sd-notes">{[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => <i key={n}>{notes[i].includes(n) ? n : ''}</i>)}</span>
              ) : ''}
            </button>
          );
        })}
        {state === 'won' && (
          <Overlay title="Solved!" sub={`${diff} puzzle in ${fmtSecs(secs)}.`} tone="win">
            <button type="button" className="btn btn-primary" onClick={() => newGame(diff)}>New puzzle</button>
          </Overlay>
        )}
      </div>
      <div className="gm-sd-pad">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <button key={n} type="button" onClick={() => put(n)} disabled={state !== 'play'} aria-label={`Enter ${n}`}>
            {n}<small>{remaining(n)}</small>
          </button>
        ))}
      </div>
      <div className="gm-toolbar">
        <button type="button" className="btn" onClick={() => put(0)} disabled={state !== 'play'}>Erase</button>
        <button type="button" className={`btn ${noteMode ? 'btn-primary' : ''}`} aria-pressed={noteMode} onClick={() => setNoteMode((m) => !m)}>Notes {noteMode ? 'on' : 'off'}</button>
        <button type="button" className="btn" onClick={() => setChecked(true)} disabled={state !== 'play'}>Check</button>
        <button type="button" className="btn" onClick={() => { setCells(game.solution.slice()); setState('solved'); }} disabled={state !== 'play'}>Solve</button>
      </div>
      {state === 'solved' && <p className="gm-hint">Solved for you — no score recorded. Pick a difficulty for a new puzzle.</p>}
      {checked && state === 'play' && <p className="gm-hint">{cells.some((v, i) => v && v !== game.solution[i]) ? 'Mistakes are shown in red.' : 'Everything so far is correct.'}</p>}
    </div>
  );
}
