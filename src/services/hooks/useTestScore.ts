import { useAppSelector } from '@/redux';
import { useApi } from '../api/ApiContext';
import { getProfile, getStandards } from '@/redux/slices';
import { useState } from 'react';
import {
  Course,
  Curriculum,
  Lesson,
  TeacherStudentProgress,
  Unit,
} from '@/models';
import { Item } from 'react-native-picker-select';

interface TestScoreData {
  standardItem: Item | undefined;
  curriculumItem: Item | undefined;
  courseItem: Item | undefined;
  levelItem: Item | undefined;
  lessonItem: Item | undefined;
  curriculums: Curriculum[];
  courses: Course[];
  levels: Unit[];
  lessons: Lesson[];
  students: TeacherStudentProgress;
}

export default function useTestScore() {
  const api = useApi();

  const profile = useAppSelector(getProfile);
  const standards = useAppSelector(getStandards);

  const [
    {
      courseItem,
      courses,
      curriculumItem,
      curriculums,
      lessonItem,
      lessons,
      levelItem,
      levels,
      standardItem,
      students,
    },
    setData,
  ] = useState<TestScoreData>({
    standardItem: undefined,
    curriculumItem: undefined,
    courseItem: undefined,
    levelItem: undefined,
    lessonItem: undefined,
    curriculums: [],
    courses: [],
    levels: [],
    lessons: [],
    students: { data: [], pageindex: 0, pagesize: 0, total: 0 },
  });

  const fetchCurriculum = async (standardItem: Item) => {
    const response = await api.fetchCurriculum(profile?.schoolname || '');

    setData(val => ({
      ...val,
      standardItem,
      curriculumItem: undefined,
      courseItem: undefined,
      levelItem: undefined,
      lessonItem: undefined,
      curriculums: response.data?.data || [],
      courses: [],
      levels: [],
      lessons: [],
      students: { data: [], pageindex: 0, pagesize: 0, total: 0 },
    }));
  };

  const fetchCourse = async (curriculumItem: Item) => {
    const response = await api.fetchCourse(curriculumItem.value);
    setData(val => ({
      ...val,
      curriculumItem,
      courseItem: undefined,
      levelItem: undefined,
      lessonItem: undefined,
      courses: response.data?.data || [],
      levels: [],
      lessons: [],
    }));
  };

  const fetchLevel = async (courseItem: Item) => {
    const response = await api.fetchLevel(courseItem.value);
    setData(val => ({
      ...val,
      courseItem,
      levelItem: undefined,
      lessonItem: undefined,
      levels: response.data?.data || [],
      lessons: [],
      students: { data: [], pageindex: 0, pagesize: 0, total: 0 },
    }));
  };

  const fetchLesson = async (levelItem: Item) => {
    const response = await api.fetchLesson(levelItem.value);
    setData(val => ({
      ...val,
      levelItem,
      lessonItem: undefined,
      lessons: response.data?.data || [],
      students: { data: [], pageindex: 0, pagesize: 0, total: 0 },
    }));
  };

  const fetchRecord = async (lessonItem: Item) => {
    await setData(val => ({ ...val, lessonItem }));
    const response = await api.fetchStudentProgress({
      pageindex: 1,
      pagesize: 100,
      filter: [
        { key: 'standard', value: standardItem?.value },
        { key: 'lessonid', value: lessonItem.value },
      ],
      // academic_year: '2024-2025',
    });

    console.log('RECORD');
    console.log(JSON.stringify(response.data));
    await setData(val => ({
      ...val,
      students: response.data?.data || {
        data: [],
        pageindex: 0,
        pagesize: 0,
        total: 0,
      },
    }));
  };

  return {
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
  };
}
