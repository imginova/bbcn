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

// The pause panel also lists who is on tonight (level above 0), as small cards. Pointing at one shows
// how it works in #pauseInfo underneath, like the custom night screen does.
function showPause(visible) {
  $('pause').hidden = !visible;
  if (!visible) return;
  const on = SETUP.map((c, i) => ({ c, i })).filter(({ i }) => levels[i] > 0);
  $('pauseRoster').innerHTML = on.length
    ? on.map(({ c, i }) => `<div class="mini-card" data-i="${i}">${iconHtml(c)}<b>${c.name}</b><span class="lvtag">LV ${levels[i]}</span></div>`).join('')
    : '<p class="dim">Nobody is on tonight.</p>';
  $('pauseInfo').innerHTML = on.length ? '<span class="dim">Point at someone to see how they work.</span>' : '';
}

// The text that explains one character: name, where it comes from, how to stop it and its kill tally.
// Used by the info box on the custom night screen and on the pause panel.
function whoHtml(i) {
  const c = SETUP[i], n = kills[c.id] || 0;
  return `<b class="c-${c.id}">${c.name.toUpperCase()}</b> <span class="dim">· ${c.where}</span><br>${c.desc}` +
    (n ? `<br><span class="kills">☠ Got you ${n === 1 ? 'once' : n + ' times'}</span>` : '');
}

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
// A grid of cards, one per character in SETUP, like the Custom Night screens in the real games: each
// card has the face, the name and the level with − and +. How a character works is shown in the info
// box under the grid (#who) when you point at its card. Runs once at start-up; renderSetup() then
// fills in the numbers.
// The `...${}...` strings are "template literals": ${something} drops a value into the text.
let hoverCard = -1;   // the card the mouse is over (-1: none, so the info box shows the selected one)
function buildSetup() {
  $('rows').innerHTML = SETUP.map((c, i) => `
    <div class="lvrow" data-i="${i}">
      <small class="kills" id="kills${i}"></small>
      ${iconHtml(c, ' big')}
      <b class="name">${c.name}</b>
      <span class="ctrl">
        <button type="button" class="step" data-i="${i}" data-d="-1" aria-label="Lower ${c.name} level">−</button>
        <b class="lv" id="lv${i}"></b>
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
    // 5 shows as "05"; 0 means switched off, so it just says OFF.
    $('lv' + i).textContent = lv === 0 ? 'OFF' : String(lv).padStart(2, '0');
  });
  // Each character's kill tally (kills, in game.js) in its card's corner. Nothing is shown until it
  // has got you at least once; the info box spells it out.
  SETUP.forEach((c, i) => {
    const n = kills[c.id] || 0;
    $('kills' + i).textContent = n ? `☠${n}` : '';
  });
  renderWho();
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

// The info box under the grid: the card the mouse is over, or else the selected card.
function renderWho() {
  $('who').innerHTML = whoHtml(hoverCard >= 0 ? hoverCard : sel);
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
