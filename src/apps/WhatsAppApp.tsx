import { ChatClient, updatesChannel, type Chat, type ChatTheme } from './chat/ChatClient';
import { personal, socials } from '../data/portfolio';

/** v8 — WhatsApp-style portfolio chat. Messages to M.R. Ahamed can be sent to his real WhatsApp. */
const seed = (): Chat[] => {
  const now = Date.now();
  return [
    {
      id: 'owner',
      name: personal.name,
      avatar: personal.avatar,
      color: '#25d366',
      owner: true,
      pinned: true,
      unread: 1,
      about: personal.status,
      msgs: [
        {
          id: 'w1',
          from: 'them',
          at: now - 60000,
          text: `Hi! 👋 I'm ${personal.name} — ${personal.shortTitle}, based in ${personal.location}. Thanks for visiting my portfolio. Send me a message here and I'll give you a button to deliver it to my real WhatsApp.`,
        },
      ],
    },
    { id: 'self', name: 'Message yourself', color: '#8e8e93', self: true, unread: 0, about: 'Notes to self', msgs: [] },
    updatesChannel('#128c7e'),
  ];
};

const theme: ChatTheme = {
  app: 'whatsapp',
  title: 'WhatsApp',
  icon: 'whatsapp',
  storeKey: 'mra-whatsapp-v8',
  seed,
  realSend: (text) => ({ label: 'Send on WhatsApp ↗', href: `${socials.whatsapp}?text=${encodeURIComponent(text)}` }),
  autoReply: () => `Thanks for your message! 🙏 This chat lives inside my portfolio — tap “Send on WhatsApp” below to deliver it to my real WhatsApp (${personal.phone}).`,
};

export default function WhatsAppApp() {
  return <ChatClient theme={theme} />;
}
