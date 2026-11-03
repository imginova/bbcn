# ASCII Nights: project handoff

This file holds everything a new Claude session, or a person, needs to keep working on this project. Claude Code reads `CLAUDE.md` automatically when it starts in this folder. [`README.md`](README.md) is the beginner-friendly guide.

## What this is

**ASCII Nights** is a free, browser-based **FNAF fan game**: a single custom night drawn in ASCII art. It was made on 2026-11-02 as a separate project from *Bare Bones Custom Night* (`C:\git\bbcn`, repo `imginova/bbcn`). It reused that game's code layout, setup screen, sound engine and game loop, but none of BBCN's threats, ★ modifiers, modes, vents, ads, kill tally or analytics. The owner designed every character's mechanics.

- **Owner:** the `imginova` GitHub account (Jake Harris's son). They're new to programming, so explain changes in plain language and avoid jargon.
- **Where it lives:** the `ascii-nights/` folder of the BBCN repository, https://github.com/imginova/bbcn (public), on request ("just add it to bbcn's github") instead of a repo of its own. Online at https://imginova.github.io/bbcn/ascii-nights/ once merged to `main`. Changes land with a pull request into `main`, like BBCN's. (It was first made in a separate folder, `C:\git\ascii-nights`, with one commit; that copy is out of date now: work here.)

## Fan game rules (keep these)

- **It stays free.** No price, ads or donations: that's what keeps a FNAF fan game safe.
- **It must say it's a fan game.** The title screen and the top bar say so, along with "Not affiliated with Scott Cawthon or Five Nights at Freddy's". Don't remove that, and never name it as if it were an official FNAF game.
- **Nothing is copied from the real games.** The ASCII drawings, sounds and tunes are all original. Never paste in sprites, sound files, music (for example Freddy's real power-out song), the logo or word-for-word text from the games. The character names and looks are used on purpose (the owner asked for that).

## Working agreements with the owner

- **Make a plan before big features**, and ask about genuinely ambiguous design choices. Small requests can be done directly.
- **Commit only when asked.** After each change, ask "Commit these changes?". Commit as `imginova <107283216+imginova@users.noreply.github.com>` (run `git config user.email` on a new computer). No work email may appear in files or commits.
- **A harder challenge loses its ✓:** when a change makes a challenge harder (by itself or because a character in it got stronger), raise that challenge's `v` in `PRESETS`. Only the ones the change affects.
- **Never wipe saved progress.** The only saved ✓s the game may drop are older versions of a challenge whose `v` went up (`outdated` in `game.js`). Everything else in `store` stays, even what this version doesn't recognise.
- **Keep the split by job and keep the comments.** New code goes in the file whose job it matches, commented in the same beginner-friendly style (explain *why*, define jargon the first time).

## Gameplay

- **The night:** 12 AM to 6 AM, 30 real seconds per hour (`HOUR_SECONDS`).
- **Power:** starts at 100%. The monitor, each closed door, the flashlight and the fan each drain `UNIT_DRAIN` (0.5%/s). The mask is free and nothing drains while idle. At 0%: doors open, everything shuts off and, after 5–13 s, **Sleepy Moon** gets you if he's on tonight; otherwise **Freddy** does.
- **Flashlight** (on request): it lights an oval around the mouse pointer (`BEAM_COLS` 5 × `BEAM_ROWS` 2.5 characters) and "flashes" what's inside. Hold `F`, the **right mouse button** or the Flashlight button. Needs the monitor down. `aim` (in `game.js`, filled in by `updateAim` in `input.js`) says which picture the pointer is over (`'L'`, `'office'`, `'R'`) and which character cell. `beamOn(r, c)` and `beamOnDoor(side)` are the hit tests. A shut door blocks the light.
- **Mask:** `W` in the office, or the button. It can't be worn with the monitor up, and the monitor can't be raised with it on. It covers the view except for two eye holes (an SVG), and clicks only go through the holes.
- **Controls:** `A`/`D` doors, `Space`/`S` monitor, `1`–`7` cameras, `W` mask (office) or wind (CAM 7), `E` fan, `F` flashlight, `P`/`Esc` pause, `M` mute.
- **Cameras:** 7 new rooms (`ROOMS`, `ROOM_ART`): Show stage, Dining area, Backstage, Pirate cove, West hall, East hall, Prize corner. The map layout is in `.map` in `style.css`.

### The characters (each 0–20; 0 = off; a chance to act works L times in 20)

| Character | Rules as built (`game.js`) |
|---|---|
| Freddy | Every `FREDDY_INTERVAL` s he may move; each move plays `sfx.laugh(n)`. Never on cams or in the doorway. After the 3rd laugh he's at the right door: shut it within `reactWindow` for a bonk (count resets) |
| Bonnie | `BONNIE.routes`: Stage → Dining → Backstage → West hall → L, or Stage → Dining → East hall → R. On cams (`BONNIE_SLOTS`) and in the doorway. Shut the door: bonk, back to the stage |
| Golden Freddy | When you lower the monitor (`lookedBack`), a `goldenChance` he's in the office. Mask on within `goldenWindow` (one tap) |
| Phantom Chica | When you lower the monitor, a `chicaChance` (level/20, so every flip at 20) she appears with `cupcakeCount` (1/2/3) shadow cupcakes `{^}` at random `CUPCAKE_SPOTS`. Click them all within `chicaTime`, or a mini jumpscare costs `CHICA_COST` (10%) power, but not the night |
| Bonnet | On a `bonnetWait` timer she runs along the floor (`BONNET_ROWS`) across the office in `bonnetTime`. Click her nose (`.bnt-nose`) to boop her away. She dodges the pointer up/down, or forward if it's behind her (never backwards), at `BONNET_DODGE`, so coming at her from the front works |
| Withered Bonnie | `witheredWait` timer keeps counting with the monitor up but only fires once it's down. Mask on within `reactWindow`, held `MASK_HOLD` (2 s); taking it off early restarts |
| The Puppet | Box on CAM 7 drains `boxDrain`. Each tap of Wind (or `W` on CAM 7, key repeats ignored) adds `WIND_TAP` (25%). Below `BOX_LOW` a blinking ♪! shows on the Camera button and on CAM 7's map button. Empty: tune, then death after `PUPPET_DELAY` |
| Nightmare staff bot | Sits on the desk. On a `staffWait` timer it beeps (`sfx.blink(side)`) and shows `<<<`/`>>>`. Shut that door within `staffWindow` (reaction + 1 s) for a bonk. If that door is already shut when it starts, it waits (`stalled`) until you open it, then you get a fresh window. Shutting the other door does nothing |
| Nightmare Freddy | Freddles `(oo)` appear on `FREDDLE_SPOTS` every `freddleWait`. Keeping the flashlight on one for `FREDDLE_SHINE` removes it. All 3 for `nightmareArrive` s → he comes: mask on within `reactWindow` and keep it on `NIGHTMARE_HOLD` (5 s). Mask off while he's there = death |
| Withered Foxy | `phase`: `cove` (stages 0 shut, 1 peek, 2 half out; CAM 4) → `run` (CAM 5, `FOXY_RUN` s) → `door` (shut in time) → `wait` (`FOXY_WAIT`; opening now sends him back to `door`) → `ready` (stomps every `STOMP_EVERY`) → open → `open` (flash him for `FOXY_FLASH`) → `flashed` → shut → back to the cove. Shutting before the flash puts him back to `wait` |
| Sleepy Moon | `sleep` meter fills at `moonRate` while the monitor is down and the flashlight off, and drains at `MOON_WAKE` otherwise. The view darkens (`#sleepShade`), yawns at 50% and 80%, death at 100%. He's the power-out killer when on |
| Flamethrower endo | On an `endoWait` timer he stays `endoStay` s; heat rises `endoHeat` %/s (× `FAN_SLOW` 0.25 with the fan on); flames along the office floor, HEAT meter in the HUD, red glow. Cools at `COOL_RATE` (`FAN_COOL` with the fan) after he leaves. Death at 100% |

**Defaults that were chosen, not specified by the owner** (tell them if asked, change on request): Wind adds 25% per tap; Nightmare Freddy stays 5 s; opening early on Foxy makes him lunge again; Foxy waits behind the shut door forever until you do his routine (costs door power); Freddy is the power-out killer when Moon is off; Golden Freddy/Chica trigger on lowering the monitor; the numbers in `config.js` are first guesses.

**Challenges:** 13 in `PRESETS` (`data.js`), built with `lv({ id: level })`. They're hand-ordered, levels only, with ✓ saved as `clearKey` ("Name v1") and `FLAVOR` text. **All 20** (240 points) is the maximum.

**Menu icons:** `ICONS` in `art.js`, a tiny 3-line ASCII face per character (on request: "change the icons to look like the characters"; they used to be three-letter tags). `iconHtml` draws the whole face (title, setup rows); `faceHtml` draws one line (`FACE_ROW`, usually the middle), on the Best line and the win screen.

## How the code is organized

Same pattern as BBCN: `index.html` (a page **fragment**: no doctype/html/head/body), `style.css`, and classic scripts in `js/`, loaded in order and sharing the global scope (so **names must be unique across files**): `helpers.js` (`$`, `store` with prefix `asciinights:`, `pick`, `rand`, `byLevel`), `config.js`, `data.js`, `sound.js`, `art.js`, `game.js`, `render.js`, `screens.js`, `input.js`, `main.js`. `window.asciiNights` is a test hook (`.state`, `.speed`).

### Gotchas

- **Art is ASCII only** (other glyphs have different widths). Drawings use ``String.raw`...` ``, and **a line can't end with `\` right before the closing backtick** (`` \` `` is an escaped backtick, which caused a syntax error once). Add a trailing space there.
- `sprite()` draws the spaces between a line's first and last character (so a drawing hides what's behind it) but leaves the spaces around it see-through.
- Clicks on things that are redrawn often (cupcakes, Bonnet's nose) use **mousedown** (left button) plus **pointerdown** for touch, because a second mouse button pressed while the right one holds the flashlight doesn't fire a new pointerdown.
- Keep `<meta charset="utf-8">` at the top of `index.html` and `[hidden] { display: none !important; }` in `style.css`, so double-clicking `index.html` works.
- The loop only runs during a night and stops when paused or on menus; a hidden tab pauses and puts sound to sleep. Don't add timers that run outside a night.

## Hosting

BBCN's `.github/workflows/deploy.yml` (at the repository root, the only place GitHub runs workflows from) also handles this game: it runs the syntax check inside `ascii-nights/`, then `node ascii-nights/tools/build.js`, and copies `ascii-nights/dist/` into the site as `dist/ascii-nights/`. `tools/build.js` wraps the fragment in a full page (no analytics: BBCN's Google Analytics tag is only added to BBCN's page). Both games share one website address, so their saves sit side by side in the same browser storage; the different key prefixes (`asciinights:` here, `nightshift:` in BBCN) keep them apart. Keep it that way.

## Testing

- **No Node.js or Python on this Windows computer.** For the Claude desktop app's browser pane, a small PowerShell `HttpListener` server can serve the folder (a script in the session scratchpad served `http://127.0.0.1:8765/index.html`). The pane can't run `file://` pages.
- **Tested on 2026-11-02** (scripted, in the browser): every character's main rules (appear, counter, success, death), the masks, wind taps, staff bot stall, Foxy's whole routine including opening early, Moon, the endo with and without the fan, power-out killers, 6 AM win and the ✓ save. Real mouse clicks on cupcakes and Bonnet's nose, aiming the flashlight at a Freddle, phone width (375 px, no sideways scroll).
- **Not tested:** the sounds (never heard), play-balance with a real person, holding the right mouse button for real (tests set `flashKey`), touch play, the GitHub Pages deploy, and the face icons inside the jumpscare/win screens on a phone.
