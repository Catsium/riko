/* ill make this more clear cut eventually after exams ig or if i get annoyed at it too much*/
const MF = window.Finance;
const { useState: useStateM } = React;

function SortButton({ active, color, label, onClick }) {
  return (
    <button onClick={onClick} className="clickable" style={{ border: 'none', background: 'transparent', padding: 0 }}>
      <WobbleFrame fill={active ? color : 'var(--paper)'} stroke="var(--ink)" strokeWidth="2.2" radius="3" pad="5"
        innerStyle={{ padding: '7px 14px' }}>
        <span className="pixel" style={{ fontSize: 18, color: active ? 'var(--on-pastel)' : 'var(--ink)' }}>{label}</span>
      </WobbleFrame>
    </button>
  );
}

/* one debt row in the friends modal — view only. Shows what's left and, if any
   has been paid back, how much. dir 'iowe' = I owe them (yellow "you owe X"),
   otherwise they owe me (coral "X left"). Update via LOG FRIEND ENTRY. */
function DebtRow({ it, onDelete, last }) {
  const paid = it.paid || 0;
  const remaining = Math.max(0, it.amount - paid);
  const settled = remaining <= 0;
  const mine = it.dir === 'iowe';   // I owe them
  const amtColor = settled ? 'var(--pos)' : mine ? 'var(--neu)' : 'var(--neg)';
  const right = settled ? 'settled' : mine ? 'you owe ' + MF.money(remaining) : MF.money(remaining) + ' left';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 9, padding: '11px 2px',
      borderBottom: last ? 'none' : '1.5px solid var(--hair)', opacity: settled ? 0.55 : 1,
    }}>
      <span style={{ width: 16, height: 16, background: mine ? 'var(--neu)' : it.color, border: '2px solid var(--ink)', borderRadius: '50%', flex: '0 0 auto' }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="hand" style={{ fontSize: 23, lineHeight: 1.15, textDecoration: settled ? 'line-through' : 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.title}</div>
        <div className="pixel" style={{ fontSize: 14, opacity: 0.6 }}>
          {mine ? 'you owe' : 'owes you'} · {it.date} · of {MF.money(it.amount)}{paid > 0 ? ' · ' : ''}
          {paid > 0 && <span style={{ color: 'var(--pos)' }}>−{MF.money(paid)} paid</span>}
        </div>
      </div>
      <span className="pixel" style={{ fontSize: 20, color: amtColor, whiteSpace: 'nowrap', flex: '0 0 auto' }}>
        {right}
      </span>
      {onDelete && (
        <button onClick={() => onDelete(it.key)} title="remove"
          style={{ border: 'none', background: 'transparent', color: 'var(--ink)', opacity: 0.35, fontSize: 20, padding: 2, flex: '0 0 auto' }}>✕</button>
      )}
    </div>
  );
}

function DetailModal({ open, onClose, title, subtitle, accent = '#f7ecc0', items = [], debtMode = false, onDelete, totalLabel = 'total' }) {
  const [sortKey, setSortKey] = useStateM('date');   // non-debt modals: 'date' | 'amount'
  const [metric, setMetric] = useStateM('owed');     // debt filter: 'owed' | 'paid'
  const [sortBy, setSortBy] = useStateM('date');     // debt sort key: 'amount' | 'date'
  const [asc, setAsc] = useStateM(false);            // debt direction
  if (!open) return null;

  const rem = (i) => Math.max(0, i.amount - (i.paid || 0));
  const sign = (i) => (i.dir === 'iowe' ? -1 : 1);
  let sorted, total, debtLabel;
  if (debtMode) {
    const filtered = items.filter(i => metric === 'paid' ? (i.paid || 0) > 0 : rem(i) > 0);
    const val = (i) => metric === 'paid' ? (i.paid || 0) : rem(i);
    sorted = [...filtered].sort((a, b) => {
      const d = sortBy === 'amount' ? (val(a) - val(b)) : a.date.localeCompare(b.date);
      return asc ? d : -d;
    });
    // net: what they owe me minus what I owe them
    const net = +items.reduce((a, i) => a + sign(i) * rem(i), 0).toFixed(2);
    total = Math.abs(net);
    debtLabel = net < -0.0001 ? 'you owe' : net > 0.0001 ? totalLabel : 'all settled';
  } else {
    const sorters = { amount: (a, b) => b.amount - a.amount, date: (a, b) => b.date.localeCompare(a.date) };
    sorted = [...items].sort(sorters[sortKey] || sorters.date);
    total = items.reduce((a, i) => a + i.amount, 0);
  }

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 55,
      display: 'grid', placeItems: 'center', padding: 20,
    }}>
      <div onClick={ev => ev.stopPropagation()} style={{ width: 'min(480px, calc(100vw - 40px))', maxHeight: '92vh', overflowY: 'auto' }}>
        <WobbleFrame fill="var(--paper)" stroke="var(--ink)" strokeWidth="3" radius="3" double
          innerStyle={{ padding: '22px 22px 24px' }}>

          {/* header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
              <span style={{ width: 18, height: 18, background: accent, border: '2px solid var(--ink)', flex: '0 0 auto' }} />
              <span className="pixel" style={{ fontSize: 29, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</span>
            </div>
            <button onClick={onClose} style={{ border: 'none', background: 'transparent', color: 'var(--ink)', fontSize: 29, opacity: 0.6 }}>✕</button>
          </div>
          {subtitle && <div className="hand" style={{ fontSize: 21, opacity: 0.6, marginBottom: 14 }}>{subtitle}</div>}

          {/* total */}
          <WobbleFrame fill="transparent" stroke="var(--ink)" strokeWidth="2.4" radius="3"
            innerStyle={{ padding: '11px 14px', marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="hand" style={{ fontSize: 21, opacity: 0.7 }}>{debtMode ? debtLabel : totalLabel}</span>
            <span className="pixel" style={{ fontSize: 32, color: debtMode && debtLabel === 'you owe' ? 'var(--neu)' : 'var(--ink)' }}>{MF.money(total)}</span>
          </WobbleFrame>

          {/* sort controls */}
          {debtMode ? (
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 9, marginBottom: 12 }}>
              <SortButton active={metric === 'owed'} color="#f6d2bf" label="OWED" onClick={() => setMetric('owed')} />
              <SortButton active={metric === 'paid'} color="#bfe3c8" label="PAID" onClick={() => setMetric('paid')} />
              <span className="pixel" style={{ fontSize: 15, opacity: 0.4 }}>·</span>
              <SortButton active={sortBy === 'amount'} color="#f8c8d8" label="BY AMOUNT" onClick={() => setSortBy('amount')} />
              <SortButton active={sortBy === 'date'} color="#bcd9f0" label="BY TIME" onClick={() => setSortBy('date')} />
              <button onClick={() => setAsc(a => !a)} className="clickable" title="sort direction" style={{ border: 'none', background: 'transparent', padding: 0 }}>
                <WobbleFrame fill="var(--paper)" stroke="var(--ink)" strokeWidth="2.2" radius="3" pad="5" innerStyle={{ padding: '7px 12px' }}>
                  <span className="pixel" style={{ fontSize: 18, color: 'var(--ink)' }}>{asc ? '↑ ASC' : '↓ DESC'}</span>
                </WobbleFrame>
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 9, marginBottom: 12 }}>
              <span className="pixel" style={{ fontSize: 17, opacity: 0.55 }}>SORT</span>
              <SortButton active={sortKey === 'amount'} color="#f8c8d8" label="BY AMOUNT" onClick={() => setSortKey('amount')} />
              <SortButton active={sortKey === 'date'} color="#bcd9f0" label="BY TIME" onClick={() => setSortKey('date')} />
            </div>
          )}

          {/* list */}
          <div style={{ display: 'flex', flexDirection: 'column', maxHeight: 320, overflowY: 'auto' }}>
            {sorted.length === 0 && (
              <div className="hand" style={{ padding: '24px 4px', textAlign: 'center', opacity: 0.55, fontSize: 24 }}>nothing here yet...</div>
            )}
            {debtMode ? sorted.map((it, i) => (
              <DebtRow key={it.key} it={it} onDelete={onDelete} last={i === sorted.length - 1} />
            )) : sorted.map((it, i) => (
              <div key={it.key} style={{
                display: 'flex', alignItems: 'center', gap: 11, padding: '11px 2px',
                borderBottom: i < sorted.length - 1 ? '1.5px solid var(--hair)' : 'none',
              }}>
                <span style={{ width: 20, height: 20, background: it.color || accent, border: '2px solid var(--ink)', borderRadius: '50%', flex: '0 0 auto' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="hand" style={{ fontSize: 25, lineHeight: 1.15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.title}</div>
                  <div className="pixel" style={{ fontSize: 15, opacity: 0.6 }}>{it.sub}{it.sub ? ' · ' : ''}{it.date}</div>
                </div>
                <span className="pixel" style={{ fontSize: 22, color: it.sign === '+' ? 'var(--pos)' : it.sign === '\u2212' ? 'var(--neg)' : 'var(--ink)', whiteSpace: 'nowrap' }}>
                  {it.sign || ''}{MF.money(it.amount)}
                </span>
                {onDelete && (
                  <button onClick={() => onDelete(it.key)} title="remove"
                    style={{ border: 'none', background: 'transparent', color: 'var(--ink)', opacity: 0.35, fontSize: 22, padding: 2 }}>✕</button>
                )}
              </div>
            ))}
          </div>
        </WobbleFrame>
      </div>
    </div>
  );
}

/* ===========================================================
   SettingsModal — sync to server only (themes + categories moved to edit mode)
   =========================================================== */
function SettingsModal({ open, onClose, syncStatus, syncMeta = {}, hasPassword = false, onSetPassword, onForgetPassword }) {
  const [pw, setPw] = useStateM('');
  if (!open) return null;

  const inp = {
    width: '100%', padding: '11px 12px', border: '2px solid var(--ink)', background: 'var(--paper)',
    color: 'var(--ink)', fontFamily: 'var(--font-pixel)', fontSize: 18, borderRadius: 2, outline: 'none',
  };
  const secLbl = { display: 'block', fontSize: 14, letterSpacing: '0.06em', opacity: 0.55, margin: '20px 0 11px' };
  const sMeta = syncMeta[syncStatus] || { label: 'local only', dot: '#cdbba8', title: 'enter the edit password to sync changes to the server' };
  const submitPw = () => { if (pw.trim() && onSetPassword) { onSetPassword(pw.trim()); } };

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 58,
      display: 'grid', placeItems: 'center', padding: 20,
    }}>
      <div onClick={ev => ev.stopPropagation()} style={{ width: 'min(460px, calc(100vw - 40px))', maxHeight: '88vh', overflowY: 'auto' }}>
        <WobbleFrame fill="var(--paper)" stroke="var(--ink)" strokeWidth="3" radius="3" double
          innerStyle={{ padding: '22px 22px 24px' }}>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
            <span className="pixel" style={{ fontSize: 24 }}>⚙ SETTINGS</span>
            <button onClick={onClose} style={{ border: 'none', background: 'transparent', color: 'var(--ink)', fontSize: 22, opacity: 0.6 }}>✕</button>
          </div>

          {/* ---- sync to server ---- */}
          <span className="pixel" style={secLbl}>SYNC TO SERVER</span>
          <WobbleFrame fill="var(--paper-2)" stroke="var(--ink)" strokeWidth="2.4" radius="3"
            innerStyle={{ padding: 13, display: 'flex', flexDirection: 'column', gap: 11 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 13, height: 13, borderRadius: '50%', background: sMeta.dot, border: '2px solid var(--ink)', flex: '0 0 auto' }} />
              <span className="pixel" style={{ fontSize: 14, opacity: 0.75 }}>{sMeta.label}</span>
            </div>
            <div className="hand" style={{ fontSize: 18, opacity: 0.65, lineHeight: 1.2 }}>{sMeta.title}</div>
            <input type="password" value={pw} onChange={e => setPw(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submitPw()}
              placeholder={hasPassword ? 'enter a new password to re-unlock' : 'edit password'} style={inp} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={submitPw} className="clickable" style={{ border: 'none', background: 'transparent', padding: 0, flex: 1 }}>
                <WobbleFrame fill="#bfe3c8" stroke="var(--ink)" strokeWidth="2.6" radius="3"
                  innerStyle={{ padding: '10px 0', textAlign: 'center' }}>
                  <span className="pixel" style={{ fontSize: 15, color: 'var(--on-pastel)' }}>＋ UNLOCK &amp; SAVE</span>
                </WobbleFrame>
              </button>
              {hasPassword && (
                <button onClick={() => { onForgetPassword && onForgetPassword(); setPw(''); }} className="clickable"
                  style={{ border: 'none', background: 'transparent', padding: 0, flex: '0 0 auto' }}>
                  <WobbleFrame fill="transparent" stroke="var(--ink)" strokeWidth="2.4" radius="3"
                    innerStyle={{ padding: '10px 14px', textAlign: 'center' }}>
                    <span className="pixel" style={{ fontSize: 15, color: 'var(--ink)', opacity: 0.75 }}>✕ FORGET</span>
                  </WobbleFrame>
                </button>
              )}
            </div>
            <div className="hand" style={{ fontSize: 15, opacity: 0.5, lineHeight: 1.2 }}>
              the password is remembered on this device (not a cookie) so you only enter it once. viewing the page never needs it.
            </div>
          </WobbleFrame>

          <div className="hand" style={{ fontSize: 16, opacity: 0.5, lineHeight: 1.25, marginTop: 18 }}>
            themes &amp; categories now live in <strong>edit mode</strong> — tap the ✎ edit button up top.
          </div>

        </WobbleFrame>
      </div>
    </div>
  );
}

/* ===========================================================
   AddGoalModal — start a new savings goal (name · target · colour)
   =========================================================== */
function AddGoalModal({ open, onClose, onAdd, palette }) {
  const [name, setName] = useStateM('');
  const [target, setTarget] = useStateM('');
  const [col, setCol] = useStateM(palette[1] || palette[0]);
  if (!open) return null;

  const fld = {
    width: '100%', padding: '11px 12px', border: '2px solid var(--ink)', background: 'var(--paper)',
    color: 'var(--ink)', fontFamily: 'var(--font-pixel)', fontSize: 20, borderRadius: 2, outline: 'none',
  };
  const lbl = { fontSize: 15, letterSpacing: '0.05em', opacity: 0.7, marginBottom: 5, display: 'block' };
  const submit = () => {
    const t = parseFloat(target);
    if (!name.trim() || !t || t <= 0) return;
    onAdd(name.trim(), t, col);
    setName(''); setTarget(''); setCol(palette[1] || palette[0]);
    onClose();
  };

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 56,
      display: 'grid', placeItems: 'center', padding: 20,
    }}>
      <div onClick={ev => ev.stopPropagation()} style={{ width: 'min(420px, calc(100vw - 40px))', maxHeight: '92vh', overflowY: 'auto' }}>
        <WobbleFrame fill="var(--paper)" stroke="var(--ink)" strokeWidth="3" radius="3" double
          innerStyle={{ padding: '22px 22px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span className="pixel" style={{ fontSize: 26 }}>NEW SAVINGS GOAL</span>
            <button onClick={onClose} className="clickable" style={{ border: 'none', background: 'transparent', color: 'var(--ink)', fontSize: 28, opacity: 0.6 }}>✕</button>
          </div>

          <div style={{ marginBottom: 14 }}>
            <span className="pixel" style={lbl}>WHAT FOR?</span>
            <input value={name} autoFocus onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submit()} placeholder="e.g. new headphones" style={fld} />
          </div>

          <div style={{ marginBottom: 14 }}>
            <span className="pixel" style={lbl}>TARGET (SGD)</span>
            <input type="number" step="1" min="0" value={target}
              onChange={e => setTarget(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submit()} placeholder="0.00" style={fld} />
          </div>

          <div style={{ marginBottom: 18 }}>
            <span className="pixel" style={lbl}>COLOUR</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {palette.map(p => (
                <button key={p} onClick={() => setCol(p)} title={p}
                  style={{ width: 30, height: 30, background: p, border: '2px solid var(--ink)', borderRadius: '50%', padding: 0, cursor: 'pointer', outline: col === p ? '3px solid var(--ink)' : 'none', outlineOffset: 2 }} />
              ))}
            </div>
          </div>

          <button onClick={submit} className="clickable" style={{ border: 'none', background: 'transparent', padding: 0, width: '100%' }}>
            <WobbleFrame fill="#bfe3c8" stroke="var(--ink)" strokeWidth="2.8" radius="3"
              innerStyle={{ padding: '12px 0', textAlign: 'center' }}>
              <span className="pixel" style={{ fontSize: 20, color: 'var(--on-pastel)' }}>＋ START SAVING</span>
            </WobbleFrame>
          </button>
        </WobbleFrame>
      </div>
    </div>
  );
}

/* ===========================================================
   SavingsGoalModal — move money in/out of one goal
   =========================================================== */
function SavingsGoalModal({ open, onClose, goal, available, onDeposit, onWithdraw, onDelete }) {
  const [amt, setAmt] = useStateM('');
  React.useEffect(() => { setAmt(''); }, [goal && goal.id]);
  if (!open || !goal) return null;

  const pct = goal.target > 0 ? Math.round((goal.saved / goal.target) * 100) : 0;
  const done = goal.target > 0 && goal.saved >= goal.target;
  const n = parseFloat(amt);
  const valid = n > 0;
  const canDeposit = valid && n <= available + 0.0001;
  const canWithdraw = valid && n <= goal.saved + 0.0001;

  const fld = {
    width: '100%', padding: '11px 12px', border: '2px solid var(--ink)', background: 'var(--paper)',
    color: 'var(--ink)', fontFamily: 'var(--font-pixel)', fontSize: 22, borderRadius: 2, outline: 'none',
  };
  const moveBtn = (ok, fill) => ({
    flex: 1, border: 'none', background: 'transparent', padding: 0,
    opacity: ok ? 1 : 0.35, pointerEvents: ok ? 'auto' : 'none',
  });

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 57,
      display: 'grid', placeItems: 'center', padding: 20,
    }}>
      <div onClick={ev => ev.stopPropagation()} style={{ width: 'min(430px, calc(100vw - 40px))', maxHeight: '92vh', overflowY: 'auto' }}>
        <WobbleFrame fill="var(--paper)" stroke="var(--ink)" strokeWidth="3" radius="3" double
          innerStyle={{ padding: '22px 22px 24px' }}>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
              <span style={{ width: 18, height: 18, background: goal.color, border: '2px solid var(--ink)', borderRadius: '50%', flex: '0 0 auto' }} />
              <span className="pixel" style={{ fontSize: 27, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{goal.name}</span>
            </div>
            <button onClick={onClose} className="clickable" style={{ border: 'none', background: 'transparent', color: 'var(--ink)', fontSize: 28, opacity: 0.6 }}>✕</button>
          </div>

          {/* progress */}
          <WobbleFrame fill="transparent" stroke="var(--ink)" strokeWidth="2.4" radius="3"
            innerStyle={{ padding: '13px 15px', marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span className="pixel" style={{ fontSize: 30 }}>{MF.money(goal.saved)}</span>
              <span className="hand" style={{ fontSize: 19, opacity: 0.65 }}>of {MF.money(goal.target)}</span>
            </div>
            <div style={{ position: 'relative', height: 14, marginTop: 11 }}>
              <WobbleFrame fill="transparent" stroke="var(--ink)" strokeWidth="2" radius="20" pad="2"
                style={{ position: 'absolute', inset: 0 }} innerStyle={{ height: '100%' }}>
                <div style={{ position: 'absolute', left: 3, top: 3, bottom: 3, width: `calc(${Math.max(0, Math.min(100, pct))}% - 6px)`, minWidth: pct > 0 ? 4 : 0, background: goal.color, borderRadius: 20, transition: 'width 0.25s ease' }} />
              </WobbleFrame>
            </div>
            <div className="pixel" style={{ fontSize: 16, opacity: 0.6, marginTop: 9 }}>{done ? 'goal reached! 🎉' : pct + '% there'}</div>
          </WobbleFrame>

          <div className="hand" style={{ fontSize: 19, opacity: 0.7, marginBottom: 9 }}>
            available to move in: <strong className="pixel" style={{ fontSize: 19 }}>{MF.money(Math.max(0, available))}</strong>
          </div>

          <input type="number" step="0.01" min="0" value={amt} autoFocus
            onChange={e => setAmt(e.target.value)} placeholder="amount $" style={{ ...fld, marginBottom: 12 }} />

          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            <button onClick={() => { if (canDeposit) { onDeposit(goal.id, n); setAmt(''); } }} className="clickable" style={moveBtn(canDeposit)}>
              <WobbleFrame fill="#bfe3c8" stroke="var(--ink)" strokeWidth="2.6" radius="3" innerStyle={{ padding: '11px 0', textAlign: 'center' }}>
                <span className="pixel" style={{ fontSize: 18, color: 'var(--on-pastel)' }}>↑ DEPOSIT</span>
              </WobbleFrame>
            </button>
            <button onClick={() => { if (canWithdraw) { onWithdraw(goal.id, n); setAmt(''); } }} className="clickable" style={moveBtn(canWithdraw)}>
              <WobbleFrame fill="#f6bfc4" stroke="var(--ink)" strokeWidth="2.6" radius="3" innerStyle={{ padding: '11px 0', textAlign: 'center' }}>
                <span className="pixel" style={{ fontSize: 18, color: 'var(--on-pastel)' }}>↓ WITHDRAW</span>
              </WobbleFrame>
            </button>
          </div>

          <button onClick={() => { onDelete(goal.id); onClose(); }} className="clickable"
            style={{ border: 'none', background: 'transparent', padding: 0, width: '100%' }}>
            <WobbleFrame fill="transparent" stroke="var(--ink)" strokeWidth="2.2" radius="3" innerStyle={{ padding: '9px 0', textAlign: 'center' }}>
              <span className="pixel" style={{ fontSize: 16, color: 'var(--ink)', opacity: 0.7 }}>✕ DELETE GOAL</span>
            </WobbleFrame>
          </button>
        </WobbleFrame>
      </div>
    </div>
  );
}

/* ===========================================================
   ThemesModal — preset swatches + custom bg/text colour + custom font + size
   (edit mode). customTheme = { bg, text, fontUrl, fontFamily } | null
   =========================================================== */
function ThemesModal({ open, onClose, themes = [], theme, setTheme, customTheme, setCustomTheme, fontScale, setFontScale }) {
  if (!open) return null;
  const ct = customTheme || {};
  const custom = !!customTheme;
  const secLbl = { display: 'block', fontSize: 14, letterSpacing: '0.06em', opacity: 0.55, margin: '20px 0 11px' };
  const inp = {
    width: '100%', padding: '10px 12px', border: '2px solid var(--ink)', background: 'var(--paper)',
    color: 'var(--ink)', fontFamily: 'var(--font-pixel)', fontSize: 17, borderRadius: 2, outline: 'none',
  };
  const patch = (k, v) => setCustomTheme({
    bg: ct.bg || '#fbfbf8', text: ct.text || '#161616', fontUrl: ct.fontUrl || '', fontFamily: ct.fontFamily || '',
    [k]: v,
  });
  const usePreset = (id) => { setCustomTheme(null); setTheme(id); };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 60, display: 'grid', placeItems: 'center', padding: 20 }}>
      <div onClick={ev => ev.stopPropagation()} style={{ width: 'min(460px, calc(100vw - 40px))', maxHeight: '88vh', overflowY: 'auto' }}>
        <WobbleFrame fill="var(--paper)" stroke="var(--ink)" strokeWidth="3" radius="3" double innerStyle={{ padding: '22px 22px 24px' }}>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
            <span className="pixel" style={{ fontSize: 24 }}>🎨 THEMES</span>
            <button onClick={onClose} className="clickable" style={{ border: 'none', background: 'transparent', color: 'var(--ink)', fontSize: 24, opacity: 0.6 }}>✕</button>
          </div>

          {/* presets */}
          <span className="pixel" style={secLbl}>PRESETS</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
            {themes.map(th => {
              const on = !custom && theme === th.id;
              return (
                <button key={th.id} onClick={() => usePreset(th.id)}
                  style={{ border: 'none', background: 'transparent', padding: 0, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 50, height: 50, borderRadius: 5, background: th.sw, border: '2px solid var(--ink)', outline: on ? '3px solid var(--ink)' : 'none', outlineOffset: 2 }} />
                  <span className="pixel" style={{ fontSize: 12, opacity: on ? 1 : 0.55 }}>{th.label}</span>
                </button>
              );
            })}
          </div>

          {/* custom colours */}
          <span className="pixel" style={secLbl}>CUSTOM COLOURS {custom && <span style={{ opacity: 0.6 }}>· active</span>}</span>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <input type="color" className="color-swatch" value={ct.bg || '#fbfbf8'} onChange={e => patch('bg', e.target.value)}
                style={{ width: 42, height: 42, borderRadius: 6, cursor: 'pointer' }} />
              <span className="hand" style={{ fontSize: 19 }}>background</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <input type="color" className="color-swatch" value={ct.text || '#161616'} onChange={e => patch('text', e.target.value)}
                style={{ width: 42, height: 42, borderRadius: 6, cursor: 'pointer' }} />
              <span className="hand" style={{ fontSize: 19 }}>text</span>
            </label>
            {custom && (
              <button onClick={() => setCustomTheme(null)} className="clickable" style={{ border: 'none', background: 'transparent', padding: 0, alignSelf: 'center' }}>
                <WobbleFrame fill="transparent" stroke="var(--ink)" strokeWidth="2.2" radius="3" innerStyle={{ padding: '8px 12px' }}>
                  <span className="pixel" style={{ fontSize: 14, color: 'var(--ink)', opacity: 0.75 }}>✕ back to preset</span>
                </WobbleFrame>
              </button>
            )}
          </div>

          {/* custom font */}
          <span className="pixel" style={secLbl}>CUSTOM FONT (paste a link)</span>
          <input value={ct.fontUrl || ''} onChange={e => patch('fontUrl', e.target.value)}
            placeholder="https://… .ttf / .woff2 or Google Fonts CSS" style={{ ...inp, marginBottom: 9 }} />
          <input value={ct.fontFamily || ''} onChange={e => patch('fontFamily', e.target.value)}
            placeholder="font family name (e.g. Inter)" style={inp} />
          <div className="hand" style={{ fontSize: 14, opacity: 0.5, marginTop: 7, lineHeight: 1.2 }}>
            leave blank to keep the OMORI pixel font. clear the fields to remove a custom font.
          </div>

          {/* font size */}
          <span className="pixel" style={secLbl}>FONT SIZE — {Math.round(fontScale * 100)}%</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span className="pixel" style={{ fontSize: 14, opacity: 0.6 }}>A</span>
            <input type="range" min="0.8" max="1.6" step="0.05" value={fontScale}
              onChange={e => setFontScale(parseFloat(e.target.value))} style={{ flex: 1, accentColor: 'var(--ink)' }} />
            <span className="pixel" style={{ fontSize: 26, opacity: 0.6 }}>A</span>
          </div>

        </WobbleFrame>
      </div>
    </div>
  );
}

/* ===========================================================
   CategoryManagerModal — create / rename / recolour / remove any
   category (incl. defaults). 'others' is the protected fallback.
   =========================================================== */
function CatRow({ c, onUpdate, onRemove }) {
  const [label, setLabel] = useStateM(c.label);
  React.useEffect(() => { setLabel(c.label); }, [c.label]);
  const protectedCat = c.id === 'others';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
      <input type="color" className="color-swatch round" value={c.color} onChange={e => onUpdate(c.id, { color: e.target.value })}
        style={{ width: 32, height: 32, borderRadius: '50%', cursor: 'pointer', flex: '0 0 auto' }} />
      <input value={label} onChange={e => setLabel(e.target.value)} onBlur={() => onUpdate(c.id, { label })}
        onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()}
        style={{ flex: 1, minWidth: 0, padding: '8px 10px', border: '2px solid var(--ink)', background: 'var(--paper)', color: 'var(--ink)', fontFamily: 'var(--font-pixel)', fontSize: 17, borderRadius: 2, outline: 'none' }} />
      {protectedCat
        ? <span className="pixel" style={{ fontSize: 11, opacity: 0.35, flex: '0 0 auto' }}>fallback</span>
        : <button onClick={() => onRemove(c.id)} title="remove (entries move to Others)"
            style={{ border: 'none', background: 'transparent', color: 'var(--ink)', opacity: 0.4, fontSize: 19, padding: 2, flex: '0 0 auto' }}>✕</button>}
    </div>
  );
}

function CategoryManagerModal({ open, onClose, categories = [], palette = [], onAdd, onUpdate, onRemove }) {
  const [nm, setNm] = useStateM('');
  const [col, setCol] = useStateM(palette[0] || '#f8c8d8');
  if (!open) return null;
  const inp = {
    width: '100%', padding: '11px 12px', border: '2px solid var(--ink)', background: 'var(--paper)',
    color: 'var(--ink)', fontFamily: 'var(--font-pixel)', fontSize: 18, borderRadius: 2, outline: 'none',
  };
  const submit = () => { if (nm.trim()) { onAdd(nm, col); setNm(''); } };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 60, display: 'grid', placeItems: 'center', padding: 20 }}>
      <div onClick={ev => ev.stopPropagation()} style={{ width: 'min(460px, calc(100vw - 40px))', maxHeight: '88vh', overflowY: 'auto' }}>
        <WobbleFrame fill="var(--paper)" stroke="var(--ink)" strokeWidth="3" radius="3" double innerStyle={{ padding: '22px 22px 24px' }}>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <span className="pixel" style={{ fontSize: 23 }}>🏷 CATEGORIES</span>
            <button onClick={onClose} className="clickable" style={{ border: 'none', background: 'transparent', color: 'var(--ink)', fontSize: 24, opacity: 0.6 }}>✕</button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 16 }}>
            {categories.map(c => (
              <CatRow key={c.id} c={c} onUpdate={onUpdate} onRemove={onRemove} />
            ))}
          </div>

          <WobbleFrame fill="var(--paper-2)" stroke="var(--ink)" strokeWidth="2.4" radius="3"
            innerStyle={{ padding: 13, display: 'flex', flexDirection: 'column', gap: 11 }}>
            <span className="pixel" style={{ fontSize: 13, opacity: 0.6 }}>ADD A CATEGORY</span>
            <input value={nm} onChange={e => setNm(e.target.value)} placeholder="category name"
              onKeyDown={e => e.key === 'Enter' && submit()} style={inp} />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
              {palette.map(p => (
                <button key={p} onClick={() => setCol(p)} title={p}
                  style={{ width: 28, height: 28, background: p, border: '2px solid var(--ink)', borderRadius: '50%', padding: 0, cursor: 'pointer', outline: col === p ? '3px solid var(--ink)' : 'none', outlineOffset: 2 }} />
              ))}
              <input type="color" className="color-swatch round" value={col} onChange={e => setCol(e.target.value)} title="custom colour"
                style={{ width: 30, height: 30, borderRadius: '50%', cursor: 'pointer' }} />
            </div>
            <button onClick={submit} style={{ border: 'none', background: 'transparent', padding: 0, width: '100%' }}>
              <WobbleFrame fill="#bfe3c8" stroke="var(--ink)" strokeWidth="2.6" radius="3" innerStyle={{ padding: '10px 0', textAlign: 'center' }}>
                <span className="pixel" style={{ fontSize: 15, color: 'var(--on-pastel)' }}>＋ ADD CATEGORY</span>
              </WobbleFrame>
            </button>
          </WobbleFrame>

        </WobbleFrame>
      </div>
    </div>
  );
}

Object.assign(window, { DetailModal, SettingsModal, AddGoalModal, SavingsGoalModal, ThemesModal, CategoryManagerModal });
