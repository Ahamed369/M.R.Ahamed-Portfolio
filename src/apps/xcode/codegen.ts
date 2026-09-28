import type { Project } from '../../data/portfolio';

/** Word-wrap a sentence for comment blocks. */
function wrap(text: string, width = 70): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > width) {
      lines.push(cur.trim());
      cur = w;
    } else cur += ' ' + w;
  }
  if (cur.trim()) lines.push(cur.trim());
  return lines;
}

const pascal = (s: string) =>
  s
    .replace(/[^a-zA-Z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join('');
const camel = (s: string) => {
  const p = pascal(s);
  return p[0].toLowerCase() + p.slice(1);
};

function stackEntries(p: Project): [string, string[]][] {
  const order: (keyof Project['stack'])[] = ['frontend', 'backend', 'mobile', 'database', 'apis', 'security', 'tools'];
  return order.filter((k) => p.stack[k]?.length).map((k) => [k, p.stack[k] as string[]]);
}

const q = (s: string) => `'${s.replace(/'/g, "\\'")}'`;
const dq = (s: string) => `"${s.replace(/"/g, '\\"')}"`;

function header(p: Project, open: string, mid: string, close: string): string[] {
  return [
    open,
    `${mid}${p.name}`,
    `${mid}${p.category}${p.period ? ` · ${p.period}` : ''}`,
    mid.trimEnd(),
    ...wrap(p.description).map((l) => `${mid}${l}`),
    mid.trimEnd(),
    ...wrap(p.overview).map((l) => `${mid}${l}`),
    close,
  ];
}

function php(p: Project): string[] {
  const cls = pascal(p.name);
  const out = ['<?php', '', ...header(p, '/**', ' * ', ' */'), 'declare(strict_types=1);', '', 'namespace Ahamed\\Portfolio;', ''];
  out.push(`final class ${cls} extends Project`, '{');
  out.push(`    public const NAME = ${q(p.name)};`);
  out.push(`    public const STATUS = ${q(p.status)};`);
  out.push(p.repo ? `    public const REPOSITORY = ${q(p.repo)};` : `    public const REPOSITORY = null; // not publicly listed`);
  out.push('');
  for (const [k, v] of stackEntries(p)) out.push(`    public const ${k.toUpperCase()} = [${v.map(q).join(', ')}];`);
  out.push('', '    public function features(): array', '    {', '        return [');
  p.features.forEach((f) => out.push(`            ${q(f)},`));
  out.push('        ];', '    }');
  if (p.responsibilities?.length) {
    out.push('', '    /** My role */', '    public function responsibilities(): array', '    {', '        return [');
    p.responsibilities.forEach((r) => out.push(`            ${q(r)},`));
    out.push('        ];', '    }');
  }
  if (p.architecture) {
    out.push('', '    // Architecture');
    wrap(p.architecture, 66).forEach((l) => out.push(`    // ${l}`));
  }
  out.push('', '    public function preview(): Preview', '    {', `        return new SimulatorPreview($this, device: ${q(deviceName(p))});`, '    }', '}');
  return out;
}

function js(p: Project, jsx: boolean): string[] {
  const v = camel(p.name);
  const out = [...header(p, '/**', ' * ', ' */'), `import { Project${jsx ? ', SimulatorPreview' : ''} } from '@ahamed/portfolio';`, ''];
  out.push(`export const ${v} = new Project({`);
  out.push(`  name: ${q(p.name)},`);
  out.push(`  status: ${q(p.status)},`);
  out.push(p.repo ? `  repository: ${q(p.repo)},` : `  repository: null, // not publicly listed`);
  out.push('  stack: {');
  for (const [k, vals] of stackEntries(p)) out.push(`    ${k}: [${vals.map(q).join(', ')}],`);
  out.push('  },', '  features: [');
  p.features.forEach((f) => out.push(`    ${q(f)},`));
  out.push('  ],');
  if (p.responsibilities?.length) {
    out.push('  // My role', '  responsibilities: [');
    p.responsibilities.forEach((r) => out.push(`    ${q(r)},`));
    out.push('  ],');
  }
  if (p.architecture) out.push(`  architecture: ${q(p.architecture)},`);
  out.push('});', '');
  if (jsx) {
    out.push('export default function Preview() {', `  return <SimulatorPreview project={${v}} device=${dq(deviceName(p))} />;`, '}');
  } else {
    out.push(`export default ${v}.preview({ device: ${q(deviceName(p))} });`);
  }
  return out;
}

function java(p: Project): string[] {
  const cls = pascal(p.name);
  const out = ['package dev.ahamed.portfolio;', '', 'import java.util.List;', '', ...header(p, '/**', ' * ', ' */')];
  out.push(`public final class ${cls} extends Project {`, '');
  out.push(`    static final String PROJECT_NAME = ${dq(p.name)};`);
  out.push(`    static final String STATUS = ${dq(p.status)};`);
  out.push(p.repo ? `    static final String REPOSITORY = ${dq(p.repo)};` : `    static final String REPOSITORY = null; // not publicly listed`);
  out.push('');
  for (const [k, vals] of stackEntries(p)) {
    out.push(`    static final List<String> ${k.toUpperCase()} = List.of(`);
    vals.forEach((x, i) => out.push(`        ${dq(x)}${i < vals.length - 1 ? ',' : ''}`));
    out.push('    );');
  }
  out.push('', '    static final List<String> FEATURES = List.of(');
  p.features.forEach((f, i) => out.push(`        ${dq(f)}${i < p.features.length - 1 ? ',' : ''}`));
  out.push('    );');
  if (p.responsibilities?.length) {
    out.push('', '    // My role', '    static final List<String> RESPONSIBILITIES = List.of(');
    p.responsibilities.forEach((r, i) => out.push(`        ${dq(r)}${i < (p.responsibilities?.length ?? 0) - 1 ? ',' : ''}`));
    out.push('    );');
  }
  out.push('', '    @Override', '    public Preview build() {', `        return new SimulatorPreview(this, ${dq(deviceName(p))});`, '    }', '}');
  return out;
}

function py(p: Project): string[] {
  const cls = pascal(p.name);
  const out = [...header(p, '#', '# ', '#'), 'from dataclasses import dataclass, field', '', '', '@dataclass', `class ${cls}(Project):`];
  out.push(`    name: str = ${q(p.name)}`);
  out.push(`    status: str = ${q(p.status)}`);
  out.push(p.repo ? `    repository: str = ${q(p.repo)}` : '    repository: str | None = None  # not publicly listed');
  for (const [k, vals] of stackEntries(p)) out.push(`    ${k}: list = field(default_factory=lambda: [${vals.map(q).join(', ')}])`);
  out.push('', '    def features(self) -> list[str]:', '        return [');
  p.features.forEach((f) => out.push(`            ${q(f)},`));
  out.push('        ]');
  if (p.architecture) {
    out.push('', '    # Architecture');
    wrap(p.architecture, 66).forEach((l) => out.push(`    # ${l}`));
  }
  out.push('', '    def preview(self):', `        return SimulatorPreview(self, device=${q(deviceName(p))})`);
  return out;
}

function html(p: Project): string[] {
  const out = ['<!doctype html>', ...header(p, '<!--', '  ', '-->'), '<html lang="en">', '<head>', `  <title>${p.name}</title>`];
  out.push(`  <meta name="status" content="${p.status}">`);
  if (p.repo) out.push(`  <link rel="repository" href="${p.repo}">`);
  out.push('</head>', '<body>');
  for (const [k, vals] of stackEntries(p)) out.push(`  <section data-stack="${k}">${vals.join(' · ')}</section>`);
  out.push('  <ul class="features">');
  p.features.forEach((f) => out.push(`    <li>${f}</li>`));
  out.push('  </ul>', `  <simulator-preview device="${deviceName(p)}"></simulator-preview>`, '</body>', '</html>');
  return out;
}

export function deviceName(p: Project): string {
  if (p.preview.kind === 'phone') return 'Pixel 8 — Android 14';
  if (p.preview.kind === 'desktop') return p.lang === 'py' ? 'Desktop — Tkinter' : 'Desktop — Java Swing';
  return 'Browser — Responsive';
}

export function generateCode(p: Project): string[] {
  switch (p.lang) {
    case 'php':
      return php(p);
    case 'java':
      return java(p);
    case 'jsx':
      return js(p, true);
    case 'py':
      return py(p);
    case 'html':
      return html(p);
    default:
      return js(p, false);
  }
}

/* ───────────────────────────── highlighter ───────────────────────────── */

export type Tok = { t: 'kw' | 'str' | 'com' | 'num' | 'type' | 'fn' | 'attr' | 'tag' | 'plain' | 'var'; v: string };

const KEYWORDS = new Set([
  'import', 'from', 'export', 'default', 'const', 'let', 'new', 'return', 'function', 'class', 'extends', 'final', 'public', 'static',
  'package', 'namespace', 'declare', 'null', 'true', 'false', 'private', 'protected', 'void', 'this', 'strict_types', 'array',
  'def', 'self', 'None', 'True', 'False', 'lambda', 'str', 'list',
]);

const RE = /(\/\/.*$|^\s*#.*$|<!--.*$|\/\*\*?|\*\/|^\s*\*.*$|'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|@\w+|<\/?[A-Za-z][\w-]*|<!doctype|\/>|\$\w+|<\?php|\b\d+\b|\b[A-Za-z_]\w*\b)/g;

export function highlight(line: string, inComment: boolean): { toks: Tok[]; inComment: boolean } {
  const toks: Tok[] = [];
  if (inComment || /^\s*\/\*\*?/.test(line) || /^\s*\*/.test(line) || /^\s*<!--\s*$/.test(line)) {
    const ends = /(\*\/|-->)\s*$/.test(line);
    toks.push({ t: 'com', v: line });
    return { toks, inComment: !ends && !/^\s*\/\*.*\*\/\s*$/.test(line) ? true : false };
  }
  let last = 0;
  line.replace(RE, (m, _g, idx: number) => {
    if (idx > last) toks.push({ t: 'plain', v: line.slice(last, idx) });
    let t: Tok['t'] = 'plain';
    if (m.startsWith('//') || m.trimStart().startsWith('#') || m.startsWith('<!--')) t = 'com';
    else if (m[0] === "'" || m[0] === '"') t = 'str';
    else if (m[0] === '@') t = 'attr';
    else if (m.startsWith('<') || m === '/>' || m === '>') t = 'tag';
    else if (m[0] === '$') t = 'var';
    else if (/^\d/.test(m)) t = 'num';
    else if (KEYWORDS.has(m)) t = 'kw';
    else if (/^[A-Z]/.test(m)) t = 'type';
    else if (line.slice(idx + m.length).startsWith('(')) t = 'fn';
    toks.push({ t, v: m });
    last = idx + m.length;
    return m;
  });
  if (last < line.length) toks.push({ t: 'plain', v: line.slice(last) });
  return { toks, inComment: false };
}
