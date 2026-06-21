/* ===========================================================
   charts.jsx — hand-drawn SVG charts (no chart lib)
   Exports (window): DonutChart, SpendLineChart, CategoryBars, InOutBars
   All read pre-filtered entries. Pastel fills + boiling black outlines.
   =========================================================== */
const F = window.Finance;

/* ---- shared helpers ---- */
function sumByCat(entries) {
  const out = {};
  F.CATEGORIES.forEach(c => { out[c.id] = 0; });
  // category charts track consumption (spendOf): normal expenses + friend-covered ('cover')
  entries.forEach(e => { const sp = F.spendOf(e); if (sp > 0 && e.cat in out) out[e.cat] += sp; });
  return out;
}
function polar(cx, cy, r, a) {
  const rad = (a - 90) * Math.PI / 180;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
}
function arcPath(cx, cy, rOut, rIn, a0, a1) {
  const [x0, y0] = polar(cx, cy, rOut, a1);
  const [x1, y1] = polar(cx, cy, rOut, a0);
  const [x2, y2] = polar(cx, cy, rIn, a0);
  const [x3, y3] = polar(cx, cy, rIn, a1);
  const large = a1 - a0 > 180 ? 1 : 0;
  return `M${x0},${y0} A${rOut},${rOut} 0 ${large} 0 ${x1},${y1} L${x2},${y2} A${rIn},${rIn} 0 ${large} 1 ${x3},${y3} Z`;
}

/* ===================== DONUT — spending by category ===================== */
function DonutChart({ entries, onPick }) {
  const totals = sumByCat(entries);
  const grand = Object.values(totals).reduce((a, b) => a + b, 0);
  const cx = 130, cy = 130, rOut = 104, rIn = 60;
  let angle = 0;
  const segs = F.CATEGORIES.map(c => {
    const v = totals[c.id];
    const sweep = grand > 0 ? (v / grand) * 360 : 0;
    const seg = { c, v, a0: angle, a1: angle + sweep };
    angle += sweep;
    return seg;
  }).filter(s => s.v > 0);

  return (
    <div>
    <div style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
      <svg viewBox="0 0 260 260" width="230" height="230" style={{ flex: '0 1 auto', overflow: 'visible', maxWidth: '100%', height: 'auto' }}>
        <g className="wobble-anim">
          {grand === 0 && <circle cx={cx} cy={cy} r={rOut} fill="var(--paper-2)" stroke="var(--ink)" strokeWidth="2.5" />}
          {segs.map(s => (
            <path key={s.c.id} d={arcPath(cx, cy, rOut, rIn, s.a0 + 1, s.a1 - 1)}
              fill={s.c.color} stroke="var(--ink)" strokeWidth="2.4" strokeLinejoin="round"
              className={onPick ? 'chart-slice' : ''}
              style={{ cursor: onPick ? 'pointer' : 'default' }}
              onClick={() => onPick && onPick(s.c)}>
              <title>{s.c.label}</title>
            </path>
          ))}
        </g>
        <text x={cx} y={cy - 6} textAnchor="middle" className="pixel" fontSize="18" fill="var(--ink)">SPENT</text>
        <text x={cx} y={cy + 20} textAnchor="middle" className="pixel" fontSize="31" fill="var(--ink)">
          {F.moneyShort(grand)}
        </text>
      </svg>
      <div style={{ flex: '1 1 150px', minWidth: 150, display: 'flex', flexDirection: 'column', gap: 7 }}>
        {F.CATEGORIES.map(c => {
          const v = totals[c.id];
          const pct = grand > 0 ? Math.round((v / grand) * 100) : 0;
          return (
            <div key={c.id} onClick={() => onPick && v > 0 && onPick(c)}
              className={onPick && v > 0 ? 'clickable' : ''}
              style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 22, opacity: v > 0 ? 1 : 0.4, cursor: onPick && v > 0 ? 'pointer' : 'default' }}>
              <span style={{ width: 16, height: 16, background: c.color, border: '2px solid var(--ink)', flex: '0 0 auto' }} />
              <span style={{ flex: 1 }}>{c.label}</span>
              <span className="pixel" style={{ fontSize: 17 }}>{pct}%</span>
              <span style={{ minWidth: 84, textAlign: 'right' }}>{F.money(v)}</span>
            </div>
          );
        })}
      </div>
    </div>
    {onPick && <div className="hand" style={{ fontSize: 18, opacity: 0.5, marginTop: 10 }}>tap a slice to see those purchases</div>}
    </div>
  );
}

/* ===================== LINE/AREA — spending over time ===================== */
function SpendLineChart({ entries, buckets, onPick }) {
  const [hover, setHover] = React.useState(null); // index
  const wrapRef = React.useRef(null);
  const [size, setSize] = React.useState({ w: 460, h: 240 });
  React.useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  // buckets: [{label, start, end}] oldest→newest
  const data = buckets.map(b => {
    const total = entries
      .filter(e => e.date >= b.start && e.date <= b.end)
      .reduce((a, e) => a + F.spendOf(e), 0);
    return { label: b.label, total, bucket: b };
  });

  // draw at the REAL pixel size of the container so the chart fills the card
  // and points never spill past the edge (no viewBox up/down-scaling).
  const W = Math.max(220, Math.round(size.w));
  const H = Math.max(150, Math.round(size.h));
  const padL = 52, padR = 16, padT = 16, padB = 30;
  const max = Math.max(10, ...data.map(d => d.total)) * 1.15;
  const innerW = W - padL - padR, innerH = H - padT - padB;
  const x = i => padL + (data.length <= 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
  const y = v => padT + innerH - (v / max) * innerH;
  const pts = data.map((d, i) => [x(i), y(d.total)]);
  const linePath = pts.map((p, i) => (i ? 'L' : 'M') + p[0] + ',' + p[1]).join(' ');
  const areaPath = pts.length
    ? `M${pts[0][0]},${padT + innerH} ` + pts.map(p => `L${p[0]},${p[1]}`).join(' ') + ` L${pts[pts.length - 1][0]},${padT + innerH} Z`
    : '';
  const gl = [0, 0.5, 1];

  return (
    <div style={{ height: '100%', minHeight: 220, display: 'flex', flexDirection: 'column' }}>
      <div ref={wrapRef} style={{ flex: 1, minHeight: 150, position: 'relative' }}>
        <svg width={W} height={H} style={{ display: 'block', overflow: 'visible' }}>
          {/* gridlines + y labels */}
          {gl.map((g, i) => (
            <g key={i}>
              <line x1={padL} y1={y(max * g)} x2={W - padR} y2={y(max * g)} stroke="var(--ink)" strokeWidth="1" opacity="0.22" />
              <text x={padL - 8} y={y(max * g) + 5} textAnchor="end" className="pixel" fontSize="14" fill="var(--ink)" opacity="0.7">{F.moneyShort(max * g)}</text>
            </g>
          ))}
          <g className="wobble-anim">
            <path d={areaPath} fill="#bcd9f0" opacity="0.55" />
            <path d={linePath} fill="none" stroke="var(--ink)" strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round" />
          </g>
          {/* hover guide line */}
          {hover != null && (
            <line x1={pts[hover][0]} y1={padT} x2={pts[hover][0]} y2={padT + innerH} stroke="var(--ink)" strokeWidth="1.5" opacity="0.3" />
          )}
          {pts.map((p, i) => (
            <circle key={'d' + i} cx={p[0]} cy={p[1]} r={hover === i ? 7 : 4.5}
              fill={hover === i ? '#bcd9f0' : 'var(--paper)'} stroke="var(--ink)" strokeWidth="2.4" style={{ transition: 'r 0.08s' }} />
          ))}
          {data.map((d, i) => (
            <text key={'x' + i} x={x(i)} y={H - 8} textAnchor="middle" className="pixel" fontSize="14" fill="var(--ink)" opacity={hover === i ? 1 : 0.75}>{d.label}</text>
          ))}
          {/* fat invisible hit targets */}
          {pts.map((p, i) => (
            <rect key={'h' + i} x={x(i) - innerW / (data.length * 2) - 2} y={padT} width={innerW / data.length + 4} height={innerH}
              fill="transparent" style={{ cursor: 'pointer' }}
              onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}
              onClick={() => onPick && onPick(data[i].bucket, data[i].total)} />
          ))}
        </svg>
        {/* tooltip */}
        {hover != null && (
          <div className="pixel" style={{
            position: 'absolute', left: pts[hover][0], top: Math.max(0, pts[hover][1] - 14),
            transform: 'translate(-50%, -100%)', pointerEvents: 'none', whiteSpace: 'nowrap', zIndex: 5,
          }}>
            <span style={{ display: 'inline-block', background: 'var(--paper)', border: '2px solid var(--ink)', borderRadius: 3, padding: '5px 10px', fontSize: 15 }}>
              {data[hover].label} · {F.money(data[hover].total)}
            </span>
          </div>
        )}
      </div>
      <div className="hand" style={{ textAlign: 'center', fontSize: 18, opacity: 0.5, marginTop: 4, flex: '0 0 auto' }}>tap a point to see that day's spending</div>
    </div>
  );
}

/* ===================== HORIZONTAL category bars ===================== */
function CategoryBars({ entries }) {
  const totals = sumByCat(entries);
  const max = Math.max(1, ...Object.values(totals));
  const rows = F.CATEGORIES.map(c => ({ c, v: totals[c.id] }));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {rows.map(({ c, v }) => (
        <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="hand" style={{ width: 'clamp(64px, 24vw, 120px)', flex: '0 0 auto', fontSize: 21 }}>{c.label}</span>
          <div style={{ flex: 1, height: 22, position: 'relative' }}>
            <svg width="100%" height="22" viewBox="0 0 300 22" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
              <g className="wobble-anim">
                <rect x="1" y="2" width={Math.max(2, (v / max) * 296)} height="18" fill={c.color} stroke="var(--ink)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
              </g>
            </svg>
          </div>
          <span className="pixel" style={{ width: 92, textAlign: 'right', fontSize: 17 }}>{F.money(v)}</span>
        </div>
      ))}
    </div>
  );
}

/* ===================== Income vs Expense bars ===================== */
function InOutBars({ entries }) {
  // IN vs OUT = real cash flow (a friend-covered 'cover' expense moves no cash)
  const inc = entries.reduce((a, e) => a + Math.max(0, F.cashOf(e)), 0);
  const exp = entries.reduce((a, e) => a + Math.max(0, -F.cashOf(e)), 0);
  const net = inc - exp;
  const max = Math.max(10, inc, exp);
  const W = 300, H = 200, base = 160, bw = 70;
  const hIn = (inc / max) * 130, hExp = (exp / max) * 130;
  const bar = (cx, h, color, label, val) => (
    <g>
      <g className="wobble-anim">
        <rect x={cx - bw / 2} y={base - h} width={bw} height={h} fill={color} stroke="var(--ink)" strokeWidth="2.4" />
      </g>
      <text x={cx} y={base + 20} textAnchor="middle" className="pixel" fontSize="26" fill="var(--ink)">{label}</text>
      <text x={cx} y={base - h - 9} textAnchor="middle" className="pixel" fontSize="28" fill="var(--ink)">{F.moneyShort(val)}</text>
    </g>
  );
  return (
    <div>
      {/* Fixed width/height ATTRS give the SVG a known intrinsic size, so it
          never collapses to empty (the old width="100%" + no height did, inside
          the mobile stacked flex card). CSS max-width:100% + height:auto then
          scales it DOWN on narrow phones and caps it at its design size on wide
          cards — so it can never balloon either. */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H}
          style={{ overflow: 'visible', display: 'block', maxWidth: '100%', height: 'auto' }}>
          <line x1="20" y1={base} x2={W - 20} y2={base} stroke="var(--ink)" strokeWidth="2" />
          {bar(95, hIn, '#bfe3c8', 'IN', inc)}
          {bar(205, hExp, '#f6bfc4', 'OUT', exp)}
        </svg>
      </div>
      <div style={{ textAlign: 'center', marginTop: 6, fontSize: 24 }} className="hand">
        net <strong className="pixel" style={{ fontSize: 24, color: net >= 0 ? '#2f6b45' : '#b04a52' }}>{F.money(net)}</strong>
      </div>
    </div>
  );
}

Object.assign(window, { DonutChart, SpendLineChart, CategoryBars, InOutBars });
