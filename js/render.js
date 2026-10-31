/* =====================================================================
   render.js: DRAWS the night onto the screen.

   These functions only read the game state (G) and update the page;
   they never change the rules. main.js calls renderGame() about 15
   times a second, and right away whenever `dirty` is true.
   ===================================================================== */

// Draw everything on the game screen: HUD, then either the office or the camera, then the buttons.
function renderGame(now) {
  // ----- HUD: clock, power, usage -----
  $('clock').textContent = hourLabel(hourOf(G.t));

  const p = Math.max(0, Math.ceil(G.power));
  const pw = $('pw');
  pw.textContent = G.powerOut ? 'OUT' : p + '%';
  pw.classList.toggle('low', p <= 20);          // classList.toggle(name, yes/no) adds or removes a CSS class
  const seg = Math.ceil(p / 10);                // 10 bars, one per 10%
  $('pwbar').textContent = '[' + '|'.repeat(seg) + '.'.repeat(10 - seg) + ']';

  const units = powerUnits();                   // 0 to 5: doors, camera and door lights in use
  const usage = $('usage');
  usage.textContent = '▮'.repeat(units) + '▯'.repeat(5 - units);
  usage.classList.toggle('low', units >= 3);

  // ----- the view: office or camera -----
  const office = $('office'), cams = $('cams');
  office.hidden = G.cam;
  cams.hidden = !G.cam;
  if (G.cam) {
    renderFeed(now);
  } else {
    office.classList.toggle('dark', G.powerOut);
    for (const side of ['L', 'R']) {
      $('door' + side).innerHTML = toHtml(doorGrid(side, now));
      $('door' + side).classList.toggle('lit', lightOn(side));   // style.css makes a lit doorway glow
    }
    const og = grid(officeLines(now, G.powerOut, G.cam), 36);
    // Once Lenny is out he flickers on your desk monitor (shown 3 frames out of 4).
    if (G.lenny.out && Math.floor(now / 140) % 4 !== 0) stampFace(og, 9, 11, ' s-len');
    // Smiley hiding in its spot, drawn in brown with a glow (the "smi" class in style.css) so it stands out.
    // The same class is what input.js listens for when you click it.
    if (G.smiley.active) {
      const [r, c] = G.smiley.spot;
      og[r][c] = { ch: '(', cls: 'smi' };
      og[r][c + 1] = { ch: ':', cls: 'smi' };
    }
    $('officeArt').innerHTML = toHtml(og);
  }

  // ----- buttons -----
  for (const [side, btn, label] of [['L', 'btnL', 'stL'], ['R', 'btnR', 'stR']]) {
    $(btn).classList.toggle('on', G.doors[side]);
    $(btn).setAttribute('aria-pressed', String(G.doors[side]));
    $(btn).disabled = G.powerOut;
    $(label).textContent = G.powerOut ? 'NO POWER' : G.doors[side] ? 'CLOSED' : 'OPEN';
  }
  // The door lights only work while you're looking at the office (camera down).
  for (const [side, btn, label] of [['L', 'btnLightL', 'stLightL'], ['R', 'btnLightR', 'stLightR']]) {
    $(btn).classList.toggle('on', lightOn(side));
    $(btn).disabled = G.powerOut;
    $(label).textContent = G.powerOut ? 'NO POWER' : G.cam ? 'CAM UP' : lightOn(side) ? 'ON' : 'HOLD';
  }
  $('btnCam').classList.toggle('on', G.cam);
  $('btnCam').setAttribute('aria-pressed', String(G.cam));
  $('btnCam').disabled = G.powerOut;
  const boxLow = !G.lenny.out && G.lenny.wind < BOX_LOW;
  $('stCam').textContent = G.powerOut ? 'NO POWER' : (G.cam ? 'UP' : 'DOWN') + (boxLow ? ' · WIND CAM 7!' : '');
  $('stCam').classList.toggle('alert', boxLow && !G.powerOut);
  $('camPrize').classList.toggle('alert', boxLow);
}

// One door of the office as a grid: 12 wide (10 inside the frame) and 16 tall.
// Closed: a wall of # with = bands. Open: empty, with a dotted floor, plus any shape standing there.
// With the door light on, the ■ square shows up too if it's at this door.
function doorGrid(side, now) {
  const W = 10, H = 14;
  const closed = G.doors[side];
  const lines = ['+' + '-'.repeat(W) + '+'];
  for (let r = 0; r < H; r++) {
    let inner;
    if (closed) inner = r % 4 === 3 ? '='.repeat(W) : '#'.repeat(W);   // % is "remainder": every 4th row
    else if (r === H - 2) inner = ' . . . . .';
    else if (r === H - 1) inner = '. . . . . ';
    else inner = ' '.repeat(W);
    lines.push('|' + inner + '|');
  }
  lines.push('+' + '='.repeat(W) + '+');

  const g = grid(lines, W + 2);
  for (let r = 1; r <= H; r++) {
    for (let c = 1; c <= W; c++) {
      if (closed) g[r][c].cls = 'door';
      else if (r >= H - 1) g[r][c].cls = 'dim';
    }
  }

  // The door light shows the ■ square if it's at this door, bigger the closer it is.
  // It shows even through a closed door: doors don't stop the square, so the light has to reveal it.
  const S = G.square;
  if (lightOn(side) && S.side === side && S.stage > 0) {
    const [r0, c0, w, h] = SQUARE_SIZES[S.stage];
    stamp(g, r0, c0, SQUARE, w, h);
  }

  if (!closed) {
    // A visible shape (not the orb) standing in this doorway.
    const visitor = G.mobs.find(m => atDoor(m) && sideOf(m) === side && !m.c.unseen);
    if (visitor && !G.powerOut) stamp(g, 5, 1, visitor.c, W, 5);
    // In the last 3 seconds of a power-out, the shape flickers in the left doorway.
    if (G.powerOut && side === 'L' && G.outTimer < 3 && Math.floor(now / 110) % 3 !== 0) {
      stamp(g, 5, 1, G.outBy.c, W, 5, ' lit');
    }
  }
  return g;
}

// The camera screen: the room picture (or static), any shapes in it, the wind bar on CAM 7,
// and which map button is highlighted.
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
    for (const m of G.mobs) {
      if (atDoor(m) || m.route[m.step] !== room) continue;   // `continue` skips to the next shape
      const [r, c] = SLOTS[room][m.i];
      stamp(g, r, c - 1, m.c, 5, 3);                         // a small 5 x 3 version of the shape
    }
    if (room === 'prize') prizeArt(g, G.lenny);
  }
  $('feed').innerHTML = toHtml(g);

  // The wind bar and button only appear on CAM 7.
  const onBox = room === 'prize';
  $('wind').hidden = !onBox;
  if (onBox) {
    const w = Math.round(G.lenny.wind), seg = Math.round(w / 5);   // 20 bars, one per 5%
    $('windBar').textContent = '[' + '|'.repeat(seg) + '.'.repeat(20 - seg) + '] ' + String(w).padStart(3) + '%';
    $('windBar').classList.toggle('low', w < BOX_LOW);
    $('btnWind').classList.toggle('on', windKey || windPointer);
  }

  for (const b of document.querySelectorAll('#map button')) {
    b.setAttribute('aria-current', String(b.dataset.room === room));
  }
}
