/** RefundDrop design tokens: deep navy, amber "money" accent, Space Grotesk for numbers and codes, Inter for text. */
export const C = {
  bg: '#0A0F1C',
  bgGlow: '#1B2440',
  surface: '#121A2B',
  surfaceHi: '#1A2438',
  line: '#26324A',
  text: '#F5F7FB',
  muted: '#9AA6BD',
  faint: '#5D6A84',
  accent: '#FFB020',
  accent2: '#FF8A00',
  accentInk: '#1B1203',
  accentSoft: 'rgba(255,176,32,0.12)',
  good: '#34D399',
  goodSoft: 'rgba(52,211,153,0.12)',
  bad: '#F87171',
  badSoft: 'rgba(248,113,113,0.12)',
  info: '#7DB3FF',
  infoSoft: 'rgba(125,179,255,0.12)',
  paper: '#F7F4EC',
  paperInk: '#1C1A16',
} as const;

export const F = {
  display: 'SpaceGrotesk_700Bold',
  displayMedium: 'SpaceGrotesk_500Medium',
  body: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  black: 'Inter_800ExtraBold',
} as const;

export const R = { sm: 10, md: 14, lg: 20, xl: 28 } as const;

export const S = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const T = {
  hero: { fontFamily: F.display, fontSize: 44, letterSpacing: -1 },
  h1: { fontFamily: F.display, fontSize: 30, letterSpacing: -0.6, lineHeight: 36 },
  h2: { fontFamily: F.bold, fontSize: 20, lineHeight: 26 },
  body: { fontFamily: F.body, fontSize: 15, lineHeight: 22 },
  bodyStrong: { fontFamily: F.semibold, fontSize: 15, lineHeight: 22 },
  small: { fontFamily: F.body, fontSize: 13, lineHeight: 19 },
  label: { fontFamily: F.bold, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase' as const },
};
