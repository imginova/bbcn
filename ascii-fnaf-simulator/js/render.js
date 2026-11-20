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
  setHtml($('hudNight'), n ? `NIGHT ${n} · ${escText(NIGHTS[n - 1].name.toUpperCase())}`
    : G.setup.challenge ? escText(G.setup.challenge.name.toUpperCase()) : 'CUSTOM NIGHT');
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
  const g = G.guard, u = selected(), map = $('map');
  // Like the crew cards: the rooms are built once, and each redraw only changes what's in them.
  if (!map._rooms) {
    map.innerHTML = ROOM_IDS.map(id => {
      const r = ROOMS[id];
      return `<button class="room" data-room="${id}" style="grid-row:${r.row};grid-column:${r.col}">` +
        `<span class="rcam">${r.cam}</span><span class="rname">${r.name}</span><span class="rinfo"></span><span class="who"></span></button>`;
    }).join('') + '<div class="room office" style="grid-row:4;grid-column:2"><span class="rname">OFFICE</span><span class="ways"></span></div>';
    map._rooms = {};
    map.querySelectorAll('[data-room]').forEach(b => {
      map._rooms[b.dataset.room] = { btn: b, info: b.querySelector('.rinfo'), who: b.querySelector('.who') };
    });
    map._ways = map.querySelector('.ways');
  }
  ROOM_IDS.forEach(id => {
    const r = ROOMS[id], el = map._rooms[id];
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
    setClass(el.btn, ['room', r.vent ? 'vent' : '', canGo ? 'go' : reach ? 'near' : '', u && u.room === id ? 'here' : '', watched || winding ? 'watched' : ''].join(' '));
    setHtml(el.info, extra + tags.join(''));
    setHtml(el.who, who);
  });
  // The office square, with the three ways in: they light up when the selected animatronic can attack.
  const way = e => {
    const ready = u && u.def.kind === 'walker' && !u.attack && u.room === ENTRIES[e] && !stunned(u) && u.cd <= 0;
    const label = e === 'L' ? '&lt; LEFT' : e === 'R' ? 'RIGHT &gt;' : '^ VENT';
    return `<button class="attack ${ready ? 'ready' : ''} ${g.doors[e] ? 'shut' : ''}" data-attack="${e}">${label}${g.doors[e] ? '<br><span class="dim">shut</span>' : ''}</button>`;
  };
  setHtml(map._ways, `${way('L')}${G.ventsUsed || guardHas('ventdoor') ? way('V') : ''}${way('R')}`);
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
  const t = G.t, box = $('crew');
  // Build the cards once per night, then only change the parts that change (the status line, the bar,
  // the ability button and the card's highlight). Rebuilding every card 15 times a second made the
  // browser re-measure the whole page each time, which is what made the game lag (most of all in Max
  // mode, with 31 cards).
  if (box._for !== G) {
    box._for = G;
    box.classList.toggle('many', G.crew.length > MAX_CREW);   // a big crew gets smaller cards so they fit
    box.innerHTML = G.crew.map((u, i) => {
      const key = i < 9 ? i + 1 : i === 9 ? 0 : '';   // the number key that picks it, if it has one
      return `<div class="card" data-unit="${i}"><span class="key">${key}</span>${iconHtml(u.id)}` +
        `<div class="cbody"><div class="cname c-${u.id}">${escText(u.def.name)}</div><div class="status"></div>` +
        `<div class="cbar"></div><button class="ab" data-ability="${i}" title="${escText(u.def.ability.desc)}"></button></div></div>`;
    }).join('');
    box._cards = [...box.children].map(card => ({
      card, status: card.querySelector('.status'), bar: card.querySelector('.cbar'), ab: card.querySelector('.ab'),
    }));
  }
  G.crew.forEach((u, i) => {
    const d = u.def, ab = d.ability, c = box._cards[i];
    let status, fill = 1;
    if (d.kind === 'walker' || d.kind === 'foxy') {
      if (u.attack) status = `<span class="you">ATTACKING ${ENTRY_NAME[u.attack.entry]} ${Math.max(0, u.attack.end - t).toFixed(1)}s</span>`;
      else if (stunned(u)) status = `<span class="danger">FROZEN ${Math.ceil(u.stunUntil - t)}s</span> · ${ROOMS[u.room].name}`;
      else if (d.kind === 'foxy') status = `Pirate Cove · stage ${u.stage}/${FOXY_STAGES}${watching('cove') ? ' · <span class="danger">WATCHED</span>' : ''}`;
      else {
        // Whole seconds, so the text changes once a second instead of ten times.
        status = `${ROOMS[u.room].name} · ${u.cd > 0 ? Math.ceil(u.cd) + 's' : '<span class="you">READY</span>'}`;
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
    setHtml(c.status, status);
    setHtml(c.bar, `[${bar(fill)}]`);
    setHtml(c.ab, `Q · ${escText(ab.name)} ${ready ? '' : `<span class="dim">${Math.ceil(u.acd)}s</span>`}`);
    setClass(c.ab, `ab${ready ? ' ready' : ''}`);
    setClass(c.card, ['card', i === G.sel ? 'sel' : '', stunned(u) ? 'frozen' : '', u.attack ? 'attacking' : ''].join(' '));
  });
}
// Like setHtml, but for an element's class list: only touch the page when it actually changed.
function setClass(el, cls) {
  if (el.className !== cls) el.className = cls;
}
