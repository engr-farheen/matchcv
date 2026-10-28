const router = require('express').Router();
const requireAuth = require('../middleware/auth');
const rateLimit = require('../middleware/rateLimit');
const User = require('../models/User');
const { tailorCv, writeCoverLetter } = require('../utils/tailor');
const { friendlyMessage, details } = require('../utils/errors');

const limiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 40,
  keyFn: (req) => 't:' + req.userId,
  message: 'You have used these tools a lot this hour. Please try again a little later.',
});

// Loads the saved CV facts and checks the job text. Returns null after sending an error.
async function prepare(req, res) {
  const user = await User.findById(req.userId);
  const p = user && user.parsedResume;
  if (!p || (!(p.skills || []).length && !(p.jobTitles || []).length)) {
    res.status(400).json({ error: 'Upload a CV first so we know your skills.' });
    return null;
  }
  const jobDescription = String(req.body.jobDescription || '').trim().slice(0, 6000);
  if (jobDescription.length < 40) {
    res.status(400).json({ error: 'Add the job description first (at least a few lines).' });
    return null;
  }
  return {
    profile: p,
    name: user.name,
    job: {
      jobDescription,
      jobTitle: String(req.body.jobTitle || '').slice(0, 120),
      company: String(req.body.company || '').slice(0, 120),
    },
  };
}

router.post('/tailor', requireAuth, limiter, async (req, res) => {
  try {
    const ctx = await prepare(req, res);
    if (!ctx) return;
    res.json(await tailorCv(ctx.profile, ctx.job));
  } catch (err) {
    console.error('Tailor error:', err.message);
    res.status(500).json({ error: friendlyMessage(err) || 'Could not analyse this job', details: details(err) });
  }
});

router.post('/cover-letter', requireAuth, limiter, async (req, res) => {
  try {
    const ctx = await prepare(req, res);
    if (!ctx) return;
    res.json({ letter: await writeCoverLetter(ctx.profile, ctx.job, ctx.name) });
  } catch (err) {
    console.error('Cover letter error:', err.message);
    res.status(500).json({ error: friendlyMessage(err) || 'Could not write the letter', details: details(err) });
  }
});

module.exports = router;
