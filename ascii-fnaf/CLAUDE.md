# ASCII FNAF: Line 1: project handoff

This file holds everything a new Claude session, or a person, needs to keep working on this project. Claude Code reads `CLAUDE.md` automatically when it starts in this folder. [`README.md`](README.md) is the beginner-friendly guide.

## What this is

**ASCII FNAF: Line 1** is a free, browser-based **FNAF fan game**: a single custom night drawn in ASCII art, with 17 characters. It was made on 2026-11-15 in the `ascii-fnaf/` folder of the BBCN repository (https://github.com/imginova/bbcn, public). It copies ASCII Nights' code layout, colors (phosphor green), setup screen, sound engine, flashlight, mask and game loop, but every character is new. The owner gave the whole roster at once ("Line #1"); the name was their choice.

**Look: "the style of modern ASCII Nights"** (on request). The modern ASCII Nights is the newer copy in `C:\git\ascii-nights` (29 characters), not the older one in this repo's `ascii-nights/` folder. From it this game takes: the accent colors (`ACCENT`, `ICON_ACCENTS` and the `drawing.accent` masks in `art.js`, the `acc-...` classes in `style.css`), its faces, colors and drawings for the characters both games share (Freddy, Bonnie, Chica, Foxy, Golden Freddy, Toy Bonnie, Toy Chica, the Puppet, Shadow Bonnie), black parts outlined in white, no text selection on the pictures, and Shadow Bonnie's darkness as an overlay with a hole where the flashlight shines (`#darkShade`). The other characters got accents in the same spirit. If the modern ASCII Nights changes a shared character's look, copy it here too.

- **Owner:** the `imginova` GitHub account (Jake Harris's son). They're new to programming, so explain changes in plain language and avoid jargon.
- **Private Artifact link:** https://claude.ai/artifact/X7JKE75ar2KVWn1t3E2fZX (only the owner and people they share it with can open it; see "Publishing" below).
- **Public site:** the owner asked for it to be public too: https://imginova.github.io/bbcn/ascii-fnaf/, live once the branch `add-ascii-fnaf` is merged into `main` (see "Hosting"). Changes land with a pull request into `main`, like BBCN's.

## Fan game rules (keep these)

- **It stays free.** No price, ads or donations.
- **It must say it's an unofficial fan game.** The title screen and the top bar say so, with "Not affiliated with Scott Cawthon or Five Nights at Freddy's". Don't remove that.
- **Nothing is copied from the real games.** The ASCII drawings, sounds and tunes are all original. The character names are used on purpose (the owner asked for that).

## Working agreements with the owner

- **Make a plan before big features**, and ask about genuinely ambiguous design choices. Small requests can be done directly.
- **Commit only when asked.** After each change, ask "Commit these changes?". Commit as `imginova <107283216+imginova@users.noreply.github.com>`. No work email may appear in files or commits.
- **A harder challenge loses its ✓:** raise that challenge's `v` in `PRESETS`, only for the challenges the change affects.
- **Never wipe saved progress.** The only saved ✓s the game may drop are older versions of a challenge whose `v` went up (`outdated` in `game.js`). Everything else in `store` stays.
- **After every change, republish the private Artifact link.**
- **Keep the split by job and keep the comments**, in the same beginner-friendly style.

## Gameplay

- **The night:** 12 AM to 6 AM, 30 real seconds per hour.
- **Power:** starts at 100%. The monitor, each closed door and the flashlight each drain `UNIT_DRAIN` (0.45%/s). The mask and lures are free. At 0%: doors open, everything shuts off, and Freddy gets you 5–13 s later (even if he's at level 0).
- **Flashlight:** hold `F`, the right mouse button or the button. It lights an oval around the pointer, **in the office and on the cameras** (on request). `aim.where` is `'office'`, `'feed'`, `'view'` (over the rest of the view) or null; `beamOn(r, c)` tests the office, `beamOnFeed(r, c)` the camera picture.
- **Mask:** `W` in the office. Can't be worn with the monitor up, and the monitor can't be raised with it on. Covers the view except two eye holes.
- **Monitor:** a CAMS tab (7 cameras, map) and a VENTS tab (shown only when a vent character is on: `ventsOn()`). `C`/`V` pick the tab.
- **Vents:** 8 rooms in 2 rows of 4 (`VENT_COLS`, `ventNeighbors`, `ventDist`, `ventSteps` in `data.js`); everyone starts in V1 and V8 opens into the office. Audio lures (`playLure`): click a vent or press `1`–`8` on VENTS. A crawler in that vent or next to it (`LURE_REACH`) follows with its `LURE_FOOLED` chance and skips `LURE_STALL` move chances. `LURE_COOLDOWN` 2 s. A crawler waits at least `VENT_EXIT_WAIT` in V8 before climbing in.
- **Controls:** `A`/`D` doors, `Space`/`S` monitor, `C`/`V` tabs, `1`–`7` cameras (`1`–`8` lures on VENTS), `W` mask (office) or wind (CAM 7), `F` flashlight, `P`/`Esc` pause, `M` mute. Tapping cupcakes and aiming the light need the mouse.

### The characters (each 0–20; 0 = off; a chance to act works L times in 20)

| Character | Rules as built (`game.js`) |
|---|---|
| Freddy | On the cameras (on request): `FREDDY.routes` Stage → Dining → West hall (LEFT) or East hall (RIGHT); `freddyRoom()`, drawn at `FREDDY_SLOTS` with `SPRITES.fre.cam`, static when he leaves or enters the camera you watch. At the door (step 3) he isn't drawn; the 3rd laugh is the warning. At level 0 he stays on the stage all night (the owner didn't see him on Warm-up, where he's off). Each trip picks a side; every `FREDDY_INTERVAL` s he may move and laugh (`sfx.laugh(n, side)`: louder and further to that side each time). After `FREDDY_STEPS` (3) he's at that door: shut it within `reactWindow`. Power-out killer |
| Bonnie | `BONNIE.route` Stage → Dining → Parts & service → West hall → LEFT door. Shut it in time |
| Chica | `CHICA.route` Stage → Dining → East hall → RIGHT door. Like Freddy, Bonnie and Chica stand on the stage all night when switched off (on request) |
| Foxy | Stages 1 peek, 2 half out in Pirate Cove (CAM 3), then runs (`FOXY_RUN` 3 s, shown on CAM 4). Light on the cove picture for `FOXY_FLASH` sends him back to 0 (`foxyLit`). Left door shut: bang, `FOXY_COST` (6%) power. Open: death |
| Golden Freddy | On lowering the monitor (`lookedBack`), `goldenChance` = level/20 (always at 20, on request). One tap of the mask within `goldenWindow` |
| Freddy Endo | Wanders between vents every `endoMove`. Harmless; a lure in his vent is refused ("BLOCKED") |
| Toy Freddy | Timer (`toyFreddyWait`) only counts while the monitor is down. Mask within `reactWindow`, held `MASK_HOLD` (2 s) |
| Toy Bonnie | Vents, every `TOY_BONNIE_INTERVAL` (3 s), lure chance 0.9. In the office: mask held `VENT_HOLD` (3 s) |
| Toy Chica | Vents, every 5 s, lure chance 0.45. Same office rules |
| Mangle | Crosses the ceiling (`MANGLE_ROW`) in `mangleTime`. Each `MANGLE_SHINE` of light is a flash; the light must leave them (`needOff`) before the next; `MANGLE_FLASHES` (3) sends them away |
| BB | Vents, never on the vent map and silent until he climbs in (`hidden`). In the office like Toy Bonnie, but failing makes him take the flashlight for `BB_STEAL` (20 s): `G.bb.stolenUntil`, a mini jumpscare |
| The Puppet | Music box on CAM 7 drains `boxDrain`. **One click of Wind fills it** (`windBox`). Below `BOX_LOW`: ♪! on the Camera button and CAM 7's map button |
| Toy cupcake | Every `cupcakeWait` s, appears at a random spot over the whole view (`#cupcake`, above the mask and monitor), beeping. Tap within `cupcakeTime` or game over (owner's choice) |
| Shadow Freddy | Sits on a random camera (never the one you're watching); its map button shows a blinking red !. `SFR_FLASH` of light on him (`beamOnFeed`) removes him; `shadowFreddyTime` or death |
| Shadow Bonnie | The office goes dark (`#darkShade`, a hole where the light is); his white eyes `O O` sit at one of `SHADOW_EYES` (never over the vent). `SBN_SHINE` of steady light, within `shadowBonnieTime` |
| Crying Child | The sticky note (`NOTE_SPOT`) names his camera. Watching it fills `stare` (sobs get louder); `childStare` seconds = death; looking away drains it at `CHILD_COOL`. He moves (`moveChild`) every time the monitor is put down (`toggleCam`; on request, 2026-11-15, which raised the older challenges with him to v2: Camera shy, Everyone at 10, Everyone at 15, All 20; the new ones from the same day stayed v1) and every `childMove` s while it's down, never to `G.closedOn` (the camera the monitor was last lowered on) |
| Springtrap | Vents, every 8 s, lure chance 0.95. Climbing in = death (the mask doesn't work). The V8 bang (`sfx.ventNear`) is the warning |

**Defaults chosen by Claude, not the owner** (tell them if asked, change on request): Freddy picks a side per trip; Foxy kills at once if the door is open when he arrives; Freddy Endo never attacks; Mangle needs 3 flashes; one click fills the music box; failing Shadow Freddy, Shadow Bonnie or the Crying Child is a death; BB is fooled by lures a little (0.45) though you can't see him; vent visitors get an extra second (`reactWindow + 1`) because you may be on the monitor; the vent map has 8 rooms; all numbers in `config.js` are first guesses. The owner chose: BB takes the flashlight for 20 seconds; a missed cupcake is game over.

**Challenges:** 26 in `PRESETS` (`data.js`), hand-ordered by rough difficulty (no bot ranking yet), with `FLAVOR` text. 13 more were added on request on 2026-11-15, most built around a group from the roster: Night watch, Fox hunt (Foxy + Mangle), Hall monitors (doors only), Fresh paint (mask only), Pizza party, Balloon trouble, Don't stare, Shadow play, Bunny trouble (every rabbit), Bear trap (every bear), Haunted, Everyone at 5 and Crawl space (every vent crawler and Endo at 20). No two challenges may share exactly the same levels. **All 20** (340 points) is the maximum.

**Kill tally** (on request, like modern ASCII Nights): every death adds one to that character's count in `kills` (`countKill` in `game.js`, called from `lose`; a power-out death counts for Freddy). The game over screen adds "Bonnie has got you 3 times.", and each custom night card shows "☠3" in red in its corner once it's above 0 (`#kills{i}`, filled by `renderSetup`; the info box spells it out as "☠ Got you 3 times"). Saved in `store` key `kills`. BB taking the flashlight isn't a death, so it doesn't count.

**Custom night grid** (on request, "like in the games"): the setup screen is a grid of cards (`.rows` with `repeat(auto-fill, minmax(120px, 1fr))`: 6 across on a computer, 3 on a phone), each with the face, name, level and − / +. How a character works isn't on the card: pointing at a card shows its name, where it comes from, its `desc` and kill tally in the info box under the grid (`#who`, `renderWho`, `whoHtml` in `screens.js`; `hoverCard` is the card under the pointer, and the selected card shows when the pointer is off the grid). Keys are unchanged: ↑ ↓ move through the cards in order, ← → change the level.

**Pause roster** (on request): the pause panel lists everyone on tonight (level above 0) as small cards (`#pauseRoster`, filled by `showPause`), and pointing at one (or tapping it on a phone) shows how it works in `#pauseInfo`. The buttons sit above the roster so Resume stays in view on a phone, where all 17 cards make the panel scroll.

## How the code is organized

Same pattern as ASCII Nights: `index.html` (a page **fragment**), `style.css`, and classic scripts in `js/` sharing the global scope (so **names must be unique across files**): `helpers.js` (`store` prefix `asciifnaf:`), `config.js`, `data.js`, `sound.js`, `art.js`, `game.js`, `render.js`, `screens.js`, `input.js`, `main.js`. `window.asciiFnaf` is a test hook (`.state`, `.speed`).

### Gotchas

- **Art is ASCII only.** A ``String.raw`...` `` line can't end with `\` right before the closing backtick: add a trailing space.
- Things redrawn often (vent buttons, the cupcake) react on **pointerdown/mousedown**, not click.
- Keep `<meta charset="utf-8">` in `index.html` and `[hidden] { display: none !important; }` in `style.css`, so double-clicking `index.html` works.
- The loop only runs during a night; don't add timers that run outside one.

## Hosting

BBCN's `.github/workflows/deploy.yml` (at the repository root, the only place GitHub runs workflows from) also handles this game: a syntax check step with `working-directory: ascii-fnaf`, then `node ascii-fnaf/tools/build.js` and `cp -r ascii-fnaf/dist dist/ascii-fnaf` in the build step. (The `add-ascii-nights` branch changes the same file for ASCII Nights; whichever is merged second must keep both games' steps.) `tools/build.js` wraps the fragment in a full page; `dist/` is gitignored. The saves use the prefix `asciifnaf:`, so they don't mix with the other two games on the same site.

## Publishing (the private Artifact link)

Publish `file_path: index.html` with every other file in `files` (`style.css` and all ten `js/*.js`, each mapped to the same path). From a new session, first `read` the artifact by its URL, then publish with that `url`.

## Testing

- **No Node.js or Python on the Windows computer.** A PowerShell `HttpListener` script in the session scratchpad served the folder at `http://127.0.0.1:8766/index.html` (adding a doctype in front of the fragment) for the browser pane.
- **Tested on 2026-11-15** (scripted in the browser): every character's appear / counter / death; mask early-off restart; lockouts (mask vs monitor); lures (follow, cooldown, Endo blocking, not fooled); BB's steal and return; power-out; 6 AM win and ✓ save. Real key presses (doors, tabs, lures, cameras, wind, mask), real clicks on a vent and the cupcake, real pointer aim on the camera (Foxy) and in the dark office. Phone width (375 px) with no sideways scroll. 39 random-input nights across every challenge with no errors.
- **Not tested:** the sounds (never heard), balance with a real person, holding the right mouse button for real, touch play.
