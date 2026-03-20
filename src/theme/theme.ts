export interface AppTheme {
  color: {
    bg: string;
    surface: string;
    surface2: string;
    border: string;
    border2: string;
    text: string;
    muted: string;
    muted2: string;
    gold: string;
    goldDim: string;
    green: string;
    greenDim: string;
    red: string;
    redDim: string;
    blue: string;
    blueDim: string;
    purple: string;
    purpleDim: string;
    podium2: string;
    podium2Border: string;
    podium3: string;
    podium3Border: string;
  };
  font: {
    display: string;
    body: string;
  };
  radii: {
    sm: string;
    md: string;
    lg: string;
    pill: string;
  };
}

export const appTheme: AppTheme = {
  color: {
    bg: '#0E0E0E',
    surface: '#1A1A1A',
    surface2: '#222222',
    border: 'rgba(255,255,255,0.07)',
    border2: 'rgba(255,255,255,0.13)',
    text: '#F0EBE1',
    muted: '#6B6560',
    muted2: '#9A948E',
    gold: '#E8A020',
    goldDim: 'rgba(232,160,32,0.12)',
    green: '#4ADE80',
    greenDim: 'rgba(74,222,128,0.12)',
    red: '#F87171',
    redDim: 'rgba(248,113,113,0.12)',
    blue: '#60A5FA',
    blueDim: 'rgba(96,165,250,0.12)',
    purple: '#C084FC',
    purpleDim: 'rgba(192,132,252,0.12)',
    podium2: 'rgba(148,163,184,0.05)',
    podium2Border: 'rgba(148,163,184,0.2)',
    podium3: 'rgba(180,83,9,0.05)',
    podium3Border: 'rgba(180,83,9,0.2)',
  },
  font: {
    display: "'Unbounded', sans-serif",
    body: "'DM Sans', sans-serif",
  },
  radii: {
    sm: '6px',
    md: '8px',
    lg: '14px',
    pill: '999px',
  },
};
