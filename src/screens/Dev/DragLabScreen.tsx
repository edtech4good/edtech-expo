import {
  GripGlyph,
  ReorderableList,
  ReorderItem,
  ReorderStatus,
  TileState,
} from '@/components/drag';
import { corporateTheme } from '@/themes/Themes';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemeProvider } from 'styled-components/native';

// __DEV__-only harness for the drag primitive (src/components/drag). See
// app/(app)/drag-lab.tsx for the route guard. It renders the two layouts
// from the approved corporate question-type design with sample data and
// shows the order each list reports. It is not wired into any question
// renderer. It always uses the corporate theme, whatever the school's.

const C = corporateTheme.colors;
const EN_FONT = 'PlusJakartaSansSemiBold';
const KM_FONT = 'NotoSansKhmerSemiBold';

interface Word extends ReorderItem {
  font: string;
}
interface Photo extends ReorderItem {
  tint: string;
  letter: string;
}

// The approved mockup's sentence ("Write every sale in your book.") in its
// shuffled order, and the Khmer sentence from the same page ("I record all
// sales in the book every day.").
const EN_WORDS: Word[] = ['sale', 'in', 'Write', 'book', 'every', 'your'].map(
  (w, i) => ({ id: `en${i + 1}`, label: w, font: EN_FONT }),
);
const KM_WORDS: Word[] = [
  'ខ្ញុំ',
  'កត់ត្រា',
  'ការលក់',
  'ទាំងអស់',
  'ក្នុង',
  'សៀវភៅ',
  'រាល់ថ្ងៃ',
].map((w, i) => ({ id: `km${i + 1}`, label: w, font: KM_FONT }));

const PHOTOS: Photo[] = [
  { id: 'p3', label: 'Take payment', tint: '#FDE7DC', letter: 'C' },
  { id: 'p1', label: 'Greet the customer', tint: '#E7EFFF', letter: 'A' },
  { id: 'p4', label: 'Give the receipt', tint: '#E9FBF3', letter: 'D' },
  { id: 'p2', label: 'Show the product', tint: '#E6DDFF', letter: 'B' },
  { id: 'p5', label: 'Pack the goods', tint: '#FFF4D6', letter: 'E' },
  { id: 'p6', label: 'Say goodbye', tint: '#E6F7F8', letter: 'F' },
];

function statusLine(s: ReorderStatus, noun: string): string {
  switch (s.kind) {
    case 'picked':
      return `“${s.label}” picked. Tap the ${noun} to swap it with, or tap it again to cancel.`;
    case 'dragging':
      return s.target
        ? `Moving “${s.label}”. Release to place it ${s.target}.`
        : `Moving “${s.label}”.`;
    default:
      return `Drag a ${noun} to move it, or tap two to swap them.`;
  }
}

function WordTile({ item, state }: { item: Word; state: TileState }) {
  return (
    <Text
      style={{
        fontFamily: item.font,
        fontSize: 17,
        lineHeight: item.font === KM_FONT ? 28 : 22,
        color: state.picked ? C.primaryDark : C.onBackground,
      }}>
      {item.label}
    </Text>
  );
}

function PhotoTile({ item, state }: { item: Photo; state: TileState }) {
  return (
    <View style={{ rowGap: 6 }}>
      <View
        style={{
          height: 104,
          borderRadius: 10,
          backgroundColor: item.tint,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Text style={{ fontFamily: 'SpaceMonoRegular', fontSize: 12, color: C.placeholder }}>
          PHOTO {item.letter}
        </Text>
      </View>
      <View
        style={{
          position: 'absolute',
          top: 7,
          left: 7,
          width: 28,
          height: 28,
          borderRadius: 14,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: state.picked || state.lifted ? C.primary : '#FFFFFF',
        }}>
        <Text
          style={{
            fontFamily: 'SpaceGroteskBold',
            fontSize: 13,
            color: state.picked || state.lifted ? '#FFFFFF' : C.secondaryDark,
          }}>
          {state.index + 1}
        </Text>
      </View>
      <View
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: 32,
          height: 32,
          borderRadius: 10,
          backgroundColor: 'rgba(255,255,255,0.95)',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <GripGlyph color={C.placeholder} />
      </View>
      <Text
        style={{
          fontFamily: EN_FONT,
          fontSize: 13,
          lineHeight: 17,
          minHeight: 34,
          paddingHorizontal: 4,
          color: C.onBackground,
        }}>
        {item.label}
      </Text>
    </View>
  );
}

function Section<T extends ReorderItem>({
  title,
  items,
  layout,
  noun,
  render,
  testID,
}: {
  title: string;
  items: T[];
  layout: 'inline' | 'grid';
  noun: string;
  render: (item: T, state: TileState) => JSX.Element;
  testID: string;
}) {
  const [order, setOrder] = useState<string[]>(items.map(i => i.id));
  const [status, setStatus] = useState<ReorderStatus>({ kind: 'idle' });
  const [epoch, setEpoch] = useState(0);
  const live = status.kind !== 'idle';
  return (
    <View style={{ rowGap: 12, marginBottom: 28 }}>
      <Text style={{ fontFamily: 'SpaceGroteskBold', fontSize: 18, color: C.onBackground }}>
        {title}
      </Text>
      <Text
        testID={`${testID}-status`}
        style={{
          fontFamily: 'PlusJakartaSansRegular',
          fontSize: 13,
          lineHeight: 18,
          color: live ? C.onBackground : C.placeholder,
          backgroundColor: live ? C.primaryLight : 'transparent',
          borderRadius: 12,
          paddingVertical: live ? 8 : 0,
          paddingHorizontal: live ? 12 : 0,
        }}>
        {statusLine(status, noun.toLowerCase())}
      </Text>
      <View style={{ backgroundColor: C.surfaceVariant, borderRadius: 16, padding: 14 }}>
        <ReorderableList
          key={epoch}
          testID={testID}
          items={items}
          layout={layout}
          noun={noun}
          renderItem={render}
          onOrderChange={setOrder}
          onStatusChange={setStatus}
        />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', columnGap: 12 }}>
        <Text
          testID={`${testID}-order`}
          style={{ flex: 1, fontFamily: 'SpaceMonoRegular', fontSize: 12, color: C.secondaryDark }}>
          order: {JSON.stringify(order)}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setOrder(items.map(i => i.id));
            setStatus({ kind: 'idle' });
            setEpoch(e => e + 1);
          }}
          style={{
            minHeight: 44,
            paddingHorizontal: 14,
            borderRadius: 22,
            borderWidth: 1.5,
            borderColor: C.primary,
            justifyContent: 'center',
          }}>
          <Text style={{ fontFamily: EN_FONT, color: C.primary }}>Reset</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function DragLabScreen() {
  const insets = useSafeAreaInsets();
  return (
    <ThemeProvider theme={corporateTheme}>
      <ScrollView
        style={{ flex: 1, backgroundColor: C.background }}
        contentContainerStyle={{
          paddingTop: insets.top + 24,
          paddingBottom: insets.bottom + 24,
          paddingHorizontal: 20,
        }}>
        <View style={{ width: '100%', maxWidth: 760, alignSelf: 'center' }}>
          <Text style={{ fontFamily: 'SpaceMonoRegular', fontSize: 12, letterSpacing: 2, color: C.primary }}>
            DEV ONLY · DRAG LAB
          </Text>
          <Text
            style={{
              fontFamily: 'SpaceGroteskBold',
              fontSize: 24,
              color: C.onBackground,
              marginTop: 4,
              marginBottom: 20,
            }}>
            Reorder primitive
          </Text>
          <Section
            title="Word ordering"
            testID="words-en"
            items={EN_WORDS}
            layout="inline"
            noun="Word"
            render={(item, state) => <WordTile item={item} state={state} />}
          />
          <Section
            title="Word ordering · Khmer"
            testID="words-km"
            items={KM_WORDS}
            layout="inline"
            noun="Word"
            render={(item, state) => <WordTile item={item} state={state} />}
          />
          <Section
            title="Picture ordering"
            testID="photos"
            items={PHOTOS}
            layout="grid"
            noun="Photo"
            render={(item, state) => <PhotoTile item={item} state={state} />}
          />
        </View>
      </ScrollView>
    </ThemeProvider>
  );
}
