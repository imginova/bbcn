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
const SYM_CLASS = { '◆': 'sym s-dia', '▲': 'sym s-tri', '●': 'sym s-orb', '◇': 'sym s-dia', '△': 'sym s-tri', '○': 'sym s-orb' };

// The HTML for a threat's symbol (or Lenny's face), used on the menus and end screens.
const symHtml = (d, extra = '') => d.id === 'len'
  ? `<span class="face${extra}">${LENNY_FACE}</span>`
  : `<span class="sym s-${d.id}${extra}">${d.sym}</span>`;

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
// The tiny + 0.0001 stops rounding errors from shaving off the tips.
function inShape(id, x, y) {
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
function prizeArt(g, lenny) {
  // put() writes a line of text into the box area (row r, starting at column 14 of the framed grid).
  const put = (r, text, cls = '') => Array.from(text).forEach((ch, k) => { g[r + 1][14 + k] = { ch, cls }; });
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
