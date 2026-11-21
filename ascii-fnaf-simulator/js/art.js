/* =====================================================================
   art.js: the ASCII pictures, and the tools that draw them.

   How drawing works in this game (the same as ASCII FNAF: Line 1):
   A picture is a GRID: a list of rows, each row a list of cells.
   Each cell is one character plus an optional CSS class for its color:
       { ch: 'O', cls: 'c-bon' }
   We build an empty grid, draw things into it (the doors, the guard,
   whoever is in a doorway), then turn the grid into HTML with toHtml()
   and drop it into a <pre> block on the page.

   Every drawing is plain ASCII on purpose: fancy symbols come from
   other fonts with different widths and would knock the columns out
   of line.
   ===================================================================== */

// A few characters mean something special in HTML, so they must be "escaped".
const esc = ch => ch === '<' ? '&lt;' : ch === '>' ? '&gt;' : ch === '&' ? '&amp;' : ch;
const escText = s => Array.from(String(s)).map(esc).join('');

// An empty grid, `w` wide and `h` tall.
const blank = (w, h) => Array.from({ length: h }, () => Array.from({ length: w }, () => ({ ch: ' ', cls: '' })));

// Turn a grid into HTML. Neighbouring cells with the same color share one <span> (one span per
// character would make thousands of them and slow the page down).
function toHtml(g) {
  return g.map(row => {
    let html = '', cls = null, run = '';
    const flush = () => { if (run) html += cls ? `<span class="${cls}">${run}</span>` : run; run = ''; };
    for (const c of row) {
      if (c.cls !== cls) { flush(); cls = c.cls; }
      run += esc(c.ch);
    }
    flush();
    return html;
  }).join('\n');
}

// Write text into a grid, one cell per character, all in one class. Spaces are written too.
function write(g, r, c, text, cls = '') {
  Array.from(text).forEach((ch, k) => { if (g[r] && g[r][c + k]) g[r][c + k] = { ch, cls }; });
}

// Draw a drawing (a list of lines) at row r, column c. Spaces INSIDE a line hide what's behind them;
// the spaces around it are see-through. `mask` (optional) gives some characters an accent color.
function sprite(g, r, c, lines, cls, mask = []) {
  lines.forEach((line, i) => {
    const row = g[r + i];
    if (!row) return;
    const first = line.search(/\S/), last = line.length - 1 - line.split('').reverse().join('').search(/\S/);
    if (first < 0) return;
    const m = mask[i] || '';
    for (let k = first; k <= last; k++) {
      const extra = ACCENT[m[k]];
      if (row[c + k]) row[c + k] = { ch: line[k], cls: extra ? `${cls} ${extra}` : cls };
    }
  });
}

// ---------- accent colors ----------
// A MASK is a copy of a drawing's shape. Each letter in it colors the character in the same place
// (the colors are the acc-... classes in style.css); a space leaves it in the main color.
const ACCENT = {
  r: 'acc-red', o: 'acc-orange', y: 'acc-yellow', g: 'acc-green', b: 'acc-blue', v: 'acc-violet',
  p: 'acc-pink', k: 'acc-gold', c: 'acc-sky', x: 'acc-black', w: 'acc-white', G: 'acc-grey',
};

// ---------- faces ----------
// A tiny 3-line face of each animatronic and each guard, used everywhere: the map, the cards, the
// doorways, the end screen. Written as normal strings, so a backslash is typed \\ (two make one).
// The ones ASCII FNAF: Line 1 also has use its faces, so the games look alike.
const ICONS = {
  fre: [' [_] ', '(o^o)', ' >=< '],          // Freddy: black top hat and bow tie, blue eyes
  bon: ['|\\ /|', '(o o)', ' >=< '],         // Bonnie: long ears, magenta eyes, red bow tie
  chi: [' \\|/ ', '(o>o)', '|EAT|'],         // Chica: violet eyes, orange beak, LET'S EAT bib
  fox: ['/\\_/\\', '(o o)', 'J\\vv/'],       // Foxy: yellow eyes, gold teeth, a hook
  tbn: ['/\\ /\\', '(^o^)', ' >=< '],        // Toy Bonnie: green eyes, red bow tie
  tch: [' \\|/ ', '(^>^)', '|PTY|'],         // Toy Chica: blue eyes, orange beak, "let's party" bib
  wfr: [' [_] ', '(o;o)', ' >=< '],          // Withered Freddy: torn up, wires showing
  wbn: ['|\\ /|', '(###)', ' >=< '],         // Withered Bonnie: no face, just wires and two red eyes deep inside
  wch: [' \\|/ ', '(o>o)', '/\\ /\\'],       // Withered Chica: her jaw hangs open, arms torn
  wgf: [' [_] ', '(.^.)', '/>=<\\'],         // Withered Golden Freddy: slumped, empty eyes, torn
  wfx: ['/\\_/ ', '(x o)', 'J\\v /'],        // Withered Foxy: a torn ear, a broken eye, missing teeth
  lol: ['/\\ /\\', '(o o)', ' >v< '],        // Lolbit: an orange and white fox, bow tie
  tfr: [' [_] ', '(o^o)', '@>=<@'],          // Toy Freddy: shiny brown, black hat and bow tie, rosy cheeks
  sbn: ['/\\ /\\', '(o o)', ' VVV '],        // Shadow Bonnie: a black Toy Bonnie with white eyes and teeth
  nfr: [' [_] ', '(O^O)', '(oo)~'],          // Nightmare Freddy: torn up, with a Freddle
  nbn: ['|\\ /|', '(O O)', 'VVVVV'],         // Nightmare Bonnie: dark blue, rows of teeth
  nch: [' \\|/ ', '(O>O)', 'VVVVV'],         // Nightmare Chica: teeth in her beak and her bib
  ptr: ['/\\ /\\', '(o o)', ' >w< '],        // Plushtrap: a little green rabbit
  ffr: [' [_] ', '(o^o)', ' >=<B'],          // Funtime Freddy: white and pink, Bon-Bon on his hand
  enn: [' ___ ', '(o o)', '/~~~\\'],         // Ennard: a mask over a tangle of wires
  pfx: ['/\\_/\\', '(* *)', 'J\\~~/'],       // Phantom Foxy: a burnt, glowing Foxy
  mng: ['_/\\_ ', '(o-0)', ' \\/\\/'],       // Mangle: white and pink, torn apart, one yellow eye
  bb:  [' -+- ', '(^_^)', ' /#\\ '],         // Balloon Boy: blue and red cap, striped shirt
  pup: ['.---.', '(o o)', '(@v@)'],          // the Puppet: white mask, red cheeks and lips
  spr: [' |\\ |', '(o#o)', ' |W| '],         // Springtrap: torn ear, wires in his face
  pfr: [' [_] ', '(* *)', ' ~~~ '],          // Phantom Freddy: a burnt, glowing Freddy
  pbb: [' -+- ', '(* *)', ' /#\\ '],         // Phantom BB: a burnt Balloon Boy
  gol: [' [_] ', '(.^.)', ' >=< '],          // Golden Freddy: empty eyes with tiny pupils
  bab: [' ~~~ ', '(o.o)', '/\\=/\\'],        // Circus Baby: red pigtails, green eyes, a frilly top
  bal: [' ~^~ ', '(- -)', ' )=( '],          // Ballora: blue hair, closed eyes, a dancer's dress
  nfb: [' [_] ', '(O^O)', 'VVVVV'],          // Nightmare Fredbear: purple hat, rows of teeth
  yen: [' .-. ', '(o o)', ' WWW '],          // Yenndo: a bare endoskeleton, round eyes and a row of teeth
  nfx: ['/\\_/\\', '(O O)', 'JVVV/'],        // Nightmare Foxy: a hook and far too many teeth
  nmr: ['.---.', '(O O)', '\\VVV/'],         // Nightmarionne: a long white mask with a grin
  scb: [' ~~~ ', '(o.@)', '/#=#\\'],         // Scrap Baby: red pigtails, one missing eye, scrap metal
  mfr: [' [_] ', '(@~@)', '~~~~~'],          // Molten Freddy: a face in a tangle of wires
  rfr: [' [*] ', '(o^o)', ' >=< '],          // Rockstar Freddy: a star on his hat
  mus: ['\\_O_/', '(o o)', '/VVV\\'],        // Music Man: cymbals held high
  gfr: [' [*] ', '(=^=)', '/>=<\\'],         // Glamrock Freddy: a star, and a lightning-bolt shine
  rox: ['/\\ /\\', '(o~o)', ' ^w^ '],        // Roxy: wolf ears and a mane
  mty: [' VVV ', '(@ @)', '[===]'],          // Monty: spiky hair, shades and a spiked collar
  ffx: ['/\\_/\\', '(o o)', ' >*< '],        // Funtime Foxy: white and pink, a bow tie
  lft: ['|\\ /|', '(  o)', ' >=< '],         // Lefty: a black bear with one glowing eye
  gch: [' \\|/ ', '(o>o)', '[EAT]'],         // Glamrock Chica: big earrings and a bib
  dca: ['\\\\|//', '(^ ^)', '/(_)\\'],        // the Daycare Attendant: Sun's rays (and Moon on the other side)
  // The guards
  mike:    [' _=_ ', '(o_o)', '/|*|\\'],
  fritz:   [' _=_ ', '(0_0)', '/|*|\\'],
  jeremy:  [' _=_ ', '(^_^)', '/|*|\\'],
  phone:   [' ___ ', '(___)', '|:::|'],       // nobody ever sees Phone Guy: just his phone
  fright:  [' _=_ ', '(o_o)', '/|F|\\'],
  michael: [' ___ ', '(x_x)', '/|=|\\'],
  gregory: [' ~~~ ', '(o_o)', '/[w]\\'],      // a wristwatch
  vanessa: [' /~\\ ', '(o_o)', '/|*|\\'],
  henry:   [' ___ ', '(O-O)', '/|-|\\'],      // glasses
  mike2:   [' _=_ ', '(-_-)', '/|*|\\'],
  tendons8: ['\\|||/', '(@_@)', '/|8|\\'],    // The Tendons 8: a tangle of tendons on top, an 8 on the badge
  cc:      [' ___ ', '(;_;)', '/|=|\\'],      // the Crying Child: tears and a striped shirt
  franchisee: [' ___ ', '(-_-)', '/|$|\\'],   // the Franchisee: a pizzeria on a budget
  cassie:  [' ^ ^ ', '(o_o)', '/|R|\\'],      // Cassie: Roxy's ears on her mask
  tech:    [' _T_ ', '(o_o)', '/[+]\\'],      // the Technician: a hard hat and a toolbox
  william: [' ___ ', '(o_o)', '/|W|\\'],      // William Afton: the purple guy
  sleepy:  [' ___ ', '(-_-)', '/|z|\\'],      // gimmick guards from here on
  locksmith: [' _=_ ', '(o_o)', '/|#|\\'],
  clockwork: [' -+- ', '[o_o]', '/|@|\\'],    // a wind-up key on top
  cutout:  [' _=_ ', '|o_o|', '/|*|\\'],      // flat as cardboard
  mixedup: [' _=_ ', '(o_O)', '/|?|\\'],
  copycat: ['/\\_/\\', '(o_o)', '/|*|\\'],    // cat ears
  pizza:   [' _=_ ', '(^_^)', '/[P]\\'],      // a pizza box
};
const ICON_ACCENTS = {
  fre: [' xxx', ' b b', ' xxx'],
  bon: ['', ' p p', ' rrr'],
  chi: ['', ' vov'],
  fox: ['', ' y y', '  kk'],
  tbn: ['', ' g g', ' rrr'],
  tch: ['', ' bob'],
  wfr: [' xxx', ' bGb', ' xxx'],
  wbn: ['', ' rGr', ' rrr'],
  wch: ['', ' vov'],
  wgf: [' xxx', '', ' xxx'],
  wfx: ['', ' r y', '  k'],
  lol: ['', ' y y', ' ooo'],
  tfr: [' xxx', ' b b', 'rxxxr'],
  sbn: ['', ' w w', ' www'],
  nfr: [' xxx', ' r r', 'kk  '],
  nbn: ['', ' r r', 'wwwww'],
  nch: ['', ' rrr', 'wwwww'],
  ptr: ['', ' w w'],
  ffr: [' ppp', ' b b', ' ppp '],
  enn: ['', ' w w', ' GGG'],
  pfx: ['', ' w w'],
  mng: [' pp', '    y'],
  bb:  [' brb', '', '  r'],
  pup: ['', '', ' rrr'],
  spr: ['', ' w w'],
  pfr: [' xxx', ' w w'],
  pbb: [' brb', ' w w'],
  gol: [' xxx', '', ' xxx'],
  bab: [' rrr', ' g g', '  r'],
  bal: [' bbb', '', '  p'],
  nfb: [' vvv', ' r r', 'wwwww'],
  yen: ['', ' w w'],
  mike: [' bbb', '', '  k'], fritz: [' bbb', '', '  k'], jeremy: [' bbb', '', '  k'], fright: [' bbb'],
  vanessa: [' kkk', '', '  k'], mike2: [' bbb', '', '  k'], gregory: ['', '', '  c'],
  tendons8: ['rrrrr', ' r r', '  r'],
  cc: ['', ' b b', '  c'], franchisee: ['', '', '  k'], cassie: [' v v', '', '  v'], tech: [' yyy', '', '  r'],
  william: [' vvv', '', '  v'], sleepy: ['', '', '  c'], locksmith: ['', '', '  k'], clockwork: [' kkk', '', '  k'],
  mixedup: ['', '    r', '  r'], copycat: ['', ' g g'], pizza: ['', '', ' rrr'],
  nfx:['', ' y y', ' www'], nmr: ['', ' w w', ' www'], scb: [' rrr', ' g'], mfr: [' kkk', ' y y', 'GGGGG'],
  rfr: [' yyy', ' b b', ' kkk'], mus: ['k k k', ' p p', ' www'], gfr: ['  y', ' c c', '  y'], rox: ['', ' y y'], mty: [' ppp', ' r r', ' www'],
  ffx: ['', ' y y', '  p'], lft: ['', '    r', '  r'], gch: ['', ' vov', ' ppp'], dca: ['yyyyy', '', ''],
};
// One line of text as HTML, with the characters its accent mask marks wrapped in their color.
const accentText = (line, mask = '') => Array.from(line).map((ch, k) =>
  ACCENT[mask[k]] ? `<span class="${ACCENT[mask[k]]}">${esc(ch)}</span>` : esc(ch)).join('');
const iconLines = id => ICONS[id].map((line, i) => accentText(line, (ICON_ACCENTS[id] || [])[i]));
// The whole 3-line face as HTML, in its own color (`id` is a crew id or a guard id).
const iconHtml = (id, extra = '') => `<span class="icon c-${id}${extra}">${iconLines(id).join('\n')}</span>`;
// Just the middle line, for small places like a map room.
const faceHtml = (id, extra = '') => `<span class="face-mini c-${id}${extra}">${iconLines(id)[1]}</span>`;

// ---------- the office camera ----------
// What your animatronics see of the guard's office: the doors, the vent, the lights, and the guard.
const OFFICE_W = 50, OFFICE_H = 15;

function officeGrid() {
  const g = G.guard, t = G.t;
  const o = blank(OFFICE_W, OFFICE_H);
  const wall = g.dead ? 'o-dark' : 'o-wall';
  write(o, 0, 0, '+' + '-'.repeat(OFFICE_W - 2) + '+', wall);
  write(o, OFFICE_H - 1, 0, '+' + '-'.repeat(OFFICE_W - 2) + '+', wall);
  for (let r = 1; r < OFFICE_H - 1; r++) { write(o, r, 0, '|', wall); write(o, r, OFFICE_W - 1, '|', wall); }
  drawDoor(o, 'L', 2);
  drawDoor(o, 'R', OFFICE_W - 10);
  drawVent(o);
  drawDesk(o);
  if (gimmick() === 'cutout') drawCutouts(o);
  else drawGuard(o);
  drawGimmick(o);
  // Nightmare Foxy in the closet (right of the desk).
  const closet = G.crew.find(u => u.attack && u.attack.entry === 'O' && u.def.kind === 'walker');
  if (closet) sprite(o, 5, 32, ICONS[closet.id], `c-${closet.id} o-attack`, ICON_ACCENTS[closet.id]);
  // The flashlight's beam, for a moment, toward the door it was pointed at.
  if (g.flashUntil > t) {
    if (g.flashSide === 'L') write(o, 8, 10, '<=========', 'o-lit');
    else if (g.flashSide === 'R') write(o, 8, 30, '=========>', 'o-lit');
    else write(o, 4, 24, '^^', 'o-lit');
  }
  // Golden Freddy (or Withered Golden Freddy), slumped in front of the desk.
  const gold = G.crew.find(u => u.def.kind === 'golden' && u.attack && !u.attack.onMonitor);
  if (gold) sprite(o, 10, 22, ICONS[gold.id], `c-${gold.id}`, ICON_ACCENTS[gold.id]);
  // Yenndo, standing beside the desk in the dark while the guard stares at him.
  if (g.focus === 'stun' && t < g.stareUntil) sprite(o, 6, 14, ICONS.yen, 'c-yen', ICON_ACCENTS.yen);
  if (g.dead) write(o, 3, 19, ' POWER OUT ', 'o-alert');
  else if (t < G.lockdownUntil) write(o, 4, 20, ' LOCKDOWN ', 'o-alert');
  // Death coins the guard still has, on the desk: (8) for each.
  if (g.coins > 0) write(o, 12, 15, `${'(8)'.repeat(g.coins)}`, 'o-coin');
  return o;
}

// A doorway, 8 characters wide. Shut: filled with #. Lit: glowing dots. Anyone attacking that way shows
// in it, and a lit doorway also shows whoever waits in the corner outside.
function drawDoor(o, side, c) {
  const g = G.guard, t = G.t, wall = g.dead ? 'o-dark' : 'o-wall';
  write(o, 1, c, '.------.', wall);
  write(o, 12, c, "'------'", wall);
  for (let r = 2; r < 12; r++) { write(o, r, c, '|', wall); write(o, r, c + 7, '|', wall); }
  const isShut = g.doors[side];
  const lit = (g.light[side] > t && !g.brokenLight[side]) || (g.flashUntil > t && g.flashSide === side);
  if (g.brokenLight[side]) write(o, 1, c + 2, 'x--x', 'o-alert');   // Monty smashed this light
  for (let r = 2; r < 12; r++) write(o, r, c + 1, isShut ? '######' : lit ? '......' : '      ', isShut ? 'o-door' : lit ? 'o-lit' : '');
  if (isShut) write(o, 6, c + 1, ' SHUT ', 'o-door o-label');
  else {
    const at = G.crew.find(u => u.attack && u.attack.entry === side);
    const outside = lit && G.crew.find(u => !u.attack && u.room === ENTRIES[side] && (u.def.kind === 'walker' || u.def.kind === 'foxy'));
    const who = at || outside;
    if (who) sprite(o, 5, c + 1, ICONS[who.id], `c-${who.id}${at ? ' o-attack' : ''}`, ICON_ACCENTS[who.id]);
  }
  write(o, 13, c + 1, side === 'L' ? ' LEFT ' : 'RIGHT ', g.dead ? 'o-dark' : 'o-dim');
}

// The vent hatch above the desk.
function drawVent(o) {
  const g = G.guard, c = 21, wall = g.dead ? 'o-dark' : 'o-wall';
  write(o, 1, c, '.------.', wall);
  write(o, 2, c, '|', wall); write(o, 2, c + 7, '|', wall);
  write(o, 3, c, "'-VENT-'", wall);
  if (g.doors.V) write(o, 2, c + 1, '######', 'o-door');
  else {
    write(o, 2, c + 1, '::::::', 'o-dim');
    const at = G.crew.find(u => u.attack && u.attack.entry === 'V');
    if (at) write(o, 2, c + 1, ICONS[at.id][1], `c-${at.id} o-attack`);
  }
}

// The desk, with the guard's power (you can see it from here) and the music box when the Puppet is on.
function drawDesk(o) {
  const g = G.guard, cls = g.dead ? 'o-dark' : 'o-wall';
  write(o, 10, 13, '.----------------------.', cls);
  write(o, 11, 13, '|                      |', cls);
  write(o, 12, 13, "'----------------------'", cls);
  write(o, 11, 15, `PWR ${Math.max(0, Math.ceil(g.power))}%`, g.power < 20 ? 'o-alert' : 'o-dim');
  if (G.puppet) write(o, 11, 25, `BOX ${Math.ceil(G.box)}%`, G.box < 30 ? 'o-alert' : 'o-dim');
  // Freddles (oo) and cupcakes {^} sitting on the desk.
  G.pests.forEach((p, i) => write(o, 9, [13, 17, 31, 35][i], p === 'cupcake' ? '{^}' : '(oo)', p === 'cupcake' ? 'c-nch' : 'c-nfr'));
}

// The Cardboard Guard: three figures, one at each way in (LEFT, VENT in the middle, RIGHT). Only one
// is real: it blinks, and it's the only one that picks up its monitor or does anything at all.
const CUTOUT_COLS = { L: 12, V: 21, R: 30 };
function drawCutouts(o) {
  const g = G.guard, s = G.gim, t = G.t, face = ICONS[g.def.id];
  if (t < s.darkUntil) { write(o, 6, 17, ' *flicker* ', 'o-dim'); return; }   // the lights are out while they swap
  for (const k of ['L', 'V', 'R']) {
    if (k === s.real) drawGuard(o, CUTOUT_COLS[k], t > s.blinkAt - 0.3);
    else sprite(o, 6, CUTOUT_COLS[k] + 1, face, 'c-guard', ICON_ACCENTS[g.def.id]);
  }
}

// Extra bits for the other gimmick guards.
function drawGimmick(o) {
  const g = G.guard, s = G.gim, t = G.t;
  switch (gimmick()) {
    case 'sleep':
      if (g.focus === 'sleep') write(o, 4, 27, ['z', 'zZ', 'zZz'][Math.floor(Math.max(0, t)) % 3], 'o-dim');
      break;
    case 'clock':
      write(o, 4, 27, Math.floor(Math.max(0, t)) % 2 ? 'tock' : 'tick', 'o-dim');
      break;
    case 'lock':
      write(o, 4, 15, `LOCK [${'*'.repeat(s.step)}${'-'.repeat(3 - s.step)}]`, 'o-coin');
      break;
    case 'pizza':
      if (g.focus === 'away') write(o, 7, 18, '(out for pizza)', 'o-dim');
      if (g.focus === 'walkin') {
        const c = s.side === 'L' ? 3 : OFFICE_W - 9;
        sprite(o, 4, c, ICONS[g.def.id], 'c-guard', ICON_ACCENTS[g.def.id]);
        write(o, 7, c, '[PIZZA]', 'o-coin');
      }
      break;
  }
}

// The guard itself, which shows what it's doing right now (the biggest "tell" in the game).
// `c` is its column (the Cardboard Guard moves around); `blink` closes its eyes for a moment.
function drawGuard(o, c = 21, blink = false) {
  const g = G.guard, t = G.t, r = 5;
  const face = ICONS[g.def.id] || ICONS.mike, mask = ICON_ACCENTS[g.def.id] || [];
  const label = text => `|${text.padEnd(6).slice(0, 6)}|`;
  switch (g.focus) {
    case 'cam': case 'wind': case 'reboot': case 'lol': {
      // The monitor is up (or Lolbit has taken over the computer): you see the back of it, with what's
      // on the screen written on it.
      const screen = g.focus === 'wind' ? 'WIND' : g.focus === 'reboot' ? 'REBOOT' : g.focus === 'lol' ? 'L-O-L'
        : !roomClear(g.cam) ? '~~~~~~' : ROOMS[g.cam].cam;
      write(o, r - 1, c + 2, face[0].trim(), 'c-guard');
      write(o, r, c, '.------.', 'o-mon');
      write(o, r + 1, c, label(' ' + screen), g.focus === 'lol' ? 'o-mon c-lol' : 'o-mon');
      write(o, r + 2, c, "'------'", 'o-mon');
      write(o, r + 3, c + 1, face[2], 'c-guard');
      // Withered Golden Freddy's face, right on the guard's screen.
      const onMon = G.crew.find(u => u.attack && u.attack.onMonitor);
      if (onMon) write(o, r + 1, c + 1, ` ${ICONS[onMon.id][1]}`, `c-${onMon.id} o-attack`);
      break;
    }
    case 'mask':
      sprite(o, r + 1, c + 1, [' [_] ', '(@^@)', '/|=|\\'], 'c-fre', [' xxx', ' b b']);
      break;
    case 'stun':
      sprite(o, r + 1, c + 1, [face[0], '(O_O)', face[2]], 'c-guard', mask);
      write(o, r, c + 6, '!!', 'o-alert');
      break;
    case 'hide':
      write(o, r + 3, c - 1, '(hiding...)', 'o-dim');
      break;
    case 'shoo':   // waving its arms at a Freddle or a cupcake
      sprite(o, r + 1, c, [` ${face[0]}`, `\\${face[1]}/`, ` ${face[2]}`], 'c-guard', mask.map(m => ' ' + m));
      break;
    case 'dead':
      write(o, r + 2, c + 2, '.  .', 'o-dark');
      break;
    case 'sleep':   // head on the desk
      sprite(o, r + 2, c + 1, [face[0], '(-_-)'], 'c-guard', mask);
      break;
    case 'pay':     // fumbling for five coins
      sprite(o, r + 1, c + 1, face, 'c-guard', mask);
      write(o, r + 4, c + 1, ' $ $ ', 'o-coin');
      break;
    case 'away': case 'walkin':   // out of the office (drawGimmick shows where)
      break;
    default:   // at the desk
      sprite(o, r + 1, c + 1, blink ? [face[0], '(-_-)', face[2]] : face, 'c-guard', mask);
  }
  if (t < g.distractedUntil) write(o, r, c + 7, '?', 'o-alert');
}
