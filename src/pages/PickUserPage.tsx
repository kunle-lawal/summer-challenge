import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useSelectedPerson } from '../context/SelectedPersonContext';
import { PEOPLE } from '../lib/config';
import { initials } from '../lib/scoring';
import type { Person } from '../types';

const Page = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding: 2.5rem 1.5rem 3rem;
  box-sizing: border-box;
`;

const Inner = styled.div`
  width: 100%;
  max-width: 420px;
`;

const Brand = styled.div`
  font-family: ${({ theme }) => theme.font.display};
  font-size: 0.65rem;
  letter-spacing: 0.14em;
  color: ${({ theme }) => theme.color.gold};
  text-transform: uppercase;
  text-align: center;
  margin-bottom: 0.75rem;
`;

const Title = styled.h1`
  font-family: ${({ theme }) => theme.font.display};
  font-size: clamp(1.35rem, 5vw, 1.75rem);
  font-weight: 900;
  letter-spacing: -0.02em;
  color: ${({ theme }) => theme.color.text};
  text-align: center;
  margin: 0 0 0.35rem;
  line-height: 1.15;
`;

const Sub = styled.p`
  font-size: 0.8rem;
  color: ${({ theme }) => theme.color.muted2};
  text-align: center;
  margin: 0 0 1.75rem;
  line-height: 1.45;
`;

const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const UserBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  padding: 14px 16px;
  border-radius: 14px;
  border: 1px solid ${({ theme }) => theme.color.border};
  background: ${({ theme }) => theme.color.surface};
  color: ${({ theme }) => theme.color.text};
  cursor: pointer;
  text-align: left;
  transition: border-color 0.15s, background 0.15s;

  &:hover {
    border-color: ${({ theme }) => theme.color.gold};
    background: ${({ theme }) => theme.color.surface};
  }
`;

const Avatar = styled.div`
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: ${({ theme }) => theme.color.purpleDim};
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: ${({ theme }) => theme.font.display};
  font-size: 0.72rem;
  font-weight: 700;
  color: ${({ theme }) => theme.color.purple};
  flex-shrink: 0;
`;

const NameBlock = styled.div`
  flex: 1;
  min-width: 0;
`;

const Name = styled.div`
  font-family: ${({ theme }) => theme.font.display};
  font-size: 0.88rem;
  font-weight: 700;
`;

const Hint = styled.div`
  font-size: 0.65rem;
  color: ${({ theme }) => theme.color.muted};
  margin-top: 2px;
`;

const Chevron = styled.span`
  color: ${({ theme }) => theme.color.muted2};
  font-size: 1.1rem;
  line-height: 1;
  flex-shrink: 0;
`;

export function PickUserPage() {
  const navigate = useNavigate();
  const { setSelectedPerson } = useSelectedPerson();

  const choose = (p: Person) => {
    setSelectedPerson(p);
    navigate('/log', { replace: true });
  };

  return (
    <Page>
      <Inner>
        <Brand>Summer Challenge</Brand>
        <Title>Who&apos;s logging in?</Title>
        <Sub>Tap your name to open your log and personal goal. We&apos;ll remember this device next time.</Sub>
        <List>
          {PEOPLE.map((p) => (
            <UserBtn key={p.id} type="button" onClick={() => choose(p)}>
              <Avatar>{initials(p.name)}</Avatar>
              <NameBlock>
                <Name>{p.name}</Name>
                <Hint>Log day &amp; personal goal</Hint>
              </NameBlock>
              <Chevron aria-hidden>›</Chevron>
            </UserBtn>
          ))}
        </List>
      </Inner>
    </Page>
  );
}
