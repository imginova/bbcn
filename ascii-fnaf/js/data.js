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
// 15 vent rooms in 3 rows of 5 (on request; it was 2 rows of 4), numbered like this:
//     V1   V2   V3   V4   V5
//     V6   V7   V8   V9   V10
//     V11  V12  V13  V14  V15 -> your office
// Each vent joins the ones beside it, above it and below it. Everyone starts in V1 (top left) and
// climbs toward V15 (bottom right), the vent that opens into your office: 6 moves away.
const VENT_ROWS = 3;
const VENT_COLS = 5;
const VENT_COUNT = VENT_ROWS * VENT_COLS;
const VENT_START = 1;
const VENT_EXIT = VENT_COUNT;
// Every vent number. Array.from({ length: 15 }, (_, i) => i + 1) builds [1, 2, ..., 15].
const VENT_LIST = Array.from({ length: VENT_COUNT }, (_, i) => i + 1);
const ventRow = n => Math.floor((n - 1) / VENT_COLS);   // 0 = top row ... 2 = bottom row
const ventCol = n => (n - 1) % VENT_COLS;               // 0 = left ... 4 = right
// How many moves apart two vents are (rows apart plus columns apart).
const ventSteps = (a, b) => Math.abs(ventRow(a) - ventRow(b)) + Math.abs(ventCol(a) - ventCol(b));
// The vents next to vent n.
const ventNeighbors = n => VENT_LIST.filter(m => ventSteps(m, n) === 1);
// How many moves vent n is from the exit (the exit itself is 0).
const ventDist = n => ventSteps(n, VENT_EXIT);

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
  desc: 'Walks from the stage through the dining area and a hall to either door, and laughs each time he moves: the side of the laugh is the door he\'s going to, and the louder it is, the closer he is. You can follow him on the cameras. Shut that door on the 3rd laugh.',
  // The rooms he passes through on his way to each door (step 0, 1 and 2; step 3 is the doorway,
  // where he isn't seen: his 3rd laugh is the warning).
  routes: { L: ['stage', 'dining', 'whall'], R: ['stage', 'dining', 'ehall'] },
};
const BONNIE = {
  id: 'bon', name: 'Bonnie', where: 'LEFT DOOR',
  desc: 'Walks down the west side to the left door. In the dark doorway you only see his glowing eyes (the flashlight shows all of him). Shut the door when he\'s there.',
  route: ['stage', 'dining', 'parts', 'whall', 'L'],   // the last step is the doorway he ends up at
};
const CHICA = {
  id: 'chi', name: 'Chica', where: 'RIGHT DOOR',
  desc: 'Walks down the east side to the right door. In the dark doorway you only see her glowing eyes (the flashlight shows all of her). Shut the door when she\'s there.',
  route: ['stage', 'dining', 'ehall', 'R'],
};
const FOXY = {
  id: 'fox', name: 'Foxy', where: 'LEFT DOOR',
  desc: 'Gets ready in Pirate Cove (CAM 3), one stage at a time. Keep the flashlight on the cove to push him back one stage at a time. If he runs, shut the left door: his bang costs some power.',
};
const GOLDEN = {
  id: 'gol', name: 'Golden Freddy', where: 'OFFICE',
  desc: 'Can be in your office when you flip the monitor down (every time at level 20). Tap the mask on, quickly.',
  how: 'was sitting in your office',
};
const FENDO = {
  id: 'fen', name: 'Freddy Endo', where: 'VENTS',
  desc: 'Wanders the vents wherever he likes, and lures don\'t move him. He never attacks, but you can\'t play an audio lure in the vent he\'s in.',
};
const TFREDDY = {
  id: 'tfr', name: 'Toy Freddy', where: 'OFFICE',
  desc: 'His timer only counts down while the monitor is down. When he walks in, put the mask on and keep it on until he leaves.',
  how: 'walked into your office',
};
const TBONNIE = {
  id: 'tbn', name: 'Toy Bonnie', where: 'VENTS',
  desc: 'Fast through the vents, and fooled by an audio lure only about half the time. When he climbs in, keep the mask on until he leaves.',
  how: 'climbed out of the vent',
  interval: TOY_BONNIE_INTERVAL,
};
const TCHICA = {
  id: 'tch', name: 'Toy Chica', where: 'VENTS',
  desc: 'Medium speed through the vents, and hardly ever fooled by a lure. When she climbs in, keep the mask on until she leaves.',
  how: 'climbed out of the vent',
  interval: TOY_CHICA_INTERVAL,
};
const MANGLE = {
  id: 'mng', name: 'Mangle', where: 'OFFICE',
  desc: 'Turns up somewhere in your office. Shine the flashlight on them and they jump to a different spot: find them and shine again. 3 times sends them away. Be quick at every spot.',
  how: 'dropped down on you',
};
const BB = {
  id: 'bb', name: 'BB', where: 'VENTS',
  desc: 'Crawls the vents but never shows on the vent map; he giggles when he reaches the last vent. In your office, wear the mask until he leaves, or he takes your flashlight for the rest of the night.',
  interval: BB_INTERVAL,
  hidden: true,   // not drawn on the vent map, and silent until the last vent
};
const PUPPET = {
  id: 'pup', name: 'The Puppet', where: 'CAM 7',
  desc: 'Waits in the music box on CAM 7. One click of Wind fills it all the way. When it gets low, a ♪! shows on the Camera button.',
};
const TCUP = {
  id: 'cup', name: 'Toy cupcake', where: 'OFFICE',
  desc: 'Pops up somewhere in the office and blinks and beeps. On the monitor you can only hear it, so flip it down, find it and tap it before time runs out.',
  how: 'went off',
};
const SFREDDY = {
  id: 'sfr', name: 'Shadow Freddy', where: 'CAMERAS',
  desc: 'Sits on a random camera; that camera\'s map button and the Camera button blink a red !. Find him and shine the flashlight on him.',
  how: 'stepped out of the shadows',
};
const SBONNIE = {
  id: 'sbn', name: 'Shadow Bonnie', where: 'OFFICE',
  desc: 'Turns the office dark. Hunt for his eyes with the flashlight (never over the vent) and hold the light on them until he\'s gone.',
  how: 'found you in the dark',
};
const CHILD = {
  id: 'cry', name: 'Crying Child', where: 'CAMERAS',
  desc: 'A sticky note in the office says which camera he\'s on. Don\'t watch that camera too long. He moves every time you put the monitor down (so check the note again), but never to the camera you put it down on.',
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
// The list is in rough order of difficulty, easiest first, and All 20 must stay last (the maximum).
// No two challenges may have exactly the same levels, or the second could never be matched.
const PRESETS = [
  { name: 'Warm-up', v: 2, levels: lv({ bon: 3, chi: 3, pup: 3, fox: 2 }) },
  { name: 'Night watch', v: 2, levels: lv({ fre: 5, bon: 5, chi: 5, pup: 5 }) },
  { name: 'The originals', v: 2, levels: lv({ fre: 10, bon: 10, chi: 10, fox: 10 }) },
  { name: 'Fox hunt', v: 2, levels: lv({ fox: 18, mng: 18 }) },                       // the two foxes
  { name: 'Hall monitors', v: 2, levels: lv({ fre: 15, bon: 15, chi: 15 }) },         // doors only
  { name: 'Fresh paint', v: 3, levels: lv({ tfr: 15, tbn: 15, tch: 15 }) },           // mask only
  { name: 'Toy box', v: 5, levels: lv({ tfr: 10, tbn: 10, tch: 10, mng: 8, bb: 8, cup: 8 }) },
  { name: 'Pizza party', v: 5, levels: lv({ chi: 12, tch: 12, cup: 12, bon: 8, fre: 8 }) },
  { name: 'Balloon trouble', v: 7, levels: lv({ bb: 16, fen: 12, tbn: 12, fox: 10, pup: 8 }) }, // v3 and v4 were lineups taken back
  { name: 'Vent party', v: 6, levels: lv({ tbn: 12, tch: 12, bb: 10, spr: 10, fen: 15 }) },
  { name: 'Camera shy', v: 3, levels: lv({ cry: 14, pup: 12, fox: 10, sfr: 10 }) },
  { name: 'Don\'t stare', v: 2, levels: lv({ cry: 20, fox: 12, pup: 10 }) },
  { name: 'Lights out', v: 2, levels: lv({ sbn: 12, mng: 12, sfr: 12, fox: 8 }) },
  { name: 'Shadow play', v: 1, levels: lv({ sfr: 15, sbn: 15, gol: 8 }) },
  { name: 'Mask on', v: 3, levels: lv({ gol: 10, tfr: 14, tbn: 12, tch: 12 }) },
  { name: 'Springtime', v: 5, levels: lv({ spr: 18, fen: 20, bb: 10, pup: 10 }) },
  { name: 'Golden hour', v: 2, levels: lv({ gol: 20, fre: 12, cup: 12 }) },
  { name: 'Bunny trouble', v: 6, levels: lv({ bon: 15, tbn: 15, sbn: 15, spr: 12 }) }, // every rabbit
  { name: 'Bear trap', v: 1, levels: lv({ fre: 15, gol: 15, tfr: 15, fen: 15, sfr: 15 }) }, // every bear
  { name: 'Haunted', v: 1, levels: lv({ gol: 15, sfr: 15, sbn: 15, cry: 12, pup: 12 }) },
  { name: 'Everyone at 5', v: 8, levels: everyone(5) },
  { name: 'Everyone at 10', v: 9, levels: everyone(10) },
  { name: 'Old and new', v: 4, levels: lv({ fre: 18, bon: 18, chi: 18, fox: 18, tfr: 18, tbn: 18, tch: 18, mng: 18 }) },
  { name: 'Crawl space', v: 6, levels: lv({ spr: 20, tbn: 20, tch: 20, bb: 20, fen: 20 }) },
  { name: 'Everyone at 15', v: 9, levels: everyone(15) },
  { name: 'All 20', v: 9, levels: everyone(20) },
];

// One line of flavour text per challenge, shown under the list when it's picked.
const FLAVOR = {
  'Warm-up': 'Your first shift. Close the doors, wind the box.',
  'Night watch': 'A quiet night. Mostly.',
  'The originals': 'The old crew, back on their feet.',
  'Fox hunt': 'One runs, one crawls across the ceiling.',
  'Hall monitors': 'Just you, two doors and three visitors.',
  'Fresh paint': 'They still smell new. Keep the mask close.',
  'Toy box': 'Brand new, very friendly, very rude.',
  'Pizza party': 'Somebody ordered extra cupcakes.',
  'Balloon trouble': 'Hold on to your flashlight.',
  'Vent party': 'Something is always moving in the vents.',
  'Camera shy': 'Look, but not for too long.',
  'Don\'t stare': 'The note is watching which camera you pick.',
  'Lights out': 'Keep that flashlight handy.',
  'Shadow play': 'Not everything here has a body.',
  'Mask on': 'You will be wearing this a lot.',
  'Springtime': 'He is slow. He is patient. He is coming.',
  'Golden hour': 'Every time you look up, he is there.',
  'Bunny trouble': 'Every rabbit in the building wants in.',
  'Bear trap': 'Five bears, one office.',
  'Haunted': 'The ones who aren\'t really there.',
  'Everyone at 5': 'The whole line shows up, half asleep.',
  'Everyone at 10': 'The whole line, taking it easy. Sort of.',
  'Old and new': 'Originals and toys, both at their worst.',
  'Crawl space': 'The vents are full, and they are all in a hurry.',
  'Everyone at 15': 'Nobody is taking it easy now.',
  'All 20': 'Everyone, at their worst. Good luck.',
};

// The name a beaten challenge is saved under: its name plus its version, like "Toy box v1".
const clearKey = p => `${p.name} v${p.v || 1}`;

// The points a challenge is worth: all its levels added up.
const presetPoints = p => p.levels.reduce((total, level) => total + level, 0);
