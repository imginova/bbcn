# Night Shift: project handoff

This file holds everything a new Claude session, or a person, needs to keep working on this project. Claude Code reads `CLAUDE.md` automatically when it starts in this folder. In a plain claude.ai chat, attach this file together with `index.html`, `style.css` and the `js/` folder. [`README.md`](README.md) is the beginner-friendly guide for Jake.

## What this is

**Night Shift** is a browser game in the style of Five Nights at Freddy's (FNAF), drawn in ASCII art and played with the mouse and keyboard. You sit in a security office from 12 AM to 6 AM, close two doors, watch seven cameras, wind a music box and ration your power.

- **The game is split into files by job:** `index.html` (structure), `style.css` (looks) and ten scripts in `js/`. It has no build step, no dependencies and no sound files. Jake is learning from this code, so every file has a header comment and learning-oriented comments.
- **Live, shareable link:** https://claude.ai/artifact/DVsNPKwUh2H89SCqr5RArG. It's private: only the owner and people they share it with through the page's **Share** menu can open it. It belongs to the Claude account the project moved to on 2026-10-31. The old link (`5qmjeiJHMdgo8STTf2ZAFF`) belongs to the previous account and can't be updated from the new one.
- **Owner:** Jake Harris started the project. Jake's son now works on it, using the `imginova` GitHub account that owns the repo. Both are new to programming: explain changes in plain language and avoid jargon.

## Working agreements with the owner

- **Make a plan before big features**, and ask about genuinely ambiguous design choices. Small requests can be done directly.
- **Commit only when asked.** After each change, ask "Commit these changes?" Commits go straight to `main`.
- **After every change, republish the live link** so Jake can play it right away (see "Publishing" below).
- **Keep the pace fast.** Jake specifically removed slow mechanics such as door lights.
- **Keep the split by job and keep the comments.** Put new code in the file whose job it matches, and comment it in the same beginner-friendly style: explain *why*, define jargon the first time it appears. Update `README.md` if a file's job changes.

## Gameplay as it stands now

| Part | How it works | Mouse | Keyboard |
|---|---|---|---|
| Doors | Block a shape at the door. Each closed door costs power. Toggling a door does **not** lower the camera | Click the door or its button | `A` left, `D` right |
| Camera | Shows an ASCII feed of one room plus a map. Raising it costs power | Camera button, then click a room on the map | `Space` or `S` toggles; `1`–`7` jump to a camera |
| Power | Starts at 100%. **Nothing drains while idle.** Each door or the camera costs 0.40% per second. At 0% the doors open, the camera dies, and a shape gets you 5–13 seconds later | n/a | n/a |
| Clock | 12 AM to 6 AM, 30 real seconds per hour, so a night lasts 3 minutes | n/a | n/a |
| Pause / sound | Pausing also happens automatically when the browser tab is hidden | Sound button at the top | `P` or `Esc` pauses, `M` mutes |

### The threats (custom night: each has its own level, 1–20)

There is **no 5-night story**. Each game is a single custom night, and the setup screen sets a level for each threat. A creature at level *L* has an L/20 chance to move on each of its movement ticks.

| Threat | Route | Special behavior |
|---|---|---|
| `◆` Diamond (rose) | Stage → Dining → Backstage → West hall → **LEFT** door | Appears in the left doorway |
| `▲` Triangle (cyan) | Stage → Dining → Supply → East hall → **RIGHT** door | Appears in the right doorway |
| `●` Orb (violet) | Stage → Dining → either hall → **either** door | **Never appears in the doorway.** Its arrival plays a loud low **rumble** from its side instead of footsteps |
| `( ͡° ͜ʖ ͡°)` Lenny (green) | Stays in the music box on **CAM 7 · Prize corner** | Works like FNAF 2's music box: the box unwinds over time, and you **hold `W` or the Wind button while on CAM 7** to rewind it. Below 30% the Camera button shows "WIND CAM 7!", the CAM 7 map button flashes, and a warning chime plays. At 0% a tune plays, his face appears on the office monitor, and he gets you 4.5 seconds later. Nothing stops him once he's out |

- **Doors:** when ◆, ▲ or ● reaches a doorway, you have a reaction window to shut the door: 2.6 seconds at level 1, down to 1.4 seconds at level 20. If the door is shut, the shape goes back to the stage with a knock sound. If not, a jumpscare fills the screen with the shape, and the game-over screen offers Retry or Change levels.
- **Movement sounds:** each move plays a footstep in that shape's own pitch (● deepest, ◆ middle, ▲ highest). The step gets louder and pans further toward its door the closer the shape is. ◆ and ▲ arriving at a doorway play heavy footsteps.
- **Saved in the browser (`localStorage`):** the last levels used, the best result (the highest total of levels survived, out of 80) and the mute setting. Every read and write is wrapped in try/catch, so the game still works if storage is blocked.

## Design decisions (and why)

- **No door lights.** Jake felt lights imply a shape waits at the door, which makes the pace too slow.
- **The threats are Unicode symbols, not characters.** That was Jake's direction. Lenny is the one face.
- **Custom night instead of 5 nights.** Jake wanted every threat to have its own adjustable level.
- **Doors work while the camera is up.** Jake asked for this so you keep watching while you close a door.
- **The orb is invisible at the door.** Jake wanted it identified by its louder audio cue only.
- **Power drains only while in use.** Jake removed the idle drain and asked for faster per-use drain to compensate. It went from 0.10% idle + 0.12% per item to 0% idle + 0.20% per item.
- **Short nights, heavy drain.** The hour was cut from 60 to 30 seconds (3-minute nights), and the drain per item was doubled to 0.40% at the same time. Doubling it keeps the same share of the battery per in-game hour, so power stays just as tight over the shorter night.
- **Visual style:** a single dark amber CRT terminal. The fonts are VT323 for display text and IBM Plex Mono for the art, both loaded from Google Fonts. The look is dark on purpose, so there's no light theme.

## How the code is organized

- **`index.html`:** the structure only. It has the screens `#scr-title`, `#scr-setup`, `#scr-game` and `#scr-win`, plus the full-screen overlays `#scare` (jumpscare and game over) and `#howto`. Visibility is switched with the `hidden` attribute. It loads `style.css`, then the scripts at the bottom **in order**.
- **`style.css`:** the color and font tokens at the top of `:root` (`--fg` amber, `--c-dia`, `--c-tri`, `--c-orb`, `--c-len`, `--danger`), then styles for each screen.
- **`js/`**, plain classic scripts (not ES modules, so the game still works when `index.html` is opened from disk). Top-level `const`/`let`/`function` declarations are shared across the scripts through the global scope, so **load order matters** and **names must be unique across all files**. The files, in load order:
  1. **`helpers.js`:** `$` (getElementById), `store` (localStorage wrapped in try/catch) and `pick`.
  2. **`config.js`:** the tuning values `HOUR_SECONDS`, `NIGHT_HOURS`, `BASE_DRAIN`, `UNIT_DRAIN`, `MIN_LEVEL`/`MAX_LEVEL`, `clampLevel`, `reactWindow(level)`, `boxDrain(level)`, `WIND_RATE`, `BOX_LOW` and `LENNY_DELAY`. **Most balance changes happen here.**
  3. **`data.js`:** `ROOMS` and `CAM_ORDER` (the 7 cameras), `LENNY_FACE`, `CREATURES` (◆ ▲ ● with routes, movement interval, footstep `pitch` and the `unseen` flag), `LENNY`, and `SETUP` (everything with a level, in the order of `levels[]`).
  4. **`sound.js`:** `sfx`, every sound, generated with the Web Audio API (`tone()` and `noise()` helpers).
  5. **`art.js`:** the grid helpers (`grid`, `toHtml`, `inShape`, `stamp`, `stampFace`, `frame`, `symHtml`, `SYM_CLASS`), `ROOM_ART`, `SLOTS`, `prizeArt(g, lenny)` and `officeLines(now, dark, camUp)`. Art is a 2D grid of `{ch, cls}` cells.
  6. **`game.js`:** the state (`levels`, `best`, `G`, `dirty`, `windKey`/`windPointer`) and the rules (`newGame`, `update(dt)`, `updateMob`, `bounce`, `updateLenny`, `camStatic`, `powerOutStart`), the player actions (`toggleDoor`, `toggleCam`, `setCam`, `setPaused`, `startNight`), and the endings (`win`, `lose`, `loseLenny`). The endings call `screens.js` to display results; they don't touch the page directly.
  7. **`render.js`:** `renderGame(now)` (the HUD, office or cameras, and the buttons), `doorGrid` and `renderFeed`. It reads `G` and never changes the rules.
  8. **`screens.js`:** `currentScreen`, `sel`, `show(name)`, `showPause`, `showScare(message, artHtml)`/`hideScare`, `showWin(sum, isBest)`, `goSetup`, the custom night screen (`buildSetup`, `renderSetup`, `changeLevel`, `setAllLevels`, `bestText`), How to play, and the mute button.
  9. **`input.js`:** all event listeners: button clicks, the map, setup rows, one `keydown` handler that branches by `currentScreen`, `keyup` for `W`, pointer-hold on `#btnWind`, window blur and tab visibility.
  10. **`main.js`:** `speed`, the `requestAnimationFrame` game `loop`, the `window.nightShift` test hook and `boot()`.

### Gotchas

- **`index.html` is a page fragment.** It has no `<!doctype>`, `<html>`, `<head>` or `<body>`, because the Artifact publisher adds them. Don't add a skeleton.
- **The game must also work when `index.html` is double-clicked.** Jake plays it that way. Two things make that work, so keep both:
  - `<meta charset="utf-8">` (plus a viewport meta) at the very top of `index.html`. Without it, symbols like ◆ turn into gibberish.
  - `[hidden] { display: none !important; }` in `style.css`. The artifact wrapper supplies this rule, but a local file doesn't. Without it, every hidden overlay with a `display` rule shows at once; for example, the Game Over screen covers the title.
- **Avoid global names that clash with browser built-ins.** Because the scripts share the global scope, a name like `screen` could collide with `window.screen`. That's why the variable is called `currentScreen`.
- **Keep art ASCII-only**, except the threat symbols. Non-ASCII glyphs come from fallback fonts with different widths and break the alignment. Symbols get the `.sym` class (inline-block, `1ch` wide) to keep their column.
- **Lenny's face needs a system font.** IBM Plex Mono can't draw its combining marks (U+0361 and U+035C), which show up as a box. `.face` and `.bigface` use a `system-ui` font stack. Inside the ASCII grid the face is one cell followed by 7 empty cells, so it spans 8 columns.
- **To add a camera:** update `ROOMS` and `CAM_ORDER` (`data.js`), `ROOM_ART` and `SLOTS` (`art.js`), the `#map` buttons (`index.html`), `.map`'s `grid-template-areas` (`style.css`), the `1–7` key check (`input.js`) and the help text.
- **To add a leveled threat:** add it to `CREATURES` in `data.js`, or handle it separately like `LENNY`, and make sure it lands in `SETUP`. Old saved levels are padded automatically.
- **To add a new script file:** add a `<script src>` line in `index.html` in the right load-order position, and add it to the `files` map when publishing.
- **The `window.nightShift` test hook:** `nightShift.state` shows the current night, and `nightShift.speed = 20` fast-forwards time. It's harmless to leave in.

## Publishing (the live link)

The game is published with Claude's **Artifact** tool.

- **The page is multi-file.** Publish `file_path: index.html` and pass every other file in `files`, mapping each published path to the same local path: `{"style.css": "style.css", "js/helpers.js": "js/helpers.js", ...}` for all ten scripts. On an update, files that are left out are kept as they were, so always include the ones you changed. Listing all of them is the safest.
- **In the same session that created it:** publish the same `file_path` (`index.html`) again, and the URL stays the same.
- **From a new session or computer:** first **read** the artifact with `action: "read"` and `url: https://claude.ai/artifact/DVsNPKwUh2H89SCqr5RArG`. Then publish with that same `url`, `file_path: index.html` and the `files` map. Without the `url`, a new, separate link is created.
- If a publish is refused because a newer version exists, merge the differences it shows and publish again.
- **Page rules:** fonts may only come from Google Fonts, scripts only from cdnjs, jsDelivr or unpkg with pinned versions, and all other CSS and JS must be inline. `alert`/`confirm` don't work, and sound starts only after the player clicks or presses a key.

## Testing

- **Quick syntax check:** this parses each script, then all of them together in load order, which also catches duplicate names across files:
  ```bash
  node -e "const fs=require('fs');const o=[...fs.readFileSync('index.html','utf8').matchAll(/<script src=\"([^\"]+)\"/g)].map(m=>m[1]);o.forEach(f=>new Function(fs.readFileSync(f,'utf8')));new Function(o.map(f=>fs.readFileSync(f,'utf8')).join('\n;\n'));console.log('OK:',o.join(', '))"
  ```
- **Playing it locally:** double-clicking `index.html` works in a normal browser. The Claude desktop app's browser pane, however, opens local files as `data:` pages, which can't load `style.css` or `js/*.js`. So for that pane, build one temporary file with everything inlined:
  ```bash
  node -e "const fs=require('fs');let h=fs.readFileSync('index.html','utf8');h=h.replace('<link rel=\"stylesheet\" href=\"style.css\">',()=>'<style>'+fs.readFileSync('style.css','utf8')+'</style>');h=h.replace(/<script src=\"([^\"]+)\"><\/script>/g,(m,f)=>'<script>'+fs.readFileSync(f,'utf8')+'</script>');fs.writeFileSync('_preview-test.html','<!doctype html><html><head><meta charset=\"utf-8\"><style>[hidden]{display:none!important}</style></head><body>\n'+h+'\n</body></html>')"
  ```
  Delete `_preview-test.html` afterwards; it's only for testing. The inlined copy adds its own `[hidden]` rule and charset, so it **won't** catch problems specific to opening the real file.
- **The current computer is Windows**, with no Node.js and no Chrome. The two `node` commands above won't run until Node.js is installed (nodejs.org). Microsoft Edge is installed and works the same as headless Chrome: `"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"`.
- **Testing the real file the way Jake opens it:** run headless Chrome or Edge against `file:///…/index.html`:
  - For a screenshot, use `--headless=new --screenshot=out.png --window-size=900,1100 --virtual-time-budget=3000`.
  - For automated play, append a test `<script>` to a temporary copy *in the project folder* (so the relative paths work). It should send `keydown` events and write its results to `document.title`; then read them with `--dump-dom`.
  - Headless Chrome barely runs `requestAnimationFrame`, so the test script should drive the game itself with `setInterval(() => { update(0.02); renderGame(performance.now()); }, 20)` while `currentScreen === 'game'`.
- **What a full test covers:** both doors with keys and mouse; the camera staying up while doors toggle; all 7 cameras; ● staying invisible in the doorway; winding with `W` and with the button (and not working on other cameras); Lenny's warning and loss; the power-out loss; the 6 AM win (set `nightShift.state.t = 179`); and phone width with no sideways scrolling.

## Not yet verified

- **Sound has never been heard by Claude.** The rumble, footsteps, winding, tune and jumpscare volume need a human ear.
- **Balance with the new power drain has not been play-tested.** The values are 0.40% per item, no idle drain and 30-second hours.
- **The live link has only been checked by Jake.** Claude's test browser wasn't signed in to claude.ai.
- A best score saved before Lenny existed shows `–` for his level and is totaled out of 80.

## Git and GitHub

- **GitHub:** https://github.com/imginova/bbcn (a **public** repository; this is for Jake's son's use). Push to `main`. To move to another computer, clone it from there. The live link works from any computer once you're signed in to claude.ai.
- **Keep personal details out of the repository.** Because it's public, no work email may appear in files or commits.
  - Commit as `imginova <107283216+imginova@users.noreply.github.com>`, the `imginova` account's private GitHub noreply address. Never use Jake's address or the email on the Claude account. The setting lives in this repo's local git config, which a clone doesn't copy, so run `git config user.email` before committing on a new computer and set it if it's empty.
  - Commits up to and including "Point the handoff docs at the GitHub repository" were made as `Jake Harris <3029091+jakeharris4u@users.noreply.github.com>`.
  - The history was rewritten once, before the first push, to replace a work email, so older commit hashes quoted anywhere are out of date.
- **History, oldest first** (see `git log` for hashes):
  1. First version of the game
  2. Doors no longer lower the camera; movement sounds get louder with distance
  3. ● hidden at doors with a rumble cue; Lenny's music box on CAM 7
  4. No idle power drain; 0.20% per door or camera; 3-bar usage meter (committed by Jake)
  5. This handoff guide
  6. Split into `index.html`, `style.css` and `js/*.js`, with learning comments and `README.md`
  7. Fixed opening `index.html` directly from disk (`[hidden]` rule, charset meta)
  8. Pointed these docs at GitHub
  9. Moved to a new Claude account and Windows computer: new live link, commits as `imginova`
