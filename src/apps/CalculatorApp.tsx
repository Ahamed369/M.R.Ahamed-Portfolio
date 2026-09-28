import { useCallback, useEffect, useRef, useState } from 'react';
import { DragBar, Lights } from '../components/Window';

type Op = '+' | '−' | '×' | '÷';

function apply(a: number, b: number, op: Op): number {
  switch (op) {
    case '+':
      return a + b;
    case '−':
      return a - b;
    case '×':
      return a * b;
    case '÷':
      return b === 0 ? NaN : a / b;
  }
}

function format(n: number): string {
  if (!Number.isFinite(n)) return 'Error';
  const s = Math.abs(n) >= 1e12 || (Math.abs(n) < 1e-7 && n !== 0) ? n.toExponential(5) : String(parseFloat(n.toPrecision(12)));
  const [int, dec] = s.split('.');
  if (s.includes('e')) return s;
  const withCommas = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return dec !== undefined ? `${withCommas}.${dec}` : withCommas;
}

/** macOS-style calculator with keyboard support (0-9 . + - * / Enter = Esc % Backspace). */
export default function CalculatorApp() {
  const [display, setDisplay] = useState('0');
  const [acc, setAcc] = useState<number | null>(null);
  const [op, setOp] = useState<Op | null>(null);
  const [fresh, setFresh] = useState(true); // next digit starts a new number
  const [pressed, setPressed] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const current = () => parseFloat(display.replace(/,/g, '')) || 0;

  const digit = useCallback(
    (d: string) => {
      setDisplay((cur) => {
        if (fresh || cur === '0' || cur === 'Error') return d === '.' ? '0.' : d;
        if (d === '.' && cur.includes('.')) return cur;
        if (cur.replace(/[,.-]/g, '').length >= 12) return cur;
        const raw = cur.replace(/,/g, '') + d;
        if (d === '.') return cur + '.';
        const [i, dec] = raw.split('.');
        return dec !== undefined ? `${i.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${dec}` : i.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      });
      setFresh(false);
    },
    [fresh],
  );

  const operator = (o: Op) => {
    const v = current();
    if (acc !== null && op && !fresh) {
      const r = apply(acc, v, op);
      setAcc(r);
      setDisplay(format(r));
    } else setAcc(v);
    setOp(o);
    setFresh(true);
  };

  const equals = () => {
    if (acc === null || !op) return;
    const r = apply(acc, current(), op);
    setDisplay(format(r));
    setAcc(null);
    setOp(null);
    setFresh(true);
  };

  const clear = () => {
    if (!fresh && display !== '0') {
      setDisplay('0');
      setFresh(true);
      return;
    }
    setDisplay('0');
    setAcc(null);
    setOp(null);
    setFresh(true);
  };

  const sign = () => setDisplay(format(-current()));
  const percent = () => {
    setDisplay(format(current() / 100));
    setFresh(true);
  };
  const back = () => {
    if (fresh) return;
    setDisplay((cur) => {
      const raw = cur.replace(/,/g, '').slice(0, -1);
      return raw === '' || raw === '-' ? '0' : format(parseFloat(raw)) + (raw.endsWith('.') ? '.' : '');
    });
  };

  useEffect(() => {
    rootRef.current?.focus();
  }, []);

  const onKey = (e: React.KeyboardEvent) => {
    const k = e.key;
    let id: string | null = null;
    if (/^[0-9]$/.test(k)) {
      digit(k);
      id = k;
    } else if (k === '.' || k === ',') {
      digit('.');
      id = '.';
    } else if (k === '+') {
      operator('+');
      id = '+';
    } else if (k === '-') {
      operator('−');
      id = '−';
    } else if (k === '*' || k === 'x') {
      operator('×');
      id = '×';
    } else if (k === '/') {
      e.preventDefault();
      operator('÷');
      id = '÷';
    } else if (k === 'Enter' || k === '=') {
      e.preventDefault();
      equals();
      id = '=';
    } else if (k === 'Escape' || k === 'Delete') {
      clear();
      id = 'AC';
    } else if (k === 'Backspace') back();
    else if (k === '%') {
      percent();
      id = '%';
    }
    if (id) {
      setPressed(id);
      window.setTimeout(() => setPressed(null), 120);
    }
  };

  const clearLabel = !fresh && display !== '0' ? 'C' : 'AC';
  const size = display.length > 9 ? (display.length > 12 ? 24 : 32) : 44;

  const keys: { id: string; label: string; kind: 'fn' | 'num' | 'op'; action: () => void; wide?: boolean }[] = [
    { id: 'AC', label: clearLabel, kind: 'fn', action: clear },
    { id: '±', label: '±', kind: 'fn', action: sign },
    { id: '%', label: '%', kind: 'fn', action: percent },
    { id: '÷', label: '÷', kind: 'op', action: () => operator('÷') },
    ...['7', '8', '9'].map((d) => ({ id: d, label: d, kind: 'num' as const, action: () => digit(d) })),
    { id: '×', label: '×', kind: 'op', action: () => operator('×') },
    ...['4', '5', '6'].map((d) => ({ id: d, label: d, kind: 'num' as const, action: () => digit(d) })),
    { id: '−', label: '−', kind: 'op', action: () => operator('−') },
    ...['1', '2', '3'].map((d) => ({ id: d, label: d, kind: 'num' as const, action: () => digit(d) })),
    { id: '+', label: '+', kind: 'op', action: () => operator('+') },
    { id: '0', label: '0', kind: 'num', action: () => digit('0'), wide: true },
    { id: '.', label: '.', kind: 'num', action: () => digit('.') },
    { id: '=', label: '=', kind: 'op', action: equals },
  ];

  return (
    <div className="calculator calc7" ref={rootRef} tabIndex={0} onKeyDown={onKey} aria-label="Calculator — type numbers on your keyboard">
      <DragBar className="calc7-top">
        <Lights />
      </DragBar>
      <div className="calc-display calc7-display" aria-live="polite" style={{ fontSize: size }}>
        {display}
      </div>
      <div className="calc-keys calc7-keys">
        {keys.map((k) => (
          <button
            key={k.id}
            type="button"
            className={`calc7-key ${k.kind} ${k.wide ? 'wide' : ''} ${k.kind === 'op' && op === k.id && fresh ? 'active' : ''} ${pressed === k.id ? 'pressed' : ''}`}
            onClick={k.action}
            aria-label={k.id === 'AC' ? (clearLabel === 'C' ? 'Clear' : 'All clear') : k.label}
          >
            {k.label}
          </button>
        ))}
      </div>
    </div>
  );
}
