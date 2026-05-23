/* Summer Challenge v2 — mock data. Plain JS, lives on window.DATA. */

window.DATA = (() => {
  const today = "Fri, May 22";
  const tomorrow = "Sat, May 23";

  const MEMBERS = [
    { id: "ku", name: "Kunle",  initials: "KU", tone: "sand",  you: true,  daysLogged: 13, streak: 4, total: 79.0, todayDelta: 5.0,
      perRule: { gym: 10, steps: 28, sleep: 8.5, junk: -3, streak: 0, weight: 18 } },
    { id: "el", name: "Ella",   initials: "EL", tone: "sage",                daysLogged: 14, streak: 7, total: 87.5, todayDelta: 3.0,
      perRule: { gym: 12, steps: 32, sleep: 10,  junk: -2, streak: 5, weight: 22 } },
    { id: "sc", name: "Scar",   initials: "SC", tone: "clay",                daysLogged: 14, streak: 5, total: 82.1, todayDelta: 1.5,
      perRule: { gym: 11, steps: 30, sleep: 9.5, junk: -3, streak: 0, weight: 19 } },
    { id: "ma", name: "Marcus", initials: "MA", tone: "mist",                daysLogged: 12, streak: 3, total: 71.3, todayDelta: 0,
      perRule: { gym: 9,  steps: 25, sleep: 8,   junk: -4, streak: 0, weight: 15 } },
    { id: "wi", name: "Will",   initials: "WI", tone: "rose",                daysLogged: 11, streak: 0, total: 64.8, todayDelta: 3.9,
      perRule: { gym: 8,  steps: 22, sleep: 6,   junk: -5, streak: 0, weight: 12 } },
    { id: "sa", name: "Sandro", initials: "SA", tone: "olive",               daysLogged: 9,  streak: 1, total: 52.4, todayDelta: 0,
      perRule: { gym: 6,  steps: 18, sleep: 4,   junk: -4, streak: 0, weight: 8 } },
  ];

  const RULES = [
    { id: "gym",    name: "Gym",         kind: "binary",  formula: "+1 per yes",      cap: "4/wk", free: 5, freeLeft: 5, weekCount: 3, weekCap: 4 },
    { id: "steps",  name: "Steps",       kind: "counter", formula: "10k = +5",        target: 10000, unit: "steps" },
    { id: "sleep",  name: "Sleep",       kind: "range",   formula: "7–9h = +1",       target: [7, 9], unit: "h" },
    { id: "junk",   name: "Junk food",   kind: "penalty", formula: "−1, first/wk waived", free: 5, freeLeft: 5, weekCount: 0 },
    { id: "streak", name: "Clean streak",kind: "streak",  formula: "7 clean days = +5", target: 7, current: 4 },
    { id: "weight", name: "Weight",      kind: "tracker", formula: "0–30 pts · lb",   start: 195, current: 187, goal: 175, unit: "lb" },
  ];

  // Kunle's today entries (mixed state: 4/6 logged, junk and streak derived)
  const TODAY_ENTRY = {
    gym: { value: "yes", points: 1.0, time: "9:24 PM" },
    steps: { value: 7200, points: 3.6, time: "9:24 PM" },
    sleep: { value: 7.5, points: 1.0, time: "9:24 PM" },
    weight: { value: 187, points: 1.5, time: "7:02 AM" },
    junk: null,
    // streak derived: 4/7 — no input
  };

  // Yesterday's entry — for the locked card preview demo
  const YESTERDAY_ENTRY = {
    gym: { value: "yes",  points: 1.0, time: "8:11 PM" },
    steps: { value: 9400, points: 4.7, time: "8:11 PM" },
    sleep: { value: 7,    points: 1.0, time: "11:48 PM" },
    junk: { value: "clean", points: 0.0, time: "11:48 PM" },
    weight: { value: 187.5, points: 1.4, time: "7:14 AM" },
  };

  const HISTORY = [
    { date: "Today · Fri May 22", entries: [
      { who: "Ella",   summary: "logged Gym, Steps (10,400), Clean", delta: +6.2, time: "9:24 PM" },
      { who: "Kunle",  summary: "logged Gym, Steps (7,200), Sleep (7.5h)", delta: +5.6, time: "9:24 PM", you: true },
      { who: "Scar",   summary: "logged Weight: 187 lb", delta: +1.5, time: "7:02 AM" },
    ]},
    { date: "Thu May 21", entries: [
      { who: "Marcus", summary: "updated yesterday's entry · Clean → Slipped", note: "within edit window", delta: -1.0, time: "11:48 PM" },
      { who: "Will",   summary: "logged Gym (★ free), Steps (5,800)", delta: +3.9, time: "10:14 PM" },
      { who: "Jenna",  summary: "was removed by Kunle", admin: true, delta: 0, time: "3:00 PM" },
    ]},
    { date: "Wed May 20", entries: [
      { who: "Ella",   summary: "hit 7-day clean streak · +5 milestone", delta: +5.0, time: "10:02 PM", milestone: true },
      { who: "Sandro", summary: "logged Gym, Junk: Slipped", delta: 0.0, time: "9:18 PM" },
      { who: "Kunle",  summary: "logged Gym, Steps (10,200), Clean", delta: +6.6, time: "9:01 PM", you: true },
    ]},
  ];

  // Map member by id for quick lookup
  const byId = Object.fromEntries(MEMBERS.map(m => [m.id, m]));
  const me = MEMBERS.find(m => m.you);

  // Audit log
  const AUDIT = [
    { actor: "Kunle", action: "removed member", target: "Jenna", time: "May 21 · 3:00 PM", diff: { active: ["—"], removed: ["Jenna"] } },
    { actor: "Kunle", action: "changed rule Sleep", target: "range 7–9h → 7.5–9.5h", time: "May 19 · 8:12 AM" },
    { actor: "Ella",  action: "renamed member", target: "Sara → Scar", time: "May 14 · 12:40 PM" },
    { actor: "Kunle", action: "created challenge", target: "Summer Challenge", time: "May 1 · 6:00 AM" },
  ];

  return {
    challenge: {
      name: "Summer Challenge",
      year: "2026",
      slug: "summer-26",
      startISO: "May 1, 2026",
      endISO: "Jul 26, 2026",
      currentWeek: 4,
      totalWeeks: 12,
      daysLeft: 38,
      entries: 87,
      today,
      tomorrow,
    },
    members: MEMBERS,
    byId,
    me,
    rules: RULES,
    todayEntry: TODAY_ENTRY,
    yesterdayEntry: YESTERDAY_ENTRY,
    history: HISTORY,
    audit: AUDIT,
  };
})();
