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
//             They were made 1.5x slower (4.8, 5.2, 6.4 became 7.2, 7.8, 9.6) when ■ and (: joined,
//             then 1.25x slower again (9.0, 9.75, 12.0) to make every threat a bit easier.
//   mod       the threat's optional MODIFIER: a special twist you can tick on the custom night
//             screen, separate from its level. Every threat in SETUP has one (see game.js).
//   pitch     the note of its footstep sound, so you can tell them apart by ear
//   loudness  how loud its footsteps are (1 = normal). ◆ and ▲ were turned up on request;
//             ● already has its big rumble at the door
//   unseen    true = never drawn in the doorway; you only hear it arrive
//   stalls    true = if BOTH doors are shut when it arrives, it waits at the door instead of
//             leaving, then attacks whichever door you open first (see updateMob in game.js)
//   routes    list of possible paths. The last entry is the door it attacks:
//             'L' (left) or 'R' (right). The orb has two routes and picks one.
const CREATURES = [
  { id: 'dia', sym: '◆', name: 'Diamond', door: 'Always the LEFT door', path: 'Stage → Dining → Backstage → West hall',
    interval: 9.0 / PACE, pitch: 72, loudness: 1.8,
    mod: { name: 'Charger', desc: 'Moves twice as often while you are NOT watching it, but freezes while you watch it on camera' },
    routes: [['stage', 'dining', 'backstage', 'whall', 'L']] },
  { id: 'tri', sym: '▲', name: 'Triangle', door: 'Always the RIGHT door', path: 'Stage → Dining → Supply → East hall',
    interval: 9.75 / PACE, pitch: 118, loudness: 1.8,
    mod: { name: 'Trickster', desc: 'While you watch the cameras, it fakes its "trying to get in" sound. The real one always shows in the doorway: lower the camera and look' },
    routes: [['stage', 'dining', 'supply', 'ehall', 'R']] },
  { id: 'orb', sym: '●', name: 'Orb', door: 'Picks EITHER door', path: 'Invisible at the door: listen for the rumble',
    interval: 12.0 / PACE, pitch: 48, loudness: 1, unseen: true, stalls: true,
    mod: { name: 'Patient', desc: 'Shut it out and it waits (growling) instead of leaving. Open the door, let it attack once more, and slam it again in time' },
    routes: [['stage', 'dining', 'whall', 'L'], ['stage', 'dining', 'ehall', 'R']] },
];

// Lenny never walks anywhere; he lives in the music box on CAM 7 (see updateLenny in game.js).
const LENNY = { id: 'len', name: 'Lenny', door: 'Sleeps in the music box on CAM 7', path: 'Hold W on CAM 7 to wind it. If it runs out, nothing stops him',
  mod: { name: 'Wanderer', desc: 'The music box moves between cameras 2, 3, 4 and 7 (only while well wound, with a chime). Find it to wind it' } };

// The cameras the box can wander to with the Wanderer modifier.
const BOX_ROOMS = ['prize', 'dining', 'backstage', 'supply'];

// The Square creeps up to either door in three stages: far, medium, close. One more move
// after "close" and it gets you. Closed doors don't stop it; only the door LIGHT pushes it back,
// and the longer you hold the light on it, the further back it goes (see updateSquare in game.js).
// interval works like the shapes' above. It was 6.0, then 12.0 because the square felt too fast,
// then 15.0 to make every threat a bit easier.
const SQUARE = { id: 'sqr', sym: '■', name: 'Square', door: 'Either door, in 3 steps', path: 'Far → medium → close. Doors do not stop it: hold the door light on it',
  interval: 15.0 / PACE,
  mod: { name: 'Bold', desc: 'Needs twice as much light to be pushed back each step, so start lighting it early' } };

// Smiley hides in the office. Lowering the camera can wake it (you hear a giggle);
// then you have a few seconds to find (: in the office and click it (see updateSmiley in game.js).
const SMILEY = { id: 'smi', sym: '(:', name: 'Smiley', door: 'Hides in your office', path: 'Heard a giggle (often after lowering the camera)? Find (: and click it',
  mod: { name: 'Twins', desc: 'Two (: hide at once and you must click both, with 50% more time' } };

// Everything that gets a level on the custom night screen, in order.
// levels[0] is the Diamond's level, levels[3] is Lenny's, and so on.
// The "..." spreads the CREATURES list out, so SETUP is [Diamond, Triangle, Orb, Lenny, Square, Smiley].
// New threats go at the END, so levels saved by older versions still line up.
const SETUP = [...CREATURES, LENNY, SQUARE, SMILEY];

// Ready-made challenges for the custom night screen. Each one sets every level
// (in SETUP order: ◆ ▲ ● Lenny ■ (:) and which modifiers are ticked (by id).
// They're in order from easiest to hardest, measured by a bot playing each one many times.
// Every ★ modifier shows up in at least one challenge before Nightmare, so you can practise it.
// "6/20" is all six threats at level 20 with no modifiers (like FNAF's 4/20 mode);
// Nightmare is 6/20 with every modifier on.
const PRESETS = [
  { name: 'Warm-up',         levels: [4, 4, 3, 3, 0, 0],         mods: [] },
  { name: 'Hide & seek',     levels: [0, 0, 10, 0, 10, 18],      mods: ['orb', 'smi'] },
  { name: 'Double trouble',  levels: [6, 6, 0, 16, 10, 20],      mods: ['smi'] },
  { name: 'Lights out',      levels: [8, 8, 0, 8, 20, 0],        mods: ['sqr'] },
  { name: 'Prank call',      levels: [6, 20, 10, 16, 0, 0],      mods: ['tri'] },
  { name: 'Waiting game',    levels: [10, 10, 20, 6, 12, 0],     mods: ['orb'] },
  { name: 'Music lover',     levels: [8, 8, 8, 20, 0, 8],        mods: ['len'] },
  { name: "Don't blink",     levels: [20, 10, 0, 14, 0, 6],      mods: ['dia'] },
  { name: 'Shape party',     levels: [16, 16, 16, 6, 0, 0],      mods: ['dia', 'tri', 'orb'] },
  { name: 'Graveyard shift', levels: [12, 12, 12, 12, 12, 12],   mods: ['len', 'sqr'] },
  { name: 'Overtime',        levels: [16, 16, 16, 16, 16, 16],   mods: ['dia', 'len', 'smi'] },
  { name: '6/20',            levels: [20, 20, 20, 20, 20, 20],   mods: [] },
  { name: 'Nightmare',       levels: [20, 20, 20, 20, 20, 20],   mods: ['dia', 'tri', 'orb', 'len', 'sqr', 'smi'] },
];
