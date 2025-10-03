import { PracticeHandler } from '@/models';
import { PracticeProps } from '@/screens/Practice/PracticeScreen';
import _ from 'lodash';
import { forwardRef, useEffect, useMemo } from 'react';
import SizedBox from '../layouts/SizedBox';
import { TemplateTypeId } from '@/constants';
import PracticeMCQText from '@/screens/Practice/Components/MCQText/PracticeMCQText';
import PracticeMCQImage from '@/screens/Practice/Components/MCQImage/PracticeMCQImage';
import PracticeArrangeText from '@/screens/Practice/Components/ArrangeText/PracticeArrangeText';
import PracticeDragDrop from '@/screens/Practice/Components/DragDrop/PracticeDragDrop';
import PracticeFillBlank from '@/screens/Practice/Components/FillBlank/PracticeFillBlank';
import DOption1 from '@/screens/Practice/Components/Prototypes/DOption1/DOption1';
import DOption3 from '@/screens/Practice/Components/Prototypes/DOption3/DOption3';
import DOption4 from '@/screens/Practice/Components/Prototypes/DOption4/DOption4';
import FOption1 from '@/screens/Practice/Components/Prototypes/FOption1/FOption1';
import FOption2 from '@/screens/Practice/Components/Prototypes/FOption2/FOption2';
import FOption4 from '@/screens/Practice/Components/Prototypes/FOption4/FOption4';
import PracticeFraction from '@/screens/Practice/Components/Fraction/PracticeFraction';
import PracticeArrangeImage from '@/screens/Practice/Components/ArrangeImage/PracticeArrangeImage';

export default forwardRef<PracticeHandler, PracticeProps>(
  function PracticeContent(
    { question, currentQuestionIndex, maxQuestion, onRetry, onSubmit },
    ref,
  ) {
    useEffect(() => {
      console.log('Current Question Index: ', currentQuestionIndex);
    }, [question, currentQuestionIndex]);

    const availableModule = useMemo(
      () => ({
        [TemplateTypeId.MCQSingleText]: (
          <PracticeMCQText
            ref={ref}
            key={question.questionnid}
            question={question}
            currentQuestionIndex={currentQuestionIndex}
            maxQuestion={maxQuestion}
            onSubmit={onSubmit}
            onRetry={onRetry}
          />
        ),
        [TemplateTypeId.MCQMultiText]: (
          <PracticeMCQText
            ref={ref}
            key={question.questionnid}
            question={question}
            currentQuestionIndex={currentQuestionIndex}
            maxQuestion={maxQuestion}
            onSubmit={onSubmit}
            onRetry={onRetry}
          />
        ),
        [TemplateTypeId.MCQSingleImage]: (
          <PracticeMCQImage
            ref={ref}
            key={question.questionnid}
            question={question}
            currentQuestionIndex={currentQuestionIndex}
            maxQuestion={maxQuestion}
            onSubmit={onSubmit}
            onRetry={onRetry}
          />
        ),
        [TemplateTypeId.MCQMultiImage]: (
          <PracticeMCQImage
            ref={ref}
            key={question.questionnid}
            question={question}
            currentQuestionIndex={currentQuestionIndex}
            maxQuestion={maxQuestion}
            onSubmit={onSubmit}
            onRetry={onRetry}
          />
        ),
        [TemplateTypeId.TextOrdering]: (
          <PracticeArrangeText
            ref={ref}
            key={question.questionnid}
            question={question}
            currentQuestionIndex={currentQuestionIndex}
            maxQuestion={maxQuestion}
            onSubmit={onSubmit}
            onRetry={onRetry}
          />
        ),
        [TemplateTypeId.ImageOrdering]: (
          <PracticeArrangeImage
            ref={ref}
            key={question.questionnid}
            question={question}
            currentQuestionIndex={currentQuestionIndex}
            maxQuestion={maxQuestion}
            onSubmit={onSubmit}
            onRetry={onRetry}
          />
        ),
        [TemplateTypeId.DragDrop]: (
          <PracticeDragDrop
            ref={ref}
            key={question.questionnid}
            question={question}
            currentQuestionIndex={currentQuestionIndex}
            maxQuestion={maxQuestion}
            onSubmit={onSubmit}
            onRetry={onRetry}
          />
        ),
        [TemplateTypeId.FillInBlank]: (
          <PracticeFillBlank
            ref={ref}
            key={question.questionnid}
            question={question}
            currentQuestionIndex={currentQuestionIndex}
            maxQuestion={maxQuestion}
            onSubmit={onSubmit}
            onRetry={onRetry}
          />
        ),
        [TemplateTypeId.DOption1]: (
          <DOption1
            ref={ref}
            key={question.questionnid}
            question={question}
            currentQuestionIndex={currentQuestionIndex}
            maxQuestion={maxQuestion}
            onSubmit={onSubmit}
            onRetry={onRetry}
          />
        ),
        [TemplateTypeId.DOption3]: (
          <DOption3
            ref={ref}
            key={question.questionnid}
            question={question}
            currentQuestionIndex={currentQuestionIndex}
            maxQuestion={maxQuestion}
            onSubmit={onSubmit}
            onRetry={onRetry}
          />
        ),
        [TemplateTypeId.DOption4]: (
          <DOption4
            ref={ref}
            key={question.questionnid}
            question={question}
            currentQuestionIndex={currentQuestionIndex}
            maxQuestion={maxQuestion}
            onSubmit={onSubmit}
            onRetry={onRetry}
          />
        ),
        [TemplateTypeId.FOption1]: (
          <FOption1
            ref={ref}
            key={question.questionnid}
            question={question}
            currentQuestionIndex={currentQuestionIndex}
            maxQuestion={maxQuestion}
            onSubmit={onSubmit}
            onRetry={onRetry}
          />
        ),
        [TemplateTypeId.FOption2]: (
          <FOption2
            ref={ref}
            key={question.questionnid}
            question={question}
            currentQuestionIndex={currentQuestionIndex}
            maxQuestion={maxQuestion}
            onSubmit={onSubmit}
            onRetry={onRetry}
          />
        ),
        [TemplateTypeId.FOption4]: (
          <FOption4
            ref={ref}
            key={question.questionnid}
            question={question}
            currentQuestionIndex={currentQuestionIndex}
            maxQuestion={maxQuestion}
            onSubmit={onSubmit}
            onRetry={onRetry}
          />
        ),
        [TemplateTypeId.Fraction]: (
          <PracticeFraction
            ref={ref}
            key={question.questionnid}
            question={question}
            currentQuestionIndex={currentQuestionIndex}
            maxQuestion={maxQuestion}
            onSubmit={onSubmit}
            onRetry={onRetry}
          />
        ),
      }),
      [question, currentQuestionIndex],
    );

    const ModuleToRender = useMemo(
      () => availableModule[question.templatetypeid],
      // () => Object.values(availableModule)[currentQuestionIndex],
      [question, currentQuestionIndex],
    );

    // console.log('Is Empty? ', question.templatetypeid);
    console.log('Mod: ', ModuleToRender);

    if (_.isEmpty(question))
      return <SizedBox.Large width backgroundColor="red" />;

    // return (
    //   <PracticeFraction
    //     ref={ref}
    //     key={question.questionnid}
    //     question={question}
    //     currentQuestionIndex={currentQuestionIndex}
    //     maxQuestion={maxQuestion}
    //     onSubmit={onSubmit}
    //     onRetry={onRetry}
    //   />
    // );

    return ModuleToRender;
  },
);
