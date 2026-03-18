const express = require('express');
const router  = express.Router();
const axios   = require('axios');
const QRCode  = require('qrcode');
const { v4 }  = require('uuid');

const C = () => process.env.CREATOR || 'CrazyApi';

router.get('/qrcode', async (req, res) => {
  const { text, size = '300', color = '000000', bg = 'ffffff', format } = req.query;
  if (!text) return res.json({ status: false, creator: C(), error: 'Missing text parameter' });
  try {
    const opts = { width: Math.min(parseInt(size), 1000), color: { dark: '#' + color, light: '#' + bg } };
    if (format === 'svg') {
      const svg = await QRCode.toString(text, { ...opts, type: 'svg' });
      res.setHeader('Content-Type', 'image/svg+xml');
      return res.send(svg);
    }
    const qr = await QRCode.toDataURL(text, opts);
    res.json({ status: true, creator: C(), text, qr, size: opts.width, format: 'base64/png' });
  } catch (e) { res.json({ status: false, creator: C(), error: e.message }); }
});

router.get('/shorten', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.json({ status: false, creator: C(), error: 'Missing url parameter' });
  try {
    const r = await axios.get(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`, { timeout: 8000 });
    res.json({ status: true, creator: C(), original: url, short: r.data, provider: 'TinyURL' });
  } catch (e) { res.json({ status: false, creator: C(), error: e.message }); }
});

router.get('/ip', async (req, res) => {
  const ip = req.query.ip || req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress;
  try {
    const r = await axios.get(`http://ip-api.com/json/${ip}?fields=status,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,query,mobile,proxy,hosting`, { timeout: 8000 });
    if (r.data.status !== 'success') return res.json({ status: false, creator: C(), error: 'Invalid IP: ' + ip });
    const d = r.data;
    res.json({ status: true, creator: C(), ip: d.query, country: d.country, country_code: d.countryCode, region: d.regionName, city: d.city, zip: d.zip, latitude: d.lat, longitude: d.lon, timezone: d.timezone, isp: d.isp, org: d.org, asn: d.as, mobile: d.mobile, proxy: d.proxy, hosting: d.hosting });
  } catch (e) { res.json({ status: false, creator: C(), error: e.message }); }
});

router.get('/password', (req, res) => {
  const { length = '16', symbols = 'false', uppercase = 'true', numbers = 'true' } = req.query;
  const len = Math.min(Math.max(parseInt(length) || 16, 4), 256);
  let chars = 'abcdefghijklmnopqrstuvwxyz';
  if (uppercase !== 'false') chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  if (numbers   !== 'false') chars += '0123456789';
  if (symbols   === 'true')  chars += '!@#$%^&*()-_=+[]{}|;:,.<>?';
  let pw = ''; for (let i = 0; i < len; i++) pw += chars[Math.floor(Math.random() * chars.length)];
  const strength = len >= 20 && symbols === 'true' ? 'Very Strong' : len >= 16 ? 'Strong' : len >= 10 ? 'Medium' : 'Weak';
  res.json({ status: true, creator: C(), password: pw, length: len, strength, entropy: Math.floor(len * Math.log2(chars.length)) + ' bits' });
});

router.get('/base64', (req, res) => {
  const { text, action = 'encode' } = req.query;
  if (!text) return res.json({ status: false, creator: C(), error: 'Missing text parameter' });
  try {
    const result = action === 'decode' ? Buffer.from(text, 'base64').toString('utf-8') : Buffer.from(text).toString('base64');
    res.json({ status: true, creator: C(), action, input: text, result });
  } catch (e) { res.json({ status: false, creator: C(), error: 'Invalid base64: ' + e.message }); }
});

router.get('/uuid', (req, res) => {
  const count = Math.min(parseInt(req.query.count) || 1, 50);
  const uuids = Array.from({ length: count }, () => v4());
  res.json({ status: true, creator: C(), count, result: count === 1 ? uuids[0] : uuids });
});

router.get('/lorem', async (req, res) => {
  const paragraphs = Math.min(parseInt(req.query.paragraphs) || 3, 10);
  try {
    const r = await axios.get(`https://loripsum.net/api/${paragraphs}/medium/plaintext`, { timeout: 8000 });
    res.json({ status: true, creator: C(), paragraphs, result: r.data.trim() });
  } catch (e) { res.json({ status: false, creator: C(), error: e.message }); }
});

router.get('/screenshot', (req, res) => {
  const { url, width = '1280', height = '720' } = req.query;
  if (!url) return res.json({ status: false, creator: C(), error: 'Missing url parameter' });
  const shot = `https://shot.screenshotapi.net/screenshot?url=${encodeURIComponent(url)}&width=${width}&height=${height}&output=image&file_type=png&wait_for_event=load`;
  res.json({ status: true, creator: C(), url, screenshot: shot, width: parseInt(width), height: parseInt(height) });
});

module.exports = router;
