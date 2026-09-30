// Pure rules for the inline result strip (no react-native imports).
import { englishTranslate, Translate } from '../drag/reorder';

export type ResultKind = 'correct' | 'incorrect';

export interface ResultSummaryInput {
  kind: ResultKind;
  /** How many items are in the right place. Omit when the type has no parts (multiple choice). */
  correctCount?: number;
  /** How many items were graded. */
  total?: number;
}

/**
 * The strip's summary line, e.g. "4 of 6 are in the right place." or
 * "All 6 are in the right place." A single-part question gets a sentence
 * without counts ("Your answer is right."). Keys are `kit.result.*`.
 */
export function resultSummary(input: ResultSummaryInput, t: Translate = kitEnglish): string {
  const { kind, correctCount, total } = input;
  const hasParts = typeof total === 'number' && total > 1;
  if (kind === 'correct') {
    return hasParts
      ? t('kit.result.summaryAll', { total })
      : t('kit.result.summarySingleRight');
  }
  if (hasParts && typeof correctCount === 'number') {
    const n = Math.max(0, Math.min(total as number, Math.floor(correctCount)));
    return t('kit.result.summaryPartial', { correct: n, total });
  }
  return t('kit.result.summaryWrong');
}

/** "Correct" / "Not quite". */
export function resultTitle(kind: ResultKind, t: Translate = kitEnglish): string {
  return t(kind === 'correct' ? 'kit.result.correctTitle' : 'kit.result.incorrectTitle');
}

/** What a screen reader hears when the strip appears: title, summary, read-back. */
export function resultAnnouncement(
  input: ResultSummaryInput & { readBack?: string },
  t: Translate = kitEnglish,
): string {
  const base = t('kit.result.announce', {
    title: resultTitle(input.kind, t),
    summary: resultSummary(input, t),
  });
  return input.readBack ? `${base} ${t('kit.result.readBack', { text: input.readBack })}` : base;
}

export type FooterActionId = 'next' | 'showAnswer' | 'tryAgain';

export interface FooterAction {
  id: FooterActionId;
  /** Existing keys: the corporate footer keeps today's words. */
  labelKey: string;
  emphasis: 'primary' | 'secondary';
}

/**
 * The footer actions a result drives: "Next" after a correct answer;
 * "Show answer" and "Try again" after an incorrect one. Show answer drops
 * out once the answer is on screen. Quizzes pass `canRetry: false`.
 */
export function footerActions(
  kind: ResultKind,
  opts: { canShowAnswer?: boolean; canRetry?: boolean } = {},
): FooterAction[] {
  const { canShowAnswer = true, canRetry = true } = opts;
  if (kind === 'correct') {
    return [{ id: 'next', labelKey: 'screen.practice.correctButton', emphasis: 'primary' }];
  }
  const out: FooterAction[] = [];
  if (canShowAnswer) {
    out.push({ id: 'showAnswer', labelKey: 'screen.practice.showAnswerButton', emphasis: 'secondary' });
  }
  if (canRetry) {
    out.push({ id: 'tryAgain', labelKey: 'screen.practice.incorrectButton', emphasis: 'primary' });
  }
  return out;
}

// English defaults for the kit keys, so the logic runs (and is tested)
// without i18next. A test keeps these equal to en.json.
export const KIT_EN: Record<string, string> = {
  'kit.result.correctTitle': 'Correct',
  'kit.result.incorrectTitle': 'Not quite',
  'kit.result.summaryAll': 'All {{total}} are in the right place.',
  'kit.result.summaryPartial': '{{correct}} of {{total}} are in the right place.',
  'kit.result.summarySingleRight': 'Your answer is right.',
  'kit.result.summaryWrong': 'That is not the right answer.',
  'kit.result.readBack': 'Read back: {{text}}',
  'kit.result.announce': '{{title}}. {{summary}}',
};

const kitEnglish: Translate = (key, options) => {
  const template = KIT_EN[key];
  return template === undefined
    ? englishTranslate(key, options)
    : template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, n: string) =>
        options && n in options ? String(options[n]) : '',
      );
};
