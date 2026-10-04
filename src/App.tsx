import { lazy, Suspense, useEffect, useState } from 'react';
import { ClassicSite } from './components/ClassicSite';
import { SettingsProvider, useSettings } from './system/SettingsContext';
import { SystemProvider } from './system/SystemContext';
import { MusicProvider } from './system/MusicContext';
import { WindowManagerProvider } from './system/WindowManager';
import { Desktop } from './components/Desktop';
import { framedSize, isEmbedded, useDeviceMode } from './system/ios';
import { FramedDevice } from './components/FramedDevice';
import { PrefEffects } from './components/PrefEffects';

/* the iPhone / iPad shell is loaded only on phones and tablets (or when chosen in Settings → Devices & View) */
const IOSShell = lazy(() => import('./components/ios/IOSShell').then((m) => ({ default: m.IOSShell })));

function Shell() {
  const { settings } = useSettings();
  const mode = useDeviceMode(settings.viewAs);
  const [classic, setClassic] = useState(() => {
    try {
      return new URLSearchParams(location.search).get('view') === 'classic';
    } catch {
      return false;
    }
  });
  useEffect(() => {
    const on = () => setClassic(true);
    window.addEventListener('mra-classic', on);
    return () => window.removeEventListener('mra-classic', on);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.device = classic ? 'classic' : mode;
  }, [mode, classic]);
  if (classic)
    return (
      <ClassicSite
        onExit={() => {
          setClassic(false);
          try {
            const u = new URL(location.href);
            u.searchParams.delete('view');
            history.replaceState(null, '', u.toString());
          } catch {
            /* ignore */
          }
        }}
      />
    );
  if (mode === 'mac') return <Desktop />;
  if (!isEmbedded && framedSize(mode)) return <FramedDevice key={mode} mode={mode} />;
  return (
    <Suspense fallback={<div className="ios-loading" />}>
      <IOSShell mode={mode} />
    </Suspense>
  );
}

export default function App() {
  return (
    <SettingsProvider>
      <SystemProvider>
        <MusicProvider>
          <WindowManagerProvider>
            <PrefEffects />
            <Shell />
          </WindowManagerProvider>
        </MusicProvider>
      </SystemProvider>
    </SettingsProvider>
  );
}
