/**
 * Parity check between the kids and corporate theme token modules.
 *
 * This is a plain script run by `tsx` (see package.json's `test:themes`
 * script) — NOT a jest test. It intentionally imports only the two pure
 * token modules so it can never accidentally pull in react-native: if
 * either module gains a react-native import, this script will fail to
 * run in plain node.
 *
 * It walks both token trees, diffing key paths (both directions) and
 * flagging any leaf that is empty (empty string, null, undefined, or an
 * empty array).
 */
import kidsTokens from '../tokens/kids';
import corporateTokens from '../tokens/corporate';
import { ThemeTokens, TypeScaleRole } from '../tokens/types';

type Json = Record<string, unknown>;

function isPlainObject(value: unknown): value is Json {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  );
}

/** Collects every leaf key path in `obj`, treating arrays as indexed maps
 * (so `cards.0.light`, `cards.1.light`, etc. — this makes array length
 * mismatches show up as missing/extra paths too). */
function collectLeafPaths(value: unknown, prefix: string, out: Map<string, unknown>) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      collectLeafPaths(item, prefix ? `${prefix}.${index}` : `${index}`, out);
    });
    return;
  }

  if (isPlainObject(value)) {
    const keys = Object.keys(value);
    for (const key of keys) {
      const path = prefix ? `${prefix}.${key}` : key;
      collectLeafPaths(value[key], path, out);
    }
    return;
  }

  out.set(prefix, value);
}

function isEmptyLeaf(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

const TYPE_SCALE_ROLES: TypeScaleRole[] = [
  'screenTitle',
  'cardTitle',
  'button',
  'body',
  'caption',
  'eyebrow',
];

/**
 * Design v2.1 "Khmer type scale" assertions, run against every theme token
 * module (kids and corporate both carry a full typeScale — see
 * themeParity's own key-set check above). Catches the two ways this scale
 * has actually broken before: a Khmer role sized below the 13px floor, and
 * a Khmer line height that doesn't clear the spec's 1.5x-1.9x leading
 * range (too tight clips descenders/combining marks; too loose looks like
 * a bug). Also checks tablet promotion holds for both locales.
 */
function checkTypeScale(tokens: ThemeTokens, errors: string[]) {
  const { typeScale, name } = tokens;

  for (const role of TYPE_SCALE_ROLES) {
    for (const formFactor of ['phone', 'tablet'] as const) {
      const spec = typeScale.km[formFactor][role];
      const label = `${name}.typeScale.km.${formFactor}.${role}`;

      if (spec.fontSize < 13) {
        errors.push(
          `${label}: fontSize ${spec.fontSize} is below the Khmer 13px floor`,
        );
      }

      const ratio = spec.lineHeight / spec.fontSize;
      if (ratio < 1.5 || ratio > 1.9) {
        errors.push(
          `${label}: lineHeight/fontSize ratio ${ratio.toFixed(2)} (${spec.lineHeight}/${spec.fontSize}) is outside the Khmer 1.5x-1.9x range`,
        );
      }
    }
  }

  for (const language of ['en', 'km'] as const) {
    for (const role of ['screenTitle', 'cardTitle'] as const) {
      const phoneSize = typeScale[language].phone[role].fontSize;
      const tabletSize = typeScale[language].tablet[role].fontSize;
      if (tabletSize < phoneSize) {
        errors.push(
          `${name}.typeScale.${language}.tablet.${role}: fontSize ${tabletSize} is smaller than phone's ${phoneSize} — tablet should promote, never shrink`,
        );
      }
    }
  }
}

function main() {
  const kidsLeaves = new Map<string, unknown>();
  const corporateLeaves = new Map<string, unknown>();

  collectLeafPaths(kidsTokens, '', kidsLeaves);
  collectLeafPaths(corporateTokens, '', corporateLeaves);

  const kidsKeys = new Set(kidsLeaves.keys());
  const corporateKeys = new Set(corporateLeaves.keys());

  const missingInCorporate = [...kidsKeys].filter(k => !corporateKeys.has(k));
  const missingInKids = [...corporateKeys].filter(k => !kidsKeys.has(k));

  const emptyLeaves: string[] = [];
  for (const [path, value] of kidsLeaves) {
    if (isEmptyLeaf(value)) emptyLeaves.push(`kids.${path}`);
  }
  for (const [path, value] of corporateLeaves) {
    if (isEmptyLeaf(value)) emptyLeaves.push(`corporate.${path}`);
  }

  let ok = true;

  if (missingInCorporate.length > 0) {
    ok = false;
    console.error(
      `\nKeys present in kids but missing in corporate (${missingInCorporate.length}):`,
    );
    missingInCorporate.sort().forEach(k => console.error(`  - ${k}`));
  }

  if (missingInKids.length > 0) {
    ok = false;
    console.error(
      `\nKeys present in corporate but missing in kids (${missingInKids.length}):`,
    );
    missingInKids.sort().forEach(k => console.error(`  - ${k}`));
  }

  if (emptyLeaves.length > 0) {
    ok = false;
    console.error(`\nEmpty leaf values found (${emptyLeaves.length}):`);
    emptyLeaves.sort().forEach(k => console.error(`  - ${k}`));
  }

  const typeScaleErrors: string[] = [];
  checkTypeScale(kidsTokens, typeScaleErrors);
  checkTypeScale(corporateTokens, typeScaleErrors);

  if (typeScaleErrors.length > 0) {
    ok = false;
    console.error(
      `\nKhmer type scale (design v2.1) violations (${typeScaleErrors.length}):`,
    );
    typeScaleErrors.sort().forEach(e => console.error(`  - ${e}`));
  }

  if (!ok) {
    console.error('\nTheme parity check FAILED.\n');
    process.exit(1);
  }

  console.log(
    `OK: kids and corporate theme tokens have matching key sets, ` +
      `${kidsKeys.size} leaf keys each, no empty values, and the Khmer ` +
      `type scale (design v2.1) holds its floor/leading/tablet-promotion ` +
      `invariants.`,
  );
  process.exit(0);
}

main();
