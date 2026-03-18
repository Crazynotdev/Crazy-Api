const express = require('express');
const router  = express.Router();
const axios   = require('axios');

const C = () => process.env.CREATOR || 'CrazyApi';

router.get('/wiki', async (req, res) => {
  const { q, lang = 'en' } = req.query;
  if (!q) return res.json({ status: false, creator: C(), error: 'Missing q parameter' });
  try {
    const r = await axios.get(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(q.replace(/ /g,'_'))}`, { timeout: 8000 });
    const d = r.data;
    res.json({ status: true, creator: C(), result: { title: d.title, description: d.description, extract: d.extract, image: d.thumbnail?.source || null, url: d.content_urls?.desktop?.page, lang } });
  } catch { res.json({ status: false, creator: C(), error: `Article not found: "${q}"` }); }
});

router.get('/wikipedia', async (req, res) => {
  const { q, lang = 'en', limit = '8' } = req.query;
  if (!q) return res.json({ status: false, creator: C(), error: 'Missing q parameter' });
  try {
    const r = await axios.get(`https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(q)}&format=json&srlimit=${Math.min(parseInt(limit),20)}`, { timeout: 8000 });
    res.json({ status: true, creator: C(), query: q, count: r.data.query.search.length, result: r.data.query.search.map(s => ({ title: s.title, snippet: s.snippet.replace(/<[^>]+>/g,''), pageid: s.pageid, url: `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(s.title.replace(/ /g,'_'))}` })) });
  } catch (e) { res.json({ status: false, creator: C(), error: e.message }); }
});

router.get('/npm', async (req, res) => {
  const { q, limit = '8' } = req.query;
  if (!q) return res.json({ status: false, creator: C(), error: 'Missing q parameter' });
  try {
    const r = await axios.get(`https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(q)}&size=${Math.min(parseInt(limit),20)}`, { timeout: 8000 });
    res.json({ status: true, creator: C(), query: q, count: r.data.objects.length, result: r.data.objects.map(o => ({ name: o.package.name, version: o.package.version, description: o.package.description, author: o.package.author?.name, keywords: o.package.keywords, date: o.package.date, url: o.package.links?.npm, repository: o.package.links?.repository, score: (o.score.final*100).toFixed(1)+'%' })) });
  } catch (e) { res.json({ status: false, creator: C(), error: e.message }); }
});

router.get('/github', async (req, res) => {
  const { q, type = 'repos', limit = '8' } = req.query;
  if (!q) return res.json({ status: false, creator: C(), error: 'Missing q parameter' });
  try {
    const headers = { 'User-Agent': 'CrazyApi/2.0' };
    if (type === 'user') {
      const r = await axios.get(`https://api.github.com/users/${encodeURIComponent(q)}`, { headers, timeout: 8000 });
      const d = r.data;
      res.json({ status: true, creator: C(), type: 'user', result: { login: d.login, name: d.name, bio: d.bio, avatar: d.avatar_url, followers: d.followers, following: d.following, public_repos: d.public_repos, url: d.html_url, location: d.location, blog: d.blog, company: d.company, created_at: d.created_at } });
    } else {
      const r = await axios.get(`https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&per_page=${Math.min(parseInt(limit),20)}&sort=stars`, { headers, timeout: 8000 });
      res.json({ status: true, creator: C(), type: 'repos', total: r.data.total_count, count: r.data.items.length, result: r.data.items.map(repo => ({ name: repo.full_name, description: repo.description, stars: repo.stargazers_count, forks: repo.forks_count, language: repo.language, url: repo.html_url, homepage: repo.homepage, license: repo.license?.name, updated: repo.updated_at })) });
    }
  } catch (e) { res.json({ status: false, creator: C(), error: e.message }); }
});

router.get('/dictionary', async (req, res) => {
  const { word } = req.query;
  if (!word) return res.json({ status: false, creator: C(), error: 'Missing word parameter' });
  try {
    const r = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word.toLowerCase())}`, { timeout: 8000 });
    const e = r.data[0];
    res.json({ status: true, creator: C(), result: { word: e.word, phonetic: e.phonetic, audio: e.phonetics?.find(p=>p.audio)?.audio||null, meanings: e.meanings.map(m => ({ partOfSpeech: m.partOfSpeech, definitions: m.definitions.slice(0,4).map(d=>({definition:d.definition,example:d.example||null})), synonyms: m.synonyms.slice(0,8), antonyms: m.antonyms.slice(0,8) })) } });
  } catch { res.json({ status: false, creator: C(), error: `Word "${word}" not found` }); }
});

router.get('/lyrics', async (req, res) => {
  const { artist, title } = req.query;
  if (!artist || !title) return res.json({ status: false, creator: C(), error: 'Missing artist and title parameters' });
  try {
    const r = await axios.get(`https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`, { timeout: 10000 });
    res.json({ status: true, creator: C(), result: { artist, title, lyrics: r.data.lyrics } });
  } catch { res.json({ status: false, creator: C(), error: `Lyrics not found for "${title}" by ${artist}` }); }
});

module.exports = router;
