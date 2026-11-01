/* =====================================================================
   build.js: turns the game's source files into the public website.

   Run it with:   node tools/build.js
   It makes a folder called dist/ holding exactly what gets put online
   (GitHub Pages, see .github/workflows/deploy.yml). Node.js runs it;
   there is nothing to install.

   Why do we need a build at all? Two reasons:
   1. index.html is a "fragment" with no <html>, <head> or <body>,
      because the Claude Artifact publisher adds those. A real website
      needs them (and a <!doctype html>, or browsers fall back to an
      old "quirks mode" that can change how things are laid out).
   2. Google Analytics' tag has to be added to the page's <head>, but
      ONLY on the public website, never in the source file Jake
      double-clicks or in the Artifact.
   The source files are never changed: dist/ is a copy.
   ===================================================================== */

const fs = require('fs');
const path = require('path');

// Your Google Analytics "measurement ID" (looks like G-ABC123XYZ9). ANALYTICS.md explains where
// to find it. It is not a secret: it is visible in the web page for everyone anyway.
// Leave it empty and the site is built without analytics. A GA_ID environment variable overrides it.
const GA_ID = process.env.GA_ID || '';

const root = path.join(__dirname, '..');
const dist = path.join(root, 'dist');

// Start from an empty dist/ so nothing old is left behind.
fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(path.join(dist, 'js'), { recursive: true });

// Copy the stylesheet and every script the page loads (read from index.html itself, so a new script
// file is picked up automatically).
let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
fs.copyFileSync(path.join(root, 'style.css'), path.join(dist, 'style.css'));
const scripts = [...html.matchAll(/<script src="([^"]+)"/g)].map(m => m[1]);
for (const file of scripts) fs.copyFileSync(path.join(root, file), path.join(dist, file));

// The fragment starts with <meta>, <title> and <link> tags (the page's "head" material) and then has
// the visible page. Split it at the first <div: everything before goes in <head>, the rest in <body>.
const split = html.indexOf('<div');
const headPart = html.slice(0, split);

// Google's tag, loaded from Google. The tiny "gtag" function pushes commands into a list called
// dataLayer, which Google's script reads. window.GA_ID tells js/analytics.js the tag is present.
const gaTag = GA_ID ? `
<script async src="https://www.googletagmanager.com/gtag/js?id=${GA_ID}"></script>
<script>
  window.GA_ID = ${JSON.stringify(GA_ID)};
  window.dataLayer = window.dataLayer || [];
  function gtag() { dataLayer.push(arguments); }
  // js/analytics.js sets the privacy defaults and starts Google's counting once the game has loaded.
  // Page views are counted from then on, never before consent is decided.
</script>` : '';

const page = `<!doctype html>
<html lang="en">
<head>
${headPart}${gaTag}
</head>
<body>
${html.slice(split)}
</body>
</html>
`;
fs.writeFileSync(path.join(dist, 'index.html'), page);

console.log(`Built dist/ with ${scripts.length} scripts, analytics ${GA_ID ? 'ON (' + GA_ID + ')' : 'OFF (no GA_ID)'}.`);
