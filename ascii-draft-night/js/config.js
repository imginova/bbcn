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
const OFFER_SIZE = 5;     // characters shown on the pick screen (you take as many as you want)

// The difficulties (picked on the title screen before a new run). A difficulty only changes the GOAL:
// survive a night whose lineup is worth at least `goal` points to win the run. All 33 characters
// together are worth 570, so even Nightmare leaves some room. `cls` borrows a rarity's color.
// Normal is the old goal of 150, so a run saved before difficulties existed counts as Normal.
const DIFFICULTIES = {
  easy:      { name: 'Easy',      goal: 100, cls: 'r-common' },
  normal:    { name: 'Normal',    goal: 150, cls: 'r-uncommon' },
  hard:      { name: 'Hard',      goal: 250, cls: 'r-epic' },
  nightmare: { name: 'Nightmare', goal: 400, cls: 'r-legendary' },
};
const DIFF_ORDER = ['easy', 'normal', 'hard', 'nightmare'];   // easiest first
const DEFAULT_DIFF = 'normal';

// ---------- the clock ----------
// It was 30 seconds (3-minute nights) until the owner asked for shorter nights. Power drain and heat were
// sped up to match (times 1.5), so they still last the same share of the night.
// HOUR_SECONDS is `let` because the night length slider changes it: newGame (game.js) sets it to the chosen
// night's length divided by NIGHT_HOURS. 20 (2-minute nights) is the default.
let HOUR_SECONDS = 20;     // real seconds per in-game hour (a whole night lasts 2 minutes)
const NIGHT_HOURS = 6;     // 12 AM to 6 AM

// The night length slider on the title screen (on request, 2026-11-27), for runs and custom nights alike.
// Each choice is a whole night in real seconds. The power drain and the heat's rise scale with it (their
// numbers were made for BASE_NIGHT), so they last the same share of any night. Nights longer than
// STRETCH_FROM also stretch the characters' waits to match (the owner chose "characters come less often"),
// so a 1-hour or 6-hour night has about as many visits as a 6-minute one instead of nonstop attacks.
const NIGHT_LENGTHS = [
  { label: '1 min', secs: 60 }, { label: '2 min', secs: 120 }, { label: '3 min', secs: 180 },
  { label: '4 min', secs: 240 }, { label: '4½ min (45-second hours)', secs: 270 },
  { label: '5 min', secs: 300 }, { label: '6 min', secs: 360 },
  { label: '1 hour', secs: 3600 }, { label: '6 hours', secs: 21600 },
];
const DEFAULT_LENGTH = 1;   // 2 minutes: what every night was before the slider
const BASE_NIGHT = 120;     // the night length the power and heat numbers were made for
const STRETCH_FROM = 360;   // longer nights than this stretch the characters' waits

// ---------- power ----------
// The monitor, each closed door, the flashlight and the fan each cost this much per second while
// in use. The mask and the audio lures are free. (The monitor alone, all night, costs 60%.) It was 0.45
// until the owner asked for "a little faster" drain (2026-11-25).
const UNIT_DRAIN = 0.5;
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
const LURE_FOOLED = { tbn: 0.85, tch: 0.45, bb: 0.65 };   // Toy Bonnie: very easy to fool; Toy Chica: so-so; BB: fairly easy

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

// ---------- Trash and the Gang (common) ----------
// Every so often one of them stands in front of a camera and hides most of its picture for a while. They
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

// ======================================================================
// The BONUS characters: more obscure and gimmicky (the owner's second list).
// They're sorted into the same rarities as everyone else.
// ======================================================================

// ---------- Salvage sign (bonus, common) ----------
// Each time you use the controlled shock, SALVAGE_CHANCE of the time a SALVAGE sign pops up on the
// camera instead: press Shock SALVAGE_PRESSES more times (fast, no charging needed) and the last press
// zaps as normal. Taking Salvage sign brings the Shock button along, even without Springtrap or Baby.
const SALVAGE_CHANCE = 0.4;
const SALVAGE_PRESSES = 3;

// ---------- Watermelon Chica (bonus, uncommon) ----------
// She turns up in a doorway. Shutting the door on her makes it bounce back open: shut it WMC_SHUTS times
// within WMC_TIME seconds and she leaves.
const WMC_WAIT = [24, 38];
const WMC_TIME = 6;
const WMC_SHUTS = 3;

// ---------- Hand-unit (bonus, uncommon) ----------
// When you flip the monitor down, HAND_CHANCE of the time his keypad is in your office. Mash the keyboard (any
// keys, or tap the keypad) HAND_PRESSES times within HAND_TIME seconds and he glitches out.
const HAND_CHANCE = 0.2;
const HAND_PRESSES = 15;
const HAND_TIME = 4;

// ---------- Bounce pot (bonus, uncommon) ----------
// Bounces across the view all night, from the bottom. Keep the mouse pointer out of its way: every hit
// costs BOUNCE_COST % power (then it can't hit again for BOUNCE_SAFE seconds). Its speed across and its
// gravity are in "screens per second", so it moves the same on any screen size.
const BOUNCE_COST = 3;
const BOUNCE_SAFE = 1.5;
const BOUNCE_SPEED = 0.22;
const BOUNCE_GRAVITY = 1.6;
// How hard it springs up off the bottom (a random amount each time, in screens per second). The highest
// it gets is about speed² ÷ (2 × gravity) of the view: 1.6 takes it nearly to the top. It was [0.95, 1.3]
// (about halfway up) until the owner asked for higher jumps (2026-11-26).
const BOUNCE_JUMP = [1.25, 1.6];
// Each time it lands it crouches on the floor and charges up for BOUNCE_CHARGE seconds (squashing and
// shaking: your warning), then springs off leaning a little toward your mouse pointer: BOUNCE_LEAN times
// how far away the pointer is, added to its speed across, never more than BOUNCE_MAX_SPEED in all.
// (On request, 2026-11-25: "charge up the bounce with a little animation and go slightly towards the player".)
const BOUNCE_CHARGE = 0.6;
const BOUNCE_LEAN = 0.25;
const BOUNCE_MAX_SPEED = 0.4;

// ---------- Munchie (bonus, uncommon) ----------
// Grabs onto your screen (covering part of the view) every MUNCHIE_WAIT seconds. Grab it with the mouse
// and flick it off (drag it and let go while it's still moving fast: MUNCHIE_FLICK pixels per second or
// more) within MUNCHIE_TIME seconds, or it gets you.
const MUNCHIE_WAIT = [22, 36];
const MUNCHIE_TIME = 8;
const MUNCHIE_FLICK = 900;

// ---------- Cookie Freddy (bonus, rare) ----------
// He turns up in your office, saying the COOKIE_ASKS coatings he wants. Go to the Kitchen (CAM 9) and click
// those ingredients within COOKIE_TIME seconds. A wrong ingredient costs COOKIE_WRONG seconds.
const COOKIE_WAIT = [28, 42];
const COOKIE_TIME = 16;
const COOKIE_ASKS = 2;
const COOKIE_WRONG = 2;

// ---------- the Flamethrower endo (bonus, rare) ----------
// Every ENDO_WAIT seconds he stays ENDO_STAY seconds and heats the office ENDO_HEAT % per second on top of
// the normal heat. While he's there the fan can't cool it: it only slows the heating to FAN_SLOW of it.
// If the heat hits 100% while he's there, he gets the blame.
const ENDO_WAIT = [28, 42];
const ENDO_STAY = [10, 14];
const ENDO_HEAT = 6;
const FAN_SLOW = 0.25;

// ---------- Plush babies (bonus, epic) ----------
// Little Circus Baby plushes turn up in the doorways and windows (4 spots), each on its own timer. Shine
// the flashlight on one for PB_SHINE seconds to send it away (a shut door blocks the light). One left for
// PB_NEGLECT seconds climbs onto your screen and hides a top corner for the rest of the night. The 3rd one
// on the screen gets you.
const PB_WAIT = [9, 16];
const PB_NEGLECT = 12;
const PB_SHINE = 0.5;
const PB_DEADLY = 3;

// =====================================================================
// The third list (2026-11-25): BB, Mangle, Nightmare BB, and two more bonus characters, Grave weed and
// the Nightmare staff bot. Claude sorted them into rarities, like the bonus ones.
// =====================================================================

// ---------- BB (uncommon) ----------
// A third vent crawler, but you can't see him on the VENTS tab (you can still hear him, and lures still
// work on him). In your office the mask sends him away like the others (VENT_HOLD). Too slow, and he
// takes your flashlight for the rest of the night (he doesn't kill you). Then he stops coming.
const BB_INTERVAL = 5;

// ---------- Mangle (rare) ----------
// Every MANGLE_WAIT seconds she gets onto a random camera with a burst of static, and stays invisible.
// Her static keeps crackling every MANGLE_CRACKLE seconds: loud on her camera, faint everywhere else.
// Find her camera by ear and shock it within MANGLE_TIME seconds.
const MANGLE_WAIT = [24, 38];
const MANGLE_TIME = 12;
const MANGLE_CRACKLE = 0.7;

// ---------- Nightmare BB (rare) ----------
// He sits on the floor of your office, asleep. Each time you flip the monitor down, NBB_CHANCE of the
// time he wakes up. Awake: shine the flashlight on him for NBB_SHINE seconds before you raise the monitor
// again, or he gets you. Asleep: don't shine him! NBB_ASLEEP seconds of light on him while he sleeps
// (a little more than a quick sweep across him) also gets you.
const NBB_CHANCE = 0.25;
const NBB_SHINE = 0.6;
const NBB_ASLEEP = 0.4;

// ---------- the Nightmare staff bot (bonus, uncommon) ----------
// A caution bot stands in your office all night. Every NSB_WAIT seconds it starts blinking and points its
// arrow at a door: the Nightmare staff bot is coming to that door. Shut it (only that one) within
// NSB_TIME seconds. Shut both, and it waits behind them until one opens, then goes for that door (you get
// REACT_WINDOW seconds to shut it again).
const NSB_WAIT = [22, 34];
const NSB_TIME = 4.5;
const NSB_BLINK = 0.5;   // seconds between the caution bot's blinks

// ---------- Grave weed (bonus, rare) ----------
// Bounces around the view like Bounce pot (charging up, leaning toward your pointer), but a little
// slower, and one touch of the mouse pointer gets you. It can't hit you in the first GRAVE_GRACE seconds.
const GRAVE_SPEED = 0.17;
const GRAVE_CHARGE = 0.8;
const GRAVE_GRACE = 3;
const GRAVE_JUMP = [0.95, 1.3];   // its jump: Bounce pot's old one (about halfway up the view)

// =====================================================================
// Update 3.0: turning around, the yard cameras, Fazcoins and the shop, and eight more characters.
// =====================================================================

// ---------- Fazcoins and the shop ----------
// Coins start at 0 every night. A coin turns up on a random camera every COIN_WAIT seconds (click it on
// the camera for COIN_VALUE), and sending a character away clearly (shutting a door on them, masking them
// off, flashing them, shocking them...) gives FEND_COINS. The SHOP tab on the monitor sells them back.
const COIN_WAIT = [10, 16];
const COIN_VALUE = 1;
const FEND_COINS = 1;
// The shop's items: price in coins, and how many it has each night.
const SHOP = {
  death:   { name: 'Death coin',   price: 15, stock: 3, desc: 'Gets rid of one character for the rest of the night (it stays in your lineup)' },
  battery: { name: 'Battery pack', price: 5,  stock: 5, desc: 'Gives back 10% power' },
  guitar:  { name: "Rockstar Bonnie's guitar", price: 10, stock: 1, desc: 'Buy it back before 6 AM, or he gets you at 5:59' },
};
const BATTERY_POWER = 10;     // percent of power a battery pack gives back
const PRICE_UP = 1.5;         // Funtime Chica: the death coin and the battery pack cost this many times more

// ---------- the yard cameras ----------
// Holding the light on a yard camera uses power like the flashlight (it IS the flashlight controls).

// ---------- Ghost Freddy (common) ----------
// Every GHOST_WAIT seconds he drifts across the view from one side to the other, at GHOST_SPEED (views per
// second) and a random height. If he touches the mouse pointer it freezes for GHOST_FREEZE seconds: the
// flashlight stays where it was and clicks don't work (keys still do).
const GHOST_WAIT = [16, 26];
const GHOST_SPEED = 0.16;
const GHOST_FREEZE = 3;

// ---------- Rockstar Bonnie (uncommon) ----------
// The shopkeeper has his guitar. Buy it back (SHOP.guitar) before 6 AM, or he gets you at 5:59.

// ---------- Nightmare Helpy (uncommon) ----------
// Each time you turn around, HELPY_CHANCE that he's sitting on the back desk. Click him HELPY_CLICKS times
// within HELPY_TIME seconds to knock him off, or he gets you.
const HELPY_CHANCE = 0.3;
const HELPY_CLICKS = 10;
const HELPY_TIME = 4;

// ---------- H.E.L.P.I (uncommon) ----------
// Every HELPI_WAIT seconds the tablet on the back desk buzzes with a sum. Turn around, type the answer and
// press Enter within HELPI_TIME seconds. A wrong answer clears what you typed (the clock keeps going).
const HELPI_WAIT = [24, 36];
const HELPI_TIME = 10;

// ---------- Dreadbear (rare) and Twisted Wolf (uncommon) ----------
// They cross a yard (stage 0 by the far gate, 1 half way, 2 close) and then come up to that yard's back
// window. Each move is a chance every interval. At the window, flash it for YARD_FLASH seconds within their
// time. Dreadbear is silent (watch the yard cameras); Twisted Wolf is hard to see out there, but howls at
// the window.
const DREAD_INTERVAL = 6;
const DREAD_CHANCE = 0.6;
const DREAD_TIME = 6;
const WOLF_INTERVAL = 5;
const WOLF_CHANCE = 0.6;
const WOLF_TIME = REACT_WINDOW + 1.5;
const YARD_FLASH = 0.5;

// ---------- Twisted Foxy (rare) ----------
// Every TFOXY_WAIT seconds he shows as a mound in the ground of one yard for TFOXY_MOUND seconds (only
// seen with that yard's light on). Then he digs (you hear it, and he's gone from view): flash THAT yard's
// camera light for TFOXY_FLASH seconds within TFOXY_TIME. Lighting the other yard while he digs gets you.
const TFOXY_WAIT = [22, 34];
const TFOXY_MOUND = [8, 12];
const TFOXY_TIME = 7;
const TFOXY_FLASH = 0.4;
