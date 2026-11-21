/* =====================================================================
   game.js: the RULES. The state of the night, the computer-controlled
   night guard's "brain", and everything your animatronics can do.

   It never draws anything itself: render.js reads G (the state) and
   draws it, and screens.js shows the end of the night.

   The big idea: this is FNAF backwards. You move the animatronics; the
   computer plays the night guard. The guard only knows what it has
   SEEN (on a camera or in a door light) or HEARD, and it needs time to
   react. Catch it before 6 AM.
   ===================================================================== */

// ---------- saved progress ----------
// The story nights you've beaten (1 to 20). New wins are only ever ADDED, never removed.
let beaten = store.get('beaten', []);
if (!Array.isArray(beaten)) beaten = [];
// How many times each animatronic has caught a guard: { crew id: count }.
let catches = store.get('catches', {});
if (!catches || typeof catches !== 'object') catches = {};
// The custom night's settings. Object.assign copies the saved values over the defaults, so a value
// saved by an older version is kept and a missing one gets its default.
const customDefaults = () => ({ guard: 'mike', skill: 10, tools: GUARD_BY_ID.mike.tools.slice(),
  crew: { bon: 10, chi: 10 }, power: 100, hour: HOUR_SECONDS, speed: 100 });
let custom = Object.assign(customDefaults(), store.get('custom', {}));
const saveCustom = () => store.set('custom', custom);
const nightBeaten = n => beaten.includes(n);
// The custom night challenges you've beaten, by challengeKey ("Max mode v1"). Only ever added to: a ✓
// this version doesn't recognise is kept too.
let challengesBeaten = store.get('challenges', []);
if (!Array.isArray(challengesBeaten)) challengesBeaten = [];
const challengeBeaten = c => challengesBeaten.includes(challengeKey(c));
// How many times each guard has been caught: { guard id: count } (the other half of the kill counter;
// `catches` above counts each animatronic's catches).
let guardCaught = store.get('guardCaught', {});
if (!guardCaught || typeof guardCaught !== 'object') guardCaught = {};
// The achievements earned so far, by id (ACHIEVEMENTS in data.js). Only ever added to.
let achieved = store.get('achievements', []);
if (!Array.isArray(achieved)) achieved = [];
// Every night and the custom night are open from the start (on request: "every level unlocked, I can just
// pick which one"). Beating nights still saves a ✓ for each.
const customUnlocked = () => true;

// ---------- the night's state ----------
// G holds everything about the night being played (null when no night is running).
let G = null;
// `dirty` = "something changed, redraw straight away" (main.js also redraws a few times a second).
let dirty = true;

// What the night is set up with: the story night number (or null for custom), the guard, and the crew.
function storySetup(n) {
  const night = NIGHTS[n - 1], def = GUARD_BY_ID[night.guard];
  // A night can make its guard sharper than usual with its own `skill` (Nights 11-20 reuse some guards).
  return { night: n, guard: def, skill: night.skill ?? def.skill, tools: def.tools, crew: night.crew.map(id => ({ id, level: 10 })),
    power: 100, hour: HOUR_SECONDS, speed: 100 };
}
function customSetup() {
  return { night: null, guard: GUARD_BY_ID[custom.guard] || GUARDS[0], skill: custom.skill, tools: custom.tools,
    crew: Object.entries(custom.crew).filter(([id]) => CREW_BY_ID[id]).slice(0, MAX_CREW).map(([id, level]) => ({ id, level })),
    power: custom.power, hour: custom.hour, speed: custom.speed };
}
// A challenge from CHALLENGES (data.js). Its crew can be bigger than MAX_CREW: Max mode has everyone.
function challengeSetup(c) {
  const ids = c.crew === 'all' ? CREW.map(x => x.id) : c.crew;
  return { night: null, challenge: c, guard: GUARD_BY_ID[c.guard], skill: c.skill, tools: c.tools,
    crew: ids.map(id => ({ id, level: c.level })), power: c.power, hour: c.hour, speed: c.speed };
}

function newGame(setup) {
  const t = 0;
  G = {
    setup,
    t,                                   // seconds since midnight
    hourLen: setup.hour,
    nightLen: setup.hour * NIGHT_HOURS,
    over: false, paused: false, result: null,
    sel: 0,                              // which of your animatronics is selected
    log: [],                             // the event messages under the office camera
    staticRooms: {},                     // { room: time its static ends } (Bonnie)
    showtimeUntil: 0, waltzUntil: 0,     // Circus Baby's and Ballora's abilities
    lockdownUntil: 0,                    // the guard's Lockdown: no abilities until then
    bonks: 0, abilitiesUsed: 0,          // counted for the achievements
    box: 100,                            // the music box (only matters when the Puppet is on)
    puppetOutAt: null, powerOutAt: null,
    fx: [],                              // short-lived marks on the map: lures and shocks { room, text, until }
    pests: [],                           // Freddles and cupcakes in the office: 'freddle' or 'cupcake'
    pestT: 0,                            // counts up to the next Freddle (Nightmare Freddy)
    crew: setup.crew.map(c => makeUnit(c.id, c.level, setup.speed)),
    guard: {
      def: setup.guard, name: setup.guard.name, skill: setup.skill, tools: new Set(setup.tools),
      power: setup.power,
      focus: 'desk',                     // desk, cam, wind, reboot, stun, hide, mask or dead (see the HUD)
      cam: 'stage',                      // which camera it's on when focus is 'cam'
      nextThink: 1.5,
      busyUntil: 0, stunUntil: 0, stareUntil: 0, hideUntil: 0, maskUntil: 0, lockUntil: 0,
      doors: { L: false, R: false, V: false },
      light: { L: 0, R: 0 },             // the time each door light goes off again
      lightsGone: false, lightsOffUntil: 0,
      camsBroken: false, scrambleUntil: 0, distractedUntil: 0,
      jam: { L: 0, R: 0, V: 0 },          // a door that can't be shut until this time (Withered Chica, Ennard)
      memory: {},                        // what it believes: { crew id: { room, t } }
      heard: {},                         // { room: when it last heard something there }
      seenEmpty: {},                     // { room: when it last saw that room empty }
      foxStage: 0, foxT: -99,            // the Foxy stage it last saw, and when
      cd: { lure: 0, shock: 0, hide: 0, duck: 0, lockdown: 0 },// when each tool can be used again
      flashUntil: 0, flashSide: 'L',
      coins: setup.tools.includes('coins') ? DEATH_COINS : 0,   // death coins left
      dead: false,
    },
  };
  G.puppet = G.crew.find(u => u.def.kind === 'puppet') || null;
  G.ventsUsed = G.crew.some(u => u.def.vents);
  dirty = true;
}

// One of your animatronics during a night.
function makeUnit(id, level, speedPct) {
  const def = CREW_BY_ID[id];
  // mult: how long its cooldowns are (its level and the custom night's "cooldown speed").
  const mult = crewSpeed(level) * 100 / speedPct * CREW_PACE;
  return {
    def, id, level, mult,
    room: def.home || null,
    cd: 1,                                // seconds until it can move again
    acd: def.ability.cd * mult * 0.3,     // seconds until its ability is ready (starts partly charged)
    stunUntil: 0,                         // frozen until this time (sent home, or shocked)
    attack: null,                         // { entry, end, noticed, counterAt, knockAt } while attacking
    stage: 0, stageT: 0,                  // Foxy's stages in Pirate Cove
    immuneUntil: 0,                       // Springtrap's Shrug off
    facelessUntil: 0,                     // Withered Bonnie's Faceless
    lurch: false,                         // Withered Freddy's Lurch is waiting for his next attack
    silent: false,                        // Nightmare Bonnie is holding his breath for his next attack
    freeUntil: 0,                         // Plushtrap's Freeze tag
    gold: null,                           // Golden Freddy: null, or { state: 'wait' } until the monitor goes down
  };
}

// ---------- small helpers ----------
const guardHas = tool => G.guard.tools.has(tool);
const camsOk = () => guardHas('cams') && !G.guard.camsBroken && !G.guard.dead;
const lightsOk = () => !G.guard.lightsGone && G.t >= G.guard.lightsOffUntil && !G.guard.dead;
const monitorUp = () => G.guard.focus === 'cam' || G.guard.focus === 'wind';
const stunned = u => G.t < u.stunUntil;
const selected = () => G.crew[G.sel];
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
// Some guards shrug off your tricks: grit (from GUARDS) scales how long a trick lasts or how much power
// it costs them. 1 = the full effect (most guards), 0.5 = half (The Tendons 8).
const grit = x => x * (G.guard.def.grit ?? 1);
// Can the guard see this room clearly on its camera right now? (No static, not the sound-only kitchen.)
const roomClear = room => G.t >= G.guard.scrambleUntil && !(G.staticRooms[room] > G.t) && !ROOMS[room].audioOnly;
// Is the guard watching this room on its camera right now?
const watching = room => G.guard.focus === 'cam' && G.guard.cam === room && camsOk() && roomClear(room);
// Would this animatronic show up on a camera? (Freddy only on the stage, Ballora never.)
function showsOnCam(u) {
  if (u.def.kind !== 'walker' && u.def.kind !== 'foxy') return false;
  if (u.def.hidden === 'always' || G.t < u.facelessUntil) return false;
  if (u.def.hidden === 'offstage') return u.room === 'stage';
  return true;
}
// How quiet it is right now (Ballora's Waltz makes everyone else quieter; Nightmare Bonnie can hold his breath).
const stealthOf = u => u.attack && u.attack.silent ? SILENT_STEALTH
  : clamp((u.def.stealth || 0) + (G.t < G.waltzUntil && u.id !== 'bal' ? WALTZ_STEALTH : 0), -0.5, 0.9);
// Plushtrap only moves while the guard is looking at its monitor (or during his Freeze tag).
const plushFrozen = u => u.def.onlyMonitorUp && !monitorUp() && G.t >= u.freeUntil;

// The clock: 12:00 AM to 5:59 AM.
function clockLabel() {
  const hours = G.t / G.hourLen, h = Math.floor(hours), m = Math.floor((hours - h) * 60);
  return `${h === 0 ? 12 : h}:${String(m).padStart(2, '0')} AM`;
}

// Add a message to the event log under the office camera. `cls` colors it.
function log(text, cls = '') {
  G.log.unshift({ time: clockLabel(), text, cls });
  G.log.length = Math.min(G.log.length, 8);
  dirty = true;
}

// ---------- the update: called many times a second by the game loop (main.js) ----------
function update(dt) {
  if (!G || G.over || G.paused) return;
  G.t += dt;
  const g = G.guard;
  if (G.t >= G.nightLen) return guardSurvives();

  endGuardStates();
  drainPower(dt);
  if (G.over) return;
  for (const u of G.crew) updateUnit(u, dt);
  updateBox(dt);
  updatePests(dt);
  observe();
  if (G.t >= g.nextThink) {
    g.nextThink = G.t + guardThink(g.skill) * rand(0.8, 1.2);
    think();
  }
  for (const u of G.crew) if (u.attack && !G.over) updateAttack(u, dt);
  if (G.over) return;
  if (G.powerOutAt != null && G.t >= G.powerOutAt + POWER_OUT_WIN) return win(powerOutWinner(), 'power');
  if (G.puppetOutAt != null && G.t >= G.puppetOutAt + PUPPET_DELAY) return win(G.puppet, 'box');
  G.fx = G.fx.filter(f => f.until > G.t);
}

// The guard's busy moments end by themselves after a while.
function endGuardStates() {
  const g = G.guard;
  if (g.focus === 'stun' && G.t >= g.stunUntil) { g.focus = 'desk'; dirty = true; }
  if (g.focus === 'hide' && G.t >= g.hideUntil) { g.focus = 'desk'; dirty = true; }
  if (g.focus === 'mask' && G.t >= g.maskUntil) { g.focus = 'desk'; sfx.mask(); dirty = true; }
  if (g.focus === 'lol' && G.t >= g.busyUntil) { g.focus = 'desk'; log('The guard got rid of Lolbit.', 'g'); }
  if (g.focus === 'shoo' && G.t >= g.busyUntil) {
    g.focus = 'desk';
    const gone = G.pests.shift();
    if (gone) log(`The guard shooed a ${gone === 'cupcake' ? 'cupcake' : 'Freddle'} away.`, 'g');
  }
  if (g.focus === 'reboot' && G.t >= g.busyUntil) {
    g.focus = 'desk'; g.camsBroken = false; sfx.reboot();
    log('The guard rebooted its cameras.', 'g');
  }
  // Broken cameras or no power: the monitor can't stay up.
  if (monitorUp() && !camsOk()) g.focus = 'desk';
}

// The guard pays power for everything it uses. At 0 its office goes dark and you win.
function drainPower(dt) {
  const g = G.guard;
  if (g.dead) return;
  g.power -= (usage() + grit(CUPCAKE_DRAIN) * G.pests.filter(p => p === 'cupcake').length) * dt;
  if (g.power <= 0) powerOut();
}
// How much power the guard is using per second right now.
function usage() {
  const g = G.guard;
  let use = BASE_DRAIN;
  if (monitorUp()) use += CAM_DRAIN;
  for (const s of ['L', 'R', 'V']) if (g.doors[s]) use += DOOR_DRAIN;
  for (const s of ['L', 'R']) if (g.light[s] > G.t) use += LIGHT_DRAIN;
  return use * (g.def.thrift ?? 1);   // a thrifty guard (The Tendons 8) uses less for the same things
}
function powerOut() {
  const g = G.guard;
  g.power = 0; g.dead = true; g.focus = 'dead';
  g.doors = { L: false, R: false, V: false };
  g.light = { L: 0, R: 0 };
  G.powerOutAt = G.t;
  sfx.powerDown();
  log('POWER OUT! The office goes dark...', 'win');
}
// Who walks in after a power out: Freddy if he's here (like the real game), or else the first walker.
function powerOutWinner() {
  const here = G.crew.filter(u => !u.gone);
  return here.find(u => u.id === 'fre') || here.find(u => u.def.kind === 'walker' && !u.def.cantKill) || here[0] || G.crew[0];
}

// ---------- death coins and Lockdown (guard tools, The Tendons 8 has both) ----------
// A death coin removes one of your animatronics for the rest of the night (like Ultimate Custom Night's).
// The guard spends one "whenever" it would otherwise be caught: an attack it noticed but couldn't stop,
// Golden Freddy it can't flip the monitor up for, or a music box running out.
function deathCoin(u) {
  const g = G.guard;
  g.coins--;
  u.gone = true;
  u.attack = null; u.gold = null; u.room = null;
  if (u === G.puppet) { G.puppet = null; G.puppetOutAt = null; }
  sfx.coin();
  log(`DEATH COIN! ${g.name} removed ${u.def.name} for the rest of the night (${g.coins} left).`, 'g');
  dirty = true;
}
// Lockdown: when an attack is on, or it knows someone is right outside, it shuts off every animatronic
// ability for LOCKDOWN_TIME seconds, so you can't stack tricks on top of an attack.
function tryLockdown() {
  const g = G.guard, fresh = memTime(g.skill);
  const near = G.crew.some(u => u.attack && u.attack.noticed) ||
    Object.values(g.memory).some(m => G.t - m.t < fresh && DIST[m.room] === 1);
  if (!near) return;
  G.lockdownUntil = G.t + LOCKDOWN_TIME;
  g.cd.lockdown = G.t + LOCKDOWN_COOLDOWN;
  sfx.lockdown();
  log(`LOCKDOWN! Every animatronic ability is off for ${LOCKDOWN_TIME} s.`, 'g');
}

// ---------- your animatronics ----------
function updateUnit(u, dt) {
  if (u.gone) return;   // removed by a death coin
  const speedUp = G.t < G.showtimeUntil && u.id !== 'bab' ? 2 : 1;   // Circus Baby's Showtime
  if (u.cd > 0) u.cd -= dt * speedUp;
  if (u.acd > 0) u.acd -= dt;
  if (u.def.kind === 'foxy') updateFoxy(u, dt * speedUp);
  if (u.def.kind === 'golden') updateGolden(u);
}

// Foxy gets ready in Pirate Cove, one stage at a time, but only while the guard isn't watching the cove.
function updateFoxy(u, dt) {
  if (u.attack || stunned(u) || u.stage >= FOXY_STAGES || watching('cove')) return;
  u.stageT += dt;
  if (u.stageT >= u.def.move * u.mult) {
    u.stageT = 0;
    u.stage++;
    dirty = true;
    if (u.stage >= FOXY_STAGES) log('Foxy is ready to Sprint!', 'you');
  }
}

// Golden Freddy waits for the guard to put its monitor down, then appears in the office.
// (Withered Golden Freddy doesn't wait: his ability starts his attack straight away.)
function updateGolden(u) {
  if (u.def.withered || !u.gold || u.attack || G.guard.dead) return;
  if (!monitorUp()) {
    u.gold = { state: 'in' };
    startAttack(u, 'O');
  }
}

// The music box: it unwinds all night, and the guard winds it back up on the cameras.
function updateBox(dt) {
  if (!G.puppet || G.puppetOutAt != null) return;
  const g = G.guard;
  G.box -= BOX_DRAIN / G.puppet.mult * dt;
  if (g.focus === 'wind') {
    G.box += WIND_RATE * dt;
    if (G.box >= 100) { G.box = 100; g.focus = 'desk'; }
  }
  if (G.box <= 0 && guardHas('coins') && g.coins > 0 && !g.dead) { deathCoin(G.puppet); return; }
  if (G.box <= 0) {
    G.box = 0;
    G.puppetOutAt = G.t;
    sfx.musicBox(true);
    log('The music box ran out! Nothing can stop the Puppet now.', 'win');
  }
}

// Freddles: Nightmare Freddy's little bears climb into the office by themselves now and then.
function updatePests(dt) {
  const nfr = G.crew.find(u => u.id === 'nfr' && !u.gone);
  if (!nfr || G.guard.dead) return;
  G.pestT += dt;
  if (G.pestT >= PEST_EVERY * nfr.mult) {
    G.pestT = 0;
    addPests('freddle', 1);
  }
}
function addPests(kind, n) {
  for (let i = 0; i < n && G.pests.length < PEST_MAX; i++) G.pests.push(kind);
  dirty = true;
}

// Can the selected animatronic walk into `room` right now? Returns '' if yes, or the reason why not.
function whyCantMove(u, room) {
  if (u && u.gone) return `${u.def.name} was removed by a death coin.`;
  if (!u || u.def.kind !== 'walker') return `${u ? u.def.name : 'Nobody'} doesn't walk.`;
  if (u.attack) return `${u.def.name} is attacking.`;
  if (stunned(u)) return `${u.def.name} is frozen.`;
  if (!ROOMS[u.room].to.includes(room)) return 'Too far: pick a room next to it.';
  if (ROOMS[room].vent && !u.def.vents) return `${u.def.name} doesn't fit in the vents.`;
  if (u.def.frozenWatched && watching(u.room)) return 'Freddy can\'t move while the guard is watching him.';
  if (plushFrozen(u)) return 'Plushtrap only moves while the guard is looking at its monitor.';
  if (u.cd > 0) return `${u.def.name} needs ${u.cd.toFixed(1)} s.`;
  return '';
}

// Walk the selected animatronic to a room next to it.
function moveTo(room) {
  const u = selected();
  const why = whyCantMove(u, room);
  if (why) { sfx.deny(); flashHint(why); return; }
  moveUnit(u, room);
  u.cd = (u.def.move || 0) * u.mult;
}

// Actually move it, and give the guard a chance to hear it.
function moveUnit(u, room) {
  u.room = room;
  const r = ROOMS[room], g = G.guard;
  // Your own speakers: a step (or a vent clank), louder near the office.
  const near = clamp(1 - (DIST[room] - 1) / 4, 0, 1);
  if (r.vent) sfx.vent(); else sfx.step(near, r.side === 'L' ? -0.6 : r.side === 'R' ? 0.6 : 0);
  // The guard's ears: closer and noisier is easier to hear.
  const closeness = DIST[room] <= 1 ? 1.4 : DIST[room] === 2 ? 1 : 0.5;
  const p = hearChance(g.skill) * (g.def.hears || 1) * (1 - stealthOf(u)) * closeness;
  if (!g.dead && G.t >= g.distractedUntil && Math.random() < p) {
    g.heard[room] = G.t;
    if (DIST[room] <= 2) log(`The guard heard something near ${r.name}.`, 'g');
  }
  dirty = true;
}

// Attack from a corner (or the end of the vent) through that way in.
function attackFrom(entry) {
  const u = selected();
  if (!u || u.def.kind !== 'walker') { sfx.deny(); flashHint('Pick a walking animatronic first.'); return; }
  if (u.gone) { sfx.deny(); flashHint(`${u.def.name} was removed by a death coin.`); return; }
  if (u.attack) { sfx.deny(); flashHint(`${u.def.name} is already attacking.`); return; }
  if (stunned(u)) { sfx.deny(); flashHint(`${u.def.name} is frozen.`); return; }
  if (u.room !== ENTRIES[entry]) { sfx.deny(); flashHint(`Get to ${ROOMS[ENTRIES[entry]].name} first.`); return; }
  if (u.def.frozenWatched && watching(u.room)) { sfx.deny(); flashHint('Freddy can\'t move while the guard is watching him.'); return; }
  if (plushFrozen(u)) { sfx.deny(); flashHint('Plushtrap only moves while the guard is looking at its monitor.'); return; }
  if (u.cd > 0) { sfx.deny(); flashHint(`${u.def.name} needs ${u.cd.toFixed(1)} s.`); return; }
  startAttack(u, entry);
}

function startAttack(u, entry) {
  let time = u.def.attack * CREW_PACE;
  if (u.lurch) { time *= LURCH; u.lurch = false; }   // Withered Freddy's Lurch
  u.attack = { entry, end: G.t + time, noticed: false, counterAt: null, knockAt: null,
    // Withered Golden Freddy shows up ON the guard's monitor when it's up, and in the office when it's down.
    onMonitor: entry === 'O' && !!u.def.withered && monitorUp(),
    silent: u.silent };   // Nightmare Bonnie holding his breath
  u.silent = false;
  u.cd = (u.def.move || 0) * u.mult;
  sfx.attack(entry === 'O' ? '' : entry);
  if (u.attack.onMonitor) log(`${u.def.name} is on the guard's monitor!`, 'you');
  else if (entry === 'O') log(`${u.def.name} is in the office!`, 'you');
  else log(`${u.def.name} is at the ${ENTRY_NAME[entry]}!`, 'you');
  // A door that's already shut (or the mask, or a hide) blocks it straight away: knock, knock.
  if (blockedNow(u, entry)) u.attack.knockAt = G.t + KNOCK_TIME;
  dirty = true;
}

// Is this attack blocked right now, without the guard doing anything new?
function blockedNow(u, entry) {
  const g = G.guard;
  if (u.def.kind === 'golden') {
    if (u.attack && u.attack.onMonitor) return !monitorUp();   // the guard put the monitor down
    if (monitorUp()) return true;                              // the guard flipped the monitor up
    return !!u.def.withered && g.focus === 'mask';             // the mask fools Withered Golden Freddy
  }
  if ((entry === 'L' || entry === 'R' || entry === 'V') && g.doors[entry]) return true;
  if (g.focus === 'hide') return true;
  if (g.focus === 'mask' && u.def.maskable) return true;
  return false;
}

function updateAttack(u, dt) {
  const a = u.attack, g = G.guard;
  if (a.knockAt != null) {
    if (G.t >= a.knockAt) bonk(u, blockHow(u, a.entry));
    return;
  }
  rollNotice(u, dt);
  if (a.counterAt != null && G.t >= a.counterAt) {
    if (g.focus === 'stun') a.counterAt = g.stunUntil + 0.2;   // frozen by Phantom BB: it tries again after
    else {
      if (counter(u)) return;
      // Nothing works right now (lights cut, door jammed, lure not ready...): it keeps trying.
      if (!a.helpless) log(`The guard has nothing that stops ${u.def.name} right now!`, 'you');
      a.helpless = true;
      a.counterAt = G.t + 0.4;
    }
  }
  // The guard shut that door for some other reason (or hid, or put the mask on) in the meantime.
  if (blockedNow(u, a.entry)) { a.knockAt = G.t + KNOCK_TIME / 2; return; }
  if (G.t >= a.end) {
    // About to be caught by an attack it saw coming: spend a death coin if it has one.
    if (a.noticed && guardHas('coins') && g.coins > 0 && !g.dead && g.focus !== 'stun' && !u.def.cantKill) deathCoin(u);
    else success(u);
  }
}
const blockHow = (u, entry) => u.def.kind === 'golden' ? (u.attack && u.attack.onMonitor ? 'drop' : monitorUp() ? 'cams' : 'mask')
  : G.guard.focus === 'hide' ? 'hide' : G.guard.focus === 'mask' && u.def.maskable && !G.guard.doors[entry] ? 'mask' : 'door';

// The guard tries to stop an attack it noticed. Returns true if it worked.
function counter(u) {
  const g = G.guard, d = u.def, e = u.attack.entry;
  if (g.dead) return false;
  if (e === 'O') {
    // Withered Golden Freddy on the monitor: put it down and he's gone.
    if (u.attack.onMonitor) { g.focus = 'desk'; bonk(u, 'drop'); return true; }
    // Withered Golden Freddy in the office: the mask works on him.
    if (u.def.withered && guardHas('mask')) { g.focus = 'mask'; g.maskUntil = G.t + MASK_HOLD; sfx.mask(); bonk(u, 'mask'); return true; }
    // Either Golden Freddy in the office: flip the monitor up and he's gone.
    if (camsOk()) { g.focus = 'cam'; g.cam = pickCam(); bonk(u, 'cams'); return true; }
    // Broken cameras: start rebooting them, then flip them up (it keeps trying) if there's still time.
    if (guardHas('cams') && g.camsBroken && g.focus !== 'reboot' && g.focus !== 'stun') {
      g.focus = 'reboot';
      g.busyUntil = G.t + (g.def.reboot || REBOOT_TIME);
      log('The guard is rebooting its cameras in a hurry...', 'g');
    }
    return false;
  }
  if ((e === 'L' || e === 'R') && guardHas('doors') && G.t >= g.jam[e]) { shutDoor(e); bonk(u, 'door'); return true; }
  if (e === 'V' && canShut('V') && G.t >= g.jam.V) { shutDoor('V'); bonk(u, 'vent'); return true; }
  if (d.flashable && guardHas('flash') && lightsOk()) {
    g.power -= FLASH_COST * (g.def.thrift ?? 1); g.flashUntil = G.t + 0.5; g.flashSide = e; sfx.flash();
    bonk(u, 'flash'); return true;
  }
  if (d.maskable && guardHas('mask')) {
    g.focus = 'mask'; g.maskUntil = G.t + MASK_HOLD; sfx.mask();
    bonk(u, 'mask'); return true;
  }
  if (d.lurable && guardHas('lure') && G.t >= g.cd.lure) {
    if (lure(u)) return true;
  }
  if (guardHas('hide') && G.t >= g.cd.hide) {
    g.focus = 'hide'; g.hideUntil = G.t + HIDE_TIME; g.cd.hide = G.t + HIDE_COOLDOWN;
    bonk(u, 'hide'); return true;
  }
  // The last resort every guard has: duck under the desk. It only works every DUCK_COOLDOWN seconds
  // (Gregory's Hide is the same move, but much more often). Without it, an animatronic the guard had no
  // tool against won every single time, even all on its own.
  if (G.t >= g.cd.duck) {
    g.focus = 'hide'; g.hideUntil = G.t + HIDE_TIME;
    g.cd.duck = G.t + (guardHas('doors') ? DUCK_COOLDOWN : DUCK_COOLDOWN / 3);   // no doors: it ducks three times as often
    bonk(u, 'duck'); return true;
  }
  return false;
}
// Can the guard shut this way in? The doors include the vent door; a guard without doors may still have
// just a vent door (the Fright guard).
const canShut = side => side === 'V' ? guardHas('doors') || guardHas('ventdoor') : guardHas('doors');

function shutDoor(side) {
  const g = G.guard;
  if (g.doors[side] || g.dead) return;
  if (G.t < g.jam[side]) return;   // jammed by Withered Chica or pried by Ennard
  g.doors[side] = true;
  sfx.door(side);
  dirty = true;
}
function openDoor(side) {
  if (!G.guard.doors[side]) return;
  G.guard.doors[side] = false;
  dirty = true;
}

const HOW = {
  door: 'the door slammed in their face', vent: 'the vent door slammed shut', flash: 'the flashlight scared them off',
  mask: 'the Freddy mask fooled them', hide: 'the guard hid under the desk', cams: 'the guard flipped the cameras up',
  drop: 'the guard put its monitor down', duck: 'the guard ducked under the desk',
};
// Stopped! Sent back home and frozen for a few seconds.
function bonk(u, how) {
  const g = G.guard, entry = u.attack ? u.attack.entry : 'L';
  u.attack = null;
  G.bonks++;   // for the "Flawless" achievement
  if (u.def.kind === 'golden') {
    u.gold = null;
    log(`${u.def.name} vanished: ${HOW[how]}.`, 'g');
    dirty = true;
    return;
  }
  sfx.knock(entry);
  if (u.def.kind === 'foxy') {
    u.stage = 0; u.stageT = 0;
    if (how === 'door' && !g.dead) {
      g.power -= grit(FOXY_BONK_POWER);
      log(`Foxy banged on the door: ${grit(FOXY_BONK_POWER)}% of the guard's power gone.`, 'you');
    }
  }
  u.room = u.def.home;
  u.stunUntil = G.t + BONK_STUN;
  u.cd = Math.max(u.cd, BONK_STUN);
  g.memory[u.id] = { room: u.room, t: G.t };   // it watched them leave
  log(`${u.def.name} was stopped: ${HOW[how]}.`, 'g');
  dirty = true;
}

// Nobody stopped it in time: the guard is caught. (Balloon Boy can't catch anyone: he takes the lights.)
function success(u) {
  if (u.def.cantKill) {
    u.attack = null;
    G.guard.lightsGone = true;
    u.room = u.def.home; u.cd = BONK_STUN;
    sfx.hi();
    log('"Hi!" Balloon Boy got in: the guard\'s lights and flashlight are gone for the night!', 'you');
    return;
  }
  win(u, 'attack');
}

// The audio lure: pulls an animatronic two rooms further from the office. Returns true if it worked.
function lure(u) {
  const g = G.guard;
  g.cd.lure = G.t + LURE_COOLDOWN;
  sfx.lure();
  G.fx.push({ room: u.room, text: 'LURE', until: G.t + 1.2 });
  if (G.t < u.immuneUntil) {
    log(`The guard played an audio lure, but ${u.def.name} shrugged it off.`, 'you');
    return false;
  }
  u.attack = null;
  for (let i = 0; i < 2; i++) {
    const back = ROOMS[u.room].to.filter(r => DIST[r] > DIST[u.room] && (!ROOMS[r].vent || u.def.vents));
    if (back.length) u.room = pick(back);
  }
  u.cd = Math.max(u.cd, 2);
  g.memory[u.id] = { room: u.room, t: G.t };
  log(`An audio lure pulled ${u.def.name} back to ${ROOMS[u.room].name}.`, 'g');
  dirty = true;
  return true;
}

// ---------- the guard's eyes and ears ----------
// Every frame: what the guard can see right now (its camera, and a door light if one is on).
function observe() {
  const g = G.guard;
  if (g.dead) return;
  if (g.focus === 'cam' && camsOk()) seeRoom(g.cam);
  if (g.focus === 'wind' && camsOk()) seeRoom('prize');
  for (const side of ['L', 'R']) if (g.light[side] > G.t) seeCorner(side);
}

function seeRoom(room) {
  const g = G.guard;
  if (!roomClear(room)) return;
  const here = G.crew.filter(u => u.room === room && showsOnCam(u));
  for (const u of here) {
    g.memory[u.id] = { room, t: G.t };
    if (u.def.kind === 'foxy') { g.foxStage = u.attack ? FOXY_STAGES : u.stage; g.foxT = G.t; }
    if (u.attack && !u.attack.noticed && u.attack.knockAt == null) notice(u);
  }
  // Anyone it THOUGHT was here but isn't: forget them.
  for (const id in g.memory) if (g.memory[id].room === room && !here.some(u => u.id === id)) delete g.memory[id];
  if (!here.length) g.seenEmpty[room] = G.t;
}

// A door light shows the corner outside that door, and anyone in the doorway. It even shows Ballora.
function seeCorner(side) {
  const g = G.guard, room = ENTRIES[side];
  const here = G.crew.filter(u => u.room === room && (u.def.kind === 'walker' || u.def.kind === 'foxy'));
  for (const u of here) {
    g.memory[u.id] = { room, t: G.t };
    if (u.attack && !u.attack.noticed && u.attack.knockAt == null) notice(u);
  }
  if (!here.length) g.seenEmpty[room] = G.t;
}

// The chance the guard notices an attack right now.
function noticeChance(u) {
  const g = G.guard, s = g.skill, e = u.attack.entry;
  if (g.dead || s <= 0 || G.t < g.distractedUntil) return 0;
  if (g.focus === 'stun' || g.focus === 'hide') return 0;
  // Golden Freddy is right in front of it (on its monitor, for Withered Golden Freddy).
  if (e === 'O') {
    const inFront = u.attack.onMonitor ? monitorUp() : !monitorUp();
    return inFront ? skillOf(s, 0.6, 1) * (g.focus === 'lol' ? LOL_NOTICE : 1) : 0;
  }
  let base;
  if (g.focus === 'lol') base = noticeDesk(s) * LOL_NOTICE;          // typing L-O-L
  else if (G.t < g.lockUntil) base = noticeCam(s) * 0.6;             // listening to the kitchen
  else if (g.focus === 'cam') base = noticeCam(s);
  else if (g.focus === 'wind' || g.focus === 'reboot') base = noticeCam(s) * 0.7;
  else base = noticeDesk(s);
  // Freddles and cupcakes in the office are distracting.
  const pests = 1 - grit(PEST_NOTICE) * G.pests.length;
  return clamp(base * (1 - stealthOf(u)) * pests, 0, 1);
}
// noticeChance is "per second": the longer you stand in the doorway, the likelier it notices. Over a short
// moment `dt` the chance is 1 - (1 - p)^dt, which adds up to exactly p over one whole second.
function rollNotice(u, dt) {
  if (u.attack.noticed) return;
  if (Math.random() < 1 - Math.pow(1 - noticeChance(u), dt)) notice(u);
}
// The guard noticed: it reacts after its reaction time (plus a moment to put the monitor down).
function notice(u) {
  const g = G.guard, a = u.attack;
  a.noticed = true;
  let delay = guardReact(g.skill);
  if (g.focus === 'lol') delay += LOL_SLOW;   // it has to stop typing first
  if (a.entry !== 'O' && monitorUp()) {
    delay += LOWER_CAM + (g.def.slowDown || 0);
    g.focus = 'desk';
  }
  a.counterAt = G.t + delay;
  log(`The guard noticed ${u.def.name}!`, 'g');
}

// ---------- the guard's brain ----------
// Called every guardThink(skill) seconds: the guard decides what to do next.
function think() {
  const g = G.guard, s = g.skill, t = G.t;
  if (g.dead) return;
  if (s <= 0) return;                      // a skill-0 guard just sits there
  if (['stun', 'hide', 'reboot', 'mask', 'lol', 'shoo'].includes(g.focus)) return;
  if (guardHas('lockdown') && t >= g.cd.lockdown) tryLockdown();
  if (G.crew.some(u => u.attack && u.attack.counterAt != null)) return;   // busy reacting
  if (t < g.lockUntil) return;              // Chica's clatter: still listening to the kitchen

  // 1. Broken cameras: reboot them.
  if (guardHas('cams') && g.camsBroken) {
    g.focus = 'reboot';
    g.busyUntil = t + (g.def.reboot || REBOOT_TIME);
    log('The guard is rebooting its cameras...', 'g');
    return;
  }
  // 2. The music box.
  if (G.puppet && G.puppetOutAt == null && camsOk()) {
    if (g.focus === 'wind') return;
    if (G.box < windAt(s)) { g.focus = 'wind'; log('The guard is winding the music box.', 'g'); return; }
  }
  // 3. Freddles and cupcakes: a sharp guard deals with one at once, a dull one waits until there are two.
  if (G.pests.length >= (s >= 10 ? 1 : 2)) {
    if (guardHas('flash') && lightsOk()) {   // a flash gets rid of one straight away
      g.power -= FLASH_COST * (g.def.thrift ?? 1); g.flashUntil = t + 0.4; g.flashSide = 'O'; sfx.flash();
      G.pests.shift();
      log('The guard flashed a pest out of the office.', 'g');
    } else {                                 // otherwise it has to shoo it by hand
      g.focus = 'shoo'; g.busyUntil = t + SHOO_TIME;
      return;
    }
  }
  // 4. Doors, 5. lures, 6. shocks, 7. where to look next.
  manageDoors();
  if (guardHas('lure') && t >= g.cd.lure) tryLure();
  if (guardHas('shock') && t >= g.cd.shock && g.focus === 'cam' && !savingPower()) tryShock();
  chooseLook();
  dirty = true;
}

// The last time the guard had a reason to think someone is right outside this way in.
function lastClue(side) {
  const g = G.guard, room = ENTRIES[side], hold = memTime(g.skill) * (g.def.doorHold || 1);
  let clue = -99;
  for (const id in g.memory) if (g.memory[id].room === room) clue = Math.max(clue, g.memory[id].t);
  if (g.heard[room] != null) clue = Math.max(clue, g.heard[room]);
  if (side === 'L' && g.foxStage >= FOXY_STAGES) clue = Math.max(clue, g.foxT);
  if ((g.seenEmpty[room] || -99) > clue) return -99;   // it looked since then and saw nobody
  return G.t - clue < hold ? clue : -99;
}

// Shut a door when it believes someone is right outside; open it again when it stops believing that.
function manageDoors() {
  const g = G.guard, saving = savingPower();
  for (const side of ['L', 'R', 'V']) {
    if (!canShut(side)) continue;
    if (G.t < g.jam[side] || (side === 'V' && !G.ventsUsed)) continue;
    // While saving power it doesn't keep doors shut just because someone is outside: it waits for the
    // attack itself and slams the door then (in counter).
    const threat = lastClue(side) > -99 && !saving;
    if (threat && !g.doors[side] && g.power > 1) shutDoor(side);
    else if (!threat && g.doors[side]) openDoor(side);
  }
}

// A sharp guard (skill SAVE_SKILL or more) keeps an eye on its power: when it has less left than its
// share of the night (with a little spare), it saves power. Without this, one animatronic parked
// outside a door kept the door shut, and the guard shocking it, until the power ran out: a free win.
function savingPower() {
  const g = G.guard;
  if (g.skill < SAVE_SKILL) return false;   // dull guards (Mike on night 1, Fritz) waste power, on purpose
  const share = G.setup.power * (1 - G.t / G.nightLen);   // what a steady use would leave by now
  return g.power < share * 0.9 + 5;
}

// Lure away the closest animatronic it knows about, if one is close.
function tryLure() {
  const g = G.guard, fresh = memTime(g.skill);
  const near = G.crew.filter(u => u.def.lurable && !u.attack && g.memory[u.id] && G.t - g.memory[u.id].t < fresh &&
    g.memory[u.id].room === u.room && DIST[u.room] <= 2);
  if (!near.length) return;
  near.sort((a, b) => DIST[a.room] - DIST[b.room]);
  lure(near[0]);
}

// Zap everyone in the room it's watching (if it can see someone there).
function tryShock() {
  const g = G.guard, room = g.cam;
  if (!roomClear(room)) return;
  const here = G.crew.filter(u => u.room === room && showsOnCam(u) && !stunned(u));
  if (!here.length) return;
  g.cd.shock = G.t + SHOCK_COOLDOWN;
  g.power -= SHOCK_COST * (g.def.thrift ?? 1);
  sfx.shock();
  G.fx.push({ room, text: 'ZAP', until: G.t + 1.2 });
  G.crew.filter(u => u.room === room && !u.attack).forEach(u => { u.stunUntil = G.t + SHOCK_STUN; });
  log(`The guard shocked ${ROOMS[room].name}: ${here.map(u => u.def.name).join(' and ')} frozen!`, 'g');
}

// Look at the cameras, sit at the desk, or check a door light.
function chooseLook() {
  const g = G.guard;
  let camLove = (g.def.camLove ?? 0.5) * (0.5 + 0.5 * clamp(g.power / 100, 0, 1));   // less camera time as power drops
  if (!camsOk()) camLove = 0;
  if (Math.random() < camLove) {
    if (g.focus !== 'cam') sfx.cam();
    g.focus = 'cam';
    g.cam = pickCam();
    return;
  }
  g.focus = 'desk';
  if (guardHas('lights') && lightsOk() && Math.random() < (g.def.lightLove ?? 0.3)) {
    // Check the side with the newest clue, or a random one.
    const side = lastClue('L') > lastClue('R') ? 'L' : lastClue('R') > lastClue('L') ? 'R' : pick(['L', 'R']);
    g.light[side] = G.t + LIGHT_TIME;
  }
}

// Which camera to look at: rooms near the office, rooms it heard something in, Pirate Cove when Foxy is
// around, and the rooms where it last saw someone are the most interesting.
function pickCam() {
  const g = G.guard, s = g.skill;
  const rooms = ROOM_IDS.filter(r => !ROOMS[r].audioOnly && (!ROOMS[r].vent || G.ventsUsed));
  const weights = rooms.map(r => {
    let w = 1 + (DIST[r] === 1 ? 3 : DIST[r] === 2 ? 1.5 : 0.4) * (0.5 + s / 20);
    if (r === 'cove' && G.crew.some(u => u.id === 'fox')) w += 2 + s / 8;
    if (r === 'stage' && G.crew.some(u => u.id === 'fre')) w += 1;
    if (g.heard[r] != null && G.t - g.heard[r] < 6) w += 3;
    if (Object.values(g.memory).some(m => m.room === r)) w += 2;
    if (r === g.cam && g.focus === 'cam') w *= 0.3;
    return w;
  });
  let roll = Math.random() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < rooms.length; i++) { roll -= weights[i]; if (roll <= 0) return rooms[i]; }
  return rooms[0];
}

// ---------- abilities (Q) ----------
function useAbility() {
  const u = selected();
  if (!u) return;
  const g = G.guard, t = G.t, name = u.def.name, ab = u.def.ability;
  if (u.gone) { sfx.deny(); flashHint(`${u.def.name} was removed by a death coin.`); return; }
  if (G.t < G.lockdownUntil) { sfx.deny(); flashHint(`LOCKDOWN: abilities are off for ${Math.ceil(G.lockdownUntil - G.t)} s.`); return; }
  if (u.acd > 0) { sfx.deny(); flashHint(`${ab.name} is ready in ${u.acd.toFixed(1)} s.`); return; }
  if (stunned(u)) { sfx.deny(); flashHint(`${name} is frozen.`); return; }
  // Each ability returns '' when it worked, or the reason it can't be used (then there's no cooldown).
  const no = abilityEffect(u);
  if (no) { sfx.deny(); flashHint(no); return; }
  u.acd = ab.cd * u.mult;
  G.abilitiesUsed++;   // for the "No tricks" achievement
  dirty = true;
}

function abilityEffect(u) {
  const g = G.guard, t = G.t;
  switch (u.id) {
    case 'fre':
      if (g.dead) return 'The power is already out.';
      g.power -= grit(LAUGH_POWER); sfx.laugh();
      log(`Freddy laughed in the dark: the guard lost ${grit(LAUGH_POWER)}% power.`, 'you'); return '';
    case 'bon':
      if (u.attack) return 'Not while attacking.';
      G.staticRooms[u.room] = t + grit(STATIC_TIME); sfx.stat();
      log(`${ROOMS[u.room].cam} turned to static.`, 'you'); return '';
    case 'chi':
      if (!camsOk()) return 'The guard has no working cameras to listen with.';
      if (['stun', 'hide', 'mask', 'reboot', 'dead'].includes(g.focus)) return 'The guard is too busy to listen right now.';
      g.focus = 'cam'; g.cam = 'kitchen'; g.lockUntil = t + grit(CLATTER_TIME); sfx.clatter();
      log('Clatter! The guard is listening to the kitchen.', 'you'); return '';
    case 'fox':
      if (u.attack) return 'Foxy is already running.';
      if (u.stage < FOXY_STAGES) return `Foxy is only at stage ${u.stage} of ${FOXY_STAGES}.`;
      u.room = 'whall'; sfx.run();
      startAttack(u, 'L'); return '';
    case 'tbn':
      if (u.attack || !['prize', 'vent1', 'vent2'].includes(u.room)) return 'Only from the Prize Corner, Vent A or Vent B.';
      moveUnit(u, 'vent3'); log('Toy Bonnie slid down to Vent C.', 'you'); return '';
    case 'tch':
      if (!guardHas('lights') && !guardHas('flash')) return 'This guard has no lights to turn off.';
      g.lightsOffUntil = t + grit(LIGHTS_OUT_TIME); g.light = { L: 0, R: 0 }; sfx.stat();
      log('Toy Chica cut the lights: no door lights or flashlight for a while.', 'you'); return '';
    case 'wfx':
      if (u.cd <= 0) return 'Withered Foxy is already ready to move.';
      u.cd = 0; log('Withered Foxy is ready to dash.', 'you'); return '';
    case 'wfr':
      if (u.lurch) return 'Withered Freddy is already ready to lurch.';
      u.lurch = true;
      log('Withered Freddy is ready to lurch: his next attack lands twice as fast.', 'you'); return '';
    case 'wbn':
      u.facelessUntil = t + FACELESS_TIME;
      log('Withered Bonnie went faceless: no camera shows him.', 'you'); return '';
    case 'wch':
      if (!canShut('V')) return 'This guard has no vent door to jam.';
      g.jam.V = t + grit(JAM_TIME); openDoor('V'); sfx.vent();
      log('Withered Chica jammed the vent door open!', 'you'); return '';
    case 'wgf':
      if (u.attack) return 'Withered Golden Freddy is already there.';
      if (g.dead) return 'The power is already out.';
      startAttack(u, 'O'); return '';
    case 'lol':
      if (g.dead) return 'The power is already out.';
      if (['stun', 'hide', 'lol', 'reboot'].includes(g.focus)) return 'The guard is busy with something else.';
      g.focus = 'lol'; g.busyUntil = t + grit(LOL_TIME); sfx.hi();
      log('PLEASE STAND BY. Lolbit took over the guard\'s computer: it has to type L-O-L.', 'you'); return '';
    case 'mng':
      if (!guardHas('cams')) return 'This guard has no cameras.';
      g.scrambleUntil = t + grit(SCRAMBLE_TIME); sfx.stat();
      log('Radio static! Every camera is scrambled.', 'you'); return '';
    case 'bb':
      g.distractedUntil = t + grit(DISTRACT_TIME); sfx.hi();
      log('"Hi!" The guard looks around, confused.', 'you'); return '';
    case 'pup':
      if (G.puppetOutAt != null) return 'The Puppet is already out.';
      G.box = Math.max(0, G.box - grit(UNWIND)); sfx.musicBox(true);
      log(`The music box unwinds: ${Math.round(G.box)}% left.`, 'you'); return '';
    case 'spr':
      u.immuneUntil = t + SHRUG_TIME;
      log('Springtrap will ignore audio lures for a while.', 'you'); return '';
    case 'tfr':
      g.memory = {}; g.heard = {}; g.seenEmpty = {}; g.foxStage = 0;
      sfx.stat();
      log('GAME OVER, says Toy Freddy: the guard forgot everything it saw.', 'you'); return '';
    case 'sbn': {
      const frozen = G.crew.filter(o => stunned(o));
      if (!frozen.length) return 'Nobody is frozen right now.';
      frozen.forEach(o => { o.stunUntil = t; o.cd = 0; });
      sfx.stat();
      log(`Shadow Bonnie glitched ${frozen.map(o => o.def.name).join(' and ')} free!`, 'you'); return '';
    }
    case 'nfr':
      if (G.pests.length >= PEST_MAX) return 'The office is already full of Freddles.';
      addPests('freddle', 2);
      log('Freddles climb into the office.', 'you'); return '';
    case 'nbn':
      if (u.silent) return 'Nightmare Bonnie is already holding his breath.';
      u.silent = true;
      log('Nightmare Bonnie holds his breath: his next attack is silent.', 'you'); return '';
    case 'nch':
      if (G.pests.length >= PEST_MAX) return 'The office is too full for a cupcake.';
      addPests('cupcake', 1);
      log('Nightmare Chica\'s cupcake got into the office.', 'you'); return '';
    case 'ptr':
      u.freeUntil = t + FREEZE_TAG_TIME;
      log('Freeze tag! Plushtrap can move even with the monitor down.', 'you'); return '';
    case 'ffr': {
      if (g.dead) return 'The power is already out.';
      const mySide = ROOMS[u.room] && ROOMS[u.room].side;
      const side = mySide === 'L' ? 'R' : mySide === 'R' ? 'L' : pick(['L', 'R']);
      sfx.knock(side);
      // The guard believes someone is at that door: it reacts to it (if it's paying attention at all).
      if (g.skill > 0) {
        g.heard[ENTRIES[side]] = t;
        if (monitorUp()) g.focus = 'desk';
        g.lockUntil = t + guardReact(g.skill) + 1;
        if (guardHas('doors')) shutDoor(side);
      }
      log(`"Bon-Bon, go get 'em!" Bon-Bon bangs on the ${ENTRY_NAME[side]}.`, 'you'); return '';
    }
    case 'enn': {
      const entry = Object.keys(ENTRIES).find(e => ENTRIES[e] === u.room);
      if (!entry || u.attack) return 'Only from the W. Corner, the E. Corner or Vent C.';
      if (!g.doors[entry]) return `The ${ENTRY_NAME[entry]} is already open.`;
      openDoor(entry); g.jam[entry] = t + grit(PRY_TIME); sfx.door(entry);
      log(`Ennard pried the ${ENTRY_NAME[entry]} open!`, 'you'); return '';
    }
    case 'pfx':
      if (monitorUp() || ['stun', 'hide', 'dead'].includes(g.focus)) return 'Only works while the guard\'s monitor is down.';
      g.focus = 'stun'; g.stunUntil = t + grit(LUNGE_TIME); sfx.sting();
      log('Phantom Foxy lunged out of the dark: the guard is frozen!', 'you'); return '';
    case 'yen': {
      if (['stun', 'hide', 'reboot', 'dead'].includes(g.focus)) return 'The guard is busy with something else.';
      // A light finds him quickly in the dark, so a guard that can still use one breaks free sooner.
      const lit = (guardHas('lights') || guardHas('flash')) && lightsOk();
      g.focus = 'stun'; g.stunUntil = g.stareUntil = t + grit(lit ? STARE_LIT : STARE_TIME); sfx.sting();
      log(lit ? 'Yenndo stands beside the desk. The guard shines a light on him and freezes for a moment.'
              : 'Yenndo stands beside the desk in the dark: the guard is frozen!', 'you'); return '';
    }
    case 'pfr':
      if (!guardHas('cams')) return 'This guard has no cameras to break.';
      if (g.camsBroken) return 'The cameras are already broken.';
      g.camsBroken = true; if (monitorUp()) g.focus = 'desk'; sfx.stat();
      log('Phantom Freddy haunts the system: the cameras are broken!', 'you'); return '';
    case 'pbb':
      if (!monitorUp()) return 'Only works while the guard is looking at its monitor.';
      g.focus = 'stun'; g.stunUntil = t + grit(STUN_TIME); sfx.sting();
      log('Phantom BB jumped out of the monitor: the guard is frozen!', 'you'); return '';
    case 'gol':
      if (u.gold) return 'Golden Freddy is already on his way.';
      if (g.dead) return 'The power is already out.';
      u.gold = { state: 'wait' };
      log('Golden Freddy waits for the guard to put its monitor down...', 'you'); return '';
    case 'bab': {
      G.showtimeUntil = t + SHOWTIME_TIME;
      // Every countdown that helps you when it runs out loses part of what it has left (SHOWTIME_CUT).
      // `cut` is for "until this time" timers, `cutUp` for timers that count up to a goal.
      const cut = until => until > t ? t + (until - t) * SHOWTIME_CUT : until;
      const cutUp = (now, goal) => now < goal ? goal - (goal - now) * SHOWTIME_CUT : now;
      G.crew.forEach(o => {
        o.stunUntil = cut(o.stunUntil);                          // frozen ones are free sooner
        if (o !== u) {
          if (!stunned(o)) o.cd = 0;                             // ready to move right now
          o.acd *= SHOWTIME_CUT;                                 // abilities ready sooner
        }
        if (o.attack && o.attack.knockAt == null) o.attack.end = cut(o.attack.end);   // attacks land sooner
        if (o.def.kind === 'foxy') o.stageT = cutUp(o.stageT, o.def.move * o.mult);    // Foxy's next stage
      });
      const nfr = G.crew.find(o => o.id === 'nfr');
      if (nfr) G.pestT = cutUp(G.pestT, PEST_EVERY * nfr.mult);  // the next Freddle
      if (G.puppet && G.puppetOutAt == null) G.box *= SHOWTIME_CUT;   // the music box runs down
      if (G.puppetOutAt != null) G.puppetOutAt = cut(G.puppetOutAt);
      if (G.powerOutAt != null) G.powerOutAt = cut(G.powerOutAt);
      dirty = true;
      log('Showtime! Everyone moves twice as often, and every countdown on your side is cut in half.', 'you'); return '';
    }
    case 'bal':
      G.waltzUntil = t + WALTZ_TIME;
      log('Ballora\'s waltz: everyone else is harder to notice.', 'you'); return '';
    case 'nfb':
      if (u.attack || (u.room !== 'wcorner' && u.room !== 'ecorner')) return 'Only from the W. Corner or the E. Corner.';
      u.room = u.room === 'wcorner' ? 'ecorner' : 'wcorner';
      log(`Nightmare Fredbear switched to the ${ROOMS[u.room].name}.`, 'you'); return '';
  }
  return 'Nothing happens.';
}

// ---------- the end of the night ----------
function win(u, how) {
  if (G.over) return;
  G.over = true;
  G.result = { won: true, by: u, how };
  if (G.setup.night && !beaten.includes(G.setup.night)) { beaten.push(G.setup.night); store.set('beaten', beaten); }
  const ch = G.setup.challenge;
  if (ch && !challengeBeaten(ch)) { challengesBeaten.push(challengeKey(ch)); store.set('challenges', challengesBeaten); }
  catches[u.id] = (catches[u.id] || 0) + 1;
  store.set('catches', catches);
  const gid = G.guard.def.id;
  guardCaught[gid] = (guardCaught[gid] || 0) + 1;
  store.set('guardCaught', guardCaught);
  G.result.unlocked = checkAchievements(u, how);
  sfx.humOff();
  sfx.caught();
  showEnd();
}

// Which achievements this win earned (only the new ones). They're saved straight away.
function checkAchievements(u, how) {
  const g = G.guard, hour = G.t / G.hourLen;
  const canCatch = c => c.kind !== 'phantom' && !c.cantKill;
  const done = {
    first: true,
    speed: hour < 1,
    close: hour >= 5,
    clean: G.bonks === 0,
    hands: G.abilitiesUsed === 0,
    blackout: how === 'power',
    music: u.id === 'pup',
    golden: u.def.kind === 'golden',
    graduate: G.setup.night === 10,
    overtime: G.setup.night === 20,
    allnights: NIGHTS.every((_, i) => nightBeaten(i + 1)),
    bankrupt: g.def.id === 'tendons8' && guardHas('coins') && g.coins === 0,
    maxed: !!G.setup.challenge && G.setup.challenge.id === 'max',
    hunter: GUARDS.every(x => guardCaught[x.id]),
    crew: CREW.filter(canCatch).every(c => catches[c.id]),
  };
  const fresh = ACHIEVEMENTS.filter(a => done[a.id] && !achieved.includes(a.id));
  if (fresh.length) { fresh.forEach(a => achieved.push(a.id)); store.set('achievements', achieved); }
  return fresh;
}
function guardSurvives() {
  if (G.over) return;
  G.over = true;
  G.result = { won: false };
  sfx.humOff();
  sfx.sixAm();
  showEnd();
}

// Start a night (from the night list or the custom night screen).
function startNight(setup) {
  newGame(setup);
  show('game');
  sfx.init();
  sfx.humOn();
  log(`${G.guard.name} starts the night shift.`, 'g');
  renderGame();
  wakeLoop();
}

function setPaused(on) {
  if (!G || G.over || currentScreen !== 'game') return;
  G.paused = on;
  showPause(on);
  if (on) sfx.humOff(); else { sfx.humOn(); wakeLoop(); }
  dirty = true;
}
