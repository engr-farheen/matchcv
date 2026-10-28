const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const requireAuth = require('../middleware/auth');
const rateLimit = require('../middleware/rateLimit');
const User = require('../models/User');
const extractResumeText = require('../utils/extractResumeText');
const parseResume = require('../utils/parseResume');
const { textHash, savedResult } = require('../utils/reviewCache');
const { friendlyMessage, details } = require('../utils/errors');

const ALLOWED_EXT = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg'];

const upload = multer({
  dest: path.join(__dirname, '..', 'uploads'),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXT.includes(ext)) {
      return cb(new Error('Unsupported file type. Please upload a PDF, DOC, DOCX or JPG.'));
    }
    cb(null, true);
  },
});

// Each upload costs an AI call, so keep it to a sensible number per hour.
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  keyFn: (req) => 'u:' + req.userId,
  message: 'You have reviewed a lot of CVs this hour. Please try again a little later.',
});

router.post('/upload', requireAuth, uploadLimiter, upload.single('resume'), async (req, res) => {
  const filePath = req.file && req.file.path;
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const rawText = await extractResumeText(filePath, req.file.originalname);
    if (!rawText || rawText.trim().length < 30) {
      return res.status(422).json({ error: "We couldn't read enough text from this file. Try a text-based PDF or a DOCX." });
    }

    // Same CV text as last time? Give back the same review instead of asking the AI again.
    const hash = textHash(rawText);
    const same = savedResult(await User.findById(req.userId), hash);
    if (same) return res.json({ parsed: same, reused: true });

    const parsed = await parseResume(rawText);

    await User.findByIdAndUpdate(req.userId, {
      parsedResume: {
        skills: parsed.skills,
        jobTitles: parsed.jobTitles,
        experienceYears: parsed.experienceYears,
        location: parsed.location,
        profession: parsed.profession,
      },
      lastReview: parsed.review,
      lastReviewAt: new Date(),
      lastResumeHash: hash,
    });

    res.json({ parsed });
  } catch (err) {
    console.error('Resume error:', err.message);
    const known = err && err.userFacing ? err.message : friendlyMessage(err);
    res.status(err && err.userFacing ? 422 : 500).json({ error: known || 'Failed to process resume', details: details(err) });
  } finally {
    // The CV file is only needed while we read it. Never keep it.
    if (filePath) fs.unlink(filePath, () => {});
  }
});

// Lets the page show the last review again after a refresh or a new login.
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(401).json({ error: 'Account not found' });
    const p = user.parsedResume || {};
    res.json({
      name: user.name,
      preferredCountry: user.preferredCountry || '',
      preferredCity: user.preferredCity || '',
      parsed: user.lastReview
        ? {
            skills: p.skills || [],
            jobTitles: p.jobTitles || [],
            experienceYears: p.experienceYears || 0,
            location: p.location || '',
            profession: p.profession || '',
            review: user.lastReview,
          }
        : null,
    });
  } catch (err) {
    console.error('Profile error:', err.message);
    res.status(500).json({ error: 'Could not load your saved review' });
  }
});

module.exports = router;
