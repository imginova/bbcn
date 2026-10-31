/* =====================================================================
   config.js: the numbers you can tweak to change how the game FEELS.

   Nothing here does anything by itself; other files read these values.
   Want longer nights, cheaper doors or a lazier music box? Change a
   number here, save, and reload the page.

   Names in ALL_CAPS are a common way of saying "this is a setting that
   never changes while the game runs".
   ===================================================================== */

// ---------- the clock ----------
const HOUR_SECONDS = 30;   // real seconds per in-game hour (a whole night lasts 3 minutes)
const NIGHT_HOURS = 6;     // 12 AM to 6 AM

// How much faster everyone acts than in the original game, which had 60-second hours.
// Shorter hours mean a faster pace, so a night still holds the same amount of action:
// with 30-second hours PACE is 2, so the shapes move twice as often and the music box
// unwinds twice as fast. data.js and boxDrain() below use it.
const PACE = 60 / HOUR_SECONDS;

// ---------- power ----------
const BASE_DRAIN = 0;      // % power per second with nothing switched on (idle costs nothing)
const UNIT_DRAIN = 0.40;   // % per second for EACH closed door, door light or the raised camera
                           // (both doors + camera = 1.20% per second)

// ---------- difficulty levels (custom night) ----------
const MIN_LEVEL = 0;       // level 0 switches a threat off for the night: it never moves, unwinds or wakes
const MAX_LEVEL = 20;

// Keeps any number inside 0..20 and makes it a whole number.
// Used whenever we load or change a level, so a bad value can never sneak in.
const clampLevel = n => Math.max(MIN_LEVEL, Math.min(MAX_LEVEL, Math.round(Number(n) || MIN_LEVEL)));

// Seconds you get to shut the door once a shape is in the doorway.
// This is a straight line: 4.0s at level 1, sliding down to 2.4s at level 20.
// (level - 1) goes from 0 to 19, so (level - 1) * (1.6 / 19) goes from 0 to 1.6.
const reactWindow = level => 4.0 - (level - 1) * (1.6 / 19);

// ---------- Lenny's music box ----------
// How many % the box unwinds per second, before PACE: 0.6 at level 1, up to 4.0 at level 20.
// Multiplied by PACE (2) and by 0.75 (to make Lenny a bit easier), that's 0.9 at level 1
// (about 110s from full) up to 6.0 at level 20 (about 17s from full).
const boxDrain = level => (0.6 + (level - 1) * (3.4 / 19)) * PACE * 0.75;
const WIND_RATE = 50;      // % wound back per second while you hold W (empty to full in 2 seconds)
const BOX_LOW = 30;        // below this %, the camera button and CAM 7 start warning you
const LENNY_DELAY = 4.5;   // seconds between the box running out and Lenny getting you

// ---------- ■ Square and the door lights ----------
// Seconds of steady light needed to push the square back ONE stage; keep holding to push it further.
// 0.5s at level 1, up to 1.0s at level 20 (harder squares are more stubborn).
const lightPush = level => 0.5 + (level - 1) * (0.5 / 19);
const SQUARE_SWAP = 0.5;   // chance that a square at FAR switches doors instead of coming closer

// ---------- (: Smiley ----------
// Chance that lowering the camera wakes Smiley: 2.5% at level 1, up to 50% at level 20.
const smileyChance = level => level / MAX_LEVEL * 0.5;
// Seconds you get to find and click it: 6.25s at level 1, down to about 3.1s at level 20.
// (It was 5 to 2.5; everything was multiplied by 1.25 to make Smiley a bit easier, still level-based.)
const smileyTime = level => (5 - (level - 1) * (2.5 / 19)) * 1.25;

// ---------- modifiers ----------
// Ticking a threat's modifier on the custom night screen adds this much to the night's score
// (only if that threat's level is above 0, since a switched-off threat's modifier does nothing).
const MOD_BONUS = 5;
const TRICK_CHANCE = 0.35;  // ▲ Trickster: chance, on each of its movement ticks, to fake its doorway sound
const BOLD_SHUT = 2;        // ■ Bold: seconds its door must stay shut to drive a close square back to far
const WANDER_TIME = 25;     // Lenny Wanderer: about how many seconds between the box's moves
const LURK_EVERY = 4;       // ● Patient: seconds between the soft growls while it waits behind a door
