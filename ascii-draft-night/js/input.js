/* =====================================================================
   input.js: mouse and keyboard CONTROLS.

   Nothing here decides what happens in the game. It only listens for
   clicks, key presses and mouse movement, and calls the right function
   from game.js, run.js or screens.js.

   addEventListener('click', fn) means "whenever this is clicked, run fn".
   ===================================================================== */

// ---------- buttons ----------
// onClick(id, fn): run fn when the button with that id is clicked.
// The blur() at the end takes keyboard focus off a button you CLICKED, so pressing
// Space afterwards raises the monitor instead of clicking that button again.
// (e.detail counts mouse clicks; it is 0 when the "click" came from the keyboard.)
const onClick = (id, fn) => $(id).addEventListener('click', e => {
  sfx.init();
  fn(e);
  if (e.detail) e.currentTarget.blur();
});

onClick('btnMute', toggleMute);
onClick('btnContinue', continueRun);
onClick('btnNewRun', pressNewRun);
onClick('btnHowTitle', openHowto);
onClick('btnEmblems', () => show('emblems'));
onClick('btnEmblemsBack', () => show('title'));
onClick('btnCustom', () => show('custom'));
onClick('btnCustomStart', startCustom);
onClick('btnCustomAll', () => customAll(true));
onClick('btnCustomNone', () => customAll(false));
onClick('btnCustomBack', () => show('title'));
onClick('btnCustomWin', () => show('custom'));
onClick('btnCustomLose', () => { hideScare(); show('custom'); });
onClick('btnHowPick', openHowto);
onClick('btnHowPause', openHowto);
onClick('btnHowClose', closeHowto);
onClick('btnBegin', beginNight);
onClick('btnTitle', () => show('title'));
onClick('btnL', () => toggleDoor('L'));
onClick('btnR', () => toggleDoor('R'));
onClick('btnCam', toggleCam);
onClick('btnMask', toggleMask);
onClick('btnTurn', toggleTurn);
onClick('btnFan', toggleFan);
onClick('btnShock', shock);
onClick('btnWind', windBox);
onClick('btnResume', () => setPaused(false));
onClick('btnQuit', quitNight);
onClick('btnNext', showPick);
onClick('btnNewRunWin', newRun);
onClick('btnTitleWin', () => show('title'));
onClick('btnRetry', startNight);
onClick('btnNewRunLose', () => { hideScare(); newRun(); });
onClick('btnTitleLose', () => { hideScare(); show('title'); });

// "Continue run": back to the pick screen if the cards are still to be picked, or straight into the
// night if they were (the night starts again from 12 AM).
function continueRun() {
  if (!run) return;
  if (run.offer.length) showPick();
  else startNight();
}

// Clicking the doors themselves works too.
$('doorL').addEventListener('click', () => toggleDoor('L'));
$('doorR').addEventListener('click', () => toggleDoor('R'));

// One listener for the whole camera map. closest() finds which camera button was clicked;
// its data-room="..." attribute (in index.html) says which room it is.
$('map').addEventListener('click', e => {
  const b = e.target.closest('button[data-room]');
  if (!b) return;
  setCam(b.dataset.room);
  if (e.detail) b.blur();
});

// The CAMS / VENTS tabs at the top of the monitor.
$('tabs').addEventListener('click', e => {
  const b = e.target.closest('button[data-tab]');
  if (!b) return;
  setTab(b.dataset.tab);
  if (e.detail) b.blur();
});

// The vent map. The vent buttons are redrawn whenever someone moves, so we react the moment the
// button goes DOWN (a "click" only counts if it goes down and up on the same element).
$('ventMap').addEventListener('pointerdown', e => {
  const b = e.target.closest('[data-vent]');
  if (!b || e.button !== 0) return;
  sfx.init();
  playLure(Number(b.dataset.vent));
  e.preventDefault();
});

// The SHOP tab (update 3.0): the item buttons (data-item says which), and the death coin's list of who
// to use it on (data-target). Redrawn often, so like the vents we react on the press.
$('shopItems').addEventListener('pointerdown', e => {
  const b = e.target.closest('[data-item]');
  if (!b || e.button !== 0) return;
  sfx.init();
  buy(b.dataset.item);
  e.preventDefault();
});
$('shopPick').addEventListener('pointerdown', e => {
  const b = e.target.closest('[data-target]');
  if (!b || e.button !== 0) return;
  sfx.init();
  useDeathCoin(b.dataset.target);
  e.preventDefault();
});

// Lolbit's letter buttons (for phones, where there's no keyboard).
$('lolKeys').addEventListener('pointerdown', e => {
  const b = e.target.closest('[data-letter]');
  if (!b) return;
  sfx.init();
  typeLol(b.dataset.letter);
  e.preventDefault();
});

// ---------- the pick screen ----------
// Clicking a card takes it or puts it back. data-id="fre" says which character it is.
// The difficulty buttons on the title screen (data-diff says which one).
$('diffs').addEventListener('click', e => {
  const b = e.target.closest('[data-diff]');
  if (!b) return;
  sfx.init();
  setDifficulty(b.dataset.diff);
});

$('offer').addEventListener('click', e => {
  const b = e.target.closest('[data-id]');
  if (!b) return;
  sfx.init();
  togglePick(b.dataset.id);
  if (e.detail) b.blur();
});
// Pointing at a card (on the offer or in the lineup) shows how that character works in the info box.
// "pointerover" fires each time the pointer moves onto a new element.
for (const id of ['offer', 'lineup']) {
  $(id).addEventListener('pointerover', e => {
    const card = e.target.closest('[data-id]');
    const who = card ? card.dataset.id : null;
    if (who !== hoverCard) { hoverCard = who; renderWho(); }
  });
  $(id).addEventListener('pointerleave', () => { hoverCard = null; renderWho(); });
}
// The same on the emblem screen's cards.
$('emblemGroups').addEventListener('pointerover', e => {
  const card = e.target.closest('[data-id]');
  const who = card ? card.dataset.id : null;
  if (who !== hoverEmblem) { hoverEmblem = who; renderEmblems(); }
});
$('emblemGroups').addEventListener('pointerleave', () => { hoverEmblem = null; renderEmblems(); });
// The custom night menu: clicking a character switches it on or off; pointing at one shows how it works.
$('customGroups').addEventListener('click', e => {
  const card = e.target.closest('[data-id]');
  if (!card) return;
  sfx.init();
  toggleCustom(card.dataset.id);
});
$('customGroups').addEventListener('pointerover', e => {
  const card = e.target.closest('[data-id]');
  const who = card ? card.dataset.id : null;
  if (who !== hoverCustom) { hoverCustom = who; renderCustom(); }
});
$('customGroups').addEventListener('pointerleave', () => { hoverCustom = null; renderCustom(); });
// The night length slider on the title screen ("input" fires while it's being dragged).
$('nightLen').addEventListener('input', e => { sfx.init(); setNightLength(Number(e.target.value)); });
// The same on the pause panel's cards.
$('pauseRoster').addEventListener('pointerover', e => {
  const card = e.target.closest('[data-id]');
  if (card) $('pauseInfo').innerHTML = whoHtml(byId(card.dataset.id));
});

// Clicking the dark area around the How to play panel closes it.
$('howto').addEventListener('click', e => { if (e.target.id === 'howto') closeHowto(); });

// ---------- aiming the flashlight (and clicking things in the office) ----------
// Whenever the pointer moves over the view, work out what it's pointing at: the office picture, the
// camera picture or a doorway, and which row and column of characters in it.
// getBoundingClientRect() gives an element's position and size on the screen in pixels.
const view = $('viewport');
const AIM_AREAS = [['office', 'officeArt', OFFICE_W, OFFICE_H], ['feed', 'feed', 40, 11],   // [name, element id, columns, rows]
  ['doorL', 'doorL', 12, 16], ['doorR', 'doorR', 12, 16]];                               // the doorways (doorLit in game.js)
function updateAim(e) {
  // Ghost Freddy froze your pointer (update 3.0): the aim stays where it was until it thaws.
  if (currentScreen === 'game' && ghostFrozen()) return;
  const box = view.getBoundingClientRect();
  aim.x = e.clientX - box.left;
  aim.y = e.clientY - box.top;
  // The same as fractions of the view (0 = left/top, 1 = right/bottom), for Bounce pot.
  aim.fx = aim.x / box.width;
  aim.fy = aim.y / box.height;
  aim.where = null;
  for (const [where, id, cols, rows] of AIM_AREAS) {
    const r = $(id).getBoundingClientRect();
    if (!r.width) continue;   // a hidden picture has no size
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) continue;
    aim.where = where;
    // How far across and down the picture the pointer is (0 to 1), times its size in characters.
    // The - 0.5 makes "column 3" mean the middle of the 4th character, like the cells it's compared with.
    aim.c = (e.clientX - r.left) / r.width * cols - 0.5;
    aim.r = (e.clientY - r.top) / r.height * rows - 0.5;
  }
  // The light still shows over the rest of the view (the map, the buttons), it just doesn't hit anything.
  if (!aim.where && e.clientX >= box.left && e.clientX <= box.right) aim.where = 'view';
}
view.addEventListener('pointermove', updateAim);
view.addEventListener('pointerleave', () => { aim.where = null; });

// A press over the view: work out where it is first (on a phone there's no "move" before a tap), then
// if it's the main button over the office picture, see whether it hit Bonnet's nose or one of Chica's
// cupcakes; over the camera picture, Nightmare Chica's hidden cupcake. We use the moment the button
// goes DOWN, because the pictures are redrawn many times a second.
view.addEventListener('pointerdown', e => {
  updateAim(e);
  if (e.button !== 0) return;
  if (currentScreen === 'game' && ghostFrozen()) return;   // a frozen pointer can't click anything
  sfx.init();
  if (aim.where === 'office') clickOffice(aim.r, aim.c);
  else if (aim.where === 'feed') clickFeed(aim.r, aim.c);
});

// The flashlight shines while the RIGHT mouse button is held down over the view (or F, or the
// Flashlight button). We use mousedown/mouseup here, not pointer events: a second mouse button pressed
// while one is already down doesn't send a new "pointerdown", and you need the left button free for
// clicking cupcakes while the light is on.
view.addEventListener('mousedown', e => { if (e.button === 2) { sfx.init(); flashMouse = true; e.preventDefault(); } });
window.addEventListener('mouseup', e => { if (e.button === 2) flashMouse = false; });
view.addEventListener('contextmenu', e => e.preventDefault());   // no right-click menu over the game

// The Flashlight button shines only while it is HELD. "pointer" events cover mouse, touch and pen alike.
const btnFlash = $('btnFlash');
btnFlash.addEventListener('pointerdown', e => {
  sfx.init();
  flashButton = true;
  btnFlash.setPointerCapture?.(e.pointerId);   // keep getting events even if the pointer slides off
  e.preventDefault();
});
for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) btnFlash.addEventListener(ev, () => { flashButton = false; });
btnFlash.addEventListener('contextmenu', e => e.preventDefault());

// ---------- keyboard ----------
// One listener for every key press. What a key does depends on which screen is showing.
// e.key is the key's name: 'a', 'Enter', ' ' (Space), 'ArrowUp', ...
// e.preventDefault() stops the browser's own reaction (like Space scrolling the page).
document.addEventListener('keydown', e => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;   // leave shortcuts like Ctrl+R alone
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;   // 'A' and 'a' do the same thing
  // Let a focused button handle its own Space/Enter.
  if ((k === ' ' || k === 'Enter') && e.target instanceof HTMLButtonElement) return;
  sfx.init();

  // Lolbit's LOL screen is up: L and O type into it (and do nothing else). Checked before M, so
  // nothing else gets in the way of typing.
  if (currentScreen === 'game' && G && G.lol.active && !G.paused && (k === 'l' || k === 'o')) { typeLol(k); return; }
  if (k === 'm') { toggleMute(); return; }

  // The How to play panel is open: only Esc / Enter (close it) do anything.
  if (!$('howto').hidden) {
    if (k === 'Escape' || k === 'Enter') { e.preventDefault(); closeHowto(); }
    return;
  }

  // Game over is showing (but not during the jumpscare itself).
  if (!$('scare').hidden) {
    if ($('scareMsg').hidden) return;
    if (k === 'Enter') { e.preventDefault(); $(run ? 'btnRetry' : 'btnNewRunLose').click(); }
    else if (k === 'Escape') { hideScare(); show('title'); }
    return;
  }

  if (currentScreen === 'title') {
    if (k === 'Enter') { e.preventDefault(); run ? continueRun() : newRun(); }
    else if (k === 'n') pressNewRun();
    else if (k === 'h') openHowto();
    else if (k === 'e') show('emblems');
    else if (k === 'c') show('custom');
    // L steps to the next night length (after 6 hours it goes back to 1 minute).
    else if (k === 'l') setNightLength((nightLength + 1) % NIGHT_LENGTHS.length);
    // D steps to the next difficulty (after Nightmare it goes back to Easy).
    else if (k === 'd') setDifficulty(DIFF_ORDER[(DIFF_ORDER.indexOf(difficulty) + 1) % DIFF_ORDER.length]);

  } else if (currentScreen === 'pick') {
    // 1 to 5 take or put back the card with that number.
    if (/^[1-5]$/.test(k) && run && run.offer[Number(k) - 1]) togglePick(run.offer[Number(k) - 1]);
    else if (k === 'Enter') { e.preventDefault(); beginNight(); }
    else if (k === 'Escape') show('title');
    else if (k === 'h') openHowto();

  } else if (currentScreen === 'game' && G && !G.over) {
    if (k === 'p' || k === 'Escape') { setPaused(!G.paused); return; }
    if (G.paused) return;
    // Hand-unit is in the office: every key you press goes to mashing him (and does nothing else), so
    // mashing the keyboard can't slam doors or flip the monitor. Holding a key down doesn't count:
    // e.repeat is true for the extra presses a held key sends.
    if (G.hnd.present) { e.preventDefault(); if (!e.repeat) mashHand(); return; }
    // Turned round with a sum on H.E.L.P.I's tablet (update 3.0): digits, Backspace and Enter go to it.
    if (!e.repeat && helpiKey(k)) { e.preventDefault(); return; }
    // Shift turns around (update 3.0). e.key is 'Shift' for either Shift key.
    if (k === 'Shift') { if (!e.repeat) toggleTurn(); return; }
    // e.repeat is true for the extra presses a held-down key sends; most keys ignore those, so
    // holding A doesn't slam the door open and shut over and over.
    if (k === 'f') { flashKey = true; return; }          // held: released in keyup below
    if (e.repeat) { if (k === ' ') e.preventDefault(); return; }
    if (k === 'a') toggleDoor('L');
    else if (k === 'd') toggleDoor('R');
    else if (k === 'e') toggleFan();
    else if (k === 'x') shock();
    else if (k === ' ' || k === 's') { e.preventDefault(); toggleCam(); }
    else if (k === 'c') setTab('cams');
    else if (k === 'v') setTab('vents');
    else if (k === 'b') setTab('shop');
    // W does two jobs: on the monitor it winds the music box (on CAM 6); in the office it puts the
    // mask on or takes it off. That works because the mask can't be worn with the monitor up.
    else if (k === 'w') { if (G.cam) windBox(); else toggleMask(); }
    // On the VENTS tab the arrow keys move a highlight around the map and Enter plays a lure in that
    // vent. The number keys do nothing there.
    else if (G.cam && G.tab === 'vents' && k in VENT_ARROWS) { e.preventDefault(); moveVentSel(...VENT_ARROWS[k]); }
    else if (G.cam && G.tab === 'vents' && k === 'Enter') { e.preventDefault(); playLure(G.ventSel); }
    // Anywhere else, 1 to 9 pick a camera, and 0 picks CAM 10. /^[0-9]$/ means "exactly one digit".
    else if (/^[0-9]$/.test(k) && !(G.cam && G.tab === 'vents')) setCam(CAM_ORDER[k === '0' ? 9 : Number(k) - 1]);
    else if (k === 'h') openHowto();

  } else if (currentScreen === 'custom') {
    if (k === 'Enter') { e.preventDefault(); startCustom(); }
    else if (k === 'Escape') show('title');
    else if (k === 'h') openHowto();

  } else if (currentScreen === 'emblems') {
    if (k === 'Escape' || k === 'Enter') { e.preventDefault(); show('title'); }

  } else if (currentScreen === 'win') {
    if (k === 'Enter') { e.preventDefault(); lastWin && lastWin.result === 'custom' ? show('custom') : lastWin && lastWin.result === 'won' ? newRun() : showPick(); }
    else if (k === 'Escape') show('title');
  }
});

// Letting go of F switches the flashlight off.
document.addEventListener('keyup', e => { if (e.key.toLowerCase() === 'f') flashKey = false; });

// If the window loses focus (you clicked another window or alt-tabbed away), pause the night so
// nothing gets you while you're not looking. Also, a key held down at that moment would never be
// seen being released, so let go of the flashlight.
window.addEventListener('blur', () => {
  flashKey = flashMouse = flashButton = false;
  if (currentScreen === 'game' && G && !G.over && !G.paused) setPaused(true);
});

// Switching to another tab pauses the game and puts the sound engine to sleep, so a copy of the
// game left open in the background uses (almost) no computer power. Coming back wakes the sound;
// the game itself stays paused until you unpause it.
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    if (currentScreen === 'game' && G && !G.over && !G.paused) setPaused(true);
    sfx.sleep();
  } else {
    sfx.wake();
  }
});

// ---------- Munchie: grab it and flick it off ----------
// Pressing on Munchie grabs it, and moving drags it around. Letting go flicks it off, but only if you were
// still moving fast at that moment: at least MUNCHIE_FLICK pixels a second over the last tenth of a second.
// Let go while standing still and it just clings on where you left it.
let munchieGrab = null;   // while dragging: where on Munchie you grabbed (dx, dy) and the recent pointer spots
const munchieEl = $('munchie');
munchieEl.addEventListener('pointerdown', e => {
  if (!G || !G.mun.active) return;
  sfx.init();
  const r = munchieEl.getBoundingClientRect();
  munchieGrab = { dx: e.clientX - r.left, dy: e.clientY - r.top, spots: [{ x: e.clientX, y: e.clientY, t: performance.now() }] };
  try { munchieEl.setPointerCapture(e.pointerId); } catch {}   // keep getting moves even if the pointer outruns it
  e.preventDefault();
  e.stopPropagation();                          // it isn't a click on the office underneath
});
munchieEl.addEventListener('pointermove', e => {
  if (!munchieGrab) return;
  const box = view.getBoundingClientRect();
  dragMunchie((e.clientX - munchieGrab.dx - box.left) / box.width, (e.clientY - munchieGrab.dy - box.top) / box.height);
  munchieGrab.spots.push({ x: e.clientX, y: e.clientY, t: performance.now() });
});
function letGoMunchie() {
  if (!munchieGrab) return;
  const now = performance.now();
  const recent = munchieGrab.spots.filter(p => now - p.t <= 100);   // where the pointer was lately
  munchieGrab = null;
  if (recent.length < 2) return;   // it wasn't moving
  const a = recent[0], b = recent[recent.length - 1];
  const speed = Math.hypot(b.x - a.x, b.y - a.y) / Math.max(0.016, (b.t - a.t) / 1000);   // pixels a second
  if (speed >= MUNCHIE_FLICK) flickMunchie();
}
for (const ev of ['pointerup', 'pointercancel']) munchieEl.addEventListener(ev, letGoMunchie);
