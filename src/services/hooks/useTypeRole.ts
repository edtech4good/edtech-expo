import { useMemo } from 'react';
import { useTheme } from 'styled-components/native';

import { useAppSelector } from '@/redux';
import { getSelectedLanguage } from '@/redux/slices';
import { FontRole } from '@/constants';
import { TypeScaleRole } from '@/themes/tokens/types';

import useFont from './useFont';
import useNavShell from './useNavShell';

/** Maps a type-scale role to the font-family role useFont/theme.fonts key
 * off (display/body/mono). screenTitle and cardTitle use the display face;
 * button/body/caption use body; eyebrow uses mono — for Khmer these all
 * resolve to the same NotoSansKhmer family (see tokens/corporate.ts). */
const FAMILY_ROLE_BY_TYPE_ROLE: Record<TypeScaleRole, FontRole> = {
  screenTitle: 'display',
  cardTitle: 'display',
  button: 'body',
  body: 'body',
  caption: 'body',
  eyebrow: 'mono',
};

export interface TypeRoleResult {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
}

/**
 * Locale- (and, for corporate at tablet width, form-factor-) aware type
 * scale per the v2.1 "Khmer type scale" handoff. Reads
 * `theme.typeScale[language][phone|tablet][role]` and resolves the concrete
 * font family via useFont, so callers get one object with everything a
 * <Text> needs: `{ fontFamily, fontSize, lineHeight }`.
 *
 * Tablet promotion reuses useNavShell's `isRail` (corporate at
 * `theme.breakpoints.DEFAULT_MIN_WIDTH` or wider) — the same signal the app
 * already uses to distinguish phone vs. tablet layout elsewhere. Non-rail
 * (kids, or corporate below that width) always resolves the phone scale.
 */
export default function useTypeRole(role: TypeScaleRole): TypeRoleResult {
  const theme = useTheme();
  const selectedLanguage = useAppSelector(getSelectedLanguage);
  const { isRail } = useNavShell();

  const formFactor: 'phone' | 'tablet' = isRail ? 'tablet' : 'phone';
  // Dropped the `as 'en' | 'km'` cast that used to sit here: it wasn't
  // narrowing anything useful (selectedLanguage indexes theme.typeScale
  // the same way with or without it — the pre-existing implicit-any this
  // surfaces, TS7053, matches the same pattern already in useFont.ts and
  // the legacy text components' language-keyed font lookups, and is on
  // the tsc-guard baseline). The real safety net is this `?? en` runtime
  // fallback: it covers any language theme.typeScale doesn't have an
  // entry for (e.g. a future locale added to redux before its scale is)
  // by falling back to English instead of indexing into undefined.
  const languageScale = theme.typeScale[selectedLanguage] ?? theme.typeScale.en;
  const spec = languageScale[formFactor][role];

  const fontFamily = useFont(spec.weight, FAMILY_ROLE_BY_TYPE_ROLE[role]);

  return useMemo(
    () => ({
      fontFamily,
      fontSize: spec.fontSize,
      lineHeight: spec.lineHeight,
    }),
    [fontFamily, spec.fontSize, spec.lineHeight],
  );
}
