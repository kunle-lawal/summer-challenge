// Main App — phone frame, screen router, Tweaks panel.

const TWEAK_DEFAULTS = window.__TWEAKS__ || {
  palette: "paper",
  font: "editorial",
  density: 7,
  logState: "mixed",
  challengeState: "active",
};

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  // Apply tweaks as data attributes on the root so CSS responds.
  React.useEffect(() => {
    const r = document.documentElement;
    r.setAttribute("data-palette", t.palette);
    r.setAttribute("data-font", t.font);
    r.setAttribute("data-d", String(Math.max(5, Math.min(9, t.density))));
  }, [t.palette, t.font, t.density]);

  // Primary tab (bottom nav)
  const [tab, setTab] = React.useState("home");

  // Overlay screens stack (modal-style): pick, wizard, share, admin
  const [overlay, setOverlay] = React.useState(null); // null | "pick" | "wizard" | "share" | "admin"

  const challengeState = t.challengeState || "active";

  return (
    <Phone>
      <div className="screen">
        {tab === "home"    && <ChallengeHome
          challengeState={challengeState}
          onLogToday={() => setTab("log")}
          onPickMember={() => setOverlay("pick")}
          onCreate={() => setOverlay("wizard")}
          onAdmin={() => setOverlay("admin")}
          onBoard={() => setTab("board")}/>}
        {tab === "log"     && <LogDay
          challengeState={challengeState}
          onBack={() => setTab("home")}/>}
        {tab === "board"   && <Leaderboard onMemberTap={() => {}}/>}
        {tab === "history" && <History/>}

        {overlay === "pick"   && <PickMember onPick={() => setOverlay(null)} onClose={() => setOverlay(null)}/>}
        {overlay === "wizard" && <CreateWizard onClose={() => setOverlay(null)} onShare={() => setOverlay("share")}/>}
        {overlay === "share"  && <ShareScreen onClose={() => setOverlay(null)} onView={() => { setOverlay(null); setTab("home"); }}/>}
        {overlay === "admin"  && <Admin onClose={() => setOverlay(null)}/>}

        <BottomNav tab={tab} onTab={setTab}/>
      </div>

      {/* Tweaks */}
      <TweaksPanel title="Tweaks">
        <TweakSection label="Aesthetic"/>
        <TweakColor label="Palette" value={t.palette}
          options={[
            { value: "paper", label: "Paper",  hero: "#f6f3ec" },
            { value: "bone",  label: "Bone",   hero: "#ece4d0" },
            { value: "slate", label: "Slate",  hero: "#ecedea" },
            { value: "moss",  label: "Moss",   hero: "#e6e6d8" },
          ].map(p => [p.hero, p.value === "paper" ? "#e25a2a" : p.value === "bone" ? "#b8341d" : p.value === "slate" ? "#2a48d6" : "#c84e1a", "#18170f"])}
          onChange={(arr) => {
            const palettes = { "#f6f3ec": "paper", "#ece4d0": "bone", "#ecedea": "slate", "#e6e6d8": "moss" };
            setTweak("palette", palettes[arr[0]] || "paper");
          }}/>
        <TweakRadio label="Font" value={t.font}
          options={[
            { value: "editorial", label: "Editorial" },
            { value: "sport",     label: "Sport" },
            { value: "mono",      label: "Mono" },
          ]}
          onChange={v => setTweak("font", v)}/>
        <TweakSlider label="Density" value={t.density} min={5} max={9} step={1}
          onChange={v => setTweak("density", v)}/>

        <TweakSection label="Demo state"/>
        <TweakRadio label="Challenge" value={t.challengeState}
          options={[
            { value: "active", label: "Active" },
            { value: "pre",    label: "Pre" },
            { value: "ended",  label: "Ended" },
          ]}
          onChange={v => setTweak("challengeState", v)}/>

        <TweakSection label="Jump to"/>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          <button className="twk-btn secondary" onClick={() => { setTab("home"); setOverlay(null); }}>Home</button>
          <button className="twk-btn secondary" onClick={() => { setTab("log"); setOverlay(null); }}>Log Day</button>
          <button className="twk-btn secondary" onClick={() => { setTab("board"); setOverlay(null); }}>Leaderboard</button>
          <button className="twk-btn secondary" onClick={() => { setTab("history"); setOverlay(null); }}>History</button>
          <button className="twk-btn secondary" onClick={() => setOverlay("pick")}>Pick member</button>
          <button className="twk-btn secondary" onClick={() => setOverlay("wizard")}>Wizard</button>
          <button className="twk-btn secondary" onClick={() => setOverlay("share")}>Share</button>
          <button className="twk-btn secondary" onClick={() => setOverlay("admin")}>Admin</button>
        </div>
      </TweaksPanel>
    </Phone>
  );
}

window.App = App;
