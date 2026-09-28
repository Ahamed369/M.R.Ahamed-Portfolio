import { useState } from 'react';
import { Overlay, rand, tone, type GameProps } from './core';

const M = ['🪨', '📄', '✂️'] as const;
const NAMES = ['Rock', 'Paper', 'Scissors'];

export default function RPS({ api }: GameProps) {
  const [me, setMe] = useState(0);
  const [cpu, setCpu] = useState(0);
  const [last, setLast] = useState<{ a: number; b: number; r: string } | null>(null);
  const done = me === 3 || cpu === 3;

  const play = (a: number) => {
    if (done) return;
    const b = rand(3);
    const r = a === b ? 'Draw' : (a + 1) % 3 === b ? 'Computer scores' : 'You score';
    const nm = me + (r === 'You score' ? 1 : 0);
    const nc = cpu + (r === 'Computer scores' ? 1 : 0);
    setMe(nm);
    setCpu(nc);
    setLast({ a, b, r });
    tone(r === 'You score' ? 700 : r === 'Draw' ? 440 : 220, 110);
    api.setScore(nm);
    if (nm === 3 || nc === 3) api.finish(nm, { win: nm === 3 });
  };

  return (
    <div className="gm-rps">
      <div className="gm-rps-score">You <b>{me}</b> — <b>{cpu}</b> Computer <small>(first to 3)</small></div>
      <div className="gm-rps-arena">
        <span key={`a${me}${cpu}`} className="gm-rps-hand">{last ? M[last.a] : '✊'}</span>
        <span className="gm-rps-vs">vs</span>
        <span key={`b${me}${cpu}`} className="gm-rps-hand cpu">{last ? M[last.b] : '✊'}</span>
      </div>
      <p className="gm-hint">{last ? `${NAMES[last.a]} vs ${NAMES[last.b]} — ${last.r}` : 'Pick your move.'}</p>
      <div className="gm-rps-picks">
        {M.map((m, i) => (
          <button key={i} type="button" onClick={() => play(i)} aria-label={NAMES[i]}>{m}</button>
        ))}
      </div>
      {done && (
        <Overlay title={me === 3 ? 'You win!' : 'Computer wins'} tone={me === 3 ? 'win' : 'lose'}>
          <button type="button" className="btn btn-primary" onClick={() => { setMe(0); setCpu(0); setLast(null); }}>Play again</button>
        </Overlay>
      )}
    </div>
  );
}
