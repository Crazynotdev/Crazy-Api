require('dotenv').config();
const express   = require('express');
const cors      = require('cors');
const helmet    = require('helmet');
const morgan    = require('morgan');
const rateLimit = require('express-rate-limit');
const path      = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;
const CREATOR = process.env.CREATOR || 'CrazyApi';

// ── Middleware ─────────────────────────────────────────
app.use(cors());
app.use(helmet({ contentSecurityPolicy: false }));
app.use(morgan('tiny'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Global rate limit: 120 req/min per IP
app.use('/api/', rateLimit({
  windowMs: 60_000, max: 120,
  message: { status: false, creator: CREATOR, error: 'Rate limit exceeded. Max 120 req/min.' },
  standardHeaders: true, legacyHeaders: false,
}));

// ── Static ─────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// ── API routes ─────────────────────────────────────────
const { requireApiKey } = require('./middleware/auth');

app.use('/api/downloader', requireApiKey, require('./routes/downloader'));
app.use('/api/tools',      requireApiKey, require('./routes/tools'));
app.use('/api/anime',      requireApiKey, require('./routes/anime'));
app.use('/api/search',     requireApiKey, require('./routes/search'));
app.use('/api/sports',     requireApiKey, require('./routes/sports'));
app.use('/api/fun',        requireApiKey, require('./routes/fun'));
app.use('/auth',                          require('./routes/auth'));

// ── Public stats ───────────────────────────────────────
const START = Date.now();
let totalReqs = 0;
app.use('/api/', (req, res, next) => { totalReqs++; next(); });

app.get('/api/stats', (req, res) => {
  const mem = process.memoryUsage();
  res.json({
    status: true, creator: CREATOR,
    version: '2.0.0',
    uptime_seconds: Math.floor((Date.now() - START) / 1000),
    uptime_human: fmt(Math.floor((Date.now() - START) / 1000)),
    memory_mb: Math.round(mem.heapUsed / 1024 / 1024),
    total_requests: totalReqs,
    endpoints: 35,
    categories: 6,
    online: true,
  });
});

function fmt(s) {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return `${h}h ${m}m ${sec}s`;
}

// ── 404 API ────────────────────────────────────────────
app.use('/api/*', (req, res) => {
  res.status(404).json({ status: false, creator: CREATOR, error: `Endpoint not found: ${req.path}` });
});

// ── Frontend SPA — serve HTML pages ───────────────────
const PAGES = ['home','docs','changelog','contact','login','register','dashboard',
               'downloader','tools','anime','search','sports','fun'];

PAGES.forEach(p => {
  app.get(`/${p}`, (req, res) =>
    res.sendFile(path.join(__dirname, 'public', `${p}.html`)));
});

app.get('/', (req, res) =>
  res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => {
  console.log(`\n╔══════════════════════════════════════╗`);
  console.log(`║  🚀  CrazyApi v2.0  →  :${PORT}           ║`);
  console.log(`║  📚  Docs   → http://localhost:${PORT}/docs  ║`);
  console.log(`║  🔑  Supabase: ${process.env.SUPABASE_URL ? '✅ Connected' : '⚠️  Dev mode'}        ║`);
  console.log(`╚══════════════════════════════════════╝\n`);
});
