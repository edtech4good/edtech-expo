import { PracticeHandler } from '@/models';
import { PracticeProps } from '@/screens/Practice/PracticeScreen';
import { resolveQuestionModule } from '@/screens/Practice/Corporate/registry';
import { useDesign } from '@/services';
import _ from 'lodash';
import { forwardRef, useEffect, useMemo } from 'react';
import SizedBox from '../layouts/SizedBox';
import { questionRenderKey } from './questionKey';

export default forwardRef<PracticeHandler, PracticeProps>(
  function PracticeContent(
    {
      question,
      currentQuestionIndex,
      maxQuestion,
      onRetry,
      onSubmit,
      hideRetry,
      mode,
      onContinue,
    },
    ref,
  ) {
    const { isCorporate } = useDesign();

    useEffect(() => {
      console.log('Current Question Index: ', currentQuestionIndex);
    }, [question, currentQuestionIndex]);

    // Corporate schools get the corporate module for templates 1 to 8, and
    // everyone else today's renderer: see screens/Practice/Corporate.
    const Module = useMemo(
      () => resolveQuestionModule(question.templatetypeid, isCorporate),
      [question.templatetypeid, isCorporate],
    );

    // Keyed on the question's position, so every question gets a fresh
    // renderer (see questionKey.ts).
    //
    // Memoised on the question, as before: the renderer is not re-rendered
    // when the screen re-renders (the result popup opening, for one), and it
    // keeps the callbacks it was first given. `onContinue` is stable.
    const ModuleToRender = useMemo(
      () =>
        Module ? (
          <Module
            ref={ref}
            key={questionRenderKey(currentQuestionIndex)}
            question={question}
            currentQuestionIndex={currentQuestionIndex}
            maxQuestion={maxQuestion}
            hideRetry={hideRetry}
            onSubmit={onSubmit}
            onRetry={onRetry}
            mode={mode}
            onContinue={onContinue}
          />
        ) : undefined,
      [question, currentQuestionIndex, Module],
    );

    console.log('Mod: ', ModuleToRender);

    if (_.isEmpty(question))
      return <SizedBox.Large width backgroundColor="red" />;

    return ModuleToRender;
  },
);
