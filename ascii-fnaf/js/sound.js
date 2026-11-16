/* =====================================================================
   sound.js: every sound effect, made from scratch in code.

   There are no sound files. The browser's Web Audio API lets us build
   sounds out of two raw ingredients:
     tone()   a pure note from an "oscillator" (like a synthesizer key)
     noise()  random hiss, filtered to sound like thuds, static or rumble
   Each effect below (door slam, laugh, scream...) is a recipe that
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
  let hum = null;       // the background electrical hum while you play
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
    cam() { tone(1500, 0.04, { vol: 0.07 }); noise(0.14, { vol: 0.1, freq: 3200, type: 'highpass' }); },
    stat() { noise(0.3, { vol: 0.09, freq: 2600, type: 'highpass' }); },   // camera static
    // Putting the mask on (muffled thump) or taking it off (lighter click).
    mask(on) { on ? noise(0.15, { vol: 0.35, freq: 300 }) : tone(600, 0.05, { vol: 0.08 }); },

    // ----- doors -----
    // Something gave up at a shut door: one hollow BONK.
    bonk(side) {
      tone(180, 0.18, { type: 'triangle', vol: 0.5, slide: -90, pan: panOf(side) });
      noise(0.12, { vol: 0.5, freq: 500, pan: panOf(side) });
    },
    // Something in a doorway, trying to get in: a thud, a rattling handle and a creak.
    arrive(side, pitch = 110) {
      const pan = panOf(side);
      tone(60, 0.22, { type: 'sine', vol: 0.8, pan });                       // thud
      for (let i = 0; i < 4; i++) {                                           // rattle, rattle...
        noise(0.05, { vol: 0.45, freq: 2500, type: 'highpass', delay: 0.12 + i * 0.07, pan });
      }
      tone(pitch * 2, 0.5, { type: 'sawtooth', vol: 0.18, slide: pitch * 2, delay: 0.1, pan });   // creak
    },
    // Walking a room closer. progress goes from 0 (at the stage) to 1 (at your door):
    // quiet and centered far away, loud and to one side when close.
    step(progress, side, pitch = 90) {
      const vol = Math.min(1, 0.04 + 0.55 * progress * progress);
      const pan = panOf(side) * progress;
      tone(pitch, 0.18, { type: 'sine', vol, slide: -pitch * 0.3, pan });
      noise(0.08, { vol: vol * 0.6, freq: 250 + 600 * progress, pan });
    },

    // ----- Freddy -----
    // A deep "ho-ho-ho" laugh from the side he's heading to. n = 1, 2 or 3: each one is louder and
    // further to that side, so you can tell how close he is.
    laugh(n, side) {
      const vol = 0.1 + n * 0.12, pan = (side === 'L' ? -1 : 1) * 0.3 * n;
      for (let i = 0; i < 3; i++) {
        tone(150 - i * 12, 0.2, { type: 'sawtooth', vol, slide: -50, delay: i * 0.22, pan });
        tone(75 - i * 6, 0.2, { type: 'sine', vol: vol * 0.8, delay: i * 0.22, pan });
      }
    },

    // ----- Foxy -----
    // Leaving the cove: fast, heavy running steps toward the left door.
    run() { for (let i = 0; i < 8; i++) noise(0.07, { vol: 0.15 + i * 0.06, freq: 600, delay: i * 0.3, pan: -0.3 - i * 0.07 }); },
    // Slamming into the shut left door.
    bang() {
      noise(0.4, { vol: 0.9, freq: 300, pan: -0.8 });
      tone(55, 0.4, { type: 'sine', vol: 0.7, slide: -20, pan: -0.8 });
      for (let i = 0; i < 3; i++) noise(0.08, { vol: 0.5, freq: 1500, type: 'highpass', delay: 0.15 + i * 0.12, pan: -0.8 });
    },
    // Flashed back behind the curtain: a quick swish.
    foxyBack() { noise(0.25, { vol: 0.2, freq: 1800, type: 'highpass' }); tone(500, 0.2, { type: 'triangle', vol: 0.08, slide: -250 }); },

    // ----- Golden Freddy -----
    // A low, wobbling whisper that seems to come from right in front of you.
    goldenIn() {
      noise(1.0, { vol: 0.3, freq: 700 });
      tone(55, 1.0, { type: 'sawtooth', vol: 0.25, slide: -15 });
      tone(58, 1.0, { type: 'sine', vol: 0.25, slide: 20 });
    },
    goldenOut() { tone(220, 0.5, { type: 'sine', vol: 0.15, slide: -180 }); },

    // ----- the vents -----
    // A crawler moving one vent closer: a metal clank, louder the closer it is (progress 0 far ... 1 near).
    ventMove(progress) {
      const vol = 0.05 + 0.35 * progress;
      tone(320 + 200 * progress, 0.08, { type: 'square', vol: vol * 0.5, pan: 0.5 * progress });
      noise(0.12, { vol, freq: 1400, type: 'highpass', pan: 0.5 * progress });
    },
    // Something reached V15, right next to your office: a loud BANG in the vent.
    ventNear() {
      noise(0.35, { vol: 0.8, freq: 900 });
      tone(90, 0.35, { type: 'square', vol: 0.3, slide: -40 });
      noise(0.2, { vol: 0.4, freq: 3000, type: 'highpass', delay: 0.05 });
    },
    // Freddy Endo shuffling around: a quiet, far-away clink.
    endoMove() { tone(700, 0.06, { type: 'triangle', vol: 0.06 }); noise(0.08, { vol: 0.06, freq: 2000, type: 'highpass', delay: 0.04 }); },
    // A crawler climbing into your office. Each one has its own voice (pitch).
    ventIn(pitch = 300) {
      noise(0.3, { vol: 0.6, freq: 800 });
      tone(pitch, 0.5, { type: 'sawtooth', vol: 0.2, slide: pitch, delay: 0.15 });
      tone(pitch * 1.5, 0.4, { type: 'square', vol: 0.08, slide: pitch, delay: 0.3 });
    },
    // Fooled by the mask: a puzzled falling sound as it crawls back in.
    ventOut(pitch = 300) {
      tone(pitch * 2, 0.5, { type: 'triangle', vol: 0.2, slide: -pitch * 1.5 });
      noise(0.3, { vol: 0.2, freq: 1500, type: 'highpass', delay: 0.3 });
    },
    // BB climbing in: a cheerful (creepy) two-note "hel-lo" and a giggle.
    bbIn() {
      tone(660, 0.18, { type: 'square', vol: 0.15 });
      tone(880, 0.25, { type: 'square', vol: 0.15, delay: 0.2 });
      for (let i = 0; i < 4; i++) tone(1100 + i * 80, 0.06, { type: 'triangle', vol: 0.12, delay: 0.5 + i * 0.08 });
    },
    // BB running off with your flashlight: a giggle that runs away.
    bbSteal() { for (let i = 0; i < 6; i++) tone(1300 - i * 90, 0.07, { type: 'triangle', vol: 0.16, delay: i * 0.08 }); },
    // An audio lure: a short, tinny voice clip from the vent speaker.
    lure() {
      tone(520, 0.12, { type: 'square', vol: 0.1 });
      tone(780, 0.12, { type: 'square', vol: 0.1, delay: 0.14 });
      tone(650, 0.18, { type: 'square', vol: 0.1, delay: 0.28 });
    },

    // ----- Toy Freddy -----
    toyFreddyIn() {
      noise(0.6, { vol: 0.3, freq: 400 });
      tone(70, 0.8, { type: 'sawtooth', vol: 0.3, slide: 25 });
      tone(140, 0.5, { type: 'square', vol: 0.08, delay: 0.25 });
    },
    toyFreddyOut() { tone(130, 0.6, { type: 'sine', vol: 0.25, slide: -80 }); },

    // ----- Mangle -----
    // Mangle's broken radio: a burst of garbled static and beeps. Plays while they crawl across.
    mangleRadio(pan) {
      noise(0.25, { vol: 0.15, freq: 2500, type: 'highpass', pan });
      for (let i = 0; i < 3; i++) tone(400 + Math.random() * 900, 0.05, { type: 'square', vol: 0.06, delay: i * 0.07, pan });
    },
    // Flashed: a sharp, screechy jolt.
    mangleHit() { tone(1600, 0.12, { type: 'sawtooth', vol: 0.15, slide: -1200 }); },
    mangleOut() { noise(0.5, { vol: 0.2, freq: 1500, type: 'highpass' }); tone(300, 0.5, { type: 'triangle', vol: 0.1, slide: -200 }); },

    // ----- the Puppet's music box -----
    // Winding it all the way up in one go: a fast run of ticks.
    windUp() { for (let i = 0; i < 8; i++) tone(2000 + i * 60, 0.025, { vol: 0.06, delay: i * 0.035 }); },
    boxWarn() {
      tone(1568, 0.25, { type: 'triangle', vol: 0.12 });
      tone(1175, 0.3, { type: 'triangle', vol: 0.12, delay: 0.2 });
    },
    // The box running out: a tinny tune that speeds up and gets louder, right before the Puppet comes.
    boxTune() {
      const notes = [523, 659, 784, 659, 523, 587, 698, 587, 523, 494, 523, 392];
      let t = 0;
      notes.forEach((freq, i) => {
        tone(freq, 0.3, { type: 'triangle', vol: 0.1 + i * 0.02, delay: t });
        t += 0.42 - i * 0.022;   // each gap a little shorter than the last
      });
    },

    // ----- Toy cupcake -----
    // Its warning beep: a sharp electronic chirp, every half second until you tap it.
    cupBeep() { tone(2093, 0.06, { type: 'square', vol: 0.12 }); },
    pop() { tone(500, 0.08, { type: 'sine', vol: 0.3, slide: 700 }); },

    // ----- the shadows -----
    // Shadow Freddy turning up somewhere on the cameras: a long, low breath.
    shadowFreddyIn() { noise(1.4, { vol: 0.18, freq: 250 }); tone(45, 1.4, { type: 'sine', vol: 0.2, slide: 10 }); },
    shadowFreddyOut() { tone(300, 0.4, { type: 'sine', vol: 0.12, slide: -250 }); },
    // Shadow Bonnie: the office lights dying with a buzz.
    lightsOff() {
      tone(120, 0.6, { type: 'sawtooth', vol: 0.2, slide: -90 });
      for (let i = 0; i < 3; i++) noise(0.05, { vol: 0.3, freq: 3000, type: 'highpass', delay: i * 0.12 });
    },
    lightsOn() { tone(60, 0.3, { type: 'sawtooth', vol: 0.15, slide: 60 }); tone(900, 0.1, { type: 'sine', vol: 0.08, delay: 0.2 }); },

    // ----- the Crying Child -----
    // Quiet sobbing while you watch his camera; `fear` (0 to 1) makes it louder and higher.
    sob(fear) {
      const vol = 0.06 + 0.25 * fear;
      tone(500 + 200 * fear, 0.35, { type: 'triangle', vol, slide: -180 });
      tone(450 + 200 * fear, 0.3, { type: 'triangle', vol: vol * 0.7, slide: -150, delay: 0.38 });
    },

    // ----- big moments -----
    powerDown() { tone(440, 1.8, { type: 'sawtooth', vol: 0.14, slide: -400 }); },
    scream() {
      tone(880, 1.3, { type: 'sawtooth', vol: 0.32, slide: -520 });
      tone(935, 1.3, { type: 'square', vol: 0.18, slide: -610 });
      noise(1.3, { vol: 0.45, freq: 5000 });
    },
    // BB's jumpscare when he takes the flashlight: shorter, because it doesn't end the night.
    miniScream() {
      tone(990, 0.6, { type: 'sawtooth', vol: 0.25, slide: -500 });
      noise(0.6, { vol: 0.35, freq: 5000 });
    },
    chime() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.7, { type: 'triangle', vol: 0.2, delay: i * 0.22 })); },

    // ----- background hum (the office lights) -----
    humOn() {
      if (!ctx || hum) return;
      const osc = ctx.createOscillator(), filter = ctx.createBiquadFilter(), gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.value = 60;     // 60 Hz: the buzz of mains electricity
      filter.type = 'lowpass';
      filter.frequency.value = 170;
      gain.gain.value = 0.035;
      osc.connect(filter).connect(gain).connect(master);
      osc.start();
      hum = osc;
    },
    humOff() {
      if (hum) { try { hum.stop(); } catch {} hum = null; }
    },
  };
})();
