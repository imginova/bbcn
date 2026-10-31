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

let best = store.get('best', null);   // hardest night survived: { sum, levels, mods } or null

// A night's score: every level added up, plus MOD_BONUS for each ticked modifier
// (only when that threat is switched on: a modifier on a level-0 threat does nothing).
const nightScore = () => SETUP.reduce((total, c, i) => total + levels[i] + (mods[i] && levels[i] > 0 ? MOD_BONUS : 0), 0);
const MAX_SCORE = SETUP.length * (MAX_LEVEL + MOD_BONUS);   // 6 x 25 = 150

// ---------- the current night ----------
let G = null;        // all the state of the night in progress (built by newGame)
let dirty = true;    // "something changed, redraw now" (render.js also redraws 15x a second anyway)
let windKey = false, windPointer = false;   // is W held down / is the Wind button held down?
// Is each door light's key (Q / E) or on-screen button held down right now?
const lightKey = { L: false, R: false }, lightPointer = { L: false, R: false };

// Small questions about a shape `m` (one entry of G.mobs):
const sideOf = m => m.route[m.route.length - 1];   // which door it is heading for: 'L' or 'R'
const atDoor = m => m.step === m.route.length - 1;  // is it standing in that doorway right now?

// Is a door light actually shining? You have to hold it, look at the office (camera down), have power,
// and have that door OPEN: a shut door blocks the light, so you can't see or push back ■ through it.
const lightOn = side => (lightKey[side] || lightPointer[side]) && !G.cam && !G.powerOut && !G.doors[side];
const otherSide = side => side === 'L' ? 'R' : 'L';

// Is a threat's modifier active tonight? modOn('dia') asks about the ◆ Diamond, and so on.
const modOn = id => G.mod[id];

// Turn seconds into the clock: with 30-second hours, 0-29s is 12 AM, 30-59s is 1 AM, and so on.
const hourOf = t => Math.min(NIGHT_HOURS, Math.floor(t / HOUR_SECONDS));
const hourLabel = h => (h === 0 ? 12 : h) + ' AM';

// Build a fresh night.
function newGame() {
  G = {
    t: 0,                          // seconds since 12 AM
    power: 100,                    // percent
    doors: { L: false, R: false }, // true = closed
    cam: false,                    // is the camera raised?
    camRoom: 'whall',              // which camera you are looking at
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
    },

    smiley: {
      level: levels[SETUP.indexOf(SMILEY)],
      active: false,               // is (: hiding in the office right now?
      spots: [],                   // which of SMILEY_SPOTS it's in (two of them with the Twins modifier)
      deadline: 0,                 // the moment it gets you if you haven't clicked it
      tickT: SMILEY_TICK,          // countdown to its next chance to wake up on its own
    },
  };
}

// ---------- the main rule loop ----------
function update(dt) {
  G.t += dt;
  if (G.t >= HOUR_SECONDS * NIGHT_HOURS) return win();   // made it to 6 AM

  updateLenny(dt);
  if (G.over) return;

  if (!G.powerOut) {
    G.power -= (BASE_DRAIN + UNIT_DRAIN * powerUnits()) * dt;
    if (G.power <= 0) return powerOutStart();
    for (const m of G.mobs) {
      updateMob(m, dt);
      if (G.over) return;
    }
    updateSquare(dt);
    if (G.over) return;
    updateSmiley(dt);
  } else {
    // Power is out: just wait for the shape in the dark.
    G.outTimer -= dt;
    if (G.outTimer <= 0) lose(G.outBy.c, sideOf(G.outBy), true);
  }
}

// How many things are using power right now (0 to 5): each closed door, the camera, each lit door light.
// (G.doors.L ? 1 : 0) means "1 if the left door is closed, otherwise 0".
function powerUnits() {
  if (G.powerOut) return 0;
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
    if (G.cam && G.camRoom === m.route[m.step]) return;
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
  const winding = (windKey || windPointer) && G.cam && G.camRoom === L.room && !G.powerOut;
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

  if (S.stage > 0 && lightOn(S.side)) {
    S.pushT += dt;
    // ■ Bold: it takes BOLD_SLOW times as much light to push it back each stage.
    if (S.pushT >= lightPush(S.level) * (modOn('sqr') ? BOLD_SLOW : 1)) {
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
  if (!S || G.over || G.paused || !S.active || i >= S.spots.length) return;
  S.spots.splice(i, 1);
  sfx.pop();
  if (S.spots.length === 0) S.active = false;
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
  sfx.humOff();
  sfx.powerDown();
  dirty = true;
}

// ---------- things the player does (called from input.js) ----------
function toggleDoor(side) {
  if (!G || G.over || G.paused) return;
  if (G.powerOut) { sfx.deny(); return; }
  G.doors[side] = !G.doors[side];   // flip: open becomes closed, closed becomes open
  sfx.door(side);
  dirty = true;
}

function toggleCam() {
  if (!G || G.over || G.paused) return;
  if (G.powerOut) { sfx.deny(); return; }
  G.cam = !G.cam;
  sfx.cam();
  if (G.cam) camStatic(0.2);
  else maybeWakeSmiley();   // just looked back at the office: was something hiding while you weren't?
  dirty = true;
}

// Jump to a camera (raising the camera first if needed).
function setCam(room) {
  if (!G || G.over || G.paused) return;
  if (G.powerOut) { sfx.deny(); return; }
  G.cam = true;
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
}

function startNight() {
  sfx.init();
  store.set('levels', levels);
  windKey = windPointer = false;
  lightKey.L = lightKey.R = lightPointer.L = lightPointer.R = false;
  newGame();
  hideScare();
  showPause(false);
  show('game');
  sfx.humOn();
  dirty = true;
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
    best = { sum, levels: levels.slice(), mods: mods.slice() };
    store.set('best', best);
  }
  showWin(sum, isBest);
}

// A shape (c, from data.js) got you through door `side`. `dark` is true when the power had run out.
function lose(c, side, dark = false) {
  G.over = true;
  sfx.humOff();
  sfx.scream();
  const when = hourLabel(hourOf(G.t));
  const doorName = side === 'L' ? 'LEFT door' : 'RIGHT door';
  const message = dark
    ? `The power ran out. ${symHtml(c)} found you in the dark at ${when}.`
    : `${symHtml(c)} came through the ${doorName} at ${when}.`;
  // The jumpscare: the shape drawn huge, filling a 44 x 22 grid.
  const W = 44, H = 22;
  const g = Array.from({ length: H }, () => Array.from({ length: W }, () => ({ ch: ' ', cls: '' })));
  stamp(g, 0, 0, c, W, H);
  showScare(message, toHtml(g));
}

function loseSmiley() {
  G.over = true;
  sfx.humOff();
  sfx.scream();
  const message = `You didn't find ${symHtml(SMILEY)} in time. It got you at ${hourLabel(hourOf(G.t))}.`;
  showScare(message, `<span class="bigface s-smi">${SMILEY.sym}</span>`);
}

function loseLenny() {
  G.over = true;
  sfx.humOff();
  sfx.scream();
  const message = `The music box ran down. ${symHtml(LENNY)} got out at ${hourLabel(hourOf(G.t))}.`;
  showScare(message, `<span class="bigface">${LENNY_FACE}</span>`);
}
