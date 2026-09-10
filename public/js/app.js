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

// DOM Elements
const navScheduleBtn = document.getElementById('nav-schedule-btn');
const navMarketLoadBtn = document.getElementById('nav-market-load-btn');
const navSimulatorBtn = document.getElementById('nav-simulator-btn');
const navLeaderboardBtn = document.getElementById('nav-leaderboard-btn');

const tabSchedule = document.getElementById('tab-schedule');
const tabMarketLoad = document.getElementById('tab-market-load');
const tabSimulator = document.getElementById('tab-simulator');
const tabLeaderboard = document.getElementById('tab-leaderboard');

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
  [tabSchedule, tabMarketLoad, tabSimulator, tabLeaderboard].forEach(tab => {
    if (tab) tab.classList.add('hidden');
  });

  [navScheduleBtn, navMarketLoadBtn, navSimulatorBtn, navLeaderboardBtn].forEach(btn => {
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
  }
}

// Setup Event Listeners
function setupEventListeners() {
  if (navScheduleBtn) navScheduleBtn.addEventListener('click', () => switchTab('schedule'));
  if (navMarketLoadBtn) navMarketLoadBtn.addEventListener('click', () => switchTab('market-load'));
  if (navSimulatorBtn) navSimulatorBtn.addEventListener('click', () => switchTab('simulator'));
  if (navLeaderboardBtn) navLeaderboardBtn.addEventListener('click', () => switchTab('leaderboard'));

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

  if (tossDoneStatsBanner) {
    if (currentTossStatus === 'done' && doneMatches.length > 0) {
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

  // Analysis prediction (robust lookup from tossAnalysis or marketLoad)
  const tossAnalysis = match.tossAnalysis || (match.analysis && match.analysis.prediction) || {};
  const ml = match.marketLoad || {};
  const favoredWinner = (ml.aiConvergence && ml.aiConvergence.aiForecastTeam)
    || tossAnalysis.favoredWinner
    || match.favoredWinner
    || match.teamA;
  const favoredProbability = (ml.aiConvergence && ml.aiConvergence.aiConfidence)
    ? parseInt(ml.aiConvergence.aiConfidence, 10)
    : (tossAnalysis.teamBProbability && favoredWinner === match.teamB ? tossAnalysis.teamBProbability : (tossAnalysis.teamAProbability || 75));

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
          <span class="px-2 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 text-[9px] sm:text-[10px] font-extrabold border border-emerald-500/40 shrink-0">
            ${heavyPercent}% Load on ${heavyTeam.split(' ')[0]}
          </span>
        </div>

        <!-- Volume Bar -->
        <div class="space-y-1">
          <div class="w-full h-2 bg-slate-800 rounded-full overflow-hidden flex">
            <div class="bg-blue-500 h-full transition-all" style="width: ${ml.orbitLoad.teamA.percent}%" title="${match.teamA}: ${ml.orbitLoad.teamA.percent}%"></div>
            <div class="bg-orange-500 h-full transition-all" style="width: ${ml.orbitLoad.teamB.percent}%" title="${match.teamB}: ${ml.orbitLoad.teamB.percent}%"></div>
          </div>
          <div class="flex items-center justify-between text-[9px] font-mono text-slate-400">
            <span class="text-blue-400 font-bold truncate max-w-[32%]">${match.teamA.split(' ')[0]}: ${ml.orbitLoad.teamA.percent}%</span>
            <span class="text-amber-300 font-bold shrink-0">Odds: ${ml.betfairOdds.teamA.back}/${ml.betfairOdds.teamB.back}</span>
            <span class="text-orange-400 font-bold truncate max-w-[32%] text-right">${match.teamB.split(' ')[0]}: ${ml.orbitLoad.teamB.percent}%</span>
          </div>
        </div>

        <!-- 🎯 Ultra-Clear Direct Bet Advisory Banner -->
        <div class="p-2 rounded-lg ${ml.aiConvergence.isAligned ? 'bg-emerald-950/90 border border-emerald-500/60' : 'bg-amber-950/90 border border-amber-500/60'} flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
          <div class="${ml.aiConvergence.isAligned ? 'text-emerald-300' : 'text-amber-300'} font-bold flex items-center gap-1.5 min-w-0">
            <i class="fa-solid ${ml.aiConvergence.isAligned ? 'fa-circle-check text-emerald-400' : 'fa-triangle-exclamation text-amber-400'} shrink-0"></i> 
            <span class="truncate text-[11px] sm:text-xs">Toss: <strong class="text-white underline">${ml.aiConvergence.isAligned ? 'BET ON ' + ml.orbitLoad.heavyTeam : 'SKIP / PASS (Risky Load)'}</strong></span>
          </div>
          <span class="px-2 py-0.5 rounded-md ${ml.aiConvergence.isAligned ? 'bg-emerald-500 text-slate-950' : 'bg-amber-500 text-slate-950'} text-[9px] sm:text-[10px] font-black uppercase tracking-wider self-start sm:self-auto shrink-0">
            ${ml.aiConvergence.isAligned ? '🟢 99.9% SAFE' : '⚠️ SKIP'}
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
    const res = await fetch('/api/matches/add-custom', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamA, teamB, time, league, venue, date, tournament: `${teamA} vs ${teamB} Match` })
    });
    const result = await res.json();
    if (result.success) {
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
      ? `<span class="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black uppercase tracking-wider animate-pulse">🎯 99.9% ULTRA-CONVERGENCE SAFE SIGNAL</span>`
      : `<span class="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-black uppercase tracking-wider">⚠️ CONTRARIAN WHALE DIVERGENCE</span>`;

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
          ${isAligned ? '<span class="px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40 text-[10px] sm:text-xs font-black uppercase tracking-wider">99.9% MARKET ALIGNED 🎯</span>' : ''}
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
