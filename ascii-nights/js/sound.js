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
    flash() { tone(2600, 0.03, { vol: 0.05 }); noise(0.05, { vol: 0.05, freq: 4000, type: 'highpass' }); },
    fan(on) { tone(on ? 180 : 140, 0.25, { type: 'sawtooth', vol: 0.07, slide: on ? 120 : -100 }); },
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
    // A deep "ho-ho-ho" laugh, louder and further to the right with each one (n = 1, 2 or 3).
    laugh(n) {
      const vol = 0.12 + n * 0.1, pan = 0.25 * n;
      for (let i = 0; i < 3; i++) {
        tone(150 - i * 12, 0.2, { type: 'sawtooth', vol, slide: -50, delay: i * 0.22, pan });
        tone(75 - i * 6, 0.2, { type: 'sine', vol: vol * 0.8, delay: i * 0.22, pan });
      }
    },

    // ----- Golden Freddy -----
    // A low, wobbling whisper that seems to come from right in front of you.
    goldenIn() {
      noise(1.0, { vol: 0.3, freq: 700 });
      tone(55, 1.0, { type: 'sawtooth', vol: 0.25, slide: -15 });
      tone(58, 1.0, { type: 'sine', vol: 0.25, slide: 20 });
    },
    goldenOut() { tone(220, 0.5, { type: 'sine', vol: 0.15, slide: -180 }); },

    // ----- Phantom Chica -----
    // She appears: a crackling, burnt squawk.
    chicaIn() {
      tone(700, 0.25, { type: 'sawtooth', vol: 0.15, slide: 300 });
      noise(0.4, { vol: 0.2, freq: 3500, type: 'highpass', delay: 0.05 });
    },
    // A shadow cupcake clicked away: a little pop.
    pop() { tone(500, 0.08, { type: 'sine', vol: 0.3, slide: 700 }); },
    // All the cupcakes found: she fades with a falling crackle.
    chicaOut() { noise(0.4, { vol: 0.15, freq: 2500, type: 'highpass' }); tone(400, 0.4, { type: 'triangle', vol: 0.1, slide: -300 }); },

    // ----- Bonnet -----
    // A silly two-note squeak from the side she starts on.
    bonnetIn(pan) { tone(988, 0.1, { type: 'square', vol: 0.12, pan }); tone(1319, 0.12, { type: 'square', vol: 0.12, delay: 0.1, pan }); },
    // Booping her nose: a honk.
    boop() { tone(440, 0.15, { type: 'square', vol: 0.2, slide: 220 }); tone(660, 0.15, { type: 'square', vol: 0.12, delay: 0.02 }); },

    // ----- Withered Bonnie -----
    // He's in your office: a heavy, broken breath and a buzzing groan.
    witheredIn() {
      noise(0.9, { vol: 0.35, freq: 500 });
      tone(48, 0.9, { type: 'sawtooth', vol: 0.3, slide: 18 });
      tone(96, 0.6, { type: 'square', vol: 0.08, delay: 0.2 });
    },
    witheredOut() { tone(110, 0.6, { type: 'sine', vol: 0.25, slide: -70 }); },

    // ----- the Puppet's music box -----
    windTick() { for (let i = 0; i < 3; i++) tone(2300, 0.025, { vol: 0.06, delay: i * 0.05 }); },
    boxWarn() {
      tone(1568, 0.25, { type: 'triangle', vol: 0.12 });
      tone(1175, 0.3, { type: 'triangle', vol: 0.12, delay: 0.2 });
    },
    // The box running out: a tinny tune that speeds up and gets louder, right before the Puppet comes.
    boxTune() {
      const notes = [659, 587, 523, 587, 659, 659, 659, 587, 587, 659, 784, 784];
      let t = 0;
      notes.forEach((freq, i) => {
        tone(freq, 0.3, { type: 'triangle', vol: 0.1 + i * 0.02, delay: t });
        t += 0.42 - i * 0.022;   // each gap a little shorter than the last
      });
    },

    // ----- the Nightmare staff bot -----
    // Its warning: two sharp electronic beeps from the side its arrow points to.
    blink(side) {
      tone(1760, 0.07, { type: 'square', vol: 0.14, pan: panOf(side) * 0.6 });
      tone(1760, 0.07, { type: 'square', vol: 0.14, delay: 0.12, pan: panOf(side) * 0.6 });
    },

    // ----- Nightmare Freddy and his Freddles -----
    // A new Freddle on the desk: a tiny, creepy giggle.
    freddle() { [880, 1046, 932].forEach((f, i) => tone(f, 0.08, { type: 'triangle', vol: 0.12, slide: -100, delay: i * 0.08 })); },
    // A Freddle shooed away by the light.
    freddleOff() { tone(1200, 0.12, { type: 'triangle', vol: 0.12, slide: -900 }); },
    // Nightmare Freddy himself: a huge, low growl.
    nightmareIn() {
      noise(1.2, { vol: 0.6, freq: 180 });
      tone(40, 1.2, { type: 'sawtooth', vol: 0.5, slide: -10 });
      tone(80, 1.0, { type: 'square', vol: 0.1, slide: -30 });
    },
    nightmareOut() { tone(90, 0.8, { type: 'sine', vol: 0.25, slide: -60 }); },

    // ----- Withered Foxy -----
    // Leaving the cove: fast, heavy running steps toward the left door.
    run() { for (let i = 0; i < 8; i++) noise(0.07, { vol: 0.15 + i * 0.06, freq: 600, delay: i * 0.17, pan: -0.3 - i * 0.07 }); },
    // Slamming into the shut left door.
    bang() {
      noise(0.4, { vol: 0.9, freq: 300, pan: -0.8 });
      tone(55, 0.4, { type: 'sine', vol: 0.7, slide: -20, pan: -0.8 });
      for (let i = 0; i < 3; i++) noise(0.08, { vol: 0.5, freq: 1500, type: 'highpass', delay: 0.15 + i * 0.12, pan: -0.8 });
    },
    // Waiting behind the door: two heavy stomps. That's your cue to open up and flash him.
    stomp() {
      for (let i = 0; i < 2; i++) {
        tone(45, 0.25, { type: 'sine', vol: 0.8, delay: i * 0.35, pan: -0.8 });
        noise(0.2, { vol: 0.5, freq: 200, delay: i * 0.35, pan: -0.8 });
      }
    },
    // Flashed in the doorway: a sharp electric zap.
    zap() { tone(1800, 0.1, { type: 'sawtooth', vol: 0.15, slide: -1500, pan: -0.8 }); },
    // Shut out after the flash: he backs off, grumbling.
    retreat() { tone(160, 0.6, { type: 'sawtooth', vol: 0.15, slide: -100, pan: -0.8 }); },

    // ----- Sleepy Moon -----
    // Getting drowsy: a soft, slow, falling hum. Plays when the sleep meter passes 50% and 80%.
    yawn() { tone(330, 1.2, { type: 'sine', vol: 0.12, slide: -160 }); tone(165, 1.2, { type: 'sine', vol: 0.08, slide: -80 }); },

    // ----- the Flamethrower endo -----
    // The flamethrower lighting up: a big whoosh.
    flameOn() { noise(0.9, { vol: 0.6, freq: 1200 }); tone(90, 0.9, { type: 'sawtooth', vol: 0.15, slide: 60 }); },
    // While he's there: a crackle every so often.
    crackle() { for (let i = 0; i < 4; i++) noise(0.03, { vol: 0.2, freq: 3000, type: 'highpass', delay: Math.random() * 0.4 }); },
    flameOff() { noise(0.6, { vol: 0.3, freq: 700 }); tone(140, 0.5, { type: 'sine', vol: 0.1, slide: -100 }); },

    // ----- big moments -----
    powerDown() { tone(440, 1.8, { type: 'sawtooth', vol: 0.14, slide: -400 }); },
    scream() {
      tone(880, 1.3, { type: 'sawtooth', vol: 0.32, slide: -520 });
      tone(935, 1.3, { type: 'square', vol: 0.18, slide: -610 });
      noise(1.3, { vol: 0.45, freq: 5000 });
    },
    // Phantom Chica's jumpscare: shorter than a real one, because it doesn't end the night.
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
