// Shared UI primitives: phone frame, status bar, header, bottom nav, badges, icons.

// ── Icons (line, 1.6 stroke, current color) ──────────────────────────────
const Icon = {
  home:    (p) => <svg viewBox="0 0 24 24" {...p}><path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/></svg>,
  log:     (p) => <svg viewBox="0 0 24 24" {...p}><path d="M5 12.5 10 17 19 7"/></svg>,
  board:   (p) => <svg viewBox="0 0 24 24" {...p}><path d="M6 21V11"/><path d="M12 21V5"/><path d="M18 21v-7"/></svg>,
  history: (p) => <svg viewBox="0 0 24 24" {...p}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>,
  plus:    (p) => <svg viewBox="0 0 24 24" {...p}><path d="M12 5v14M5 12h14"/></svg>,
  gear:    (p) => <svg viewBox="0 0 24 24" {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/></svg>,
  search:  (p) => <svg viewBox="0 0 24 24" {...p}><circle cx="11" cy="11" r="6"/><path d="m20 20-3.5-3.5"/></svg>,
  arrow:   (p) => <svg viewBox="0 0 24 24" {...p}><path d="M19 12H5M11 6l-6 6 6 6"/></svg>,
  chevR:   (p) => <svg viewBox="0 0 24 24" {...p}><path d="m9 6 6 6-6 6"/></svg>,
  chevD:   (p) => <svg viewBox="0 0 24 24" {...p}><path d="m6 9 6 6 6-6"/></svg>,
  check:   (p) => <svg viewBox="0 0 24 24" {...p}><path d="M5 12.5 10 17 19 7"/></svg>,
  x:       (p) => <svg viewBox="0 0 24 24" {...p}><path d="M6 6l12 12M18 6l-12 12"/></svg>,
  lock:    (p) => <svg viewBox="0 0 24 24" {...p}><rect x="5" y="11" width="14" height="9" rx="1"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>,
  star:    (p) => <svg viewBox="0 0 24 24" {...p}><path d="m12 3 2.6 5.6L20 9.4l-4 4 1 5.6L12 16.3 7 19l1-5.6-4-4 5.4-.8Z"/></svg>,
  share:   (p) => <svg viewBox="0 0 24 24" {...p}><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7"/><path d="M16 6l-4-4-4 4"/><path d="M12 2v14"/></svg>,
  copy:    (p) => <svg viewBox="0 0 24 24" {...p}><rect x="8" y="8" width="12" height="12" rx="1"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/></svg>,
  flame:   (p) => <svg viewBox="0 0 24 24" {...p}><path d="M12 3s4 4 4 9a4 4 0 0 1-8 0c0-2 1-3 1-3s-1-3 3-6Z"/></svg>,
  trophy:  (p) => <svg viewBox="0 0 24 24" {...p}><path d="M8 4h8v6a4 4 0 0 1-8 0Z"/><path d="M5 5h3v3a3 3 0 0 1-3-3ZM19 5h-3v3a3 3 0 0 0 3-3Z"/><path d="M10 14h4v3l1 3H9l1-3Z"/></svg>,
};

// ── Phone frame ──────────────────────────────────────────────────────────
function Phone({ children }) {
  return (
    <div className="phone">
      <div className="phone-inner">
        <StatusBar/>
        {children}
        <div className="home-ind"/>
      </div>
    </div>
  );
}

function StatusBar() {
  return (
    <div className="statusbar">
      <span>9:41</span>
      <div className="island"/>
      <span className="ind">
        {/* signal */}
        <svg width="17" height="11" viewBox="0 0 17 11" fill="currentColor"><rect x="0" y="7" width="3" height="4" rx=".5"/><rect x="4.5" y="5" width="3" height="6" rx=".5"/><rect x="9" y="3" width="3" height="8" rx=".5"/><rect x="13.5" y="0" width="3" height="11" rx=".5"/></svg>
        {/* wifi */}
        <svg width="16" height="11" viewBox="0 0 16 11" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M1.5 4.5C3.5 2.5 5.7 1.5 8 1.5s4.5 1 6.5 3"/><path d="M3.7 6.7C4.9 5.6 6.4 5 8 5s3.1.6 4.3 1.7"/><path d="M6.1 8.8C6.6 8.4 7.3 8.2 8 8.2s1.4.2 1.9.6"/></svg>
        {/* battery */}
        <svg width="26" height="12" viewBox="0 0 26 12" fill="none" stroke="currentColor" strokeWidth="1"><rect x=".5" y=".5" width="22" height="11" rx="2.5"/><rect x="2" y="2" width="17" height="8" rx="1.2" fill="currentColor"/><rect x="24" y="3.5" width="1.5" height="5" rx=".5" fill="currentColor"/></svg>
      </span>
    </div>
  );
}

// ── Member badge ─────────────────────────────────────────────────────────
function MBadge({ member, size = "", tone, className = "" }) {
  const m = member || {};
  const sz = size ? size : "";
  const klass = `mbadge ${sz} ${m.you ? "you" : ""} ${className}`.trim();
  const t = tone || (m.you ? undefined : m.tone);
  return (
    <span className={klass} data-tone={t}>
      {m.initials || (m.name ? m.name.slice(0,2).toUpperCase() : "??")}
    </span>
  );
}

// ── Bottom nav ───────────────────────────────────────────────────────────
function BottomNav({ tab, onTab }) {
  const items = [
    { id: "home",    label: "Home",    icon: Icon.home },
    { id: "log",     label: "Log",     icon: Icon.log },
    { id: "board",   label: "Board",   icon: Icon.board },
    { id: "history", label: "History", icon: Icon.history },
  ];
  return (
    <nav className="btmnav">
      {items.map(it => (
        <button key={it.id} className="btmnav-item"
                data-active={tab === it.id ? "1" : "0"}
                onClick={() => onTab(it.id)}>
          <span className="pip"/>
          {it.icon()}
          <span>{it.label}</span>
        </button>
      ))}
    </nav>
  );
}

// ── Screen header (mobile app header) ────────────────────────────────────
function SHeader({ title, eyebrow, sub, onBack, right }) {
  return (
    <header className="row" style={{ padding: "14px 16px 12px", gap: 12, alignItems: "flex-start" }}>
      {onBack && (
        <button className="iconbtn" onClick={onBack} aria-label="Back" style={{ marginTop: 2 }}>
          {Icon.arrow()}
        </button>
      )}
      <div className="grow stack" style={{ gap: 2 }}>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1 className="h1" style={{ fontSize: 30, marginTop: 2 }}>{title}</h1>
        {sub && <div className="body-sm mono" style={{ marginTop: 2 }}>{sub}</div>}
      </div>
      {right}
    </header>
  );
}

// ── Toast ────────────────────────────────────────────────────────────────
function Toast({ msg, sub }) {
  if (!msg) return null;
  return (
    <div className="toast-wrap">
      <div className="toast">
        <span className="dot"/>
        <span><b>{msg}</b>{sub && <span style={{ opacity: .7 }}> · {sub}</span>}</span>
      </div>
    </div>
  );
}

// ── Small helpers ────────────────────────────────────────────────────────
function fmtNum(n) {
  if (n == null) return "—";
  return n.toLocaleString();
}
function fmtPts(n, { sign = false, fixed = 1 } = {}) {
  if (n == null) return "—";
  const s = (n >= 0 && sign ? "+" : "") + n.toFixed(fixed);
  return s;
}

Object.assign(window, { Icon, Phone, StatusBar, MBadge, BottomNav, SHeader, Toast, fmtNum, fmtPts });
