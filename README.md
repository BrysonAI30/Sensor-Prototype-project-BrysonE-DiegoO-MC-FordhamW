# Lean In

A full-screen page of text that is blurred from across the room and comes into focus as the visitor leans toward the screen. **Live:** https://brysonai30.github.io/Sensor-Prototype-project-BrysonE-DiegoO-MC-FordhamW/ (after the pull request is merged and Pages is on: Settings, Pages, branch `main`, folder `/ (root)`). Click Start the camera.

Built on the class's Sensor Layer starter (the starter's own README follows below).

**What it does for the person:** it gives anyone who leans in a page that sharpens under their attention, so reading it feels like being let in on something.

**What it does to the person:** it blurs the words the moment they sit back, so they have to bring their face to the screen if they want to read.

## The State Table

| State | Rule | Hold | What the piece does |
|---|---|---|---|
| `near` | face in view and `near` above 0.62 to get in; stays until it drops under 0.45 | 0.8 s | fully sharp, caption: "You leaned in. It comes into focus." |
| `here` | face in view (`present` above 0.5) | 1 s | blur follows `near`, caption: "You are too far away to read this." |
| `nobody` | `present` under 0.2 | 2 s | dim and as blurred as it gets, caption: "Nobody here. The page is waiting." |

Signals: `present` (starter), `near` (Bryson: face width from the landmarks), `still` (partner, not built yet).

## Run it locally (Mac)

```
python3 -m http.server 8000
```

Open http://localhost:8000 in Chrome (not the file in Finder; the camera needs a server). Click **Start the camera**. No camera? Move the mouse: left is far, right is leaning in, and leaving the window is nobody. Number keys 1, 2, 3 jump to a state. **D** shows the object, **L** turns on the console readings of face width, **V** shows the camera.

## Plan

Rules from the assignment:

- `sense.js` reads the sensor, makes signals (0 to 1), applies our State Table, writes `window.sense = { state, signals, since }` (`since` = `performance.now()` when the state began). Exactly that shape.
- `fake-sense.js` writes the same object with no sensor (number keys set state, mouse sets signals). It loads first.
- `piece.js` reads `window.sense` in its own `requestAnimationFrame` loop.
- Camera track: MediaPipe Face Landmarker 1.1.1, pinned, on a plain `<video>`. No p5 in sensing. No face-api.js. Never save frames or landmarks. No network requests after the model loads. No camera images in the repo.
- States must not flicker: hold times and hysteresis.

Ownership: Bryson owns `near` (how close the face is, from face width). The partner owns `still`. Clear spots for the partner's parts are marked in `table.js`, `sense.js` and `piece.js`.

Steps:

1. Live raw face-width readings in the console.
2. Convert to a smoothed 0-1 `near` signal.
3. State Table rule for `near` with a hold.
4. `piece.js` responds to `near`.
5. README: what the piece does for the person and to them, plus a copy of this plan.
6. Review everything against the rules above, then deploy to GitHub Pages.

Graded on Legibility (a stranger understands what it noticed with no explanation), Care (no flickering on faces that aren't mine) and Position (the piece matches this README). Tune thresholds for different distances and lighting.

---

Computer Coding Studio, fall 2026. The camera, the model, one worked signal and a fake sensor, so your pair starts from a piece that already runs.

**Live:** https://flyinthelyceum.github.io/sensor-layer-starter/ (click Start the camera; press D, B, V)

## Make it yours

1. Click **Use this template**, then **Create a new repository**, under one partner's account. Add the other partner as a collaborator (Settings, Collaborators).
2. Both partners clone it, open it in VS Code, and run it with a local server. Live Server works, or in the terminal: `python3 -m http.server`, then open `http://localhost:8000`. Opening `index.html` straight from the Finder will not reach the camera.
3. Turn on GitHub Pages: Settings, Pages, branch `main`, folder `/ (root)`. That address is the live URL you submit.

## The files

| File | Job | Who edits it |
|---|---|---|
| `table.js` | Your State Table, row for row: the signals, the states, the rules, the holds | both of you, first |
| `sense.js` | Reads the camera, turns readings into signals, applies the table, writes `window.sense` | each partner, your own signal |
| `piece.js` | Reads `window.sense` every frame and answers | both of you |
| `fake-sense.js` | Writes the same object with no camera: number keys set the state, the mouse sets the signals | only if your signal names change |
| `index.html` | Loads them in order | rarely |

## The object

```js
window.sense = {
  state: 'here',                          // one word from your State Table
  signals: { present: 0.98, open: 0.02 }, // each a number from 0 to 1
  since: 184203.5                         // performance.now() when this state began
};
```

`piece.js` reads this and nothing else. It never touches the camera. That is why the piece keeps running on `fake-sense.js` when no camera is there, and why a scene you build in November can run off the sensor you build now.

## Adding your signal

1. Add its name to `signals` in `table.js`.
2. Add a function with the same name to `SIGNALS` in `sense.js`. It gets one frame's result and returns a number from 0 to 1. There are two patterns in the comments there: one of the 52 named scores from the lab, or geometry from the 478 points.
3. Use it in a rule in `table.js`. Press **D** to watch the number while you set the threshold. Thresholds that move go in your break log.

## Keys

- **D**: the object `piece.js` reads, live
- **B**: all 52 named scores, to find the one you measured in the Make a Face lab
- **V**: the camera, small, in the corner
- **1, 2, 3 …** and the **mouse**: drive the fake sensor before the camera starts

## When Start does nothing useful

If the readout says the face library did not load, the school network is blocking `cdn.jsdelivr.net`. Press **D** and keep going on the fake sensor: the piece reads the same object either way. A new state you add to `table.js` gets a bright colour of its own in `piece.js` until you give it one.

## Bench pairs: an Arduino instead of the camera

The bench track swaps the sense layer and nothing else. `piece.js` and `fake-sense.js` stay exactly as they are. The wiring, a photo of a working build and upload fixes are in `bench/README.md`.

1. Build the circuit and flash `bench/bench.ino` from the Arduino IDE. It prints one line per reading, like `cm 42.5`. Check it in the IDE's Serial Monitor at 115200, then **close the Serial Monitor**: only one program can hold the port.
2. Open **`bench.html`** instead of `index.html`, on localhost in **Chrome**. It loads the bench table and the serial sense layer; nothing to edit.
3. Click **Connect the Arduino** and pick the board. Press **D** to see the raw line and your signals.
4. Your State Table lives in **`bench/table-bench.js`** (same format as `table.js`). Your signal is a function in `SIGNALS` in `bench/sense-serial.js`: it gets the latest reading (`{ cm: 42.5 }`) and returns 0 to 1. Add the sensor to the sketch's printed line, then its function, then its name in `bench/table-bench.js`.

## What stays in the browser

Nothing saves a frame or a landmark list. The model downloads once when you click Start; after that the Network panel stays quiet. Keep it that way: no `localStorage` of readings, no uploads, no screenshots of the camera image in the repo. Screenshots for your break log show the piece or the D readout.

The instrument is MediaPipe Face Landmarker, pinned to version 1.1.1, the same one the Make a Face lab used.

## Break log

Every time something breaks or a threshold moves, one row.

| Date | Commit | What broke | What changed |
|---|---|---|---|
| 2026-10-19 | 06d965c | Nothing broken yet. First thresholds, untested on a camera. | `NEAR_FAR` 0.10 (reads 0), `NEAR_CLOSE` 0.36 (reads 1), median of 5 frames, smoothing 0.25. Starting guesses from a 65 degree webcam; retune from the console numbers. |
| 2026-10-19 | 6f3e2a4 | Nothing broken yet. First State Table thresholds, untested on a camera. | `near` state: in above 0.62, out below 0.45, hold 0.8 s. `here`: hold 1 s. `nobody`: present under 0.2, hold 2 s. |
| 2026-10-19 | 16e96eb | Found while building the piece (not on a camera): the starter's fake sensor drove the first signal from the mouse's x, which is now `present`, so `near` could not be demoed. And on camera start it left its old signals and state behind, so the camera would have begun in `near`. | `fake-sense.js` now drives `near` from the mouse's x and runs the table's holds; `sense.js` clears signals and state when the camera starts. |
| 2026-10-19 | 7bd157a | Found in review: the console readings of face width were on for every visitor. | Off by default; **L** turns them on for tuning. No threshold moved. |
| 2026-10-19 | 04f276b | Found in the final check: GitHub Pages was not turned on, so the live URL returned 404. | Pages needs Settings, Pages, branch `main`, folder `/ (root)`. Nothing in the code changed. |
