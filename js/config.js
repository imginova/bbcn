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
// This is a straight line: 4.0s at level 1, sliding down to 2.9s at level 20.
// (level - 1) goes from 0 to 19, so (level - 1) * (1.1 / 19) goes from 0 to 1.1.
// (Level 20 used to give only 2.4s; it was eased, with the other level-20 numbers below marked
// "eased", so a bot could beat Total Nightmare about 1 night in 10 instead of never.)
const reactWindow = level => 4.0 - (level - 1) * (1.1 / 19);

// The orb never visits the same door more than this many times in a row (see chooseRoute in game.js).
// Pure coin flips made some nights feel like it only ever went right.
const MAX_STREAK = 2;

// ---------- Lenny's music box ----------
// How many % the box unwinds per second, before PACE: 0.6 at level 1, up to 2.0 at level 20.
// Multiplied by PACE (2) and by 0.75 (to make Lenny a bit easier), that's 0.9 at level 1
// (about 110s from full) up to 3.0 at level 20 (about 33s from full).
// (Eased: level 20 used to unwind twice as fast, emptying in about 17s.)
const boxDrain = level => (0.6 + (level - 1) * (1.4 / 19)) * PACE * 0.75;
const WIND_RATE = 50;      // % wound back per second while you hold W (empty to full in 2 seconds)
const BOX_LOW = 30;        // below this %, the camera button starts warning you (without saying which camera)
const LENNY_DELAY = 4.5;   // seconds between the box running out and Lenny getting you

// ---------- ■ Square and the door lights ----------
// Seconds of steady light needed to push the square back ONE stage; keep holding to push it further.
// 0.5s at level 1, up to 0.8s at level 20 (harder squares are more stubborn; eased from 1.0s).
const lightPush = level => 0.5 + (level - 1) * (0.3 / 19);
const SQUARE_SWAP = 0.5;   // chance that a square at FAR switches doors instead of coming closer

// ---------- (: Smiley ----------
// Chance that lowering the camera wakes Smiley: 2.5% at level 1, up to 50% at level 20.
const smileyChance = level => level / MAX_LEVEL * 0.5;
// It can also wake up on its own: every SMILEY_TICK seconds it gets smileyChance x SMILEY_SOLO
// (so 25% every 10 seconds at level 20, about 1% at level 1).
const SMILEY_TICK = 10;
const SMILEY_SOLO = 0.5;
// Seconds you get to find and click it: 6.25s at level 1, down to about 3.1s at level 20.
// (It was 5 to 2.5; everything was multiplied by 1.25 to make Smiley a bit easier, still level-based.)
const smileyTime = level => (5 - (level - 1) * (2.5 / 19)) * 1.25;

// ---------- Ж Crawler, ¤ Flicker, Ψ Visitor ----------
// (The Visitor gives you reactWindow(level) seconds to get the mask on, like the doors.)
// Ж seconds to click the Crawler once it's in your office: the reaction window plus 2.5s, because you
// may have to lower the camera first. (Eased: it used to be just the reaction window, and it was the
// bot's deadliest threat on Total Nightmare.)
const crawlerWindow = level => reactWindow(level) + 2.5;
// Ж Vent crawl: the chance it climbs into the vents when it leaves CAM 2 (otherwise east or west hall),
// and how many times as often it moves while in there. The vent way is 8 moves instead of 3, so it
// moves 3 times as often to take about as long as the halls.
const CRAWL_VENT_CHANCE = 1 / 3;
const CRAWL_VENT_RATE = 3;
const FLASH_TIME = 0.4;    // ¤ seconds of steady light that make the Flicker jump doors (or leave)
// ¤ seconds to flash the Flicker before it gets you: a bit longer than a door's reaction window,
// because you may need to lower the camera and open the door first.
const flickerWindow = level => reactWindow(level) + 1.5;
const MASK_HOLD = 2.0;     // Ψ seconds the mask must stay on before the Visitor leaves (eased from 2.5)
// Ψ its appearance timer: a random wait between `shortest` and 1.8 times that. The shortest wait is
// 30s at level 1, down to 12s at level 20 (so level 20 waits 12 to about 22 seconds between visits;
// eased from 8 to 14).
const visitorWait = level => {
  const shortest = 30 - (level - 1) * (18 / 19);
  return shortest + Math.random() * shortest * 0.8;
};

// ---------- Ξ Echo, § Slink and the vents ----------
const LURE_COOLDOWN = 2.0; // seconds before you can play another audio lure (lures cost no power)
const LURE_SHOW = 0.8;     // seconds a lured vent room stays highlighted on the map
// Ξ Echo hears a lure up to this many vent rooms away (counting steps through the vents) and goes
// straight there. It was 1 (its own room or the next one); 2 on request, when Echo was made faster.
const ECHO_HEAR = 2;
// Seconds a crawler always waits in V15, the last vent (after the loud bang), before its next move can take it into
// your office: the reaction window plus 2s, since you may need to open the VENTS tab first.
// (Added to ease the vents: without it, an unlucky roll could come right after the bang.)
const ventWindow = level => reactWindow(level) + 2.0;
// Ξ Roamer: the chance that Echo, starting out from V1, climbs out into the building and runs the halls
// to a door instead of crawling the vents (like Ж's Vent crawl the other way round).
const ECHO_HALL_CHANCE = 1 / 3;
const SLINK_SKITTISH = 2; // § Skittish: a lure this many vents away from Slink startles it too (it replaced Quick, which made it
                          // faster while you weren't watching the VENTS tab, on request)

// ---------- ¥ Peeker ----------
// It can turn up while the monitor is up, so it gives you half a second more than the doors do.
const peekWindow = level => reactWindow(level) + 0.5;
const PEEK_HOLD = 1.0;     // seconds of mask that send it away (Ψ needs MASK_HOLD, twice as long)
const PEEK_DOOR_CHANCE = 0.5;   // ¥ Knock knock: the chance a visit is at a door instead (shut it in peekWindow)
// Its appearance timer: a random wait between `shortest` and 1.8 times that.
// The shortest wait is 24s at level 1, down to 12s at level 20.
const peekerWait = level => {
  const shortest = 24 - (level - 1) * (12 / 19);
  return shortest + Math.random() * shortest * 0.8;
};

// ---------- © Spammer ----------
const ADS_MAX = 4;         // this many ads open at once crashes the system (and gets you)

// ---------- modes (see MODES in data.js) ----------
// Generator mode starts at 0% power. The threats stay still for the first GEN_QUIET seconds while you
// charge, and everything costs GEN_COST times as much power as usual: 1.25, so Generator nights
// drain MORE than the other modes (on request; it was half, then 0.65, both cheaper than normal).
// (For a while, beating a threat also gave 3% power back; removed on request.)
const GEN_QUIET = 10;   // seconds of quiet start (was 30; 10 on request)
const GEN_COST = 1.25;
const GEN_RATE = 2;        // Generator mode: % power gained per second while you hold the generator (was 5, then 1; 2 on request so Absolute Nightmare (Generator) can be beaten)
const TASK_COUNT = 4;      // Tasks mode: how many tasks a night has (was 8, then 6; 4 so Absolute Nightmare (Tasks) can be beaten)
// Tasks mode: seconds of work one task needs (on the TASKS tab): a random 4 to 6, so all of them take
// about 20 seconds of monitor time. (Was 4-8, then 8-14; shortened so Absolute Nightmare (Tasks) can be beaten.)
const taskTime = () => 4 + Math.random() * 2;

// ---------- modifiers ----------
// Ticking a threat's modifier on the custom night screen adds this much to the night's score
// (only if that threat's level is above 0, since a switched-off threat's modifier does nothing).
const MOD_BONUS = 5;
const TRICK_CHANCE = 0.5;   // ▲ Trickster: chance, on each of its movement ticks WHILE THE CAMERA IS UP, to fake its doorway sound
const DOUBLE_TAKE = 0.5;    // Ψ Double take: chance that its first exit each visit is a fake
const RETURN_DELAY = 1;     // Ψ Double take: seconds after a fake exit before it's back
const WANDER_TIME = 25;     // Lenny Wanderer: about how many seconds between the box's moves
const LURK_EVERY = 4;       // ● Patient: seconds between the soft growls while it waits behind a door
const PATIENT_WAIT = 2;     // ● Patient: seconds it must wait behind the door (until its first growl) before
                            // open-and-slam sends it away. Open sooner and it just waits again.
