import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';
import styled from 'styled-components';

const Wrap = styled.div`
  padding: 32px 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 200px;
  justify-content: center;
`;

const Title = styled.h2`
  font-family: ${({ theme }) => theme.font.display};
  font-size: 22px;
  color: ${({ theme }) => theme.color.bad};
`;

const Msg = styled.p`
  font-size: 13.5px;
  color: ${({ theme }) => theme.color.ink2};
  line-height: 1.5;
`;

const ReloadBtn = styled.button`
  appearance: none;
  border: 1px solid ${({ theme }) => theme.color.hair2};
  background: ${({ theme }) => theme.color.surface};
  color: ${({ theme }) => theme.color.ink};
  font: 500 14px/1 ${({ theme }) => theme.font.body};
  padding: 10px 16px;
  border-radius: ${({ theme }) => theme.radii.md};
  cursor: pointer;
  align-self: flex-start;
`;

interface Props { children: ReactNode; }
interface State { error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo) {
    // intentionally not logging to avoid noise in production
  }

  render() {
    if (this.state.error) {
      return (
        <Wrap>
          <Title>Something went wrong</Title>
          <Msg>{this.state.error.message}</Msg>
          <ReloadBtn onClick={() => window.location.reload()}>Reload</ReloadBtn>
        </Wrap>
      );
    }
    return this.props.children;
  }
}
