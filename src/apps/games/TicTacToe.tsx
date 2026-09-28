import { useState } from 'react';
import { Overlay, tone, type GameProps } from './core';

type C = 'X' | 'O' | null;
const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
const winner = (b: C[]) => {
  for (const [a, c, d] of LINES) if (b[a] && b[a] === b[c] && b[a] === b[d]) return { p: b[a], line: [a, c, d] };
  return b.every(Boolean) ? { p: 'draw' as const, line: [] as number[] } : null;
};
function minimax(b: C[], me: 'O' | 'X'): { s: number; i: number } {
  const w = winner(b);
  if (w) return { s: w.p === 'O' ? 10 : w.p === 'X' ? -10 : 0, i: -1 };
  let best = { s: me === 'O' ? -99 : 99, i: -1 };
  b.forEach((v, i) => {
    if (v) return;
    b[i] = me;
    const r = minimax(b, me === 'O' ? 'X' : 'O');
    b[i] = null;
    if (me === 'O' ? r.s > best.s : r.s < best.s) best = { s: r.s, i };
  });
  return best;
}

export default function TicTacToe({ api }: GameProps) {
  const [b, setB] = useState<C[]>(Array(9).fill(null));
  const [mode, setMode] = useState<'ai' | 'pvp'>('ai');
  const [turn, setTurn] = useState<'X' | 'O'>('X');
  const [tally, setTally] = useState({ x: 0, o: 0, d: 0 });
  const w = winner(b);

  const end = (nb: C[]) => {
    const r = winner(nb);
    if (!r) return;
    setTally((t) => ({ x: t.x + (r.p === 'X' ? 1 : 0), o: t.o + (r.p === 'O' ? 1 : 0), d: t.d + (r.p === 'draw' ? 1 : 0) }));
    if (mode === 'ai') {
      if (r.p === 'draw') api.achieve('ttt-draw');
      api.finish(r.p === 'X' ? 3 : r.p === 'draw' ? 1 : 0, { win: r.p === 'X' });
    }
    tone(r.p === 'draw' ? 330 : 660, 260);
  };
  const play = (i: number) => {
    if (b[i] || w) return;
    const nb = b.slice();
    nb[i] = turn;
    tone(turn === 'X' ? 520 : 440, 80);
    if (mode === 'pvp' || winner(nb)) {
      setB(nb);
      setTurn(turn === 'X' ? 'O' : 'X');
      end(nb);
      return;
    }
    const ai = minimax(nb.slice(), 'O').i;
    if (ai >= 0) nb[ai] = 'O';
    setB(nb);
    end(nb);
  };
  const reset = (m = mode) => {
    setMode(m);
    setB(Array(9).fill(null));
    setTurn('X');
  };

  return (
    <div className="gm-ttt">
      <div className="gm-toolbar">
        <button type="button" className={`btn ${mode === 'ai' ? 'btn-primary' : ''}`} onClick={() => reset('ai')}>vs Computer</button>
        <button type="button" className={`btn ${mode === 'pvp' ? 'btn-primary' : ''}`} onClick={() => reset('pvp')}>2 Players</button>
      </div>
      <p className="gm-hint">X {tally.x} · O {tally.o} · Draws {tally.d}{mode === 'pvp' && !w ? ` · ${turn} to play` : ''}</p>
      <div className="gm-ttt-board">
        {b.map((v, i) => (
          <button key={i} type="button" className={`gm-ttt-cell ${v ?? ''} ${w?.line.includes(i) ? 'win' : ''}`} onClick={() => play(i)} aria-label={`Cell ${i + 1}${v ? `, ${v}` : ''}`}>
            {v}
          </button>
        ))}
        {w && (
          <Overlay title={w.p === 'draw' ? 'Draw!' : `${w.p} wins!`} tone={w.p === 'X' || mode === 'pvp' ? 'win' : 'lose'} sub={mode === 'ai' && w.p === 'draw' ? 'The computer never loses — a draw is the best you can do.' : undefined}>
            <button type="button" className="btn btn-primary" onClick={() => reset()}>Play again</button>
          </Overlay>
        )}
      </div>
    </div>
  );
}
