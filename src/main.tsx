import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { GlobalStyle } from './theme/GlobalStyle';
import { AppThemeProvider } from './theme/AppThemeProvider';
import { initAppCheck } from '@/lib/appCheck';

// Must run before the first Firestore call so requests carry an attestation.
initAppCheck();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AppThemeProvider>
        <GlobalStyle />
        <App />
      </AppThemeProvider>
    </BrowserRouter>
  </StrictMode>,
);
