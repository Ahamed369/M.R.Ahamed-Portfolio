import { useEffect, useMemo, useState } from 'react';
import { insertText } from '../system/clipboard';

const SETS: { name: string; icon: string; list: string }[] = [
  { name: 'Smileys', icon: '😀', list: '😀 😃 😄 😁 😆 😅 😂 🤣 😊 😇 🙂 🙃 😉 😌 😍 🥰 😘 😗 😙 😚 😋 😛 😝 😜 🤪 🤨 🧐 🤓 😎 🥸 🤩 🥳 😏 😒 😞 😔 😟 😕 🙁 😣 😖 😫 😩 🥺 😢 😭 😤 😠 😡 🤯 😳 🥵 🥶 😱 😨 😰 😥 😓 🤗 🤔 🤭 🤫 🤥 😶 😐 😑 😬 🙄 😯 😦 😧 😮 😲 🥱 😴 🤤 😪 😵 🤐 🥴 🤢 🤮 🤧 😷 🤒 🤕' },
  { name: 'People', icon: '👋', list: '👋 🤚 🖐 ✋ 🖖 👌 🤌 🤏 ✌️ 🤞 🤟 🤘 🤙 👈 👉 👆 👇 ☝️ 👍 👎 ✊ 👊 🤛 🤜 👏 🙌 👐 🤲 🤝 🙏 ✍️ 💅 💪 🧠 👀 👁 👤 👥 🧑‍💻 👨‍💻 👩‍💻 🧑‍🎓 🧑‍💼 🧑‍🔧 🧑‍🔬 🧑‍🎨 🧑‍🚀' },
  { name: 'Nature', icon: '🌿', list: '🌱 🌿 ☘️ 🍀 🌵 🌴 🌳 🌲 🍁 🍂 🍃 🌸 🌼 🌻 🌺 🌹 🌷 💐 🌞 🌝 🌛 ⭐ 🌟 ✨ ⚡ 🔥 🌈 ☀️ ⛅ ☁️ 🌧 ⛈ ❄️ 💧 🌊 🐶 🐱 🐭 🐹 🐰 🦊 🐻 🐼 🐨 🐯 🦁 🐮 🐷 🐸 🐵 🐔 🐧 🐦 🦅 🦉 🐝 🦋 🐢 🐍 🐬 🐳 🐘' },
  { name: 'Food', icon: '🍔', list: '🍏 🍎 🍐 🍊 🍋 🍌 🍉 🍇 🍓 🫐 🍒 🍑 🥭 🍍 🥥 🥝 🍅 🥑 🥦 🌽 🥕 🧄 🥔 🍠 🥐 🍞 🧀 🥚 🍳 🥞 🥓 🍗 🍖 🌭 🍔 🍟 🍕 🌮 🌯 🥗 🍝 🍜 🍲 🍛 🍣 🍱 🥟 🍤 🍙 🍚 🍘 🍥 🍰 🎂 🍮 🍭 🍬 🍫 🍿 🍩 🍪 ☕ 🍵 🧃 🥤' },
  { name: 'Activity', icon: '⚽', list: '⚽ 🏀 🏈 ⚾ 🎾 🏐 🏉 🎱 🏓 🏸 🏏 🥅 ⛳ 🏹 🎣 🥊 🥋 🎽 🛹 ⛸ 🎿 🏆 🥇 🥈 🥉 🏅 🎖 🎗 🎫 🎟 🎪 🎭 🎨 🎬 🎤 🎧 🎼 🎹 🥁 🎷 🎺 🎸 🎻 🎲 ♟ 🎯 🎳 🎮 🧩' },
  { name: 'Travel', icon: '🚗', list: '🚗 🚕 🚙 🚌 🏎 🚓 🚑 🚒 🚐 🛻 🚚 🏍 🛵 🚲 🛴 🚨 🚔 🚘 ✈️ 🛫 🛬 🚀 🛸 🚁 ⛵ 🚤 🛳 ⚓ 🗺 🗽 🗼 🏰 🏯 🏟 🎡 🎢 🏖 🏝 🏜 🌋 ⛰ 🏔 🗻 🏕 🏠 🏡 🏢 🏬 🏦 🏨 🏪 🏫 🕌 ⛪ 🕍' },
  { name: 'Objects', icon: '💡', list: '⌚ 📱 💻 ⌨️ 🖥 🖨 🖱 💽 💾 💿 📀 📷 📸 📹 🎥 📞 ☎️ 📺 📻 🎙 ⏰ ⏱ ⌛ 📡 🔋 🔌 💡 🔦 🕯 🧯 💸 💵 💳 💎 ⚖️ 🧰 🔧 🔨 ⚙️ 🧲 🔫 💣 🔪 🛡 🔑 🗝 🚪 🛋 🛏 🧸 🎁 🎈 📦 📫 📮 📝 📁 📂 📅 📆 📈 📉 📊 📋 📌 📍 📎 📏 📐 ✂️ 🔒 🔓' },
  { name: 'Symbols', icon: '❤️', list: '❤️ 🧡 💛 💚 💙 💜 🖤 🤍 🤎 💔 ❣️ 💕 💞 💓 💗 💖 💘 💝 ✅ ☑️ ✔️ ❌ ❎ ➕ ➖ ➗ ✖️ ♾ 💯 🔟 🔢 #️⃣ *️⃣ ▶️ ⏸ ⏹ ⏺ ⏭ ⏮ 🔀 🔁 🔂 ◀️ 🔼 🔽 ➡️ ⬅️ ⬆️ ⬇️ ↗️ ↘️ ↙️ ↖️ ↕️ ↔️ 🔄 ℹ️ 🆗 🆕 🆒 🆓 ⚠️ 🚫 ⛔ ✳️ ❇️ ©️ ®️ ™️' },
];

/** v10 — Emoji & Symbols (Edit menu, ⌃⌘Space) — inserts into the last text field used. */
export function EmojiPicker() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState(0);
  const [q, setQ] = useState('');
  const [recent, setRecent] = useState<string[]>([]);
  useEffect(() => {
    const on = () => setOpen((o) => !o);
    const key = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.metaKey && (e.code === 'Space' || e.key === ' ')) {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('mra-emoji', on);
    window.addEventListener('keydown', key);
    return () => {
      window.removeEventListener('mra-emoji', on);
      window.removeEventListener('keydown', key);
    };
  }, []);
  const list = useMemo(() => {
    const all = SETS.flatMap((s) => s.list.split(' ').map((e) => ({ e, s: s.name })));
    if (q.trim()) return all.filter((x) => x.s.toLowerCase().includes(q.trim().toLowerCase())).map((x) => x.e);
    return SETS[tab].list.split(' ');
  }, [tab, q]);
  if (!open) return null;
  const pick = (e: string) => {
    insertText(e);
    setRecent((r) => [e, ...r.filter((x) => x !== e)].slice(0, 16));
  };
  return (
    <div className="emoji-pop" role="dialog" aria-label="Emoji & Symbols" onPointerDown={(e) => e.preventDefault()}>
      <input className="emoji-q" placeholder="Search category" value={q} onChange={(e) => setQ(e.target.value)} onPointerDown={(e) => e.stopPropagation()} />
      {recent.length > 0 && !q && (
        <div className="emoji-recent">
          {recent.map((e) => (
            <button key={e} type="button" onClick={() => pick(e)}>
              {e}
            </button>
          ))}
        </div>
      )}
      <div className="emoji-grid">
        {list.map((e, i) => (
          <button key={`${e}${i}`} type="button" onClick={() => pick(e)} aria-label={e}>
            {e}
          </button>
        ))}
      </div>
      <div className="emoji-tabs">
        {SETS.map((s, i) => (
          <button key={s.name} type="button" className={i === tab && !q ? 'on' : ''} title={s.name} onClick={() => (setTab(i), setQ(''))}>
            {s.icon}
          </button>
        ))}
        <button type="button" className="emoji-x" onClick={() => setOpen(false)} aria-label="Close">
          ✕
        </button>
      </div>
    </div>
  );
}
