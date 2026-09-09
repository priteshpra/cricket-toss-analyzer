const { TelegramClient, Api } = require('telegram');
const { StringSession } = require('telegram/sessions');
const { NewMessage } = require('telegram/events');
const fs = require('fs');
const path = require('path');
const alertService = require('./alertService');

const SESSION_FILE = path.join(__dirname, '../../telegram_session.json');

const DEFAULT_API_ID = 2040;
const DEFAULT_API_HASH = "b18441a1ff607e10a989891a5462e627";

class TelegramListener {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.phoneCodeHash = null;
    this.phoneNumber = null;
    this.apiId = DEFAULT_API_ID;
    this.apiHash = DEFAULT_API_HASH;
    this.stringSession = new StringSession('');
    this.lastSeenMsgId = 0;
    this.pollInterval = null;
    this.watchdogInterval = null;
    this.isReconnecting = false;
    this.consecutiveFailures = 0;
    this.loadSavedSession();
    this.startWatchdog();
  }

  startWatchdog() {
    if (this.watchdogInterval) clearInterval(this.watchdogInterval);
    this.watchdogInterval = setInterval(async () => {
      if (this.isReconnecting) return;
      if (fs.existsSync(SESSION_FILE)) {
        if (!this.client || !this.isConnected || !this.client.connected) {
          console.warn("[Telegram Listener Watchdog] ⚠️ Connection lost or idle. Auto-reconnecting...");
          await this.reconnect();
        }
      }
    }, 15000);
  }

  async reconnect() {
    if (this.isReconnecting) return;
    this.isReconnecting = true;
    try {
      if (this.client) {
        try { await this.client.disconnect(); } catch (e) {}
      }
      this.isConnected = false;
      await this.autoStartSavedSession();
    } catch (err) {
      console.warn("[Telegram Listener] Reconnect failed, will retry on next watchdog tick:", err.message);
    } finally {
      this.isReconnecting = false;
    }
  }

  loadSavedSession() {
    try {
      if (fs.existsSync(SESSION_FILE)) {
        const raw = fs.readFileSync(SESSION_FILE, 'utf8');
        const data = JSON.parse(raw);
        if (data.session) {
          this.stringSession = new StringSession(data.session);
          this.apiId = parseInt(data.apiId, 10) || DEFAULT_API_ID;
          this.apiHash = data.apiHash || DEFAULT_API_HASH;
          this.phoneNumber = data.phoneNumber || '';
          this.autoStartSavedSession();
        }
      }
    } catch (e) {
      console.warn("Could not load saved Telegram session:", e.message);
    }
  }

  saveSession(sessionStr) {
    try {
      fs.writeFileSync(SESSION_FILE, JSON.stringify({
        session: sessionStr,
        apiId: this.apiId,
        apiHash: this.apiHash,
        phoneNumber: this.phoneNumber,
        updatedAt: new Date().toISOString()
      }, null, 2));
    } catch (e) {
      console.error("Failed to save telegram session file:", e);
    }
  }

  async autoStartSavedSession() {
    try {
      if (!this.apiId || !this.apiHash) return;
      this.client = new TelegramClient(this.stringSession, this.apiId, this.apiHash, {
        connectionRetries: 10,
        retryDelay: 2000,
        autoReconnect: true,
        timeout: 10,
      });
      await this.client.connect();
      const me = await this.client.getMe();
      if (me) {
        this.isConnected = true;
        this.consecutiveFailures = 0;
        console.log(`[Telegram Listener] 🟢 Logged in as: ${me.firstName} (${me.username || me.phone})`);
        this.startChannelListener();
      }
    } catch (e) {
      console.warn("[Telegram Listener] Auto-connect with saved session failed:", e.message);
      this.isConnected = false;
    }
  }

  /**
   * Step 1: Request Login OTP code from Telegram (Zero-Config: Uses built-in keys if omitted)
   */
  async requestLoginCode(apiId, apiHash, phoneNumber) {
    try {
      this.apiId = apiId ? parseInt(apiId, 10) : DEFAULT_API_ID;
      this.apiHash = apiHash ? apiHash.trim() : DEFAULT_API_HASH;
      this.phoneNumber = phoneNumber.trim();

      this.stringSession = new StringSession('');
      this.client = new TelegramClient(this.stringSession, this.apiId, this.apiHash, {
        connectionRetries: 5,
      });

      await this.client.connect();

      const sendCodeResult = await this.client.sendCode(
        {
          apiId: this.apiId,
          apiHash: this.apiHash,
        },
        this.phoneNumber
      );

      this.phoneCodeHash = sendCodeResult.phoneCodeHash;
      return {
        success: true,
        message: `OTP Code Telegram app par bhej diya gaya hai (${this.phoneNumber}). Kripya 5-digit code enter karein.`,
        phoneCodeHash: this.phoneCodeHash
      };
    } catch (err) {
      console.error("Error sending Telegram login code:", err);
      return { success: false, error: err.message };
    }
  }

  async verifyLoginCode(code, password = '') {
    try {
      if (!this.client) {
        throw new Error("Client not initialized. Please click 'Send Login OTP' first.");
      }

      let authResult;
      try {
        authResult = await this.client.invoke(new Api.auth.SignIn({
          phoneNumber: this.phoneNumber,
          phoneCodeHash: this.phoneCodeHash,
          phoneCode: code.trim(),
        }));
      } catch (err) {
        if (err.message && err.message.includes('SESSION_PASSWORD_NEEDED')) {
          if (!password) {
            return {
              success: false,
              requires2FA: true,
              message: "Aapke Telegram account par Two-Step Verification (2FA Cloud Password) enabled hai. Kripya '2FA Password' box me apna password enter karke Complete Login dabayein."
            };
          }
          const passwordSrpResult = await this.client.invoke(new Api.account.GetPassword());
          const { computeCheck } = require('telegram/Password');
          const passwordCheck = await computeCheck(passwordSrpResult, password.trim());
          authResult = await this.client.invoke(new Api.auth.CheckPassword({
            password: passwordCheck,
          }));
        } else {
          throw err;
        }
      }

      const sessionStr = this.client.session.save();
      this.saveSession(sessionStr);
      this.isConnected = true;

      let me = null;
      try {
        me = await this.client.getMe();
      } catch (e) {}

      this.startChannelListener();

      return {
        success: true,
        message: `✅ Telegram Live Listener Successfully Connected! Logged in as: ${me ? (me.firstName || 'User') : 'User'}`,
        user: {
          id: me ? me.id : 'User',
          name: me ? (me.firstName || 'User') : 'User',
          phone: me ? me.phone : this.phoneNumber
        }
      };
    } catch (err) {
      console.error("Error verifying Telegram login code:", err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Start 24/7 Dual-Engine Real-Time Listener on @BetfairTossbookOrignal
   * (Event Listener + 2.5s Active MTProto Poller)
   */
  async startChannelListener() {
    if (!this.client || !this.isConnected) return;

    try {
      console.log(`[Telegram Listener] 🟢 24/7 Live Stream Activated for channel @BetfairTossbookOrignal! Monitoring users:`, alertService.config.targetUsers);

      // 1. Initial Sync to load ALL today's bets for monitored users and set lastSeenMsgId
      await this.syncAllMonitoredUsersHistory();

      // 2. Clear existing polling interval if any
      if (this.pollInterval) {
        clearInterval(this.pollInterval);
      }

      // 3. Active 2.5-Second MTProto Poller (Ultra-fast, never misses a drop)
      this.pollInterval = setInterval(async () => {
        try {
          await this.pollLatestChannelMessages();
        } catch (err) {
          // Ignore transient network errors
        }
      }, 2500);

      // 4. Also register NewMessage Event Listener
      this.client.addEventHandler(async (event) => {
        const message = event.message;
        if (!message || !message.text) return;
        this.processIncomingMessage(message);
      }, new NewMessage({}));

      this.isConnected = true;
    } catch (e) {
      console.error("[Telegram Listener] Error starting channel listener:", e);
    }
  }

  /**
   * Sync all messages for all monitored target users from today (after 12:00 AM Midnight IST)
   */
  async syncAllMonitoredUsersHistory() {
    if (!this.client || !this.isConnected) return [];

    try {
      const messages = await this.client.getMessages('BetfairTossbookOrignal', { limit: 800 });
      const todayMidnightIst = alertService.getTodayIstMidnight();
      const targets = alertService.config.targetUsers.map(u => u.trim().toUpperCase());
      let syncedCount = 0;

      for (const msg of messages) {
        if (!msg.text) continue;
        const msgDate = new Date(msg.date * 1000);
        if (msgDate < todayMidnightIst) continue;

        if (msg.id > this.lastSeenMsgId) {
          this.lastSeenMsgId = msg.id;
        }

        const cleanText = msg.text.replace(/\*\*/g, '').replace(/__/g, '');
        const lines = cleanText.split('\n').map(l => l.trim()).filter(Boolean);
        let user = '', team = '', amount = '';

        for (const line of lines) {
          if (/USER\s*NAME/i.test(line)) {
            user = line.replace(/USER\s*NAME\s*[-:]/i, '').trim().toUpperCase();
          } else if (/TEAM\s*NAME/i.test(line)) {
            team = line.replace(/TEAM\s*NAME\s*[-:]/i, '').trim().toUpperCase();
          } else if (/AMOUNT/i.test(line)) {
            amount = line.replace(/AMOUNT\s*[-:]/i, '').trim();
            if (!amount.startsWith('₹')) amount = `₹${amount}`;
          }
        }

        if (user && team && amount) {
          if (targets.includes(user)) {
            const timeIndia = msgDate.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }) + ' (India Time)';

            const item = {
              id: `tg_hist_${msg.id}`,
              timestamp: msgDate.toISOString(),
              timeIndia: timeIndia,
              username: user,
              team: team,
              match: `${team} Match`,
              amount: amount,
              channel: '@BetfairTossbookOrignal',
              rawMessage: msg.text,
              whatsappStatus: 'DELIVERED',
              recipient: '+91 ' + alertService.config.whatsappNumber,
              formattedMessage: alertService.formatWhatsAppMessage({
                username: user,
                team: team,
                amount: amount,
                channel: '@BetfairTossbookOrignal'
              })
            };

            if (!alertService.alertLogs.some(l => l.id === item.id || l.id === `tg_live_${msg.id}`)) {
              alertService.alertLogs.push(item);
              syncedCount++;
            }
          }
        }
      }

      // Sort descending (latest on top)
      alertService.alertLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      console.log(`[Telegram Listener] 🟢 Synced ${syncedCount} new drops from today. Total in alertLogs: ${alertService.alertLogs.length}`);
      return alertService.alertLogs;
    } catch (err) {
      console.error("[Telegram Listener] Error syncing monitored users history:", err);
      return alertService.alertLogs;
    }
  }

  async pollLatestChannelMessages() {
    if (!this.client || !this.isConnected || this.isReconnecting) return;

    try {
      const messages = await this.client.getMessages('BetfairTossbookOrignal', { limit: 10 });
      if (!messages || messages.length === 0) return;

      this.consecutiveFailures = 0;

      // Sort ascending to process oldest-new first
      const sorted = [...messages].sort((a, b) => a.id - b.id);

      for (const msg of sorted) {
        if (msg.id > this.lastSeenMsgId) {
          this.lastSeenMsgId = msg.id;
          await this.processIncomingMessage(msg);
        }
      }
    } catch (err) {
      this.consecutiveFailures++;
      if (this.consecutiveFailures >= 3 && !this.isReconnecting) {
        console.warn(`[Telegram Listener] ⚠️ ${this.consecutiveFailures} consecutive poll failures (${err.message}). Triggering auto-reconnect...`);
        this.reconnect();
      }
    }
  }

  async processIncomingMessage(msg) {
    if (!msg || !msg.text) return;

    const text = msg.text;
    const msgDate = new Date(msg.date * 1000);

    const parsed = alertService.parseTelegramMessage(text, 'BetfairTossbookOrignal');
    if (parsed) {
      const timeIndia = msgDate.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }) + ' (India Time)';

      console.log(`🎯 [TARGET BET DETECTED LIVE]: ${parsed.username} placed ${parsed.amount} on ${parsed.team} at ${timeIndia}!`);

      const logItem = {
        id: `tg_live_${msg.id}`,
        timestamp: msgDate.toISOString(),
        timeIndia: timeIndia,
        username: parsed.username,
        team: parsed.team,
        match: `${parsed.team} Match`,
        amount: parsed.amount,
        channel: '@BetfairTossbookOrignal',
        rawMessage: text,
        whatsappStatus: 'SENT',
        recipient: '+91 ' + alertService.config.whatsappNumber,
        formattedMessage: alertService.formatWhatsAppMessage(parsed)
      };

      // Add to alertLogs and trigger WhatsApp Dispatch
      if (!alertService.alertLogs.some(l => l.id === logItem.id)) {
        await alertService.sendWhatsAppAlert({
          ...parsed,
          id: logItem.id,
          timestamp: logItem.timestamp,
          timeIndia: timeIndia,
          rawMessage: text
        });
      }
    }
  }

  /**
   * Auto-fetch channel messages for newly added user from today (after 3 AM IST)
   */
  async fetchChannelHistoryForUser(username) {
    if (!this.client || !this.isConnected) return [];

    try {
      const messages = await this.client.getMessages('BetfairTossbookOrignal', { limit: 500 });
      const ist3am = new Date('2026-09-01T21:30:00.000Z');
      const found = [];

      for (const msg of messages) {
        if (!msg.text) continue;
        const msgDate = new Date(msg.date * 1000);
        if (msgDate < ist3am) continue;

        const cleanText = msg.text.replace(/\*\*/g, '').replace(/__/g, '');
        const userMatch = cleanText.match(/USER\s*NAME\s*[-:]\s*([A-Za-z0-9_\s]+)/i);
        const teamMatch = cleanText.match(/TEAM\s*NAME\s*[-:]\s*([A-Za-z0-9_\s]+)/i);
        const amountMatch = cleanText.match(/AMOUNT\s*[-:]\s*(₹?[\d,]+)/i);

        if (userMatch && teamMatch && amountMatch) {
          const u = userMatch[1].trim().toUpperCase();
          if (u === username.trim().toUpperCase()) {
            let amount = amountMatch[1].trim();
            if (!amount.startsWith('₹')) amount = `₹${amount}`;
            const timeIndia = msgDate.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }) + ' (India Time)';

            const item = {
              id: `tg_hist_${msg.id}`,
              timestamp: msgDate.toISOString(),
              timeIndia: timeIndia,
              username: u,
              team: teamMatch[1].trim().toUpperCase(),
              match: `${teamMatch[1].trim().toUpperCase()} Match`,
              amount: amount,
              channel: '@BetfairTossbookOrignal',
              rawMessage: msg.text,
              whatsappStatus: 'DELIVERED',
              recipient: '+91 ' + alertService.config.whatsappNumber,
              formattedMessage: alertService.formatWhatsAppMessage({
                username: u,
                team: teamMatch[1].trim().toUpperCase(),
                amount: amount,
                channel: '@BetfairTossbookOrignal'
              })
            };

            found.push(item);
            if (!alertService.alertLogs.some(l => l.id === item.id)) {
              alertService.alertLogs.push(item);
            }
          }
        }
      }

      console.log(`[Telegram Listener] Auto-fetched ${found.length} historical messages for user "${username}".`);
      return found;
    } catch (err) {
      console.error("[Telegram Listener] Error fetching user history:", err);
      return [];
    }
  }

  getStatus() {
    return {
      isConnected: this.isConnected,
      channel: alertService.config.telegramChannel,
      phoneNumber: this.phoneNumber || null,
      targetUsers: alertService.config.targetUsers,
      hasSavedSession: fs.existsSync(SESSION_FILE)
    };
  }

  disconnect() {
    try {
      if (this.client) {
        this.client.disconnect();
      }
      this.isConnected = false;
      if (fs.existsSync(SESSION_FILE)) {
        fs.unlinkSync(SESSION_FILE);
      }
      return { success: true, message: "Disconnected Telegram listener." };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }
}

module.exports = new TelegramListener();
