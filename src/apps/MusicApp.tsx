import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { openMusicPiP } from '../components/MusicPiP';
import { fmtTime, useMusic } from '../system/MusicContext';
import { personal, socials } from '../data/portfolio';
import { openExternal, notify } from '../system/notify';
import { readStore, writeStore } from '../system/storage';
import { ccIcons as I } from '../components/ControlCenter';
import { DragBar, Lights } from '../components/Window';
import { SysIcon } from '../components/SysIcons';
import { useSettings } from '../system/SettingsContext';
import { MUSIC_LANGS, type MusicLang, type MusicMood, type Track } from '../data/media';
import type { AppProps } from '../components/Desktop';

type View =
  | 'home'
  | 'browse'
  | 'radio'
  | 'history'
  | 'recent'
  | 'artists'
  | 'albums'
  | 'songs'
  | 'mine'
  | 'favs'
  | `album:${string}`
  | `artist:${string}`
  | `lang:${string}`
  | `genre:${string}`
  | `mood:${string}`
  | `pl:${string}`;

type Lng = 'en' | 'si' | 'ta';
const TX = {
  justNow: { en: 'Just now', si: 'දැන්', ta: 'இப்போது' },
  minAgo: { en: '{n} min ago', si: 'මිනිත්තු {n}කට පෙර', ta: '{n} நிமி. முன்' },
  hAgo: { en: '{n} h ago', si: 'පැය {n}කට පෙර', ta: '{n} மணி. முன்' },
  addedToPl: { en: 'Added to Playlist', si: 'Playlist එකට එක් කළා', ta: 'Playlist-இல் சேர்க்கப்பட்டது' },
  song: { en: 'Song', si: 'ගීතය', ta: 'பாடல்' },
  playlist: { en: 'Playlist', si: 'Playlist', ta: 'Playlist' },
  newPlaylist: { en: 'New Playlist', si: 'නව Playlist', ta: 'புதிய Playlist' },
  addedOne: { en: 'Added {n} song', si: 'ගීත {n}ක් එක් කළා', ta: '{n} பாடல் சேர்க்கப்பட்டது' },
  addedMany: { en: 'Added {n} songs', si: 'ගීත {n}ක් එක් කළා', ta: '{n} பாடல்கள் சேர்க்கப்பட்டன' },
  noAudio: { en: 'No audio files found', si: 'ශ්‍රව්‍ය ගොනු හමු නොවීය', ta: 'ஆடியோ கோப்புகள் எதுவும் கிடைக்கவில்லை' },
  savedUnder: { en: 'Saved in this browser only, under {label}.', si: 'මෙම browser එකේ පමණක්, {label} යටතේ සුරකින ලදී.', ta: 'இந்த browser-இல் மட்டும், {label} என்பதன் கீழ் சேமிக்கப்பட்டது.' },
  chooseFormats: { en: 'Choose MP3, M4A, AAC, WAV, OGG or FLAC files.', si: 'MP3, M4A, AAC, WAV, OGG හෝ FLAC ගොනු තෝරන්න.', ta: 'MP3, M4A, AAC, WAV, OGG அல்லது FLAC கோப்புகளைத் தேர்ந்தெடுக்கவும்.' },
  songs: { en: 'Songs', si: 'ගීත', ta: 'பாடல்கள்' },
  title: { en: 'Title', si: 'මාතෘකාව', ta: 'தலைப்பு' },
  album: { en: 'Album', si: 'ඇල්බමය', ta: 'ஆல்பம்' },
  time: { en: 'Time', si: 'කාලය', ta: 'நேரம்' },
  playing: { en: 'playing', si: 'වාදනය වෙමින්', ta: 'இயங்குகிறது' },
  unfav: { en: 'Unfavourite {t}', si: '{t} ප්‍රියතම වලින් ඉවත් කරන්න', ta: '{t}-ஐ பிடித்தவையிலிருந்து நீக்கு' },
  fav: { en: 'Favourite {t}', si: '{t} ප්‍රියතම වලට එක් කරන්න', ta: '{t}-ஐ பிடித்தவையில் சேர்' },
  addToPlAria: { en: 'Add {t} to a playlist', si: '{t} playlist එකකට එක් කරන්න', ta: '{t}-ஐ ஒரு playlist-இல் சேர்' },
  remove: { en: 'Remove {t}', si: '{t} ඉවත් කරන්න', ta: '{t}-ஐ நீக்கு' },
  addToPl: { en: 'Add to Playlist', si: 'Playlist එකට එක් කරන්න', ta: 'Playlist-இல் சேர்' },
  newPlaylistDots: { en: 'New Playlist…', si: 'නව Playlist…', ta: 'புதிய Playlist…' },
  emptyDefault: { en: 'No songs here yet — tap the heart on any song to add it.', si: 'තවම මෙහි ගීත නැත — එක් කිරීමට ඕනෑම ගීතයක හදවත තට්ටු කරන්න.', ta: 'இங்கே இன்னும் பாடல்கள் இல்லை — சேர்க்க எந்தப் பாடலிலும் இதயத்தைத் தட்டுங்கள்.' },
  play: { en: 'Play', si: 'වාදනය', ta: 'இயக்கு' },
  pause: { en: 'Pause', si: 'විරාම කරන්න', ta: 'இடைநிறுத்து' },
  shuffle: { en: 'Shuffle', si: 'කලවම් කරන්න', ta: 'கலக்கு' },
  nSongs: { en: '{n} songs', si: 'ගීත {n}', ta: '{n} பாடல்கள்' },
  opening: { en: 'Opening {label}', si: '{label} විවෘත කරමින්', ta: '{label} திறக்கப்படுகிறது' },
  results: { en: 'Results for “{q}”', si: '“{q}” සඳහා ප්‍රතිඵල', ta: '“{q}” க்கான முடிவுகள்' },
  noMatch: {
    en: 'No matching songs. Try a language (Tamil, Hindi…), a mood (Chill, Focus…) or a genre.',
    si: 'ගැළපෙන ගීත නැත. භාෂාවක් (Tamil, Hindi…), මනෝභාවයක් (Chill, Focus…) හෝ ප්‍රභේදයක් උත්සාහ කරන්න.',
    ta: 'பொருந்தும் பாடல்கள் இல்லை. ஒரு மொழி (Tamil, Hindi…), ஒரு மனநிலை (Chill, Focus…) அல்லது ஒரு வகையை முயற்சிக்கவும்.',
  },
  home: { en: 'Home', si: 'මුල් පිටුව', ta: 'முகப்பு' },
  byLang: { en: 'Browse by Language', si: 'භාෂාව අනුව පිරික්සන්න', ta: 'மொழி வாரியாக உலாவு' },
  recentlyPlayed: { en: 'Recently Played', si: 'මෑතකදී වාදනය කළ', ta: 'சமீபத்தில் இயக்கியவை' },
  playShowHere: { en: 'Songs you play will show up here.', si: 'ඔබ වාදනය කරන ගීත මෙහි පෙන්වනු ඇත.', ta: 'நீங்கள் இயக்கும் பாடல்கள் இங்கே தோன்றும்.' },
  topPicks: { en: 'Top Picks for You', si: 'ඔබ සඳහා විශේෂ තේරීම්', ta: 'உங்களுக்கான சிறந்த தேர்வுகள்' },
  moodMixes: { en: 'Mixes by Mood', si: 'මනෝභාවය අනුව මිශ්‍රණ', ta: 'மனநிலை வாரியான கலவைகள்' },
  mixLabel: { en: 'Mix', si: 'මිශ්‍රණය', ta: 'கலவை' },
  mixName: { en: '{name} Mix', si: '{name} මිශ්‍රණය', ta: '{name} கலவை' },
  browse: { en: 'Browse', si: 'පිරික්සන්න', ta: 'உலாவு' },
  languages: { en: 'Languages', si: 'භාෂා', ta: 'மொழிகள்' },
  genres: { en: 'Genres', si: 'ප්‍රභේද', ta: 'வகைகள்' },
  moods: { en: 'Moods', si: 'මනෝභාව', ta: 'மனநிலைகள்' },
  instrumental: { en: 'Instrumental', si: 'වාද්‍ය සංගීතය', ta: 'இசைக்கருவி இசை' },
  langMusic: { en: '{label} Music', si: '{label} සංගීතය', ta: '{label} இசை' },
  ofYours: { en: ' · {n} of yours', si: ' · ඔබගේ {n}', ta: ' · உங்களுடையவை {n}' },
  addOwn: { en: 'Add your own', si: 'ඔබගේම එක් කරන්න', ta: 'உங்களுடையதைச் சேர்' },
  langEmpty: { en: 'No songs yet — add your own with “Add your own”.', si: 'තවම ගීත නැත — “ඔබගේම එක් කරන්න” මඟින් ඔබගේම ගීත එක් කරන්න.', ta: 'இன்னும் பாடல்கள் இல்லை — “உங்களுடையதைச் சேர்” மூலம் உங்கள் பாடல்களைச் சேர்க்கவும்.' },
  langNote: {
    en: 'The built-in tracks are original instrumentals written in a {label} music style for this portfolio — no copyrighted songs are included. Add your own songs above, or listen to real {label} music on a streaming service:',
    si: 'ඇතුළත් ගීත මෙම portfolio එක සඳහා {label} සංගීත ශෛලියෙන් රචනා කළ මුල් වාද්‍ය ඛණ්ඩ වේ — ප්‍රකාශන හිමිකම් සහිත ගීත කිසිවක් ඇතුළත් නොවේ. ඉහතින් ඔබගේම ගීත එක් කරන්න, නැතහොත් streaming සේවාවකින් සැබෑ {label} සංගීතයට සවන් දෙන්න:',
    ta: 'உள்ளமைந்த பாடல்கள் இந்த portfolio-க்காக {label} இசை பாணியில் உருவாக்கப்பட்ட அசல் இசைக்கருவி இசைகள் — பதிப்புரிமை பெற்ற பாடல்கள் எதுவும் இல்லை. மேலே உங்கள் சொந்தப் பாடல்களைச் சேர்க்கவும், அல்லது ஒரு streaming சேவையில் உண்மையான {label} இசையைக் கேளுங்கள்:',
  },
  moreInst: { en: 'More instrumentals on', si: 'තවත් වාද්‍ය සංගීතය:', ta: 'மேலும் இசைக்கருவி இசை:' },
  realOn: { en: 'Real {label} songs on', si: 'සැබෑ {label} ගීත:', ta: 'உண்மையான {label} பாடல்கள்:' },
  genreSub: { en: 'Genre · {n} songs', si: 'ප්‍රභේදය · ගීත {n}', ta: 'வகை · {n} பாடல்கள்' },
  moodSub: { en: 'Mood · {n} songs', si: 'මනෝභාවය · ගීත {n}', ta: 'மனநிலை · {n} பாடல்கள்' },
  radio: { en: 'Radio', si: 'රේඩියෝ', ta: 'வானொலி' },
  openSpotify: { en: 'Opening Spotify profile', si: 'Spotify පැතිකඩ විවෘත කරමින්', ta: 'Spotify சுயவிவரம் திறக்கப்படுகிறது' },
  onSpotify: { en: '{name} on Spotify', si: 'Spotify හි {name}', ta: 'Spotify-இல் {name}' },
  spotifyNote: { en: 'My real playlists live on Spotify — opens in a new tab', si: 'මගේ සැබෑ playlists ඇත්තේ Spotify හි — නව tab එකක විවෘත වේ', ta: 'என் உண்மையான playlists Spotify-இல் உள்ளன — புதிய tab-இல் திறக்கும்' },
  stations: { en: 'Stations by Language', si: 'භාෂාව අනුව නාලිකා', ta: 'மொழி வாரியான நிலையங்கள்' },
  radioNote1: {
    en: 'Real songs stream from the services below (a network connection is needed). Each link opens a search for that language.',
    si: 'සැබෑ ගීත පහත සේවාවලින් stream වේ (ජාල සම්බන්ධතාවක් අවශ්‍යයි). සෑම සබැඳියක්ම එම භාෂාව සඳහා සෙවුමක් විවෘත කරයි.',
    ta: 'உண்மையான பாடல்கள் கீழே உள்ள சேவைகளிலிருந்து stream ஆகும் (இணைய இணைப்பு தேவை). ஒவ்வொரு இணைப்பும் அந்த மொழிக்கான தேடலைத் திறக்கும்.',
  },
  radioNote2: {
    en: 'The songs inside this app are original, royalty-free instrumentals made for this portfolio.',
    si: 'මෙම යෙදුම තුළ ඇති ගීත මෙම portfolio එක සඳහා සාදන ලද royalty-free මුල් වාද්‍ය ඛණ්ඩ වේ.',
    ta: 'இந்தச் செயலியில் உள்ள பாடல்கள் இந்த portfolio-க்காக உருவாக்கப்பட்ட royalty-free அசல் இசைக்கருவி இசைகள்.',
  },
  clear: { en: 'Clear', si: 'හිස් කරන්න', ta: 'அழி' },
  historyEmpty: { en: 'Nothing played yet — songs you play will show up here.', si: 'තවම කිසිවක් වාදනය කර නැත — ඔබ වාදනය කරන ගීත මෙහි පෙන්වනු ඇත.', ta: 'இன்னும் எதுவும் இயக்கப்படவில்லை — நீங்கள் இயக்கும் பாடல்கள் இங்கே தோன்றும்.' },
  albums: { en: 'Albums', si: 'ඇල්බම', ta: 'ஆல்பங்கள்' },
  artists: { en: 'Artists', si: 'කලාකරුවන්', ta: 'கலைஞர்கள்' },
  nAlbums: { en: '{n} albums', si: 'ඇල්බම {n}', ta: '{n} ஆல்பங்கள்' },
  artistSub: { en: 'Artist · {n} songs', si: 'කලාකරු · ගීත {n}', ta: 'கலைஞர் · {n} பாடல்கள்' },
  plDeleted: { en: 'This playlist was deleted.', si: 'මෙම playlist එක මකා දමා ඇත.', ta: 'இந்த playlist நீக்கப்பட்டது.' },
  plSub: { en: 'Playlist · {n} songs', si: 'Playlist · ගීත {n}', ta: 'Playlist · {n} பாடல்கள்' },
  rename: { en: 'Rename', si: 'නැවත නම් කරන්න', ta: 'மறுபெயரிடு' },
  delete: { en: 'Delete', si: 'මකන්න', ta: 'நீக்கு' },
  plEmpty: { en: 'This playlist is empty — use the + button on any song to add it here.', si: 'මෙම playlist එක හිස් ය — ගීතයක් මෙහි එක් කිරීමට එහි + බොත්තම භාවිත කරන්න.', ta: 'இந்த playlist காலியாக உள்ளது — இங்கே சேர்க்க எந்தப் பாடலிலும் உள்ள + பொத்தானைப் பயன்படுத்தவும்.' },
  mySongs: { en: 'My Songs', si: 'මගේ ගීත', ta: 'என் பாடல்கள்' },
  mineP1: {
    en: 'Add songs from your own device and pick the language section they belong to. They are stored ',
    si: 'ඔබගේම උපාංගයෙන් ගීත එක් කර ඒවා අයත් භාෂා කොටස තෝරන්න. ඒවා ගබඩා වන්නේ ',
    ta: 'உங்கள் சொந்தச் சாதனத்திலிருந்து பாடல்களைச் சேர்த்து, அவை சேர வேண்டிய மொழிப் பிரிவைத் தேர்ந்தெடுக்கவும். அவை ',
  },
  mineP2: { en: 'only in this browser', si: 'මෙම browser එකේ පමණි', ta: 'இந்த browser-இல் மட்டுமே' },
  mineP3: {
    en: ' (never uploaded) and play like any other song. Only add music you own or have the right to play.',
    si: ' (කිසිදා upload නොවේ), වෙනත් ඕනෑම ගීතයක් මෙන් වාදනය වේ. ඔබට අයිති හෝ වාදනය කිරීමට අයිතිය ඇති සංගීතය පමණක් එක් කරන්න.',
    ta: ' சேமிக்கப்படும் (ஒருபோதும் upload செய்யப்படாது), மற்ற பாடல்களைப் போலவே இயங்கும். உங்களுக்குச் சொந்தமான அல்லது இயக்க உரிமையுள்ள இசையை மட்டுமே சேர்க்கவும்.',
  },
  language: { en: 'Language', si: 'භාෂාව', ta: 'மொழி' },
  langForAdded: { en: 'Language for added songs', si: 'එක් කරන ගීත සඳහා භාෂාව', ta: 'சேர்க்கும் பாடல்களுக்கான மொழி' },
  adding: { en: 'Adding…', si: 'එක් කරමින්…', ta: 'சேர்க்கிறது…' },
  chooseSongs: { en: 'Choose Songs…', si: 'ගීත තෝරන්න…', ta: 'பாடல்களைத் தேர்ந்தெடு…' },
  tip: { en: 'Tip: name files “Artist - Title.mp3” and the artist is filled in for you.', si: 'ඉඟිය: ගොනු “Artist - Title.mp3” ලෙස නම් කළ විට කලාකරුවාගේ නම ස්වයංක්‍රීයව පිරවේ.', ta: 'குறிப்பு: கோப்புகளுக்கு “Artist - Title.mp3” எனப் பெயரிட்டால் கலைஞர் பெயர் தானாக நிரப்பப்படும்.' },
  mineEmpty: { en: 'You haven’t added any songs yet.', si: 'ඔබ තවම ගීත කිසිවක් එක් කර නැත.', ta: 'நீங்கள் இன்னும் எந்தப் பாடலையும் சேர்க்கவில்லை.' },
  favSongs: { en: 'Favourite Songs', si: 'ප්‍රියතම ගීත', ta: 'பிடித்த பாடல்கள்' },
  recentlyAdded: { en: 'Recently Added', si: 'මෑතකදී එක් කළ', ta: 'சமீபத்தில் சேர்த்தவை' },
  search: { en: 'Search', si: 'සොයන්න', ta: 'தேடு' },
  searchMusic: { en: 'Search music', si: 'සංගීතය සොයන්න', ta: 'இசையைத் தேடு' },
  library: { en: 'Library', si: 'පුස්තකාලය', ta: 'நூலகம்' },
  playlists: { en: 'Playlists', si: 'Playlists', ta: 'Playlists' },
  newPlaylistAria: { en: 'New playlist', si: 'නව playlist', ta: 'புதிய playlist' },
  renamePlaylist: { en: 'Rename Playlist', si: 'Playlist නැවත නම් කරන්න', ta: 'Playlist-ஐ மறுபெயரிடு' },
  plName: { en: 'Playlist name', si: 'Playlist නම', ta: 'Playlist பெயர்' },
  cancel: { en: 'Cancel', si: 'අවලංගු කරන්න', ta: 'ரத்துசெய்' },
  save: { en: 'Save', si: 'සුරකින්න', ta: 'சேமி' },
  create: { en: 'Create', si: 'සාදන්න', ta: 'உருவாக்கு' },
  prevTrack: { en: 'Previous track', si: 'පෙර ගීතය', ta: 'முந்தைய பாடல்' },
  nextTrack: { en: 'Next track', si: 'ඊළඟ ගීතය', ta: 'அடுத்த பாடல்' },
  repeat: { en: 'Repeat: {mode}', si: 'පුනරාවර්තනය: {mode}', ta: 'மீண்டும் இயக்கு: {mode}' },
  pip: { en: 'Picture in Picture', si: 'Picture in Picture', ta: 'Picture in Picture' },
  pipTitle: { en: 'Picture in Picture — keep the player on top', si: 'Picture in Picture — player එක සැමවිටම ඉහළින් තබා ගන්න', ta: 'Picture in Picture — player-ஐ எப்போதும் மேலே வைத்திருக்கும்' },
  seek: { en: 'Seek', si: 'ස්ථානය වෙනස් කරන්න', ta: 'நகர்த்து' },
  unmute: { en: 'Unmute', si: 'ශබ්දය සක්‍රිය කරන්න', ta: 'ஒலியை இயக்கு' },
  mute: { en: 'Mute', si: 'නිහඬ කරන්න', ta: 'ஒலியடக்கு' },
  volume: { en: 'Volume', si: 'ශබ්ද මට්ටම', ta: 'ஒலியளவு' },
} satisfies Record<string, Record<Lng, string>>;
type TxKey = keyof typeof TX;
const txl = (lng: Lng, k: TxKey, vars: Record<string, string | number> = {}) => TX[k][lng].replace(/\{(\w+)\}/g, (_, v: string) => String(vars[v] ?? ''));

const FAV_KEY = 'mra-music-favs';
const PL_KEY = 'mra-music-playlists-v10';
interface Playlist {
  id: string;
  name: string;
  ids: string[];
}

const MOODS: { id: MusicMood; art: [string, string] }[] = [
  { id: 'Focus', art: ['#667eea', '#2b2d6e'] },
  { id: 'Chill', art: ['#4facfe', '#00a2c7'] },
  { id: 'Coding', art: ['#0f9b8e', '#0b1d3a'] },
  { id: 'Upbeat', art: ['#f5576c', '#f093fb'] },
  { id: 'Relaxing', art: ['#84fab0', '#2f9e8f'] },
  { id: 'Night', art: ['#434343', '#3a1c71'] },
  { id: 'Travel', art: ['#f6d365', '#fd7f45'] },
];
const GENRE_ART: [string, string][] = [['#fa709a', '#fee140'], ['#30cfd0', '#330867'], ['#a8edea', '#5b6fa8'], ['#ff9966', '#ff5e62'], ['#43e97b', '#38a3a5'], ['#c471f5', '#6a3093'], ['#f7971e', '#8e0e00'], ['#e0c3fc', '#5b5ea6']];

const G = {
  search: 'M10.5 4a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM15.5 15.5 20 20',
  home: 'M4 11 12 4l8 7v8.5a.5.5 0 0 1-.5.5H15v-6H9v6H4.5a.5.5 0 0 1-.5-.5Z',
  browse: 'M4 4h7v7H4ZM13 4h7v7h-7ZM4 13h7v7H4ZM13 13h7v7h-7Z',
  radio: 'M12 12m-2 0a2 2 0 1 0 4 0 2 2 0 1 0-4 0M7.8 7.8a6 6 0 0 0 0 8.4M16.2 7.8a6 6 0 0 1 0 8.4M5 5a10 10 0 0 0 0 14M19 5a10 10 0 0 1 0 14',
  history: 'M12 4a8 8 0 1 0 8 8M12 8v4l3 2M20 4v4h-4',
  recent: 'M5 5h14v14H5ZM9 9h6M9 13h6M9 17h3',
  artists: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4.5 20a7.5 7.5 0 0 1 15 0',
  albums: 'M4 4h16v16H4ZM12 12m-3 0a3 3 0 1 0 6 0 3 3 0 1 0-6 0',
  songs: 'M9 18V5l11-2v13M9 18a3 3 0 1 1-3-3 3 3 0 0 1 3 3ZM20 16a3 3 0 1 1-3-3 3 3 0 0 1 3 3Z',
  mine: 'M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19h14',
  heart: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z',
  list: 'M5 7h14M5 12h14M5 17h9',
  plus: 'M12 5v14M5 12h14',
  ext: 'M14 5h5v5M19 5l-8 8M17 14v5H5V7h5',
  pip: 'M4 5h16v14H4ZM12 12h6v5h-6Z',
  trash: 'M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12',
  globe: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18',
};

function Glyph({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Cover({ t, big, label }: { t: Pick<Track, 'art'>; big?: boolean; label?: string }) {
  return (
    <span className={`am-cover ${big ? 'big' : ''}`} style={{ background: `linear-gradient(135deg, ${t.art[0]}, ${t.art[1]})` }} aria-hidden="true">
      <span className="am-cover-note">
        <SysIcon n="music" size={big ? 30 : 14} />
      </span>
      {label && <span className="am-cover-label">{label}</span>}
    </span>
  );
}

/** Real track durations, read from each file's metadata once. */
function useDurations(tracks: Track[]) {
  const [d, setD] = useState<Record<string, number>>({});
  useEffect(() => {
    const audios = tracks.map((t) => {
      const a = new Audio();
      a.preload = 'metadata';
      a.src = t.src;
      a.addEventListener('loadedmetadata', () => setD((x) => ({ ...x, [t.id]: a.duration })));
      return a;
    });
    return () => audios.forEach((a) => a.removeAttribute('src'));
  }, [tracks]);
  return d;
}

const ago = (at: number, lng: Lng = 'en') => {
  const s = Math.round((Date.now() - at) / 1000);
  if (s < 60) return txl(lng, 'justNow');
  if (s < 3600) return txl(lng, 'minAgo', { n: Math.floor(s / 60) });
  if (s < 86400) return txl(lng, 'hAgo', { n: Math.floor(s / 3600) });
  return new Date(at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
};
const langOf = (id: string) => MUSIC_LANGS.find((l) => l.id === id);
const streamLinks = (search: string) => [
  { id: 'spotify', label: 'Spotify', url: `https://open.spotify.com/search/${encodeURIComponent(search)}` },
  { id: 'youtube', label: 'YouTube Music', url: `https://music.youtube.com/search?q=${encodeURIComponent(search)}` },
  { id: 'applemusic', label: 'Apple Music', url: `https://music.apple.com/search?term=${encodeURIComponent(search)}` },
];

/** Apple Music–style player. Shares its state with Control Center → Now Playing and the Music widget. */
export default function MusicApp({ win }: Partial<AppProps> = {}) {
  const m = useMusic();
  const { settings } = useSettings();
  const lng: Lng = settings.language === 'si' || settings.language === 'ta' ? settings.language : 'en';
  const tx = (k: TxKey, vars: Record<string, string | number> = {}) => txl(lng, k, vars);
  const [view, setView] = useState<View>(() => {
    const a = win?.args as Record<string, string> | undefined;
    if (a?.lang && langOf(a.lang)) return `lang:${a.lang}`;
    if (a?.view === 'browse' || a?.view === 'history' || a?.view === 'mine') return a.view;
    return 'home';
  });
  const [q, setQ] = useState('');
  const [favs, setFavs] = useState<string[]>(() => readStore(FAV_KEY, { ids: [] as string[] }).ids);
  const [lists, setLists] = useState<Playlist[]>(() => readStore(PL_KEY, { lists: [] as Playlist[] }).lists);
  const [addMenu, setAddMenu] = useState<string | null>(null);
  const [naming, setNaming] = useState<{ id?: string; name: string; add?: string } | null>(null);
  const [uploadLang, setUploadLang] = useState<MusicLang>('en');
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const durations = useDurations(m.tracks);
  const pct = m.duration ? (m.currentTime / m.duration) * 100 : 0;

  useEffect(() => writeStore(FAV_KEY, { ids: favs }), [favs]);
  useEffect(() => writeStore(PL_KEY, { lists }), [lists]);
  useEffect(() => {
    if (!addMenu) return;
    const close = (e: PointerEvent) => !(e.target as HTMLElement).closest('.am-addmenu, .am-add') && setAddMenu(null);
    window.addEventListener('pointerdown', close);
    return () => window.removeEventListener('pointerdown', close);
  }, [addMenu]);

  const byId = useMemo(() => new Map(m.tracks.map((t) => [t.id, t])), [m.tracks]);
  const albums = useMemo(() => {
    const map = new Map<string, Track[]>();
    m.tracks.forEach((t) => map.set(t.album, [...(map.get(t.album) ?? []), t]));
    return [...map.entries()].map(([name, list]) => ({ name, list, art: list[0].art, artist: list[0].artist }));
  }, [m.tracks]);
  const artists = useMemo(() => {
    const map = new Map<string, Track[]>();
    m.tracks.forEach((t) => map.set(t.artist, [...(map.get(t.artist) ?? []), t]));
    return [...map.entries()].map(([name, list]) => ({ name, list, art: list[0].art }));
  }, [m.tracks]);
  const genres = useMemo(() => [...new Set(m.tracks.map((t) => t.genre ?? 'Other'))], [m.tracks]);
  const history = m.history.map((h) => ({ ...h, t: byId.get(h.id) })).filter((h): h is { id: string; at: number; t: Track } => !!h.t);
  const mine = m.tracks.filter((t) => t.user);

  const idx = (t: Track) => m.tracks.findIndex((x) => x.id === t.id);
  /** play a song inside the list it was picked from, so Next / Previous stay in that list */
  const playIn = (list: Track[], t: Track) => (idx(t) === m.index && m.playing ? m.toggle() : m.playQueue(list.map((x) => x.id), t.id));
  const playAll = (list: Track[], shuffle = false) => {
    if (!list.length) return;
    if (shuffle !== m.shuffle) m.toggleShuffle();
    m.playQueue(
      list.map((x) => x.id),
      shuffle ? list[Math.floor(Math.random() * list.length)].id : list[0].id,
    );
  };
  const toggleFav = (id: string) => setFavs((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]));
  const addTo = (pl: string, id: string) => {
    setLists((ls) => ls.map((l) => (l.id === pl && !l.ids.includes(id) ? { ...l, ids: [...l.ids, id] } : l)));
    const l = lists.find((x) => x.id === pl);
    notify({ app: 'Music', icon: 'music', title: tx('addedToPl'), body: `${byId.get(id)?.title ?? tx('song')} → ${l?.name ?? tx('playlist')}`, silent: true });
    setAddMenu(null);
  };
  const savePlaylist = () => {
    if (!naming) return;
    const name = naming.name.trim() || tx('newPlaylist');
    if (naming.id) setLists((ls) => ls.map((l) => (l.id === naming.id ? { ...l, name } : l)));
    else {
      const id = `p${Date.now().toString(36)}`;
      setLists((ls) => [...ls, { id, name, ids: naming.add ? [naming.add] : [] }]);
      setView(`pl:${id}`);
    }
    setNaming(null);
    setAddMenu(null);
  };
  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    const n = await m.addUserFiles([...files], uploadLang);
    setBusy(false);
    if (fileRef.current) fileRef.current.value = '';
    notify({
      app: 'Music',
      icon: 'music',
      title: n ? tx(n > 1 ? 'addedMany' : 'addedOne', { n }) : tx('noAudio'),
      body: n ? tx('savedUnder', { label: langOf(uploadLang)?.label ?? tx('mySongs') }) : tx('chooseFormats'),
    });
  };
  const pickFiles = (lang: MusicLang) => {
    setUploadLang(lang);
    window.setTimeout(() => fileRef.current?.click(), 0);
  };

  const query = q.trim().toLowerCase();
  const found = query ? m.tracks.filter((t) => `${t.title} ${t.artist} ${t.album} ${t.genre ?? ''} ${t.moods?.join(' ') ?? ''} ${langOf(t.lang ?? '')?.label ?? ''}`.toLowerCase().includes(query)) : [];

  const go = (v: View) => {
    setView(v);
    setQ('');
  };
  const nav = (id: View, label: string, d: string) => (
    <button type="button" className={`am-nav ${view === id && !query ? 'on' : ''}`} onClick={() => go(id)}>
      <Glyph d={d} />
      {label}
    </button>
  );

  const songTable = (list: Track[], title?: ReactNode, opts: { removable?: (t: Track) => void; canRemove?: (t: Track) => boolean; empty?: ReactNode } = {}) => (
    <>
      {title}
      <div className="am-table" role="table" aria-label={tx('songs')}>
        <div className="am-tr head" role="row">
          <span>#</span>
          <span>{tx('title')}</span>
          <span className="am-hide-sm">{tx('album')}</span>
          <span>{tx('time')}</span>
          <span />
        </div>
        {list.map((t, i) => {
          const cur = idx(t) === m.index;
          return (
            <div key={t.id + i} className={`am-tr ${cur ? 'cur' : ''}`} role="row" onDoubleClick={() => playIn(list, t)}>
              <span className="am-num">
                {cur && m.playing ? (
                  <span className="eq" aria-label={tx('playing')}>
                    <i />
                    <i />
                    <i />
                  </span>
                ) : (
                  i + 1
                )}
              </span>
              <button type="button" className="am-title" onClick={() => playIn(list, t)}>
                <Cover t={t} />
                <span>
                  <b>{t.title}</b>
                  <small>
                    {t.artist}
                    {t.lang && t.lang !== 'inst' && <em className="am-lang-tag">{langOf(t.lang)?.label}</em>}
                  </small>
                </span>
              </button>
              <span className="am-hide-sm am-dim">{t.album}</span>
              <span className="am-dim">{durations[t.id] ? fmtTime(durations[t.id]) : '—'}</span>
              <span className="am-acts">
                <button type="button" className={`am-heart ${favs.includes(t.id) ? 'on' : ''}`} onClick={() => toggleFav(t.id)} aria-label={favs.includes(t.id) ? tx('unfav', { t: t.title }) : tx('fav', { t: t.title })}>
                  <Glyph d={G.heart} />
                </button>
                <button type="button" className="am-heart am-add" onClick={() => setAddMenu((x) => (x === t.id ? null : t.id))} aria-label={tx('addToPlAria', { t: t.title })} aria-expanded={addMenu === t.id}>
                  <Glyph d={G.plus} />
                </button>
                {opts.removable && (opts.canRemove?.(t) ?? true) && (
                  <button type="button" className="am-heart" onClick={() => opts.removable?.(t)} aria-label={tx('remove', { t: t.title })}>
                    <Glyph d={G.trash} />
                  </button>
                )}
                {addMenu === t.id && (
                  <span className="am-addmenu" role="menu">
                    <b>{tx('addToPl')}</b>
                    {lists.map((l) => (
                      <button key={l.id} type="button" role="menuitem" onClick={() => addTo(l.id, t.id)} disabled={l.ids.includes(t.id)}>
                        <Glyph d={G.list} />
                        {l.name}
                        {l.ids.includes(t.id) && <SysIcon n="check" size={12} />}
                      </button>
                    ))}
                    <button type="button" role="menuitem" className="am-addnew" onClick={() => setNaming({ name: '', add: t.id })}>
                      <Glyph d={G.plus} />
                      {tx('newPlaylistDots')}
                    </button>
                  </span>
                )}
              </span>
            </div>
          );
        })}
        {!list.length && <p className="am-empty">{opts.empty ?? tx('emptyDefault')}</p>}
      </div>
    </>
  );

  const shelf = (title: string, items: ReactNode, more?: View) => (
    <section className="am-shelf">
      <h3>
        {more ? (
          <button type="button" className="am-shelf-more" onClick={() => go(more)}>
            {title} <span aria-hidden="true">›</span>
          </button>
        ) : (
          title
        )}
      </h3>
      <div className="am-row">{items}</div>
    </section>
  );

  const header = (art: [string, string], title: string, sub: ReactNode, list: Track[], extra?: ReactNode, label?: string) => (
    <div className="am-album-head">
      <Cover t={{ art }} big label={label ?? title} />
      <div>
        <h1 className="am-h1">{title}</h1>
        <span className="am-dim">{sub}</span>
        <div className="am-album-actions">
          <button type="button" className="am-pill" onClick={() => playAll(list)} disabled={!list.length}>
            <SysIcon n="play" size={12} /> {tx('play')}
          </button>
          <button type="button" className="am-pill ghost" onClick={() => playAll(list, true)} disabled={!list.length}>
            <SysIcon n="shuffle" size={13} /> {tx('shuffle')}
          </button>
          {extra}
        </div>
      </div>
    </div>
  );

  const langCards = MUSIC_LANGS.map((l) => (
    <button key={l.id} type="button" className="am-cat" style={{ background: `linear-gradient(140deg, ${l.art[0]}, ${l.art[1]})` }} onClick={() => go(`lang:${l.id}`)}>
      <b>{l.label}</b>
      <span lang={l.id === 'inst' ? undefined : l.id}>{l.native}</span>
      <small>{tx('nSongs', { n: m.tracks.filter((t) => t.lang === l.id).length })}</small>
    </button>
  ));

  const streamRow = (search: string, label: string) => (
    <div className="am-stream">
      <span className="am-dim">{label}</span>
      <div>
        {streamLinks(search).map((s) => (
          <button key={s.id} type="button" className="am-pill ghost sm" onClick={() => openExternal(s.url, { title: tx('opening', { label: s.label }), app: 'Music', icon: 'music' })}>
            {s.label} <Glyph d={G.ext} />
          </button>
        ))}
      </div>
    </div>
  );

  let content: ReactNode;
  if (query) content = songTable(found, <h1 className="am-h1">{tx('results', { q })}</h1>, { empty: tx('noMatch') });
  else if (view === 'home')
    content = (
      <>
        <h1 className="am-h1">{tx('home')}</h1>
        {shelf(tx('byLang'), langCards, 'browse')}
        {shelf(
          tx('recentlyPlayed'),
          history.length ? (
            history.slice(0, 12).map(({ t, at }) => (
              <button key={t.id} type="button" className="am-tile" onClick={() => playIn(history.map((h) => h.t), t)}>
                <Cover t={t} big />
                <b>{t.title}</b>
                <small>{ago(at, lng)}</small>
              </button>
            ))
          ) : (
            <p className="am-empty">{tx('playShowHere')}</p>
          ),
          history.length ? 'history' : undefined,
        )}
        {shelf(
          tx('topPicks'),
          albums.map((a) => (
            <button key={a.name} type="button" className="am-pick" onClick={() => go(`album:${a.name}`)} style={{ background: `linear-gradient(160deg, ${a.art[0]}, ${a.art[1]})` }}>
              <small>{a.artist}</small>
              <span className="am-pick-note" aria-hidden="true">
                <SysIcon n="music" size={34} />
              </span>
              <b>{a.name}</b>
              <span>
                {tx('nSongs', { n: a.list.length })} · {a.list.map((t) => t.title).slice(0, 2).join(', ')}
              </span>
            </button>
          )),
          'albums',
        )}
        {shelf(
          tx('moodMixes'),
          MOODS.filter((md) => m.tracks.some((t) => t.moods?.includes(md.id))).map((md) => (
            <button key={md.id} type="button" className="am-tile" onClick={() => go(`mood:${md.id}`)}>
              <Cover t={{ art: md.art }} big label={tx('mixLabel')} />
              <b>{tx('mixName', { name: md.id })}</b>
              <small>{tx('nSongs', { n: m.tracks.filter((t) => t.moods?.includes(md.id)).length })}</small>
            </button>
          )),
        )}
      </>
    );
  else if (view === 'browse')
    content = (
      <>
        <h1 className="am-h1">{tx('browse')}</h1>
        <h3 className="am-sub">{tx('languages')}</h3>
        <div className="am-cats">{langCards}</div>
        <h3 className="am-sub">{tx('genres')}</h3>
        <div className="am-cats">
          {genres.map((g, i) => (
            <button key={g} type="button" className="am-cat sm" style={{ background: `linear-gradient(140deg, ${GENRE_ART[i % GENRE_ART.length][0]}, ${GENRE_ART[i % GENRE_ART.length][1]})` }} onClick={() => go(`genre:${g}`)}>
              <b>{g}</b>
              <small>{tx('nSongs', { n: m.tracks.filter((t) => (t.genre ?? 'Other') === g).length })}</small>
            </button>
          ))}
        </div>
        <h3 className="am-sub">{tx('moods')}</h3>
        <div className="am-cats">
          {MOODS.map((md) => (
            <button key={md.id} type="button" className="am-cat sm" style={{ background: `linear-gradient(140deg, ${md.art[0]}, ${md.art[1]})` }} onClick={() => go(`mood:${md.id}`)}>
              <b>{md.id}</b>
              <small>{tx('nSongs', { n: m.tracks.filter((t) => t.moods?.includes(md.id)).length })}</small>
            </button>
          ))}
        </div>
      </>
    );
  else if (view.startsWith('lang:')) {
    const l = langOf(view.slice(5)) ?? MUSIC_LANGS[0];
    const list = m.tracks.filter((t) => t.lang === l.id);
    const own = list.filter((t) => t.user);
    content = (
      <>
        {header(
          l.art,
          l.id === 'inst' ? tx('instrumental') : tx('langMusic', { label: l.label }),
          <>
            <span lang={l.id === 'inst' ? undefined : l.id}>{l.native}</span> · {tx('nSongs', { n: list.length })}{own.length ? tx('ofYours', { n: own.length }) : ''}
          </>,
          list,
          <button type="button" className="am-pill ghost" onClick={() => pickFiles(l.id)} disabled={busy}>
            <Glyph d={G.plus} /> {tx('addOwn')}
          </button>,
          l.label,
        )}
        {songTable(list, undefined, { removable: (t) => m.removeUserTrack(t.id),
          canRemove: (t) => !!t.user, empty: tx('langEmpty') })}
        {l.id !== 'inst' && <p className="am-note">{tx('langNote', { label: l.label })}</p>}
        {streamRow(l.search, l.id === 'inst' ? tx('moreInst') : tx('realOn', { label: l.label }))}
      </>
    );
  } else if (view.startsWith('genre:') || view.startsWith('mood:')) {
    const isG = view.startsWith('genre:');
    const name = view.slice(isG ? 6 : 5);
    const list = m.tracks.filter((t) => (isG ? (t.genre ?? 'Other') === name : t.moods?.includes(name as MusicMood)));
    const art = isG ? GENRE_ART[Math.max(0, genres.indexOf(name)) % GENRE_ART.length] : (MOODS.find((x) => x.id === name)?.art ?? MOODS[0].art);
    content = (
      <>
        {header(art, isG ? name : tx('mixName', { name }), tx(isG ? 'genreSub' : 'moodSub', { n: list.length }), list)}
        {songTable(list)}
      </>
    );
  } else if (view === 'radio')
    content = (
      <>
        <h1 className="am-h1">{tx('radio')}</h1>
        <button type="button" className="am-radio" onClick={() => openExternal(socials.spotify, { title: tx('openSpotify'), app: 'Music', icon: 'spotify' })}>
          <span className="am-radio-dot" aria-hidden="true" />
          <span>
            <b>{tx('onSpotify', { name: personal.name })}</b>
            <small>{tx('spotifyNote')}</small>
          </span>
          <Glyph d={G.ext} />
        </button>
        <h3 className="am-sub">{tx('stations')}</h3>
        <p className="am-note">{tx('radioNote1')}</p>
        {MUSIC_LANGS.filter((l) => l.id !== 'inst').map((l) => (
          <div key={l.id}>{streamRow(l.search, `${l.label} · ${l.native}`)}</div>
        ))}
        <p className="am-note">{tx('radioNote2')}</p>
      </>
    );
  else if (view === 'history')
    content = songTable(
      history.map((h) => h.t),
      <div className="am-h1-row">
        <h1 className="am-h1">{tx('recentlyPlayed')}</h1>
        {history.length > 0 && (
          <button type="button" className="am-pill ghost sm" onClick={m.clearHistory}>
            {tx('clear')}
          </button>
        )}
      </div>,
      { empty: tx('historyEmpty') },
    );
  else if (view === 'albums')
    content = (
      <>
        <h1 className="am-h1">{tx('albums')}</h1>
        <div className="am-grid">
          {albums.map((a) => (
            <button key={a.name} type="button" className="am-tile" onClick={() => go(`album:${a.name}`)}>
              <Cover t={a} big label={a.name} />
              <b>{a.name}</b>
              <small>{a.artist}</small>
            </button>
          ))}
        </div>
      </>
    );
  else if (view === 'artists')
    content = (
      <>
        <h1 className="am-h1">{tx('artists')}</h1>
        {artists.map((a) => (
          <button key={a.name} type="button" className="am-artist" onClick={() => go(`artist:${a.name}`)}>
            <span className="am-artist-pic" aria-hidden="true" style={{ background: `linear-gradient(135deg, ${a.art[0]}, ${a.art[1]})` }}>
              <SysIcon n="person" size={20} />
            </span>
            <span>
              <b>{a.name}</b>
              <small>
                {tx('nSongs', { n: a.list.length })} · {tx('nAlbums', { n: new Set(a.list.map((t) => t.album)).size })}
              </small>
            </span>
          </button>
        ))}
      </>
    );
  else if (view.startsWith('artist:')) {
    const a = artists.find((x) => `artist:${x.name}` === view) ?? artists[0];
    content = (
      <>
        {header(a.art, a.name, tx('artistSub', { n: a.list.length }), a.list)}
        {songTable(a.list)}
      </>
    );
  } else if (view.startsWith('album:')) {
    const a = albums.find((x) => `album:${x.name}` === view) ?? albums[0];
    content = (
      <>
        {header(a.art, a.name, `${a.artist} · ${tx('nSongs', { n: a.list.length })}`, a.list)}
        {songTable(a.list, undefined, { removable: a.name === 'My Songs' ? (t) => m.removeUserTrack(t.id) : undefined })}
      </>
    );
  } else if (view.startsWith('pl:')) {
    const pl = lists.find((x) => `pl:${x.id}` === view);
    if (!pl) content = <p className="am-empty">{tx('plDeleted')}</p>;
    else {
      const list = pl.ids.map((id) => byId.get(id)).filter((t): t is Track => !!t);
      content = (
        <>
          {header(
            GENRE_ART[lists.indexOf(pl) % GENRE_ART.length],
            pl.name,
            tx('plSub', { n: list.length }),
            list,
            <>
              <button type="button" className="am-pill ghost" onClick={() => setNaming({ id: pl.id, name: pl.name })}>
                {tx('rename')}
              </button>
              <button
                type="button"
                className="am-pill ghost danger"
                onClick={() => {
                  setLists((ls) => ls.filter((l) => l.id !== pl.id));
                  go('home');
                }}
              >
                {tx('delete')}
              </button>
            </>,
          )}
          {songTable(list, undefined, {
            removable: (t) => setLists((ls) => ls.map((l) => (l.id === pl.id ? { ...l, ids: l.ids.filter((x) => x !== t.id) } : l))),
            empty: tx('plEmpty'),
          })}
        </>
      );
    }
  } else if (view === 'mine')
    content = (
      <>
        <h1 className="am-h1">{tx('mySongs')}</h1>
        <div className="am-upload">
          <p>
            {tx('mineP1')}<b>{tx('mineP2')}</b>{tx('mineP3')}
          </p>
          <div className="am-upload-row">
            <label className="am-select">
              <span className="am-dim">{tx('language')}</span>
              <select value={uploadLang} onChange={(e) => setUploadLang(e.target.value as MusicLang)} aria-label={tx('langForAdded')}>
                {MUSIC_LANGS.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" className="am-pill" onClick={() => fileRef.current?.click()} disabled={busy}>
              <Glyph d={G.plus} /> {busy ? tx('adding') : tx('chooseSongs')}
            </button>
          </div>
          <small className="am-dim">{tx('tip')}</small>
        </div>
        {songTable(mine, undefined, { removable: (t) => m.removeUserTrack(t.id), empty: tx('mineEmpty') })}
      </>
    );
  else if (view === 'favs') content = songTable(m.tracks.filter((t) => favs.includes(t.id)), <h1 className="am-h1">{tx('favSongs')}</h1>);
  else if (view === 'recent') content = songTable([...m.tracks].reverse(), <h1 className="am-h1">{tx('recentlyAdded')}</h1>);
  else content = songTable(m.tracks, <h1 className="am-h1">{tx('songs')}</h1>);

  return (
    <div className="am-wrap">
    <div className="am">
      <input ref={fileRef} type="file" accept="audio/*,.mp3,.m4a,.aac,.wav,.ogg,.flac,.opus" multiple hidden onChange={(e) => void onFiles(e.target.files)} />
      <aside className="am-side">
        <DragBar className="am-drag">
          <Lights />
        </DragBar>
        <label className="am-search">
          <Glyph d={G.search} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tx('search')} aria-label={tx('searchMusic')} />
        </label>
        <div className="am-side-scroll">
          {nav('home', tx('home'), G.home)}
          {nav('browse', tx('browse'), G.browse)}
          {nav('radio', tx('radio'), G.radio)}
          <div className="am-sec">{tx('library')}</div>
          {nav('history', tx('recentlyPlayed'), G.history)}
          {nav('recent', tx('recentlyAdded'), G.recent)}
          {nav('artists', tx('artists'), G.artists)}
          {nav('albums', tx('albums'), G.albums)}
          {nav('songs', tx('songs'), G.songs)}
          {nav('mine', tx('mySongs'), G.mine)}
          <div className="am-sec">{tx('languages')}</div>
          {MUSIC_LANGS.map((l) => (
            <span key={l.id}>{nav(`lang:${l.id}`, l.label, G.globe)}</span>
          ))}
          <div className="am-sec am-sec-row">
            {tx('playlists')}
            <button type="button" className="am-sec-add" onClick={() => setNaming({ name: '' })} aria-label={tx('newPlaylistAria')} title={tx('newPlaylist')}>
              <Glyph d={G.plus} />
            </button>
          </div>
          {nav('favs', tx('favSongs'), G.heart)}
          {lists.map((l) => (
            <span key={l.id}>{nav(`pl:${l.id}`, l.name, G.list)}</span>
          ))}
        </div>
        <div className="am-user">
          <img src={personal.avatar} alt="" />
          <span>{personal.name}</span>
        </div>
      </aside>

      <section className="am-main">
        <DragBar className="am-drag main" />
        <div className="am-scroll scroll-smooth" key={query ? 'q' : view}>
          <div className="fade-swap">{content}</div>
        </div>

        {naming && (
          <div className="am-dialog-bg" onPointerDown={(e) => e.target === e.currentTarget && setNaming(null)}>
            <form
              className="am-dialog"
              onSubmit={(e) => {
                e.preventDefault();
                savePlaylist();
              }}
            >
              <b>{naming.id ? tx('renamePlaylist') : tx('newPlaylist')}</b>
              <input autoFocus value={naming.name} maxLength={40} onChange={(e) => setNaming({ ...naming, name: e.target.value })} placeholder={tx('plName')} aria-label={tx('plName')} />
              <div>
                <button type="button" className="am-pill ghost" onClick={() => setNaming(null)}>
                  {tx('cancel')}
                </button>
                <button type="submit" className="am-pill">
                  {naming.id ? tx('save') : tx('create')}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* floating mini player */}
        <div className="am-player">
          <Cover t={m.track} />
          <div className="am-p-meta">
            <b>{m.track.title}</b>
            <small>
              {m.track.artist} — {m.track.album}
            </small>
            {m.error && <small className="am-err">{m.error}</small>}
          </div>
          <div className="am-p-ctrl">
            <button type="button" className={`am-p-btn sm ${m.shuffle ? 'on' : ''}`} onClick={m.toggleShuffle} aria-pressed={m.shuffle} aria-label={tx('shuffle')}>
              <SysIcon n="shuffle" size={15} />
            </button>
            <button type="button" className="am-p-btn" onClick={m.prev} aria-label={tx('prevTrack')}>
              <SysIcon n="prev" size={17} />
            </button>
            <button type="button" className="am-p-btn play" onClick={m.toggle} aria-label={m.playing ? tx('pause') : tx('play')}>
              {m.playing ? I.pause : I.play}
            </button>
            <button type="button" className="am-p-btn" onClick={m.next} aria-label={tx('nextTrack')}>
              <SysIcon n="next" size={17} />
            </button>
            <button type="button" className={`am-p-btn sm ${m.repeat !== 'off' ? 'on' : ''}`} onClick={m.cycleRepeat} aria-label={tx('repeat', { mode: m.repeat })}>
              <SysIcon n={m.repeat === 'one' ? 'repeatOne' : 'repeat'} size={15} />
            </button>
            <button type="button" className="am-p-btn sm" onClick={openMusicPiP} aria-label={tx('pip')} title={tx('pipTitle')}>
              <Glyph d={G.pip} />
            </button>
          </div>
          <div className="am-p-seek">
            <span>{fmtTime(m.currentTime)}</span>
            <input type="range" min={0} max={m.duration || 0} step={0.1} value={m.currentTime} onChange={(e) => m.seek(Number(e.target.value))} aria-label={tx('seek')} style={{ ['--p' as string]: `${pct}%` }} />
            <span>{fmtTime(m.duration)}</span>
          </div>
          <div className="am-p-vol">
            <button type="button" className="am-p-btn sm" onClick={m.toggleMute} aria-label={m.muted ? tx('unmute') : tx('mute')}>
              {m.muted || m.volume === 0 ? I.mute : I.speaker}
            </button>
            <input type="range" min={0} max={1} step={0.01} value={m.muted ? 0 : m.volume} onChange={(e) => m.setVolume(Number(e.target.value))} aria-label={tx('volume')} style={{ ['--p' as string]: `${(m.muted ? 0 : m.volume) * 100}%` }} />
          </div>
        </div>
      </section>
    </div>
    </div>
  );
}
