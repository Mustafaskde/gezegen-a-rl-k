"""ORM filmi için özgün altyapı: 120 BPM, 84 vuruş (21 ölçü), tam 42 sn, re minör. Yalnızca numpy ile sentez."""
import sys
import wave
from pathlib import Path

import numpy as np

SR = 44100
BPM = 120
P = 60 / BPM
BEATS = 84
DUR = BEATS * P
N = int(round(DUR * SR))
rng = np.random.default_rng(7)
t = np.arange(N) / SR
L = np.zeros(N)
R = np.zeros(N)


def beat(n):  # filmdeki B(n) ile aynı
    return (n - 1) * P


def place(sig, at, gain=1.0, pan=0.0):
    i = int(round(at * SR))
    sig = sig * gain
    end = i + len(sig)
    gl, gr = np.sqrt(0.5 * (1 - pan)), np.sqrt(0.5 * (1 + pan))
    for chan, g in ((L, gl), (R, gr)):
        if end <= N:
            chan[i:end] += sig * g
        else:  # döngü: taşan kuyruk başa sarılır
            k = N - i
            chan[i:] += sig[:k] * g
            chan[: len(sig) - k] += sig[k:] * g


def env(n, attack, decay):
    x = np.arange(n) / SR
    return np.minimum(1, x / max(attack, 1e-4)) * np.exp(-x / decay)


def smooth(x, w):
    if w <= 1:
        return x
    k = np.ones(int(w)) / int(w)
    return np.convolve(x, k, mode="same")


def hp(x):
    return np.diff(x, prepend=0)


def kick(gain=1.0):
    n = int(0.45 * SR)
    x = np.arange(n) / SR
    f = 45 + 85 * np.exp(-x / 0.03)
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sin(ph) * np.exp(-x / 0.22) + 0.3 * hp(rng.standard_normal(n)) * np.exp(-x / 0.004)
    return s * gain


def clap():
    n = int(0.3 * SR)
    x = np.arange(n) / SR
    nz = hp(smooth(rng.standard_normal(n), 3))
    e = sum(np.exp(-np.maximum(x - d, 0) / 0.012) * (x >= d) for d in (0, 0.011, 0.022)) + 0.6 * np.exp(-x / 0.09)
    return nz * e * 0.5 + 0.2 * np.sin(2 * np.pi * 190 * x) * np.exp(-x / 0.05)


def hat(open_=False):
    n = int((0.25 if open_ else 0.06) * SR)
    nz = hp(hp(rng.standard_normal(n)))
    return nz * env(n, 0.001, 0.08 if open_ else 0.018) * 0.25


def metal(f0=520, decay=1.2, gain=1.0):
    n = int(decay * 3 * SR)
    x = np.arange(n) / SR
    s = sum(a * np.sin(2 * np.pi * f0 * r * x) * np.exp(-x / (decay / (1 + 0.6 * i)))
            for i, (r, a) in enumerate(((1, 1), (2.76, 0.55), (5.40, 0.35), (8.93, 0.2), (13.3, 0.1))))
    return s * env(n, 0.001, 10) * gain


def tone(freq, length, harmonics, bright, attack=0.005, decay=0.3):
    n = int(length * SR)
    x = np.arange(n) / SR
    s = sum((bright ** (k - 1)) / k * np.sin(2 * np.pi * freq * k * x) for k in range(1, harmonics + 1))
    return s * env(n, attack, decay)


def hz(midi):
    return 440 * 2 ** ((midi - 69) / 12)


# 1) Dron: tüm film boyunca, 42 sn'de tam devir yapan frekanslar (döngü dikişsiz)
for f, a in ((round(36.71 * DUR) / DUR, 0.10), (round(73.42 * DUR) / DUR, 0.05), (round(110.0 * DUR) / DUR, 0.02)):
    wob = 1 + 0.25 * np.sin(2 * np.pi * (2 / DUR) * t)
    d = a * wob * np.sin(2 * np.pi * f * t)
    L += d
    R += d

# 2) Kanca: her ölçünün başında metal tını, 2. ölçüden sonra seyrek tıkırtılar
for n in (1, 5, 9):
    place(metal(587, 1.6, 0.16), beat(n), pan=-0.2 if n % 2 else 0.2)
for n in range(5, 13):
    place(hat(), beat(n) + P / 2, 0.5, pan=0.3)

# 3) Taşlama dokusu (6–11 sn): parlak gürültü kabarır ve söner
a0, a1 = int(beat(13) * SR), int(beat(23) * SR)
seg = hp(rng.standard_normal(a1 - a0))
m = np.linspace(0, 1, a1 - a0)
grind = seg * (np.sin(np.pi * m) ** 1.5) * (0.6 + 0.4 * np.sin(2 * np.pi * 16 * m * 5)) * 0.05
L[a0:a1] += grind
R[a0:a1] += grind * 0.85

# 4) Davullar
for n in range(13, 59, 2):  # 1 ve 3: 6–29 sn
    place(kick(0.9), beat(n))
for n in range(23, 59):  # four-on-the-floor 11 sn'den
    if n % 2 == 0:
        place(kick(0.75), beat(n))
for n in range(33, 59, 2):  # clap 2 ve 4
    if (n - 1) % 4 == 1:
        place(clap(), beat(n), 0.55)
for n in range(13, 59):
    for k in range(2):
        place(hat(), beat(n) + k * P / 2, 0.35 + 0.25 * (n >= 43), pan=0.25)
for n in range(43, 59):
    if n % 2 == 1:
        place(hat(True), beat(n) + P / 2, 0.3, pan=-0.25)

# 5) Bas (re): 11 sn'den sekizlikler
roots = {23: 38, 31: 38, 35: 41, 39: 36, 43: 38, 47: 41, 51: 34, 55: 36}
root = 38
for n in range(23, 59):
    root = roots.get(n, root)
    for k in range(2):
        b = tone(hz(root), P / 2, 8, 0.55 + 0.2 * (n >= 43), 0.004, 0.12)
        place(b, beat(n) + k * P / 2, 0.22)

# 6) Isıl işlem padi (11–21 sn): akor açılır
chord = [50, 53, 57, 60, 64]  # Dm9
a0, a1 = int(beat(23) * SR), int(beat(43) * SR)
x = t[a0:a1] - t[a0]
bright = np.clip(x / 5, 0, 1) * 0.7
pad = sum(sum(((bright ** (k - 1)) / k) * np.sin(2 * np.pi * hz(m) * k * (1 + 0.002 * d) * x)
              for k in range(1, 7)) for m in chord for d in (-1, 1))
pad *= np.minimum(1, x / 2) * np.minimum(1, (x[-1] - x) / 1.0) * 0.012
L[a0:a1] += pad
R[a0:a1] += np.roll(pad, 300)

# 7) Gerilim (28–30 sn): yükselen ton + gürültü, 29.5'te sus
a0, a1 = int(beat(57) * SR), int(beat(61) * SR)
x = t[a0:a1] - t[a0]
f = 200 * (10 ** (x / (x[-1] + 1e-9)))
riser = (np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.03 + hp(rng.standard_normal(len(x))) * 0.04) * (x / x[-1]) ** 2
riser[x > 1.5] *= np.linspace(1, 0, (x > 1.5).sum())
L[a0:a1] += riser
R[a0:a1] += riser
for i, n in enumerate((57.5, 58, 58.25, 58.5, 58.75)):
    place(clap(), beat(n), 0.3 + 0.08 * i)

# 8) Doruk (30 sn): darbe + tam ritim 30–34
n = int(2.5 * SR)
x = np.arange(n) / SR
boom = np.sin(2 * np.pi * np.cumsum(30 + 40 * np.exp(-x / 0.15)) / SR) * np.exp(-x / 0.9) * 0.9
crash = hp(rng.standard_normal(n)) * np.exp(-x / 1.1) * 0.12
place(boom + crash, beat(61))
place(metal(392, 2.0, 0.25), beat(61))
for n in range(61, 69):
    place(kick(1.0), beat(n))
    place(hat(), beat(n) + P / 2, 0.55, pan=0.25)
    if (n - 1) % 4 in (1, 3):
        place(clap(), beat(n), 0.6)
    for k in range(2):
        place(tone(hz(38 if n < 65 else 41), P / 2, 9, 0.8, 0.004, 0.13), beat(n) + k * P / 2, 0.26)

# 9) Kapanış (34–42 sn): davul yok, sıcak akor ve tek derin vuruş
place(kick(1.0), beat(69))
place(boom * 0.5, beat(69))
a0, a1 = int(beat(69) * SR), int(beat(83) * SR)
x = t[a0:a1] - t[a0]
pad2 = sum(sum((0.5 ** (k - 1)) / k * np.sin(2 * np.pi * hz(m) * k * (1 + 0.003 * d) * x)
               for k in range(1, 6)) for m in (38, 50, 57, 60, 65) for d in (-1, 1))
pad2 *= np.minimum(1, x / 0.8) * np.clip((x[-1] - x) / 2.5, 0, 1) * 0.016
L[a0:a1] += pad2
R[a0:a1] += np.roll(pad2, 400)
place(metal(784, 1.8, 0.12), beat(71), pan=-0.15)
place(metal(587, 1.8, 0.10), beat(73), pan=0.15)

# 10) Oda: kısa yankı (FFT konvolüsyon, kuyruk başa sarılır)
ir_n = int(1.1 * SR)
ir = rng.standard_normal(ir_n) * np.exp(-np.arange(ir_n) / SR / 0.35)
ir = smooth(ir, 6)
ir /= np.abs(ir).sum() / 6
for chan in (L, R):
    size = 1 << int(np.ceil(np.log2(N + ir_n)))
    wet = np.fft.irfft(np.fft.rfft(chan, size) * np.fft.rfft(ir, size), size)[: N + ir_n]
    wet[:ir_n] += wet[N:N + ir_n]
    chan += 0.18 * wet[:N]

mix = np.stack([L, R], 1)
mix = np.tanh(mix * 1.1) / 1.1
mix *= 0.89 / np.abs(mix).max()
out = Path(sys.argv[1] if len(sys.argv) > 1 else "audio/edit.wav")
out.parent.mkdir(parents=True, exist_ok=True)
with wave.open(str(out), "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((mix * 32767).astype("<i2").tobytes())
print(f"{out}: {N / SR:.3f} s, {BEATS} beats at {BPM} BPM")
