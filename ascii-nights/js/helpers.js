/* =====================================================================
   helpers.js: tiny tools that every other file uses.

   Loaded FIRST (see the list at the bottom of index.html), so every
   file after this one can use $, store, pick and byLevel.

   About how the files share things: these are plain <script> files,
   not "modules". Anything declared at the top level of one file (a
   const, let or function) can be used by the files loaded after it.
   ===================================================================== */

// $('clock') is short for document.getElementById('clock'):
// "find the element on the page whose id is clock".
const $ = id => document.getElementById(id);

// store saves small values in the browser (localStorage), so they are
// still there after a reload. We use it for levels, best score, beaten
// challenges and mute. Everything is wrapped in try/catch because some
// browsers block storage (for example private windows). Then we just use
// the fallback value instead of crashing.
const store = {
  get(key, fallback) {
    try {
      const saved = localStorage.getItem('asciinights:' + key);
      return saved == null ? fallback : JSON.parse(saved);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try { localStorage.setItem('asciinights:' + key, JSON.stringify(value)); } catch {}
  },
};

// pick(['a', 'b', 'c']) returns one item at random.
// Math.random() gives a number from 0 up to (not including) 1.
const pick = arr => arr[Math.floor(Math.random() * arr.length)];

// A random number between lo and hi, for example rand(3, 6) could be 4.27.
const rand = (lo, hi) => lo + Math.random() * (hi - lo);

// byLevel(level, at1, at20): a number that slides in a straight line from `at1` at level 1
// to `at20` at level 20. Most difficulty settings in config.js are made with it, for example
// byLevel(level, 6, 3.5) is 6 seconds at level 1, 3.5 seconds at level 20, and in between for
// the levels in between. (level - 1) / 19 goes from 0 at level 1 to 1 at level 20.
const byLevel = (level, at1, at20) => at1 + (at20 - at1) * (level - 1) / 19;
