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
// First the jumpscare (shaking and flashing red) for 1.5 seconds, then the Game Over message and buttons.
function showScare(message, artHtml) {
  const art = $('scareArt'), cover = $('scare');
  $('loseMsg').innerHTML = message;
  art.innerHTML = artHtml;
  art.hidden = false;
  $('scareMsg').hidden = true;
  cover.hidden = false;
  art.classList.add('shake');     // the shake and flash animations are defined in style.css
  cover.classList.add('flash');
  clearTimeout(scareTimer);
  // setTimeout(fn, 1500) runs fn once, 1500 milliseconds from now.
  scareTimer = setTimeout(() => {
    art.classList.remove('shake');
    cover.classList.remove('flash');
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
function showWin(sum, isBest) {
  const powerLeft = Math.max(0, Math.ceil(G.power));
  $('winMsg').textContent = `You kept them out until morning with ${powerLeft}% power left.`;
  $('winLevels').innerHTML =
    SETUP.map((c, i) => `<span>${symHtml(c)} level ${levels[i]}</span>`).join('') +
    `<span class="dim">total ${sum} / ${SETUP.length * MAX_LEVEL}</span>`;
  $('winBest').innerHTML = isBest ? '<b>New best.</b> This is the hardest night you have survived.' : bestText();
  show('win');
}

// ---------- custom night (level picker) ----------
// Build one row per entry in SETUP. Runs once at start-up; renderSetup() then fills in the numbers.
// The `...${}...` strings are "template literals": ${something} drops a value into the text.
function buildSetup() {
  $('rows').innerHTML = SETUP.map((c, i) => `
    <div class="lvrow" data-i="${i}">
      ${symHtml(c, ' big')}
      <span class="who"><b>${c.name.toUpperCase()} · ${c.door}</b><small>${c.path}</small></span>
      <span class="ctrl">
        <button type="button" class="step" data-i="${i}" data-d="-1" aria-label="Lower ${c.name} level">−</button>
        <span class="lv"><b id="lv${i}"></b><span class="bar" id="bar${i}"></span></span>
        <button type="button" class="step" data-i="${i}" data-d="1" aria-label="Raise ${c.name} level">+</button>
      </span>
    </div>`).join('');
}

// Update the numbers, bars and selected row on the custom night screen.
function renderSetup() {
  document.querySelectorAll('.lvrow').forEach((row, i) => row.classList.toggle('sel', i === sel));
  levels.forEach((lv, i) => {
    $('lv' + i).textContent = 'LEVEL ' + String(lv).padStart(2, '0');   // 5 shows as "05"
    $('bar' + i).textContent = '|'.repeat(lv) + '.'.repeat(MAX_LEVEL - lv);
  });
  $('bestLine').innerHTML = bestText();
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
// a best score saved before Lenny existed has no 4th level, so it shows –.
function bestText() {
  if (!best) return 'No night survived yet.';
  const parts = SETUP.map((c, i) => `${symHtml(c)} ${best.levels[i] ?? '–'}`).join(' · ');
  return `Best: survived to 6 AM on ${parts} <b>(total ${best.sum} / ${SETUP.length * MAX_LEVEL})</b>`;
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
