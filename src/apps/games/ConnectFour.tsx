import { useState } from 'react';
import { Overlay, tone, type GameProps } from './core';

const W = 7;
const H = 6;
type B = (0 | 1 | 2)[];
function win(b: B, p: 1 | 2): number[] | null {
  const at = (x: number, y: number) => (x >= 0 && y >= 0 && x < W && y < H ? b[y * W + x] : 0);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++)
      for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [1, -1]]) {
        const cells = [0, 1, 2, 3].map((k) => [x + dx * k, y + dy * k]);
        if (cells.every(([cx, cy]) => at(cx, cy) === p)) return cells.map(([cx, cy]) => cy * W + cx);
      }
  return null;
}
const drop = (b: B, col: number, p: 1 | 2): B | null => {
  for (let y = H - 1; y >= 0; y--)
    if (!b[y * W + col]) {
      const n = b.slice() as B;
      n[y * W + col] = p;
      return n;
    }
  return null;
};
function score(b: B): number {
  if (win(b, 2)) return 1000;
  if (win(b, 1)) return -1000;
  let s = 0;
  for (let y = 0; y < H; y++) s += (b[y * W + 3] === 2 ? 3 : b[y * W + 3] === 1 ? -3 : 0);
  return s;
}
function search(b: B, depth: number, p: 1 | 2): number {
  const s = score(b);
  if (depth === 0 || Math.abs(s) >= 1000) return s * (depth + 1);
  let best = p === 2 ? -Infinity : Infinity;
  for (let c = 0; c < W; c++) {
    const n = drop(b, c, p);
    if (!n) continue;
    const v = search(n, depth - 1, p === 2 ? 1 : 2);
    best = p === 2 ? Math.max(best, v) : Math.min(best, v);
  }
  return best === Infinity || best === -Infinity ? 0 : best;
}
function aiMove(b: B): number {
  let best = -Infinity;
  let col = 3;
  [3, 2, 4, 1, 5, 0, 6].forEach((c) => {
    const n = drop(b, c, 2);
    if (!n) return;
    const v = search(n, 3, 1);
    if (v > best) {
      best = v;
      col = c;
    }
  });
  return col;
}

export default function ConnectFour({ api }: GameProps) {
  const [b, setB] = useState<B>(Array(W * H).fill(0) as B);
  const [end, setEnd] = useState<{ who: 0 | 1 | 2; line: number[] } | null>(null);
  const [hover, setHover] = useState<number | null>(null);

  const play = (col: number) => {
    if (end) return;
    const n = drop(b, col, 1);
    if (!n) return;
    tone(440, 80);
    const w1 = win(n, 1);
    if (w1) {
      setB(n);
      setEnd({ who: 1, line: w1 });
      api.achieve('c4-win');
      api.finish(3, { win: true });
      return;
    }
    if (n.every(Boolean)) {
      setB(n);
      setEnd({ who: 0, line: [] });
      api.finish(1);
      return;
    }
    const n2 = drop(n, aiMove(n), 2)!;
    const w2 = win(n2, 2);
    setB(n2);
    if (w2) {
      setEnd({ who: 2, line: w2 });
      api.finish(0);
    } else if (n2.every(Boolean)) setEnd({ who: 0, line: [] });
  };

  return (
    <div className="gm-c4">
      <div className="gm-c4-board" onPointerLeave={() => setHover(null)}>
        {Array.from({ length: W * H }, (_, i) => (
          <button key={i} type="button" className={`gm-c4-cell ${hover === i % W ? 'hov' : ''}`} onClick={() => play(i % W)} onPointerEnter={() => setHover(i % W)} aria-label={`Column ${(i % W) + 1}`}>
            <span className={`gm-c4-disc p${b[i]} ${end?.line.includes(i) ? 'win' : ''}`} />
          </button>
        ))}
        {end && (
          <Overlay title={end.who === 1 ? 'You win!' : end.who === 2 ? 'Computer wins' : 'Draw'} tone={end.who === 1 ? 'win' : 'lose'}>
            <button type="button" className="btn btn-primary" onClick={() => { setB(Array(W * H).fill(0) as B); setEnd(null); }}>Play again</button>
          </Overlay>
        )}
      </div>
      <p className="gm-hint">You are red. Click a column to drop a disc — get four in a row.</p>
    </div>
  );
}
