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
  // present: a face is in view (the starter's). near: how close it is (Bryson).
  // still: PARTNER, add 'still' here when its function exists in sense.js SIGNALS.
  signals: ['present', 'near'],

  states: [
    // near: lean in past 0.62 for 0.8 s to get in; it lasts until near falls under 0.45.
    { name: 'near',   when: (s, now) => s.present > 0.5 && s.near > (now === 'near' ? 0.45 : 0.62), hold: 0.8 },

    // PARTNER: rows that use `still` go here, above 'here' (the first true row wins).

    // here: a face is in view but not leaning in. Present gets in above 0.5 and
    // is only lost under 0.2, the gap between is the hysteresis.
    { name: 'here',   when: s => s.present > 0.5,  hold: 1 },

    // nobody: slow to say, so a turned head or a blink of lost tracking is not a departure.
    { name: 'nobody', when: s => s.present < 0.2,  hold: 2 },
  ],
};
