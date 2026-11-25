/* =====================================================================
   data.js: the WORLD. Rooms, cameras, vents, the rarities and the
   characters. Only descriptions here, no rules: game.js reads these to
   know where things are and what they're called, and run.js reads the
   rarities to build the pick screen.
   ===================================================================== */

// ---------- rooms and cameras ----------
// Each room has its camera number and the name shown on the feed.
const ROOMS = {
  stage:  { cam: 1, name: 'SHOW STAGE' },
  dining: { cam: 2, name: 'DINING AREA' },
  cove:   { cam: 3, name: 'PIRATE COVE' },
  whall:  { cam: 4, name: 'WEST HALL' },
  ehall:  { cam: 5, name: 'EAST HALL' },
  prize:  { cam: 6, name: 'PRIZE CORNER' },
  audit:  { cam: 7, name: 'FUNTIME AUDITORIUM' },
  parts:  { cam: 8, name: 'PARTS & SERVICE' },
};
// Which room each number key (1 to 8) opens.
const CAM_ORDER = ['stage', 'dining', 'cove', 'whall', 'ehall', 'prize', 'audit', 'parts'];

// ---------- the vents ----------
// 15 vent rooms in 3 rows of 5, numbered like this:
//     V1   V2   V3   V4   V5
//     V6   V7   V8   V9   V10
//     V11  V12  V13  V14  V15 -> your office
// Each vent joins the ones beside it, above it and below it. Crawlers start in V1 (top left) and
// climb toward V15 (bottom right), the vent that opens into your office: 6 moves away.
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

// ---------- rarities ----------
// Every character has a rarity. It says roughly how hard the character is, how many points it adds to
// your lineup, and how often it turns up on the pick screen (`weight`: out of every 100 cards, about
// this many are of that rarity). `cls` is its color class in style.css.
const RARITIES = {
  common:    { name: 'Common',    points: 5,  weight: 40, cls: 'r-common' },
  uncommon:  { name: 'Uncommon',  points: 10, weight: 27, cls: 'r-uncommon' },
  rare:      { name: 'Rare',      points: 20, weight: 18, cls: 'r-rare' },
  epic:      { name: 'Epic',      points: 35, weight: 10, cls: 'r-epic' },
  legendary: { name: 'Legendary', points: 50, weight: 5,  cls: 'r-legendary' },
};
// The rarities from most common to rarest (for sorting cards).
const RARITY_ORDER = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

// ---------- the characters ----------
// Every character has:
//   id      a short code used everywhere in the code (its color --c-fre in style.css, its face in ICONS in art.js)
//   name    its full name
//   rarity  one of the RARITIES above
//   where   where it gets you, shown on its card
//   desc    how it works and how to stop it, in one or two sentences (shown on its card)
//   how     what the game over screen says when it gets you (when it doesn't come through a door)
const FREDDY = {
  id: 'fre', name: 'Freddy', rarity: 'common', where: 'EITHER DOOR',
  desc: 'Walks from the stage through the dining area and a hall to either door, and laughs each time he moves: the side of the laugh is his door, and the louder it is, the closer he is. Shut that door on the 3rd laugh.',
  // The rooms he passes through on his way to each door (step 0, 1 and 2; step 3 is the doorway,
  // where he isn't seen: his 3rd laugh is the warning).
  routes: { L: ['stage', 'dining', 'whall'], R: ['stage', 'dining', 'ehall'] },
};
const BONNIE = {
  id: 'bon', name: 'Bonnie', rarity: 'common', where: 'LEFT DOOR',
  desc: 'Walks down the west side to the left door, faster the hotter the office is: keep the fan going. In the dark doorway you only see his eyes. Shut the door when he\'s there.',
  route: ['stage', 'dining', 'parts', 'whall', 'L'],   // the last step is the doorway he ends up at
};
const CHICA = {
  id: 'chi', name: 'Chica', rarity: 'common', where: 'RIGHT DOOR',
  desc: 'Walks down the east side to the right door. Shut her out and she leaves cupcakes in your office: find and click every one before time runs out.',
  how: 'came back for her cupcakes',
  route: ['stage', 'dining', 'ehall', 'R'],
};
const TBONNIE = {
  id: 'tbn', name: 'Toy Bonnie', rarity: 'common', where: 'VENTS',
  desc: 'Fast through the vents, but very easily fooled by an audio lure. When he climbs in, put the mask on and keep it on until he makes a sound and leaves.',
  how: 'climbed out of the vent',
  interval: TOY_BONNIE_INTERVAL,
};
const TCHICA = {
  id: 'tch', name: 'Toy Chica', rarity: 'common', where: 'VENTS',
  desc: 'Medium speed through the vents, and only sometimes fooled by a lure. When she climbs in, put the mask on and keep it on until she makes a sound and leaves.',
  how: 'climbed out of the vent',
  interval: TOY_CHICA_INTERVAL,
};
const PUPPET = {
  id: 'pup', name: 'The Puppet', rarity: 'common', where: 'CAM 6',
  desc: 'Waits in the music box on CAM 6. One click of Wind fills it all the way. When it gets low, a ♪! shows on the Camera button.',
};
const NFREDDY = {
  id: 'nfr', name: 'Nightmare Freddy', rarity: 'common', where: 'OFFICE',
  desc: 'Freddles climb onto your desk one by one. Shine the flashlight on each to send it away. If all three are up for too long, Nightmare Freddy comes for you.',
  how: 'came for his Freddles',
};
const TRASH = {
  id: 'trs', name: 'Trash gang', rarity: 'common', where: 'CAMERAS',
  desc: 'Every so often they pile up in front of a camera and hide most of the picture for a while. They never attack.',
};
const LOLBIT = {
  id: 'lol', name: 'Lolbit', rarity: 'common', where: 'SCREEN',
  desc: 'Sometimes covers your whole view with a LOL screen: nothing under it can be clicked until you type L, O, L. Never attacks.',
};

// ----- uncommon -----
const FOXY = {
  id: 'fox', name: 'Foxy', rarity: 'uncommon', where: 'LEFT DOOR',
  desc: 'Gets ready in Pirate Cove (CAM 3), one stage at a time. Keep the flashlight on the cove to push him back. If he runs, shut the left door: his bang costs some power.',
};
const GOLDEN = {
  id: 'gol', name: 'Golden Freddy', rarity: 'uncommon', where: 'OFFICE',
  desc: 'Can be sitting in your office when you flip the monitor down. Put the mask on, quickly.',
  how: 'was sitting in your office',
};
const TFREDDY = {
  id: 'tfr', name: 'Toy Freddy', rarity: 'uncommon', where: 'OFFICE',
  desc: 'Walks into your office every so often, even while the monitor is up (listen for him). Put the mask on and keep it on until he leaves. He gives you a little longer than most.',
  how: 'walked into your office',
};
const NBONNIE = {
  id: 'nbn', name: 'Nightmare Bonnie', rarity: 'uncommon', where: 'EITHER DOOR',
  desc: 'Turns up in one of the doorways, breathing on that side. Shine the flashlight into that doorway until he leaves. A shut door blocks the light, so it has to be open.',
  how: 'stepped out of the doorway',
};
const BONNET = {
  id: 'bnt', name: 'Bonnet', rarity: 'uncommon', where: 'OFFICE',
  desc: 'Small and quick: she runs across your office floor. Click her nose before she gets to the other side. She dodges the mouse, but she\'s slower than you.',
  how: 'made it all the way across',
};

// ----- rare -----
const WBONNIE = {
  id: 'wbn', name: 'Withered Bonnie', rarity: 'rare', where: 'OFFICE',
  desc: 'Walks into your office on a timer. Keeping the monitor up doesn\'t slow it, but he waits for you to put it down. Then put the mask on and keep it on until he leaves.',
  how: 'was waiting in the dark',
};
const WFOXY = {
  id: 'wfx', name: 'Withered Foxy', rarity: 'rare', where: 'LEFT DOOR',
  desc: 'Runs at the left door: shut it. He won\'t leave yet. When he STOMPS, open the door, flash him, then shut it again to send him away. Open it before the stomp and he\'s right there.',
};
const SPRING = {
  id: 'spr', name: 'Springtrap', rarity: 'rare', where: 'CAMERAS',
  desc: 'Comes through Parts & Service, the dining area and the East hall toward your office. Shock his camera to send him back one room. Never let him get past the East hall.',
  how: 'crawled into your office',
  route: ['parts', 'dining', 'ehall'],   // the last room is the one he climbs into your office from
};
const NCHICA = {
  id: 'nch', name: 'Nightmare Chica', rarity: 'rare', where: 'CAMERAS',
  desc: 'A strange noise, and she\'s standing in your office: she has HIDDEN her cupcake on one of the cameras. It\'s small and tucked into the room: find it and click it before time runs out. She blinks when time is nearly up.',
  how: 'wanted her cupcake back',
};
const BABY = {
  id: 'bab', name: 'Circus Baby', rarity: 'rare', where: 'CAMERAS',
  desc: 'Comes from the Funtime Auditorium through the dining area and the West hall, faster than Springtrap. Shock her camera to send her all the way back.',
  how: 'crawled into your office',
  route: ['audit', 'dining', 'whall'],
};

// ----- epic -----
const SBONNIE = {
  id: 'sbn', name: 'Shadow Bonnie', rarity: 'epic', where: 'OFFICE',
  desc: 'Turns the office dark. Hunt for his eyes with the flashlight (never over the vent) and hold the light on them until he\'s gone.',
  how: 'found you in the dark',
};
const PLUSH = {
  id: 'plu', name: 'Plushtrap', rarity: 'epic', where: 'OFFICE',
  desc: 'Giggles, and hides somewhere in your office. The moment the flashlight touches him he\'s gone, but you only have a couple of seconds.',
  how: 'jumped out at you',
};
const FFREDDY = {
  id: 'ffr', name: 'Funtime Freddy', rarity: 'epic', where: 'EITHER DOOR',
  desc: 'Stands on one side of the Funtime Auditorium (CAM 7), and sometimes walks to the other: check which. His lines show as subtitles. "Bon-Bon, go get \'em!" sends him to the door on his side, "Let\'s give him a surprise!" to the other door. Shut it in time.',
};

// ----- legendary -----
const WFREDDY = {
  id: 'wfr', name: 'Withered Freddy', rarity: 'legendary', where: 'EITHER DOOR',
  desc: 'Paces outside between your doors, without a sound. You only see him as he passes the windows. Work out which door he\'s heading for, and shut it when he tries to get in.',
};
const FFOXY = {
  id: 'ffx', name: 'Funtime Foxy', rarity: 'legendary', where: 'CAM 1',
  desc: 'The sign on the show stage (CAM 1) says when the next SHOWTIME is. Be watching CAM 1 at that time.',
  how: 'didn\'t like that you missed the show',
};
const NFREDBEAR = {
  id: 'nfb', name: 'Nightmare Fredbear', rarity: 'legendary', where: 'ANYWHERE',
  desc: 'Comes with one of three attacks. He paces past the windows and then stands in a doorway: flash him there (shutting the door won\'t help). Or he walks into your office: mask on, and keep it on a long time. Or a little Fredbear hides in your office: shine him, fast.',
  how: 'got you',
};

// Every character that can be picked, in roster order (grouped by rarity). The pick screen offers only these.
const ROSTER = [FREDDY, BONNIE, CHICA, TBONNIE, TCHICA, PUPPET, NFREDDY, TRASH, LOLBIT,
  FOXY, GOLDEN, TFREDDY, NBONNIE, BONNET,
  WBONNIE, WFOXY, SPRING, NCHICA, BABY,
  SBONNIE, PLUSH, FFREDDY,
  WFREDDY, FFOXY, NFREDBEAR];
// Find a character by its id, for example byId('fre') is FREDDY.
const byId = id => ROSTER.find(c => c.id === id);
// The two who come through the cameras and are sent back with the shock.
const SHOCKABLE = [SPRING, BABY];

// Funtime Freddy's lines. The two that send him to a door, and the ones that are just talk.
const FFR_SAME_SIDE = 'Bon-Bon, go get \'em!';
const FFR_OTHER_SIDE = 'Let\'s give him a surprise!';
const FFR_TALK = ['Hey there, buddy!', 'Is it time for the show?', 'Bon-Bon, are you there?',
  'Who\'s ready to party?', 'Ha ha ha!', 'Oh, Bon-Bon...', 'Let\'s have some fun!', 'Did you hear that?',
  'Stay right there!', 'What a night!', 'Shhh... listen.', 'Bon-Bon, quiet down!'];

// Where Withered Freddy (and Nightmare Fredbear, when he prowls) can be outside your office, from the
// left door to the right door. They walk back and forth along it; only the windows show them.
const PROWL_PATH = ['L', 'Lwin', 'mid', 'Rwin', 'R'];
// The vent crawlers that climb toward your office.
const CRAWLERS = [TBONNIE, TCHICA];
// A character's points (from its rarity).
const pointsOf = c => RARITIES[c.rarity].points;
