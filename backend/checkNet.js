// Run from the backend folder:  node checkNet.js
// Tests whether this computer can reach the services MatchCV needs.
try { require('dns').setDefaultResultOrder('ipv4first'); } catch (e) {}

const tests = [
  ['A normal website', 'https://example.com/'],
  ['Google AI (Gemini)', 'https://generativelanguage.googleapis.com/'],
  ['RapidAPI (JSearch)', 'https://jsearch.p.rapidapi.com/'],
  ['Jooble', 'https://jooble.org/'],
];

(async () => {
  console.log('Node version:', process.version, '\n');
  for (const [name, url] of tests) {
    const t0 = Date.now();
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(15000) });
      console.log(`${name.padEnd(20)} reachable  (HTTP ${r.status}, ${Date.now() - t0} ms)`);
    } catch (e) {
      const why = (e.cause && (e.cause.code || e.cause.message)) || e.name || e.message;
      console.log(`${name.padEnd(20)} FAILED     (${why}, ${Date.now() - t0} ms)`);
    }
  }
  console.log('\nAny HTTP number (even 403 or 404) means the site was reachable. FAILED means it was not.');
})();
