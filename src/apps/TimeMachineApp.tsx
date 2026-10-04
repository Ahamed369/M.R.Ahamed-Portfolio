import { useEffect, useMemo, useState } from 'react';
import { DragBar, Lights } from '../components/Window';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { backUpNow, currentData, deleteSnapshot, keyLabel, listSnapshots, restoreSnapshot, type TMSnapshot } from '../system/timeMachine';
import { notify } from '../system/notify';

const when = (t: number) => {
  const d = new Date(t);
  const today = new Date().toDateString() === d.toDateString();
  return today ? `Today, ${d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}` : d.toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
};

/** v10.1 — Time Machine: browse and restore hourly snapshots of your portfolio data. */
export default function TimeMachineApp() {
  const [snaps, setSnaps] = useState<TMSnapshot[]>([]);
  const [ix, setIx] = useState(0);
  const [ask, setAsk] = useState<TMSnapshot | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const load = () => void listSnapshots().then(setSnaps);
    load();
    window.addEventListener('mra-tm', load);
    return () => window.removeEventListener('mra-tm', load);
  }, []);
  const cur = snaps[Math.min(ix, snaps.length - 1)];
  const diff = useMemo(() => {
    if (!cur) return null;
    const now = currentData();
    const changed: string[] = [];
    const added: string[] = [];
    const removed: string[] = [];
    Object.keys(cur.data).forEach((k) => (!(k in now) ? removed.push(k) : now[k] !== cur.data[k] && changed.push(k)));
    Object.keys(now).forEach((k) => !(k in cur.data) && added.push(k));
    return { changed, added, removed };
  }, [cur]);
  const backup = async () => {
    setBusy(true);
    const s = await backUpNow(true);
    setBusy(false);
    setIx(0);
    notify({ app: 'Time Machine', icon: 'timemachine', title: s ? 'Backup complete' : 'Couldn’t back up', body: s ? `${s.count} items saved in this browser.` : 'Your saved data is too large for a snapshot.', silent: !!s });
  };
  return (
    <div className="tm">
      <DragBar className="tm-bar">
        <Lights />
        <b>Time Machine</b>
        <span className="tm-sp" />
        <button type="button" className="tm-btn" disabled={busy} onClick={() => void backup()} data-nodrag>
          {busy ? 'Backing Up…' : 'Back Up Now'}
        </button>
      </DragBar>
      <div className="tm-body">
        <div className="tm-space">
          {snaps.length === 0 ? (
            <div className="tm-empty">
              <b>No backups yet</b>
              <p>Time Machine saves a snapshot of everything you create here — notes, messages, layouts and settings — every hour while the portfolio is open. Snapshots stay in this browser.</p>
              <button type="button" className="tm-btn big" onClick={() => void backup()}>
                Back Up Now
              </button>
            </div>
          ) : (
            <div className="tm-stack">
              {snaps
                .slice(ix, ix + 5)
                .reverse()
                .map((s, k, arr) => {
                  const depth = arr.length - 1 - k;
                  return (
                    <div key={s.at} className={`tm-card ${depth === 0 ? 'front' : ''}`} style={{ ['--d' as string]: depth }} onClick={() => depth > 0 && setIx(ix + depth)}>
                      <header>
                        <b>{when(s.at)}</b>
                        <small>
                          {s.count} items · {(s.bytes / 1024).toFixed(0)} KB{s.manual ? ' · manual' : ''}
                        </small>
                      </header>
                      {depth === 0 && diff && (
                        <div className="tm-diff">
                          {!diff.changed.length && !diff.added.length && !diff.removed.length ? (
                            <p>Identical to what you have now.</p>
                          ) : (
                            <>
                              {diff.changed.length > 0 && (
                                <p>
                                  <b>Different now:</b> {diff.changed.slice(0, 8).map(keyLabel).join(', ')}
                                  {diff.changed.length > 8 ? ` +${diff.changed.length - 8} more` : ''}
                                </p>
                              )}
                              {diff.removed.length > 0 && (
                                <p>
                                  <b>Only in this backup:</b> {diff.removed.slice(0, 8).map(keyLabel).join(', ')}
                                </p>
                              )}
                              {diff.added.length > 0 && (
                                <p>
                                  <b>Created since:</b> {diff.added.slice(0, 8).map(keyLabel).join(', ')}
                                  {diff.added.length > 8 ? ` +${diff.added.length - 8} more` : ''}
                                </p>
                              )}
                            </>
                          )}
                          <div className="tm-actions">
                            <button type="button" className="tm-btn" data-noconfirm onClick={() => void deleteSnapshot(s.at)}>
                              Delete Backup
                            </button>
                            <button type="button" className="tm-btn primary" onClick={() => setAsk(s)}>
                              Restore
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          )}
          {snaps.length > 1 && (
            <div className="tm-arrows">
              <button type="button" aria-label="Older" disabled={ix >= snaps.length - 1} onClick={() => setIx((i) => Math.min(snaps.length - 1, i + 1))}>
                ▲
              </button>
              <button type="button" aria-label="Newer" disabled={ix === 0} onClick={() => setIx((i) => Math.max(0, i - 1))}>
                ▼
              </button>
            </div>
          )}
        </div>
        {snaps.length > 0 && (
          <ol className="tm-timeline" aria-label="Backups">
            <li className={`now ${ix === -1 ? 'on' : ''}`}>Now</li>
            {snaps.map((s, k) => (
              <li key={s.at}>
                <button type="button" className={k === ix ? 'on' : ''} onClick={() => setIx(k)}>
                  {new Date(s.at).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
                </button>
              </li>
            ))}
          </ol>
        )}
      </div>
      {ask && (
        <ConfirmDialog
          icon="settings"
          message={`Restore the backup from ${when(ask.at)}?`}
          detail="Everything you created in the portfolio goes back to how it was then, and the portfolio reloads. (Tip: Back Up Now first if you want to keep today’s state.)"
          confirmLabel="Restore"
          onCancel={() => setAsk(null)}
          onConfirm={() => restoreSnapshot(ask)}
        />
      )}
    </div>
  );
}
