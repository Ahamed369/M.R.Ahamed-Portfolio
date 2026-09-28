/**
 * v9 — "Expertise & Capabilities" (My Services), exactly as supplied by
 * M.R. Ahamed. Short descriptions only restate what each service covers;
 * `projects` / `venture` link to evidence that already exists in portfolio.ts.
 */
export type ServiceGroupId = 'technology' | 'business';

export interface Service {
  id: string;
  title: string;
  desc: string;
  /** project ids (portfolio.ts → projects) that demonstrate this service */
  projects?: string[];
  tags: string[];
}

export interface ServiceArea {
  id: string;
  group: ServiceGroupId;
  title: string;
  icon: string;
  color: string;
  /** venture id (portfolio.ts → ventures) behind this area, if any */
  venture?: string;
  services: Service[];
}

export const SERVICE_GROUPS: { id: ServiceGroupId; num: string; title: string; blurb: string }[] = [
  { id: 'technology', num: '01', title: 'Technology', blurb: 'Software, systems and digital products — from interface to database.' },
  { id: 'business', num: '02', title: 'Entrepreneurship & Business', blurb: 'Hands-on commercial work across automotive, trade, electronics and property.' },
];

export const SERVICE_AREAS: ServiceArea[] = [
  {
    id: 'tech',
    group: 'technology',
    title: 'Technology',
    icon: '💻',
    color: '#0a84ff',
    services: [
      { id: 'fullstack', title: 'Full-Stack Web Development', desc: 'Web applications that bring together the user interface, server-side logic, databases and APIs.', projects: ['healthforge', 'citywalk', 'fidenz', 'highstreet', 'freshmart'], tags: ['React', 'Node.js', 'PHP', 'MySQL'] },
      { id: 'uiux', title: 'UI/UX Design & Development', desc: 'Clean, responsive interfaces designed and then built — layouts, flows and front-end code.', projects: ['edulearn', 'freshmart', 'citywalk'], tags: ['Figma', 'HTML', 'CSS', 'Responsive'] },
      { id: 'mobile', title: 'Mobile Application Development', desc: 'Mobile apps with local data, clear screens and everyday usability.', projects: ['expense'], tags: ['Android', 'Java', 'SQLite'] },
      { id: 'api', title: 'API Development & Integration', desc: 'RESTful APIs, authentication and connecting applications to third-party services.', projects: ['ndi', 'fidenz'], tags: ['REST', 'JWT', 'Express'] },
      { id: 'database', title: 'Database & Business Systems', desc: 'Data models and management systems for records, patients, students and operations.', projects: ['medicare', 'studentrecord'], tags: ['MySQL', 'SQL', 'CRUD'] },
      { id: 'pos', title: 'POS System Development', desc: 'Point-of-sale software for orders, billing and day-to-day store or restaurant workflows.', projects: ['restaurant-pos'], tags: ['POS', 'Desktop', 'Offline'] },
    ],
  },
  {
    id: 'automotive',
    group: 'business',
    title: 'Automotive',
    icon: '🚗',
    color: '#ff9f0a',
    venture: 'tasco',
    services: [
      { id: 'vehicle', title: 'Vehicle Sales, Sourcing & Imports', desc: 'Finding, importing and selling vehicles that match a buyer’s needs.', tags: ['Sales', 'Imports'] },
      { id: 'finance', title: 'Finance & Dealer Coordination', desc: 'Coordinating with finance providers and dealers to complete purchases smoothly.', tags: ['Finance', 'Dealers'] },
    ],
  },
  {
    id: 'trade',
    group: 'business',
    title: 'International Trade',
    icon: '🌍',
    color: '#30b0c7',
    venture: 'ceylon-trade-link',
    services: [
      { id: 'importexport', title: 'Import, Export & International Product Sourcing', desc: 'Sourcing products internationally and handling import / export.', tags: ['Import', 'Export', 'Sourcing'] },
      { id: 'wholesale', title: 'Wholesale & Retail Trading', desc: 'Buying and selling goods through wholesale and retail channels.', tags: ['Wholesale', 'Retail'] },
    ],
  },
  {
    id: 'electronics',
    group: 'business',
    title: 'Mobile Phones & Electronics',
    icon: '📱',
    color: '#5e5ce6',
    venture: 'mobile-kingdom',
    services: [
      { id: 'phones', title: 'Mobile Phones, Accessories & Electronics', desc: 'Smartphones, accessories and selected electronic products.', tags: ['Smartphones', 'Accessories'] },
      { id: 'techsourcing', title: 'Technology Product Sourcing & Sales', desc: 'Sourcing technology products and selling them to customers.', tags: ['Sourcing', 'Sales'] },
    ],
  },
  {
    id: 'property',
    group: 'business',
    title: 'Property & Home Development',
    icon: '🏡',
    color: '#34c759',
    venture: 'rizwan-homes',
    services: [
      { id: 'land', title: 'Land & Site Selection', desc: 'Identifying suitable land and sites for development.', tags: ['Land', 'Sites'] },
      { id: 'residential', title: 'Residential Development & Home Delivery', desc: 'Developing residential homes and delivering them to buyers.', tags: ['Residential', 'Homes'] },
      { id: 'architecture', title: 'Architectural Planning & Project Coordination', desc: 'Coordinating plans and the people involved in a building project.', tags: ['Planning', 'Coordination'] },
    ],
  },
  {
    id: 'sales',
    group: 'business',
    title: 'Sales, Marketing & Business',
    icon: '📈',
    color: '#ff375f',
    services: [
      { id: 'salesmarketing', title: 'Sales & Marketing', desc: 'Selling products and promoting them to the right customers.', tags: ['Sales', 'Marketing'] },
      { id: 'bizdev', title: 'Business Development', desc: 'Growing a business through new opportunities, partners and markets.', tags: ['Growth', 'Partnerships'] },
      { id: 'digital', title: 'Digital & Social Media Marketing', desc: 'Promotion through online channels and social media.', tags: ['Social media', 'Online'] },
      { id: 'crm', title: 'Customer Relationship Management', desc: 'Looking after customers before, during and after a sale.', tags: ['Customers', 'After-sales'] },
    ],
  },
];

export const ALL_SERVICES = SERVICE_AREAS.flatMap((a) => a.services.map((s) => ({ ...s, area: a })));
