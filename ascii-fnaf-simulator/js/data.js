/* =====================================================================
   data.js: WHO and WHERE. The building, your animatronics, the night
   guards, and the 10 story nights.

   Everything here is plain information (lists and objects). The rules
   that use it are in game.js.
   ===================================================================== */

// ---------- the building ----------
// Each room: its camera name, where it sits on the map (row, column, counted from 1), which side of
// the office it's on ('L' west, 'R' east, 'V' the vents, '' the middle), and which rooms you can walk
// to from it (`to`). `vent: true` rooms are only for animatronics that fit in the vents.
// The Kitchen is like the real FNAF 1 kitchen: its camera has sound but no picture, so the guard can
// never SEE anyone in there.
const ROOMS = {
  backstage: { cam: 'CAM 1', name: 'Backstage',     row: 1, col: 1, side: '',  to: ['stage', 'cove'] },
  stage:     { cam: 'CAM 2', name: 'Show Stage',    row: 1, col: 2, side: '',  to: ['backstage', 'dining', 'prize'] },
  prize:     { cam: 'CAM 3', name: 'Prize Corner',  row: 1, col: 3, side: '',  to: ['stage', 'vent1'] },
  cove:      { cam: 'CAM 4', name: 'Pirate Cove',   row: 2, col: 1, side: 'L', to: ['backstage', 'whall'] },
  dining:    { cam: 'CAM 5', name: 'Dining Area',   row: 2, col: 2, side: '',  to: ['stage', 'kitchen', 'whall', 'supply', 'ehall'] },
  kitchen:   { cam: 'CAM 6', name: 'Kitchen',       row: 2, col: 3, side: 'R', to: ['dining', 'ehall', 'vent2'], audioOnly: true },
  whall:     { cam: 'CAM 7', name: 'West Hall',     row: 3, col: 1, side: 'L', to: ['cove', 'dining', 'supply', 'wcorner'] },
  supply:    { cam: 'CAM 8', name: 'Supply Closet', row: 3, col: 2, side: '',  to: ['dining', 'whall', 'ehall'] },
  ehall:     { cam: 'CAM 9', name: 'East Hall',     row: 3, col: 3, side: 'R', to: ['dining', 'kitchen', 'supply', 'ecorner'] },
  wcorner:   { cam: 'CAM 10', name: 'W. Corner',    row: 4, col: 1, side: 'L', to: ['whall'], entry: 'L' },
  ecorner:   { cam: 'CAM 11', name: 'E. Corner',    row: 4, col: 3, side: 'R', to: ['ehall'], entry: 'R' },
  vent1:     { cam: 'CAM 12', name: 'Vent A',       row: 1, col: 4, side: 'V', to: ['prize', 'vent2'], vent: true },
  vent2:     { cam: 'CAM 13', name: 'Vent B',       row: 2, col: 4, side: 'V', to: ['vent1', 'kitchen', 'vent3'], vent: true },
  vent3:     { cam: 'CAM 14', name: 'Vent C',       row: 3, col: 4, side: 'V', to: ['vent2'], vent: true, entry: 'V' },
};
const ROOM_IDS = Object.keys(ROOMS);
// The three ways into the office, and the room you have to be in to use each one.
const ENTRIES = { L: 'wcorner', R: 'ecorner', V: 'vent3' };
const ENTRY_NAME = { L: 'LEFT DOOR', R: 'RIGHT DOOR', V: 'VENT', O: 'OFFICE' };

// How many moves each room is from the office (worked out once with a "flood fill": start at the
// three rooms next to the office at distance 1, then every room next to those is 2, and so on).
const DIST = {};
(function measure() {
  let edge = Object.values(ENTRIES);
  edge.forEach(r => { DIST[r] = 1; });
  for (let d = 2; edge.length; d++) {
    const next = [];
    edge.forEach(r => ROOMS[r].to.forEach(n => { if (DIST[n] == null) { DIST[n] = d; next.push(n); } }));
    edge = next;
  }
})();

// ---------- the night guard's tools ----------
// The custom night can switch each one on or off. `power` says whether using it costs power.
const TOOLS = {
  cams:     { name: 'Cameras',     desc: 'Watches one room at a time. Needed to wind the music box and to chase off Golden Freddy.' },
  doors:    { name: 'Doors',       desc: 'Shuts the left door, the right door or the vent. Stops anyone coming through, but drains power.' },
  lights:   { name: 'Door lights', desc: 'Peeks into the corners outside the doors. Sees Ballora too.' },
  ventdoor: { name: 'Vent door',   desc: 'Only the vent door, for a guard without the other doors. Drains power while shut.' },
  mask:     { name: 'Freddy mask', desc: 'Fools Freddy, Bonnie, Chica, the toys and the withereds (not the foxes) once they are inside.' },
  flash:    { name: 'Flashlight',  desc: 'Scares off Withered Foxy and Mangle at a door.' },
  lure:     { name: 'Audio lure',  desc: 'Plays a noise that pulls an animatronic back two rooms. Works on most of them.' },
  shock:    { name: 'Shock',       desc: 'Zaps everyone in the room it is watching: they freeze for a few seconds.' },
  hide:     { name: 'Hide',        desc: 'Ducks under the desk: any attack just then fails. Every guard can duck now and then; this one does it far more often.' },
  lockdown: { name: 'Lockdown',    desc: 'Switches off every animatronic ability for 5 s when an attack is coming. Long cooldown.' },
  coins:    { name: 'Death coins', desc: 'Two coins. Each one removes an animatronic for the rest of the night, used when the guard would otherwise be caught.' },
};
const TOOL_IDS = Object.keys(TOOLS);

// ---------- your crew ----------
// kind:
//   'walker'  walks room to room (you click where) and attacks through a door or the vent
//   'foxy'    Foxy: stays in Pirate Cove getting ready, then sprints to the left door
//   'puppet'  never moves: the guard has to keep winding the music box or it gets out
//   'golden'  Golden Freddy (and Withered Golden Freddy): not in any room; appears with his ability
//   'phantom' never attacks (the phantoms, Lolbit): only has an ability that messes with the guard
// move:      seconds between moves (or Foxy's stages)
// attack:    seconds from entering the doorway until the guard is caught, if nothing stops you
// stealth:   0 = normal, higher = harder for the guard to notice, below 0 = noisy
// vents:     can crawl through the vents
// maskable / flashable / lurable: which of the guard's tools work on them (a shut door works on every
//            walker at a door, the vent door on every walker in the vent)
// hidden:    'offstage' = only shows on camera on the Show Stage (Freddy); 'always' = never shows (Ballora)
// ability:   the button you press (Q). cd = seconds between uses
const CREW = [
  { id: 'fre', name: 'Freddy', from: 'FNAF 1', kind: 'walker', home: 'stage', move: 4.5, attack: 4.6, stealth: 0.3, maskable: true,
    lurable: true, hidden: 'offstage', frozenWatched: true,
    ability: { name: 'Laugh', cd: 25, desc: 'A laugh in the dark: the guard loses 4% power.' },
    desc: 'Slow, and he can\'t move while the guard watches his room. Off the stage he hides in the dark: cameras never show him.' },
  { id: 'bon', name: 'Bonnie', from: 'FNAF 1', kind: 'walker', home: 'stage', move: 2.6, attack: 4.2, stealth: 0.1, maskable: true, lurable: true,
    ability: { name: 'Static', cd: 18, desc: 'His camera turns to static for 8 s, so the guard can\'t see that room.' },
    desc: 'The fastest walker. Good at sneaking up the west side.' },
  { id: 'chi', name: 'Chica', from: 'FNAF 1', kind: 'walker', home: 'stage', move: 3.2, attack: 4.4, stealth: 0.15, maskable: true, lurable: true,
    ability: { name: 'Clatter', cd: 20, desc: 'Pots and pans in the kitchen: the guard listens to CAM 6 for 3 s instead of watching anything else.' },
    desc: 'A distraction expert. Clatter, then send someone else in.' },
  { id: 'fox', name: 'Foxy', from: 'FNAF 1', kind: 'foxy', home: 'cove', move: 5, attack: 3.0, stealth: -0.3,
    ability: { name: 'Sprint', cd: 4, desc: 'Only at stage 3: dash to the LEFT door. Very fast, but loud.' },
    desc: 'Gets ready in Pirate Cove (stages 0-3), but only while the guard isn\'t watching the cove. Banging on a shut door still costs the guard 6% power.' },
  { id: 'tbn', name: 'Toy Bonnie', from: 'FNAF 2', kind: 'walker', home: 'prize', move: 3.0, attack: 4.6, stealth: 0.15,
    vents: true, maskable: true, lurable: true,
    ability: { name: 'Vent rush', cd: 30, desc: 'From the Prize Corner or Vent A/B, slide straight to Vent C.' },
    desc: 'A vent crawler. The Freddy mask fools him.' },
  { id: 'tch', name: 'Toy Chica', from: 'FNAF 2', kind: 'walker', home: 'prize', move: 3.4, attack: 4.6, stealth: 0.15,
    vents: true, maskable: true, lurable: true,
    ability: { name: 'Lights out', cd: 30, desc: 'The guard\'s door lights and flashlight cut out for 3 s. Time it for the moment the guard reaches for them.' },
    desc: 'Takes away the guard\'s light. The Freddy mask fools her.' },
  { id: 'wfx', name: 'Withered Foxy', from: 'FNAF 2', kind: 'walker', home: 'backstage', move: 2.4, attack: 3.8, stealth: 0,
    flashable: true, lurable: true,
    ability: { name: 'Dash', cd: 12, desc: 'Ready to move again right now.' },
    desc: 'Quick to arrive and quick to attack. A flashlight scares him off.' },
  { id: 'wfr', name: 'Withered Freddy', from: 'FNAF 2', kind: 'walker', home: 'backstage', move: 4.2, attack: 5.0, stealth: 0.15,
    maskable: true, lurable: true,
    ability: { name: 'Lurch', cd: 30, desc: 'His next attack lands much faster.' },
    desc: 'Slow and heavy, but one lurch and he\'s through the door before the guard can blink. The Freddy mask fools him.' },
  { id: 'wbn', name: 'Withered Bonnie', from: 'FNAF 2', kind: 'walker', home: 'backstage', move: 2.8, attack: 4.4, stealth: 0.25,
    maskable: true, lurable: true,
    ability: { name: 'Faceless', cd: 25, desc: 'Doesn\'t show on any camera for 10 s.' },
    desc: 'No face, so he\'s hard to spot. The Freddy mask fools him.' },
  { id: 'wch', name: 'Withered Chica', from: 'FNAF 2', kind: 'walker', home: 'backstage', move: 3.4, attack: 4.6, stealth: 0.15,
    vents: true, maskable: true, lurable: true,
    ability: { name: 'Jam', cd: 30, desc: 'Jams the vent door open for 4 s: the guard can\'t shut it. Time it for her attack.' },
    desc: 'Crawls the vents like in FNAF 2, and jams the vent door so it can\'t close. The Freddy mask fools her.' },
  { id: 'wgf', name: 'Withered Golden Freddy', from: 'FNAF 2', kind: 'golden', withered: true, attack: 3.2,
    ability: { name: 'Hallucination', cd: 35, desc: 'Appear at once: on the guard\'s monitor if it\'s up (it must drop it), or in the office if it\'s down (it needs the mask, or to flip the monitor up).' },
    desc: 'Like Golden Freddy, but he doesn\'t wait: he punishes whatever the guard is doing right now.' },
  { id: 'lol', name: 'Lolbit', from: 'Sister Location', kind: 'phantom',
    ability: { name: 'Please stand by', cd: 24, desc: 'Takes over the guard\'s computer: it has to type L-O-L for 3 s, and notices much less meanwhile.' },
    desc: 'Never attacks. Works whatever the guard is doing (unlike Phantom BB), but the guard can still react, just slower.' },
  { id: 'mng', name: 'Mangle', from: 'FNAF 2', kind: 'walker', home: 'kitchen', move: 3.0, attack: 4.2, stealth: 0.15,
    vents: true, flashable: true,
    ability: { name: 'Radio static', cd: 25, desc: 'Every camera shows only static for 6 s.' },
    desc: 'Crawls anywhere, vents included. A flashlight scares them off.' },
  { id: 'bb', name: 'Balloon Boy', from: 'FNAF 2', kind: 'walker', home: 'prize', move: 2.6, attack: 4.0, stealth: 0.2,
    vents: true, maskable: true, cantKill: true,
    ability: { name: 'Hi!', cd: 20, desc: 'A giggle: the guard notices nothing for 2.5 s.' },
    desc: 'Can\'t catch the guard. But if he gets in, he takes the guard\'s lights and flashlight for the rest of the night.' },
  { id: 'pup', name: 'The Puppet', from: 'FNAF 2', kind: 'puppet', home: 'prize',
    ability: { name: 'Unwind', cd: 25, desc: 'The music box loses 30%.' },
    desc: 'Waits in the music box. The guard has to keep winding it on the cameras. If it runs out, nothing can stop the Puppet.' },
  { id: 'spr', name: 'Springtrap', from: 'FNAF 3', kind: 'walker', home: 'backstage', move: 3.6, attack: 4.6, stealth: 0.2,
    vents: true, lurable: true,
    ability: { name: 'Shrug off', cd: 30, desc: 'Ignores audio lures for 5 s. Time it for his attack.' },
    desc: 'Quiet, and fits in the vents. Audio lures are his weakness.' },
  { id: 'pfr', name: 'Phantom Freddy', from: 'FNAF 3', kind: 'phantom',
    ability: { name: 'Haunt', cd: 30, desc: 'Breaks the guard\'s cameras until it reboots them.' },
    desc: 'A ghost: never attacks. Broken cameras mean no winding, no Golden Freddy counter, and a blind guard.' },
  { id: 'pbb', name: 'Phantom BB', from: 'FNAF 3', kind: 'phantom',
    ability: { name: 'Jumpscare', cd: 22, desc: 'Only while the guard is on the cameras: it freezes for 2.5 s.' },
    desc: 'A ghost: never attacks. Time the jumpscare with someone else\'s attack.' },
  { id: 'gol', name: 'Golden Freddy', from: 'FNAF 1', kind: 'golden', attack: 3.0,
    ability: { name: 'It\'s me', cd: 35, desc: 'Appear in the office. The guard must flip its cameras up in time, or else.' },
    desc: 'Not in any room. Waits for the guard to put its monitor down, then appears. Broken cameras can\'t save the guard.' },
  { id: 'bab', name: 'Circus Baby', from: 'Sister Location', kind: 'walker', home: 'backstage', move: 4.0, attack: 4.6, stealth: 0.2, lurable: true,
    ability: { name: 'Showtime', cd: 40, desc: 'Everyone else is ready to move, and moves twice as often, for 10 s.' },
    desc: 'The leader. Slow herself, but Showtime makes a rush possible.' },
  { id: 'bal', name: 'Ballora', from: 'Sister Location', kind: 'walker', home: 'dining', move: 3.8, attack: 4.6, stealth: 0.25,
    hidden: 'always',
    ability: { name: 'Waltz', cd: 30, desc: 'Everyone else is harder to notice for 10 s.' },
    desc: 'Never shows on camera, only in a door light. The guard has to listen for her.' },
  { id: 'nfb', name: 'Nightmare Fredbear', from: 'FNAF 4', kind: 'walker', home: 'stage', move: 3.4, attack: 4.4, stealth: 0.15, lurable: true,
    ability: { name: 'Switch', cd: 15, desc: 'From one corner, jump straight to the other corner.' },
    desc: 'Plays both doors. Wait in one corner, then switch when the guard shuts that door.' },
  { id: 'tfr', name: 'Toy Freddy', from: 'FNAF 2', kind: 'walker', home: 'stage', move: 3.6, attack: 4.8, stealth: 0.1,
    maskable: true, lurable: true,
    ability: { name: 'Game over', cd: 30, desc: 'Scrambles the guard\'s memory: it forgets everything it has seen and heard.' },
    desc: 'Makes the guard forget. Great right after it spotted someone waiting in a corner.' },
  { id: 'sbn', name: 'Shadow Bonnie', from: 'FNAF 2', kind: 'phantom',
    ability: { name: 'Glitch', cd: 35, desc: 'Everyone who is frozen is free again and ready to move.' },
    desc: 'Never attacks. Undoes the guard\'s best moments: shocks and slammed doors.' },
  { id: 'nfr', name: 'Nightmare Freddy', from: 'FNAF 4', kind: 'phantom',
    ability: { name: 'Freddles', cd: 25, desc: 'Two Freddles climb into the office.' },
    desc: 'Never attacks. Freddles pile up in the office by themselves too (up to 4). Each one makes the guard notice less, and it wastes time shooing them.' },
  { id: 'nbn', name: 'Nightmare Bonnie', from: 'FNAF 4', kind: 'walker', home: 'stage', move: 3.0, attack: 4.6, stealth: 0.15, lurable: true,
    ability: { name: 'Hold breath', cd: 30, desc: 'His next attack is very hard to hear: a camera or a door light finds him best.' },
    desc: 'Silent at the door when he holds his breath. Strong against guards without lights.' },
  { id: 'nch', name: 'Nightmare Chica', from: 'FNAF 4', kind: 'walker', home: 'stage', move: 3.2, attack: 4.6, stealth: 0.15, lurable: true,
    ability: { name: 'Cupcake', cd: 20, desc: 'Her cupcake gets into the office: it eats power and distracts the guard until it\'s shooed away.' },
    desc: 'Sends her cupcake ahead of her.' },
  { id: 'ptr', name: 'Plushtrap', from: 'FNAF 4', kind: 'walker', home: 'supply', move: 2.4, attack: 4.0, stealth: 0.2, onlyMonitorUp: true, lurable: true,
    ability: { name: 'Freeze tag', cd: 30, desc: 'Moves and attacks even while the guard isn\'t on its monitor, for 6 s.' },
    desc: 'Very fast, but he only moves (and attacks) while the guard is looking at its monitor.' },
  { id: 'ffr', name: 'Funtime Freddy', from: 'Sister Location', kind: 'walker', home: 'stage', move: 3.2, attack: 4.4, stealth: 0.1, lurable: true,
    ability: { name: 'Bon-Bon', cd: 22, desc: 'Bon-Bon bangs on the door on the OTHER side: the guard shuts it and wastes time.' },
    desc: 'A fake-out: send Bon-Bon to one door, then come through the other.' },
  { id: 'enn', name: 'Ennard', from: 'Sister Location', kind: 'walker', home: 'backstage', move: 3.4, attack: 4.6, stealth: 0.3, vents: true, lurable: true,
    ability: { name: 'Pry open', cd: 35, desc: 'From a corner or Vent C, pries the shut door open: it can\'t be shut again for 4 s.' },
    desc: 'Wires everywhere. A shut door doesn\'t stop him for long.' },
  { id: 'pfx', name: 'Phantom Foxy', from: 'FNAF 3', kind: 'phantom',
    ability: { name: 'Lunge', cd: 22, desc: 'Only while the guard\'s monitor is DOWN: it freezes for 1.5 s.' },
    desc: 'A ghost: never attacks. The partner of Phantom BB, who only works while the monitor is up.' },
];
const CREW_BY_ID = Object.fromEntries(CREW.map(c => [c.id, c]));
const MAX_CREW = 6;   // the most animatronics in one night (keys 1 to 6)

// ---------- the night guards ----------
// skill:   how sharp it is on its story night (0 to 20)
// tools:   what it can use
// camLove: how much of its time it spends on the cameras (0 to 1)
// doorHold: how long it keeps a door shut after its last clue, times its memory (bigger = wastes power)
// lightLove: how often it checks a door light when sitting at its desk
// reboot:  seconds to reboot broken cameras (REBOOT_TIME if missing)
const GUARDS = [
  { id: 'mike', name: 'Mike Schmidt', from: 'FNAF 1', skill: 2, tools: ['cams', 'doors', 'lights'], camLove: 0.45, doorHold: 1, lightLove: 0.35,
    desc: 'On his first week. Checks the cameras, shuts the doors, peeks with the lights.' },
  { id: 'fritz', name: 'Fritz Smith', from: 'FNAF 2', skill: 4, tools: ['cams', 'doors'], camLove: 0.35, doorHold: 2.2, lightLove: 0, hears: 1.4,
    desc: 'Jumpy. Slams a door at the smallest noise and keeps it shut far too long: great for draining his power.' },
  { id: 'jeremy', name: 'Jeremy Fitzgerald', from: 'FNAF 2', skill: 6, tools: ['cams', 'mask', 'flash'], camLove: 0.55, doorHold: 1, lightLove: 0.2,
    desc: 'No doors at all. A Freddy mask for the toys and a flashlight for Foxy.' },
  { id: 'phone', name: 'Phone Guy', from: 'FNAF 1', skill: 9, tools: ['cams', 'doors', 'lights'], camLove: 0.8, doorHold: 1, lightLove: 0.25, slowDown: 0.3,
    desc: 'Glued to the cameras. Sees a lot, but is slow to look up from them.' },
  { id: 'fright', name: 'Fazbear\'s Fright guard', from: 'FNAF 3', skill: 7, tools: ['cams', 'lure', 'ventdoor'], camLove: 0.65, doorHold: 1, lightLove: 0, reboot: 1.6,
    desc: 'No doors: keeps you away with audio lures, and seals the vent. Reboots systems very fast.' },
  { id: 'michael', name: 'Michael Afton', from: 'Sister Location', skill: 8, tools: ['cams', 'doors', 'shock'], camLove: 0.55, doorHold: 1, lightLove: 0,
    desc: 'Shocks whoever he catches on camera. No door lights.' },
  { id: 'gregory', name: 'Gregory', from: 'Security Breach', skill: 10, tools: ['cams', 'doors', 'hide'], camLove: 0.5, doorHold: 1, lightLove: 0,
    desc: 'Small and sneaky: when he can\'t stop an attack, he hides. One hide, then a long wait.' },
  { id: 'vanessa', name: 'Vanessa', from: 'Security Breach', skill: 8, tools: ['cams', 'doors', 'lights', 'flash', 'ventdoor'], camLove: 0.5, doorHold: 0.8, lightLove: 0.6,
    desc: 'Careful. Checks the lights all the time and wastes little power.' },
  { id: 'henry', name: 'Henry Emily', from: 'FNAF 6', skill: 12, tools: ['cams', 'doors', 'lights', 'lure', 'shock'], camLove: 0.55, doorHold: 0.6, lightLove: 0.4,
    desc: 'He built half of you. Lures, shocks, doors and lights.' },
  { id: 'mike2', name: 'Mike Schmidt (veteran)', from: 'FNAF 1', skill: 15, tools: ['cams', 'doors', 'lights', 'ventdoor', 'mask', 'flash', 'lure', 'shock', 'hide'], camLove: 0.5, doorHold: 0.8, lightLove: 0.45,
    desc: 'Back for one more night, with every tool there is.' },
  // The hardest guard (on request): the highest skill, every tool, and every other guard's good habit,
  // each at least as strong as on the guard it comes from: Fritz's ears (hears 1.4 -> 1.5), the Fright
  // guard's fast reboots (1.6 -> 1.0 s), Vanessa's light checks (lightLove 0.6) and Henry's careful doors
  // (doorHold 0.6). Phone Guy's camera habit (camLove 0.8) is left out on purpose: the bot showed it makes
  // a guard weaker (it notices less while staring at the cameras). Plus two of its own: grit and thrift.
  { id: 'tendons8', name: 'The Tendons 8', from: 'ASCII FNAF Simulator', skill: 20, tools: TOOL_IDS.slice(), camLove: 0.5, doorHold: 0.6, lightLove: 0.6,
    hears: 1.5, reboot: 1.0, slowDown: -0.15, grit: 0.5, thrift: 0.35,
    desc: 'The hardest guard there is. Every tool, including two of its own: 2 death coins (each removes an animatronic for the night) and Lockdown (switches your abilities off for a while). Plus every other guard\'s best habit: Fritz\'s ears, the Fright guard\'s fast reboots, Vanessa\'s light checks and Henry\'s careful doors, and faster hands than anyone. Your tricks work about a third as well on it, and it uses about a third of the power.' },
];
const GUARD_BY_ID = Object.fromEntries(GUARDS.map(g => [g.id, g]));

// ---------- the 10 story nights ----------
// Each night picks its crew for a kind of play (its "niche"), not just one game's characters, and
// pairs it with a guard that makes that play interesting.
const NIGHTS = [
  { name: 'First shift', guard: 'mike', crew: ['bon', 'chi'],
    tip: 'Move when the guard\'s camera (the red REC dot) is somewhere else. Attack from a corner when he\'s busy on the cameras.' },
  { name: 'Pirate Cove', guard: 'fritz', crew: ['fre', 'fox', 'bon'],
    tip: 'Fritz shuts doors at any noise. Keep him scared on both sides and his power will run out. Foxy bangs 6% off every time.' },
  { name: 'Toy box', guard: 'jeremy', crew: ['tbn', 'tch', 'tfr', 'mng', 'pup'],
    tip: 'No doors tonight. The mask stops the toys and the flashlight stops Mangle, but every second he spends winding is a second he isn\'t looking.' },
  { name: 'Distraction', guard: 'phone', crew: ['chi', 'lol', 'bb', 'bon'],
    tip: 'Phone Guy lives on the cameras. Keep him busy: Lolbit takes over his computer, Chica clatters, and Balloon Boy can steal his lights.' },
  { name: 'Fazbear\'s Fright', guard: 'fright', crew: ['spr', 'pfr', 'pbb', 'pfx'],
    tip: 'Only Springtrap can catch him. Use Shrug off so his lures fail, and frighten him with the phantoms: BB while the monitor is up, Foxy while it\'s down.' },
  { name: 'Circus Gallery', guard: 'michael', crew: ['bab', 'bal', 'ffr', 'enn'],
    tip: 'Michael shocks whatever he sees, but he can\'t see Ballora. Bon-Bon fakes one door, Ennard pries the other open.' },
  { name: 'Golden hour', guard: 'gregory', crew: ['gol', 'fre', 'bon', 'tch', 'pup'],
    tip: 'Gregory hides once, then waits a long time. Make him hide, then hit him again straight away.' },
  { name: 'Parts & Service', guard: 'vanessa', crew: ['wfr', 'wbn', 'wch', 'wfx'],
    tip: 'The withered crew. Vanessa watches the doors with her lights: Jam her vent door, hide Bonnie\'s face, then Lurch through.' },
  { name: 'Nightmares', guard: 'henry', crew: ['nfb', 'nbn', 'nch', 'nfr', 'ptr'],
    tip: 'Henry has an answer for everything, but not all at once. Bury him in Freddles and cupcakes, make him shut one door, then Switch Fredbear to the other.' },
  { name: 'One more night', guard: 'mike2', crew: ['wgf', 'wfx', 'pup', 'pfr', 'mng', 'sbn'],
    tip: 'Every tool against every trick. Break his cameras and he can\'t wind the box, then let the withereds in.' },
];

// ---------- custom night challenges ----------
// Ready-made custom nights with a name. Beating one saves a ✓ under its name plus its version `v`
// ("Max mode v1"): if a change ever makes a challenge harder, raise its `v` so the old ✓ no longer counts.
// crew: 'all' means every animatronic in the game at once.
const CHALLENGES = [
  { id: 'max', name: 'Max mode', v: 2, guard: 'tendons8', skill: 20, tools: TOOL_IDS.slice(), crew: 'all', level: 15,
    power: 100, hour: HOUR_SECONDS, speed: 100,
    desc: 'Every animatronic in the game at once, against The Tendons 8: skill 20 and every tool.' },
];
const challengeKey = c => `${c.name} v${c.v}`;

// ---------- achievements ----------
// Checked at the end of every night you win (checkAchievements in game.js). Once earned, an achievement
// is saved by its id and never taken away.
const ACHIEVEMENTS = [
  { id: 'first',    name: 'First catch',     desc: 'Catch a night guard.' },
  { id: 'speed',    name: 'Speedrun',        desc: 'Catch the guard before 1 AM.' },
  { id: 'close',    name: 'Just in time',    desc: 'Catch the guard at 5 AM or later.' },
  { id: 'clean',    name: 'Flawless',        desc: 'Win a night without anyone being sent back.' },
  { id: 'hands',    name: 'No tricks',       desc: 'Win a night without using a single ability.' },
  { id: 'blackout', name: 'Lights out',      desc: 'Win by running the guard\'s power out.' },
  { id: 'music',    name: 'Pop goes the box', desc: 'Win with the Puppet.' },
  { id: 'golden',   name: 'It\'s me',         desc: 'Win with Golden Freddy or Withered Golden Freddy.' },
  { id: 'graduate', name: 'Graduation',      desc: 'Beat Night 10.' },
  { id: 'bankrupt', name: 'Out of coins',    desc: 'Catch The Tendons 8 after it spent both death coins.' },
  { id: 'maxed',    name: 'Maxed out',       desc: 'Beat Max mode.' },
  { id: 'hunter',   name: 'Guard hunter',    desc: 'Catch every night guard at least once.' },
  { id: 'crew',     name: 'Whole crew',      desc: 'Catch a guard at least once with every animatronic that can.' },
];
