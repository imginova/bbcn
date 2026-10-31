/* =====================================================================
   data.js: WHAT exists in the game: rooms, cameras and the threats.

   This is plain information (data). The rules that use it are in
   game.js. Adding a room or tweaking a route starts here.
   ===================================================================== */

// Every room with a camera. The short key (like 'whall') is how the code
// refers to a room. `cam` is the camera number, `name` is what the feed shows.
const ROOMS = {
  stage:     { cam: 1, name: 'STAGE' },
  dining:    { cam: 2, name: 'DINING HALL' },
  backstage: { cam: 3, name: 'BACKSTAGE' },
  supply:    { cam: 4, name: 'SUPPLY CLOSET' },
  whall:     { cam: 5, name: 'WEST HALL' },
  ehall:     { cam: 6, name: 'EAST HALL' },
  prize:     { cam: 7, name: 'PRIZE CORNER' },
};

// Which room each number key opens: pressing 1 shows CAM_ORDER[0], and so on.
const CAM_ORDER = ['stage', 'dining', 'backstage', 'supply', 'whall', 'ehall', 'prize'];

// Lenny's face. The two odd-looking escape codes (͡ and ͜) are
// "combining" marks: they draw on top of the character before them.
// It takes up 8 columns in the ASCII drawings.
const LENNY_FACE = '( ͡° ͜ʖ ͡°)';

// The three shapes that walk to your doors.
//   id        short name used in code and CSS classes (s-dia, s-tri, s-orb)
//   sym       the character drawn on screen
//   door/path text shown on the custom night screen
//   interval  seconds between chances to move (lower = more chances). Each one is
//             divided by PACE (config.js), so shorter hours make everyone faster.
//             They were made 1.5x slower (4.8, 5.2, 6.4 became 7.2, 7.8, 9.6) when ■ and (: joined.
//   pitch     the note of its footstep sound, so you can tell them apart by ear
//   unseen    true = never drawn in the doorway; you only hear it arrive
//   stalls    true = if BOTH doors are shut when it arrives, it waits at the door instead of
//             leaving, then attacks whichever door you open first (see updateMob in game.js)
//   routes    list of possible paths. The last entry is the door it attacks:
//             'L' (left) or 'R' (right). The orb has two routes and picks one.
const CREATURES = [
  { id: 'dia', sym: '◆', name: 'Diamond', door: 'Always the LEFT door', path: 'Stage → Dining → Backstage → West hall',
    interval: 7.2 / PACE, pitch: 72,
    routes: [['stage', 'dining', 'backstage', 'whall', 'L']] },
  { id: 'tri', sym: '▲', name: 'Triangle', door: 'Always the RIGHT door', path: 'Stage → Dining → Supply → East hall',
    interval: 7.8 / PACE, pitch: 118,
    routes: [['stage', 'dining', 'supply', 'ehall', 'R']] },
  { id: 'orb', sym: '●', name: 'Orb', door: 'Picks EITHER door', path: 'Invisible at the door: listen for the rumble',
    interval: 9.6 / PACE, pitch: 48, unseen: true, stalls: true,
    routes: [['stage', 'dining', 'whall', 'L'], ['stage', 'dining', 'ehall', 'R']] },
];

// Lenny never walks anywhere; he lives in the music box on CAM 7 (see updateLenny in game.js).
const LENNY = { id: 'len', name: 'Lenny', door: 'Sleeps in the music box on CAM 7', path: 'Hold W on CAM 7 to wind it. If it runs out, nothing stops him' };

// The Square creeps up to either door in three stages: far, medium, close. One more move
// after "close" and it gets you. Closed doors don't stop it; only the door LIGHT pushes it back,
// and the longer you hold the light on it, the further back it goes (see updateSquare in game.js).
const SQUARE = { id: 'sqr', sym: '■', name: 'Square', door: 'Either door, in 3 steps', path: 'Far → medium → close. Doors do not stop it: hold the door light on it',
  interval: 6.0 / PACE };

// Smiley hides in the office. Lowering the camera can wake it (you hear a giggle);
// then you have a few seconds to find (: in the office and click it (see updateSmiley in game.js).
const SMILEY = { id: 'smi', sym: '(:', name: 'Smiley', door: 'Hides in your office', path: 'Heard a giggle after lowering the camera? Find (: and click it' };

// Everything that gets a level on the custom night screen, in order.
// levels[0] is the Diamond's level, levels[3] is Lenny's, and so on.
// The "..." spreads the CREATURES list out, so SETUP is [Diamond, Triangle, Orb, Lenny, Square, Smiley].
// New threats go at the END, so levels saved by older versions still line up.
const SETUP = [...CREATURES, LENNY, SQUARE, SMILEY];
