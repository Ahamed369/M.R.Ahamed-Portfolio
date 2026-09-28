import { SettingsProvider } from './system/SettingsContext';
import { SystemProvider } from './system/SystemContext';
import { MusicProvider } from './system/MusicContext';
import { WindowManagerProvider } from './system/WindowManager';
import { Desktop } from './components/Desktop';

export default function App() {
  return (
    <SettingsProvider>
      <SystemProvider>
        <MusicProvider>
          <WindowManagerProvider>
            <Desktop />
          </WindowManagerProvider>
        </MusicProvider>
      </SystemProvider>
    </SettingsProvider>
  );
}
