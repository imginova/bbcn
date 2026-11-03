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

// Draw everything on the game screen: HUD, then either the office or the monitor, then the buttons.
function renderGame(now) {
  // ----- HUD: clock, power, usage, heat -----
  $('clock').textContent = hourLabel(hourOf(G.t));
  const p = Math.max(0, Math.ceil(G.power));
  const pw = $('pw');
  pw.textContent = G.powerOut ? 'OUT' : p + '%';
  pw.classList.toggle('low', p <= 20);          // classList.toggle(name, yes/no) adds or removes a CSS class
  $('pwbar').textContent = bar(Math.ceil(p / 10), 10);
  const units = powerUnits();                   // 0 to 5 things using power
  $('usage').textContent = '▮'.repeat(units) + '▯'.repeat(5 - units);
  $('usage').classList.toggle('low', units >= 3);
  // The heat meter only shows on nights with the Flamethrower endo.
  $('heatMeter').hidden = G.end.level === 0;
  const heat = Math.floor(G.end.heat);
  $('heat').textContent = heat + '%';
  $('heat').classList.toggle('low', heat >= 60);

  // ----- the view: office or monitor -----
  const office = $('office'), cams = $('cams');
  office.hidden = G.cam;
  cams.hidden = !G.cam;
  $('maskView').hidden = !G.mask || G.cam;   // the mask covers the office view, leaving two eye holes
  if (G.cam) renderFeed(now);
  else renderOffice(now);

  // The flashlight: a soft circle of light around the pointer (its position comes from input.js).
  const beam = $('beam');
  beam.hidden = !flashOn();
  beam.style.setProperty('--x', aim.x + 'px');
  beam.style.setProperty('--y', aim.y + 'px');
  // Sleepy Moon: the view gets darker as the sleep meter fills (opacity 0 is see-through, 1 is black).
  $('sleepShade').style.opacity = (G.mon.sleep / 100 * 0.92).toFixed(3);
  // The endo: a red-hot glow that gets stronger as the office heats up.
  $('heatGlow').style.opacity = (G.end.heat / 100 * 0.6).toFixed(3);
  // Phantom Chica's jumpscare (when you didn't find her cupcakes in time). It's over in a second.
  const chicaScare = now < G.pch.scareUntil;
  $('miniScare').hidden = !chicaScare;
  if (chicaScare) {
    const big = SPRITES.pch.scare, g = blank(20, big.length);
    sprite(g, 0, 0, big, 'c-pch');
    setHtml($('miniScareArt'), toHtml(g));
  }

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
  const boxLow = G.pup.level > 0 && !G.pup.out && G.pup.wind < BOX_LOW;
  $('stCam').textContent = off ? 'NO POWER' : G.mask ? 'MASK ON' : G.cam ? 'UP' : 'DOWN';
  $('camWarn').hidden = !boxLow || off;
  $('camWarnMap').hidden = !boxLow || off;
  $('btnFlash').classList.toggle('on', flashOn());
  $('btnFlash').disabled = off;
  $('stFlash').textContent = off ? 'NO POWER' : G.cam ? 'CAM UP' : flashOn() ? 'ON' : 'HOLD';
  $('btnMask').classList.toggle('on', G.mask);
  $('btnMask').setAttribute('aria-pressed', String(G.mask));
  $('stMask').textContent = G.mask ? 'ON' : G.cam ? 'CAM UP' : 'OFF';
  $('btnFan').classList.toggle('on', G.fan);
  $('btnFan').setAttribute('aria-pressed', String(G.fan));
  $('btnFan').disabled = off;
  $('stFan').textContent = off ? 'NO POWER' : G.fan ? 'ON' : 'OFF';
}

// ---------- the office ----------
function renderOffice(now) {
  $('office').classList.toggle('dark', G.powerOut);
  for (const side of ['L', 'R']) {
    setHtml($('door' + side), toHtml(doorGrid(side, now)));
    $('door' + side).classList.toggle('lit', beamOnDoor(side));   // style.css makes a lit doorway glow
  }
  const g = officeGrid(now);
  if (!G.powerOut) drawVisitors(g, now);
  setHtml($('officeArt'), toHtml(g));
}

// Everyone who can be in the office, drawn on top of it (the later ones on top of the earlier ones).
function drawVisitors(g, now) {
  // The Nightmare staff bot sits on the desk. While it blinks, its eyes flash and an arrow
  // above it points at the door to shut.
  const S = G.stf;
  if (S.level > 0) {
    const blinkOn = S.active && Math.floor(now / 250) % 2 === 0;
    const lines = SPRITES.stf.office.slice();
    if (S.active) lines[1] = blinkOn ? '[* *]' : '[o o]';
    sprite(g, ...STAFF_SPOT, lines, 'c-stf' + (blinkOn ? ' blink' : ''));
    if (S.active) write(g, STAFF_SPOT[0] - 1, S.side === 'L' ? 0 : 5, S.side === 'L' ? '<<<' : '>>>', 'c-stf blink');
  }
  // Freddles on the desk. "frd" marks them so the light can be seen on them (style.css).
  G.nfr.freddles.forEach((here, i) => {
    if (here) write(g, ...FREDDLE_SPOTS[i], SPRITES.nfr.freddle, 'c-nfr' + (G.nfr.shine[i] > 0 ? ' shone' : ''));
  });
  // The Puppet, out of the box, flickering on your monitor's screen.
  if (G.pup.out && Math.floor(now / 140) % 4 !== 0) write(g, SCREEN_SPOT[0], SCREEN_SPOT[1], SPRITES.pup.peek[0], 'c-pup');
  if (G.gol.present) sprite(g, ...GOLDEN_SPOT, SPRITES.gol.office, 'c-gol');
  if (G.wbn.present) sprite(g, ...WITHERED_SPOT, SPRITES.wbn.office, 'c-wbn');
  if (G.nfr.present) sprite(g, ...NIGHTMARE_SPOT, SPRITES.nfr.office, 'c-nfr');
  // The endo's flames licking up from the bottom of the office while he's here.
  if (G.end.present) {
    const flames = '^)(^^ (^)^ ^(^) )^( ^^)(^ ^(^ )^^(^ )';
    const shift = Math.floor(now / 90) % 6;
    write(g, 15, 0, (flames + flames).slice(shift, shift + 36), 'c-end');
  }
  // Bonnet running along the floor. Her nose ("bnt-nose") is what you click (see input.js).
  const N = G.bnt;
  if (N.active) {
    const r = Math.round(N.y), c = Math.round(N.x);
    sprite(g, r, c, SPRITES.bnt.office, 'c-bnt');
    if (g[r + 1] && g[r + 1][c + 2]) g[r + 1][c + 2] = { ch: '*', cls: 'c-bnt bnt-nose' };
  }
  // Phantom Chica's shadow cupcakes. "cup cup-2" says which one, for clicking (input.js).
  if (G.pch.active) G.pch.cups.forEach(([r, c], i) => write(g, r, c, '{^}', `cup cup-${i}`));
  // Sleepy Moon: once you're getting drowsy, Zs float near the top.
  if (G.mon.sleep >= 50) write(g, 0, 30, Math.floor(now / 600) % 2 ? 'z Z z' : 'Z z Z', 'c-mon');
}

// One door of the office as a grid: 12 wide (10 inside the frame) and 16 tall.
// Shut: a steel shutter. Open: a dark doorway with a dotted floor, plus whoever is standing there.
function doorGrid(side, now) {
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
  // Bonnie in this doorway.
  if (G.bon.level > 0 && bonnieAtDoor() && bonnieSide() === side) sprite(g, 4, 1, SPRITES.bon.door, 'c-bon');
  // Withered Foxy in the left doorway. Once flashed he goes pale (the "stunned" class).
  if (side === 'L' && G.wfx.level > 0 && foxyInDoorway()) {
    sprite(g, 4, 1, SPRITES.wfx.door, 'c-wfx' + (G.wfx.phase === 'flashed' ? ' stunned' : ''));
  }
  return g;
}

// ---------- the monitor ----------
// The camera screen: the room picture (or static), whoever is in it, the music box and its wind
// bar (on CAM 7), and which map button is highlighted.
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
    // Bonnie, if he's in this room (Freddy never shows on the cameras).
    const B = G.bon;
    if (B.level > 0 && !bonnieAtDoor() && B.route[B.step] === room) sprite(g, ...BONNIE_SLOTS[room], SPRITES.bon.cam, 'c-bon');
    // Withered Foxy: peeking out of Pirate Cove, half out, gone, or running down the West Hall.
    const X = G.wfx;
    if (room === 'cove' && X.level > 0) {
      if (X.phase !== 'cove') write(g, 6, 13, '    (empty)     ', 'dim');
      else if (X.stage === 1) sprite(g, 5, 18, SPRITES.wfx.peek, 'c-wfx');
      else if (X.stage === 2) sprite(g, 4, 16, SPRITES.wfx.half, 'c-wfx');
    }
    if (room === 'whall' && X.phase === 'run') sprite(g, 5, 8 + Math.floor((FOXY_RUN - X.runT) * 6), SPRITES.wfx.run, 'c-wfx');
    // The Puppet's box on CAM 7: closed, or open with the Puppet looking out.
    if (room === 'prize' && G.pup.level > 0) {
      if (G.pup.out) write(g, 7, 17, SPRITES.pup.peek[0], 'c-pup');
      else if (G.pup.wind < BOX_LOW) write(g, 7, 18, '(_LOW!_)', 'c-pup blink');
      else write(g, 7, 18, '(______)', 'dim');
    }
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
  for (const b of document.querySelectorAll('#map button')) b.setAttribute('aria-current', String(b.dataset.room === room));
}
