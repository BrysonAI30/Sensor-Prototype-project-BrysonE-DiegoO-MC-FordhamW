// table.js: your State Table, in code.
//
// Copy your paper table in here row for row. Nothing else in the starter needs to
// change for a new state to work: sense.js applies these rules, fake-sense.js uses
// the names, piece.js reads the result.
//
// signals: the numbers your sensing writes, each 0 to 1. Each partner owns one.
// states:  checked top to bottom; the first row whose rule is true wins.
//          hold is in seconds: how long a rule has to stay true before the state
//          changes. Without it the piece flickers between two words.
//          Keep "nobody" last, so it catches everything the other rows miss.

// when(s, now): s is the signals; now is the state the piece is in this moment.
// Knowing the current state lets a row use two thresholds, a high one to get in and
// a low one to stay in (hysteresis), so a number hovering on the line cannot flip
// the state back and forth.

window.TABLE = {
  // present: a face is in view (the starter's). smile: how much it is smiling (Bryson).
  // still: PARTNER, add 'still' here when its function exists in sense.js SIGNALS.
  signals: ['present', 'smile'],

  states: [
    // smiling: smile past 0.5 for 0.4 s to get in; it lasts until smile falls under 0.25.
    // Short to get in so the answer feels immediate, and the wide band to stay in
    // means a smile that wavers at the edges does not drop out.
    { name: 'smiling', when: (s, now) => s.present > 0.5 && s.smile > (now === 'smiling' ? 0.25 : 0.5), hold: 0.4 },

    // PARTNER: rows that use `still` go here, above 'here' (the first true row wins).

    // here: a face is in view, not smiling. Present gets in above 0.5 and
    // is only lost under 0.2, the gap between is the hysteresis. The longer hold
    // is the piece letting go of the warmth slowly.
    { name: 'here',    when: s => s.present > 0.5, hold: 0.8 },

    // nobody: slow to say, so a turned head or a blink of lost tracking is not a departure.
    { name: 'nobody',  when: s => s.present < 0.2, hold: 2 },
  ],
};
