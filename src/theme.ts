/**
 * RefundDrop design tokens: electric cobalt blue, gold for money, crisp white cards on an ice background,
 * Plus Jakarta Sans throughout.
 */
export const C = {
  // Canvas and cards
  bg: '#F4F7FC',
  surface: '#FFFFFF',
  surfaceHi: '#EBEFF6',
  line: '#DFE5EF',
  // Ink
  text: '#092570',
  muted: '#4A5578',
  faint: '#8A93AD',
  // Brand blue (buttons, active states, headers)
  accent: '#1351E7',
  accent2: '#0B3BC1',
  accentInk: '#FFFFFF',
  accentSoft: 'rgba(19,81,231,0.08)',
  blue: '#1351E7',
  blueDeep: '#0B3BC1',
  onBlue: '#FFFFFF',
  onBlueMuted: 'rgba(255,255,255,0.78)',
  blueGlass: 'rgba(255,255,255,0.16)',
  // Gold (money, rewards, the Scan button)
  gold: '#FFD028',
  goldDeep: '#DFB01A',
  goldInk: '#231A00',
  goldSoft: '#FFF3C4',
  // Status
  good: '#0E9F6E',
  goodSoft: 'rgba(16,185,129,0.12)',
  bad: '#DC2626',
  badSoft: 'rgba(239,68,68,0.10)',
  info: '#2E438E',
  infoSoft: '#E8EDFF',
  // Letters
  paper: '#FFFFFF',
  paperInk: '#1C1A16',
} as const;

export const F = {
  display: 'PlusJakartaSans_800ExtraBold',
  displayMedium: 'PlusJakartaSans_600SemiBold',
  body: 'PlusJakartaSans_500Medium',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  black: 'PlusJakartaSans_800ExtraBold',
} as const;

export const R = { sm: 12, md: 16, lg: 24, xl: 28 } as const;

export const S = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

/** Soft navy glow under white cards. */
export const SHADOW = {
  shadowColor: '#092570',
  shadowOpacity: 0.1,
  shadowRadius: 18,
  shadowOffset: { width: 0, height: 8 },
  elevation: 3,
} as const;

/** Warm glow under gold cards. */
export const GOLD_GLOW = {
  shadowColor: '#DFB01A',
  shadowOpacity: 0.35,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 10 },
  elevation: 5,
} as const;

export const T = {
  hero: { fontFamily: F.display, fontSize: 40, letterSpacing: -1.2 },
  h1: { fontFamily: F.display, fontSize: 28, letterSpacing: -0.6, lineHeight: 34 },
  h2: { fontFamily: F.bold, fontSize: 20, lineHeight: 26, letterSpacing: -0.3 },
  body: { fontFamily: F.body, fontSize: 15, lineHeight: 22 },
  bodyStrong: { fontFamily: F.semibold, fontSize: 15, lineHeight: 22 },
  small: { fontFamily: F.body, fontSize: 13, lineHeight: 19 },
  label: { fontFamily: F.black, fontSize: 11, letterSpacing: 0.9, textTransform: 'uppercase' as const },
};
