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

// The two-letter tags that show who is in each vent on the VENTS tab. BB has none: he's never shown.
const VENT_TAGS = { tbn: 'TB', tch: 'TC', spr: 'ST', fen: 'EN' };

// Draw everything on the game screen: HUD, then either the office or the monitor, then the buttons.
function renderGame(now) {
  // ----- HUD: clock, power, usage -----
  $('clock').textContent = hourLabel(hourOf(G.t));
  const p = Math.max(0, Math.ceil(G.power));
  const pw = $('pw');
  pw.textContent = G.powerOut ? 'OUT' : p + '%';
  pw.classList.toggle('low', p <= 20);          // classList.toggle(name, yes/no) adds or removes a CSS class
  $('pwbar').textContent = bar(Math.ceil(p / 10), 10);
  const units = powerUnits();                   // 0 to 4 things using power
  $('usage').textContent = '▮'.repeat(units) + '▯'.repeat(4 - units);
  $('usage').classList.toggle('low', units >= 3);

  // ----- the view: office or monitor -----
  $('office').hidden = G.cam;
  $('cams').hidden = !G.cam;
  $('maskView').hidden = !G.mask || G.cam;   // the mask covers the office view, leaving two eye holes
  if (G.cam) renderMonitor(now);
  else renderOffice();

  // The flashlight: a soft circle of light around the pointer (its position comes from input.js).
  const beam = $('beam');
  beam.hidden = !flashOn() || !aim.where;
  beam.style.setProperty('--x', aim.x + 'px');
  beam.style.setProperty('--y', aim.y + 'px');
  // Shadow Bonnie's darkness over the office, with a hole where the flashlight shines.
  const dark = $('darkShade');
  dark.hidden = !G.sbn.active || G.powerOut || G.cam;
  dark.style.setProperty('--x', aim.x + 'px');
  dark.style.setProperty('--y', aim.y + 'px');
  dark.style.setProperty('--r', flashOn() && aim.where ? '110px' : '0px');
  // BB's jumpscare (when he takes your flashlight). It's over in a second.
  const bbScare = now < G.scareUntil;
  $('miniScare').hidden = !bbScare;
  if (bbScare) {
    const big = SPRITES.bb.scare, g = blank(20, big.length);
    sprite(g, 0, 0, big, 'c-bb');
    setHtml($('miniScareArt'), toHtml(g));
  }
  // The Toy cupcake, wherever it popped up (over the office or the monitor).
  const cup = $('cupcake');
  cup.hidden = !G.cup.active;
  if (G.cup.active) { cup.style.left = G.cup.x + '%'; cup.style.top = G.cup.y + '%'; }

  // ----- buttons -----
  const off = !powered();
  for (const [side, btn, label] of [['L', 'btnL', 'stL'], ['R', 'btnR', 'stR']]) {
    $(btn).classList.toggle('on', G.doors[side]);
    $(btn).setAttribute('aria-pressed', String(G.doors[side]));
    $(btn).disabled = off;
    $(label).textContent = off ? 'NO POWER' : G.doors[side] ? 'CLOSED' : 'OPEN';
  }
  $('btnCam').classList.toggle('on', G.cam);
  $('btnCam').setAttribute('aria-pressed', String(G.cam));
  $('btnCam').disabled = off;
  // When the music box runs low, a ♪! warning shows on the Camera button (and on CAM 7's map button).
  $('stCam').textContent = off ? 'NO POWER' : G.mask ? 'MASK ON' : G.cam ? 'UP' : 'DOWN';
  $('camWarn').hidden = !boxLow() || off;
  $('btnFlash').classList.toggle('on', flashOn());
  $('btnFlash').disabled = off;
  $('stFlash').textContent = off ? 'NO POWER'
    : lightStolen() ? `BB HAS IT ${Math.ceil(G.bb.stolenUntil - G.t)}s`
    : flashOn() ? 'ON' : 'HOLD';
  $('btnMask').classList.toggle('on', G.mask);
  $('btnMask').setAttribute('aria-pressed', String(G.mask));
  $('stMask').textContent = G.mask ? 'ON' : G.cam ? 'CAM UP' : 'OFF';
}

// Is the music box low enough to warn about?
const boxLow = () => G.pup.level > 0 && !G.pup.out && G.pup.wind < BOX_LOW;

// ---------- the office ----------
function renderOffice() {
  $('office').classList.toggle('dark', G.powerOut);
  for (const side of ['L', 'R']) setHtml($('door' + side), toHtml(doorGrid(side)));
  const g = officeGrid();
  if (!G.powerOut) drawVisitors(g);
  setHtml($('officeArt'), toHtml(g));
}

// Everyone who can be in the office, drawn on top of it (the later ones on top of the earlier ones).
function drawVisitors(g) {
  // The Crying Child's sticky note: which camera he's on.
  if (G.cry.level > 0) {
    const n = String(ROOMS[G.cry.room].cam);
    sprite(g, ...NOTE_SPOT, ['.------.', '| CAM  |', `|  ${n}   |`, "'------'"], 'note');
  }
  // The Puppet, out of the box, flickering on your monitor's screen.
  if (G.pup.out && Math.floor(performance.now() / 140) % 4 !== 0) write(g, SCREEN_SPOT[0], SCREEN_SPOT[1], SPRITES.pup.peek[0], 'c-pup');
  if (G.tbn.present) sprite(g, ...TBONNIE_SPOT, SPRITES.tbn.office, 'c-tbn');
  if (G.tch.present) sprite(g, ...TCHICA_SPOT, SPRITES.tch.office, 'c-tch');
  if (G.tfr.present) sprite(g, ...TFREDDY_SPOT, SPRITES.tfr.office, 'c-tfr');
  if (G.gol.present) sprite(g, ...GOLDEN_SPOT, SPRITES.gol.office, 'c-gol');
  if (G.bb.present) sprite(g, ...BB_SPOT, SPRITES.bb.office, 'c-bb');
  // Mangle on the ceiling. Right after a flash they glow ("shone"), until the light leaves them.
  const M = G.mng;
  if (M.active) sprite(g, MANGLE_ROW, Math.round(M.x), SPRITES.mng.office, 'c-mng' + (M.needOff ? ' shone' : ''));
  // Shadow Bonnie's white eyes, hidden in the dark (see #darkShade). They glow while the light is on them.
  const S = G.sbn;
  if (S.active) write(g, S.eyes[0], S.eyes[1], SPRITES.sbn.eyes, 'c-sbn acc-white' + (S.shineT > 0 ? ' shone' : ''));
}

// One door of the office as a grid: 12 wide (10 inside the frame) and 16 tall.
// Shut: a steel shutter. Open: a dark doorway with a dotted floor, plus whoever is standing there.
function doorGrid(side) {
  const W = 10, H = 14;
  const shut = G.doors[side];
  const lines = ['+' + '-'.repeat(W) + '+'];
  for (let r = 0; r < H; r++) {
    let inner;
    if (shut) inner = r % 3 === 2 ? '-'.repeat(W) : '='.repeat(W);   // % is "remainder": every 3rd row
    else if (r === H - 1) inner = ' , , , , ,';
    else inner = ' '.repeat(W);
    lines.push('|' + inner + '|');
  }
  lines.push('+' + '='.repeat(W) + '+');
  const g = grid(lines, W + 2);
  for (let r = 1; r <= H; r++) for (let c = 1; c <= W; c++) g[r][c].cls = shut ? 'door' : 'dim';
  if (shut || G.powerOut) return g;
  // Bonnie in the left doorway, Chica in the right one.
  if (side === 'L' && G.bon.level > 0 && atDoor(G.bon, BONNIE)) sprite(g, 4, 1, SPRITES.bon.door, 'c-bon');
  if (side === 'R' && G.chi.level > 0 && atDoor(G.chi, CHICA)) sprite(g, 5, 1, SPRITES.chi.door, 'c-chi');
  return g;
}

// ---------- the monitor ----------
// The tab bar (only when there's something in the vents tonight), then the camera or the vent map.
function renderMonitor(now) {
  $('tabs').hidden = !ventsOn();
  for (const b of document.querySelectorAll('#tabs button')) b.setAttribute('aria-current', String(b.dataset.tab === G.tab));
  $('camPane').hidden = G.tab !== 'cams';
  $('ventPane').hidden = G.tab !== 'vents';
  if (G.tab === 'cams') renderFeed(now);
  else renderVents();
}

// The camera screen: the room picture (or static), whoever is in it, the music box and its wind
// bar (on CAM 7), and the map with its warnings.
function renderFeed(now) {
  const room = G.camRoom;
  $('feedName').textContent = `CAM ${ROOMS[room].cam} · ${ROOMS[room].name}`;
  let g;
  if (now < G.staticUntil) {
    // Static: random characters.
    const chars = ' .:;*#%';
    g = Array.from({ length: 11 }, () =>
      Array.from({ length: 40 }, () => ({ ch: chars[Math.floor(Math.random() * chars.length)], cls: 'dim' })));
  } else {
    g = grid(frame(ROOM_ART[room], 38), 40);
    // Bonnie and Chica, if they're in this room (Freddy never shows on the cameras).
    const B = G.bon, C = G.chi;
    if (B.level > 0 && !atDoor(B, BONNIE) && BONNIE.route[B.step] === room) sprite(g, ...BONNIE_SLOTS[room], SPRITES.bon.cam, 'c-bon');
    if (C.level > 0 && !atDoor(C, CHICA) && CHICA.route[C.step] === room) sprite(g, ...CHICA_SLOTS[room], SPRITES.chi.cam, 'c-chi');
    // Foxy: peeking out of Pirate Cove, half out, gone, or running down the West Hall.
    // While the light is on the cove he glows ("shone").
    const X = G.fox;
    if (room === 'cove' && X.level > 0) {
      const lit = foxyLit() ? ' shone' : '';
      if (X.phase === 'run') write(g, 6, 13, '    (empty)     ', 'dim');
      else if (X.stage === 1) sprite(g, 5, 18, SPRITES.fox.peek, 'c-fox' + lit);
      else if (X.stage === 2) sprite(g, 4, 16, SPRITES.fox.half, 'c-fox' + lit);
    }
    if (room === 'whall' && X.phase === 'run') sprite(g, 6, 4 + Math.floor((FOXY_RUN - X.runT) / FOXY_RUN * 26), SPRITES.fox.run, 'c-fox');
    // The Puppet's box on CAM 7: closed, or open with the Puppet looking out.
    if (room === 'prize' && G.pup.level > 0) {
      if (G.pup.out) write(g, 7, 17, SPRITES.pup.peek[0], 'c-pup');
      else if (G.pup.wind < BOX_LOW) write(g, 7, 18, '(_LOW!_)', 'c-pup blink');
      else write(g, 7, 18, '(______)', 'dim');
    }
    // Shadow Freddy, slumped in this room. He glows while the light is on him.
    const S = G.sfr;
    if (S.present && S.room === room) sprite(g, ...SHADOW_SLOTS[room], SPRITES.sfr.cam, 'c-sfr' + (S.flashT > 0 ? ' shone' : ''));
    // The Crying Child, if this is his camera.
    if (G.cry.level > 0 && G.cry.room === room) sprite(g, ...CHILD_SLOTS[room], SPRITES.cry.cam, 'c-cry');
  }
  setHtml($('feed'), toHtml(g));

  // The wind bar and button only appear on CAM 7, on nights with the Puppet.
  const onBox = room === 'prize' && G.pup.level > 0;
  $('wind').hidden = !onBox;
  if (onBox) {
    const w = Math.round(G.pup.wind);
    $('windBar').textContent = bar(Math.round(w / 5), 20) + ' ' + String(w).padStart(3) + '%';
    $('windBar').classList.toggle('low', w < BOX_LOW);
  }
  // The map: highlight the camera you're on, and show the warnings: a red ! where Shadow Freddy
  // is, and ♪! on CAM 7 when the music box is low.
  for (const b of document.querySelectorAll('#map button')) {
    b.setAttribute('aria-current', String(b.dataset.room === room));
    const warn = b.querySelector('.mw');
    const shadow = G.sfr.present && G.sfr.room === b.dataset.room;
    const box = b.dataset.room === 'prize' && boxLow();
    warn.textContent = shadow ? ' !' : box ? ' ♪!' : '';
    warn.className = 'mw' + (shadow ? ' alert' : box ? ' warn' : '');
  }
}

// The VENTS tab: 8 vent buttons in 2 rows of 4, with who's in each (never BB), the lure that's
// playing, and a "BLOCKED" when you tried to lure Freddy Endo's vent.
function renderVents() {
  let html = '';
  for (let n = 1; n <= 8; n++) {
    const tags = [TBONNIE, TCHICA, SPRING]
      .filter(c => G[c.id].level > 0 && !G[c.id].present && G[c.id].room === n)
      .map(c => `<b class="c-${c.id}">${VENT_TAGS[c.id]}</b>`);
    if (G.fen.level > 0 && G.fen.room === n) tags.push(`<b class="c-fen">${VENT_TAGS.fen}</b>`);
    const lured = G.lure && G.lure.room === n, blocked = G.blocked && G.blocked.room === n;
    html += `<button type="button" class="vent${lured ? ' lured' : ''}${blocked ? ' blocked' : ''}" data-vent="${n}" style="grid-area:v${n}">` +
      `<span class="vn">V${n}</span><span class="occ">${tags.join(' ') || '&nbsp;'}</span>` +
      `<span class="mark">${lured ? '~ lure ~' : blocked ? 'BLOCKED' : '&nbsp;'}</span></button>`;
  }
  html += '<span class="vent-office" style="grid-area:you">YOUR<br>OFFICE</span>';
  setHtml($('ventMap'), html);
  $('ventNote').textContent = G.t < G.lureReady
    ? 'Lure recharging...'
    : 'Click a vent (or press its number) to play an audio lure there.';
}
