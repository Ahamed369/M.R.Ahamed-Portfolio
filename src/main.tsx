import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { RootBoundary, claimAutoReload } from './components/RootBoundary';
import './system/history';
import { initAnalytics } from './system/analytics';
import { registerServiceWorker } from './system/webNotify';
import './system/pwa';
import './styles/zlayers.css';
import './styles/global.css';
import './styles/apps.css';
import './styles/system.css';
import './styles/apps-extra.css';
import './styles/apps-v5a.css';
import './styles/apps-v5b.css';
import './styles/apps-v5c.css';
import './styles/system-v5.css';
import './styles/launchpad-v5.css';
import './styles/apps-v7a.css';
import './styles/apps-v7b.css';
import './styles/apps-v7c.css';
import './styles/apps-v7d.css';
import './styles/apps-v7e.css';
import './styles/system-v8.css';
import './styles/apps-v8.css';
import './styles/system-v9.css';
import './styles/apps-v9.css';
import './styles/system-v10.css';
import './styles/ios-v10.css';
import './styles/apps-v10.css';
import './styles/app-flashcards.css';
import './styles/app-focusplanner.css';
import './styles/app-goals.css';
import './styles/app-bizplanner.css';
import './styles/app-playground.css';
import './styles/app-documents.css';
import './styles/app-guidebook.css';
import './styles/app-music.css';
import './styles/app-learning.css';
import './styles/app-transguest.css';
import './styles/icons-v103.css';
import './styles/settings-v103.css';
import './styles/widgets-v103.css';
import './styles/ioswidgets-v103.css';
import './styles/narrow-roots-v103.css';

/* v10.3.2 — after a new deployment, a tab that was already open may ask for a code
   file that no longer exists. Reload (at most once a minute) to get the new version. */
window.addEventListener('vite:preloadError', (e) => {
  console.error('[Portfolio] A code file could not be loaded:', (e as Event & { payload?: unknown }).payload);
  if (!navigator.onLine) return; // offline: keep today's behaviour (the app's own "quit unexpectedly" card)
  if (!claimAutoReload()) return; // reloaded very recently: let the normal error handling show it
  e.preventDefault();
  location.reload();
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RootBoundary>
      <App />
    </RootBoundary>
  </StrictMode>,
);

registerServiceWorker();
initAnalytics();