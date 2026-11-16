/* =====================================================================
   config.js: the numbers you can tweak to change how the game FEELS.

   Nothing here does anything by itself; other files read these values.
   Want longer nights, cheaper doors or a lazier music box? Change a
   number here, save, and reload the page.

   Names in ALL_CAPS are a common way of saying "this is a setting that
   never changes while the game runs". Settings that depend on a
   character's level are small functions: byLevel(level, at1, at20)
   (in helpers.js) slides from the level-1 value to the level-20 value.
   ===================================================================== */

// ---------- the clock ----------
const HOUR_SECONDS = 30;   // real seconds per in-game hour (a whole night lasts 3 minutes)
const NIGHT_HOURS = 6;     // 12 AM to 6 AM

// ---------- power ----------
// The monitor, each closed door and the flashlight each cost this much per second while in use.
// The mask and the audio lures are free.
const UNIT_DRAIN = 0.45;
const POWER_OUT_WAIT = [5, 13];   // seconds of darkness after a power-out before Freddy gets you

// ---------- difficulty levels (custom night) ----------
const MIN_LEVEL = 0;       // level 0 switches a character off for the night
const MAX_LEVEL = 20;

// Keeps any number inside 0..20 and makes it a whole number.
// Used whenever we load or change a level, so a bad value can never sneak in.
const clampLevel = n => Math.max(MIN_LEVEL, Math.min(MAX_LEVEL, Math.round(Number(n) || MIN_LEVEL)));

// A character at level L gets a chance to act every so often, and each chance works L times in 20.
const moveChance = level => level / 20;

// Seconds you get to react once something is at your door or in your office
// (shut the door, put on the mask...): 4.0 s at level 1 down to 2.9 s at level 20.
const reactWindow = level => byLevel(level, 4.0, 2.9);

// ---------- the flashlight ----------
// It lights up a patch around the mouse pointer and "flashes" whatever is inside it, in the office
// and on the cameras. The patch is measured in characters of the ASCII picture: BEAM_COLS across and
// BEAM_ROWS up/down from the pointer (a character is about twice as tall as wide, so fewer rows).
const BEAM_COLS = 5;
const BEAM_ROWS = 2.5;

// ---------- Freddy ----------
const FREDDY_INTERVAL = 6;   // seconds between his chances to move (and laugh)
const FREDDY_STEPS = 3;      // the 3rd laugh means he's at the door he laughed from

// ---------- Bonnie and Chica ----------
const BONNIE_INTERVAL = 5;   // seconds between their chances to move a room closer
const CHICA_INTERVAL = 6;    // (Chica's route is a room shorter, so she moves a little less often)

// ---------- Foxy ----------
const FOXY_INTERVAL = 5;     // seconds between his chances to get ready in Pirate Cove
const FOXY_STAGES = 3;       // after his 3rd step he runs: 1 peeking, 2 half out, 3 gone
const FOXY_RUN = 3;          // seconds from leaving the cove to reaching the left door
const FOXY_FLASH = 0.4;      // seconds of steady light on the cove that push him back one stage
const FOXY_COST = 6;         // % power he knocks off when he bangs on the shut left door

// ---------- Golden Freddy ----------
// The chance he's in your office when you flip the monitor down: level / 20, so every time at
// level 20 (on request). One tap of the mask in time sends him away.
const goldenChance = level => level / 20;
const goldenWindow = level => byLevel(level, 2.0, 1.2);

// ---------- Toy Freddy ----------
// His appearance timer (a random time in this range) only counts down while the monitor is DOWN.
// Then mask on in time, and keep it on for MASK_HOLD seconds.
const toyFreddyWait = level => rand(byLevel(level, 35, 14), byLevel(level, 55, 24));
const MASK_HOLD = 2.0;

// ---------- the vents ----------
// 15 vent rooms in 3 rows of 5 (see the vents in data.js). Everyone starts in V1 and climbs toward
// V15, the vent that opens into your office.
// Seconds between each vent crawler's chances to move one vent closer:
const TOY_BONNIE_INTERVAL = 3;     // fast
const TOY_CHICA_INTERVAL = 5;      // medium
const BB_INTERVAL = 4.5;
const SPRINGTRAP_INTERVAL = 8;     // slow
// How easily each one is fooled by an audio lure (the chance it follows one): 0 never, 1 always.
// Each went down by 0.1 when the vents grew to 15 (on request: the longer way in gives you more time,
// so lures got a little weaker). They were 0.9, 0.45, 0.45 and 0.95.
// Later Toy Bonnie and Toy Chica got a lot harder to fool (on request): they were 0.8 and 0.35.
const LURE_FOOLED = { tbn: 0.5, tch: 0.15, bb: 0.35, spr: 0.85 };
const LURE_REACH = 1;        // a lure works on crawlers in that vent or one vent away
const LURE_STALL = 2;        // a fooled crawler skips this many of its move chances
const LURE_COOLDOWN = 2;     // seconds before you can play another lure
const LURE_SHOW = 1.5;       // seconds the lure shows on the vent map
const VENT_EXIT_WAIT = 2.5;  // a crawler waits at least this long in V15 before climbing in (lure it back!)
const VENT_HOLD = 3;         // seconds of mask before a vent visitor makes a sound and leaves

// ---------- Freddy Endo ----------
// He wanders the vents and never attacks; you can't play a lure in the vent he's in.
// Seconds between his moves (he moves more at higher levels).
const endoMove = level => byLevel(level, 9, 3) * rand(0.7, 1.3);
// He goes wherever he likes (on request): each move he may stay put, or go to any vent up to
// ENDO_REACH moves away, in any direction. Lures never move him.
const ENDO_STAY = 0.2;       // the chance he stays where he is on a move
const ENDO_REACH = 2;

// ---------- Mangle ----------
// Seconds between visits, how long you have to flash Mangle at each spot before they get you, how
// many flashes send them away, and how long each flash must last (steady light on them).
const mangleWait = level => rand(byLevel(level, 45, 14), byLevel(level, 70, 24));
const mangleSpotTime = level => byLevel(level, 4.5, 2.5);
const MANGLE_FLASHES = 3;
const MANGLE_SHINE = 0.25;

// ---------- the Puppet's music box ----------
// % per second the box unwinds: 1.0 at level 1 (100 s from full) up to 4.0 at level 20 (25 s).
// One click of Wind fills it all the way.
const boxDrain = level => byLevel(level, 1.0, 4.0);
const BOX_LOW = 35;          // below this, the warning symbol shows and a chime plays
const PUPPET_DELAY = 4.5;    // seconds from the box running out to the Puppet getting you

// ---------- Toy cupcake ----------
// Seconds between cupcakes, and how long you have to tap one (it blinks and beeps until you do).
const cupcakeWait = level => rand(byLevel(level, 40, 12), byLevel(level, 60, 22));
const cupcakeTime = level => byLevel(level, 5, 2.5);
const CUP_BEEP = 0.5;        // seconds between its beeps
const CUP_EXTRA = 1;        // extra seconds when it pops up while the monitor is up (you have to flip it down)

// ---------- Shadow Freddy ----------
// Seconds between visits, how long he sits on a camera before he gets you, and how long the
// flashlight has to stay on him.
const shadowFreddyWait = level => rand(byLevel(level, 45, 15), byLevel(level, 70, 25));
const shadowFreddyTime = level => byLevel(level, 15, 8);
const SFR_FLASH = 0.4;

// ---------- Shadow Bonnie ----------
// Seconds between blackouts, how long you have to find his eyes, and how long the light must stay on them.
const shadowBonnieWait = level => rand(byLevel(level, 50, 18), byLevel(level, 75, 28));
const shadowBonnieTime = level => byLevel(level, 12, 6);
const SBN_SHINE = 0.8;

// ---------- the Crying Child ----------
// Seconds between his moves to another camera (only while the monitor is down), how many seconds
// you can watch his camera before he gets you, and how fast that count goes back down when you look away.
const childMove = level => rand(byLevel(level, 22, 8), byLevel(level, 32, 14));
const childStare = level => byLevel(level, 6, 2.5);
const CHILD_COOL = 0.5;
