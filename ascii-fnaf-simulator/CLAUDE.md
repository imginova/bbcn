# ASCII FNAF Simulator: project handoff

This file holds everything a new Claude session, or a person, needs to keep working on this game. [`README.md`](README.md) is the beginner-friendly guide.

## What this is

**ASCII FNAF Simulator** is a free, browser-based **reverse FNAF fan game** in ASCII art: **you control the animatronics, and the computer plays the night guard.** Catch the guard before 6 AM. It was made on 2026-11-20 in the `ascii-fnaf-simulator/` folder of the BBCN repository (https://github.com/imginova/bbcn, public). It reuses the file layout, sound engine, grid drawing and game loop of ASCII FNAF: Line 1 and Line 2, and some of Line 1's faces, but the rules are all new.

The owner's request: "a reverse fnaf-like ASCII game where your goal is to use your animatronics to kill the cpu nightguard before 6 am, 10 nights then a custom night where you can decide anything about the night, night guards with different abilities, the animatronics you control different every night but with cohesive themes". Choices the owner made when asked: FNAF characters by name; control = map moves + one ability each; nights are picked for **gameplay niches** ("a mix of all", not one game per night); the name; purple; the guard info shown (office cam + tells); every custom night option. Later in the same session: "have at least the withereds, Lolbit and Mangle", then "a good amount of characters" (31 now).

- **Owner:** the `imginova` GitHub account (Jake Harris's son). New to programming: explain in plain language.
- **Private Artifact link:** https://claude.ai/artifact/2jfk4WEHXSCrWAqV8X1Mx3 (only the owner and people they share it with can open it; see "Publishing" below).
- **Public site:** https://imginova.github.io/bbcn/ascii-fnaf-simulator/ once merged to `main` (the root `.github/workflows/deploy.yml` checks and builds it).
- **Its own saves:** prefix `asciifnafsim:` (`store` in `helpers.js`): `beaten` (night numbers won), `challenges` (custom night challenges won, as "Max mode v2"; older versions stay saved but don't count), `catches` ({ crew id: count }, the animatronics' kill counter), `guardCaught` ({ guard id: count }, the guards' kill counter), `achievements` (ids), `custom` (the custom night settings), `muted`. Never mix with the other games' prefixes.

## Fan game rules (keep these)

- It stays free. It says it's an unofficial fan game ("Not affiliated with Scott Cawthon or Five Nights at Freddy's") on the title and the top bar.
- Nothing is copied from the real games: the ASCII faces, sounds and tunes are original. Character names are used on purpose.

## Working agreements with the owner

Same as the other games: plan before big features and ask about real design choices; commit only when asked (as `imginova <107283216+imginova@users.noreply.github.com>`, no work email anywhere); never wipe saved progress (`beaten` is only ever added to); republish the private Artifact after every change; keep the split by job and the beginner-friendly comments. **A harder challenge loses its ✓:** raise its `v` in `CHALLENGES` (Max mode went to v2 when The Tendons 8 got death coins and Lockdown).

## How a night works

- **Clock:** 12 AM to 6 AM, `HOUR_SECONDS` (30) per hour; the custom night can change it. At 6 AM the guard wins.
- **Map** (`ROOMS` in `data.js`): 14 rooms on a 4 × 4 grid with the office at row 4, column 2. `to` lists which rooms join. Three ways in (`ENTRIES`): the W. Corner → LEFT door, the E. Corner → RIGHT door, Vent C → VENT. Vent rooms only fit `vents: true` animatronics. The Kitchen (CAM 6) is sound-only: the guard can never see anyone there. `DIST` (moves from the office) is worked out by a flood fill.
- **Your controls:** pick with 1–9 / 0, Tab, or a card; click a lit room next to it to walk (each has a `move` cooldown); from a corner (or Vent C) click LEFT / RIGHT / VENT on the office square or press E to attack; Q uses the ability. P/Esc pause, M mute. The night pauses itself on tab switch or window blur.
- **An attack:** the animatronic stands in the doorway for its `attack` seconds. If the guard notices (`noticeChance`, a **per-second** chance rolled every frame in `rollNotice`), it reacts after `guardReact(skill)` (+`LOWER_CAM` if its monitor was up) with the first counter that works (`counter`): shut door / vent door (`canShut`: the Doors tool includes the vent door; the Vent door tool is for a guard with no other doors), flashlight (`flashable`), mask (`maskable`), audio lure (`lurable`), hide, and last **duck** (every guard has it: `DUCK_COOLDOWN` 40 s, or a third of that for a guard with no doors). If an attack it noticed still reaches the end and it has a **death coin** (`coins` tool), it spends one and that animatronic is gone for the night (`deathCoin`; also used on the Puppet when the music box empties). If nothing works right then (lights cut, door jammed or pried, lure on cooldown), it keeps trying every 0.4 s (`helpless`). A door already shut (or the mask/hide already on) knocks you back at once. Stopped = sent home and frozen `BONK_STUN` (5 s). Foxy banging on a shut door costs the guard `FOXY_BONK_POWER` (6%).
- **Winning:** an attack lands; the guard's power hits 0 (`POWER_OUT_WIN` 4 s later, Freddy or the first walker walks in); or the music box empties (the Puppet, `PUPPET_DELAY` 4 s later).

### The guard's brain (`game.js`)

The guard only knows what it **sees** or **hears**:
- `observe()` every frame: the camera it's on (`seeRoom`: memory of who's there, forgets who isn't, marks corners empty) and a door light if on (`seeCorner`, which also sees Ballora and Freddy).
- `moveUnit` rolls `hearChance` for each of your moves (louder near the office); a heard room counts as a clue.
- `think()` every `guardThink(skill)` s: reboot broken cameras → wind the music box below `windAt(skill)` → `tryLockdown` (`lockdown` tool: when an attack is on or it knows someone is right outside, no abilities for `LOCKDOWN_TIME` 5 s, every `LOCKDOWN_COOLDOWN` 40 s) → deal with pests (flash or shoo) → `manageDoors` (shut a door while it has a fresh clue about that corner, open it again once the clue is older than `memTime × doorHold` or it saw the corner empty; a guard of skill `SAVE_SKILL` (8) or more that is `savingPower()`, below its share of the night's power, stops shutting doors and shocking "just in case" and only slams a door on a real attack) → `tryLure` → `tryShock` → `chooseLook` (cameras with chance `camLove`, less as power drops; or a door light with chance `lightLove`) and `pickCam` (weighted toward near rooms, heard rooms, Pirate Cove with Foxy, rooms where it last saw someone).
- Its states (`focus`): desk, cam, wind, reboot, stun, hide, mask, lol, shoo, dead. The office cam (`officeGrid` in `art.js`) and the line under it show which one, and the map shows a red REC on its camera.
- **Power:** `BASE_DRAIN` + `CAM_DRAIN` while the monitor is up + `DOOR_DRAIN` per shut door/vent + `LIGHT_DRAIN` per lit light; flash and shock cost a lump; cupcakes eat `CUPCAKE_DRAIN`.

### Guards (`GUARDS` in `data.js`)

| Night | Guard | Skill | Tools | Personality |
|---|---|---|---|---|
| 1 | Mike Schmidt | 2 | cams, doors, lights | — |
| 2 | Fritz Smith | 4 | cams, doors | hears well, keeps doors shut far too long (`doorHold` 2.2) |
| 3 | Jeremy Fitzgerald | 6 | cams, mask, flash | no doors |
| 4 | Phone Guy | 9 | cams, doors, lights | camera addict, slow to look up (`slowDown`) |
| 5 | Fazbear's Fright guard | 7 | cams, lure, vent door | no doors, fast reboot |
| 6 | Michael Afton | 8 | cams, doors, shock | no lights |
| 7 | Gregory | 10 | cams, doors, hide | — |
| 8 | Vanessa | 8 | cams, doors, lights, flash, vent door | lights a lot, saves power |
| 9 | Henry Emily | 12 | cams, doors, lights, lure, shock | saves power (`doorHold` 0.6) |
| 10 | Mike Schmidt (veteran) | 15 | the 9 original tools | — |
| Max mode | **The Tendons 8** | 20 | everything, including the two tools only it has by default: **death coins** (`coins`, `DEATH_COINS` 2) and **Lockdown** (`lockdown`), both on request 2026-11-20 | the hardest guard (on request, 2026-11-20; the name is the owner's): hears ×1.5, reboots in 1 s, puts the monitor down faster (`slowDown` −0.15), `grit` 0.5 (every trick that messes with it lasts or costs half as much: stuns, Lolbit, Clatter, Radio static, Lights out, Static, Hi!, Jam, Pry open, Laugh, Unwind, Foxy's bang, cupcakes, Freddles), `thrift` 0.35 (uses 0.35 as much power for everything) |

`grit` and `thrift` are general guard traits (default 1), so a future guard can use them too. On the custom night The Tendons 8 can be picked like any guard.

**"Every positive guard ability"** (asked 2026-11-20, "at least the ones that when together don't make it impossible"). The Tendons 8 already had every tool and each other guard's good habit at least as strong as on that guard: Fritz's ears (`hears`), the Fright guard's reboots (`reboot`), Vanessa's light checks (`lightLove`), Henry's careful doors (`doorHold`). The bot checked the two open questions on Max mode (40–80 runs each): Phone Guy's `camLove` 0.8 made it *weaker* (12/40 wins against 10/40; it notices less while on the cameras), 0.65 and `doorHold` 1.0 (keeping doors shut longer, like Fritz) made no real difference (17/80 against 15/80). So no numbers changed, only its description now lists what it has; Max mode kept v1.

### Your crew (`CREW` in `data.js`, 31)

Kinds: `walker` (moves and attacks), `foxy` (Pirate Cove stages), `puppet` (music box), `golden` (appears in the office), `phantom` (never attacks: ability only).

| | Ability (Q) | Niche |
|---|---|---|
| Freddy | Laugh: −4% power | hidden off the stage; can't move while watched |
| Bonnie | Static: his camera goes static 8 s | fastest walker |
| Chica | Clatter: the guard listens to the kitchen 5 s | distraction |
| Foxy | Sprint (stage 3): dash to the left door | stages only grow while the cove isn't watched |
| Toy Bonnie | Vent rush: straight to Vent C | vents, maskable |
| Toy Chica | Lights out: lights and flash off 3 s | timing, maskable |
| Toy Freddy | Game over: the guard forgets everything | memory wipe |
| Withered Freddy | Lurch: next attack twice as fast | slow but deadly |
| Withered Bonnie | Faceless: off every camera 10 s | stealth |
| Withered Chica | Jam: vent door can't shut 4 s | vents |
| Withered Foxy | Dash: ready to move now | flashable, fast |
| Withered Golden Freddy | Hallucination: on the monitor (drop it) or in the office (mask, or flip it up) at once | punishes whatever the guard is doing |
| Mangle | Radio static: all cameras 6 s | vents, flashable |
| Balloon Boy | Hi!: the guard notices nothing 2.5 s | can't kill; getting in takes the guard's lights and flash for the night |
| The Puppet | Unwind: box −30% | music box route |
| Golden Freddy | It's me: appears when the monitor goes down; flip it up in time | broken cameras = guaranteed |
| Springtrap | Shrug off: ignores lures 5 s | vents, quiet |
| Phantom Freddy | Haunt: cameras broken until reboot | — |
| Phantom BB | Jumpscare (monitor up): guard frozen 2.5 s | — |
| Phantom Foxy | Lunge (monitor down): guard frozen 1.5 s | partner of Phantom BB |
| Shadow Bonnie | Glitch: everyone frozen is free | undoes shocks and bonks |
| Circus Baby | Showtime: everyone else moves twice as often 10 s | leader |
| Ballora | Waltz: everyone quieter 10 s | never on camera, only in a door light |
| Funtime Freddy | Bon-Bon: a fake attack on the other door | fake-out |
| Ennard | Pry open: a shut door can't be shut 4 s | vents |
| Lolbit | Please stand by: the guard types L-O-L 3 s (notices less, reacts slower) | works any time |
| Nightmare Fredbear | Switch: jump to the other corner | both doors |
| Nightmare Bonnie | Hold breath: next attack nearly silent | strong vs no lights |
| Nightmare Chica | Cupcake: eats power, distracts | pests |
| Nightmare Freddy | Freddles: +2 (more come by themselves) | pests: each makes the guard notice 12% less; it shoos or flashes them |
| Plushtrap | Freeze tag: moves with the monitor down 6 s | only moves while the monitor is up; very fast |

### Nights (`NIGHTS` in `data.js`)

1 First shift (Bonnie, Chica) · 2 Pirate Cove (Freddy, Foxy, Bonnie) · 3 Toy box (Toy Bonnie, Toy Chica, Toy Freddy, Mangle, Puppet) · 4 Distraction (Chica, Lolbit, Balloon Boy, Bonnie) · 5 Fazbear's Fright (Springtrap and three phantoms) · 6 Circus Gallery (Baby, Ballora, Funtime Freddy, Ennard) · 7 Golden hour (Golden Freddy, Freddy, Bonnie, Toy Chica, Puppet) · 8 Parts & Service (the four withereds) · 9 Nightmares (Fredbear, N. Bonnie, N. Chica, N. Freddy, Plushtrap) · 10 One more night (Withered Golden Freddy, Withered Foxy, Puppet, Phantom Freddy, Mangle, Shadow Bonnie). Each has a `tip`. Night n opens once night n−1 is beaten; the custom night once Night 10 is. Story nights use crew level 10.

### Custom night (`screens.js`)

**Challenges** (`CHALLENGES` in `data.js`, shown at the top of the custom night screen, started with `challengeSetup`): ready-made nights with a name and a version `v`. Beating one saves `challengeKey` ("Max mode v2") in the `challenges` store key (only ever added to). Raise `v` when a change makes a challenge harder. **Max mode** (on request, 2026-11-20: "every character available" against "the hardest nightguard"): all 31 animatronics at once (`crew: 'all'`, which can go past `MAX_CREW`) at level 15, against The Tendons 8 at skill 20 with every tool. v2 since The Tendons 8 got death coins and Lockdown; the crew went from level 10 to 15 at the same time to keep it beatable (level 20 cooldowns let the bot win every time). With more than 6 animatronics the cards get smaller (`.crew.many`); 1–9 and 0 pick the first ten, Tab / Shift+Tab (or ] / [) step through everyone.

**Kill counters and achievements** (on request, 2026-11-20). Every win adds one to the animatronic's `catches` and the guard's `guardCaught`. They show as a red ☠ and a number (`catchTag`, `caughtTag` in `screens.js`) on the night list, the custom night's guard buttons and crew cards, the pause roster, and in words on the end screen. `ACHIEVEMENTS` (13, `data.js`) are checked on every win by `checkAchievements` (`game.js`), using the night's `G.bonks` and `G.abilitiesUsed`; new ones show on the end screen, and the title's Achievements button lists them all (`showAchievements`).

Guard (picking one loads its tools and skill), skill 0–20 (0 never notices anything), each tool on/off, any crew up to `MAX_CREW` (6) with a level 1–20 each (`crewSpeed`: cooldowns ×1.4 at 1 to ×0.6 at 20), starting power 10–100%, hour length 15–60 s, cooldown speed 50–200%. Saved in `custom`.

## Defaults chosen by Claude (tell the owner if asked; change on request)

The whole guard AI and every number in `config.js`; the map; which guard goes with which night; the custom night unlocking after Night 10; the per-character abilities and their numbers (the owner chose only the characters); Golden Freddy waiting for the monitor to drop; Withered Golden Freddy appearing at once; Balloon Boy stealing lights instead of killing; Funtime Freddy's Bon-Bon being a fake attack; the win screens showing the face, not a jumpscare drawing.

## Balance (2026-11-20)

A bot played each night 20–30 times (`botRun`, kept in the test page's localStorage, not in the repo): 0.6 s between actions, walks the shortest way to a random door, attacks when the door is open and the guard is busy (monitor up, frozen, rebooting, typing, shooing) or after waiting 5 s, uses abilities with simple rules. Results after tuning: Night 1 100%, 2 83%, 3 93%, 4 77%, 5 87%, 6 70%, 7 67%, 8 63%, 9 63%, 10 20%. 80 random custom nights ran with no errors. Tuning that got there: attacks lengthened about 30% (`attack` in `CREW`), noticing became a per-second chance, `guardReact` 1.6–0.6 s, Lights out 12 → 3 s, Shrug off 12 → 5 s, Jam 10 → 4 s (they used to guarantee a win), and the guards' skills above. **Not play-tested by a person, and the sounds have never been heard.**

Max mode (2026-11-20): first the bot won it 20/20 in about 20 s. Two fixes for every guard came out of it: a guard facing Golden Freddy with broken cameras now starts rebooting as its answer (it used to be stuck "busy reacting" and never rebooted, so Haunt + Golden Freddy always won), and Lolbit can't interrupt a reboot. Then The Tendons 8 got `grit` and `thrift` and the crew went to level 10: the bot wins Max mode about 25% of the time (40 runs), with its wins spread over many animatronics. That's close to Night 10 for the bot, but the bot steers 31 animatronics without effort; a person won't. The story nights stayed on the same curve after the fixes (Night 1 95%, Night 10 20–30%).

**Auto-wins fixed** (2026-11-20, on request: "some character combos cause an auto win, and Springtrap can do it himself"). A test of every animatronic alone against every guard (8 nights each) found three causes: (1) most guards had no vent door, so anything in the vent (Springtrap, Toy Bonnie...) was unstoppable: the Doors tool now includes the vent door (`canShut`); (2) a guard with nothing that works against an attacker (Jeremy, who has no doors) simply lost: every guard can now duck (`DUCK_COOLDOWN`), and the mask now also fools Freddy, Bonnie and Chica (like FNAF 2); (3) a few were too strong alone: Ballora (stealth 0.4 → 0.25, slower, and her Waltz no longer hides herself), Nightmare Bonnie (`SILENT_STEALTH` 0.85 → 0.45, cooldown 22 → 30), Withered Freddy (`LURCH` 0.5 → 0.7, cooldown 20 → 30), Mangle (stealth 0.25 → 0.15), Plushtrap (slower, quieter, can be lured), Springtrap (stealth 0.3 → 0.2), Chica (`CLATTER_TIME` 5 → 3). Also Plushtrap alone beat the veteran Mike by parking outside a door until his power ran out, which led to `savingPower`. Afterwards a lone animatronic beats a guard of skill 8+ at most about 2 times in 8; the weakest guards (Mike skill 2, Fritz, Jeremy) still lose to some loners, which is fine for them. Then the nights were retuned (skills in the table above): bot wins Night 1 87%, 2 87%, 3 93%, 4 73%, 5 77%, 6 60%, 7 60%, 8 47%, 9 33%, 10 13% (30 runs each), Max mode about 15% (6/40). These made challenges harder, so Max mode went to v2 (it went up anyway for the new tools). 40 random custom nights with death coins and Lockdown on ran with no errors.

## Testing

- No Node.js or Python on the Windows computer. A PowerShell `HttpListener` script (`serve.ps1` in the session scratchpad) served the folder at `http://127.0.0.1:8768/` for the browser pane. The pane slows `requestAnimationFrame` when hidden, so tests set `speed = 0` and call `update(0.02)` and `renderGame()` themselves.
- Tested: walking (too soon, too far, vents), attacks stopped by the door and landing, real clicks on the map and Q / E keys, every ability through the bot, the win screen, phone width (375 px, no sideways scroll).
- The syntax check from the root `CLAUDE.md` works here too (`working-directory: ascii-fnaf-simulator` in the workflow).

## Gotchas

- Same as the other games: `index.html` is a page fragment; keep `<meta charset="utf-8">` and `[hidden] { display: none !important; }`; scripts share one global scope (unique names; don't shadow browser built-ins like `open`, which is why the door helpers are `shutDoor`/`openDoor`); art is ASCII only; things redrawn often react on `pointerdown`.
- The game loop only runs during a night.
- **Speed** (2026-11-20, on request: "the game is laggy"). The crew cards and the map used to be rebuilt from an HTML string 15 times a second, and the browser then re-measured the whole page each time: about 8 ms per redraw in Max mode (31 cards) with spikes of 40–60 ms, 1.4 ms on a normal night. Now `renderCrew` and `renderMap` (`render.js`) build their boxes once (per night for the cards, once for the map) and each redraw only changes the bits inside with `setHtml` / `setClass`, which skip anything unchanged; move cooldowns show whole seconds so their text changes once a second; and `contain` in `style.css` keeps a change inside one card or room from re-measuring the rest of the page. After: about 3 ms per redraw in Max mode and 1.5 ms on a normal night (with layout), worst spikes 6–9 ms. Keep it that way: don't go back to rebuilding whole lists every frame.

## Publishing

Publish `index.html` with every other file in `files`: `style.css` and all ten `js/*.js`, each mapped to the same path (`README.md` and `CLAUDE.md` aren't needed). From a new session, first `read` https://claude.ai/artifact/2jfk4WEHXSCrWAqV8X1Mx3, then publish with that `url` (without it a separate link is made).
