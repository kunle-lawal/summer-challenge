import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useChallenge } from '@/context/ChallengeContext';
import { useSelectedMember } from '@/context/SelectedMemberContext';
import { activeRules, type Entry } from '@/types';
import { addDays, compareDates, todayInTz } from '@/lib/dates';
import { evaluateEntry } from '@/lib/rules/evaluate';
import { formatPoints, isLogged } from '@/lib/rules/display';
import { Body, Sheet, TopBar } from '@/components/layout/Screen';
import { EmptyState } from '@/components/ui/feedback';
import { Icon } from '@/components/ui/Icons';
import { IconButton, List, Meta, Name, Note, Points, Row, tnum } from '@/components/ui/primitives';

/**
 * Every day of the challenge so far, newest first, each one editable.
 *
 * This replaces the audit-log feed that used to live here, per the design. The
 * audit log itself is not lost — it has its own viewer inside /admin.
 */

const DayRow = styled(Row)`
  min-height: 66px;
`;

const Ticks = styled.span`
  display: flex;
  gap: 3px;
  margin-top: 5px;

  > i {
    width: 16px;
    height: 4px;
    border-radius: 2px;
    background: ${({ theme }) => theme.color.hair2};
    flex: 0 0 auto;
  }
  > i.on { background: ${({ theme }) => theme.color.ink}; }
  > i.neg { background: ${({ theme }) => theme.color.accent}; }
`;

const DayPoints = styled(Points)`
  font-size: 17px;
  ${tnum}
`;

function dayLabel(date: string, today: string): string {
  const pretty = new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC',
  });
  if (date === today) return `Today · ${pretty}`;
  if (date === addDays(today, -1)) return `Yesterday · ${pretty}`;
  return pretty;
}

export function HistoryPage() {
  const { challenge, members, entries } = useChallenge();
  const { selectedMemberId } = useSelectedMember();
  const navigate = useNavigate();

  const data = useMemo(() => {
    if (!challenge || !selectedMemberId) return null;
    const me = members.find(m => m.id === selectedMemberId);
    if (!me) return null;

    const { timezone, startDate, endDate } = challenge.config;
    const today = todayInTz(timezone);
    const last = endDate && compareDates(endDate, today) < 0 ? endDate : today;

    const myEntries = entries.filter(e => e.memberId === me.id);
    const byDate = new Map<string, Entry>(myEntries.map(e => [e.date, e]));
    const rules = activeRules(challenge.config.rules).filter(r => r.kind !== 'streak');
    const daily = rules.filter(r => r.kind !== 'tracker');

    const days: { date: string; entry: Entry | null; points: number; logged: number }[] = [];
    for (let d = last; compareDates(d, startDate) >= 0; d = addDays(d, -1)) {
      const entry = byDate.get(d) ?? null;
      const evaluated = entry ? evaluateEntry(challenge, entry, me, myEntries) : null;
      days.push({
        date: d,
        entry,
        points: daily.reduce((sum, r) => sum + (evaluated?.perRule[r.id]?.points ?? 0), 0),
        logged: daily.filter(r => isLogged(entry?.values[r.id])).length,
      });
      if (days.length > 400) break; // guard against a pathological date range
    }

    return { me, today, days, daily, anyLogged: myEntries.length > 0 };
  }, [challenge, members, entries, selectedMemberId]);

  if (!challenge || !data) return null;
  const { today, days, daily, anyLogged } = data;

  const back = (
    <IconButton type="button" aria-label="Back" onClick={() => navigate(`/c/${challenge.slug}`)}>
      <Icon name="back" />
    </IconButton>
  );

  if (!anyLogged) {
    return (
      <Body>
        <TopBar center title="History" left={back} />
        <EmptyState
          title="No days logged yet"
          body="Once you log a day it shows up here, and you can come back and change it any time the challenge is running."
          action={{ label: 'Log today', onClick: () => navigate(`/c/${challenge.slug}/log`) }}
        />
      </Body>
    );
  }

  return (
    <Body>
      <TopBar
        center
        title="History"
        sub={`${days.length} ${days.length === 1 ? 'day' : 'days'} · tap to edit any of them`}
        left={back}
      />
      <Sheet>
        <List>
          {days.map(d => (
            <DayRow
              key={d.date}
              as={Link}
              to={`/c/${challenge.slug}/log?date=${d.date}`}
            >
              <Name>
                <b>{dayLabel(d.date, today)}</b>
                <Meta>
                  {d.logged === 0
                    ? 'Nothing logged'
                    : `${d.logged} of ${daily.length} rules`}
                </Meta>
                <Ticks aria-hidden="true">
                  {daily.map(r => {
                    const v = d.entry?.values[r.id];
                    const negative = r.kind === 'penalty' && v === 'infraction';
                    return <i key={r.id} className={negative ? 'neg' : isLogged(v) ? 'on' : ''} />;
                  })}
                </Ticks>
              </Name>
              <DayPoints>{d.logged === 0 ? '—' : formatPoints(d.points)}</DayPoints>
              <Icon name="next" />
            </DayRow>
          ))}
        </List>

        <Note>
          Editing a past day re-scores the leaderboard straight away, and the change is recorded in
          history under your name.
        </Note>
      </Sheet>
    </Body>
  );
}
