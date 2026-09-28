import { useMemo, useState } from 'react';
import { Overlay, rand, tone, useKeys, type GameProps } from './core';

const WORDS = `about above abuse actor acute admit adopt adult after again agent agree ahead alarm album alert alike alive allow alone along alter among anger angle angry apart apple apply arena argue arise array aside asset audio audit avoid award aware badly baker bases basic basis beach began begin begun being below bench billy birth black blame blind block blood board boost booth bound brain brand bread break breed brief bring broad broke brown build built buyer cable calif carry catch cause chain chair chart chase cheap check chest chief child china chose civil claim class clean clear click clock close coach coast could count court cover craft crash cream crime cross crowd crown curve cycle daily dance dated dealt death debut delay depth doing doubt dozen draft drama drawn dream dress drill drink drive drove dying eager early earth eight elite empty enemy enjoy enter entry equal error event every exact exist extra faith false fault fiber field fifth fifty fight final first fixed flash fleet floor fluid focus force forth forty forum found frame frank fraud fresh front fruit fully funny giant given glass globe going grace grade grand grant grass great green gross group grown guard guess guest guide happy harry heart heavy hence henry horse hotel house human ideal image index inner input issue joint judge known label large laser later laugh layer learn lease least leave legal level light limit links lives local logic loose lower lucky lunch lying magic major maker march match maybe mayor meant media metal might minor minus mixed model money month moral motor mount mouse mouth movie music needs never newly night noise north noted novel nurse occur ocean offer often order other ought paint panel paper party peace phase phone photo piece pilot pitch place plain plane plant plate point pound power press price pride prime print prior prize proof proud prove queen quick quiet quite radio raise range rapid ratio reach ready refer right rival river robot roman rough round route royal rural scale scene scope score sense serve seven shall shape share sharp sheet shelf shell shift shirt shock shoot short shown sight since sixth sixty sized skill sleep slide small smart smile smoke solid solve sorry sound south space spare speak speed spend spent split spoke sport staff stage stake stand start state steam steel stick still stock stone stood store storm story strip stuck study stuff style sugar suite super sweet table taken taste taxes teach teeth thank theft their theme there these thick thing think third those three threw throw tight times tired title today topic total touch tough tower track trade train treat trend trial tried tries truck truly trust truth twice under undue union unity until upper upset urban usage usual valid value video virus visit vital voice waste watch water wheel where which while white whole whose woman women world worry worse worst worth would wound write wrong wrote yield young youth`.split(' ');
const ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];

export default function WordGuess({ api }: GameProps) {
  const [answer, setAnswer] = useState(() => WORDS[rand(WORDS.length)]);
  const [guesses, setGuesses] = useState<string[]>([]);
  const [cur, setCur] = useState('');
  const [msg, setMsg] = useState('');
  const done = guesses.includes(answer) || guesses.length >= 6;
  const won = guesses.includes(answer);

  const grade = (g: string) => {
    const res: ('hit' | 'near' | 'miss')[] = Array(5).fill('miss');
    const left = answer.split('');
    g.split('').forEach((c, i) => {
      if (c === answer[i]) {
        res[i] = 'hit';
        left[i] = '_';
      }
    });
    g.split('').forEach((c, i) => {
      if (res[i] === 'hit') return;
      const k = left.indexOf(c);
      if (k >= 0) {
        res[i] = 'near';
        left[k] = '_';
      }
    });
    return res;
  };
  const keyState = useMemo(() => {
    const m: Record<string, string> = {};
    guesses.forEach((g) => grade(g).forEach((r, i) => {
      const c = g[i];
      if (m[c] === 'hit' || (m[c] === 'near' && r === 'miss')) return;
      m[c] = r;
    }));
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guesses]);

  const key = (k: string) => {
    if (done) return;
    if (k === 'enter') {
      if (cur.length < 5) return setMsg('Not enough letters');
      if (!WORDS.includes(cur)) return setMsg('Not in word list');
      const g = [...guesses, cur];
      setGuesses(g);
      setCur('');
      setMsg('');
      if (cur === answer) {
        tone(880, 200);
        if (g.length <= 2) api.achieve('word-2');
        api.finish(7 - g.length, { win: true });
      } else if (g.length === 6) {
        tone(160, 300);
        api.finish(0);
      } else tone(500, 60);
    } else if (k === 'back') setCur((c) => c.slice(0, -1));
    else if (/^[a-z]$/.test(k) && cur.length < 5) setCur((c) => c + k);
  };
  useKeys(api.focused, (e) => {
    if (e.key === 'Enter') key('enter');
    else if (e.key === 'Backspace') key('back');
    else key(e.key.toLowerCase());
  });

  const rows = [...guesses, ...(done ? [] : [cur])];
  return (
    <div className="gm-word">
      <div className="gm-word-grid">
        {Array.from({ length: 6 }, (_, r) => {
          const g = rows[r] ?? '';
          const res = r < guesses.length ? grade(g) : null;
          return (
            <div key={r} className="gm-word-row">
              {Array.from({ length: 5 }, (_, i) => (
                <span key={i} className={`gm-word-tile ${res ? res[i] : g[i] ? 'typed' : ''}`} style={{ animationDelay: `${i * 90}ms` }}>
                  {g[i] ?? ''}
                </span>
              ))}
            </div>
          );
        })}
      </div>
      <p className="gm-hint">{msg || 'Guess the 5-letter word in six tries.'}</p>
      <div className="gm-word-kb">
        {ROWS.map((row, i) => (
          <div key={row}>
            {i === 2 && <button type="button" className="wide" onClick={() => key('enter')}>Enter</button>}
            {row.split('').map((c) => (
              <button key={c} type="button" className={keyState[c] ?? ''} onClick={() => key(c)}>{c}</button>
            ))}
            {i === 2 && <button type="button" className="wide" onClick={() => key('back')} aria-label="Delete">⌫</button>}
          </div>
        ))}
      </div>
      {done && (
        <Overlay title={won ? 'Brilliant!' : 'Out of guesses'} sub={`The word was ${answer.toUpperCase()}.`} tone={won ? 'win' : 'lose'}>
          <button type="button" className="btn btn-primary" onClick={() => { setAnswer(WORDS[rand(WORDS.length)]); setGuesses([]); setCur(''); }}>New word</button>
        </Overlay>
      )}
    </div>
  );
}
