# Corporate question renderers

Corporate-theme schools get these renderers for templates 1 to 8. Kids-theme
schools keep today's renderers and the `ResultPopUp`, unchanged. The design is
`docs/design/corporate-question-types` in the workspace repo.

## Files

| File | Templates | State |
|---|---|---|
| `MCQText.tsx` | 1, 3 (multiple choice, text) | **Done**: the shell's reference implementation (`McqTextBody.tsx`, `mcqTextLogic.ts`) |
| `MCQImage.tsx` | 2, 4 (multiple choice, pictures) | Stub (step 6) |
| `TextOrdering.tsx` | 5 (word ordering) | **Done** (`TextOrderingBody.tsx`, `textOrderingLogic.ts`) |
| `ImageOrdering.tsx` | 6 (picture ordering) | Stub (step 3) |
| `Matching.tsx` | 7 (matching) | Stub (step 4) |
| `FillBlank.tsx` | 8 (fill in the blank) | Stub (step 5) |
| `CorporateQuestionShell.tsx` | all | The shared frame. Do not edit in steps 2 to 6. |
| `shellLogic.ts` | all | The footer and submit rules (pure). Do not edit in steps 2 to 6. |
| `shellLayout.ts` | all | The body's measured space and the compact rule (pure). |
| `selectionMode.ts` | 1 to 4 | Single or multiple selection for multiple choice (pure). |
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
| `layout` | The body's measured space: `{ availableWidth, availableHeight, compact }`, or `null` on the first frame. See [Fitting the screen](#fitting-the-screen-layout). |
| `report` | Call it through `useReportAnswer(report, ready, evaluate)` on every render. **Mandatory**: until the body reports, the shell treats it as not ready and Submit stays disabled. |

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

### Fitting the screen (`layout`)

The shell measures the space the body has and passes it as `layout`:

```ts
layout: {
  availableWidth: number;   // the column's content width (760 cap, minus gutters)
  availableHeight: number;  // from below the question card to the top of the footer
  compact: boolean;         // a short screen: use the compact layout
} | null                    // first frame: nothing measured yet
```

How it is measured (`shellLayout.ts`): the shell's `ScrollView` reports its
frame with `onLayout`, and so does the question card. `availableHeight` is the
viewport minus the card, the scroll padding and the gap below the card. The
footer is outside the `ScrollView`, so when the result strip appears the
footer grows, the viewport shrinks and `availableHeight` drops by exactly the
strip's height. A rotation or a window resize updates it the same way.

How a body uses it:

- **Fit to it; don't guess.** Size a picture grid or a tile row from
  `availableWidth` and `availableHeight`. Never work out the space from the
  window (`useWindowDimensions`, `measureInWindow` or a constant footer
  reserve): the body sits inside the shell's `ScrollView` and the footer's
  height changes after Submit, so a guess hides the bottom row, and the
  learner's own ✓ and ✕, behind the result strip.
- **Refit after Submit.** `layout` changes when the strip appears. A body
  that computes its sizes from `layout` on every render refits on its own:
  the marks stay in view.
- **`null` means not measured.** It lasts one frame. A body whose layout
  depends on the size renders hidden (`opacity: 0`, so it still takes part in
  layout) until it isn't null. A body that doesn't size itself (text options)
  can ignore it.
- **`compact`** is true when the regular layout would leave the body less
  than 260 points (`COMPACT_BELOW`): in practice a phone on its side. The
  question, the options and Submit should then fit without scrolling. The
  shell has already made the card compact (tighter padding, the Listen pill
  inline with the heading, the kit's 17 pt tile type). The body does its
  part: captions on the picture rather than under it, tiles down to about 64
  points, smaller gaps. `compact` is decided with the result strip left out,
  so it does not change on Submit; only `availableHeight` does.
- If the options still don't fit, the `ScrollView` scrolls: nothing is ever
  cut off.

### Single or multiple selection (templates 1 to 4)

`selectionModeFor(templateId, question)` in `selectionMode.ts` returns
`'single'` for templates 1 and 2 (the single-answer ones) and `'multi'` for 3
and 4. Apply a tap with `selectOption(selections, id, value, mode)`: single
replaces the choice (tapping the chosen option keeps it), multi toggles as
today. `selectionRoles(mode)` gives the accessibility roles: a `radiogroup` of
`radio`s, or a `group` of `checkbox`es (pass the option role to `QuizOption` as
`selectionRole`). Grading doesn't change: a single choice is a selections
object with one key, graded by the same rule.

Safety: a template 1 or 2 question with more than one correct option (bad
data) stays `'multi'`, so it can still be answered correctly. Kids renderers
are unchanged: several options can be chosen on every template.

### Showing the answer (`showAnswer`)

After "Show answer" the shell sets `resultState: 'revealed'`, `showAnswer: true`,
`marks: null` and `disabled: true`. Render the correct answer, not the learner's:

- Multiple choice: tint every correct option as correct, with no marks on the
  others (`McqTextBody` does this).
- Ordering: show the items in their correct order (by `questionoptionsequence`),
  each tile in the `correct` state. Do not animate the learner's order into it and
  do not mark which ones moved. For `ReorderableList`, pass the sorted items and
  `frameFor` returning `tileFrameStyle(colors, 'correct')`, and `disabled`.
- Matching and fill in the blank: fill every slot or blank with its right
  answer, in the `correct` state, and empty the bank.

The learner's answer is cleared when `showAnswer` turns on, as today's renderers
do, and the next `resetKey` never comes (Next moves on).

### Per-item audio

Per-item audio needs no contract change. The body draws the control itself with
the kit's `OptionAudioCircle`, using `clipId` set to the option id and `source`
from `useResource`. It plays on the shared player, so it stops the heading's
Listen pill and any other clip.

- In a `ReorderableList`, put it in `renderAccessory` (a sibling of the tile,
  never inside it) and leave room with `MovableTile reserveAudio`. See the
  example in `OptionAudioCircle.tsx`.

### Marks and screen readers in a `ReorderableList`

A tile's content is inside the tile's labelled button, so a mark drawn in
`renderItem` is never read. Pass `itemStatusFor={item => ...}` to
`ReorderableList` with the mark's words (`t('kit.mark.correct')` or
`t('kit.mark.incorrect')`, or undefined while answering). It is appended to
the tile's label: "Write. Word 3 of 6. Correct". `TextOrderingBody` does this
with `wordStatusKey`.
- Anywhere else, put it next to the item, as `McqTextBody` does.

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
- Double taps. Next can be pressed once: after it, every button is disabled
  until the next question mounts, so a practice or quiz is never saved twice.
  Submit can be pressed once: presses read the state synchronously, not the
  last render. A new question ignores taps for its first 500 ms (`ARM_MS`), so
  the second tap of a double tap on Next can't submit a blank answer on the
  question that replaced it. Bodies don't need to guard against any of this.
- `ref` keeps today's `PracticeHandler` (`retry`, `revealAnswer`, `submit`).

Corporate schools only: the registry never gives these renderers to a kids-theme
school.
