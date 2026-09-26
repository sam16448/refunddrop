import type { Outcome } from '@/rules';
import { C } from '@/theme';

/** Short label and colours for each verdict outcome. */
export const OUTCOME_CHIP: Record<Outcome, { label: string; color: string; bg: string }> = {
  likely: { label: 'Likely eligible', color: C.accent, bg: C.accentSoft },
  possible: { label: 'Possibly eligible', color: C.info, bg: C.infoSoft },
  refund_only: { label: 'Refund only', color: C.good, bg: C.goodSoft },
  not_eligible: { label: 'Not eligible', color: C.muted, bg: C.surfaceHi },
  not_covered: { label: 'Not covered', color: C.muted, bg: C.surfaceHi },
};
