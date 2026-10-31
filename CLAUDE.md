# Night Shift: project handoff

This file holds everything a new Claude session, or a person, needs to keep working on this project. Claude Code reads `CLAUDE.md` automatically when it starts in this folder. In a plain claude.ai chat, paste this file in together with `index.html`.

## What this is

**Night Shift** is a browser game in the style of Five Nights at Freddy's (FNAF), drawn in ASCII art and played with the mouse and keyboard. You sit in a security office from 12 AM to 6 AM, close two doors, watch seven cameras, wind a music box and ration your power.

- **The whole game is one file: [`index.html`](index.html)**, about 1,200 lines of HTML, CSS and JavaScript. It has no build step, no dependencies and no sound files.
- **Live, shareable link:** https://claude.ai/artifact/5qmjeiJHMdgo8STTf2ZAFF. It's private: only the owner and people they share it with through the page's **Share** menu can open it.
- **Owner:** Jake Harris. Jake is new to programming: explain changes in plain language and avoid jargon.

## Working agreements with the owner

- **Make a plan before big features**, and ask about genuinely ambiguous design choices. Small requests can be done directly.
- **Commit only when asked.** After each change, ask "Commit these changes?" Commits go straight to `main`.
- **After every change, republish the live link** so Jake can play it right away (see "Publishing" below).
- **Keep the pace fast.** Jake specifically removed slow mechanics such as door lights.
- **Keep everything in `index.html`** unless Jake asks otherwise.

## Gameplay as it stands now

| Part | How it works | Mouse | Keyboard |
|---|---|---|---|
| Doors | Block a shape at the door. Each closed door costs power. Toggling a door does **not** lower the camera | Click the door or its button | `A` left, `D` right |
| Camera | Shows an ASCII feed of one room plus a map. Raising it costs power | Camera button, then click a room on the map | `Space` or `S` toggles; `1`–`7` jump to a camera |
| Power | Starts at 100%. **Nothing drains while idle.** Each door or the camera costs 0.20% per second. At 0% the doors open, the camera dies, and a shape gets you 5–13 seconds later | n/a | n/a |
| Clock | 12 AM to 6 AM, 60 real seconds per hour, so a night lasts 6 minutes | n/a | n/a |
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
- **Visual style:** a single dark amber CRT terminal. The fonts are VT323 for display text and IBM Plex Mono for the art, both loaded from Google Fonts. The look is dark on purpose, so there's no light theme.

## How the code is organized (`index.html`)

1. **`<style>`:** the color and font tokens at the top of `:root` (`--fg` amber, `--c-dia`, `--c-tri`, `--c-orb`, `--c-len`, `--danger`), then styles for each screen.
2. **HTML:** the screens `#scr-title`, `#scr-setup`, `#scr-game` and `#scr-win`, plus the full-screen overlays `#scare` (jumpscare and game over) and `#howto`. Visibility is switched with the `hidden` attribute.
3. **`<script>`**, one closure, in this order:
   - **Tuning constants:** `HOUR_SECONDS`, `NIGHT_HOURS`, `BASE_DRAIN`, `UNIT_DRAIN`, `reactWindow(level)`, `boxDrain(level)`, `WIND_RATE`, `BOX_LOW`, `LENNY_DELAY`, `LENNY_FACE`. **Most balance changes happen here.**
   - **Data:** `ROOMS` and `CAM_ORDER` (the 7 cameras), `CREATURES` (◆ ▲ ● with routes, movement interval, footstep `pitch` and the `unseen` flag), `LENNY`, and `SETUP` (everything with a level, in the order of `levels[]`).
   - **`sfx`:** every sound, generated with the Web Audio API (`tone()` and `noise()` helpers). It includes `door`, `cam`, `step`, `move`, `rumble`, `knock`, `windTick`, `boxWarn`, `boxTune`, `scream`, `chime` and the background `humOn`/`humOff`.
   - **ASCII grid helpers:** art is a 2D grid of `{ch, cls}` cells. `grid()` turns text lines into cells, `toHtml()` renders them, `stamp()` draws a shape (diamond, triangle or circle) from `inShape()`, `stampFace()` places Lenny's face, and `frame()` boxes a room.
   - **Room art:** `ROOM_ART` (the inside of each camera room, 38×9 characters), `SLOTS` (where each shape stands in each room) and `prizeArt()` (the music box's lid and contents by wind level).
   - **State:** `levels`, `best`, `screen` and `G`, the current night: time `t`, `power`, `doors`, `cam`, `camRoom`, `mobs[]`, `lenny`, power-out fields and `over`/`paused`.
   - **Game logic:** `newGame`, `update(dt)` (runs `updateLenny`, power drain and `updateMob` for each shape), `bounce`, `powerOutStart`, `win`, `lose`, `loseLenny` and `showScare`.
   - **Actions:** `toggleDoor`, `toggleCam`, `setCam`, `setPaused`, `startNight` and `goSetup`.
   - **Rendering:** `officeLines` and `doorGrid` (the office), `renderFeed` (the cameras and wind bar), `renderGame` (the HUD and buttons), and `buildSetup`/`renderSetup` (the custom night screen).
   - **Input:** button clicks, map and setup-row clicks, one `keydown` handler that branches by screen, a `keyup` handler for `W`, and pointer-hold on `#btnWind`.
   - **Loop:** `requestAnimationFrame` drives `update(dt * speed)` and redraws the game at about 15 frames per second.

### Gotchas

- **`index.html` is a page fragment.** It has no `<!doctype>`, `<html>`, `<head>` or `<body>`, because the Artifact publisher adds them. It starts with `<title>` and `<style>`. Don't add a skeleton.
- **Keep art ASCII-only**, except the threat symbols. Non-ASCII glyphs come from fallback fonts with different widths and break the alignment. Symbols get the `.sym` class (inline-block, `1ch` wide) to keep their column.
- **Lenny's face needs a system font.** IBM Plex Mono can't draw its combining marks (U+0361 and U+035C), which show up as a box. `.face` and `.bigface` use a `system-ui` font stack. Inside the ASCII grid the face is one cell followed by 7 empty cells, so it spans 8 columns.
- **To add a camera:** update `ROOMS`, `CAM_ORDER`, `ROOM_ART`, `SLOTS`, the `#map` buttons and the `grid-template-areas` in `.map`, the `1–7` key check and the help text.
- **To add a leveled threat:** add it to `CREATURES`, or handle it separately like `LENNY`, and make sure it lands in `SETUP`. Old saved levels are padded automatically.
- **The `window.nightShift` test hook:** `nightShift.state` shows the current night, and `nightShift.speed = 20` fast-forwards time. It's harmless to leave in.

## Publishing (the live link)

The game is published with Claude's **Artifact** tool.

- **In the same session that created it:** publish the same `file_path` (`index.html`) again, and the URL stays the same.
- **From a new session or computer:** first **read** the artifact with `action: "read"` and `url: https://claude.ai/artifact/5qmjeiJHMdgo8STTf2ZAFF`. Then publish with that same `url` and `file_path: index.html`. Without the `url`, a new, separate link is created.
- If a publish is refused because a newer version exists, merge the differences it shows and publish again.
- **Page rules:** fonts may only come from Google Fonts, scripts only from cdnjs, jsDelivr or unpkg with pinned versions, and all other CSS and JS must be inline. `alert`/`confirm` don't work, and sound starts only after the player clicks or presses a key.

## Testing

- **Quick syntax check:**
  ```bash
  node -e "const h=require('fs').readFileSync('index.html','utf8');new Function(h.split('<script>')[1].split('</script>')[0]);console.log('script parses OK')"
  ```
- **Playing it locally:** wrap the fragment in a full page skeleton, then open that copy in a browser:
  ```bash
  { printf '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>[hidden]{display:none!important}</style></head><body>\n'; cat index.html; printf '\n</body></html>\n'; } > _preview-test.html
  ```
  Delete `_preview-test.html` afterwards; it's only for testing. In the Claude desktop app's browser pane, a copy inside the project folder is interactive.
- **What a full test covers:** both doors with keys and mouse; the camera staying up while doors toggle; all 7 cameras; ● staying invisible in the doorway; winding with `W` and with the button (and not working on other cameras); Lenny's warning and loss; the power-out loss; the 6 AM win (set `nightShift.state.t = 359`); and phone width with no sideways scrolling.

## Not yet verified

- **Sound has never been heard by Claude.** The rumble, footsteps, winding, tune and jumpscare volume need a human ear.
- **Balance with the new power drain has not been play-tested.** The values are 0.20% per item and no idle drain.
- **The live link has only been checked by Jake.** Claude's test browser wasn't signed in to claude.ai.
- A best score saved before Lenny existed shows `–` for his level and is totaled out of 80.

## Git history

| Commit | What changed |
|---|---|
| `b53475c` | First version of the game |
| `bf1814a` | Doors no longer lower the camera; movement sounds get louder with distance |
| `4d6bc5a` | ● hidden at doors with a rumble cue; Lenny's music box on CAM 7 |
| `0493a4d` | No idle power drain; 0.20% per door or camera; 3-bar usage meter (committed by Jake) |

The repository has **no remote**, so nothing is on GitHub or anywhere else. To move the project to another computer, either copy this whole folder, including the hidden `.git` folder, or create a GitHub repository and push to it. The live link works from any computer once you're signed in to claude.ai.
