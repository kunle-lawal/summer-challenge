// Home, Pick Member, Create Wizard, Share screen

// ── Challenge Home ───────────────────────────────────────────────────────
function ChallengeHome({ challengeState, onLogToday, onPickMember, onCreate, onAdmin, onBoard }) {
  const { challenge, me, members } = window.DATA;
  const sorted = [...members].sort((a, b) => b.total - a.total);
  const top3 = sorted.slice(0, 3);
  const youRank = sorted.findIndex(m => m.you) + 1;

  return (
    <>
      <header className="home-hd">
        <div className="grow stack" style={{ gap: 4 }}>
          <div className="eyebrow">Summer · 2026</div>
          <h1 className="h1">Summer<br/><em>Challenge</em></h1>
        </div>
        <div className="row" style={{ gap: 6 }}>
          <button className="iconbtn" aria-label="New challenge" onClick={onCreate}>{Icon.plus()}</button>
          <button className="iconbtn" aria-label="Settings" onClick={onAdmin}>{Icon.gear()}</button>
        </div>
      </header>

      <div className="screen-body">
        {challengeState === "ended" && (
          <div className="banner ended" style={{ marginTop: 8 }}>
            <strong>This challenge ended Jul 26 · Final standings.</strong>
            <div className="body-sm">Ella took it. Browse the full board below.</div>
          </div>
        )}
        {challengeState === "pre" && (
          <div className="banner pre" style={{ marginTop: 8 }}>
            <strong>Starts in 6 days · Jun 1, 2026</strong>
            <div className="body-sm">Logging unlocks on start day.</div>
          </div>
        )}

        {/* Hero stats */}
        <div className="hero-stats">
          <div className="hero-stat">
            <div className="hs-v num"><em>{challenge.currentWeek}</em><span className="hs-d">/{challenge.totalWeeks}</span></div>
            <div className="hs-l">Week</div>
          </div>
          <div className="hero-stat">
            <div className="hs-v num">{challenge.daysLeft}</div>
            <div className="hs-l">Days left</div>
          </div>
          <div className="hero-stat">
            <div className="hs-v num">{members.length}</div>
            <div className="hs-l">In</div>
          </div>
        </div>

        {/* You row */}
        <div className="card you-card">
          <div className="row" style={{ gap: 12 }}>
            <MBadge member={me} size="lg"/>
            <div className="grow stack" style={{ gap: 0 }}>
              <div className="eyebrow">You are</div>
              <div className="row" style={{ gap: 6, marginTop: 2 }}>
                <span className="h3" style={{ fontSize: 17 }}>{me.name}</span>
                <span className="pill">Rank {youRank}</span>
              </div>
              <div className="body-sm mono" style={{ marginTop: 3 }}>{me.total.toFixed(1)} pts · {me.streak}-day streak</div>
            </div>
            <button className="btn ghost sm" onClick={onPickMember}>Switch</button>
          </div>
        </div>

        {/* Big log CTA */}
        <button className="cta-log" onClick={onLogToday} disabled={challengeState !== "active"}>
          <div className="stack" style={{ gap: 2, textAlign: "left" }}>
            <span className="eyebrow" style={{ color: "var(--accent-ink)", opacity: .7 }}>{challenge.today}</span>
            <span className="cta-log-t">
              {challengeState === "ended" ? "Challenge ended" :
               challengeState === "pre" ? "Not started yet" :
               "Log today"}
            </span>
          </div>
          <span className="cta-log-arr">→</span>
        </button>

        {/* Standings preview */}
        <div className="row between" style={{ marginTop: 22, marginBottom: 10 }}>
          <span className="eyebrow">Current standings</span>
          <button className="btn ghost sm" onClick={onBoard} style={{ padding: "4px 8px", border: 0 }}>Full board →</button>
        </div>
        <div className="card" style={{ padding: 0 }}>
          {top3.map((m, i) => (
            <div key={m.id} className="lbrow" data-rank={i + 1} data-you={m.you ? "1" : "0"}
                 onClick={onBoard}>
              <span className="rank">{i + 1}</span>
              <MBadge member={m}/>
              <div className="grow">
                <div className="row" style={{ gap: 6 }}>
                  <span className="name">{m.name}</span>
                  {m.you && <span className="pill k" style={{ fontSize: 9, padding: "1px 5px" }}>you</span>}
                </div>
                <div className="subline">{m.daysLogged} days · Gym {m.perRule.gym} · Clean {Math.abs(m.perRule.junk * 4)} · Goal {m.perRule.weight}pts</div>
              </div>
              <div>
                <div className="pts">{m.total.toFixed(1)}</div>
                {m.todayDelta > 0 && <div className="subline" style={{ textAlign: "right", color: "var(--good)" }}>+{m.todayDelta.toFixed(1)} today</div>}
              </div>
            </div>
          ))}
        </div>

        {/* This week tile */}
        <div className="row between" style={{ marginTop: 22, marginBottom: 10 }}>
          <span className="eyebrow">Your week</span>
          <span className="body-sm mono" style={{ color: "var(--ink-3)" }}>WK {challenge.currentWeek}</span>
        </div>
        <div className="week-strip">
          <div className="week-stats">
            <div className="week-stat">
              <span className="v">3<span className="d">/4</span></span>
              <span className="l">Gym</span>
            </div>
            <div className="week-stat">
              <span className="v">5<span className="d">/6</span></span>
              <span className="l">Clean</span>
            </div>
            <div className="week-stat">
              <span className="v">5<span className="d">/5</span></span>
              <span className="l">Free</span>
            </div>
          </div>
        </div>

        <div className="body-sm mono" style={{ color: "var(--ink-3)", padding: "22px 4px 4px", lineHeight: 1.5, fontStyle: "italic" }}>
          Want your own? <a href="#" onClick={e => { e.preventDefault(); onCreate(); }} style={{ color: "var(--ink)", textDecoration: "underline" }}>Create a challenge</a> in under a minute.
        </div>
      </div>
    </>
  );
}

// ── Pick Member (full-screen, no chrome) ────────────────────────────────
function PickMember({ onPick, onClose }) {
  const { members, challenge } = window.DATA;
  return (
    <div className="pick-screen">
      <div className="pick-hd">
        <span className="pill outline">{challenge.name} 2026</span>
        <button className="iconbtn" onClick={onClose} aria-label="Close">{Icon.x()}</button>
      </div>
      <div className="pick-body">
        <h1 className="h1" style={{ fontSize: 34 }}>Who's <em>logging in?</em></h1>
        <div className="body-sm" style={{ marginTop: 8, color: "var(--ink-3)" }}>
          This stays saved on this device.
        </div>
        <div className="pick-list">
          {members.map(m => (
            <button key={m.id} className="pick-row" onClick={() => onPick(m.id)}>
              <MBadge member={m} size="lg"/>
              <span className="grow stack" style={{ gap: 0, textAlign: "left" }}>
                <span className="pick-name">{m.name}</span>
                <span className="body-sm mono" style={{ color: "var(--ink-3)" }}>{m.total.toFixed(1)} pts · {m.daysLogged} days</span>
              </span>
              {m.you && <span className="pill k" style={{ marginRight: 4 }}>cached</span>}
              {Icon.chevR({ style: { width: 16, height: 16, stroke: "var(--ink-3)", strokeWidth: 1.6, fill: "none" } })}
            </button>
          ))}
        </div>
        <div className="body-sm mono" style={{ color: "var(--ink-3)", padding: "20px 4px 4px", lineHeight: 1.5, fontStyle: "italic" }}>
          Not on the list? Ask the owner to add you.
        </div>
      </div>
    </div>
  );
}

// ── Create Wizard (single scrollable screen, 3 sections) ────────────────
function CreateWizard({ onClose, onShare }) {
  const [name, setName] = React.useState("Summer Challenge");
  const [start, setStart] = React.useState("Jun 1, 2026");
  const [end, setEnd] = React.useState("Aug 31, 2026");
  const [preset, setPreset] = React.useState("custom");
  const [rules, setRules] = React.useState(window.DATA.rules.slice(0, 4));
  const [pw, setPw] = React.useState("");
  const [newMember, setNewMember] = React.useState("");
  const [memberList, setMemberList] = React.useState(["Kunle", "Ella", "Scar", "Marcus", "Will"]);

  const tones = ["sand","sage","clay","mist","rose","olive","dust"];
  const addMember = () => {
    if (newMember.trim() && !memberList.includes(newMember.trim())) {
      setMemberList([...memberList, newMember.trim()]);
      setNewMember("");
    }
  };

  return (
    <div className="sheet">
      <header className="wiz-hd">
        <button className="iconbtn" onClick={onClose} aria-label="Close">{Icon.arrow()}</button>
        <div className="grow stack" style={{ gap: 0 }}>
          <div className="eyebrow">New challenge</div>
          <div className="h2" style={{ fontSize: 22 }}>Set it up</div>
        </div>
      </header>

      <div className="screen-body" style={{ paddingBottom: 100 }}>
        {/* Step 1 */}
        <section className="wiz-step">
          <div className="wiz-step-hd">
            <span className="wiz-num">1</span>
            <h3 className="h3">Name & dates</h3>
          </div>
          <div className="col" style={{ gap: 12 }}>
            <div className="field"><label>Challenge name</label><input value={name} onChange={e => setName(e.target.value)}/></div>
            <div className="row" style={{ gap: 10 }}>
              <div className="field grow"><label>Start</label><input value={start} onChange={e => setStart(e.target.value)}/></div>
              <div className="field grow"><label>End (optional)</label><input value={end} onChange={e => setEnd(e.target.value)}/></div>
            </div>
            <div className="field"><label>Timezone</label><input value="America / Los Angeles" readOnly/></div>
          </div>
        </section>

        {/* Step 2 */}
        <section className="wiz-step">
          <div className="wiz-step-hd">
            <span className="wiz-num">2</span>
            <h3 className="h3">Rules</h3>
          </div>
          <div className="eyebrow" style={{ marginBottom: 8 }}>Start from a preset</div>
          <div className="row" style={{ gap: 6, marginBottom: 14 }}>
            {["classic","custom","minimal"].map(p => (
              <button key={p} className="btn" data-pressed={preset === p}
                onClick={() => setPreset(p)}
                style={preset === p ? { background: "var(--ink)", color: "var(--surface)", borderColor: "var(--ink)", flex: 1 } : { flex: 1 }}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
          <div className="eyebrow" style={{ marginBottom: 6 }}>Your rules</div>
          <div className="col" style={{ gap: 8 }}>
            {rules.map(r => (
              <div key={r.id} className="wiz-rule">
                <div className="stack grow" style={{ gap: 2 }}>
                  <div className="h3">{r.name}</div>
                  <div className="body-sm mono" style={{ color: "var(--ink-3)" }}>{r.kind} · {r.formula}</div>
                </div>
                {Icon.chevR({ style: { width: 14, height: 14, stroke: "var(--ink-3)", strokeWidth: 1.6, fill: "none" } })}
              </div>
            ))}
            <button className="btn ghost full" style={{ borderStyle: "dashed", color: "var(--ink-2)" }}>
              {Icon.plus({ style: { width: 14, height: 14, stroke: "currentColor", strokeWidth: 1.8, fill: "none", marginRight: 4 } })}
              Add a rule
            </button>
          </div>
        </section>

        {/* Step 3 */}
        <section className="wiz-step">
          <div className="wiz-step-hd">
            <span className="wiz-num">3</span>
            <h3 className="h3">Owner password & first members</h3>
          </div>
          <div className="field"><label>Owner password</label><input type="text" value={pw} onChange={e => setPw(e.target.value)} placeholder="set a memorable one"/></div>
          <div className="eyebrow" style={{ marginTop: 14, marginBottom: 8 }}>Members ({memberList.length})</div>
          <div className="col" style={{ gap: 6 }}>
            {memberList.map((n, i) => (
              <div key={i} className="wiz-member">
                <span className="mbadge sm" data-tone={tones[i % tones.length]}>{n.slice(0,2).toUpperCase()}</span>
                <span className="grow">{n}</span>
                <button className="iconbtn" style={{ width: 28, height: 28 }} onClick={() => setMemberList(memberList.filter((_, idx) => idx !== i))}>
                  {Icon.x({ style: { width: 12, height: 12, stroke: "var(--ink-3)", strokeWidth: 1.6, fill: "none" } })}
                </button>
              </div>
            ))}
            <div className="wiz-member">
              <span className="mbadge sm" data-tone="dust" style={{ opacity: .4 }}>??</span>
              <input value={newMember} onChange={e => setNewMember(e.target.value)}
                     onKeyDown={e => e.key === "Enter" && addMember()}
                     placeholder="Add a member"
                     style={{ flex: 1, border: 0, background: "transparent", outline: "none", font: "400 14.5px var(--f-body)" }}/>
              <button className="btn sm" onClick={addMember} disabled={!newMember.trim()}>Add</button>
            </div>
          </div>
        </section>
      </div>

      <div className="wiz-ft">
        <button className="btn k full lg" onClick={onShare}>Create & share</button>
      </div>
    </div>
  );
}

// ── Share screen ─────────────────────────────────────────────────────────
function ShareScreen({ onClose, onView }) {
  const [copied, setCopied] = React.useState(false);
  const url = "challenge.run/c/summer-26";
  return (
    <div className="sheet share-sheet">
      <header className="row" style={{ padding: "14px 16px", justifyContent: "flex-end" }}>
        <button className="iconbtn" onClick={onClose}>{Icon.x()}</button>
      </header>
      <div className="screen-body" style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 24px" }}>
        <div className="share-mark">SC <em>·</em> 26</div>
        <h1 className="h1" style={{ fontSize: 34, marginTop: 24 }}>Live. <em>Share it.</em></h1>
        <div className="body" style={{ marginTop: 8, color: "var(--ink-2)" }}>
          Anyone with this URL can join, log, and view. No accounts.
        </div>
        <div className="share-url">
          <span className="grow mono">{url}</span>
          <button className="btn sm" onClick={() => { setCopied(true); setTimeout(() => setCopied(false), 1800); }}>
            {copied ? "✓ Copied" : "Copy"}
          </button>
        </div>
        <button className="btn k full lg" style={{ marginTop: 14 }} onClick={onView}>
          View challenge
        </button>
        <div className="body-sm mono" style={{ color: "var(--ink-3)", textAlign: "center", marginTop: 22, lineHeight: 1.5 }}>
          You're cached as the owner.<br/>
          Password saved on this device.
        </div>
      </div>
    </div>
  );
}

const FLOW_STYLE = `
  .home-hd {
    display: flex; align-items: flex-start; gap: 12px;
    padding: 14px 16px 14px;
    border-bottom: 1px solid var(--hair);
  }
  .home-hd .h1 { font-size: 30px; line-height: .96; margin-top: 2px; }

  .hero-stats {
    display: grid; grid-template-columns: repeat(3, 1fr);
    gap: 0;
    border: 1px solid var(--hair);
    border-radius: var(--r-md);
    background: var(--surface-2);
    margin-top: 14px;
    overflow: hidden;
  }
  .hero-stat {
    padding: 14px 14px;
    border-right: 1px solid var(--hair);
  }
  .hero-stat:last-child { border-right: 0; }
  .hs-v { font-family: var(--f-display); font-size: 30px; line-height: 1; color: var(--ink); font-variant-numeric: tabular-nums; }
  .hs-v em { font-style: italic; color: var(--accent); }
  .hs-d { font-size: 14px; color: var(--ink-3); font-style: italic; }
  .hs-l { font-family: var(--f-mono); font-size: 9.5px; letter-spacing: .08em; text-transform: uppercase; color: var(--ink-3); margin-top: 4px; }

  .you-card { margin-top: 14px; }

  .cta-log {
    margin-top: 14px;
    width: 100%;
    background: var(--ink);
    color: var(--surface);
    border: 0;
    border-radius: var(--r-md);
    padding: 18px 18px;
    display: flex; align-items: center; justify-content: space-between;
    cursor: pointer;
    transition: background .12s;
  }
  .cta-log:hover { background: #000; }
  .cta-log:disabled { opacity: .45; cursor: not-allowed; }
  .cta-log-t {
    font-family: var(--f-display); font-size: 26px; line-height: 1.1;
    color: var(--surface);
  }
  .cta-log-arr {
    font-family: var(--f-display); font-size: 30px;
    color: var(--accent); font-style: italic;
  }

  /* Pick member */
  .pick-screen {
    flex: 1; display: flex; flex-direction: column;
    background: var(--bg);
  }
  .pick-hd {
    display: flex; justify-content: space-between; align-items: center;
    padding: 12px 16px;
  }
  .pick-body {
    flex: 1; padding: 32px 24px 24px;
    display: flex; flex-direction: column;
    overflow-y: auto;
  }
  .pick-list {
    display: flex; flex-direction: column; gap: 8px;
    margin-top: 28px;
  }
  .pick-row {
    display: flex; align-items: center; gap: 12px;
    padding: 14px 14px;
    background: var(--surface);
    border: 1px solid var(--hair);
    border-radius: var(--r-md);
    cursor: pointer;
    text-align: left;
    transition: transform .1s;
  }
  .pick-row:hover { background: var(--surface-2); }
  .pick-row:active { transform: scale(.99); }
  .pick-name { font-weight: 600; font-size: 16px; }

  /* Wizard */
  .wiz-hd {
    display: flex; align-items: center; gap: 12px;
    padding: 14px 16px 14px;
    border-bottom: 1px solid var(--hair);
    background: var(--bg);
  }
  .wiz-step {
    padding: 22px 0 8px;
    border-bottom: 1px solid var(--hair);
  }
  .wiz-step:last-child { border-bottom: 0; }
  .wiz-step-hd {
    display: flex; align-items: center; gap: 10px;
    margin-bottom: 14px;
  }
  .wiz-num {
    width: 24px; height: 24px;
    border-radius: 50%;
    background: var(--ink); color: var(--surface);
    font-family: var(--f-display); font-size: 13px;
    display: inline-flex; align-items: center; justify-content: center;
    font-style: italic;
  }
  .wiz-rule, .wiz-member {
    display: flex; align-items: center; gap: 10px;
    background: var(--surface);
    border: 1px solid var(--hair);
    border-radius: var(--r-md);
    padding: 12px 14px;
  }
  .wiz-ft {
    padding: 12px 16px 24px;
    border-top: 1px solid var(--hair);
    background: var(--surface);
  }

  /* Share */
  .share-sheet { background: var(--bg); }
  .share-mark {
    font-family: var(--f-display);
    font-size: 96px; line-height: .9;
    color: var(--ink);
    letter-spacing: -.04em;
    text-align: center;
  }
  .share-mark em { color: var(--accent); font-style: italic; }
  .share-url {
    margin-top: 24px;
    display: flex; align-items: center; gap: 10px;
    padding: 14px 14px;
    background: var(--surface);
    border: 1px solid var(--hair-2);
    border-radius: var(--r-md);
  }
  .share-url .mono { font-size: 13.5px; color: var(--ink); }
`;
(() => {
  if (document.getElementById("__flow_style")) return;
  const s = document.createElement("style");
  s.id = "__flow_style";
  s.textContent = FLOW_STYLE;
  document.head.appendChild(s);
})();

Object.assign(window, { ChallengeHome, PickMember, CreateWizard, ShareScreen });
