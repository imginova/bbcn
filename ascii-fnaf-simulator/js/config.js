/* =====================================================================
   config.js: the TUNING numbers (how fast, how long, how strong).

   Most balance changes happen in this file. Nothing here runs by
   itself: the other files read these values.

   Two kinds of "level" show up below:
     - the GUARD'S SKILL (0 to 20): how quickly and how well the
       computer-controlled night guard notices and reacts. 0 means the
       guard never notices anything.
     - a CREW LEVEL (1 to 20) for each animatronic you control, only
       changeable on the custom night. Story nights use level 10.
   byLevel(level, at1, at20) (in helpers.js) slides a number in a
   straight line from its level-1 value to its level-20 value.
   ===================================================================== */

// ---------- the night ----------
const HOUR_SECONDS = 30;   // real seconds per in-game hour (the custom night can change it)
const NIGHT_HOURS = 6;     // 12 AM to 6 AM

// ---------- the guard's power ----------
// Percent per second. The guard pays for everything it uses; you pay nothing.
const BASE_DRAIN = 0.05;   // the office lights, always on
const CAM_DRAIN = 0.25;    // while the guard's monitor is up (watching cameras or winding the music box)
const DOOR_DRAIN = 0.3;    // each shut door, and the shut vent door
const LIGHT_DRAIN = 0.4;   // while a door light is on
const FLASH_COST = 0.6;    // one flashlight flash (all at once)
const SHOCK_COST = 1.5;    // one controlled shock (all at once)
const POWER_OUT_WIN = 4;   // seconds after the guard's power runs out until your crew walks in

// ---------- attacks ----------
const BONK_STUN = 5;        // seconds an animatronic can't do anything after being blocked and sent home
const FOXY_BONK_POWER = 6;  // Foxy banging on a shut door knocks this much % off the guard's power
const LOWER_CAM = 0.3;      // extra seconds the guard needs to put the monitor down before it can react
const KNOCK_TIME = 0.8;     // attacking a door that's ALREADY shut: you're sent home after this long

// ---------- the guard's tools ----------
const MASK_HOLD = 1.2;        // how long the guard keeps the mask on once it's used it
const LURE_COOLDOWN = 9;      // seconds between audio lures
const SHOCK_COOLDOWN = 11;    // seconds between controlled shocks
const SHOCK_STUN = 6;         // how long a shock freezes everyone in that room
const HIDE_COOLDOWN = 16;     // seconds between hides (Gregory's trick)
const DUCK_COOLDOWN = 40;     // every guard's last resort when nothing else works: a duck under the desk, this rarely
const SAVE_SKILL = 8;         // guards this sharp or sharper save power when they're running low (savingPower)
const HIDE_TIME = 2.5;        // how long a hide lasts
const LIGHT_TIME = 0.6;       // how long one look with a door light lasts
const REBOOT_TIME = 3.5;      // how long rebooting broken cameras takes
const WIND_RATE = 35;         // % per second the guard winds the music box

// ---------- your crew's tricks ----------
const BOX_DRAIN = 2.0;        // % per second the music box unwinds (at crew level 10)
const PUPPET_DELAY = 4;       // seconds from an empty music box until the Puppet gets the guard
const UNWIND = 30;            // % the Puppet's "Unwind" takes off the box
const STATIC_TIME = 8;        // Bonnie's static on his camera
const CLATTER_TIME = 3;       // Chica's racket keeps the guard listening to the kitchen this long
const SCRAMBLE_TIME = 6;      // Mangle's radio static on every camera
const LIGHTS_OUT_TIME = 3;    // Toy Chica turns off the guard's lights and flashlight this long
const DISTRACT_TIME = 2.5;    // Balloon Boy's "Hi!": the guard notices nothing for this long
const STUN_TIME = 2.5;        // Phantom BB's jumpscare freezes the guard this long
const SHRUG_TIME = 5;         // Springtrap ignores audio lures this long
const SHOWTIME_TIME = 10;     // Circus Baby's Showtime: everyone else moves twice as often
const WALTZ_TIME = 10;        // Ballora's Waltz: everyone else is quieter (not Ballora herself: alone she won too often)
const WALTZ_STEALTH = 0.2;    // how much quieter (it was 0.3: Ballora alone won too often)
const LAUGH_POWER = 4;        // Freddy's laugh drains this much % from the guard
const FOXY_STAGES = 3;        // Foxy must reach stage 3 before he can sprint
const LURCH = 0.7;            // Withered Freddy's Lurch: his next attack takes this much of the usual time (was 0.5)
const FACELESS_TIME = 10;     // Withered Bonnie stays off the cameras this long
const JAM_TIME = 4;           // Withered Chica jams the vent door open this long
const LOL_TIME = 3;           // Lolbit: the guard types L-O-L this long
const LOL_NOTICE = 0.4;       // ...and notices only this much as well as usual meanwhile
const LOL_SLOW = 0.5;         // ...and reacts this many seconds slower

// ---------- the guard's extra tools (The Tendons 8) ----------
const DEATH_COINS = 2;        // how many death coins a guard with the 'coins' tool starts with
const LOCKDOWN_TIME = 5;      // Lockdown switches off every animatronic ability this long
const LOCKDOWN_COOLDOWN = 40; // seconds between Lockdowns
const PRY_TIME = 4;           // Ennard: a pried door can't be shut again for this long
const FREEZE_TAG_TIME = 6;    // Plushtrap moves even with the monitor down for this long
const LUNGE_TIME = 1.5;       // Phantom Foxy freezes the guard this long
const SILENT_STEALTH = 0.45;  // Nightmare Bonnie holding his breath: how hard his next attack is to notice (was 0.85, then 0.6)
// Pests in the office: Freddles (Nightmare Freddy) and the cupcake (Nightmare Chica).
const PEST_MAX = 4;           // the most at once
const PEST_EVERY = 20;        // a Freddle climbs in by itself this often (seconds, at crew level 10)
const PEST_NOTICE = 0.12;     // each pest makes the guard this much worse at noticing attacks
const CUPCAKE_DRAIN = 0.2;    // % per second the cupcake eats while it's in
const SHOO_TIME = 1.2;        // seconds the guard spends shooing one pest away by hand

// ---------- the guard's skill (0 to 20) ----------
// Each of these says how a guard of that skill behaves. Skill 0 is special: it never notices you.
const skillOf = (s, at1, at20) => s <= 0 ? 0 : byLevel(s, at1, at20);
// How often the guard "thinks" (decides what to do next), in seconds. Lower = sharper.
const guardThink = s => s <= 0 ? 3 : byLevel(s, 1.6, 0.5);
// Seconds between noticing an attack and stopping it (shutting the door, putting the mask on...).
const guardReact = s => s <= 0 ? 99 : byLevel(s, 1.6, 0.6);
// The chance per second that it notices an attack while sitting at its desk...
const noticeDesk = s => skillOf(s, 0.75, 0.99);
// ...and while it's busy on the cameras (looking at some other room).
const noticeCam = s => skillOf(s, 0.45, 0.9);
// The chance it hears one of your animatronics moving (and gets suspicious about that side).
const hearChance = s => skillOf(s, 0.1, 0.55);
// How many seconds it trusts what it saw on a camera before it stops believing it.
const memTime = s => byLevel(Math.max(1, s), 4, 9);
// Below this much music box (%), the guard goes to wind it.
const windAt = s => byLevel(Math.max(1, s), 25, 55);

// ---------- your crew's level (1 to 20, custom night only) ----------
// Every cooldown is multiplied by this: 1.4 at level 1 (slow), about 1 at level 10, 0.6 at level 20 (fast).
const crewSpeed = level => byLevel(level, 1.4, 0.6);
