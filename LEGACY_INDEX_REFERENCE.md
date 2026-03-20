# Legacy monolithic `index.html` (deprecated)

The app is now **Vite + React** — see `src/` and root `index.html` (entry only).

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Workout Challenge</title>
<link href="https://fonts.googleapis.com/css2?family=Unbounded:wght@400;700;900&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet" />
<style>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --bg: #0E0E0E;
  --surface: #1A1A1A;
  --surface2: #222222;
  --border: rgba(255,255,255,0.07);
  --border2: rgba(255,255,255,0.13);
  --text: #F0EBE1;
  --muted: #6B6560;
  --muted2: #9A948E;
  --gold: #E8A020;
  --gold-dim: rgba(232,160,32,0.12);
  --green: #4ADE80;
  --green-dim: rgba(74,222,128,0.12);
  --red: #F87171;
  --red-dim: rgba(248,113,113,0.12);
  --blue: #60A5FA;
  --blue-dim: rgba(96,165,250,0.12);
  --purple: #C084FC;
  --purple-dim: rgba(192,132,252,0.12);
}

body { font-family: 'DM Sans', sans-serif; background: var(--bg); color: var(--text); min-height: 100vh; }

/* NAV */
.nav {
  display: flex; align-items: center; justify-content: space-between;
  padding: 1.25rem 2rem; border-bottom: 1px solid var(--border);
  position: sticky; top: 0; background: rgba(14,14,14,0.95);
  backdrop-filter: blur(8px); z-index: 100; gap: 12px;
}
.nav-logo { font-family: 'Unbounded', sans-serif; font-size: 0.85rem; font-weight: 700; letter-spacing: 0.06em; color: var(--gold); text-transform: uppercase; white-space: nowrap; }
.nav-date { font-size: 0.72rem; color: var(--muted2); white-space: nowrap; }
.nav-tabs { display: flex; gap: 4px; flex-wrap: wrap; }
.tab-btn {
  background: none; border: 1px solid transparent; border-radius: 8px; padding: 6px 14px;
  font-family: 'DM Sans', sans-serif; font-size: 0.8rem; font-weight: 500; color: var(--muted2);
  cursor: pointer; transition: all 0.15s; white-space: nowrap;
}
.tab-btn:hover { color: var(--text); border-color: var(--border2); }
.tab-btn.active { color: var(--gold); border-color: var(--gold); background: var(--gold-dim); }

/* MAIN */
.main { max-width: 980px; margin: 0 auto; padding: 2rem 1.5rem 4rem; }
.section { display: none; }
.section.active { display: block; }

/* SECTION HEADERS */
.section-header { margin-bottom: 1.75rem; }
.section-title { font-family: 'Unbounded', sans-serif; font-size: clamp(1.4rem,4vw,2rem); font-weight: 900; line-height: 1.1; letter-spacing: -0.02em; color: var(--text); }
.section-sub { font-size: 0.8rem; color: var(--muted2); margin-top: 0.4rem; }

/* SCORING KEY */
.scoring-key { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 1.75rem; }
.key-item { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 7px 13px; font-size: 0.72rem; color: var(--muted2); display: flex; align-items: center; gap: 6px; }
.key-val { font-weight: 600; font-size: 0.78rem; }
.key-val.pos { color: var(--green); }
.key-val.neg { color: var(--red); }
.key-val.blue { color: var(--blue); }
.key-val.purple { color: var(--purple); }

/* PERSON CARDS (Log tab) */
.person-cards { display: flex; flex-direction: column; gap: 12px; }

.person-card {
  background: var(--surface); border: 1px solid var(--border); border-radius: 14px;
  padding: 1.1rem 1.25rem;
  display: grid; grid-template-columns: 130px 1fr 130px 1fr 72px 120px;
  align-items: center; gap: 14px; transition: border-color 0.15s;
}
.person-card:hover { border-color: var(--border2); }
.person-card.saved { border-color: rgba(74,222,128,0.25); background: rgba(74,222,128,0.03); }

.person-name { font-family: 'Unbounded', sans-serif; font-size: 0.72rem; font-weight: 700; letter-spacing: 0.04em; color: var(--text); }
.person-free { font-size: 0.6rem; color: var(--muted); margin-top: 4px; line-height: 1.7; }

.field-label { font-size: 0.6rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--muted); margin-bottom: 5px; display: flex; gap: 4px; }

/* DROPDOWNS */
select.field-select {
  width: 100%; background: var(--surface2); border: 1px solid var(--border2); border-radius: 8px;
  padding: 8px 28px 8px 10px; font-family: 'DM Sans', sans-serif; font-size: 0.8rem; color: var(--text);
  cursor: pointer; outline: none; appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%236B6560' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat; background-position: right 10px center; transition: border-color 0.12s;
}
select.field-select:focus { border-color: var(--gold); }
select.field-select.sel-green { border-color: var(--green); color: var(--green); background-color: var(--green-dim); }
select.field-select.sel-red   { border-color: var(--red);   color: var(--red);   background-color: var(--red-dim);   }
select.field-select.sel-blue  { border-color: var(--blue);  color: var(--blue);  background-color: var(--blue-dim);  }

/* NUMBER INPUTS */
input[type="number"], input[type="text"] {
  background: var(--surface2); border: 1px solid var(--border2); border-radius: 8px;
  padding: 8px 10px; font-family: 'DM Sans', sans-serif; font-size: 0.8rem; color: var(--text);
  width: 100%; outline: none; -moz-appearance: textfield; transition: border-color 0.12s;
}
input[type="number"]::-webkit-outer-spin-button,
input[type="number"]::-webkit-inner-spin-button { -webkit-appearance: none; }
input[type="number"]:focus, input[type="text"]:focus { border-color: var(--gold); }
input:disabled { opacity: 0.45; cursor: not-allowed; }

.steps-wrap { display: flex; flex-direction: column; }
.steps-hint { font-size: 0.58rem; color: var(--muted); }

/* DAILY PTS */
.pts-col { text-align: right; }
.daily-pts { font-family: 'Unbounded', sans-serif; font-size: 1.1rem; font-weight: 700; line-height: 1; }
.daily-pts.pos { color: var(--green); }
.daily-pts.neg { color: var(--red); }
.daily-pts.zero { color: var(--muted2); }
.daily-pts-label { font-size: 0.58rem; color: var(--muted); margin-top: 3px; }

/* SAVE BUTTON */
button.save-person {
  background: var(--gold); color: #0E0E0E; border: none; border-radius: 8px;
  padding: 9px 0; width: 100%; font-family: 'Unbounded', sans-serif; font-size: 0.62rem;
  font-weight: 700; letter-spacing: 0.04em; cursor: pointer; transition: opacity 0.15s; text-transform: uppercase;
}
button.save-person:hover { opacity: 0.85; }
button.save-person.saved-state { background: var(--green-dim); color: var(--green); border: 1px solid rgba(74,222,128,0.3); }

/* INLINE CONFIRM BAR */
.confirm-bar {
  grid-column: 1 / -1; background: rgba(232,160,32,0.08); border: 1px solid rgba(232,160,32,0.3);
  border-radius: 10px; padding: 10px 14px; display: flex; align-items: center;
  justify-content: space-between; gap: 12px; font-size: 0.78rem; color: var(--muted2);
}
.confirm-bar-btns { display: flex; gap: 8px; flex-shrink: 0; }
.confirm-yes { background: var(--gold); color: #0E0E0E; border: none; border-radius: 6px; padding: 6px 16px; font-family: 'Unbounded', sans-serif; font-size: 0.6rem; font-weight: 700; letter-spacing: 0.04em; cursor: pointer; text-transform: uppercase; }
.confirm-no { background: none; border: 1px solid var(--border2); border-radius: 6px; padding: 6px 14px; font-family: 'DM Sans', sans-serif; font-size: 0.75rem; color: var(--muted2); cursor: pointer; }
.confirm-no:hover { background: var(--surface2); color: var(--text); }

.dir-btn {
  flex: 1; padding: 7px 10px; border-radius: 8px; border: 1px solid var(--border2);
  background: var(--surface2); font-family: 'DM Sans', sans-serif; font-size: 0.75rem;
  color: var(--muted2); cursor: pointer; transition: all 0.12s; text-align: center;
}
.dir-btn:hover { border-color: var(--purple); color: var(--purple); }
.dir-btn.dir-active { background: var(--purple-dim); border-color: var(--purple); color: var(--purple); font-weight: 500; }

.window-warn {
  font-size: 0.58rem;
  color: var(--gold);
  margin-top: 3px;
  letter-spacing: 0.02em;
}

/* PASSWORD PROMPT */
.pw-bar {
  background: var(--surface2);
  border: 1px solid var(--border2);
  border-radius: 10px;
  padding: 10px 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 8px;
}
.pw-bar label { font-size: 0.68rem; color: var(--muted2); white-space: nowrap; }
.pw-bar input[type="password"] {
  flex: 1; min-width: 80px; max-width: 120px;
  background: var(--surface); border: 1px solid var(--border2); border-radius: 6px;
  padding: 6px 10px; font-family: 'DM Sans', sans-serif; font-size: 0.8rem;
  color: var(--text); outline: none;
}
.pw-bar input[type="password"]:focus { border-color: var(--gold); }
.pw-bar-btns { display: flex; gap: 6px; }
.pw-error { font-size: 0.65rem; color: var(--red); width: 100%; margin-top: 2px; }

/* UNLOCK ICON BUTTON */
.unlock-btn {
  background: none; border: 1px solid var(--border2); border-radius: 6px;
  padding: 4px 8px; cursor: pointer; color: var(--muted2); font-size: 0.7rem;
  display: inline-flex; align-items: center; gap: 4px; transition: all 0.12s;
  margin-left: auto; flex-shrink: 0;
}
.unlock-btn:hover { border-color: var(--gold); color: var(--gold); }

.goal-overlay-pw-err { font-size: 0.6rem; color: var(--red); }

/* GOAL RESET BADGE */
.reset-count {
  font-size: 0.58rem; color: var(--muted); margin-top: 2px;
}
.validation-msg { grid-column: 1 / -1; font-size: 0.72rem; color: var(--red); padding: 2px 2px; }

/* ── PROFILES ─────────────────────────────────── */
.profile-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }

.profile-card {
  background: var(--surface); border: 1px solid var(--border); border-radius: 16px;
  padding: 1.25rem; display: flex; flex-direction: column; gap: 1rem;
  transition: border-color 0.15s;
}
.profile-card:hover { border-color: var(--border2); }

.profile-header { display: flex; align-items: flex-start; gap: 12px; }

.profile-avatar {
  width: 40px; height: 40px; border-radius: 50%; background: var(--purple-dim);
  display: flex; align-items: center; justify-content: center;
  font-family: 'Unbounded', sans-serif; font-size: 0.65rem; font-weight: 700; color: var(--purple); flex-shrink: 0;
}

.profile-name { font-family: 'Unbounded', sans-serif; font-size: 0.78rem; font-weight: 700; color: var(--text); }
.profile-goal-label { font-size: 0.62rem; color: var(--muted); margin-top: 2px; }

/* PROGRESS BAR */
.progress-section { display: flex; flex-direction: column; gap: 6px; }
.progress-row { display: flex; justify-content: space-between; align-items: baseline; }
.progress-label { font-size: 0.65rem; color: var(--muted2); text-transform: uppercase; letter-spacing: 0.08em; }
.progress-val { font-family: 'Unbounded', sans-serif; font-size: 0.75rem; font-weight: 700; color: var(--purple); }
.progress-track { height: 6px; background: var(--surface2); border-radius: 3px; overflow: hidden; }
.progress-fill { height: 6px; background: var(--purple); border-radius: 3px; transition: width 0.4s ease; }
.progress-fill.complete { background: var(--green); }

/* GOAL INPUT ROW */
.goal-input-row { display: flex; flex-direction: column; gap: 6px; }
.goal-input-row label { font-size: 0.6rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--muted); }
.goal-input-inner { display: flex; gap: 8px; }
.goal-input-inner input { flex: 1; }

button.lock-btn {
  background: var(--purple-dim); color: var(--purple); border: 1px solid rgba(192,132,252,0.3);
  border-radius: 8px; padding: 8px 14px; font-family: 'Unbounded', sans-serif; font-size: 0.6rem;
  font-weight: 700; letter-spacing: 0.04em; cursor: pointer; white-space: nowrap; text-transform: uppercase;
  transition: opacity 0.15s;
}
button.lock-btn:hover { opacity: 0.8; }
button.lock-btn:disabled { opacity: 0.35; cursor: not-allowed; }
button.lock-btn.locked-state { background: var(--green-dim); color: var(--green); border-color: rgba(74,222,128,0.3); }

.goal-hint { font-size: 0.6rem; color: var(--muted); }

/* DAILY VALUE ROW */
.daily-value-section { display: flex; flex-direction: column; gap: 6px; }
.daily-value-row { display: flex; gap: 8px; align-items: flex-end; }
.daily-value-row > div { flex: 1; }

.pts-badge {
  background: var(--purple-dim); border: 1px solid rgba(192,132,252,0.2);
  border-radius: 8px; padding: 6px 10px; text-align: center; flex-shrink: 0; min-width: 64px;
}
.pts-badge-val { font-family: 'Unbounded', sans-serif; font-size: 0.9rem; font-weight: 700; color: var(--purple); }
.pts-badge-label { font-size: 0.55rem; color: var(--muted); margin-top: 1px; }
.pts-badge.at-goal .pts-badge-val { color: var(--green); }

.profile-confirm-bar {
  background: rgba(232,160,32,0.08); border: 1px solid rgba(232,160,32,0.3); border-radius: 10px;
  padding: 10px 12px; display: flex; align-items: center; justify-content: space-between;
  gap: 10px; font-size: 0.75rem; color: var(--muted2);
}

.saved-day-display {
  background: var(--green-dim); border: 1px solid rgba(74,222,128,0.2);
  border-radius: 8px; padding: 10px 12px; display: flex; justify-content: space-between; align-items: center;
}
.saved-day-val { font-family: 'Unbounded', sans-serif; font-size: 1rem; font-weight: 700; color: var(--green); }
.saved-day-label { font-size: 0.62rem; color: var(--muted2); }

/* LEADERBOARD */
.podium { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 2rem; align-items: end; }
.podium-card { border-radius: 14px; padding: 1.25rem 1rem; text-align: center; border: 1px solid var(--border); background: var(--surface); }
.podium-card.p1 { background: rgba(232,160,32,0.07); border-color: rgba(232,160,32,0.4); padding-top: 1.75rem; }
.podium-card.p2 { background: rgba(148,163,184,0.05); border-color: rgba(148,163,184,0.2); }
.podium-card.p3 { background: rgba(180,83,9,0.05); border-color: rgba(180,83,9,0.2); }
.podium-place { font-size: 0.62rem; letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 6px; }
.p1 .podium-place { color: var(--gold); }
.p2 .podium-place { color: #94A3B8; }
.p3 .podium-place { color: #B45309; }
.podium-avatar { width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-family: 'Unbounded', sans-serif; font-size: 0.75rem; font-weight: 700; margin: 0 auto 8px; }
.p1 .podium-avatar { background: var(--gold-dim); color: var(--gold); }
.p2 .podium-avatar { background: rgba(148,163,184,0.1); color: #94A3B8; }
.p3 .podium-avatar { background: rgba(180,83,9,0.1); color: #B45309; }
.podium-name { font-family: 'Unbounded', sans-serif; font-size: 0.75rem; font-weight: 700; color: var(--text); margin-bottom: 4px; }
.podium-score { font-family: 'Unbounded', sans-serif; font-size: 1.6rem; font-weight: 900; line-height: 1; }
.p1 .podium-score { color: var(--gold); }
.p2 .podium-score { color: #94A3B8; }
.p3 .podium-score { color: #B45309; }
.podium-pts-label { font-size: 0.6rem; color: var(--muted2); margin-top: 2px; }

.rankings { background: var(--surface); border: 1px solid var(--border); border-radius: 14px; overflow: hidden; }
.rank-row { display: grid; grid-template-columns: 44px 1fr 70px 80px 80px 90px 90px; align-items: center; padding: 12px 16px; border-bottom: 1px solid var(--border); gap: 8px; }
.rank-row:last-child { border-bottom: none; }
.rank-row:not(.header):hover { background: var(--surface2); }
.rank-row.header { font-size: 0.62rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--muted); background: var(--surface2); padding: 9px 16px; }
.rank-num { font-family: 'Unbounded', sans-serif; font-size: 0.72rem; font-weight: 700; color: var(--muted); }
.rank-name { font-size: 0.85rem; font-weight: 500; color: var(--text); display: flex; align-items: center; gap: 8px; }
.rank-initials { width: 28px; height: 28px; border-radius: 50%; background: var(--surface2); display: flex; align-items: center; justify-content: center; font-family: 'Unbounded', sans-serif; font-size: 0.55rem; font-weight: 700; color: var(--muted2); flex-shrink: 0; }
.rank-stat { font-size: 0.82rem; text-align: right; color: var(--muted2); }
.rank-total { font-family: 'Unbounded', sans-serif; font-size: 0.9rem; font-weight: 700; text-align: right; }
.rank-total.pos { color: var(--green); }
.rank-total.neg { color: var(--red); }
.rank-total.zero { color: var(--muted2); }

/* HISTORY */
.history-wrap { background: var(--surface); border: 1px solid var(--border); border-radius: 14px; overflow: hidden; }
.history-table-wrap { overflow-x: auto; }
table.history { width: 100%; border-collapse: collapse; font-size: 0.78rem; }
table.history th { text-align: left; font-size: 0.62rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--muted); padding: 9px 12px; background: var(--surface2); border-bottom: 1px solid var(--border); white-space: nowrap; }
table.history td { padding: 10px 12px; border-bottom: 1px solid var(--border); color: var(--muted2); white-space: nowrap; }
table.history tr:last-child td { border-bottom: none; }
table.history tr:hover td { background: var(--surface2); }

.pill { display: inline-block; padding: 2px 8px; border-radius: 20px; font-size: 0.65rem; font-weight: 500; }
.pill-green { background: var(--green-dim); color: var(--green); }
.pill-red   { background: var(--red-dim);   color: var(--red);   }
.pill-blue  { background: var(--blue-dim);  color: var(--blue);  }

.pts-cell { font-family: 'Unbounded', sans-serif; font-size: 0.72rem; font-weight: 700; }
.pts-cell.pos { color: var(--green); }
.pts-cell.neg { color: var(--red); }
.pts-cell.zero { color: var(--muted2); }

.empty-msg { text-align: center; padding: 3rem 1rem; color: var(--muted); font-size: 0.8rem; }

.clear-btn { background: none; border: 1px solid rgba(248,113,113,0.3); color: var(--red); border-radius: 6px; padding: 6px 14px; font-family: 'DM Sans', sans-serif; font-size: 0.72rem; cursor: pointer; transition: all 0.15s; }
.clear-btn:hover { background: var(--red-dim); }

.history-section-title { font-family: 'Unbounded', sans-serif; font-size: 0.8rem; font-weight: 700; color: var(--muted2); margin: 1.5rem 0 0.75rem; letter-spacing: 0.04em; }

.sheet-spinner {
  position: fixed;
  right: 16px;
  bottom: 16px;
  display: none;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(26,26,26,0.95);
  border: 1px solid var(--border2);
  box-shadow: 0 8px 20px rgba(0,0,0,0.7);
  z-index: 998;
  font-size: 0.7rem;
  color: var(--muted2);
}
.sheet-spinner-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  border: 2px solid var(--gold-dim);
  border-top-color: var(--gold);
  animation: spin 0.8s linear infinite;
}
.sheet-spinner-text {
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
@keyframes spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}

@media (max-width: 740px) {
  .person-card { grid-template-columns: 1fr 1fr; gap: 10px; }
  .person-card > .pts-col, .person-card > .save-col { grid-column: span 2; }
  .podium { grid-template-columns: 1fr; }
  .rank-row { grid-template-columns: 32px 1fr 70px 90px; }
  .rank-row > span:nth-child(4), .rank-row > span:nth-child(5), .rank-row > span:nth-child(6) { display: none; }
  .nav { padding: 1rem; flex-wrap: wrap; }
  .nav-date { display: none; }
  .profile-grid { grid-template-columns: 1fr; }
}
</style>
</head>
<body>

<nav class="nav">
  <span class="nav-logo">Summer Challenge</span>
  <span class="nav-date" id="navDate"></span>
  <div class="nav-tabs">
    <button class="tab-btn active"  onclick="switchTab('log',this)">Log Day</button>
    <button class="tab-btn"         onclick="switchTab('profiles',this)">Personal Goals</button>
    <button class="tab-btn"         onclick="switchTab('board',this)">Leaderboard</button>
    <button class="tab-btn"         onclick="switchTab('history',this)">History</button>
  </div>
</nav>

<div class="main">

  <!-- LOG DAY -->
  <div class="section active" id="tab-log">
    <div class="section-header">
      <div class="section-title">Log Today</div>
      <div class="section-sub" id="logDateSub"></div>
    </div>
    <div class="scoring-key">
      <div class="key-item"><span class="key-val pos">+1</span> Went to gym</div>
      <div class="key-item"><span class="key-val neg">0</span> Skipped gym</div>
      <div class="key-item"><span class="key-val pos">+1</span> Ate clean</div>
      <div class="key-item"><span class="key-val neg">−1</span> Ate junk</div>
      <div class="key-item"><span class="key-val pos">0–5</span> Steps (10k = 5pts)</div>
      <div class="key-item"><span class="key-val blue">★ Free</span> 5 uses max each</div>
      <div class="key-item"><span class="key-val purple">0–30</span> Personal goal</div>
    </div>
    <div class="person-cards" id="personCards"></div>
  </div>

  <!-- PROFILES -->
  <div class="section" id="tab-profiles">
    <div class="section-header">
      <div class="section-title">Personal Goals</div>
      <div class="section-sub">Set your goal once — log your current value each day to earn up to 30 bonus pts</div>
    </div>
    <div class="profile-grid" id="profileGrid"></div>
  </div>

  <!-- LEADERBOARD -->
  <div class="section" id="tab-board">
    <div class="section-header">
      <div class="section-title">Leaderboard</div>
      <div class="section-sub">Overall standings including personal goal bonus points</div>
    </div>
    <div class="podium" id="podium"></div>
    <div class="rankings" id="rankings"></div>
  </div>

  <!-- HISTORY -->
  <div class="section" id="tab-history">
    <div class="section-header" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
      <div>
        <div class="section-title">History</div>
        <div class="section-sub">All logged entries</div>
      </div>
      <button class="clear-btn" id="clearBtn" onclick="clearAll()">Clear all data</button>
    </div>
    <div id="historyContent"></div>
  </div>

</div>

<div class="sheet-spinner" id="sheetSpinner">
  <div class="sheet-spinner-dot"></div>
  <span class="sheet-spinner-text">Syncing sheets…</span>
</div>

<div id="loadingOverlay" style="position:fixed;inset:0;background:var(--bg);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;z-index:999;">
  <div style="font-family:'Unbounded',sans-serif;font-size:0.7rem;letter-spacing:0.1em;color:var(--gold);text-transform:uppercase;">Summer Challenge</div>
  <div style="font-size:0.72rem;color:var(--muted2)" id="loadingMsg">Loading data…</div>
</div>

<script>
const FREE_LIMIT = 5;
const PROFILE_MAX_PTS = 30;

const PEOPLE = [
  { id: 'kunle',  name: 'Kunle' },
  { id: 'ella',   name: 'Ella' },
  { id: 'scar',   name: 'Scar' },
  { id: 'marcus', name: 'Marcus' },
  { id: 'will',   name: 'Will' },
];

// ── DATE ────────────────────────────────────────────────────────────────
const CHALLENGE_START = '2026-03-17';

function today() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}
function todayDisplay() {
  return new Date().toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric', year:'numeric' });
}

/** Normalize date from Sheets/API to YYYY-MM-DD. Handles serial numbers and ISO strings so week math never gets NaN. */
function normalizeDateToYYYYMMDD(val) {
  if (val == null || val === '') return '';
  if (typeof val === 'number') {
    const d = new Date((val - 25569) * 86400000);
    if (isNaN(d.getTime())) return '';
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  const s = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  if (s.includes('T')) {
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  return s;
}

// ── CONFIG ────────────────────────────────────────────────────────────────
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxXa0jVtnde8ZBjsalrrmDzW4_m9heaXDzwrgcc6aHkuDWr6F8CXOpfQYds1h3NgljGug/exec';

// ── IN-MEMORY CACHE ────────────────────────────────────────────────────────
const cache = { entries: [], profiles: {}, passwords: {}, resetLog: [] };

// ── STORAGE (reads from cache) ─────────────────────────────────────────────
function loadData()     { return cache.entries; }
function loadProfiles() { return cache.profiles; }
function loadResetLog() { return cache.resetLog; }

function checkPassword(key, input) {
  return (cache.passwords[key] || '1234') === String(input);
}

// ── SHEETS SYNC ────────────────────────────────────────────────────────────
async function postToSheets(action, data) {
  if (!SCRIPT_URL || SCRIPT_URL === 'YOUR_APPS_SCRIPT_URL_HERE') return;
  try {
    await fetch(SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',       // Apps Script redirects POST cross-origin — no-cors lets it through
      body: JSON.stringify({ action, data })
    });
  } catch(err) {
    console.error('Sheets sync failed (' + action + '):', err);
  }
}

function setSheetSpinnerVisible(isVisible) {
  const el = document.getElementById('sheetSpinner');
  if (!el) return;
  el.style.display = isVisible ? 'inline-flex' : 'none';
}

// ── DATA INIT / REFRESH ─────────────────────────────────────────────────────
async function fetchSheetsIntoCache() {
  if (!SCRIPT_URL || SCRIPT_URL === 'YOUR_APPS_SCRIPT_URL_HERE') {
    return;
  }

  setSheetSpinnerVisible(true);

  let data;
  try {
    const res  = await fetch(SCRIPT_URL, { redirect: 'follow' });
    const text = await res.text();
    data = JSON.parse(text);
  } finally {
    // Hide spinner regardless of success/failure to avoid it getting stuck on
    setSheetSpinnerVisible(false);
  }

  if (data.error) throw new Error(data.error);

  // Workout entries (normalize date so serial/ISO from Sheets never breaks week math)
  cache.entries = (data.workout_log || []).map(r => ({
    date:      normalizeDateToYYYYMMDD(r.date) || today(),
    personId:  String(r.personId || ''),
    time:      String(r.time || '—'),
    gym:       String(r.gym || ''),
    steps:     parseFloat(r.steps) || 0,
    junk:      String(r.junk || ''),
    pts:       parseFloat(r.pts) || 0,
    lockedDay: r.lockedDay === true || r.lockedDay === 'TRUE'
  })).filter(r => r.date && r.personId);

  // Profiles
  cache.profiles = {};
  (data.profiles || []).forEach(r => {
    if (!r.personId) return;
    cache.profiles[r.personId] = {
      goal:       (r.goal !== '' && r.goal != null) ? parseFloat(r.goal) : null,
      startVal:   (r.startVal !== '' && r.startVal != null) ? parseFloat(r.startVal) : null,
      direction:  String(r.direction || 'down'),
      lockedGoal: r.lockedGoal === true || r.lockedGoal === 'TRUE',
      goalResets: parseInt(r.goalResets) || 0,
      entries:    []
    };
  });

  // Merge goal_log into profiles
  (data.goal_log || []).forEach(r => {
    const pid = String(r.personId || '');
    if (!cache.profiles[pid]) return;
    cache.profiles[pid].entries.push({
      date:      normalizeDateToYYYYMMDD(r.date) || String(r.date || '').slice(0, 10) || today(),
      time:      String(r.time || '—'),
      value:     parseFloat(r.value) || 0,
      pts:       parseFloat(r.pts)   || 0,
      lockedDay: r.lockedDay === true || r.lockedDay === 'TRUE'
    });
  });

  // Passwords
  cache.passwords = {};
  (data.passwords || []).forEach(r => {
    if (r.key) cache.passwords[String(r.key)] = String(r.password || '1234');
  });

  // Reset log
  cache.resetLog = (data.reset_log || []).map(r => ({
    date:              normalizeDateToYYYYMMDD(r.date) || String(r.date || '').slice(0, 10) || today(),
    time:              String(r.time || '—'),
    personId:          String(r.personId || ''),
    type:              String(r.type || ''),
    previousGoal:      r.previousGoal,
    previousStart:     r.previousStart,
    previousDirection: String(r.previousDirection || ''),
    resetNumber:       parseInt(r.resetNumber) || 0,
    goal:              r.goal,
    startVal:          r.startVal,
    direction:         String(r.direction || ''),
    setNumber:         parseInt(r.setNumber) || 0
  }));
}

async function initData() {
  if (!SCRIPT_URL || SCRIPT_URL === 'YOUR_APPS_SCRIPT_URL_HERE') {
    document.getElementById('loadingMsg').textContent = 'SCRIPT_URL not set — add your Apps Script URL to the HTML.';
    return;
  }

  try {
    await fetchSheetsIntoCache();
  } catch(err) {
    console.error('Failed to load from Sheets:', err);
    document.getElementById('loadingMsg').textContent = 'Could not connect to Google Sheets. Check your SCRIPT_URL and try refreshing.';
    return;
  }

  document.getElementById('loadingOverlay').style.display = 'none';
  buildForm();
}

// ── FREE COUNTS ──────────────────────────────────────────────────────────
function getFreeCounts(entries) {
  const counts = {};
  PEOPLE.forEach(p => { counts[p.id] = { gym: 0, junk: 0 }; });
  entries.forEach(e => {
    if (e.gym  === 'free-gym')  counts[e.personId].gym++;
    if (e.junk === 'free-junk') counts[e.personId].junk++;
  });
  return counts;
}

function getChallengeStart() {
  return CHALLENGE_START;
}

function dayIndex(date, startDate) {
  const msPerDay = 86400000;
  const a = new Date(String(startDate).slice(0, 10) + 'T00:00:00');
  const b = new Date(String(date).slice(0, 10) + 'T00:00:00');
  if (isNaN(a.getTime()) || isNaN(b.getTime())) return 0;
  return Math.floor((b - a) / msPerDay);
}

function windowOf(date, startDate) {
  return Math.floor(dayIndex(date, startDate) / 7);
}

function getWindowLimits(entries, personId) {
  const startDate   = getChallengeStart();
  const currentWin  = windowOf(today(), startDate);
  const winEntries  = entries.filter(e =>
    e.personId === personId && windowOf(e.date, startDate) === currentWin
  );

  const gymDays   = winEntries.filter(e => e.gym === 'went' || e.gym === 'free-gym').length;
  const cleanDays = winEntries.filter(e => e.junk === 'clean' || e.junk === 'free-junk').length;

  return {
    gymDays,
    cleanDays,
    gymMaxed:   gymDays   >= 4,
    cleanMaxed: cleanDays >= 6,
    windowNum:  currentWin + 1,
  };
}

function hasSavedToday(personId) {
  return loadData().some(e => e.date === today() && e.personId === personId);
}

// ── SCORING ──────────────────────────────────────────────────────────────
function calcPts(gym, steps, junk) {
  let pts = 0;
  if (gym === 'went' || gym === 'free-gym') pts += 1;
  if (junk === 'clean' || junk === 'free-junk') pts += 1;
  if (junk === 'ate') pts -= 1;
  const s = Math.max(0, parseFloat(steps) || 0);
  pts += Math.round(Math.min(s, 10000) / 10000 * 5 * 10) / 10;
  return Math.round(pts * 10) / 10;
}

function calcProfilePts(currentVal, goalVal, startVal, direction) {
  const goal  = parseFloat(goalVal);
  const curr  = parseFloat(currentVal);
  const start = parseFloat(startVal);
  if (isNaN(goal) || isNaN(curr) || isNaN(start)) return 0;
  const range = Math.abs(goal - start);
  if (range === 0) return curr === goal ? PROFILE_MAX_PTS : 0;
  const progress = direction === 'down'
    ? (start - curr) / range
    : (curr  - start) / range;
  return Math.round(Math.min(1, Math.max(0, progress)) * PROFILE_MAX_PTS * 10) / 10;
}

function getProfileStartVal(personId) {
  const profiles = loadProfiles();
  const p = profiles[personId];
  return (p && p.startVal !== undefined) ? p.startVal : null;
}

function getTodayProfileEntry(personId) {
  const profiles = loadProfiles();
  const p = profiles[personId];
  if (!p || !p.entries) return null;
  return p.entries.find(e => e.date === today()) || null;
}

// ── HELPERS ──────────────────────────────────────────────────────────────
function initials(name) { return name.slice(0,2).toUpperCase(); }
function fmtPts(n)      { return (n > 0 ? '+' : '') + n; }
function ptsClass(n)    { return n > 0 ? 'pos' : n < 0 ? 'neg' : 'zero'; }

/** Format date for History: show readable date (e.g. "Mar 17, 2026") instead of ISO or raw sheet value. */
function formatHistoryDate(val) {
  if (val == null || val === '' || String(val).trim() === '—') return '—';
  const s = String(val).trim();
  const d = s.includes('T') ? new Date(s) : new Date(s + 'T00:00:00');
  if (isNaN(d.getTime())) return s;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Format time for History: show time only (e.g. "6:21 AM"). Handles Sheets time-only values (1899-12-30T...). */
function formatHistoryTime(val) {
  if (val == null || val === '' || String(val).trim() === '—') return '—';
  const s = String(val).trim();
  if (s.includes('T')) {
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });
  }
  return s;
}

function selectColor(field, val) {
  if (!val) return '';
  if (field === 'gym')  return val === 'went' || val === 'free-gym' ? 'sel-green' : val === 'skip' ? 'sel-red' : '';
  if (field === 'junk') return val === 'clean' || val === 'free-junk' ? 'sel-green' : val === 'ate' ? 'sel-red' : '';
  return '';
}

// ── TABS ─────────────────────────────────────────────────────────────────
let activeTab = 'log';

function switchTab(tab, btn) {
  activeTab = tab;

  // Switch UI immediately using whatever is currently in cache
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + tab).classList.add('active');
  btn.classList.add('active');

  // Render from current cache right away
  if (tab === 'log')      buildForm();
  if (tab === 'board')    renderBoard();
  if (tab === 'history')  renderHistory();
  if (tab === 'profiles') renderProfiles();

  // Then refresh from Sheets in the background and re-render non-log tabs
  (async () => {
    try {
      await fetchSheetsIntoCache();
    } catch (err) {
      console.error('Tab refresh from Sheets failed:', err);
      return;
    }

    // Only update if user is still on the same tab
    if (activeTab === 'board') {
      renderBoard();
    } else if (activeTab === 'history') {
      renderHistory();
    } else if (activeTab === 'profiles') {
      renderProfiles();
    }
    // We intentionally do NOT auto-build the log tab here to avoid
    // blowing away any in-progress daily entries.
  })();
}

// ── LOG FORM ─────────────────────────────────────────────────────────────
const formState = {};

function buildForm() {
  document.getElementById('navDate').textContent = todayDisplay();
  document.getElementById('logDateSub').textContent = 'Logging for ' + todayDisplay();
  PEOPLE.forEach(p => { formState[p.id] = { gym: '', steps: '', junk: '' }; });
  renderCards();
}

function renderCards() {
  const entries    = loadData();
  const freeCounts = getFreeCounts(entries);
  const container  = document.getElementById('personCards');
  container.innerHTML = '';

  PEOPLE.forEach(p => {
    const fc           = freeCounts[p.id];
    const gymFreeLeft  = FREE_LIMIT - fc.gym;
    const junkFreeLeft = FREE_LIMIT - fc.junk;
    const state        = formState[p.id];
    const alreadySaved = hasSavedToday(p.id);

    // Workout points
    const savedEntry   = entries.find(e => e.date === today() && e.personId === p.id) || null;
    const hasValues    = state.gym && state.junk;
    const livePts      = hasValues ? calcPts(state.gym, state.steps, state.junk) : null;
    const dayWorkoutPts = alreadySaved && savedEntry ? savedEntry.pts : livePts;

    // Goal points for today
    const todayProfile = getTodayProfileEntry(p.id);
    const profilePts   = todayProfile ? todayProfile.pts : null;
    const totalToday   = (dayWorkoutPts || 0) + (profilePts || 0);

    // Window limits
    const wl = getWindowLimits(entries, p.id);
    const gymWentDisabled  = wl.gymMaxed;                        // went + free both blocked
    const gymFreeDisabled  = wl.gymMaxed || gymFreeLeft <= 0;
    const junkAteDisabled  = false;
    const junkCleanDisabled = wl.cleanMaxed;
    const junkFreeDisabled = wl.cleanMaxed || junkFreeLeft <= 0;

    // Gym select fully disabled if window maxed and only skip is left
    // (user has to pick skip — we leave select enabled but options restricted)
    const gymSelectDisabled  = alreadySaved;
    const junkSelectDisabled = alreadySaved;

    const gymWentLabel  = gymWentDisabled  ? '✓ Went (week limit reached)' : '✓ Went (+1)';
    const gymFreeLabel  = gymFreeDisabled  ? `★ Free (${wl.gymMaxed ? 'week limit' : 'none left'})` : '★ Free (+1)';
    const junkAteLabel  = '✗ Ate Junk (−1)';
    const junkCleanLabel= junkCleanDisabled? '✓ Ate Clean (week limit reached)' : '✓ Ate Clean (+1)';
    const junkFreeLabel = junkFreeDisabled ? `★ Free (${wl.cleanMaxed ? 'week limit' : 'none left'})` : '★ Free (+1)';

    const card = document.createElement('div');
    card.className = 'person-card' + (alreadySaved ? ' saved' : '');
    card.id = 'card-' + p.id;

    card.innerHTML = `
      <div>
        <div class="person-name">${p.name}</div>
        <div class="person-free">
          Week ${wl.windowNum} · Gym: ${wl.gymDays}/4<br>
          Gym: ${wl.gymDays}/4 · Clean: ${wl.cleanDays}/6<br>
          Free: Gym ${gymFreeLeft}/5 · Junk ${junkFreeLeft}/5
          ${profilePts !== null ? `<br><span style="color:var(--purple)">Goal: +${profilePts}pts</span>` : ''}
        </div>
      </div>

      <div>
        <div class="field-label">Gym</div>
        <select class="field-select ${selectColor('gym', state.gym)}" id="gym-${p.id}"
          onchange="onSelect('${p.id}','gym',this.value)" ${gymSelectDisabled?'disabled':''}>
          <option value="">— select —</option>
          <option value="went"     ${state.gym==='went'    ?'selected':''} ${gymWentDisabled ?'disabled':''}>${gymWentLabel}</option>
          <option value="skip"     ${state.gym==='skip'    ?'selected':''}>✗ Skipped (0)</option>
          <option value="free-gym" ${state.gym==='free-gym'?'selected':''} ${gymFreeDisabled ?'disabled':''}>${gymFreeLabel}</option>
        </select>
        ${wl.gymMaxed ? `<div class="window-warn">4/4 gym days used this week</div>` : ''}
      </div>

      <div class="steps-wrap">
        <div class="field-label">Steps <div class="steps-hint">10k = 5pts</div></div>
        <input type="number" min="0" max="99999" placeholder="0"
          value="${state.steps}" oninput="onSteps('${p.id}',this.value)"
          ${alreadySaved?'disabled':''} />
      </div>

      <div>
        <div class="field-label">Junk Food</div>
        <select class="field-select ${selectColor('junk', state.junk)}" id="junk-${p.id}"
          onchange="onSelect('${p.id}','junk',this.value)" ${junkSelectDisabled?'disabled':''}>
          <option value="">— select —</option>
          <option value="clean"     ${state.junk==='clean'    ?'selected':''} ${junkCleanDisabled?'disabled':''}>${junkCleanLabel}</option>
          <option value="ate"       ${state.junk==='ate'      ?'selected':''} ${junkAteDisabled  ?'disabled':''}>${junkAteLabel}</option>
          <option value="free-junk" ${state.junk==='free-junk'?'selected':''} ${junkFreeDisabled ?'disabled':''}>${junkFreeLabel}</option>
        </select>
        ${wl.cleanMaxed ? `<div class="window-warn">6/6 clean days used this week</div>` : ''}
      </div>

      <div class="pts-col">
        <div class="daily-pts ${dayWorkoutPts!==null && dayWorkoutPts!==undefined ? ptsClass(dayWorkoutPts) : 'zero'}" id="pts-${p.id}">
          ${dayWorkoutPts!==null && dayWorkoutPts!==undefined ? fmtPts(dayWorkoutPts) : '—'}
        </div>
        <div class="daily-pts-label">${alreadySaved ? 'saved workout pts' : 'pts today'}</div>
      </div>

      <div class="save-col">
        ${alreadySaved
          ? `<button class="save-person saved-state" disabled>Saved ✓</button>`
          : `<button class="save-person" onclick="askConfirm('${p.id}')">Save Day</button>`}
      </div>
    `;
    container.appendChild(card);
  });
}

function onSelect(personId, field, value) {
  formState[personId][field] = value;
  const sel = document.getElementById(field + '-' + personId);
  sel.className = 'field-select ' + selectColor(field, value);
  refreshCard(personId);
}

function onSteps(personId, value) {
  formState[personId].steps = value;
  refreshCard(personId);
}

function refreshCard(personId) {
  const state     = formState[personId];
  const hasValues = state.gym && state.junk;
  const pts       = hasValues ? calcPts(state.gym, state.steps, state.junk) : null;
  const ptEl      = document.getElementById('pts-' + personId);
  if (ptEl) {
    ptEl.textContent = pts !== null ? fmtPts(pts) : '—';
    ptEl.className   = 'daily-pts ' + (pts !== null ? ptsClass(pts) : 'zero');
  }
  const card = document.getElementById('card-' + personId);
  if (card) card.querySelectorAll('.confirm-bar, .validation-msg').forEach(el => el.remove());
}

function askConfirm(personId) {
  const state = formState[personId];
  const card  = document.getElementById('card-' + personId);
  if (!card) return;
  card.querySelectorAll('.confirm-bar, .validation-msg').forEach(el => el.remove());

  if (!state.gym || !state.junk) {
    const msg = document.createElement('div');
    msg.className = 'validation-msg';
    const missing = [];
    if (!state.gym)  missing.push('Gym');
    if (!state.junk) missing.push('Junk Food');
    msg.textContent = 'Please select: ' + missing.join(' and ');
    card.appendChild(msg);
    return;
  }

  const bar = document.createElement('div');
  bar.className = 'confirm-bar';
  bar.innerHTML = `
    <span>Once saved you can't update today's entry. Lock it in?</span>
    <div class="confirm-bar-btns">
      <button class="confirm-no"  onclick="cancelConfirm('${personId}')">Cancel</button>
      <button class="confirm-yes" onclick="savePerson('${personId}')">Lock In</button>
    </div>
  `;
  card.appendChild(bar);
}

function cancelConfirm(personId) {
  const card = document.getElementById('card-' + personId);
  if (card) card.querySelectorAll('.confirm-bar, .validation-msg').forEach(el => el.remove());
}

function savePerson(personId) {
  const state = formState[personId];
  const date  = today();
  const time  = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });
  const entry = {
    date, personId, time,
    gym:      state.gym,
    steps:    parseFloat(state.steps) || 0,
    junk:     state.junk,
    pts:      calcPts(state.gym, state.steps, state.junk),
    lockedDay: true
  };
  const idx = cache.entries.findIndex(e => e.date === date && e.personId === personId);
  if (idx >= 0) cache.entries[idx] = entry;
  else cache.entries.push(entry);
  postToSheets('saveWorkout', entry);
  renderCards();
}

// ── PROFILES ─────────────────────────────────────────────────────────────
const profileInputState = {};

function renderProfiles() {
  const profiles  = loadProfiles();
  const container = document.getElementById('profileGrid');
  container.innerHTML = '';

  PEOPLE.forEach(p => {
    if (!profileInputState[p.id]) profileInputState[p.id] = { goalInput: '', startInput: '', direction: 'down', valueInput: '' };
    const pData      = profiles[p.id] || { goal: null, startVal: null, direction: 'down', lockedGoal: false, entries: [] };
    const goalLocked = pData.lockedGoal;
    const goal       = pData.goal;
    const startVal   = pData.startVal;
    const direction  = pData.direction || 'down';
    const todayEntry = (pData.entries || []).find(e => e.date === today()) || null;

    let progressPct = 0;
    let previewPts  = null;
    if (goalLocked && startVal !== null) {
      if (todayEntry) {
        previewPts  = todayEntry.pts;
        progressPct = Math.min(100, Math.round(previewPts / PROFILE_MAX_PTS * 100));
      } else if (profileInputState[p.id].valueInput) {
        previewPts  = calcProfilePts(profileInputState[p.id].valueInput, goal, startVal, direction);
        progressPct = Math.min(100, Math.round(previewPts / PROFILE_MAX_PTS * 100));
      }
    }

    const isComplete = previewPts !== null && previewPts >= PROFILE_MAX_PTS;
    const dirLabel   = direction === 'down' ? 'Going down' : 'Going up';
    const inputDir   = profileInputState[p.id].direction;

    const card = document.createElement('div');
    card.className = 'profile-card';
    card.id = 'profile-card-' + p.id;

    card.innerHTML = `
      <div class="profile-header">
        <div class="profile-avatar">${initials(p.name)}</div>
        <div style="flex:1">
          <div class="profile-name">${p.name}</div>
          <div class="profile-goal-label">
            ${goalLocked
              ? `Goal: <strong style="color:var(--purple)">${goal}</strong> · Start: <strong>${startVal}</strong> · ${dirLabel}`
              : 'No goal set yet'}
          </div>
          ${pData.goalResets > 0 ? `<div class="reset-count">Goal reset ${pData.goalResets} time${pData.goalResets!==1?'s':''}</div>` : ''}
        </div>
        ${goalLocked ? `
          <button class="unlock-btn" onclick="showUnlockPrompt('${p.id}')" title="Reset goal">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="3" y="7" width="10" height="8" rx="1.5" stroke="currentColor" stroke-width="1.5"/>
              <path d="M5 7V5a3 3 0 0 1 6 0" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
            Reset
          </button>
        ` : ''}
      </div>
      <div id="unlock-prompt-${p.id}"></div>

      ${goalLocked ? `
        <div class="progress-section">
          <div class="progress-row">
            <span class="progress-label">Progress to goal</span>
            <span class="progress-val">${progressPct}%</span>
          </div>
          <div class="progress-track">
            <div class="progress-fill ${isComplete?'complete':''}" style="width:${progressPct}%"></div>
          </div>
        </div>
      ` : ''}

      <div class="goal-input-row">
        <label>${goalLocked ? 'Personal goal (locked)' : 'Set personal goal'}</label>
        ${!goalLocked ? `
          <div style="display:flex;gap:6px;margin-bottom:6px;">
            <button class="dir-btn ${inputDir==='down'?'dir-active':''}" onclick="setProfileDir('${p.id}','down')">Going down</button>
            <button class="dir-btn ${inputDir==='up'?'dir-active':''}"   onclick="setProfileDir('${p.id}','up')">Going up</button>
          </div>
        ` : ''}
        <div style="display:flex;gap:8px;margin-bottom:6px;">
          <div style="flex:1">
            <div class="field-label" style="margin-bottom:4px">Starting value</div>
            <input type="number" step="any" placeholder="e.g. 190"
              value="${goalLocked ? startVal : (profileInputState[p.id].startInput || '')}"
              id="start-input-${p.id}"
              oninput="profileInputState['${p.id}'].startInput = this.value"
              ${goalLocked ? 'disabled' : ''} />
          </div>
          <div style="flex:1">
            <div class="field-label" style="margin-bottom:4px">Goal value</div>
            <input type="number" step="any" placeholder="e.g. 175"
              value="${goalLocked ? goal : (profileInputState[p.id].goalInput || '')}"
              id="goal-input-${p.id}"
              oninput="profileInputState['${p.id}'].goalInput = this.value"
              ${goalLocked ? 'disabled' : ''} />
          </div>
        </div>
        ${!goalLocked ? `
          <button class="lock-btn" onclick="lockGoal('${p.id}')">Set Goal</button>
        ` : `
          <button class="lock-btn locked-state" disabled>Locked</button>
        `}
        <div class="goal-hint" style="margin-top:6px">
          ${goalLocked
            ? 'Your goal is locked. Log your current value daily to earn up to 30 pts.'
            : 'Set your starting value, target value, and direction. Cannot be changed once locked.'}
        </div>
      </div>

      ${goalLocked ? `
        <div class="daily-value-section">
          <div class="field-label">Today's value</div>
          ${todayEntry
            ? `<div class="saved-day-display">
                <div>
                  <div class="saved-day-val">${todayEntry.value}</div>
                  <div class="saved-day-label">Logged today · locked</div>
                </div>
                <div class="pts-badge ${isComplete?'at-goal':''}">
                  <div class="pts-badge-val">+${todayEntry.pts}</div>
                  <div class="pts-badge-label">pts earned</div>
                </div>
              </div>`
            : `<div class="daily-value-row">
                <div>
                  <input type="number" step="any" placeholder="Current value"
                    id="value-input-${p.id}"
                    value="${profileInputState[p.id].valueInput}"
                    oninput="onProfileValueInput('${p.id}', this.value)" />
                </div>
              </div>
              <div id="profile-confirm-${p.id}"></div>
              <button class="save-person" style="margin-top:4px" onclick="askProfileConfirm('${p.id}')">Save Today's Value</button>`
          }
        </div>
      ` : ''}
    `;
    container.appendChild(card);
  });
}

function setProfileDir(personId, dir) {
  profileInputState[personId].direction = dir;
  renderProfiles();
}


function showUnlockPrompt(personId) {
  const div = document.getElementById('unlock-prompt-' + personId);
  if (!div) return;
  if (div.innerHTML) { div.innerHTML = ''; return; }
  const name = PEOPLE.find(p => p.id === personId)?.name || personId;
  div.innerHTML = `
    <div class="pw-bar">
      <label>Enter ${name}'s password to reset goal:</label>
      <input type="password" id="unlock-pw-${personId}" placeholder="Password"
        onkeydown="if(event.key==='Enter') confirmUnlock('${personId}')" />
      <div class="pw-bar-btns">
        <button class="confirm-no" onclick="document.getElementById('unlock-prompt-${personId}').innerHTML=''">Cancel</button>
        <button class="confirm-yes" onclick="confirmUnlock('${personId}')">Unlock</button>
      </div>
      <div class="pw-error" id="unlock-err-${personId}"></div>
    </div>
  `;
  setTimeout(() => document.getElementById('unlock-pw-' + personId)?.focus(), 50);
}

function confirmUnlock(personId) {
  const input = document.getElementById('unlock-pw-' + personId);
  const errEl = document.getElementById('unlock-err-' + personId);
  if (!input) return;

  // Gate: resets only allowed March 16–20 2026
  const now       = new Date();
  const resetOpen  = new Date('2026-03-16T00:00:00');
  const resetClose = new Date('2026-03-20T23:59:59');
  if (now < resetOpen || now > resetClose) {
    if (errEl) errEl.textContent = 'Goal resets are only allowed March 16–20, 2026.';
    return;
  }

  if (!checkPassword(personId, input.value)) {
    if (errEl) errEl.textContent = 'Incorrect password. Try again.';
    input.value = '';
    input.focus();
    return;
  }

  const pData    = cache.profiles[personId];
  if (!pData) return;

  const resetCount = (pData.goalResets || 0) + 1;
  const time       = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });

  const resetEntry = {
    date: today(), time, personId,
    type: 'goal_reset',
    previousGoal: pData.goal, previousStart: pData.startVal, previousDirection: pData.direction,
    resetNumber: resetCount
  };
  cache.resetLog.push(resetEntry);
  postToSheets('appendResetLog', resetEntry);

  pData.goal       = null;
  pData.startVal   = null;
  pData.direction  = 'down';
  pData.lockedGoal = false;
  pData.goalResets = resetCount;

  postToSheets('saveProfile', { personId, goal: '', startVal: '', direction: 'down', lockedGoal: false, goalResets: resetCount });

  profileInputState[personId] = { goalInput: '', startInput: '', direction: 'down', valueInput: '' };
  renderProfiles();
}


function onProfileValueInput(personId, value) {
  profileInputState[personId].valueInput = value;
  const pData = cache.profiles[personId];
  if (!pData || !pData.lockedGoal) return;

  const pts  = calcProfilePts(value, pData.goal, pData.startVal, pData.direction || 'down');
  const ptEl = document.getElementById('profile-pts-' + personId);
  if (ptEl) ptEl.textContent = value ? '+' + pts : '—';

  const confirmDiv = document.getElementById('profile-confirm-' + personId);
  if (confirmDiv) confirmDiv.innerHTML = '';
}

function lockGoal(personId) {
  const goalInput  = document.getElementById('goal-input-' + personId);
  const startInput = document.getElementById('start-input-' + personId);
  const goalVal    = parseFloat(goalInput?.value);
  const startVal   = parseFloat(startInput?.value);
  const direction  = profileInputState[personId].direction || 'down';

  if (isNaN(goalVal))  { alert('Please enter a valid goal value.');    return; }
  if (isNaN(startVal)) { alert('Please enter a valid starting value.'); return; }

  const existing   = cache.profiles[personId] || { entries: [], goalResets: 0 };
  const resetCount = existing.goalResets || 0;
  const time       = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });

  cache.profiles[personId] = {
    ...existing,
    goal: goalVal, startVal, direction,
    lockedGoal: true,
    goalResets: resetCount
  };

  postToSheets('saveProfile', { personId, goal: goalVal, startVal, direction, lockedGoal: true, goalResets: resetCount });

  const resetEntry = { date: today(), time, personId, type: 'goal_set', goal: goalVal, startVal, direction, setNumber: resetCount + 1 };
  cache.resetLog.push(resetEntry);
  postToSheets('appendResetLog', resetEntry);

  renderProfiles();
}

function askProfileConfirm(personId) {
  const val        = profileInputState[personId]?.valueInput;
  const confirmDiv = document.getElementById('profile-confirm-' + personId);
  if (!confirmDiv) return;
  confirmDiv.innerHTML = '';

  if (!val || isNaN(parseFloat(val))) {
    confirmDiv.innerHTML = '<div style="font-size:0.72rem;color:var(--red);margin-top:4px">Please enter your current value first.</div>';
    return;
  }

  confirmDiv.innerHTML = `
    <div class="profile-confirm-bar" style="margin-top:8px">
      <span>Once saved you can't update today's value. Lock it in?</span>
      <div class="confirm-bar-btns">
        <button class="confirm-no" onclick="document.getElementById('profile-confirm-${personId}').innerHTML=''">Cancel</button>
        <button class="confirm-yes" onclick="saveProfileDay('${personId}')">Lock In</button>
      </div>
    </div>
  `;
}

function saveProfileDay(personId) {
  const val   = parseFloat(profileInputState[personId]?.valueInput);
  if (isNaN(val)) return;

  const pData = cache.profiles[personId];
  if (!pData || !pData.lockedGoal) return;

  if (!pData.entries) pData.entries = [];

  const pts  = calcProfilePts(val, pData.goal, pData.startVal, pData.direction || 'down');
  const date = today();
  const time = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });
  const entry = { date, value: val, pts, lockedDay: true, time };

  const existing = pData.entries.findIndex(e => e.date === date);
  if (existing >= 0) pData.entries[existing] = entry;
  else pData.entries.push(entry);

  postToSheets('saveGoalDay', { date, personId, time, value: val, pts, lockedDay: true });
  profileInputState[personId].valueInput = '';
  renderProfiles();
}

// ── LEADERBOARD ───────────────────────────────────────────────────────────
function getTotals(entries, profiles) {
  const totals = {};
  PEOPLE.forEach(p => { totals[p.id] = { name: p.name, pts: 0, days: 0, profilePts: 0 }; });

  entries.forEach(e => {
    if (totals[e.personId]) {
      totals[e.personId].pts  = Math.round((totals[e.personId].pts + e.pts) * 10) / 10;
      totals[e.personId].days++;
    }
  });

  PEOPLE.forEach(p => {
    const pData = profiles[p.id];
    if (pData && pData.entries) {
      const profileTotal = pData.entries.reduce((sum, e) => sum + (e.pts || 0), 0);
      totals[p.id].profilePts = Math.round(profileTotal * 10) / 10;
      totals[p.id].pts        = Math.round((totals[p.id].pts + totals[p.id].profilePts) * 10) / 10;
    }
  });

  return Object.values(totals).sort((a,b) => b.pts - a.pts);
}

function renderBoard() {
  const entries  = loadData();
  const profiles = loadProfiles();
  const ranked   = getTotals(entries, profiles);

  const freeCounts = getFreeCounts(entries);

  const podiumEl   = document.getElementById('podium');
  const rankingsEl = document.getElementById('rankings');

  if (entries.length === 0 && Object.keys(profiles).length === 0) {
    podiumEl.innerHTML   = '<div class="empty-msg" style="grid-column:1/-1">No data yet — log your first day!</div>';
    rankingsEl.innerHTML = '';
    return;
  }

  const pC = ['p1','p2','p3'];
  const pL = ['1st Place','2nd Place','3rd Place'];

  podiumEl.innerHTML = ranked.slice(0,3).map((r,i) => `
    <div class="podium-card ${pC[i]}">
      <div class="podium-place">${pL[i]}</div>
      <div class="podium-avatar">${initials(r.name)}</div>
      <div class="podium-name">${r.name}</div>
      <div class="podium-score">${r.pts}</div>
      <div class="podium-pts-label">${r.days} day${r.days!==1?'s':''} logged</div>
    </div>
  `).join('');

  rankingsEl.innerHTML = `
    <div class="rank-row header">
      <span>#</span><span>Player</span>
      <span style="text-align:right">Days</span>
      <span style="text-align:right">Avg/Day</span>
      <span style="text-align:right">Goal Pts</span>
      <span style="text-align:right">Free Used</span>
      <span style="text-align:right">Total Pts</span>
    </div>
    ${ranked.map((r,i) => {
      const pid = PEOPLE.find(p=>p.name===r.name)?.id;
      const fc  = pid ? freeCounts[pid] : {gym:0,junk:0};
      const avg = r.days ? Math.round((r.pts - r.profilePts) / r.days * 10) / 10 : 0;
      return `<div class="rank-row">
        <span class="rank-num">${i+1}</span>
        <span class="rank-name"><span class="rank-initials">${initials(r.name)}</span>${r.name}</span>
        <span class="rank-stat">${r.days}</span>
        <span class="rank-stat ${ptsClass(avg)}">${fmtPts(avg)}</span>
        <span class="rank-stat" style="color:var(--purple)">+${r.profilePts}</span>
        <span class="rank-stat" style="font-size:0.7rem">G:${fc.gym}/5 · J:${fc.junk}/5</span>
        <span class="rank-total ${ptsClass(r.pts)}">${fmtPts(r.pts)}</span>
      </div>`;
    }).join('')}
  `;
}

// ── HISTORY ───────────────────────────────────────────────────────────────
function gymLabel(v) {
  if (v==='went')     return '<span class="pill pill-green">Went</span>';
  if (v==='skip')     return '<span class="pill pill-red">Skipped</span>';
  if (v==='free-gym') return '<span class="pill pill-blue">★ Free</span>';
  return '—';
}
function junkLabel(v) {
  if (v==='clean')     return '<span class="pill pill-green">Clean</span>';
  if (v==='ate')       return '<span class="pill pill-red">Ate Junk</span>';
  if (v==='free-junk') return '<span class="pill pill-blue">★ Free</span>';
  return '—';
}

function renderHistory() {
  const entries  = loadData();
  const profiles = loadProfiles();
  const wrap     = document.getElementById('historyContent');
  const rows     = [];

  entries.forEach(e => {
    const name = PEOPLE.find(p=>p.id===e.personId)?.name || e.personId;
    const sp   = Math.round(Math.min(e.steps,10000)/10000*5*10)/10;
    const details = gymLabel(e.gym) + ' &nbsp;·&nbsp; ' + e.steps.toLocaleString() + ' steps (+' + sp + ') &nbsp;·&nbsp; ' + junkLabel(e.junk);
    rows.push({ date: e.date, time: e.time || '—', name, type: 'workout', details, pts: e.pts, isGoal: false });
  });

  PEOPLE.forEach(p => {
    const pData = profiles[p.id];
    if (!pData || !pData.entries) return;
    const dirLabel = pData.direction === 'up' ? 'going up' : 'going down';
    pData.entries.forEach(e => {
      rows.push({
        date: e.date, time: e.time || '—', name: p.name, type: 'goal',
        details: 'Value: <strong style="color:var(--purple)">' + e.value + '</strong> &nbsp;·&nbsp; Goal: ' + pData.goal + ' (' + dirLabel + ')',
        pts: e.pts, isGoal: true
      });
    });
  });

  const resetLog = loadResetLog();
  resetLog.forEach(e => {
    const name = PEOPLE.find(p=>p.id===e.personId)?.name || e.personId;
    if (e.type === 'goal_set') {
      rows.push({
        date: e.date, time: e.time || '—', name, isGoal: false, isEvent: true,
        typePill: '<span class="pill" style="background:var(--purple-dim);color:var(--purple)">Goal set</span>',
        details: `Goal: <strong style="color:var(--purple)">${e.goal}</strong> · Start: ${e.startVal} · ${e.direction} (set #${e.setNumber})`,
        pts: null
      });
    } else if (e.type === 'goal_reset') {
      rows.push({
        date: e.date, time: e.time || '—', name, isGoal: false, isEvent: true,
        typePill: '<span class="pill" style="background:var(--red-dim);color:var(--red)">Goal reset</span>',
        details: `Prev goal: ${e.previousGoal} · Prev start: ${e.previousStart} · ${e.previousDirection} (reset #${e.resetNumber})`,
        pts: null
      });
    }
  });

  function parseTime(t) {
    if (!t || t === '—') return -1;
    // Format: "9:14:05 AM" or "9:14 AM"
    const m = t.match(/(\d+):(\d+)(?::(\d+))?\s*(AM|PM)/i);
    if (!m) return -1;
    let h = parseInt(m[1]);
    const min = parseInt(m[2]);
    const sec = parseInt(m[3] || '0');
    const ampm = m[4].toUpperCase();
    if (ampm === 'PM' && h !== 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;
    return h * 3600 + min * 60 + sec;
  }

  rows.sort((a,b) => {
    const dc = b.date.localeCompare(a.date);
    if (dc !== 0) return dc;
    return parseTime(b.time) - parseTime(a.time);
  });

  if (rows.length === 0) {
    wrap.innerHTML = '<div class="history-wrap"><div class="empty-msg">No entries yet.</div></div>';
    return;
  }

  wrap.innerHTML = `
    <div class="history-wrap">
    <div class="history-table-wrap">
    <table class="history">
      <thead><tr>
        <th>Date</th><th>Time</th><th>Player</th><th>Type</th><th>Details</th>
        <th style="text-align:right">Pts</th>
      </tr></thead>
      <tbody>
        ${rows.map(r => `<tr>
          <td>${formatHistoryDate(r.date)}</td>
          <td style="color:var(--muted2);font-size:0.72rem;white-space:nowrap">${formatHistoryTime(r.time)}</td>
          <td style="color:var(--text);font-weight:500">${r.name}</td>
          <td>${r.typePill || (r.isGoal
            ? '<span class="pill" style="background:var(--purple-dim);color:var(--purple)">Goal</span>'
            : '<span class="pill" style="background:var(--gold-dim);color:var(--gold)">Workout</span>')}</td>
          <td style="font-size:0.75rem;color:var(--muted2)">${r.details}</td>
          <td style="text-align:right">
            ${r.pts !== null && r.pts !== undefined
              ? `<span class="pts-cell ${r.isGoal ? '' : ptsClass(r.pts)}" style="${r.isGoal ? 'color:var(--purple)' : ''}">${r.isGoal ? '+' + r.pts : fmtPts(r.pts)}</span>`
              : '<span style="color:var(--muted);font-size:0.7rem">—</span>'}
          </td>
        </tr>`).join('')}
      </tbody>
    </table>
    </div></div>
  `;
}

// ── CLEAR ALL ─────────────────────────────────────────────────────────────
function clearAll() {
  const btn      = document.getElementById('clearBtn');
  const existing = document.getElementById('clearConfirmBar');
  if (existing) { existing.remove(); return; }

  const bar = document.createElement('div');
  bar.id = 'clearConfirmBar';
  bar.style.cssText = 'margin-top:1rem;background:rgba(248,113,113,0.08);border:1px solid rgba(248,113,113,0.3);border-radius:10px;padding:12px 14px;font-size:0.78rem;color:var(--muted2);';
  bar.innerHTML = `
    <div style="margin-bottom:10px">This will permanently delete <strong style="color:var(--text)">all</strong> logged data and profile goals. Enter the admin password to continue.</div>
    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
      <input type="password" id="clearPwInput" placeholder="Admin password"
        style="flex:1;min-width:120px;max-width:160px;background:var(--surface);border:1px solid var(--border2);border-radius:6px;padding:7px 10px;font-family:'DM Sans',sans-serif;font-size:0.8rem;color:var(--text);outline:none;"
        onkeydown="if(event.key==='Enter') confirmClearAll()" />
      <div style="display:flex;gap:6px;">
        <button onclick="document.getElementById('clearConfirmBar').remove()"
          style="background:none;border:1px solid var(--border2);border-radius:6px;padding:6px 14px;font-family:'DM Sans',sans-serif;font-size:0.75rem;color:var(--muted2);cursor:pointer;">Cancel</button>
        <button onclick="confirmClearAll()"
          style="background:var(--red);color:#fff;border:none;border-radius:6px;padding:6px 16px;font-family:'Unbounded',sans-serif;font-size:0.6rem;font-weight:700;letter-spacing:0.04em;cursor:pointer;text-transform:uppercase;">Delete All</button>
      </div>
    </div>
    <div id="clearPwError" style="font-size:0.65rem;color:var(--red);margin-top:6px;"></div>
  `;
  btn.parentElement.parentElement.appendChild(bar);
  setTimeout(() => document.getElementById('clearPwInput')?.focus(), 50);
}

function confirmClearAll() {
  const input = document.getElementById('clearPwInput');
  const errEl = document.getElementById('clearPwError');
  if (!input) return;

  if (!checkPassword('__admin', input.value)) {
    if (errEl) errEl.textContent = 'Incorrect password.';
    input.value = '';
    input.focus();
    return;
  }

  cache.entries  = [];
  cache.profiles = {};
  cache.resetLog = [];
  postToSheets('clearAll', {});
  PEOPLE.forEach(p => {
    formState[p.id] = { gym: '', steps: '', junk: '' };
    profileInputState[p.id] = { goalInput: '', startInput: '', direction: 'down', valueInput: '' };
  });
  document.getElementById('clearConfirmBar')?.remove();
  renderCards();
  renderHistory();
}

// ── INIT ──────────────────────────────────────────────────────────────────
initData();
</script>
</body>
</html>```
