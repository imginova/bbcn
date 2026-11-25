/* =====================================================================
   helpers.js: tiny tools that every other file uses.

   Loaded FIRST (see the list at the bottom of index.html), so every
   file after this one can use $, store, pick, rand and shuffle.

   About how the files share things: these are plain <script> files,
   not "modules". Anything declared at the top level of one file (a
   const, let or function) can be used by the files loaded after it.
   ===================================================================== */

// $('clock') is short for document.getElementById('clock'):
// "find the element on the page whose id is clock".
const $ = id => document.getElementById(id);

// store saves small values in the browser (localStorage), so they are still there after a reload.
// We use it for the run in progress, your records, the kill tally and mute. Everything is wrapped in
// try/catch because some browsers block storage (for example private windows). Then we just use the
// fallback value instead of crashing.
// Every key starts with "draftnight:", so this game never touches the other games' saves on the same
// website (they use "asciifnaf:", "asciifnaf2:" and so on).
const store = {
  get(key, fallback) {
    try {
      const saved = localStorage.getItem('draftnight:' + key);
      return saved == null ? fallback : JSON.parse(saved);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try { localStorage.setItem('draftnight:' + key, JSON.stringify(value)); } catch {}
  },
};

// pick(['a', 'b', 'c']) returns one item at random.
// Math.random() gives a number from 0 up to (not including) 1.
const pick = arr => arr[Math.floor(Math.random() * arr.length)];

// A random number between lo and hi, for example rand(3, 6) could be 4.27.
const rand = (lo, hi) => lo + Math.random() * (hi - lo);

// A shuffled copy of a list (the original stays as it was). This is the "Fisher-Yates" shuffle:
// walk backwards through the list and swap each item with a random one at or before it.
function shuffle(arr) {
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];   // swap the two
  }
  return copy;
}
