/* =====================================================================
   game.js: the RULES. How the night plays out, moment to moment.

   Everything about one night lives in a single object called G
   (time, power, doors, camera, where every shape is...). The rules
   change G; render.js then draws whatever G says.

   The heart is update(dt), which main.js calls about 60 times a second.
   `dt` ("delta time") is how many seconds passed since the last call,
   for example 0.016. Multiplying every speed by dt keeps the game
   running at the same pace on fast and slow computers:
       power -= drainPerSecond * dt
   ===================================================================== */

// ---------- saved between nights ----------
// The level picked for each entry in SETUP. Loaded from the browser; missing ones default to 5.
let levels = (store.get('levels', []) || []).slice(0, SETUP.length);
while (levels.length < SETUP.length) levels.push(5);
levels = levels.map(clampLevel);

// Which modifiers are ticked, in the same order as levels (true / false). Missing ones start unticked.
let mods = (store.get('mods', []) || []).slice(0, SETUP.length).map(Boolean);
while (mods.length < SETUP.length) mods.push(false);

// Tonight's mode: 'standard', 'generator' or 'tasks' (see MODES in data.js).
let mode = store.get('mode', 'standard');
if (!MODES[mode]) mode = 'standard';

let best = store.get('best', null);   // hardest night survived: { sum, levels, mods, mode } or null

// The challenges (from PRESETS) you've survived, saved by clearKey (name plus version, see data.js).
// They get a ✓ on the custom night screen.
// RULE (on request): the only saved ✓s ever deleted are those of challenges that were buffed or
// reworked, which shows as their version going up. Everything else stays saved, even a ✓ this
// version of the game doesn't recognise. (An older version threw away every saved ✓ it didn't
// recognise, and the next win saved over the list, so a player's ✓s were lost for good.)
// So there are two lists:
//   savedTicks: everything saved, minus outdated versions; this is the one written back;
//   cleared:    the ones that count today (a ✓ is shown only for these).
// Saves from before challenges had versions hold plain names, like "Strobe". On request those count
// again: upgradeTick turns each one into that challenge's key for today, and it's saved straight away,
// so a later version bump still takes the ✓ away as usual.
// outdated(key) is true for a key like "Strobe v2" when Strobe is now on a higher version.
// (new Set(...) drops doubles, in case a challenge was beaten both before and after.)
const upgradeTick = key => { const p = PRESETS.find(p => p.name === key); return p ? clearKey(p) : key; };
const outdated = key => {
  const m = /^(.*) v(\d+)$/.exec(key);   // m[1] is the name, m[2] the version number
  const p = m && PRESETS.find(p => p.name === m[1]);
  return !!p && (p.v || 1) > Number(m[2]);
};
const savedTicks = [...new Set((store.get('cleared', []) || []).map(upgradeTick))].filter(key => !outdated(key));
store.set('cleared', savedTicks);
let cleared = savedTicks.filter(key => PRESETS.some(p => clearKey(p) === key));

// How many times each threat has got you, by its id: { dia: 3, len: 1, ... }. Saved in the browser,
// shown on the game over screen and on the custom night screen (see countKill below).
let kills = store.get('kills', {}) || {};

// Which challenge matches tonight's levels and modifiers EXACTLY, or null if none does.
// (Picking a challenge and then changing a level doesn't count.) A modifier only matters
// for threats that are switched on, just like in the score.
function matchingPreset() {
  return PRESETS.find(p => p.mode === mode && SETUP.every((c, i) =>
    p.levels[i] === levels[i] && (levels[i] === 0 || p.mods.includes(c.id) === mods[i]))) || null;
}

// A night's score: every level added up, plus MOD_BONUS for each ticked modifier
// (only when that threat is switched on: a modifier on a level-0 threat does nothing).
const nightScore = () => SETUP.reduce((total, c, i) => total + levels[i] + (mods[i] && levels[i] > 0 ? MOD_BONUS : 0), 0);
const MAX_SCORE = SETUP.length * (MAX_LEVEL + MOD_BONUS);   // 25 per threat: 11 x 25 = 275

// ---------- the current night ----------
let G = null;        // all the state of the night in progress (built by newGame)
let dirty = true;    // "something changed, redraw now" (render.js also redraws 15x a second anyway)
let windKey = false, windPointer = false;   // is W held down / is the Wind button held down?
// Is each door light's key (Q / E) or on-screen button held down right now?
const lightKey = { L: false, R: false }, lightPointer = { L: false, R: false };
let genKey = false, genPointer = false;      // Generator mode: is G / the Generator button held down?
let taskKey = false, taskPointer = false;    // Tasks mode: is a task's number key / the mouse held down on a task?
const taskHeld = () => taskKey || taskPointer;

// Is there power to use things right now? Not after a power-out, and not at 0% (Generator mode
// can sit at 0% without a power-out: everything just stays off until you charge).
const powered = () => !G.powerOut && G.power > 0;
// Are you free to do things? Not while holding the generator: that's all you can do.
const free = () => !G.genHeld;

// Small questions about a shape `m` (one entry of G.mobs):
const sideOf = m => m.route[m.route.length - 1];   // which door it is heading for: 'L' or 'R'
const atDoor = m => m.step === m.route.length - 1;  // is it standing in that doorway right now?

// Is a door light actually shining? You have to hold it, look at the office (camera down), have power,
// and have that door OPEN: a shut door blocks the light, so you can't see or push back ■ through it.
const lightOn = side => (lightKey[side] || lightPointer[side]) && !G.cam && powered() && free() && !G.doors[side];
const otherSide = side => side === 'L' ? 'R' : 'L';

// Is a threat's modifier active tonight? modOn('dia') asks about the ◆ Diamond, and so on.
const modOn = id => G.mod[id];

// Is the monitor covered by © Spammer's ads? Then nothing on it can be seen or used until they're closed.
const adsUp = () => G.ads.length > 0;
// Are you looking at camera `room` right now? (The monitor is up, on the CAMS tab, showing that room,
// and no ad is covering it.)
const onCam = room => G.cam && G.tab === 'cams' && G.camRoom === room && !adsUp();
// Is the VENTS tab worth having tonight? Only if a vent crawler is switched on, or Ж with its
// ★ Vent crawl (it can climb into the vents, so you need the map to follow it).
const ventsOn = () => G.echo.level > 0 || G.slink.level > 0 || (G.crawler.level > 0 && modOn('crw'));
// Is Ξ Echo (★ Roamer) standing in the doorway on `side` ('L' or 'R') right now?
const echoAtDoor = side => {
  const H = G.echo.hall;
  return !!H && H.step === H.route.length - 1 && H.route[H.step] === side;
};

// Turn seconds into the clock: with 30-second hours, 0-29s is 12 AM, 30-59s is 1 AM, and so on.
const hourOf = t => Math.min(NIGHT_HOURS, Math.floor(t / HOUR_SECONDS));
const hourLabel = h => (h === 0 ? 12 : h) + ' AM';

// Build a fresh night.
function newGame() {
  G = {
    t: 0,                          // seconds since 12 AM
    mode,                          // tonight's mode (see MODES in data.js)
    power: mode === 'generator' ? 0 : 100,   // percent; Generator mode starts empty
    genHeld: false,                // Generator mode: is the generator being held right now?
    genTickT: 0,                   // countdown to the next generator whirr
    dry: mode === 'generator',     // Generator mode: is the power at 0% (everything off)?
    tasks: mode === 'tasks' ? makeTasks() : [],   // Tasks mode: [{ name, need, done }] (seconds of work)
    task: null,                    // Tasks mode: which task you're working on (its number), or null
    doors: { L: false, R: false }, // true = closed
    cam: false,                    // is the monitor raised?
    tab: 'cams',                   // which of the monitor's tabs is showing: 'cams' or 'vents'
    camRoom: 'whall',              // which camera you are looking at
    lureReadyAt: 0,                // the time the next audio lure can be played
    lureRoom: null, lureUntil: 0,  // the vent room you last lured, highlighted on the map until lureUntil
    powerOut: false, outTimer: 0, outBy: null,
    over: false, paused: false,
    staticUntil: 0,                // camera shows static until this time (milliseconds)

    // Tonight's modifiers by id, e.g. { dia: true, tri: false, ... }. A threat at level 0 never gets one.
    // Object.fromEntries turns a list of [key, value] pairs into an object.
    mod: Object.fromEntries(SETUP.map((c, i) => [c.id, mods[i] && levels[i] > 0])),

    // One "mob" (moving object) per shape. Each starts on the stage at step 0 of a route.
    mobs: CREATURES.map((c, i) => ({
      c,                           // its description from data.js
      i,                           // its number (0, 1, 2), used to pick its spot in SLOTS
      level: levels[i],
      route: pick(c.routes),       // the orb picks left or right here
      step: 0,                     // how far along the route it is
      timer: c.interval * (0.7 + Math.random() * 0.6),   // countdown to its next chance to move
      deadline: 0,                 // when standing in a doorway: the moment it gets you
      stalled: false,              // the orb only: waiting at the door because its way in was shut
      stallSides: [],              // which shut doors it's waiting for you to open
      lurkT: 0,                    // ● Patient: countdown to its next soft growl while waiting
      stallT: 0,                   // how long it has been waiting behind a door
      waited: false,               // ● Patient: has it already waited behind a door this visit?
      recent: [],                  // the doors of its last visits, newest first (see chooseRoute)
    })),

    lenny: {
      level: levels[SETUP.indexOf(LENNY)],
      wind: 100,                   // how wound the music box is, in percent
      out: false,                  // has the box run out?
      outTimer: 0,                 // countdown from "out" to game over
      warnT: 0,                    // countdown to the next warning chime
      tickT: 0,                    // countdown to the next winding click
      room: 'prize',               // which camera the box is on (always CAM 7 unless Wanderer is ticked)
      moveT: WANDER_TIME * (0.8 + Math.random() * 0.4),   // Wanderer: countdown to the box's next move
    },

    square: {
      level: levels[SETUP.indexOf(SQUARE)],
      side: null,                  // which door it is at: 'L', 'R', or null when it isn't at one
      stage: 0,                    // 0 = away, 1 = far, 2 = medium, 3 = close
      timer: SQUARE.interval * (0.7 + Math.random() * 0.6),   // countdown to its next chance to move
      pushT: 0,                    // how long the light has been shining on it without a break
      wasLit: false,               // ■ Flinch: was the light on it a moment ago?
    },

    smiley: {
      level: levels[SETUP.indexOf(SMILEY)],
      active: false,               // is (: hiding in the office right now?
      spots: [],                   // which of SMILEY_SPOTS it's in (two of them with the Twins modifier)
      deadline: 0,                 // the moment it gets you if you haven't clicked it
      tickT: SMILEY_TICK,          // countdown to its next chance to wake up on its own
    },

    crawler: {
      level: levels[SETUP.indexOf(CRAWLER)],
      route: pick(CRAWLER.routes), // its path tonight: east or west side (it picks again at CAM 2)
      step: 0,                     // where it is on its route: 0 = CAM 7 ... last = in your office
      timer: CRAWLER.interval * (0.7 + Math.random() * 0.6),   // countdown to its next chance to move
      vent: null,                  // ★ Vent crawl: the vent room it's in ('v1'...'v15'), or null when it isn't
      viaVent: false,              // ★ Vent crawl: did it come into your office through the vents?
      deadline: 0,                 // in your office: the moment it gets you
    },

    flicker: {
      level: levels[SETUP.indexOf(FLICKER)],
      side: null,                  // which door it's at, or null when it's away
      phase: 0,                    // 0 = away; 1 = first door; 2 = jumped to the other door; 3 = back again (Ping-pong)
      flashT: 0,                   // how long the light has been on it without a break
      deadline: 0,                 // the moment it gets you if it isn't flashed
      timer: FLICKER.interval * (0.7 + Math.random() * 0.6),
    },

    visitor: {
      level: levels[SETUP.indexOf(VISITOR)],
      present: false,              // is it in your office right now?
      maskT: 0,                    // how long the mask has been on while it's here
      deadline: 0,                 // the moment it gets you if the mask isn't on
      timer: visitorWait(levels[SETUP.indexOf(VISITOR)]),   // its appearance timer (see updateVisitor)
      faked: false,                // Ψ Double take: has it already faked an exit this visit?
      returnT: 0,                  // Ψ Double take: countdown until it's back after a fake exit
    },

    // The two vent crawlers. Both start in vent V1, VENT_START (see VENTS in data.js).
    echo: ventCrawler(ECHO),
    slink: ventCrawler(SLINK),

    peeker: {
      level: levels[SETUP.indexOf(PEEKER)],
      present: false,              // is it peeking in right now?
      maskT: 0,                    // how long the mask has been on while it's here
      deadline: 0,                 // the moment it gets you if the mask isn't on
      timer: peekerWait(levels[SETUP.indexOf(PEEKER)]),   // its appearance timer
      side: null,                  // ¥ Knock knock: 'L' or 'R' when this visit is at a door (null: the usual peek)
    },

    spammer: {
      level: levels[SETUP.indexOf(SPAMMER)],
      timer: SPAMMER.interval * (0.7 + Math.random() * 0.6),   // countdown to its next ad (only while the monitor is up)
    },
    ads: [],                       // the ads open on the monitor: { id, x, y, text, corner }
    adsVersion: 0,                 // goes up whenever ads change, so render.js knows to redraw them
    nextAdId: 1,
    mask: false,                   // are you wearing the mask?
  };
}

// Tasks mode: TASK_COUNT different tasks picked at random from TASK_NAMES, each needing taskTime() seconds.
// .sort(() => Math.random() - 0.5) shuffles a copy of the list (good enough for a game).
function makeTasks() {
  return TASK_NAMES.slice().sort(() => Math.random() - 0.5).slice(0, TASK_COUNT)
    .map(name => ({ name, need: taskTime(), done: 0 }));
}

// A fresh vent crawler (Ξ Echo or § Slink) for newGame.
function ventCrawler(c) {
  return {
    level: levels[SETUP.indexOf(c)],
    room: VENT_START,            // which vent room it's in
    timer: c.interval * (0.7 + Math.random() * 0.6),   // countdown to its next chance to move
    hall: null,                  // Ξ Roamer: { route, step, deadline } while it's out running the halls
  };
}

// ---------- the main rule loop ----------
function update(dt) {
  G.t += dt;
  // Made it to 6 AM. (Not in Tasks mode: there you win by finishing the tasks, see updateTasks.)
  if (G.mode !== 'tasks' && G.t >= HOUR_SECONDS * NIGHT_HOURS) return win();

  // Generator mode: a quiet start. For the first GEN_QUIET seconds nothing moves (the music box doesn't
  // unwind either), so you can charge up from 0% before the night really begins.
  if (G.mode === 'generator' && G.t < GEN_QUIET) { if (!G.powerOut) updatePower(dt); return; }

  updateLenny(dt);
  if (G.over) return;

  if (!G.powerOut) {
    updatePower(dt);
    if (G.powerOut || G.over) return;
    // The Spammer goes before the tasks, so a task stops on the very moment an ad pops up
    // (an ad pauses the task you're working on until you close it).
    updateSpammer(dt);
    if (G.over) return;
    updateTasks(dt);
    if (G.over) return;
    for (const m of G.mobs) {
      updateMob(m, dt);
      if (G.over) return;
    }
    updateSquare(dt);
    if (G.over) return;
    updateSmiley(dt);
    if (G.over) return;
    updateCrawler(dt);
    if (G.over) return;
    updateFlicker(dt);
    if (G.over) return;
    updateVisitor(dt);
    if (G.over) return;
    updateVentCrawler(G.echo, ECHO, dt);
    if (G.over) return;
    updateVentCrawler(G.slink, SLINK, dt);
    if (G.over) return;
    updatePeeker(dt);
  } else {
    // Power is out: just wait for the shape in the dark.
    G.outTimer -= dt;
    if (G.outTimer <= 0) lose(G.outBy.c, sideOf(G.outBy), true);
  }
}

// Power for this moment: drain it by what's in use, or (Generator mode) charge it while the
// generator is held. Running out means a power-out, except in Generator mode, where everything
// just switches off until you charge again.
function updatePower(dt) {
  const holding = G.mode === 'generator' && (genKey || genPointer);
  if (holding && !G.genHeld) startGenerator();
  G.genHeld = holding;
  if (G.genHeld) {
    G.power = Math.min(100, G.power + GEN_RATE * dt);
    G.dry = false;
    G.genTickT -= dt;
    if (G.genTickT <= 0) { sfx.genTick(G.power / 100); G.genTickT = 0.15; }
    return;
  }
  G.power -= (BASE_DRAIN + UNIT_DRAIN * powerUnits()) * dt * (G.mode === 'generator' ? GEN_COST : 1);
  if (G.power > 0) return;
  if (G.mode !== 'generator') return powerOutStart();
  G.power = 0;
  if (!G.dry) runDry();
}

// Generator mode: you grabbed the generator. Both doors fly open, the monitor drops and the mask
// comes off: while you hold it, you're wide open.
function startGenerator() {
  for (const side of ['L', 'R']) if (G.doors[side]) { G.doors[side] = false; sfx.door(side); }
  if (G.cam) { G.cam = false; maybeWakeSmiley(); }
  if (G.mask) { G.mask = false; sfx.mask(false); }
  sfx.genStart();
  dirty = true;
}

// Generator mode: the power just hit 0%. The doors open and the monitor goes dark (no game over).
function runDry() {
  G.dry = true;
  for (const side of ['L', 'R']) G.doors[side] = false;
  if (G.cam) G.cam = false;
  sfx.powerDown();
  dirty = true;
}

// ---------- Tasks mode ----------
// The task you picked fills up only while you HOLD it (the mouse button on it, or its number key; on
// request), and only while the monitor is up on the TASKS tab (and the power is on).
// Letting go, or an ad popping up, pauses it. Finishing the last one wins the night.
function updateTasks(dt) {
  if (G.mode !== 'tasks' || G.task === null || !taskHeld() || !G.cam || G.tab !== 'tasks' || adsUp()) return;
  const T = G.tasks[G.task];
  T.done = Math.min(T.need, T.done + dt);
  if (T.done < T.need) return;
  G.task = null;
  sfx.taskDone();
  dirty = true;
  if (G.tasks.every(task => task.done >= task.need)) win();
}

// Pick task number i to work on (press it on the TASKS tab, or keys 1 to 4 there). It only fills while
// that press is held (see updateTasks); input.js sets taskPointer / taskKey.
function pickTask(i) {
  if (!G || G.over || G.paused || G.mode !== 'tasks' || !G.cam || G.tab !== 'tasks' || adsUp()) return;
  const T = G.tasks[i];
  if (!T || T.done >= T.need) return;
  G.task = i;
  sfx.click();
  dirty = true;
}

// How many things are using power right now (0 to 5): each closed door, the camera, each lit door light.
// (G.doors.L ? 1 : 0) means "1 if the left door is closed, otherwise 0".
function powerUnits() {
  if (!powered()) return 0;
  return (G.doors.L ? 1 : 0) + (G.doors.R ? 1 : 0) + (G.cam ? 1 : 0)
       + (lightOn('L') ? 1 : 0) + (lightOn('R') ? 1 : 0);
}

// One shape's turn.
function updateMob(m, dt) {
  // Stalled (the orb found its way in shut): wait until you open one of those doors, then attack THAT door.
  if (m.stalled) {
    m.stallT += dt;   // how long it has been waiting behind the door
    // .find() gives the first side in the list whose door is open, or undefined if they're all still shut.
    const opened = m.stallSides.find(side => !G.doors[side]);
    if (!opened) {
      // ● Patient: it growls once it has waited PATIENT_WAIT seconds (that's your cue that it's ready),
      // then again every LURK_EVERY seconds, so you don't forget it's there.
      if (modOn('orb')) {
        m.lurkT -= dt;
        if (m.lurkT <= 0) { sfx.lurk(sideOf(m)); m.lurkT = LURK_EVERY; }
      }
      return;
    }
    m.stalled = false;
    // ● Patient: opened before it had waited long enough? Then it isn't finished with you yet:
    // it still attacks, but shutting the door again only makes it wait all over again.
    if (modOn('orb') && m.stallT < PATIENT_WAIT) m.waited = false;
    // Swap to the route that ends at the opened door. Both orb routes are the same length,
    // so it stays standing in a doorway, just on the other side if needed.
    m.route = m.c.routes.find(route => route[route.length - 1] === opened);
    m.deadline = G.t + reactWindow(m.level);   // the usual few seconds to shut it again
    sfx.rumble(opened);
    dirty = true;
    return;
  }

  // Standing in a doorway: shut door = it knocks and goes away at once; open door when time runs out = game over.
  if (atDoor(m)) {
    const side = sideOf(m);
    if (G.doors[side] && m.c.stalls && modOn('orb') && !m.waited) {
      // ● Patient: the first time you shut it out, it doesn't knock and leave. It waits behind the door
      // (growling). Once it has waited PATIENT_WAIT seconds, open the door and it attacks once more;
      // shut it again in time and THEN it gives up.
      stall(m, [side]);
      return;
    }
    if (G.doors[side]) bounce(m);
    else if (G.t >= m.deadline) lose(m.c, side);
    return;
  }

  // ◆ Charger: it can't move at all while you're watching its room on camera,
  // but while you're not, its countdown runs twice as fast (the extra "m.timer -= dt").
  if (m.c.id === 'dia' && modOn('dia')) {
    if (onCam(m.route[m.step])) return;
    m.timer -= dt;
  }

  // Count down to its next chance to move.
  m.timer -= dt;
  if (m.timer > 0) return;
  m.timer = m.c.interval * (0.85 + Math.random() * 0.3);   // a bit of randomness so it's less predictable

  // ▲ Trickster: while you're looking at the cameras (so you can't see the doorway), it sometimes plays
  // its "trying to get in" sound from far away. The real thing always shows up in the doorway, so
  // lowering the camera to look tells you the truth, but that costs time (and might wake Smiley).
  // (Not from the hall right next to the door, so a fake never plays at the same moment as a real arrival.)
  if (m.c.id === 'tri' && modOn('tri') && G.cam && m.step < m.route.length - 2 && Math.random() < TRICK_CHANCE) {
    sfx.arrive(sideOf(m), m.c.pitch);
  }

  // Roll the dice. Math.random() * 20 is a number from 0 to just under 20.
  // At level 5 it moves when the roll is under 5: a 5 in 20 (25%) chance. At level 20 it always moves.
  // At level 0 the roll is never under 0, so it never moves: that's how "off" works.
  if (Math.random() * MAX_LEVEL >= m.level) return;

  const from = m.route[m.step];
  m.step++;
  if (atDoor(m)) {
    // It just reached a doorway.
    if (m.c.stalls && G.doors.L && G.doors.R) {
      // Both doors shut: the orb doesn't give up. It rumbles and waits for either one (see the top of updateMob).
      stall(m, ['L', 'R']);
    } else if (m.c.stalls && modOn('orb') && G.doors[sideOf(m)]) {
      // ● Patient: even with just its own door shut, it waits behind that door instead of leaving.
      stall(m, [sideOf(m)]);
    } else if (G.doors[sideOf(m)]) {
      // Its door is already shut: it gives up at once.
      bounce(m);
      return;
    } else {
      m.deadline = G.t + reactWindow(m.level);
      if (m.c.unseen) sfx.rumble(sideOf(m)); else sfx.arrive(sideOf(m), m.c.pitch);
    }
  } else {
    // A normal move between rooms: footstep, louder the closer it is.
    sfx.move(m.step / (m.route.length - 1), sideOf(m), m.c.pitch, m.c.loudness);
  }
  // Static on the camera you are watching if something walked in or out of it.
  if (G.cam && (G.camRoom === from || G.camRoom === m.route[m.step])) camStatic(0.35);
  dirty = true;
}

// Pick the next route for a shape. ◆ and ▲ only have one route, so nothing changes for them.
// The orb picks a door at random, but if its last MAX_STREAK visits were all at the same door,
// it must go to the other one this time: still random, just without long one-sided streaks.
function chooseRoute(m) {
  const streak = m.recent.length === MAX_STREAK && m.recent.every(side => side === m.recent[0]);
  if (m.c.routes.length > 1 && streak) {
    return m.c.routes.find(route => route[route.length - 1] !== m.recent[0]);
  }
  return pick(m.c.routes);
}

// The orb starts waiting in the doorway until one of `sides` opens.
// With Patient, this counts as its one wait for this visit (m.waited), and its first growl
// comes exactly when it has waited long enough (PATIENT_WAIT seconds).
function stall(m, sides) {
  m.stalled = true;
  m.stallSides = sides;
  m.stallT = 0;
  m.lurkT = PATIENT_WAIT;
  if (modOn('orb')) m.waited = true;
  sfx.rumble(sideOf(m));
}

// A shape hit a closed door: knock, then back to the stage (the orb may pick a new side).
// It's gone straight away, so you can open the door again right after the knocks.
function bounce(m) {
  sfx.knock(sideOf(m));
  m.waited = false;
  m.recent = [sideOf(m), ...m.recent].slice(0, MAX_STREAK);   // remember the last few doors it visited
  m.route = chooseRoute(m);
  m.step = 0;
  m.timer = m.c.interval * (1 + Math.random() * 0.5);
  if (G.cam && G.camRoom === 'stage') camStatic(0.3);
}

// Lenny's music box: it unwinds all the time, and winds up while you hold W on its camera
// (CAM 7, unless the Wanderer modifier has moved it).
function updateLenny(dt) {
  const L = G.lenny;
  if (L.out) {
    L.outTimer -= dt;
    if (L.outTimer <= 0) loseLenny();
    return;
  }
  const winding = (windKey || windPointer) && onCam(L.room) && !G.powerOut;
  if (modOn('len')) wanderBox(L, dt, winding);
  // At level 0 Lenny is switched off, so the box never unwinds (you can still wind it, harmlessly).
  const change = winding ? WIND_RATE : L.level === 0 ? 0 : -boxDrain(L.level);
  L.wind = Math.max(0, Math.min(100, L.wind + change * dt));   // keep it between 0 and 100

  if (winding && L.wind < 100) {
    L.tickT -= dt;
    if (L.tickT <= 0) { sfx.windTick(); L.tickT = 0.12; }
  }
  if (L.wind <= 0) {
    L.out = true;
    L.outTimer = LENNY_DELAY;
    sfx.boxTune();
    dirty = true;
  } else if (L.wind < BOX_LOW && !winding) {
    L.warnT -= dt;
    if (L.warnT <= 0) { sfx.boxWarn(); L.warnT = 2.5; }
  }
}

// Lenny Wanderer: every so often the box moves to another camera. It only moves while it's well
// wound and you aren't winding it, so it never runs off right when you need it. A chime plays when it moves.
function wanderBox(L, dt, winding) {
  L.moveT -= dt;
  if (L.moveT > 0) return;
  if (winding || L.wind < BOX_LOW) { L.moveT = 3; return; }   // not now: try again in 3 seconds
  const from = L.room;
  L.room = pick(BOX_ROOMS.filter(room => room !== from));     // any box camera except the one it's on
  L.moveT = WANDER_TIME * (0.8 + Math.random() * 0.4);
  sfx.boxMove();
  if (G.cam && (G.camRoom === from || G.camRoom === L.room)) camStatic(0.3);
  dirty = true;
}

// ■ Square: creeps to a door in stages (far, medium, close), then gets you on its next move.
// Only the door light helps: while it shines on the square, the square can't move, and every
// lightPush(level) seconds of steady light shove it back one stage. Off the door entirely at stage 0.
function updateSquare(dt) {
  const S = G.square;
  const lit = S.stage > 0 && lightOn(S.side);

  // ■ Flinch: if the light WAS on it and you take it off (let go of the light or raise the camera)
  // while it's still at your door, it lunges one step closer, but never past close, so a flinch
  // can't kill you by itself. Shutting that door doesn't count: you may need to, to stop another shape.
  if (modOn('sqr') && S.wasLit && !lit && S.stage > 0 && S.stage < 3 && !G.doors[S.side]) {
    S.stage++;
    sfx.lunge(S.side);
    if (S.stage === 3) sfx.creep(S.side);
    dirty = true;
  }
  S.wasLit = lit;

  if (lit) {
    S.pushT += dt;
    if (S.pushT >= lightPush(S.level)) {
      S.pushT = 0;
      sfx.shove(S.side);
      S.stage--;
      if (S.stage === 0) S.side = null;   // pushed all the way off the door
      dirty = true;
    }
    return;   // frozen while lit
  }
  S.pushT = 0;   // letting go of the light loses the progress toward the next push

  S.timer -= dt;
  if (S.timer > 0) return;
  S.timer = SQUARE.interval * (0.85 + Math.random() * 0.3);
  if (Math.random() * MAX_LEVEL >= S.level) return;   // same dice roll as the other shapes

  if (S.stage === 0) {
    S.side = pick(['L', 'R']);   // arrives at a random door, far away
    S.stage = 1;
  } else if (S.stage === 1 && Math.random() < SQUARE_SWAP) {
    S.side = otherSide(S.side);  // at FAR it may sneak over to the other door instead
  } else if (S.stage < 3) {
    S.stage++;
  } else {
    lose(SQUARE, S.side);        // it was already close: that's it
    return;
  }
  // It only makes a sound when it reaches CLOSE: your warning that the next move gets you.
  if (S.stage === 3) sfx.creep(S.side);
  dirty = true;
}

// (: Smiley: once it has woken up, you have until its deadline to click it.
// It can also wake up on its own: every SMILEY_TICK seconds it gets a smaller roll of the dice,
// so you can't keep it asleep forever just by never using the camera.
function updateSmiley(dt) {
  const S = G.smiley;
  if (S.active) {
    if (G.t >= S.deadline) loseSmiley();
    return;
  }
  S.tickT -= dt;
  if (S.tickT <= 0) {
    S.tickT = SMILEY_TICK;
    if (Math.random() < smileyChance(S.level) * SMILEY_SOLO) wakeSmiley();
  }
}

// Lowering the camera might wake Smiley (your full smileyChance roll).
function maybeWakeSmiley() {
  if (Math.random() < smileyChance(G.smiley.level)) wakeSmiley();
}

// Smiley wakes up: it hides in a random spot and giggles from that direction.
// With the Twins modifier, two of them hide in two different spots, and you get 50% more time.
function wakeSmiley() {
  const S = G.smiley;
  if (S.active || G.powerOut) return;
  const twins = modOn('smi');
  const free = SMILEY_SPOTS.slice();   // a copy, so taking spots out doesn't change SMILEY_SPOTS itself
  S.spots = [];
  while (S.spots.length < (twins ? 2 : 1)) {
    S.spots.push(free.splice(Math.floor(Math.random() * free.length), 1)[0]);   // take out one random spot
  }
  S.active = true;
  S.deadline = G.t + smileyTime(S.level) * (twins ? 1.5 : 1);
  // One giggle per (:, from its side of the office: column 0..36 becomes a pan of -0.7..+0.7.
  for (const [, col] of S.spots) sfx.giggle((col / 36) * 1.4 - 0.7);
  dirty = true;
}

// The player clicked (: number i in time (0, or 1 for the second twin). Once all are clicked, it's over.
function catchSmiley(i = 0) {
  const S = G && G.smiley;
  if (!S || G.over || G.paused || !S.active || i >= S.spots.length || !free()) return;
  S.spots.splice(i, 1);
  sfx.pop();
  if (S.spots.length === 0) S.active = false;
  dirty = true;
}

// ---------- Ж Crawler ----------
// It crawls one room at a time along its route: CAM 7 → Stage → Dining, then the east side
// (Supply → East hall) or the west side (Backstage → West hall), then your office.
// ★ Vent crawl: leaving the dining hall it may climb into the vents instead (CRAWL_VENT_CHANCE). Then
// C.vent says which vent room it's in (C.step stays on the dining hall, where it climbed in), and it
// creeps one vent closer at a time, CRAWL_VENT_RATE times as often, until it drops out of V15 into
// your office.
// In your office it gets you after crawlerWindow(level) seconds unless you click it (see pushCrawler).
function updateCrawler(dt) {
  const C = G.crawler;
  const office = C.route.length - 1;
  if (C.step === office) {
    if (G.t >= C.deadline) lose(CRAWLER, null);
    return;
  }
  C.timer -= dt * (C.vent ? CRAWL_VENT_RATE : 1);
  if (C.timer > 0) return;
  C.timer = CRAWLER.interval * (0.85 + Math.random() * 0.3);
  if (Math.random() * MAX_LEVEL >= C.level) return;   // the same dice roll as everyone else

  if (C.vent) {   // in the vents: one vent closer, or out of V15 into your office
    if (C.vent === VENT_EXIT) {
      C.vent = null;
      C.step = office;
      C.deadline = G.t + crawlerWindow(C.level);
      sfx.crawlIn();
    } else {
      C.vent = closerVent(C.vent);
      if (C.vent === VENT_EXIT) sfx.ventNear();   // the same loud bang as Echo and Slink
      else sfx.ventMove(1 - (VENTS[C.vent].dist - 1) / 6);
    }
    dirty = true;
    return;
  }

  const from = C.route[C.step];
  // Leaving the dining hall: flip a coin for the east or the west side. Both routes start the same
  // way (CAM 7, Stage, Dining), so switching routes here doesn't move it.
  if (from === 'dining') {
    if (modOn('crw') && Math.random() < CRAWL_VENT_CHANCE) {
      // ★ Vent crawl: into the vents instead. The tell: a skitter and a clank, and it's on the vent map.
      C.vent = VENT_START;
      C.viaVent = true;
      sfx.crawl(0.5);
      sfx.ventMove(0.3);
      if (G.cam && G.camRoom === 'dining') camStatic(0.3);
      dirty = true;
      return;
    }
    C.route = pick(CRAWLER.routes);
    C.viaVent = false;
  }
  C.step++;
  if (C.step === office) {
    C.deadline = G.t + crawlerWindow(C.level);
    sfx.crawlIn();
  } else {
    sfx.crawl(C.step / office);   // skittering, louder the closer it gets
  }
  if (G.cam && (G.camRoom === from || G.camRoom === C.route[C.step])) camStatic(0.3);
  dirty = true;
}

// The player clicked the Crawler. It only counts where you can actually see it: on its camera
// (not during static), or in your office with the camera down. Each push sends it back ONE room.
// If it came through the vents (★ Vent crawl), pushing it out of your office sends it back into V15.
function pushCrawler() {
  const C = G && G.crawler;
  if (!C || G.over || G.paused || C.step === 0 || C.vent || !free()) return;
  const room = C.route[C.step];
  const seen = room === 'office' ? !G.cam : onCam(room) && performance.now() >= G.staticUntil;
  if (!seen) return;
  if (room === 'office' && C.viaVent) {
    C.vent = VENT_EXIT;
    C.step = C.route.indexOf('dining');   // in the vents it "belongs" to the dining hall, where it climbed in
  } else {
    C.step--;
  }
  C.timer = CRAWLER.interval * (1 + Math.random() * 0.5);   // a short break before it tries again
  sfx.shoo();
  dirty = true;
}

// ★ Vent crawl: the player clicked the vent room the Crawler is in (on the VENTS tab). It goes back
// one vent, away from your office; from V1 it climbs back out to the dining hall (CAM 2).
function pushVentCrawler() {
  const C = G && G.crawler;
  if (!C || G.over || G.paused || !C.vent || !G.cam || G.tab !== 'vents' || !powered() || adsUp()) return;
  const back = VENTS[C.vent].next.filter(r => VENTS[r].dist > VENTS[C.vent].dist);
  C.vent = back.length ? pick(back) : null;   // null: out of V1 and back on CAM 2
  if (!C.vent) C.viaVent = false;
  C.timer = CRAWLER.interval * (1 + Math.random() * 0.5);
  sfx.shoo();
  dirty = true;
}

// ---------- ¤ Flicker ----------
// It turns up at a door. A short flash of that door's light (FLASH_TIME seconds) makes it jump to
// the other door; flash it there too and it leaves (Ping-pong: once more back at the first door).
function updateFlicker(dt) {
  const F = G.flicker;
  if (F.phase > 0) {
    if (lightOn(F.side)) {
      F.flashT += dt;
      if (F.flashT >= FLASH_TIME) {
        F.flashT = 0;
        F.phase++;
        sfx.zap(F.side);
        if (F.phase > (modOn('flk') ? 3 : 2)) {
          F.phase = 0;                                          // flashed enough: it's gone
          F.side = null;
          F.timer = FLICKER.interval * (1 + Math.random() * 0.5);
        } else {
          F.side = otherSide(F.side);                           // it jumps to the other door
          F.deadline = G.t + flickerWindow(F.level);
          sfx.buzz(F.side);
        }
        dirty = true;
      }
      return;
    }
    F.flashT = 0;   // the flash has to be one steady burst
    if (G.t >= F.deadline) lose(FLICKER, F.side);
    return;
  }
  F.timer -= dt;
  if (F.timer > 0) return;
  F.timer = FLICKER.interval * (0.85 + Math.random() * 0.3);
  if (Math.random() * MAX_LEVEL >= F.level) return;
  F.side = pick(['L', 'R']);
  F.phase = 1;
  F.flashT = 0;
  F.deadline = G.t + flickerWindow(F.level);
  sfx.buzz(F.side);
  dirty = true;
}

// ---------- Ψ Visitor and the mask ----------
// It appears in your office. Get the mask on within reactWindow(level) seconds and keep it on for
// MASK_HOLD seconds. Take it off too soon and the count starts over, with the usual few seconds
// to put it back on.
function updateVisitor(dt) {
  const V = G.visitor;
  if (V.present) {
    if (G.mask) {
      V.maskT += dt;
      V.deadline = G.t + reactWindow(V.level);
      if (V.maskT >= MASK_HOLD) {
        V.present = false;
        V.maskT = 0;
        if (modOn('vis') && !V.faked && Math.random() < DOUBLE_TAKE) {
          // Ψ Double take: it only pretends to leave (its exit sound rises at the end) and is
          // back RETURN_DELAY seconds later. It fakes at most once per visit.
          V.faked = true;
          V.returnT = RETURN_DELAY;
          sfx.visitorFake();
        } else {
          V.faked = false;
          V.timer = visitorWait(V.level);   // a fresh random wait until its next visit
          sfx.visitorOut();
        }
        dirty = true;
      }
      return;
    }
    V.maskT = 0;
    if (G.t >= V.deadline) lose(VISITOR, null);
    return;
  }
  // Coming back after a fake exit.
  if (V.returnT > 0) {
    V.returnT -= dt;
    if (V.returnT <= 0) {
      V.present = true;
      V.maskT = 0;
      V.deadline = G.t + reactWindow(V.level);
      sfx.visitorIn();
      dirty = true;
    }
    return;
  }
  // Its appearance timer: a random wait (visitorWait in config.js) that keeps counting down even
  // while you're on the cameras. When it runs out, the Visitor is ready, but it only shows up once
  // you flip the camera down, so you always see it arrive. Level 0: it never comes.
  if (V.level === 0) return;
  V.timer -= dt;
  if (V.timer > 0 || G.cam) return;
  V.present = true;
  V.maskT = 0;
  V.deadline = G.t + reactWindow(V.level);
  sfx.visitorIn();
  dirty = true;
}

// ---------- Ξ Echo, § Slink and the vents ----------
// A vent crawler's turn: every so often it gets the usual chance (its level out of 20) to creep one
// vent closer. It's already in V15 (VENT_EXIT), the last vent? Then this move takes it into your office.
function updateVentCrawler(V, c, dt) {
  if (V.level === 0) return;
  if (V.hall) return updateEchoHall(V, dt);   // Ξ Roamer: out in the building instead
  V.timer -= dt;
  if (V.timer > 0) return;
  V.timer = c.interval * (0.85 + Math.random() * 0.3);
  if (Math.random() * MAX_LEVEL >= V.level) return;
  // ★ Roamer: setting off from V1, Echo sometimes climbs out and runs the halls instead.
  if (c === ECHO && modOn('ech') && V.room === VENT_START && Math.random() < ECHO_HALL_CHANCE) return startEchoHall(V);
  if (V.room === VENT_EXIT) return lose(c, null);
  moveVent(V, closerVent(V.room));
}

// ---------- Ξ Echo's ★ Roamer: the door run ----------
// The reverse of Ж's Vent crawl: Echo drops out of V1 onto the stage and runs Stage → Dining → either
// hall → that door, like the shapes but at its own fast vent pace. It's drawn on the cameras and in the
// doorway (not invisible like ●). Shut that door within the reaction window and it knocks and goes
// back into the vents at V1; lures don't reach it while it's out.
function startEchoHall(V) {
  V.hall = { route: pick(ECHO.routes), step: 0, deadline: 0 };
  sfx.ventMove(0.4);   // the tell: a clank as it drops out of the vent...
  sfx.move(0.2, V.hall.route[V.hall.route.length - 1], ECHO.pitch, ECHO.loudness);   // ...and its first footstep
  if (G.cam && G.camRoom === 'stage') camStatic(0.35);
  dirty = true;
}

function updateEchoHall(V, dt) {
  const H = V.hall;
  const door = H.route.length - 1;            // the last step is the doorway
  const side = H.route[door];                 // 'L' or 'R'
  if (H.step === door) {
    if (G.doors[side]) return echoBackToVents(V, side);   // shut out: back into the vents
    if (G.t >= H.deadline) lose(ECHO, side);
    return;
  }
  V.timer -= dt;
  if (V.timer > 0) return;
  V.timer = ECHO.interval * (0.85 + Math.random() * 0.3);
  if (Math.random() * MAX_LEVEL >= V.level) return;
  const from = H.route[H.step];
  H.step++;
  if (H.step === door) {
    if (G.doors[side]) return echoBackToVents(V, side);   // the door was already shut
    H.deadline = G.t + reactWindow(V.level);
    sfx.arrive(side, ECHO.pitch);
  } else {
    sfx.move(H.step / door, side, ECHO.pitch, ECHO.loudness);   // footsteps, louder the closer it gets
  }
  if (G.cam && (G.camRoom === from || G.camRoom === H.route[H.step])) camStatic(0.35);
  dirty = true;
}

// Shut out (or a power-out): it knocks, if it got to the door, and crawls back into the vents at V1.
function echoBackToVents(V, side) {
  if (side) sfx.knock(side);
  V.hall = null;
  V.room = VENT_START;
  V.timer = ECHO.interval * (1 + Math.random() * 0.5);
  dirty = true;
}

// One of the rooms next to `room` that is a step closer to your office (a random one if there are two).
const closerVent = room => pick(VENTS[room].next.filter(r => VENTS[r].dist < VENTS[room].dist));

// How many steps through the vents it takes to get from room `a` to room `b` (0 if they're the same).
// It spreads out one step at a time: first the rooms next to `a`, then the rooms next to those, and
// so on, until it reaches `b`. (This is called a "breadth-first search".)
function ventSteps(a, b) {
  let ring = [a];
  const seen = new Set(ring);
  for (let steps = 0; ring.length; steps++) {
    if (ring.includes(b)) return steps;
    ring = ring.flatMap(r => VENTS[r].next).filter(r => !seen.has(r) && seen.add(r));
  }
  return Infinity;   // not connected at all (can't happen with today's vents)
}

// Move a vent crawler into `room`, with a metal clank that gets louder the closer it is.
// Reaching V15 (VENT_EXIT, right next to your office) makes a loud bang: that's your warning.
function moveVent(V, room) {
  V.room = room;
  // In V15 it always waits at least ventWindow(level) seconds before its next move (into your office).
  if (room === VENT_EXIT) { V.timer = Math.max(V.timer, ventWindow(V.level)); sfx.ventNear(); }
  else sfx.ventMove(1 - (VENTS[room].dist - 1) / 6);   // dist 7 (V1) → quiet, dist 2 → loud
  dirty = true;
}

// Play an audio lure in vent `room` (by clicking it on the VENTS tab).
// Lures cost no power but need LURE_COOLDOWN seconds to recharge. Each crawler that hears it reacts:
//   Ξ Echo: up to ECHO_HEAR (2) rooms from it, it goes there and stays put for a good while.
//           (Not while it's out running the halls with its ★ Roamer: lures don't reach it there.)
//   § Slink: next to that room, it goes there and stays put for a while; but a lure in its OWN
//           room startles it one vent closer to you (out of V15 means into your office).
function playLure(room) {
  if (!G || G.over || G.paused || !G.cam || G.tab !== 'vents' || !powered() || adsUp()) return;
  if (G.t < G.lureReadyAt) { sfx.deny(); return; }
  G.lureReadyAt = G.t + LURE_COOLDOWN;
  G.lureRoom = room;
  G.lureUntil = G.t + LURE_SHOW;
  sfx.lure();
  // Its next move waits 2 to 3 turns: a lure buys you real time. (It was 1 to 1.5 turns, until the
  // vents were eased so Absolute Nightmare could be beaten.)
  const rest = c => c.interval * (2 + Math.random());

  const E = G.echo;
  const echoHears = ventSteps(E.room, room) <= ECHO_HEAR;   // up to 2 rooms away
  if (E.level > 0 && !E.hall && echoHears) {
    E.room = room;
    E.timer = rest(ECHO);
  }

  const S = G.slink;
  // § Skittish: a lure 2 rooms away startles it too, not just one in its own room. Only the room
  // right next to it lures it safely (the vent map shows exactly where it is, so careful aim works).
  const startles = S.room === room || (modOn('slk') && ventSteps(S.room, room) === SLINK_SKITTISH);
  if (S.level > 0 && startles) {
    sfx.startle();
    if (S.room === VENT_EXIT) return lose(SLINK, null);
    moveVent(S, closerVent(S.room));
  } else if (S.level > 0 && VENTS[S.room].next.includes(room)) {
    S.room = room;
    S.timer = rest(SLINK);
  }
  dirty = true;
}

// ---------- ¥ Peeker ----------
// Its appearance timer counts down all the time, and when it runs out it peeks in straight away,
// even if the monitor is up (you hear a sharp ting). Get the mask on within peekWindow(level)
// seconds and keep it on for PEEK_HOLD seconds. Taking it off too soon starts the count over.
// ★ Knock knock: some visits are at a door instead (P.side). Then the mask does nothing: shut that
// door within peekWindow(level) seconds and it leaves (straight away if the door is already shut).
function updatePeeker(dt) {
  const P = G.peeker;
  if (P.level === 0) return;
  if (P.present && P.side) {
    if (G.doors[P.side]) peekOut();
    else if (G.t >= P.deadline) lose(PEEKER, P.side);
    return;
  }
  if (P.present) {
    if (G.mask) {
      P.maskT += dt;
      P.deadline = G.t + peekWindow(P.level);
      if (P.maskT >= PEEK_HOLD) peekOut();
      return;
    }
    P.maskT = 0;
    if (G.t >= P.deadline) lose(PEEKER, null);
    return;
  }
  P.timer -= dt;
  if (P.timer <= 0) peekIn();
}

function peekIn() {
  const P = G.peeker;
  P.present = true;
  P.maskT = 0;
  P.deadline = G.t + peekWindow(P.level);
  // ★ Knock knock: half its visits are at a door. The ting comes from that side (the tell).
  P.side = modOn('pek') && Math.random() < PEEK_DOOR_CHANCE ? pick(['L', 'R']) : null;
  sfx.peekIn(P.side);
  dirty = true;
}

// It's sent away (by the mask, or by a shut door): a fresh random wait until its next visit.
function peekOut() {
  const P = G.peeker;
  sfx.peekOut(P.side);
  P.present = false;
  P.maskT = 0;
  P.side = null;
  P.timer = peekerWait(P.level);
  dirty = true;
}

// ---------- © Spammer ----------
// While the monitor is up, it gets its usual chance every so often to pop up an ad over it. An ad
// covers the whole monitor, whatever tab you're on: until you close it you can't see or use anything
// on the monitor (cameras, winding, lures, tasks; see adsUp). Ads stay until you close them, even if
// you lower the monitor. ADS_MAX open at once: crash.
function updateSpammer(dt) {
  const S = G.spammer;
  if (S.level === 0 || !G.cam) return;
  S.timer -= dt;
  if (S.timer > 0) return;
  S.timer = SPAMMER.interval * (0.85 + Math.random() * 0.3);
  if (Math.random() * MAX_LEVEL >= S.level) return;
  G.ads.push({
    id: G.nextAdId++,
    // Each ad covers (nearly) the whole monitor; this small random nudge, in %, makes a stack of
    // them look like a pile, so you can see how many are open.
    x: Math.random() * 6, y: Math.random() * 8,
    text: pick(AD_TEXT),
    corner: modOn('spm') ? pick(['tl', 'tr', 'bl', 'br']) : 'tr',   // ★ Sneaky: the [X] can be in any corner
  });
  G.adsVersion++;
  sfx.adPop();
  dirty = true;
  if (G.ads.length >= ADS_MAX) lose(SPAMMER, null);
}

// The player clicked an ad's [X]. It only works while the monitor is up (that's where the ads are).
function closeAd(id) {
  if (!G || G.over || G.paused || !G.cam) return;
  const i = G.ads.findIndex(ad => ad.id === id);
  if (i < 0) return;
  G.ads.splice(i, 1);
  G.adsVersion++;
  sfx.adClose();
  dirty = true;
}

// Switch the monitor to one of its tabs ('cams', 'vents' or 'tasks'), raising it first if it's down.
// VENTS only exists when a vent crawler is on, and TASKS only in Tasks mode.
function setTab(tab) {
  if (!G || G.over || G.paused) return;
  if (tab === 'vents' && !ventsOn()) return;
  if (tab === 'tasks' && G.mode !== 'tasks') return;
  if (!powered() || !free() || G.mask) { sfx.deny(); return; }
  if (!G.cam) sfx.cam();
  G.cam = true;
  if (G.tab !== tab) { G.tab = tab; sfx.click(); }
  dirty = true;
}

// Put the mask on or take it off (W in the office, or the Mask button). It can't be used while
// you're on the cameras, and while it's on the cameras can't be raised.
function toggleMask() {
  if (!G || G.over || G.paused) return;
  if (G.cam || !free()) { sfx.deny(); return; }
  G.mask = !G.mask;
  sfx.mask(G.mask);
  dirty = true;
}

// Show static on the camera for `sec` seconds.
// performance.now() is the time in milliseconds since the page opened.
function camStatic(sec) {
  G.staticUntil = performance.now() + sec * 1000;
  sfx.stat();
}

// Power hit 0%: doors open, camera dies, and one of the visible shapes comes for you soon.
function powerOutStart() {
  G.power = 0;
  G.powerOut = true;
  G.doors.L = G.doors.R = false;
  G.cam = false;
  G.outTimer = 5 + Math.random() * 8;                     // 5 to 13 seconds of darkness
  // ◆ or ▲ (never the invisible orb), preferring one that's switched on. If both are at level 0,
  // one of them still comes: running out of power is always deadly.
  const visible = G.mobs.filter(m => !m.c.unseen);
  const active = visible.filter(m => m.level > 0);
  G.outBy = pick(active.length ? active : visible);
  G.smiley.active = false;                                // in the dark there's nothing to find
  G.flicker.phase = 0; G.flicker.side = null;             // and the Flicker and Visitor give up too
  G.visitor.present = false; G.visitor.returnT = 0;
  G.peeker.present = false; G.peeker.side = null;
  if (G.echo.hall) echoBackToVents(G.echo, null);          // Ξ out in the halls slinks back into the vents
  G.peeker.timer = 999;                                   // ¥ doesn't come in the dark either
  sfx.humOff();
  sfx.powerDown();
  dirty = true;
}

// ---------- things the player does (called from input.js) ----------
function toggleDoor(side) {
  if (!G || G.over || G.paused) return;
  if (!powered() || !free()) { sfx.deny(); return; }   // no power, or busy with the generator
  G.doors[side] = !G.doors[side];   // flip: open becomes closed, closed becomes open
  sfx.door(side);
  dirty = true;
}

function toggleCam() {
  if (!G || G.over || G.paused) return;
  if (!powered() || !free() || G.mask) { sfx.deny(); return; }   // no monitor without power, while charging, or with the mask on
  G.cam = !G.cam;
  sfx.cam();
  if (G.cam) camStatic(0.2);
  else maybeWakeSmiley();   // just looked back at the office: was something hiding while you weren't?
  dirty = true;
}

// Jump to a camera (raising the camera first if needed).
function setCam(room) {
  if (!G || G.over || G.paused) return;
  if (!powered() || !free() || G.mask) { sfx.deny(); return; }
  G.cam = true;
  G.tab = 'cams';
  G.camRoom = room;
  sfx.cam();
  camStatic(0.22);
  dirty = true;
}

function setPaused(p) {
  if (!G || G.over) return;
  G.paused = p;
  showPause(p);
  if (p) sfx.humOff();
  else if (!G.powerOut) sfx.humOn();
  if (!p) wakeLoop();   // the loop stops while paused (main.js), so start it again
}

function startNight() {
  sfx.init();
  store.set('levels', levels);
  windKey = windPointer = false;
  genKey = genPointer = false;
  taskKey = taskPointer = false;
  lightKey.L = lightKey.R = lightPointer.L = lightPointer.R = false;
  newGame();
  analytics.nightStart();   // count it (analytics.js)
  hideScare();
  showPause(false);
  show('game');
  sfx.humOn();
  dirty = true;
  wakeLoop();   // start the game loop (main.js); it stops by itself when the night ends
}

// ---------- how a night ends ----------
function win() {
  G.over = true;
  sfx.humOff();
  sfx.chime();
  // The score: all the levels added up, plus the modifier bonuses (see nightScore at the top).
  const sum = nightScore();
  const isBest = !best || sum > best.sum;
  if (isBest) {
    best = { sum, levels: levels.slice(), mods: mods.slice(), mode };
    store.set('best', best);
  }
  // Was tonight one of the challenges? Then it earns its ✓ (if it didn't have one already).
  const challenge = matchingPreset();
  const firstTime = !!challenge && !cleared.includes(clearKey(challenge));
  if (firstTime) {
    cleared.push(clearKey(challenge));
    savedTicks.push(clearKey(challenge));
    store.set('cleared', savedTicks);   // the full list, so nothing saved earlier is lost
  }
  analytics.win(isBest, challenge, firstTime);
  showWin(sum, isBest, challenge, firstTime);
}

// Add one to threat c's kill tally, save it, and return a line for the game over screen
// like "Diamond has got you 3 times." (The tally itself is `kills`, near the top of this file.)
function countKill(c) {
  kills[c.id] = (kills[c.id] || 0) + 1;
  store.set('kills', kills);
  const n = kills[c.id];
  return `<br><span class="dim">${c.name} has got you ${n === 1 ? 'once' : n + ' times'}.</span>`;
}

// A threat (c, from data.js) got you through door `side` ('L' or 'R'), or straight in your office
// when side is null (the Crawler and the Visitor). `dark` is true when the power had run out.
function lose(c, side, dark = false) {
  G.over = true;
  sfx.humOff();
  sfx.scream();
  analytics.death(c.id, side, dark);   // count who got you (analytics.js)
  const when = hourLabel(hourOf(G.t));
  const how = side ? `came through the ${side === 'L' ? 'LEFT door' : 'RIGHT door'}`
    : c.how || 'got you in your office';   // some threats have their own words (`how` in data.js)
  const message = (dark
    ? `The power ran out. ${symHtml(c)} found you in the dark at ${when}.`
    : `${symHtml(c)} ${how} at ${when}.`) + countKill(c);
  // The jumpscare. Ж ¤ Ψ have a big drawing of their own (SPRITES in art.js), shown at double size;
  // the shapes are drawn huge, filling a 44 x 22 grid with their symbol.
  const big = SPRITES[c.id] && SPRITES[c.id].scare;
  if (big) {
    const g = Array.from({ length: big.length }, () => Array.from({ length: Math.max(...big.map(l => l.length)) }, () => ({ ch: ' ', cls: '' })));
    sprite(g, 0, 0, big, c);
    showScare(message, `<span class="scare-big">${toHtml(g)}</span>`);
    return;
  }
  const W = 44, H = 22;
  const g = Array.from({ length: H }, () => Array.from({ length: W }, () => ({ ch: ' ', cls: '' })));
  stamp(g, 0, 0, c, W, H);
  showScare(message, toHtml(g));
}

function loseSmiley() {
  G.over = true;
  sfx.humOff();
  sfx.scream();
  analytics.death(SMILEY.id, null, false);
  const message = `You didn't find ${symHtml(SMILEY)} in time. It got you at ${hourLabel(hourOf(G.t))}.` + countKill(SMILEY);
  showScare(message, `<span class="bigface s-smi">${SMILEY.sym}</span>`);
}

function loseLenny() {
  G.over = true;
  sfx.humOff();
  sfx.scream();
  analytics.death(LENNY.id, null, false);
  const message = `The music box ran down. ${symHtml(LENNY)} got out at ${hourLabel(hourOf(G.t))}.` + countKill(LENNY);
  showScare(message, `<span class="bigface">${LENNY_FACE}</span>`);
}
