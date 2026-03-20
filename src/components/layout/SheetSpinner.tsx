import styled, { keyframes } from 'styled-components';

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const Wrap = styled.div<{ $visible: boolean }>`
  position: fixed;
  right: 16px;
  bottom: 16px;
  display: ${({ $visible }) => ($visible ? 'inline-flex' : 'none')};
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: ${({ theme }) => theme.radii.pill};
  background: rgba(26, 26, 26, 0.95);
  border: 1px solid ${({ theme }) => theme.color.border2};
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.7);
  z-index: 998;
  font-size: 0.7rem;
  color: ${({ theme }) => theme.color.muted2};
`;

const Dot = styled.div`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  border: 2px solid ${({ theme }) => theme.color.goldDim};
  border-top-color: ${({ theme }) => theme.color.gold};
  animation: ${spin} 0.8s linear infinite;
`;

const Text = styled.span`
  letter-spacing: 0.06em;
  text-transform: uppercase;
`;

export function SheetSpinner({ visible }: { visible: boolean }) {
  return (
    <Wrap $visible={visible}>
      <Dot />
      <Text>Syncing sheets…</Text>
    </Wrap>
  );
}
