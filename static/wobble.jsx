/* ===========================================================
   wobble.jsx — OMORI boiling hand-drawn linework
   Exports (window): WobbleDefs, WobbleFrame, WobbleLine, WobbleHr
   =========================================================== */
const { useRef, useState, useLayoutEffect } = React;

/* Global filter defs. `scale` = frame jitter strength (px of displacement),
   `textScale` = subtle title jitter. Three seed variants per target produce
   the 3-frame "boil" that the CSS steps() animation cycles through. */
function WobbleDefs({ scale = 2.6, textScale = 1.1 }) {
  const seeds = [7, 23, 51];
  const mk = (idPrefix, sc, freq) =>
    seeds.map((seed, i) => (
      <filter key={idPrefix + i} id={idPrefix + i} x="-20%" y="-20%" width="140%" height="140%">
        <feTurbulence type="fractalNoise" baseFrequency={freq} numOctaves="1" seed={seed} result="n" />
        <feDisplacementMap in="SourceGraphic" in2="n" scale={sc} xChannelSelector="R" yChannelSelector="G" />
      </filter>
    ));
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
      <defs>
        {mk('wob-', scale, 0.018)}
        {mk('wobt-', textScale, 0.012)}
      </defs>
    </svg>
  );
}

/* A boiling rectangular frame. Draws the border as an SVG (which jitters),
   while children sit crisply on top. */
function WobbleFrame({
  children, fill = 'transparent', stroke = '#161616', strokeWidth = 2.5,
  radius = 2, pad = 7, dashed = false, double = false, animate = true,
  style = {}, className = '', innerStyle = {}, ...rest
}) {
  const ref = useRef(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    const ro = new ResizeObserver(() => {
      setBox({ w: el.offsetWidth, h: el.offsetHeight });
    });
    ro.observe(el);
    setBox({ w: el.offsetWidth, h: el.offsetHeight });
    return () => ro.disconnect();
  }, []);

  const w = box.w, h = box.h;
  const rectProps = {
    x: pad, y: pad, width: Math.max(0, w - pad * 2), height: Math.max(0, h - pad * 2),
    rx: radius, ry: radius, fill, stroke, strokeWidth,
    strokeDasharray: dashed ? '7 6' : undefined,
    vectorEffect: 'non-scaling-stroke',
  };
  return (
    <div ref={ref} className={className} style={{ position: 'relative', ...style }} {...rest}>
      {w > 0 && (
        <svg
          width={w} height={h}
          style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'visible', zIndex: 0 }}
          className={animate ? 'wobble-anim' : ''}
          aria-hidden="true"
        >
          <rect {...rectProps} />
          {double && (
            <rect
              x={pad + 4} y={pad + 4}
              width={Math.max(0, w - pad * 2 - 8)} height={Math.max(0, h - pad * 2 - 8)}
              rx={radius} ry={radius} fill="none" stroke={stroke}
              strokeWidth={Math.max(1, strokeWidth - 1)} vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>
      )}
      <div style={{ position: 'relative', zIndex: 1, ...innerStyle }}>{children}</div>
    </div>
  );
}

/* A standalone boiling horizontal divider. */
function WobbleHr({ stroke = '#161616', strokeWidth = 2.5, style = {}, animate = true }) {
  const ref = useRef(null);
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    const ro = new ResizeObserver(() => setW(el.offsetWidth));
    ro.observe(el); setW(el.offsetWidth);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={ref} style={{ width: '100%', height: 12, ...style }}>
      {w > 0 && (
        <svg width={w} height="12" style={{ overflow: 'visible' }} className={animate ? 'wobble-anim' : ''} aria-hidden="true">
          <line x1="2" y1="6" x2={w - 2} y2="6" stroke={stroke} strokeWidth={strokeWidth} vectorEffect="non-scaling-stroke" />
        </svg>
      )}
    </div>
  );
}

Object.assign(window, { WobbleDefs, WobbleFrame, WobbleHr });
