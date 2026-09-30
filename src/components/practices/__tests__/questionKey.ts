/**
 * The question renderer's key (src/components/practices/questionKey.ts): it
 * changes from one question to the next and holds still within a question.
 * Also checks that PracticeContent uses it and nothing keys on the
 * `questionnid` the student API does not send.
 *
 * Plain script run by `tsx` (package.json `test:questionkey`).
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { questionRenderKey } from '../questionKey';

// Changes per question.
const keys = [1, 2, 3, 4, 5].map(questionRenderKey);
assert.equal(new Set(keys).size, keys.length, 'one distinct key per question');
assert.notEqual(questionRenderKey(1), questionRenderKey(2));

// Stable within a question: a retry or a popup re-render passes the same index.
assert.equal(questionRenderKey(2), questionRenderKey(2));

// The wiring: PracticeContent keys the renderer with it, and neither it nor
// the screens use the never-sent `questionnid` as a key.
const root = join(__dirname, '..', '..', '..');
const read = (p: string) => readFileSync(join(root, p), 'utf8');
assert.match(
  read('components/practices/PracticeContent.tsx'),
  /key=\{questionRenderKey\(currentQuestionIndex\)\}/,
  'PracticeContent keys the renderer on the question position',
);
for (const f of [
  'components/practices/PracticeContent.tsx',
  'screens/Practice/PracticeScreen.tsx',
  'screens/Quiz/QuizScreen.tsx',
]) {
  const code = read(f)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
  assert.doesNotMatch(code, /key=\{[^}]*questionnid/, `${f} keys on questionnid`);
}

console.log('questionKey: ok');
