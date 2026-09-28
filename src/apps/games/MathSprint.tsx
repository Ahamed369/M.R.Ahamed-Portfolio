import { useEffect, useRef, useState } from 'react';
import { Overlay, rand, tone, useTicker, type GameProps } from './core';

function make() {
  const op = ['+', '−', '×', '÷'][rand(4)];
  let a = rand(20) + 2;
  let b = rand(12) + 2;
  if (op === '×') {
    a = rand(11) + 2;
    b = rand(11) + 2;
  }
  if (op === '÷') {
    const q = rand(11) + 2;
    b = rand(10) + 2;
    a = q * b;
  }
  if (op === '−' && b > a) [a, b] = [b, a];
  const ans = op === '+' ? a + b : op === '−' ? a - b : op === '×' ? a * b : a / b;
  return { q: `${a} ${op} ${b}`, ans };
}

export default function MathSprint({ api }: GameProps) {
  const [left, setLeft] = useState(60);
  const [run, setRun] = useState(false);
  const [p, setP] = useState(make);
  const [val, setVal] = useState('');
  const [score, setScore] = useState(0);
  const [flash, setFlash] = useState<'ok' | 'bad' | ''>('');
  const inp = useRef<HTMLInputElement>(null);
  useTicker(run && !api.paused, 1000, () => setLeft((l) => l - 1));
  useEffect(() => {
    if (run && left <= 0) {
      setRun(false);
      api.finish(score);
      if (score >= 20) api.achieve('math-20');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left, run]);

  const start = () => {
    setLeft(60);
    setScore(0);
    setP(make());
    setVal('');
    setRun(true);
    api.setScore(0);
    window.setTimeout(() => inp.current?.focus(), 30);
  };
  const submit = () => {
    if (!run || val === '') return;
    const ok = Number(val) === p.ans;
    setFlash(ok ? 'ok' : 'bad');
    window.setTimeout(() => setFlash(''), 250);
    tone(ok ? 760 : 200, 90);
    if (ok) {
      setScore((s) => {
        api.setScore(s + 1);
        return s + 1;
      });
    }
    setP(make());
    setVal('');
  };

  return (
    <div className="gm-math">
      <div className="gm-math-timer" style={{ ['--p' as string]: `${(left / 60) * 100}%` }} />
      <div className={`gm-math-q ${flash}`}>{run || left < 60 ? p.q : '12 × 7'}</div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <input ref={inp} inputMode="numeric" value={val} onChange={(e) => setVal(e.target.value.replace(/[^-\d]/g, ''))} disabled={!run} placeholder="?" aria-label="Answer" />
      </form>
      <div className="gm-math-pad">
        {['7', '8', '9', '4', '5', '6', '1', '2', '3', '−', '0', '⏎'].map((k) => (
          <button key={k} type="button" disabled={!run} onClick={() => (k === '⏎' ? submit() : k === '−' ? setVal((v) => (v.startsWith('-') ? v.slice(1) : '-' + v)) : setVal((v) => v + k))}>
            {k}
          </button>
        ))}
      </div>
      <p className="gm-hint">{left}s · {score} correct</p>
      {!run && (
        <Overlay title={left <= 0 ? `${score} correct!` : 'Math Sprint'} sub={left <= 0 ? 'Solve as many as you can in 60 seconds.' : '60 seconds of mental arithmetic. Ready?'} tone={left <= 0 ? 'win' : undefined}>
          <button type="button" className="btn btn-primary" onClick={start}>{left <= 0 ? 'Again' : 'Start'}</button>
        </Overlay>
      )}
    </div>
  );
}
