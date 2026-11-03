/* =====================================================================
   screens.js: switching between screens, and everything that is not
   the night itself: the custom night setup, the win screen, the
   jumpscare and game over, the pause panel, How to play and the
   sound button.

   Showing and hiding works through the HTML `hidden` attribute:
   element.hidden = true hides it, element.hidden = false shows it.
   ===================================================================== */

let currentScreen = 'title';   // which screen is showing: 'title', 'setup', 'game' or 'win'
let sel = 0;            // which row is selected on the custom night screen
let scareTimer = 0;     // the timer that swaps the jumpscare for the Game Over text

// Show one screen and hide the others.
function show(name) {
  currentScreen = name;
  for (const s of ['title', 'setup', 'game', 'win']) $('scr-' + s).hidden = s !== name;
  if (name === 'setup') renderSetup();
  if (name === 'game') dirty = true;
}

function showPause(visible) { $('pause').hidden = !visible; }

// Leave the night (or the game over screen) and go back to the level picker.
function goSetup() {
  hideScare();
  if (G) { G.over = true; sfx.humOff(); }
  show('setup');
}

// ---------- jumpscare and game over ----------
// First the jumpscare (shaking) for 1.5 seconds, then the Game Over message and buttons.
// There is no flashing strobe on purpose, to keep the scare easy on the eyes.
function showScare(message, artHtml) {
  const art = $('scareArt'), cover = $('scare');
  $('loseMsg').innerHTML = message;
  art.innerHTML = artHtml;
  art.hidden = false;
  $('scareMsg').hidden = true;
  cover.hidden = false;
  art.classList.add('shake');     // the shake animation is defined in style.css
  clearTimeout(scareTimer);
  // setTimeout(fn, 1500) runs fn once, 1500 milliseconds from now.
  scareTimer = setTimeout(() => {
    art.classList.remove('shake');
    art.hidden = true;
    $('scareMsg').hidden = false;
    $('btnRetry').focus({ preventScroll: true });
  }, 1500);
}

function hideScare() {
  clearTimeout(scareTimer);
  $('scare').hidden = true;
}

// ---------- 6 AM ----------
// `challenge` is the PRESETS entry tonight matched (or null); `firstTime` says it just earned its ✓.
function showWin(sum, isBest, challenge, firstTime) {
  $('winMsg').textContent = `You made it to morning with ${Math.max(0, Math.ceil(G.power))}% power left.`;
  $('winLevels').innerHTML =
    SETUP.filter((c, i) => levels[i] > 0).map(c => `<span>${faceHtml(c)} ${levels[SETUP.indexOf(c)]}</span>`).join('') +
    `<span class="dim">total ${sum} / ${MAX_SCORE}</span>`;
  $('winBest').innerHTML = isBest ? '<b>New best.</b> This is the hardest night you have survived.' : bestText();
  if (challenge) {
    $('winBest').innerHTML += `<br><span class="tick">✓</span> ${firstTime ? 'Challenge complete' : 'Challenge beaten again'}: <b>${challenge.name}</b>`;
  }
  show('win');
}

// ---------- custom night (level picker) ----------
// Build one row per character in SETUP. Runs once at start-up; renderSetup() then fills in the numbers.
// The `...${}...` strings are "template literals": ${something} drops a value into the text.
function buildSetup() {
  $('rows').innerHTML = SETUP.map((c, i) => `
    <div class="lvrow" data-i="${i}">
      ${iconHtml(c, ' big')}
      <span class="who"><b>${c.name.toUpperCase()} · ${c.where}</b><small>${c.desc}</small></span>
      <span class="ctrl">
        <button type="button" class="step" data-i="${i}" data-d="-1" aria-label="Lower ${c.name} level">−</button>
        <span class="lv"><b id="lv${i}"></b><span class="bar" id="bar${i}"></span></span>
        <button type="button" class="step" data-i="${i}" data-d="1" aria-label="Raise ${c.name} level">+</button>
      </span>
    </div>`).join('');
  // The challenge buttons, each with the points it's worth. The empty <span class="tick"> gets its ✓
  // in renderSetup() once that challenge is beaten.
  $('presets').innerHTML = '<span class="lab" id="presetsLab">Challenges</span>' +
    PRESETS.map((p, i) => `<button type="button" data-preset="${i}"><span class="tick" id="tick${i}"></span>${p.name} <span class="dim">${presetPoints(p)}</span></button>`).join('');
}

// Update the numbers, bars, score and selected row on the custom night screen.
function renderSetup() {
  document.querySelectorAll('.lvrow').forEach((row, i) => {
    row.classList.toggle('sel', i === sel);
    row.classList.toggle('off', levels[i] === 0);
  });
  levels.forEach((lv, i) => {
    // 5 shows as "LEVEL 05"; 0 means switched off, so it just says OFF.
    $('lv' + i).textContent = lv === 0 ? 'OFF' : 'LEVEL ' + String(lv).padStart(2, '0');
    $('bar' + i).textContent = '|'.repeat(lv) + '.'.repeat(MAX_LEVEL - lv);
  });
  // A ✓ on every challenge you've survived, and how many that is.
  const picked = matchingPreset();
  PRESETS.forEach((p, i) => {
    const done = cleared.includes(clearKey(p));
    $('tick' + i).textContent = done ? '✓ ' : '';
    $('tick' + i).parentElement.classList.toggle('done', done);
    $('tick' + i).parentElement.classList.toggle('picked', p === picked);
  });
  $('presetsLab').textContent = `Challenges ${cleared.length}/${PRESETS.length}`;
  $('presetFlavor').innerHTML = picked ? `<b>${picked.name}</b> · ${FLAVOR[picked.name] || ''}` : '';
  $('scoreLine').innerHTML = `Tonight's score: <b>${nightScore()} / ${MAX_SCORE}</b>`;
  $('bestLine').innerHTML = bestText();
}

// Fill in every level from a challenge in PRESETS.
function applyPreset(p) {
  levels = p.levels.map(clampLevel);
  store.set('levels', levels);
  sfx.click();
  renderSetup();
}

// Change level number i by d (+1 or -1).
function changeLevel(i, d) {
  levels[i] = clampLevel(levels[i] + d);
  store.set('levels', levels);
  sel = i;
  sfx.click();
  renderSetup();
}

function setAllLevels(value) {
  levels = levels.map(() => clampLevel(value));
  store.set('levels', levels);
  sfx.click();
  renderSetup();
}

// The "Best:" line: the levels of the hardest night survived. `??` means "use the right side if the
// left side is missing" (a best score saved before a character existed has no level for it).
function bestText() {
  if (!best) return 'No night survived yet.';
  const parts = SETUP.map((c, i) => `${faceHtml(c)} ${best.levels[i] ?? '–'}`).join(' · ');
  return `Best: survived on ${parts} <b>(total ${best.sum} / ${MAX_SCORE})</b>`;
}

// ---------- How to play ----------
function openHowto() {
  if (currentScreen === 'game' && G && !G.over && !G.paused) setPaused(true);   // don't die while reading
  $('howto').hidden = false;
  $('btnHowClose').focus({ preventScroll: true });
}

function closeHowto() { $('howto').hidden = true; }

// ---------- sound button ----------
function renderMute() {
  $('btnMute').textContent = sfx.muted ? 'Sound off' : 'Sound on';
  $('btnMute').setAttribute('aria-pressed', String(sfx.muted));
}

function toggleMute() {
  sfx.init();
  sfx.toggleMute();
  renderMute();
}
