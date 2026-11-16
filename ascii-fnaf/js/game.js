/* =====================================================================
   game.js: the RULES. How the night plays out, moment to moment.

   Everything about one night lives in a single object called G
   (time, power, doors, camera, where every character is...). The rules
   change G; render.js then draws whatever G says.

   The heart is update(dt), which main.js calls about 60 times a second.
   `dt` ("delta time") is how many seconds passed since the last call,
   for example 0.016. Multiplying every speed by dt keeps the game
   running at the same pace on fast and slow computers:
       power -= drainPerSecond * dt
   ===================================================================== */

// ---------- saved between nights ----------
// The level picked for each character in SETUP. Loaded from the browser; missing ones default to 0.
let levels = (store.get('levels', []) || []).slice(0, SETUP.length);
while (levels.length < SETUP.length) levels.push(0);
levels = levels.map(clampLevel);
if (levels.every(l => l === 0)) levels = PRESETS[0].levels.slice();   // first visit: start on Warm-up

let best = store.get('best', null);   // hardest night survived: { sum, levels } or null

// How many times each character has got you, by its id: { fre: 3, bon: 1, ... }. Saved in the browser
// and shown on the game over and custom night screens (on request, like ASCII Nights).
let kills = store.get('kills', {}) || {};
// Add one to `id`'s tally, save it, and return a line for the game over screen like
// "Bonnie has got you 3 times." (`name` is what the line calls it.)
function countKill(id, name) {
  kills[id] = (kills[id] || 0) + 1;
  store.set('kills', kills);
  const n = kills[id];
  return `<br><span class="dim">${name} has got you ${n === 1 ? 'once' : n + ' times'}.</span>`;
}

// The challenges (from PRESETS) you've survived, saved by clearKey (name plus version, see data.js).
// RULE: the only saved ✓s ever deleted are those of challenges that got harder, which shows as their
// version going up. Everything else stays saved, even a ✓ this version of the game doesn't recognise.
// So there are two lists:
//   savedTicks: everything saved, minus outdated versions; this is the one written back;
//   cleared:    the ones that count today (a ✓ is shown only for these).
// outdated(key) is true for a key like "Toy box v1" when Toy box is now on a higher version.
const outdated = key => {
  const m = /^(.*) v(\d+)$/.exec(key);   // m[1] is the name, m[2] the version number
  const p = m && PRESETS.find(p => p.name === m[1]);
  return !!p && (p.v || 1) > Number(m[2]);
};
const savedTicks = [...new Set(store.get('cleared', []) || [])].filter(key => !outdated(key));
store.set('cleared', savedTicks);
let cleared = savedTicks.filter(key => PRESETS.some(p => clearKey(p) === key));

// Which challenge matches tonight's levels EXACTLY, or null if none does.
// (Picking a challenge and then changing a level doesn't count.)
const matchingPreset = () => PRESETS.find(p => p.levels.every((lv, i) => lv === levels[i])) || null;

// A night's score: every level added up. The most is 17 x 20 = 340.
const nightScore = () => levels.reduce((total, lv) => total + lv, 0);
const MAX_SCORE = SETUP.length * MAX_LEVEL;

// ---------- the current night ----------
let G = null;        // all the state of the night in progress (built by newGame)
let dirty = true;    // "something changed, redraw now" (render.js also redraws 15x a second anyway)

// The flashlight shines while F, the right mouse button or the Flashlight button is held down.
let flashKey = false, flashMouse = false, flashButton = false;
// Where the mouse pointer is aiming, worked out by input.js:
//   where  'office' (over the office picture), 'feed' (over the camera picture) or null
//   r, c   the row and column of the character under the pointer, in that picture
//   x, y   the pointer's position in pixels inside the view (for drawing the light)
const aim = { where: null, r: 0, c: 0, x: 0, y: 0 };

// Is there power to use things right now? Not after a power-out.
const powered = () => !G.powerOut;
// Has BB run off with the flashlight?
const lightStolen = () => G.t < G.bb.stolenUntil;
// Is the flashlight on? It needs power, and BB mustn't have it. It works on the office AND the cameras.
const flashOn = () => (flashKey || flashMouse || flashButton) && powered() && !lightStolen();
// Is the light's oval around the pointer on row r, column c? (dx / BEAM_COLS)² + (dy / BEAM_ROWS)² <= 1
// is the maths for "inside that oval".
const inBeam = (r, c) => {
  const dx = (aim.c - c) / BEAM_COLS, dy = (aim.r - r) / BEAM_ROWS;
  return dx * dx + dy * dy <= 1;
};
// Is the flashlight shining on row r, column c of the office?
const beamOn = (r, c) => flashOn() && !G.cam && aim.where === 'office' && inBeam(r, c);
// Is the flashlight shining on row r, column c of the camera picture you're looking at?
const camsShowing = () => G.cam && G.tab === 'cams';
const beamOnFeed = (r, c) => flashOn() && camsShowing() && aim.where === 'feed' && inBeam(r, c);
// Is the flashlight shining into doorway `side` ('L' or 'R')? Anywhere over the doorway counts.
const doorLit = side => flashOn() && !G.cam && aim.where === 'door' + side;
// Are you looking at camera `room` right now?
const onCam = room => camsShowing() && G.camRoom === room;
// Is the VENTS tab worth showing tonight? Only if something with a level is in the vents.
const ventsOn = () => [...CRAWLERS, FENDO].some(c => levelOf(c) > 0);

// Turn seconds into the clock: with 30-second hours, 0-29s is 12 AM, 30-59s is 1 AM, and so on.
const hourOf = t => Math.min(NIGHT_HOURS, Math.floor(t / HOUR_SECONDS));
const hourLabel = h => (h === 0 ? 12 : h) + ' AM';

// The level of character c tonight (c is one of the descriptions in data.js, like BONNIE).
const levelOf = c => levels[SETUP.indexOf(c)];

// A vent crawler's state: which vent it's in, its move timer, and (once it climbs in) whether
// it's in your office and how long the mask has been on.
const crawler = c => ({ level: levelOf(c), room: VENT_START, timer: c.interval * rand(0.7, 1.3), stall: 0,
  readyAt: 0, present: false, maskT: 0, deadline: 0 });

// Build a fresh night.
function newGame() {
  G = {
    t: 0,                          // seconds since 12 AM
    power: 100,                    // percent
    doors: { L: false, R: false }, // true = closed
    cam: false,                    // is the monitor raised?
    tab: 'cams',                   // which tab the monitor shows: 'cams' or 'vents'
    camRoom: 'stage',              // which camera you are looking at
    closedOn: 'stage',             // the camera the monitor was last put down on (the Crying Child avoids it)
    mask: false,                   // are you wearing the mask?
    powerOut: false, outTimer: 0,
    over: false, paused: false,
    staticUntil: 0,                // camera shows static until this time (milliseconds)
    lure: null, lureReady: 0,      // the audio lure playing now ({ room, until }), and when the next one is allowed
    blocked: null,                 // a lure refused because Freddy Endo is in that vent ({ room, until })
    ventSel: VENT_EXIT,            // the vent the arrow keys have picked on the VENTS tab (Enter lures it)
    scareUntil: 0,                 // BB's little jumpscare shows until this time (milliseconds)

    // Freddy: `step` counts his laughs on this trip, `side` is the door he's heading for.
    fre: { level: levelOf(FREDDY), side: 'L', step: 0, timer: FREDDY_INTERVAL * rand(0.7, 1.3), deadline: 0 },
    // Bonnie and Chica: how far along their route they are (the last step is the doorway).
    bon: { level: levelOf(BONNIE), step: 0, timer: BONNIE_INTERVAL * rand(0.7, 1.3), deadline: 0 },
    chi: { level: levelOf(CHICA), step: 0, timer: CHICA_INTERVAL * rand(0.7, 1.3), deadline: 0 },
    // Foxy: 'cove' (stage 0 curtain shut, 1 peeking, 2 half out) or 'run' (on his way to the left door).
    fox: { level: levelOf(FOXY), phase: 'cove', stage: 0, timer: FOXY_INTERVAL * rand(0.7, 1.3), runT: 0, flashT: 0 },
    // Golden Freddy: only there right after you flip the monitor down.
    gol: { level: levelOf(GOLDEN), present: false, deadline: 0 },
    // Freddy Endo: the vent he's wandering in.
    fen: { level: levelOf(FENDO), room: pick(VENT_LIST.filter(n => n !== VENT_START && n !== VENT_EXIT)), timer: endoMove(levelOf(FENDO)) },
    // Toy Freddy: his appearance timer, and how long the mask has been on while he's here.
    tfr: { level: levelOf(TFREDDY), present: false, maskT: 0, deadline: 0, timer: toyFreddyWait(levelOf(TFREDDY)) },
    // The vent crawlers (see crawler() above). BB also remembers until when he has your flashlight.
    tbn: crawler(TBONNIE),
    tch: crawler(TCHICA),
    bb: { ...crawler(BB), stolenUntil: 0 },
    spr: crawler(SPRING),
    // Mangle: position (x = column of their left edge), which way they crawl, and the flashes so far.
    // `needOff` is true right after a flash: the light has to leave them before the next one counts.
    mng: { level: levelOf(MANGLE), active: false, x: 0, dir: 1, speed: 0, flashes: 0, shineT: 0, needOff: false,
      radioT: 0, timer: mangleWait(levelOf(MANGLE)) },
    // The Puppet's music box: how wound it is (percent), and the countdown once it's empty.
    pup: { level: levelOf(PUPPET), wind: 100, out: false, outTimer: 0, warnT: 0 },
    // The Toy cupcake: where it is on the screen (x and y in percent of the view) and its timers.
    cup: { level: levelOf(TCUP), active: false, x: 50, y: 50, deadline: 0, beepT: 0, timer: cupcakeWait(levelOf(TCUP)) },
    // Shadow Freddy: which camera he's on, and how long the light has been on him.
    sfr: { level: levelOf(SFREDDY), present: false, room: 'stage', deadline: 0, flashT: 0, timer: shadowFreddyWait(levelOf(SFREDDY)) },
    // Shadow Bonnie: whether the office is dark, where his eyes are, and how long the light has been on them.
    sbn: { level: levelOf(SBONNIE), active: false, eyes: SHADOW_EYES[0], deadline: 0, shineT: 0, timer: shadowBonnieWait(levelOf(SBONNIE)) },
    // The Crying Child: his camera, how long you've been watching it (seconds), and his move timer.
    cry: { level: levelOf(CHILD), room: pick(CAM_ORDER.filter(r => r !== 'stage')), stare: 0, sobT: 0, timer: childMove(levelOf(CHILD)) },
  };
}

// ---------- the main rule loop ----------
function update(dt) {
  G.t += dt;
  if (G.t >= HOUR_SECONDS * NIGHT_HOURS) return win();   // made it to 6 AM

  updatePuppet(dt);   // the music box keeps unwinding even in a power-out
  if (G.over) return;

  if (G.powerOut) {
    // Power is out: nothing to do but wait in the dark.
    G.outTimer -= dt;
    if (G.outTimer <= 0) lose(FREDDY, null, true);
    return;
  }

  updatePower(dt);
  if (G.lure && G.t >= G.lure.until) { G.lure = null; dirty = true; }
  if (G.blocked && G.t >= G.blocked.until) { G.blocked = null; dirty = true; }
  // Each character in turn. `for...of` runs the function for each one; we stop as soon as one ends the night.
  for (const step of [updateFreddy, updateBonnie, updateChica, updateFoxy, updateGolden, updateEndo,
    updateToyFreddy, updateCrawlers, updateMangle, updateCupcake, updateShadowFreddy, updateShadowBonnie, updateChild]) {
    if (G.over || G.powerOut) return;
    step(dt);
  }
}

// How many things are using power right now (0 to 4): the monitor, each closed door and the flashlight.
// true counts as 1 and false as 0 when you add them up.
const powerUnits = () => G.cam + G.doors.L + G.doors.R + flashOn();

function updatePower(dt) {
  G.power -= UNIT_DRAIN * powerUnits() * dt;
  if (G.power <= 0) powerOutStart();
}

// ---------- Freddy ----------
// Every so often he may move, and each move is a laugh from the side he's heading to (it gets louder
// as he gets closer). He walks FREDDY.routes (stage, dining area, then the hall on that side), so you can
// follow him on the cameras. After the third laugh he's at that door (not seen there): shut it in time
// and he bonks and goes back to the stage.
// The room he's in now, or null while he's at the door.
const freddyRoom = () => G.fre.step < FREDDY_STEPS ? FREDDY.routes[G.fre.side][G.fre.step] : null;
function updateFreddy(dt) {
  const F = G.fre;
  if (F.level === 0) return;
  if (F.step === FREDDY_STEPS) {
    if (G.doors[F.side]) {
      sfx.bonk(F.side);
      F.step = 0;   // back on the stage
      F.timer = FREDDY_INTERVAL * rand(0.7, 1.3);
      if (onCam('stage')) camStatic(0.5);
      dirty = true;
    } else if (G.t >= F.deadline) lose(FREDDY, F.side);
    return;
  }
  F.timer -= dt;
  if (F.timer > 0) return;
  F.timer = FREDDY_INTERVAL * rand(0.7, 1.3);
  if (Math.random() >= moveChance(F.level)) return;   // this time he stays put
  if (F.step === 0) F.side = pick(['L', 'R']);   // a new trip: which door this time?
  const from = freddyRoom();
  F.step++;
  if (onCam(from) || onCam(freddyRoom())) camStatic(0.5);   // static when he leaves or enters the room you're watching
  dirty = true;
  sfx.laugh(F.step, F.side);
  if (F.step === FREDDY_STEPS) F.deadline = G.t + reactWindow(F.level);
}

// ---------- Bonnie and Chica ----------
// They walk their route a room at a time; the last step is a doorway. Shut that door and they go
// back to the stage. W is their state (G.bon or G.chi) and who is BONNIE or CHICA.
const atDoor = (W, who) => W.step === who.route.length - 1;
const doorOf = who => who.route[who.route.length - 1];
function updateWalker(W, who, interval, pitch, dt) {
  if (W.level === 0) return;
  const side = doorOf(who);
  if (atDoor(W, who)) {
    if (G.doors[side]) walkerHome(W, who, interval);
    else if (G.t >= W.deadline) lose(who, side);
    return;
  }
  W.timer -= dt;
  if (W.timer > 0) return;
  W.timer = interval * rand(0.7, 1.3);
  if (Math.random() >= moveChance(W.level)) return;
  W.step++;
  if (onCam(who.route[W.step - 1]) || onCam(who.route[W.step])) camStatic(0.5);   // static when they leave or enter the room you're watching
  if (atDoor(W, who)) {
    sfx.arrive(side, pitch);
    if (G.doors[side]) walkerHome(W, who, interval);   // already shut: gives up at once
    else W.deadline = G.t + reactWindow(W.level);
  } else {
    sfx.step(W.step / (who.route.length - 1), side, pitch);
  }
  dirty = true;
}
// Shut out: a bonk, and back to the stage.
function walkerHome(W, who, interval) {
  sfx.bonk(doorOf(who));
  W.step = 0;
  W.timer = interval * rand(0.7, 1.3);
  dirty = true;
}
const updateBonnie = dt => updateWalker(G.bon, BONNIE, BONNIE_INTERVAL, 120, dt);
const updateChica = dt => updateWalker(G.chi, CHICA, CHICA_INTERVAL, 160, dt);

// ---------- Foxy ----------
// He gets ready in Pirate Cove one stage at a time. Shining the flashlight on the cove (CAM 3, the
// pointer over the picture) pushes him back the same way, one stage for every FOXY_FLASH seconds of
// steady light (on request: "shined in stages"), so from half out it takes two pushes to get him
// behind the curtain. He can't step forward while the light is on him. After his last stage he runs
// to the left door: if it's shut, he bangs on it and that costs power; if not, he gets you.
const foxyLit = () => onCam('cove') && flashOn() && aim.where === 'feed';
function updateFoxy(dt) {
  const X = G.fox;
  if (X.level === 0) return;
  if (X.phase === 'run') {
    X.runT -= dt;
    if (X.runT > 0) return;
    if (!G.doors.L) { lose(FOXY, 'L'); return; }
    sfx.bang();
    G.power -= FOXY_COST;
    X.phase = 'cove';
    X.stage = 0;
    X.timer = FOXY_INTERVAL * rand(0.7, 1.3);
    if (G.power <= 0) powerOutStart();
    dirty = true;
    return;
  }
  // In the cove: the light pushes him back one stage at a time, and holds him still meanwhile.
  if (foxyLit() && X.stage > 0) {
    X.flashT += dt;
    if (X.flashT >= FOXY_FLASH) {
      X.stage--;
      X.flashT = 0;   // the next stage needs its own FOXY_FLASH of light
      X.timer = FOXY_INTERVAL * rand(0.7, 1.3);
      sfx.foxyBack();
      dirty = true;
    }
    return;
  }
  X.flashT = 0;
  X.timer -= dt;
  if (X.timer > 0) return;
  X.timer = FOXY_INTERVAL * rand(0.7, 1.3);
  if (Math.random() >= moveChance(X.level)) return;
  X.stage++;
  if (onCam('cove')) camStatic(0.4);
  if (X.stage >= FOXY_STAGES) {
    X.phase = 'run';
    X.runT = FOXY_RUN;
    sfx.run();
  }
  dirty = true;
}

// ---------- Golden Freddy (turns up when you flip the monitor down) ----------
function lookedBack() {
  const Go = G.gol;
  if (Go.level > 0 && !Go.present && Math.random() < goldenChance(Go.level)) {
    Go.present = true;
    Go.deadline = G.t + goldenWindow(Go.level);
    sfx.goldenIn();
  }
}

// He leaves the moment the mask goes on. Too slow, and he gets you.
function updateGolden() {
  const Go = G.gol;
  if (!Go.present) return;
  if (G.mask) { Go.present = false; sfx.goldenOut(); dirty = true; }
  else if (G.t >= Go.deadline) lose(GOLDEN);
}

// ---------- the mask ----------
// Shared by everyone who leaves when you wear the mask long enough (Toy Freddy and the vent crawlers).
// V is their state; it needs maskT (seconds the mask has been on) and deadline. Returns 'gone' once
// the mask has been on for `hold` seconds, 'fail' when you didn't put it on in time, otherwise null.
// Taking the mask off early starts the count again, with a fresh chance to react.
function maskCheck(V, hold, dt) {
  if (G.mask) {
    V.maskT += dt;
    return V.maskT >= hold ? 'gone' : null;
  }
  if (V.maskT > 0) { V.maskT = 0; V.deadline = G.t + reactWindow(V.level); }
  return G.t >= V.deadline ? 'fail' : null;
}

// ---------- Toy Freddy ----------
// His timer only counts down while the monitor is down. Then he's in your office: mask on in time
// and keep it on for MASK_HOLD seconds.
function updateToyFreddy(dt) {
  const T = G.tfr;
  if (T.level === 0) return;
  if (!T.present) {
    if (G.cam) return;   // the monitor is up: his timer waits
    T.timer -= dt;
    if (T.timer <= 0) {
      T.present = true;
      T.maskT = 0;
      T.deadline = G.t + reactWindow(T.level);
      sfx.toyFreddyIn();
      dirty = true;
    }
    return;
  }
  const result = maskCheck(T, MASK_HOLD, dt);
  if (result === 'gone') {
    T.present = false;
    T.timer = toyFreddyWait(T.level);
    sfx.toyFreddyOut();
    dirty = true;
  } else if (result === 'fail') {
    lose(TFREDDY);
  }
}

// ---------- the vents ----------
// One step closer to V15: any next-door vent that's nearer (picked at random when there are two).
const closerVent = n => pick(ventNeighbors(n).filter(m => ventDist(m) < ventDist(n)));
// Each crawler's voice when it climbs in (and when the mask sends it back).
const VENT_PITCH = { tbn: 340, tch: 260, bb: 500, spr: 120 };

function updateCrawlers(dt) {
  for (const c of CRAWLERS) {
    if (G.over) return;
    updateCrawler(c, G[c.id], dt);
  }
}

// Toy Bonnie, Toy Chica, BB and Springtrap: crawl toward V15 a vent at a time, wait there a moment,
// then climb into your office.
function updateCrawler(c, V, dt) {
  if (V.level === 0) return;
  if (V.present) { crawlerInOffice(c, V, dt); return; }
  V.timer -= dt;
  if (V.timer > 0) return;
  V.timer = c.interval * rand(0.7, 1.3);
  if (V.stall > 0) { V.stall--; return; }   // still listening to a lure
  if (Math.random() >= moveChance(V.level)) return;
  if (V.room === VENT_EXIT) {
    if (G.t >= V.readyAt) climbIn(c, V);
    return;
  }
  V.room = closerVent(V.room);
  // BB is hidden: no sound at all until he's in your office.
  if (!c.hidden) {
    sfx.ventMove(1 - ventDist(V.room) / ventDist(VENT_START));
    if (V.room === VENT_EXIT) sfx.ventNear();
  }
  if (V.room === VENT_EXIT) V.readyAt = G.t + VENT_EXIT_WAIT;
  dirty = true;
}

// Out of the vent and into your office. Springtrap isn't fooled by the mask: that's the end.
function climbIn(c, V) {
  if (c === SPRING) { lose(SPRING); return; }
  V.present = true;
  V.maskT = 0;
  V.deadline = G.t + reactWindow(V.level) + 1;   // a second extra: you might be on the monitor
  if (c === BB) sfx.bbIn();
  else sfx.ventIn(VENT_PITCH[c.id]);
  dirty = true;
}

// In your office: keep the mask on until it makes a sound and goes back to V1. If not, it gets
// you, except BB, who takes your flashlight instead.
function crawlerInOffice(c, V, dt) {
  const result = maskCheck(V, VENT_HOLD, dt);
  if (result === 'gone') {
    sfx.ventOut(VENT_PITCH[c.id]);
    crawlerBack(c, V);
  } else if (result === 'fail') {
    if (c !== BB) { lose(c); return; }
    V.stolenUntil = G.t + BB_STEAL;
    G.scareUntil = performance.now() + 900;   // render.js shows his face until then
    sfx.miniScream();
    sfx.bbSteal();
    crawlerBack(c, V);
  }
}
function crawlerBack(c, V) {
  V.present = false;
  V.room = VENT_START;
  V.stall = 0;
  V.timer = c.interval * rand(0.7, 1.3);
  dirty = true;
}

// ---------- Freddy Endo ----------
// He does whatever he wants: each move he may stay put, or go to any vent up to ENDO_REACH moves
// away, in any direction. Lures never move him (playLure only moves the CRAWLERS). He never comes
// out; he just blocks lures in his vent.
function updateEndo(dt) {
  const E = G.fen;
  if (E.level === 0) return;
  E.timer -= dt;
  if (E.timer > 0) return;
  E.timer = endoMove(E.level);
  if (Math.random() < ENDO_STAY) return;
  E.room = pick(VENT_LIST.filter(n => n !== E.room && ventSteps(n, E.room) <= ENDO_REACH));
  sfx.endoMove();
  dirty = true;
}

// The arrow keys on the VENTS tab: [rows down, columns across] for each key.
const VENT_ARROWS = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
// Move the picked vent one step, staying on the map (Math.min / Math.max keep it inside the edges).
function moveVentSel(dRow, dCol) {
  const row = Math.min(VENT_ROWS - 1, Math.max(0, ventRow(G.ventSel) + dRow));
  const col = Math.min(VENT_COLS - 1, Math.max(0, ventCol(G.ventSel) + dCol));
  G.ventSel = row * VENT_COLS + col + 1;
  dirty = true;
}

// Playing an audio lure in vent `room` (1 to 15). It's free, but needs the monitor up on VENTS,
// can't be played in Freddy Endo's vent, and needs LURE_COOLDOWN seconds between lures.
// Each crawler in that vent or next to it may follow it (LURE_FOOLED says how likely) and then
// stays to listen for LURE_STALL of its move chances.
function playLure(room) {
  if (!ready()) return;
  if (!G.cam || G.tab !== 'vents' || G.t < G.lureReady) { sfx.deny(); return; }
  if (G.fen.level > 0 && G.fen.room === room) {
    G.blocked = { room, until: G.t + LURE_SHOW };
    sfx.deny();
    dirty = true;
    return;
  }
  G.lure = { room, until: G.t + LURE_SHOW };
  G.lureReady = G.t + LURE_COOLDOWN;
  sfx.lure();
  for (const c of CRAWLERS) {
    const V = G[c.id];
    if (V.level === 0 || V.present || ventSteps(V.room, room) > LURE_REACH) continue;
    if (Math.random() >= LURE_FOOLED[c.id]) continue;   // not fooled this time
    V.room = room;
    V.stall = LURE_STALL;
    V.timer = c.interval * rand(0.7, 1.3);
  }
  dirty = true;
}

// ---------- Mangle ----------
// Crawls across the ceiling from one side to the other. Every MANGLE_SHINE seconds of light on them
// is a flash; between flashes the light has to come off them. MANGLE_FLASHES flashes send them away.
function updateMangle(dt) {
  const M = G.mng;
  if (M.level === 0) return;
  if (!M.active) {
    M.timer -= dt;
    if (M.timer > 0) return;
    M.active = true;
    M.dir = Math.random() < 0.5 ? 1 : -1;
    M.x = M.dir > 0 ? -8 : 36;   // start just outside the side they come from
    M.speed = 44 / mangleTime(M.level);   // 44 columns: all the way across, plus their own width
    M.flashes = 0;
    M.shineT = 0;
    M.needOff = false;
    M.radioT = 0;
    dirty = true;
    return;
  }
  M.x += M.dir * M.speed * dt;
  // Their broken radio crackles from wherever they are (left speaker to right speaker).
  M.radioT -= dt;
  if (M.radioT <= 0) { sfx.mangleRadio(Math.max(-1, Math.min(1, (M.x + 4 - 18) / 18))); M.radioT = 0.8; }
  const lit = beamOn(MANGLE_ROW + 1, M.x + 4);   // + 4: the middle of their 8-wide drawing
  if (!lit) { M.needOff = false; M.shineT = 0; }
  else if (!M.needOff) {
    M.shineT += dt;
    if (M.shineT >= MANGLE_SHINE) {
      M.flashes++;
      M.needOff = true;
      M.shineT = 0;
      sfx.mangleHit();
      if (M.flashes >= MANGLE_FLASHES) {
        M.active = false;
        M.timer = mangleWait(M.level);
        sfx.mangleOut();
      }
      dirty = true;
      return;
    }
  }
  if ((M.dir > 0 && M.x >= 36) || (M.dir < 0 && M.x <= -8)) lose(MANGLE);
}

// ---------- the Puppet's music box ----------
function updatePuppet(dt) {
  const P = G.pup;
  if (P.level === 0) return;
  if (P.out) {
    P.outTimer -= dt;
    if (P.outTimer <= 0) lose(PUPPET);
    return;
  }
  P.wind -= boxDrain(P.level) * dt;
  if (P.wind < BOX_LOW) {
    P.warnT -= dt;
    if (P.warnT <= 0) { sfx.boxWarn(); P.warnT = 4; }
  }
  if (P.wind <= 0) {
    P.wind = 0;
    P.out = true;
    P.outTimer = PUPPET_DELAY;
    sfx.boxTune();
    dirty = true;
  }
}

// One click of Wind (the button, or W while you're on CAM 7) winds the box all the way up.
// Only works while you're watching the box.
function windBox() {
  const P = G && G.pup;
  if (!P || G.over || G.paused) return;
  if (!onCam('prize') || P.out || P.level === 0) { sfx.deny(); return; }
  P.wind = 100;
  P.warnT = 0;
  sfx.windUp();
  dirty = true;
}

// ---------- the Toy cupcake ----------
// Pops up at a random place on the screen (over the office or the monitor), blinking and beeping.
// Tap it before time runs out.
function updateCupcake(dt) {
  const C = G.cup;
  if (C.level === 0) return;
  if (!C.active) {
    C.timer -= dt;
    if (C.timer > 0) return;
    C.active = true;
    C.x = rand(4, 86);     // percent across the view
    C.y = rand(6, 78);     // percent down the view
    C.deadline = G.t + cupcakeTime(C.level);
    C.beepT = 0;
    dirty = true;
  }
  C.beepT -= dt;
  if (C.beepT <= 0) { sfx.cupBeep(); C.beepT = CUP_BEEP; }
  if (G.t >= C.deadline) lose(TCUP);
}

// Tapping the cupcake (input.js).
function tapCupcake() {
  const C = G && G.cup;
  if (!C || !ready() || !C.active) return;
  C.active = false;
  C.timer = cupcakeWait(C.level);
  sfx.pop();
  dirty = true;
}

// ---------- Shadow Freddy ----------
// Sits on a random camera (its map button blinks a red !). Find him and keep the flashlight on him
// for SFR_FLASH seconds, or he gets you.
function updateShadowFreddy(dt) {
  const S = G.sfr;
  if (S.level === 0) return;
  if (!S.present) {
    S.timer -= dt;
    if (S.timer > 0) return;
    S.present = true;
    // Never on the camera you're looking at right now (that would be too easy).
    S.room = pick(CAM_ORDER.filter(r => !onCam(r)));
    S.deadline = G.t + shadowFreddyTime(S.level);
    S.flashT = 0;
    sfx.shadowFreddyIn();
    dirty = true;
    return;
  }
  const [r, c] = SHADOW_SLOTS[S.room];
  if (onCam(S.room) && performance.now() >= G.staticUntil && beamOnFeed(r + 1, c + 2)) {
    S.flashT += dt;
    if (S.flashT >= SFR_FLASH) {
      S.present = false;
      S.timer = shadowFreddyWait(S.level);
      sfx.shadowFreddyOut();
      dirty = true;
      return;
    }
  } else {
    S.flashT = 0;
  }
  if (G.t >= S.deadline) lose(SFREDDY);
}

// ---------- Shadow Bonnie ----------
// The office goes dark and his eyes hide somewhere in it (never over the vent). Hold the light on
// them for SBN_SHINE seconds before time runs out.
function updateShadowBonnie(dt) {
  const S = G.sbn;
  if (S.level === 0) return;
  if (!S.active) {
    S.timer -= dt;
    if (S.timer > 0) return;
    S.active = true;
    S.eyes = pick(SHADOW_EYES);
    S.deadline = G.t + shadowBonnieTime(S.level);
    S.shineT = 0;
    sfx.lightsOff();
    dirty = true;
    return;
  }
  if (beamOn(S.eyes[0], S.eyes[1] + 1)) {   // + 1: the middle of "O O"
    S.shineT += dt;
    if (S.shineT >= SBN_SHINE) {
      S.active = false;
      S.timer = shadowBonnieWait(S.level);
      sfx.lightsOn();
      dirty = true;
      return;
    }
  } else {
    S.shineT = 0;
  }
  if (G.t >= S.deadline) lose(SBONNIE);
}

// ---------- the Crying Child ----------
// He sits on one camera (the sticky note in the office says which). Watching that camera fills up
// `stare`; looking away lets it drain. He moves to another camera every time you put the monitor
// down, and now and then while it's down, but never to the one you last put the monitor down on.
function updateChild(dt) {
  const K = G.cry;
  if (K.level === 0) return;
  const limit = childStare(K.level);
  if (onCam(K.room) && performance.now() >= G.staticUntil) {
    K.stare += dt;
    K.sobT -= dt;
    if (K.sobT <= 0) { sfx.sob(Math.min(1, K.stare / limit)); K.sobT = 0.8; }
    if (K.stare >= limit) { lose(CHILD); return; }
  } else {
    K.stare = Math.max(0, K.stare - CHILD_COOL * dt);
    K.sobT = 0;
  }
  if (G.cam) return;
  K.timer -= dt;
  if (K.timer <= 0) moveChild();
}

// The Crying Child goes to another camera (and the sticky note changes). It happens on his timer and
// also every time you put the monitor down (toggleCam, on request), but never to the camera you were
// just on, so flipping the monitor straight back up is always safe for a moment.
function moveChild() {
  const K = G.cry;
  if (K.level === 0) return;
  K.timer = childMove(K.level);
  K.room = pick(CAM_ORDER.filter(r => r !== K.room && r !== G.closedOn));
  dirty = true;
}

// ---------- power-out ----------
// Power hit 0%: doors open, the monitor and the flashlight die, everyone else gives up, and Freddy
// comes for you in the dark. (The music box keeps unwinding, though.)
function powerOutStart() {
  G.power = 0;
  G.powerOut = true;
  G.doors.L = G.doors.R = false;
  G.cam = false;
  G.mask = false;
  G.outTimer = rand(...POWER_OUT_WAIT);   // ...POWER_OUT_WAIT spreads the [lowest, highest] pair into rand(lowest, highest)
  G.gol.present = false;
  G.tfr.present = false;
  for (const c of CRAWLERS) G[c.id].present = false;
  G.mng.active = false;
  G.cup.active = false;
  G.sfr.present = false;
  G.sbn.active = false;
  G.lure = null;
  sfx.humOff();
  sfx.powerDown();
  dirty = true;
}

// Show static on the camera for `sec` seconds.
// performance.now() is the time in milliseconds since the page opened.
function camStatic(sec) {
  G.staticUntil = performance.now() + sec * 1000;
  if (G.cam) sfx.stat();
}

// ---------- things the player does (called from input.js) ----------
// `ready()` is true when the night is running and not paused.
const ready = () => G && !G.over && !G.paused;

function toggleDoor(side) {
  if (!ready()) return;
  if (!powered()) { sfx.deny(); return; }
  G.doors[side] = !G.doors[side];   // flip: open becomes closed, closed becomes open
  sfx.door(side);
  dirty = true;
}

// Raise or lower the monitor. Lowering it is when Golden Freddy can be waiting, and the camera you
// lowered it on is one the Crying Child won't move to.
function toggleCam() {
  if (!ready()) return;
  if (!powered() || G.mask) { sfx.deny(); return; }   // no monitor without power, or with the mask on
  G.cam = !G.cam;
  sfx.cam();
  if (G.cam) camStatic(0.2);
  else { G.closedOn = G.camRoom; moveChild(); lookedBack(); }
  dirty = true;
}

// Jump to a camera (raising the monitor on the CAMS tab first if needed).
function setCam(room) {
  if (!ready()) return;
  if (!powered() || G.mask) { sfx.deny(); return; }
  G.cam = true;
  G.tab = 'cams';
  G.camRoom = room;
  sfx.cam();
  camStatic(0.22);
  dirty = true;
}

// Switch the monitor to the CAMS or VENTS tab (raising it if needed).
function setTab(tab) {
  if (!ready()) return;
  if (!powered() || G.mask || (tab === 'vents' && !ventsOn())) { sfx.deny(); return; }
  if (!G.cam) camStatic(0.2);
  G.cam = true;
  G.tab = tab;
  sfx.cam();
  dirty = true;
}

// Put the mask on or take it off. It can't be worn with the monitor up, and with it on the
// monitor can't be raised. It needs no power.
function toggleMask() {
  if (!ready()) return;
  if (G.cam) { sfx.deny(); return; }
  G.mask = !G.mask;
  sfx.mask(G.mask);
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
  flashKey = flashMouse = flashButton = false;
  newGame();
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
  const sum = nightScore();
  const isBest = !best || sum > best.sum;
  if (isBest) {
    best = { sum, levels: levels.slice() };
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
  showWin(sum, isBest, challenge, firstTime);
}

// Character c (from data.js) got you. `side` is 'L' or 'R' when it came through a door, or null when
// it got you some other way. `dark` is true when the power had run out.
function lose(c, side = null, dark = false) {
  G.over = true;
  sfx.humOff();
  sfx.scream();
  const when = hourLabel(hourOf(G.t));
  const who = `<b class="c-${c.id}">${c.name}</b>`;
  let message;
  if (dark) message = `The power ran out. ${who} found you in the dark at ${when}.`;
  else if (c === PUPPET) message = `The music box ran down. ${who} got out at ${when}.`;
  else if (side) message = `${who} came through the ${side === 'L' ? 'LEFT' : 'RIGHT'} door at ${when}.`;
  else message = `${who} ${c.how} at ${when}.`;
  message += countKill(c.id, c.name);   // a power-out death counts for Freddy, who came in the dark
  // The jumpscare: the character's big drawing, shaking (see showScare in screens.js).
  const big = SPRITES[c.id].scare;
  const g = blank(Math.max(...big.map(l => l.length)), big.length);
  sprite(g, 0, 0, big, 'c-' + c.id);
  showScare(message, toHtml(g));
}
