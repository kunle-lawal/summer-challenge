export interface AppTheme {
  color: {
    bg: string;
    bg2: string;
    surface: string;
    surface2: string;
    ink: string;
    ink2: string;
    ink3: string;
    ink4: string;
    hair: string;
    hair2: string;
    accent: string;
    accentInk: string;
    accentTint: string;
    good: string;
    goodTint: string;
    bad: string;
    badTint: string;
    gold: string;
  };
  font: {
    display: string;
    body: string;
    mono: string;
  };
  radii: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
    pill: string;
  };
  size: {
    base: string;
    padScreen: string;
  };
}

export const appTheme: AppTheme = {
  color: {
    bg: '#f6f3ec',
    bg2: '#eee9dc',
    surface: '#fffdf6',
    surface2: '#f9f5e9',
    ink: '#18170f',
    ink2: '#4a4538',
    ink3: '#8a8473',
    ink4: '#b5af9e',
    hair: 'rgba(24,23,15,0.08)',
    hair2: 'rgba(24,23,15,0.16)',
    accent: '#e25a2a',
    accentInk: '#fffdf6',
    accentTint: 'rgba(226,90,42,0.10)',
    good: '#3a6b3f',
    goodTint: 'rgba(58,107,63,0.10)',
    bad: '#9a3412',
    badTint: 'rgba(154,52,18,0.10)',
    gold: '#b48a2a',
  },
  font: {
    display: '"Instrument Serif", "Georgia", serif',
    body: '"Geist", -apple-system, system-ui, "Helvetica Neue", Arial, sans-serif',
    mono: '"JetBrains Mono", ui-monospace, "SFMono-Regular", monospace',
  },
  radii: {
    sm: '4px',
    md: '8px',
    lg: '14px',
    xl: '22px',
    pill: '999px',
  },
  size: {
    base: '14.5px',
    padScreen: '16px',
  },
};
