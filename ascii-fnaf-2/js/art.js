/* =====================================================================
   art.js: the ASCII pictures, and the tools that draw them.

   How drawing works in this game:
   A picture is a GRID: a list of rows, each row a list of cells.
   Each cell is one character plus an optional CSS class for its color:
       { ch: 'O', cls: 'c-nbn' }
   We build a grid from plain text, draw characters into it (Nightmare
   Bonnie in the hall, Freddles on the desk...), then turn the grid
   into HTML with toHtml() and drop it into a <pre> block on the page.

   Line 2 uses a smaller font than Line 1 (on request), so its pictures
   are bigger and more detailed in the same space: the office is 56
   characters wide and 20 tall, a camera picture 60 by 16.

   Every drawing is plain ASCII on purpose: fancy symbols come from
   other fonts with different widths and would knock the columns out
   of line. The drawings are written with String.raw`...`, which keeps
   backslashes exactly as typed (in a normal string \ is special).
   One catch: a drawing can't END with \ right before the closing `,
   because \` means "a backtick character, not the end". Those lines get
   a space after the \ (spaces at the end of a line are never drawn).
   ===================================================================== */

// A few characters mean something special in HTML, so they must be "escaped".
const esc = ch => ch === '<' ? '&lt;' : ch === '>' ? '&gt;' : ch === '&' ? '&amp;' : ch;

// Turn lines of text into a grid of cells, each line padded or cut to exactly `w` characters.
function grid(lines, w, cls = '') {
  return lines.map(line => Array.from(line.padEnd(w).slice(0, w)).map(ch => ({ ch, cls })));
}

// An empty grid, `w` wide and `h` tall.
const blank = (w, h) => Array.from({ length: h }, () => Array.from({ length: w }, () => ({ ch: ' ', cls: '' })));

// Turn a grid back into HTML: colored cells become <span>s, rows are joined with line breaks.
function toHtml(g) {
  return g.map(row =>
    row.map(c => c.cls ? `<span class="${c.cls}">${esc(c.ch)}</span>` : esc(c.ch)).join('')
  ).join('\n');
}

// Draw a drawing (a list of text lines) into grid g with its top-left corner at row r, column c,
// in the CSS class `cls`. Spaces INSIDE a line (between its first and last real character) are
// drawn too, so the drawing hides what's behind it; the spaces around it are left see-through.
// If the drawing has an accent mask (lines.accent, see "accent colors" below), the cells it marks get
// a second color on top of `cls`.
function sprite(g, r, c, lines, cls) {
  lines.forEach((line, i) => {
    const row = g[r + i];
    if (!row) return;
    const first = line.search(/\S/), last = line.length - 1 - line.split('').reverse().join('').search(/\S/);
    if (first < 0) return;   // an empty line: nothing to draw
    const mask = (lines.accent && lines.accent[i]) || '';
    for (let k = first; k <= last; k++) {
      const extra = ACCENT[mask[k]];
      if (row[c + k]) row[c + k] = { ch: line[k], cls: extra ? `${cls} ${extra}` : cls };
    }
  });
}

// Write text into a grid, one cell per character, all in one class.
function write(g, r, c, text, cls = '') {
  Array.from(text).forEach((ch, k) => { if (g[r] && g[r][c + k]) g[r][c + k] = { ch, cls }; });
}

// Color the cells of grid g from (r1, c1) to (r2, c2) with class `cls`, keeping their characters.
function paint(g, r1, c1, r2, c2, cls) {
  for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) if (g[r] && g[r][c]) g[r][c].cls = cls;
}

// Put a +----+ border around some lines of text.
const frame = (inner, w) => [
  '+' + '-'.repeat(w) + '+',
  ...inner.map(line => '|' + line.padEnd(w).slice(0, w) + '|'),
  '+' + '-'.repeat(w) + '+',
];

// ---------- accent colors ----------
// Most drawings get a second color on a few parts (eyes, mostly), like ASCII Nights. A MASK is a copy
// of a drawing's shape, attached as drawing.accent: each letter colors the character in the same place
// (the colors are the acc-... classes in style.css); a space leaves it in the character's main color.
const ACCENT = {
  r: 'acc-red', o: 'acc-orange', y: 'acc-yellow', g: 'acc-green', b: 'acc-blue', v: 'acc-violet',
  p: 'acc-pink', k: 'acc-gold', c: 'acc-sky', x: 'acc-black', w: 'acc-white', G: 'acc-grey',
  m: 'acc-magenta', t: 'acc-teal',
};
// Most masks only color the eyes, so instead of drawing a whole mask by hand, eyes(drawing, 'r')
// builds one that colors every eye character (@, O and *) with letter `color`. It returns the drawing.
function eyes(lines, color, chars = '@O*') {
  lines.accent = lines.map(line => Array.from(line).map(ch => chars.includes(ch) ? color : ' ').join(''));
  return lines;
}
// tint(drawing, chars, color): like eyes(), but on top of the mask it already has, for a second color
// (Circus Baby's red hair is drawn with @, which eyes() would otherwise make an eye color).
function tint(lines, chars, color) {
  const old = lines.accent || [];
  lines.accent = lines.map((line, i) => Array.from(line).map((ch, k) => chars.includes(ch) ? color : ((old[i] || '')[k] || ' ')).join(''));
  return lines;
}
// region(drawing, firstRow, lastRow, color, firstCol, lastCol): colors every character (not the spaces) in
// one part of a drawing, like a hat, a bow tie or a bib, on top of the mask it already has.
function region(lines, r1, r2, color, c1 = 0, c2 = 999) {
  const old = lines.accent || [];
  lines.accent = lines.map((line, i) => Array.from(line).map((ch, k) =>
    i >= r1 && i <= r2 && k >= c1 && k <= c2 && ch !== ' ' ? color : ((old[i] || '')[k] || ' ')).join(''));
  return lines;
}

// ---------- menu icons ----------
// A tiny 3-line face of each character, used on the title, the custom night screen and the end
// screens. Written as normal strings, so a backslash is typed \\ (two of them make one).
const ICONS = {
  nfr: ['o[_]o', '(@^@)', ' VVV '],         // Nightmare Freddy: black hat, Freddles on his shoulders, pale eyes, too many teeth
  nbn: ['|\\ /|', '(@ @)', '>VVV<'],        // Nightmare Bonnie: torn ears, magenta eyes, sharp teeth, red bow tie
  nch: [' \\|/ ', '(@>@)', '|EAT|'],        // Nightmare Chica: violet eyes, orange beak, white LET'S EAT bib
  nfx: ['/\\_/\\', '(@ @)', 'JVVV/'],       // Nightmare Foxy: yellow eyes, teeth, steel hook
  nfb: [' [_] ', '(@^@)', '>VVV<'],         // Nightmare Fredbear: gold, purple hat and bow tie, pale eyes
  bab: ['@@ @@', '(o.o)', ' |=| '],         // Circus Baby: red-orange pigtails, green eyes, red nose and outfit
  bal: [' ~~~ ', '(- -)', ' /|\\ '],        // Ballora: dark blue hair, eyes closed, purple dress
  ffr: ['[_] ^', '(o^o)', ' >=<b'],         // Funtime Freddy: magenta hat and bow tie, blue eyes, Bon-Bon (blue) on his hand
  ffx: ['/\\_/\\', '(o o)', ' \\v/ '],      // Funtime Foxy: white, pink ears and snout, yellow eyes
  end: ['\\|||/', '(O O)', '/|_|\\'],       // Ennard: a mess of wires behind a white mask
  mrn: [' .^. ', '(O O)', ' /|\\ '],        // a Minireena: little lilac dancer with a white face
  nmt: [' .-. ', '(O O)', ' VVV '],         // the Nightmarionette: a white face on black
  wbn: ['|\\ /|', '[* o]', ' vvv '],        // Withered Bonnie: no face, just a metal skull with one red eye glint, and his jaw
  bdb: [' .-. ', '(o o)', ' /|\\ '],        // a Bidybab: small peachy doll with blue eyes
  jck: [' \\|/ ', '(^ ^)', '|EAT|'],        // Jack-o Chica: glowing orange, carved eyes
  ptr: ['/\\/\\ ', '(O O)', ' VVV '],       // Plushtrap: little olive-green rabbit, big grin
  ncp: ['  ,  ', '(O O)', '\\VVV/'],        // Nightmare Cupcake: pink, a lit candle, blue eyes, sharp teeth
  nmg: ['_/\\_ ', '(@-O)', ' VVV '],        // Nightmare Mangle: torn apart, two heads
  nbb: [' -+- ', '(@W@)', ' /#\\ '],        // Nightmare BB: a blackened BB, glowing yellow eyes, a grin full of teeth
};
// Which line of the icon is the face (the middle one for everyone).
const FACE_ROW = {};
// The icons' accent masks (same idea as the drawings' masks: one letter per character).
const ICON_ACCENTS = {
  nfr: [' xxx', ' w w', ' www'], nbn: ['', ' m m', 'rwwwr'], nch: ['', ' vov', 'wwwww'], nfx: ['', ' y y', 'Gwww'],
  nfb: [' vvv', ' w w', 'vwwwv'], bab: ['rr rr', ' grg', '  r'], bal: [' bbb', ' v v', ' vvv'],
  ffr: ['mmm b', ' b b', ' mmmb'], ffx: ['p   p', ' y y', '  p'], end: ['', ' w w', ''], mrn: ['', 'wwwww'],
  nmt: [' www', 'wwwww', ' www'], wbn: ['', 'GrGGG', ' www'], bdb: ['', ' b b'], jck: ['', ' y y', 'yyyyy'],
  ptr: ['', ' w w', ' www'], ncp: ['  y', ' b b', ' www'], nmg: ['', ' r y', ' www'], nbb: [' rrr', ' ywy', '  r'],
};
// A text with every character escaped for HTML (see esc above).
const escText = s => Array.from(s).map(esc).join('');
// One line of text as HTML, with the characters its accent mask marks wrapped in their color.
const accentText = (line, mask = '') => Array.from(line).map((ch, k) =>
  ACCENT[mask[k]] ? `<span class="${ACCENT[mask[k]]}">${esc(ch)}</span>` : esc(ch)).join('');
const iconLines = id => ICONS[id].map((line, i) => accentText(line, (ICON_ACCENTS[id] || [])[i]));
// The 3-line icon as HTML, in the character's color.
const iconHtml = (c, extra = '') => `<span class="icon c-${c.id}${extra}" title="${c.name}">${iconLines(c.id).join('\n')}</span>`;
// Just the face line, for places with room for only one line, like the "Best:" line.
const faceHtml = c => `<span class="face-mini c-${c.id}" title="${c.name}">${iconLines(c.id)[FACE_ROW[c.id] ?? 1]}</span>`;

// ---------- camera rooms ----------
// A camera picture is 60 wide and 16 tall: a border around 58 x 14 of room.
const CAM_W = 60, CAM_H = 16;
const art = s => s.split('\n').slice(1);   // a drawing written on its own lines: drop the first empty line

// The halls are DRAWN BY CODE, not by hand (on request: "a really cool angle"): a tunnel of steel
// support frames shrinking toward a dark doorway at the far end, with lamps hanging from the beams,
// pipes, hazard stripes and a tiled floor. The far end leans to one side (HALL_SKEW), as if the camera
// hangs high in a corner looking down the hall.
// HALL_RECTS: the picture's edge, then the frames from nearest to farthest, as [left, top, right, bottom].
const HALL_RECTS = [[0, 0, 59, 15], [5, 1, 54, 14], [14, 3, 45, 12], [21, 5, 38, 10]];
const HALL_SKEW = { lhall: 2, rhall: -2 };   // columns each frame is pushed (the left hall leans right)
// The frame `k` steps down the hall, with its skew applied.
const hallRect = (room, k) => {
  const [l, t, r, b] = HALL_RECTS[k], s = HALL_SKEW[room] * Math.max(0, k - 1);   // the near frame stays put
  return [l + s, t, r + s, b];
};
// Draw a straight line of character `ch` from (r1, c1) to (r2, c2): one cell per row or column,
// whichever there are more of (a simple version of what drawing programs call Bresenham's line).
function line(g, r1, c1, r2, c2, ch, cls) {
  const n = Math.max(Math.abs(r2 - r1), Math.abs(c2 - c1));
  for (let i = 0; i <= n; i++) {
    const r = Math.round(r1 + (r2 - r1) * i / (n || 1)), c = Math.round(c1 + (c2 - c1) * i / (n || 1));
    if (g[r] && g[r][c]) g[r][c] = { ch, cls };
  }
}
function hallGrid(room) {
  const g = blank(CAM_W, CAM_H);
  const [l1, t1, r1, b1] = hallRect(room, 1), [l2, t2, r2, b2] = hallRect(room, 2), [l3, t3, r3, b3] = hallRect(room, 3);
  // The floor first: tiles that get closer together toward the far end, so everything else draws over them.
  for (let r = b3; r <= b1; r++) {
    const near = r > b2, gap = near ? 4 : 3;
    for (let c = l1 + 1 + (r % 2) * 2; c < r1; c += gap) g[r][c] = { ch: near ? ':' : '.', cls: 'floor' };
  }
  // The side walls between the near frame and the middle one: wall panels, a pipe and hazard stripes.
  for (let r = t2; r <= b2; r++) {
    write(g, r, l1 + 3, ':', 'wall2');
    write(g, r, r1 - 3, ':', 'wall2');
  }
  for (let r = b2 - 3; r <= b2; r++) {
    write(g, r, l1 + 5, r % 2 ? '//' : '\\\\', 'hazard');
    write(g, r, r1 - 6, r % 2 ? '\\\\' : '//', 'hazard');
  }
  line(g, t1 + 1, l1 + 2, t1 + 1, r1 - 2, '=', 'pipe');        // a pipe along the ceiling
  write(g, t1 + 1, Math.round((l1 + r1) / 2) - 1, '(@)', 'pipe');  // with a valve
  // The far end: a dark doorway, a red EXIT sign over it.
  line(g, t3, l3, t3, r3, '_', 'wall3');
  line(g, t3 + 1, l3, b3, l3, '|', 'wall3');
  line(g, t3 + 1, r3, b3, r3, '|', 'wall3');
  write(g, t3 + 1, Math.round((l3 + r3) / 2) - 2, 'EXIT', 'exit');
  // The middle support frame: a steel beam with a lamp hanging under it.
  line(g, t2, l2, t2, r2, '=', 'wall2');
  line(g, t2 + 1, l2, b2, l2, '|', 'wall2');
  line(g, t2 + 1, r2, b2, r2, '|', 'wall2');
  write(g, t2 + 1, Math.round((l2 + r2) / 2) - 1, '\\_/', 'lamp');
  // The near frame: a thicker beam (doubled sides), its lamp flickering like a failing bulb.
  line(g, t1, l1, t1, r1, '#', 'wall1');
  line(g, t1 + 1, l1, b1, l1, '[', 'wall1');
  line(g, t1 + 1, r1, b1, r1, ']', 'wall1');
  write(g, t1 + 2, Math.round((l1 + r1) / 2) - 2, '\\___/', 'lamp flicker');
  // The border around the picture.
  line(g, 0, 0, 0, CAM_W - 1, '-', 'wall');
  line(g, CAM_H - 1, 0, CAM_H - 1, CAM_W - 1, '-', 'wall');
  line(g, 0, 0, CAM_H - 1, 0, '|', 'wall');
  line(g, 0, CAM_W - 1, CAM_H - 1, CAM_W - 1, '|', 'wall');
  return g;
}

// Where someone stands at each step down a hall (1 = far, 2 = middle, 3 = right outside your door):
// the bottom-middle of their drawing goes on the floor of that section. `w`, `h` are the drawing's size.
function hallSpot(room, step, w, h, nudge = 0) {
  const k = 4 - step;   // step 1 is the farthest frame (3), step 3 the nearest (1)
  const [l, , r, b] = hallRect(room, k);
  return [b - h + (step === 3 ? 1 : 0), Math.round((l + r) / 2 - w / 2) + nudge];
}

// The other rooms are drawn by hand: 14 lines of 58 characters (frame() adds the border).
const ROOM_ART = {
  stage: String.raw`
/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\
||||||    *  .  *    S H O W T I M E    *  .  *     ||||||
|||||                                                |||||
||||         *               *               *        ||||
|||                                                    |||
||                                                      ||
|                                                        |
|                                                        |
|                                                        |
|________________________________________________________|
|========================================================|
|   o    o    o    o    o    o    o    o    o    o    o  |
 ''''''''''''''''''''''''''''''''''''''''''''''''''''''''
     \_/   \_/   \_/    empty seats    \_/   \_/   \_/`,
  auditorium: String.raw`
 .------------.    .------------------.    .------------.
 | <- TO THE  |    |   F U N T I M E  |    |  TO THE -> |
 | LEFT DOOR  |    |  AUDITORIUM  (c) |    | RIGHT DOOR |
 '------------'    '------------------'    '------------'
 ||                                                    ||
 ||   .  *  .         .  *  .  *  .          .  *  .   ||
 ||                                                    ||
 ||                                                    ||
 ||                                                    ||
 ||                                                    ||
 ||____________________________________________________||
 [__]  [__]  [__]  [__]  [__]  [__]  [__]  [__]  [__]  [__]
 :  :  :  :  :  :  :  :  :  :  :  :  :  :  :  :  :  :  :
 LEFT <<<<<<<<<<<<<<<<<<<<< | >>>>>>>>>>>>>>>>>>>>> RIGHT`,
  oxygen: String.raw`
 ==========================================================
  .----.  .----.  .----.  .----.    .------------------.
  | O2 |  | O2 |  | O2 |  | O2 |    |  AIR  SUPPLY     |
  |    |  |    |  |    |  |    |    |  [||||||||    ]  |
  |    |  |    |  |    |  |    |    |  KEEP  CLEAR     |
  |    |  |    |  |    |  |    |    '------------------'
  '----'  '----'  '----'  '----'          ||
 ===||======||======||======||============||============
    ||      ||      ||      ||            ||
    ''======''======''======''====.       ||
                                  |       ||
                                  |       ||
   /// DANGER: LOW OXYGEN ///     |       ||
 _________________________________|_______||_____________`,
  power: String.raw`
 .-------.  .-------.  .-------.  .-------.  .----------.
 | [] [] |  | [] [] |  | [] [] |  | [] [] |  | !  HIGH  |
 | [] [] |  | [] [] |  | [] [] |  | [] [] |  | VOLTAGE  |
 |-o---o-|  |-o---o-|  |-o---o-|  |-o---o-|  '----------'
 '---|---'  '---|---'  '---|---'  '---|---'
     |          |          |          |
 ====|==========|==========|==========|================
     \__________\__________\__________\________.
                                              |
   ////////////////////////////////////      |
   //  AUTHORIZED  PERSONNEL  ONLY   //      |
   ////////////////////////////////////      |
                                              |
 _____________________________________________|_______`,
  parts: String.raw`
 .------. .------. .------. .------.        .---------.
 | o  o | | x  x | | -  o | | o  - |        | SPARE   |
 '------' '------' '------' '------'        | PARTS   |
 ==========================================  '---------'
   ____      ____      ____      ____
  /o  o\    /x  x\    /o  -\    /    \       [] [] []
  \_--_/    \_--_/    \_--_/    \_--_/       [] [] []
 ==========================================  [] [] []

   _|_|_          ___.___           _|_|_
  |#####|        |SCOOPER|         |#####|
  |#####|        |   V   |         |#####|
 __'---'__________'-----'___________'---'__________________`,
  storage: String.raw`
 ==========================================================
  .-------.  .-------.          .-------.  .-------.
  |FRAGILE|  |  ###  |          |  ###  |  |  ???  |
  '-------'  '-------'          '-------'  '-------'
  .-------.  .-------.  .-------.  .-------.  .-------.
  |  ###  |  |  FUN  |  |  ###  |  |  ###  |  |  ###  |
  '-------'  '-------'  '-------'  '-------'  '-------'

     .--.                                 .--.
    (    )   balloons, deflated          (    )
     '--'                                 '--'
      |                                    |
 ___________________________________________________________`,
  arcade: String.raw`
   .-----.    .-----.    .-----.    .-----.    .-----.
   |#####|    |#####|    |#####|    |#####|    |#####|
   |#####|    |#####|    |#####|    |#####|    |#####|
   |_____|    |_____|    |_____|    |_____|    |_____|
   | o o |    | o o |    | o o |    | o o |    | o o |
   |_____|    |_____|    |_____|    |_____|    |_____|
   |     |    |     |    |     |    |     |    |     |
   '-----'    '-----'    '-----'    '-----'    '-----'

       INSERT COIN          GAME OVER         HI SCORE

 :  :  :  :  :  :  :  :  :  :  :  :  :  :  :  :  :  :  :
 ___________________________________________________________`,
};
// Bits of each room that get their own color (the screens glow, the signs light up...).
const ROOM_TINTS = {
  stage: [[1, 7, 1, 50, 'sign flicker'], [0, 0, 5, 5, 'curtain'], [0, 52, 5, 57, 'curtain'], [0, 0, 0, 57, 'curtain']],
  auditorium: [[1, 20, 2, 37, 'sign'], [13, 1, 13, 57, 'dim']],
  oxygen: [[2, 3, 2, 30, 'sign'], [12, 3, 12, 30, 'hazard']],
  power: [[1, 45, 2, 56, 'exit flicker'], [9, 3, 11, 38, 'hazard'], [1, 1, 3, 43, 'screen']],
  parts: [],
  storage: [],
  arcade: [[1, 3, 2, 52, 'screen flicker'], [9, 7, 9, 55, 'sign']],
};

// Where the characters are drawn on the cameras ([row, column] of the drawing's top-left corner).
const FFX_SPOT = [3, 24];                                  // Funtime Foxy on the show stage
const FFR_SPOTS = { C: [4, 23], L: [5, 4], R: [5, 44] };   // Funtime Freddy in the auditorium: middle, left side, right side
const PTR_SPOT = [9, 20];                                  // Plushtrap in the oxygen room
const MRN_SPOTS = [[9, 4], [9, 11], [9, 47], [9, 53]];     // the Minireenas, dancing around the oxygen room (on request)
const NCP_SPOT = [8, 46];                                  // Nightmare Cupcake in the power room
const NMG_SPOT = [1, 20];                                  // Nightmare Mangle, hanging from the ceiling of whichever room
const ENNARD_HOME = [5, 44];                               // Ennard in parts & service, between visits

// ---------- the characters' drawings ----------
// Each character has some of: `far` (just their eyes at the far end of a hall), `cam` (on a camera),
// `near` (right outside your door, on the hall camera), `office` (in your office) and `scare` (the
// jumpscare, shown big). eyes() adds the eye color.
const SPRITES = {
  nfr: {
    office: eyes(['(*)', '/U\\'], 'r'),   // a Freddle (the little Freddys on your desk)
    scare: eyes(art(String.raw`
      _____                     _____
     ( * * )    ___________    ( * * )
      \_^_/   _/           \_   \_^_/
             /   .-.   .-.   \
            |   ( @ ) ( @ )   |
            |    '-'   '-'    |
            |       /^\       |
            |   ___________   |
            |  |VVVVVVVVVVV|  |
            |  |           |  |
            |  |AAAAAAAAAAA|  |
             \  '---------'  /
              '-------------'`), 'r'),
  },
  nbn: {
    far: eyes(['@ @'], 'm'),
    cam: eyes(art(String.raw`
/\   /\
| \_/ |
(@   @)
 \VVV/
 /| |\ `), 'm'),
    near: eyes(art(String.raw`
 /\         /\
|  \       /  |
|   \_____/   |
 \           /
 |  @     @  |
 |   VVVVV   |
 |   |   |   |
  \  AAAAA  /
   '-------'
  /|       |\ `), 'm'),
    scare: eyes(art(String.raw`
        /\                 /\
       /  \               /  \
      |    |             |    |
      |    |             |    |
       \    \___________/    /
       /                     \
      |     @           @     |
      |                       |
      |   VVVVVVVVVVVVVVVVV   |
      |   |               |   |
      |   AAAAAAAAAAAAAAAAA   |
       \_____________________/`), 'm'),
  },
  nch: {
    far: eyes(['@ @'], 'r'),
    cam: eyes(art(String.raw`
 \ | /
.-----.
(@   @)
 \VVV/
|EAT! |`), 'r'),
    near: eyes(art(String.raw`
   \  |  /
  .-------.
 /  @   @  \
|   /VVV\   |
|  |     |  |
|   \AAA/   |
 \_________/
 |LET'S EAT|
 '---------'`), 'r'),
    scare: eyes(art(String.raw`
             \  |  /
           .---------.
          /  @     @  \
         |    /VVVV\   |
         |   |      |  |
         |    \AAAA/   |
          \___________/
        __|LET'S  EAT|__
   .-.  |              |
  (* *) |              |
   VVV`), 'r'),
  },
  nfx: {
    scare: eyes(art(String.raw`
       /\                  /\
      /  \________________/  \
     |                        |
     |    @              @    |
      \        ______        /
       \      /VVVVVV\      /
       J\     |      |     /
         \    \AAAAAA/    /
          '--------------'`), 'y'),
    // In your office (on request), growing: small in the corner he came in by, then bigger, and at the
    // last stage his jumpscare drawing, looming over the desk.
    small: eyes(art(String.raw`
/\_/\
(@ @)
JVVV`), 'y'),
    medium: eyes(art(String.raw`
 /\       /\
/  \_____/  \
|  @     @  |
 \  /VVV\  /
 J\ \AAA/ /
   '-----'`), 'y'),
  },
  nfb: {
    far: eyes(['@ @'], 'w'),
    cam: eyes(art(String.raw`
 [___]
(@ ^ @)
 \VVV/
  >=<`), 'w'),
    near: eyes(art(String.raw`
    _____
   |     |
 __|_____|__
/  @     @  \
|     ^     |
| VVVVVVVVV |
| |       | |
| AAAAAAAAA |
 \___>=<___/`), 'w'),
    scare: eyes(art(String.raw`
              _______
             |       |
           __|_______|__
      .-.                 .-.
     (   )  ___________  (   )
      '-'  /           \  '-'
          |   @     @   |
          |      ^      |
          | VVVVVVVVVVV |
          | |         | |
          | AAAAAAAAAAA |
           \_____>=<___/`), 'w'),
  },
  bab: {
    far: eyes(['* *'], 'g'),
    cam: eyes(art(String.raw`
@@ _ @@
 (* *)
 \ - /
 /|=|\ `), 'g'),
    near: eyes(art(String.raw`
@@@   ___   @@@
 @@ /     \ @@
   |  *  *  |
   |   ._.  |
    \_____/
    /|===|\
   / | o | \ `), 'g'),
    office: eyes(art(String.raw`
@@  ___  @@
 @ /   \ @
  | * * |
   \_-_/
   /|=|\
    | |`), 'g'),
    close: eyes(art(String.raw`
  @@@@@               @@@@@
 @@@@@@@   _______   @@@@@@@
  @@@@@  /         \  @@@@@
        |   *   *   |
        |     .     |
        |   \___/   |
         \_________/
          |=======|
         /|   o   |\
        / |   o   | \ `), 'g'),
    scare: eyes(art(String.raw`
     @@@@                     @@@@
    @@@@@@     _________     @@@@@@
     @@@@    /           \    @@@@
            |   *     *   |
            |       .     |
            |    \_____/  |
             \___________/
               |=======|
              /|   o   |\ `), 'g'),
  },
  bal: {
    scare: eyes(art(String.raw`
            .-~~~~~~~~~-.
          .'  ~~~~~~~~~  '.
         /   .---------.   \
        |   /  -     -  \   |
        |   |     __    |   |
        |   \  '-----'  /   |
         \   '---------'   /
          '.             .'
            '-._______.-'
               /|   |\ `), 'b'),
  },
  ffr: {
    cam: eyes(art(String.raw`
 [___]   ^
(o ^ o) (o)
 \___/__/
  >=<`), 'b'),
    scare: eyes(art(String.raw`
          _______
         |       |                .
       __|_______|__           /\   /\
      /             \         ( o . o )
     |   @         @   |        >-<
     |        ^        |   ____/
     |  .-----------.  |__/
     |  |VVVVVVVVVVV|  |
      \ '-----------' /
       '-------------'
            >=<`), 'b'),
  },
  ffx: {
    cam: eyes(art(String.raw`
/\     /\
| \___/ |
( *   * )
 \  v  /
  '---'`), 'y'),
    scare: eyes(art(String.raw`
      /\                  /\
     /  \________________/  \
    |   .-.            .-.   |
    |  ( @ )          ( @ )  |
     \  '-'    __      '-'  /
      \       /  \         /
       \     |VVVV|       /
        '.   '----'     .'
          '------------'`), 'y'),
  },
  end: {
    far: eyes(['* *'], 'w'),
    cam: eyes(art(String.raw`
\|/ \|/
 .---.
| * * |
 '---'
//| |\\`), 'w'),
    near: eyes(art(String.raw`
\\|/ \|/ \|//
 \\  .---.  //
  \\|     |//
    | * * |
    |  -  |
   //'---'\\
  // |   | \\`), 'w'),
    office: eyes(art(String.raw`
~\|/~~\|/~~\|/~
 ~~ .-----. ~~
  ~| *   * |~
    '-----'`), 'w'),
    scare: eyes(art(String.raw`
    \|/ \|/ \|/ \|/ \|/ \|/
     \\  //  .----.  \\  //
      \\//  /      \  \\//
       ||  |  O  O  |  ||
      //\\ |   --   | //\\
     //  \\ \      / //  \\
    /|\  /|\ '----' /|\  /|\ `), 'w'),
  },
  mrn: {
    cam: eyes([' .^.', '(O O)', ' /|\\'], 'w'),
    scare: eyes(art(String.raw`
      .^.        .^.        .^.
     (O O)      (O O)      (O O)
      /|\        /|\        /|\
     / | \      / | \      / | \
       ^          ^          ^`), 'w'),
  },
  nmt: {
    office: eyes(art(String.raw`
     .-----------.
    /  .-.   .-.  \
   |  ( O ) ( O )  |
   |   '-'   '-'   |
   |   \_______/   |
    \  |VVVVVVV|  /
 ____'-----------'____
/    /|         |\    \ `), 'w'),
    scare: eyes(art(String.raw`
           .-----------------.
          /   .--.     .--.   \
         |   ( O  )   ( O  )   |
         |    '--'     '--'    |
         |  \_______________/  |
         |   |VVVVVVVVVVVVV|   |
          \  '-------------'  /
      _____'-----------------'_____
     /     /|               |\     \ `), 'w'),
  },
  // Withered Bonnie (on request: he looked like Ignited Bonnie): his whole face is GONE. Where it should
  // be there's a hole showing the metal endoskeleton skull inside, with one red glint for an eye (on
  // request; the other socket is dark). Only
  // his lower jaw with its little teeth is left, a red bow tie, and his left arm is torn off (wires).
  wbn: {
    office: art(String.raw`
  /\     /\
 |  |   |  |
 |  |   |  |
  \  \_/  /
  /  ___  \
 |  /   \  |
 | | * o | |
 | |  =  | |
 |  \___/  |
  \ vvvvv /
   '-----'
    >==<
  /|    |~~`),
    scare: art(String.raw`
          /\              /\
         |  |            |  |
         |  |            |  |
          \  \__________/  /
          /                \
         |    .--------.    |
         |   /   ____   \   |
         |  |   /    \   |  |
         |  |  | *  o |  |  |
         |  |   \ == /   |  |
         |   \   ''''   /   |
         |    '--------'    |
          \  vvvvvvvvvvvv  /
           '--------------'
               >======<`),
  },
  bdb: {
    scare: eyes(art(String.raw`
            .--------.
           (  O    O  )
            \   --   /
           __'------'__
          /  |      |  \
             |      |
            /        \ `), 'b'),
  },
  jck: {
    scare: eyes(art(String.raw`
            \   |   /
         .~~~~~~~~~~~~~.
        /   /\     /\    \
       |    \/     \/     |
       |        /\        |
       |   /\/\/\/\/\/\   |
        \   \/\/\/\/\/   /
         '--------------'
        |  LET'S   EAT  |`), 'y', '/\\'),
  },
  ptr: {
    cam: eyes(art(String.raw`
/\  /\
| \/ |
(O  O)
 VVVV
/|  |\ `), 'w'),
    scare: eyes(art(String.raw`
          /\      /\
         /  \    /  \
        |    \__/    |
        |  O      O  |
        |   VVVVVV   |
        |   AAAAAA   |
         \__________/
           /|    |\ `), 'w'),
  },
  ncp: {
    cam: eyes(art(String.raw`
   ,
  (_)
.~~~~~.
(O   O)
\VVVVV/`), 'w'),
    scare: eyes(art(String.raw`
               ,
              (_)
         .-~~~~~~~~~-.
        /  O       O  \
       |   VVVVVVVVV   |
       |   AAAAAAAAA   |
        \_____________/`), 'w'),
  },
  nmg: {
    cam: eyes(art(String.raw`
 _/\_  .----.  _/\_
( @  )/ @  O \(  O )
 \/  |  VVVV  |  \/
     '--------'`), 'r', '@'),
    scare: eyes(art(String.raw`
    _/\_      .---------.      _/\_
   ( @  )--../  @     O  \..--(  O )
    \/     /   |  VVVVVVV |    \  \/
          /    |  AAAAAAA |     \
         ~      '---------'      ~`), 'r', '@'),
  },
  // Nightmare BB (added on request): asleep in the corner with his eyes shut, or awake with glowing
  // eyes and a grin full of teeth. A propeller cap and a striped shirt, like BB, but blackened.
  nbb: {
    asleep: art(String.raw`
 _/\_
(-_-)
/|#|\ `),
    awake: eyes(art(String.raw`
 _/\_
(@W@)
/|#|\ `), 'y'),
    scare: eyes(art(String.raw`
            _\|/_
           /  |  \
        .-~~~~~~~~~-.
       /  .-.   .-.  \
      |  ( @ ) ( @ )  |
      |   '-'   '-'   |
       \  VVVVVVVVV  /
        \ AAAAAAAAA /
         '---------'
          /|#####|\ `), 'y'),
  },
};
// ---------- accurate details ----------
// On request ("make colors and designs more accurate"): the second colors of the official designs,
// added on top of the eye colors with tint() and region() (see "accent colors" above).
// Row and column numbers count from 0 at the drawing's top-left corner.
const looks = id => Object.values(SPRITES[id]);

// Nightmare Freddy: a black top hat and bow tie, pale eyes, and Freddles on his shoulders and belly.
SPRITES.nfr.scare = art(String.raw`
                 _______
                |       |
              __|_______|__
     _____   /             \   _____
    ( * * ) |   .-.   .-.   | ( * * )
     \_^_/  |  ( @ ) ( @ )  |  \_^_/
            |   '-'   '-'   |
            |      /^\      |
            |  |VVVVVVVVV|  |
            |  |AAAAAAAAA|  |
             \     >=<     /
              '---( * )---'
                  \_^_/`);
eyes(SPRITES.nfr.scare, 'w');
region(SPRITES.nfr.scare, 0, 2, 'x');
tint(SPRITES.nfr.scare, '>=<', 'x');
eyes(SPRITES.nfr.office, 'w');

// Nightmare Bonnie: a red bow tie under all those teeth.
SPRITES.nbn.scare.push('                >===<');
eyes(SPRITES.nbn.scare, 'm');
tint(SPRITES.nbn.scare, '>=<', 'r');

// Nightmare Chica: violet eyes, a white LET'S EAT bib, and her pink cupcake with blue eyes.
for (const look of looks('nch')) eyes(look, 'v', '@');
region(SPRITES.nch.cam, 4, 4, 'w');
region(SPRITES.nch.near, 7, 8, 'w');
region(SPRITES.nch.scare, 7, 7, 'w', 10, 21);
region(SPRITES.nch.scare, 8, 10, 'p', 0, 7);
tint(SPRITES.nch.scare, '*', 'b');

// Nightmare Foxy: a steel hook.
for (const look of looks('nfx')) tint(look, 'J', 'G');

// Nightmare Fredbear: a purple top hat and bow tie.
region(SPRITES.nfb.cam, 0, 0, 'v');
region(SPRITES.nfb.near, 0, 2, 'v');
region(SPRITES.nfb.scare, 0, 2, 'v');
for (const look of looks('nfb')) tint(look, '>=<', 'v');

// Circus Baby: red-orange pigtails (@), green eyes, a red outfit.
region(SPRITES.bab.cam, 3, 3, 'r');
region(SPRITES.bab.near, 5, 6, 'r');
region(SPRITES.bab.office, 4, 5, 'r');
region(SPRITES.bab.close, 7, 9, 'r');
region(SPRITES.bab.scare, 7, 8, 'r');
for (const look of looks('bab')) tint(look, '@', 'o');

// Ballora: dark blue hair, purple eyelids (her eyes are closed), a purple dress.
region(SPRITES.bal.scare, 0, 1, 'b');
region(SPRITES.bal.scare, 3, 3, 'v', 14, 22);
region(SPRITES.bal.scare, 8, 9, 'v');

// Funtime Freddy: a magenta top hat and bow tie, blue eyes, and Bon-Bon (blue) on his hand.
eyes(SPRITES.ffr.cam, 'b', 'o');
region(SPRITES.ffr.cam, 0, 0, 'm', 0, 6);
region(SPRITES.ffr.cam, 0, 1, 'b', 8, 12);
region(SPRITES.ffr.scare, 0, 2, 'm', 0, 20);
region(SPRITES.ffr.scare, 1, 4, 'b', 26, 40);
for (const look of looks('ffr')) tint(look, '=', 'm');

// Funtime Foxy: pink ears and snout.
region(SPRITES.ffx.cam, 0, 0, 'p');
tint(SPRITES.ffx.cam, 'v', 'p');
region(SPRITES.ffx.scare, 0, 0, 'p');
region(SPRITES.ffx.scare, 5, 5, 'p', 13, 18);

// Ennard: a white mask with blue eyes in the middle of the wires.
region(SPRITES.end.scare, 1, 6, 'w', 12, 21);
for (const look of looks('end')) tint(look, '*O', 'c');

// Minireenas: white faces. The Nightmarionette: a white face on a black body.
region(SPRITES.mrn.cam, 1, 1, 'w');
region(SPRITES.mrn.scare, 1, 1, 'w');
region(SPRITES.nmt.office, 0, 5, 'w');
region(SPRITES.nmt.scare, 0, 6, 'w');

// Withered Bonnie: the hole where his face was shows the grey metal skull, with one red eye glint; white
// teeth on his jaw, a red bow tie, and grey wires where his arm was.
region(SPRITES.wbn.office, 5, 8, 'G', 3, 9);
region(SPRITES.wbn.scare, 6, 10, 'G', 13, 24);
for (const look of looks('wbn')) { tint(look, '*', 'r'); tint(look, '>=<', 'r'); tint(look, 'v', 'w'); tint(look, '~', 'G'); }

// Jack-o Chica: her bib glows too.
region(SPRITES.jck.scare, 8, 8, 'y');

// The Nightmare Cupcake: a lit candle and blue eyes.
for (const look of looks('ncp')) { region(look, 0, 0, 'y'); region(look, 1, 1, 'w'); tint(look, 'O', 'b'); }

// Nightmare Mangle: the second head's eye is white.
for (const look of looks('nmg')) tint(look, 'O', 'w');

// Nightmare BB: a red-striped shirt and a red propeller on his cap.
for (const look of looks('nbb')) { tint(look, '#', 'r'); region(look, 0, 0, 'r'); }

// Everyone's teeth (the rows of V and A) are off-white.
for (const id of ['nfr', 'nbn', 'nch', 'nfx', 'nfb', 'ptr', 'ncp', 'nmg', 'nmt']) for (const look of looks(id)) tint(look, 'VA', 'w');
// Nightmare Foxy, Ballora and Bidybabs have no camera drawing: Foxy never shows up on the cameras,
// Ballora is only heard, and Bidybabs stay in the vent. Their icon stands in on the menus.

// ---------- the office ----------
// The middle of the office: 56 wide and 20 tall, deep underground (on request: "good atmosphere").
// A pipe along the ceiling with its valves, the air vent (Bidybabs), two warning signs, the company's
// sign, steel pillars, the desk with its monitor, hazard stripes and the shock button, cables on the
// floor. Everything else is drawn on top.
const OFFICE_W = 56, OFFICE_H = 20;
const OFFICE_ART = art(String.raw`
========================================================
 (@)  ||             .------------.            ||  (@)
 |    || .-------.   |            |  .-------. ||    |
 |    || | SMILE |   |            |  |!DANGER| ||    |
 |    || '-------'   '------------'  '-------' ||    |
 |    ||                                       ||    |
 |    ||   CIRCUS BABY'S ENTERTAINMENT & RENTAL||    |
 |    ||                                       ||    |
 |    ||  ////                           ////  ||    |
 |    ||    .------------------------------.   ||    |
 |    ||    |  .------------------------.  |   ||    |
 |    ||    |  |                        |  |   ||    |
 |    ||    |  |                        |  |   ||    |
 |    ||    |  '------------------------'  |   ||    |
 _____||____'------------------------------'___||______
|//////////////        [ SHOCK ]        //////////////|
|______________________________________________________|
   ||  ~~~~~~~~~~~~~~~                          ||
 .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .
.  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .`);

// Where things go in the office, as [row, column] of their top-left corner.
const VENT_BOX = [2, 22, 3, 33];            // the inside of the vent: rows 2-3, columns 22-33
const SCREEN_BOX = [11, 16, 12, 39];        // the monitor's screen
const FREDDLE_SPOTS = [[12, 8], [12, 44], [12, 2], [12, 49]];   // on the desk, either side of the monitor
const NMT_SPOT = [1, 15];         // the Nightmarionette, looming over the monitor
const WBN_SPOT = [3, 41];         // Withered Bonnie, standing by the right wall
const BABY_SPOT = [7, 1];         // Circus Baby, just in from the left
const BABY_CLOSE_SPOT = [3, 13];  // and right in front of you
const ENNARD_AIR_SPOT = [1, 20];  // Ennard, hanging out of the air vent
// Nightmare Foxy in the office, at each stage of growing, by the side he came in from.
const NFX_SPOTS = { 1: { L: [12, 1], R: [12, 49] }, 2: { L: [6, 1], R: [6, 42] }, 3: { L: [3, 12], R: [3, 12] } };
const NBB_SPOT = [17, 44];        // Nightmare BB, slumped on the floor in the corner, right of the desk

// The office for this moment, as a grid (without the visitors: render.js adds those).
// `ventShut`: is the vent door closed?
function officeGrid(ventShut) {
  const g = grid(OFFICE_ART, OFFICE_W);
  paint(g, 0, 0, OFFICE_H - 1, OFFICE_W - 1, 'room');
  paint(g, 0, 0, 1, OFFICE_W - 1, 'pipe');              // the pipe along the ceiling and its valves
  paint(g, 1, 21, 1, 34, 'room');                       // (but not the vent's frame)
  paint(g, 2, 9, 4, 17, 'sign');                        // SMILE
  paint(g, 2, 37, 4, 45, 'exit');                       // !DANGER, in red
  paint(g, 6, 11, 6, 46, 'sign flicker');               // the company sign, flickering now and then
  paint(g, 8, 10, 8, 45, 'hazard');                     // hazard stripes on the wall...
  paint(g, 15, 1, 15, 54, 'hazard');                    // ...and along the front of the desk
  paint(g, 15, 23, 15, 31, 'shock');                    // the shock button on the desk
  paint(g, 17, 6, 17, 21, 'pipe');                      // cables on the floor
  paint(g, 18, 0, 19, OFFICE_W - 1, 'floor');
  // The vent: a dark grate when it's open, a steel shutter when it's shut.
  const [r1, c1, r2, c2] = VENT_BOX;
  for (let r = r1; r <= r2; r++) {
    for (let c = c1; c <= c2; c++) g[r][c] = ventShut ? { ch: '=', cls: 'door' } : { ch: c % 2 ? '#' : ' ', cls: 'grate' };
  }
  return g;
}
