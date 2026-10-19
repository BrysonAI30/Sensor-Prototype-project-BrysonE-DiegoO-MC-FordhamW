// sense.js: reads the camera, turns readings into signals, applies table.js,
// and writes window.sense.
//
// The instrument is the one from the Make a Face lab: MediaPipe Face Landmarker,
// 478 points and the same 52 named scores (press B to see them live). It is
// pinned to one version so it cannot change under you mid-module.
//
// What stays in the browser: every frame is read and dropped. Nothing here saves
// a frame or a landmark list. The model downloads once when the page loads;
// after that the Network panel should stay quiet.

// The library loads when you click Start, not before, so a blocked network shows
// up as a message on screen instead of a button that does nothing.
const LIBRARY = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.1/vision_bundle.mjs';
const WASM = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.1/wasm';
const MODEL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

const video = document.querySelector('#camera');
const button = document.querySelector('#start');
const readout = document.querySelector('#readout');
const scores = document.querySelector('#scores');

let landmarker = null;
let lastVideoTime = -1;
let latestScores = []; // the 52 named scores from the last frame, for the B panel only
let failed = false;    // the camera did not start; the readout holds the reason

// ---- Signals --------------------------------------------------------------
// Each function gets one frame's result and returns a number from 0 to 1.
// Add yours here. Its name has to match a name in table.js signals.

const SIGNALS = {
  // present: 1 when a face is in view, 0 when not. Smoothed below, so one
  // missed frame does not count as somebody leaving.
  present: result => (result.faceLandmarks.length > 0 ? 1 : 0),

  // open: the worked signal. jawOpen is one of the 52 scores, already 0 to 1.
  open: result => score(result, 'jawOpen'),

  // Your signal goes here. Two patterns to copy:
  //
  // A named score from the lab (the B panel shows every name):
  //   smile: result => (score(result, 'mouthSmileLeft') + score(result, 'mouthSmileRight')) / 2,
  //
  // Geometry from the 478 points (x and y run 0 to 1 across the frame):
  // A number that needs the last frame too, kept in a closure (how little the
  // nose moved since the previous frame):
  //   still: (() => {
  //     let last = null;
  //     return result => {
  //       const nose = result.faceLandmarks[0] && result.faceLandmarks[0][1];
  //       if (!nose) { last = null; return 0; }
  //       const moved = last ? Math.hypot(nose.x - last.x, nose.y - last.y) : 0;
  //       last = nose;
  //       return clamp(1 - moved * 40); // a jump of 1/40 of the frame reads 0
  //     };
  //   })(),
  //
  // Partner's signal goes here (still). Read the face with mainFace(result), not
  // result.faceLandmarks[0], so both signals look at the same person.
  //   still: ...

  // near (Bryson): 0 when the face is far or small in the frame, 1 when it is
  // right up at the screen. See the NEAR_* numbers above to tune it.
  near: (() => {
    const recent = [];  // last few raw widths; the middle one ignores a single bad frame
    let lastSeen = -Infinity;
    return result => {
      const face = mainFace(result);
      if (!face) return null; // nobody in view: keep the last value, let `present` say they left
      const now = performance.now();
      if (now - lastSeen > NEAR_GAP) recent.length = 0; // a new visit starts fresh
      const returning = recent.length === 0;
      lastSeen = now;
      recent.push(faceWidth(face));
      if (recent.length > NEAR_MEDIAN) recent.shift();
      const width = [...recent].sort((a, b) => a - b)[Math.floor(recent.length / 2)];
      // Distance is 1 / width, and leaning in is felt as a change in distance, so
      // measure on a log scale: the same lean moves the number the same amount
      // whether you start at 1 m or at 50 cm.
      const value = clamp(Math.log(width / NEAR_FAR) / Math.log(NEAR_CLOSE / NEAR_FAR));
      if (returning) signals.near = value; // jump to the first reading, then smooth from there
      return value;
    };
  })(),
};

// One of the 52 scores by name, or 0 when no face is in view.
function score(result, name) {
  const face = result.faceBlendshapes[0];
  if (!face) return 0;
  const found = face.categories.find(c => c.categoryName === name);
  return found ? found.score : 0;
}

function clamp(x) {
  return Math.min(1, Math.max(0, x));
}

// ---- Shared by both partners: which face is "the" face ------------------------
// The model looks for two faces so a bystander does not steal the reading by
// accident. Everything below reads the largest (closest) face in view, and only
// that one. Use mainFace(result) instead of result.faceLandmarks[0] in your signal.

function mainFace(result) {
  let best = null;
  let bestWidth = 0;
  for (const face of result.faceLandmarks) {
    const w = Math.abs(face[454].x - face[234].x);
    if (w > bestWidth) { best = face; bestWidth = w; }
  }
  return best;
}

// ---- near (Bryson): how close the face is -------------------------------------
// Cheek to cheek (landmarks 234 and 454) measured in 3D, as a fraction of the
// frame's width. Measuring in 3D means turning your head does not make you look
// farther away, and tilting it does not either. Face width is inversely
// proportional to distance: half the distance, double the width.
// Nothing here is stored. The number goes out to the console and is dropped.

function faceWidth(face) {
  const w = video.videoWidth || 640;
  const h = video.videoHeight || 480;
  const a = face[234];
  const b = face[454];
  // x and z share a scale (fractions of the frame width); y is a fraction of the height.
  return Math.hypot(b.x - a.x, ((b.y - a.y) * h) / w, b.z - a.z);
}

// near tuning. Widths are the 3D cheek-to-cheek number the console prints (step 1),
// as a fraction of the frame width. On a laptop webcam about 65 degrees wide:
//   NEAR_FAR   0.10 is about 1.2 m away or farther: reads 0
//   NEAR_CLOSE 0.36 is about 35 cm, a deliberate lean in: reads 1
// Other webcams see wider or narrower. Read your own numbers from the console and
// move these two. Every change goes in the README break log.
const NEAR_FAR = 0.10;
const NEAR_CLOSE = 0.36;
const NEAR_MEDIAN = 5;   // frames in the median (about 0.17 s at 30 fps)
const NEAR_GAP = 700;    // ms with no face before the next face counts as a new visit

// Smoothing: each new reading moves the signal a fraction of the way. Higher is
// jumpier, lower is calmer. Thresholds in table.js read the smoothed numbers.
const SMOOTHING = 0.25;

// ---- The State Table, applied ----------------------------------------------

const signals = window.sense.signals; // the object fake-sense.js made, kept
let candidate = null;
let candidateSince = 0;

function applyTable(now) {
  const rows = window.TABLE.states;
  const winner = rows.find(row => row.when(signals, window.sense.state));
  if (!winner || winner.name === window.sense.state) {
    candidate = null;
    return;
  }
  if (winner.name !== candidate) {
    candidate = winner.name;
    candidateSince = now;
  }
  if (now - candidateSince >= winner.hold * 1000) {
    window.sense.state = winner.name;
    window.sense.since = now;
    candidate = null;
  }
}

// ---- Step 1: raw readings ----------------------------------------------------
// Prints the raw face width to the console about four times a second. Off by
// default; press L to turn it on. Only the number is printed; nothing is kept.

let logging = false; // off for visitors; press L to see the numbers while you tune
let lastLog = 0;

function logRaw(now, result) {
  if (!logging || now - lastLog < 250) return;
  lastLog = now;
  const face = mainFace(result);
  if (!face) { console.log('near raw: no face'); return; }
  const flat = Math.abs(face[454].x - face[234].x);
  console.log(`near raw: width3d ${faceWidth(face).toFixed(3)}   flat ${flat.toFixed(3)}   faces ${result.faceLandmarks.length}   near ${signals.near.toFixed(2)}`);
}

addEventListener('keydown', e => {
  if (e.key.toLowerCase() === 'l') {
    logging = !logging;
    console.log(`near raw logging ${logging ? 'on' : 'off'}`);
  }
});

// ---- The loop ---------------------------------------------------------------

function tick() {
  const now = performance.now();
  if (video.currentTime !== lastVideoTime) {
    lastVideoTime = video.currentTime;
    const result = landmarker.detectForVideo(video, now);
    for (const name of window.TABLE.signals) {
      const read = SIGNALS[name];
      if (!read) continue;
      const value = read(result);
      if (value === null) continue; // a signal can say "no reading this frame"
      signals[name] += (clamp(value) - signals[name]) * SMOOTHING;
    }
    latestScores = result.faceBlendshapes[0] ? result.faceBlendshapes[0].categories : [];
    logRaw(now, result);
  }
  applyTable(now);
  requestAnimationFrame(tick);
}

async function start() {
  button.disabled = true;
  button.textContent = 'Loading the model…';
  let FaceLandmarker, FilesetResolver;
  try {
    ({ FaceLandmarker, FilesetResolver } = await import(LIBRARY));
  } catch (err) {
    console.error(err);
    showFailure('The face library did not load (cdn.jsdelivr.net is blocked or offline). ' +
      'Press D: the fake sensor still works, so keep building the piece.');
    return;
  }
  try {
    const vision = await FilesetResolver.forVisionTasks(WASM);
    const options = {
      baseOptions: { modelAssetPath: MODEL, delegate: 'GPU' },
      runningMode: 'VIDEO',
      numFaces: 2, // see mainFace(): the largest face is the one that counts
      outputFaceBlendshapes: true,
    };
    try {
      landmarker = await FaceLandmarker.createFromOptions(vision, options);
    } catch {
      options.baseOptions.delegate = 'CPU'; // some machines refuse the GPU path
      landmarker = await FaceLandmarker.createFromOptions(vision, options);
    }
    button.textContent = 'Asking for the camera…';
    video.srcObject = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
    await video.play();
    for (const name of window.TABLE.signals) {
      if (!SIGNALS[name]) console.warn(`table.js names a signal "${name}" that sense.js does not read yet.`);
    }
    // Start clean: whatever the fake sensor left behind is not the camera's reading.
    for (const name in signals) signals[name] = 0;
    window.sense.state = window.TABLE.states[window.TABLE.states.length - 1].name;
    window.sense.since = performance.now();
    window.senseLive = true;
    failed = false;
    button.remove();
    requestAnimationFrame(tick);
  } catch (err) {
    console.error(err);
    showFailure(`Camera did not start: ${err.message}`);
  }
}

function showFailure(message) {
  button.disabled = false;
  button.textContent = 'Did not start. Try again';
  failed = true;
  readout.hidden = false;
  readout.textContent = message;
}

button.addEventListener('click', start);

// ---- Readouts ---------------------------------------------------------------
// D shows the object piece.js reads. B shows all 52 scores, to find the name of
// the one you measured in the lab. V shows the camera. All off by default.

addEventListener('keydown', e => {
  const key = e.key.toLowerCase();
  if (key === 'd') {
    if (failed) { failed = false; readout.hidden = false; return; } // swap the message for the fake readout
    readout.hidden = !readout.hidden;
  }
  if (key === 'b') scores.hidden = !scores.hidden;
  if (key === 'v') video.classList.toggle('shown');
});

function drawReadouts() {
  if (!readout.hidden && !failed) {
    const { state, signals: s, since } = window.sense;
    const held = ((performance.now() - since) / 1000).toFixed(1);
    const lines = Object.entries(s).map(([k, v]) => `${k.padEnd(8)} ${v.toFixed(2)}`);
    readout.textContent =
      `${window.senseLive ? 'camera on' : 'fake: keys 1-9, mouse'}\n` +
      `state    ${state}  (${held} s)\n` + lines.join('\n');
  }
  if (!scores.hidden) {
    scores.textContent = latestScores.length
      ? latestScores.map(c => `${c.categoryName.padEnd(20)} ${c.score.toFixed(2)}`).join('\n')
      : 'no face in view (start the camera first)';
  }
  requestAnimationFrame(drawReadouts);
}
requestAnimationFrame(drawReadouts);
