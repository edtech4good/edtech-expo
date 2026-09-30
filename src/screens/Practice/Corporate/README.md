# Corporate question renderers

Corporate-theme schools get these renderers for templates 1 to 8. Kids-theme
schools keep today's renderers and the `ResultPopUp`, unchanged. The design is
`docs/design/corporate-question-types` in the workspace repo.

## Files

| File | Templates | State |
|---|---|---|
| `MCQText.tsx` | 1, 3 (multiple choice, text) | **Done**: the shell's reference implementation (`McqTextBody.tsx`, `mcqTextLogic.ts`) |
| `MCQImage.tsx` | 2, 4 (multiple choice, pictures) | Stub (step 6) |
| `TextOrdering.tsx` | 5 (word ordering) | Stub (step 2) |
| `ImageOrdering.tsx` | 6 (picture ordering) | Stub (step 3) |
| `Matching.tsx` | 7 (matching) | Stub (step 4) |
| `FillBlank.tsx` | 8 (fill in the blank) | Stub (step 5) |
| `CorporateQuestionShell.tsx` | all | The shared frame. Do not edit in steps 2 to 6. |
| `shellLogic.ts` | all | The footer and submit rules (pure). Do not edit in steps 2 to 6. |
| `registry.tsx`, `templateRegistry.ts` | all | Template id and theme to renderer. Do not edit in steps 2 to 6. |
| `types.ts`, `useReportAnswer.ts` | all | The body contract, below. |

A stub renders today's renderer unchanged, with its own footer; the screen
shows the `ResultPopUp` for it. Step 6 is only the picture half of multiple
choice: the text half is done here.

## How to build your step

Replace **only your file** with the shell and a body:

```tsx
// TextOrdering.tsx
export default forwardRef<PracticeHandler, PracticeProps>(
  function CorporateTextOrdering(props, ref) {
    return <CorporateQuestionShell ref={ref} {...props} Body={WordOrderingBody} />;
  },
);
```

Put the body, its pure logic and its tests in new files next to it (for
example `WordOrderingBody.tsx`, `wordOrderingLogic.ts`,
`__tests__/wordOrdering.ts`, and a `test:*` script with a CI step). Do not edit
the registry, the shell, `shellLogic.ts`, `PracticeContent` or the screens: that
is what lets steps 2 to 6 merge in any order without conflicts. If the contract
is missing something you need, say so in your PR instead of changing it.

## The body contract

The shell renders the column, the question card (heading and Listen pill), the
result strip and the footer. The body renders the type's own interaction and
tells the shell two things: whether Submit is enabled, and how to grade.

Props the body receives (`QuestionBodyProps` in `types.ts`):

| Prop | Meaning |
|---|---|
| `question` | Today's `Question` (`questionobject.questionoptions`, and so on). |
| `mode` | `'practice'` or `'quiz'`. |
| `tries` | Today's attempt counter, from 1. It goes up on Retry and Try again. Shuffle per attempt on it, as today's renderers do. |
| `resetKey` | Goes up when the answer must be cleared (Retry, Try again). Clear your state when it changes. |
| `resultState` | `'answering'`, `'correct'`, `'incorrect'` or `'revealed'` (after Show answer). |
| `disabled` | True once submitted or revealed. Take no input. |
| `marks` | After submit, the `perItem` marks from your `evaluate()`: show a ✓ or ✕ on each item. Otherwise null. |
| `showAnswer` | True after Show answer: render the correct answer. |
| `report` | Call it through `useReportAnswer(report, ready, evaluate)` on every render. |

What the body reports (`QuestionBodyReport`):

- `ready`: whether Submit is enabled. Matching and fill in the blank: every slot
  or blank is filled. Ordering: always true. Multiple choice: always true.
- `evaluate()`: called once when Submit is tapped. It returns a
  `QuestionEvaluation`: `{ iscorrect, answer, perItem, summary? }`.
  - `iscorrect` and `answer` must be **exactly** what today's renderer computes
    for the same learner input. Reuse its rule, and the same `answerV1` builder.
    The server grades `answer` (enforce mode on UAT). Add a test in
    `src/utils/__tests__/answerV1.ts` that runs every input through both paths
    and the server mirror, as the multiple choice one does.
  - `perItem`: item id to `'correct'` or `'incorrect'`. Mark only what the
    learner placed or chose, so a wrong answer never reveals the right one.
  - `summary`: `{ correctCount, total, readBack }` for the strip
    ("2 of 4 are in the right place."). Leave it out for a single-part answer.

## What the shell does with it (today's semantics)

The shell makes the same calls today's renderers make, so the screens record,
retry and move on exactly as before. The rules are in `shellLogic.ts`, tested
by `yarn test:shell`.

- Submit sends `onSubmit(tries, iscorrect, false, answer, { inlineResult: true })`.
  The screen records the result as before (practice: only correct answers, with
  `tries`; quiz: every answer), but it doesn't open the popup.
- **Practice**
  - After a correct answer, Next calls `onContinue()`, which is what the popup
    button did: the next question, or saving and leaving.
  - After a wrong answer, the footer shows **Show answer** and **Try again**.
  - Try again clears the answer and adds a try. It is offered while
    `tries < 3`. Today's popup forced Show answer after the third miss, so
    the cap is the same.
  - After Show answer, Next sends `onSubmit(tries, false, true)`, and the
    screen moves on without recording anything, as today.
  - Retry, before submitting, clears the answer and adds a try, as today's
    footer does.
- **Quiz**: Submit, then Next after either result. There is no retry.
- The shell remounts for every question, keyed on the question index.
- `ref` keeps today's `PracticeHandler` (`retry`, `revealAnswer`, `submit`).

Corporate schools only: the registry never gives these renderers to a kids-theme
school.
