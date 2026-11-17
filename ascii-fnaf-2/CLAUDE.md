# ASCII FNAF: Line 2: project handoff

This file holds everything a new Claude session, or a person, needs to keep working on this project. Claude Code reads `CLAUDE.md` automatically when it starts in this folder. [`README.md`](README.md) is the beginner-friendly guide.

## What this is

**ASCII FNAF: Line 2** is a free, browser-based **FNAF fan game**: a single custom night drawn in ASCII art, with 19 characters from **Sister Location and FNAF 4** (Nightmare BB was added later). It's a **separate game** from Line 1 (`../ascii-fnaf/`), made on 2026-11-16 by copying Line 1's code and rewriting the rules, art, sounds and look. The owner gave the whole roster and the tools at once ("Line #2: SL & fnaf 4").

- **Owner:** the `imginova` GitHub account (Jake Harris's son). They're new to programming, so explain changes in plain language and avoid jargon.
- **Private Artifact link:** https://claude.ai/artifact/5A5fDZeDRzaFK27mXXx4jn (only the owner and people they share it with can open it; see "Publishing" below).
- **Public site:** https://imginova.github.io/bbcn/ascii-fnaf-2/ (built and deployed with the rest of the site on every push to `main`, see `.github/workflows/deploy.yml`).
- **Its own saves:** everything is stored under `asciifnaf2:` (`store` in `helpers.js`), so it never touches Line 1's `asciifnaf:` levels, ✓s or kill tallies. Keep it that way.

## Fan game rules (keep these)

- **It stays free.** No price, ads or donations.
- **It must say it's an unofficial fan game.** The title screen and the top bar say so. Don't remove that.
- **Nothing is copied from the real games.** The ASCII drawings, sounds and tunes are all original. Funtime Freddy's script lines were written for this game.

## Working agreements with the owner

Same as Line 1:
- **Make a plan before big features**, and ask about genuinely ambiguous design choices. Small requests can be done directly.
- **Commit only when asked.** After each change, ask whether to commit and push. Commit as `imginova <107283216+imginova@users.noreply.github.com>`. No work email may appear in files or commits.
- **A harder or reworked challenge loses its ✓:** raise that challenge's `v` in `PRESETS`, only for the challenges the change affects.
- **Never wipe saved progress.** The only saved ✓s the game may drop are older versions of a challenge whose `v` went up (`outdated` in `game.js`). Everything else in `store` stays.
- **After every change, republish the private Artifact link.**
- **Keep the split by job and keep the comments**, in the same beginner-friendly style.

## Gameplay

- **The night:** 12 AM to 6 AM, 30 real seconds per hour; the clock shows the minute (`clockLabel`).
- **Power:** starts at 100%. The monitor, each closed door and the vent door drain `UNIT_DRAIN` (0.3%/s); a heavy door counts as `HEAVY_UNITS` (2). Each shock costs `SHOCK_COST` (1%). The Nightmare Cupcake and Nightmare Mangle drain extra while they're in. At 0%: every door opens, everything shuts off, and Nightmare Freddy gets you 5–13 s later.
- **Oxygen** (on request: its own meter that **never refills**): drained by Minireenas (each), the Nightmarionette, Ennard in the vents, Jack-o Chica's smoke and Plushtrap (`*_O2` in `config.js`). At 0% you pass out; the one draining most gets the blame (`G.lastAir`). Below `O2_LOW` a warning beeps. Oxygen never drops on its own: while something is taking it, a blinking ▼ shows by the meter, a line under the HUD names who and where (`#o2who`, `airWhere` in `render.js`), and the CAM 5 map button shows a teal ▼ while Minireenas or Plushtrap are there (on request 2026-11-17, after Minireenas out of sight on CAM 5 made it look like oxygen drained by itself).
- **Doors** (on request: both kinds on each side): normal doors (A/D) and heavy doors (Z/C). Either one stops someone walking in (`blocked(side)`), but only the heavy door stops the nightmares and Jack-o Chica. Nobody is ever seen in a doorway (on request), except Jack-o Chica's smoke.
- **Listening** (Q/E, on request "like FNAF 4"): going to a door is its own view (`G.at`, `listenGrid`, `listenText`). You can work that side's doors there, but not the monitor, the mask or the shock, and you can't go with the mask on. The breathing is also written out (`#listenNote`) so it works with the sound off.
- **Mask** (W): not on the monitor or at a door; the monitor can't go up with it on.
- **Controlled shock** (X, or the buttons): at the desk it zaps the office (`shockDesk`); on the monitor it zaps the camera you're on (`shockCamera`). `SHOCK_COOLDOWN` 0.5 s.
- **Vent door** (V): for Bidybab.
- **Cameras** (on request): 1 left hall, 2 right hall (both drawn by code, `hallGrid`, a tunnel of support frames that leans to one side, "a really cool angle"), 3 show stage, 4 Funtime Auditorium (watch Funtime Freddy: the left of the room is the left door), 5 oxygen room, 6 power room, 7 parts & service, 8 storage, 9 arcade (the last three so Nightmare Mangle has places to hide).
- **Look** (on request: "look like Sister Location", smaller font for more detail, "good atmosphere"): dark gunmetal, lavender text, magenta and teal lights, flickering lamps and signs, pipes, hazard stripes, warning signs, a low machine hum (`sfx.humOn`) and far-off clanks and drips (`sfx.ambient`). The art font is `--art` (at most 11px), the office row 84 characters wide. Each character's colors follow the official designs (on request 2026-11-17, "more accurate"): the main color in `style.css`, and hats, bow ties, hair, bibs, outfits, eyes and teeth as accent masks, added in the "accurate details" block of `art.js` with `tint()` and `region()`.

## The characters

| Character | How it works | Counter |
|---|---|---|
| Nightmare Freddy | A Freddle climbs onto the desk every `freddleWait` s; at `FREDDLE_MAX` (4) he's coming (`coming`, a reaction window) | Desk shock clears them all |
| Nightmare Bonnie / Chica | Left / right hall in `NM_STAGES` (3) steps, footsteps and seen on CAM 1 / 2 (eyes far away, big up close); then at the door, unseen | Heavy door within `reactWindow + NM_EXTRA`; they breathe behind it for `NM_STAY` (4–7 s); opening it before then gets you (`'early'`) |
| Nightmare Foxy | Either side, never on camera (`unseen`), only footsteps. Getting past the door doesn't end the night (on request 2026-11-17): he's in the office (`inside`, `foxyIn`, `foxyGrows`) and grows a stage every `NFX_GROW` (1.8 s), drawn bigger each time (`NFX_SPOTS`) | Heavy door, as above; once he's in, a desk shock before he grows past `NFX_STAGES` (3). No challenge versions were raised: it only gives a second chance |
| Nightmare Fredbear | Either hall, seen on its camera | Same as above |
| Circus Baby | Left hall in `BABY_STAGES` (3) steps with soft beeps, then in the office | Mask in time; after `BABY_CLOSE` (2.5 s) of mask she's close (two beeps); then desk shock in time |
| Ballora | Her music plays from the side she's heading to, louder each step (`BALLORA_STEPS` 3) | Shut that door (normal or heavy) |
| Funtime Freddy | His script (`makeScript`, `FFR_LINES` 9, `ffrAttacks` 1–5 important) is on the office wall. An important line sends him to a door: he walks to that side of the auditorium (CAM 4) with steps from that side, and `ffrRun` s later he's there | Shut that door (`FFR_GRACE` 1 s once he's there) |
| Funtime Foxy | The show stage's sign on CAM 3 shows the next show (a round time, `ffxGap` apart; on request 2026-11-17 it moved there from an office sign, and every challenge with him went to v2) | Be watching CAM 3 then (`FFX_GRACE` 1.5 s late is fine) |
| Ennard | Each visit: a walk down a hall (`ENNARD_STAGES`, clanks, seen on camera) or a crawl into the vents (oxygen) | Shut the door / desk shock |
| Minireenas | One appears in the oxygen room (CAM 5; on request 2026-11-17 they moved there from the office) every `minireenaWait` s, up to `MRN_MAX` (4), each using oxygen | One camera shock on CAM 5 zaps them all |
| Nightmarionette | Appears and uses oxygen fast | `NMT_SHOCKS` (3) desk shocks |
| Withered Bonnie | Walks into the office | Mask for `MASK_HOLD` (2 s) |
| Bidybab | Squeaks in the vent | Close the vent door on every `BIDY_EVERY` (3rd) squeak |
| Jack-o Chica | Stands in a doorway with an open heavy door, smoke drifting in (oxygen) | Slam that heavy door |
| Plushtrap | Turns up in the oxygen room (CAM 5), using oxygen | Watch CAM 5 for `PTR_WATCH` (2.5 s) in a row |
| Nightmare Cupcake | Eats power in the power room (CAM 6, a pink ! on the map) | Camera shock on CAM 6 |
| Nightmare Mangle | In one random room's camera, draining power; that room and `NMG_DECOYS` (2) others blink ~ on the map | Camera shock on the right room; a wrong one only wastes power |
| Nightmare BB | Added on request 2026-11-17, last in `SETUP`. Sits asleep in the office corner (`NBB_SPOT`). Each monitor flip down (`toggleCam`, `goToDoor`) may wake him (`bbMayWake`, chance `nbbChance` = level / 40) | The lamp (F, one flash, free, desk only; the owner chose a clicked lamp over a held flashlight): awake, it puts him back to sleep; asleep, it gets you (`'woke'`). Raising the monitor while he's awake gets you (`bbWatching`, `'cam'`) |

**Defaults chosen by Claude, not the owner** (tell them if asked, change on request): the heavy door also stops walkers; Ennard picks his kind of visit at random; the Nightmare Cupcake is always in the power room; the shock has a cooldown and costs 1% power; Freddles give a reaction window at the 4th; Baby's "close" comes after 2.5 s of mask; every number in `config.js` is a first guess. The owner chose: oxygen never refills; both door kinds on each side, with walking to a door to listen; Ballora's music comes from her side; Nightmare Mangle is shocked on the right camera.

**Custom night, pause roster, kill tally, challenges, auto-pause:** the same as Line 1 (`screens.js`, `whoHtml`, `countKill`, `PRESETS` with versions, `FLAVOR`). 16 starter challenges (raised a version when Funtime Foxy's showtime moved to CAM 3 and again for those with Minireenas when they moved to CAM 5): Warm-up, First shift, Circus, Ballerina, Showtime, Heavy doors, Mask up, Short of breath, Brownout, Sister Location, Bedroom, Halloween, Everyone at 5/10/15, All 20 (the maximum, 380 points). When Nightmare BB was added, Halloween got him at 12 and went to v2, and the Everyone and All 20 challenges (which now include him) went up a version.

**Controls:** A/D doors, Z/C heavy doors, Q/E listen at a door, Space/S monitor, 1–9 cameras, W mask, X shock, V vent door, F lamp, P/Esc pause, M mute.

## How the code is organized

The same split as Line 1 (see `README.md`). Plain classic scripts sharing the global scope: load order matters and names must be unique across files. `index.html` is a page fragment (no doctype/html/head/body). Art is ASCII only; drawings use `String.raw`, and a line can't end with `\` right before the closing backtick (add a space).

## Testing

- No Node.js on the Windows computer: test in the Claude browser pane. Serve the folder with the PowerShell `serve.ps1` from the session scratchpad (port 8767), then drive the game from the page: `speed = 0`, `update(0.02)`, `renderGame(performance.now())`. The pane pauses the game when it's hidden; set `G.paused = false`.
- **Tested on 2026-11-16** (scripted in the browser): every character's arrival, counter and death; listening (breathing caption, heavy door, leaving, opening too early, normal door useless against nightmares); the shock on the desk and on cameras (wrong camera wastes power); oxygen and power deaths; 6 AM win; doors, mask, monitor and shock blocked at a door; random play on every challenge with no errors. **Not yet:** a person playing it, the sounds heard by a person, phone layout.

## Publishing

- **Private Artifact:** publish `index.html` with `files` for `style.css` and the 10 scripts, from a copy in the session scratchpad. From a new session, first read https://claude.ai/artifact/5A5fDZeDRzaFK27mXXx4jn with `action: "read"`, then publish with that `url` (without it, a new separate link is made).
- **Public site:** `.github/workflows/deploy.yml` builds `ascii-fnaf-2` with its `tools/build.js` and copies it to `dist/ascii-fnaf-2`.
