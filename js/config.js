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
// This is a straight line: 4.0s at level 1, sliding down to 3.2s at level 20.
// (level - 1) goes from 0 to 19, so (level - 1) * (0.8 / 19) goes from 0 to 0.8.
// (Level 20 used to give only 2.4s; it was eased, with the other level-20 numbers below marked
// "eased", so a bot could beat Total Nightmare about 1 night in 10 instead of never.)
// (Eased again to 3.2s, with the other numbers marked "eased for Absolute Nightmare", so a bot can beat
// Absolute Nightmare, all thirteen at 20 with every modifier, a few times in 500.)
const reactWindow = level => 4.0 - (level - 1) * (0.8 / 19);

// The orb never visits the same door more than this many times in a row (see chooseRoute in game.js).
// Pure coin flips made some nights feel like it only ever went right.
const MAX_STREAK = 2;

// ---------- Lenny's music box ----------
// How many % the box unwinds per second, before PACE: 0.6 at level 1, up to 1.1 at level 20.
// Multiplied by PACE (2) and by 0.75 (to make Lenny a bit easier), that's 0.9 at level 1
// (about 110s from full) up to 1.65 at level 20 (about 60s from full).
// (Eased twice: level 20 used to empty in about 17s, then 33s; eased for Absolute Nightmare.)
const boxDrain = level => (0.6 + (level - 1) * (0.5 / 19)) * PACE * 0.75;
const WIND_RATE = 50;      // % wound back per second while you hold W (empty to full in 2 seconds)
const BOX_LOW = 30;        // below this %, the camera button starts warning you (without saying which camera)
const LENNY_DELAY = 4.5;   // seconds between the box running out and Lenny getting you

// ---------- ■ Square and the door lights ----------
// Seconds of steady light needed to push the square back ONE stage; keep holding to push it further.
// 0.5s at level 1, up to 0.6s at level 20 (harder squares are a bit more stubborn; eased from 1.0s,
// then 0.8s, eased for Absolute Nightmare).
const lightPush = level => 0.5 + (level - 1) * (0.1 / 19);
const SQUARE_SWAP = 0.5;   // chance that a square at FAR switches doors instead of coming closer

// ---------- (: Smiley ----------
// Chance that lowering the camera wakes Smiley: 2.5% at level 1, up to 50% at level 20.
const smileyChance = level => level / MAX_LEVEL * 0.5;
// It can also wake up on its own: every SMILEY_TICK seconds it gets smileyChance x SMILEY_SOLO
// (so 25% every 10 seconds at level 20, about 1% at level 1).
const SMILEY_TICK = 10;
const SMILEY_SOLO = 0.5;
// Seconds you get to find and click it: 6.25s at level 1, down to about 4.4s at level 20.
// (It was 5 to 2.5; everything was multiplied by 1.25 to make Smiley a bit easier, still level-based.
// Level 20 was 3.1s until it was eased for Absolute Nightmare.)
const smileyTime = level => (5 - (level - 1) * (1.5 / 19)) * 1.25;

// ---------- Ж Crawler, ¤ Flicker, Ψ Visitor ----------
// (The Visitor gives you reactWindow(level) seconds to get the mask on, like the doors.)
// Ж seconds to click the Crawler once it's in your office: the reaction window plus 2.5s, because you
// may have to lower the camera first, and with its Stubborn modifier it takes two clicks. (Eased: it
// used to be just the reaction window, and it was the bot's deadliest threat on Total Nightmare.)
const crawlerWindow = level => reactWindow(level) + 2.5;
const FLASH_TIME = 0.4;    // ¤ seconds of steady light that make the Flicker jump doors (or leave)
// ¤ seconds to flash the Flicker before it gets you: a bit longer than a door's reaction window,
// because you may need to lower the camera and open the door first.
const flickerWindow = level => reactWindow(level) + 1.5;
const MASK_HOLD = 2.0;     // Ψ seconds the mask must stay on before the Visitor leaves (eased from 2.5)
// Ψ its appearance timer: a random wait between `shortest` and 1.8 times that. The shortest wait is
// 30s at level 1, down to 18s at level 20 (so level 20 waits 18 to about 32 seconds between visits;
// eased from 8-14, then 12-22, then for Absolute Nightmare).
const visitorWait = level => {
  const shortest = 30 - (level - 1) * (12 / 19);
  return shortest + Math.random() * shortest * 0.8;
};

// ---------- Ξ Echo, § Slink and the vents ----------
const LURE_COOLDOWN = 2.0; // seconds before you can play another audio lure (lures cost no power)
const LURE_SHOW = 0.8;     // seconds a lured vent room stays highlighted on the map
// Seconds a crawler always waits in V6 (after the loud bang) before its next move can take it into
// your office: the reaction window plus 2s, since you may need to open the VENTS tab first.
// (Added to ease the vents: without it, an unlucky roll could come right after the bang.)
const ventWindow = level => reactWindow(level) + 2.0;
const QUICK_RATE = 1.25;   // § Quick: how much faster Slink moves while you're not on the VENTS tab (was 2, then 1.5)

// ---------- ¥ Peeker ----------
// It can turn up while the monitor is up, so it gives you half a second more than the doors do.
const peekWindow = level => reactWindow(level) + 0.5;
const PEEK_HOLD = 1.0;     // seconds of mask that send it away (Ψ needs MASK_HOLD, twice as long)
const PEEK_RETURN = 1.5;   // ¥ Double: seconds after leaving before it's back once more
// Its appearance timer: a random wait between `shortest` and 1.8 times that.
// The shortest wait is 24s at level 1, down to 16s at level 20 (eased for Absolute Nightmare from 12s).
const peekerWait = level => {
  const shortest = 24 - (level - 1) * (8 / 19);
  return shortest + Math.random() * shortest * 0.8;
};

// ---------- © Spammer ----------
const ADS_MAX = 4;         // this many ads open at once crashes the system (and gets you)

// ---------- modes (see MODES in data.js) ----------
const GEN_RATE = 1;        // Generator mode: % power gained per second while you hold the generator (was 5, slowed on request)
const TASK_COUNT = 6;      // Tasks mode: how many tasks a night has (was 8, eased for Absolute Nightmare)
// Tasks mode: seconds of work one task needs (on the TASKS tab): a random 8 to 14, so all of them
// take about a minute of monitor time, and a whole night about two minutes.
const taskTime = () => 8 + Math.random() * 6;

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
