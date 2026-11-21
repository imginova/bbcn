# ASCII FNAF Simulator: project handoff

This file holds everything a new Claude session, or a person, needs to keep working on this game. [`README.md`](README.md) is the beginner-friendly guide.

## What this is

**ASCII FNAF Simulator** is a free, browser-based **reverse FNAF fan game** in ASCII art: **you control the animatronics, and the computer plays the night guard.** Catch the guard before 6 AM. It was made on 2026-11-20 in the `ascii-fnaf-simulator/` folder of the BBCN repository (https://github.com/imginova/bbcn, public). It reuses the file layout, sound engine, grid drawing and game loop of ASCII FNAF: Line 1 and Line 2, and some of Line 1's faces, but the rules are all new.

The owner's request: "a reverse fnaf-like ASCII game where your goal is to use your animatronics to kill the cpu nightguard before 6 am, 10 nights then a custom night where you can decide anything about the night, night guards with different abilities, the animatronics you control different every night but with cohesive themes". Choices the owner made when asked: FNAF characters by name; control = map moves + one ability each; nights are picked for **gameplay niches** ("a mix of all", not one game per night); the name; purple; the guard info shown (office cam + tells); every custom night option. Later in the same session: "have at least the withereds, Lolbit and Mangle", then "a good amount of characters" (31), then Yenndo (32), then 13 more from FNAF 4, FNAF 6, Sister Location and Security Breach (45 now).

- **Owner:** the `imginova` GitHub account (Jake Harris's son). New to programming: explain in plain language.
- **Private Artifact link:** https://claude.ai/artifact/2jfk4WEHXSCrWAqV8X1Mx3 (only the owner and people they share it with can open it; see "Publishing" below).
- **Public site:** https://imginova.github.io/bbcn/ascii-fnaf-simulator/ once merged to `main` (the root `.github/workflows/deploy.yml` checks and builds it).
- **Its own saves:** prefix `asciifnafsim:` (`store` in `helpers.js`): `beaten` (night numbers won), `challenges` (custom night challenges won, as "Max mode v2"; older versions stay saved but don't count), `catches` ({ crew id: count }, the animatronics' kill counter), `guardCaught` ({ guard id: count }, the guards' kill counter), `achievements` (ids), `gimmicks` (gimmick night ids won), `custom` (the custom night settings), `muted`. Never mix with the other games' prefixes.

## Fan game rules (keep these)

- It stays free. It says it's an unofficial fan game ("Not affiliated with Scott Cawthon or Five Nights at Freddy's") on the title and the top bar.
- Nothing is copied from the real games: the ASCII faces, sounds and tunes are original. Character names are used on purpose.

## Working agreements with the owner

Same as the other games: plan before big features and ask about real design choices; commit only when asked (as `imginova <107283216+imginova@users.noreply.github.com>`, no work email anywhere); never wipe saved progress (`beaten` is only ever added to); republish the private Artifact after every change; keep the split by job and the beginner-friendly comments. **A harder challenge loses its ✓:** raise its `v` in `CHALLENGES` (Max mode went to v2 when The Tendons 8 got death coins and Lockdown).

## How a night works

- **Clock:** 12 AM to 6 AM, `HOUR_SECONDS` (30) per hour, so a night lasts 3 minutes; the custom night can change it. At 6 AM the guard wins.
- **Your speed:** every move cooldown, ability cooldown and attack is multiplied by `CREW_PACE` (0.85, on request 2026-11-20: "make everyone a little faster"; the owner picked walking, abilities and attacks) on top of the level (`crewSpeed`).
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
| 7 | Gregory | 7 | cams, doors, hide | was 10. Lowered (and his Rush hour 12 → 9, The band 11 → 8) on request: "him being this good makes his guard ability way stronger" (he hides from every attack he notices). `HIDE_COOLDOWN` went 16 → 22 s at the same time |
| 8 | Vanessa | 8 | cams, doors, lights, flash, vent door | lights a lot, saves power |
| 9 | Henry Emily | 12 | cams, doors, lights, lure, shock | saves power (`doorHold` 0.6) |
| 10 | Mike Schmidt (veteran) | 15 | the 9 original tools | — |
| 11–26 | returning guards | higher (`skill` on the night) | as above | Fritz 14, Phone Guy 15, Gregory 9 and 8, Vanessa 16 and 14, Henry 18, the veteran Mike 20, Crying Child 10, Franchisee 13 |
| new | The Crying Child (FNAF 4) | 9 | doors, lights, flash | no cameras at all; hears ×1.8, lights a lot |
| new | The Franchisee (FNAF 6) | 11 | cams, doors, lure, lights | `thrift` 0.6 |
| new | Cassie (Security Breach: Ruin) | 12 | cams, mask, flash, hide, lure | no doors |
| new | The Technician (FNAF: Help Wanted) | 16 | cams, doors, lights, flash, mask | reboots in 1.2 s |
| 26 | William Afton (FNAF) | 14 | cams, doors, lights, **death coins**, **Lockdown** | on request: both of The Tendons 8's signatures but "not as overpowered": 1 coin (`coins: 1` on the guard), no grit, no thrift, no other tools |
| gimmick | 7 gimmick guards | 1–15 | see Gimmick nights below | each has a `gimmick` rule in `game.js`; left out of Random mode and Guard hunter |
| Max mode | **The Tendons 8** | 20 | everything, including the two tools only it has by default: **death coins** (`coins`, `DEATH_COINS` 2) and **Lockdown** (`lockdown`), both on request 2026-11-20 | the hardest guard (on request, 2026-11-20; the name is the owner's): hears ×1.5, reboots in 1 s, puts the monitor down faster (`slowDown` −0.15), `grit` 0.5 (every trick that messes with it lasts or costs half as much: stuns, Lolbit, Clatter, Radio static, Lights out, Static, Hi!, Jam, Pry open, Laugh, Unwind, Foxy's bang, cupcakes, Freddles), `thrift` 0.35 (uses 0.35 as much power for everything) |

`grit` and `thrift` are general guard traits (default 1), so a future guard can use them too. On the custom night The Tendons 8 can be picked like any guard.

**"Every positive guard ability"** (asked 2026-11-20, "at least the ones that when together don't make it impossible"). The Tendons 8 already had every tool and each other guard's good habit at least as strong as on that guard: Fritz's ears (`hears`), the Fright guard's reboots (`reboot`), Vanessa's light checks (`lightLove`), Henry's careful doors (`doorHold`). The bot checked the two open questions on Max mode (40–80 runs each): Phone Guy's `camLove` 0.8 made it *weaker* (12/40 wins against 10/40; it notices less while on the cameras), 0.65 and `doorHold` 1.0 (keeping doors shut longer, like Fritz) made no real difference (17/80 against 15/80). So no numbers changed, only its description now lists what it has; Max mode kept v1.

### Your crew (`CREW` in `data.js`, 45)

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
| Circus Baby | Showtime: everyone else is ready to move and moves twice as often 10 s; every countdown that helps you keeps only `SHOWTIME_CUT` (half) of what it has left: move and ability cooldowns, freezes, attacks in a doorway, Foxy's next stage, the next Freddle, the music box, the Puppet getting out, the power-out win (on request 2026-11-20, "decrease every timer that would yield a positive effect": the owner was stuck on Night 6) | leader |
| Ballora | Waltz: everyone quieter 10 s | never on camera, only in a door light |
| Funtime Freddy | Bon-Bon: a fake attack on the other door | fake-out |
| Ennard | Pry open: a shut door can't be shut 4 s | vents |
| Lolbit | Please stand by: the guard types L-O-L 3 s (notices less, reacts slower) | works any time |
| Nightmare Fredbear | Switch: jump to the other corner | both doors |
| Nightmare Bonnie | Hold breath: next attack nearly silent | strong vs no lights |
| Nightmare Chica | Cupcake: eats power, distracts | pests |
| Nightmare Freddy | Freddles: +2 (more come by themselves) | pests: each makes the guard notice 12% less; it shoos or flashes them |
| Plushtrap | Freeze tag: moves with the monitor down 6 s | only moves while the monitor is up; very fast |
| Yenndo | Stare: the guard freezes `STARE_TIME` 2 s, monitor up or down; only `STARE_LIT` 1 s if it has a working light (door lights or flashlight) | a staller (added 2026-11-20, on request: "another staller, in Sister Location"); never attacks; best against guards with no lights, like Michael. Drawn beside the desk while it lasts (`g.stareUntil`) |
| Nightmare Foxy | Closet: from a corner, attack from inside the office (entry `O` for a walker): doors can't stop it, only a flash, hide or duck | FNAF 4; drawn right of the desk |
| Nightmarionne | Strings: every other walker steps one room closer, silently | FNAF 4, phantom |
| Scrap Baby | Creep: two steps closer at once if her room isn't watched | FNAF 6, vents |
| Molten Freddy | Split: a decoy in his room for `DECOY_TIME` 10 s; cameras show the decoy and not him (`u.decoy`, `seeRoom`) | FNAF 6, vents |
| Rockstar Freddy | Five coins: −`COINS_POWER` 3% and `COINS_TIME` 2.5 s fumbling (focus `pay`, like Lolbit's) | FNAF 6, phantom |
| Music Man | Cymbals: no footsteps heard for `CYMBAL_TIME` 8 s (`deafUntil`) | FNAF 6, phantom |
| Glamrock Freddy | Friendly face: the guard reacts `FRIENDLY_SLOW` (2×) slower to his next attack | Security Breach |
| Roxy | Pounce: from the West or East Hall, straight into that doorway | Security Breach |
| Monty | Smash: breaks that side's door light for the night (`brokenLight`) | Security Breach, loud |
| Funtime Foxy | Curtain call: the monitor is stuck on her camera `CURTAIN_TIME` 3 s (`curtainUntil`); sets up Phantom BB and Plushtrap | Sister Location |
| Lefty | Black box: the next walker that's stopped stays put; Lefty is sent home instead (`shield`, in `bonk`) | FNAF 6 |
| Glamrock Chica | Trash dive: off cameras and door lights, and silent, `TRASH_TIME` 8 s | Security Breach; starts in the kitchen |
| Daycare Attendant | Nap time: +`NAP_SLOW` 1 s to every reaction for `NAP_TIME` 10 s (`drowsyUntil`) | Security Breach (Sun and Moon), phantom |

The last 13 were added 2026-11-20 on request (the owner picked FNAF 4 nightmares, FNAF 6 salvage plus "a few other FNAF 6 characters", and Security Breach; then "a few left out characters" brought Funtime Foxy, Lefty, Glamrock Chica and the Daycare Attendant). A phantom that isn't a ghost shows its own `idle` line on its card. Each was checked with a direct test of its ability.

### Nights (`NIGHTS` in `data.js`)

1 First shift (Bonnie, Chica) · 2 Pirate Cove (Freddy, Foxy, Bonnie) · 3 Toy box (Toy Bonnie, Toy Chica, Toy Freddy, Mangle, Puppet) · 4 Distraction (Chica, Lolbit, Balloon Boy, Bonnie) · 5 Fazbear's Fright (Springtrap and three phantoms) · 6 Circus Gallery (Baby, Ballora, Funtime Freddy, Ennard, Yenndo) · 7 Golden hour (Golden Freddy, Freddy, Bonnie, Toy Chica, Puppet) · 8 Parts & Service (the four withereds) · 9 Nightmares (Fredbear, N. Bonnie, N. Chica, N. Freddy, Plushtrap) · 10 One more night (Withered Golden Freddy, Withered Foxy, Puppet, Phantom Freddy, Mangle, Shadow Bonnie). · 11 Blackout (Fritz 14: win by power) · 12 Hide and seek (Phone Guy 15: Freddy, Ballora, Withered Bonnie, Toy Freddy, Shadow Bonnie) · 13 Music box (Cassie: Puppet, Phantom Freddy, Toy Freddy, Lolbit, Balloon Boy) · 14 Bedtime (Crying Child: Nightmare Bonnie, Nightmare Chica, Toy Chica, Balloon Boy, Nightmare Freddy) · 15 Hallucinations (Technician: Golden Freddy, Withered Golden Freddy, Phantom BB, Withered Freddy, Withered Bonnie) · 16 Rush hour (Gregory 12: Baby, Withered Foxy, Bonnie, Plushtrap, Foxy) · 17 Ventilation (Franchisee: Toy Bonnie, Withered Chica, Mangle, Springtrap, Ennard) · 18 Fake-out (Vanessa 16: Funtime Freddy, Fredbear, Ennard, Withered Chica, Toy Bonnie, Chica) · 19 Graveyard shift (Henry 18: Springtrap, Withered Foxy, Mangle, Nightmare Bonnie, Phantom Freddy, Shadow Bonnie) · 20 Last call (veteran Mike 20: Baby, Ballora, Ennard, Golden Freddy, Nightmare Freddy, Withered Foxy). Each has a `tip`. Nights 11–20 were added on request (2026-11-20, "a bunch more levels"; the owner chose 10 more, a few new guards and a few old, never The Tendons 8) and are ordered by how often the bot won them. **Every night and the custom night are open from the start** (on request: "every level unlocked, I can just pick which one"; `nightOpen` and `customUnlocked` return true); beating a night still saves its ✓ in `beaten`. Story nights use crew level 10.

**Nights 21–26** (2026-11-20, on request: "nights of assorted difficulties" for the new animatronics): 21 Halloween (Crying Child 10: Nightmare Foxy, Nightmarionne, N. Bonnie, N. Chica, Fredbear) · 22 Salvage (Franchisee 13: Scrap Baby, Molten Freddy, Rockstar Freddy, Music Man, Lefty) · 23 Pizzaplex (Vanessa 14: Glamrock Freddy, Roxy, Monty, Glamrock Chica, Daycare Attendant) · 24 The band (Gregory 8: Freddy, Chica, Rockstar Freddy, Music Man, Glamrock Freddy, Funtime Foxy) · 25 Closet monsters (Technician: Nightmare Foxy, Molten Freddy, Roxy, Scrap Baby, Withered Bonnie) · 26 I always come back (William: Nightmarionne, Scrap Baby, Monty, Nightmare Foxy, Molten Freddy, Glamrock Freddy). They're not in order of difficulty: **every night has a `diff` tag** (1 Easy ≥ 85% bot wins, 2 Medium 60–84%, 3 Hard 30–59%, 4 Very hard < 30%), shown on the night list (`diffTag` in `screens.js`).

### Gimmick nights (`GIMMICKS` in `data.js`)

Their own list under the numbered nights (on request: "gimmick nights with gimmick guards that do silly things or create puzzles", "a separate gimmick list"). Picked by id (`pickedNight` is a number or a gimmick id; `pickedSetup`, `gimmickSetup`); won ids are saved in `gimmicks`. Each gimmick guard has a `gimmick` in `GUARDS`; `startGimmick` and `updateGimmick` in `game.js` run its rule (`G.gim` holds its state), `drawGimmick` / `drawCutouts` in `art.js` draw it. The four the owner picked, then three "a few more" chose by Claude:

| Night | Guard (skill) | Type | Rule |
|---|---|---|---|
| Nap time | The Sleepyhead (9) | silly | Starts asleep (focus `sleep`): notices nothing, hears nothing. Each step fills a wake-up meter (`SLEEP_STEP` 15 × closeness × (1 − stealth)), standing in a doorway `SLEEP_ATTACK` 35/s × (1 − stealth); it drains `SLEEP_DECAY` 2.5/s. At 100 it wakes (anyone in a doorway is noticed and countered in 0.3 s), stays awake `SLEEP_AWAKE` 20 s, then nods off (doors open). Win with quiet attackers, Ballora's Waltz, and patience. Attention tricks (Lolbit, Clatter, BB, Phantom Foxy, Yenndo, Rockstar, Funtime Foxy) are refused while it sleeps, so they can't "wake" it |
| Crack the code | The Locksmith (6) | puzzle | A random 3-step code of ways in (vent only with a vent crawler). Each step is written in a room (`rooms`), revealed on the map once one of yours enters it. Right step: click (back to the corner, no harm); wrong: buzz, sent home, code starts over; the last step is a real attack |
| Clockwork | The Clockwork Guard (1) | puzzle | Never notices or reacts, uses no power. Doors follow `CLOCK_ROUTINE` (one way in open at a time, 4.8 s windows, same every night). A door slamming shut knocks back anyone right outside it, so arrive after it shuts and attack the moment it opens |
| Cardboard | The Cardboard Guard (11) | silly | Three figures at LEFT / VENT / RIGHT (`CUTOUT_COLS`); attacking next to a cutout knocks it over (sent home). The real one blinks and is the only one that moves; every `CUTOUT_SWAP` 25 s the lights flicker and it moves |
| Wrong door | The Mixed-up Guard (14) | silly | The first time it reacts to an attack, it shuts a different door, then reacts again |
| Follow the leader | The Copycat (14) | puzzle | `pickCam` always picks the room of whoever you moved last (`G.gim.last`) |
| Special delivery | The Pizza Guy (15) | puzzle | Every `PIZZA_EVERY` 28 s it leaves for `PIZZA_AWAY` 8 s (every door shut), the doorbell rings `PIZZA_BELL` 2.5 s before it walks back in through one door (`PIZZA_WALKIN` 2.5 s): an attack at that door then lands at once |

Balance: the plain bot (it knows no puzzles) wins Crack the code 4/20, Cardboard 10/20, Follow the leader 13/20, and the other four 20/20 (it stumbles onto their answers: quiet attackers or Waltz for the Sleepyhead, waiting in a corner for its door to open, the walk-in door). Scripted players who know the answer won Clockwork and Nap time 10/10.

### Random mode

The title's **Random Night** (on request; "Normal" difficulty picked): `randomSetup` in `game.js` picks a guard (never The Tendons 8, never a gimmick guard) at its usual skill and tools, and 2–8 animatronics at level 10. At least one can catch the guard, and against a guard without cameras the Puppet, Golden Freddy, Withered Golden Freddy and Phantom Freddy are left out (it could never stop the first three, and the last would do nothing). The end screen's button becomes "Roll again". 60 rolls with the bot: 48 won, no bad rolls, 15 different guards.

### Custom night (`screens.js`)

**Challenges** (`CHALLENGES` in `data.js`, shown at the top of the custom night screen, started with `challengeSetup`): ready-made nights with a name and a version `v`. Beating one saves `challengeKey` ("Max mode v2") in the `challenges` store key (only ever added to). Raise `v` when a change makes a challenge harder. **Max mode** (on request, 2026-11-20: "every character available" against "the hardest nightguard"): all 45 animatronics at once (`crew: 'all'`, which can go past `MAX_CREW`) at level 15, against The Tendons 8 at skill 20 with every tool. v2 since The Tendons 8 got death coins and Lockdown; the crew went from level 10 to 15 at the same time to keep it beatable (level 20 cooldowns let the bot win every time). Yenndo joining kept it at v2, because he helps the player (the bot won 9/40 with him). With more than 6 animatronics the cards get smaller (`.crew.many`); 1–9 and 0 pick the first ten, Tab / Shift+Tab (or ] / [) step through everyone.

**Kill counters and achievements** (on request, 2026-11-20). Every win adds one to the animatronic's `catches` and the guard's `guardCaught`. They show as a red ☠ and a number (`catchTag`, `caughtTag` in `screens.js`) on the night list, the custom night's guard buttons and crew cards, the pause roster, and in words on the end screen. `ACHIEVEMENTS` (17, `data.js`; Overtime (Night 20) and Employee of the month (every numbered night) came with Nights 11–20, Puzzle solver (every gimmick night) and Lucky roll (a Random night) with the gimmicks; Guard hunter leaves out the gimmick guards) are checked on every win by `checkAchievements` (`game.js`), using the night's `G.bonks` and `G.abilitiesUsed`; new ones show on the end screen, and the title's Achievements button lists them all (`showAchievements`).

Guard (picking one loads its tools and skill), skill 0–20 (0 never notices anything), each tool on/off, any crew up to `MAX_CREW` (6) with a level 1–20 each (`crewSpeed`: cooldowns ×1.4 at 1 to ×0.6 at 20), starting power 10–100%, hour length 15–60 s, cooldown speed 50–200%. Saved in `custom`.

## Defaults chosen by Claude (tell the owner if asked; change on request)

The whole guard AI and every number in `config.js`; the map; which guard goes with which night; the per-character abilities and their numbers (the owner chose only the characters); Golden Freddy waiting for the monitor to drop; Withered Golden Freddy appearing at once; Balloon Boy stealing lights instead of killing; Funtime Freddy's Bon-Bon being a fake attack; the win screens showing the face, not a jumpscare drawing.

## Balance (2026-11-20)

A bot played each night 20–30 times (`botRun`, kept in the test page's localStorage, not in the repo): 0.6 s between actions, walks the shortest way to a random door, attacks when the door is open and the guard is busy (monitor up, frozen, rebooting, typing, shooing) or after waiting 5 s, uses abilities with simple rules. Results after tuning: Night 1 100%, 2 83%, 3 93%, 4 77%, 5 87%, 6 70%, 7 67%, 8 63%, 9 63%, 10 20%. 80 random custom nights ran with no errors. Tuning that got there: attacks lengthened about 30% (`attack` in `CREW`), noticing became a per-second chance, `guardReact` 1.6–0.6 s, Lights out 12 → 3 s, Shrug off 12 → 5 s, Jam 10 → 4 s (they used to guarantee a win), and the guards' skills above. **Not play-tested by a person, and the sounds have never been heard.**

Max mode (2026-11-20): first the bot won it 20/20 in about 20 s. Two fixes for every guard came out of it: a guard facing Golden Freddy with broken cameras now starts rebooting as its answer (it used to be stuck "busy reacting" and never rebooted, so Haunt + Golden Freddy always won), and Lolbit can't interrupt a reboot. Then The Tendons 8 got `grit` and `thrift` and the crew went to level 10: the bot wins Max mode about 25% of the time (40 runs), with its wins spread over many animatronics. That's close to Night 10 for the bot, but the bot steers 31 animatronics without effort; a person won't. The story nights stayed on the same curve after the fixes (Night 1 95%, Night 10 20–30%).

**Auto-wins fixed** (2026-11-20, on request: "some character combos cause an auto win, and Springtrap can do it himself"). A test of every animatronic alone against every guard (8 nights each) found three causes: (1) most guards had no vent door, so anything in the vent (Springtrap, Toy Bonnie...) was unstoppable: the Doors tool now includes the vent door (`canShut`); (2) a guard with nothing that works against an attacker (Jeremy, who has no doors) simply lost: every guard can now duck (`DUCK_COOLDOWN`), and the mask now also fools Freddy, Bonnie and Chica (like FNAF 2); (3) a few were too strong alone: Ballora (stealth 0.4 → 0.25, slower, and her Waltz no longer hides herself), Nightmare Bonnie (`SILENT_STEALTH` 0.85 → 0.45, cooldown 22 → 30), Withered Freddy (`LURCH` 0.5 → 0.7, cooldown 20 → 30), Mangle (stealth 0.25 → 0.15), Plushtrap (slower, quieter, can be lured), Springtrap (stealth 0.3 → 0.2), Chica (`CLATTER_TIME` 5 → 3). Also Plushtrap alone beat the veteran Mike by parking outside a door until his power ran out, which led to `savingPower`. Afterwards a lone animatronic beats a guard of skill 8+ at most about 2 times in 8; the weakest guards (Mike skill 2, Fritz, Jeremy) still lose to some loners, which is fine for them. Then the nights were retuned (skills in the table above): bot wins Night 1 87%, 2 87%, 3 93%, 4 73%, 5 77%, 6 60%, 7 60%, 8 47%, 9 33%, 10 13% (30 runs each), Max mode about 15% (6/40). These made challenges harder, so Max mode went to v2 (it went up anyway for the new tools). 40 random custom nights with death coins and Lockdown on ran with no errors.

**Yenndo** (2026-11-20): Night 6 with him, the bot won 48/60 (80%) against 45/60 (75%) without, about even with Night 5 (46/60); Michael at skill 9 made no real difference, so he stayed at 8. 40 random custom nights with Yenndo in the crew ran with no errors, and Yenndo alone never wins.

**Showtime cuts** (2026-11-20): Night 6 went from 48/60 to 59/60 for the bot, so it is now one of the easiest nights for the bot (on purpose: the owner was stuck on it). Max mode stayed about the same (7/40) and kept v2, since this only helps the player. 30 random custom nights with Circus Baby ran with no errors.

**Faster crew and Nights 11–20** (2026-11-20, 40 runs each): with `CREW_PACE` the bot wins Night 1 100%, 2 98%, 3 98%, 4 95%, 5 90%, 6 98%, 7 75%, 8 60%, 9 63%, 10 45% (it was 13%), then 11 100%, 12 75%, 13 78%, 14 70%, 15 60%, 16 40%, 17 63%, 18 55%, 19 45%, 20 13%; Max mode 11/40 (kept v2: it only got easier). While tuning: the Franchisee first had only a vent door and lost every time (now doors), Cassie got a flashlight (Mangle won alone), Mangle left Music box, and Yenndo and Phantom Foxy left Hallucinations (too many freezes made Golden Freddy a sure thing). 40 random custom nights against the four new guards ran with no errors.

**New animatronics, gimmicks and Gregory** (2026-11-20, 40 runs each): Nights 1–10: 98, 100, 100, 95, 90, 98, 93 (Golden hour, was 75 before Gregory got easier), 70, 50, 38%; 11–20: 100, 73, 75, 80, 60, 88 (Rush hour, was 40), 55, 53, 33, 25%; 21–26: 35, 68, 43, 98, 20, 20%. Max mode with all 45 animatronics: 13/40 (kept v2: it only got easier).

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
