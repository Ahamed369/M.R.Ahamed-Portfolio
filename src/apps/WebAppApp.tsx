import { useEffect, useState } from 'react';
import { AppIcon } from '../components/AppIcons';
import { AI_PROMPT, WEB_CATEGORIES, WEB_SERVICES, webServiceById } from '../data/webapps';
import { openExternal, notify } from '../system/notify';
import type { AppProps } from '../components/Desktop';
import { HAS_LIBRARY, WebLibrary } from './web/WebLibrary';

/**
 * One launcher window for online services (Gmail, Drive, Microsoft 365, AI
 * assistants…). These sites refuse to be shown inside another page, so each
 * opens in a new tab — with handy shortcuts where the service supports them.
 */
export default function WebAppApp({ win }: AppProps) {
  const [id, setId] = useState(() => webServiceById(win.args?.service).id);
  const [prompt, setPrompt] = useState(AI_PROMPT);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (win.args?.service) setId(webServiceById(win.args.service).id);
  }, [win.launchKey, win.args?.service]);

  const s = webServiceById(id);
  const isAI = s.category === 'AI Assistants';

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className="wa7">
      <aside className="wa7-side">
        {WEB_CATEGORIES.map((c) => (
          <div key={c}>
            <div className="wa7-sec">{c}</div>
            {WEB_SERVICES.filter((w) => w.category === c).map((w) => (
              <button key={w.id} type="button" className={`wa7-nav ${w.id === id ? 'on' : ''}`} onClick={() => setId(w.id)}>
                <AppIcon name={w.icon} className="wa7-nav-ico" />
                {w.name}
              </button>
            ))}
          </div>
        ))}
      </aside>
      <section className="wa7-main" key={id} style={{ ['--wa-c' as string]: s.color }}>
        <div className="wa7-hero fade-swap">
          <AppIcon name={s.icon} className="wa7-big" />
          <h2>{s.name}</h2>
          <p>{s.tagline}</p>
          <div className="wa7-actions">
            {s.actions?.map((a) => (
              <button key={a.label} type="button" className="btn btn-primary" onClick={() => openExternal(a.url, { title: a.label, app: s.name, icon: s.icon })}>
                {a.label}
              </button>
            ))}
            <button type="button" className={`btn ${s.actions?.length ? '' : 'btn-primary'}`} onClick={() => openExternal(s.url, { title: `Opening ${s.name}`, app: s.name, icon: s.icon })}>
              Open {s.name} ↗
            </button>
          </div>
          {isAI && (
            <div className="wa7-ai">
              <label htmlFor="wa7-prompt">Ask {s.name} about M.R. Ahamed</label>
              <textarea id="wa7-prompt" value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={3} />
              <div className="wa7-actions">
                {s.promptUrl ? (
                  <button type="button" className="btn btn-primary" onClick={() => openExternal(s.promptUrl!(prompt), { title: `Asking ${s.name}`, app: s.name, icon: s.icon })}>
                    Ask {s.name} ↗
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      void copy();
                      notify({ app: s.name, icon: s.icon, title: 'Prompt copied', body: `Paste it into ${s.name}.` });
                      openExternal(s.url);
                    }}
                  >
                    Copy prompt & open {s.name} ↗
                  </button>
                )}
                <button type="button" className="btn" onClick={() => void copy()}>
                  {copied ? 'Copied ✓' : 'Copy prompt'}
                </button>
              </div>
            </div>
          )}
          {HAS_LIBRARY.has(s.id) && <WebLibrary id={s.id} />}
          <p className="wa7-note">
            {s.name} opens in a new browser tab — sites like this don’t allow being embedded inside another page, which keeps your account safe. Nothing you type here is sent anywhere until you choose to open it.
          </p>
        </div>
      </section>
    </div>
  );
}
