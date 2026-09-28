import { ChatClient, updatesChannel, type Chat, type ChatTheme } from './chat/ChatClient';
import { personal, socials } from '../data/portfolio';

/**
 * v8 — Telegram-style portfolio chat. M.R. Ahamed doesn't list a Telegram
 * account, so messages to him are handed to email instead (never invented).
 */
const seed = (): Chat[] => {
  const now = Date.now();
  return [
    {
      id: 'owner',
      name: personal.name,
      avatar: personal.avatar,
      color: '#2aabee',
      owner: true,
      pinned: true,
      unread: 1,
      about: personal.status,
      msgs: [
        {
          id: 't1',
          from: 'them',
          at: now - 90000,
          text: `Hello! I'm ${personal.name}. I don't use Telegram for work yet — write me here and I'll give you a button to send it by email, or reach me on WhatsApp: ${socials.whatsapp}`,
        },
      ],
    },
    { id: 'saved', name: 'Saved Messages', color: '#5e5ce6', self: true, unread: 0, about: 'Your cloud notes (this browser)', msgs: [] },
    updatesChannel('#229ed9'),
  ];
};

const theme: ChatTheme = {
  app: 'telegram',
  title: 'Telegram',
  icon: 'telegram',
  storeKey: 'mra-telegram-v8',
  seed,
  realSend: (text) => ({ label: 'Send by email ↗', href: `mailto:${personal.email}?subject=${encodeURIComponent('Message from your portfolio (Telegram app)')}&body=${encodeURIComponent(text)}` }),
  autoReply: () => 'Got it! 👍 To make sure I actually receive this, tap “Send by email” — or message me on WhatsApp.',
};

export default function TelegramApp() {
  return <ChatClient theme={theme} />;
}
