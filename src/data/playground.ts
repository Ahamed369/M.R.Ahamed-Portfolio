/**
 * v10.3 — Code Playground starter examples.
 * Each example is general learning material (not personal facts) and links to
 * a Learning Hub topic id from `src/data/learning.ts`.
 * Note: the preview runs in a sandboxed iframe without same-origin access, so
 * examples never use localStorage, fetch or real form submission.
 */
export interface PgExample {
  id: string;
  title: string;
  blurb: string;
  /** Learning Hub topic id (src/data/learning.ts) */
  topic: string;
  topicTitle: string;
  /** Card tint */
  tint: string;
  html: string;
  css: string;
  js: string;
}

const BASE_CSS = `* { box-sizing: border-box; }
body {
  margin: 0;
  padding: 24px;
  font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
  color: #1d1d1f;
  background: #f5f5f7;
}
`;

export const PG_EXAMPLES: PgExample[] = [
  {
    id: 'html-basics',
    title: 'HTML basics',
    blurb: 'A small semantic page: header, nav, main, article, figure and footer.',
    topic: 'html',
    topicTitle: 'HTML',
    tint: '#ff6b35',
    html: `<header>
  <h1>My first page</h1>
  <nav>
    <a href="#about">About</a>
    <a href="#list">List</a>
  </nav>
</header>

<main>
  <article id="about">
    <h2>About this page</h2>
    <p>HTML gives a page its <strong>structure</strong>.
       Semantic elements tell browsers and screen readers what each part means.</p>
    <figure>
      <svg width="120" height="80" role="img" aria-label="Three coloured circles">
        <circle cx="25" cy="40" r="18" fill="#ff6b35" />
        <circle cx="60" cy="40" r="18" fill="#0a84ff" />
        <circle cx="95" cy="40" r="18" fill="#30d158" />
      </svg>
      <figcaption>Images and graphics need a text alternative.</figcaption>
    </figure>
  </article>

  <section id="list">
    <h2>Things to try</h2>
    <ol>
      <li>Change the heading text.</li>
      <li>Add another list item.</li>
      <li>Wrap a word in <code>&lt;em&gt;</code>.</li>
    </ol>
  </section>
</main>

<footer>
  <small>Edit the HTML on the left — the preview updates as you type.</small>
</footer>`,
    css: `${BASE_CSS}header { border-bottom: 2px solid #e5e5ea; margin-bottom: 16px; }
nav { display: flex; gap: 12px; padding-bottom: 12px; }
nav a { color: #0a84ff; text-decoration: none; }
figure { margin: 16px 0; }
figcaption { font-size: 13px; color: #6e6e73; }
footer { margin-top: 24px; color: #6e6e73; }`,
    js: `// HTML needs no JavaScript — but scripts can read the page too.
console.log('Headings on this page:', document.querySelectorAll('h1, h2').length);`,
  },
  {
    id: 'css-layout',
    title: 'Flexbox & Grid',
    blurb: 'A flexbox toolbar and a responsive card grid that reflows as the preview resizes.',
    topic: 'css',
    topicTitle: 'CSS',
    tint: '#0a84ff',
    html: `<div class="bar">
  <b>Studio</b>
  <span class="grow"></span>
  <button>Share</button>
  <button class="primary">Publish</button>
</div>

<div class="grid">
  <div class="card">Flexbox lines things up in one direction.</div>
  <div class="card">Grid places items in rows and columns.</div>
  <div class="card wide">auto-fill + minmax makes the grid responsive without media queries.</div>
  <div class="card">gap adds space between items.</div>
  <div class="card">Resize the preview to see it reflow.</div>
</div>`,
    css: `${BASE_CSS}.bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}
.grow { flex: 1; }
button {
  border: 0;
  border-radius: 8px;
  padding: 7px 14px;
  background: #e5e5ea;
  font: inherit;
}
button.primary { background: #0a84ff; color: #fff; }

.grid {
  margin-top: 18px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 12px;
}
.card {
  padding: 16px;
  border-radius: 14px;
  background: linear-gradient(135deg, #5e5ce6, #0a84ff);
  color: #fff;
  min-height: 90px;
}
.card.wide { grid-column: span 2; background: linear-gradient(135deg, #ff375f, #ff9f0a); }`,
    js: ``,
  },
  {
    id: 'css-theme',
    title: 'CSS variables theme',
    blurb: 'Custom properties drive a light / dark theme toggled with one class.',
    topic: 'css',
    topicTitle: 'CSS',
    tint: '#5e5ce6',
    html: `<div class="panel">
  <h2>Theme switcher</h2>
  <p>All colours come from CSS custom properties.</p>
  <button id="toggle">Toggle dark mode</button>
</div>`,
    css: `:root {
  --bg: #f5f5f7;
  --card: #ffffff;
  --text: #1d1d1f;
  --accent: #5e5ce6;
}
.dark {
  --bg: #1c1c1e;
  --card: #2c2c2e;
  --text: #f5f5f7;
  --accent: #bf5af2;
}
body {
  margin: 0;
  min-height: 100vh;
  display: grid;
  place-items: center;
  font-family: system-ui, sans-serif;
  background: var(--bg);
  color: var(--text);
  transition: background 0.3s, color 0.3s;
}
.panel {
  padding: 28px;
  border-radius: 20px;
  background: var(--card);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.12);
  text-align: center;
}
button {
  border: 0;
  border-radius: 10px;
  padding: 10px 16px;
  background: var(--accent);
  color: #fff;
  font: inherit;
  cursor: pointer;
}`,
    js: `const root = document.documentElement;
document.getElementById('toggle').addEventListener('click', () => {
  root.classList.toggle('dark');
  console.log('Dark mode:', root.classList.contains('dark'));
});`,
  },
  {
    id: 'dom-events',
    title: 'DOM events',
    blurb: 'Clicks, keyboard input and event delegation — the core of interactive pages.',
    topic: 'javascript',
    topicTitle: 'JavaScript',
    tint: '#ffcc00',
    html: `<h2>Counter: <span id="count">0</span></h2>
<button id="minus">−</button>
<button id="plus">+</button>

<h3>Live text</h3>
<input id="name" placeholder="Type your name" />
<p id="hello">Hello, stranger!</p>

<h3>Event delegation</h3>
<ul id="colors">
  <li>Red</li>
  <li>Green</li>
  <li>Blue</li>
</ul>`,
    css: `${BASE_CSS}button {
  width: 44px;
  height: 44px;
  font-size: 22px;
  border-radius: 12px;
  border: 1px solid #d2d2d7;
  background: #fff;
  cursor: pointer;
}
input { padding: 8px 10px; border-radius: 8px; border: 1px solid #d2d2d7; font: inherit; }
li { cursor: pointer; padding: 4px 0; }
li.picked { font-weight: 700; color: #0a84ff; }`,
    js: `let count = 0;
const out = document.getElementById('count');

function render() {
  out.textContent = count;
}

document.getElementById('plus').addEventListener('click', () => { count++; render(); });
document.getElementById('minus').addEventListener('click', () => { count--; render(); });

// 'input' fires on every keystroke
document.getElementById('name').addEventListener('input', (e) => {
  const name = e.target.value.trim();
  document.getElementById('hello').textContent = \`Hello, \${name || 'stranger'}!\`;
});

// One listener on the parent handles every <li>
document.getElementById('colors').addEventListener('click', (e) => {
  if (e.target.tagName !== 'LI') return;
  document.querySelectorAll('#colors li').forEach((li) => li.classList.remove('picked'));
  e.target.classList.add('picked');
  console.log('Picked', e.target.textContent);
});`,
  },
  {
    id: 'json-api',
    title: 'Working with JSON',
    blurb: 'A pretend API: parse JSON, simulate a network delay with a Promise, then filter and render.',
    topic: 'apis',
    topicTitle: 'APIs',
    tint: '#30d158',
    html: `<h2>Products</h2>
<input id="q" placeholder="Filter by name…" />
<p id="status">Loading…</p>
<table>
  <thead><tr><th>Name</th><th>Category</th><th>Price</th></tr></thead>
  <tbody id="rows"></tbody>
</table>`,
    css: `${BASE_CSS}table { width: 100%; border-collapse: collapse; margin-top: 12px; background: #fff; border-radius: 12px; overflow: hidden; }
th, td { text-align: left; padding: 10px 12px; border-bottom: 1px solid #e5e5ea; }
th { font-size: 12px; text-transform: uppercase; color: #6e6e73; }
input { padding: 8px 10px; border-radius: 8px; border: 1px solid #d2d2d7; font: inherit; width: 100%; max-width: 280px; }
#status { color: #6e6e73; font-size: 13px; }`,
    js: `// A JSON string, like the body of an HTTP response
const RESPONSE = \`{
  "status": 200,
  "data": [
    { "id": 1, "name": "Notebook", "category": "Stationery", "price": 450 },
    { "id": 2, "name": "Desk lamp", "category": "Home", "price": 3200 },
    { "id": 3, "name": "Pen set", "category": "Stationery", "price": 780 },
    { "id": 4, "name": "Backpack", "category": "Travel", "price": 5400 }
  ]
}\`;

// Pretend network call: resolves after 600 ms
function getProducts() {
  return new Promise((resolve) => {
    setTimeout(() => resolve(JSON.parse(RESPONSE)), 600);
  });
}

let products = [];

function render(filter = '') {
  const rows = products
    .filter((p) => p.name.toLowerCase().includes(filter.toLowerCase()))
    .map((p) => \`<tr><td>\${p.name}</td><td>\${p.category}</td><td>Rs \${p.price.toLocaleString()}</td></tr>\`)
    .join('');
  document.getElementById('rows').innerHTML = rows || '<tr><td colspan="3">No matches</td></tr>';
}

async function load() {
  const res = await getProducts();
  if (res.status !== 200) throw new Error('Request failed');
  products = res.data;
  document.getElementById('status').textContent = \`\${products.length} products (status \${res.status})\`;
  console.log('Received', products);
  render();
}

document.getElementById('q').addEventListener('input', (e) => render(e.target.value));
load();`,
  },
  {
    id: 'component',
    title: 'Components without a framework',
    blurb: 'Build reusable UI from functions that take props, hold state and re-render.',
    topic: 'react',
    topicTitle: 'React',
    tint: '#64d2ff',
    html: `<h2>Reusable components</h2>
<div id="app"></div>`,
    css: `${BASE_CSS}.rating { display: flex; align-items: center; gap: 6px; margin: 10px 0; padding: 12px 14px; background: #fff; border-radius: 12px; }
.rating b { flex: 1; font-weight: 600; }
.star { border: 0; background: none; font-size: 22px; color: #d2d2d7; cursor: pointer; padding: 0 2px; }
.star.on { color: #ff9f0a; }`,
    js: `// h() creates an element: h('button', { class: 'x', onClick }, 'text')
function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key.startsWith('on')) el.addEventListener(key.slice(2).toLowerCase(), value);
    else el.setAttribute(key, value);
  }
  el.append(...children);
  return el;
}

// A component: props in, element out. It owns its state and re-renders itself.
function Rating({ label, value = 0, max = 5, onChange }) {
  const root = h('div', { class: 'rating' });
  function render() {
    root.replaceChildren(
      h('b', {}, label),
      ...Array.from({ length: max }, (_, i) =>
        h('button', {
          class: i < value ? 'star on' : 'star',
          'aria-label': \`\${i + 1} stars\`,
          onClick: () => { value = i + 1; render(); onChange?.(value); },
        }, '★'),
      ),
    );
  }
  render();
  return root;
}

const app = document.getElementById('app');
['Design', 'Speed', 'Support'].forEach((label, i) => {
  app.append(Rating({ label, value: i + 2, onChange: (v) => console.log(label, '→', v) }));
});`,
  },
  {
    id: 'canvas',
    title: 'Canvas animation',
    blurb: 'Bouncing particles drawn with the 2D canvas API and requestAnimationFrame.',
    topic: 'javascript',
    topicTitle: 'JavaScript',
    tint: '#bf5af2',
    html: `<canvas id="c"></canvas>
<p class="hint">Click to add particles.</p>`,
    css: `html, body { margin: 0; height: 100%; background: #0b0b14; overflow: hidden; }
canvas { display: block; width: 100%; height: 100%; }
.hint { position: fixed; left: 12px; bottom: 6px; margin: 0; color: #fff8; font: 13px system-ui, sans-serif; }`,
    js: `const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
const dots = [];

function resize() {
  canvas.width = innerWidth * devicePixelRatio;
  canvas.height = innerHeight * devicePixelRatio;
  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
}
addEventListener('resize', resize);
resize();

function add(x, y) {
  dots.push({
    x, y,
    vx: (Math.random() - 0.5) * 4,
    vy: (Math.random() - 0.5) * 4,
    r: 4 + Math.random() * 8,
    hue: Math.floor(Math.random() * 360),
  });
}
for (let i = 0; i < 40; i++) add(Math.random() * innerWidth, Math.random() * innerHeight);
canvas.addEventListener('click', (e) => { for (let i = 0; i < 8; i++) add(e.clientX, e.clientY); });

function frame() {
  ctx.fillStyle = 'rgba(11, 11, 20, 0.25)';
  ctx.fillRect(0, 0, innerWidth, innerHeight);
  for (const d of dots) {
    d.x += d.vx;
    d.y += d.vy;
    if (d.x < d.r || d.x > innerWidth - d.r) d.vx *= -1;
    if (d.y < d.r || d.y > innerHeight - d.r) d.vy *= -1;
    ctx.beginPath();
    ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
    ctx.fillStyle = \`hsl(\${d.hue} 90% 60%)\`;
    ctx.fill();
  }
  requestAnimationFrame(frame);
}
frame();`,
  },
  {
    id: 'form',
    title: 'Form with validation',
    blurb: 'Check fields as the user types and show clear, specific error messages.',
    topic: 'html',
    topicTitle: 'HTML',
    tint: '#ff375f',
    html: `<form id="signup" novalidate>
  <h2>Create account</h2>

  <label for="email">Email</label>
  <input id="email" type="email" autocomplete="email" />
  <small class="err" id="email-err"></small>

  <label for="pw">Password</label>
  <input id="pw" type="password" autocomplete="new-password" />
  <small class="err" id="pw-err"></small>

  <label class="check"><input id="terms" type="checkbox" /> I agree to the terms</label>
  <small class="err" id="terms-err"></small>

  <!-- type="button": the preview is sandboxed, so we validate in JavaScript instead of submitting -->
  <button type="button" id="go">Sign up</button>
  <p id="result" role="status"></p>
</form>`,
    css: `${BASE_CSS}form { max-width: 340px; display: flex; flex-direction: column; gap: 6px; padding: 22px; background: #fff; border-radius: 18px; box-shadow: 0 4px 18px rgba(0, 0, 0, 0.08); }
h2 { margin: 0 0 8px; }
label { font-size: 13px; font-weight: 600; margin-top: 8px; }
input[type=email], input[type=password] { padding: 10px; border-radius: 10px; border: 1px solid #d2d2d7; font: inherit; }
input.bad { border-color: #ff3b30; background: #fff5f5; }
input.good { border-color: #30d158; }
.check { font-weight: 400; display: flex; gap: 8px; align-items: center; }
.err { color: #ff3b30; min-height: 1em; font-size: 12px; }
button { margin-top: 10px; padding: 11px; border: 0; border-radius: 10px; background: #0a84ff; color: #fff; font: inherit; font-weight: 600; cursor: pointer; }
#result { color: #248a3d; font-weight: 600; }`,
    js: `const rules = {
  email: (v) => (!v ? 'Email is required.' : !v.includes('@') || !v.includes('.') ? 'Enter a valid email address.' : ''),
  pw: (v) => (v.length < 8 ? 'Use at least 8 characters.' : !/[0-9]/.test(v) ? 'Add at least one number.' : ''),
};

function check(id) {
  const input = document.getElementById(id);
  const msg = rules[id](input.value.trim());
  document.getElementById(id + '-err').textContent = msg;
  input.classList.toggle('bad', !!msg);
  input.classList.toggle('good', !msg);
  return !msg;
}

['email', 'pw'].forEach((id) => {
  document.getElementById(id).addEventListener('input', () => check(id));
});

document.getElementById('go').addEventListener('click', () => {
  const ok = [check('email'), check('pw')].every(Boolean);
  const terms = document.getElementById('terms').checked;
  document.getElementById('terms-err').textContent = terms ? '' : 'Please accept the terms.';
  const result = document.getElementById('result');
  if (ok && terms) {
    result.textContent = 'All fields are valid.';
    console.log('Valid form data:', { email: document.getElementById('email').value });
  } else {
    result.textContent = '';
    console.warn('Form has errors');
  }
});`,
  },
  {
    id: 'todo',
    title: 'To-do list (in memory)',
    blurb: 'Add, complete, filter and delete tasks, with state kept in a plain array.',
    topic: 'javascript',
    topicTitle: 'JavaScript',
    tint: '#ff9f0a',
    html: `<div class="todo">
  <h2>To-do</h2>
  <div class="row">
    <input id="text" placeholder="What needs doing?" />
    <button id="add">Add</button>
  </div>
  <div class="filters">
    <button data-f="all" class="on">All</button>
    <button data-f="open">Open</button>
    <button data-f="done">Done</button>
  </div>
  <ul id="list"></ul>
  <small id="left"></small>
</div>`,
    css: `${BASE_CSS}.todo { max-width: 380px; padding: 20px; background: #fff; border-radius: 18px; }
h2 { margin-top: 0; }
.row { display: flex; gap: 8px; }
.row input { flex: 1; padding: 9px 10px; border-radius: 10px; border: 1px solid #d2d2d7; font: inherit; }
button { border: 0; border-radius: 10px; padding: 9px 14px; background: #0a84ff; color: #fff; font: inherit; cursor: pointer; }
.filters { display: flex; gap: 6px; margin: 12px 0 4px; }
.filters button { background: #f2f2f7; color: #1d1d1f; padding: 6px 12px; }
.filters button.on { background: #1d1d1f; color: #fff; }
ul { list-style: none; padding: 0; }
li { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid #f2f2f7; }
li span { flex: 1; }
li.done span { text-decoration: line-through; color: #8e8e93; }
li button { background: none; color: #ff3b30; padding: 4px 8px; }
small { color: #8e8e93; }`,
    js: `// The preview is sandboxed (no localStorage), so the list lives in memory.
// In a real app you would save 'todos' with localStorage or an API.
let todos = [
  { id: 1, text: 'Learn flexbox', done: true },
  { id: 2, text: 'Build a to-do app', done: false },
];
let filter = 'all';
let nextId = 3;

const list = document.getElementById('list');
const input = document.getElementById('text');

function render() {
  const shown = todos.filter((t) => filter === 'all' || (filter === 'done') === t.done);
  list.replaceChildren(...shown.map((t) => {
    const li = document.createElement('li');
    li.className = t.done ? 'done' : '';
    li.innerHTML = \`<input type="checkbox" \${t.done ? 'checked' : ''}><span></span><button aria-label="Delete">✕</button>\`;
    li.querySelector('span').textContent = t.text;
    li.querySelector('input').addEventListener('change', () => { t.done = !t.done; render(); });
    li.querySelector('button').addEventListener('click', () => { todos = todos.filter((x) => x !== t); render(); });
    return li;
  }));
  const left = todos.filter((t) => !t.done).length;
  document.getElementById('left').textContent = \`\${left} item\${left === 1 ? '' : 's'} left\`;
}

function add() {
  const text = input.value.trim();
  if (!text) return;
  todos.push({ id: nextId++, text, done: false });
  input.value = '';
  render();
}

document.getElementById('add').addEventListener('click', add);
input.addEventListener('keydown', (e) => { if (e.key === 'Enter') add(); });
document.querySelectorAll('.filters button').forEach((b) => b.addEventListener('click', () => {
  filter = b.dataset.f;
  document.querySelectorAll('.filters button').forEach((x) => x.classList.toggle('on', x === b));
  render();
}));
render();`,
  },
  {
    id: 'sorting',
    title: 'Sorting visualizer',
    blurb: 'Watch bubble, insertion and selection sort compare and swap, step by step.',
    topic: 'dsa',
    topicTitle: 'Data Structures & Algorithms',
    tint: '#34c759',
    html: `<div class="controls">
  <select id="algo">
    <option value="bubble">Bubble sort</option>
    <option value="insertion">Insertion sort</option>
    <option value="selection">Selection sort</option>
  </select>
  <button id="shuffle">Shuffle</button>
  <button id="sort" class="primary">Sort</button>
  <span id="stats">0 comparisons</span>
</div>
<div id="bars"></div>`,
    css: `${BASE_CSS}body { background: #101014; color: #f5f5f7; }
.controls { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 14px; }
select, button { padding: 8px 12px; border-radius: 10px; border: 0; font: inherit; background: #2c2c2e; color: #fff; }
button.primary { background: #30d158; color: #000; font-weight: 600; }
button:disabled { opacity: 0.4; }
#stats { font-size: 13px; color: #a1a1a6; }
#bars { display: flex; align-items: flex-end; gap: 3px; height: 260px; }
.bar { flex: 1; background: #3a3a3c; border-radius: 4px 4px 0 0; transition: height 0.08s; }
.bar.cmp { background: #ffd60a; }
.bar.swap { background: #ff453a; }
.bar.done { background: #30d158; }`,
    js: `const N = 32;
const barsEl = document.getElementById('bars');
let arr = [];
let running = false;
let comparisons = 0;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function shuffle() {
  arr = Array.from({ length: N }, (_, i) => i + 1).sort(() => Math.random() - 0.5);
  comparisons = 0;
  draw();
}

function draw(mark = {}) {
  barsEl.replaceChildren(...arr.map((v, i) => {
    const b = document.createElement('div');
    b.className = 'bar ' + (mark[i] || '');
    b.style.height = (v / N) * 100 + '%';
    return b;
  }));
  document.getElementById('stats').textContent = comparisons + ' comparisons';
}

async function compare(i, j) {
  comparisons++;
  draw({ [i]: 'cmp', [j]: 'cmp' });
  await sleep(25);
  return arr[i] > arr[j];
}

async function swap(i, j) {
  [arr[i], arr[j]] = [arr[j], arr[i]];
  draw({ [i]: 'swap', [j]: 'swap' });
  await sleep(25);
}

const algorithms = {
  async bubble() {
    for (let end = arr.length - 1; end > 0; end--) {
      for (let i = 0; i < end; i++) {
        if (await compare(i, i + 1)) await swap(i, i + 1);
      }
    }
  },
  async insertion() {
    for (let i = 1; i < arr.length; i++) {
      for (let j = i; j > 0 && (await compare(j - 1, j)); j--) await swap(j - 1, j);
    }
  },
  async selection() {
    for (let i = 0; i < arr.length - 1; i++) {
      let min = i;
      for (let j = i + 1; j < arr.length; j++) {
        if (await compare(min, j)) min = j;
      }
      if (min !== i) await swap(i, min);
    }
  },
};

document.getElementById('shuffle').addEventListener('click', () => { if (!running) shuffle(); });
document.getElementById('sort').addEventListener('click', async (e) => {
  if (running) return;
  running = true;
  e.target.disabled = true;
  const name = document.getElementById('algo').value;
  const t = performance.now();
  await algorithms[name]();
  draw(Object.fromEntries(arr.map((_, i) => [i, 'done'])));
  console.log(\`\${name} sort: \${comparisons} comparisons in \${Math.round(performance.now() - t)} ms\`);
  running = false;
  e.target.disabled = false;
});
shuffle();`,
  },
  {
    id: 'oop',
    title: 'Classes & OOP',
    blurb: 'Encapsulation, inheritance and polymorphism with JavaScript classes.',
    topic: 'oop',
    topicTitle: 'Object-Oriented Programming',
    tint: '#af52de',
    html: `<h2>Shapes</h2>
<div id="shapes"></div>`,
    css: `${BASE_CSS}#shapes { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px; }
.shape { padding: 16px; background: #fff; border-radius: 14px; box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08); }
.shape svg { display: block; margin-bottom: 8px; }
.shape small { color: #6e6e73; }`,
    js: `// Abstract base class: shared behaviour + a contract for subclasses
class Shape {
  static count = 0;
  #name; // private field (encapsulation)

  constructor(name) {
    if (new.target === Shape) throw new Error('Shape is abstract');
    this.#name = name;
    Shape.count++;
  }
  get name() { return this.#name; }
  area() { throw new Error('area() not implemented'); }
  describe() { return \`\${this.name}: area \${this.area().toFixed(1)}\`; }
}

// Inheritance
class Circle extends Shape {
  constructor(r) { super('Circle'); this.r = r; }
  area() { return Math.PI * this.r ** 2; }
  svg() { return \`<circle cx="40" cy="40" r="\${this.r}" fill="#0a84ff"/>\`; }
}

class Rectangle extends Shape {
  constructor(w, h) { super('Rectangle'); this.w = w; this.h = h; }
  area() { return this.w * this.h; }
  svg() { return \`<rect x="\${40 - this.w / 2}" y="\${40 - this.h / 2}" width="\${this.w}" height="\${this.h}" rx="4" fill="#ff9f0a"/>\`; }
}

class Square extends Rectangle {
  constructor(s) { super(s, s); }
  get name() { return 'Square'; }
}

const shapes = [new Circle(30), new Rectangle(70, 40), new Square(50)];

// Polymorphism: same call, different behaviour
document.getElementById('shapes').innerHTML = shapes
  .map((s) => \`<div class="shape"><svg width="80" height="80">\${s.svg()}</svg><b>\${s.name}</b><br><small>\${s.describe()}</small></div>\`)
  .join('');

shapes.forEach((s) => console.log(s.describe()));
console.log('Shapes created:', Shape.count);

try {
  new Shape('Nope');
} catch (err) {
  console.warn('Expected:', err.message);
}`,
  },
  {
    id: 'tests',
    title: 'A tiny test runner',
    blurb: 'Write test() and expect() from scratch and see passing and failing tests in the console.',
    topic: 'testing',
    topicTitle: 'Testing',
    tint: '#8e8e93',
    html: `<h2>Tests</h2>
<p>Results appear below and in the Console panel.</p>
<ul id="out"></ul>`,
    css: `${BASE_CSS}ul { list-style: none; padding: 0; }
li { padding: 8px 12px; margin: 6px 0; border-radius: 10px; background: #fff; font-family: ui-monospace, Menlo, monospace; font-size: 13px; }
li.pass { border-left: 4px solid #30d158; }
li.fail { border-left: 4px solid #ff3b30; }`,
    js: `// Code under test
const add = (a, b) => a + b;
const slugify = (s) => s.toLowerCase().trim().split(' ').filter(Boolean).join('-');

// A minimal test framework
const results = [];
function expect(actual) {
  return {
    toBe(expected) {
      if (actual !== expected) throw new Error(\`expected \${JSON.stringify(expected)}, got \${JSON.stringify(actual)}\`);
    },
  };
}
function test(name, fn) {
  try {
    fn();
    results.push({ name, ok: true });
    console.log('✓', name);
  } catch (err) {
    results.push({ name, ok: false, msg: err.message });
    console.error('✗', name, '—', err.message);
  }
}

test('adds two numbers', () => expect(add(2, 3)).toBe(5));
test('slugify makes lowercase dashes', () => expect(slugify('Hello World')).toBe('hello-world'));
test('slugify trims spaces', () => expect(slugify('  Code  Playground ')).toBe('code-playground'));
test('this one fails on purpose', () => expect(add(0.1, 0.2)).toBe(0.3));

document.getElementById('out').innerHTML = results
  .map((r) => \`<li class="\${r.ok ? 'pass' : 'fail'}">\${r.ok ? 'PASS' : 'FAIL'} — \${r.name}\${r.msg ? '<br>' + r.msg : ''}</li>\`)
  .join('');
console.log(\`\${results.filter((r) => r.ok).length}/\${results.length} passed\`);`,
  },
];

/** The first project a new visitor sees. */
export const PG_WELCOME = {
  name: 'Hello, Playground',
  html: `<main class="hello">
  <h1>Hello, Playground</h1>
  <p>Edit the HTML, CSS and JavaScript — the preview updates as you type.</p>
  <button id="btn">Click me</button>
  <p id="msg"></p>
</main>`,
  css: `body {
  margin: 0;
  min-height: 100vh;
  display: grid;
  place-items: center;
  font-family: system-ui, -apple-system, sans-serif;
  background: linear-gradient(135deg, #e0f0ff, #f5e8ff);
  color: #1d1d1f;
}
.hello { text-align: center; padding: 24px; }
h1 { font-size: 34px; margin: 0 0 8px; }
button {
  margin-top: 12px;
  padding: 10px 18px;
  border: 0;
  border-radius: 12px;
  background: #0a84ff;
  color: #fff;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}`,
  js: `let clicks = 0;
document.getElementById('btn').addEventListener('click', () => {
  clicks++;
  document.getElementById('msg').textContent = \`Clicked \${clicks} time\${clicks === 1 ? '' : 's'}\`;
  console.log('click', clicks);
});
console.log('Ready! Open the Console panel to see logs.');`,
};
