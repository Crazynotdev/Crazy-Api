const { createClient } = require('@supabase/supabase-js');

let _db = null;
function db() {
  if (!_db && process.env.SUPABASE_URL && !process.env.SUPABASE_URL.includes('Api')) {
    _db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  }
  return _db;
}

const ok  = (res, data) => res.json({ status: true,  creator: process.env.CREATOR || 'CrazyApi', ...data });
const err = (res, code, msg) => res.status(code).json({ status: false, creator: process.env.CREATOR || 'CrazyApi', error: msg });

async function requireApiKey(req, res, next) {
  const key = req.query.apikey || req.headers['x-api-key'];
  if (!key) return err(res, 401, 'Missing apikey. Get yours free at /register');

  const client = db();
  if (!client) {
    // Dev mode — accept any key
    req.user = { id: 'dev', username: 'developer', plan: 'free', apikey: key };
    return next();
  }

  const { data, error } = await client
    .from('api_users')
    .select('id,username,plan,requests_count,is_active,daily_limit')
    .eq('apikey', key)
    .single();

  if (error || !data) return err(res, 401, 'Invalid API key.');
  if (!data.is_active)  return err(res, 403, 'API key suspended. Contact support.');

  // Async increment (non-blocking)
  client.from('api_users')
    .update({ requests_count: data.requests_count + 1, last_used: new Date().toISOString() })
    .eq('id', data.id).then(() => {});

  req.user = data;
  next();
}

module.exports = { requireApiKey, db, ok, err };
