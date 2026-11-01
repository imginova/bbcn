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
    office.classList.toggle('masked', G.mask);   // style.css darkens the view while you wear the mask
    for (const side of ['L', 'R']) {
      $('door' + side).innerHTML = toHtml(doorGrid(side, now));
      $('door' + side).classList.toggle('lit', lightOn(side));   // style.css makes a lit doorway glow
    }
    const og = grid(officeLines(now, G.powerOut, G.cam), 36);
    // Once Lenny is out he flickers on your desk monitor (shown 3 frames out of 4).
    if (G.lenny.out && Math.floor(now / 140) % 4 !== 0) stampFace(og, 9, 11, ' s-len');
    // Ψ Visitor's face in the office, right in front of the monitor.
    if (G.visitor.present) sprite(og, ...VISITOR_OFFICE, SPRITES.vis.office, VISITOR);
    // Ж Crawler in the office. "crw-hit" is the class input.js listens for when you click it.
    if (G.crawler.step === CRAWLER.route.length - 1) {
      sprite(og, ...CRAWLER_OFFICE, SPRITES.crw.office, CRAWLER, ' crw-hit');
    }
    // Smiley hiding in its spot, drawn in brown with a glow (the "smi" class in style.css) so it stands out.
    // The same class is what input.js listens for when you click it; "smi-0" or "smi-1" says WHICH one
    // (there are two with the Twins modifier).
    if (G.smiley.active) {
      G.smiley.spots.forEach(([r, c], i) => {
        og[r][c] = { ch: '(', cls: 'smi smi-' + i };
        og[r][c + 1] = { ch: ':', cls: 'smi smi-' + i };
      });
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
  // The door lights only work while you're looking at the office (camera down) with that door open.
  for (const [side, btn, label] of [['L', 'btnLightL', 'stLightL'], ['R', 'btnLightR', 'stLightR']]) {
    $(btn).classList.toggle('on', lightOn(side));
    $(btn).disabled = G.powerOut;
    $(label).textContent = G.powerOut ? 'NO POWER' : G.cam ? 'CAM UP' : G.doors[side] ? 'DOOR SHUT'
      : lightOn(side) ? 'ON' : 'HOLD';
  }
  // The mask: works whenever the camera is down (it needs no power).
  $('btnMask').classList.toggle('on', G.mask);
  $('btnMask').setAttribute('aria-pressed', String(G.mask));
  $('stMask').textContent = G.mask ? 'ON' : G.cam ? 'CAM UP' : 'OFF';
  $('btnCam').classList.toggle('on', G.cam);
  $('btnCam').setAttribute('aria-pressed', String(G.cam));
  $('btnCam').disabled = G.powerOut;
  // When the box runs low, the Camera button names the camera it's on and that map button flashes.
  const boxLow = !G.lenny.out && G.lenny.wind < BOX_LOW;
  const boxCam = ROOMS[G.lenny.room].cam;
  $('stCam').textContent = G.powerOut ? 'NO POWER' : G.mask ? 'MASK ON'
    : (G.cam ? 'UP' : 'DOWN') + (boxLow ? ` · WIND CAM ${boxCam}!` : '');
  $('stCam').classList.toggle('alert', boxLow && !G.powerOut);
  for (const b of document.querySelectorAll('#map button')) {
    b.classList.toggle('alert', boxLow && b.dataset.room === G.lenny.room);
  }
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
  // (lightOn is false while the door is shut, so you never see it through a closed door.)
  const S = G.square;
  if (lightOn(side) && S.side === side && S.stage > 0) {
    const [r0, c0, w, h] = SQUARE_SIZES[S.stage];
    stamp(g, r0, c0, SQUARE, w, h);
  }
  // The light also shows the ¤ Flicker if it's waiting at this door.
  const F = G.flicker;
  if (lightOn(side) && F.phase > 0 && F.side === side) sprite(g, ...FLICKER_DOOR, SPRITES.flk.door, FLICKER);

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

// The camera screen: the room picture (or static), any shapes in it, the music box and its wind bar
// (on CAM 7, or wherever it wandered), and which map button is highlighted.
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
    // With the Wanderer modifier the box can be on another camera: draw the small version there.
    else if (room === G.lenny.room) miniBox(g, ...BOX_SPOTS[room], G.lenny);
    // Ж Crawler, if it's in this room: its small drawing, which you can click ("crw-hit", see input.js).
    if (CRAWLER.route[G.crawler.step] === room) {
      sprite(g, ...CRAWLER_SLOTS[room], SPRITES.crw.cam, CRAWLER, ' crw-hit');
    }
  }
  $('feed').innerHTML = toHtml(g);

  // The wind bar and button only appear on the camera the music box is on (CAM 7 unless it wandered).
  const onBox = room === G.lenny.room;
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
