const express = require('express');
const router  = express.Router();
const axios   = require('axios');

const C = () => process.env.CREATOR || 'CrazyApi';

async function cobalt(url, opts = {}) {
  const r = await axios.post('https://cobalt.tools/api/json', {
    url,
    vCodec: 'h264',
    vQuality: opts.quality || '720',
    aFormat: 'mp3',
    isAudioOnly: opts.audioOnly || false,
    disableMetadata: true,
  }, { headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' }, timeout: 25000 });
  return r.data;
}

// GET /api/downloader/ytmp3
router.get('/ytmp3', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.json({ status: false, creator: C(), error: 'Missing url parameter' });
  try {
    const d = await cobalt(url, { audioOnly: true });
    if (d.url) res.json({ status: true, creator: C(), url: d.url, filename: d.filename || 'audio.mp3', quality: '128kbps', format: 'mp3' });
    else res.json({ status: false, creator: C(), error: 'Cannot extract audio. Check the URL.', details: d });
  } catch (e) { res.json({ status: false, creator: C(), error: e.message }); }
});

// GET /api/downloader/ytmp4
router.get('/ytmp4', async (req, res) => {
  const { url, quality = '720' } = req.query;
  if (!url) return res.json({ status: false, creator: C(), error: 'Missing url parameter' });
  try {
    const d = await cobalt(url, { quality });
    if (d.url) res.json({ status: true, creator: C(), url: d.url, filename: d.filename || 'video.mp4', quality: quality + 'p', format: 'mp4' });
    else res.json({ status: false, creator: C(), error: 'Cannot extract video.', details: d });
  } catch (e) { res.json({ status: false, creator: C(), error: e.message }); }
});

// GET /api/downloader/tiktok
router.get('/tiktok', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.json({ status: false, creator: C(), error: 'Missing url parameter' });
  try {
    const d = await cobalt(url);
    if (d.url || d.picker) res.json({ status: true, creator: C(), url: d.url || null, picker: d.picker || null, filename: d.filename || 'tiktok.mp4', no_watermark: true });
    else res.json({ status: false, creator: C(), error: 'Cannot download TikTok.', details: d });
  } catch (e) { res.json({ status: false, creator: C(), error: e.message }); }
});

// GET /api/downloader/instagram
router.get('/instagram', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.json({ status: false, creator: C(), error: 'Missing url parameter' });
  try {
    const d = await cobalt(url);
    if (d.url || d.picker) res.json({ status: true, creator: C(), url: d.url || null, picker: d.picker || null, filename: d.filename || 'instagram_media' });
    else res.json({ status: false, creator: C(), error: 'Cannot download. Make sure the post is public.', details: d });
  } catch (e) { res.json({ status: false, creator: C(), error: e.message }); }
});

// GET /api/downloader/twitter
router.get('/twitter', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.json({ status: false, creator: C(), error: 'Missing url parameter' });
  try {
    const d = await cobalt(url);
    if (d.url || d.picker) res.json({ status: true, creator: C(), url: d.url || null, picker: d.picker || null });
    else res.json({ status: false, creator: C(), error: 'Cannot download Twitter/X media.', details: d });
  } catch (e) { res.json({ status: false, creator: C(), error: e.message }); }
});

// GET /api/downloader/facebook
router.get('/facebook', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.json({ status: false, creator: C(), error: 'Missing url parameter' });
  try {
    const d = await cobalt(url);
    if (d.url) res.json({ status: true, creator: C(), url: d.url, filename: d.filename || 'fb_video.mp4' });
    else res.json({ status: false, creator: C(), error: 'Cannot download. Make sure video is public.', details: d });
  } catch (e) { res.json({ status: false, creator: C(), error: e.message }); }
});

module.exports = router;
