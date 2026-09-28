import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { registerServiceWorker } from './system/webNotify';
import './system/pwa';
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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

registerServiceWorker();
