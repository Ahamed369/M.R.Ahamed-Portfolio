import { lazy, Suspense, useCallback, useEffect, useMemo, useState, type ComponentType, type LazyExoticComponent } from 'react';
import { DragBar, Lights } from '../components/Window';
import { currentSeason } from '../components/SystemExtras';
import { useWM } from '../system/WindowManager';
import { useSettings } from '../system/SettingsContext';
import { readStore, writeStore } from '../system/storage';
import { notify } from '../system/notify';
import { ACHIEVEMENTS, type GameApi, type GameProps } from './games/core';
import type { AppProps } from '../components/Desktop';

type Cat = 'Puzzle' | 'Arcade' | 'Brain & IQ' | 'Classic' | 'Word';
interface GameDef {
  id: string;
  name: string;
  cat: Cat;
  glyph: string;
  from: string;
  to: string;
  blurb: string;
  how: string;
  /** leaderboard: lower is better (times, ms) */
  low?: boolean;
  unit?: string;
  C: LazyExoticComponent<ComponentType<GameProps>>;
}

const GAMES: GameDef[] = [
  { id: 'snake', name: 'Snake', cat: 'Arcade', glyph: '🐍', from: '#34c759', to: '#0b6b2c', blurb: 'Eat, grow, don’t bite yourself.', how: 'Steer with arrow keys, WASD, the on-screen pad or swipe. Each dot is 10 points and the snake speeds up.', unit: 'pts', C: lazy(() => import('./games/Snake')) },
  { id: '2048', name: '2048', cat: 'Puzzle', glyph: '2048', from: '#f6c177', to: '#e8833a', blurb: 'Slide and merge to reach 2048.', how: 'Arrow keys, WASD or swipe move every tile. Equal tiles merge.', unit: 'pts', C: lazy(() => import('./games/G2048')) },
  { id: 'sudoku', name: 'Sudoku', cat: 'Puzzle', glyph: '9', from: '#5e5ce6', to: '#2b1f8f', blurb: 'The classic 9×9 number puzzle.', how: 'Fill every row, column and box with 1–9. Use Notes for pencil marks.', low: true, unit: 's', C: lazy(() => import('./games/Sudoku')) },
  { id: 'blocks', name: 'Block Drop', cat: 'Arcade', glyph: '▚', from: '#5ac8fa', to: '#0a4fa8', blurb: 'Stack falling blocks, clear lines.', how: '← → move, ↑ rotate, ↓ soft drop, Space hard drop. Touch buttons below the board.', unit: 'pts', C: lazy(() => import('./games/BlockDrop')) },
  { id: 'minesweeper', name: 'Minesweeper', cat: 'Classic', glyph: '💣', from: '#8e8e93', to: '#3a3a3c', blurb: 'Clear the field without a boom.', how: 'Numbers show nearby mines. Right-click / long-press / Flag mode to flag.', low: true, unit: 's', C: lazy(() => import('./games/Minesweeper')) },
  { id: 'tictactoe', name: 'Tic-Tac-Toe', cat: 'Classic', glyph: '✕○', from: '#ff6482', to: '#b01a4a', blurb: 'Beat — or draw — the perfect AI.', how: 'Three in a row wins. The computer plays perfectly.', C: lazy(() => import('./games/TicTacToe')) },
  { id: 'connect4', name: 'Connect Four', cat: 'Classic', glyph: '🔴', from: '#ffd60a', to: '#d4a200', blurb: 'Drop discs, connect four.', how: 'Click a column. Four in a row horizontally, vertically or diagonally.', C: lazy(() => import('./games/ConnectFour')) },
  { id: 'memory', name: 'Memory Match', cat: 'Brain & IQ', glyph: '🃏', from: '#bf5af2', to: '#6c2bb3', blurb: 'Find every matching pair.', how: 'Flip two cards at a time. Fewer moves = higher score.', unit: 'pts', C: lazy(() => import('./games/Memory')) },
  { id: 'iq', name: 'IQ Quiz', cat: 'Brain & IQ', glyph: '🧠', from: '#ff9f0a', to: '#c2410c', blurb: 'Patterns, logic and sequences.', how: '20 questions, 20 seconds each. Just for fun — not a real IQ test.', unit: '/20', C: lazy(() => import('./games/IQQuiz')) },
  { id: 'math', name: 'Math Sprint', cat: 'Brain & IQ', glyph: '÷', from: '#30d158', to: '#0f766e', blurb: '60 seconds of mental maths.', how: 'Type or tap answers. Every correct answer scores.', unit: 'correct', C: lazy(() => import('./games/MathSprint')) },
  { id: 'simon', name: 'Simon Says', cat: 'Brain & IQ', glyph: '◕', from: '#64d2ff', to: '#0369a1', blurb: 'Repeat the growing pattern.', how: 'Watch the pads light up, then repeat the sequence.', unit: 'rounds', C: lazy(() => import('./games/Simon')) },
  { id: 'reaction', name: 'Reaction Time', cat: 'Brain & IQ', glyph: '⚡', from: '#ff453a', to: '#8b0000', blurb: 'How fast are your reflexes?', how: 'Click the moment the screen turns green. Average of 5 tries.', low: true, unit: 'ms', C: lazy(() => import('./games/Reaction')) },
  { id: 'word', name: 'Word Guess', cat: 'Word', glyph: 'W', from: '#6aaa64', to: '#3d6b39', blurb: 'Guess the 5-letter word in six.', how: 'Green = right spot, yellow = wrong spot, grey = not in the word.', unit: 'pts', C: lazy(() => import('./games/WordGuess')) },
  { id: 'typing', name: 'Typing Speed', cat: 'Word', glyph: '⌨︎', from: '#1c1c1e', to: '#48484a', blurb: 'Test your words per minute.', how: 'Type the sentence exactly. WPM counts correct characters.', unit: 'WPM', C: lazy(() => import('./games/Typing')) },
  { id: 'bricks', name: 'Brick Breaker', cat: 'Arcade', glyph: '🧱', from: '#ff375f', to: '#7c1d3f', blurb: 'Smash the wall with a bouncing ball.', how: 'Move the paddle with mouse, touch or ← →. Three lives.', unit: 'pts', C: lazy(() => import('./games/Bricks')) },
  { id: 'flappy', name: 'Flappy Dot', cat: 'Arcade', glyph: '🐤', from: '#7fd4ff', to: '#1d7fbf', blurb: 'Flap through the pipes.', how: 'Click, tap or Space to flap.', unit: 'pipes', C: lazy(() => import('./games/Flappy')) },
  { id: 'stack', name: 'Stack Tower', cat: 'Arcade', glyph: '🏙', from: '#ff9ff3', to: '#7b2ff7', blurb: 'The viral stack-the-blocks game.', how: 'Tap or Space to drop each block right on top.', unit: 'blocks', C: lazy(() => import('./games/Stack')) },
  { id: 'mole', name: 'Whack-a-Mole', cat: 'Arcade', glyph: '🐹', from: '#a2845e', to: '#5b3e1f', blurb: '30 seconds of mole mayhem.', how: 'Tap the moles before they hide.', unit: 'moles', C: lazy(() => import('./games/Whack')) },
  { id: 'pong', name: 'Pong', cat: 'Classic', glyph: '🏓', from: '#0c1a12', to: '#1f5135', blurb: 'The original tennis-for-two.', how: 'Mouse, touch or ↑ ↓ moves your paddle. First to 5.', unit: 'pts', C: lazy(() => import('./games/Pong')) },
  { id: 'rps', name: 'Rock Paper Scissors', cat: 'Classic', glyph: '✂︎', from: '#ffcc00', to: '#ff6b00', blurb: 'Best of five against the computer.', how: 'Rock beats scissors, scissors beat paper, paper beats rock.', C: lazy(() => import('./games/RPS')) },
];
const CATS: Cat[] = ['Puzzle', 'Arcade', 'Brain & IQ', 'Classic', 'Word'];

type View = { k: 'home' } | { k: 'all' } | { k: 'cat'; c: Cat } | { k: 'achievements' } | { k: 'game'; id: string };
/* v8 — Daily Challenge: one game a day with a target; streaks stay on this device */
const TARGET: Record<string, { n?: number; win?: boolean; label: string }> = {
  snake: { n: 120, label: 'Score 120+ points' },
  '2048': { n: 1500, label: 'Score 1,500+ points' },
  sudoku: { n: 900, label: 'Solve it in under 15 minutes' },
  blocks: { n: 800, label: 'Score 800+ points' },
  minesweeper: { n: 240, label: 'Clear the field in under 4 minutes' },
  tictactoe: { win: true, label: 'Win (or at least draw) against the AI' },
  connect4: { win: true, label: 'Beat the computer' },
  memory: { n: 60, label: 'Score 60+ points' },
  iq: { n: 12, label: 'Get 12+ of 20 right' },
  math: { n: 18, label: 'Solve 18+ problems in 60 s' },
  simon: { n: 8, label: 'Reach round 8' },
  reaction: { n: 320, label: 'Average under 320 ms' },
  word: { n: 1, label: 'Guess the word' },
  typing: { n: 40, label: 'Type 40+ WPM' },
  bricks: { n: 300, label: 'Score 300+ points' },
  flappy: { n: 10, label: 'Fly through 10 pipes' },
  stack: { n: 15, label: 'Stack 15 blocks' },
  mole: { n: 20, label: 'Whack 20 moles' },
  pong: { n: 5, label: 'Win a match (5 points)' },
  rps: { win: true, label: 'Win best of five' },
};
const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const dailyGame = (d = new Date()) => {
  const k = dayKey(d);
  let h = 7;
  for (const ch of k) h = (h * 31 + ch.charCodeAt(0)) % 100003;
  return GAMES[h % GAMES.length];
};

interface Store {
  /** v8 */
  daily?: { day: string; done: boolean };
  streak?: { last: string; count: number };
  name: string;
  scores: Record<string, { s: number; at: number; name: string }[]>;
  played: string[];
  ach: string[];
  sound: boolean;
}
const KEY = 'mra-gamecenter-v1';

function Icon({ g, big }: { g: GameDef; big?: boolean }) {
  return (
    <span className={`gc-icon ${big ? 'big' : ''}`} style={{ background: `linear-gradient(145deg, ${g.from}, ${g.to})` }} aria-hidden="true">
      <span>{g.glyph}</span>
    </span>
  );
}

export default function GameCenterApp({ win }: AppProps) {
  const wm = useWM();
  const { settings } = useSettings();
  const [store, setStore] = useState<Store>(() => readStore<Store>(KEY, { name: 'Guest', scores: {}, played: [], ach: [], sound: true }));
  const [view, setView] = useState<View>({ k: 'home' });
  const [round, setRound] = useState(0);
  const [live, setLive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hidden, setHidden] = useState(document.visibilityState !== 'visible');
  const [q, setQ] = useState('');

  useEffect(() => writeStore(KEY, store), [store]);
  useEffect(() => {
    const on = () => setHidden(document.visibilityState !== 'visible');
    document.addEventListener('visibilitychange', on);
    return () => document.removeEventListener('visibilitychange', on);
  }, []);

  const game = view.k === 'game' ? GAMES.find((g) => g.id === view.id) : undefined;
  const best = (g: GameDef) => {
    const l = store.scores[g.id];
    return l?.length ? l[0].s : null;
  };
  const achieve = useCallback((id: string) => {
    setStore((s) => {
      if (s.ach.includes(id)) return s;
      const a = ACHIEVEMENTS.find((x) => x.id === id);
      if (a) notify({ app: 'Game Center', icon: 'gamecenter', title: `${a.glyph} Achievement unlocked`, body: `${a.title} — ${a.desc}` });
      return { ...s, ach: [...s.ach, id] };
    });
  }, []);

  const api: GameApi = useMemo(
    () => ({
      setScore: setLive,
      finish: (score, opts) => {
        if (!game) return;
        setStore((s) => {
          const list = [...(s.scores[game.id] ?? []), { s: score, at: Date.now(), name: s.name }].sort((a, b) => (game.low ? a.s - b.s : b.s - a.s)).slice(0, 10);
          const played = s.played.includes(game.id) ? s.played : [...s.played, game.id];
          return { ...s, scores: { ...s.scores, [game.id]: list }, played };
        });
        achieve('first-game');
        if (opts?.win) achieve('first-win');
        // Daily Challenge
        const today = dayKey();
        const dg = dailyGame();
        if (game.id === dg.id && !(store.daily?.day === today && store.daily.done)) {
          const t = TARGET[game.id];
          const ok = t ? (t.win ? !!opts?.win || (game.id === 'tictactoe' && opts?.note === 'draw') : game.low ? score > 0 && score <= (t.n ?? 0) : score >= (t.n ?? 0)) : !!opts?.win;
          if (ok) {
            const y = new Date();
            y.setDate(y.getDate() - 1);
            setStore((s2) => {
              const count = s2.streak?.last === dayKey(y) ? s2.streak.count + 1 : s2.streak?.last === today ? s2.streak.count : 1;
              notify({ app: 'Game Center', icon: 'gamecenter', label: 'Daily Challenge', title: 'Challenge complete! 🏆', body: `${game.name} — ${t?.label ?? 'done'}. Streak: ${count} day${count === 1 ? '' : 's'} 🔥` });
              return { ...s2, daily: { day: today, done: true }, streak: { last: today, count } };
            });
          }
        }
        const n = new Set([...store.played, game.id]).size;
        if (n >= 5) achieve('explorer');
        if (n >= 12) achieve('collector');
      },
      achieve,
      restart: () => {
        setRound((r) => r + 1);
        setLive(0);
      },
      paused: paused || hidden || win.phase === 'minimized',
      focused: wm.focusedId === 'gamecenter',
      dark: settings.appearance === 'dark',
      sound: store.sound,
    }),
    [game, achieve, paused, hidden, win.phase, wm.focusedId, settings.appearance, store.sound, store.played, store.daily],
  );

  const open = (id: string) => {
    setView({ k: 'game', id });
    setRound((r) => r + 1);
    setLive(0);
    setPaused(false);
    setStore((s) => ({ ...s, played: [id, ...s.played.filter((x) => x !== id)] }));
  };

  const grid = (list: GameDef[]) => (
    <div className="gc-grid">
      {list.map((g, i) => (
        <button key={g.id} type="button" className="gc-tile" style={{ ['--i' as string]: i }} onClick={() => open(g.id)}>
          <Icon g={g} />
          <b>{g.name}.app</b>
          {best(g) !== null && <small>Best {best(g)} {g.unit ?? ''}</small>}
        </button>
      ))}
    </div>
  );

  const nav = (v: View, label: string, glyph: string) => {
    const on = JSON.stringify(v) === JSON.stringify(view) || (v.k === 'cat' && view.k === 'cat' && v.c === view.c);
    return (
      <button type="button" className={`gc-nav ${on ? 'on' : ''}`} onClick={() => setView(v)}>
        <span aria-hidden="true">{glyph}</span>
        {label}
      </button>
    );
  };

  const featured = GAMES[(new Date().getDate() + 7) % GAMES.length];
  const recent = store.played.map((id) => GAMES.find((g) => g.id === id)).filter((g): g is GameDef => !!g).slice(0, 6);
  const filtered = q.trim() ? GAMES.filter((g) => `${g.name} ${g.cat} ${g.blurb}`.toLowerCase().includes(q.trim().toLowerCase())) : null;

  return (
    <div className="gc">
      <aside className="gc-side">
        <DragBar className="gc-drag">
          <Lights />
        </DragBar>
        <label className="gc-search">
          <span aria-hidden="true">⌕</span>
          <input value={q} onChange={(e) => (setQ(e.target.value), view.k === 'game' && setView({ k: 'all' }))} placeholder="Search games" aria-label="Search games" />
        </label>
        <div className="gc-side-scroll">
          {nav({ k: 'home' }, 'Home', '🏠')}
          {nav({ k: 'all' }, `All Games (${GAMES.length})`, '🎮')}
          {nav({ k: 'achievements' }, `Achievements (${store.ach.length}/${ACHIEVEMENTS.length})`, '🏆')}
          <div className="gc-sec">Categories</div>
          {CATS.map((c) => (
            <span key={c}>{nav({ k: 'cat', c }, c, { Puzzle: '🧩', Arcade: '🕹', 'Brain & IQ': '🧠', Classic: '♟', Word: '🔤' }[c])}</span>
          ))}
        </div>
        <div className="gc-player">
          <span className="gc-avatar">{store.name.charAt(0).toUpperCase()}</span>
          <input value={store.name} onChange={(e) => setStore((s) => ({ ...s, name: e.target.value.slice(0, 18) || 'Guest' }))} aria-label="Player name" />
        </div>
      </aside>

      <section className="gc-main">
        <DragBar className="gc-drag main">
          {game && (
            <>
              <button type="button" className="gc-back" onClick={() => setView({ k: 'all' })}>
                ‹ Games
              </button>
              <b className="gc-title">{game.name}</b>
              <span className="gc-scores">
                Score <b>{live}</b> · Best <b>{best(game) ?? '—'}</b>
              </span>
              <button type="button" className="gc-mini" onClick={() => setPaused((p) => !p)}>
                {paused ? '▶ Resume' : '❚❚ Pause'}
              </button>
              <button type="button" className="gc-mini" onClick={api.restart}>
                ↻ Restart
              </button>
            </>
          )}
        </DragBar>
        <div className="gc-scroll scroll-smooth" key={view.k === 'game' ? `g-${view.id}` : JSON.stringify(view)}>
          {filtered ? (
            <>
              <h1 className="gc-h1">Results</h1>
              {filtered.length ? grid(filtered) : <p className="gc-dim">No games match “{q}”.</p>}
            </>
          ) : view.k === 'home' ? (
            <div className="fade-swap">
              <button type="button" className="gc-hero" style={{ background: `linear-gradient(120deg, ${featured.from}, ${featured.to})` }} onClick={() => open(featured.id)}>
                <span>
                  <small>GAME OF THE DAY</small>
                  <b>{featured.name}</b>
                  <em>{featured.blurb}</em>
                  <span className="gc-play">Play ▸</span>
                </span>
                <Icon g={featured} big />
              </button>
              {(() => {
                const dg = dailyGame();
                const t = TARGET[dg.id];
                const done = store.daily?.day === dayKey() && store.daily.done;
                const streak = store.streak && (store.streak.last === dayKey() || store.streak.last === dayKey(new Date(Date.now() - 86400000))) ? store.streak.count : 0;
                const season = currentSeason();
                return (
                  <div className="gc8-row">
                    <button type="button" className={`gc8-daily ${done ? 'done' : ''}`} onClick={() => open(dg.id)} style={{ ['--a' as string]: dg.from, ['--b' as string]: dg.to }}>
                      <small>DAILY CHALLENGE · {new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' })}</small>
                      <b>
                        {dg.glyph} {dg.name}
                      </b>
                      <span>{t?.label ?? 'Finish a game'}</span>
                      <em>{done ? '✓ Completed today' : 'Play ▸'} · 🔥 {streak}-day streak</em>
                    </button>
                    <div className="gc8-season">
                      <small>{season ? 'SEASONAL EVENT' : 'SEASONAL EVENTS'}</small>
                      <b>{season ? `🎉 ${season.name}` : '🗓 Coming up'}</b>
                      <span>{season ? 'Decorations are live on the desktop — play any game to celebrate!' : 'Vesak lanterns, Deepavali lamps, Christmas snow, Avurudu flowers and more appear on their dates.'}</span>
                    </div>
                  </div>
                );
              })()}
              {recent.length > 0 && (
                <>
                  <h2 className="gc-h2">Continue Playing</h2>
                  {grid(recent)}
                </>
              )}
              <h2 className="gc-h2">Leaderboards · {store.name}</h2>
              <div className="gc-boards">
                {GAMES.filter((g) => store.scores[g.id]?.length).slice(0, 8).map((g) => (
                  <div key={g.id} className="gc-board">
                    <div className="gc-board-h">
                      <Icon g={g} />
                      <b>{g.name}</b>
                    </div>
                    <ol>
                      {store.scores[g.id].slice(0, 3).map((r, i) => (
                        <li key={i}>
                          <span>{['🥇', '🥈', '🥉'][i]} {r.name}</span>
                          <b>
                            {r.s} {g.unit ?? ''}
                          </b>
                        </li>
                      ))}
                    </ol>
                  </div>
                ))}
                {!Object.keys(store.scores).length && <p className="gc-dim">Play any game to start your leaderboard. Scores stay on this device.</p>}
              </div>
              <h2 className="gc-h2">All Games</h2>
              {grid(GAMES)}
            </div>
          ) : view.k === 'all' ? (
            <div className="fade-swap">
              <h1 className="gc-h1">Games</h1>
              {grid(GAMES)}
            </div>
          ) : view.k === 'cat' ? (
            <div className="fade-swap">
              <h1 className="gc-h1">{view.c}</h1>
              {grid(GAMES.filter((g) => g.cat === view.c))}
            </div>
          ) : view.k === 'achievements' ? (
            <div className="fade-swap">
              <h1 className="gc-h1">Achievements</h1>
              <div className="gc-ach">
                {ACHIEVEMENTS.map((a) => (
                  <div key={a.id} className={`gc-ach-item ${store.ach.includes(a.id) ? 'on' : ''}`}>
                    <span>{a.glyph}</span>
                    <b>{a.title}</b>
                    <small>{a.desc}</small>
                  </div>
                ))}
              </div>
            </div>
          ) : game ? (
            <div className={`gc-game ${paused ? 'is-paused' : ''}`}>
              <details className="gc-how">
                <summary>How to play</summary>
                <p>{game.how}</p>
              </details>
              <Suspense fallback={<div className="app-loading"><span className="spinner" /></div>}>
                <game.C key={round} api={api} />
              </Suspense>
              {paused && (
                <button type="button" className="gc-paused" onClick={() => setPaused(false)}>
                  ❚❚ Paused — click to resume
                </button>
              )}
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
