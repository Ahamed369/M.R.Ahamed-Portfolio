import { useEffect, useRef, useState } from 'react';
import { Overlay, rand, tone, type GameProps } from './core';

const PADS = [
  { c: '#34c759', f: 392 },
  { c: '#ff3b30', f: 330 },
  { c: '#ffcc00', f: 262 },
  { c: '#0a84ff', f: 196 },
];

export default function Simon({ api }: GameProps) {
  const [seq, setSeq] = useState<number[]>([]);
  const [lit, setLit] = useState<number | null>(null);
  const [step, setStep] = useState(0);
  const [phase, setPhase] = useState<'idle' | 'show' | 'input' | 'over'>('idle');
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const show = (s: number[]) => {
    setPhase('show');
    s.forEach((p, i) => {
      timers.current.push(window.setTimeout(() => {
        setLit(p);
        tone(PADS[p].f, 380, 'triangle');
      }, 600 * i + 500));
      timers.current.push(window.setTimeout(() => setLit(null), 600 * i + 900));
    });
    timers.current.push(window.setTimeout(() => {
      setPhase('input');
      setStep(0);
    }, 600 * s.length + 500));
  };
  const start = () => {
    const s = [rand(4)];
    setSeq(s);
    api.setScore(0);
    show(s);
  };
  const press = (p: number) => {
    if (phase !== 'input') return;
    setLit(p);
    tone(PADS[p].f, 250, 'triangle');
    window.setTimeout(() => setLit(null), 200);
    if (seq[step] !== p) {
      setPhase('over');
      tone(110, 500, 'sawtooth');
      api.finish(seq.length - 1);
      return;
    }
    if (step + 1 === seq.length) {
      api.setScore(seq.length);
      if (seq.length >= 8) api.achieve('simon-8');
      const s = [...seq, rand(4)];
      setSeq(s);
      window.setTimeout(() => show(s), 500);
    } else setStep(step + 1);
  };

  return (
    <div className="gm-simon">
      <div className="gm-simon-ring">
        {PADS.map((p, i) => (
          <button key={i} type="button" className={`gm-simon-pad q${i} ${lit === i ? 'lit' : ''}`} style={{ ['--c' as string]: p.c }} onClick={() => press(i)} aria-label={`Pad ${i + 1}`} />
        ))}
        <button type="button" className="gm-simon-hub" onClick={start} disabled={phase === 'show' || phase === 'input'}>
          {phase === 'idle' || phase === 'over' ? 'Start' : `Round ${seq.length}`}
        </button>
        {phase === 'over' && (
          <Overlay title="Wrong pad!" sub={`You reached round ${seq.length}.`} tone="lose">
            <button type="button" className="btn btn-primary" onClick={start}>Try again</button>
          </Overlay>
        )}
      </div>
      <p className="gm-hint">{phase === 'show' ? 'Watch…' : phase === 'input' ? 'Your turn — repeat the sequence.' : 'Watch the pads light up, then repeat the pattern.'}</p>
    </div>
  );
}
