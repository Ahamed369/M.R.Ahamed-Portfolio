import { useState } from 'react';
import { Overlay, shuffle, tone, useTicker, type GameProps } from './core';

interface Q {
  q: string;
  a: string;
  wrong: string[];
}
const BANK: Q[] = [
  { q: '2, 4, 8, 16, ?', a: '32', wrong: ['24', '30', '64'] },
  { q: '1, 1, 2, 3, 5, 8, ?', a: '13', wrong: ['11', '12', '16'] },
  { q: '3, 9, 27, 81, ?', a: '243', wrong: ['162', '324', '108'] },
  { q: '1, 4, 9, 16, 25, ?', a: '36', wrong: ['30', '49', '32'] },
  { q: '2, 3, 5, 7, 11, ?', a: '13', wrong: ['12', '14', '15'] },
  { q: 'Z, X, V, T, ?', a: 'R', wrong: ['S', 'Q', 'P'] },
  { q: 'A, C, F, J, ?', a: 'O', wrong: ['M', 'N', 'P'] },
  { q: '100, 90, 81, 73, ?', a: '66', wrong: ['64', '65', '67'] },
  { q: 'Which is the odd one out?  Apple · Banana · Carrot · Mango', a: 'Carrot', wrong: ['Apple', 'Banana', 'Mango'] },
  { q: 'Which is the odd one out?  Python · Java · HTML · C++', a: 'HTML', wrong: ['Python', 'Java', 'C++'] },
  { q: 'Book is to Reading as Fork is to …', a: 'Eating', wrong: ['Cooking', 'Kitchen', 'Spoon'] },
  { q: 'Hot is to Cold as Up is to …', a: 'Down', wrong: ['Over', 'Top', 'High'] },
  { q: 'If all Bloops are Razzies and all Razzies are Lazzies, are all Bloops Lazzies?', a: 'Yes', wrong: ['No', 'Only some', 'Cannot tell'] },
  { q: 'A bat and a ball cost 1.10 in total. The bat costs 1.00 more than the ball. How much is the ball?', a: '0.05', wrong: ['0.10', '0.01', '0.15'] },
  { q: 'How many months have 28 days?', a: 'All 12', wrong: ['1', '2', '6'] },
  { q: '5 machines make 5 widgets in 5 minutes. How long do 100 machines take to make 100 widgets?', a: '5 minutes', wrong: ['100 minutes', '20 minutes', '1 minute'] },
  { q: 'Which number is next?  6, 11, 21, 41, ?', a: '81', wrong: ['61', '71', '82'] },
  { q: 'Mary’s father has five daughters: Nana, Nene, Nini, Nono. Who is the fifth?', a: 'Mary', wrong: ['Nunu', 'Nina', 'Nora'] },
  { q: 'Rearrange “CIFAIPC” to get the name of a(n) …', a: 'Ocean', wrong: ['City', 'Animal', 'Country'] },
  { q: '12 × 12 = ?', a: '144', wrong: ['124', '142', '132'] },
  { q: 'Which shape has the most sides?', a: 'Octagon', wrong: ['Hexagon', 'Pentagon', 'Heptagon'] },
  { q: 'A clock shows 3:15. What is the angle between the hands?', a: '7.5°', wrong: ['0°', '15°', '30°'] },
  { q: 'Which word does NOT belong?  Kilobyte · Megabyte · Gigahertz · Terabyte', a: 'Gigahertz', wrong: ['Kilobyte', 'Megabyte', 'Terabyte'] },
  { q: 'If you rearrange “LISTEN” you get …', a: 'SILENT', wrong: ['TINSEL', 'ENLIST', 'All of these'] },
  { q: 'Binary 1010 in decimal is …', a: '10', wrong: ['8', '12', '5'] },
];

export default function IQQuiz({ api }: GameProps) {
  const [qs, setQs] = useState(() => shuffle(BANK).slice(0, 20).map((q) => ({ ...q, opts: shuffle([q.a, ...q.wrong]) })));
  const [i, setI] = useState(0);
  const [right, setRight] = useState(0);
  const [pick, setPick] = useState<string | null>(null);
  const [left, setLeft] = useState(20);
  const done = i >= qs.length;
  useTicker(!done && !pick && !api.paused, 1000, () => setLeft((l) => {
    if (l <= 1) {
      choose('');
      return 20;
    }
    return l - 1;
  }));

  function choose(o: string) {
    if (pick !== null || done) return;
    const q = qs[i];
    const ok = o === q.a;
    setPick(o || '—');
    tone(ok ? 760 : 220, 120);
    const r = right + (ok ? 1 : 0);
    if (ok) setRight(r);
    api.setScore(r);
    window.setTimeout(() => {
      setPick(null);
      setLeft(20);
      setI((n) => {
        if (n + 1 >= qs.length) {
          api.finish(r, { win: r >= 12 });
          if (r >= 15) api.achieve('quiz-15');
        }
        return n + 1;
      });
    }, 900);
  }
  const level = right >= 18 ? 'Genius-level puzzler' : right >= 15 ? 'Sharp thinker' : right >= 10 ? 'Solid reasoner' : 'Keep practising';

  if (done)
    return (
      <div className="gm-quiz">
        <Overlay title={`${right} / ${qs.length}`} sub={`${level}. Just for fun — this is not a real IQ test.`} tone={right >= 12 ? 'win' : 'lose'}>
          <button type="button" className="btn btn-primary" onClick={() => { setQs(shuffle(BANK).slice(0, 20).map((q) => ({ ...q, opts: shuffle([q.a, ...q.wrong]) }))); setI(0); setRight(0); }}>Try another set</button>
        </Overlay>
      </div>
    );
  const q = qs[i];
  return (
    <div className="gm-quiz">
      <div className="gm-quiz-top">
        <span>Question {i + 1} / {qs.length}</span>
        <span className="gm-quiz-time" style={{ ['--p' as string]: `${(left / 20) * 100}%` }}>{left}s</span>
      </div>
      <h3 key={i} className="fade-swap">{q.q}</h3>
      <div className="gm-quiz-opts">
        {q.opts.map((o) => (
          <button key={o} type="button" className={pick ? (o === q.a ? 'ok' : o === pick ? 'bad' : '') : ''} onClick={() => choose(o)}>
            {o}
          </button>
        ))}
      </div>
      <p className="gm-hint">{right} correct · logic, patterns and number sequences</p>
    </div>
  );
}
