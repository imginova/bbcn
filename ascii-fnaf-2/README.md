# ASCII FNAF: Line 2

A custom-night fan game in the style of Five Nights at Freddy's, drawn in ASCII art and played in the browser. This one mixes **Sister Location** and **FNAF 4**: you sit deep underground in Circus Baby's Entertainment and Rental from 12 AM to 6 AM with two doors, two heavy doors, a vent door, a mask, a controlled shock, nine cameras, a battery that drains whenever you use anything and oxygen that never comes back. Eighteen characters each get their own level from 0 to 20 on the custom night screen, and each one works its own way (the rules are in the game's **How to play**).

It's a separate game from [Line 1](../ascii-fnaf/), with its own saves.

> **A fan game.** ASCII FNAF: Line 2 is not affiliated with Scott Cawthon or Five Nights at Freddy's. The characters belong to their creator. The game is free and must stay free: no price, no ads, no donations. All the drawings and sounds were made from scratch for this game.

## Playing it

- **On your computer:** double-click `index.html`. No installing, no internet needed (except for the fonts).
- **Online:** https://imginova.github.io/bbcn/ascii-fnaf-2/

## How the code is organized

The game is split into files by job, the same way as Line 1. Every file starts with a comment that explains what it's for, and the code is commented for learning.

| File | Its job |
|---|---|
| `index.html` | The page's structure: screens, buttons and empty boxes the game draws into. Also the How to play text |
| `style.css` | How everything looks: the Sister Location colors, one color per character, fonts, layout, flickering lights |
| `js/helpers.js` | Tiny tools: `$`, `store` (saving in the browser), `pick`, `rand`, `byLevel` |
| `js/config.js` | **The numbers to tweak**: power, oxygen, timings and how hard each level is |
| `js/data.js` | The cameras, the 18 characters, Funtime Freddy's lines and the challenges |
| `js/sound.js` | Every sound effect, generated in code (there are no sound files) |
| `js/art.js` | The ASCII pictures: the halls (drawn by code), the rooms, the office and every character's drawings |
| `js/game.js` | The rules: what each character does, doors, power, oxygen, the shock, winning and losing |
| `js/render.js` | Draws the night onto the screen (never changes the rules) |
| `js/screens.js` | Switching screens, the custom night grid (with its info box), the pause panel's roster, the win and game over screens |
| `js/input.js` | Mouse and keyboard controls |
| `js/main.js` | The game loop and start-up |

The scripts are loaded in that order at the bottom of `index.html`, and **the order matters**: each file can use what the files above it made.

## Changing things

- **Make something easier or harder:** change its numbers in `js/config.js`. Many are written as `byLevel(level, at1, at20)`: the value at level 1 and the value at level 20.
- **Add a challenge:** add a line to `PRESETS` in `js/data.js`, and a line of flavour text to `FLAVOR`.
- **Made a challenge harder?** Raise its `v` in `PRESETS` (for example `v: 1` to `v: 2`), so its ✓ has to be earned again. Only do this for the challenges your change actually affects.
