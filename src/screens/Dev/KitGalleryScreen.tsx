import { ReorderableList, ReorderItem } from '@/components/drag';
import {
  AnnouncerProvider,
  audioManager,
  footerActions,
  ListenPill,
  MovableTile,
  OptionAudioCircle,
  QuestionColumn,
  ResultMark,
  ResultStrip,
  SLOT_STATES,
  Slot,
  tileFrameStyle,
  TILE_STATES,
} from '@/components/kit';
import { useAppDispatch, useAppSelector } from '@/redux';
import { getSelectedLanguage, SettingActions } from '@/redux/slices';
import { corporateTheme } from '@/themes/Themes';
import { ReactNode, useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemeProvider } from 'styled-components/native';

// __DEV__-only gallery of the corporate question kit (src/components/kit):
// every component in every state, English or Khmer, at the phone or the
// desktop column width, with working audio. See app/(app)/kit-gallery.tsx
// for the route guard. Not linked from anywhere: open /kit-gallery. It needs
// no login, always uses the corporate theme, and touches no network: the
// audio is a 3-second generated tone bundled in assets/.

const C = corporateTheme.colors;
const MONO = 'SpaceMonoRegular';
const HEAD = 'SpaceGroteskBold';

type Lang = 'en' | 'km';

const WORDS: Record<Lang, string[]> = {
  en: ['Write', 'every', 'sale', 'in', 'your', 'book'],
  km: ['ខ្ញុំ', 'កត់ត្រា', 'ការលក់', 'ទាំងអស់', 'ក្នុង', 'សៀវភៅ'],
};
const CAPTIONS: Record<Lang, string[]> = {
  en: ['Greet the customer', 'Show the product', 'Take payment', 'Give the receipt'],
  km: ['ស្វាគមន៍អតិថិជន', 'បង្ហាញទំនិញ', 'ទទួលការទូទាត់', 'ផ្តល់បង្កាន់ដៃ'],
};
const SENTENCE: Record<Lang, string> = {
  en: 'Write every sale in your book.',
  km: 'ខ្ញុំកត់ត្រាការលក់ទាំងអស់ក្នុងសៀវភៅរាល់ថ្ងៃ។',
};

// A stand-in picture: a small generated SVG, so the gallery needs no image file.
const PHOTO =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="160" viewBox="0 0 240 160">' +
      '<rect width="240" height="160" fill="#E7EFFF"/>' +
      '<circle cx="80" cy="60" r="22" fill="#FFC228"/>' +
      '<path d="M0 160l70-64 44 40 40-32 86 56z" fill="#0B5FFF" opacity="0.55"/></svg>',
  );

// The generated tone. Required lazily and only in dev so the harness adds
// nothing to a production bundle.
function toneSource(): number | undefined {
  // The require sits inside the __DEV__ block itself: Metro folds
  // `if (__DEV__)` away in a production build and drops the asset with it (an
  // early return above a bare require is not folded, and ships the file).
  if (__DEV__) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('../../../assets/dev-kit-tone.wav');
  }
  return undefined;
}

function Label({ children }: { children: ReactNode }) {
  return (
    <Text style={{ fontFamily: MONO, fontSize: 12, letterSpacing: 1.5, color: C.placeholder }}>
      {children}
    </Text>
  );
}

function Section({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <View style={{ rowGap: 12, marginBottom: 32 }}>
      <Text style={{ fontFamily: HEAD, fontSize: 20, color: C.onBackground }}>{title}</Text>
      {note ? (
        <Text style={{ fontFamily: 'PlusJakartaSansRegular', fontSize: 13, lineHeight: 18, color: C.placeholder }}>
          {note}
        </Text>
      ) : null}
      {children}
    </View>
  );
}

function Cell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={{ rowGap: 6, alignItems: 'flex-start' }}>
      <Label>{label}</Label>
      {children}
    </View>
  );
}

function Wrap({ children }: { children: ReactNode }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' }}>{children}</View>;
}

function Chip({ label, on, onPress, testID }: { label: string; on: boolean; onPress: () => void; testID: string }) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      onPress={onPress}
      style={{
        minHeight: 44,
        paddingHorizontal: 14,
        borderRadius: 22,
        borderWidth: 1.5,
        borderColor: C.primary,
        backgroundColor: on ? C.primary : C.surface,
        justifyContent: 'center',
      }}>
      <Text style={{ fontFamily: 'PlusJakartaSansSemiBold', color: on ? C.onPrimary : C.primary }}>{label}</Text>
    </Pressable>
  );
}

interface Word extends ReorderItem {
  audio?: boolean;
}

function OrderingDemo({ lang, tone }: { lang: Lang; tone: number | undefined }) {
  // The answer is the order of WORDS; the list starts with two words swapped,
  // so "Check answer" reads "4 of 6 are in the right place".
  const items = useMemo<Word[]>(() => {
    const answer = WORDS[lang].map((w, i) => ({ id: `w${lang}${i}`, label: w, audio: i < 3 }));
    const start = [1, 0, 2, 3, 4, 5];
    return start.map(i => answer[i]);
  }, [lang]);
  const [result, setResult] = useState<'none' | 'checked'>('none');
  const [order, setOrder] = useState<string[]>(items.map(i => i.id));
  const right = (id: string) => `w${lang}${order.indexOf(id)}` === id;
  const correctCount = order.filter(right).length;
  const kind = correctCount === items.length ? 'correct' : 'incorrect';
  return (
    <View style={{ rowGap: 12 }}>
      <View style={{ backgroundColor: C.surfaceVariant, borderRadius: 16, padding: 14 }}>
        <ReorderableList
          key={`${lang}-${result === 'none' ? 'live' : 'locked'}`}
          testID={`kit-order-${lang}`}
          items={items}
          layout="inline"
          noun={lang === 'km' ? 'ពាក្យ' : 'Word'}
          disabled={result === 'checked'}
          onOrderChange={setOrder}
          frameFor={item =>
            result === 'checked'
              ? tileFrameStyle(C, right(item.id) ? 'correct' : 'incorrect')
              : undefined
          }
          renderItem={(item, state) => (
            <MovableTile
              inList
              reserveAudio={!!item.audio}
              label={item.label}
              state={
                result === 'checked'
                  ? right(item.id)
                    ? 'correct'
                    : 'incorrect'
                  : state.picked
                    ? 'picked'
                    : 'default'
              }
            />
          )}
          renderAccessory={item =>
            item.audio ? (
              <OptionAudioCircle
                clipId={`ord-${lang}-${item.id}`}
                source={tone}
                label={item.label}
                placement="trailing-center"
                testID={`kit-audio-${item.id}`}
              />
            ) : null
          }
        />
      </View>
      {result === 'checked' ? (
        <ResultStrip
          testID={`kit-order-result-${lang}`}
          kind={kind}
          correctCount={correctCount}
          total={items.length}
          readBack={kind === 'correct' ? SENTENCE[lang] : undefined}
          onTryAgain={() => setResult('none')}
          onNext={() => setResult('none')}
          onShowAnswer={() => setResult('none')}
        />
      ) : (
        <Chip testID={`kit-order-check-${lang}`} label="Check answer" on={false} onPress={() => setResult('checked')} />
      )}
    </View>
  );
}

function GridDemo({ lang, tone, photo }: { lang: Lang; tone: number | undefined; photo: string }) {
  const items = useMemo<Word[]>(
    () => CAPTIONS[lang].map((w, i) => ({ id: `p${lang}${i}`, label: w })),
    [lang],
  );
  return (
    <View style={{ backgroundColor: C.surfaceVariant, borderRadius: 16, padding: 14 }}>
      <ReorderableList
        key={lang}
        testID={`kit-grid-${lang}`}
        items={items}
        layout="grid"
        noun={lang === 'km' ? 'រូបភាព' : 'Photo'}
        renderItem={(item, state) => (
          <MovableTile
            inList
            variant="image"
            reserveAudio
            label={item.label}
            badge={state.index + 1}
            // The first two have a picture, the others show the placeholder.
            imageSource={state.index < 2 ? photo : ''}
            state={state.picked ? 'picked' : 'default'}
          />
        )}
        renderAccessory={item => (
          <OptionAudioCircle
            clipId={`grid-${lang}-${item.id}`}
            source={tone}
            label={item.label}
            placement="bottom-right"
          />
        )}
      />
    </View>
  );
}

function ActiveClip() {
  const [id, setId] = useState<string | null>(audioManager.activeId);
  useEffect(() => {
    const t = setInterval(() => setId(audioManager.activeId), 150);
    return () => clearInterval(t);
  }, []);
  return (
    <Text testID="kit-active-clip" style={{ fontFamily: MONO, fontSize: 12, color: C.secondaryDark }}>
      playing: {id ?? '(none)'}
    </Text>
  );
}

export default function KitGalleryScreen() {
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const lang = (useAppSelector(getSelectedLanguage) === 'km' ? 'km' : 'en') as Lang;
  const [width, setWidth] = useState<'auto' | '390' | '760'>('auto');
  const [last, setLast] = useState('(nothing yet)');
  const tone = toneSource();
  const words = WORDS[lang];

  return (
    <ThemeProvider theme={corporateTheme}>
      {/* One announcer host for the whole screen (web: an always-mounted region). */}
      <AnnouncerProvider>
      <ScrollView
        style={{ flex: 1, backgroundColor: C.background }}
        contentContainerStyle={{
          paddingTop: insets.top + 24,
          paddingBottom: insets.bottom + 48,
        }}>
        <QuestionColumn style={width === 'auto' ? undefined : { maxWidth: Number(width) + 40 }}>
          <Label>DEV ONLY · CORPORATE QUESTION KIT</Label>
          <Text style={{ fontFamily: HEAD, fontSize: 28, color: C.onBackground, marginTop: 4, marginBottom: 12 }}>
            Kit gallery
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
            <Chip testID="kit-lang-en" label="English" on={lang === 'en'} onPress={() => dispatch(SettingActions.changeLanguageAction('en'))} />
            <Chip testID="kit-lang-km" label="ខ្មែរ" on={lang === 'km'} onPress={() => dispatch(SettingActions.changeLanguageAction('km'))} />
            <Chip testID="kit-w-auto" label="Full width" on={width === 'auto'} onPress={() => setWidth('auto')} />
            <Chip testID="kit-w-390" label="390" on={width === '390'} onPress={() => setWidth('390')} />
            <Chip testID="kit-w-760" label="760" on={width === '760'} onPress={() => setWidth('760')} />
          </View>

          <Section title="Movable tile · text" note="Seven states. The grip shows only while the tile can still move.">
            <Wrap>
              {TILE_STATES.map(s => (
                <Cell key={s} label={s.toUpperCase()}>
                  <MovableTile state={s} label={words[0]} testID={`kit-tile-${s}`} />
                </Cell>
              ))}
            </Wrap>
          </Section>

          <Section title="Movable tile · image" note="Missing pictures fall back to OptionImage's labelled tile (second column).">
            <Wrap>
              {(['default', 'picked', 'correct', 'incorrect'] as const).map((s, i) => (
                <Cell key={s} label={s.toUpperCase()}>
                  <View style={{ width: 150 }}>
                    <MovableTile
                      variant="image"
                      state={s}
                      label={CAPTIONS[lang][i]}
                      badge={i + 1}
                      imageSource={i % 2 === 0 ? PHOTO : ''}
                      testID={`kit-imgtile-${s}`}
                    />
                  </View>
                </Cell>
              ))}
            </Wrap>
          </Section>

          <Section title="Slot · blank" note="Flat: dashed when empty; the active state is the next blank to fill.">
            <Wrap>
              {SLOT_STATES.map(s => (
                <Cell key={s} label={s.toUpperCase()}>
                  <View style={{ width: 180, flexDirection: 'row' }}>
                    <Slot
                      state={s}
                      label={words[1]}
                      testID={`kit-slot-${s}`}
                      onPress={() => setLast(`slot ${s}`)}
                    />
                  </View>
                </Cell>
              ))}
            </Wrap>
            <Wrap>
              {SLOT_STATES.map(s => (
                <Cell key={s} label={`BLANK · ${s.toUpperCase()}`}>
                  <Slot variant="blank" state={s} label={words[1]} testID={`kit-blank-${s}`} />
                </Cell>
              ))}
            </Wrap>
          </Section>

          <Section title="Result marks">
            <Wrap>
              <Cell label="CORRECT">
                <ResultMark kind="correct" size={28} announce />
              </Cell>
              <Cell label="INCORRECT">
                <ResultMark kind="incorrect" size={28} announce />
              </Cell>
            </Wrap>
          </Section>

          <Section
            title="Inline result strip"
            note={`Announced as a polite live region. Last footer action: ${last}. Actions for incorrect: ${footerActions('incorrect').map(a => a.id).join(', ')}.`}>
            <ResultStrip
              testID="kit-strip-correct"
              kind="correct"
              correctCount={6}
              total={6}
              readBack={SENTENCE[lang]}
              onNext={() => setLast('next')}
            />
            <ResultStrip
              testID="kit-strip-incorrect"
              kind="incorrect"
              correctCount={4}
              total={6}
              onShowAnswer={() => setLast('show answer')}
              onTryAgain={() => setLast('try again')}
            />
            <ResultStrip kind="incorrect" onTryAgain={() => setLast('try again (no counts)')} />
          </Section>

          <Section title="Question audio" note="One clip plays at a time. The last pill points at a file that does not exist, to show the error state.">
            <ActiveClip />
            <View style={{ backgroundColor: C.surface, borderRadius: 16, borderWidth: 1, borderColor: C.divider, padding: 18, rowGap: 12 }}>
              <ListenPill clipId="q-1" source={tone} testID="kit-listen-1" />
              <ListenPill clipId="q-2" source={tone} testID="kit-listen-2" />
              <ListenPill clipId="q-missing" source="http://127.0.0.1:1/no-such-clip.mp3" testID="kit-listen-missing" />
            </View>
            <Wrap>
              <Cell label="OPTION CIRCLE">
                <OptionAudioCircle clipId="o-1" source={tone} label={words[0]} testID="kit-circle-1" />
              </Cell>
              <Cell label="SECOND CLIP">
                <OptionAudioCircle clipId="o-2" source={tone} label={words[1]} testID="kit-circle-2" />
              </Cell>
              <Cell label="MISSING FILE">
                <OptionAudioCircle clipId="o-missing" source="http://127.0.0.1:1/no-such-clip.mp3" testID="kit-circle-missing" />
              </Cell>
            </Wrap>
          </Section>

          <Section title="Word ordering with the kit" note="ReorderableList + MovableTile (inList) + OptionAudioCircle in renderAccessory. Check answer shows the result tint, marks and strip.">
            <OrderingDemo key={lang} lang={lang} tone={tone} />
          </Section>

          <Section title="Picture ordering with the kit">
            <GridDemo lang={lang} tone={tone} photo={PHOTO} />
          </Section>
        </QuestionColumn>
      </ScrollView>
      </AnnouncerProvider>
    </ThemeProvider>
  );
}

