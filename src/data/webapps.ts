import type { IconName } from '../components/AppIcons';
import { personal, socials } from './portfolio';

/**
 * Online services shown as apps. Their sites don't allow being embedded inside
 * another page (for the visitor's security), so each opens in a new tab from
 * a macOS-style launcher window — with helpful shortcuts where the service
 * supports them (e.g. Gmail compose pre-addressed to M.R. Ahamed).
 */
export type WebCategory = 'Google' | 'Microsoft 365' | 'AI Assistants' | 'Social & Media' | 'Developer';

export interface WebService {
  id: string;
  name: string;
  icon: IconName;
  category: WebCategory;
  url: string;
  tagline: string;
  /** Extra one-click actions for this service */
  actions?: { label: string; url: string }[];
  /** Accepts a prompt in the URL (?q=) */
  promptUrl?: (q: string) => string;
  color: string;
}

const ASK = `Tell me about M.R. Ahamed, a Computer Science undergraduate and full-stack developer from ${personal.location}. His GitHub is ${socials.github}.`;

export const WEB_SERVICES: WebService[] = [
  {
    id: 'gmail',
    name: 'Gmail',
    icon: 'gmail',
    category: 'Google',
    url: 'https://mail.google.com/',
    tagline: 'Email M.R. Ahamed from your Gmail — it lands straight in his inbox.',
    actions: [{ label: `Write to ${personal.name}`, url: `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(personal.email)}&su=${encodeURIComponent('Hello from your portfolio')}` }],
    color: '#ea4335',
  },
  { id: 'drive', name: 'Google Drive', icon: 'drive', category: 'Google', url: 'https://drive.google.com/', tagline: 'Store, share and collaborate on files.', color: '#1a73e8' },
  { id: 'gphotos', name: 'Google Photos', icon: 'gphotos', category: 'Google', url: 'https://photos.google.com/', tagline: 'Your photos and videos, backed up.', color: '#fbbc04' },
  { id: 'playstore', name: 'Google Play', icon: 'playstore', category: 'Google', url: 'https://play.google.com/store', tagline: 'Install this portfolio and M.R. Ahamed’s Android apps.', color: '#01875f' },
  { id: 'classroom', name: 'Google Classroom', icon: 'classroom', category: 'Google', url: 'https://classroom.google.com/', tagline: 'Classes, coursework and assignments.', color: '#0f9d58' },
  { id: 'word', name: 'Microsoft Word', icon: 'word', category: 'Microsoft 365', url: 'https://www.office.com/launch/word', tagline: 'Create and edit documents online.', color: '#185abd' },
  { id: 'excel', name: 'Microsoft Excel', icon: 'excel', category: 'Microsoft 365', url: 'https://www.office.com/launch/excel', tagline: 'Spreadsheets and data analysis online.', color: '#107c41' },
  { id: 'powerpoint', name: 'Microsoft PowerPoint', icon: 'powerpoint', category: 'Microsoft 365', url: 'https://www.office.com/launch/powerpoint', tagline: 'Presentations online.', color: '#c43e1c' },
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    icon: 'chatgpt',
    category: 'AI Assistants',
    url: 'https://chatgpt.com/',
    tagline: 'AI assistant by OpenAI.',
    promptUrl: (q) => `https://chatgpt.com/?q=${encodeURIComponent(q)}`,
    color: '#10a37f',
  },
  {
    id: 'claude',
    name: 'Claude',
    icon: 'claude',
    category: 'AI Assistants',
    url: 'https://claude.ai/',
    tagline: 'AI assistant by Anthropic.',
    promptUrl: (q) => `https://claude.ai/new?q=${encodeURIComponent(q)}`,
    color: '#d97757',
  },
  { id: 'gemini', name: 'Gemini', icon: 'gemini', category: 'AI Assistants', url: 'https://gemini.google.com/', tagline: 'AI assistant by Google.', color: '#4f7cff' },
  { id: 'deepseek', name: 'DeepSeek', icon: 'deepseek', category: 'AI Assistants', url: 'https://chat.deepseek.com/', tagline: 'AI assistant by DeepSeek.', color: '#4d6bfe' },
  { id: 'shazam', name: 'Shazam', icon: 'shazam', category: 'Social & Media', url: 'https://www.shazam.com/', tagline: 'Identify the music playing around you.', color: '#0088ff' },
  { id: 'snapchat', name: 'Snapchat', icon: 'snapchat', category: 'Social & Media', url: 'https://www.snapchat.com/', tagline: 'Share moments with friends.', color: '#fffc00' },
  { id: 'gdocs', name: 'Google Docs', icon: 'gdocs', category: 'Google', url: 'https://docs.google.com/document/', tagline: 'Write and edit documents together.', color: '#4285f4' },
  { id: 'discord', name: 'Discord', icon: 'discord', category: 'Social & Media', url: 'https://discord.com/app', tagline: 'Chat, voice and communities.', color: '#5865f2' },
  { id: 'reddit', name: 'Reddit', icon: 'reddit', category: 'Social & Media', url: 'https://www.reddit.com/r/webdev/', tagline: 'Communities and discussions — opens r/webdev.', color: '#ff5700' },
  { id: 'pinterest', name: 'Pinterest', icon: 'pinterest', category: 'Social & Media', url: 'https://www.pinterest.com/search/pins/?q=ui%20design', tagline: 'Ideas and inspiration — opens UI design pins.', color: '#e60023' },
  { id: 'stackoverflow', name: 'Stack Overflow', icon: 'stackoverflow', category: 'Developer', url: 'https://stackoverflow.com/', tagline: 'Questions and answers for developers.', promptUrl: (q) => `https://stackoverflow.com/search?q=${encodeURIComponent(q)}`, color: '#f48024' },
  { id: 'canva', name: 'Canva', icon: 'canva', category: 'Developer', url: 'https://www.canva.com/', tagline: 'Design graphics, posters and presentations.', color: '#00c4cc' },
  { id: 'figma-web', name: 'Figma', icon: 'figma', category: 'Developer', url: 'https://www.figma.com/', tagline: 'Collaborative interface design.', color: '#a259ff' },
  { id: 'w3schools-web', name: 'W3Schools', icon: 'w3schools', category: 'Developer', url: 'https://www.w3schools.com/', tagline: 'Learn web development.', color: '#04aa6d' },
];

export const WEB_CATEGORIES: WebCategory[] = ['Google', 'Microsoft 365', 'AI Assistants', 'Social & Media', 'Developer'];

/** Default prompt offered to AI assistants. */
export const AI_PROMPT = ASK;

export const webServiceById = (id?: string): WebService => WEB_SERVICES.find((w) => w.id === id) ?? WEB_SERVICES[0];
