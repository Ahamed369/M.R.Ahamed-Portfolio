import { useEffect, useRef, useState } from 'react';
import { Overlay, rand, useTicker, type GameProps } from './core';

const TEXTS = [
  'Clean code reads like well written prose and every function should do one thing well.',
  'A good commit message explains why the change was made, not only what was changed.',
  'Responsive design makes a website look great on phones, tablets and large desktop screens.',
  'Always validate user input on the server and never trust data that comes from the browser.',
  'React components re-render when their state changes, so keep state as small as possible.',
  'Databases store information in tables, and SQL queries let you read and update that data.',
  'Debugging is twice as hard as writing the code in the first place, so write it simply.',
];

export default function Typing({ api }: GameProps) {
  const [text, setText] = useState(() => TEXTS[rand(TEXTS.length)]);
  const [typed, setTyped] = useState('');
  const [start, setStart] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [done, setDone] = useState(false);
  const inp = useRef<HTMLTextAreaElement>(null);
  useTicker(!!start && !done, 250, () => setNow(Date.now()));
  useEffect(() => inp.current?.focus(), [text]);

  const secs = start ? ((done ? now : now || Date.now()) - start) / 1000 : 0;
  const correct = typed.split('').filter((c, i) => c === text[i]).length;
  const wpm = secs > 1 ? Math.round(correct / 5 / (secs / 60)) : 0;
  const acc = typed.length ? Math.round((correct / typed.length) * 100) : 100;

  const change = (v: string) => {
    if (done) return;
    if (!start) setStart(Date.now());
    setTyped(v.slice(0, text.length));
    if (v.length >= text.length) {
      setNow(Date.now());
      setDone(true);
      const s = ((Date.now() - (start ?? Date.now())) / 1000) || 1;
      const w = Math.round(v.split('').filter((c, i) => c === text[i]).length / 5 / (s / 60));
      api.finish(w, { win: acc >= 90, note: 'WPM' });
      if (w >= 60) api.achieve('typing-60');
    }
  };

  return (
    <div className="gm-type" onClick={() => inp.current?.focus()}>
      <p className="gm-type-text" aria-hidden="true">
        {text.split('').map((c, i) => (
          <span key={i} className={i < typed.length ? (typed[i] === c ? 'ok' : 'bad') : i === typed.length ? 'cur' : ''}>{c}</span>
        ))}
      </p>
      <textarea ref={inp} className="gm-type-in" value={typed} onChange={(e) => change(e.target.value)} aria-label="Type the sentence" autoCapitalize="off" autoCorrect="off" spellCheck={false} />
      <div className="gm-type-stats">
        <span><b>{wpm}</b> WPM</span>
        <span><b>{acc}%</b> accuracy</span>
        <span><b>{secs.toFixed(1)}</b> s</span>
      </div>
      {done && (
        <Overlay title={`${wpm} WPM`} sub={`${acc}% accuracy.`} tone="win">
          <button type="button" className="btn btn-primary" onClick={() => { setText(TEXTS[rand(TEXTS.length)]); setTyped(''); setStart(null); setDone(false); setNow(0); }}>Next sentence</button>
        </Overlay>
      )}
    </div>
  );
}
