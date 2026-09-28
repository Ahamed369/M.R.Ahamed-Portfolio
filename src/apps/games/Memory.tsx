import { useEffect, useState } from 'react';
import { Overlay, shuffle, tone, useTicker, fmtSecs, type GameProps } from './core';

const EMOJI = ['⚛️', '🐍', '☕', '🐘', '🦀', '🐳', '🔥', '💎', '🚀', '🧠', '🎧', '🌈'];

export default function Memory({ api }: GameProps) {
  const [size, setSize] = useState<8 | 12>(8);
  const [cards, setCards] = useState(() => shuffle([...EMOJI.slice(0, 8), ...EMOJI.slice(0, 8)]));
  const [open, setOpen] = useState<number[]>([]);
  const [done, setDone] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [secs, setSecs] = useState(0);
  const won = done.length === cards.length;
  useTicker(!won && moves > 0 && !api.paused, 1000, () => setSecs((s) => s + 1));

  const deal = (n: 8 | 12) => {
    setSize(n);
    setCards(shuffle([...EMOJI.slice(0, n), ...EMOJI.slice(0, n)]));
    setOpen([]);
    setDone([]);
    setMoves(0);
    setSecs(0);
    api.setScore(0);
  };
  useEffect(() => {
    if (open.length !== 2) return;
    const [a, b] = open;
    const t = window.setTimeout(() => {
      if (cards[a] === cards[b]) {
        setDone((d) => [...d, a, b]);
        tone(784, 120);
      } else tone(220, 90, 'triangle');
      setOpen([]);
    }, 650);
    return () => window.clearTimeout(t);
  }, [open, cards]);
  useEffect(() => {
    if (!won) return;
    const score = Math.max(10, 1000 - moves * 20 - secs * 2);
    api.finish(score, { win: true });
    if (moves <= 14 && size === 8) api.achieve('memory-fast');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [won]);

  const flip = (i: number) => {
    if (open.length === 2 || open.includes(i) || done.includes(i)) return;
    const n = [...open, i];
    setOpen(n);
    tone(600, 50);
    if (n.length === 2) {
      setMoves((m) => m + 1);
      api.setScore(moves + 1);
    }
  };

  return (
    <div className="gm-mem">
      <div className="gm-toolbar">
        <button type="button" className={`btn ${size === 8 ? 'btn-primary' : ''}`} onClick={() => deal(8)}>16 cards</button>
        <button type="button" className={`btn ${size === 12 ? 'btn-primary' : ''}`} onClick={() => deal(12)}>24 cards</button>
        <span className="gm-hint">Moves {moves} · {fmtSecs(secs)}</span>
      </div>
      <div className={`gm-mem-grid n${size}`}>
        {cards.map((c, i) => (
          <button key={i} type="button" className={`gm-mem-card ${open.includes(i) || done.includes(i) ? 'up' : ''} ${done.includes(i) ? 'done' : ''}`} onClick={() => flip(i)} aria-label={open.includes(i) || done.includes(i) ? c : 'Hidden card'}>
            <span className="gm-mem-inner">
              <span className="gm-mem-back">?</span>
              <span className="gm-mem-front">{c}</span>
            </span>
          </button>
        ))}
        {won && (
          <Overlay title="All pairs found!" sub={`${moves} moves in ${fmtSecs(secs)}.`} tone="win">
            <button type="button" className="btn btn-primary" onClick={() => deal(size)}>Play again</button>
          </Overlay>
        )}
      </div>
    </div>
  );
}
