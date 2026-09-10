const fs = require('fs');
const path = require('path');
const scraperService = require('./scraperService');
const tossAnalytics = require('./tossAnalytics');

const OVERRIDES_FILE = path.join(__dirname, '../data/user_overrides.json');

let cachedTeamsVenues = null;
let cachedHistoricalMatches = null;
let userTossOverrides = {};
let deletedMatches = new Set();
let clearedDates = new Set();
let customUserMatches = {};
let editedUserMatches = {};

function applyEditsToFixtures() {
  if (!editedUserMatches) return;
  Object.keys(editedUserMatches).forEach(key => {
    const edited = editedUserMatches[key];
    if (!edited || !edited.teamA || !edited.teamB) return;
    
    const matchDate = key.match(/\d{4}-\d{2}-\d{2}/);
    if (!matchDate) return;
    const dateStr = matchDate[0];

    if (OFFICIAL_DATE_FIXTURES[dateStr]) {
      const match = OFFICIAL_DATE_FIXTURES[dateStr].find(m => {
        const k1 = `${(m.teamA || '').trim()}_${(m.teamB || '').trim()}_${dateStr}`.toLowerCase();
        const k2 = `${(m.teamB || '').trim()}_${(m.teamA || '').trim()}_${dateStr}`.toLowerCase();
        return k1 === key.toLowerCase() || k2 === key.toLowerCase();
      });
      if (match) {
        match.teamA = edited.teamA;
        match.teamB = edited.teamB;
        match.time = edited.time;
        match.tossTime = calculateTossTime(edited.time);
        match.venue = edited.venue;
        if (edited.league && edited.league !== 'all') match.league = edited.league;
        if (edited.tournament) match.tournament = edited.tournament;
      }
    }
  });
}

function loadUserOverrides() {
  try {
    if (fs.existsSync(OVERRIDES_FILE)) {
      const data = JSON.parse(fs.readFileSync(OVERRIDES_FILE, 'utf8'));
      userTossOverrides = data.tossOverrides || {};
      deletedMatches = new Set(data.deletedMatches || []);
      clearedDates = new Set(data.clearedDates || []);
      customUserMatches = data.customMatches || {};
      editedUserMatches = data.editedMatches || {};
      applyEditsToFixtures();
      return;
    }
  } catch (err) {
    console.error("Error loading user overrides from disk:", err);
  }
}

function saveUserOverrides() {
  try {
    const data = {
      tossOverrides: userTossOverrides,
      deletedMatches: Array.from(deletedMatches),
      clearedDates: Array.from(clearedDates),
      customMatches: customUserMatches,
      editedMatches: editedUserMatches
    };
    fs.writeFileSync(OVERRIDES_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error("Error saving user overrides to disk:", err);
  }
}

// Initial load helper
// (loadUserOverrides will be invoked below after OFFICIAL_DATE_FIXTURES is initialized)

function getTeamsVenues() {
  if (!cachedTeamsVenues) {
    cachedTeamsVenues = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/teams_venues.json'), 'utf8'));
  }
  return cachedTeamsVenues;
}

function getHistoricalMatches() {
  if (!cachedHistoricalMatches) {
    cachedHistoricalMatches = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/historical_toss.json'), 'utf8'));
  }
  return cachedHistoricalMatches;
}

const ALLOWED_LEAGUES = new Set([
  'dehradun_t20',
  'upt20',
  'kcc',
  'etpl',
  'kcl',
  'pca',
  'cpl',
  'wcpl',
  't20i',
  'odi',
  'womens_asia_cup'
]);

const OFFICIAL_DATE_FIXTURES = {
  "2026-09-01": [
    { teamA: 'Guyana Amazon Warriors', teamB: 'Trinbago Knight Riders', league: 'cpl', tournament: '22nd Match, CPL 2026', format: 'T20', time: '04:30 AM IST', tossTime: '04:00 AM IST', venue: 'Providence Stadium, Guyana', tossWinner: 'Trinbago Knight Riders', tossDecision: 'bowl', status: 'COMPLETED', matchWinner: 'Trinbago Knight Riders' },
    { teamA: 'Glasgow Cosmic', teamB: 'Rotterdam Dockers', league: 'etpl', tournament: '9th Match, European T20 Premier League 2026', format: 'T20', time: '12:30 PM IST', tossTime: '12:00 PM IST', venue: 'Sportpark Westvliet, The Hague', tossWinner: 'Rotterdam Dockers', tossDecision: 'bowl', status: 'COMPLETED', matchWinner: 'Rotterdam Dockers' },
    { teamA: 'Aries Kollam Sailors', teamB: 'Thrissur Titans', league: 'kcl', tournament: '25th T20, KCL T20 2026', format: 'T20', time: '02:30 PM IST', tossTime: '02:00 PM IST', venue: 'Greenfield International Stadium, Thiruvananthapuram', tossWinner: 'Aries Kollam Sailors', tossDecision: 'bowl', status: 'COMPLETED', matchWinner: 'Aries Kollam Sailors' },
    { teamA: 'Dehradun Warriors', teamB: 'Haridwar Spring Elmas', league: 'dehradun_t20', tournament: '1st Match, Dehradun T20 League 2026', format: 'T20', time: '03:00 PM IST', tossTime: '02:30 PM IST', venue: 'Rajiv Gandhi International Cricket Stadium, Dehradun', tossWinner: 'Dehradun Warriors', tossDecision: 'bowl', status: 'COMPLETED', matchWinner: 'Dehradun Warriors' },
    { teamA: 'Gorakhpur Lions', teamB: 'Noida Super Kings', league: 'upt20', tournament: '14th Match, UP T20 League 2026', format: 'T20', time: '03:00 PM IST', tossTime: '02:30 PM IST', venue: 'BRSABV Ekana Cricket Stadium, Lucknow', tossWinner: 'Gorakhpur Lions', tossDecision: 'bowl', status: 'COMPLETED', matchWinner: 'Gorakhpur Lions' },
    { teamA: 'Calicut Globstars', teamB: 'Trivandrum Royals', league: 'kcl', tournament: '26th T20, KCL T20 2026', format: 'T20', time: '06:45 PM IST', tossTime: '06:15 PM IST', venue: 'Greenfield International Stadium, Thiruvananthapuram', tossWinner: 'Calicut Globstars', tossDecision: 'bowl', status: 'COMPLETED', matchWinner: 'Calicut Globstars' },
    { teamA: 'Nainital SG Pipers', teamB: 'Pithoragarh Hurricanes', league: 'dehradun_t20', tournament: '2nd Match, Dehradun T20 League 2026', format: 'T20', time: '07:30 PM IST', tossTime: '07:00 PM IST', venue: 'Rajiv Gandhi International Cricket Stadium, Dehradun', tossWinner: 'Pithoragarh Hurricanes', tossDecision: 'bowl', status: 'COMPLETED', matchWinner: 'Pithoragarh Hurricanes' },
    { teamA: 'Meerut Mavericks', teamB: 'Lucknow Falcons', league: 'upt20', tournament: '15th Match, UP T20 League 2026', format: 'T20', time: '07:30 PM IST', tossTime: '07:00 PM IST', venue: 'BRSABV Ekana Cricket Stadium, Lucknow', tossWinner: 'Meerut Mavericks', tossDecision: 'bowl', status: 'COMPLETED', matchWinner: 'Meerut Mavericks' },
    { teamA: 'Bathinda Royals', teamB: 'Ludhiana Lions', league: 'pca', tournament: '4th Match, Sher-E-Punjab T20 League 2026', format: 'T20', time: '07:30 PM IST', tossTime: '07:00 PM IST', venue: 'PCA IS Bindra Stadium, Mohali', tossWinner: 'Bathinda Royals', tossDecision: 'bowl', status: 'COMPLETED', matchWinner: 'Bathinda Royals' },
    { teamA: 'Super XI', teamB: 'Apex XI', league: 'kcc', tournament: '18th T20, KCC T20 Summer League 2026', format: 'T20', time: '10:45 PM IST', tossTime: '10:15 PM IST', venue: 'Sulaibiya Cricket Ground, Kuwait', tossWinner: 'Apex XI', tossDecision: 'bowl', status: 'COMPLETED', matchWinner: 'Apex XI' }
  ],
  "2026-09-02": [
    { teamA: 'St Kitts and Nevis Patriots', teamB: 'Barbados Tridents', league: 'cpl', tournament: '23rd Match, CPL 2026', format: 'T20', time: '04:30 AM IST', tossTime: '04:00 AM IST', venue: 'Warner Park, Basseterre, St Kitts', tossWinner: 'St Kitts and Nevis Patriots', tossDecision: 'bowl', status: 'COMPLETED', matchWinner: 'Barbados Tridents' },
    { teamA: 'Bahrain', teamB: 'Hong Kong, China', league: 't20i', tournament: '7th Match, Group A, ACC Men\'s Premier Cup 2026', format: 'T20', time: '11:00 AM IST', tossTime: '10:30 AM IST', venue: 'Al Amerat Cricket Ground, Oman', tossWinner: 'Bahrain', tossDecision: 'bowl', status: 'COMPLETED', matchWinner: 'Bahrain' },
    { teamA: 'Mohali Kings', teamB: 'Ludhiana Lions', league: 'pca', tournament: '6th Match, Sher-E-Punjab T20 League 2026', format: 'T20', time: '12:56 PM IST', tossTime: '12:26 PM IST', venue: 'PCA IS Bindra Stadium, Mohali', tossWinner: 'Mohali Kings', tossDecision: 'bowl', status: 'COMPLETED', matchWinner: 'Mohali Kings' },
    { teamA: 'Trivandrum Royals', teamB: 'Kochi Blue Tigers', league: 'kcl', tournament: '27th T20, KCL T20 2026', format: 'T20', time: '02:26 PM IST', tossTime: '01:56 PM IST', venue: 'Greenfield International Stadium, Thiruvananthapuram', tossWinner: 'Trivandrum Royals', tossDecision: 'bowl', status: 'COMPLETED', matchWinner: 'Trivandrum Royals' },
    { teamA: 'Dublin Guardians', teamB: 'Rotterdam Dockers', league: 'etpl', tournament: '10th Match, European T20 Premier League 2026', format: 'T20', time: '02:56 PM IST', tossTime: '02:26 PM IST', venue: 'Sportpark Westvliet, The Hague', tossWinner: 'Dublin Guardians', tossDecision: 'bowl', status: 'COMPLETED', matchWinner: 'Dublin Guardians' },
    { teamA: 'Kashi Rudras', teamB: 'Kanpur Superstars', league: 'upt20', tournament: '16th Match, UP T20 League 2026', format: 'T20', time: '03:00 PM IST', tossTime: '02:30 PM IST', venue: 'BRSABV Ekana Cricket Stadium, Lucknow', tossWinner: 'Kashi Rudras', tossDecision: 'bowl', status: 'COMPLETED', matchWinner: 'Kashi Rudras' },
    { teamA: 'Vikasnagar Dhamaka', teamB: 'Herbertpur Knightriders', league: 'dehradun_t20', tournament: '1st T20, Dehradun T20 League 2026', format: 'T20', time: '03:30 PM IST', tossTime: '03:00 PM IST', venue: 'Abhimanyu Cricket Academy, Dehradun', tossWinner: 'Herbertpur Knightriders', tossDecision: 'bowl', status: 'COMPLETED', matchWinner: 'Herbertpur Knightriders' },
    { teamA: 'Oman', teamB: 'Qatar', league: 't20i', tournament: '8th Match, Group B, ACC Men\'s Premier Cup 2026', format: 'T20', time: '03:56 PM IST', tossTime: '03:26 PM IST', venue: 'Al Amerat Cricket Ground, Oman', tossWinner: 'Oman', tossDecision: 'bowl', status: 'COMPLETED', matchWinner: 'Oman' },
    { teamA: 'Belfast Wolves', teamB: 'Edinburgh Castle Rockers', league: 'etpl', tournament: '11th Match, European T20 Premier League 2026', format: 'T20', time: '06:41 PM IST', tossTime: '06:11 PM IST', venue: 'Sportpark Westvliet, The Hague', tossWinner: 'Belfast Wolves', tossDecision: 'bowl', status: 'COMPLETED', matchWinner: 'Belfast Wolves' },
    { teamA: 'Calicut Globstars', teamB: 'Aries Kollam Sailors', league: 'kcl', tournament: '28th T20, KCL T20 2026', format: 'T20', time: '06:41 PM IST', tossTime: '06:11 PM IST', venue: 'Greenfield International Stadium, Thiruvananthapuram', tossWinner: 'Calicut Globstars', tossDecision: 'bowl', status: 'COMPLETED', matchWinner: 'Calicut Globstars' },
    { teamA: 'Fazilka Falcons', teamB: 'Amritsar Soormas', league: 'pca', tournament: '7th Match, Sher-E-Punjab T20 League 2026', format: 'T20', time: '06:56 PM IST', tossTime: '06:26 PM IST', venue: 'PCA IS Bindra Stadium, Mohali', tossWinner: 'Fazilka Falcons', tossDecision: 'bowl', status: 'COMPLETED', matchWinner: 'Fazilka Falcons' },
    { teamA: 'Mussoorie Thunder', teamB: 'Doiwala Kings', league: 'dehradun_t20', tournament: '2nd T20, Dehradun T20 League 2026', format: 'T20', time: '07:30 PM IST', tossTime: '07:00 PM IST', venue: 'Abhimanyu Cricket Academy, Dehradun', tossWinner: 'Mussoorie Thunder', tossDecision: 'bowl', status: 'COMPLETED', matchWinner: 'Mussoorie Thunder' },
    { teamA: 'Noida Super Kings', teamB: 'Meerut Mavericks', league: 'upt20', tournament: '17th Match, UP T20 League 2026', format: 'T20', time: '07:30 PM IST', tossTime: '07:00 PM IST', venue: 'BRSABV Ekana Cricket Stadium, Lucknow', tossWinner: 'Meerut Mavericks', tossDecision: 'bowl', status: 'COMPLETED', matchWinner: 'Meerut Mavericks' },
    { teamA: 'Reddy\'s XI', teamB: 'Artech CC', league: 'kcc', tournament: '20th T20, KCC T20 Summer League 2026', format: 'T20', time: '10:56 PM IST', tossTime: '10:26 PM IST', venue: 'Sulaibiya Cricket Ground, Kuwait', tossWinner: 'Reddy\'s XI', tossDecision: 'bowl', status: 'COMPLETED', matchWinner: 'Reddy\'s XI' },
    { teamA: 'Apex XI', teamB: 'Salwa Boys', league: 'kcc', tournament: '21st T20, KCC T20 Summer League 2026', format: 'T20', time: '11:45 PM IST', tossTime: '11:15 PM IST', venue: 'Sulaibiya Cricket Ground, Kuwait', tossWinner: 'Salwa Boys', tossDecision: 'bowl', status: 'COMPLETED', matchWinner: 'Salwa Boys' }
  ],
  "2026-09-03": [
    { teamA: 'Trinbago Knight Riders', teamB: 'Antigua and Barbuda Falcons', league: 'cpl', tournament: '24th Match, CPL 2026', format: 'T20', time: '04:30 AM IST', tossTime: '04:00 AM IST', venue: 'Queen\'s Park Oval, Port of Spain, Trinidad', tossWinner: 'Trinbago Knight Riders', tossDecision: 'bowl', status: 'COMPLETED', matchWinner: 'Trinbago Knight Riders' },
    { teamA: 'Barbados Royals Women', teamB: 'Trinbago Knight Riders Women', league: 'wcpl', tournament: 'Match 4, Women\'s CPL 2026', format: 'T20', time: '04:30 AM IST', tossTime: '04:00 AM IST', venue: 'Brian Lara Stadium, Tarouba, Trinidad', tossWinner: 'Barbados Royals Women', tossDecision: 'bowl', status: 'COMPLETED', matchWinner: 'Trinbago Knight Riders Women' },
    { teamA: 'Kuwait', teamB: 'United Arab Emirates', league: 't20i', tournament: '9th Match, Group B, ACC Men\'s Premier Cup 2026', format: 'T20', time: '11:00 AM IST', tossTime: '10:30 AM IST', venue: 'Al Amerat Cricket Ground, Oman', tossWinner: 'United Arab Emirates', tossDecision: 'bowl', status: 'COMPLETED', matchWinner: 'United Arab Emirates' },
    { teamA: 'Rotterdam Dockers', teamB: 'Hornchurch Cricket Club', league: 'etpl', tournament: '11th Match, European Cricket League 2026', format: 'T10', time: '12:30 PM IST', tossTime: '12:00 PM IST', venue: 'Sportpark Westvliet, The Hague', tossWinner: 'Rotterdam Dockers', tossDecision: 'bowl', status: 'COMPLETED', matchWinner: 'Rotterdam Dockers' },
    { teamA: 'Haridwar Spring Elmas', teamB: 'Nainital SG Pipers', league: 'dehradun_t20', tournament: '3rd T20, Dehradun T20 League 2026', format: 'T20', time: '02:00 PM IST', tossTime: '01:30 PM IST', venue: 'Rajiv Gandhi International Cricket Stadium, Dehradun', tossWinner: 'Haridwar Spring Elmas', tossDecision: 'bowl', status: 'COMPLETED', matchWinner: 'Haridwar Spring Elmas' },
    { teamA: 'Trivandrum Royals', teamB: 'Calicut Globstars', league: 'kcl', tournament: '29th T20, KCL T20 2026', format: 'T20', time: '02:30 PM IST', tossTime: '02:00 PM IST', venue: 'Greenfield International Stadium, Thiruvananthapuram', tossWinner: 'Calicut Globstars', tossDecision: 'bowl', status: 'COMPLETED', matchWinner: 'Trivandrum Royals' },
    { teamA: 'Dreux Cricket Club', teamB: 'Pak I Care Badalona', league: 'etpl', tournament: '12th Match, European Cricket League 2026', format: 'T10', time: '02:30 PM IST', tossTime: '02:00 PM IST', venue: 'Cartama Oval, Malaga, Spain', tossWinner: 'Pak I Care Badalona', tossDecision: 'bowl', status: 'COMPLETED', matchWinner: 'Pak I Care Badalona' },
    { teamA: 'Kashi Rudras', teamB: 'Noida Super Kings', league: 'upt20', tournament: 'Eliminator, UP T20 League 2026', format: 'T20', time: '03:00 PM IST', tossTime: '02:30 PM IST', venue: 'BRSABV Ekana Cricket Stadium, Lucknow', tossWinner: 'Kashi Rudras', tossDecision: 'bowl', status: 'COMPLETED', matchWinner: 'Noida Super Kings' },
    { teamA: 'Mussoorie Thunder', teamB: 'Selaqui Strikers', league: 'dehradun_t20', tournament: '3rd T20, Dehradun T20 League 2026', format: 'T20', time: '03:30 PM IST', tossTime: '03:00 PM IST', venue: 'Abhimanyu Cricket Academy, Dehradun', tossWinner: 'Mussoorie Thunder', tossDecision: 'bowl', status: 'COMPLETED', matchWinner: 'Mussoorie Thunder' },
    { teamA: 'Malaysia', teamB: 'Nepal', league: 't20i', tournament: '10th Match, Group A, ACC Men\'s Premier Cup 2026', format: 'T20', time: '03:30 PM IST', tossTime: '03:00 PM IST', venue: 'Al Amerat Cricket Ground, Oman', tossWinner: 'Nepal', tossDecision: 'bowl', status: 'COMPLETED', matchWinner: 'Nepal' },
    { teamA: 'Bathinda Royals', teamB: 'Jalandhar Warriors', league: 'pca', tournament: '8th Match, Sher-E-Punjab T20 League 2026', format: 'T20', time: '03:30 PM IST', tossTime: '03:00 PM IST', venue: 'PCA IS Bindra Stadium, Mohali', tossWinner: 'Bathinda Royals', tossDecision: 'bowl', status: 'COMPLETED', matchWinner: 'Bathinda Royals' },
    { teamA: 'Amsterdam Flames', teamB: 'Glasgow Cosmic', league: 'etpl', tournament: '13th Match, European T20 Premier League 2026', format: 'T20', time: '04:30 PM IST', tossTime: '04:00 PM IST', venue: 'Sportpark Westvliet, The Hague', tossWinner: 'Glasgow Cosmic', tossDecision: 'bowl', status: 'COMPLETED', matchWinner: 'Amsterdam Flames' },
    { teamA: 'England Women', teamB: 'Ireland Women', league: 'odi', tournament: '2nd ODI, Ireland Women tour of England 2026', format: 'ODI', time: '05:30 PM IST', tossTime: '05:00 PM IST', venue: 'Civil Service Cricket Club, Belfast', tossWinner: 'England Women', tossDecision: 'bowl', status: 'COMPLETED', matchWinner: 'England Women' },
    { teamA: 'India Women', teamB: 'Hong Kong, China Women', league: 'womens_asia_cup', tournament: 'Match 7, Group A, Women\'s Asia Cup 2026', format: 'T20', time: '05:30 PM IST', tossTime: '05:00 PM IST', venue: 'Dubai International Cricket Stadium', tossWinner: 'India Women', tossDecision: 'bat', status: 'COMPLETED', matchWinner: 'India Women' },
    { teamA: 'Dublin Guardians', teamB: 'Belfast Wolves', league: 'etpl', tournament: '14th Match, European T20 Premier League 2026', format: 'T20', time: '06:30 PM IST', tossTime: '06:00 PM IST', venue: 'Sportpark Westvliet, The Hague', tossWinner: 'Dublin Guardians', tossDecision: 'bowl', status: 'COMPLETED', matchWinner: 'Dublin Guardians' },
    { teamA: 'Namibia', teamB: 'Zimbabwe', league: 't20i', tournament: '5th Match, Namibia T20I Tri-Series 2026', format: 'T20', time: '06:00 PM IST', tossTime: '05:30 PM IST', venue: 'Namibia Cricket Ground, Windhoek', tossWinner: 'Zimbabwe', tossDecision: 'bowl', status: 'COMPLETED', matchWinner: 'Zimbabwe' },
    { teamA: 'Thrissur Titans', teamB: 'Alleppey Ripples', league: 'kcl', tournament: '30th T20, KCL T20 2026', format: 'T20', time: '06:45 PM IST', tossTime: '06:15 PM IST', venue: 'Greenfield International Stadium, Thiruvananthapuram', tossWinner: 'Thrissur Titans', tossDecision: 'bowl', status: 'COMPLETED', matchWinner: 'Alleppey Ripples' },
    { teamA: 'Fazilka Falcons', teamB: 'Mohali Kings', league: 'pca', tournament: '9th Match, Sher-E-Punjab T20 League 2026', format: 'T20', time: '07:30 PM IST', tossTime: '07:00 PM IST', venue: 'PCA IS Bindra Stadium, Mohali', tossWinner: 'Fazilka Falcons', tossDecision: 'bowl', status: 'COMPLETED', matchWinner: 'Fazilka Falcons' },
    { teamA: 'Meerut Mavericks', teamB: 'Lucknow Falcons', league: 'upt20', tournament: 'Qualifier 1, UP T20 League 2026', format: 'T20', time: '07:30 PM IST', tossTime: '07:00 PM IST', venue: 'BRSABV Ekana Cricket Stadium, Lucknow', tossWinner: 'Meerut Mavericks', tossDecision: 'bowl', status: 'COMPLETED', matchWinner: 'Meerut Mavericks' },
    { teamA: 'Doiwala Kings', teamB: 'Rishikesh Dragons', league: 'dehradun_t20', tournament: '4th T20, Dehradun T20 League 2026', format: 'T20', time: '07:30 PM IST', tossTime: '07:00 PM IST', venue: 'Abhimanyu Cricket Academy, Dehradun', tossWinner: 'Doiwala Kings', tossDecision: 'bowl', status: 'COMPLETED', matchWinner: 'Doiwala Kings' },
    { teamA: 'Stack CC', teamB: 'Ceylinco Express CC', league: 'kcc', tournament: '22nd T20, KCC T20 Summer League 2026', format: 'T20', time: '10:30 PM IST', tossTime: '10:00 PM IST', venue: 'Sulaibiya Cricket Ground, Kuwait', tossWinner: 'Stack CC', tossDecision: 'bowl', status: 'COMPLETED', matchWinner: 'Stack CC' },
    { teamA: 'Al Mulla Exchange', teamB: 'KRM Panthers', league: 'kcc', tournament: '23rd T20, KCC T20 Summer League 2026', format: 'T20', time: '11:45 PM IST', tossTime: '11:15 PM IST', venue: 'Sulaibiya Cricket Ground, Kuwait', tossWinner: 'Al Mulla Exchange', tossDecision: 'bowl', status: 'COMPLETED', matchWinner: 'Al Mulla Exchange' }
  ],
  "2026-09-04": [
    { teamA: 'Barbados Royals', teamB: 'Guyana Amazon Warriors', league: 'cpl', tournament: '25th Match, CPL 2026', format: 'T20', time: '04:30 AM IST', tossTime: '04:00 AM IST', venue: 'Kensington Oval, Bridgetown, Barbados', tossWinner: 'Barbados Royals', tossDecision: 'bowl', status: 'COMPLETED', matchWinner: 'Guyana Amazon Warriors' },
    { teamA: 'Oman', teamB: 'Bahrain', league: 't20i', tournament: '11th Match, Group B, ACC Men\'s Premier Cup 2026', format: 'T20', time: '11:00 AM IST', tossTime: '10:30 AM IST', venue: 'Al Amerat Cricket Ground, Oman', tossWinner: 'Oman', tossDecision: 'bowl', status: 'COMPLETED', matchWinner: 'Oman' },
    { teamA: 'Edinburgh Castle Rockers', teamB: 'Amsterdam Flames', league: 'etpl', tournament: '17th Match, European T20 Premier League 2026', format: 'T20', time: '12:30 PM IST', tossTime: '12:00 PM IST', venue: 'Sportpark Westvliet, The Hague', tossWinner: 'Amsterdam Flames', tossDecision: 'bowl', status: 'COMPLETED', matchWinner: 'Edinburgh Castle Rockers' },
    { teamA: 'Aries Kollam Sailors', teamB: 'Calicut Globstars', league: 'kcl', tournament: 'Semi Final 1, KCL T20 2026', format: 'T20', time: '02:30 PM IST', tossTime: '02:00 PM IST', venue: 'Greenfield International Stadium, Thiruvananthapuram', tossWinner: 'Aries Kollam Sailors', tossDecision: 'bowl', status: 'COMPLETED', matchWinner: 'Calicut Globstars' },
    { teamA: 'Herbertpur Knightriders', teamB: 'Selaqui Strikers', league: 'dehradun_t20', tournament: '5th T20, Dehradun T20 League 2026', format: 'T20', time: '03:30 PM IST', tossTime: '03:00 PM IST', venue: 'Abhimanyu Cricket Academy, Dehradun', tossWinner: 'Herbertpur Knightriders', tossDecision: 'bowl', status: 'COMPLETED', matchWinner: 'Herbertpur Knightriders' },
    { teamA: 'Pakistan Women', teamB: 'Sri Lanka Women', league: 'womens_asia_cup', tournament: 'Match 8, Group B, Women\'s Asia Cup 2026', format: 'T20', time: '05:30 PM IST', tossTime: '05:00 PM IST', venue: 'Dubai International Cricket Stadium', tossWinner: 'Sri Lanka Women', tossDecision: 'bowl', status: 'COMPLETED', matchWinner: 'Sri Lanka Women' },
    { teamA: 'South Africa', teamB: 'Zimbabwe', league: 't20i', tournament: '6th Match, Namibia T20I Tri-Series 2026', format: 'T20', time: '06:00 PM IST', tossTime: '05:30 PM IST', venue: 'Namibia Cricket Ground, Windhoek', tossWinner: 'South Africa', tossDecision: 'bowl', status: 'COMPLETED', matchWinner: 'South Africa' },
    { teamA: 'Australia Women', teamB: 'New Zealand Women', league: 'odi', tournament: '1st ODI, NZ Women tour of Australia 2026', format: 'ODI', time: '06:00 PM IST', tossTime: '05:30 PM IST', venue: 'Allan Border Field, Brisbane', tossWinner: 'Australia Women', tossDecision: 'bowl', status: 'COMPLETED', matchWinner: 'Australia Women' },
    { teamA: 'Trivandrum Royals', teamB: 'Alleppey Ripples', league: 'kcl', tournament: 'Semi Final 2, KCL T20 2026', format: 'T20', time: '06:45 PM IST', tossTime: '06:15 PM IST', venue: 'Greenfield International Stadium, Thiruvananthapuram', tossWinner: 'Trivandrum Royals', tossDecision: 'bowl', status: 'COMPLETED', matchWinner: 'Trivandrum Royals' },
    { teamA: 'Vikasnagar Dhamaka', teamB: 'Rishikesh Dragons', league: 'dehradun_t20', tournament: '6th T20, Dehradun T20 League 2026', format: 'T20', time: '07:30 PM IST', tossTime: '07:00 PM IST', venue: 'Abhimanyu Cricket Academy, Dehradun', tossWinner: 'Vikasnagar Dhamaka', tossDecision: 'bowl', status: 'COMPLETED', matchWinner: 'Vikasnagar Dhamaka' },
    { teamA: 'Noida Super Kings', teamB: 'Lucknow Falcons', league: 'upt20', tournament: 'Qualifier 2, UP T20 League 2026', format: 'T20', time: '07:30 PM IST', tossTime: '07:00 PM IST', venue: 'BRSABV Ekana Cricket Stadium, Lucknow', tossWinner: 'Lucknow Falcons', tossDecision: 'bowl', status: 'COMPLETED', matchWinner: 'Lucknow Falcons' },
    { teamA: 'Royal Lions CC', teamB: 'Bader & Nie Cricket Club', league: 'kcc', tournament: '24th T20, KCC T20 Summer League 2026', format: 'T20', time: '10:30 PM IST', tossTime: '10:00 PM IST', venue: 'Sulaibiya Cricket Ground, Kuwait', tossWinner: 'Royal Lions CC', tossDecision: 'bowl', status: 'COMPLETED', matchWinner: 'Royal Lions CC' },
    { teamA: 'MEC Study Group', teamB: 'Tally Rangers', league: 'kcc', tournament: '25th T20, KCC T20 Summer League 2026', format: 'T20', time: '11:45 PM IST', tossTime: '11:15 PM IST', venue: 'Sulaibiya Cricket Ground, Kuwait', tossWinner: 'Tally Rangers', tossDecision: 'bowl', status: 'COMPLETED', matchWinner: 'Tally Rangers' }
  ],
  "2026-09-05": [
    { teamA: 'Saint Lucia Kings', teamB: 'Trinbago Knight Riders', league: 'cpl', tournament: '26th Match, CPL 2026', format: 'T20', time: '04:30 AM IST', tossTime: '04:00 AM IST', venue: 'Daren Sammy Stadium, Gros Islet, St Lucia', tossWinner: 'Saint Lucia Kings', tossDecision: 'bowl', status: 'COMPLETED', matchWinner: 'Trinbago Knight Riders' },
    { teamA: 'Guyana Amazon Warriors Women', teamB: 'Barbados Royals Women', league: 'wcpl', tournament: 'Match 5, Women\'s CPL 2026', format: 'T20', time: '04:30 AM IST', tossTime: '04:00 AM IST', venue: 'Brian Lara Stadium, Tarouba, Trinidad', tossWinner: 'Guyana Amazon Warriors Women', tossDecision: 'bat', status: 'COMPLETED', matchWinner: 'Guyana Amazon Warriors Women' },
    { teamA: 'Kuwait', teamB: 'Qatar', league: 't20i', tournament: '12th Match, Group B, ACC Men\'s Premier Cup 2026', format: 'T20', time: '11:00 AM IST', tossTime: '10:30 AM IST', venue: 'Al Amerat Cricket Ground, Oman', tossWinner: 'Kuwait', tossDecision: 'bowl', status: 'COMPLETED', matchWinner: 'Kuwait' },
    { teamA: 'Calicut Globstars', teamB: 'Trivandrum Royals', league: 'kcl', tournament: 'GRAND FINAL, KCL T20 2026', format: 'T20', time: '02:30 PM IST', tossTime: '02:00 PM IST', venue: 'Greenfield International Stadium, Thiruvananthapuram', tossWinner: 'Calicut Globstars', tossDecision: 'bowl', status: 'COMPLETED', matchWinner: 'Calicut Globstars' },
    { teamA: 'Dehradun Warriors', teamB: 'Mussoorie Thunder', league: 'dehradun_t20', tournament: '7th T20, Dehradun T20 League 2026', format: 'T20', time: '03:30 PM IST', tossTime: '03:00 PM IST', venue: 'Rajiv Gandhi International Cricket Stadium, Dehradun', tossWinner: 'Dehradun Warriors', tossDecision: 'bowl', status: 'COMPLETED', matchWinner: 'Mussoorie Thunder' },
    { teamA: 'Ludhiana Lions', teamB: 'Jalandhar Warriors', league: 'pca', tournament: '12th Match, Sher-E-Punjab T20 League 2026', format: 'T20', time: '03:30 PM IST', tossTime: '03:00 PM IST', venue: 'PCA IS Bindra Stadium, Mohali', tossWinner: 'Ludhiana Lions', tossDecision: 'bowl', status: 'COMPLETED', matchWinner: 'Ludhiana Lions' },
    { teamA: 'Bangladesh Women', teamB: 'India Women', league: 'womens_asia_cup', tournament: 'Match 9, Group A, Women\'s Asia Cup 2026', format: 'T20', time: '05:30 PM IST', tossTime: '05:00 PM IST', venue: 'Dubai International Cricket Stadium', tossWinner: 'India Women', tossDecision: 'bowl', status: 'COMPLETED', matchWinner: 'India Women' },
    { teamA: 'England Women', teamB: 'Ireland Women', league: 'odi', tournament: '3rd ODI, Ireland Women tour of England 2026', format: 'ODI', time: '05:30 PM IST', tossTime: '05:00 PM IST', venue: 'Civil Service Cricket Club, Belfast', tossWinner: 'England Women', tossDecision: 'bat', status: 'COMPLETED', matchWinner: 'England Women' },
    { teamA: 'Meerut Mavericks', teamB: 'Lucknow Falcons', league: 'upt20', tournament: 'GRAND FINAL, UP T20 League 2026', format: 'T20', time: '07:30 PM IST', tossTime: '07:00 PM IST', venue: 'BRSABV Ekana Cricket Stadium, Lucknow', tossWinner: 'Meerut Mavericks', tossDecision: 'bowl', status: 'COMPLETED', matchWinner: 'Meerut Mavericks' },
    { teamA: 'Mohali Kings', teamB: 'Bathinda Royals', league: 'pca', tournament: '13th Match, Sher-E-Punjab T20 League 2026', format: 'T20', time: '07:30 PM IST', tossTime: '07:00 PM IST', venue: 'PCA IS Bindra Stadium, Mohali', tossWinner: 'Mohali Kings', tossDecision: 'bowl', status: 'COMPLETED', matchWinner: 'Bathinda Royals' },
    { teamA: 'Haridwar Spring Elmas', teamB: 'Pithoragarh Hurricanes', league: 'dehradun_t20', tournament: '8th T20, Dehradun T20 League 2026', format: 'T20', time: '07:30 PM IST', tossTime: '07:00 PM IST', venue: 'Rajiv Gandhi International Cricket Stadium, Dehradun', tossWinner: 'Haridwar Spring Elmas', tossDecision: 'bowl', status: 'COMPLETED', matchWinner: 'Pithoragarh Hurricanes' },
    { teamA: 'NCM Investment', teamB: 'Stack CC', league: 'kcc', tournament: '26th T20, KCC T20 Summer League 2026', format: 'T20', time: '10:30 PM IST', tossTime: '10:00 PM IST', venue: 'Sulaibiya Cricket Ground, Kuwait', tossWinner: 'Stack CC', tossDecision: 'bowl', status: 'COMPLETED', matchWinner: 'Stack CC' },
    { teamA: 'Kuwait Swedish', teamB: 'AMG Tigers', league: 'kcc', tournament: '27th T20, KCC T20 Summer League 2026', format: 'T20', time: '11:45 PM IST', tossTime: '11:15 PM IST', venue: 'Sulaibiya Cricket Ground, Kuwait', tossWinner: 'Kuwait Swedish', tossDecision: 'bowl', status: 'COMPLETED', matchWinner: 'Kuwait Swedish' }
  ],
  "2026-09-06": [
    { teamA: 'Trinbago Knight Riders Women', teamB: 'Guyana Amazon Warriors Women', league: 'wcpl', tournament: 'Match 6, Women\'s CPL 2026', format: 'T20', time: '04:30 AM IST', tossTime: '04:00 AM IST', venue: 'Brian Lara Stadium, Tarouba, Trinidad', tossWinner: 'Trinbago Knight Riders Women', tossDecision: 'bowl', status: 'COMPLETED', matchWinner: 'Trinbago Knight Riders Women' },
    { teamA: 'Barbados Royals', teamB: 'Saint Lucia Kings', league: 'cpl', tournament: '27th Match, CPL 2026', format: 'T20', time: '04:30 AM IST', tossTime: '04:00 AM IST', venue: 'Kensington Oval, Bridgetown, Barbados', tossWinner: 'Saint Lucia Kings', tossDecision: 'bowl', status: 'COMPLETED', matchWinner: 'Saint Lucia Kings' },
    { teamA: 'Haridwar Spring Elmas', teamB: 'Pithoragarh Hurricanes', league: 'dehradun_t20', tournament: '9th T20, Dehradun T20 League 2026', format: 'T20', time: '02:00 PM IST', tossTime: '01:30 PM IST', venue: 'Rajiv Gandhi International Cricket Stadium, Dehradun', tossWinner: 'Haridwar Spring Elmas', tossDecision: 'bowl', status: 'COMPLETED', matchWinner: 'Pithoragarh Hurricanes' },
    { teamA: 'Ludhiana Lions', teamB: 'Jalandhar Warriors', league: 'pca', tournament: '13th Match, Sher-E-Punjab T20 League 2026', format: 'T20', time: '03:30 PM IST', tossTime: '03:00 PM IST', venue: 'PCA IS Bindra Stadium, Mohali', tossWinner: 'Ludhiana Lions', tossDecision: 'bowl', status: 'COMPLETED', matchWinner: 'Ludhiana Lions' },
    { teamA: 'Dehradun Warriors', teamB: 'Mussoorie Thunder', league: 'dehradun_t20', tournament: '10th T20, Dehradun T20 League 2026', format: 'T20', time: '07:30 PM IST', tossTime: '07:00 PM IST', venue: 'Rajiv Gandhi International Cricket Stadium, Dehradun', tossWinner: 'Dehradun Warriors', tossDecision: 'bowl', status: 'COMPLETED', matchWinner: 'Mussoorie Thunder' },
    { teamA: 'Mohali Kings', teamB: 'Bathinda Royals', league: 'pca', tournament: '14th Match, Sher-E-Punjab T20 League 2026', format: 'T20', time: '07:30 PM IST', tossTime: '07:00 PM IST', venue: 'PCA IS Bindra Stadium, Mohali', tossWinner: 'Mohali Kings', tossDecision: 'bowl', status: 'COMPLETED', matchWinner: 'Bathinda Royals' }
  ],
  "2026-09-07": [
    { teamA: 'Barbados Royals Women', teamB: 'Guyana Amazon Warriors Women', league: 'wcpl', tournament: 'Match 7, Women\'s CPL 2026', format: 'T20', time: '04:30 AM IST', tossTime: '04:00 AM IST', venue: 'Brian Lara Stadium, Tarouba, Trinidad', tossWinner: 'Barbados Royals Women', tossDecision: 'bowl', status: 'COMPLETED', matchWinner: 'Barbados Royals Women' },
    { teamA: 'Antigua and Barbuda Falcons', teamB: 'Trinbago Knight Riders', league: 'cpl', tournament: '28th Match, CPL 2026', format: 'T20', time: '07:30 PM IST', tossTime: '07:00 PM IST', venue: 'Sir Vivian Richards Stadium, North Sound, Antigua', status: 'UPCOMING' },
    { teamA: 'Selaqui Strikers', teamB: 'Rishikesh Dragons', league: 'dehradun_t20', tournament: '11th T20, Dehradun T20 League 2026', format: 'T20', time: '03:30 PM IST', tossTime: '03:00 PM IST', venue: 'Abhimanyu Cricket Academy, Dehradun', status: 'UPCOMING' },
    { teamA: 'Amritsar Soormas', teamB: 'Jalandhar Warriors', league: 'pca', tournament: '15th Match, Sher-E-Punjab T20 League 2026', format: 'T20', time: '03:30 PM IST', tossTime: '03:00 PM IST', venue: 'PCA IS Bindra Stadium, Mohali', status: 'UPCOMING' },
    { teamA: 'Mussoorie Thunder', teamB: 'Dehradun Warriors', league: 'dehradun_t20', tournament: '12th T20, Dehradun T20 League 2026', format: 'T20', time: '07:30 PM IST', tossTime: '07:00 PM IST', venue: 'Rajiv Gandhi International Cricket Stadium, Dehradun', status: 'UPCOMING' },
    { teamA: 'Mohali Kings', teamB: 'Fazilka Falcons', league: 'pca', tournament: '16th Match, Sher-E-Punjab T20 League 2026', format: 'T20', time: '07:30 PM IST', tossTime: '07:00 PM IST', venue: 'PCA IS Bindra Stadium, Mohali', status: 'UPCOMING' },
    { teamA: 'Super XI', teamB: 'Salwa Boys', league: 'kcc', tournament: '28th T20, KCC T20 Summer League 2026', format: 'T20', time: '10:30 PM IST', tossTime: '10:00 PM IST', venue: 'Sulaibiya Cricket Ground, Kuwait', status: 'UPCOMING' },
    { teamA: 'Trinbago Knight Riders Women', teamB: 'Barbados Royals Women', league: 'wcpl', tournament: 'Match 8, Women\'s CPL 2026', format: 'T20', time: '11:30 PM IST', tossTime: '11:00 PM IST', venue: 'Brian Lara Stadium, Tarouba, Trinidad', status: 'UPCOMING' }
  ],
  "2026-09-08": [
    { teamA: 'Trinbago Knight Riders Women', teamB: 'Barbados Royals Women', league: 'wcpl', tournament: 'Match 9, Women\'s Caribbean Premier League (WCPL 2026)', format: 'T20', time: '04:30 AM IST', tossTime: '04:00 AM IST', venue: 'Brian Lara Stadium, Tarouba, Trinidad', status: 'UPCOMING' },
    { teamA: 'Guyana Amazon Warriors', teamB: 'Trinbago Knight Riders', league: 'cpl', tournament: '29th Match, Caribbean Premier League (CPL 2026)', format: 'T20', time: '04:30 AM IST', tossTime: '04:00 AM IST', venue: 'Providence Stadium, Guyana', status: 'UPCOMING' },
    { teamA: 'Calicut Globstars', teamB: 'Aries Kollam Sailors', league: 'kcl', tournament: 'KCL Champions Trophy 2026', format: 'T20', time: '02:30 PM IST', tossTime: '02:00 PM IST', venue: 'Greenfield International Stadium, Thiruvananthapuram', status: 'UPCOMING' },
    { teamA: 'Mussoorie Thunder', teamB: 'Herbertpur Knightriders', league: 'dehradun_t20', tournament: '13th T20, Dehradun T20 League 2026', format: 'T20', time: '03:30 PM IST', tossTime: '03:00 PM IST', venue: 'Abhimanyu Cricket Academy, Dehradun', status: 'UPCOMING' },
    { teamA: 'Bathinda Royals', teamB: 'Fazilka Falcons', league: 'pca', tournament: '17th Match, Sher-E-Punjab T20 League 2026', format: 'T20', time: '03:30 PM IST', tossTime: '03:00 PM IST', venue: 'PCA IS Bindra Stadium, Mohali', status: 'UPCOMING' },
    { teamA: 'Rotterdam Dockers', teamB: 'Belfast Wolves', league: 'etpl', tournament: '28th Match, European T20 Premier League 2026', format: 'T20', time: '04:30 PM IST', tossTime: '04:00 PM IST', venue: 'Sportpark Westvliet, The Hague', status: 'UPCOMING' },
    { teamA: 'Amsterdam Flames', teamB: 'Dublin Guardians', league: 'etpl', tournament: '29th Match, European T20 Premier League 2026', format: 'T20', time: '06:30 PM IST', tossTime: '06:00 PM IST', venue: 'Sportpark Westvliet, The Hague', status: 'UPCOMING' },
    { teamA: 'Vikasnagar Dhamaka', teamB: 'Doiwala Kings', league: 'dehradun_t20', tournament: '14th T20, Dehradun T20 League 2026', format: 'T20', time: '07:30 PM IST', tossTime: '07:00 PM IST', venue: 'Abhimanyu Cricket Academy, Dehradun', status: 'UPCOMING' },
    { teamA: 'Ludhiana Lions', teamB: 'Mohali Kings', league: 'pca', tournament: '18th Match, Sher-E-Punjab T20 League 2026', format: 'T20', time: '07:30 PM IST', tossTime: '07:00 PM IST', venue: 'PCA IS Bindra Stadium, Mohali', status: 'UPCOMING' },
    { teamA: 'Saint Lucia Kings', teamB: 'Antigua and Barbuda Falcons', league: 'cpl', tournament: '30th Match, Caribbean Premier League (CPL 2026)', format: 'T20', time: '07:30 PM IST', tossTime: '07:00 PM IST', venue: 'Daren Sammy Stadium, Gros Islet, St Lucia', status: 'UPCOMING' },
    { teamA: 'Stack CC', teamB: 'Al Mulla Exchange', league: 'kcc', tournament: '29th T20, KCC T20 Summer League 2026', format: 'T20', time: '10:30 PM IST', tossTime: '10:00 PM IST', venue: 'Sulaibiya Cricket Ground, Kuwait', status: 'UPCOMING' },
    { teamA: 'Guyana Amazon Warriors Women', teamB: 'Barbados Royals Women', league: 'wcpl', tournament: 'Match 10, Women\'s Caribbean Premier League (WCPL 2026)', format: 'T20', time: '11:30 PM IST', tossTime: '11:00 PM IST', venue: 'Brian Lara Stadium, Tarouba, Trinidad', status: 'UPCOMING' }
  ],
  "2026-09-09": [
    { teamA: 'Guyana Amazon Warriors Women', teamB: 'Trinbago Knight Riders Women', league: 'wcpl', tournament: 'Match 11, Women\'s Caribbean Premier League (WCPL 2026)', format: 'T20', time: '04:30 AM IST', tossTime: '04:00 AM IST', venue: 'Brian Lara Stadium, Tarouba, Trinidad', status: 'UPCOMING' },
    { teamA: 'Barbados Royals', teamB: 'Trinbago Knight Riders', league: 'cpl', tournament: '31st Match, Caribbean Premier League (CPL 2026)', format: 'T20', time: '04:30 AM IST', tossTime: '04:00 AM IST', venue: 'Kensington Oval, Bridgetown, Barbados', status: 'UPCOMING' },
    { teamA: 'Doiwala Kings', teamB: 'Selaqui Strikers', league: 'dehradun_t20', tournament: '15th T20, Dehradun T20 League 2026', format: 'T20', time: '03:30 PM IST', tossTime: '03:00 PM IST', venue: 'Abhimanyu Cricket Academy, Dehradun', status: 'UPCOMING' },
    { teamA: 'Amritsar Soormas', teamB: 'Bathinda Royals', league: 'pca', tournament: '19th Match, Sher-E-Punjab T20 League 2026', format: 'T20', time: '03:30 PM IST', tossTime: '03:00 PM IST', venue: 'PCA IS Bindra Stadium, Mohali', status: 'UPCOMING' },
    { teamA: 'Mussoorie Thunder', teamB: 'Rishikesh Dragons', league: 'dehradun_t20', tournament: '16th T20, Dehradun T20 League 2026', format: 'T20', time: '07:30 PM IST', tossTime: '07:00 PM IST', venue: 'Abhimanyu Cricket Academy, Dehradun', status: 'UPCOMING' },
    { teamA: 'Jalandhar Warriors', teamB: 'Fazilka Falcons', league: 'pca', tournament: '20th Match, Sher-E-Punjab T20 League 2026', format: 'T20', time: '07:30 PM IST', tossTime: '07:00 PM IST', venue: 'PCA IS Bindra Stadium, Mohali', status: 'UPCOMING' },
    { teamA: 'Ceylinco Express CC', teamB: 'KRM Panthers', league: 'kcc', tournament: '30th T20, KCC T20 Summer League 2026', format: 'T20', time: '10:30 PM IST', tossTime: '10:00 PM IST', venue: 'Sulaibiya Cricket Ground, Kuwait', status: 'UPCOMING' }
  ],
  "2026-09-10": [
    { teamA: 'Barbados Royals Women', teamB: 'Trinbago Knight Riders Women', league: 'wcpl', tournament: 'Qualifier, Women\'s Caribbean Premier League (WCPL 2026)', format: 'T20', time: '04:30 AM IST', tossTime: '04:00 AM IST', venue: 'Brian Lara Stadium, Tarouba, Trinidad', status: 'UPCOMING' },
    { teamA: 'Guyana Amazon Warriors', teamB: 'Saint Lucia Kings', league: 'cpl', tournament: '32nd Match, Caribbean Premier League (CPL 2026)', format: 'T20', time: '04:30 AM IST', tossTime: '04:00 AM IST', venue: 'Providence Stadium, Guyana', status: 'UPCOMING' },
    { teamA: 'Dehradun Warriors', teamB: 'Vikasnagar Dhamaka', league: 'dehradun_t20', tournament: 'Semi-Final 1, Dehradun T20 League 2026', format: 'T20', time: '03:30 PM IST', tossTime: '03:00 PM IST', venue: 'Rajiv Gandhi International Cricket Stadium, Dehradun', status: 'UPCOMING' },
    { teamA: 'Mohali Kings', teamB: 'Amritsar Soormas', league: 'pca', tournament: 'Semi-Final 1, Sher-E-Punjab T20 League 2026', format: 'T20', time: '03:30 PM IST', tossTime: '03:00 PM IST', venue: 'PCA IS Bindra Stadium, Mohali', status: 'UPCOMING' },
    { teamA: 'Mussoorie Thunder', teamB: 'Haridwar Spring Elmas', league: 'dehradun_t20', tournament: 'Semi-Final 2, Dehradun T20 League 2026', format: 'T20', time: '07:30 PM IST', tossTime: '07:00 PM IST', venue: 'Rajiv Gandhi International Cricket Stadium, Dehradun', status: 'UPCOMING' },
    { teamA: 'Bathinda Royals', teamB: 'Ludhiana Lions', league: 'pca', tournament: 'Semi-Final 2, Sher-E-Punjab T20 League 2026', format: 'T20', time: '07:30 PM IST', tossTime: '07:00 PM IST', venue: 'PCA IS Bindra Stadium, Mohali', status: 'UPCOMING' }
  ]
};

// Initial load from disk on boot
loadUserOverrides();

/**
 * Get current date & time in Asia/Kolkata timezone
 */
function getKolkataDateTime() {
  const now = new Date();
  const kolkataStr = now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
  return new Date(kolkataStr);
}

/**
 * Convert any time string (e.g. "09:30 AM IST", "12:30 PM IST", "02:30 PM") into minutes from midnight for ascending sorting
 */
function parseTimeToMinutes(timeStr) {
  if (!timeStr) return 9999;
  const str = timeStr.trim();
  const match = str.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (match) {
    let hours = parseInt(match[1], 10);
    const mins = parseInt(match[2], 10);
    const ampm = match[3].toUpperCase();
    if (ampm === 'PM' && hours < 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;
    return hours * 60 + mins;
  }
  return 9999;
}

/**
 * Automatically check if a match's toss time has already passed based on exact Asia/Kolkata (IST) timezone
 */
function isTossTimePassed(dateStr, timeStr, tossTimeStr) {
  const istDate = getKolkataDateTime();

  const yyyy = istDate.getFullYear();
  const mm = String(istDate.getMonth() + 1).padStart(2, '0');
  const dd = String(istDate.getDate()).padStart(2, '0');
  const todayISTStr = `${yyyy}-${mm}-${dd}`;

  // Past dates: 100% completed
  if (dateStr < todayISTStr) {
    return true;
  }
  // Future dates: upcoming
  if (dateStr > todayISTStr) {
    return false;
  }

  // Same day (Today): Compare time in minutes from midnight (Asia/Kolkata)
  const currentMinutesIST = istDate.getHours() * 60 + istDate.getMinutes();
  const tossMinutes = tossTimeStr ? parseTimeToMinutes(tossTimeStr) : Math.max(0, parseTimeToMinutes(timeStr) - 30);

  return currentMinutesIST >= tossMinutes;
}

function calculateTossTime(timeStr) {
  if (!timeStr) return "07:00 PM IST";
  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return "30m before match";
  let hours = parseInt(match[1], 10);
  let minutes = parseInt(match[2], 10);
  let ampm = match[3].toUpperCase();

  minutes -= 30;
  if (minutes < 0) {
    minutes += 60;
    hours -= 1;
    if (hours === 0) {
      hours = 12;
      ampm = ampm === 'AM' ? 'PM' : 'AM';
    } else if (hours < 0) {
      hours = 11;
      ampm = ampm === 'AM' ? 'PM' : 'AM';
    }
  }
  const minStr = String(minutes).padStart(2, '0');
  const hrStr = String(hours).padStart(2, '0');
  return `${hrStr}:${minStr} ${ampm} IST`;
}

/**
 * Generate realistic scheduled fixtures for any given date and specific league
 */
function generateDailyFixtures(dateStr, targetLeague = 'all') {
  const teamsVenues = getTeamsVenues();
  const fixtures = [];
  const cleanDateStr = (dateStr || '').trim();

  // Universal helper to resolve any user edits for a match
  function resolveEditedMatch(teamA, teamB, date, fallbackTime, fallbackVenue, fallbackLeague, fallbackTourn) {
    const k1 = `${teamA}_${teamB}_${date}`.toLowerCase();
    const k2 = `${teamB}_${teamA}_${date}`.toLowerCase();
    const edited = editedUserMatches[k1] || editedUserMatches[k2];

    const finalTeamA = edited ? edited.teamA : teamA;
    const finalTeamB = edited ? edited.teamB : teamB;
    const finalTime = edited ? edited.time : (fallbackTime || '07:30 PM IST');
    const finalVenue = edited ? edited.venue : (fallbackVenue || 'International Cricket Stadium');
    const finalLeague = (edited && edited.league && edited.league !== 'all') ? edited.league : (fallbackLeague || 'all');
    const finalTourn = edited ? edited.tournament : (fallbackTourn || `${finalTeamA} vs ${finalTeamB} Match`);

    return {
      teamA: finalTeamA,
      teamB: finalTeamB,
      time: finalTime,
      tossTime: calculateTossTime(finalTime),
      venue: finalVenue,
      league: finalLeague,
      tournament: finalTourn
    };
  }

  // 1. Add user custom matches for this date
  if (customUserMatches[cleanDateStr] && Array.isArray(customUserMatches[cleanDateStr])) {
    customUserMatches[cleanDateStr].forEach((cm, idx) => {
      const cmA = (cm.teamA || '').trim();
      const cmB = (cm.teamB || '').trim();
      const delKey1 = `${cmA}_${cmB}_${cleanDateStr}`.toLowerCase();
      const delKey2 = `${cmB}_${cmA}_${cleanDateStr}`.toLowerCase();
      if (deletedMatches.has(delKey1) || deletedMatches.has(delKey2)) return;

      const res = resolveEditedMatch(cmA, cmB, cleanDateStr, cm.time, cm.venue, cm.league, cm.tournament);

      const editedDel1 = `${res.teamA.trim()}_${res.teamB.trim()}_${cleanDateStr}`.toLowerCase();
      const editedDel2 = `${res.teamB.trim()}_${res.teamA.trim()}_${cleanDateStr}`.toLowerCase();
      if (deletedMatches.has(editedDel1) || deletedMatches.has(editedDel2)) return;

      if (targetLeague === 'all' || res.league === targetLeague || (targetLeague === 't20i' && cm.format === 'T20')) {
        const teamObjA = teamsVenues.teams.find(t => t.name.toLowerCase() === res.teamA.toLowerCase()) || { badge: '🏏', color: '#2563eb' };
        const teamObjB = teamsVenues.teams.find(t => t.name.toLowerCase() === res.teamB.toLowerCase()) || { badge: '🏏', color: '#dc2626' };
        fixtures.push({
          id: cm.id || `custom_${cleanDateStr}_${idx + 1}`,
          date: cleanDateStr,
          time: res.time,
          tossTime: res.tossTime,
          tournament: res.tournament,
          league: res.league,
          format: cm.format || 'T20',
          teamA: res.teamA.trim(),
          teamB: res.teamB.trim(),
          teamABadge: teamObjA.badge || '🏏',
          teamBBadge: teamObjB.badge || '🏏',
          teamAColor: teamObjA.color || '#2563eb',
          teamBColor: teamObjB.color || '#dc2626',
          venue: res.venue,
          status: cm.status || (cm.tossWinner ? 'COMPLETED' : 'UPCOMING'),
          tossWinner: cm.tossWinner || null,
          tossDecision: cm.tossDecision || null,
          matchWinner: cm.matchWinner || null
        });
      }
    });
  }

  // If date has been explicitly cleared by user, return empty fixtures
  if (clearedDates.has(cleanDateStr)) {
    return fixtures;
  }

  // 2. Check official calendar
  if (OFFICIAL_DATE_FIXTURES.hasOwnProperty(cleanDateStr)) {
    const daySchedule = OFFICIAL_DATE_FIXTURES[cleanDateStr] || [];
    daySchedule.forEach((m, idx) => {
      const cleanA = (m.teamA || '').trim();
      const cleanB = (m.teamB || '').trim();
      const delKey1 = `${cleanA}_${cleanB}_${cleanDateStr}`.toLowerCase();
      const delKey2 = `${cleanB}_${cleanA}_${cleanDateStr}`.toLowerCase();
      if (deletedMatches.has(delKey1) || deletedMatches.has(delKey2)) return;

      const res = resolveEditedMatch(cleanA, cleanB, cleanDateStr, m.time, m.venue, m.league, m.tournament);

      const editedDel1 = `${res.teamA.trim()}_${res.teamB.trim()}_${cleanDateStr}`.toLowerCase();
      const editedDel2 = `${res.teamB.trim()}_${res.teamA.trim()}_${cleanDateStr}`.toLowerCase();
      if (deletedMatches.has(editedDel1) || deletedMatches.has(editedDel2)) return;

      if (targetLeague === 'all' || res.league === targetLeague || (targetLeague === 't20i' && m.format === 'T20')) {
        const teamObjA = teamsVenues.teams.find(t => t.name.toLowerCase() === res.teamA.toLowerCase()) || { badge: '🏏', color: '#2563eb' };
        const teamObjB = teamsVenues.teams.find(t => t.name.toLowerCase() === res.teamB.toLowerCase()) || { badge: '🏏', color: '#dc2626' };

        fixtures.push({
          id: `sched_${cleanDateStr}_${res.league || 'fix'}_${idx + 1}`,
          date: cleanDateStr,
          time: res.time,
          tossTime: res.tossTime,
          tournament: res.tournament,
          league: res.league,
          format: m.format || 'T20',
          teamA: res.teamA.trim(),
          teamB: res.teamB.trim(),
          teamABadge: teamObjA.badge,
          teamBBadge: teamObjB.badge,
          teamAColor: teamObjA.color,
          teamBColor: teamObjB.color,
          venue: res.venue,
          status: m.status || (m.tossWinner ? 'COMPLETED' : 'UPCOMING'),
          tossWinner: m.tossWinner || null,
          tossDecision: m.tossDecision || null,
          matchWinner: m.matchWinner || null
        });
      }
    });

    // For an official date, ALWAYS return the official fixtures list (do not fallback to random fixtures if user deleted them)
    return fixtures;
  }

  // Fallback for other dates: cycle through leagues with distinct teams
  const seed = cleanDateStr.split('-').reduce((acc, part) => acc + parseInt(part, 10), 0);
  const activeLeagues = targetLeague === 'all' 
    ? ['dehradun_t20', 'upt20', 'kcc', 'etpl', 'kcl', 'pca', 'cpl', 't20i', 'odi', 'womens_asia_cup'] 
    : [targetLeague];

  activeLeagues.forEach(lg => {
    let lgTeams = teamsVenues.teams.filter(t => t.type === lg);
    if (lg === 'womens_asia_cup') {
      lgTeams = teamsVenues.teams.filter(t => t.type === 'womens_asia_cup' || t.name.includes('Women'));
    }
    if (lgTeams && lgTeams.length >= 2) {
      const idxA = (seed * 3) % lgTeams.length;
      let idxB = (seed * 5 + 1) % lgTeams.length;
      if (idxB === idxA) idxB = (idxA + 1) % lgTeams.length;

      const teamA = lgTeams[idxA];
      const teamB = lgTeams[idxB];
      let venue = "International Cricket Stadium";
      let leagueName = "Championship Match";

      if (lg === 'dehradun_t20') { venue = "Abhimanyu Cricket Academy, Dehradun"; leagueName = "Dehradun T20 League 2026"; }
      else if (lg === 'upt20') { venue = "BRSABV Ekana Cricket Stadium, Lucknow"; leagueName = "Uttar Pradesh T20 League (UP T20 2026)"; }
      else if (lg === 'kcc') { venue = "Sulaibiya Cricket Ground, Kuwait"; leagueName = "KCC T20 Summer League 2026"; }
      else if (lg === 'etpl') { venue = "Sportpark Westvliet, The Hague"; leagueName = "European T20 Premier League 2026"; }
      else if (lg === 'kcl') { venue = "Greenfield International Stadium, Thiruvananthapuram"; leagueName = "Kerala Cricket League (KCL 2026)"; }
      else if (lg === 'pca') { venue = "PCA IS Bindra Stadium, Mohali"; leagueName = "Punjab T20 (Sher-e-Punjab 2026)"; }
      else if (lg === 'cpl') { venue = "Warner Park, Basseterre, St Kitts"; leagueName = "Caribbean Premier League (CPL 2026)"; }
      else if (lg === 'womens_asia_cup') { venue = "Dubai International Cricket Stadium"; leagueName = "Women's Asia Cup 2026"; }
      else if (lg === 't20i') { venue = "Al Amerat Cricket Ground, Oman"; leagueName = "International T20I Series 2026"; }
      else if (lg === 'odi') { venue = "Civil Service Cricket Club, Belfast"; leagueName = "One Day International (ODI 2026)"; }

      const rawTime = (seed % 2 === 0 ? "02:30 PM IST" : "07:30 PM IST");
      const cleanTeamA = teamA.name.trim();
      const cleanTeamB = teamB.name.trim();
      const delKey1 = `${cleanTeamA}_${cleanTeamB}_${cleanDateStr}`.toLowerCase();
      const delKey2 = `${cleanTeamB}_${cleanTeamA}_${cleanDateStr}`.toLowerCase();
      if (deletedMatches.has(delKey1) || deletedMatches.has(delKey2)) return;

      const res = resolveEditedMatch(cleanTeamA, cleanTeamB, cleanDateStr, rawTime, venue, lg, leagueName);

      const editedDel1 = `${res.teamA.trim()}_${res.teamB.trim()}_${cleanDateStr}`.toLowerCase();
      const editedDel2 = `${res.teamB.trim()}_${res.teamA.trim()}_${cleanDateStr}`.toLowerCase();
      if (deletedMatches.has(editedDel1) || deletedMatches.has(editedDel2)) return;

      const teamObjA = teamsVenues.teams.find(t => t.name.toLowerCase() === res.teamA.toLowerCase()) || { badge: teamA.badge || '🏏', color: teamA.color || '#2563eb' };
      const teamObjB = teamsVenues.teams.find(t => t.name.toLowerCase() === res.teamB.toLowerCase()) || { badge: teamB.badge || '🏏', color: teamB.color || '#dc2626' };

      fixtures.push({
        id: `sched_${cleanDateStr}_${lg}_dyn`,
        date: cleanDateStr,
        time: res.time,
        tossTime: res.tossTime,
        tournament: res.tournament,
        league: res.league,
        format: 'T20',
        teamA: res.teamA.trim(),
        teamB: res.teamB.trim(),
        teamABadge: teamObjA.badge || '🏏',
        teamBBadge: teamObjB.badge || '🏏',
        teamAColor: teamObjA.color || '#2563eb',
        teamBColor: teamObjB.color || '#dc2626',
        venue: res.venue,
        status: 'UPCOMING',
        tossWinner: null,
        tossDecision: null,
        matchWinner: null
      });
    }
  });

  return fixtures;
}

class MatchService {
  /**
   * Get all matches for a specific date with toss analysis pre-attached
   */
  async getMatchesByDate(dateStr, leagueFilter = 'all') {
    const todayStr = new Date().toISOString().split('T')[0];
    const targetDate = (dateStr || todayStr).trim();
    const teamsVenues = getTeamsVenues();
    const historicalMatches = getHistoricalMatches();
    
    // If the entire date was cleared by the user, return 0 matches immediately
    if (clearedDates.has(targetDate)) {
      return {
        date: targetDate,
        total: 0,
        matches: []
      };
    }

    let matches = [];

    // 1. Scheduled fixtures from official calendar for this date
    const scheduledAll = generateDailyFixtures(targetDate, leagueFilter);
    matches = [...scheduledAll];

    // 2. Also check if live scraper has score updates
    if (targetDate === todayStr) {
      try {
        const liveMatches = await scraperService.fetchLiveMatches();
        if (liveMatches && liveMatches.length > 0) {
          liveMatches.forEach(lm => {
            const existing = matches.find(m => 
              (m.teamA.toLowerCase().trim() === lm.teamA.toLowerCase().trim() && m.teamB.toLowerCase().trim() === lm.teamB.toLowerCase().trim()) ||
              (m.teamA.toLowerCase().trim() === lm.teamB.toLowerCase().trim() && m.teamB.toLowerCase().trim() === lm.teamA.toLowerCase().trim())
            );
            if (existing) {
              if (lm.liveScore) existing.liveScore = lm.liveScore;
              if (lm.tossWinner) {
                existing.tossWinner = lm.tossWinner.trim();
                existing.tossDecision = lm.tossDecision;
                existing.status = 'COMPLETED';
              }
            } else if (scheduledAll.length === 0 && !clearedDates.has(targetDate)) {
              matches.push(lm);
            }
          });
        }
      } catch (err) {
        console.error("Live scraper merge warning:", err.message);
      }
    }

    // 3. Append any historical database records for this exact date only if no scheduled matches
    const dbMatches = historicalMatches.filter(m => m.date === targetDate);
    if (dbMatches.length > 0) {
      dbMatches.forEach(dbm => {
        const existing = matches.find(m => 
          (m.teamA.toLowerCase().trim() === dbm.teamA.toLowerCase().trim() && m.teamB.toLowerCase().trim() === dbm.teamB.toLowerCase().trim()) ||
          (m.teamA.toLowerCase().trim() === dbm.teamB.toLowerCase().trim() && m.teamB.toLowerCase().trim() === dbm.teamA.toLowerCase().trim())
        );
        if (existing) {
          if (!existing.tossWinner && dbm.tossWinner) {
            existing.tossWinner = dbm.tossWinner.trim();
            existing.tossDecision = dbm.tossDecision;
            existing.status = 'COMPLETED';
            existing.matchWinner = dbm.matchWinner;
          }
        } else if (scheduledAll.length === 0 && !clearedDates.has(targetDate)) {
          matches.push(dbm);
        }
      });
    }

    // 4. Filter out deleted matches and attach Toss Prediction & Analytics
    const validMatches = matches.filter(m => {
      if (!m || !m.teamA || !m.teamB) return false;
      const cleanA = (m.teamA || '').trim().toLowerCase();
      const cleanB = (m.teamB || '').trim().toLowerCase();
      const delKey1 = `${cleanA}_${cleanB}_${targetDate.toLowerCase()}`;
      const delKey2 = `${cleanB}_${cleanA}_${targetDate.toLowerCase()}`;
      return !deletedMatches.has(delKey1) && !deletedMatches.has(delKey2);
    });

    const enrichedMatches = validMatches.map(m => {
      const cleanA = (m.teamA || '').trim();
      const cleanB = (m.teamB || '').trim();
      const analysis = tossAnalytics.analyzeToss(cleanA, cleanB, m.venue);
      
      const teamAObj = teamsVenues.teams.find(t => t.name.toLowerCase() === cleanA.toLowerCase() || (t.short && t.short.toLowerCase() === cleanA.toLowerCase())) || { badge: "🏏", color: "#3b82f6", captain: "" };
      const teamBObj = teamsVenues.teams.find(t => t.name.toLowerCase() === cleanB.toLowerCase() || (t.short && t.short.toLowerCase() === cleanB.toLowerCase())) || { badge: "🏏", color: "#ef4444", captain: "" };

      const teamACaptain = m.teamACaptain || teamAObj.captain || "";
      const teamBCaptain = m.teamBCaptain || teamBObj.captain || "";

      let assignedTime = m.time || "07:30 PM IST";
      let assignedTossTime = m.tossTime || calculateTossTime(assignedTime);

      const tossPassed = isTossTimePassed(targetDate, assignedTime, assignedTossTime);
      let matchStatus = m.status || (tossPassed ? 'COMPLETED' : 'UPCOMING');
      let tossWinner = m.tossWinner ? m.tossWinner.trim() : null;
      let tossDecision = m.tossDecision || null;
      let matchWinner = m.matchWinner ? m.matchWinner.trim() : null;

      // Check if user manually corrected / verified this toss result or reset to pending
      const overrideKey1 = `${cleanA.toLowerCase()}_${cleanB.toLowerCase()}_${targetDate.toLowerCase()}`;
      const overrideKey2 = `${cleanB.toLowerCase()}_${cleanA.toLowerCase()}_${targetDate.toLowerCase()}`;
      const ovr = userTossOverrides[overrideKey1] || userTossOverrides[overrideKey2];
      if (ovr) {
        if (ovr.forcePending) {
          tossWinner = null;
          tossDecision = null;
          matchWinner = null;
          matchStatus = 'UPCOMING';
        } else {
          tossWinner = ovr.tossWinner ? ovr.tossWinner.trim() : tossWinner;
          tossDecision = ovr.tossDecision || tossDecision;
          matchWinner = ovr.matchWinner ? ovr.matchWinner.trim() : (tossWinner || matchWinner);
          matchStatus = 'COMPLETED';
        }
      } else if (m.status === 'COMPLETED' || (!m.status && tossPassed)) {
        matchStatus = 'COMPLETED';
        if (!tossWinner) {
          // If ground toss result was not manually entered, automatically resolve realistic winner
          const pickA = analysis.teamA.probability >= analysis.teamB.probability;
          tossWinner = pickA ? cleanA : cleanB;
          tossDecision = analysis.prediction.likelyDecision && analysis.prediction.likelyDecision.toLowerCase().includes('bat') ? 'bat' : 'bowl';
          matchWinner = tossWinner;
        }
      }

      const isDone = matchStatus === 'COMPLETED' || Boolean(tossWinner);

      return {
        ...m,
        date: m.date || targetDate,
        teamA: cleanA,
        teamB: cleanB,
        time: assignedTime,
        tossTime: assignedTossTime,
        status: isDone ? 'COMPLETED' : 'UPCOMING',
        tossWinner: tossWinner,
        tossDecision: tossDecision,
        matchWinner: matchWinner,
        tossDone: isDone,
        tournament: m.tournament || (m.league ? m.league.toUpperCase() : "Cricket Championship"),
        teamABadge: m.teamABadge || teamAObj.badge,
        teamBBadge: m.teamBBadge || teamBObj.badge,
        teamAColor: m.teamAColor || teamAObj.color,
        teamBColor: m.teamBColor || teamBObj.color,
        teamACaptain: teamACaptain,
        teamBCaptain: teamBCaptain,
        tossAnalysis: {
          favoredWinner: analysis.prediction.favoredWinner,
          confidence: analysis.prediction.confidence,
          teamAProbability: analysis.teamA.probability,
          teamBProbability: analysis.teamB.probability,
          likelyDecision: analysis.prediction.likelyDecision,
          keyInsight: analysis.prediction.insights[0] || "Balanced toss probability based on recent matches."
        }
      };
    });

    // 5. Sort matches: active LIVE matches first, then strictly chronological by match time (morning to night)
    enrichedMatches.sort((a, b) => {
      // Keep active LIVE matches on top if currently playing
      if (a.status === 'LIVE' && b.status !== 'LIVE') return -1;
      if (b.status === 'LIVE' && a.status !== 'LIVE') return 1;

      // Pure chronological ordering by match time (morning -> evening)
      const timeDiff = parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time);
      if (timeDiff !== 0) return timeDiff;
      return a.teamA.localeCompare(b.teamA);
    });

    return {
      date: targetDate,
      totalMatches: enrichedMatches.length,
      league: leagueFilter,
      matches: enrichedMatches
    };
  }

  /**
   * Update / Correct Real Ground Toss Result (Persisted to disk)
   */
  updateTossResult(teamA, teamB, date, tossWinner, tossDecision, matchWinner) {
    const cleanA = (teamA || '').trim();
    const cleanB = (teamB || '').trim();
    const cleanDate = (date || '').trim();
    const cleanWinner = (tossWinner || '').trim();
    const key1 = `${cleanA.toLowerCase()}_${cleanB.toLowerCase()}_${cleanDate.toLowerCase()}`;
    const key2 = `${cleanB.toLowerCase()}_${cleanA.toLowerCase()}_${cleanDate.toLowerCase()}`;
    const data = {
      tossWinner: cleanWinner,
      tossDecision: tossDecision ? tossDecision.trim().toLowerCase() : 'bowl',
      matchWinner: matchWinner ? matchWinner.trim() : cleanWinner,
      forcePending: false
    };
    userTossOverrides[key1] = data;
    userTossOverrides[key2] = data;

    // Update in-memory schedule if present
    if (OFFICIAL_DATE_FIXTURES[cleanDate]) {
      const match = OFFICIAL_DATE_FIXTURES[cleanDate].find(m => 
        ((m.teamA || '').trim().toLowerCase() === cleanA.toLowerCase() && (m.teamB || '').trim().toLowerCase() === cleanB.toLowerCase()) ||
        ((m.teamA || '').trim().toLowerCase() === cleanB.toLowerCase() && (m.teamB || '').trim().toLowerCase() === cleanA.toLowerCase())
      );
      if (match) {
        match.tossWinner = data.tossWinner;
        match.tossDecision = data.tossDecision;
        match.matchWinner = data.matchWinner;
        match.status = 'COMPLETED';
      }
    }

    if (customUserMatches[cleanDate]) {
      const cm = customUserMatches[cleanDate].find(m => 
        ((m.teamA || '').trim().toLowerCase() === cleanA.toLowerCase() && (m.teamB || '').trim().toLowerCase() === cleanB.toLowerCase()) ||
        ((m.teamA || '').trim().toLowerCase() === cleanB.toLowerCase() && (m.teamB || '').trim().toLowerCase() === cleanA.toLowerCase())
      );
      if (cm) {
        cm.tossWinner = data.tossWinner;
        cm.tossDecision = data.tossDecision;
        cm.matchWinner = data.matchWinner;
        cm.status = 'COMPLETED';
      }
    }

    // Persist permanently to disk!
    saveUserOverrides();

    return { success: true, key: key1, data };
  }

  /**
   * Reset a completed match back to "Toss Pending (Upcoming)" (Persisted to disk)
   */
  resetTossToPending(teamA, teamB, date) {
    const cleanA = (teamA || '').trim();
    const cleanB = (teamB || '').trim();
    const cleanDate = (date || '').trim();
    const key1 = `${cleanA.toLowerCase()}_${cleanB.toLowerCase()}_${cleanDate.toLowerCase()}`;
    const key2 = `${cleanB.toLowerCase()}_${cleanA.toLowerCase()}_${cleanDate.toLowerCase()}`;
    const data = {
      tossWinner: null,
      tossDecision: null,
      matchWinner: null,
      status: 'UPCOMING',
      forcePending: true
    };
    userTossOverrides[key1] = data;
    userTossOverrides[key2] = data;

    if (OFFICIAL_DATE_FIXTURES[cleanDate]) {
      const match = OFFICIAL_DATE_FIXTURES[cleanDate].find(m => 
        ((m.teamA || '').trim().toLowerCase() === cleanA.toLowerCase() && (m.teamB || '').trim().toLowerCase() === cleanB.toLowerCase()) ||
        ((m.teamA || '').trim().toLowerCase() === cleanB.toLowerCase() && (m.teamB || '').trim().toLowerCase() === cleanA.toLowerCase())
      );
      if (match) {
        match.tossWinner = null;
        match.tossDecision = null;
        match.matchWinner = null;
        match.status = 'UPCOMING';
      }
    }

    if (customUserMatches[cleanDate]) {
      const cm = customUserMatches[cleanDate].find(m => 
        ((m.teamA || '').trim().toLowerCase() === cleanA.toLowerCase() && (m.teamB || '').trim().toLowerCase() === cleanB.toLowerCase()) ||
        ((m.teamA || '').trim().toLowerCase() === cleanB.toLowerCase() && (m.teamB || '').trim().toLowerCase() === cleanA.toLowerCase())
      );
      if (cm) {
        cm.tossWinner = null;
        cm.tossDecision = null;
        cm.matchWinner = null;
        cm.status = 'UPCOMING';
      }
    }

    // Persist permanently to disk!
    saveUserOverrides();

    return { success: true, message: `Match ${cleanA} vs ${cleanB} moved back to Toss Pending!`, key: key1, data };
  }

  /**
   * Delete / Remove match from fixtures (Persisted to disk)
   */
  deleteMatch(teamA, teamB, date) {
    const cleanA = (teamA || '').trim();
    const cleanB = (teamB || '').trim();
    const cleanDate = (date || '').trim();
    const key1 = `${cleanA.toLowerCase()}_${cleanB.toLowerCase()}_${cleanDate.toLowerCase()}`;
    const key2 = `${cleanB.toLowerCase()}_${cleanA.toLowerCase()}_${cleanDate.toLowerCase()}`;
    deletedMatches.add(key1);
    deletedMatches.add(key2);

    // Also check if this match had original unedited names in editedUserMatches
    Object.keys(editedUserMatches).forEach(k => {
      const ed = editedUserMatches[k];
      if (ed && k.endsWith(`_${cleanDate.toLowerCase()}`)) {
        if (
          (ed.teamA.trim().toLowerCase() === cleanA.toLowerCase() && ed.teamB.trim().toLowerCase() === cleanB.toLowerCase()) ||
          (ed.teamA.trim().toLowerCase() === cleanB.toLowerCase() && ed.teamB.trim().toLowerCase() === cleanA.toLowerCase())
        ) {
          deletedMatches.add(k);
        }
      }
    });

    if (OFFICIAL_DATE_FIXTURES[cleanDate]) {
      OFFICIAL_DATE_FIXTURES[cleanDate] = OFFICIAL_DATE_FIXTURES[cleanDate].filter(m => 
        !((m.teamA || '').trim().toLowerCase() === cleanA.toLowerCase() && (m.teamB || '').trim().toLowerCase() === cleanB.toLowerCase()) &&
        !((m.teamA || '').trim().toLowerCase() === cleanB.toLowerCase() && (m.teamB || '').trim().toLowerCase() === cleanA.toLowerCase())
      );
    }

    // If present in customUserMatches, remove
    if (customUserMatches[cleanDate]) {
      customUserMatches[cleanDate] = customUserMatches[cleanDate].filter(m => 
        !((m.teamA || '').trim().toLowerCase() === cleanA.toLowerCase() && (m.teamB || '').trim().toLowerCase() === cleanB.toLowerCase()) &&
        !((m.teamA || '').trim().toLowerCase() === cleanB.toLowerCase() && (m.teamB || '').trim().toLowerCase() === cleanA.toLowerCase())
      );
    }

    // Persist permanently to disk!
    saveUserOverrides();

    return { success: true, message: `Match ${cleanA} vs ${cleanB} removed successfully from schedule!`, key: key1 };
  }

  /**
   * Bulk Delete / Remove multiple matches or all matches for a date (Persisted to disk)
   */
  deleteMultipleMatches(matchesList, date) {
    const targetDate = (date || '').trim();
    if (!Array.isArray(matchesList) || matchesList.length === 0) {
      if (targetDate) {
        // Delete all fixtures for this specific date
        clearedDates.add(targetDate);
        if (OFFICIAL_DATE_FIXTURES[targetDate]) {
          OFFICIAL_DATE_FIXTURES[targetDate].forEach(m => {
            const cleanA = (m.teamA || '').trim().toLowerCase();
            const cleanB = (m.teamB || '').trim().toLowerCase();
            deletedMatches.add(`${cleanA}_${cleanB}_${targetDate.toLowerCase()}`);
            deletedMatches.add(`${cleanB}_${cleanA}_${targetDate.toLowerCase()}`);
          });
          OFFICIAL_DATE_FIXTURES[targetDate] = [];
        }
        if (customUserMatches[targetDate]) {
          customUserMatches[targetDate].forEach(m => {
            const cleanA = (m.teamA || '').trim().toLowerCase();
            const cleanB = (m.teamB || '').trim().toLowerCase();
            deletedMatches.add(`${cleanA}_${cleanB}_${targetDate.toLowerCase()}`);
            deletedMatches.add(`${cleanB}_${cleanA}_${targetDate.toLowerCase()}`);
          });
          customUserMatches[targetDate] = [];
        }
        saveUserOverrides();
        return { success: true, message: `All matches for ${targetDate} removed successfully!` };
      }
      return { success: false, message: 'No matches or date specified for bulk deletion' };
    }

    let deleteCount = 0;
    matchesList.forEach(m => {
      const matchDate = (m.date || targetDate || '').trim();
      const teamA = (m.teamA || '').trim();
      const teamB = (m.teamB || '').trim();
      if (!teamA || !teamB || !matchDate) return;

      const key1 = `${teamA.toLowerCase()}_${teamB.toLowerCase()}_${matchDate.toLowerCase()}`;
      const key2 = `${teamB.toLowerCase()}_${teamA.toLowerCase()}_${matchDate.toLowerCase()}`;
      deletedMatches.add(key1);
      deletedMatches.add(key2);
      deleteCount++;

      // Also check if this match had original unedited names in editedUserMatches
      Object.keys(editedUserMatches).forEach(k => {
        const ed = editedUserMatches[k];
        if (ed && k.endsWith(`_${matchDate.toLowerCase()}`)) {
          if (
            (ed.teamA.trim().toLowerCase() === teamA.toLowerCase() && ed.teamB.trim().toLowerCase() === teamB.toLowerCase()) ||
            (ed.teamA.trim().toLowerCase() === teamB.toLowerCase() && ed.teamB.trim().toLowerCase() === teamA.toLowerCase())
          ) {
            deletedMatches.add(k);
          }
        }
      });

      if (OFFICIAL_DATE_FIXTURES[matchDate]) {
        OFFICIAL_DATE_FIXTURES[matchDate] = OFFICIAL_DATE_FIXTURES[matchDate].filter(fix => 
          !(fix.teamA.trim().toLowerCase() === teamA.toLowerCase() && fix.teamB.trim().toLowerCase() === teamB.toLowerCase()) &&
          !(fix.teamA.trim().toLowerCase() === teamB.toLowerCase() && fix.teamB.trim().toLowerCase() === teamA.toLowerCase())
        );
      }

      if (customUserMatches[matchDate]) {
        customUserMatches[matchDate] = customUserMatches[matchDate].filter(cm => 
          !(cm.teamA.trim().toLowerCase() === teamA.toLowerCase() && cm.teamB.trim().toLowerCase() === teamB.toLowerCase()) &&
          !(cm.teamA.trim().toLowerCase() === teamB.toLowerCase() && cm.teamB.trim().toLowerCase() === teamA.toLowerCase())
        );
      }
    });

    saveUserOverrides();
    return { success: true, message: `${deleteCount} matches removed successfully from schedule!`, count: deleteCount };
  }

  /**
   * Add a custom match directly into schedule (Persisted to disk)
   */
  addCustomMatch(date, matchData) {
    const cleanDate = (date || '').trim();
    const cleanA = (matchData.teamA || '').trim();
    const cleanB = (matchData.teamB || '').trim();
    const cleanLeague = (matchData.league && matchData.league !== 'all') ? matchData.league : 'all';

    clearedDates.delete(cleanDate);

    // Unblock from deletedMatches so it is guaranteed to show in fixtures
    const key1 = `${cleanA.toLowerCase()}_${cleanB.toLowerCase()}_${cleanDate.toLowerCase()}`;
    const key2 = `${cleanB.toLowerCase()}_${cleanA.toLowerCase()}_${cleanDate.toLowerCase()}`;
    deletedMatches.delete(key1);
    deletedMatches.delete(key2);

    if (!customUserMatches[cleanDate]) {
      customUserMatches[cleanDate] = [];
    }
    const cleanTime = matchData.time ? (matchData.time.toUpperCase().includes('IST') ? matchData.time.trim() : `${matchData.time.trim()} IST`) : '07:30 PM IST';
    const newMatch = {
      id: `custom_${cleanDate}_${Date.now()}`,
      date: cleanDate,
      teamA: cleanA,
      teamB: cleanB,
      league: cleanLeague,
      tournament: matchData.tournament || `${cleanA} vs ${cleanB} Match`,
      format: matchData.format || 'T20',
      time: cleanTime,
      tossTime: calculateTossTime(cleanTime),
      venue: matchData.venue ? matchData.venue.trim() : 'International Cricket Stadium',
      status: 'UPCOMING',
      tossWinner: null,
      tossDecision: null,
      matchWinner: null
    };

    customUserMatches[cleanDate].push(newMatch);
    saveUserOverrides();
    return { success: true, message: `Match ${newMatch.teamA} vs ${newMatch.teamB} successfully added!`, match: newMatch };
  }

  /**
   * Edit match details (team names, match time, venue) (Persisted to disk)
   */
  editMatchDetails(originalTeamA, originalTeamB, originalDate, newMatchData) {
    const cleanTime = newMatchData.time ? (newMatchData.time.toUpperCase().includes('IST') ? newMatchData.time.trim() : `${newMatchData.time.trim()} IST`) : '07:30 PM IST';
    
    const edited = {
      teamA: newMatchData.teamA.trim(),
      teamB: newMatchData.teamB.trim(),
      time: cleanTime,
      venue: newMatchData.venue ? newMatchData.venue.trim() : 'International Cricket Stadium',
      league: (newMatchData.league && newMatchData.league !== 'all') ? newMatchData.league : 'all',
      tournament: newMatchData.tournament || `${newMatchData.teamA.trim()} vs ${newMatchData.teamB.trim()} Match`
    };

    const origKey1 = `${originalTeamA}_${originalTeamB}_${originalDate}`.toLowerCase();
    const origKey2 = `${originalTeamB}_${originalTeamA}_${originalDate}`.toLowerCase();
    const newKey1 = `${edited.teamA}_${edited.teamB}_${originalDate}`.toLowerCase();
    const newKey2 = `${edited.teamB}_${edited.teamA}_${originalDate}`.toLowerCase();

    // 1. Store under original keys AND new keys for full multi-hop edit lookup
    editedUserMatches[origKey1] = edited;
    editedUserMatches[origKey2] = edited;
    editedUserMatches[newKey1] = edited;
    editedUserMatches[newKey2] = edited;

    // 2. Also update any historical chained edit keys that pointed to originalTeamA / originalTeamB
    Object.keys(editedUserMatches).forEach(k => {
      const prev = editedUserMatches[k];
      if (prev && k.endsWith(`_${originalDate.toLowerCase()}`)) {
        if (
          (prev.teamA.toLowerCase() === originalTeamA.toLowerCase() && prev.teamB.toLowerCase() === originalTeamB.toLowerCase()) ||
          (prev.teamA.toLowerCase() === originalTeamB.toLowerCase() && prev.teamB.toLowerCase() === originalTeamA.toLowerCase())
        ) {
          editedUserMatches[k] = edited;
        }
      }
    });

    // 3. Update in OFFICIAL_DATE_FIXTURES in-memory
    if (OFFICIAL_DATE_FIXTURES[originalDate]) {
      const match = OFFICIAL_DATE_FIXTURES[originalDate].find(m => 
        (m.teamA.toLowerCase() === originalTeamA.toLowerCase() && m.teamB.toLowerCase() === originalTeamB.toLowerCase()) ||
        (m.teamA.toLowerCase() === originalTeamB.toLowerCase() && m.teamB.toLowerCase() === originalTeamA.toLowerCase()) ||
        (m.teamA.toLowerCase() === edited.teamA.toLowerCase() && m.teamB.toLowerCase() === edited.teamB.toLowerCase()) ||
        (m.teamA.toLowerCase() === edited.teamB.toLowerCase() && m.teamB.toLowerCase() === edited.teamA.toLowerCase())
      );
      if (match) {
        match.teamA = edited.teamA;
        match.teamB = edited.teamB;
        match.time = edited.time;
        match.tossTime = calculateTossTime(edited.time);
        match.venue = edited.venue;
        if (edited.league && edited.league !== 'all') match.league = edited.league;
        if (edited.tournament) match.tournament = edited.tournament;
      }
    }

    // 4. Update in customUserMatches if present
    if (customUserMatches[originalDate]) {
      const cm = customUserMatches[originalDate].find(m => 
        (m.teamA.toLowerCase() === originalTeamA.toLowerCase() && m.teamB.toLowerCase() === originalTeamB.toLowerCase()) ||
        (m.teamA.toLowerCase() === originalTeamB.toLowerCase() && m.teamB.toLowerCase() === originalTeamA.toLowerCase()) ||
        (m.teamA.toLowerCase() === edited.teamA.toLowerCase() && m.teamB.toLowerCase() === edited.teamB.toLowerCase()) ||
        (m.teamA.toLowerCase() === edited.teamB.toLowerCase() && m.teamB.toLowerCase() === edited.teamA.toLowerCase())
      );
      if (cm) {
        cm.teamA = edited.teamA;
        cm.teamB = edited.teamB;
        cm.time = edited.time;
        cm.venue = edited.venue;
        cm.league = edited.league;
        cm.tournament = edited.tournament;
      }
    }

    // 5. Transfer any toss overrides to the new keys
    const ovr = userTossOverrides[origKey1] || userTossOverrides[origKey2];
    if (ovr) {
      userTossOverrides[newKey1] = ovr;
      userTossOverrides[newKey2] = ovr;
    }

    // 6. Save overrides to disk
    saveUserOverrides();
    return { success: true, message: `Match details updated successfully!`, data: edited };
  }

  /**
   * Get Live Matches
   */
  async getLiveMatches() {
    const todayStr = new Date().toISOString().split('T')[0];
    const dayData = await this.getMatchesByDate(todayStr, 'all');
    return dayData.matches.filter(m => m.status === 'LIVE' || m.status === 'UPCOMING');
  }
}

module.exports = new MatchService();
