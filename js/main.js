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

let speed = 1;   // 1 = normal speed. Raise it to fast-forward when testing (see nightShift below).

let lastTime = performance.now();
let sinceRender = 0;

function loop(now) {
  // Seconds since the last frame. Capped at 0.1 so that if the computer stalls (or the tab
  // was in the background), the game doesn't jump ahead by a huge amount in one go.
  const dt = Math.min(0.1, (now - lastTime) / 1000);
  lastTime = now;

  if (currentScreen === 'game' && G && !G.over) {
    if (!G.paused) update(dt * speed);
    // Redraw about 15 times a second, or straight away if something important changed.
    sinceRender += dt;
    if (!G.over && (dirty || sinceRender > 1 / 15)) {
      renderGame(now);
      dirty = false;
      sinceRender = 0;
    }
  }
  requestAnimationFrame(loop);
}

// A testing helper you can use from the browser's developer console:
//   nightShift.state         look at everything about the current night
//   nightShift.speed = 20    make time pass 20 times faster
//   nightShift.state.t = 179 jump to one second before 6 AM
window.nightShift = {
  get state() { return G; },
  get speed() { return speed; },
  set speed(v) { speed = Math.max(0.1, Number(v) || 1); },
};

// Start everything: build the custom night rows, set the sound button, show the title, start the loop.
function boot(data) {
  // When the Claude artifact viewer swaps in a new version of the page, it hands back the levels.
  if (data && Array.isArray(data.levels) && data.levels.length === SETUP.length) levels = data.levels.map(clampLevel);
  buildSetup();
  renderMute();
  show('title');
  analytics.start();   // Google Analytics, only on the public website (see analytics.js)
  requestAnimationFrame(loop);
}

// window.claude?.hot only exists inside the Claude artifact viewer, where it keeps your levels
// when a new version of the page is published. Opened anywhere else, we simply call boot().
// (The ?. means "only if this exists", so these lines never crash outside the viewer.)
try { window.claude?.hot?.snapshot?.(() => ({ levels })); } catch {}
window.claude?.hot?.ready ? window.claude.hot.ready(boot) : boot(window.claude?.hot?.data ?? {});
