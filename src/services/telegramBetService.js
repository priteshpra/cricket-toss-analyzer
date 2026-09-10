const https = require('https');

class TelegramBetService {
  constructor() {
    this.channelUsername = 'BetfairTossbookOrignal';
    this.channelUrl = `https://t.me/s/${this.channelUsername}`;
    this.webTelegramUrl = `https://web.telegram.org/k/#@${this.channelUsername}`;
    this.cachedBets = [];
    this.knownPostIds = new Set();
    this.lastFetchTime = null;
    this.fetchStatus = 'initialized';
    this.fetchError = null;
    this.agent = new https.Agent({ rejectUnauthorized: false });
    this.isPolling = false;
    this.pollIntervalMs = 12000; // Poll every 12 seconds
    
    // Start initial fetch and background polling loop
    this.startBackgroundPoller();
  }

  /**
   * Start polling loop
   */
  startBackgroundPoller() {
    if (this.isPolling) return;
    this.isPolling = true;
    
    // Initial fetch immediately
    this.fetchLatestChannelPosts().catch(err => {
      console.warn('[TelegramBetService] Initial fetch error:', err.message);
    });

    setInterval(() => {
      this.fetchLatestChannelPosts().catch(err => {
        // Keep quiet on polling retry
      });
    }, this.pollIntervalMs);
  }

  /**
   * Fetch raw HTML from Telegram web preview
   */
  fetchRawHtml() {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 't.me',
        path: `/s/${this.channelUsername}`,
        method: 'GET',
        agent: this.agent,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9'
        },
        timeout: 10000
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(data);
          } else {
            reject(new Error(`Telegram responded with HTTP ${res.statusCode}`));
          }
        });
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Telegram request timed out'));
      });

      req.on('error', (err) => {
        reject(err);
      });

      req.end();
    });
  }

  /**
   * Parse messages from Telegram HTML
   */
  parsePostsFromHtml(html) {
    if (!html || typeof html !== 'string') return [];

    const blocks = html.split('<div class="tgme_widget_message_wrap');
    const posts = [];

    for (let i = 1; i < blocks.length; i++) {
      const block = blocks[i];

      // Extract Post ID
      const postMatch = block.match(/data-post="([^"]+)"/);
      const postId = postMatch ? postMatch[1] : `post_${Date.now()}_${i}`;

      // Extract Timestamp
      const timeMatch = block.match(/<time[^>]*datetime="([^"]+)"[^>]*>([\s\S]*?)<\/time>/);
      const isoTime = timeMatch ? timeMatch[1] : new Date().toISOString();
      let displayTime = timeMatch ? timeMatch[2].trim() : '';
      
      // Convert to IST readable time
      try {
        const d = new Date(isoTime);
        displayTime = d.toLocaleTimeString('en-US', {
          timeZone: 'Asia/Kolkata',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        });
      } catch (e) {
        // fallback
      }

      // Extract Text
      const textMatch = block.match(/<div class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/);
      let rawText = '';
      if (textMatch) {
        rawText = textMatch[1]
          .replace(/<br\s*\/?>/gi, '\n')
          .replace(/<[^>]+>/g, '')
          .trim();
      }

      if (!rawText) continue;

      // Extract structured fields
      // Example:
      // USER NAME - BTB1648
      // TEAM NAME - STACK
      // AMOUNT - ₹5,170
      let userName = null;
      let teamName = null;
      let amount = null;
      let action = null;
      let type = 'ANNOUNCEMENT';

      const userMatch = rawText.match(/USER\s*NAME\s*[-:]\s*([^\n\r]+)/i);
      if (userMatch) userName = userMatch[1].trim();

      const teamMatch = rawText.match(/TEAM\s*NAME\s*[-:]\s*([^\n\r]+)/i);
      if (teamMatch) {
        teamName = teamMatch[1].trim();
        type = 'BET_PLACED';
      }

      const amtMatch = rawText.match(/AMOUNT\s*[-:]\s*([^\n\r]+)/i);
      if (amtMatch) amount = amtMatch[1].trim();

      const depMatch = rawText.match(/DEPOSIT\/WITHDRAWAL\s*[-:]\s*([^\n\r]+)/i);
      if (depMatch) {
        action = depMatch[1].trim();
        type = 'DEPOSIT_WITHDRAWAL';
      }

      if (!teamName && /TOSS|WINNER|BET/i.test(rawText) && userName) {
        type = 'BET_PLACED';
      }

      const postObj = {
        postId,
        isoTime,
        displayTime,
        rawText,
        userName: userName || (type === 'ANNOUNCEMENT' ? 'System / Admin' : 'Anonymous'),
        teamName: teamName || (type === 'BET_PLACED' ? 'Toss Pick' : null),
        amount: amount || (type === 'BET_PLACED' ? '₹1,000' : null),
        action: action || (type === 'BET_PLACED' ? 'BET_PLACED' : 'UPDATE'),
        type,
        channel: `@${this.channelUsername}`,
        messageUrl: `https://t.me/${postId}`,
        webTelegramUrl: this.webTelegramUrl,
        receivedAt: Date.now()
      };

      posts.push(postObj);
    }

    return posts;
  }

  /**
   * Fetch and update channel cache
   */
  async fetchLatestChannelPosts() {
    try {
      const html = await this.fetchRawHtml();
      const newPosts = this.parsePostsFromHtml(html);

      if (newPosts && newPosts.length > 0) {
        // Merge into cachedBets preserving newest first
        for (const post of newPosts) {
          if (!this.knownPostIds.has(post.postId)) {
            this.knownPostIds.add(post.postId);
            this.cachedBets.unshift(post);
          }
        }

        // Cap cache at 150 items
        if (this.cachedBets.length > 150) {
          this.cachedBets = this.cachedBets.slice(0, 150);
        }
      }

      this.lastFetchTime = new Date().toISOString();
      this.fetchStatus = 'connected';
      this.fetchError = null;
      return this.cachedBets;
    } catch (err) {
      this.fetchStatus = this.cachedBets.length > 0 ? 'connected_cached' : 'error';
      this.fetchError = err.message;
      return this.cachedBets;
    }
  }

  /**
   * Get all cached bets with optional filters
   */
  getBets(options = {}) {
    const { user, type, minAmount, limit = 60 } = options;

    let filtered = [...this.cachedBets];

    // Filter by user ID / username if specified
    if (user && user.trim() !== '' && user.trim() !== '*') {
      const targetUsers = user
        .split(',')
        .map(u => u.trim().toLowerCase().replace(/^@/, ''))
        .filter(Boolean);

      if (targetUsers.length > 0) {
        filtered = filtered.filter(b => {
          if (!b.userName) return false;
          const cleanUser = b.userName.toLowerCase().replace(/^@/, '');
          return targetUsers.some(target => cleanUser.includes(target) || target.includes(cleanUser));
        });
      }
    }

    // Filter by type: 'bets_only' vs 'all'
    if (type === 'bets_only') {
      filtered = filtered.filter(b => b.type === 'BET_PLACED');
    }

    // Filter by minimum amount
    if (minAmount && !isNaN(Number(minAmount))) {
      const minVal = Number(minAmount);
      filtered = filtered.filter(b => {
        if (!b.amount) return false;
        const num = parseFloat(b.amount.replace(/[^0-9.]/g, ''));
        return !isNaN(num) && num >= minVal;
      });
    }

    return {
      success: true,
      status: this.fetchStatus,
      lastFetchTime: this.lastFetchTime,
      channel: `@${this.channelUsername}`,
      webUrl: this.webTelegramUrl,
      tmeUrl: this.channelUrl,
      count: filtered.length,
      totalCached: this.cachedBets.length,
      bets: filtered.slice(0, limit)
    };
  }

  /**
   * Inject a test bet to verify client alerts (sound & desktop push)
   */
  injectTestBet(customData = {}) {
    const testId = `test_${Date.now()}`;
    const testBet = {
      postId: `BetfairTossbookOrignal/${testId}`,
      isoTime: new Date().toISOString(),
      displayTime: new Date().toLocaleTimeString('en-US', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      }),
      rawText: `USER NAME - ${customData.userName || 'VIP7186'}\nTEAM NAME - ${customData.teamName || 'INDIA W'}\nAMOUNT - ${customData.amount || '₹10,000'}\nTEST BET PLACED`,
      userName: customData.userName || 'VIP7186',
      teamName: customData.teamName || 'INDIA W (TOSS WIN)',
      amount: customData.amount || '₹10,000',
      action: 'BET_PLACED',
      type: 'BET_PLACED',
      channel: `@${this.channelUsername}`,
      messageUrl: this.channelUrl,
      webTelegramUrl: this.webTelegramUrl,
      isTest: true,
      receivedAt: Date.now()
    };

    this.cachedBets.unshift(testBet);
    this.knownPostIds.add(testBet.postId);
    return testBet;
  }
}

// Export singleton instance
module.exports = new TelegramBetService();
