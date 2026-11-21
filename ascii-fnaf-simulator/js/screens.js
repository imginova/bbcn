/* =====================================================================
   screens.js: the MENUS. The title, the list of nights, the custom
   night, pause, "How to play" and the end of the night.

   Screens are switched with show('nights') and so on: every screen is
   in index.html, and all but one carry the `hidden` attribute.
   ===================================================================== */

let currentScreen = 'title';   // 'title', 'nights', 'custom' or 'game' (not `screen`: that's a browser built-in)
let pickedNight = 1;           // the night selected on the night list

function show(name) {
  currentScreen = name;
  for (const s of ['title', 'nights', 'custom', 'game']) $('scr-' + s).hidden = s !== name;
  $('end').hidden = true;
  $('pause').hidden = true;
  if (name === 'title') renderTitle();
  if (name === 'nights') renderNights();
  if (name === 'custom') renderCustom();
  if (name !== 'game') sfx.humOff();
}

function renderTitle() {
  $('btnCustom').disabled = !customUnlocked();
  $('btnCustom').textContent = 'Custom Night';
  $('titleProgress').textContent = `Nights beaten: ${NIGHTS.filter((_, i) => nightBeaten(i + 1)).length} / ${NIGHTS.length}` +
    ` · Gimmick nights: ${GIMMICKS.filter(x => gimmickBeaten(x.id)).length} / ${GIMMICKS.length}`;
  $('btnAch').textContent = `Achievements ${achieved.filter(id => ACHIEVEMENTS.some(a => a.id === id)).length} / ${ACHIEVEMENTS.length}`;
}

// ---------- the night list ----------
const nightOpen = () => true;   // every night is open from the start (see customUnlocked in game.js)

// How hard each night is (its `diff` in data.js, measured with the test bot), since every night is open
// and you can play them in any order.
const DIFF_NAMES = ['', 'Easy', 'Medium', 'Hard', 'Very hard'];
const diffTag = night => night.diff ? `<span class="ndiff d${night.diff}">${DIFF_NAMES[night.diff]}</span>` : '';

function renderNights() {
  setHtml($('nightList'), NIGHTS.map((night, i) => {
    const n = i + 1;
    const cls = ['night', n === pickedNight ? 'picked' : '', nightBeaten(n) ? 'beaten' : ''].join(' ');
    return `<button class="${cls}" data-night="${n}">` +
      `<span class="nnum">NIGHT ${n}${nightBeaten(n) ? ' <span class="tick">&#10003;</span>' : ''}</span>` +
      `<span class="nname">${escText(night.name)} ${diffTag(night)}</span>` +
      `<span class="ncrew">${night.crew.map(id => faceHtml(id)).join(' ')}</span></button>`;
  }).join(''));
  // The gimmick nights: picked by id ("nap"), where the numbered nights are picked by number.
  setHtml($('gimmickList'), GIMMICKS.map(gn => {
    const cls = ['night', 'gimmick', gn.id === pickedNight ? 'picked' : '', gimmickBeaten(gn.id) ? 'beaten' : ''].join(' ');
    return `<button class="${cls}" data-gimmick="${gn.id}">` +
      `<span class="nnum">${escText(gn.name)}${gimmickBeaten(gn.id) ? ' <span class="tick">&#10003;</span>' : ''}</span>` +
      `<span class="nname">${escText(GUARD_BY_ID[gn.guard].name)} <span class="ndiff ${gn.type}">${gn.type === 'puzzle' ? 'Puzzle' : 'Silly'}</span></span>` +
      `<span class="ncrew">${gn.crew.map(id => faceHtml(id)).join(' ')}</span></button>`;
  }).join(''));
  renderNightInfo();
}
// The setup for whatever is picked on the night list.
const pickedSetup = () => typeof pickedNight === 'number' ? storySetup(pickedNight) : gimmickSetup(pickedNight);

// The details of the selected night: the guard, its tools, your crew and a tip.
function renderNightInfo() {
  const night = typeof pickedNight === 'number' ? NIGHTS[pickedNight - 1] : GIMMICK_BY_ID[pickedNight];
  const g = GUARD_BY_ID[night.guard];
  $('btnStart').disabled = false;
  setHtml($('nightInfo'),
    `<div class="vs"><div class="side">${iconHtml(g.id)}<div><b>${escText(g.name)}</b> <span class="dim">(${g.from}) · skill ${night.skill ?? g.skill}</span>${caughtTag(g.id)}` +
    `<div>${escText(g.desc)}</div><div class="tools">${g.tools.map(t => `<span class="tool" title="${escText(TOOLS[t].desc)}">${TOOLS[t].name}</span>`).join('')}</div></div></div></div>` +
    `<div class="crewlist">${night.crew.map(id => crewLine(id)).join('')}</div>` +
    `<p class="tip"><b>Tip:</b> ${escText(night.tip)}</p>`);
}
// The kill counter, as a small red tag: how many guards an animatronic has caught, and how many times a
// guard has been caught. Nothing shows until the count is above 0.
const times = n => `${n} time${n === 1 ? '' : 's'}`;
const catchTag = id => catches[id] ? ` <span class="kills" title="Caught a guard ${times(catches[id])}">&#9760;${catches[id]}</span>` : '';
const caughtTag = id => guardCaught[id] ? ` <span class="kills" title="Caught ${times(guardCaught[id])}">&#9760;${guardCaught[id]}</span>` : '';

// One animatronic: face, name, what it does and its ability.
function crewLine(id) {
  const c = CREW_BY_ID[id];
  return `<div class="cline">${iconHtml(id)}<div><b class="c-${id}">${escText(c.name)}</b> <span class="dim">(${c.from})</span>${catchTag(id)}` +
    `<div>${escText(c.desc)}</div><div><span class="you">Q · ${escText(c.ability.name)}:</span> ${escText(c.ability.desc)}</div></div></div>`;
}

// ---------- the custom night ----------
// Everything about the night can be changed: the guard, its skill, its tools, the crew (with a level
// each), the guard's starting power, the length of an hour, and how fast your cooldowns recharge.
const CUSTOM_LIMITS = { skill: [0, 20, 1], power: [10, 100, 10], hour: [15, 60, 5], speed: [50, 200, 10] };

function renderCustom() {
  // The ready-made challenges at the top: click one to play it straight away.
  setHtml($('cChallenges'), CHALLENGES.map(c => {
    const crewCount = c.crew === 'all' ? CREW.length : c.crew.length;
    return `<button class="challenge" data-challenge="${c.id}">${iconHtml(c.guard)}<span class="cbody">` +
      `<span><b>${escText(c.name)}</b>${challengeBeaten(c) ? ' <span class="tick">&#10003;</span>' : ''}` +
      `<span class="dim"> · vs ${escText(GUARD_BY_ID[c.guard].name)} · your crew: ${crewCount}</span></span>` +
      `<span class="cdesc">${escText(c.desc)}</span></span></button>`;
  }).join(''));
  const g = GUARD_BY_ID[custom.guard] || GUARDS[0];
  setHtml($('cGuards'), GUARDS.map(x =>
    `<button class="pickg ${x.id === g.id ? 'on' : ''}" data-guard="${x.id}">${iconHtml(x.id)}<span>${escText(x.name)}${caughtTag(x.id)}</span></button>`).join(''));
  setHtml($('cGuardInfo'), `<b>${escText(g.name)}</b> <span class="dim">(${g.from})</span>: ${escText(g.desc)}`);
  setHtml($('cTools'), TOOL_IDS.map(t =>
    `<button class="pickt ${custom.tools.includes(t) ? 'on' : ''}" data-tool="${t}" title="${escText(TOOLS[t].desc)}">${custom.tools.includes(t) ? '[x]' : '[ ]'} ${TOOLS[t].name}</button>`).join(''));
  const n = Object.keys(custom.crew).length;
  $('cCrewCount').textContent = `${n} / ${MAX_CREW}`;
  setHtml($('cCrew'), CREW.map(c => {
    const on = custom.crew[c.id] != null;
    return `<div class="pickc ${on ? 'on' : ''}" data-crew="${c.id}" title="${escText(c.desc)}">${iconHtml(c.id)}` +
      `<span class="c-${c.id}">${escText(c.name)}</span>${catchTag(c.id)}` +
      (on ? `<span class="lvl"><button data-lvl="-1" data-for="${c.id}">-</button> ${custom.crew[c.id]} <button data-lvl="1" data-for="${c.id}">+</button></span>`
        : '<span class="dim">off</span>') + '</div>';
  }).join(''));
  for (const k in CUSTOM_LIMITS) $('cv-' + k).textContent = k === 'speed' ? custom.speed + '%' : k === 'hour' ? custom.hour + ' s' : k === 'power' ? custom.power + '%' : custom.skill;
  $('btnCustomStart').disabled = n === 0;
}

function pickGuard(id) {
  const g = GUARD_BY_ID[id];
  if (!g) return;
  custom.guard = id;
  custom.skill = g.skill;
  custom.tools = g.tools.slice();   // a new guard comes with its own tools (you can change them after)
  saveCustom(); renderCustom();
}
function toggleTool(t) {
  custom.tools = custom.tools.includes(t) ? custom.tools.filter(x => x !== t) : [...custom.tools, t];
  saveCustom(); renderCustom();
}
function toggleCrew(id) {
  if (custom.crew[id] != null) delete custom.crew[id];
  else if (Object.keys(custom.crew).length < MAX_CREW) custom.crew[id] = 10;
  else { sfx.deny(); return; }
  saveCustom(); renderCustom();
}
function changeCrewLevel(id, step) {
  if (custom.crew[id] == null) return;
  custom.crew[id] = Math.max(1, Math.min(20, custom.crew[id] + step));
  saveCustom(); renderCustom();
}
function changeRule(key, dir) {
  const [lo, hi, step] = CUSTOM_LIMITS[key];
  custom[key] = Math.max(lo, Math.min(hi, custom[key] + dir * step));
  saveCustom(); renderCustom();
}

// ---------- pause ----------
function showPause(on) {
  $('pause').hidden = !on;
  if (on) setHtml($('pauseInfo'), `<div class="crewlist">${G.crew.map(u => crewLine(u.id)).join('')}</div>`);
}

// ---------- the end of the night ----------
function showEnd() {
  const r = G.result, g = G.guard, n = G.setup.night;
  renderGame();
  $('end').hidden = false;
  $('end').classList.toggle('won', r.won);
  if (r.won) {
    const why = r.how === 'power' ? `The power ran out, and ${r.by.def.name} walked right in.`
      : r.how === 'box' ? 'The music box ran out. The Puppet came for the guard.'
      : `${r.by.def.name} got ${g.name} at ${clockLabel()}.`;
    setHtml($('endArt'), `<span class="big">${iconHtml(r.by.id)}</span>`);
    $('endTitle').textContent = 'GOT HIM!';
    $('endText').textContent = why + (G.setup.challenge ? ` Challenge complete: ${G.setup.challenge.name}!` : '');
    // The kill counter, and any achievements this win earned.
    setHtml($('endStats'), `<div class="kills">${escText(r.by.def.name)} has caught a guard ${times(catches[r.by.id])}. ` +
      `${escText(g.name)} has been caught ${times(guardCaught[g.def.id])}.</div>` +
      (r.unlocked || []).map(a => `<div class="ach-new">Achievement unlocked: <b>${escText(a.name)}</b> <span class="dim">${escText(a.desc)}</span></div>`).join(''));
  } else {
    setHtml($('endArt'), `<span class="big">${iconHtml(g.def.id)}</span>`);
    $('endTitle').textContent = '6 AM';
    $('endText').textContent = `${g.name} survived the night with ${pct(g.power)}% power left.`;
    setHtml($('endStats'), guardCaught[g.def.id] ? `<div class="dim">${escText(g.name)} has been caught ${times(guardCaught[g.def.id])} so far.</div>` : '');
  }
  // "Next night" after a won story night; "Roll again" any time after a Random night.
  $('btnNext').hidden = !(G.setup.random || (r.won && n && n < NIGHTS.length));
  $('btnNext').textContent = G.setup.random ? 'Roll again' : 'Next night';
}

// ---------- achievements ----------
function showAchievements(on) {
  $('achievements').hidden = !on;
  if (!on) return;
  setHtml($('achList'), ACHIEVEMENTS.map(a => {
    const got = achieved.includes(a.id);
    return `<li class="${got ? 'got' : ''}"><span class="mark">${got ? '&#10003;' : '&middot;'}</span><b>${escText(a.name)}</b> <span class="dim">${escText(a.desc)}</span></li>`;
  }).join(''));
}

// ---------- how to play, mute ----------
function showHowto(on) { $('howto').hidden = !on; }
function renderMute() { $('btnMute').textContent = sfx.muted ? 'Sound: off' : 'Sound: on'; }
