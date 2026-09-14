import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';
import { Body, Screen } from './Screen';
import { EmptyState } from '@/components/ui/feedback';

interface Props { children: ReactNode }
interface State { error: Error | null }

/**
 * Catches a render crash in one route and offers a way out.
 *
 * The previous copy here was "Something went wrong" followed by the raw
 * exception message, which `docs/ui-design-patterns.md` §9 names explicitly as
 * the thing not to ship: it states neither what happened nor what to do. The
 * message is still shown, but as supporting detail under a line that says
 * what's actually broken and what the reader can do about it.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // No reporting endpoint exists, but a crash should never be silent for
    // whoever is looking at a console.
    console.error('Screen failed to render:', error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <Screen>
        <Body>
          <EmptyState
            title="This screen didn’t load"
            body={`Something in the page failed while drawing it${error.message ? ` — ${error.message}` : ''}. Nothing you logged is affected. Reloading usually clears it.`}
            action={{ label: 'Reload the page', onClick: () => window.location.reload() }}
          />
        </Body>
      </Screen>
    );
  }
}
