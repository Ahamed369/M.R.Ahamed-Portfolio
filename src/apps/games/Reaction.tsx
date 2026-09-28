import { useEffect, useRef, useState } from 'react';
import { tone, type GameProps } from './core';

export default function Reaction({ api }: GameProps) {
  const [phase, setPhase] = useState<'idle' | 'wait' | 'go' | 'early' | 'result'>('idle');
  const [times, setTimes] = useState<number[]>([]);
  const t0 = useRef(0);
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const click = () => {
    if (phase === 'idle' || phase === 'result' || phase === 'early') {
      if (times.length >= 5) setTimes([]);
      setPhase('wait');
      timer.current = window.setTimeout(() => {
        t0.current = performance.now();
        setPhase('go');
        tone(880, 90);
      }, 1200 + Math.random() * 2500);
    } else if (phase === 'wait') {
      window.clearTimeout(timer.current);
      setPhase('early');
    } else if (phase === 'go') {
      const ms = Math.round(performance.now() - t0.current);
      const n = [...times, ms];
      setTimes(n);
      setPhase('result');
      api.setScore(ms);
      if (n.length === 5) {
        const avg = Math.round(n.reduce((a, b) => a + b, 0) / 5);
        api.finish(avg, { note: 'avg ms' });
        if (avg < 250) api.achieve('reaction-250');
      }
    }
  };
  const avg = times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0;
  const msg = {
    idle: ['Reaction Time', 'Click or tap to start. When the screen turns green, click as fast as you can.'],
    wait: ['Wait for green…', ''],
    go: ['CLICK!', ''],
    early: ['Too soon!', 'Click to try again.'],
    result: [`${times[times.length - 1]} ms`, times.length >= 5 ? `Average of 5: ${avg} ms — click to play again.` : `Try ${times.length} of 5 · click to continue.`],
  }[phase];

  return (
    <button type="button" className={`gm-react ${phase}`} onPointerDown={click}>
      <b>{msg[0]}</b>
      <span>{msg[1]}</span>
      {times.length > 0 && <small>{times.map((t) => `${t} ms`).join(' · ')}</small>}
    </button>
  );
}
