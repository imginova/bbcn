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
// There is no flashing strobe on purpose: it was removed to make the scare easier on the eyes.
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
  const powerLeft = Math.max(0, Math.ceil(G.power));
  $('winMsg').textContent = G.mode === 'tasks'
    ? `You finished every task with ${powerLeft}% power left.`
    : `You kept them out until morning with ${powerLeft}% power left${G.mode === 'generator' ? ' (Generator mode)' : ''}.`;
  $('winBig').textContent = G.mode === 'tasks' ? 'DONE' : '6:00 AM';
  // A ★ marks each threat that had its modifier on (worth +MOD_BONUS).
  $('winLevels').innerHTML =
    SETUP.map((c, i) => `<span>${symHtml(c)} ${levels[i] === 0 ? 'off' : 'level ' + levels[i]}${mods[i] && levels[i] > 0 ? ' ★' : ''}</span>`).join('') +
    `<span class="dim">total ${sum} / ${MAX_SCORE}</span>`;
  $('winBest').innerHTML = isBest ? '<b>New best.</b> This is the hardest night you have survived.' : bestText();
  if (challenge) {
    $('winBest').innerHTML += `<br><span class="tick">✓</span> ${firstTime ? 'Challenge complete' : 'Challenge beaten again'}: <b>${challenge.name}</b>`;
  }
  show('win');
}

// ---------- custom night (level picker) ----------
// Build one row per entry in SETUP. Runs once at start-up; renderSetup() then fills in the numbers.
// The `...${}...` strings are "template literals": ${something} drops a value into the text.
// Each row also gets its modifier checkbox (a <label> around the box makes the words clickable too),
// and the challenge buttons are built from PRESETS in data.js.
function buildSetup() {
  $('rows').innerHTML = SETUP.map((c, i) => `
    <div class="lvrow" data-i="${i}">
      ${symHtml(c, ' big')}
      <span class="who"><b>${c.name.toUpperCase()} · ${c.door}</b><small>${c.path}</small>
        <small class="kills" id="kills${i}"></small>
        <label class="mod"><input type="checkbox" data-mod="${i}"> ★ ${c.mod.name} <span class="dim">+${MOD_BONUS}</span><small>${c.mod.desc}</small></label>
      </span>
      <span class="ctrl">
        <button type="button" class="step" data-i="${i}" data-d="-1" aria-label="Lower ${c.name} level">−</button>
        <span class="lv"><b id="lv${i}"></b><span class="bar" id="bar${i}"></span></span>
        <button type="button" class="step" data-i="${i}" data-d="1" aria-label="Raise ${c.name} level">+</button>
      </span>
    </div>`).join('');
  // Each challenge button shows the points it's worth (presetPoints is in data.js, which also uses
  // it to sort the challenges).
  // The empty <span class="tick"> gets its ✓ in renderSetup() once that challenge is beaten.
  // All the challenges are in one list, in their sorted order (all three modes mixed together, on
  // request). A Generator or Tasks challenge gets a small tag saying its mode.
  const tag = p => p.mode === 'standard' ? '' : `<span class="mode-tag">${MODES[p.mode].name}</span>`;
  $('presets').innerHTML = '<span class="lab" id="presetsLab">Challenges</span>' +
    PRESETS.map((p, i) => `<button type="button" data-preset="${i}"><span class="tick" id="tick${i}"></span>${p.name} ${tag(p)}<span class="dim">${presetPoints(p)}</span></button>`).join('');
}

// Update the numbers, bars, checkboxes, score and selected row on the custom night screen.
function renderSetup() {
  document.querySelectorAll('.lvrow').forEach((row, i) => row.classList.toggle('sel', i === sel));
  levels.forEach((lv, i) => {
    // 5 shows as "LEVEL 05"; 0 means switched off, so it just says OFF.
    $('lv' + i).textContent = lv === 0 ? 'OFF' : 'LEVEL ' + String(lv).padStart(2, '0');
    $('bar' + i).textContent = '|'.repeat(lv) + '.'.repeat(MAX_LEVEL - lv);
  });
  // Each threat's kill tally (kills, in game.js). Nothing is shown until it has got you at least once.
  SETUP.forEach((c, i) => {
    const n = kills[c.id] || 0;
    $('kills' + i).textContent = n ? `☠ Got you ${n === 1 ? 'once' : n + ' times'}` : '';
  });
  // A switched-off threat's modifier does nothing, so its checkbox is greyed out (but remembered).
  document.querySelectorAll('[data-mod]').forEach(box => {
    const i = Number(box.dataset.mod);
    box.checked = mods[i];
    box.disabled = levels[i] === 0;
  });
  // A ✓ on every challenge you've survived, and how many that is.
  PRESETS.forEach((p, i) => {
    const done = cleared.includes(clearKey(p));
    $('tick' + i).textContent = done ? '✓ ' : '';
    $('tick' + i).parentElement.classList.toggle('done', done);
  });
  $('presetsLab').textContent = `Challenges ${cleared.length}/${PRESETS.length}`;
  // The picked challenge (if tonight's settings still match one exactly): highlight it and show its flavour text.
  const picked = matchingPreset();
  PRESETS.forEach((p, i) => $('tick' + i).parentElement.classList.toggle('picked', p === picked));
  $('presetFlavor').innerHTML = picked ? `<b>${picked.name}</b> · ${FLAVOR[picked.name] || ''}` : '';
  // The mode picker: the chosen one is highlighted (aria-pressed, see style.css), with what it means.
  document.querySelectorAll('#modes [data-mode]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === mode)));
  $('modeDesc').textContent = MODES[mode].desc;
  $('scoreLine').innerHTML = `Tonight's score: <b>${nightScore()} / ${MAX_SCORE}</b>`;
  $('bestLine').innerHTML = bestText();
}

// Tick or untick modifier number i.
function setMod(i, on) {
  mods[i] = on;
  store.set('mods', mods);
  sel = i;
  sfx.click();
  renderSetup();
}

// Fill in every level and modifier from a challenge in PRESETS.
function applyPreset(p) {
  levels = p.levels.map(clampLevel);
  mods = SETUP.map(c => p.mods.includes(c.id));
  mode = p.mode;   // a challenge also picks its mode
  store.set('levels', levels);
  store.set('mods', mods);
  store.set('mode', mode);
  sfx.click();
  renderSetup();
}

// Pick tonight's mode ('standard', 'generator' or 'tasks', see MODES in data.js).
function setMode(m) {
  mode = m;
  store.set('mode', mode);
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

// The "Best:" line. `??` means "use the right side if the left side is missing";
// a best score saved before a threat existed has no level for it, so it shows –.
// `?.` means "only if it exists": older saves have no mods list at all. ★ marks a modifier.
function bestText() {
  if (!best) return 'No night survived yet.';
  const parts = SETUP.map((c, i) => `${symHtml(c)} ${best.levels[i] ?? '–'}${best.mods?.[i] && best.levels[i] > 0 ? '★' : ''}`).join(' · ');
  const where = best.mode && best.mode !== 'standard' ? ` (${MODES[best.mode].name} mode)` : '';
  return `Best: survived${where} on ${parts} <b>(total ${best.sum} / ${MAX_SCORE})</b>`;
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
