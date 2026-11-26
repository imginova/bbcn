/* =====================================================================
   main.js: starts the game and runs the GAME LOOP.

   Loaded LAST, after every other file is ready.

   A game loop is the heartbeat of almost every video game:
     1. work out how much time passed since last time (dt)
     2. update the rules by that much time   (game.js: update)
     3. redraw the screen                    (render.js: renderGame)
     4. ask the browser to do it all again on the next frame
   requestAnimationFrame(loop) means "call loop() right before the
   screen next refreshes", usually 60 times a second.
   ===================================================================== */

let speed = 1;   // 1 = normal speed. Raise it to fast-forward when testing (see draftNight below).

let lastTime = performance.now();
let sinceRender = 0;
let looping = false;   // is the loop running right now? (see wakeLoop below)

function loop(now) {
  // Seconds since the last frame. Capped at 0.1 so that if the computer stalls (or the tab
  // was in the background), the game doesn't jump ahead by a huge amount in one go. And never below 0:
  // the browser's frame time can be a hair earlier than the moment the loop was started, which would
  // turn the clock back to "-1:-1 AM".
  const dt = Math.max(0, Math.min(0.1, (now - lastTime) / 1000));
  lastTime = now;

  if (currentScreen === 'game' && G && !G.over) {
    if (!G.paused) update(dt * speed);
    // Redraw about 15 times a second, or straight away if something important changed.
    // (While the flashlight or the fan is on, or Bounce pot is bouncing, every frame, so the light keeps
    // up with the mouse, the fan's blades turn and the pot moves smoothly.)
    sinceRender += dt;
    if (!G.over && (dirty || flashOn() || G.fan || G.bpt.on || sinceRender > 1 / 15)) {
      renderGame(now);
      dirty = false;
      sinceRender = 0;
    }
  }
  // Keep going only while a night is being played. On every other screen and while paused nothing
  // moves, so the loop stops itself and costs the computer nothing. wakeLoop() restarts it.
  if (currentScreen === 'game' && G && !G.over && !G.paused) requestAnimationFrame(loop);
  else looping = false;
}

// Start the loop again (called when a night starts, and when you unpause). Does nothing if it's
// already running, so calling it twice never makes two loops.
function wakeLoop() {
  if (looping) return;
  looping = true;
  lastTime = performance.now();   // so the first frame doesn't count the time spent stopped
  requestAnimationFrame(loop);
}

// A testing helper you can use from the browser's developer console:
//   draftNight.state         look at everything about the current night
//   draftNight.run           look at the run (night, lives, lineup, cards)
//   draftNight.speed = 20    make time pass 20 times faster
//   draftNight.state.t = 179 jump to one second before 6 AM
window.draftNight = {
  get state() { return G; },
  get run() { return run; },
  get speed() { return speed; },
  set speed(v) { speed = Math.max(0.1, Number(v) || 1); },
};

// Start everything: the rarity key on the title, How to play's character list, the sound button,
// then the title screen. (The loop doesn't start yet: startNight in game.js wakes it when a night begins.)
function boot() {
  $('rarityKey').innerHTML = RARITY_ORDER.map(r => `<span class="${RARITIES[r].cls}">${RARITIES[r].name} ${RARITIES[r].points}</span>`).join(' · ');
  buildHowto();
  renderMute();
  show('title');
}
boot();
