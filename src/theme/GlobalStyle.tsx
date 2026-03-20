import { createGlobalStyle } from 'styled-components';

export const GlobalStyle = createGlobalStyle`
  *,
  *::before,
  *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  body {
    font-family: ${({ theme }) => theme.font.body};
    background: ${({ theme }) => theme.color.bg};
    color: ${({ theme }) => theme.color.text};
    min-height: 100vh;
  }
`;
