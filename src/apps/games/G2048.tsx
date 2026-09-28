import { useEffect, useRef, useState } from 'react';
import { Overlay, keyDir, rand, useKeys, useSwipe, type Dir, type GameProps } from './core';

interface Tile {
  id: number;
  v: number;
  r: number;
  c: number;
  dead?: boolean;
  pop?: boolean;
  fresh?: boolean;
}

let nextId = 1;

function spawn(tiles: Tile[]): Tile[] {
  const live = tiles.filter((t) => !t.dead);
  const free: [number, number][] = [];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) if (!live.some((t) => t.r === r && t.c === c)) free.push([r, c]);
  if (!free.length) return tiles;
  const [r, c] = free[rand(free.length)];
  return [...tiles, { id: nextId++, v: Math.random() < 0.9 ? 2 : 4, r, c, fresh: true }];
}

function slide(tiles: Tile[], dir: Dir): { tiles: Tile[]; gained: number; moved: boolean } {
  const live = tiles.filter((t) => !t.dead).map((t) => ({ ...t, pop: false, fresh: false }));
  let gained = 0;
  let moved = false;
  const out: Tile[] = [];
  for (let line = 0; line < 4; line++) {
    const cells = live
      .filter((t) => (dir === 'left' || dir === 'right' ? t.r === line : t.c === line))
      .sort((a, b) => {
        const ka = dir === 'left' || dir === 'right' ? a.c : a.r;
        const kb = dir === 'left' || dir === 'right' ? b.c : b.r;
        return dir === 'left' || dir === 'up' ? ka - kb : kb - ka;
      });
    const placed: Tile[] = [];
    let mergedLast = false;
    for (const t of cells) {
      const prev = placed[placed.length - 1];
      if (prev && !mergedLast && prev.v === t.v) {
        prev.v *= 2;
        prev.pop = true;
        gained += prev.v;
        mergedLast = true;
        const dead = { ...t, dead: true, r: prev.r, c: prev.c };
        out.push(dead);
        moved = true;
        continue;
      }
      mergedLast = false;
      const idx = placed.length;
      const pos = dir === 'left' || dir === 'up' ? idx : 3 - idx;
      const nt = { ...t };
      if (dir === 'left' || dir === 'right') nt.c = pos;
      else nt.r = pos;
      if (nt.r !== t.r || nt.c !== t.c) moved = true;
      placed.push(nt);
    }
    out.push(...placed);
  }
  return { tiles: out, gained, moved };
}

function canMove(tiles: Tile[]): boolean {
  const live = tiles.filter((t) => !t.dead);
  if (live.length < 16) return true;
  const at = (r: number, c: number) => live.find((t) => t.r === r && t.c === c)?.v;
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) if (at(r, c) === at(r, c + 1) || at(r, c) === at(r + 1, c)) return true;
  return false;
}

export default function G2048({ api }: GameProps) {
  const [tiles, setTiles] = useState<Tile[]>(() => spawn(spawn([])));
  const [score, setScore] = useState(0);
  const [over, setOver] = useState(false);
  const [won, setWon] = useState<'no' | 'show' | 'kept'>('no');
  const boardRef = useRef<HTMLDivElement>(null);

  // remove merged-away tiles after the slide animation
  useEffect(() => {
    if (!tiles.some((t) => t.dead)) return;
    const id = window.setTimeout(() => setTiles((ts) => ts.filter((t) => !t.dead)), 130);
    return () => window.clearTimeout(id);
  }, [tiles]);

  const move = (d: Dir) => {
    if (over || won === 'show') return;
    const res = slide(tiles, d);
    if (!res.moved) return;
    const next = spawn(res.tiles);
    const s = score + res.gained;
    setTiles(next);
    setScore(s);
    api.setScore(s);
    if (s >= 1000) api.achieve('2048-1000');
    if (won === 'no' && next.some((t) => t.v >= 2048 && !t.dead)) {
      setWon('show');
      api.achieve('2048-tile');
      api.finish(s, { win: true });
    }
    if (!canMove(next)) {
      setOver(true);
      api.finish(s);
    }
  };

  useKeys(api.focused, (e) => {
    const d = keyDir(e.key);
    if (d) {
      e.preventDefault();
      move(d);
    }
  });
  useSwipe(boardRef, move);

  return (
    <div className="gm-stage gm-2048">
      <div className="gm-2048-board" ref={boardRef} aria-label={`2048 board, score ${score}`}>
        {Array.from({ length: 16 }, (_, i) => (
          <div key={i} className="gm-2048-cell" style={{ ['--r' as string]: Math.floor(i / 4), ['--c' as string]: i % 4 }} />
        ))}
        {tiles.map((t) => (
          <div
            key={t.id}
            className={`gm-2048-tile v${Math.min(t.v, 4096)} ${t.pop ? 'pop' : ''} ${t.fresh ? 'fresh' : ''} ${t.dead ? 'dead' : ''}`}
            style={{ ['--r' as string]: t.r, ['--c' as string]: t.c }}
          >
            <span>{t.v}</span>
          </div>
        ))}
        {won === 'show' && (
          <Overlay title="You made 2048!" sub={`Score ${score}. Keep going for a higher score?`} tone="win">
            <button type="button" className="btn btn-primary" onClick={() => setWon('kept')}>Keep going</button>
            <button type="button" className="btn" onClick={api.restart}>New game</button>
          </Overlay>
        )}
        {over && (
          <Overlay title="No more moves" sub={`Final score ${score}.`} tone="lose">
            <button type="button" className="btn btn-primary" onClick={api.restart}>Try again</button>
          </Overlay>
        )}
      </div>
      <p className="gm-hint">Arrow keys, WASD or swipe on the board.</p>
    </div>
  );
}
