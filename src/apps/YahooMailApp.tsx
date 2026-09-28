import { MailClient, type MailTheme } from './mail/MailClient';
import type { AppProps } from '../components/Desktop';

/** v8 — Yahoo Mail-style client. "Send" opens Yahoo Mail's real compose page with everything filled in. */
const theme: MailTheme = {
  app: 'yahoomail',
  title: 'Yahoo Mail',
  icon: 'yahoomail',
  storeKey: 'mra-yahoomail-v8',
  deliver: (to, subject, body) => {
    window.open(`https://compose.mail.yahoo.com/?to=${encodeURIComponent(to)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank', 'noopener,noreferrer');
  },
};

export default function YahooMailApp({ win }: AppProps) {
  return <MailClient key={win.launchKey} theme={theme} composeOnOpen={win.args?.compose === '1'} />;
}
