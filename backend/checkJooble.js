// Run from the backend folder:  node checkJooble.js
// Tests your Jooble key on its own. It never prints the key.
require('dotenv').config();
const key = String(process.env.JOOBLE_API_KEY || '').trim().replace(/^["']|["']$/g, '').trim();
console.log('Jooble key found :', key ? 'yes' : 'NO (add JOOBLE_API_KEY to .env)');
console.log('Key length       :', key.length);
if (!key) process.exit(0);

fetch(`https://jooble.org/api/${key}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ keywords: 'sales', location: 'Lahore', page: '1' }),
}).then(async (r) => {
  const d = await r.json().catch(() => ({}));
  console.log('status           :', r.status);
  console.log('top-level fields :', Object.keys(d).join(', ') || '(none)');
  console.log('total count      :', d.totalCount);
  const list = Array.isArray(d.jobs) ? d.jobs : [];
  console.log('jobs returned    :', list.length);
  if (list[0]) {
    console.log('first job fields :', Object.keys(list[0]).join(', '));
    console.log('first job title  :', list[0].title);
    console.log('first job updated:', list[0].updated);
  }
}).catch((e) => console.log('network error    :', e.message));
