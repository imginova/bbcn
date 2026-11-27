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
  // Update 3.0: two cameras OUTSIDE, in the yards behind the office (each has its own light: yardLit in
  // game.js). They took the place of CAM 9, the kitchen, which moved to the back of the office.
  yardL:  { cam: 9, name: 'LEFT YARD' },
  yardR:  { cam: 10, name: 'RIGHT YARD' },
};
// Which room each number key opens: 1 to 9, then 0 for CAM 10.
const CAM_ORDER = ['stage', 'dining', 'cove', 'whall', 'ehall', 'prize', 'audit', 'parts', 'yardL', 'yardR'];
// The yards, by side, and the side of each yard.
const YARDS = { L: 'yardL', R: 'yardR' };
const yardSide = room => room === 'yardL' ? 'L' : room === 'yardR' ? 'R' : null;
// The ingredients on the shelf at the back of the office, for Cookie Freddy (it was a kitchen camera,
// CAM 9, until update 3.0). Their places in the back picture are KITCHEN_JARS in art.js.
const INGREDIENTS = ['CHOCOLATE', 'SPRINKLES', 'FROSTING', 'CARAMEL'];

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
  // The id stays 'trs' (from when it was "Trash gang"), so kill tallies and saved lineups still match.
  id: 'trs', name: 'Trash and the Gang', rarity: 'common', where: 'CAMERAS',
  desc: 'Bucket Bob, Mr. Can-Do, No. 1 Crate and Pan Stan take turns standing right in front of a camera and hiding most of the picture for a while. They never attack.',
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
// ----- the BONUS characters (the owner's second list: more obscure and gimmicky) -----
// `bonus: true` puts a BONUS tag on their cards. They're dealt like everyone else, by rarity. Claude
// sorted them into rarities (on request: "you can sort all of the characters").
const SALVAGE = {
  id: 'slv', name: 'Salvage sign', rarity: 'common', bonus: true, where: 'SHOCK',
  desc: 'Brings the controlled shock along. Sometimes when you shock, a SALVAGE sign pops up instead: press Shock a few more times, fast, and then it works.',
};
const WMCHICA = {
  id: 'wmc', name: 'Watermelon Chica', rarity: 'uncommon', bonus: true, where: 'EITHER DOOR',
  desc: 'Turns up in a doorway. Shut the door on her and she bounces it back open: shut it 3 times, quickly, and she leaves.',
};
const HANDUNIT = {
  id: 'hnd', name: 'Hand-unit', rarity: 'uncommon', bonus: true, where: 'OFFICE',
  desc: 'His keypad can be in your office when you flip the monitor down. Mash the keyboard (any keys, or tap the keypad) until he glitches out.',
  how: 'had a few words with you',
};
const BOUNCEPOT = {
  id: 'bpt', name: 'Bounce pot', rarity: 'uncommon', bonus: true, where: 'SCREEN',
  desc: 'Bounces across your screen all night. Keep the mouse pointer out of its way: every hit costs power. Never attacks.',
};
const MUNCHIE = {
  id: 'mun', name: 'Munchie', rarity: 'uncommon', bonus: true, where: 'SCREEN',
  desc: 'Grabs onto your screen and covers part of it. Grab it with the mouse and flick it off (let go while you\'re still moving fast), or it gets you.',
  how: 'chewed through your screen',
};
const COOKIE = {
  id: 'ckf', name: 'Cookie Freddy', rarity: 'rare', bonus: true, where: 'OFFICE',
  desc: 'Turns up in your office and says what he wants to be coated with. Turn around and click those ingredients on the shelf at the back before time runs out. The wrong one wastes time.',
  how: 'didn\'t get his coating',
};
const FENDO = {
  id: 'fen', name: 'Flamethrower endo', rarity: 'rare', bonus: true, where: 'OFFICE',
  desc: 'Comes into your office now and then and heats it up fast. While he\'s there the fan can only slow the heat down: keep it on until he leaves.',
  how: 'turned up the heat too far',
};
const PLUSHBABY = {
  id: 'pbb', name: 'Plush babies', rarity: 'epic', bonus: true, where: 'DOORS & WINDOWS',
  desc: 'Little plush babies turn up in the doorways and windows, each on its own timer. Shine each one away. One left too long climbs onto your screen and hides a corner for the rest of the night; the 3rd one on your screen gets you.',
  how: 'covered your screen',
};

// ----- the third list (2026-11-25), also sorted into rarities by Claude -----
const BB = {
  id: 'bb', name: 'BB', rarity: 'uncommon', where: 'VENTS',
  desc: 'Crawls through the vents like the Toys, but you can\'t see him on the vent map: listen for him (lures still work). When he climbs in, mask on until he leaves, or he runs off with your flashlight for the rest of the night.',
  how: 'took your flashlight',
  interval: BB_INTERVAL,
};
const MANGLE = {
  id: 'mgl', name: 'Mangle', rarity: 'rare', where: 'CAMERAS',
  desc: 'Gets onto a camera with a burst of static, and you can\'t see her there. Flip through the cameras and listen: her static is loudest on her camera. Shock it in time.',
  how: 'crawled out of the static',
};
const NBB = {
  id: 'nbb', name: 'Nightmare BB', rarity: 'rare', where: 'OFFICE',
  desc: 'Sits asleep on your office floor. Sometimes he wakes when you flip the monitor down: shine the light on him before you raise it again. But shine him while he\'s asleep and he gets you.',
  how: 'didn\'t like being woken up',
};
const NSTAFFBOT = {
  id: 'nsb', name: 'Nightmare staff bot', rarity: 'uncommon', bonus: true, where: 'EITHER DOOR',
  desc: 'A caution bot stands in your office. When it blinks, look at its arrow and shut that door. Shut both and the staff bot waits behind them, then goes for the first door you open.',
  how: 'clocked in',
};
const GRAVEWEED = {
  id: 'grw', name: 'Grave weed', rarity: 'rare', bonus: true, where: 'SCREEN',
  desc: 'Bounces across your screen all night like Bounce pot, a little slower. Keep the mouse pointer out of its way: one touch and it gets you.',
  how: 'pulled you under',
};

// ----- update 3.0 (2026-11-26), sorted into rarities by Claude. The owner then marked Ghost Freddy,
// Nightmare Helpy, H.E.L.P.I and the two Twisteds as BONUS (they're listed with the bonus ones in ROSTER). -----
const FCHICA = {
  id: 'fch', name: 'Funtime Chica', rarity: 'common', where: 'SHOP',
  desc: 'Makes everything in the shop cost more (death coins and battery packs; not Rockstar Bonnie\'s guitar). Never attacks.',
};
const GFREDDY = {
  id: 'gfr', name: 'Ghost Freddy', rarity: 'common', bonus: true, where: 'SCREEN',
  desc: 'Drifts across your screen now and then. If he touches your mouse pointer, it freezes for a few seconds: no aiming the light and no clicking (keys still work). Never attacks.',
};
const RBONNIE = {
  id: 'rsb', name: 'Rockstar Bonnie', rarity: 'uncommon', where: 'SHOP',
  desc: 'The shopkeeper has his guitar. Save up Fazcoins and buy it back in the SHOP before 6 AM, or he gets you at 5:59.',
  how: 'wanted his guitar back',
};
const NHELPY = {
  id: 'hlp', name: 'Nightmare Helpy', rarity: 'uncommon', bonus: true, where: 'BACK DESK',
  desc: 'When you turn around, he may be sitting on the back desk. Click him again and again, fast, to knock him off.',
  how: 'jumped off the desk',
};
const HELPI = {
  id: 'hpi', name: 'H.E.L.P.I', rarity: 'uncommon', bonus: true, where: 'BACK TABLET',
  desc: 'The tablet on the back desk buzzes with a sum. Turn around, type the answer and press Enter before time runs out.',
  how: 'marked your answer wrong',
};
const TWOLF = {
  id: 'twf', name: 'Twisted Wolf', rarity: 'uncommon', bonus: true, where: 'YARDS',
  desc: 'Hard to see on the yard cameras, but he howls when he reaches a back window: turn around and flash that window.',
  how: 'came through the window',
};
const DREADBEAR = {
  id: 'dbr', name: 'Dreadbear', rarity: 'rare', where: 'YARDS',
  desc: 'Crosses a yard without a sound (watch the yard cameras with their lights on), then stands at that back window: turn around and flash it.',
  how: 'came through the window',
};
const TFOXY = {
  id: 'tfx', name: 'Twisted Foxy', rarity: 'rare', bonus: true, where: 'YARDS',
  desc: 'Shows as a mound in the ground of one yard. When you hear digging he\'s gone from view: light THAT yard\'s camera. Lighting the other yard while he digs gets you.',
  how: 'dug his way in',
};

// Every character that can be picked, in roster order (grouped by rarity, the bonus ones last). The pick
// screen offers only these.
const ROSTER = [FREDDY, BONNIE, CHICA, TBONNIE, TCHICA, PUPPET, NFREDDY, TRASH, LOLBIT, FCHICA,
  FOXY, GOLDEN, TFREDDY, NBONNIE, BONNET, BB, RBONNIE,
  WBONNIE, WFOXY, SPRING, NCHICA, BABY, MANGLE, NBB, DREADBEAR,
  SBONNIE, PLUSH, FFREDDY,
  WFREDDY, FFOXY, NFREDBEAR,
  SALVAGE, WMCHICA, HANDUNIT, BOUNCEPOT, MUNCHIE, COOKIE, FENDO, PLUSHBABY, NSTAFFBOT, GRAVEWEED,
  GFREDDY, NHELPY, HELPI, TWOLF, TFOXY];
// Find a character by its id, for example byId('fre') is FREDDY.
const byId = id => ROSTER.find(c => c.id === id);
// The ones the controlled shock is for (it shows on nights with any of them): Springtrap and Circus Baby
// come through the cameras, and Mangle hides on one.
const SHOCKABLE = [SPRING, BABY, MANGLE];

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
const CRAWLERS = [TBONNIE, TCHICA, BB];
// A character's points (from its rarity).
const pointsOf = c => RARITIES[c.rarity].points;
