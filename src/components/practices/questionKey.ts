/**
 * The React key a question renderer is mounted with, so each question gets a
 * fresh renderer: its answers, attempt count and shuffled options start over
 * instead of carrying into the next question.
 *
 * It is the question's position, not an id from the question: the student API
 * does not send `questionnid`, so keying on it left the key undefined and the
 * same renderer instance was reused for every question. The position always
 * changes between questions and never changes within one (a retry, or the
 * result popup opening, leaves it alone).
 */
export function questionRenderKey(currentQuestionIndex: number): string {
  return `question-${currentQuestionIndex}`;
}
