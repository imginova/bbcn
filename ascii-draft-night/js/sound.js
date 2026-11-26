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
    // Taking a card on the pick screen (a bright blip) or putting it back (a lower one).
    pickCard(on) { tone(on ? 880 : 520, 0.08, { type: 'triangle', vol: 0.12, slide: on ? 300 : -150 }); },
    door(side) {
      noise(0.25, { vol: 0.55, freq: 420, pan: panOf(side) });
      tone(75, 0.25, { type: 'sine', vol: 0.5, slide: -35, pan: panOf(side) });
    },
    cam() { tone(1500, 0.04, { vol: 0.07 }); noise(0.14, { vol: 0.1, freq: 3200, type: 'highpass' }); },
    stat() { noise(0.3, { vol: 0.09, freq: 2600, type: 'highpass' }); },   // camera static
    // Putting the mask on (muffled thump) or taking it off (lighter click).
    mask(on) { on ? noise(0.15, { vol: 0.35, freq: 300 }) : tone(600, 0.05, { vol: 0.08 }); },
    // The desk fan switching on (a rising whirr) or off (winding down).
    fan(on) { tone(on ? 180 : 140, 0.25, { type: 'sawtooth', vol: 0.07, slide: on ? 120 : -100 }); },

    // ----- doors -----
    // Something ran into a shut door and gave up: a cartoon BONK. It starts a moment after the door
    // slam (delay), so you hear it clearly even when you shut the door right as it arrives.
    bonk(side) {
      const pan = panOf(side), d = 0.15;
      noise(0.04, { vol: 0.5, freq: 3000, type: 'highpass', delay: d, pan });       // the hit
      tone(700, 0.12, { type: 'sine', vol: 0.6, slide: -380, delay: d, pan });       // "bo-"
      tone(350, 0.3, { type: 'triangle', vol: 0.5, slide: -150, delay: d + 0.03, pan });   // "-onk"
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

    // ----- Chica's cupcakes -----
    // Shut out, she drops cupcakes into your office: a soft plop from the right for each one.
    cupsDropped(n) {
      for (let i = 0; i < n; i++) tone(300 - i * 30, 0.1, { type: 'sine', vol: 0.3, slide: -120, delay: 0.35 + i * 0.18, pan: 0.5 });
    },
    // One found: a happy little pop.
    pop() { tone(500, 0.08, { type: 'sine', vol: 0.3, slide: 700 }); },

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
    // An audio lure: a short, tinny voice clip from the vent speaker.
    lure() {
      tone(520, 0.12, { type: 'square', vol: 0.1 });
      tone(780, 0.12, { type: 'square', vol: 0.1, delay: 0.14 });
      tone(650, 0.18, { type: 'square', vol: 0.1, delay: 0.28 });
    },

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

    // ----- Nightmare Freddy -----
    // A Freddle climbing onto the desk: three little squeaky notes. Shone away: a falling squeak.
    freddle() { [880, 1046, 932].forEach((f, i) => tone(f, 0.08, { type: 'triangle', vol: 0.12, slide: -100, delay: i * 0.08 })); },
    freddleOff() { tone(1200, 0.12, { type: 'triangle', vol: 0.12, slide: -900 }); },
    // All three are up: a low, rising growl as a warning that he's coming.
    nightmareNear() { tone(45, 1.4, { type: 'sawtooth', vol: 0.3, slide: 30 }); noise(1.2, { vol: 0.25, freq: 200 }); },

    // ----- Trash and the Gang -----
    // One of them stepping in front of a camera: a rustle and a clatter of junk.
    trash() {
      noise(0.5, { vol: 0.15, freq: 1800, type: 'highpass' });
      for (let i = 0; i < 3; i++) tone(300 + Math.random() * 400, 0.06, { type: 'square', vol: 0.06, delay: 0.1 + i * 0.12 });
    },

    // ----- Lolbit -----
    // The LOL screen popping up: a silly, glitchy "lo-ol" laugh.
    lolIn() {
      [523, 784, 523].forEach((f, i) => tone(f, 0.1, { type: 'square', vol: 0.14, delay: i * 0.11 }));
      noise(0.25, { vol: 0.15, freq: 3000, type: 'highpass', delay: 0.35 });
    },
    // Each right letter typed: a tick, higher for each one (n = 1, 2 or 3).
    lolKey(n) { tone(600 + n * 200, 0.05, { type: 'square', vol: 0.1 }); },
    // Gone: a quick fizzle down.
    lolOut() { tone(900, 0.2, { type: 'triangle', vol: 0.12, slide: -700 }); },

    // ----- the controlled shock -----
    // A sharp electric crackle. hit = true when it zapped someone (a louder buzz on top).
    shock(hit) {
      noise(0.25, { vol: 0.35, freq: 4000, type: 'highpass' });
      tone(1800, 0.2, { type: 'sawtooth', vol: 0.12, slide: -1400 });
      if (hit) tone(90, 0.4, { type: 'square', vol: 0.25, slide: 40, delay: 0.05 });
    },

    // ----- Foxy and Withered Foxy -----
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
    // One running step (progress 0 far ... 1 at the door), louder and further to that side each time.
    runStep(side, progress) {
      const pan = panOf(side) * (0.3 + 0.7 * progress);
      noise(0.06, { vol: 0.15 + 0.5 * progress, freq: 500, pan });
      tone(70, 0.08, { type: 'sine', vol: 0.2 + 0.4 * progress, pan });
    },
    // Withered Foxy's stomp behind the shut door: "open up now!"
    stomp() { tone(50, 0.25, { type: 'sine', vol: 0.9, pan: -0.8 }); noise(0.2, { vol: 0.6, freq: 250, pan: -0.8 }); },
    // Flashed enough: a zap and a whimper as he backs off.
    retreat() { tone(700, 0.4, { type: 'triangle', vol: 0.15, slide: -500, pan: -0.6 }); },

    // ----- Golden Freddy and Nightmare Fredbear -----
    // A low, wobbling whisper that seems to come from right in front of you.
    goldenIn() {
      noise(1.0, { vol: 0.3, freq: 700 });
      tone(55, 1.0, { type: 'sawtooth', vol: 0.25, slide: -15 });
      tone(58, 1.0, { type: 'sine', vol: 0.25, slide: 20 });
    },
    goldenOut() { tone(220, 0.5, { type: 'sine', vol: 0.15, slide: -180 }); },

    // ----- Toy Freddy, Withered Bonnie (and Fredbear walking in) -----
    // Heavy steps into the office, and a low groan. `pitch` gives each one his own voice.
    walkIn(pitch = 70) {
      noise(0.6, { vol: 0.3, freq: 400 });
      tone(pitch, 0.8, { type: 'sawtooth', vol: 0.3, slide: 25 });
      tone(pitch * 2, 0.5, { type: 'square', vol: 0.08, delay: 0.25 });
    },
    walkOut(pitch = 70) { tone(pitch * 2, 0.6, { type: 'sine', vol: 0.25, slide: -pitch }); },

    // ----- Nightmare Bonnie -----
    // Ragged breathing from the doorway he's in.
    breathe(side) {
      noise(0.7, { vol: 0.35, freq: 500, pan: panOf(side) });
      noise(0.6, { vol: 0.25, freq: 380, delay: 0.8, pan: panOf(side) });
    },

    // ----- Bonnet -----
    // She bursts in from one side (pan -1 left ... +1 right): quick little steps and a squeak.
    bonnetIn(pan) {
      for (let i = 0; i < 5; i++) tone(900 + i * 40, 0.04, { type: 'square', vol: 0.08, delay: i * 0.07, pan });
      tone(1500, 0.15, { type: 'triangle', vol: 0.12, slide: 400, delay: 0.38, pan });
    },
    boop() { tone(1200, 0.08, { type: 'sine', vol: 0.3, slide: 800 }); tone(2400, 0.05, { type: 'triangle', vol: 0.1, delay: 0.08 }); },

    // ----- Springtrap and Circus Baby -----
    // Springtrap dragging himself a room closer: a slow, metal scrape (louder the closer he is).
    springMove(progress) {
      noise(0.5, { vol: 0.08 + 0.3 * progress, freq: 700 });
      tone(80, 0.5, { type: 'sawtooth', vol: 0.06 + 0.2 * progress, slide: -20 });
    },
    // Circus Baby a room closer: a soft two-note beep (louder the closer she is).
    babyMove(progress) {
      tone(1046, 0.08, { type: 'sine', vol: 0.06 + 0.25 * progress });
      tone(1318, 0.1, { type: 'sine', vol: 0.06 + 0.25 * progress, delay: 0.12 });
    },

    // ----- Nightmare Chica -----
    // A strange warbling noise: her cupcake is hidden somewhere on the cameras.
    nchicaIn() {
      for (let i = 0; i < 4; i++) tone(300 + (i % 2) * 140, 0.18, { type: 'sawtooth', vol: 0.14, slide: 60, delay: i * 0.18 });
      noise(0.5, { vol: 0.15, freq: 900, delay: 0.2 });
    },

    // ----- Shadow Bonnie -----
    // The office lights dying with a buzz, and coming back on.
    lightsOff() {
      tone(120, 0.6, { type: 'sawtooth', vol: 0.2, slide: -90 });
      for (let i = 0; i < 3; i++) noise(0.05, { vol: 0.3, freq: 3000, type: 'highpass', delay: i * 0.12 });
    },
    lightsOn() { tone(60, 0.3, { type: 'sawtooth', vol: 0.15, slide: 60 }); tone(900, 0.1, { type: 'sine', vol: 0.08, delay: 0.2 }); },

    // ----- Plushtrap -----
    // A quick giggle, leaning toward where he's hiding (pan -1 left ... +1 right).
    giggle(pan) { for (let i = 0; i < 4; i++) tone(1100 + (i % 2) * 220, 0.06, { type: 'triangle', vol: 0.16, delay: i * 0.08, pan }); },

    // ----- Funtime Freddy -----
    // His voice saying a line: a few bouncy syllables. An attack line ends higher and louder.
    voice(attack) {
      const notes = attack ? [330, 392, 440, 523] : [330, 294, 330, 262];
      notes.forEach((f, i) => tone(f, 0.11, { type: 'square', vol: attack ? 0.13 : 0.08, delay: i * 0.13 }));
    },
    // His (or Bon-Bon's) steps on the way to a door; step 1 is closer and louder.
    ffrStep(side, step) { for (let i = 0; i < 3; i++) tone(140, 0.1, { type: 'sine', vol: 0.15 + step * 0.25, delay: i * 0.2, pan: panOf(side) * (0.4 + step * 0.5) }); },
    // Walking to the other side of the auditorium: a quiet shuffle.
    ffrShuffle() { noise(0.4, { vol: 0.1, freq: 800 }); },

    // ----- Funtime Foxy -----
    // SHOWTIME: a little fanfare from the stage... and applause when you're watching.
    showtime() { [523, 659, 784].forEach((f, i) => tone(f, 0.15, { type: 'square', vol: 0.1, delay: i * 0.12 })); },
    applause() { for (let i = 0; i < 10; i++) noise(0.05, { vol: 0.12, freq: 2500, type: 'highpass', delay: i * 0.06 + Math.random() * 0.03 }); },

    // ----- the bonus characters -----
    // Salvage sign popping up: a flat two-tone buzzer. Each tap on it: a clunk, higher as it gets
    // closer to working (left = presses still needed).
    salvage() { tone(220, 0.15, { type: 'square', vol: 0.15 }); tone(175, 0.25, { type: 'square', vol: 0.15, delay: 0.16 }); },
    salvageTap(left) { tone(300 + (SALVAGE_PRESSES - left) * 120, 0.06, { type: 'square', vol: 0.12 }); },
    // Watermelon Chica turning up: a wet squelch from her side. Bouncing a door open: a springy boing.
    wmcIn(side) { noise(0.3, { vol: 0.35, freq: 600, pan: panOf(side) }); tone(180, 0.3, { type: 'sine', vol: 0.2, slide: -80, pan: panOf(side) }); },
    boing(side) { tone(150, 0.35, { type: 'sine', vol: 0.35, slide: 300, pan: panOf(side) }); },
    // Hand-unit: a robotic "hello" blip, a click for each key you mash (higher as he glitches: progress
    // 0 to 1), and a crash when he glitches out.
    handIn() { [660, 990, 660].forEach((f, i) => tone(f, 0.09, { type: 'square', vol: 0.12, delay: i * 0.1 })); },
    handTick(progress) { tone(400 + 600 * progress, 0.03, { type: 'square', vol: 0.07 }); },
    handFall() { noise(0.4, { vol: 0.5, freq: 900 }); tone(300, 0.4, { type: 'sawtooth', vol: 0.15, slide: -250 }); },
    // Bounce pot hitting your pointer: a hollow clay clonk.
    potHit() { tone(240, 0.12, { type: 'triangle', vol: 0.4 }); noise(0.1, { vol: 0.3, freq: 1500 }); },
    // Bounce pot charging up on the floor (a quiet spring creaking upward), then springing off (a boing).
    // Kept quiet, because he bounces all night.
    potCharge(dur = BOUNCE_CHARGE, pitch = 160) { tone(pitch, dur, { type: 'triangle', vol: 0.06, slide: pitch * 1.4 }); },
    potLaunch(pitch = 240) { tone(pitch, 0.2, { type: 'sine', vol: 0.12, slide: pitch * 1.75 }); },

    // ----- the third list -----
    // BB running off with your flashlight: a high "ha ha!" and a click.
    bbLaugh() {
      [620, 760, 620, 760].forEach((f, i) => tone(f, 0.09, { type: 'square', vol: 0.14, delay: i * 0.11 }));
      tone(1800, 0.03, { vol: 0.2, delay: 0.5 });
    },
    // Mangle getting onto a camera: a burst of radio static with a garbled warble in it. Then her static
    // crackling (`vol` 0 to 1: loud on her camera, faint anywhere else). Shocked: a fizzle.
    mangleIn() {
      noise(0.6, { vol: 0.35, freq: 2500, type: 'highpass' });
      for (let i = 0; i < 5; i++) tone(500 + Math.random() * 700, 0.07, { type: 'sawtooth', vol: 0.08, delay: i * 0.09 });
    },
    mangleCrackle(vol) { noise(0.25, { vol: 0.45 * vol, freq: 3000, type: 'highpass' }); },
    mangleOut() { noise(0.4, { vol: 0.3, freq: 1200 }); tone(700, 0.4, { type: 'sawtooth', vol: 0.12, slide: -600 }); },
    // Nightmare BB waking (a low, warped giggle) and going back to sleep (a soft falling hum).
    nbbWake() { [300, 260, 300, 220].forEach((f, i) => tone(f, 0.12, { type: 'sawtooth', vol: 0.12, slide: -40, delay: i * 0.13 })); },
    nbbSleep() { tone(330, 0.5, { type: 'sine', vol: 0.1, slide: -200 }); },
    // The caution bot's blink: a short beep from the middle (it doesn't tell you which door).
    nsbBlink() { tone(1320, 0.06, { type: 'square', vol: 0.1 }); },
    // Munchie grabbing your screen: a scrabble of little claws and a chomp. Flicked off: a whoosh.
    munchieIn() {
      for (let i = 0; i < 5; i++) noise(0.04, { vol: 0.2, freq: 3500, type: 'highpass', delay: i * 0.05 });
      tone(120, 0.12, { type: 'square', vol: 0.2, delay: 0.3 });
    },
    munchieFlick() { noise(0.35, { vol: 0.25, freq: 2000, type: 'highpass' }); tone(900, 0.3, { type: 'triangle', vol: 0.1, slide: -700 }); },
    // Cookie Freddy: a cheerful "mm-mm!" when he turns up, a crunch when he's got his coatings.
    cookieIn() { tone(330, 0.15, { type: 'triangle', vol: 0.15 }); tone(392, 0.2, { type: 'triangle', vol: 0.15, delay: 0.17 }); },
    cookieOut() { noise(0.2, { vol: 0.4, freq: 1200 }); noise(0.15, { vol: 0.3, freq: 1600, delay: 0.15 }); },
    // The Flamethrower endo: a roaring whoosh when he fires up, a sputter when he leaves.
    flameOn() { noise(1.2, { vol: 0.45, freq: 500 }); tone(70, 1.0, { type: 'sawtooth', vol: 0.15, slide: 30 }); },
    flameOff() { for (let i = 0; i < 3; i++) noise(0.08, { vol: 0.2, freq: 700, delay: i * 0.12 }); },
    // Plush babies: a tiny squeak when one turns up, and a scrabble up the glass when one climbs onto
    // your screen.
    plushBaby() { tone(1400, 0.07, { type: 'triangle', vol: 0.12, slide: 200 }); },
    plushClimb() { for (let i = 0; i < 4; i++) tone(700 + i * 150, 0.06, { type: 'square', vol: 0.12, delay: i * 0.08 }); },

    // ----- the heat -----
    // Getting too hot: a long, heavy breath.
    hot() { noise(1.0, { vol: 0.25, freq: 600 }); tone(140, 1.0, { type: 'sine', vol: 0.1, slide: -60 }); },
    // Passing out: two slow heartbeats and a long sinking tone.
    faint() {
      for (let i = 0; i < 2; i++) {
        tone(55, 0.18, { type: 'sine', vol: 0.6, delay: i * 0.6 });
        tone(50, 0.18, { type: 'sine', vol: 0.45, delay: i * 0.6 + 0.2 });
      }
      tone(300, 1.6, { type: 'sine', vol: 0.15, slide: -260, delay: 0.3 });
    },

    // ----- big moments -----
    powerDown() { tone(440, 1.8, { type: 'sawtooth', vol: 0.14, slide: -400 }); },
    scream() {
      tone(880, 1.3, { type: 'sawtooth', vol: 0.32, slide: -520 });
      tone(935, 1.3, { type: 'square', vol: 0.18, slide: -610 });
      noise(1.3, { vol: 0.45, freq: 5000 });
    },
    // 6 AM: a rising four-note chime.
    chime() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.7, { type: 'triangle', vol: 0.2, delay: i * 0.22 })); },
    // Winning the whole run: the chime, then a longer, higher fanfare.
    fanfare() {
      [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.7, { type: 'triangle', vol: 0.2, delay: i * 0.22 }));
      [1047, 1319, 1568, 2093].forEach((f, i) => tone(f, 0.9, { type: 'triangle', vol: 0.16, delay: 1.0 + i * 0.16 }));
    },

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
