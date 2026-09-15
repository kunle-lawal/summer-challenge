/**
 * Render smoke tests.
 *
 * These do not assert on layout — they assert that every screen renders at all
 * with realistic data, and renders something a person would recognise. A
 * typecheck cannot catch a screen that throws on a rule kind it forgot about,
 * or an empty state that never appears; this does.
 *
 * `renderToString` is enough for that and needs no test-renderer dependency.
 */
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import type { ReactElement } from 'react';
import { appTheme } from '@/theme/theme';
import { ENTRIES, MEMBERS, makeChallenge, makeEntry, makeMember } from '@/test/fixtures';

const challengeState = {
  challenge: makeChallenge(),
  loading: false,
  error: null as string | null,
  notFound: false,
  members: MEMBERS,
  entries: ENTRIES,
  auditLog: [] as unknown[],
  isEnded: false,
  activeMembers: MEMBERS,
};

const memberState = {
  selectedMemberId: 'm1' as string | null,
  isOrphaned: false,
  setSelectedMemberId: vi.fn(),
  clearSelectedMemberId: vi.fn(),
};

vi.mock('@/context/ChallengeContext', () => ({
  useChallenge: () => challengeState,
  ChallengeProvider: ({ children }: { children: ReactElement }) => children,
}));

vi.mock('@/context/SelectedMemberContext', () => ({
  useSelectedMember: () => memberState,
  SelectedMemberProvider: ({ children }: { children: ReactElement }) => children,
}));

const adminState = {
  isAdmin: false,
  entering: false,
  lastError: null as string | null,
  enterAdminMode: vi.fn(),
  exitAdminMode: vi.fn(),
};

vi.mock('@/context/AdminModeContext', () => ({
  useAdminMode: () => adminState,
  AdminModeProvider: ({ children }: { children: ReactElement }) => children,
}));

import { ChallengeHomePage } from './ChallengeHomePage';
import { LogDayPage } from './LogDayPage';
import { LeaderboardPage } from './LeaderboardPage';
import { HistoryPage } from './HistoryPage';
import { RulesReferencePage } from './RulesReferencePage';
import { MemberProfilePage } from './MemberProfilePage';
import { PickMemberPage } from './PickMemberPage';
import { AdminPage } from './AdminPage';
import { CreateChallengePage } from './CreateChallengePage';

function render(el: ReactElement, route = '/c/abc123'): string {
  return renderToString(
    <ThemeProvider theme={appTheme}>
      <MemoryRouter initialEntries={[route]}>{el}</MemoryRouter>
    </ThemeProvider>,
  );
}

/** For screens that read route params. */
function renderAt(el: ReactElement, pattern: string, route: string): string {
  return renderToString(
    <ThemeProvider theme={appTheme}>
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route path={pattern} element={el} />
        </Routes>
      </MemoryRouter>
    </ThemeProvider>,
  );
}

// react-router calls useLayoutEffect unconditionally; on the server that warns
// every render and buries anything that actually matters.
const realError = console.error;
beforeAll(() => {
  console.error = (...args: unknown[]) => {
    if (typeof args[0] === 'string' && args[0].includes('useLayoutEffect does nothing on the server')) return;
    realError(...args);
  };
});
afterAll(() => {
  console.error = realError;
});

beforeEach(() => {
  challengeState.challenge = makeChallenge();
  challengeState.members = MEMBERS;
  challengeState.entries = ENTRIES;
  challengeState.activeMembers = MEMBERS;
  memberState.selectedMemberId = 'm1';
  adminState.isAdmin = false;
  adminState.lastError = null;
  challengeState.auditLog = [];
  vi.setSystemTime(new Date('2026-05-22T12:00:00Z'));
});

// ---------------------------------------------------------------------------

describe('Home', () => {
  it('renders the challenge, the member and every active rule', () => {
    const html = render(<ChallengeHomePage />);
    expect(html).toContain('Summer Challenge');
    expect(html).toContain('Kunle');
    for (const name of ['Gym', 'Steps', 'Sleep', 'Junk food']) {
      expect(html).toContain(name);
    }
  });

  it('says when the challenge ends, not just how long is left', () => {
    const html = render(<ChallengeHomePage />);
    expect(html).toContain('Ends Sun, Jul 26');
    expect(html).toContain('d left');
  });

  it('says so in the past tense once the challenge is over', () => {
    challengeState.challenge = makeChallenge({ status: 'ended' });
    const html = render(<ChallengeHomePage />);
    expect(html).toContain('Ended');
    expect(html).toContain('Finished');
  });

  it('answers the same question when there is no end date at all', () => {
    const c = makeChallenge();
    c.config.endDate = null;
    challengeState.challenge = c;
    const html = render(<ChallengeHomePage />);
    expect(html).toContain('No end date');
    expect(html).toContain('running since');
  });

  it('names how many rules are left rather than a bare "Log today"', () => {
    const html = render(<ChallengeHomePage />);
    expect(html).toMatch(/Log today|Finish today|Edit today/);
  });

  it('survives a challenge with no rules at all', () => {
    const c = makeChallenge();
    c.config.rules = [];
    challengeState.challenge = c;
    expect(() => render(<ChallengeHomePage />)).not.toThrow();
  });

  it('survives a member with no entries', () => {
    challengeState.entries = [];
    const html = render(<ChallengeHomePage />);
    expect(html).toContain('Log today');
  });

  it('disables the log button once the challenge has ended', () => {
    challengeState.challenge = makeChallenge({ status: 'ended' });
    const html = render(<ChallengeHomePage />);
    expect(html).toContain('Challenge ended');
    expect(html).toContain('disabled');
  });

  /*
   * The only other link to /new sat behind the owner password, and "/"
   * redirects to your most recent challenge — so anyone who already had one
   * could not reach the create screen at all.
   */
  it('offers a way to start another challenge without the owner password', () => {
    const html = render(<ChallengeHomePage />);
    expect(html).toContain('Start a new challenge');
    expect(html).toContain('href="/new"');
  });

  it('hides retired rules from Today', () => {
    const c = makeChallenge();
    c.config.rules = c.config.rules.map(r => (r.id === 'steps' ? { ...r, active: false } : r));
    challengeState.challenge = c;
    const html = render(<ChallengeHomePage />);
    expect(html).toContain('Gym');
    expect(html).not.toContain('Steps');
  });
});

// ---------------------------------------------------------------------------

describe('Log day', () => {
  it('opens on the first step of the wizard', () => {
    const html = render(<LogDayPage />, '/c/abc123/log');
    expect(html).toContain('Step 1 of');
    expect(html).toContain('Gym');
  });

  it('offers a free pass with the balance on it', () => {
    const html = render(<LogDayPage />, '/c/abc123/log');
    expect(html).toContain('Use a free pass');
    // One 'free' already spent in the fixtures, out of five.
    expect(html).toContain('4 of 5 left');
  });

  it('jumps to the rule named in the query string', () => {
    const html = render(<LogDayPage />, '/c/abc123/log?rule=sleep');
    expect(html).toContain('Step 1 of');
  });

  it('asks for a tracker goal before logging a value against it', () => {
    // Five value rules (six minus the derived streak) plus the goal-setup step.
    const html = render(<LogDayPage />, '/c/abc123/log');
    expect(html).toContain('Step 1 of 6');
  });

  it('skips goal setup once the member has a tracker config', () => {
    challengeState.members = [
      makeMember({
        trackerConfig: {
          ruleId: 'weight', label: 'Weight', unit: 'lb',
          startVal: 195, goalVal: 175, direction: 'down',
          lockedAt: { seconds: 0, nanoseconds: 0 } as never,
        },
      }),
      ...MEMBERS.slice(1),
    ];
    const html = render(<LogDayPage />, '/c/abc123/log');
    expect(html).toContain('Step 1 of 5');
  });

  it('shows a past day as a single editable list, not a wizard', () => {
    const html = render(<LogDayPage />, '/c/abc123/log?date=2026-05-20');
    expect(html).toContain('Editing a past day');
    expect(html).not.toContain('Step 1 of');
    // Every rule visible at once.
    expect(html).toContain('Gym');
    expect(html).toContain('Junk food');
  });

  it('locks a day outside the challenge dates', () => {
    const html = render(<LogDayPage />, '/c/abc123/log?date=2026-04-01');
    expect(html).toContain('Locked');
  });

  it('explains itself when the challenge has no rules', () => {
    const c = makeChallenge();
    c.config.rules = [];
    challengeState.challenge = c;
    const html = render(<LogDayPage />, '/c/abc123/log');
    expect(html).toContain('no rules to log yet');
  });

  it('counts only the current week toward a weekly cap', () => {
    // Weeks run from the 2026-05-01 anchor, so this one is 05-22 to 05-28.
    vi.setSystemTime(new Date('2026-05-25T12:00:00Z'));
    challengeState.entries = [
      makeEntry('2026-05-21', { gym: 'yes' }), // previous week — must not count
      makeEntry('2026-05-22', { gym: 'yes' }),
      makeEntry('2026-05-23', { gym: 'yes' }),
    ];
    const html = render(<LogDayPage />, '/c/abc123/log');
    expect(html).toContain('2 of 4 this week');
  });
});

// ---------------------------------------------------------------------------

describe('Leaderboard', () => {
  it('ranks everyone with a podium', () => {
    const html = render(<LeaderboardPage />, '/c/abc123/board');
    expect(html).toContain('Leaderboard');
    expect(html).toContain('Kunle');
    expect(html).toContain('Ella');
    expect(html).toContain('Standings');
  });

  it('offers both scopes', () => {
    const html = render(<LeaderboardPage />, '/c/abc123/board');
    expect(html).toContain('All time');
    expect(html).toContain('This week');
  });

  it('shows an empty state rather than an empty podium', () => {
    challengeState.entries = [];
    const html = render(<LeaderboardPage />, '/c/abc123/board');
    expect(html).toContain('Nothing logged yet');
  });

  it('surfaces a load error with a way out', () => {
    challengeState.error = 'Firestore is unreachable.';
    const html = render(<LeaderboardPage />, '/c/abc123/board');
    expect(html).toContain('Scores didn’t load');
    expect(html).toContain('Try again');
    challengeState.error = null;
  });

  it('renders a podium-less board when there are fewer than three people', () => {
    challengeState.members = [MEMBERS[0]!];
    challengeState.activeMembers = [MEMBERS[0]!];
    expect(() => render(<LeaderboardPage />, '/c/abc123/board')).not.toThrow();
  });
});

// ---------------------------------------------------------------------------

describe('History', () => {
  it('lists every day back to the challenge start, newest first', () => {
    const html = render(<HistoryPage />, '/c/abc123/history');
    expect(html).toContain('Today');
    expect(html).toContain('Yesterday');
    // 2026-05-01 through 2026-05-22.
    expect(html).toContain('22 days');
  });

  it('links each day into the editor for that date', () => {
    const html = render(<HistoryPage />, '/c/abc123/history');
    expect(html).toContain('/c/abc123/log?date=2026-05-20');
  });

  it('shows an empty state before anything is logged', () => {
    challengeState.entries = [];
    const html = render(<HistoryPage />, '/c/abc123/history');
    expect(html).toContain('No days logged yet');
  });
});

// ---------------------------------------------------------------------------

describe('Rules', () => {
  it('lists every active rule with its formula', () => {
    const html = render(<RulesReferencePage />, '/c/abc123/rules');
    expect(html).toContain('Gym');
    expect(html).toContain('Clean streak');
    expect(html).toContain('6 rules in play');
  });

  it('starts with every rule collapsed', () => {
    const html = render(<RulesReferencePage />, '/c/abc123/rules');
    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toContain('aria-expanded="true"');
  });

  it('shows the free-pass balance against a rule that has them', () => {
    const html = render(<RulesReferencePage />, '/c/abc123/rules');
    expect(html).toContain('free passes left');
  });

  it('explains itself when there are no rules', () => {
    const c = makeChallenge();
    c.config.rules = [];
    challengeState.challenge = c;
    const html = render(<RulesReferencePage />, '/c/abc123/rules');
    expect(html).toContain('No rules yet');
  });
});

// ---------------------------------------------------------------------------

describe('Member profile', () => {
  const at = (id: string) => renderAt(<MemberProfilePage />, '/c/:slug/m/:memberId', `/c/abc123/m/${id}`);

  it('breaks a member’s points down by rule', () => {
    const html = at('m1');
    expect(html).toContain('Where the points came from');
    expect(html).toContain('This week');
  });

  it('calls the current device’s member "You"', () => {
    expect(at('m1')).toContain('You');
  });

  it('shows an empty state for someone who has logged nothing', () => {
    const html = at('m3');
    expect(html).toContain('hasn’t logged anything yet');
  });

  it('handles a member id that does not exist', () => {
    const html = at('nope');
    expect(html).toContain('No such member');
  });

  it('hides owner actions when admin mode is locked', () => {
    expect(at('m2')).not.toContain('Actions for');
  });
});

// ---------------------------------------------------------------------------

describe('Member picker', () => {
  it('lists everyone on the roster', () => {
    const html = render(<PickMemberPage />, '/c/abc123/pick');
    expect(html).toContain('Who’s logging in?');
    expect(html).toContain('Kunle');
    expect(html).toContain('Ella');
    expect(html).toContain('Scar');
  });

  it('says how much each person has logged', () => {
    const html = render(<PickMemberPage />, '/c/abc123/pick');
    expect(html).toContain('days logged');
    expect(html).toContain('Nothing logged yet');
  });

  it('lets someone who is not on the roster start their own challenge', () => {
    const html = render(<PickMemberPage />, '/c/abc123/pick');
    expect(html).toContain('start your own challenge');
  });

  it('explains what to do when the roster is empty', () => {
    challengeState.activeMembers = [];
    const html = render(<PickMemberPage />, '/c/abc123/pick');
    expect(html).toContain('No one on the roster yet');
  });
});

// ---------------------------------------------------------------------------

describe('Settings', () => {
  it('asks for the owner password before showing anything', () => {
    const html = render(<AdminPage />, '/c/abc123/admin');
    expect(html).toContain('Enter the owner password');
    expect(html).not.toContain('Delete challenge');
  });

  it('says the password cannot be reset, since it cannot', () => {
    adminState.lastError = 'wrong_password';
    const html = render(<AdminPage />, '/c/abc123/admin');
    expect(html).toContain('no way to reset it');
  });

  it('shows every section once unlocked', () => {
    adminState.isAdmin = true;
    const html = render(<AdminPage />, '/c/abc123/admin');
    for (const section of ['Basics', 'Rules', 'Members', 'History log', 'End the challenge']) {
      expect(html).toContain(section);
    }
  });

  it('keeps the capabilities the design dropped', () => {
    adminState.isAdmin = true;
    const html = render(<AdminPage />, '/c/abc123/admin');
    expect(html).toContain('Delete challenge');
    expect(html).toContain('Rename'); // per-member rename
  });

  it('offers reopening rather than ending once a challenge is over', () => {
    adminState.isAdmin = true;
    challengeState.challenge = makeChallenge({ status: 'ended' });
    const html = render(<AdminPage />, '/c/abc123/admin');
    expect(html).toContain('Reopen challenge');
    expect(html).not.toContain('End challenge now');
  });

  it('renders the challenge name in an editable field', () => {
    adminState.isAdmin = true;
    const html = render(<AdminPage />, '/c/abc123/admin');
    expect(html).toContain('Challenge name');
    expect(html).toContain('value="Summer Challenge"');
  });
});

// ---------------------------------------------------------------------------

describe('Create challenge', () => {
  it('lays out all three steps', () => {
    const html = render(<CreateChallengePage />, '/new');
    expect(html).toContain('Name and dates');
    expect(html).toContain('Rules');
    expect(html).toContain('Password and people');
  });

  it('offers every challenge template, grouped by what it is for', () => {
    const html = render(<CreateChallengePage />, '/new');
    for (const name of ['Lock In', 'Base Camp', 'Winter Arc', 'Cut', 'Recomp', 'Run Club', 'Reset', 'Deep Work', 'Start empty']) {
      expect(html).toContain(name);
    }
    for (const focus of ['Balanced', 'Body composition', 'Endurance', 'Mind']) {
      expect(html).toContain(focus);
    }
  });

  it('explains only the template you picked, not all fourteen', () => {
    const html = render(<CreateChallengePage />, '/new');
    const blurbs = html.split('The balanced one').length - 1;
    expect(blurbs).toBe(1);
  });

  it('starts on a template, with its rules already listed', () => {
    const html = render(<CreateChallengePage />, '/new');
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('Gym');
    expect(html).toContain('Personal goal');
  });

  it('says what each template costs you if you are perfect, and how forgiving it is', () => {
    const html = render(<CreateChallengePage />, '/new');
    expect(html).toContain('pts if perfect');
    expect(html).toContain('free passes a week');
    expect(html).toContain('First slip each week is free');
  });

  it('cannot be submitted while empty', () => {
    const html = render(<CreateChallengePage />, '/new');
    expect(html).toContain('Create challenge');
    expect(html).toContain('disabled');
  });

  it('sets the end date from the template it starts on', () => {
    // System time is 2026-05-22; Lock In is nine weeks, so 63 days inclusive.
    const html = render(<CreateChallengePage />, '/new');
    expect(html).toContain('value="2026-05-22"');
    expect(html).toContain('value="2026-07-23"');
  });

  it('asks for names rather than offering a roster to toggle', () => {
    const html = render(<CreateChallengePage />, '/new');
    expect(html).toContain('Add someone');
    expect(html).not.toContain('Not invited');
  });
});
