/* =====================================================================
   game.js: the RULES. How the night plays out, moment to moment.

   Everything about one night lives in a single object called G
   (time, power, oxygen, doors, camera, where every character is...).
   The rules change G; render.js then draws whatever G says.

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

// How many times each character has got you, by its id: { nbn: 3, bab: 1, ... }. Saved in the browser
// and shown on the game over and custom night screens.
let kills = store.get('kills', {}) || {};
// Add one to `id`'s tally, save it, and return a line for the game over screen like
// "Circus Baby has got you 3 times." (`name` is what the line calls it.)
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
// outdated(key) is true for a key like "Circus v1" when Circus is now on a higher version.
const outdated = key => {
  const m = /^(.*) v(\d+)$/.exec(key);   // m[1] is the name, m[2] the version number
  const p = m && PRESETS.find(p => p.name === m[1]);
  return !!p && (p.v || 1) > Number(m[2]);
};
const savedTicks = [...new Set(store.get('cleared', []) || [])].filter(key => !outdated(key));
store.set('cleared', savedTicks);
let cleared = savedTicks.filter(key => PRESETS.some(p => clearKey(p) === key));

// Which challenge matches tonight's levels EXACTLY, or null if none does.
const matchingPreset = () => PRESETS.find(p => p.levels.every((lv, i) => lv === levels[i])) || null;

// A night's score: every level added up. The most is 18 x 20 = 360.
const nightScore = () => levels.reduce((total, lv) => total + lv, 0);
const MAX_SCORE = SETUP.length * MAX_LEVEL;

// ---------- the current night ----------
let G = null;        // all the state of the night in progress (built by newGame)
let dirty = true;    // "something changed, redraw now" (render.js also redraws 15x a second anyway)

// Is there power to use things right now? Not after a power-out.
const powered = () => !G.powerOut;
// Is a door blocked? The normal door or the heavy door on that side both stop someone walking in.
const blocked = side => G.doors[side] || G.heavy[side];
// Are you looking at camera `room` right now (and not at static)?
const onCam = room => G.cam && G.camRoom === room;
const seeing = room => onCam(room) && performance.now() >= G.staticUntil;
// Are you at your desk (not on the monitor, not at a door)?
const atDesk = () => !G.cam && !G.at;

// Turn seconds into the clock: with 30-second hours, 0-29s is 12 AM, 30-59s is 1 AM, and so on.
const hourOf = t => Math.min(NIGHT_HOURS, Math.floor(t / HOUR_SECONDS));
// The clock to the minute, like "2:07 AM". With 30-second hours, an in-game minute is half a real
// second. padStart(2, '0') turns 7 into "07".
function clockLabel(t) {
  const minutes = Math.min(NIGHT_HOURS * 60, Math.floor(t / HOUR_SECONDS * 60));
  const h = Math.floor(minutes / 60), m = minutes % 60;
  return `${h === 0 ? 12 : h}:${String(m).padStart(2, '0')} AM`;
}
const NIGHT_END = HOUR_SECONDS * NIGHT_HOURS;   // 6 AM, in seconds

// The level of character c tonight (c is one of the descriptions in data.js, like BABY).
const levelOf = c => levels[SETUP.indexOf(c)];

// A nightmare's state: how far down its hall it is, which side, and (at the door) its clocks.
const nightmare = c => ({ level: levelOf(c), stage: 0, side: c.side || 'L', timer: c.interval * rand(0.7, 1.3),
  atDoor: false, shut: false, deadline: 0, stayT: 0, breathT: 0,
  inside: false, grow: 0, growT: 0 });   // inside / grow / growT: only Nightmare Foxy uses these (foxyGrows)

// Funtime Freddy's script for the night: FFR_LINES lines spread over the night, some of them important.
function makeScript(level) {
  if (level === 0) return [];
  const times = Array.from({ length: FFR_LINES }, (_, i) => 12 + (i + rand(0.15, 0.85)) * (NIGHT_END - 24) / FFR_LINES);
  const important = new Set();
  while (important.size < Math.min(ffrAttacks(level), FFR_LINES)) important.add(Math.floor(Math.random() * FFR_LINES));
  return times.map((t, i) => ({
    t, important: important.has(i), done: false,
    text: important.has(i) ? pick(FFR_ATTACK_LINES) : pick(FFR_TALK),
  }));
}
// Showtimes land on a round time: a multiple of 10 in-game minutes (5 real seconds).
const roundShow = t => Math.ceil(t / 5) * 5;

// Build a fresh night.
function newGame() {
  G = {
    t: 0,                          // seconds since 12 AM
    power: 100,                    // percent
    oxygen: 100,                   // percent; it never comes back
    doors: { L: false, R: false }, // normal doors: true = closed
    heavy: { L: false, R: false }, // heavy doors: true = closed
    vent: false,                   // the vent door above you: true = closed
    cam: false,                    // is the monitor raised?
    camRoom: 'lhall',              // which camera you are looking at
    at: null,                      // 'L' or 'R' while you're at that door, listening; null at the desk
    mask: false,                   // are you wearing the mask?
    powerOut: false, outTimer: 0,
    over: false, paused: false,
    staticUntil: 0,                // camera shows static until this time (milliseconds)
    shockReady: 0,                 // when the shock is charged again (G.t)
    zapUntil: 0,                   // the shock's flash shows until this time (milliseconds)
    lastAir: MINIREENA,            // who used up oxygen most recently (they get the blame at 0%)
    o2WarnT: 0, ambientT: 4,

    nfr: { level: levelOf(NFREDDY), freddles: 0, coming: 0, timer: freddleWait(levelOf(NFREDDY)) },
    nbn: nightmare(NBONNIE), nch: nightmare(NCHICA), nfx: nightmare(NFOXY), nfb: nightmare(NFREDBEAR),
    // Circus Baby: her step down the left hall; then `inside` (in your office) and `close` (right in front of you).
    bab: { level: levelOf(BABY), stage: 0, timer: BABY_INTERVAL * rand(0.7, 1.3), inside: false, close: false, maskT: 0, deadline: 0 },
    // Ballora: her step toward the side she picked, and her clock once she's there.
    bal: { level: levelOf(BALLORA), step: 0, side: 'L', timer: BALLORA_INTERVAL * rand(0.7, 1.3), deadline: 0, musicT: 0 },
    // Funtime Freddy: his script, where he stands in the auditorium ('C', 'L' or 'R') and what he's doing.
    ffr: { level: levelOf(FFREDDY), script: makeScript(levelOf(FFREDDY)), said: -1, home: 'L', pos: 'L', phase: 'idle', goT: 0, stepped: false, deadline: 0, switchT: ffrSwitch(levelOf(FFREDDY)) },
    // Funtime Foxy: the time (G.t) of the next show, and whether its fanfare has played.
    ffx: { level: levelOf(FFOXY), show: roundShow(ffxGap(levelOf(FFOXY)) * rand(0.8, 1.1)), played: false },
    // Ennard: null between visits, then 'hall' (walking to a door), 'door' (at it) or 'air' (in the oxygen room).
    end: { level: levelOf(ENNARD), mode: null, side: 'L', stage: 0, timer: ennardWait(levelOf(ENNARD)), stepT: 0, deadline: 0 },
    mrn: { level: levelOf(MINIREENA), count: 0, timer: minireenaWait(levelOf(MINIREENA)) },
    nmt: { level: levelOf(NMARIONETTE), present: false, hits: 0, timer: nightmarionetteWait(levelOf(NMARIONETTE)) },
    wbn: { level: levelOf(WBONNIE), present: false, maskT: 0, deadline: 0, timer: witheredWait(levelOf(WBONNIE)) },
    // Bidybab: squeaks so far, and (after every 3rd) the clock to shut the vent.
    bdb: { level: levelOf(BIDYBAB), squeaks: 0, waiting: false, deadline: 0, timer: bidySqueak(levelOf(BIDYBAB)) },
    jck: { level: levelOf(JACKO), side: null, smokeT: 0, timer: jackWait(levelOf(JACKO)) },
    ptr: { level: levelOf(PLUSHTRAP), present: false, watchT: 0, timer: plushWait(levelOf(PLUSHTRAP)) },
    ncp: { level: levelOf(NCUPCAKE), present: false, chompT: 0, timer: cupcakeWait(levelOf(NCUPCAKE)) },
    // Nightmare Mangle: the room they're really in, and the rooms that only blink.
    nmg: { level: levelOf(NMANGLE), present: false, room: 'parts', decoys: [], radioT: 0, timer: mangleWait(levelOf(NMANGLE)) },
    // Nightmare BB: asleep in the corner, or awake (after a monitor flip down) until the lamp puts him back.
    nbb: { level: levelOf(NBB), awake: false },
    lampUntil: 0,                  // the lamp's flash shows until this time (milliseconds)
  };
  // Funtime Freddy's side of the auditorium for tonight (his lines are about this side).
  G.ffr.home = G.ffr.pos = pick(['L', 'R']);
}

// ---------- Nightmare BB ----------
// Putting the monitor down may wake him (nbbChance). Awake, he gets you the moment you raise the monitor
// again, unless the lamp has put him back to sleep first (flashLamp).
function bbMayWake() {
  const B = G.nbb;
  if (B.level === 0 || B.awake || Math.random() >= nbbChance(B.level)) return;
  B.awake = true;
  sfx.nbbWake();
  dirty = true;
}
// Raising the monitor: fine while he sleeps; if he's awake, that's the end.
function bbWatching() {
  if (G.nbb.level > 0 && G.nbb.awake) { lose(NBB, null, 'cam'); return true; }
  return false;
}

// The lamp on the desk: one short flash on Nightmare BB's corner (on request: a lamp you click, not a
// flashlight you hold). Awake, he goes back to sleep. Asleep, the flash wakes him the wrong way.
// It's free, and only works at the desk (not on the monitor or at a door).
function flashLamp() {
  if (!ready()) return;
  if (!powered() || G.cam || G.at) { sfx.deny(); return; }
  G.lampUntil = performance.now() + LAMP_SHOW * 1000;
  sfx.lamp();
  dirty = true;
  const B = G.nbb;
  if (B.level === 0) return;
  if (B.awake) { B.awake = false; sfx.nbbSleep(); }
  else lose(NBB, null, 'woke');
}

// ---------- the main rule loop ----------
function update(dt) {
  G.t += dt;
  if (G.t >= NIGHT_END) return win();   // made it to 6 AM

  if (G.powerOut) {
    // Power is out: nothing to do but wait in the dark.
    G.outTimer -= dt;
    if (G.outTimer <= 0) lose(NFREDDY, null, 'dark');
    return;
  }
  // Now and then a far-off noise somewhere in the building, for the atmosphere.
  G.ambientT -= dt;
  if (G.ambientT <= 0) { sfx.ambient(); G.ambientT = rand(6, 14); }

  updatePower(dt);
  if (G.over || G.powerOut) return;
  updateOxygen(dt);
  // Each character in turn. `for...of` runs the function for each one; we stop as soon as one ends the night.
  for (const step of [updateFreddles, updateNightmares, updateBaby, updateBallora, updateFuntimeFreddy,
    updateFuntimeFoxy, updateEnnard, updateMinireenas, updateNightmarionette, updateWithered, updateBidybab,
    updateJacko, updatePlushtrap, updateCupcake, updateMangle]) {
    if (G.over || G.powerOut) return;
    step(dt);
  }
}

// How much is using power right now: the monitor, each closed door, the vent door, and the heavy
// doors (HEAVY_UNITS each). true counts as 1 and false as 0 when you add them up.
const powerUnits = () => G.cam + G.doors.L + G.doors.R + G.vent + HEAVY_UNITS * (G.heavy.L + G.heavy.R);

function updatePower(dt) {
  let drain = UNIT_DRAIN * powerUnits();
  if (G.ncp.present) drain += NCP_DRAIN;
  if (G.nmg.present) drain += NMG_DRAIN;
  G.power -= drain * dt;
  if (G.power <= 0) powerOutStart();
}

// Everyone who's using up oxygen right now, with how fast (% per second).
function airThieves() {
  const list = [];
  if (G.mrn.count) list.push([MINIREENA, MRN_O2 * G.mrn.count]);
  if (G.nmt.present) list.push([NMARIONETTE, NMT_O2]);
  if (G.end.mode === 'air') list.push([ENNARD, END_O2]);
  if (G.jck.side) list.push([JACKO, JCK_O2]);
  if (G.ptr.present) list.push([PLUSHTRAP, PTR_O2]);
  return list;
}
function updateOxygen(dt) {
  const thieves = airThieves();
  if (!thieves.length) return;
  G.oxygen -= thieves.reduce((sum, [, rate]) => sum + rate, 0) * dt;
  // The one taking the most gets the blame if you pass out.
  G.lastAir = thieves.reduce((a, b) => (b[1] > a[1] ? b : a))[0];
  if (G.oxygen < O2_LOW) {
    G.o2WarnT -= dt;
    if (G.o2WarnT <= 0) { sfx.o2Warn(); G.o2WarnT = 3; }
  }
  if (G.oxygen <= 0) { G.oxygen = 0; lose(G.lastAir, null, 'o2'); }
}

// ---------- Nightmare Freddy's Freddles ----------
// A Freddle climbs onto the desk every so often. When the last one (FREDDLE_MAX) is up, Nightmare
// Freddy is coming: shock the desk within the reaction window or he gets you.
function updateFreddles(dt) {
  const F = G.nfr;
  if (F.level === 0) return;
  if (F.coming) { if (G.t >= F.coming) lose(NFREDDY); return; }
  F.timer -= dt;
  if (F.timer > 0) return;
  F.timer = freddleWait(F.level);
  F.freddles++;
  sfx.freddle();
  if (F.freddles >= FREDDLE_MAX) F.coming = G.t + reactWindow(F.level);
  dirty = true;
}

// ---------- the nightmares (heavy doors) ----------
// Down the hall a step at a time (footsteps, and seen on that hall's camera, except Foxy), then at the
// door, out of sight. Shut the HEAVY door in time; then they breathe behind it for NM_STAY seconds and
// leave. Open it before then and they get you. You only hear the breathing while you're at that door.
function updateNightmares(dt) {
  for (const c of NIGHTMARES) {
    if (G.over) return;
    updateNightmare(c, G[c.id], dt);
  }
}
function updateNightmare(c, N, dt) {
  if (N.level === 0) return;
  if (N.inside) { foxyGrows(N, dt); return; }
  if (N.atDoor) {
    if (G.at === N.side) {
      N.breathT -= dt;
      if (N.breathT <= 0) { sfx.breath(N.side, c.pitch); N.breathT = 2; }
    }
    if (G.heavy[N.side]) {
      N.shut = true;
      N.stayT -= dt;
      if (N.stayT <= 0) {
        sfx.leave(N.side);
        nightmareHome(c, N);
      }
    } else if (N.shut || G.t >= N.deadline) {
      // Opened before the breathing stopped, or never shut in time. Nightmare Foxy gets into the office
      // instead (foxyGrows); the others get you.
      if (c === NFOXY) foxyIn(N);
      else lose(c, N.side, N.shut ? 'early' : null);
    }
    return;
  }
  N.timer -= dt;
  if (N.timer > 0) return;
  N.timer = c.interval * rand(0.7, 1.3);
  if (Math.random() >= moveChance(N.level)) return;
  if (N.stage === 0 && !c.side) N.side = pick(['L', 'R']);   // Foxy and Fredbear pick a door each trip
  N.stage++;
  if (!c.unseen && (onCam(HALL[N.side]))) camStatic(0.3);
  if (N.stage <= NM_STAGES) {
    sfx.step(N.stage / NM_STAGES, N.side, c.pitch);
  } else {
    N.atDoor = true;
    N.shut = G.heavy[N.side];
    N.deadline = G.t + reactWindow(N.level) + NM_EXTRA;
    N.stayT = rand(...NM_STAY);
    N.breathT = 0;
  }
  dirty = true;
}
// Nightmare Foxy in your office (on request: getting in doesn't end your night). He starts small on the
// side he came in from and grows a stage every NFX_GROW seconds, with a growl each time. A shock on the
// desk drives him out (shockDesk); if he grows past NFX_STAGES he gets you.
function foxyIn(N) {
  N.atDoor = false;
  N.inside = true;
  N.grow = 1;
  N.growT = NFX_GROW;
  sfx.foxyIn(N.side);
  dirty = true;
}
function foxyGrows(N, dt) {
  N.growT -= dt;
  if (N.growT > 0) return;
  N.grow++;
  N.growT = NFX_GROW;
  if (N.grow > NFX_STAGES) { lose(NFOXY); return; }
  sfx.foxyGrow(N.grow / NFX_STAGES);
  dirty = true;
}
function nightmareHome(c, N) {
  N.inside = false;
  N.stage = 0;
  N.atDoor = false;
  N.shut = false;
  N.timer = c.interval * rand(0.7, 1.3);
  dirty = true;
}

// ---------- Circus Baby ----------
// Down the left hall in BABY_STAGES steps (a soft beep each), then into your office. Mask on in time;
// keep it on for BABY_CLOSE seconds and she's right in front of you: then shock the desk in time.
// Taking the mask off too early starts the count again, with a fresh chance to react.
function updateBaby(dt) {
  const B = G.bab;
  if (B.level === 0) return;
  if (!B.inside) {
    B.timer -= dt;
    if (B.timer > 0) return;
    B.timer = BABY_INTERVAL * rand(0.7, 1.3);
    if (Math.random() >= moveChance(B.level)) return;
    B.stage++;
    if (onCam('lhall')) camStatic(0.3);
    if (B.stage <= BABY_STAGES) sfx.babyBeep(B.stage / BABY_STAGES);
    else {
      B.inside = true;
      B.close = false;
      B.maskT = 0;
      B.deadline = G.t + reactWindow(B.level) + 1;   // a second extra: you might be on the monitor
      sfx.babyIn();
    }
    dirty = true;
    return;
  }
  if (!B.close) {
    if (G.mask) {
      B.maskT += dt;
      if (B.maskT >= BABY_CLOSE) {
        B.close = true;
        B.deadline = G.t + reactWindow(B.level) + 1;
        sfx.babyClose();
        dirty = true;
      }
      return;
    }
    if (B.maskT > 0) { B.maskT = 0; B.deadline = G.t + reactWindow(B.level); }
  }
  if (G.t >= B.deadline) lose(BABY);
}
function babyHome() {
  const B = G.bab;
  B.inside = B.close = false;
  B.stage = 0;
  B.timer = BABY_INTERVAL * rand(1, 1.6);
  sfx.babyOut();
  dirty = true;
}

// ---------- Ballora ----------
// She dances toward a door; her music comes from that side and gets louder each step. Shut that door
// (normal or heavy) before she gets there, or within the reaction window once she's there.
// Like in the games (on request), her music plays the WHOLE time she's on her way and at the door, a
// phrase every BALLORA_MUSIC seconds, not just once per step; it stops when she gives up.
function updateBallora(dt) {
  const B = G.bal;
  if (B.level === 0) return;
  if (B.step > 0) {
    B.musicT -= dt;
    if (B.musicT <= 0) { sfx.ballora(Math.min(1, B.step / BALLORA_STEPS), B.side); B.musicT = BALLORA_MUSIC; }
  }
  if (B.step > BALLORA_STEPS) {
    if (blocked(B.side)) { sfx.bonk(B.side); balloraHome(); }
    else if (G.t >= B.deadline) lose(BALLORA, B.side);
    return;
  }
  B.timer -= dt;
  if (B.timer > 0) return;
  B.timer = BALLORA_INTERVAL * rand(0.7, 1.3);
  if (Math.random() >= moveChance(B.level)) return;
  if (B.step === 0) B.side = pick(['L', 'R']);
  B.step++;
  B.musicT = 0;   // a step closer: her music swells straight away (updateBallora plays it next frame)
  if (B.step > BALLORA_STEPS) {
    if (blocked(B.side)) { sfx.bonk(B.side); balloraHome(); }
    else B.deadline = G.t + reactWindow(B.level);
  }
}
function balloraHome() {
  const B = G.bal;
  B.step = 0;
  B.timer = BALLORA_INTERVAL * rand(0.7, 1.3);
}

// ---------- Funtime Freddy ----------
// He stands on one side of the auditorium (CAM 4), picked at the start of the night (`home`). He reads
// his script (shown in the office) line by line. An important line sends him to a door (on request):
// "Bon-Bon, go get 'em!" the door on his side, "Let's give him a surprise!" the other one. He himself
// stays on his side of the auditorium (on request); the attack comes to that door with steps you hear
// from that side (`pos`), and ffrRun seconds later it's there. Shut it (normal or heavy) in time.
function updateFuntimeFreddy(dt) {
  const F = G.ffr;
  if (F.level === 0) return;
  // Now and then (not during an attack) he walks over to the other side of the auditorium (on request):
  // a quiet shuffle, and static if you're watching CAM 4. Check it again before trusting his side.
  if (F.phase === 'idle') {
    F.switchT -= dt;
    if (F.switchT <= 0) {
      F.switchT = ffrSwitch(F.level);
      if (Math.random() < moveChance(F.level)) {
        F.home = F.pos = F.home === 'L' ? 'R' : 'L';
        sfx.ffrShuffle();
        if (onCam('auditorium')) camStatic(0.4);
        dirty = true;
      }
    }
  }
  // The next line of the script, once its time comes.
  const i = F.script.findIndex(line => !line.done);
  if (i >= 0 && G.t >= F.script[i].t) {
    const line = F.script[i];
    line.done = true;
    F.said = i;
    sfx.voice(line.important);
    if (line.important && F.phase === 'idle') {
      F.phase = 'going';
      const other = F.home === 'L' ? 'R' : 'L';
      F.pos = line.text === FFR_SAME_SIDE ? F.home : other;
      F.goT = ffrRun(F.level);
      F.stepped = false;
      sfx.ffrStep(F.pos, 0);
    }
    dirty = true;
  }
  if (F.phase === 'going') {
    F.goT -= dt;
    if (!F.stepped && F.goT <= ffrRun(F.level) / 2) { F.stepped = true; sfx.ffrStep(F.pos, 1); }
    if (F.goT > 0) return;
    if (blocked(F.pos)) { sfx.bonk(F.pos); freddyBack(); return; }
    F.phase = 'door';
    F.deadline = G.t + FFR_GRACE;
    dirty = true;
  } else if (F.phase === 'door') {
    if (blocked(F.pos)) { sfx.bonk(F.pos); freddyBack(); }
    else if (G.t >= F.deadline) lose(FFREDDY, F.pos);
  }
}
function freddyBack() {
  const F = G.ffr;
  F.phase = 'idle';
  F.pos = F.home;   // back to his side of the auditorium
  dirty = true;
}

// ---------- Funtime Foxy ----------
// The sign on the show stage (CAM 3) says when. Be watching CAM 3 then, or at most FFX_GRACE late.
function updateFuntimeFoxy() {
  const X = G.ffx;
  if (X.level === 0 || X.show >= NIGHT_END) return;
  if (G.t < X.show) return;
  if (!X.played) { X.played = true; sfx.showtime(); }
  if (seeing('stage')) {
    sfx.applause();
    X.show = roundShow(G.t + ffxGap(X.level) * rand(0.8, 1.2));
    X.played = false;
    dirty = true;
  } else if (G.t >= X.show + FFX_GRACE) lose(FFOXY);
}

// ---------- Ennard ----------
// Each visit: either a walk down a hall to a door (clanking, seen on the hall camera; shut the door),
// or a crawl into the oxygen room, CAM 5 (uses up oxygen until you shock that camera; on request).
function updateEnnard(dt) {
  const E = G.end;
  if (E.level === 0) return;
  if (!E.mode) {
    E.timer -= dt;
    if (E.timer > 0) return;
    E.mode = pick(['hall', 'air']);
    if (E.mode === 'hall') { E.side = pick(['L', 'R']); E.stage = 0; E.stepT = ENNARD_INTERVAL; }
    else sfx.ventCrawl();
    dirty = true;
    return;
  }
  if (E.mode === 'hall') {
    E.stepT -= dt;
    if (E.stepT > 0) return;
    E.stepT = ENNARD_INTERVAL * rand(0.7, 1.3);
    E.stage++;
    if (onCam(HALL[E.side])) camStatic(0.3);
    sfx.ennardClank(E.stage / ENNARD_STAGES, E.side);
    if (E.stage > ENNARD_STAGES) { E.mode = 'door'; E.deadline = G.t + reactWindow(E.level); }
    dirty = true;
  }
  if (E.mode === 'door') {
    if (blocked(E.side)) { sfx.bonk(E.side); ennardHome(); }
    else if (G.t >= E.deadline) lose(ENNARD, E.side);
  }
}
function ennardHome() {
  const E = G.end;
  E.mode = null;
  E.stage = 0;
  E.timer = ennardWait(E.level);
  dirty = true;
}

// ---------- Minireenas ----------
function updateMinireenas(dt) {
  const M = G.mrn;
  if (M.level === 0) return;
  M.timer -= dt;
  if (M.timer > 0) return;
  M.timer = minireenaWait(M.level);
  if (M.count >= MRN_MAX) return;
  M.count++;
  sfx.minireena();
  dirty = true;
}

// ---------- the Nightmarionette ----------
function updateNightmarionette(dt) {
  const N = G.nmt;
  if (N.level === 0 || N.present) return;
  N.timer -= dt;
  if (N.timer > 0) return;
  N.present = true;
  N.hits = 0;
  sfx.nmtIn();
  dirty = true;
}

// ---------- Withered Bonnie ----------
// Walks into the office: mask on in time and keep it on for MASK_HOLD seconds. Taking it off early
// starts the count again, with a fresh chance to react.
function updateWithered(dt) {
  const W = G.wbn;
  if (W.level === 0) return;
  if (!W.present) {
    W.timer -= dt;
    if (W.timer > 0) return;
    W.present = true;
    W.maskT = 0;
    W.deadline = G.t + reactWindow(W.level) + 1;
    sfx.wbnIn();
    dirty = true;
    return;
  }
  if (G.mask) {
    W.maskT += dt;
    if (W.maskT >= MASK_HOLD) {
      W.present = false;
      W.timer = witheredWait(W.level);
      sfx.gone();
      dirty = true;
    }
    return;
  }
  if (W.maskT > 0) { W.maskT = 0; W.deadline = G.t + reactWindow(W.level); }
  if (G.t >= W.deadline) lose(WBONNIE);
}

// ---------- Bidybab ----------
// Squeaks in the vent. Every BIDY_EVERY-th squeak, the vent door must be shut within the reaction window.
function updateBidybab(dt) {
  const B = G.bdb;
  if (B.level === 0) return;
  if (B.waiting) {
    // Shut out: she bonks into the vent door (on request) and crawls off.
    if (G.vent) { B.waiting = false; B.squeaks = 0; B.timer = bidySqueak(B.level); sfx.bonk('vent'); dirty = true; }
    else if (G.t >= B.deadline) lose(BIDYBAB);
    return;
  }
  B.timer -= dt;
  if (B.timer > 0) return;
  B.timer = bidySqueak(B.level);
  B.squeaks++;
  sfx.squeak();
  if (B.squeaks % BIDY_EVERY === 0) {
    if (G.vent) { B.squeaks = 0; sfx.bonk('vent'); }   // the vent door was already shut: bonk
    else { B.waiting = true; B.deadline = G.t + reactWindow(B.level); }
  }
  dirty = true;
}

// ---------- Jack-o Chica ----------
// Stands in a doorway (one whose heavy door is open) breathing smoke. Slam that heavy door to send her
// away. She never attacks; the smoke does the damage (oxygen).
function updateJacko(dt) {
  const J = G.jck;
  if (J.level === 0) return;
  if (!J.side) {
    J.timer -= dt;
    if (J.timer > 0) return;
    const open = ['L', 'R'].filter(side => !G.heavy[side]);
    if (!open.length) { J.timer = 3; return; }   // both heavy doors shut: try again soon
    J.side = pick(open);
    J.smokeT = 0;
    dirty = true;
  }
  if (G.heavy[J.side]) {
    sfx.bonk(J.side);
    J.side = null;
    J.timer = jackWait(J.level);
    dirty = true;
    return;
  }
  J.smokeT -= dt;
  if (J.smokeT <= 0) { sfx.smoke(J.side); J.smokeT = 2.5; }
}

// ---------- Plushtrap ----------
// Turns up in the oxygen room (CAM 5) and uses up oxygen. Watch him for PTR_WATCH seconds in a row.
function updatePlushtrap(dt) {
  const P = G.ptr;
  if (P.level === 0) return;
  if (!P.present) {
    P.timer -= dt;
    if (P.timer > 0) return;
    P.present = true;
    P.watchT = 0;
    sfx.plushIn();
    dirty = true;
    return;
  }
  if (seeing('oxygen')) {
    P.watchT += dt;
    if (P.watchT >= PTR_WATCH) {
      P.present = false;
      P.timer = plushWait(P.level);
      sfx.gone();
      dirty = true;
    }
  } else P.watchT = 0;
}

// ---------- Nightmare Cupcake ----------
// Gets into the power room (CAM 6) and eats power (see updatePower) until you shock that camera.
function updateCupcake(dt) {
  const C = G.ncp;
  if (C.level === 0) return;
  if (!C.present) {
    C.timer -= dt;
    if (C.timer > 0) return;
    C.present = true;
    dirty = true;
  }
  C.chompT -= dt;
  if (C.chompT <= 0) { sfx.chomp(); C.chompT = 3; }
}

// ---------- Nightmare Mangle ----------
// Gets into one room's camera and drains power; their room and NMG_DECOYS others blink on the map.
function updateMangle(dt) {
  const M = G.nmg;
  if (M.level === 0) return;
  if (!M.present) {
    M.timer -= dt;
    if (M.timer > 0) return;
    M.present = true;
    const rooms = CAM_ORDER.slice().sort(() => Math.random() - 0.5);   // the rooms in a random order
    M.room = rooms[0];
    M.decoys = rooms.slice(1, 1 + NMG_DECOYS);
    dirty = true;
  }
  M.radioT -= dt;
  if (M.radioT <= 0) { sfx.mangleRadio(); M.radioT = 2.2; }
}

// ---------- power-out ----------
// Power hit 0%: every door opens, the monitor dies, everyone else gives up, and Nightmare Freddy comes
// for you in the dark.
function powerOutStart() {
  G.power = 0;
  G.powerOut = true;
  G.doors.L = G.doors.R = G.heavy.L = G.heavy.R = G.vent = false;
  G.cam = false;
  G.mask = false;
  G.at = null;
  G.outTimer = rand(...POWER_OUT_WAIT);   // ...POWER_OUT_WAIT spreads the [lowest, highest] pair into rand(lowest, highest)
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
function toggleHeavy(side) {
  if (!ready()) return;
  if (!powered()) { sfx.deny(); return; }
  G.heavy[side] = !G.heavy[side];
  sfx.heavyDoor(side);
  dirty = true;
}
function toggleVent() {
  if (!ready()) return;
  if (!powered()) { sfx.deny(); return; }
  G.vent = !G.vent;
  sfx.ventDoor();
  dirty = true;
}

// Walk to door `side` to listen (or back to the desk if you're already there). The monitor goes down;
// you can't go with the mask on.
function goToDoor(side) {
  if (!ready()) return;
  if (G.mask) { sfx.deny(); return; }
  G.at = G.at === side ? null : side;
  if (G.cam) { G.cam = false; bbMayWake(); }   // the monitor goes down, which may wake Nightmare BB
  sfx.walk(G.at);
  dirty = true;
}

// Raise or lower the monitor (not with the mask on, or while you're at a door).
function toggleCam() {
  if (!ready()) return;
  if (!powered() || G.mask || G.at) { sfx.deny(); return; }
  if (!G.cam && bbWatching()) return;   // raising it with Nightmare BB awake
  G.cam = !G.cam;
  sfx.cam();
  if (G.cam) camStatic(0.2);
  else bbMayWake();                     // putting it down may wake Nightmare BB
  dirty = true;
}

// Jump to a camera (raising the monitor first if needed).
function setCam(room) {
  if (!ready()) return;
  if (!powered() || G.mask || G.at) { sfx.deny(); return; }
  if (!G.cam && bbWatching()) return;   // raising it with Nightmare BB awake
  G.cam = true;
  G.camRoom = room;
  sfx.cam();
  camStatic(0.22);
  dirty = true;
}

// Put the mask on or take it off. Not on the monitor, and not at a door. It needs no power.
function toggleMask() {
  if (!ready()) return;
  if (G.cam || G.at) { sfx.deny(); return; }
  G.mask = !G.mask;
  sfx.mask(G.mask);
  dirty = true;
}

// The controlled shock. On the monitor it shocks the camera you're looking at; at the desk it shocks
// the desk. Every shock costs SHOCK_COST power and needs SHOCK_COOLDOWN seconds to charge again.
function shock() {
  if (!ready()) return;
  if (!powered() || G.at || G.t < G.shockReady) { sfx.deny(); return; }
  G.shockReady = G.t + SHOCK_COOLDOWN;
  G.power -= SHOCK_COST;
  G.zapUntil = performance.now() + 160;
  sfx.shock();
  if (G.cam) shockCamera();
  else shockDesk();
  if (G.power <= 0) powerOutStart();
  dirty = true;
}
// The desk: clears the Freddles, drives out Nightmare Foxy, hurts the Nightmarionette, and sends away
// Circus Baby (once she's close).
function shockDesk() {
  if (G.nfr.freddles) { G.nfr.freddles = 0; G.nfr.coming = 0; }
  if (G.nfx.inside) { nightmareHome(NFOXY, G.nfx); sfx.gone(); }   // Nightmare Foxy, driven out of the office
  const N = G.nmt;
  if (N.present) {
    N.hits++;
    sfx.nmtHit();
    if (N.hits >= NMT_SHOCKS) { N.present = false; N.timer = nightmarionetteWait(N.level); sfx.gone(); }
  }
  if (G.bab.inside && G.bab.close) babyHome();
}
// A camera: the Minireenas and Ennard in the oxygen room (all at once), the Nightmare Cupcake in the
// power room, or Nightmare Mangle in their room. Anything else is a wasted shock.
function shockCamera() {
  let hit = false;
  if (G.camRoom === 'oxygen' && G.mrn.count) {
    G.mrn.count = 0;
    hit = true;
  }
  if (G.camRoom === 'oxygen' && G.end.mode === 'air') {
    ennardHome();
    hit = true;
  }
  if (G.camRoom === 'power' && G.ncp.present) {
    G.ncp.present = false;
    G.ncp.timer = cupcakeWait(G.ncp.level);
    hit = true;
  }
  if (G.nmg.present && G.camRoom === G.nmg.room) {
    G.nmg.present = false;
    G.nmg.timer = mangleWait(G.nmg.level);
    hit = true;
  }
  if (hit) sfx.gone();
  else sfx.fizzle();
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
// it got you some other way. `why` is 'dark' (the power ran out), 'o2' (the oxygen ran out), 'early'
// (you opened a heavy door too soon) or null.
function lose(c, side = null, why = null) {
  G.over = true;
  sfx.humOff();
  sfx.scream();
  const when = clockLabel(G.t);
  const who = `<b class="c-${c.id}">${c.name}</b>`;
  const door = side === 'L' ? 'LEFT' : 'RIGHT';
  let message;
  if (why === 'dark') message = `The power ran out. ${who} found you in the dark at ${when}.`;
  else if (why === 'o2') message = `You ran out of oxygen. ${who} ${c.how} at ${when}.`;
  else if (why === 'early') message = `You opened the ${door} heavy door too soon: ${who} was still breathing behind it. ${when}.`;
  else if (why === 'cam') message = `You raised the monitor while ${who} was awake. ${when}.`;
  else if (why === 'woke') message = `You flashed the lamp on ${who} while he was asleep. He didn't like that. ${when}.`;
  else if (side) message = `${who} came through the ${door} door at ${when}.`;
  else message = `${who} ${c.how} at ${when}.`;
  message += countKill(c.id, c.name);
  // The jumpscare: the character's big drawing, shaking (see showScare in screens.js).
  const big = SPRITES[c.id].scare;
  const g = blank(Math.max(...big.map(l => l.length)), big.length);
  sprite(g, 0, 0, big, 'c-' + c.id);
  showScare(message, toHtml(g));
}
