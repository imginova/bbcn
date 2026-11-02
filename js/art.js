/* =====================================================================
   art.js: the ASCII pictures, and the tools that draw them.

   How drawing works in this game:
   A picture is a GRID: a list of rows, each row a list of cells.
   Each cell is one character plus an optional CSS class for its color:
       { ch: '◆', cls: 'sym s-dia' }
   We build a grid from plain text, change some cells (put a shape in
   a doorway, open the music box...), then turn the grid into HTML with
   toHtml() and drop it into a <pre> block on the page.
   ===================================================================== */

// Characters that should automatically get a color when they appear in a picture.
// The hollow ones (◇ △ ○) are on the office poster.
const SYM_CLASS = { '◆': 'sym s-dia', '▲': 'sym s-tri', '●': 'sym s-orb', '■': 'sym s-sqr', '◇': 'sym s-dia', '△': 'sym s-tri', '○': 'sym s-orb' };

// The HTML for a threat's symbol (or a face), used on the menus and end screens.
// Lenny's face and Smiley's (: are wider than one character, so they get their own classes.
function symHtml(d, extra = '') {
  if (d.id === 'len') return `<span class="face${extra}">${LENNY_FACE}</span>`;
  if (d.id === 'smi') return `<span class="smi-face s-smi${extra}">${d.sym}</span>`;
  return `<span class="sym s-${d.id}${extra}">${d.sym}</span>`;
}

// A few characters mean something special in HTML, so they must be "escaped".
const esc = ch => ch === '<' ? '&lt;' : ch === '>' ? '&gt;' : ch === '&' ? '&amp;' : ch;

// Turn lines of text into a grid of cells, each line padded or cut to exactly `w` characters.
function grid(lines, w, cls = '') {
  return lines.map(line =>
    Array.from(line.padEnd(w).slice(0, w)).map(ch => ({ ch, cls: SYM_CLASS[ch] || cls })));
}

// Turn a grid back into HTML: colored cells become <span>s, rows are joined with line breaks.
function toHtml(g) {
  return g.map(row =>
    row.map(c => c.cls ? `<span class="${c.cls}">${esc(c.ch)}</span>` : esc(c.ch)).join('')
  ).join('\n');
}

// Is the point (x, y) inside a shape? x and y both go from -1 to 1 across the area.
//   diamond:  |x| + |y| <= 1   (a square tipped on its corner)
//   triangle: gets wider as y goes down
//   circle:   x² + y² <= 1
//   square:   every point is inside, so it fills the whole area
// The tiny + 0.0001 stops rounding errors from shaving off the tips.
function inShape(id, x, y) {
  if (id === 'sqr') return true;
  if (id === 'dia') return Math.abs(x) + Math.abs(y) <= 1.0001;
  if (id === 'tri') return Math.abs(x) <= (y + 1) / 2 + 0.0001;
  return x * x + y * y <= 1.0001;
}

// Draw a creature's shape, made of its own symbol, into a w-by-h area of the grid
// starting at row r0, column c0. Used for doorways, camera feeds and the jumpscare.
function stamp(g, r0, c0, creature, w, h, extra = '') {
  for (let r = 0; r < h; r++) {
    for (let c = 0; c < w; c++) {
      // Convert the cell position into -1..1 coordinates (using the center of the cell).
      const x = ((c + 0.5) / w) * 2 - 1;
      const y = ((r + 0.5) / h) * 2 - 1;
      const row = g[r0 + r];
      if (row && row[c0 + c] && inShape(creature.id, x, y)) {
        row[c0 + c] = { ch: creature.sym, cls: `sym s-${creature.id}${extra}` };
      }
    }
  }
}

// Put Lenny's face into a grid. The face's combining marks must stay together,
// so it goes into ONE cell (styled 8 columns wide in style.css) and the next 7 cells are emptied.
function stampFace(g, r, c, cls = '') {
  if (!g[r]) return;
  g[r][c] = { ch: LENNY_FACE, cls: 'face' + cls };
  for (let k = 1; k < 8; k++) if (g[r][c + k]) g[r][c + k] = { ch: '', cls: '' };
}

// Put a +----+ border around some lines of text.
const frame = (inner, w) => [
  '+' + '-'.repeat(w) + '+',
  ...inner.map(line => '|' + line.padEnd(w).slice(0, w) + '|'),
  '+' + '-'.repeat(w) + '+',
];

// ---------- camera rooms ----------
// The inside of each camera's room: 9 lines of 38 characters (frame() adds the border).
// A backslash is written as \\ inside quotes, because a single \ means "special character".
const ROOM_ART = {
  stage: [
    '  *     .      *      .     *     .   ',
    ' ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ ',
    '  (                                )  ',
    '  (                                )  ',
    '  (                                )  ',
    ' ==================================== ',
    ' ||                                || ',
    " ||   ''    ''    ''    ''    ''   || ",
    '                                      ',
  ],
  dining: [
    '   o  o  o                o  o  o    ',
    '  [========]             [========]  ',
    '   o  o  o                o  o  o    ',
    '                                      ',
    '                                      ',
    '                                      ',
    '      o   o   o   o   o   o   o      ',
    '     [===========================]   ',
    '      o   o   o   o   o   o   o      ',
  ],
  backstage: [
    '  .----.   .----.        [][][][][]  ',
    '  | oo |   | ^^ |        [][][][][]  ',
    "  '----'   '----'        ----------  ",
    '   mask     mask         spare parts ',
    '                                      ',
    '                                      ',
    '                                      ',
    '  []  [ ]  []   ##   [__]   ##   []  ',
    '  ---------------------------------- ',
  ],
  supply: [
    '   |      |      |       ______      ',
    '   |      |      |      | SOAP |     ',
    '  (_)    (_)    (_)     |______|     ',
    '  mop    mop    mop                  ',
    '                                      ',
    '                                      ',
    '                                      ',
    '   [___]  [___]        .-----.       ',
    '   bucket bucket       | BIN |       ',
  ],
  whall: [
    ' \\                                  / ',
    '  \\                                /  ',
    '   \\     +------------------+     /   ',
    '    |    |                  |    |    ',
    '    |    |                  |    |    ',
    '    |    |                  |    |    ',
    '   /     +------------------+     \\   ',
    "  /   ''    ''    ''    ''    ''   \\  ",
    ' /         YOUR OFFICE -->          \\ ',
  ],
  ehall: [
    ' \\                                  / ',
    '  \\                                /  ',
    '   \\     +------------------+     /   ',
    '    |    |                  |    |    ',
    '    |    |                  |    |    ',
    '    |    |                  |    |    ',
    '   /     +------------------+     \\   ',
    "  /   ''    ''    ''    ''    ''   \\  ",
    ' /          <-- YOUR OFFICE         \\ ',
  ],
  // Rows 4 to 6 (the box) change with how wound it is: see prizeArt() below.
  prize: [
    '  * PRIZES *  * PRIZES *  * PRIZES * ',
    '  [o] [o] [o]             [o] [o]    ',
    '  ===========             =======    ',
    '                                      ',
    '             .----------.            ',
    '             |          |            ',
    '             |          |            ',
    "             '----------'            ",
    '              MUSIC  BOX             ',
  ],
};

// Where each shape stands in each room: [row, column] of the shape's center.
// One spot per creature, in CREATURES order (Diamond, Triangle, Orb), so they never overlap.
const SLOTS = {
  stage:     [[3, 9], [3, 19], [3, 29]],
  dining:    [[4, 8], [4, 19], [4, 30]],
  backstage: [[5, 10], [5, 19], [5, 28]],
  supply:    [[5, 10], [5, 19], [5, 28]],
  whall:     [[4, 15], [4, 15], [4, 22]],
  ehall:     [[4, 15], [4, 15], [4, 22]],
};

// Change the music box picture (on CAM 7) to match how wound it is:
// asleep when well wound, eyes peeking when halfway, face showing when low, empty when he's out.
// With the Wanderer modifier the box may be on another camera; then CAM 7 shows an empty spot.
function prizeArt(g, lenny) {
  // put() writes a line of text into the box area (row r, starting at column 14 of the framed grid).
  const put = (r, text, cls = '') => Array.from(text).forEach((ch, k) => { g[r + 1][14 + k] = { ch, cls }; });
  if (lenny.room !== 'prize') {
    // The box picture is on lines 4 to 8 of ROOM_ART.prize: wipe them, with a hint in the middle.
    put(4, '            ');
    put(5, '            ');
    put(6, '  (empty)   ', 'dim');
    put(7, '            ');
    put(8, '            ');
    return;
  }
  if (lenny.out) {
    put(4, ' /        \\ ');
    put(5, '|          |');
    put(6, '|          |');
  } else if (lenny.wind >= 60) {
    put(5, '|  z  z  z |');
  } else if (lenny.wind >= BOX_LOW) {
    put(4, '.---.  .---.');
    put(5, '|   .  .   |');
  } else {
    put(4, ' /        \\ ');
    put(5, '|          |');
    stampFace(g, 6, 16, ' s-len');
  }
}

// ---------- Lenny's wandering music box ----------
// Where the small music box sits on the other cameras it can wander to (Wanderer modifier),
// as [row, column] of its top-left corner in the framed camera grid. They're clear of SLOTS above.
const BOX_SPOTS = { dining: [4, 1], backstage: [5, 32], supply: [5, 32] };

// Draw a small 6-wide music box at row r, column c. Its face shows how wound it is, like prizeArt.
function miniBox(g, r, c, lenny) {
  const face = lenny.out ? '|    |' : lenny.wind >= 60 ? '|zzzz|' : lenny.wind >= BOX_LOW ? '|.  .|' : '|0  0|';
  const lines = [lenny.out ? '/    \\' : '.----.', face, "'----'"];
  lines.forEach((line, k) => Array.from(line).forEach((ch, j) => {
    if (g[r + k] && g[r + k][c + j]) g[r + k][c + j] = { ch, cls: lenny.wind < BOX_LOW ? 's-len' : '' };
  }));
}

// ---------- the square in a lit doorway ----------
// How the ■ looks at each stage, as [top row, left column, width, height] inside a door grid
// (doorGrid in render.js). Far away it's small and low; close up it fills the doorway.
// Index 0 is unused because stage 0 means "not at a door".
const SQUARE_SIZES = [null, [8, 4, 4, 2], [6, 3, 6, 4], [3, 1, 10, 9]];

// ---------- the three newest threats: little ASCII drawings ----------
// Unlike the shapes (drawn as a blob of their own symbol), Ж ¤ Ψ are proper drawings, with their
// symbol as the eyes or the body. Each one comes in a few sizes: small for a camera or a doorway,
// medium for your office, big for its jumpscare.
//
// String.raw`...` keeps every backslash exactly as typed (normally \ is a special character),
// which makes ASCII art much easier to write. drawing() turns one into a list of lines.
const drawing = text => text.split('\n').filter(line => line.trim() !== '');

const SPRITES = {
  crw: {   // Ж Crawler: a spider-ish thing with a Ж body
    cam: drawing(String.raw`
\Ж/
=O=
/ \
`),
    office: drawing(String.raw`
\\ Ж //
-=(_)=-
//   \\
`),
    scare: drawing(String.raw`
\\\             ///
 \\\   .---.   ///
  \\\ ( Ж Ж ) ///
===== (  ^  ) =====
  /// ( \_/ ) \\\
 ///   '---'   \\\
///             \\\
`),
  },
  flk: {   // ¤ Flicker: a crackling spark with legs
    door: drawing(String.raw`
 \ | /
-- ¤ --
 / | \
  /|\
   |
  / \
`),
    scare: drawing(String.raw`
  \    \ | /    /
   \   .-+-.   /
----  / ¤ ¤ \  ----
----  \  ^  /  ----
   /   '-+-'   \
  /    / | \    \
      /  |  \
     /   |   \
`),
  },
  ech: {   // Ξ Echo: a big-eared vent creature, all ears for your lures
    scare: drawing(String.raw`
  /\                 /\
 /  \     _____     /  \
|    \   /     \   /    |
|     \ |  Ξ Ξ  | /     |
 \     \|   v   |/     /
  \     \  ===  /     /
   '-----'-----'-----'
`),
  },
  slk: {   // § Slink: a coiled, snaky thing with a § for a face
    scare: drawing(String.raw`
        .-------.
     .-'  § §    '-.
    /    .---.     \
   |    ( vvv )     |
    \    '---'     /
  ~~~'-.________.-'~~~
 ~~~~~/          \~~~~~
~~~~~/            \~~~~~
`),
  },
  pek: {   // ¥ Peeker: half a face peeking round the edge of your office
    office: drawing(String.raw`
 .---.
( ¥ ¥|
 '---'
`),
    scare: drawing(String.raw`
      .-------.
    .'         '.
   /   ¥     ¥   \
  |               |
  |    \_____/    |
   \             /
    '._________.'
`),
  },
  spm: {   // © Spammer: a grinning pop-up window
    scare: drawing(String.raw`
 ______________________
|[X] *** WINNER! ***   |
|----------------------|
|    (  ©      ©  )    |
|         ___          |
|    \__/   \__/       |
|  CLICK HERE TO DIE   |
|______________________|
`),
  },
  vis: {   // Ψ Visitor: a pale, smiling face with Ψ eyes
    office: drawing(String.raw`
   .-----.
  /       \
 |  Ψ   Ψ  |
 |    ^    |
  \ '---' /
   \_____/
`),
    scare: drawing(String.raw`
      .---------.
    /             \
   |   Ψ       Ψ   |
   |               |
   |       ^       |
    \   '-----'   /
     \___________/
         |   |
      ___|   |___
`),
  },
};

// Copy a drawing into a grid with its top-left corner at row r0, column c0, in the creature's color.
// The creature's own symbol gets the "sym" class (so it keeps its one-column width). Spaces outside
// the drawing are see-through; spaces INSIDE it (between the first and last character of a line)
// cover whatever is behind, so the background doesn't show through its face.
// `extra` adds a class to every cell, e.g. ' crw-hit' so the Crawler can be clicked.
function sprite(g, r0, c0, lines, creature, extra = '') {
  lines.forEach((line, r) => {
    const first = line.search(/\S/), last = line.trimEnd().length - 1;   // where the drawing starts and ends
    Array.from(line).forEach((ch, c) => {
      const cell = g[r0 + r] && g[r0 + r][c0 + c];
      if (!cell || c < first || c > last) return;
      g[r0 + r][c0 + c] = { ch, cls: (ch === creature.sym ? 'sym ' : '') + 's-' + creature.id + extra };
    });
  });
}

// Where the drawings go, as [top row, left column]:
//   the Ж Crawler on each camera of its route (clear of the shapes' SLOTS and the wandering box),
//   the Ж Crawler and Ψ Visitor in your office, and the ¤ Flicker inside a lit doorway.
const CRAWLER_SLOTS = {
  prize: [6, 5], stage: [7, 16], dining: [6, 13],   // the shared start of its route
  supply: [5, 2], ehall: [4, 11],                    // the east side
  backstage: [5, 2], whall: [4, 26],                 // the west side
};
const CRAWLER_OFFICE = [5, 24];
const VISITOR_OFFICE = [7, 9];
const PEEKER_OFFICE = [8, 0];   // ¥ peeks round the left edge of the office, left of the monitor
const PEEKER_DOOR = [6, 2];     // ¥ Knock knock: its face in a doorway (inside doorGrid's 12-wide door)
const FLICKER_DOOR = [5, 2];

// ---------- the VENTS tab ----------
// The vent map: 15 small boxes (3 rows of 5, see VENTS in data.js) joined by tunnels (== across,
// | down), with V15 opening into your office. Each box is 5 wide and 3 tall, with the room's name in
// its top border, so the whole map is the same size as a camera picture:
//     +V1-+  +V2-+  ...
//     | Ξ |==|   |==...
//     +---+  +---+  ...
//       |      |
// VENT_SPOTS is each room's top-left corner, as [row, column] in the map. Every cell of a room gets
// the classes "vroom vr-v1" (and so on) so input.js knows which room you clicked; the room you just
// lured also gets "vlure", which makes it glow, and ))) in its bottom border.
const VENT_SPOTS = {};
for (const id of VENT_ORDER) VENT_SPOTS[id] = [VENTS[id].row * 4, VENTS[id].col * 7];
//   crawlers  a list like [{ c: ECHO, room: 'v2' }, ...] (only the ones switched on tonight)
//   lured     the room to highlight, or null
function ventGrid(crawlers, lured) {
  // Build the picture one line at a time: for each row of rooms, the top borders, the insides joined
  // by == tunnels, the bottom borders, and then (except after the last row) the | tunnels down.
  const lines = [];
  const each = text => Array(VENT_COLS).fill(text);   // the same bit of text once per column
  for (let row = 0; row < VENT_ROWS; row++) {
    lines.push(each('+---+').join('  '));
    lines.push(each('|   |').join('==') + (row === VENT_ROWS - 1 ? '=> YOU' : ''));
    lines.push(each('+---+').join('  '));
    if (row < VENT_ROWS - 1) lines.push(each('  |  ').join('  '));
  }
  const g = grid(lines, 40, 'dim');
  for (const id of VENT_ORDER) {
    const [r0, c0] = VENT_SPOTS[id];
    const cls = 'vroom vr-' + id + (lured === id ? ' vlure' : '');
    for (let r = r0; r < r0 + 3; r++) for (let c = c0; c < c0 + 5; c++) g[r][c] = { ch: g[r][c].ch, cls };
    Array.from(VENTS[id].name).forEach((ch, k) => { g[r0][c0 + 1 + k] = { ch, cls }; });
    if (lured === id) Array.from(')))').forEach((ch, k) => { g[r0 + 2][c0 + 1 + k] = { ch, cls }; });
    // The crawlers in this room, side by side (Echo, then Slink, then Ж). Two get a space between
    // them; three fill the room's 3-wide inside.
    const here = crawlers.filter(v => v.room === id);
    here.forEach((v, k) => {
      g[r0 + 1][c0 + 1 + k * (here.length > 2 ? 1 : 2)] = { ch: v.c.sym, cls: `sym s-${v.c.id} ${cls}` };
    });
  }
  return g;
}

// ---------- Smiley's hiding spots ----------
// Where (: can appear in the office picture, as [row, column] of its "(".
// They match the lines in officeLines() below: on the poster, on the monitor,
// on the desk next to the coffee, and up by the ceiling lamp.
const SMILEY_SPOTS = [[3, 9], [10, 13], [14, 20], [2, 31]];

// ---------- the office ----------
// The middle of the office view (36 characters wide), between the two doors.
// It changes a little with the game: the fan spins, the monitor shows the camera state,
// and with the power out the light and screen go dark.
//   now    the current time in milliseconds (used to animate the fan)
//   dark   true when the power is out
//   camUp  true while the camera is raised
function officeLines(now, dark, camUp) {
  const fan = dark ? '-' : '|/-\\'[Math.floor(now / 80) % 4];   // cycles through | / - \ every 80ms
  const m1 = dark ? '        ' : ' SYSTEM ';
  const m2 = dark ? '        ' : (camUp ? ' CAM UP ' : ' ONLINE ');
  const ray1 = dark ? '         ' : '\\  |  / ';
  const ray2 = dark ? '         ' : '/  |  \\ ';
  return [
    '====================================',
    `                           ${ray1}`,
    "    .---------------.        *      ",
    '    |  ◇    △    ○  |               ',
    `    | LET'S  PARTY! |     ${ray2}`,
    "    '---------------'               ",
    '                                    ',
    '        .------------.              ',
    "        | .--------. |      .---.   ",
    `        | |${m1}| |     ( ${fan} )  `,
    `        | |${m2}| |      '---'   `,
    "        | '--------' |       _|_    ",
    "        '-----.  .---'              ",
    "  .-----------'--'-------------.    ",
    '  |  [] coffee  ~~~   papers   |    ',
    "  '----------------------------'    ",
  ];
}
