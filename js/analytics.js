/* =====================================================================
   analytics.js: counting how the game is going, with Google Analytics.

   Loaded SECOND (right after helpers.js), so game.js and input.js can
   report to it, and started by boot() in main.js. It only does anything on the
   public website (https://imginova.github.io/bbcn/). There, the build
   script (tools/build.js) adds Google's tag to the page, which creates
   window.gtag and window.GA_ID. Anywhere else (double-clicking
   index.html, or the Claude Artifact link) gtag doesn't exist, so every
   function here quietly does nothing.

   What gets counted ("events", sent with gtag('event', name, details)):
     night_start         a night began (levels, modifiers, challenge)
     death               something got you (who, which door, what time)
     night_win           you made it to 6 AM
     challenge_complete  you beat a challenge
     night_quit          you used "Quit to setup" mid-night
     night_abandon       you closed or left the page mid-night
   ANALYTICS.md explains how to set up Google Analytics and read these.

   CONSENT ("may we remember you?"): privacy laws in Europe and some US
   states say a site must ask before it stores an ID that recognizes a
   returning visitor. So on the first visit we look up roughly where
   the player is (country and state, from their internet address). In
   one of those places, or if the lookup fails, a small banner asks.
   Elsewhere we count straight away. Without permission Google only
   gets anonymous "something happened" pings with no cookie and no ID.
   ===================================================================== */

// Countries where we ask first: the 27 EU countries, the rest of the EEA (Iceland, Liechtenstein,
// Norway), the UK and Switzerland. Two-letter codes from the ISO 3166 standard.
const CONSENT_COUNTRIES = [
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE',
  'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
  'IS', 'LI', 'NO', 'GB', 'CH',
];
// US states with their own privacy laws (as of 2026). The lookup service names the state in full,
// and Google wants "US-" plus the state's two-letter code, so we keep both.
const CONSENT_STATES = {
  'California': 'CA', 'Virginia': 'VA', 'Colorado': 'CO', 'Connecticut': 'CT', 'Utah': 'UT',
  'Texas': 'TX', 'Oregon': 'OR', 'Montana': 'MT', 'Iowa': 'IA', 'Delaware': 'DE',
  'New Hampshire': 'NH', 'New Jersey': 'NJ', 'Nebraska': 'NE', 'Tennessee': 'TN', 'Minnesota': 'MN',
  'Maryland': 'MD', 'Indiana': 'IN', 'Kentucky': 'KY', 'Rhode Island': 'RI',
};

// The free location lookup (no account or key needed). It answers with JSON like
// { "country_code": "US", "region": "California", ... }. We remember the answer for 30 days.
const GEO_URL = 'https://get.geojs.io/v1/ip/geo.json';
const GEO_DAYS = 30;

const analytics = (() => {
  // Is Google's tag on this page? (Only on the public website, see the top of this file.)
  const on = typeof window.gtag === 'function' && !!window.GA_ID;
  let allowed = false;      // may we use a cookie and our player ID? (decided in start() below)
  let nightReported = true; // has the current night's ending already been sent? (stops double counting)

  // Numbers kept on this device: how many nights, wins and deaths, when it first played,
  // and how many tries each challenge took. They're part of the game's own saved data,
  // and are only sent to Google when `allowed` is true.
  const stats = Object.assign({ nights: 0, wins: 0, deaths: 0, firstSeen: new Date().toISOString().slice(0, 10), attempts: {} },
    store.get('stats', {}));
  store.set('stats', stats);

  // Does this place need a consent banner? `geo` is the lookup's answer, or null if it failed.
  const needsConsent = geo => !geo || CONSENT_COUNTRIES.includes(geo.country) ||
    (geo.country === 'US' && geo.region in CONSENT_STATES);

  // Ask where the player is, at most once every GEO_DAYS days. Gives null if it fails or takes over 3 seconds.
  // (async/await: "await" waits for the answer from the internet without freezing the game.)
  async function lookupGeo() {
    const saved = store.get('geo', null);
    if (saved && Date.now() - saved.t < GEO_DAYS * 864e5) return saved;   // 864e5 = milliseconds in a day
    try {
      const res = await fetch(GEO_URL, { signal: AbortSignal.timeout(3000) });
      const data = await res.json();
      const geo = { country: data.country_code, region: data.region, t: Date.now() };
      store.set('geo', geo);
      return geo;
    } catch {
      return null;
    }
  }

  // Tracking is allowed: make sure this device has its random player ID, and tell Google
  // about this player (the ID plus their stats) so reports can follow them over time.
  function allow() {
    allowed = true;
    let id = store.get('playerId', null);
    if (!id) {
      id = crypto.randomUUID();   // a random code like "3f2c9a1e-...", not linked to who you are
      store.set('playerId', id);
    }
    sendPlayer();
  }

  // "User properties" describe the player rather than one event: Google keeps the latest value.
  function sendPlayer() {
    if (!on || !allowed) return;
    gtag('set', 'user_properties', {
      player_id: store.get('playerId', ''),
      nights_played: stats.nights,
      wins_total: stats.wins,
      deaths_total: stats.deaths,
      challenges_cleared: cleared.length,
      best_score: best ? best.sum : 0,
      first_seen: stats.firstSeen,
    });
  }

  // Send one event. The player ID and night number ride along when tracking is allowed.
  function send(name, details) {
    if (!on) return;
    gtag('event', name, allowed ? { ...details, player_id: store.get('playerId', ''), night_number: stats.nights } : details);
  }

  // What tonight looks like: the score, the levels as "5,5,5,...", ticked modifiers and the challenge.
  function night() {
    const ticked = SETUP.filter((c, i) => mods[i] && levels[i] > 0).map(c => c.id);
    const challenge = matchingPreset();
    return { score: nightScore(), levels: levels.join(','), mods: ticked.join(',') || 'none', challenge: challenge ? challenge.name : 'custom' };
  }

  // How far into the night we are, for endings.
  const progress = () => ({ seconds: Math.round(G.t), hour: hourOf(G.t), power: Math.max(0, Math.round(G.power)) });

  // ---------- consent ----------
  // The banner's two buttons (wired up in input.js) call this. The choice is remembered.
  function choose(yes) {
    store.set('consent', yes ? 'granted' : 'denied');
    $('consent').hidden = true;
    if (!on) return;
    gtag('consent', 'update', { analytics_storage: yes ? 'granted' : 'denied' });
    if (yes) allow();
    else { allowed = false; store.set('playerId', null); }   // saying no also forgets the player ID
  }

  // The Privacy button in the top bar opens the banner again, to change your mind.
  function openBanner() { $('consent').hidden = false; }

  // Runs once when the page loads.
  async function start() {
    if (!on) return;
    $('btnPrivacy').hidden = false;
    // Google's own safety net: in the consent places, Google itself (which knows the player's
    // location from their internet address) treats storage as "denied" until the player says yes.
    // Ads features are always off. This has to come before 'config'.
    gtag('consent', 'default', {
      analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied',
      region: [...CONSENT_COUNTRIES, ...Object.values(CONSENT_STATES).map(code => 'US-' + code)],
    });
    gtag('consent', 'default', { analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });

    const choice = store.get('consent', null);
    if (choice) gtag('consent', 'update', { analytics_storage: choice });
    gtag('js', new Date());
    // Adding ?debug_analytics to the address shows events live in Google Analytics' DebugView.
    gtag('config', window.GA_ID, location.search.includes('debug_analytics') ? { debug_mode: true } : {});

    if (choice) { if (choice === 'granted') allow(); return; }   // they already decided
    if (needsConsent(await lookupGeo())) openBanner();
    else allow();
  }

  // ---------- the game reports in (calls from game.js and input.js) ----------
  function nightStart() {
    stats.nights++;
    const n = night();
    if (n.challenge !== 'custom') stats.attempts[n.challenge] = (stats.attempts[n.challenge] || 0) + 1;
    store.set('stats', stats);
    nightReported = false;
    sendPlayer();
    send('night_start', n);
  }

  // Something got you. `killer` is its id from data.js ('dia', 'len', 'smi', ...), `side` is 'L', 'R'
  // or null (in your office), `dark` is true when the power had run out.
  function death(killer, side, dark) {
    if (nightReported) return;
    nightReported = true;
    stats.deaths++;
    store.set('stats', stats);
    sendPlayer();
    send('death', { ...night(), ...progress(), killer, side: side || 'office', power_out: dark ? 'yes' : 'no' });
  }

  // Made it to 6 AM. `challenge` is the matching PRESETS entry or null.
  function win(isBest, challenge, firstTime) {
    if (nightReported) return;
    nightReported = true;
    stats.wins++;
    store.set('stats', stats);
    sendPlayer();
    send('night_win', { ...night(), ...progress(), is_best: isBest ? 'yes' : 'no' });
    if (challenge) {
      send('challenge_complete', { challenge: challenge.name, first_time: firstTime ? 'yes' : 'no', attempts: stats.attempts[challenge.name] || 1 });
    }
  }

  // Left a night before it ended: how = 'quit' (Quit to setup) or 'abandon' (closed the page).
  function leave(how) {
    if (nightReported) return;
    nightReported = true;
    send('night_' + how, { ...night(), ...progress() });
  }

  return { start, choose, openBanner, nightStart, death, win, leave };
})();
// analytics.start() is called by boot() in main.js, once every other file has loaded
// (it needs `best` and `cleared` from game.js).
