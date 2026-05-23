// Leaderboard & History screens

function Leaderboard({ onMemberTap }) {
  const { members, challenge, me } = window.DATA;
  const [view, setView] = React.useState("total"); // total | perrule | avgday
  const [expanded, setExpanded] = React.useState(null);

  // Sort by total points
  const sorted = [...members].sort((a, b) => b.total - a.total)
    .map((m, i) => ({ ...m, rank: i + 1 }));

  const podium = sorted.slice(0, 3);
  const rest = sorted.slice(3);

  return (
    <>
      <SHeader
        eyebrow={`${challenge.name} · Week ${challenge.currentWeek}`}
        title={<>Lead<em>er</em>board</>}
        sub={`${members.length} active · ${challenge.entries} entries`}
        right={
          <button className="iconbtn" aria-label="Filter">{Icon.search()}</button>
        }
      />

      <div className="screen-body">
        <div className="row between" style={{ marginBottom: 14 }}>
          <div className="segs">
            <button aria-pressed={view === "total"}    onClick={() => setView("total")}>Total</button>
            <button aria-pressed={view === "perrule"}  onClick={() => setView("perrule")}>Per rule</button>
            <button aria-pressed={view === "avgday"}   onClick={() => setView("avgday")}>Avg/day</button>
          </div>
        </div>

        {/* Podium */}
        <div className="podium">
          {[podium[1], podium[0], podium[2]].map((m, i) => {
            if (!m) return <div key={i}/>;
            const realIdx = [1, 0, 2][i];
            const heights = [86, 104, 72];
            return (
              <div key={m.id} className="podium-col" data-rank={realIdx + 1}>
                <MBadge member={m} size={realIdx === 0 ? "lg" : ""}/>
                <div className="podium-name">{m.name}{m.you && <span className="pill k" style={{ fontSize: 9, padding: "1px 5px", marginLeft: 4 }}>you</span>}</div>
                <div className="podium-pts num">{m.total.toFixed(1)}</div>
                <div className="podium-block" style={{ height: heights[i] }}>
                  <span className="podium-rank">{realIdx + 1}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="section-lbl">Standings</div>

        <div className="card" style={{ padding: 0 }}>
          {sorted.map(m => {
            const isExp = expanded === m.id;
            const ruleBreaks = [
              { id: "gym",   label: "Gym",   v: m.perRule.gym },
              { id: "steps", label: "Steps", v: m.perRule.steps },
              { id: "sleep", label: "Sleep", v: m.perRule.sleep },
              { id: "junk",  label: "Junk",  v: m.perRule.junk },
              { id: "weight",label: "Weight",v: m.perRule.weight },
            ];
            return (
              <div key={m.id} className="lbrow" data-rank={m.rank} data-you={m.you ? "1" : "0"}
                   onClick={() => setExpanded(isExp ? null : m.id)}>
                <span className="rank">{m.rank}</span>
                <MBadge member={m}/>
                <div className="grow">
                  <div className="row" style={{ gap: 6 }}>
                    <span className="name">{m.name}</span>
                    {m.you && <span className="pill k" style={{ fontSize: 9, padding: "1px 5px" }}>you</span>}
                    {m.streak >= 7 && <span className="pill" style={{ background: "var(--accent-tint)", color: "var(--accent)", fontSize: 9, padding: "1px 5px" }}>🔥 {m.streak}</span>}
                  </div>
                  <div className="subline">
                    {view === "total" && `${m.daysLogged} days · Gym ${m.perRule.gym} · Clean ${Math.abs(m.perRule.junk * 4)} · Goal ${m.perRule.weight}pts`}
                    {view === "perrule" && `Gym ${m.perRule.gym} · Steps ${m.perRule.steps} · Sleep ${m.perRule.sleep} · Weight ${m.perRule.weight}`}
                    {view === "avgday" && `${(m.total / m.daysLogged).toFixed(2)}/day · ${m.daysLogged} days logged`}
                  </div>
                  {isExp && (
                    <div className="lb-expand">
                      {ruleBreaks.map(r => (
                        <div key={r.id} className="lb-bar-row">
                          <span className="eyebrow" style={{ width: 56 }}>{r.label}</span>
                          <div className="bar" style={{ flex: 1, height: 6 }}>
                            <i style={{ width: `${Math.min(100, Math.abs(r.v) / 35 * 100)}%`,
                                       background: r.v < 0 ? "var(--bad)" : "var(--ink)" }}/>
                          </div>
                          <span className="num" style={{ width: 36, textAlign: "right", fontSize: 14 }}>{r.v > 0 ? "+" : ""}{r.v}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <div className="pts">
                    {view === "avgday" ? (m.total / m.daysLogged).toFixed(2) : m.total.toFixed(1)}
                  </div>
                  {view === "total" && m.todayDelta > 0 && (
                    <div className="subline" style={{ textAlign: "right", color: "var(--good)" }}>+{m.todayDelta.toFixed(1)} today</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="body-sm mono" style={{ color: "var(--ink-3)", padding: "16px 4px 0", lineHeight: 1.5 }}>
          Tap a row for per-rule breakdown. Removed members hidden here · see History for full record.
        </div>
      </div>
    </>
  );
}

// History screen
function History() {
  const { history, challenge } = window.DATA;
  const [filter, setFilter] = React.useState("all");

  return (
    <>
      <SHeader
        eyebrow={challenge.name}
        title="History"
        sub={`${challenge.entries} entries · newest first`}
        right={<button className="iconbtn" aria-label="Search">{Icon.search()}</button>}
      />

      <div className="screen-body">
        <div className="chips" role="tablist">
          {["all", "workouts", "goals", "admin"].map(f => (
            <button key={f} className="chip" aria-pressed={filter === f}
                    onClick={() => setFilter(f)}>
              {f === "all" ? "All" : f === "workouts" ? "Workouts" : f === "goals" ? "Goal logs" : "Admin"}
            </button>
          ))}
        </div>

        <div style={{ marginTop: 12 }}>
          {history.map((grp, gi) => (
            <div key={gi} className="histgroup">
              <div className="histgroup-hd">
                <span className="eyebrow">{grp.date}</span>
              </div>
              {grp.entries.map((e, i) => {
                const member = window.DATA.members.find(m => m.name === e.who);
                return (
                  <div key={i} className="histrow">
                    {member ? <MBadge member={member} size="sm"/> :
                      <span className="mbadge sm" data-tone="dust">{e.who.slice(0,2).toUpperCase()}</span>}
                    <div>
                      <div className="body-line">
                        <b>{e.who}</b>
                        {e.admin && <span className="pill outline" style={{ marginLeft: 6, fontSize: 9 }}>removed</span>}
                        {e.you && <span className="pill k" style={{ marginLeft: 6, fontSize: 9, padding: "1px 5px" }}>you</span>}
                        {e.milestone && <span className="pill" style={{ marginLeft: 6, background: "var(--accent-tint)", color: "var(--accent)", fontSize: 9 }}>🏆 milestone</span>}
                        {" "}{e.summary}
                        {e.note && <span style={{ color: "var(--ink-3)" }}> ({e.note})</span>}
                      </div>
                      <div className="meta">{e.time}</div>
                    </div>
                    <div className={`delta ${e.delta > 0 ? "pos" : e.delta < 0 ? "neg" : "zero"}`}>
                      {e.delta > 0 ? "+" : ""}{e.delta === 0 ? "—" : e.delta.toFixed(1)}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
          <div className="body-sm mono" style={{ color: "var(--ink-3)", padding: "8px 4px", lineHeight: 1.5, fontStyle: "italic" }}>
            History is an event log — admin actions, edits, and removals are included alongside entries. Removed members still appear in old rows.
          </div>
        </div>
      </div>
    </>
  );
}

const BOARD_STYLE = `
  .podium {
    display: grid; grid-template-columns: 1fr 1fr 1fr;
    align-items: end;
    gap: 6px;
    padding: 16px 4px 0;
  }
  .podium-col {
    display: flex; flex-direction: column;
    align-items: center; gap: 6px;
  }
  .podium-name {
    font-weight: 600; font-size: 13px;
    margin-top: 4px;
    display: flex; align-items: center;
  }
  .podium-pts {
    font-family: var(--f-display);
    font-size: 22px; line-height: 1;
    color: var(--ink); font-variant-numeric: tabular-nums;
    font-style: italic;
  }
  .podium-block {
    width: 100%;
    background: var(--surface-2);
    border: 1px solid var(--hair);
    border-bottom: 0;
    border-radius: var(--r-md) var(--r-md) 0 0;
    margin-top: 6px;
    display: flex; justify-content: center; align-items: flex-start;
    padding-top: 8px;
  }
  .podium-col[data-rank="1"] .podium-block { background: var(--accent-tint); border-color: var(--accent); }
  .podium-col[data-rank="1"] .podium-rank { color: var(--accent); }
  .podium-rank {
    font-family: var(--f-display); font-size: 36px;
    line-height: 1; color: var(--ink-3);
    font-style: italic;
    font-variant-numeric: tabular-nums;
  }

  .lb-expand {
    margin-top: 10px;
    display: flex; flex-direction: column; gap: 6px;
  }
  .lb-bar-row {
    display: flex; align-items: center; gap: 8px;
  }
`;
(() => {
  if (document.getElementById("__board_style")) return;
  const s = document.createElement("style");
  s.id = "__board_style";
  s.textContent = BOARD_STYLE;
  document.head.appendChild(s);
})();

Object.assign(window, { Leaderboard, History });
