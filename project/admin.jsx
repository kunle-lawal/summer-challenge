// Admin surfaces — password gate, settings home, members, config, audit log.

function AdminGate({ onUnlock, onClose }) {
  const [pw, setPw] = React.useState("");
  const [err, setErr] = React.useState(false);
  const submit = () => {
    if (pw.length === 0) { setErr(true); return; }
    onUnlock();
  };
  return (
    <div className="sheet" style={{ background: "var(--bg)" }}>
      <header className="row" style={{ padding: "14px 16px", justifyContent: "space-between" }}>
        <span className="eyebrow">Admin · Summer Challenge</span>
        <button className="iconbtn" onClick={onClose}>{Icon.x()}</button>
      </header>
      <div className="screen-body" style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: "40px 24px" }}>
        <div className="lockmark">
          {Icon.lock({ style: { width: 28, height: 28, stroke: "var(--ink)", strokeWidth: 1.6, fill: "none" } })}
        </div>
        <h1 className="h1" style={{ fontSize: 28, marginTop: 18 }}>Owner <em>only</em>.</h1>
        <div className="body" style={{ marginTop: 6, color: "var(--ink-3)" }}>Enter the password to manage members, rules, and dates.</div>

        <div className="field" style={{ marginTop: 24 }}>
          <label>Password</label>
          <input type="text" value={pw} autoFocus
                 onChange={e => { setPw(e.target.value); setErr(false); }}
                 onKeyDown={e => e.key === "Enter" && submit()}
                 placeholder="set when challenge was created"/>
          {err && <span className="body-sm" style={{ color: "var(--bad)" }}>Enter the owner password.</span>}
        </div>
        <button className="btn k full lg" style={{ marginTop: 16 }} onClick={submit}>Unlock</button>
        <div className="body-sm mono" style={{ color: "var(--ink-3)", marginTop: 20, lineHeight: 1.5, textAlign: "center" }}>
          Lost it? Ask another owner.<br/>
          Demo: type anything.
        </div>
      </div>
    </div>
  );
}

function AdminHome({ onPick, onClose }) {
  const cards = [
    { id: "members", title: "Members",       count: "6 active · 1 removed", icon: "people",   note: "Add, remove, rename" },
    { id: "config",  title: "Rules & dates", count: "4 rules · 12 weeks",   icon: "tune",     note: "Edit configuration" },
    { id: "audit",   title: "Audit log",     count: "4 actions",            icon: "history",  note: "Every state change" },
  ];
  return (
    <div className="sheet">
      <header className="wiz-hd">
        <button className="iconbtn" onClick={onClose}>{Icon.x()}</button>
        <div className="grow stack" style={{ gap: 0 }}>
          <div className="eyebrow">Admin</div>
          <div className="h2" style={{ fontSize: 22 }}>Settings</div>
        </div>
        <span className="pill k">owner</span>
      </header>
      <div className="screen-body">
        <div className="col" style={{ gap: 10, marginTop: 14 }}>
          {cards.map(c => (
            <button key={c.id} className="admin-card" onClick={() => onPick(c.id)}>
              <div className="grow stack" style={{ gap: 2 }}>
                <div className="h3">{c.title}</div>
                <div className="body-sm mono" style={{ color: "var(--ink-3)" }}>{c.count}</div>
                <div className="body-sm" style={{ marginTop: 4, color: "var(--ink-2)" }}>{c.note}</div>
              </div>
              {Icon.chevR({ style: { width: 18, height: 18, stroke: "var(--ink-3)", strokeWidth: 1.6, fill: "none" } })}
            </button>
          ))}
        </div>
        <div className="body-sm mono" style={{ color: "var(--ink-3)", padding: "22px 4px", lineHeight: 1.5, fontStyle: "italic" }}>
          You can hand off ownership in Members → tap a member → "Make owner".
        </div>
      </div>
    </div>
  );
}

function AdminMembers({ onBack }) {
  const { members } = window.DATA;
  const [showConflict, setShowConflict] = React.useState(false);
  const [newName, setNewName] = React.useState("Jenna");

  return (
    <div className="sheet">
      <header className="wiz-hd">
        <button className="iconbtn" onClick={onBack}>{Icon.arrow()}</button>
        <div className="grow stack" style={{ gap: 0 }}>
          <div className="eyebrow">Admin · Members</div>
          <div className="h2" style={{ fontSize: 22 }}>Members</div>
        </div>
      </header>
      <div className="screen-body">
        <div className="row between" style={{ marginTop: 14, marginBottom: 10 }}>
          <span className="eyebrow">Active · 6</span>
          <button className="btn sm" onClick={() => setShowConflict(true)}>+ Add</button>
        </div>
        <div className="card" style={{ padding: 0 }}>
          {members.map((m, i) => (
            <div key={m.id} className="admin-mrow" style={i === members.length - 1 ? { borderBottom: 0 } : {}}>
              <MBadge member={m}/>
              <div className="grow stack" style={{ gap: 0 }}>
                <div className="row" style={{ gap: 6 }}>
                  <span className="h3">{m.name}</span>
                  {m.you && <span className="pill k" style={{ fontSize: 9, padding: "1px 5px" }}>owner</span>}
                </div>
                <div className="body-sm mono" style={{ color: "var(--ink-3)" }}>{m.daysLogged} days · {m.total.toFixed(1)} pts</div>
              </div>
              <button className="iconbtn" style={{ width: 28, height: 28 }}>{Icon.chevR({ style: { width: 14, height: 14, stroke: "var(--ink-3)", strokeWidth: 1.6, fill: "none" } })}</button>
            </div>
          ))}
        </div>

        <div className="section-lbl">Removed · 1</div>
        <div className="card" style={{ padding: 0, opacity: .7 }}>
          <div className="admin-mrow" style={{ borderBottom: 0 }}>
            <span className="mbadge" data-tone="dust">JE</span>
            <div className="grow stack" style={{ gap: 0 }}>
              <div className="row" style={{ gap: 6 }}>
                <span className="h3">Jenna</span>
                <span className="pill outline" style={{ fontSize: 9 }}>removed</span>
              </div>
              <div className="body-sm mono" style={{ color: "var(--ink-3)" }}>Removed May 21 · 8.0 pts kept</div>
            </div>
            <button className="btn sm ghost">Restore</button>
          </div>
        </div>

        {showConflict && (
          <div className="conflict">
            <div className="conflict-hd">
              <div className="eyebrow">Name conflict</div>
              <button className="iconbtn" style={{ width: 26, height: 26 }} onClick={() => setShowConflict(false)}>
                {Icon.x({ style: { width: 12, height: 12, stroke: "currentColor", strokeWidth: 1.8, fill: "none" } })}
              </button>
            </div>
            <div className="h3">"Jenna" already exists.</div>
            <div className="body-sm" style={{ marginTop: 4, color: "var(--ink-2)" }}>
              We suggest <b>Jenna 2</b>. You can also type a different name.
            </div>
            <div className="row" style={{ marginTop: 12, gap: 8 }}>
              <input className="grow" value={newName + " 2"} readOnly
                     style={{ border: "1px solid var(--hair-2)", borderRadius: "var(--r-md)", padding: "10px 12px", font: "400 14px var(--f-body)", background: "var(--surface)" }}/>
              <button className="btn k" onClick={() => setShowConflict(false)}>Add</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AdminConfig({ onBack }) {
  const { rules } = window.DATA;
  return (
    <div className="sheet">
      <header className="wiz-hd">
        <button className="iconbtn" onClick={onBack}>{Icon.arrow()}</button>
        <div className="grow stack" style={{ gap: 0 }}>
          <div className="eyebrow">Admin · Config</div>
          <div className="h2" style={{ fontSize: 22 }}>Rules & dates</div>
        </div>
      </header>
      <div className="screen-body">
        <div className="section-lbl" style={{ paddingTop: 14 }}>Dates</div>
        <div className="card">
          <div className="row between" style={{ marginBottom: 10 }}>
            <span className="eyebrow">Window</span>
            <span className="body-sm mono">12 weeks · 84 days</span>
          </div>
          <div className="row" style={{ gap: 14 }}>
            <div className="stack grow" style={{ gap: 2 }}>
              <span className="eyebrow">Start</span>
              <span className="h3" style={{ fontFamily: "var(--f-display)", fontSize: 22 }}>May 1, 2026</span>
            </div>
            <div className="stack grow" style={{ gap: 2 }}>
              <span className="eyebrow">End</span>
              <span className="h3" style={{ fontFamily: "var(--f-display)", fontSize: 22 }}>Jul 26, 2026</span>
            </div>
          </div>
          <button className="btn full" style={{ marginTop: 12 }}>Edit dates</button>
        </div>

        <div className="section-lbl">Rules · 6</div>
        <div className="col" style={{ gap: 8 }}>
          {rules.map(r => (
            <div key={r.id} className="admin-rule">
              <div className="stack grow" style={{ gap: 2 }}>
                <div className="h3">{r.name}</div>
                <div className="body-sm mono" style={{ color: "var(--ink-3)" }}>{r.kind} · {r.formula}</div>
              </div>
              <span className="body-sm mono" style={{ color: "var(--ink-3)" }}>Edit</span>
              {Icon.chevR({ style: { width: 14, height: 14, stroke: "var(--ink-3)", strokeWidth: 1.6, fill: "none" } })}
            </div>
          ))}
          <button className="btn ghost full" style={{ borderStyle: "dashed" }}>
            + Add a rule
          </button>
        </div>

        <div className="section-lbl">Danger zone</div>
        <button className="btn full" style={{ color: "var(--bad)", borderColor: "var(--bad-tint)" }}>End challenge early</button>
      </div>
    </div>
  );
}

function AdminAudit({ onBack }) {
  const { audit } = window.DATA;
  return (
    <div className="sheet">
      <header className="wiz-hd">
        <button className="iconbtn" onClick={onBack}>{Icon.arrow()}</button>
        <div className="grow stack" style={{ gap: 0 }}>
          <div className="eyebrow">Admin · Audit</div>
          <div className="h2" style={{ fontSize: 22 }}>Audit log</div>
        </div>
      </header>
      <div className="screen-body">
        <div className="chips" style={{ marginTop: 8 }}>
          {["All", "Members", "Rules", "Dates"].map(c => (
            <button key={c} className="chip" aria-pressed={c === "All"}>{c}</button>
          ))}
        </div>
        <div className="col" style={{ gap: 0, marginTop: 14 }}>
          {audit.map((a, i) => (
            <div key={i} className="audit-row">
              <div className="audit-dot"/>
              <div className="grow stack" style={{ gap: 2 }}>
                <div className="body-line">
                  <b>{a.actor}</b> {a.action}
                  {a.target && <span> · {a.target}</span>}
                </div>
                <div className="meta mono">{a.time}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Admin({ onClose }) {
  const [view, setView] = React.useState("gate"); // gate | home | members | config | audit
  if (view === "gate") return <AdminGate onUnlock={() => setView("home")} onClose={onClose}/>;
  if (view === "members") return <AdminMembers onBack={() => setView("home")}/>;
  if (view === "config") return <AdminConfig onBack={() => setView("home")}/>;
  if (view === "audit") return <AdminAudit onBack={() => setView("home")}/>;
  return <AdminHome onPick={setView} onClose={onClose}/>;
}

const ADMIN_STYLE = `
  .lockmark {
    width: 64px; height: 64px;
    border-radius: 50%;
    background: var(--surface);
    border: 1px solid var(--hair);
    display: flex; align-items: center; justify-content: center;
    align-self: flex-start;
  }
  .admin-card {
    display: flex; align-items: center; gap: 12px;
    background: var(--surface);
    border: 1px solid var(--hair);
    border-radius: var(--r-md);
    padding: 16px 14px;
    text-align: left;
    cursor: pointer;
    width: 100%;
  }
  .admin-card:hover { background: var(--surface-2); }
  .admin-mrow {
    display: flex; align-items: center; gap: 12px;
    padding: 12px 14px;
    border-bottom: 1px solid var(--hair);
  }
  .admin-rule {
    display: flex; align-items: center; gap: 8px;
    padding: 12px 14px;
    background: var(--surface);
    border: 1px solid var(--hair);
    border-radius: var(--r-md);
  }
  .conflict {
    margin-top: 20px;
    padding: 14px;
    border: 1px solid var(--accent);
    background: var(--accent-tint);
    border-radius: var(--r-md);
  }
  .conflict-hd {
    display: flex; justify-content: space-between; align-items: center;
    margin-bottom: 8px;
  }
  .audit-row {
    display: grid;
    grid-template-columns: 16px 1fr;
    gap: 12px;
    padding: 12px 0;
    border-bottom: 1px solid var(--hair);
    position: relative;
  }
  .audit-row:last-child { border-bottom: 0; }
  .audit-dot {
    width: 6px; height: 6px; border-radius: 50%;
    background: var(--ink);
    margin: 8px 0 0 5px;
    position: relative;
  }
  .audit-row .body-line { font-size: 13.5px; }
  .audit-row .meta { font-size: 10.5px; color: var(--ink-3); letter-spacing: .04em; text-transform: uppercase; }
`;
(() => {
  if (document.getElementById("__admin_style")) return;
  const s = document.createElement("style");
  s.id = "__admin_style";
  s.textContent = ADMIN_STYLE;
  document.head.appendChild(s);
})();

Object.assign(window, { Admin });
