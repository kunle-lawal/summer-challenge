import { useState } from 'react';
import styled from 'styled-components';
import { APPLE_ENABLED, signIn, type Provider } from '@/lib/auth';
import { Body, Screen } from '@/components/layout/Screen';
import { Mark } from '@/components/ui/feedback';
import { Button, ErrorText, Hint, Meta } from '@/components/ui/primitives';

/**
 * The front door.
 *
 * Every security rule requires `request.auth`, so this is not an optional
 * step — nothing in the app can read or write without an account. A popup is
 * used rather than a redirect so that someone arriving on a challenge link
 * lands back on it rather than at the root.
 */

const Pane = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 20px;
  padding: 32px 20px calc(40px + env(safe-area-inset-bottom, 0px));
  color: ${({ theme }) => theme.color.accent};

  h1 { font-size: 28px; line-height: 35px; color: ${({ theme }) => theme.color.ink}; }
`;

const Buttons = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 4px;
`;

const Foot = styled.p`
  font-size: 13px;
  line-height: 20px;
  font-weight: 500;
  color: ${({ theme }) => theme.color.ink3};
  margin-top: auto;
`;

export function SignInPage() {
  const [busy, setBusy] = useState<Provider | null>(null);
  const [error, setError] = useState<string | null>(null);

  const go = async (provider: Provider) => {
    setBusy(provider);
    setError(null);
    const result = await signIn(provider);
    setBusy(null);
    // A cancelled sign-in is a decision, not a failure — saying so would be
    // telling someone off for changing their mind.
    if (!result.ok && result.reason !== 'cancelled') setError(result.message);
  };

  return (
    <Screen>
      <Body>
        <Pane>
          <Mark size={72} />
          <div>
            <h1>Sign in to keep score</h1>
            <Meta>
              Your account is what ties your logged days to you, so nobody else can enter them —
              and so they follow you to a new phone.
            </Meta>
          </div>

          <Buttons>
            <Button type="button" $block disabled={busy !== null} onClick={() => go('google')}>
              {busy === 'google' ? 'Opening…' : 'Continue with Google'}
            </Button>
            {APPLE_ENABLED && (
              <Button type="button" $tone="ghost" $block disabled={busy !== null} onClick={() => go('apple')}>
                {busy === 'apple' ? 'Opening…' : 'Continue with Apple'}
              </Button>
            )}
          </Buttons>

          {error && <ErrorText role="alert">{error}</ErrorText>}

          <Hint>
            We only ever see your name and email address. Nothing is posted anywhere, and your
            challenges stay private to the people you share the link with.
          </Hint>

          <Foot>Opening a challenge link? Sign in and it’ll take you straight there.</Foot>
        </Pane>
      </Body>
    </Screen>
  );
}
