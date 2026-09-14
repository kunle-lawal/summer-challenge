import { createGlobalStyle } from 'styled-components';

/**
 * Reset + document-level type ramp.
 *
 * The type scale is the design's: 24/31 · 19/26 · 16/22 · 15/24 · 13/19 · 11/16.
 * Six sizes, which is the ceiling `docs/ui-design-patterns.md` §2 allows.
 */
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
    line-height: 24px;
    background: ${({ theme }) => theme.color.bg};
    color: ${({ theme }) => theme.color.ink};
    height: 100%;
    overflow: hidden;
    overscroll-behavior: none;
    -webkit-overflow-scrolling: touch;
  }

  #root {
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  h1, h2, h3 {
    font-family: ${({ theme }) => theme.font.display};
    font-weight: 600;
    letter-spacing: -0.02em;
    text-wrap: balance;
  }
  h1 { font-size: 24px; line-height: 31px; }
  h2 { font-size: 16px; line-height: 22px; }
  h3 { font-size: 15px; line-height: 20px; }

  p { text-wrap: pretty; }

  button, input, select, textarea {
    font: inherit;
    color: inherit;
  }

  button {
    font-family: inherit;
    cursor: pointer;
  }

  a {
    color: ${({ theme }) => theme.color.accentDeep};
    font-weight: 600;
    text-decoration: none;
    text-underline-offset: 3px;

    &:hover {
      color: ${({ theme }) => theme.color.ink};
      text-decoration: underline;
    }
  }

  /*
   * WCAG 2.2 SC 2.4.11 — a 2px perimeter at 3:1 against whatever sits behind it.
   * Ink on every light surface clears that comfortably; the dark hero flips it.
   */
  :focus-visible {
    outline: 2px solid ${({ theme }) => theme.color.ink};
    outline-offset: 2px;
    border-radius: 6px;
  }

  [data-on-panel] :focus-visible {
    outline-color: ${({ theme }) => theme.color.onPanel};
  }

  /* iOS Safari zooms on focus below 16px. This is the substantive reason
     behind the 16px body-text floor, and it applies to inputs specifically. */
  @media (max-width: 768px) {
    input, select, textarea {
      font-size: 16px !important;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }
`;
