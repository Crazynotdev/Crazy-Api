const express  = require('express');
const router   = express.Router();
const { v4 }   = require('uuid');
const { db }   = require('../middleware/auth');

const genKey = (u) => `crazy_${u.toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,12)}_${v4().replace(/-/g,'').slice(0,16)}`;

// POST /auth/register
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password)
    return res.status(400).json({ status: false, error: 'username, email and password required' });
  if (username.length < 3)
    return res.status(400).json({ status: false, error: 'Username must be at least 3 characters' });
  if (password.length < 8)
    return res.status(400).json({ status: false, error: 'Password must be at least 8 characters' });

  const client = db();
  if (!client) {
    // Dev mode
    const apikey = genKey(username);
    return res.json({ status: true, message: 'Account created (dev mode — configure Supabase to persist)', apikey, username, email, plan: 'free' });
  }

  try {
    // Create Supabase Auth user
    const { data: auth, error: authErr } = await client.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: { username },
    });
    if (authErr) return res.status(400).json({ status: false, error: authErr.message });

    const apikey = genKey(username);
    const { data, error } = await client.from('api_users').insert({
      id: auth.user.id, username, email, apikey,
      plan: 'free', is_active: true, requests_count: 0, daily_limit: 500,
    }).select().single();

    if (error) return res.status(400).json({ status: false, error: error.message });
    res.json({ status: true, message: 'Account created!', apikey: data.apikey, username: data.username, plan: data.plan });
  } catch (e) { res.status(500).json({ status: false, error: e.message }); }
});

// POST /auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ status: false, error: 'email and password required' });

  const client = db();
  if (!client)
    return res.json({ status: true, token: 'dev_token', user: { username: 'developer', email, plan: 'free', apikey: 'dev_key', requests_count: 0 } });

  try {
    const { data: auth, error } = await client.auth.signInWithPassword({ email, password });
    if (error) return res.status(401).json({ status: false, error: 'Invalid email or password' });

    const { data: user } = await client.from('api_users').select('*').eq('id', auth.user.id).single();
    res.json({ status: true, token: auth.session.access_token, user: { username: user.username, email: user.email, plan: user.plan, apikey: user.apikey, requests_count: user.requests_count, daily_limit: user.daily_limit, created_at: user.created_at, last_used: user.last_used } });
  } catch (e) { res.status(500).json({ status: false, error: e.message }); }
});

// GET /auth/me
router.get('/me', async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ status: false, error: 'No token provided' });

  const client = db();
  if (!client)
    return res.json({ status: true, user: { username: 'developer', plan: 'free', apikey: 'dev_key', requests_count: 42, daily_limit: 500 } });

  try {
    const { data: { user }, error } = await client.auth.getUser(token);
    if (error || !user) return res.status(401).json({ status: false, error: 'Invalid or expired token' });

    const { data } = await client.from('api_users')
      .select('username,email,plan,apikey,requests_count,daily_limit,created_at,last_used')
      .eq('id', user.id).single();
    res.json({ status: true, user: data });
  } catch (e) { res.status(500).json({ status: false, error: e.message }); }
});

module.exports = router;
