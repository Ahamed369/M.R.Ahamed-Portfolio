import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent as RKeyboardEvent, type PointerEvent as RPointerEvent, type ReactNode } from 'react';
import type { AppProps } from '../components/Desktop';
import { DragBar, Lights } from '../components/Window';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { PG_EXAMPLES, PG_WELCOME, type PgExample } from '../data/playground';
import { usePersisted, uid, fmtWhen } from '../system/useStore';
import { readStore, writeStore } from '../system/storage';
import { notify } from '../system/notify';
import { useWM } from '../system/WindowManager';
import { useSettings } from '../system/SettingsContext';

/**
 * v10.3 — Code Playground: write HTML, CSS and JavaScript and see the result
 * live in a sandboxed iframe (allow-scripts only, no same-origin). Console
 * output and runtime errors come back through a tiny postMessage bridge.
 */

type Lang = 'html' | 'css' | 'js';
type Pane = Lang | 'preview' | 'console';
interface Code {
  html: string;
  css: string;
  js: string;
}
interface Project extends Code {
  id: string;
  name: string;
  at: number;
}
interface Store {
  projects: Project[];
  cur: string;
}
interface Prefs {
  auto: boolean;
  split: number;
  consoleH: number;
  consoleOpen: boolean;
  collapsed: Lang[];
}
type LogType = 'log' | 'info' | 'warn' | 'error' | 'debug' | 'system';
interface LogEntry {
  id: number;
  type: LogType;
  text: string;
  n: number;
}

const KEY = 'mra-playground-v1';
const PKEY = 'mra-playground-prefs-v1';
const DOCS_KEY = 'mra-docs-saved-v1';
const LANGS: Lang[] = ['html', 'css', 'js'];
const LANG_LABEL: Record<Lang, string> = { html: 'HTML', css: 'CSS', js: 'JS' };

/* ───────────────────────────── i18n ───────────────────────────── */
const DICT = {
  en: {
    run: 'Run', stop: 'Stop', auto: 'Auto-run', preview: 'Preview', console: 'Console', clear: 'Clear', projects: 'Projects', newProject: 'New Project', examples: 'Examples', rename: 'Rename', duplicate: 'Duplicate', del: 'Delete', exportHtml: 'Export .html', saveDocs: 'Save to Documents', learn: 'Learn', open: 'Open', close: 'Close', noOutput: 'No console output yet. Use console.log() in your JavaScript.', autosaved: 'Autosaved', saving: 'Saving…', stopped: 'Preview stopped. Press Run to start again.', delQ: 'Delete this project?', delDetail: 'This removes it from this browser. You can’t undo this.', copy: 'copy', untitled: 'Untitled', more: 'More', reload: 'Reload preview', collapse: 'Collapse', expand: 'Expand', examplesSub: 'Open an example as a new project. Each one links to a Learning Hub topic.', downloadStarted: 'Download started', saveFailed: 'Couldn’t save — browser storage is unavailable.', openedExample: 'Opened as a new project', lines: 'lines', current: 'Current', hideConsole: 'Hide console', showConsole: 'Show console', running: 'Running', editorHint: 'Tab indents · Esc then Tab leaves the editor · ⌘/Ctrl+Enter runs',
  },
  si: {
    run: 'ධාවනය', stop: 'නවත්වන්න', auto: 'ස්වයං ධාවනය', preview: 'පෙරදසුන', console: 'කොන්සෝලය', clear: 'හිස් කරන්න', projects: 'ව්‍යාපෘති', newProject: 'නව ව්‍යාපෘතිය', examples: 'උදාහරණ', rename: 'නැවත නම් කරන්න', duplicate: 'අනුපිටපත් කරන්න', del: 'මකන්න', exportHtml: '.html ලෙස අපනයනය', saveDocs: 'ලේඛනවලට සුරකින්න', learn: 'ඉගෙන ගන්න', open: 'විවෘත කරන්න', close: 'වසන්න', noOutput: 'තවම කොන්සෝල ප්‍රතිදානයක් නැත. ඔබේ JavaScript හි console.log() භාවිත කරන්න.', autosaved: 'ස්වයංක්‍රීයව සුරැකිණි', saving: 'සුරකිමින්…', stopped: 'පෙරදසුන නවත්වා ඇත. නැවත ආරම්භ කිරීමට ධාවනය ඔබන්න.', delQ: 'මෙම ව්‍යාපෘතිය මකන්නද?', delDetail: 'මෙය මෙම බ්‍රව්සරයෙන් ඉවත් කරයි. ආපසු හැරවිය නොහැක.', copy: 'පිටපත', untitled: 'නම් නොකළ', more: 'තවත්', reload: 'පෙරදසුන යළි පූරණය', collapse: 'හකුළන්න', expand: 'දිග හරින්න', examplesSub: 'උදාහරණයක් නව ව්‍යාපෘතියක් ලෙස විවෘත කරන්න. සෑම එකක්ම ඉගෙනුම් මධ්‍යස්ථාන මාතෘකාවකට සම්බන්ධයි.', downloadStarted: 'බාගැනීම ආරම්භ විය', saveFailed: 'සුරැකිය නොහැක — බ්‍රව්සර ගබඩාව නොමැත.', openedExample: 'නව ව්‍යාපෘතියක් ලෙස විවෘත කළා', lines: 'පේළි', current: 'වත්මන්', hideConsole: 'කොන්සෝලය සඟවන්න', showConsole: 'කොන්සෝලය පෙන්වන්න', running: 'ධාවනය වෙමින්', editorHint: 'Tab ඉන්ඩෙන්ට් කරයි · Esc පසුව Tab සංස්කාරකයෙන් ඉවත් වේ · ⌘/Ctrl+Enter ධාවනය කරයි',
  },
  ta: {
    run: 'இயக்கு', stop: 'நிறுத்து', auto: 'தானியங்கு இயக்கம்', preview: 'முன்னோட்டம்', console: 'கன்சோல்', clear: 'அழி', projects: 'திட்டங்கள்', newProject: 'புதிய திட்டம்', examples: 'எடுத்துக்காட்டுகள்', rename: 'மறுபெயரிடு', duplicate: 'நகலெடு', del: 'நீக்கு', exportHtml: '.html ஆக ஏற்றுமதி', saveDocs: 'ஆவணங்களில் சேமி', learn: 'கற்க', open: 'திற', close: 'மூடு', noOutput: 'இன்னும் கன்சோல் வெளியீடு இல்லை. உங்கள் JavaScript-இல் console.log() பயன்படுத்துங்கள்.', autosaved: 'தானாகச் சேமிக்கப்பட்டது', saving: 'சேமிக்கிறது…', stopped: 'முன்னோட்டம் நிறுத்தப்பட்டது. மீண்டும் தொடங்க இயக்கு அழுத்தவும்.', delQ: 'இந்தத் திட்டத்தை நீக்கவா?', delDetail: 'இது இந்த உலாவியிலிருந்து நீக்கப்படும். மீட்க முடியாது.', copy: 'நகல்', untitled: 'பெயரிடப்படாதது', more: 'மேலும்', reload: 'முன்னோட்டத்தை மீளேற்று', collapse: 'சுருக்கு', expand: 'விரி', examplesSub: 'ஒரு எடுத்துக்காட்டை புதிய திட்டமாகத் திறக்கவும். ஒவ்வொன்றும் கற்றல் மைய தலைப்புடன் இணைக்கப்பட்டுள்ளது.', downloadStarted: 'பதிவிறக்கம் தொடங்கியது', saveFailed: 'சேமிக்க முடியவில்லை — உலாவி சேமிப்பகம் கிடைக்கவில்லை.', openedExample: 'புதிய திட்டமாகத் திறக்கப்பட்டது', lines: 'வரிகள்', current: 'தற்போதைய', hideConsole: 'கன்சோலை மறை', showConsole: 'கன்சோலைக் காட்டு', running: 'இயங்குகிறது', editorHint: 'Tab உள்தள்ளும் · Esc பின் Tab எடிட்டரை விட்டு வெளியேறும் · ⌘/Ctrl+Enter இயக்கும்',
  },
} as const;
type DictKey = keyof (typeof DICT)['en'];

/* ─────────────────────────── Syntax highlighting ─────────────────────────── */
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const span = (cls: string, s: string) => `<span class="t-${cls}">${esc(s)}</span>`;

const JS_RE = /(\/\/[^\n]*|\/\*[\s\S]*?(?:\*\/|$))|(`(?:\\[\s\S]|[^\\`])*`?|"(?:\\.|[^\\"\n])*"?|'(?:\\.|[^\\'\n])*'?)|\b(const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|new|class|extends|super|import|export|from|default|async|await|try|catch|finally|throw|typeof|instanceof|in|of|void|delete|yield|static|get|set)\b|\b(true|false|null|undefined|this|NaN|Infinity)\b|((?:0x[\da-fA-F]+|\d+(?:\.\d+)?(?:e[+-]?\d+)?)n?)\b|([A-Za-z_$][\w$]*)(?=\s*\()/g;
function hlJS(src: string): string {
  let out = '';
  let last = 0;
  JS_RE.lastIndex = 0;
  for (let m = JS_RE.exec(src); m; m = JS_RE.exec(src)) {
    if (!m[0]) {
      JS_RE.lastIndex++;
      continue;
    }
    out += esc(src.slice(last, m.index));
    const cls = m[1] ? 'com' : m[2] ? 'str' : m[3] ? 'kw' : m[4] ? 'lit' : m[5] ? 'num' : 'fn';
    out += span(cls, m[0]);
    last = m.index + m[0].length;
  }
  return out + esc(src.slice(last));
}

const CSS_RE = /(\/\*[\s\S]*?(?:\*\/|$))|("(?:\\.|[^\\"\n])*"?|'(?:\\.|[^\\'\n])*'?)|([{}])|(@[\w-]+)|(#[\da-fA-F]{3,8}\b)|((?<![\w-])-?\d*\.?\d+(?:px|em|rem|%|vh|vw|vmin|vmax|s|ms|deg|fr|ch|ex|dvh|svh)?)|(--[\w-]+|[a-zA-Z-]+)(?=\s*:)|(!important)/g;
function hlCSS(src: string): string {
  let out = '';
  let last = 0;
  let depth = 0;
  const plain = (s: string) => (depth === 0 && s.trim() ? span('sel', s) : esc(s));
  CSS_RE.lastIndex = 0;
  for (let m = CSS_RE.exec(src); m; m = CSS_RE.exec(src)) {
    if (!m[0]) {
      CSS_RE.lastIndex++;
      continue;
    }
    out += plain(src.slice(last, m.index));
    if (m[1]) out += span('com', m[0]);
    else if (m[2]) out += span('str', m[0]);
    else if (m[3]) {
      depth = m[0] === '{' ? depth + 1 : Math.max(0, depth - 1);
      out += span('pun', m[0]);
    } else if (m[4]) out += span('kw', m[0]);
    else if (depth === 0) out += span('sel', m[0]);
    else if (m[5]) out += span('num', m[0]);
    else if (m[6]) out += span('num', m[0]);
    else if (m[7]) out += span('prop', m[0]);
    else out += span('kw', m[0]);
    last = m.index + m[0].length;
  }
  return out + plain(src.slice(last));
}

const HTML_RE = /(<!--[\s\S]*?(?:-->|$))|(<\/?[a-zA-Z][\w-]*)|(\/?>)|("[^"]*"?|'[^']*'?)|([^\s"'<>=/]+)|(&[#\w]+;)/g;
function hlMarkup(src: string): string {
  let out = '';
  let last = 0;
  let inTag = false;
  HTML_RE.lastIndex = 0;
  for (let m = HTML_RE.exec(src); m; m = HTML_RE.exec(src)) {
    let html: string | null = null;
    if (m[1]) html = span('com', m[0]);
    else if (m[2]) {
      inTag = true;
      const slash = m[0][1] === '/' ? 2 : 1;
      html = span('pun', m[0].slice(0, slash)) + span('tag', m[0].slice(slash));
    } else if (m[3]) {
      if (inTag) html = span('pun', m[0]);
      inTag = false;
    } else if (m[4]) {
      if (inTag) html = span('str', m[0]);
    } else if (m[5]) {
      if (inTag) html = span('attr', m[0]);
    } else if (m[6]) html = span('ent', m[0]);
    if (html === null) continue;
    out += esc(src.slice(last, m.index)) + html;
    last = m.index + m[0].length;
  }
  return out + esc(src.slice(last));
}
/** HTML with embedded <script> / <style> blocks highlighted in their own language. */
function hlHTML(src: string): string {
  const re = /(<(script|style)\b[^>]*>)([\s\S]*?)(<\/\2\s*>|$)/gi;
  let out = '';
  let last = 0;
  for (let m = re.exec(src); m; m = re.exec(src)) {
    if (!m[0]) {
      re.lastIndex++;
      continue;
    }
    out += hlMarkup(src.slice(last, m.index)) + hlMarkup(m[1]);
    out += m[2].toLowerCase() === 'script' ? hlJS(m[3]) : hlCSS(m[3]);
    out += hlMarkup(m[4]);
    last = m.index + m[0].length;
  }
  return out + hlMarkup(src.slice(last));
}
const HL: Record<Lang, (s: string) => string> = { html: hlHTML, css: hlCSS, js: hlJS };

/* ──────────────────────── Loop protection (instrument) ──────────────────────── */
/**
 * Inserts `if(__pgG())break;` at the start of every braced for / while / do
 * loop body. Strings, comments, template literals and regex literals are
 * skipped. No newlines are added, so error line numbers stay correct.
 */
function instrument(src: string): string {
  const out: string[] = [];
  let i = 0;
  let lastSig = '';
  const n = src.length;
  const isIdent = (c: string) => /[\w$]/.test(c);
  const skipString = (q: string, from: number): number => {
    let j = from + 1;
    while (j < n) {
      const c = src[j];
      if (c === '\\') j += 2;
      else if (q === '`' && c === '$' && src[j + 1] === '{') {
        // template expression: skip balanced braces
        let depth = 1;
        j += 2;
        while (j < n && depth > 0) {
          const d = src[j];
          if (d === '"' || d === "'" || d === '`') j = skipString(d, j);
          else {
            if (d === '{') depth++;
            else if (d === '}') depth--;
            j++;
          }
        }
      } else if (c === q || (q !== '`' && c === '\n')) return j + 1;
      else j++;
    }
    return n;
  };
  const skipWs = (from: number): number => {
    let j = from;
    for (;;) {
      while (j < n && /\s/.test(src[j])) j++;
      if (src.startsWith('//', j)) {
        while (j < n && src[j] !== '\n') j++;
      } else if (src.startsWith('/*', j)) {
        const e = src.indexOf('*/', j + 2);
        j = e < 0 ? n : e + 2;
      } else return j;
    }
  };
  const GUARD = 'if(__pgG())break;';
  while (i < n) {
    const c = src[i];
    if (c === '"' || c === "'" || c === '`') {
      const e = skipString(c, i);
      out.push(src.slice(i, e));
      i = e;
      lastSig = c;
      continue;
    }
    if (c === '/' && src[i + 1] === '/') {
      const e = src.indexOf('\n', i);
      const end = e < 0 ? n : e;
      out.push(src.slice(i, end));
      i = end;
      continue;
    }
    if (c === '/' && src[i + 1] === '*') {
      const e = src.indexOf('*/', i + 2);
      const end = e < 0 ? n : e + 2;
      out.push(src.slice(i, end));
      i = end;
      continue;
    }
    if (c === '/' && (lastSig === '' || /[(,=:[!&|?{};+\-*%<>~^]/.test(lastSig) || /^(return|typeof|case|do|else|in|of)$/.test(lastSig))) {
      // regex literal
      let j = i + 1;
      let cls = false;
      while (j < n && src[j] !== '\n') {
        const d = src[j];
        if (d === '\\') j += 2;
        else {
          if (d === '[') cls = true;
          else if (d === ']') cls = false;
          else if (d === '/' && !cls) break;
          j++;
        }
      }
      j++;
      while (j < n && /[a-z]/i.test(src[j])) j++;
      out.push(src.slice(i, j));
      i = j;
      lastSig = ')';
      continue;
    }
    if (isIdent(c)) {
      let j = i;
      while (j < n && isIdent(src[j])) j++;
      const word = src.slice(i, j);
      const prevChar = i > 0 ? src[i - 1] : '';
      out.push(word);
      i = j;
      lastSig = word;
      if (prevChar === '.' || !(word === 'for' || word === 'while' || word === 'do')) continue;
      if (word === 'do') {
        const k = skipWs(i);
        if (src[k] === '{') {
          out.push(src.slice(i, k + 1) + GUARD);
          i = k + 1;
          lastSig = '{';
        }
        continue;
      }
      // for ( … ) {   /   while ( … ) {
      let k = skipWs(i);
      if (word === 'for' && src.startsWith('await', k)) k = skipWs(k + 5);
      if (src[k] !== '(') continue;
      let depth = 0;
      let p = k;
      while (p < n) {
        const d = src[p];
        if (d === '"' || d === "'" || d === '`') {
          p = skipString(d, p);
          continue;
        }
        if (d === '(') depth++;
        else if (d === ')') {
          depth--;
          if (depth === 0) break;
        }
        p++;
      }
      if (p >= n) continue;
      const b = skipWs(p + 1);
      if (src[b] === '{') {
        out.push(src.slice(i, b + 1) + GUARD);
        i = b + 1;
        lastSig = '{';
      }
      continue;
    }
    out.push(c);
    if (!/\s/.test(c)) lastSig = c;
    i++;
  }
  return out.join('');
}

/* ──────────────────────────── Preview document ──────────────────────────── */
const MAX_MSGS = 1500;
function bridgeScript(token: string): string {
  return `<script>(function(){
var T=${JSON.stringify(token)},P=window.parent,sent=0,capped=false;
function post(type,args){if(capped)return;if(++sent>${MAX_MSGS}){capped=true;try{P.postMessage({__pg:T,type:'warn',args:['Console output limit reached — further messages are hidden.']},'*')}catch(e){}return}try{P.postMessage({__pg:T,type:type,args:args},'*')}catch(e){}}
function fmt(v,d,seen){d=d||0;seen=seen||[];
if(typeof v==='string')return d?JSON.stringify(v):v;
if(v===undefined)return 'undefined';if(v===null)return 'null';
if(typeof v==='function')return 'ƒ '+(v.name||'anonymous')+'()';
if(typeof v==='bigint')return String(v)+'n';
if(typeof v!=='object')return String(v);
if(v instanceof Error)return v.name+': '+v.message;
if(typeof Node!=='undefined'&&v instanceof Node){if(v.nodeType===1){var s='<'+v.tagName.toLowerCase();if(v.id)s+=' id="'+v.id+'"';if(typeof v.className==='string'&&v.className)s+=' class="'+v.className+'"';return s+'>'}return v.nodeName}
if(seen.indexOf(v)>=0)return '[Circular]';
if(d>2)return Array.isArray(v)?'[…]':'{…}';
seen.push(v);
try{
if(Array.isArray(v))return '['+v.slice(0,100).map(function(x){return fmt(x,d+1,seen)}).join(', ')+(v.length>100?', …':'')+']';
if(v instanceof Map){var a=[];v.forEach(function(x,k){a.push(fmt(k,d+1,seen)+' => '+fmt(x,d+1,seen))});return 'Map('+v.size+') {'+a.join(', ')+'}'}
if(v instanceof Set){var b=[];v.forEach(function(x){b.push(fmt(x,d+1,seen))});return 'Set('+v.size+') {'+b.join(', ')+'}'}
if(v instanceof Date)return v.toISOString();
var c=v.constructor&&v.constructor.name&&v.constructor.name!=='Object'?v.constructor.name+' ':'';
var ks=Object.keys(v);
return c+'{'+ks.slice(0,50).map(function(k){return k+': '+fmt(v[k],d+1,seen)}).join(', ')+(ks.length>50?', …':'')+'}';
}finally{seen.pop()}}
function args(a){return Array.prototype.map.call(a,function(x){var s=fmt(x);return s.length>5000?s.slice(0,5000)+'…':s})}
['log','info','warn','error','debug'].forEach(function(k){console[k]=function(){post(k,args(arguments))}});
console.table=function(){post('log',args(arguments))};
console.dir=function(){post('log',args(arguments))};
console.assert=function(c){if(!c)post('error',['Assertion failed'].concat(args(Array.prototype.slice.call(arguments,1))))};
console.clear=function(){post('clear',[])};
window.alert=function(m){post('info',['alert: '+fmt(m)])};
window.confirm=function(m){post('info',['confirm: '+fmt(m)+' → true']);return true};
window.prompt=function(m,v){post('info',['prompt: '+fmt(m)+' → '+(v===undefined?'null':fmt(v))]);return v===undefined?null:String(v)};
window.addEventListener('error',function(e){if(!e.message)return;e.preventDefault();P.postMessage&&post('error',[(e.message||'Error')],void 0);try{P.postMessage({__pg:T,type:'where',line:e.lineno||0},'*')}catch(x){}});
window.addEventListener('unhandledrejection',function(e){e.preventDefault();post('error',['Uncaught (in promise) '+fmt(e.reason)])});
document.addEventListener('click',function(e){var t=e.target;var a=t&&t.closest?t.closest('a[href]'):null;if(!a)return;var h=a.getAttribute('href')||'';if(h.charAt(0)==='#')return;e.preventDefault();post('info',['Link to '+h+' — navigation is disabled in the preview.'])});
var GT=0,GC=0,GW=false;
window.__pgG=function(){if((++GC&1023)!==0)return false;var n=Date.now();if(!GT){GT=n;setTimeout(function(){GT=0;GW=false},0);return false}if(n-GT>2500){if(!GW){GW=true;post('warn',['A loop ran for more than 2.5 seconds and was stopped (possible infinite loop).'])}return true}return false};
})();<\/script>
`;
}

function injectInto(c: Code, title: string, head: string, js: string): string {
  const style = c.css.trim() ? `<style>\n${c.css.replace(/<\/style/gi, '<\\/style')}\n</style>\n` : '';
  const script = js.trim() ? `<script>\n${js.replace(/<\/script/gi, '<\\/script')}\n</script>\n` : '';
  if (/<html[\s>]|<body[\s>]|<head[\s>]/i.test(c.html)) {
    let doc = c.html;
    const headOpen = /<head[^>]*>/i.exec(doc) ?? /<html[^>]*>/i.exec(doc);
    if (headOpen) doc = doc.slice(0, headOpen.index + headOpen[0].length) + '\n' + head + doc.slice(headOpen.index + headOpen[0].length);
    else doc = head + doc;
    doc = /<\/head>/i.test(doc) ? doc.replace(/<\/head>/i, `${style}</head>`) : style + doc;
    doc = /<\/body>/i.test(doc) ? doc.replace(/<\/body>(?![\s\S]*<\/body>)/i, `${script}</body>`) : doc + script;
    return doc;
  }
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
${head}${style}</head>
<body>
${c.html}
${script}</body>
</html>
`;
}
/** Clean, standalone document for export / Documents (no bridge, no loop guard). */
const exportDoc = (c: Code, title: string) => injectInto(c, title, '', c.js);
/** Preview document with the console bridge + loop protection. Also returns where the JS starts. */
function previewDoc(c: Code, title: string, token: string): { doc: string; jsLine: number; jsLines: number } {
  const marker = '/*__PG_JS__*/';
  const doc = injectInto(c, title, bridgeScript(token), c.js.trim() ? marker + instrument(c.js) : '');
  const at = doc.indexOf(marker);
  const jsLine = at < 0 ? -1 : doc.slice(0, at).split('\n').length;
  return { doc: doc.replace(marker, ''), jsLine, jsLines: c.js.split('\n').length };
}
const STOPPED_DOC = (msg: string) => `<!doctype html><html><body style="margin:0;height:100vh;display:grid;place-items:center;font:14px system-ui,sans-serif;color:#86868b;background:#fafafa"><p>${esc(msg)}</p></body></html>`;

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'playground';

/* ───────────────────────────────── Icons ───────────────────────────────── */
function Ic({ d, fill, size = 16, children }: { d?: string; fill?: boolean; size?: number; children?: ReactNode }) {
  return (
    <svg className="pg-ic" width={size} height={size} viewBox="0 0 20 20" aria-hidden="true" fill={fill ? 'currentColor' : 'none'} stroke={fill ? 'none' : 'currentColor'} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {d && <path d={d} />}
      {children}
    </svg>
  );
}
const IcPlay = () => <Ic fill d="M6.2 3.6c0-.9 1-1.4 1.7-.9l8.2 5.6c.7.5.7 1.4 0 1.9l-8.2 5.6c-.7.5-1.7 0-1.7-.9z" />;
const IcStop = () => <Ic fill d="M5.5 4h9A1.5 1.5 0 0 1 16 5.5v9a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 4 14.5v-9A1.5 1.5 0 0 1 5.5 4z" />;
const IcChev = ({ open }: { open?: boolean }) => <Ic size={12} d={open ? 'M5 8l5 5 5-5' : 'M8 5l5 5-5 5'} />;
const IcDown = () => <Ic size={12} d="M5 8l5 5 5-5" />;
const IcBook = () => <Ic d="M3.5 4.5c2.2-.9 4.4-.9 6.5.6 2.1-1.5 4.3-1.5 6.5-.6v11c-2.2-.9-4.4-.9-6.5.6-2.1-1.5-4.3-1.5-6.5-.6zM10 5.1v11" />;
const IcMore = () => (
  <Ic fill>
    <circle cx="4.5" cy="10" r="1.6" />
    <circle cx="10" cy="10" r="1.6" />
    <circle cx="15.5" cy="10" r="1.6" />
  </Ic>
);
const IcPlus = () => <Ic d="M10 4v12M4 10h12" />;
const IcPencil = () => <Ic d="M12.8 3.9l3.3 3.3-8.6 8.6-3.9.6.6-3.9zM11.2 5.5l3.3 3.3" />;
const IcDup = () => <Ic d="M7 7h8.5v8.5H7zM13 7V4.5H4.5V13H7" />;
const IcTrash = () => <Ic d="M4 6h12M8 6V4.2h4V6M5.6 6l.8 10h7.2l.8-10M8.5 9v4.5M11.5 9v4.5" />;
const IcExport = () => <Ic d="M10 3v9M6.5 6.5L10 3l3.5 3.5M4 11v4.5h12V11" />;
const IcDoc = () => <Ic d="M5 2.8h6.5L15 6.3v10.9H5zM11.3 3v3.5H15M7.5 10h5M7.5 13h5" />;
const IcReload = () => <Ic d="M15.5 10a5.5 5.5 0 1 1-1.6-3.9M15.5 3.5v3.2h-3.2" />;
const IcClear = () => (
  <Ic>
    <circle cx="10" cy="10" r="6.3" />
    <path d="M5.6 14.4l8.8-8.8" />
  </Ic>
);
const IcX = () => <Ic size={14} d="M5 5l10 10M15 5L5 15" />;
const IcCheck = () => <Ic size={14} d="M4.5 10.5l3.5 3.5 7.5-8" />;
const IcWarn = () => <Ic size={13} fill d="M10 2.6c.5 0 .9.3 1.2.7l6.6 11.5c.5.9-.1 2-1.2 2H3.4c-1 0-1.7-1.1-1.2-2L8.8 3.3c.3-.4.7-.7 1.2-.7zm-.9 4.7l.2 4.6h1.4l.2-4.6zM10 13a1 1 0 1 0 0 2 1 1 0 0 0 0-2z" />;
const IcErr = () => <Ic size={13} fill d="M10 2a8 8 0 1 1 0 16 8 8 0 0 1 0-16zM7.4 6.3L6.3 7.4 8.9 10l-2.6 2.6 1.1 1.1L10 11.1l2.6 2.6 1.1-1.1L11.1 10l2.6-2.6-1.1-1.1L10 8.9z" />;
const IcInfo = () => <Ic size={13} fill d="M10 2a8 8 0 1 1 0 16 8 8 0 0 1 0-16zm-.9 7v5.5h1.8V9zM10 5.5a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2z" />;

/* ───────────────────────────────── Editor ───────────────────────────────── */
const PAIRS: Record<string, string> = { '(': ')', '[': ']', '{': '}', '"': '"', "'": "'", '`': '`' };
const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);

function insertText(ta: HTMLTextAreaElement, text: string) {
  ta.focus();
  let ok = false;
  try {
    ok = document.execCommand('insertText', false, text);
  } catch {
    ok = false;
  }
  if (!ok) {
    ta.setRangeText(text, ta.selectionStart, ta.selectionEnd, 'end');
    ta.dispatchEvent(new Event('input', { bubbles: true }));
  }
}

function CodeEditor({ lang, value, onChange, label }: { lang: Lang; value: string; onChange: (v: string) => void; label: string }) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const hlRef = useRef<HTMLPreElement>(null);
  const gutRef = useRef<HTMLPreElement>(null);
  const escRef = useRef(false);
  const html = useMemo(() => HL[lang](value) + '\n', [lang, value]);
  const lineCount = useMemo(() => value.split('\n').length, [value]);
  const numbers = useMemo(() => Array.from({ length: lineCount }, (_, i) => i + 1).join('\n'), [lineCount]);
  const sync = useCallback(() => {
    const ta = taRef.current;
    if (!ta) return;
    if (hlRef.current) hlRef.current.style.transform = `translate(${-ta.scrollLeft}px, ${-ta.scrollTop}px)`;
    if (gutRef.current) gutRef.current.style.transform = `translateY(${-ta.scrollTop}px)`;
  }, []);
  useLayoutEffect(sync, [value, sync]);

  const onKeyDown = (e: RKeyboardEvent<HTMLTextAreaElement>) => {
    const ta = e.currentTarget;
    const s = ta.selectionStart;
    const en = ta.selectionEnd;
    const v = ta.value;
    if (e.key === 'Escape') {
      escRef.current = true;
      return;
    }
    if (e.key === 'Tab') {
      if (escRef.current || e.metaKey || e.ctrlKey || e.altKey) {
        escRef.current = false;
        return;
      }
      e.preventDefault();
      const ls = v.lastIndexOf('\n', s - 1) + 1;
      if (s !== en && v.slice(s, en).includes('\n')) {
        const le = en;
        const block = v.slice(ls, le);
        const lines = block.split('\n');
        const next = lines.map((l) => (e.shiftKey ? l.replace(/^ {1,2}|^\t/, '') : l.length || lines.length === 1 ? '  ' + l : l)).join('\n');
        ta.setSelectionRange(ls, le);
        insertText(ta, next);
        ta.setSelectionRange(ls, ls + next.length);
      } else if (e.shiftKey) {
        const m = /^( {1,2}|\t)/.exec(v.slice(ls));
        if (m) {
          ta.setSelectionRange(ls, ls + m[0].length);
          insertText(ta, '');
          if (ta.value === v) {
            // insertText('') may be a no-op in some browsers
            try {
              document.execCommand('delete');
            } catch {
              /* ignore */
            }
          }
          const p = Math.max(ls, s - m[0].length);
          ta.setSelectionRange(p, Math.max(p, en - m[0].length));
        }
      } else insertText(ta, '  ');
      return;
    }
    escRef.current = false;
    if (e.metaKey || e.ctrlKey || e.altKey || e.nativeEvent.isComposing) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      const ls = v.lastIndexOf('\n', s - 1) + 1;
      const lineBefore = v.slice(ls, s);
      const indent = /^[ \t]*/.exec(lineBefore)?.[0] ?? '';
      const before = lineBefore.trimEnd();
      const next = v[en] ?? '';
      let opens = /[{[(]$/.test(before);
      let closesNext = opens && PAIRS[before[before.length - 1]] === next;
      if (lang === 'html' && !opens) {
        const lt = before.lastIndexOf('<');
        const tag = /^<([a-zA-Z][\w-]*)(?:\s[^<>]*)?>$/.exec(before.slice(lt));
        if (lt >= 0 && tag && !before.endsWith('/>') && !VOID.has(tag[1].toLowerCase())) {
          opens = true;
          closesNext = v.startsWith(`</${tag[1]}`, en);
        }
      }
      if (opens && closesNext) {
        insertText(ta, `\n${indent}  \n${indent}`);
        const p = s + 1 + indent.length + 2;
        ta.setSelectionRange(p, p);
      } else insertText(ta, `\n${indent}${opens ? '  ' : ''}`);
      return;
    }
    if (e.key in PAIRS) {
      const close = PAIRS[e.key];
      const isQuote = e.key === '"' || e.key === "'" || e.key === '`';
      if (s !== en) {
        e.preventDefault();
        const sel = v.slice(s, en);
        insertText(ta, e.key + sel + close);
        ta.setSelectionRange(s + 1, s + 1 + sel.length);
        return;
      }
      if (isQuote && v[s] === e.key) {
        e.preventDefault();
        ta.setSelectionRange(s + 1, s + 1);
        return;
      }
      if (isQuote && /[\w\\]/.test(v[s - 1] ?? '')) return;
      if (v[s] && !/[\s)\]}>,;:.]/.test(v[s])) return;
      e.preventDefault();
      insertText(ta, e.key + close);
      ta.setSelectionRange(s + 1, s + 1);
      return;
    }
    if ((e.key === ')' || e.key === ']' || e.key === '}') && s === en && v[s] === e.key) {
      e.preventDefault();
      ta.setSelectionRange(s + 1, s + 1);
      return;
    }
    if (e.key === '>' && lang === 'html' && s === en) {
      const lt = v.lastIndexOf('<', s - 1);
      const frag = lt >= 0 ? v.slice(lt, s) : '';
      const tag = /^<([a-zA-Z][\w-]*)(?:\s[^<>]*)?$/.exec(frag);
      if (tag && !frag.endsWith('/') && !VOID.has(tag[1].toLowerCase()) && !/["']/.test(frag.replace(/"[^"]*"|'[^']*'/g, ''))) {
        e.preventDefault();
        insertText(ta, `></${tag[1]}>`);
        ta.setSelectionRange(s + 1, s + 1);
      }
      return;
    }
    if (e.key === 'Backspace' && s === en && s > 0 && PAIRS[v[s - 1]] && PAIRS[v[s - 1]] === v[s]) {
      e.preventDefault();
      ta.setSelectionRange(s - 1, s + 1);
      try {
        if (!document.execCommand('delete')) throw new Error('no');
      } catch {
        ta.setRangeText('', s - 1, s + 1, 'end');
        ta.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
  };

  return (
    <div className="pg-ed" style={{ ['--gw' as string]: `${String(lineCount).length + 2.2}ch` }}>
      <div className="pg-gut" aria-hidden="true">
        <pre ref={gutRef}>{numbers}</pre>
      </div>
      <div className="pg-code">
        <pre ref={hlRef} className="pg-hl" aria-hidden="true" dangerouslySetInnerHTML={{ __html: html }} />
        <textarea
          ref={taRef}
          className="pg-ta"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          onScroll={sync}
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          wrap="off"
          aria-label={label}
          data-nodrag
        />
      </div>
    </div>
  );
}

/* ─────────────────────────────── Main app ─────────────────────────────── */
const seedStore = (): Store => {
  const p: Project = { id: uid('pg'), name: PG_WELCOME.name, html: PG_WELCOME.html, css: PG_WELCOME.css, js: PG_WELCOME.js, at: Date.now() };
  return { projects: [p], cur: p.id };
};
const SEED_PREFS: Prefs = { auto: true, split: 0.5, consoleH: 0.34, consoleOpen: true, collapsed: [] };

export default function PlaygroundApp({ win }: Partial<AppProps>) {
  /** v10.3 — deep link from the Learning Hub: open('playground', { topic }) shows that topic's examples first */
  const exTopic = typeof win?.args?.topic === 'string' ? win.args.topic : null;
  const wm = useWM();
  const { settings } = useSettings();
  const lang = (settings.language in DICT ? settings.language : 'en') as keyof typeof DICT;
  const t = useCallback((k: DictKey) => DICT[lang][k] ?? DICT.en[k], [lang]);

  const [store, setStore] = usePersisted<Store>(KEY, seedStore);
  const [prefsRaw, setPrefs] = usePersisted<Prefs>(PKEY, SEED_PREFS);
  const prefs = { ...SEED_PREFS, ...prefsRaw };
  const projects = store.projects?.length ? store.projects : seedStore().projects;
  const cur = projects.find((p) => p.id === store.cur) ?? projects[0];

  const [code, setCode] = useState<Code>({ html: cur.html, css: cur.css, js: cur.js });
  const [codeId, setCodeId] = useState(cur.id);
  const codeRef = useRef(code);
  codeRef.current = code;
  const codeIdRef = useRef(codeId);
  codeIdRef.current = codeId;
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const dirtyRef = useRef(false);

  // layout
  const rootRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const [wide, setWide] = useState(true);
  const [pane, setPane] = useState<Pane>('html');
  const [dragging, setDragging] = useState(false);

  // preview
  const frameRef = useRef<HTMLIFrameElement>(null);
  const tokenRef = useRef('');
  const jsMapRef = useRef({ jsLine: -1, jsLines: 0 });
  const [frame, setFrame] = useState<{ key: number; doc: string; stopped: boolean }>({ key: 0, doc: '', stopped: false });
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const bufRef = useRef<{ type: LogType; text: string }[] | null>(null);
  const logId = useRef(0);

  // ui
  const [sheet, setSheet] = useState<null | 'projects' | 'examples' | 'more'>(() => (exTopic && PG_EXAMPLES.some((e) => e.topic === exTopic) ? 'examples' : null));
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null);
  const [confirmDel, setConfirmDel] = useState<Project | null>(null);
  const [toast, setToast] = useState<{ text: string; kind: 'ok' | 'err' } | null>(null);
  const toastT = useRef(0);
  const flash = useCallback((text: string, kind: 'ok' | 'err' = 'ok') => {
    setToast({ text, kind });
    window.clearTimeout(toastT.current);
    toastT.current = window.setTimeout(() => setToast(null), 2400);
  }, []);
  useEffect(() => () => window.clearTimeout(toastT.current), []);

  /* ── persistence ── */
  const flush = useCallback(() => {
    if (!dirtyRef.current) return;
    dirtyRef.current = false;
    const id = codeIdRef.current;
    const c = codeRef.current;
    setStore((prev) => ({ ...prev, projects: (prev.projects ?? []).map((p) => (p.id === id ? { ...p, ...c, at: Date.now() } : p)) }));
    // verify the write really reached storage before saying so
    const back = readStore<{ v: Store | null }>(KEY, { v: null }).v?.projects?.find((p) => p.id === id);
    setSaveState(back && back.html === c.html && back.css === c.css && back.js === c.js ? 'saved' : 'idle');
  }, [setStore]);
  useEffect(() => {
    if (!dirtyRef.current) return;
    setSaveState('saving');
    const tm = window.setTimeout(flush, 500);
    return () => window.clearTimeout(tm);
  }, [code, flush]);
  useEffect(() => {
    window.addEventListener('pagehide', flush);
    return () => {
      window.removeEventListener('pagehide', flush);
      flush();
    };
  }, [flush]);

  // keep the persisted store sane (first run / deleted current)
  useEffect(() => {
    if (!store.projects?.length || !store.projects.some((p) => p.id === store.cur)) setStore({ projects, cur: cur.id });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const edit = (l: Lang, v: string) => {
    dirtyRef.current = true;
    setCode((c) => ({ ...c, [l]: v }));
  };

  /* ── run / stop ── */
  const run = useCallback((c: Code = codeRef.current) => {
    const token = Math.random().toString(36).slice(2) + Date.now().toString(36);
    tokenRef.current = token;
    const name = store.projects?.find((p) => p.id === codeIdRef.current)?.name ?? 'Playground';
    const built = previewDoc(c, name, token);
    jsMapRef.current = { jsLine: built.jsLine, jsLines: built.jsLines };
    bufRef.current = null;
    setLogs([]);
    setFrame((f) => ({ key: f.key + 1, doc: built.doc, stopped: false }));
  }, [store.projects]);
  const runRef = useRef(run);
  runRef.current = run;

  const stop = useCallback(() => {
    tokenRef.current = '';
    setFrame((f) => ({ key: f.key + 1, doc: STOPPED_DOC(DICT[lang].stopped), stopped: true }));
    setLogs((l) => [...l, { id: ++logId.current, type: 'system', text: DICT[lang].stopped, n: 1 }]);
  }, [lang]);

  // initial run + run when switching projects
  useEffect(() => {
    runRef.current(codeRef.current);
  }, [codeId]);
  // debounced auto-run
  const firstAuto = useRef(true);
  useEffect(() => {
    if (firstAuto.current) {
      firstAuto.current = false;
      return;
    }
    if (!prefs.auto) return;
    const tm = window.setTimeout(() => runRef.current(codeRef.current), 750);
    return () => window.clearTimeout(tm);
  }, [code, prefs.auto]);

  /* ── console bridge ── */
  useEffect(() => {
    let tm = 0;
    const flushLogs = () => {
      tm = 0;
      const buf = bufRef.current;
      bufRef.current = null;
      if (!buf?.length) return;
      setLogs((prev) => {
        let next = prev.slice();
        for (const m of buf) {
          if (m.type === ('clear' as LogType)) {
            next = [];
            continue;
          }
          const last = next[next.length - 1];
          if (last && last.type === m.type && last.text === m.text) next[next.length - 1] = { ...last, n: last.n + 1 };
          else next.push({ id: ++logId.current, type: m.type, text: m.text, n: 1 });
        }
        return next.length > 500 ? next.slice(-500) : next;
      });
    };
    const onMsg = (e: MessageEvent) => {
      const d = e.data as { __pg?: string; type?: string; args?: string[]; line?: number } | null;
      if (!d || typeof d !== 'object' || !d.__pg || d.__pg !== tokenRef.current) return;
      if (!frameRef.current || e.source !== frameRef.current.contentWindow) return;
      if (d.type === 'where') {
        // attach a line number to the error that was just reported
        const { jsLine, jsLines } = jsMapRef.current;
        const line = d.line ?? 0;
        const buf = bufRef.current;
        const target = buf?.[buf.length - 1];
        const rel = jsLine > 0 && line >= jsLine && line < jsLine + jsLines ? `JS line ${line - jsLine + 1}` : '';
        if (rel && target && target.type === 'error') target.text += ` (${rel})`;
        return;
      }
      const type = (['log', 'info', 'warn', 'error', 'debug', 'clear'].includes(d.type ?? '') ? d.type : 'log') as LogType;
      const text = (d.args ?? []).map((a) => String(a)).join(' ');
      (bufRef.current ??= []).push({ type, text });
      if (!tm) tm = window.setTimeout(flushLogs, 40);
    };
    window.addEventListener('message', onMsg);
    return () => {
      window.removeEventListener('message', onMsg);
      if (tm) window.clearTimeout(tm);
    };
  }, []);

  /* ── layout ── */
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([en]) => setWide(en.contentRect.width >= 720));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const startSplit = (e: RPointerEvent<HTMLDivElement>) => {
    const body = bodyRef.current;
    if (!body) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    const r = body.getBoundingClientRect();
    const move = (ev: PointerEvent) => setPrefs((p) => ({ ...SEED_PREFS, ...p, split: Math.min(0.78, Math.max(0.22, (ev.clientX - r.left) / r.width)) }));
    const up = () => {
      setDragging(false);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  };
  const startConsole = (e: RPointerEvent<HTMLDivElement>) => {
    const box = rightRef.current;
    if (!box || (e.target as HTMLElement).closest('button')) return;
    e.preventDefault();
    setDragging(true);
    const r = box.getBoundingClientRect();
    const move = (ev: PointerEvent) => setPrefs((p) => ({ ...SEED_PREFS, ...p, consoleOpen: true, consoleH: Math.min(0.75, Math.max(0.14, (r.bottom - ev.clientY) / r.height)) }));
    const up = () => {
      setDragging(false);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  };

  /* ── projects ── */
  const switchTo = (p: Project) => {
    flush();
    setStore((prev) => ({ ...prev, cur: p.id }));
    setCode({ html: p.html, css: p.css, js: p.js });
    setCodeId(p.id);
    setSaveState('idle');
  };
  const addProject = (p: Omit<Project, 'id' | 'at'>) => {
    flush();
    const np: Project = { ...p, id: uid('pg'), at: Date.now() };
    setStore((prev) => ({ projects: [np, ...(prev.projects ?? [])], cur: np.id }));
    setCode({ html: np.html, css: np.css, js: np.js });
    setCodeId(np.id);
    setSaveState('idle');
    return np;
  };
  const newProject = () => {
    addProject({ name: t('untitled'), html: '<h1>Hello</h1>\n', css: 'body {\n  font-family: system-ui, sans-serif;\n  padding: 24px;\n}\n', js: "console.log('Hello');\n" });
    setSheet(null);
    if (!wide) setPane('html');
  };
  const duplicate = (p: Project) => {
    const src = p.id === codeId ? { ...p, ...code } : p;
    addProject({ name: `${p.name} ${t('copy')}`, html: src.html, css: src.css, js: src.js });
  };
  const commitRename = () => {
    if (!renaming) return;
    const name = renaming.name.trim();
    if (name) setStore((prev) => ({ ...prev, projects: prev.projects.map((p) => (p.id === renaming.id ? { ...p, name, at: Date.now() } : p)) }));
    setRenaming(null);
  };
  const remove = (p: Project) => {
    setConfirmDel(null);
    const rest = projects.filter((x) => x.id !== p.id);
    if (p.id !== codeId) {
      setStore((prev) => ({ ...prev, projects: rest }));
      return;
    }
    dirtyRef.current = false;
    if (rest.length) {
      setStore({ projects: rest, cur: rest[0].id });
      setCode({ html: rest[0].html, css: rest[0].css, js: rest[0].js });
      setCodeId(rest[0].id);
    } else {
      const s = seedStore();
      setStore(s);
      const np = s.projects[0];
      setCode({ html: np.html, css: np.css, js: np.js });
      setCodeId(np.id);
    }
  };
  const openExample = (ex: PgExample) => {
    addProject({ name: ex.title, html: ex.html, css: ex.css, js: ex.js });
    setSheet(null);
    flash(`${ex.title} — ${t('openedExample')}`);
    if (!wide) setPane('preview');
  };
  const learn = (ex: PgExample) => {
    wm.open('learning', { section: 'it', topic: ex.topic });
  };

  /* ── export / documents ── */
  const exportHtml = () => {
    setSheet(null);
    const doc = exportDoc(code, cur.name);
    const blob = new Blob([doc], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${slug(cur.name)}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 4000);
    flash(`${t('downloadStarted')} — ${a.download}`);
  };
  const saveToDocs = () => {
    setSheet(null);
    flush();
    const id = uid('doc');
    const entry = { id, title: cur.name, kind: 'code', body: exportDoc(code, cur.name), at: Date.now(), source: 'playground' };
    const list = readStore<{ list: unknown[] }>(DOCS_KEY, { list: [] }).list ?? [];
    writeStore(DOCS_KEY, { list: [entry, ...(Array.isArray(list) ? list : [])] });
    const ok = (readStore<{ list: { id?: string }[] }>(DOCS_KEY, { list: [] }).list ?? []).some((d) => d?.id === id);
    if (!ok) {
      flash(t('saveFailed'), 'err');
      return;
    }
    notify({ app: 'Code Playground', icon: 'playground', title: DICT[lang].saveDocs, body: cur.name, actions: [{ label: 'Open Documents', run: () => wm.open('documents') }] });
    flash(`${t('saveDocs')} ✓`);
  };

  /* ── keyboard ── */
  const onKeyDown = (e: RKeyboardEvent<HTMLDivElement>) => {
    const mod = e.metaKey || e.ctrlKey;
    if (mod && e.key === 'Enter') {
      e.preventDefault();
      flush();
      run();
      if (!wide && pane !== 'console') setPane('preview');
    } else if (mod && (e.key === 's' || e.key === 'S')) {
      e.preventDefault();
      dirtyRef.current = true;
      flush();
    } else if (e.key === 'Escape' && sheet) {
      setSheet(null);
    }
  };

  const errCount = logs.filter((l) => l.type === 'error').length;
  const toggleCollapse = (l: Lang) => setPrefs((p) => {
    const c = { ...SEED_PREFS, ...p };
    return { ...c, collapsed: c.collapsed.includes(l) ? c.collapsed.filter((x) => x !== l) : [...c.collapsed, l] };
  });

  /* ── pieces ── */
  const editorPane = (l: Lang, withHead: boolean) => {
    const collapsed = withHead && prefs.collapsed.includes(l);
    return (
      <section key={l} className={`pg-pane pg-${l} ${collapsed ? 'collapsed' : ''}`} aria-label={LANG_LABEL[l]}>
        {withHead && (
          <button type="button" className="pg-pane-h" onClick={() => toggleCollapse(l)} aria-expanded={!collapsed} title={collapsed ? t('expand') : t('collapse')}>
            <IcChev open={!collapsed} />
            <i className={`pg-dot d-${l}`} />
            <b>{LANG_LABEL[l]}</b>
            <small>
              {code[l].split('\n').length} {t('lines')}
            </small>
          </button>
        )}
        {!collapsed && <CodeEditor lang={l} value={code[l]} onChange={(v) => edit(l, v)} label={`${LANG_LABEL[l]} editor`} />}
      </section>
    );
  };

  const preview = (
    <section className="pg-prev" aria-label={t('preview')}>
      <div className="pg-sub-h">
        <span className={`pg-live ${frame.stopped ? 'off' : ''}`} aria-hidden="true" />
        <b>{t('preview')}</b>
        <span className="pg-grow" />
        <button type="button" className="pg-mini" onClick={stop} disabled={frame.stopped} title={t('stop')} aria-label={t('stop')}>
          <IcStop />
        </button>
        <button type="button" className="pg-mini" onClick={() => run()} title={t('reload')} aria-label={t('reload')}>
          <IcReload />
        </button>
      </div>
      <div className="pg-frame">
        <iframe key={frame.key} ref={frameRef} title={t('preview')} sandbox="allow-scripts" srcDoc={frame.doc} />
      </div>
    </section>
  );

  const consolePanel = (
    <section className="pg-con" aria-label={t('console')}>
      <div className={`pg-sub-h ${wide ? 'grab' : ''}`} onPointerDown={wide ? startConsole : undefined}>
        {wide && (
          <button type="button" className="pg-mini" onClick={() => setPrefs((p) => ({ ...SEED_PREFS, ...p, consoleOpen: !({ ...SEED_PREFS, ...p }).consoleOpen }))} aria-expanded={prefs.consoleOpen} title={prefs.consoleOpen ? t('hideConsole') : t('showConsole')} aria-label={prefs.consoleOpen ? t('hideConsole') : t('showConsole')}>
            <IcChev open={prefs.consoleOpen} />
          </button>
        )}
        <b>{t('console')}</b>
        {errCount > 0 && <span className="pg-badge">{errCount}</span>}
        <span className="pg-grow" />
        <button type="button" className="pg-mini txt" onClick={() => setLogs([])} disabled={!logs.length}>
          <IcClear /> {t('clear')}
        </button>
      </div>
      {(!wide || prefs.consoleOpen) && (
        <div className="pg-logs" role="log" aria-live="polite">
          {logs.length === 0 && <p className="pg-empty">{t('noOutput')}</p>}
          {logs.map((l) => (
            <div key={l.id} className={`pg-log l-${l.type}`}>
              <span className="pg-log-ic">{l.type === 'error' ? <IcErr /> : l.type === 'warn' ? <IcWarn /> : l.type === 'info' || l.type === 'system' ? <IcInfo /> : null}</span>
              <span className="pg-log-t">{l.text}</span>
              {l.n > 1 && <span className="pg-log-n">{l.n}</span>}
            </div>
          ))}
        </div>
      )}
    </section>
  );

  const autoSwitch = (
    <label className="pg-auto" title={t('auto')}>
      <input type="checkbox" checked={prefs.auto} onChange={(e) => setPrefs((p) => ({ ...SEED_PREFS, ...p, auto: e.target.checked }))} />
      <span className="pg-switch" aria-hidden="true" />
      <span className="pg-auto-l">{t('auto')}</span>
    </label>
  );

  return (
    <div ref={rootRef} className={`pg ${wide ? 'wide' : 'narrow'} ${dragging ? 'dragging' : ''}`} onKeyDown={onKeyDown}>
      <DragBar className="pg-bar">
        <Lights />
        <button type="button" className={`pg-proj-btn ${sheet === 'projects' ? 'on' : ''}`} onClick={() => setSheet(sheet === 'projects' ? null : 'projects')} aria-haspopup="dialog" aria-expanded={sheet === 'projects'} title={t('projects')} data-nodrag>
          <span className="pg-proj-name">{cur.name}</span>
          <IcDown />
        </button>
        <button type="button" className={`pg-tb ${sheet === 'examples' ? 'on' : ''}`} onClick={() => setSheet(sheet === 'examples' ? null : 'examples')} title={t('examples')} aria-label={t('examples')} data-nodrag>
          <IcBook />
          {wide && <span>{t('examples')}</span>}
        </button>
        <span className="pg-grow" />
        {wide && saveState !== 'idle' && <span className="pg-status">{saveState === 'saving' ? t('saving') : t('autosaved')}</span>}
        {wide && autoSwitch}
        {wide && (
          <button type="button" className="pg-tb" onClick={stop} disabled={frame.stopped} title={t('stop')} data-nodrag>
            <IcStop />
            <span>{t('stop')}</span>
          </button>
        )}
        <button
          type="button"
          className="pg-tb primary"
          onClick={() => {
            flush();
            run();
            if (!wide && pane !== 'console') setPane('preview');
          }}
          title={`${t('run')} (⌘/Ctrl+Enter)`}
          aria-label={t('run')}
          data-nodrag
        >
          <IcPlay />
          <span>{t('run')}</span>
        </button>
        <button type="button" className={`pg-tb icon ${sheet === 'more' ? 'on' : ''}`} onClick={() => setSheet(sheet === 'more' ? null : 'more')} title={t('more')} aria-label={t('more')} aria-haspopup="menu" aria-expanded={sheet === 'more'} data-nodrag>
          <IcMore />
        </button>
      </DragBar>

      {!wide && (
        <div className="pg-seg" role="tablist" aria-label="Panes">
          {(['html', 'css', 'js', 'preview', 'console'] as Pane[]).map((p) => (
            <button key={p} type="button" role="tab" aria-selected={pane === p} className={pane === p ? 'on' : ''} onClick={() => setPane(p)}>
              {p === 'preview' ? t('preview') : p === 'console' ? t('console') : LANG_LABEL[p]}
              {p === 'console' && errCount > 0 && <span className="pg-badge">{errCount}</span>}
            </button>
          ))}
        </div>
      )}

      {wide ? (
        <div ref={bodyRef} className="pg-body" style={{ gridTemplateColumns: `minmax(0, ${prefs.split}fr) 9px minmax(0, ${1 - prefs.split}fr)` }}>
          <div className="pg-eds">{LANGS.map((l) => editorPane(l, true))}</div>
          <div className="pg-split" role="separator" aria-orientation="vertical" aria-label="Resize editor and preview" onPointerDown={startSplit} onDoubleClick={() => setPrefs((p) => ({ ...SEED_PREFS, ...p, split: 0.5 }))} />
          <div ref={rightRef} className="pg-right" style={{ gridTemplateRows: prefs.consoleOpen ? `minmax(0, ${1 - prefs.consoleH}fr) minmax(0, ${prefs.consoleH}fr)` : 'minmax(0, 1fr) auto' }}>
            {preview}
            {consolePanel}
          </div>
        </div>
      ) : (
        <div className="pg-body-n">
          {LANGS.includes(pane as Lang) && editorPane(pane as Lang, false)}
          <div className={`pg-n-prev ${pane === 'preview' ? '' : 'hidden'}`}>{preview}</div>
          {pane === 'console' && consolePanel}
          {pane !== 'preview' && pane !== 'console' && <div className="pg-hint">{t('editorHint')}</div>}
        </div>
      )}

      {sheet && <div className="pg-scrim" onPointerDown={() => (setSheet(null), commitRename())} />}

      {sheet === 'projects' && (
        <div className="pg-pop pg-projects" role="dialog" aria-label={t('projects')}>
          <div className="pg-pop-h">
            <b>{t('projects')}</b>
            <button type="button" className="pg-pill" onClick={newProject}>
              <IcPlus /> {t('newProject')}
            </button>
          </div>
          <ul className="pg-plist">
            {projects.map((p) => (
              <li key={p.id} className={p.id === codeId ? 'on' : ''}>
                {renaming?.id === p.id ? (
                  <input
                    className="pg-rename"
                    autoFocus
                    value={renaming.name}
                    onChange={(e) => setRenaming({ id: p.id, name: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitRename();
                      if (e.key === 'Escape') {
                        e.stopPropagation();
                        setRenaming(null);
                      }
                    }}
                    onBlur={commitRename}
                    aria-label={t('rename')}
                    maxLength={60}
                  />
                ) : (
                  <button
                    type="button"
                    className="pg-prow"
                    onClick={() => {
                      if (p.id !== codeId) switchTo(p);
                      setSheet(null);
                    }}
                  >
                    <span className="pg-pcheck">{p.id === codeId && <IcCheck />}</span>
                    <span className="pg-pname">
                      <b>{p.name}</b>
                      <small>{fmtWhen(p.at)}</small>
                    </span>
                  </button>
                )}
                <div className="pg-pacts">
                  <button type="button" className="pg-mini" onClick={() => setRenaming({ id: p.id, name: p.name })} title={t('rename')} aria-label={`${t('rename')} ${p.name}`}>
                    <IcPencil />
                  </button>
                  <button type="button" className="pg-mini" onClick={() => duplicate(p)} title={t('duplicate')} aria-label={`${t('duplicate')} ${p.name}`}>
                    <IcDup />
                  </button>
                  <button type="button" className="pg-mini danger" onClick={() => setConfirmDel(p)} title={t('del')} aria-label={`${t('del')} ${p.name}`}>
                    <IcTrash />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {sheet === 'more' && (
        <div className="pg-pop pg-menu" role="menu" aria-label={t('more')}>
          {!wide && <div className="pg-menu-auto">{autoSwitch}</div>}
          <button type="button" role="menuitem" onClick={newProject}>
            <IcPlus /> {t('newProject')}
          </button>
          <button type="button" role="menuitem" onClick={() => (duplicate(cur), setSheet(null))}>
            <IcDup /> {t('duplicate')}
          </button>
          <button type="button" role="menuitem" onClick={() => (setRenaming({ id: cur.id, name: cur.name }), setSheet('projects'))}>
            <IcPencil /> {t('rename')}
          </button>
          <hr />
          <button type="button" role="menuitem" onClick={exportHtml}>
            <IcExport /> {t('exportHtml')}
          </button>
          <button type="button" role="menuitem" onClick={saveToDocs}>
            <IcDoc /> {t('saveDocs')}
          </button>
          {!wide && (
            <>
              <hr />
              <button type="button" role="menuitem" onClick={() => (stop(), setSheet(null))} disabled={frame.stopped}>
                <IcStop /> {t('stop')}
              </button>
            </>
          )}
        </div>
      )}

      {sheet === 'examples' && (
        <div className="pg-modal" role="dialog" aria-label={t('examples')}>
          <div className="pg-modal-h">
            <div>
              <h2>{t('examples')}</h2>
              <p>{t('examplesSub')}</p>
            </div>
            <button type="button" className="pg-mini round" onClick={() => setSheet(null)} aria-label={t('close')} title={t('close')}>
              <IcX />
            </button>
          </div>
          <div className="pg-exgrid">
            {[...PG_EXAMPLES].sort((a, b) => Number(b.topic === exTopic) - Number(a.topic === exTopic)).map((ex) => (
              <article key={ex.id} className={`pg-ex ${ex.topic === exTopic ? 'hi' : ''}`} style={{ ['--tint' as string]: ex.tint }}>
                <div className="pg-ex-art" aria-hidden="true">
                  <span>{ex.topic === 'javascript' ? 'JS' : ex.topic === 'testing' ? 'TEST' : ex.topic.toUpperCase()}</span>
                </div>
                <h3>{ex.title}</h3>
                <p>{ex.blurb}</p>
                <div className="pg-ex-acts">
                  <button type="button" className="pg-pill primary" onClick={() => openExample(ex)}>
                    {t('open')}
                  </button>
                  <button type="button" className="pg-pill" onClick={() => learn(ex)} title={`${t('learn')}: ${ex.topicTitle}`}>
                    <IcBook /> {t('learn')}: {ex.topicTitle}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {toast && (
        <div className={`pg-toast ${toast.kind}`} role="status">
          {toast.text}
        </div>
      )}

      {confirmDel && <ConfirmDialog icon="playground" message={`${t('delQ')} “${confirmDel.name}”`} detail={t('delDetail')} confirmLabel={t('del')} onCancel={() => setConfirmDel(null)} onConfirm={() => remove(confirmDel)} />}
    </div>
  );
}
