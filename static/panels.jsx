/* all the different graphs and components, planning on adding more stuff and link from my other websites like stock trader*/
const PF = window.Finance;
const { useState: useStateP } = React;

const MONTHS_FULL = ['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'];
const fieldStyle = {
  width: '100%', padding: '9px 11px', border: '2px solid var(--ink)', background: 'var(--paper)',
  color: 'var(--ink)', fontFamily: 'var(--font-pixel)', fontSize: 21, borderRadius: 2, outline: 'none',
};

/* ---- pastel taped action button (paper bg always; active = pastel icon + bold) ---- */
function ActionButton({ color = '#f8c8d8', icon, label, onClick, active = false }) {
  const [hover, setHover] = useStateP(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="clickable"
      style={{
        position: 'relative', border: 'none', background: 'transparent',
        padding: 0, transform: hover ? 'translateY(-2px) rotate(-0.4deg)' : 'none',
        transition: 'transform 0.12s ease',
      }}
    >
      <WobbleFrame fill={active ? color : 'var(--paper)'} stroke="var(--ink)" strokeWidth="2.6" radius="3"
        style={{ minWidth: 150 }}
        innerStyle={{ padding: '11px 16px', display: 'flex', alignItems: 'center', gap: 9, justifyContent: 'center' }}>
        <span style={{
          width: 22, height: 22, borderRadius: '50%', background: color, border: '2px solid var(--ink)',
          fontSize: 17, flex: '0 0 auto', color: 'var(--on-pastel)',
        }} className="pixel icon-glyph">{icon}</span>
        <span className="pixel" style={{ fontSize: 18, color: active ? 'var(--on-pastel)' : 'var(--ink)' }}>{label}</span>
      </WobbleFrame>
    </button>
  );
}

/* ---- icon-only action button (same family as ActionButton, no label) ---- */
function IconActionButton({ color = '#f6d2bf', icon, title, onClick, active = false }) {
  const [hover, setHover] = useStateP(false);
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="clickable"
      style={{
        position: 'relative', border: 'none', background: 'transparent',
        padding: 0, transform: hover ? 'translateY(-2px) rotate(-0.4deg)' : 'none',
        transition: 'transform 0.12s ease',
      }}
    >
      <WobbleFrame fill={active ? color : 'var(--paper)'} stroke="var(--ink)" strokeWidth="2.6" radius="3"
        innerStyle={{ padding: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{
          width: 22, height: 22, borderRadius: '50%', background: color, border: '2px solid var(--ink)',
          fontSize: 17, flex: '0 0 auto', color: 'var(--on-pastel)',
        }} className="pixel icon-glyph">{icon}</span>
      </WobbleFrame>
    </button>
  );
}

/* ---- chip toggle ---- */
function ChipToggle({ label, color, active, onClick }) {
  const txt = color ? 'var(--on-pastel)' : (active ? 'var(--paper)' : 'var(--ink)');
  return (
    <button onClick={onClick} className="clickable" style={{ border: 'none', background: 'transparent', padding: 0 }}>
      <WobbleFrame fill={active ? (color || 'var(--ink)') : 'var(--paper)'} stroke="var(--ink)" strokeWidth="2.2" radius="20" pad="5"
        innerStyle={{ padding: '5px 13px', display: 'flex', alignItems: 'center', gap: 7 }}>
        {color && <span style={{ width: 12, height: 12, borderRadius: '50%', background: color, border: '1.5px solid var(--ink)' }} />}
        <span className="hand" style={{ fontSize: 21, whiteSpace: 'nowrap', color: active ? txt : 'var(--ink)' }}>{label}</span>
      </WobbleFrame>
    </button>
  );
}

/* ---- filter bar (category | timeframe chips) ---- */
const TIMEFRAMES = [
  { id: 'week', label: 'This week' },
  { id: 'month', label: 'This month' },
  { id: 'year', label: 'This year' },
  { id: 'all', label: 'All time' },
];
function FilterBar({ mode, catFilter, setCatFilter, timeframe, setTimeframe }) {
  if (mode === 'category') {
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9, alignItems: 'center' }}>
        <ChipToggle label="All" active={catFilter === 'all'} onClick={() => setCatFilter('all')} />
        {PF.CATEGORIES.map(c => (
          <ChipToggle key={c.id} label={c.label} color={c.color}
            active={catFilter === c.id} onClick={() => setCatFilter(c.id)} />
        ))}
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9, alignItems: 'center' }}>
      {TIMEFRAMES.map(tf => (
        <ChipToggle key={tf.id} label={tf.label}
          active={timeframe === tf.id} onClick={() => setTimeframe(tf.id)} />
      ))}
    </div>
  );
}

/* ---- calendar — DAY mode (pick one day) or RANGE mode (pick start→end,
   works across months). Range commits on the second click. ---- */
function Calendar({ entries, selected, onSelect, range, onRange }) {
  const init = selected ? new Date(selected) : (range ? new Date(range.start) : new Date());
  const [view, setView] = useStateP(new Date(init.getFullYear(), init.getMonth(), 1));
  const [mode, setMode] = useStateP(range ? 'range' : 'day');
  const [pending, setPending] = useStateP(null);   // first range click, awaiting the second
  const year = view.getFullYear(), month = view.getMonth();
  const startDow = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const todayIso = PF.iso(new Date());
  const active = new Set(entries.map(e => e.date));
  const mkIso = d => `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(d);

  const navBtn = {
    border: '2px solid var(--ink)', background: 'var(--paper)', color: 'var(--ink)',
    width: 26, height: 26, borderRadius: 3, fontSize: 20, lineHeight: 1, padding: 0,
  };

  const clickDay = (iso) => {
    if (mode === 'day') { onSelect(iso === selected ? null : iso); return; }
    // range mode
    if (!pending) { setPending(iso); if (onRange) onRange(null); return; }
    const [a, b] = iso < pending ? [iso, pending] : [pending, iso];
    setPending(null);
    if (onRange) onRange({ start: a, end: b });
  };
  const clearAll = () => { setPending(null); onSelect(null); if (onRange) onRange(null); };

  const inRange = (iso) => range && iso >= range.start && iso <= range.end;
  const isEnd = (iso) => range && (iso === range.start || iso === range.end);
  const modeBtn = (m, l) => (
    <button onClick={() => { setMode(m); setPending(null); }} className="pixel clickable"
      style={{ border: '2px solid var(--ink)', background: mode === m ? '#d9c9ef' : 'var(--paper)',
        color: mode === m ? 'var(--on-pastel)' : 'var(--ink)', fontSize: 13, padding: '5px 11px', borderRadius: 3 }}>{l}</button>
  );

  return (
    <WobbleFrame fill="var(--paper)" stroke="var(--ink)" strokeWidth="2.4" radius="3"
      innerStyle={{ padding: '12px 14px' }}>
      <div style={{ display: 'flex', gap: 7, marginBottom: 10, justifyContent: 'center' }}>
        {modeBtn('day', 'DAY')}{modeBtn('range', 'RANGE')}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <button className="pixel" style={navBtn} onClick={() => setView(new Date(year, month - 1, 1))}>‹</button>
        <span className="pixel" style={{ fontSize: 18 }}>{MONTHS_FULL[month]} {year}</span>
        <button className="pixel" style={navBtn} onClick={() => setView(new Date(year, month + 1, 1))}>›</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div key={'h' + i} className="pixel" style={{ textAlign: 'center', fontSize: 14, opacity: 0.5 }}>{d}</div>
        ))}
        {cells.map((d, i) => {
          if (d === null) return <div key={'b' + i} />;
          const iso = mkIso(d);
          const isToday = iso === todayIso;
          const has = active.has(iso);
          const hot = mode === 'day' ? iso === selected : (isEnd(iso) || iso === pending);
          const mid = mode === 'range' && inRange(iso) && !isEnd(iso);
          return (
            <button key={iso} className="pixel clickable" onClick={() => clickDay(iso)}
              style={{
                position: 'relative', aspectRatio: '1 / 1', minWidth: 0,
                border: hot ? '2px solid var(--ink)' : isToday ? '1.5px solid var(--ink)' : '1.5px solid transparent',
                background: hot ? '#d9c9ef' : mid ? 'rgba(217,201,239,0.45)' : 'transparent',
                color: hot ? 'var(--on-pastel)' : 'var(--ink)',
                borderRadius: 3, fontSize: 17, display: 'grid', placeItems: 'center', padding: 0,
              }}>
              {d}
              {has && !hot && !mid && <span style={{ position: 'absolute', bottom: 3, left: '50%', marginLeft: -2, width: 4, height: 4, borderRadius: '50%', background: '#f8c8d8' }} />}
            </button>
          );
        })}
      </div>
      {mode === 'range' && pending && !range && (
        <div className="hand" style={{ marginTop: 9, textAlign: 'center', fontSize: 17, opacity: 0.7 }}>start {pending} · pick an end day</div>
      )}
      {(selected || range) && (
        <div style={{ marginTop: 11, textAlign: 'center' }}>
          <button className="pixel" onClick={clearAll}
            style={{ border: '2px solid var(--ink)', background: 'var(--paper)', color: 'var(--ink)', fontSize: 15, padding: '5px 12px', borderRadius: 3 }}>
            showing {selected || (range.start + ' → ' + range.end)} · clear ✕
          </button>
        </div>
      )}
    </WobbleFrame>
  );
}

/* ---- ledger list ---- */
function Ledger({ entries, onDelete }) {
  if (!entries.length) {
    return <div className="hand" style={{ padding: '26px 4px', textAlign: 'center', opacity: 0.55, fontSize: 24 }}>
      no entries here yet... add one!
    </div>;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {entries.map((e, i) => {
        const isFriendCash = ['loan', 'settle_in', 'settle_out', 'friend_cash'].includes(e.type);
        const cat = isFriendCash
          ? { label: 'Cash / repayment', color: '#f7ecc0' }
          : (PF.CAT_BY_ID[e.cat] || { label: e.cat, color: '#d8d8d2' });
        // colour by actual cash movement: +in (green) \u00b7 \u2212out (red) \u00b7 0 no cash (grey)
        const v = PF.cashOf(e);
        const sign = v > 0 ? '+' : v < 0 ? '\u2212' : '';
        const amtColor = v > 0 ? 'var(--pos)' : v < 0 ? 'var(--neg)' : 'var(--neu)';
        return (
          <div key={e.id} style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '9px 4px',
            borderBottom: i < entries.length - 1 ? '1.5px solid var(--hair)' : 'none',
          }}>
            <span style={{ width: 18, height: 18, background: cat.color, border: '2px solid var(--ink)', borderRadius: '50%', flex: '0 0 auto' }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="hand" style={{ fontSize: 24, lineHeight: 1.15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.note || cat.label}</div>
              <div className="pixel" style={{ fontSize: 14, opacity: 0.6 }}>{cat.label.toUpperCase()} · {e.date}</div>
            </div>
            <span className="pixel" style={{ fontSize: 21, color: amtColor, whiteSpace: 'nowrap' }}>
              {sign}{PF.money(e.amount)}
            </span>
            <button onClick={() => onDelete(e.id)} title="delete"
              style={{ border: 'none', background: 'transparent', color: 'var(--ink)', fontSize: 22, lineHeight: 1, opacity: 0.4, padding: 4 }}
              onMouseEnter={ev => ev.currentTarget.style.opacity = 1}
              onMouseLeave={ev => ev.currentTarget.style.opacity = 0.4}>✕</button>
          </div>
        );
      })}
    </div>
  );
}

/* ---- add entry modal ---- */
function AddEntryModal({ open, onClose, onAdd }) {
  const [type, setType] = useStateP('out');
  const [amount, setAmount] = useStateP('');
  const [cat, setCat] = useStateP('food');
  const [date, setDate] = useStateP(PF.iso(new Date()));
  const [note, setNote] = useStateP('');
  if (!open) return null;

  const submit = () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return;
    onAdd({ id: PF.uid(), type, amount: amt, cat, date, note: note.trim() });
    setAmount(''); setNote(''); setType('out'); setCat('food'); setDate(PF.iso(new Date()));
    onClose();
  };
  const lbl = { fontSize: 15, letterSpacing: '0.05em', opacity: 0.7, marginBottom: 5, display: 'block' };

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 50,
      display: 'grid', placeItems: 'center', padding: 20,
    }}>
      <div onClick={ev => ev.stopPropagation()} style={{ width: 'min(430px, calc(100vw - 40px))', maxHeight: '92vh', overflowY: 'auto' }}>
        <WobbleFrame fill="var(--paper)" stroke="var(--ink)" strokeWidth="3" radius="3" double
          innerStyle={{ padding: '22px 22px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span className="pixel" style={{ fontSize: 28 }}>NEW ENTRY</span>
            <button onClick={onClose} style={{ border: 'none', background: 'transparent', color: 'var(--ink)', fontSize: 28, opacity: 0.6 }}>✕</button>
          </div>

          <div style={{ display: 'flex', gap: 10, marginBottom: 15 }}>
            {[['out', 'MONEY OUT', '#f6bfc4'], ['in', 'MONEY IN', '#bfe3c8']].map(([ty, l, c]) => (
              <button key={ty} onClick={() => setType(ty)} style={{ flex: 1, border: 'none', background: 'transparent', padding: 0 }}>
                <WobbleFrame fill={type === ty ? c : 'var(--paper)'} stroke="var(--ink)" strokeWidth="2.4" radius="2" pad="6"
                  innerStyle={{ padding: '9px 0', textAlign: 'center' }}>
                  <span className="pixel" style={{ fontSize: 17, color: type === ty ? 'var(--on-pastel)' : 'var(--ink)' }}>{l}</span>
                </WobbleFrame>
              </button>
            ))}
          </div>

          <div style={{ marginBottom: 13 }}>
            <span className="pixel" style={lbl}>AMOUNT (SGD)</span>
            <input type="number" step="0.01" min="0" value={amount} autoFocus
              onChange={e => setAmount(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submit()}
              placeholder="0.00" style={fieldStyle} />
          </div>

          <div style={{ marginBottom: 13 }}>
            <span className="pixel" style={lbl}>CATEGORY</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {PF.CATEGORIES.map(c => (
                <ChipToggle key={c.id} label={c.label} color={c.color} active={cat === c.id} onClick={() => setCat(c.id)} />
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 130px' }}>
              <span className="pixel" style={lbl}>DATE</span>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} style={fieldStyle} />
            </div>
            <div style={{ flex: '1 1 160px' }}>
              <span className="pixel" style={lbl}>NOTE</span>
              <input type="text" value={note} onChange={e => setNote(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submit()}
                placeholder="what was it?" style={fieldStyle} />
            </div>
          </div>

          <button onClick={submit} style={{ border: 'none', background: 'transparent', padding: 0, width: '100%' }}>
            <WobbleFrame fill="#d9c9ef" stroke="var(--ink)" strokeWidth="2.8" radius="3"
              innerStyle={{ padding: '12px 0', textAlign: 'center' }}>
              <span className="pixel" style={{ fontSize: 21, color: 'var(--on-pastel)' }}>＋ ADD IT</span>
            </WobbleFrame>
          </button>
        </WobbleFrame>
      </div>
    </div>
  );
}

/* ---- debt tracker — net per friend; click a name for details ----
   Each debt item has dir: 'owed' (friend owes me) or 'iowe' (I owe friend).
   net > 0 → they owe me · net < 0 → I owe them · 0 → settled. */
function DebtTracker({ debts, onOpenFriend, onEditPerson }) {
  const [adding, setAdding] = useStateP(false);
  const [entryKind, setEntryKind] = useStateP('cash'); // 'cash' | 'expense'
  const [name, setName] = useStateP('');
  const [amount, setAmount] = useStateP('');
  const [reason, setReason] = useStateP('');
  const [cat, setCat] = useStateP('food');
  const [showSugg, setShowSugg] = useStateP(false);
  const [submitError, setSubmitError] = useStateP('');
  const remainingOf = (d) => Math.max(0, (d.amount || 0) - (d.paid || 0));

  // net per friend = (they still owe me) − (I still owe them)
  const groups = {};
  debts.forEach(d => {
    const g = (groups[d.name] = groups[d.name] || { name: d.name, net: 0 });
    g.net += ((d.dir || 'owed') === 'iowe' ? -1 : 1) * remainingOf(d);
  });
  const friends = Object.values(groups)
    .map(f => ({ ...f, net: +f.net.toFixed(2) }))
    .sort((a, b) => Math.abs(b.net) - Math.abs(a.net));
  const owedToMe = friends.reduce((a, f) => a + (f.net > 0 ? f.net : 0), 0);
  const iOwe = friends.reduce((a, f) => a + (f.net < 0 ? -f.net : 0), 0);

  // name autocomplete: unique existing names matching the typed prefix
  const allNames = [...new Set(debts.map(d => d.name))];
  const q = name.trim().toLowerCase();
  const suggestions = q ? allNames.filter(n => n.toLowerCase().startsWith(q) && n.toLowerCase() !== q).slice(0, 5) : [];
  const topSugg = suggestions[0];
  const needsCat = entryKind === 'expense';

  // one-line preview of what the entry will do
  const signedAmt = parseFloat(String(amount).trim().replace(/^\+/, ''));
  const hasAmt = Number.isFinite(signedAmt) && signedAmt !== 0;
  const amt = Math.abs(signedAmt || 0);
  const expenseSignError = needsCat && hasAmt && signedAmt > 0
    ? 'Expense entries must use a negative amount here because this means your friend paid for your expense.'
    : '';
  const preview = (() => {
    if (!hasAmt || expenseSignError) return '';
    const m = PF.money(amt), who = name.trim() || 'them';
    if (needsCat) {
      const c = PF.CAT_BY_ID[cat] || { label: 'expense' };
      return '-> friend balance -' + m + ' - cash unchanged - ' + c.label + ' spending +' + m;
    }
    if (signedAmt > 0) return '-> friend balance +' + m + ' - cash -' + m + ' - spending unchanged';
    return '-> friend balance -' + m + ' - cash +' + m + ' - spending unchanged';
  })();

  const submit = () => {
    setSubmitError('');
    const who = name.trim();
    if (!who) { setSubmitError('Friend name is required.'); return; }
    if (!hasAmt) { setSubmitError('Enter a positive or negative amount.'); return; }
    if (expenseSignError) { setSubmitError(expenseSignError); return; }
    if (needsCat && !cat) { setSubmitError('Category is required for expenses.'); return; }
    onEditPerson(who, signedAmt, { kind: entryKind, cat: needsCat ? cat : 'others', note: reason.trim() });
    setName(''); setAmount(''); setReason(''); setSubmitError(''); setShowSugg(false); setAdding(false);
  };
  const onNameKey = (e) => {
    if (e.key === 'Tab' && topSugg) { e.preventDefault(); setName(topSugg); setShowSugg(false); }
    else if (e.key === 'Enter') submit();
    else if (e.key === 'Escape') setShowSugg(false);
  };
  const toggle = (val, cur, set, label) => (
    <button onClick={() => { set(val); setSubmitError(''); }} style={{ flex: 1, border: 'none', background: 'transparent', padding: 0 }}>
      <WobbleFrame fill={cur === val ? '#d9c9ef' : 'var(--paper)'} stroke="var(--ink)" strokeWidth="2.2" radius="2" pad="4"
        innerStyle={{ minHeight: 42, padding: '7px 4px', textAlign: 'center', display: 'grid', placeItems: 'center' }}>
        <span className="pixel" style={{ fontSize: 12, lineHeight: 1.05, color: cur === val ? 'var(--on-pastel)' : 'var(--ink)' }}>
          {label.split(' / ').map((part, i) => (
            <React.Fragment key={part}>{i > 0 && <><br />/ </>}{part}</React.Fragment>
          ))}
        </span>
      </WobbleFrame>
    </button>
  );
  const lbl = { fontSize: 12, opacity: 0.6, margin: '0 0 4px' };
  const formError = expenseSignError || submitError;

  return (
    <div style={{ color: 'var(--ink)', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="hand" style={{ fontSize: 20, opacity: 0.6, marginBottom: 12 }}>tap a name to see the details</div>

      <WobbleFrame fill="transparent" stroke="var(--ink)" strokeWidth="2.4" radius="3"
        innerStyle={{ padding: '12px 14px', marginBottom: 16 }}>
        <div className="hand" style={{ fontSize: 20, opacity: 0.7 }}>still owed to you</div>
        <div className="pixel" style={{ fontSize: 34, color: 'var(--ink)' }}>{PF.money(owedToMe)}</div>
        {iOwe > 0.0001 && (
          <div style={{ marginTop: 8 }}>
            <div className="hand" style={{ fontSize: 18, opacity: 0.7 }}>you owe</div>
            <div className="pixel" style={{ fontSize: 24, color: 'var(--neu)' }}>{PF.money(iOwe)}</div>
          </div>
        )}
      </WobbleFrame>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 12 }}>
        {friends.length === 0 && <div className="hand" style={{ opacity: 0.5, fontSize: 21 }}>nobody owes you. lucky!</div>}
        {friends.map(f => {
          const settled = Math.abs(f.net) <= 0.0001;
          const iOweThem = f.net < 0;
          const amtColor = settled ? 'var(--pos)' : iOweThem ? 'var(--neu)' : 'var(--neg)';
          const label = settled ? 'settled' : (iOweThem ? 'you owe ' : '') + PF.money(Math.abs(f.net));
          return (
            <button key={f.name} onClick={() => onOpenFriend(f.name)} className="clickable"
              style={{ border: 'none', background: 'transparent', padding: 0, width: '100%', textAlign: 'left', opacity: settled ? 0.5 : 1 }}>
              <WobbleFrame fill={settled ? 'transparent' : 'var(--paper-2)'} stroke="var(--ink)" strokeWidth="2" radius="3"
                innerStyle={{ padding: '11px 13px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="hand" style={{ flex: 1, minWidth: 0, fontSize: 25, lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.name}</span>
                <span className="pixel" style={{ fontSize: 22, color: amtColor, whiteSpace: 'nowrap' }}>{label}</span>
                <span className="pixel" style={{ fontSize: 21, opacity: 0.4, flex: '0 0 auto' }}>›</span>
              </WobbleFrame>
            </button>
          );
        })}
      </div>

      {adding ? (
        <WobbleFrame fill="var(--paper-2)" stroke="var(--ink)" strokeWidth="2.4" radius="3" innerStyle={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div className="pixel" style={lbl}>FRIEND NAME</div>
          <div style={{ position: 'relative' }}>
            <input value={name} onChange={e => { setName(e.target.value); setShowSugg(true); setSubmitError(''); }}
              onKeyDown={onNameKey} onBlur={() => setTimeout(() => setShowSugg(false), 150)}
              placeholder="friend's name (Tab to complete)" autoFocus style={fieldStyle} />
            {showSugg && suggestions.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20, background: 'var(--paper)', border: '2px solid var(--ink)', borderTop: 'none', borderRadius: '0 0 3px 3px', maxHeight: 140, overflowY: 'auto' }}>
                {suggestions.map((n, i) => (
                  <button key={n} onMouseDown={(e) => { e.preventDefault(); setName(n); setShowSugg(false); }}
                    className="pixel clickable" style={{ display: 'block', width: '100%', textAlign: 'left', border: 'none', borderBottom: i < suggestions.length - 1 ? '1px solid var(--hair)' : 'none', background: i === 0 ? 'var(--paper-2)' : 'transparent', color: 'var(--ink)', padding: '8px 11px', fontSize: 17 }}>
                    {n}{i === 0 ? '  Tab' : ''}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="pixel" style={lbl}>SIGNED AMOUNT</div>
          <input type="text" inputMode="decimal" value={amount} onChange={e => { setAmount(e.target.value); setSubmitError(''); }}
            onKeyDown={e => e.key === 'Enter' && submit()} placeholder="+12 or -12" style={fieldStyle} />
          <div className="hand" style={{ fontSize: 16, opacity: 0.62, lineHeight: 1.15 }}>
            +12 = friend owes me more. -12 = I owe friend more / friend owes me less.
          </div>
          <div className="pixel" style={lbl}>TYPE</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {toggle('expense', entryKind, setEntryKind, 'Expense')}
            {toggle('cash', entryKind, setEntryKind, 'Cash / repayment')}
          </div>
          {needsCat && (
            <div>
              <div className="pixel" style={{ fontSize: 12, opacity: 0.6, margin: '2px 0 6px' }}>CATEGORY</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {PF.CATEGORIES.map(c => (
                  <ChipToggle key={c.id} label={c.label} color={c.color} active={cat === c.id} onClick={() => setCat(c.id)} />
                ))}
              </div>
            </div>
          )}
          <div className="pixel" style={lbl}>NOTE / REASON</div>
          <input value={reason} onChange={e => { setReason(e.target.value); setSubmitError(''); }} placeholder={needsCat ? 'what was it? (e.g. lunch)' : 'note (optional)'}
            onKeyDown={e => e.key === 'Enter' && submit()} style={fieldStyle} />
          {formError && <div className="hand" style={{ fontSize: 17, color: 'var(--neg)', lineHeight: 1.15 }}>{formError}</div>}
          {preview && <div className="hand" style={{ fontSize: 16, opacity: 0.7, lineHeight: 1.2 }}>{preview}</div>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={submit} style={{ flex: 1, border: '2px solid var(--ink)', background: '#d9c9ef', color: 'var(--on-pastel)', padding: '7px 0', borderRadius: 2 }} className="pixel">SAVE</button>
            <button onClick={() => setAdding(false)} style={{ flex: '0 0 auto', border: '2px solid var(--ink)', background: 'transparent', color: 'var(--ink)', padding: '7px 12px', borderRadius: 2 }} className="pixel">X</button>
          </div>
        </WobbleFrame>
      ) : (
        <button onClick={() => { setEntryKind('cash'); setCat('food'); setSubmitError(''); setAdding(true); }} className="clickable" style={{ border: 'none', background: 'transparent', padding: 0, width: '100%' }}>
          <WobbleFrame fill="transparent" stroke="var(--ink)" strokeWidth="2.4" radius="3"
            innerStyle={{ padding: '10px 0', textAlign: 'center' }}>
            <span className="pixel" style={{ fontSize: 18, color: 'var(--ink)' }}>LOG FRIEND ENTRY</span>
          </WobbleFrame>
        </button>
      )}
    </div>
  );
}

/* ---- savings — goals you tuck a portion of your balance into ---- */
function GoalBar({ pct, color }) {
  return (
    <div style={{ position: 'relative', height: 12, marginTop: 9 }}>
      <WobbleFrame fill="transparent" stroke="var(--ink)" strokeWidth="2" radius="20" pad="2"
        style={{ position: 'absolute', inset: 0 }} innerStyle={{ height: '100%' }}>
        <div style={{
          position: 'absolute', left: 3, top: 3, bottom: 3,
          width: `calc(${Math.max(0, Math.min(100, pct))}% - 6px)`, minWidth: pct > 0 ? 4 : 0,
          background: color, borderRadius: 20, transition: 'width 0.25s ease',
        }} />
      </WobbleFrame>
    </div>
  );
}

function SavingsPanel({ savings = [], balance, onOpenGoal }) {
  const totalSaved = savings.reduce((a, g) => a + (g.saved || 0), 0);
  // available is the same figure as your balance (linked) — saving just
  // earmarks money, it doesn't leave your balance.
  const available = balance;
  return (
    <div style={{ color: 'var(--ink)', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="hand" style={{ fontSize: 20, opacity: 0.6, marginBottom: 12 }}>tap a goal to move money · ＋ to start one</div>

      <div style={{ marginBottom: 14 }}>
        <WobbleFrame fill="var(--paper-2)" stroke="var(--ink)" strokeWidth="2.4" radius="3"
          innerStyle={{ padding: '11px 13px' }}>
          <div className="hand" style={{ fontSize: 18, opacity: 0.7 }}>available</div>
          <div className="pixel" style={{ fontSize: 26, color: available >= 0 ? 'var(--ink)' : 'var(--neg)' }}>{PF.money(available)}</div>
        </WobbleFrame>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 11 }}>
        {savings.length === 0 && (
          <div className="hand" style={{ opacity: 0.55, fontSize: 21, padding: '14px 2px' }}>
            no goals yet — tap the ＋ up top to start saving!
          </div>
        )}
        {savings.map(g => {
          const pct = g.target > 0 ? Math.round((g.saved / g.target) * 100) : 0;
          const done = g.target > 0 && g.saved >= g.target;
          return (
            <button key={g.id} onClick={() => onOpenGoal(g)} className="clickable"
              style={{ border: 'none', background: 'transparent', padding: 0, width: '100%', textAlign: 'left' }}>
              <WobbleFrame fill="var(--paper-2)" stroke="var(--ink)" strokeWidth="2" radius="3"
                innerStyle={{ padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 16, height: 16, background: g.color, border: '2px solid var(--ink)', borderRadius: '50%', flex: '0 0 auto' }} />
                  <span className="hand" style={{ flex: 1, minWidth: 0, fontSize: 23, lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.name}</span>
                  <span className="pixel" style={{ fontSize: 16, color: done ? 'var(--pos)' : 'var(--ink)', flex: '0 0 auto' }}>{done ? 'done!' : pct + '%'}</span>
                </div>
                <GoalBar pct={pct} color={g.color} />
                <div className="pixel" style={{ fontSize: 15, opacity: 0.65, marginTop: 7 }}>
                  {PF.money(g.saved)} <span style={{ opacity: 0.6 }}>/ {PF.money(g.target)}</span>
                </div>
              </WobbleFrame>
            </button>
          );
        })}
      </div>
    </div>
  );
}

Object.assign(window, { ActionButton, IconActionButton, ChipToggle, FilterBar, Ledger, AddEntryModal, DebtTracker, Calendar, SavingsPanel });
