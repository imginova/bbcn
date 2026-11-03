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
    mod: { name: 'Patient', desc: 'Shut it out and it waits instead of leaving. When it growls, open the door, let it attack once more, and slam it again. Open too soon and it just waits again' },
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
// then 15.0 to make every threat a bit easier, then 18.0 so Total Nightmare could be beaten.
const SQUARE = { id: 'sqr', sym: '■', name: 'Square', door: 'Either door, in 3 steps', path: 'Far → medium → close. Doors do not stop it: hold the door light on it',
  interval: 18.0 / PACE,
  mod: { name: 'Flinch', desc: 'Let go of the light while it\'s still at your door and it lunges one step closer (up to close). Once you start lighting it, finish' } };

// Smiley hides in the office. Lowering the camera can wake it (you hear a giggle);
// then you have a few seconds to find (: in the office and click it (see updateSmiley in game.js).
const SMILEY = { id: 'smi', sym: '(:', name: 'Smiley', door: 'Hides in your office', path: 'Heard a giggle (often after lowering the camera)? Find (: and click it',
  mod: { name: 'Twins', desc: 'Two (: hide at once and you must click both, with 50% more time' } };

// ---------- the three newest threats (none of them are shapes) ----------

// The Crawler Ж crawls from the prize corner to your office: CAM 7 → CAM 1 → CAM 2, then EITHER
// CAM 4 → CAM 6 (the east side) OR CAM 3 → CAM 5 (the west side), then into your office.
// It picks a side each time it leaves the dining hall (see updateCrawler in game.js).
// Click it on the camera it's on to push it back ONE camera; follow it there and keep clicking
// until it's home on CAM 7. If it reaches your office, click it there before time runs out.
// Its interval was 12.0; it was doubled because the Crawler was the deadliest threat on Total Nightmare.
const CRAWLER = { id: 'crw', sym: 'Ж', name: 'Crawler', door: 'Crawls from CAM 7 to your office', path: 'CAM 7 → Stage → Dining → Supply → East hall, or Backstage → West hall → office. Click it on camera to push it back one room',
  interval: 24.0 / PACE,
  routes: [['prize', 'stage', 'dining', 'supply', 'ehall', 'office'],
           ['prize', 'stage', 'dining', 'backstage', 'whall', 'office']],
  // (on request it replaced "Stubborn", two clicks per room)
  mod: { name: 'Vent crawl', desc: 'At CAM 2 it can also climb into the vents and creep V1 → V15 → your office. Click its vent room on the VENTS tab to push it back' } };

// The Flicker ¤ turns up at a door (you hear it buzz). A short flash of that door's light makes it
// jump to the OTHER door; flash it there too and it leaves. Doors don't stop it.
const FLICKER = { id: 'flk', sym: '¤', name: 'Flicker', door: 'One door, then the other', path: 'Hear it buzz? Flash that door\'s light, then the other door when it jumps',
  interval: 13.0 / PACE,
  mod: { name: 'Ping-pong', desc: 'Jumps back to the first door once more, so it needs three flashes' } };

// The Visitor Ψ appears right in your office. Put on the mask (W, or the Mask button) and keep it
// on until it leaves. The cameras don't work with the mask on, but everything else does.
const VISITOR = { id: 'vis', sym: 'Ψ', name: 'Visitor', door: 'Appears in your office', path: 'Heard it? Put the mask on (W) and keep it on until it leaves',
  // (no interval: the Visitor uses its own random appearance timer, visitorWait in config.js)
  mod: { name: 'Double take', desc: 'Sometimes it only pretends to leave and comes straight back. A fake exit rises at the end: keep the mask on' } };

// ---------- the vents (the monitor's VENTS tab) ----------
// Fifteen vent rooms in 3 rows of 5 (on request: it was 2 rows of 3), between the far end of the
// building and your office. Every room joins the rooms beside, above and below it. The VENTS tab
// draws them like this (see ventGrid in art.js):
//     V1  = V2  = V3  = V4  = V5
//     |     |     |     |     |
//     V6  = V7  = V8  = V9  = V10
//     |     |     |     |     |
//     V11 = V12 = V13 = V14 = V15 => YOU
// The crawlers start in VENT_START (top left, the far corner) and come out of VENT_EXIT (bottom
// right) into your office.
const VENT_ROWS = 3, VENT_COLS = 5;
const VENT_START = 'v1', VENT_EXIT = 'v15';
// The rooms are built by a loop instead of being typed out one by one. Each room gets:
//   name  what the map shows ("V7")
//   row, col  where it sits (counting from 0, top left)
//   next  the rooms a tunnel joins it to
//   dist  how many moves it is from your office: 1 in V15, 7 in V1 (rows down plus columns across, plus 1)
const VENTS = {};
for (let row = 0; row < VENT_ROWS; row++) {
  for (let col = 0; col < VENT_COLS; col++) {
    const n = row * VENT_COLS + col + 1;   // 1 to 15, left to right and top to bottom
    const next = [];
    if (col > 0) next.push('v' + (n - 1));                       // the room to the left
    if (col < VENT_COLS - 1) next.push('v' + (n + 1));           // to the right
    if (row > 0) next.push('v' + (n - VENT_COLS));               // above
    if (row < VENT_ROWS - 1) next.push('v' + (n + VENT_COLS));   // below
    VENTS['v' + n] = { name: 'V' + n, row, col, next, dist: (VENT_ROWS - 1 - row) + (VENT_COLS - 1 - col) + 1 };
  }
}
const VENT_ORDER = Object.keys(VENTS);   // ['v1', 'v2', ... 'v15']

// The two vent crawlers both start in V1 and creep one vent closer at a time. From V15, their next
// move is out of the vent and into your office. You push them back with AUDIO LURES: click a vent
// room on the VENTS tab to play a sound there (free, but it needs a moment to recharge).
//   Ξ Echo goes to a lure played up to two rooms away from it (ECHO_HEAR in config.js).
//   § Slink goes to a lure in a room next to it, but a lure in its OWN room startles it one vent closer.
// `vent: true` marks a vent crawler; `how` is what the game over screen says it did.
const ECHO = { id: 'ech', sym: 'Ξ', name: 'Echo', door: 'Crawls through the vents', path: 'Watch it on the VENTS tab. Play a lure up to two rooms away to pull it there',
  vent: true, how: 'crawled out of the vent',
  // (11.0 before the vents grew to 15 rooms; then 2.5 times as often on request (4.4), and on request
  // "a little slower" again: twice as often as before, so 15 rooms still take about as long as 6 did)
  interval: 5.5 / PACE,
  mod: { name: 'Wise', desc: 'Ignores a lure in the same room it just followed one to. Switch rooms' } };
const SLINK = { id: 'slk', sym: '§', name: 'Slink', door: 'Crawls through the vents', path: 'Lure a room NEXT to it. A lure in its own room startles it one vent closer',
  vent: true, how: 'crawled out of the vent',
  interval: 7.0 / PACE,   // (was 12.0, eased to 14.0, then 5.6 with the 15-room vents, then "a little slower" like Echo)
  mod: { name: 'Quick', desc: 'Moves 1.5 times as often while you are not looking at the VENTS tab' } };

// The Peeker ¥ is a second mask threat. Unlike Ψ it can turn up at ANY time, even while the monitor
// is up (then you have to drop the monitor first), but a short moment in the mask sends it away.
const PEEKER = { id: 'pek', sym: '¥', name: 'Peeker', door: 'Peeks in, any time', path: 'Heard a sharp ting? Drop the monitor and put the mask on (a second is enough)',
  // (no interval: like Ψ it uses its own random appearance timer, peekerWait in config.js)
  // (on request it replaced "Double", which came back once more, too much like Ψ's Double take)
  mod: { name: 'Knock knock', desc: 'Sometimes it comes to a door instead (the ting comes from that side). Shut that door in time: the mask won\'t help' } };

// The Spammer © floods the monitor with ads while it's up. Close each ad with its [X];
// ADS_MAX ads open at once crashes the system, and that's the end of you.
const SPAMMER = { id: 'spm', sym: '©', name: 'Spammer', door: 'Pops up ads on your monitor', path: 'Each ad covers your whole monitor until you close it with its [X]. Too many at once crashes the system',
  how: 'crashed your system',
  interval: 32.0 / PACE,  // (was 6.0, then 8.0; then on request ads come a quarter as often)
  mod: { name: 'Sneaky', desc: 'The [X] can be in any corner of the ad, not just the top right' } };

// Everything that gets a level on the custom night screen, in order.
// levels[0] is the Diamond's level, levels[3] is Lenny's, and so on.
// The "..." spreads the CREATURES list out, so SETUP is
// [Diamond, Triangle, Orb, Lenny, Square, Smiley, Crawler, Flicker, Visitor, Echo, Slink, Peeker, Spammer].
// New threats go at the END, so levels saved by older versions still line up.
const SETUP = [...CREATURES, LENNY, SQUARE, SMILEY, CRAWLER, FLICKER, VISITOR, ECHO, SLINK, PEEKER, SPAMMER];

// ---------- modes ----------
// Every night is played in one of three modes, picked on the custom night screen (or by a challenge).
//   standard   the normal night: start with 100% power, survive until 6 AM
//   generator  start with 0% power; hold the generator to charge, but while you hold it both doors
//              open and you can't do anything else. Survive until 6 AM. Running dry isn't instant
//              death here, everything just switches off until you charge again.
//   tasks      finish every task on the monitor's TASKS tab to win (6 AM doesn't matter). A task only
//              progresses while you stay on that tab, so lowering the monitor pauses it.
const MODES = {
  standard:  { name: 'Standard',  desc: 'Start with 100% power. Survive until 6 AM.' },
  generator: { name: 'Generator', desc: 'Start with 0% power. Hold the generator (G) to charge, but while you do, both doors open and nothing else works. Nothing moves for the first 30 seconds, and power costs a bit less than usual. Survive until 6 AM.' },
  tasks:     { name: 'Tasks',     desc: 'Finish every task on the monitor\'s TASKS tab to win. A task only fills while you hold it down.' },
};
const MODE_ORDER = ['standard', 'generator', 'tasks'];

// Tasks mode: the jobs on the TASKS tab. Each night picks TASK_COUNT of them (config.js).
const TASK_NAMES = [
  'Reboot the cameras', 'Defrag the vent fans', 'Print the night report', 'Scan for viruses',
  'Reset the door motors', 'Update the clock', 'Calibrate the mask', 'Order more pizza',
  'Clean the keyboard', 'Back up the music box', 'Test the alarm', 'Count the animatronics',
];

// The Spammer's ads: what they say (one is picked at random for each).
const AD_TEXT = [
  'YOU ARE THE 1,000,000th NIGHT GUARD!', 'FREE POWER!!! (not really)', 'DOWNLOAD MORE RAM NOW',
  'HOT PIZZA IN YOUR AREA', 'CONGRATULATIONS, YOU WON A ... MASK?', 'CLICK HERE FOR A FREE MUSIC BOX',
  'DOCTORS HATE THIS ONE DOOR TRICK', 'YOUR VENTS ARE 87% INFECTED',
];

// Ready-made challenges for the custom night screen. Each one sets every level
// (in SETUP order: ◆ ▲ ● Lenny ■ (: Ж ¤ Ψ Ξ § ¥ ©), which modifiers are ticked (by id), and its
// `mode` (a challenge without one is a Standard night). The custom night screen shows them all in
// one list, every mode mixed together, with a small tag on the Generator and Tasks ones.
// "6/20" is the first six threats at level 20 with no modifiers (like FNAF's 4/20 mode), and
// Nightmare is 6/20 with their modifiers on. "9/20" and "Total Nightmare" are the same with the
// first nine. "13/20" and "Absolute Nightmare" are the same with all thirteen; Absolute Nightmare
// (every threat at 20, every modifier, 325 points) is the maximum, in every mode.
// Short `levels` lists are padded with 0 (off) below, so old challenges keep working.
//
// `tries` is how many attempts a NOVICE needed to beat the challenge, on average. The novices are
// test bots that play like a new player who has only read How to play: no muscle memory (slow,
// uneven reactions of 1.5 to 2.3 seconds), a slow hand (a second between actions), and only the
// strategy the help text teaches, but they LEARN: every loss makes them a little quicker, and they
// learn to watch for whatever got them. 40 of them each retried a challenge until they won, giving up
// after 60 tries (so 60 means "they never won"). The list is SORTED by it below: fewest
// tries first. A few challenges have fixed places (see PINNED below). If you retest a challenge,
// just change its number.
//
// `v` is the challenge's VERSION. Your ✓ is saved together with it, so raising a challenge's `v`
// takes away its ✓ and you have to beat it again. Raise it whenever a challenge gets harder, either
// itself or because a threat in it got stronger. (Every `v` went to 2 when the Crawler's route
// changed: all ✓ were reset then, on request.)
const PRESETS = [
  { name: 'Warm-up',         v: 3, levels: [4, 4, 3, 3, 0, 0],                   mods: [],                                           tries: 1 },
  { name: 'Hide & seek',     v: 5, levels: [0, 0, 10, 10, 10, 18],               mods: ['orb', 'len', 'smi'],                        tries: 1 },
  { name: 'Face off',        v: 3, levels: [0, 0, 0, 12, 0, 16, 0, 0, 16],      mods: ['smi', 'vis'],                               tries: 1 },
  { name: 'Masquerade',      v: 4, levels: [0, 0, 12, 8, 0, 16, 0, 0, 20, 0, 0, 10, 0],   mods: ['vis'],                                      tries: 1.2 },
  { name: 'Strobe',          v: 3, levels: [0, 10, 0, 8, 14, 0, 0, 20, 0],      mods: ['flk'],                                      tries: 1 },
  { name: 'Double trouble',  v: 3, levels: [6, 6, 0, 16, 10, 20, 0, 0, 10],     mods: ['smi'],                                      tries: 1.45 },
  { name: 'Lights out',      v: 3, levels: [8, 8, 0, 8, 20, 0],                  mods: ['sqr'],                                      tries: 1 },
  { name: 'Prank call',      v: 3, levels: [6, 20, 10, 16, 0, 0],                mods: ['tri'],                                      tries: 1.08 },
  { name: "Don't blink",     v: 3, levels: [20, 10, 0, 14, 0, 6],                mods: ['dia'],                                      tries: 1.18 },
  { name: 'Night crawlers',  v: 4, levels: [10, 10, 8, 0, 0, 0, 16, 0, 0],      mods: ['dia', 'crw'],                               tries: 1.02 },
  { name: 'Crawl space',     v: 7, levels: [8, 0, 0, 10, 0, 0, 18, 0, 0, 8, 0, 0, 0],    mods: ['crw'],                                      tries: 1 },
  { name: 'Shape party',     v: 3, levels: [16, 16, 16, 0, 16, 0],               mods: ['dia', 'tri', 'orb', 'sqr'],                 tries: 1.15 },
  { name: 'Waiting game',    v: 3, levels: [10, 10, 20, 0, 12, 8, 0, 8, 0],     mods: ['orb', 'smi'],                               tries: 1.18 },
  { name: 'Music lover',     v: 4, levels: [8, 8, 8, 20, 0, 8, 10, 0, 0],       mods: ['len'],                                      tries: 1.15 },
  { name: 'Channel surfing', v: 7, levels: [14, 0, 0, 16, 0, 10, 14, 0, 0, 0, 0, 0, 10], mods: ['len', 'crw'],                               tries: 1.02 },
  { name: 'Mixed bag',       v: 8, levels: [10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10], mods: ['crw', 'flk', 'vis'],                tries: 3.73 },
  { name: 'New faces',       v: 4, levels: [0, 0, 0, 0, 0, 0, 18, 18, 18],      mods: ['crw', 'flk', 'vis'],                        tries: 1 },
  { name: 'Graveyard shift', v: 8, levels: [12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12], mods: ['len', 'sqr'],                       tries: 5.9 },
  { name: 'Light show',      v: 3, levels: [0, 0, 8, 0, 16, 0, 0, 16, 0],       mods: ['sqr', 'flk'],                               tries: 1.63 },
  { name: 'Overtime',        v: 4, levels: [16, 16, 16, 16, 16, 16, 6, 6, 6],    mods: ['dia', 'len', 'smi'],                        tries: 3 },
  { name: '6/20',            v: 3, levels: [20, 20, 20, 20, 20, 20],             mods: [],                                           tries: 2.3 },
  { name: 'Nightmare',       v: 4, levels: [20, 20, 20, 20, 20, 20],             mods: ['dia', 'tri', 'orb', 'len', 'sqr', 'smi'],   tries: 5.48 },
  { name: '9/20',            v: 3, levels: [20, 20, 20, 20, 20, 20, 20, 20, 20], mods: [],                                           tries: 5.9 },
  { name: 'Total Nightmare', v: 5, levels: [20, 20, 20, 20, 20, 20, 20, 20, 20], mods: ['dia', 'tri', 'orb', 'len', 'sqr', 'smi', 'crw', 'flk', 'vis'], tries: 16.2 },

  // ---- the vents, ¥ and © drop (Standard) ----
  // In SETUP order: ◆  ▲  ●  Len ■  (:  Ж  ¤  Ψ  Ξ  §  ¥  ©
  { name: 'Ventilation',     v: 4, levels: [0, 0, 0, 0, 0, 0, 0, 0, 0, 16, 12, 0, 0],     mods: ['ech'],                                      tries: 1.9 },
  { name: 'Peekaboo',        v: 3, levels: [0, 0, 0, 0, 0, 10, 0, 0, 12, 0, 0, 18, 0],    mods: ['pek'],                                      tries: 1 },
  { name: 'Pop-up panic',    v: 3, levels: [0, 0, 0, 10, 0, 0, 10, 0, 0, 0, 0, 0, 16],    mods: ['spm'],                                      tries: 1 },
  { name: 'Crowded vents',   v: 4, levels: [0, 0, 0, 0, 10, 0, 0, 8, 0, 18, 18, 0, 0],    mods: ['slk'],                                      tries: 1.18 },
  { name: 'Fresh meat',      v: 6, levels: [0, 0, 0, 0, 0, 0, 0, 0, 0, 14, 14, 14, 14],   mods: ['ech', 'slk', 'pek', 'spm'],                 tries: 2.58 },
  { name: '13/20',           v: 5, levels: [20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20], mods: [],                                   tries: 12.65 },
  { name: 'Absolute Nightmare', v: 6, levels: [20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20], mods: SETUP.map(c => c.id),                tries: 55.05 },

  // ---- Generator mode ----
  { name: 'Power plant',     v: 6, mode: 'generator', levels: [10, 10, 8],                                 mods: [],                  tries: 1 },
  { name: 'Brownout',        v: 6, mode: 'generator', levels: [0, 0, 0, 0, 14, 0, 0, 12],                  mods: ['sqr'],             tries: 1.15 },
  { name: 'Static charge',   v: 7, mode: 'generator', levels: [0, 0, 0, 0, 0, 10, 0, 0, 14, 0, 0, 16, 0],  mods: ['pek'],             tries: 1.02 },
  { name: 'Dead battery',    v: 8, mode: 'generator', levels: [12, 0, 0, 10, 0, 0, 14, 0, 0, 0, 0, 0, 0],  mods: ['len'],             tries: 1 },
  { name: 'Overload',        v: 9, mode: 'generator', levels: [8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8],     mods: ['sqr', 'spm'],      tries: 1.8 },
  { name: 'Running on fumes', v: 6, mode: 'generator', levels: [12, 12, 0, 10],                          mods: ['tri'],             tries: 1 },
  { name: 'Ghost in the wires', v: 8, mode: 'generator', levels: [0, 0, 0, 0, 0, 0, 0, 14, 0, 12, 0, 0, 0], mods: ['flk'],          tries: 1 },
  { name: 'Spam generator',  v: 8, mode: 'generator', levels: [0, 0, 0, 8, 0, 8, 0, 0, 0, 0, 0, 10, 14],   mods: ['spm'],             tries: 1 },
  { name: 'Crank it',        v: 6, mode: 'generator', levels: [0, 0, 14, 0, 12, 0, 10],                    mods: ['orb'],             tries: 1 },
  { name: 'Full circuit',    v: 9, mode: 'generator', levels: [12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12], mods: ['ech', 'vis'], tries: 5.68 },
  { name: '13/20 (Generator)', v: 9, mode: 'generator', levels: [20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20], mods: [],      tries: 11.13 },
  { name: 'Absolute Nightmare (Generator)', v: 10, mode: 'generator', levels: [20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20], mods: SETUP.map(c => c.id), tries: 58.15 },

  // ---- Tasks mode ----
  { name: 'Night school',    v: 3, mode: 'tasks', levels: [6, 6, 0, 6],                                    mods: [],                  tries: 1 },
  { name: 'Busy work',       v: 5, mode: 'tasks', levels: [0, 0, 0, 10, 0, 0, 0, 0, 0, 0, 0, 12, 16],     mods: ['spm'],             tries: 1 },
  { name: 'Multitasking',    v: 5, mode: 'tasks', levels: [0, 0, 0, 8, 0, 0, 12, 0, 0, 12, 12, 0, 0],     mods: [],                  tries: 1 },
  { name: 'Deadline',        v: 3, mode: 'tasks', levels: [16, 16, 14, 0, 12],                             mods: ['tri'],             tries: 1.02 },
  { name: 'Paperwork',       v: 8, mode: 'tasks', levels: [10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10], mods: ['vis', 'pek', 'spm'], tries: 1.27 },
  { name: 'Inbox zero',      v: 5, mode: 'tasks', levels: [0, 0, 0, 8, 0, 0, 0, 0, 0, 0, 0, 0, 14],      mods: [],                  tries: 1 },
  { name: 'Vent duty',       v: 5, mode: 'tasks', levels: [0, 0, 0, 0, 0, 0, 0, 0, 0, 14, 12, 0, 0],     mods: ['slk'],             tries: 1 },
  { name: 'Office party',    v: 3, mode: 'tasks', levels: [0, 0, 0, 0, 0, 14, 0, 0, 12, 0, 0, 10, 0],    mods: ['smi'],             tries: 1 },
  { name: 'Door duty',       v: 3, mode: 'tasks', levels: [14, 14, 10, 0, 0, 0, 0, 8],                    mods: ['dia'],             tries: 1 },
  { name: 'Crunch time',     v: 7, mode: 'tasks', levels: [12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12], mods: ['len', 'spm'], tries: 1.27 },
  { name: '13/20 (Tasks)',   v: 7, mode: 'tasks', levels: [20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20], mods: [],           tries: 13.8 },
  { name: 'Absolute Nightmare (Tasks)', v: 8, mode: 'tasks', levels: [20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20], mods: SETUP.map(c => c.id), tries: 57.13 },
];
// Pad every challenge's levels with 0 (switched off) for any threat it doesn't mention,
// and give it a mode: a challenge that doesn't say is a standard night.
PRESETS.forEach(p => {
  while (p.levels.length < SETUP.length) p.levels.push(0);
  p.mode = p.mode || 'standard';
});

// A line of flavour text for each challenge, shown under the challenge list when you pick it
// (see renderSetup in screens.js).
const FLAVOR = {
  // Standard
  'Warm-up': "Your first night. The shapes are sleepy and the music box is patient. Probably.",
  'Hide & seek': "Something giggles, something rolls, and the music box won't stay where you left it.",
  'Face off': "Two smiles in the office, a mask on your face and a music box on the cameras.",
  'Masquerade': "A party for masks. The Visitor brought a friend who doesn't wait to be invited.",
  'Strobe': "Flash, jump, flash. The Flicker loves the light almost as much as the Square hates it.",
  'Double trouble': "Two smiles hiding in the office. Count carefully before you relax.",
  'Lights out': "The Square creeps closer in the dark. Keep your finger on that light.",
  'Prank call': "That rattle at the door might be nothing. Lower the camera and check.",
  "Don't blink": "The Diamond hates being watched. Look away and it comes running.",
  'Night crawlers': "Something skitters through the building while the shapes walk the halls.",
  'Crawl space': "Ж climbs out of the prize corner, and something else is already in the vents.",
  'Shape party': "All four shapes, all their tricks, no music box. Just doors and lights.",
  'Waiting game': "The Orb waits behind the door, the smiles wait in the office, and something buzzes.",
  'Music lover': "Lenny's song is fast tonight. Keep the box wound and the Crawler out.",
  'Channel surfing': "Cameras, cameras, cameras. And ads, right when you need the cameras.",
  'Mixed bag': "A little of everything: every threat in the building, all at 10.",
  'New faces': "The Crawler, the Flicker and the Visitor, all at 18.",
  'Graveyard shift': "All thirteen at 12. A long shift with short breaks.",
  'Light show': "Two threats, two lights, one pair of hands. Learn this before the nightmares.",
  'Overtime': "The old crew at 16 with their tricks, the newer ones just getting started.",
  '6/20': "The original six at full strength. A classic.",
  'Nightmare': "The original six at 20, with every trick they know.",
  '9/20': "Nine threats, all at 20. No tricks, just pressure.",
  'Total Nightmare': "Nine threats at 20 with every modifier. The old ceiling.",
  'Ventilation': "Clanking in the ducts. Keep the lures handy.",
  'Peekaboo': "Something peeks in when you least expect it, and sometimes it knocks at your door instead.",
  'Pop-up panic': "WINNER! You've won a monitor full of ads, just as the music box runs low.",
  'Crowded vents': "Both crawlers in the ducts while the Square and the Flicker work the doors.",
  'Fresh meat': "The four newest threats together, all with their tricks.",
  '13/20': "Every threat in the building at 20. No modifiers, no mercy.",
  'Absolute Nightmare': "Every threat. Every level 20. Every trick. Good luck.",
  // Generator
  'Power plant': "The lights are out and the generator is cold. Crank it between visitors.",
  'Brownout': "The Square and the Flicker both need light, and light needs power.",
  'Static charge': "Masks and charging don't mix: grab the generator and the mask comes off.",
  'Dead battery': "The music box needs the camera, the camera needs power, and the power needs you.",
  'Overload': "Everything at 8, running on a battery you fill by hand.",
  'Running on fumes': "Two shapes at the doors and a music box to wind, on whatever you can charge.",
  'Ghost in the wires': "Flashes at the door, clanks in the vents, and a generator that opens every door.",
  'Spam generator': "Ads, peeks, giggles and a music box to wind, while you crank the power back in.",
  'Crank it': "The Orb waits, the Square creeps, the Crawler climbs. Charge fast, charge often.",
  'Full circuit': "Everyone at 12, and the only power is the power you make.",
  '13/20 (Generator)': "All thirteen at 20, with a hand-cranked battery.",
  'Absolute Nightmare (Generator)': "Everything at its worst, and you start in the dark.",
  // Tasks
  'Night school': "Paperwork with a little company at the doors.",
  'Busy work': "Ads keep covering your work. Close them and keep going.",
  'Multitasking': "Tasks on the screen, crawlers in the vents and in the halls.",
  'Deadline': "The shapes don't care that you're busy, and the Triangle fakes its knocks.",
  'Paperwork': "Every threat at 10 and a desk full of work.",
  'Inbox zero': "The music box ticks down while the ads pile up.",
  'Vent duty': "Both crawlers in the ducts, and Slink speeds up while you're busy.",
  'Office party': "Giggles, masks and peeks. It's hard to work in a mask.",
  'Door duty': "Shapes at both doors, and the Diamond rushes whenever you look away.",
  'Crunch time': "Everyone at 12, ads included, and a deadline.",
  '13/20 (Tasks)': "All thirteen at 20, and the work still has to get done.",
  'Absolute Nightmare (Tasks)': "Everything at its worst, plus homework.",
};

// The name a challenge's ✓ is saved under: its name plus its version, like "Warm-up v2".
// Every challenge is on version 2 or more, and a new one starting at 1 is saved as "Name v1", so a
// plain name (no version) only ever comes from a save made before versions existed (see upgradeTick
// in game.js).
const clearKey = p => `${p.name} v${p.v || 1}`;

// The points a challenge is worth: all its levels, plus MOD_BONUS for each modifier on a switched-on threat.
const presetPoints = p => p.levels.reduce((t, lv, i) => t + lv + (lv > 0 && p.mods.includes(SETUP[i].id) ? MOD_BONUS : 0), 0);

// A few challenges have a fixed place, whatever the bots say: Warm-up is always first, and the list
// ends with Light show, Total Nightmare and the three Absolute Nightmares. Light show isn't the
// hardest, but it teaches a skill (sharing the door lights between ■ and ¤) that the max modes need,
// so it goes right before them. The Absolute Nightmares (every threat at 20 with every modifier, the
// maximum score) come last, sorted among themselves. Everything else gets 0 and is sorted by the bots.
const PINNED = {
  'Warm-up': -1, 'Light show': 1, 'Total Nightmare': 2, 'Absolute Nightmare': 3,
  'Absolute Nightmare (Generator)': 3, 'Absolute Nightmare (Tasks)': 3,
};

// Sort: pinned places first (see PINNED). Then fewest novice tries first; on a tie, fewest points first.
// sort() takes a compare function that returns a negative number to put `a` first, and a positive
// number to put `b` first. (If it returns 0, the two keep the order they have above.)
function compareChallenges(a, b) {
  const pin = (PINNED[a.name] ?? 0) - (PINNED[b.name] ?? 0);
  if (pin) return pin;
  return (a.tries - b.tries) || (presetPoints(a) - presetPoints(b));
}
PRESETS.sort(compareChallenges);
