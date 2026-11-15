/* =====================================================================
   data.js: the WORLD. Rooms, cameras, vents, the characters and the
   ready-made challenges. Only descriptions here, no rules: game.js
   reads these to know where things are and what they're called.
   ===================================================================== */

// ---------- rooms and cameras ----------
// Each room has its camera number and the name shown on the feed.
const ROOMS = {
  stage:  { cam: 1, name: 'SHOW STAGE' },
  dining: { cam: 2, name: 'DINING AREA' },
  cove:   { cam: 3, name: 'PIRATE COVE' },
  whall:  { cam: 4, name: 'WEST HALL' },
  ehall:  { cam: 5, name: 'EAST HALL' },
  parts:  { cam: 6, name: 'PARTS & SERVICE' },
  prize:  { cam: 7, name: 'PRIZE CORNER' },
};
// Which room each number key (1 to 7) opens.
const CAM_ORDER = ['stage', 'dining', 'cove', 'whall', 'ehall', 'parts', 'prize'];

// ---------- the vents ----------
// 8 vent rooms in 2 rows of 4, numbered like this:
//     V1  V2  V3  V4
//     V5  V6  V7  V8 -> your office
// Each vent joins the ones beside it, above it and below it. Everyone starts in V1 (top left) and
// climbs toward V8 (bottom right), the vent that opens into your office.
const VENT_COLS = 4;
const VENT_START = 1;
const VENT_EXIT = 8;
const ventRow = n => Math.floor((n - 1) / VENT_COLS);   // 0 = top row, 1 = bottom row
const ventCol = n => (n - 1) % VENT_COLS;               // 0 = left ... 3 = right
// The vents next to vent n.
const ventNeighbors = n => [1, 2, 3, 4, 5, 6, 7, 8].filter(m =>
  Math.abs(ventRow(m) - ventRow(n)) + Math.abs(ventCol(m) - ventCol(n)) === 1);
// How many moves vent n is from V8 (V8 itself is 0).
const ventDist = n => (1 - ventRow(n)) + (VENT_COLS - 1 - ventCol(n));
// How many moves apart two vents are.
const ventSteps = (a, b) => Math.abs(ventRow(a) - ventRow(b)) + Math.abs(ventCol(a) - ventCol(b));

// ---------- the characters ----------
// Every character has:
//   id    a short code used everywhere in the code (for its color --c-fre in style.css, and its face in ICONS in art.js)
//   name  its full name
//   where where it gets you, shown on the custom night screen
//   desc  how it works, in one or two sentences
//   how   what the game over screen says when it gets you (when it doesn't come through a door)
// They're in the order of the roster, which is also the order of the setup rows.
const FREDDY = {
  id: 'fre', name: 'Freddy', where: 'EITHER DOOR',
  desc: 'Stands on the stage (CAM 1) until he sets off; then he\'s only heard. He laughs each time he moves: the side of the laugh is the door he\'s going to, and the louder it is, the closer he is. Shut that door on the 3rd laugh.',
};
const BONNIE = {
  id: 'bon', name: 'Bonnie', where: 'LEFT DOOR',
  desc: 'Walks down the west side to the left door. Shut it when he\'s in the doorway.',
  route: ['stage', 'dining', 'parts', 'whall', 'L'],   // the last step is the doorway he ends up at
};
const CHICA = {
  id: 'chi', name: 'Chica', where: 'RIGHT DOOR',
  desc: 'Walks down the east side to the right door. Shut it when she\'s in the doorway.',
  route: ['stage', 'dining', 'ehall', 'R'],
};
const FOXY = {
  id: 'fox', name: 'Foxy', where: 'LEFT DOOR',
  desc: 'Gets ready in Pirate Cove (CAM 3). Shine the flashlight on the cove to send him back. If he runs, shut the left door: his bang costs some power.',
};
const GOLDEN = {
  id: 'gol', name: 'Golden Freddy', where: 'OFFICE',
  desc: 'Can be in your office when you flip the monitor down (every time at level 20). Tap the mask on, quickly.',
  how: 'was sitting in your office',
};
const FENDO = {
  id: 'fen', name: 'Freddy Endo', where: 'VENTS',
  desc: 'Wanders the vents and never attacks, but you can\'t play an audio lure in the vent he\'s in.',
};
const TFREDDY = {
  id: 'tfr', name: 'Toy Freddy', where: 'OFFICE',
  desc: 'His timer only counts down while the monitor is down. When he walks in, put the mask on and keep it on until he leaves.',
  how: 'walked into your office',
};
const TBONNIE = {
  id: 'tbn', name: 'Toy Bonnie', where: 'VENTS',
  desc: 'Fast through the vents, and very easily fooled by an audio lure. When he climbs in, keep the mask on until he leaves.',
  how: 'climbed out of the vent',
  interval: TOY_BONNIE_INTERVAL,
};
const TCHICA = {
  id: 'tch', name: 'Toy Chica', where: 'VENTS',
  desc: 'Medium speed through the vents, and only sometimes fooled by a lure. When she climbs in, keep the mask on until she leaves.',
  how: 'climbed out of the vent',
  interval: TOY_CHICA_INTERVAL,
};
const MANGLE = {
  id: 'mng', name: 'Mangle', where: 'OFFICE',
  desc: 'Crawls across the office ceiling. Flash them 3 times (light off in between) before they reach the other side.',
  how: 'made it across your ceiling',
};
const BB = {
  id: 'bb', name: 'BB', where: 'VENTS',
  desc: 'Crawls the vents but never shows on the vent map. In your office, wear the mask until he leaves, or he takes your flashlight for 20 seconds.',
  interval: BB_INTERVAL,
  hidden: true,   // not drawn on the vent map, and silent until he climbs in
};
const PUPPET = {
  id: 'pup', name: 'The Puppet', where: 'CAM 7',
  desc: 'Waits in the music box on CAM 7. One click of Wind fills it all the way. When it gets low, a ♪! shows on the Camera button.',
};
const TCUP = {
  id: 'cup', name: 'Toy cupcake', where: 'ANYWHERE',
  desc: 'Pops up anywhere on the screen, even with the monitor up, and blinks and beeps. Tap it before time runs out.',
  how: 'went off',
};
const SFREDDY = {
  id: 'sfr', name: 'Shadow Freddy', where: 'CAMERAS',
  desc: 'Sits on a random camera; that camera\'s map button blinks a red !. Find him and shine the flashlight on him.',
  how: 'stepped out of the shadows',
};
const SBONNIE = {
  id: 'sbn', name: 'Shadow Bonnie', where: 'OFFICE',
  desc: 'Turns the office dark. Hunt for his eyes with the flashlight (never over the vent) and hold the light on them until he\'s gone.',
  how: 'found you in the dark',
};
const CHILD = {
  id: 'cry', name: 'Crying Child', where: 'CAMERAS',
  desc: 'A sticky note in the office says which camera he\'s on. Don\'t watch that camera too long. He never moves to the camera you last put the monitor down on.',
  how: 'caught you watching too long',
};
const SPRING = {
  id: 'spr', name: 'Springtrap', where: 'VENTS',
  desc: 'Slow through the vents and very easily fooled by a lure. The mask doesn\'t work on him: if he climbs in, you\'re dead.',
  how: 'climbed out of the vent',
  interval: SPRINGTRAP_INTERVAL,
};

// Everything with a level on the custom night screen, in the order of the saved `levels` list.
// NEW CHARACTERS GO AT THE END, so levels saved by older versions still line up.
const SETUP = [FREDDY, BONNIE, CHICA, FOXY, GOLDEN, FENDO, TFREDDY, TBONNIE, TCHICA, MANGLE, BB, PUPPET,
  TCUP, SFREDDY, SBONNIE, CHILD, SPRING];
// The vent crawlers that climb toward your office (Freddy Endo only wanders, so he isn't one).
const CRAWLERS = [TBONNIE, TCHICA, BB, SPRING];

// ---------- challenges ----------
// Ready-made nights: one click sets every level. Surviving a night set up EXACTLY like one earns it a ✓.
//   v      its version. RAISE IT whenever an update makes that challenge harder (by itself, or because
//          a character in it got stronger): the ✓ is saved as "name v1", so a new version needs
//          beating again. Only raise the ones a change actually affects.
// lv({ fre: 10, bon: 5 }) turns a list of levels by id into the full list, with 0 for everyone else.
const lv = byId => SETUP.map(c => byId[c.id] || 0);
const everyone = level => lv(Object.fromEntries(SETUP.map(c => [c.id, level])));
const PRESETS = [
  { name: 'Warm-up', v: 1, levels: lv({ bon: 3, chi: 3, pup: 3, fox: 2 }) },
  { name: 'The originals', v: 1, levels: lv({ fre: 10, bon: 10, chi: 10, fox: 10 }) },
  { name: 'Toy box', v: 1, levels: lv({ tfr: 10, tbn: 10, tch: 10, mng: 8, bb: 8, cup: 8 }) },
  { name: 'Vent party', v: 1, levels: lv({ tbn: 12, tch: 12, bb: 10, spr: 10, fen: 15 }) },
  { name: 'Camera shy', v: 1, levels: lv({ cry: 14, pup: 12, fox: 10, sfr: 10 }) },
  { name: 'Lights out', v: 1, levels: lv({ sbn: 12, mng: 12, sfr: 12, fox: 8 }) },
  { name: 'Mask on', v: 1, levels: lv({ gol: 10, tfr: 14, tbn: 12, tch: 12 }) },
  { name: 'Springtime', v: 1, levels: lv({ spr: 18, fen: 20, bb: 10, pup: 10 }) },
  { name: 'Golden hour', v: 1, levels: lv({ gol: 20, fre: 12, cup: 12 }) },
  { name: 'Everyone at 10', v: 1, levels: everyone(10) },
  { name: 'Old and new', v: 1, levels: lv({ fre: 18, bon: 18, chi: 18, fox: 18, tfr: 18, tbn: 18, tch: 18, mng: 18 }) },
  { name: 'Everyone at 15', v: 1, levels: everyone(15) },
  { name: 'All 20', v: 1, levels: everyone(20) },
];

// One line of flavour text per challenge, shown under the list when it's picked.
const FLAVOR = {
  'Warm-up': 'Your first shift. Close the doors, wind the box.',
  'The originals': 'The old crew, back on their feet.',
  'Toy box': 'Brand new, very friendly, very rude.',
  'Vent party': 'Something is always moving in the vents.',
  'Camera shy': 'Look, but not for too long.',
  'Lights out': 'Keep that flashlight handy.',
  'Mask on': 'You will be wearing this a lot.',
  'Springtime': 'He is slow. He is patient. He is coming.',
  'Golden hour': 'Every time you look up, he is there.',
  'Everyone at 10': 'The whole line, taking it easy. Sort of.',
  'Old and new': 'Originals and toys, both at their worst.',
  'Everyone at 15': 'Nobody is taking it easy now.',
  'All 20': 'Everyone, at their worst. Good luck.',
};

// The name a beaten challenge is saved under: its name plus its version, like "Toy box v1".
const clearKey = p => `${p.name} v${p.v || 1}`;

// The points a challenge is worth: all its levels added up.
const presetPoints = p => p.levels.reduce((total, level) => total + level, 0);
