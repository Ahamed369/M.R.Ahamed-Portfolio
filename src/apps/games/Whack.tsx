import { useEffect, useState } from 'react';
import { Overlay, rand, tone, useTicker, type GameProps } from './core';

export default function Whack({ api }: GameProps) {
  const [holes, setHoles] = useState<number[]>([]);
  const [hit, setHit] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [left, setLeft] = useState(30);
  const [run, setRun] = useState(false);
  useTicker(run && !api.paused, 1000, () => setLeft((l) => l - 1));
  useTicker(run && !api.paused, 650, () => setHoles(() => {
    const n = 1 + (left < 15 ? rand(2) : 0);
    return Array.from({ length: n }, () => rand(9));
  }));
  useEffect(() => {
    if (run && left <= 0) {
      setRun(false);
      setHoles([]);
      api.finish(score);
      if (score >= 25) api.achieve('mole-25');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left, run]);

  const whack = (i: number) => {
    if (!holes.includes(i)) return;
    setHoles((h) => h.filter((x) => x !== i));
    setHit(i);
    window.setTimeout(() => setHit(null), 200);
    tone(300 + rand(200), 70, 'square', 0.06);
    setScore((s) => {
      api.setScore(s + 1);
      return s + 1;
    });
  };

  return (
    <div className="gm-mole">
      <p className="gm-hint">⏱ {left}s · 🔨 {score}</p>
      <div className="gm-mole-grid">
        {Array.from({ length: 9 }, (_, i) => (
          <button key={i} type="button" className={`gm-mole-hole ${holes.includes(i) ? 'up' : ''} ${hit === i ? 'hit' : ''}`} onPointerDown={() => whack(i)} aria-label={`Hole ${i + 1}`}>
            <span className="gm-mole-mole">🐹</span>
          </button>
        ))}
        {!run && (
          <Overlay title={left <= 0 ? `${score} whacked!` : 'Whack-a-Mole'} sub="Tap the moles before they hide — 30 seconds." tone={left <= 0 ? 'win' : undefined}>
            <button type="button" className="btn btn-primary" onClick={() => { setScore(0); setLeft(30); setRun(true); api.setScore(0); }}>{left <= 0 ? 'Again' : 'Start'}</button>
          </Overlay>
        )}
      </div>
    </div>
  );
}
