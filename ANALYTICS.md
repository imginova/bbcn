# Putting the game online and counting how it goes

The game is published as a free website with **GitHub Pages**, and **Google Analytics 4 (GA4)** counts plays, deaths, wins and challenge completions. This guide is the one-time setup, then how to read the numbers.

- Public link (once set up): https://imginova.github.io/bbcn/
- The private Claude Artifact link still works. It has **no** analytics (it never loads Google's tag).
- The double-clickable `index.html` also has none.

## How it fits together

| Piece | What it does |
|---|---|
| `tools/build.js` | Copies the game into a `dist/` folder, wraps `index.html` in a proper web page and adds Google's tag (when `GA_ID` is set). |
| `.github/workflows/deploy.yml` | On every pull request: checks the code and builds it. On every push to `main` (a merged pull request): also puts `dist/` online. |
| `js/analytics.js` | Sends the events below, decides whether to show the consent banner, and keeps a random player ID on each device. |

Nothing is installed on your computer to deploy: merge to `main` and the site updates in about a minute.

## One-time setup

### 1. Turn on GitHub Pages (needs the `imginova` account, which owns the repo)
1. Open https://github.com/imginova/bbcn/settings/pages
2. Under **Build and deployment → Source**, choose **GitHub Actions**.

That is all. The first deploy happens the next time something is pushed to `main`, or press **Run workflow** on the Actions tab.

### 2. Create the Google Analytics property
1. Go to https://analytics.google.com and sign in with a Google account.
2. **Admin** (the gear, bottom left) → **Create → Property**. Name it "Bare Bones Custom Night", pick your time zone and currency.
3. When asked about your business, answer anything that fits; it only tunes the menus.
4. **Data collection → Web**. Website URL: `https://imginova.github.io/bbcn/`, stream name "Bare Bones Custom Night". Leave "Enhanced measurement" on.
5. Copy the **Measurement ID** (looks like `G-ABC123XYZ9`).
6. Open `tools/build.js` and paste it into `const GA_ID = '';` between the quotes. The ID isn't a secret (it is in the web page for everyone). Commit and merge.

### 3. Keep the data for 14 months
**Admin → Data collection and modification → Data retention** → set **Event data retention** to **14 months** (the default is only 2 months, which would hide "how do they do over time").

### 4. Tell GA about the custom details
GA only lets you slice reports by details it has been told about. **Admin → Data display → Custom definitions → Create custom dimension**. Make each one below (the "Event parameter" is the name sent by the game):

| Scope | Dimension name | Event parameter / User property |
|---|---|---|
| Event | Killer | `killer` |
| Event | Door | `side` |
| Event | Challenge | `challenge` |
| Event | Hour | `hour` |
| Event | Power out | `power_out` |
| Event | Modifiers | `mods` |
| Event | Levels | `levels` |
| Event | Night number | `night_number` |
| Event | Score | `score` |
| Event | First time | `first_time` |
| User | Player ID | `player_id` |
| User | Nights played | `nights_played` |
| User | Wins total | `wins_total` |
| User | Deaths total | `deaths_total` |
| User | Challenges cleared | `challenges_cleared` |
| User | Best score | `best_score` |

Dimensions only fill in from the day they are created, so do this before launch if you can. (Numbers like seconds survived and power left are fine to analyse in BigQuery, below, without registering.)

### 5. (Recommended) Send the raw events to BigQuery
This is how you follow **one player over many nights**. It is free for a game this size (the daily export; don't turn on "streaming").
1. **Admin → Product links → BigQuery links → Link**.
2. Choose or create a Google Cloud project (the free sandbox is fine, but sandbox tables **expire after 60 days** unless you add billing details; adding billing doesn't cost anything at this size).
3. Select **Daily** export, include **events**, and finish.
4. A table `events_YYYYMMDD` appears each day under the dataset `analytics_<number>`.

## What the game sends

Every event also carries `player_id` and `night_number` when the player has allowed tracking.

| Event | When | Details |
|---|---|---|
| `night_start` | a night begins | `score`, `levels` (`"5,5,5,5,5,5,5,5,5"` in ◆ ▲ ● Lenny ■ (: Ж ¤ Ψ order), `mods` (ids like `dia,sqr`), `challenge` (name, or `custom`) |
| `death` | something got you | the above plus `killer` (`dia` `tri` `orb` `len` `sqr` `smi` `crw` `flk` `vis` `ech` `slk` `pek` `spm`), `side` (`L`, `R` or `office`; the vent crawlers, ¥ and © count as `office`), `hour` (0–5; a long Tasks night can reach 6), `seconds`, `power`, `power_out` (`yes`/`no`) |
| `night_win` | 6 AM reached | `score`, `levels`, `mods`, `challenge`, `seconds`, `power`, `is_best` |
| `challenge_complete` | a win that matches a challenge | `challenge`, `first_time`, `attempts` (tries at that challenge on this device) |
| `night_quit` | "Quit to setup" mid-night | same details as `night_start` plus `seconds` |
| `night_abandon` | tab closed or left mid-night | same as `night_quit` |

Plus **user properties** describing the device: `nights_played`, `wins_total`, `deaths_total`, `challenges_cleared`, `best_score`, `first_seen`, `player_id`.

## Who is counted: consent

- **Everywhere outside the places below:** counting starts straight away and the device gets a random `player_id` (a code like `3f2c9a1e-…`; nothing personal).
- **EU/EEA, UK, Switzerland and 19 US states with privacy laws** (California, Virginia, Colorado, Connecticut, Utah, Texas, Oregon, Montana, Iowa, Delaware, New Hampshire, New Jersey, Nebraska, Tennessee, Minnesota, Maryland, Indiana, Kentucky, Rhode Island): a banner asks first. The list is `CONSENT_COUNTRIES` / `CONSENT_STATES` at the top of `js/analytics.js`.
- **How the place is found:** the first visit asks the free service `get.geojs.io` for the visitor's country and state (the answer is remembered for 30 days). If that fails, the banner is shown to be safe.
- **Decline:** GA still gets anonymous pings (no cookie, no `player_id`, no counters), so overall totals stay roughly right, but that visitor can't be followed over time. Declining also deletes the saved `player_id`.
- A small **Privacy** button at the top of the page reopens the banner so anyone can change their mind.
- Google applies its own location rule too, so a player in a listed place is treated as "denied" by GA even before the banner is answered. Ad features are always off.

If the audience ever includes many players under 13, stop and rethink this: Google Analytics' terms don't allow it on sites aimed at young children.

## Reading the numbers (in analytics.google.com)

- **Reports → Realtime:** someone playing right now. Handy right after launch.
- **Reports → Retention** and **Reports → Demographics → New vs returning:** how many come back, from the same device. (GA's own cookie does this, separately from `player_id`.)
- **Explore → Free form:** drag in **Event name** and **Killer** to see what kills people most, **Hour** to see when, **Challenge** for completion rates (`night_win` vs `death` per challenge).
- **Explore → Cohort exploration:** pick `night_start` as the starting event to see how many players come back in week 2, 3…
- **Admin → DebugView:** add `?debug_analytics` to the game's address (`https://imginova.github.io/bbcn/?debug_analytics`) and every event shows live. It also needs the *Google Analytics Debugger* Chrome extension.

### One player's history, in BigQuery
In the BigQuery console, replace `PROJECT` and `NUMBER` with yours:

```sql
SELECT
  (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'player_id') AS player,
  TIMESTAMP_MICROS(event_timestamp) AS at,
  event_name,
  (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'challenge') AS challenge,
  (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'killer') AS killer,
  (SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'seconds') AS seconds,
  (SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'score') AS score
FROM `PROJECT.analytics_NUMBER.events_*`
WHERE event_name IN ('night_start', 'death', 'night_win')
ORDER BY player, at
```

Each player's rows read like a diary: how long they survived each night and whether the score rose. Remove the `ORDER BY` and add `GROUP BY player` for per-player totals.

## Changing things

- **New event or detail:** add a call in `js/analytics.js` (and a hook in `game.js` if it's a new moment), then add it to the table above and, for a new detail, register it in step 4.
- **Turn analytics off:** empty `GA_ID` in `tools/build.js` and merge. Nothing is sent and the Privacy button disappears.
- **Try the build yourself:** `GA_ID=G-TEST node tools/build.js`, then serve `dist/` (for example `cd dist && python3 -m http.server`) and open http://localhost:8000.
