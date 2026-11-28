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

// The view's size in pixels, measured once at the start of each redraw (renderGame), for placeOnView.
let viewW = 0, viewH = 0;
// Put something that floats over the view (Bounce pot, Grave weed, Munchie, Ghost Freddy) at x, y: fractions
// of the view, 0 = left/top. It's moved with a CSS transform, not left/top: a transform just slides its
// picture along, while left/top makes the browser lay out the whole page again, which made the game lag
// (on request, 2026-11-27: "the game is a tad laggy").
function placeOnView(el, x, y) { el.style.transform = `translate(${x * viewW}px, ${y * viewH}px)`; }
// The flashlight's circle of light: its radius in pixels (style.css makes .beam twice this wide).
const BEAM_R = 70;

// A bar like [|||||.....] that is `filled` out of `total` long.
const bar = (filled, total) => '[' + '|'.repeat(filled) + '.'.repeat(total - filled) + ']';

// A whole drawing as HTML, on its own (for the things drawn over the view: Bounce pot, Munchie...).
function drawingHtml(lines, cls) {
  const g = blank(Math.max(...lines.map(l => l.length)), lines.length);
  sprite(g, 0, 0, lines, cls);
  return toHtml(g);
}

// Lives as hearts: ♥ for each one left, ♡ for each one lost.
const heartsText = lives => '♥'.repeat(Math.max(0, lives)) + '♡'.repeat(Math.max(0, LIVES - lives));

// The two-letter tags that show who is in each vent on the VENTS tab.
const VENT_TAGS = { tbn: 'TB', tch: 'TC' };

// Draw everything on the game screen: HUD, then either the office or the monitor, then the buttons.
function renderGame(now) {
  viewW = $('viewport').clientWidth;
  viewH = $('viewport').clientHeight;
  // ----- HUD: clock, night and lives, power, heat, usage -----
  $('clock').textContent = clockLabel(G.t);
  if (run) {
    $('nightLab').textContent = 'NIGHT ' + run.night;
    $('hearts').textContent = heartsText(run.lives);
  }
  const p = Math.max(0, Math.ceil(G.power));
  const pw = $('pw');
  pw.textContent = G.powerOut ? 'OUT' : p + '%';
  pw.classList.toggle('low', p <= 20);          // classList.toggle(name, yes/no) adds or removes a CSS class
  $('pwbar').textContent = bar(Math.ceil(p / 10), 10);
  const h = Math.min(100, Math.floor(G.heat));
  $('heat').textContent = h + '%';
  $('heat').classList.toggle('low', h >= HOT_WARN[0]);
  const units = powerUnits();                   // 0 to 5 things using power
  $('usage').textContent = '▮'.repeat(units) + '▯'.repeat(5 - units);
  $('usage').classList.toggle('low', units >= 3);

  // ----- the view: office or monitor -----
  $('office').hidden = G.cam;
  $('cams').hidden = !G.cam;
  $('maskView').hidden = !G.mask || G.cam;   // the mask covers the office view, leaving two eye holes
  if (G.cam) renderMonitor(now);
  else renderOffice(now);

  // The flashlight: a soft circle of light around the pointer (its position comes from input.js).
  const beam = $('beam');
  beam.hidden = !flashOn() || !aim.where;
  beam.style.transform = `translate(${aim.x - BEAM_R}px, ${aim.y - BEAM_R}px)`;   // see placeOnView below
  // Shadow Bonnie's darkness over the office, with a hole where the flashlight shines.
  const dark = $('darkShade');
  dark.hidden = !G.sbn.active || G.powerOut || G.cam;
  dark.style.setProperty('--x', aim.x + 'px');
  dark.style.setProperty('--y', aim.y + 'px');
  dark.style.setProperty('--r', flashOn() && aim.where ? '110px' : '0px');
  // Funtime Freddy's subtitles (only on nights with him).
  const F = G.ffr;
  $('subtitle').hidden = !F.on;
  setHtml($('subtitle'), F.on && G.t < F.subUntil
    ? `<span class="c-ffr">FUNTIME FREDDY:</span> "${escText(F.line)}"` : '&nbsp;');
  // The heat's red glow: nothing below the first warning (70%), then stronger up to full at 95%.
  $('heatGlow').style.opacity = Math.max(0, Math.min(1, (G.heat - HOT_WARN[0]) / (95 - HOT_WARN[0])));
  // The bonus characters that sit on your SCREEN (over the office and the monitor alike): Bounce pot,
  // Munchie and the Plush babies that climbed up. Positions are fractions of the view, so they're
  // placed in percent.
  // Bounce pot and Grave weed bounce the same way, so they're drawn the same way.
  for (const [P, el, id] of [[G.bpt, $('bouncepot'), 'bpt'], [G.grw, $('graveweed'), 'grw']]) {
    el.hidden = !P.on || G.powerOut;
    if (el.hidden) continue;
    // Charging up on the floor: the squeezed spring for the first half, then the full crouch, shaking
    // (the "charging" class) so you see the bounce coming.
    const charging = P.charge > 0;
    const look = !charging ? SPRITES[id].pot : P.charge > P.chargeTime / 2 ? SPRITES[id].squash : SPRITES[id].crouch;
    setHtml(el, drawingHtml(look, 'c-' + id));
    placeOnView(el, P.x, P.y);
    el.classList.toggle('hit', G.t < P.safeUntil);
    el.classList.toggle('charging', charging);
  }
  const mun = $('munchie');
  mun.hidden = !G.mun.active;
  if (G.mun.active) {
    setHtml($('munchieArt'), drawingHtml(SPRITES.mun.grab, 'c-mun'));
    placeOnView(mun, G.mun.x, G.mun.y);
    mun.classList.toggle('blink', G.mun.deadline - G.t < 3);
  }
  // Ghost Freddy drifting across (update 3.0), and the frozen pointer he leaves you with.
  const ghost = $('ghost');
  ghost.hidden = !G.gfr.active || G.powerOut;
  if (!ghost.hidden) {
    setHtml(ghost, drawingHtml(SPRITES.gfr.ghost, 'c-gfr'));
    placeOnView(ghost, G.gfr.x, G.gfr.y);
  }
  $('viewport').classList.toggle('frozen', ghostFrozen());
  for (const [id, n] of [['pbCornerL', 1], ['pbCornerR', 2]]) {
    $(id).hidden = G.pbb.onScreen < n;
    if (!$(id).hidden) setHtml($(id), drawingHtml(SPRITES.pbb.corner, 'c-pbb'));
  }
  // Lolbit's LOL screen, with the letters typed so far lit up.
  const L = G.lol;
  $('lolbit').hidden = !L.active;
  if (L.active) {
    setHtml($('lolFace'), toHtml(grid(SPRITES.lol.face, 17)));
    document.querySelectorAll('#lolKeys button').forEach((b, i) => b.classList.toggle('done', i < L.typed));
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
  // When the music box runs low, a ♪! warning shows on the Camera button (and on CAM 6's map button).
  $('stCam').textContent = off ? 'NO POWER' : G.mask ? 'MASK ON' : G.back ? 'TURNED' : G.cam ? 'UP' : 'DOWN';
  $('camWarn').hidden = !boxLow() || off;
  $('btnFlash').classList.toggle('on', flashOn());
  $('stFlash').textContent = off ? 'NO POWER' : G.noFlash ? 'BB TOOK IT' : flashOn() ? 'ON' : 'HOLD';
  $('btnFlash').disabled = off || G.noFlash;
  // Update 3.0: the Turn button (which way you're facing) and your Fazcoins.
  $('btnTurn').classList.toggle('on', G.back);
  $('btnTurn').setAttribute('aria-pressed', String(G.back));
  $('stTurn').textContent = G.back ? 'BACK' : 'FRONT';
  $('coins').textContent = G.coins;
  $('btnMask').classList.toggle('on', G.mask);
  $('btnMask').setAttribute('aria-pressed', String(G.mask));
  $('stMask').textContent = G.mask ? 'ON' : G.cam ? 'CAM UP' : 'OFF';
  $('btnFan').classList.toggle('on', G.fan);
  $('btnFan').setAttribute('aria-pressed', String(G.fan));
  $('btnFan').disabled = off;
  $('stFan').textContent = off ? 'NO POWER' : G.fan ? 'ON' : 'OFF';
  // The Shock button only shows on nights with Springtrap or Circus Baby.
  $('btnShock').hidden = !shockOn();
  $('btnShock').disabled = off;
  $('stShock').textContent = off ? 'NO POWER' : !camsShowing() ? 'CAMS ONLY' : G.t < G.shockReady ? 'CHARGING' : 'READY';
}

// ---------- the office ----------
// Which rarity color paints each part of the office (OFFICE_PARTS in art.js): the characters in your
// lineup, in the order you took them, each paint the next part. With more characters than parts it goes
// round again, so later picks paint over earlier ones. An empty lineup leaves the office all grey.
function officePaints() {
  const paints = [];
  if (run) charsOf(run.lineup).forEach((c, i) => { paints[i % OFFICE_PARTS.length] = RARITIES[c.rarity].cls; });
  return paints;
}

// The cameras get painted too (on request: "have the colors of your picks extend to the cams"). In pick
// order, each character in your lineup paints one camera's room in its rarity color: the 1st paints
// CAM 1, the 2nd CAM 2, and so on; after CAM 9 it goes round again, so later picks paint over earlier ones.
// Returns { room id: rarity class }, like { stage: 'r-common' }.
function camPaints() {
  const paints = {};
  if (run) charsOf(run.lineup).forEach((c, i) => { paints[CAM_ORDER[i % CAM_ORDER.length]] = RARITIES[c.rarity].cls; });
  return paints;
}

function renderOffice(now) {
  $('office').classList.toggle('dark', G.powerOut);
  $('office').classList.toggle('back', G.back);
  // The doors are at the front, so turned round they're not there at all (on request). visibility (not
  // `hidden`) keeps their space, so the back picture stays where the front one was.
  for (const side of ['L', 'R']) $('door' + side).style.visibility = G.back ? 'hidden' : '';
  if (G.back) { renderBack(now); return; }
  const paints = officePaints();
  for (const side of ['L', 'R']) {
    setHtml($('door' + side), toHtml(doorGrid(side, paints)));
    $('door' + side).classList.toggle('lit', doorLit(side) && !G.doors[side]);   // the doorway glows in the light
  }
  const g = officeGrid(G.fan, now, paints);
  if (!G.powerOut) drawVisitors(g, now);
  setHtml($('officeArt'), toHtml(g));
}

// ---------- the back of the office (update 3.0: turned around) ----------
// The back picture: the windows (with whoever has come up to them), Cookie Freddy's shelf, H.E.L.P.I's
// tablet and maybe Nightmare Helpy on the desk. (The doors aren't shown: see renderOffice.)
function renderBack(now) {
  const g = backGrid();
  if (!G.powerOut) {
    // Only the jars you've already TAKEN for Cookie Freddy light up in his color, like on the old kitchen
    // camera. (For a while the ones he wanted lit up as soon as he came, which gave the answer away: fixed on
    // request.) What he wants is only on the floor, so you have to read it and find the jars yourself.
    const C = G.ckf;
    for (const name of C.got) {
      const [r1, r2, c1, c2] = KITCHEN_JARS[name];
      for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) if (g[r][c].ch !== ' ') g[r][c].cls = 'c-ckf';
    }
    if (C.wants.length) {
      const left = C.wants.filter(n => !C.got.includes(n));
      write(g, 15, 1, `COAT ME IN: ${left.join(' + ')}`.padEnd(42), 'c-ckf order');
    }
    // Dreadbear and Twisted Wolf at a back window. Dark out there: only their eyes show, unless the
    // flashlight is on that window (then all of them, glowing while it's on them).
    for (const [Y, id] of [[G.dbr, 'dbr'], [G.twf, 'twf']]) {
      if (!Y.on || Y.stage !== 3) continue;
      const [r0, c0] = BACK_WINDOWS[Y.side];
      if (backWindowLit(Y.side)) sprite(g, r0, c0, SPRITES[id].window, `c-${id} shone`);
      else for (const [r, c] of [[1, 2], [1, 4]]) g[r0 + r][c0 + c] = { ch: 'o', cls: `c-${id} door-eyes` };
    }
    // H.E.L.P.I's tablet: the sum and what you've typed, blinking red in its last 3 seconds.
    const T = G.hpi;
    const screen = T.on && T.sum !== null ? `${T.sum} = ${T.typed}_` : T.on ? 'H.E.L.P.I' : '';
    write(g, ...TABLET_SCREEN, screen.padEnd(12).slice(0, 12),
      'c-hpi' + (T.sum !== null && T.deadline - G.t < 3 ? ' acc-red blink' : ''));
    // Nightmare Helpy on the back desk, shaking more the more you've hit him.
    const H = G.hlp;
    if (H.present) sprite(g, ...HELPY_SPOT, SPRITES.hlp.office, 'c-hlp' + (H.clicks > HELPY_CLICKS / 2 ? ' wobble' : ''));
  }
  setHtml($('officeArt'), toHtml(g));
}

// Everyone who can be in the office, drawn on top of it (the later ones on top of the earlier ones).
function drawVisitors(g, now) {
  // The Puppet, out of the box, flickering on your monitor's screen.
  if (G.pup.out && Math.floor(now / 140) % 4 !== 0) write(g, SCREEN_SPOT[0], SCREEN_SPOT[1], SPRITES.pup.peek[0], 'c-pup');
  // Nightmare Freddy's Freddles on the desk. They glow while the light is on them, and blink once
  // all three are up (he's coming).
  const N = G.nfr;
  const full = N.freddles.every(Boolean);
  N.freddles.forEach((here, i) => {
    if (here) sprite(g, ...FREDDLE_SPOTS[i], SPRITES.nfr.freddle, 'c-nfr' + (N.shine[i] > 0 ? ' shone' : full ? ' blink' : ''));
  });
  // Chica's cupcakes, wherever they landed.
  for (const [r, c] of G.cups.spots) write(g, r, c, SPRITES.chi.cupcake, 'c-chi cupcake');
  // The vent crawlers who climbed in.
  if (G.tbn.present) sprite(g, ...TBONNIE_SPOT, SPRITES.tbn.office, 'c-tbn');
  if (G.tch.present) sprite(g, ...TCHICA_SPOT,SPRITES.tch.office, 'c-tch');
  if (G.bb.present) sprite(g, ...BB_SPOT, SPRITES.bb.office, 'c-bb');
  // Nightmare BB on the floor in front of the desk: asleep, or awake (blinking until you shine him).
  // He glows while the light is on his face.
  const NB = G.nbb;
  if (NB.on) sprite(g, ...NBB_SPOT, NB.awake ? SPRITES.nbb.awake : SPRITES.nbb.asleep,
    'c-nbb' + (NB.shineT > 0 ? ' shone' : NB.awake ? ' blink' : ''));
  // The caution bot, bottom left, all night. Its sign: ! when all is quiet, an arrow at the door the
  // staff bot is coming to (blinking), or !!! while it waits behind both shut doors.
  const NS = G.nsb;
  if (NS.on) {
    sprite(g, ...NSB_SPOT, SPRITES.nsb.bot, 'c-nsb');
    const sign = NS.phase === 'idle' ? NSB_SIGN.idle : NS.phase === 'wait' ? NSB_SIGN.wait : NSB_SIGN[NS.side];
    write(g, NSB_SPOT[0] + 1, NSB_SPOT[1] + 1, sign, 'c-nsb acc-red' + (NS.phase === 'idle' ? '' : ' blink'));
  }
  // Withered Freddy and Nightmare Fredbear passing the windows.
  for (const [P, drawing, cls] of [[G.wfr, SPRITES.wfr.window, 'c-wfr'], [G.nfb, SPRITES.nfb.window, 'c-nfb']]) {
    if (!P.on || (P === G.nfb && (P.mode !== 'prowl' || P.side))) continue;
    const side = prowlWindow(P);
    if (side) sprite(g, ...WINDOWS[side], drawing, cls);
  }
  // Everyone who walks into the office.
  if (G.wbn.present) sprite(g, ...WBONNIE_SPOT, SPRITES.wbn.office, 'c-wbn');
  if (G.tfr.present) sprite(g, ...TFREDDY_SPOT, SPRITES.tfr.office, 'c-tfr');
  if (G.gol.present) sprite(g, ...GOLDEN_SPOT, SPRITES.gol.office, 'c-gol');
  if (G.nfb.mode === 'toy') sprite(g, ...NFB_OFFICE_SPOT, SPRITES.nfb.office, 'c-nfb');
  // Nightmare Chica, standing in your office the whole time her cupcake is hidden: the sign to go and
  // search the cameras. In her last 5 seconds she blinks.
  if (G.nch.room) sprite(g, ...NCHICA_OFFICE_SPOT, SPRITES.nch.office, 'c-nch' + (G.nch.deadline - G.t < 5 ? ' blink' : ''));
  // Plushtrap and Fredbear's little plush, hiding.
  if (G.plu.spot) sprite(g, ...G.plu.spot, SPRITES.plu.office, 'c-plu');
  if (G.nfb.mode === 'plush') sprite(g, ...G.nfb.spot, SPRITES.nfb.plush, 'c-nfb');
  // Bonnet running across the floor. (Her position is in fractions of a character, so round it.)
  const B = G.bnt;
  if (B.active) sprite(g, Math.round(B.y), Math.round(B.x), SPRITES.bnt.office, 'c-bnt');
  // ----- bonus -----
  // Plush babies in the windows.
  for (const side of ['L', 'R']) {
    const baby = G.pbb.spots['win' + side];
    if (baby) sprite(g, ...WINDOWS[side], SPRITES.pbb.small, 'c-pbb' + plushClass(baby));
  }
  // The Flamethrower endo, and his flames flickering along the floor.
  if (G.fen.present) {
    const f = Math.floor(now / 150) % 2;
    write(g, 14, 0, FLAME_ROWS[0][f], 'flame');
    write(g, 15, 0, FLAME_ROWS[1][f], 'flame hot');
    sprite(g, ...ENDO_SPOT, SPRITES.fen.office, 'c-fen');
  }
  // Cookie Freddy, and what he wants written on the floor in front of him (the ones you've got are gone).
  const C = G.ckf;
  if (C.wants.length) {
    sprite(g, ...COOKIE_SPOT, SPRITES.ckf.office, 'c-ckf');
    const left = C.wants.filter(n => !C.got.includes(n));
    write(g, 15, 1, `COAT ME IN: ${left.join(' + ')}`.padEnd(42), 'c-ckf order');
  }
  // Hand-unit's keypad, in front of the desk. Each key you mash types one more letter of HAND_NAME into
  // his name field; past halfway the keypad shakes and red junk flickers over his screen (he's glitching).
  const H = G.hnd;
  if (H.present) {
    const glitchy = H.presses > HAND_PRESSES / 2;
    const [r, c] = HAND_SPOT;
    sprite(g, r, c, SPRITES.hnd.office, 'c-hnd' + (glitchy ? ' wobble' : ''));
    const typed = HAND_NAME.slice(0, Math.ceil(H.presses / HAND_PRESSES * HAND_NAME.length));
    write(g, r + 2, c + 4, (typed + '_').slice(0, 13), 'c-hnd acc-sky');
    if (glitchy) for (let i = 0; i < 4; i++) write(g, r + 1 + Math.floor(Math.random() * 2), c + 2 + Math.floor(Math.random() * 14), pick('#%@&?!'), 'c-hnd acc-red');
  }
  // Shadow Bonnie's white eyes, hidden in the dark (see #darkShade). They glow while the light is on them.
  const S = G.sbn;
  if (S.active) write(g, S.eyes[0], S.eyes[1], SPRITES.sbn.eyes, 'c-sbn acc-white' + (S.shineT > 0 ? ' shone' : ''));
}

// One door of the office as a grid: 12 wide (10 inside the frame) and 16 tall.
// Shut: a steel shutter. Open: a dark doorway with a dotted floor, plus whoever is standing there.
// Its frame takes the color your lineup painted it (`paints`, see officePaints above).
function doorGrid(side, paints = []) {
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
  // The frame: every cell on the edge of the grid.
  const paint = paints[OFFICE_PARTS.findIndex(p => p.door === side)];
  if (paint) {
    g.forEach((row, r) => row.forEach((cell, c) => {
      if (r === 0 || r === g.length - 1 || c === 0 || c === W + 1) cell.cls = paint + ' paint';
    }));
  }
  if (shut || G.powerOut) return g;
  // Bonnie in the left doorway, Chica in the right one.
  if (side === 'L' && G.bon.on && atDoor(G.bon, BONNIE)) inDoorway(g, side, 4, 1, SPRITES.bon.door, 'c-bon');
  if (side === 'R' && G.chi.on && atDoor(G.chi, CHICA)) inDoorway(g, side, 5, 1, SPRITES.chi.door, 'c-chi');
  // Withered Freddy trying to get in, and Nightmare Fredbear prowling up to a door.
  if (G.wfr.on && G.wfr.trying && G.wfr.side === side) inDoorway(g, side, 5, 2, SPRITES.wfr.door, 'c-wfr');
  if (G.nfb.mode === 'prowl' && G.nfb.side === side) inDoorway(g, side, 5, 2, SPRITES.nfb.door, 'c-nfb' + (G.nfb.flashT > 0 ? ' shone' : ''));
  // Nightmare Bonnie in either doorway. He glows while the light is on him.
  if (G.nbn.side === side) inDoorway(g, side, 4, 2, SPRITES.nbn.door, 'c-nbn' + (G.nbn.flashT > 0 ? ' shone' : ''));
  // Withered Foxy in the left doorway (all of him: he's right there), glowing while the light is on him.
  if (side === 'L' && G.wfx.on && wfoxyInDoorway()) sprite(g, 5, 2, SPRITES.wfx.door, 'c-wfx' + (G.wfx.flashT > 0 && G.wfx.phase === 'open' ? ' shone' : ''));
  // Watermelon Chica in her doorway.
  if (G.wmc.side === side) inDoorway(g, side, 5, 1, SPRITES.wmc.door, 'c-wmc');
  // A plush baby sitting on the floor of the doorway. It glows while the light is on it, and blinks
  // when it's about to climb onto your screen.
  const baby = G.pbb.spots['door' + side];
  if (baby) sprite(g, 11, 3, SPRITES.pbb.small, 'c-pbb' + plushClass(baby));
  return g;
}

// The extra class for a plush baby: glowing in the light, or blinking in its last 3 seconds.
const plushClass = B => B.shineT > 0 ? ' shone' : G.t - B.since > PB_NEGLECT - 3 ? ' blink' : '';

// Someone standing in a doorway. The doorway is dark, so only their glowing eyes show, unless the
// flashlight is shining into it: then you see all of them.
function inDoorway(g, side, row, col, drawing, cls) {
  if (doorLit(side)) { sprite(g, row, col, drawing, cls); return; }
  for (const [r, c] of drawing.eyes.at) g[row + r][col + c] = { ch: 'o', cls: ACCENT[drawing.eyes.color] + ' door-eyes' };
}

// ---------- the monitor ----------
// The tab bar (only when there's something in the vents tonight), then the camera or the vent map.
function renderMonitor(now) {
  // The tabs: CAMS and SHOP every night, VENTS only with something in the vents.
  for (const b of document.querySelectorAll('#tabs button')) {
    b.setAttribute('aria-current', String(b.dataset.tab === G.tab));
    if (b.dataset.tab === 'vents') b.hidden = !ventsOn();
  }
  $('camPane').hidden = G.tab !== 'cams';
  $('ventPane').hidden = G.tab !== 'vents';
  $('shopPane').hidden = G.tab !== 'shop';
  if (G.tab === 'cams') renderFeed(now);
  else if (G.tab === 'vents') renderVents();
  else renderShop();
}

// ---------- the SHOP tab (update 3.0) ----------
// The shopkeeper, your coins, and a button for each item: price, how many are left tonight, and whether
// you can afford it. The death coin opens a list of tonight's characters to use it on.
function renderShop() {
  setHtml($('shopKeeper'), drawingHtml(SHOPKEEPER, 'c-nsb'));
  $('shopCoins').innerHTML = `You have <b>${G.coins}</b> Fazcoin${G.coins === 1 ? '' : 's'}` +
    (G.fch.on ? ' · <span class="c-fch">Funtime Chica put the prices up!</span>' : '');
  const keys = Object.keys(SHOP).filter(k => k !== 'guitar' || (G.rsb.on && !G.rsb.bought));
  setHtml($('shopItems'), keys.map(k => {
    const item = SHOP[k], left = G.stock[k], ok = canBuy(k) || (k === 'death' && G.picking);
    return `<button type="button" class="shop-item${ok ? '' : ' cant'}${k === 'death' && G.picking ? ' on' : ''}" data-item="${k}">` +
      `<b>${item.name}</b><span class="price">${priceOf(k)} coins · ${left} left</span><small>${item.desc}</small></button>`;
  }).join(''));
  $('shopPick').hidden = !G.picking;
  if (G.picking) setHtml($('shopPick'), '<p class="lab">Use the death coin on:</p>' +
    coinTargets().map(c => `<button type="button" class="${RARITIES[c.rarity].cls}" data-target="${c.id}">${c.name}</button>`).join(''));
}

// The camera screen: the room picture (or static), whoever is in it, the music box and its wind
// bar (on CAM 6), and the map with its warnings.
function renderFeed(now) {
  const room = G.camRoom;
  $('feedName').textContent = `CAM ${ROOMS[room].cam} · ${ROOMS[room].name}`;
  let g;
  const ySide = yardSide(room);
  if (ySide && now >= G.staticUntil) {
    // A yard (update 3.0): dark unless its own light is on. With the light on you see who's out there:
    // Dreadbear and Twisted Wolf by how far across they are (Wolf only faintly, even in the light), and
    // Twisted Foxy's mound (not while he's digging).
    const lit = yardLit(ySide);
    g = yardGrid(ySide, lit);
    if (lit) {
      for (const [Y, id] of [[G.dbr, 'dbr'], [G.twf, 'twf']]) {
        if (Y.on && Y.side === ySide && Y.stage < 3) sprite(g, ...YARD_SLOTS[Y.stage], SPRITES[id].yard[Y.stage], `c-${id}` + (id === 'twf' ? ' faint' : ''));
      }
      if (G.tfx.on && G.tfx.phase === 'mound' && G.tfx.side === ySide) sprite(g, ...MOUND_SPOTS[ySide], SPRITES.tfx.mound, 'c-tfx');
    }
  } else if (now < G.staticUntil) {
    // Static: random characters.
    const chars = ' .:;*#%';
    g = Array.from({ length: 11 }, () =>
      Array.from({ length: 40 }, () => ({ ch: chars[Math.floor(Math.random() * chars.length)], cls: 'dim' })));
  } else {
    g = grid(frame(ROOM_ART[room], 38), 40);
    paintRoom(g, camPaints()[room]);   // the room in the color your lineup painted it (if any)
    // Freddy, Bonnie and Chica, if they're in this room (when they're on tonight).
    if (G.fre.on && freddyRoom() === room) sprite(g, ...FREDDY_SLOTS[room], SPRITES.fre.cam, 'c-fre');
    const B = G.bon, C = G.chi;
    if (B.on && !atDoor(B, BONNIE) && BONNIE.route[B.step] === room) sprite(g, ...BONNIE_SLOTS[room], SPRITES.bon.cam, 'c-bon');
    if (C.on && !atDoor(C, CHICA) && CHICA.route[C.step] === room) sprite(g, ...CHICA_SLOTS[room], SPRITES.chi.cam, 'c-chi');
    // Springtrap and Circus Baby, on their way to your office.
    if (G.spr.on && SPRING.route[G.spr.step] === room) sprite(g, ...SPRING_SLOTS[room], SPRITES.spr.cam, 'c-spr');
    if (G.bab.on && BABY.route[G.bab.step] === room) sprite(g, ...BABY_SLOTS[room], SPRITES.bab.cam, 'c-bab');
    // Funtime Freddy on his side of the auditorium (only while he isn't off to a door).
    if (room === 'audit' && G.ffr.on && G.ffr.phase === 'idle') sprite(g, ...FFR_SLOTS[G.ffr.home], SPRITES.ffr.cam, 'c-ffr');
    // Funtime Foxy's sign on the show stage: the time of the next show.
    if (room === 'stage' && G.ffx.on) {
      const late = G.t >= G.ffx.show;
      const text = G.ffx.show >= NIGHT_END ? '  NO MORE SHOWS  ' : ` SHOWTIME ${clockLabel(G.ffx.show)} `;
      write(g, 1, 20 - Math.ceil(text.length / 2), text, 'showsign' + (late ? ' blink' : ''));
    }
    // Foxy: peeking out of Pirate Cove, half out, gone, or running down the West Hall.
    // While the light is on the cove he glows ("shone").
    const X = G.fox;
    if (room === 'cove' && X.on) {
      const lit = foxyLit() ? ' shone' : '';
      if (X.phase === 'run') write(g, 6, 13, '    (empty)     ', 'dim');
      else if (X.stage === 1) sprite(g, 5, 18, SPRITES.fox.peek, 'c-fox' + lit);
      else if (X.stage === 2) sprite(g, 4, 16, SPRITES.fox.half, 'c-fox' + lit);
    }
    if (room === 'whall' && X.on && X.phase === 'run') sprite(g, 6, 4 + Math.floor((FOXY_RUN - X.runT) / FOXY_RUN * 26), SPRITES.fox.run, 'c-fox');
    // Withered Foxy running down the West Hall too.
    if (room === 'whall' && G.wfx.on && G.wfx.phase === 'run') sprite(g, 6, 4 + Math.floor((WFX_RUN - G.wfx.runT) / WFX_RUN * 26), SPRITES.wfx.run, 'c-wfx');
    // Nightmare Chica's hidden cupcake: small and dim on purpose.
    if (G.nch.room === room) write(g, ...G.nch.spot, SPRITES.nch.cupcake, 'c-nch hidden-cup');
    // The Puppet's box on CAM 6: closed, or open with the Puppet looking out.
    if (room === 'prize' && G.pup.on) {
      if (G.pup.out) write(g, 7, 17, SPRITES.pup.peek[0], 'c-pup');
      else if (G.pup.wind < BOX_LOW) write(g, 7, 18, '(_LOW!_)', 'c-pup blink');
      else write(g, 7, 18, '(______)', 'dim');
    }
    // One of Trash and the Gang, standing right in front of this camera and hiding most of it. Drawn
    // last, so they cover whoever is behind them.
    // They're right up against the lens, so everything behind them (most of the room) is blacked out.
    if (G.trs.room === room) {
      for (let r = 1; r <= 9; r++) write(g, r, 4, ' '.repeat(32));
      sprite(g, ...TRASH_SPOT, SPRITES.trs[G.trs.member], 'c-trs');
    }
  }
  if (now >= G.staticUntil) {
    // The yards get Nightmare Chica's cupcake and Trash and the Gang too (the rooms inside draw theirs above).
    if (ySide && G.nch.room === room) write(g, ...G.nch.spot, SPRITES.nch.cupcake, 'c-nch hidden-cup');
    if (ySide && G.trs.room === room) {
      for (let r = 1; r <= 9; r++) write(g, r, 4, ' '.repeat(32));
      sprite(g, ...TRASH_SPOT, SPRITES.trs[G.trs.member], 'c-trs');
    }
    // A Fazcoin lying on this camera (update 3.0): click it.
    if (G.coin.room === room) write(g, ...G.coin.spot, COIN_ART, 'coin');
  }
  // Salvage sign, in front of the picture (even over static), while it needs more presses.
  if (G.slv.presses > 0) {
    sprite(g, ...SALVAGE_SPOT, SPRITES.slv.sign, 'c-slv');
    write(g, SALVAGE_SPOT[0] + 7, SALVAGE_SPOT[1] + 3, `press SHOCK x${G.slv.presses}`, 'c-slv blink');   // on the plaque
  }
  setHtml($('feed'), toHtml(g));
  // The shock's flash over the picture, for a moment after each zap.
  $('feed').classList.toggle('zap', now < G.zapUntil);

  // The wind bar and button only appear on CAM 6, on nights with the Puppet.
  const onBox = room === 'prize' && G.pup.on;
  $('wind').hidden = !onBox;
  if (onBox) {
    const w = Math.round(G.pup.wind);
    $('windBar').textContent = bar(Math.round(w / 5), 20) + ' ' + String(w).padStart(3) + '%';
    $('windBar').classList.toggle('low', w < BOX_LOW);
  }
  // The map: highlight the camera you're on, and show ♪! on CAM 6 when the music box is low.
  for (const b of document.querySelectorAll('#map button')) {
    b.setAttribute('aria-current', String(b.dataset.room === room));
    const warn = b.querySelector('.mw');
    const box = b.dataset.room === 'prize' && boxLow();
    warn.textContent = box ? ' ♪!' : '';
    warn.className = 'mw' + (box ? ' warn' : '');
  }
}

// The VENTS tab: 15 vent buttons in 3 rows of 5, with who's in each and the lure that's playing.
function renderVents() {
  let html = '';
  for (const n of VENT_LIST) {
    const tags = CRAWLERS
      .filter(c => c !== BB && G[c.id].on && !G[c.id].present && G[c.id].room === n)   // BB never shows here
      .map(c => `<b class="c-${c.id}">${VENT_TAGS[c.id]}</b>`);
    const lured = G.lure && G.lure.room === n;
    const picked = G.ventSel === n ? ' picked' : '';   // the arrow keys' choice
    html += `<button type="button" class="vent${lured ? ' lured' : ''}${picked}" data-vent="${n}" style="grid-area:v${n}">` +
      `<span class="vn">V${n}</span><span class="occ">${tags.join(' ') || '&nbsp;'}</span>` +
      `<span class="mark">${lured ? '~ lure ~' : '&nbsp;'}</span></button>`;
  }
  html += '<span class="vent-office" style="grid-area:you">YOUR<br>OFFICE</span>';
  setHtml($('ventMap'), html);
  $('ventNote').textContent = G.t < G.lureReady
    ? 'Lure recharging...'
    : 'Click a vent (or pick one with the arrow keys and press Enter) to play an audio lure there.';
}
