/**
 * Cricket Toss Analyzer & Live Market Load Intelligence - Frontend Application
 */

// Global State
let currentDate = new Date().toISOString().split('T')[0];
let currentLeague = 'all';
let currentTossStatus = 'pending'; // 'pending', 'done', 'all'
let loadedMatchesList = [];
let teamsList = [];
let venuesList = [];
let leaderboardData = [];
let topLoadedTeamsData = [];
let bulkSelectedMatchesMap = new Map();
let modalChartInstance = null;

// Local Storage Vault for unbreakable persistence of custom matches across server restarts / git updates
const VAULT_STORAGE_KEY = 'c_toss_custom_matches_vault_v1';

function getVaultMatches() {
  try {
    const raw = localStorage.getItem(VAULT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

function saveVaultMatch(match) {
  try {
    const vault = getVaultMatches();
    const date = match.date;
    if (!vault[date]) vault[date] = [];
    const exists = vault[date].some(m => 
      (m.teamA && m.teamB && m.teamA.toLowerCase().trim() === match.teamA.toLowerCase().trim() && m.teamB.toLowerCase().trim() === match.teamB.toLowerCase().trim())
    );
    if (!exists) {
      vault[date].push(match);
      localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(vault));
    }
  } catch (e) {}
}

function removeVaultMatch(teamA, teamB, date) {
  try {
    const vault = getVaultMatches();
    if (vault[date]) {
      vault[date] = vault[date].filter(m => 
        !(m.teamA.toLowerCase().trim() === teamA.toLowerCase().trim() && m.teamB.toLowerCase().trim() === teamB.toLowerCase().trim()) &&
        !(m.teamA.toLowerCase().trim() === teamB.toLowerCase().trim() && m.teamB.toLowerCase().trim() === teamA.toLowerCase().trim())
      );
      localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(vault));
    }
  } catch (e) {}
}

function getDisplayTeamName(name) {
  if (!name) return '';
  const clean = name.trim();
  const knownShorts = {
    'South Africa': 'South Africa',
    'South Africa Women': 'South Africa W',
    'New Zealand': 'New Zealand',
    'New Zealand Women': 'New Zealand W',
    'Sri Lanka': 'Sri Lanka',
    'Sri Lanka Women': 'Sri Lanka W',
    'West Indies': 'West Indies',
    'West Indies Women': 'West Indies W',
    'United Arab Emirates': 'UAE',
    'United Arab Emirates Women': 'UAE W',
    'Hong Kong, China': 'Hong Kong',
    'Hong Kong Women': 'Hong Kong W',
    'India Women': 'India W',
    'Bangladesh Women': 'Bangladesh W',
    'England Women': 'England W',
    'Australia Women': 'Australia W',
    'Pakistan Women': 'Pakistan W',
    'Ireland Women': 'Ireland W',
    'Trinbago Knight Riders': 'Trinbago',
    'Trinbago Knight Riders Women': 'Trinbago W',
    'Antigua and Barbuda Falcons': 'Antigua Falcons',
    'Guyana Amazon Warriors': 'Guyana',
    'Guyana Amazon Warriors Women': 'Guyana W',
    'Barbados Royals': 'Barbados',
    'Barbados Royals Women': 'Barbados W',
    'Meerut Mavericks': 'Meerut',
    'Kanpur Superstars': 'Kanpur',
    'Mohali Kings': 'Mohali',
    'Bathinda Royals': 'Bathinda',
    'Ludhiana Lions': 'Ludhiana',
    'Fazilka Falcons': 'Fazilka',
    'Jalandhar Warriors': 'Jalandhar',
    'Amritsar Soormas': 'Amritsar',
    'Aries Kollam Sailors': 'Kollam',
    'Calicut Globstars': 'Calicut',
    'Glasgow Cosmic': 'Glasgow',
    'Rotterdam Dockers': 'Rotterdam',
    'Amsterdam Flames': 'Amsterdam',
    'Belfast Wolves': 'Belfast',
    'Dublin Guardians': 'Dublin',
    'Herbertpur Knightriders': 'Herbertpur',
    'Selaqui Strikers': 'Selaqui',
    'Ceylinco Express CC': 'Ceylinco',
    'Stack CC': 'Stack CC',
    'Forfarshire Cricket Club': 'Forfarshire',
    'Svanholm Cricket Club': 'Svanholm'
  };
  if (knownShorts[clean]) return knownShorts[clean];
  if (clean.toLowerCase().endsWith(' women')) {
    return clean.slice(0, -6).trim() + ' W';
  }
  return clean.length > 20 ? clean.slice(0, 18) + '..' : clean;
}

// DOM Elements
const navScheduleBtn = document.getElementById('nav-schedule-btn');
const navMarketLoadBtn = document.getElementById('nav-market-load-btn');
const navSimulatorBtn = document.getElementById('nav-simulator-btn');
const navLeaderboardBtn = document.getElementById('nav-leaderboard-btn');
const navTelegramBetBtn = document.getElementById('nav-telegram-bet-btn');

const tabSchedule = document.getElementById('tab-schedule');
const tabMarketLoad = document.getElementById('tab-market-load');
const tabSimulator = document.getElementById('tab-simulator');
const tabLeaderboard = document.getElementById('tab-leaderboard');
const tabTelegramBet = document.getElementById('tab-telegram-bet');

const datePicker = document.getElementById('match-date-picker');
const dateYesterdayBtn = document.getElementById('date-yesterday');
const dateTodayBtn = document.getElementById('date-today');
const dateTomorrowBtn = document.getElementById('date-tomorrow');
const leagueFilter = document.getElementById('league-filter');
const refreshMatchesBtn = document.getElementById('refresh-matches-btn');
const btnOpenAddMatch = document.getElementById('btn-open-add-match');
const btnDeleteAllMatches = document.getElementById('btn-delete-all-matches');

const filterTossPendingBtn = document.getElementById('filter-toss-pending');
const filterTossDoneBtn = document.getElementById('filter-toss-done');
const filterTossAllBtn = document.getElementById('filter-toss-all');
const pendingCountBadge = document.getElementById('pending-count-badge');
const doneCountBadge = document.getElementById('done-count-badge');
const allCountBadge = document.getElementById('all-count-badge');
const displayFilterLabel = document.getElementById('display-filter-label');
const displayDateLabel = document.getElementById('display-date-label');
const totalMatchesCount = document.getElementById('total-matches-count');

// Scorecard Badges
const tossDoneStatsBanner = document.getElementById('toss-done-stats-banner');
const statPassCount = document.getElementById('stat-pass-count');
const statFailCount = document.getElementById('stat-fail-count');
const statAccuracyRate = document.getElementById('stat-accuracy-rate');
const inlinePassCount = document.getElementById('inline-pass-count');
const inlineFailCount = document.getElementById('inline-fail-count');

// Bulk Actions Bar
const bulkActionsBar = document.getElementById('bulk-actions-bar');
const bulkSelectAllCheckbox = document.getElementById('bulk-select-all-checkbox');
const bulkSelectedCount = document.getElementById('bulk-selected-count');
const btnDeleteSelectedMatches = document.getElementById('btn-delete-selected-matches');
const btnDeleteSelectedCount = document.getElementById('btn-delete-selected-count');
const btnCancelBulkSelection = document.getElementById('btn-cancel-bulk-selection');

const matchesContainer = document.getElementById('matches-container');
const emptyState = document.getElementById('empty-state');

// Market Load Elements
const btnRefreshMarketLoad = document.getElementById('btn-refresh-market-load');
const topLoadedTeamsGrid = document.getElementById('top-loaded-teams-grid');
const marketLoadMatchesGrid = document.getElementById('market-load-matches-grid');
const marketLoadDateDisplay = document.getElementById('market-load-date-display');

// Simulator Elements
const simTeamA = document.getElementById('sim-team-a');
const simTeamB = document.getElementById('sim-team-b');
const simVenue = document.getElementById('sim-venue');
const simTeamAInput = document.getElementById('sim-team-a-input');
const simTeamBInput = document.getElementById('sim-team-b-input');
const simVenueInput = document.getElementById('sim-venue-input');
const teamsDatalist = document.getElementById('teams-datalist');
const venuesDatalist = document.getElementById('venues-datalist');
const runSimBtn = document.getElementById('run-simulation-btn');
const simResultContainer = document.getElementById('sim-result-container');

// Leaderboard Elements
const leaderboardTbody = document.getElementById('leaderboard-tbody');
const leaderboardSearch = document.getElementById('leaderboard-search');
const leaderboardLeagueFilter = document.getElementById('leaderboard-league-filter');
const leaderboardTotalCount = document.getElementById('leaderboard-total-count');

// Modals
const tossModal = document.getElementById('toss-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const modalContent = document.getElementById('modal-content');

const editTossModal = document.getElementById('edit-toss-modal');
const closeEditTossModal = document.getElementById('close-edit-toss-modal');
const btnCancelEditToss = document.getElementById('btn-cancel-edit-toss');
const btnSaveEditToss = document.getElementById('btn-save-edit-toss');
const btnResetToPending = document.getElementById('btn-reset-to-pending');
const editTossMatchTitle = document.getElementById('edit-toss-match-title');
const editTossWinnerSelect = document.getElementById('edit-toss-winner-select');
const editTossDecisionSelect = document.getElementById('edit-toss-decision-select');
const editTossTeamA = document.getElementById('edit-toss-teamA');
const editTossTeamB = document.getElementById('edit-toss-teamB');
const editTossDate = document.getElementById('edit-toss-date');

const addMatchModal = document.getElementById('add-match-modal');
const closeAddMatchModal = document.getElementById('close-add-match-modal');
const btnCancelAddMatch = document.getElementById('btn-cancel-add-match');
const btnSaveAddMatch = document.getElementById('btn-save-add-match');
const addMatchTeamA = document.getElementById('add-match-teamA');
const addMatchTeamB = document.getElementById('add-match-teamB');
const addMatchTime = document.getElementById('add-match-time');
const addMatchLeague = document.getElementById('add-match-league');
const addMatchVenue = document.getElementById('add-match-venue');
const addMatchDate = document.getElementById('add-match-date');

const editMatchDetailsModal = document.getElementById('edit-match-details-modal');
const closeEditDetailsModal = document.getElementById('close-edit-details-modal');
const btnCancelEditDetails = document.getElementById('btn-cancel-edit-details');
const btnSaveEditDetails = document.getElementById('btn-save-edit-details');
const editDetailsOrigTeamA = document.getElementById('edit-details-orig-teamA');
const editDetailsOrigTeamB = document.getElementById('edit-details-orig-teamB');
const editDetailsOrigDate = document.getElementById('edit-details-orig-date');
const editDetailsTeamA = document.getElementById('edit-details-teamA');
const editDetailsTeamB = document.getElementById('edit-details-teamB');
const editDetailsTime = document.getElementById('edit-details-time');
const editDetailsLeague = document.getElementById('edit-details-league');
const editDetailsVenue = document.getElementById('edit-details-venue');

const globalToast = document.getElementById('global-toast');
const globalToastText = document.getElementById('global-toast-text');

// Toast helper
function showToast(message, type = 'success') {
  if (!globalToast || !globalToastText) return;
  globalToastText.textContent = message;
  globalToast.classList.remove('translate-y-20', 'opacity-0');
  setTimeout(() => {
    globalToast.classList.add('translate-y-20', 'opacity-0');
  }, 3500);
}

// Initialize Application
document.addEventListener('DOMContentLoaded', async () => {
  initDatePicker();
  setupEventListeners();
  await loadTeamsAndVenues();
  await loadMatches(currentDate, currentLeague);
  await loadLeaderboard();
  initTelegramBetMonitoring();
});

function initDatePicker() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  currentDate = `${yyyy}-${mm}-${dd}`;
  if (datePicker) datePicker.value = currentDate;
  if (addMatchDate) addMatchDate.value = currentDate;
}

// Navigation Tabs
function switchTab(activeTabId) {
  [tabSchedule, tabMarketLoad, tabSimulator, tabLeaderboard, tabTelegramBet].forEach(tab => {
    if (tab) tab.classList.add('hidden');
  });

  [navScheduleBtn, navMarketLoadBtn, navSimulatorBtn, navLeaderboardBtn, navTelegramBetBtn].forEach(btn => {
    if (btn) {
      btn.classList.remove('bg-emerald-500/15', 'text-emerald-400', 'border-emerald-500/30');
      btn.classList.add('text-slate-300');
    }
  });

  if (activeTabId === 'schedule') {
    if (tabSchedule) tabSchedule.classList.remove('hidden');
    if (navScheduleBtn) {
      navScheduleBtn.classList.add('bg-emerald-500/15', 'text-emerald-400', 'border-emerald-500/30');
      navScheduleBtn.classList.remove('text-slate-300');
    }
  } else if (activeTabId === 'market-load') {
    if (tabMarketLoad) tabMarketLoad.classList.remove('hidden');
    if (navMarketLoadBtn) {
      navMarketLoadBtn.classList.add('bg-emerald-500/15', 'text-emerald-400', 'border-emerald-500/30');
      navMarketLoadBtn.classList.remove('text-slate-300');
    }
    loadMarketLoadCenter();
  } else if (activeTabId === 'simulator') {
    if (tabSimulator) tabSimulator.classList.remove('hidden');
    if (navSimulatorBtn) {
      navSimulatorBtn.classList.add('bg-emerald-500/15', 'text-emerald-400', 'border-emerald-500/30');
      navSimulatorBtn.classList.remove('text-slate-300');
    }
    if (!simResultContainer.hasChildNodes() || simResultContainer.innerHTML.trim() === '') {
      runSimulation();
    }
  } else if (activeTabId === 'leaderboard') {
    if (tabLeaderboard) tabLeaderboard.classList.remove('hidden');
    if (navLeaderboardBtn) {
      navLeaderboardBtn.classList.add('bg-emerald-500/15', 'text-emerald-400', 'border-emerald-500/30');
      navLeaderboardBtn.classList.remove('text-slate-300');
    }
    loadLeaderboard();
  } else if (activeTabId === 'telegram-bet') {
    if (tabTelegramBet) tabTelegramBet.classList.remove('hidden');
    if (navTelegramBetBtn) {
      navTelegramBetBtn.classList.add('bg-emerald-500/15', 'text-emerald-400', 'border-emerald-500/30');
      navTelegramBetBtn.classList.remove('text-slate-300');
    }
    if (tgNavBadge) {
      tgNavBadge.innerHTML = 'LIVE';
      tgNavBadge.className = 'inline-flex items-center ml-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-extrabold bg-sky-500/20 text-sky-300 border border-sky-500/40 animate-pulse';
    }
    stopTitleFlash();
    loadTelegramBets(true);
  }
}

// Setup Event Listeners
function setupEventListeners() {
  if (navScheduleBtn) navScheduleBtn.addEventListener('click', () => switchTab('schedule'));
  if (navMarketLoadBtn) navMarketLoadBtn.addEventListener('click', () => switchTab('market-load'));
  if (navSimulatorBtn) navSimulatorBtn.addEventListener('click', () => switchTab('simulator'));
  if (navLeaderboardBtn) navLeaderboardBtn.addEventListener('click', () => switchTab('leaderboard'));
  if (navTelegramBetBtn) navTelegramBetBtn.addEventListener('click', () => switchTab('telegram-bet'));

  setupTelegramBetListeners();

  if (btnRefreshMarketLoad) btnRefreshMarketLoad.addEventListener('click', loadMarketLoadCenter);

  // Date buttons
  if (dateYesterdayBtn) {
    dateYesterdayBtn.addEventListener('click', () => {
      const d = new Date(currentDate);
      d.setDate(d.getDate() - 1);
      setDate(d.toISOString().split('T')[0]);
    });
  }

  if (dateTodayBtn) {
    dateTodayBtn.addEventListener('click', () => {
      initDatePicker();
      setDate(currentDate);
    });
  }

  if (dateTomorrowBtn) {
    dateTomorrowBtn.addEventListener('click', () => {
      const d = new Date(currentDate);
      d.setDate(d.getDate() + 1);
      setDate(d.toISOString().split('T')[0]);
    });
  }

  if (datePicker) {
    datePicker.addEventListener('change', (e) => {
      if (e.target.value) setDate(e.target.value);
    });
  }

  if (leagueFilter) {
    leagueFilter.addEventListener('change', (e) => {
      currentLeague = e.target.value;
      loadMatches(currentDate, currentLeague);
    });
  }

  if (refreshMatchesBtn) {
    refreshMatchesBtn.addEventListener('click', () => {
      refreshMatchesBtn.classList.add('animate-spin');
      if (leagueFilter) currentLeague = leagueFilter.value;
      loadMatches(currentDate, currentLeague).then(() => {
        showToast('Live schedule refreshed!');
        setTimeout(() => refreshMatchesBtn.classList.remove('animate-spin'), 600);
      });
    });
  }

  // Toss Status Sub-Filters
  if (filterTossPendingBtn) {
    filterTossPendingBtn.addEventListener('click', () => {
      currentTossStatus = 'pending';
      updateTossStatusFilterUI();
      filterAndRenderMatches();
    });
  }

  if (filterTossDoneBtn) {
    filterTossDoneBtn.addEventListener('click', () => {
      currentTossStatus = 'done';
      updateTossStatusFilterUI();
      filterAndRenderMatches();
    });
  }

  if (filterTossAllBtn) {
    filterTossAllBtn.addEventListener('click', () => {
      currentTossStatus = 'all';
      updateTossStatusFilterUI();
      filterAndRenderMatches();
    });
  }

  // Bulk Actions
  if (bulkSelectAllCheckbox) {
    bulkSelectAllCheckbox.addEventListener('change', (e) => {
      const isChecked = e.target.checked;
      const checkboxes = document.querySelectorAll('.match-bulk-checkbox');
      checkboxes.forEach(cb => {
        cb.checked = isChecked;
        const key = cb.getAttribute('data-match-key');
        const teamA = cb.getAttribute('data-team-a');
        const teamB = cb.getAttribute('data-team-b');
        const date = cb.getAttribute('data-date') || currentDate;
        if (isChecked && key && teamA && teamB) {
          bulkSelectedMatchesMap.set(key, { teamA: teamA.trim(), teamB: teamB.trim(), date: date.trim() });
        } else if (key) {
          bulkSelectedMatchesMap.delete(key);
        }
      });
      updateBulkActionBarUI();
    });
  }

  if (btnCancelBulkSelection) {
    btnCancelBulkSelection.addEventListener('click', () => {
      bulkSelectedMatchesMap.clear();
      if (bulkSelectAllCheckbox) bulkSelectAllCheckbox.checked = false;
      document.querySelectorAll('.match-bulk-checkbox').forEach(cb => cb.checked = false);
      updateBulkActionBarUI();
    });
  }

  if (btnDeleteSelectedMatches) {
    btnDeleteSelectedMatches.addEventListener('click', deleteSelectedMatches);
  }

  if (btnDeleteAllMatches) {
    btnDeleteAllMatches.addEventListener('click', deleteAllMatchesForDate);
  }

  // Add Match Modal
  if (btnOpenAddMatch) {
    btnOpenAddMatch.addEventListener('click', () => {
      if (addMatchDate) addMatchDate.value = currentDate;
      if (addMatchModal) addMatchModal.classList.remove('hidden');
    });
  }

  const btnEmptyAddMatch = document.getElementById('btn-empty-add-match');
  if (btnEmptyAddMatch) {
    btnEmptyAddMatch.addEventListener('click', () => {
      if (addMatchDate) addMatchDate.value = currentDate;
      if (addMatchModal) addMatchModal.classList.remove('hidden');
    });
  }

  if (closeAddMatchModal) closeAddMatchModal.addEventListener('click', () => addMatchModal.classList.add('hidden'));
  if (btnCancelAddMatch) btnCancelAddMatch.addEventListener('click', () => addMatchModal.classList.add('hidden'));
  if (btnSaveAddMatch) btnSaveAddMatch.addEventListener('click', saveCustomMatch);

  // Edit Match Details Modal
  if (closeEditDetailsModal) closeEditDetailsModal.addEventListener('click', () => editMatchDetailsModal.classList.add('hidden'));
  if (btnCancelEditDetails) btnCancelEditDetails.addEventListener('click', () => editMatchDetailsModal.classList.add('hidden'));
  if (btnSaveEditDetails) btnSaveEditDetails.addEventListener('click', saveEditedMatchDetails);

  // Edit Toss Result Modal
  if (closeEditTossModal) closeEditTossModal.addEventListener('click', () => editTossModal.classList.add('hidden'));
  if (btnCancelEditToss) btnCancelEditToss.addEventListener('click', () => editTossModal.classList.add('hidden'));
  if (btnSaveEditToss) btnSaveEditToss.addEventListener('click', saveTossResult);
  if (btnResetToPending) btnResetToPending.addEventListener('click', resetTossToPending);

  // Deep Dive Modal
  if (closeModalBtn) closeModalBtn.addEventListener('click', () => tossModal.classList.add('hidden'));

  // Simulator
  if (runSimBtn) runSimBtn.addEventListener('click', runSimulation);

  // Simulator Presets
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const a = btn.getAttribute('data-a');
      const b = btn.getAttribute('data-b');
      const v = btn.getAttribute('data-v');
      if (simTeamAInput) simTeamAInput.value = a;
      if (simTeamBInput) simTeamBInput.value = b;
      if (simVenueInput) simVenueInput.value = v;
      if (simTeamA) simTeamA.value = a;
      if (simTeamB) simTeamB.value = b;
      if (simVenue) simVenue.value = v;
      runSimulation();
    });
  });

  // Simulator Dropdown Sync
  if (simTeamA) simTeamA.addEventListener('change', () => { if (simTeamAInput) simTeamAInput.value = simTeamA.value; });
  if (simTeamB) simTeamB.addEventListener('change', () => { if (simTeamBInput) simTeamBInput.value = simTeamB.value; });
  if (simVenue) simVenue.addEventListener('change', () => { if (simVenueInput) simVenueInput.value = simVenue.value; });

  // Leaderboard filters
  if (leaderboardLeagueFilter) leaderboardLeagueFilter.addEventListener('change', loadLeaderboard);
  if (leaderboardSearch) leaderboardSearch.addEventListener('input', filterAndRenderLeaderboard);
}

function updateTossStatusFilterUI() {
  [filterTossPendingBtn, filterTossDoneBtn, filterTossAllBtn].forEach(b => {
    if (b) {
      b.classList.remove('active', 'bg-emerald-500', 'text-slate-950');
      b.classList.add('bg-slate-800/80', 'text-slate-300');
    }
  });

  if (currentTossStatus === 'pending' && filterTossPendingBtn) {
    filterTossPendingBtn.classList.add('active', 'bg-emerald-500', 'text-slate-950');
    filterTossPendingBtn.classList.remove('bg-slate-800/80', 'text-slate-300');
    if (displayFilterLabel) displayFilterLabel.textContent = 'Toss Pending Matches';
  } else if (currentTossStatus === 'done' && filterTossDoneBtn) {
    filterTossDoneBtn.classList.add('active', 'bg-emerald-500', 'text-slate-950');
    filterTossDoneBtn.classList.remove('bg-slate-800/80', 'text-slate-300');
    if (displayFilterLabel) displayFilterLabel.textContent = 'Toss Done / Previous Results';
  } else if (currentTossStatus === 'all' && filterTossAllBtn) {
    filterTossAllBtn.classList.add('active', 'bg-emerald-500', 'text-slate-950');
    filterTossAllBtn.classList.remove('bg-slate-800/80', 'text-slate-300');
    if (displayFilterLabel) displayFilterLabel.textContent = 'All Scheduled Matches';
  }
}

function setDate(dateStr) {
  currentDate = dateStr;
  if (datePicker) datePicker.value = currentDate;

  const todayStr = new Date().toISOString().split('T')[0];
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  [dateYesterdayBtn, dateTodayBtn, dateTomorrowBtn].forEach(b => {
    if (b) {
      b.classList.remove('active', 'bg-emerald-500', 'text-slate-950', 'font-bold');
      b.classList.add('bg-slate-800/80', 'text-slate-300');
    }
  });

  if (currentDate === todayStr && dateTodayBtn) {
    dateTodayBtn.classList.add('active', 'bg-emerald-500', 'text-slate-950', 'font-bold');
    dateTodayBtn.classList.remove('bg-slate-800/80', 'text-slate-300');
    if (displayDateLabel) displayDateLabel.textContent = 'Today';
  } else if (currentDate === yesterdayStr && dateYesterdayBtn) {
    dateYesterdayBtn.classList.add('active', 'bg-emerald-500', 'text-slate-950', 'font-bold');
    dateYesterdayBtn.classList.remove('bg-slate-800/80', 'text-slate-300');
    if (displayDateLabel) displayDateLabel.textContent = 'Yesterday';
  } else if (currentDate === tomorrowStr && dateTomorrowBtn) {
    dateTomorrowBtn.classList.add('active', 'bg-emerald-500', 'text-slate-950', 'font-bold');
    dateTomorrowBtn.classList.remove('bg-slate-800/80', 'text-slate-300');
    if (displayDateLabel) displayDateLabel.textContent = 'Tomorrow';
  } else {
    if (displayDateLabel) displayDateLabel.textContent = currentDate;
  }

  // If navigating to a past date (like yesterday), auto switch to 'all' so completed matches aren't hidden by 'pending' filter
  if (currentDate < todayStr && currentTossStatus === 'pending') {
    currentTossStatus = 'all';
    updateTossStatusFilterUI();
  }

  bulkSelectedMatchesMap.clear();
  if (bulkSelectAllCheckbox) bulkSelectAllCheckbox.checked = false;
  updateBulkActionBarUI();
  loadMatches(currentDate, currentLeague);
}

// Load Teams & Venues for autocomplete & selectors
async function loadTeamsAndVenues() {
  try {
    const res = await fetch('/api/teams');
    const data = await res.json();
    if (data.success) {
      teamsList = data.teams || [];
      if (teamsDatalist) {
        teamsDatalist.innerHTML = teamsList.map(t => `<option value="${t.name}">${t.name} (${t.league || 'Cricket'})</option>`).join('');
      }
      if (simTeamA) {
        simTeamA.innerHTML = '<option value="">-- Choose from Team List --</option>' + teamsList.map(t => `<option value="${t.name}">${t.name}</option>`).join('');
      }
      if (simTeamB) {
        simTeamB.innerHTML = '<option value="">-- Choose from Team List --</option>' + teamsList.map(t => `<option value="${t.name}">${t.name}</option>`).join('');
      }
    }

    const vRes = await fetch('/api/venues');
    const vData = await vRes.json();
    if (vData.success) {
      venuesList = vData.venues || [];
      if (venuesDatalist) {
        venuesDatalist.innerHTML = venuesList.map(v => `<option value="${v.name}">${v.name} (${v.city || ''})</option>`).join('');
      }
      if (simVenue) {
        simVenue.innerHTML = '<option value="">-- Choose Venue / Stadium --</option>' + venuesList.map(v => `<option value="${v.name}">${v.name}</option>`).join('');
      }
    }
  } catch (err) {
    console.error('Error loading teams & venues:', err);
  }
}

// Load Matches from API
async function loadMatches(date, league) {
  try {
    const url = `/api/matches?date=${date}${league && league !== 'all' ? '&league=' + league : ''}&_t=${Date.now()}`;
    const res = await fetch(url, { cache: 'no-store' });
    const result = await res.json();

    if (result.success && result.data) {
      loadedMatchesList = result.data.matches || [];

      // Unbreakable fail-safe: Check if browser local vault has any custom matches for this date missing on server
      const vault = getVaultMatches();
      const vaultForDate = vault[date] || [];
      if (vaultForDate.length > 0) {
        vaultForDate.forEach(vm => {
          const vA = (vm.teamA || '').toLowerCase().trim();
          const vB = (vm.teamB || '').toLowerCase().trim();
          const inServer = loadedMatchesList.some(sm => {
            const sA = (sm.teamA || '').toLowerCase().trim();
            const sB = (sm.teamB || '').toLowerCase().trim();
            return (sA === vA && sB === vB) || (sA === vB && sB === vA);
          });
          if (!inServer && vA && vB) {
            // Restore to server in background
            fetch('/api/matches/add-custom', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(vm)
            }).catch(() => {});
            loadedMatchesList.unshift({
              ...vm,
              status: 'UPCOMING',
              tossDone: false
            });
          }
        });
      }

      filterAndRenderMatches();
    }
  } catch (err) {
    console.error('Error fetching matches:', err);
    showToast('Failed to load matches from server', 'error');
  }
}

// Filter and render matches based on status tab (pending vs done vs all)
function filterAndRenderMatches() {
  if (!matchesContainer) return;
  matchesContainer.innerHTML = '';

  const isMatchTossDone = (m) => Boolean(m.tossWinner && m.tossWinner.trim()) || m.status === 'COMPLETED' || Boolean(m.tossDone);
  const pendingMatches = loadedMatchesList.filter(m => !isMatchTossDone(m));
  const doneMatches = loadedMatchesList.filter(m => isMatchTossDone(m));

  if (pendingCountBadge) pendingCountBadge.textContent = pendingMatches.length;
  if (doneCountBadge) doneCountBadge.textContent = doneMatches.length;
  if (allCountBadge) allCountBadge.textContent = loadedMatchesList.length;

  // Calculate Toss Done Pass / Fail Scorecard
  let passCount = 0;
  let failCount = 0;
  doneMatches.forEach(m => {
    const tossAnalysis = m.tossAnalysis || (m.analysis && m.analysis.prediction) || {};
    const ml = m.marketLoad || {};
    const predictedWinner = (ml.aiConvergence && ml.aiConvergence.aiForecastTeam)
      || tossAnalysis.favoredWinner
      || m.favoredWinner
      || m.teamA
      || '';

    if (m.tossWinner && predictedWinner) {
      const tossWinClean = m.tossWinner.toLowerCase().trim();
      const predWinClean = predictedWinner.toLowerCase().trim();
      const isPass = tossWinClean === predWinClean ||
                     tossWinClean.includes(predWinClean) ||
                     predWinClean.includes(tossWinClean);
      if (isPass) passCount++;
      else failCount++;
    }
  });

  const totalDone = passCount + failCount;
  const accuracyRate = totalDone > 0 ? Math.round((passCount / totalDone) * 100) : 0;

  if (statPassCount) statPassCount.textContent = passCount;
  if (statFailCount) statFailCount.textContent = failCount;
  if (statAccuracyRate) statAccuracyRate.textContent = `${accuracyRate}%`;
  if (inlinePassCount) inlinePassCount.textContent = passCount;
  if (inlineFailCount) inlineFailCount.textContent = failCount;

  // If currently on 'pending' view, but pending matches are 0 and done matches exist (e.g. yesterday or completed day),
  // auto-switch to 'all' so that matches are immediately visible instead of an empty screen
  if (currentTossStatus === 'pending' && pendingMatches.length === 0 && doneMatches.length > 0) {
    currentTossStatus = 'all';
    updateTossStatusFilterUI();
  }

  if (tossDoneStatsBanner) {
    if ((currentTossStatus === 'done' || currentTossStatus === 'all') && doneMatches.length > 0) {
      tossDoneStatsBanner.classList.remove('hidden');
    } else {
      tossDoneStatsBanner.classList.add('hidden');
    }
  }

  let displayedMatches = [];
  if (currentTossStatus === 'pending') displayedMatches = pendingMatches;
  else if (currentTossStatus === 'done') displayedMatches = doneMatches;
  else displayedMatches = loadedMatchesList;

  if (totalMatchesCount) totalMatchesCount.textContent = displayedMatches.length;

  // Sync bulk select all checkbox with current rendered matches
  if (bulkSelectAllCheckbox) {
    if (displayedMatches.length > 0) {
      const allDisplayedSelected = displayedMatches.every(m => {
        const key = `${(m.teamA || '').trim()}_${(m.teamB || '').trim()}_${(m.date || currentDate).trim()}`.toLowerCase();
        return bulkSelectedMatchesMap.has(key);
      });
      bulkSelectAllCheckbox.checked = allDisplayedSelected;
    } else {
      bulkSelectAllCheckbox.checked = false;
    }
  }

  if (displayedMatches.length === 0) {
    if (emptyState) emptyState.classList.remove('hidden');
    return;
  } else {
    if (emptyState) emptyState.classList.add('hidden');
  }

  displayedMatches.forEach(match => {
    const card = createMatchCardElement(match);
    matchesContainer.appendChild(card);
  });
}

// Create Match Card Element
function createMatchCardElement(match) {
  const card = document.createElement('div');
  card.className = 'glass-panel rounded-2xl p-4 sm:p-5 border border-slate-800/80 hover:border-slate-700 transition-all duration-300 relative flex flex-col justify-between shadow-xl';

  const matchTeamA = (match.teamA || '').trim();
  const matchTeamB = (match.teamB || '').trim();
  const matchDate = (match.date || currentDate).trim();
  const matchKey = `${matchTeamA}_${matchTeamB}_${matchDate}`.toLowerCase();
  const isSelected = bulkSelectedMatchesMap.has(matchKey);

  // Status Badge
  const isDone = !!match.tossWinner || match.status === 'COMPLETED';
  const statusBadge = isDone
    ? `<span class="px-2 sm:px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] sm:text-[10px] font-bold shrink-0">🪙 Toss Done</span>`
    : `<span class="px-2 sm:px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] sm:text-[10px] font-bold animate-pulse shrink-0">⏳ Toss Pending</span>`;

  // Format League Label
  const leagueNameMap = {
    'dehradun_t20': '⛰️ Dehradun T20',
    'upt20': '🏏 UP T20',
    'kcc': '🇰🇼 KCC Summer',
    'etpl': '🇪🇺 European T20',
    'kcl': '🌴 Kerala T20',
    'pca': '🦁 Punjab T20',
    'cpl': '🏝️ CPL',
    'wcpl': "🏝️ Women's CPL",
    't20i': '🌍 T20I',
    'odi': '🏏 ODI',
    'womens_asia_cup': "👑 Women's Asia Cup"
  };
  const leagueBadge = leagueNameMap[match.league] || match.league || 'T20';

  // Analysis prediction (prioritize pure pre-toss statistical analysis)
  const tossAnalysis = match.tossAnalysis || (match.analysis && match.analysis.prediction) || {};
  const ml = match.marketLoad || {};
  const favoredWinner = tossAnalysis.favoredWinner
    || (ml.aiConvergence && ml.aiConvergence.aiForecastTeam)
    || match.favoredWinner
    || match.teamA;
  const favoredProbability = tossAnalysis.favoredProbability
    || (tossAnalysis.teamBProbability && favoredWinner === match.teamB ? tossAnalysis.teamBProbability : tossAnalysis.teamAProbability)
    || (ml.aiConvergence && parseInt(ml.aiConvergence.aiConfidence, 10))
    || 65;

  const isFavA = (favoredWinner.toLowerCase().trim() === match.teamA.toLowerCase().trim()) || favoredWinner.includes(match.teamA) || match.teamA.includes(favoredWinner);
  const isFavB = (favoredWinner.toLowerCase().trim() === match.teamB.toLowerCase().trim()) || favoredWinner.includes(match.teamB) || match.teamB.includes(favoredWinner);

  // Real Toss Done vs Prediction Pass / Fail Badge
  let tossVerificationBadge = '';
  if (isDone && match.tossWinner) {
    const isPass = match.tossWinner.toLowerCase().trim() === favoredWinner.toLowerCase().trim() ||
                   match.tossWinner.toLowerCase().includes(favoredWinner.toLowerCase()) ||
                   favoredWinner.toLowerCase().includes(match.tossWinner.toLowerCase());
    if (isPass) {
      tossVerificationBadge = `<div class="mt-2.5 p-2 rounded-xl bg-emerald-950/80 border border-emerald-500/60 flex items-center justify-between text-xs">
        <span class="text-emerald-300 font-bold flex items-center gap-1.5 truncate mr-2"><i class="fa-solid fa-circle-check text-emerald-400 shrink-0"></i> Toss Won: <strong class="truncate">${match.tossWinner}</strong></span>
        <span class="px-2 py-0.5 rounded-md bg-emerald-500 text-slate-950 text-[9px] sm:text-[10px] font-black uppercase tracking-wider shrink-0">🟢 PASS</span>
      </div>`;
    } else {
      tossVerificationBadge = `<div class="mt-2.5 p-2 rounded-xl bg-rose-950/80 border border-rose-500/60 flex items-center justify-between text-xs">
        <span class="text-rose-300 font-bold flex items-center gap-1.5 truncate mr-2"><i class="fa-solid fa-circle-xmark text-rose-400 shrink-0"></i> Toss Won: <strong class="truncate">${match.tossWinner}</strong></span>
        <span class="px-2 py-0.5 rounded-md bg-rose-500 text-white text-[9px] sm:text-[10px] font-black uppercase tracking-wider shrink-0">🔴 FAIL</span>
      </div>`;
    }
  }

  // Live Market Load Intelligence Strip
  let marketLoadStrip = '';
  if (ml && ml.orbitLoad) {
    const heavyTeam = ml.orbitLoad.heavyTeam;
    const heavyPercent = ml.orbitLoad.heavyPercent;
    const isTeamAHeavy = heavyTeam === match.teamA;
    const totalInr = ml.totalMatchedInr;
    const backOdds = isTeamAHeavy ? ml.betfairOdds.teamA.back : ml.betfairOdds.teamB.back;

    marketLoadStrip = `
      <div class="mt-2.5 sm:mt-3 p-2.5 rounded-xl bg-slate-950/90 border border-emerald-500/30 space-y-2">
        <div class="flex flex-wrap items-center justify-between gap-1 text-[11px]">
          <span class="text-slate-400 font-medium flex items-center gap-1 min-w-0">
            <i class="fa-solid fa-coins text-yellow-400 shrink-0"></i> <span class="truncate">Orbit: <strong class="text-emerald-300 font-mono">${totalInr}</strong></span>
            ${ml.timing ? `<span class="ml-1 px-1.5 py-0.2 rounded bg-slate-900 ${ml.timing.isPeak ? 'text-amber-300 border-amber-500/50' : 'text-slate-400 border-slate-800'} text-[9px] font-bold border shrink-0">${ml.timing.badge}</span>` : ''}
          </span>
          <span class="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[9px] sm:text-[10px] font-extrabold border border-emerald-500/40 shrink-0 truncate max-w-[200px]">
            ${heavyPercent}% Load on ${getDisplayTeamName(heavyTeam)}
          </span>
        </div>

        <!-- Volume Bar -->
        <div class="space-y-1">
          <div class="w-full h-2 bg-slate-800 rounded-full overflow-hidden flex">
            <div class="bg-blue-500 h-full transition-all" style="width: ${ml.orbitLoad.teamA.percent}%" title="${match.teamA}: ${ml.orbitLoad.teamA.percent}%"></div>
            <div class="bg-orange-500 h-full transition-all" style="width: ${ml.orbitLoad.teamB.percent}%" title="${match.teamB}: ${ml.orbitLoad.teamB.percent}%"></div>
          </div>
          <div class="flex items-center justify-between text-[9px] font-mono text-slate-400">
            <span class="text-blue-400 font-bold truncate max-w-[34%]">${getDisplayTeamName(match.teamA)}: ${ml.orbitLoad.teamA.percent}%</span>
            <span class="text-amber-300 font-bold shrink-0">Odds: ${ml.betfairOdds.teamA.back}/${ml.betfairOdds.teamB.back}</span>
            <span class="text-orange-400 font-bold truncate max-w-[34%] text-right">${getDisplayTeamName(match.teamB)}: ${ml.orbitLoad.teamB.percent}%</span>
          </div>
        </div>

        <!-- 🎯 Direct Toss & Load Advisory Banner -->
        <div class="p-2 rounded-lg ${ml.aiConvergence.isAligned ? 'bg-emerald-950/90 border border-emerald-500/60' : 'bg-amber-950/90 border border-amber-500/60'} flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
          <div class="${ml.aiConvergence.isAligned ? 'text-emerald-300' : 'text-amber-300'} font-bold flex items-center gap-1.5 min-w-0">
            <i class="fa-solid ${ml.aiConvergence.isAligned ? 'fa-circle-check text-emerald-400' : 'fa-triangle-exclamation text-amber-400'} shrink-0"></i> 
            <span class="truncate text-[11px] sm:text-xs">Toss: <strong class="text-white underline">${ml.aiConvergence.isAligned ? 'Model Leans ' + getDisplayTeamName(ml.orbitLoad.heavyTeam) : 'Heavy Load Trap on ' + getDisplayTeamName(ml.orbitLoad.heavyTeam)}</strong></span>
          </div>
          <span class="px-2 py-0.5 rounded-md ${ml.aiConvergence.isAligned ? 'bg-emerald-500 text-slate-950' : 'bg-amber-500 text-slate-950'} text-[9px] sm:text-[10px] font-black uppercase tracking-wider self-start sm:self-auto shrink-0">
            ${ml.aiConvergence.isAligned ? '🎯 STATISTICAL EDGE' : '⚡ CONTRARIAN TRAP'}
          </span>
        </div>

        <!-- 1-Click Direct Exchange Buttons -->
        <div class="grid grid-cols-3 gap-1.5 pt-0.5">
          <a href="https://orbitxch.com/customer/sport/4" target="_blank" rel="noopener noreferrer" class="py-1.5 px-1 rounded-lg bg-blue-950/60 hover:bg-blue-900 border border-blue-500/40 text-blue-300 hover:text-white text-[10px] font-bold text-center flex items-center justify-center gap-1 transition-all" title="Open Orbit Exchange Live">
            🌐 Orbit
          </a>
          <a href="https://www.betfair.com/exchange/plus/cricket" target="_blank" rel="noopener noreferrer" class="py-1.5 px-1 rounded-lg bg-amber-950/60 hover:bg-amber-900 border border-amber-500/40 text-amber-300 hover:text-white text-[10px] font-bold text-center flex items-center justify-center gap-1 transition-all" title="Open Betfair Cricket Market">
            📈 Betfair
          </a>
          <a href="https://www.oddschecker.com/cricket" target="_blank" rel="noopener noreferrer" class="py-1.5 px-1 rounded-lg bg-purple-950/60 hover:bg-purple-900 border border-purple-500/40 text-purple-300 hover:text-white text-[10px] font-bold text-center flex items-center justify-center gap-1 transition-all" title="Open Oddschecker Market Movement">
            🔍 Odds
          </a>
        </div>
      </div>
    `;
  }

  card.innerHTML = `
    <div>
      <!-- Top Header Row -->
      <div class="flex items-center justify-between gap-1.5 sm:gap-2 mb-2 sm:mb-2.5 flex-wrap">
        <div class="flex items-center gap-1.5 sm:gap-2">
          <input type="checkbox" class="match-bulk-checkbox w-4 h-4 rounded bg-slate-900 border-slate-700 text-rose-500 focus:ring-0 cursor-pointer" data-match-key="${matchKey}" data-team-a="${matchTeamA}" data-team-b="${matchTeamB}" data-date="${matchDate}" ${isSelected ? 'checked' : ''}>
          <span class="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700 text-[10px] font-extrabold uppercase">
            ${leagueBadge}
          </span>
        </div>
        <div class="flex items-center gap-1.5">
          ${statusBadge}
          <span class="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700 text-[10px] font-mono font-bold">
            ${match.format || 'T20'}
          </span>
        </div>
      </div>

      <!-- Match Tournament & Venue -->
      <div class="mb-2.5 sm:mb-3">
        <h4 class="text-xs text-slate-400 truncate" title="${match.tournament || ''}">
          ${match.tournament || 'Match Fixture'}
        </h4>
        <p class="text-[11px] text-slate-500 flex items-center gap-1 truncate mt-0.5" title="${match.venue}">
          <i class="fa-solid fa-location-dot text-emerald-400 text-[10px] shrink-0"></i> <span class="truncate">${match.venue}</span>
        </p>
      </div>

      <!-- Teams Row -->
      <div class="space-y-1.5 sm:space-y-2 bg-slate-900/90 p-2.5 sm:p-3 rounded-xl border border-slate-800/80 mb-2.5 sm:mb-3">
        <div class="flex items-center justify-between min-w-0 gap-2">
          <div class="flex items-center gap-2 min-w-0">
            <span class="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-blue-500 shrink-0"></span>
            <span class="text-xs sm:text-sm font-bold text-white truncate" title="${match.teamA}">${match.teamA}</span>
          </div>
          <span class="text-xs font-bold shrink-0 ${isFavA ? 'text-emerald-400 font-mono' : 'text-slate-500'}">
            ${isFavA ? favoredProbability + '% AI Fav' : ''}
          </span>
        </div>

        <div class="flex items-center justify-center text-[10px] font-mono text-slate-500 my-0.5">
          <span>VS</span>
        </div>

        <div class="flex items-center justify-between min-w-0 gap-2">
          <div class="flex items-center gap-2 min-w-0">
            <span class="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-orange-500 shrink-0"></span>
            <span class="text-xs sm:text-sm font-bold text-white truncate" title="${match.teamB}">${match.teamB}</span>
          </div>
          <span class="text-xs font-bold shrink-0 ${isFavB ? 'text-emerald-400 font-mono' : 'text-slate-500'}">
            ${isFavB ? favoredProbability + '% AI Fav' : ''}
          </span>
        </div>
      </div>

      <!-- Timing Strip -->
      <div class="flex items-center justify-between text-xs text-slate-400 px-1">
        <span class="flex items-center gap-1 font-mono text-[11px] sm:text-xs">
          <i class="fa-regular fa-clock text-amber-400 shrink-0"></i> ${match.time}
        </span>
        <span class="text-[10px] sm:text-[11px] font-semibold text-emerald-400">
          🪙 Toss: ${match.tossTime || '30m before'}
        </span>
      </div>

      ${tossVerificationBadge}
      ${marketLoadStrip}
    </div>

    <!-- Bottom Actions Row -->
    <div class="pt-2.5 sm:pt-3 mt-2.5 sm:mt-3 border-t border-slate-800/80 flex items-center justify-between gap-1.5 sm:gap-2">
      <button class="btn-open-analysis flex-1 py-2 px-2.5 sm:px-3 rounded-xl bg-gradient-to-r from-emerald-500/20 to-teal-500/20 hover:from-emerald-500/30 hover:to-teal-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer">
        <i class="fa-solid fa-chart-line"></i> Deep Analysis
      </button>

      <button class="btn-open-edit-toss p-2 min-w-[36px] min-h-[36px] rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all flex items-center justify-center cursor-pointer" title="Update Real Ground Toss Result">
        <i class="fa-solid fa-coins text-yellow-400"></i>
      </button>

      <button class="btn-open-edit-details p-2 min-w-[36px] min-h-[36px] rounded-xl bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 border border-blue-500/40 text-xs font-bold transition-all flex items-center justify-center cursor-pointer" title="Edit Match Details">
        <i class="fa-solid fa-pen-to-square"></i>
      </button>

      <button class="btn-delete-match p-2 min-w-[36px] min-h-[36px] rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/40 text-xs font-bold transition-all flex items-center justify-center cursor-pointer" title="Delete Match">
        <i class="fa-solid fa-trash-can"></i>
      </button>
    </div>
  `;

  // Attach Checkbox event
  const checkbox = card.querySelector('.match-bulk-checkbox');
  checkbox.addEventListener('change', (e) => {
    if (e.target.checked) {
      bulkSelectedMatchesMap.set(matchKey, {
        teamA: matchTeamA,
        teamB: matchTeamB,
        date: matchDate
      });
    } else {
      bulkSelectedMatchesMap.delete(matchKey);
    }
    if (bulkSelectAllCheckbox) {
      const allCbs = document.querySelectorAll('.match-bulk-checkbox');
      bulkSelectAllCheckbox.checked = allCbs.length > 0 && Array.from(allCbs).every(cb => cb.checked);
    }
    updateBulkActionBarUI();
  });

  // Attach Action Button events
  card.querySelector('.btn-open-analysis').addEventListener('click', () => openTossModal(match.teamA, match.teamB, match.venue));
  card.querySelector('.btn-open-edit-toss').addEventListener('click', () => openEditTossModal(match));
  card.querySelector('.btn-open-edit-details').addEventListener('click', () => openEditMatchDetailsModal(match));
  card.querySelector('.btn-delete-match').addEventListener('click', () => deleteSingleMatch(match));

  return card;
}

function updateBulkActionBarUI() {
  if (!bulkActionsBar || !bulkSelectedCount || !btnDeleteSelectedCount) return;
  const count = bulkSelectedMatchesMap.size;
  bulkSelectedCount.textContent = count;
  btnDeleteSelectedCount.textContent = count;

  if (count > 0) {
    bulkActionsBar.classList.remove('hidden');
  } else {
    bulkActionsBar.classList.add('hidden');
  }
}

// Delete Selected Matches (Bulk)
async function deleteSelectedMatches() {
  const count = bulkSelectedMatchesMap.size;
  if (count === 0) return;

  const confirmed = confirm(`Are you sure you want to delete ${count} selected matches?`);
  if (!confirmed) return;

  const matchesToDelete = Array.from(bulkSelectedMatchesMap.values());

  try {
    const res = await fetch('/api/matches/delete-bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matches: matchesToDelete, date: currentDate })
    });
    const result = await res.json();
    if (result.success) {
      bulkSelectedMatchesMap.clear();
      if (bulkSelectAllCheckbox) bulkSelectAllCheckbox.checked = false;
      updateBulkActionBarUI();
      showToast(`${count} matches successfully deleted!`);
      await loadMatches(currentDate, currentLeague);
    }
  } catch (err) {
    console.error('Error deleting bulk matches:', err);
    showToast('Failed to delete selected matches', 'error');
  }
}

// Delete All Matches for Current Date
async function deleteAllMatchesForDate() {
  const confirmed = confirm(`Delete ALL ${loadedMatchesList.length} matches for ${currentDate}?`);
  if (!confirmed) return;

  const matchesToDelete = loadedMatchesList.map(m => ({
    teamA: (m.teamA || '').trim(),
    teamB: (m.teamB || '').trim(),
    date: (m.date || currentDate).trim()
  }));

  try {
    const res = await fetch('/api/matches/delete-bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matches: matchesToDelete, date: currentDate })
    });
    const result = await res.json();
    if (result.success) {
      bulkSelectedMatchesMap.clear();
      if (bulkSelectAllCheckbox) bulkSelectAllCheckbox.checked = false;
      updateBulkActionBarUI();
      showToast(`All matches for ${currentDate} removed.`);
      await loadMatches(currentDate, currentLeague);
    }
  } catch (err) {
    console.error('Error deleting all matches:', err);
    showToast('Failed to delete matches', 'error');
  }
}

// Delete Single Match
async function deleteSingleMatch(match) {
  const cleanA = (match.teamA || '').trim();
  const cleanB = (match.teamB || '').trim();
  const cleanDate = (match.date || currentDate).trim();

  const confirmed = confirm(`Delete ${cleanA} vs ${cleanB} from schedule?`);
  if (!confirmed) return;

  try {
    const res = await fetch('/api/matches/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamA: cleanA, teamB: cleanB, date: cleanDate })
    });
    const result = await res.json();
    if (result.success) {
      removeVaultMatch(cleanA, cleanB, cleanDate);
      const matchKey = `${cleanA}_${cleanB}_${cleanDate}`.toLowerCase();
      bulkSelectedMatchesMap.delete(matchKey);
      if (bulkSelectAllCheckbox) {
        const allCbs = document.querySelectorAll('.match-bulk-checkbox');
        bulkSelectAllCheckbox.checked = allCbs.length > 0 && Array.from(allCbs).every(cb => cb.checked);
      }
      updateBulkActionBarUI();
      showToast(`Match ${cleanA} vs ${cleanB} deleted`);
      await loadMatches(currentDate, currentLeague);
    }
  } catch (err) {
    console.error('Error deleting match:', err);
    showToast('Failed to delete match', 'error');
  }
}

// Add Custom Match Modal
async function saveCustomMatch() {
  const teamA = addMatchTeamA ? addMatchTeamA.value.trim() : '';
  const teamB = addMatchTeamB ? addMatchTeamB.value.trim() : '';
  const time = addMatchTime ? addMatchTime.value.trim() : '07:30 PM IST';
  const league = addMatchLeague ? addMatchLeague.value : 'dehradun_t20';
  const venue = addMatchVenue ? addMatchVenue.value.trim() : 'International Cricket Stadium';
  const date = (addMatchDate && addMatchDate.value && addMatchDate.value.trim()) ? addMatchDate.value.trim() : currentDate;

  if (!teamA || !teamB) {
    alert('Please provide both Team 1 and Team 2 names');
    return;
  }

  try {
    const matchPayload = { teamA, teamB, time, league, venue, date, tournament: `${teamA} vs ${teamB} Match` };
    const res = await fetch('/api/matches/add-custom', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(matchPayload)
    });
    const result = await res.json();
    if (result.success) {
      saveVaultMatch(matchPayload);
      if (addMatchModal) addMatchModal.classList.add('hidden');
      showToast(`Match ${teamA} vs ${teamB} added!`);

      // 1. Reset league filter to 'all' so new match is immediately visible in schedule
      if (currentLeague !== 'all') {
        currentLeague = 'all';
        if (leagueFilter) leagueFilter.value = 'all';
      }

      // 2. If viewing Toss Done tab, switch to Toss Pending so the new upcoming match is immediately visible
      if (currentTossStatus === 'done') {
        currentTossStatus = 'pending';
        updateTossStatusFilterUI();
      }

      // 3. Clear modal inputs for clean next addition
      if (addMatchTeamA) addMatchTeamA.value = '';
      if (addMatchTeamB) addMatchTeamB.value = '';
      if (addMatchVenue) addMatchVenue.value = '';

      // 4. Reload schedule for target date
      if (date === currentDate) {
        await loadMatches(currentDate, currentLeague);
      } else {
        setDate(date);
      }
    }
  } catch (err) {
    console.error('Error adding custom match:', err);
    showToast('Failed to add custom match', 'error');
  }
}

// Edit Match Details Modal
function openEditMatchDetailsModal(match) {
  if (editDetailsOrigTeamA) editDetailsOrigTeamA.value = match.teamA;
  if (editDetailsOrigTeamB) editDetailsOrigTeamB.value = match.teamB;
  if (editDetailsOrigDate) editDetailsOrigDate.value = match.date || currentDate;

  if (editDetailsTeamA) editDetailsTeamA.value = match.teamA;
  if (editDetailsTeamB) editDetailsTeamB.value = match.teamB;
  if (editDetailsTime) editDetailsTime.value = match.time || '07:30 PM IST';
  if (editDetailsLeague) editDetailsLeague.value = match.league || 'all';
  if (editDetailsVenue) editDetailsVenue.value = match.venue || 'International Cricket Stadium';

  if (editMatchDetailsModal) editMatchDetailsModal.classList.remove('hidden');
}

async function saveEditedMatchDetails() {
  const origTeamA = editDetailsOrigTeamA.value;
  const origTeamB = editDetailsOrigTeamB.value;
  const origDate = editDetailsOrigDate.value;

  const teamA = editDetailsTeamA.value.trim();
  const teamB = editDetailsTeamB.value.trim();
  const time = editDetailsTime.value.trim();
  const league = editDetailsLeague.value;
  const venue = editDetailsVenue.value.trim();

  if (!teamA || !teamB) {
    alert('Please provide valid Team 1 and Team 2 names');
    return;
  }

  try {
    const res = await fetch('/api/matches/edit-details', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        originalTeamA: origTeamA,
        originalTeamB: origTeamB,
        originalDate: origDate,
        teamA,
        teamB,
        time,
        league,
        venue,
        tournament: `${teamA} vs ${teamB} Match`
      })
    });
    const result = await res.json();
    if (result.success) {
      if (editMatchDetailsModal) editMatchDetailsModal.classList.add('hidden');
      showToast('Match details updated!');
      await loadMatches(currentDate, currentLeague);
    }
  } catch (err) {
    console.error('Error saving edited match details:', err);
    showToast('Failed to update match details', 'error');
  }
}

// Edit / Update Toss Result Modal
function openEditTossModal(match) {
  if (editTossTeamA) editTossTeamA.value = match.teamA;
  if (editTossTeamB) editTossTeamB.value = match.teamB;
  if (editTossDate) editTossDate.value = match.date || currentDate;

  if (editTossMatchTitle) {
    editTossMatchTitle.textContent = `${match.teamA} vs ${match.teamB} (${match.time || '07:30 PM IST'})`;
  }

  if (editTossWinnerSelect) {
    editTossWinnerSelect.innerHTML = `
      <option value="${match.teamA}" ${match.tossWinner === match.teamA ? 'selected' : ''}>${match.teamA} (Team 1)</option>
      <option value="${match.teamB}" ${match.tossWinner === match.teamB ? 'selected' : ''}>${match.teamB} (Team 2)</option>
    `;
  }

  if (editTossDecisionSelect) {
    editTossDecisionSelect.value = match.tossDecision || 'bowl';
  }

  if (editTossModal) editTossModal.classList.remove('hidden');
}

async function saveTossResult() {
  const teamA = editTossTeamA.value;
  const teamB = editTossTeamB.value;
  const date = editTossDate.value || currentDate;
  const tossWinner = editTossWinnerSelect.value;
  const tossDecision = editTossDecisionSelect.value;

  try {
    const res = await fetch('/api/matches/update-toss', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamA, teamB, date, tossWinner, tossDecision })
    });
    const result = await res.json();
    if (result.success) {
      if (editTossModal) editTossModal.classList.add('hidden');
      showToast(`${tossWinner} won the toss! Moved to Toss Done.`);
      await loadMatches(currentDate, currentLeague);
    }
  } catch (err) {
    console.error('Error saving toss result:', err);
    showToast('Failed to update toss result', 'error');
  }
}

async function resetTossToPending() {
  const teamA = editTossTeamA.value;
  const teamB = editTossTeamB.value;
  const date = editTossDate.value || currentDate;

  try {
    const res = await fetch('/api/matches/reset-toss', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamA, teamB, date })
    });
    const result = await res.json();
    if (result.success) {
      if (editTossModal) editTossModal.classList.add('hidden');
      showToast('Match moved back to Toss Pending (Upcoming).');
      await loadMatches(currentDate, currentLeague);
    }
  } catch (err) {
    console.error('Error resetting toss:', err);
    showToast('Failed to reset toss', 'error');
  }
}

// ----------------------------------------------------
// TAB 2: LIVE MARKET LOAD & EXCHANGE INTELLIGENCE CENTER
// ----------------------------------------------------
async function loadMarketLoadCenter() {
  if (marketLoadDateDisplay) marketLoadDateDisplay.textContent = currentDate;

  try {
    // 1. Fetch top loaded teams
    const topRes = await fetch(`/api/market-load/top-teams?date=${currentDate}${currentLeague && currentLeague !== 'all' ? '&league=' + currentLeague : ''}`);
    const topData = await topRes.json();
    if (topData.success) {
      topLoadedTeamsData = topData.data || [];
      renderTopLoadedTeams(topLoadedTeamsData);
    }

    // 2. Fetch all match-wise market load breakdowns
    const allRes = await fetch(`/api/market-load/all?date=${currentDate}${currentLeague && currentLeague !== 'all' ? '&league=' + currentLeague : ''}`);
    const allData = await allRes.json();
    if (allData.success) {
      renderMarketLoadMatches(allData.data || []);
    }
  } catch (err) {
    console.error('Error loading market load center:', err);
    showToast('Failed to fetch live market loads', 'error');
  }
}

function renderTopLoadedTeams(topTeams = []) {
  if (!topLoadedTeamsGrid) return;
  topLoadedTeamsGrid.innerHTML = '';

  if (topTeams.length === 0) {
    topLoadedTeamsGrid.innerHTML = `<div class="col-span-full p-6 text-center text-slate-400 bg-slate-950/60 rounded-xl border border-slate-800">
      No market load recorded for this date. Check tomorrow's fixtures or add a match!
    </div>`;
    return;
  }

  topTeams.slice(0, 6).forEach((item, index) => {
    const card = document.createElement('div');
    card.className = 'glass-card bg-slate-900/90 rounded-2xl p-4 border border-emerald-500/30 hover:border-emerald-500/70 transition-all space-y-3 shadow-lg relative';

    const rankBadge = index === 0
      ? '<span class="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-extrabold text-[10px] border border-amber-500/40">👑 #1 WHALE LOAD</span>'
      : `<span class="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-bold text-[10px]">#${index + 1} LOADED</span>`;

    card.innerHTML = `
      <div class="flex items-center justify-between">
        ${rankBadge}
        <span class="text-xs text-emerald-400 font-mono font-bold">${item.trend}</span>
      </div>

      <div>
        <h4 class="text-base font-extrabold text-white font-heading truncate">${item.team}</h4>
        <p class="text-[11px] text-slate-400">vs ${item.opponent}</p>
      </div>

      <div class="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800/80 space-y-1.5">
        <div class="flex items-center justify-between text-xs">
          <span class="text-slate-400">Market Load Share:</span>
          <span class="text-emerald-400 font-mono font-extrabold text-sm">${item.loadShare}%</span>
        </div>
        <div class="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
          <div class="bg-gradient-to-r from-emerald-500 to-teal-400 h-full" style="width: ${item.loadShare}%"></div>
        </div>
        <div class="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-0.5">
          <span>Inflow: <strong class="text-white">${item.volumeInr}</strong></span>
          <span>Total: <strong class="text-slate-300">${item.totalMatchedInr}</strong></span>
        </div>
      </div>

      <div class="pt-1 flex items-center justify-between text-[11px]">
        <span class="text-emerald-300 font-semibold">${item.aiConvergence}</span>
        <a href="https://orbitxch.com/customer/sport/4" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1">
          Orbit ➔
        </a>
      </div>
    `;

    topLoadedTeamsGrid.appendChild(card);
  });
}

function renderMarketLoadMatches(marketLoads = []) {
  if (!marketLoadMatchesGrid) return;
  marketLoadMatchesGrid.innerHTML = '';

  if (marketLoads.length === 0) {
    marketLoadMatchesGrid.innerHTML = `<div class="col-span-full p-8 text-center text-slate-400 bg-slate-950/60 rounded-xl border border-slate-800">
      No matches found to compute exchange loads. Try another date from the picker.
    </div>`;
    return;
  }

  marketLoads.forEach(ml => {
    const card = document.createElement('div');
    card.className = 'glass-card bg-[#0d1424] rounded-2xl p-5 border border-slate-800 hover:border-emerald-500/50 transition-all space-y-4 shadow-xl';

    const isAligned = ml.aiConvergence.isAligned;
    const convergenceBadge = isAligned
      ? `<span class="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black uppercase tracking-wider">🎯 STATISTICAL CONSENSUS</span>`
      : `<span class="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-black uppercase tracking-wider">⚡ CONTRARIAN LOAD TRAP ALERT</span>`;

    card.innerHTML = `
      <!-- Card Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-2 mb-1">
            ${convergenceBadge}
            <span class="text-[10px] text-slate-400 font-mono">${ml.time}</span>
          </div>
          <h4 class="text-base font-extrabold text-white font-heading truncate">
            ${ml.teamA} <span class="text-slate-500 font-normal">vs</span> ${ml.teamB}
          </h4>
        </div>
        <div class="text-left sm:text-right shrink-0">
          <span class="text-[10px] text-slate-400 block">Total Matched Liquidity</span>
          <span class="text-sm font-extrabold text-emerald-400 font-mono">${ml.totalMatchedInr} (${ml.totalMatchedGbp})</span>
        </div>
      </div>

      <!-- 4-Quadrant Exchange Intelligence Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        
        <!-- A. Orbit Exchange Matched Volume -->
        <div class="p-3 rounded-xl bg-slate-950/70 border border-blue-500/30 space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-blue-400 font-bold uppercase tracking-wider text-[10px] flex items-center gap-1">
              <i class="fa-solid fa-globe"></i> A. Orbit Volume Share
            </span>
            <span class="text-[10px] text-slate-400 font-mono">Matched Flow</span>
          </div>
          <div class="space-y-1">
            <div class="flex justify-between text-[11px] font-bold gap-2">
              <span class="text-blue-300 truncate min-w-0">${ml.teamA}: ${ml.orbitLoad.teamA.percent}% (${ml.orbitLoad.teamA.volumeInr})</span>
              <span class="text-orange-300 truncate min-w-0 text-right">${ml.teamB}: ${ml.orbitLoad.teamB.percent}% (${ml.orbitLoad.teamB.volumeInr})</span>
            </div>
            <div class="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden flex">
              <div class="bg-blue-500 h-full" style="width: ${ml.orbitLoad.teamA.percent}%"></div>
              <div class="bg-orange-500 h-full" style="width: ${ml.orbitLoad.teamB.percent}%"></div>
            </div>
            <p class="text-[10px] text-emerald-400 font-semibold pt-0.5 truncate">
              🔥 Heavy Load Side: <strong>${ml.orbitLoad.heavyTeam} (${ml.orbitLoad.heavyPercent}%)</strong>
            </p>
          </div>
        </div>

        <!-- B. Betfair Back/Lay Odds & Depth -->
        <div class="p-3 rounded-xl bg-slate-950/70 border border-amber-500/30 space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-amber-400 font-bold uppercase tracking-wider text-[10px] flex items-center gap-1">
              <i class="fa-solid fa-chart-line"></i> B. Betfair Back/Lay Odds
            </span>
            <span class="text-[10px] text-slate-400 font-mono">Depth: ${ml.betfairOdds.spread}</span>
          </div>
          <div class="grid grid-cols-2 gap-2 text-center">
            <div class="p-1.5 rounded-lg bg-slate-900 border border-slate-800">
              <span class="text-[10px] text-slate-400 block truncate">${ml.teamA}</span>
              <span class="text-xs font-mono font-extrabold text-blue-400">Back ${ml.betfairOdds.teamA.back}</span>
              <span class="text-[10px] font-mono text-slate-500 block">Lay ${ml.betfairOdds.teamA.lay}</span>
            </div>
            <div class="p-1.5 rounded-lg bg-slate-900 border border-slate-800">
              <span class="text-[10px] text-slate-400 block truncate">${ml.teamB}</span>
              <span class="text-xs font-mono font-extrabold text-orange-400">Back ${ml.betfairOdds.teamB.back}</span>
              <span class="text-[10px] font-mono text-slate-500 block">Lay ${ml.betfairOdds.teamB.lay}</span>
            </div>
          </div>
        </div>

        <!-- C. Oddschecker Steam vs Drift -->
        <div class="p-3 rounded-xl bg-slate-950/70 border border-purple-500/30 space-y-1.5">
          <div class="flex items-center justify-between">
            <span class="text-purple-400 font-bold uppercase tracking-wider text-[10px] flex items-center gap-1">
              <i class="fa-solid fa-bolt"></i> C. Oddschecker Movement
            </span>
            <span class="text-[10px] text-purple-300 font-mono font-bold">Smart Money</span>
          </div>
          <div class="space-y-1 text-[11px]">
            <div class="flex justify-between gap-2">
              <span class="text-slate-300 truncate min-w-0">${ml.teamA}:</span>
              <span class="font-bold shrink-0 ${ml.oddscheckerTrend.teamA.direction === 'steam' ? 'text-blue-400' : 'text-rose-400'}">${ml.oddscheckerTrend.teamA.movement}</span>
            </div>
            <div class="flex justify-between gap-2">
              <span class="text-slate-300 truncate min-w-0">${ml.teamB}:</span>
              <span class="font-bold shrink-0 ${ml.oddscheckerTrend.teamB.direction === 'steam' ? 'text-blue-400' : 'text-rose-400'}">${ml.oddscheckerTrend.teamB.movement}</span>
            </div>
          </div>
        </div>

        <!-- D. Asian Exchanges & Bookmaker Liabilities -->
        <div class="p-3 rounded-xl bg-slate-950/70 border border-teal-500/30 space-y-1.5">
          <div class="flex items-center justify-between">
            <span class="text-teal-400 font-bold uppercase tracking-wider text-[10px] flex items-center gap-1">
              <i class="fa-solid fa-shield-halved"></i> D. Bookmaker Liabilities
            </span>
            <span class="text-[10px] text-teal-300 font-mono">Asian Books</span>
          </div>
          <p class="text-[11px] text-slate-300 leading-snug">
            <strong>Liability Risk:</strong> ${ml.asianBookmakers.liabilityRisk}
          </p>
          <p class="text-[10px] text-slate-400">
            Sentiment: <strong class="text-white">${ml.asianBookmakers.sentiment}</strong>
          </p>
        </div>

      </div>

      <!-- Verdict Banner -->
      <div class="p-3 rounded-xl ${isAligned ? 'bg-emerald-950/40 border border-emerald-500/50' : 'bg-amber-950/40 border border-amber-500/50'} text-xs space-y-1">
        <div class="flex flex-wrap items-center justify-between gap-1 font-bold">
          <span class="${isAligned ? 'text-emerald-300' : 'text-amber-300'} flex items-center gap-1.5">
            <i class="fa-solid fa-brain"></i> AI + Market Consensus Verdict:
          </span>
          <span class="${isAligned ? 'text-emerald-400' : 'text-amber-400'} font-mono">${ml.aiConvergence.rating}</span>
        </div>
        <p class="text-[11px] text-slate-300 leading-relaxed">
          ${ml.aiConvergence.verdict.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-bold">$1</strong>')}
        </p>
      </div>

      <!-- Direct 1-Click Launchers -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
        <a href="https://orbitxch.com/customer/sport/4" target="_blank" rel="noopener noreferrer" class="py-2 px-2.5 rounded-xl bg-blue-950/80 hover:bg-blue-900 border border-blue-500/40 text-blue-200 text-xs font-bold text-center flex items-center justify-center gap-1.5 transition-all">
          <i class="fa-solid fa-globe"></i> Orbit Live
        </a>
        <a href="https://www.betfair.com/exchange/plus/cricket" target="_blank" rel="noopener noreferrer" class="py-2 px-2.5 rounded-xl bg-amber-950/80 hover:bg-amber-900 border border-amber-500/40 text-amber-200 text-xs font-bold text-center flex items-center justify-center gap-1.5 transition-all">
          <i class="fa-solid fa-chart-line"></i> Betfair
        </a>
        <a href="https://www.oddschecker.com/cricket" target="_blank" rel="noopener noreferrer" class="py-2 px-2.5 rounded-xl bg-purple-950/80 hover:bg-purple-900 border border-purple-500/40 text-purple-200 text-xs font-bold text-center flex items-center justify-center gap-1.5 transition-all">
          <i class="fa-solid fa-bolt"></i> Oddschecker
        </a>
        <a href="https://www.cricbuzz.com/cricket-match/live-scores" target="_blank" rel="noopener noreferrer" class="py-2 px-2.5 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-200 text-xs font-bold text-center flex items-center justify-center gap-1.5 transition-all">
          <i class="fa-solid fa-trophy"></i> Live Scores
        </a>
      </div>
    `;

    marketLoadMatchesGrid.appendChild(card);
  });
}

// ----------------------------------------------------
// TAB 3: CUSTOM TOSS PREDICTOR & MATCH SANDBOX
// ----------------------------------------------------
async function runSimulation() {
  const teamA = simTeamAInput ? simTeamAInput.value.trim() : 'Aries Kollam Sailors';
  const teamB = simTeamBInput ? simTeamBInput.value.trim() : 'Thrissur Titans';
  const venue = simVenueInput ? simVenueInput.value.trim() : 'Greenfield International Stadium, Thiruvananthapuram';

  if (!teamA || !teamB) {
    alert('Please enter both Team 1 and Team 2');
    return;
  }

  if (runSimBtn) {
    runSimBtn.disabled = true;
    runSimBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-lg"></i> Calculating AI Toss Edge & Market Load...';
  }

  try {
    const res = await fetch(`/api/analysis?teamA=${encodeURIComponent(teamA)}&teamB=${encodeURIComponent(teamB)}&venue=${encodeURIComponent(venue)}`);
    const data = await res.json();

    if (data.success) {
      renderSimulationResult(data.analysis, data.marketLoad, teamA, teamB, venue);
    }
  } catch (err) {
    console.error('Simulation error:', err);
    showToast('Failed to calculate toss simulation', 'error');
  } finally {
    if (runSimBtn) {
      runSimBtn.disabled = false;
      runSimBtn.innerHTML = '<i class="fa-solid fa-coins text-lg"></i> Calculate Toss Win Chances & Deep Analysis';
    }
  }
}

function renderSimulationResult(analysis, marketLoad, teamA, teamB, venue) {
  if (!simResultContainer) return;

  const pred = analysis.prediction || {};
  const winner = pred.favoredWinner || teamA;
  const prob = pred.favoredProbability || 78;
  const decision = pred.likelyDecision || 'Bowl / Field First';
  const insights = pred.insights || [];

  const ml = marketLoad || {};
  const isAligned = ml.aiConvergence ? ml.aiConvergence.isAligned : true;

  simResultContainer.innerHTML = `
    <div class="glass-panel rounded-2xl p-4 sm:p-8 border border-slate-800 shadow-2xl space-y-5 sm:space-y-6">
      
      <!-- Top Prediction Banner -->
      <div class="bg-gradient-to-r from-emerald-950/60 via-slate-900 to-teal-950/60 p-4 sm:p-6 rounded-2xl border-2 border-emerald-500/60 text-center relative overflow-hidden shadow-xl">
        <div class="flex flex-wrap items-center justify-center gap-2 mb-2">
          <span class="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] sm:text-xs font-black uppercase tracking-wider">
            AI TOSS WINNER FORECAST
          </span>
          ${isAligned ? '<span class="px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40 text-[10px] sm:text-xs font-black uppercase tracking-wider">MARKET ALIGNED 🎯</span>' : ''}
        </div>

        <h3 class="text-xl sm:text-3xl md:text-4xl font-extrabold text-white font-heading my-2 break-words">
          🪙 Favored Toss Winner: <span class="text-emerald-400">${winner}</span>
        </h3>

        <div class="flex flex-wrap items-center justify-center gap-2 sm:gap-4 mt-3 font-mono text-xs sm:text-sm">
          <span class="px-3 py-1.5 rounded-xl bg-slate-950/80 border border-emerald-500/40 text-emerald-300 font-bold">
            🎯 Probability: <strong class="text-white text-sm sm:text-base">${prob}%</strong>
          </span>
          <span class="px-3 py-1.5 rounded-xl bg-slate-950/80 border border-amber-500/40 text-amber-300 font-bold">
            🏏 Likely Decision: <strong class="text-white text-sm sm:text-base">${decision}</strong>
          </span>
        </div>
      </div>

      <!-- Simulated Exchange Market Load Breakdown -->
      ${ml.orbitLoad ? `
        <div class="p-4 sm:p-5 rounded-2xl bg-slate-950/90 border border-blue-500/40 space-y-3">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <h4 class="text-xs sm:text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <i class="fa-solid fa-chart-pie text-blue-400"></i> Simulated Orbit & Betfair Market Load
            </h4>
            <span class="text-xs text-emerald-400 font-mono font-bold">Estimated Matched: ${ml.totalMatchedInr}</span>
          </div>

          <div class="space-y-1.5">
            <div class="flex justify-between text-xs font-bold gap-2">
              <span class="text-blue-400 truncate min-w-0">${teamA}: ${ml.orbitLoad.teamA.percent}% (${ml.betfairOdds.teamA.back} Odds)</span>
              <span class="text-orange-400 truncate min-w-0 text-right">${teamB}: ${ml.orbitLoad.teamB.percent}% (${ml.betfairOdds.teamB.back} Odds)</span>
            </div>
            <div class="w-full h-3 bg-slate-800 rounded-full overflow-hidden flex">
              <div class="bg-blue-500 h-full" style="width: ${ml.orbitLoad.teamA.percent}%"></div>
              <div class="bg-orange-500 h-full" style="width: ${ml.orbitLoad.teamB.percent}%"></div>
            </div>
          </div>

          <p class="text-xs text-slate-300 leading-relaxed pt-1">
            ${ml.aiConvergence.verdict.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-bold">$1</strong>')}
          </p>
        </div>
      ` : ''}

      <!-- Detailed AI Factors & Insights -->
      <div class="space-y-3">
        <h4 class="text-xs sm:text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <i class="fa-solid fa-lightbulb text-yellow-400"></i> AI Ground & Historical Factors
        </h4>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          ${insights.map(item => `
            <div class="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 leading-relaxed flex items-start gap-2.5">
              <i class="fa-solid fa-check text-emerald-400 mt-0.5 shrink-0"></i>
              <span>${item.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-bold">$1</strong>')}</span>
            </div>
          `).join('')}
        </div>
      </div>

    </div>
  `;
}

// ----------------------------------------------------
// TAB 4: OVERALL TOSS LEADERBOARD
// ----------------------------------------------------
async function loadLeaderboard() {
  const league = leaderboardLeagueFilter ? leaderboardLeagueFilter.value : 'all';
  try {
    const res = await fetch(`/api/leaderboard?league=${league}`);
    const data = await res.json();
    if (data.success) {
      leaderboardData = data.leaderboard || [];
      if (leaderboardTotalCount) leaderboardTotalCount.textContent = leaderboardData.length;
      filterAndRenderLeaderboard();
    }
  } catch (err) {
    console.error('Error loading leaderboard:', err);
  }
}

function filterAndRenderLeaderboard() {
  if (!leaderboardTbody) return;
  leaderboardTbody.innerHTML = '';

  const query = (leaderboardSearch ? leaderboardSearch.value : '').toLowerCase().trim();
  const filtered = leaderboardData.filter(item => {
    return item.team.toLowerCase().includes(query) ||
           (item.captain && item.captain.toLowerCase().includes(query)) ||
           (item.league && item.league.toLowerCase().includes(query));
  });

  if (filtered.length === 0) {
    leaderboardTbody.innerHTML = `<tr><td colspan="9" class="text-center py-8 text-slate-400">No teams matched your filter.</td></tr>`;
    return;
  }

  filtered.forEach((item, index) => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-800/40 transition-colors text-xs sm:text-sm';

    const rankBadge = index < 3
      ? `<span class="w-6 h-6 rounded-full bg-yellow-500/20 text-yellow-300 font-bold flex items-center justify-center text-xs">#${index + 1}</span>`
      : `<span class="text-slate-400 font-mono pl-2">#${index + 1}</span>`;

    const winRateColor = item.tossWinRate >= 60
      ? 'text-emerald-400 font-extrabold'
      : (item.tossWinRate >= 45 ? 'text-amber-300 font-bold' : 'text-slate-400');

    tr.innerHTML = `
      <td class="py-3 px-4">${rankBadge}</td>
      <td class="py-3 px-4">
        <span class="font-bold text-white block">${item.team}</span>
        <span class="text-[11px] text-slate-400">Captain: ${item.captain || 'N/A'}</span>
      </td>
      <td class="py-3 px-4">
        <span class="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[10px] font-bold uppercase">${item.league || 'T20'}</span>
      </td>
      <td class="py-3 px-4 text-center font-mono font-bold">${item.matchesPlayed}</td>
      <td class="py-3 px-4 text-center font-mono text-emerald-400 font-bold">${item.tossesWon}</td>
      <td class="py-3 px-4 text-center font-mono text-rose-400 font-bold">${item.tossesLost}</td>
      <td class="py-3 px-4 text-center font-mono ${winRateColor} text-base">${item.tossWinRate}%</td>
      <td class="py-3 px-4 text-center font-mono text-slate-300">${item.choseBat}</td>
      <td class="py-3 px-4 text-center font-mono text-slate-300">${item.choseBowl}</td>
    `;

    leaderboardTbody.appendChild(tr);
  });
}

// ----------------------------------------------------
// DEEP TOSS ANALYSIS MODAL
// ----------------------------------------------------
async function openTossModal(teamA, teamB, venue) {
  if (!tossModal || !modalContent) return;
  tossModal.classList.remove('hidden');

  modalContent.innerHTML = `
    <div class="text-center py-12">
      <i class="fa-solid fa-spinner fa-spin text-3xl text-emerald-400 mb-3"></i>
      <p class="text-sm font-bold text-white">Loading Deep Toss & Exchange Intelligence...</p>
    </div>
  `;

  try {
    const res = await fetch(`/api/analysis?teamA=${encodeURIComponent(teamA)}&teamB=${encodeURIComponent(teamB)}&venue=${encodeURIComponent(venue || '')}`);
    const data = await res.json();
    if (data.success) {
      renderDeepDiveTossModal(data.analysis, data.marketLoad, teamA, teamB, venue);
    }
  } catch (err) {
    console.error('Error in deep toss modal:', err);
    modalContent.innerHTML = `<p class="text-rose-400 p-6 text-center">Failed to load detailed analysis.</p>`;
  }
}

function renderDeepDiveTossModal(analysis, marketLoad, teamA, teamB, venue) {
  const pred = analysis.prediction || {};
  const favoredWinner = pred.favoredWinner || teamA;
  const prob = pred.favoredProbability || 75;
  const decision = pred.likelyDecision || 'Bowl / Field First';
  const insights = pred.insights || [];
  const h2h = analysis.headToHead || {};
  const venueStats = analysis.venueStats || {};
  const ml = marketLoad || {};

  modalContent.innerHTML = `
    <div class="space-y-5 sm:space-y-6">
      <!-- Modal Header -->
      <div class="border-b border-slate-800 pb-4 pr-10 sm:pr-12">
        <div class="flex flex-wrap items-center gap-2 mb-1">
          <span class="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-extrabold uppercase tracking-wider shrink-0">
            DEEP GROUND & MARKET ANALYSIS
          </span>
          <span class="text-xs text-slate-400 font-mono truncate max-w-[200px] sm:max-w-none">${venue}</span>
        </div>
        <h2 class="text-xl sm:text-2xl md:text-3xl font-extrabold text-white font-heading break-words">
          ${teamA} <span class="text-slate-500 font-normal">vs</span> ${teamB}
        </h2>
      </div>

      <!-- Top Result Callout -->
      <div class="bg-gradient-to-r from-emerald-950/60 via-slate-900 to-teal-950/60 p-4 sm:p-6 rounded-2xl border-2 border-emerald-500/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
        <div class="min-w-0 w-full sm:w-auto">
          <span class="text-xs text-emerald-300 font-bold uppercase tracking-wider block mb-1">AI Toss Pick:</span>
          <h3 class="text-xl sm:text-2xl md:text-3xl font-extrabold text-white font-heading break-words">${favoredWinner}</h3>
          <p class="text-xs text-slate-300 mt-1">Expected Toss Decision: <strong class="text-amber-300">${decision}</strong></p>
        </div>
        <div class="flex items-center gap-3 self-end sm:self-auto shrink-0">
          <div class="text-center p-2.5 sm:p-3 rounded-xl bg-slate-950/80 border border-emerald-500/40">
            <span class="text-[10px] text-slate-400 block uppercase font-bold">Confidence</span>
            <span class="text-xl sm:text-2xl font-black text-emerald-400 font-mono">${prob}%</span>
          </div>
        </div>
      </div>

      <!-- Exchange Market Load Strip in Modal -->
      ${ml.orbitLoad ? `
        <div class="p-4 rounded-2xl bg-slate-950/90 border border-blue-500/40 space-y-2.5">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
            <span class="text-blue-400 font-bold flex items-center gap-1.5 uppercase tracking-wider">
              <i class="fa-solid fa-chart-pie"></i> Orbit & Betfair Live Market Load
            </span>
            <span class="text-emerald-400 font-mono font-bold">Total Matched: ${ml.totalMatchedInr}</span>
          </div>

          <div class="space-y-1">
            <div class="flex justify-between text-xs font-bold font-mono gap-2">
              <span class="text-blue-400 truncate min-w-0">${teamA}: ${ml.orbitLoad.teamA.percent}% (${ml.betfairOdds.teamA.back} Odds)</span>
              <span class="text-orange-400 truncate min-w-0 text-right">${teamB}: ${ml.orbitLoad.teamB.percent}% (${ml.betfairOdds.teamB.back} Odds)</span>
            </div>
            <div class="w-full h-3 bg-slate-800 rounded-full overflow-hidden flex">
              <div class="bg-blue-500 h-full" style="width: ${ml.orbitLoad.teamA.percent}%"></div>
              <div class="bg-orange-500 h-full" style="width: ${ml.orbitLoad.teamB.percent}%"></div>
            </div>
          </div>

          <div class="grid grid-cols-3 gap-2 pt-1">
            <a href="https://orbitxch.com/customer/sport/4" target="_blank" rel="noopener noreferrer" class="py-1.5 px-2 rounded-xl bg-blue-950/80 hover:bg-blue-900 border border-blue-500/40 text-blue-200 text-[11px] sm:text-xs font-bold text-center flex items-center justify-center gap-1 truncate">
              <i class="fa-solid fa-globe shrink-0"></i> <span class="truncate">Orbit Live</span>
            </a>
            <a href="https://www.betfair.com/exchange/plus/cricket" target="_blank" rel="noopener noreferrer" class="py-1.5 px-2 rounded-xl bg-amber-950/80 hover:bg-amber-900 border border-amber-500/40 text-amber-200 text-[11px] sm:text-xs font-bold text-center flex items-center justify-center gap-1 truncate">
              <i class="fa-solid fa-chart-line shrink-0"></i> <span class="truncate">Betfair</span>
            </a>
            <a href="https://www.oddschecker.com/cricket" target="_blank" rel="noopener noreferrer" class="py-1.5 px-2 rounded-xl bg-purple-950/80 hover:bg-purple-900 border border-purple-500/40 text-purple-200 text-[11px] sm:text-xs font-bold text-center flex items-center justify-center gap-1 truncate">
              <i class="fa-solid fa-bolt shrink-0"></i> <span class="truncate">Oddschecker</span>
            </a>
          </div>
        </div>
      ` : ''}

      <!-- Insights List -->
      <div class="space-y-2.5">
        <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider">AI Calculation Factors:</h4>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          ${insights.map(i => `
            <div class="p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-300 leading-relaxed flex items-start gap-2">
              <i class="fa-solid fa-circle-check text-emerald-400 mt-0.5 shrink-0 text-xs"></i>
              <span>${i.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-bold">$1</strong>')}</span>
            </div>
          `).join('')}
        </div>
      </div>

    </div>
  `;
}

// =============================================================================
// TELEGRAM BET LIVE CHANNEL MONITOR & USER BET ALERTS SUBSYSTEM
// Channel: @BetfairTossbookOrignal (https://web.telegram.org/k/#@BetfairTossbookOrignal)
// =============================================================================

let tgTrackedUsers = []; // array of lowercase strings e.g. ['btb1648', 'vip7186']
let tgSoundChoice = 'bell';
let tgFilterType = 'bets_only';
let tgKnownPostIds = new Set();
let tgPollTimer = null;
let tgIsInitialLoad = true;
let tgActivePunters = new Set();
let tgLatestBets = [];

// DOM Elements for TeleGramBet
const tgFilterUsersInput = document.getElementById('tg-filter-users');
const tgBtnSaveUsers = document.getElementById('tg-btn-save-users');
const tgBtnClearUsers = document.getElementById('tg-btn-clear-users');
const tgHideOtherUsersCheckbox = document.getElementById('tg-hide-other-users');
const tgToggleChipsBtn = document.getElementById('tg-toggle-chips-btn');
const tgChipsWrapper = document.getElementById('tg-chips-wrapper');
const tgChipsToggleText = document.getElementById('tg-chips-toggle-text');
const tgFilterTypeSelect = document.getElementById('tg-filter-type');
const tgSoundSelect = document.getElementById('tg-sound-select');
const tgSoundTestBtn = document.getElementById('tg-sound-test-btn');
const tgBtnRequestPerm = document.getElementById('tg-btn-request-permission');
const tgPermBtnText = document.getElementById('tg-perm-btn-text');
const tgBtnTestAlert = document.getElementById('tg-btn-test-alert');
const tgBtnRefresh = document.getElementById('tg-btn-refresh');
const tgBetsContainer = document.getElementById('tg-bets-container');
const tgEmptyState = document.getElementById('tg-empty-state');
const tgFeedCountBadge = document.getElementById('tg-feed-count-badge');
const tgLastPolledTime = document.getElementById('tg-last-polled-time');
const tgStatusBadge = document.getElementById('tg-status-badge');
const tgActiveTrackLabel = document.getElementById('tg-active-track-label');
const tgActiveTrackName = document.getElementById('tg-active-track-name');
const tgActiveUserChips = document.getElementById('tg-active-user-chips');
const tgBtnClearAllChips = document.getElementById('tg-btn-clear-all-chips');
const tgNewPunterInput = document.getElementById('tg-new-punter-input');
const tgBtnAddPunter = document.getElementById('tg-btn-add-punter');
const tgNavBadge = document.getElementById('tg-nav-badge');

// Cross-tab / Cross-menu notification elements
const tgCrossTabAlert = document.getElementById('tg-cross-tab-alert');
const tgCloseAlertBtn = document.getElementById('tg-close-alert-btn');
const tgAlertUser = document.getElementById('tg-alert-user');
const tgAlertDetails = document.getElementById('tg-alert-details');
const tgAlertTime = document.getElementById('tg-alert-time');
const tgAlertViewBtn = document.getElementById('tg-alert-view-btn');

let tgAudioCtx = null;
let tgOriginalTitle = document.title;
let tgTitleFlashInterval = null;
let tgAlertSlideTimer = null;
let tgWorker = null;

let tgHideOtherUsers = localStorage.getItem('c_toss_tg_hide_other_users') !== 'false'; // Defaults to true
let tgShowChips = localStorage.getItem('c_toss_tg_show_chips') !== 'false';
let tgDismissedPunters = new Set(
  JSON.parse(localStorage.getItem('c_toss_tg_dismissed_punters') || '[]')
);
let tgCustomPunters = new Set(
  JSON.parse(localStorage.getItem('c_toss_tg_custom_punters') || '[]')
);
let tgHideAllPunters = localStorage.getItem('c_toss_tg_hide_all_punters') === 'true';

/**
 * Initialize TeleGramBet Monitoring
 */
function initTelegramBetMonitoring() {
  // Load saved preferences from localStorage
  const savedUsers = localStorage.getItem('c_toss_tg_tracked_users');
  if (savedUsers) {
    tgTrackedUsers = savedUsers.split(',').map(u => u.trim().toLowerCase().replace(/^@/, '')).filter(Boolean);
    if (tgFilterUsersInput) tgFilterUsersInput.value = savedUsers;
  }

  const savedSound = localStorage.getItem('c_toss_tg_sound');
  if (savedSound && tgSoundSelect) {
    tgSoundChoice = savedSound;
    tgSoundSelect.value = savedSound;
  }

  const savedFilterType = localStorage.getItem('c_toss_tg_filter_type');
  if (savedFilterType && tgFilterTypeSelect) {
    tgFilterType = savedFilterType;
    tgFilterTypeSelect.value = savedFilterType;
  }

  if (tgHideOtherUsersCheckbox) {
    tgHideOtherUsersCheckbox.checked = tgHideOtherUsers;
  }

  updateChipsVisibility();
  updateTrackedUserBadge();
  updateNotificationPermissionButton();

  // Initial load
  loadTelegramBets(false);

  // Background Web Worker non-throttled polling (works in background tabs & minimized browser)
  startBackgroundPollingWorker();
}

/**
 * Update chips wrapper visibility
 */
function updateChipsVisibility() {
  if (!tgChipsWrapper || !tgChipsToggleText) return;
  if (tgShowChips) {
    tgChipsWrapper.classList.remove('hidden');
    tgChipsToggleText.textContent = 'Hide Punter ID Chips';
  } else {
    tgChipsWrapper.classList.add('hidden');
    tgChipsToggleText.textContent = 'Show Punter ID Chips';
  }
}

/**
 * Setup Event Listeners for TeleGramBet
 */
function setupTelegramBetListeners() {
  // Cross-Menu Floating Alert Buttons
  if (tgCloseAlertBtn) {
    tgCloseAlertBtn.addEventListener('click', hideCrossMenuBetAlert);
  }

  if (tgAlertViewBtn) {
    tgAlertViewBtn.addEventListener('click', () => {
      hideCrossMenuBetAlert();
      switchTab('telegram-bet');
    });
  }

  // Window focus resets title flash
  window.addEventListener('focus', () => {
    stopTitleFlash();
  });

  // Global click anywhere unlocks AudioContext for background tabs
  document.addEventListener('click', () => {
    unlockAudioContext();
  });

  // Save Tracked Users
  if (tgBtnSaveUsers) {
    tgBtnSaveUsers.addEventListener('click', () => {
      saveTrackedUsersFromInput();
    });
  }

  // Clear Tracked Users (Show All)
  if (tgBtnClearUsers) {
    tgBtnClearUsers.addEventListener('click', () => {
      if (tgFilterUsersInput) tgFilterUsersInput.value = '';
      saveTrackedUsersFromInput();
      showToast('🧹 Filter cleared - Showing all channel updates', 'info');
    });
  }

  // Hide / Remove other users checkbox
  if (tgHideOtherUsersCheckbox) {
    tgHideOtherUsersCheckbox.addEventListener('change', (e) => {
      tgHideOtherUsers = e.target.checked;
      localStorage.setItem('c_toss_tg_hide_other_users', tgHideOtherUsers);
      renderTelegramBets(tgLatestBets);
      if (tgHideOtherUsers && tgTrackedUsers.length > 0) {
        showToast('🚫 Baki sabhi users hide kar diye gaye hain (Only tracked user visible)', 'info');
      } else {
        showToast('👁️ All users are now visible in the feed', 'info');
      }
    });
  }

  // Toggle Chips button
  if (tgToggleChipsBtn) {
    tgToggleChipsBtn.addEventListener('click', () => {
      tgShowChips = !tgShowChips;
      localStorage.setItem('c_toss_tg_show_chips', tgShowChips);
      updateChipsVisibility();
    });
  }

  // Remove All Punter IDs
  if (tgBtnClearAllChips) {
    tgBtnClearAllChips.addEventListener('click', () => {
      tgHideAllPunters = true;
      localStorage.setItem('c_toss_tg_hide_all_punters', 'true');
      renderActiveUserChips();
      showToast('🗑️ Active Punter IDs list remove kar di gayi hai', 'info');
    });
  }

  // Add New Custom Punter ID
  if (tgBtnAddPunter) {
    tgBtnAddPunter.addEventListener('click', handleAddNewCustomPunter);
  }
  if (tgNewPunterInput) {
    tgNewPunterInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        handleAddNewCustomPunter();
      }
    });
  }

  if (tgFilterUsersInput) {
    tgFilterUsersInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        saveTrackedUsersFromInput();
      }
    });
  }

  // Filter Type change
  if (tgFilterTypeSelect) {
    tgFilterTypeSelect.addEventListener('change', (e) => {
      tgFilterType = e.target.value;
      localStorage.setItem('c_toss_tg_filter_type', tgFilterType);
      renderTelegramBets(tgLatestBets);
    });
  }

  // Sound Selector
  if (tgSoundSelect) {
    tgSoundSelect.addEventListener('change', (e) => {
      tgSoundChoice = e.target.value;
      localStorage.setItem('c_toss_tg_sound', tgSoundChoice);
      playAlertSound(tgSoundChoice);
    });
  }

  // Sound test button
  if (tgSoundTestBtn) {
    tgSoundTestBtn.addEventListener('click', () => {
      playAlertSound(tgSoundChoice);
    });
  }

  // Notification Permission
  if (tgBtnRequestPerm) {
    tgBtnRequestPerm.addEventListener('click', requestDesktopNotificationPermission);
  }

  // Manual Refresh
  if (tgBtnRefresh) {
    tgBtnRefresh.addEventListener('click', () => {
      loadTelegramBets(true);
      showToast('🔄 Refreshing @BetfairTossbookOrignal feed...', 'info');
    });
  }

  // Test Alert Button (Simulates a live bet from tracked user)
  if (tgBtnTestAlert) {
    tgBtnTestAlert.addEventListener('click', triggerTestBetAlert);
  }
}

/**
 * Save tracked users from input
 */
function saveTrackedUsersFromInput() {
  const raw = tgFilterUsersInput ? tgFilterUsersInput.value.trim() : '';
  if (!raw || raw === '*') {
    tgTrackedUsers = [];
    localStorage.removeItem('c_toss_tg_tracked_users');
    showToast('👁️ Now monitoring ALL bets in @BetfairTossbookOrignal', 'info');
  } else {
    tgTrackedUsers = raw.split(',').map(u => u.trim().toLowerCase().replace(/^@/, '')).filter(Boolean);
    localStorage.setItem('c_toss_tg_tracked_users', raw);
    showToast(`🎯 Tracking target user(s): ${raw}`, 'success');
  }
  updateTrackedUserBadge();
  renderTelegramBets(tgLatestBets);
  renderActiveUserChips();
}

/**
 * Update UI banner showing which user is actively tracked
 */
function updateTrackedUserBadge() {
  if (!tgActiveTrackLabel || !tgActiveTrackName) return;
  if (tgTrackedUsers && tgTrackedUsers.length > 0) {
    tgActiveTrackLabel.classList.remove('hidden');
    const uText = tgTrackedUsers.map(u => u.toUpperCase()).join(', ');
    tgActiveTrackName.innerHTML = `${uText} ${tgHideOtherUsers ? '<span class="text-[10px] ml-1.5 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-normal">🚫 Baki sabhi users removed</span>' : ''}`;
  } else {
    tgActiveTrackLabel.classList.add('hidden');
  }
}

/**
 * Update the Notification permission button state
 */
function updateNotificationPermissionButton() {
  if (!tgBtnRequestPerm || !tgPermBtnText) return;
  if (!('Notification' in window)) {
    tgPermBtnText.textContent = 'Notifications Not Supported';
    tgBtnRequestPerm.disabled = true;
    return;
  }
  if (Notification.permission === 'granted') {
    tgPermBtnText.textContent = 'Desktop Alerts: Active ✅';
    tgBtnRequestPerm.classList.remove('text-emerald-400', 'border-emerald-500/40');
    tgBtnRequestPerm.classList.add('text-sky-300', 'border-sky-500/40', 'bg-sky-500/10');
  } else if (Notification.permission === 'denied') {
    tgPermBtnText.textContent = 'Alerts Blocked in Browser ❌';
    tgBtnRequestPerm.classList.add('text-rose-400', 'border-rose-500/40');
  } else {
    tgPermBtnText.textContent = 'Enable Desktop Push Alerts';
  }
}

/**
 * Request desktop push notification permission
 */
function requestDesktopNotificationPermission() {
  if (!('Notification' in window)) {
    alert('Browser notifications are not supported on this browser.');
    return;
  }
  Notification.requestPermission().then(permission => {
    updateNotificationPermissionButton();
    if (permission === 'granted') {
      showToast('🔔 Browser Push Notifications Enabled!', 'success');
      try {
        new Notification('🏏 BetfairTossbook Alerts Active', {
          body: 'You will be alerted instantly when tracked bets are placed!',
          icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🪙</text></svg>'
        });
      } catch (e) {}
    } else {
      showToast('⚠️ Push notification permission denied in browser.', 'error');
    }
  });
}

/**
 * Web Audio API Alert Sound Synthesizer
 */
function playAlertSound(type = 'bell') {
  if (type === 'mute') return;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    if (type === 'bell') {
      // Crystal bell chime (twin sine harmonic)
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      osc1.type = 'sine';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(880, ctx.currentTime);
      osc2.frequency.setValueAtTime(1760, ctx.currentTime);
      gain.gain.setValueAtTime(0.35, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);
      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + 1.2);
      osc2.stop(ctx.currentTime + 1.2);
    } else if (type === 'chime') {
      // Melodic 4-note arpeggio
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.09);
        gain.gain.setValueAtTime(0.25, ctx.currentTime + idx * 0.09);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.09 + 0.5);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.09);
        osc.stop(ctx.currentTime + idx * 0.09 + 0.5);
      });
    } else if (type === 'radar') {
      // Tech radar ping
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1300, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(650, ctx.currentTime + 0.25);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } else if (type === 'siren') {
      // High urgency siren
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(950, ctx.currentTime + 0.2);
      osc.frequency.linearRampToValueAtTime(600, ctx.currentTime + 0.4);
      osc.frequency.linearRampToValueAtTime(950, ctx.currentTime + 0.6);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.8);
    }
  } catch (err) {
    console.warn('[TeleGramBet] Web Audio error:', err);
  }
}

/**
 * Unlock Web Audio Context on user interaction so audio works in background tabs
 */
function unlockAudioContext() {
  try {
    if (!tgAudioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) tgAudioCtx = new AudioContextClass();
    }
    if (tgAudioCtx && tgAudioCtx.state === 'suspended') {
      tgAudioCtx.resume();
    }
  } catch (e) {}
}

/**
 * Start non-throttled Web Worker background polling (ensures alerts fire even in other browser tabs)
 */
function startBackgroundPollingWorker() {
  if (tgWorker) return;
  try {
    const workerScript = `
      let timer = null;
      self.onmessage = function(e) {
        if (e.data === 'start') {
          if (timer) clearInterval(timer);
          timer = setInterval(function() {
            self.postMessage('poll');
          }, 7000);
        } else if (e.data === 'stop') {
          if (timer) clearInterval(timer);
        }
      };
    `;
    const blob = new Blob([workerScript], { type: 'application/javascript' });
    tgWorker = new Worker(URL.createObjectURL(blob));
    tgWorker.onmessage = function(e) {
      if (e.data === 'poll') {
        loadTelegramBets(false);
      }
    };
    tgWorker.postMessage('start');
  } catch (err) {
    console.warn('[TeleGramBet] Web Worker fallback to window.setInterval:', err);
    if (tgPollTimer) clearInterval(tgPollTimer);
    tgPollTimer = setInterval(() => loadTelegramBets(false), 7000);
  }
}

/**
 * Flash browser tab title when user is on another browser tab
 */
function startTitleFlash(bet) {
  if (tgTitleFlashInterval) clearInterval(tgTitleFlashInterval);
  let toggle = false;
  const user = bet.userName || 'TRACKED USER';
  const sel = bet.teamName || 'TOSS';
  const alertTitle = `🚨 (${user}) BET ON ${sel}!`;

  tgTitleFlashInterval = setInterval(() => {
    document.title = toggle ? alertTitle : '🪙 Betfair Alert! • TossMaster';
    toggle = !toggle;
  }, 850);
}

/**
 * Stop flashing title and restore original title
 */
function stopTitleFlash() {
  if (tgTitleFlashInterval) {
    clearInterval(tgTitleFlashInterval);
    tgTitleFlashInterval = null;
    document.title = tgOriginalTitle || 'TossMaster • Cricket Toss Analyzer & Live Market Load';
  }
}

/**
 * Show rich top-right floating alert when user is on another menu inside the app
 */
function showCrossMenuBetAlert(bet) {
  // 1. Update header nav button badge
  if (tgNavBadge) {
    tgNavBadge.innerHTML = `🚨 NEW BET: ${bet.userName}!`;
    tgNavBadge.className = 'inline-flex items-center ml-1.5 px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-rose-500 text-white border border-rose-400 shadow-lg shadow-rose-500/50 animate-bounce';
  }

  // 2. Show floating alert box
  if (tgCrossTabAlert && tgAlertUser && tgAlertDetails) {
    tgAlertUser.textContent = bet.userName || 'Tracked User';
    tgAlertDetails.innerHTML = `Selection: <span class="text-emerald-400 font-extrabold">${bet.teamName || 'Toss'}</span> • Amount: <span class="text-amber-400 font-extrabold">${bet.amount || 'N/A'}</span>`;
    if (tgAlertTime) tgAlertTime.textContent = bet.displayTime || 'Just now';

    tgCrossTabAlert.classList.remove('translate-x-full', 'opacity-0');
    tgCrossTabAlert.classList.add('translate-x-0', 'opacity-100');

    if (tgAlertSlideTimer) clearTimeout(tgAlertSlideTimer);
    tgAlertSlideTimer = setTimeout(() => {
      hideCrossMenuBetAlert();
    }, 15000); // Visible for 15s
  }
}

/**
 * Hide rich top-right floating alert
 */
function hideCrossMenuBetAlert() {
  if (!tgCrossTabAlert) return;
  tgCrossTabAlert.classList.add('translate-x-full', 'opacity-0');
  tgCrossTabAlert.classList.remove('translate-x-0', 'opacity-100');
}

/**
 * Dispatch Desktop Push Notification (Windows Native Alert)
 */
function sendDesktopNotification(bet) {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') {
    // If not granted yet, attempt request so user gets future alerts
    Notification.requestPermission().then(updateNotificationPermissionButton);
    return;
  }
  try {
    const isTarget = isUserTracked(bet.userName);
    const title = isTarget 
      ? `🎯 TARGET USER BET: ${bet.userName} placed bet!` 
      : `⚡ NEW BET: ${bet.userName}`;
    const body = `${bet.teamName ? `Selection: ${bet.teamName}` : ''} | Amount: ${bet.amount || 'N/A'}\nChannel: @BetfairTossbookOrignal`;

    const notification = new Notification(title, {
      body,
      icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🪙</text></svg>',
      tag: bet.postId || `bet_${Date.now()}`,
      requireInteraction: true // Keeps alert on screen until clicked
    });

    notification.onclick = () => {
      window.focus();
      switchTab('telegram-bet');
      if (bet.webTelegramUrl) {
        window.open(bet.webTelegramUrl, '_blank');
      }
    };
  } catch (e) {
    console.warn('[TeleGramBet] Notification dispatch error:', e);
  }
}

/**
 * Check if a username matches the user's tracked list
 */
function isUserTracked(userName) {
  if (!userName || !tgTrackedUsers || tgTrackedUsers.length === 0) return false;
  const clean = userName.toLowerCase().replace(/^@/, '').trim();
  return tgTrackedUsers.some(target => clean.includes(target) || target.includes(clean));
}

/**
 * Fetch latest bets from server endpoint
 */
async function loadTelegramBets(forceNotice = false) {
  try {
    const res = await fetch(`/api/telegram-bets?limit=60&_t=${Date.now()}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    if (data && data.bets) {
      processIncomingBets(data.bets, forceNotice);
      updateTelegramStatusBadge(data.status, data.lastFetchTime);
    }
  } catch (err) {
    console.warn('[TeleGramBet] Polling error:', err.message);
    if (tgStatusBadge) {
      tgStatusBadge.innerHTML = `<span class="w-2 h-2 rounded-full bg-amber-400"></span> Reconnecting...`;
      tgStatusBadge.className = 'px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1.5';
    }
  }
}

/**
 * Process bets and trigger alerts on new incoming bets
 */
function processIncomingBets(bets, forceNotice = false) {
  if (!Array.isArray(bets)) return;
  tgLatestBets = bets;

  let triggeredAlert = false;
  const newBetsFound = [];

  for (const bet of bets) {
    // Collect punter names for quick chips
    if (bet.userName && bet.userName !== 'System / Admin' && bet.userName !== 'Anonymous') {
      tgActivePunters.add(bet.userName);
    }

    if (!tgKnownPostIds.has(bet.postId)) {
      tgKnownPostIds.add(bet.postId);
      newBetsFound.push(bet);
    }
  }

  // If this is NOT initial load, check if any newly arrived bet triggers an alert
  if (!tgIsInitialLoad && newBetsFound.length > 0) {
    for (const newBet of newBetsFound) {
      const isTarget = isUserTracked(newBet.userName);
      const isBet = newBet.type === 'BET_PLACED';

      // If user is tracking specific handles and this bet matches
      if (isTarget) {
        triggeredAlert = true;
        playAlertSound(tgSoundChoice);
        sendDesktopNotification(newBet);
        startTitleFlash(newBet);
        showCrossMenuBetAlert(newBet);
        showToast(`🎯 TARGET USER BET! ${newBet.userName} placed bet on ${newBet.teamName || 'Toss'} (${newBet.amount})!`, 'success');
        break; // Alert fired once per poll batch
      } else if (tgTrackedUsers.length === 0 && isBet) {
        // If tracking ALL bets, alert for any bet placed
        if (!triggeredAlert) {
          triggeredAlert = true;
          playAlertSound(tgSoundChoice);
          sendDesktopNotification(newBet);
          startTitleFlash(newBet);
          showCrossMenuBetAlert(newBet);
          showToast(`⚡ New Bet Placed: ${newBet.userName} on ${newBet.teamName || 'Toss'} (${newBet.amount})`, 'info');
        }
      }
    }
  }

  tgIsInitialLoad = false;

  renderActiveUserChips();
  renderTelegramBets(bets);

  if (forceNotice && !triggeredAlert) {
    showToast(`✅ Loaded ${bets.length} recent messages from @BetfairTossbookOrignal`, 'success');
  }
}

/**
 * Render quick chips of active punter IDs with individual remove and clear all options
 */
function renderActiveUserChips() {
  if (!tgActiveUserChips) return;

  if (tgHideAllPunters) {
    tgActiveUserChips.innerHTML = `
      <div class="text-[11px] text-slate-500 italic flex items-center gap-2 py-1">
        <span>🚫 Active Punter IDs list remove kar di gayi hai.</span>
        <button id="tg-btn-restore-chips" type="button" class="text-sky-400 hover:underline font-bold text-xs cursor-pointer">
          <i class="fa-solid fa-arrows-rotate mr-1"></i> Restore Karein
        </button>
      </div>
    `;
    const btnRestore = document.getElementById('tg-btn-restore-chips');
    if (btnRestore) {
      btnRestore.addEventListener('click', () => {
        tgHideAllPunters = false;
        tgDismissedPunters.clear();
        localStorage.removeItem('c_toss_tg_hide_all_punters');
        localStorage.removeItem('c_toss_tg_dismissed_punters');
        renderActiveUserChips();
        showToast('Active Punter IDs restore ho gaye', 'info');
      });
    }
    return;
  }

  // Combine detected punters from channel and custom added punters
  const allPunters = new Set([...tgCustomPunters, ...tgActivePunters]);
  const punters = Array.from(allPunters).filter(p => !tgDismissedPunters.has(p)).slice(0, 25);

  if (punters.length === 0) {
    tgActiveUserChips.innerHTML = `
      <div class="text-[11px] text-slate-500 italic flex items-center gap-2 py-1">
        <span>Active Punter IDs list empty hai. Upar "+ Naya Punter ID" se add karein.</span>
        ${tgDismissedPunters.size > 0 ? `
          <button id="tg-btn-restore-chips" type="button" class="text-sky-400 hover:underline font-bold text-xs cursor-pointer">
            <i class="fa-solid fa-arrows-rotate mr-1"></i> Reset Removed IDs
          </button>
        ` : ''}
      </div>
    `;
    const btnRestore = document.getElementById('tg-btn-restore-chips');
    if (btnRestore) {
      btnRestore.addEventListener('click', () => {
        tgDismissedPunters.clear();
        localStorage.removeItem('c_toss_tg_dismissed_punters');
        renderActiveUserChips();
        showToast('Removed IDs reset ho gaye', 'info');
      });
    }
    return;
  }

  tgActiveUserChips.innerHTML = punters.map(p => {
    const isSelected = isUserTracked(p);
    const isCustom = tgCustomPunters.has(p);
    const activeClass = isSelected 
      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm ring-1 ring-amber-400/40' 
      : (isCustom ? 'bg-emerald-950/70 text-emerald-300 border-emerald-500/40' : 'bg-slate-900/90 hover:bg-slate-800 text-slate-300 border-slate-700/80');
    return `
      <div class="inline-flex items-center rounded-lg border ${activeClass} transition-all overflow-hidden text-[11px] font-bold shadow-sm">
        <button type="button" class="tg-punter-chip px-2.5 py-1 hover:bg-white/10 transition-colors cursor-pointer flex items-center gap-1" data-user="${p}" title="Track ${p}">
          ${isSelected ? '🎯 ' : (isCustom ? '⭐ ' : '+ ')}${p}
        </button>
        <button type="button" class="tg-punter-remove-btn px-1.5 py-1 hover:bg-rose-600/40 text-slate-400 hover:text-rose-300 transition-colors cursor-pointer border-l border-slate-700" data-remove-user="${p}" title="${p} ko list se remove karein">
          <i class="fa-solid fa-xmark text-[10px]"></i>
        </button>
      </div>
    `;
  }).join('');

  // Wire chip click to toggle user
  tgActiveUserChips.querySelectorAll('.tg-punter-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      const clickedUser = btn.getAttribute('data-user');
      toggleTrackedUser(clickedUser);
    });
  });

  // Wire remove click to remove individual user
  tgActiveUserChips.querySelectorAll('.tg-punter-remove-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const userToRemove = btn.getAttribute('data-remove-user');
      removePunterChip(userToRemove);
    });
  });
}

/**
 * Remove an individual punter from active chips
 */
function removePunterChip(userName) {
  if (!userName) return;
  const upper = userName.toUpperCase();
  tgDismissedPunters.add(upper);
  tgDismissedPunters.add(userName);
  if (tgCustomPunters.has(upper)) {
    tgCustomPunters.delete(upper);
    localStorage.setItem('c_toss_tg_custom_punters', JSON.stringify(Array.from(tgCustomPunters)));
  }
  localStorage.setItem('c_toss_tg_dismissed_punters', JSON.stringify(Array.from(tgDismissedPunters)));
  renderActiveUserChips();
  showToast(`🗑️ ${userName} ko Active Punter IDs se remove kar diya gaya`, 'info');
}

/**
 * Add a new custom punter ID and start tracking
 */
function handleAddNewCustomPunter() {
  if (!tgNewPunterInput) return;
  const raw = tgNewPunterInput.value.trim().toUpperCase().replace(/^@/, '');
  if (!raw) {
    showToast('Kripya valid Punter ID enter karein (e.g. BTB1648)', 'error');
    return;
  }

  // Restore if was hidden or dismissed
  if (tgDismissedPunters.has(raw)) {
    tgDismissedPunters.delete(raw);
    localStorage.setItem('c_toss_tg_dismissed_punters', JSON.stringify(Array.from(tgDismissedPunters)));
  }
  if (tgHideAllPunters) {
    tgHideAllPunters = false;
    localStorage.removeItem('c_toss_tg_hide_all_punters');
  }

  tgCustomPunters.add(raw);
  localStorage.setItem('c_toss_tg_custom_punters', JSON.stringify(Array.from(tgCustomPunters)));
  tgActivePunters.add(raw);

  // Automatically add to tracked users input and save
  const currentVal = tgFilterUsersInput ? tgFilterUsersInput.value.trim() : '';
  let users = currentVal ? currentVal.split(',').map(u => u.trim()).filter(Boolean) : [];
  if (!users.some(u => u.toLowerCase() === raw.toLowerCase())) {
    users.push(raw);
  }
  if (tgFilterUsersInput) tgFilterUsersInput.value = users.join(', ');
  saveTrackedUsersFromInput();

  tgNewPunterInput.value = '';
  renderActiveUserChips();
  showToast(`✅ Punter ID "${raw}" add ho gaya aur tracking active ho gayi!`, 'success');
}

/**
 * Toggle a user in the tracked list
 */
function toggleTrackedUser(userName) {
  if (!userName) return;
  const clean = userName.trim();
  const currentVal = tgFilterUsersInput ? tgFilterUsersInput.value.trim() : '';
  let users = currentVal ? currentVal.split(',').map(u => u.trim()).filter(Boolean) : [];

  const idx = users.findIndex(u => u.toLowerCase() === clean.toLowerCase());
  if (idx >= 0) {
    users.splice(idx, 1);
  } else {
    users.push(clean);
  }

  const newVal = users.join(', ');
  if (tgFilterUsersInput) tgFilterUsersInput.value = newVal;
  saveTrackedUsersFromInput();
}

/**
 * Render the live bets stream
 */
function renderTelegramBets(bets) {
  if (!tgBetsContainer) return;

  // Filter based on user selection
  let displayBets = [...bets];

  if (tgFilterType === 'bets_only') {
    displayBets = displayBets.filter(b => b.type === 'BET_PLACED');
  }

  // BAKI USER REMOVED LOGIC:
  // If target user is specified and tgHideOtherUsers is active (default true),
  // REMOVE all other users completely from the list!
  if (tgHideOtherUsers && tgTrackedUsers && tgTrackedUsers.length > 0) {
    displayBets = displayBets.filter(b => isUserTracked(b.userName));
  }

  // Update count badge
  if (tgFeedCountBadge) {
    const userSuffix = (tgHideOtherUsers && tgTrackedUsers.length > 0) ? ' (Filtered User)' : '';
    tgFeedCountBadge.textContent = `${displayBets.length} Bets${userSuffix}`;
  }

  if (tgLastPolledTime) {
    tgLastPolledTime.textContent = new Date().toLocaleTimeString('en-US', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  }

  if (displayBets.length === 0) {
    tgBetsContainer.innerHTML = '';
    if (tgEmptyState) {
      tgEmptyState.classList.remove('hidden');
      const uNames = tgTrackedUsers.map(u => u.toUpperCase()).join(', ');
      tgEmptyState.innerHTML = `
        <div class="w-14 h-14 rounded-2xl bg-slate-800/80 flex items-center justify-center mx-auto text-amber-400 text-2xl">
          <i class="fa-solid fa-user-slash"></i>
        </div>
        <h4 class="text-sm font-bold text-slate-200">Baki users remove kar diye gaye hain</h4>
        <p class="text-xs text-amber-400 font-semibold max-w-sm mx-auto">
          Currently filtering strictly for: <strong class="text-white">${uNames || 'Tracked User'}</strong>
        </p>
        <p class="text-[11px] text-slate-500">Jaise hi is user ki bet aayegi, yahan turant show hogi aur notification sound bajega.</p>
        <div class="pt-1">
          <button type="button" id="tg-btn-empty-clear" class="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold border border-slate-700 cursor-pointer">
            <i class="fa-solid fa-arrows-rotate mr-1"></i> Show All Channel Bets (Reset Filter)
          </button>
        </div>
      `;
      const btnEmptyClear = document.getElementById('tg-btn-empty-clear');
      if (btnEmptyClear) {
        btnEmptyClear.addEventListener('click', () => {
          if (tgFilterUsersInput) tgFilterUsersInput.value = '';
          saveTrackedUsersFromInput();
        });
      }
    }
    return;
  }

  if (tgEmptyState) tgEmptyState.classList.add('hidden');

  tgBetsContainer.innerHTML = displayBets.map((bet, idx) => {
    const isTarget = isUserTracked(bet.userName);
    const isBet = bet.type === 'BET_PLACED';
    const isDeposit = bet.type === 'DEPOSIT_WITHDRAWAL';

    let cardBorder = 'border-slate-800/80 bg-slate-900/50';
    let targetBadge = '';

    if (isTarget) {
      cardBorder = 'border-amber-500/80 bg-gradient-to-r from-amber-950/40 via-slate-900/90 to-amber-950/40 ring-1 ring-amber-400 shadow-lg shadow-amber-500/10';
      targetBadge = `
        <span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/50 flex items-center gap-1 animate-pulse">
          🎯 TRACKED USER MATCH
        </span>
      `;
    } else if (bet.isTest) {
      cardBorder = 'border-purple-500/80 bg-purple-950/30';
      targetBadge = `
        <span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-500/20 text-purple-300 border border-purple-500/50 flex items-center gap-1">
          🧪 TEST ALERT
        </span>
      `;
    }

    let typeBadge = '';
    if (isBet) {
      typeBadge = `<span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">⚡ BET PLACED</span>`;
    } else if (isDeposit) {
      typeBadge = `<span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">💳 DEPOSIT / WD</span>`;
    } else {
      typeBadge = `<span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-700/50 text-slate-300 border border-slate-600">📢 UPDATE</span>`;
    }

    return `
      <div class="rounded-xl p-3 sm:p-4 border transition-all ${cardBorder} hover:border-slate-600">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          
          <!-- User and Team Selection Info -->
          <div class="flex items-start sm:items-center gap-3">
            <div class="w-9 h-9 rounded-xl ${isTarget ? 'bg-gradient-to-tr from-amber-600 to-yellow-400' : 'bg-gradient-to-tr from-slate-700 to-slate-800'} flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-md">
              ${isTarget ? '🎯' : (isBet ? '🏏' : '💳')}
            </div>

            <div>
              <div class="flex flex-wrap items-center gap-2">
                <span class="font-extrabold text-sm ${isTarget ? 'text-amber-300 font-mono text-base' : 'text-white font-mono'}">
                  ${bet.userName || 'Anonymous'}
                </span>
                ${targetBadge}
                ${typeBadge}
              </div>

              <div class="text-xs text-slate-300 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                ${bet.teamName ? `
                  <span class="font-bold text-white bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-700/70">
                    Selection: <span class="text-emerald-400 font-extrabold">${bet.teamName}</span>
                  </span>
                ` : ''}
                ${bet.amount ? `
                  <span class="font-extrabold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                    Amount: ${bet.amount}
                  </span>
                ` : ''}
              </div>
            </div>
          </div>

          <!-- Time & Direct Link -->
          <div class="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/60">
            <div class="text-right">
              <span class="text-xs font-mono text-slate-400 block">${bet.displayTime || 'Just now'}</span>
              <span class="text-[10px] text-slate-500 block">IST</span>
            </div>

            <a href="${bet.messageUrl || bet.webTelegramUrl}" target="_blank" rel="noopener noreferrer" class="px-2.5 py-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 text-xs font-bold border border-sky-500/30 transition-all flex items-center gap-1 cursor-pointer">
              <i class="fa-brands fa-telegram text-xs"></i> View Post
            </a>
          </div>

        </div>

        <!-- Raw Text Preview (collapsed if long) -->
        ${bet.rawText && bet.type === 'ANNOUNCEMENT' ? `
          <div class="mt-2.5 pt-2 border-t border-slate-800/60 text-[11px] text-slate-400 line-clamp-2 leading-relaxed font-mono">
            ${bet.rawText.replace(/\n/g, ' ')}
          </div>
        ` : ''}
      </div>
    `;
  }).join('');
}

/**
 * Update connection status badge
 */
function updateTelegramStatusBadge(status, lastTime) {
  if (!tgStatusBadge) return;
  if (status === 'connected' || status === 'connected_cached') {
    tgStatusBadge.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span> Live Connected`;
    tgStatusBadge.className = 'px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5';
  } else {
    tgStatusBadge.innerHTML = `<span class="w-2 h-2 rounded-full bg-amber-400"></span> Standby / Polling`;
    tgStatusBadge.className = 'px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1.5';
  }
}

/**
 * Trigger a simulated test bet alert to verify notifications and audio
 */
async function triggerTestBetAlert() {
  try {
    const testUser = tgTrackedUsers.length > 0 ? tgTrackedUsers[0].toUpperCase() : 'VIP7186';
    const res = await fetch('/api/telegram-bets/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userName: testUser,
        teamName: 'INDIA W (TOSS WIN)',
        amount: '₹10,000'
      })
    });
    const data = await res.json();
    if (data && data.bet) {
      playAlertSound(tgSoundChoice);
      sendDesktopNotification(data.bet);
      startTitleFlash(data.bet);
      showCrossMenuBetAlert(data.bet);
      showToast(`🧪 Test Alert Fired for ${data.bet.userName} on ${data.bet.teamName}!`, 'success');
      loadTelegramBets(false);
    }
  } catch (err) {
    showToast(`Error triggering test alert: ${err.message}`, 'error');
  }
}
