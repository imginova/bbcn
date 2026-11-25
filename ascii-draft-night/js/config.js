/* =====================================================================
   config.js: the numbers you can tweak to change how the game FEELS.

   Nothing here does anything by itself; other files read these values.
   Want longer nights, cheaper doors or a lazier music box? Change a
   number here, save, and reload the page.

   Names in ALL_CAPS are a common way of saying "this is a setting that
   never changes while the game runs".

   There are no difficulty levels in Draft Night: each character always
   plays the same way, and how hard it is goes with its RARITY (see
   RARITIES in data.js). So each character simply has its own numbers
   below. A "chance" is how likely something is each time it gets the
   chance to happen: 0.5 means half the time.
   ===================================================================== */

// ---------- the run ----------
const LIVES = 3;          // lives per run: dying costs one and you replay that night
const GOAL_POINTS = 150;  // survive a night whose lineup is worth at least this many points to win the run
const OFFER_SIZE = 5;     // characters shown on the pick screen (you take as many as you want)

// ---------- the clock ----------
// It was 30 seconds (3-minute nights) until the owner asked for shorter nights. Power drain and heat were
// sped up to match (times 1.5), so they still last the same share of the night.
const HOUR_SECONDS = 20;   // real seconds per in-game hour (a whole night lasts 2 minutes)
const NIGHT_HOURS = 6;     // 12 AM to 6 AM

// ---------- power ----------
// The monitor, each closed door, the flashlight and the fan each cost this much per second while
// in use. The mask and the audio lures are free. (The monitor alone, all night, costs 54%.)
const UNIT_DRAIN = 0.45;
const POWER_OUT_WAIT = [5, 13];   // seconds of darkness after a power-out before Freddy gets you

// ---------- the office heat ----------
// The office heats up all night, every night: HEAT_RISE % per second, so without the fan you'd pass out
// at about 4 AM. While the fan is on it cools the office by FAN_COOL % per second instead.
// At 100% you pass out (it costs a life, like being caught). HOT_WARN: a heavy breath plays when the
// heat passes each of these, as a warning.
const HEAT_START = 10;
const HEAT_RISE = 1.1;
const FAN_COOL = 5;
const HOT_WARN = [70, 85];

// Seconds you get to react once something is at your door or in your office (shut the door, put on the
// mask...). Most characters use this; a few have their own (shorter or longer) windows below.
const REACT_WINDOW = 3.5;

// ---------- the controlled shock ----------
// With the monitor up, the Shock button (or X) zaps the camera you're looking at. It costs SHOCK_COST %
// power each time and needs SHOCK_COOLDOWN seconds to charge again. Only there on nights with someone
// it works on (Springtrap or Circus Baby).
const SHOCK_COST = 1;
const SHOCK_COOLDOWN = 1;

// ---------- the flashlight ----------
// It lights up a patch around the mouse pointer and "flashes" whatever is inside it, in the office
// and on the cameras. The patch is measured in characters of the ASCII picture: BEAM_COLS across and
// BEAM_ROWS up/down from the pointer (a character is about twice as tall as wide, so fewer rows).
const BEAM_COLS = 5;
const BEAM_ROWS = 2.5;

// ---------- the vents ----------
// 15 vent rooms in 3 rows of 5 (see the vents in data.js). Vent crawlers start in V1 and climb toward
// V15, the vent that opens into your office.
const LURE_REACH = 1;        // a lure works on crawlers one vent away (not in that vent itself)
const LURE_STALL = 2;        // a fooled crawler skips this many of its move chances
const LURE_COOLDOWN = 2;     // seconds before you can play another lure
const LURE_SHOW = 1.5;       // seconds the lure shows on the vent map
const VENT_EXIT_WAIT = 2.5;  // a crawler waits at least this long in V15 before climbing in (lure it back!)
const VENT_HOLD = 3;         // seconds of mask before a vent visitor makes a sound and leaves

// ======================================================================
// The characters. Each block is one character: how often it gets a
// chance to act (seconds) and how likely it is to use that chance.
// ======================================================================

// ---------- Freddy (common) ----------
const FREDDY_INTERVAL = 6;     // seconds between his chances to move (and laugh)
const FREDDY_CHANCE = 0.45;    // how likely he is to use each chance
const FREDDY_STEPS = 3;        // the 3rd laugh means he's at the door he laughed from

// ---------- Bonnie (common) ----------
// He walks faster the hotter the office is: at 100% heat his chances come BONNIE_HEAT + 1 times as often
// (3 times as often), at 50% heat twice as often, and at 0% at the normal pace.
const BONNIE_INTERVAL = 6;
const BONNIE_CHANCE = 0.5;
const BONNIE_HEAT = 2;

// ---------- Chica (common) ----------
// When she's shut out, she leaves 1 to CHICA_MAX_CUPS cupcakes in your office. Find and click every one in
// CUP_TIME_BASE seconds plus CUP_TIME_EACH per cupcake, or she gets you. Her clock only runs while you
// can see the office (not with the monitor up or the mask on).
const CHICA_INTERVAL = 6.5;
const CHICA_CHANCE = 0.5;
const CHICA_MAX_CUPS = 3;
const CUP_TIME_BASE = 2;
const CUP_TIME_EACH = 2.5;

// ---------- Toy Bonnie and Toy Chica (common) ----------
// Seconds between their chances to move one vent closer, how likely they are to use each one, and how
// easily an audio lure fools them (the chance they follow one): 0 never, 1 always.
const TOY_BONNIE_INTERVAL = 3.5;   // fast
const TOY_CHICA_INTERVAL = 5;      // medium
const CRAWL_CHANCE = 0.5;
const LURE_FOOLED = { tbn: 0.85, tch: 0.45 };   // Toy Bonnie: very easy to fool; Toy Chica: so-so

// ---------- the Puppet (common) ----------
// % per second the music box unwinds (from full to empty in about a minute). One click of Wind fills it.
const BOX_DRAIN = 1.6;
const BOX_LOW = 35;          // below this, the warning symbol shows and a chime plays
const PUPPET_DELAY = 4.5;    // seconds from the box running out to the Puppet getting you

// ---------- Nightmare Freddy (common) ----------
// A Freddle climbs onto the desk every FREDDLE_WAIT seconds (a random time in that range). Keep the
// flashlight on one for FREDDLE_SHINE seconds to send it away. With all three up, Nightmare Freddy comes
// NFR_ARRIVE seconds later unless you send one away first.
const FREDDLE_WAIT = [12, 22];
const FREDDLE_SHINE = 0.5;
const NFR_ARRIVE = 4;

// ---------- the Trash gang (common) ----------
// Every so often they pile up in front of one camera and hide most of its picture for a while. They
// never attack.
const TRASH_WAIT = [18, 32];
const TRASH_STAY = [10, 16];

// ---------- Lolbit (common) ----------
// Every so often a big LOL screen covers your view and blocks clicks on anything under it until you
// type L, O, L (or tap the three letters on it). He never attacks.
const LOL_WAIT = [30, 50];

// ---------- Foxy (uncommon) ----------
// He gets ready in Pirate Cove one stage at a time; after his last stage he runs to the left door.
const FOXY_INTERVAL = 5;     // seconds between his chances to get ready
const FOXY_CHANCE = 0.45;
const FOXY_STAGES = 3;       // after his 3rd step he runs: 1 peeking, 2 half out, 3 gone
const FOXY_RUN = 3;          // seconds from leaving the cove to reaching the left door
const FOXY_FLASH = 0.4;      // seconds of steady light on the cove that push him back one stage
const FOXY_COST = 6;         // % power he knocks off when he bangs on the shut left door

// ---------- Golden Freddy (uncommon) ----------
// The chance he's in your office each time you flip the monitor down, and the seconds you get to tap
// the mask on.
const GOLDEN_CHANCE = 0.3;
const GOLDEN_WINDOW = 1.8;

// ---------- Toy Freddy (uncommon) ----------
// Like Withered Bonnie, but he walks in whenever his timer runs out, even with the monitor up. He leaves
// sooner (TOY_FREDDY_HOLD seconds of mask) and gives you longer to react (TOY_FREDDY_EXTRA extra seconds).
const TOY_FREDDY_WAIT = [26, 42];
const TOY_FREDDY_HOLD = 1.5;
const TOY_FREDDY_EXTRA = 2;

// ---------- Nightmare Bonnie (uncommon) ----------
// Every so often he turns up in one of the doorways. Keep the flashlight on him for NBN_FLASH seconds
// within NBN_TIME seconds. (A shut door blocks the light, so it has to be open.)
const NBN_WAIT = [22, 36];
const NBN_TIME = 4.5;
const NBN_FLASH = 0.5;

// ---------- Bonnet (uncommon) ----------
// She runs across the office floor in BONNET_TIME seconds. Boop her nose before she reaches the other
// side. She dodges the pointer at BONNET_DODGE characters a second (slower than you can move the mouse).
const BONNET_WAIT = [25, 40];
const BONNET_TIME = 6;
const BONNET_DODGE = 6;

// ---------- Withered Bonnie (rare) ----------
// His timer counts down all the time, but with the monitor up it can't reach 0: he walks in only once
// the monitor is down. Then mask on in time, and keep it on for WBN_HOLD seconds.
const WBN_WAIT = [22, 38];
const WBN_HOLD = 2.5;

// ---------- Withered Foxy (rare) ----------
// He runs at the left door (shut it when the steps stop). Shut out, he waits behind it until he STOMPS:
// then open the door, flash him for WFX_FLASH seconds, and shut it again to send him away.
const WFX_WAIT = [32, 50];   // seconds between his runs
const WFX_RUN = 3;           // seconds of running steps before he's at the door
const WFX_STOMP = [3, 6];    // seconds he waits behind the shut door before the stomp
const STOMP_EVERY = 2.5;     // seconds between stomps while he waits for you to open up
const WFX_FLASH = 0.5;

// ---------- Springtrap and Circus Baby (rare) ----------
// They come through the cameras toward your office, one room at a time. Shock the camera they're on:
// Springtrap goes back one room, Baby all the way back to the start. From their last room they climb
// into your office (and get you), but never sooner than LAST_ROOM_WAIT seconds after reaching it.
const SPRING_INTERVAL = 7;
const SPRING_CHANCE = 0.55;
const BABY_INTERVAL = 4.5;   // quicker than Springtrap
const BABY_CHANCE = 0.55;
const LAST_ROOM_WAIT = 3;

// ---------- Nightmare Chica (rare) ----------
// A strange noise, and her cupcake is HIDDEN on one of the cameras. Find it and click it in NCH_TIME seconds.
const NCH_WAIT = [30, 48];
const NCH_TIME = 20;

// ---------- Shadow Bonnie (epic) ----------
// The office goes dark. Find his eyes with the flashlight and hold it on them for SBN_SHINE seconds,
// within SBN_TIME seconds.
const SBN_WAIT = [30, 48];
const SBN_TIME = 9;
const SBN_SHINE = 0.8;

// ---------- Plushtrap (epic) ----------
// He giggles and hides somewhere in the office. Any light on him sends him away at once, but you only
// get PLU_TIME seconds.
const PLU_WAIT = [22, 36];
const PLU_TIME = 2.5;

// ---------- Funtime Freddy (epic) ----------
// He stands on one side of the Funtime Auditorium (CAM 7) and says a line every so often (shown as a
// subtitle for FFR_SUB_SHOW seconds). FFR_ATTACK_CHANCE of his lines send an attack to a door, FFR_RUN
// seconds later (plus FFR_GRACE once it's there): "Bon-Bon, go get 'em!" his side, "Let's give him a
// surprise!" the other side. Now and then (every FFR_SWITCH seconds) he walks to the other side.
const FFR_LINE_GAP = [9, 15];
const FFR_ATTACK_CHANCE = 0.4;
const FFR_RUN = 4;
const FFR_GRACE = 1;
const FFR_SUB_SHOW = 4;
const FFR_SWITCH = [16, 28];

// ---------- Withered Freddy (legendary) ----------
// He paces outside, between the doors, one step every WFR_STEP seconds, and you only see him as he
// passes the windows. No sounds at all. At a door, WFR_TRY of the time he tries to get in: shut that
// door within WFR_WINDOW seconds.
const WFR_STEP = 2.2;
const WFR_TRY = 0.6;
const WFR_WINDOW = 3;

// ---------- Funtime Foxy (legendary) ----------
// The sign on the show stage (CAM 1) says when the next SHOWTIME is (FFX_GAP seconds apart, on a round
// time). Be watching CAM 1 then; FFX_GRACE seconds late is still all right.
const FFX_GAP = [40, 60];
const FFX_GRACE = 1.5;

// ---------- Nightmare Fredbear (legendary) ----------
// Every NFB_WAIT seconds he comes with one of three attacks, picked at random:
//   prowl  he paces past the windows like Withered Freddy, then stands in a doorway: flash him for
//          NFB_FLASH seconds within NFB_DOOR_TIME (a shut door won't stop him, the light will)
//   toy    a harder Toy Freddy: mask within NFB_TOY_REACT seconds, held for NFB_TOY_HOLD
//   plush  a harder Plushtrap: shine him within NFB_PLUSH_TIME seconds
const NFB_WAIT = [22, 34];
const NFB_FLASH = 0.6;
const NFB_DOOR_TIME = 3.5;
const NFB_TOY_REACT = 2.5;
const NFB_TOY_HOLD = 3;
const NFB_PLUSH_TIME = 1.8;
