/* =====================================================================
   data.js: the WORLD. Rooms, cameras, the characters and the
   ready-made challenges. Only descriptions here, no rules: game.js
   reads these to know where things are and what they're called.
   ===================================================================== */

// ---------- rooms and cameras ----------
// Each room has its camera number and the name shown on the feed.
const ROOMS = {
  stage:  { cam: 1, name: 'SHOW STAGE' },
  dining: { cam: 2, name: 'DINING AREA' },
  back:   { cam: 3, name: 'BACKSTAGE' },
  cove:   { cam: 4, name: 'PIRATE COVE' },
  whall:  { cam: 5, name: 'WEST HALL' },
  ehall:  { cam: 6, name: 'EAST HALL' },
  prize:  { cam: 7, name: 'PRIZE CORNER' },
};
// Which room each number key (1 to 7) opens.
const CAM_ORDER = ['stage', 'dining', 'back', 'cove', 'whall', 'ehall', 'prize'];

// ---------- the characters ----------
// Every character has:
//   id    a short code used everywhere in the code (for its color --c-fre in style.css, and its face in ICONS in art.js)
//   name  its full name
//   where where it gets you, shown on the custom night screen
//   desc  how it works, in one or two sentences
//   how   what the game over screen says when it gets you in your office
// They are in the order you made their mechanics, which is also the order of the setup rows.
const FREDDY = {
  id: 'fre', name: 'Freddy', where: 'RIGHT DOOR',
  desc: 'Laughs every time he moves, but never shows up on the cameras. Shut the right door on the third laugh.',
};
const BONNIE = {
  id: 'bon', name: 'Bonnie', where: 'EITHER DOOR',
  desc: 'Walks from the stage to either door; you can follow him on the cameras. Shut the door and he goes straight back to the stage.',
  // His two ways to your office. The last step is the door he ends up at: 'L' or 'R'.
  routes: [
    ['stage', 'dining', 'back', 'whall', 'L'],
    ['stage', 'dining', 'ehall', 'R'],
  ],
};
const GOLDEN = {
  id: 'gol', name: 'Golden Freddy', where: 'OFFICE',
  desc: 'Can be sitting in your office when you flip the monitor down. Quickly put the mask on; a tap will do.',
  how: 'was sitting in your office',
};
const PCHICA = {
  id: 'pch', name: 'Phantom Chica', where: 'OFFICE',
  desc: 'Can appear when you flip the monitor down. Find and click 1 to 3 shadow cupcakes (more at higher levels) or she jumpscares you and takes 10% power.',
};
const BONNET = {
  id: 'bnt', name: 'Bonnet', where: 'OFFICE',
  desc: 'Small and fast: runs across your office. Boop her nose before she gets to the other side. She dodges your mouse, but you are quicker.',
  how: 'made it across your office',
};
const WBONNIE = {
  id: 'wbn', name: 'Withered Bonnie', where: 'OFFICE',
  desc: 'Turns up on a timer. The monitor doesn\'t stop the timer, but he only appears once you flip it down. Wear the mask for 2 seconds.',
  how: 'got you in your office',
};
const PUPPET = {
  id: 'pup', name: 'The Puppet', where: 'CAM 7',
  desc: 'Waits in the music box on CAM 7. Tap Wind to wind it up. When it gets low, a ♪! shows on the Camera button and on CAM 7.',
};
const STAFF = {
  id: 'stf', name: 'Nightmare staff bot', where: 'EITHER DOOR',
  desc: 'Sits in your office. When it blinks, shut the door its arrow points to. With that door already shut, it waits until you open it.',
};
const NFREDDY = {
  id: 'nfr', name: 'Nightmare Freddy', where: 'OFFICE',
  desc: 'Freddles pile up on your desk; shine the flashlight on them to send them off. If all 3 stay too long he comes: keep the mask on until he leaves.',
  how: 'came for his Freddles',
};
const WFOXY = {
  id: 'wfx', name: 'Withered Foxy', where: 'LEFT DOOR',
  desc: 'Charges the left door from Pirate Cove. Shut it, wait for the stomp, then open the door, flash him and shut it again.',
};
const MOON = {
  id: 'mon', name: 'Sleepy Moon', where: 'OFFICE',
  desc: 'The office gets darker and you start to drift off. The flashlight or the monitor keeps you awake. If he\'s on, he\'s who comes when the power goes out.',
  how: 'put you to sleep',
};
const ENDO = {
  id: 'end', name: 'Flamethrower endo', where: 'OFFICE',
  desc: 'Heats up your office fast. The fan slows the heat down until he leaves. At 100% heat it\'s over.',
  how: 'cooked your office',
};

// Everything with a level on the custom night screen, in the order of the saved `levels` list.
// NEW CHARACTERS GO AT THE END, so levels saved by older versions still line up.
const SETUP = [FREDDY, BONNIE, GOLDEN, PCHICA, BONNET, WBONNIE, PUPPET, STAFF, NFREDDY, WFOXY, MOON, ENDO];

// ---------- spots in the office ----------
// [row, column] places in the office picture (36 wide, 16 tall, see officeLines in art.js).
// Phantom Chica's shadow cupcakes (3 characters wide) hide in some of these.
const CUPCAKE_SPOTS = [[2, 12], [5, 20], [5, 30], [8, 15], [11, 29], [11, 3], [13, 14], [14, 6], [15, 25], [13, 22]];
// The three places on the desk where Freddles sit (the left end of each 4-wide Freddle).
const FREDDLE_SPOTS = [[11, 11], [11, 17], [11, 23]];

// ---------- challenges ----------
// Ready-made nights: one click sets every level. Surviving a night set up EXACTLY like one earns it a ✓.
//   v      its version. RAISE IT whenever an update makes that challenge harder (by itself, or because
//          a character in it got stronger): the ✓ is saved as "name v1", so a new version needs
//          beating again. Only raise the ones a change actually affects.
// lv({ fre: 10, bon: 5 }) turns a list of levels by id into the full list, with 0 for everyone else.
const lv = byId => SETUP.map(c => byId[c.id] || 0);
const PRESETS = [
  { name: 'Warm-up', v: 1, levels: lv({ fre: 3, bon: 3, pup: 3, wfx: 2 }) },
  { name: 'The classics', v: 1, levels: lv({ fre: 8, bon: 8, gol: 5, wfx: 8 }) },
  { name: 'Wind it up', v: 1, levels: lv({ pup: 14, bon: 8, pch: 8 }) },
  { name: 'Don\'t look away', v: 1, levels: lv({ gol: 12, pch: 12, wbn: 12 }) },
  { name: 'Caution', v: 1, levels: lv({ stf: 14, bon: 10, fre: 6 }) },
  { name: 'Pirate\'s dance', v: 1, levels: lv({ wfx: 15, bon: 10, fre: 10 }) },
  { name: 'Bedtime', v: 1, levels: lv({ mon: 12, nfr: 10, bnt: 10 }) },
  { name: 'Heat wave', v: 1, levels: lv({ end: 15, stf: 8, fre: 8 }) },
  { name: 'Mask on', v: 1, levels: lv({ wbn: 15, gol: 15, nfr: 12 }) },
  { name: 'Everyone at 10', v: 1, levels: lv(Object.fromEntries(SETUP.map(c => [c.id, 10]))) },
  { name: 'Classic 20', v: 1, levels: lv({ fre: 20, bon: 20, gol: 20, wfx: 20 }) },
  { name: 'Everyone at 15', v: 1, levels: lv(Object.fromEntries(SETUP.map(c => [c.id, 15]))) },
  { name: 'All 20', v: 1, levels: lv(Object.fromEntries(SETUP.map(c => [c.id, 20]))) },
];

// One line of flavour text per challenge, shown under the list when it's picked.
const FLAVOR = {
  'Warm-up': 'Your first shift. Listen for the laughing.',
  'The classics': 'The old crew, back on stage. Mostly.',
  'Wind it up': 'Keep the music playing, whatever walks in.',
  'Don\'t look away': 'Every time you look up from the monitor, someone is there.',
  'Caution': 'Watch the arrow. Then watch the doors.',
  'Pirate\'s dance': 'Two doors, one fox, no rest.',
  'Bedtime': 'Lights on, eyes open, Freddles off the desk.',
  'Heat wave': 'The fan is your best friend tonight.',
  'Mask on': 'You will be wearing this a lot.',
  'Everyone at 10': 'The whole gang, taking it easy. Sort of.',
  'Classic 20': 'The original four, as hard as they get.',
  'Everyone at 15': 'Nobody is taking it easy now.',
  'All 20': 'Everyone, at their worst. Good luck.',
};

// The name a beaten challenge is saved under: its name plus its version, like "Bedtime v1".
const clearKey = p => `${p.name} v${p.v || 1}`;

// The points a challenge is worth: all its levels added up.
const presetPoints = p => p.levels.reduce((total, level) => total + level, 0);
