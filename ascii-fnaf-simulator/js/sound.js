/* =====================================================================
   sound.js: every sound effect, made from scratch in code.

   There are no sound files. The browser's Web Audio API lets us build
   sounds out of two raw ingredients:
     tone()   a pure note from an "oscillator" (like a synthesizer key)
     noise()  random hiss, filtered to sound like thuds, static or rumble
   Each effect below (door slam, laugh, music box...) is a recipe that
   mixes a few tones and noises. None of them copies a sound or song
   from the real games: they're all made up here. (The engine part at
   the top is the same as in ASCII FNAF: Line 1.)

   Everything goes through one "master" volume knob, which is how the
   mute button works.

   Other files just call things like sfx.door('L') or sfx.caught().
   ===================================================================== */

const sfx = (() => {
  // This whole file is wrapped in (() => { ... })(), a function that runs
  // once straight away. Variables inside it (ctx, master...) are private:
  // other files can only use what we `return` at the bottom.

  let ctx = null;       // the audio engine; browsers only allow it after a click or key press
  let master = null;    // the master volume knob
  let hum = null;       // the background hum while you play
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
  //   freq + type choose the filter: 'lowpass' keeps the deep part (thuds, rumble),
  //   'highpass' keeps the sharp part (static, crackle).
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

  // Which speaker a side's sounds come from: the left door, the right door, or the middle (vent).
  const panOf = side => side === 'L' ? -0.8 : side === 'R' ? 0.8 : 0;

  // Everything below is what other files can use: sfx.init(), sfx.door('L'), ...
  return {
    init,
    panOf,
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

    // ----- menus -----
    click() { tone(900, 0.03, { vol: 0.05 }); },
    deny() { tone(120, 0.15, { type: 'sawtooth', vol: 0.12 }); },          // "can't do that"
    select() { tone(660, 0.05, { type: 'triangle', vol: 0.08 }); },

    // ----- your animatronics -----
    // A heavy footstep. `near` (0 to 1) makes it louder, `pan` puts it left or right.
    step(near = 0.5, pan = 0) {
      noise(0.12, { vol: 0.12 + 0.25 * near, freq: 260, pan });
      tone(55, 0.12, { type: 'sine', vol: 0.1 + 0.2 * near, slide: -15, pan });
    },
    // A clank in the vents.
    vent() {
      tone(330, 0.18, { type: 'square', vol: 0.08, slide: -120, pan: 0.4 });
      noise(0.15, { vol: 0.12, freq: 1800, type: 'highpass', pan: 0.4 });
    },
    // You started an attack: a rising creak from that side.
    attack(side) {
      tone(110, 0.6, { type: 'sawtooth', vol: 0.16, slide: 160, pan: panOf(side) });
      noise(0.3, { vol: 0.15, freq: 700, pan: panOf(side), delay: 0.1 });
    },
    // An ability was used: a ghostly swoosh.
    ability() {
      tone(300, 0.35, { type: 'triangle', vol: 0.12, slide: 500 });
      noise(0.35, { vol: 0.08, freq: 2500, type: 'highpass' });
    },
    // Foxy running down the west hall.
    run() {
      for (let i = 0; i < 6; i++) noise(0.07, { vol: 0.3, freq: 380, pan: -0.8, delay: i * 0.13 });
    },
    // Freddy's laugh: three low "ho"s.
    laugh() {
      [0, 0.22, 0.44].forEach((d, i) => tone(190 - i * 15, 0.2, { type: 'sawtooth', vol: 0.14, slide: -40, delay: d }));
    },
    // Chica's pots and pans.
    clatter() {
      for (let i = 0; i < 5; i++) tone(700 + Math.random() * 900, 0.08, { type: 'square', vol: 0.07, delay: i * 0.09, pan: 0.6 });
    },
    // Static: Bonnie's camera, Mangle's radio, Phantom Freddy breaking the cameras.
    stat() { noise(0.5, { vol: 0.12, freq: 2600, type: 'highpass' }); },
    // Balloon Boy's "Hi!" (two bright chirps).
    hi() { tone(880, 0.1, { type: 'triangle', vol: 0.15 }); tone(1175, 0.15, { type: 'triangle', vol: 0.15, delay: 0.12 }); },
    // A short sting (Phantom BB's jumpscare on the guard's monitor).
    sting() { tone(1200, 0.4, { type: 'sawtooth', vol: 0.15, slide: -700 }); noise(0.4, { vol: 0.15, freq: 4000 }); },
    // A few notes of a music box tune (made up here). `slow` plays it slower and lower, for unwinding.
    musicBox(slow = false) {
      const notes = [784, 659, 698, 587, 659, 523];
      notes.forEach((f, i) => tone(slow ? f * 0.8 : f, 0.3, { type: 'triangle', vol: 0.06, delay: i * (slow ? 0.24 : 0.16) }));
    },

    // ----- the guard -----
    door(side) {
      noise(0.25, { vol: 0.45, freq: 420, pan: panOf(side) });
      tone(75, 0.25, { type: 'sine', vol: 0.4, slide: -35, pan: panOf(side) });
    },
    knock(side) {
      [0, 0.16, 0.32].forEach(d => noise(0.08, { vol: 0.35, freq: 300, pan: panOf(side), delay: d }));
    },
    cam() { tone(1500, 0.04, { vol: 0.04 }); },
    flash() { tone(2000, 0.08, { type: 'square', vol: 0.06 }); noise(0.1, { vol: 0.08, freq: 5000, type: 'highpass' }); },
    shock() {
      for (let i = 0; i < 4; i++) noise(0.06, { vol: 0.2, freq: 3500, type: 'highpass', delay: i * 0.06 });
      tone(90, 0.3, { type: 'sawtooth', vol: 0.15 });
    },
    lure() { tone(520, 0.12, { type: 'square', vol: 0.06 }); tone(420, 0.12, { type: 'square', vol: 0.06, delay: 0.14 }); },
    mask() { noise(0.12, { vol: 0.2, freq: 300 }); },
    reboot() { [400, 600, 800].forEach((f, i) => tone(f, 0.08, { type: 'square', vol: 0.05, delay: i * 0.1 })); },
    // A death coin: a bright coin "ching", then a low falling note as the animatronic is taken away.
    coin() {
      tone(1320, 0.12, { type: 'square', vol: 0.08 });
      tone(1760, 0.3, { type: 'triangle', vol: 0.1, delay: 0.1 });
      tone(220, 0.8, { type: 'sawtooth', vol: 0.12, slide: -160, delay: 0.3 });
    },
    // Lockdown: a heavy electric buzz.
    lockdown() {
      tone(70, 0.7, { type: 'square', vol: 0.12 });
      noise(0.7, { vol: 0.1, freq: 900 });
    },

    // ----- big moments -----
    powerDown() { tone(440, 1.8, { type: 'sawtooth', vol: 0.14, slide: -400 }); },
    // You caught the guard.
    caught() {
      tone(880, 1.3, { type: 'sawtooth', vol: 0.3, slide: -520 });
      tone(935, 1.3, { type: 'square', vol: 0.16, slide: -610 });
      noise(1.3, { vol: 0.4, freq: 5000 });
    },
    // 6 AM: the guard made it. A few bells (our own notes).
    sixAm() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.7, { type: 'triangle', vol: 0.18, delay: i * 0.22 })); },

    // ----- background hum (the building at night) -----
    humOn() {
      if (!ctx || hum) return;
      const osc = ctx.createOscillator(), filter = ctx.createBiquadFilter(), gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.value = 55;
      filter.type = 'lowpass';
      filter.frequency.value = 150;
      gain.gain.value = 0.03;
      osc.connect(filter).connect(gain).connect(master);
      osc.start();
      hum = osc;
    },
    humOff() {
      if (hum) { try { hum.stop(); } catch {} hum = null; }
    },
  };
})();
