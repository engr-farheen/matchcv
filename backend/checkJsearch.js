// Run this from the backend folder:  node checkJsearch.js
// It tests your JSearch key on its own. It never prints the key.
require('dotenv').config();

const key = String(process.env.JSEARCH_API_KEY || '').trim().replace(/^["']|["']$/g, '').trim();
console.log('Key found in .env :', key ? 'yes' : 'NO');
console.log('Key length        :', key.length, '(a real key is usually about 50 characters)');
console.log('Still example text:', /your_|rapidapi_jsearch_key|paste/i.test(key) ? 'YES - replace it with your real key' : 'no');

const q = encodeURIComponent('sales jobs in lahore pakistan');

(async () => {
  for (const endpoint of ['search-v2', 'search']) {
    console.log('\n--- trying /' + endpoint);
    try {
      const r = await fetch(`https://jsearch.p.rapidapi.com/${endpoint}?query=${q}&num_pages=1&country=pk&date_posted=month`, {
        headers: { 'X-RapidAPI-Key': key, 'X-RapidAPI-Host': 'jsearch.p.rapidapi.com' },
      });
      const d = await r.json().catch(() => ({}));
      console.log('status            :', r.status);
      console.log('message           :', d.message || '(none)');
      console.log('top-level fields  :', Object.keys(d).join(', ') || '(none)');
      const list = Array.isArray(d.data) ? d.data : (d.data && (d.data.jobs || d.data.results || d.data.items)) || d.jobs || d.results;
      console.log('data is a         :', Array.isArray(d.data) ? 'list' : typeof d.data);
      console.log('jobs found        :', Array.isArray(list) ? list.length : 'none');
      if (Array.isArray(list) && list[0]) {
        const j = list[0];
        console.log('first job fields  :', Object.keys(j).join(', '));
        console.log('first job title   :', j.job_title || j.title);
        console.log('first job posted  :', j.job_posted_at_datetime_utc || j.job_posted_at_timestamp || j.posted_at || j.date_posted);
      }
      if (r.status === 200) break; // this address works, no need to try the other one
    } catch (e) {
      console.log('network error     :', e.message);
    }
  }
})();
