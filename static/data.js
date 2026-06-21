/* ===========================================================
   data.js — categories, currency, sample data, storage layer
   Plain JS (no Babel). Exposes window.Finance.
   =========================================================== */
(function () {
  // ---- categories order matters for charts/legend ----
  const DEFAULT_CATEGORIES = [
    { id: 'food',          label: 'Food',          color: '#f8c8d8' },
    { id: 'transport',     label: 'Transport',     color: '#bcd9f0' },
    { id: 'entertainment', label: 'Entertainment', color: '#d9c9ef' },
    { id: 'essentials',    label: 'Essentials',    color: '#bfe3c8' },
    { id: 'maimai',        label: 'Maimai',        color: '#f7ecc0' },
    { id: 'others',        label: 'Others',        color: '#f6d2bf' },
  ];
  const CATEGORIES = DEFAULT_CATEGORIES.map(c => ({ ...c }));
  const CAT_BY_ID = {};
  function rebuildIndex() {
    for (const k in CAT_BY_ID) delete CAT_BY_ID[k];
    CATEGORIES.forEach(c => { CAT_BY_ID[c.id] = c; });
  }
  function ensureOthers() {
    if (!CAT_BY_ID['others']) {
      const o = { id: 'others', label: 'Others', color: '#f6d2bf' };
      CATEGORIES.push(o); CAT_BY_ID['others'] = o;
    }
  }
  // replace the category list in place (CATEGORIES is const → mutate, don't reassign)
  function applyCategoryList(list) {
    CATEGORIES.length = 0;
    if (Array.isArray(list) && list.length) {
      list.forEach(c => {
        if (c && c.id) CATEGORIES.push({ id: c.id, label: c.label, color: c.color, ...(c.custom ? { custom: true } : {}) });
      });
    } else {
      DEFAULT_CATEGORIES.forEach(c => CATEGORIES.push({ ...c }));
    }
    rebuildIndex();
    ensureOthers();
  }
  rebuildIndex();

  const CAT_KEY = 'omori-cats-v2';   // v2: stores the FULL list (defaults included)
  try {
    const raw = localStorage.getItem(CAT_KEY);
    if (raw) { const l = JSON.parse(raw); if (Array.isArray(l) && l.length) applyCategoryList(l); }
  } catch (e) {}

  function saveCats() {
    try { localStorage.setItem(CAT_KEY, JSON.stringify(CATEGORIES)); } catch (e) {}
  }
  function addCategory(label, color) {
    const id = 'c' + Math.random().toString(36).slice(2, 7);
    const c = { id, label: label.trim(), color, custom: true };
    CATEGORIES.push(c); CAT_BY_ID[id] = c; saveCats();
    return c;
  }
  function updateCategory(id, patch) {
    const c = CAT_BY_ID[id];
    if (!c || !patch) return;
    if (patch.label != null) c.label = String(patch.label).trim() || c.label;
    if (patch.color != null) c.color = patch.color;
    saveCats();
  }
  function removeCategory(id) {
    if (id === 'others') return;        // the fallback sink can't be removed
    const c = CAT_BY_ID[id];
    if (!c) return;
    const i = CATEGORIES.indexOf(c);
    if (i >= 0) CATEGORIES.splice(i, 1);
    delete CAT_BY_ID[id];
    saveCats();
  }
  // replace the whole list wholesale (used when the server doc loads)
  function setCategories(list) { applyCategoryList(list); saveCats(); }

  // ---- currency: SGD ----
  const fmt = new Intl.NumberFormat('en-SG', {
    style: 'currency', currency: 'SGD', minimumFractionDigits: 2,
  });
  function money(n) { return fmt.format(n); }

  // ---- entry accounting: cash (balance) and spend (category charts) are SEPARATE ----
  // cashOf  = signed effect on your balance (0 when no money actually moved)
  // spendOf = amount that counts as category spending (consumption)
  //   in         income            cash +amt   spend 0
  //   out        normal expense    cash −amt   spend +amt
  //   loan       I paid for them   cash −amt   spend 0     (a receivable, not my expense)
  //   cover      they paid for me  cash  0     spend +amt  (my consumption; I owe them)
  //   friend_cash cash/repayment   cash +/-amt spend 0
  //   settle_out I paid them back  cash −amt   spend 0
  //   settle_in  they paid me back cash +amt   spend 0
  //   neutral    (legacy)          == cover
  function cashOf(e) {
    const a = Math.abs(+e.amount || 0);
    switch (e.type) {
      case 'in': case 'settle_in': return a;
      case 'out': case 'loan': case 'settle_out': return -a;
      case 'friend_cash': return (e.cashDir === 'in' || e.cashSign === 1 || e.signedAmount < 0) ? a : -a;
      default: return 0;                       // cover / neutral → no cash moved
    }
  }
  function spendOf(e) {
    const a = Math.abs(+e.amount || 0);
    return (e.type === 'out' || e.type === 'cover' || e.type === 'neutral') ? a : 0;
  }
  function moneyShort(n) {
    const a = Math.abs(n);
    if (a >= 1000) return '$' + (n / 1000).toFixed(a >= 10000 ? 0 : 1) + 'k';
    return '$' + n.toFixed(0);
  }

  // ---- date helpers ----
  function iso(d) { return d.toISOString().slice(0, 10); }
  function daysAgo(n) { const d = new Date(); d.setDate(d.getDate() - n); return iso(d); }

  // ---- sample entries (type: 'out' expense | 'in' income) ----
  // amounts in SGD. Spread across ~10 weeks for the time chart.
  const SAMPLE_ENTRIES = [
    { id: 'e1',  date: daysAgo(1),  type: 'out', cat: 'food',          amount: 12.80, note: 'Chicken rice + kopi' },
    { id: 'e2',  date: daysAgo(1),  type: 'out', cat: 'maimai',        amount: 9.00,  note: '3 credits @ Bugis' },
    { id: 'e3',  date: daysAgo(2),  type: 'out', cat: 'transport',     amount: 4.20,  note: 'MRT to school' },
    { id: 'e4',  date: daysAgo(3),  type: 'out', cat: 'entertainment', amount: 26.00, note: 'Movie w/ Aubrey' },
    { id: 'e5',  date: daysAgo(4),  type: 'in',  cat: 'others',        amount: 350.00,note: 'Freelance art payment' },
    { id: 'e6',  date: daysAgo(5),  type: 'out', cat: 'food',          amount: 18.50, note: 'Hotpot dinner' },
    { id: 'e7',  date: daysAgo(6),  type: 'out', cat: 'essentials',    amount: 42.30, note: 'Groceries' },
    { id: 'e8',  date: daysAgo(8),  type: 'out', cat: 'maimai',        amount: 15.00, note: 'Weekend grind' },
    { id: 'e9',  date: daysAgo(10), type: 'out', cat: 'transport',     amount: 11.00, note: 'Grab home (rain)' },
    { id: 'e10', date: daysAgo(12), type: 'out', cat: 'entertainment', amount: 13.90, note: 'Spotify + manga' },
    { id: 'e11', date: daysAgo(14), type: 'in',  cat: 'others',        amount: 200.00,note: 'Allowance' },
    { id: 'e12', date: daysAgo(16), type: 'out', cat: 'food',          amount: 7.40,  note: 'Bubble tea run' },
    { id: 'e13', date: daysAgo(19), type: 'out', cat: 'essentials',    amount: 29.90, note: 'Art markers' },
    { id: 'e14', date: daysAgo(22), type: 'out', cat: 'maimai',        amount: 12.00, note: 'After lecture' },
    { id: 'e15', date: daysAgo(25), type: 'out', cat: 'food',          amount: 21.10, note: 'Ramen + gyoza' },
    { id: 'e16', date: daysAgo(28), type: 'out', cat: 'transport',     amount: 4.20,  note: 'MRT' },
    { id: 'e17', date: daysAgo(33), type: 'in',  cat: 'others',        amount: 120.00,note: 'Sold old games' },
    { id: 'e18', date: daysAgo(38), type: 'out', cat: 'entertainment', amount: 48.00, note: 'Concert merch' },
    { id: 'e19', date: daysAgo(45), type: 'out', cat: 'food',          amount: 16.30, note: 'Cafe study session' },
    { id: 'e20', date: daysAgo(52), type: 'out', cat: 'essentials',    amount: 55.00, note: 'Phone bill' },
    { id: 'e21', date: daysAgo(60), type: 'in',  cat: 'others',        amount: 200.00,note: 'Allowance' },
    { id: 'e22', date: daysAgo(66), type: 'out', cat: 'maimai',        amount: 18.00, note: 'Tournament entry' },
  ];

  // ---- friends who owe me (multiple items per person) ----
  // paid = amount paid back so far (remaining = amount − paid). d9 fully repaid.
  const SAMPLE_DEBTS = [
    { id: 'd1',  name: 'Aubrey', amount: 26.00, reason: 'Movie ticket',    date: daysAgo(3),  paid: 0 },
    { id: 'd2',  name: 'Aubrey', amount: 8.50,  reason: 'Popcorn + drinks', date: daysAgo(3),  paid: 0 },
    { id: 'd3',  name: 'Aubrey', amount: 14.00, reason: 'Lunch at mall',     date: daysAgo(11), paid: 0 },
    { id: 'd4',  name: 'Kel',    amount: 9.00,  reason: 'Maimai credits',    date: daysAgo(1),  paid: 0 },
    { id: 'd5',  name: 'Kel',    amount: 3.80,  reason: 'Bus fare',          date: daysAgo(6),  paid: 0 },
    { id: 'd6',  name: 'Hero',   amount: 42.00, reason: 'Hotpot split',      date: daysAgo(5),  paid: 0 },
    { id: 'd7',  name: 'Hero',   amount: 18.00, reason: 'Groceries cover',   date: daysAgo(13), paid: 0 },
    { id: 'd8',  name: 'Hero',   amount: 6.50,  reason: 'Kopi run',          date: daysAgo(2),  paid: 0 },
    { id: 'd9',  name: 'Basil',  amount: 7.40,  reason: 'Bubble tea',        date: daysAgo(16), paid: 7.40 },
    { id: 'd10', name: 'Basil',  amount: 22.00, reason: 'Camera film',       date: daysAgo(9),  paid: 0 },
    { id: 'd11', name: 'Mari',   amount: 31.50, reason: 'Concert tickets',   date: daysAgo(8),  paid: 0 },
    { id: 'd12', name: 'Mari',   amount: 12.00, reason: 'Picnic snacks',     date: daysAgo(20), paid: 0 },
  ];

  // ---- savings goals (a portion of your balance, tucked aside per goal) ----
  const SAMPLE_SAVINGS = [
    { id: 's1', name: 'New drawing tablet', target: 600,  saved: 120, color: '#bcd9f0' },
    { id: 's2', name: 'Japan trip',         target: 2000, saved: 90,  color: '#d9c9ef' },
    { id: 's3', name: 'Rainy day fund',      target: 1000, saved: 60,  color: '#bfe3c8' },
  ];

  function uid() { return 'x' + Math.random().toString(36).slice(2, 9); }

  // ---- STORAGE LAYER ----------------------------------------------------
  // Server-backed, with localStorage as an offline mirror.
  //
  //   load()  : async. Tries GET /api/finance (open to everyone). Falls back
  //             to the localStorage mirror, then to the built-in sample data.
  //   save()  : async + debounced. ALWAYS mirrors to localStorage (so edits
  //             survive a reload even before you've unlocked). If an edit
  //             password is remembered, it also PUTs to the server.
  //
  // The password is kept in localStorage (NOT a cookie) so you don't have to
  // retype it every visit. setPassword() flushes the current state to the
  // server immediately — that's how edits made while "locked" get synced once
  // you unlock. Status changes are broadcast via onStatus() for the UI chip.
  // ----------------------------------------------------------------------
  const KEY = 'omori-finance-v1';   // localStorage mirror of the data
  const PW_KEY = 'omori-edit-pw';   // remembered edit password (not a cookie)
  const DIRTY_KEY = 'omori-dirty-v1'; // '1' while the mirror holds edits the server hasn't confirmed
  const API = '/api/finance';
  const DEBOUNCE_MS = 600;

  // dirty = local edits not yet acknowledged by the server. Used so a stale
  // server doc never clobbers unsynced local edits on the next load().
  function isDirty() { try { return localStorage.getItem(DIRTY_KEY) === '1'; } catch (e) { return false; } }
  function setDirty(v) {
    try { if (v) localStorage.setItem(DIRTY_KEY, '1'); else localStorage.removeItem(DIRTY_KEY); } catch (e) {}
  }

  // upgrade legacy debts: paid was a bool (true=fully repaid, false=open) and is
  // now a number = amount paid back so far.
  function normalizeDebts(list) {
    return (list || []).map(d => {
      let paid = d.paid;
      if (paid === true) paid = d.amount;
      else if (paid === false || paid == null) paid = 0;
      else paid = +paid || 0;
      const dir = d.dir === 'iowe' ? 'iowe' : 'owed';   // 'owed' = friend owes me · 'iowe' = I owe friend
      return { ...d, paid, dir };
    });
  }
  function withSavings(s) {
    if (!s || typeof s !== 'object') return null;
    if (!Array.isArray(s.savings)) s.savings = SAMPLE_SAVINGS.slice();
    if (!Array.isArray(s.entries)) s.entries = [];
    s.debts = normalizeDebts(Array.isArray(s.debts) ? s.debts : []);
    return s;
  }
  function sample() {
    return { entries: SAMPLE_ENTRIES.slice(), debts: SAMPLE_DEBTS.slice(), savings: SAMPLE_SAVINGS.slice() };
  }
  function readMirror() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return withSavings(JSON.parse(raw));
    } catch (e) {}
    return null;
  }
  function writeMirror(state) {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  }

  // ----- password helpers -----
  function getPassword() {
    try { return localStorage.getItem(PW_KEY) || ''; } catch (e) { return ''; }
  }
  function hasPassword() { return !!getPassword(); }

  // ----- status broadcast -----
  // 'readonly' = no password set (local-only) · 'saving' · 'saved'
  // 'offline'  = server unreachable · 'unauthorized' = wrong password
  let status = hasPassword() ? 'saved' : 'readonly';
  const statusListeners = new Set();
  function setStatus(s) {
    status = s;
    statusListeners.forEach(cb => { try { cb(s); } catch (e) {} });
  }

  let lastState = null;      // most recent state handed to save()
  let saveTimer = null;

  function pushToServer(state, opts) {
    const pw = getPassword();
    if (!pw) { setStatus('readonly'); return; }   // can't sync → stays dirty until unlocked
    setStatus('saving');
    return fetch(API, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-Edit-Password': pw },
      body: JSON.stringify(state),
      keepalive: !!(opts && opts.keepalive),       // let the PUT outlive an unloading page
    }).then(res => {
      if (res.status === 401) { clearPassword(); setStatus('unauthorized'); return; }
      if (!res.ok) { setStatus('offline'); return; }
      setDirty(false); setStatus('saved');         // server confirmed → mirror is clean
    }).catch(() => { setStatus('offline'); });
  }

  function setPassword(pw) {
    try { localStorage.setItem(PW_KEY, pw); } catch (e) {}
    // flush whatever we currently hold so prior (locked) edits get synced
    return pushToServer(lastState || readMirror() || sample());
  }
  function clearPassword() {
    try { localStorage.removeItem(PW_KEY); } catch (e) {}
    setStatus('readonly');
  }

  const Store = {
    // synchronous best-guess for first paint (mirror or sample); load() then
    // refreshes from the server.
    cached() { lastState = readMirror() || sample(); return lastState; },
    load() {
      return fetch(API, { headers: { 'Accept': 'application/json' } })
        .then(res => {
          if (res.status === 204) return null;       // nothing saved yet
          if (!res.ok) throw new Error('bad status');
          return res.json();
        })
        .then(data => {
          const s = withSavings(data);
          // local edits the server hasn't confirmed win — don't let a stale
          // server doc overwrite them. Re-push the mirror to catch the server up.
          if (isDirty()) {
            const mine = readMirror();
            if (mine) { lastState = mine; pushToServer(mine); return mine; }
          }
          if (s) { writeMirror(s); setDirty(false); lastState = s; return s; }
          // server empty → keep whatever we have locally (or sample)
          return readMirror() || sample();
        })
        .catch(() => {
          setStatus(hasPassword() ? 'offline' : 'readonly');
          return readMirror() || sample();
        });
    },
    save(state) {
      lastState = state;
      writeMirror(state);                 // always keep the offline mirror fresh
      setDirty(true);                     // unsynced until the server confirms
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = setTimeout(() => { saveTimer = null; pushToServer(state); }, DEBOUNCE_MS);
    },
    // push any pending/debounced edit to the server right now (used on page exit)
    flush(opts) {
      if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
      if (lastState && isDirty()) return pushToServer(lastState, opts);
    },
    reset() {
      try { localStorage.removeItem(KEY); } catch (e) {}
      const s = sample();
      lastState = s;
      return s;
    },
    // ----- password / sync controls (used by Settings) -----
    setPassword, clearPassword, getPassword, hasPassword,
    getStatus() { return status; },
    onStatus(cb) { statusListeners.add(cb); cb(status); return () => statusListeners.delete(cb); },
  };

  // flush a pending save when the tab is hidden/closed so the last edit (still
  // inside the debounce window) isn't lost. keepalive keeps the PUT alive.
  const flushNow = () => Store.flush({ keepalive: true });
  window.addEventListener('pagehide', flushNow);
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushNow();
  });

  window.Finance = {
    CATEGORIES, CAT_BY_ID, money, moneyShort, iso, daysAgo, uid, Store,
    addCategory, updateCategory, removeCategory, setCategories,
    cashOf, spendOf,
  };
})();
