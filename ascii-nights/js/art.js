/* =====================================================================
   art.js: the ASCII pictures, and the tools that draw them.

   How drawing works in this game:
   A picture is a GRID: a list of rows, each row a list of cells.
   Each cell is one character plus an optional CSS class for its color:
       { ch: 'O', cls: 'c-bon' }
   We build a grid from plain text, draw characters into it (Bonnie in
   a doorway, Freddles on the desk...), then turn the grid into HTML
   with toHtml() and drop it into a <pre> block on the page.

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
function sprite(g, r, c, lines, cls) {
  lines.forEach((line, i) => {
    const row = g[r + i];
    if (!row) return;
    const first = line.search(/\S/), last = line.length - 1 - line.split('').reverse().join('').search(/\S/);
    if (first < 0) return;   // an empty line: nothing to draw
    for (let k = first; k <= last; k++) {
      if (row[c + k]) row[c + k] = { ch: line[k], cls };
    }
  });
}

// Write text into a grid, one cell per character, all in one class.
function write(g, r, c, text, cls = '') {
  Array.from(text).forEach((ch, k) => { if (g[r] && g[r][c + k]) g[r][c + k] = { ch, cls }; });
}

// Put a +----+ border around some lines of text.
const frame = (inner, w) => [
  '+' + '-'.repeat(w) + '+',
  ...inner.map(line => '|' + line.padEnd(w).slice(0, w) + '|'),
  '+' + '-'.repeat(w) + '+',
];

// ---------- menu icons ----------
// A tiny 3-line face of each character, used on the title, the custom night screen and the end
// screens. Written as normal strings, so a backslash is typed \\ (two of them make one).
const ICONS = {
  fre: [' [_] ', '(o^o)', ' >=< '],          // Freddy: top hat and bow tie
  bon: ['|\\ /|', '(o o)', ' >w< '],         // Bonnie: long ears
  gol: [' [_] ', '(. .)', ' \\_/ '],         // Golden Freddy: empty eyes
  pch: [' \\|/ ', '(x o)', ' {V} '],         // Phantom Chica: burnt eye, beak and bib
  bnt: ['(\\_/)', '(o*o)', ' v v '],         // Bonnet: small, with her nose
  wbn: [' |\\  ', '(  o#)', ' |vv| '],       // Withered Bonnie: no face, one ear
  pup: ['.---.', '(o o)', '(@v@)'],          // the Puppet: mask with red cheeks
  stf: [' /!\\ ', '[o o]', '/   \\'],        // the staff bot: a caution cone
  nfr: ['@   @', '(0^0)', '|vVv|'],          // Nightmare Freddy: Freddles and sharp teeth
  wfx: ['/\\ /\\', '(# o)', ' \\vv/J'],      // Withered Foxy: eyepatch and hook
  mon: [' .-. z', '( -_-)', " '-'  "],       // Sleepy Moon: dozing
  end: ['<O_O>', '|=+=|~~', '/   \\'],       // the endo and its flamethrower
};
// Which line of the icon is the face (the middle one, except for the endo, whose face is on top).
const FACE_ROW = { end: 0 };
// A text with every character escaped for HTML (see esc above).
const escText = s => Array.from(s).map(esc).join('');
// The 3-line icon as HTML, in the character's color.
const iconHtml = (c, extra = '') => `<span class="icon c-${c.id}${extra}" title="${c.name}">${ICONS[c.id].map(escText).join('\n')}</span>`;
// Just the face line, for places with room for only one line, like the "Best:" line.
// `??` means "use the right side if the left side is missing", so most characters get line 1.
const faceHtml = c => `<span class="face-mini c-${c.id}" title="${c.name}">${escText(ICONS[c.id][FACE_ROW[c.id] ?? 1])}</span>`;

// ---------- camera rooms ----------
// The inside of each camera's room: 9 lines of 38 characters (frame() adds the border).
const ROOM_ART = {
  stage: String.raw`
 *  .  *  .  *  .  *  .  *  .  *  .  *
 /\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/
 |                                  |
 |                                  |
 |                                  |
 |__________________________________|
 ||    o        o        o        ||
 ||   /|\      /|\      /|\       ||
 ''''''''''''''''''''''''''''''''''''`,
  dining: String.raw`
   ^      ^      ^      ^      ^
  [=]    [=]    [=]    [=]    [=]
 .----------.          .----------.
 | o  o  o  |          | o  o  o  |
 '----------'          '----------'

     .----------------------.
     | o  o  o  o  o  o  o  |
     '----------------------'`,
  back: String.raw`
 .---. .---. .---.       [ ][ ][ ]
 |o o| |x x| |o -|       [ ][ ][ ]
 '---' '---' '---'       ---------
  heads on a shelf       spare parts



   __     ___      ####        __
  |__|   |___|     ####       |__|
 ------------------------------------`,
  cove: String.raw`
  .--------------------------------.
  | ~~~~~~~~ OUT OF ORDER ~~~~~~~~ |
  '--------------------------------'
     ||||||||||||||||||||||||||||
     ||||||||||||||||||||||||||||
     ||||||||||||||||||||||||||||
     ||||||||||||||||||||||||||||
     ||||||||||||||||||||||||||||
   ================================`,
  whall: String.raw`
 |\                                 /|
 | \    .-------.    .-------.     / |
 |  |   | PARTY |    | TIME! |    |  |
 |  |   '-------'    '-------'    |  |
 |  |                             |  |
 |  |                             |  |
 | /                               \ |
 |/  . . . . . . . . . . . . . . .  \|
 '------------------------------------'`,
  ehall: String.raw`
 |\                                 /|
 | \         .-----------.         / |
 |  |        | WET FLOOR |        |  |
 |  |        '-----------'        |  |
 |  |            /\               |  |
 |  |           /  \              |  |
 | /           '----'              \ |
 |/  , , , , , , , , , , , , , , ,  \|
 '------------------------------------'`,
  prize: String.raw`
   .--.   .---.   .--.
   |[]|   | ? |   |[]|    PRIZES!
   '--'   '---'   '--'

          .------------------.
          |  ~ music  box ~  |
          |                  |
          '------------------'
`,
};
// The String.raw blocks above start with a line break (so they line up nicely in the code);
// .slice(1) drops that first empty line, and split('\n') cuts each into its 9 lines.
for (const room in ROOM_ART) ROOM_ART[room] = ROOM_ART[room].split('\n').slice(1);

// Where Bonnie stands in each room: [row, column] of the top-left of his small drawing,
// counted in the framed 40 x 11 camera picture (row 0 and column 0 are the border).
const BONNIE_SLOTS = { stage: [3, 17], dining: [5, 15], back: [5, 21], whall: [5, 17], ehall: [5, 24] };

// ---------- the characters' drawings ----------
// Each one is a list of lines. `cam` is the small camera version, `door` fits a doorway,
// `office` is drawn in the office, and `scare` is the big jumpscare (shown at 2.2x size).
const art = s => s.split('\n').slice(1);   // same trick as ROOM_ART: drop the first empty line
const SPRITES = {
  fre: {
    scare: art(String.raw`
        _______
       |       |
     __|_______|__
  .-.             .-.
 (   )  _______  (   )
  '-'  /       \  '-'
      |  O   O  |
      |    ^    |
      |  .___.  |
      |  |vvv|  |
       \ '---' /
        \_____/
          >=<`),
  },
  bon: {
    cam: art(String.raw`
/\ /\
(o o)
 >w<`),
    door: art(String.raw`
 /\  /\
|  ||  |
|  ||  |
/      \
| O  O |
|  ww  |
|\/\/\/|
 \____/
  >==<`),
    scare: art(String.raw`
     /\         /\
    |  |       |  |
    |  |       |  |
    |  |       |  |
     \  \_____/  /
     /           \
    |   O     O   |
    |      w      |
    |  |\/\/\/\|  |
    |  |/\/\/\/|  |
     \___________/
          >==<`),
  },
  gol: {
    office: art(String.raw`
    ___
  _|___|_
 (_)   (_)
 / .   . \
|    ^    |
|  \___/  |
 \_______/
 /|     |\ `),
    scare: art(String.raw`
        _______
       |       |
     __|_______|__
  .-.             .-.
 (   )  _______  (   )
  '-'  /       \  '-'
      |  @   @  |
      |    v    |
      |  _____  |
       \ '---' /
        \_____/`),
  },
  pch: {
    scare: art(String.raw`
       \ | /
     .-------.
    /  X   o  \
   |     /\    |
   |    /  \   |
   |    \__/   |
    \  #####  /
     '-------'
     | EAT!! |
     '-------'`),
  },
  bnt: {
    office: art(String.raw`
(\_/)
(o*o)`),
    scare: art(String.raw`
    (\     /)
    ( \___/ )
   /         \
  |  O  *  O  |
  |   \___/   |
   \_________/
     >=====<`),
  },
  wbn: {
    office: art(String.raw`
  /\
 |  |   /\
 |  |  |  |
 /  '--'  \
|  ()      |
|    ######|
|   |/\/\/||
 \________/`),
    scare: art(String.raw`
     /\
    |  |      /\
    |  |     |  |
    |  |     |  |
     \  \___/  /
     /         \
    |   (o)     |
    |      #####|
    |    |\/\/\/|
    |    |/\/\/\|
     \_________/`),
  },
  pup: {
    peek: art(String.raw`
( @  @ )`),
    scare: art(String.raw`
       .---------.
      /           \
     |  ( )   ( )  |
     |   \     /   |
     |  (@)   (@)  |
     |     ___     |
     |    /   \    |
      \   '---'   /
       '---------'
        | | | | |`),
  },
  stf: {
    // Drawn in the office by drawStaff in render.js (its eyes and arrow change while it blinks).
    office: art(String.raw`
 /!\
[o o]
|___|
/   \ `),
    scare: art(String.raw`
         /!\
        /   \
     .-'-----'-.
     | (*) (*) |
     |   ___   |
     |  [###]  |
     '---------'
       //   \\
      //     \\`),
  },
  nfr: {
    freddle: '(oo)',
    office: art(String.raw`
(@)         (@)
 \ _________ /
 / /0\   /0\ \
|      ^      |
| |\/\/\/\/\| |
| |/\/\/\/\/| |
 \___________/`),
    scare: art(String.raw`
   (@)               (@)
    \\  ___________  //
     \ /           \ /
      | /0\     /0\ |
      |      ^      |
      | |\/\/\/\/\| |
      | |/\/\/\/\/| |
      |  \_______/  |
       \___________/
         (oo)   (oo)`),
  },
  wfx: {
    peek: art(String.raw`
 /\
(o|
 \|`),
    half: art(String.raw`
  /\_/\
 (#  o )
 |  ^  |
 |/\/\/|`),
    run: art(String.raw`
 /\_/\
(#  o)>
 /|  |\ `),
    door: art(String.raw`
/\    /\
| \__/ |
|(#) o |
|  /\  |
||\/\/||
 \/\/\/
  \__/ J`),
    scare: art(String.raw`
   /\               /\
  /  \_____________/  \
  |                   |
  |   ####     ( o )  |
  |   ####            |
  |         /\        |
  |   |\/\/\/\/\/\|   |
   \  |/\/\/\/\/\/|  /
    \_____________/ __J`),
  },
  mon: {
    scare: art(String.raw`
          _.---._
        .'  .-.  '.   Z
       /  .'   '.  \    z
      |  /  >_<  \  |
      | |   ___   | |
      |  \ \___/ /  |
       \  '.___.'  /
        '._______.'`),
  },
  end: {
    scare: art(String.raw`
       .-------.
      | O     O |
      |  =====  |
       '-+-+-+-'
    ____|     |____[######>~~~~~~
        |_____|
        /     \
       /       \ `),
  },
};

// ---------- the office ----------
// The middle of the office: 36 wide and 16 tall. A poster and kids' drawings on the wall,
// the desk with the monitor in the middle, and the floor. The staff bot, the fan, Freddles,
// cupcakes and visitors are drawn on top of this by render.js.
const OFFICE_ART = art(String.raw`
____________________________________
 .--------.          .-----------.
 | SMILE! |          | o  ^  #  ~ |
 |  (^-^) |          | /|\ /\ (_) |
 '--------'          '-----------'

           .-------------.
           | .---------. |
           | |         | |
           | '---------' |
  _________'-------------'_________
 |                                |
 |________________________________|
   ||                          ||
. . . . . . . . . . . . . . . . . .
 . . . . . . . . . . . . . . . . . .`);

// Where things go in the office, as [row, column] of their top-left corner.
const STAFF_SPOT = [6, 2];        // the staff bot, on the left end of the desk
const FAN_SPOT = [7, 28];         // the desk fan, on the right
const GOLDEN_SPOT = [3, 13];      // Golden Freddy, slumped in front of the monitor
const WITHERED_SPOT = [3, 12];    // Withered Bonnie, leaning over the desk
const NIGHTMARE_SPOT = [2, 10];   // Nightmare Freddy, looming over everything
const SCREEN_SPOT = [8, 14];      // the monitor's screen: 9 characters wide
const BONNET_ROWS = [12, 14];     // Bonnet runs along the floor, between these rows

// The fan's blades in four positions; render.js shows one after another while the fan is on.
const FAN_BLADES = ['--', '\\|', '||', '|/'];

// The office for this moment, as a grid (without the visitors: render.js adds those).
function officeGrid(now) {
  const g = grid(OFFICE_ART, 36);
  // The fan: spinning blades while it's on, still blades while it's off.
  const blades = G.fan ? FAN_BLADES[Math.floor(now / 70) % 4] : '--';
  sprite(g, FAN_SPOT[0], FAN_SPOT[1], [' .--. ', `( ${blades} )`, " '||' "], G.fan ? 'fan on' : 'fan');
  return g;
}
