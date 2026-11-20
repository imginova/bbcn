# ASCII FNAF Simulator

FNAF **backwards**: you control the animatronics, and the computer plays the night guard.
Catch the guard before 6 AM. An unofficial, free fan game, drawn in ASCII art.

- **10 story nights**, each with a different guard (with different tools) and a different crew.
- **A custom night** (opens after Night 10) where you choose everything: the guard, how smart it is,
  which tools it has, your crew (up to 6, each with a level), its power, the length of an hour and
  how fast your cooldowns recharge.
- **31 animatronics** to use, each with its own ability.

## How to play it

Double-click `index.html`. That's it: no install, no internet needed except for the fonts.

## How the files are split

Each file has one job. The scripts in `js/` load in this order, and each one can use what the
ones before it made:

| File | Its job |
|---|---|
| `index.html` | The page's structure: screens, buttons, empty boxes the game draws into |
| `style.css` | How it looks: the purple screen, colors, layout |
| `js/helpers.js` | Tiny tools everyone uses: `$`, `store` (saving), `pick`, `rand`, `byLevel` |
| `js/config.js` | The tuning numbers. **Most balance changes happen here** |
| `js/data.js` | The building's rooms, every animatronic, every guard, the 10 nights |
| `js/sound.js` | Every sound, made from scratch in code |
| `js/art.js` | The ASCII faces and the office camera picture |
| `js/game.js` | The rules: the guard's "brain", moving, attacking, abilities, winning |
| `js/render.js` | Draws the night on the page |
| `js/screens.js` | The menus: title, nights, custom night, pause, end of the night |
| `js/input.js` | Every click and key press |
| `js/main.js` | Starts the game and runs the game loop |
| `tools/build.js` | Makes the website version in `dist/` (run by GitHub, not needed to play) |

## Ideas for changes

- Make a guard sharper or dumber: change its `skill` in `GUARDS` (`data.js`).
- Change a night's crew: edit its `crew` list in `NIGHTS` (`data.js`).
- Make everyone faster or slower: change `move` (seconds between steps) or `attack`
  (seconds in the doorway) for an animatronic in `CREW` (`data.js`).
