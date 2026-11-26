/* =====================================================================
   screens.js: switching between screens, and everything that is not
   the night itself: the title, the pick screen, the 6 AM screen, the
   jumpscare and game over, the pause panel, How to play and the sound
   button.

   Showing and hiding works through the HTML `hidden` attribute:
   element.hidden = true hides it, element.hidden = false shows it.
   ===================================================================== */

let currentScreen = 'title';   // which screen is showing: 'title', 'pick', 'game' or 'win'
let scareTimer = 0;            // the timer that swaps the jumpscare for the Game Over text
let confirmNew = false;        // "New run" was clicked once while a run is saved: the next click starts over
let lastWin = null;            // what the last 6 AM screen was about ({ result: 'won' or 'next', ... })

// Show one screen and hide the others.
function show(name) {
  currentScreen = name;
  // A button on the screen we're leaving may still have keyboard focus, even though it's hidden now.
  // Then Enter would go to that hidden button and do nothing, so let go of it.
  if (document.activeElement instanceof HTMLButtonElement) document.activeElement.blur();
  for (const s of ['title', 'pick', 'game', 'win']) $('scr-' + s).hidden = s !== name;
  if (name === 'title') renderTitle();
  if (name === 'pick') renderPick();
  if (name === 'game') dirty = true;
}

// ---------- a character's card and info ----------
// The text that explains one character: name, rarity and points, where it comes from, how to stop it
// and its kill tally. Used by the info box on the pick screen and on the pause panel.
function whoHtml(c) {
  const R = RARITIES[c.rarity], n = kills[c.id] || 0;
  return `<b class="c-${c.id}">${c.name.toUpperCase()}</b> <span class="${R.cls}">· ${R.name}${c.bonus ? ' bonus' : ''} · ${R.points} pts</span>` +
    ` <span class="dim">· ${c.where}</span><br>${c.desc}` +
    (n ? `<br><span class="kills">☠ Got you ${n === 1 ? 'once' : n + ' times'}</span>` : '');
}
// A small card for a lineup or roster: face, name and points, with a border in its rarity's color.
const miniCard = c => `<div class="mini-card ${RARITIES[c.rarity].cls}" data-id="${c.id}">${iconHtml(c)}<b>${c.name}</b><span class="pts">${pointsOf(c)} pts</span></div>`;

// ---------- title ----------
function renderTitle() {
  confirmNew = false;
  $('btnContinue').hidden = !run;
  if (run) $('btnContinue').innerHTML = `Continue run · night ${run.night} <kbd>Enter</kbd>`;
  $('btnNewRun').innerHTML = 'New run <kbd>N</kbd>';
  const r = records;
  $('recordLine').innerHTML = r.runs
    ? `Runs: <b>${r.runs}</b> · won: <b>${r.wins}</b> · best night: <b>${r.bestNight}</b> · most points survived: <b>${r.bestPoints}</b>` +
      (r.fastestWin ? ` · fastest win: <b>${r.fastestWin} nights</b>` : '')
    : 'No runs yet.';
}
// The "New run" button. With a run saved, the first click only asks ("This ends your run"), and a
// second click starts over, so one stray click can't throw a run away.
function pressNewRun() {
  if (run && !confirmNew) {
    confirmNew = true;
    $('btnNewRun').innerHTML = 'Really? This ends your run <kbd>N</kbd>';
    sfx.deny();
    return;
  }
  newRun();
}

// ---------- the pick screen ----------
let hoverCard = null;   // the id of the card the mouse is over (null: none)
function showPick() { show('pick'); }

function renderPick() {
  if (!run) { show('title'); return; }
  $('pickEyebrow').textContent = `Before night ${run.night}`;
  $('runStatus').innerHTML = `<span class="hearts">${heartsText(run.lives)}</span> ${run.lives} ${run.lives === 1 ? 'life' : 'lives'} left` +
    ` · lineup worth <b>${pointsOfIds(run.lineup)}</b> of <b>${GOAL_POINTS}</b> points`;
  // The cards on offer. Each one is a button; data-id says who it is, and the number in its corner is
  // the key (1 to 5) that takes it.
  setHtml($('offer'), run.offer.length
    ? run.offer.map(byId).filter(Boolean).map((c, i) => {
      const R = RARITIES[c.rarity], taken = run.picked.includes(c.id), n = kills[c.id] || 0;
      return `<button type="button" class="card ${R.cls}${taken ? ' taken' : ''}" data-id="${c.id}" aria-pressed="${taken}">` +
        `<span class="key">${i + 1}</span>${n ? `<small class="kills">☠${n}</small>` : ''}` +
        (c.bonus ? '<span class="bonus-tag">BONUS</span>' : '') + `<span class="rar">${R.name} · ${R.points}</span>${iconHtml(c, ' big')}<b class="name">${c.name}</b>` +
        `<span class="where">${c.where}</span><span class="taken-tag">${taken ? '✓ TAKEN' : 'TAKE'}</span></button>`;
    }).join('')
    : '<p class="dim">You already have everyone. Brave.</p>');
  renderWho();
  // The lineup so far (with tonight's picks marked as new).
  const ids = tonightIds();
  $('lineupLab').textContent = `Your lineup (${ids.length})`;
  setHtml($('lineup'), ids.length
    ? charsOf(ids).map(c => run.picked.includes(c.id) ? miniCard(c).replace('mini-card', 'mini-card new') : miniCard(c)).join('')
    : '<p class="dim">Nobody yet. Take some cards!</p>');
  const pts = pointsOfIds(ids);
  $('tonightLine').innerHTML = `Tonight: <b>${pts}</b> of ${GOAL_POINTS} points · ` +
    (pts >= GOAL_POINTS ? '<b class="r-legendary">Survive this night to WIN THE RUN!</b>'
      : ids.length ? `${GOAL_POINTS - pts} more to go.` : 'an empty night is safe, but it gets you nowhere.');
  $('btnBegin').innerHTML = `Start night ${run.night} <kbd>Enter</kbd>`;
}

// The info box under the cards: the card the mouse is over, or a hint.
function renderWho() {
  const c = hoverCard && byId(hoverCard);
  $('who').innerHTML = c ? whoHtml(c) : '<span class="dim">Point at a card to see how that character works.</span>';
}

// ---------- the pause panel ----------
// It also lists your lineup as small cards. Pointing at one shows how it works in #pauseInfo.
function showPause(visible) {
  $('pause').hidden = !visible;
  if (!visible || !run) return;
  const on = charsOf(run.lineup);
  $('pauseRoster').innerHTML = on.length ? on.map(miniCard).join('') : '<p class="dim">Nobody is on tonight.</p>';
  $('pauseInfo').innerHTML = on.length ? '<span class="dim">Point at someone to see how they work.</span>' : '';
}

// Quit the night (from the pause panel): back to the title. The run stays saved, and this night will
// start again from 12 AM.
function quitNight() {
  hideScare();
  if (G) { G.over = true; sfx.humOff(); }
  showPause(false);
  show('title');
}

// ---------- jumpscare and game over ----------
// First the jumpscare (shaking, if `shake`) for 1.5 seconds, then the Game Over message and buttons.
// `outcome` comes from nightLost() in run.js: { over, run }. There is no flashing strobe on purpose,
// to keep the scare easy on the eyes.
function showScare(message, artHtml, outcome, shake) {
  const art = $('scareArt'), cover = $('scare');
  const R = outcome.run;
  $('loseTitle').textContent = outcome.over ? 'RUN OVER' : 'CAUGHT';
  $('loseMsg').innerHTML = message + (outcome.over
    ? `<br><br>That was your last life. Your run ended on night ${R.night}, with a lineup worth ${pointsOfIds(R.lineup)} points.`
    : `<br><br>You lost a life. Night ${R.night} starts again with the same lineup.`);
  $('loseLives').textContent = heartsText(R.lives);
  $('btnRetry').hidden = outcome.over;
  $('btnRetry').innerHTML = `Retry night ${R.night} <kbd>Enter</kbd>`;
  $('btnNewRunLose').hidden = !outcome.over;
  art.innerHTML = artHtml;
  art.hidden = false;
  $('scareMsg').hidden = true;
  cover.hidden = false;
  art.classList.toggle('shake', shake);     // the shake animation is defined in style.css
  clearTimeout(scareTimer);
  // setTimeout(fn, 1500) runs fn once, 1500 milliseconds from now.
  scareTimer = setTimeout(() => {
    art.classList.remove('shake');
    art.hidden = true;
    $('scareMsg').hidden = false;
    $(outcome.over ? 'btnNewRunLose' : 'btnRetry').focus({ preventScroll: true });
  }, 1500);
}

function hideScare() {
  clearTimeout(scareTimer);
  $('scare').hidden = true;
  if (document.activeElement instanceof HTMLButtonElement) document.activeElement.blur();   // see show()
}

// ---------- 6 AM ----------
// `outcome` comes from nightSurvived() in run.js: { result: 'won' or 'next', run, points }.
function showWin(outcome, powerLeft) {
  lastWin = outcome;
  const R = outcome.run, won = outcome.result === 'won';
  const night = won ? R.night : R.night - 1;   // for 'next', run.night has already moved on
  $('winEyebrow').textContent = won ? 'Run complete' : `Night ${night} complete`;
  $('winBig').textContent = won ? 'YOU WIN' : '6:00 AM';
  $('winMsg').innerHTML = won
    ? `You survived night ${night} with a lineup worth <b>${outcome.points}</b> points (the goal was ${GOAL_POINTS}), with ${powerLeft}% power left and ${heartsText(R.lives)} lives to spare.`
    : `You made it to morning with ${powerLeft}% power left. Your lineup is worth <b>${outcome.points}</b> of ${GOAL_POINTS} points: pick more characters for night ${R.night}.`;
  setHtml($('winLineup'), charsOf(R.lineup).map(miniCard).join(''));
  $('winRecord').innerHTML = won && records.fastestWin === night ? '<b>Your fastest win yet.</b>' : '';
  $('btnNext').hidden = won;
  $('btnNewRunWin').hidden = !won;
  show('win');
  $(won ? 'btnNewRunWin' : 'btnNext').focus({ preventScroll: true });
}

// ---------- How to play ----------
// One line per character in the roster, from its desc, grouped by rarity.
function buildHowto() {
  $('howtoChars').innerHTML = RARITY_ORDER.flatMap(r => ROSTER.filter(c => c.rarity === r)).map(c =>
    `<li><b class="c-${c.id}">${c.name}</b> <span class="${RARITIES[c.rarity].cls}">(${RARITIES[c.rarity].name}${c.bonus ? ', bonus' : ''})</span>: ${c.desc}</li>`).join('');
}
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
