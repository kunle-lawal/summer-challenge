// Log Day screen — the most important screen.
// Date strip + edit-window banner + 6 rule cards + week summary.

function LogDay({ challengeState, onBack }) {
  const { challenge, me, rules, todayEntry, yesterdayEntry } = window.DATA;
  const [selDate, setSelDate] = React.useState("today");
  const [entries, setEntries] = React.useState(todayEntry);
  const [toast, setToast] = React.useState(null);
  const [bumpKey, setBumpKey] = React.useState(0);

  // Today total — sum of points for entries that exist
  const todayPts = React.useMemo(() => {
    return Object.values(entries).reduce((sum, e) => sum + (e?.points || 0), 0);
  }, [entries]);

  // Date strip — last 7 days + today
  const dates = [
    { id: "wed", d: "WED", n: 20, state: "locked", logged: true },
    { id: "thu", d: "THU", n: 21, state: "logged", logged: true },
    { id: "today", d: "TODAY", n: 22, state: "today", logged: true },
    { id: "sat", d: "SAT", n: 23, state: "future" },
    { id: "sun", d: "SUN", n: 24, state: "future" },
    { id: "mon", d: "MON", n: 25, state: "future" },
  ];

  const lockedView = selDate !== "today" && selDate !== "thu";
  const showLocked = challengeState === "ended" || lockedView;
  const showCardLockedDemo = selDate === "wed";
  const currentEntries = selDate === "thu" ? yesterdayEntry
                       : selDate === "wed" ? { gym: { value: "yes", points: 1.0, time: "8:11 PM" } }
                       : entries;

  const handleChange = (ruleId, value) => {
    if (showLocked || challengeState === "ended" || challengeState === "pre") return;
    const rule = rules.find(r => r.id === ruleId);
    let points = 0;
    if (rule.kind === "binary")    points = value === "yes" ? 1.0 : value === "free" ? 1.0 : 0;
    else if (rule.kind === "counter") points = +(Math.min(1, value / rule.target) * 5).toFixed(1);
    else if (rule.kind === "range") {
      const [lo, hi] = rule.target;
      points = value >= lo && value <= hi ? 1.0 : 0;
    }
    else if (rule.kind === "penalty") points = value === "slipped" ? -1.0 : 0;
    else if (rule.kind === "tracker") points = 1.5;
    const wasEmpty = !entries[ruleId];
    setEntries(prev => ({ ...prev, [ruleId]: { value, points, time: "9:24 PM" } }));
    setBumpKey(k => k + 1);
    if (wasEmpty) setToast({ msg: `${rule.name} logged`, sub: `+${points.toFixed(1)} pts` });
    setTimeout(() => setToast(null), 1800);
  };

  return (
    <>
      <header className="logday-hd">
        <button className="iconbtn" onClick={onBack} aria-label="Back">{Icon.arrow()}</button>
        <div className="grow stack" style={{ gap: 0 }}>
          <div className="eyebrow">Log day</div>
          <div className="row" style={{ gap: 6, marginTop: 2 }}>
            <span className="logday-who">{me.name}</span>
            <span className="dot-sep" style={{ width: 3, height: 3, borderRadius: "50%", background: "var(--ink-4)" }}/>
            <span className="body-sm mono">Fri, May 22</span>
          </div>
        </div>
        <div key={bumpKey} className="logday-total tick">
          <span className="logday-total-v">+{todayPts.toFixed(1)}</span>
          <span className="logday-total-l">today</span>
        </div>
      </header>

      <div className="screen-body">
        {/* Date strip */}
        <div className="datestrip">
          {dates.map(d => (
            <button key={d.id} className="datechip"
                    data-state={d.state}
                    onClick={() => d.state !== "future" && setSelDate(d.id)}
                    style={selDate === d.id && d.id !== "today" ? { borderColor: "var(--ink)" } : {}}>
              <span className="d">{d.d}</span>
              <span className="n">{d.n}</span>
            </button>
          ))}
        </div>

        {/* Challenge state banners */}
        {challengeState === "ended" && (
          <div className="banner ended">
            <strong>This challenge ended on Jul 26.</strong>
            <div className="body-sm">Logging is closed. Browse leaderboard and history for final standings.</div>
          </div>
        )}
        {challengeState === "pre" && (
          <div className="banner pre">
            <strong>Starts in 6 days · Jun 1, 2026</strong>
            <div className="body-sm">Tap members and rules now. Logging unlocks on start day.</div>
          </div>
        )}
        {challengeState === "active" && selDate === "today" && (
          <div className="edit-banner">
            <span className="eyebrow k">Editable</span>
            <span className="body-sm">until end of {challenge.tomorrow}.</span>
          </div>
        )}
        {challengeState === "active" && selDate === "thu" && (
          <div className="edit-banner warn">
            <span className="eyebrow k">Closes soon</span>
            <span className="body-sm">edit window for May 21 ends at 11:59 PM.</span>
          </div>
        )}
        {challengeState === "active" && selDate === "wed" && (
          <div className="edit-banner lock">
            {Icon.lock({ className: "i", style: { width: 14, height: 14, stroke: "var(--ink-3)", strokeWidth: 1.6, fill: "none" } })}
            <span className="eyebrow">Locked</span>
            <span className="body-sm">edit window closed for May 20.</span>
          </div>
        )}

        {/* Week summary */}
        <div className="week-strip">
          <div className="week-strip-h">
            <span className="eyebrow">Week 4 of 12</span>
            <span className="body-sm mono">38 days left</span>
          </div>
          <div className="week-stats">
            <div className="week-stat">
              <span className="v">3<span className="d">/4</span></span>
              <span className="l">Gym days</span>
            </div>
            <div className="week-stat">
              <span className="v">5<span className="d">/6</span></span>
              <span className="l">Clean days</span>
            </div>
            <div className="week-stat">
              <span className="v">5<span className="d">/5</span></span>
              <span className="l">Free left</span>
            </div>
          </div>
        </div>

        {/* Rule cards */}
        <div className="col" style={{ gap: 10, marginTop: 14 }}>
          {rules.map(rule => {
            const locked = showLocked || (showCardLockedDemo && rule.id === "gym");
            // streak rule is derived — uses challenge state
            if (rule.kind === "streak") return <StreakCard key={rule.id} rule={rule} locked={locked}/>;

            const entry = currentEntries[rule.id];
            // Special: tracker on locked day with no entry — hide
            return (
              <RuleCard key={rule.id} rule={rule} entry={entry}
                        locked={locked}
                        onChange={v => handleChange(rule.id, v)}/>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="body-sm mono" style={{ color: "var(--ink-3)", padding: "20px 4px 4px", lineHeight: 1.5 }}>
          Tap a card to change. Edits propagate to the leaderboard instantly. <br/>
          Out of window? Ask the owner to unlock.
        </div>
      </div>

      <Toast msg={toast?.msg} sub={toast?.sub}/>
    </>
  );
}

// Log Day specific styles
const LOG_STYLE = `
  .logday-hd {
    display: flex; align-items: flex-start; gap: 12px;
    padding: 12px 16px 14px;
    border-bottom: 1px solid var(--hair);
  }
  .logday-who { font-weight: 600; font-size: 15px; color: var(--ink); }
  .logday-total {
    background: var(--ink); color: var(--surface);
    padding: 8px 12px;
    border-radius: var(--r-pill);
    display: flex; align-items: baseline; gap: 4px;
    font-variant-numeric: tabular-nums;
  }
  .logday-total-v {
    font-family: var(--f-display); font-size: 18px; line-height: 1;
    font-style: italic;
  }
  .logday-total-l { font-family: var(--f-mono); font-size: 9.5px; text-transform: uppercase; letter-spacing: .06em; opacity: .7; }

  .edit-banner {
    display: flex; align-items: baseline; gap: 8px;
    padding: 10px 12px;
    border-left: 2px solid var(--accent);
    background: var(--accent-tint);
    border-radius: 0 var(--r-sm) var(--r-sm) 0;
    margin-bottom: 14px;
  }
  .edit-banner.warn { background: rgba(180,138,42,.10); border-left-color: var(--gold); }
  .edit-banner.warn .eyebrow.k { color: var(--gold); }
  .edit-banner.lock { background: var(--bg-2); border-left-color: var(--ink-3); }
  .edit-banner.lock .eyebrow { color: var(--ink-3); }
  .edit-banner .i { margin-right: 4px; }

  .banner.ended, .banner.pre {
    padding: 14px 16px;
    border-radius: var(--r-md);
    border: 1px solid var(--hair-2);
    background: var(--bg-2);
    margin-bottom: 14px;
  }
  .banner strong { font-weight: 600; font-size: 14px; color: var(--ink); display: block; margin-bottom: 4px; }

  .week-strip {
    background: var(--surface-2);
    border: 1px solid var(--hair);
    border-radius: var(--r-md);
    padding: 12px 14px;
  }
  .week-strip-h {
    display: flex; justify-content: space-between; align-items: baseline;
    margin-bottom: 10px;
  }
  .week-stats {
    display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;
  }
  .week-stat {
    display: flex; flex-direction: column; gap: 2px;
  }
  .week-stat .v {
    font-family: var(--f-display); font-size: 26px; line-height: 1;
    color: var(--ink); font-variant-numeric: tabular-nums;
  }
  .week-stat .v .d {
    font-size: 14px; color: var(--ink-3); font-style: italic;
  }
  .week-stat .l {
    font-family: var(--f-mono); font-size: 9.5px; letter-spacing: .08em;
    text-transform: uppercase; color: var(--ink-3); margin-top: 2px;
  }
`;

(() => {
  if (document.getElementById("__log_style")) return;
  const s = document.createElement("style");
  s.id = "__log_style";
  s.textContent = LOG_STYLE;
  document.head.appendChild(s);
})();

Object.assign(window, { LogDay });
