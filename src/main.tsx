import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { ChallengeProvider } from './context/ChallengeContext';
import { SelectedPersonProvider } from './context/SelectedPersonContext';
import { GlobalStyle } from './theme/GlobalStyle';
import { AppThemeProvider } from './theme/AppThemeProvider';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AppThemeProvider>
        <GlobalStyle />
        <SelectedPersonProvider>
          <ChallengeProvider>
            <App />
          </ChallengeProvider>
        </SelectedPersonProvider>
      </AppThemeProvider>
    </BrowserRouter>
  </StrictMode>,
);
