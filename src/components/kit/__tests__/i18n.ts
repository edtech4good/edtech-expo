/**
 * Translation keys for the corporate question kit and the drag primitive:
 * every `kit.*` and `reorder.*` key exists in en.json and km.json, both have
 * exactly the same keys and the same {{placeholders}}, Khmer values are real
 * Khmer (not a copy of the English), every key the source code asks for
 * exists, and the English defaults built into reorder.ts / resultLogic.ts
 * match en.json word for word.
 *
 * Reading source for `t('...')` literals is safe here: it checks that each
 * key is present, it does not count anything.
 *
 * Plain script run by `tsx` (package.json `test:kit`).
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import en from '../../../locales/en.json';
import km from '../../../locales/km.json';
import { REORDER_EN } from '../../drag/reorder';
import { KIT_EN } from '../resultLogic';

type Tree = { [k: string]: string | Tree };

function flatten(tree: Tree, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(tree)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'string') out[key] = v;
    else Object.assign(out, flatten(v, key));
  }
  return out;
}

const pick = (flat: Record<string, string>) =>
  Object.fromEntries(Object.entries(flat).filter(([k]) => k.startsWith('kit.') || k.startsWith('reorder.')));

const enFlat = flatten(en as Tree);
const kmFlat = flatten(km as Tree);
const enKeys = pick(enFlat);
const kmKeys = pick(kmFlat);

// 1. Same keys in both locales.
const enNames = Object.keys(enKeys).sort();
const kmNames = Object.keys(kmKeys).sort();
assert.deepEqual(kmNames, enNames, 'kit.* and reorder.* keys differ between en.json and km.json');
assert.ok(enNames.length >= 40, `only ${enNames.length} keys found; did the tree move?`);
console.log('ok  en.json and km.json have the same', enNames.length, 'kit.* / reorder.* keys');

// 2. Same placeholders, non-empty, Khmer is Khmer.
const holes = (s: string) => (s.match(/\{\{\s*\w+\s*\}\}/g) ?? []).map(h => h.replace(/\s/g, '')).sort();
const KHMER = /[ក-៿]/;
for (const key of enNames) {
  assert.ok(enKeys[key].trim() !== '', `${key} is empty in en.json`);
  assert.ok(kmKeys[key].trim() !== '', `${key} is empty in km.json`);
  assert.deepEqual(holes(kmKeys[key]), holes(enKeys[key]), `${key}: placeholders differ`);
  assert.ok(KHMER.test(kmKeys[key]), `${key}: km.json value has no Khmer script: ${kmKeys[key]}`);
  assert.notEqual(kmKeys[key], enKeys[key], `${key}: km.json is a copy of the English`);
}
console.log('ok  placeholders match and every Khmer string is Khmer');

// 3. Keys the source asks for exist.
const roots = [path.join(__dirname, '..'), path.join(__dirname, '../../drag'), path.join(__dirname, '../../../screens/Dev')];
const files: string[] = [];
const walk = (dir: string) => {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) {
      if (f !== '__tests__') walk(p);
    } else if (/\.(ts|tsx)$/.test(f)) files.push(p);
  }
};
roots.forEach(walk);
const used = new Set<string>();
for (const file of files) {
  const src = fs.readFileSync(file, 'utf8');
  for (const m of src.matchAll(/['"`]((?:kit|reorder)\.[A-Za-z0-9_.]+)['"`]/g)) used.add(m[1]);
}
// The move actions are looked up as `reorder.${action}`.
['moveEarlier', 'moveLater', 'moveToStart', 'moveToEnd'].forEach(a => used.add(`reorder.${a}`));
assert.ok(used.size >= 30, `found only ${used.size} keys in source`);
for (const key of used) {
  assert.ok(key in enKeys, `source uses ${key}, missing from en.json`);
  assert.ok(key in kmKeys, `source uses ${key}, missing from km.json`);
}
console.log('ok  all', used.size, 'keys used in source exist in both locales');

// 4. The English defaults compiled into the logic match en.json.
for (const [key, value] of Object.entries({ ...REORDER_EN, ...KIT_EN })) {
  assert.equal(enKeys[key], value, `${key}: default text differs from en.json`);
}
console.log('ok  built-in English defaults equal en.json');

// 5. The existing footer words the strip reuses are there in both.
for (const k of ['screen.practice.correctButton', 'screen.practice.showAnswerButton', 'screen.practice.incorrectButton']) {
  assert.ok(enFlat[k] && kmFlat[k], `${k} missing`);
}
console.log('ok  footer button keys present');

console.log('\nall i18n checks passed');
