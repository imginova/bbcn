/* =====================================================================
   input.js: every CLICK and KEY PRESS.

   It only listens, then calls the functions that do the work (game.js
   for the night, screens.js for the menus).

   Things that are redrawn many times a second (the map, the crew cards)
   react on `pointerdown` instead of `click`: a click needs the button
   to still be the same one when the mouse button comes back up, and a
   redraw in between would lose it.
   ===================================================================== */

// The first click or key press is allowed to start the sound engine (browsers insist on that).
document.addEventListener('pointerdown', () => sfx.init(), { once: true });
document.addEventListener('keydown', () => sfx.init(), { once: true });

// ---------- title and menus ----------
$('btnNights').addEventListener('click', () => { sfx.click(); show('nights'); });
$('btnCustom').addEventListener('click', () => { sfx.click(); if (customUnlocked()) show('custom'); });
$('btnHowto').addEventListener('click', () => { sfx.click(); showHowto(true); });
$('btnHowtoClose').addEventListener('click', () => showHowto(false));
$('btnAch').addEventListener('click', () => { sfx.click(); showAchievements(true); });
$('btnAchClose').addEventListener('click', () => showAchievements(false));
document.querySelectorAll('[data-back]').forEach(b => b.addEventListener('click', () => { sfx.click(); show('title'); }));
$('btnMute').addEventListener('click', () => { sfx.toggleMute(); renderMute(); });

// The night list: pick a night, then start it.
$('nightList').addEventListener('click', e => {
  const b = e.target.closest('[data-night]');
  if (!b || b.disabled) return;
  sfx.select();
  pickedNight = Number(b.dataset.night);
  renderNights();
});
$('btnStart').addEventListener('click', () => { if (nightOpen(pickedNight)) startNight(storySetup(pickedNight)); });

// The custom night.
$('cChallenges').addEventListener('click', e => {
  const b = e.target.closest('[data-challenge]');
  const c = b && CHALLENGES.find(x => x.id === b.dataset.challenge);
  if (c) startNight(challengeSetup(c));
});
$('cGuards').addEventListener('click', e => { const b = e.target.closest('[data-guard]'); if (b) { sfx.select(); pickGuard(b.dataset.guard); } });
$('cTools').addEventListener('click', e => { const b = e.target.closest('[data-tool]'); if (b) { sfx.select(); toggleTool(b.dataset.tool); } });
$('cCrew').addEventListener('click', e => {
  const lvl = e.target.closest('[data-lvl]');
  if (lvl) { sfx.click(); changeCrewLevel(lvl.dataset.for, Number(lvl.dataset.lvl)); return; }
  const card = e.target.closest('[data-crew]');
  if (card) { sfx.select(); toggleCrew(card.dataset.crew); }
});
document.querySelectorAll('[data-rule]').forEach(b => b.addEventListener('click', () => {
  sfx.click();
  changeRule(b.dataset.rule, Number(b.dataset.dir));
}));
$('btnCustomStart').addEventListener('click', () => { if (Object.keys(custom.crew).length) startNight(customSetup()); });

// ---------- during a night ----------
// The map: click a lit room to walk there. Clicking a room with one of your animatronics in it (that
// isn't somewhere you can walk) selects that animatronic instead.
$('map').addEventListener('pointerdown', e => {
  if (!G || G.over || G.paused) return;
  const way = e.target.closest('[data-attack]');
  if (way) { attackFrom(way.dataset.attack); return; }
  const b = e.target.closest('[data-room]');
  if (!b) return;
  const room = b.dataset.room, u = selected();
  if (u && u.room !== room && ROOMS[u.room] && ROOMS[u.room].to.includes(room)) { moveTo(room); return; }
  const mine = G.crew.findIndex(o => o.room === room && (o.def.kind === 'walker' || o.def.kind === 'foxy'));
  if (mine >= 0) { selectUnit(mine); return; }
  moveTo(room);   // explains why not
});

// The crew cards: click one to select it, or its button to use its ability.
$('crew').addEventListener('pointerdown', e => {
  if (!G || G.over || G.paused) return;
  const ab = e.target.closest('[data-ability]');
  if (ab) { selectUnit(Number(ab.dataset.ability), true); useAbility(); return; }
  const card = e.target.closest('[data-unit]');
  if (card) selectUnit(Number(card.dataset.unit));
});

function selectUnit(i, quiet = false) {
  if (!G.crew[i]) return;
  if (G.sel !== i && !quiet) sfx.select();
  G.sel = i;
  dirty = true;
}

// E: attack with the selected animatronic, through whichever way in its corner leads to.
function attackSelected() {
  const u = selected();
  const entry = u && Object.keys(ENTRIES).find(e => ENTRIES[e] === u.room);
  if (entry) attackFrom(entry);
  else { sfx.deny(); flashHint('Get to a corner (W. Corner, E. Corner) or Vent C first.'); }
}

$('btnPause').addEventListener('click', () => setPaused(true));
$('btnResume').addEventListener('click', () => setPaused(false));
$('btnQuit').addEventListener('click', () => { G.over = true; show('nights'); });
$('btnRetry').addEventListener('click', () => startNight(G.setup));
$('btnNext').addEventListener('click', () => {
  pickedNight = Math.min(NIGHTS.length, G.setup.night + 1);
  startNight(storySetup(pickedNight));
});
$('btnMenu').addEventListener('click', () => show(G.setup.night ? 'nights' : 'custom'));

// ---------- the keyboard ----------
document.addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  if (!$('howto').hidden) { if (k === 'escape') showHowto(false); return; }
  if (!$('achievements').hidden) { if (k === 'escape') showAchievements(false); return; }
  if (k === 'm') { sfx.toggleMute(); renderMute(); return; }
  if (currentScreen !== 'game' || !G || G.over) return;
  if (k === 'p' || k === 'escape') { setPaused(!G.paused); e.preventDefault(); return; }
  if (G.paused) return;
  if (e.repeat) return;                       // holding a key down shouldn't repeat actions
  // 1 to 9 pick the first nine, 0 the tenth. Tab (or ]) picks the next one and Shift+Tab (or [) the one
  // before, which is how to reach everyone in a big crew like Max mode's.
  if (k >= '1' && k <= '9') selectUnit(Number(k) - 1);
  else if (k === '0') selectUnit(9);
  else if (k === 'q') useAbility();
  else if (k === 'e') attackSelected();
  else if (k === 'tab' || k === ']' || k === '[') {
    const back = (k === 'tab' && e.shiftKey) || k === '[';
    selectUnit((G.sel + (back ? G.crew.length - 1 : 1)) % G.crew.length);
    e.preventDefault();
  }
});

// Pause by itself when you switch to another tab or window, so the guard doesn't win while you're away.
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { setPaused(true); sfx.sleep(); } else sfx.wake();
});
window.addEventListener('blur', () => setPaused(true));
