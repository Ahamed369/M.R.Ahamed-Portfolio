import { useEffect, useMemo, useRef, useState, type KeyboardEvent as RKeyboardEvent } from 'react';
import { allSkills, education, projects, projectsUsing, type Project } from '../data/portfolio';
import { readStore, writeStore } from '../system/storage';
import { notify, openExternal } from '../system/notify';

/* ───────────────────────────── Sheet definitions ───────────────────────────── */

type Grid = string[][];
interface SheetDef {
  id: 'projects' | 'skills' | 'education';
  name: string;
  title: string;
  widths: number[];
  /** column holding URLs, rendered as links */
  linkCol?: number;
  /** number of trailing summary rows excluded from sorting */
  footer: number;
  build: () => Grid;
}

const LANG: Record<Project['lang'], string> = { php: 'PHP', js: 'JavaScript', jsx: 'JavaScript (React)', java: 'Java', py: 'Python', html: 'HTML' };

const SHEETS: SheetDef[] = [
  {
    id: 'projects',
    name: 'Projects',
    title: 'Projects',
    widths: [190, 250, 130, 150, 110, 100, 80, 230],
    linkCol: 7,
    footer: 1,
    build: () => {
      const body = projects.map((p) => [p.name, p.category, LANG[p.lang], p.period ?? '', p.status, p.updated ?? '', String(p.features.length), p.repo ?? '']);
      return [['Name', 'Category', 'Language', 'Period', 'Status', 'Updated', 'Features', 'Repo'], ...body, ['Total', '', '', '', '', '', `=SUM(G2:G${body.length + 1})`, '']];
    },
  },
  {
    id: 'skills',
    name: 'Skills',
    title: 'Skills by project',
    widths: [180, 90, 320],
    footer: 3,
    build: () => {
      const rows = allSkills
        .map((s) => ({ s, ps: projectsUsing(s) }))
        .filter((x) => x.ps.length > 0)
        .sort((a, b) => b.ps.length - a.ps.length || a.s.localeCompare(b.s))
        .map((x) => [x.s, String(x.ps.length), x.ps.map((p) => p.name).join(', ')]);
      const end = rows.length + 1;
      return [['Skill', 'Projects', 'Used in'], ...rows, ['Total', `=SUM(B2:B${end})`, ''], ['Average', `=AVERAGE(B2:B${end})`, ''], ['Skills counted', `=COUNT(B2:B${end})`, '']];
    },
  },
  {
    id: 'education',
    name: 'Education',
    title: 'Education',
    widths: [210, 330, 150, 170],
    footer: 0,
    build: () => [['Institution', 'Qualification', 'Period', 'Location'], ...education.map((e) => [e.institution, e.qualification, e.period, e.location ?? ''])],
  },
];

/* ───────────────────────────── Formulas ───────────────────────────── */

const colName = (c: number) => {
  let s = '';
  let n = c + 1;
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
};
const ref = (r: number, c: number) => `${colName(c)}${r + 1}`;

function parseRef(s: string): [number, number] | null {
  const m = /^([A-Z]+)(\d+)$/i.exec(s.trim());
  if (!m) return null;
  let c = 0;
  for (const ch of m[1].toUpperCase()) c = c * 26 + (ch.charCodeAt(0) - 64);
  return [Number(m[2]) - 1, c - 1];
}

function evaluate(grid: Grid, raw: string, depth = 0): string {
  if (!raw.startsWith('=')) return raw;
  if (depth > 20) return '#CYCLE!';
  const body = raw.slice(1).trim();
  const values = (arg: string): number[] => {
    const out: number[] = [];
    for (const part of arg.split(',')) {
      const [a, b] = part.split(':');
      const s = parseRef(a);
      if (!s) {
        const n = Number(part.trim());
        if (part.trim() && !Number.isNaN(n)) out.push(n);
        continue;
      }
      const e = b ? parseRef(b) : s;
      if (!e) continue;
      for (let r = Math.min(s[0], e[0]); r <= Math.max(s[0], e[0]); r++)
        for (let c = Math.min(s[1], e[1]); c <= Math.max(s[1], e[1]); c++) {
          const v = evaluate(grid, grid[r]?.[c] ?? '', depth + 1);
          if (v.trim() !== '' && !Number.isNaN(Number(v))) out.push(Number(v));
        }
    }
    return out;
  };
  const fn = /^(SUM|AVERAGE|AVG|COUNT|MIN|MAX)\((.*)\)$/i.exec(body);
  if (fn) {
    const v = values(fn[2]);
    const name = fn[1].toUpperCase();
    let n: number;
    if (name === 'SUM') n = v.reduce((a, b) => a + b, 0);
    else if (name === 'COUNT') n = v.length;
    else if (!v.length) return name === 'AVERAGE' || name === 'AVG' ? '#DIV/0!' : '0';
    else if (name === 'MIN') n = Math.min(...v);
    else if (name === 'MAX') n = Math.max(...v);
    else n = v.reduce((a, b) => a + b, 0) / v.length;
    return String(Math.round(n * 100) / 100);
  }
  const single = parseRef(body);
  if (single) return evaluate(grid, grid[single[0]]?.[single[1]] ?? '', depth + 1);
  return '#ERROR!';
}

const isNum = (v: string) => v.trim() !== '' && !Number.isNaN(Number(v));

/* ───────────────────────────── App ───────────────────────────── */

interface Stored {
  sheet: SheetDef['id'];
  grids: Partial<Record<SheetDef['id'], Grid>>;
}
const KEY = 'mra-numbers-v1';

export default function NumbersApp() {
  const [store, setStore] = useState<Stored>(() => readStore<Stored>(KEY, { sheet: 'projects', grids: {} }));
  const def = SHEETS.find((s) => s.id === store.sheet) ?? SHEETS[0];
  const original = useMemo(() => def.build(), [def]);
  const grid = store.grids[def.id] ?? original;
  const nRows = grid.length;
  const nCols = grid[0].length;

  const [sel, setSel] = useState<[number, number]>([1, 0]);
  const [editing, setEditing] = useState<string | null>(null);
  const [bar, setBar] = useState('');
  const [menu, setMenu] = useState<number | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const editRef = useRef<HTMLInputElement>(null);

  useEffect(() => writeStore(KEY, store), [store]);
  useEffect(() => {
    setSel([1, 0]);
    setEditing(null);
    setMenu(null);
  }, [def.id]);

  const [r, c] = sel;
  const raw = grid[r]?.[c] ?? '';
  useEffect(() => setBar(raw), [raw, r, c]);
  useEffect(() => {
    if (editing !== null) editRef.current?.focus();
  }, [editing]);

  // keep the selected cell in view
  useEffect(() => {
    gridRef.current?.querySelector<HTMLElement>('.nm-cell.sel')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [r, c]);

  const setGrid = (g: Grid) => setStore((s) => ({ ...s, grids: { ...s.grids, [def.id]: g } }));
  const commit = (value: string, rr = r, cc = c) => {
    if ((grid[rr]?.[cc] ?? '') === value) return;
    setGrid(grid.map((row, i) => (i === rr ? row.map((v, j) => (j === cc ? value : v)) : row)));
  };

  const move = (dr: number, dc: number) => setSel(([a, b]) => [Math.max(0, Math.min(nRows - 1, a + dr)), Math.max(0, Math.min(nCols - 1, b + dc))]);

  const onGridKey = (e: RKeyboardEvent) => {
    if (editing !== null) return;
    const k = e.key;
    if (k === 'ArrowUp') move(-1, 0);
    else if (k === 'ArrowDown') move(1, 0);
    else if (k === 'ArrowLeft') move(0, -1);
    else if (k === 'ArrowRight') move(0, 1);
    else if (k === 'Tab') move(0, e.shiftKey ? -1 : 1);
    else if (k === 'Enter' || k === 'F2') setEditing(raw);
    else if (k === 'Backspace' || k === 'Delete') commit('');
    else if (k.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) setEditing(k);
    else return;
    e.preventDefault();
  };

  const onEditKey = (e: RKeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      commit(editing ?? '');
      setEditing(null);
      if (e.key === 'Enter') move(e.shiftKey ? -1 : 1, 0);
      else move(0, e.shiftKey ? -1 : 1);
      gridRef.current?.focus();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setEditing(null);
      gridRef.current?.focus();
    }
  };

  const sort = (col: number, dir: 1 | -1) => {
    const head = grid[0];
    const body = grid.slice(1, nRows - def.footer);
    const foot = grid.slice(nRows - def.footer);
    const val = (row: string[]) => evaluate(grid, row[col] ?? '');
    body.sort((a, b) => {
      const x = val(a);
      const y = val(b);
      if (x === '' && y !== '') return 1;
      if (y === '' && x !== '') return -1;
      if (isNum(x) && isNum(y)) return (Number(x) - Number(y)) * dir;
      return x.localeCompare(y, undefined, { numeric: true, sensitivity: 'base' }) * dir;
    });
    setGrid([head, ...body, ...foot]);
    setMenu(null);
    notify({ app: 'Numbers', icon: 'numbers', title: `Sorted by ${head[col]}`, body: dir === 1 ? 'Ascending' : 'Descending' });
  };

  const exportCsv = () => {
    const q = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
    const csv = grid.map((row) => row.map((v) => q(evaluate(grid, v))).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${def.name}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
    notify({ app: 'Numbers', icon: 'numbers', title: 'Exported CSV', body: `${def.name}.csv` });
  };

  const reset = () => {
    setStore((s) => {
      const g = { ...s.grids };
      delete g[def.id];
      return { ...s, grids: g };
    });
    setEditing(null);
    notify({ app: 'Numbers', icon: 'numbers', title: `${def.name} reset`, body: 'Restored the values from the portfolio data.' });
  };

  const edited = !!store.grids[def.id];

  // chart data for the Skills sheet (reflects edits)
  const chart = useMemo(() => {
    if (def.id !== 'skills') return [];
    return grid
      .slice(1, nRows - def.footer)
      .map((row) => ({ label: row[0], value: Number(evaluate(grid, row[1] ?? '')) }))
      .filter((d) => d.label && Number.isFinite(d.value) && d.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [def, grid, nRows]);

  const shown = editing !== null ? editing : raw;
  const isFooter = (i: number) => def.footer > 0 && i >= nRows - def.footer;

  return (
    <div className="nm" onClick={() => menu !== null && setMenu(null)}>
      <div className="nm-toolbar">
        <div className="nm-tabs" role="tablist" aria-label="Sheets">
          {SHEETS.map((s) => (
            <button key={s.id} type="button" role="tab" aria-selected={s.id === def.id} className={s.id === def.id ? 'on' : ''} onClick={() => setStore((st) => ({ ...st, sheet: s.id }))}>
              {s.name}
            </button>
          ))}
        </div>
        <span className="nm-grow" />
        {edited && <span className="nm-edited">Edited</span>}
        <button type="button" className="nm-btn" onClick={reset} disabled={!edited}>
          Reset
        </button>
        <button type="button" className="nm-btn nm-primary" onClick={exportCsv}>
          Export CSV
        </button>
      </div>

      <div className="nm-fbar">
        <span className="nm-ref">{ref(r, c)}</span>
        <span className="nm-fx" aria-hidden="true">
          ƒx
        </span>
        <input
          aria-label={`Contents of ${ref(r, c)}`}
          value={editing !== null ? editing : bar}
          onChange={(e) => (editing !== null ? setEditing(e.target.value) : setBar(e.target.value))}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              commit(editing !== null ? editing : bar);
              setEditing(null);
              gridRef.current?.focus();
            } else if (e.key === 'Escape') {
              setBar(raw);
              setEditing(null);
              gridRef.current?.focus();
            }
          }}
          onBlur={() => editing === null && bar !== raw && commit(bar)}
        />
      </div>

      <div className="nm-canvas scroll-smooth">
        <div className="nm-objects">
          {def.id === 'skills' && chart.length > 0 && <BarChart data={chart} />}
          <section className="nm-table-obj">
            <h2 className="nm-title">{def.title}</h2>
            <div ref={gridRef} className="nm-grid" tabIndex={0} role="grid" aria-label={`${def.name} table`} aria-rowcount={nRows} aria-colcount={nCols} onKeyDown={onGridKey}>
              <table>
                <colgroup>
                  <col style={{ width: 36 }} />
                  {def.widths.map((w, i) => (
                    <col key={i} style={{ width: w }} />
                  ))}
                </colgroup>
                <thead>
                  <tr className="nm-letters">
                    <th className="nm-corner" aria-hidden="true" />
                    {grid[0].map((_, j) => (
                      <th key={j} className={j === c ? 'hl' : ''} scope="col">
                        {colName(j)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {grid.map((row, i) => (
                    <tr key={i} className={i === 0 ? 'nm-head' : isFooter(i) ? 'nm-foot' : i % 2 === 0 ? 'nm-alt' : ''}>
                      <th className={`nm-rownum ${i === r ? 'hl' : ''}`} scope="row">
                        {i + 1}
                      </th>
                      {row.map((v, j) => {
                        const on = i === r && j === c;
                        const val = evaluate(grid, v);
                        const num = i > 0 && isNum(val);
                        return (
                          <td
                            key={j}
                            role="gridcell"
                            aria-selected={on}
                            className={`nm-cell ${on ? 'sel' : ''} ${num ? 'num' : ''} ${v.startsWith('=') ? 'fx' : ''}`}
                            onMouseDown={() => {
                              if (editing !== null && !on) {
                                commit(editing);
                                setEditing(null);
                              }
                              setSel([i, j]);
                            }}
                            onClick={() => gridRef.current?.focus({ preventScroll: true })}
                            onDoubleClick={() => setEditing(v)}
                          >
                            {on && editing !== null ? (
                              <input
                                ref={editRef}
                                className="nm-edit"
                                value={editing}
                                aria-label={`Edit ${ref(i, j)}`}
                                onChange={(e) => setEditing(e.target.value)}
                                onKeyDown={onEditKey}
                                onBlur={() => {
                                  commit(editing);
                                  setEditing(null);
                                }}
                              />
                            ) : i === 0 ? (
                              <span className="nm-hcell">
                                <span>{val}</span>
                                <button
                                  type="button"
                                  className="nm-sortbtn"
                                  aria-label={`Sort by ${val}`}
                                  aria-haspopup="menu"
                                  onMouseDown={(e) => e.stopPropagation()}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setMenu(menu === j ? null : j);
                                  }}
                                >
                                  ▾
                                </button>
                                {menu === j && (
                                  <span className="nm-menu" role="menu" onMouseDown={(e) => e.stopPropagation()}>
                                    <button type="button" role="menuitem" onClick={() => sort(j, 1)}>
                                      Sort Ascending
                                    </button>
                                    <button type="button" role="menuitem" onClick={() => sort(j, -1)}>
                                      Sort Descending
                                    </button>
                                  </span>
                                )}
                              </span>
                            ) : def.linkCol === j && /^https?:\/\//.test(val) ? (
                              <a
                                href={val}
                                className="nm-link"
                                onClick={(e) => {
                                  e.preventDefault();
                                  openExternal(val, { title: 'Opening GitHub repository', app: 'Numbers', icon: 'github' });
                                }}
                              >
                                {val.replace(/^https:\/\/github\.com\//, 'github.com/')} ↗
                              </a>
                            ) : def.linkCol === j && !val && !isFooter(i) ? (
                              <span className="nm-muted">No public repo</span>
                            ) : (
                              val
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="nm-hint">Double-click or press Return to edit · arrows to move · formulas: =SUM(), =AVERAGE(), =COUNT(), =MIN(), =MAX()</p>
          </section>

        </div>
      </div>
      <span className="nm-sr" aria-live="polite">
        {ref(r, c)} {shown}
      </span>
    </div>
  );
}

/* ───────────────────────────── Chart ───────────────────────────── */

function BarChart({ data }: { data: { label: string; value: number }[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(...data.map((d) => d.value));
  const rowH = 26;
  const labelW = 118;
  const plotW = 190;
  const h = data.length * rowH + 28;
  const ticks = Array.from({ length: max + 1 }, (_, i) => i);
  return (
    <figure className="nm-chart">
      <figcaption>
        <b>Projects per skill</b>
        <span>Top {data.length} · verified project stacks</span>
      </figcaption>
      <svg viewBox={`0 0 ${labelW + plotW + 30} ${h}`} role="img" aria-label={`Bar chart: ${data.map((d) => `${d.label} ${d.value}`).join(', ')}`}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={labelW + (t / max) * plotW} x2={labelW + (t / max) * plotW} y1={0} y2={h - 20} className="nm-gridline" />
            <text x={labelW + (t / max) * plotW} y={h - 6} className="nm-tick" textAnchor="middle">
              {t}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const w = Math.max(4, (d.value / max) * plotW);
          const y = i * rowH + 5;
          return (
            <g key={d.label} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} className={hover === null || hover === i ? '' : 'dim'}>
              <rect x={0} y={i * rowH} width={labelW + plotW + 30} height={rowH} fill="transparent" />
              <text x={labelW - 8} y={y + 12} textAnchor="end" className="nm-blabel">
                {d.label.length > 16 ? `${d.label.slice(0, 15)}…` : d.label}
              </text>
              <path d={`M${labelW} ${y} h${w - 4} a4 4 0 0 1 4 4 v8 a4 4 0 0 1 -4 4 h${-(w - 4)} z`} className="nm-bar" />
              <text x={labelW + w + 5} y={y + 12} className="nm-bval">
                {d.value}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="nm-tip" aria-hidden={hover === null}>
        {hover !== null ? `${data[hover].label}: ${data[hover].value} project${data[hover].value === 1 ? '' : 's'}` : 'Hover a bar for details'}
      </div>
    </figure>
  );
}
