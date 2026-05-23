// Rule card components — one shell, six input idioms.
// Each card takes the rule definition + the member's current value/state.

const RuleShell = ({ rule, entry, points, state, locked, children, footer }) => {
  const kindLabel = {
    binary: "Binary", counter: "Counter", range: "Range",
    penalty: "Penalty", streak: "Streak", tracker: "Tracker",
  }[rule.kind] || rule.kind;
  return (
    <div className={`card rule ${locked ? "locked" : ""}`} data-state={state || (entry ? "logged" : "empty")}>
      <div className="row between" style={{ alignItems: "flex-start", gap: 12 }}>
        <div className="stack grow" style={{ gap: 2 }}>
          <h3 className="h3">{rule.name}</h3>
          <div className="rule-meta">
            <span className="eyebrow">{kindLabel}</span>
            <span className="dot-sep"/>
            <span className="body-sm mono" style={{ textTransform: "none", letterSpacing: 0 }}>{rule.formula}</span>
          </div>
        </div>
        <div className="rule-pts">
          {points == null
            ? <span className="rule-pts-empty mono">—</span>
            : <span className={`rule-pts-v ${points > 0 ? "pos" : points < 0 ? "neg" : "zero"}`}>
                {points > 0 ? "+" : ""}{points.toFixed(1)}
              </span>}
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        {children}
      </div>

      {footer && <div className="rule-ft">{footer}</div>}
    </div>
  );
};

// ── Binary (Yes / No / Free) ─────────────────────────────────────────────
function BinaryCard({ rule, entry, onChange, locked }) {
  const v = entry ? entry.value : null;
  const points = entry ? entry.points : null;
  const capped = rule.weekCount >= rule.weekCap && v === "yes";
  return (
    <RuleShell rule={rule} entry={entry} points={capped ? 0 : points} locked={locked}
      footer={
        <div className="rule-meta-row">
          <span className="body-sm mono">{rule.weekCount}/{rule.weekCap} this week · {rule.freeLeft}/{rule.free} free</span>
          {entry && !locked && <span className="body-sm mono" style={{ color: "var(--ink-3)" }}>logged {entry.time} · edit until end of {window.DATA.challenge.tomorrow}</span>}
          {locked && <span className="body-sm mono" style={{ color: "var(--ink-3)" }}><span className="lockicon">●</span> locked — logged {entry?.time}</span>}
        </div>
      }>
      <div className="choices" aria-disabled={locked}>
        <button className="choice" aria-pressed={v === "yes"} disabled={locked}
                onClick={() => !locked && onChange?.("yes")}>
          {Icon.check({ className: "ico" })} Yes
        </button>
        <button className="choice bad" aria-pressed={v === "no"} disabled={locked}
                onClick={() => !locked && onChange?.("no")}>
          {Icon.x({ className: "ico" })} No
        </button>
        <button className="choice free" aria-pressed={v === "free"} disabled={locked}
                onClick={() => !locked && onChange?.("free")}>
          <span className="star">★</span> Free
        </button>
      </div>
    </RuleShell>
  );
}

// ── Counter (Steps) ──────────────────────────────────────────────────────
function CounterCard({ rule, entry, onChange, locked }) {
  const v = entry ? entry.value : null;
  const pct = v ? Math.min(1, v / rule.target) : 0;
  const ptsRate = (entry && rule.target ? entry.points : null);
  return (
    <RuleShell rule={rule} entry={entry} points={ptsRate} locked={locked}
      footer={
        <div className="rule-meta-row">
          <span className="body-sm mono">{v ? `${v.toLocaleString()} / ${rule.target.toLocaleString()} ${rule.unit}` : `Target ${rule.target.toLocaleString()} ${rule.unit}`}</span>
          {entry && !locked && <span className="body-sm mono" style={{ color: "var(--ink-3)" }}>logged {entry.time}</span>}
        </div>
      }>
      <div className="counter-row">
        <div className="counter-input">
          <input type="text" inputMode="numeric" value={v ?? ""} placeholder="0"
                 disabled={locked}
                 onChange={e => !locked && onChange?.(Number(e.target.value.replace(/[^0-9]/g, "")))}/>
          <span className="counter-unit">{rule.unit}</span>
        </div>
        <div className="counter-bar">
          <div className="bar"><i style={{ width: `${pct * 100}%` }}/></div>
          <span className="body-sm mono">{Math.round(pct * 100)}%</span>
        </div>
      </div>
    </RuleShell>
  );
}

// ── Range (Sleep — band) ─────────────────────────────────────────────────
function RangeCard({ rule, entry, onChange, locked }) {
  const v = entry ? entry.value : null;
  const points = entry ? entry.points : null;
  const min = 4, max = 12;
  const [tLo, tHi] = rule.target;
  const pos = v ? ((v - min) / (max - min)) * 100 : null;
  const tLoPos = ((tLo - min) / (max - min)) * 100;
  const tHiPos = ((tHi - min) / (max - min)) * 100;
  const inBand = v != null && v >= tLo && v <= tHi;
  return (
    <RuleShell rule={rule} entry={entry} points={points} locked={locked}
      footer={
        <div className="rule-meta-row">
          <span className="body-sm mono">Target band: {tLo}–{tHi} {rule.unit}</span>
          {v != null && <span className={`pill ${inBand ? "good" : "outline"}`}>{inBand ? "In band" : "Out of band"}</span>}
        </div>
      }>
      <div className="counter-row">
        <div className="stepper" style={{ width: 156 }}>
          <button onClick={() => !locked && onChange?.(Math.max(0, (v ?? 7) - 0.5))} disabled={locked}>−</button>
          <div className="val">{v != null ? v.toFixed(1) : "—"}<span className="u">{rule.unit}</span></div>
          <button onClick={() => !locked && onChange?.(Math.min(24, (v ?? 7) + 0.5))} disabled={locked}>+</button>
        </div>
        <div className="grow rangeband-wrap">
          <div className="rangeband">
            <div className="scale">
              <div className="target" style={{ left: `${tLoPos}%`, width: `${tHiPos - tLoPos}%` }}/>
              {pos != null && <div className="needle" style={{ left: `${pos}%` }}/>}
            </div>
            <span className="lbl" style={{ left: `${tLoPos}%` }}>{tLo}</span>
            <span className="lbl" style={{ left: `${tHiPos}%` }}>{tHi}</span>
          </div>
        </div>
      </div>
    </RuleShell>
  );
}

// ── Penalty (Junk food) ──────────────────────────────────────────────────
function PenaltyCard({ rule, entry, onChange, locked }) {
  const v = entry ? entry.value : null;
  const waived = v === "slipped" && rule.weekCount === 0; // first slip / week waived
  const points = entry ? (waived ? 0 : entry.points) : null;
  return (
    <RuleShell rule={rule} entry={entry} points={points} locked={locked}
      footer={
        <div className="rule-meta-row">
          {v === "slipped" && waived
            ? <span className="pill outline">First slip/week — scored 0</span>
            : <span className="body-sm mono">{rule.freeLeft}/{rule.free} free · 1st slip/week waived</span>}
          {!entry && <span className="body-sm mono" style={{ color: "var(--ink-3)" }}>Not logged yet</span>}
        </div>
      }>
      <div className="choices" aria-disabled={locked}>
        <button className="choice" aria-pressed={v === "clean"} disabled={locked}
                onClick={() => !locked && onChange?.("clean")}>
          {Icon.check({ className: "ico" })} Clean
        </button>
        <button className="choice bad" aria-pressed={v === "slipped"} disabled={locked}
                onClick={() => !locked && onChange?.("slipped")}>
          Slipped
        </button>
        <button className="choice free" aria-pressed={v === "free"} disabled={locked}
                onClick={() => !locked && onChange?.("free")}>
          <span className="star">★</span> Free
        </button>
      </div>
    </RuleShell>
  );
}

// ── Streak (derived — no input) ──────────────────────────────────────────
function StreakCard({ rule, locked }) {
  const cur = rule.current, target = rule.target;
  const earned = cur >= target;
  return (
    <RuleShell rule={rule} entry={earned ? { value: cur, points: 5 } : null}
      points={earned ? 5 : 0} locked={locked}
      footer={
        <div className="rule-meta-row">
          <span className="body-sm mono">{cur}/{target} clean days · {earned ? "✓ earned" : `${target - cur} more for +5`}</span>
          <span className="pill outline">Derived</span>
        </div>
      }>
      <div className="streak-dots">
        {Array.from({ length: target }).map((_, i) => (
          <span key={i} className={`streak-dot ${i < cur ? "on" : ""}`}>
            {i < cur ? <Icon.check className="streak-check"/> : null}
          </span>
        ))}
      </div>
    </RuleShell>
  );
}

// ── Tracker (Weight) ─────────────────────────────────────────────────────
function TrackerCard({ rule, entry, onChange, locked }) {
  const v = entry ? entry.value : rule.current;
  const points = entry ? entry.points : null;
  const dir = rule.start > rule.goal ? -1 : 1; // -1 = lose, +1 = gain
  const total = Math.abs(rule.goal - rule.start);
  const done = total > 0 ? Math.abs(v - rule.start) / total : 0;
  const remaining = Math.abs(rule.goal - v);
  return (
    <RuleShell rule={rule} entry={entry} points={points} locked={locked}
      footer={
        <div className="rule-meta-row">
          <span className="body-sm mono">{remaining.toFixed(1)} {rule.unit} {dir < 0 ? "to lose" : "to gain"} · {Math.round(done * 100)}% there</span>
          {entry && !locked && <span className="body-sm mono" style={{ color: "var(--ink-3)" }}>logged {entry.time}</span>}
        </div>
      }>
      <div className="counter-row">
        <div className="stepper" style={{ width: 156 }}>
          <button onClick={() => !locked && onChange?.((v ?? 0) - 0.5)} disabled={locked}>−</button>
          <div className="val">{v != null ? v.toFixed(1) : "—"}<span className="u">{rule.unit}</span></div>
          <button onClick={() => !locked && onChange?.((v ?? 0) + 0.5)} disabled={locked}>+</button>
        </div>
        <div className="grow tracker-track">
          <div className="track-line">
            <div className="track-fill" style={{ width: `${Math.min(100, done * 100)}%` }}/>
            <div className="track-mark" style={{ left: `${Math.min(100, done * 100)}%` }}/>
          </div>
          <div className="track-labels">
            <span className="mono">{rule.start}</span>
            <span className="num">{v ?? "—"}</span>
            <span className="mono">{rule.goal}</span>
          </div>
        </div>
      </div>
    </RuleShell>
  );
}

// ── Dispatcher ───────────────────────────────────────────────────────────
function RuleCard({ rule, entry, onChange, locked }) {
  const Cmp = {
    binary: BinaryCard, counter: CounterCard, range: RangeCard,
    penalty: PenaltyCard, streak: StreakCard, tracker: TrackerCard,
  }[rule.kind];
  if (!Cmp) return null;
  return <Cmp rule={rule} entry={entry} onChange={onChange} locked={locked}/>;
}

// Inject the rule-card-specific styles
const RULE_STYLE = `
  .rule-meta { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-top: 1px; }
  .rule-meta .dot-sep { width: 3px; height: 3px; border-radius: 50%; background: var(--ink-4); display: inline-block; }
  .rule-pts { text-align: right; min-width: 56px; flex-shrink: 0; padding-top: 2px; }
  .rule-pts-v { font-family: var(--f-display); font-size: 24px; font-variant-numeric: tabular-nums; line-height: 1; }
  .rule-pts-v.pos { color: var(--ink); font-style: italic; }
  .rule-pts-v.neg { color: var(--bad); font-style: italic; }
  .rule-pts-v.zero { color: var(--ink-3); }
  .rule-pts-empty { font-size: 22px; color: var(--ink-4); }
  .rule-ft { margin-top: 12px; padding-top: 10px; border-top: 1px solid var(--hair); }
  .rule-meta-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; row-gap: 4px; }
  .lockicon { color: var(--ink-3); font-size: 7px; margin-right: 4px; vertical-align: middle; }

  .counter-row { display: flex; align-items: center; gap: 12px; }
  .counter-input {
    flex: 0 0 auto; width: 156px;
    border: 1px solid var(--hair-2); border-radius: var(--r-md);
    background: var(--surface); padding: 10px 12px; display: flex; align-items: baseline;
  }
  .counter-input input {
    flex: 1; border: 0; background: transparent; outline: none;
    font-family: var(--f-display); font-size: 22px; line-height: 1;
    color: var(--ink); font-variant-numeric: tabular-nums; width: 100%;
  }
  .counter-input input::placeholder { color: var(--ink-4); }
  .counter-unit { font-family: var(--f-mono); font-size: 11px; color: var(--ink-3); margin-left: 6px; letter-spacing: .04em; text-transform: uppercase; }
  .counter-bar { flex: 1; display: flex; align-items: center; gap: 10px; }
  .counter-bar .bar { flex: 1; }

  .rangeband-wrap { padding: 0 12px; }

  .streak-dots { display: flex; gap: 6px; align-items: center; }
  .streak-dot {
    width: 28px; height: 28px;
    border-radius: 50%;
    border: 1px solid var(--hair-2);
    display: inline-flex; align-items: center; justify-content: center;
    color: var(--ink-3);
    background: var(--surface-2);
  }
  .streak-dot.on { background: var(--accent); border-color: var(--accent); color: var(--accent-ink); }
  .streak-check { width: 14px; height: 14px; stroke: currentColor; stroke-width: 2.2; fill: none; }

  .tracker-track { padding: 0 4px; }
  .track-line {
    position: relative; height: 4px; background: var(--bg-2);
    border-radius: var(--r-pill); margin: 8px 0 4px;
  }
  .track-fill {
    position: absolute; left: 0; top: 0; bottom: 0;
    background: var(--ink); border-radius: var(--r-pill);
  }
  .track-mark {
    position: absolute; top: 50%; width: 12px; height: 12px;
    border-radius: 50%; background: var(--accent);
    border: 2px solid var(--surface);
    transform: translate(-50%, -50%);
  }
  .track-labels {
    display: flex; justify-content: space-between;
    font-family: var(--f-mono);
    font-size: 10px; color: var(--ink-3);
    letter-spacing: .04em; text-transform: uppercase;
  }
  .track-labels .num {
    font-family: var(--f-display);
    font-size: 13px; color: var(--ink); text-transform: none;
    letter-spacing: 0;
  }

  .card.locked .rule-pts-v { color: var(--ink-3); font-style: normal; }
  .card.locked .choice[aria-pressed="true"] { background: var(--bg-2); color: var(--ink-2); border-color: var(--hair-2); }
  .card.locked .choice[aria-pressed="true"].free { background: var(--bg-2); color: var(--ink-2); }
  .card.locked .stepper { opacity: .6; }
`;

(() => {
  if (document.getElementById("__rule_style")) return;
  const s = document.createElement("style");
  s.id = "__rule_style";
  s.textContent = RULE_STYLE;
  document.head.appendChild(s);
})();

Object.assign(window, {
  RuleCard, BinaryCard, CounterCard, RangeCard, PenaltyCard, StreakCard, TrackerCard,
});
