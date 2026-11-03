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

let speed = 1;   // 1 = normal speed. Raise it to fast-forward when testing (see asciiNights below).

let lastTime = performance.now();
let sinceRender = 0;
let looping = false;   // is the loop running right now? (see wakeLoop below)

function loop(now) {
  // Seconds since the last frame. Capped at 0.1 so that if the computer stalls (or the tab
  // was in the background), the game doesn't jump ahead by a huge amount in one go.
  const dt = Math.min(0.1, (now - lastTime) / 1000);
  lastTime = now;

  if (currentScreen === 'game' && G && !G.over) {
    if (!G.paused) update(dt * speed);
    // Redraw about 15 times a second, or straight away if something important changed.
    // (While the flashlight is on, every frame, so the light keeps up with the mouse.)
    sinceRender += dt;
    if (!G.over && (dirty || flashOn() || G.bnt.active || sinceRender > 1 / 15)) {
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
//   asciiNights.state         look at everything about the current night
//   asciiNights.speed = 20    make time pass 20 times faster
//   asciiNights.state.t = 179 jump to one second before 6 AM
window.asciiNights = {
  get state() { return G; },
  get speed() { return speed; },
  set speed(v) { speed = Math.max(0.1, Number(v) || 1); },
};

// Start everything: build the custom night rows, set the sound button and show the title.
// (The loop doesn't start yet: startNight in game.js wakes it when a night begins.)
function boot() {
  $('titleTags').innerHTML = SETUP.map(c => iconHtml(c)).join('');   // the row of character faces on the title
  buildSetup();
  renderMute();
  show('title');
}
boot();
