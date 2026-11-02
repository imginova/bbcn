/* =====================================================================
   render.js: DRAWS the night onto the screen.

   These functions only read the game state (G) and update the page;
   they never change the rules. main.js calls renderGame() about 15
   times a second, and right away whenever `dirty` is true.
   ===================================================================== */

// Draw everything on the game screen: HUD, then either the office or the camera, then the buttons.
function renderGame(now) {
  // ----- HUD: clock, power, usage -----
  // Tasks mode has no 6 AM to reach, so the clock shows how many tasks are done instead.
  $('clock').textContent = G.mode === 'tasks'
    ? `TASKS ${G.tasks.filter(T => T.done >= T.need).length}/${G.tasks.length}` : hourLabel(hourOf(G.t));

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
  $('maskView').hidden = !G.mask || G.cam;   // the mask covers the office view, leaving two eye holes
  if (G.cam) {
    renderMonitor(now);
  } else {
    office.classList.toggle('dark', !powered());   // after a power-out, or at 0% in Generator mode
    for (const side of ['L', 'R']) {
      $('door' + side).innerHTML = toHtml(doorGrid(side, now));
      $('door' + side).classList.toggle('lit', lightOn(side));   // style.css makes a lit doorway glow
    }
    const og = grid(officeLines(now, !powered(), G.cam), 36);
    // Once Lenny is out he flickers on your desk monitor (shown 3 frames out of 4).
    if (G.lenny.out && Math.floor(now / 140) % 4 !== 0) stampFace(og, 9, 11, ' s-len');
    // Ψ Visitor's face in the office, right in front of the monitor.
    if (G.visitor.present) sprite(og, ...VISITOR_OFFICE, SPRITES.vis.office, VISITOR);
    // ¥ Peeker's half-face, peeking in at the left edge.
    if (G.peeker.present) sprite(og, ...PEEKER_OFFICE, SPRITES.pek.office, PEEKER);
    // Ж Crawler in the office. "crw-hit" is the class input.js listens for when you click it.
    if (G.crawler.step === G.crawler.route.length - 1) {
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
  // `off` = no power right now; `busy` = holding the generator (Generator mode), so nothing else works.
  const off = !powered(), busy = G.genHeld;
  const why = off ? 'NO POWER' : busy ? 'CHARGING' : null;   // why a button can't be used, if it can't
  for (const [side, btn, label] of [['L', 'btnL', 'stL'], ['R', 'btnR', 'stR']]) {
    $(btn).classList.toggle('on', G.doors[side]);
    $(btn).setAttribute('aria-pressed', String(G.doors[side]));
    $(btn).disabled = off;
    $(label).textContent = why || (G.doors[side] ? 'CLOSED' : 'OPEN');
  }
  // The door lights only work while you're looking at the office (camera down) with that door open.
  for (const [side, btn, label] of [['L', 'btnLightL', 'stLightL'], ['R', 'btnLightR', 'stLightR']]) {
    $(btn).classList.toggle('on', lightOn(side));
    $(btn).disabled = off;
    $(label).textContent = why || (G.cam ? 'CAM UP' : G.doors[side] ? 'DOOR SHUT' : lightOn(side) ? 'ON' : 'HOLD');
  }
  // The mask: works whenever the camera is down (it needs no power).
  $('btnMask').classList.toggle('on', G.mask);
  $('btnMask').setAttribute('aria-pressed', String(G.mask));
  $('stMask').textContent = busy ? 'CHARGING' : G.mask ? 'ON' : G.cam ? 'CAM UP' : 'OFF';
  $('btnCam').classList.toggle('on', G.cam);
  $('btnCam').setAttribute('aria-pressed', String(G.cam));
  $('btnCam').disabled = off;
  // When the box runs low, the Camera button warns you, but on purpose it doesn't say WHICH camera
  // the box is on: with the Wanderer modifier you have to remember or find it yourself.
  const boxLow = !G.lenny.out && G.lenny.wind < BOX_LOW;
  $('stCam').textContent = why || (G.mask ? 'MASK ON'
    : (G.cam ? 'UP' : 'DOWN') + (boxLow ? ' · WIND THE BOX!' : ''));
  $('stCam').classList.toggle('alert', boxLow && !G.powerOut);
  // Generator mode: the wide Generator button.
  $('btnGen').hidden = G.mode !== 'generator';
  $('btnGen').classList.toggle('on', busy);
  $('stGen').textContent = busy ? `CHARGING · ${Math.floor(G.power)}%` : G.power <= 0 ? 'EMPTY! HOLD TO CHARGE' : 'HOLD TO CHARGE';
  $('stGen').classList.toggle('alert', !busy && G.power <= 0);
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

// The raised monitor: its tab bar (hidden when the cameras are its only system), then the tab
// you're on. The VENTS tab button only shows when a vent crawler is switched on.
function renderMonitor(now) {
  $('tabVents').hidden = !ventsOn();
  $('tabTasks').hidden = G.mode !== 'tasks';
  $('tabs').hidden = !ventsOn() && G.mode !== 'tasks';
  for (const b of document.querySelectorAll('#tabs button')) b.setAttribute('aria-current', String(b.dataset.tab === G.tab));
  $('camPane').hidden = G.tab !== 'cams';
  $('ventPane').hidden = G.tab !== 'vents';
  $('taskPane').hidden = G.tab !== 'tasks';
  if (G.tab === 'vents') renderVents();
  else if (G.tab === 'tasks') renderTasks();
  else renderFeed(now);
  renderAds();
}

// Tasks mode: the TASKS tab. One button per task with a progress bar; the one you're on is outlined.
function renderTasks() {
  const doneCount = G.tasks.filter(T => T.done >= T.need).length;
  $('taskCount').textContent = `${doneCount}/${G.tasks.length} DONE`;
  $('taskList').innerHTML = G.tasks.map((T, i) => {
    const seg = Math.round(T.done / T.need * 10);
    const state = T.done >= T.need ? 'done' : G.task === i ? 'doing' : '';
    return `<button type="button" class="${state}" data-task="${i}"><span>${i + 1}. ${T.name}</span>`
      + `<span class="bars">${T.done >= T.need ? 'DONE ✓' : '[' + '|'.repeat(seg) + '.'.repeat(10 - seg) + ']'}</span></button>`;
  }).join('');
}

// © Spammer's ads on top of the monitor. They're only rebuilt when they change (adsVersion),
// not 15 times a second, so clicking an ad's [X] always lands on the real button.
let drawnAds = -1, drawnAdsNight = null;
function renderAds() {
  if (drawnAdsNight === G && drawnAds === G.adsVersion) return;
  drawnAdsNight = G;
  drawnAds = G.adsVersion;
  $('ads').innerHTML = G.ads.map(ad => `
    <div class="ad" style="left:${ad.x}%;top:${ad.y}%">
      <button type="button" class="ad-x ${ad.corner}" data-ad="${ad.id}" aria-label="Close ad">[X]</button>
      <b>${symHtml(SPAMMER)} ${ad.text}</b>
    </div>`).join('');
}

// The VENTS tab: the vent map with the crawlers that are switched on, the room you just lured,
// and whether the next lure is ready.
function renderVents() {
  const crawlers = [[G.echo, ECHO], [G.slink, SLINK]].filter(([V]) => V.level > 0).map(([V, c]) => ({ c, room: V.room }));
  $('ventMap').innerHTML = toHtml(ventGrid(crawlers, G.t < G.lureUntil ? G.lureRoom : null));
  const wait = G.lureReadyAt - G.t;
  $('lureState').textContent = wait > 0 ? `LURE ${wait.toFixed(1)}s` : 'LURE READY';
  $('lureState').classList.toggle('dim', wait > 0);
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
    if (G.crawler.route[G.crawler.step] === room) {
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
