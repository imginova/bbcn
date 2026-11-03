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
// Everything that uses power drains the same amount (on request): the monitor, each closed door,
// the flashlight and the fan each cost 0.5% per second while in use. The mask is free.
const UNIT_DRAIN = 0.5;
const POWER_OUT_WAIT = [5, 13];   // seconds of darkness after a power-out before something gets you

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
// It lights up a patch around the mouse pointer and "flashes" whatever is inside it.
// The patch is measured in characters of the ASCII picture: BEAM_COLS across and BEAM_ROWS up/down
// from the pointer (a character is about twice as tall as it is wide, so fewer rows than columns).
const BEAM_COLS = 5;
const BEAM_ROWS = 2.5;

// ---------- Freddy ----------
const FREDDY_INTERVAL = 6;   // seconds between his chances to move (and laugh)
const FREDDY_LAUGHS = 3;     // the 3rd laugh means he's at the right door

// ---------- Bonnie ----------
const BONNIE_INTERVAL = 5;   // seconds between his chances to move a room closer

// ---------- Golden Freddy ----------
// The chance he's sitting in your office when you flip the monitor down, and how long you get
// to tap the mask on.
const goldenChance = level => byLevel(level, 0.03, 0.35);
const goldenWindow = level => byLevel(level, 2.0, 1.2);

// ---------- Phantom Chica ----------
// The chance she shows up when you flip the monitor down (every flip at level 20, on request),
// how many shadow cupcakes you must click (1, 2 or 3 by level), how long you have, and what
// failing costs you: a jumpscare and 10% of your power (not the night).
const chicaChance = level => level / 20;
const cupcakeCount = level => level <= 7 ? 1 : level <= 14 ? 2 : 3;
const chicaTime = level => byLevel(level, 6, 3.5);
const CHICA_COST = 10;

// ---------- Bonnet ----------
// Seconds between her runs (a random time in this range), how long a run across the office takes,
// and how fast she dodges away from your mouse pointer (in characters per second).
// She dodges, but slower than a person can move a mouse, so you can always catch her.
const bonnetWait = level => rand(byLevel(level, 45, 14), byLevel(level, 70, 24));
const bonnetTime = level => byLevel(level, 7, 4);
const BONNET_DODGE = 7;

// ---------- Withered Bonnie ----------
// His appearance timer is a random time in this range. With the monitor up the timer keeps
// counting but can't reach 0: he only appears once you flip it down.
const witheredWait = level => rand(byLevel(level, 30, 12), byLevel(level, 54, 22));
const MASK_HOLD = 2.0;       // seconds of mask that send him away (taking it off early restarts it)

// ---------- the Puppet's music box ----------
// % per second the box unwinds: 0.8 at level 1 (about 2 minutes from full) up to 3.2 at level 20
// (about 31 seconds). Each tap of Wind adds WIND_TAP %.
const boxDrain = level => byLevel(level, 0.8, 3.2);
const WIND_TAP = 25;
const BOX_LOW = 35;          // below this, the warning symbol shows and a chime plays
const PUPPET_DELAY = 4.5;    // seconds from the box running out to the Puppet getting you

// ---------- the Nightmare staff bot ----------
// Seconds between its warnings, and how long you get to shut the door its arrow points to
// (a second more than usual, so you have time to look at the arrow).
const staffWait = level => rand(byLevel(level, 40, 12), byLevel(level, 60, 20));
const staffWindow = level => reactWindow(level) + 1;
const BLINK_EVERY = 0.5;     // seconds between its blinking beeps

// ---------- Nightmare Freddy ----------
// Seconds between new Freddles on the desk, how long the light must stay on one to send it off,
// how long all 3 can sit there before he comes, and how long he stays (keep the mask on!).
const freddleWait = level => byLevel(level, 24, 7) * rand(0.7, 1.3);
const FREDDLE_SHINE = 0.5;
const nightmareArrive = level => byLevel(level, 8, 4);
const NIGHTMARE_HOLD = 5;

// ---------- Withered Foxy ----------
const FOXY_INTERVAL = 5;     // seconds between his chances to get ready in Pirate Cove
const FOXY_RUN = 2.5;        // seconds from leaving the cove to reaching the left door
const FOXY_WAIT = [3, 6];    // seconds he waits behind the shut door before the stomp
const FOXY_FLASH = 0.4;      // seconds of steady light it takes to flash him
const STOMP_EVERY = 3;       // seconds between stomps while he waits for you

// ---------- Sleepy Moon ----------
// % per second the sleep meter fills while the monitor is down and the flashlight is off
// (from empty to asleep: about 60 s at level 1, 12 s at level 20), and how fast the flashlight
// or the monitor wakes you back up.
const moonRate = level => byLevel(level, 1.6, 8);
const MOON_WAKE = 30;

// ---------- the Flamethrower endo ----------
// Seconds between visits, how long a visit lasts, and how fast the office heats up while he's
// there (% per second). The fan slows the heat to FAN_SLOW of that, but doesn't stop it.
// Once he's gone, the office cools down (faster with the fan on).
const endoWait = level => rand(byLevel(level, 60, 20), byLevel(level, 90, 35));
const endoStay = level => byLevel(level, 10, 16);
const endoHeat = level => byLevel(level, 5, 11);
const FAN_SLOW = 0.25;
const COOL_RATE = 3;
const FAN_COOL = 6;
