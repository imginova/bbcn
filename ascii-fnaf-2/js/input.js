/* =====================================================================
   input.js: mouse and keyboard CONTROLS.

   Nothing here decides what happens in the game. It only listens for
   clicks and key presses, and calls the right function from game.js
   or screens.js.

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
onClick('btnPlay', () => show('setup'));
onClick('btnHowTitle', openHowto);
onClick('btnHowSetup', openHowto);
onClick('btnHowPause', openHowto);
onClick('btnHowClose', closeHowto);
onClick('btnStart', startNight);
onClick('btnBack', () => show('title'));
onClick('btnAll0', () => setAllLevels(0));
onClick('btnAll20', () => setAllLevels(MAX_LEVEL));
onClick('btnL', () => toggleDoor('L'));
onClick('btnR', () => toggleDoor('R'));
onClick('btnHL', () => toggleHeavy('L'));
onClick('btnHR', () => toggleHeavy('R'));
onClick('btnGoL', () => goToDoor('L'));
onClick('btnGoR', () => goToDoor('R'));
onClick('btnCam', toggleCam);
onClick('btnMask', toggleMask);
onClick('btnVent', toggleVent);
onClick('btnShock', shock);
onClick('btnShockCam', shock);
onClick('btnLamp', flashLamp);
onClick('btnResume', () => setPaused(false));
onClick('btnQuit', () => { showPause(false); goSetup(); });
onClick('btnAgainWin', startNight);
onClick('btnLevelsWin', goSetup);
onClick('btnRetry', startNight);
onClick('btnLevelsLose', goSetup);

// Clicking the doors themselves works too (the normal door).
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

// ---------- custom night rows ----------
// The − and + buttons change a level; clicking anywhere else on a card selects it.
$('rows').addEventListener('click', e => {
  const step = e.target.closest('.step');
  if (step) {
    // A mouse or finger already changed the level on pointerdown (see the hold-to-repeat code below).
    // e.detail is 0 when the "click" came from the keyboard (Enter/Space on a focused button).
    if (e.detail) step.blur();
    else changeLevel(Number(step.dataset.i), Number(step.dataset.d));
    return;
  }
  const row = e.target.closest('.lvrow');
  if (row) { sel = Number(row.dataset.i); renderSetup(); }
});

// Pointing at a card shows how that character works in the info box; moving off the grid goes back
// to the selected card. "pointerover" fires each time the pointer moves onto a new element.
$('rows').addEventListener('pointerover', e => {
  const row = e.target.closest('.lvrow');
  const i = row ? Number(row.dataset.i) : -1;
  if (i !== hoverCard) { hoverCard = i; renderWho(); }
});
$('rows').addEventListener('pointerleave', () => { hoverCard = -1; renderWho(); });

// The same on the pause panel's cards (it has no "selected" card, so leaving shows the hint again).
$('pauseRoster').addEventListener('pointerover', e => {
  const card = e.target.closest('.mini-card');
  if (card) $('pauseInfo').innerHTML = whoHtml(Number(card.dataset.i));
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

// The challenge buttons under the cards. data-preset="2" means PRESETS[2].
$('presets').addEventListener('click', e => {
  const b = e.target.closest('[data-preset]');
  if (!b) return;
  sfx.init();
  applyPreset(PRESETS[Number(b.dataset.preset)]);
  if (e.detail) b.blur();
});

// Clicking the dark area around the How to play panel closes it.
$('howto').addEventListener('click', e => { if (e.target.id === 'howto') closeHowto(); });

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
  if (k === 'm') { toggleMute(); return; }

  // The How to play panel is open: only Esc / Enter (close it) do anything.
  if (!$('howto').hidden) {
    if (k === 'Escape' || k === 'Enter') { e.preventDefault(); closeHowto(); }
    return;
  }

  // Game over is showing (but not during the jumpscare itself).
  if (!$('scare').hidden) {
    if ($('scareMsg').hidden) return;
    if (k === 'Enter' || k === 'r') { e.preventDefault(); startNight(); }
    else if (k === 'c' || k === 'Escape') goSetup();
    return;
  }

  if (currentScreen === 'title') {
    if (k === 'Enter') { e.preventDefault(); show('setup'); }
    else if (k === 'h') openHowto();

  } else if (currentScreen === 'setup') {
    // % SETUP.length wraps around: going down from the last card lands on the first.
    if (k === 'ArrowUp' || k === 'w') { e.preventDefault(); sel = (sel + SETUP.length - 1) % SETUP.length; renderSetup(); }
    else if (k === 'ArrowDown' || k === 's') { e.preventDefault(); sel = (sel + 1) % SETUP.length; renderSetup(); }
    else if (k === 'ArrowLeft' || k === 'a') { e.preventDefault(); changeLevel(sel, -1); }
    else if (k === 'ArrowRight' || k === 'd') { e.preventDefault(); changeLevel(sel, 1); }
    else if (k === 'Enter') { e.preventDefault(); startNight(); }
    else if (k === 'Escape') show('title');
    else if (k === 'h') openHowto();

  } else if (currentScreen === 'game' && G && !G.over) {
    if (k === 'p' || k === 'Escape') { setPaused(!G.paused); return; }
    if (G.paused) return;
    // e.repeat is true for the extra presses a held-down key sends; we ignore those, so holding A
    // doesn't slam the door open and shut over and over.
    if (e.repeat) { if (k === ' ') e.preventDefault(); return; }
    if (k === 'a') toggleDoor('L');
    else if (k === 'd') toggleDoor('R');
    else if (k === 'z') toggleHeavy('L');
    else if (k === 'c') toggleHeavy('R');
    else if (k === 'q') goToDoor('L');
    else if (k === 'e') goToDoor('R');
    else if (k === ' ' || k === 's') { e.preventDefault(); toggleCam(); }
    else if (k === 'w') toggleMask();
    else if (k === 'x') shock();
    else if (k === 'v') toggleVent();
    else if (k === 'f') flashLamp();
    // 1 to 9 pick a camera, and 0 the vents (CAM 10). /^[0-9]$/ means "exactly one digit".
    else if (/^[0-9]$/.test(k)) setCam(CAM_ORDER[k === '0' ? 9 : Number(k) - 1]);
    else if (k === 'h') openHowto();

  } else if (currentScreen === 'win') {
    if (k === 'Enter' || k === 'r') { e.preventDefault(); startNight(); }
    else if (k === 'c' || k === 'Escape') goSetup();
  }
});

// If the window loses focus (you clicked another window or alt-tabbed away), pause the night so
// nothing gets you while you're not looking.
window.addEventListener('blur', () => {
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
