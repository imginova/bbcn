/* =====================================================================
   data.js: the WORLD. Rooms, cameras, the characters and the
   ready-made challenges. Only descriptions here, no rules: game.js
   reads these to know where things are and what they're called.

   Line 2 mixes Sister Location (Circus Baby's rental place under the
   ground) with FNAF 4 (the nightmares in the halls).
   ===================================================================== */

// ---------- rooms and cameras ----------
// Each room has its camera number and the name shown on the feed.
// (On request: the two halls, the show stage, the auditorium where you can watch Funtime Freddy, the
// oxygen room, the power room, and three more rooms so Nightmare Mangle has places to hide.)
const ROOMS = {
  lhall:      { cam: 1, name: 'LEFT HALL' },
  rhall:      { cam: 2, name: 'RIGHT HALL' },
  stage:      { cam: 3, name: 'SHOW STAGE' },
  auditorium: { cam: 4, name: 'FUNTIME AUDITORIUM' },
  oxygen:     { cam: 5, name: 'OXYGEN ROOM' },
  power:      { cam: 6, name: 'POWER ROOM' },
  parts:      { cam: 7, name: 'PARTS & SERVICE' },
  storage:    { cam: 8, name: 'STORAGE' },
  arcade:     { cam: 9, name: 'ARCADE' },
};
// Which room each number key (1 to 9) opens.
const CAM_ORDER = ['lhall', 'rhall', 'stage', 'auditorium', 'oxygen', 'power', 'parts', 'storage', 'arcade'];
// The hall camera on each side.
const HALL = { L: 'lhall', R: 'rhall' };

// ---------- the characters ----------
// Every character has:
//   id    a short code used everywhere in the code (for its color --c-nfr in style.css, and its face in ICONS in art.js)
//   name  its full name
//   where where it gets you, shown on the custom night screen
//   desc  how it works, in one or two sentences
//   how   what the game over screen says when it gets you (when it doesn't come through a door)
// They're in the order of the roster, which is also the order of the setup cards.
const NFREDDY = {
  id: 'nfr', name: 'Nightmare Freddy', where: 'DESK',
  desc: 'Freddles climb onto your desk one by one. Shock the desk to clear them before there are 4, or Nightmare Freddy comes for you.',
  how: 'came out of the Freddles',
};
const NBONNIE = {
  id: 'nbn', name: 'Nightmare Bonnie', where: 'LEFT DOOR',
  desc: 'Comes down the left hall in 3 steps (footsteps, and you can see him on CAM 1). At the door you can\'t see him: go to the door and listen. Shut the HEAVY door, and only open it once the breathing stops.',
  interval: NBN_INTERVAL, side: 'L', pitch: 95,
};
const NCHICA = {
  id: 'nch', name: 'Nightmare Chica', where: 'RIGHT DOOR',
  desc: 'Comes down the right hall in 3 steps (footsteps, and you can see her on CAM 2). At the door you can\'t see her: go to the door and listen. Shut the HEAVY door, and only open it once the breathing stops.',
  interval: NCH_INTERVAL, side: 'R', pitch: 130,
};
const NFOXY = {
  id: 'nfx', name: 'Nightmare Foxy', where: 'EITHER DOOR',
  desc: 'Runs to either door and never shows on the cameras: listen for his steps. At the door, shut the HEAVY door and listen until the breathing stops. If he gets in, he grows bigger in your office: shock the desk before he\'s full size.',
  how: 'grew too big to stop',
  interval: NFX_INTERVAL, side: null, pitch: 170, unseen: true,
};
const NFREDBEAR = {
  id: 'nfb', name: 'Nightmare Fredbear', where: 'EITHER DOOR',
  desc: 'Like the other nightmares, but he can take either hall (CAM 1 or 2). Shut that HEAVY door and listen until the breathing stops.',
  interval: NFB_INTERVAL, side: null, pitch: 70,
};
const BABY = {
  id: 'bab', name: 'Circus Baby', where: 'OFFICE',
  desc: 'Comes down the left hall in 3 steps, with a soft beep each time. When she\'s in, put the mask on until she\'s right in front of you, then shock the desk.',
  how: 'got you',
};
const BALLORA = {
  id: 'bal', name: 'Ballora', where: 'EITHER DOOR',
  desc: 'Her music comes from the side she\'s dancing toward and gets louder each step. Shut that door before she arrives.',
};
const FFREDDY = {
  id: 'ffr', name: 'Funtime Freddy', where: 'EITHER DOOR',
  desc: 'His script for the night is on the office wall. When an important line comes up ("Bon-Bon, go get him!" or "Let\'s give him a surprise!"), he heads for a door. Watch CAM 4 (if he goes to the left of the room, it\'s the left door) or listen for his steps, and shut that door.',
};
const FFOXY = {
  id: 'ffx', name: 'Funtime Foxy', where: 'CAM 3',
  desc: 'The sign on the show stage (CAM 3) says when the next show starts. Be watching CAM 3 at that time.',
  how: 'put on a show without you',
};
const ENNARD = {
  id: 'end', name: 'Ennard', where: 'EITHER',
  desc: 'Either walks down a hall to a door (shut it), or crawls into the air vents and uses up your oxygen until you shock the desk.',
  how: 'pulled you into the wires',
};
const MINIREENA = {
  id: 'mrn', name: 'Minireenas', where: 'CAM 5',
  desc: 'They turn up in the oxygen room (CAM 5) one by one, and each one uses up oxygen. Shock that camera to zap them all.',
  how: 'took your last breath',
};
const NMARIONETTE = {
  id: 'nmt', name: 'Nightmarionette', where: 'OFFICE',
  desc: 'Appears in your office and uses up oxygen fast. Shock the desk 3 times to send them away.',
  how: 'took your last breath',
};
const WBONNIE = {
  id: 'wbn', name: 'Withered Bonnie', where: 'OFFICE',
  desc: 'Walks into your office. Put the mask on and keep it on until he leaves.',
  how: 'walked into your office',
};
const BIDYBAB = {
  id: 'bdb', name: 'Bidybab', where: 'VENT',
  desc: 'Squeaks in the vent above you. Count the squeaks: on every 3rd one, close the vent door.',
  how: 'dropped out of the vent',
};
const JACKO = {
  id: 'jck', name: 'Jack-o Chica', where: 'EITHER DOOR',
  desc: 'Stands in a doorway breathing smoke that uses up your oxygen. Slam the HEAVY door on her to send her away.',
  how: 'smoked you out',
};
const PLUSHTRAP = {
  id: 'ptr', name: 'Plushtrap', where: 'CAM 5',
  desc: 'Turns up in the oxygen room (CAM 5) and messes with the air. Stay on his camera until he leaves.',
  how: 'took your last breath',
};
const NCUPCAKE = {
  id: 'ncp', name: 'Nightmare Cupcake', where: 'CAM 6',
  desc: 'Gets into the power room (CAM 6; its map button shows a pink !) and eats your power. Shock him on that camera.',
  how: 'ate the last of the power',
};
const NMANGLE = {
  id: 'nmg', name: 'Nightmare Mangle', where: 'CAMERAS',
  desc: 'Three cameras blink, but they\'re only on one of them, draining your power. Find the right one and shock it. A wrong shock wastes power.',
  how: 'ate the last of the power',
};

// Everything with a level on the custom night screen, in the order of the saved `levels` list.
// NEW CHARACTERS GO AT THE END, so levels saved by older versions still line up.
const SETUP = [NFREDDY, NBONNIE, NCHICA, NFOXY, NFREDBEAR, BABY, BALLORA, FFREDDY, FFOXY, ENNARD,
  MINIREENA, NMARIONETTE, WBONNIE, BIDYBAB, JACKO, PLUSHTRAP, NCUPCAKE, NMANGLE];
// The nightmares that use the heavy doors and breathe behind them.
const NIGHTMARES = [NBONNIE, NCHICA, NFOXY, NFREDBEAR];

// ---------- Funtime Freddy's script ----------
// The lines that send him to a door, and the ones that are just talk.
const FFR_ATTACK_LINES = ['Bon-Bon, go get him!', 'Let\'s give him a surprise!'];
const FFR_TALK = ['Hey there, buddy!', 'Is it time for the show?', 'Bon-Bon, are you there?',
  'Who\'s ready to party?', 'Ha ha ha!', 'Oh, Bon-Bon...', 'Let\'s have some fun!', 'Did you hear that?',
  'Stay right there!', 'What a night!', 'Shhh... listen.', 'Bon-Bon, quiet down!'];

// ---------- challenges ----------
// Ready-made nights: one click sets every level. Surviving a night set up EXACTLY like one earns it a ✓.
//   v      its version. RAISE IT whenever an update makes that challenge harder (by itself, or because
//          a character in it got stronger): the ✓ is saved as "name v1", so a new version needs
//          beating again. Only raise the ones a change actually affects.
// lv({ nfr: 10, nbn: 5 }) turns a list of levels by id into the full list, with 0 for everyone else.
const lv = byId => SETUP.map(c => byId[c.id] || 0);
const everyone = level => lv(Object.fromEntries(SETUP.map(c => [c.id, level])));
// The list is in rough order of difficulty, easiest first, and All 20 must stay last (the maximum).
// No two challenges may have exactly the same levels, or the second could never be matched.
const PRESETS = [
  { name: 'Warm-up', v: 3, levels: lv({ nbn: 3, nch: 3, ffx: 3, mrn: 3 }) },
  { name: 'First shift', v: 1, levels: lv({ nfr: 5, nbn: 5, nch: 5, bab: 5 }) },
  { name: 'Circus', v: 2, levels: lv({ bab: 12, bdb: 12, ffx: 8 }) },                     // Baby and her Bidybabs
  { name: 'Ballerina', v: 2, levels: lv({ bal: 12, mrn: 12, end: 8 }) },                   // Ballora and her Minireenas
  { name: 'Showtime', v: 2, levels: lv({ ffr: 12, ffx: 15, bal: 8 }) },                    // the Funtime Auditorium
  { name: 'Heavy doors', v: 1, levels: lv({ nbn: 15, nch: 15, nfx: 10, nfb: 10 }) },       // the nightmares only
  { name: 'Mask up', v: 1, levels: lv({ wbn: 15, bab: 12, nfr: 8 }) },
  { name: 'Short of breath', v: 2, levels: lv({ mrn: 12, nmt: 10, jck: 10, ptr: 10 }) },  // everything that takes oxygen
  { name: 'Brownout', v: 1, levels: lv({ ncp: 15, nmg: 15, nfr: 10, bdb: 8 }) },           // everything that takes power
  { name: 'Sister Location', v: 3, levels: lv({ bab: 15, bal: 15, ffr: 15, ffx: 15, end: 12, mrn: 10, bdb: 10 }) },
  { name: 'Bedroom', v: 1, levels: lv({ nfr: 15, nbn: 15, nch: 15, nfx: 15, nfb: 15, ptr: 12 }) },   // FNAF 4
  { name: 'Halloween', v: 1, levels: lv({ jck: 15, nmg: 15, ptr: 12, nfx: 12, nmt: 10 }) },
  { name: 'Everyone at 5', v: 3, levels: everyone(5) },
  { name: 'Everyone at 10', v: 3, levels: everyone(10) },
  { name: 'Everyone at 15', v: 3, levels: everyone(15) },
  { name: 'All 20', v: 3, levels: everyone(20) },
];

// One line of flavour text per challenge, shown under the list when it's picked.
const FLAVOR = {
  'Warm-up': 'Your first night underground. Learn the doors.',
  'First shift': 'A few old faces, and one new one.',
  'Circus': 'She has so many little helpers.',
  'Ballerina': 'Listen for the music. Watch your breath.',
  'Showtime': 'Don\'t miss the show. Don\'t miss your cue.',
  'Heavy doors': 'Listen at the door. Then listen some more.',
  'Mask up': 'You will be wearing this a lot.',
  'Short of breath': 'Every breath counts tonight.',
  'Brownout': 'Something is eating the power.',
  'Sister Location': 'Welcome to Circus Baby\'s Entertainment and Rental.',
  'Bedroom': 'Just a bad dream. Probably.',
  'Halloween': 'Trick or treat.',
  'Everyone at 5': 'The whole line shows up, half asleep.',
  'Everyone at 10': 'The whole line, taking it easy. Sort of.',
  'Everyone at 15': 'Nobody is taking it easy now.',
  'All 20': 'Everyone, at their worst. Good luck.',
};

// The name a beaten challenge is saved under: its name plus its version, like "Circus v1".
const clearKey = p => `${p.name} v${p.v || 1}`;

// The points a challenge is worth: all its levels added up.
const presetPoints = p => p.levels.reduce((total, level) => total + level, 0);
