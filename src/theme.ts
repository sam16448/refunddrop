/** Single dark theme: deep navy with an amber "money" accent. */
export const C = {
  bg: '#0B1220',
  surface: '#131C2E',
  surfaceHi: '#1A2640',
  line: '#22304A',
  text: '#F4F6FB',
  muted: '#93A1BA',
  faint: '#5E6C86',
  accent: '#FFB020',
  accentInk: '#1B1203',
  good: '#35D07F',
  bad: '#FF6B6B',
  info: '#8AB4FF',
} as const;

export const R = { sm: 10, md: 14, lg: 20, xl: 28 } as const;

export const S = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const T = {
  hero: { fontSize: 44, fontWeight: '800' as const, letterSpacing: -1 },
  h1: { fontSize: 28, fontWeight: '800' as const, letterSpacing: -0.5 },
  h2: { fontSize: 20, fontWeight: '700' as const },
  body: { fontSize: 15, lineHeight: 21 },
  small: { fontSize: 13, lineHeight: 18 },
  label: { fontSize: 12, fontWeight: '700' as const, letterSpacing: 1.2, textTransform: 'uppercase' as const },
};
