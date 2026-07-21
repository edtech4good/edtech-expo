import {
  AppButton,
  AppCheckbox,
  AppIconButton,
  AppRadio,
  AppSwitch,
  AppTextField,
  Chip,
  CircularProgress,
  ContinueLearningRow,
  CurriculumCard,
  EyebrowText,
  LessonStepDots,
  OfflineBanner,
  ProgressBar,
  QuizOption,
  Toast,
} from '@/components/ui';
import type { QuizOptionState } from '@/components/ui/QuizOption';
import type { ToastType } from '@/components/ui/Toast';
import { ReactNode, useState } from 'react';
import { ScrollView, View } from 'react-native';
import Svg, { Line, Path } from 'react-native-svg';
import { useTheme } from 'styled-components/native';

// __DEV__-only visual inventory of every theme-driven primitive under
// src/components/ui/ — see app/(app)/gallery.tsx for the route that guards
// this behind __DEV__, and DevThemeToggle's long-press for the entry point.
// All demo copy is plain English literals; EyebrowText/LessonStepDots
// instances still follow the selected language automatically.

function PlusIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Line x1={12} y1={5} x2={12} y2={19} stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Line x1={5} y1={12} x2={19} y2={12} stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

function HeartIcon({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 20.5s-7.5-4.6-10-9.3C.5 7.8 2.3 4 6 4c2.1 0 3.7 1.2 6 3.6C14.3 5.2 15.9 4 18 4c3.7 0 5.5 3.8 4 7.2-2.5 4.7-10 9.3-10 9.3z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ marginBottom: 36 }}>
      <EyebrowText size={11} style={{ marginBottom: 14 }}>
        {title}
      </EyebrowText>
      {children}
    </View>
  );
}

function Row({ children }: { children: ReactNode }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'flex-start',
        gap: 16,
        marginBottom: 16,
      }}>
      {children}
    </View>
  );
}

function Swatch({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={{ alignItems: 'flex-start', gap: 6 }}>
      {children}
      <EyebrowText size={8}>{label}</EyebrowText>
    </View>
  );
}

export default function ComponentGalleryScreen() {
  const theme = useTheme();

  // Selection controls — one "off" and one "on" instance per component,
  // each independently toggleable.
  const [checkboxOff, setCheckboxOff] = useState(false);
  const [checkboxOn, setCheckboxOn] = useState(true);
  const [radioOff, setRadioOff] = useState(false);
  const [radioOn, setRadioOn] = useState(true);
  const [switchOff, setSwitchOff] = useState(false);
  const [switchOn, setSwitchOn] = useState(true);

  // Chips
  const [pressableChipIndex, setPressableChipIndex] = useState(0);
  const pressableChipLabels = ['Reading', 'Math', 'Science', 'Khmer'];

  // Progress
  const [randomProgress, setRandomProgress] = useState(0.42);

  // QuizOption interactive group
  const [selectedQuizIndex, setSelectedQuizIndex] = useState<number | null>(
    null,
  );
  const quizChoices = ['Option A', 'Option B', 'Option C', 'Option D'];

  // Toast + banner
  const [toastVisible, setToastVisible] = useState(false);
  const [toastType, setToastType] = useState<ToastType>('success');
  const [offlineVisible, setOfflineVisible] = useState(false);

  // Text fields
  const [searchValue, setSearchValue] = useState('');
  const [secureValue, setSecureValue] = useState('');

  const showToast = (type: ToastType) => {
    setToastType(type);
    setToastVisible(true);
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 120 }}>
        <Section title="Buttons">
          <Row>
            <Swatch label="primary lg / rest">
              <AppButton label="Continue" onPress={() => {}} />
            </Swatch>
            <Swatch label="primary lg / loading">
              <AppButton label="Continue" loading loadingLabel="Saving..." />
            </Swatch>
            <Swatch label="primary lg / disabled">
              <AppButton label="Continue" disabled />
            </Swatch>
            <Swatch label="secondary lg">
              <AppButton variant="secondary" label="Cancel" onPress={() => {}} />
            </Swatch>
            <Swatch label="tertiary md">
              <AppButton
                variant="tertiary"
                size="md"
                label="Skip"
                onPress={() => {}}
              />
            </Swatch>
            <Swatch label="destructive lg">
              <AppButton
                variant="destructive"
                label="Delete"
                onPress={() => {}}
              />
            </Swatch>
          </Row>
          <Row>
            <Swatch label="size lg">
              <AppButton size="lg" label="Large" onPress={() => {}} />
            </Swatch>
            <Swatch label="size md">
              <AppButton size="md" label="Medium" onPress={() => {}} />
            </Swatch>
            <Swatch label="size sm">
              <AppButton size="sm" label="Small" onPress={() => {}} />
            </Swatch>
          </Row>
          <Row>
            <Swatch label="icon / plain">
              <AppIconButton
                variant="plain"
                icon={<PlusIcon color={theme.colors.primary} />}
                accessibilityLabel="Add"
                onPress={() => {}}
              />
            </Swatch>
            <Swatch label="icon / filled">
              <AppIconButton
                variant="filled"
                icon={<PlusIcon color={theme.colors.onPrimary} />}
                accessibilityLabel="Add"
                onPress={() => {}}
              />
            </Swatch>
            <Swatch label="icon / surface">
              <AppIconButton
                variant="surface"
                icon={<HeartIcon color={theme.colors.primary} />}
                accessibilityLabel="Favorite"
                onPress={() => {}}
              />
            </Swatch>
          </Row>
        </Section>

        <Section title="Text fields">
          <Row>
            <Swatch label="default / empty">
              <AppTextField
                value=""
                onChangeText={() => {}}
                placeholder="Enter your name"
              />
            </Swatch>
            <Swatch label="focused">
              <AppTextField
                value=""
                onChangeText={() => {}}
                placeholder="Autofocused"
                autoFocus
              />
            </Swatch>
            <Swatch label="error">
              <AppTextField
                value="oops"
                onChangeText={() => {}}
                error="Something went wrong"
              />
            </Swatch>
            <Swatch label="disabled">
              <AppTextField
                value="Read only"
                onChangeText={() => {}}
                disabled
              />
            </Swatch>
            <Swatch label="search">
              <AppTextField
                variant="search"
                value={searchValue}
                onChangeText={setSearchValue}
                placeholder="Search lessons"
              />
            </Swatch>
            <Swatch label="secure / eye">
              <AppTextField
                value={secureValue}
                onChangeText={setSecureValue}
                placeholder="Password"
                secureTextEntry
              />
            </Swatch>
          </Row>
        </Section>

        <Section title="Selection">
          <Row>
            <Swatch label="checkbox / off">
              <AppCheckbox value={checkboxOff} onValueChange={setCheckboxOff} />
            </Swatch>
            <Swatch label="checkbox / on">
              <AppCheckbox value={checkboxOn} onValueChange={setCheckboxOn} />
            </Swatch>
            <Swatch label="radio / off">
              <AppRadio value={radioOff} onValueChange={setRadioOff} />
            </Swatch>
            <Swatch label="radio / on">
              <AppRadio value={radioOn} onValueChange={setRadioOn} />
            </Swatch>
            <Swatch label="switch / off">
              <AppSwitch value={switchOff} onValueChange={setSwitchOff} />
            </Swatch>
            <Swatch label="switch / on">
              <AppSwitch value={switchOn} onValueChange={setSwitchOn} />
            </Swatch>
          </Row>
        </Section>

        <Section title="Chips">
          <Row>
            <Swatch label="default">
              <Chip label="Grade 3" />
            </Swatch>
            <Swatch label="active">
              <Chip label="Grade 3" active />
            </Swatch>
          </Row>
          <Row>
            {pressableChipLabels.map((label, index) => (
              <Chip
                key={label}
                label={label}
                active={pressableChipIndex === index}
                onPress={() => setPressableChipIndex(index)}
              />
            ))}
          </Row>
        </Section>

        <Section title="Progress">
          <Row>
            <Swatch label="linear / default 62%">
              <View style={{ width: 160 }}>
                <ProgressBar progress={0.62} />
              </View>
            </Swatch>
            <Swatch label="linear / quiz 30%">
              <View style={{ width: 160 }}>
                <ProgressBar progress={0.3} variant="quiz" />
              </View>
            </Swatch>
            <Swatch label="circular 62% / size 72">
              <CircularProgress progress={0.62} size={72} />
            </Swatch>
            <Swatch label="animated demo">
              <View style={{ alignItems: 'flex-start', gap: 8 }}>
                <CircularProgress progress={randomProgress} size={72} />
                <AppButton
                  size="sm"
                  variant="tertiary"
                  label="Randomize"
                  onPress={() => setRandomProgress(Math.random())}
                />
              </View>
            </Swatch>
          </Row>
        </Section>

        <Section title="Lesson step dots">
          <EyebrowText size={9} style={{ marginBottom: 10 }}>
            With labels
          </EyebrowText>
          <Row>
            <Swatch label="all todo">
              <LessonStepDots
                steps={{ learning: 'todo', practice: 'todo', quiz: 'todo' }}
              />
            </Swatch>
            <Swatch label="mixed">
              <LessonStepDots
                steps={{
                  learning: 'done',
                  practice: 'current',
                  quiz: 'todo',
                }}
              />
            </Swatch>
            <Swatch label="all done">
              <LessonStepDots
                steps={{ learning: 'done', practice: 'done', quiz: 'done' }}
              />
            </Swatch>
          </Row>
          <EyebrowText size={9} style={{ marginBottom: 10 }}>
            Without labels
          </EyebrowText>
          <Row>
            <Swatch label="all todo">
              <LessonStepDots
                showLabels={false}
                steps={{ learning: 'todo', practice: 'todo', quiz: 'todo' }}
              />
            </Swatch>
            <Swatch label="mixed">
              <LessonStepDots
                showLabels={false}
                steps={{
                  learning: 'done',
                  practice: 'current',
                  quiz: 'todo',
                }}
              />
            </Swatch>
            <Swatch label="all done">
              <LessonStepDots
                showLabels={false}
                steps={{ learning: 'done', practice: 'done', quiz: 'done' }}
              />
            </Swatch>
          </Row>
        </Section>

        <Section title="Quiz option">
          <EyebrowText size={9} style={{ marginBottom: 10 }}>
            Static states
          </EyebrowText>
          <View style={{ gap: 10, marginBottom: 16 }}>
            {(
              ['default', 'selected', 'correct', 'incorrect'] as QuizOptionState[]
            ).map(state => (
              <QuizOption key={state} label={`Option — ${state}`} state={state} />
            ))}
          </View>
          <EyebrowText size={9} style={{ marginBottom: 10 }}>
            Interactive group
          </EyebrowText>
          <View style={{ gap: 10 }}>
            {quizChoices.map((label, index) => (
              <QuizOption
                key={label}
                label={label}
                state={selectedQuizIndex === index ? 'selected' : 'default'}
                onPress={() => setSelectedQuizIndex(index)}
              />
            ))}
          </View>
        </Section>

        <Section title="Cards">
          <Row>
            <Swatch label="curriculum / no progress / no image">
              <View style={{ width: 220 }}>
                <CurriculumCard
                  category="Reading"
                  title="Foundations of Phonics and Early Reading"
                  meta="3 GRADES · 12 LEVELS · 38 HOURS"
                  onPress={() => {}}
                />
              </View>
            </Swatch>
            <Swatch label="curriculum / progress 62% / no image">
              <View style={{ width: 220 }}>
                <CurriculumCard
                  category="Math"
                  title="Numbers, Operations and Problem Solving"
                  meta="4 GRADES · 16 LEVELS · 52 HOURS"
                  progress={0.62}
                  onPress={() => {}}
                />
              </View>
            </Swatch>
          </Row>
          <Row>
            <Swatch label="continue learning row">
              <View style={{ width: 320 }}>
                <ContinueLearningRow
                  title="Fractions and Decimals"
                  progress={0.62}
                  meta="62% · LESSON 10 OF 16"
                  onPress={() => {}}
                />
              </View>
            </Swatch>
          </Row>
        </Section>

        <Section title="Toast + offline banner">
          <Row>
            <AppButton
              variant="secondary"
              size="sm"
              label="Trigger success toast"
              onPress={() => showToast('success')}
            />
            <AppButton
              variant="secondary"
              size="sm"
              label="Trigger error toast (Retry)"
              onPress={() => showToast('error')}
            />
            <AppButton
              variant="secondary"
              size="sm"
              label={offlineVisible ? 'Hide offline banner' : 'Show offline banner'}
              onPress={() => setOfflineVisible(v => !v)}
            />
          </Row>
          <OfflineBanner visible={offlineVisible} />
        </Section>
      </ScrollView>

      <Toast
        visible={toastVisible}
        type={toastType}
        message={
          toastType === 'success'
            ? 'Progress saved.'
            : 'Could not save progress.'
        }
        actionLabel={toastType === 'error' ? 'Retry' : undefined}
        onAction={toastType === 'error' ? () => setToastVisible(false) : undefined}
        onDismiss={() => setToastVisible(false)}
      />
    </View>
  );
}
