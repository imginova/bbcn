/* =====================================================================
   input.js: mouse and keyboard CONTROLS.

   Nothing here decides what happens in the game. It only listens for
   clicks and key presses and calls the right function from game.js or
   screens.js.

   addEventListener('click', fn) means "whenever this is clicked, run fn".
   ===================================================================== */

// ---------- mouse ----------
// onClick(id, fn): run fn when the button with that id is clicked.
// The blur() at the end takes keyboard focus off a button you CLICKED, so pressing
// Space afterwards raises the camera instead of clicking that button again.
// (e.detail counts mouse clicks; it is 0 when the "click" came from the keyboard.)
const onClick = (id, fn) => $(id).addEventListener('click', e => {
  sfx.init();
  fn(e);
  if (e.detail) e.currentTarget.blur();
});

onClick('btnMute', toggleMute);
onClick('btnPlay', () => show('setup'));
onClick('btnHowTitle', openHowto);
onClick('btnHowSetup', openHowto);
onClick('btnHowPause', openHowto);
onClick('btnHowClose', closeHowto);
onClick('btnStart', startNight);
onClick('btnBack', () => show('title'));
onClick('btnAll20', () => setAllLevels(MAX_LEVEL));
onClick('btnL', () => toggleDoor('L'));
onClick('btnR', () => toggleDoor('R'));
onClick('btnCam', toggleCam);
onClick('btnMask', toggleMask);
onClick('btnResume', () => setPaused(false));
onClick('btnQuit', () => { analytics.leave('quit'); showPause(false); goSetup(); });
onClick('btnAgainWin', startNight);
onClick('btnLevelsWin', goSetup);
onClick('btnRetry', startNight);
onClick('btnLevelsLose', goSetup);
// The analytics consent banner and the Privacy button that reopens it (see analytics.js).
onClick('btnAllow', () => analytics.choose(true));
onClick('btnDecline', () => analytics.choose(false));
onClick('btnPrivacy', analytics.openBanner);

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

// The monitor's tabs (CAMS / VENTS). data-tab="vents" says which tab a button opens.
$('tabs').addEventListener('click', e => {
  const b = e.target.closest('button[data-tab]');
  if (!b) return;
  setTab(b.dataset.tab);
  if (e.detail) b.blur();
});

// Clicking a vent room on the VENTS tab plays an audio lure there. Each room's cells carry a class
// like "vr-v3" (see ventGrid in art.js); we read the room out of it. pointerdown, like Smiley and the
// Crawler, because the map is redrawn many times a second.
$('ventMap').addEventListener('pointerdown', e => {
  const cell = e.target.closest('.vroom');
  if (!cell) return;
  const room = [...cell.classList].find(name => name.startsWith('vr-')).slice(3);   // "vr-v3" → "v3"
  sfx.init();
  playLure(room);
  e.preventDefault();
});

// Tasks mode: pressing a task on the TASKS tab works on it, but only while the mouse button stays
// down (pointerdown: the list is redrawn often). Letting go anywhere stops it, so the release is
// watched on the whole window: the button you pressed may have been redrawn by then.
$('taskList').addEventListener('pointerdown', e => {
  const b = e.target.closest('[data-task]');
  if (!b) return;
  sfx.init();
  pickTask(Number(b.dataset.task));
  taskPointer = true;
  e.preventDefault();
});
for (const ev of ['pointerup', 'pointercancel']) window.addEventListener(ev, () => { taskPointer = false; });
$('taskList').addEventListener('contextmenu', e => e.preventDefault());

// Generator mode: the Generator button charges only while it's HELD, like the door lights.
const btnGen = $('btnGen');
btnGen.addEventListener('pointerdown', e => {
  sfx.init();
  genPointer = true;
  btnGen.setPointerCapture?.(e.pointerId);
  e.preventDefault();
});
for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) btnGen.addEventListener(ev, () => { genPointer = false; });
btnGen.addEventListener('contextmenu', e => e.preventDefault());

// © Spammer's ads: clicking an ad's [X] closes it (pointerdown, so a busy moment can't eat the click).
$('ads').addEventListener('pointerdown', e => {
  const x = e.target.closest('.ad-x');
  if (!x) return;
  sfx.init();
  closeAd(Number(x.dataset.ad));
  e.preventDefault();
});

// Custom night rows: the − and + buttons change a level; clicking anywhere else on a row selects it.
$('rows').addEventListener('click', e => {
  const step = e.target.closest('.step');
  if (step) {
    // A mouse or finger already changed the level on pointerdown (see the hold-to-repeat code below).
    // e.detail is 0 when the "click" came from the keyboard (Enter/Space on a focused button).
    if (e.detail) step.blur();
    else changeLevel(Number(step.dataset.i), Number(step.dataset.d));
    return;
  }
  // A modifier checkbox: let go of keyboard focus after a mouse click, so Space keeps working (see keydown).
  if (e.target.matches('[data-mod]')) {
    if (e.detail) e.target.blur();
    return;
  }
  const row = e.target.closest('.lvrow');
  if (row) { sel = Number(row.dataset.i); renderSetup(); }
});

// Holding − or + keeps changing the level, like holding down a key: one step straight away,
// then after a short pause (400 ms) one step every 70 ms until you let go or it hits 0 / 20.
let holdTimer = 0;
function stopHold() { clearTimeout(holdTimer); holdTimer = 0; }
function startHold(i, d) {
  stopHold();
  changeLevel(i, d);
  const repeat = delay => {
    holdTimer = setTimeout(() => {
      const before = levels[i];
      changeLevel(i, d);
      if (levels[i] !== before) repeat(70);   // stop repeating once it can't go any further
    }, delay);
  };
  repeat(400);
}
$('rows').addEventListener('pointerdown', e => {
  const step = e.target.closest('.step');
  if (!step || e.button !== 0) return;   // e.button 0 = the main mouse button (or a finger)
  sfx.init();
  startHold(Number(step.dataset.i), Number(step.dataset.d));
});
// Letting go anywhere, sliding off the button, or leaving the window stops the repeat.
for (const ev of ['pointerup', 'pointercancel', 'blur']) window.addEventListener(ev, stopHold);
$('rows').addEventListener('pointerout', e => { if (e.target.closest('.step')) stopHold(); });
$('rows').addEventListener('contextmenu', e => { if (e.target.closest('.step')) e.preventDefault(); });   // no long-press menu on phones

// Ticking or unticking a modifier checkbox fires a "change" event.
$('rows').addEventListener('change', e => {
  if (e.target.matches('[data-mod]')) setMod(Number(e.target.dataset.mod), e.target.checked);
});

// The mode picker on the custom night screen. data-mode="generator" says which mode a button picks.
$('modes').addEventListener('click', e => {
  const b = e.target.closest('[data-mode]');
  if (!b) return;
  sfx.init();
  setMode(b.dataset.mode);
  if (e.detail) b.blur();
});

// The challenge buttons under the rows. data-preset="2" means PRESETS[2].
$('presets').addEventListener('click', e => {
  const b = e.target.closest('[data-preset]');
  if (!b) return;
  sfx.init();
  applyPreset(PRESETS[Number(b.dataset.preset)]);
  if (e.detail) b.blur();
});

// Clicking the dark area around the How to play panel closes it.
$('howto').addEventListener('click', e => { if (e.target.id === 'howto') closeHowto(); });

// The Wind button winds only while it is HELD, so we listen for press and release, not click.
// "pointer" events cover mouse, touch and pen alike.
const btnWind = $('btnWind');
btnWind.addEventListener('pointerdown', e => {
  sfx.init();
  windPointer = true;
  btnWind.setPointerCapture?.(e.pointerId);   // keep getting events even if the pointer slides off
  e.preventDefault();
});
for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) {
  btnWind.addEventListener(ev, () => { windPointer = false; });
}
btnWind.addEventListener('contextmenu', e => e.preventDefault());   // no right-click / long-press menu

// The door lights also shine only while HELD, so they work the same way as the Wind button.
// pressLight() is shared with the Q / E keys below: it remembers the hold and plays a click.
function pressLight(side, holds) {
  if (!holds[side]) {
    holds[side] = true;
    if (G && !G.over && !G.paused && lightOn(side)) sfx.light();
    dirty = true;
  }
}
function releaseLight(side, holds) {
  holds[side] = false;
  dirty = true;
}
for (const side of ['L', 'R']) {
  const btn = $('btnLight' + side);
  btn.addEventListener('pointerdown', e => {
    sfx.init();
    pressLight(side, lightPointer);
    btn.setPointerCapture?.(e.pointerId);
    e.preventDefault();
  });
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    btn.addEventListener(ev, () => releaseLight(side, lightPointer));
  }
  btn.addEventListener('contextmenu', e => e.preventDefault());
}

// Clicking (: in the office catches it. It's two cells ("(" and ":"), each with class "smi".
// We listen for "pointerdown" (the moment the mouse button or finger goes DOWN), not "click".
// Why: render.js redraws the office about 15 times a second, replacing (: with a fresh copy.
// A "click" only counts if the button goes down AND up on the same element, so a redraw in
// between made the click land on the whole office instead, and (: was never caught.
// With the Twins modifier there are two; the "smi-1" class marks the second one.
// The Ж Crawler (class "crw-hit") can be clicked in the office too.
$('officeArt').addEventListener('pointerdown', e => {
  const cell = e.target.closest('.smi');
  if (cell) {
    sfx.init();
    catchSmiley(cell.classList.contains('smi-1') ? 1 : 0);
    e.preventDefault();
  } else if (e.target.closest('.crw-hit')) {
    sfx.init();
    pushCrawler();
    e.preventDefault();
  }
});

// Clicking the Ж Crawler on a camera pushes it back one room (pointerdown for the same
// reason as Smiley: the feed is redrawn many times a second).
$('feed').addEventListener('pointerdown', e => {
  if (e.target.closest('.crw-hit')) {
    sfx.init();
    pushCrawler();
    e.preventDefault();
  }
});

// ---------- keyboard ----------
// One listener for every key press. What a key does depends on which screen is showing.
// e.key is the key's name: 'a', 'Enter', ' ' (Space), 'ArrowUp', ...
// e.preventDefault() stops the browser's own reaction (like Space scrolling the page).
document.addEventListener('keydown', e => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;   // leave shortcuts like Ctrl+R alone
  const k = e.key;
  // Let a focused button or checkbox handle its own Space/Enter.
  const onButton = e.target instanceof HTMLButtonElement || e.target instanceof HTMLInputElement;
  if ((k === ' ' || k === 'Enter') && onButton) return;
  sfx.init();
  if (k === 'm' || k === 'M') { toggleMute(); return; }

  // The How to play panel is open: only Esc / Enter (close it) do anything.
  if (!$('howto').hidden) {
    if (k === 'Escape' || k === 'Enter') { e.preventDefault(); closeHowto(); }
    return;
  }

  // Game over is showing (but not during the jumpscare itself).
  if (!$('scare').hidden) {
    if ($('scareMsg').hidden) return;
    if (k === 'Enter' || k === 'r' || k === 'R') { e.preventDefault(); startNight(); }
    else if (k === 'c' || k === 'C' || k === 'Escape') goSetup();
    return;
  }

  if (currentScreen === 'title') {
    if (k === 'Enter') { e.preventDefault(); show('setup'); }
    else if (k === 'h' || k === 'H') openHowto();

  } else if (currentScreen === 'setup') {
    // % SETUP.length wraps around: going down from the last row lands on the first.
    if (k === 'ArrowUp' || k === 'w' || k === 'W') { e.preventDefault(); sel = (sel + SETUP.length - 1) % SETUP.length; renderSetup(); }
    else if (k === 'ArrowDown' || k === 's' || k === 'S') { e.preventDefault(); sel = (sel + 1) % SETUP.length; renderSetup(); }
    else if (k === 'ArrowLeft' || k === 'a' || k === 'A') { e.preventDefault(); changeLevel(sel, -1); }
    else if (k === 'ArrowRight' || k === 'd' || k === 'D') { e.preventDefault(); changeLevel(sel, 1); }
    else if (k === ' ') { e.preventDefault(); if (levels[sel] > 0) setMod(sel, !mods[sel]); }   // Space ticks the modifier
    else if (k === 'Enter') { e.preventDefault(); startNight(); }
    else if (k === 'Escape') show('title');
    else if (k === 'h' || k === 'H') openHowto();

  } else if (currentScreen === 'game' && G && !G.over) {
    if (k === 'p' || k === 'P' || k === 'Escape') { setPaused(!G.paused); return; }
    if (G.paused) return;
    if (k === 'a' || k === 'A') toggleDoor('L');
    else if (k === 'd' || k === 'D') toggleDoor('R');
    else if (k === ' ' || k === 's' || k === 'S') { e.preventDefault(); toggleCam(); }
    // W does two jobs: on the cameras you HOLD it to wind the music box (released in keyup below);
    // in the office each press puts the mask on or takes it off. e.repeat is true for the extra
    // presses a held-down key sends, so holding W never flips the mask on and off by itself.
    else if (k === 'w' || k === 'W') { if (G.cam) windKey = true; else if (!e.repeat) toggleMask(); }   // (winding only works on CAMS)
    else if (k === 'q' || k === 'Q') pressLight('L', lightKey);              // left door light, also released in keyup
    else if (k === 'e' || k === 'E') pressLight('R', lightKey);              // right door light
    else if (k === 'c' || k === 'C') setTab('cams');                         // the monitor's tabs
    else if (k === 'v' || k === 'V') setTab('vents');
    else if (k === 't' || k === 'T') setTab('tasks');
    else if (k === 'g' || k === 'G') genKey = true;                          // Generator mode: hold G to charge (released in keyup)
    // On the VENTS tab, 1 to 6 play a lure in vent V1 to V6; on TASKS, 1 to 8 pick a task;
    // everywhere else, 1 to 7 pick a camera. /^[1-7]$/ means "exactly one digit from 1 to 7".
    else if (/^[1-6]$/.test(k) && G.cam && G.tab === 'vents') playLure(VENT_ORDER[Number(k) - 1]);
    else if (/^[1-9]$/.test(k) && G.cam && G.tab === 'tasks') { pickTask(Number(k) - 1); taskKey = true; }   // held: released in keyup
    else if (/^[1-7]$/.test(k)) setCam(CAM_ORDER[Number(k) - 1]);
    else if (k === 'h' || k === 'H') openHowto();

  } else if (currentScreen === 'win') {
    if (k === 'Enter' || k === 'r' || k === 'R') { e.preventDefault(); startNight(); }
    else if (k === 'c' || k === 'C' || k === 'Escape') goSetup();
  }
});

// Letting go of W stops winding; letting go of Q or E switches that door light off.
document.addEventListener('keyup', e => {
  const k = e.key.toLowerCase();
  if (k === 'w') windKey = false;
  else if (k === 'g') genKey = false;
  else if (/^[1-9]$/.test(k)) taskKey = false;   // letting go of a task's number key stops working on it
  else if (k === 'q') releaseLight('L', lightKey);
  else if (k === 'e') releaseLight('R', lightKey);
});

// If the window loses focus while a key is held, we would never see it being released, so let go of everything.
window.addEventListener('blur', () => {
  windKey = windPointer = false;
  genKey = genPointer = false;
  taskKey = taskPointer = false;
  lightKey.L = lightKey.R = lightPointer.L = lightPointer.R = false;
});

// Switching to another tab pauses the game.
document.addEventListener('visibilitychange', () => {
  if (document.hidden && currentScreen === 'game' && G && !G.over && !G.paused) setPaused(true);
});

// Closing or leaving the page in the middle of a night: tell analytics the night was abandoned.
// ("pagehide" fires when the page is closed, reloaded or navigated away from.)
window.addEventListener('pagehide', () => {
  if (currentScreen === 'game' && G && !G.over) analytics.leave('abandon');
});
