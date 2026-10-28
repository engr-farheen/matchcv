const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Used so a login for an unknown email takes about as long as a real one.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);

const sign = (user) => jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
const publicUser = (u) => ({ id: u._id, name: u.name, email: u.email });

router.post('/register', async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    if (!name || !email || !password) return res.status(400).json({ error: 'Name, email and password are required' });
    if (name.length > 80) return res.status(400).json({ error: 'Name is too long' });
    if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Enter a valid email address' });
    // bcrypt only uses the first 72 bytes of a password
    if (password.length < 8 || password.length > 72) {
      return res.status(400).json({ error: 'Password must be 8 to 72 characters' });
    }

    if (await User.findOne({ email })) return res.status(409).json({ error: 'An account with this email already exists' });

    const user = await User.create({ name, email, password: await bcrypt.hash(password, 10) });
    res.status(201).json({ token: sign(user), user: publicUser(user) });
  } catch (err) {
    if (err && err.code === 11000) return res.status(409).json({ error: 'An account with this email already exists' });
    console.error('Register error:', err.message);
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    const user = await User.findOne({ email });
    const ok = await bcrypt.compare(password, user ? user.password : DUMMY_HASH);
    if (!user || !ok) return res.status(401).json({ error: 'Invalid email or password' });

    res.json({ token: sign(user), user: publicUser(user) });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'Login failed' });
  }
});

module.exports = router;
