# M.R. Ahamed — Portfolio (v10: Mac · iPhone · iPad)

An interactive portfolio that becomes a **Mac on computers, an iPhone on phones and an iPad on tablets** for **M.R. Ahamed** — Computer Science Undergraduate & Full-Stack Developer (Kandy, Sri Lanka).

Built with **React 19 + TypeScript + Vite**. No UI or animation libraries — the window manager, Dock magnification and all animations are hand-written (Web Animations API, CSS transforms and `requestAnimationFrame`), so the bundle stays small and the motion stays at 60 fps.

---

## What's new in v10

- **Three devices, one portfolio.** Computers get the full macOS desktop; phones get a complete iPhone (Lock Screen, Home Screen pages with widgets, 4-app Dock — Phone, Messages, Safari, Music — App Library, Today View, folders, Dynamic Island, Control Centre, Notification Centre, App Switcher, Search, iOS Settings, AssistiveTouch, StandBy); tablets get an iPad (6-column grid, Dock with recent apps, Split View, Slide Over, Stage Manager). *Settings → Devices & View → View as* (or `?view=mac|iphone|ipad`) lets anyone preview any device.
- **Quick View (Classic Site):** the whole CV on one fast, printable page — `?view=classic`, the  menu, or Settings.
- **Content from the new CV** (Oct 2026): skills, projects, responsibilities, links and the CV PDF/pages.
- **Mac:** canvas Genie (smooth, with automatic fallback), trackpad pinch → Mission Control / App Exposé / Launchpad (the page never zooms), Desktops (Spaces) with per-desktop wallpaper (two-finger swipe, Ctrl+←/→, Ctrl+1…6), green-button tiling menu, notch with Dynamic Island, wallpaper parallax, Liquid Glass edges, Emoji & Symbols, optional login user picker, crash recovery per app.
- **Undo / Redo everywhere** (⌘Z / ⇧⌘Z, shake or three-finger double-tap on touch), Cut/Copy/Paste/Select All, **Trash & Recently Deleted** with Put Back, delete confirmations.
- **Photos:** Live Photos, Hidden and Recently Deleted albums (locked with a simple demo lock — no biometrics), Duplicates, multi-select, non-destructive editing with Revert.
- **Sounds:** original "Portfolio Ding" notification tone, original ringtones (calls, alarms, timers) and upload-your-own sound (kept only in the visitor's browser).
- **New apps:** Phone, Shortcuts, Chess, TextEdit.
- **Performance:** sized WebP wallpapers with blur-up, automatic quality reduction on slow devices, hidden tabs pause animations.
- **Backup & Restore** of all visitor data; offline page; 404 page; share previews; Vercel config; optional AI and analytics hooks.

---

## Quick start

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build → dist/
npm run preview    # serve the production build
npm run lint       # ESLint (typescript-eslint + react-hooks)
```

Requires Node.js 18+ (20 LTS or newer recommended).

The production build uses relative paths (`base: './'`), so `dist/` can be deployed to any static host — GitHub Pages, Netlify, Vercel, Cloudflare Pages or a sub-folder.

> **Speed tip:** `npm run dev` is a development server and is much slower than the real site. To see true speed run `npm run build && npm run preview`.

### Publish on Vercel (recommended)

1. Push this folder to a GitHub repository.
2. On vercel.com → **Add New → Project** → import the repository. Vercel reads `vercel.json` (framework *Vite*, output `dist`). Click **Deploy**.
3. Optional — *Ask Me AI* with a real model: in Vercel → Settings → Environment Variables add `ANTHROPIC_API_KEY`, then set `integrations.aiEndpoint = '/api/ask'` in `src/data/portfolio.ts` and redeploy. The key stays on the server (`api/ask.js`); without it the app keeps its on-device answers.
4. Optional — analytics: set `integrations.analyticsScript` / `analyticsId` (e.g. Plausible or Umami). Nothing loads when empty.

The share preview (`og-image.jpg`) and links use `https://m-r-ahamed-portfolio.vercel.app`; change them in `index.html` and `integrations.siteUrl` if your address differs.

---

## What's inside

| Desktop / Dock item | App | What it shows |
|---|---|---|
| Finder (Dock) | **About This Portfolio** | Photo, headline, key facts, bio, Open CV / GitHub / LinkedIn |
| Safari | **Start Page** | Favourites (GitHub, LinkedIn, Email, Call, CV) + every GitHub repository, with live search |
| Notes / *My Skills* | **Notes** | 10 skill notes — languages, web & backend, APIs & security, databases, mobile & desktop, tools, engineering, business, languages |
| *Achievements.pptx* | **Slide deck** | Loading → blur reveal, 9 slides (summary, 4 ventures with metrics, leadership, education, contact), keyboard ←/→, hover thumbnails, full screen |
| *Portfolio.xcodeproj* | **Xcode** | Project navigator, tabs, syntax-highlighted source per project, simulator/browser preview with boot animation, Info inspector, “Find in project”, Build & Run, repository button |
| Mail | **Contact Me** | Composer that opens the visitor's mail client via `mailto:` (no API keys), copy email, call, LinkedIn |
| System Settings | **Settings** | Light/Dark appearance, 5 wallpapers, Dock magnification on/off, amount, size, Reduce motion |
| Terminal | **zsh** | `help`, `whoami`, `about`, `skills`, `projects`, `open <n>`, `experience`, `education`, `leadership`, `languages`, `github`, `linkedin`, `resume`, `contact`, `mail`, `theme`, `clear` (history ↑/↓, Tab completion) |
| *Experience* folder / Trash | **Finder** | Experience, Education, Leadership, Projects, Trash — icon/list views with a detail pane |
| *CV — Ahamed.pdf* | **Preview** | Page thumbnails, page navigation, zoom, Open PDF, Download |

**Window system:** open / close / minimise (genie-style into the Dock) / restore / maximise (green button or double-click the title bar) / drag / resize / focus & z-order, active vs inactive styling, menu bar follows the focused app.

**Menu bar:** logo menu (About, Settings, Open CV, GitHub, LinkedIn, Restart…), app menu, File, Edit (copy email/phone), View (Dark Mode, Full Screen), Go, Window (minimise, zoom, window list), Help (tips, profiles), dark-mode toggle, live clock.

**Widgets:** calendar (current month) and analogue clocks for Kandy and the visitor's own time zone (click “Your Time ✎” to change it).

**Responsive:** on phones windows open near-full-screen with their title bar and controls, desktop icons open with a single tap, and the Dock scrolls horizontally. Tablets get a Dock that shrinks to fit.

**Accessibility:** semantic landmarks, labelled buttons, keyboard support (Enter on desktop icons, arrows in Notes / slides / terminal history, Esc closes menus), visible focus rings, and `prefers-reduced-motion` plus an in-app *Reduce motion* switch.

---

## Version 2 — system features

- **Boot & shutdown**: Apple-style startup mark + progress bar, then a staged entrance (wallpaper → menu bar → widgets → icons → Dock). *Restart…* and *Shut Down…* in the logo menu play the reverse sequence. Shown once per browser session; press any key or click to skip.
- **Dock**: cursor-proximity magnification driven by spring physics in `requestAnimationFrame` (no React re-renders), upward lift, click compression, launch bounce, running dots, minimised-window slots, Launchpad, Downloads stack, right-click menus. Sections: System · Portfolio · Social · Utility.
- **Control Center** (menu-bar switch icon): Wi-Fi / Bluetooth / AirDrop (simulated, with expandable panels), Light/Dark (real), Keyboard Brightness (simulated), Fullscreen (real Fullscreen API), Focus (really silences banners), Battery (real where the browser exposes it), Display brightness (real dimming layer), Sound (real player volume), Now Playing (real player).
- **Notification Center** (click the clock): Today, Current, Highlights, Recent (live notification history) and a verified Timeline. Contextual banners appear top-right for GitHub, theme, wallpaper, CV, Photos, Music, projects, Mail and Messages.
- **Launchpad** (Dock or F4), **Spotlight** (⌘/Ctrl + Space or ⌘/Ctrl + K), **Quick Look** (Space on a selected item), **context menus** (right-click desktop, icons, Dock, photos).
- **Reminders, Maps & Google**: a Reminders checklist (saved on the device), a Maps app with an embedded Google Map of Kandy, Colombo and Gampola plus search, *Open in Google Maps* and *Directions*, and a Google start page whose searches open google.com.
- **Calculator, Clock & Contacts**: a macOS-style Calculator (click or type on the keyboard), a Clock with World Clock (Kandy, Dubai, London, New York, Tokyo and your own time), Stopwatch with laps and a Timer that chimes and sends a notification, and a Contacts card for M.R. Ahamed with call / message / mail / map shortcuts, copy buttons, all social profiles and a *Download vCard* button.
- **Music & Reminders widgets**: a Now Playing desktop widget (play / pause / next / previous, progress, animated equaliser) that controls the same player as the Music app, and a Reminders widget where you can tick items off right on the desktop — it stays in sync with the Reminders app.
- **Start-up emblem**: the boot screen draws an original `</>` code emblem (also used in the menu bar) before fading into the desktop. It lives in one SVG (`Logo` in `src/components/MenuBar.tsx`).

### Version 5 additions
- **Main menu** (top-left `</>` emblem): About This Mac, System Settings, Location, App Store, Recent Items, Force Quit (⌥⌘⎋ / Ctrl+Alt+Esc), Sleep, Restart, Shut Down, Lock Screen (⌃⌘Q / Ctrl+Alt+Q) and Log Out — with macOS-style confirmation sheets, a lock screen (no password), display sleep, and the emblem fading in and out on shutdown/restart. Optional start-up chime (System Settings → Sound).
- **Privacy Shield** in the menu bar: shows whether the page is served over HTTPS and — only when you open it — your public IP, location and ISP (via ipapi.co). It can't detect a VPN and says so.
- **New apps**: Camera (live camera with effects, countdown and downloads — asks for permission; photos stay on the device), Voice Memos (microphone recorder with waveform), Measure (on-screen ruler with calibration + Level on phones), Find My, Home (demo home that really switches Night Shift, brightness, music, Focus and Dark Mode), Weather (Open-Meteo, any city), Pages (Résumé built from the portfolio data, export PDF), Numbers (Projects / Skills / Education sheets with formulas and CSV export), App Store (projects as apps) and Tips.
- **Launchpad** redesigned like macOS: "Search Applications", pages with dots, Utilities and Other folders, a live Reminders badge. **Mission Control** (F3 or Ctrl+↑) shows all open windows.
- **System Settings** redesigned like macOS (account row, grouped sidebar, back/forward): General (About, Software Update, Storage, AirDrop, Language, Date & Time), Appearance with Auto mode and accent colours, Wallpaper, Displays with Night Shift, Desktop & Dock, Control Center, Battery (real battery API), Sound (alert sounds), Focus, Notifications, Screen Time (real usage), Lock Screen, Privacy & Security (real permission states), Wi-Fi/Network/Bluetooth. Works as an iPhone-style list on phones.
- **Photos** redesigned like the macOS Photos app (Library, Collections, Pinned, Recently Deleted, floating toolbar with zoom, favourites, info, rotate and search).
- **Widgets**: 8 widgets in an aligned three-column grid, including the new **Screen Time** widget.
- **Desktop**: 10 items — added Résumé.pages, Projects.numbers, Screenshots and M.R. Ahamed.vcf; icons wrap into a second column instead of going under the Dock.
- **Wallpapers**: added Midnight Waves, Champagne Waves and Violet Fan (supplied by M.R. Ahamed). **Music**: 5 more original tracks (8 in total).

- **New apps**: Photos (your portraits + portfolio screenshots, favourites, Quick Look, viewer, slideshow, Memories, People), Messages (`sms:` hand-off), Calendar (real milestones + GitHub push dates), Music (real audio player, shared with Control Center).
- **Widgets**: Weather for Kandy (live, Open-Meteo — no key), GitHub summary, Current Project; widgets dim while you work in a window.
- **13 original wallpapers** with blur cross-fade, categories and an optional Dark-Mode graphite tint; the menu bar switches to dark text on light wallpapers.
- **Content**: all 9 public GitHub repositories (incl. Restaurant POS, EduLearn LMS, MediCarePlus), skills expanded from the GitHub profile README with project evidence, a Finder-style experience browser (All / Entrepreneurial / Technology / Business / Leadership / University) and a Timeline.

---

### Version 6 additions
- **Start-up flow**: start-up screen (emblem + progress bar, macOS layout) → **lock screen** (swipe up, click or press Enter) → desktop.
- **Wallpapers**: 6 more supplied by M.R. Ahamed — Liquid Glass, Ocean Shore, Big Sur Waves, Alpine Glow, Violet Pills and Black Curves (22 in total).
- **Music** redesigned like Apple Music (Home with Top Picks / Recently Played / Made for You, New, Radio, Recently Added, Artists, Albums, Songs with real durations, Favourite Songs, playlists, floating mini-player) — now **10 original tracks**.
- **Contacts** redesigned in the three-column macOS layout (groups, list, card with message / call / video / mail / directions, all profiles, private note, share as vCard).
- **Control Center**: real network status on Wi-Fi, a live Kandy weather tile, and new controls — Airplane Mode, Cellular Data, Hotspot, Screen Mirroring (simulated), **Screen Recording** and **Screenshot** (real, via the browser's screen picker; files save to the visitor's device), Timer, Stopwatch, Calculator, Voice Memo, Camera and Night Shift.
- **Edit apps & widgets**: in Launchpad press **Edit** (or press-and-hold an icon) — icons jiggle, drag to rearrange, click **×** to delete (with a macOS confirmation). Right-click the desktop → **Edit Widgets…** (or right-click a widget) — drag to reorder, **−** to remove, **+** in the widget gallery to add. Deleted apps and removed widgets go to the **Trash** (Dock → Trash) where you can **Put Back** or **Empty** them; "Restore defaults" in Launchpad edit mode resets everything.

## Updating your content — one file

Everything personal lives in **`src/data/portfolio.ts`**:

- `personal`, `socials`, `cv` — name, headline, contact details, links, CV files
- `aboutRows` — the facts table in *About This Portfolio*
- `skillNotes` — the Notes app (also feeds the Terminal `skills` command)
- `projects` — the Xcode navigator, Safari repositories, Finder *Projects*, Terminal
- `education`, `ventures`, `cvBusinessRole`, `leadership`, `spokenLanguages`

**Add a new GitHub project:** append an object to `projects` (set `group: 'GitHub'` and `repo`). The navigator, tabs, generated source file, preview, inspector, Safari, Finder and Terminal all pick it up automatically.

**Replace the CV:** put the new PDF in `public/cv/M_R_AHAMED_CV.pdf` and regenerate the page images (used by the Preview app so the CV renders on every device):

```bash
pdftoppm -r 130 -jpeg -jpegopt quality=85 public/cv/M_R_AHAMED_CV.pdf public/cv/page
```

If the page count changes, update `cv.pages` in `portfolio.ts`.

**Replace the photo:** `public/images/ahamed.jpg` (portrait) and `public/images/ahamed-avatar.jpg` (square crop).

**Photos, wallpapers, music:** registered in **`src/data/media.ts`** — files live in `public/assets/photos`, `public/assets/screenshots`, `public/assets/wallpapers` (+ `thumbs/`) and `public/assets/music`. The bundled music is original royalty-free ambient audio generated for this portfolio; swap in your own licensed MP3s and list them in `tracks`.

---

## Project structure

```
index.html
public/
  cv/            M_R_AHAMED_CV.pdf + page-1.jpg, page-2.jpg
  images/        ahamed.jpg, ahamed-avatar.jpg
  favicon.svg
src/
  data/portfolio.ts          ← all personal content
  system/                    window manager, settings, app registry, storage
  components/                Desktop, MenuBar, Dock, Window, Wallpaper, Widgets, DesktopIcons, AppIcons
  apps/                      About, Safari, Notes, Slides, Xcode (+ codegen, preview), Mail, Settings, Terminal, Finder, Preview
  styles/                    global.css (system), apps.css (applications)
```

Apps are code-split with `React.lazy` and load on first launch.

---

## Content sources & notes

- **Projects:** the six public repositories on github.com/Ahamed369 (HealthForge Fitness, Student Expense Tracker, NDI Registration System, Fidenz Weather App, City Walk, Student Record System) were read repo-by-repo (README, source tree, dependency files). *High Street Car Sale* and *Medicare Plus* come from the CV and are shown without a repository link because no public repository was found.
- **Experience:** the supplied venture notes (Mobile Kingdom, Tasco Car Sale, Ceylon Trade Link, Rizwan Homes & Developments) plus the CV's “Business Owner” summary.
- **Education, skills, leadership, languages:** the CV.
- Project previews in Xcode are **illustrative mock-ups** generated from each project's real feature list, not screenshots — they are labelled as such.
- The wallpaper and all app icons are original SVG artwork; no assets were copied from the reference site.

© M.R. Ahamed

## Version 7 additions

- **New apps:**
  - Apple-style: FaceTime, Podcasts, TV, Books, Stocks, Journal, Freeform, Siri, Passwords, Dictionary, Game Center, Photo Booth (the Camera app) and Keynote (Achievements slides).
  - Web services: Gmail, Drive, Google Photos, Classroom, Word, Excel, PowerPoint, ChatGPT, Claude, Gemini, DeepSeek, Shazam, Snapchat, Figma and W3Schools. Each one has a small in-portfolio page with a button that opens the real service in a new tab.
- **Launchpad:** new folders — Utilities, Other, Google, Microsoft 365 and AI.
- **Game Center:** 20 playable games, grouped into Puzzle, Arcade, Brain & IQ, Classic and Word. It includes achievements, local leaderboards and a “continue playing” list.
- **Redesigns:**
  - Clock, Calculator, Calendar (Day/Week/Month/Year) and Home (Automation and Discover).
  - Notes (Projects and My Notes folders), Reminders, Weather, Voice Memos, Messages, Pages (template chooser) and Tips.
- **Trash:** starts empty. Removing an app or widget turns the dock icon into a full bin with a small bounce.
- **Photos:** a Wallpapers album, plus a Videos section with 4 screen recordings of this portfolio.
- **New project:** FreshMart Website (HTML/CSS/JavaScript grocery e-commerce).
- **Mail:** messages are addressed to ahamedrock369@gmail.com, so replies arrive in the Gmail app on your phone.
- **Stocks** uses clearly-labelled demo data. **FaceTime** cannot place real calls, so it offers WhatsApp or a phone call instead.

## Version 8 additions

**Notifications**
- Glass notification cards following the macOS references. Hover shows a close (×) button in the top-left corner. You can swipe a card left or right to dismiss it, and each card can have an **Options ▾** menu and action buttons.
- Notifications have read and unread states. The menu-bar clock shows a red unread count, and Notification Center has **Mark All Read** and **Clear All**. Right-click a card to mark it read or unread, or to remove it.
- A soft chime plays with each banner (can be turned off in Settings → Sound or Notifications).
- Optionally, the Web Notifications API mirrors banners as real browser notifications while the tab is in the background. It asks the visitor's permission first and uses the service worker.
- Timed notifications once the visitor reaches the desktop:
  - ≈ 8 s: **Welcome**.
  - ≈ 45 s: **Follow me**, with round social icons that open GitHub, LinkedIn, Instagram, Facebook, Threads, WhatsApp and Spotify.
  - ≈ 90 s: a **Reminder**, with Options: Mark as Completed / Remind Me in an Hour / This Afternoon / Tomorrow.
  - ≈ 3 min: **Weather in Kandy**.
  - ≈ 5 min: a **Case study** suggestion.
- Reminders that have a date and time notify when they fall due.
- **Badges:** red badges with white numbers on the Dock and in Launchpad for Messages, Mail, Reminders, WhatsApp, Telegram, Yahoo Mail and Game Center. They clear when the app is opened; Reminders shows the pending count.

**Windows**
- **Genie effect** for minimise and restore (System Settings → Desktop & Dock → Minimize windows using: Genie / Scale).
- **Tiling:** drag a window to the left or right screen edge for halves, to a corner for quarters, or to the menu bar to fill the screen. A preview shows where it will land. You can also use Ctrl + Alt + ← / → / ↑ / ↓, the Window menu, or right-click a title bar.
- **Stage Manager:** turn it on from Control Center, the Window menu, Settings, or Ctrl + Alt + S.
- **Hot Corners** are real now (Settings → Desktop & Dock → Hot Corners…).
- **App Switcher:** Alt + Tab or Ctrl + `.
- **Keyboard shortcuts sheet:** Ctrl + / or F1.
- Right-click menus on the Dock (Open, Minimize, Hide Others, Remove from Dock, Quit, Empty Trash) and on window title bars.

**System**
- **Control Center** restyled in bright, glossy glass (per the references), with new tiles: Stage Manager, Share Portfolio and Hire Me.
- **Three new wallpapers** you supplied (Desert Night, Lone Cypress, Sage Waves), plus a **Dynamic** wallpaper that changes with the time of day.
- **Auto appearance:** follow the device, or switch at sunset and sunrise. Accent colours are selectable in Settings.
- **Power:** Sleep, Restart and Shut Down in the menu, in the Terminal, and on the lock screen. Sleep pauses music and animations.
- **Screen saver** (manual, from a Hot Corner, or after an idle time).
- **Low-battery warnings** at 20%, 10% and 5% using the Battery Status API, plus a test button in Settings → Battery.
- **Menu bar extras:** Download CV, now playing and a language switch.
- **Language:** English, Sinhala or Tamil for the system interface.
- **Accessibility:** text size, bold text, increase contrast, reduce transparency and reduce motion, plus a skip link and full keyboard navigation.
- **Sharing:** the Web Share API where available, otherwise a Share sheet (Messages, Mail, Gmail, Yahoo Mail, WhatsApp, Telegram, X, Facebook, LinkedIn, Threads, Copy Link). Shareable deep links look like `#/app/casestudies?project=freshmart`.
- **Installable and offline:** manifest, icons and service worker (a PWA). The Media Session API shows music on the lock screen and responds to media keys.
- **Seasonal decorations** appear on their dates, with a preview in Settings → General.
- **Start-up chime** styles: Classic, Soft or Bright.

**New apps**
- **Hire Me** (in the Dock): availability, top projects, skills, contacts, Download CV and **Book a Call**. The booking sends by email or WhatsApp and produces an .ics invite, or uses a booking link if you add one.
- **Case Studies:** problem, goals, role, process, challenges and solutions, outcomes, next steps, tech and architecture for every project. Includes **live GitHub status** from the GitHub REST API (stars, forks, languages, latest commits) and downloads for the source (.zip) and the case study (.md).
- **Ask Me AI:** an on-device assistant that answers only from the portfolio data, with no API key.
- **Guestbook:** sign, edit, delete, like, copy, share, search and sort entries.
- **Wallet:** opens behind the demo login. It holds passes for contact, education, experience and languages; visitors can add, edit, duplicate, reorder and delete their own. **Passwords** now also asks for the demo login.
- **WhatsApp** and **Telegram:** chats, pin, mute, archive, star, reply, edit, delete, forward, reactions and photo attachments. The M.R. Ahamed chat can send your text to the real WhatsApp, or by email for Telegram.
- **X:** a portfolio feed built from real milestones and projects (not an X account). Visitors can post, reply, like, repost, bookmark, pin, edit, delete and share to X.
- **Yahoo Mail**, and **Mail** rebuilt as a full client: Inbox, Flagged, Drafts, Sent, Archive and Trash, with reply, forward, flag, pin, move, restore and search. Send opens your email app (or Yahoo compose).
- **Google Play**, plus in-portfolio libraries for **Google Drive** and **Google Photos**. Downloading, uploading and installing ask the visitor to **sign in** first (Portfolio ID, or Sign in with Google).
- **App Store:** "GET" asks the visitor to sign in, then shows an install animation.
- **Create / edit / delete everywhere:**
  - Contacts: add, edit, delete, favourite, duplicate and vCard.
  - Messages: new conversations, edit, delete, tapbacks, forward, pin and unread.
  - Reminders: edit, details (date, time, priority, list, flag), custom lists, clear completed and search.
  - Notes: pin, duplicate, copy, share and Recently Deleted.
  - Pages: Save As, Open, Rename, Duplicate and Delete.
- **Music:** 8 new original lo-fi tracks, synthesised for this portfolio (royalty-free, no commercial music).
- **Terminal:** hire, casestudy, ask, guestbook, share, download cv, neofetch, lang, date, uptime, pwd, ls, echo, history, man, sleep, restart, shutdown and shortcuts. Tab completion, persistent history and clickable hints.
- **Game Center:** a **Daily Challenge** with a target and a streak, plus a seasonal events card.

## Version 9 additions

- **Genie effect**: minimize and restore now pour the window into the Dock along S-curve edges, in two phases like the real macOS effect. It works with the Dock at the bottom, left or right. Choose Genie or Scale in Desktop & Dock.
- **My Services** (Expertise & Capabilities): a new app and a new desktop folder, with two groups (01 Technology, 02 Entrepreneurship & Business).
  - Filter by group or area, search, and switch between grid and list views.
  - Each service opens a detail sheet linking to related projects (Case Studies / GitHub) and ventures (Finder).
  - Buttons open WhatsApp, LinkedIn and GitHub.
  - Service content is stored in `src/data/services.ts`.
- **WhatsApp**: every WhatsApp option opens a direct chat at `https://wa.me/94763539501`.
- **Calls**: FaceTime and WhatsApp call screens (incoming, ringing, active, ended), with:
  - reactions, an optional self-view camera and captions;
  - a clearly labelled demo, plus a button to open the real WhatsApp chat.
- **Dock and Launchpad**
  - A single click on Launchpad opens it; a double-click opens the Applications pop-up with category tabs.
  - Right-clicking a Dock app adds New Window, Options ▸ (Keep in Dock, Open at Login, Show in Finder, Add to Desktop, Remove from Dock), Show All Windows and Hide.
- **Desktop and widgets**
  - Right-click the desktop to choose Add Widgets… (9 new widgets that are never placed by default) or Add App to Desktop ▸.
  - Widgets and desktop icons can be dragged anywhere. Clean Up and Arrange Widgets in Columns put them back in order.
- **System Settings**
  - Desktop & Dock: Dock position, title-bar double-click, minimize into app icon, auto-hide, animate opening, indicators, and recent apps.
  - Displays: Resolution (scaled), Refresh Rate and Extended Displays (Window Management API).
  - Battery: Low Power Mode (works), Battery Health, Last 24 Hours / 10 Days, Battery Level and Screen On Usage.
  - Spotlight: real category filters, Results from System, Clipboard Search and Search Privacy.
  - Appearance: Icon & widget style (Default / Dark / Clear / Tinted), Folder color and Liquid Glass (Clear / Tinted).
  - Screen Time: filter by day or week and pick a date.
  - New panes: Intelligence & Siri, Menu Bar, Touch ID & Password, Internet Accounts, Game Center, Wallet & Pay, Keyboard, Trackpad, Printers & Scanners. (v10.3: renamed Assistant and Login & Password — no biometrics.)
- **System Preferences**: a classic icon-grid app that opens the matching modern panes.
- **About This Mac**: MacBook illustration, plus Chip, Memory, Startup disk, Serial and macOS rows.
- **Control Center**: Recognize Music, Low Power Mode, Text Size, Accessibility Shortcuts, Quick Note, FaceTime and Edit Controls.
- **New apps**: My Services, System Preferences, Activity Monitor (real frame-rate, memory and network measurements), Stickies, Translate (MyMemory), Font Book, Grapher and Digital Color Meter. Web services added: Google Docs, Discord, Reddit, Pinterest, Stack Overflow and Canva.
- **Other changes**
  - The Clock icon is live.
  - Calculator rows always fit the window.
  - Snake steers with WASD on any keyboard layout, and a reversed first key still turns.
  - Wallpapers were re-rendered at 3840×2400, with 6 new 4K wallpapers and a new Abstract category.
  - Any photo (or an uploaded image) can be used as the wallpaper.
  - 5 new screenshots in Photos and 4 new original lo-fi tracks.

## v10 update — everything added in the cross-check

**New on every device**
- **My Files** in Finder (Files on iPhone): drag real files from your computer into the window or click *Add Files…*. Preview images, video, audio, PDF and text; rename, duplicate (⌘D), download, delete, and colour **Tags** (sidebar → Tags). Files stay in this browser's IndexedDB (15 MB each, 80 MB total) and are never uploaded.
- **Photos → Imports**: drag photos in or press ＋.
- **Safari**: tabs (⌘-style tab strip on Mac, tab grid on iPhone), **Private Browsing** tabs, and a **Reading List** (☆ on any favourite or repository).
- **Picture in Picture**: Music (⧉ button — a real floating window in Chrome/Edge, an in-page mini player elsewhere) and the TV app's videos.
- **Dictation**: a 🎤 button appears beside text fields; uses the browser's own speech recognition.
- **Screen Time limits & Downtime** (Settings → Screen Time): an hourglass cover with *One More Minute* / *Ignore Limit for Today*.
- **Per-app notifications** (Settings → Notifications): banners, sounds and badges per app, *Show Previews*, and **Scheduled Summary**. Mute now silences every interface sound.
- **Time Machine** (Mac): hourly snapshots of everything you created; restore any of them.
- **iPhone Mirroring** (Mac): the iPhone version in a Mac window.
- Hidden **achievements** (Settings → Desktop & Dock → More), optional **“hello”** start-up screen, live **rain on the wallpaper** when it rains in Kandy.

**Mac**
- Desktop icon size, grid spacing, sort by name / kind and **Stacks** (Settings → Desktop & Dock).
- Finder **tabs** (⌘T / ⌘W), Edit → **Duplicate** (⌘D) for Notes and My Files.
- App Switcher **hot corner**; Genie switches to Scale automatically on slow devices.

**iPhone / iPad**
- Settings → Home Screen: choose the **4 Dock apps**, page dots, Search button, App Library, badges, Siri Suggestions.
- Lock Screen: notifications as Count / Stack / List, torch & camera buttons on/off, lock sound.
- Control Centre **Edit** (hide controls) and power button; Notification Centre grouped by app.
- **Back Tap** (Accessibility), **Display Zoom**, keyboard clicks, Dynamic Island options.
- Screenshot **Markup** (tap the thumbnail), AssistiveTouch **Create New Gesture**.
- iOS shell text in Sinhala and Tamil.
- Lock Screen now shows only the wallpaper (the Home Screen is hidden behind it).

**What a website can't do** (left out on purpose): change the phone's own keyboard, change your real mouse speed, or sync data between your devices without a server.

## v10.2 — master-prompt rebuild

- **Three distinct devices.** macOS keeps its menu bar and Dock. iPadOS has its own Dock: the number of apps adjusts to the screen width (6 in portrait, 10 in landscape), there is an App Library button and no Trash. iOS has the Dock **Phone | Safari | Messages | Music**.
- **Control Centre (iPhone and iPad).**
  - Group pages for Favourites, Media, Connectivity and Work, navigated by real icons on a side rail.
  - Edit mode: controls jiggle, and you can remove, resize (small / medium / tall / large) and drag to reorder them.
  - An **Add a Control** gallery with categories and search, plus Restore Default Controls.
  - Your layout is saved on the device.
- **Dynamic Island state machine.**
  - Activities: music, a global timer (keeps running when Clock is closed), the assistant, voice and screen recording, calls and the torch.
  - On iPhone, two activities show as split bubbles.
  - Short alerts for Focus, Silent and battery.
  - Tap opens the app; a long press (or hover on Mac) expands it. Reduce Motion is respected.
- **Wallpaper system.**
  - Separate wallpaper sets per device, with categories and search.
  - Live and Dynamic wallpapers drawn in code. They pause with Reduce Motion, Low Power Mode or the Motion switch.
  - Preview Home or Lock, Light or Dark, and iPad portrait or landscape, then apply as a pair or to one screen.
  - Blur option for the Home Screen.
- **Lock Screens.**
  - Long-press the iPhone or iPad Lock Screen to switch between saved Lock Screens, customise them, add new ones or delete them.
  - Each Lock Screen can have its own wallpaper.
- **Icon tint from the wallpaper.** "Match Wallpaper Automatically" picks the tint from the wallpaper's palette.
- **AssistiveTouch.** Customise the top-level menu (1–8 icons, each slot assignable) and record custom gestures.
- **Portfolio modes.** Recruiter, Client, Developer, and a guided Presentation mode. Each has a mode bar.
- **New apps and screens.** A 4-step Welcome Guide, a **Learning Hub** (26 topics, mark as studied, save to Notes) and **What's New**.
- **Contact QR code.** A vCard QR code in Hire Me and in Control Centre.
- **Terminal commands.** `wallpaper`, `motion`, `theme`, `open` and `mode`.
- **Portfolio Assistant.** It is presented as the portfolio's own assistant, not Siri. It can set real timers, change wallpapers, open sections and search Settings.
- **Honest status messages.** Mail and Messages hand off to your own apps and never show a fake "Sent".
- **Mac Dock.** Xcode/My Portfolio, My Skills and Achievements shortcuts removed from the Dock (the apps remain in Launchpad and Finder). Minimised windows show as mini thumbnails.
- **Settings.**
  - One searchable Settings app; the duplicate "All Settings" entry is gone.
  - New pages: Portfolio, Control Centre, Keyboard, Date & Time, Storage, Assistant and Multitasking.
  - The reset options now ask for confirmation.

## v10.3 — Guidebook, widgets, music in five language styles

- **Guidebook app (A–Z):** every app, gesture, widget, Control Centre, Dynamic Island, notifications and settings explained step by step, with real screenshots of this build (`public/assets/guide/`) and *Try it* buttons. Open it from **Help → Guidebook**, **Settings → General → Portfolio Guide**, Spotlight, iPhone/iPad Settings, or the first-visit **Welcome!** notification.
- **Welcome guide** keeps its four short steps and adds a **Full Guidebook** button; it follows the interface language (English, Sinhala, Tamil). Tiny first-time hints (swipe for pages, pull down for Control Centre, right-click to edit widgets) appear once and never again.
- **Widgets:** a macOS Sonoma–style widget gallery on the Mac (sidebar of apps, live previews, drag onto the desktop or Notification Center); iOS 18 / iPadOS 18–style galleries on iPhone and iPad. Widgets move **only in edit mode**, snap to a grid and never overlap. Smart Stacks can be edited and swiped; folders are made by holding one app over another. Every widget opens its own app, tab or section.
- **Music:** ten new **original instrumentals** written in English, Sinhala, Tamil, Arabic and Hindi styles (synthesised for this portfolio — no samples, no copyrighted songs; see `public/assets/music/CREDITS.md`). Browse by language, genre and mood, real Recently Played history, your own playlists, and **My Songs** — add music from your own device to any language section (kept only in your browser). Each language links to real music on Spotify, YouTube Music and Apple Music.
- **Dynamic Island & notifications:** alerts are tappable and open the right content; notifications keep the glass look but stay readable.
- **Settings:** every switch now does something real or says honestly that it is simulated; Settings search jumps to and highlights the exact row; Lock Screen clock font and colour; Assistant on/off; Focus filters; screen-saver styles; highlight colour; open-at-login apps.
- **New apps:** Flashcards, Focus Planner, Goals & Tasks, Business Planner, Code Playground, Documents; Learning Hub topics each have a quiz.
- **Wallpapers:** a separate iPad set (Folds, Halo, Dunes) in light and dark, plus a light Ribbons.
- **iPad:** optional Launchpad-style grid for the Dock's app button (*Settings → Home Screen & App Library → Dock App Button*).
- **Control Centre gallery** can be browsed **By App**.
- **Guestbook** owner email is optional and private (`api/guestbook-notify.js`).
- **One z-index scale** for every overlay: `src/styles/zlayers.css`.
