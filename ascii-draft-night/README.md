# ASCII FNAF: Draft Night

A roguelite fan game in the style of Five Nights at Freddy's, drawn in ASCII art and played in the browser. Before every night you're dealt five character cards and take as many as you dare: they join your lineup for the rest of the run. Each character has a rarity (Common 5, Uncommon 10, Rare 20, Epic 35, Legendary 50 points) that says how hard it is and how much it's worth. **Survive a night with a lineup worth 150 points to win the run.** You have three lives.

There are 25 characters: 9 common, 5 uncommon, 5 rare, 3 epic and 3 legendary, each working its own way (the rules are in the game's **How to play**, and on each card).

The office has two doors, two windows, a flashlight that works in the doorways and on the cameras too, a mask, a desk fan (the office heats up all night), a controlled shock, a monitor with 8 cameras and a vent map with audio lures, and a battery that drains whenever you use anything.

> **A fan game.** ASCII FNAF: Draft Night is not affiliated with Scott Cawthon or Five Nights at Freddy's. The characters belong to their creator. The game is free and must stay free: no price, no ads, no donations. All the drawings and sounds were made from scratch for this game.

## Playing it

- **On your computer:** double-click `index.html`. No installing, no internet needed (except for the fonts).
- **Online:** https://imginova.github.io/bbcn/ascii-draft-night/ once it's merged into `main` (see `CLAUDE.md`).

## How the code is organized

The game is split into files by job, the same way as the other ASCII FNAF games. Every file starts with a comment that explains what it's for, and the code is commented for learning.

| File | Its job |
|---|---|
| `index.html` | The page's structure: screens, buttons and empty boxes the game draws into. Also the How to play text |
| `style.css` | How everything looks: the grey screen, the rarity colors, one color per character, the flashlight's glow, the heat |
| `js/helpers.js` | Tiny tools: `$`, `store` (saving in the browser), `pick`, `rand`, `shuffle` |
| `js/config.js` | **The numbers to tweak**: lives, the goal, power, heat, and each character's speed |
| `js/data.js` | The rooms, the vents, the rarities and the characters |
| `js/sound.js` | Every sound effect, generated in code (there are no sound files) |
| `js/art.js` | The ASCII pictures: rooms, the office and every character's drawings |
| `js/run.js` | The run: lives, your lineup, dealing the cards for the pick screen, winning and losing a run |
| `js/game.js` | The rules of a night: what each character does, doors, power, heat, lures |
| `js/render.js` | Draws the night onto the screen (never changes the rules) |
| `js/screens.js` | Switching screens: the title, the pick screen, the 6 AM screen, game over, pause, How to play |
| `js/input.js` | Mouse and keyboard controls, including aiming the flashlight |
| `js/main.js` | The game loop and start-up |

The scripts are loaded in that order at the bottom of `index.html`, and **the order matters**: each file can use what the files above it made.

## Changing things

- **Make a character easier or harder:** change its numbers in `js/config.js` (each one has its own block).
- **Change the run:** `LIVES`, `GOAL_POINTS` and `OFFER_SIZE` are at the top of `js/config.js`. How many points each rarity is worth, and how often it turns up on the pick screen, is `RARITIES` in `js/data.js`.
- **Add a character:** describe it in `js/data.js` (with its `rarity`) and add it to `ROSTER`; give it a face in `ICONS` (`js/art.js`), a color in `style.css`, its numbers in `js/config.js` and its rules in `js/game.js`.
