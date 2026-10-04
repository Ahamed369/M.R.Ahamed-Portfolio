/**
 * v8 — project case studies.
 * Written from each repository's README, source structure and the CV.
 * No invented metrics: outcomes describe what was built and delivered.
 * "Next steps" repeat the future work listed in the repository READMEs
 * where one exists.
 */
export interface CaseStudy {
  id: string; // matches projects[].id
  problem: string;
  goals: string[];
  role: string;
  process: { step: string; detail: string }[];
  challenges: { challenge: string; solution: string }[];
  outcomes: string[];
  learnings: string[];
  next?: string[];
}

export const caseStudies: CaseStudy[] = [
  {
    id: 'healthforge',
    problem: 'Fitness shoppers usually jump between separate stores for supplements, equipment and recovery products, while small sellers need an admin area they can run without developer help.',
    goals: ['One storefront for fitness, wellness and recovery products', 'Secure accounts, cart and checkout', 'A complete admin dashboard for users, products, orders and FAQs'],
    role: 'Full-stack developer — built the responsive frontend, PHP backend, MySQL schema and admin dashboard; took part in an authorised group security assessment in a controlled academic environment.',
    process: [
      { step: 'Model', detail: 'Designed MySQL tables and PHP model classes — User, Product, Cart, Order — accessed through PDO.' },
      { step: 'Modules', detail: 'Separated the code into auth, products, cart, orders and admin folders so each feature can grow independently.' },
      { step: 'Security', detail: 'Hashed stored passwords, used session-based authentication and took part in an authorised group security assessment of the application and firewall in a controlled academic environment.' },
      { step: 'Admin', detail: 'Built CRUD screens for users, products (with image uploads), orders and FAQs.' },
    ],
    challenges: [
      { challenge: 'Keeping cart and order state consistent across pages', solution: 'Server-side sessions with cart operations (add / update / remove) handled by a dedicated Cart model.' },
      { challenge: 'Separating customer and administrator capabilities', solution: 'A dedicated admin module with its own dashboard and checks, instead of mixing admin actions into storefront pages.' },
    ],
    outcomes: ['A working full-stack e-commerce flow from registration to order history', 'An admin dashboard covering users, products, orders and FAQs', 'Hands-on security-assessment experience documented alongside the code'],
    learnings: ['Structuring a PHP project in an MVC-style layout', 'Why production deployments also need HTTPS, CSRF protection, hardened sessions and security headers'],
    next: ['Payment-gateway integration and email notifications', 'Advanced search, filtering, wishlist, reviews and ratings', 'Analytics dashboard, inventory alerts and cloud deployment'],
  },
  {
    id: 'expense',
    problem: 'Students often lose track of small daily spending and have no simple way to see where their money goes against a budget — especially when prices come in different currencies.',
    goals: ['Fast expense capture with categories', 'Monthly budgets with clear warnings', 'Visual analytics and live currency conversion'],
    role: 'Android developer — designed the app structure and screens, implemented SQLite storage, integrated the currency API and chart visualisations.',
    process: [
      { step: 'Structure', detail: 'Single-activity app with four fragments (Expenses, Budget, Analytics, Currency) behind a bottom navigation bar.' },
      { step: 'Data', detail: 'A SQLite DatabaseHelper stores and queries expense records locally, so the app works offline.' },
      { step: 'Insights', detail: 'MPAndroidChart pie and bar charts with weekly, monthly and all-time filters.' },
      { step: 'APIs', detail: 'Retrofit 2 + Gson client for live exchange rates and country / currency information.' },
    ],
    challenges: [
      { challenge: 'Showing budget health at a glance', solution: 'Category budgets with On Track / Caution / Warning status and progress indicators.' },
      { challenge: 'Working with unreliable network access', solution: 'Core features use local SQLite; only currency conversion needs the network.' },
    ],
    outcomes: ['A native Android app covering tracking, budgeting, analytics and currency conversion', 'Material Design UI with RecyclerView lists and CardView layouts'],
    learnings: ['Fragment-based navigation and lifecycle', 'Consuming REST APIs on Android with Retrofit'],
  },
  {
    id: 'ndi',
    problem: 'Identity registration processes need reliable validation and a clean way to create, find, update and remove citizen records without inconsistent data.',
    goals: ['A REST API for the full registration lifecycle', 'Validation and centralised error handling', 'Search and filtering over identity records'],
    role: 'Backend developer — built the Express API endpoints, MongoDB connection and data operations, request validation and centralised error handling.',
    process: [
      { step: 'API design', detail: 'Resource-oriented routes for registration and records, returning JSON.' },
      { step: 'Persistence', detail: 'Mongoose models over MongoDB with schema validation.' },
      { step: 'Configuration', detail: 'Environment-based configuration with dotenv, keeping secrets out of the code.' },
      { step: 'Testing', detail: 'Endpoints exercised with Postman during development (nodemon for hot reload).' },
    ],
    challenges: [
      { challenge: 'Rejecting bad input consistently', solution: 'Request validation plus one centralised error handler so every route answers errors the same way.' },
      { challenge: 'Keeping the codebase easy to extend', solution: 'Modular routes / models architecture.' },
    ],
    outcomes: ['Complete CRUD with search and filtering', 'A browser-based client talking to the REST API'],
    learnings: ['REST API design with Express', 'Document modelling in MongoDB'],
  },
  {
    id: 'fidenz',
    problem: 'Raw weather numbers (temperature, humidity, wind, cloud) are hard to turn into a simple answer to “will it feel comfortable outside?”.',
    goals: ['City-based weather and forecasts', 'A single Comfort Index score', 'Secure access and efficient API usage'],
    role: 'Full-stack developer — React dashboard, Express API, comfort-index engine, Auth0 security and tests.',
    process: [
      { step: 'Dashboard', detail: 'React + Vite interface with city cards, a comfort gauge and trend charts.' },
      { step: 'API', detail: 'Node.js / Express service fetches OpenWeatherMap data.' },
      { step: 'Caching', detail: 'Check the cache first; on a miss fetch from the weather service and store the result — fewer external requests.' },
      { step: 'Quality', detail: 'Unit tests for the Comfort Index calculation with node:test.' },
    ],
    challenges: [
      { challenge: 'Protecting the API', solution: 'Auth0 login with JWT-protected endpoints (express-oauth2-jwt-bearer) and CORS configuration.' },
      { challenge: 'Rate limits on the weather provider', solution: 'Server-side response caching.' },
    ],
    outcomes: ['An authenticated full-stack weather dashboard', 'A tested, modular comfort-index module'],
    learnings: ['OAuth-based authentication with Auth0', 'Caching strategies for third-party APIs'],
    next: ['Extended forecasting and additional analytics', 'Production deployment'],
  },
  {
    id: 'citywalk',
    problem: 'A footwear store needs separate experiences for shoppers (collections by audience) and staff (catalogue, orders, promotions and site content).',
    goals: ['Men, Women and Kids collections', 'Customer accounts and ordering', 'A back-office for products, orders, promotions, banners, FAQs and CMS pages'],
    role: 'Full-stack developer — PHP storefront and admin module on a shared MySQL schema.',
    process: [
      { step: 'Schema', detail: 'A shared MySQL database (citywalk_db.sql) for storefront and admin.' },
      { step: 'Storefront', detail: 'Collection pages, full catalogue, customer sign-in and order creation.' },
      { step: 'Admin', detail: 'Products, categories, customers, orders, promotions, banners, FAQs, CMS pages and admin profile / password management.' },
    ],
    challenges: [{ challenge: 'Letting staff change site content without code', solution: 'CMS pages, banners and promotions managed from the admin dashboard.' }],
    outcomes: ['A complete storefront + admin e-commerce system'],
    learnings: ['Designing admin tools around real store operations'],
  },
  {
    id: 'studentrecord',
    problem: 'Small teams sometimes need to store and look up student records without setting up a database server.',
    goals: ['Search by student ID', 'Add records with duplicate checks', 'Zero-database setup'],
    role: 'Developer — interface, PHP endpoints and JSON storage.',
    process: [
      { step: 'Interface', detail: 'A responsive page with search and add-student forms.' },
      { step: 'Endpoints', detail: 'add_student.php and get_student.php validate input and read / write students.json.' },
    ],
    challenges: [{ challenge: 'Preventing duplicate IDs', solution: 'Server-side duplicate-ID validation before saving.' }],
    outcomes: ['A lightweight record system that runs anywhere PHP runs'],
    learnings: ['File-based persistence trade-offs versus a database'],
  },
  {
    id: 'highstreet',
    problem: 'Vehicle buyers and sellers need one place to search listings, view detailed photos and manage their activity.',
    goals: ['Advanced search and filtering', 'Buyer and seller dashboards', 'Secure access, payments and real-time communication'],
    role: 'Full-stack developer for High Street Car Sale Private Limited — backend services in Node.js / Express with MySQL, JWT authentication, admin and transaction features.',
    process: [
      { step: 'Backend', detail: 'Node.js / Express services over MySQL.' },
      { step: 'Access', detail: 'JWT-based authentication and secure access controls.' },
      { step: 'Experience', detail: 'Image galleries, dashboards, listing management and content moderation.' },
    ],
    challenges: [{ challenge: 'Real-time communication between users', solution: 'WebSockets alongside the REST backend.' }],
    outcomes: ['An in-development marketplace with dashboards, moderation and payment workflows'],
    learnings: ['Building for a real business client'],
  },
  {
    id: 'medicare',
    problem: 'Clinics juggling patients, doctors and appointments by hand run into double bookings and lost records.',
    goals: ['Patient and doctor management', 'Conflict-free appointment scheduling', 'Reports and notifications'],
    role: 'Developer — built the Java Swing desktop application published on GitHub: patient, doctor and appointment management with scheduling and reports.',
    process: [
      { step: 'GUI', detail: 'Java Swing screens with AWT event handling.' },
      { step: 'Scheduling', detail: 'LocalDate / LocalDateTime logic to detect timing conflicts and handle rescheduling or delays.' },
      { step: 'Persistence', detail: 'File handler writing patients.txt, doctors.txt and appointments.txt.' },
      { step: 'Reports', detail: 'Monthly summaries, timetables and doctor-wise statistics.' },
    ],
    challenges: [{ challenge: 'Double-booked doctors', solution: 'Conflict detection with the Java Time API before an appointment is saved.' }],
    outcomes: ['A desktop system linking patients, doctors and appointments with reports'],
    learnings: ['Object-oriented design and MVC in a desktop app'],
  },
  {
    id: 'restaurant-pos',
    problem: 'Small restaurants need a fast point-of-sale that keeps working without internet, with the kitchen, payments and reports in one place.',
    goals: ['Fast ordering for dine-in, takeaway and delivery', 'A kitchen workflow', 'Role-based staff access, payments, receipts and reports'],
    role: 'Developer — Python / Tkinter desktop application with a SQLite data layer.',
    process: [
      { step: 'POS', detail: 'Menu search, categories, cart, discounts, tax and service charge.' },
      { step: 'Kitchen', detail: 'Orders move New → Preparing → Ready → Served.' },
      { step: 'Security', detail: 'Admin / Manager / Cashier / Kitchen roles with PBKDF2 password hashing.' },
      { step: 'Operations', detail: 'Inventory with low-stock alerts, customers with loyalty points, CSV reports and automatic database backups.' },
    ],
    challenges: [
      { challenge: 'Working with no internet connection', solution: 'Fully offline design on a local SQLite database.' },
      { challenge: 'Handling mixed payments', solution: 'Cash, card and split payments with change calculation.' },
    ],
    outcomes: ['A complete offline restaurant POS with kitchen display, payments, receipts and reporting'],
    learnings: ['Designing a desktop UI for speed at the counter'],
    next: ['Cloud synchronisation and a web dashboard', 'Mobile app, multi-branch support and QR menus', 'Online ordering and real payment-gateway integration'],
  },
  {
    id: 'freshmart',
    problem: 'Grocery shoppers expect to browse departments, search, keep a wishlist and check out quickly on any device.',
    goals: ['Eight grocery departments with a store and search', 'Cart, wishlist, offers and reviews', 'Account, payment and admin pages'],
    role: 'Front-end developer — HTML5, CSS3 and vanilla JavaScript, organised per page.',
    process: [
      { step: 'Structure', detail: 'Pages/ (HTML), Styles/ (per-page CSS), Functions/ (per-page JS) and Images/.' },
      { step: 'State', detail: 'Account and session data kept in the browser with localStorage.' },
      { step: 'Responsive', detail: 'Layouts that adapt across phones, tablets and desktops.' },
    ],
    challenges: [{ challenge: 'Keeping many pages consistent', solution: 'Shared navigation and per-page style / script files.' }],
    outcomes: ['A multi-page grocery store UI covering the complete shopping journey'],
    learnings: ['Organising a large vanilla-JS project without a framework'],
  },
  {
    id: 'edulearn',
    problem: 'Learners need a clear, responsive place to discover courses and resources.',
    goals: ['Course discovery pages', 'Student pages, login and sign-up interfaces', 'Interactive jQuery demonstrations'],
    role: 'Front-end developer — HTML, Bootstrap 5, JavaScript and jQuery.',
    process: [
      { step: 'Layout', detail: 'Bootstrap grid and responsive navigation shared by every page.' },
      { step: 'Interactivity', detail: 'jQuery click, hover and input events with DOM and CSS updates.' },
    ],
    challenges: [{ challenge: 'Consistency across six pages', solution: 'One navigation structure and a shared responsive grid.' }],
    outcomes: ['A responsive multi-page LMS front end'],
    learnings: ['Bootstrap 5 layout system and jQuery event handling'],
  },
];

export const caseStudyById = (id: string) => caseStudies.find((c) => c.id === id);
