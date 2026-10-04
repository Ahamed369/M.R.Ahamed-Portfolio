/**
 * v10.3 — Learning Hub content: short study guides with links to well-known,
 * free external resources, plus a short multiple-choice quiz for every topic.
 * External resources belong to their owners and are clearly marked as
 * external. Everything here is general guidance — nothing claims a personal
 * qualification of the portfolio owner.
 */
export interface Resource {
  title: string;
  url: string;
  by: string;
  kind: 'Docs' | 'Tutorial' | 'Course' | 'Video' | 'Reference' | 'Guide';
}
export interface QuizQ {
  /** question */
  q: string;
  /** answer options */
  a: string[];
  /** index of the correct option */
  c: number;
  /** short explanation shown after answering */
  why: string;
}
/** Apps inside the portfolio a topic can link to. */
export type AppLink = 'flashcards' | 'playground' | 'focusplanner' | 'bizplanner' | 'goals';
export interface Topic {
  id: string;
  title: string;
  summary: string;
  points: string[];
  resources: Resource[];
  /** related portfolio projects (ids from data/portfolio) by technology keyword */
  tech?: string[];
  /** short multiple-choice quiz (3–5 questions) */
  quiz: QuizQ[];
  /** related apps in this portfolio */
  apps: AppLink[];
}
export type SectionId = 'it' | 'english' | 'business' | 'study' | 'career' | 'productivity';
export interface Section {
  id: SectionId;
  title: string;
  topics: Topic[];
}

type RawTopic = Omit<Topic, 'quiz' | 'apps'> & { apps?: AppLink[] };

const W3 = 'W3Schools';
const MDN = 'MDN Web Docs';
const BC = 'British Council';
const NCS = 'National Careers Service (UK)';
const LSC = 'Cornell Learning Strategies Center';

const BC_LE = { title: 'LearnEnglish', url: 'https://learnenglish.britishcouncil.org/', by: BC, kind: 'Course' } as const;
const BBC_LE = { title: 'BBC Learning English', url: 'https://www.bbc.co.uk/learningenglish', by: 'BBC', kind: 'Course' } as const;
const CAM_DICT = { title: 'Cambridge Dictionary', url: 'https://dictionary.cambridge.org/', by: 'Cambridge University Press', kind: 'Reference' } as const;
const LHTL = { title: 'Learning How to Learn', url: 'https://www.coursera.org/learn/learning-how-to-learn', by: 'Coursera (free to audit)', kind: 'Course' } as const;
const SIX = { title: 'Six strategies for effective learning', url: 'https://www.learningscientists.org/downloadable-materials', by: 'The Learning Scientists', kind: 'Guide' } as const;
const YC_SS = { title: 'Startup School', url: 'https://www.startupschool.org/', by: 'Y Combinator', kind: 'Course' } as const;
const YC_LIB = { title: 'YC Startup Library', url: 'https://www.ycombinator.com/library', by: 'Y Combinator', kind: 'Guide' } as const;
const SCORE = { title: 'Free business mentoring & workshops', url: 'https://www.score.org/', by: 'SCORE', kind: 'Guide' } as const;
const SBA_MANAGE = { title: 'Manage your business', url: 'https://www.sba.gov/business-guide/manage-your-business', by: 'U.S. Small Business Administration', kind: 'Guide' } as const;
const KHAN_FIN = { title: 'Accounting and financial statements', url: 'https://www.khanacademy.org/economics-finance-domain/core-finance/accounting-and-financial-stateme', by: 'Khan Academy', kind: 'Course' } as const;
const TODOIST = { title: 'Productivity methods', url: 'https://todoist.com/productivity-methods', by: 'Todoist', kind: 'Guide' } as const;

const RAW: { id: SectionId; title: string; topics: RawTopic[] }[] = [
  {
    id: 'it',
    title: 'IT & Programming',
    topics: [
      { id: 'fundamentals', title: 'Programming Fundamentals', summary: 'Variables, control flow, functions and how to break a problem into steps.', points: ['Start with small programs and read the error messages carefully.', 'Learn one language well before switching.', 'Practise every day — short, regular sessions beat long ones.'], resources: [{ title: 'CS50x: Introduction to Computer Science', url: 'https://cs50.harvard.edu/x/', by: 'Harvard University', kind: 'Course' }, { title: 'freeCodeCamp curriculum', url: 'https://www.freecodecamp.org/learn', by: 'freeCodeCamp', kind: 'Course' }] },
      { id: 'java', title: 'Java', summary: 'A typed, object-oriented language used for back-ends, Android and university coursework.', points: ['Understand classes, objects and interfaces early.', 'Use an IDE (IntelliJ IDEA, Eclipse or VS Code) and its debugger.', 'Read the standard library documentation for collections.'], resources: [{ title: 'Java Tutorial', url: 'https://www.w3schools.com/java/', by: W3, kind: 'Tutorial' }, { title: 'Learn Java', url: 'https://dev.java/learn/', by: 'Oracle (dev.java)', kind: 'Docs' }], tech: ['Java'] },
      { id: 'javascript', title: 'JavaScript', summary: 'The language of the web — runs in every browser and on servers with Node.js.', points: ['Learn the DOM, events and fetch.', 'Understand promises and async / await.', 'Use the browser developer tools constantly.'], resources: [{ title: 'JavaScript Guide', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide', by: MDN, kind: 'Docs' }, { title: 'JavaScript Tutorial', url: 'https://www.w3schools.com/js/', by: W3, kind: 'Tutorial' }], tech: ['JavaScript'], apps: ['flashcards', 'playground'] },
      { id: 'python', title: 'Python', summary: 'A readable language for scripting, data, automation and back-ends.', points: ['Use virtual environments for each project.', 'Learn lists, dictionaries and comprehensions.', 'Read the official tutorial end to end once.'], resources: [{ title: 'The Python Tutorial', url: 'https://docs.python.org/3/tutorial/', by: 'Python Software Foundation', kind: 'Docs' }, { title: 'Python Tutorial', url: 'https://www.w3schools.com/python/', by: W3, kind: 'Tutorial' }], tech: ['Python'] },
      { id: 'cpp', title: 'C++', summary: 'A fast, low-level language used in systems, games and competitive programming.', points: ['Understand memory, pointers and references.', 'Prefer the standard library (vector, string, map).', 'Compile with warnings switched on.'], resources: [{ title: 'Learn C++', url: 'https://www.learncpp.com/', by: 'LearnCpp.com', kind: 'Tutorial' }, { title: 'C++ Tutorial', url: 'https://www.w3schools.com/cpp/', by: W3, kind: 'Tutorial' }] },
      { id: 'html', title: 'HTML', summary: 'The structure of every web page.', points: ['Use semantic elements (header, nav, main, article).', 'Every image needs meaningful alt text.', 'Validate forms with built-in attributes first.'], resources: [{ title: 'HTML basics', url: 'https://developer.mozilla.org/en-US/docs/Learn/HTML', by: MDN, kind: 'Docs' }, { title: 'HTML Tutorial', url: 'https://www.w3schools.com/html/', by: W3, kind: 'Tutorial' }], tech: ['HTML'], apps: ['flashcards', 'playground'] },
      { id: 'css', title: 'CSS', summary: 'Layout, colour and typography for the web.', points: ['Master Flexbox and Grid.', 'Design mobile-first with media queries.', 'Keep a small set of colours and spacing values.'], resources: [{ title: 'Learn CSS', url: 'https://developer.mozilla.org/en-US/docs/Learn/CSS', by: MDN, kind: 'Docs' }, { title: 'CSS Tutorial', url: 'https://www.w3schools.com/css/', by: W3, kind: 'Tutorial' }], tech: ['CSS'], apps: ['flashcards', 'playground'] },
      { id: 'react', title: 'React', summary: 'A library for building interfaces from components.', points: ['Think in components and props.', 'Keep state as small as possible and lift it up when shared.', 'Learn the rules of hooks.'], resources: [{ title: 'Learn React', url: 'https://react.dev/learn', by: 'react.dev', kind: 'Docs' }], tech: ['React'] },
      { id: 'node', title: 'Node.js', summary: 'JavaScript on the server: APIs, tools and scripts.', points: ['Learn modules and npm.', 'Handle errors in async code.', 'Never commit secrets — use environment variables.'], resources: [{ title: 'Learn Node.js', url: 'https://nodejs.org/en/learn', by: 'Node.js', kind: 'Docs' }], tech: ['Node.js'] },
      { id: 'sql', title: 'SQL & MySQL', summary: 'Querying and designing relational databases.', points: ['Learn SELECT, JOIN and GROUP BY well.', 'Normalise tables, then add indexes for slow queries.', 'Always use parameterised queries.'], resources: [{ title: 'SQL Tutorial', url: 'https://www.w3schools.com/sql/', by: W3, kind: 'Tutorial' }, { title: 'MySQL Documentation', url: 'https://dev.mysql.com/doc/', by: 'Oracle MySQL', kind: 'Docs' }], tech: ['MySQL', 'SQL'] },
      { id: 'mongodb', title: 'MongoDB', summary: 'A document database that stores JSON-like records.', points: ['Model data around how it is read.', 'Use indexes for frequent queries.', 'Validate documents with a schema.'], resources: [{ title: 'MongoDB Documentation', url: 'https://www.mongodb.com/docs/', by: 'MongoDB', kind: 'Docs' }], tech: ['MongoDB'] },
      { id: 'oop', title: 'Object-Oriented Programming', summary: 'Encapsulation, inheritance, polymorphism and abstraction.', points: ['Prefer composition over deep inheritance.', 'Keep classes small with one responsibility.', 'Program to interfaces.'], resources: [{ title: 'Java OOP', url: 'https://www.w3schools.com/java/java_oop.asp', by: W3, kind: 'Tutorial' }] },
      { id: 'dsa', title: 'Data Structures & Algorithms', summary: 'Arrays, lists, trees, graphs, sorting and searching — and their costs.', points: ['Learn Big-O notation first.', 'Implement each structure yourself once.', 'Practise problems regularly.'], resources: [{ title: 'Algorithms', url: 'https://www.khanacademy.org/computing/computer-science/algorithms', by: 'Khan Academy', kind: 'Course' }] },
      { id: 'se', title: 'Software Engineering', summary: 'Requirements, design, version control, testing and teamwork.', points: ['Write things down: requirements and decisions.', 'Small pull requests, reviewed by someone else.', 'Automate tests and builds.'], resources: [{ title: 'Developer roadmaps', url: 'https://roadmap.sh/', by: 'roadmap.sh', kind: 'Guide' }] },
      { id: 'web', title: 'Web Development', summary: 'Front-end, back-end and how they talk over HTTP.', points: ['Build complete small projects end to end.', 'Learn HTTP methods and status codes.', 'Deploy early and often.'], resources: [{ title: 'Learn web development', url: 'https://developer.mozilla.org/en-US/docs/Learn', by: MDN, kind: 'Docs' }, { title: 'Responsive Web Design', url: 'https://www.freecodecamp.org/learn', by: 'freeCodeCamp', kind: 'Course' }], apps: ['flashcards', 'playground'] },
      { id: 'mobile', title: 'Mobile Development', summary: 'Native and cross-platform apps for phones.', points: ['Design for touch and small screens first.', 'Respect safe areas and accessibility settings.', 'Test on real devices.'], resources: [{ title: 'Android developer courses', url: 'https://developer.android.com/courses', by: 'Android Developers', kind: 'Course' }, { title: 'React Native — Get started', url: 'https://reactnative.dev/docs/getting-started', by: 'React Native', kind: 'Docs' }] },
      { id: 'networking', title: 'Networking', summary: 'How data moves: IP, DNS, TCP, HTTP and TLS.', points: ['Learn the layers and what each does.', 'Use ping, traceroute and the browser network tab.', 'Understand what DNS does when a site loads.'], resources: [{ title: 'Learning Center', url: 'https://www.cloudflare.com/learning/', by: 'Cloudflare', kind: 'Guide' }] },
      { id: 'security', title: 'Cybersecurity', summary: 'Protecting systems, data and users.', points: ['Know the OWASP Top 10.', 'Hash passwords; never store them in plain text.', 'Keep dependencies updated.'], resources: [{ title: 'OWASP Top 10', url: 'https://owasp.org/www-project-top-ten/', by: 'OWASP', kind: 'Reference' }, { title: 'What is cybersecurity?', url: 'https://www.cloudflare.com/learning/security/what-is-cyber-security/', by: 'Cloudflare', kind: 'Guide' }] },
      { id: 'git', title: 'Git & GitHub', summary: 'Version control and collaboration.', points: ['Commit small, with clear messages.', 'Use branches and pull requests.', 'Write a README for every project.'], resources: [{ title: 'Pro Git (book)', url: 'https://git-scm.com/book/en/v2', by: 'git-scm.com', kind: 'Docs' }, { title: 'Get started with GitHub', url: 'https://docs.github.com/en/get-started', by: 'GitHub Docs', kind: 'Docs' }] },
      { id: 'apis', title: 'APIs', summary: 'How programs talk to each other — REST, JSON and authentication.', points: ['Learn HTTP methods, headers and status codes.', 'Document your endpoints.', 'Keep API keys on the server.'], resources: [{ title: 'HTTP', url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP', by: MDN, kind: 'Docs' }] },
      { id: 'testing', title: 'Testing', summary: 'Unit, integration and end-to-end tests.', points: ['Test behaviour, not implementation details.', 'Run tests automatically on every change.', 'Write a failing test before fixing a bug.'], resources: [{ title: 'Jest — Getting Started', url: 'https://jestjs.io/docs/getting-started', by: 'Jest', kind: 'Docs' }, { title: 'Playwright — Intro', url: 'https://playwright.dev/docs/intro', by: 'Playwright', kind: 'Docs' }] },
    ],
  },
  {
    id: 'english',
    title: 'English',
    topics: [
      { id: 'english-skills', title: 'Everyday & Professional English', summary: 'Listening, speaking, reading and writing for study and work.', points: ['Listen to short English programmes daily.', 'Keep a vocabulary notebook with example sentences.', 'Practise writing short emails and summaries.'], resources: [BC_LE, BBC_LE, CAM_DICT] },
      {
        id: 'en-grammar',
        title: 'Grammar Essentials',
        summary: 'The core patterns — tenses, articles, prepositions and sentence structure — that make English clear.',
        points: [
          'Master the main tenses first: present simple, present continuous, past simple and present perfect.',
          'Use the present perfect for past actions connected to now ("I have finished the report").',
          'Learn article rules: "a/an" for something new or one of many, "the" for something specific or already known.',
          'Keep subject–verb agreement: "She works", "They work", "The list of items is long".',
          'Learn prepositions in phrases ("interested in", "good at", "depend on") rather than one by one.',
          'Write short sentences with one main idea; join ideas with "and", "but", "because", "so".',
          'Read your writing aloud — many grammar mistakes are easier to hear than to see.',
        ],
        resources: [
          { title: 'English grammar lessons', url: 'https://learnenglish.britishcouncil.org/grammar', by: BC, kind: 'Course' },
          { title: 'English grammar today', url: 'https://dictionary.cambridge.org/grammar/british-grammar/', by: 'Cambridge Dictionary', kind: 'Reference' },
          BBC_LE,
        ],
      },
      {
        id: 'en-vocab',
        title: 'Building Vocabulary',
        summary: 'Learning words in context so you can understand them and use them naturally.',
        points: [
          'Learn words in phrases and collocations ("make a decision", "take responsibility"), not alone.',
          'Write one example sentence of your own for each new word.',
          'Review new words after one day, three days and one week (spaced repetition).',
          'Read and listen to material slightly above your level, every day.',
          'Use a learner’s dictionary to check meaning, pronunciation and example sentences.',
          'Group words by topic (work, technology, travel) to remember them more easily.',
          'Use new words in speaking or writing within 48 hours.',
        ],
        resources: [
          { title: 'Vocabulary lessons', url: 'https://learnenglish.britishcouncil.org/vocabulary', by: BC, kind: 'Course' },
          CAM_DICT,
          BBC_LE,
        ],
        apps: ['flashcards'],
      },
      {
        id: 'en-email',
        title: 'Professional Emails',
        summary: 'Writing clear, polite emails that get a quick, useful reply.',
        points: [
          'Write a specific subject line ("Meeting notes — 12 March" not "Hi").',
          'Open with the purpose in the first sentence.',
          'Keep paragraphs short; use bullet points for several questions or steps.',
          'Say exactly what you need and by when ("Could you send the file by Friday?").',
          'Match the formality to the reader: "Dear Ms Perera" for formal, "Hi Sam" for colleagues.',
          'Close politely ("Kind regards", "Best wishes") with your full name and role.',
          'Re-read before sending: check names, attachments, dates and tone.',
        ],
        resources: [
          { title: 'How to write a professional email', url: 'https://www.indeed.com/career-advice/career-development/how-to-write-a-professional-email', by: 'Indeed Career Guide', kind: 'Guide' },
          { title: 'Business English', url: 'https://learnenglish.britishcouncil.org/business-english', by: BC, kind: 'Course' },
          { title: 'Writing skills practice', url: 'https://learnenglish.britishcouncil.org/skills/writing', by: BC, kind: 'Course' },
        ],
      },
      {
        id: 'en-present',
        title: 'Presentations & Public Speaking',
        summary: 'Structuring a talk and delivering it with confidence.',
        points: [
          'Start with your key message — what should the audience remember?',
          'Use a simple structure: introduction, three main points, summary.',
          'Signpost clearly: "First…", "Moving on to…", "To sum up…".',
          'Put few words on slides; say the detail out loud.',
          'Rehearse aloud at least three times, and time yourself.',
          'Speak slowly, pause after important points and look at the audience.',
          'Prepare for likely questions; it is fine to say "Let me check and get back to you."',
        ],
        resources: [
          { title: 'Introduction to Public Speaking', url: 'https://www.coursera.org/learn/public-speaking', by: 'University of Washington on Coursera (free to audit)', kind: 'Course' },
          { title: 'Speaking skills practice', url: 'https://learnenglish.britishcouncil.org/skills/speaking', by: BC, kind: 'Course' },
          { title: 'Business English', url: 'https://learnenglish.britishcouncil.org/business-english', by: BC, kind: 'Course' },
        ],
      },
      {
        id: 'en-interview',
        title: 'Interview English',
        summary: 'Useful language to introduce yourself, describe experience and answer questions clearly.',
        points: [
          'Prepare a 60-second answer to "Tell me about yourself": present, past, future.',
          'Use the past simple for finished experiences: "I built…", "I led…".',
          'Use the STAR structure: Situation, Task, Action, Result.',
          'Use "I" for your own actions, even when you worked in a team.',
          'Ask for clarification politely: "Could you repeat the question, please?"',
          'Prepare two or three questions to ask at the end.',
          'Practise aloud and record yourself to check clarity and speed.',
        ],
        resources: [
          { title: 'The STAR method', url: 'https://nationalcareers.service.gov.uk/careers-advice/interview-advice/the-star-method', by: NCS, kind: 'Guide' },
          { title: 'Business English', url: 'https://learnenglish.britishcouncil.org/business-english', by: BC, kind: 'Course' },
          BBC_LE,
        ],
      },
    ],
  },
  {
    id: 'business',
    title: 'Entrepreneurship',
    topics: [
      { id: 'startup', title: 'Starting a Business', summary: 'Finding a real problem, testing ideas and talking to customers.', points: ['Talk to customers before building.', 'Start with the smallest version that solves the problem.', 'Track a few honest numbers every week.'], resources: [YC_SS, { title: 'Harvard Business Review', url: 'https://hbr.org/', by: 'HBR', kind: 'Guide' }], apps: ['bizplanner'] },
      {
        id: 'biz-test',
        title: 'Testing Ideas',
        summary: 'Checking that a real problem and real demand exist before spending time and money.',
        points: [
          'Write the problem, the customer and your assumption in one sentence each.',
          'Interview potential customers about their past behaviour, not about your idea.',
          'Ask "When did this last happen? What did you do?" rather than "Would you buy this?"',
          'Build the smallest test possible: a landing page, a manual service or a prototype.',
          'Decide in advance what result counts as success (e.g. 10 sign-ups from 100 visitors).',
          'Treat pre-orders or payments as stronger evidence than compliments.',
          'Change one thing at a time and record what you learn.',
        ],
        resources: [YC_SS, YC_LIB, { title: 'Value Proposition Canvas', url: 'https://www.strategyzer.com/library/the-value-proposition-canvas', by: 'Strategyzer', kind: 'Guide' }],
        apps: ['bizplanner'],
      },
      {
        id: 'biz-bmc',
        title: 'Business Model Canvas',
        summary: 'A one-page map of how a business creates, delivers and captures value.',
        points: [
          'The canvas has nine blocks: Customer Segments, Value Propositions, Channels, Customer Relationships, Revenue Streams, Key Resources, Key Activities, Key Partners, Cost Structure.',
          'Start with customer segments and the value proposition — the rest depends on them.',
          'Use short sticky-note phrases, not long paragraphs.',
          'Each block is a hypothesis to test, not a fact.',
          'Make one canvas per business model idea so you can compare options.',
          'Revisit the canvas after customer interviews and update it.',
        ],
        resources: [
          { title: 'The Business Model Canvas', url: 'https://www.strategyzer.com/library/the-business-model-canvas', by: 'Strategyzer', kind: 'Guide' },
          { title: 'New Enterprises (course materials)', url: 'https://ocw.mit.edu/courses/15-390-new-enterprises-spring-2013/', by: 'MIT OpenCourseWare', kind: 'Course' },
        ],
        apps: ['bizplanner'],
      },
      {
        id: 'biz-pricing',
        title: 'Pricing',
        summary: 'Setting a price that covers costs, reflects value and fits the market.',
        points: [
          'Know your full cost per unit, including your own time and overheads.',
          'Cost-plus pricing adds a margin to cost; value-based pricing starts from what the customer gains.',
          'Look at what customers pay today for alternatives, including doing nothing.',
          'Avoid competing on price alone — small businesses rarely win a price war.',
          'Offer two or three clear packages rather than many confusing options.',
          'Test price changes with new customers first and watch conversion.',
          'Review prices at least once a year as costs change.',
        ],
        resources: [SCORE, YC_LIB, SBA_MANAGE],
        apps: ['bizplanner'],
      },
      {
        id: 'biz-marketing',
        title: 'Marketing Basics',
        summary: 'Reaching the right customers with a clear message through the right channels.',
        points: [
          'Define one target customer clearly before choosing channels.',
          'Write a one-sentence message: who it is for, the problem, the benefit.',
          'Pick one or two channels your customers already use and do them well.',
          'Use simple customer stories and before/after examples as proof.',
          'Track where customers come from and the cost of winning each one.',
          'Ask happy customers for reviews and referrals.',
          'Keep a consistent name, tone and look across every channel.',
        ],
        resources: [
          { title: 'Free marketing courses', url: 'https://academy.hubspot.com/', by: 'HubSpot Academy', kind: 'Course' },
          SBA_MANAGE,
          SCORE,
        ],
      },
      {
        id: 'biz-finance',
        title: 'Simple Finance for Small Businesses',
        summary: 'Tracking money in and out so you can make decisions and stay solvent.',
        points: [
          'Keep business and personal money in separate accounts.',
          'Record every sale and expense weekly — a simple spreadsheet is enough to start.',
          'Profit = revenue − costs; cash flow is the timing of money in and out. You need both.',
          'Know your break-even point: fixed costs ÷ (price − variable cost per unit).',
          'Keep a cash buffer for a few months of fixed costs.',
          'Send invoices promptly and follow up on late payments.',
          'Set money aside for taxes as you earn, not at the end of the year.',
        ],
        resources: [KHAN_FIN, SBA_MANAGE, SCORE],
        apps: ['bizplanner'],
      },
    ],
  },
  {
    id: 'study',
    title: 'Study Skills',
    topics: [
      { id: 'learning', title: 'Learning How to Learn', summary: 'Techniques that make study time count.', points: ['Use active recall instead of re-reading.', 'Space your revision over days.', 'Teach the idea to someone else.'], resources: [LHTL, { title: 'Khan Academy', url: 'https://www.khanacademy.org/', by: 'Khan Academy', kind: 'Course' }], apps: ['flashcards'] },
      {
        id: 'study-notes',
        title: 'Note-taking',
        summary: 'Capturing ideas in a way that helps you understand and review later.',
        points: [
          'Write ideas in your own words — do not copy everything.',
          'Try the Cornell method: notes on the right, cue questions on the left, a summary at the bottom.',
          'Use headings, short bullets and arrows to show links between ideas.',
          'Leave space to add details and corrections later.',
          'Review and tidy your notes within 24 hours.',
          'Turn key points into questions you can test yourself with.',
        ],
        resources: [
          { title: 'The Cornell note-taking system', url: 'https://lsc.cornell.edu/how-to-study/taking-notes/cornell-note-taking-system/', by: LSC, kind: 'Guide' },
          LHTL,
        ],
        apps: ['flashcards'],
      },
      {
        id: 'study-exams',
        title: 'Exam Preparation',
        summary: 'Planning revision and practising the way you will be tested.',
        points: [
          'Start revising weeks before, with a written plan per subject.',
          'Use past papers and practice questions under timed conditions.',
          'Test yourself (retrieval practice) rather than re-reading notes.',
          'Mix topics in one session (interleaving) to improve problem solving.',
          'Find weak areas from your mistakes and revisit them first.',
          'Sleep well before the exam — memory consolidates during sleep.',
          'In the exam, read every question carefully and plan your time.',
        ],
        resources: [
          { title: 'Studying and taking exams', url: 'https://lsc.cornell.edu/how-to-study/studying-for-and-taking-exams/', by: LSC, kind: 'Guide' },
          SIX,
          { title: 'Khan Academy', url: 'https://www.khanacademy.org/', by: 'Khan Academy', kind: 'Course' },
        ],
        apps: ['flashcards', 'focusplanner'],
      },
      {
        id: 'study-memory',
        title: 'Memory Techniques',
        summary: 'Evidence-based ways to remember more for longer.',
        points: [
          'Spaced repetition: review after a day, then a few days, then a week.',
          'Retrieval practice: close the book and recall from memory.',
          'Elaboration: explain why and how an idea works, and connect it to what you know.',
          'Dual coding: combine words with a diagram, timeline or sketch.',
          'Use concrete examples for abstract ideas.',
          'Mnemonics and acronyms help for lists and sequences.',
          'Short, regular sessions beat one long cramming session.',
        ],
        resources: [SIX, LHTL],
        apps: ['flashcards'],
      },
      {
        id: 'study-time',
        title: 'Time Planning for Students',
        summary: 'Turning deadlines into a realistic weekly study plan.',
        points: [
          'List every deadline and exam date in one calendar.',
          'Break big assignments into small tasks with their own dates.',
          'Plan study blocks at the times you focus best.',
          'Estimate how long tasks take, then add a buffer.',
          'Do the most important task first each day.',
          'Review the plan each week and adjust honestly.',
        ],
        resources: [
          { title: 'Time management', url: 'https://lsc.cornell.edu/time-management/', by: LSC, kind: 'Guide' },
          { title: 'Time blocking', url: 'https://todoist.com/productivity-methods/time-blocking', by: 'Todoist', kind: 'Guide' },
        ],
        apps: ['focusplanner', 'goals'],
      },
    ],
  },
  {
    id: 'career',
    title: 'Career Development',
    topics: [
      { id: 'portfolio', title: 'CV, Portfolio & Interviews', summary: 'Showing your work clearly and preparing for interviews.', points: ['Lead with projects and the problems they solved.', 'Keep your GitHub profile and READMEs tidy.', 'Practise explaining one project in two minutes.'], resources: [{ title: 'Setting up your GitHub profile', url: 'https://docs.github.com/en/account-and-profile', by: 'GitHub Docs', kind: 'Docs' }, { title: 'Developer roadmaps', url: 'https://roadmap.sh/', by: 'roadmap.sh', kind: 'Guide' }] },
      {
        id: 'career-cv',
        title: 'Writing a Strong CV',
        summary: 'A clear, honest one- or two-page summary that matches the job you want.',
        points: [
          'Keep it to one or two pages with clear headings.',
          'Put contact details, a short profile, experience, education and skills in a logical order.',
          'Start bullet points with action verbs ("built", "organised", "improved").',
          'Show results with numbers where honest ("reduced load time by 30%").',
          'Tailor the CV to each job using words from the job description.',
          'Use a simple layout that applicant tracking systems can read.',
          'Check spelling carefully and save as PDF unless asked otherwise.',
        ],
        resources: [
          { title: 'How to write a CV', url: 'https://nationalcareers.service.gov.uk/careers-advice/cv-sections', by: NCS, kind: 'Guide' },
          { title: 'How to make a resume', url: 'https://www.indeed.com/career-advice/resumes-cover-letters/how-to-make-a-resume-with-examples', by: 'Indeed Career Guide', kind: 'Guide' },
        ],
        apps: ['goals'],
      },
      {
        id: 'career-linkedin',
        title: 'LinkedIn Profile',
        summary: 'A professional profile that helps recruiters and contacts find and understand you.',
        points: [
          'Use a clear, friendly, professional photo.',
          'Write a headline that says what you do or want to do, not just "Student".',
          'Use the About section for a short story: skills, interests and goals.',
          'List projects, experience and education with concrete details.',
          'Add relevant skills and ask people you worked with for recommendations.',
          'Customise your public profile URL and keep information consistent with your CV.',
          'Share or comment on topics in your field now and then.',
        ],
        resources: [
          { title: 'Create a good LinkedIn profile', url: 'https://www.linkedin.com/help/linkedin/answer/112133', by: 'LinkedIn Help', kind: 'Guide' },
          { title: 'How to write a CV', url: 'https://nationalcareers.service.gov.uk/careers-advice/cv-sections', by: NCS, kind: 'Guide' },
        ],
      },
      {
        id: 'career-intern',
        title: 'Finding Internships',
        summary: 'Where to look and how to apply for work experience while you study.',
        points: [
          'Decide on two or three fields or roles you want to explore.',
          'Check your university careers service, job boards and company career pages.',
          'Start applying early — many programmes open months before they start.',
          'Tailor a short cover letter to each application.',
          'Use your network: lecturers, alumni, friends and LinkedIn contacts.',
          'Build small portfolio projects that show the skills the role needs.',
          'Track applications and follow up politely after one or two weeks.',
        ],
        resources: [
          { title: 'How to get an internship', url: 'https://www.indeed.com/career-advice/finding-a-job/how-to-get-an-internship', by: 'Indeed Career Guide', kind: 'Guide' },
          { title: 'Create a good LinkedIn profile', url: 'https://www.linkedin.com/help/linkedin/answer/112133', by: 'LinkedIn Help', kind: 'Guide' },
        ],
        apps: ['goals'],
      },
      {
        id: 'career-interview',
        title: 'Interview Preparation',
        summary: 'Researching, practising and following up so you can show your best self.',
        points: [
          'Research the organisation: what it does, its customers and recent news.',
          'Match your examples to the skills in the job description.',
          'Prepare STAR stories for teamwork, a challenge, a mistake and a success.',
          'Practise aloud with a friend or record yourself.',
          'Plan the journey or test your video setup the day before.',
          'Prepare thoughtful questions to ask the interviewer.',
          'Send a short thank-you message afterwards.',
        ],
        resources: [
          { title: 'Interview tips', url: 'https://nationalcareers.service.gov.uk/careers-advice/interview-advice', by: NCS, kind: 'Guide' },
          { title: 'How to prepare for an interview', url: 'https://www.indeed.com/career-advice/interviewing/how-to-prepare-for-an-interview', by: 'Indeed Career Guide', kind: 'Guide' },
          { title: 'The STAR method', url: 'https://nationalcareers.service.gov.uk/careers-advice/interview-advice/the-star-method', by: NCS, kind: 'Guide' },
        ],
        apps: ['flashcards'],
      },
    ],
  },
  {
    id: 'productivity',
    title: 'Productivity',
    topics: [
      { id: 'methods', title: 'Planning & Focus', summary: 'Simple methods to plan work and protect focus time.', points: ['Plan tomorrow at the end of today.', 'Work in focused blocks (try the Clock timer).', 'Keep one trusted to-do list.'], resources: [TODOIST, { title: 'What is Kanban?', url: 'https://www.atlassian.com/agile/kanban', by: 'Atlassian', kind: 'Guide' }], apps: ['focusplanner', 'goals'] },
      {
        id: 'prod-pomodoro',
        title: 'Pomodoro Technique',
        summary: 'Working in short, timed focus intervals with regular breaks.',
        points: [
          'Choose one task and set a timer for 25 minutes (one "pomodoro").',
          'Work only on that task until the timer rings.',
          'Take a short 3–5 minute break.',
          'After four pomodoros, take a longer 15–30 minute break.',
          'If a distraction comes up, note it down and return to the task.',
          'Count pomodoros to learn how long tasks really take.',
        ],
        resources: [
          { title: 'The Pomodoro Technique (creator’s site)', url: 'https://francescocirillo.com/', by: 'Francesco Cirillo', kind: 'Guide' },
          { title: 'The Pomodoro Technique', url: 'https://todoist.com/productivity-methods/pomodoro-technique', by: 'Todoist', kind: 'Guide' },
        ],
        apps: ['focusplanner'],
      },
      {
        id: 'prod-weekly',
        title: 'Weekly Planning',
        summary: 'A short weekly review that keeps goals, tasks and calendar in step.',
        points: [
          'Pick a fixed time each week (e.g. Friday afternoon or Sunday evening).',
          'Empty your inboxes and notes into one task list.',
          'Review last week: what got done, what slipped and why.',
          'Choose three most important outcomes for the coming week.',
          'Block time in your calendar for those outcomes first.',
          'Leave buffer time for the unexpected.',
          'Keep the review under 30 minutes so you actually do it.',
        ],
        resources: [
          { title: 'Time blocking', url: 'https://todoist.com/productivity-methods/time-blocking', by: 'Todoist', kind: 'Guide' },
          { title: 'Getting Things Done', url: 'https://gettingthingsdone.com/', by: 'David Allen Company', kind: 'Guide' },
          TODOIST,
        ],
        apps: ['focusplanner', 'goals'],
      },
      {
        id: 'prod-focus',
        title: 'Focus Habits',
        summary: 'Small daily habits that protect attention for deep work.',
        points: [
          'Do your hardest task first, when energy is highest ("eat the frog").',
          'Turn off notifications and put your phone in another room.',
          'Single-task — switching between tasks costs time and attention.',
          'Prepare your space and materials before you start.',
          'Use a fixed start ritual (same time, same place) to begin quickly.',
          'Take real breaks: move, drink water, look away from screens.',
          'Protect sleep; tired brains are easily distracted.',
        ],
        resources: [
          { title: 'Eat the frog', url: 'https://todoist.com/productivity-methods/eat-the-frog', by: 'Todoist', kind: 'Guide' },
          LHTL,
          TODOIST,
        ],
        apps: ['focusplanner'],
      },
    ],
  },
];

/** Short quizzes for every topic (3–5 questions, one correct answer each). */
export const QUIZZES: Record<string, QuizQ[]> = {
  fundamentals: [
    { q: 'What is a variable?', a: ['A named place that stores a value', 'A type of loop', 'An error message', 'A file on disk'], c: 0, why: 'A variable gives a name to a value so the program can read and change it.' },
    { q: 'Which structure repeats code while a condition is true?', a: ['if statement', 'while loop', 'function call', 'comment'], c: 1, why: 'A while loop keeps running its body as long as its condition stays true.' },
    { q: 'Why use functions?', a: ['They make programs slower', 'To reuse logic and break problems into steps', 'They are required for every line', 'To hide errors'], c: 1, why: 'Functions package a step so it can be named, tested and reused.' },
  ],
  java: [
    { q: 'In Java, what is a class?', a: ['A running program', 'A blueprint for objects', 'A database table', 'A loop'], c: 1, why: 'A class defines the fields and methods that its objects (instances) have.' },
    { q: 'Which method is the entry point of a Java application?', a: ['start()', 'run()', 'public static void main(String[] args)', 'init()'], c: 2, why: 'The JVM starts a program by calling main.' },
    { q: 'Which collection keeps key–value pairs?', a: ['ArrayList', 'HashMap', 'LinkedList', 'HashSet'], c: 1, why: 'HashMap stores values looked up by keys.' },
  ],
  javascript: [
    { q: 'Which keyword declares a variable that cannot be reassigned?', a: ['var', 'let', 'const', 'static'], c: 2, why: 'const prevents reassignment of the binding.' },
    { q: 'What does `await` do?', a: ['Stops the whole browser', 'Waits for a promise to settle inside an async function', 'Creates a loop', 'Declares a class'], c: 1, why: 'await pauses the async function until the promise resolves or rejects.' },
    { q: 'What is the DOM?', a: ['A database', 'The browser’s tree of page elements', 'A CSS framework', 'A JavaScript version'], c: 1, why: 'The Document Object Model represents the page so scripts can read and change it.' },
    { q: 'What does `===` compare?', a: ['Only values, converting types', 'Value and type, without conversion', 'Memory size', 'String length'], c: 1, why: 'Strict equality does not convert types, so 1 === "1" is false.' },
  ],
  python: [
    { q: 'How does Python mark a code block?', a: ['Curly braces', 'Indentation', 'Semicolons', 'BEGIN/END'], c: 1, why: 'Python uses indentation to define blocks.' },
    { q: 'Which type stores key–value pairs?', a: ['list', 'tuple', 'dict', 'set'], c: 2, why: 'A dict maps keys to values.' },
    { q: 'Why use a virtual environment?', a: ['To make code run faster', 'To keep each project’s packages separate', 'To hide source code', 'It is required to print'], c: 1, why: 'Virtual environments isolate dependencies per project.' },
  ],
  cpp: [
    { q: 'What does a pointer store?', a: ['A memory address', 'A file name', 'A loop count', 'A class name'], c: 0, why: 'A pointer holds the address of another value in memory.' },
    { q: 'Which standard container is a resizable array?', a: ['std::map', 'std::vector', 'std::set', 'std::pair'], c: 1, why: 'std::vector grows as you add elements.' },
    { q: 'Why compile with warnings switched on?', a: ['To make the program bigger', 'To catch likely bugs early', 'It is the only way to compile', 'To slow down builds'], c: 1, why: 'Warnings point out suspicious code before it becomes a bug.' },
  ],
  html: [
    { q: 'Which element holds the main content of a page?', a: ['<div>', '<main>', '<span>', '<section id="main">'], c: 1, why: '<main> is the semantic element for the page’s primary content.' },
    { q: 'What is the alt attribute on images for?', a: ['Image size', 'A text alternative for screen readers and when the image fails', 'Image border', 'Lazy loading'], c: 1, why: 'alt text describes the image for people who cannot see it.' },
    { q: 'Which attribute makes a form field mandatory?', a: ['must', 'required', 'mandatory', 'validate'], c: 1, why: 'The required attribute triggers built-in browser validation.' },
  ],
  css: [
    { q: 'Which layout system is best for two-dimensional grids?', a: ['Floats', 'CSS Grid', 'Tables', 'Inline-block'], c: 1, why: 'Grid handles rows and columns together; Flexbox is one-dimensional.' },
    { q: 'What does "mobile-first" mean in CSS?', a: ['Only support phones', 'Write base styles for small screens and add media queries for larger ones', 'Use only pixels', 'Disable desktop'], c: 1, why: 'Start small, then enhance with min-width media queries.' },
    { q: 'In Flexbox, which property aligns items along the main axis?', a: ['align-items', 'justify-content', 'flex-wrap', 'gap'], c: 1, why: 'justify-content distributes items along the main axis.' },
  ],
  react: [
    { q: 'What are props?', a: ['Global variables', 'Inputs passed from a parent component', 'CSS classes', 'Database rows'], c: 1, why: 'Props are read-only inputs a parent passes to a child.' },
    { q: 'Which hook stores local component state?', a: ['useEffect', 'useState', 'useRef', 'useMemo'], c: 1, why: 'useState returns a value and a setter that triggers a re-render.' },
    { q: 'A rule of hooks is…', a: ['Call hooks inside loops', 'Call hooks only at the top level of a component', 'Call hooks in class components', 'Call hooks conditionally'], c: 1, why: 'Hooks must run in the same order every render.' },
  ],
  node: [
    { q: 'What is npm?', a: ['A database', 'The Node.js package manager', 'A web browser', 'A CSS tool'], c: 1, why: 'npm installs and manages packages.' },
    { q: 'Where should API secrets live?', a: ['In the Git repo', 'In environment variables', 'In front-end code', 'In the README'], c: 1, why: 'Environment variables keep secrets out of source control.' },
    { q: 'Node.js runs JavaScript…', a: ['Only in the browser', 'Outside the browser, e.g. on servers', 'Only on phones', 'Only in databases'], c: 1, why: 'Node.js is a JavaScript runtime for servers and tools.' },
  ],
  sql: [
    { q: 'Which clause combines rows from two tables?', a: ['GROUP BY', 'JOIN', 'ORDER BY', 'LIMIT'], c: 1, why: 'JOIN matches rows across tables on a condition.' },
    { q: 'Why use parameterised queries?', a: ['They look nicer', 'To prevent SQL injection', 'They are required for SELECT', 'To sort results'], c: 1, why: 'Parameters keep user input separate from SQL code.' },
    { q: 'What does GROUP BY do?', a: ['Deletes duplicates', 'Groups rows so aggregates like COUNT work per group', 'Sorts rows', 'Creates indexes'], c: 1, why: 'GROUP BY lets aggregate functions run per group.' },
  ],
  mongodb: [
    { q: 'MongoDB stores data as…', a: ['Rows and columns', 'JSON-like documents', 'Plain text files', 'Spreadsheets'], c: 1, why: 'MongoDB stores BSON documents in collections.' },
    { q: 'How should you model MongoDB data?', a: ['Exactly like SQL tables', 'Around how the application reads it', 'Randomly', 'One field per collection'], c: 1, why: 'Model for your most common read patterns.' },
    { q: 'What speeds up frequent queries?', a: ['Indexes', 'More collections', 'Longer field names', 'Comments'], c: 0, why: 'Indexes let the database find documents without scanning everything.' },
  ],
  oop: [
    { q: 'Encapsulation means…', a: ['Copying code', 'Keeping data and the methods that use it together and hiding internals', 'Using many files', 'Avoiding classes'], c: 1, why: 'Encapsulation protects internal state behind a clear interface.' },
    { q: 'Polymorphism lets you…', a: ['Use one interface for different types', 'Delete objects', 'Avoid methods', 'Run code faster'], c: 0, why: 'Different classes can respond to the same method call in their own way.' },
    { q: 'Why prefer composition over deep inheritance?', a: ['It is always shorter', 'It is more flexible and less tightly coupled', 'Inheritance is not allowed', 'It hides errors'], c: 1, why: 'Composing small objects avoids fragile class hierarchies.' },
  ],
  dsa: [
    { q: 'What is the time complexity of binary search on a sorted array?', a: ['O(n)', 'O(log n)', 'O(n²)', 'O(1)'], c: 1, why: 'Each step halves the search space.' },
    { q: 'Which structure is last-in, first-out?', a: ['Queue', 'Stack', 'Tree', 'Graph'], c: 1, why: 'A stack removes the most recently added item first.' },
    { q: 'Big-O notation describes…', a: ['Exact run time in seconds', 'How cost grows as input size grows', 'Memory brand', 'Code style'], c: 1, why: 'Big-O describes growth rate, not exact time.' },
  ],
  se: [
    { q: 'Why keep pull requests small?', a: ['They are easier to review and safer to merge', 'GitHub requires it', 'They run faster', 'To hide changes'], c: 0, why: 'Small changes are easier to understand and test.' },
    { q: 'What is continuous integration?', a: ['Working without breaks', 'Automatically building and testing every change', 'Merging once a year', 'Writing documentation'], c: 1, why: 'CI runs builds and tests on each change.' },
    { q: 'Requirements describe…', a: ['How the code is formatted', 'What the system must do and for whom', 'The database password', 'The office layout'], c: 1, why: 'Requirements capture needs before design and code.' },
  ],
  web: [
    { q: 'Which HTTP method typically creates a resource?', a: ['GET', 'POST', 'DELETE', 'HEAD'], c: 1, why: 'POST sends data to create something new.' },
    { q: 'Status code 404 means…', a: ['Success', 'Not found', 'Server error', 'Redirect'], c: 1, why: '404 means the requested resource was not found.' },
    { q: 'Front-end code runs…', a: ['On the database', 'In the user’s browser', 'Only on the server', 'In email'], c: 1, why: 'HTML, CSS and browser JavaScript run on the client.' },
  ],
  mobile: [
    { q: 'What are "safe areas"?', a: ['Secure servers', 'Screen regions not covered by notches or system bars', 'Encrypted files', 'App store rules'], c: 1, why: 'Content inside safe areas is not hidden by hardware or system UI.' },
    { q: 'Minimum comfortable touch target size is about…', a: ['10 px', '44 points', '200 px', '5 mm'], c: 1, why: 'Platform guidelines recommend roughly 44×44 pt (Apple) or 48×48 dp (Android).' },
    { q: 'Why test on real devices?', a: ['Emulators do not exist', 'Performance, touch and sensors behave differently', 'It is required by law', 'To avoid writing code'], c: 1, why: 'Real hardware reveals issues emulators miss.' },
  ],
  networking: [
    { q: 'What does DNS do?', a: ['Encrypts data', 'Translates domain names to IP addresses', 'Stores websites', 'Speeds up Wi-Fi'], c: 1, why: 'DNS resolves names like example.com to IP addresses.' },
    { q: 'What does TLS add to HTTP?', a: ['Colour', 'Encryption and authentication (HTTPS)', 'Compression only', 'Caching'], c: 1, why: 'TLS encrypts traffic and verifies the server.' },
    { q: 'TCP is…', a: ['Connection-oriented and reliable', 'Connectionless and unreliable', 'A file format', 'A programming language'], c: 0, why: 'TCP guarantees ordered delivery; UDP does not.' },
  ],
  security: [
    { q: 'How should passwords be stored?', a: ['Plain text', 'Hashed with a slow, salted algorithm like bcrypt or Argon2', 'Base64 encoded', 'In a cookie'], c: 1, why: 'Salted slow hashes make stolen password databases far harder to crack.' },
    { q: 'What is the OWASP Top 10?', a: ['A list of popular apps', 'A list of the most critical web application security risks', 'A programming language', 'An antivirus'], c: 1, why: 'OWASP publishes the Top 10 web security risks.' },
    { q: 'Phishing is…', a: ['A network protocol', 'Tricking people into revealing information or clicking malicious links', 'A backup method', 'A firewall'], c: 1, why: 'Phishing exploits people, not just software.' },
  ],
  git: [
    { q: 'What does `git commit` do?', a: ['Uploads to GitHub', 'Records a snapshot of staged changes', 'Deletes a branch', 'Downloads a repo'], c: 1, why: 'Commits save snapshots locally; push sends them to a remote.' },
    { q: 'Why use branches?', a: ['To work on changes without affecting main', 'To delete history', 'To speed up Git', 'Branches are deprecated'], c: 0, why: 'Branches isolate work until it is reviewed and merged.' },
    { q: 'Which command sends local commits to a remote?', a: ['git pull', 'git push', 'git add', 'git init'], c: 1, why: 'git push uploads commits to the remote repository.' },
  ],
  apis: [
    { q: 'REST APIs commonly exchange data as…', a: ['JSON', 'MP3', 'PNG', 'DOCX'], c: 0, why: 'JSON is the most common format for REST APIs.' },
    { q: 'Where should an API key that grants paid access be kept?', a: ['In front-end JavaScript', 'On the server', 'In the URL', 'In a public repo'], c: 1, why: 'Anything in the browser can be read by users.' },
    { q: 'Status code 401 means…', a: ['Unauthorised — authentication needed', 'OK', 'Not found', 'Created'], c: 0, why: '401 means the request lacks valid credentials.' },
  ],
  testing: [
    { q: 'A unit test checks…', a: ['The whole system with a browser', 'A small piece of code in isolation', 'Server hardware', 'Spelling'], c: 1, why: 'Unit tests focus on one function or module.' },
    { q: 'Why write a failing test before fixing a bug?', a: ['To prove the bug exists and confirm the fix', 'To slow down work', 'Tests cannot fail', 'To skip review'], c: 0, why: 'The test fails first, then passes once the bug is fixed — and guards against regressions.' },
    { q: 'End-to-end tests…', a: ['Test the app like a real user, across the whole stack', 'Only test CSS', 'Replace all unit tests', 'Run only once'], c: 0, why: 'E2E tests drive the real UI and back-end together.' },
  ],
  'english-skills': [
    { q: 'Which habit improves listening most?', a: ['Listening to short English programmes daily', 'Reading grammar rules only', 'Avoiding English media', 'Translating every word'], c: 0, why: 'Regular exposure builds listening skill.' },
    { q: 'What should a vocabulary notebook include?', a: ['Only the word', 'The word with an example sentence', 'Only translations', 'Nothing'], c: 1, why: 'Example sentences show how a word is used.' },
    { q: 'A good way to improve writing is…', a: ['Practising short emails and summaries', 'Writing only once a year', 'Copying texts', 'Avoiding feedback'], c: 0, why: 'Short regular practice builds writing fluency.' },
  ],
  'en-grammar': [
    { q: 'Choose the correct sentence.', a: ['She work in a bank.', 'She works in a bank.', 'She working in a bank.', 'She is work in a bank.'], c: 1, why: 'Third person singular in the present simple takes -s: she works.' },
    { q: '"I ___ my homework, so I can go out now."', a: ['finish', 'have finished', 'am finishing', 'finishing'], c: 1, why: 'The present perfect links a past action to the present result.' },
    { q: 'Which article fits? "I saw ___ elephant at the zoo."', a: ['a', 'an', 'the', 'no article'], c: 1, why: '"An" is used before a vowel sound.' },
    { q: 'Choose the correct preposition: "She is good ___ maths."', a: ['in', 'on', 'at', 'for'], c: 2, why: 'The fixed phrase is "good at".' },
  ],
  'en-vocab': [
    { q: 'Which is a natural collocation?', a: ['Do a decision', 'Make a decision', 'Take a decision of', 'Build a decision'], c: 1, why: 'In English we "make a decision".' },
    { q: 'What is spaced repetition?', a: ['Reviewing words at increasing intervals', 'Reading a word 100 times in a row', 'Learning one word per year', 'Never reviewing'], c: 0, why: 'Reviewing after growing gaps strengthens long-term memory.' },
    { q: 'The best way to remember a new word is to…', a: ['Use it in your own sentence soon', 'Only read its translation', 'Forget it after class', 'Write it once'], c: 0, why: 'Active use moves words into your active vocabulary.' },
  ],
  'en-email': [
    { q: 'Which subject line is best?', a: ['Hi', 'Question', 'Request: project report by Friday 14 June', 'URGENT!!!'], c: 2, why: 'A specific subject tells the reader what and when.' },
    { q: 'Where should the purpose of the email appear?', a: ['In the first sentence', 'At the very end', 'In the signature', 'Nowhere'], c: 0, why: 'Readers decide quickly; state the purpose first.' },
    { q: 'Which closing is appropriate in a professional email?', a: ['Cheers mate', 'Kind regards', 'Bye!!', 'xoxo'], c: 1, why: '"Kind regards" is polite and widely used.' },
    { q: 'Before sending, you should check…', a: ['Names, attachments, dates and tone', 'Only the font', 'Nothing', 'The weather'], c: 0, why: 'A quick check avoids common, embarrassing mistakes.' },
  ],
  'en-present': [
    { q: 'What should you decide first when preparing a talk?', a: ['Slide colours', 'Your key message', 'Your outfit', 'The font'], c: 1, why: 'Everything else supports the key message.' },
    { q: 'Which is a signposting phrase?', a: ['"Moving on to the next point…"', '"Um…"', '"Whatever."', '"I forgot."'], c: 0, why: 'Signposts tell the audience where you are in the talk.' },
    { q: 'How much text should slides have?', a: ['Every word you will say', 'Few words — you say the detail', 'None ever', 'Full paragraphs'], c: 1, why: 'Audiences cannot read and listen well at the same time.' },
  ],
  'en-interview': [
    { q: 'What does STAR stand for?', a: ['Start, Talk, Answer, Repeat', 'Situation, Task, Action, Result', 'Skills, Training, Aims, Role', 'Speak, Think, Ask, Reply'], c: 1, why: 'STAR structures examples clearly.' },
    { q: 'Which tense is best for a finished past project?', a: ['Past simple: "I built…"', 'Future: "I will build…"', 'Present continuous: "I am building…"', 'Conditional: "I would build…"'], c: 0, why: 'Use the past simple for completed actions.' },
    { q: 'If you did not understand a question, you should say…', a: ['Nothing and guess', '"Could you repeat the question, please?"', '"What?"', 'Change the subject'], c: 1, why: 'Asking politely for clarification is professional.' },
  ],
  startup: [
    { q: 'What should you do before building a product?', a: ['Talk to potential customers', 'Hire a large team', 'Buy an office', 'Design a logo'], c: 0, why: 'Customer conversations confirm the problem is real.' },
    { q: 'What is an MVP?', a: ['Most Valuable Player', 'The smallest version that solves the problem', 'A marketing plan', 'A legal document'], c: 1, why: 'A minimum viable product tests the idea with the least effort.' },
    { q: 'Why track a few numbers weekly?', a: ['To see honestly whether things are improving', 'To impress friends', 'It is illegal not to', 'To avoid customers'], c: 0, why: 'Regular metrics show progress and problems early.' },
  ],
  'biz-test': [
    { q: 'Which interview question gives the most reliable evidence?', a: ['"Would you buy this?"', '"When did this problem last happen and what did you do?"', '"Do you like my idea?"', '"Is this a good price?"'], c: 1, why: 'Past behaviour is more reliable than opinions about the future.' },
    { q: 'Which is the strongest signal of demand?', a: ['Compliments', 'Likes on social media', 'Pre-orders or payments', 'A friend saying "great idea"'], c: 2, why: 'People paying shows real commitment.' },
    { q: 'When should you define what counts as success for a test?', a: ['Before running it', 'After seeing results', 'Never', 'Only if it fails'], c: 0, why: 'Setting criteria first avoids fooling yourself.' },
  ],
  'biz-bmc': [
    { q: 'How many building blocks does the Business Model Canvas have?', a: ['5', '7', '9', '12'], c: 2, why: 'There are nine blocks.' },
    { q: 'Which two blocks are a good starting point?', a: ['Cost Structure and Key Partners', 'Customer Segments and Value Propositions', 'Channels and Key Resources', 'Revenue Streams and Key Activities'], c: 1, why: 'Who you serve and what value you offer drive the rest.' },
    { q: 'Each block on the canvas should be treated as…', a: ['A proven fact', 'A hypothesis to test', 'A legal promise', 'Optional decoration'], c: 1, why: 'The canvas is a tool for testing assumptions.' },
  ],
  'biz-pricing': [
    { q: 'Cost-plus pricing means…', a: ['Price = cost + a margin', 'Price set by competitors only', 'Price based on customer value', 'Free pricing'], c: 0, why: 'Cost-plus adds a fixed margin to your cost.' },
    { q: 'Value-based pricing starts from…', a: ['Your costs', 'What the customer gains', 'The lowest competitor price', 'A random number'], c: 1, why: 'It prices according to the value delivered.' },
    { q: 'Why should small businesses avoid competing on price alone?', a: ['Larger competitors can usually go lower', 'Low prices are illegal', 'Customers dislike discounts', 'It is too easy'], c: 0, why: 'Price wars favour businesses with lower costs and deeper pockets.' },
  ],
  'biz-marketing': [
    { q: 'What should you define before choosing channels?', a: ['Your target customer', 'Your logo colour', 'Your office address', 'Your website font'], c: 0, why: 'Channels should match where your customers are.' },
    { q: 'For a small business, how many channels to start with?', a: ['Every channel at once', 'One or two done well', 'None', 'At least ten'], c: 1, why: 'Focus beats spreading effort thin.' },
    { q: 'Which metric shows the cost of winning a customer?', a: ['Customer acquisition cost', 'Page title', 'Bounce colour', 'Font size'], c: 0, why: 'CAC = marketing spend ÷ customers won.' },
  ],
  'biz-finance': [
    { q: 'Profit and cash flow are…', a: ['The same thing', 'Different — a profitable business can still run out of cash', 'Both optional', 'Only for big companies'], c: 1, why: 'Cash flow is about timing; profit is about totals.' },
    { q: 'Fixed costs 1,000, price 50, variable cost 30 per unit. Break-even units?', a: ['20', '33', '50', '100'], c: 2, why: '1,000 ÷ (50 − 30) = 50 units.' },
    { q: 'Why keep business and personal money separate?', a: ['Clearer records and easier taxes', 'Banks require two cards', 'It increases sales', 'No reason'], c: 0, why: 'Separate accounts make tracking and tax much simpler.' },
  ],
  learning: [
    { q: 'Which is more effective than re-reading?', a: ['Active recall (testing yourself)', 'Highlighting everything', 'Reading faster', 'Studying with music on loud'], c: 0, why: 'Retrieving from memory strengthens it.' },
    { q: 'Spacing your revision means…', a: ['Studying in sessions spread over days', 'One long session the night before', 'Leaving spaces in notes', 'Skipping topics'], c: 0, why: 'Spaced practice leads to longer retention.' },
    { q: 'Why teach an idea to someone else?', a: ['It reveals gaps in your understanding', 'It wastes time', 'It replaces practice', 'Only teachers benefit'], c: 0, why: 'Explaining forces you to organise what you know.' },
  ],
  'study-notes': [
    { q: 'In the Cornell method, what goes at the bottom of the page?', a: ['A summary', 'The date only', 'Doodles', 'Nothing'], c: 0, why: 'A short summary closes each page of notes.' },
    { q: 'Why write notes in your own words?', a: ['It forces understanding', 'It is faster than copying', 'Teachers require it', 'It uses less paper'], c: 0, why: 'Rephrasing makes you process the idea.' },
    { q: 'When should you review new notes?', a: ['Within 24 hours', 'After a month', 'Only before the exam', 'Never'], c: 0, why: 'Early review fixes gaps while the lesson is fresh.' },
  ],
  'study-exams': [
    { q: 'Which is the most useful revision activity?', a: ['Timed past-paper practice', 'Re-reading the textbook', 'Copying notes neatly', 'Highlighting'], c: 0, why: 'Practising under exam conditions builds recall and timing.' },
    { q: 'Interleaving means…', a: ['Mixing different topics in one session', 'Studying only one topic all week', 'Taking long breaks', 'Studying in bed'], c: 0, why: 'Mixing topics improves choosing the right method.' },
    { q: 'The night before an exam you should…', a: ['Stay up all night', 'Get a good night’s sleep', 'Learn new topics', 'Skip dinner'], c: 1, why: 'Sleep consolidates memory and improves focus.' },
  ],
  'study-memory': [
    { q: 'Retrieval practice means…', a: ['Recalling information from memory', 'Re-reading notes', 'Copying a textbook', 'Listening only'], c: 0, why: 'Pulling information from memory strengthens it.' },
    { q: 'Dual coding combines…', a: ['Words and visuals', 'Two languages', 'Two textbooks', 'Coffee and tea'], c: 0, why: 'Pairing words with pictures gives two routes to recall.' },
    { q: 'Which schedule is spaced repetition?', a: ['Review after 1 day, 3 days, 1 week', 'Review 10 times in one hour', 'Review once a year', 'Never review'], c: 0, why: 'Growing intervals are the key idea.' },
  ],
  'study-time': [
    { q: 'What is the first step in planning study time?', a: ['List all deadlines in one calendar', 'Buy new stationery', 'Start the easiest task', 'Wait for motivation'], c: 0, why: 'You can only plan around deadlines you can see.' },
    { q: 'Why break big assignments into small tasks?', a: ['Small tasks are easier to start and schedule', 'It makes work longer', 'Teachers require it', 'No reason'], c: 0, why: 'Clear small steps reduce procrastination.' },
    { q: 'Why add a buffer to estimates?', a: ['Tasks often take longer than expected', 'To waste time', 'To look busy', 'Estimates are always exact'], c: 0, why: 'Planning fallacy: we usually underestimate time.' },
  ],
  portfolio: [
    { q: 'What should a portfolio lead with?', a: ['Projects and the problems they solved', 'Hobbies', 'A long biography', 'Your favourite colours'], c: 0, why: 'Employers want to see what you can do.' },
    { q: 'Why keep READMEs tidy?', a: ['They explain projects to reviewers quickly', 'GitHub hides projects without them', 'They make code run', 'No reason'], c: 0, why: 'A good README is the first thing a reviewer reads.' },
    { q: 'A good interview exercise is to…', a: ['Explain one project in two minutes', 'Memorise your CV word for word', 'Avoid practice', 'Talk only about grades'], c: 0, why: 'A short, clear project story is valuable in interviews.' },
  ],
  'career-cv': [
    { q: 'How long should a CV usually be?', a: ['One or two pages', 'Five pages', 'Half a line', 'As long as possible'], c: 0, why: 'Recruiters scan quickly; keep it concise.' },
    { q: 'Which bullet point is strongest?', a: ['"Responsible for website"', '"Built a booking website used by 200 customers a month"', '"Did some web stuff"', '"Website"'], c: 1, why: 'Action verb + specific result is clearest.' },
    { q: 'Should you tailor your CV for each job?', a: ['Yes, match it to the job description', 'No, send the same CV everywhere', 'Only for jobs abroad', 'Only the font'], c: 0, why: 'Tailored CVs show you fit the role.' },
  ],
  'career-linkedin': [
    { q: 'What makes a better LinkedIn headline?', a: ['"Student"', '"Computing student | Web development & UI design"', 'Leaving it blank', 'An emoji only'], c: 1, why: 'A specific headline tells people what you do.' },
    { q: 'Your LinkedIn profile should be…', a: ['Consistent with your CV', 'Completely different from your CV', 'Fictional', 'Private and empty'], c: 0, why: 'Inconsistencies reduce trust.' },
    { q: 'Recommendations are most valuable from…', a: ['People you worked or studied with', 'Strangers', 'Yourself', 'Bots'], c: 0, why: 'They can speak to your real work.' },
  ],
  'career-intern': [
    { q: 'When should you start applying for internships?', a: ['Early — many open months in advance', 'The day before they start', 'After graduating', 'Never'], c: 0, why: 'Many programmes close well before their start date.' },
    { q: 'Which helps an application stand out?', a: ['A tailored cover letter and relevant projects', 'A generic letter sent everywhere', 'A very long CV', 'No contact details'], c: 0, why: 'Tailoring shows real interest and fit.' },
    { q: 'After applying, it is reasonable to…', a: ['Follow up politely after one or two weeks', 'Call every day', 'Never follow up', 'Apply again immediately'], c: 0, why: 'A polite follow-up shows interest without pressure.' },
  ],
  'career-interview': [
    { q: 'What should you research before an interview?', a: ['The organisation, its customers and recent news', 'Only the salary', 'Nothing', 'The interviewer’s home address'], c: 0, why: 'Research helps you give relevant answers and ask good questions.' },
    { q: 'Which question is good to ask the interviewer?', a: ['"What does success look like in the first three months?"', '"How much holiday can I take right away?"', '"What does your company do?"', 'No questions'], c: 0, why: 'It shows interest in doing the job well.' },
    { q: 'After the interview you can…', a: ['Send a short thank-you message', 'Demand an answer the same day', 'Post the questions online', 'Do nothing ever'], c: 0, why: 'A brief thank-you is professional and memorable.' },
  ],
  methods: [
    { q: 'When is a good time to plan tomorrow?', a: ['At the end of today', 'At midnight', 'Never', 'Only on Mondays'], c: 0, why: 'You start the next day knowing what matters.' },
    { q: 'Why keep one trusted to-do list?', a: ['So nothing is scattered or forgotten', 'Lists slow you down', 'To impress others', 'No reason'], c: 0, why: 'One list reduces mental load.' },
    { q: 'Kanban visualises work as…', a: ['Cards moving across columns', 'A pie chart', 'A single long essay', 'A spreadsheet formula'], c: 0, why: 'Columns like To do / Doing / Done show flow.' },
  ],
  'prod-pomodoro': [
    { q: 'How long is a classic pomodoro?', a: ['10 minutes', '25 minutes', '60 minutes', '90 minutes'], c: 1, why: 'The classic interval is 25 minutes of focus.' },
    { q: 'After four pomodoros you should…', a: ['Take a longer break (15–30 min)', 'Stop for the day', 'Skip the break', 'Start a new task immediately'], c: 0, why: 'A longer break helps you recover.' },
    { q: 'If a distraction comes up during a pomodoro…', a: ['Note it down and return to the task', 'Deal with it immediately', 'Restart the day', 'Give up'], c: 0, why: 'Capturing it protects focus.' },
  ],
  'prod-weekly': [
    { q: 'How many key outcomes should you choose for the week?', a: ['About three', 'Twenty', 'None', 'Everything on your list'], c: 0, why: 'A few clear priorities are achievable.' },
    { q: 'What should be scheduled in your calendar first?', a: ['Your most important outcomes', 'Social media time', 'Random tasks', 'Nothing'], c: 0, why: 'Protect time for priorities before the week fills up.' },
    { q: 'Why leave buffer time?', a: ['Unexpected things always happen', 'To be lazy', 'Calendars require it', 'No reason'], c: 0, why: 'Buffers keep the plan realistic.' },
  ],
  'prod-focus': [
    { q: '"Eat the frog" means…', a: ['Do your hardest task first', 'Take a long lunch', 'Skip difficult tasks', 'Work at night'], c: 0, why: 'Doing the hardest task first uses your best energy.' },
    { q: 'Why avoid multitasking?', a: ['Switching tasks costs time and attention', 'It is too easy', 'It is faster', 'No reason'], c: 0, why: 'Each switch has a mental cost.' },
    { q: 'Which helps focus most?', a: ['Phone in another room with notifications off', 'Phone face-up on the desk', 'Many open tabs', 'Background TV'], c: 0, why: 'Removing cues removes temptation.' },
  ],
};

/** IT topics that have runnable examples in the Code Playground */
const PG_TOPICS = new Set(['html', 'css', 'javascript', 'apis', 'react', 'testing', 'dsa', 'oop']);

export const LEARNING: Section[] = RAW.map((s) => ({
  id: s.id,
  title: s.title,
  topics: s.topics.map((t) => ({
    ...t,
    quiz: QUIZZES[t.id] ?? [],
    apps: t.apps ?? (s.id === 'it' ? (PG_TOPICS.has(t.id) ? ['flashcards', 'playground'] : ['flashcards']) : []),
  })),
}));
