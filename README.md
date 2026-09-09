# 🏏 Cricket Toss Analyzer & Prediction Platform

A powerful, 100% free Node.js platform to view date-wise cricket match schedules and analyze **Toss Winner probabilities** based on historical records, head-to-head encounters, venue trends, and team streak factors.

---

## 🌟 Key Features

1. **Date-wise Match Schedule**:
   - Filter matches by **Date** (Today, Yesterday, Tomorrow, or any custom date on the calendar).
   - Filter by **Tournament & League** (IPL, T20I, ODI, Test, BBL, PSL).
   - Live status indicator with actual toss outcomes for ongoing/past matches.

2. **Advanced Multi-Factor Toss Prediction Engine**:
   - **Toss Probability (%)**: Statistical score for Team 1 vs Team 2 based on:
     - **Recent Form**: Last 5 and last 10 toss outcomes.
     - **Head-to-Head Toss History**: Record in past clashes between the two sides.
     - **Streak & Mean Reversion Factor**: Statistical rebound probability for long losing streaks.
     - **Venue Ground Profile**: Bat 1st vs Bowl 1st preference and Chasing win rate %.
   - **Comprehensive Factor Breakdown**: Clear insights explaining why a team is favored.

3. **Custom Match Simulator**:
   - Select any two teams and venue to get instant toss prediction and deep dive stats.

4. **Toss Leaderboard & Statistics**:
   - Overall toss win percentage rankings of all international and franchise teams.

5. **100% Free - Zero Cost**:
   - Built on open historical datasets (3,000+ matches) and public feeds. No paid API key required!

---

## 🚀 How to Run

### Method 1: Double Click
Simply double-click `start.bat`. It will start the server and open `http://localhost:3000` in your browser.

### Method 2: Command Line
```bash
cd "cricket-toss-analyzer"
npm start
```
Then open your browser at **`http://localhost:3000`**.

---

## 📁 Project Structure

```
cricket-toss-analyzer/
├── server.js                   # Main Express Server
├── start.bat                   # 1-Click Windows Launcher
├── package.json
├── src/
│   ├── routes/
│   │   └── apiRoutes.js        # API endpoints
│   ├── services/
│   │   ├── tossAnalytics.js    # Multi-factor Toss Analysis & Probability Engine
│   │   ├── matchService.js     # Date-wise match schedule & aggregator
│   │   └── scraperService.js   # Free public feeds scraper
│   └── data/
│       ├── historical_toss.json # Database of 2,600+ real & historical match records
│       ├── teams_venues.json    # Standard teams and venue profiles
│       └── seed_data.js         # Dataset generator script
└── public/
    ├── index.html              # Modern dark-mode dashboard
    ├── css/styles.css          # Custom styling & glassmorphism
    └── js/app.js               # Frontend application logic
```
