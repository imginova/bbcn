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
onClick('btnResume', () => setPaused(false));
onClick('btnQuit', () => { showPause(false); goSetup(); });
onClick('btnAgainWin', startNight);
onClick('btnLevelsWin', goSetup);
onClick('btnRetry', startNight);
onClick('btnLevelsLose', goSetup);

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

// Custom night rows: the − and + buttons change a level; clicking anywhere else on a row selects it.
$('rows').addEventListener('click', e => {
  const step = e.target.closest('.step');
  if (step) {
    changeLevel(Number(step.dataset.i), Number(step.dataset.d));
    if (e.detail) step.blur();
    return;
  }
  const row = e.target.closest('.lvrow');
  if (row) { sel = Number(row.dataset.i); renderSetup(); }
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

// ---------- keyboard ----------
// One listener for every key press. What a key does depends on which screen is showing.
// e.key is the key's name: 'a', 'Enter', ' ' (Space), 'ArrowUp', ...
// e.preventDefault() stops the browser's own reaction (like Space scrolling the page).
document.addEventListener('keydown', e => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;   // leave shortcuts like Ctrl+R alone
  const k = e.key;
  const onButton = e.target instanceof HTMLButtonElement;
  if ((k === ' ' || k === 'Enter') && onButton) return;   // let a focused button handle its own Space/Enter
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
    else if (k === 'Enter') { e.preventDefault(); startNight(); }
    else if (k === 'Escape') show('title');
    else if (k === 'h' || k === 'H') openHowto();

  } else if (currentScreen === 'game' && G && !G.over) {
    if (k === 'p' || k === 'P' || k === 'Escape') { setPaused(!G.paused); return; }
    if (G.paused) return;
    if (k === 'a' || k === 'A') toggleDoor('L');
    else if (k === 'd' || k === 'D') toggleDoor('R');
    else if (k === ' ' || k === 's' || k === 'S') { e.preventDefault(); toggleCam(); }
    else if (k === 'w' || k === 'W') windKey = true;                         // released in keyup below
    else if (/^[1-7]$/.test(k)) setCam(CAM_ORDER[Number(k) - 1]);            // /^[1-7]$/ means "exactly one digit from 1 to 7"
    else if (k === 'h' || k === 'H') openHowto();

  } else if (currentScreen === 'win') {
    if (k === 'Enter' || k === 'r' || k === 'R') { e.preventDefault(); startNight(); }
    else if (k === 'c' || k === 'C' || k === 'Escape') goSetup();
  }
});

// Letting go of W stops winding.
document.addEventListener('keyup', e => { if (e.key === 'w' || e.key === 'W') windKey = false; });

// If the window loses focus while W is held, we would never see the key being released, so stop winding.
window.addEventListener('blur', () => { windKey = windPointer = false; });

// Switching to another tab pauses the game.
document.addEventListener('visibilitychange', () => {
  if (document.hidden && currentScreen === 'game' && G && !G.over && !G.paused) setPaused(true);
});
