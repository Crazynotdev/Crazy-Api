const express = require('express');
const router  = express.Router();
const axios   = require('axios');

const C = () => process.env.CREATOR || 'CrazyApi';
const SDB = 'https://www.thesportsdb.com/api/v1/json/3';
const LEAGUES = { premier_league:'4328', la_liga:'4335', bundesliga:'4331', serie_a:'4332', ligue_1:'4334', champions_league:'4480', mls:'4346', eredivisie:'4337', primeira_liga:'4344' };

router.get('/football/live', async (req, res) => {
  try {
    const r = await axios.get(`${SDB}/latestsoccer.php`, { timeout: 10000 });
    res.json({ status: true, creator: C(), count: r.data.results?.length||0, result: (r.data.results||[]).map(e=>({ id:e.idEvent, home:e.strHomeTeam, away:e.strAwayTeam, score:`${e.intHomeScore??'-'} - ${e.intAwayScore??'-'}`, home_score:e.intHomeScore, away_score:e.intAwayScore, league:e.strLeague, country:e.strCountry, date:e.dateEvent, status:e.strStatus||'FT' })) });
  } catch (e) { res.json({ status: false, creator: C(), error: e.message }); }
});

router.get('/football/team', async (req, res) => {
  const { q } = req.query;
  if (!q) return res.json({ status: false, creator: C(), error: 'Missing q parameter' });
  try {
    const r = await axios.get(`${SDB}/searchteams.php?t=${encodeURIComponent(q)}`, { timeout: 10000 });
    res.json({ status: true, creator: C(), query: q, count: r.data.teams?.length||0, result: (r.data.teams||[]).map(t=>({ id:t.idTeam, name:t.strTeam, short:t.strTeamShort, country:t.strCountry, league:t.strLeague, stadium:t.strStadium, capacity:t.intStadiumCapacity, founded:t.intFormedYear, logo:t.strTeamBadge })) });
  } catch (e) { res.json({ status: false, creator: C(), error: e.message }); }
});

router.get('/football/standings', async (req, res) => {
  const { league = 'premier_league', season = '2023-2024' } = req.query;
  const id = LEAGUES[league] || LEAGUES.premier_league;
  try {
    const r = await axios.get(`${SDB}/lookuptable.php?l=${id}&s=${season}`, { timeout: 12000 });
    res.json({ status: true, creator: C(), league, season, available_leagues: Object.keys(LEAGUES), count: r.data.table?.length||0, result: (r.data.table||[]).map(t=>({ position:parseInt(t.intRank), team:t.strTeam, played:t.intPlayed, won:t.intWin, drawn:t.intDraw, lost:t.intLoss, goals_for:t.intGoalsFor, goals_against:t.intGoalsAgainst, goal_diff:t.intGoalDifference, points:t.intPoints, badge:t.strBadge })) });
  } catch (e) { res.json({ status: false, creator: C(), error: e.message }); }
});

router.get('/football/results', async (req, res) => {
  const { team_id } = req.query;
  if (!team_id) return res.json({ status: false, creator: C(), error: 'Missing team_id. Get it from /football/team' });
  try {
    const r = await axios.get(`${SDB}/eventslast.php?id=${team_id}`, { timeout: 10000 });
    res.json({ status: true, creator: C(), team_id, count: r.data.results?.length||0, result: (r.data.results||[]).map(e=>({ id:e.idEvent, home:e.strHomeTeam, away:e.strAwayTeam, score:`${e.intHomeScore}-${e.intAwayScore}`, date:e.dateEvent, league:e.strLeague })) });
  } catch (e) { res.json({ status: false, creator: C(), error: e.message }); }
});

module.exports = router;
