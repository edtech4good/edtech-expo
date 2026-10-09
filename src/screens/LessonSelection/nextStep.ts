/**
 * The lesson's "next step": the first activity, in learnings -> practices ->
 * quizzes order, that is not done yet and that this build can open. An item
 * of a type the build cannot render is never done (it posts no progress), so
 * without the `openable` filter it would sit as the "next step" for ever and
 * the footer button would try to open it.
 */
export function pickNextStep<T extends { id: string }>(
  steps: readonly T[],
  statusFor: (id: string) => 'done' | 'inProgress' | 'todo',
  isOpenable: (step: T) => boolean,
): T | undefined {
  return steps.find(step => isOpenable(step) && statusFor(step.id) !== 'done');
}
