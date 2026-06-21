/* atp i might just make this a scrapbook website with my memories since its really nice actually*/
const { useState: useStateSt, useRef: useRefSt, useEffect: useEffectSt } = React;

function Sticker({ st, onChange, onDelete, editMode }) {
  const [hover, setHover] = useStateSt(false);

  const startDrag = (e) => {
    if (!editMode) return;                 // images only move in edit mode
    if (e.button != null && e.button !== 0) return;
    const role = e.target && e.target.dataset && e.target.dataset.role;
    if (role === 'resize' || role === 'del') return;
    e.preventDefault();
    const sx = e.clientX, sy = e.clientY;
    const o = { x: st.x, y: st.y };
    const move = (ev) => onChange({ x: o.x + (ev.clientX - sx), y: o.y + (ev.clientY - sy) });
    const up = () => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
    };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
  };

  const startResize = (e) => {
    if (!editMode) return;
    e.preventDefault(); e.stopPropagation();
    const sx = e.clientX;
    const o = { w: st.w };
    const move = (ev) => onChange({ w: Math.max(48, Math.min(900, o.w + (ev.clientX - sx))) });
    const up = () => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
    };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
  };

  const shadow = hover ? 'drop-shadow(0 5px 12px rgba(0,0,0,0.30))' : 'drop-shadow(0 2px 5px rgba(0,0,0,0.18))';
  const img = (
    <img src={st.src} draggable={false} alt="" style={{
      width: '100%', height: 'auto', display: 'block', pointerEvents: 'none', borderRadius: st.framed ? 1 : 3,
    }} />
  );

  return (
    <div
      onPointerDown={startDrag}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: 'absolute', left: st.x, top: st.y, width: st.w, zIndex: 46,
        cursor: editMode ? 'grab' : 'default', touchAction: 'none', userSelect: 'none',
      }}>
      {st.framed ? (
        <WobbleFrame fill="var(--paper)" stroke="var(--ink)" strokeWidth="2.6" radius="3" pad="4"
          style={{ filter: shadow, transition: 'filter 0.12s ease' }}
          innerStyle={{ padding: 6 }}>
          {img}
        </WobbleFrame>
      ) : (
        <div style={{ filter: shadow, transition: 'filter 0.12s ease' }}>{img}</div>
      )}
      {hover && editMode && (
        <React.Fragment>
          <span style={{ position: 'absolute', inset: -5, border: '2px dashed var(--ink)', borderRadius: 6, pointerEvents: 'none', opacity: 0.45 }} />
          <button data-role="del" onPointerDown={(e) => e.stopPropagation()} onClick={() => onDelete(st.id)} title="remove image"
            style={{
              position: 'absolute', top: -13, right: -13, width: 26, height: 26, borderRadius: '50%',
              border: '2px solid var(--ink)', background: 'var(--paper)', color: 'var(--ink)',
              fontSize: 14, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
            }}>✕</button>
          <div data-role="resize" onPointerDown={startResize} title="drag to resize"
            style={{
              position: 'absolute', right: -10, bottom: -10, width: 20, height: 20, borderRadius: '50%',
              border: '2px solid var(--ink)', background: 'var(--paper)', cursor: 'nwse-resize',
            }} />
        </React.Fragment>
      )}
    </div>
  );
}

/* ---- a resizable rich-text note pinned to the page. Type freely; highlight
   text to get a formatting toolbar (bold/italic/underline/size/colour) plus a
   wobbly-border toggle, shown just above the box. Drag/resize in edit mode. ---- */
function NoteSticker({ st, onChange, onDelete, editMode }) {
  const [hover, setHover] = useStateSt(false);
  const [selOpen, setSelOpen] = useStateSt(false);
  const edRef = useRefSt(null);
  const rangeRef = useRefSt(null);
  const blurT = useRefSt(null);
  const sizeLvl = useRefSt(3);   // execCommand fontSize level 1–7, stepped by ▲/▼

  // inject saved html once (avoids caret jumps from re-rendering content)
  useEffectSt(() => { if (edRef.current) edRef.current.innerHTML = st.html || ''; }, []);
  // editing + toolbar are edit-mode only; hide the toolbar when leaving edit mode
  useEffectSt(() => { if (!editMode) setSelOpen(false); }, [editMode]);
  const save = () => { if (edRef.current) onChange({ html: edRef.current.innerHTML }); };

  const startDrag = (e) => {
    if (!editMode) return;
    const role = e.target && e.target.dataset && e.target.dataset.role;
    if (role !== 'move') return;                 // only the grab strip moves it
    e.preventDefault();
    const sx = e.clientX, sy = e.clientY, o = { x: st.x, y: st.y };
    const move = (ev) => onChange({ x: o.x + (ev.clientX - sx), y: o.y + (ev.clientY - sy) });
    const up = () => { document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', up); };
    document.addEventListener('pointermove', move); document.addEventListener('pointerup', up);
  };
  const startResize = (e) => {
    if (!editMode) return;
    e.preventDefault(); e.stopPropagation();
    const sx = e.clientX, sy = e.clientY, o = { w: st.w, h: st.h || 150 };
    const move = (ev) => onChange({ w: Math.max(120, Math.min(900, o.w + (ev.clientX - sx))), h: Math.max(70, Math.min(900, o.h + (ev.clientY - sy))) });
    const up = () => { document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', up); };
    document.addEventListener('pointermove', move); document.addEventListener('pointerup', up);
  };

  const checkSel = () => {
    if (!editMode) return;                         // read-only outside edit mode
    const sel = window.getSelection();
    const has = sel && !sel.isCollapsed && sel.toString().trim() && edRef.current && edRef.current.contains(sel.anchorNode);
    if (has) rangeRef.current = sel.getRangeAt(0).cloneRange();
    setSelOpen(!!has);
  };
  const stepSize = (dir) => {
    sizeLvl.current = Math.max(1, Math.min(7, sizeLvl.current + dir));
    exec('fontSize', String(sizeLvl.current));
  };
  const restore = () => {
    const r = rangeRef.current; if (!r) return;
    const s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
  };
  const exec = (cmd, val) => {
    if (edRef.current) edRef.current.focus();
    restore();
    document.execCommand('styleWithCSS', false, true);
    document.execCommand(cmd, false, val);
    save();
    const s = window.getSelection(); if (s.rangeCount) rangeRef.current = s.getRangeAt(0).cloneRange();
  };

  const tBtn = { border: '2px solid var(--ink)', background: 'var(--paper)', color: 'var(--ink)', borderRadius: 3, fontSize: 15, padding: '3px 8px', lineHeight: 1 };
  const fBtn = (label, cmd, extra) => (
    <button style={{ ...tBtn, ...extra }} onMouseDown={(e) => e.preventDefault()} onClick={() => exec(cmd)}>{label}</button>
  );

  const body = (
    <div ref={edRef} contentEditable={editMode} suppressContentEditableWarning className="note-box"
      onInput={save} onMouseUp={checkSel} onKeyUp={checkSel}
      onFocus={() => { if (blurT.current) clearTimeout(blurT.current); }}
      onBlur={() => { save(); blurT.current = setTimeout(() => setSelOpen(false), 200); }}
      data-ph={editMode ? 'type…' : ''}
      style={{ width: '100%', height: '100%', outline: 'none', overflow: 'auto', wordBreak: 'break-word', fontSize: 17, lineHeight: 1.25, cursor: editMode ? 'text' : 'default' }} />
  );
  const innerH = editMode ? 'calc(100% - 14px)' : '100%';

  return (
    <div onPointerDown={startDrag} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ position: 'absolute', left: st.x, top: st.y, width: st.w, height: st.h || 150, zIndex: 46, touchAction: 'none' }}>
      {selOpen && (
        <div onMouseDown={(e) => { if (e.target.tagName !== 'INPUT') e.preventDefault(); }}
          style={{ position: 'absolute', top: -46, left: 0, display: 'flex', gap: 5, alignItems: 'center', zIndex: 49, background: 'var(--paper)', border: '2px solid var(--ink)', borderRadius: 4, padding: 4 }}>
          {fBtn('B', 'bold', { fontWeight: 'bold' })}
          {fBtn('I', 'italic', { fontStyle: 'italic' })}
          {fBtn('U', 'underline', { textDecoration: 'underline' })}
          <button style={tBtn} title="smaller text" onMouseDown={(e) => e.preventDefault()} onClick={() => stepSize(-1)}>▼</button>
          <button style={tBtn} title="bigger text" onMouseDown={(e) => e.preventDefault()} onClick={() => stepSize(1)}>▲</button>
          <input type="color" title="text colour" onChange={(e) => exec('foreColor', e.target.value)}
            style={{ width: 26, height: 26, padding: 0, border: '2px solid var(--ink)', borderRadius: 3, background: 'none', cursor: 'pointer' }} />
          <button style={tBtn} title="wobbly border" onClick={() => onChange({ framed: !st.framed })}>{st.framed ? '▢' : '▭'}</button>
        </div>
      )}
      {editMode && <div data-role="move" title="drag to move" style={{ height: 14, cursor: 'grab', background: 'rgba(0,0,0,0.05)', borderBottom: '1px dashed var(--hair)' }} />}
      {st.framed ? (
        <WobbleFrame fill="var(--paper)" stroke="var(--ink)" strokeWidth="2.4" radius="3" pad="4"
          style={{ height: innerH }} innerStyle={{ height: '100%', padding: 8 }}>
          {body}
        </WobbleFrame>
      ) : (
        <div style={{ height: innerH, background: 'var(--paper)', padding: 8 }}>{body}</div>
      )}
      {hover && editMode && (
        <React.Fragment>
          <button data-role="del" onPointerDown={(e) => e.stopPropagation()} onClick={() => onDelete(st.id)} title="remove note"
            style={{ position: 'absolute', top: -13, right: -13, width: 26, height: 26, borderRadius: '50%', border: '2px solid var(--ink)', background: 'var(--paper)', color: 'var(--ink)', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, zIndex: 48 }}>✕</button>
          <div data-role="resize" onPointerDown={startResize} title="drag to resize"
            style={{ position: 'absolute', right: -10, bottom: -10, width: 20, height: 20, borderRadius: '50%', border: '2px solid var(--ink)', background: 'var(--paper)', cursor: 'nwse-resize', zIndex: 48 }} />
        </React.Fragment>
      )}
    </div>
  );
}

function StickerLayer({ stickers, onChange, onDelete, editMode }) {
  return (
    <React.Fragment>
      {stickers.map(st => (
        st.kind === 'note'
          ? <NoteSticker key={st.id} st={st} onChange={(p) => onChange(st.id, p)} onDelete={onDelete} editMode={editMode} />
          : <Sticker key={st.id} st={st} onChange={(p) => onChange(st.id, p)} onDelete={onDelete} editMode={editMode} />
      ))}
    </React.Fragment>
  );
}

/* ---- modal: pick an image, preview it, choose a wobbly border ---- */
function AddImageModal({ open, onClose, onAdd }) {
  const [src, setSrc] = useStateSt(null);
  const [framed, setFramed] = useStateSt(true);
  const [over, setOver] = useStateSt(false);
  const inputRef = useRefSt(null);

  useEffectSt(() => { if (open) { setSrc(null); setFramed(true); setOver(false); } }, [open]);
  if (!open) return null;

  const readFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    const r = new FileReader();
    r.onload = () => setSrc(r.result);
    r.readAsDataURL(file);
  };
  const submit = () => { if (src) { onAdd(src, framed); onClose(); } };

  const dropEmpty = (
    <div className="hand" style={{ textAlign: 'center', opacity: 0.6, fontSize: 22, lineHeight: 1.3 }}>
      drop an image or gif here<br />
      <span style={{ fontSize: 17, opacity: 0.8 }}>or click to browse</span>
    </div>
  );
  const previewImg = (
    <img src={src} alt="" style={{ maxWidth: '100%', maxHeight: 230, display: 'block', borderRadius: 2 }} />
  );

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 59,
      display: 'grid', placeItems: 'center', padding: 20,
    }}>
      <div onClick={ev => ev.stopPropagation()} style={{ width: 'min(440px, calc(100vw - 40px))', maxHeight: '92vh', overflowY: 'auto' }}>
        <WobbleFrame fill="var(--paper)" stroke="var(--ink)" strokeWidth="3" radius="3" double
          innerStyle={{ padding: '22px 22px 24px' }}>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span className="pixel" style={{ fontSize: 26 }}>ADD AN IMAGE</span>
            <button onClick={onClose} className="clickable" style={{ border: 'none', background: 'transparent', color: 'var(--ink)', fontSize: 28, opacity: 0.6 }}>✕</button>
          </div>

          {/* drop zone / preview */}
          <div
            onClick={() => inputRef.current && inputRef.current.click()}
            onDragOver={(e) => { e.preventDefault(); setOver(true); }}
            onDragLeave={() => setOver(false)}
            onDrop={(e) => { e.preventDefault(); setOver(false); readFile(e.dataTransfer.files && e.dataTransfer.files[0]); }}
            style={{ cursor: 'pointer', marginBottom: 16 }}>
            <WobbleFrame fill={over ? 'var(--paper-2)' : 'var(--paper)'} stroke="var(--ink)" strokeWidth="2.4" radius="3" dashed={!src}
              innerStyle={{ minHeight: 150, padding: 16, display: 'grid', placeItems: 'center' }}>
              {src
                ? (framed
                    ? <WobbleFrame fill="var(--paper)" stroke="var(--ink)" strokeWidth="2.6" radius="3" innerStyle={{ padding: 6 }}>{previewImg}</WobbleFrame>
                    : previewImg)
                : dropEmpty}
            </WobbleFrame>
          </div>
          <input ref={inputRef} type="file" accept="image/*,image/gif" hidden
            onChange={(e) => { readFile(e.target.files && e.target.files[0]); e.target.value = ''; }} />

          {/* wobbly border toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 18 }}>
            <span className="pixel" style={{ fontSize: 18 }}>WOBBLY BORDER</span>
            <button onClick={() => setFramed(f => !f)} className="clickable" style={{ border: 'none', background: 'transparent', padding: 0 }}>
              <WobbleFrame fill={framed ? '#bfe3c8' : 'var(--paper)'} stroke="var(--ink)" strokeWidth="2.4" radius="20" pad="4"
                innerStyle={{ padding: '6px 16px' }}>
                <span className="pixel" style={{ fontSize: 16, color: framed ? 'var(--on-pastel)' : 'var(--ink)' }}>{framed ? 'ON' : 'OFF'}</span>
              </WobbleFrame>
            </button>
          </div>

          <button onClick={submit} className="clickable" disabled={!src}
            style={{ border: 'none', background: 'transparent', padding: 0, width: '100%', opacity: src ? 1 : 0.4, pointerEvents: src ? 'auto' : 'none' }}>
            <WobbleFrame fill="#d9c9ef" stroke="var(--ink)" strokeWidth="2.8" radius="3"
              innerStyle={{ padding: '12px 0', textAlign: 'center' }}>
              <span className="pixel" style={{ fontSize: 20, color: 'var(--on-pastel)' }}>＋ ADD TO PAGE</span>
            </WobbleFrame>
          </button>
        </WobbleFrame>
      </div>
    </div>
  );
}

Object.assign(window, { StickerLayer, AddImageModal });
