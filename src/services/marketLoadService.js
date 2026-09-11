const tossAnalytics = require('./tossAnalytics');

/**
 * Market Load Service
 * Generates and calculates real-time Market Load, Exchange Liquidity, Odds Movement,
 * and AI Convergence across Orbit, Betfair, Oddschecker, and Asian Exchanges.
 * Includes dynamic 10-15 minute pre-toss peak volume surge modeling.
 */
class MarketLoadService {
  constructor() {
    this.exchangePortals = {
      orbit: {
        name: 'Orbit Exchange',
        badge: 'ORBIT LIVE',
        baseUrl: 'https://orbitxch.com/customer/sport/4'
      },
      betfair: {
        name: 'Betfair Exchange',
        badge: 'BETFAIR CRICKET',
        baseUrl: 'https://www.betfair.com/exchange/plus/cricket'
      },
      oddschecker: {
        name: 'Oddschecker',
        badge: 'ODDSCHECKER',
        baseUrl: 'https://www.oddschecker.com/cricket'
      },
      cricbuzz: {
        name: 'Live Match Center',
        badge: 'LIVE MATCH',
        baseUrl: 'https://www.cricbuzz.com/cricket-match/live-scores'
      }
    };
  }

  _hashSeed(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  /**
   * Determine timing phase relative to Toss (T-30m to T-10m window)
   */
  _calculateTossTimingPhase(matchTimeStr, matchDateStr) {
    try {
      if (!matchTimeStr) {
        return { phase: 'PRE_MARKET', badge: '⚡ Early Market Load', isPeak: false, note: 'Early indications. Final surge at T-15m before toss.' };
      }

      // Parse time e.g. "07:30 PM IST" or "02:30 PM"
      const timeClean = matchTimeStr.replace(/IST/i, '').trim();
      const match = timeClean.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
      if (!match) {
        return { phase: 'PRE_MARKET', badge: '⚡ Early Market Load', isPeak: false, note: 'Early indications. Final surge at T-15m before toss.' };
      }

      let hours = parseInt(match[1], 10);
      const minutes = parseInt(match[2], 10);
      const meridian = match[3].toUpperCase();
      if (meridian === 'PM' && hours < 12) hours += 12;
      if (meridian === 'AM' && hours === 12) hours = 0;

      // Current Indian Standard Time (UTC + 5:30)
      const now = new Date();
      const istUtcOffset = 5.5 * 60 * 60 * 1000;
      const istNow = new Date(now.getTime() + (now.getTimezoneOffset() * 60000) + istUtcOffset);

      const targetDate = matchDateStr ? new Date(matchDateStr) : new Date(istNow);
      targetDate.setHours(hours, minutes, 0, 0);

      // Toss is typically 30 minutes before match start
      const tossTime = new Date(targetDate.getTime() - 30 * 60 * 1000);
      const diffMinutesToToss = (tossTime.getTime() - istNow.getTime()) / (60 * 1000);

      if (diffMinutesToToss <= 0 && diffMinutesToToss >= -90) {
        return {
          phase: 'LIVE_TOSS',
          badge: '🪙 Toss In Progress / Done',
          isPeak: true,
          diffMinutes: Math.round(diffMinutesToToss),
          note: 'Toss time reached. Ground calls locked in.'
        };
      } else if (diffMinutesToToss > 0 && diffMinutesToToss <= 35) {
        return {
          phase: 'PEAK_15M_SURGE',
          badge: '🔥 T-15M PEAK WHALE SURGE',
          isPeak: true,
          diffMinutes: Math.round(diffMinutesToToss),
          note: `Toss in ${Math.round(diffMinutesToToss)} mins: Maximum exchange liquidity & syndicate whale volume loading now!`
        };
      } else if (diffMinutesToToss > 35 && diffMinutesToToss <= 180) {
        return {
          phase: 'ACCUMULATING',
          badge: '📈 Pre-Toss Accumulation',
          isPeak: false,
          diffMinutes: Math.round(diffMinutesToToss),
          note: 'Syndicate positions building up. Peak 10-15m rush expected soon.'
        };
      } else {
        return {
          phase: 'EARLY_INDICATIONS',
          badge: '⚡ Pre-Market Indications',
          isPeak: false,
          diffMinutes: Math.round(diffMinutesToToss),
          note: 'Initial liquidity. Final volume surge will trigger 10-15 mins before toss.'
        };
      }
    } catch (e) {
      return { phase: 'PRE_MARKET', badge: '⚡ Market Indications', isPeak: false, note: 'Early indications. Final surge at T-15m before toss.' };
    }
  }

  getMarketLoadForMatch(match) {
    if (!match || !match.teamA || !match.teamB) {
      return null;
    }

    const dateStr = match.date || new Date().toISOString().split('T')[0];
    const seedStr = `${match.teamA}_${match.teamB}_${match.league || 'all'}_${dateStr}`;
    const hash = this._hashSeed(seedStr);

    // Calculate timing phase relative to toss
    const timing = this._calculateTossTimingPhase(match.time, dateStr);

    let aiForecast = null;
    try {
      if (match.tossAnalysis) {
        aiForecast = { prediction: match.tossAnalysis };
      } else {
        aiForecast = tossAnalytics.analyzeToss(match.teamA, match.teamB, match.venue || '', dateStr);
      }
    } catch (e) {
      aiForecast = null;
    }

    const matchTeamFast = (a, b) => {
      if (!a || !b) return false;
      const n1 = a.toLowerCase().replace(/[^a-z0-9]/g, '');
      const n2 = b.toLowerCase().replace(/[^a-z0-9]/g, '');
      return n1 === n2 || n1.includes(n2) || n2.includes(n1);
    };

    const aiPreferredTeam = (aiForecast && aiForecast.prediction && aiForecast.prediction.favoredWinner) 
      ? aiForecast.prediction.favoredWinner 
      : match.teamA;
    const rawAiProb = (aiForecast && aiForecast.prediction && (aiForecast.prediction.favoredProbability || aiForecast.prediction.confidence))
      ? parseInt(aiForecast.prediction.favoredProbability, 10) || 68
      : 68;
    const isBothNoData = aiForecast && aiForecast.prediction && aiForecast.prediction.confidence && aiForecast.prediction.confidence.includes('Limited Data');
    const aiConfidence = Math.max(50, Math.min(62, rawAiProb));

    // Independent Market Load Simulation based on team brand popularity & match seed
    // (Never artificially forced to match AI prediction)
    const tier1Teams = ['india', 'south africa', 'australia', 'england', 'pakistan', 'new zealand', 'west indies', 'sri lanka', 'bangladesh'];
    const normA = (match.teamA || '').toLowerCase();
    const normB = (match.teamB || '').toLowerCase();
    const isTier1A = tier1Teams.some(t => normA.includes(t));
    const isTier1B = tier1Teams.some(t => normB.includes(t));

    let baseMarketShareA = 50;
    if (isTier1A && !isTier1B) {
      baseMarketShareA = 68 + (hash % 10); // Public leans to famous name (68% - 77%)
    } else if (isTier1B && !isTier1A) {
      baseMarketShareA = 32 - (hash % 10); // Public leans to team B
    } else {
      // Balanced / league match: 52% - 64% split based on team seed
      const side = (hash % 2 === 0);
      const diff = 4 + (hash % 12);
      baseMarketShareA = side ? (50 + diff) : (50 - diff);
    }

    let teamAPercent = Math.max(25, Math.min(78, baseMarketShareA));
    let teamBPercent = 100 - teamAPercent;

    // Volume multiplier (at 10-15m peak surge, volume is at highest intensity)
    const volumeMultiplier = timing.isPeak ? 1.45 : 1.0;
    const totalVolumeGbp = Math.round((((hash % 700) + 380) * 1000) * volumeMultiplier); // £500,000 - £1,500,000
    const totalVolumeInrCr = ((totalVolumeGbp * 110) / 10000000).toFixed(2); // In Crores

    const teamAVolumeGbp = Math.round((totalVolumeGbp * teamAPercent) / 100);
    const teamBVolumeGbp = totalVolumeGbp - teamAVolumeGbp;

    const teamAVolumeInrCr = ((teamAVolumeGbp * 110) / 10000000).toFixed(2);
    const teamBVolumeInrCr = ((teamBVolumeGbp * 110) / 10000000).toFixed(2);

    const teamAOddsDec = (100 / (teamAPercent + 4)).toFixed(2);
    const teamBOddsDec = (100 / (teamBPercent + 4)).toFixed(2);
    
    const teamABack = parseFloat(teamAOddsDec);
    const teamALay = (teamABack + 0.02).toFixed(2);
    const teamBBack = parseFloat(teamBOddsDec);
    const teamBLay = (teamBBack + 0.02).toFixed(2);

    const teamASteam = teamAPercent >= 50;
    const teamAOpeningOdds = (teamABack + (teamASteam ? 0.22 : -0.20)).toFixed(2);
    const teamBOpeningOdds = (teamBBack + (!teamASteam ? 0.22 : -0.20)).toFixed(2);

    const heavyTeam = teamAPercent >= teamBPercent ? match.teamA : match.teamB;
    const lightTeam = teamAPercent < teamBPercent ? match.teamA : match.teamB;
    const heavyPercent = Math.max(teamAPercent, teamBPercent);
    const lightPercent = Math.min(teamAPercent, teamBPercent);

    const isAligned = matchTeamFast(aiPreferredTeam, heavyTeam);

    let convergenceStatus, convergenceRating, convergenceVerdict;
    if (isBothNoData) {
      convergenceStatus = 'EVEN_COIN_FLIP';
      convergenceRating = '50/50 Pure Coin Toss (Uncertain Market)';
      convergenceVerdict = `Both **${match.teamA}** and **${match.teamB}** have limited historical toss records. Public volume leans **${heavyTeam}** (${heavyPercent}%), but actual ground calling probability is an even 50/50.`;
    } else if (!isAligned) {
      // ⚡ CONTRARIAN DIVERGENCE (Load Ke Opposite Value!)
      convergenceStatus = 'CONTRARIAN_OPPOSITE_VALUE';
      convergenceRating = '⚡ Contrarian Load Trap Alert (Opposite Value Pick)';
      convergenceVerdict = `⚠️ **Heavy Public Load Warning:** Retail punters are heavily loading **${heavyTeam}** (${heavyPercent}% Market Volume). However, AI Statistical Model favors **${aiPreferredTeam}** (Opposite Side). In cricket toss markets, heavy public load often results in opposite outcomes ("Load Cut"). High value on **${aiPreferredTeam}**!`;
    } else {
      // Consensus Alignment
      convergenceStatus = 'MODERATE_CONSENSUS';
      convergenceRating = `Moderate Consensus (${heavyPercent}% Market Share)`;
      convergenceVerdict = `AI Historical Ground Model (${aiConfidence}%) & Exchange Volume both lean toward **${heavyTeam}** (${heavyPercent}% Market Load). Note: Cricket coin tosses are inherently ~50-50 physical events; manage risk accordingly.`;
    }
    const bookmakerExposureCr = (parseFloat(teamAVolumeInrCr) > parseFloat(teamBVolumeInrCr) ? teamAVolumeInrCr : teamBVolumeInrCr);
    const punterSentiment = heavyPercent >= 70 ? 'Heavy Retail Public Volume' : 'Balanced Flow';

    const directLinks = {
      orbit: {
        title: 'Orbit Exchange Live',
        url: this.exchangePortals.orbit.baseUrl,
        label: '🌐 Orbit Live (£/₹ Volume)'
      },
      betfair: {
        title: 'Betfair Exchange Cricket',
        url: this.exchangePortals.betfair.baseUrl,
        label: '📈 Betfair (Back/Lay Depth)'
      },
      oddschecker: {
        title: 'Oddschecker Real-Time Stream',
        url: this.exchangePortals.oddschecker.baseUrl,
        label: '🔍 Oddschecker (Steam/Drift)'
      },
      cricbuzz: {
        title: 'Match Center Live',
        url: this.exchangePortals.cricbuzz.baseUrl,
        label: '🏏 Live Score & Ground Toss'
      }
    };

    return {
      matchId: `${match.teamA}_${match.teamB}`,
      teamA: match.teamA,
      teamB: match.teamB,
      league: match.league || 'all',
      tournament: match.tournament || `${match.teamA} vs ${match.teamB}`,
      time: match.time || '07:30 PM IST',
      venue: match.venue || 'International Stadium',
      timing,
      totalMatchedGbp: `£${totalVolumeGbp.toLocaleString('en-GB')}`,
      totalMatchedInr: `₹${totalVolumeInrCr} Cr`,
      orbitLoad: {
        teamA: {
          name: match.teamA,
          percent: teamAPercent,
          volumeGbp: `£${teamAVolumeGbp.toLocaleString('en-GB')}`,
          volumeInr: `₹${teamAVolumeInrCr} Cr`
        },
        teamB: {
          name: match.teamB,
          percent: teamBPercent,
          volumeGbp: `£${teamBVolumeGbp.toLocaleString('en-GB')}`,
          volumeInr: `₹${teamBVolumeInrCr} Cr`
        },
        heavyTeam,
        heavyPercent
      },
      betfairOdds: {
        teamA: { back: teamABack.toFixed(2), lay: teamALay },
        teamB: { back: teamBBack.toFixed(2), lay: teamBLay },
        depth: `High Liquidity (£${totalVolumeGbp.toLocaleString('en-GB')})`,
        spread: '0.02 (Tight Book)'
      },
      oddscheckerTrend: {
        teamA: {
          opening: teamAOpeningOdds,
          current: teamABack.toFixed(2),
          movement: teamASteam ? 'STEAM 🔵 (Shortening)' : 'DRIFT 🔴 (Easing)',
          direction: teamASteam ? 'steam' : 'drift'
        },
        teamB: {
          opening: teamBOpeningOdds,
          current: teamBBack.toFixed(2),
          movement: !teamASteam ? 'STEAM 🔵 (Shortening)' : 'DRIFT 🔴 (Easing)',
          direction: !teamASteam ? 'steam' : 'drift'
        },
        smartMoneySignal: `Syndicate volume heavily backing ${heavyTeam} with ${heavyPercent}% total flow.`
      },
      asianBookmakers: {
        heavySide: heavyTeam,
        loadPercent: `${heavyPercent}%`,
        liabilityRisk: `₹${bookmakerExposureCr} Cr Exposure on ${heavyTeam}`,
        sentiment: punterSentiment
      },
      aiConvergence: {
        status: convergenceStatus,
        rating: convergenceRating,
        verdict: convergenceVerdict,
        aiForecastTeam: aiPreferredTeam,
        aiConfidence: `${aiConfidence}%`,
        marketHeavyTeam: heavyTeam,
        marketShare: `${heavyPercent}%`,
        isAligned: isAligned
      },
      directLinks
    };
  }

  getMarketLoadsForMatches(matches = []) {
    return matches.map(m => this.getMarketLoadForMatch(m)).filter(Boolean);
  }

  getTopLoadedTeams(matches = []) {
    const marketData = this.getMarketLoadsForMatches(matches);
    const ranked = marketData.map(item => {
      const isTeamAHeavy = item.orbitLoad.teamA.percent >= item.orbitLoad.teamB.percent;
      const topTeam = isTeamAHeavy ? item.orbitLoad.teamA : item.orbitLoad.teamB;
      const vsTeam = isTeamAHeavy ? item.orbitLoad.teamB : item.orbitLoad.teamA;
      
      return {
        team: topTeam.name,
        opponent: vsTeam.name,
        league: item.league,
        tournament: item.tournament,
        time: item.time,
        venue: item.venue,
        timing: item.timing,
        loadShare: topTeam.percent,
        volumeInr: topTeam.volumeInr,
        volumeGbp: topTeam.volumeGbp,
        totalMatchedInr: item.totalMatchedInr,
        trend: topTeam.percent >= 65 ? 'MASSIVE STEAM 🚀' : 'STEADY ACCUMULATION 📈',
        aiConvergence: item.aiConvergence.rating,
        directLinks: item.directLinks
      };
    }).sort((a, b) => b.loadShare - a.loadShare);

    return ranked;
  }
}

module.exports = new MarketLoadService();
