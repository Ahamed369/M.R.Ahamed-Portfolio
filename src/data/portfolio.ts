/**
 * ─────────────────────────────────────────────────────────────
 *  CENTRALISED PORTFOLIO DATA — M.R. Ahamed
 * ─────────────────────────────────────────────────────────────
 *  Every app on the desktop (About, Notes, Xcode, Finder,
 *  Achievements deck, Safari, Mail, Terminal) reads from this
 *  single file. Update your information here only.
 *
 *  Sources:
 *   • M.R. AHAMED CV (PDF)
 *   • Supplied experience notes (ventures)
 *   • Public GitHub repositories — https://github.com/Ahamed369
 * ─────────────────────────────────────────────────────────────
 */

export const personal = {
  name: 'M.R. Ahamed',
  displayName: 'M.R. Ahamed',
  headline: 'Computer Science Undergraduate · Full-Stack Developer',
  shortTitle: 'CS Undergraduate & Full-Stack Developer',
  location: 'Kandy, Sri Lanka',
  timezone: 'Asia/Colombo',
  city: 'Kandy',
  email: 'ahamedrock369@gmail.com',
  phone: '+94 76 353 9501',
  phoneHref: 'tel:+94763539501',
  photo: './images/ahamed.jpg',
  avatar: './images/ahamed-avatar.jpg',
  status: 'Open to IT internships',
  summary:
    'Computer Science undergraduate and aspiring full-stack developer with experience creating web, mobile and desktop applications that integrate user interfaces, server-side functionality, databases and RESTful APIs. Strong foundation in Java, Python, JavaScript, React and Node.js, with knowledge of authentication and application security testing. Entrepreneurial work has strengthened commercial awareness, client communication, requirements analysis and practical problem-solving.',
  objective:
    'Seeking an IT internship to apply these strengths to real-world challenges in a collaborative environment.',
} as const;

export const socials = {
  github: 'https://github.com/Ahamed369',
  githubHandle: 'Ahamed369',
  linkedin: 'https://www.linkedin.com/in/mr-ahamed-6146a5276',
  linkedinHandle: 'mr-ahamed-6146a5276',
  email: `mailto:${personal.email}`,
  sms: `sms:${personal.phoneHref.replace('tel:', '')}`,
  /** Supplied by M.R. Ahamed */
  facebook: 'https://www.facebook.com/share/1Ny7mf6TUs/',
  instagram: 'https://www.instagram.com/__mr.ahamed__/',
  instagramHandle: '@__mr.ahamed__',
  spotify: 'https://open.spotify.com/user/31utdk2jphoppn2lbb2hoev4qfym',
  /** Listed on the GitHub profile README */
  threads: 'https://www.threads.net/@__mr.ahamed__',
  /** WhatsApp click-to-chat — built from the phone number on the CV */
  whatsapp: 'https://wa.me/94763539501',
} as const;

/**
 * v8 — optional integrations. Leave a value empty and the portfolio uses a
 * graceful fallback (see UPDATE-GUIDE.md → "Version 8 integrations").
 */
export interface Integrations {
  googleClientId: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  bookingUrl: string;
  siteUrl: string;
  demoUser: string;
  demoPassword: string;
}
export const integrations: Integrations = {
  /** Google Identity Services OAuth Client ID (…apps.googleusercontent.com) — enables "Sign in with Google" */
  googleClientId: '',
  /** Supabase project URL + anon key — makes the Guestbook shared between all visitors */
  supabaseUrl: '',
  supabaseAnonKey: '',
  /** Calendly (or any booking page) link for "Book a Call" */
  bookingUrl: '',
  /** Public URL of the deployed portfolio (used by Share) — empty = current page address */
  siteUrl: '',
  /** Demo login shown on the Wallet / Passwords lock screens */
  demoUser: 'guest',
  demoPassword: 'portfolio2026',
};

export const cv = {
  fileName: 'M_R_AHAMED_CV.pdf',
  displayName: 'CV — Ahamed.pdf',
  url: './cv/M_R_AHAMED_CV.pdf',
  pages: ['./cv/page-1.jpg', './cv/page-2.jpg'],
} as const;

/** Key/value rows shown in the "About This Portfolio" window. */
export const aboutRows: { label: string; value: string }[] = [
  { label: 'Focus', value: 'Full-Stack Development' },
  { label: 'Degree', value: 'BSc (Hons) Computer Science' },
  { label: 'Languages', value: 'Java · JavaScript · Python' },
  { label: 'Web & Backend', value: 'React · Node.js · PHP' },
  { label: 'Ventures', value: 'Founder / Co-Founder — 4 businesses' },
];

/* ───────────────────────────── Skills ───────────────────────────── */

export interface SkillNote {
  id: string;
  emoji: string;
  title: string;
  subtitle: string;
  tags: string[];
  /** Additional technologies listed on the GitHub profile README */
  profile?: string[];
  paragraphs: string[];
}

export const skillNotes: SkillNote[] = [
  {
    id: 'about',
    emoji: '👋',
    title: 'About Me',
    subtitle: 'CS Undergraduate & Full-Stack Dev',
    tags: ['Java', 'JavaScript', 'Python', 'React', 'Node.js'],
    paragraphs: [
      `My name is ${personal.name}. ${personal.summary}`,
      `${personal.objective} Based in ${personal.location}.`,
    ],
  },
  {
    id: 'programming',
    emoji: '💻',
    title: 'Programming',
    subtitle: 'Java · JavaScript · Python · SQL',
    tags: ['Java', 'JavaScript', 'Python', 'SQL', 'C++', 'PHP'],
    profile: ['TypeScript', 'Kotlin', 'C#', 'C', 'Rust', 'Ruby', 'Swift', 'Bash', 'Julia'],
    paragraphs: [
      'Java is the language behind my Android application (Student Expense Tracker) and my Java Swing desktop application (MediCarePlus). Python powers my offline Restaurant POS System built with Tkinter and SQLite.',
      'JavaScript powers my React and Node.js / Express.js work — including the Fidenz Weather App and the NDI Registration System — while PHP drives the City Walk, HealthForge and Student Record System web applications. SQL is used throughout for relational database work.',
    ],
  },
  {
    id: 'web',
    emoji: '🌐',
    title: 'Web & Backend',
    subtitle: 'React · Node.js · Express · PHP',
    tags: ['React', 'Three.js', 'HTML', 'CSS', 'AJAX', 'Bootstrap', 'jQuery', 'Node.js', 'Express.js', 'PHP', 'Spring Boot', 'Vite', 'Axios'],
    profile: ['Next.js', 'Angular', 'Redux', 'Sass', 'MUI', 'Radix UI', 'Chart.js', 'Webpack', 'Preact', 'Lit', 'Astro', 'Django', 'NestJS', 'FastAPI', 'Fastify', 'Strapi', 'GraphQL'],
    paragraphs: [
      'On the frontend I build responsive interfaces with React, HTML, CSS, JavaScript and Bootstrap, with Three.js used for interactive 3D content.',
      'On the backend I work with Node.js, Express.js, PHP and Spring Boot to build RESTful APIs, session-based and token-based authentication, admin dashboards and database-connected features.',
    ],
  },
  {
    id: 'apis',
    emoji: '🔐',
    title: 'APIs & Security',
    subtitle: 'REST · JWT · RBAC · Pen-testing',
    tags: ['RESTful APIs', 'JWT', 'Role-Based Access Control', 'Auth0', 'Kali Linux', 'Penetration Testing', 'Vulnerability Assessment'],
    profile: ['Authentication', 'Authorisation', 'OAuth 2.0 (Auth0)', 'Hack The Box', 'Bugcrowd'],
    paragraphs: [
      'I design RESTful endpoints and protect them with JWT authentication and role-based access control. The Fidenz Weather App uses Auth0 on the React client and express-oauth2-jwt-bearer on the API.',
      'I participated in an authorised group security assessment in a controlled academic environment, using Kali Linux to evaluate application and firewall security and identify potential vulnerabilities.',
    ],
  },
  {
    id: 'data',
    emoji: '🗄️',
    title: 'Databases',
    subtitle: 'MySQL · MongoDB · SQLite',
    tags: ['MySQL', 'MongoDB', 'Mongoose', 'SQLite', 'JSON', 'Database Design'],
    profile: ['PostgreSQL', 'Redis', 'MariaDB', 'DynamoDB', 'Firebase', 'Cassandra', 'Microsoft SQL Server'],
    paragraphs: [
      'Relational design and integration with MySQL (City Walk, HealthForge, Medicare Plus), document storage with MongoDB and Mongoose (NDI Registration System) and on-device persistence with SQLite (Student Expense Tracker).',
    ],
  },
  {
    id: 'mobile',
    emoji: '📱',
    title: 'Mobile & Desktop',
    subtitle: 'Android · Java Swing',
    tags: ['Android Studio', 'Android SDK', 'XML Layouts', 'Retrofit', 'MPAndroidChart', 'Java Swing', 'JDBC', 'Tkinter'],
    profile: ['Flutter', 'React Native', 'Ionic', 'Kotlin', 'Xamarin', 'iOS'],
    paragraphs: [
      'Native Android development in Java with XML layouts, SQLite, Retrofit networking and MPAndroidChart visualisations.',
      'Desktop development with Java Swing (MediCarePlus) and Python Tkinter with SQLite (Restaurant POS System).',
    ],
  },
  {
    id: 'tools',
    emoji: '🛠️',
    title: 'Tools & DevOps',
    subtitle: 'Git · GitHub Actions · Postman',
    tags: ['Git', 'GitHub', 'GitHub Actions', 'npm', 'Ubuntu', 'Postman', 'XAMPP', 'VS Code'],
    profile: ['GitLab', 'Linux', 'Neovim', 'Notion', 'Obsidian', 'Discord', 'pnpm'],
    paragraphs: [
      'Version control with Git and GitHub, automation with GitHub Actions, package management with npm, API testing with Postman and local PHP/MySQL environments with XAMPP on Ubuntu and Windows.',
    ],
  },
  {
    id: 'engineering',
    emoji: '🧠',
    title: 'Software Engineering',
    subtitle: 'OOP · DSA · MVC · Agile',
    tags: ['Object-Oriented Programming', 'Data Structures & Algorithms', 'MVC Architecture', 'Agile / Scrum'],
    profile: ['Requirements Analysis', 'System Design'],
    paragraphs: [
      'Grounded in object-oriented programming, data structures and algorithms, MVC architecture and Agile/Scrum practices through my degree coursework and project work.',
    ],
  },
  {
    id: 'soft',
    emoji: '🤝',
    title: 'Business & Soft Skills',
    subtitle: 'Founder · Negotiation · Clients',
    tags: ['Leadership', 'Client Communication', 'Requirements Analysis', 'Negotiation', 'Sourcing & Imports', 'Market Evaluation'],
    paragraphs: [
      'Founding and co-founding businesses in mobile retail, vehicle sales, international trading and residential development has strengthened my commercial awareness, client communication, requirements analysis and practical problem-solving.',
      'As Batch Representative at SLIIT Kandy UNI I represented my batch and coordinated with faculty and peers.',
    ],
  },
  {
    id: 'cloud',
    emoji: '☁️',
    title: 'Cloud & DevOps',
    subtitle: 'Docker · CI/CD · Cloud platforms',
    tags: ['GitHub Actions', 'Git', 'npm'],
    profile: ['Docker', 'Kubernetes', 'AWS', 'Google Cloud', 'Azure', 'Terraform', 'Cloudflare', 'Render', 'Vault'],
    paragraphs: [
      'My GitHub profile lists cloud and DevOps as a focus area — cloud-ready applications, containerised systems, CI/CD automation, scalable architectures and reliable deployment workflows.',
      'GitHub Actions and Git-based workflows are part of my day-to-day development; the wider cloud tooling below is listed on my GitHub profile as technologies I am exploring.',
    ],
  },
  {
    id: 'ai',
    emoji: '🤖',
    title: 'AI & Data',
    subtitle: 'Python data stack · Computer vision',
    tags: ['Python', 'Artificial Intelligence (Diploma coursework)'],
    profile: ['NumPy', 'Pandas', 'TensorFlow', 'OpenCV', 'Google Gemini', 'Anthropic', 'Databricks'],
    paragraphs: [
      'Artificial Intelligence and Python programming were part of my Diploma in Information Technology at ESOFT Metro Campus.',
      'My GitHub profile lists the AI, data-science and computer-vision tools I work with and am learning.',
    ],
  },
  {
    id: 'design',
    emoji: '🎨',
    title: 'UI / UX & Design',
    subtitle: 'Figma · Adobe · Framer',
    tags: ['Responsive Web Design', 'UI/UX Design'],
    profile: ['Figma', 'Adobe XD', 'Adobe Illustrator', 'After Effects', 'Framer', 'Webflow', 'Canva', 'Blender'],
    paragraphs: [
      'My GitHub bio describes me as a UI/UX designer as well as a developer. Responsive, user-focused interfaces are a common thread across my web projects — from City Walk and HealthForge to EduLearn LMS.',
    ],
  },
  {
    id: 'testing',
    emoji: '🧪',
    title: 'Testing & QA',
    subtitle: 'Unit · E2E · API testing',
    tags: ['node:test', 'Postman', 'Vulnerability Assessment'],
    profile: ['Jest', 'Vitest', 'Playwright', 'Cypress', 'Testing Library'],
    paragraphs: [
      'The Fidenz Weather App ships unit tests for its Comfort Index engine using Node’s built-in test runner, and I use Postman to exercise REST APIs.',
    ],
  },
  {
    id: 'cms',
    emoji: '🛒',
    title: 'CMS, Payments & Productivity',
    subtitle: 'Stripe · Shopify · Trello',
    tags: ['Stripe'],
    profile: ['WordPress', 'Shopify', 'Sanity', 'PayPal', 'Trello', 'Slack', 'Zapier', 'Linear'],
    paragraphs: ['Payment and commerce integrations (Stripe per my CV) plus the content, commerce and productivity tools listed on my GitHub profile.'],
  },
  {
    id: 'languages',
    emoji: '🗣️',
    title: 'Languages',
    subtitle: 'English · Sinhala · Tamil',
    tags: ['English', 'Sinhala', 'Tamil'],
    paragraphs: ['Professional working proficiency in English, Sinhala and Tamil.'],
  },
];

/* ───────────────────────────── Projects ───────────────────────────── */

export type CodeLang = 'php' | 'js' | 'jsx' | 'java' | 'py' | 'html';
export type PreviewKind = 'phone' | 'browser' | 'desktop';

export interface Project {
  id: string;
  name: string;
  file: string;
  lang: CodeLang;
  group: 'GitHub' | 'Resume';
  category: string;
  period?: string;
  description: string;
  overview: string;
  features: string[];
  responsibilities?: string[];
  stack: {
    frontend?: string[];
    backend?: string[];
    database?: string[];
    apis?: string[];
    security?: string[];
    mobile?: string[];
    tools?: string[];
  };
  architecture?: string;
  status: string;
  /** Date of the latest push to the GitHub repository (from the GitHub API) */
  updated?: string;
  repo?: string;
  demo?: string;
  preview: {
    kind: PreviewKind;
    accent: string;
    accent2: string;
    tabs: string[];
    tagline: string;
  };
}

const gh = (repo: string) => `${socials.github}/${repo}`;

/**
 * GitHub projects — discovered on github.com/Ahamed369 and read repo-by-repo
 * (README, source tree and dependency files). Resume-only projects follow.
 * To add a new project, append an object below — every app updates itself.
 */
export const projects: Project[] = [
  {
    id: 'healthforge',
    name: 'HealthForge Fitness',
    file: 'healthforge.php',
    lang: 'php',
    group: 'GitHub',
    category: 'Full-Stack Web Application & Security Assessment',
    period: 'Jul 2026 – Present',
    description:
      'A full-stack fitness and health e-commerce web application with authentication, product management, shopping cart, checkout, order management and a complete admin dashboard.',
    overview:
      'HealthForge gives customers one place to discover and buy fitness, wellness and recovery products, backed by a PHP + MySQL backend and a dedicated administrative control centre for users, products, orders and FAQs.',
    features: [
      'Fitness & wellness product catalogue',
      'User registration, login & session management',
      'Shopping cart & checkout processing',
      'Order management & order history',
      'Admin dashboard — users, products, orders, FAQs',
      'Product-image uploads',
      'Password hashing for stored credentials',
    ],
    responsibilities: [
      'Developed the complete website — responsive frontend, backend functionality and database-connected features.',
      'Designed and implemented the administrative dashboard and Stripe payment gateway integration.',
      'Took part in an authorised group security assessment in a controlled academic environment to evaluate application and firewall security.',
    ],
    stack: {
      frontend: ['HTML', 'CSS', 'JavaScript', 'Bootstrap'],
      backend: ['PHP'],
      database: ['MySQL'],
      apis: ['Stripe'],
      security: ['Session authentication', 'Password hashing', 'Kali Linux assessment'],
      tools: ['XAMPP', 'Git', 'GitHub'],
    },
    architecture: 'PHP MVC-style models (User, Product, Cart, Order) with separate auth, cart, orders and admin modules over MySQL.',
    status: 'In development',
    updated: '2026-09-26',
    repo: gh('HealthForge-Fitness-Web-Application'),
    preview: {
      kind: 'browser',
      accent: '#16a34a',
      accent2: '#0f172a',
      tabs: ['Shop', 'Cart', 'Orders', 'Admin'],
      tagline: 'Forge your fitness · Power your health',
    },
  },
  {
    id: 'expense',
    name: 'Student Expense Tracker',
    file: 'StudentExpenseTracker.java',
    lang: 'java',
    group: 'GitHub',
    category: 'Android Mobile Application',
    period: 'Feb 2026 – Jun 2026',
    description:
      'A native Android expense-management app for students with expense tracking, budget management, financial analytics and currency conversion.',
    overview:
      'Four modules — Expenses, Budget, Analytics and Currency — are reachable from a bottom navigation bar. Records are stored locally in SQLite, spending is visualised with pie and bar charts, and live exchange rates are fetched from public REST APIs.',
    features: [
      'Record, categorise and manage daily expenses',
      'Monthly category budgets with overspending alerts',
      'Pie & bar chart analytics with time filters',
      'Currency conversion with live exchange rates',
      'Country / currency information lookup',
      'Bottom-navigation, fragment-based UI',
    ],
    responsibilities: [
      'Designed the application structure, screen layouts and user interface.',
      'Implemented expense management with SQLite for storing, retrieving and managing financial records.',
      'Integrated an external currency-conversion API and MPAndroidChart visualisations.',
    ],
    stack: {
      mobile: ['Android Studio', 'Android SDK (min 24 / target 34)', 'XML layouts', 'Material Components'],
      backend: ['Java'],
      database: ['SQLite'],
      apis: ['Retrofit 2', 'Gson', 'ExchangeRate-API', 'REST Countries API'],
      tools: ['MPAndroidChart', 'Gradle', 'Git'],
    },
    architecture: 'Single-activity app with fragments (Expense, Budget, Analytics, Currency), a SQLite DatabaseHelper, adapters and a Retrofit API client.',
    status: 'Completed',
    updated: '2026-09-26',
    repo: gh('Student-Expense-Tracker'),
    preview: {
      kind: 'phone',
      accent: '#7c3aed',
      accent2: '#111827',
      tabs: ['Expenses', 'Budget', 'Analytics', 'Currency'],
      tagline: 'Track → Budget → Analyze → Improve',
    },
  },
  {
    id: 'ndi',
    name: 'NDI Registration System',
    file: 'ndi_registration.js',
    lang: 'js',
    group: 'GitHub',
    category: 'RESTful API & Backend Platform',
    period: 'Jul 2025 – Dec 2025',
    description:
      'A full-stack National Digital Identity registration system built with Node.js, Express.js, MongoDB and a REST API for secure citizen registration and identity data management.',
    overview:
      'A browser-based interface talks to an Express.js REST API that validates and stores citizen identity records in MongoDB through Mongoose models, supporting the full create-read-update-delete lifecycle with search and filtering.',
    features: [
      'Citizen registration & digital identity records',
      'Create, retrieve, update and delete records',
      'Search and filtering',
      'Request validation & centralised error handling',
      'Environment-based configuration',
      'Modular routes / models architecture',
    ],
    responsibilities: [
      'Developed backend API endpoints for registration, identity verification and validation.',
      'Established the MongoDB connection and implemented database operations, validation and error handling.',
      'Integrated JWT authentication and role-based access control.',
    ],
    stack: {
      frontend: ['HTML', 'CSS', 'JavaScript'],
      backend: ['Node.js', 'Express.js'],
      database: ['MongoDB', 'Mongoose'],
      apis: ['RESTful API', 'JSON'],
      security: ['JWT', 'Role-Based Access Control', 'dotenv'],
      tools: ['Postman', 'nodemon', 'Git'],
    },
    architecture: 'Client JS → REST API → Express routes → Mongoose model → MongoDB.',
    status: 'Completed',
    updated: '2026-09-26',
    repo: gh('NDI-Registration-System'),
    preview: {
      kind: 'browser',
      accent: '#2563eb',
      accent2: '#0b1220',
      tabs: ['Register', 'Records', 'Search'],
      tagline: 'Register → Validate → Store → Manage',
    },
  },
  {
    id: 'fidenz',
    name: 'Fidenz Weather App',
    file: 'FidenzWeather.jsx',
    lang: 'jsx',
    group: 'GitHub',
    category: 'Full-Stack Weather Web Application',
    description:
      'A modern weather web application providing real-time weather information, forecasts and a custom Comfort Index through a responsive React dashboard.',
    overview:
      'A React + Vite dashboard (city cards, comfort gauge and trend chart) is secured with Auth0 and backed by a Node.js / Express API that fetches OpenWeatherMap data, caches responses and computes a weighted 0–100 Comfort Index from temperature, humidity, wind and cloudiness.',
    features: [
      'City-based real-time weather & forecasts',
      'Weighted 0–100 Comfort Index engine',
      'Comfort gauge, city cards & trend charts',
      'Auth0 login with JWT-protected API',
      'Server-side response caching',
      'Unit tests for the Comfort Index (node:test)',
    ],
    stack: {
      frontend: ['React', 'Vite', 'Axios'],
      backend: ['Node.js', 'Express.js'],
      apis: ['OpenWeatherMap API', 'REST'],
      security: ['Auth0', 'express-oauth2-jwt-bearer', 'CORS', 'dotenv'],
      tools: ['node:test', 'npm', 'Git'],
    },
    architecture: 'React SPA ⇄ Express API (auth middleware, cache, weather service, comfort-index module) ⇄ OpenWeatherMap.',
    status: 'Completed',
    updated: '2026-09-25',
    repo: gh('Fidenz-Weather-App'),
    preview: {
      kind: 'browser',
      accent: '#0ea5e9',
      accent2: '#0c1a2b',
      tabs: ['Dashboard', 'Cities', 'Trends'],
      tagline: 'Weather data → Comfort insights',
    },
  },
  {
    id: 'citywalk',
    name: 'City Walk',
    file: 'city_walk.php',
    lang: 'php',
    group: 'GitHub',
    category: 'Full-Stack E-Commerce Web Application',
    description:
      'A full-stack footwear e-commerce web application built with PHP, MySQL, JavaScript, HTML and CSS, with a customer storefront and an admin control centre.',
    overview:
      'Customers browse dedicated Men, Women and Kids collections, sign in and place orders, while administrators manage products, categories, customers, orders, promotions, banners, FAQs and CMS pages from a back-office dashboard.',
    features: [
      'Men, Women & Kids collections + full catalogue',
      'Customer authentication & sessions',
      'Order creation workflow',
      'Admin: products, categories, customers, orders',
      'Promotions, banners, FAQs & CMS pages',
      'Admin profile & password management',
    ],
    stack: {
      frontend: ['HTML5', 'CSS3', 'JavaScript'],
      backend: ['PHP'],
      database: ['MySQL'],
      apis: ['PHP API endpoints'],
      security: ['Session authentication', 'Password hashing'],
      tools: ['Git', 'GitHub'],
    },
    architecture: 'PHP storefront + admin module sharing a MySQL schema (citywalk_db.sql).',
    status: 'Active',
    updated: '2026-09-26',
    repo: gh('City-Walk-Full-Stack-Web-Application'),
    preview: {
      kind: 'browser',
      accent: '#6c63ff',
      accent2: '#111111',
      tabs: ['Men', 'Women', 'Kids', 'Admin'],
      tagline: 'Modern footwear e-commerce experience',
    },
  },
  {
    id: 'studentrecord',
    name: 'Student Record System',
    file: 'student_record.php',
    lang: 'php',
    group: 'GitHub',
    category: 'Web Application',
    description:
      'A web-based Student Record System for managing and retrieving student information using HTML, CSS, PHP and JSON.',
    overview:
      'A lightweight interface for searching students by ID and adding new records, with PHP endpoints that validate for duplicate IDs and persist data to JSON storage — no database server required.',
    features: [
      'Search students by unique ID',
      'Add new student records',
      'Duplicate student-ID validation',
      'JSON-based data storage',
      'Responsive interface',
    ],
    stack: {
      frontend: ['HTML5', 'CSS3', 'JavaScript'],
      backend: ['PHP'],
      database: ['JSON storage'],
      tools: ['VS Code', 'Git', 'GitHub'],
    },
    architecture: 'index.html → add_student.php / get_student.php → students.json.',
    status: 'Completed',
    updated: '2026-09-26',
    repo: gh('student-record-system'),
    preview: {
      kind: 'browser',
      accent: '#f59e0b',
      accent2: '#1f2937',
      tabs: ['Search', 'Add Student'],
      tagline: 'Search · Add · Validate · Store',
    },
  },
  {
    id: 'highstreet',
    name: 'High Street Car Sale',
    file: 'high_street_car_sale.js',
    lang: 'js',
    group: 'Resume',
    category: 'Full-Stack Web Application',
    period: 'Jul 2026 – Present',
    description:
      'A responsive full-stack vehicle marketplace with advanced search and filtering, image galleries and dedicated dashboards for buyers and sellers.',
    overview:
      'Built for High Street Car Sale Private Limited — backend services in Node.js and Express.js with MySQL, JWT-based authentication and secure access controls, plus administrative and transaction-management functionality.',
    features: [
      'Advanced vehicle search & filtering',
      'Detailed vehicle image galleries',
      'Buyer & seller dashboards',
      'Listing management & content moderation',
      'Payment workflows',
      'Real-time user communication',
    ],
    stack: {
      frontend: ['HTML', 'CSS', 'JavaScript', 'Three.js'],
      backend: ['Node.js', 'Express.js'],
      database: ['MySQL'],
      apis: ['Stripe', 'WebSockets'],
      security: ['JWT', 'Secure access controls'],
    },
    status: 'In development',
    preview: {
      kind: 'browser',
      accent: '#dc2626',
      accent2: '#111827',
      tabs: ['Browse', 'Sell', 'Dashboard'],
      tagline: 'Find, compare & buy vehicles',
    },
  },
  {
    id: 'medicare',
    name: 'MediCarePlus',
    file: 'MediCarePlus.java',
    lang: 'java',
    group: 'GitHub',
    category: 'Patient Management Desktop Application',
    period: 'Jul 2025 – Dec 2025',
    description:
      'A Java Swing-based patient management system for managing patients, doctors, appointments, reports, notifications and persistent healthcare records.',
    overview:
      'A single Java Swing desktop application that brings patient, doctor and appointment management together, with validation, event-driven UI, date/time handling via the Java Time API, and persistent records stored in text files (patients.txt, doctors.txt, appointments.txt).',
    features: [
      'Patient registration — create, view, update',
      'Doctor & specialisation management with search',
      'Appointment scheduling linking patients and doctors',
      'Timing-conflict detection, rescheduling & delay handling',
      'Reports & doctor-wise statistics',
      'Appointment notifications',
      'Input validation & persistent file storage',
    ],
    responsibilities: [
      'Built the complete appointment-scheduling module — Swing interface, backend processing and data management.',
      'Applied LocalDate and LocalDateTime to detect timing conflicts and handle rescheduling or delays reliably.',
      'Produced monthly reports consolidating activity summaries, timetables and doctor-wise statistics.',
    ],
    stack: {
      frontend: ['Java Swing', 'AWT events'],
      backend: ['Java', 'Java Time API', 'OOP', 'MVC Architecture'],
      database: ['Text-file persistence (public repo)', 'MySQL via JDBC (CV)'],
      tools: ['Git', 'GitHub'],
    },
    architecture: 'Swing GUI → patient / doctor / appointment management → application logic & validation → file handler (patients.txt, doctors.txt, appointments.txt).',
    status: 'Completed',
    updated: '2026-09-26',
    repo: gh('MediCarePlus-Patient-Management-System'),
    preview: {
      kind: 'desktop',
      accent: '#0d9488',
      accent2: '#0f172a',
      tabs: ['Patients', 'Doctors', 'Appointments', 'Reports'],
      tagline: 'Patients · Doctors · Appointments',
    },
  },
  {
    id: 'restaurant-pos',
    name: 'Ember Restaurant POS',
    file: 'restaurant_pos.py',
    lang: 'py',
    group: 'GitHub',
    category: 'Offline Desktop Point-of-Sale System',
    description:
      'A complete offline Restaurant Point of Sale system built with Python, Tkinter and SQLite — orders, kitchen workflow, inventory, customers, staff roles, payments, receipts and sales reporting.',
    overview:
      'A Windows desktop POS that runs fully offline on a local SQLite database: dine-in, takeaway and delivery orders flow from the cashier to the kitchen (New → Preparing → Ready → Served), with role-based staff access, PBKDF2-hashed passwords, split payments, receipts, CSV reports and automatic database backups.',
    features: [
      'Fast POS: menu search, categories, cart, discounts, tax & service charge',
      'Dine-in (table selection), takeaway & delivery orders',
      'Kitchen workflow: New → Preparing → Ready → Served',
      'Menu & inventory management',
      'Customers & loyalty points',
      'Cash, card and split / mixed payments with change calculation',
      'Receipt generation & CSV report export',
      'Sales dashboard & date-based reports',
      'Automatic database backup',
    ],
    stack: {
      frontend: ['Tkinter'],
      backend: ['Python'],
      database: ['SQLite'],
      security: ['Role-based login (Admin · Manager · Cashier)', 'PBKDF2 password hashing'],
      tools: ['CSV export', 'Windows batch launcher', 'Git'],
    },
    architecture: 'Tkinter GUI (app.py) → business logic → database layer (database.py) → local SQLite with automatic backups.',
    status: 'Completed',
    updated: '2026-09-26',
    repo: gh('Restaurant-POS-System'),
    preview: {
      kind: 'desktop',
      accent: '#f97316',
      accent2: '#1c1917',
      tabs: ['POS', 'Kitchen', 'Inventory', 'Reports'],
      tagline: 'Order → Kitchen → Payment → Report',
    },
  },
  {
    id: 'freshmart',
    name: 'FreshMart Website',
    file: 'freshmart.html',
    lang: 'html',
    group: 'GitHub',
    category: 'Grocery E-Commerce Web Application',
    description:
      'A modern, responsive multi-page grocery e-commerce web application with product browsing, categories, search, shopping cart, wishlist, offers, reviews, account pages, payment flow and an admin interface.',
    overview:
      'FreshMart is a multi-page grocery store built with HTML5, CSS3 and vanilla JavaScript. Dedicated pages cover eight grocery departments (Fruits, Vegetables, Meat, Dairy, Bakery, Beverages, Snacks, Pantry Staples), a store, search results, cart, wishlist, offers, reviews, authentication, profile, payment, about/contact/info pages and an admin panel. Account and session data are kept in the browser with localStorage.',
    features: [
      'Homepage and store for browsing groceries',
      'Eight grocery category pages',
      'Product search with a results page',
      'Shopping cart and wishlist',
      'Offers and customer reviews',
      'Sign-up / login, profile and payment interface',
      'Admin interface',
      'Responsive layout across devices',
    ],
    stack: {
      frontend: ['HTML5', 'CSS3', 'JavaScript'],
      tools: ['Git', 'GitHub', 'localStorage'],
    },
    architecture: 'Static multi-page site: Pages/ (HTML) · Styles/ (per-page CSS) · Functions/ (per-page JS) · Images/.',
    status: 'Completed',
    updated: '2026-09-26',
    repo: gh('FreshMart-Website'),
    preview: {
      kind: 'browser',
      accent: '#16a34a',
      accent2: '#052e16',
      tabs: ['Store', 'Categories', 'Cart', 'Wishlist'],
      tagline: 'Fresh groceries · Modern interface · Smarter shopping',
    },
  },
  {
    id: 'edulearn',
    name: 'EduLearn LMS',
    file: 'edulearn.html',
    lang: 'html',
    group: 'GitHub',
    category: 'Front-End Learning Management System',
    description:
      'A responsive educational web application with course discovery, student pages, authentication interfaces, campus content and interactive jQuery demonstrations.',
    overview:
      'A multi-page front-end LMS (home, courses, students, contact, login and sign-up) built with HTML, Bootstrap 5, JavaScript and jQuery, sharing a consistent navigation structure and a responsive grid across desktop, tablet and mobile.',
    features: [
      'Responsive landing page with featured learning content',
      'Courses page with course cards',
      'Student-focused pages & resources',
      'Login and sign-up interfaces',
      'jQuery interactivity — click, hover, input events, DOM & CSS updates',
      'Bootstrap grid & responsive navigation',
    ],
    stack: {
      frontend: ['HTML5', 'CSS3', 'Bootstrap 5', 'JavaScript', 'jQuery'],
      tools: ['Git', 'GitHub'],
    },
    architecture: 'Static multi-page site: index · courses · students · contact · login · signup.',
    status: 'Completed',
    updated: '2026-09-26',
    repo: gh('EduLearn-LMS'),
    preview: {
      kind: 'browser',
      accent: '#4f46e5',
      accent2: '#111827',
      tabs: ['Courses', 'Students', 'Contact', 'Login'],
      tagline: 'Learn · Discover · Connect · Grow',
    },
  },
];

/* ───────────────────────────── Education ───────────────────────────── */

export interface Education {
  id: string;
  institution: string;
  qualification: string;
  period: string;
  location?: string;
  details?: string[];
}

export const education: Education[] = [
  {
    id: 'sliit',
    institution: 'SLIIT City Uni (SCU)',
    qualification: 'BSc (Hons) Computer Science',
    period: '2025 – Present',
    location: 'Colombo, Sri Lanka',
    details: [
      'Academic pathway: a three-year course — a two-year Higher Diploma in Information Technology (HDIT) at SLIIT Kandy UNI, followed by the final year of the BSc (Hons) Computer Science programme at SLIIT City Uni. The degree is awarded by the University of Bedfordshire, United Kingdom.',
      'Relevant coursework: Data Structures & Algorithms, Object-Oriented Programming, Database Systems, Web Technologies, Software Engineering, Computer Networks, Computer Security, Probability & Statistics.',
    ],
  },
  {
    id: 'esoft-it',
    institution: 'ESOFT Metro Campus',
    qualification: 'Diploma in Information Technology',
    period: 'Jan 2019 – Aug 2019',
    location: 'Kandy, Sri Lanka',
    details: [
      'Relevant coursework: Artificial Intelligence, Python Programming, Software Engineering, Web Design, Database Concepts, Networking & Automation, Computer Hardware & Systems.',
    ],
  },
  {
    id: 'esoft-en',
    institution: 'ESOFT Metro Campus',
    qualification: 'Diploma in English',
    period: 'Jul 2019 – Aug 2019',
    location: 'Kandy, Sri Lanka',
  },
  {
    id: 'al',
    institution: 'Zahira College, Gampola',
    qualification: 'GCE Advanced Level (A/L) — Commerce Stream, English Medium',
    period: '2021',
  },
  {
    id: 'ol',
    institution: 'Zahira College, Gampola',
    qualification: 'GCE Ordinary Level (O/L), English Medium',
    period: '2018',
  },
];

/* ───────────────────────────── Experience ───────────────────────────── */

export interface Venture {
  id: string;
  company: string;
  role: string;
  duration: string;
  summary: string;
  contribution: string;
  focus: string[];
  highlights: string[];
  stats: { value: string; label: string }[];
  color: string;
}

export const ventures: Venture[] = [
  {
    id: 'mobile-kingdom',
    company: 'Mobile Kingdom',
    role: 'Founder',
    duration: '5+ years',
    summary:
      'An online mobile and technology retail business specialising in brand-new and pre-owned smartphones, mobile accessories and selected electronic products, built around quality products, competitive pricing, reliable sourcing and responsive customer service.',
    contribution:
      'As Founder, I manage product sourcing, imports, direct purchasing, wholesale and retail sales, customer consultation, pricing, online promotion and after-sales communication. Continuous monitoring of smartphone releases, technology trends and market pricing supports informed purchasing decisions and helps customers select devices that match their requirements and budgets.',
    focus: [
      'Brand-New Smartphones',
      'Pre-Owned Smartphones',
      'Mobile Accessories & Electronics',
      'Direct Product Purchasing',
      'International Product Sourcing & Imports',
      'Wholesale & Retail Sales',
      'Online & Social Media Sales',
      'Product & Pricing Consultation',
      'Technology Market Research',
      'Customer & After-Sales Support',
    ],
    highlights: [
      '5+ Years of Business Operations',
      '500+ Customers Served',
      '500+ Product Sales',
      '100+ Product Imports',
      'Developed Direct Sourcing, Retail & Wholesale Sales Channels',
    ],
    stats: [
      { value: '5+', label: 'Years' },
      { value: '500+', label: 'Customers' },
      { value: '500+', label: 'Product sales' },
      { value: '100+', label: 'Imports' },
    ],
    color: '#2563eb',
  },
  {
    id: 'tasco',
    company: 'Tasco Car Sale (Pvt) Ltd',
    role: 'Co-Founder',
    duration: '3+ years',
    summary:
      'A vehicle sales and sourcing business specialising in luxury and semi-luxury vehicles, with services covering vehicle sales, imports, sourcing, registration support and finance coordination — focused on genuine vehicles, competitive market pricing and suitable financing solutions.',
    contribution:
      'As Co-Founder, I contribute to vehicle sourcing and imports, customer consultation, supplier and dealer coordination, sales negotiations, market evaluation, financing arrangements and overall business operations. Over three years the business has developed a growing vehicle and finance network with a strong focus on transparency, customer relationships and reliable end-to-end service.',
    focus: [
      'Luxury & Semi-Luxury Vehicles',
      'Brand-New & Registered Vehicle Sales',
      'Vehicle Imports & Sourcing',
      'Vehicle Procurement',
      'Registration & Documentation Support',
      'Finance Facilities & Coordination',
      'Supplier & Dealer Coordination',
      'Vehicle Consultation & Market Evaluation',
      'Sales & Negotiation',
      'Customer Relationship Management',
    ],
    highlights: [
      '3+ Years of Business Operations',
      '150+ Vehicles Sold',
      '50+ Vehicles Imported',
      '100+ Suppliers & Dealers in the Business Network',
      '400+ Vehicle Finance Arrangements Supported',
    ],
    stats: [
      { value: '150+', label: 'Vehicles sold' },
      { value: '50+', label: 'Imported' },
      { value: '100+', label: 'Suppliers & dealers' },
      { value: '400+', label: 'Finance arrangements' },
    ],
    color: '#dc2626',
  },
  {
    id: 'ceylon-trade-link',
    company: 'Ceylon Trade Link',
    role: 'Import & Export Specialist',
    duration: '3+ years',
    summary:
      'An import, export and international sourcing business connecting quality overseas products with local market demand across fragrances, cosmetics and beauty products, mobile phones and accessories, electronics, home appliances, fashion, footwear and other consumer goods.',
    contribution:
      'I manage international product sourcing, supplier communication, direct purchasing, product evaluation, pricing, order coordination, shipping, logistics and customs-related processes — building reliable sourcing channels, securing quality products at competitive prices and developing sustainable wholesale and retail trading relationships.',
    focus: [
      'International Product Sourcing',
      'Import & Export Operations',
      'Fragrances & Perfumes',
      'Cosmetics & Beauty Products',
      'Mobile Phones & Accessories',
      'Electronics & Technology Products',
      'Home Appliances',
      'Fashion, Footwear & Consumer Goods',
      'Shipping, Logistics & Customs Coordination',
      'Wholesale & Retail Trading',
    ],
    highlights: [
      '3+ Years of Import, Export & Trading Operations',
      '100+ Products Imported Across Multiple Consumer Categories',
      'Imports Covering Fragrances, Cosmetics, Mobile Phones, Electronics, Home Appliances, Fashion & Footwear',
      'Established Reliable International Supplier & Purchasing Networks',
      'Developed Multi-Category Product Sourcing Channels for Local Market Demand',
      'Coordinated International Purchasing, Shipping, Logistics & Import Processes',
      'Expanded Operations Across Both Wholesale & Retail Trading',
    ],
    stats: [
      { value: '3+', label: 'Years' },
      { value: '100+', label: 'Products imported' },
      { value: '7+', label: 'Categories' },
    ],
    color: '#0891b2',
  },
  {
    id: 'rizwan-homes',
    company: 'Rizwan Homes & Developments',
    role: 'Associate',
    duration: '7+ years',
    summary:
      'A family-established residential development business founded and led by my father, providing an end-to-end approach to creating complete homes — from identifying suitable land through architectural planning, design coordination and development to final delivery.',
    contribution:
      'As an Associate, I support land and site selection, property inspections, client consultations, requirement gathering, architectural planning coordination, project development and communication throughout the construction process — understanding each client’s requirements, lifestyle and budget.',
    focus: [
      'Land Identification & Selection',
      'Land & Site Inspections',
      'Site & Property Evaluation',
      'Client Requirement Consultation',
      'Architectural Planning Coordination',
      'Residential Design & Planning',
      'Complete Home Development',
      'Construction & Project Coordination',
      'Residential Development Support',
      'Completed Home Delivery',
    ],
    highlights: [
      '7+ Years of Residential Development Operations',
      '50+ Residential Projects Completed',
      '50+ Houses Developed & Delivered',
      '100+ Land & Site Inspections Conducted',
      'Supported End-to-End Projects from Land Selection to Completed Home Delivery',
      'Projects & Services Delivered Across Multiple Districts',
    ],
    stats: [
      { value: '7+', label: 'Years' },
      { value: '50+', label: 'Projects completed' },
      { value: '50+', label: 'Houses delivered' },
      { value: '100+', label: 'Site inspections' },
    ],
    color: '#16a34a',
  },
];

/** Summary entry exactly as it appears on the CV. */
export const cvBusinessRole = {
  title: 'Business Owner — Technology Retail & Business Operations',
  org: 'Mobile Device Retail & Vehicle Sales — Kandy, Sri Lanka',
  period: '2022 – Present',
  bullets: [
    'Provide technical consultation on mobile devices by evaluating hardware, operating systems, software features, specifications, compatibility and performance to translate customer requirements into informed product recommendations.',
    'Analyse product, pricing, inventory and supplier data while applying requirements analysis and technical problem-solving to support purchasing decisions and efficient business operations.',
    'Manage digital marketing, customer enquiries, negotiations, sales coordination and after-sales support across mobile device retail and vehicle sales, serving more than 200 customers through direct and social media channels.',
  ],
};

/* ───────────────────────────── Leadership ───────────────────────────── */

export const leadership: { role: string; org: string; period: string }[] = [
  { role: 'Batch Representative', org: 'SLIIT Kandy UNI', period: '2024 – 2025' },
  { role: 'Member, Student Interactive Society (SIS)', org: 'SLIIT Kandy UNI', period: '2024 – 2025' },
  { role: 'Member, AIESEC', org: 'SLIIT Kandy UNI', period: '2024 – 2025' },
  { role: 'Member — School Media Unit, Interact Club & Rotaract Club', org: 'Zahira College', period: '2016 – 2020' },
  { role: 'Cadet Sergeant', org: 'Zahira College, Gampola', period: '2017 – 2020' },
  { role: 'School Sports Representative — Cricket, Football, Badminton & Rugby', org: 'Zahira College', period: '2015 – 2020' },
];

export const spokenLanguages = [
  { name: 'English', level: 'Professional Working Proficiency' },
  { name: 'Sinhala', level: 'Professional Working Proficiency' },
  { name: 'Tamil', level: 'Professional Working Proficiency' },
];

/** All distinct technologies across the skills notes — used by the Terminal. */
export const allSkills = Array.from(new Set(skillNotes.filter((n) => !['about', 'soft', 'languages'].includes(n.id)).flatMap((n) => n.tags)));

/* ───────────────────────────── Experience browser ───────────────────────────── */

export type ExperienceCategory = 'Entrepreneurial' | 'Technology' | 'Business' | 'Leadership' | 'University';

export interface ExperienceEntry {
  id: string;
  title: string;
  org: string;
  role: string;
  period: string;
  categories: ExperienceCategory[];
  color: string;
  overview: string;
  responsibilities: string[];
  operations: string[];
  skills: string[];
  highlights: string[];
  stats: { value: string; label: string }[];
}

const sentences = (t: string) =>
  t
    .split(/(?<=\.)\s+/)
    .map((x) => x.trim())
    .filter(Boolean);

/** Skills developed — taken directly from the wording of each supplied experience. */
const ventureSkills: Record<string, string[]> = {
  'mobile-kingdom': ['Product sourcing', 'Imports', 'Pricing strategy', 'Customer consultation', 'Online & social-media promotion', 'After-sales support', 'Technology market research', 'Wholesale & retail sales'],
  tasco: ['Vehicle sourcing & imports', 'Sales negotiation', 'Market evaluation', 'Finance coordination', 'Supplier & dealer relations', 'Customer relationship management', 'Business operations'],
  'ceylon-trade-link': ['International sourcing', 'Supplier communication', 'Product evaluation', 'Pricing', 'Shipping & logistics', 'Customs coordination', 'Wholesale & retail trading'],
  'rizwan-homes': ['Site & property evaluation', 'Client consultation', 'Requirements gathering', 'Architectural planning coordination', 'Project coordination', 'Client communication'],
};

export const experience: ExperienceEntry[] = [
  ...ventures.map<ExperienceEntry>((v) => ({
    id: v.id,
    title: v.company,
    org: v.company,
    role: v.role,
    period: v.duration,
    categories: v.id === 'mobile-kingdom' ? ['Entrepreneurial', 'Technology', 'Business'] : v.id === 'rizwan-homes' ? ['Business'] : ['Entrepreneurial', 'Business'],
    color: v.color,
    overview: v.summary,
    responsibilities: sentences(v.contribution),
    operations: v.focus,
    skills: ventureSkills[v.id] ?? [],
    highlights: v.highlights,
    stats: v.stats,
  })),
  {
    id: 'cv-business',
    title: 'Business Owner',
    org: 'Technology Retail & Business Operations — Mobile Device Retail & Vehicle Sales, Kandy',
    role: 'Business Owner',
    period: cvBusinessRole.period,
    categories: ['Entrepreneurial', 'Technology'],
    color: '#6b7280',
    overview: 'Summary of my entrepreneurial technology-retail and vehicle-sales work, as described on my CV.',
    responsibilities: cvBusinessRole.bullets,
    operations: ['Technical consultation on mobile devices', 'Product, pricing, inventory & supplier analysis', 'Digital marketing', 'Customer enquiries & negotiations', 'Sales coordination', 'After-sales support'],
    skills: ['Requirements analysis', 'Technical problem-solving', 'Digital marketing', 'Negotiation', 'Client communication'],
    highlights: ['Served more than 200 customers through direct and social-media channels (CV)'],
    stats: [{ value: '200+', label: 'Customers (CV)' }],
  },
  ...leadership.map<ExperienceEntry>((l, i) => ({
    id: `lead-${i}`,
    title: l.role.split(' — ')[0].replace(/^Member, /, ''),
    org: l.org,
    role: l.role,
    period: l.period,
    categories: l.org.includes('SLIIT') ? ['Leadership', 'University'] : ['Leadership'],
    color: l.org.includes('SLIIT') ? '#1d4ed8' : '#b45309',
    overview: `${l.role} at ${l.org} (${l.period}).`,
    responsibilities: [],
    operations: [],
    skills: [],
    highlights: [],
    stats: [],
  })),
];

/* ───────────────────────────── Timeline (real dates only) ───────────────────────────── */

export interface TimelineEntry {
  /** YYYY or YYYY-MM */
  start: string;
  end?: string | 'present';
  title: string;
  detail: string;
  kind: 'Education' | 'Project' | 'Leadership' | 'Business';
}

export const timeline: TimelineEntry[] = [
  { start: '2026-09', title: 'FreshMart Website', detail: 'HTML · CSS · JavaScript grocery e-commerce', kind: 'Project' },
  { start: '2026-07', end: 'present', title: 'High Street Car Sale — full-stack marketplace', detail: 'Node.js · Express · MySQL · JWT', kind: 'Project' },
  { start: '2026-07', end: 'present', title: 'HealthForge Fitness', detail: 'PHP · MySQL · admin dashboard & security assessment', kind: 'Project' },
  { start: '2026-02', end: '2026-06', title: 'Student Expense Tracker', detail: 'Android · Java · SQLite · MPAndroidChart', kind: 'Project' },
  { start: '2025-07', end: '2025-12', title: 'MediCarePlus', detail: 'Java Swing patient management', kind: 'Project' },
  { start: '2025-07', end: '2025-12', title: 'NDI Registration System', detail: 'Node.js · Express · MongoDB REST API', kind: 'Project' },
  { start: '2025', end: 'present', title: 'BSc (Hons) Computer Science', detail: 'SLIIT City Uni — awarded by the University of Bedfordshire', kind: 'Education' },
  { start: '2024', end: '2025', title: 'Batch Representative', detail: 'SLIIT Kandy UNI · also SIS & AIESEC member', kind: 'Leadership' },
  { start: '2022', end: 'present', title: 'Business Owner — technology retail & vehicle sales', detail: 'Kandy, Sri Lanka', kind: 'Business' },
  { start: '2021', title: 'GCE Advanced Level — Commerce', detail: 'Zahira College, Gampola', kind: 'Education' },
  { start: '2019-07', end: '2019-08', title: 'Diploma in English', detail: 'ESOFT Metro Campus, Kandy', kind: 'Education' },
  { start: '2019-01', end: '2019-08', title: 'Diploma in Information Technology', detail: 'ESOFT Metro Campus, Kandy', kind: 'Education' },
  { start: '2018', title: 'GCE Ordinary Level', detail: 'Zahira College, Gampola', kind: 'Education' },
  { start: '2017', end: '2020', title: 'Cadet Sergeant', detail: 'Zahira College, Gampola', kind: 'Leadership' },
];

/* ───────────────────────────── Skill evidence ───────────────────────────── */

const ALIASES: Record<string, string[]> = {
  'node.js': ['node.js'],
  'express.js': ['express.js', 'express'],
  mongodb: ['mongodb', 'mongoose'],
  html: ['html', 'html5'],
  css: ['css', 'css3'],
  'android studio': ['android studio', 'android sdk'],
  'android sdk': ['android sdk', 'android studio'],
  'java swing': ['java swing'],
  'restful apis': ['restful api', 'rest', 'restful apis'],
  jwt: ['jwt', 'express-oauth2-jwt-bearer'],
  'role-based access control': ['role-based access control', 'role-based login'],
  bootstrap: ['bootstrap', 'bootstrap 5'],
  git: ['git'],
  github: ['github'],
};

/** Projects whose verified stack uses the given technology. */
export function projectsUsing(skill: string): Project[] {
  const key = skill.toLowerCase();
  const names = ALIASES[key] ?? [key];
  return projects.filter((p) => {
    const all = Object.values(p.stack)
      .flat()
      .map((x) => (x as string).toLowerCase());
    return all.some((x) => names.some((n) => x === n || x.startsWith(`${n} `) || x.startsWith(`${n} (`)));
  });
}
