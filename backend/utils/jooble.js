// Jooble is a second job source. It is used only when a JOOBLE_API_KEY is set in .env,
// and only when the first source finds too few jobs or fails.
const DAY_MS = 24 * 60 * 60 * 1000;
const CACHE_MS = 6 * 60 * 60 * 1000;
const cache = new Map();

const readKey = () => String(process.env.JOOBLE_API_KEY || '').trim().replace(/^["']|["']$/g, '').trim();
const joobleEnabled = () => {
  const k = readKey();
  return k.length >= 10 && !/your_|paste|example/i.test(k);
};

const stripHtml = (t) =>
  String(t || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

// Jooble dates can have 7 fractional digits, which not every parser accepts.
function parseDate(v) {
  if (!v) return '';
  const d = new Date(String(v).replace(/(\.\d{3})\d+/, '$1'));
  return Number.isNaN(d.getTime()) ? '' : d.toISOString();
}

function joobleError(message) {
  const err = new Error(message);
  err.friendly = true;
  return err;
}

// One Jooble request. Returns jobs in the same shape the rest of the app already uses.
async function fetchJooble(keywords, location, days = 7) {
  const ck = `${keywords}|${location}|${days}`.toLowerCase();
  const hit = cache.get(ck);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.jobs;

  let res;
  try {
    res = await fetch(`https://jooble.org/api/${readKey()}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keywords, location, page: '1' }),
      signal: AbortSignal.timeout(25000),
    });
  } catch (e) {
    throw joobleError('Could not reach Jooble. Check your internet connection and try again.');
  }
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) throw joobleError('The Jooble key in your .env file was refused. Check JOOBLE_API_KEY.');
    if (res.status === 429) throw joobleError('The free Jooble allowance is used up for now.');
    throw new Error(`Jooble search failed (${res.status})`);
  }

  const now = Date.now();
  const jobs = (Array.isArray(data.jobs) ? data.jobs : [])
    .map((j) => ({
      job_id: 'jooble-' + (j.id || j.link),
      job_title: stripHtml(j.title),
      employer_name: stripHtml(j.company),
      job_description: stripHtml(j.snippet),
      job_apply_link: j.link || '',
      job_posted_at_datetime_utc: parseDate(j.updated),
      job_city: stripHtml(j.location),
      job_country: '',
      source: 'Jooble',
    }))
    .filter((j) => j.job_title)
    .filter((j) => !j.job_posted_at_datetime_utc || now - new Date(j.job_posted_at_datetime_utc).getTime() <= days * DAY_MS);

  cache.set(ck, { at: Date.now(), jobs });
  if (cache.size > 100) cache.delete(cache.keys().next().value);
  return jobs;
}

module.exports = { joobleEnabled, fetchJooble };
