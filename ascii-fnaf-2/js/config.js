/* =====================================================================
   config.js: the numbers you can tweak to change how the game FEELS.

   Nothing here does anything by itself; other files read these values.
   Want longer nights, cheaper doors or slower nightmares? Change a
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
// The monitor, each closed door and the vent door each cost this much per second while in use.
// A heavy door counts as HEAVY_UNITS of them. The mask and the lamp are free.
// Balanced with a test bot (on request, 2026-11-17: "is the max mode humanly possible?"). With the old
// numbers (0.3, a heavy door counting double, 1% a shock, the Cupcake 0.8 and Mangle 1.2, nightmares
// breathing 4-7 s) the power ran out by about 2 AM in All 20 every time. With these, a quick bot wins
// All 20 about 1 night in 5 with almost no power left, and every other challenge can be won.
const UNIT_DRAIN = 0.2;
const HEAVY_UNITS = 1;           // a heavy door costs the same as a normal one
const SHOCK_COST = 0.3;          // % power each controlled shock costs (on the desk or on a camera)
const SHOCK_COOLDOWN = 0.5;      // seconds before the shock is charged again
const POWER_OUT_WAIT = [5, 13];  // seconds of darkness after a power-out before Nightmare Freddy gets you

// ---------- oxygen ----------
// Oxygen starts at 100% and NEVER comes back (on request). At 0% you pass out: game over.
// What drains it, in % per second while it's going on:
const MRN_O2 = 0.3;              // each Minireena in the oxygen room
const NMT_O2 = 1.0;              // the Nightmarionette
const END_O2 = 0.8;              // Ennard in the oxygen room
const JCK_O2 = 0.8;              // Jack-o Chica's smoke
const PTR_O2 = 0.6;              // Plushtrap messing with the air
const O2_LOW = 25;               // below this, a warning beeps

// ---------- difficulty levels (custom night) ----------
const MIN_LEVEL = 0;       // level 0 switches a character off for the night
const MAX_LEVEL = 20;

// Keeps any number inside 0..20 and makes it a whole number.
const clampLevel = n => Math.max(MIN_LEVEL, Math.min(MAX_LEVEL, Math.round(Number(n) || MIN_LEVEL)));

// A character at level L gets a chance to act every so often, and each chance works L times in 20.
const moveChance = level => level / 20;

// Seconds you get to react once something is at your door or in your office: 4.0 s at level 1
// down to 2.9 s at level 20.
const reactWindow = level => byLevel(level, 4.0, 2.9);
// A random wait, for characters who turn up now and then: `slow` seconds apart at level 1, `fast`
// at level 20, give or take 25%.
const waitFor = (level, slow, fast) => byLevel(level, slow, fast) * rand(0.75, 1.25);

// ---------- the nightmares (heavy doors) ----------
// Nightmare Bonnie, Nightmare Chica and Nightmare Fredbear come down a hall in NM_STAGES steps you can
// see on the cameras and hear (footsteps). Nightmare Foxy is only heard. Then they're at the door,
// where you can't see them: go to the door and listen. Shut the HEAVY door in time; then they breathe
// behind it for a while, and opening it before the breathing stops gets you.
const NM_STAGES = 3;
const NBN_INTERVAL = 5;          // seconds between each one's chances to move
const NCH_INTERVAL = 5.5;
const NFB_INTERVAL = 6;
const NFX_INTERVAL = 4.5;        // Foxy is quick
const NM_EXTRA = 1.5;            // extra seconds to shut the heavy door (you may have to walk to the door first)
const NM_STAY = [3, 5];          // seconds they breathe behind a shut heavy door before leaving
// Nightmare Foxy getting past the door doesn't end the night (on request): he's in the office and grows
// a stage every NFX_GROW seconds. Shock the desk to drive him out; after NFX_STAGES stages he gets you.
const NFX_GROW = 1.8;
const NFX_STAGES = 3;

// ---------- Nightmare Freddy's Freddles ----------
// A Freddle climbs onto your desk every so often. FREDDLE_MAX of them and Nightmare Freddy comes for
// you. One shock on the desk clears them all.
const freddleWait = level => waitFor(level, 22, 7);
const FREDDLE_MAX = 4;

// ---------- Circus Baby ----------
// She comes down the left hall in BABY_STAGES steps (a soft beep each), then into your office. Mask on
// in time; after BABY_CLOSE seconds of mask she's right in front of you: shock her within the window.
const BABY_INTERVAL = 6;
const BABY_STAGES = 3;
const BABY_CLOSE = 2.5;

// ---------- Ballora ----------
// Her music plays from the side she's coming from, louder each step. Shut that door before she arrives.
const BALLORA_INTERVAL = 5;
const BALLORA_STEPS = 3;
const BALLORA_MUSIC = 1.3;      // seconds between the phrases of her music while she's coming (it plays all the way)

// ---------- Funtime Freddy ----------
// His script (shown in the office) has a line every so often. The important lines ("Bon-Bon, go get
// him!" and "Let's give him a surprise!") send him to a door. He walks to that side of the auditorium
// (CAM 4: the left of the room is the left door) and you hear his steps from that side.
const FFR_LINES = 9;                                     // lines in his script for the night
const ffrAttacks = level => 1 + Math.floor(level / 5);   // how many of them are important: 1 to 5
const ffrRun = level => byLevel(level, 4.5, 2.5);        // seconds from the line to him reaching the door
const FFR_GRACE = 1;             // a last second to shut the door once he's there

// ---------- Funtime Foxy ----------
// The sign on the show stage (CAM 3) shows the next SHOWTIME. Be watching CAM 3 at that time.
// FFX_GRACE seconds late is still all right.
const ffxGap = level => byLevel(level, 75, 28);   // seconds between showtimes
const FFX_GRACE = 1.5;

// ---------- Ennard ----------
// Each visit is either a walk down a hall to a door (normal door) or a trip into the oxygen room (CAM 5; drains
// oxygen until you shock him away).
const ennardWait = level => waitFor(level, 40, 14);
const ENNARD_INTERVAL = 4;
const ENNARD_STAGES = 2;

// ---------- Minireenas ----------
// They turn up in the oxygen room (CAM 5, on request) one at a time (MRN_MAX at most) and each one uses
// up oxygen. One shock on that camera zaps them all.
const minireenaWait = level => waitFor(level, 26, 8);
const MRN_MAX = 4;

// ---------- the Nightmarionette ----------
// Appears in the office and uses up oxygen fast. NMT_SHOCKS shocks on the desk send them away.
const nightmarionetteWait = level => waitFor(level, 55, 18);
const NMT_SHOCKS = 3;

// ---------- Withered Bonnie ----------
// Walks into the office: mask on in time and keep it on for MASK_HOLD seconds.
const witheredWait = level => waitFor(level, 45, 14);
const MASK_HOLD = 2.0;

// ---------- Bidybab ----------
// Squeaks in the vent above you. On every 3rd squeak, close the vent door in time.
const bidySqueak = level => waitFor(level, 9, 3.5);
const BIDY_EVERY = 3;

// ---------- Jack-o Chica ----------
// Stands in a doorway breathing smoke (it uses up oxygen). Slam the heavy door on her to send her away.
const jackWait = level => waitFor(level, 50, 16);

// ---------- Plushtrap ----------
// Turns up in the oxygen room (CAM 5) and uses up oxygen. Stay on his camera for PTR_WATCH seconds and he leaves.
const plushWait = level => waitFor(level, 50, 16);
const PTR_WATCH = 2.5;

// ---------- Nightmare Cupcake and Nightmare Mangle (power) ----------
// The Cupcake gets into the power room (CAM 6, its map button shows a pink !) and eats power until you shock that
// camera. Mangle blinks a warning on three cameras but is only on one; shock the right one.
const cupcakeWait = level => waitFor(level, 45, 15);
const NCP_DRAIN = 0.4;           // % power per second while the Cupcake is eating
const mangleWait = level => waitFor(level, 50, 16);
const NMG_DRAIN = 0.4;           // % power per second while Mangle is in the system
const NMG_DECOYS = 2;            // how many empty cameras blink along with the real one

// ---------- Nightmare BB ----------
// He sits asleep in the corner of the office. Each time you put the monitor down he may wake up: a
// chance of level / 40 (so half the time at level 20). Awake, flash the lamp on him before you raise the
// monitor again. Flashing it while he's asleep wakes him the wrong way.
const nbbChance = level => level / 40;
const LAMP_SHOW = 0.35;          // seconds the lamp's flash shows
