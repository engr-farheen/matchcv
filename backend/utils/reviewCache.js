const crypto = require('crypto');

// A fingerprint of the CV text. Spacing and capital letters are ignored,
// so the same CV saved or exported again still matches.
function textHash(text) {
  const clean = String(text).replace(/\s+/g, ' ').trim().toLowerCase();
  return crypto.createHash('sha256').update(clean).digest('hex');
}

// Returns the saved review when this exact CV was already reviewed.
function savedResult(user, hash) {
  if (!user || !user.lastResumeHash || user.lastResumeHash !== hash || !user.lastReview) return null;
  const p = user.parsedResume || {};
  return {
    skills: [...(p.skills || [])],
    jobTitles: [...(p.jobTitles || [])],
    experienceYears: p.experienceYears || 0,
    location: p.location || '',
    profession: p.profession || '',
    review: user.lastReview,
  };
}

module.exports = { textHash, savedResult };
