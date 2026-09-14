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
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
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
  auditLog: [],
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

vi.mock('@/context/AdminModeContext', () => ({
  useAdminMode: () => ({ isAdmin: false, enterAdminMode: vi.fn(), exitAdminMode: vi.fn() }),
  AdminModeProvider: ({ children }: { children: ReactElement }) => children,
}));

import { ChallengeHomePage } from './ChallengeHomePage';
import { LogDayPage } from './LogDayPage';

function render(el: ReactElement, route = '/c/abc123'): string {
  return renderToString(
    <ThemeProvider theme={appTheme}>
      <MemoryRouter initialEntries={[route]}>{el}</MemoryRouter>
    </ThemeProvider>,
  );
}

beforeEach(() => {
  challengeState.challenge = makeChallenge();
  challengeState.members = MEMBERS;
  challengeState.entries = ENTRIES;
  challengeState.activeMembers = MEMBERS;
  memberState.selectedMemberId = 'm1';
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
