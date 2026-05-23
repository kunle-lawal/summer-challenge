import { createGlobalStyle } from 'styled-components';

export const GlobalStyle = createGlobalStyle`
  *,
  *::before,
  *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    -webkit-font-smoothing: antialiased;
  }

  html {
    height: 100%;
    overflow: hidden;
    position: fixed;
    width: 100%;
    -webkit-text-size-adjust: 100%;
  }

  body {
    font-family: ${({ theme }) => theme.font.body};
    font-size: ${({ theme }) => theme.size.base};
    background: ${({ theme }) => theme.color.bg};
    color: ${({ theme }) => theme.color.ink};
    height: 100%;
    overflow: hidden;
    line-height: 1.45;
    overscroll-behavior: none;
    -webkit-overflow-scrolling: touch;
  }

  #root {
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  /* Prevent iOS from zooming in on focused inputs (requires font-size ≥ 16px) */
  @media (max-width: 768px) {
    input, select, textarea {
      font-size: 16px !important;
    }
  }

  button {
    font-family: inherit;
    cursor: pointer;
  }

  a {
    color: inherit;
    text-decoration: none;
  }
`;
