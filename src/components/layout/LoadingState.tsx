import styled, { keyframes } from 'styled-components';

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  gap: 16px;
  background: ${({ theme }) => theme.color.bg};
`;

const Ring = styled.div`
  width: 32px;
  height: 32px;
  border: 2px solid ${({ theme }) => theme.color.hair2};
  border-top-color: ${({ theme }) => theme.color.ink};
  border-radius: 50%;
  animation: ${spin} 0.7s linear infinite;
`;

const Msg = styled.p`
  font-family: ${({ theme }) => theme.font.mono};
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.color.ink3};
`;

interface Props {
  message?: string;
}

export function LoadingState({ message = 'Loading…' }: Props) {
  return (
    <Wrap>
      <Ring />
      <Msg>{message}</Msg>
    </Wrap>
  );
}
