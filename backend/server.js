require('dotenv').config();
// Many home networks have broken IPv6, which shows up as "fetch failed". Prefer IPv4.
try { require('dns').setDefaultResultOrder('ipv4first'); } catch (e) { /* older Node */ }
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const rateLimit = require('./middleware/rateLimit');
const authRoutes = require('./routes/auth');
const resumeRoutes = require('./routes/resume');
const jobRoutes = require('./routes/jobs');
const toolsRoutes = require('./routes/tools');

// Fail early with a clear message instead of a confusing error later.
for (const key of ['MONGO_URI', 'JWT_SECRET']) {
  if (!process.env[key]) {
    console.error(`Missing ${key} in your .env file.`);
    process.exit(1);
  }
}
if (!process.env.GEMINI_API_KEY) console.warn('Warning: GEMINI_API_KEY is not set. CV reviews will fail.');
if (!process.env.JSEARCH_API_KEY) console.warn('Warning: JSEARCH_API_KEY is not set. Job matches will fail.');

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1); // behind Render's proxy, so req.ip is the real visitor

// CORS_ORIGIN can be a comma separated list of allowed sites in production.
// When it is not set (local testing) any origin is allowed.
const origins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map((s) => s.trim()) : true;
app.use(cors({ origin: origins }));
app.use(express.json({ limit: '100kb' }));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
});
app.get("/", (req, res) => {
  res.send("MatchCV API is running successfully!");
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: 'Too many sign-in attempts. Please wait a few minutes and try again.',
});

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/resume', resumeRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/tools', toolsRoutes);
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

// Always answer with JSON, including for upload problems like a file that is too big.
app.use((err, req, res, next) => {
  if (err && err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'That file is over 5 MB. Please upload a smaller one.' });
  if (err && err.name === 'MulterError') return res.status(400).json({ error: 'The file could not be uploaded. Please try again.' });
  if (err && /Unsupported file type/.test(err.message)) return res.status(400).json({ error: err.message });
  if (err && err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid request' });
  console.error('Unhandled error:', err && err.message);
  res.status(500).json({ error: 'Something went wrong on the server' });
});

process.on('unhandledRejection', (reason) => console.error('Unhandled rejection:', reason && reason.message ? reason.message : reason));

const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    app.listen(PORT, () => console.log(`MatchCV API running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  });
