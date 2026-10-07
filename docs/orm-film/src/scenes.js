film({ W: 1920, H: 1080, BPM: 120, BEATS: 84 });

// ORM · Oralsan Makina Takım: bir çelik çubuk, taşlanıp ısıl işlemden geçip ölçülerek kesici takıma dönüşür.
const COLS = [360, 660, 960, 1260, 1560];
const TOOLS = ["Matkap", "Kılavuz", "Freze", "Rayba", "Torna ucu"];
const BLOCK_TOP = 720;
const DEPTH = [138, 132, 102, 150, 0];

const head = (id, words, acc, left, top, size = 92, color = "") => `
  <div class="${left === null ? "" : "abs "}head" data-k="${id}" style="${left === null ? "position:relative;display:inline-block" : `left:${left}px;top:${top}px`};font-size:${size}px;${color}">${words
    .map((w, i) => `<span class="t mask"><span class="t${i === acc ? " acc" : ""}">${w}</span></span>`)
    .join('<span class="gap"></span>')}</div>`;
const up = (el, p) => setT(el, `translateY(${((1 - p) * 140).toFixed(2)}%)`);
const away = (el, p) => setT(el, `translateY(${(-p * 140).toFixed(2)}%)`);
const words = (id) => [...$[id].querySelectorAll(".mask > .t")];

function wordsInOut(list, t, tin, tout = Infinity, gap = 0.07) {
  list.forEach((el, i) => {
    if (t < tout) up(el, stagger(t, tin, i, gap, 0.45, E.out));
    else away(el, stagger(t, tout, list.length - 1 - i, 0.04, 0.3, E.in));
  });
}
const maskIn = (el, t, tin, tout = Infinity) => (t < tout ? up(el, prog(t, tin, 0.45, E.out)) : away(el, prog(t, tout, 0.3, E.in)));
const label = (id, html, left, top, cls = "lab", extra = "") =>
  `<div class="abs mask" style="left:${left}px;top:${top}px;${extra}"><div class="t ${cls}" data-k="${id}">${html}</div></div>`;
const check = (id) => `<svg data-k="${id}" width="30" height="24" viewBox="0 0 30 24" style="margin-left:14px;vertical-align:-2px">
  <polyline points="3,12 11,20 27,4" fill="none" stroke="var(--ink)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
  <polyline data-k="${id}A" points="3,12 11,20 27,4" fill="none" stroke="var(--accent)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

// Takımlar: yerel koordinatlarda uç (0,0), gövde yukarı doğru.
function zig(x0, x1, y0, y1, step) {
  const pts = [];
  for (let y = y0, k = 0; y <= y1; y += step / 2, k++) pts.push(`${k % 2 ? x1 : x0},${y}`);
  return pts;
}
const TAP = (() => {
  const L = zig(-16, -12, -150, -18, 8), R = zig(16, 12, -150, -18, 8).reverse();
  return `M-13,-300 H13 V-150 L${R.join(" L")} L9,0 H-9 L${L.reverse().join(" L")} V-150 L-13,-150 Z`;
})();
const bands = (x0, x1, y0, y1, pitch, slope, w) => {
  let d = "";
  for (let y = y0 - 2 * pitch; y < y1 + pitch; y += pitch)
    d += `M${x0},${y} L${x1},${y - slope} L${x1},${y - slope + w} L${x0},${y + w} Z `;
  return d;
};
const toolSvg = (i) => {
  if (i === 1) return `<rect x="-9" y="-318" width="18" height="20" fill="var(--m2)"/><path d="${TAP}" fill="url(#metalH)" stroke="var(--hair)" stroke-width="1.5"/>`;
  if (i === 2) return `<rect x="-20" y="-300" width="40" height="172" fill="url(#metalH)"/>
    <rect x="-24" y="-130" width="48" height="130" fill="url(#metalH)"/>
    <g clip-path="url(#millClip)"><path d="${bands(-24, 24, -130, 0, 34, 22, 15)}" fill="var(--fl)"/></g>
    <rect x="-24" y="-130" width="48" height="130" fill="none" stroke="var(--hair)" stroke-width="1.5"/>`;
  if (i === 3) return `<rect x="-12" y="-300" width="24" height="142" fill="url(#metalH)"/>
    <path d="M-14,-160 H14 V-12 L10,0 H-10 L-14,-12 Z" fill="url(#metalH)" stroke="var(--hair)" stroke-width="1.5"/>
    <path d="M-7,-156 V-10 M0,-156 V-6 M7,-156 V-10" stroke="var(--fl)" stroke-width="3"/>`;
  return `<rect x="16" y="-22" width="320" height="44" rx="4" fill="url(#metal)" stroke="var(--hair)" stroke-width="1.5"/>
    <path d="M0,0 L40,-24 L40,24 Z" fill="var(--ink2)" stroke="var(--hair)" stroke-width="1.5"/>
    <circle cx="28" cy="0" r="5" fill="var(--bg)"/>`;
};
const RESULT = [
  "M-13,0 H13 V70 L0,78 L-13,70 Z",
  (() => {
    const L = zig(-16, -12, 0, 70, 7), R = zig(16, 12, 0, 70, 7).reverse();
    return `M${L.join(" L")} L0,78 L${R.join(" L")} Z`;
  })(),
  "M-40,0 H40 V36 Q40,42 34,42 H-34 Q-40,42 -40,36 Z",
  "M-15,0 H15 V90 H-15 Z",
  "M30,0 H110 V40 H30 Z",
];

const SHAPE = { bodyD: "" };
const bodyD = (tipP) => {
  const xe = lerp(550, 523, tipP);
  return `M-550,-45 L${xe.toFixed(2)},-45 L550,0 L${xe.toFixed(2)},45 L-550,45 Z`;
};
const roundRect = (x, y, w, h, r) =>
  `M${x + r},${y} H${x + w - r} A${r},${r} 0 0 1 ${x + w},${y + r} V${y + h - r} A${r},${r} 0 0 1 ${x + w - r},${y + h} H${x + r} A${r},${r} 0 0 1 ${x},${y + h - r} V${y + r} A${r},${r} 0 0 1 ${x + r},${y} Z`;
const circleD = (r) => `M${r},0 A${r},${r} 0 1 1 ${-r},0 A${r},${r} 0 1 1 ${r},0`;

function build(stage) {
  const style = new URLSearchParams(location.search).get("style");
  if (style) document.documentElement.dataset.style = style;

  let flutes = "";
  for (let a = -410; a <= 710; a += 150)
    flutes += `<path d="M${a},-45 C${a + 25},-15 ${a + 45},15 ${a + 70},45 L${a + 130},45 C${a + 105},15 ${a + 85},-15 ${a + 60},-45 Z" fill="var(--fl)"/>
      <path d="M${a + 64},-45 C${a + 89},-15 ${a + 109},15 ${a + 134},45" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="3"/>`;

  let ticks = "";
  for (let k = 0; k < 12; k++) ticks += `<line x1="0" y1="-52" x2="0" y2="-138" stroke="var(--ink3)" stroke-width="3" transform="rotate(${k * 30})"/>`;

  const holes = [0, 1, 2, 3, 4, 5].map((k) => {
    const a = (k * Math.PI) / 3 - Math.PI / 2, x = (180 * Math.cos(a)).toFixed(1), y = (180 * Math.sin(a)).toFixed(1);
    const tapped = k % 2 === 1;
    return `<g data-k="hole${k}" transform="translate(${x},${y})"><circle r="22" fill="var(--bg)" stroke="var(--ink)" stroke-width="3"/>${
      tapped ? `<path d="M0,-29 A29,29 0 1 1 -29,0" fill="none" stroke="var(--ink2)" stroke-width="2.5"/>` : ""}</g>`;
  }).join("");

  stage.innerHTML = `
    <div class="full grid" data-k="world" style="transform-origin:50% 50%">
      <svg class="abs" style="left:0;top:0" width="1920" height="1080" viewBox="0 0 1920 1080">
        <defs>
          <linearGradient id="metal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" style="stop-color:var(--m0)"/><stop offset=".32" style="stop-color:var(--m1)"/>
            <stop offset=".62" style="stop-color:var(--m2)"/><stop offset="1" style="stop-color:var(--m3)"/></linearGradient>
          <linearGradient id="metalH" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" style="stop-color:var(--m0)"/><stop offset=".32" style="stop-color:var(--m1)"/>
            <stop offset=".62" style="stop-color:var(--m2)"/><stop offset="1" style="stop-color:var(--m3)"/></linearGradient>
          <pattern id="hatch" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="16" stroke="var(--hair)" stroke-width="2"/></pattern>
          <marker id="arrow" viewBox="0 0 12 12" refX="11" refY="6" markerWidth="12" markerHeight="12" orient="auto" markerUnits="userSpaceOnUse">
            <path d="M0,0 L12,6 L0,12 Z" style="fill:var(--ink)"/></marker>
          <clipPath id="drillClip"><path data-k="drillClip"/></clipPath>
          <clipPath id="revealClip"><rect data-k="revealRect" x="560" y="-60" width="200" height="120"/></clipPath>
          <clipPath id="millClip"><rect x="-24" y="-130" width="48" height="130"/></clipPath>
        </defs>

        <g data-k="furnace">
          <rect data-k="glow" x="1000" y="380" width="600" height="320" rx="24" fill="#FF6A1A" opacity="0"/>
          <path data-k="furnaceLine" d="${roundRect(1000, 380, 600, 320, 24)}" fill="none" stroke="var(--ink2)" stroke-width="3"/>
        </g>
        <g data-k="chart" transform="translate(1180,780)">
          <path data-k="axes" d="M0,0 V180 H580" fill="none" stroke="var(--hair)" stroke-width="3"/>
          <path data-k="curve" d="M0,170 C110,170 150,24 250,24 L420,24 C450,24 462,170 580,170" fill="none" stroke="var(--accent)" stroke-width="5" stroke-linecap="round"/>
        </g>

        <g data-k="blocks">${COLS.map((cx, i) => `
          <g data-k="block${i}">
            <rect x="${cx - 110}" y="${BLOCK_TOP}" width="220" height="130" fill="var(--bg2)"/>
            <rect x="${cx - 110}" y="${BLOCK_TOP}" width="220" height="130" fill="url(#hatch)" stroke="var(--ink2)" stroke-width="2"/>
            <path data-k="res${i}" d="${RESULT[i]}" fill="var(--bg)" stroke="var(--ink2)" stroke-width="2.5"/>
            <path data-k="resA${i}" d="${RESULT[i]}" fill="none" stroke="var(--accent)" stroke-width="4"/>
          </g>`).join("")}
          <path data-k="chip" d="M0,0 c22,-12 44,-6 42,16 c-2,16 -24,20 -31,7 c-6,-10 3,-19 12,-15" fill="none" stroke="var(--accent)" stroke-width="4" stroke-linecap="round"/>
        </g>

        <g data-k="flange">
          <path data-k="flangeFill" d="${circleD(300)}" fill="var(--bg2)" opacity="0"/>
          <path data-k="flangeLine" d="${circleD(300)}" fill="none" stroke="var(--ink)" stroke-width="4"/>
          <g data-k="cross"><path d="M-340,0 H340 M0,-340 V340" stroke="var(--ink3)" stroke-width="2" stroke-dasharray="28 8 4 8"/></g>
          <g data-k="turned"><circle r="250" fill="none" stroke="var(--ink2)" stroke-width="3"/></g>
          <g data-k="pcd"><circle r="180" fill="none" stroke="var(--ink3)" stroke-width="2" stroke-dasharray="28 8 4 8"/></g>
          ${holes}
          <g data-k="bore"><circle r="72" fill="var(--bg)" stroke="var(--accent)" stroke-width="5"/>
            <path d="M-14,-71 V-96 H14 V-71" fill="var(--bg)" stroke="var(--ink)" stroke-width="3"/></g>
        </g>

        <g data-k="arm">
          <line data-k="arm1" stroke="var(--ink3)" stroke-width="24" stroke-linecap="round"/>
          <line data-k="arm2" stroke="var(--ink3)" stroke-width="20" stroke-linecap="round"/>
          <circle data-k="armBase" r="36" fill="var(--bg2)" stroke="var(--ink2)" stroke-width="3"/>
          <circle data-k="armElbow" r="20" fill="var(--bg2)" stroke="var(--ink2)" stroke-width="3"/>
          <rect data-k="grip" width="22" height="130" rx="6" fill="var(--ink2)"/>
        </g>

        ${[1, 2, 3, 4].map((i) => `<g data-k="tool${i}">${toolSvg(i)}</g>`).join("")}

        <g data-k="drill">
          <path data-k="drillBody" fill="url(#metal)"/>
          <g clip-path="url(#drillClip)">
            <g clip-path="url(#revealClip)"><g data-k="flutes">${flutes}</g>
              <line x1="-110" y1="-45" x2="-110" y2="45" stroke="var(--fl)" stroke-width="4"/></g>
            <rect data-k="sheen" x="-60" y="-60" width="70" height="120" fill="rgba(255,255,255,.45)" transform="skewX(-20)"/>
          </g>
          <path data-k="heatRed" fill="#8E1B0B" opacity="0"/>
          <path data-k="heatOr" fill="#FF6A1A" opacity="0"/>
          <path data-k="drillLine" fill="none" stroke="var(--hair)" stroke-width="2"/>
        </g>

        <g data-k="wheel">
          <circle r="150" fill="var(--bg2)" stroke="var(--ink2)" stroke-width="3"/>
          <circle r="150" fill="url(#hatch)"/>
          <g data-k="wheelSpin">${ticks}</g>
          <circle r="44" fill="var(--bg)" stroke="var(--ink2)" stroke-width="3"/>
        </g>

        <g data-k="angle">
          <path data-k="angL" d="M1510,540 L1436,417" fill="none" stroke="var(--accent)" stroke-width="3"/>
          <path data-k="angR" d="M1510,540 L1436,663" fill="none" stroke="var(--accent)" stroke-width="3"/>
          <path data-k="angArc" d="M1474,480 A70,70 0 0 0 1474,600" fill="none" stroke="var(--accent)" stroke-width="3"/>
        </g>

        <g data-k="dims">
          <path data-k="dimD1" d="M1260,540 V497" stroke="var(--ink)" stroke-width="2.5" marker-end="url(#arrow)"/>
          <path data-k="dimD2" d="M1260,540 V583" stroke="var(--ink)" stroke-width="2.5" marker-end="url(#arrow)"/>
          <path data-k="ext" d="M410,595 V672 M1510,595 V672" stroke="var(--hair)" stroke-width="2"/>
          <path data-k="dimL1" d="M960,650 H412" stroke="var(--ink)" stroke-width="2.5" marker-end="url(#arrow)"/>
          <path data-k="dimL2" d="M960,650 H1508" stroke="var(--ink)" stroke-width="2.5" marker-end="url(#arrow)"/>
        </g>
      </svg>

      ${head("h1", ["Bir", "çubuk", "çelik."], -1, 160, 770)}
      ${head("h1b", ["Henüz", "hiçbir", "şey."], -1, 160, 880, 92, "color:var(--ink3)")}
      ${head("h2", ["Taşlama", "ile", "biçim", "bulur."], 2, 160, 820)}
      ${label("angLab", "118°", 1532, 404, "lab", "")}
      ${head("h3", ["Isıyla", "sertleşir."], 1, 160, 820)}
      ${label("furnaceLab", "ISIL İŞLEM", 1000, 332, "small")}
      ${label("tempLab", "SICAKLIK", 1180, 736, "small")}
      ${label("timeLab", "ZAMAN", 1650, 972, "small")}
      ${head("h4", ["Her", "ölçü", "kontrol", "edilir."], 2, 160, 820)}
      ${label("labD", `Ø 10,00${check("ckD")}`, 1282, 404)}
      ${label("labL", `L 133${check("ckL")}`, 890, 676)}
      ${label("labS", `SALGI${check("ckS")}`, 420, 404)}
      ${head("h5", ["Her", "iş", "için", "bir", "takım."], 4, 160, 96)}
      ${TOOLS.map((n, i) => label(`name${i}`, n, COLS[i] - 150, 878, "name", "width:300px;text-align:center")).join("")}
      ${head("h6", ["Kırşehir'de", "üretilir."], 1, 1000, 300, 80)}
      <div class="abs mask" style="left:1000px;top:420px"><div class="t" data-k="area" style="font-size:120px;font-weight:900;letter-spacing:-0.04em;font-variant-numeric:tabular-nums">98.000 m²</div></div>
      ${label("areaCap", "FABRİKA ALANI", 1006, 572, "small")}
      ${label("row1", "KALİTE LABORATUVARI", 1006, 652, "lab")}
      ${label("row2", "ROBOTLU ISIL İŞLEM", 1006, 706, "lab")}
      ${label("row3", "HSS &amp; KARBÜR", 1006, 760, "lab")}
    </div>

    <div class="full" data-k="end" style="background:var(--bg2)">
      <div class="abs mask" style="left:0;top:228px;width:1920px;text-align:center;padding-top:20px">
        <div class="t" data-k="orm" style="font-size:300px;font-weight:900;letter-spacing:-0.03em;line-height:1">${["O", "R", "M"].map((c) => `<span class="t" style="line-height:1">${c}</span>`).join("")}</div></div>
      <div class="abs" data-k="endRule" style="left:780px;top:584px;width:360px;height:10px;border-radius:5px;background:var(--accent);transform-origin:0 50%"></div>
      ${label("company", "ORALSAN MAKİNA TAKIM", 0, 622, "mono", "width:1920px;text-align:center;font-size:32px;color:var(--ink2);letter-spacing:0.32em")}
      <div class="abs" style="left:0;top:704px;width:1920px;text-align:center">${head("tag", ["Metale", "yön", "veren."], 1, null, 0, 84)}</div>
      ${label("foot", "orm-tr.com &nbsp;·&nbsp; 0212 243 27 05 &nbsp;·&nbsp; HSS &amp; KARBÜR", 0, 936, "small", "width:1920px;text-align:center")}
    </div>
    ${vignetteLayer(0.3)}`;
  collect(stage);
  for (const k of ["h1", "h1b", "h2", "h3", "h4", "h5", "h6", "tag"]) $[k + "W"] = words(k);
  $.ormC = [...$.orm.children];
}

const span = (t, a, b) => clamp(t - a, 0, b - a);
const cutDy = (t, tc, d) => d * prog(t, tc, 0.3, E.in) - d * prog(t, tc + 0.5, 0.4, E.out);
const pop = (el, t, t0, cx = 0, cy = 0) => {
  const s = t < t0 ? 0 : spring(t, t0, 0.42, 0.62);
  el.setAttribute("transform", `translate(${cx},${cy}) scale(${Math.max(0, s).toFixed(4)})`);
};

function drillPose(t) {
  if (t >= B(81)) return { x: 960, y: 540, r: 0, s: 1 };
  const pf = prog(t, B(31), 1.0, E.smooth), pin = prog(t, B(23), 1.0, E.smooth) - pf;
  let x = lerp(960, 1300, pin), y = 540, s = lerp(1, 0.75, pin), r = 0;
  const pc = prog(t, B(43), 0.8, E.smooth);
  x = lerp(x, COLS[0], pc); y = lerp(y, 506, pc); s = lerp(s, 0.28, pc); r = 90 * pc;
  y += cutDy(t, B(45), DEPTH[0]) - 1100 * prog(t, B(59), 0.5, E.in);
  return { x, y, r, s };
}

function arm(t) {
  const on = t >= B(22) && t < B(34);
  show($.arm, on);
  if (!on) return;
  const p = drillPose(t);
  const gx = p.x - 550 * p.s - 14, gy = p.y;
  const dy = 700 * (1 - prog(t, B(22), 0.5, E.out)) + 700 * prog(t, B(33), 0.5, E.in);
  const bx = 300, by = 1150, L = 540;
  const tx = gx, ty = gy, d = Math.min(Math.hypot(tx - bx, ty - by), 2 * L - 1);
  const a = Math.atan2(ty - by, tx - bx), b = Math.acos(d / (2 * L));
  const ex = bx + L * Math.cos(a - b), ey = by + L * Math.sin(a - b);
  const set = (el, o) => Object.entries(o).forEach(([k, v]) => el.setAttribute(k, v.toFixed(2)));
  set($.arm1, { x1: bx, y1: by, x2: ex, y2: ey });
  set($.arm2, { x1: ex, y1: ey, x2: tx, y2: ty });
  set($.armBase, { cx: bx, cy: by });
  set($.armElbow, { cx: ex, cy: ey });
  set($.grip, { x: tx - 11, y: ty - 65 });
  $.arm.setAttribute("transform", `translate(0,${dy.toFixed(2)})`);
}

function checkIn(el, elA, t, t0) {
  const s = t < t0 ? 0 : clamp(spring(t, t0, 0.4, 0.6), 0, 1.3);
  el.style.transform = `scale(${s.toFixed(4)})`;
  el.style.transformOrigin = "50% 50%";
  elA.style.opacity = (1 - prog(t, t0 + 0.6, 0.6, E.inOut)).toFixed(3);
}

function apply(t) {
  moveCamera($.world, { ...shake(t, B(61), 0.5, 12, 3), s: 1 + 0.008 * loop(t, 1) });

  // Matkap: gövde, kanallar, uç, ısı
  const pose = drillPose(t);
  show($.drill, t < B(60) || t >= B(81));
  $.drill.setAttribute("transform", `translate(${pose.x.toFixed(2)},${pose.y.toFixed(2)}) rotate(${pose.r.toFixed(3)}) scale(${pose.s.toFixed(4)})`);
  const reset = t >= B(81);
  const tipP = reset ? 0 : prog(t, B(14), 0.35, E.inOut);
  const reveal = reset ? 560 : lerp(560, -110, prog(t, B(14), 2.5, E.inOut));
  const d = bodyD(tipP);
  if (d !== SHAPE.bodyD) {
    for (const el of [$.drillBody, $.drillClip, $.heatRed, $.heatOr, $.drillLine]) el.setAttribute("d", d);
    SHAPE.bodyD = d;
  }
  $.revealRect.setAttribute("x", reveal.toFixed(2));
  $.revealRect.setAttribute("width", (700 - reveal).toFixed(2));
  const phase = 120 * span(t, B(14), B(19)) + 220 * span(t, B(37) + 0.2, B(40)) + 700 * span(t, B(45), B(45) + 0.8);
  $.flutes.setAttribute("transform", `translate(${(-(phase % 150)).toFixed(2)},0)`);
  const sh = Math.max(prog(t, B(2), 1.2, E.inOut) * (t < B(5) ? 1 : 0), prog(t, B(8), 1.2, E.inOut) * (t >= B(5) && t < B(11) ? 1 : 0));
  $.sheen.setAttribute("x", lerp(-700, 640, sh).toFixed(2));
  show($.sheen, (t > B(2) && t < B(5)) || (t > B(8) && t < B(11)));
  const heat = reset ? 0 : prog(t, B(25), 1.6, E.inOut) * (1 - prog(t, B(29) + 0.2, 0.6, E.out));
  $.heatRed.setAttribute("opacity", (clamp(heat * 2) * 0.85).toFixed(3));
  $.heatOr.setAttribute("opacity", (clamp(heat * 2 - 1) * 0.9).toFixed(3));

  // Kanca
  wordsInOut($.h1W, t, B(3), B(11));
  wordsInOut($.h1bW, t, B(7), B(11));

  // Taşlama
  const wOn = t >= B(13) && t < B(20);
  show($.wheel, wOn);
  if (wOn) {
    const yoff = -700 * (1 - clamp(spring(t, B(13), 0.5, 0.8))) - 800 * prog(t, B(19) + 0.1, 0.45, E.in);
    $.wheel.setAttribute("transform", `translate(${(960 + reveal).toFixed(2)},${(345 + yoff).toFixed(2)})`);
    $.wheelSpin.setAttribute("transform", `rotate(${((t * 540) % 360).toFixed(2)})`);
  }
  wordsInOut($.h2W, t, B(15), B(21) + 0.5);
  const aOn = t >= B(19) + 0.3 && t < B(23);
  show($.angle, aOn);
  if (aOn) {
    for (const el of [$.angL, $.angR]) drawPath(el, prog(t, B(19) + 0.4, 0.4, E.out));
    drawPath($.angArc, prog(t, B(19) + 0.6, 0.4, E.out));
    $.angle.setAttribute("opacity", (1 - prog(t, B(22), 0.3, E.in)).toFixed(3));
  }
  maskIn($.angLab, t, B(20), B(22));

  // Isıl işlem
  arm(t);
  const fOn = t >= B(23) && t < B(32);
  show($.furnace, fOn); show($.chart, fOn);
  if (fOn) {
    drawPath($.furnaceLine, prog(t, B(23), 0.8, E.inOut));
    $.glow.setAttribute("opacity", (heat * 0.16).toFixed(3));
    drawPath($.axes, prog(t, B(24), 0.6, E.inOut));
    drawPath($.curve, prog(t, B(25), 3.0, E.linear));
    const fade = (1 - prog(t, B(31), 0.4, E.in)).toFixed(3);
    $.furnace.setAttribute("opacity", fade); $.chart.setAttribute("opacity", fade);
  }
  maskIn($.furnaceLab, t, B(24), B(31));
  maskIn($.tempLab, t, B(24) + 0.2, B(31));
  maskIn($.timeLab, t, B(24) + 0.3, B(31));
  wordsInOut($.h3W, t, B(25) + 0.2, B(31) + 0.6);

  // Kalite
  const dOn = t >= B(34) && t < B(42);
  show($.dims, dOn);
  if (dOn) {
    for (const el of [$.dimD1, $.dimD2]) drawPath(el, prog(t, B(34), 0.4, E.out));
    for (const el of [$.dimL1, $.dimL2]) drawPath(el, prog(t, B(36), 0.45, E.out));
    drawPath($.ext, prog(t, B(36) - 0.15, 0.3, E.out));
    $.dims.setAttribute("opacity", (1 - prog(t, B(41) + 0.5, 0.3, E.in)).toFixed(3));
  }
  maskIn($.labD, t, B(34) + 0.2, B(41) + 0.5);
  maskIn($.labL, t, B(36) + 0.2, B(41) + 0.5);
  maskIn($.labS, t, B(38), B(41) + 0.5);
  checkIn($.ckD, $.ckDA, t, B(35));
  checkIn($.ckL, $.ckLA, t, B(37));
  checkIn($.ckS, $.ckSA, t, B(40));
  wordsInOut($.h4W, t, B(35), B(41) + 0.5);

  // Takım ailesi
  wordsInOut($.h5W, t, B(43) + 0.4, B(59));
  const bOn = t >= B(43) && t < B(61);
  show($.blocks, bOn);
  COLS.forEach((cx, i) => {
    const tc = B(45 + 3 * i);
    if (bOn) {
      const pin = clamp(spring(t, B(43) + 0.08 * i, 0.55, 0.88), 0, 1.05), pout = prog(t, B(59), 0.6, E.in);
      const sc = 1 - 0.7 * pout, ox = (600 - cx) * pout, oy = (540 - 785) * pout + 300 * (1 - pin);
      $[`block${i}`].setAttribute("transform", `translate(${(cx + ox).toFixed(2)},${(785 + oy).toFixed(2)}) scale(${sc.toFixed(4)}) translate(${-cx},-785)`);
      $[`block${i}`].setAttribute("opacity", (1 - pout).toFixed(3));
      const pr = i === 4 ? prog(t, tc, 0.45, E.inOut) : prog(t, tc, 0.3, E.in);
      const tr = i === 4
        ? `translate(${cx + 110},${BLOCK_TOP}) scale(${Math.max(pr, 0.0001).toFixed(4)},1) translate(-110,0)`
        : `translate(${cx},${BLOCK_TOP}) scale(1,${Math.max(pr, 0.0001).toFixed(4)})`;
      for (const el of [$[`res${i}`], $[`resA${i}`]]) { el.setAttribute("transform", tr); show(el, pr > 0); }
      $[`resA${i}`].setAttribute("opacity", (1 - prog(t, tc + 0.7, 0.6, E.inOut)).toFixed(3));
    }
    maskIn($[`name${i}`], t, tc + 0.15, B(59));
    if (i === 0) return;
    const tool = $[`tool${i}`], te = B(44 + 3 * i);
    const on = t >= te && t < B(61);
    show(tool, on);
    if (!on) return;
    const pin = clamp(spring(t, te, 0.55, 0.82), 0, 1.03);
    if (i === 4) {
      const pc = prog(t, tc, 0.45, E.inOut), pb = prog(t, tc + 0.6, 0.4, E.inOut);
      const x = cx + lerp(115, 30, pc) + lerp(0, 170, pb) + 900 * (1 - pin) + 900 * prog(t, B(59), 0.5, E.in);
      const y = BLOCK_TOP + 40 - 70 * pb;
      tool.setAttribute("transform", `translate(${x.toFixed(2)},${y.toFixed(2)})`);
    } else {
      const y = 660 - 800 * (1 - pin) + cutDy(t, tc, DEPTH[i]) - 1100 * prog(t, B(59), 0.5, E.in);
      tool.setAttribute("transform", `translate(${cx},${y.toFixed(2)})`);
    }
  });
  const chipOn = t >= B(57) && t < B(60);
  show($.chip, chipOn);
  if (chipOn) {
    $.chip.setAttribute("transform", `translate(${COLS[4] + 34},${BLOCK_TOP - 6}) rotate(-20)`);
    drawPath($.chip, prog(t, B(57), 0.45, E.out));
  }

  // Doruk: parça birleşir
  const flOn = t >= B(59) + 0.4 && t < B(70) + 0.4;
  show($.flange, flOn);
  if (flOn) {
    const s = 1.25 - 0.25 * prog(t, B(61), 1.0, E.smooth);
    $.flange.setAttribute("transform", `translate(600,540) scale(${s.toFixed(4)})`);
    drawPath($.flangeLine, prog(t, B(59) + 0.4, 0.6, E.inOut));
    $.flangeFill.setAttribute("opacity", prog(t, B(61), 0.25, E.out).toFixed(3));
    pop($.bore, t, B(61));
    for (let k = 0; k < 6; k++) {
      const a = (k * Math.PI) / 3 - Math.PI / 2;
      pop($[`hole${k}`], t, B(61) + 0.06 * (k + 1), 180 * Math.cos(a), 180 * Math.sin(a));
    }
    pop($.turned, t, B(62)); pop($.pcd, t, B(62) + 0.15); pop($.cross, t, B(62) + 0.3);
  }
  wordsInOut($.h6W, t, B(63), B(71));
  maskIn($.area, t, B(64), B(71));
  $.area.textContent = `${countUp(t, B(64), 1.0, 0, 98000, (v) => Math.round(v).toLocaleString("tr-TR"))} m²`;
  maskIn($.areaCap, t, B(64) + 0.3, B(71));
  maskIn($.row1, t, B(65) + 0.3, B(71));
  maskIn($.row2, t, B(66) + 0.3, B(71));
  maskIn($.row3, t, B(67) + 0.3, B(71));

  // Kapanış
  const eOn = t >= B(69) && t < B(83);
  show($.end, eOn);
  if (eOn) {
    if (t < B(81)) iris($.end, prog(t, B(69), 0.8, E.inOut), "600px", "540px");
    else iris($.end, 1 - prog(t, B(81) + 0.4, 0.8, E.inOut), "960px", "540px");
  }
  wordsInOut($.ormC, t, B(70), B(81), 0.09);
  setT($.endRule, `scaleX(${(prog(t, B(71), 0.6, E.out) * (1 - prog(t, B(81), 0.3, E.in))).toFixed(4)})`);
  maskIn($.company, t, B(71) + 0.2, B(81));
  wordsInOut($.tagW, t, B(73), B(81));
  maskIn($.foot, t, B(74) + 0.25, B(81));
}
