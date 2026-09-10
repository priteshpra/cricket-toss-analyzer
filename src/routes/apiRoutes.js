const express = require('express');
const router = express.Router();
const matchService = require('../services/matchService');
const tossAnalytics = require('../services/tossAnalytics');
const marketLoadService = require('../services/marketLoadService');

// Prevent browser/proxy caching for all API endpoints to guarantee 100% fresh data
router.use((req, res, next) => {
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });
  next();
});

/**
 * GET /api/matches
 * Query params: date (YYYY-MM-DD), league (optional)
 */
router.get('/matches', async (req, res) => {
  try {
    const { date, league } = req.query;
    const data = await matchService.getMatchesByDate(date, league);
    
    // Attach live market load intelligence to each match
    if (data && data.matches && data.matches.length > 0) {
      data.matches = data.matches.map(m => {
        const load = marketLoadService.getMarketLoadForMatch(m);
        return {
          ...m,
          marketLoad: load
        };
      });
    }
    
    res.json({ success: true, data });
  } catch (err) {
    console.error("Error in /api/matches:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/matches/update-toss
 * Body: { teamA, teamB, date, tossWinner, tossDecision, matchWinner }
 */
router.post('/matches/update-toss', (req, res) => {
  try {
    const { teamA, teamB, date, tossWinner, tossDecision, matchWinner } = req.body;
    if (!teamA || !teamB || !tossWinner) {
      return res.status(400).json({ success: false, message: 'teamA, teamB and tossWinner are required' });
    }
    const todayStr = new Date().toISOString().split('T')[0];
    const matchDate = date || todayStr;
    const result = matchService.updateTossResult(teamA, teamB, matchDate, tossWinner, tossDecision, matchWinner);
    res.json({ success: true, message: `Real ground toss result updated: ${tossWinner} won toss!`, data: result });
  } catch (err) {
    console.error("Error in /api/matches/update-toss:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/matches/reset-toss
 * Move match from "Toss Done" back to "Toss Pending"
 * Body: { teamA, teamB, date }
 */
router.post('/matches/reset-toss', (req, res) => {
  try {
    const { teamA, teamB, date } = req.body;
    if (!teamA || !teamB) {
      return res.status(400).json({ success: false, message: 'teamA and teamB are required' });
    }
    const todayStr = new Date().toISOString().split('T')[0];
    const matchDate = date || todayStr;
    const result = matchService.resetTossToPending(teamA, teamB, matchDate);
    res.json({ success: true, message: result.message, data: result.data });
  } catch (err) {
    console.error("Error in /api/matches/reset-toss:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/matches/delete
 * Delete / remove a match from fixture list
 * Body: { teamA, teamB, date }
 */
router.post('/matches/delete', (req, res) => {
  try {
    const { teamA, teamB, date } = req.body;
    if (!teamA || !teamB) {
      return res.status(400).json({ success: false, message: 'teamA and teamB are required' });
    }
    const todayStr = new Date().toISOString().split('T')[0];
    const matchDate = date || todayStr;
    const result = matchService.deleteMatch(teamA, teamB, matchDate);
    res.json({ success: true, message: result.message });
  } catch (err) {
    console.error("Error in /api/matches/delete:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/matches/delete-bulk
 * Delete multiple matches or all matches for a date
 * Body: { matches: [{ teamA, teamB, date }], date }
 */
router.post('/matches/delete-bulk', (req, res) => {
  try {
    const { matches, date } = req.body;
    const todayStr = new Date().toISOString().split('T')[0];
    const matchDate = date || todayStr;
    const result = matchService.deleteMultipleMatches(matches, matchDate);
    res.json(result);
  } catch (err) {
    console.error("Error in /api/matches/delete-bulk:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/matches/add-custom
 * Body: { teamA, teamB, league, time, venue, date, tournament }
 */
router.post('/matches/add-custom', (req, res) => {
  try {
    const { teamA, teamB, league, time, venue, date, tournament } = req.body;
    if (!teamA || !teamB) {
      return res.status(400).json({ success: false, message: 'Team A and Team B are required' });
    }
    const todayStr = new Date().toISOString().split('T')[0];
    const matchDate = date || todayStr;
    const result = matchService.addCustomMatch(matchDate, { teamA, teamB, league, time, venue, tournament });
    res.json(result);
  } catch (err) {
    console.error("Error in /api/matches/add-custom:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/matches/edit-details
 * Body: { originalTeamA, originalTeamB, originalDate, teamA, teamB, league, time, venue, tournament }
 */
router.post('/matches/edit-details', (req, res) => {
  try {
    const { originalTeamA, originalTeamB, originalDate, teamA, teamB, league, time, venue, tournament } = req.body;
    if (!originalTeamA || !originalTeamB || !teamA || !teamB) {
      return res.status(400).json({ success: false, message: 'Original and new team names are required' });
    }
    const todayStr = new Date().toISOString().split('T')[0];
    const matchDate = originalDate || todayStr;
    const result = matchService.editMatchDetails(originalTeamA, originalTeamB, matchDate, { teamA, teamB, league, time, venue, tournament });
    res.json(result);
  } catch (err) {
    console.error("Error in /api/matches/edit-details:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/live
 */
router.get('/live', async (req, res) => {
  try {
    const matches = await matchService.getLiveMatches();
    res.json({ success: true, count: matches.length, matches });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/analysis
 * Query params: teamA, teamB, venue (optional)
 */
router.get('/analysis', (req, res) => {
  try {
    const { teamA, teamB, venue, date } = req.query;
    if (!teamA || !teamB) {
      return res.status(400).json({ success: false, error: "teamA and teamB query params are required" });
    }

    const analysis = tossAnalytics.analyzeToss(teamA, teamB, venue || "", date || "");
    const marketLoad = marketLoadService.getMarketLoadForMatch({ teamA, teamB, venue, date, tossAnalysis: analysis.prediction });
    res.json({ success: true, analysis, marketLoad });
  } catch (err) {
    console.error("Error in /api/analysis:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/teams
 */
router.get('/teams', (req, res) => {
  res.json({
    success: true,
    teams: tossAnalytics.teamsVenues.teams,
    leagues: tossAnalytics.teamsVenues.leagues
  });
});

/**
 * GET /api/venues
 */
router.get('/venues', (req, res) => {
  res.json({
    success: true,
    venues: tossAnalytics.teamsVenues.venues
  });
});

/**
 * GET /api/leaderboard
 * Query params: league (optional)
 */
router.get('/leaderboard', (req, res) => {
  try {
    const { league } = req.query;
    const leaderboard = tossAnalytics.getTossLeaderboard(league || 'all');
    res.json({ success: true, count: leaderboard.length, leaderboard });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/venue-stats
 */
router.get('/venue-stats', (req, res) => {
  try {
    const { venue } = req.query;
    if (!venue) {
      return res.status(400).json({ success: false, error: "venue query param is required" });
    }
    const stats = tossAnalytics.getVenueStats(venue);
    res.json({ success: true, stats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/market-load/match
 * Query params: teamA, teamB, league, venue, date
 */
router.get('/market-load/match', (req, res) => {
  try {
    const { teamA, teamB, league, venue, date } = req.query;
    if (!teamA || !teamB) {
      return res.status(400).json({ success: false, error: "teamA and teamB are required" });
    }
    const load = marketLoadService.getMarketLoadForMatch({ teamA, teamB, league, venue, date });
    res.json({ success: true, data: load });
  } catch (err) {
    console.error("Error in /api/market-load/match:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/market-load/all
 * Query params: date (YYYY-MM-DD), league (optional)
 */
router.get('/market-load/all', async (req, res) => {
  try {
    const { date, league } = req.query;
    const dayData = await matchService.getMatchesByDate(date, league);
    const matches = dayData && dayData.matches ? dayData.matches : [];
    const marketLoads = marketLoadService.getMarketLoadsForMatches(matches);
    res.json({
      success: true,
      date: dayData.date,
      count: marketLoads.length,
      data: marketLoads
    });
  } catch (err) {
    console.error("Error in /api/market-load/all:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/market-load/top-teams
 * Query params: date (YYYY-MM-DD), league (optional)
 */
router.get('/market-load/top-teams', async (req, res) => {
  try {
    const { date, league } = req.query;
    const dayData = await matchService.getMatchesByDate(date, league);
    const matches = dayData && dayData.matches ? dayData.matches : [];
    const topTeams = marketLoadService.getTopLoadedTeams(matches);
    res.json({
      success: true,
      count: topTeams.length,
      data: topTeams
    });
  } catch (err) {
    console.error("Error in /api/market-load/top-teams:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
