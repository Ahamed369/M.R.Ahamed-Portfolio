"""v10.3 — original instrumentals in five language styles (English, Sinhala,
Tamil, Arabic, Hindi). Every sound is synthesised from scratch with numpy —
no samples, no melodies from existing songs — so they are 100% royalty-free."""
import numpy as np, subprocess, sys, os
from scipy.signal import butter, sosfilt

SR = 44100
OUT = sys.argv[1]
rng = np.random.default_rng(1)

def hz(n): return 440.0 * 2 ** ((n - 69) / 12)
def T(d): return np.arange(int(d * SR)) / SR

def adsr(n, a=.005, d=.1, s=.7, r=.1):
    e = np.full(n, s, float); ai, di, ri = max(1, int(a*SR)), int(d*SR), int(r*SR)
    e[:ai] = np.linspace(0, 1, ai)[:n]
    if ai + di < n: e[ai:ai+di] = np.linspace(1, s, di)
    if 0 < ri < n: e[-ri:] *= np.linspace(1, 0, ri)
    return e

def lp(x, f, o=2): return sosfilt(butter(o, f, btype='low', fs=SR, output='sos'), x)
def hp(x, f, o=2): return sosfilt(butter(o, f, btype='high', fs=SR, output='sos'), x)
def bp(x, lo, hi): return sosfilt(butter(2, [lo, hi], btype='band', fs=SR, output='sos'), x)

def ks(freq, dur, bright=.5, decay=.996):
    """Karplus–Strong plucked string."""
    n = int(dur * SR); p = max(2, int(SR / freq))
    buf = rng.uniform(-1, 1, p); buf = lp(buf, 800 + 7000 * bright, 1)
    reps = n // p + 1; chunks = []
    for _ in range(reps):
        chunks.append(buf)
        buf = decay * 0.5 * (buf + np.roll(buf, -1))
    out = np.concatenate(chunks)[:n]
    return out * adsr(n, .001, .05, 1, .05)

def sitar(freq, dur, vel=.4):
    x = ks(freq, dur, .9, .998)
    t = T(dur)[:len(x)]
    buzz = np.tanh(6 * x) * .35  # jawari buzz
    sym = sum(np.sin(2*np.pi*freq*k*t) * np.exp(-t*(1.5+k)) * .08 for k in (2, 3, 4))
    return (x + buzz + sym) * vel

def veena(freq, dur, vel=.4, glide=0.0):
    t = T(dur); f = freq * (1 + glide * np.clip(t * 6, 0, 1))
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = sum((.55 ** k) * np.sin(ph * (k + 1)) * np.exp(-t * (1.6 + k * .9)) for k in range(6))
    return x * adsr(len(t), .003, .08, 1, .08) * vel

def oud(freq, dur, vel=.4):
    x = ks(freq, dur, .35, .997)
    return lp(x, 2600) * vel * 1.3

def guitar(freqs, at, dur, buf, vel=.22, down=True, pan=0):
    order = freqs if down else freqs[::-1]
    for j, f in enumerate(order):
        add(buf, ks(f, dur, .55, .995) * vel, at + j * .013, pan)

def epiano(freq, dur, vel=.4):
    t = T(dur); mod = np.sin(2*np.pi*freq*t) * 2 * np.exp(-t*3.5)
    x = np.sin(2*np.pi*freq*t + mod) * np.exp(-t*.9)
    return x * adsr(len(t), .004, .2, .8, min(.3, dur*.4)) * vel

def synth(freq, dur, vel=.2):
    t = T(dur); x = sum(np.sin(2*np.pi*freq*k*1.002*t)/k for k in range(1, 8))
    return lp(x, 3200) * adsr(len(t), .02, .1, .7, .15) * vel

def flute(freq, dur, vel=.25, vib=.006):
    t = T(dur); f = freq * (1 + vib * np.sin(2*np.pi*5.2*t) * np.clip(t*3, 0, 1))
    ph = 2*np.pi*np.cumsum(f)/SR
    x = np.sin(ph) + .25*np.sin(2*ph) + .08*np.sin(3*ph)
    x += lp(rng.standard_normal(len(t)), 3000) * .05
    return x * adsr(len(t), .06, .1, .85, .12) * vel

def brass(freq, dur, vel=.25):
    t = T(dur); bright = np.clip(t*8, 0, 1)
    x = sum(np.sin(2*np.pi*freq*k*t) * (1/k) * (bright if k > 2 else 1) for k in range(1, 10))
    return lp(x, 2800) * adsr(len(t), .03, .1, .8, .08) * vel

def drone(freqs, dur, vel=.08):
    t = T(dur); x = np.zeros(len(t))
    for f in freqs:
        x += sum(np.sin(2*np.pi*f*k*t + k) * (.6**k) * (1 + .3*np.sin(2*np.pi*.23*k*t)) for k in range(1, 7))
    return x * adsr(len(t), 1.5, .1, 1, 2) * vel

def bass(freq, dur, vel=.5):
    t = T(dur); x = np.sin(2*np.pi*freq*t) + .3*np.sin(4*np.pi*freq*t)
    return np.tanh(1.5*x) * adsr(len(t), .008, .1, .8, .08) * vel

def membrane(f0, f1, dur, decay, vel, noise=.1):
    t = T(dur); f = f1 + (f0 - f1) * np.exp(-t * 30)
    x = np.sin(2*np.pi*np.cumsum(f)/SR) * np.exp(-t*decay)
    x += bp(rng.standard_normal(len(t)), 600, 5000) * np.exp(-t*40) * noise
    return x * vel

def kick(): return membrane(140, 48, .4, 8, .9, .05)
def snare():
    t = T(.25); return bp(rng.standard_normal(len(t)), 1200, 7000) * np.exp(-t*17) * .5 + np.sin(2*np.pi*190*t)*np.exp(-t*22)*.3
def clap():
    t = T(.2); n = bp(rng.standard_normal(len(t)), 900, 4000)
    e = sum(np.exp(-np.clip(t - d, 0, None) * 60) * (t >= d) for d in (0, .01, .022))
    return n * e * .45
def hat(o=False):
    t = T(.16 if o else .05); return hp(rng.standard_normal(len(t)), 7500) * np.exp(-t*(18 if o else 70)) * .16
def shaker():
    t = T(.07); return hp(rng.standard_normal(len(t)), 5000) * np.sin(np.pi * t / .07) * .09
def tabla_na(): return membrane(520, 480, .35, 9, .35, .25)
def tabla_ge(): return membrane(110, 70, .5, 5, .55, .05)
def tabla_tin(): return membrane(620, 600, .2, 18, .28, .2)
def doum(): return membrane(95, 60, .45, 6, .7, .05)
def tek(): return membrane(900, 850, .08, 45, .3, .6)
def raban(): return membrane(180, 150, .3, 10, .45, .2)
def thappu(): return membrane(260, 140, .25, 14, .7, .5)

def add(buf, x, at, pan=0.0):
    i = int(at * SR)
    if i >= buf.shape[1] or i < 0: return
    x = x[: buf.shape[1] - i]
    l = np.cos((pan + 1) * np.pi / 4); r = np.sin((pan + 1) * np.pi / 4)
    buf[0, i:i+len(x)] += x * l; buf[1, i:i+len(x)] += x * r

def master(buf, name, title, artist, cutoff=9000, verb=.18):
    # small stereo "room": a few early reflections
    out = buf.copy()
    for d, g in ((.031, .5), (.047, .4), (.073, .3), (.11, .2)):
        k = int(d * SR); out[0, k:] += buf[1, :-k] * g * verb; out[1, k:] += buf[0, :-k] * g * verb
    out = sosfilt(butter(2, cutoff, btype='low', fs=SR, output='sos'), out, axis=1)
    out = sosfilt(butter(1, 35, btype='high', fs=SR, output='sos'), out, axis=1)
    out = np.tanh(out * 1.5) / np.tanh(1.5)
    out = out / (np.max(np.abs(out)) or 1) * .9
    fi, fo = int(1 * SR), int(3 * SR)
    out[:, :fi] *= np.linspace(0, 1, fi); out[:, -fo:] *= np.linspace(1, 0, fo)
    raw = f'/tmp/{name}.raw'; (out.T * 32767).astype(np.int16).tofile(raw)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 's16le', '-ar', str(SR), '-ac', '2', '-i', raw, '-c:a', 'libmp3lame', '-b:a', '112k',
                    '-metadata', f'title={title}', '-metadata', f'artist={artist}', '-metadata', 'comment=Original instrumental, synthesised for this portfolio. Royalty-free.',
                    os.path.join(OUT, f'{name}.mp3')], check=True)
    os.remove(raw); print(name, round(buf.shape[1] / SR, 1), 's')

def melody(scale, n, seed, rest=.25, span=8):
    """A singable phrase: mostly stepwise motion inside the scale."""
    r = np.random.default_rng(seed); i = int(r.integers(0, len(scale))); out = []
    for _ in range(n):
        if r.random() < rest: out.append(None); continue
        i = int(np.clip(i + r.choice([-2, -1, -1, 0, 1, 1, 2]), 0, min(span, len(scale) - 1)))
        out.append(scale[i])
    return out

def ext(scale, octs=2): return [s + 12 * o for o in range(octs) for s in scale]

# ───────────────────────── English: acoustic pop & synth-pop ─────────────────────────
def english_pop(name, title, seed, bpm=104, key=62):
    global rng; rng = np.random.default_rng(seed)
    beat = 60 / bpm; bar = 4 * beat; bars = 32
    buf = np.zeros((2, int((bars * bar + 3) * SR)))
    prog = [(0, [0, 4, 7]), (7, [0, 4, 7]), (9, [0, 3, 7]), (5, [0, 4, 7])]  # I–V–vi–IV
    scale = ext([0, 2, 4, 7, 9])
    hook = melody(scale, 16, seed, .2, 7); verse = melody(scale, 16, seed + 9, .3, 6)
    for b in range(bars):
        r, q = prog[b % 4]; t0 = b * bar; root = key + r
        fr = [hz(root - 12 + iv) for iv in q] + [hz(root + q[1]), hz(root + 12)]
        for s, (pos, dn) in enumerate([(0, 1), (1, 1), (1.5, 0), (2.5, 0), (3, 1), (3.5, 0)]):
            guitar(fr, t0 + pos * beat, beat * 1.2, buf, .13 if dn else .09, bool(dn), -.3)
        add(buf, bass(hz(root - 24), beat * 1.8, .45), t0); add(buf, bass(hz(root - 24 + 7), beat * 1.6, .38), t0 + 2 * beat)
        if b >= 2:
            add(buf, kick(), t0); add(buf, kick(), t0 + 2.5 * beat)
            add(buf, clap() if b >= 8 else snare(), t0 + beat, .05); add(buf, clap() if b >= 8 else snare(), t0 + 3 * beat, .05)
            for s in range(8): add(buf, shaker(), t0 + s * beat / 2, .4)
        if 4 <= b < bars - 2:
            ph = hook if (b // 8) % 2 else verse
            for s in range(4):
                n = ph[(b % 4) * 4 + s]
                if n is not None: add(buf, (synth if b >= 16 else epiano)(hz(key + 12 + n), beat * 1.1, .2), t0 + s * beat, .2)
    master(buf, name, title, 'Portfolio Originals · English')

def english_synth(name, title, seed, bpm=116, key=57):
    global rng; rng = np.random.default_rng(seed)
    beat = 60 / bpm; bar = 4 * beat; bars = 36
    buf = np.zeros((2, int((bars * bar + 3) * SR)))
    prog = [(0, [0, 3, 7, 10]), (8, [0, 4, 7, 11]), (3, [0, 4, 7]), (10, [0, 4, 7])]  # i–VI–III–VII
    scale = ext([0, 2, 3, 5, 7, 10]); ph = melody(scale, 32, seed, .25, 8)
    for b in range(bars):
        r, q = prog[b % 4]; t0 = b * bar; root = key + r
        for s in range(8):
            for iv in q[:3]: add(buf, synth(hz(root + iv), beat * .45, .06), t0 + s * beat / 2, -.2 + iv * .02)
            add(buf, bass(hz(root - 24 + (12 if s % 2 else 0)), beat * .45, .38), t0 + s * beat / 2)
        if b >= 4:
            for s in range(4): add(buf, kick(), t0 + s * beat)
            add(buf, clap(), t0 + beat, .1); add(buf, clap(), t0 + 3 * beat, -.1)
            for s in range(8): add(buf, hat(s % 2 == 1), t0 + s * beat / 2 + beat / 4, .35)
        if 8 <= b < bars - 2:
            for s in range(8):
                n = ph[((b % 4) * 8 + s) % 32]
                if n is not None and s % 2 == 0 or (n is not None and b >= 20):
                    add(buf, synth(hz(key + 12 + n), beat * .5, .14), t0 + s * beat / 2, .25)
    master(buf, name, title, 'Portfolio Originals · English', 8500, .25)

# ───────────────────────── Sinhala: baila (6/8) & raban folk ─────────────────────────
def sinhala_baila(name, title, seed, bpm=126, key=60):
    """6/8 baila feel: strummed guitar on the off-beats, bass on 1 and 4, bongo-like raban."""
    global rng; rng = np.random.default_rng(seed)
    e = 60 / bpm / 2  # eighth note; bar = 6 eighths
    bar = 6 * e; bars = 40
    buf = np.zeros((2, int((bars * bar + 3) * SR)))
    prog = [(0, [0, 4, 7]), (0, [0, 4, 7]), (7, [0, 4, 7, 10]), (7, [0, 4, 7, 10]), (5, [0, 4, 7]), (0, [0, 4, 7]), (7, [0, 4, 7, 10]), (0, [0, 4, 7])]
    scale = ext([0, 2, 4, 5, 7, 9, 11]); ph = melody(scale, 48, seed, .22, 9)
    for b in range(bars):
        r, q = prog[b % 8]; t0 = b * bar; root = key + r
        fr = [hz(root - 12 + iv) for iv in q] + [hz(root + 12)]
        add(buf, bass(hz(root - 24), e * 2.5, .5), t0); add(buf, bass(hz(root - 24 + 7), e * 2.5, .42), t0 + 3 * e)
        for s in (1, 2, 4, 5): guitar(fr, t0 + s * e, e * 1.4, buf, .1, s in (1, 4), -.35)
        if b >= 2:
            add(buf, raban(), t0, .2); add(buf, raban(), t0 + 3 * e, .2)
            for s in (1, 2, 4, 5): add(buf, membrane(320, 300, .15, 20, .25, .3), t0 + s * e, -.2)
            add(buf, shaker(), t0 + 1.5 * e, .5); add(buf, shaker(), t0 + 4.5 * e, .5)
        if 4 <= b < bars - 2:
            inst = brass if (b // 8) % 2 else flute
            for s in range(6):
                n = ph[((b % 8) * 6 + s) % 48]
                if n is not None and s % 2 == 0: add(buf, inst(hz(key + 12 + n), e * 2.1, .2), t0 + s * e, .25)
    master(buf, name, title, 'Portfolio Originals · Sinhala style')

def sinhala_raban(name, title, seed, bpm=96, key=62):
    """Village-folk feel: raban drum circle, a bamboo flute, a drone and a hand-clap."""
    global rng; rng = np.random.default_rng(seed)
    beat = 60 / bpm; bar = 4 * beat; bars = 28
    buf = np.zeros((2, int((bars * bar + 3) * SR)))
    scale = ext([0, 2, 4, 5, 7, 9, 10]); ph = melody(scale, 32, seed, .3, 9)
    add(buf, drone([hz(key - 12), hz(key - 5)], bars * bar, .05), 0)
    pat = [0, .75, 1.5, 2, 2.75, 3.5]
    for b in range(bars):
        t0 = b * bar
        if b >= 1:
            for i, p in enumerate(pat): add(buf, raban() if i in (0, 3) else membrane(300, 280, .18, 16, .28, .3), t0 + p * beat, (-.3, .3)[i % 2])
        if b >= 6: add(buf, clap(), t0 + beat, 0); add(buf, clap(), t0 + 3 * beat, 0)
        if b % 2 == 0: add(buf, bass(hz(key - 24), bar * .9, .35), t0)
        if 3 <= b < bars - 2:
            for s in range(4):
                n = ph[((b % 8) * 4 + s) % 32]
                if n is not None: add(buf, flute(hz(key + 12 + n), beat * 1.05, .22, .01), t0 + s * beat, .15)
    master(buf, name, title, 'Portfolio Originals · Sinhala style', 8000, .3)

# ───────────────────────── Tamil: kuthu & carnatic-flavoured ─────────────────────────
def tamil_kuthu(name, title, seed, bpm=132, key=61):
    """High-energy thappu rhythm with a nadaswaram-like reed lead (Mayamalavagowla colour)."""
    global rng; rng = np.random.default_rng(seed)
    beat = 60 / bpm; bar = 4 * beat; bars = 40
    buf = np.zeros((2, int((bars * bar + 3) * SR)))
    scale = ext([0, 1, 4, 5, 7, 8, 11]); ph = melody(scale, 32, seed, .2, 9)
    for b in range(bars):
        t0 = b * bar
        if b >= 2:
            for s, v in [(0, 1), (.5, .5), (1, .7), (1.75, .6), (2, 1), (2.5, .5), (3, .8), (3.5, .6), (3.75, .5)]:
                add(buf, thappu() * v, t0 + s * beat, (-.25, .25)[int(s * 2) % 2])
            add(buf, kick(), t0); add(buf, kick(), t0 + 2 * beat)
        if b >= 8:
            for s in range(8): add(buf, hat(), t0 + s * beat / 2, .4)
        add(buf, bass(hz(key - 24), beat * .9, .45), t0); add(buf, bass(hz(key - 24 + 7), beat * .9, .4), t0 + 2 * beat)
        add(buf, bass(hz(key - 24 + 8), beat * .9, .35), t0 + 3 * beat)
        if 4 <= b < bars - 2:
            for s in range(8):
                n = ph[((b % 4) * 8 + s) % 32]
                if n is not None and (s % 2 == 0 or b >= 16):
                    x = brass(hz(key + 12 + n), beat * .55, .16) * (1 + .3 * np.sin(np.arange(int(beat * .55 * SR)) / SR * 2 * np.pi * 6))
                    add(buf, x, t0 + s * beat / 2, .2)
    master(buf, name, title, 'Portfolio Originals · Tamil style', 8500, .2)

def tamil_veena(name, title, seed, bpm=78, key=62):
    """Calm, carnatic-flavoured piece: veena-like plucks with gamaka slides over a tanpura drone and mridangam-like strokes."""
    global rng; rng = np.random.default_rng(seed)
    beat = 60 / bpm; bar = 8 * beat / 2; bars = 26  # adi tala feel (8 beats) at half speed
    buf = np.zeros((2, int((bars * bar + 3) * SR)))
    scale = ext([0, 2, 4, 5, 7, 9, 11]); ph = melody(scale, 32, seed, .2, 10)  # Shankarabharanam colour
    add(buf, drone([hz(key - 12), hz(key - 5), hz(key)], bars * bar, .045), 0)
    for b in range(bars):
        t0 = b * bar
        if b >= 2:
            for s in range(8):
                add(buf, membrane(200, 180, .25, 12, .32 if s in (0, 4) else .18, .25), t0 + s * beat / 2, -.15)
                if s in (2, 6): add(buf, membrane(90, 60, .4, 6, .3, .05), t0 + s * beat / 2, .1)
        if 2 <= b < bars - 1:
            for s in range(8):
                n = ph[((b % 4) * 8 + s) % 32]
                if n is not None: add(buf, veena(hz(key + n), beat * .9, .32, glide=float(rng.choice([0, 0, .03, -.03]))), t0 + s * beat / 2, .2)
    master(buf, name, title, 'Portfolio Originals · Tamil style', 7500, .35)

# ───────────────────────── Arabic: maqam hijaz & oasis groove ─────────────────────────
def arabic_maqsum(name, title, seed, bpm=100, key=62, scale_iv=(0, 1, 4, 5, 7, 8, 10)):
    """Maqsum rhythm (doum-tek-tek-doum-tek) on a darbuka, oud melody, string-pad drone."""
    global rng; rng = np.random.default_rng(seed)
    beat = 60 / bpm; bar = 4 * beat; bars = 32
    buf = np.zeros((2, int((bars * bar + 3) * SR)))
    scale = ext(list(scale_iv)); ph = melody(scale, 32, seed, .18, 9)
    add(buf, drone([hz(key - 12), hz(key - 5)], bars * bar, .04), 0)
    maqsum = [(0, 'D'), (1, 'T'), (1.5, 'T'), (2.5, 'D'), (3, 'T')]
    for b in range(bars):
        t0 = b * bar
        if b >= 2:
            for p, k in maqsum: add(buf, doum() if k == 'D' else tek(), t0 + p * beat, (.15 if k == 'T' else 0))
            for s in (0.5, 2, 3.5): add(buf, tek() * .5, t0 + s * beat, -.2)
            if b >= 10:
                for s in range(8): add(buf, shaker(), t0 + s * beat / 2, .45)
        add(buf, bass(hz(key - 24), beat * 1.4, .4), t0); add(buf, bass(hz(key - 24), beat * 1.2, .32), t0 + 2.5 * beat)
        if 3 <= b < bars - 2:
            for s in range(8):
                n = ph[((b % 4) * 8 + s) % 32]
                if n is not None:
                    add(buf, oud(hz(key + n), beat * .9, .5), t0 + s * beat / 2, .2)
                    if rng.random() < .25: add(buf, oud(hz(key + n), beat * .4, .3), t0 + s * beat / 2 + beat / 4, .2)  # tremolo pick
            if b >= 16:
                for s in range(2):
                    n = ph[((b % 4) * 8 + s * 4) % 32]
                    if n is not None: add(buf, flute(hz(key + 12 + n), beat * 1.9, .14, .012), t0 + s * 2 * beat, -.25)  # ney-like
    master(buf, name, title, 'Portfolio Originals · Arabic style', 8000, .3)

# ───────────────────────── Hindi: raga evening & Bollywood lo-fi ─────────────────────────
def hindi_raga(name, title, seed, bpm=84, key=62):
    """Raga Yaman colour (lydian): sitar-like lead, tanpura drone, tabla teentaal-ish theka."""
    global rng; rng = np.random.default_rng(seed)
    beat = 60 / bpm; bar = 4 * beat; bars = 30
    buf = np.zeros((2, int((bars * bar + 3) * SR)))
    scale = ext([0, 2, 4, 6, 7, 9, 11]); ph = melody(scale, 32, seed, .22, 10)
    add(buf, drone([hz(key - 12), hz(key - 5), hz(key)], bars * bar, .045), 0)
    theka = [(0, 'ge'), (.5, 'na'), (1, 'na'), (1.5, 'ge'), (2, 'ge'), (2.5, 'na'), (3, 'tin'), (3.5, 'na')]
    for b in range(bars):
        t0 = b * bar
        if b >= 4:
            for p, k in theka: add(buf, {'ge': tabla_ge, 'na': tabla_na, 'tin': tabla_tin}[k](), t0 + p * beat, (-.1 if k == 'ge' else .15))
        if 1 <= b < bars - 1:
            for s in range(8):
                n = ph[((b % 4) * 8 + s) % 32]
                if n is not None and (b >= 4 or s % 2 == 0): add(buf, sitar(hz(key + n), beat * .95, .32), t0 + s * beat / 2, .2)
    master(buf, name, title, 'Portfolio Originals · Hindi style', 8000, .3)

def hindi_lofi(name, title, seed, bpm=82, key=60):
    """Bollywood-style lo-fi: dholak-ish groove, e-piano chords, bansuri lead."""
    global rng; rng = np.random.default_rng(seed)
    beat = 60 / bpm; bar = 4 * beat; bars = 28
    buf = np.zeros((2, int((bars * bar + 3) * SR)))
    prog = [(0, [0, 3, 7, 10]), (5, [0, 3, 7, 10]), (10, [0, 4, 7, 11]), (7, [0, 3, 7])]
    scale = ext([0, 2, 3, 5, 7, 8, 10]); ph = melody(scale, 32, seed, .3, 9)
    for b in range(bars):
        r, q = prog[b % 4]; t0 = b * bar; root = key + r
        for hit in (0, 2.5):
            for j, iv in enumerate(q): add(buf, epiano(hz(root + iv), beat * 1.6, .16), t0 + hit * beat + j * .01, -.25)
        add(buf, bass(hz(root - 24), beat * 1.5, .42), t0); add(buf, bass(hz(root - 24 + 7), beat, .35), t0 + 2.5 * beat)
        if b >= 2:
            for p, k in [(0, 'ge'), (.75, 'na'), (1.5, 'ge'), (2, 'na'), (2.75, 'ge'), (3.5, 'na')]:
                add(buf, tabla_ge() if k == 'ge' else tabla_na(), t0 + p * beat, .1)
            add(buf, snare() * .6, t0 + beat); add(buf, snare() * .6, t0 + 3 * beat)
        if 4 <= b < bars - 2:
            for s in range(4):
                n = ph[((b % 8) * 4 + s) % 32]
                if n is not None: add(buf, flute(hz(key + 12 + n), beat * 1.1, .2, .012), t0 + s * beat, .2)
    n = buf.shape[1]; buf += (rng.random(n) < .0008) * rng.standard_normal(n) * .2  # vinyl crackle
    master(buf, name, title, 'Portfolio Originals · Hindi style', 6000, .25)

which = sys.argv[2:] or ['all']
jobs = {
    'en-sunlit-avenue': lambda: english_pop('en-sunlit-avenue', 'Sunlit Avenue', 301),
    'en-neon-skyline': lambda: english_synth('en-neon-skyline', 'Neon Skyline', 302),
    'si-baila-breeze': lambda: sinhala_baila('si-baila-breeze', 'Baila Breeze', 311),
    'si-raban-village': lambda: sinhala_raban('si-raban-village', 'Raban Village', 312),
    'ta-kuthu-street': lambda: tamil_kuthu('ta-kuthu-street', 'Kuthu Street', 321),
    'ta-veena-dawn': lambda: tamil_veena('ta-veena-dawn', 'Veena Dawn', 322),
    'ar-desert-maqam': lambda: arabic_maqsum('ar-desert-maqam', 'Desert Maqam', 331),
    'ar-oasis-nights': lambda: arabic_maqsum('ar-oasis-nights', 'Oasis Nights', 332, 92, 57, (0, 2, 3, 5, 7, 8, 11)),
    'hi-raga-evening': lambda: hindi_raga('hi-raga-evening', 'Raga Evening', 341),
    'hi-monsoon-lofi': lambda: hindi_lofi('hi-monsoon-lofi', 'Monsoon Lo-Fi', 342),
}
for k, f in jobs.items():
    if 'all' in which or k in which: f()
