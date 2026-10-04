import { MailClient, type MailTheme } from './mail/MailClient';
import type { AppProps } from '../components/Desktop';

/**
 * Mail — v8 full mail client. Sending hands the message to the visitor's
 * own email app via mailto: (no servers or API keys), so replies from
 * M.R. Ahamed arrive in the visitor's real inbox — and messages to him
 * arrive in his Gmail (and on his phone).
 */
const theme: MailTheme = {
  app: 'mail',
  title: 'Mail',
  icon: 'mail',
  storeKey: 'mra-mail-v8',
  deliver: (to, subject, body) => {
    window.location.href = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  },
};

export default function MailApp({ win }: AppProps) {
  return <MailClient key={win.launchKey} theme={theme} composeOnOpen={win.args?.compose === '1'} subject={win.args?.subject} body={win.args?.body} />;
}
