/*
  Interactive DNA helices for the page background.
  Usage: <script src="assets/dna-bg.js" data-avoid=".wrap" data-rgb="37,99,235" data-hl="14,165,233"></script>
    data-avoid  : selector of the main content column; helices are drawn only in the free margins (desktop only)
    data-mode   : "margins" (default) or "fill" — fill draws helices across the element given by data-target
    data-target : (fill mode) selector of the element that hosts the canvas, e.g. ".hero"
    data-rgb    : base colour "r,g,b";  data-hl : highlight colour when the pointer is near
    data-alpha  : overall opacity multiplier (default 1)
    data-rgb-dark, data-hl-dark : optional colours for dark mode
*/
(function () {
  const me = document.currentScript, d = me.dataset;
  const mode = d.mode || 'margins', A = +(d.alpha || 1);
  // data-rgb-dark / data-hl-dark: optional colours used when the system is in dark mode
  const darkMq = matchMedia('(prefers-color-scheme: dark)');
  let RGB, HL;
  const pickColours = () => {
    const dark = darkMq.matches;
    RGB = (dark && d.rgbDark) || d.rgb || '37,99,235';
    HL = (dark && d.hlDark) || d.hl || '14,165,233';
  };
  pickColours();
  darkMq.addEventListener && darkMq.addEventListener('change', pickColours);
  const MIN_DESKTOP = 1100, MIN_ZONE = 110;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const cv = document.createElement('canvas'), ctx = cv.getContext('2d');
  let host = document.body;
  if (mode === 'fill') {
    host = document.querySelector(d.target);
    cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none';
    host.prepend(cv);
  } else {
    cv.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:-1';
    document.body.appendChild(cv);
  }

  let W, H, dpr, helices = [], mouse = { x: -9999, y: -9999 };

  function rnd(a, b) { return a + Math.random() * (b - a); }

  function makeHelix(x, y, len, amp) {
    return { x, y, len, amp, tilt: rnd(-0.35, 0.35), phase: rnd(0, 6.28), speed: rnd(0.25, 0.45) * (Math.random() < .5 ? -1 : 1),
             turns: len / rnd(150, 190), bob: rnd(0, 6.28) };
  }

  function layout() {
    dpr = devicePixelRatio || 1;
    const r = mode === 'fill' ? host.getBoundingClientRect() : { width: innerWidth, height: innerHeight };
    W = r.width; H = r.height;
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    helices = [];
    if (innerWidth < MIN_DESKTOP) return;               // desktop only

    if (mode === 'fill') {
      const cols = Math.max(3, Math.round(W / 260)), rows = Math.max(2, Math.round(H / 380));
      for (let c = 0; c < cols; c++) for (let r2 = 0; r2 < rows; r2++) {
        if (Math.random() < .35) continue;
        const len = rnd(200, 320);
        helices.push(makeHelix((c + rnd(.25, .75)) * W / cols, (r2 + rnd(.1, .4)) * H / rows, len, rnd(18, 30)));
      }
      return;
    }
    const els = [...document.querySelectorAll(d.avoid)];   // several selectors = union of their boxes
    if (!els.length) return;
    const rs = els.map(e => e.getBoundingClientRect());
    const b = { left: Math.min(...rs.map(r => r.left)), right: Math.max(...rs.map(r => r.right)) };
    const zones = [[0, b.left - 24], [b.right + 24, W]];
    for (const [z0, z1] of zones) {
      const zw = z1 - z0;
      if (zw < MIN_ZONE) continue;
      const amp = Math.min(34, zw / 5), n = Math.max(2, Math.round(H / 300));
      for (let i = 0; i < n; i++) {
        const len = rnd(H / n * .75, H / n * 1.05);
        helices.push(makeHelix(z0 + zw * rnd(.35, .65), (i / n) * H + rnd(10, 40), len, amp));
      }
    }
  }

  function draw(t) {
    ctx.clearRect(0, 0, W, H);
    const R = 150, time = reduce ? 0 : t / 1000;
    for (const h of helices) {
      const step = 13, cos = Math.cos(h.tilt), sin = Math.sin(h.tilt);
      const oy = Math.sin(time * .5 + h.bob) * 8;
      const A_ = [], B_ = [];
      for (let s = 0; s <= h.len; s += step) {
        const ang = (s / h.len) * h.turns * 6.283 + h.phase + time * h.speed;
        const off = h.amp * Math.sin(ang), dep = Math.cos(ang);
        const ly = s - h.len / 2;
        const ax = h.x + off * cos - ly * sin, ay = h.y + h.len / 2 + oy + off * sin + ly * cos;
        const bx = h.x - off * cos - ly * sin, by = h.y + h.len / 2 + oy - off * sin + ly * cos;
        // fade the ends of each helix
        const edge = Math.min(1, s / 50, (h.len - s) / 50);
        A_.push({ x: ax, y: ay, z: dep, e: edge }); B_.push({ x: bx, y: by, z: -dep, e: edge });
      }
      // base-pair rungs
      for (let i = 0; i < A_.length; i++) {
        const a = A_[i], b = B_[i];
        ctx.strokeStyle = `rgba(${RGB},${.13 * a.e * A})`; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
      // backbones + nodes, back strand first
      for (const strand of [A_, B_]) {
        for (let i = 1; i < strand.length; i++) {
          const p = strand[i - 1], q = strand[i];
          ctx.strokeStyle = `rgba(${RGB},${(.22 + .2 * (q.z + 1) / 2) * q.e * A})`; ctx.lineWidth = 1.4 + q.z * .5;
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
        }
      }
      for (const p of A_.concat(B_)) {
        const dm = Math.hypot(p.x - mouse.x, p.y - mouse.y), near = dm < R, k = 1 - dm / R;
        if (near) {
          ctx.strokeStyle = `rgba(${HL},${k * .75 * p.e})`; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
        }
        const rad = (2.1 + p.z * .9) * (near ? 1 + k * .8 : 1);
        ctx.fillStyle = near ? `rgba(${HL},${(.6 + k * .4) * p.e})` : `rgba(${RGB},${(.3 + .3 * (p.z + 1) / 2) * p.e * A})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(.6, rad), 0, 6.283); ctx.fill();
      }
    }
    if (!reduce) requestAnimationFrame(draw);
  }

  addEventListener('mousemove', e => {
    if (mode === 'fill') { const r = cv.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; }
    else { mouse.x = e.clientX; mouse.y = e.clientY; }
  });
  addEventListener('mouseleave', () => { mouse.x = mouse.y = -9999; });
  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(layout, 150); });
  const start = () => { layout(); requestAnimationFrame(draw); };
  document.readyState === 'loading' ? addEventListener('DOMContentLoaded', start) : start();
  if (document.fonts) document.fonts.ready.then(layout);
})();
