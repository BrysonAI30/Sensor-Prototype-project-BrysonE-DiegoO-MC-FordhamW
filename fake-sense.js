// fake-sense.js: the same object, with no sensor attached, good enough to demo.
//
// Loaded first, so piece.js never reads an empty object. Until the camera is on:
//   move the mouse across the page: left is far from the screen, right is leaning in
//   the mouse up and down drives any other signal (your partner's still)
//   take the mouse out of the window: nobody is there
//   number keys 1, 2, 3 ... jump to that state (in the order of the table's rows)
// The signals ease toward their targets and the State Table's own rules (holds and
// hysteresis) pick the state, so the demo behaves like the camera does.
// When sense.js goes live it sets window.senseLive and this file stops writing.

(function () {
  const rows = window.TABLE.states;
  const names = rows.map(row => row.name);

  const signals = {};
  for (const name of window.TABLE.signals) signals[name] = 0;

  window.sense = {
    state: names[names.length - 1], // the last row, usually "nobody"
    signals,
    since: performance.now(),
  };

  // What the visitor is doing, as targets the signals ease toward.
  const target = {};
  for (const name of window.TABLE.signals) target[name] = 0;
  target.present = 0; // nobody until the mouse moves

  // Signals that jumping to a state sets. Unlisted states only change the name.
  const PRESETS = {
    nobody: { present: 0, near: 0 },
    here:   { present: 1, near: 0.3 },
    near:   { present: 1, near: 0.9 },
  };

  function setState(name) {
    if (name === window.sense.state) return;
    window.sense.state = name;
    window.sense.since = performance.now();
  }

  addEventListener('keydown', e => {
    if (window.senseLive) return;
    const name = names[Number(e.key) - 1];
    if (!name) return;
    setState(name);
    Object.assign(target, PRESETS[name] || {});
    Object.assign(signals, PRESETS[name] || {}); // jump, so the table agrees at once
  });

  addEventListener('pointermove', e => {
    if (window.senseLive) return;
    target.present = 1;
    target.near = e.clientX / innerWidth;
    for (const name of window.TABLE.signals) {
      if (name !== 'present' && name !== 'near') target[name] = 1 - e.clientY / innerHeight;
    }
  });

  document.documentElement.addEventListener('pointerleave', () => {
    if (!window.senseLive) target.present = 0;
  });

  // The table, applied the way sense.js applies it: first true row wins, and it
  // has to stay the winner for its hold before the state changes.
  let candidate = null;
  let candidateSince = 0;

  function step(now) {
    if (!window.senseLive) {
      for (const name in signals) signals[name] += (target[name] - signals[name]) * 0.1;
      const winner = rows.find(row => row.when(signals, window.sense.state));
      if (!winner || winner.name === window.sense.state) {
        candidate = null;
      } else {
        if (winner.name !== candidate) { candidate = winner.name; candidateSince = now; }
        if (now - candidateSince >= winner.hold * 1000) { setState(winner.name); candidate = null; }
      }
    }
    requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
})();
