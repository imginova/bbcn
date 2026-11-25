/* =====================================================================
   game.js: the RULES. How one night plays out, moment to moment.

   Everything about one night lives in a single object called G
   (time, power, heat, doors, camera, where every character is...). The
   rules change G; render.js then draws whatever G says.

   Who is on tonight comes from the run (run.js): isOn(BONNIE) is true
   when Bonnie is in your lineup. Everyone else stays away all night.

   The heart is update(dt), which main.js calls about 60 times a second.
   `dt` ("delta time") is how many seconds passed since the last call,
   for example 0.016. Multiplying every speed by dt keeps the game
   running at the same pace on fast and slow computers:
       power -= drainPerSecond * dt
   ===================================================================== */

// How many times each character has got you, by its id: { fre: 3, bon: 1, ... }, plus `heat` for
// passing out. Saved in the browser and shown on the game over screen and on the cards.
let kills = store.get('kills', {}) || {};
// Add one to `id`'s tally, save it, and return a line for the game over screen like
// "Bonnie has got you 3 times." (`name` is what the line calls it.)
function countKill(id, name) {
  kills[id] = (kills[id] || 0) + 1;
  store.set('kills', kills);
  const n = kills[id];
  return `<br><span class="dim">${name} has got you ${n === 1 ? 'once' : n + ' times'}.</span>`;
}

// ---------- the current night ----------
let G = null;        // all the state of the night in progress (built by newGame)
let dirty = true;    // "something changed, redraw now" (render.js also redraws 15x a second anyway)

// The flashlight shines while F, the right mouse button or the Flashlight button is held down.
let flashKey = false, flashMouse = false, flashButton = false;
// Where the mouse pointer is aiming, worked out by input.js:
//   where  'office' (over the office picture), 'feed' (over the camera picture), 'doorL'/'doorR'
//          (over a doorway), 'view' (anywhere else over the view) or null
//   r, c   the row and column of the character under the pointer, in that picture
//   x, y   the pointer's position in pixels inside the view (for drawing the light)
const aim = { where: null, r: 0, c: 0, x: 0, y: 0 };

// Is there power to use things right now? Not after a power-out.
const powered = () => !G.powerOut;
// Is the flashlight on? It needs power. It works on the office AND the cameras.
const flashOn = () => (flashKey || flashMouse || flashButton) && powered();
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
// Is the flashlight shining into doorway `side` ('L' or 'R')? Anywhere over the doorway counts, but a
// shut door blocks the light.
const doorLit = side => flashOn() && !G.cam && !G.doors[side] && aim.where === 'door' + side;
// Are you looking at camera `room` right now?
const onCam = room => camsShowing() && G.camRoom === room;
// Is the VENTS tab worth showing tonight? Only if a vent crawler is in your lineup.
const ventsOn = () => CRAWLERS.some(isOn);
// Can you see the office right now? (Not with the monitor up or the mask over your eyes.)
const seeingOffice = () => !G.cam && !G.mask;

// Turn seconds into the clock: with 20-second hours, 0-19s is 12 AM, 20-39s is 1 AM, and so on.
const hourOf = t => Math.min(NIGHT_HOURS, Math.floor(t / HOUR_SECONDS));
// The clock to the minute, like "2:07 AM". With 20-second hours, an in-game minute is a third of a
// real second. padStart(2, '0') turns 7 into "07".
function clockLabel(t) {
  const minutes = Math.min(NIGHT_HOURS * 60, Math.floor(t / HOUR_SECONDS * 60));
  const h = Math.floor(minutes / 60), m = minutes % 60;
  return `${h === 0 ? 12 : h}:${String(m).padStart(2, '0')} AM`;
}

// A random wait from a [lowest, highest] pair in config.js, like FREDDLE_WAIT.
const waitFrom = range => rand(range[0], range[1]);
// A timer for something that acts every `interval` seconds, give or take 30%, so it isn't too regular.
const around = interval => interval * rand(0.7, 1.3);

// A vent crawler's state: which vent it's in, its move timer, and (once it climbs in) whether it's in
// your office and how long the mask has been on.
const crawler = c => ({ on: isOn(c), room: VENT_START, timer: around(c.interval), stall: 0,
  readyAt: 0, present: false, maskT: 0, deadline: 0 });

// Build a fresh night.
function newGame() {
  G = {
    t: 0,                          // seconds since 12 AM
    power: 100,                    // percent
    heat: HEAT_START,              // the office heat in percent (see updateHeat); 100 = you pass out
    hotWarns: 0,                   // how many of the HOT_WARN marks the heat is past (for the warning breaths)
    fan: false,                    // is the desk fan on?
    doors: { L: false, R: false }, // true = closed
    cam: false,                    // is the monitor raised?
    tab: 'cams',                   // which tab the monitor shows: 'cams' or 'vents'
    camRoom: 'stage',              // which camera you are looking at
    mask: false,                   // are you wearing the mask?
    powerOut: false, outTimer: 0,
    over: false, paused: false,
    staticUntil: 0,                // camera shows static until this time (milliseconds)
    lure: null, lureReady: 0,      // the audio lure playing now ({ room, until }), and when the next one is allowed
    ventSel: VENT_EXIT,            // the vent the arrow keys have picked on the VENTS tab (Enter lures it)

    // Freddy: `step` counts his laughs on this trip, `side` is the door he's heading for.
    fre: { on: isOn(FREDDY), side: 'L', step: 0, timer: around(FREDDY_INTERVAL), deadline: 0 },
    // Bonnie and Chica: how far along their route they are (the last step is the doorway).
    bon: { on: isOn(BONNIE), step: 0, timer: around(BONNIE_INTERVAL), deadline: 0 },
    chi: { on: isOn(CHICA), step: 0, timer: around(CHICA_INTERVAL), deadline: 0 },
    // Chica's cupcakes in your office: where they are ([row, column] each) and the seconds left.
    cups: { spots: [], left: 0 },
    // The vent crawlers (see crawler() above).
    tbn: crawler(TBONNIE),
    tch: crawler(TCHICA),
    // The Puppet's music box: how wound it is (percent), and the countdown once it's empty.
    pup: { on: isOn(PUPPET), wind: 100, out: false, outTimer: 0, warnT: 0 },
    // Nightmare Freddy: which of the 3 desk spots have a Freddle, how long the light has been on each,
    // the timer for the next Freddle, and how long all three have been up.
    nfr: { on: isOn(NFREDDY), freddles: [false, false, false], shine: [0, 0, 0], timer: waitFrom(FREDDLE_WAIT), fullT: 0 },
    // Trash and the Gang: which of them is out, the camera they're standing in front of (null: none)
    // and their timer.
    trs: { on: isOn(TRASH), member: 'bob', room: null, timer: waitFrom(TRASH_WAIT) },
    // Lolbit: whether the LOL screen is up, and how many of its letters (L, O, L) you've typed so far.
    lol: { on: isOn(LOLBIT), active: false, typed: 0, timer: waitFrom(LOL_WAIT) },

    // ----- uncommon -----
    // Foxy: 'cove' (stage 0 curtain shut, 1 peeking, 2 half out) or 'run' (on his way to the left door).
    fox: { on: isOn(FOXY), phase: 'cove', stage: 0, timer: around(FOXY_INTERVAL), runT: 0, flashT: 0 },
    // Golden Freddy: only there right after you flip the monitor down.
    gol: { on: isOn(GOLDEN), present: false, deadline: 0 },
    // Toy Freddy: his timer, and once he's in, how long the mask has been on.
    tfr: { on: isOn(TFREDDY), present: false, maskT: 0, deadline: 0, timer: waitFrom(TOY_FREDDY_WAIT) },
    // Nightmare Bonnie: the doorway he's in ('L', 'R' or null: not here) and how long the light has been on him.
    nbn: { on: isOn(NBONNIE), side: null, flashT: 0, deadline: 0, timer: waitFrom(NBN_WAIT) },
    // Bonnet: where she is on the office floor (x across, y down, in characters), which way she runs
    // (dir: 1 to the right, -1 to the left) and how fast.
    bnt: { on: isOn(BONNET), active: false, x: 0, y: 0, dir: 1, speed: 0, timer: waitFrom(BONNET_WAIT) },

    // ----- rare -----
    // Withered Bonnie: like Toy Freddy, but he only walks in with the monitor down.
    wbn: { on: isOn(WBONNIE), present: false, maskT: 0, deadline: 0, timer: waitFrom(WBN_WAIT) },
    // Withered Foxy: which part of his routine he's in (see updateWitheredFoxy) and its clocks.
    wfx: { on: isOn(WFOXY), phase: 'away', timer: waitFrom(WFX_WAIT), runT: 0, stepT: 0, waitT: 0, stompT: 0, flashT: 0, deadline: 0 },
    // Springtrap and Circus Baby: which room of their route they're in, their move timer, and when they
    // may climb in from the last room.
    spr: { on: isOn(SPRING), step: 0, timer: around(SPRING_INTERVAL), readyAt: 0 },
    bab: { on: isOn(BABY), step: 0, timer: around(BABY_INTERVAL), readyAt: 0 },
    // Nightmare Chica: the camera her cupcake is hidden on (null: none right now) and where in the picture.
    nch: { on: isOn(NCHICA), room: null, spot: null, deadline: 0, timer: waitFrom(NCH_WAIT) },

    // ----- epic -----
    // Shadow Bonnie: whether the office is dark, where his eyes are, and how long the light has been on them.
    sbn: { on: isOn(SBONNIE), active: false, eyes: SHADOW_EYES[0], deadline: 0, shineT: 0, timer: waitFrom(SBN_WAIT) },
    // Plushtrap: where he's hiding (null: not here).
    plu: { on: isOn(PLUSH), spot: null, deadline: 0, timer: waitFrom(PLU_WAIT) },
    // Funtime Freddy: his side of the auditorium (`home`), what he's doing ('idle', 'going' to a door,
    // or at the 'door'), the door the attack goes to (`pos`), and his last line (shown as a subtitle).
    ffr: { on: isOn(FFREDDY), home: pick(['L', 'R']), phase: 'idle', pos: 'L', goT: 0, stepped: false, deadline: 0,
      line: '', subUntil: 0, lineT: waitFrom(FFR_LINE_GAP), switchT: waitFrom(FFR_SWITCH) },

    // ----- legendary -----
    // Withered Freddy: where he is on PROWL_PATH (0 = left door ... 4 = right door), which way he's
    // walking, and whether he's trying to get in at a door right now.
    wfr: { on: isOn(WFREDDY), at: 2, dir: pick([-1, 1]), stepT: around(WFR_STEP), trying: false, side: 'L', deadline: 0 },
    // Funtime Foxy: the time of the next show, and whether its fanfare has played.
    ffx: { on: isOn(FFOXY), show: roundShow(waitFrom(FFX_GAP)), played: false },
    // Nightmare Fredbear: which attack he's on (null: none; 'prowl', 'toy' or 'plush') and its state.
    nfb: { on: isOn(NFREDBEAR), mode: null, timer: waitFrom(NFB_WAIT), at: 2, dir: 1, stepT: 0, side: null,
      flashT: 0, maskT: 0, deadline: 0, spot: null },

    // The controlled shock: when it's charged again (G.t), and until when its flash shows (milliseconds).
    shockReady: 0, zapUntil: 0,
  };
}
// Showtimes land on a round time: a multiple of 10 in-game minutes (a sixth of an hour).
const roundShow = t => Math.ceil(t / (HOUR_SECONDS / 6)) * (HOUR_SECONDS / 6);
const NIGHT_END = HOUR_SECONDS * NIGHT_HOURS;
const otherSide = side => side === 'L' ? 'R' : 'L';

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
  // Each part of the night in turn. `for...of` runs the function for each one; we stop as soon as
  // one ends the night.
  for (const step of [updateHeat, updateFreddy, updateBonnie, updateChica, updateCupcakes, updateCrawlers,
    updateNightmare, updateTrash, updateLolbit,
    updateFoxy, updateGolden, updateToyFreddy, updateNightmareBonnie, updateBonnet,
    updateWitheredBonnie, updateWitheredFoxy, updateSpringtrap, updateBaby, updateNightmareChica,
    updateShadowBonnie, updatePlushtrap, updateFuntimeFreddy,
    updateWitheredFreddy, updateFuntimeFoxy, updateFredbear]) {
    if (G.over || G.powerOut) return;
    step(dt);
  }
}

// How many things are using power right now (0 to 5): the monitor, each closed door, the flashlight
// and the fan. true counts as 1 and false as 0 when you add them up.
const powerUnits = () => G.cam + G.doors.L + G.doors.R + flashOn() + G.fan;

function updatePower(dt) {
  G.power -= UNIT_DRAIN * powerUnits() * dt;
  if (G.power <= 0) powerOutStart();
}

// ---------- the office heat ----------
// Every night the office slowly heats up, and the fan cools it down. At 100% you pass out.
function updateHeat(dt) {
  if (G.fan) G.heat = Math.max(0, G.heat - FAN_COOL * dt);
  else G.heat += HEAT_RISE * dt;
  // A heavy breath each time the heat passes one of the HOT_WARN marks.
  const warns = HOT_WARN.filter(mark => G.heat >= mark).length;
  if (warns > G.hotWarns) sfx.hot();
  G.hotWarns = warns;
  if (G.heat >= 100) passOut();
}

// ---------- Freddy ----------
// Every so often he may move, and each move is a laugh from the side he's heading to (it gets louder
// as he gets closer). He walks FREDDY.routes (stage, dining area, then the hall on that side), so you
// can follow him on the cameras. After the third laugh he's at that door (not seen there): shut it in
// time and he bonks and goes back to the stage.
// The room he's in now, or null while he's at the door.
const freddyRoom = () => G.fre.step < FREDDY_STEPS ? FREDDY.routes[G.fre.side][G.fre.step] : null;
function updateFreddy(dt) {
  const F = G.fre;
  if (!F.on) return;
  if (F.step === FREDDY_STEPS) {
    if (G.doors[F.side]) {
      sfx.bonk(F.side);
      F.step = 0;   // back on the stage
      F.timer = around(FREDDY_INTERVAL);
      if (onCam('stage')) camStatic(0.5);
      dirty = true;
    } else if (G.t >= F.deadline) lose(FREDDY, F.side);
    return;
  }
  F.timer -= dt;
  if (F.timer > 0) return;
  F.timer = around(FREDDY_INTERVAL);
  if (Math.random() >= FREDDY_CHANCE) return;   // this time he stays put
  if (F.step === 0) F.side = pick(['L', 'R']);   // a new trip: which door this time?
  const from = freddyRoom();
  F.step++;
  if (onCam(from) || onCam(freddyRoom())) camStatic(0.5);   // static when he leaves or enters the room you're watching
  dirty = true;
  sfx.laugh(F.step, F.side);
  if (F.step === FREDDY_STEPS) F.deadline = G.t + REACT_WINDOW;
}

// ---------- Bonnie and Chica ----------
// They walk their route a room at a time; the last step is a doorway. Shut that door and they go
// back to the stage. W is their state (G.bon or G.chi) and who is BONNIE or CHICA. `speed` makes their
// timer run faster (Bonnie in the heat).
const atDoor = (W, who) => W.step === who.route.length - 1;
const doorOf = who => who.route[who.route.length - 1];
function updateWalker(W, who, interval, chance, pitch, speed, dt) {
  if (!W.on) return;
  const side = doorOf(who);
  if (atDoor(W, who)) {
    if (G.doors[side]) walkerHome(W, who, interval);
    else if (G.t >= W.deadline) lose(who, side);
    return;
  }
  W.timer -= dt * speed;
  if (W.timer > 0) return;
  W.timer = around(interval);
  if (Math.random() >= chance) return;
  W.step++;
  if (onCam(who.route[W.step - 1]) || onCam(who.route[W.step])) camStatic(0.5);   // static when they leave or enter the room you're watching
  if (atDoor(W, who)) {
    sfx.arrive(side, pitch);
    if (G.doors[side]) walkerHome(W, who, interval);   // already shut: gives up at once
    else W.deadline = G.t + REACT_WINDOW;
  } else {
    sfx.step(W.step / (who.route.length - 1), side, pitch);
  }
  dirty = true;
}
// Shut out: a bonk, and back to the stage. Chica leaves cupcakes behind when she goes.
function walkerHome(W, who, interval) {
  sfx.bonk(doorOf(who));
  W.step = 0;
  W.timer = around(interval);
  if (who === CHICA) dropCupcakes();
  dirty = true;
}
// Bonnie's speed: 1 at 0% heat, up to 1 + BONNIE_HEAT at 100% heat.
const bonnieSpeed = () => 1 + BONNIE_HEAT * Math.min(100, G.heat) / 100;
const updateBonnie = dt => updateWalker(G.bon, BONNIE, BONNIE_INTERVAL, BONNIE_CHANCE, 120, bonnieSpeed(), dt);
const updateChica = dt => updateWalker(G.chi, CHICA, CHICA_INTERVAL, CHICA_CHANCE, 160, 1, dt);

// ---------- Chica's cupcakes ----------
// 1 to CHICA_MAX_CUPS cupcakes land at free spots in your office. If some are still there from last
// time, the new ones join them and add their time to the clock.
function dropCupcakes() {
  const C = G.cups;
  const free = shuffle(CUPCAKE_SPOTS.filter(s => !C.spots.includes(s)));
  const n = Math.min(free.length, 1 + Math.floor(Math.random() * CHICA_MAX_CUPS));
  if (!C.spots.length) C.left = CUP_TIME_BASE;
  C.spots = [...C.spots, ...free.slice(0, n)];
  C.left += CUP_TIME_EACH * n;
  sfx.cupsDropped(n);
  dirty = true;
}
// Her clock only runs while you can see the office, so you're never caught by cupcakes you couldn't see.
function updateCupcakes(dt) {
  const C = G.cups;
  if (!C.spots.length || !seeingOffice()) return;
  C.left -= dt;
  if (C.left <= 0) lose(CHICA);
}
// A click on the office picture at row r, column c (from input.js): did it hit Bonnet's nose or one of
// Chica's cupcakes? A cupcake is 3 characters wide; anywhere on it (or almost a row above or below)
// counts.
function clickOffice(r, c) {
  if (!ready() || !seeingOffice()) return;
  if (boopBonnet(r, c)) return;
  const C = G.cups;
  const hit = C.spots.find(([row, col]) => Math.abs(r - row) <= 0.8 && c >= col - 0.8 && c <= col + 2.8);
  if (!hit) return;
  C.spots = C.spots.filter(s => s !== hit);
  sfx.pop();
  dirty = true;
}

// ---------- the vents ----------
// One step closer to V15: any next-door vent that's nearer (picked at random when there are two).
const closerVent = n => pick(ventNeighbors(n).filter(m => ventDist(m) < ventDist(n)));
// Each crawler's voice when it climbs in (and when the mask sends it back).
const VENT_PITCH = { tbn: 340, tch: 260 };

function updateCrawlers(dt) {
  for (const c of CRAWLERS) {
    if (G.over) return;
    updateCrawler(c, G[c.id], dt);
  }
}

// Toy Bonnie and Toy Chica: crawl toward V15 a vent at a time, wait there a moment, then climb into
// your office.
function updateCrawler(c, V, dt) {
  if (!V.on) return;
  if (V.present) { crawlerInOffice(c, V, dt); return; }
  V.timer -= dt;
  if (V.timer > 0) return;
  V.timer = around(c.interval);
  if (V.stall > 0) { V.stall--; return; }   // still listening to a lure
  if (Math.random() >= CRAWL_CHANCE) return;
  if (V.room === VENT_EXIT) {
    if (G.t >= V.readyAt) climbIn(c, V);
    return;
  }
  V.room = closerVent(V.room);
  sfx.ventMove(1 - ventDist(V.room) / ventDist(VENT_START));
  if (V.room === VENT_EXIT) { sfx.ventNear(); V.readyAt = G.t + VENT_EXIT_WAIT; }
  dirty = true;
}

// Out of the vent and into your office.
function climbIn(c, V) {
  V.present = true;
  V.maskT = 0;
  V.deadline = G.t + REACT_WINDOW + 1;   // a second extra: you might be on the monitor
  sfx.ventIn(VENT_PITCH[c.id]);
  dirty = true;
}

// ---------- the mask ----------
// Shared by everyone who leaves when you wear the mask long enough. V is their state; it needs maskT
// (seconds the mask has been on) and deadline. Returns 'gone' once the mask has been on for `hold`
// seconds, 'fail' when you didn't put it on in time, otherwise null. Taking the mask off early starts
// the count again, with a fresh chance to react (`react` seconds, REACT_WINDOW unless said otherwise).
function maskCheck(V, hold, dt, react = REACT_WINDOW) {
  if (G.mask) {
    V.maskT += dt;
    return V.maskT >= hold ? 'gone' : null;
  }
  if (V.maskT > 0) { V.maskT = 0; V.deadline = G.t + react; }
  return G.t >= V.deadline ? 'fail' : null;
}

// In your office: keep the mask on until it makes a sound and goes back to V1. If not, it gets you.
function crawlerInOffice(c, V, dt) {
  const result = maskCheck(V, VENT_HOLD, dt);
  if (result === 'gone') {
    sfx.ventOut(VENT_PITCH[c.id]);
    V.present = false;
    V.room = VENT_START;
    V.stall = 0;
    V.timer = around(c.interval);
    dirty = true;
  } else if (result === 'fail') {
    lose(c);
  }
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

// Playing an audio lure in vent `room` (1 to 15). It's free, but needs the monitor up on VENTS, and
// LURE_COOLDOWN seconds between lures. Each crawler in a vent next to it may follow it (LURE_FOOLED says
// how likely) and then stays to listen for LURE_STALL of its move chances. A lure in a crawler's OWN
// vent does nothing to it.
function playLure(room) {
  if (!ready()) return;
  if (!G.cam || G.tab !== 'vents' || G.t < G.lureReady) { sfx.deny(); return; }
  G.lure = { room, until: G.t + LURE_SHOW };
  G.lureReady = G.t + LURE_COOLDOWN;
  sfx.lure();
  for (const c of CRAWLERS) {
    const V = G[c.id];
    const steps = ventSteps(V.room, room);   // 0 means it's already in that vent
    if (!V.on || V.present || steps === 0 || steps > LURE_REACH) continue;
    if (Math.random() >= LURE_FOOLED[c.id]) continue;   // not fooled this time
    V.room = room;
    V.stall = LURE_STALL;
    V.timer = around(c.interval);
  }
  dirty = true;
}

// ---------- the Puppet's music box ----------
function updatePuppet(dt) {
  const P = G.pup;
  if (!P.on) return;
  if (P.out) {
    P.outTimer -= dt;
    if (P.outTimer <= 0) lose(PUPPET);
    return;
  }
  P.wind -= BOX_DRAIN * dt;
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

// One click of Wind (the button, or W while you're on CAM 6) winds the box all the way up.
// Only works while you're watching the box.
function windBox() {
  const P = G && G.pup;
  if (!P || !ready()) return;
  if (!onCam('prize') || P.out || !P.on) { sfx.deny(); return; }
  P.wind = 100;
  P.warnT = 0;
  sfx.windUp();
  dirty = true;
}
// Is the music box low enough to warn about?
const boxLow = () => G.pup.on && !G.pup.out && G.pup.wind < BOX_LOW;

// ---------- Nightmare Freddy ----------
// Freddles turn up on the desk one at a time. Keeping the flashlight on one for FREDDLE_SHINE seconds
// sends it off. If all three sit there for NFR_ARRIVE seconds, he comes for you.
function updateNightmare(dt) {
  const N = G.nfr;
  if (!N.on) return;
  // The light shooing Freddles away. Each Freddle needs its own steady light.
  N.freddles.forEach((here, i) => {
    if (!here) return;
    const [r, c] = FREDDLE_SPOTS[i];
    if (beamOn(r + 0.5, c + 2)) {   // + 0.5, + 2: the middle of the 5-wide, 2-tall Freddle
      N.shine[i] += dt;
      if (N.shine[i] >= FREDDLE_SHINE) { N.freddles[i] = false; N.shine[i] = 0; sfx.freddleOff(); dirty = true; }
    } else {
      N.shine[i] = 0;
    }
  });
  // A new Freddle every so often, on a free spot.
  const free = [0, 1, 2].filter(i => !N.freddles[i]);
  if (free.length) {
    N.timer -= dt;
    if (N.timer <= 0) {
      N.freddles[pick(free)] = true;
      N.timer = waitFrom(FREDDLE_WAIT);
      sfx.freddle();
      dirty = true;
    }
  }
  // All three on the desk: he's on his way (a growl warns you the moment the third one is up).
  if (N.freddles.every(Boolean)) {
    if (N.fullT === 0) sfx.nightmareNear();
    N.fullT += dt;
    if (N.fullT >= NFR_ARRIVE) lose(NFREDDY);
  } else {
    N.fullT = 0;
  }
}

// ---------- Trash and the Gang ----------
// One of them at a time (Bucket Bob, Mr. Can-Do, No. 1 Crate or Pan Stan: TRASH_MEMBERS) stands right in
// front of a random camera (never the one you're looking at) for a while, then wanders off. They never
// attack; they just get in the way of your view.
const TRASH_MEMBERS = ['bob', 'can', 'crate', 'pan'];   // their drawings in SPRITES.trs (art.js)
function updateTrash(dt) {
  const T = G.trs;
  if (!T.on) return;
  T.timer -= dt;
  if (T.timer > 0) return;
  if (T.room) {
    T.room = null;
    T.timer = waitFrom(TRASH_WAIT);
  } else {
    T.member = pick(TRASH_MEMBERS);
    T.room = pick(CAM_ORDER.filter(r => !onCam(r)));
    T.timer = waitFrom(TRASH_STAY);
    sfx.trash();
  }
  dirty = true;
}

// ---------- Lolbit ----------
// Every so often the LOL screen covers the view and blocks clicks on everything under it (index.html,
// #lolbit). Typing L, O, L (or tapping the letters on it) gets rid of it. He never attacks.
const LOL_WORD = 'lol';
function updateLolbit(dt) {
  const L = G.lol;
  if (!L.on || L.active) return;
  L.timer -= dt;
  if (L.timer > 0) return;
  L.active = true;
  L.typed = 0;
  sfx.lolIn();
  dirty = true;
}
// A letter typed or tapped while the LOL screen is up (input.js). The right next letter moves on; a
// wrong one starts the word again.
function typeLol(letter) {
  const L = G && G.lol;
  if (!L || !ready() || !L.active) return;
  if (letter !== LOL_WORD[L.typed]) { L.typed = letter === LOL_WORD[0] ? 1 : 0; sfx.deny(); dirty = true; return; }
  L.typed++;
  sfx.lolKey(L.typed);
  if (L.typed === LOL_WORD.length) { L.active = false; L.timer = waitFrom(LOL_WAIT); sfx.lolOut(); }
  dirty = true;
}

// ---------- power-out ----------
// Power hit 0%: doors open, the monitor, the flashlight and the fan die, everyone else gives up, and
// Freddy comes for you in the dark (even if he isn't in your lineup). The music box keeps unwinding.
function powerOutStart() {
  G.power = 0;
  G.powerOut = true;
  G.doors.L = G.doors.R = false;
  G.cam = false;
  G.mask = false;
  G.fan = false;
  G.outTimer = rand(...POWER_OUT_WAIT);   // ...POWER_OUT_WAIT spreads the [lowest, highest] pair into rand(lowest, highest)
  for (const c of CRAWLERS) G[c.id].present = false;
  G.cups.spots = [];
  G.lol.active = false;
  G.lure = null;
  // Everyone else in (or at) the office gives up too.
  G.gol.present = G.tfr.present = G.wbn.present = false;
  G.nbn.side = null;
  G.bnt.active = false;
  G.plu.spot = null;
  G.sbn.active = false;
  G.nch.room = null;
  G.wfr.trying = false;
  G.nfb.mode = null;
  if (G.wfx.phase !== 'away') { G.wfx.phase = 'away'; G.wfx.timer = waitFrom(WFX_WAIT); }
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

function toggleFan() {
  if (!ready()) return;
  if (!powered()) { sfx.deny(); return; }
  G.fan = !G.fan;
  sfx.fan(G.fan);
  dirty = true;
}

// Raise or lower the monitor.
function toggleCam() {
  if (!ready()) return;
  if (!powered() || G.mask) { sfx.deny(); return; }   // no monitor without power, or with the mask on
  G.cam = !G.cam;
  sfx.cam();
  if (G.cam) camStatic(0.2);
  else lookedBack();   // putting the monitor down is when Golden Freddy can be sitting there
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

// Start the night for the run's current lineup.
function startNight() {
  sfx.init();
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
  const powerLeft = Math.max(0, Math.ceil(G.power));
  const outcome = nightSurvived();   // run.js: on to the next night, or the whole run is won
  if (outcome.result === 'won') sfx.fanfare(); else sfx.chime();
  showWin(outcome, powerLeft);
}

// Character c (from data.js) got you. `side` is 'L' or 'R' when it came through a door, or null when
// it got you some other way. `dark` is true when the power had run out.
function lose(c, side = null, dark = false) {
  G.over = true;
  sfx.humOff();
  sfx.scream();
  const when = clockLabel(G.t);
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
  showScare(message, toHtml(g), nightLost(), true);
}

// The heat reached 100%: you pass out. No jumpscare and no shaking, but it costs a life all the same.
function passOut() {
  G.over = true;
  sfx.humOff();
  sfx.faint();
  const message = `It got too hot in the office. You passed out at ${clockLabel(G.t)}.` + countKill('heat', 'The heat');
  showScare(message, toHtml(grid(PASSED_OUT, 22, 'dim')), nightLost(), false);
}

// =====================================================================
// The uncommon, rare, epic and legendary characters.
// =====================================================================

// ---------- Foxy (uncommon) ----------
// He gets ready in Pirate Cove one stage at a time. Shining the flashlight on the cove (CAM 3, the
// pointer over the picture) pushes him back one stage for every FOXY_FLASH seconds of steady light, and
// holds him still meanwhile. After his last stage he runs to the left door: if it's shut, he bangs on it
// and that costs power; if not, he gets you.
const foxyLit = () => onCam('cove') && flashOn() && aim.where === 'feed';
function updateFoxy(dt) {
  const X = G.fox;
  if (!X.on) return;
  if (X.phase === 'run') {
    X.runT -= dt;
    if (X.runT > 0) return;
    if (!G.doors.L) { lose(FOXY, 'L'); return; }
    sfx.bang();
    sfx.bonk('L');   // and the bonk, like everyone else who runs into a shut door
    G.power -= FOXY_COST;
    X.phase = 'cove';
    X.stage = 0;
    X.timer = around(FOXY_INTERVAL);
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
      X.timer = around(FOXY_INTERVAL);
      sfx.foxyBack();
      dirty = true;
    }
    return;
  }
  X.flashT = 0;
  X.timer -= dt;
  if (X.timer > 0) return;
  X.timer = around(FOXY_INTERVAL);
  if (Math.random() >= FOXY_CHANCE) return;
  X.stage++;
  if (onCam('cove')) camStatic(0.4);
  if (X.stage >= FOXY_STAGES) {
    X.phase = 'run';
    X.runT = FOXY_RUN;
    sfx.run();
  }
  dirty = true;
}

// ---------- Golden Freddy (uncommon) ----------
// Called by toggleCam each time you put the monitor down: maybe he's sitting there.
function lookedBack() {
  const Go = G.gol;
  if (Go.on && !Go.present && Math.random() < GOLDEN_CHANCE) {
    Go.present = true;
    Go.deadline = G.t + GOLDEN_WINDOW;
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

// ---------- Toy Freddy (uncommon) and Withered Bonnie (rare) ----------
// Both walk into your office on a timer; then put the mask on and keep it on until they leave.
// Toy Freddy comes whenever his timer runs out, even with the monitor up (so listen for him), leaves
// sooner and gives you longer. Withered Bonnie's timer never stops either, but he waits for the monitor
// to come down before he walks in, and needs the mask on longer.
function updateToyFreddy(dt) {
  const T = G.tfr;
  if (!T.on) return;
  if (!T.present) {
    T.timer -= dt;
    if (T.timer > 0) return;
    T.present = true;
    T.maskT = 0;
    T.deadline = G.t + REACT_WINDOW + TOY_FREDDY_EXTRA;
    sfx.walkIn(70);
    dirty = true;
    return;
  }
  const result = maskCheck(T, TOY_FREDDY_HOLD, dt, REACT_WINDOW + TOY_FREDDY_EXTRA);
  if (result === 'gone') {
    T.present = false;
    T.timer = waitFrom(TOY_FREDDY_WAIT);
    sfx.walkOut(70);
    dirty = true;
  } else if (result === 'fail') lose(TFREDDY);
}
function updateWitheredBonnie(dt) {
  const W = G.wbn;
  if (!W.on) return;
  if (!W.present) {
    W.timer -= dt;
    if (W.timer > 0 || G.cam) return;   // at 0 with the monitor up: he waits for you to put it down
    W.present = true;
    W.maskT = 0;
    W.deadline = G.t + REACT_WINDOW;
    sfx.walkIn(55);
    dirty = true;
    return;
  }
  const result = maskCheck(W, WBN_HOLD, dt);
  if (result === 'gone') {
    W.present = false;
    W.timer = waitFrom(WBN_WAIT);
    sfx.walkOut(55);
    dirty = true;
  } else if (result === 'fail') lose(WBONNIE);
}

// ---------- Nightmare Bonnie (uncommon) ----------
// He turns up in a doorway (breathing on that side). Keep the flashlight on him for NBN_FLASH seconds
// (doorLit: the door has to be open for the light to reach him) within NBN_TIME seconds.
function updateNightmareBonnie(dt) {
  const N = G.nbn;
  if (!N.on) return;
  if (!N.side) {
    N.timer -= dt;
    if (N.timer > 0) return;
    N.side = pick(['L', 'R']);
    N.flashT = 0;
    N.deadline = G.t + NBN_TIME;
    sfx.breathe(N.side);
    dirty = true;
    return;
  }
  if (doorLit(N.side)) {
    N.flashT += dt;
    if (N.flashT >= NBN_FLASH) {
      N.side = null;
      N.timer = waitFrom(NBN_WAIT);
      sfx.foxyBack();
      dirty = true;
      return;
    }
  } else {
    N.flashT = 0;
  }
  if (G.t >= N.deadline) lose(NBONNIE, N.side);
}

// ---------- Bonnet (uncommon) ----------
// She runs along the floor from one side of the office to the other. If the mouse pointer gets close
// she dodges: up or down out of its way, or, if the pointer is behind her, forward. The floor is only
// a few rows tall, so she soon runs out of room to dodge: come at her from the front and boop her nose.
function updateBonnet(dt) {
  const N = G.bnt;
  if (!N.on) return;
  if (!N.active) {
    N.timer -= dt;
    if (N.timer > 0) return;
    N.active = true;
    N.dir = Math.random() < 0.5 ? 1 : -1;
    N.x = N.dir > 0 ? -5 : OFFICE_W;   // start just outside the side she comes from
    N.y = rand(BONNET_ROWS[0], BONNET_ROWS[1]);
    N.speed = (OFFICE_W + 5) / BONNET_TIME;   // all the way across, plus her own width
    sfx.bonnetIn(N.dir > 0 ? -0.7 : 0.7);
    return;
  }
  N.x += N.dir * N.speed * dt;
  // Dodging. dx and dy are how far the pointer is from the middle of her.
  if (aim.where === 'office' && !G.cam) {
    const dx = aim.c - (N.x + 2), dy = aim.r - (N.y + 0.5);
    if (Math.abs(dx) < 6 && Math.abs(dy) < 3) {
      N.y -= Math.sign(dy || 1) * BONNET_DODGE * 0.6 * dt;       // step up or down, away from it
      if (dx * N.dir < 0) N.x += N.dir * BONNET_DODGE * dt;      // pointer behind her: run on faster
      N.y = Math.max(BONNET_ROWS[0], Math.min(BONNET_ROWS[1], N.y));
    }
  }
  if ((N.dir > 0 && N.x >= OFFICE_W) || (N.dir < 0 && N.x <= -5)) lose(BONNET);
}
// A click at row r, column c of the office: was it on her nose (the * in the middle of her face)?
// Returns true if it booped her.
function boopBonnet(r, c) {
  const N = G.bnt;
  if (!N.active) return false;
  const noseR = Math.round(N.y) + 1, noseC = Math.round(N.x) + 2;
  if (Math.abs(r - noseR) > 1 || Math.abs(c - noseC) > 1.5) return false;
  N.active = false;
  N.timer = waitFrom(BONNET_WAIT);
  sfx.boop();
  dirty = true;
  return true;
}

// ---------- Withered Foxy (rare) ----------
// His routine, one `phase` at a time:
//   'away'     nowhere to be seen. When his timer runs out he runs at the left door.
//   'run'      running steps for WFX_RUN seconds, seen on the West hall camera. When the steps stop
//              the door must be shut, or he gets you.
//   'wait'     shut out, waiting behind the door until he stomps. Opening it now is too early:
//   'door'     ...he's right there in the doorway: shut it again in time!
//   'ready'    he stomped (and keeps stomping): now open the door...
//   'open'     ...and flash him (WFX_FLASH seconds of light in the doorway)...
//   'flashed'  ...then shut the door on him once more, and he leaves.
// Shutting the door in 'open' before he's had enough light just puts him back to 'wait'.
const wfoxyInDoorway = () => ['door', 'open', 'flashed'].includes(G.wfx.phase);
function updateWitheredFoxy(dt) {
  const X = G.wfx;
  if (!X.on) return;
  const shut = G.doors.L;
  switch (X.phase) {
    case 'away':
      X.timer -= dt;
      if (X.timer > 0) return;
      X.phase = 'run';
      X.runT = WFX_RUN;
      X.stepT = 0;
      if (onCam('whall')) camStatic(0.3);
      dirty = true;
      return;
    case 'run':
      X.runT -= dt;
      X.stepT -= dt;
      if (X.runT > 0) {
        if (X.stepT <= 0) { X.stepT = 0.17; sfx.runStep('L', 1 - X.runT / WFX_RUN); }
        return;
      }
      if (shut) wfoxyShutOut();
      else lose(WFOXY, 'L');
      dirty = true;
      return;
    case 'wait':
      if (!shut) { X.phase = 'door'; X.deadline = G.t + REACT_WINDOW; sfx.arrive('L', 90); dirty = true; return; }
      X.waitT -= dt;
      if (X.waitT <= 0) { X.phase = 'ready'; X.stompT = 0; }
      return;
    case 'door':
      if (shut) wfoxyShutOut();
      else if (G.t >= X.deadline) lose(WFOXY, 'L');
      return;
    case 'ready':
      if (!shut) { X.phase = 'open'; X.flashT = 0; X.deadline = G.t + REACT_WINDOW + 1; dirty = true; return; }
      X.stompT -= dt;
      if (X.stompT <= 0) { sfx.stomp(); X.stompT = STOMP_EVERY; }   // stomps until you open up
      return;
    case 'open':
      if (shut) { wfoxyShutOut(); return; }   // shut before he's had enough light: back to waiting
      if (doorLit('L')) {
        X.flashT += dt;
        if (X.flashT >= WFX_FLASH) {
          X.phase = 'flashed';
          X.deadline = G.t + REACT_WINDOW;
          sfx.foxyBack();
          dirty = true;
          return;
        }
      }
      if (G.t >= X.deadline) lose(WFOXY, 'L');
      return;
    case 'flashed':
      if (shut) {
        X.phase = 'away';
        X.timer = waitFrom(WFX_WAIT);
        sfx.bonk('L');
        sfx.retreat();
        dirty = true;
      } else if (G.t >= X.deadline) lose(WFOXY, 'L');
  }
}
// The left door is shut on him: a bang, and he waits behind it until his stomp.
function wfoxyShutOut() {
  const X = G.wfx;
  X.phase = 'wait';
  X.waitT = waitFrom(WFX_STOMP);
  sfx.bang();
  dirty = true;
}

// ---------- Springtrap and Circus Baby (rare) ----------
// They come through the cameras along their route, a room at a time. From the last room they climb into
// your office and get you (but never sooner than LAST_ROOM_WAIT seconds after getting there). The
// controlled shock on their camera sends them back (see shock below). `sound` is their moving sound,
// played with how far along they are (0 to 1).
function updateShockWalker(c, S, interval, chance, sound, dt) {
  if (!S.on) return;
  const last = c.route.length - 1;
  S.timer -= dt;
  if (S.timer > 0) return;
  S.timer = around(interval);
  if (Math.random() >= chance) return;
  if (S.step === last) {
    if (G.t >= S.readyAt) lose(c);
    return;
  }
  const from = c.route[S.step];
  S.step++;
  if (onCam(from) || onCam(c.route[S.step])) camStatic(0.4);
  sound(S.step / last);
  if (S.step === last) S.readyAt = G.t + LAST_ROOM_WAIT;
  dirty = true;
}
const updateSpringtrap = dt => updateShockWalker(SPRING, G.spr, SPRING_INTERVAL, SPRING_CHANCE, sfx.springMove, dt);
const updateBaby = dt => updateShockWalker(BABY, G.bab, BABY_INTERVAL, BABY_CHANCE, sfx.babyMove, dt);

// Is the shock any use tonight? Only with Springtrap or Circus Baby in your lineup.
const shockOn = () => SHOCKABLE.some(isOn);
// The controlled shock (the Shock button or X): with the monitor up on CAMS, it zaps the camera you're
// looking at. Springtrap there goes back one room; Circus Baby all the way back to the start. Each shock
// costs SHOCK_COST % power and needs SHOCK_COOLDOWN seconds to charge again.
function shock() {
  if (!ready()) return;
  if (!powered() || !shockOn() || !camsShowing() || G.t < G.shockReady) { sfx.deny(); return; }
  G.shockReady = G.t + SHOCK_COOLDOWN;
  G.power -= SHOCK_COST;
  G.zapUntil = performance.now() + 250;   // render.js flashes the camera picture until then
  let hit = false;
  const S = G.spr, B = G.bab;
  if (S.on && SPRING.route[S.step] === G.camRoom) { S.step = Math.max(0, S.step - 1); S.timer = around(SPRING_INTERVAL); hit = true; }
  if (B.on && BABY.route[B.step] === G.camRoom) { B.step = 0; B.timer = around(BABY_INTERVAL); hit = true; }
  sfx.shock(hit);
  if (G.power <= 0) powerOutStart();
  dirty = true;
}

// ---------- Nightmare Chica (rare) ----------
// A strange noise, and her cupcake is HIDDEN on one of the cameras (small and dim, tucked into the
// room's picture: NCHICA_SPOTS in art.js). Find it and click it before NCH_TIME runs out.
function updateNightmareChica(dt) {
  const N = G.nch;
  if (!N.on) return;
  if (!N.room) {
    N.timer -= dt;
    if (N.timer > 0) return;
    N.room = pick(CAM_ORDER);
    N.spot = pick(NCHICA_SPOTS[N.room]);
    N.deadline = G.t + NCH_TIME;
    sfx.nchicaIn();
    dirty = true;
    return;
  }
  if (G.t >= N.deadline) lose(NCHICA);
}
// A click on the camera picture at row r, column c (from input.js): did it hit her cupcake?
function clickFeed(r, c) {
  const N = G && G.nch;
  if (!N || !ready() || !N.room || !onCam(N.room) || performance.now() < G.staticUntil) return;
  const [row, col] = N.spot;
  if (Math.abs(r - row) > 0.8 || c < col - 0.8 || c > col + 2.8) return;
  N.room = null;
  N.timer = waitFrom(NCH_WAIT);
  sfx.pop();
  dirty = true;
}

// ---------- Shadow Bonnie (epic) ----------
// The office goes dark and his eyes hide somewhere in it (never over the vent). Hold the light on them
// for SBN_SHINE seconds before time runs out.
function updateShadowBonnie(dt) {
  const S = G.sbn;
  if (!S.on) return;
  if (!S.active) {
    S.timer -= dt;
    if (S.timer > 0) return;
    S.active = true;
    S.eyes = pick(SHADOW_EYES);
    S.deadline = G.t + SBN_TIME;
    S.shineT = 0;
    sfx.lightsOff();
    dirty = true;
    return;
  }
  if (beamOn(S.eyes[0], S.eyes[1] + 1)) {   // + 1: the middle of "O O"
    S.shineT += dt;
    if (S.shineT >= SBN_SHINE) {
      S.active = false;
      S.timer = waitFrom(SBN_WAIT);
      sfx.lightsOn();
      dirty = true;
      return;
    }
  } else {
    S.shineT = 0;
  }
  if (G.t >= S.deadline) lose(SBONNIE);
}

// ---------- Plushtrap (epic) ----------
// He giggles and hides somewhere in the office. Any flashlight on him sends him away at once, but his
// timer is short. (Nightmare Fredbear's little plush works the same way, with less time: see below.)
function updatePlushtrap(dt) {
  const P = G.plu;
  if (!P.on) return;
  if (!P.spot) {
    P.timer -= dt;
    if (P.timer > 0) return;
    P.spot = pick(PLUSH_SPOTS);
    P.deadline = G.t + PLU_TIME;
    sfx.giggle((P.spot[1] - OFFICE_W / 2) / (OFFICE_W / 2));   // the giggle leans toward where he's hiding
    dirty = true;
    return;
  }
  const [r, c] = P.spot;
  if (beamOn(r + 0.5, c + 1.5)) {   // + 0.5 and + 1.5: the middle of his 4 x 2 drawing
    P.spot = null;
    P.timer = waitFrom(PLU_WAIT);
    sfx.pop();
    dirty = true;
  } else if (G.t >= P.deadline) {
    lose(PLUSH);
  }
}

// ---------- Funtime Freddy (epic) ----------
// He stands on one side of the auditorium (CAM 7) and says a line every so often, shown as a subtitle.
// An attack line sends him to a door: "Bon-Bon, go get 'em!" the door on his side, "Let's give him a
// surprise!" the other one. You hear his steps from that side, and FFR_RUN seconds later he's there:
// shut that door (you get FFR_GRACE more once he's there). Now and then, when he isn't attacking, he
// walks over to the other side of the auditorium (a quiet shuffle), so check CAM 7 again.
function updateFuntimeFreddy(dt) {
  const F = G.ffr;
  if (!F.on) return;
  if (F.phase === 'idle') {
    F.switchT -= dt;
    if (F.switchT <= 0) {
      F.switchT = waitFrom(FFR_SWITCH);
      F.home = otherSide(F.home);
      sfx.ffrShuffle();
      if (onCam('audit')) camStatic(0.4);
      dirty = true;
    }
  }
  // His next line.
  F.lineT -= dt;
  if (F.lineT <= 0) {
    F.lineT = waitFrom(FFR_LINE_GAP);
    const attack = F.phase === 'idle' && Math.random() < FFR_ATTACK_CHANCE;
    F.line = attack ? pick([FFR_SAME_SIDE, FFR_OTHER_SIDE]) : pick(FFR_TALK);
    F.subUntil = G.t + FFR_SUB_SHOW;   // shown as a subtitle for a few seconds (render.js)
    sfx.voice(attack);
    if (attack) {
      F.phase = 'going';
      F.pos = F.line === FFR_SAME_SIDE ? F.home : otherSide(F.home);
      F.goT = FFR_RUN;
      F.stepped = false;
      sfx.ffrStep(F.pos, 0);
    }
    dirty = true;
  }
  if (F.phase === 'going') {
    F.goT -= dt;
    if (!F.stepped && F.goT <= FFR_RUN / 2) { F.stepped = true; sfx.ffrStep(F.pos, 1); }
    if (F.goT > 0) return;
    if (G.doors[F.pos]) { ffrBack(); return; }
    F.phase = 'door';
    F.deadline = G.t + FFR_GRACE;
    dirty = true;
  } else if (F.phase === 'door') {
    if (G.doors[F.pos]) ffrBack();
    else if (G.t >= F.deadline) lose(FFREDDY, F.pos);
  }
}
// Shut out: a bonk, and back to his side of the auditorium.
function ffrBack() {
  const F = G.ffr;
  sfx.bonk(F.pos);
  F.phase = 'idle';
  dirty = true;
}

// ---------- prowling outside (Withered Freddy and Nightmare Fredbear) ----------
// One step along PROWL_PATH (0 = left door ... 4 = right door), turning round at either end.
function prowlStep(P) {
  P.at += P.dir;
  if (P.at <= 0) { P.at = 0; P.dir = 1; }
  if (P.at >= PROWL_PATH.length - 1) { P.at = PROWL_PATH.length - 1; P.dir = -1; }
}
// Which window (if any) a prowler is passing right now: 'L', 'R' or null.
const prowlWindow = P => PROWL_PATH[P.at] === 'Lwin' ? 'L' : PROWL_PATH[P.at] === 'Rwin' ? 'R' : null;

// ---------- Withered Freddy (legendary) ----------
// He paces back and forth outside, between your doors, one step every WFR_STEP seconds, without a
// sound. You only see him as he passes a window, and in the middle he sometimes turns round. At a door,
// WFR_TRY of the time he tries to get in (his eyes show in the dark doorway): shut that door within
// WFR_WINDOW seconds. If it's already shut, he just turns round.
function updateWitheredFreddy(dt) {
  const W = G.wfr;
  if (!W.on) return;
  if (W.trying) {
    if (G.doors[W.side]) { W.trying = false; dirty = true; }   // shut out: he turns round, silently
    else if (G.t >= W.deadline) lose(WFREDDY, W.side);
    return;
  }
  W.stepT -= dt;
  if (W.stepT > 0) return;
  W.stepT = around(WFR_STEP);
  if (PROWL_PATH[W.at] === 'mid' && Math.random() < 0.3) W.dir = -W.dir;   // changed his mind
  prowlStep(W);
  const spot = PROWL_PATH[W.at];
  if ((spot === 'L' || spot === 'R') && !G.doors[spot] && Math.random() < WFR_TRY) {
    W.trying = true;
    W.side = spot;
    W.deadline = G.t + WFR_WINDOW;
  }
  dirty = true;
}

// ---------- Funtime Foxy (legendary) ----------
// The sign on the show stage (CAM 1) says when the next show is. Be watching CAM 1 then (FFX_GRACE
// seconds late is still all right): applause, and the sign shows the next one. Miss it and he gets you.
function updateFuntimeFoxy() {
  const X = G.ffx;
  if (!X.on || X.show >= NIGHT_END || G.t < X.show) return;
  if (!X.played) { X.played = true; sfx.showtime(); }
  if (onCam('stage')) {
    sfx.applause();
    X.show = roundShow(G.t + waitFrom(FFX_GAP));
    X.played = false;
    dirty = true;
  } else if (G.t >= X.show + FFX_GRACE) lose(FFOXY);
}

// ---------- Nightmare Fredbear (legendary) ----------
// Every NFB_WAIT seconds he picks one of three attacks:
//   'prowl'  he walks from the middle past a window to one of the doors (like Withered Freddy) and
//            stands in the doorway, breathing (like Nightmare Bonnie): keep the light on him for NFB_FLASH
//            seconds within NFB_DOOR_TIME. A shut door blocks the light, so it doesn't help.
//   'toy'    he walks into your office (a harder Toy Freddy): mask on within NFB_TOY_REACT seconds and
//            keep it on for NFB_TOY_HOLD.
//   'plush'  his little plush hides in your office (a harder Plushtrap): shine it within NFB_PLUSH_TIME.
function updateFredbear(dt) {
  const N = G.nfb;
  if (!N.on) return;
  if (!N.mode) {
    N.timer -= dt;
    if (N.timer > 0) return;
    N.mode = pick(['prowl', 'toy', 'plush']);
    if (N.mode === 'prowl') {
      N.at = 2;
      N.dir = pick([-1, 1]);
      N.stepT = WFR_STEP;
      N.side = null;
    } else if (N.mode === 'toy') {
      N.maskT = 0;
      N.deadline = G.t + NFB_TOY_REACT;
      sfx.walkIn(45);
    } else {
      N.spot = pick(PLUSH_SPOTS);
      N.deadline = G.t + NFB_PLUSH_TIME;
      sfx.giggle((N.spot[1] - OFFICE_W / 2) / (OFFICE_W / 2));
    }
    dirty = true;
    return;
  }
  if (N.mode === 'prowl') {
    if (!N.side) {
      // Still walking: one step every WFR_STEP seconds, until he reaches a door.
      N.stepT -= dt;
      if (N.stepT > 0) return;
      N.stepT = WFR_STEP;
      prowlStep(N);
      const spot = PROWL_PATH[N.at];
      if (spot === 'L' || spot === 'R') {
        N.side = spot;
        N.flashT = 0;
        N.deadline = G.t + NFB_DOOR_TIME;
        sfx.breathe(spot);
      }
      dirty = true;
      return;
    }
    if (doorLit(N.side)) {
      N.flashT += dt;
      if (N.flashT >= NFB_FLASH) { sfx.foxyBack(); fredbearDone(); return; }
    } else {
      N.flashT = 0;
    }
    if (G.t >= N.deadline) lose(NFREDBEAR, N.side);
  } else if (N.mode === 'toy') {
    const result = maskCheck(N, NFB_TOY_HOLD, dt, NFB_TOY_REACT);
    if (result === 'gone') { sfx.walkOut(45); fredbearDone(); }
    else if (result === 'fail') lose(NFREDBEAR);
  } else {
    const [r, c] = N.spot;
    if (beamOn(r + 0.5, c + 1.5)) { sfx.pop(); fredbearDone(); }
    else if (G.t >= N.deadline) lose(NFREDBEAR);
  }
}
// One of his attacks is beaten: he's gone until next time.
function fredbearDone() {
  const N = G.nfb;
  N.mode = null;
  N.side = null;
  N.spot = null;
  N.timer = waitFrom(NFB_WAIT);
  dirty = true;
}
