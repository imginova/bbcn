/* =====================================================================
   run.js: the RUN. Draft Night is a "roguelite": you play a run made of
   several nights in a row, and the run carries over from night to night.

   How a run works:
     1. The pick screen shows OFFER_SIZE (5) characters. Take as many as
        you like (or none); they join your LINEUP for the rest of the run.
     2. You play a night against everyone in your lineup.
     3. Survive it, and if your lineup is worth the run's goal or more
        (100, 150, 250 or 400 points, by the difficulty in DIFFICULTIES),
        you've won the run. If not, it's back to the pick screen for the
        next night.
     4. Get caught, and you lose a life and replay the same night. At 0
        lives the run is over.

   The run is saved in the browser after every step, so closing the page
   never loses it. (Closing it in the middle of a night just means that
   night starts again from 12 AM next time.)
   ===================================================================== */

// ---------- saved in the browser ----------
// The run in progress, or null when there isn't one:
//   night   which night you're on (1, 2, 3...)
//   lives   lives left
//   lineup  the ids of everyone in your lineup, like ['fre', 'chi']
//   offer   the ids of the characters on the pick screen (empty once you've started the night)
//   picked  the ids you've taken from the offer so far (they join the lineup when the night starts)
//   diff    the run's difficulty, like 'hard' (runs saved before difficulties existed don't have one)
let run = store.get('run', null);

// The difficulty the NEXT new run will use, picked on the title screen. A run in progress keeps its own.
let difficulty = store.get('difficulty', DEFAULT_DIFF);
if (!DIFFICULTIES[difficulty]) difficulty = DEFAULT_DIFF;   // only in memory: the saved value is left alone

// A run's difficulty, and how many points it needs to win. A run without one (or with one this
// version doesn't know) counts as Normal, the goal every run had before difficulties.
const diffOf = r => r && DIFFICULTIES[r.diff] ? r.diff : DEFAULT_DIFF;
const goalOf = r => DIFFICULTIES[diffOf(r)].goal;

// Your records over every run. RULE: saved things are only ever added to, never thrown away.
//   runs       runs started
//   wins       runs won (every difficulty)
//   bestNight  the most nights survived in one run
//   bestPoints the most points a lineup was worth on a night you survived
//   fastestWin the fewest nights a won run took (0 until you win one; every difficulty)
//   diffs      wins and fastestWin for each difficulty, like { hard: { wins: 1, fastestWin: 6 } }
const records = Object.assign({ runs: 0, wins: 0, bestNight: 0, bestPoints: 0, fastestWin: 0 }, store.get('records', {}) || {});
// Records saved before difficulties existed have no `diffs`. Every run back then was Normal, so the
// wins so far become Normal's. (Nothing is removed: wins and fastestWin stay as they were.)
if (!records.diffs) records.diffs = records.wins ? { normal: { wins: records.wins, fastestWin: records.fastestWin } } : {};
// The records of one difficulty (made empty the first time it's needed).
const diffRecord = d => records.diffs[d] || (records.diffs[d] = { wins: 0, fastestWin: 0 });

const saveRun = () => store.set('run', run);
const saveRecords = () => store.set('records', records);

// Pick the difficulty for the next new run (the title screen's buttons and the D key).
function setDifficulty(d) {
  if (!DIFFICULTIES[d]) return;
  difficulty = d;
  store.set('difficulty', d);
  sfx.pickCard(true);
  renderTitle();
}

// The characters in a list of ids. An id this version of the game doesn't know (from a newer or
// older version) is skipped here, but it stays in the saved run, so nothing is lost.
const charsOf = ids => ids.map(byId).filter(Boolean);
// How many points a list of ids is worth.
const pointsOfIds = ids => charsOf(ids).reduce((total, c) => total + pointsOf(c), 0);

// Everyone who'll be on tonight: the lineup, plus the cards picked on this pick screen.
const tonightIds = () => run ? [...run.lineup, ...run.picked] : [];
// Is character c on tonight? (game.js asks this for every character.)
const isOn = c => tonightIds().includes(c.id);

// ---------- the pick screen's cards ----------
// Deal up to OFFER_SIZE cards from the characters you don't have yet. Each card first rolls a rarity
// (common most often, legendary least, by each rarity's `weight` in data.js), then picks a random
// character of that rarity. Only rarities with someone left to offer can be rolled. When fewer than
// OFFER_SIZE characters are left, you get them all.
function makeOffer(owned) {
  let left = ROSTER.filter(c => !owned.includes(c.id));
  const offer = [];
  while (offer.length < OFFER_SIZE && left.length) {
    const rarities = RARITY_ORDER.filter(r => left.some(c => c.rarity === r));
    const total = rarities.reduce((sum, r) => sum + RARITIES[r].weight, 0);
    // Roll a number from 0 up to the total weight and see which rarity's slice it lands in.
    let roll = Math.random() * total, rarity = rarities[rarities.length - 1];
    for (const r of rarities) {
      if (roll < RARITIES[r].weight) { rarity = r; break; }
      roll -= RARITIES[r].weight;
    }
    const c = pick(left.filter(x => x.rarity === rarity));
    offer.push(c.id);
    left = left.filter(x => x !== c);
  }
  // Show the cards from most common to rarest.
  return offer.sort((a, b) => RARITY_ORDER.indexOf(byId(a).rarity) - RARITY_ORDER.indexOf(byId(b).rarity));
}

// ---------- the steps of a run ----------
// Start a brand new run (throwing away the one in progress, if any).
function newRun() {
  run = { night: 1, lives: LIVES, lineup: [], offer: makeOffer([]), picked: [], diff: difficulty };
  records.runs++;
  saveRecords();
  saveRun();
  showPick();
}

// Take a card from the offer, or put it back.
function togglePick(id) {
  if (!run || !run.offer.includes(id)) return;
  const taking = !run.picked.includes(id);
  run.picked = taking ? [...run.picked, id] : run.picked.filter(x => x !== id);
  sfx.pickCard(taking);
  saveRun();
  renderPick();
}

// "Start night": the picked cards join the lineup for good, and the night begins.
function beginNight() {
  if (!run) return;
  run.lineup = [...run.lineup, ...run.picked];
  run.picked = [];
  run.offer = [];
  saveRun();
  startNight();
}

// You made it to 6 AM (called by win() in game.js). Returns what happened, for the win screen:
// 'won' (the whole run), or 'next' (on to the next pick screen).
function nightSurvived() {
  const points = pointsOfIds(run.lineup);
  records.bestNight = Math.max(records.bestNight, run.night);
  records.bestPoints = Math.max(records.bestPoints, points);
  if (points >= goalOf(run)) {
    const fastest = old => old ? Math.min(old, run.night) : run.night;
    records.wins++;
    records.fastestWin = fastest(records.fastestWin);
    const mine = diffRecord(diffOf(run));   // this difficulty's own records
    mine.wins++;
    mine.fastestWin = fastest(mine.fastestWin);
    saveRecords();
    const done = run;
    run = null;   // the run is over: it's won
    saveRun();
    return { result: 'won', run: done, points };
  }
  saveRecords();
  run.night++;
  run.offer = makeOffer(run.lineup);
  run.picked = [];
  saveRun();
  return { result: 'next', run, points };
}

// You got caught (called by the lose functions in game.js). One life gone; at 0 the run is over.
// Returns the run as it was (for the game over screen) and whether it's over.
function nightLost() {
  run.lives--;
  if (run.lives > 0) { saveRun(); return { over: false, run }; }
  const done = run;
  run = null;
  saveRun();
  return { over: true, run: done };
}
