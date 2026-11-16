/* =====================================================================
   art.js: the ASCII pictures, and the tools that draw them.

   How drawing works in this game:
   A picture is a GRID: a list of rows, each row a list of cells.
   Each cell is one character plus an optional CSS class for its color:
       { ch: 'O', cls: 'c-bon' }
   We build a grid from plain text, draw characters into it (Bonnie in
   a doorway, Toy Freddy in the office...), then turn the grid into HTML
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

// Put a +----+ border around some lines of text.
const frame = (inner, w) => [
  '+' + '-'.repeat(w) + '+',
  ...inner.map(line => '|' + line.padEnd(w).slice(0, w) + '|'),
  '+' + '-'.repeat(w) + '+',
];

// ---------- menu icons ----------
// A tiny 3-line face of each character, used on the title, the custom night screen and the end
// screens. Written as normal strings, so a backslash is typed \\ (two of them make one).
// The characters ASCII Nights also has (Freddy, Bonnie, Chica, Foxy, Golden Freddy, Toy Bonnie,
// Toy Chica, the Puppet, Shadow Bonnie) use its faces and colors, so the two games look alike (on request).
// A hook or eyepatch on a character's RIGHT side is on the LEFT as you look at them.
const ICONS = {
  fre: [' [_] ', '(o^o)', ' >=< '],          // Freddy: black top hat and bow tie, blue eyes
  bon: ['|\\ /|', '(o o)', ' >=< '],         // Bonnie: long ears, magenta eyes, red bow tie
  chi: [' \\|/ ', '(o>o)', '|EAT|'],         // Chica: violet eyes, orange beak, LET'S EAT bib
  fox: ['/\\_/\\', '(o o)', 'J\\vv/'],       // Foxy: red, yellow eyes, gold teeth, hook on his right hand
  gol: [' [_] ', '(.^.)', ' >=< '],          // Golden Freddy: Freddy in gold, empty eyes with tiny pupils
  fen: [' .-. ', '[o o]', '/|=|\\'],         // Freddy Endo: bare grey metal, glowing white eyes
  tfr: [' [_] ', '(o^o)', '@>=<@'],          // Toy Freddy: shiny brown, black hat and bow tie, blue eyes, rosy cheeks
  tbn: ['/\\ /\\', '(^o^)', ' >=< '],        // Toy Bonnie: shiny blue, green eyes, red bow tie
  tch: [' \\|/ ', '(^>^)', '|PTY|'],         // Toy Chica: blue eyes, orange beak, "let's party" bib
  mng: ['_/\\_ ', '(o-0)~', ' \\/\\/'],      // Mangle: white and pink, torn apart, one yellow eye
  bb:  [' -+- ', '(^_^)', ' /#\\ '],         // BB: blue and red propeller cap, red striped shirt
  pup: ['.---.', '(o o)', '(@v@)'],          // the Puppet: white mask, red cheeks and lips
  cup: [' ,^, ', '(o.o)', '\\===/'],         // Toy cupcake: pink frosting, a lit candle, blue eyes
  sfr: [' [_] ', '(o^o)', ' >=< '],          // Shadow Freddy: a dark purple Freddy with white eyes
  sbn: ['/\\ /\\', '(o o)', ' VVV '],        // Shadow Bonnie: a black Toy Bonnie with white eyes and teeth
  cry: [' .-. ', '(;_;)', ' /|\\ '],         // the Crying Child: the grey FNAF 3 child, black tears
  spr: [' |\\ |', '(o#o)', ' |W| '],         // Springtrap: torn ear, wires in his face, white pinprick eyes
};
// Which line of the icon is the face (the middle one for everyone; kept so a new drawing can change it).
const FACE_ROW = {};
// A text with every character escaped for HTML (see esc above).
const escText = s => Array.from(s).map(esc).join('');
// Accent masks for the icons: a second color, used sparingly (like ASCII Nights). Each line lines up
// with the icon's line above it; a letter from ACCENT (see "accent colors" below) colors the character
// above it, a space leaves it in the main color.
const ICON_ACCENTS = {
  fre: [' xxx', ' b b', ' xxx'],          // Freddy: black hat and bow tie, blue eyes
  bon: ['', ' p p', ' rrr'],              // Bonnie: magenta eyes, red bow tie
  chi: ['', ' vov'],                      // Chica: violet eyes, orange beak
  fox: ['', ' y y', '  kk'],              // Foxy: yellow eyes, gold teeth
  gol: [' xxx', '', ' xxx'],              // Golden Freddy: black hat and bow tie
  fen: ['', ' w w'],                      // Freddy Endo: glowing white eyes
  tfr: [' xxx', ' b b', 'rxxxr'],         // Toy Freddy: black hat and bow tie, blue eyes, red cheeks
  tbn: ['', ' g g', ' rrr'],              // Toy Bonnie: green eyes, red bow tie
  tch: ['', ' bob'],                      // Toy Chica: blue eyes, orange beak
  mng: [' pp', '    y'],                  // Mangle: a pink bow and a yellow endoskeleton eye
  bb:  [' brb', '', '  r'],               // BB: blue and red cap, red striped shirt
  pup: ['', '', ' rrr'],                  // the Puppet: red cheeks and lips
  cup: ['  y', ' b b'],                   // Toy cupcake: a yellow flame, blue eyes
  sfr: [' xxx', ' w w', ' xxx'],          // Shadow Freddy: black hat and bow tie, white eyes
  sbn: ['', ' w w', ' www'],              // Shadow Bonnie: white eyes and teeth on black
  cry: ['', ' x x'],                      // the Crying Child: black tears
  spr: ['', ' w w'],                      // Springtrap: white pinprick eyes
};
// One line of text as HTML, with the characters its accent mask marks wrapped in their color.
const accentText = (line, mask = '') => Array.from(line).map((ch, k) =>
  ACCENT[mask[k]] ? `<span class="${ACCENT[mask[k]]}">${esc(ch)}</span>` : esc(ch)).join('');
const iconLines = id => ICONS[id].map((line, i) => accentText(line, (ICON_ACCENTS[id] || [])[i]));
// The 3-line icon as HTML, in the character's color.
const iconHtml = (c, extra = '') => `<span class="icon c-${c.id}${extra}" title="${c.name}">${iconLines(c.id).join('\n')}</span>`;
// Just the face line, for places with room for only one line, like the "Best:" line.
// `??` means "use the right side if the left side is missing", so everyone gets line 1.
const faceHtml = c => `<span class="face-mini c-${c.id}" title="${c.name}">${iconLines(c.id)[FACE_ROW[c.id] ?? 1]}</span>`;

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
  parts: String.raw`
 .---. .---. .---.       [ ][ ][ ]
 |o o| |x x| |o -|       [ ][ ][ ]
 '---' '---' '---'       ---------
  heads on a shelf       spare parts



   __     ___      ####        __
  |__|   |___|     ####       |__|
 ------------------------------------`,
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

// Where people stand in each room: [row, column] of the top-left of their small drawing,
// counted in the framed 40 x 11 camera picture (row 0 and column 0 are the border).
// (On the stage Freddy is in the middle, between Bonnie and Chica.)
const FREDDY_SLOTS = { stage: [3, 17], dining: [7, 30], whall: [5, 21], ehall: [5, 22] };
const BONNIE_SLOTS = { stage: [3, 10], dining: [3, 14], parts: [5, 15], whall: [5, 16] };
const CHICA_SLOTS = { stage: [3, 24], dining: [3, 19], ehall: [5, 28] };
const SHADOW_SLOTS = { stage: [7, 29], dining: [7, 1], cove: [5, 34], whall: [5, 26], ehall: [5, 6], parts: [5, 28], prize: [5, 3] };
// The Crying Child fills most of his camera's picture (on request), at the same spot on every camera.
const CHILD_SPOT = [1, 5];

// ---------- the characters' drawings ----------
// Each one is a list of lines. `cam` is the small camera version, `door` fits a doorway,
// `office` is drawn in the office, and `scare` is the big jumpscare (shown at 2.2x size).
const art = s => s.split('\n').slice(1);   // same trick as ROOM_ART: drop the first empty line
const SPRITES = {
  fre: {
    // On the stage (CAM 1), until he sets off on a trip.
    cam: art(String.raw`
 [_]
(o^o)
 >=<`),
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
  chi: {
    cam: art(String.raw`
 \|/
(o>o)
|EAT|`),
    door: art(String.raw`
  \ | /
 .-----.
/ O   O \
|  /\   |
|  \/   |
 \_____/
|LET'S |
| EAT!!|`),
    // Her bib really says LET'S EAT!!! (three exclamation marks); "LET'S PARTY" is Toy Chica's.
    scare: art(String.raw`
       \ | /
     .-------.
    /  O   O  \
   |    /\     |
   |    \/     |
    \  _____  /
     '-------'
   |LET'S EAT!!!|
   '------------'`),
  },
  // Foxy: both eyes, a hook on his right hand. His camera poses are drawn below the SPRITES list.
  fox: {
    scare: art(String.raw`
   /\               /\
  /  \_____________/  \
  |                   |
  |   ( o )   ( o )   |
  |         /\        |
  |   |\/\/\/\/\/\|   |
   \  |/\/\/\/\/\/|  /
J__ \_____________/`),
  },
  // Golden Freddy is Freddy in gold with dot eyes. His jumpscare is made from Freddy's just below the
  // SPRITES list, so the two always match.
  gol: {
    // Slumped in front of your desk: Freddy (hat, ears, teeth, bow tie) with dot eyes.
    office: art(String.raw`
      ___
    _|___|_
(_)         (_)
/   .     .   \
|      ^      |
|    |vvv|    |
\_____________/
/_____>=<_____\ `),
  },
  tfr: {
    // Leaning over your desk. Exactly as wide as the desk monitor (15), so none of it peeks out around him.
    office: art(String.raw`
      ___
    _|___|_
(@)         (@)
/   o     o   \
|  @   ^   @  |
|    .___.    |
\    \___/    /
 \___________/
/_____>=<_____\ `),
    scare: art(String.raw`
          _______
         |       |
       __|_______|__
   .-.               .-.
  ( @ )   _______   ( @ )
   '-'   /       \   '-'
        | (O) (O) |
        | @  ^  @ |
        |  .___.  |
        |  |___|  |
         \_______/
           >===<`),
  },
  tbn: {
    office: art(String.raw`
 /\  /\
 \ \/ /
 /    \
| ^  ^ |
|@ ww @|
| \__/ |
 \____/
  >==<`),
    // (the same jumpscare as Toy Bonnie's in ASCII Nights)
    scare: art(String.raw`
     /\         /\
    /  \       /  \
    |   \_____/   |
    /             \
   |   (^)   (^)   |
   |  *    o    *  |
   |    \_____/    |
    \             /
     '-----------'
         >w<`),
  },
  tch: {
    office: art(String.raw`
  \ | /
 .-----.
/ ^   ^ \
|  /\   |
|  \/   |
 \_____/
|PARTY!|`),
    // (the same jumpscare as Toy Chica's in ASCII Nights)
    scare: art(String.raw`
        \  |  /
      .---------.
     /  ^     ^  \
    |     /\      |
    |     \/      |
     \  '-----'  /
      '---------'
      | PARTY!! |
      '---------'`),
  },
  mng: {
    office: art(String.raw`
 _/\_  .o
(o -0)/ |
 \/\/\/\/`),
    scare: art(String.raw`
          _/\_
    .o   /    \   0.
    | \_( o  -0)_/ |
    |   /\/\/\/\   |
     \_/ |    | \_/
      ~~ |/\/\| ~~
         '----'
    ~  ~  krrzzt  ~  ~`),
  },
  bb: {
    office: art(String.raw`
  -+-
 (^_^)
 /[#]\ `),
    scare: art(String.raw`
          --+--
         _.---._
       .'       '.
      /  ^     ^  \
     |   .-----.   |
     |   \_____/   |
      \           /
       '._HELLO_.'
         /[###]\ `),
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
  cup: {
    scare: art(String.raw`
          ,^,
          | |
     .----' '----.
    /  (O)   (O)  \
   |       v       |
   |  |\/\/\/\/|   |
    \ |/\/\/\/\|  /
     \===========/
      \=========/`),
  },
  // Shadow Freddy: a slumped, dark purple Freddy with white eyes. His jumpscare is Freddy's (made below
  // the SPRITES list).
  sfr: {
    cam: art(String.raw`
 [_]
(o^o)
/>=<\ `),
  },
  // Shadow Bonnie: a black Toy Bonnie with white eyes and teeth. In the dark office only his eyes show.
  // His jumpscare is Toy Bonnie's, in black (made below the SPRITES list).
  sbn: {
    eyes: 'O O',
  },
  cry: {
    cam: art(String.raw`
 ___
(;_;)
 /|\ `),
    scare: art(String.raw`
        _______
      .'       '.
     /  ;     ;  \
    |   ;     ;   |
    |      _      |
    |    /   \    |
     \   '---'   /
      '._______.'
       /|     |\ `),
  },
  spr: {
    scare: art(String.raw`
     |\          /|
     | \        / |
      \ \______/ /
      /          \
     |  (o)  ##   |
     |   ##  (o)  |
     | |\/\/\/\/| |
     | |/\/\/\/\| |
      \__________/
       ||| || |||`),
  },
};
// Foxy's camera poses (peeking out of the cove, half out, running), the same as in ASCII Nights.
SPRITES.fox.peek = art(String.raw`
 /\
(o|
 \|`);
SPRITES.fox.half = art(String.raw`
  /\_/\
 (o  o )
 |  ^  |
 |/\/\/|`);
SPRITES.fox.run = art(String.raw`
 /\_/\
(o  o)>
 /|  |\ `);
// Golden Freddy's jumpscare: Freddy's, with his O eyes swapped for dots. Shadow Freddy's keeps the eyes
// (they're white, see the accents). (.map makes a new list with every line changed; .replace(/O/g, '.')
// swaps every capital O on the line for a dot.)
SPRITES.gol.scare = SPRITES.fre.scare.map(line => line.replace(/O/g, '.'));
SPRITES.sfr.scare = SPRITES.fre.scare.slice();
// Shadow Bonnie's jumpscare: Toy Bonnie's, drawn in black.
SPRITES.sbn.scare = SPRITES.tbn.scare.slice();

// ---------- accent colors ----------
// Like ASCII Nights, most drawings get a second color on a few parts (eyes, hats, bow ties, beaks...),
// following the official designs.
// A MASK is a copy of a drawing's shape, attached as drawing.accent. Each letter in it colors the
// character in the same place in the drawing (the colors are the acc-... classes in style.css); a space
// leaves it in the character's main color. sprite() reads the mask, so the color shows wherever the
// drawing is used.
const ACCENT = {
  r: 'acc-red', o: 'acc-orange', y: 'acc-yellow', g: 'acc-green', b: 'acc-blue', v: 'acc-violet',
  p: 'acc-pink', k: 'acc-gold', c: 'acc-sky', x: 'acc-black', w: 'acc-white', G: 'acc-grey',
};
// Freddy: black top hat and bow tie, blue eyes. Golden Freddy: the same hat and bow tie.
// Shadow Freddy: the same hat and bow tie, white eyes.
SPRITES.fre.scare.accent = art(String.raw`
        xxxxxxx
       xxxxxxxxx
     xxxxxxxxxxxxx



         b   b





          xxx`);
SPRITES.fre.cam.accent = [' xxx', ' b b', ' xxx'];
SPRITES.gol.scare.accent = SPRITES.fre.scare.accent.map(line => line.replace(/b/g, ' '));
SPRITES.sfr.scare.accent = SPRITES.fre.scare.accent.map(line => line.replace(/b/g, 'w'));
SPRITES.gol.office.accent = art(String.raw`
      xxx
    xxxxxxx





      xxx`);
SPRITES.sfr.cam.accent = [' xxx', ' w w', ' xxx'];
// Bonnie: magenta eyes, red bow tie.
SPRITES.bon.scare.accent = art(String.raw`






        p     p




          rrrr`);
SPRITES.bon.door.accent = art(String.raw`




  p  p



  rrrr`);
SPRITES.bon.cam.accent = ['', ' p p'];
// Chica: violet eyes, orange beak.
SPRITES.chi.scare.accent = art(String.raw`


       v   v
        oo
        oo`);
SPRITES.chi.door.accent = art(String.raw`


  v   v
   oo
   oo`);
// In a dark doorway only their eyes show (on request): [row, column] of each eye inside the door
// drawing, plus the accent letter for the eyes' color. The flashlight shows the whole drawing.
SPRITES.bon.door.eyes = { at: [[4, 2], [4, 5]], color: 'p' };
SPRITES.chi.door.eyes = { at: [[2, 2], [2, 6]], color: 'v' };
SPRITES.chi.cam.accent = ['', ' vov'];
// Foxy: yellow eyes and gold teeth.
SPRITES.fox.scare.accent = art(String.raw`



        y       y

       kkkkkkkkkkk
       kkkkkkkkkkk`);
SPRITES.fox.peek.accent = ['', ' y'];
SPRITES.fox.half.accent = ['', '  y  y'];
SPRITES.fox.run.accent = ['', ' y  y'];
// Toy Freddy: black hat and bow tie, blue eyes, rosy red cheeks.
SPRITES.tfr.office.accent = art(String.raw`
      xxx
    xxxxxxx

    b     b
   r       r



      xxx`);
SPRITES.tfr.scare.accent = art(String.raw`
          xxxxxxx
         xxxxxxxxx
       xxxxxxxxxxxxx



           b   b
          r     r



           xxxxx`);
// Toy Bonnie: green eyes, rosy cheeks, red bow tie. Shadow Bonnie: white eyes and teeth.
SPRITES.tbn.scare.accent = art(String.raw`




        g     g
      r         r



         rrr`);
SPRITES.sbn.scare.accent = art(String.raw`




        w     w
           w
        wwwwwww


         www`);
SPRITES.tbn.office.accent = art(String.raw`



  g  g
 r    r


  rrrr`);
// Toy Chica: blue eyes, orange beak.
SPRITES.tch.scare.accent = art(String.raw`


        b     b
          oo
          oo`);
SPRITES.tch.office.accent = art(String.raw`


  b   b
   oo
   oo`);
// Mangle: a pink bow, and yellow eyes on the endoskeleton parts.
SPRITES.mng.office.accent = ['', '    y'];
SPRITES.mng.scare.accent = art(String.raw`
          pppp
     y            y
              y`);
// BB: a blue and red propeller cap, red striped shirt.
SPRITES.bb.office.accent = art(String.raw`
  brb

  rrr`);
SPRITES.bb.scare.accent = art(String.raw`
          bbrbb
         bbbbbbb






         rrrrrrr`);
// The Puppet: purple tear stripes, red cheeks and red lips.
SPRITES.pup.scare.accent = art(String.raw`



         v     v
        rrr   rrr

          rrrrr
          rrrrr`);
SPRITES.pup.peek.accent = ['  r  r'];
// Toy cupcake: a yellow flame, blue eyes.
SPRITES.cup.scare.accent = art(String.raw`
          yyy


       bbb   bbb`);
// The Crying Child: black tears.
SPRITES.cry.cam.accent = ['', ' x x'];
// His big picture: the grey crying child from FNAF 3 (Happiest Day) and FNAF World, copied as a pixel
// picture instead of redrawn in our own style (on request: "just the original design in ascii").
// Each letter below is one pixel: G is his grey, a dot is empty. The eyes and tear streaks are holes
// in the grey, so the dark screen shows through them, black like in the game. 9 rows, as tall as a
// camera's room. The jumpscare uses it too (shown bigger).
const CRY_PIXELS = [
  '.....GGGGG.....',
  '...GGGGGGGGG...',
  '..GGGGGGGGGGG..',
  '..GG..GGG..GG..',   // the eyes
  '..GG..GGG..GG..',
  '..GGG.GGG.GGG..',   // the tears, running straight down...
  '...GG.GGG.GG...',
  '.GGGG.GGG.GGGG.',   // ...past his chin
  'GG.GGGGGGGGG.GG',   // his shoulders and arms
];
// A text character is about twice as tall as it is wide, so each pixel is two characters wide (##) to
// keep it square. Empty pixels become spaces: sprite() leaves spaces outside the drawing see-through,
// and blanks out the ones inside it (the eyes and tears).
SPRITES.cry.big = CRY_PIXELS.map(row => row.replace(/G/g, '##').replace(/\./g, '  '));
SPRITES.cry.scare = SPRITES.cry.big;
// Springtrap: white pinprick eyes, grey wires.
SPRITES.spr.scare.accent = art(String.raw`




         w   GG
         GG   w`);

// ---------- the office ----------
// The middle of the office: 36 wide and 16 tall. A poster and the vent opening on the wall, the
// desk with the monitor in the middle, and the floor. Everything else is drawn on top by render.js.
const OFFICE_ART = art(String.raw`
____________________________________
 .--------.   .--------.
 | LET'S  |   |========|
 | PARTY! |   |========|
 '--------'   '--------'

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
const VENT_SPOT = [1, 14];         // the vent opening on the wall: 10 wide, 4 tall
const NOTE_SPOT = [1, 27];         // the Crying Child's sticky note
const GOLDEN_SPOT = [3, 11];       // Golden Freddy, slumped in front of the monitor (exactly as wide as it)
const TFREDDY_SPOT = [2, 11];      // Toy Freddy, leaning over the desk
const TBONNIE_SPOT = [2, 1];       // Toy Bonnie, on the left
const TCHICA_SPOT = [2, 26];       // Toy Chica, on the right
const BB_SPOT = [11, 3];           // BB, sitting in front of the desk on the left
const SCREEN_SPOT = [8, 14];       // the monitor's screen: 9 characters wide
// Where Mangle can turn up (their drawing is 9 wide and 3 tall): the left and right walls, on top of
// the monitor, and the floor on either side. Each flash sends them to a different one.
const MANGLE_SPOTS = [[5, 1], [5, 27], [5, 13], [12, 1], [12, 26]];
// Where Shadow Bonnie's eyes can be (never over the vent). [row, column] of the left eye.
const SHADOW_EYES = [[2, 3], [5, 6], [6, 28], [8, 16], [11, 5], [11, 27], [12, 16], [14, 9], [14, 24], [3, 30]];

// The office for this moment, as a grid (without the visitors: render.js adds those).
function officeGrid() {
  const g = grid(OFFICE_ART, 36);
  // The vent's grate in a dim color, so it looks set back into the wall.
  for (let r = VENT_SPOT[0] + 1; r <= VENT_SPOT[0] + 2; r++) {
    for (let c = VENT_SPOT[1] + 1; c <= VENT_SPOT[1] + 8; c++) g[r][c].cls = 'dim';
  }
  return g;
}
