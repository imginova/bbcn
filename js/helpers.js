/* =====================================================================
   helpers.js: tiny tools that every other file uses.

   Loaded FIRST (see the list at the bottom of index.html), so every
   file after this one can use $, store and pick.

   About how the files share things: these are plain <script> files,
   not "modules". Anything declared at the top level of one file (a
   const, let or function) can be used by the files loaded after it.
   ===================================================================== */

// $('clock') is short for document.getElementById('clock'):
// "find the element on the page whose id is clock".
const $ = id => document.getElementById(id);

// store saves small values in the browser (localStorage), so they are
// still there after a reload. We use it for levels, best score and mute.
// Everything is wrapped in try/catch because some browsers block storage
// (for example private windows). Then we just use the fallback value
// instead of crashing.
const store = {
  get(key, fallback) {
    try {
      const saved = localStorage.getItem('nightshift:' + key);
      return saved == null ? fallback : JSON.parse(saved);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try { localStorage.setItem('nightshift:' + key, JSON.stringify(value)); } catch {}
  },
};

// pick(['a', 'b', 'c']) returns one item at random.
// Math.random() gives a number from 0 up to (not including) 1.
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
