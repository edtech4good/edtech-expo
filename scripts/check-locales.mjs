#!/usr/bin/env node
// Locale guard (CI step "Locale files"): fails when a locale file
//   1. has a duplicate key in any JSON object, at any depth,
//   2. has a different set of keys from en.json, or
//   3. has a string whose {{placeholders}} differ from en.json's.
//
// Why 1 matters: several PRs each append their own top-level block (for
// example "corporate") to en.json and km.json. Resolving the merge conflict
// by keeping both sides leaves the key twice, and JSON.parse (and so the
// app) silently keeps only the last one: every string in the first block
// disappears with no error. JSON.parse cannot see this, so the files are
// read by the small tokenizer below, which records every key of every
// object as it goes.
//
// Usage: node scripts/check-locales.mjs [file.json ...]
// With no arguments it checks src/locales/*.json against src/locales/en.json.
// With arguments it checks those files; the first one named en.json (or
// the first file) is the reference for 2 and 3.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Parses JSON text into plain values, and calls onDuplicate(path, key,
 * line) for every key that appears twice in one object. Throws on invalid
 * JSON, with the line.
 */
export function parseStrict(text, onDuplicate) {
  let i = 0;
  const lineAt = pos => text.slice(0, pos).split('\n').length;
  const fail = msg => {
    throw new Error(`${msg} at line ${lineAt(i)}`);
  };
  const ws = () => {
    while (i < text.length && /[ \t\n\r﻿]/.test(text[i])) i++;
  };
  const str = () => {
    if (text[i] !== '"') fail('expected a string');
    const start = i;
    i++;
    while (i < text.length && text[i] !== '"') {
      if (text[i] === '\\') i++;
      i++;
    }
    if (i >= text.length) fail('unterminated string');
    i++;
    return JSON.parse(text.slice(start, i));
  };
  const value = where => {
    ws();
    const c = text[i];
    if (c === '{') return object(where);
    if (c === '[') return array(where);
    if (c === '"') return str();
    const m = /^(-?\d+(\.\d+)?([eE][+-]?\d+)?|true|false|null)/.exec(text.slice(i));
    if (!m) fail('unexpected character');
    i += m[0].length;
    return JSON.parse(m[0]);
  };
  const object = where => {
    i++; // {
    const out = {};
    const seen = new Set();
    ws();
    if (text[i] === '}') {
      i++;
      return out;
    }
    for (;;) {
      ws();
      const keyAt = i;
      const key = str();
      if (seen.has(key)) onDuplicate(where, key, lineAt(keyAt));
      seen.add(key);
      ws();
      if (text[i] !== ':') fail('expected ":"');
      i++;
      out[key] = value([...where, key]);
      ws();
      if (text[i] === ',') {
        i++;
        continue;
      }
      if (text[i] === '}') {
        i++;
        return out;
      }
      fail('expected "," or "}"');
    }
  };
  const array = where => {
    i++; // [
    const out = [];
    ws();
    if (text[i] === ']') {
      i++;
      return out;
    }
    for (;;) {
      out.push(value([...where, String(out.length)]));
      ws();
      if (text[i] === ',') {
        i++;
        continue;
      }
      if (text[i] === ']') {
        i++;
        return out;
      }
      fail('expected "," or "]"');
    }
  };
  const result = value([]);
  ws();
  if (i !== text.length) fail('unexpected text after the JSON value');
  return result;
}

/** Leaf paths to values: { "a.b": "text", ... }. Objects only; arrays are leaves. */
export function flatten(tree, prefix = '', out = {}) {
  for (const [k, v] of Object.entries(tree)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, key, out);
    else out[key] = v;
  }
  return out;
}

// i18next plural forms. Languages have different numbers of them (Khmer
// has one, so km.json has no "_plural"), so a plural form is not required
// in the other file when the other file has the base key.
const PLURAL = /_(plural|zero|one|two|few|many|other|\d+)$/;
const pluralBase = k => k.replace(PLURAL, '');
const pluralCovered = (k, other) => PLURAL.test(k) && pluralBase(k) in other;

const holes = s =>
  typeof s === 'string'
    ? (s.match(/\{\{\s*[\w.]+\s*\}\}/g) ?? []).map(h => h.replace(/\s/g, '')).sort()
    : [];

/** Every problem in a set of locale files, as strings. Empty means clean. */
export function checkLocales(files) {
  const problems = [];
  const parsed = {};
  for (const file of files) {
    const name = path.relative(root, file) || file;
    try {
      parsed[file] = parseStrict(fs.readFileSync(file, 'utf8'), (where, key, line) => {
        const at = where.length ? where.join('.') : '(top level)';
        problems.push(`${name}:${line}: duplicate key "${key}" in ${at}`);
      });
    } catch (e) {
      problems.push(`${name}: not valid JSON: ${e.message}`);
    }
  }
  const ref = files.find(f => path.basename(f) === 'en.json') ?? files[0];
  if (!ref || !parsed[ref]) return problems;
  const refFlat = flatten(parsed[ref]);
  const refName = path.relative(root, ref) || ref;
  for (const file of files) {
    if (file === ref || !parsed[file]) continue;
    const name = path.relative(root, file) || file;
    const flat = flatten(parsed[file]);
    for (const k of Object.keys(refFlat))
      if (!(k in flat) && !pluralCovered(k, flat))
        problems.push(`${name}: missing key "${k}" (in ${refName})`);
    for (const k of Object.keys(flat))
      if (!(k in refFlat) && !pluralCovered(k, refFlat))
        problems.push(`${name}: extra key "${k}" (not in ${refName})`);
    // Placeholders: each key against the same key, or a plural form against
    // the other file's base key.
    for (const k of new Set([...Object.keys(refFlat), ...Object.keys(flat)])) {
      const refKey = k in refFlat ? k : pluralBase(k);
      const key = k in flat ? k : pluralBase(k);
      if (!(refKey in refFlat) || !(key in flat)) continue;
      const a = holes(refFlat[refKey]).join(' ');
      const b = holes(flat[key]).join(' ');
      if (a !== b)
        problems.push(`${name}: "${k}" has placeholders [${b}], ${refName} has [${a}]`);
    }
  }
  return problems;
}

/**
 * The guard's own proof (`--self-test`, run first by `yarn test:locales`):
 * each broken pair below must be reported, and a clean pair must not. If a
 * change stops the guard seeing duplicates, this fails CI.
 */
function selfTest() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'check-locales-'));
  const write = (name, text) => {
    const f = path.join(dir, name);
    fs.writeFileSync(f, text);
    return f;
  };
  const cases = [
    {
      name: 'a merge that kept both "corporate" blocks',
      en: '{"a": "x", "corporate": {"m": "1"}, "corporate": {"f": "2"}}',
      km: '{"a": "ក", "corporate": {"f": "២"}}',
      expect: /duplicate key "corporate" in \(top level\)/,
    },
    {
      name: 'a duplicate three levels down, in km only',
      en: '{"a": {"b": {"c": "x", "d": "y"}}}',
      km: '{"a": {"b": {"c": "ក", "d": "ខ", "c": "គ"}}}',
      expect: /km\.json:1: duplicate key "c" in a\.b/,
    },
    {
      name: 'a key missing from km',
      en: '{"a": "x", "b": "y"}',
      km: '{"a": "ក"}',
      expect: /missing key "b"/,
    },
    {
      name: 'a key only in km',
      en: '{"a": "x"}',
      km: '{"a": "ក", "z": "ខ"}',
      expect: /extra key "z"/,
    },
    {
      name: 'a placeholder renamed in km',
      en: '{"a": "{{count}} of {{total}}"}',
      km: '{"a": "{{count}} ក្នុង {{all}}"}',
      expect: /"a" has placeholders/,
    },
  ];
  let failed = 0;
  cases.forEach((c, i) => {
    const d = path.join(dir, String(i));
    fs.mkdirSync(d);
    const problems = checkLocales([
      write(`${i}/en.json`, c.en),
      write(`${i}/km.json`, c.km),
    ]);
    const ok = problems.some(p => c.expect.test(p));
    if (!ok) failed++;
    console.log(`${ok ? 'ok  ' : 'FAIL'} self-test: ${c.name} is reported`);
  });
  // Clean, with an English-only plural form (Khmer has one form).
  fs.mkdirSync(path.join(dir, 'clean'));
  const clean = checkLocales([
    write('clean/en.json', '{"n": "{{count}} item", "n_plural": "{{count}} items", "o": {"p": "x"}}'),
    write('clean/km.json', '{"n": "{{count}} ធាតុ", "o": {"p": "ក"}}'),
  ]);
  if (clean.length) failed++;
  console.log(`${clean.length ? 'FAIL' : 'ok  '} self-test: a clean pair (with an English-only plural) passes`);
  fs.rmSync(dir, { recursive: true, force: true });
  if (failed) process.exit(1);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain && process.argv[2] === '--self-test') selfTest();
else if (isMain) {
  const args = process.argv.slice(2);
  const dir = path.join(root, 'src/locales');
  const files = args.length
    ? args.map(f => path.resolve(f))
    : fs
        .readdirSync(dir)
        .filter(f => f.endsWith('.json'))
        .sort()
        .map(f => path.join(dir, f));
  const problems = checkLocales(files);
  if (problems.length) {
    console.error(`check-locales: ${problems.length} problem(s)`);
    for (const p of problems) console.error(`  ${p}`);
    process.exit(1);
  }
  console.log(
    `check-locales: ok (${files.map(f => path.basename(f)).join(', ')}: no duplicate keys, same keys, same placeholders)`,
  );
}
