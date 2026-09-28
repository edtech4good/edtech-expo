import { useMemo } from 'react';
import { useTheme } from 'styled-components/native';

import { useAppSelector } from '@/redux';
import { getSelectedLanguage } from '@/redux/slices';
import { FontRole } from '@/constants';
import { ThemeTypeScale, TypeScaleRole } from '@/themes/tokens/types';

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
 * Tablet promotion reuses useNavShell's `hasPermanentNav` (corporate at
 * `theme.breakpoints.DEFAULT_MIN_WIDTH` or wider — the rail, or the desktop
 * sidebar, which keeps the tablet scale) — the same signal the app already
 * uses to distinguish phone vs. tablet layout elsewhere. Everything else
 * (kids, or corporate below that width) resolves the phone scale.
 */
export default function useTypeRole(role: TypeScaleRole): TypeRoleResult {
  const theme = useTheme();
  const selectedLanguage = useAppSelector(getSelectedLanguage);
  const { hasPermanentNav } = useNavShell();

  const formFactor: 'phone' | 'tablet' = hasPermanentNav ? 'tablet' : 'phone';
  // `selectedLanguage` comes back typed `any` (RootState is inferred from a
  // reducer typed `state: any`), so without an explicit narrowing step here
  // `theme.typeScale[selectedLanguage]` indexes with `any` and TS can't catch
  // a bad key — that's what surfaces as TS7053 once the old cast is removed.
  // Narrowing to the known locales keeps the index type-safe *and* gives any
  // locale that isn't 'km' (including a future one redux knows about before
  // theme.typeScale does) an English fallback.
  const lang: keyof ThemeTypeScale = selectedLanguage === 'km' ? 'km' : 'en';
  const languageScale = theme.typeScale[lang];
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
