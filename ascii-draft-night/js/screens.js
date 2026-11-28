/* =====================================================================
   screens.js: switching between screens, and everything that is not
   the night itself: the title, the pick screen, the 6 AM screen, the
   jumpscare and game over, the pause panel, How to play and the sound
   button.

   Showing and hiding works through the HTML `hidden` attribute:
   element.hidden = true hides it, element.hidden = false shows it.
   ===================================================================== */

let currentScreen = 'title';   // which screen is showing: 'title', 'pick', 'game', 'win', 'emblems' or 'custom'
let scareTimer = 0;            // the timer that swaps the jumpscare for the Game Over text
let confirmNew = false;        // "New run" was clicked once while a run is saved: the next click starts over
let lastWin = null;            // what the last 6 AM screen was about ({ result: 'won' or 'next', ... })

// Show one screen and hide the others.
function show(name) {
  currentScreen = name;
  // A button on the screen we're leaving may still have keyboard focus, even though it's hidden now.
  // Then Enter would go to that hidden button and do nothing, so let go of it.
  if (document.activeElement instanceof HTMLButtonElement) document.activeElement.blur();
  for (const s of ['title', 'pick', 'game', 'win', 'emblems', 'custom']) $('scr-' + s).hidden = s !== name;
  // Leaving a custom night for the menus: from here on, nights are the run's again (until the next one).
  if (name === 'title' || name === 'pick' || name === 'custom') custom = null;
  if (name === 'title') renderTitle();
  if (name === 'pick') renderPick();
  if (name === 'emblems') renderEmblems();
  if (name === 'custom') renderCustom();
  if (name === 'game') dirty = true;
}

// ---------- a character's card and info ----------
// The text that explains one character: name, rarity and points, where it comes from, how to stop it
// and its kill tally. Used by the info box on the pick screen and on the pause panel.
function whoHtml(c) {
  const R = RARITIES[c.rarity], n = kills[c.id] || 0;
  return `<b class="c-${c.id}">${c.name.toUpperCase()}</b> <span class="${R.cls}">· ${R.name}${c.bonus ? ' bonus' : ''} · ${R.points} pts</span>` +
    ` <span class="dim">· ${c.where}</span><br>${c.desc}` +
    `<br><span class="dim">Emblems:</span> ${DIFF_ORDER.map(d => `${medalHtml(c.id, d)} <span class="dim">${DIFFICULTIES[d].name}</span>`).join(' &nbsp;')}` +
    (n ? `<br><span class="kills">☠ Got you ${n === 1 ? 'once' : n + ' times'}</span>` : '');
}
// A small card for a lineup or roster: face, name and points, with a border in its rarity's color.
const miniCard = c => `<div class="mini-card ${RARITIES[c.rarity].cls}" data-id="${c.id}">${iconHtml(c)}<b>${c.name}</b><span class="pts">${pointsOf(c)} pts</span></div>`;

// ---------- emblems ----------
// One completion emblem as a little medal in its difficulty's color: ● once you've won a run on that
// difficulty with this character, a faint ○ until then. (The title attribute is the text that shows
// when the mouse rests on it, and what a screen reader says.)
function medalHtml(id, d) {
  const D = DIFFICULTIES[d], got = hasEmblem(id, d);
  return `<span class="medal ${D.cls}${got ? ' got' : ''}" title="${D.name}: ${got ? 'won' : 'not yet'}">${got ? '●' : '○'}</span>`;
}
// All four of a character's medals in a row, easiest first.
const medalsHtml = id => `<span class="medals">${DIFF_ORDER.map(d => medalHtml(id, d)).join('')}</span>`;

// The emblem screen: every character, grouped by rarity, with its four medals under its card.
let hoverEmblem = null;   // the id of the card the mouse is over on the emblem screen
function renderEmblems() {
  $('emblemTotal').innerHTML = `<b>${emblemCount()}</b> of ${EMBLEM_TOTAL} emblems · ` +
    DIFF_ORDER.map(d => `<span class="${DIFFICULTIES[d].cls}">● ${DIFFICULTIES[d].name}</span>`).join(' · ');
  setHtml($('emblemGroups'), RARITY_ORDER.map(r => {
    const chars = ROSTER.filter(c => c.rarity === r);
    return `<p class="lab ${RARITIES[r].cls}">${RARITIES[r].name}</p><div class="mini-roster">` +
      chars.map(c => miniCard(c).replace(/<\/div>$/, medalsHtml(c.id) + '</div>')).join('') + '</div>';
  }).join(''));
  const c = hoverEmblem && byId(hoverEmblem);
  $('emblemWho').innerHTML = c ? whoHtml(c) : '<span class="dim">Point at a character to see how it works.</span>';
}

// ---------- title ----------
function renderTitle() {
  confirmNew = false;
  $('btnContinue').hidden = !run;
  if (run) $('btnContinue').innerHTML = `Continue run · ${DIFFICULTIES[diffOf(run)].name} · night ${run.night} <kbd>Enter</kbd>`;
  $('btnNewRun').innerHTML = 'New run <kbd>N</kbd>';
  $('goalText').textContent = DIFFICULTIES[difficulty].goal;
  // One button per difficulty; aria-pressed="true" marks the picked one (the CSS fills it in).
  setHtml($('diffs'), DIFF_ORDER.map(d => {
    const D = DIFFICULTIES[d];
    return `<button type="button" class="${D.cls}" data-diff="${d}" aria-pressed="${d === difficulty}">${D.name}<small>${D.goal} pts</small></button>`;
  }).join(''));
  const r = records;
  // Wins for each difficulty you've won at least once, like "Easy 2 (fastest: 4 nights)".
  const wins = DIFF_ORDER.filter(d => records.diffs[d] && records.diffs[d].wins).map(d => {
    const mine = records.diffs[d];
    return `<span class="${DIFFICULTIES[d].cls}">${DIFFICULTIES[d].name}</span> <b>${mine.wins}</b> (fastest: ${mine.fastestWin} nights)`;
  });
  $('recordLine').innerHTML = (r.runs
    ? `Runs: <b>${r.runs}</b> · won: <b>${r.wins}</b> · best night: <b>${r.bestNight}</b> · most points survived: <b>${r.bestPoints}</b>` +
      (wins.length ? `<br>Wins: ${wins.join(' · ')}` : '') + `<br>Emblems: <b>${emblemCount()}</b> of ${EMBLEM_TOTAL}`
    : 'No runs yet.') + (r.customBest ? `<br>Custom night best: <b>${r.customBest}</b> points survived` : '');
  // The night length slider: its position and the length it stands for.
  $('nightLen').value = nightLength;
  $('lenText').textContent = NIGHT_LENGTHS[nightLength].label;
}

// ---------- the custom night menu ----------
// Every character, grouped by rarity: the ones switched on are lit, the rest faded. Pointing at one shows
// how it works. The status line says how many are on, what they're worth and your best.
let hoverCustom = null;   // the id of the card the mouse is over
function renderCustom() {
  const on = customPick.filter(byId);
  $('customStatus').innerHTML = `<b>${on.length}</b> on · worth <b>${pointsOfIds(on)}</b> points · night length <b>${NIGHT_LENGTHS[nightLength].label}</b>` +
    (records.customBest ? ` · your best: <b>${records.customBest}</b> points survived` : '');
  setHtml($('customGroups'), RARITY_ORDER.map(r =>
    `<p class="lab ${RARITIES[r].cls}">${RARITIES[r].name}</p><div class="mini-roster">` +
    ROSTER.filter(c => c.rarity === r).map(c => miniCard(c).replace('mini-card', `mini-card pickable${on.includes(c.id) ? ' on' : ''}`)).join('') +
    '</div>').join(''));
  const c = hoverCustom && byId(hoverCustom);
  $('customWho').innerHTML = c ? whoHtml(c) : '<span class="dim">Click characters to switch them on or off. Point at one to see how it works.</span>';
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
  const D = DIFFICULTIES[diffOf(run)], goal = D.goal;
  $('runStatus').innerHTML = `<span class="${D.cls}">${D.name}</span> · <span class="hearts">${heartsText(run.lives)}</span> ${run.lives} ${run.lives === 1 ? 'life' : 'lives'} left` +
    ` · lineup worth <b>${pointsOfIds(run.lineup)}</b> of <b>${goal}</b> points`;
  // The cards on offer. Each one is a button; data-id says who it is, and the number in its corner is
  // the key (1 to 5) that takes it.
  setHtml($('offer'), run.offer.length
    ? run.offer.map(byId).filter(Boolean).map((c, i) => {
      const R = RARITIES[c.rarity], taken = run.picked.includes(c.id), n = kills[c.id] || 0;
      return `<button type="button" class="card ${R.cls}${taken ? ' taken' : ''}" data-id="${c.id}" aria-pressed="${taken}">` +
        `<span class="key">${i + 1}</span>${n ? `<small class="kills">☠${n}</small>` : ''}` +
        (c.bonus ? '<span class="bonus-tag">BONUS</span>' : '') + `<span class="rar">${R.name} · ${R.points}</span>${iconHtml(c, ' big')}<b class="name">${c.name}</b>` +
        `<span class="where">${c.where}</span>${medalsHtml(c.id)}<span class="taken-tag">${taken ? '✓ TAKEN' : 'TAKE'}</span></button>`;
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
  $('tonightLine').innerHTML = `Tonight: <b>${pts}</b> of ${goal} points · ` +
    (pts >= goal ? '<b class="r-legendary">Survive this night to WIN THE RUN!</b>'
      : ids.length ? `${goal - pts} more to go.` : 'an empty night is safe, but it gets you nowhere.');
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
  const on = charsOf(nightLineup());
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
  $('btnCustomLose').hidden = !outcome.custom;
  if (outcome.custom) {
    // A custom night: no lives and no run to end. Try again, or go back and change who's on.
    $('loseTitle').textContent = 'CAUGHT';
    $('loseMsg').innerHTML = message + '<br><br>A custom night has no lives: try it again, or change who\'s on.';
    $('loseLives').textContent = '';
    $('btnRetry').hidden = false;
    $('btnRetry').innerHTML = 'Retry custom night <kbd>Enter</kbd>';
    $('btnNewRunLose').hidden = true;
  } else {
    $('loseTitle').textContent = outcome.over ? 'RUN OVER' : 'CAUGHT';
    $('loseMsg').innerHTML = message + (outcome.over
      ? `<br><br>That was your last life. Your run ended on night ${R.night}, with a lineup worth ${pointsOfIds(R.lineup)} points.`
      : `<br><br>You lost a life. Night ${R.night} starts again with the same lineup.`);
    $('loseLives').textContent = heartsText(R.lives);
    $('btnRetry').hidden = outcome.over;
    $('btnRetry').innerHTML = `Retry night ${R.night} <kbd>Enter</kbd>`;
    $('btnNewRunLose').hidden = !outcome.over;
  }
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
  $('btnCustomWin').hidden = outcome.result !== 'custom';
  if (outcome.result === 'custom') {
    // A custom night: just how you did, and your best.
    const ids = custom.ids;
    $('winEyebrow').textContent = 'Custom night complete';
    $('winBig').textContent = '6:00 AM';
    $('winMsg').innerHTML = `You survived a custom night against ${ids.length} character${ids.length === 1 ? '' : 's'} worth ` +
      `<b>${outcome.points}</b> points, with ${powerLeft}% power left.`;
    setHtml($('winLineup'), charsOf(ids).map(miniCard).join(''));
    $('winRecord').innerHTML = outcome.best ? '<b>Your best custom night yet.</b>' : '';
    $('winEmblems').hidden = true;
    $('btnNext').hidden = $('btnNewRunWin').hidden = true;
    show('win');
    $('btnCustomWin').focus({ preventScroll: true });
    return;
  }
  const R = outcome.run, won = outcome.result === 'won';
  const night = won ? R.night : R.night - 1;   // for 'next', run.night has already moved on
  const d = diffOf(R), D = DIFFICULTIES[d];
  $('winEyebrow').textContent = won ? `Run complete · ${D.name}` : `Night ${night} complete`;
  $('winBig').textContent = won ? 'YOU WIN' : '6:00 AM';
  $('winMsg').innerHTML = won
    ? `You survived night ${night} with a lineup worth <b>${outcome.points}</b> points (the goal on ${D.name} was ${D.goal}), with ${powerLeft}% power left and ${heartsText(R.lives)} lives to spare.`
    : `You made it to morning with ${powerLeft}% power left. Your lineup is worth <b>${outcome.points}</b> of ${D.goal} points: pick more characters for night ${R.night}.`;
  setHtml($('winLineup'), charsOf(R.lineup).map(miniCard).join(''));
  $('winRecord').innerHTML = won && diffRecord(d).fastestWin === night ? `<b>Your fastest ${D.name} win yet.</b>` : '';
  // The emblems this win earned: the cards of everyone who just got this difficulty's medal.
  const fresh = won ? (outcome.emblems || []).map(e => byId(e.id)).filter(Boolean) : [];
  $('winEmblems').hidden = !won;
  if (won) $('winEmblems').innerHTML = fresh.length
    ? `<p class="lab">New emblems <span class="${D.cls}">● ${D.name}</span> (${fresh.length})</p><div class="mini-roster lineup">` +
      fresh.map(c => miniCard(c).replace(/<\/div>$/, medalsHtml(c.id) + '</div>')).join('') + '</div>'
    : `<p class="best">No new emblems: everyone in this lineup already had their ${D.name} emblem.</p>`;
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
