import { useEffect, useMemo, useState } from 'react';
import { playTick } from '../system/sounds';
import type { AppProps } from '../components/Desktop';

/* ── a compact, complete chess engine: legal moves (check, castling, en passant, promotion) + a small search ── */
type Piece = 'P' | 'N' | 'B' | 'R' | 'Q' | 'K' | 'p' | 'n' | 'b' | 'r' | 'q' | 'k' | null;
interface Pos {
  b: Piece[];
  white: boolean;
  castle: string;
  ep: number;
}
interface Move {
  from: number;
  to: number;
  promo?: Piece;
  castle?: boolean;
  ep?: boolean;
}

const START = 'rnbqkbnrpppppppp' + '.'.repeat(32) + 'PPPPPPPPRNBQKBNR';
const init = (): Pos => ({ b: [...START].map((c) => (c === '.' ? null : (c as Piece))), white: true, castle: 'KQkq', ep: -1 });
const isW = (p: Piece) => !!p && p === p.toUpperCase();
const VAL: Record<string, number> = { p: 100, n: 310, b: 330, r: 500, q: 900, k: 0 };
const GLYPH: Record<string, string> = { K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙', k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
const rc = (i: number) => [i >> 3, i & 7];
const on = (r: number, c: number) => r >= 0 && r < 8 && c >= 0 && c < 8;

function attacked(b: Piece[], sq: number, byWhite: boolean): boolean {
  const [r, c] = rc(sq);
  const own = (p: Piece, t: string) => p === (byWhite ? t.toUpperCase() : t) as Piece;
  const pr = byWhite ? r + 1 : r - 1;
  for (const dc of [-1, 1]) if (on(pr, c + dc) && own(b[pr * 8 + c + dc], 'p')) return true;
  for (const [dr, dc] of [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]]) if (on(r + dr, c + dc) && own(b[(r + dr) * 8 + c + dc], 'n')) return true;
  for (const [dr, dc] of [[1, 1], [1, -1], [-1, 1], [-1, -1], [0, 1], [0, -1], [1, 0], [-1, 0]]) {
    if (on(r + dr, c + dc) && own(b[(r + dr) * 8 + c + dc], 'k')) return true;
    let y = r + dr;
    let x = c + dc;
    while (on(y, x)) {
      const p = b[y * 8 + x];
      if (p) {
        const diag = dr && dc;
        if (own(p, 'q') || (diag ? own(p, 'b') : own(p, 'r'))) return true;
        break;
      }
      y += dr;
      x += dc;
    }
  }
  return false;
}

function pseudo(pos: Pos): Move[] {
  const { b, white } = pos;
  const out: Move[] = [];
  for (let i = 0; i < 64; i++) {
    const p = b[i];
    if (!p || isW(p) !== white) continue;
    const [r, c] = rc(i);
    const t = p.toLowerCase();
    const push = (to: number) => {
      const q = b[to];
      if (q && isW(q) === white) return false;
      out.push({ from: i, to });
      return !q;
    };
    if (t === 'p') {
      const d = white ? -1 : 1;
      const last = white ? 0 : 7;
      const add = (to: number, ep = false) => {
        if (to >> 3 === last) out.push({ from: i, to, promo: (white ? 'Q' : 'q') as Piece });
        else out.push({ from: i, to, ep });
      };
      if (on(r + d, c) && !b[(r + d) * 8 + c]) {
        add((r + d) * 8 + c);
        if (r === (white ? 6 : 1) && !b[(r + 2 * d) * 8 + c]) out.push({ from: i, to: (r + 2 * d) * 8 + c });
      }
      for (const dc of [-1, 1]) {
        if (!on(r + d, c + dc)) continue;
        const to = (r + d) * 8 + c + dc;
        if (b[to] && isW(b[to]) !== white) add(to);
        else if (to === pos.ep) add(to, true);
      }
    } else if (t === 'n') {
      for (const [dr, dc] of [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]]) if (on(r + dr, c + dc)) push((r + dr) * 8 + c + dc);
    } else if (t === 'k') {
      for (const [dr, dc] of [[1, 1], [1, -1], [-1, 1], [-1, -1], [0, 1], [0, -1], [1, 0], [-1, 0]]) if (on(r + dr, c + dc)) push((r + dr) * 8 + c + dc);
      const home = white ? 60 : 4;
      if (i === home && !attacked(b, i, !white)) {
        const k = white ? 'K' : 'k';
        const q = white ? 'Q' : 'q';
        if (pos.castle.includes(k) && !b[i + 1] && !b[i + 2] && !attacked(b, i + 1, !white)) out.push({ from: i, to: i + 2, castle: true });
        if (pos.castle.includes(q) && !b[i - 1] && !b[i - 2] && !b[i - 3] && !attacked(b, i - 1, !white)) out.push({ from: i, to: i - 2, castle: true });
      }
    } else {
      const dirs = t === 'b' ? [[1, 1], [1, -1], [-1, 1], [-1, -1]] : t === 'r' ? [[0, 1], [0, -1], [1, 0], [-1, 0]] : [[1, 1], [1, -1], [-1, 1], [-1, -1], [0, 1], [0, -1], [1, 0], [-1, 0]];
      for (const [dr, dc] of dirs) {
        let y = r + dr;
        let x = c + dc;
        while (on(y, x) && push(y * 8 + x)) {
          y += dr;
          x += dc;
        }
      }
    }
  }
  return out;
}

function apply(pos: Pos, m: Move): Pos {
  const b = [...pos.b];
  const p = b[m.from];
  b[m.to] = m.promo ?? p;
  b[m.from] = null;
  if (m.ep) b[m.to + (pos.white ? 8 : -8)] = null;
  if (m.castle) {
    if (m.to > m.from) {
      b[m.from + 1] = b[m.from + 3];
      b[m.from + 3] = null;
    } else {
      b[m.from - 1] = b[m.from - 4];
      b[m.from - 4] = null;
    }
  }
  let castle = pos.castle;
  const strip = (sq: number) => {
    if (sq === 60) castle = castle.replace(/[KQ]/g, '');
    if (sq === 4) castle = castle.replace(/[kq]/g, '');
    if (sq === 63) castle = castle.replace('K', '');
    if (sq === 56) castle = castle.replace('Q', '');
    if (sq === 7) castle = castle.replace('k', '');
    if (sq === 0) castle = castle.replace('q', '');
  };
  strip(m.from);
  strip(m.to);
  const ep = p && p.toLowerCase() === 'p' && Math.abs(m.to - m.from) === 16 ? (m.to + m.from) / 2 : -1;
  return { b, white: !pos.white, castle, ep };
}

function legal(pos: Pos): Move[] {
  return pseudo(pos).filter((m) => {
    const n = apply(pos, m);
    const k = n.b.findIndex((p) => p === (pos.white ? 'K' : 'k'));
    return k >= 0 && !attacked(n.b, k, !pos.white);
  });
}
const inCheck = (pos: Pos) => {
  const k = pos.b.findIndex((p) => p === (pos.white ? 'K' : 'k'));
  return k >= 0 && attacked(pos.b, k, !pos.white);
};
function evaluate(pos: Pos): number {
  let s = 0;
  pos.b.forEach((p, i) => {
    if (!p) return;
    const [r, c] = rc(i);
    const center = 3.5 - Math.max(Math.abs(3.5 - r), Math.abs(3.5 - c));
    const v = VAL[p.toLowerCase()] + (p.toLowerCase() === 'k' ? 0 : center * 6) + (p === 'P' ? (6 - r) * 4 : p === 'p' ? (r - 1) * 4 : 0);
    s += isW(p) ? v : -v;
  });
  return s;
}
function search(pos: Pos, depth: number, alpha: number, beta: number): number {
  const ms = legal(pos);
  if (!ms.length) return inCheck(pos) ? (pos.white ? -99999 : 99999) : 0;
  if (!depth) return evaluate(pos);
  if (pos.white) {
    let best = -Infinity;
    for (const m of ms) {
      best = Math.max(best, search(apply(pos, m), depth - 1, alpha, beta));
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break;
    }
    return best;
  }
  let best = Infinity;
  for (const m of ms) {
    best = Math.min(best, search(apply(pos, m), depth - 1, alpha, beta));
    beta = Math.min(beta, best);
    if (beta <= alpha) break;
  }
  return best;
}
function bestMove(pos: Pos, depth: number): Move | null {
  const ms = legal(pos).sort(() => Math.random() - 0.5);
  let best: Move | null = null;
  let score = pos.white ? -Infinity : Infinity;
  for (const m of ms) {
    const s = search(apply(pos, m), depth - 1, -Infinity, Infinity);
    if (pos.white ? s > score : s < score) {
      score = s;
      best = m;
    }
  }
  return best;
}

/** v10 — Chess (play White against the computer, or two players on one device). */
export default function ChessApp(_: AppProps) {
  const [hist, setHist] = useState<Pos[]>(() => [init()]);
  const [sel, setSel] = useState<number | null>(null);
  const [mode, setMode] = useState<'cpu' | 'two'>('cpu');
  const [level, setLevel] = useState(2);
  const [last, setLast] = useState<Move | null>(null);
  const [flip, setFlip] = useState(false);
  const pos = hist[hist.length - 1];
  const moves = useMemo(() => legal(pos), [pos]);
  const over = !moves.length;
  const check = inCheck(pos);
  const status = over ? (check ? `Checkmate — ${pos.white ? 'Black' : 'White'} wins` : 'Stalemate — draw') : check ? `${pos.white ? 'White' : 'Black'} is in check` : `${pos.white ? 'White' : 'Black'} to move`;

  const play = (m: Move) => {
    setHist((h) => [...h, apply(h[h.length - 1], m)]);
    setLast(m);
    setSel(null);
    playTick(0.5);
  };

  useEffect(() => {
    if (mode !== 'cpu' || pos.white || over) return;
    const t = window.setTimeout(() => {
      const m = bestMove(pos, level);
      if (m) play(m);
    }, 280);
    return () => window.clearTimeout(t);
  }, [pos, mode, level, over]);

  const click = (i: number) => {
    if (over || (mode === 'cpu' && !pos.white)) return;
    const p = pos.b[i];
    if (sel !== null) {
      const m = moves.find((x) => x.from === sel && x.to === i);
      if (m) return play(m);
    }
    setSel(p && isW(p) === pos.white ? i : null);
  };
  const targets = new Set(sel === null ? [] : moves.filter((m) => m.from === sel).map((m) => m.to));
  const undo = () => {
    setHist((h) => (h.length <= 1 ? h : h.slice(0, mode === 'cpu' ? Math.max(1, h.length - 2) : h.length - 1)));
    setSel(null);
    setLast(null);
  };
  const captured = (white: boolean) => {
    const count: Record<string, number> = { p: 8, n: 2, b: 2, r: 2, q: 1 };
    pos.b.forEach((p) => p && isW(p) === white && p.toLowerCase() !== 'k' && count[p.toLowerCase()]--);
    return Object.entries(count).flatMap(([k, n]) => Array(Math.max(0, n)).fill(GLYPH[white ? k.toUpperCase() : k]));
  };
  const order = Array.from({ length: 64 }, (_, i) => (flip ? 63 - i : i));

  return (
    <div className="chess10">
      <div className="chess10-top">
        <select value={mode} onChange={(e) => (setMode(e.target.value as 'cpu' | 'two'), setHist([init()]), setLast(null))} aria-label="Mode">
          <option value="cpu">vs Computer</option>
          <option value="two">Two players</option>
        </select>
        {mode === 'cpu' && (
          <select value={level} onChange={(e) => setLevel(Number(e.target.value))} aria-label="Level">
            <option value={1}>Easy</option>
            <option value={2}>Medium</option>
            <option value={3}>Hard</option>
          </select>
        )}
        <button type="button" onClick={undo} disabled={hist.length <= 1}>
          Undo
        </button>
        <button type="button" onClick={() => setFlip((f) => !f)}>
          Flip
        </button>
        <button type="button" onClick={() => (setHist([init()]), setLast(null), setSel(null))}>
          New Game
        </button>
      </div>
      <div className="chess10-cap">{captured(true).join('')}</div>
      <div className="chess10-board" role="grid" aria-label="Chess board">
        {order.map((i) => {
          const [r, c] = rc(i);
          const p = pos.b[i];
          const dark = (r + c) % 2 === 1;
          const isLast = last && (last.from === i || last.to === i);
          const kingCheck = check && p === (pos.white ? 'K' : 'k');
          return (
            <button
              key={i}
              type="button"
              role="gridcell"
              className={`chs-sq ${dark ? 'd' : 'l'} ${sel === i ? 'sel' : ''} ${isLast ? 'last' : ''} ${kingCheck ? 'chk' : ''}`}
              onClick={() => click(i)}
              aria-label={`${'abcdefgh'[c]}${8 - r}${p ? ` ${p}` : ''}`}
            >
              {p && <span className={`chs-pc ${isW(p) ? 'w' : 'b'}`}>{GLYPH[p]}</span>}
              {targets.has(i) && <i className={p ? 'cap' : 'dot'} />}
            </button>
          );
        })}
      </div>
      <div className="chess10-cap">{captured(false).join('')}</div>
      <div className={`chess10-status ${over ? 'over' : ''}`}>{status}</div>
    </div>
  );
}
