/* =====================================================================
   render.js: DRAWS the night on the page. It reads G (game.js) and
   never changes the rules.

   The game screen has five parts:
     the HUD        night, clock, guard, the guard's power
     the map        the building; your animatronics; where the guard's camera is
     the office cam the guard's office, so you can see what it's doing
     the crew       one card per animatronic, with its ability button
     the log        what just happened
   ===================================================================== */

// Only replace an element's HTML when it actually changed. Rebuilding the same HTML would throw away
// the buttons under your pointer for nothing (and cost the computer time).
function setHtml(el, html) {
  if (el._html !== html) { el._html = html; el.innerHTML = html; }
}

// A short message under the map ("Too far", "Needs 2 s"...), shown for a couple of seconds.
let hintText = '', hintUntil = 0;
function flashHint(text) {
  hintText = text;
  hintUntil = performance.now() + 2500;
  dirty = true;
}

const pct = x => Math.max(0, Math.ceil(x));
// A little bar made of blocks, `fill` from 0 to 1.
const bar = (fill, width = 10) => {
  const n = Math.round(clamp(fill, 0, 1) * width);
  return '#'.repeat(n) + '-'.repeat(width - n);
};

function renderGame(now = performance.now()) {
  if (!G) return;
  renderHud();
  renderMap();
  setHtml($('office'), toHtml(officeGrid()));
  renderGuardStatus();
  renderCrew();
  setHtml($('log'), G.log.map(l => `<li class="log-${l.cls}"><span class="log-t">${l.time}</span> ${escText(l.text)}</li>`).join(''));
  setHtml($('hint'), now < hintUntil ? escText(hintText) : '');
}

function renderHud() {
  const g = G.guard, n = G.setup.night;
  setHtml($('hudNight'), n ? `NIGHT ${n} · ${escText(NIGHTS[n - 1].name.toUpperCase())}` : 'CUSTOM NIGHT');
  setHtml($('hudClock'), clockLabel());
  setHtml($('hudGuard'), `${escText(g.name)} <span class="dim">skill ${g.skill}</span>`);
  // The guard's power and how much it's using right now (one block per thing switched on).
  const units = g.dead ? 0 : Math.round((usage() - BASE_DRAIN) / 0.25);
  setHtml($('hudPower'), `<span class="${g.power < 20 ? 'danger' : ''}">GUARD POWER ${pct(g.power)}%</span> <span class="dim">[${'|'.repeat(Math.min(6, units + 1)).padEnd(6, '.')}]</span>`);
}

// ---------- the map ----------
// Rooms are buttons in a grid (positions from ROOMS in data.js). The rooms the selected animatronic can
// walk to are lit up; the guard's camera shows as a red REC.
function renderMap() {
  const g = G.guard, u = selected();
  const cells = ROOM_IDS.map(id => {
    const r = ROOMS[id];
    const here = G.crew.filter(o => o.room === id && (o.def.kind === 'walker' || o.def.kind === 'foxy'));
    const canGo = u && u.room !== id && !whyCantMove(u, id);
    const reach = u && u.def.kind === 'walker' && ROOMS[u.room] && ROOMS[u.room].to.includes(id) && (!r.vent || u.def.vents);
    const watched = g.focus === 'cam' && g.cam === id && camsOk();
    const winding = g.focus === 'wind' && id === 'prize' && camsOk();
    const tags = [];
    if (watched || winding) tags.push(`<span class="rec">&#9679; REC</span>`);
    if (G.staticRooms[id] > G.t || ((watched || winding) && G.t < g.scrambleUntil)) tags.push('<span class="tag">STATIC</span>');
    if (r.audioOnly) tags.push('<span class="tag dim">AUDIO ONLY</span>');
    G.fx.filter(f => f.room === id).forEach(f => tags.push(`<span class="tag fx">${f.text}</span>`));
    const who = here.map(o => faceHtml(o.id, `${o === u ? ' me' : ''}${stunned(o) ? ' frozen' : ''}${o.attack ? ' attacking' : ''}`)).join(' ');
    const extra = id === 'cove' && G.crew.some(o => o.id === 'fox') ? `<span class="tag">stage ${G.crew.find(o => o.id === 'fox').stage}</span>` : '';
    const cls = ['room', r.vent ? 'vent' : '', canGo ? 'go' : reach ? 'near' : '', u && u.room === id ? 'here' : '', watched || winding ? 'watched' : ''].join(' ');
    return `<button class="${cls}" data-room="${id}" style="grid-row:${r.row};grid-column:${r.col}">` +
      `<span class="rcam">${r.cam}</span><span class="rname">${r.name}</span>${extra}${tags.join('')}<span class="who">${who}</span></button>`;
  });
  // The office square, with the three ways in: they light up when the selected animatronic can attack.
  const way = e => {
    const ready = u && u.def.kind === 'walker' && !u.attack && u.room === ENTRIES[e] && !stunned(u) && u.cd <= 0;
    const label = e === 'L' ? '&lt; LEFT' : e === 'R' ? 'RIGHT &gt;' : '^ VENT';
    return `<button class="attack ${ready ? 'ready' : ''} ${g.doors[e] ? 'shut' : ''}" data-attack="${e}">${label}${g.doors[e] ? '<br><span class="dim">shut</span>' : ''}</button>`;
  };
  cells.push(`<div class="room office" style="grid-row:4;grid-column:2"><span class="rname">OFFICE</span>` +
    `<span class="ways">${way('L')}${G.ventsUsed || guardHas('ventdoor') ? way('V') : ''}${way('R')}</span></div>`);
  setHtml($('map'), cells.join(''));
}

// ---------- what the guard is doing ----------
function renderGuardStatus() {
  const g = G.guard, t = G.t;
  const doing = {
    desk: 'is sitting at the desk',
    cam: `is watching ${g.cam ? `${ROOMS[g.cam].cam} · ${ROOMS[g.cam].name}` : 'the cameras'}`,
    wind: 'is winding the music box (CAM 3)',
    reboot: 'is rebooting the cameras',
    stun: 'is FROZEN with fright',
    hide: 'is HIDING under the desk',
    mask: 'is wearing the Freddy mask',
    lol: 'is typing L-O-L to get rid of Lolbit',
    shoo: `is shooing a ${G.pests[0] === 'cupcake' ? 'cupcake' : 'Freddle'} away`,
    dead: 'is sitting in the dark',
  }[g.focus];
  let html = `<b>${escText(g.name)}</b> ${doing}.`;
  if (t < g.lockUntil) html += ' <span class="you">(listening to the kitchen)</span>';
  if (t < g.distractedUntil) html += ' <span class="you">(confused)</span>';
  // Tool statuses: what's broken, what's on cooldown.
  const tags = [...g.tools].map(tool => {
    let state = '', cls = '';
    if (tool === 'cams' && g.camsBroken) { state = ' broken'; cls = 'off'; }
    else if (tool === 'cams' && t < g.scrambleUntil) { state = ' static'; cls = 'off'; }
    else if ((tool === 'lights' || tool === 'flash') && g.lightsGone) { state = ' gone'; cls = 'off'; }
    else if ((tool === 'lights' || tool === 'flash') && t < g.lightsOffUntil) { state = ` off ${Math.ceil(g.lightsOffUntil - t)}s`; cls = 'off'; }
    else if (tool === 'ventdoor' && t < g.jam.V) { state = ` jammed ${Math.ceil(g.jam.V - t)}s`; cls = 'off'; }
    else if (tool === 'doors' && (t < g.jam.L || t < g.jam.R)) { state = ` pried ${Math.ceil(Math.max(g.jam.L, g.jam.R) - t)}s`; cls = 'off'; }
    else if (g.cd[tool] > t) { state = ` ${Math.ceil(g.cd[tool] - t)}s`; cls = 'wait'; }
    return `<span class="tool ${cls}">${TOOLS[tool].name}${state}</span>`;
  });
  setHtml($('guardSays'), `${html}<div class="tools">${tags.join('')}</div>`);
}

// ---------- your crew's cards ----------
function renderCrew() {
  const t = G.t;
  setHtml($('crew'), G.crew.map((u, i) => {
    const d = u.def, ab = d.ability;
    let status, fill = 1;
    if (d.kind === 'walker' || d.kind === 'foxy') {
      if (u.attack) status = `<span class="you">ATTACKING ${ENTRY_NAME[u.attack.entry]} ${Math.max(0, u.attack.end - t).toFixed(1)}s</span>`;
      else if (stunned(u)) status = `<span class="danger">FROZEN ${Math.ceil(u.stunUntil - t)}s</span> · ${ROOMS[u.room].name}`;
      else if (d.kind === 'foxy') status = `Pirate Cove · stage ${u.stage}/${FOXY_STAGES}${watching('cove') ? ' · <span class="danger">WATCHED</span>' : ''}`;
      else {
        status = `${ROOMS[u.room].name} · ${u.cd > 0 ? u.cd.toFixed(1) + 's' : '<span class="you">READY</span>'}`;
        if (d.frozenWatched && watching(u.room)) status += ' · <span class="danger">WATCHED</span>';
        if (u.lurch) status += ' · <span class="you">LURCH</span>';
        if (u.silent) status += ' · <span class="you">SILENT</span>';
        if (plushFrozen(u)) status += ' · <span class="danger">FROZEN (monitor down)</span>';
        if (t < u.facelessUntil) status += ' · <span class="you">FACELESS</span>';
      }
      fill = d.kind === 'foxy' ? (u.stage + u.stageT / (d.move * u.mult)) / FOXY_STAGES : 1 - Math.max(0, u.cd) / (d.move * u.mult);
    } else if (d.kind === 'puppet') {
      status = G.puppetOutAt != null ? '<span class="you">OUT OF THE BOX!</span>' : `Music box ${pct(G.box)}%`;
      fill = 1 - G.box / 100;
    } else if (d.kind === 'golden') {
      status = u.attack ? `<span class="you">${u.attack.onMonitor ? 'ON THE MONITOR' : 'IN THE OFFICE'}! ${Math.max(0, u.attack.end - t).toFixed(1)}s</span>`
        : u.gold ? 'Waiting for the monitor to drop...' : 'Nowhere (for now)';
    } else status = 'A ghost in the system';
    const ready = u.acd <= 0;
    const abLabel = `Q · ${escText(ab.name)} ${ready ? '' : `<span class="dim">${Math.ceil(u.acd)}s</span>`}`;
    const cls = ['card', i === G.sel ? 'sel' : '', stunned(u) ? 'frozen' : '', u.attack ? 'attacking' : ''].join(' ');
    return `<div class="${cls}" data-unit="${i}"><span class="key">${i + 1}</span>${iconHtml(u.id)}` +
      `<div class="cbody"><div class="cname c-${u.id}">${escText(d.name)}</div><div class="status">${status}</div>` +
      `<div class="cbar">[${bar(fill)}]</div>` +
      `<button class="ab ${ready ? 'ready' : ''}" data-ability="${i}" title="${escText(ab.desc)}">${abLabel}</button></div></div>`;
  }).join(''));
}
