/* =====================================================================
   config.js: the numbers you can tweak to change how the game FEELS.

   Nothing here does anything by itself; other files read these values.
   Want longer nights, cheaper doors or a lazier music box? Change a
   number here, save, and reload the page.

   Names in ALL_CAPS are a common way of saying "this is a setting that
   never changes while the game runs".
   ===================================================================== */

// ---------- the clock ----------
const HOUR_SECONDS = 60;   // real seconds per in-game hour
const NIGHT_HOURS = 6;     // 12 AM to 6 AM

// ---------- power ----------
const BASE_DRAIN = 0;      // % power per second with nothing switched on (idle costs nothing)
const UNIT_DRAIN = 0.20;   // % per second for EACH closed door or the raised camera
                           // (both doors + camera = 0.60% per second)

// ---------- difficulty levels (custom night) ----------
const MIN_LEVEL = 1;
const MAX_LEVEL = 20;

// Keeps any number inside 1..20 and makes it a whole number.
// Used whenever we load or change a level, so a bad value can never sneak in.
const clampLevel = n => Math.max(MIN_LEVEL, Math.min(MAX_LEVEL, Math.round(Number(n) || MIN_LEVEL)));

// Seconds you get to shut the door once a shape is in the doorway.
// This is a straight line: 2.6s at level 1, sliding down to 1.4s at level 20.
// (level - 1) goes from 0 to 19, so (level - 1) * (1.2 / 19) goes from 0 to 1.2.
const reactWindow = level => 2.6 - (level - 1) * (1.2 / 19);

// ---------- Lenny's music box ----------
// How many % the box unwinds per second: 0.6 at level 1 (about 165s from full),
// up to 4.0 at level 20 (about 25s from full).
const boxDrain = level => 0.6 + (level - 1) * (3.4 / 19);
const WIND_RATE = 25;      // % wound back per second while you hold W
const BOX_LOW = 30;        // below this %, the camera button and CAM 7 start warning you
const LENNY_DELAY = 4.5;   // seconds between the box running out and Lenny getting you
