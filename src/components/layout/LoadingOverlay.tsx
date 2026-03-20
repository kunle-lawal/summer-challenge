import styled from 'styled-components';

const Overlay = styled.div<{ $open: boolean }>`
  position: fixed;
  inset: 0;
  background: ${({ theme }) => theme.color.bg};
  display: ${({ $open }) => ($open ? 'flex' : 'none')};
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  z-index: 999;
`;

const Brand = styled.div`
  font-family: ${({ theme }) => theme.font.display};
  font-size: 0.7rem;
  letter-spacing: 0.1em;
  color: ${({ theme }) => theme.color.gold};
  text-transform: uppercase;
`;

const Msg = styled.div`
  font-size: 0.72rem;
  color: ${({ theme }) => theme.color.muted2};
`;

export function LoadingOverlay({
  open,
  message,
}: {
  open: boolean;
  message: string;
}) {
  return (
    <Overlay $open={open}>
      <Brand>Summer Challenge</Brand>
      <Msg>{message}</Msg>
    </Overlay>
  );
}
