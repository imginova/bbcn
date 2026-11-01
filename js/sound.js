/* =====================================================================
   sound.js: every sound effect, made from scratch in code.

   There are no sound files. The browser's Web Audio API lets us build
   sounds out of two raw ingredients:
     tone()   a pure note from an "oscillator" (like a synthesizer key)
     noise()  random hiss, filtered to sound like thuds, static or rumble
   Each effect below (door slam, footsteps, scream...) is a recipe that
   mixes a few tones and noises.

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
    toggleMute() {
      muted = !muted;
      store.set('muted', muted);
      if (master) master.gain.value = muted ? 0 : VOL;
    },

    // ----- menus and controls -----
    click() { tone(900, 0.03, { vol: 0.05 }); },
    deny() { tone(120, 0.15, { type: 'sawtooth', vol: 0.12 }); },          // "can't do that" (no power)
    door(side) {
      noise(0.25, { vol: 0.55, freq: 420, pan: panOf(side) });
      tone(75, 0.25, { type: 'sine', vol: 0.5, slide: -35, pan: panOf(side) });
    },
    cam() { tone(1500, 0.04, { vol: 0.07 }); noise(0.14, { vol: 0.1, freq: 3200, type: 'highpass' }); },
    stat() { noise(0.3, { vol: 0.09, freq: 2600, type: 'highpass' }); },   // camera static

    // ----- the shapes -----
    // ◆ or ▲ in the doorway, trying to get in. It sounds different from their footsteps on purpose,
    // and a bit louder: a thud on the door, the handle rattling, and a creak that rises from the
    // shape's own pitch (so ◆'s is lower than ▲'s). That's your cue to shut the door NOW.
    arrive(side, pitch) {
      const pan = panOf(side);
      tone(60, 0.22, { type: 'sine', vol: 0.8, pan });                       // thud
      for (let i = 0; i < 4; i++) {                                           // rattle, rattle, rattle, rattle
        noise(0.05, { vol: 0.45, freq: 2500, type: 'highpass', delay: 0.12 + i * 0.07, pan });
      }
      tone(pitch * 2, 0.5, { type: 'sawtooth', vol: 0.18, slide: pitch * 2, delay: 0.1, pan });   // creak
    },
    // A shape changing rooms. progress goes from 0 (at the stage) to 1 (at your door):
    // quiet and centered far away, loud and to one side when close.
    // progress * progress makes the volume climb slowly at first, then fast near the end.
    // loudness (from data.js) turns one shape up or down; Math.min keeps it from going over full volume.
    move(progress, side, pitch, loudness = 1) {
      const vol = Math.min(1, (0.03 + 0.55 * progress * progress) * loudness);
      const pan = panOf(side) * progress;
      tone(pitch, 0.18, { type: 'sine', vol, slide: -pitch * 0.3, pan });
      noise(0.08, { vol: vol * 0.6, freq: 250 + 600 * progress, pan });
    },
    // ● arriving at a door: a loud, low rolling rumble instead of footsteps.
    rumble(side) {
      const pan = panOf(side);
      noise(1.1, { vol: 1.0, freq: 160, pan });
      tone(42, 1.1, { type: 'sawtooth', vol: 0.6, slide: -14, pan });
      tone(330, 0.9, { type: 'square', vol: 0.12, slide: -240, pan });
    },
    // ● Patient waiting behind a shut door: a soft, low growl from its side every few seconds.
    lurk(side) {
      const pan = panOf(side);
      noise(0.7, { vol: 0.35, freq: 120, pan });
      tone(40, 0.7, { type: 'sawtooth', vol: 0.18, slide: -8, pan });
    },
    // Three knocks: a shape hit a closed door and went back to the stage.
    knock(side) {
      for (let i = 0; i < 3; i++) noise(0.12, { vol: 0.6, freq: 320, delay: i * 0.16, pan: panOf(side) });
    },

    // ----- the door lights and ■ -----
    light() { tone(2600, 0.03, { vol: 0.05 }); noise(0.05, { vol: 0.05, freq: 4000, type: 'highpass' }); },
    // ■ reaching CLOSE: a loud dragging scrape plus a buzzy low "square" note, from its door's side.
    creep(side) {
      const pan = panOf(side);
      noise(0.35, { vol: 0.55, freq: 900, pan });
      tone(98, 0.3, { type: 'square', vol: 0.2, slide: -20, pan });
    },
    // ■ Flinch: it lunges a step closer when the light leaves it. A sharp rising scrape.
    lunge(side) { noise(0.15, { vol: 0.5, freq: 1200, pan: panOf(side) }); tone(90, 0.18, { type: 'square', vol: 0.2, slide: 80, pan: panOf(side) }); },
    // ■ being pushed back one stage by the light: a short scrape from its side.
    shove(side) { noise(0.22, { vol: 0.35, freq: 700, pan: panOf(side) }); tone(140, 0.2, { type: 'sawtooth', vol: 0.12, slide: -60, pan: panOf(side) }); },

    // ----- (: Smiley -----
    // A cutesy giggle: three quick rising chirps. pan says where in the office it is hiding.
    giggle(pan) {
      [1046, 1318, 1568].forEach((f, i) => tone(f, 0.09, { type: 'triangle', vol: 0.18, slide: 300, delay: i * 0.1, pan }));
    },
    // Clicking it in time: a little pop.
    pop() { tone(500, 0.08, { type: 'sine', vol: 0.3, slide: 700 }); },

    // ----- Ж Crawler -----
    // Skittering as it moves a room closer (from the right side, where its route ends up).
    crawl(progress) {
      for (let i = 0; i < 5; i++) noise(0.03, { vol: 0.08 + progress * 0.3, freq: 3500, type: 'highpass', delay: i * 0.05, pan: 0.6 * progress });
    },
    // In your office: a fast, loud scuttle right in front of you.
    crawlIn() {
      for (let i = 0; i < 9; i++) noise(0.03, { vol: 0.5, freq: 3000, type: 'highpass', delay: i * 0.035 });
      tone(180, 0.3, { type: 'sawtooth', vol: 0.15, slide: 120 });
    },
    tap() { tone(700, 0.04, { vol: 0.1 }); },                               // Stubborn: one more click needed
    shoo() { tone(900, 0.12, { type: 'triangle', vol: 0.18, slide: -600 }); },   // pushed back a room

    // ----- ¤ Flicker -----
    // An electric buzz from the door it's at.
    buzz(side) {
      for (let i = 0; i < 3; i++) tone(120, 0.08, { type: 'square', vol: 0.16, delay: i * 0.12, pan: panOf(side) });
      noise(0.35, { vol: 0.12, freq: 2200, type: 'highpass', pan: panOf(side) });
    },
    // Flashed: a sharp zap.
    zap(side) { tone(1800, 0.1, { type: 'sawtooth', vol: 0.15, slide: -1500, pan: panOf(side) }); },

    // ----- Ψ Visitor and the mask -----
    // It appears: a low breath and a wobbling hum.
    visitorIn() {
      noise(0.9, { vol: 0.35, freq: 500 });
      tone(65, 0.9, { type: 'sine', vol: 0.4, slide: 25 });
      tone(97, 0.9, { type: 'triangle', vol: 0.15, slide: -20, delay: 0.1 });
    },
    // It leaves: the hum fades away downward.
    visitorOut() { tone(110, 0.6, { type: 'sine', vol: 0.25, slide: -70 }); },
    // Double take: it PRETENDS to leave. Same falling hum, but it rises again at the end (the tell).
    visitorFake() {
      tone(110, 0.45, { type: 'sine', vol: 0.25, slide: -70 });
      tone(60, 0.35, { type: 'sine', vol: 0.25, slide: 90, delay: 0.45 });
    },
    // Putting the mask on (muffled thump) or taking it off (lighter click).
    mask(on) { on ? noise(0.15, { vol: 0.35, freq: 300 }) : tone(600, 0.05, { vol: 0.08 }); },

    // ----- Lenny's music box -----
    windTick() { tone(2300, 0.025, { vol: 0.05 }); },
    boxWarn() {
      tone(1568, 0.25, { type: 'triangle', vol: 0.12 });
      tone(1175, 0.3, { type: 'triangle', vol: 0.12, delay: 0.2 });
    },
    // Wanderer: the box just moved to another camera. A quick music-box twinkle, going up then down.
    boxMove() {
      [1319, 1568, 1976, 1568].forEach((f, i) => tone(f, 0.18, { type: 'triangle', vol: 0.12, delay: i * 0.09 }));
    },
    // The box running out: a tinny tune that speeds up and gets louder, right before Lenny arrives.
    boxTune() {
      const notes = [784, 659, 784, 880, 784, 659, 523, 587, 659, 523, 784, 1047];
      let t = 0;
      notes.forEach((freq, i) => {
        tone(freq, 0.3, { type: 'triangle', vol: 0.1 + i * 0.02, delay: t });
        t += 0.42 - i * 0.022;   // each gap a little shorter than the last
      });
    },

    // ----- big moments -----
    powerDown() { tone(440, 1.8, { type: 'sawtooth', vol: 0.14, slide: -400 }); },
    scream() {
      tone(880, 1.3, { type: 'sawtooth', vol: 0.32, slide: -520 });
      tone(935, 1.3, { type: 'square', vol: 0.18, slide: -610 });
      noise(1.3, { vol: 0.45, freq: 5000 });
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
