const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },

  // What we keep from a CV: the facts read from it, never the file itself.
  parsedResume: {
    skills: [String],
    jobTitles: [String],
    experienceYears: Number,
    location: String,
    profession: String,
  },
  lastReview: { type: mongoose.Schema.Types.Mixed, default: null },
  lastReviewAt: Date,
  lastResumeHash: String, // fingerprint of the last CV text, so the same CV gets the same review

  preferredCountry: String,
  preferredCity: String,
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('User', userSchema);
