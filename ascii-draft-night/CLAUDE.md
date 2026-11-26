# ASCII FNAF: Draft Night: project handoff

This file holds everything a new Claude session, or a person, needs to keep working on this game. [`README.md`](README.md) is the beginner-friendly guide.

## What this is

**ASCII FNAF: Draft Night** is a free, browser-based **FNAF fan game** in ASCII art, and a **roguelite**: a run is several nights in a row, and between nights you build your own lineup of characters. It was made on 2026-11-25 in the `ascii-draft-night/` folder of the BBCN repository (https://github.com/imginova/bbcn, public). It reuses the file layout, sound engine, grid drawing, flashlight, mask, vents and game loop of ASCII FNAF: Line 1, and some mechanics and drawings from Line 2 and ASCII Nights (`C:\git\ascii-nights`), but the office, the run and the roster setup are new.

The owner's request: "a fnaf rouge-lite-ish where you survive through nights while trying to use the set of characters you get to choose in between nights, with each of them being under a rarity that dictates both rough difficulty and how many points it gives and you need to survive a night with a certain amount of points to win". Choices the owner made when asked: brand-new characters that the owner listed (the roster below); after each night, take **as many as you want out of 5**; picks **stay** for the whole run; **a few lives** (3; a death replays the same night); a new folder in bbcn; a new office; Chica goes to the **right** door; heat **rises, the fan cools it, and 100% kills**; Withered Freddy is seen **through office windows**; Nightmare Fredbear's attacks are a mix of Nightmare Bonnie + Withered Freddy, plus harder Toy Freddy and harder Plushtrap; the name; the look "**mixed by rarity**" (a grey office, color from the characters and the rarity colors); the numbers (Common 5, Uncommon 10, Rare 20, Epic 35, Legendary 50 points, 3 lives, goal 150; difficulties with other goals came later, see The run). Then "add everyone": all 25 at once instead of three batches.

- **Owner:** the `imginova` GitHub account (Jake Harris's son). New to programming: explain in plain language.
- **Private Artifact link:** https://claude.ai/artifact/3Q7XkjUzzhzN27aU1V73KV (only the owner and people they share it with can open it; see "Publishing" below).
- **Public site:** https://imginova.github.io/bbcn/ascii-draft-night/ once merged to `main` (the root `.github/workflows/deploy.yml` checks and builds it).
- **Its own saves:** prefix `draftnight:` (`store` in `helpers.js`): `run` (the run in progress or null), `records` (`runs`, `wins`, `bestNight`, `bestPoints`, `fastestWin`), `kills` ({ id: count }, plus `heat`), `muted`. Never mix with the other games' prefixes.

## Fan game rules (keep these)

- It stays free. It says it's an unofficial fan game ("Not affiliated with Scott Cawthon or Five Nights at Freddy's") on the title and the top bar.
- Nothing is copied from the real games: the ASCII drawings, sounds and tunes are original. Character names are used on purpose.
  - **Amendment (the owner's direction, 2026-11-25):** there is a meaningful difference between **copying** (not allowed: lifting the games' actual art, sprites, sounds or music into this project) and **referencing** (good: looking at the official designs so our own ASCII drawings are recognizable as the characters). The owner prefers characters to be recognizable over being fully original.

## Working agreements with the owner

- **Make a plan before big features**, and ask about genuinely ambiguous design choices. Small requests can be done directly.
- **Commit only when asked.** After each change, ask "Commit these changes?". Commit as `imginova <107283216+imginova@users.noreply.github.com>`. No work email may appear in files or commits.
- **Never wipe saved progress.** Saved things are only added to. A saved run whose lineup has an id this version doesn't know keeps that id (`charsOf` skips it for play; the saved list is untouched).
- **After every change, republish the private Artifact link.**
- **Keep the split by job and keep the comments**, in the same beginner-friendly style.

## The run (`run.js`)

- **Title:** Continue run (if one is saved) / New run (asks twice when a run is saved: `pressNewRun`, `confirmNew`) / How to play, plus the records line.
- **Pick screen** (`#scr-pick`, `renderPick`): `OFFER_SIZE` (5) cards from characters not in the lineup (`makeOffer`: each card rolls a rarity by `RARITIES[r].weight`, 40/27/18/10/5, among rarities that still have someone left, then a random character of it; sorted common first). Click a card or press 1–5 to take it or put it back (`togglePick`, `run.picked`). The info box shows the pointed-at card (`hoverCard`, `whoHtml`). "Start night" (`beginNight`) moves the picks into `run.lineup` for good. Night 1 has a pick screen too. Taking nothing is allowed (safe, but no progress).
- **Difficulties** (on request, 2026-11-25: "different difficulties where you need more total points to win"; the owner chose 4 steps and records per difficulty): `DIFFICULTIES` in `config.js`, Easy 100, Normal 150, Hard 250, Nightmare 400 points. A difficulty only changes the goal. Picked on the title screen (`#diffs` buttons, or `D` to step through), saved in `store` key `difficulty`, and used only when a **new** run starts (`run.diff`); a run in progress keeps its own. `diffOf(run)` / `goalOf(run)`: a run saved before difficulties (no `diff`) counts as Normal, the old goal. The pick screen, the Continue button and the 6 AM screen show the run's difficulty.
- **Records per difficulty:** `records.diffs` holds `{ wins, fastestWin }` for each difficulty (`diffRecord(d)`). Records saved before difficulties get their wins copied into `diffs.normal` at load; the old `wins` and `fastestWin` stay and keep counting every difficulty. Tested with a fake old save (a run and 2 wins, plus an unknown key): it loaded as Normal and nothing was lost.
- **Night survived** (`nightSurvived`): if the lineup is worth `goalOf(run)` or more, the run is won (`run = null`, records updated, `sfx.fanfare`). Otherwise `run.night++` and a new offer.
- **Caught** (`nightLost`): one life gone; the scare screen says CAUGHT and offers "Retry night N". At 0 lives: RUN OVER, `run = null`, "New run".
- **Quitting mid-night** (pause → Quit to title) keeps the run; that night starts again from 12 AM (no life lost). Closing the page does the same.
- All 33 characters (25 + 8 bonus) are worth 570 points in total.
- **The painted office** (on request, 2026-11-25: "the more characters added the more the office would be colored by the rarity of the character"; the owner chose "piece by piece"): the office starts dim grey; each character in `run.lineup`, in pick order, paints the next part of `OFFICE_PARTS` (`art.js`: poster, monitor, left and right door frames, vent, desk front, windows, floor, desk top and legs, ceiling) in its rarity class (`officePaints` in `render.js`, `paintOffice`, the door frames in `doorGrid`). With more characters than parts (11) it wraps round, so later picks paint over earlier ones. Painted cells get `.paint` (bold, soft glow).
- **The painted cameras** (on request, 2026-11-25: "have the colors of your picks extend to the cams"): the same picks also paint the camera rooms, one whole room each in pick order (1st pick CAM 1, 2nd CAM 2, ... 9th CAM 9, then round again, later picks painting over). `camPaints()` in `render.js` gives `{ room: rarity class }`; `renderFeed` calls `paintRoom(g, cls)` (`art.js`) right after drawing the room, before the characters, so they keep their own colors. Static isn't painted.

## The office

- **The night:** 12 AM to 6 AM, `HOUR_SECONDS` (20) real seconds per hour, so 2 minutes (`clockLabel` shows the minute). It was 30 (3 minutes) until the owner asked for shorter nights; `UNIT_DRAIN` (0.3 → 0.45) and `HEAT_RISE` (0.75 → 1.1) went up 1.5× so power and heat still last the same share of the night. Characters act on real seconds, so a night now has about a third fewer visits.
- **Power:** starts at 100%. The monitor, each closed door, the flashlight and the fan drain `UNIT_DRAIN` (0.45%/s); each shock costs `SHOCK_COST` (1%); Foxy's bang `FOXY_COST` (6%). Mask and lures are free. At 0%: everything shuts off and **Freddy** gets you 5–13 s later (even if he isn't in the lineup).
- **Heat:** starts at `HEAT_START` (10%), rises `HEAT_RISE` (1.1%/s) unless the fan is on (`FAN_COOL` 5%/s down). A breath at 70% and 85% (`HOT_WARN`), a red glow from 70%. At 100%: `passOut()`, a game over that costs a life (kill tally key `heat`). Bonnie moves faster in the heat (`bonnieSpeed`: up to 3× at 100%).
- **Layout:** left door (12 wide) + office (44 × 16, `OFFICE_ART`) + right door. The office has a **window** at each end (`WINDOWS`, inside 6 × 3), the poster, the vent, the monitor, the **fan** on the desk (spins when on, `FAN_SPIN`).
- **Flashlight:** hold F / right mouse / the button. `beamOn` (office), `beamOnFeed` (cameras), `doorLit(side)` (a doorway, **only while that door is open**: a shut door blocks the light).
- **Mask:** W in the office. Not with the monitor up; the monitor can't go up with it on.
- **Monitor:** CAMS (9 cameras: 1 Show stage, 2 Dining, 3 Pirate cove, 4 West hall, 5 East hall, 6 Prize corner (music box), 7 Funtime Auditorium, 8 Parts & service, 9 Kitchen (added with Cookie Freddy)) and VENTS (only with Toy Bonnie or Toy Chica: 15 vents, 3 × 5, lures like Line 1).
- **Controlled shock:** X / the Shock button (shown only with Springtrap or Baby: `shockOn`). Zaps the camera you're on (`shock`), `SHOCK_COOLDOWN` 1 s.
- **Controls:** A/D doors, Space/S monitor, C/V tabs, 1–9 cameras (arrow keys + Enter on VENTS), W mask / wind on CAM 6, F flashlight, E fan, X shock, L/O while Lolbit's screen is up, P/Esc pause, M mute. Clicks: Chica's cupcakes and Bonnet's nose (`clickOffice`), Nightmare Chica's cupcake (`clickFeed`); both use the pointer's row/column (`aim`) on `pointerdown`.

## The characters

No levels: each character always plays the same; its numbers are in its own block in `config.js`. "My reading" = a detail Claude chose where the owner's description left it open (tell the owner if asked).

| Rarity | Character | As built (`game.js`) |
|---|---|---|
| Common | Freddy | Line 1's: laughs as he walks stage → dining → a hall; 3rd laugh = at that door, shut it. Power-out killer |
| Common | Bonnie | Left route (stage, dining, parts, west hall), eyes only in the dark doorway; faster with heat |
| Common | Chica | Right route. Shut out, she drops 1–3 cupcakes (`{^}`, `CUPCAKE_SPOTS`) in the office: click all in `CUP_TIME_BASE + CUP_TIME_EACH × n` s (the clock only runs while you can see the office), or she gets you |
| Common | Toy Bonnie / Toy Chica | Line 1's vent crawlers; lure chance 0.85 / 0.45; mask `VENT_HOLD` 3 s |
| Common | The Puppet | Music box on CAM 6, one click of Wind fills it, ♪! warning |
| Common | Nightmare Freddy | Freddles (`FREDDLE_SPOTS`, 3) climb on the desk every 12–22 s; 0.5 s of light each sends one off; all 3 up for `NFR_ARRIVE` (4 s, growl warning) = death |
| Common | Trash and the Gang | Was "Trash gang". On request (2026-11-25) made accurate to FNAF 6's Trash and the Gang, **minus Mr. Hugs** (the owner has plans for him): each visit one of Bucket Bob, Mr. Can-Do, No. 1 Crate or Pan Stan (`TRASH_MEMBERS`, `SPRITES.trs.bob/can/crate/pan`, colored with `tintBox`, looks from the FNAF wiki) stands in front of a random camera for 10–16 s, filling most of it (`TRASH_SPOT`). Never attacks (my reading of "obscure vision on cams"). The id stays `trs` |
| Common | Lolbit | ASCII Nights' LOL screen; type L O L. Never attacks |
| Uncommon | Foxy | Line 1's Pirate Cove stages; light on the cove pushes him back; run → left door shut costs 6% power |
| Uncommon | Golden Freddy | On monitor down (`lookedBack`), `GOLDEN_CHANCE` 0.3; mask within 1.8 s |
| Uncommon | Toy Freddy | Timer runs and he walks in **even with the monitor up**; mask held 1.5 s; window `REACT_WINDOW + 2` |
| Uncommon | Nightmare Bonnie | Appears in a random doorway (breathing from that side); flash him 0.5 s within 4.5 s; door must be open |
| Uncommon | Bonnet | ASCII Nights' Bonnet, scaled to the 44-wide floor (`BONNET_ROWS`); boop her nose in 6 s |
| Rare | Withered Bonnie | Timer never stops, but at 0 he waits for the monitor to go down; mask held 2.5 s |
| Rare | Withered Foxy | Owner's routine: run (steps, seen on CAM 4) → door must be shut → wait → STOMP → open → flash 0.5 s → shut again → leaves. Opening before the stomp puts him in the doorway (shut in time) |
| Rare | Springtrap | Route parts → dining → east hall → office (`SPRING.route`). Shock his camera: back one room. From the last room he climbs in (after `LAST_ROOM_WAIT` 3 s) |
| Rare | Nightmare Chica | Strange noise, and she stands in the office (`NCHICA_OFFICE_SPOT`, blinking in her last 5 s; on request) while her cupcake `{,}` is hidden (dim) at one of `NCHICA_SPOTS` on a random camera; click it within 20 s |
| Rare | Circus Baby | Route auditorium → dining → west hall → office, faster; a shock sends her back to the start |
| Epic | Shadow Bonnie | Line 1's: dark office, find his eyes, 0.8 s of light |
| Epic | Plushtrap | Hides at a `PLUSH_SPOTS` spot with a giggle; any light = gone; 2.5 s |
| Epic | Funtime Freddy | Line 2's rules, but with endless lines (`FFR_LINE_GAP`, 40% attacks) instead of a fixed script; side shown on CAM 7, switches every 16–28 s; subtitles (`#subtitle`) |
| Legendary | Withered Freddy | Paces `PROWL_PATH` (L door, L window, middle, R window, R door) every 2.2 s, may turn round in the middle; seen only in the windows; no sound. At a door, 60% tries to get in (eyes in the doorway): shut it within 3 s |
| Legendary | Funtime Foxy | Line 2's showtime, on the **CAM 1** stage sign (`roundShow`, 40–60 s apart); be watching CAM 1 then (1.5 s grace) |
| Legendary | Nightmare Fredbear | Every 22–34 s one attack, picked at random: `prowl` (walks past a window to a door, breathes, then flash him 0.6 s within 3.5 s; a shut door doesn't help), `toy` (mask within 2.5 s, held 3 s), `plush` (his little plush hides; shine it within 1.8 s) |


### The bonus characters (added 2026-11-25)

The owner's second list: "bonus characters that tend to be both more obscure and gimmicky". They have `bonus: true` in `data.js` (a BONUS tag on their cards, ", bonus" after the rarity in the info box and How to play) and are dealt like everyone else, by rarity. The owner asked Claude to sort them all into rarities ("I'm not a good judge of difficulty"); the owner's own first guesses were Bounce pot uncommon, Flamethrower endo and Hand-unit rare, Plush babies epic. **Mr. Hugs is not in Trash and the Gang on purpose: the owner has plans for him** (maybe a later bonus character). With them the roster is 33 characters, 570 points.

| Rarity | Character | As built |
|---|---|---|
| Common | Salvage sign | Owner chose: taking it **brings the Shock button along** even without Springtrap or Baby (`shockOn`). Each shock has `SALVAGE_CHANCE` (40%) of popping up a SALVAGE sign on the camera (`G.slv.presses`, drawn by `renderFeed`): press Shock `SALVAGE_PRESSES` (3) more times, no charging needed, and the last one zaps. Never attacks |
| Uncommon | Watermelon Chica | Turns up in a random doorway (bouncing it open if it was shut). Shutting that door on her (`watermelonShut`, called from `toggleDoor`) bounces it back open 0.25 s later (`popAt`), until the 3rd shut (`WMC_SHUTS`): then it stays shut and she leaves. `WMC_TIME` 6 s or she gets you |
| Uncommon | Hand-unit | On monitor down (`lookedBack`), `HAND_CHANCE` 20%. While he's in, every key press goes to him (input.js; held keys don't count) and tapping him counts too (`mashHand`): `HAND_PRESSES` 15 within `HAND_TIME` 4 s, or he gets you |
| Uncommon | Bounce pot | Owner chose: **dodge it with the mouse pointer all night**. It bounces around the whole view (over office and monitor, `#bouncepot`, clicks pass through), positions as fractions of the view; the pointer's are `aim.fx`/`aim.fy`. A hit costs `BOUNCE_COST` 3% power, then `BOUNCE_SAFE` 1.5 s with no hits. Never attacks |
| Uncommon | Munchie | Owner chose: **blocks the view, then gets you**. Clings to the screen (`#munchie`, over everything, catches clicks) for `MUNCHIE_TIME` 8 s. Grab it and flick: input.js measures the pointer over the last 0.1 s on release; `MUNCHIE_FLICK` 900 px/s or more throws it off (`flickMunchie`), slower just drops it where it is (`dragMunchie`). **Its look** (redrawn again on request, from the official picture the owner shared, under the fan-game rules' "referencing" amendment): chattering teeth seen from the side, mouth open to the left: two big eyes at the back with heavy dark lids (`#` in the `D` accent, `acc-dark`) and blue irises looking down, an upper jaw with big triangle teeth hanging down, two slanted posts, and a lower jaw with big teeth pointing up (`SPRITES.mun.grab`; the jumpscare is head on). **Munchie is silver all over** (`--c-mun`, no tints on the body): the owner explained that the pink and tan in the official picture are only its lighting. The owner also felt a first version looked "merged" with Cookie Freddy (white eye rings and the same hot pink as his hat), so it was redrawn from the picture alone. (An earlier redraw, a round fuzzy chewer with suction-cup paws, was replaced too) |
| Rare | Cookie Freddy | Stands in the office (`COOKIE_SPOT`) with his order written on the floor ("COAT ME IN: ..."). Click those `COOKIE_ASKS` (2) of `INGREDIENTS` on the new **CAM 9 Kitchen** (`KITCHEN_JARS`, `pickIngredient` via `clickFeed`) within `COOKIE_TIME` 16 s; a wrong one costs `COOKIE_WRONG` 2 s. Taken ones light up on the shelf. **His look** (redrawn on request from the official picture the owner shared): a Freddy head dipped in chocolate, with the brown `n` accent (`acc-brown`, added for him) on the ears and dripping coating, rainbow sprinkles (`:`), a pink top hat and bow tie, blue eye rings with pink middles, a teal nose and rainbow teeth |
| Rare | Flamethrower endo | Like ASCII Nights' endo: every 28–42 s he stays 10–14 s, adding `ENDO_HEAT` 6%/s; the fan only slows heating to `FAN_SLOW` (0.25) while he's in (`updateHeat`). 100% heat while he's in = he gets the blame. Flames flicker along the office floor (`FLAME_ROWS`) |
| Epic | Plush babies | Owner chose: **shine them; ones on the screen stay**. One every 9–16 s in a free spot of four (`G.pbb.spots`: doorL, doorR, winL, winR), each on its own clock. `PB_SHINE` 0.5 s of light sends one off (`plushLit`: `doorLit` for doorways, so the door must be open; the beam on the window's middle for windows). Left `PB_NEGLECT` 12 s (they blink for the last 3), it climbs onto your screen (`onScreen`): the 1st hides the top-left corner, the 2nd the top-right (`#pbCornerL/R`), the 3rd (`PB_DEADLY`) gets you. A power-out clears the spots but not the screen |

**Tested 2026-11-25** in the browser, by script: every bonus character's counter and failure, the Salvage sign's three presses, Watermelon Chica's bounces, keyboard mashing with real key events (and that it didn't shut a door), a slow drag versus a fast flick on Munchie with pointer events, the wrong-ingredient penalty, the endo's heat with the fan, a plush baby shone in a window and three on the screen; 10 random-input nights with all 33 on (no errors).
**All numbers are first guesses.** Nothing has been play-tested by a person, and there's no bot balance test yet, so the rarities may not line up with real difficulty.

## How the code is organized

`index.html` (a page **fragment**), `style.css`, and classic scripts in `js/` sharing the global scope (so **names must be unique across files**): `helpers.js`, `config.js`, `data.js`, `sound.js`, `art.js`, `run.js`, `game.js`, `render.js`, `screens.js`, `input.js`, `main.js`. `window.draftNight` is a test hook (`.state`, `.run`, `.speed`).

- **Adding a character:** its description in `data.js` (with `rarity`) and in `ROSTER`; its face in `ICONS`/`ICON_ACCENTS` and drawings in `SPRITES` (`art.js`); a `--c-id` color and `.c-id` class in `style.css`; numbers in `config.js`; its state in `newGame` (with `on: isOn(X)`), an `update...` function in the `update()` list, and a cleanup line in `powerOutStart` (`game.js`); drawing in `render.js`. How to play's character list is built from `desc` automatically (`buildHowto`).

### Gotchas

- **Art is ASCII only.** A ``String.raw`...` `` line can't end with `\` right before the closing backtick: add a trailing space.
- **The Bash tool on this Windows computer** sometimes refuses a heredoc with drawings in it ("unexpected EOF"); write the text to a scratch file with the Write tool and `cat >>` it instead.
- Keep `<meta charset="utf-8">` in `index.html` and `[hidden] { display: none !important; }` in `style.css`, so double-clicking `index.html` works.
- `show()` and `hideScare()` blur the focused button: a hidden button that kept focus swallowed Enter (found in testing).
- The game loop's `dt` is clamped at 0, or the first frame could show "-1:-1 AM".
- The loop only runs during a night; don't add timers that run outside one.

## Publishing (the private Artifact link)

Publish `file_path: index.html` with every other file in `files` (`style.css` and all eleven `js/*.js`, each mapped to the same path). From a new session, first `read` the artifact by its URL, then publish with that `url`.

## Testing

- **No Node.js or Python on the Windows computer.** A PowerShell `HttpListener` script (in the session scratchpad) served the folder at `http://127.0.0.1:8767/` (adding a doctype) for the browser pane. Loading the page with no console errors is the syntax check there (a duplicate name across files would throw).
- **Tested on 2026-11-25** (scripted in the browser): the run (picks by mouse and keys 1–5, Enter, a night won, a life lost, run over, Continue, the won screen), the offer odds (2000 offers: 40/27/18/10/5%), every character's counter and failure (all 16 new ones one by one: Foxy push-back and bang, Golden, Toy Freddy with the monitor up, Withered Bonnie waiting, Nightmare Bonnie blocked by a shut door, Bonnet boop and escape, Withered Foxy's whole routine and opening early, both shocks, Springtrap getting in, Nightmare Chica's click, Shadow Bonnie, Plushtrap, Funtime Freddy's door, Withered Freddy trying and being shut out, Funtime Foxy watched and missed, all three Fredbear attacks), power-out, passing out, 12 random-input nights with all 25 on (no errors), phone width (no sideways scroll).
- **Not tested:** the sounds (never heard), balance with a real person, touch play. On a phone the office picture is very small (68 characters wide).
