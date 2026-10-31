# Night Shift

A survival game in the style of Five Nights at Freddy's, drawn with ASCII art. You guard a security office from 12 AM to 6 AM: shut the doors, watch the cameras, wind Lenny's music box and make your power last.

**Play it:** double-click `index.html` to open it in your browser, or use the shared link: https://claude.ai/artifact/DVsNPKwUh2H89SCqr5RArG

## How this code is organized

Each file has one job. Every file starts with a comment explaining that job, and the comments inside explain *why* the code does what it does.

| File | Its job |
|---|---|
| `index.html` | **Structure**: what's on the page (screens, buttons, empty boxes the game draws into). It also loads all the other files. |
| `style.css` | **Looks**: colors, fonts, sizes and layout. |
| `js/helpers.js` | Tiny tools every file uses: `$` to find things on the page, `store` to save things, `pick` for a random choice. |
| `js/config.js` | **The numbers you can tweak**: night length, power drain, how difficulty levels work. |
| `js/data.js` | **What exists**: the rooms, the cameras and the four threats with their routes. |
| `js/sound.js` | Every sound effect, built in code from notes and noise (there are no sound files). |
| `js/art.js` | The ASCII pictures, and the tools that draw shapes into them. |
| `js/game.js` | **The rules**: moving, doors, power, the music box, winning and losing. |
| `js/render.js` | **Drawing**: puts the current state of the night onto the screen. |
| `js/screens.js` | Switching screens: custom night, How to play, 6 AM, game over. |
| `js/input.js` | **Controls**: turns clicks and key presses into actions. |
| `js/main.js` | **Starts everything** and runs the game loop. |

The files load in that order, and each one can use what the files above it created.

## A good reading order

1. **`js/config.js`**: short, and a fun place to start experimenting.
2. **`js/data.js`**: what the game is made of.
3. **`js/main.js`**: the game loop, the heartbeat that runs everything about 60 times a second.
4. **`js/game.js`**: the rules. Start with `update()`, then `updateMob()`.
5. **`js/input.js`**: how a key press turns into an action.
6. **`js/render.js`** and **`js/art.js`**: how the ASCII drawings are built.
7. **`js/sound.js`**: how sounds are made out of nothing but math.

## Things to try

Change something, save the file and reload the page to see what happens.

- In `config.js`, set `HOUR_SECONDS = 10` for one-minute nights.
- In `config.js`, set `UNIT_DRAIN = 0.05` and see how much easier the doors get.
- In `data.js`, change `sym: '◆'` to another character, such as `'★'`.
- In `sound.js`, change the numbers in `chime()` to play a different 6 AM tune.
- Press F12 (or Cmd+Option+I on a Mac) to open the browser's console, then type `nightShift.speed = 20` to fast-forward the night.

If something breaks, the console usually shows a red error with the file name and line number.
