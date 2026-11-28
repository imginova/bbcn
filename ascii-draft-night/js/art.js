/* =====================================================================
   art.js: the ASCII pictures, and the tools that draw them.

   How drawing works in this game:
   A picture is a GRID: a list of rows, each row a list of cells.
   Each cell is one character plus an optional CSS class for its color:
       { ch: 'O', cls: 'c-bon' }
   We build a grid from plain text, draw characters into it (Bonnie in
   a doorway, a Freddle on the desk...), then turn the grid into HTML
   with toHtml() and drop it into a <pre> block on the page.

   Every drawing is plain ASCII on purpose: fancy symbols come from
   other fonts with different widths and would knock the columns out
   of line. The drawings are written with String.raw`...`, which keeps
   backslashes exactly as typed (in a normal string \ is special).
   One catch: a drawing can't END with \ right before the closing `,
   because \` means "a backtick character, not the end". Those lines get
   a space after the \ (spaces at the end of a line are never drawn).

   The faces and drawings of Freddy, Bonnie, Chica, Toy Bonnie, Toy
   Chica and the Puppet are the same as in ASCII FNAF: Line 1, and
   Nightmare Freddy's and Lolbit's are ASCII Nights', so the games look
   alike.
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
// Cells next to each other with the same color share ONE <span> (a "run"), so "|____|" in one color is
// one element, not six. The picture looks exactly the same, but the browser has far fewer elements to
// lay out and paint, which keeps the game smooth (on request: "the game is a tad laggy"; a painted office
// went from about 800 elements to a few dozen).
function toHtml(g) {
  return g.map(row => {
    let html = '', text = '', cls = null;
    for (const c of row) {
      const k = c.cls || '';
      if (k !== cls) { html += wrapRun(text, cls); text = ''; cls = k; }   // the color changed: close the run
      text += esc(c.ch);
    }
    return html + wrapRun(text, cls);
  }).join('\n');
}
// One run of same-colored text: in a <span> if it has a color, as plain text if not.
const wrapRun = (text, cls) => !text ? '' : cls ? `<span class="${cls}">${text}</span>` : text;

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
// A tiny 3-line face of each character, used on the cards, the title and the end screens. Written as
// normal strings, so a backslash is typed \\ (two of them make one).
const ICONS = {
  fre: [' [_] ', '(o^o)', ' >=< '],          // Freddy: black top hat and bow tie, blue eyes
  bon: ['|\\ /|', '(o o)', ' >=< '],         // Bonnie: long ears, magenta eyes, red bow tie
  chi: [' \\|/ ', '(o>o)', '|EAT|'],         // Chica: violet eyes, orange beak, LET'S EAT bib
  tbn: ['/\\ /\\', '(^o^)', ' >=< '],        // Toy Bonnie: shiny blue, green eyes, red bow tie
  tch: [' \\|/ ', '(^>^)', '|PTY|'],         // Toy Chica: blue eyes, orange beak, "let's party" bib
  pup: ['.---.', '(o o)', '(@v@)'],          // the Puppet: white mask, red cheeks and lips
  nfr: ['@   @', '(0^0)', '|vVv|'],          // Nightmare Freddy: Freddles, orange eyes, sharp teeth
  trs: ['[___]', '\\@~@/', 'm=+=m'],         // Trash and the Gang: Bucket Bob's bucket head and oven mitts
  lol: ['/\\_/\\', '(o o)', ' LOL '],         // Lolbit
  fox: ['/\\_/\\', '(o o)', 'J\\vv/'],       // Foxy: red, yellow eyes, gold teeth, hook on his right hand
  gol: [' [_] ', '(.^.)', ' >=< '],          // Golden Freddy: Freddy in gold, empty eyes with tiny pupils
  tfr: [' [_] ', '(o^o)', '@>=<@'],          // Toy Freddy: shiny brown, black hat and bow tie, blue eyes, rosy cheeks
  nbn: ['|\\ /|', '(@ @)', '>VVV<'],         // Nightmare Bonnie: torn ears, magenta eyes, sharp teeth, red bow tie
  bnt: ['(\\_/)', '(o*o)', ' v v '],         // Bonnet: small and pink, green eyes, her nose
  wbn: [' |\\  ', '(  o#)', ' |vv| '],       // Withered Bonnie: no face, one ear, a red pinprick eye
  wfx: ['/\\ /\\', '(# o)', 'J\\vv/'],       // Withered Foxy: eyepatch on his right eye, hook on his right hand
  spr: [' |\\ |', '(o#o)', ' |W| '],         // Springtrap: torn ear, wires in his face, white pinprick eyes
  nch: [' \\|/ ', '(@>@)', '|EAT|'],         // Nightmare Chica: red eyes, orange beak, LET'S EAT bib
  bab: ['@@ @@', '(o.o)', ' |=| '],          // Circus Baby: red-orange pigtails, green eyes, red nose and outfit
  sbn: ['/\\ /\\', '(o o)', ' VVV '],        // Shadow Bonnie: a black Toy Bonnie with white eyes and teeth
  plu: ['(\\/)', '(oo)', '{vv}'],            // Plushtrap: a little brown-green rabbit plush with sharp teeth
  ffr: ['[_] ^', '(o^o)', ' >=<b'],          // Funtime Freddy: magenta hat and bow tie, blue eyes, Bon-Bon on his hand
  wfr: [' [_] ', '(O^.)', ' >#< '],          // Withered Freddy: torn up, one eye hanging, wires
  ffx: ['/\\_/\\', '(o o)', ' \\v/ '],       // Funtime Foxy: white, pink ears and snout, yellow eyes
  nfb: [' [_] ', '(@^@)', '>VVV<'],          // Nightmare Fredbear: gold, purple hat and bow tie, pale eyes
  // The bonus characters.
  slv: [' .-. ', '(-_O)', '  |  '],          // Salvage sign: a winking wooden face on a post
  wmc: [' \\|/ ', '(O>O)', '|EAT|'],         // Watermelon Chica: a striped Chica with her bib
  hnd: ['.---.', '|>_ |', '[:::]'],          // Hand-unit: Sister Location's elevator keypad
  bpt: [' \\v/ ', '(O o)', '[===]'],         // Bounce pot: a sprouting head on a clay pot
  mun: [' o o ', '\\/\\/\\', '/\\/\\/'],    // Munchie: two big eyes on chattering teeth
  ckf: [' [_] ', '(o^o)', ' >o< '],          // Cookie Freddy: Freddy dipped in chocolate, pink hat and bow tie
  fen: [' .-. ', '[o o]', '/|=|>'],          // the Flamethrower endo: bare metal, a flamethrower
  pbb: [' @_@ ', '(*.*)', ' | | '],          // Plush babies: little Circus Baby plushes
  bb: [' _^_ ', '(o o)', '(\\_/)'],          // BB: a propeller beanie and a big grin
  mgl: ['/\\ /\\', '(O O)', '{=}~o'],        // Mangle: fox ears, and the tangled endo bits
  nbb: ['[=^=]', '(O O)', '(VVV)'],          // Nightmare BB: a dark beanie, a mouth full of teeth
  nsb: ['.---.', '| ! |', '[o_o]'],          // the Nightmare staff bot: its caution bot's sign
  grw: ['v/ \\v', 'xX Xx', '|RIP|'],         // Grave weed: two spiky heads on a tombstone
  fch: [' \\|/ ', '(o>o)', '$+$+$'],          // Funtime Chica: price tags
  gfr: [' [_] ', '(o o)', ' ~~~ '],          // Ghost Freddy: a see-through Freddy
  rsb: ['/\\ /\\', '(o o)', '==#=>'],        // Rockstar Bonnie: and his guitar
  hlp: ['.-.-.', '(O O)', '\\VVV/'],          // Nightmare Helpy: a little bear with teeth
  hpi: ['.---.', '|7+5|', "'---'"],          // H.E.L.P.I: the tablet with a sum on it
  twf: ['/\\ /\\', '(o o)', '\\VVV/'],        // Twisted Wolf
  dbr: ['[===]', '(o o)', '-|=|-'],          // Dreadbear: bolts in his neck
  tfx: ['/\\ /\\', '(O O)', '_/:\\_'],        // Twisted Foxy: coming out of the ground
};
// A text with every character escaped for HTML (see esc above).
const escText = s => Array.from(s).map(esc).join('');
// Accent masks for the icons: a second color, used sparingly. Each line lines up with the icon's line
// above it; a letter from ACCENT (see "accent colors" below) colors the character above it, a space
// leaves it in the main color.
const ICON_ACCENTS = {
  fre: [' xxx', ' b b', ' xxx'],          // Freddy: black hat and bow tie, blue eyes
  bon: ['', ' p p', ' rrr'],              // Bonnie: magenta eyes, red bow tie
  chi: ['', ' vov'],                      // Chica: violet eyes, orange beak
  tbn: ['', ' g g', ' rrr'],              // Toy Bonnie: green eyes, red bow tie
  tch: ['', ' bob'],                      // Toy Chica: blue eyes, orange beak
  pup: ['', '', ' rrr'],                  // the Puppet: red cheeks and lips
  nfr: ['', ' o o'],                      // Nightmare Freddy: orange eyes
  trs: ['GGGGG', ' xxx', 'r   r'],        // Trash and the Gang: a silver bucket, a scribbled face, red mitts
  lol: ['', '', ' vvv'],                  // Lolbit: a purple LOL
  fox: ['', ' y y', '  kk'],              // Foxy: yellow eyes, gold teeth
  gol: [' xxx', '', ' xxx'],              // Golden Freddy: black hat and bow tie
  tfr: [' xxx', ' b b', 'rxxxr'],         // Toy Freddy: black hat and bow tie, blue eyes, red cheeks
  nbn: ['', ' p p', 'rwwwr'],             // Nightmare Bonnie: magenta eyes, white teeth, red bow tie
  bnt: ['', ' g g'],                      // Bonnet: green eyes
  wbn: ['', '    r'],                     // Withered Bonnie: a red pinprick eye
  wfx: ['', '   y'],                      // Withered Foxy: his one yellow eye
  spr: ['', ' w w'],                      // Springtrap: white pinprick eyes
  nch: ['', ' ror', 'wwwww'],             // Nightmare Chica: red eyes, orange beak, white bib
  bab: ['rr rr', ' grg', '  r'],          // Circus Baby: red pigtails, green eyes, red nose and outfit
  sbn: ['', ' w w', ' www'],              // Shadow Bonnie: white eyes and teeth on black
  plu: ['', ' ww', ' ww'],                // Plushtrap: white eyes and teeth
  ffr: ['ppp b', ' b b', ' pppb'],        // Funtime Freddy: magenta hat and bow tie, blue eyes, Bon-Bon in blue
  wfr: [' xxx', ' b ', '  G'],            // Withered Freddy: black hat, a blue eye, bare wires
  ffx: ['p   p', ' y y', '  p'],          // Funtime Foxy: pink ears and snout, yellow eyes
  nfb: [' vvv', ' w w', 'vwwwv'],         // Nightmare Fredbear: purple hat and bow tie, pale eyes, white teeth
  slv: ['', ' xxx'],                      // Salvage sign: a black wink and smile
  wmc: [' ddd', 'DpopD', 'wpppw'],        // Watermelon Chica: dark stripes, pink ring eyes, her bib
  hnd: ['', ' cc'],                       // Hand-unit: a glowing blue screen
  bpt: [' ggg', ' w w', 'ooooo'],         // Bounce pot: a green sprout, white eyes, an orange pot
  mun: [' b b'],                         // Munchie: blue eyes on a silver body
  ckf: [' ppp', 'ncccn', ' ppp'],        // Cookie Freddy: pink hat, chocolate ears, blue eyes, pink bow tie
  fen: ['', ' r r', '    o'],             // the Flamethrower endo: red eyes, an orange flame
  pbb: [' o o', ' g g'],                  // Plush babies: orange pigtails, green eyes
  bb: ['  r', ' b b', ' www'],            // BB: a red propeller, blue eyes, a white grin
  mgl: ['pp pp', ' y y', 'GGGGG'],        // Mangle: pink ears, yellow eyes, grey endo parts
  nbb: ['DDrDD', ' y y', ' www'],         // Nightmare BB: a dark beanie, yellow eyes, white teeth
  nsb: ['yyyyy', 'yyryy', ' c c'],        // the Nightmare staff bot: a yellow caution sign, a red !
  grw: ['dd dd', 'rr rr', 'GGGGG'],       // Grave weed: dark leaves, two pairs of red eyes, a grey tombstone
  fch: ['', ' pop', 'kkkkk'],             // Funtime Chica: pink eyes, an orange beak, gold price tags
  gfr: ['', ' w w', ' ccc'],              // Ghost Freddy: white eyes, a pale wisp
  rsb: ['', ' r r', 'vvkvv'],             // Rockstar Bonnie: red eyes, a purple guitar
  hlp: ['', ' r r', ' www'],              // Nightmare Helpy: red eyes, white teeth
  hpi: ['', ' ccc'],                      // H.E.L.P.I: the sum glows
  twf: ['', ' y y', ' www'],              // Twisted Wolf: yellow eyes, white teeth
  dbr: ['', ' g g', 'G   G'],             // Dreadbear: green eyes, grey bolts
  tfx: ['', ' y y', 'nnnnn'],             // Twisted Foxy: yellow eyes, brown earth
};
// One line of text as HTML, with the characters its accent mask marks wrapped in their color.
const accentText = (line, mask = '') => Array.from(line).map((ch, k) =>
  ACCENT[mask[k]] ? `<span class="${ACCENT[mask[k]]}">${esc(ch)}</span>` : esc(ch)).join('');
const iconLines = id => ICONS[id].map((line, i) => accentText(line, (ICON_ACCENTS[id] || [])[i]));
// The 3-line icon as HTML, in the character's color.
const iconHtml = (c, extra = '') => `<span class="icon c-${c.id}${extra}" title="${c.name}">${iconLines(c.id).join('\n')}</span>`;
// Just the face line (the middle one), for places with room for only one line.
const faceHtml = c => `<span class="face-mini c-${c.id}" title="${c.name}">${iconLines(c.id)[1]}</span>`;

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
  prize: String.raw`
   .--.   .---.   .--.
   |[]|   | ? |   |[]|    PRIZES!
   '--'   '---'   '--'

          .------------------.
          |  ~ music  box ~  |
          |                  |
          '------------------'
`,
  audit: String.raw`
  .--------------------------------.
  |  *  FUNTIME  AUDITORIUM  *     |
  '--------------------------------'
       ________________________
      |                        |
      |                        |
  ====|________________________|====
   .   .   .   .   .   .   .   .   .
 ------------------------------------`,
  parts: String.raw`
 .---. .---. .---.       [ ][ ][ ]
 |o o| |x x| |o -|       [ ][ ][ ]
 '---' '---' '---'       ---------
  heads on a shelf       spare parts



   __     ___      ####        __
  |__|   |___|     ####       |__|
 ------------------------------------`,
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
// Where the one of Trash and the Gang who is out stands: filling most of the picture, the same on every camera.
const TRASH_SPOT = [1, 1];

// ---------- the characters' drawings ----------
// Each one is a list of lines. `cam` is the small camera version, `door` fits a doorway,
// `office` is drawn in the office, and `scare` is the big jumpscare (shown at 2.2x size).
const art = s => s.split('\n').slice(1);   // same trick as ROOM_ART: drop the first empty line
const SPRITES = {
  fre: {
    // On the stage (CAM 1), and on the cameras on his way to a door.
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
    // One of the cupcakes she leaves in your office when she's shut out.
    cupcake: '{^}',
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
  nfr: {
    // A Freddle: a little bear plush with ears and a tiny top hat.
    freddle: art(String.raw`
 ,n,
(o^o)`),
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
  // Trash and the Gang (on request, "accurate to Trash and the Gang", minus Mr. Hugs, whom the owner has
  // plans for): four junk "animatronics" made of everyday things. One at a time stands right in front
  // of a camera, filling most of the picture. Their colors are added below the SPRITES list.
  trs: {
    // Bucket Bob: a silver bucket for a head with a scribbled face, a broomstick body, oven mitts.
    bob: art(String.raw`
         ___________
        |___________|
         \  @    @  /
          \  ~~~~  /
           \______/
               |
   [mm]========+========[mm]
               |
              / \ `),
    // Mr. Can-Do: a pinkish-red balloon with a smiley face, on a silver trash can, held up by two wooden bars.
    can: art(String.raw`
            .------.
           /  ^  ^  \
          |  \____/  |
           \        /
            '-.__.-'
    ||         )         ||
    ||  .=============.  ||
    ||==|  |  |  |  | |==||
        '-------------'`),
    // No. 1 Crate: a blue crate with big googly eyes, red foam hands, and a "#1" sign on wooden sticks.
    crate: art(String.raw`
                 .----.
                 | #1 |
                 '-||-'
       .-----------||---------.
  (\   |    (O)          (O)   |   /)
   \\  |                       |  //
    \\=|                       |=//
       |                       |
       '-----------------------'`),
    // Pan Stan: an iron skillet with a face drawn on it, broomsticks, ropes and two big nails (the x's).
    pan: art(String.raw`
          _________
         /  o   o  \____________
        |     __    |___________)
         \_________/
              |\
              | \
        --x---+---x--
              |
             / \ `),
  },
  lol: {
    face: art(String.raw`
   /\         /\
  /  \_______/  \
 |   (o)   (o)   |
 |       v       |
  \  \_______/  /
   '-----------'`),
  },
};

// ---------- accent colors ----------
// Most drawings get a second color on a few parts (eyes, hats, bow ties, beaks...).
// A MASK is a copy of a drawing's shape, attached as drawing.accent. Each letter in it colors the
// character in the same place in the drawing (the colors are the acc-... classes in style.css); a space
// leaves it in the character's main color. sprite() reads the mask, so the color shows wherever the
// drawing is used.
const ACCENT = {
  r: 'acc-red', o: 'acc-orange', y: 'acc-yellow', g: 'acc-green', b: 'acc-blue', v: 'acc-violet',
  p: 'acc-pink', k: 'acc-gold', c: 'acc-sky', x: 'acc-black', w: 'acc-white', G: 'acc-grey', n: 'acc-brown', D: 'acc-dark', d: 'acc-dkgreen',
};
// Freddy: black top hat and bow tie, blue eyes.
SPRITES.fre.scare.accent = art(String.raw`
        xxxxxxx
       xxxxxxxxx
     xxxxxxxxxxxxx



         b   b





          xxx`);
SPRITES.fre.cam.accent = [' xxx', ' b b', ' xxx'];
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
SPRITES.chi.cam.accent = ['', ' vov'];
// In a dark doorway only their eyes show: [row, column] of each eye inside the door drawing, plus the
// accent letter for the eyes' color. The flashlight shows the whole drawing.
SPRITES.bon.door.eyes = { at: [[4, 2], [4, 5]], color: 'p' };
SPRITES.chi.door.eyes = { at: [[2, 2], [2, 6]], color: 'v' };
// Toy Bonnie: green eyes, rosy cheeks, red bow tie.
SPRITES.tbn.scare.accent = art(String.raw`




        g     g
      r         r



         rrr`);
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
// The Puppet: purple tear stripes, red cheeks and red lips.
SPRITES.pup.scare.accent = art(String.raw`



         v     v
        rrr   rrr

          rrrrr
          rrrrr`);
SPRITES.pup.peek.accent = ['  r  r'];
// Nightmare Freddy: orange eyes. A Freddle: a black top hat, white eyes.
SPRITES.nfr.scare.accent = art(String.raw`



         o       o`);
SPRITES.nfr.freddle.accent = ['  x', ' w w'];
// The Trash gang: yellow eyes.
// Trash and the Gang. Their main color is the brown of the wooden sticks; tintBox (below) adds the rest.
tintBox(SPRITES.trs.bob, 0, 4, 0, 99, 'G');                  // Bucket Bob's silver bucket...
tintBox(SPRITES.trs.bob, 0, 4, 0, 99, 'x', '@~');            // ...with a scribbled black face
tintBox(SPRITES.trs.bob, 6, 6, 0, 99, 'r', 'm[]');           // red oven mitts
tintBox(SPRITES.trs.can, 0, 4, 0, 99, 'r');                  // Mr. Can-Do's pinkish-red balloon...
tintBox(SPRITES.trs.can, 1, 2, 0, 99, 'x', '^\\_/');         // ...with a smiley face drawn on it
tintBox(SPRITES.trs.can, 6, 8, 8, 22, 'G');                  // the silver trash can
tintBox(SPRITES.trs.crate, 3, 8, 7, 31, 'b');                // No. 1 Crate's blue crate...
tintBox(SPRITES.trs.crate, 4, 4, 0, 99, 'w', 'O');           // ...big googly eyes...
tintBox(SPRITES.trs.crate, 4, 6, 0, 6, 'r');                 // ...red foam hands
tintBox(SPRITES.trs.crate, 4, 6, 32, 99, 'r');
tintBox(SPRITES.trs.crate, 0, 2, 17, 22, 'y');               // the #1 sign
tintBox(SPRITES.trs.pan, 0, 3, 8, 19, 'G');                  // Pan Stan's iron skillet...
tintBox(SPRITES.trs.pan, 1, 2, 8, 19, 'w', 'o_');            // ...with a face drawn on it
tintBox(SPRITES.trs.pan, 6, 6, 0, 99, 'G', 'x');             // the nails
// tintBox(drawing, r1, r2, c1, c2, color, only): color the characters in rows r1 to r2 and columns c1 to
// c2 of a drawing with the ACCENT color `color` (only the characters in `only`, if given), on top of the
// accent mask it already has. Spaces are never colored. (A "function" like this one can be used above
// the line where it's written: the browser reads all of them before running the file.)
function tintBox(lines, r1, r2, c1, c2, color, only = null) {
  const mask = lines.accent || [];
  lines.accent = lines.map((line, r) => Array.from(line).map((ch, c) => {
    const hit = r >= r1 && r <= r2 && c >= c1 && c <= c2 && ch !== ' ' && (!only || only.includes(ch));
    return hit ? color : ((mask[r] || '')[c] || ' ');
  }).join(''));
  return lines;
}

// ---------- the office ----------
// The middle of the office: 44 wide and 16 tall. A window on each side (next to each door), a poster
// and the vent opening on the wall, the desk with the monitor and the fan, and the floor.
// Everything else is drawn on top by render.js.
const OFFICE_ART = art(String.raw`
____________________________________________
.------.  .--------.   .--------.   .------.
|      |  | DRAFT  |   |========|   |      |
|      |  | NIGHT! |   |========|   |      |
|      |  '--------'   '--------'   |      |
'------'                            '------'
               .-------------.
               | .---------. |
               | |         | |
               | '---------' |
  _____________'-------------'_____________
 |                                         |
 |_________________________________________|
   ||                                   ||
. . . . . . . . . . . . . . . . . . . . . .
 . . . . . . . . . . . . . . . . . . . . . .`);
const OFFICE_W = 44, OFFICE_H = 16;

// Where things go in the office, as [row, column] of their top-left corner.
const WINDOWS = { L: [2, 1], R: [2, 37] };   // the inside of each window: 6 wide, 3 tall
const VENT_SPOT = [1, 23];         // the vent opening on the wall: 10 wide, 4 tall
const SCREEN_SPOT = [8, 18];       // the monitor's screen: 9 characters wide
const FAN_SPOT = [7, 3];           // the desk fan, on the left of the desk
const TBONNIE_SPOT = [3, 9];       // Toy Bonnie, on the left, in front of the poster
const TCHICA_SPOT = [3, 31];       // Toy Chica, on the right, under the vent
// The three places a Freddle can sit: left of the monitor, right of it, and in front of the desk.
const FREDDLE_SPOTS = [[8, 9], [8, 31], [11, 20]];
// Where Chica's cupcakes can be (each is 3 wide, 1 tall). A few are picked each time.
const CUPCAKE_SPOTS = [[5, 10], [7, 40], [7, 12], [9, 34], [11, 5], [11, 37], [12, 14], [13, 22],
  [14, 7], [15, 30], [9, 1], [5, 24], [13, 32], [6, 2]];

// The desk fan: still when it's off, its blades turning (two pictures taking turns) when it's on.
const FAN_ART = [' .-.', '(-+-)', ' /_\\'];
const FAN_SPIN = ['(-+-)', '(\\|/)'];

// ---------- the office, painted by your lineup ----------
// The office starts out plain grey. Every character you take paints one more of these parts in the
// color of its rarity (on request: "the more characters added the more the office would be colored by
// the rarity of the character"), in this order. Each part is a list of rectangles in the office picture,
// [first row, last row, first column, last column], or `door` for the frame of a door.
const OFFICE_PARTS = [
  { name: 'poster', rects: [[1, 4, 10, 19]] },
  { name: 'monitor', rects: [[6, 9, 15, 29]] },
  { name: 'left door', door: 'L' },
  { name: 'right door', door: 'R' },
  { name: 'vent', rects: [[1, 4, 23, 32]] },
  { name: 'front of the desk', rects: [[11, 12, 0, 43]] },
  { name: 'left window', rects: [[1, 5, 0, 7]] },
  { name: 'right window', rects: [[1, 5, 36, 43]] },
  { name: 'floor', rects: [[14, 15, 0, 43]] },
  { name: 'desk top and legs', rects: [[10, 10, 0, 43], [13, 13, 0, 43]] },
  { name: 'ceiling', rects: [[0, 0, 0, 43]] },
];
// Paint the parts of grid g that `paints` gives a color: paints[i] is the rarity class (like 'r-epic')
// for OFFICE_PARTS[i], or nothing. Only the lines of the drawing are painted: not the spaces, the window
// glass, the vent's grate (they stay dim, set back) or the fan.
function paintOffice(g, paints) {
  OFFICE_PARTS.forEach((part, i) => {
    if (!paints[i] || !part.rects) return;
    for (const [r1, r2, c1, c2] of part.rects) {
      for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) {
        const cell = g[r][c];
        if (cell.ch !== ' ' && !cell.cls) cell.cls = paints[i] + ' paint';
      }
    }
  });
}

// Paint a whole camera picture in one rarity color (`cls`, like 'r-epic'): every line of the room and
// its frame that has no color yet. The characters are drawn on top afterwards, so they keep theirs.
function paintRoom(g, cls) {
  if (!cls) return;
  for (const row of g) for (const cell of row) if (cell.ch !== ' ' && !cell.cls) cell.cls = cls + ' paint';
}

// The office for this moment, as a grid (without the visitors: render.js adds those). `paints` says
// which parts your lineup has painted (see paintOffice above).
function officeGrid(fanOn, now, paints = []) {
  const g = grid(OFFICE_ART, OFFICE_W);
  // The vent's grate and the window glass in a dim color, so they look set back into the wall.
  for (let r = VENT_SPOT[0] + 1; r <= VENT_SPOT[0] + 2; r++) {
    for (let c = VENT_SPOT[1] + 1; c <= VENT_SPOT[1] + 8; c++) g[r][c].cls = 'dim';
  }
  for (const [r0, c0] of Object.values(WINDOWS)) {
    for (let r = r0; r < r0 + 3; r++) for (let c = c0; c < c0 + 6; c++) g[r][c] = { ch: r === r0 + 1 && (c - c0) % 3 === 2 ? '/' : ' ', cls: 'glass' };
  }
  const fan = FAN_ART.slice();
  if (fanOn) fan[1] = FAN_SPIN[Math.floor(now / 120) % 2];
  sprite(g, FAN_SPOT[0], FAN_SPOT[1], fan, fanOn ? 'fan on' : 'fan');
  paintOffice(g, paints);
  return g;
}

// The game over picture when the heat makes you pass out: a dizzy face, no jumpscare.
const PASSED_OUT = art(String.raw`
     z    Z     z
      _________
     /         \
    |  x     x  |
    |     o     |
    |   ~~~~~   |
     \_________/`);

// =====================================================================
// The uncommon, rare, epic and legendary characters' drawings.
// (Foxy, Golden Freddy, Toy Freddy, Shadow Bonnie and Springtrap look like they do in ASCII FNAF: Line 1;
// Nightmare Bonnie, Nightmare Chica, Circus Baby, the Funtimes and Nightmare Fredbear like in Line 2;
// Bonnet, Withered Bonnie, Withered Foxy and Plushtrap like in ASCII Nights.)
// =====================================================================

// eyes(drawing, color): give a drawing an accent mask that colors only its eyes (every @, O and *
// in it, or the characters in `chars`) in the ACCENT color `color`. Returns the drawing.
function eyes(lines, color, chars = '@O*') {
  lines.accent = lines.map(line => Array.from(line).map(ch => chars.includes(ch) ? color : ' ').join(''));
  return lines;
}
// Where the eyes are in a doorway drawing (for the dark doorway, where only the eyes show): every
// cell its accent mask marks.
const eyeSpots = lines => lines.accent.flatMap((m, r) => Array.from(m).flatMap((ch, c) => ch !== ' ' ? [[r, c]] : []));

// ----- Foxy -----
SPRITES.fox = {
  peek: art(String.raw`
 /\
(o|
 \|`),
  half: art(String.raw`
  /\_/\
 (o  o )
 |  ^  |
 |/\/\/|`),
  run: art(String.raw`
 /\_/\
(o  o)>
 /|  |\ `),
  scare: art(String.raw`
   /\               /\
  /  \_____________/  \
  |                   |
  |   ( o )   ( o )   |
  |         /\        |
  |   |\/\/\/\/\/\|   |
   \  |/\/\/\/\/\/|  /
J__ \_____________/`),
};
SPRITES.fox.scare.accent = art(String.raw`



        y       y

       kkkkkkkkkkk
       kkkkkkkkkkk`);
SPRITES.fox.peek.accent = ['', ' y'];
SPRITES.fox.half.accent = ['', '  y  y'];
SPRITES.fox.run.accent = ['', ' y  y'];

// ----- Golden Freddy -----
SPRITES.gol = {
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
  // Freddy's jumpscare with his O eyes swapped for dots.
  scare: SPRITES.fre.scare.map(line => line.replace(/O/g, '.')),
};
SPRITES.gol.scare.accent = SPRITES.fre.scare.accent.map(line => line.replace(/b/g, ' '));
SPRITES.gol.office.accent = art(String.raw`
      xxx
    xxxxxxx





      xxx`);

// ----- Toy Freddy -----
SPRITES.tfr = {
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
};
SPRITES.tfr.office.accent = art(String.raw`
      xxx
    xxxxxxx

    b     b
   r       r



      xxx`);

// ----- Nightmare Bonnie: in a doorway (only his eyes show in the dark) -----
SPRITES.nbn = {
  door: eyes(art(String.raw`
 /\  /\
|  \/  |
|@    @|
| VVVV |
| |  | |
| AAAA |
 \____/
 /|  |\ `), 'p'),
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
       \_____________________/`), 'p'),
};

// ----- Bonnet -----
SPRITES.bnt = {
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
};
SPRITES.bnt.office.accent = ['', ' g g'];
SPRITES.bnt.scare.accent = ['', '', '', '   g     g'];

// ----- Withered Bonnie -----
SPRITES.wbn = {
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
};
SPRITES.wbn.office.accent = ['', '', '', '', '   r'];
SPRITES.wbn.scare.accent = ['', '', '', '', '', '', '         r'];

// ----- Withered Foxy -----
SPRITES.wfx = {
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
J \__/`),
  // (The eyepatch is over his RIGHT eye and the hook on his RIGHT hand: your left as you face him.)
  scare: art(String.raw`
   /\               /\
  /  \_____________/  \
  |                   |
  |   ####     ( o )  |
  |   ####            |
  |         /\        |
  |   |\/\/\/\/\/\|   |
   \  |/\/\/\/\/\/|  /
J__ \_____________/`),
};
SPRITES.wfx.run.accent = ['', '    y'];
SPRITES.wfx.door.accent = ['', '', '     y'];
SPRITES.wfx.scare.accent = ['', '', '', '               y'];

// ----- Springtrap -----
SPRITES.spr = {
  cam: art(String.raw`
 |\ |
(o#o)
 |W| `),
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
};
SPRITES.spr.cam.accent = ['', ' w w'];
SPRITES.spr.scare.accent = ['', '', '', '', '        w', '              w'];

// ----- Nightmare Chica -----
SPRITES.nch = {
  // Her cupcake, hidden on a camera. It's small and dim on purpose: you have to look for it.
  cupcake: '{,}',
  // Standing in your office, waiting, while you search the cameras for her cupcake (on request).
  office: eyes(art(String.raw`
  \ | /
 .-----.
/ @   @ \
| /VVV\ |
| \AAA/ |
 \_____/
|LET'S  |
| EAT!! |`), 'r'),
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
};

// ----- Circus Baby -----
SPRITES.bab = {
  cam: eyes(art(String.raw`
@@ _ @@
 (* *)
 \ - /
 /|=|\ `), 'g', '*'),
  scare: eyes(art(String.raw`
     @@@@                     @@@@
    @@@@@@     _________     @@@@@@
     @@@@    /           \    @@@@
            |   *     *   |
            |       .     |
            |    \_____/  |
             \___________/
               |=======|
              /|   o   |\ `), 'g', '*'),
};
// Her pigtails (drawn with @) are red-orange: add them to the eye mask.
for (const d of [SPRITES.bab.cam, SPRITES.bab.scare]) {
  d.accent = d.accent.map((m, i) => Array.from(m).map((ch, k) => d[i][k] === '@' ? 'o' : ch).join(''));
}

// ----- Shadow Bonnie -----
// A black Toy Bonnie with white eyes and teeth. In the dark office only his eyes show.
SPRITES.sbn = { eyes: 'O O', scare: SPRITES.tbn.scare.slice() };
SPRITES.sbn.scare.accent = art(String.raw`




        w     w
           w
        wwwwwww


         www`);

// ----- Plushtrap -----
SPRITES.plu = {
  office: art(String.raw`
(\/)
(oo)`),
  scare: art(String.raw`
    (\      /)
     \\    //
    .-'----'-.
   /  O    O  \
  |     /\     |
  |   \VVVV/   |
   '----------'`),
};
SPRITES.plu.office.accent = ['', ' ww'];
eyes(SPRITES.plu.scare, 'w', 'OV');

// ----- Funtime Freddy (with Bon-Bon on his hand) -----
SPRITES.ffr = {
  cam: art(String.raw`
 [___]   ^
(o ^ o) (o)
 \___/__/
  >=<`),
  scare: art(String.raw`
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
            >=<`),
};
SPRITES.ffr.cam.accent = [' ppppp   b', ' b   b  bbb', '      bbb', '  ppp'];
eyes(SPRITES.ffr.scare, 'b', '@');

// ----- Withered Freddy -----
SPRITES.wfr = {
  // Passing a window: his head and shoulders (6 wide, 3 tall, the size of the window).
  window: art(String.raw`
 [__]
(O^.)
/>#<\ `),
  // Trying to get in at a door. In the dark doorway only his eyes show.
  door: art(String.raw`
  ___
 |___|
/O  .\
|  ^ |
||vvv|
 \_#_/
 /| |\ `),
  scare: SPRITES.fre.scare.map(line => line.replace('O   O', 'O   .').replace('|vvv|', '|v#v|')),
};
SPRITES.wfr.window.accent = [' xxxx', ' b', '  GGG'];
SPRITES.wfr.door.accent = ['  xxx', ' xxxxx', ' b  b'];
SPRITES.wfr.door.eyes = { at: [[2, 1], [2, 4]], color: 'b' };
SPRITES.wfr.scare.accent = SPRITES.fre.scare.accent.slice();

// ----- Funtime Foxy -----
SPRITES.ffx = {
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
};

// ----- Nightmare Fredbear -----
SPRITES.nfb = {
  window: art(String.raw`
 [_]
(@^@)
>VVV<`),
  door: eyes(art(String.raw`
  ___
 |___|
/@  @\
| ^^ |
|VVVV|
|AAAA|
 \__/ `), 'w'),
  // Walking into your office (his harder Toy Freddy attack).
  office: eyes(art(String.raw`
     _____
    |     |
  __|_____|__
 /  @     @  \
 |     ^     |
 | VVVVVVVVV |
 | |       | |
 | AAAAAAAAA |
  \___>=<___/`), 'w'),
  // His little plush (his harder Plushtrap attack).
  plush: art(String.raw`
[_]
(@@)`),
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
};
SPRITES.nfb.window.accent = [' vvv', ' w w', 'vwwwv'];
SPRITES.nfb.plush.accent = ['vvv', ' ww'];

// The doorway visitors' dark-doorway eyes (for inDoorway in render.js).
SPRITES.nbn.door.eyes = { at: eyeSpots(SPRITES.nbn.door), color: 'p' };
SPRITES.nfb.door.eyes = { at: eyeSpots(SPRITES.nfb.door), color: 'w' };

// ---------- where they go ----------
// On the cameras ([row, column] in the framed 40 x 11 picture, like FREDDY_SLOTS above).
const SPRING_SLOTS = { parts: [5, 24], dining: [6, 1], ehall: [5, 6] };
const BABY_SLOTS = { audit: [4, 16], dining: [6, 31], whall: [4, 25] };
const FFR_SLOTS = { L: [4, 4], R: [4, 26] };   // Funtime Freddy on the left or right of the auditorium
// Nightmare Chica's hiding places for her cupcake, a few on every camera, tucked into the picture.
const NCHICA_SPOTS = {
  stage: [[7, 34], [2, 3], [8, 18]],
  dining: [[4, 8], [8, 20], [2, 24]],
  cove: [[9, 20], [1, 3], [5, 33]],
  whall: [[8, 10], [3, 30], [6, 2]],
  ehall: [[8, 30], [5, 13], [3, 3]],
  prize: [[2, 25], [4, 30], [9, 4]],
  audit: [[8, 12], [5, 34], [2, 36]],
  parts: [[2, 8], [8, 18], [3, 28]],
  yardL: [[9, 4], [9, 33], [2, 3]],
  yardR: [[9, 4], [9, 33], [2, 34]],
};

// In the office ([row, column] in the 44 x 16 office picture).
const GOLDEN_SPOT = [3, 15];       // Golden Freddy, slumped in front of the monitor (exactly as wide as it)
const TFREDDY_SPOT = [2, 15];      // Toy Freddy, leaning over the desk
const WBONNIE_SPOT = [6, 1];       // Withered Bonnie, on the left of the desk
const NCHICA_OFFICE_SPOT = [6, 33]; // Nightmare Chica, on the right of the desk, while you search
const NFB_OFFICE_SPOT = [3, 16];   // Nightmare Fredbear, over the desk
const BONNET_ROWS = [12.5, 14];    // Bonnet runs along the floor, between these rows
// Where Plushtrap (and Fredbear's little plush) can hide (4 wide, 2 tall).
const PLUSH_SPOTS = [[6, 11], [4, 33], [12, 6], [12, 34], [13, 19], [7, 37], [1, 21]];
// Where Shadow Bonnie's eyes can be (never over the vent). [row, column] of the left eye.
const SHADOW_EYES = [[2, 12], [5, 6], [6, 38], [8, 20], [11, 5], [11, 36], [12, 18], [14, 9], [14, 30], [3, 39]];

// =====================================================================
// The BONUS characters' drawings (the owner's second list).
// =====================================================================

// ----- Salvage sign: pops up on the camera when you try to shock. Redrawn on request, 2026-11-25, from
// the official picture the owner shared: a round wooden face on a post, winking (- for the shut eye, O for
// the open one) with a wide smile, over a wooden plaque. The wood is its own color (c-slv), with darker
// grain (~). render.js writes on the plaque how many more presses it needs. -----
SPRITES.slv = {
  sign: art(String.raw`
      .--------.
    .'  --   O  '.
    |  \______/  |
    '. ~      ~ .'
      '--------'
          ||
.--------------------.
|                    |
'--------------------'`),
};
tintBox(SPRITES.slv.sign, 1, 2, 0, 99, 'x', '-O\\_/');   // the wink and the smile
tintBox(SPRITES.slv.sign, 3, 3, 0, 99, 'n', '~');        // the wood grain

// ----- Watermelon Chica. Redrawn on request, 2026-11-25, from the official picture the owner shared:
// Chica as a watermelon, rind green (her own color, c-wmc) with dark green stripes, pink ring eyes in dark
// sockets, a pink-red open mouth and her LET'S EAT bib in pink. In a doorway only her eyes show in the
// dark. Her head is filled with rind (:), and stripes() paints every other 2-column band of it dark
// green, so the light and dark stripes run down her head like a watermelon's. -----
function stripes(lines, r1, r2, color) {
  for (let c = 1; c < 60; c += 4) tintBox(lines, r1, r2, c, c + 1, color);
  return lines;
}
SPRITES.wmc = {
  door: art(String.raw`
   \ | /
  .-----.
 /(O):(O)\
 |::/\:::|
 |::\/:::|
  \:::::/
 |LET'S |
 | EAT!!|`),
  // Chica's jumpscare shape, with ring eyes and a rind-filled head.
  scare: art(String.raw`
       \ | /
     .-------.
    /:(O):(O):\
   |::::/\:::::|
   |::::\/:::::|
    \::_____::/
     '-------'
   |LET'S EAT!!!|
   '------------'`),
};
// For each drawing: [the drawing, its eye row, its mouth rows, its bib rows, its bib's lettered rows].
for (const [d, eyeRow, mouth, bib, letters] of [
  [SPRITES.wmc.door, 2, [3, 4], [6, 7], [6, 7]],
  [SPRITES.wmc.scare, 2, [3, 4], [7, 8], [7, 7]],
]) {
  stripes(d, 0, mouth[1] + 1, 'd');                    // the rind's dark stripes
  tintBox(d, eyeRow, eyeRow, 0, 99, 'D', '()');        // dark eye sockets...
  tintBox(d, eyeRow, eyeRow, 0, 99, 'p', 'O');         // ...with pink ring eyes
  tintBox(d, mouth[0], mouth[1], 0, 99, 'r', '/\\');  // the open mouth
  tintBox(d, bib[0], bib[1], 0, 99, 'w');              // the white bib...
  tintBox(d, letters[0], letters[1], 0, 99, 'p', "LETSA!'");   // ...with pink letters
}
SPRITES.wmc.door.eyes = { at: [[2, 3], [2, 7]], color: 'p' };

// ----- Hand-unit: no body, like in Sister Location (redrawn on request, 2026-11-25, "more accurate").
// There HandUnit is a voice and a computer system, and the one thing you SEE of him is the elevator
// keypad where you type your name (and he fills in a name of his own). So here he's that keypad: a
// screen with his name and a name field on top, rows of letter keys below. render.js types into the
// name field as you mash (HAND_NAME), and the screen glitches once you're halfway. -----
SPRITES.hnd = {
  office: art(String.raw`
.----------------.
| HANDUNIT       |
| >              |
|----------------|
| [A][B][C][D][E]|
| [F][G][H][I][J]|
| [K][L][M][N][O]|
'----------------'`),
  scare: art(String.raw`
.------------------------------.
|  HANDUNIT                    |
|                              |
|  NAME: EGGS BENEDICT         |
|                              |
|  YOUR SHIFT IS OVER.         |
|------------------------------|
| [A][B][C][D][E][F][G][H][I]  |
| [J][K][L][M][N][O][P][Q][R]  |
| [S][T][U][V][W][X][Y][Z][<]  |
'------------------------------'`),
};
// The screen glows sky blue; the frame and the keys keep Hand-unit's steel color.
tintBox(SPRITES.hnd.office, 1, 2, 1, 16, 'c');
tintBox(SPRITES.hnd.scare, 1, 5, 1, 30, 'c');

// ----- Bounce pot (drawn over the whole view). Redrawn on request, 2026-11-25, from the official
// picture the owner shared: a round yellow-green head (its own color, c-bpt) with a two-leaf sprout, big
// white eyes and an open grin, on a coiled green spring with curly tendril arms (~), sitting in an orange
// clay pot. Two flies (`) buzz around his head. -----
SPRITES.bpt = {
  pot: art(String.raw`
    \v/
 ${'`'} (O o) ${'`'}
   (\_/)
  ~ )@( ~
   [===]
    \_/`),
};
tintBox(SPRITES.bpt.pot, 0, 0, 0, 99, 'g');          // the sprout
tintBox(SPRITES.bpt.pot, 1, 1, 0, 99, 'G', '`');     // the flies
tintBox(SPRITES.bpt.pot, 1, 1, 0, 99, 'w', 'Oo');    // the eyes
tintBox(SPRITES.bpt.pot, 2, 2, 0, 99, 'w', '\\_/');  // the grin
tintBox(SPRITES.bpt.pot, 3, 3, 0, 99, 'g');          // the spring and the tendrils
tintBox(SPRITES.bpt.pot, 4, 5, 0, 99, 'o');          // the clay pot
// Charging up a bounce on the floor (render.js shows these in turn, and shakes him): first the spring
// squeezes (=@=), then he crouches right down into the pot with his eyes screwed shut (> <). The
// crouch keeps the same height, with an empty top row, so the pot stays on the floor.
SPRITES.bpt.squash = art(String.raw`
    \v/
 ${'`'} (O o) ${'`'}
   (\_/)
  ~ =@= ~
   [===]
    \_/`);
SPRITES.bpt.crouch = art(String.raw`

    \v/
 ${'`'} (> <) ${'`'}
  ~(\_/)~
   [===]
    \_/`);
SPRITES.bpt.squash.accent = SPRITES.bpt.pot.accent;   // the same colors as standing
tintBox(SPRITES.bpt.crouch, 1, 1, 0, 99, 'g');           // the sprout
tintBox(SPRITES.bpt.crouch, 2, 2, 0, 99, 'G', '`');      // the flies
tintBox(SPRITES.bpt.crouch, 2, 2, 0, 99, 'w', '><');     // the shut eyes
tintBox(SPRITES.bpt.crouch, 3, 3, 0, 99, 'g', '~');      // the tendrils
tintBox(SPRITES.bpt.crouch, 3, 3, 0, 99, 'w', '\\_/');   // the grin
tintBox(SPRITES.bpt.crouch, 4, 5, 0, 99, 'o');           // the clay pot

// ----- Munchie: a set of chattering teeth (redrawn on request, 2026-11-25, from the official design the
// owner shared, then again to match it more closely). Two big eyes sit at the back: heavy black lids (#)
// over the top half and blue irises (@) looking down. Under them: a long upper jaw with big triangle teeth
// hanging down, two slanted posts (/ /) holding it up, and a lower jaw with big teeth pointing up. The
// whole body is SILVER (its own color, c-mun): the owner pointed out that the pink and tan in the official
// picture are only the lighting. On your screen it's seen from the side, mouth open to the left; the
// jumpscare is head on, mouth wide open at you.
SPRITES.mun = {
  grab: art(String.raw`
              _____  _____
             /#####\/#####\
             |(@)  ||(@)  |
 ____________\_____/\_____/
 \  /\  /\  /\  /\  /\    |
  \/  \/  \/  \/  \/  \___|
                      /  /
                     /  /
  /\  /\  /\  /\    /  /
 /  \/  \/  \/  \__/__/
 \____________________/`),
  scare: art(String.raw`
     _________     _________
    /#########\   /#########\
    |  (@)    |   |  (@)    |
     \_______/     \_______/
  ______________________________
  \   /\   /\   /\   /\   /\   /
   \ /  \ /  \ /  \ /  \ /  \ /
    V    V    V    V    V    V
      |                    |
      |                    |
    A    A    A    A    A    A
   / \  / \  / \  / \  / \  / \
  /   \/   \/   \/   \/   \/   \
  \____________________________/`),
};
// Dark lids (a white outline filled with dark #) and white eyes with blue irises. The silver body is
// Munchie's own color, so it needs no tint.
tintBox(SPRITES.mun.grab, 0, 1, 0, 99, 'w');
tintBox(SPRITES.mun.grab, 1, 1, 0, 99, 'D', '#');
tintBox(SPRITES.mun.grab, 2, 3, 13, 99, 'w');
tintBox(SPRITES.mun.grab, 2, 2, 0, 99, 'b', '@');
tintBox(SPRITES.mun.scare, 0, 1, 0, 99, 'w');
tintBox(SPRITES.mun.scare, 1, 1, 0, 99, 'D', '#');
tintBox(SPRITES.mun.scare, 2, 3, 0, 99, 'w');
tintBox(SPRITES.mun.scare, 2, 2, 0, 99, 'b', '@');

// ----- Cookie Freddy: Freddy dipped in chocolate (redrawn on request, 2026-11-25, from the official
// design the owner shared). A cookie-colored bear whose head and ears are coated in dripping chocolate
// (the ' marks) with rainbow sprinkles (:), a pink top hat and bow tie, blue eye rings, a teal nose and
// rainbow teeth. -----
SPRITES.ckf = {
  office: art(String.raw`
     ___
    |   |
 () |___| ()
  /'':'':''\
 |'(o) (o)'|
 |   ,v,   |
 |  [iii]  |
  \_______/
     >o<`),
  scare: art(String.raw`
             _______
            |       |
            |       |
  .--.    __|_______|__    .--.
 ( () )/''':''':''':''':'\( () )
  '--' |' :' '  '  ' :' '| '--'
       |   ~~~     ~~~   |
       |   (O)     (O)   |
       |       ,v,       |
       |    [iiiiiii]    |
        \    '-----'    /
         '-.___>o<___.-'`),
};
// The office one: pink hat, chocolate ears and coating, sprinkles, blue eye rings with pink middles, a
// teal nose, rainbow teeth and a pink bow tie. tintBox colors a box of rows and columns (see above).
tintBox(SPRITES.ckf.office, 0, 2, 4, 8, 'p');
tintBox(SPRITES.ckf.office, 2, 2, 0, 3, 'n');
tintBox(SPRITES.ckf.office, 2, 2, 9, 99, 'n');
tintBox(SPRITES.ckf.office, 3, 3, 0, 99, 'n');
tintBox(SPRITES.ckf.office, 3, 3, 5, 5, 'y');
tintBox(SPRITES.ckf.office, 3, 3, 8, 8, 'c');
tintBox(SPRITES.ckf.office, 4, 4, 0, 99, 'n', "'");
tintBox(SPRITES.ckf.office, 4, 4, 0, 99, 'c', '()');
tintBox(SPRITES.ckf.office, 4, 4, 0, 99, 'p', 'o');
tintBox(SPRITES.ckf.office, 5, 5, 0, 99, 'c', 'v');
['r', 'y', 'g'].forEach((color, i) => tintBox(SPRITES.ckf.office, 6, 6, 5 + i, 5 + i, color));
tintBox(SPRITES.ckf.office, 8, 8, 0, 99, 'p');
// The jumpscare one, colored the same way.
tintBox(SPRITES.ckf.scare, 0, 3, 10, 22, 'p');
tintBox(SPRITES.ckf.scare, 3, 5, 0, 6, 'n');
tintBox(SPRITES.ckf.scare, 3, 5, 26, 99, 'n');
tintBox(SPRITES.ckf.scare, 4, 5, 7, 25, 'n', "'/\\");
[[4, 11, 'y'], [4, 15, 'c'], [4, 19, 'r'], [4, 23, 'g'], [5, 10, 'o'], [5, 21, 'v']]
  .forEach(([r, c, color]) => tintBox(SPRITES.ckf.scare, r, r, c, c, color));
tintBox(SPRITES.ckf.scare, 6, 6, 0, 99, 'o', '~');
tintBox(SPRITES.ckf.scare, 7, 7, 0, 99, 'c', '()');
tintBox(SPRITES.ckf.scare, 7, 7, 0, 99, 'p', 'O');
tintBox(SPRITES.ckf.scare, 8, 8, 0, 99, 'c', 'v');
['r', 'o', 'y', 'g', 'c', 'b', 'v'].forEach((color, i) => tintBox(SPRITES.ckf.scare, 9, 9, 13 + i, 13 + i, color));
tintBox(SPRITES.ckf.scare, 11, 11, 0, 99, 'p', '>o<');

// ----- the Flamethrower endo -----
SPRITES.fen = {
  office: art(String.raw`
   .-.
  [o o]
  /|=|\===>
   | |
  _/ \_`),
  scare: art(String.raw`
        .-----.
       [ O   O ]
        | VVV |
        '-----'
     ___/|===|\________
    |    |   |   ======>~~~~
         |   |
        _/   \_`),
};
tintBox(SPRITES.fen.office, 1, 1, 0, 99, 'r', 'o');
tintBox(SPRITES.fen.scare, 1, 1, 0, 99, 'r', 'O');
tintBox(SPRITES.fen.scare, 4, 4, 23, 99, 'o');
// His flames along the office floor: two pictures that take turns, so they flicker.
const FLAME_ROWS = [
  ['^  ^^  ^ ^^  ^  ^^ ^  ^^  ^ ^^ ^  ^^  ^ ^^ ', ' ^^ ^  ^^ ^  ^^  ^ ^^  ^ ^^ ^ ^^  ^ ^^  ^ ^'],
  ['~^~~^^~^~~^~^^~~^~^~~^^~~^~^~~^^~^~~^~^^~~^', '^~~^~~^^~^~^~~^^~~^~^^~~^~~^~^^~~^~~^~^~~^~'],
];

// ----- Plush babies: little Circus Baby plushes -----
SPRITES.pbb = {
  // In a window or a doorway.
  small: art(String.raw`
 @_@
(*.*)
 | |`),
  // Climbed onto your screen: a big one hiding a top corner of the view.
  corner: art(String.raw`
 @@@   ___   @@@
@@@@ /     \ @@@@
 @@ |  * *  | @@
    |   o   |
     \_____/
     /|===|\ `),
  scare: art(String.raw`
     @@@@                     @@@@
    @@@@@@     _________     @@@@@@
     @@@@    /           \    @@@@
            |   *     *   |
            |      o      |
            |    \___/    |
             \___________/
              /|=======|\ `),
};
for (const d of [SPRITES.pbb.small, SPRITES.pbb.corner, SPRITES.pbb.scare]) {
  tintBox(d, 0, 99, 0, 99, 'o', '@');
  tintBox(d, 0, 99, 0, 99, 'g', '*');
  tintBox(d, 0, 99, 0, 99, 'r', 'o');
}

// ---------- where the bonus characters go ----------
// The ingredient jars on the shelf at the BACK of the office (for Cookie Freddy; see BACK_ART): [first row,
// last row, first column, last column] of each in the back picture. A click anywhere on a jar takes that
// ingredient. (Until update 3.0 they were on a kitchen camera, CAM 9.)
const KITCHEN_JARS = {
  CHOCOLATE: [1, 3, 10, 20], SPRINKLES: [1, 3, 23, 33],
  FROSTING: [4, 6, 10, 20], CARAMEL: [4, 6, 23, 33],
};
const HAND_SPOT = [6, 13];        // Hand-unit's keypad, in front of the desk
// What Hand-unit types into his name field as you mash: one more letter per press, whatever keys you hit
// (in Sister Location he fills in a name for you, too).
const HAND_NAME = 'EGGS BENEDICT';
const COOKIE_SPOT = [6, 1];       // Cookie Freddy, on the left of the desk
const ENDO_SPOT = [8, 33];        // the Flamethrower endo, on the right
const SALVAGE_SPOT = [1, 9];      // the Salvage sign, on the camera picture (its plaque is 7 rows down)

// =====================================================================
// The third list (2026-11-25): BB, Mangle, Nightmare BB, the Nightmare staff bot and Grave weed.
// =====================================================================

// ----- BB: Balloon Boy, in your office after climbing out of the vent. A striped propeller beanie, a big
// grin, and his balloon on a string. -----
SPRITES.bb = {
  office: art(String.raw`
  _^_
 [===]   O
( o o )  |
( \_/ )--'
 /| |\ `),
  scare: art(String.raw`
          _^_
        [=====]
       (  O O  )
       ( \___/ )         O
        \_____/          |
        /|   |\ _________'
       HELLO! `),
};
for (const d of [SPRITES.bb.office, SPRITES.bb.scare]) {
  tintBox(d, 0, 1, 0, 99, 'r', '_^');      // the propeller
  tintBox(d, 0, 1, 0, 99, 'b', '[=]');     // the striped beanie
  tintBox(d, 0, 99, 0, 99, 'b', 'oO');     // blue eyes...
  tintBox(d, 0, 99, 0, 99, 'w', '\\_/');   // ...a white grin
}
tintBox(SPRITES.bb.office, 1, 3, 8, 99, 'r');   // the red balloon and its string
tintBox(SPRITES.bb.scare, 4, 6, 20, 99, 'r');
tintBox(SPRITES.bb.scare, 6, 6, 0, 99, 'y', 'HELO!');
const BB_SPOT = [3, 19];   // BB in your office, in front of the monitor

// ----- Mangle: never seen on the cameras (you hear her). Only her jumpscare: a tangle of white and pink
// fox parts, with a second, bare endoskeleton head hanging off her. -----
SPRITES.mgl = {
  scare: art(String.raw`
       /\      /\
      /  \____/  \         .--.
     |   O    O   |       ( oo )
     |    \__/    |        '--'
      \  VVVVVV  /        /
  ~~~~~\________/~~~~~~~~'
   --{=}--{=}--{=}--{=}--
    /   |    |   \    \ `),
};
tintBox(SPRITES.mgl.scare, 0, 1, 0, 20, 'p', '/\\');    // pink ears
tintBox(SPRITES.mgl.scare, 2, 2, 0, 20, 'y', 'O');      // yellow eyes
tintBox(SPRITES.mgl.scare, 4, 4, 0, 99, 'w', 'V');      // white teeth
tintBox(SPRITES.mgl.scare, 3, 3, 0, 20, 'p', '\\_/');   // a pink snout
tintBox(SPRITES.mgl.scare, 1, 3, 23, 99, 'G');          // the bare endo head
tintBox(SPRITES.mgl.scare, 6, 7, 0, 99, 'G');           // the tangled endo parts

// ----- Nightmare BB: a dark, sharp-toothed BB sitting on your office floor, asleep (- -) or awake (O O,
// a mouth full of teeth). His face is row 1, column 3 of the drawing (NBB_FACE): that's where the light
// has to be. -----
SPRITES.nbb = {
  asleep: art(String.raw`
 [=^=]
( -.- )
(_____)
 d   b`),
  awake: art(String.raw`
 [=^=]
( O O )
(VVVVV)
 d   b`),
  scare: art(String.raw`
          [===^===]
        (  O     O  )
        ( VVVVVVVVV )
        ( AAAAAAAAA )
         \_________/
         d         b`),
};
for (const d of [SPRITES.nbb.asleep, SPRITES.nbb.awake, SPRITES.nbb.scare]) {
  tintBox(d, 0, 0, 0, 99, 'r', '^');
  tintBox(d, 0, 0, 0, 99, 'D', '[=]');     // a dark striped beanie
  tintBox(d, 1, 1, 0, 99, 'y', 'O');       // yellow eyes when awake
  tintBox(d, 2, 3, 0, 99, 'w', 'VA');      // white teeth
}
// Picked with a search so a shine aimed at any other target (Shadow Bonnie's eyes, Plushtrap's spots, the
// Freddles, the windows, the cupcakes) never reaches his face: in front of the desk, right of the middle.
const NBB_SPOT = [10, 25];
const NBB_FACE = [NBB_SPOT[0] + 1, NBB_SPOT[1] + 3];

// ----- the Nightmare staff bot's caution bot: always in your office (bottom left). Its sign says ! when
// all is quiet; when the staff bot is coming it shows an arrow (<-- or -->) at that door. -----
SPRITES.nsb = {
  bot: art(String.raw`
.-----.
|  !  |
'--+--'
 [o_o]
 /| |\ `),
  scare: art(String.raw`
      .-------------.
      |  X       X  |
      |    _____    |
      |   |VVVVV|   |
      |___|AAAAA|___|
     /|   STAFF     |\
    / |_____________| \
       ()         () `),
};
tintBox(SPRITES.nsb.bot, 0, 2, 0, 99, 'y');            // a yellow caution sign
tintBox(SPRITES.nsb.bot, 1, 1, 0, 99, 'r', '!');
tintBox(SPRITES.nsb.bot, 3, 3, 0, 99, 'c', 'o');
tintBox(SPRITES.nsb.scare, 1, 1, 0, 99, 'r', 'X');
tintBox(SPRITES.nsb.scare, 3, 4, 0, 99, 'w', 'VA');
tintBox(SPRITES.nsb.scare, 5, 5, 0, 99, 'y', 'STAF');
const NSB_SPOT = [11, 1];
// The sign's middle line: the arrow (or !) goes on row 1, columns 1 to 5 of the drawing.
const NSB_SIGN = { idle: '  !  ', L: '<--  ', R: '  -->', wait: ' !!! ' };

// ----- Grave weed: a spiky weed with TWO mean heads (on request, 2026-11-26: "give grave weed a second
// head") on a forked stem, growing out of a little tombstone. Like Bounce pot it has a standing look, a
// squeezed one and a crouch for charging up, at his size (10 wide, 6 tall), so it shares his hit box. -----
SPRITES.grw = {
  pot: art(String.raw`
 \v/  \v/
(x X)(X x)
(VVV)(VVV)
~ \_)(_/ ~
 .------.
 | RIP  |`),
  squash: art(String.raw`
 \v/  \v/
(x X)(X x)
(VVV)(VVV)
~ =_)(_= ~
 .------.
 | RIP  |`),
  crouch: art(String.raw`

 \v/  \v/
(> <)(> <)
(VVV)(VVV)
 .------.
 | RIP  |`),
  scare: art(String.raw`
  \  v  |  v  /   \  v  |  v  /
   \ \  |  / /     \ \  |  / /
  (  x     X  )   (  X     x  )
  (  VVVVVVV  )   (  VVVVVVV  )
  (  AAAAAAA  )   (  AAAAAAA  )
 ~~ )  | |  ( ~~~~~ )  | |  ( ~~
     \_____\_________/_____/
         .--------------.
         |    R I P     |
         '--------------'`),
};
for (const d of [SPRITES.grw.pot, SPRITES.grw.squash, SPRITES.grw.crouch, SPRITES.grw.scare]) {
  tintBox(d, 0, 99, 0, 99, 'd', 'v|\\/');   // dark green leaves (also the forked stem)
  tintBox(d, 0, 99, 0, 99, 'r', 'xX><');     // red eyes
  tintBox(d, 0, 99, 0, 99, 'w', 'VA');       // white teeth
  tintBox(d, 0, 99, 0, 99, 'g', '~=');       // green tendrils
  tintBox(d, d === SPRITES.grw.scare ? 7 : 4, 99, 0, 99, 'G');   // the grey tombstone (its bottom rows)
}

// =====================================================================
// Update 3.0: the BACK of the office (turn around with Shift) and the two yard cameras outside it.
// =====================================================================

// The back of the office: 44 x 16, like the front. Two windows looking out on the yards (BACK_WINDOWS),
// Cookie Freddy's ingredient shelf between them (KITCHEN_JARS), and a back desk with H.E.L.P.I's tablet.
const BACK_ART = art(String.raw`
____________________________________________
.-------. .---------.  .---------. .-------.
|       | |CHOCOLATE|  |SPRINKLES| |       |
|       | '---------'  '---------' |       |
|       | .---------.  .---------. |       |
'-------' | FROSTING|  | CARAMEL | '-------'
          '---------'  '---------'

               .------------.
               |            |
               '------------'
  ________________________________________
 |                                        |
 |________________________________________|
   ||                                  ||
. . . . . . . . . . . . . . . . . . . . . .`);
// The inside of each back window ([row, column] of its top-left corner): 7 wide, 3 tall. The threats
// outside come right up to these; flash the window to send them off.
const BACK_WINDOWS = { L: [2, 1], R: [2, 36] };
const BACK_WIN_W = 7, BACK_WIN_H = 3;
// H.E.L.P.I's tablet on the back desk: its screen line ([row, column], 12 wide).
const TABLET_SCREEN = [9, 16];
// Where Nightmare Helpy sits on the back desk.
const HELPY_SPOT = [8, 2];

// The back of the office as a grid. The window glass is dim, so it looks set back into the wall.
function backGrid() {
  const g = grid(BACK_ART, OFFICE_W);
  for (const [r0, c0] of Object.values(BACK_WINDOWS)) {
    for (let r = r0; r < r0 + BACK_WIN_H; r++) {
      for (let c = c0; c < c0 + BACK_WIN_W; c++) g[r][c] = { ch: r === r0 + 1 && (c - c0) % 3 === 2 ? '/' : ' ', cls: 'glass' };
    }
  }
  return g;
}


// ----- the yards (CAM 9 and CAM 10) -----
// Drawn by code, like the halls in ASCII FNAF: Line 2: a fenced yard stretching away from the office, the
// fences closing in toward a far gate, grass that gets thicker up close, and a tree on the outer side.
// Everything is dark until the camera's own light is on (`lit`). 40 x 11, like every camera picture.
const YARD_W = 40, YARD_H = 11;
// Where someone stands in the yard as they come closer: [row, column] of the top-left corner of their
// drawing for stage 0 (far, by the gate), 1 (half way) and 2 (close, nearly at your window).
const YARD_SLOTS = [[3, 18], [4, 16], [5, 14]];
// Twisted Foxy's mound in the ground: on the left or right of the yard ([row, column]).
const MOUND_SPOTS = { L: [8, 4], R: [8, 30] };
// A straight line of character `ch` from (r1, c1) to (r2, c2), one cell per row or column, whichever
// there are more of.
function yardLine(g, r1, c1, r2, c2, ch, cls) {
  const n = Math.max(Math.abs(r2 - r1), Math.abs(c2 - c1));
  for (let i = 0; i <= n; i++) {
    const r = Math.round(r1 + (r2 - r1) * i / (n || 1)), c = Math.round(c1 + (c2 - c1) * i / (n || 1));
    if (g[r] && g[r][c]) g[r][c] = { ch, cls };
  }
}
function yardGrid(side, lit) {
  const g = blank(YARD_W, YARD_H);
  const cls = lit ? 'yard lit' : 'yard';
  // Stars, then the grass: a few blades far away, more up close.
  for (const [r, c] of [[1, 5], [1, 14], [1, 26], [1, 33], [2, 9], [2, 30]]) g[r][c] = { ch: '.', cls };
  for (let r = 4; r <= 9; r++) {
    for (let c = 2 + (r % 3); c < YARD_W - 2; c += 9 - r / 2 | 0) g[r][c] = { ch: r > 6 ? '"' : ',', cls };
  }
  // The fences closing in toward the gate at the far end, and the gate itself.
  yardLine(g, 9, 1, 3, 12, '/', cls);
  yardLine(g, 9, 38, 3, 27, '\\', cls);
  yardLine(g, 3, 12, 3, 27, '-', cls);
  write(g, 2, 16, '|=|=|=|', cls);
  // A tree on the outer side of the yard (left yard: on the left; right yard: on the right).
  const tc = side === 'L' ? 2 : 32;
  write(g, 2, tc, ' .@@. ', cls);
  write(g, 3, tc, '(@@@@)', cls);
  write(g, 4, tc, '  ||  ', cls);
  // The border, like every camera picture.
  yardLine(g, 0, 0, 0, YARD_W - 1, '-', 'yard-frame');
  yardLine(g, YARD_H - 1, 0, YARD_H - 1, YARD_W - 1, '-', 'yard-frame');
  yardLine(g, 0, 0, YARD_H - 1, 0, '|', 'yard-frame');
  yardLine(g, 0, YARD_W - 1, YARD_H - 1, YARD_W - 1, '|', 'yard-frame');
  for (const [r, c] of [[0, 0], [0, YARD_W - 1], [YARD_H - 1, 0], [YARD_H - 1, YARD_W - 1]]) g[r][c] = { ch: '+', cls: 'yard-frame' };
  return g;
}

// ----- update 3.0 characters -----
// Rockstar Bonnie: only seen when he gets you (his guitar hangs in the shop).
SPRITES.rsb = {
  scare: art(String.raw`
      /\      /\
     /  \    /  \
    |  O      O  |   *
    |     __     |
     \   \__/   /
      '--------'
  ====[##]=========> `),
};
tintBox(SPRITES.rsb.scare, 2, 2, 0, 18, 'r', 'O');
tintBox(SPRITES.rsb.scare, 2, 2, 19, 99, 'k');
tintBox(SPRITES.rsb.scare, 6, 6, 0, 99, 'v');
tintBox(SPRITES.rsb.scare, 6, 6, 0, 99, 'k', '#');

// Ghost Freddy: a pale, see-through Freddy drifting across your screen (drawn over the view, like Bounce pot).
SPRITES.gfr = {
  ghost: art(String.raw`
  [___]
 ( o o )
 ( ___ )
  ~~~~~`),
};
tintBox(SPRITES.gfr.ghost, 1, 1, 0, 99, 'w', 'o');

// Nightmare Helpy: a little torn-up bear with sharp teeth, sitting on the back desk.
SPRITES.hlp = {
  office: art(String.raw`
 .-. .-.
( O ' O )
 \VVVVV/
  /| |\ `),
  scare: art(String.raw`
    .--.        .--.
   (    )______(    )
    |   O      O   |
    |    VVVVVV    |
    |    AAAAAA    |
     \____________/`),
};
for (const d of [SPRITES.hlp.office, SPRITES.hlp.scare]) {
  tintBox(d, 0, 99, 0, 99, 'r', 'O');
  tintBox(d, 0, 99, 0, 99, 'w', 'VA');
}

// H.E.L.P.I: the tablet's angry face when you got it wrong.
SPRITES.hpi = {
  scare: art(String.raw`
  .--------------------.
  |  H . E . L . P . I |
  |                    |
  |       >:(          |
  |   WRONG ANSWER!    |
  |  X   X   X   X   X |
  '--------------------'`),
};
tintBox(SPRITES.hpi.scare, 3, 5, 0, 99, 'r', '>:(WRONGASWE!X');

// Dreadbear and Twisted Wolf out in the yards: by the far gate (yard[0], just eyes), half way (yard[1])
// and close (yard[2]); then at a back window (window, 7 wide and 3 tall) and their jumpscares.
SPRITES.dbr = {
  yard: [['[=]', 'o.o'], [' [==] ', '-(oo)-', ' /||\\'], ['  [====]', '-( o  o )-', ' ( \\__/ )', '  /|  |\\']],
  window: [' [===]', '-(o o)-', ' (=-=)'],
  scare: art(String.raw`
        [==========]
     ==(  O      O  )==
        (   ____   )
        (  |VVVV|  )
         \ |AAAA| /
          '------'`),
};
SPRITES.twf = {
  yard: [['/\\/\\', 'o o'], ['/\\ /\\', '(o o)', ' \\V/'], ['/\\   /\\', '( o o )', ' \\VVV/', '  | |']],
  window: ['/\\ _ /\\', '( o o )', ' \\VVV/'],
  scare: art(String.raw`
    /\            /\
   /  \__________/  \
   |    O      O    |
    \    VVVVVV    /
     \   AAAAAA   /
      '----------'`),
};
for (const id of ['dbr', 'twf']) {
  const S = SPRITES[id], eye = id === 'dbr' ? 'g' : 'y';
  for (const d of [...S.yard, S.window, S.scare]) {
    tintBox(d, 0, 99, 0, 99, eye, 'oO');
    tintBox(d, 0, 99, 0, 99, 'w', 'VA');
  }
}
tintBox(SPRITES.dbr.window, 1, 1, 0, 99, 'G', '-');   // the bolts in his neck
tintBox(SPRITES.dbr.scare, 1, 1, 0, 99, 'G', '=');

// Twisted Foxy: a mound in the yard with his ear tips poking out, and his jumpscare (bursting out of the ground).
SPRITES.tfx = {
  mound: ['  /\\/\\', '_/::::\\_'],
  scare: art(String.raw`
    /\          /\
   /  \  ____  /  \
   |   O      O   |
    \  VVVVVVVV  /
  ___\_AAAAAAAA_/___
  ::::::::::::::::::`),
};
tintBox(SPRITES.tfx.mound, 1, 1, 0, 99, 'n');
tintBox(SPRITES.tfx.scare, 2, 2, 0, 99, 'y', 'O');
tintBox(SPRITES.tfx.scare, 3, 4, 0, 99, 'w', 'VA');
tintBox(SPRITES.tfx.scare, 4, 5, 0, 99, 'n', '_:');

// The shopkeeper on the SHOP tab: a staff bot with a monocle (@), and the coin drawn on the cameras.
const SHOPKEEPER = art(String.raw`
 .---------.
 | o    (@)|
 |   ___   |
 '---------'
  /|$ $ $|\ `);
tintBox(SHOPKEEPER, 1, 1, 0, 99, 'k', '@');
tintBox(SHOPKEEPER, 4, 4, 0, 99, 'k', '$');
const COIN_ART = '(c)';
