const express = require('express');
const router  = express.Router();
const axios   = require('axios');

const C = () => process.env.CREATOR || 'CrazyApi';

router.get('/joke', async (req, res) => {
  const { category = 'Any', blacklist } = req.query;
  try {
    let url = `https://v2.jokeapi.dev/joke/${category}?format=json`;
    if (blacklist) url += `&blacklistFlags=${blacklist}`;
    const r = await axios.get(url, { timeout: 8000 });
    const d = r.data;
    res.json({ status: true, creator: C(), result: { category: d.category, type: d.type, joke: d.joke||null, setup: d.setup||null, punchline: d.delivery||null, safe: d.safe } });
  } catch (e) { res.json({ status: false, creator: C(), error: e.message }); }
});

router.get('/meme', async (req, res) => {
  const subs = ['memes','dankmemes','ProgrammerHumor','AdviceAnimals'];
  const sub  = req.query.subreddit || subs[Math.floor(Math.random()*subs.length)];
  try {
    const r = await axios.get(`https://meme-api.com/gimme/${sub}`, { timeout: 8000 });
    const d = r.data;
    res.json({ status: true, creator: C(), result: { title: d.title, url: d.url, subreddit: d.subreddit, author: d.author, upvotes: d.ups, nsfw: d.nsfw, reddit_url: d.postLink } });
  } catch (e) { res.json({ status: false, creator: C(), error: e.message }); }
});

router.get('/quote', async (req, res) => {
  try {
    const url = req.query.category ? `https://api.quotable.io/random?tags=${req.query.category}` : 'https://api.quotable.io/random';
    const r = await axios.get(url, { timeout: 8000 });
    res.json({ status: true, creator: C(), result: { quote: r.data.content, author: r.data.author, tags: r.data.tags } });
  } catch {
    const quotes = [{ quote:"The only way to do great work is to love what you do.",author:"Steve Jobs"},{ quote:"Life is what happens while you're busy making other plans.",author:"John Lennon"},{ quote:"In the middle of every difficulty lies opportunity.",author:"Albert Einstein"}];
    res.json({ status: true, creator: C(), result: quotes[Math.floor(Math.random()*quotes.length)] });
  }
});

router.get('/fact', async (req, res) => {
  try {
    const r = await axios.get('https://uselessfacts.jsph.pl/api/v2/facts/random?language=en', { timeout: 8000 });
    res.json({ status: true, creator: C(), result: r.data.text });
  } catch {
    const facts = ["A day on Venus is longer than a year on Venus.","Honey never spoils — 3000-year-old honey found in Egyptian tombs was still edible.","Bananas are technically berries, but strawberries are not.","A snail can sleep for 3 years.","The shortest war in history lasted 38 minutes (Zanzibar vs England, 1896)."];
    res.json({ status: true, creator: C(), result: facts[Math.floor(Math.random()*facts.length)] });
  }
});

router.get('/trivia', async (req, res) => {
  const { difficulty = 'medium', amount = '1', category } = req.query;
  try {
    let url = `https://opentdb.com/api.php?amount=${Math.min(parseInt(amount),10)}&type=multiple&difficulty=${difficulty}`;
    if (category) url += `&category=${category}`;
    const r = await axios.get(url, { timeout: 8000 });
    if (r.data.response_code !== 0) return res.json({ status: false, creator: C(), error: 'No trivia questions found' });
    const result = r.data.results.map(q => ({ category: q.category, difficulty: q.difficulty, question: q.question.replace(/&[^;]+;/g, c => ({ '&quot;':'"','&#039;':"'",'&amp;':'&','&lt;':'<','&gt;':'>','&eacute;':'é' }[c]||c)), correct: q.correct_answer, choices: [...q.incorrect_answers, q.correct_answer].sort(()=>Math.random()-.5) }));
    res.json({ status: true, creator: C(), count: result.length, result: result.length===1 ? result[0] : result });
  } catch (e) { res.json({ status: false, creator: C(), error: e.message }); }
});

module.exports = router;
