import { Fragment as Frag, useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode, type PointerEvent as RPointerEvent, type KeyboardEvent as RKeyboardEvent } from 'react';
import type { AppProps } from '../components/Desktop';
import { DragBar, Lights } from '../components/Window';
import { usePersisted, uid } from '../system/useStore';
import { useReminders, isoDay, type Reminder } from '../system/reminders';
import { readStore, writeStore } from '../system/storage';
import { notify } from '../system/notify';
import { useWM } from '../system/WindowManager';
import { useSettings } from '../system/SettingsContext';

/* ───────────────────────────── Types & data ───────────────────────────── */

type Col = 'todo' | 'doing' | 'done';
type TagId = 'none' | 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'grey';
type Lang = 'en' | 'si' | 'ta';

interface Task {
  id: string;
  title: string;
  notes: string;
  /** YYYY-MM-DD or '' */
  due: string;
  /** 0 none · 1 low · 2 medium · 3 high */
  priority: number;
  tag: TagId;
  col: Col;
  /** linked goal id or '' */
  goal: string;
  created: number;
  reminderId?: string;
  calId?: string;
}
interface Milestone {
  id: string;
  text: string;
  done: boolean;
}
interface Goal {
  id: string;
  title: string;
  why: string;
  target: string;
  milestones: Milestone[];
  archived: boolean;
  created: number;
}
interface Data {
  tasks: Task[];
  goals: Goal[];
}

const KEY = 'mra-goals-v1';
const CAL_KEY = 'mra-calendar-events';
interface CalEvent {
  id: string;
  date: string;
  start: string;
  end: string;
  title: string;
}

const COLS: Col[] = ['todo', 'doing', 'done'];
const TAGS: { id: TagId; color: string }[] = [
  { id: 'none', color: 'transparent' },
  { id: 'red', color: '#ff453a' },
  { id: 'orange', color: '#ff9f0a' },
  { id: 'yellow', color: '#ffd60a' },
  { id: 'green', color: '#30d158' },
  { id: 'blue', color: '#0a84ff' },
  { id: 'purple', color: '#bf5af2' },
  { id: 'grey', color: '#8e8e93' },
];
const tagColor = (t: TagId) => TAGS.find((x) => x.id === t)?.color ?? 'transparent';

/* ───────────────────────────── Labels ───────────────────────────── */

const EN = {
  app: 'Goals & Tasks',
  board: 'Board',
  goals: 'Goals',
  todo: 'To Do',
  doing: 'Doing',
  done: 'Done',
  newTask: 'New Task',
  editTask: 'Edit Task',
  newGoal: 'New Goal',
  editGoal: 'Edit Goal',
  addTask: 'Add task',
  search: 'Search tasks',
  filter: 'Filter',
  tag: 'Tag colour',
  anyTag: 'Any tag',
  priority: 'Priority',
  anyPriority: 'Any',
  p0: 'None',
  p1: 'Low',
  p2: 'Medium',
  p3: 'High',
  title: 'Title',
  titlePh: 'What needs doing?',
  notes: 'Notes',
  notesPh: 'Details, links, next step…',
  due: 'Due date',
  goal: 'Goal',
  noGoal: 'No goal',
  column: 'Column',
  save: 'Save',
  cancel: 'Cancel',
  del: 'Delete',
  edit: 'Edit',
  more: 'More actions',
  moveTo: 'Move to…',
  moveUp: 'Move up',
  moveDown: 'Move down',
  addRem: 'Add to Reminders',
  openRem: 'Open Reminders',
  addCal: 'Add to Calendar',
  openCal: 'Open Calendar',
  ics: 'Download .ics file',
  needDue: 'Set a due date to add it to Calendar',
  addedRem: 'Added to Reminders',
  addedCal: 'Added to Calendar',
  icsSaved: 'Calendar file (.ics) downloaded',
  calBusy: 'Calendar is open, so a .ics file was downloaded instead',
  delTaskQ: 'Delete this task?',
  delGoalQ: 'Delete this goal?',
  delGoalSub: 'Linked tasks stay on the board.',
  cantUndo: "This can't be undone.",
  why: 'Why it matters',
  whyPh: 'The reason this goal is worth it',
  goalPh: 'e.g. Run a 5K',
  target: 'Target date',
  milestones: 'Milestones',
  addMilestone: 'Add milestone',
  milestonePh: 'New milestone',
  linked: 'Linked tasks',
  noLinked: 'No tasks linked yet. Link one from a task’s Goal field.',
  archive: 'Archive',
  restore: 'Restore',
  archived: 'Archived',
  allTasks: 'All Tasks',
  noGoals: 'No goals yet',
  noGoalsHint: 'Set a goal, break it into milestones and link tasks — progress fills in as you finish them.',
  emptyCol: 'Drop tasks here',
  noMatch: 'No matching tasks',
  complete: 'Complete',
  overdue: 'Overdue',
  today: 'Today',
  clear: 'Clear',
  back: 'Goals',
  showBoard: 'Show on Board',
  progress: 'Progress',
  daysLeft: (n: number) => (n === 0 ? 'Due today' : n > 0 ? `${n} day${n === 1 ? '' : 's'} left` : `${-n} day${n === -1 ? '' : 's'} past`),
  of: (a: number, b: number) => `${a} of ${b} done`,
  moved: (c: string) => `Moved to ${c}`,
  tags: { none: 'None', red: 'Red', orange: 'Orange', yellow: 'Yellow', green: 'Green', blue: 'Blue', purple: 'Purple', grey: 'Grey' } as Record<TagId, string>,
  seedTitle: 'Getting started',
  seedNotes:
    'Add a task with +. Drag cards between columns (on touch, press and hold first) or use ⋯ → Move to. Create a goal under Goals, add milestones and link tasks — progress updates as they’re done. Delete this card when you’re ready.',
};
type Dict = typeof EN;

const SI: Dict = {
  ...EN,
  app: 'ඉලක්ක සහ කාර්ය',
  board: 'පුවරුව',
  goals: 'ඉලක්ක',
  todo: 'කළ යුතු',
  doing: 'කරමින්',
  done: 'නිමයි',
  newTask: 'නව කාර්යය',
  editTask: 'කාර්යය සංස්කරණය',
  newGoal: 'නව ඉලක්කය',
  editGoal: 'ඉලක්කය සංස්කරණය',
  addTask: 'කාර්යයක් එක් කරන්න',
  search: 'කාර්ය සොයන්න',
  filter: 'පෙරහන',
  tag: 'ටැග් වර්ණය',
  anyTag: 'ඕනෑම ටැගයක්',
  priority: 'ප්‍රමුඛතාව',
  anyPriority: 'ඕනෑම',
  p0: 'නැත',
  p1: 'අඩු',
  p2: 'මධ්‍යම',
  p3: 'ඉහළ',
  title: 'මාතෘකාව',
  titlePh: 'කළ යුත්තේ කුමක්ද?',
  notes: 'සටහන්',
  notesPh: 'විස්තර, සබැඳි, ඊළඟ පියවර…',
  due: 'නියමිත දිනය',
  goal: 'ඉලක්කය',
  noGoal: 'ඉලක්කයක් නැත',
  column: 'තීරුව',
  save: 'සුරකින්න',
  cancel: 'අවලංගු කරන්න',
  del: 'මකන්න',
  edit: 'සංස්කරණය',
  more: 'තවත් ක්‍රියා',
  moveTo: 'වෙත ගෙන යන්න…',
  moveUp: 'ඉහළට ගෙන යන්න',
  moveDown: 'පහළට ගෙන යන්න',
  addRem: 'සිහිකැඳවීම් වෙත එක් කරන්න',
  openRem: 'සිහිකැඳවීම් විවෘත කරන්න',
  addCal: 'දින දර්ශනයට එක් කරන්න',
  openCal: 'දින දර්ශනය විවෘත කරන්න',
  ics: '.ics ගොනුව බාගන්න',
  needDue: 'දින දර්ශනයට එක් කිරීමට නියමිත දිනයක් සකසන්න',
  addedRem: 'සිහිකැඳවීම් වෙත එක් කළා',
  addedCal: 'දින දර්ශනයට එක් කළා',
  icsSaved: 'දින දර්ශන ගොනුව (.ics) බාගත විය',
  calBusy: 'දින දර්ශනය විවෘතව ඇති නිසා ඒ වෙනුවට .ics ගොනුවක් බාගත විය',
  delTaskQ: 'මෙම කාර්යය මකන්නද?',
  delGoalQ: 'මෙම ඉලක්කය මකන්නද?',
  delGoalSub: 'සම්බන්ධ කාර්ය පුවරුවේ රැඳේ.',
  cantUndo: 'මෙය අහෝසි කළ නොහැක.',
  why: 'එය වැදගත් ඇයි',
  whyPh: 'මෙම ඉලක්කය වටින හේතුව',
  goalPh: 'උදා: කි.මී. 5ක් දුවන්න',
  target: 'ඉලක්ක දිනය',
  milestones: 'සන්ධිස්ථාන',
  addMilestone: 'සන්ධිස්ථානයක් එක් කරන්න',
  milestonePh: 'නව සන්ධිස්ථානය',
  linked: 'සම්බන්ධ කාර්ය',
  noLinked: 'තවම කාර්ය සම්බන්ධ කර නැත. කාර්යයක ඉලක්කය ක්ෂේත්‍රයෙන් සම්බන්ධ කරන්න.',
  archive: 'සංරක්ෂණය',
  restore: 'ප්‍රතිස්ථාපනය',
  archived: 'සංරක්ෂිත',
  allTasks: 'සියලු කාර්ය',
  noGoals: 'තවම ඉලක්ක නැත',
  noGoalsHint: 'ඉලක්කයක් සකසා, සන්ධිස්ථානවලට බෙදා කාර්ය සම්බන්ධ කරන්න — ඒවා නිම කරන විට ප්‍රගතිය පිරේ.',
  emptyCol: 'කාර්ය මෙහි දමන්න',
  noMatch: 'ගැළපෙන කාර්ය නැත',
  complete: 'සම්පූර්ණයි',
  overdue: 'කල් ඉකුත්',
  today: 'අද',
  clear: 'ඉවත් කරන්න',
  back: 'ඉලක්ක',
  showBoard: 'පුවරුවේ පෙන්වන්න',
  progress: 'ප්‍රගතිය',
  daysLeft: (n: number) => (n === 0 ? 'අද නියමිතයි' : n > 0 ? `දින ${n}ක් ඉතිරියි` : `දින ${-n}ක් ඉකුත්`),
  of: (a: number, b: number) => `${b}න් ${a}ක් නිමයි`,
  moved: (c: string) => `${c} වෙත ගෙන ගියා`,
  tags: { none: 'නැත', red: 'රතු', orange: 'තැඹිලි', yellow: 'කහ', green: 'කොළ', blue: 'නිල්', purple: 'දම්', grey: 'අළු' },
  seedTitle: 'ආරම්භ කිරීම',
  seedNotes:
    '+ මගින් කාර්යයක් එක් කරන්න. කාඩ්පත් තීරු අතර අදින්න (ස්පර්ශයේදී මුලින් ඔබා අල්ලාගෙන සිටින්න) හෝ ⋯ → වෙත ගෙන යන්න භාවිත කරන්න. ඉලක්ක තුළ ඉලක්කයක් සාදා සන්ධිස්ථාන එක් කර කාර්ය සම්බන්ධ කරන්න — ඒවා නිම වන විට ප්‍රගතිය යාවත්කාලීන වේ. සූදානම් වූ විට මෙම කාඩ්පත මකන්න.',
};

const TA: Dict = {
  ...EN,
  app: 'இலக்குகள் & பணிகள்',
  board: 'பலகை',
  goals: 'இலக்குகள்',
  todo: 'செய்ய வேண்டியவை',
  doing: 'நடப்பவை',
  done: 'முடிந்தவை',
  newTask: 'புதிய பணி',
  editTask: 'பணியைத் திருத்து',
  newGoal: 'புதிய இலக்கு',
  editGoal: 'இலக்கைத் திருத்து',
  addTask: 'பணியைச் சேர்',
  search: 'பணிகளைத் தேடு',
  filter: 'வடிகட்டி',
  tag: 'குறிச்சொல் நிறம்',
  anyTag: 'எந்தக் குறிச்சொல்லும்',
  priority: 'முன்னுரிமை',
  anyPriority: 'எதுவும்',
  p0: 'இல்லை',
  p1: 'குறைவு',
  p2: 'நடுத்தரம்',
  p3: 'அதிகம்',
  title: 'தலைப்பு',
  titlePh: 'என்ன செய்ய வேண்டும்?',
  notes: 'குறிப்புகள்',
  notesPh: 'விவரங்கள், இணைப்புகள், அடுத்த படி…',
  due: 'இறுதி தேதி',
  goal: 'இலக்கு',
  noGoal: 'இலக்கு இல்லை',
  column: 'நெடுவரிசை',
  save: 'சேமி',
  cancel: 'ரத்துசெய்',
  del: 'நீக்கு',
  edit: 'திருத்து',
  more: 'மேலும் செயல்கள்',
  moveTo: 'இதற்கு நகர்த்து…',
  moveUp: 'மேலே நகர்த்து',
  moveDown: 'கீழே நகர்த்து',
  addRem: 'நினைவூட்டல்களில் சேர்',
  openRem: 'நினைவூட்டல்களைத் திற',
  addCal: 'நாட்காட்டியில் சேர்',
  openCal: 'நாட்காட்டியைத் திற',
  ics: '.ics கோப்பைப் பதிவிறக்கு',
  needDue: 'நாட்காட்டியில் சேர்க்க இறுதி தேதியை அமைக்கவும்',
  addedRem: 'நினைவூட்டல்களில் சேர்க்கப்பட்டது',
  addedCal: 'நாட்காட்டியில் சேர்க்கப்பட்டது',
  icsSaved: 'நாட்காட்டி கோப்பு (.ics) பதிவிறக்கப்பட்டது',
  calBusy: 'நாட்காட்டி திறந்திருப்பதால் அதற்குப் பதிலாக .ics கோப்பு பதிவிறக்கப்பட்டது',
  delTaskQ: 'இந்தப் பணியை நீக்கவா?',
  delGoalQ: 'இந்த இலக்கை நீக்கவா?',
  delGoalSub: 'இணைக்கப்பட்ட பணிகள் பலகையில் இருக்கும்.',
  cantUndo: 'இதை மீட்டெடுக்க முடியாது.',
  why: 'ஏன் முக்கியம்',
  whyPh: 'இந்த இலக்கு ஏன் மதிப்புள்ளது',
  goalPh: 'எ.கா. 5 கி.மீ. ஓடுதல்',
  target: 'இலக்கு தேதி',
  milestones: 'மைல்கற்கள்',
  addMilestone: 'மைல்கல் சேர்',
  milestonePh: 'புதிய மைல்கல்',
  linked: 'இணைக்கப்பட்ட பணிகள்',
  noLinked: 'இன்னும் பணிகள் இணைக்கப்படவில்லை. பணியின் இலக்கு புலத்தில் இணைக்கவும்.',
  archive: 'காப்பகப்படுத்து',
  restore: 'மீட்டமை',
  archived: 'காப்பகம்',
  allTasks: 'அனைத்து பணிகள்',
  noGoals: 'இன்னும் இலக்குகள் இல்லை',
  noGoalsHint: 'ஒரு இலக்கை அமைத்து, மைல்கற்களாகப் பிரித்து, பணிகளை இணைக்கவும் — முடிக்கும்போது முன்னேற்றம் நிரம்பும்.',
  emptyCol: 'பணிகளை இங்கே விடுங்கள்',
  noMatch: 'பொருந்தும் பணிகள் இல்லை',
  complete: 'நிறைவு',
  overdue: 'தாமதம்',
  today: 'இன்று',
  clear: 'அழி',
  back: 'இலக்குகள்',
  showBoard: 'பலகையில் காட்டு',
  progress: 'முன்னேற்றம்',
  daysLeft: (n: number) => (n === 0 ? 'இன்று இறுதி' : n > 0 ? `${n} நாள் உள்ளது` : `${-n} நாள் கடந்தது`),
  of: (a: number, b: number) => `${b}இல் ${a} முடிந்தது`,
  moved: (c: string) => `${c}க்கு நகர்த்தப்பட்டது`,
  tags: { none: 'இல்லை', red: 'சிவப்பு', orange: 'ஆரஞ்சு', yellow: 'மஞ்சள்', green: 'பச்சை', blue: 'நீலம்', purple: 'ஊதா', grey: 'சாம்பல்' },
  seedTitle: 'தொடங்குதல்',
  seedNotes:
    '+ மூலம் பணியைச் சேர்க்கவும். அட்டைகளை நெடுவரிசைகளுக்கு இடையே இழுக்கவும் (தொடுதிரையில் முதலில் அழுத்திப் பிடிக்கவும்) அல்லது ⋯ → இதற்கு நகர்த்து பயன்படுத்தவும். இலக்குகளில் ஒரு இலக்கை உருவாக்கி, மைல்கற்களைச் சேர்த்து பணிகளை இணைக்கவும் — அவை முடியும்போது முன்னேற்றம் புதுப்பிக்கப்படும். தயாரானதும் இந்த அட்டையை நீக்கவும்.',
};
const DICT: Record<Lang, Dict> = { en: EN, si: SI, ta: TA };

/* ───────────────────────────── Icons (original) ───────────────────────────── */

const sv = (children: ReactNode, fill = false) => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill={fill ? 'currentColor' : 'none'} stroke={fill ? 'none' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);
const I = {
  plus: sv(<path d="M12 5v14M5 12h14" />),
  search: sv(
    <>
      <circle cx="10.5" cy="10.5" r="6" />
      <path d="M15 15l4.5 4.5" />
    </>,
  ),
  filter: sv(<path d="M4 7h16M7 12h10M10 17h4" />),
  more: sv(
    <>
      <circle cx="6" cy="12" r="1.9" />
      <circle cx="12" cy="12" r="1.9" />
      <circle cx="18" cy="12" r="1.9" />
    </>,
    true,
  ),
  bell: sv(<path d="M12 2.8a6.2 6.2 0 0 0-6.2 6.2v3.4l-1.6 2.9A1.1 1.1 0 0 0 5.2 17h13.6a1.1 1.1 0 0 0 1-1.7l-1.6-2.9V9A6.2 6.2 0 0 0 12 2.8zM9.4 18.5a2.7 2.7 0 0 0 5.2 0z" />, true),
  cal: sv(
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="3.2" />
      <path d="M3.5 9.8h17M8 3v4M16 3v4" />
    </>,
  ),
  check: sv(<path d="M5 12.5l4.5 4.5L19 7.5" />),
  target: sv(
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.8" />
      <circle cx="12" cy="12" r="1.3" fill="currentColor" />
    </>,
  ),
  trash: sv(<path d="M4.5 7h15M9.5 7V4.8h5V7M6.5 7l.9 12.2a1.6 1.6 0 0 0 1.6 1.5h6a1.6 1.6 0 0 0 1.6-1.5L17.5 7M10.2 11v6M13.8 11v6" />),
  archive: sv(
    <>
      <rect x="3.5" y="4.5" width="17" height="4.5" rx="1.4" />
      <path d="M5 9v9.2A1.8 1.8 0 0 0 6.8 20h10.4a1.8 1.8 0 0 0 1.8-1.8V9M10 13h4" />
    </>,
  ),
  back: sv(<path d="M15 5l-7 7 7 7" />),
  close: sv(<path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />),
  up: sv(<path d="M12 19V5M6 11l6-6 6 6" />),
  down: sv(<path d="M12 5v14M6 13l6 6 6-6" />),
  edit: sv(<path d="M4.5 19.5l1-4.2L15.8 5a2.1 2.1 0 0 1 3 3L8.6 18.4zM13.8 7l3 3" />),
  dl: sv(<path d="M12 4v11M7 10.5l5 5 5-5M5 19.5h14" />),
  open: sv(<path d="M13.5 4.5H19.5V10.5M19.5 4.5l-8 8M10 5.5H6.5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V14" />),
  arrow: sv(<path d="M5 12h14M13 6l6 6-6 6" />),
  flag: sv(<path d="M5.5 21V4.5M5.5 4.8c4.5-2.2 7.6 2.3 13 0v9c-5.4 2.3-8.5-2.2-13 0" />),
};

/* ───────────────────────────── Helpers ───────────────────────────── */

const locale = (l: Lang) => (l === 'si' ? 'si-LK' : l === 'ta' ? 'ta-LK' : undefined);
const parseDay = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};
const fmtDay = (s: string, l: Lang) => {
  const d = parseDay(s);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  try {
    return d.toLocaleDateString(locale(l), { day: 'numeric', month: 'short', year: sameYear ? undefined : 'numeric' });
  } catch {
    return s;
  }
};
const daysUntil = (s: string) => Math.round((parseDay(s).getTime() - parseDay(isoDay()).getTime()) / 86400000);

function goalStats(g: Goal, tasks: Task[]) {
  const linked = tasks.filter((t) => t.goal === g.id);
  const total = g.milestones.length + linked.length;
  const done = g.milestones.filter((m) => m.done).length + linked.filter((t) => t.col === 'done').length;
  return { linked, total, done, pct: total ? Math.round((done / total) * 100) : 0 };
}

const makeSeed = (L: Dict): Data => ({
  tasks: [{ id: 'gs-start', title: L.seedTitle, notes: L.seedNotes, due: '', priority: 0, tag: 'blue', col: 'todo', goal: '', created: Date.now() }],
  goals: [],
});

const calList = (): CalEvent[] => {
  const l = readStore<{ list: CalEvent[] }>(CAL_KEY, { list: [] }).list;
  return Array.isArray(l) ? l : [];
};

function downloadIcs(t: Task) {
  const d = parseDay(t.due);
  const next = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
  const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/([,;])/g, '\\$1');
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//MR Ahamed Portfolio//Goals and Tasks//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${t.id}-${Date.now()}@goals.portfolio`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${isoDay(d).replace(/-/g, '')}`,
    `DTEND;VALUE=DATE:${isoDay(next).replace(/-/g, '')}`,
    `SUMMARY:${esc(t.title)}`,
    ...(t.notes ? [`DESCRIPTION:${esc(t.notes)}`] : []),
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  const blob = new Blob([lines.join('\r\n') + '\r\n'], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${t.title.replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '').slice(0, 40) || 'task'}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/* ───────────────────────────── Component ───────────────────────────── */

interface DragState {
  id: string;
  x: number;
  y: number;
  offX: number;
  offY: number;
  w: number;
  h: number;
  overCol: Col | null;
  beforeId: string | null;
}
interface Pending {
  id: string;
  pid: number;
  sx: number;
  sy: number;
  type: string;
  el: HTMLElement;
  timer: number;
  started: boolean;
}
type Toast = { text: string; action?: { label: string; run: () => void } } | null;
type Confirm = { title: string; sub: string; run: () => void } | null;
type Menu = { id: string; x: number; y: number; up: boolean } | null;

export default function GoalsApp(_: Partial<AppProps>) {
  const wm = useWM();
  const { settings, motionReduced } = useSettings();
  const lang: Lang = settings.language === 'si' || settings.language === 'ta' ? settings.language : 'en';
  const L = DICT[lang];
  const [data, setData] = usePersisted<Data>(KEY, () => makeSeed(L));
  const tasks = Array.isArray(data?.tasks) ? data.tasks : [];
  const goals = Array.isArray(data?.goals) ? data.goals : [];
  const [reminders, setReminders] = useReminders();

  const rootRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(1000);
  const device = typeof document !== 'undefined' ? document.documentElement.dataset.device : 'mac';

  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    setWidth(el.clientWidth);
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const compact = width < 640;
  const sidebar = !compact && device !== 'ipad' && device !== 'iphone' && width >= 760;

  const [view, setView] = useState<'board' | 'goals'>('board');
  const [goalFilter, setGoalFilter] = useState<string>('');
  const [openGoal, setOpenGoal] = useState<string>('');
  const [q, setQ] = useState('');
  const [tagF, setTagF] = useState<TagId | 'all'>('all');
  const [priF, setPriF] = useState(-1);
  const [filterOpen, setFilterOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [taskEd, setTaskEd] = useState<{ t: Task; isNew: boolean } | null>(null);
  const [goalEd, setGoalEd] = useState<{ g: Goal; isNew: boolean } | null>(null);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [menu, setMenu] = useState<Menu>(null);
  const [toast, setToast] = useState<Toast>(null);
  const [live, setLive] = useState('');
  const [page, setPage] = useState(0);
  const toastT = useRef(0);

  const showToast = useCallback((t: Toast) => {
    window.clearTimeout(toastT.current);
    setToast(t);
    if (t) toastT.current = window.setTimeout(() => setToast(null), 4200);
  }, []);
  useEffect(() => () => window.clearTimeout(toastT.current), []);

  /* ── data updates ── */
  const setTasks = useCallback((f: (t: Task[]) => Task[]) => setData((d) => ({ goals: Array.isArray(d?.goals) ? d.goals : [], tasks: f(Array.isArray(d?.tasks) ? d.tasks : []) })), [setData]);
  const setGoals = useCallback((f: (g: Goal[]) => Goal[]) => setData((d) => ({ tasks: Array.isArray(d?.tasks) ? d.tasks : [], goals: f(Array.isArray(d?.goals) ? d.goals : []) })), [setData]);

  const syncReminderDone = useCallback(
    (t: Task, col: Col) => {
      if (!t.reminderId) return;
      const done = col === 'done';
      setReminders((prev) => (prev.some((r) => r.id === t.reminderId && r.done !== done) ? prev.map((r) => (r.id === t.reminderId ? { ...r, done } : r)) : prev));
    },
    [setReminders],
  );

  const moveTask = useCallback(
    (id: string, col: Col, beforeId: string | null) => {
      const cur = tasks.find((x) => x.id === id);
      if (!cur) return;
      setTasks((ts) => {
        const t = ts.find((x) => x.id === id);
        if (!t) return ts;
        const rest = ts.filter((x) => x.id !== id);
        let idx = beforeId ? rest.findIndex((x) => x.id === beforeId) : -1;
        if (idx < 0) {
          let last = -1;
          rest.forEach((x, i) => {
            if (x.col === col) last = i;
          });
          idx = last >= 0 ? last + 1 : rest.length;
        }
        rest.splice(idx, 0, { ...t, col });
        return rest;
      });
      if (cur.col !== col) {
        syncReminderDone(cur, col);
        setLive(L.moved(L[col]));
      }
    },
    [tasks, setTasks, syncReminderDone, L],
  );

  const shiftTask = (t: Task, dir: -1 | 1) => {
    const list = tasks.filter((x) => x.col === t.col);
    const i = list.findIndex((x) => x.id === t.id);
    if (dir < 0 && i > 0) moveTask(t.id, t.col, list[i - 1].id);
    if (dir > 0 && i < list.length - 1) moveTask(t.id, t.col, list[i + 2]?.id ?? null);
  };

  const saveTask = (t: Task, isNew: boolean) => {
    const clean = { ...t, title: t.title.trim(), notes: t.notes.trim() };
    if (isNew) {
      setTasks((ts) => {
        let last = -1;
        ts.forEach((x, i) => {
          if (x.col === clean.col) last = i;
        });
        const next = [...ts];
        next.splice(last >= 0 ? last + 1 : next.length, 0, clean);
        return next;
      });
    } else {
      const prev = tasks.find((x) => x.id === t.id);
      if (prev && prev.col !== clean.col) {
        moveTask(clean.id, clean.col, null);
        syncReminderDone(prev, clean.col);
      }
      setTasks((ts) => ts.map((x) => (x.id === clean.id ? { ...clean, col: x.col === clean.col ? x.col : clean.col } : x)));
      // keep a linked reminder's text/due in step with the task
      if (clean.reminderId) {
        setReminders((rs) => rs.map((r) => (r.id === clean.reminderId ? { ...r, text: clean.title, due: clean.due || undefined, notes: clean.notes || undefined, priority: clean.priority || undefined } : r)));
      }
    }
    setTaskEd(null);
  };

  const askDeleteTask = (t: Task) =>
    setConfirm({
      title: L.delTaskQ,
      sub: `“${t.title}” — ${L.cantUndo}`,
      run: () => {
        setTasks((ts) => ts.filter((x) => x.id !== t.id));
        setTaskEd(null);
      },
    });

  const askDeleteGoal = (g: Goal) =>
    setConfirm({
      title: L.delGoalQ,
      sub: `“${g.title}” — ${L.delGoalSub} ${L.cantUndo}`,
      run: () => {
        setData((d) => ({ goals: d.goals.filter((x) => x.id !== g.id), tasks: d.tasks.map((t) => (t.goal === g.id ? { ...t, goal: '' } : t)) }));
        if (goalFilter === g.id) setGoalFilter('');
        if (openGoal === g.id) setOpenGoal('');
        setGoalEd(null);
      },
    });

  const newTask = (col: Col = 'todo') => setTaskEd({ isNew: true, t: { id: uid('t'), title: '', notes: '', due: '', priority: 0, tag: 'none', col, goal: goalFilter || openGoal || '', created: Date.now() } });
  const newGoal = () => setGoalEd({ isNew: true, g: { id: uid('g'), title: '', why: '', target: '', milestones: [], archived: false, created: Date.now() } });

  /* ── integrations ── */
  const hasReminder = (t: Task) => !!t.reminderId && reminders.some((r) => r.id === t.reminderId);
  const addReminder = (t: Task) => {
    const id = uid('rg');
    const r: Reminder = { id, text: t.title, done: t.col === 'done', list: 'mine', app: 'goals' };
    if (t.notes) r.notes = t.notes;
    if (t.due) r.due = t.due;
    if (t.priority) r.priority = t.priority;
    setReminders((prev) => [...prev, r]);
    setTasks((ts) => ts.map((x) => (x.id === t.id ? { ...x, reminderId: id } : x)));
    const open = { label: L.openRem, run: () => wm.open('reminders') };
    showToast({ text: L.addedRem, action: open });
    notify({ app: 'Reminders', icon: 'reminders', title: L.addedRem, body: t.title, actions: [open] });
  };
  const hasCal = (t: Task) => !!t.calId && calList().some((e) => e.id === t.calId);
  const addCalendar = (t: Task) => {
    if (!t.due) return;
    if (wm.windows.some((w) => w.id === 'calendar')) {
      // Calendar keeps its own in-memory copy while open — writing now would be overwritten.
      downloadIcs(t);
      showToast({ text: L.calBusy });
      return;
    }
    const id = uid('e');
    writeStore(CAL_KEY, { list: [...calList(), { id, date: t.due, start: '09:00', end: '10:00', title: t.title }] });
    setTasks((ts) => ts.map((x) => (x.id === t.id ? { ...x, calId: id } : x)));
    const open = { label: L.openCal, run: () => wm.open('calendar') };
    showToast({ text: L.addedCal, action: open });
    notify({ app: 'Calendar', icon: 'calendar', title: L.addedCal, body: `${t.title} · ${fmtDay(t.due, lang)}`, actions: [open] });
  };
  const saveIcs = (t: Task) => {
    if (!t.due) return;
    downloadIcs(t);
    showToast({ text: L.icsSaved });
  };

  /* ── filtering ── */
  const activeGoals = goals.filter((g) => !g.archived);
  const archivedGoals = goals.filter((g) => g.archived);
  const fGoal = goals.find((g) => g.id === goalFilter);
  useEffect(() => {
    if (goalFilter && !goals.some((g) => g.id === goalFilter && !g.archived)) setGoalFilter('');
  }, [goals, goalFilter]);
  const needle = q.trim().toLowerCase();
  const match = (t: Task) => (!goalFilter || t.goal === goalFilter) && (tagF === 'all' || t.tag === tagF) && (priF < 0 || t.priority === priF) && (!needle || `${t.title} ${t.notes}`.toLowerCase().includes(needle));
  const filtering = !!goalFilter || tagF !== 'all' || priF >= 0 || !!needle;
  const filterCount = (tagF !== 'all' ? 1 : 0) + (priF >= 0 ? 1 : 0);

  /* ── drag & drop (pointer events: mouse, pen and touch) ── */
  const [drag, setDrag] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const pend = useRef<Pending | null>(null);
  const lastPt = useRef({ x: 0, y: 0 });
  const suppressClick = useRef(false);
  const moveRef = useRef(moveTask);
  moveRef.current = moveTask;

  const setDragBoth = (d: DragState | null) => {
    dragRef.current = d;
    setDrag(d);
  };

  const hitTest = (cx: number, cy: number, id: string): { overCol: Col | null; beforeId: string | null } | null => {
    const root = rootRef.current;
    if (!root) return null;
    const el = document.elementFromPoint(cx, cy) as HTMLElement | null;
    const colEl = el?.closest<HTMLElement>('[data-col]');
    if (!colEl || !root.contains(colEl)) return null;
    const cards = Array.from(colEl.querySelectorAll<HTMLElement>('[data-card]')).filter((c) => c.dataset.card !== id);
    const before = cards.find((c) => {
      const r = c.getBoundingClientRect();
      return cy < r.top + r.height / 2;
    });
    return { overCol: colEl.dataset.col as Col, beforeId: before?.dataset.card ?? null };
  };

  const updateDrag = (cx: number, cy: number) => {
    const d = dragRef.current;
    const root = rootRef.current;
    if (!d || !root) return;
    const r = root.getBoundingClientRect();
    const hit = hitTest(cx, cy, d.id);
    const next = { ...d, x: cx - r.left, y: cy - r.top, ...(hit ?? {}) };
    setDragBoth(next);
  };

  const endPointer = useRef<() => void>(() => undefined);

  const onCardDown = (e: RPointerEvent<HTMLElement>, t: Task) => {
    if (e.button !== 0 || (e.target as HTMLElement).closest('button, a, input')) return;
    if (pend.current) return;
    const el = e.currentTarget;
    const p: Pending = { id: t.id, pid: e.pointerId, sx: e.clientX, sy: e.clientY, type: e.pointerType, el, timer: 0, started: false };
    pend.current = p;
    lastPt.current = { x: e.clientX, y: e.clientY };

    const start = () => {
      const root = rootRef.current;
      if (!root || pend.current !== p) return;
      p.started = true;
      const rr = root.getBoundingClientRect();
      const cr = el.getBoundingClientRect();
      const { x: cx, y: cy } = lastPt.current;
      const colList = Array.from(el.parentElement?.querySelectorAll<HTMLElement>('[data-card]') ?? []);
      const nextEl = colList[colList.indexOf(el) + 1];
      setMenu(null);
      setDragBoth({ id: t.id, x: cx - rr.left, y: cy - rr.top, offX: cx - cr.left, offY: cy - cr.top, w: cr.width, h: cr.height, overCol: t.col, beforeId: nextEl?.dataset.card ?? null });
    };
    if (p.type === 'touch' || p.type === 'pen') p.timer = window.setTimeout(start, p.type === 'pen' ? 160 : 260);

    const move = (ev: PointerEvent) => {
      if (ev.pointerId !== p.pid) return;
      lastPt.current = { x: ev.clientX, y: ev.clientY };
      if (!p.started) {
        const dist = Math.hypot(ev.clientX - p.sx, ev.clientY - p.sy);
        if (p.type === 'mouse') {
          if (dist > 5) start();
        } else if (dist > 10) cleanup();
        return;
      }
      ev.preventDefault();
      updateDrag(ev.clientX, ev.clientY);
    };
    const up = (ev: PointerEvent) => {
      if (ev.pointerId !== p.pid) return;
      const d = dragRef.current;
      if (p.started && d) {
        if (d.overCol) moveRef.current(d.id, d.overCol, d.beforeId);
        suppressClick.current = true;
        window.setTimeout(() => (suppressClick.current = false), 60);
      }
      cleanup();
    };
    const cancel = (ev: PointerEvent) => {
      if (ev.pointerId === p.pid) cleanup();
    };
    const key = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') cleanup();
    };
    const cleanup = () => {
      window.clearTimeout(p.timer);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', cancel);
      window.removeEventListener('keydown', key);
      if (pend.current === p) pend.current = null;
      if (dragRef.current) setDragBoth(null);
    };
    endPointer.current = cleanup;
    window.addEventListener('pointermove', move, { passive: false });
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', cancel);
    window.addEventListener('keydown', key);
  };
  useEffect(() => () => endPointer.current(), []);

  // Once a touch drag has started, stop the page/board from scrolling under the finger.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const tm = (e: TouchEvent) => {
      if (pend.current?.started && e.cancelable) e.preventDefault();
    };
    root.addEventListener('touchmove', tm, { passive: false });
    return () => root.removeEventListener('touchmove', tm);
  }, []);

  // Auto-scroll lists / board while dragging near an edge.
  const dragging = drag !== null;
  useEffect(() => {
    if (!dragging) return;
    let raf = 0;
    let edgeSince = 0;
    let cool = 0;
    const tick = () => {
      const root = rootRef.current;
      if (!root || !dragRef.current) return;
      const { x, y } = lastPt.current;
      let scrolled = false;
      root.querySelectorAll<HTMLElement>('[data-list]').forEach((list) => {
        const r = list.getBoundingClientRect();
        if (x < r.left || x > r.right) return;
        if (y < r.top + 36 && y > r.top - 40 && list.scrollTop > 0) {
          list.scrollTop -= 9;
          scrolled = true;
        } else if (y > r.bottom - 36 && y < r.bottom + 40 && list.scrollTop + list.clientHeight < list.scrollHeight) {
          list.scrollTop += 9;
          scrolled = true;
        }
      });
      const b = boardRef.current;
      if (b && b.scrollWidth > b.clientWidth + 2) {
        const r = b.getBoundingClientRect();
        const dir = x < r.left + 34 ? -1 : x > r.right - 34 ? 1 : 0;
        const now = performance.now();
        if (compact) {
          if (dir && now > cool) {
            if (!edgeSince) edgeSince = now;
            else if (now - edgeSince > 420) {
              const pw = b.clientWidth;
              const cur = Math.round(b.scrollLeft / pw);
              b.scrollTo({ left: Math.max(0, cur + dir) * pw, behavior: motionReduced ? 'auto' : 'smooth' });
              edgeSince = 0;
              cool = now + 650;
              scrolled = true;
            }
          } else if (!dir) edgeSince = 0;
        } else if (dir) {
          b.scrollLeft += dir * 10;
          scrolled = true;
        }
      }
      if (scrolled) updateDrag(x, y);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging, compact, motionReduced]);

  /* ── paged board (iPhone) ── */
  const onBoardScroll = () => {
    const b = boardRef.current;
    if (!b || !compact) return;
    const p = Math.round(b.scrollLeft / Math.max(1, b.clientWidth));
    if (p !== page) setPage(p);
  };
  const goPage = (i: number) => {
    const b = boardRef.current;
    if (!b) return;
    b.scrollTo({ left: i * b.clientWidth, behavior: motionReduced ? 'auto' : 'smooth' });
    setPage(i);
  };

  /* ── menu ── */
  const menuRef = useRef<HTMLDivElement>(null);
  const openMenu = (t: Task, btn: HTMLElement) => {
    const root = rootRef.current;
    if (!root) return;
    const rr = root.getBoundingClientRect();
    const br = btn.getBoundingClientRect();
    const up = br.bottom - rr.top > rr.height * 0.55;
    setMenu({ id: t.id, x: br.right - rr.left, y: up ? br.top - rr.top - 4 : br.bottom - rr.top + 4, up });
  };
  useLayoutEffect(() => {
    const m = menuRef.current;
    const root = rootRef.current;
    if (!m || !root || !menu) return;
    const w = m.offsetWidth;
    const h = m.offsetHeight;
    let left = Math.min(menu.x - w, root.clientWidth - w - 8);
    left = Math.max(8, left);
    let top = menu.up ? menu.y - h : menu.y;
    top = Math.max(8, Math.min(top, root.clientHeight - h - 8));
    m.style.left = `${left}px`;
    m.style.top = `${top}px`;
    m.style.visibility = 'visible';
    m.querySelector<HTMLElement>('[role="menuitem"]:not([disabled])')?.focus();
  }, [menu]);
  useEffect(() => {
    if (!menu && !filterOpen) return;
    const down = (e: PointerEvent) => {
      const tgt = e.target as HTMLElement;
      if (tgt.closest('.gt-menu, .gt-pop, [data-menu-btn]')) return;
      setMenu(null);
      setFilterOpen(false);
    };
    window.addEventListener('pointerdown', down, true);
    return () => window.removeEventListener('pointerdown', down, true);
  }, [menu, filterOpen]);

  const onRootKey = (e: RKeyboardEvent) => {
    if (e.key !== 'Escape') return;
    if (confirm) setConfirm(null);
    else if (menu) setMenu(null);
    else if (filterOpen) setFilterOpen(false);
    else if (taskEd) setTaskEd(null);
    else if (goalEd) setGoalEd(null);
    else return;
    e.stopPropagation();
  };
  const menuKeys = (e: RKeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const items = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])'));
    const i = items.indexOf(document.activeElement as HTMLElement);
    items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus();
  };

  /* ── render pieces ── */
  const isTouch = device === 'iphone' || device === 'ipad';
  const today = isoDay();

  const cardInner = (t: Task) => {
    const g = t.goal ? goals.find((x) => x.id === t.goal) : undefined;
    const overdue = t.due && t.col !== 'done' && t.due < today;
    return (
      <>
        {t.tag !== 'none' && <span className="gt-tagbar" style={{ background: tagColor(t.tag) }} aria-hidden="true" />}
        <div className="gt-card-main">
          <div className="gt-card-title">
            {t.col === 'done' && <span className="gt-donetick">{I.check}</span>}
            <span>{t.title}</span>
          </div>
          {t.notes && <p className="gt-card-notes">{t.notes}</p>}
          {(t.due || t.priority > 0 || g || hasReminder(t)) && (
            <div className="gt-meta">
              {t.priority > 0 && (
                <span className={`gt-pri p${t.priority}`} title={`${L.priority}: ${L[`p${t.priority}` as 'p1']}`}>
                  {'!'.repeat(t.priority)}
                  <span className="gt-sr">
                    {L.priority}: {L[`p${t.priority}` as 'p1']}
                  </span>
                </span>
              )}
              {t.due && (
                <span className={`gt-chip ${overdue ? 'late' : t.due === today ? 'today' : ''}`}>
                  {I.cal}
                  {t.due === today ? L.today : fmtDay(t.due, lang)}
                  {overdue && <span className="gt-sr"> · {L.overdue}</span>}
                </span>
              )}
              {g && (
                <span className="gt-chip goal">
                  {I.target}
                  <span className="gt-ell">{g.title}</span>
                </span>
              )}
              {hasReminder(t) && (
                <span className="gt-chip rem" title={L.openRem}>
                  {I.bell}
                </span>
              )}
            </div>
          )}
        </div>
      </>
    );
  };

  const renderCol = (c: Col) => {
    const all = tasks.filter((t) => t.col === c);
    const items = all.filter(match);
    const ph = drag && drag.overCol === c ? <div className="gt-ph" style={{ height: drag.h }} aria-hidden="true" /> : null;
    const phBefore = (id: string) => (drag && drag.overCol === c && drag.beforeId === id ? ph : null);
    const phEnd = drag && drag.overCol === c && (!drag.beforeId || !items.some((t) => t.id === drag.beforeId && t.id !== drag.id)) ? ph : null;
    return (
      <section key={c} className={`gt-col c-${c} ${drag?.overCol === c ? 'over' : ''}`} data-col={c} aria-label={L[c]}>
        <header className="gt-col-head">
          <span className="gt-col-dot" aria-hidden="true" />
          <h3>{L[c]}</h3>
          <span className="gt-count">{filtering && items.length !== all.length ? `${items.length}/${all.length}` : all.length}</span>
          <button type="button" className="gt-icon-btn sm" aria-label={`${L.addTask} · ${L[c]}`} onClick={() => newTask(c)}>
            {I.plus}
          </button>
        </header>
        <div className="gt-list" data-list>
          {items.map((t) => (
            <Frag key={t.id}>
              {phBefore(t.id)}
              <div
                data-card={t.id}
                className={`gt-card ${t.col === 'done' ? 'is-done' : ''} ${drag?.id === t.id ? 'is-src' : ''}`}
                role="button"
                tabIndex={0}
                aria-label={t.title}
                onPointerDown={(e) => onCardDown(e, t)}
                onContextMenu={(e) => {
                  if (isTouch || pend.current) e.preventDefault();
                }}
                onClick={() => {
                  if (suppressClick.current) return;
                  setTaskEd({ t, isNew: false });
                }}
                onKeyDown={(e) => {
                  if (e.target !== e.currentTarget) return;
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setTaskEd({ t, isNew: false });
                  } else if (e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10')) {
                    e.preventDefault();
                    const b = e.currentTarget.querySelector<HTMLElement>('.gt-more');
                    if (b) openMenu(t, b);
                  }
                }}
              >
                {cardInner(t)}
                <button
                  type="button"
                  className="gt-more"
                  data-menu-btn
                  aria-label={`${L.more}: ${t.title}`}
                  aria-haspopup="menu"
                  aria-expanded={menu?.id === t.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (menu?.id === t.id) setMenu(null);
                    else openMenu(t, e.currentTarget);
                  }}
                >
                  {I.more}
                </button>
              </div>
            </Frag>
          ))}
          {phEnd}
          {!items.length && !ph && <div className="gt-empty">{filtering && all.length ? L.noMatch : L.emptyCol}</div>}
          <button type="button" className="gt-add" onClick={() => newTask(c)}>
            {I.plus}
            {L.addTask}
          </button>
        </div>
      </section>
    );
  };

  const progressBar = (pct: number, big = false) => (
    <div className={`gt-bar-track ${big ? 'big' : ''} ${pct >= 100 ? 'full' : ''}`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={L.progress}>
      <span style={{ width: `${pct}%` }} />
    </div>
  );

  const [msDraft, setMsDraft] = useState('');
  const toggleMs = (g: Goal, mid: string) => setGoals((gs) => gs.map((x) => (x.id === g.id ? { ...x, milestones: x.milestones.map((m) => (m.id === mid ? { ...m, done: !m.done } : m)) } : x)));
  const removeMs = (g: Goal, mid: string) => setGoals((gs) => gs.map((x) => (x.id === g.id ? { ...x, milestones: x.milestones.filter((m) => m.id !== mid) } : x)));
  const addMs = (g: Goal) => {
    const text = msDraft.trim();
    if (!text) return;
    setGoals((gs) => gs.map((x) => (x.id === g.id ? { ...x, milestones: [...x.milestones, { id: uid('m'), text, done: false }] } : x)));
    setMsDraft('');
  };
  const setArchived = (g: Goal, archived: boolean) => {
    setGoals((gs) => gs.map((x) => (x.id === g.id ? { ...x, archived } : x)));
    if (archived) {
      if (goalFilter === g.id) setGoalFilter('');
      if (openGoal === g.id) setOpenGoal('');
    }
  };

  const goalPanel = (g: Goal, variant: 'header' | 'page') => {
    const s = goalStats(g, tasks);
    const left = g.target ? daysUntil(g.target) : null;
    return (
      <div className={`gt-goal-panel v-${variant}`}>
        <div className="gt-gp-info">
          <div className="gt-gp-titlerow">
            <span className="gt-gp-icon">{I.target}</span>
            <h2>{g.title}</h2>
          </div>
          {g.why && <p className="gt-gp-why">{g.why}</p>}
          <div className="gt-gp-stats">
            <b>{s.pct}%</b>
            <span>{s.total ? L.of(s.done, s.total) : L.addMilestone}</span>
            {g.target && (
              <span className={`gt-chip ${left !== null && left < 0 && s.pct < 100 ? 'late' : ''}`}>
                {I.flag}
                {fmtDay(g.target, lang)} · {L.daysLeft(left ?? 0)}
              </span>
            )}
          </div>
          {progressBar(s.pct, true)}
          <div className="gt-gp-actions">
            <button type="button" className="gt-btn" onClick={() => setGoalEd({ g, isNew: false })}>
              {I.edit}
              {L.edit}
            </button>
            {variant === 'page' && (
              <button
                type="button"
                className="gt-btn"
                onClick={() => {
                  setGoalFilter(g.id);
                  setView('board');
                }}
              >
                {I.arrow}
                {L.showBoard}
              </button>
            )}
            {s.total > 0 && s.pct >= 100 && (
              <button type="button" className="gt-btn tint" onClick={() => setArchived(g, true)}>
                {I.archive}
                {L.archive}
              </button>
            )}
            <button type="button" className="gt-btn danger" onClick={() => askDeleteGoal(g)}>
              {I.trash}
              {L.del}
            </button>
          </div>
        </div>
        <div className="gt-gp-ms">
          <h4>
            {L.milestones}
            <span>
              {g.milestones.filter((m) => m.done).length}/{g.milestones.length}
            </span>
          </h4>
          <ul>
            {g.milestones.map((m) => (
              <li key={m.id} className={m.done ? 'done' : ''}>
                <label>
                  <input type="checkbox" checked={m.done} onChange={() => toggleMs(g, m.id)} />
                  <span className="gt-cb" aria-hidden="true">
                    {I.check}
                  </span>
                  <span className="gt-ms-text">{m.text}</span>
                </label>
                <button type="button" className="gt-icon-btn xs" aria-label={`${L.del}: ${m.text}`} onClick={() => removeMs(g, m.id)}>
                  {I.close}
                </button>
              </li>
            ))}
          </ul>
          <form
            className="gt-ms-add"
            onSubmit={(e) => {
              e.preventDefault();
              addMs(g);
            }}
          >
            <input value={msDraft} onChange={(e) => setMsDraft(e.target.value)} placeholder={L.milestonePh} aria-label={L.addMilestone} maxLength={120} />
            <button type="submit" className="gt-icon-btn sm tint" aria-label={L.addMilestone} disabled={!msDraft.trim()}>
              {I.plus}
            </button>
          </form>
          {variant === 'page' && (
            <>
              <h4 className="gt-linked-h">
                {L.linked}
                <span>
                  {s.linked.filter((t) => t.col === 'done').length}/{s.linked.length}
                </span>
              </h4>
              {s.linked.length ? (
                <ul className="gt-linked">
                  {s.linked.map((t) => (
                    <li key={t.id}>
                      <button type="button" onClick={() => setTaskEd({ t, isNew: false })}>
                        <span className={`gt-status c-${t.col}`}>{L[t.col]}</span>
                        <span className="gt-ell">{t.title}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="gt-muted">{L.noLinked}</p>
              )}
              <button type="button" className="gt-add inline" onClick={() => newTask('todo')}>
                {I.plus}
                {L.addTask}
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  const goalRow = (g: Goal) => {
    const s = goalStats(g, tasks);
    return (
      <button
        key={g.id}
        type="button"
        className={`gt-side-item goal ${goalFilter === g.id ? 'on' : ''}`}
        aria-pressed={goalFilter === g.id}
        onClick={() => {
          setGoalFilter(goalFilter === g.id ? '' : g.id);
          setMsDraft('');
        }}
      >
        <span className="gt-ring" style={{ ['--p' as string]: `${s.pct * 3.6}deg` }} aria-hidden="true" />
        <span className="gt-side-text">
          <span className="gt-ell">{g.title}</span>
          <small>{s.pct >= 100 && s.total ? L.complete : `${s.pct}%`}</small>
        </span>
      </button>
    );
  };

  const archivedList = archivedGoals.length > 0 && (
    <div className="gt-archived">
      <button type="button" className="gt-disclose" aria-expanded={showArchived} onClick={() => setShowArchived(!showArchived)}>
        <span className={`gt-chev ${showArchived ? 'open' : ''}`}>{I.back}</span>
        {L.archived} ({archivedGoals.length})
      </button>
      {showArchived &&
        archivedGoals.map((g) => (
          <div key={g.id} className="gt-arch-row">
            <span className="gt-donetick">{I.check}</span>
            <span className="gt-ell">{g.title}</span>
            <button type="button" className="gt-link" onClick={() => setArchived(g, false)}>
              {L.restore}
            </button>
            <button type="button" className="gt-icon-btn xs" aria-label={`${L.del}: ${g.title}`} onClick={() => askDeleteGoal(g)}>
              {I.trash}
            </button>
          </div>
        ))}
    </div>
  );

  const goalsEmpty = (
    <div className="gt-goals-empty">
      <span className="gt-empty-icon">{I.target}</span>
      <h3>{L.noGoals}</h3>
      <p>{L.noGoalsHint}</p>
      <button type="button" className="gt-btn primary" onClick={newGoal}>
        {I.plus}
        {L.newGoal}
      </button>
    </div>
  );

  const goalsView = () => {
    const g = goals.find((x) => x.id === openGoal);
    if (g) {
      return (
        <div className="gt-goal-page">
          <button type="button" className="gt-backbtn" onClick={() => setOpenGoal('')}>
            {I.back}
            {L.back}
          </button>
          {goalPanel(g, 'page')}
        </div>
      );
    }
    return (
      <div className="gt-goals-grid-wrap">
        {activeGoals.length ? (
          <div className="gt-goals-grid">
            {activeGoals.map((x) => {
              const s = goalStats(x, tasks);
              return (
                <button
                  key={x.id}
                  type="button"
                  className="gt-goal-card"
                  onClick={() => {
                    setOpenGoal(x.id);
                    setMsDraft('');
                  }}
                >
                  <span className="gt-gc-top">
                    <span className="gt-gp-icon">{I.target}</span>
                    <b className="gt-ell">{x.title}</b>
                    <span className="gt-gc-pct">{s.pct}%</span>
                  </span>
                  {x.why && <span className="gt-gc-why">{x.why}</span>}
                  {progressBar(s.pct)}
                  <span className="gt-gc-foot">
                    <span>{s.total ? L.of(s.done, s.total) : L.addMilestone}</span>
                    {x.target && (
                      <span className="gt-gc-date">
                        {I.flag}
                        {fmtDay(x.target, lang)}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
            <button type="button" className="gt-goal-card add" onClick={newGoal}>
              {I.plus}
              {L.newGoal}
            </button>
          </div>
        ) : (
          goalsEmpty
        )}
        {archivedList}
      </div>
    );
  };

  const searchBox = (
    <label className="gt-search" data-nodrag>
      {I.search}
      <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={L.search} aria-label={L.search} />
    </label>
  );

  const chips = (
    <>
      {!sidebar && fGoal && (
        <button type="button" className="gt-fchip" onClick={() => setGoalFilter('')} aria-label={`${L.clear}: ${fGoal.title}`}>
          {I.target}
          <span className="gt-ell">{fGoal.title}</span>
          {I.close}
        </button>
      )}
      {tagF !== 'all' && (
        <button type="button" className="gt-fchip" onClick={() => setTagF('all')} aria-label={`${L.clear}: ${L.tags[tagF]}`}>
          <span className="gt-swatch sm" style={{ background: tagColor(tagF) }} />
          {L.tags[tagF]}
          {I.close}
        </button>
      )}
      {priF >= 0 && (
        <button type="button" className="gt-fchip" onClick={() => setPriF(-1)} aria-label={`${L.clear}: ${L.priority}`}>
          {L.priority}: {L[`p${priF}` as 'p0']}
          {I.close}
        </button>
      )}
    </>
  );
  const hasChips = (!sidebar && !!fGoal) || tagF !== 'all' || priF >= 0;

  const board = (
    <div className="gt-board-wrap">
      {sidebar && fGoal && goalPanel(fGoal, 'header')}
      {compact && (
        <div className="gt-pages" role="tablist" aria-label={L.board}>
          {COLS.map((c, i) => (
            <button key={c} type="button" role="tab" aria-selected={page === i} className={`gt-page-tab c-${c} ${page === i ? 'on' : ''} ${drag?.overCol === c ? 'over' : ''}`} onClick={() => goPage(i)}>
              <span className="gt-col-dot" aria-hidden="true" />
              {L[c]}
              <span className="gt-count">{tasks.filter((t) => t.col === c && match(t)).length}</span>
            </button>
          ))}
        </div>
      )}
      <div ref={boardRef} className={`gt-board ${compact ? 'paged' : ''} ${drag ? 'dragging' : ''}`} onScroll={onBoardScroll}>
        {COLS.map(renderCol)}
      </div>
    </div>
  );

  const menuTask = menu ? tasks.find((t) => t.id === menu.id) : undefined;
  const menuCalIn = menuTask ? hasCal(menuTask) : false;

  return (
    <div
      ref={rootRef}
      className={`gt ${compact ? 'is-compact' : ''} ${sidebar ? 'has-side' : ''} ${isTouch ? 'is-touch' : ''} ${motionReduced ? 'rm' : ''} ${drag ? 'is-dragging' : ''}`}
      onKeyDown={onRootKey}
    >
      <DragBar className="gt-topbar">
        <Lights />
        {sidebar ? (
          <b className="gt-apptitle">{L.app}</b>
        ) : (
          <div className="gt-seg" role="tablist" aria-label={L.app} data-nodrag>
            {(['board', 'goals'] as const).map((v) => (
              <button key={v} type="button" role="tab" aria-selected={view === v} className={view === v ? 'on' : ''} onClick={() => setView(v)}>
                {L[v]}
              </button>
            ))}
          </div>
        )}
        <span className="gt-spacer" />
        {!compact && (sidebar || view === 'board') && searchBox}
        {(sidebar || view === 'board') && (
          <div className="gt-pop-wrap">
            <button type="button" className={`gt-icon-btn ${filterCount ? 'active' : ''}`} data-menu-btn aria-label={L.filter} aria-expanded={filterOpen} onClick={() => setFilterOpen(!filterOpen)}>
              {I.filter}
              {filterCount > 0 && <span className="gt-badge">{filterCount}</span>}
            </button>
            {filterOpen && (
              <div className="gt-pop" role="dialog" aria-label={L.filter}>
                <h5>{L.tag}</h5>
                <div className="gt-swatches">
                  <button type="button" className={`gt-swatch-btn all ${tagF === 'all' ? 'on' : ''}`} aria-pressed={tagF === 'all'} onClick={() => setTagF('all')}>
                    {L.anyTag}
                  </button>
                  {TAGS.filter((x) => x.id !== 'none').map((x) => (
                    <button key={x.id} type="button" className={`gt-swatch-btn ${tagF === x.id ? 'on' : ''}`} aria-pressed={tagF === x.id} aria-label={L.tags[x.id]} title={L.tags[x.id]} onClick={() => setTagF(tagF === x.id ? 'all' : x.id)}>
                      <span className="gt-swatch" style={{ background: x.color }} />
                    </button>
                  ))}
                </div>
                <h5>{L.priority}</h5>
                <div className="gt-segs">
                  {[-1, 0, 1, 2, 3].map((p) => (
                    <button key={p} type="button" className={priF === p ? 'on' : ''} aria-pressed={priF === p} onClick={() => setPriF(p)}>
                      {p < 0 ? L.anyPriority : L[`p${p}` as 'p0']}
                    </button>
                  ))}
                </div>
                {filterCount > 0 && (
                  <button
                    type="button"
                    className="gt-link"
                    onClick={() => {
                      setTagF('all');
                      setPriF(-1);
                    }}
                  >
                    {L.clear}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
        <button type="button" className="gt-icon-btn tint" aria-label={!sidebar && view === 'goals' ? L.newGoal : L.newTask} title={!sidebar && view === 'goals' ? L.newGoal : L.newTask} onClick={() => (!sidebar && view === 'goals' ? newGoal() : newTask('todo'))}>
          {I.plus}
        </button>
      </DragBar>

      {(compact && (view === 'board' || sidebar)) || hasChips ? (
        <div className="gt-subbar">
          {compact && view === 'board' && searchBox}
          {hasChips && <div className="gt-fchips">{chips}</div>}
        </div>
      ) : null}

      <div className="gt-body">
        {sidebar && (
          <aside className="gt-side" aria-label={L.goals}>
            <button type="button" className={`gt-side-item ${!goalFilter ? 'on' : ''}`} onClick={() => setGoalFilter('')}>
              <span className="gt-side-ic">{I.check}</span>
              <span className="gt-side-text">
                <span>{L.allTasks}</span>
              </span>
              <span className="gt-count">{tasks.length}</span>
            </button>
            <div className="gt-side-head">
              <h4>{L.goals}</h4>
              <button type="button" className="gt-icon-btn xs" aria-label={L.newGoal} title={L.newGoal} onClick={newGoal}>
                {I.plus}
              </button>
            </div>
            {activeGoals.map(goalRow)}
            {!activeGoals.length && (
              <div className="gt-side-empty">
                <p>{L.noGoalsHint}</p>
                <button type="button" className="gt-btn sm" onClick={newGoal}>
                  {I.plus}
                  {L.newGoal}
                </button>
              </div>
            )}
            {archivedList}
          </aside>
        )}
        <main className="gt-main">{sidebar || view === 'board' ? board : goalsView()}</main>
      </div>

      {drag &&
        (() => {
          const t = tasks.find((x) => x.id === drag.id);
          if (!t) return null;
          return (
            <div className={`gt-card gt-ghost ${t.col === 'done' ? 'is-done' : ''}`} style={{ left: drag.x - drag.offX, top: drag.y - drag.offY, width: drag.w }} aria-hidden="true">
              {cardInner(t)}
            </div>
          );
        })()}

      {menu && menuTask && (
        <div ref={menuRef} className="gt-menu" role="menu" aria-label={`${L.more}: ${menuTask.title}`} style={{ visibility: 'hidden' }} onKeyDown={menuKeys}>
          <div className="gt-menu-label">{L.moveTo}</div>
          {COLS.map((c) => (
            <button
              key={c}
              type="button"
              role="menuitem"
              disabled={menuTask.col === c}
              onClick={() => {
                moveTask(menuTask.id, c, null);
                setMenu(null);
              }}
            >
              <span className={`gt-col-dot c-${c}`} aria-hidden="true" />
              {L[c]}
              {menuTask.col === c && <span className="gt-menu-check">{I.check}</span>}
            </button>
          ))}
          <hr />
          {(() => {
            const list = tasks.filter((x) => x.col === menuTask.col);
            const i = list.findIndex((x) => x.id === menuTask.id);
            return (
              <>
                <button type="button" role="menuitem" disabled={i <= 0} onClick={() => (shiftTask(menuTask, -1), setMenu(null))}>
                  {I.up}
                  {L.moveUp}
                </button>
                <button type="button" role="menuitem" disabled={i >= list.length - 1} onClick={() => (shiftTask(menuTask, 1), setMenu(null))}>
                  {I.down}
                  {L.moveDown}
                </button>
              </>
            );
          })()}
          <hr />
          <button type="button" role="menuitem" onClick={() => (setTaskEd({ t: menuTask, isNew: false }), setMenu(null))}>
            {I.edit}
            {L.edit}
          </button>
          {hasReminder(menuTask) ? (
            <button type="button" role="menuitem" onClick={() => (wm.open('reminders'), setMenu(null))}>
              {I.bell}
              {L.openRem}
            </button>
          ) : (
            <button type="button" role="menuitem" onClick={() => (addReminder(menuTask), setMenu(null))}>
              {I.bell}
              {L.addRem}
            </button>
          )}
          {menuCalIn ? (
            <button type="button" role="menuitem" onClick={() => (wm.open('calendar'), setMenu(null))}>
              {I.cal}
              {L.openCal}
            </button>
          ) : (
            <button type="button" role="menuitem" disabled={!menuTask.due} title={menuTask.due ? undefined : L.needDue} onClick={() => (addCalendar(menuTask), setMenu(null))}>
              {I.cal}
              {L.addCal}
            </button>
          )}
          {menuTask.due ? (
            <button type="button" role="menuitem" onClick={() => (saveIcs(menuTask), setMenu(null))}>
              {I.dl}
              {L.ics}
            </button>
          ) : (
            <div className="gt-menu-hint">{L.needDue}</div>
          )}
          <hr />
          <button type="button" role="menuitem" className="danger" onClick={() => (askDeleteTask(menuTask), setMenu(null))}>
            {I.trash}
            {L.del}
          </button>
        </div>
      )}

      {taskEd && (
        <TaskEditor
          L={L}
          lang={lang}
          init={taskEd.t}
          isNew={taskEd.isNew}
          goals={goals}
          inReminders={hasReminder(taskEd.t)}
          inCalendar={hasCal(taskEd.t)}
          onCancel={() => setTaskEd(null)}
          onSave={(t) => saveTask(t, taskEd.isNew)}
          onDelete={() => askDeleteTask(taskEd.t)}
          onReminder={(t) => {
            if (hasReminder(t)) wm.open('reminders');
            else {
              saveTask(t, taskEd.isNew);
              addReminder(t);
            }
          }}
          onCalendar={(t) => {
            if (hasCal(t)) wm.open('calendar');
            else {
              saveTask(t, taskEd.isNew);
              addCalendar(t);
            }
          }}
          onIcs={(t) => saveIcs(t)}
        />
      )}
      {goalEd && (
        <GoalEditor
          L={L}
          init={goalEd.g}
          isNew={goalEd.isNew}
          onCancel={() => setGoalEd(null)}
          onDelete={() => askDeleteGoal(goalEd.g)}
          onSave={(g) => {
            const clean = { ...g, title: g.title.trim(), why: g.why.trim(), milestones: g.milestones.map((m) => ({ ...m, text: m.text.trim() })).filter((m) => m.text) };
            setGoals((gs) => (goalEd.isNew ? [...gs, clean] : gs.map((x) => (x.id === clean.id ? clean : x))));
            if (goalEd.isNew) {
              if (sidebar) setGoalFilter(clean.id);
              else setOpenGoal(clean.id);
            }
            setGoalEd(null);
          }}
        />
      )}

      {confirm && (
        <div className="gt-scrim center" onPointerDown={(e) => e.target === e.currentTarget && setConfirm(null)}>
          <div className="gt-alert" role="alertdialog" aria-modal="true" aria-labelledby="gt-alert-t" aria-describedby="gt-alert-d">
            <h3 id="gt-alert-t">{confirm.title}</h3>
            <p id="gt-alert-d">{confirm.sub}</p>
            <div className="gt-alert-btns">
              <button type="button" className="gt-btn" autoFocus onClick={() => setConfirm(null)}>
                {L.cancel}
              </button>
              <button
                type="button"
                className="gt-btn destructive"
                onClick={() => {
                  confirm.run();
                  setConfirm(null);
                }}
              >
                {L.del}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="gt-toast" role="status">
          <span>{toast.text}</span>
          {toast.action && (
            <button
              type="button"
              onClick={() => {
                toast.action?.run();
                setToast(null);
              }}
            >
              {toast.action.label}
            </button>
          )}
        </div>
      )}
      <div className="gt-sr" aria-live="polite">
        {live}
      </div>
    </div>
  );
}

/* ───────────────────────────── Editors ───────────────────────────── */

function TaskEditor({
  L,
  lang,
  init,
  isNew,
  goals,
  inReminders,
  inCalendar,
  onCancel,
  onSave,
  onDelete,
  onReminder,
  onCalendar,
  onIcs,
}: {
  L: Dict;
  lang: Lang;
  init: Task;
  isNew: boolean;
  goals: Goal[];
  inReminders: boolean;
  inCalendar: boolean;
  onCancel: () => void;
  onSave: (t: Task) => void;
  onDelete: () => void;
  onReminder: (t: Task) => void;
  onCalendar: (t: Task) => void;
  onIcs: (t: Task) => void;
}) {
  const [t, setT] = useState<Task>(init);
  const ok = t.title.trim().length > 0;
  const goalOpts = goals.filter((g) => !g.archived || g.id === t.goal);
  const clean = () => ({ ...t, title: t.title.trim(), notes: t.notes.trim() });
  return (
    <div className="gt-scrim" onPointerDown={(e) => e.target === e.currentTarget && onCancel()}>
      <form
        className="gt-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={isNew ? L.newTask : L.editTask}
        onSubmit={(e) => {
          e.preventDefault();
          if (ok) onSave(t);
        }}
      >
        <header className="gt-sheet-head">
          <button type="button" className="gt-link" onClick={onCancel}>
            {L.cancel}
          </button>
          <h3>{isNew ? L.newTask : L.editTask}</h3>
          <button type="submit" className="gt-link strong" disabled={!ok}>
            {L.save}
          </button>
        </header>
        <div className="gt-sheet-body">
          <label className="gt-field">
            <span>{L.title}</span>
            <input autoFocus value={t.title} maxLength={140} placeholder={L.titlePh} onChange={(e) => setT({ ...t, title: e.target.value })} />
          </label>
          <label className="gt-field">
            <span>{L.notes}</span>
            <textarea rows={3} value={t.notes} maxLength={2000} placeholder={L.notesPh} onChange={(e) => setT({ ...t, notes: e.target.value })} />
          </label>
          <div className="gt-row2">
            <label className="gt-field">
              <span>{L.due}</span>
              <span className="gt-date">
                <input type="date" value={t.due} onChange={(e) => setT({ ...t, due: e.target.value })} />
                {t.due && (
                  <button type="button" className="gt-icon-btn xs" aria-label={`${L.clear}: ${L.due}`} onClick={() => setT({ ...t, due: '' })}>
                    {I.close}
                  </button>
                )}
              </span>
            </label>
            <label className="gt-field">
              <span>{L.column}</span>
              <select value={t.col} onChange={(e) => setT({ ...t, col: e.target.value as Col })}>
                {COLS.map((c) => (
                  <option key={c} value={c}>
                    {L[c]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="gt-field">
            <span id="gt-pri-l">{L.priority}</span>
            <div className="gt-segs" role="radiogroup" aria-labelledby="gt-pri-l">
              {[0, 1, 2, 3].map((p) => (
                <button key={p} type="button" role="radio" aria-checked={t.priority === p} className={t.priority === p ? 'on' : ''} onClick={() => setT({ ...t, priority: p })}>
                  {L[`p${p}` as 'p0']}
                </button>
              ))}
            </div>
          </div>
          <div className="gt-field">
            <span id="gt-tag-l">{L.tag}</span>
            <div className="gt-swatches" role="radiogroup" aria-labelledby="gt-tag-l">
              {TAGS.map((x) => (
                <button key={x.id} type="button" role="radio" aria-checked={t.tag === x.id} aria-label={L.tags[x.id]} title={L.tags[x.id]} className={`gt-swatch-btn ${t.tag === x.id ? 'on' : ''}`} onClick={() => setT({ ...t, tag: x.id })}>
                  <span className={`gt-swatch ${x.id === 'none' ? 'none' : ''}`} style={{ background: x.color }} />
                </button>
              ))}
            </div>
          </div>
          <label className="gt-field">
            <span>{L.goal}</span>
            <select value={t.goal} onChange={(e) => setT({ ...t, goal: e.target.value })}>
              <option value="">{L.noGoal}</option>
              {goalOpts.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.title}
                </option>
              ))}
            </select>
          </label>
          <div className="gt-integr">
            <button type="button" className="gt-btn" disabled={!ok} onClick={() => onReminder(clean())}>
              {I.bell}
              {inReminders ? L.openRem : L.addRem}
            </button>
            <button type="button" className="gt-btn" disabled={!ok || !t.due} onClick={() => onCalendar(clean())}>
              {I.cal}
              {inCalendar ? L.openCal : L.addCal}
            </button>
            <button type="button" className="gt-btn" disabled={!ok || !t.due} onClick={() => onIcs(clean())}>
              {I.dl}
              .ics
            </button>
            {!t.due && <p className="gt-muted small">{L.needDue}</p>}
            {t.due && <p className="gt-muted small">{fmtDay(t.due, lang)}</p>}
          </div>
          {!isNew && (
            <button type="button" className="gt-btn danger wide" onClick={onDelete}>
              {I.trash}
              {L.del}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

function GoalEditor({ L, init, isNew, onCancel, onSave, onDelete }: { L: Dict; init: Goal; isNew: boolean; onCancel: () => void; onSave: (g: Goal) => void; onDelete: () => void }) {
  const [g, setG] = useState<Goal>(init);
  const [draft, setDraft] = useState('');
  const ok = g.title.trim().length > 0;
  const add = () => {
    const text = draft.trim();
    if (!text) return;
    setG({ ...g, milestones: [...g.milestones, { id: uid('m'), text, done: false }] });
    setDraft('');
  };
  return (
    <div className="gt-scrim" onPointerDown={(e) => e.target === e.currentTarget && onCancel()}>
      <form
        className="gt-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={isNew ? L.newGoal : L.editGoal}
        onSubmit={(e) => {
          e.preventDefault();
          if (draft.trim()) {
            add();
            return;
          }
          if (ok) onSave(g);
        }}
      >
        <header className="gt-sheet-head">
          <button type="button" className="gt-link" onClick={onCancel}>
            {L.cancel}
          </button>
          <h3>{isNew ? L.newGoal : L.editGoal}</h3>
          <button type="button" className="gt-link strong" disabled={!ok} onClick={() => onSave(draft.trim() ? { ...g, milestones: [...g.milestones, { id: uid('m'), text: draft.trim(), done: false }] } : g)}>
            {L.save}
          </button>
        </header>
        <div className="gt-sheet-body">
          <label className="gt-field">
            <span>{L.title}</span>
            <input autoFocus value={g.title} maxLength={100} placeholder={L.goalPh} onChange={(e) => setG({ ...g, title: e.target.value })} />
          </label>
          <label className="gt-field">
            <span>{L.why}</span>
            <textarea rows={2} value={g.why} maxLength={400} placeholder={L.whyPh} onChange={(e) => setG({ ...g, why: e.target.value })} />
          </label>
          <label className="gt-field">
            <span>{L.target}</span>
            <input type="date" value={g.target} onChange={(e) => setG({ ...g, target: e.target.value })} />
          </label>
          <div className="gt-field">
            <span>{L.milestones}</span>
            <ul className="gt-ms-edit">
              {g.milestones.map((m, i) => (
                <li key={m.id}>
                  <input
                    value={m.text}
                    maxLength={120}
                    aria-label={`${L.milestones} ${i + 1}`}
                    onChange={(e) => setG({ ...g, milestones: g.milestones.map((x) => (x.id === m.id ? { ...x, text: e.target.value } : x)) })}
                  />
                  <button type="button" className="gt-icon-btn xs" aria-label={`${L.del}: ${m.text}`} onClick={() => setG({ ...g, milestones: g.milestones.filter((x) => x.id !== m.id) })}>
                    {I.close}
                  </button>
                </li>
              ))}
              <li>
                <input value={draft} maxLength={120} placeholder={L.milestonePh} aria-label={L.addMilestone} onChange={(e) => setDraft(e.target.value)} />
                <button type="button" className="gt-icon-btn xs tint" aria-label={L.addMilestone} disabled={!draft.trim()} onClick={add}>
                  {I.plus}
                </button>
              </li>
            </ul>
          </div>
          {!isNew && (
            <button type="button" className="gt-btn danger wide" onClick={onDelete}>
              {I.trash}
              {L.del}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
