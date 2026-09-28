# M.R. Ahamed Portfolio — Version 2 Update Guide

> **Using the full zip?** Just unzip it, open the folder in VS Code and run `npm install` then `npm run dev`. Everything below is already included. This guide is only for updating an existing copy file-by-file.
>
> The zip also adds **Reminders**, **Maps** (Google Maps) and **Google** apps (`src/apps/RemindersApp.tsx`, `MapsApp.tsx`, `GoogleApp.tsx`), plus **Calculator**, **Clock** and **Contacts** (`src/apps/CalculatorApp.tsx`, `ClockApp.tsx`, `ContactsApp.tsx`; styles at the end of `src/styles/apps-extra.css`).
>
> **v6 changes:** see “Version 6 additions” in README.md — new `src/system/customize.ts` (app/widget edit + Trash), `src/system/screenCapture.ts`, `src/components/ConfirmDialog.tsx`; redesigned `MusicApp.tsx`, `ContactsApp.tsx`; updated Control Center, Launchpad, Widgets, Dock, Finder (Trash), Spotlight, Lock screen and start-up flow. Nothing was removed.
>
> **v5 changes:** see “Version 5 additions” in README.md — new apps in `src/apps/` (Camera, VoiceMemos, Measure, FindMy, Home, Weather, Pages, Numbers, AppStore, Tips), new system components (`LockScreen`, `ForceQuit`, `MissionControl`), new helpers (`src/system/screenTime.ts`, `sounds.ts`), and new styles (`apps-v5a/b/c.css`, `system-v5.css`, `launchpad-v5.css`). Nothing was removed.
>
> **v4 changes:** Dock magnification fixed for `npm run dev` (`src/components/Dock.tsx`), new Music + Reminders desktop widgets (`src/components/Widgets.tsx`, new shared store `src/system/reminders.ts`, `src/apps/RemindersApp.tsx`), new start-up emblem (`src/components/MenuBar.tsx`), styles appended to `src/styles/system.css`.

This update is **additive**. Your existing apps, projects, skills, experience, desktop icons, CV, Xcode viewer, Terminal, Finder, Settings and widgets are all kept, and are repaired or expanded where needed.
**No new npm packages.** `package.json` stays the same.

---

## 1. File change manifest

### A. Existing files to REPLACE (27)

| # | Path | Why it changes |
|---|------|----------------|
| 1 | `README.md` | Documents the v2 features and the new asset folders |
| 2 | `src/main.tsx` | Imports the two new stylesheets |
| 3 | `src/App.tsx` | Adds the System and Music providers (shared state) |
| 4 | `src/data/portfolio.ts` | Social links (Facebook, Instagram, Threads, Spotify, SMS), skills expanded from your GitHub profile README, 3 new GitHub projects (Restaurant POS, EduLearn LMS, MediCarePlus repo link), repo update dates, experience browser, timeline, skill-evidence helper |
| 5 | `src/system/types.ts` | New app ids (photos, messages, calendar, music) and the wallpaper-tint setting |
| 6 | `src/system/apps.ts` | Registers the 4 new apps and the new Dock sections |
| 7 | `src/system/SettingsContext.tsx` | Theme cross-fade (View Transitions), wallpaper-tone detection, notifications for theme and wallpaper changes |
| 8 | `src/components/AppIcons.tsx` | 17 new original icons (Launchpad, Messages, Calendar, Photos, Music, Spotify, Instagram, Facebook, Threads, YouTube, Figma, W3Schools, Downloads and more) |
| 9 | `src/components/Dock.tsx` | Spring-physics proximity magnification, lift, press compression, bounce, minimised slots, Launchpad, Downloads stack, right-click menus, reorganised sections |
| 10 | `src/components/Window.tsx` | Windows grow out of their Dock icon when opening, and minimise into the minimised slot |
| 11 | `src/components/MenuBar.tsx` | Control Center, Spotlight and Notification Center buttons, Shut Down…, Focus indicator, new Go and View items |
| 12 | `src/components/Desktop.tsx` | Boot/shutdown phases, overlays, brightness layer, keyboard shortcuts, desktop right-click menu, Quick Look on Space, new apps |
| 13 | `src/components/DesktopIcons.tsx` | Adds an Education folder, right-click menus (Open, Quick Look, Get Info), Quick Look on Space |
| 14 | `src/components/Wallpaper.tsx` | Image wallpapers with blur cross-fade and an optional Dark-Mode tint |
| 15 | `src/components/Widgets.tsx` | Keeps Calendar and Clocks; adds Weather, GitHub and Current Project widgets |
| 16 | `src/apps/AboutApp.tsx` | Row of social-profile icons |
| 17 | `src/apps/FinderApp.tsx` | Experience browser (All, Entrepreneurial, Technology, Business, Leadership, University), Education, Projects, Timeline, Trash |
| 18 | `src/apps/NotesApp.tsx` | Skill search, “Evidence from my projects” and “Also on my GitHub profile” sections |
| 19 | `src/apps/SafariApp.tsx` | Social favourites, developer resources (Figma, W3Schools, YouTube, MDN), notifications |
| 20 | `src/apps/SettingsApp.tsx` | Wallpaper browser with categories, Displays, Sound, Focus panes |
| 21 | `src/apps/MailApp.tsx` | “Opening Mail” notification |
| 22 | `src/apps/PreviewApp.tsx` | “CV opened” notification |
| 23 | `src/apps/SlidesApp.tsx` | New Projects slide |
| 24 | `src/apps/TerminalApp.tsx` | New commands: `repos`, `social`, `photos`, `music`, `timeline` |
| 25 | `src/apps/XcodeApp.tsx` | Python/HTML files, project-selected and repository notifications, last-update date |
| 26 | `src/apps/xcode/codegen.ts` | Python and HTML source generation and highlighting |
| 27 | `src/styles/global.css` | Wallpaper image layers with a blur cross-fade |

### B. New files to CREATE (19)

| # | Path | Purpose |
|---|------|---------|
| 1 | `src/data/media.ts` | Registry of photos, screenshots, wallpapers and music tracks |
| 2 | `src/system/notify.ts` | Notification event bus + `openExternal()` helper |
| 3 | `src/system/SystemContext.tsx` | Shared state: boot phase, overlays, brightness, Focus, Wi-Fi/BT/AirDrop simulation, notifications, Quick Look, context menu, fullscreen |
| 4 | `src/system/MusicContext.tsx` | One shared audio player (Music app + Control Center) |
| 5 | `src/system/launch.ts` | Launch registry used by Launchpad, Spotlight and the Dock |
| 6 | `src/system/useLaunch.ts` | Hook that launches an app or an external link |
| 7 | `src/components/Boot.tsx` | Startup screen and powered-off screen |
| 8 | `src/components/ControlCenter.tsx` | Control Center with expandable sub-panels |
| 9 | `src/components/NotificationCenter.tsx` | Notification Center + banner toasts |
| 10 | `src/components/Launchpad.tsx` | Launchpad |
| 11 | `src/components/Spotlight.tsx` | Spotlight search |
| 12 | `src/components/QuickLook.tsx` | Quick Look (images and info) |
| 13 | `src/components/ContextMenu.tsx` | Right-click menus |
| 14 | `src/apps/PhotosApp.tsx` | Photos / iCloud-style gallery |
| 15 | `src/apps/MessagesApp.tsx` | Messages with `sms:` hand-off |
| 16 | `src/apps/CalendarApp.tsx` | Calendar with real milestones |
| 17 | `src/apps/MusicApp.tsx` | Music player |
| 18 | `src/styles/system.css` + `src/styles/apps-extra.css` | Styles for the system layer and the new apps (2 files) |

### C. New asset folders

```
public/assets/photos/        9 personal photos (your attachments, resized for the web)
public/assets/screenshots/   6 screenshots of this portfolio
public/assets/wallpapers/    13 original wallpapers
public/assets/wallpapers/thumbs/  13 thumbnails
public/assets/music/         3 original royalty-free tracks
```

---

## 2. Personal photo mapping

These are the photos you attached, in the order you sent them. The files I send are the same photos, resized to a 1600-px long edge. Nothing about them was retouched.

| Photo | Your attachment | Destination (exact name) |
|---|---|---|
| PHOTO 1 | Grey suit, burgundy shirt, sitting by the window | `public/assets/photos/ahamed-01.jpg` |
| PHOTO 2 | Black suit, striped tie, dark background | `public/assets/photos/ahamed-02.jpg` |
| PHOTO 3 | Navy double-breasted suit, light-blue background | `public/assets/photos/ahamed-03.jpg` |
| PHOTO 4 | Black suit on the grey sofa | `public/assets/photos/ahamed-04.jpg` |
| PHOTO 5 | Grey three-piece suit, burgundy tie, arms crossed | `public/assets/photos/ahamed-05.jpg` |
| PHOTO 6 | Beige suit on the wooden chair | `public/assets/photos/ahamed-06.jpg` |
| PHOTO 7 | Grey suit, wood-panel wall | `public/assets/photos/ahamed-07.jpg` |
| PHOTO 8 | Neon red/cyan portrait, white T-shirt | `public/assets/photos/ahamed-08.jpg` |
| PHOTO 9 | Grey jacket, black chair, white sneakers | `public/assets/photos/ahamed-09.jpg` |

These are registered in `src/data/media.ts` → `photos`. The existing headshot `public/images/ahamed.jpg` is also shown in Photos.

## 3. Screenshots (Photos → Portfolio Screenshots)

`desktop.jpg`, `xcode.jpg`, `notes.jpg`, `experience.jpg`, `achievements.jpg`, `dark-mode.jpg` → `public/assets/screenshots/`

## 4. Wallpaper mapping

These are original artworks made for this portfolio (not Apple files). Each one is registered in `src/data/media.ts` → `wallpapers`.

| File | Destination | Thumbnail (in `public/assets/wallpapers/thumbs/`) | Category | Menu-bar tone |
|---|---|---|---|---|
| sonoma.jpg | public/assets/wallpapers/ | thumb-sonoma.jpg | Colorful | Dark (white text) |
| tahoe.jpg | 〃 | thumb-tahoe.jpg | Colorful | Dark |
| sunset.jpg | 〃 | thumb-sunset.jpg | Colorful | Dark |
| galaxy.jpg | 〃 | thumb-galaxy.jpg | Dark | Dark |
| graphite.jpg | 〃 | thumb-graphite.jpg | Dark | Dark |
| aurora.jpg | 〃 | thumb-aurora.jpg | Colorful | Dark |
| flame.jpg | 〃 | thumb-flame.jpg | Colorful | Dark |
| midnight.jpg | 〃 | thumb-midnight.jpg | Dark | Dark |
| cloud.jpg | 〃 | thumb-cloud.jpg | Light | Light (black text) |
| peaks.jpg | 〃 | thumb-peaks.jpg | Landscape | Dark |
| lake.jpg | 〃 | thumb-lake.jpg | Landscape | Light |
| pro-dark.jpg | 〃 | thumb-pro-dark.jpg | Minimal | Dark |
| pro-light.jpg | 〃 | thumb-pro-light.jpg | Minimal | Light |

## 5. Music mapping

| File | Destination | Title |
|---|---|---|
| kandy-morning.mp3 | public/assets/music/ | Kandy Morning |
| lake-drive.mp3 | public/assets/music/ | Lake Drive |
| midnight-build.mp3 | public/assets/music/ | Midnight Build |

These are original royalty-free ambient loops that were generated for this portfolio. No commercial or Spotify music is bundled. The playlist is configured in `src/data/media.ts` → `tracks`. Your Spotify profile opens from the Music app, the Dock and Launchpad.

---

## 6. Step-by-step installation

**STEP 1 — Back up.** Copy your whole `mr-ahamed-portfolio` folder to `mr-ahamed-portfolio-backup`.

**STEP 2 — Create the new folders** (right-click in the VS Code Explorer → New Folder):
`public/assets`, `public/assets/photos`, `public/assets/screenshots`, `public/assets/wallpapers`, `public/assets/wallpapers/thumbs`, `public/assets/music`

**STEP 3 — Copy the photos.** Put the 9 `ahamed-0X.jpg` files into `public/assets/photos/`.

**STEP 4 — Copy the screenshots.** Put the 6 screenshot JPGs into `public/assets/screenshots/`.

**STEP 5 — Copy the wallpapers.** Put the 13 wallpaper JPGs into `public/assets/wallpapers/` and the 13 `thumb-*.jpg` files into `public/assets/wallpapers/thumbs/`.

**STEP 6 — Copy the music.** Put the 3 MP3s into `public/assets/music/`.

**STEP 7 — Replace the 27 existing files** listed in 1A. For each one, open the file in VS Code, press Ctrl+A, paste the new content and press Ctrl+S. You can also drop the downloaded file over the old one.

**STEP 8 — Create the new files** listed in 1B, in the exact folders shown (right-click the folder → New File → paste → save).

**STEP 9 — Dependencies.** Nothing new to install. If `node_modules` is missing, run `npm install` (or `npm.cmd install` in PowerShell).

**STEP 10 — Run it:** `npm run dev`, then open http://localhost:5173

**STEP 11 — Test the startup animation.** It shows once per browser tab. Open a new tab to see it again, or use the logo menu → Restart…

**STEP 12 — Test the Dock.** Sweep the mouse slowly and then quickly across the Dock in both directions. Click an app to see the bounce, and minimise a window to see it go into the Dock.

**STEP 13 — Test Control Center.** Click the switch icon at the top right. Try Light/Dark, brightness, volume, Focus, Fullscreen, Now Playing, and expand the Wi-Fi, Display and Sound panels.

**STEP 14 — Test Notification Center.** Click the clock.

**STEP 15 — Test Launchpad** (Dock or F4) and **Spotlight** (Ctrl + Space or Ctrl + K). Try searching “Java”, “HealthForge” and “CV”.

**STEP 16 — Test Photos and Quick Look.** Select a photo, press Space, then double-click it. Also try Messages, Calendar, Music, and Finder → Timeline.

**STEP 17 — Build:** `npm run build`, then `npm run preview`

---

## 7. Notes & verified-data decisions

- **GitHub:** the account has 10 repositories. 9 of them are projects, and the 10th is your profile README (`Ahamed369`), which I used for skills. All 9 project repos now appear in Xcode, Safari, Spotlight, Finder and the Terminal.
- **MediCarePlus:** your CV says it uses JDBC + MySQL, but the public repository stores its data in text files. Both are shown and labelled.
- **Skills:** anything listed only on your GitHub profile README appears under “Also on my GitHub profile”. It is kept separate from skills that one of your repositories actually uses.
- **YouTube / Figma / W3Schools** open the sites’ home pages. No YouTube channel was supplied, so none is invented.
- **Threads** (`@__mr.ahamed__`) comes from your GitHub profile README.
- **Wi-Fi, Bluetooth, AirDrop and Keyboard Brightness** are clearly-labelled simulations, because a website cannot control them. Brightness, theme, fullscreen, volume, music and Focus really work.
- **Weather** uses the free Open-Meteo API (no key). If it can’t load, the widget shows “Weather unavailable”.

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

## Version 8 integrations (optional)

All of these live in **`src/data/portfolio.ts` → `integrations`**. If you leave a value empty, the portfolio falls back gracefully.

### 1. Sign in with Google (App Store, Drive, Photos, Google Play)
1. Go to https://console.cloud.google.com and open **APIs & Services → Credentials**.
2. Choose **Create credentials → OAuth client ID → Web application**.
3. Under **Authorized JavaScript origins**, add your site (e.g. `https://yourname.github.io`) and `http://localhost:5173`.
4. Copy the **Client ID** (…`.apps.googleusercontent.com`) into `googleClientId`.

Google shows its own sign-in window, and the portfolio only receives the visitor's name, email and picture. Until you add a Client ID, visitors use the **Portfolio ID** demo account.

### 2. Shared Guestbook (everyone sees every message)
1. Create a free project at https://supabase.com.
2. Open the SQL editor and run:
```sql
create table guestbook (
  id bigint generated always as identity primary key,
  created_at timestamptz default now(),
  name text not null check (char_length(name) <= 40),
  message text not null check (char_length(message) <= 500),
  mood text,
  location text
);
alter table guestbook enable row level security;
create policy "anyone can read"  on guestbook for select using (true);
create policy "anyone can write" on guestbook for insert with check (true);
```
3. Go to **Project Settings → API**. Copy the **Project URL** into `supabaseUrl` and the **anon public key** into `supabaseAnonKey`.

Without these, guestbook entries are saved in each visitor's own browser.

### 3. Book a Call
Put a Calendly (or any booking page) link in `bookingUrl`. Without it, visitors choose a time, the request is sent to you by email or WhatsApp, and they can download an .ics invite.

### 4. Share links
Set `siteUrl` to your deployed address so shared links always point to the live site.

### 5. Wallet / Passwords demo login
The login is `demoUser` / `demoPassword` (default `guest` / `portfolio2026`). It's shown on the lock screen, because this is a demo; never use a real password here.

### Add or replace music
Put MP3 files in `public/assets/music/` and list them in `src/data/media.ts → tracks`. Only use music you have the rights to share. The 18 tracks included are original and royalty-free.

### Wallpapers
Put images in `public/assets/wallpapers/`, add a 400×250 thumbnail as `thumbs/thumb-<id>.jpg`, then add a `wp(...)` line in `src/data/media.ts`.

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

## Version 9 — where things live

| What | File |
|---|---|
| Services (Expertise & Capabilities) | `src/data/services.ts` → `SERVICE_AREAS` |
| Genie effect | `src/system/genie.ts` (used by `src/components/Window.tsx`) |
| Calls (FaceTime / WhatsApp) | `src/components/SystemV9.tsx`, `src/system/call.ts` |
| New Settings panes | `src/apps/settings/PanesV9.tsx` |
| Spotlight categories / calculator / conversion | `src/system/spotlight.ts` |
| Free placement (widgets, icons, desktop apps) | `src/system/desk.ts` |
| Extra widgets | `src/components/WidgetsExtra.tsx`, list in `src/system/customize.ts` |
| Applications pop-up (Launchpad double-click) | `src/components/ApplicationsPopup.tsx` |
| New wallpapers | `public/assets/wallpapers/` + `src/data/media.ts` → `wallpapers` |
| Custom wallpaper from Photos / upload | `src/system/customWallpaper.ts` |

To add a service, append an entry to the right area in `SERVICE_AREAS`. List any `projects` ids from `portfolio.ts` that demonstrate it, and the service appears in the app, in Spotlight and in the My Services widget.
