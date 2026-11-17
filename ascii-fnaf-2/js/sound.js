/* =====================================================================
   sound.js: every sound effect, made from scratch in code.

   There are no sound files. The browser's Web Audio API lets us build
   sounds out of two raw ingredients:
     tone()   a pure note from an "oscillator" (like a synthesizer key)
     noise()  random hiss, filtered to sound like thuds, static or rumble
   Each effect below (door slam, breathing, scream...) is a recipe that
   mixes a few tones and noises. None of them copies a sound or song
   from the real games: they're all made up here.

   Everything goes through one "master" volume knob, which is how the
   mute button works.

   Other files just call things like sfx.door('L') or sfx.scream().
   ===================================================================== */

const sfx = (() => {
  // This whole file is wrapped in (() => { ... })(), a function that runs
  // once straight away. Variables inside it (ctx, master...) are private:
  // other files can only use what we `return` at the bottom.

  let ctx = null;       // the audio engine; browsers only allow it after a click or key press
  let master = null;    // the master volume knob
  let hum = null;       // the background machinery hum while you play
  let noiseBuf = null;  // 2 seconds of random hiss, made once and reused
  let muted = store.get('muted', false);
  const VOL = 0.6;      // master volume when not muted

  // Start the audio engine. Called on the first click or key press.
  function init() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return;
    }
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : VOL;
      master.connect(ctx.destination);   // destination = your speakers
    } catch {
      ctx = null;                        // no audio support: the game simply stays silent
    }
  }

  // Send a sound to the speakers, optionally panned left (-1) or right (+1).
  function out(node, pan) {
    if (pan && ctx.createStereoPanner) {
      const panner = ctx.createStereoPanner();
      panner.pan.value = pan;
      node.connect(panner).connect(master);
    } else {
      node.connect(master);
    }
  }

  // Play one note.
  //   freq   pitch in Hz (higher = higher note; 440 is the A above middle C)
  //   dur    seconds
  //   type   the wave shape: 'sine' is smooth, 'square' and 'sawtooth' are buzzy
  //   vol    loudness, 0 to 1
  //   slide  how far the pitch bends during the note (negative = down)
  //   delay  seconds to wait before playing
  //   pan    -1 left ... 0 middle ... +1 right
  function tone(freq, dur, { type = 'square', vol = 0.2, slide = 0, delay = 0, pan = 0 } = {}) {
    if (!ctx) return;
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur);
    // Start loud and fade to (almost) silence: that fade is what makes it sound like a "hit".
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain);
    out(gain, pan);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  // Play a burst of filtered hiss.
  //   freq + type choose the filter: 'lowpass' keeps the deep part (thuds, rumble, breath),
  //   'highpass' keeps the sharp part (static, crackle, hiss).
  function noise(dur, { vol = 0.2, freq = 1000, type = 'lowpass', delay = 0, pan = 0 } = {}) {
    if (!ctx) return;
    if (!noiseBuf) {
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const data = noiseBuf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    const t = ctx.currentTime + delay;
    const src = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), gain = ctx.createGain();
    src.buffer = noiseBuf;
    filter.type = type;
    filter.frequency.value = freq;
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter).connect(gain);
    out(gain, pan);
    src.start(t);
    src.stop(t + dur + 0.05);
  }

  // Which speaker a door's sounds come from.
  const panOf = side => side === 'L' ? -0.8 : 0.8;

  // Everything below is what other files can use: sfx.init(), sfx.door('L'), ...
  return {
    init,
    get muted() { return muted; },
    // Put the audio engine to sleep while the page is hidden (another tab or window is in front),
    // and wake it when you come back. A sleeping engine uses no computer power.
    sleep() { if (ctx && ctx.state === 'running') ctx.suspend(); },
    wake() { if (ctx && ctx.state === 'suspended') ctx.resume(); },
    toggleMute() {
      muted = !muted;
      store.set('muted', muted);
      if (master) master.gain.value = muted ? 0 : VOL;
    },

    // ----- menus and controls -----
    click() { tone(900, 0.03, { vol: 0.05 }); },
    deny() { tone(120, 0.15, { type: 'sawtooth', vol: 0.12 }); },          // "can't do that"
    door(side) {
      noise(0.25, { vol: 0.55, freq: 420, pan: panOf(side) });
      tone(75, 0.25, { type: 'sine', vol: 0.5, slide: -35, pan: panOf(side) });
    },
    // The heavy door: a slower, deeper slam with a metal clang at the end.
    heavyDoor(side) {
      const pan = panOf(side);
      noise(0.5, { vol: 0.7, freq: 260, pan });
      tone(48, 0.5, { type: 'sine', vol: 0.7, slide: -18, pan });
      tone(210, 0.35, { type: 'square', vol: 0.08, slide: -60, delay: 0.25, pan });
    },
    ventDoor() { noise(0.2, { vol: 0.4, freq: 900 }); tone(300, 0.15, { type: 'square', vol: 0.06, slide: -120 }); },
    // Walking to a door to listen, and back to the desk.
    walk(side) { for (let i = 0; i < 3; i++) noise(0.06, { vol: 0.12, freq: 500, delay: i * 0.13, pan: side ? panOf(side) * 0.5 : 0 }); },
    cam() { tone(1500, 0.04, { vol: 0.07 }); noise(0.14, { vol: 0.1, freq: 3200, type: 'highpass' }); },
    stat() { noise(0.3, { vol: 0.09, freq: 2600, type: 'highpass' }); },   // camera static
    // Putting the mask on (muffled thump) or taking it off (lighter click).
    mask(on) { on ? noise(0.15, { vol: 0.35, freq: 300 }) : tone(600, 0.05, { vol: 0.08 }); },
    // The controlled shock: a sharp electric crack and a buzz.
    shock() {
      noise(0.12, { vol: 0.6, freq: 4000, type: 'highpass' });
      tone(1800, 0.25, { type: 'sawtooth', vol: 0.15, slide: -1500 });
      tone(60, 0.3, { type: 'square', vol: 0.15 });
    },
    // Shocked an empty camera: a flat fizzle.
    fizzle() { noise(0.2, { vol: 0.15, freq: 1500, type: 'highpass' }); tone(200, 0.2, { type: 'sawtooth', vol: 0.06, slide: -100 }); },

    // ----- doors and footsteps -----
    // Something ran into a shut door and gave up: a cartoon BONK (like Line 1).
    bonk(side) {
      const pan = panOf(side), d = 0.15;
      noise(0.04, { vol: 0.5, freq: 3000, type: 'highpass', delay: d, pan });
      tone(700, 0.12, { type: 'sine', vol: 0.6, slide: -380, delay: d, pan });
      tone(350, 0.3, { type: 'triangle', vol: 0.5, slide: -150, delay: d + 0.03, pan });
    },
    // A footstep. progress goes from 0 (far away) to 1 (at your door): louder and further to that side.
    step(progress, side, pitch = 90) {
      const vol = Math.min(1, 0.06 + 0.6 * progress * progress);
      const pan = panOf(side) * progress;
      tone(pitch, 0.2, { type: 'sine', vol, slide: -pitch * 0.3, pan });
      noise(0.1, { vol: vol * 0.7, freq: 250 + 600 * progress, pan });
    },
    // Heavy breathing behind a door (only heard when you're at that door, listening).
    breath(side, pitch = 100) {
      const pan = panOf(side);
      noise(0.9, { vol: 0.35, freq: 600 + pitch, pan });
      noise(0.7, { vol: 0.25, freq: 400 + pitch, delay: 0.95, pan });
      tone(pitch * 0.5, 0.8, { type: 'sine', vol: 0.06, delay: 0.1, pan });
    },
    // A nightmare walking away from the door after you outlasted it.
    leave(side) { for (let i = 0; i < 3; i++) noise(0.1, { vol: 0.3 - i * 0.09, freq: 300, delay: i * 0.3, pan: panOf(side) }); },

    // ----- Nightmare Foxy in the office -----
    // Bursting in from his side: a scrape and a snarl.
    foxyIn(side) {
      noise(0.4, { vol: 0.5, freq: 900, pan: panOf(side) });
      tone(110, 0.6, { type: 'sawtooth', vol: 0.3, slide: 60, pan: panOf(side) * 0.6 });
    },
    // Growing a stage: a growl that gets deeper and louder (`size` goes from 0 to 1).
    foxyGrow(size) {
      tone(160 - 70 * size, 0.5, { type: 'sawtooth', vol: 0.15 + 0.25 * size, slide: -40 });
      noise(0.4, { vol: 0.1 + 0.25 * size, freq: 500 });
    },

    // ----- Nightmare BB and the lamp -----
    // Waking up: a creepy little giggle from the corner of the office.
    nbbWake() { for (let i = 0; i < 5; i++) tone(700 + i * 60 + (i % 2) * 120, 0.08, { type: 'square', vol: 0.12, delay: i * 0.09, pan: 0.5 }); },
    // Back to sleep: a falling hum.
    nbbSleep() { tone(500, 0.5, { type: 'triangle', vol: 0.1, slide: -320, pan: 0.5 }); },
    // The desk lamp: a click and a short electric buzz.
    lamp() { tone(1200, 0.03, { vol: 0.12 }); tone(120, 0.3, { type: 'sawtooth', vol: 0.06, delay: 0.02 }); },

    // ----- Nightmare Freddy's Freddles -----
    freddle() {
      const pan = Math.random() < 0.5 ? -0.3 : 0.3;
      for (let i = 0; i < 3; i++) tone(900 + Math.random() * 300, 0.08, { type: 'triangle', vol: 0.1, delay: i * 0.09, pan });
    },

    // ----- Circus Baby -----
    // A soft, clean beep as she comes down the left hall (louder each step).
    babyBeep(progress) { tone(1320, 0.12, { type: 'sine', vol: 0.05 + 0.15 * progress, pan: -0.7 * progress }); },
    babyIn() { tone(660, 0.4, { type: 'sine', vol: 0.15, slide: 220, pan: -0.5 }); tone(990, 0.3, { type: 'sine', vol: 0.1, delay: 0.25, pan: -0.5 }); },
    babyClose() { tone(1760, 0.08, { type: 'sine', vol: 0.18 }); tone(1760, 0.08, { type: 'sine', vol: 0.18, delay: 0.12 }); },
    babyOut() { tone(880, 0.4, { type: 'sine', vol: 0.12, slide: -500 }); },

    // ----- Ballora -----
    // A few notes of her music-box waltz from her side; `progress` (0 to 1) makes it louder and nearer.
    ballora(progress, side) {
      const vol = 0.04 + 0.2 * progress, pan = panOf(side) * (0.3 + 0.7 * progress);
      [659, 784, 988, 784].forEach((f, i) => tone(f, 0.35, { type: 'triangle', vol, delay: i * 0.3, pan }));
    },

    // ----- Funtime Freddy -----
    // A line of his script: a cheerful (creepy) burble of a voice. Important lines are lower and louder.
    voice(important) {
      const base = important ? 140 : 220, vol = important ? 0.2 : 0.1;
      for (let i = 0; i < 5; i++) tone(base + Math.random() * 120, 0.09, { type: 'sawtooth', vol, delay: i * 0.1 });
    },
    // His steps toward a door, from that side.
    ffrStep(side, n) { tone(80, 0.2, { type: 'sine', vol: 0.3 + 0.2 * n, pan: panOf(side) * (0.4 + 0.3 * n) }); noise(0.1, { vol: 0.25, freq: 500, pan: panOf(side) }); },

    // ----- Funtime Foxy -----
    showtime() { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, 0.18, { type: 'square', vol: 0.08, delay: i * 0.12 })); },
    applause() { for (let i = 0; i < 10; i++) noise(0.04, { vol: 0.12, freq: 3000, type: 'highpass', delay: i * 0.06 + Math.random() * 0.03 }); },

    // ----- Ennard -----
    ennardClank(progress, side) { tone(300, 0.08, { type: 'square', vol: 0.1 + 0.2 * progress, pan: panOf(side) * progress }); noise(0.15, { vol: 0.1 + 0.25 * progress, freq: 2200, type: 'highpass', pan: panOf(side) * progress }); },
    ventCrawl() { for (let i = 0; i < 4; i++) noise(0.08, { vol: 0.25, freq: 1800, type: 'highpass', delay: i * 0.12 }); },

    // ----- the oxygen eaters -----
    minireena() { [1568, 1760, 2093].forEach((f, i) => tone(f, 0.1, { type: 'triangle', vol: 0.07, delay: i * 0.08 })); },
    nmtIn() { noise(1.2, { vol: 0.25, freq: 300 }); tone(41, 1.2, { type: 'sawtooth', vol: 0.25, slide: 10 }); },
    nmtHit() { tone(250, 0.3, { type: 'sawtooth', vol: 0.18, slide: -150 }); },
    smoke(side) { noise(1.0, { vol: 0.15, freq: 1200, type: 'highpass', pan: panOf(side) }); },
    plushIn() { for (let i = 0; i < 4; i++) tone(1200 - i * 100, 0.07, { type: 'triangle', vol: 0.1, delay: i * 0.1 }); },
    o2Warn() { tone(880, 0.12, { type: 'square', vol: 0.08 }); tone(880, 0.12, { type: 'square', vol: 0.08, delay: 0.2 }); },
    gone() { tone(400, 0.4, { type: 'triangle', vol: 0.1, slide: -250 }); },

    // ----- Withered Bonnie -----
    wbnIn() { noise(0.6, { vol: 0.3, freq: 350 }); tone(65, 0.8, { type: 'sawtooth', vol: 0.3, slide: 20 }); },

    // ----- Bidybab -----
    // A small rubbery squeak in the vent above you.
    squeak() { tone(2400, 0.06, { type: 'sine', vol: 0.15, slide: 600 }); tone(2000, 0.08, { type: 'sine', vol: 0.12, slide: -400, delay: 0.08 }); },

    // ----- Nightmare Cupcake and Nightmare Mangle -----
    chomp() { for (let i = 0; i < 3; i++) tone(180, 0.06, { type: 'square', vol: 0.1, delay: i * 0.12 }); },
    mangleRadio() {
      noise(0.25, { vol: 0.15, freq: 2500, type: 'highpass' });
      for (let i = 0; i < 3; i++) tone(400 + Math.random() * 900, 0.05, { type: 'square', vol: 0.06, delay: i * 0.07 });
    },

    // ----- the place itself -----
    // Now and then something far away in the building: a clank in the pipes, a drip, a distant door.
    ambient() {
      const kind = Math.floor(Math.random() * 3), pan = Math.random() * 1.6 - 0.8;
      if (kind === 0) { tone(110 + Math.random() * 60, 0.6, { type: 'triangle', vol: 0.05, slide: -30, pan }); noise(0.3, { vol: 0.05, freq: 900, pan }); }
      else if (kind === 1) tone(1800 + Math.random() * 600, 0.05, { type: 'sine', vol: 0.05, slide: -900, pan });
      else noise(0.8, { vol: 0.06, freq: 200, pan });
    },

    // ----- big moments -----
    powerDown() { tone(440, 1.8, { type: 'sawtooth', vol: 0.14, slide: -400 }); },
    scream() {
      tone(880, 1.3, { type: 'sawtooth', vol: 0.32, slide: -520 });
      tone(935, 1.3, { type: 'square', vol: 0.18, slide: -610 });
      noise(1.3, { vol: 0.45, freq: 5000 });
    },
    chime() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.7, { type: 'triangle', vol: 0.2, delay: i * 0.22 })); },

    // ----- background hum (machinery and air pumps, deep underground) -----
    humOn() {
      if (!ctx || hum) return;
      const osc = ctx.createOscillator(), filter = ctx.createBiquadFilter(), gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.value = 50;     // a low machine drone
      filter.type = 'lowpass';
      filter.frequency.value = 140;
      gain.gain.value = 0.045;
      osc.connect(filter).connect(gain).connect(master);
      osc.start();
      hum = osc;
    },
    humOff() {
      if (hum) { try { hum.stop(); } catch {} hum = null; }
    },
  };
})();
