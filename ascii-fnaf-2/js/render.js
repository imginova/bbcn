/* =====================================================================
   render.js: DRAWS the night onto the screen.

   These functions only read the game state (G) and update the page;
   they never change the rules. main.js calls renderGame() about 15
   times a second, and right away whenever `dirty` is true.
   ===================================================================== */

// Put new HTML into a page element, but only if it's different from what's already there.
// Turning HTML into page elements is the slowest part of drawing, and most redraws change nothing,
// so this skips them. `el.lastHtml` remembers what we put in last time.
function setHtml(el, html) {
  if (el.lastHtml === html) return;
  el.lastHtml = html;
  el.innerHTML = html;
}

// A bar like [|||||.....] that is `filled` out of `total` long.
const bar = (filled, total) => '[' + '|'.repeat(filled) + '.'.repeat(total - filled) + ']';

// Draw everything on the game screen: HUD, then the office, a door or the monitor, then the buttons.
function renderGame(now) {
  // ----- HUD: clock, power, oxygen, usage -----
  $('clock').textContent = clockLabel(G.t);
  const p = Math.max(0, Math.ceil(G.power)), o = Math.max(0, Math.ceil(G.oxygen));
  $('pw').textContent = G.powerOut ? 'OUT' : p + '%';
  $('pw').classList.toggle('low', p <= 20);   // classList.toggle(name, yes/no) adds or removes a CSS class
  $('pwbar').textContent = bar(Math.ceil(p / 10), 10);
  $('o2').textContent = o + '%';
  $('o2').classList.toggle('low', o <= O2_LOW);
  $('o2bar').textContent = bar(Math.ceil(o / 10), 10);
  const units = Math.min(8, powerUnits() + (G.ncp.present ? 1 : 0) + (G.nmg.present ? 1 : 0));
  $('usage').textContent = '▮'.repeat(units) + '▯'.repeat(8 - units);
  $('usage').classList.toggle('low', units >= 5);

  // ----- the view: office, a door, or the monitor -----
  $('office').hidden = G.cam;
  $('cams').hidden = !G.cam;
  $('maskView').hidden = !G.mask || G.cam;   // the mask covers the office view, leaving two eye holes
  $('office').classList.toggle('zap', now < G.zapUntil && !G.cam);
  if (G.cam) renderMonitor(now);
  else renderOffice(now);

  // ----- buttons -----
  const off = !powered();
  const btn = (id, on, label, state, disabled = off) => {
    $(id).classList.toggle('on', on);
    $(id).setAttribute('aria-pressed', String(on));
    $(id).disabled = disabled;
    $(label).textContent = state;
  };
  for (const side of ['L', 'R']) {
    btn('btn' + side, G.doors[side], 'st' + side, off ? 'NO POWER' : G.doors[side] ? 'CLOSED' : 'OPEN');
    btn('btnH' + side, G.heavy[side], 'stH' + side, off ? 'NO POWER' : G.heavy[side] ? 'SEALED' : 'OPEN');
    btn('btnGo' + side, G.at === side, 'stGo' + side, G.at === side ? 'BACK' : 'GO', G.over);
  }
  btn('btnCam', G.cam, 'stCam', off ? 'NO POWER' : G.mask ? 'MASK ON' : G.at ? 'AT DOOR' : G.cam ? 'UP' : 'DOWN');
  btn('btnMask', G.mask, 'stMask', G.mask ? 'ON' : G.cam ? 'CAM UP' : G.at ? 'AT DOOR' : 'OFF', false);
  btn('btnVent', G.vent, 'stVent', off ? 'NO POWER' : G.vent ? 'CLOSED' : 'OPEN');
  btn('btnLamp', now < G.lampUntil, 'stLamp', off ? 'NO POWER' : G.cam ? 'CAM UP' : G.at ? 'AT DOOR' : 'FLASH');
  $('office').classList.toggle('lamp-on', now < G.lampUntil && !G.cam);
  const charged = G.t >= G.shockReady;
  btn('btnShock', false, 'stShock', off ? 'NO POWER' : G.at ? 'AT DOOR' : !charged ? 'CHARGING' : G.cam ? 'CAMERA' : 'DESK');
}

// ---------- the office ----------
function renderOffice(now) {
  const dark = G.powerOut;
  $('office').classList.toggle('dark', dark);
  $('board').hidden = !!G.at || dark || G.ffr.level === 0;   // the script, only on nights with Funtime Freddy
  $('listenNote').hidden = !G.at;
  for (const side of ['L', 'R']) $('door' + side).hidden = !!G.at;
  if (G.at) {
    setHtml($('officeArt'), toHtml(listenGrid(G.at, now)));
    $('listenNote').innerHTML = listenText(G.at);
    return;
  }
  for (const side of ['L', 'R']) setHtml($('door' + side), toHtml(doorGrid(side, now)));
  const g = officeGrid(G.vent);
  if (!dark) drawVisitors(g, now);
  setHtml($('officeArt'), toHtml(g));
  renderBoard();
}

// Everyone who can be in the office, drawn on top of it (the later ones on top of the earlier ones).
function drawVisitors(g, now) {
  // The Freddles on the desk; they blink red once Nightmare Freddy is coming.
  for (let i = 0; i < G.nfr.freddles; i++) sprite(g, ...FREDDLE_SPOTS[i], SPRITES.nfr.office, 'c-nfr' + (G.nfr.coming ? ' blink' : ''));
  if (G.end.mode === 'air') sprite(g, ...ENNARD_AIR_SPOT, SPRITES.end.office, 'c-end');
  if (G.wbn.present) sprite(g, ...WBN_SPOT, SPRITES.wbn.office, 'c-wbn');
  if (G.nmt.present) sprite(g, ...NMT_SPOT, SPRITES.nmt.office, 'c-nmt' + (now < G.zapUntil ? ' shone' : ''));
  // Nightmare BB in his corner: asleep, or awake with glowing eyes. He glows while the lamp flashes on him.
  if (G.nbb.level > 0) {
    const lit = now < G.lampUntil ? ' shone' : '';
    sprite(g, ...NBB_SPOT, G.nbb.awake ? SPRITES.nbb.awake : SPRITES.nbb.asleep, 'c-nbb' + lit);
  }
  // Nightmare Foxy, once he's got in: bigger at every stage (the last one is his jumpscare drawing).
  const X = G.nfx;
  if (X.inside) {
    const look = X.grow === 1 ? SPRITES.nfx.small : X.grow === 2 ? SPRITES.nfx.medium : SPRITES.nfx.scare;
    sprite(g, ...NFX_SPOTS[Math.min(X.grow, NFX_STAGES)][X.side], look, 'c-nfx');
  }
  const B = G.bab;
  if (B.inside) {
    if (B.close) sprite(g, ...BABY_CLOSE_SPOT, SPRITES.bab.close, 'c-bab');
    else sprite(g, ...BABY_SPOT, SPRITES.bab.office, 'c-bab');
  }
  // The monitor's screen shows the air and power readings, like a control panel.
  const [sr, sc] = SCREEN_BOX;
  write(g, sr, sc + 1, `AIR ${String(Math.ceil(G.oxygen)).padStart(3)}%   PWR ${String(Math.max(0, Math.ceil(G.power))).padStart(3)}%`, 'screen');
  write(g, sr + 1, sc + 1, G.oxygen < O2_LOW ? '!! LOW OXYGEN !!' : 'SYSTEMS NOMINAL', G.oxygen < O2_LOW ? 'alert' : 'screen dim');
}

// One door of the office as a grid: 14 wide and 20 tall. The heavy door (thick steel with rivets) is
// drawn over the normal one (a shutter). Open, it's a dark doorway: you can't see who's there, except
// Jack-o Chica's smoke drifting in.
function doorGrid(side, now) {
  const W = 12, H = 18;
  const lines = ['+' + '-'.repeat(W) + '+'];
  for (let r = 0; r < H; r++) {
    let inner;
    if (G.heavy[side]) inner = r % 4 === 1 ? '#[]######[]#' : '############';
    else if (G.doors[side]) inner = r % 3 === 2 ? '-'.repeat(W) : '='.repeat(W);
    else if (r === H - 1) inner = ' , , , , , ,';
    else inner = ' '.repeat(W);
    lines.push('|' + inner + '|');
  }
  lines.push('+' + '='.repeat(W) + '+');
  const g = grid(lines, W + 2, 'room');
  paint(g, 1, 1, H, W, G.heavy[side] ? 'heavy' : G.doors[side] ? 'door' : 'dim');
  if (G.powerOut) return g;
  // Jack-o Chica's smoke: a few puffs that drift and flicker (they move a little every 300 ms).
  if (G.jck.side === side && !G.heavy[side]) {
    const drift = Math.floor(now / 300);
    for (let r = 2; r < H - 2; r += 2) {
      const c = 1 + ((r * 3 + drift) % 8);
      write(g, r, c, r % 4 ? '~(~' : ')~)', 'c-jck smoke');
    }
  }
  return g;
}

// At a door, listening: the door up close, filling the view, with your hand on it.
function listenGrid(side, now) {
  const g = blank(OFFICE_W, OFFICE_H);
  paint(g, 0, 0, OFFICE_H - 1, OFFICE_W - 1, 'room');
  // The wall around the door frame.
  for (let r = 0; r < OFFICE_H; r++) {
    write(g, r, 0, r % 3 === 0 ? '|=====|' : '|     |', 'room');
    write(g, r, OFFICE_W - 7, r % 3 === 0 ? '|=====|' : '|     |', 'room');
  }
  write(g, 0, 7, '_'.repeat(OFFICE_W - 14), 'room');
  // The doorway itself: the heavy door, the normal door, or the dark.
  for (let r = 1; r < OFFICE_H - 1; r++) {
    let inner, cls;
    if (G.heavy[side]) { inner = r % 4 === 1 ? '##[]##############################[]##' : '#'.repeat(40); cls = 'heavy'; }
    else if (G.doors[side]) { inner = (r % 3 === 2 ? '-' : '=').repeat(40); cls = 'door'; }
    else { inner = r === OFFICE_H - 2 ? ' , , , , , , , , , , , , , , , , , , , ' : ' '.repeat(40); cls = 'dim'; }
    write(g, r, 8, inner, cls);
  }
  write(g, OFFICE_H - 1, 7, '"'.repeat(OFFICE_W - 14), 'floor');
  // Jack-o Chica's smoke, if she's in this doorway and it's open.
  if (G.jck.side === side && !G.heavy[side]) {
    const drift = Math.floor(now / 300);
    for (let r = 3; r < OFFICE_H - 3; r += 2) write(g, r, 10 + ((r * 5 + drift) % 26), '~(~~)~', 'c-jck smoke');
  }
  write(g, 9, side === 'L' ? 1 : OFFICE_W - 6, side === 'L' ? '<-  ' : '  ->', 'sign');
  return g;
}

// What you hear at the door (also written out, so it works with the sound off).
function listenText(side) {
  const where = side === 'L' ? 'LEFT' : 'RIGHT';
  const parts = [];
  if (NIGHTMARES.some(c => G[c.id].level > 0 && G[c.id].atDoor && G[c.id].side === side)) parts.push('<b class="alert">Heavy breathing.</b> Someone is right outside.');
  if (G.jck.side === side) parts.push('<b class="c-jck">Smoke</b> is seeping in.');
  if (!parts.length) parts.push('Nothing but the hum of the machines.');
  return `<span class="dim">LISTENING AT THE ${where} DOOR ·</span> ${parts.join(' ')}`;
}

// Funtime Freddy's script, on the office wall.
function renderBoard() {
  const F = G.ffr;
  if (F.level > 0) {
    setHtml($('scriptLines'), F.script.map((line, i) =>
      `<li class="${line.important ? 'important' : ''}${line.done ? ' done' : ''}${i === F.said ? ' now' : ''}">` +
      `<span class="t">${clockLabel(line.t)}</span> ${escText(line.text)}</li>`).join(''));
  }
}

// ---------- the monitor ----------
// The camera picture (or static), whoever is in that room, and the map with its warnings.
function renderMonitor(now) {
  const room = G.camRoom;
  $('feedName').textContent = `CAM ${ROOMS[room].cam} · ${ROOMS[room].name}`;
  let g;
  if (now < G.staticUntil) {
    const chars = ' .:;*#%';
    g = Array.from({ length: CAM_H }, () =>
      Array.from({ length: CAM_W }, () => ({ ch: chars[Math.floor(Math.random() * chars.length)], cls: 'dim' })));
  } else {
    g = roomGrid(room);
    drawOnCamera(g, room);
  }
  setHtml($('feed'), toHtml(g));
  $('btnShockCam').disabled = !powered() || G.t < G.shockReady;
  // The map: highlight the camera you're on, and the warnings: a pink ! where the Nightmare Cupcake
  // is eating, and a blinking ~ on the three rooms Nightmare Mangle might be in.
  for (const b of document.querySelectorAll('#map button')) {
    const r = b.dataset.room;
    b.setAttribute('aria-current', String(r === room));
    const warn = b.querySelector('.mw');
    const cup = G.ncp.present && r === 'power';
    const mangle = G.nmg.present && (r === G.nmg.room || G.nmg.decoys.includes(r));
    warn.textContent = (cup ? ' !' : '') + (mangle ? ' ~' : '');
    warn.className = 'mw' + (cup ? ' c-ncp alert' : mangle ? ' c-nmg alert' : '');
  }
}

// A room's picture: the halls are drawn by code, the rest come from ROOM_ART with their tints.
function roomGrid(room) {
  if (room === 'lhall' || room === 'rhall') return hallGrid(room);
  const g = grid(frame(art(ROOM_ART[room]), CAM_W - 2), CAM_W, 'room');
  for (const [r1, c1, r2, c2, cls] of ROOM_TINTS[room] || []) paint(g, r1 + 1, c1 + 1, r2 + 1, c2 + 1, cls);
  return g;
}

// Everyone who can be seen on camera `room`.
function drawOnCamera(g, room) {
  // The halls: the nightmares (not Foxy), Circus Baby (left hall only) and Ennard, at their step.
  // Far away you only see their eyes; right outside your door they're big.
  for (const side of ['L', 'R']) {
    if (room !== HALL[side]) continue;
    const inHall = [];
    for (const c of NIGHTMARES) {
      const N = G[c.id];
      if (N.level > 0 && !c.unseen && !N.atDoor && N.stage > 0 && N.side === side) inHall.push([c.id, N.stage]);
    }
    if (side === 'L' && G.bab.level > 0 && !G.bab.inside && G.bab.stage > 0) inHall.push(['bab', G.bab.stage]);
    if (G.end.mode === 'hall' && G.end.side === side && G.end.stage > 0) inHall.push(['end', G.end.stage + 1]);
    // Farthest first, so nearer ones are drawn in front. Each one stands a little to the side of the
    // others (nudge) so two at the same step don't hide each other completely.
    inHall.sort((a, b) => a[1] - b[1]).forEach(([id, step], i) => {
      const look = SPRITES[id][step === 1 ? 'far' : step === 2 ? 'cam' : 'near'];
      const w = Math.max(...look.map(l => l.length));
      const nudge = (i % 2 ? 1 : -1) * Math.min(i, 2) * (step === 3 ? 7 : 4);
      sprite(g, ...hallSpot(room, step, w, look.length, nudge), look, 'c-' + id);
    });
  }
  // Funtime Foxy on the show stage, and the stage's sign showing when the next show starts (on request:
  // the time is on the show stage itself, so you have to check CAM 3 to know it).
  if (room === 'stage' && G.ffx.level > 0) {
    const X = G.ffx, live = G.t >= X.show && X.show < NIGHT_END;
    sprite(g, ...FFX_SPOT, SPRITES.ffx.cam, 'c-ffx' + (live ? ' shone' : ''));
    const text = X.show >= NIGHT_END ? '*  NO MORE SHOWS TONIGHT  *' : `*  NEXT SHOW:  ${clockLabel(X.show)}  *`;
    write(g, 2, 7, ' '.repeat(46), 'sign');                         // clear the banner...
    write(g, 2, 30 - Math.floor(text.length / 2), text, 'showsign');  // ...and put the time on it, in the middle
    if (live) write(g, 9, 21, '* IT\'S SHOWTIME! *', 'sign blink');
  }
  if (room === 'auditorium' && G.ffr.level > 0 && G.ffr.phase !== 'door') sprite(g, ...FFR_SPOTS[G.ffr.pos], SPRITES.ffr.cam, 'c-ffr');
  if (room === 'oxygen' && G.ptr.present) sprite(g, ...PTR_SPOT, SPRITES.ptr.cam, 'c-ptr');
  if (room === 'oxygen') for (let i = 0; i < G.mrn.count; i++) sprite(g, ...MRN_SPOTS[i], SPRITES.mrn.cam, 'c-mrn');
  if (room === 'power' && G.ncp.present) sprite(g, ...NCP_SPOT, SPRITES.ncp.cam, 'c-ncp');
  if (room === 'parts' && G.end.level > 0 && !G.end.mode) sprite(g, ...ENNARD_HOME, SPRITES.end.cam, 'c-end');
  if (G.nmg.present && room === G.nmg.room) sprite(g, ...NMG_SPOT, SPRITES.nmg.cam, 'c-nmg');
}
