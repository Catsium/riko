/* ===========================================================
   app.jsx — OMORI Finance Tracker dashboard
   single font · black-OR-white theme · calendar · debt tracker
   draggable + resizable widget board (desktop) / stacked (mobile)
   =========================================================== */
const { useState: uS, useEffect: uE, useMemo: uM, useRef: uR } = React;
const A = window.Finance;

/* fade out + remove the boot splash once the app is ready */
function hideSplash() {
  const s = document.getElementById('boot-splash');
  if (!s || s.classList.contains('hide')) return;
  s.classList.add('hide');
  setTimeout(() => { if (s.parentNode) s.parentNode.removeChild(s); }, 600);
}

/* ----- date / bucket helpers ----- */
function dnum(d) { return d.toISOString().slice(0, 10); }
function shiftDays(n) { const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate() + n); return d; }
function rangeStartISO(tf) {
  if (tf === 'week') return dnum(shiftDays(-6));
  if (tf === 'month') return dnum(shiftDays(-29));
  if (tf === 'year') return dnum(shiftDays(-364));
  return '0000-01-01';
}
const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DOW = ['Su','Mo','Tu','We','Th','Fr','Sa'];
function buildBuckets(tf, entries) {
  const today = shiftDays(0);
  if (tf === 'week') {
    return Array.from({ length: 7 }, (_, i) => {
      const d = shiftDays(-6 + i);
      return { label: DOW[d.getDay()], start: dnum(d), end: dnum(d) };
    });
  }
  if (tf === 'month') {
    return Array.from({ length: 5 }, (_, i) => {
      const s = shiftDays(-34 + i * 7), e = shiftDays(-34 + i * 7 + 6);
      return { label: (s.getDate()) + '/' + (s.getMonth() + 1), start: dnum(s), end: dnum(e > today ? today : e) };
    });
  }
  let months = 12;
  if (tf === 'all' && entries.length) {
    const earliest = entries.reduce((m, e) => e.date < m ? e.date : m, entries[0].date);
    const ed = new Date(earliest);
    months = Math.min(12, Math.max(3, (today.getFullYear() - ed.getFullYear()) * 12 + (today.getMonth() - ed.getMonth()) + 1));
  }
  return Array.from({ length: months }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth() - (months - 1 - i), 1);
    const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    const end = new Date(next - 1);
    return { label: MON[d.getMonth()], start: dnum(d), end: dnum(end) };
  });
}
/* buckets for a custom [start,end] span. Granularity auto-scales by length:
   ≤14 days → daily · ≤92 days → weekly · else monthly (spans months/years). */
function buildBucketsRange(startIso, endIso) {
  const s = new Date(startIso + 'T00:00:00'), e = new Date(endIso + 'T00:00:00');
  if (e < s) return [];
  const days = Math.round((e - s) / 86400000) + 1;
  if (days <= 14) {
    return Array.from({ length: days }, (_, i) => {
      const d = new Date(s); d.setDate(s.getDate() + i);
      return { label: d.getDate() + '/' + (d.getMonth() + 1), start: dnum(d), end: dnum(d) };
    });
  }
  if (days <= 92) {
    const n = Math.ceil(days / 7);
    return Array.from({ length: n }, (_, i) => {
      const a = new Date(s); a.setDate(s.getDate() + i * 7);
      const b = new Date(s); b.setDate(s.getDate() + i * 7 + 6);
      return { label: a.getDate() + '/' + (a.getMonth() + 1), start: dnum(a), end: dnum(b > e ? e : b) };
    });
  }
  const months = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth()) + 1;
  return Array.from({ length: months }, (_, i) => {
    const d = new Date(s.getFullYear(), s.getMonth() + i, 1);
    const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    const bEnd = new Date(next - 1);
    return { label: MON[d.getMonth()], start: dnum(d < s ? s : d), end: dnum(bEnd > e ? e : bEnd) };
  });
}

/* ----- widget board layout ----- */
const BOARD_W = 1040;
const BOARD_BP = 1160; // below this → stacked mobile/tablet layout
const WIDGET_ORDER = ['summary', 'category', 'time', 'breakdown', 'inout', 'ledger', 'friends', 'savings'];
const WIDGET_META = {
  summary:   { title: 'SUMMARY',            accent: '#f6d2bf' },
  category:  { title: 'BY CATEGORY',        accent: '#f8c8d8' },
  time:      { title: 'OVER TIME',          accent: '#bcd9f0' },
  breakdown: { title: 'CATEGORY BREAKDOWN', accent: '#d9c9ef' },
  inout:     { title: 'IN vs OUT',          accent: '#bfe3c8' },
  ledger:    { title: 'LEDGER',             accent: '#f7ecc0' },
  friends:   { title: 'FRIEND BALANCES',    accent: '#f7ecc0' },
  savings:   { title: 'SAVINGS',            accent: '#bfe3c8' },
};
const DEFAULT_LAYOUT = {
  summary:   { x: 0,   y: 0,   w: 248, h: 440 },
  category:  { x: 264, y: 0,   w: 516, h: 366 },
  friends:   { x: 796, y: 0,   w: 256, h: 540 },
  time:      { x: 264, y: 382, w: 252, h: 360 },
  inout:     { x: 528, y: 382, w: 252, h: 360 },
  breakdown: { x: 0,   y: 456, w: 248, h: 312 },
  savings:   { x: 796, y: 556, w: 256, h: 452 },
  ledger:    { x: 264, y: 758, w: 516, h: 396 },
};
const LAYOUT_KEY = 'omori-layout-v4';

const THEMES = [
  { id: 'light', label: 'WHITE',      sw: '#fbfbf8' },
  { id: 'dark',  label: 'BLACK',      sw: '#0c0c0c' },
  { id: 'sepia', label: 'SEPIA',      sw: '#f0e2c6' },
  { id: 'mint',  label: 'MINT',       sw: '#dcefe2' },
  { id: 'ink',   label: 'NIGHT BLUE', sw: '#1b2740' },
];
const CAT_PALETTE = ['#f8c8d8', '#bcd9f0', '#d9c9ef', '#bfe3c8', '#f7ecc0', '#f6d2bf', '#cdbba8', '#aee0dc', '#e6b8d0', '#c8d8a8'];
const DARKISH = { dark: true, ink: true };
function loadLayout() {
  try {
    const raw = localStorage.getItem(LAYOUT_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      const merged = {};
      WIDGET_ORDER.forEach(id => { merged[id] = { ...DEFAULT_LAYOUT[id], ...(saved[id] || {}) }; });
      return merged;
    }
  } catch (e) {}
  return JSON.parse(JSON.stringify(DEFAULT_LAYOUT));
}

/* ----- draggable / resizable card shell -----
   `positioned` = laid out absolutely by its rect (board mode), independent of
   `draggable` = drag/resize interaction enabled (edit mode). Keeping these
   separate means leaving edit mode never drops the saved x/y/w/h. */
function CardShell({ title, accent, children, rect, onChange, positioned, draggable, contentPad = '14px 16px', headerAction, onRemove }) {
  // mode === 'move' → reposition. otherwise a resize dirs set {l,r,t,b}.
  const startDrag = (e, mode) => {
    if (e.button != null && e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const sx = e.clientX, sy = e.clientY;
    const o = { ...rect };
    const move = (ev) => {
      const dx = ev.clientX - sx, dy = ev.clientY - sy;
      if (mode === 'move') {
        onChange({ x: Math.max(0, Math.min(BOARD_W - o.w, o.x + dx)), y: Math.max(0, o.y + dy) });
        return;
      }
      const d = mode;                       // { l,r,t,b }
      let nx = o.x, ny = o.y, nw = o.w, nh = o.h;
      if (d.r) nw = Math.max(200, Math.min(BOARD_W - o.x, o.w + dx));
      if (d.b) nh = Math.max(150, o.h + dy);
      if (d.l) { nx = Math.max(0, Math.min(o.x + o.w - 200, o.x + dx)); nw = o.x + o.w - nx; }
      if (d.t) { ny = Math.max(0, Math.min(o.y + o.h - 150, o.y + dy)); nh = o.y + o.h - ny; }
      onChange({ x: nx, y: ny, w: nw, h: nh });
    };
    const up = () => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
    };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
  };

  const outer = positioned
    ? { position: 'absolute', left: rect.x, top: rect.y, width: rect.w, height: rect.h }
    : { position: 'relative', width: '100%' };

  // 8 resize handles (edges + corners), only when draggable
  const HANDLES = [
    { k: 'n',  d: { t: 1 },        css: { top: -3, left: 12, right: 12, height: 8, cursor: 'ns-resize' } },
    { k: 's',  d: { b: 1 },        css: { bottom: -3, left: 12, right: 12, height: 8, cursor: 'ns-resize' } },
    { k: 'e',  d: { r: 1 },        css: { right: -3, top: 12, bottom: 12, width: 8, cursor: 'ew-resize' } },
    { k: 'w',  d: { l: 1 },        css: { left: -3, top: 12, bottom: 12, width: 8, cursor: 'ew-resize' } },
    { k: 'ne', d: { t: 1, r: 1 },  css: { top: -4, right: -4, width: 14, height: 14, cursor: 'nesw-resize' } },
    { k: 'nw', d: { t: 1, l: 1 },  css: { top: -4, left: -4, width: 14, height: 14, cursor: 'nwse-resize' } },
    { k: 'se', d: { b: 1, r: 1 },  css: { bottom: -4, right: -4, width: 14, height: 14, cursor: 'nwse-resize' } },
    { k: 'sw', d: { b: 1, l: 1 },  css: { bottom: -4, left: -4, width: 14, height: 14, cursor: 'nesw-resize' } },
  ];

  return (
    <div style={outer}
      onPointerDown={draggable ? (e) => startDrag(e, 'move') : undefined}>
      <WobbleFrame fill="var(--paper)" stroke="var(--ink)" strokeWidth="2.6" radius="3" pad="3"
        style={{ height: positioned ? '100%' : 'auto' }}
        innerStyle={{ height: '100%', display: 'flex', flexDirection: 'column', padding: 0, position: 'relative', overflow: 'hidden', borderRadius: 3 }}>
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
            flex: '0 0 auto',
            cursor: draggable ? 'grab' : 'default', touchAction: 'none', userSelect: 'none',
          }}>
          <span style={{ width: 13, height: 13, background: accent, border: '2px solid var(--ink)', flex: '0 0 auto' }} />
          <span className="pixel" style={{ fontSize: 18 }}>{title}</span>
          {headerAction && (
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}
              onPointerDown={(e) => e.stopPropagation()}>
              {headerAction}
            </div>
          )}
        </div>
        <div style={{ flex: 1, overflow: positioned ? 'auto' : 'visible', padding: contentPad, minHeight: 0 }}>
          {children}
        </div>
      </WobbleFrame>
      {draggable && HANDLES.map(h => (
        <div key={h.k} onPointerDown={(e) => startDrag(e, h.d)} title="drag to resize"
          style={{ position: 'absolute', touchAction: 'none', zIndex: 4, ...h.css }} />
      ))}
      {onRemove && (
        <button onClick={onRemove} title="remove this tab" onPointerDown={(e) => e.stopPropagation()}
          style={{
            position: 'absolute', top: -11, right: -11, width: 26, height: 26, borderRadius: '50%', zIndex: 6,
            border: '2px solid var(--ink)', background: 'var(--paper)', color: 'var(--ink)',
            fontSize: 14, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
          }}>✕</button>
      )}
    </div>
  );
}

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "wobble": 7,
  "boilSpeed": "normal",
  "layout": "free",
  "grain": true
}/*EDITMODE-END*/;

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [state, setState] = uS(() => A.Store.cached());   // sync mirror/sample for first paint
  const [syncStatus, setSyncStatus] = uS(() => A.Store.getStatus());
  const didLoad = uR(false);
  const [layout, setLayout] = uS(() => loadLayout());
  const [catFilter, setCatFilter] = uS('all');
  const [timeframe, setTimeframe] = uS('month');
  const [selectedDate, setSelectedDate] = uS(null);
  const [customRange, setCustomRange] = uS(null);   // { start, end } ISO — overrides timeframe
  const [filterOpen, setFilterOpen] = uS(false); // single merged filter panel
  const [modal, setModal] = uS(false);
  const [friendModal, setFriendModal] = uS(null);   // friend name
  const [bucketModal, setBucketModal] = uS(null);    // { bucket, total }
  const [catModal, setCatModal] = uS(null);          // category object
  const [settingsOpen, setSettingsOpen] = uS(false);
  const [addImageOpen, setAddImageOpen] = uS(false);
  const [addGoalOpen, setAddGoalOpen] = uS(false);
  const [savingsGoalId, setSavingsGoalId] = uS(null);
  const [catVer, setCatVer] = uS(0);                 // bump to re-render after add/remove category
  const [theme, setTheme] = uS(() => { try { return localStorage.getItem('omori-theme2') || 'light'; } catch (e) { return 'light'; } });
  const [fontScale, setFontScale] = uS(() => { try { return parseFloat(localStorage.getItem('omori-fontscale')) || 1; } catch (e) { return 1; } });
  const [vw, setVw] = uS(() => window.innerWidth);
  const [stickers, setStickers] = uS(() => {
    try { return JSON.parse(localStorage.getItem('omori-stickers-v1')) || []; } catch (e) { return []; }
  });
  const [hidden, setHidden] = uS(() => {
    try { return JSON.parse(localStorage.getItem('omori-hidden-v1')) || []; } catch (e) { return []; }
  });
  const [customTheme, setCustomTheme] = uS(() => {
    try { return JSON.parse(localStorage.getItem('omori-customtheme-v1')) || null; } catch (e) { return null; }
  });
  const [editMode, setEditMode] = uS(false);
  const [addMenuOpen, setAddMenuOpen] = uS(false);
  const [themesOpen, setThemesOpen] = uS(false);
  const [catMgrOpen, setCatMgrOpen] = uS(false);
  const editSnapshot = uR(null);

  uE(() => {
    const onResize = () => setVw(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  const isBoard = vw >= BOARD_BP;
  // Mobile: don't shrink — let the stacked cards use the FULL viewport width
  // (handled by CSS media queries instead). Keep the user's fontScale intact.
  const mobileZoom = 1;

  // initial load from the server (open read) + subscribe to sync status.
  // The server doc carries BOTH the finance data AND the UI prefs
  // (layout / scaling / theme / images / custom categories) so they roam
  // across devices. On phones the saved board layout is ignored at render time
  // (we always stack), so a desktop arrangement auto-formats on mobile.
  uE(() => {
    let alive = true;
    A.Store.load().then(doc => {
      if (!alive) return;
      if (doc) {
        setState({ entries: doc.entries || [], debts: doc.debts || [], savings: doc.savings || [] });
        if (doc.layout && typeof doc.layout === 'object') {
          const merged = {};
          WIDGET_ORDER.forEach(id => { merged[id] = { ...DEFAULT_LAYOUT[id], ...(doc.layout[id] || {}) }; });
          setLayout(merged);
        }
        if (typeof doc.fontScale === 'number' && doc.fontScale > 0) setFontScale(doc.fontScale);
        if (doc.theme) setTheme(doc.theme);
        if (Array.isArray(doc.stickers)) setStickers(doc.stickers);
        if (Array.isArray(doc.hidden)) setHidden(doc.hidden);
        if ('customTheme' in doc) setCustomTheme(doc.customTheme || null);
        if (Array.isArray(doc.cats) && doc.cats.length) { A.setCategories(doc.cats); setCatVer(v => v + 1); }
      }
      didLoad.current = true;   // now safe to persist user edits
      hideSplash();
    });
    const off = A.Store.onStatus(setSyncStatus);
    const splashTimer = setTimeout(hideSplash, 4000); // fallback if load hangs
    return () => { alive = false; off(); clearTimeout(splashTimer); };
  }, []);

  // persist EVERYTHING (data + prefs) as one server doc. Skip until the initial
  // server load resolved so we never push the placeholder/sample over real data.
  uE(() => {
    if (!didLoad.current) return;
    A.Store.save({
      entries: state.entries, debts: state.debts, savings: state.savings,
      layout, fontScale, theme, stickers, hidden, customTheme,
      cats: A.CATEGORIES,
    });
  }, [state, layout, fontScale, theme, stickers, catVer, hidden, customTheme]);

  // keep the per-key localStorage mirrors too (instant first paint next visit)
  uE(() => { try { localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout)); } catch (e) {} }, [layout]);
  uE(() => {
    try { localStorage.setItem('omori-stickers-v1', JSON.stringify(stickers)); }
    catch (e) { /* data-URL of a big GIF can blow the quota — keep going */ }
  }, [stickers]);
  uE(() => { try { localStorage.setItem('omori-hidden-v1', JSON.stringify(hidden)); } catch (e) {} }, [hidden]);
  uE(() => {
    try {
      if (customTheme) localStorage.setItem('omori-customtheme-v1', JSON.stringify(customTheme));
      else localStorage.removeItem('omori-customtheme-v1');
    } catch (e) {}
  }, [customTheme]);

  // custom theme: inline CSS-var overrides (win over the preset theme class) +
  // an injected @font-face / Google-Fonts <link> for a user-supplied font.
  uE(() => {
    const r = document.documentElement;
    const FONT_ID = 'custom-font-el';
    let el = document.getElementById(FONT_ID);
    const ct = customTheme || {};
    if (ct.bg) { r.style.setProperty('--paper', ct.bg); r.style.setProperty('--paper-2', ct.bg); }
    else { r.style.removeProperty('--paper'); r.style.removeProperty('--paper-2'); }
    if (ct.text) r.style.setProperty('--ink', ct.text); else r.style.removeProperty('--ink');

    if (ct.fontUrl && ct.fontFamily) {
      const url = String(ct.fontUrl).trim();
      const isCss = /fonts\.googleapis\.com|\.css(\?|$)/i.test(url);
      const want = isCss ? 'LINK' : 'STYLE';
      if (el && el.tagName !== want) { el.remove(); el = null; }
      if (!el) { el = document.createElement(isCss ? 'link' : 'style'); el.id = FONT_ID; document.head.appendChild(el); }
      if (isCss) { el.rel = 'stylesheet'; el.href = url; }
      else { el.textContent = `@font-face{font-family:'${ct.fontFamily}';src:url('${url}');font-display:swap;}`; }
      const stack = `'${ct.fontFamily}', 'OMORI Pixel', monospace`;
      r.style.setProperty('--font-pixel', stack);
      r.style.setProperty('--font-hand', stack);
    } else {
      if (el) el.remove();
      r.style.removeProperty('--font-pixel');
      r.style.removeProperty('--font-hand');
    }
    // force a repaint (animated text filters cache their paint layers)
    const b = document.body;
    b.style.display = 'none'; void b.offsetHeight; b.style.display = '';
  }, [customTheme]);

  // theme (force repaint — animated text filters cache their paint layers)
  uE(() => {
    const html = document.documentElement;
    ['theme-dark', 'theme-sepia', 'theme-mint', 'theme-ink'].forEach(c => html.classList.remove(c));
    if (theme !== 'light') html.classList.add('theme-' + theme);
    html.style.colorScheme = DARKISH[theme] ? 'dark' : 'light';
    try { localStorage.setItem('omori-theme2', theme); } catch (e) {}
    const b = document.body;
    b.style.display = 'none'; void b.offsetHeight; b.style.display = '';
  }, [theme]);
  uE(() => { try { localStorage.setItem('omori-fontscale', String(fontScale)); } catch (e) {} }, [fontScale]);

  // wobble tuning
  const wob = t.wobble;
  const scale = wob * 0.45, textScale = wob * 0.16;
  const dur = t.boilSpeed === 'slow' ? '0.9s' : t.boilSpeed === 'fast' ? '0.26s' : '0.5s';
  uE(() => {
    const r = document.documentElement;
    r.style.setProperty('--wobble-dur', dur);
    r.classList.toggle('no-wobble', wob === 0);
  }, [dur, wob]);

  // derived data — customRange (if set) overrides the timeframe window
  const rStart = customRange ? customRange.start : rangeStartISO(timeframe);
  const rEnd = customRange ? customRange.end : '9999-12-31';
  const rangeEntries = uM(
    () => state.entries.filter(e => e.date >= rStart && e.date <= rEnd).sort((a, b) => b.date.localeCompare(a.date)),
    [state.entries, rStart, rEnd]
  );
  const catRange = uM(
    () => catFilter === 'all' ? rangeEntries : rangeEntries.filter(e => e.cat === catFilter),
    [rangeEntries, catFilter]
  );
  const ledgerEntries = uM(() => {
    if (selectedDate) {
      const day = state.entries.filter(e => e.date === selectedDate).sort((a, b) => b.id.localeCompare(a.id));
      return catFilter === 'all' ? day : day.filter(e => e.cat === catFilter);
    }
    return catRange;
  }, [selectedDate, state.entries, catFilter, catRange]);
  const buckets = uM(
    () => customRange ? buildBucketsRange(customRange.start, customRange.end) : buildBuckets(timeframe, state.entries),
    [timeframe, state.entries, customRange]
  );

  // raw cash from the ledger (income − expense)
  // balance = sum of actual cash movement (loans/repayments move cash; covers don't)
  const rawBalance = uM(() => state.entries.reduce((a, e) => a + A.cashOf(e), 0), [state.entries]);
  const totalSaved = uM(() => (state.savings || []).reduce((a, g) => a + (g.saved || 0), 0), [state.savings]);
  // money tucked into savings leaves your spendable balance, so subtract it.
  const balance = uM(() => +(rawBalance - totalSaved).toFixed(2), [rawBalance, totalSaved]);
  const available = balance;
  // SUMMARY money in/out = real cash flow only (a 'cover' expense moves no cash)
  const inSum = rangeEntries.reduce((a, e) => a + Math.max(0, A.cashOf(e)), 0);
  const outSum = rangeEntries.reduce((a, e) => a + Math.max(0, -A.cashOf(e)), 0);
  const fmtShort = (iso) => { const p = iso.split('-'); return p[2] + '/' + p[1]; };
  const tfLabel = customRange ? (fmtShort(customRange.start) + ' → ' + fmtShort(customRange.end))
    : { week: 'this week', month: 'this month', year: 'this year', all: 'all time' }[timeframe];

  // mutations
  const addEntry = (e) => setState(s => ({ ...s, entries: [e, ...s.entries] }));
  const delEntry = (id) => setState(s => ({ ...s, entries: s.entries.filter(x => x.id !== id) }));
  const addDebt = (d) => setState(s => ({ ...s, debts: [{ dir: 'owed', ...d }, ...s.debts] }));
  const delDebt = (id) => setState(s => ({
    ...s,
    debts: s.debts.filter(x => x.id !== id),
    entries: s.entries.filter(x => x.id.indexOf('rp_' + id) !== 0),  // drop all its repayment entries
  }));
  // FIFO-apply `amount` against a person's open debts in one direction, oldest
  // first. Returns { debts, applied, excess }. Mutates a fresh debt copy.
  const applyFifo = (debts, name, dir, amount) => {
    let remain = +amount || 0;
    const open = debts
      .filter(d => d.name === name && (d.dir || 'owed') === dir && (d.amount - (d.paid || 0)) > 0)
      .sort((a, b) => a.date.localeCompare(b.date));
    for (const d of open) {
      if (remain <= 0) break;
      const owe = d.amount - (d.paid || 0);
      const pay = Math.min(owe, remain);
      d.paid = +((d.paid || 0) + pay).toFixed(2);
      remain = +(remain - pay).toFixed(2);
    }
    const applied = +(((+amount) || 0) - remain).toFixed(2);
    return { applied, excess: +remain.toFixed(2) };
  };

  // net per person: (they still owe me) − (I still owe them)
  const netOf = (debts, name) => debts.filter(d => d.name === name)
    .reduce((a, d) => a + ((d.dir || 'owed') === 'iowe' ? -1 : 1) * Math.max(0, d.amount - (d.paid || 0)), 0);

  // Signed friend amount controls only the friend balance:
  //   +N -> balance increases; cash entries move cash out
  //   -N -> balance decreases; expense entries count spend, cash entries move cash in
  // Auto-netting changes debt rows only; ledger cash/spend keeps the full amount.
  const editPerson = (name, signedAmount, opts) => setState(s => {
    const signed = +signedAmount || 0;
    const amt = Math.abs(signed);
    if (!amt) return s;
    const { kind = 'cash', cat = 'others', note = '' } = opts || {};
    if (kind === 'expense' && signed > 0) return s;
    const cleanNote = String(note || '').trim();
    let debts = s.debts.map(d => ({ ...d }));
    const today = A.iso(new Date());
    const id = (p) => p + '_' + name + '_' + A.uid();
    let entry;

    if (signed > 0) {
      const { excess } = applyFifo(debts, name, 'iowe', amt);
      if (excess > 0) debts.unshift({ id: A.uid(), dir: 'owed', name, amount: excess, paid: 0, reason: cleanNote || 'cash paid for friend', date: today });
    } else {
      const { excess } = applyFifo(debts, name, 'owed', amt);
      if (excess > 0) debts.unshift({ id: A.uid(), dir: 'iowe', name, amount: excess, paid: 0, reason: cleanNote || (kind === 'expense' ? 'covered my expense' : 'cash from friend'), date: today });
    }

    if (kind === 'expense') {
      const label = A.CAT_BY_ID[cat] ? A.CAT_BY_ID[cat].label.toLowerCase() : 'expense';
      entry = { id: id('cv'), type: 'cover', cat, amount: amt, date: today, note: cleanNote || (name + ' paid for my ' + label) };
    } else if (signed > 0) {
      entry = { id: id('ln'), type: 'loan', cat: 'others', amount: amt, date: today, note: cleanNote || ('cash to ' + name) };
    } else {
      entry = { id: id('si'), type: 'settle_in', cat: 'others', amount: amt, date: today, note: cleanNote || ('cash from ' + name) };
    }

    const entries = [entry, ...s.entries];
    // prune net-zero people (keep their ledger entries)
    [...new Set(debts.map(d => d.name))].forEach(nm => { if (Math.abs(netOf(debts, nm)) < 0.005) debts = debts.filter(d => d.name !== nm); });
    return { ...s, debts, entries };
  });
  const onAddCategory = (label, color) => { A.addCategory(label, color); setCatVer(v => v + 1); };
  const onUpdateCategory = (cid, patch) => { A.updateCategory(cid, patch); setCatVer(v => v + 1); };
  const onRemoveCategory = (cid) => {
    setState(s => ({ ...s, entries: s.entries.map(e => e.cat === cid ? { ...e, cat: 'others' } : e) }));
    A.removeCategory(cid); setCatVer(v => v + 1);
  };
  // ----- savings goals -----
  const addGoal = (name, target, color) => setState(s => ({
    ...s, savings: [...(s.savings || []), { id: A.uid(), name, target, saved: 0, color }],
  }));
  const delGoal = (id) => setState(s => ({ ...s, savings: (s.savings || []).filter(g => g.id !== id) }));
  const depositGoal = (id, amt) => setState(s => {
    const rawBal = s.entries.reduce((a, e) => a + A.cashOf(e), 0);
    const saved = (s.savings || []).reduce((a, g) => a + (g.saved || 0), 0);
    const avail = rawBal - saved;                     // spendable, after savings already tucked away
    const move = Math.max(0, Math.min(amt, avail));   // can't save more than you can spend
    return { ...s, savings: (s.savings || []).map(g => g.id === id ? { ...g, saved: +(g.saved + move).toFixed(2) } : g) };
  });
  const withdrawGoal = (id, amt) => setState(s => ({
    ...s, savings: (s.savings || []).map(g => g.id === id ? { ...g, saved: +Math.max(0, g.saved - amt).toFixed(2) } : g),
  }));
  const activeGoal = (state.savings || []).find(g => g.id === savingsGoalId) || null;
  const pickTimeframe = (tf) => { setTimeframe(tf); setSelectedDate(null); setCustomRange(null); };
  const pickDay = (iso) => { setSelectedDate(iso); setCustomRange(null); };
  const pickRange = (r) => { setCustomRange(r); setSelectedDate(null); };
  const moveWidget = (id, partial) => setLayout(l => ({ ...l, [id]: { ...l[id], ...partial } }));

  // ----- edit mode -----
  const enterEdit = () => {
    editSnapshot.current = {
      layout: JSON.parse(JSON.stringify(layout)),
      stickers: JSON.parse(JSON.stringify(stickers)),
      hidden: hidden.slice(),
      theme, customTheme: customTheme ? { ...customTheme } : null, fontScale,
      cats: JSON.parse(JSON.stringify(A.CATEGORIES)),
    };
    setEditMode(true);
  };
  const saveEdit = () => { setEditMode(false); setAddMenuOpen(false); };
  const cancelEdit = () => {
    const s = editSnapshot.current;
    if (s) {
      setLayout(s.layout); setStickers(s.stickers); setHidden(s.hidden);
      setTheme(s.theme); setCustomTheme(s.customTheme); setFontScale(s.fontScale);
      A.setCategories(s.cats); setCatVer(v => v + 1);
    }
    setEditMode(false); setAddMenuOpen(false); setThemesOpen(false); setCatMgrOpen(false);
  };
  const removeWidget = (id) => { setHidden(h => h.includes(id) ? h : [...h, id]); };
  const restoreWidget = (id) => { setHidden(h => h.filter(x => x !== id)); setAddMenuOpen(false); };

  // ----- floating images / GIFs -----
  const updateSticker = (id, partial) => setStickers(arr => arr.map(s => s.id === id ? { ...s, ...partial } : s));
  const deleteSticker = (id) => setStickers(arr => arr.filter(s => s.id !== id));
  // anchor the new image to a document point near the current viewport centre
  // (position:absolute) so it scrolls with the page instead of floating fixed.
  const addSticker = (src, framed) => {
    const probe = new Image();
    probe.onload = () => {
      const w = Math.min(240, probe.naturalWidth || 240);
      const x = window.scrollX + window.innerWidth / 2 - w / 2 + (Math.random() * 60 - 30);
      const y = window.scrollY + window.innerHeight / 2 - w / 2 + (Math.random() * 60 - 30);
      setStickers(arr => [...arr, { id: A.uid(), src, x: Math.round(Math.max(8, x)), y: Math.round(Math.max(8, y)), w, framed: !!framed }]);
    };
    probe.src = src;
  };
  // a resizable rich-text note, anchored near the viewport centre like an image
  const addNote = () => {
    const w = 240, h = 150;
    const x = window.scrollX + window.innerWidth / 2 - w / 2 + (Math.random() * 60 - 30);
    const y = window.scrollY + window.innerHeight / 2 - h / 2 + (Math.random() * 60 - 30);
    setStickers(arr => [...arr, { id: A.uid(), kind: 'note', x: Math.round(Math.max(8, x)), y: Math.round(Math.max(8, y)), w, h, html: '', framed: true }]);
  };

  // widget content
  const statBlock = (label, value, color) => (
    <div style={{ marginBottom: 15 }}>
      <div className="hand" style={{ fontSize: 20, opacity: 0.6 }}>{label}</div>
      <div className="pixel" style={{ fontSize: 27, color: color || 'var(--ink)' }}>{value}</div>
    </div>
  );
  const widgetContent = (id) => {
    switch (id) {
      case 'summary':
        return (
          <div>
            {statBlock('balance (all time)', A.money(balance), balance >= 0 ? 'var(--pos)' : 'var(--neg)')}
            <WobbleHr stroke="var(--ink)" strokeWidth="2" style={{ margin: '2px 0 14px' }} />
            <div className="hand" style={{ fontSize: 18, opacity: 0.6, marginBottom: 12 }}>{tfLabel}</div>
            {statBlock('money in', A.money(inSum), 'var(--pos)')}
            {statBlock('money out', A.money(outSum), 'var(--neg)')}
            {statBlock('net', A.money(inSum - outSum), (inSum - outSum) >= 0 ? 'var(--ink)' : 'var(--neg)')}
          </div>
        );
      case 'category':  return <DonutChart entries={rangeEntries} onPick={setCatModal} />;
      case 'time':      return <SpendLineChart entries={catRange} buckets={buckets} onPick={(bucket, total) => setBucketModal({ bucket, total })} />;
      case 'breakdown': return <CategoryBars entries={rangeEntries} />;
      case 'inout':     return <InOutBars entries={catRange} />;
      case 'ledger':
        return (
          <div>
            <div className="hand" style={{ fontSize: 20, opacity: 0.6, marginBottom: 8 }}>
              {ledgerEntries.length} entr{ledgerEntries.length === 1 ? 'y' : 'ies'}
              {catFilter !== 'all' ? ' · ' + A.CAT_BY_ID[catFilter].label : ''}
              {' · '}{selectedDate ? selectedDate : tfLabel}
            </div>
            <Ledger entries={ledgerEntries} onDelete={delEntry} />
          </div>
        );
      case 'friends':   return <DebtTracker debts={state.debts} onOpenFriend={setFriendModal} onEditPerson={editPerson} />;
      case 'savings':   return <SavingsPanel savings={state.savings || []} balance={balance} onOpenGoal={(g) => setSavingsGoalId(g.id)} />;
      default: return null;
    }
  };

  const visibleWidgets = uM(() => WIDGET_ORDER.filter(id => !hidden.includes(id)), [hidden]);
  const boardHeight = uM(() => {
    if (!visibleWidgets.length) return 200;
    return Math.max(...visibleWidgets.map(id => layout[id].y + layout[id].h)) + 16;
  }, [layout, visibleWidgets]);

  // small ＋ button shown in the SAVINGS card header (top-right) to add a goal
  const savingsAdd = (
    <button onClick={() => setAddGoalOpen(true)} title="new savings goal" className="clickable"
      style={{ border: 'none', background: 'transparent', padding: 0 }}>
      <WobbleFrame fill="#bfe3c8" stroke="var(--ink)" strokeWidth="2.4" radius="50"
        innerStyle={{ width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span className="pixel icon-glyph" style={{ fontSize: 19, color: 'var(--on-pastel)' }}>＋</span>
      </WobbleFrame>
    </button>
  );

  const imageIcon = (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4.5" width="18" height="15" rx="1.5" />
      <circle cx="8.5" cy="9.5" r="1.6" />
      <path d="M3 16l4.5-4 3.5 3 3.5-3.5L21 16" />
    </svg>
  );

  const editIcon = (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20h4l10-10-4-4L4 16v4z" />
      <path d="M13.5 6.5l4 4" />
    </svg>
  );

  const brushIcon = (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 4l6 6-8 8c-1 1-3 1.4-5 1.5l-3 .5.5-3c.1-2 .5-4 1.5-5l8-8z" />
      <path d="M11 7l6 6" />
    </svg>
  );

  // ----- sync status pill (tap to open settings) -----
  const SYNC_META = {
    saved:        { label: 'synced',     dot: '#bfe3c8', title: 'all changes saved to the server' },
    saving:       { label: 'saving…',    dot: '#f7ecc0', title: 'saving to the server' },
    readonly:     { label: 'local only', dot: '#cdbba8', title: 'not unlocked — edits stay on this device. enter the password in settings to sync.' },
    offline:      { label: 'offline',    dot: '#f6d2bf', title: 'server unreachable — edits kept locally for now' },
    unauthorized: { label: 'wrong pw',   dot: '#f6bfc4', title: 'password rejected — re-enter it in settings' },
  };
  const sm = SYNC_META[syncStatus] || SYNC_META.readonly;
  const syncChip = (
    <button onClick={() => setSettingsOpen(true)} title={sm.title} className="clickable"
      style={{ border: 'none', background: 'transparent', padding: 0 }}>
      <WobbleFrame fill="var(--paper)" stroke="var(--ink)" strokeWidth="2.4" radius="3"
        innerStyle={{ padding: '9px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 12, height: 12, borderRadius: '50%', background: sm.dot, border: '2px solid var(--ink)', flex: '0 0 auto' }} />
        <span className="pixel" style={{ fontSize: 15, color: 'var(--ink)' }}>{sm.label}</span>
      </WobbleFrame>
    </button>
  );

  const hiddenList = WIDGET_ORDER.filter(id => hidden.includes(id));
  const menuItem = {
    border: 'none', background: 'transparent', padding: 0, width: '100%', textAlign: 'left',
  };
  const actionRow = editMode ? (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
      <div style={{ position: 'relative' }}>
        <IconActionButton color="#d9c9ef" icon="＋" title="add image or tab" active={addMenuOpen}
          onClick={() => setAddMenuOpen(o => !o)} />
        {addMenuOpen && (
          <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: 8, zIndex: 70, width: 320, maxHeight: '70vh', overflowY: 'auto' }}>
            <WobbleFrame fill="var(--paper)" stroke="var(--ink)" strokeWidth="2.6" radius="3"
              innerStyle={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }} className="paper-bg">
              <button onClick={() => { setAddImageOpen(true); setAddMenuOpen(false); }} className="clickable" style={menuItem}>
                <WobbleFrame fill="#f7ecc0" stroke="var(--ink)" strokeWidth="2.2" radius="3" innerStyle={{ padding: '11px 14px' }}>
                  <span className="pixel" style={{ fontSize: 16, color: 'var(--on-pastel)' }}>＋ ADD IMAGE</span>
                </WobbleFrame>
              </button>
              <button onClick={() => { addNote(); setAddMenuOpen(false); }} className="clickable" style={menuItem}>
                <WobbleFrame fill="#bcd9f0" stroke="var(--ink)" strokeWidth="2.2" radius="3" innerStyle={{ padding: '11px 14px' }}>
                  <span className="pixel" style={{ fontSize: 16, color: 'var(--on-pastel)' }}>＋ ADD TEXT BOX</span>
                </WobbleFrame>
              </button>
              <div className="pixel" style={{ fontSize: 12, opacity: 0.5, margin: '4px 2px 0' }}>ADD A TAB</div>
              {hiddenList.length === 0 && <div className="hand" style={{ opacity: 0.5, fontSize: 18, padding: '2px 2px' }}>all tabs already shown</div>}
              {hiddenList.map(id => (
                <button key={id} onClick={() => restoreWidget(id)} className="clickable" style={menuItem}>
                  <WobbleFrame fill="var(--paper-2)" stroke="var(--ink)" strokeWidth="2" radius="3" innerStyle={{ padding: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span style={{ width: 12, height: 12, background: WIDGET_META[id].accent, border: '2px solid var(--ink)', flex: '0 0 auto' }} />
                      <span className="pixel" style={{ fontSize: 14, color: 'var(--ink)' }}>{WIDGET_META[id].title}</span>
                      <span className="pixel" style={{ marginLeft: 'auto', fontSize: 16, opacity: 0.6, color: 'var(--ink)' }}>＋</span>
                    </div>
                    {/* live scaled preview of the real widget */}
                    <div style={{ height: 96, overflow: 'hidden', border: '1.5px solid var(--hair)', borderRadius: 3, background: 'var(--paper)' }}>
                      <div style={{ width: '200%', transform: 'scale(0.5)', transformOrigin: 'top left', pointerEvents: 'none', padding: '8px 10px' }}>
                        {widgetContent(id)}
                      </div>
                    </div>
                  </WobbleFrame>
                </button>
              ))}
            </WobbleFrame>
          </div>
        )}
      </div>
      <IconActionButton color="#bcd9f0" icon={brushIcon} title="themes" onClick={() => setThemesOpen(true)} />
      <ActionButton color="#d9c9ef" icon="🏷" label="CATEGORIES" onClick={() => setCatMgrOpen(true)} />
      <ActionButton color="#bfe3c8" icon="✓" label="SAVE" onClick={saveEdit} />
      <IconActionButton color="#f6bfc4" icon="✕" title="cancel changes" onClick={cancelEdit} />
    </div>
  ) : (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
      <ActionButton color="#d9c9ef" icon="＋" label="NEW ENTRY" onClick={() => setModal(true)} />
      <ActionButton color="#f8c8d8" icon="▦" label="FILTER" active={filterOpen}
        onClick={() => setFilterOpen(o => !o)} />
      <IconActionButton color="#f7ecc0" icon={editIcon} title="edit layout · themes · categories"
        onClick={enterEdit} />
      <IconActionButton color="#f6d2bf" icon="⚙" title="settings" active={settingsOpen}
        onClick={() => setSettingsOpen(true)} />
      {syncChip}
    </div>
  );

  // ----- detail modal data -----
  const friendItems = uM(() => !friendModal ? [] :
    state.debts.filter(d => d.name === friendModal).map(d => ({
      key: d.id, color: (d.dir === 'iowe') ? '#f7ecc0' : '#f7ecc0', dir: d.dir || 'owed',
      title: d.reason, sub: '', date: d.date, amount: d.amount, paid: d.paid,
    })), [friendModal, state.debts]);
  const friendUnpaid = friendItems.filter(i => (i.amount - (i.paid || 0)) > 0.0001).length;

  const bk = bucketModal && bucketModal.bucket;
  const dayItems = uM(() => !bk ? [] :
    catRange.filter(e => A.spendOf(e) > 0 && e.date >= bk.start && e.date <= bk.end).map(e => {
      const cat = A.CAT_BY_ID[e.cat] || { label: e.cat, color: '#d8d8d2' };
      return { key: e.id, color: cat.color, title: e.note || cat.label, sub: cat.label.toUpperCase(), date: e.date, amount: e.amount, sign: A.cashOf(e) < 0 ? '\u2212' : '' };
    }), [bk, catRange]);
  const dayTitle = bk ? (bk.start === bk.end ? bk.start : bk.start + ' → ' + bk.end) : '';

  const catItems = uM(() => !catModal ? [] :
    rangeEntries.filter(e => e.cat === catModal.id && A.spendOf(e) > 0).map(e => ({
      key: e.id, color: catModal.color, title: e.note || catModal.label, sub: '', date: e.date, amount: e.amount, sign: A.cashOf(e) < 0 ? '\u2212' : '',
    })), [catModal, rangeEntries]);

  return (
    <div className="paper-bg" style={{ minHeight: '100vh', padding: 'clamp(12px, 3vw, 26px)', paddingBottom: 80, display: 'grid', placeItems: 'start center' }}>
      <WobbleDefs scale={scale} textScale={textScale} />

      <div style={{ width: 'min(1180px, 100%)', position: 'relative', zoom: fontScale * mobileZoom }} className={t.grain ? 'paper-bg' : ''}>
        <WobbleFrame fill="var(--paper)" stroke="var(--ink)" strokeWidth="3" radius="2" pad="9" innerStyle={{ padding: 0 }}>

          {/* ===== HEADER ===== */}
          <div style={{ padding: 'clamp(14px, 2.4vw, 20px) clamp(14px, 2.4vw, 26px) 6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
              <div>
                <div className="pixel wobble-text" style={{ fontSize: 'clamp(31px, 4.4vw, 42px)', lineHeight: 0.95 }}>MONEY TRACKER</div>
                <div className="hand" style={{ fontSize: 21, opacity: 0.6 }}>i suck at keepingtrack of my money · SGD</div>
              </div>
              {actionRow}
            </div>
            <WobbleHr stroke="var(--ink)" strokeWidth="2.5" style={{ marginTop: 12 }} />
          </div>

          {/* ===== FILTER PANEL (category + date combined) ===== */}
          {filterOpen && !editMode && (
            <div style={{ padding: '0 clamp(14px, 2.4vw, 26px) 4px' }}>
              <WobbleFrame fill="var(--paper-2)" stroke="var(--ink)" strokeWidth="2.2" radius="3" innerStyle={{ padding: '12px 14px' }}>
                <div className="pixel" style={{ fontSize: 15, opacity: 0.6, marginBottom: 9 }}>FILTER BY CATEGORY</div>
                <FilterBar mode="category" catFilter={catFilter} setCatFilter={setCatFilter}
                  timeframe={timeframe} setTimeframe={pickTimeframe} />
                <WobbleHr stroke="var(--ink)" strokeWidth="2" style={{ margin: '14px 0 12px' }} />
                <div className="pixel" style={{ fontSize: 15, opacity: 0.6, marginBottom: 9 }}>FILTER BY TIMEFRAME</div>
                <FilterBar mode="time" catFilter={catFilter} setCatFilter={setCatFilter}
                  timeframe={timeframe} setTimeframe={pickTimeframe} />
                <div style={{ marginTop: 14, maxWidth: 320 }}>
                  <div className="pixel" style={{ fontSize: 15, opacity: 0.6, marginBottom: 9 }}>OR PICK A DAY / RANGE</div>
                  <Calendar entries={state.entries} selected={selectedDate} onSelect={pickDay}
                    range={customRange} onRange={pickRange} />
                </div>
              </WobbleFrame>
            </div>
          )}

          {/* ===== WIDGET AREA ===== */}
          <div style={{ padding: 'clamp(12px, 2vw, 16px) clamp(14px, 2.4vw, 26px) 28px' }}>
            {isBoard ? (
              <div key="board" style={{ position: 'relative', width: BOARD_W, maxWidth: '100%', margin: '0 auto', height: boardHeight }}>
                {visibleWidgets.map(id => (
                  <CardShell key={id} title={WIDGET_META[id].title} accent={WIDGET_META[id].accent}
                    rect={layout[id]} onChange={(p) => moveWidget(id, p)} positioned draggable={editMode}
                    headerAction={id === 'savings' ? savingsAdd : null}
                    onRemove={editMode ? () => removeWidget(id) : undefined}>
                    {widgetContent(id)}
                  </CardShell>
                ))}
              </div>
            ) : (
              <div key="stack" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                {visibleWidgets.map(id => (
                  <CardShell key={id} title={WIDGET_META[id].title} accent={WIDGET_META[id].accent} draggable={false}
                    headerAction={id === 'savings' ? savingsAdd : null}
                    onRemove={editMode ? () => removeWidget(id) : undefined}>
                    {widgetContent(id)}
                  </CardShell>
                ))}
              </div>
            )}
          </div>
        </WobbleFrame>

        {isBoard && (
          <div className="hand" style={{ textAlign: 'center', fontSize: 18, opacity: 0.5, marginTop: 10 }}>
            {editMode ? 'drag cards to move · drag the corner to resize · ✕ to remove a tab' : 'tap the ✎ edit button to rearrange your board'}
          </div>
        )}
      </div>

      <AddEntryModal open={modal} onClose={() => setModal(false)} onAdd={addEntry} />

      <DetailModal key={'fr-' + (friendModal || '')} open={!!friendModal} onClose={() => setFriendModal(null)}
        title={friendModal || ''} subtitle={friendUnpaid + ' open item' + (friendUnpaid === 1 ? '' : 's') + ' · use LOG FRIEND ENTRY on the card to update balance'}
        accent="#f7ecc0" totalLabel="still owes you" items={friendItems}
        debtMode onDelete={delDebt} />

      <DetailModal open={!!bucketModal} onClose={() => setBucketModal(null)}
        title={dayTitle} subtitle={dayItems.length + ' purchase' + (dayItems.length === 1 ? '' : 's')}
        accent="#bcd9f0" totalLabel="spent" items={dayItems} />

      <DetailModal open={!!catModal} onClose={() => setCatModal(null)}
        title={catModal ? catModal.label.toUpperCase() : ''} subtitle={catItems.length + ' purchase' + (catItems.length === 1 ? '' : 's') + ' · ' + tfLabel}
        accent={catModal ? catModal.color : '#f8c8d8'} totalLabel="spent" items={catItems} />

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)}
        syncStatus={syncStatus} syncMeta={SYNC_META}
        hasPassword={A.Store.hasPassword()}
        onSetPassword={(pw) => A.Store.setPassword(pw)}
        onForgetPassword={() => A.Store.clearPassword()} />

      <ThemesModal open={themesOpen} onClose={() => setThemesOpen(false)}
        themes={THEMES} theme={theme} setTheme={setTheme}
        customTheme={customTheme} setCustomTheme={setCustomTheme}
        fontScale={fontScale} setFontScale={setFontScale} />

      <CategoryManagerModal open={catMgrOpen} onClose={() => setCatMgrOpen(false)}
        categories={A.CATEGORIES} palette={CAT_PALETTE}
        onAdd={onAddCategory} onUpdate={onUpdateCategory} onRemove={onRemoveCategory} />

      <AddGoalModal open={addGoalOpen} onClose={() => setAddGoalOpen(false)} onAdd={addGoal} palette={CAT_PALETTE} />

      <SavingsGoalModal open={!!activeGoal} onClose={() => setSavingsGoalId(null)}
        goal={activeGoal} available={available}
        onDeposit={depositGoal} onWithdraw={withdrawGoal} onDelete={delGoal} />

      {/* ===== theme quick-toggle (bottom-left) ===== */}
      <button onClick={() => { setCustomTheme(null); setTheme(DARKISH[theme] ? 'light' : 'dark'); }} title="toggle light / dark" className="clickable"
        style={{ position: 'fixed', left: 18, bottom: 18, zIndex: 60, border: 'none', background: 'transparent', padding: 0 }}>
        <WobbleFrame fill="var(--paper)" stroke="var(--ink)" strokeWidth="2.6" radius="3"
          innerStyle={{ padding: '9px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="pixel icon-glyph" style={{ fontSize: 18, color: 'var(--ink)' }}>{DARKISH[theme] ? '☀' : '☾'}</span>
          <span className="pixel" style={{ fontSize: 18, lineHeight: 1, color: 'var(--ink)' }}>{DARKISH[theme] ? 'LIGHT' : 'DARK'}</span>
        </WobbleFrame>
      </button>

      {/* ===== floating draggable images / gifs ===== */}
      <StickerLayer stickers={stickers} onChange={updateSticker} onDelete={deleteSticker} editMode={editMode} />
      <AddImageModal open={addImageOpen} onClose={() => setAddImageOpen(false)} onAdd={addSticker} />

      {/* ===== TWEAKS ===== */}
      <TweaksPanel title="Tweaks">
        <TweakSection label="Linework" />
        <TweakSlider label="Wobble strength" value={t.wobble} min={0} max={10} step={1} onChange={v => setTweak('wobble', v)} />
        <TweakRadio label="Boil speed" value={t.boilSpeed} options={['slow', 'normal', 'fast']} onChange={v => setTweak('boilSpeed', v)} />
        <TweakSection label="Board" />
        <TweakButton label="Reset card positions" onClick={() => setLayout(JSON.parse(JSON.stringify(DEFAULT_LAYOUT)))} />
        <TweakToggle label="Paper grain" value={t.grain} onChange={v => setTweak('grain', v)} />
        <TweakSection label="Data" />
        <TweakButton label="Clear all images" onClick={() => setStickers([])} />
        <TweakButton label="Reset to sample data" onClick={() => { setSelectedDate(null); setState(A.Store.reset()); }} />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
