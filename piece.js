// piece.js: Thaw. A field of cold, falling snow that turns into warm, rising embers
// when the visitor smiles. It reads window.sense inside its own frame loop and
// nothing else. It never touches the camera.
//
// What it does with the object:
//   state 'nobody'   cold and dark: a thin snowfall
//   state 'here'     still cold, but it warms a little as signals.smile climbs
//   state 'smiling'  warm: the snow turns gold, rises, swirls around a glow, and
//                    bursts outward once at the moment the smile is recognised
// The caption under the field says in plain words what the piece noticed.

const canvas = document.querySelector('#piece');
const ctx = canvas.getContext('2d');
const caption = document.querySelector('#caption');

const CAPTIONS = {
  nobody:  'Nobody here. It is cold.',
  here:    'It is cold. It is waiting for you to smile.',
  smiling: 'You smiled. It warmed up.',
};

// ---- Tuning ---------------------------------------------------------------
const WARM_EASE = 0.6;      // seconds to warm up once a smile is recognised
const COOL_EASE = 1.8;      // seconds to cool down (the warmth lingers)
const BURST_TIME = 0.9;     // seconds the outward burst takes to fade
const CAPTION_FADE = 0.25;  // seconds to fade a caption out or in
const COLD_BG = [7, 11, 21];
const WARM_BG = [28, 9, 5];

let W = 0;
let H = 0;
let particles = [];

function resize() {
  const dpr = Math.min(devicePixelRatio || 1, 2);
  W = innerWidth;
  H = innerHeight;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const count = Math.min(1400, Math.max(500, Math.round((W * H) / 1500)));
  particles = Array.from({ length: count }, () => ({
    x: Math.random() * W,
    y: Math.random() * H,
    z: 0.3 + Math.random() * 0.7, // depth: near flakes are bigger, brighter and faster
    phase: Math.random() * Math.PI * 2,
    hue: (Math.random() - 0.5) * 26,
    vx: 0,
    vy: 0,
  }));
  ctx.fillStyle = `rgb(${COLD_BG})`;
  ctx.fillRect(0, 0, W, H);
}
addEventListener('resize', resize);
resize();

const mix = (a, b, t) => a + (b - a) * t;
const smooth = t => t * t * (3 - 2 * t);

// How warm the page wants to be, 0 (snow) to 1 (embers).
function wantedWarmth({ state, signals }) {
  if (state === 'nobody') return 0;
  if (state === 'smiling') return 1; // locked: wobble inside the State Table's band does not flicker the page

  // 'here': follow smile, but stop well short of warm. Warm is for 'smiling'.
  return 0.45 * smooth(Math.min(1, Math.max(0, signals.smile / 0.5)));

  // PARTNER: `still` could decide whether the warmth stays. When it exists, scale
  // the result of this function by it, e.g. multiply by (0.5 + 0.5 * signals.still).
}

let warmth = 0;
let lastTime = performance.now();
let shownState = null;
let captionAlpha = 0;

function frame(now) {
  const dt = Math.min(0.05, Math.max(0, (now - lastTime) / 1000)); // seconds; never negative, capped so a hidden tab does not jump
  lastTime = now;
  const t = now / 1000;
  const sense = window.sense;

  // Ease toward the wanted warmth, slower on the way down.
  const want = wantedWarmth(sense);
  const ease = want > warmth ? WARM_EASE : COOL_EASE;
  warmth += (want - warmth) * (1 - Math.exp(-dt / (ease / 3)));
  const w = warmth;

  // The burst: when a smile is recognised, everything is pushed outward once.
  const sinceSmile = sense.state === 'smiling' ? (now - sense.since) / 1000 : Infinity;
  const burst = sinceSmile < BURST_TIME * 3 ? Math.exp(-sinceSmile / BURST_TIME) : 0;

  const cx = W / 2;
  const cy = H * 0.46;

  // Background: a translucent wash, so every particle leaves a short trail.
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = `rgba(${mix(COLD_BG[0], WARM_BG[0], w)|0}, ${mix(COLD_BG[1], WARM_BG[1], w)|0}, ${mix(COLD_BG[2], WARM_BG[2], w)|0}, ${mix(0.16, 0.24, w).toFixed(3)})`;
  ctx.fillRect(0, 0, W, H);

  ctx.globalCompositeOperation = 'lighter';

  // The glow at the centre grows with the warmth and breathes a little.
  if (w > 0.02) {
    const radius = Math.min(W, H) * (0.2 + 0.4 * w) * (1 + 0.04 * Math.sin(t * 2.2) + burst * 0.5);
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    const a = 0.34 * w * w;
    glow.addColorStop(0, `rgba(255, 190, 90, ${a.toFixed(3)})`);
    glow.addColorStop(0.45, `rgba(255, 110, 30, ${(a * 0.45).toFixed(3)})`);
    glow.addColorStop(1, 'rgba(255, 80, 10, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);
  }

  for (const p of particles) {
    const dx = p.x - cx;
    const dy = p.y - cy;
    const d = Math.hypot(dx, dy) || 1;

    // Where this particle wants to be going: down and drifting when cold, up and
    // circling the glow when warm.
    const coldVx = Math.sin(t * 0.7 + p.phase) * 14 * p.z;
    const coldVy = 16 + 44 * p.z;
    const swirl = 70 * w * w * p.z * Math.min(1, 220 / d + 0.35);
    const warmVx = (-dy / d) * swirl - (dx / d) * 10 * w;
    const warmVy = -(26 + 80 * p.z) + (dx / d) * swirl - (dy / d) * 6 * w;
    const goalX = mix(coldVx, warmVx, w);
    const goalY = mix(coldVy, warmVy, w);

    const follow = 1 - Math.exp(-dt * 2.5);
    p.vx += (goalX - p.vx) * follow + (dx / d) * burst * 900 * p.z * dt;
    p.vy += (goalY - p.vy) * follow + (dy / d) * burst * 900 * p.z * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;

    if (p.y > H + 12) { p.y = -12; p.x = Math.random() * W; }
    else if (p.y < -12) { p.y = H + 12; p.x = Math.random() * W; }
    if (p.x < -12) p.x = W + 12;
    else if (p.x > W + 12) p.x = -12;

    const size = (0.9 + 1.7 * p.z) * (1 + 0.9 * w);
    const flicker = mix(1, 0.55 + 0.45 * Math.sin(t * 7 + p.phase * 3), w);
    const alpha = (0.3 + 0.5 * p.z) * flicker;
    // Mixed in RGB, not by hue: blue to orange by hue passes through green.
    const color = `rgba(${mix(205, 255, w) | 0}, ${mix(226, 172 + p.hue * 2.5, w) | 0}, ${mix(255, 58, w) | 0}, ${alpha.toFixed(2)})`;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
    ctx.fill();
    if (w > 0.3) { // embers leave a short tail
      ctx.strokeStyle = color;
      ctx.lineWidth = size * 1.2;
      ctx.beginPath();
      ctx.moveTo(p.x - p.vx * 0.07 * w, p.y - p.vy * 0.07 * w);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }
  }
  ctx.globalCompositeOperation = 'source-over';

  // The caption swaps only when it has faded out, so words never jump.
  const fadeStep = dt / CAPTION_FADE;
  if (shownState !== sense.state) {
    captionAlpha = Math.max(0, captionAlpha - fadeStep);
    if (captionAlpha === 0) {
      shownState = sense.state;
      caption.textContent = CAPTIONS[shownState] || '';
    }
  } else {
    captionAlpha = Math.min(1, captionAlpha + fadeStep);
  }
  caption.style.opacity = captionAlpha.toFixed(3);

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
