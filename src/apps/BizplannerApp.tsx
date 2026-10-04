import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { DragBar, Lights } from '../components/Window';
import { readStore, writeStore } from '../system/storage';
import { usePersisted, uid } from '../system/useStore';
import { notify } from '../system/notify';
import { useWM } from '../system/WindowManager';
import { useSettings } from '../system/SettingsContext';
import type { AppProps } from '../components/Desktop';

/**
 * v10.3 — Business Planner: several plans, each with a Business Model Canvas,
 * a SWOT, a budget / break-even calculator and an idea-validation checklist.
 * Export to Notes, Documents or a print-friendly page (Save as PDF).
 * Everything is general guidance for any entrepreneur and stays in this browser.
 */

/* ─────────────────────────── types ─────────────────────────── */

type Lang = 'en' | 'si' | 'ta';
type Tool = 'canvas' | 'swot' | 'budget' | 'check';
type BlockId = 'kp' | 'ka' | 'kr' | 'vp' | 'cr' | 'ch' | 'cs' | 'cost' | 'rev';
type SwotId = 's' | 'w' | 'o' | 't';
type NoteColor = 'yellow' | 'pink' | 'green' | 'blue' | 'purple' | 'orange';
interface Sticky {
  id: string;
  text: string;
  color: NoteColor;
}
interface Row {
  id: string;
  label: string;
  amount: number;
}
interface Budget {
  currency: Currency;
  startup: Row[];
  fixed: Row[];
  varCost: number;
  price: number;
  units: number;
}
interface Plan {
  id: string;
  name: string;
  sample?: boolean;
  created: number;
  updated: number;
  canvas: Record<BlockId, Sticky[]>;
  swot: Record<SwotId, { id: string; text: string }[]>;
  budget: Budget;
  check: Record<string, { done: boolean; note: string }>;
}
const CURRENCIES = ['LKR', 'USD', 'EUR', 'GBP', 'INR', 'AED'] as const;
type Currency = (typeof CURRENCIES)[number];

const KEY = 'mra-bizplanner-v1';
const UI_KEY = 'mra-bizplanner-ui-v1';
const DOCS_KEY = 'mra-docs-saved-v1';
const NOTES_KEY = 'mra-notes-mine';

/* ─────────────────────────── labels ─────────────────────────── */

const L = {
  app: { en: 'Business Planner', si: 'ව්‍යාපාර සැලසුම්කරු', ta: 'வணிகத் திட்டமிடல்' },
  plans: { en: 'Plans', si: 'සැලසුම්', ta: 'திட்டங்கள்' },
  newPlan: { en: 'New Plan', si: 'නව සැලසුම', ta: 'புதிய திட்டம்' },
  sample: { en: 'Open Sample Plan', si: 'නියැදි සැලසුම විවෘත කරන්න', ta: 'மாதிரித் திட்டத்தைத் திற' },
  sampleTag: { en: 'SAMPLE', si: 'නියැදිය', ta: 'மாதிரி' },
  canvas: { en: 'Canvas', si: 'කැන්වසය', ta: 'கேன்வாஸ்' },
  canvasLong: { en: 'Business Model Canvas', si: 'ව්‍යාපාර ආකෘති කැන්වසය', ta: 'வணிக மாதிரி கேன்வாஸ்' },
  swot: { en: 'SWOT', si: 'SWOT', ta: 'SWOT' },
  budget: { en: 'Budget', si: 'අයවැය', ta: 'வரவுசெலவு' },
  check: { en: 'Checklist', si: 'පිරික්සුම', ta: 'சரிபார்ப்பு' },
  rename: { en: 'Rename', si: 'නම වෙනස් කරන්න', ta: 'பெயர் மாற்று' },
  duplicate: { en: 'Duplicate', si: 'අනුපිටපතක් සාදන්න', ta: 'நகலெடு' },
  del: { en: 'Delete', si: 'මකන්න', ta: 'நீக்கு' },
  cancel: { en: 'Cancel', si: 'අවලංගු කරන්න', ta: 'ரத்துசெய்' },
  delQ: { en: 'Delete this plan?', si: 'මෙම සැලසුම මකන්නද?', ta: 'இந்தத் திட்டத்தை நீக்கவா?' },
  delBody: {
    en: 'All of its canvas, SWOT, budget and checklist data will be removed from this browser.',
    si: 'එහි කැන්වසය, SWOT, අයවැය සහ පිරික්සුම් දත්ත මෙම බ්‍රව්සරයෙන් ඉවත් වේ.',
    ta: 'அதன் கேன்வாஸ், SWOT, வரவுசெலவு, சரிபார்ப்பு தரவுகள் இந்த உலாவியிலிருந்து நீக்கப்படும்.',
  },
  notes: { en: 'Save to Notes', si: 'සටහන් වෙත සුරකින්න', ta: 'குறிப்புகளில் சேமி' },
  docs: { en: 'Save to Documents', si: 'ලේඛන වෙත සුරකින්න', ta: 'ஆவணங்களில் சேமி' },
  print: { en: 'Print / Save as PDF', si: 'මුද්‍රණය / PDF ලෙස සුරකින්න', ta: 'அச்சிடு / PDF ஆக சேமி' },
  printView: { en: 'Print view', si: 'මුද්‍රණ දසුන', ta: 'அச்சு முன்னோட்டம்' },
  close: { en: 'Close', si: 'වසන්න', ta: 'மூடு' },
  more: { en: 'More actions', si: 'තවත් ක්‍රියා', ta: 'மேலும் செயல்கள்' },
  addNote: { en: 'Add note', si: 'සටහනක් එක් කරන්න', ta: 'குறிப்பு சேர்' },
  add: { en: 'Add', si: 'එක් කරන්න', ta: 'சேர்' },
  finish: { en: 'Done', si: 'අවසන්', ta: 'முடிந்தது' },
  remove: { en: 'Remove', si: 'ඉවත් කරන්න', ta: 'அகற்று' },
  s: { en: 'Strengths', si: 'ශක්තීන්', ta: 'பலங்கள்' },
  w: { en: 'Weaknesses', si: 'දුර්වලතා', ta: 'பலவீனங்கள்' },
  o: { en: 'Opportunities', si: 'අවස්ථා', ta: 'வாய்ப்புகள்' },
  t: { en: 'Threats', si: 'තර්ජන', ta: 'அச்சுறுத்தல்கள்' },
  currency: { en: 'Currency', si: 'මුදල් ඒකකය', ta: 'நாணயம்' },
  startup: { en: 'Start-up costs (one-time)', si: 'ආරම්භක පිරිවැය (එක් වරක්)', ta: 'தொடக்கச் செலவுகள் (ஒருமுறை)' },
  fixed: { en: 'Monthly fixed costs', si: 'මාසික ස්ථාවර පිරිවැය', ta: 'மாதாந்திர நிலையான செலவுகள்' },
  unitEco: { en: 'Per unit & volume', si: 'ඒකකයකට සහ ප්‍රමාණය', ta: 'அலகு மற்றும் அளவு' },
  varCost: { en: 'Variable cost per unit', si: 'ඒකකයකට විචල්‍ය පිරිවැය', ta: 'ஒரு அலகுக்கான மாறும் செலவு' },
  price: { en: 'Price per unit', si: 'ඒකකයක මිල', ta: 'ஒரு அலகின் விலை' },
  units: { en: 'Expected units / month', si: 'මසකට අපේක්ෂිත ඒකක', ta: 'மாதம் எதிர்பார்க்கும் அலகுகள்' },
  item: { en: 'Item', si: 'අයිතමය', ta: 'உருப்படி' },
  amount: { en: 'Amount', si: 'මුදල', ta: 'தொகை' },
  addRow: { en: 'Add row', si: 'පේළියක් එක් කරන්න', ta: 'வரிசை சேர்' },
  total: { en: 'Total', si: 'එකතුව', ta: 'மொத்தம்' },
  results: { en: 'Results', si: 'ප්‍රතිඵල', ta: 'முடிவுகள்' },
  profit: { en: 'Monthly profit', si: 'මාසික ලාභය', ta: 'மாதாந்திர லாபம்' },
  loss: { en: 'Monthly loss', si: 'මාසික අලාභය', ta: 'மாதாந்திர நஷ்டம்' },
  be: { en: 'Break-even units / month', si: 'සමච්ඡේද ඒකක / මසකට', ta: 'சமநிலை அலகுகள் / மாதம்' },
  recover: { en: 'Months to recover start-up', si: 'ආරම්භක පිරිවැය අයකර ගැනීමට මාස', ta: 'தொடக்கச் செலவை மீட்க மாதங்கள்' },
  months: { en: 'months', si: 'මාස', ta: 'மாதங்கள்' },
  ready: { en: 'ready', si: 'සූදානම්', ta: 'தயார்' },
  noteFor: { en: 'Notes', si: 'සටහන්', ta: 'குறிப்புகள்' },
  noPlans: { en: 'No plans yet', si: 'තවම සැලසුම් නැත', ta: 'இன்னும் திட்டங்கள் இல்லை' },
  noPlansBody: {
    en: 'Create a plan, or open the sample plan to see how every tool works.',
    si: 'සැලසුමක් සාදන්න, නැතහොත් සියලු මෙවලම් ක්‍රියා කරන ආකාරය බැලීමට නියැදිය විවෘත කරන්න.',
    ta: 'ஒரு திட்டத்தை உருவாக்கவும் அல்லது கருவிகள் எப்படி இயங்குகின்றன என்பதைப் பார்க்க மாதிரியைத் திறக்கவும்.',
  },
  untitled: { en: 'Untitled plan', si: 'නම් නොකළ සැලසුම', ta: 'பெயரிடாத திட்டம்' },
  copy: { en: 'copy', si: 'පිටපත', ta: 'நகல்' },
  planName: { en: 'Plan name', si: 'සැලසුමේ නම', ta: 'திட்டப் பெயர்' },
  empty: { en: 'Nothing yet', si: 'තවම කිසිවක් නැත', ta: 'இன்னும் எதுவும் இல்லை' },
  chart: { en: 'Break-even chart', si: 'සමච්ඡේද ප්‍රස්තාරය', ta: 'சமநிலை வரைபடம்' },
  revenue: { en: 'Revenue', si: 'ආදායම', ta: 'வருவாய்' },
  totalCost: { en: 'Total cost', si: 'මුළු පිරිවැය', ta: 'மொத்தச் செலவு' },
  updated: { en: 'Edited', si: 'සංස්කරණය', ta: 'திருத்தப்பட்டது' },
} satisfies Record<string, Record<Lang, string>>;
type LKey = keyof typeof L;

/* ─────────────────────────── content ─────────────────────────── */

const BLOCKS: { id: BlockId; t: Record<Lang, string>; hint: string }[] = [
  { id: 'kp', t: { en: 'Key Partners', si: 'ප්‍රධාන හවුල්කරුවන්', ta: 'முக்கிய கூட்டாளர்கள்' }, hint: 'Who helps you deliver? Suppliers, partners and allies you rely on.' },
  { id: 'ka', t: { en: 'Key Activities', si: 'ප්‍රධාන ක්‍රියාකාරකම්', ta: 'முக்கிய செயல்பாடுகள்' }, hint: 'The most important things you must do every day to deliver value.' },
  { id: 'kr', t: { en: 'Key Resources', si: 'ප්‍රධාන සම්පත්', ta: 'முக்கிய வளங்கள்' }, hint: 'Assets you need: people, equipment, money, skills, brand.' },
  { id: 'vp', t: { en: 'Value Propositions', si: 'වටිනාකම් යෝජනා', ta: 'மதிப்பு முன்மொழிவுகள்' }, hint: 'What problem do you solve, and why would customers choose you?' },
  { id: 'cr', t: { en: 'Customer Relationships', si: 'පාරිභෝගික සබඳතා', ta: 'வாடிக்கையாளர் உறவுகள்' }, hint: 'How you win, keep and grow customers (personal, self-service, community).' },
  { id: 'ch', t: { en: 'Channels', si: 'නාලිකා', ta: 'வழிகள்' }, hint: 'How customers hear about you, buy from you and receive the product.' },
  { id: 'cs', t: { en: 'Customer Segments', si: 'පාරිභෝගික කොටස්', ta: 'வாடிக்கையாளர் பிரிவுகள்' }, hint: 'Who exactly are you serving? Your most important customers.' },
  { id: 'cost', t: { en: 'Cost Structure', si: 'පිරිවැය ව්‍යුහය', ta: 'செலவுக் கட்டமைப்பு' }, hint: 'The biggest costs of running the model: fixed and variable.' },
  { id: 'rev', t: { en: 'Revenue Streams', si: 'ආදායම් මාර්ග', ta: 'வருவாய் வழிகள்' }, hint: 'How you earn money from each segment, and how they prefer to pay.' },
];
const SWOT_HINT: Record<SwotId, string> = {
  s: 'Internal advantages you already have.',
  w: 'Internal gaps or limits to fix or work around.',
  o: 'External trends or openings you could use.',
  t: 'External risks that could hurt the plan.',
};
const CHECK: { id: string; t: Record<Lang, string>; hint: string }[] = [
  { id: 'problem', t: { en: 'Problem clearly defined', si: 'ගැටලුව පැහැදිලිව නිර්වචනය කර ඇත', ta: 'பிரச்சினை தெளிவாக வரையறுக்கப்பட்டது' }, hint: 'One sentence: who has the problem, and how painful is it?' },
  { id: 'customers', t: { en: 'Talked to 10+ potential customers', si: 'අපේක්ෂිත පාරිභෝගිකයින් 10+ සමඟ කතා කළා', ta: '10+ வாடிக்கையாளர்களுடன் பேசினேன்' }, hint: 'Ask about their current behaviour, not whether they "like the idea".' },
  { id: 'segment', t: { en: 'Target customer described', si: 'ඉලක්ක පාරිභෝගිකයා විස්තර කර ඇත', ta: 'இலக்கு வாடிக்கையாளர் விவரிக்கப்பட்டார்' }, hint: 'Age, place, habits and budget of your first customers.' },
  { id: 'competitors', t: { en: 'Competitors listed', si: 'තරඟකරුවන් ලැයිස්තුගත කර ඇත', ta: 'போட்டியாளர்கள் பட்டியலிடப்பட்டனர்' }, hint: 'Direct rivals and the alternatives people use today.' },
  { id: 'usp', t: { en: 'Clear advantage (why you?)', si: 'පැහැදිලි වාසිය (ඇයි ඔබ?)', ta: 'தெளிவான தனித்துவம் (ஏன் நீங்கள்?)' }, hint: 'What you do better, cheaper, faster or differently.' },
  { id: 'mvp', t: { en: 'MVP defined', si: 'MVP නිර්වචනය කර ඇත', ta: 'MVP வரையறுக்கப்பட்டது' }, hint: 'The smallest version you can sell to learn quickly.' },
  { id: 'pricing', t: { en: 'Pricing tested', si: 'මිල ගණන් පරීක්ෂා කළා', ta: 'விலை சோதிக்கப்பட்டது' }, hint: 'Someone has paid, pre-ordered or committed at your price.' },
  { id: 'channels', t: { en: 'Channels chosen', si: 'නාලිකා තෝරා ඇත', ta: 'விற்பனை வழிகள் தேர்ந்தெடுக்கப்பட்டன' }, hint: 'Where you will reach and sell to customers first.' },
  { id: 'costs', t: { en: 'Costs estimated', si: 'පිරිවැය ඇස්තමේන්තු කර ඇත', ta: 'செலவுகள் மதிப்பிடப்பட்டன' }, hint: 'Fill in the Budget tool: start-up, fixed and per-unit costs.' },
  { id: 'funding', t: { en: 'Funding plan ready', si: 'අරමුදල් සැලැස්ම සූදානම්', ta: 'நிதித் திட்டம் தயார்' }, hint: 'Savings, loan, partner or grant, and how long the money lasts.' },
  { id: 'legal', t: { en: 'Legal / registration checked', si: 'නීතිමය / ලියාපදිංචිය පරීක්ෂා කළා', ta: 'சட்டம் / பதிவு சரிபார்க்கப்பட்டது' }, hint: 'Business registration, licences, tax and permits for your area.' },
  { id: 'metric', t: { en: 'Success measure set', si: 'සාර්ථකත්ව මිනුම සකසා ඇත', ta: 'வெற்றி அளவீடு அமைக்கப்பட்டது' }, hint: 'A number that tells you the idea is working (e.g. weekly sales).' },
];
const COLORS: NoteColor[] = ['yellow', 'pink', 'green', 'blue', 'purple', 'orange'];
const TOOLS: Tool[] = ['canvas', 'swot', 'budget', 'check'];
const TOOL_LABEL: Record<Tool, LKey> = { canvas: 'canvas', swot: 'swot', budget: 'budget', check: 'check' };

/* ─────────────────────────── model helpers ─────────────────────────── */

const emptyCanvas = (): Record<BlockId, Sticky[]> => ({ kp: [], ka: [], kr: [], vp: [], cr: [], ch: [], cs: [], cost: [], rev: [] });
function newPlan(name: string): Plan {
  const now = Date.now();
  return {
    id: uid('bp'),
    name,
    created: now,
    updated: now,
    canvas: emptyCanvas(),
    swot: { s: [], w: [], o: [], t: [] },
    budget: { currency: 'LKR', startup: [{ id: uid('r'), label: '', amount: 0 }], fixed: [{ id: uid('r'), label: '', amount: 0 }], varCost: 0, price: 0, units: 0 },
    check: {},
  };
}
function samplePlan(): Plan {
  const p = newPlan('Sample: Neighbourhood bakery');
  p.sample = true;
  const n = (text: string, color: NoteColor = 'yellow'): Sticky => ({ id: uid('n'), text, color });
  p.canvas = {
    kp: [n('Local flour & dairy suppliers'), n('Nearby cafés that resell bread', 'blue')],
    ka: [n('Baking fresh every morning'), n('Taking pre-orders for events', 'pink')],
    kr: [n('Oven, mixer & small shop'), n('Two trained bakers', 'green')],
    vp: [n('Fresh bread before 7 am', 'orange'), n('Healthy wholemeal options'), n('Custom birthday cakes', 'pink')],
    cr: [n('Know regulars by name'), n('Loyalty card: 10th loaf free', 'purple')],
    ch: [n('Walk-in shop'), n('WhatsApp orders & delivery', 'green'), n('Social media posts', 'blue')],
    cs: [n('Families within 2 km'), n('Office workers on the way to work', 'blue'), n('Small cafés', 'purple')],
    cost: [n('Rent & utilities'), n('Wages'), n('Ingredients & packaging', 'orange')],
    rev: [n('Daily bread & buns'), n('Cake orders', 'pink'), n('Wholesale to cafés', 'green')],
  };
  const it = (text: string) => ({ id: uid('w'), text });
  p.swot = {
    s: [it('Fresh, early-morning baking'), it('Friendly local service')],
    w: [it('Small team — hard to scale quickly'), it('Limited seating space')],
    o: [it('Growing demand for healthier bread'), it('Event and party orders')],
    t: [it('Supermarket bakery prices'), it('Rising flour and fuel costs')],
  };
  const r = (label: string, amount: number): Row => ({ id: uid('r'), label, amount });
  p.budget = {
    currency: 'LKR',
    startup: [r('Oven & mixer', 450000), r('Shop fit-out', 300000), r('Registration & licences', 25000), r('First stock', 60000), r('Signage', 40000)],
    fixed: [r('Rent', 60000), r('Wages', 120000), r('Utilities', 25000), r('Marketing', 10000), r('Other', 5000)],
    varCost: 120,
    price: 250,
    units: 3000,
  };
  p.check = {
    problem: { done: true, note: 'No fresh bread available before 7 am in this area.' },
    customers: { done: true, note: 'Spoke to 14 neighbours and 3 café owners.' },
    segment: { done: true, note: '' },
    competitors: { done: true, note: 'One supermarket bakery, two small shops.' },
    usp: { done: true, note: 'Earliest opening + wholemeal range.' },
    mvp: { done: false, note: 'Weekend stall test for 4 weeks.' },
    pricing: { done: false, note: '' },
    costs: { done: true, note: 'See Budget tab.' },
    legal: { done: false, note: 'Check local council food-handling licence.' },
  };
  return p;
}

/** Correct budget maths — every number shown in the app comes from here. */
export function calcBudget(b: Budget) {
  const sum = (rows: Row[]) => rows.reduce((a, r) => a + (Number.isFinite(r.amount) ? r.amount : 0), 0);
  const startupTotal = sum(b.startup);
  const fixedTotal = sum(b.fixed);
  const revenue = b.price * b.units;
  const variableTotal = b.varCost * b.units;
  const contribution = b.price - b.varCost; // margin each unit adds
  const profit = revenue - variableTotal - fixedTotal;
  // Break-even units: the first whole unit count where contribution covers fixed costs.
  const beExact = contribution > 0 ? fixedTotal / contribution : null;
  const beUnits = beExact === null ? null : Math.ceil(beExact - 1e-9);
  // Months to recover start-up from monthly profit.
  const recExact = startupTotal <= 0 ? 0 : profit > 0 ? startupTotal / profit : null;
  const recMonths = recExact === null ? null : Math.ceil(recExact - 1e-9);
  return { startupTotal, fixedTotal, revenue, variableTotal, contribution, profit, beExact, beUnits, recExact, recMonths };
}

function money(n: number, c: Currency) {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: c, currencyDisplay: c === 'LKR' || c === 'AED' ? 'code' : 'symbol', maximumFractionDigits: Math.abs(n) % 1 ? 2 : 0 }).format(n);
  } catch {
    return `${c} ${n.toLocaleString()}`;
  }
}
const num = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 2 });
function compact(n: number) {
  const a = Math.abs(n);
  if (a >= 1e9) return `${+(n / 1e9).toFixed(1)}B`;
  if (a >= 1e6) return `${+(n / 1e6).toFixed(1)}M`;
  if (a >= 1e3) return `${+(n / 1e3).toFixed(1)}k`;
  return `${Math.round(n)}`;
}
function niceCeil(v: number) {
  if (v <= 0) return 10;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const m = v / p;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p;
}

function checkScore(p: Plan) {
  const done = CHECK.filter((c) => p.check[c.id]?.done).length;
  return { done, total: CHECK.length, pct: Math.round((done / CHECK.length) * 100) };
}

/** Plain-text export used by Notes and Documents. */
function planToText(p: Plan): string {
  const b = calcBudget(p.budget);
  const c = p.budget.currency;
  const out: string[] = [];
  if (p.sample) out.push('SAMPLE PLAN — example data for demonstration only.', '');
  out.push('BUSINESS MODEL CANVAS');
  for (const blk of BLOCKS) {
    out.push(`${blk.t.en}:`);
    out.push(...(p.canvas[blk.id].length ? p.canvas[blk.id].filter((s) => s.text.trim()).map((s) => `  • ${s.text.trim()}`) : ['  —']));
  }
  out.push('', 'SWOT');
  (['s', 'w', 'o', 't'] as SwotId[]).forEach((k) => {
    out.push(`${L[k].en}:`);
    const items = p.swot[k].filter((x) => x.text.trim());
    out.push(...(items.length ? items.map((x) => `  • ${x.text.trim()}`) : ['  —']));
  });
  out.push('', `BUDGET (${c})`, 'Start-up costs:');
  p.budget.startup.filter((r) => r.label || r.amount).forEach((r) => out.push(`  • ${r.label || 'Item'}: ${money(r.amount, c)}`));
  out.push(`  Total start-up: ${money(b.startupTotal, c)}`, 'Monthly fixed costs:');
  p.budget.fixed.filter((r) => r.label || r.amount).forEach((r) => out.push(`  • ${r.label || 'Item'}: ${money(r.amount, c)}`));
  out.push(
    `  Total fixed / month: ${money(b.fixedTotal, c)}`,
    `Price per unit: ${money(p.budget.price, c)} · Variable cost per unit: ${money(p.budget.varCost, c)} · Expected units / month: ${num(p.budget.units)}`,
    `Monthly revenue: ${money(b.revenue, c)}`,
    `Monthly variable costs: ${money(b.variableTotal, c)}`,
    `Monthly profit: ${money(b.profit, c)}`,
    `Break-even: ${b.beUnits === null ? 'not reachable (price must be above variable cost)' : `${num(b.beUnits)} units / month`}`,
    `Months to recover start-up: ${b.recMonths === null ? 'not recovered at this profit' : num(b.recMonths)}`,
  );
  const sc = checkScore(p);
  out.push('', `IDEA CHECKLIST — ${sc.pct}% ready (${sc.done}/${sc.total})`);
  CHECK.forEach((it) => {
    const st = p.check[it.id];
    out.push(`  [${st?.done ? 'x' : ' '}] ${it.t.en}${st?.note?.trim() ? ` — ${st.note.trim()}` : ''}`);
  });
  return out.join('\n');
}

/* ─────────────────────────── icons (original) ─────────────────────────── */

const I = {
  plus: <path d="M10 4v12M4 10h12" />,
  trash: <path d="M5 6h10M8 6V4.5h4V6M6.5 6l.7 9.5h5.6l.7-9.5" />,
  dup: (
    <>
      <rect x="7" y="7" width="9" height="9" rx="2" />
      <path d="M13 7V5.5A1.5 1.5 0 0 0 11.5 4h-6A1.5 1.5 0 0 0 4 5.5v6A1.5 1.5 0 0 0 5.5 13H7" />
    </>
  ),
  more: (
    <>
      <circle cx="5" cy="10" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="10" cy="10" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="15" cy="10" r="1.3" fill="currentColor" stroke="none" />
    </>
  ),
  print: (
    <>
      <path d="M6 8V3.5h8V8" />
      <rect x="3" y="8" width="14" height="6.5" rx="2" />
      <path d="M6.5 12.5h7V17h-7z" />
    </>
  ),
  note: (
    <>
      <path d="M5 3.5h10a1.5 1.5 0 0 1 1.5 1.5v6.5L11.5 16.5H5A1.5 1.5 0 0 1 3.5 15V5A1.5 1.5 0 0 1 5 3.5z" />
      <path d="M11.5 16.5V13a1.5 1.5 0 0 1 1.5-1.5h3.5M6.5 7.5h7M6.5 10.5h4" />
    </>
  ),
  doc: (
    <>
      <path d="M5.5 2.8h6l3.7 3.7v10a1.2 1.2 0 0 1-1.2 1.2H5.5a1.2 1.2 0 0 1-1.2-1.2V4a1.2 1.2 0 0 1 1.2-1.2z" />
      <path d="M11.3 2.8v3.9h3.9M7 10.5h6M7 13.5h4" />
    </>
  ),
  back: <path d="M12.5 4 6.5 10l6 6" />,
  pencil: <path d="M4 16l1-3.8L13.2 4a1.6 1.6 0 0 1 2.3 0l.5.5a1.6 1.6 0 0 1 0 2.3L7.8 15 4 16z" />,
  spark: <path d="M10 2.5l1.7 4.6 4.8 1.7-4.8 1.7L10 15.1l-1.7-4.6-4.8-1.7 4.8-1.7zM15.5 13.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z" />,
  check: <path d="M4.5 10.5l3.5 3.5 7.5-8" />,
  close: <path d="M5 5l10 10M15 5L5 15" />,
};
function Ico({ d, size = 18 }: { d: keyof typeof I; size?: number }) {
  return (
    <svg className="bp-ico" viewBox="0 0 20 20" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {I[d]}
    </svg>
  );
}
function BpGlyph() {
  return (
    <svg viewBox="0 0 40 40" width="40" height="40" aria-hidden="true" className="bp-glyph">
      <rect x="3" y="3" width="34" height="34" rx="9" fill="var(--bp-accent)" />
      <path d="M11 27V20M17 27V15M23 27V18M29 27V12" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" />
    </svg>
  );
}

/* ─────────────────────────── small inputs ─────────────────────────── */

function NumInput({ value, onChange, label, prefix }: { value: number; onChange: (n: number) => void; label: string; prefix?: string }) {
  const [s, setS] = useState(String(value || ''));
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setS(value ? String(value) : '');
  }, [value]);
  return (
    <span className="bp-num">
      {prefix && <i aria-hidden="true">{prefix}</i>}
      <input
        type="text"
        inputMode="decimal"
        aria-label={label}
        placeholder="0"
        value={s}
        onFocus={() => (focused.current = true)}
        onBlur={() => {
          focused.current = false;
          setS(value ? String(value) : '');
        }}
        onChange={(e) => {
          const raw = e.target.value.replace(/[^\d.,-]/g, '');
          setS(raw);
          const n = parseFloat(raw.replace(/,/g, ''));
          onChange(Number.isFinite(n) && n >= 0 ? n : 0);
        }}
      />
    </span>
  );
}

/* ─────────────────────────── canvas ─────────────────────────── */

function StickyNote({ s, tr, onChange, onDelete, autoEdit }: { s: Sticky; tr: (k: LKey) => string; onChange: (s: Sticky) => void; onDelete: () => void; autoEdit: boolean }) {
  const [edit, setEdit] = useState(autoEdit);
  const ta = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (edit) ta.current?.focus();
  }, [edit]);
  const finish = () => {
    setEdit(false);
    if (!s.text.trim()) onDelete();
  };
  if (!edit)
    return (
      <button type="button" className={`bp-sticky c-${s.color}`} onClick={() => setEdit(true)} aria-label={`Edit note: ${s.text}`}>
        {s.text}
      </button>
    );
  return (
    <div
      className={`bp-sticky editing c-${s.color}`}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) finish();
      }}
    >
      <textarea
        ref={ta}
        value={s.text}
        rows={3}
        aria-label={tr('noteFor')}
        onChange={(e) => onChange({ ...s, text: e.target.value })}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) (e.preventDefault(), finish());
          if (e.key === 'Escape') finish();
        }}
      />
      <div className="bp-sticky-tools">
        {COLORS.map((c) => (
          <button key={c} type="button" className={`bp-sw c-${c} ${s.color === c ? 'on' : ''}`} aria-label={c} aria-pressed={s.color === c} onClick={() => onChange({ ...s, color: c })} />
        ))}
        <button type="button" className="bp-mini danger" aria-label={tr('remove')} onClick={onDelete}>
          <Ico d="trash" size={15} />
        </button>
        <button type="button" className="bp-mini ok" aria-label={tr('finish')} onClick={finish}>
          <Ico d="check" size={15} />
        </button>
      </div>
    </div>
  );
}

function CanvasTool({ plan, set, tr, lang }: { plan: Plan; set: (f: (p: Plan) => Plan) => void; tr: (k: LKey) => string; lang: Lang }) {
  const [fresh, setFresh] = useState<string | null>(null);
  const upd = (b: BlockId, list: Sticky[]) => set((p) => ({ ...p, canvas: { ...p.canvas, [b]: list } }));
  return (
    <div className="bp-canvas">
      {BLOCKS.map((blk) => {
        const list = plan.canvas[blk.id];
        return (
          <section key={blk.id} className={`bp-block b-${blk.id}`} aria-label={blk.t.en}>
            <header>
              <h3>{blk.t[lang]}</h3>
              <button
                type="button"
                className="bp-mini"
                aria-label={`${tr('addNote')} — ${blk.t.en}`}
                onClick={() => {
                  const s: Sticky = { id: uid('n'), text: '', color: COLORS[list.length % COLORS.length] };
                  setFresh(s.id);
                  upd(blk.id, [...list, s]);
                }}
              >
                <Ico d="plus" size={15} />
              </button>
            </header>
            <p className="bp-hint">{blk.hint}</p>
            <div className="bp-stickies">
              {list.map((s) => (
                <StickyNote
                  key={s.id}
                  s={s}
                  tr={tr}
                  autoEdit={fresh === s.id}
                  onChange={(n) => upd(blk.id, plan.canvas[blk.id].map((x) => (x.id === n.id ? n : x)))}
                  onDelete={() => set((p) => ({ ...p, canvas: { ...p.canvas, [blk.id]: p.canvas[blk.id].filter((x) => x.id !== s.id) } }))}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

/* ─────────────────────────── SWOT ─────────────────────────── */

function SwotTool({ plan, set, tr }: { plan: Plan; set: (f: (p: Plan) => Plan) => void; tr: (k: LKey) => string }) {
  const [draft, setDraft] = useState<Record<SwotId, string>>({ s: '', w: '', o: '', t: '' });
  const add = (k: SwotId) => {
    const text = draft[k].trim();
    if (!text) return;
    set((p) => ({ ...p, swot: { ...p.swot, [k]: [...p.swot[k], { id: uid('w'), text }] } }));
    setDraft((d) => ({ ...d, [k]: '' }));
  };
  return (
    <div className="bp-swot">
      {(['s', 'w', 'o', 't'] as SwotId[]).map((k) => (
        <section key={k} className={`bp-quad q-${k}`}>
          <header>
            <span className="bp-letter" aria-hidden="true">
              {k.toUpperCase()}
            </span>
            <div>
              <h3>{tr(k)}</h3>
              <p className="bp-hint">{SWOT_HINT[k]}</p>
            </div>
          </header>
          <ul>
            {plan.swot[k].map((it) => (
              <li key={it.id}>
                <input
                  value={it.text}
                  aria-label={tr(k)}
                  onChange={(e) => set((p) => ({ ...p, swot: { ...p.swot, [k]: p.swot[k].map((x) => (x.id === it.id ? { ...x, text: e.target.value } : x)) } }))}
                />
                <button type="button" className="bp-mini danger" aria-label={tr('remove')} onClick={() => set((p) => ({ ...p, swot: { ...p.swot, [k]: p.swot[k].filter((x) => x.id !== it.id) } }))}>
                  <Ico d="trash" size={15} />
                </button>
              </li>
            ))}
            {!plan.swot[k].length && <li className="bp-none">{tr('empty')}</li>}
          </ul>
          <form
            className="bp-addline"
            onSubmit={(e) => {
              e.preventDefault();
              add(k);
            }}
          >
            <input value={draft[k]} onChange={(e) => setDraft((d) => ({ ...d, [k]: e.target.value }))} placeholder={`${tr('add')} — ${tr(k)}`} aria-label={`${tr('add')} ${tr(k)}`} />
            <button type="submit" className="bp-mini" aria-label={tr('add')} disabled={!draft[k].trim()}>
              <Ico d="plus" size={15} />
            </button>
          </form>
        </section>
      ))}
    </div>
  );
}

/* ─────────────────────────── budget ─────────────────────────── */

function BreakEvenChart({ b, tr, id }: { b: Budget; tr: (k: LKey) => string; id: string }) {
  const r = calcBudget(b);
  const [hx, setHx] = useState<number | null>(null);
  const W = 520;
  const H = 230;
  const pad = { l: 52, r: 14, t: 14, b: 34 };
  const xMax = niceCeil(Math.max(b.units, r.beUnits ?? 0, 10) * 1.35);
  const yMax = niceCeil(Math.max(b.price * xMax, r.fixedTotal + b.varCost * xMax, 1));
  const X = (u: number) => pad.l + (u / xMax) * (W - pad.l - pad.r);
  const Y = (v: number) => H - pad.b - (v / yMax) * (H - pad.t - pad.b);
  const rev = (u: number) => b.price * u;
  const cost = (u: number) => r.fixedTotal + b.varCost * u;
  const ticks = [0, 0.25, 0.5, 0.75, 1];
  const be = r.beExact !== null && r.beExact <= xMax ? r.beExact : null;
  const hover = hx === null ? null : Math.max(0, Math.min(xMax, Math.round(hx)));
  return (
    <figure className="bp-chart">
      <figcaption>
        <b>{tr('chart')}</b>
        <span className="bp-legend">
          <i className="lg rev" /> {tr('revenue')} <i className="lg cost" /> {tr('totalCost')}
        </span>
      </figcaption>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`${tr('chart')}: ${tr('revenue')} vs ${tr('totalCost')}`}
        onPointerMove={(e) => {
          const rc = e.currentTarget.getBoundingClientRect();
          const px = ((e.clientX - rc.left) / rc.width) * W;
          setHx(px < pad.l || px > W - pad.r ? null : ((px - pad.l) / (W - pad.l - pad.r)) * xMax);
        }}
        onPointerLeave={() => setHx(null)}
      >
        <defs>
          <clipPath id={`clip-${id}`}>
            <rect x={pad.l} y={pad.t} width={W - pad.l - pad.r} height={H - pad.t - pad.b} />
          </clipPath>
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line className="grid" x1={pad.l} x2={W - pad.r} y1={Y(yMax * t)} y2={Y(yMax * t)} />
            <text className="ax" x={pad.l - 6} y={Y(yMax * t) + 3.5} textAnchor="end">
              {compact(yMax * t)}
            </text>
            <text className="ax" x={X(xMax * t)} y={H - pad.b + 15} textAnchor="middle">
              {compact(xMax * t)}
            </text>
          </g>
        ))}
        <text className="ax" x={(W + pad.l) / 2} y={H - 4} textAnchor="middle">
          units / month
        </text>
        <g clipPath={`url(#clip-${id})`}>
          {be !== null && (
            <>
              <polygon className="zone loss" points={`${X(0)},${Y(cost(0))} ${X(be)},${Y(cost(be))} ${X(0)},${Y(rev(0))}`} />
              <polygon className="zone gain" points={`${X(be)},${Y(rev(be))} ${X(xMax)},${Y(rev(xMax))} ${X(xMax)},${Y(cost(xMax))}`} />
            </>
          )}
          <line className="ln cost" x1={X(0)} y1={Y(cost(0))} x2={X(xMax)} y2={Y(cost(xMax))} />
          <line className="ln rev" x1={X(0)} y1={Y(0)} x2={X(xMax)} y2={Y(rev(xMax))} />
        </g>
        {be !== null && (
          <g>
            <line className="mark" x1={X(be)} x2={X(be)} y1={pad.t} y2={H - pad.b} />
            <circle className="dot" cx={X(be)} cy={Y(rev(be))} r={5} />
            <text className="lbl" x={X(be) + 7} y={pad.t + 11}>
              Break-even {num(r.beUnits ?? 0)}
            </text>
          </g>
        )}
        {b.units > 0 && b.units <= xMax && (
          <g>
            <line className="mark exp" x1={X(b.units)} x2={X(b.units)} y1={pad.t} y2={H - pad.b} />
            <text className="lbl" x={X(b.units) + 7} y={pad.t + 26}>
              Plan {num(b.units)}
            </text>
          </g>
        )}
        {hover !== null && (
          <g className="hov">
            <line x1={X(hover)} x2={X(hover)} y1={pad.t} y2={H - pad.b} />
            <circle className="dot rev" cx={X(hover)} cy={Y(rev(hover))} r={4} />
            <circle className="dot cost" cx={X(hover)} cy={Y(cost(hover))} r={4} />
          </g>
        )}
      </svg>
      <p className="bp-tip" aria-live="polite">
        {hover !== null
          ? `${num(hover)} units → ${tr('revenue')} ${money(rev(hover), b.currency)} · ${tr('totalCost')} ${money(cost(hover), b.currency)} · ${rev(hover) - cost(hover) >= 0 ? tr('profit') : tr('loss')} ${money(Math.abs(rev(hover) - cost(hover)), b.currency)}`
          : 'Shaded green = profit zone, red = loss zone. Hover or drag across the chart for values.'}
      </p>
    </figure>
  );
}

function RowsTable({ rows, cur, tr, onChange, title }: { rows: Row[]; cur: Currency; tr: (k: LKey) => string; onChange: (r: Row[]) => void; title: string }) {
  const total = rows.reduce((a, r) => a + r.amount, 0);
  return (
    <section className="bp-card">
      <h3>{title}</h3>
      <table className="bp-rows">
        <thead>
          <tr>
            <th>{tr('item')}</th>
            <th className="n">
              {tr('amount')} ({cur})
            </th>
            <th aria-label={tr('remove')} />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>
                <input value={r.label} placeholder={tr('item')} aria-label={`${title} — ${tr('item')}`} onChange={(e) => onChange(rows.map((x) => (x.id === r.id ? { ...x, label: e.target.value } : x)))} />
              </td>
              <td className="n">
                <NumInput value={r.amount} label={`${r.label || tr('item')} — ${tr('amount')}`} onChange={(n) => onChange(rows.map((x) => (x.id === r.id ? { ...x, amount: n } : x)))} />
              </td>
              <td>
                <button type="button" className="bp-mini danger" aria-label={tr('remove')} onClick={() => onChange(rows.filter((x) => x.id !== r.id))}>
                  <Ico d="trash" size={15} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td>
              <button type="button" className="bp-link" onClick={() => onChange([...rows, { id: uid('r'), label: '', amount: 0 }])}>
                <Ico d="plus" size={14} /> {tr('addRow')}
              </button>
            </td>
            <td className="n">
              <b>{money(total, cur)}</b>
            </td>
            <td />
          </tr>
        </tfoot>
      </table>
    </section>
  );
}

function BudgetTool({ plan, set, tr }: { plan: Plan; set: (f: (p: Plan) => Plan) => void; tr: (k: LKey) => string }) {
  const b = plan.budget;
  const r = calcBudget(b);
  const c = b.currency;
  const upd = (patch: Partial<Budget>) => set((p) => ({ ...p, budget: { ...p.budget, ...patch } }));
  return (
    <div className="bp-budget">
      <div className="bp-budget-in">
        <label className="bp-cur">
          {tr('currency')}
          <select value={c} onChange={(e) => upd({ currency: e.target.value as Currency })}>
            {CURRENCIES.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>
        </label>
        <RowsTable title={tr('startup')} rows={b.startup} cur={c} tr={tr} onChange={(rows) => upd({ startup: rows })} />
        <RowsTable title={tr('fixed')} rows={b.fixed} cur={c} tr={tr} onChange={(rows) => upd({ fixed: rows })} />
        <section className="bp-card">
          <h3>{tr('unitEco')}</h3>
          <div className="bp-fields">
            <label>
              <span>{tr('price')}</span>
              <NumInput value={b.price} label={tr('price')} prefix={c} onChange={(n) => upd({ price: n })} />
            </label>
            <label>
              <span>{tr('varCost')}</span>
              <NumInput value={b.varCost} label={tr('varCost')} prefix={c} onChange={(n) => upd({ varCost: n })} />
            </label>
            <label>
              <span>{tr('units')}</span>
              <NumInput value={b.units} label={tr('units')} onChange={(n) => upd({ units: n })} />
            </label>
          </div>
        </section>
      </div>
      <div className="bp-budget-out">
        <div className="bp-kpis">
          <div className={`bp-kpi ${r.profit >= 0 ? 'good' : 'bad'}`} data-kpi="profit">
            <small>{r.profit >= 0 ? tr('profit') : tr('loss')}</small>
            <b>{money(Math.abs(r.profit), c)}</b>
          </div>
          <div className="bp-kpi" data-kpi="be">
            <small>{tr('be')}</small>
            <b>{r.beUnits === null ? '—' : num(r.beUnits)}</b>
            <em>{r.beUnits === null ? 'Price must be above variable cost' : r.beExact !== null && r.beExact % 1 ? `exact ${num(Math.round(r.beExact * 100) / 100)}, rounded up` : 'units each month'}</em>
          </div>
          <div className="bp-kpi" data-kpi="rec">
            <small>{tr('recover')}</small>
            <b>{r.recMonths === null ? '—' : `${num(r.recMonths)}`}</b>
            <em>{r.recMonths === null ? 'Not recovered — monthly profit is zero or negative' : r.recExact !== null && r.recExact % 1 ? `${tr('months')} (exact ${num(Math.round(r.recExact * 100) / 100)})` : tr('months')}</em>
          </div>
        </div>
        <section className="bp-card">
          <h3>{tr('results')}</h3>
          <table className="bp-calc">
            <tbody>
              <tr>
                <th>{tr('revenue')}</th>
                <td className="f">
                  {money(b.price, c)} × {num(b.units)}
                </td>
                <td className="n">{money(r.revenue, c)}</td>
              </tr>
              <tr>
                <th>− Variable costs</th>
                <td className="f">
                  {money(b.varCost, c)} × {num(b.units)}
                </td>
                <td className="n">{money(r.variableTotal, c)}</td>
              </tr>
              <tr>
                <th>− Fixed costs</th>
                <td className="f">per month</td>
                <td className="n">{money(r.fixedTotal, c)}</td>
              </tr>
              <tr className="sum">
                <th>= {r.profit >= 0 ? tr('profit') : tr('loss')}</th>
                <td className="f" />
                <td className="n" data-out="profit">
                  {money(r.profit, c)}
                </td>
              </tr>
              <tr>
                <th>Margin per unit</th>
                <td className="f">
                  {money(b.price, c)} − {money(b.varCost, c)}
                </td>
                <td className="n">{money(r.contribution, c)}</td>
              </tr>
              <tr>
                <th>{tr('be')}</th>
                <td className="f">{r.contribution > 0 ? `${money(r.fixedTotal, c)} ÷ ${money(r.contribution, c)}` : 'margin ≤ 0'}</td>
                <td className="n" data-out="be">
                  {r.beUnits === null ? 'Not reachable' : num(r.beUnits)}
                </td>
              </tr>
              <tr>
                <th>{tr('startup')}</th>
                <td className="f">one-time</td>
                <td className="n">{money(r.startupTotal, c)}</td>
              </tr>
              <tr>
                <th>{tr('recover')}</th>
                <td className="f">{r.profit > 0 && r.startupTotal > 0 ? `${money(r.startupTotal, c)} ÷ ${money(r.profit, c)}` : ''}</td>
                <td className="n" data-out="rec">
                  {r.recMonths === null ? 'Not recovered' : num(r.recMonths)}
                </td>
              </tr>
            </tbody>
          </table>
        </section>
        <BreakEvenChart b={b} tr={tr} id={plan.id} />
        <p className="bp-fine">Estimates only — a planning aid, not financial advice. Break-even and recovery are rounded up to whole units and months.</p>
      </div>
    </div>
  );
}

/* ─────────────────────────── checklist ─────────────────────────── */

function Ring({ pct }: { pct: number }) {
  const R = 30;
  const C = 2 * Math.PI * R;
  return (
    <svg viewBox="0 0 76 76" width="76" height="76" className="bp-ring" aria-hidden="true">
      <circle cx="38" cy="38" r={R} className="trk" />
      <circle cx="38" cy="38" r={R} className="val" strokeDasharray={`${(pct / 100) * C} ${C}`} transform="rotate(-90 38 38)" />
    </svg>
  );
}

function CheckTool({ plan, set, tr, lang }: { plan: Plan; set: (f: (p: Plan) => Plan) => void; tr: (k: LKey) => string; lang: Lang }) {
  const sc = checkScore(plan);
  const upd = (id: string, patch: Partial<{ done: boolean; note: string }>) =>
    set((p) => ({ ...p, check: { ...p.check, [id]: { ...{ done: false, note: '' }, ...p.check[id], ...patch } } }));
  return (
    <div className="bp-check">
      <div className="bp-score">
        <div className="bp-ringwrap">
          <Ring pct={sc.pct} />
          <b data-out="ready">{sc.pct}%</b>
        </div>
        <div>
          <h3>
            {sc.pct}% {tr('ready')}
          </h3>
          <p>
            {sc.done} / {sc.total} · {sc.pct >= 80 ? 'Strong base — time to test with real sales.' : sc.pct >= 50 ? 'Good progress — close the open gaps before spending big.' : 'Early stage — validate before you invest.'}
          </p>
        </div>
      </div>
      <ol className="bp-items">
        {CHECK.map((it) => {
          const st = plan.check[it.id] ?? { done: false, note: '' };
          return (
            <li key={it.id} className={st.done ? 'on' : ''}>
              <label className="bp-cb">
                <input type="checkbox" checked={st.done} onChange={(e) => upd(it.id, { done: e.target.checked })} />
                <span className="box" aria-hidden="true">
                  <Ico d="check" size={14} />
                </span>
                <span className="txt">
                  <b>{it.t[lang]}</b>
                  <small>{it.hint}</small>
                </span>
              </label>
              <textarea value={st.note} rows={1} placeholder={`${tr('noteFor')}…`} aria-label={`${it.t.en} — ${tr('noteFor')}`} onChange={(e) => upd(it.id, { note: e.target.value })} />
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/* ─────────────────────────── print view ─────────────────────────── */

function PrintDoc({ plan }: { plan: Plan }) {
  const b = calcBudget(plan.budget);
  const c = plan.budget.currency;
  const sc = checkScore(plan);
  return (
    <article className="bp-doc">
      <header>
        <small>Business Planner</small>
        <h1>{plan.name}</h1>
        {plan.sample && <p className="bp-doc-sample">SAMPLE PLAN — example data for demonstration only.</p>}
        <p className="bp-doc-meta">Printed {new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}</p>
      </header>
      <h2>Business Model Canvas</h2>
      <div className="bp-doc-canvas">
        {BLOCKS.map((blk) => (
          <section key={blk.id} className={`b-${blk.id}`}>
            <h4>{blk.t.en}</h4>
            <ul>
              {plan.canvas[blk.id]
                .filter((s) => s.text.trim())
                .map((s) => (
                  <li key={s.id}>{s.text}</li>
                ))}
            </ul>
          </section>
        ))}
      </div>
      <h2>SWOT</h2>
      <div className="bp-doc-swot">
        {(['s', 'w', 'o', 't'] as SwotId[]).map((k) => (
          <section key={k}>
            <h4>{L[k].en}</h4>
            <ul>
              {plan.swot[k]
                .filter((x) => x.text.trim())
                .map((x) => (
                  <li key={x.id}>{x.text}</li>
                ))}
            </ul>
          </section>
        ))}
      </div>
      <h2>Budget ({c})</h2>
      <div className="bp-doc-two">
        {(
          [
            ['Start-up costs (one-time)', plan.budget.startup, b.startupTotal],
            ['Monthly fixed costs', plan.budget.fixed, b.fixedTotal],
          ] as const
        ).map(([t, rows, tot]) => (
          <table key={t}>
            <caption>{t}</caption>
            <tbody>
              {rows
                .filter((r) => r.label || r.amount)
                .map((r) => (
                  <tr key={r.id}>
                    <td>{r.label || 'Item'}</td>
                    <td className="n">{money(r.amount, c)}</td>
                  </tr>
                ))}
              <tr className="sum">
                <td>Total</td>
                <td className="n">{money(tot, c)}</td>
              </tr>
            </tbody>
          </table>
        ))}
      </div>
      <table className="bp-doc-res">
        <tbody>
          <tr>
            <td>Price per unit / variable cost per unit</td>
            <td className="n">
              {money(plan.budget.price, c)} / {money(plan.budget.varCost, c)}
            </td>
          </tr>
          <tr>
            <td>Expected units per month</td>
            <td className="n">{num(plan.budget.units)}</td>
          </tr>
          <tr>
            <td>Monthly revenue</td>
            <td className="n">{money(b.revenue, c)}</td>
          </tr>
          <tr>
            <td>Monthly variable costs</td>
            <td className="n">{money(b.variableTotal, c)}</td>
          </tr>
          <tr className="sum">
            <td>Monthly profit</td>
            <td className="n">{money(b.profit, c)}</td>
          </tr>
          <tr>
            <td>Break-even units per month</td>
            <td className="n">{b.beUnits === null ? 'Not reachable' : num(b.beUnits)}</td>
          </tr>
          <tr>
            <td>Months to recover start-up</td>
            <td className="n">{b.recMonths === null ? 'Not recovered' : num(b.recMonths)}</td>
          </tr>
        </tbody>
      </table>
      <BreakEvenChart b={plan.budget} tr={(k) => L[k].en} id={`print-${plan.id}`} />
      <h2>
        Idea checklist — {sc.pct}% ready ({sc.done}/{sc.total})
      </h2>
      <ul className="bp-doc-check">
        {CHECK.map((it) => {
          const st = plan.check[it.id];
          return (
            <li key={it.id}>
              <span className="box">{st?.done ? '✓' : ''}</span>
              <b>{it.t.en}</b>
              {st?.note?.trim() && <em> — {st.note.trim()}</em>}
            </li>
          );
        })}
      </ul>
      <footer>General planning aid. Figures are estimates, not financial advice.</footer>
    </article>
  );
}

/* ─────────────────────────── app ─────────────────────────── */

export default function BizplannerApp({ win }: Partial<AppProps>) {
  void win;
  const wm = useWM();
  const { settings, motionReduced } = useSettings();
  const lang: Lang = settings.language === 'si' || settings.language === 'ta' ? settings.language : 'en';
  const tr = (k: LKey) => L[k][lang];
  const [plans, setPlans] = usePersisted<Plan[]>(KEY, []);
  const [ui, setUi] = usePersisted<{ sel: string | null; tool: Tool; mobile: 'list' | 'plan' }>(UI_KEY, { sel: null, tool: 'canvas', mobile: 'list' });
  const [menu, setMenu] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [preview, setPreview] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const plan = plans.find((p) => p.id === ui.sel) ?? null;
  const sorted = useMemo(() => [...plans].sort((a, b) => b.updated - a.updated), [plans]);

  const setPlan = (f: (p: Plan) => Plan) => {
    if (!plan) return;
    setPlans((all) => all.map((p) => (p.id === plan.id ? { ...f(p), updated: Date.now() } : p)));
  };
  const select = (id: string) => setUi((u) => ({ ...u, sel: id, mobile: 'plan' }));
  const create = (p: Plan) => {
    setPlans((all) => [p, ...all]);
    setUi((u) => ({ ...u, sel: p.id, mobile: 'plan', tool: 'canvas' }));
  };
  const duplicate = () => {
    if (!plan) return;
    const copy: Plan = { ...JSON.parse(JSON.stringify(plan)), id: uid('bp'), name: `${plan.name} (${tr('copy')})`, created: Date.now(), updated: Date.now() };
    create(copy);
  };
  const remove = () => {
    if (!plan) return;
    const rest = plans.filter((p) => p.id !== plan.id);
    setPlans(rest);
    setUi((u) => ({ ...u, sel: rest[0]?.id ?? null, mobile: 'list' }));
    setConfirmDel(false);
  };
  const startRename = () => {
    setRenaming(true);
    setTimeout(() => (nameRef.current?.focus(), nameRef.current?.select()), 30);
  };

  const saveNotes = () => {
    if (!plan) return;
    const cur = readStore<{ list: { id: string; title: string; body: string; at: number }[] }>(NOTES_KEY, { list: [] }).list ?? [];
    const title = `Business plan: ${plan.name}`;
    writeStore(NOTES_KEY, { list: [{ id: `m${Date.now()}`, title, body: planToText(plan), at: Date.now() }, ...cur] });
    notify({ app: 'Notes', icon: 'notes', title: 'Saved to Notes', body: title, actions: [{ label: 'Open Notes', run: () => wm.open('notes') }] });
  };
  const saveDocs = () => {
    if (!plan) return;
    const cur = readStore<{ list: { id: string; title: string; kind: string; body: string; at: number; source: string }[] }>(DOCS_KEY, { list: [] }).list ?? [];
    writeStore(DOCS_KEY, { list: [{ id: uid('doc'), title: plan.name, kind: 'plan', body: planToText(plan), at: Date.now(), source: 'bizplanner' }, ...cur] });
    notify({ app: 'Documents', icon: 'documents', title: 'Saved to Documents', body: plan.name, actions: [{ label: 'Open Documents', run: () => wm.open('documents') }] });
  };

  // close the actions menu on outside tap
  useEffect(() => {
    if (!menu) return;
    const on = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenu(false);
    };
    window.addEventListener('pointerdown', on, true);
    return () => window.removeEventListener('pointerdown', on, true);
  }, [menu]);
  // the print view isolates itself for printing while open
  useEffect(() => {
    if (!preview) return;
    const root = document.documentElement;
    root.classList.add('bp-printing');
    return () => root.classList.remove('bp-printing');
  }, [preview]);

  const act = (f: () => void) => () => (setMenu(false), f());
  const actions: { k: string; icon: keyof typeof I; label: string; run: () => void; danger?: boolean }[] = [
    { k: 'rename', icon: 'pencil', label: tr('rename'), run: startRename },
    { k: 'dup', icon: 'dup', label: tr('duplicate'), run: duplicate },
    { k: 'notes', icon: 'note', label: tr('notes'), run: saveNotes },
    { k: 'docs', icon: 'doc', label: tr('docs'), run: saveDocs },
    { k: 'print', icon: 'print', label: tr('print'), run: () => setPreview(true) },
    { k: 'del', icon: 'trash', label: tr('del'), run: () => setConfirmDel(true), danger: true },
  ];

  const tool = ui.tool;
  return (
    <div className={`bp ${ui.mobile === 'plan' && plan ? 'm-plan' : 'm-list'} ${motionReduced ? 'still' : ''}`}>
      <DragBar className="bp-bar">
        <Lights />
        <b className="bp-title">{tr('app')}</b>
      </DragBar>
      <div className="bp-body">
        <nav className="bp-side" aria-label={tr('plans')}>
          <div className="bp-side-head">
            <h2>{tr('plans')}</h2>
            <button type="button" className="bp-mini filled" aria-label={tr('newPlan')} title={tr('newPlan')} onClick={() => create(newPlan(tr('untitled')))}>
              <Ico d="plus" size={16} />
            </button>
          </div>
          <div className="bp-plan-list">
            {sorted.map((p) => {
              const sc = checkScore(p);
              return (
                <button key={p.id} type="button" className={`bp-plan ${p.id === plan?.id ? 'on' : ''}`} onClick={() => select(p.id)} aria-current={p.id === plan?.id}>
                  <span className="bp-plan-name">
                    {p.sample && <i className="bp-tag">{tr('sampleTag')}</i>}
                    {p.name || tr('untitled')}
                  </span>
                  <small>
                    {sc.pct}% {tr('ready')} · {p.budget.currency}
                  </small>
                  <span className="bp-chev" aria-hidden="true">
                    ›
                  </span>
                </button>
              );
            })}
            {!plans.length && <p className="bp-side-empty">{tr('noPlans')}</p>}
          </div>
          <button type="button" className="bp-sample-btn" onClick={() => create(samplePlan())}>
            <Ico d="spark" size={16} /> {tr('sample')}
          </button>
        </nav>

        <main className="bp-main">
          {!plan ? (
            <div className="bp-empty">
              <BpGlyph />
              <h2>{tr('noPlans')}</h2>
              <p>{tr('noPlansBody')}</p>
              <div className="bp-empty-btns">
                <button type="button" className="bp-btn primary" onClick={() => create(newPlan(tr('untitled')))}>
                  <Ico d="plus" size={16} /> {tr('newPlan')}
                </button>
                <button type="button" className="bp-btn" onClick={() => create(samplePlan())}>
                  <Ico d="spark" size={16} /> {tr('sample')}
                </button>
              </div>
            </div>
          ) : (
            <>
              <header className="bp-head">
                <button type="button" className="bp-back" onClick={() => setUi((u) => ({ ...u, mobile: 'list' }))} aria-label={tr('plans')}>
                  <Ico d="back" size={18} /> {tr('plans')}
                </button>
                <div className="bp-name-row">
                  {plan.sample && <i className="bp-tag">{tr('sampleTag')}</i>}
                  {renaming ? (
                    <input
                      ref={nameRef}
                      className="bp-name-in"
                      value={plan.name}
                      aria-label={tr('planName')}
                      onChange={(e) => setPlan((p) => ({ ...p, name: e.target.value }))}
                      onBlur={() => (setRenaming(false), !plan.name.trim() && setPlan((p) => ({ ...p, name: tr('untitled') })))}
                      onKeyDown={(e) => (e.key === 'Enter' || e.key === 'Escape') && e.currentTarget.blur()}
                    />
                  ) : (
                    <h1 className="bp-name" onDoubleClick={startRename}>
                      {plan.name}
                    </h1>
                  )}
                  <div className="bp-quick">
                    <button type="button" className="bp-mini" onClick={saveNotes} title={tr('notes')} aria-label={tr('notes')}>
                      <Ico d="note" />
                    </button>
                    <button type="button" className="bp-mini" onClick={saveDocs} title={tr('docs')} aria-label={tr('docs')}>
                      <Ico d="doc" />
                    </button>
                    <button type="button" className="bp-mini" onClick={() => setPreview(true)} title={tr('print')} aria-label={tr('print')}>
                      <Ico d="print" />
                    </button>
                  </div>
                  <div className="bp-menu-wrap" ref={menuRef}>
                    <button type="button" className="bp-mini" aria-label={tr('more')} aria-haspopup="menu" aria-expanded={menu} onClick={() => setMenu((m) => !m)}>
                      <Ico d="more" />
                    </button>
                    {menu && (
                      <div className="bp-menu" role="menu">
                        {actions.map((a) => (
                          <button key={a.k} type="button" role="menuitem" className={a.danger ? 'danger' : ''} onClick={act(a.run)}>
                            <Ico d={a.icon} size={16} /> {a.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                {plan.sample && <p className="bp-sample-note">This is a clearly labelled example with made-up figures. Edit it freely or create your own plan.</p>}
                <div className="bp-seg" role="tablist" aria-label={tr('app')}>
                  {TOOLS.map((t) => (
                    <button key={t} type="button" role="tab" aria-selected={tool === t} className={tool === t ? 'on' : ''} onClick={() => setUi((u) => ({ ...u, tool: t }))}>
                      {t === 'check' ? `${tr('check')} · ${checkScore(plan).pct}%` : tr(TOOL_LABEL[t])}
                    </button>
                  ))}
                </div>
              </header>
              <div className="bp-tool" role="tabpanel" key={`${plan.id}-${tool}`}>
                {tool === 'canvas' && <CanvasTool plan={plan} set={setPlan} tr={tr} lang={lang} />}
                {tool === 'swot' && <SwotTool plan={plan} set={setPlan} tr={tr} />}
                {tool === 'budget' && <BudgetTool plan={plan} set={setPlan} tr={tr} />}
                {tool === 'check' && <CheckTool plan={plan} set={setPlan} tr={tr} lang={lang} />}
              </div>
            </>
          )}
        </main>
      </div>

      {confirmDel && plan && (
        <Sheet onClose={() => setConfirmDel(false)} label={tr('delQ')}>
          <h3>{tr('delQ')}</h3>
          <p>
            <b>{plan.name}</b>
          </p>
          <p className="bp-dim">{tr('delBody')}</p>
          <div className="bp-sheet-btns">
            <button type="button" className="bp-btn" onClick={() => setConfirmDel(false)} autoFocus>
              {tr('cancel')}
            </button>
            <button type="button" className="bp-btn danger" onClick={remove}>
              {tr('del')}
            </button>
          </div>
        </Sheet>
      )}

      {preview && plan && (
        <div className="bp-preview" role="dialog" aria-modal="true" aria-label={tr('printView')}>
          <div className="bp-preview-bar">
            <b>{tr('printView')}</b>
            <button type="button" className="bp-btn" onClick={() => setPreview(false)}>
              {tr('close')}
            </button>
            <button type="button" className="bp-btn primary" onClick={() => window.print()}>
              <Ico d="print" size={16} /> {tr('print')}
            </button>
          </div>
          <div className="bp-paper-scroll">
            <div className="bp-paper">
              <PrintDoc plan={plan} />
            </div>
          </div>
          {createPortal(
            <div className="bp-print-root">
              <PrintDoc plan={plan} />
            </div>,
            document.body,
          )}
        </div>
      )}
    </div>
  );
}

function Sheet({ children, onClose, label }: { children: ReactNode; onClose: () => void; label: string }) {
  useEffect(() => {
    const on = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, [onClose]);
  return (
    <div className="bp-scrim" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bp-sheet" role="alertdialog" aria-modal="true" aria-label={label}>
        {children}
      </div>
    </div>
  );
}
