/* =====================================================================
   input.js: mouse and keyboard CONTROLS.

   Nothing here decides what happens in the game. It only listens for
   clicks, key presses and mouse movement, and calls the right function
   from game.js or screens.js.

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
onClick('btnCam', toggleCam);
onClick('btnMask', toggleMask);
onClick('btnFan', toggleFan);
onClick('btnWind', windBox);
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

// ---------- aiming the flashlight ----------
// Whenever the pointer moves over the view, work out what it's pointing at: which picture (the left
// doorway, the office or the right doorway) and which row and column of characters in it.
// getBoundingClientRect() gives an element's position and size on the screen in pixels.
const view = $('viewport');
const AIM_AREAS = [['L', 'doorL', 12], ['office', 'officeArt', 36], ['R', 'doorR', 12]];   // [name, element id, columns]
function updateAim(e) {
  const box = view.getBoundingClientRect();
  aim.x = e.clientX - box.left;
  aim.y = e.clientY - box.top;
  aim.where = null;
  for (const [where, id, cols] of AIM_AREAS) {
    const r = $(id).getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) continue;
    aim.where = where;
    // How far across and down the picture the pointer is (0 to 1), times its size in characters.
    // The - 0.5 makes "column 3" mean the middle of the 4th character, like the cells it's compared with.
    aim.c = (e.clientX - r.left) / r.width * cols - 0.5;
    aim.r = (e.clientY - r.top) / r.height * 16 - 0.5;
  }
  if (G && G.cam) aim.where = null;   // the monitor is up: you're not aiming at the office at all
}
view.addEventListener('pointermove', updateAim);
view.addEventListener('pointerdown', updateAim);   // on a phone there's no "move" before a tap
view.addEventListener('pointerleave', () => { aim.where = null; });

// The flashlight shines while the RIGHT mouse button is held down over the view (or F, or the
// Flashlight button). We use mousedown/mouseup here, not pointer events: a second mouse button pressed
// while one is already down doesn't send a new "pointerdown", and you need the left button free for
// clicking cupcakes and Bonnet's nose while the light is on.
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

// ---------- clicking things in the office ----------
// Phantom Chica's cupcakes (class "cup cup-0", "cup cup-1"...) and Bonnet's nose ("bnt-nose").
// We react the moment the button goes DOWN, not on "click": render.js redraws the office about 15
// times a second, and a "click" only counts if the button goes down AND up on the same element.
// Mice use mousedown (it also works while the right button holds the flashlight); fingers and pens
// use pointerdown.
function officePress(e) {
  const cup = e.target.closest('.cup');
  const nose = e.target.closest('.bnt-nose');
  if (!cup && !nose) return;
  sfx.init();
  if (cup) clickCupcake(Number([...cup.classList].find(n => /^cup-\d$/.test(n)).slice(4)));   // "cup-2" → 2
  else boopBonnet();
  e.preventDefault();
}
$('officeArt').addEventListener('mousedown', e => { if (e.button === 0) officePress(e); });
$('officeArt').addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') officePress(e); });

// ---------- custom night rows ----------
// The − and + buttons change a level; clicking anywhere else on a row selects it.
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
    // % SETUP.length wraps around: going down from the last row lands on the first.
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
    // e.repeat is true for the extra presses a held-down key sends; most keys ignore those, so
    // holding A doesn't slam the door open and shut over and over.
    if (k === 'f') { flashKey = true; return; }          // held: released in keyup below
    if (e.repeat) { if (k === ' ') e.preventDefault(); return; }
    if (k === 'a') toggleDoor('L');
    else if (k === 'd') toggleDoor('R');
    else if (k === ' ' || k === 's') { e.preventDefault(); toggleCam(); }
    // W does two jobs: on the monitor it winds the music box (on CAM 7); in the office it puts the
    // mask on or takes it off. That works because the mask can't be worn with the monitor up.
    else if (k === 'w') { if (G.cam) windBox(); else toggleMask(); }
    else if (k === 'e') toggleFan();
    else if (/^[1-7]$/.test(k)) setCam(CAM_ORDER[Number(k) - 1]);   // /^[1-7]$/ means "exactly one digit from 1 to 7"
    else if (k === 'h') openHowto();

  } else if (currentScreen === 'win') {
    if (k === 'Enter' || k === 'r') { e.preventDefault(); startNight(); }
    else if (k === 'c' || k === 'Escape') goSetup();
  }
});

// Letting go of F switches the flashlight off.
document.addEventListener('keyup', e => { if (e.key.toLowerCase() === 'f') flashKey = false; });

// If the window loses focus while a key is held, we would never see it being released, so let go.
window.addEventListener('blur', () => { flashKey = flashMouse = flashButton = false; });

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
