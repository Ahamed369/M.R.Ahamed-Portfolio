import { useEffect, useRef, useState } from 'react';
import { usePersisted, uid } from '../system/useStore';
import { ConfirmDialog } from '../components/ConfirmDialog';
import type { AppProps } from '../components/Desktop';

interface Doc {
  id: string;
  title: string;
  html: string;
  updated: number;
}

const clean = (html: string) => html.replace(/<(script|style|iframe|object)[\s\S]*?<\/\1>/gi, '').replace(/ on\w+="[^"]*"/gi, '');
const textOf = (html: string) => {
  const d = document.createElement('div');
  d.innerHTML = clean(html);
  return d.innerText;
};

/** v10 — TextEdit: rich-text documents saved in this browser; export as .txt or .html. */
export default function TextEditApp(_: AppProps) {
  const [docs, setDocs] = usePersisted<Doc[]>('mra-textedit-docs', [{ id: 'welcome', title: 'Welcome', html: '<h2>TextEdit</h2><p>Write anything here — it saves automatically in this browser.</p><p><b>Bold</b>, <i>italic</i> and <u>underline</u> are in the toolbar.</p>', updated: Date.now() }]);
  const [cur, setCur] = useState(docs[0]?.id ?? '');
  const [del, setDel] = useState<Doc | null>(null);
  const [side, setSide] = useState(true);
  const ed = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const compact = () => !!root.current?.closest('.is-compact');
  const doc = docs.find((d) => d.id === cur) ?? docs[0];
  const timer = useRef(0);

  useEffect(() => {
    if (ed.current && doc && ed.current.innerHTML !== doc.html) ed.current.innerHTML = clean(doc.html);
    // only when switching documents
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc?.id]);

  const save = () => {
    const el = ed.current;
    if (!el || !doc) return;
    const html = clean(el.innerHTML);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const first = textOf(html).trim().split('\n')[0]?.slice(0, 40) || 'Untitled';
      setDocs((l) => l.map((d) => (d.id === doc.id ? { ...d, html, title: d.title === 'Untitled' || d.title === 'Welcome' ? first : d.title, updated: Date.now() } : d)));
    }, 500);
  };
  const cmd = (c: string, v?: string) => {
    ed.current?.focus();
    document.execCommand(c, false, v);
    save();
  };
  const create = () => {
    const d: Doc = { id: uid('doc'), title: 'Untitled', html: '<p><br></p>', updated: Date.now() };
    setDocs((l) => [d, ...l]);
    setCur(d.id);
    if (compact()) setSide(false);
    window.setTimeout(() => ed.current?.focus(), 50);
  };
  const download = (kind: 'txt' | 'html') => {
    if (!doc) return;
    const body = kind === 'txt' ? textOf(doc.html) : `<!doctype html><meta charset="utf-8"><title>${doc.title}</title>${clean(doc.html)}`;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([body], { type: kind === 'txt' ? 'text/plain' : 'text/html' }));
    a.download = `${doc.title.replace(/[^\w\- ]+/g, '').trim() || 'Untitled'}.${kind}`;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };

  return (
    <div ref={root} className={`te10 ${side ? '' : 'no-side'}`}>
      <aside className="te10-side">
        <button type="button" className="te10-new" onClick={create}>
          ＋ New Document
        </button>
        {docs.map((d) => (
          <button key={d.id} type="button" className={`te10-doc ${d.id === doc?.id ? 'on' : ''}`} onClick={() => (setCur(d.id), compact() && setSide(false))}>
            <b>{d.title}</b>
            <small>{new Date(d.updated).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</small>
          </button>
        ))}
      </aside>
      <section className="te10-main">
        <div className="te10-bar" role="toolbar" aria-label="Formatting">
          <button type="button" onClick={() => setSide((s) => !s)} aria-label="Toggle documents">
            ☰
          </button>
          <select aria-label="Style" onChange={(e) => cmd('formatBlock', e.target.value)} defaultValue="p">
            <option value="p">Body</option>
            <option value="h1">Title</option>
            <option value="h2">Heading</option>
            <option value="h3">Subheading</option>
            <option value="blockquote">Quote</option>
          </select>
          <button type="button" onClick={() => cmd('bold')} aria-label="Bold">
            <b>B</b>
          </button>
          <button type="button" onClick={() => cmd('italic')} aria-label="Italic">
            <i>I</i>
          </button>
          <button type="button" onClick={() => cmd('underline')} aria-label="Underline">
            <u>U</u>
          </button>
          <button type="button" onClick={() => cmd('strikeThrough')} aria-label="Strikethrough">
            <s>S</s>
          </button>
          <input type="color" aria-label="Text colour" onChange={(e) => cmd('foreColor', e.target.value)} />
          <button type="button" onClick={() => cmd('justifyLeft')} aria-label="Align left">
            ⇤
          </button>
          <button type="button" onClick={() => cmd('justifyCenter')} aria-label="Centre">
            ≡
          </button>
          <button type="button" onClick={() => cmd('justifyRight')} aria-label="Align right">
            ⇥
          </button>
          <button type="button" onClick={() => cmd('insertUnorderedList')} aria-label="Bulleted list">
            •≡
          </button>
          <button type="button" onClick={() => cmd('insertOrderedList')} aria-label="Numbered list">
            1≡
          </button>
          <span className="te10-sp" />
          <button type="button" onClick={() => download('txt')}>
            .txt
          </button>
          <button type="button" onClick={() => download('html')}>
            .html
          </button>
          <button type="button" className="te10-del" disabled={!doc} onClick={() => doc && setDel(doc)} aria-label="Delete document">
            🗑
          </button>
        </div>
        {doc ? <div ref={ed} className="te10-page" contentEditable suppressContentEditableWarning onInput={save} spellCheck aria-label="Document" /> : <p className="te10-empty">No documents — create one.</p>}
      </section>
      {del && (
        <ConfirmDialog
          icon="textedit"
          message={`Delete “${del.title}”?`}
          detail="It moves to Recently Deleted (Finder → Trash) — you can put it back."
          onCancel={() => setDel(null)}
          onConfirm={() => {
            setDocs((l) => l.filter((d) => d.id !== del.id));
            setCur(docs.find((d) => d.id !== del.id)?.id ?? '');
            setDel(null);
          }}
        />
      )}
    </div>
  );
}
