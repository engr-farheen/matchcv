const router = require('express').Router();
const requireAuth = require('../middleware/auth');
const rateLimit = require('../middleware/rateLimit');
const User = require('../models/User');
const { findJobs, scoreJobs } = require('../utils/matchJobs');
const { friendlyMessage, details } = require('../utils/errors');

const jobsLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 60,
  keyFn: (req) => 'j:' + req.userId,
  message: 'You have searched a lot this hour. Please try again a little later.',
});

router.get('/match', requireAuth, jobsLimiter, async (req, res) => {
  try {
    const country = String(req.query.country || '').trim().slice(0, 60);
    const city = String(req.query.city || '').trim().slice(0, 60);
    if (!country) return res.status(400).json({ error: 'Country is required' });

    const user = await User.findById(req.userId);
    const parsed = user && user.parsedResume;
    if (!parsed || (!(parsed.skills || []).length && !(parsed.jobTitles || []).length)) {
      return res.status(400).json({ error: 'Upload a CV before searching for matches' });
    }

    const days = req.query.days === '30' ? 30 : 7;

    const found = await findJobs(parsed, city, country, days);
    const scored = await scoreJobs(parsed, found.jobs);
    scored.sort((a, b) => b.score - a.score);

    await User.updateOne({ _id: req.userId }, { preferredCountry: country, preferredCity: city });

    res.json({ results: scored, searchedFor: found.queries, widened: found.widened, days });
  } catch (err) {
    console.error('Job match error:', err.message);
    res.status(500).json({ error: (err.friendly ? err.message : friendlyMessage(err)) || 'Failed to fetch job matches', details: details(err) });
  }
});

module.exports = router;
