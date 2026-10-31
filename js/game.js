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

let best = store.get('best', null);   // hardest night survived: { sum, levels } or null

// ---------- the current night ----------
let G = null;        // all the state of the night in progress (built by newGame)
let dirty = true;    // "something changed, redraw now" (render.js also redraws 15x a second anyway)
let windKey = false, windPointer = false;   // is W held down / is the Wind button held down?
// Is each door light's key (Q / E) or on-screen button held down right now?
const lightKey = { L: false, R: false }, lightPointer = { L: false, R: false };

// Small questions about a shape `m` (one entry of G.mobs):
const sideOf = m => m.route[m.route.length - 1];   // which door it is heading for: 'L' or 'R'
const atDoor = m => m.step === m.route.length - 1;  // is it standing in that doorway right now?

// Is a door light actually shining? You have to hold it, look at the office (camera down) and have power.
const lightOn = side => (lightKey[side] || lightPointer[side]) && !G.cam && !G.powerOut;
const otherSide = side => side === 'L' ? 'R' : 'L';

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

    // One "mob" (moving object) per shape. Each starts on the stage at step 0 of a route.
    mobs: CREATURES.map((c, i) => ({
      c,                           // its description from data.js
      i,                           // its number (0, 1, 2), used to pick its spot in SLOTS
      level: levels[i],
      route: pick(c.routes),       // the orb picks left or right here
      step: 0,                     // how far along the route it is
      timer: c.interval * (0.7 + Math.random() * 0.6),   // countdown to its next chance to move
      deadline: 0,                 // when standing in a doorway: the moment it gets you
      stalled: false,              // the orb only: waiting at the door because both doors were shut
    })),

    lenny: {
      level: levels[SETUP.indexOf(LENNY)],
      wind: 100,                   // how wound the music box is, in percent
      out: false,                  // has the box run out?
      outTimer: 0,                 // countdown from "out" to game over
      warnT: 0,                    // countdown to the next warning chime
      tickT: 0,                    // countdown to the next winding click
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
      spot: null,                  // which of SMILEY_SPOTS it is in
      deadline: 0,                 // the moment it gets you if you haven't clicked it
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
    updateSmiley();
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
  // Stalled (the orb found both doors shut): wait until you open one, then attack THAT door.
  if (m.stalled) {
    const opened = !G.doors.L ? 'L' : !G.doors.R ? 'R' : null;   // null = both still shut
    if (!opened) return;
    m.stalled = false;
    // Swap to the route that ends at the opened door. Both orb routes are the same length,
    // so it stays standing in a doorway, just on the other side if needed.
    m.route = m.c.routes.find(route => route[route.length - 1] === opened);
    m.deadline = G.t + reactWindow(m.level);   // the usual few seconds to shut it again
    sfx.rumble(opened);
    dirty = true;
    return;
  }

  // Standing in a doorway: shut door = it goes away; open door when time runs out = game over.
  if (atDoor(m)) {
    if (G.doors[sideOf(m)]) bounce(m);
    else if (G.t >= m.deadline) lose(m.c, sideOf(m));
    return;
  }

  // Count down to its next chance to move.
  m.timer -= dt;
  if (m.timer > 0) return;
  m.timer = m.c.interval * (0.85 + Math.random() * 0.3);   // a bit of randomness so it's less predictable

  // Roll the dice. Math.random() * 20 is a number from 0 to just under 20.
  // At level 5 it moves when the roll is under 5: a 5 in 20 (25%) chance. At level 20 it always moves.
  // At level 0 the roll is never under 0, so it never moves: that's how "off" works.
  if (Math.random() * MAX_LEVEL >= m.level) return;

  const from = m.route[m.step];
  m.step++;
  if (atDoor(m)) {
    // It just reached a doorway.
    if (m.c.stalls && G.doors.L && G.doors.R) {
      // Both doors shut: the orb doesn't give up. It rumbles and waits (see the top of updateMob).
      m.stalled = true;
      sfx.rumble(sideOf(m));
    } else if (G.doors[sideOf(m)]) {
      // Its door is already shut: it gives up at once.
      bounce(m);
      return;
    } else {
      m.deadline = G.t + reactWindow(m.level);
      if (m.c.unseen) sfx.rumble(sideOf(m)); else sfx.step(sideOf(m));
    }
  } else {
    // A normal move between rooms: footstep, louder the closer it is.
    sfx.move(m.step / (m.route.length - 1), sideOf(m), m.c.pitch);
  }
  // Static on the camera you are watching if something walked in or out of it.
  if (G.cam && (G.camRoom === from || G.camRoom === m.route[m.step])) camStatic(0.35);
  dirty = true;
}

// A shape hit a closed door: knock, then back to the stage (the orb may pick a new side).
function bounce(m) {
  sfx.knock(sideOf(m));
  m.route = pick(m.c.routes);
  m.step = 0;
  m.timer = m.c.interval * (1 + Math.random() * 0.5);
  if (G.cam && G.camRoom === 'stage') camStatic(0.3);
}

// Lenny's music box: it unwinds all the time, and winds up while you hold W on CAM 7.
function updateLenny(dt) {
  const L = G.lenny;
  if (L.out) {
    L.outTimer -= dt;
    if (L.outTimer <= 0) loseLenny();
    return;
  }
  const winding = (windKey || windPointer) && G.cam && G.camRoom === 'prize' && !G.powerOut;
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

// ■ Square: creeps to a door in stages (far, medium, close), then gets you on its next move.
// Only the door light helps: while it shines on the square, the square can't move, and every
// lightPush(level) seconds of steady light shove it back one stage. Off the door entirely at stage 0.
function updateSquare(dt) {
  const S = G.square;

  if (S.stage > 0 && lightOn(S.side)) {
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
  dirty = true;
}

// (: Smiley: once it has woken up, you have until its deadline to click it.
function updateSmiley() {
  const S = G.smiley;
  if (S.active && G.t >= S.deadline) loseSmiley();
}

// Lowering the camera might wake Smiley. It hides in a random spot and giggles from that direction.
function maybeWakeSmiley() {
  const S = G.smiley;
  if (S.active || G.powerOut || Math.random() >= smileyChance(S.level)) return;
  S.active = true;
  S.spot = pick(SMILEY_SPOTS);
  S.deadline = G.t + smileyTime(S.level);
  sfx.giggle((S.spot[1] / 36) * 1.4 - 0.7);   // column 0..36 of the office becomes a pan of -0.7..+0.7
  dirty = true;
}

// The player clicked (: in time.
function catchSmiley() {
  if (!G || G.over || G.paused || !G.smiley.active) return;
  G.smiley.active = false;
  sfx.pop();
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
  // Add up all the levels: reduce() walks the list keeping a running total.
  const sum = levels.reduce((total, lv) => total + lv, 0);
  const isBest = !best || sum > best.sum;
  if (isBest) {
    best = { sum, levels: levels.slice() };
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
