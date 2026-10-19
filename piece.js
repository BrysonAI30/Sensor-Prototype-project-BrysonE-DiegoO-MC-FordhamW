// piece.js: a page of text that is blurred from across the room and comes into
// focus as the visitor leans in. It reads window.sense inside its own frame loop
// and nothing else. It never touches the camera.
//
// What it does with the object:
//   state 'nobody'  the page rests: dim and as blurred as it gets
//   state 'here'    the blur follows signals.near, so leaning in sharpens it
//   state 'near'    the visitor has leaned in on purpose: fully sharp
// The caption under the text says in plain words what the piece noticed.

const page = document.querySelector('#text');
const caption = document.querySelector('#caption');

const CAPTIONS = {
  nobody: 'Nobody here. The page is waiting.',
  here:   'You are too far away to read this.',
  near:   'You leaned in. It comes into focus.',
};

// ---- Tuning ---------------------------------------------------------------
const MAX_BLUR = 0.014;     // of the window width: about 20 px on a 1440 px screen
const BLUR_EASE = 0.9;      // seconds to blur again (slow: the page lets go reluctantly)
const SHARP_EASE = 0.45;    // seconds to sharpen (quick enough to feel answered)
const CAPTION_FADE = 0.25;  // seconds to fade a caption out or in

// How sharp the page wants to be, 0 (a smear) to 1 (crisp).
function wantedSharpness({ state, signals }) {
  if (state === 'nobody') return 0;
  if (state === 'near') return 1; // locked: wobble inside the State Table's band does not shake the page

  // 'here': follow near, but stop short of full sharp. Full sharp is for 'near'.
  const t = Math.min(1, Math.max(0, signals.near / 0.62));
  return 0.9 * t * t * (3 - 2 * t);

  // PARTNER: `still` decides whether it stays sharp. When it exists, scale the
  // result of this function by it, e.g. multiply by (0.5 + 0.5 * signals.still).
}

let sharp = 0;        // what is drawn now, eased toward the wanted value
let lastTime = performance.now();
let shownState = null;
let captionAlpha = 0;

function frame(now) {
  const dt = Math.min(0.1, (now - lastTime) / 1000); // seconds; capped so a hidden tab does not jump
  lastTime = now;
  const sense = window.sense;

  // Ease toward the wanted sharpness at a rate that depends on the direction.
  const want = wantedSharpness(sense);
  const ease = want > sharp ? SHARP_EASE : BLUR_EASE;
  sharp += (want - sharp) * (1 - Math.exp(-dt / (ease / 3)));

  const blur = MAX_BLUR * innerWidth * Math.pow(1 - sharp, 1.6);
  page.style.filter = `blur(${blur.toFixed(2)}px)`;
  page.style.opacity = (0.35 + 0.65 * sharp).toFixed(3);
  page.style.transform = `scale(${(1.025 - 0.025 * sharp).toFixed(4)})`;

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
