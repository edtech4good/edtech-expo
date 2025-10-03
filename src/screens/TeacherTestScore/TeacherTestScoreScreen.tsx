import {
  Container,
  CustomPicker,
  Expanded,
  H4,
  H6,
  LayoutScrollView,
  Row,
  SH3,
  SizedBox,
} from '@/components';
import { StudentProfile } from '@/models';
import { useScreenDimension, useSyncContent, useTestScore } from '@/services';
import { toCustomPickerItems } from '@/transforms';
import { KeyExtractorHelper } from '@/utils';
import _ from 'lodash';
import { useMemo } from 'react';
import { FlatList } from 'react-native';
import { Item } from 'react-native-picker-select';
import { useTheme } from 'styled-components/native';

export default function TeacherTestScoreScreen() {
  const theme = useTheme();
  const { unblockHeightWithoutHeader } = useScreenDimension();
  const { downloadContentFromRpi } = useSyncContent();

  const {
    standardItem,
    curriculumItem,
    courseItem,
    levelItem,
    lessonItem,
    standards,
    curriculums,
    courses,
    levels,
    lessons,
    fetchCurriculum,
    fetchCourse,
    fetchLevel,
    fetchLesson,
    fetchRecord,
    students,
  } = useTestScore();

  const standardItems = useMemo(
    () => toCustomPickerItems(standards, 'standardname', 'standardid'),
    [standards],
  );

  const curriculumItems = useMemo(
    () => toCustomPickerItems(curriculums, 'curriculumname', 'curriculumid'),
    [curriculums],
  );

  const courseItems = useMemo(
    () => toCustomPickerItems(courses, 'gradename', 'gradeid'),
    [courses],
  );

  const levelItems = useMemo(
    () => toCustomPickerItems(levels, 'levelname', 'levelid'),
    [levels],
  );

  const lessonItems = useMemo(
    () => toCustomPickerItems(lessons, 'lessonname', 'lessonid'),
    [lessons],
  );

  const handleStandardChange = (standardId: Item) => {
    console.log('StandardID : ', standardId);
    if (!standardId) return;
    fetchCurriculum(standardId);
    // downloadContentFromRpi();
  };

  const handleCurriculumChange = (curriculumId: Item) => {
    console.log('CurriculumID: ', curriculumId);
    if (!curriculumId) return;
    fetchCourse(curriculumId);
  };

  const handleCourseChange = (courseId: Item) => {
    console.log('CourseID: ', courseId);
    if (!courseId) return;
    fetchLevel(courseId);
  };

  const handleLevelChange = (levelId: Item) => {
    console.log('LevelID: ', levelId);
    if (!levelId) return;
    fetchLesson(levelId);
  };

  const handleLessonChange = (lessonId: Item) => {
    console.log('LessonID: ', lessonId);
    if (!lessonId) return;
    fetchRecord(lessonId);
  };

  const renderListHeader = () => {
    return (
      <Row
        style={{
          marginTop: theme.layouts.medium,
          marginBottom: theme.layouts.large,
        }}>
        <H6 fontWeight="semi" style={{ minWidth: 32 }}>
          No.
        </H6>
        <SizedBox.Medium width />
        <Expanded flex={1}>
          <H6 fontWeight="semi">Student ID</H6>
        </Expanded>
        <Expanded flex={2}>
          <H6 fontWeight="semi">Student Name</H6>
        </Expanded>
        <Expanded>
          <H6 fontWeight="semi">Mark</H6>
        </Expanded>
        <Expanded>
          <H6 fontWeight="semi">Percentage</H6>
        </Expanded>
        <Expanded>
          <H6 fontWeight="semi">Quiz Score</H6>
        </Expanded>
        <Expanded>
          <H6 fontWeight="semi">Result</H6>
        </Expanded>
      </Row>
    );
  };

  const renderItem = ({
    item,
    index,
  }: {
    item: StudentProfile;
    index: number;
  }) => {
    const hasProgress = _.get(item, 'studentprogress.totalquestions', 0) > 0;

    let mark = '';
    let percentage = '';
    let score = '';

    if (hasProgress) {
      mark = `${_.get(item, 'studentprogress.mark', 0)}/${_.get(
        item,
        'studentprogress.totalquestions',
        0,
      )}`;
      percentage = `${_.get(item, 'studentprogress.resultpercentage', 0)}%`;
      score = `${_.get(item, 'studentprogress.scores', 0)}`;
    } else {
      mark = 'N/A';
      percentage = 'N/A';
      score = 'N/A';
    }

    const result =
      _.get(item, 'studentprogress.ispass', 0) === 1
        ? 'Passed'
        : hasProgress
        ? 'Redo'
        : 'N/A';

    return (
      <Row>
        <H6 textAlign="center" alignSelf="center" style={{ minWidth: 32 }}>
          {index}
        </H6>
        <SizedBox.Medium width />
        <Expanded flex={1}>
          <H6>{item.schooluser.schoolusername}</H6>
        </Expanded>
        <Expanded flex={2}>
          <H6>{`${item.studentlastname} ${item.studentfirstname}`}</H6>
        </Expanded>
        <Expanded>
          <H6>{mark}</H6>
        </Expanded>
        <Expanded>
          <H6>{percentage}</H6>
        </Expanded>
        <Expanded>
          <H6>{score}</H6>
        </Expanded>
        <Expanded>
          <H6>{result}</H6>
        </Expanded>
      </Row>
    );
  };

  const renderItemSeparator = () => <SizedBox.Large height />;

  return (
    <LayoutScrollView>
      <Container containerHeight={unblockHeightWithoutHeader}>
        <Row
          paddingBottom={theme.layouts.large}
          paddingLeft={theme.layouts.large}
          paddingRight={theme.layouts.large}
          paddingTop={theme.layouts.large}
          justifyContent="flex-start"
          style={{
            flexWrap: 'wrap',
          }}>
          <CustomPicker
            items={standardItems}
            placeholder="Choose Class"
            value={standardItem}
            onChange={handleStandardChange}
          />
          <SizedBox.Large width />
          <CustomPicker
            items={curriculumItems}
            placeholder="Choose Curriculum"
            value={curriculumItem}
            onChange={handleCurriculumChange}
          />
          <SizedBox.Large width />
          <CustomPicker
            items={courseItems}
            placeholder="Choose Course"
            value={courseItem}
            onChange={handleCourseChange}
          />
          <SizedBox.Large width />
          <CustomPicker
            items={levelItems}
            placeholder="Choose Level"
            value={levelItem}
            onChange={handleLevelChange}
          />
          <SizedBox.Large width />
          <CustomPicker
            items={lessonItems}
            placeholder="Choose Lesson"
            value={lessonItem}
            onChange={handleLessonChange}
          />
        </Row>
        <Expanded
          flexDirection="row"
          justifyContent="center"
          backgroundColor={theme.colors.surface}
          style={{
            marginHorizontal: theme.layouts.large,
            borderRadius: theme.layouts.defaultRadius,
          }}>
          <FlatList
            data={students.data}
            style={{ alignSelf: 'stretch' }}
            contentContainerStyle={{
              padding: theme.layouts.large,
            }}
            ListHeaderComponent={renderListHeader}
            renderItem={renderItem}
            ItemSeparatorComponent={renderItemSeparator}
            keyExtractor={KeyExtractorHelper}
          />
        </Expanded>
        {/* <SizedBox.Large height /> */}
      </Container>
    </LayoutScrollView>
  );
}
