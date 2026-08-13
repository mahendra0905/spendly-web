/* ========================================
   SpendWise — Finance Terminal App Logic
   ======================================== */

// ===== DATA LAYER =====
const STORAGE_KEYS = {
  EXPENSES: 'spendwise_expenses',
  BUDGET: 'spendwise_budget',
  FRIENDS: 'spendwise_friends',
  BILLS: 'spendwise_bills',
  REMINDERS: 'spendwise_reminders',
};

const DEFAULT_BILLS = [];
const DEFAULT_REMINDERS = [];

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

/* ========================================
   Spendly — Native Browser IndexedDB Engine
   ======================================== */
const DB_NAME = 'SpendlyDB';
const DB_VERSION = 1;

let dbInstance = null;

function openIndexedDB() {
  return new Promise((resolve, reject) => {
    if (dbInstance) return resolve(dbInstance);
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('budget')) db.createObjectStore('budget', { keyPath: 'key' });
      if (!db.objectStoreNames.contains('expenses')) db.createObjectStore('expenses', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('friends')) db.createObjectStore('friends', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('bills')) db.createObjectStore('bills', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('reminders')) db.createObjectStore('reminders', { keyPath: 'id' });
    };

    request.onsuccess = (e) => {
      dbInstance = e.target.result;
      resolve(dbInstance);
    };

    request.onerror = (e) => {
      console.error('IndexedDB Error:', e.target.error);
      reject(e.target.error);
    };
  });
}

async function idbGetAll(storeName) {
  const db = await openIndexedDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

async function idbPut(storeName, item) {
  const db = await openIndexedDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.put(item);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function idbDelete(storeName, key) {
  const db = await openIndexedDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.delete(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function idbClear(storeName) {
  const db = await openIndexedDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

const state = {
  budget: { amount: 0 },
  expenses: [],
  friends: [],
  bills: [],
  reminders: []
};

async function initIndexedDBData() {
  try {
    await openIndexedDB();
    const isInitialized = localStorage.getItem('spendly_app_initialized');
    const budgetItems = await idbGetAll('budget');
    if (budgetItems.length > 0) {
      state.budget = { amount: budgetItems[0].amount || 0 };
    } else {
      state.budget = { amount: 0 };
      await idbPut('budget', { key: 'main', amount: 0 });
    }

    // Expenses
    state.expenses = await idbGetAll('expenses');

    // Friends
    state.friends = await idbGetAll('friends');

    // Bills
    state.bills = await idbGetAll('bills');

    // Reminders
    state.reminders = await idbGetAll('reminders');

    renderPage(currentPage);
  } catch (err) {
    console.error('Failed to init IndexedDB', err);
  }
}

function getExpenses() {
  return state.expenses;
}
async function addExpense(data) {
  const expense = { id: generateId(), ...data, createdAt: Date.now() };
  state.expenses.unshift(expense);
  await idbPut('expenses', expense);
  return expense;
}
async function updateExpense(id, data) {
  const idx = state.expenses.findIndex(e => e.id === id);
  if (idx !== -1) {
    state.expenses[idx] = { ...state.expenses[idx], ...data };
    await idbPut('expenses', state.expenses[idx]);
  }
}
async function deleteExpense(id) {
  state.expenses = state.expenses.filter(e => e.id !== id);
  await idbDelete('expenses', id);
}

function getBudget() {
  return state.budget;
}
async function setBudgetAmount(amount) {
  state.budget = { amount: Number(amount) };
  await idbPut('budget', { key: 'main', amount: Number(amount) });
}

function getFriendTransactions() {
  return state.friends;
}
async function addFriendTransaction(data) {
  const tx = { id: generateId(), ...data, createdAt: Date.now() };
  state.friends.unshift(tx);
  await idbPut('friends', tx);
  return tx;
}
async function updateFriendTransaction(id, data) {
  const idx = state.friends.findIndex(t => t.id === id);
  if (idx !== -1) {
    state.friends[idx] = { ...state.friends[idx], ...data };
    await idbPut('friends', state.friends[idx]);
  }
}
async function deleteFriendTransaction(id) {
  state.friends = state.friends.filter(t => t.id !== id);
  await idbDelete('friends', id);
}

function getBills() {
  return state.bills;
}
async function addBill(data) {
  const bill = { id: generateId(), ...data, paid: false, createdAt: Date.now() };
  state.bills.push(bill);
  await idbPut('bills', bill);
  return bill;
}
async function updateBill(id, data) {
  const idx = state.bills.findIndex(b => b.id === id);
  if (idx !== -1) {
    state.bills[idx] = { ...state.bills[idx], ...data };
    await idbPut('bills', state.bills[idx]);
  }
}
async function toggleBillPaid(id) {
  const bill = state.bills.find(b => b.id === id);
  if (bill) {
    bill.paid = !bill.paid;
    await idbPut('bills', bill);
  }
}
async function deleteBill(id) {
  state.bills = state.bills.filter(b => b.id !== id);
  await idbDelete('bills', id);
}

function getReminders() {
  return state.reminders;
}
async function addReminder(data) {
  const reminder = { id: generateId(), ...data, completed: false, createdAt: Date.now() };
  state.reminders.unshift(reminder);
  await idbPut('reminders', reminder);
  return reminder;
}
async function updateReminder(id, data) {
  const idx = state.reminders.findIndex(r => r.id === id);
  if (idx !== -1) {
    state.reminders[idx] = { ...state.reminders[idx], ...data };
    await idbPut('reminders', state.reminders[idx]);
  }
}
async function toggleReminderCompleted(id) {
  const r = state.reminders.find(item => item.id === id);
  if (r) {
    r.completed = !r.completed;
    await idbPut('reminders', r);
  }
}
async function deleteReminder(id) {
  state.reminders = state.reminders.filter(r => r.id !== id);
  await idbDelete('reminders', id);
}

// ===== UTILITIES =====
function formatCurrency(amount) {
  return '₹' + Number(amount).toLocaleString('en-IN', { maximumFractionDigits: 2 });
}
function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
function formatDateShort(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}
function getToday() {
  return new Date().toISOString().split('T')[0];
}
function getCurrentMonthStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function getMonthName(monthStr) {
  const [year, month] = monthStr.split('-');
  return new Date(year, month - 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}
function getDayName(dateStr) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short' });
}

const CATEGORIES = {
  food:          { icon: 'restaurant',       name: 'Food & Dining' },
  transport:     { icon: 'directions_car',   name: 'Transport' },
  shopping:      { icon: 'shopping_cart',     name: 'Shopping' },
  bills:         { icon: 'receipt_long',      name: 'Bills & Utilities' },
  entertainment: { icon: 'movie',            name: 'Entertainment' },
  health:        { icon: 'medical_services', name: 'Health' },
  education:     { icon: 'school',           name: 'Education' },
  rent:          { icon: 'home',             name: 'Rent' },
  other:         { icon: 'category',         name: 'Other' },
};
function getCategoryInfo(cat) {
  return CATEGORIES[cat] || CATEGORIES.other;
}
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ===== STATE =====
let currentPage = 'dashboard';
let viewMonth = getCurrentMonthStr();
let selectedFriend = null;
let friendTxType = 'given';
let pendingDeleteCallback = null;

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// ===== NAVIGATION =====
function navigateTo(page) {
  currentPage = page;
  // Update nav links
  $$('.nav-link').forEach(link => {
    const isActive = link.dataset.page === page;
    const icon = link.querySelector('.material-symbols-outlined');
    if (isActive) {
      link.className = 'nav-link flex items-center gap-3 px-4 py-2 rounded-lg cursor-pointer transition-colors duration-200 active:scale-95 text-primary font-bold border-r-4 border-primary bg-surface-container';
      if (icon) icon.style.fontVariationSettings = "'FILL' 1";
    } else {
      link.className = 'nav-link flex items-center gap-3 px-4 py-2 rounded-lg cursor-pointer transition-colors duration-200 active:scale-95 text-on-surface-variant hover:text-primary hover:bg-surface-container-low';
      if (icon) icon.style.fontVariationSettings = "'FILL' 0";
    }
  });
  // Update pages
  $$('.page').forEach(p => p.classList.remove('active'));
  const target = $(`#page-${page}`);
  if (target) target.classList.add('active');
  // Update title
  const titles = { dashboard: 'Dashboard', history: 'Transaction History', friends: 'Friends & Debts', upcoming: 'Upcoming Bills & Reminders', settings: 'Settings & Preferences' };
  if ($('#pageTitle')) $('#pageTitle').textContent = titles[page] || 'Spendly';
  // Render
  renderPage(page);
  // Close mobile sidebar
  $('#sidebar').classList.remove('open');
  $('#sidebarOverlay').classList.remove('active');
}
function renderPage(page) {
  switch (page) {
    case 'dashboard': renderDashboard(); break;
    case 'history': renderHistory(); break;
    case 'friends': renderFriends(); break;
    case 'upcoming': renderUpcoming(); break;
    case 'settings': renderSettings(); break;
  }
}

// ===== TOAST =====
function showToast(message, type = 'success') {
  const container = $('#toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span class="material-symbols-outlined text-[18px]">${type === 'success' ? 'check_circle' : type === 'error' ? 'error' : 'info'}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// ===== CONFIRM =====
function showConfirm(title, message, callback) {
  $('#confirmTitle').textContent = title;
  $('#confirmMessage').textContent = message;
  $('#confirmModal').classList.add('active');
  pendingDeleteCallback = callback;
}

// ===== MODALS =====
function openExpenseModal(editId) {
  const modal = $('#expenseModal');
  if (editId) {
    const expense = getExpenses().find(e => e.id === editId);
    if (!expense) return;
    $('#expenseId').value = expense.id;
    $('#expenseAmount').value = expense.amount;
    $('#expenseDate').value = expense.date;
    $('#expenseCategory').value = expense.category;
    $('#expenseDescription').value = expense.description;
    $('#expenseFormTitle').textContent = 'Edit Expense';
    $('#expenseSubmitBtn').textContent = 'Update Expense';
  } else {
    $('#expenseForm').reset();
    $('#expenseId').value = '';
    $('#expenseDate').value = getToday();
    $('#expenseFormTitle').textContent = 'Add Expense';
    $('#expenseSubmitBtn').textContent = 'Add Expense';
  }
  modal.classList.add('active');
  setTimeout(() => $('#expenseAmount').focus(), 200);
}
function closeExpenseModal() {
  $('#expenseModal').classList.remove('active');
}

function openBudgetModal() {
  const budget = getBudget();
  $('#budgetInput').value = budget.amount || '';
  $('#budgetModal').classList.add('active');
  setTimeout(() => $('#budgetInput').focus(), 200);
}
function closeBudgetModal() {
  $('#budgetModal').classList.remove('active');
}

function openFriendModal(editId) {
  const modal = $('#friendModal');
  if (editId) {
    const tx = getFriendTransactions().find(t => t.id === editId);
    if (!tx) return;
    $('#friendTxId').value = tx.id;
    $('#friendName').value = tx.friendName;
    $('#friendAmount').value = tx.amount;
    $('#friendReason').value = tx.reason;
    $('#friendDate').value = tx.date;
    if ($('#friendDueDate')) $('#friendDueDate').value = tx.dueDate || '';
    setFriendTxType(tx.type);
    $('#friendFormTitle').textContent = 'Edit Transaction';
    $('#friendSubmitBtn').textContent = 'Update';
  } else {
    $('#friendForm').reset();
    $('#friendTxId').value = '';
    $('#friendDate').value = getToday();
    if ($('#friendDueDate')) $('#friendDueDate').value = '';
    setFriendTxType('given');
    $('#friendFormTitle').textContent = 'Add Friend Transaction';
    $('#friendSubmitBtn').textContent = 'Add Transaction';
  }
  // Update suggestions
  const uniqueNames = [...new Set(getFriendTransactions().map(t => t.friendName))];
  $('#friendSuggestions').innerHTML = uniqueNames.map(n => `<option value="${escapeHtml(n)}">`).join('');
  modal.classList.add('active');
  setTimeout(() => $('#friendName').focus(), 200);
}
function closeFriendModal() {
  $('#friendModal').classList.remove('active');
}
function setFriendTxType(type) {
  friendTxType = type;
  const givenBtn = $('#typeGiven');
  const takenBtn = $('#typeTaken');
  if (type === 'given') {
    givenBtn.className = 'w-full py-2.5 px-3 rounded-lg text-body-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 border border-error bg-white text-error shadow-sm';
    takenBtn.className = 'w-full py-2.5 px-3 rounded-lg text-body-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 border border-transparent text-on-surface-variant hover:text-primary';
  } else {
    takenBtn.className = 'w-full py-2.5 px-3 rounded-lg text-body-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 border border-secondary bg-white text-secondary shadow-sm';
    givenBtn.className = 'w-full py-2.5 px-3 rounded-lg text-body-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 border border-transparent text-on-surface-variant hover:text-primary';
  }
}

// ===== DASHBOARD RENDERING =====
function renderDashboard() {
  const expenses = getExpenses();
  const budget = getBudget();
  const today = getToday();
  const currentMonth = getCurrentMonthStr();
  const monthExpenses = expenses.filter(e => e.date.startsWith(currentMonth));
  const totalSpent = monthExpenses.reduce((s, e) => s + Number(e.amount), 0);
  const todayExpenses = expenses.filter(e => e.date === today);
  const todayTotal = todayExpenses.reduce((s, e) => s + Number(e.amount), 0);

  // Stats
  $('#budgetValue').textContent = formatCurrency(budget.amount);
  $('#totalSpent').textContent = formatCurrency(totalSpent);
  $('#todaySpend').textContent = formatCurrency(todayTotal);

  const remaining = budget.amount > 0 ? Math.max(0, budget.amount - totalSpent) : 0;

  // Remaining with color
  const remEl = $('#remainingValue');
  remEl.textContent = formatCurrency(remaining);
  remEl.className = 'text-headline-lg mt-2 ' + (budget.amount > 0 ? (remaining > 0 ? 'text-secondary' : 'text-error') : 'text-primary');

  // Budget progress
  const percent = budget.amount > 0 ? Math.min(100, (totalSpent / budget.amount) * 100) : 0;
  const leftPercent = budget.amount > 0 ? Math.max(0, 100 - percent) : 0;
  const bar = $('#budgetProgressBar');
  bar.style.width = percent + '%';
  bar.className = 'progress-fill' + (percent > 90 ? ' danger' : percent > 70 ? ' warning' : '');
  $('#budgetPercent').textContent = budget.amount > 0 ? Math.round(leftPercent) + '% left' : 'Set a budget';

  // Spent trend
  $('#spentTrend').innerHTML = totalSpent > 0
    ? `<span class="material-symbols-outlined text-[16px] mr-1 text-secondary">trending_down</span><span class="text-secondary">${formatCurrency(totalSpent)} this month</span>`
    : '<span class="text-on-surface-variant">No expenses yet</span>';

  // Today's Expenses
  renderTodayExpenses(todayExpenses);

  // Recent Activity
  renderRecentActivity(expenses);

  // Top 5 Biggest
  renderTop5Expenses(monthExpenses);

  // Friend Ledger Summary
  renderFriendLedgerSummary();
}

function renderTodayExpenses(todayExpenses) {
  const container = $('#todayExpensesList');
  if (todayExpenses.length === 0) {
    container.innerHTML = '<p class="text-body-sm text-on-surface-variant text-center py-10">No expenses today. Click "Add" to start tracking!</p>';
    return;
  }
  const sorted = [...todayExpenses].sort((a, b) => b.createdAt - a.createdAt);
  container.innerHTML = '<ul class="space-y-1">' + sorted.map(e => {
    const cat = getCategoryInfo(e.category);
    return `
      <li class="flex items-center justify-between p-2 hover:bg-surface-container-low rounded-lg transition-colors group border-b border-surface-container-lowest last:border-0">
        <div class="flex items-center">
          <div class="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center mr-4 text-primary">
            <span class="material-symbols-outlined">${cat.icon}</span>
          </div>
          <div>
            <div class="text-body-md font-medium text-primary">${escapeHtml(e.description)}</div>
            <div class="text-label-md text-on-surface-variant mt-0.5">${cat.name}</div>
          </div>
        </div>
        <div class="flex items-center">
          <div class="text-numeric-data text-primary mr-3">${formatCurrency(e.amount)}</div>
          <div class="action-reveal flex gap-1">
            <button onclick="openExpenseModal('${e.id}')" class="text-on-surface-variant hover:text-primary p-1 rounded hover:bg-surface-container" title="Edit">
              <span class="material-symbols-outlined text-[18px]">edit</span>
            </button>
            <button onclick="confirmDeleteExpense('${e.id}')" class="text-on-surface-variant hover:text-error p-1 rounded hover:bg-error-container" title="Delete">
              <span class="material-symbols-outlined text-[18px]">delete</span>
            </button>
          </div>
        </div>
      </li>`;
  }).join('') + '</ul>';
}

function renderRecentActivity(expenses) {
  const container = $('#recentTransactions');
  const recent = [...expenses].sort((a, b) => b.createdAt - a.createdAt).slice(0, 6);
  if (recent.length === 0) {
    container.innerHTML = '<p class="text-body-sm text-on-surface-variant text-center py-10">No recent activity.</p>';
    return;
  }
  container.innerHTML = '<div class="space-y-3">' + recent.map(e => {
    const cat = getCategoryInfo(e.category);
    return `
      <div class="flex justify-between items-start border-b border-surface-container-lowest pb-2 last:border-0 last:pb-0">
        <div class="flex">
          <div class="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center mr-2 text-on-surface-variant mt-0.5 flex-shrink-0">
            <span class="material-symbols-outlined text-[16px]">${cat.icon}</span>
          </div>
          <div>
            <div class="text-body-sm font-medium text-primary">${escapeHtml(e.description)}</div>
            <div class="text-label-md text-on-surface-variant mt-0.5">${cat.name} • ${formatDateShort(e.date)}</div>
          </div>
        </div>
        <div class="text-numeric-data text-primary whitespace-nowrap">-${formatCurrency(e.amount)}</div>
      </div>`;
  }).join('') + '</div>';
}

function renderTop5Expenses(monthExpenses) {
  const container = $('#top5List');
  if (!container) return;

  if (monthExpenses.length === 0) {
    container.innerHTML = '<p class="text-body-sm text-on-surface-variant text-center py-10">No expenses this month yet.</p>';
    return;
  }

  const sorted = [...monthExpenses].sort((a, b) => Number(b.amount) - Number(a.amount)).slice(0, 5);

  container.innerHTML = `
    <ul class="space-y-4 flex-1">
      ${sorted.map(e => {
        const cat = getCategoryInfo(e.category);
        return `
          <li class="flex justify-between items-center pb-3 border-b border-surface-container-low last:border-0 hover:bg-surface-container-low rounded-lg p-2 transition-colors cursor-pointer">
            <div class="flex items-center">
              <div class="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center mr-4 text-primary flex-shrink-0">
                <span class="material-symbols-outlined">${cat.icon}</span>
              </div>
              <div>
                <div class="text-body-md font-medium text-primary">${escapeHtml(e.description)}</div>
                <div class="text-label-md text-on-surface-variant mt-0.5">${cat.name} • ${formatDateShort(e.date)}</div>
              </div>
            </div>
            <div class="text-numeric-data text-primary font-bold">${formatCurrency(e.amount)}</div>
          </li>`;
      }).join('')}
    </ul>`;
}

function renderFriendLedgerSummary() {
  const txs = getFriendTransactions();
  const balances = {};
  txs.forEach(t => {
    if (!balances[t.friendName]) balances[t.friendName] = 0;
    balances[t.friendName] += t.type === 'given' ? Number(t.amount) : -Number(t.amount);
  });

  let totalOwedToMe = 0, totalIOwe = 0;
  Object.values(balances).forEach(b => {
    if (b > 0) totalOwedToMe += b;
    else if (b < 0) totalIOwe += Math.abs(b);
  });

  const owedEl = $('#dashOwedToYou');
  const oweEl = $('#dashYouOwe');
  if (owedEl) owedEl.textContent = formatCurrency(totalOwedToMe);
  if (oweEl) oweEl.textContent = formatCurrency(totalIOwe);

  // Mini Friend Ledger readout on Monthly Budget Card
  const miniEl = $('#budgetFriendLedgerMini');
  if (miniEl) {
    if (totalOwedToMe > 0 || totalIOwe > 0) {
      miniEl.innerHTML = `
        <span onclick="navigateTo('friends')" class="inline-flex items-center gap-1 text-[11px] font-semibold bg-surface-container hover:bg-surface-container-high px-2 py-0.5 rounded-md cursor-pointer transition-colors border border-outline-variant" title="Click to view Friend Ledger">
          <span class="material-symbols-outlined text-[13px] text-secondary">group</span>
          <span class="text-secondary">+${formatCurrency(totalOwedToMe)}</span>
          <span class="text-on-surface-variant font-normal">|</span>
          <span class="text-error">-${formatCurrency(totalIOwe)}</span>
        </span>`;
    } else {
      miniEl.innerHTML = '<span class="text-[11px] text-on-surface-variant">Ledger: ₹0</span>';
    }
  }

  const container = $('#dashFriendSummaryList');
  if (!container) return;

  const entries = Object.entries(balances);
  if (entries.length === 0) {
    container.innerHTML = '<p class="text-body-sm text-on-surface-variant text-center py-6">No friend ledger activity yet.</p>';
    return;
  }

  container.innerHTML = entries.slice(0, 4).map(([name, balance], idx) => {
    const color = AVATAR_COLORS[idx % AVATAR_COLORS.length];
    const isPositive = balance > 0;
    const isNegative = balance < 0;
    const amtText = balance !== 0 ? ((isPositive ? '+' : '-') + formatCurrency(Math.abs(balance))) : '₹0';
    const balClass = isPositive ? 'text-secondary font-bold' : isNegative ? 'text-error font-bold' : 'text-on-surface-variant';

    return `
      <div class="flex justify-between items-center p-2 hover:bg-surface-container-low rounded-lg transition-colors cursor-pointer" onclick="navigateTo('friends'); selectFriend('${escapeHtml(name)}');">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-body-sm flex-shrink-0" style="background:${color}">${name.charAt(0).toUpperCase()}</div>
          <div class="text-body-sm text-primary font-medium">${escapeHtml(name)}</div>
        </div>
        <div class="text-numeric-data ${balClass}">${amtText}</div>
      </div>`;
  }).join('');
}

function getMonthOffsetStr(baseMonthStr, offsetMonths) {
  const [y, m] = baseMonthStr.split('-').map(Number);
  const d = new Date(y, m - 1 + offsetMonths, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function getMonthNameShort(monthStr) {
  if (!monthStr) return '';
  const [year, month] = monthStr.split('-');
  const date = new Date(year, month - 1);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

// ===== HISTORY RENDERING =====
function renderHistory() {
  if ($('#currentMonthLabel')) $('#currentMonthLabel').textContent = getMonthName(viewMonth);
  applyHistoryFilters();
}

function applyHistoryFilters() {
  const period = $('#historyPeriod') ? $('#historyPeriod').value : 'last2';
  const currMonth = getCurrentMonthStr();

  let fromMonth = currMonth;
  let toMonth = currMonth;
  let periodBadgeText = '';

  const singleBox = $('#singleMonthBox');
  const customBox = $('#customRangeBox');
  const activeDisplay = $('#activePeriodDisplay');

  if (period === 'last2') {
    // Default: Last 2 Months (Current + Previous Month)
    fromMonth = getMonthOffsetStr(currMonth, -1);
    toMonth = currMonth;
    periodBadgeText = `${getMonthNameShort(fromMonth)} – ${getMonthNameShort(toMonth)}`;
    if (singleBox) singleBox.classList.add('hidden');
    if (customBox) customBox.classList.add('hidden');
    if (activeDisplay) activeDisplay.classList.remove('hidden');
  } else if (period === 'single') {
    fromMonth = viewMonth;
    toMonth = viewMonth;
    periodBadgeText = getMonthName(viewMonth);
    if (singleBox) singleBox.classList.remove('hidden');
    if (customBox) customBox.classList.add('hidden');
    if (activeDisplay) activeDisplay.classList.add('hidden');
  } else if (period === 'last3') {
    fromMonth = getMonthOffsetStr(currMonth, -2);
    toMonth = currMonth;
    periodBadgeText = `${getMonthNameShort(fromMonth)} – ${getMonthNameShort(toMonth)}`;
    if (singleBox) singleBox.classList.add('hidden');
    if (customBox) customBox.classList.add('hidden');
    if (activeDisplay) activeDisplay.classList.remove('hidden');
  } else if (period === 'last6') {
    fromMonth = getMonthOffsetStr(currMonth, -5);
    toMonth = currMonth;
    periodBadgeText = `${getMonthNameShort(fromMonth)} – ${getMonthNameShort(toMonth)}`;
    if (singleBox) singleBox.classList.add('hidden');
    if (customBox) customBox.classList.add('hidden');
    if (activeDisplay) activeDisplay.classList.remove('hidden');
  } else if (period === 'thisYear') {
    const year = currMonth.split('-')[0];
    fromMonth = `${year}-01`;
    toMonth = `${year}-12`;
    periodBadgeText = `All ${year}`;
    if (singleBox) singleBox.classList.add('hidden');
    if (customBox) customBox.classList.add('hidden');
    if (activeDisplay) activeDisplay.classList.remove('hidden');
  } else if (period === 'custom') {
    const fromVal = $('#historyFromMonth').value || getMonthOffsetStr(currMonth, -1);
    const toVal = $('#historyToMonth').value || currMonth;
    fromMonth = fromVal < toVal ? fromVal : toVal;
    toMonth = fromVal < toVal ? toVal : fromVal;
    periodBadgeText = `${getMonthNameShort(fromMonth)} – ${getMonthNameShort(toMonth)}`;
    if (singleBox) singleBox.classList.add('hidden');
    if (customBox) customBox.classList.remove('hidden');
    if (activeDisplay) activeDisplay.classList.remove('hidden');
  }

  if ($('#activePeriodText')) $('#activePeriodText').textContent = periodBadgeText;
  if ($('#currentMonthLabel')) $('#currentMonthLabel').textContent = getMonthName(viewMonth);

  const rawExpenses = getExpenses().map(e => ({
    ...e,
    txType: 'expense',
    sortDate: e.date,
    displayTitle: e.description,
    displayCategory: getCategoryInfo(e.category).name,
    icon: getCategoryInfo(e.category).icon,
    displayAmount: `-${formatCurrency(e.amount)}`,
    amountColorClass: 'text-on-surface'
  }));

  const rawFriendTxs = getFriendTransactions().map(f => {
    const isGiven = f.type === 'given';
    return {
      id: f.id,
      date: f.date,
      sortDate: f.date,
      createdAt: f.createdAt,
      txType: 'friend',
      friendType: f.type,
      friendName: f.friendName,
      amount: f.amount,
      displayTitle: isGiven ? `Gave to ${f.friendName} (${f.reason || 'No note'})` : `Received from ${f.friendName} (${f.reason || 'No note'})`,
      displayCategory: isGiven ? 'Friend (Gave)' : 'Friend (Received)',
      icon: isGiven ? 'north_east' : 'south_west',
      displayAmount: isGiven ? `+${formatCurrency(f.amount)}` : `-${formatCurrency(f.amount)}`,
      amountColorClass: isGiven ? 'text-secondary font-bold' : 'text-error font-bold'
    };
  });

  const categoryFilter = $('#historyCategory').value;
  const search = ($('#historySearch').value || '').toLowerCase().trim();

  let allTx = [];
  if (categoryFilter === 'friend') {
    allTx = rawFriendTxs;
  } else if (!categoryFilter) {
    allTx = [...rawExpenses, ...rawFriendTxs];
  } else {
    allTx = rawExpenses.filter(e => e.category === categoryFilter);
  }

  // Month Period Range Filter (fromMonth <= txMonth <= toMonth)
  let filtered = allTx.filter(t => {
    if (!t.date) return false;
    const txMonth = t.date.substring(0, 7);
    return txMonth >= fromMonth && txMonth <= toMonth;
  });

  // Search filter
  if (search) {
    filtered = filtered.filter(t => t.displayTitle.toLowerCase().includes(search) || t.displayCategory.toLowerCase().includes(search));
  }

  filtered.sort((a, b) => b.sortDate.localeCompare(a.sortDate) || b.createdAt - a.createdAt);

  const totalExpenseAmt = filtered.filter(t => t.txType === 'expense').reduce((s, e) => s + Number(e.amount), 0);
  const totalGivenAmt = filtered.filter(t => t.txType === 'friend' && t.friendType === 'given').reduce((s, f) => s + Number(f.amount), 0);
  const totalReceivedAmt = filtered.filter(t => t.txType === 'friend' && t.friendType === 'taken').reduce((s, f) => s + Number(f.amount), 0);

  // Summary footer
  $('#historySummary').innerHTML = `
    <div class="col-span-12 flex flex-wrap justify-between items-center text-body-sm gap-2 py-1">
      <div>
        <span class="text-on-surface-variant font-medium">Expenses Total:</span> <strong class="text-primary">-${formatCurrency(totalExpenseAmt)}</strong>
      </div>
      <div class="flex gap-4">
        <span class="text-on-surface-variant font-medium">Gave to Friends:</span> <strong class="text-secondary">+${formatCurrency(totalGivenAmt)}</strong>
        <span class="text-on-surface-variant font-medium">Received from Friends:</span> <strong class="text-error">-${formatCurrency(totalReceivedAmt)}</strong>
      </div>
    </div>`;

  // Table rows
  const container = $('#historyList');
  if (filtered.length === 0) {
    container.innerHTML = '<p class="text-body-sm text-on-surface-variant text-center py-16">No transactions found for this period.</p>';
    return;
  }

  container.innerHTML = filtered.map(t => {
    const isFriend = t.txType === 'friend';
    return `
      <div class="grid grid-cols-12 gap-2 px-6 py-3 border-b border-[#F1F5F9] row-hover items-center transition-colors">
        <div class="col-span-3 sm:col-span-2 text-body-sm text-on-surface-variant font-medium">${formatDateShort(t.date)}</div>
        <div class="col-span-5 sm:col-span-5 text-body-md text-on-surface font-medium truncate flex items-center gap-1.5">
          ${isFriend ? `<span class="material-symbols-outlined text-[16px] ${t.friendType === 'given' ? 'text-secondary' : 'text-error'}">group</span>` : ''}
          <span class="truncate">${escapeHtml(t.displayTitle)}</span>
        </div>
        <div class="hidden sm:flex sm:col-span-3 items-center gap-1 text-on-surface-variant">
          <span class="material-symbols-outlined text-[16px]">${t.icon}</span>
          <span class="text-body-sm">${escapeHtml(t.displayCategory)}</span>
        </div>
        <div class="col-span-4 sm:col-span-2 text-right text-numeric-data ${t.amountColorClass}">${t.displayAmount}</div>
      </div>`;
  }).join('');
}

function confirmDeleteExpense(id) {
  showConfirm('Delete Expense', 'Are you sure you want to delete this expense? This cannot be undone.', () => {
    deleteExpense(id);
    showToast('Expense deleted!');
    renderPage(currentPage);
  });
}

// ===== FRIENDS RENDERING =====
function renderFriends() {
  const txs = getFriendTransactions();

  // Calculate balances
  const balances = {};
  txs.forEach(t => {
    if (!balances[t.friendName]) balances[t.friendName] = 0;
    balances[t.friendName] += t.type === 'given' ? Number(t.amount) : -Number(t.amount);
  });

  // Summary cards
  let totalOwedToMe = 0, totalIOwe = 0, owedCount = 0, oweCount = 0;
  Object.values(balances).forEach(b => {
    if (b > 0) { totalOwedToMe += b; owedCount++; }
    else if (b < 0) { totalIOwe += Math.abs(b); oweCount++; }
  });
  const net = totalOwedToMe - totalIOwe;
  const netEl = $('#netBalance');
  netEl.textContent = (net >= 0 ? '+' : '-') + formatCurrency(Math.abs(net));
  netEl.className = 'text-display-lg tracking-tight ' + (net >= 0 ? 'text-secondary' : 'text-error');
  $('#totalOwedToMe').textContent = formatCurrency(totalOwedToMe);
  $('#owedToMeCount').textContent = `Across ${owedCount} friend${owedCount !== 1 ? 's' : ''}`;
  $('#totalIowe').textContent = formatCurrency(totalIOwe);
  $('#iOweCount').textContent = `Across ${oweCount} friend${oweCount !== 1 ? 's' : ''}`;

  // Friend list
  renderFriendList(balances);

  // If a friend is selected, render detail
  if (selectedFriend && balances[selectedFriend] !== undefined) {
    renderFriendDetail(selectedFriend, balances[selectedFriend], txs);
  } else {
    renderEmptyFriendDetail();
  }
}

const AVATAR_COLORS = ['#091426', '#006c49', '#ba1a1a', '#545f73', '#00714d', '#930013', '#3c475a', '#005236'];

function renderFriendList(balances) {
  const container = $('#friendBalances');
  const entries = Object.entries(balances);
  if (entries.length === 0) {
    container.innerHTML = '<p class="text-body-sm text-on-surface-variant text-center py-10">No friends yet. Add a transaction!</p>';
    return;
  }
  container.innerHTML = entries.map(([name, balance], idx) => {
    const isActive = selectedFriend === name;
    const color = AVATAR_COLORS[idx % AVATAR_COLORS.length];
    let balText, balClass;
    if (balance > 0) { balText = 'Owes you'; balClass = 'text-secondary'; }
    else if (balance < 0) { balText = 'You owe'; balClass = 'text-error'; }
    else { balText = 'Settled'; balClass = 'text-on-surface-variant'; }
    const amtText = balance !== 0 ? ((balance > 0 ? '+' : '-') + formatCurrency(Math.abs(balance))) : '₹0';

    return `
      <div class="bg-surface-container-lowest rounded-xl border ${isActive ? 'friend-card-active border-primary' : 'border-outline-variant'} shadow-sm p-4 cursor-pointer transition-all hover:shadow-md flex items-center justify-between mb-2"
           onclick="selectFriend('${escapeHtml(name)}')">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-body-md flex-shrink-0" style="background:${color}">${name.charAt(0).toUpperCase()}</div>
          <div>
            <p class="text-body-md font-semibold text-on-surface">${escapeHtml(name)}</p>
            <p class="text-body-sm ${balClass}">${balText}</p>
          </div>
        </div>
        <span class="text-numeric-data ${balClass} font-medium">${amtText}</span>
      </div>`;
  }).join('');
}

function selectFriend(name) {
  selectedFriend = name;
  renderFriends();
}

function renderFriendDetail(name, balance, allTxs) {
  const container = $('#friendDetail');
  const friendTxs = allTxs.filter(t => t.friendName === name).sort((a, b) => b.createdAt - a.createdAt);

  let balText, balClass;
  if (balance > 0) { balText = '+' + formatCurrency(balance); balClass = 'text-secondary'; }
  else if (balance < 0) { balText = '-' + formatCurrency(Math.abs(balance)); balClass = 'text-error'; }
  else { balText = '₹0 (Settled)'; balClass = 'text-on-surface-variant'; }

  const color = AVATAR_COLORS[Object.keys(getBalancesMap()).indexOf(name) % AVATAR_COLORS.length] || '#091426';

  container.innerHTML = `
    <!-- Header -->
    <div class="p-6 border-b border-outline-variant flex justify-between items-start">
      <div class="flex items-center gap-4">
        <div class="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-headline-md flex-shrink-0 shadow-sm" style="background:${color}">${name.charAt(0).toUpperCase()}</div>
        <div>
          <h2 class="text-headline-md text-on-surface">${escapeHtml(name)}</h2>
          <p class="text-body-md text-on-surface-variant mt-0.5">Total Balance: <span class="text-numeric-data ${balClass} font-bold">${balText}</span></p>
        </div>
      </div>
      <button onclick="openFriendModal()" class="bg-primary text-on-primary px-4 py-2 rounded-lg text-label-md hover:opacity-90 transition-opacity flex items-center gap-1">
        <span class="material-symbols-outlined text-[16px]">add</span> Add
      </button>
    </div>
    <!-- Transactions -->
    <div class="flex-1 p-6 overflow-y-auto">
      <h4 class="text-label-md text-on-surface-variant mb-3 uppercase tracking-wider">Recent Activity</h4>
      ${friendTxs.length === 0 ? '<p class="text-body-sm text-on-surface-variant text-center py-6">No transactions yet.</p>' :
      '<div class="space-y-1">' + friendTxs.map(t => {
        const isGiven = t.type === 'given';
        return `
          <div class="flex items-center justify-between py-2 border-b border-surface-container hover:bg-surface-container-low transition-colors px-1 rounded group">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-lg ${isGiven ? 'bg-error-container text-error' : 'bg-secondary-container/50 text-secondary'} flex items-center justify-center">
                <span class="material-symbols-outlined text-[18px]">${isGiven ? 'call_made' : 'call_received'}</span>
              </div>
              <div>
                <p class="text-body-md text-on-surface font-medium">${escapeHtml(t.reason)}</p>
                <p class="text-body-sm text-on-surface-variant">${formatDate(t.date)} • ${isGiven ? 'You paid' : 'They paid'}</p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-numeric-data ${isGiven ? 'text-error' : 'text-secondary'}">${isGiven ? '-' : '+'}${formatCurrency(t.amount)}</span>
              <div class="action-reveal flex gap-1">
                <button onclick="openFriendModal('${t.id}')" class="text-on-surface-variant hover:text-primary p-1 rounded hover:bg-surface-container" title="Edit">
                  <span class="material-symbols-outlined text-[16px]">edit</span>
                </button>
                <button onclick="confirmDeleteFriendTx('${t.id}')" class="text-on-surface-variant hover:text-error p-1 rounded hover:bg-error-container" title="Delete">
                  <span class="material-symbols-outlined text-[16px]">delete</span>
                </button>
              </div>
            </div>
          </div>`;
      }).join('') + '</div>'}
    </div>`;
}

function renderEmptyFriendDetail() {
  $('#friendDetail').innerHTML = `
    <div class="flex-1 flex items-center justify-center text-body-md text-on-surface-variant p-10">
      <div class="text-center">
        <span class="material-symbols-outlined text-[48px] text-outline-variant mb-3 block">group</span>
        <p>Select a friend to view details</p>
        <p class="text-body-sm mt-1">Or add a new transaction</p>
      </div>
    </div>`;
}

function getBalancesMap() {
  const txs = getFriendTransactions();
  const balances = {};
  txs.forEach(t => {
    if (!balances[t.friendName]) balances[t.friendName] = 0;
    balances[t.friendName] += t.type === 'given' ? Number(t.amount) : -Number(t.amount);
  });
  return balances;
}

function confirmDeleteFriendTx(id) {
  showConfirm('Delete Transaction', 'Are you sure you want to delete this friend transaction?', () => {
    deleteFriendTransaction(id);
    showToast('Transaction deleted!');
    renderFriends();
  });
}

// ===== EXPORT =====
function exportCSV() {
  const expenses = getExpenses();
  if (expenses.length === 0) { showToast('No expenses to export!', 'info'); return; }
  const headers = ['Date', 'Amount', 'Category', 'Description'];
  const rows = expenses.sort((a, b) => a.date.localeCompare(b.date))
    .map(e => [e.date, e.amount, getCategoryInfo(e.category).name, `"${e.description}"`]);
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `spendwise_${getToday()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('CSV exported!');
}

// ===== EVENT LISTENERS =====
document.addEventListener('DOMContentLoaded', () => {
  // Date display
  if ($('#currentDate')) {
    const now = new Date();
    $('#currentDate').textContent = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }

  viewMonth = getCurrentMonthStr();
  navigateTo('dashboard');

  // Load IndexedDB database
  initIndexedDBData();

  // Nav
  $$('.nav-link').forEach(link => {
    link.addEventListener('click', () => navigateTo(link.dataset.page));
  });

  // Mobile sidebar
  if ($('#menuToggle')) {
    $('#menuToggle').addEventListener('click', () => {
      if ($('#sidebar')) $('#sidebar').classList.toggle('open');
      if ($('#sidebarOverlay')) $('#sidebarOverlay').classList.toggle('active');
    });
  }
  if ($('#sidebarOverlay')) {
    $('#sidebarOverlay').addEventListener('click', () => {
      if ($('#sidebar')) $('#sidebar').classList.remove('open');
      if ($('#sidebarOverlay')) $('#sidebarOverlay').classList.remove('active');
    });
  }

  // Add Expense buttons
  $('#sidebarAddBtn').addEventListener('click', () => openExpenseModal());
  $('#addExpenseDashBtn').addEventListener('click', () => openExpenseModal());

  // Expense Modal
  $('#closeExpenseModal').addEventListener('click', closeExpenseModal);
  $('#expenseCancelBtn').addEventListener('click', closeExpenseModal);
  $('#expenseModal').addEventListener('click', (e) => { if (e.target === $('#expenseModal')) closeExpenseModal(); });

  // Expense form submit
  $('#expenseSubmitBtn').addEventListener('click', () => {
    const form = $('#expenseForm');
    const id = $('#expenseId').value;
    const descInput = $('#expenseDescription') ? $('#expenseDescription').value.trim() : '';
    const data = {
      amount: Number($('#expenseAmount').value),
      date: $('#expenseDate').value,
      category: $('#expenseCategory').value,
      description: descInput || 'Other',
    };
    if (!data.amount || !data.date || !data.category) {
      showToast('Please fill required fields (Amount, Date, Category)!', 'error');
      return;
    }
    if (id) {
      updateExpense(id, data);
      showToast('Expense updated!');
    } else {
      addExpense(data);
      showToast('Expense added: ' + formatCurrency(data.amount));
    }
    closeExpenseModal();
    renderPage(currentPage);
  });

  // Budget Modal
  $('#editBudgetBtn').addEventListener('click', openBudgetModal);
  $('#closeBudgetModal').addEventListener('click', closeBudgetModal);
  $('#cancelBudget').addEventListener('click', closeBudgetModal);
  $('#budgetModal').addEventListener('click', (e) => { if (e.target === $('#budgetModal')) closeBudgetModal(); });
  $('#saveBudget').addEventListener('click', () => {
    const amount = Number($('#budgetInput').value) || 0;
    setBudgetAmount(amount);
    closeBudgetModal();
    showToast('Budget set to ' + formatCurrency(amount));
    if (currentPage === 'dashboard') renderDashboard();
  });

  // Friend Modal
  $('#addFriendTxBtn').addEventListener('click', () => openFriendModal());
  $('#closeFriendModal').addEventListener('click', closeFriendModal);
  $('#friendCancelBtn').addEventListener('click', closeFriendModal);
  $('#friendModal').addEventListener('click', (e) => { if (e.target === $('#friendModal')) closeFriendModal(); });
  $('#typeGiven').addEventListener('click', () => setFriendTxType('given'));
  $('#typeTaken').addEventListener('click', () => setFriendTxType('taken'));

  // Friend form submit
  $('#friendSubmitBtn').addEventListener('click', async () => {
    const id = $('#friendTxId').value;
    const dueDateVal = $('#friendDueDate') ? $('#friendDueDate').value : '';
    const reasonInput = $('#friendReason') ? $('#friendReason').value.trim() : '';
    const data = {
      friendName: $('#friendName').value.trim(),
      amount: Number($('#friendAmount').value),
      type: friendTxType,
      reason: reasonInput || 'Other',
      date: $('#friendDate').value,
      dueDate: dueDateVal,
    };
    if (!data.friendName || !data.amount || !data.date) {
      showToast('Please fill required fields (Name, Amount, Date)!', 'error');
      return;
    }
    if (id) {
      await updateFriendTransaction(id, data);
      showToast('Transaction updated!');
    } else {
      await addFriendTransaction(data);
      const verb = data.type === 'given' ? 'Gave' : 'Received';
      showToast(`${verb} ${formatCurrency(data.amount)} ${data.type === 'given' ? 'to' : 'from'} ${data.friendName}`);

      // Auto-create Reminder if settlement date is provided
      if (dueDateVal) {
        const actionText = data.type === 'given' ? `Collect ₹${data.amount} from ${data.friendName} (${data.reason})` : `Return ₹${data.amount} to ${data.friendName} (${data.reason})`;
        await addReminder({
          text: actionText,
          category: 'Finance & Bills',
          priority: 'High',
          due: dueDateVal,
        });
        showToast('Auto-reminder set for settlement date!', 'info');
      }
    }
    selectedFriend = data.friendName;
    closeFriendModal();
    renderFriends();
    renderNotifications();
  });

  // Confirm dialog
  $('#confirmYes').addEventListener('click', () => {
    if (pendingDeleteCallback) pendingDeleteCallback();
    pendingDeleteCallback = null;
    $('#confirmModal').classList.remove('active');
  });
  $('#confirmNo').addEventListener('click', () => {
    pendingDeleteCallback = null;
    $('#confirmModal').classList.remove('active');
  });
  $('#confirmModal').addEventListener('click', (e) => {
    if (e.target === $('#confirmModal')) {
      pendingDeleteCallback = null;
      $('#confirmModal').classList.remove('active');
    }
  });

  // History filters
  $('#historySearch').addEventListener('input', applyHistoryFilters);
  $('#historyCategory').addEventListener('change', applyHistoryFilters);
  if ($('#historyPeriod')) $('#historyPeriod').addEventListener('change', applyHistoryFilters);
  if ($('#historyFromMonth')) $('#historyFromMonth').addEventListener('change', applyHistoryFilters);
  if ($('#historyToMonth')) $('#historyToMonth').addEventListener('change', applyHistoryFilters);

  $('#prevMonth').addEventListener('click', () => {
    const [y, m] = viewMonth.split('-').map(Number);
    const d = new Date(y, m - 2);
    viewMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    renderHistory();
  });
  $('#nextMonth').addEventListener('click', () => {
    const [y, m] = viewMonth.split('-').map(Number);
    const d = new Date(y, m);
    viewMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    renderHistory();
  });

  // Export
  if ($('#exportBtn')) $('#exportBtn').addEventListener('click', exportCSV);
  if ($('#dbModalBtn')) $('#dbModalBtn').addEventListener('click', openDbModal);

  // Bill Modal handlers
  $('#addBillBtn').addEventListener('click', () => openBillModal());
  $('#closeBillModal').addEventListener('click', closeBillModal);
  $('#billCancelBtn').addEventListener('click', closeBillModal);
  $('#billModal').addEventListener('click', (e) => { if (e.target === $('#billModal')) closeBillModal(); });
  $('#billSubmitBtn').addEventListener('click', () => {
    const id = $('#billId').value;
    const data = {
      title: $('#billTitle').value.trim(),
      amount: Number($('#billAmount').value),
      dueDate: $('#billDueDate').value.trim(),
      icon: $('#billIcon').value,
    };
    if (!data.title || !data.amount || !data.dueDate) {
      showToast('Please fill all fields!', 'error');
      return;
    }
    if (id) {
      updateBill(id, data);
      showToast('Bill updated!');
    } else {
      addBill(data);
      showToast('Bill added!');
    }
    closeBillModal();
    renderBills();
  });

  // Reminder Modal handlers
  $('#addReminderBtn').addEventListener('click', () => openReminderModal());
  $('#closeReminderModal').addEventListener('click', closeReminderModal);
  $('#reminderCancelBtn').addEventListener('click', closeReminderModal);
  $('#reminderModal').addEventListener('click', (e) => { if (e.target === $('#reminderModal')) closeReminderModal(); });
  $('#reminderSubmitBtn').addEventListener('click', async () => {
    const id = $('#reminderId').value;
    const data = {
      text: $('#reminderText').value.trim(),
      category: $('#reminderCategory') ? $('#reminderCategory').value : 'Personal',
      priority: $('#reminderPriority') ? $('#reminderPriority').value : 'Medium',
      due: $('#reminderDue').value.trim(),
    };
    if (!data.text || !data.due) {
      showToast('Please fill all fields!', 'error');
      return;
    }
    if (id) {
      await updateReminder(id, data);
      showToast('Reminder updated!');
    } else {
      await addReminder(data);
      showToast('Reminder added!');
    }
    closeReminderModal();
    renderReminders();
  });

  // Database & Backup Modal handlers
  $('#dbModalBtn').addEventListener('click', openDbModal);
  $('#closeDbModal').addEventListener('click', closeDbModal);
  $('#closeDbModalFooter').addEventListener('click', closeDbModal);
  $('#dbModal').addEventListener('click', (e) => { if (e.target === $('#dbModal')) closeDbModal(); });
  $('#downloadDbJsonBtn').addEventListener('click', exportDatabaseJSON);
  $('#importDbJsonInput').addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      importDatabaseJSON(e.target.files[0]);
    }
  });
  $('#resetAllDataBtn').addEventListener('click', resetDatabase);

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeExpenseModal();
      closeBudgetModal();
      closeFriendModal();
      closeBillModal();
      closeReminderModal();
      closeDbModal();
      pendingDeleteCallback = null;
      $('#confirmModal').classList.remove('active');
    }
  });
});

// ===== DATABASE & BACKUP MANAGEMENT =====
function openDbModal() {
  const expenses = getExpenses();
  const friends = getFriendTransactions();
  const bills = getBills();

  const countExp = $('#dbCountExpenses');
  const countFr = $('#dbCountFriends');
  const countBl = $('#dbCountBills');

  if (countExp) countExp.textContent = expenses.length;
  if (countFr) countFr.textContent = friends.length;
  if (countBl) countBl.textContent = bills.length;

  $('#dbModal').classList.add('active');
}

function closeDbModal() {
  $('#dbModal').classList.remove('active');
}

function exportDatabaseJSON() {
  const dbData = {
    appName: 'Spendly',
    version: '1.0',
    exportDate: new Date().toISOString(),
    expenses: getExpenses(),
    budget: getBudget(),
    friends: getFriendTransactions(),
    bills: getBills(),
    reminders: getReminders(),
  };

  const blob = new Blob([JSON.stringify(dbData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `spendly_db_backup_${getToday()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Database exported as JSON backup file!');
}

function importDatabaseJSON(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (data.budget) {
        state.budget = { amount: Number(data.budget.amount || data.budget) || 0 };
        await idbPut('budget', { key: 'main', amount: state.budget.amount });
      }
      if (data.expenses && Array.isArray(data.expenses)) {
        state.expenses = data.expenses;
        await idbClear('expenses');
        for (const item of data.expenses) await idbPut('expenses', item);
      }
      if (data.friends && Array.isArray(data.friends)) {
        state.friends = data.friends;
        await idbClear('friends');
        for (const item of data.friends) await idbPut('friends', item);
      }
      if (data.bills && Array.isArray(data.bills)) {
        state.bills = data.bills;
        await idbClear('bills');
        for (const item of data.bills) await idbPut('bills', item);
      }
      if (data.reminders && Array.isArray(data.reminders)) {
        state.reminders = data.reminders;
        await idbClear('reminders');
        for (const item of data.reminders) await idbPut('reminders', item);
      }

      showToast('IndexedDB database restored!');
      closeDbModal();
      renderPage(currentPage);
    } catch (err) {
      showToast('Invalid backup file!', 'error');
    }
  };
  reader.readAsText(file);
}

function resetDatabase() {
  showConfirm('Reset Database', 'WARNING: This will clear all data from browser IndexedDB! Continue?', async () => {
    localStorage.clear();
    localStorage.setItem('spendly_app_initialized', 'true');

    await idbClear('expenses');
    await idbClear('friends');
    await idbClear('bills');
    await idbClear('reminders');
    await idbClear('budget');

    state.budget = { amount: 0 };
    await idbPut('budget', { key: 'main', amount: 0 });
    state.expenses = [];
    state.friends = [];
    state.bills = [];
    state.reminders = [];

    showToast('Database reset successfully!');
    closeDbModal();
    renderPage(currentPage);
  });
}

// ===== UPCOMING BILLS & REMINDERS RENDERING =====
function renderUpcoming() {
  renderBills();
  renderReminders();
}

function renderBills() {
  const bills = getBills();
  const container = $('#billsGrid');
  if (!container) return;
  if (bills.length === 0) {
    container.innerHTML = '<p class="col-span-full text-body-sm text-on-surface-variant text-center py-10">No upcoming bills. Click "Add Bill" to create one!</p>';
    return;
  }

  container.innerHTML = bills.map(b => {
    const isPaid = b.paid;
    const badgeClass = isPaid ? 'bg-secondary-container/50 text-secondary' : (b.badgeClass || 'bg-tertiary-fixed text-on-tertiary-fixed');
    const iconBg = isPaid ? 'bg-secondary-container/50 text-secondary' : (b.iconBg || 'bg-primary-fixed text-on-primary-fixed');

    return `
      <div class="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between">
        <div>
          <div class="flex justify-between items-start mb-4">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full ${iconBg} flex items-center justify-center flex-shrink-0">
                <span class="material-symbols-outlined">${b.icon || 'receipt_long'}</span>
              </div>
              <div>
                <h4 class="text-headline-sm text-on-surface">${escapeHtml(b.title)}</h4>
                <span class="text-label-md ${badgeClass} px-2 py-0.5 rounded-full inline-block mt-1">${isPaid ? 'Paid' : escapeHtml(b.dueDate)}</span>
              </div>
            </div>
            <div class="flex items-center gap-1">
              <button onclick="openBillModal('${b.id}')" class="text-on-surface-variant hover:text-primary p-1 rounded" title="Edit">
                <span class="material-symbols-outlined text-[18px]">edit</span>
              </button>
              <button onclick="confirmDeleteBill('${b.id}')" class="text-on-surface-variant hover:text-error p-1 rounded" title="Delete">
                <span class="material-symbols-outlined text-[18px]">delete</span>
              </button>
            </div>
          </div>
          <div class="text-numeric-data text-headline-lg text-on-surface mb-6">${formatCurrency(b.amount)}</div>
        </div>
        <div>
          ${isPaid ? `
            <button onclick="handleToggleBillPaid('${b.id}')" class="w-full bg-surface-container-low border border-outline-variant text-on-surface-variant font-label-md py-2 rounded-lg hover:bg-surface-container transition-colors flex items-center justify-center gap-1">
              <span class="material-symbols-outlined text-[16px]">check_circle</span> Mark Unpaid
            </button>
          ` : `
            <button onclick="handleToggleBillPaid('${b.id}')" class="w-full bg-primary text-on-primary font-label-md py-2 rounded-lg hover:opacity-90 transition-opacity">
              Pay Now / Mark Paid
            </button>
          `}
        </div>
      </div>`;
  }).join('');
}

function handleToggleBillPaid(id) {
  toggleBillPaid(id);
  const bill = getBills().find(b => b.id === id);
  if (bill && bill.paid) {
    showToast(`Marked "${bill.title}" as Paid!`);
  } else if (bill) {
    showToast(`Marked "${bill.title}" as Unpaid`);
  }
  renderBills();
}

function confirmDeleteBill(id) {
  showConfirm('Delete Bill', 'Are you sure you want to delete this bill?', () => {
    deleteBill(id);
    showToast('Bill deleted');
    renderBills();
  });
}

function openBillModal(editId) {
  const modal = $('#billModal');
  if (editId) {
    const bill = getBills().find(b => b.id === editId);
    if (!bill) return;
    $('#billId').value = bill.id;
    $('#billTitle').value = bill.title;
    $('#billAmount').value = bill.amount;
    $('#billDueDate').value = bill.dueDate;
    $('#billIcon').value = bill.icon || 'receipt_long';
    $('#billFormTitle').textContent = 'Edit Bill';
    $('#billSubmitBtn').textContent = 'Save Changes';
  } else {
    $('#billForm').reset();
    $('#billId').value = '';
    $('#billFormTitle').textContent = 'Add Bill';
    $('#billSubmitBtn').textContent = 'Save Bill';
  }
  modal.classList.add('active');
  setTimeout(() => $('#billTitle').focus(), 200);
}
function closeBillModal() {
  $('#billModal').classList.remove('active');
}

function renderReminders() {
  const reminders = getReminders();
  const container = $('#remindersList');
  if (!container) return;
  if (reminders.length === 0) {
    container.innerHTML = '<p class="text-body-sm text-on-surface-variant text-center py-10">No reminders. Click "New Reminder" to create one!</p>';
    return;
  }

  container.innerHTML = reminders.map(r => {
    const isDone = r.completed;
    const priority = r.priority || 'Medium';
    const category = r.category || 'Personal';

    let priorityBadge = 'bg-amber-100 text-amber-800 border-amber-300';
    let priorityDot = '🟡';
    if (priority === 'High') {
      priorityBadge = 'bg-red-100 text-red-800 border-red-300';
      priorityDot = '🔴';
    } else if (priority === 'Low') {
      priorityBadge = 'bg-emerald-100 text-emerald-800 border-emerald-300';
      priorityDot = '🟢';
    }

    return `
      <div class="flex items-center gap-4 p-4 hover:bg-surface-container-low transition-colors group border-b border-surface-container-lowest last:border-0 ${isDone ? 'opacity-60' : ''}">
        <input class="w-5 h-5 rounded border-outline text-primary focus:ring-primary focus:ring-offset-surface-container-lowest cursor-pointer" 
               type="checkbox" ${isDone ? 'checked' : ''} onchange="handleToggleReminder('${r.id}')"/>
        <div class="flex-grow min-w-0 ${isDone ? 'line-through' : ''}">
          <div class="flex items-center gap-2 mb-1">
            <p class="text-body-md text-on-surface font-medium truncate">${escapeHtml(r.text)}</p>
            <span class="text-[11px] font-semibold px-2 py-0.5 rounded-full border ${priorityBadge} inline-flex items-center gap-1">${priorityDot} ${priority}</span>
            <span class="text-[11px] font-medium px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant">${escapeHtml(category)}</span>
          </div>
          <p class="text-body-sm text-on-surface-variant flex items-center gap-1">
            <span class="material-symbols-outlined text-[14px]">event</span>
            ${escapeHtml(r.due)}
          </p>
        </div>
        <div class="flex items-center gap-1 action-reveal">
          <button onclick="openReminderModal('${r.id}')" class="text-on-surface-variant hover:text-primary p-1 rounded" title="Edit">
            <span class="material-symbols-outlined text-[18px]">edit</span>
          </button>
          <button onclick="confirmDeleteReminder('${r.id}')" class="text-on-surface-variant hover:text-error p-1 rounded" title="Delete">
            <span class="material-symbols-outlined text-[18px]">delete</span>
          </button>
        </div>
      </div>`;
  }).join('');
}

function handleToggleReminder(id) {
  toggleReminderCompleted(id);
  renderReminders();
}

function confirmDeleteReminder(id) {
  showConfirm('Delete Reminder', 'Are you sure you want to delete this reminder?', async () => {
    await deleteReminder(id);
    showToast('Reminder deleted');
    renderReminders();
  });
}

function openReminderModal(editId) {
  const modal = $('#reminderModal');
  if (editId) {
    const reminder = getReminders().find(r => r.id === editId);
    if (!reminder) return;
    $('#reminderId').value = reminder.id;
    $('#reminderText').value = reminder.text || '';
    if ($('#reminderCategory')) $('#reminderCategory').value = reminder.category || 'Personal';
    if ($('#reminderPriority')) $('#reminderPriority').value = reminder.priority || 'Medium';
    $('#reminderDue').value = reminder.due || '';
    $('#reminderFormTitle').textContent = 'Edit Reminder';
    $('#reminderSubmitBtn').textContent = 'Save Changes';
  } else {
    $('#reminderForm').reset();
    $('#reminderId').value = '';
    if ($('#reminderCategory')) $('#reminderCategory').value = 'Personal';
    if ($('#reminderPriority')) $('#reminderPriority').value = 'Medium';
    $('#reminderFormTitle').textContent = 'New Reminder';
    $('#reminderSubmitBtn').textContent = 'Save Reminder';
  }
  modal.classList.add('active');
  setTimeout(() => $('#reminderText').focus(), 200);
}
function closeReminderModal() {
  $('#reminderModal').classList.remove('active');
}

/* ========================================
   NOTIFICATION CENTER & ALERTS ENGINE
   ======================================== */
let notifsReadState = false;

function getNotifPreferences() {
  const defaults = { push: true, expenseReminders: false, friendLedger: true, budgetAlerts: true };
  try {
    const stored = localStorage.getItem('spendly_notif_prefs');
    return stored ? { ...defaults, ...JSON.parse(stored) } : defaults;
  } catch (e) {
    return defaults;
  }
}

function renderNotifications() {
  const notifListEl = $('#notifList');
  const notifBadgeEl = $('#notifBadge');
  if (!notifListEl) return;

  const notifPrefs = getNotifPreferences();
  if (!notifPrefs.push) {
    if (notifBadgeEl) notifBadgeEl.classList.add('hidden');
    notifListEl.innerHTML = '<p class="text-body-sm text-on-surface-variant text-center py-8">Push Notifications are turned off in Settings.</p>';
    return;
  }

  const todayStr = getToday();
  const todayDate = new Date(todayStr);

  const notifications = [];

  // 1. Debt / Friend Ledger Due Reminders
  if (notifPrefs.friendLedger) {
    const friendTxs = getFriendTransactions();
    friendTxs.forEach(f => {
      if (f.dueDate) {
        const due = new Date(f.dueDate);
        const diffTime = due.getTime() - todayDate.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        const isGiven = f.type === 'given';
        const actionText = isGiven ? `Collect ${formatCurrency(f.amount)} from ${f.friendName}` : `Return ${formatCurrency(f.amount)} to ${f.friendName}`;

        if (diffDays === 1) {
          notifications.push({
            id: 'ftx_' + f.id,
            icon: 'event_upcoming',
            iconColor: 'text-amber-600',
            title: `⏰ Tomorrow Settlement Alert`,
            subtitle: `${actionText} (${f.reason})`,
            badge: 'Due Tomorrow',
            badgeStyle: 'bg-amber-100 text-amber-800 border-amber-300',
            page: 'friends',
            friendName: f.friendName
          });
        } else if (diffDays === 0) {
          notifications.push({
            id: 'ftx_' + f.id,
            icon: 'error_med',
            iconColor: 'text-error',
            title: `🚨 Settlement Due Today!`,
            subtitle: `${actionText} (${f.reason})`,
            badge: 'Due Today',
            badgeStyle: 'bg-red-100 text-red-800 border-red-300',
            page: 'friends',
            friendName: f.friendName
          });
        }
      }
    });
  }

  // 2. Active Reminders
  const reminders = getReminders();
  reminders.filter(r => !r.completed).forEach(r => {
    notifications.push({
      id: 'rem_' + r.id,
      icon: 'alarm',
      iconColor: 'text-secondary',
      title: `🔔 Reminder: ${r.text}`,
      subtitle: `Priority: ${r.priority || 'Medium'} • Due: ${r.due}`,
      badge: r.priority === 'High' ? '🔴 High' : 'Reminder',
      badgeStyle: r.priority === 'High' ? 'bg-red-100 text-red-800 border-red-300' : 'bg-surface-container text-on-surface-variant',
      page: 'upcoming'
    });
  });

  // 3. Budget Alerts
  if (notifPrefs.budgetAlerts) {
    const budget = getBudget();
    const monthExpenses = getExpenses().filter(e => e.date.startsWith(getCurrentMonthStr()));
    const totalSpent = monthExpenses.reduce((s, e) => s + Number(e.amount), 0);
    if (budget.amount > 0 && totalSpent > (budget.amount * 0.8)) {
      notifications.push({
        id: 'bg_warning',
        icon: 'warning',
        iconColor: 'text-error',
        title: `⚠️ Budget Warning!`,
        subtitle: `Spent ${formatCurrency(totalSpent)} (${Math.round((totalSpent / budget.amount) * 100)}% of ${formatCurrency(budget.amount)} budget)`,
        badge: totalSpent > budget.amount ? 'Over Budget' : '80% Spent',
        badgeStyle: 'bg-red-100 text-red-800 border-red-300',
        page: 'dashboard'
      });
    }
  }

  // Render Badge
  if (notifBadgeEl) {
    if (notifications.length > 0 && !notifsReadState) {
      notifBadgeEl.textContent = notifications.length;
      notifBadgeEl.classList.remove('hidden');
    } else {
      notifBadgeEl.classList.add('hidden');
    }
  }

  // Render Items
  if (notifications.length === 0) {
    notifListEl.innerHTML = '<p class="text-body-sm text-on-surface-variant text-center py-8">No active notifications</p>';
    return;
  }

  notifListEl.innerHTML = notifications.map(n => `
    <div onclick="handleNotifClick('${n.page}', '${n.friendName || ''}')" class="p-3 hover:bg-surface-container-low transition-colors rounded-xl cursor-pointer flex items-start gap-3 border-b border-surface-container-low last:border-0">
      <div class="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center flex-shrink-0 mt-0.5 ${n.iconColor}">
        <span class="material-symbols-outlined text-[18px]">${n.icon}</span>
      </div>
      <div class="flex-grow min-w-0">
        <div class="flex items-center justify-between gap-1 mb-0.5">
          <h4 class="text-body-sm font-semibold text-primary truncate">${escapeHtml(n.title)}</h4>
          <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full border ${n.badgeStyle} flex-shrink-0">${n.badge}</span>
        </div>
        <p class="text-label-md text-on-surface-variant truncate">${escapeHtml(n.subtitle)}</p>
      </div>
    </div>
  `).join('');
}

function handleNotifClick(page, friendName) {
  $('#notifDropdown').classList.remove('active');
  navigateTo(page);
  if (friendName) {
    selectFriend(friendName);
  }
}

function setupNotificationListeners() {
  const notifBtn = $('#notifBtn');
  const notifDropdown = $('#notifDropdown');
  const markReadBtn = $('#markNotifsReadBtn');

  if (notifBtn && notifDropdown) {
    notifBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      notifDropdown.classList.toggle('active');
      renderNotifications();
    });

    document.addEventListener('click', (e) => {
      if (!notifDropdown.contains(e.target) && !notifBtn.contains(e.target)) {
        notifDropdown.classList.remove('active');
      }
    });
  }

  if (markReadBtn) {
    markReadBtn.addEventListener('click', () => {
      notifsReadState = true;
      const notifBadgeEl = $('#notifBadge');
      if (notifBadgeEl) notifBadgeEl.classList.add('hidden');
      showToast('All notifications marked as read', 'info');
    });
  }

  // Initial scan
  renderNotifications();
}

/* ========================================
   SETTINGS PAGE LOGIC
   ======================================== */
function applyCustomColorCSS(hexColor) {
  let styleEl = $('#dynamicCustomThemeStyle');
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'dynamicCustomThemeStyle';
    document.head.appendChild(styleEl);
  }
  styleEl.textContent = `
    [data-accent="custom"] .bg-primary { background-color: ${hexColor} !important; }
    [data-accent="custom"] .text-primary { color: ${hexColor} !important; }
    [data-accent="custom"] .border-primary { border-color: ${hexColor} !important; }
    [data-accent="custom"] .tab-indicator { background-color: ${hexColor} !important; }
  `;
}

function removeCustomColorCSS() {
  const styleEl = $('#dynamicCustomThemeStyle');
  if (styleEl) styleEl.textContent = '';
}

function applyAppearanceSettings() {
  const isDark = localStorage.getItem('spendly_dark_mode') === 'true';
  const savedAccent = localStorage.getItem('spendly_accent_color') || 'blue';
  const customColor = localStorage.getItem('spendly_custom_color') || '#091426';

  if (isDark) {
    document.body.classList.add('dark-mode');
  } else {
    document.body.classList.remove('dark-mode');
  }

  document.documentElement.setAttribute('data-accent', savedAccent);

  if (savedAccent === 'custom' && customColor) {
    applyCustomColorCSS(customColor);
  } else {
    removeCustomColorCSS();
  }

  const darkToggle = $('#darkModeToggle');
  if (darkToggle) darkToggle.checked = isDark;

  const wheelInput = $('#customColorWheel');
  const hexLabel = $('#customColorHexLabel');
  if (wheelInput) wheelInput.value = customColor;
  if (hexLabel) hexLabel.textContent = customColor.toUpperCase();

  $$('#themeColorGrid .theme-color-btn').forEach(btn => {
    const themeName = btn.getAttribute('data-theme');
    const checkMark = btn.querySelector('.check-mark');
    if (themeName === savedAccent) {
      btn.classList.add('active', 'border-primary');
      btn.classList.remove('border-outline-variant/60');
      if (checkMark) checkMark.classList.remove('hidden');
    } else {
      btn.classList.remove('active', 'border-primary');
      btn.classList.add('border-outline-variant/60');
      if (checkMark) checkMark.classList.add('hidden');
    }
  });
}

function updateSidebarProfile() {
  const savedName = localStorage.getItem('spendly_user_name') || '';
  const savedAvatar = localStorage.getItem('spendly_user_avatar') || '';

  const firstName = savedName.trim() ? savedName.trim().split(' ')[0] : 'User';

  const nameEl = $('#sidebarUserFirstName');
  if (nameEl) nameEl.textContent = firstName;

  const avatarIcon = $('#sidebarUserAvatarIcon');
  const avatarImg = $('#sidebarUserAvatarImg');
  if (avatarIcon && avatarImg) {
    if (savedAvatar) {
      avatarImg.src = savedAvatar;
      avatarImg.classList.remove('hidden');
      avatarIcon.classList.add('hidden');
    } else {
      avatarImg.classList.add('hidden');
      avatarIcon.classList.remove('hidden');
    }
  }
}

function renderSettings() {
  const savedName = localStorage.getItem('spendly_user_name') || '';
  const savedCurrency = localStorage.getItem('spendly_user_currency') || '₹';
  const savedAvatar = localStorage.getItem('spendly_user_avatar') || '';
  const savedDateFormat = localStorage.getItem('spendly_date_format') || 'DD/MM/YYYY';

  if ($('#settingsUserName')) $('#settingsUserName').value = savedName;
  if ($('#settingsCurrency')) $('#settingsCurrency').value = savedCurrency;
  if ($('#settingsDateFormat')) $('#settingsDateFormat').value = savedDateFormat;
  if ($('#profileDisplayNameHead')) $('#profileDisplayNameHead').textContent = savedName || 'User Profile';
  if ($('#appInfoDeveloperName')) $('#appInfoDeveloperName').textContent = savedName || 'Mahendra Kewat';

  // Avatar Image Sync
  const avatarIcon = $('#profileAvatarIcon');
  const avatarImg = $('#profileAvatarImg');
  if (avatarIcon && avatarImg) {
    if (savedAvatar) {
      avatarImg.src = savedAvatar;
      avatarImg.classList.remove('hidden');
      avatarIcon.classList.add('hidden');
    } else {
      avatarImg.classList.add('hidden');
      avatarIcon.classList.remove('hidden');
    }
  }

  // Sync Notification Toggles
  const notifPrefs = getNotifPreferences();
  if ($('#notifPushToggle')) $('#notifPushToggle').checked = !!notifPrefs.push;
  if ($('#notifExpenseRemindersToggle')) $('#notifExpenseRemindersToggle').checked = !!notifPrefs.expenseReminders;
  if ($('#notifFriendLedgerToggle')) $('#notifFriendLedgerToggle').checked = !!notifPrefs.friendLedger;
  if ($('#notifBudgetAlertsToggle')) $('#notifBudgetAlertsToggle').checked = !!notifPrefs.budgetAlerts;

  // Sync Appearance Settings
  applyAppearanceSettings();

  // Update Sidebar Profile Badge
  updateSidebarProfile();
}

function setupSettingsListeners() {
  // Settings Sub-Nav Tab Switching
  $$('.settings-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');

      $$('.settings-tab-btn').forEach(b => {
        b.classList.remove('active', 'bg-surface-container', 'text-primary');
        b.classList.add('text-on-surface-variant');
        const ind = b.querySelector('.tab-indicator');
        if (ind) ind.classList.add('hidden');
      });

      btn.classList.add('active', 'bg-surface-container', 'text-primary');
      btn.classList.remove('text-on-surface-variant');
      const activeInd = btn.querySelector('.tab-indicator');
      if (activeInd) activeInd.classList.remove('hidden');

      $$('.settings-tab-content').forEach(content => {
        content.classList.add('hidden');
        content.classList.remove('active');
      });

      const targetContent = $(`#tab-content-${targetTab}`);
      if (targetContent) {
        targetContent.classList.remove('hidden');
        targetContent.classList.add('active');
      }
    });
  });

  // Profile Photo Upload & Remove
  const photoInput = $('#profilePhotoInput');
  if (photoInput) {
    photoInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        const base64Img = evt.target.result;
        localStorage.setItem('spendly_user_avatar', base64Img);
        showToast('Profile photo updated!');
        renderSettings();
      };
      reader.readAsDataURL(file);
    });
  }

  const removePhotoBtn = $('#removeProfilePhotoBtn');
  if (removePhotoBtn) {
    removePhotoBtn.addEventListener('click', () => {
      localStorage.removeItem('spendly_user_avatar');
      showToast('Profile photo removed');
      renderSettings();
    });
  }

  // Save / Toggle Profile Edit Mode (Top Right White Icon Button)
  const saveProfileBtn = $('#saveProfileSettingsBtn');
  let isProfileEditMode = false;

  if (saveProfileBtn) {
    saveProfileBtn.addEventListener('click', () => {
      const controls = $('#profilePhotoControls');
      const cameraBadge = $('#profilePhotoCameraBadge');
      const editFields = $('#profileEditFields');

      if (!isProfileEditMode) {
        // Enter Edit Mode
        isProfileEditMode = true;
        if (controls) controls.classList.remove('hidden');
        if (cameraBadge) cameraBadge.classList.remove('hidden');
        if (editFields) editFields.classList.remove('hidden');

        saveProfileBtn.innerHTML = `<span class="material-symbols-outlined text-[16px] text-white">check</span>`;
        saveProfileBtn.title = "Save Profile";
        if ($('#settingsUserName')) $('#settingsUserName').focus();
        showToast('Edit mode enabled. Make your changes and click Save.', 'info');
      } else {
        // Save Changes & Exit Edit Mode
        const nameVal = $('#settingsUserName') ? $('#settingsUserName').value.trim() : '';
        const currencyVal = $('#settingsCurrency') ? $('#settingsCurrency').value : '₹';

        localStorage.setItem('spendly_user_name', nameVal);
        localStorage.setItem('spendly_user_currency', currencyVal);

        isProfileEditMode = false;
        if (controls) controls.classList.add('hidden');
        if (cameraBadge) cameraBadge.classList.add('hidden');
        if (editFields) editFields.classList.add('hidden');

        saveProfileBtn.innerHTML = `<span class="material-symbols-outlined text-[16px] text-white">edit</span>`;
        saveProfileBtn.title = "Update Profile";

        showToast('Profile updated successfully!');
        renderSettings();
        if (currentPage === 'dashboard') renderDashboard();
      }
    });
  }

  // Regional & Format Preferences Listeners
  const currencySelect = $('#settingsCurrency');
  if (currencySelect) {
    currencySelect.addEventListener('change', (e) => {
      localStorage.setItem('spendly_user_currency', e.target.value);
      showToast(`Currency format updated to ${e.target.value}!`);
      if (currentPage === 'dashboard') renderDashboard();
    });
  }

  const dateFormatSelect = $('#settingsDateFormat');
  if (dateFormatSelect) {
    dateFormatSelect.addEventListener('change', (e) => {
      localStorage.setItem('spendly_date_format', e.target.value);
      showToast(`Date format updated to ${e.target.value}!`);
    });
  }

  // Delete Account & Reset Data
  const deleteAccountBtn = $('#deleteAccountBtn');
  if (deleteAccountBtn) {
    deleteAccountBtn.addEventListener('click', () => {
      showConfirm('Delete Account & Clear Data', 'WARNING: Are you sure you want to delete your account and wipe all IndexedDB data? This action cannot be undone.', async () => {
        await idbClear('expenses');
        await idbClear('friends');
        await idbClear('bills');
        await idbClear('reminders');
        await idbClear('budget');
        localStorage.clear();
        showToast('Account deleted and data reset!', 'error');
        setTimeout(() => location.reload(), 1000);
      });
    });
  }

  // Save Notification Preferences
  const saveNotifBtn = $('#saveNotifPreferencesBtn');
  if (saveNotifBtn) {
    saveNotifBtn.addEventListener('click', () => {
      const prefs = {
        push: $('#notifPushToggle') ? $('#notifPushToggle').checked : true,
        expenseReminders: $('#notifExpenseRemindersToggle') ? $('#notifExpenseRemindersToggle').checked : false,
        friendLedger: $('#notifFriendLedgerToggle') ? $('#notifFriendLedgerToggle').checked : true,
        budgetAlerts: $('#notifBudgetAlertsToggle') ? $('#notifBudgetAlertsToggle').checked : true
      };
      localStorage.setItem('spendly_notif_prefs', JSON.stringify(prefs));
      showToast('Notification preferences saved!');
      renderNotifications();
    });
  }

  // Dark Theme Mode Switch
  const darkToggle = $('#darkModeToggle');
  if (darkToggle) {
    darkToggle.addEventListener('change', (e) => {
      const isChecked = e.target.checked;
      localStorage.setItem('spendly_dark_mode', isChecked ? 'true' : 'false');
      applyAppearanceSettings();
      showToast(isChecked ? 'Dark Mode enabled!' : 'Light Mode enabled!');
    });
  }

  // Accent Color Theme Palette Buttons
  $$('#themeColorGrid .theme-color-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const selectedTheme = btn.getAttribute('data-theme');
      localStorage.setItem('spendly_accent_color', selectedTheme);
      applyAppearanceSettings();
      showToast(`Theme accent changed to ${btn.innerText.trim()}!`);
    });
  });

  // Custom Color Wheel Picker Listener
  const colorWheel = $('#customColorWheel');
  if (colorWheel) {
    colorWheel.addEventListener('input', (e) => {
      const selectedHex = e.target.value;
      localStorage.setItem('spendly_custom_color', selectedHex);
      localStorage.setItem('spendly_accent_color', 'custom');
      applyAppearanceSettings();
    });
    colorWheel.addEventListener('change', (e) => {
      showToast(`Custom theme color set to ${e.target.value.toUpperCase()}!`);
    });
  }

  // Data & Privacy Panel Event Listeners
  if ($('#privacyExportCsvBtn')) $('#privacyExportCsvBtn').addEventListener('click', exportCSV);
  if ($('#privacyExportPdfBtn')) $('#privacyExportPdfBtn').addEventListener('click', exportPDF);
  if ($('#privacyBackupJsonBtn')) $('#privacyBackupJsonBtn').addEventListener('click', exportDatabaseJSON);
  if ($('#privacyClearAllDataBtn')) $('#privacyClearAllDataBtn').addEventListener('click', resetDatabase);

  // Privacy Policy Modal Handlers
  const openPrivacyModalBtn = $('#openPrivacyPolicyModalBtn');
  const privacyModal = $('#privacyPolicyModal');
  const closePrivacyModalBtn = $('#closePrivacyPolicyModal');
  const privacyCloseBtn = $('#privacyPolicyCloseBtn');

  if (openPrivacyModalBtn && privacyModal) {
    openPrivacyModalBtn.addEventListener('click', () => {
      privacyModal.classList.add('active');
    });
  }
  if (closePrivacyModalBtn && privacyModal) {
    closePrivacyModalBtn.addEventListener('click', () => {
      privacyModal.classList.remove('active');
    });
  }
  if (privacyCloseBtn && privacyModal) {
    privacyCloseBtn.addEventListener('click', () => {
      privacyModal.classList.remove('active');
    });
  }

  // Restore JSON Backup File (Data & Privacy + Settings)
  const handleRestoreFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const importedData = JSON.parse(evt.target.result);
        if (importedData && (importedData.expenses || importedData.budget)) {
          showConfirm('Restore Database Backup', 'WARNING: This will overwrite your current IndexedDB data with the backup file. Continue?', async () => {
            if (importedData.expenses) {
              await idbClear('expenses');
              for (const item of importedData.expenses) await idbPut('expenses', item);
              state.expenses = importedData.expenses;
            }
            if (importedData.friends) {
              await idbClear('friends');
              for (const item of importedData.friends) await idbPut('friends', item);
              state.friends = importedData.friends;
            }
            if (importedData.bills) {
              await idbClear('bills');
              for (const item of importedData.bills) await idbPut('bills', item);
              state.bills = importedData.bills;
            }
            if (importedData.reminders) {
              await idbClear('reminders');
              for (const item of importedData.reminders) await idbPut('reminders', item);
              state.reminders = importedData.reminders;
            }
            if (importedData.budget) {
              await idbClear('budget');
              await idbPut('budget', { key: 'main', amount: importedData.budget.amount || 0 });
              state.budget = importedData.budget;
            }
            showToast('Database backup restored successfully!');
            renderPage(currentPage);
          });
        } else {
          showToast('Invalid backup JSON file structure!', 'error');
        }
      } catch (err) {
        showToast('Failed to read backup file!', 'error');
      }
    };
    reader.readAsText(file);
  };

  if ($('#privacyRestoreJsonInput')) $('#privacyRestoreJsonInput').addEventListener('change', handleRestoreFile);
  if ($('#settingsImportJsonInput')) $('#settingsImportJsonInput').addEventListener('change', handleRestoreFile);

  // App Info List Item Modals (Feedback, Contact, Terms)
  // 1. Feedback Modal Handlers
  const feedbackRow = $('#appInfoFeedbackRow');
  const feedbackModal = $('#feedbackModal');
  const closeFeedbackModal = $('#closeFeedbackModal');
  const cancelFeedbackBtn = $('#cancelFeedbackBtn');
  const feedbackForm = $('#feedbackForm');
  const starBtns = $$('#starRatingContainer .star-btn');
  const starRatingVal = $('#feedbackRatingValue');
  const starRatingLbl = $('#starRatingLabel');

  const starLabels = {
    1: 'Poor (1 Star)',
    2: 'Fair (2 Stars)',
    3: 'Good (3 Stars)',
    4: 'Very Good (4 Stars)',
    5: 'Excellent (5 Stars)'
  };

  const updateStarRating = (rating) => {
    if (starRatingVal) starRatingVal.value = rating;
    if (starRatingLbl) starRatingLbl.textContent = starLabels[rating] || `${rating} Stars`;

    starBtns.forEach(btn => {
      const starNum = parseInt(btn.getAttribute('data-star') || '1');
      if (starNum <= rating) {
        btn.className = 'star-btn text-amber-400 p-1 focus:outline-none transition-transform hover:scale-110';
        btn.innerHTML = `<span class="material-symbols-outlined text-[32px] fill-current">star</span>`;
      } else {
        btn.className = 'star-btn text-outline-variant p-1 focus:outline-none transition-transform hover:scale-110';
        btn.innerHTML = `<span class="material-symbols-outlined text-[32px]">star_border</span>`;
      }
    });
  };

  if (starBtns) {
    starBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const starNum = parseInt(btn.getAttribute('data-star') || '5');
        updateStarRating(starNum);
      });
    });
  }

  if (feedbackRow && feedbackModal) {
    feedbackRow.addEventListener('click', () => {
      updateStarRating(5);
      if ($('#feedbackText')) $('#feedbackText').value = '';
      feedbackModal.classList.add('active');
    });
  }
  if (closeFeedbackModal && feedbackModal) {
    closeFeedbackModal.addEventListener('click', () => feedbackModal.classList.remove('active'));
  }
  if (cancelFeedbackBtn && feedbackModal) {
    cancelFeedbackBtn.addEventListener('click', () => feedbackModal.classList.remove('active'));
  }
  // Feedback Preview Modal Handlers
  const feedbackPreviewModal = $('#feedbackPreviewModal');
  const closeFeedbackPreviewModal = $('#closeFeedbackPreviewModal');
  const openGmailWebBtn = $('#openGmailWebBtn');
  const copyFeedbackTextBtn = $('#copyFeedbackTextBtn');
  let currentFeedbackData = { subject: '', body: '', rating: '5' };

  if (closeFeedbackPreviewModal && feedbackPreviewModal) {
    closeFeedbackPreviewModal.addEventListener('click', () => feedbackPreviewModal.classList.remove('active'));
  }

  if (openGmailWebBtn) {
    openGmailWebBtn.addEventListener('click', () => {
      const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=mahendrakewat0905@gmail.com&su=${encodeURIComponent(currentFeedbackData.subject)}&body=${encodeURIComponent(currentFeedbackData.body)}`;
      window.open(gmailUrl, '_blank');
      if (feedbackPreviewModal) feedbackPreviewModal.classList.remove('active');
      showToast('Opening Gmail web compose screen...', 'info');
    });
  }

  if (copyFeedbackTextBtn) {
    copyFeedbackTextBtn.addEventListener('click', () => {
      const fullText = `To: mahendrakewat0905@gmail.com\nSubject: ${currentFeedbackData.subject}\n\n${currentFeedbackData.body}`;
      navigator.clipboard.writeText(fullText);
      showToast('Feedback email text copied to clipboard!');
    });
  }

  if (feedbackForm) {
    feedbackForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const ratingVal = $('#feedbackRatingValue') ? $('#feedbackRatingValue').value : '5';
      const categoryVal = $('#feedbackCategory') ? $('#feedbackCategory').value : 'General Feedback';
      const textVal = $('#feedbackText') ? $('#feedbackText').value.trim() : '';

      if (!textVal) {
        showToast('Please enter your feedback details.', 'error');
        return;
      }

      currentFeedbackData = {
        rating: ratingVal,
        subject: `Spendly Feedback [${ratingVal} Stars] - ${categoryVal}`,
        body: `Rating: ${ratingVal} / 5 Stars\nCategory: ${categoryVal}\n\nFeedback:\n${textVal}`
      };

      if ($('#previewFeedbackRatingBadge')) $('#previewFeedbackRatingBadge').textContent = `★ ${ratingVal} Stars`;
      if ($('#previewFeedbackSubject')) $('#previewFeedbackSubject').textContent = `Subject: ${currentFeedbackData.subject}`;
      if ($('#previewFeedbackBody')) $('#previewFeedbackBody').textContent = currentFeedbackData.body;

      if (feedbackModal) feedbackModal.classList.remove('active');
      if (feedbackPreviewModal) feedbackPreviewModal.classList.add('active');
      if ($('#feedbackText')) $('#feedbackText').value = '';
    });
  }

  // 2. Contact Us Modal Handlers
  const contactRow = $('#appInfoContactRow');
  const contactModal = $('#contactModal');
  const closeContactModal = $('#closeContactModal');
  const closeContactModalBtn = $('#closeContactModalBtn');
  const copyEmailBtn = $('#copyContactEmailBtn');

  if (contactRow && contactModal) {
    contactRow.addEventListener('click', () => {
      contactModal.classList.add('active');
    });
  }
  if (closeContactModal && contactModal) {
    closeContactModal.addEventListener('click', () => contactModal.classList.remove('active'));
  }
  if (closeContactModalBtn && contactModal) {
    closeContactModalBtn.addEventListener('click', () => contactModal.classList.remove('active'));
  }
  if (copyEmailBtn) {
    copyEmailBtn.addEventListener('click', () => {
      navigator.clipboard.writeText('mahendrakewat0905@gmail.com');
      showToast('Support email copied to clipboard!');
    });
  }

  // Global Event Delegation for Modals Open & Close
  document.addEventListener('click', (e) => {
    // 1. Universal Close Handler (X icon, Close button, Cancel button)
    const closeBtn = e.target.closest('#closeTermsModal, #closeTermsModalBtn, #closeContactModal, #closeContactModalBtn, #closeFeedbackModal, #cancelFeedbackBtn, #closeFeedbackPreviewModal, #closePrivacyPolicyModal, #privacyPolicyCloseBtn');
    if (closeBtn) {
      const activeModal = closeBtn.closest('.modal-overlay');
      if (activeModal) activeModal.classList.remove('active');
    }

    // 2. Open App Info List Modals
    const feedbackTarget = e.target.closest('#appInfoFeedbackRow');
    if (feedbackTarget) {
      const fbModal = $('#feedbackModal');
      if (fbModal) {
        updateStarRating(5);
        if ($('#feedbackText')) $('#feedbackText').value = '';
        fbModal.classList.add('active');
      }
    }

    const contactTarget = e.target.closest('#appInfoContactRow');
    if (contactTarget) {
      const ctModal = $('#contactModal');
      if (ctModal) ctModal.classList.add('active');
    }

    const termsTarget = e.target.closest('#appInfoTermsRow');
    if (termsTarget) {
      const tmModal = $('#termsModal');
      if (tmModal) tmModal.classList.add('active');
    }
  });
}

function exportPDF() {
  const expenses = getExpenses();
  const currency = localStorage.getItem('spendly_user_currency') || '₹';
  const userName = localStorage.getItem('spendly_user_name') || 'User';

  if (!expenses || expenses.length === 0) {
    showToast('No expenses available to export!', 'error');
    return;
  }

  let printContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Spendly Financial Statement Report</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 24px; color: #1e293b; }
        h1 { color: #091426; font-size: 24px; margin-bottom: 4px; }
        p { color: #64748b; font-size: 13px; margin-top: 0; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #cbd5e1; padding: 10px 12px; text-align: left; font-size: 13px; }
        th { background-color: #f1f5f9; font-weight: bold; }
        .amount { text-align: right; font-weight: bold; }
        .header-bg { background-color: #f8fafc; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 20px; }
      </style>
    </head>
    <body>
      <div class="header-bg">
        <h1>Spendly Financial Statement Report</h1>
        <p>Generated for <strong>${userName}</strong> on ${new Date().toLocaleDateString('en-GB')}</p>
      </div>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Title</th>
            <th>Category</th>
            <th>Payment Mode</th>
            <th class="amount">Amount (${currency})</th>
          </tr>
        </thead>
        <tbody>
          ${expenses.map(e => `
            <tr>
              <td>${e.date || ''}</td>
              <td>${e.title || ''}</td>
              <td>${e.category || ''}</td>
              <td>${e.paymentMethod || 'Cash'}</td>
              <td class="amount">${currency}${parseFloat(e.amount || 0).toLocaleString('en-IN')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  printWindow.document.write(printContent);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 500);
}

// Attach listeners to DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  applyAppearanceSettings();
  updateSidebarProfile();

  const sidebarProfile = $('#sidebarUserProfile');
  if (sidebarProfile) {
    sidebarProfile.addEventListener('click', () => {
      navigateTo('settings');
    });
  }

  setTimeout(() => {
    setupNotificationListeners();
    setupSettingsListeners();
  }, 300);
});
