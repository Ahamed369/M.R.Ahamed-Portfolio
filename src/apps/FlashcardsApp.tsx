import { useEffect, useMemo, useRef, useState, type KeyboardEvent as RKeyboardEvent, type ReactNode } from 'react';
import { DragBar, Lights } from '../components/Window';
import { BOX_DAYS, DECKS, MASTERED_BOX, type Deck, type DeckGlyph, type FlashCard } from '../data/flashcards';
import { usePersisted, uid } from '../system/useStore';
import { readStore, writeStore } from '../system/storage';
import { notify } from '../system/notify';
import { useWM } from '../system/WindowManager';
import { useSettings } from '../system/SettingsContext';
import type { AppProps } from '../components/Desktop';

/**
 * v10.3 — Flashcards & Quiz: ready-made IT study decks plus visitor decks,
 * Leitner-style spaced repetition, multiple-choice quizzes and simple stats.
 * Everything is stored in this browser only.
 */

/* ───────────────────────────── i18n ───────────────────────────── */

type Lang = 'en' | 'si' | 'ta';
const DICT = {
  title: { en: 'Flashcards', si: 'ෆ්ලෑෂ්කාඩ්', ta: 'ஃபிளாஷ்கார்டுகள்' },
  decks: { en: 'Decks', si: 'කට්ටල', ta: 'தொகுப்புகள்' },
  readyMade: { en: 'Ready-made Decks', si: 'සූදානම් කට්ටල', ta: 'தயார் தொகுப்புகள்' },
  myDecks: { en: 'My Decks', si: 'මගේ කට්ටල', ta: 'எனது தொகுப்புகள்' },
  newDeck: { en: 'New Deck', si: 'නව කට්ටලය', ta: 'புதிய தொகுப்பு' },
  search: { en: 'Search decks & cards', si: 'කට්ටල සහ කාඩ් සොයන්න', ta: 'தொகுப்பு, அட்டைகளைத் தேடு' },
  overview: { en: 'Overview', si: 'දළ විශ්ලේෂණය', ta: 'மேலோட்டம்' },
  streak: { en: 'Day streak', si: 'දින අඛණ්ඩතාව', ta: 'தொடர் நாட்கள்' },
  studiedToday: { en: 'Studied today', si: 'අද අධ්‍යයනය', ta: 'இன்று படித்தவை' },
  dueNow: { en: 'Due now', si: 'දැන් නියමිත', ta: 'இப்போது நிலுவை' },
  mastered: { en: 'Mastered', si: 'ප්‍රගුණ කළ', ta: 'தேர்ச்சி' },
  new: { en: 'New', si: 'නව', ta: 'புதியவை' },
  due: { en: 'Due', si: 'නියමිත', ta: 'நிலுவை' },
  learning: { en: 'Learning', si: 'ඉගෙනුම්', ta: 'கற்கிறது' },
  cards: { en: 'cards', si: 'කාඩ්', ta: 'அட்டைகள்' },
  study: { en: 'Study', si: 'අධ්‍යයනය', ta: 'படி' },
  quiz: { en: 'Quiz', si: 'ප්‍රශ්නාවලිය', ta: 'வினாடி வினா' },
  saveNotes: { en: 'Save to Notes', si: 'සටහන් වෙත සුරකින්න', ta: 'குறிப்புகளில் சேமி' },
  rename: { en: 'Rename', si: 'නම වෙනස් කරන්න', ta: 'பெயர் மாற்று' },
  edit: { en: 'Edit', si: 'සංස්කරණය', ta: 'திருத்து' },
  delete: { en: 'Delete', si: 'මකන්න', ta: 'நீக்கு' },
  cancel: { en: 'Cancel', si: 'අවලංගු කරන්න', ta: 'ரத்து' },
  save: { en: 'Save', si: 'සුරකින්න', ta: 'சேமி' },
  create: { en: 'Create', si: 'සාදන්න', ta: 'உருவாக்கு' },
  copyMine: { en: 'Copy to My Decks', si: 'මගේ කට්ටලවලට පිටපත් කරන්න', ta: 'எனது தொகுப்புகளுக்கு நகலெடு' },
  reset: { en: 'Reset Progress', si: 'ප්‍රගතිය යළි සකසන්න', ta: 'முன்னேற்றத்தை மீட்டமை' },
  addCard: { en: 'Add Card', si: 'කාඩ්පතක් එක් කරන්න', ta: 'அட்டை சேர்' },
  editCard: { en: 'Edit Card', si: 'කාඩ්පත සංස්කරණය', ta: 'அட்டையைத் திருத்து' },
  front: { en: 'Front — question', si: 'ඉදිරිපස — ප්‍රශ්නය', ta: 'முன்பக்கம் — கேள்வி' },
  back: { en: 'Back — answer', si: 'පසුපස — පිළිතුර', ta: 'பின்பக்கம் — பதில்' },
  searchCards: { en: 'Search cards', si: 'කාඩ් සොයන්න', ta: 'அட்டைகளைத் தேடு' },
  noCards: { en: 'No cards yet. Add your first card.', si: 'තවම කාඩ් නැත. පළමු කාඩ්පත එක් කරන්න.', ta: 'இன்னும் அட்டைகள் இல்லை. முதல் அட்டையைச் சேர்க்கவும்.' },
  noMatch: { en: 'No matches', si: 'ගැළපීම් නැත', ta: 'பொருத்தம் இல்லை' },
  showAnswer: { en: 'Show Answer', si: 'පිළිතුර පෙන්වන්න', ta: 'பதிலைக் காட்டு' },
  again: { en: 'Again', si: 'නැවත', ta: 'மீண்டும்' },
  hard: { en: 'Hard', si: 'අමාරු', ta: 'கடினம்' },
  good: { en: 'Good', si: 'හොඳයි', ta: 'நன்று' },
  easy: { en: 'Easy', si: 'පහසුයි', ta: 'எளிது' },
  question: { en: 'Question', si: 'ප්‍රශ්නය', ta: 'கேள்வி' },
  answer: { en: 'Answer', si: 'පිළිතුර', ta: 'பதில்' },
  tapFlip: { en: 'Tap the card to flip', si: 'පෙරළීමට කාඩ්පත තට්ටු කරන්න', ta: 'திருப்ப அட்டையைத் தட்டவும்' },
  sessionDone: { en: 'Session complete', si: 'සැසිය අවසන්', ta: 'அமர்வு முடிந்தது' },
  caughtUp: { en: 'All caught up', si: 'සියල්ල අවසන්', ta: 'அனைத்தும் முடிந்தது' },
  caughtUpBody: { en: 'No cards are due in this deck right now. Come back later, or practise every card now.', si: 'මෙම කට්ටලයේ දැන් නියමිත කාඩ් නැත. පසුව එන්න, නැතහොත් දැන් සියලු කාඩ් පුහුණු වන්න.', ta: 'இந்தத் தொகுப்பில் இப்போது நிலுவை அட்டைகள் இல்லை. பின்னர் வாருங்கள் அல்லது இப்போதே அனைத்தையும் பயிற்சி செய்யுங்கள்.' },
  practiseAll: { en: 'Practise All Cards', si: 'සියලු කාඩ් පුහුණු වන්න', ta: 'அனைத்தையும் பயிற்சி செய்' },
  backToDeck: { en: 'Back to Deck', si: 'කට්ටලයට ආපසු', ta: 'தொகுப்புக்குத் திரும்பு' },
  end: { en: 'End', si: 'අවසන්', ta: 'முடி' },
  next: { en: 'Next', si: 'ඊළඟ', ta: 'அடுத்து' },
  results: { en: 'See Results', si: 'ප්‍රතිඵල බලන්න', ta: 'முடிவுகள்' },
  score: { en: 'Score', si: 'ලකුණු', ta: 'மதிப்பெண்' },
  mistakes: { en: 'Review mistakes', si: 'වැරදි සමාලෝචනය', ta: 'தவறுகளை மீளாய்வு' },
  retryMistakes: { en: 'Retry Mistakes', si: 'වැරදි නැවත උත්සාහ කරන්න', ta: 'தவறுகளை மீண்டும் முயல்' },
  newQuiz: { en: 'New Quiz', si: 'නව ප්‍රශ්නාවලිය', ta: 'புதிய வினாடி வினா' },
  perfect: { en: 'Perfect score — no mistakes!', si: 'පරිපූර්ණ ලකුණු — වැරදි නැත!', ta: 'முழு மதிப்பெண் — தவறுகள் இல்லை!' },
  yourAnswer: { en: 'Your answer', si: 'ඔබේ පිළිතුර', ta: 'உங்கள் பதில்' },
  correctAnswer: { en: 'Correct answer', si: 'නිවැරදි පිළිතුර', ta: 'சரியான பதில்' },
  correct: { en: 'Correct', si: 'නිවැරදියි', ta: 'சரி' },
  incorrect: { en: 'Not quite', si: 'වැරදියි', ta: 'தவறு' },
  needFour: { en: 'Add at least 4 cards to make a quiz.', si: 'ප්‍රශ්නාවලියක් සඳහා අවම වශයෙන් කාඩ් 4ක් එක් කරන්න.', ta: 'வினாடி வினாவிற்கு குறைந்தது 4 அட்டைகள் தேவை.' },
  deleteDeckQ: { en: 'Delete this deck?', si: 'මෙම කට්ටලය මකන්නද?', ta: 'இந்தத் தொகுப்பை நீக்கவா?' },
  deleteDeckBody: { en: 'Its cards and progress will be removed from this browser. This cannot be undone.', si: 'එහි කාඩ් සහ ප්‍රගතිය මෙම බ්‍රවුසරයෙන් ඉවත් වේ. මෙය අහෝසි කළ නොහැක.', ta: 'அதன் அட்டைகளும் முன்னேற்றமும் இந்த உலாவியிலிருந்து நீக்கப்படும். இதைத் திரும்பப்பெற முடியாது.' },
  deleteCardQ: { en: 'Delete this card?', si: 'මෙම කාඩ්පත මකන්නද?', ta: 'இந்த அட்டையை நீக்கவா?' },
  resetQ: { en: 'Reset progress for this deck?', si: 'මෙම කට්ටලයේ ප්‍රගතිය යළි සකසන්නද?', ta: 'இந்தத் தொகுப்பின் முன்னேற்றத்தை மீட்டமைக்கவா?' },
  resetBody: { en: 'All cards become new again and quiz scores are cleared.', si: 'සියලු කාඩ් නැවත නව වන අතර ප්‍රශ්නාවලි ලකුණු මැකේ.', ta: 'எல்லா அட்டைகளும் மீண்டும் புதியதாகும்; வினாடி வினா மதிப்பெண்கள் அழிக்கப்படும்.' },
  deckName: { en: 'Deck name', si: 'කට්ටලයේ නම', ta: 'தொகுப்பின் பெயர்' },
  description: { en: 'Description (optional)', si: 'විස්තරය (අමතර)', ta: 'விளக்கம் (விருப்பம்)' },
  colour: { en: 'Colour', si: 'වර්ණය', ta: 'நிறம்' },
  continueStudy: { en: 'Ready to study', si: 'අධ්‍යයනයට සූදානම්', ta: 'படிக்கத் தயார்' },
  allDone: { en: 'Nothing due right now — great work. New cards are waiting in every deck.', si: 'දැන් කිසිවක් නියමිත නැත — හොඳ වැඩක්.', ta: 'இப்போது நிலுவை எதுவும் இல்லை — அருமை.' },
  bestQuiz: { en: 'Best quiz', si: 'හොඳම ප්‍රශ්නාවලිය', ta: 'சிறந்த வினாடி வினா' },
  emptyMine: { en: 'Create a deck to add your own cards.', si: 'ඔබේම කාඩ් එක් කිරීමට කට්ටලයක් සාදන්න.', ta: 'உங்கள் சொந்த அட்டைகளைச் சேர்க்க ஒரு தொகுப்பை உருவாக்கவும்.' },
  keys: { en: 'Space flip · 1–4 rate · ← → previous / skip', si: 'Space පෙරළන්න · 1–4 ශ්‍රේණිගත කරන්න · ← → පෙර / මඟහරින්න', ta: 'Space திருப்பு · 1–4 மதிப்பிடு · ← → முந்தையது / தவிர்' },
  quizKeys: { en: '1–4 choose · Enter next', si: '1–4 තෝරන්න · Enter ඊළඟ', ta: '1–4 தேர்வு · Enter அடுத்து' },
  week: { en: 'This week', si: 'මෙම සතිය', ta: 'இந்த வாரம்' },
  savedNotes: { en: 'Saved to Notes', si: 'සටහන් වෙත සුරකින ලදී', ta: 'குறிப்புகளில் சேமிக்கப்பட்டது' },
  openNotes: { en: 'Open Notes', si: 'සටහන් විවෘත කරන්න', ta: 'குறிப்புகளைத் திற' },
  copied: { en: 'Deck copied to My Decks', si: 'කට්ටලය මගේ කට්ටලවලට පිටපත් විය', ta: 'தொகுப்பு நகலெடுக்கப்பட்டது' },
  min: { en: '<1 min', si: '<1 මි', ta: '<1 நி' },
  day: { en: 'd', si: 'දි', ta: 'நா' },
  local: { en: 'Progress is saved in this browser only.', si: 'ප්‍රගතිය මෙම බ්‍රවුසරයේ පමණක් සුරැකේ.', ta: 'முன்னேற்றம் இந்த உலாவியில் மட்டுமே சேமிக்கப்படும்.' },
  matches: { en: 'matching cards', si: 'ගැළපෙන කාඩ්', ta: 'பொருந்தும் அட்டைகள்' },
  reviewed: { en: 'reviewed', si: 'සමාලෝචිත', ta: 'மீளாய்வு' },
  of: { en: 'of', si: '/', ta: '/' },
} as const;
type TKey = keyof typeof DICT;

/* ───────────────────────────── model ───────────────────────────── */

interface CardProg {
  box: number;
  due: number;
  n: number;
  lapses: number;
}
type Prog = Record<string, CardProg>;
interface Stats {
  days: Record<string, number>;
  quiz: Record<string, { best: number; last: number }>;
}
type Rating = 'again' | 'hard' | 'good' | 'easy';
const RATINGS: Rating[] = ['again', 'hard', 'good', 'easy'];

const DAY = 86400000;
const NEW_PER_SESSION = 20;
const TINTS: [string, string][] = [
  ['#0a84ff', '#5e5ce6'],
  ['#34c759', '#30b0c7'],
  ['#ff9f0a', '#ff6b3d'],
  ['#ff375f', '#bf5af2'],
  ['#5e5ce6', '#bf5af2'],
  ['#8e8e93', '#48484a'],
];

const dayKey = (t = Date.now()) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const startOfDay = (t = Date.now()) => {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};
const pk = (deckId: string, cardId: string) => `${deckId}:${cardId}`;
function shuffle<T>(a: T[]): T[] {
  const r = a.slice();
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

/** Leitner step: returns the new box and the number of days until the card is due. */
function schedule(p: CardProg | undefined, r: Rating): { box: number; days: number } {
  const box = p?.box ?? 0;
  if (r === 'again') return { box: 0, days: 0 };
  if (r === 'hard') {
    const b = Math.max(1, box);
    return { box: b, days: Math.max(1, Math.round(BOX_DAYS[b] / 2)) };
  }
  if (r === 'good') {
    const b = Math.min(BOX_DAYS.length - 1, box + 1);
    return { box: b, days: BOX_DAYS[b] };
  }
  const b = Math.min(BOX_DAYS.length - 1, box + 2);
  return { box: b, days: Math.round(BOX_DAYS[b] * 1.3) };
}

function counts(d: Deck, prog: Prog, now: number) {
  let fresh = 0;
  let due = 0;
  let learn = 0;
  let mast = 0;
  for (const c of d.cards) {
    const p = prog[pk(d.id, c.id)];
    if (!p) fresh++;
    else {
      if (p.due <= now) due++;
      if (p.box >= MASTERED_BOX) mast++;
      else learn++;
    }
  }
  const total = d.cards.length;
  return { fresh, due, learn, mast, total, pct: total ? Math.round((mast / total) * 100) : 0, ready: due + Math.min(fresh, NEW_PER_SESSION) };
}

function streakOf(days: Record<string, number>): number {
  let t = Date.now();
  if (!days[dayKey(t)]) t -= DAY;
  let n = 0;
  while (days[dayKey(t)]) {
    n++;
    t -= DAY;
  }
  return n;
}

interface Session {
  queue: string[];
  i: number;
  flipped: boolean;
  tally: Record<Rating, number>;
  caughtUp: boolean;
}
interface QuizQ {
  cardId: string;
  q: string;
  a: string;
  opts: string[];
  pick: number | null;
}
interface Quiz {
  qs: QuizQ[];
  i: number;
  done: boolean;
}

function makeQuiz(deck: Deck, only?: string[]): Quiz {
  const pool = only ? deck.cards.filter((c) => only.includes(c.id)) : shuffle(deck.cards).slice(0, 10);
  const qs = shuffle(pool).map((c) => {
    const others = Array.from(new Set(deck.cards.filter((o) => o.id !== c.id && o.a.trim() !== c.a.trim()).map((o) => o.a)));
    const opts = shuffle([c.a, ...shuffle(others).slice(0, 3)]);
    return { cardId: c.id, q: c.q, a: c.a, opts, pick: null };
  });
  return { qs, i: 0, done: false };
}

/* ───────────────────────────── icons ───────────────────────────── */

const GLYPH: Record<DeckGlyph, ReactNode> = {
  code: <path d="M8.5 7 4 12l4.5 5M15.5 7 20 12l-4.5 5M13.2 5.5l-2.4 13" />,
  braces: <path d="M9 4.5h-.6C7 4.5 6.4 5.2 6.4 6.6v3c0 1.3-.7 2-1.9 2.4 1.2.4 1.9 1.1 1.9 2.4v3c0 1.4.6 2.1 2 2.1H9M15 4.5h.6c1.4 0 2 .7 2 2.1v3c0 1.3.7 2 1.9 2.4-1.2.4-1.9 1.1-1.9 2.4v3c0 1.4-.6 2.1-2 2.1H15" />,
  prompt: <path d="M6.5 4.5h11a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2v-11a2 2 0 0 1 2-2zM8.2 9.5l2.6 2.5-2.6 2.5M12.8 15h3.4" />,
  cards: <path d="M7.5 6.5h9a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2zM8.5 3.8h7.8a3 3 0 0 1 3 3" />,
  layout: <path d="M6 4.5h12A1.5 1.5 0 0 1 19.5 6v12a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 18V6A1.5 1.5 0 0 1 6 4.5zM4.5 9h15M10 9v10.5" />,
  components: <path d="M5.5 4h3.5a1.5 1.5 0 0 1 1.5 1.5V9A1.5 1.5 0 0 1 9 10.5H5.5A1.5 1.5 0 0 1 4 9V5.5A1.5 1.5 0 0 1 5.5 4zM15 13.5h3.5a1.5 1.5 0 0 1 1.5 1.5v3.5a1.5 1.5 0 0 1-1.5 1.5H15a1.5 1.5 0 0 1-1.5-1.5V15a1.5 1.5 0 0 1 1.5-1.5zM10.5 7.2h3.2a3 3 0 0 1 3 3v3.3M7.2 10.5v6.3a1.5 1.5 0 0 0 1.5 1.5h4.8" />,
  db: <path d="M5 6.5c0-1.5 3.1-2.7 7-2.7s7 1.2 7 2.7-3.1 2.7-7 2.7-7-1.2-7-2.7zM5 6.5v11c0 1.5 3.1 2.7 7 2.7s7-1.2 7-2.7v-11M5 12c0 1.5 3.1 2.7 7 2.7s7-1.2 7-2.7" />,
  branch: <path d="M7 4.2a1.8 1.8 0 1 1 0 3.6 1.8 1.8 0 0 1 0-3.6zM7 16.2a1.8 1.8 0 1 1 0 3.6 1.8 1.8 0 0 1 0-3.6zM17 6.2a1.8 1.8 0 1 1 0 3.6 1.8 1.8 0 0 1 0-3.6zM7 7.8v8.4M17 9.8c0 4.2-10 2.3-10 6.4" />,
  globe: <path d="M12 4a8 8 0 1 1 0 16 8 8 0 0 1 0-16zM4 12h16M12 4c-2.8 2.6-2.8 13.4 0 16M12 4c2.8 2.6 2.8 13.4 0 16" />,
  cube: <path d="M12 3.6 19.4 7.8v8.4L12 20.4l-7.4-4.2V7.8zM4.6 7.8 12 12l7.4-4.2M12 12v8.4" />,
  tree: <path d="M12 3.4a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM6.5 10.6a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM17.5 10.6a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM4.5 17.6a1.6 1.6 0 1 1 0 3.2 1.6 1.6 0 0 1 0-3.2zM9 17.6a1.6 1.6 0 1 1 0 3.2 1.6 1.6 0 0 1 0-3.2zM10.7 6.9l-3 4M13.3 6.9l3 4M5.9 14.5l-.9 3.2M7.2 14.5l1.2 3.2" />,
  shield: <path d="M12 3.5 18.8 6v5.4c0 4.3-2.9 7.8-6.8 9.1-3.9-1.3-6.8-4.8-6.8-9.1V6zM9 12l2.1 2.1 4-4.2" />,
  stack: <path d="M12 4 20 8l-8 4-8-4zM4 12l8 4 8-4M4 16l8 4 8-4" />,
};

function Glyph({ deck, size = 34 }: { deck: Deck; size?: number }) {
  return (
    <span className="fc-glyph" style={{ width: size, height: size, background: `linear-gradient(145deg, ${deck.tint[0]}, ${deck.tint[1]})` }} aria-hidden="true">
      <svg viewBox="0 0 24 24">{GLYPH[deck.glyph] ?? GLYPH.cards}</svg>
    </span>
  );
}

const I = {
  plus: <path d="M12 5v14M5 12h14" />,
  back: <path d="M14.5 5.5 8 12l6.5 6.5" />,
  search: <path d="M10.5 4.5a6 6 0 1 1 0 12 6 6 0 0 1 0-12zM15 15l4.5 4.5" />,
  pencil: <path d="M14.8 5.2l4 4L8.6 19.4 4.5 19.5l.1-4.1zM12.8 7.2l4 4" />,
  trash: <path d="M5 7h14M10 7V5.2h4V7M7 7l.8 12.2c.1.8.7 1.3 1.4 1.3h5.6c.7 0 1.3-.5 1.4-1.3L17 7M10.2 10.5v6.5M13.8 10.5v6.5" />,
  flame: <path d="M12 3.5c.6 3-2.4 4.5-3.6 7-1.2 2.6-.4 5.6 1.4 7.2-1-2.4.6-4.1 2.2-5.4.4 1.8 1.6 2.6 2.4 3.6.8 1 .7 2.4.1 3.3 2.6-1.1 4-3.6 3.6-6.6-.4-3.4-3.3-5.4-4.4-6.6-.6-.7-1.2-1.6-1.7-2.5z" />,
  check: <path d="M5.5 12.5l4.2 4.2 8.8-9.2" />,
  x: <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />,
  notes: <path d="M7 4.5h10A1.5 1.5 0 0 1 18.5 6v12a1.5 1.5 0 0 1-1.5 1.5H7A1.5 1.5 0 0 1 5.5 18V6A1.5 1.5 0 0 1 7 4.5zM8.5 9h7M8.5 12.5h7M8.5 16h4" />,
  copy: <path d="M9 8.5h8.5A1.5 1.5 0 0 1 19 10v8.5a1.5 1.5 0 0 1-1.5 1.5H9a1.5 1.5 0 0 1-1.5-1.5V10A1.5 1.5 0 0 1 9 8.5zM5 15V5.5A1.5 1.5 0 0 1 6.5 4H15" />,
  reset: <path d="M5.5 12a6.5 6.5 0 1 0 2-4.7M5.5 4.5v3.3h3.3" />,
  quiz: <path d="M12 4a8 8 0 1 1 0 16 8 8 0 0 1 0-16zM9.6 9.6c.2-1.4 1.2-2.2 2.5-2.2 1.4 0 2.5.9 2.5 2.2 0 1.8-2.6 2-2.6 3.8M12 16.3v.2" />,
  play: <path d="M8.5 5.8v12.4c0 .7.8 1.1 1.4.7l9-6.2c.5-.4.5-1.1 0-1.4l-9-6.2c-.6-.4-1.4 0-1.4.7z" />,
  bolt: <path d="M13 3.5 5.5 13.5H12L11 20.5l7.5-10H12z" />,
};
function Ic({ n, cls }: { n: keyof typeof I; cls?: string }) {
  return (
    <svg className={`fc-ic ${cls ?? ''}`} viewBox="0 0 24 24" aria-hidden="true">
      {I[n]}
    </svg>
  );
}

/* ───────────────────────────── app ───────────────────────────── */

type View = 'deck' | 'study' | 'quiz';
type Sheet =
  | { kind: 'deck'; id?: string; title: string; desc: string; tint: number }
  | { kind: 'card'; deckId: string; id?: string; q: string; a: string }
  | { kind: 'confirm'; title: string; body?: string; ok: string; run: () => void };

export default function FlashcardsApp({ win }: Partial<AppProps>) {
  const wm = useWM();
  const { settings, motionReduced } = useSettings();
  const lang: Lang = settings.language === 'si' || settings.language === 'ta' ? settings.language : 'en';
  const t = (k: TKey) => DICT[k][lang];

  const [mine, setMine] = usePersisted<Deck[]>('mra-flashcards-v1', []);
  const [prog, setProg] = usePersisted<Prog>('mra-flashcards-progress-v1', {});
  const [stats, setStats] = usePersisted<Stats>('mra-flashcards-stats-v1', { days: {}, quiz: {} });

  const all = useMemo(() => [...DECKS, ...mine], [mine]);
  const [sel, setSel] = useState<string | null>(() => {
    const a = win?.args?.deck;
    return typeof a === 'string' ? a : null;
  });
  const [view, setView] = useState<View>('deck');
  const [q, setQ] = useState('');
  const [cardQ, setCardQ] = useState('');
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const rootRef = useRef<HTMLDivElement>(null);
  const studyRef = useRef<HTMLDivElement>(null);

  // Re-evaluate "due" every minute so cards come back on time.
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60000);
    return () => window.clearInterval(id);
  }, []);

  const deck = all.find((d) => d.id === sel) ?? null;
  useEffect(() => {
    if (sel && !deck) setSel(null);
  }, [sel, deck]);

  useEffect(() => {
    if (view !== 'deck') studyRef.current?.focus({ preventScroll: true });
  }, [view, session?.i, quiz?.i]);

  const bump = (n = 1) =>
    setStats((s) => {
      const k = dayKey();
      return { ...s, days: { ...s.days, [k]: (s.days[k] ?? 0) + n } };
    });

  /* ── navigation ── */
  const openDeck = (id: string) => {
    setSel(id);
    setView('deck');
    setSession(null);
    setQuiz(null);
    setCardQ(q.trim());
    setNow(Date.now());
  };
  const goBack = () => {
    if (view !== 'deck') {
      setView('deck');
      setSession(null);
      setQuiz(null);
      setNow(Date.now());
    } else setSel(null);
  };

  /* ── study ── */
  const startStudy = (d: Deck, cram = false) => {
    const n = Date.now();
    let queue: string[];
    if (cram) queue = shuffle(d.cards).map((c) => c.id);
    else {
      const due = d.cards
        .filter((c) => {
          const p = prog[pk(d.id, c.id)];
          return p && p.due <= n;
        })
        .sort((a, b) => {
          const pa = prog[pk(d.id, a.id)];
          const pb = prog[pk(d.id, b.id)];
          return pa.box - pb.box || pa.due - pb.due;
        });
      const fresh = d.cards.filter((c) => !prog[pk(d.id, c.id)]).slice(0, NEW_PER_SESSION);
      queue = [...due, ...fresh].map((c) => c.id);
    }
    setSession({ queue, i: 0, flipped: false, tally: { again: 0, hard: 0, good: 0, easy: 0 }, caughtUp: !queue.length });
    setQuiz(null);
    setView('study');
  };
  const flip = () => setSession((s) => (s && s.i < s.queue.length ? { ...s, flipped: !s.flipped } : s));
  const rate = (r: Rating) => {
    if (!deck || !session || !session.flipped || session.i >= session.queue.length) return;
    const cid = session.queue[session.i];
    const key = pk(deck.id, cid);
    const cur = prog[key];
    const s = schedule(cur, r);
    const n = Date.now();
    setProg((p) => ({ ...p, [key]: { box: s.box, due: r === 'again' ? n : startOfDay(n) + s.days * DAY, n: (cur?.n ?? 0) + 1, lapses: (cur?.lapses ?? 0) + (r === 'again' ? 1 : 0) } }));
    bump();
    setSession((ss) => {
      if (!ss) return ss;
      const queue = ss.queue.slice();
      if (r === 'again') queue.splice(Math.min(queue.length, ss.i + 4), 0, cid);
      return { ...ss, queue, i: ss.i + 1, flipped: false, tally: { ...ss.tally, [r]: ss.tally[r] + 1 } };
    });
  };
  const prevCard = () => setSession((s) => (s && s.i > 0 ? { ...s, i: s.i - 1, flipped: false } : s));
  const skipCard = () =>
    setSession((s) => {
      if (!s || s.i >= s.queue.length - 1) return s;
      const queue = s.queue.slice();
      const [c] = queue.splice(s.i, 1);
      queue.push(c);
      return { ...s, queue, flipped: false };
    });

  /* ── quiz ── */
  const startQuiz = (d: Deck, only?: string[]) => {
    if (d.cards.length < 4) return;
    setQuiz(makeQuiz(d, only));
    setSession(null);
    setView('quiz');
  };
  const pick = (i: number) => {
    setQuiz((z) => {
      if (!z || z.done) return z;
      const cur = z.qs[z.i];
      if (!cur || cur.pick !== null || i >= cur.opts.length) return z;
      const qs = z.qs.slice();
      qs[z.i] = { ...cur, pick: i };
      return { ...z, qs };
    });
    bump();
  };
  const nextQ = () => {
    if (!quiz || !deck) return;
    const cur = quiz.qs[quiz.i];
    if (!cur || cur.pick === null) return;
    if (quiz.i + 1 < quiz.qs.length) setQuiz({ ...quiz, i: quiz.i + 1 });
    else {
      const right = quiz.qs.filter((x) => x.pick !== null && x.opts[x.pick] === x.a).length;
      const pct = Math.round((right / quiz.qs.length) * 100);
      setStats((s) => ({ ...s, quiz: { ...s.quiz, [deck.id]: { best: Math.max(s.quiz[deck.id]?.best ?? 0, pct), last: pct } } }));
      setQuiz({ ...quiz, done: true });
    }
  };

  /* ── deck & card editing ── */
  const saveSheet = () => {
    if (!sheet) return;
    if (sheet.kind === 'deck') {
      const title = sheet.title.trim();
      if (!title) return;
      if (sheet.id) {
        const id = sheet.id;
        setMine((m) => m.map((d) => (d.id === id ? { ...d, title, desc: sheet.desc.trim(), tint: TINTS[sheet.tint] } : d)));
      } else {
        const id = uid('u');
        setMine((m) => [...m, { id, title, desc: sheet.desc.trim(), glyph: 'cards', tint: TINTS[sheet.tint], cards: [] }]);
        openDeck(id);
      }
    } else if (sheet.kind === 'card') {
      const qq = sheet.q.trim();
      const aa = sheet.a.trim();
      if (!qq || !aa) return;
      const { deckId, id } = sheet;
      setMine((m) => m.map((d) => (d.id !== deckId ? d : { ...d, cards: id ? d.cards.map((c) => (c.id === id ? { ...c, q: qq, a: aa } : c)) : [...d.cards, { id: uid('c'), q: qq, a: aa }] })));
      if (!id) {
        setSheet({ kind: 'card', deckId, q: '', a: '' });
        return;
      }
    }
    setSheet(null);
  };
  const clearProgress = (deckId: string, cardId?: string) => {
    setProg((p) => {
      const n: Prog = {};
      for (const [k, v] of Object.entries(p)) if (cardId ? k !== pk(deckId, cardId) : !k.startsWith(`${deckId}:`)) n[k] = v;
      return n;
    });
    if (!cardId)
      setStats((s) => {
        const quizStats = { ...s.quiz };
        delete quizStats[deckId];
        return { ...s, quiz: quizStats };
      });
  };
  const deleteDeck = (d: Deck) =>
    setSheet({
      kind: 'confirm',
      title: t('deleteDeckQ'),
      body: `“${d.title}” — ${t('deleteDeckBody')}`,
      ok: t('delete'),
      run: () => {
        setMine((m) => m.filter((x) => x.id !== d.id));
        clearProgress(d.id);
        setSel(null);
      },
    });
  const deleteCard = (d: Deck, c: FlashCard) =>
    setSheet({
      kind: 'confirm',
      title: t('deleteCardQ'),
      body: c.q,
      ok: t('delete'),
      run: () => {
        setMine((m) => m.map((x) => (x.id === d.id ? { ...x, cards: x.cards.filter((y) => y.id !== c.id) } : x)));
        clearProgress(d.id, c.id);
      },
    });
  const copyDeck = (d: Deck) => {
    const id = uid('u');
    setMine((m) => [...m, { id, title: d.title, desc: d.desc, glyph: d.glyph, tint: d.tint, cards: d.cards.map((c) => ({ ...c })) }]);
    openDeck(id);
    notify({ app: 'Flashcards', icon: 'flashcards', title: t('copied'), body: d.title });
  };
  const saveToNotes = (d: Deck) => {
    const c = counts(d, prog, Date.now());
    const best = stats.quiz[d.id];
    const cur = readStore<{ list: { id: string; title: string; body: string; at: number }[] }>('mra-notes-mine', { list: [] }).list ?? [];
    const body = `${d.desc ? `${d.desc}\n\n` : ''}Progress: ${c.mast}/${c.total} mastered (${c.pct}%) · ${c.learn} learning · ${c.fresh} new · ${c.due} due${best ? `\nBest quiz score: ${best.best}%` : ''}\n\n${d.cards.map((x, i) => `${i + 1}. ${x.q}\n   → ${x.a}`).join('\n\n')}`;
    writeStore('mra-notes-mine', { list: [{ id: `m${Date.now()}`, title: `Flashcards: ${d.title}`, body, at: Date.now() }, ...cur] });
    notify({ app: 'Notes', icon: 'notes', title: t('savedNotes'), body: `Flashcards: ${d.title}`, actions: [{ label: t('openNotes'), run: () => wm.open('notes') }] });
  };

  /* ── keyboard ── */
  const onKey = (e: RKeyboardEvent<HTMLDivElement>) => {
    const tg = e.target as HTMLElement;
    if (tg.closest('input, textarea, select, [contenteditable="true"]')) return;
    if (sheet) {
      if (e.key === 'Escape') setSheet(null);
      return;
    }
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (view === 'study' && session && !session.caughtUp && session.i < session.queue.length) {
      if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        flip();
      } else if (/^[1-4]$/.test(e.key)) {
        e.preventDefault();
        rate(RATINGS[Number(e.key) - 1]);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prevCard();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        skipCard();
      } else if (e.key === 'Escape') goBack();
    } else if (view === 'quiz' && quiz && !quiz.done) {
      if (/^[1-4]$/.test(e.key)) {
        e.preventDefault();
        pick(Number(e.key) - 1);
      } else if (e.key === 'Enter' || e.key === 'ArrowRight') {
        e.preventDefault();
        nextQ();
      } else if (e.key === 'Escape') goBack();
    } else if (e.key === 'Escape' && view !== 'deck') goBack();
  };

  /* ── derived ── */
  const today = stats.days[dayKey()] ?? 0;
  const streak = streakOf(stats.days);
  const totals = useMemo(() => {
    let ready = 0;
    let mast = 0;
    let total = 0;
    for (const d of all) {
      const c = counts(d, prog, now);
      ready += c.due;
      mast += c.mast;
      total += c.total;
    }
    return { due: ready, mast, total };
  }, [all, prog, now]);
  const ql = q.trim().toLowerCase();
  const matchCount = (d: Deck) => (ql ? d.cards.filter((c) => `${c.q} ${c.a}`.toLowerCase().includes(ql)).length : 0);
  const deckVisible = (d: Deck) => !ql || d.title.toLowerCase().includes(ql) || matchCount(d) > 0;

  const barTitle = view === 'study' ? t('study') : view === 'quiz' ? t('quiz') : deck ? deck.title : t('title');

  const deckRow = (d: Deck) => {
    const c = counts(d, prog, now);
    const m = matchCount(d);
    return (
      <button key={d.id} type="button" className={`fc-row ${sel === d.id ? 'on' : ''}`} onClick={() => openDeck(d.id)} aria-current={sel === d.id ? 'true' : undefined}>
        <Glyph deck={d} />
        <span className="fc-row-t">
          <b>{d.title}</b>
          <small>{ql && m ? `${m} ${t('matches')}` : `${c.total} ${t('cards')} · ${c.pct}% ${t('mastered').toLowerCase()}`}</small>
        </span>
        {c.due > 0 ? <span className="fc-badge">{c.due}</span> : c.total > 0 && c.mast === c.total ? <Ic n="check" cls="fc-done" /> : null}
      </button>
    );
  };

  return (
    <div ref={rootRef} className={`fc ${sel ? 'has-sel' : ''} ${motionReduced ? 'rm' : ''}`} onKeyDown={onKey} tabIndex={-1}>
      <DragBar className="fc-bar">
        <Lights />
        {sel && (
          <button type="button" className="fc-back" onClick={goBack} data-nodrag>
            <Ic n="back" />
            <span>{view === 'deck' ? t('decks') : t('backToDeck')}</span>
          </button>
        )}
        <b className="fc-bar-t">{barTitle}</b>
        <span className="fc-bar-sp" />
        <button type="button" className="fc-iconbtn" onClick={() => setSheet({ kind: 'deck', title: '', desc: '', tint: mine.length % TINTS.length })} aria-label={t('newDeck')} title={t('newDeck')} data-nodrag>
          <Ic n="plus" />
        </button>
      </DragBar>
      <div className="fc-body">
        <nav className="fc-side" aria-label={t('decks')}>
          <label className="fc-search">
            <Ic n="search" />
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('search')} aria-label={t('search')} />
          </label>
          <div className="fc-today">
            <div>
              <Ic n="flame" cls="fc-flame" />
              <b>{streak}</b>
              <small>{t('streak')}</small>
            </div>
            <div>
              <Ic n="bolt" cls="fc-bolt" />
              <b>{today}</b>
              <small>{t('studiedToday')}</small>
            </div>
            <div>
              <Ic n="check" cls="fc-chk" />
              <b>{totals.due}</b>
              <small>{t('dueNow')}</small>
            </div>
          </div>
          <h3>{t('readyMade')}</h3>
          {DECKS.filter(deckVisible).map(deckRow)}
          {ql && !DECKS.some(deckVisible) && <p className="fc-empty-s">{t('noMatch')}</p>}
          <h3>
            {t('myDecks')}
            <button type="button" className="fc-mini" onClick={() => setSheet({ kind: 'deck', title: '', desc: '', tint: mine.length % TINTS.length })} aria-label={t('newDeck')}>
              <Ic n="plus" />
            </button>
          </h3>
          {mine.filter(deckVisible).map(deckRow)}
          {!mine.length && (
            <button type="button" className="fc-newcta" onClick={() => setSheet({ kind: 'deck', title: '', desc: '', tint: 0 })}>
              <Ic n="plus" />
              <span>
                <b>{t('newDeck')}</b>
                <small>{t('emptyMine')}</small>
              </span>
            </button>
          )}
          <p className="fc-local">{t('local')}</p>
        </nav>
        <main className="fc-main" ref={studyRef} tabIndex={-1}>
          {!deck && Overview()}
          {deck && view === 'deck' && DeckView({ d: deck })}
          {deck && view === 'study' && session && StudyView({ d: deck, s: session })}
          {deck && view === 'quiz' && quiz && QuizView({ d: deck, z: quiz })}
        </main>
      </div>
      {sheet && SheetView()}
    </div>
  );

  /* ───────────── sub-views (closures over state) ───────────── */

  function Overview() {
    const ready = all.map((d) => ({ d, c: counts(d, prog, now) })).filter((x) => x.c.due > 0);
    const week = Array.from({ length: 7 }, (_, i) => {
      const ts = Date.now() - (6 - i) * DAY;
      return { k: dayKey(ts), n: stats.days[dayKey(ts)] ?? 0, label: new Date(ts).toLocaleDateString(lang === 'en' ? undefined : lang, { weekday: 'narrow' }) };
    });
    const pct = totals.total ? Math.round((totals.mast / totals.total) * 100) : 0;
    return (
      <div className="fc-ov">
        <h1>{t('overview')}</h1>
        <div className="fc-tiles">
          <div className="fc-tile">
            <Ic n="flame" cls="fc-flame" />
            <b>{streak}</b>
            <small>{t('streak')}</small>
          </div>
          <div className="fc-tile">
            <Ic n="bolt" cls="fc-bolt" />
            <b>{today}</b>
            <small>{t('studiedToday')}</small>
          </div>
          <div className="fc-tile">
            <Ic n="check" cls="fc-chk" />
            <b>{pct}%</b>
            <small>
              {t('mastered')} · {totals.mast}/{totals.total}
            </small>
          </div>
        </div>
        <section className="fc-week" aria-label={t('week')}>
          <h4>{t('week')}</h4>
          <div>
            {week.map((w) => (
              <span key={w.k} className={`${w.n ? 'on' : ''} ${w.k === dayKey() ? 'today' : ''}`} title={`${w.k}: ${w.n}`}>
                <i>{w.n || ''}</i>
                <small>{w.label}</small>
              </span>
            ))}
          </div>
        </section>
        <h4>{t('continueStudy')}</h4>
        {ready.length ? (
          <div className="fc-ready">
            {ready.map(({ d, c }) => (
              <button key={d.id} type="button" onClick={() => (openDeck(d.id), startStudy(d))}>
                <Glyph deck={d} size={30} />
                <span>
                  <b>{d.title}</b>
                  <small>
                    {c.due} {t('due').toLowerCase()}
                  </small>
                </span>
                <Ic n="play" cls="fc-play" />
              </button>
            ))}
          </div>
        ) : (
          <p className="fc-hint">{t('allDone')}</p>
        )}
        <h4>{t('readyMade')}</h4>
        <div className="fc-grid">
          {DECKS.map((d) => {
            const c = counts(d, prog, now);
            return (
              <button key={d.id} type="button" className="fc-gcard" onClick={() => openDeck(d.id)}>
                <Glyph deck={d} size={38} />
                <b>{d.title}</b>
                <small>{d.desc}</small>
                <span className="fc-meter" aria-label={`${c.pct}% ${t('mastered')}`}>
                  <i style={{ width: `${c.pct}%` }} />
                </span>
                <em>
                  {c.total} {t('cards')} · {c.pct}%
                </em>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  function DeckView({ d }: { d: Deck }) {
    const c = counts(d, prog, now);
    const editable = !d.builtin;
    const cl = cardQ.trim().toLowerCase();
    const cards = cl ? d.cards.filter((x) => `${x.q} ${x.a}`.toLowerCase().includes(cl)) : d.cards;
    const best = stats.quiz[d.id];
    return (
      <div className="fc-deck">
        <header className="fc-dh">
          <Glyph deck={d} size={56} />
          <div>
            <h1>{d.title}</h1>
            {d.desc && <p>{d.desc}</p>}
            <small>
              {c.total} {t('cards')}
              {best ? ` · ${t('bestQuiz')} ${best.best}%` : ''}
            </small>
          </div>
        </header>
        <div className="fc-chips">
          <span className="ch-new">
            <b>{c.fresh}</b>
            {t('new')}
          </span>
          <span className="ch-due">
            <b>{c.due}</b>
            {t('due')}
          </span>
          <span className="ch-learn">
            <b>{c.learn}</b>
            {t('learning')}
          </span>
          <span className="ch-mast">
            <b>{c.mast}</b>
            {t('mastered')}
          </span>
        </div>
        <div className="fc-prog" role="progressbar" aria-valuenow={c.pct} aria-valuemin={0} aria-valuemax={100} aria-label={t('mastered')}>
          <i className="p-mast" style={{ width: `${c.total ? (c.mast / c.total) * 100 : 0}%` }} />
          <i className="p-learn" style={{ width: `${c.total ? (c.learn / c.total) * 100 : 0}%` }} />
          <span>
            {c.pct}% {t('mastered').toLowerCase()}
          </span>
        </div>
        <div className="fc-actions">
          <button type="button" className="fc-primary" onClick={() => startStudy(d)} disabled={!c.total}>
            <Ic n="play" cls="fill" />
            {t('study')}
            {c.ready > 0 && <span className="fc-count">{c.ready}</span>}
          </button>
          <button type="button" className="fc-secondary" onClick={() => startQuiz(d)} disabled={d.cards.length < 4} title={d.cards.length < 4 ? t('needFour') : undefined}>
            <Ic n="quiz" />
            {t('quiz')}
          </button>
          <button type="button" className="fc-ghost" onClick={() => saveToNotes(d)} disabled={!c.total}>
            <Ic n="notes" />
            {t('saveNotes')}
          </button>
          {editable ? (
            <>
              <button type="button" className="fc-ghost" onClick={() => setSheet({ kind: 'deck', id: d.id, title: d.title, desc: d.desc, tint: Math.max(0, TINTS.findIndex((x) => x[0] === d.tint[0] && x[1] === d.tint[1])) })}>
                <Ic n="pencil" />
                {t('rename')}
              </button>
              <button type="button" className="fc-ghost danger" onClick={() => deleteDeck(d)}>
                <Ic n="trash" />
                {t('delete')}
              </button>
            </>
          ) : (
            <button type="button" className="fc-ghost" onClick={() => copyDeck(d)}>
              <Ic n="copy" />
              {t('copyMine')}
            </button>
          )}
          {Object.keys(prog).some((k) => k.startsWith(`${d.id}:`)) && (
            <button type="button" className="fc-ghost" onClick={() => setSheet({ kind: 'confirm', title: t('resetQ'), body: t('resetBody'), ok: t('reset'), run: () => clearProgress(d.id) })}>
              <Ic n="reset" />
              {t('reset')}
            </button>
          )}
        </div>
        {d.cards.length < 4 && <p className="fc-hint">{t('needFour')}</p>}
        <div className="fc-listhead">
          <label className="fc-search">
            <Ic n="search" />
            <input type="search" value={cardQ} onChange={(e) => setCardQ(e.target.value)} placeholder={t('searchCards')} aria-label={t('searchCards')} />
          </label>
          {editable && (
            <button type="button" className="fc-secondary" onClick={() => setSheet({ kind: 'card', deckId: d.id, q: '', a: '' })}>
              <Ic n="plus" />
              {t('addCard')}
            </button>
          )}
        </div>
        <ul className="fc-cards">
          {cards.map((x) => {
            const p = prog[pk(d.id, x.id)];
            const box = p?.box ?? -1;
            return (
              <li key={x.id}>
                <div className="fc-cq">
                  <b>{x.q}</b>
                  <span>{x.a}</span>
                </div>
                <span className="fc-boxes" title={p ? `${t('learning')} ${box}/${BOX_DAYS.length - 1}` : t('new')} aria-label={p ? `${box}/${BOX_DAYS.length - 1}` : t('new')}>
                  {BOX_DAYS.slice(1).map((_, i) => (
                    <i key={i} className={i < box ? (box >= MASTERED_BOX ? 'm' : 'l') : ''} />
                  ))}
                </span>
                {editable && (
                  <span className="fc-rowbtns">
                    <button type="button" onClick={() => setSheet({ kind: 'card', deckId: d.id, id: x.id, q: x.q, a: x.a })} aria-label={`${t('edit')}: ${x.q}`}>
                      <Ic n="pencil" />
                    </button>
                    <button type="button" className="danger" onClick={() => deleteCard(d, x)} aria-label={`${t('delete')}: ${x.q}`}>
                      <Ic n="trash" />
                    </button>
                  </span>
                )}
              </li>
            );
          })}
        </ul>
        {!d.cards.length && <p className="fc-empty">{t('noCards')}</p>}
        {!!d.cards.length && !cards.length && <p className="fc-empty">{t('noMatch')}</p>}
      </div>
    );
  }

  function StudyView({ d, s }: { d: Deck; s: Session }) {
    if (s.caughtUp)
      return (
        <div className="fc-end">
          <span className="fc-endic ok">
            <Ic n="check" />
          </span>
          <h2>{t('caughtUp')}</h2>
          <p>{t('caughtUpBody')}</p>
          <div className="fc-actions center">
            <button type="button" className="fc-primary" onClick={() => startStudy(d, true)}>
              {t('practiseAll')}
            </button>
            <button type="button" className="fc-secondary" onClick={goBack}>
              {t('backToDeck')}
            </button>
          </div>
        </div>
      );
    if (s.i >= s.queue.length) {
      const total = RATINGS.reduce((a, r) => a + s.tally[r], 0);
      const c = counts(d, prog, now);
      return (
        <div className="fc-end">
          <span className="fc-endic ok">
            <Ic n="check" />
          </span>
          <h2>{t('sessionDone')}</h2>
          <p>
            {total} {t('reviewed')} · {c.pct}% {t('mastered').toLowerCase()}
          </p>
          <div className="fc-tally">
            {RATINGS.map((r) => (
              <span key={r} className={`r-${r}`}>
                <b>{s.tally[r]}</b>
                {t(r)}
              </span>
            ))}
          </div>
          <div className="fc-actions center">
            {c.ready > 0 ? (
              <button type="button" className="fc-primary" onClick={() => startStudy(d)}>
                {t('study')} · {c.ready}
              </button>
            ) : (
              <button type="button" className="fc-primary" onClick={() => startStudy(d, true)}>
                {t('practiseAll')}
              </button>
            )}
            {d.cards.length >= 4 && (
              <button type="button" className="fc-secondary" onClick={() => startQuiz(d)}>
                {t('quiz')}
              </button>
            )}
            <button type="button" className="fc-ghost" onClick={goBack}>
              {t('backToDeck')}
            </button>
          </div>
        </div>
      );
    }
    const card = d.cards.find((c) => c.id === s.queue[s.i]);
    if (!card) {
      // Card was deleted mid-session — skip it.
      queueMicrotask(() => setSession((ss) => (ss ? { ...ss, queue: ss.queue.filter((id) => d.cards.some((c) => c.id === id)) } : ss)));
      return null;
    }
    const p = prog[pk(d.id, card.id)];
    const ivl = (r: Rating) => {
      if (r === 'again') return t('min');
      return `${schedule(p, r).days}${t('day')}`;
    };
    return (
      <div className="fc-study">
        <div className="fc-sbar">
          <span>
            {s.i + 1} {t('of')} {s.queue.length}
          </span>
          <span className="fc-sprog">
            <i style={{ width: `${(s.i / s.queue.length) * 100}%` }} />
          </span>
          <button type="button" className="fc-ghost sm" onClick={goBack}>
            {t('end')}
          </button>
        </div>
        <div className="fc-stage">
          <div
            key={`${s.i}-${card.id}`}
            className={`fc-card ${s.flipped ? 'flipped' : ''}`}
            role="button"
            tabIndex={0}
            aria-label={s.flipped ? `${t('answer')}: ${card.a}` : `${t('question')}: ${card.q}. ${t('tapFlip')}`}
            onClick={flip}
          >
            <div className="fc-flip">
              <div className="fc-face front" style={{ ['--t0' as string]: d.tint[0], ['--t1' as string]: d.tint[1] }}>
                <small>{t('question')}</small>
                <p>{card.q}</p>
                <em>{t('tapFlip')}</em>
              </div>
              <div className="fc-face back" style={{ ['--t0' as string]: d.tint[0], ['--t1' as string]: d.tint[1] }}>
                <small>{t('answer')}</small>
                <p className="fc-bq">{card.q}</p>
                <p>{card.a}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="fc-rate">
          {s.flipped ? (
            RATINGS.map((r, i) => (
              <button key={r} type="button" className={`r-${r}`} onClick={() => rate(r)}>
                <b>{t(r)}</b>
                <small>
                  <kbd>{i + 1}</kbd> {ivl(r)}
                </small>
              </button>
            ))
          ) : (
            <button type="button" className="fc-primary wide" onClick={flip}>
              {t('showAnswer')}
              <kbd>Space</kbd>
            </button>
          )}
        </div>
        <p className="fc-keys">{t('keys')}</p>
      </div>
    );
  }

  function QuizView({ d, z }: { d: Deck; z: Quiz }) {
    if (z.done) {
      const wrong = z.qs.filter((x) => x.pick === null || x.opts[x.pick] !== x.a);
      const right = z.qs.length - wrong.length;
      const pct = Math.round((right / z.qs.length) * 100);
      const R = 44;
      const C = 2 * Math.PI * R;
      return (
        <div className="fc-qres">
          <svg className="fc-ring" viewBox="0 0 110 110" role="img" aria-label={`${t('score')} ${right}/${z.qs.length}`}>
            <circle cx="55" cy="55" r={R} className="bg" />
            <circle cx="55" cy="55" r={R} className={`fg ${pct >= 80 ? 'hi' : pct >= 50 ? 'mid' : 'lo'}`} strokeDasharray={`${(C * pct) / 100} ${C}`} transform="rotate(-90 55 55)" />
            <text x="55" y="53" textAnchor="middle">
              {right}/{z.qs.length}
            </text>
            <text x="55" y="70" textAnchor="middle" className="sub">
              {pct}%
            </text>
          </svg>
          <h2>{t('score')}</h2>
          {!wrong.length && <p className="fc-perfect">{t('perfect')}</p>}
          <div className="fc-actions center">
            {wrong.length > 0 && (
              <button type="button" className="fc-primary" onClick={() => startQuiz(d, wrong.map((x) => x.cardId))}>
                <Ic n="reset" />
                {t('retryMistakes')}
              </button>
            )}
            <button type="button" className={wrong.length ? 'fc-secondary' : 'fc-primary'} onClick={() => startQuiz(d)}>
              <Ic n="quiz" />
              {t('newQuiz')}
            </button>
            <button type="button" className="fc-ghost" onClick={goBack}>
              {t('backToDeck')}
            </button>
          </div>
          {wrong.length > 0 && (
            <section className="fc-mist">
              <h4>{t('mistakes')}</h4>
              {wrong.map((x) => (
                <article key={x.cardId}>
                  <b>{x.q}</b>
                  <p className="bad">
                    <Ic n="x" />
                    <span>
                      <small>{t('yourAnswer')}</small>
                      {x.pick !== null ? x.opts[x.pick] : '—'}
                    </span>
                  </p>
                  <p className="good">
                    <Ic n="check" />
                    <span>
                      <small>{t('correctAnswer')}</small>
                      {x.a}
                    </span>
                  </p>
                </article>
              ))}
            </section>
          )}
        </div>
      );
    }
    const cur = z.qs[z.i];
    const answered = cur.pick !== null;
    const ok = answered && cur.opts[cur.pick as number] === cur.a;
    return (
      <div className="fc-quiz">
        <div className="fc-sbar">
          <span>
            {t('question')} {z.i + 1} {t('of')} {z.qs.length}
          </span>
          <span className="fc-sprog">
            <i style={{ width: `${((z.i + (answered ? 1 : 0)) / z.qs.length) * 100}%` }} />
          </span>
          <button type="button" className="fc-ghost sm" onClick={goBack}>
            {t('end')}
          </button>
        </div>
        <h2 className="fc-qq">{cur.q}</h2>
        <div className="fc-opts" role="group" aria-label={t('answer')}>
          {cur.opts.map((o, i) => {
            const st = !answered ? '' : o === cur.a ? 'right' : i === cur.pick ? 'wrong' : 'dim';
            return (
              <button key={i} type="button" className={`fc-opt ${st}`} onClick={() => pick(i)} disabled={answered} aria-pressed={cur.pick === i}>
                <kbd>{i + 1}</kbd>
                <span>{o}</span>
                {st === 'right' && <Ic n="check" />}
                {st === 'wrong' && <Ic n="x" />}
              </button>
            );
          })}
        </div>
        <div className="fc-qfoot" aria-live="polite">
          {answered && <span className={ok ? 'ok' : 'no'}>{ok ? t('correct') : t('incorrect')}</span>}
          <span className="fc-bar-sp" />
          <button type="button" className="fc-primary" onClick={nextQ} disabled={!answered}>
            {z.i + 1 < z.qs.length ? t('next') : t('results')}
          </button>
        </div>
        <p className="fc-keys">{t('quizKeys')}</p>
      </div>
    );
  }

  function SheetView() {
    if (!sheet) return null;
    if (sheet.kind === 'confirm') {
      const s = sheet;
      return (
        <div className="fc-scrim" onClick={() => setSheet(null)}>
          <div className="fc-sheet confirm" role="alertdialog" aria-modal="true" aria-label={s.title} onClick={(e) => e.stopPropagation()}>
            <span className="fc-endic warn">
              <Ic n="trash" />
            </span>
            <h3>{s.title}</h3>
            {s.body && <p>{s.body}</p>}
            <div className="fc-sheet-btns">
              <button type="button" className="fc-secondary" onClick={() => setSheet(null)} autoFocus>
                {t('cancel')}
              </button>
              <button
                type="button"
                className="fc-primary danger"
                onClick={() => {
                  s.run();
                  setSheet(null);
                }}
              >
                {s.ok}
              </button>
            </div>
          </div>
        </div>
      );
    }
    if (sheet.kind === 'deck') {
      const s = sheet;
      return (
        <div className="fc-scrim" onClick={() => setSheet(null)}>
          <form
            className="fc-sheet"
            role="dialog"
            aria-modal="true"
            aria-label={s.id ? t('rename') : t('newDeck')}
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => {
              e.preventDefault();
              saveSheet();
            }}
          >
            <h3>{s.id ? t('rename') : t('newDeck')}</h3>
            <label>
              <span>{t('deckName')}</span>
              <input autoFocus value={s.title} maxLength={60} onChange={(e) => setSheet({ ...s, title: e.target.value })} />
            </label>
            <label>
              <span>{t('description')}</span>
              <input value={s.desc} maxLength={120} onChange={(e) => setSheet({ ...s, desc: e.target.value })} />
            </label>
            <div className="fc-tints" role="radiogroup" aria-label={t('colour')}>
              <span>{t('colour')}</span>
              {TINTS.map((c, i) => (
                <button key={i} type="button" role="radio" aria-checked={s.tint === i} aria-label={`${t('colour')} ${i + 1}`} className={s.tint === i ? 'on' : ''} style={{ background: `linear-gradient(145deg, ${c[0]}, ${c[1]})` }} onClick={() => setSheet({ ...s, tint: i })} />
              ))}
            </div>
            <div className="fc-sheet-btns">
              <button type="button" className="fc-secondary" onClick={() => setSheet(null)}>
                {t('cancel')}
              </button>
              <button type="submit" className="fc-primary" disabled={!s.title.trim()}>
                {s.id ? t('save') : t('create')}
              </button>
            </div>
          </form>
        </div>
      );
    }
    const s = sheet;
    return (
      <div className="fc-scrim" onClick={() => setSheet(null)}>
        <form
          className="fc-sheet"
          role="dialog"
          aria-modal="true"
          aria-label={s.id ? t('editCard') : t('addCard')}
          onClick={(e) => e.stopPropagation()}
          onSubmit={(e) => {
            e.preventDefault();
            saveSheet();
          }}
        >
          <h3>{s.id ? t('editCard') : t('addCard')}</h3>
          <label>
            <span>{t('front')}</span>
            <textarea autoFocus rows={3} value={s.q} maxLength={400} onChange={(e) => setSheet({ ...s, q: e.target.value })} />
          </label>
          <label>
            <span>{t('back')}</span>
            <textarea rows={4} value={s.a} maxLength={800} onChange={(e) => setSheet({ ...s, a: e.target.value })} />
          </label>
          <div className="fc-sheet-btns">
            <button type="button" className="fc-secondary" onClick={() => setSheet(null)}>
              {t('cancel')}
            </button>
            <button type="submit" className="fc-primary" disabled={!s.q.trim() || !s.a.trim()}>
              {s.id ? t('save') : t('addCard')}
            </button>
          </div>
        </form>
      </div>
    );
  }
}
