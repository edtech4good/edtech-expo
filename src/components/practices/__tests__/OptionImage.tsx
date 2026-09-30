/**
 * OptionImage / MCQImageItem: an option picture that is missing or fails to
 * load must render a labelled, announced, still-selectable tile.
 *
 * Plain script run by `tsx` (package.json `test:image`), like the other
 * suites. Renders with react-test-renderer over react-native-web (see
 * nativeStubs.ts). Exits non-zero on the first failed check.
 */
import './nativeStubs';
import assert from 'node:assert/strict';
import i18next from 'i18next';
import React from 'react';
import { initReactI18next } from 'react-i18next';
import TestRenderer, { act, ReactTestRenderer } from 'react-test-renderer';
import corporateTokens from '../../../themes/tokens/corporate';
import kidsTokens from '../../../themes/tokens/kids';
import en from '../../../locales/en.json';
import km from '../../../locales/km.json';
import {
  hasImageSource,
  placeholderLabel,
  shouldShowPlaceholder,
} from '../../../utils/optionImage';
import DragItem from '../DragItem';
import DropItem from '../DropItem';
import MCQImageItem from '../MCQImageItem';
import OptionImage, { useOptionImageSlot } from '../OptionImage';

const h = React.createElement;
const KHMER_TEXT = 'ឆ្មាតូចមួយក្បាលកំពុងដេកលើកៅអីឈើ';

// react-native-web warns about the (native-correct) accessibility* prop names.
const warn = console.warn;
console.warn = (...a: unknown[]) => {
  if (!/is deprecated|useNativeDriver|style props are deprecated/.test(String(a[0]))) warn(...a);
};

let passed = 0;
function check(name: string, fn: () => void | Promise<void>) {
  return Promise.resolve(fn()).then(() => {
    passed += 1;
    console.log(`ok  ${name}`);
  });
}

function render(el: React.ReactElement): ReactTestRenderer {
  let r!: ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(el);
  });
  return r;
}

const placeholders = (r: ReactTestRenderer) =>
  r.root.findAll(n => n.props['data-testid'] === 'image-placeholder' && typeof n.type === 'string');
// The stubbed decorative backgrounds have src 'asset.png'; option pictures do not.
const images = (r: ReactTestRenderer) =>
  r.root.findAll(n => n.type === 'img' && n.props.src !== 'asset.png' && n.props.source !== undefined);
const textOf = (r: ReactTestRenderer) =>
  r.root
    .findAll(n => (n.type as unknown) === 'div' && n.props.dir !== undefined)
    .map(n => n.children.join(''))
    .join('|');

async function main() {
  await i18next
    .use(initReactI18next)
    .init({ lng: 'en', resources: { en: { translation: en }, km: { translation: km } } });

  await check('pure rules: blank sources are missing, text wins over generic label', () => {
    assert.equal(hasImageSource(''), false);
    assert.equal(hasImageSource('   '), false);
    assert.equal(hasImageSource(undefined), false);
    assert.equal(hasImageSource('https://media.test/a.png'), true);
    assert.equal(placeholderLabel('  Cat ', 'Image unavailable'), 'Cat');
    assert.equal(placeholderLabel('   ', 'Image unavailable'), 'Image unavailable');
    assert.equal(placeholderLabel(null, 'Image unavailable'), 'Image unavailable');
    assert.equal(shouldShowPlaceholder('a.png', 'a.png'), true);
    assert.equal(shouldShowPlaceholder('a.png', 'b.png'), false);
  });

  await check('both shipped languages define image.unavailable', () => {
    assert.equal(en.image.unavailable, 'Image unavailable');
    assert.ok(km.image.unavailable.length > 0);
    assert.notEqual(km.image.unavailable, en.image.unavailable);
  });

  await check('missing file: placeholder with the option text, no <img>', () => {
    const r = render(h(OptionImage, { source: '', label: 'Cat' }));
    assert.equal(images(r).length, 0);
    const p = placeholders(r);
    assert.equal(p.length, 1);
    assert.equal(p[0].props['aria-label'], 'Cat');
    assert.ok(textOf(r).includes('Cat'));
  });

  // Host elements that carry an accessible name (RNW renders aria-label).
  const labelled = (r: ReactTestRenderer) =>
    r.root.findAll(n => typeof n.type === 'string' && n.props['aria-label'] !== undefined);

  await check('accessibility: a standalone tile is one labelled image', () => {
    const r = render(h(OptionImage, { source: '', label: 'Cat' }));
    const els = labelled(r);
    assert.equal(els.length, 1);
    assert.equal(els[0].props.role, 'img');
    assert.equal(els[0].props['aria-label'], 'Cat');
  });

  function Tappable(props: { source: string; text?: string; onPress?: () => void }) {
    const { Pressable } = require('react-native-web');
    const slot = useOptionImageSlot(props.source, props.text);
    return h(
      Pressable,
      { accessibilityRole: 'button', accessibilityLabel: slot.accessibilityLabel, onPress: props.onPress },
      h(OptionImage, { source: props.source, slot }),
    );
  }

  await check('accessibility: inside a Pressable exactly one element carries the label and the tile is hidden', () => {
    const r = render(h(Tappable, { source: '', text: 'Cat' }));
    const els = labelled(r);
    assert.equal(els.length, 1);
    assert.equal(els[0].props.role, 'button');
    assert.equal(els[0].props['aria-label'], 'Cat');
    assert.equal(placeholders(r).length, 1);
    assert.equal(placeholders(r)[0].props['aria-hidden'], true);
    assert.notEqual(placeholders(r)[0].props.tabIndex, 0);
    // no text + missing picture: the parent announces the generic string
    const g = render(h(Tappable, { source: '' }));
    assert.equal(labelled(g).length, 1);
    assert.equal(labelled(g)[0].props['aria-label'], 'Image unavailable');
    // a loaded picture with no text has nothing to announce
    const ok = render(h(Tappable, { source: 'https://media.test/a.png' }));
    assert.equal(labelled(ok).length, 0);
  });

  await check('small slot with a long Khmer label: icon hidden, lines capped with an ellipsis; tall slot keeps the icon', () => {
    const long = KHMER_TEXT.repeat(4);
    const small = render(h(OptionImage, { source: '', label: long, style: { width: 100, height: 100 } }));
    assert.equal(small.root.findAll(n => n.type === 'svg').length, 0);
    const t = small.root.findAll(n => n.props.numberOfLines !== undefined)[0];
    // lines that fit: (height - border - 2 * padding) / caption line height
    assert.equal(t.props.numberOfLines, Math.floor(82 / corporateTokens.typeScale.en.phone.caption.lineHeight));
    assert.equal(t.props.ellipsizeMode, 'tail');
    assert.equal(placeholders(small)[0].props['aria-label'], long); // full text still announced
    const tall = render(h(OptionImage, { source: '', label: long, style: { width: 150, height: 150 } }));
    assert.equal(tall.root.findAll(n => n.type === 'svg').length, 1);
  });

  await check('no option text: generic localised "Image unavailable"', async () => {
    const r = render(h(OptionImage, { source: '', label: '' }));
    assert.equal(placeholders(r)[0].props['aria-label'], 'Image unavailable');
    await i18next.changeLanguage('km');
    const k = render(h(OptionImage, { source: '', label: null }));
    assert.equal(placeholders(k)[0].props['aria-label'], km.image.unavailable);
    await i18next.changeLanguage('en');
  });

  await check('Khmer option text is shown and announced verbatim', () => {
    const r = render(h(OptionImage, { source: '', label: KHMER_TEXT }));
    assert.equal(placeholders(r)[0].props['aria-label'], KHMER_TEXT);
    assert.ok(textOf(r).includes(KHMER_TEXT));
  });

  await check('present file: the image renders, no placeholder', () => {
    const r = render(h(OptionImage, { source: 'https://media.test/cat.png', label: 'Cat' }));
    assert.equal(placeholders(r).length, 0);
    assert.equal(images(r).length, 1);
    assert.equal(images(r)[0].props.source, 'https://media.test/cat.png');
  });

  await check('load error: falls back to the placeholder; a new source retries', () => {
    const r = render(h(OptionImage, { source: 'https://media.test/cat.png', label: 'Cat' }));
    act(() => {
      images(r)[0].props.onError({ error: 'offline' });
    });
    assert.equal(images(r).length, 0);
    assert.equal(placeholders(r).length, 1);
    assert.equal(placeholders(r)[0].props['aria-label'], 'Cat');
    act(() => {
      r.update(h(OptionImage, { source: 'https://media.test/dog.png', label: 'Dog' }));
    });
    assert.equal(placeholders(r).length, 0);
    assert.equal(images(r)[0].props.source, 'https://media.test/dog.png');
  });

  const option = (file: unknown, text: string) =>
    ({
      questionoptionid: 'opt-42',
      questionoptiontext: text,
      questionoptionfile: file,
      questionoptioniscorrect: true,
    }) as any;

  const wrapper = (r: ReactTestRenderer) =>
    r.root.findAll(n => n.props.testID === 'answer-option-0' && n.props.isSelected !== undefined)[0];

  await check('MCQImageItem: null file -> placeholder, and pressing it selects the same option', () => {
    const opt = option(null, 'Cat');
    const pressed: unknown[] = [];
    const r = render(h(MCQImageItem, { option: opt, index: 0, onPress: (o: unknown) => pressed.push(o) }));
    assert.equal(placeholders(r).length, 1);
    act(() => wrapper(r).props.onPress());
    assert.equal(pressed.length, 1);
    assert.equal(pressed[0], opt);
    assert.equal((pressed[0] as any).questionoptionid, 'opt-42');
    // one focus stop, on the Pressable, with the selected state
    const els = labelled(r);
    assert.equal(els.length, 1);
    assert.equal(els[0].props['aria-label'], 'Cat');
    assert.notEqual(els[0].props['aria-selected'], true);
    const sel = render(h(MCQImageItem, { option: opt, index: 0, isSelected: true, onPress: () => undefined }));
    assert.equal(labelled(sel)[0].props['aria-selected'], true);
  });

  await check('MCQImageItem: image and placeholder press the identical option and share selected styling', () => {
    const withFile = option({ filename: 'cat.png', filetype: 6 }, 'Cat');
    const noFile = option(undefined, 'Cat');
    const got: unknown[] = [];
    const a = render(h(MCQImageItem, { option: withFile, index: 0, isSelected: true, onPress: (o: unknown) => got.push(o) }));
    const b = render(h(MCQImageItem, { option: noFile, index: 0, isSelected: true, onPress: (o: unknown) => got.push(o) }));
    assert.equal(images(a).length, 1);
    assert.equal(placeholders(b).length, 1);
    assert.equal(wrapper(a).props.isSelected, true);
    assert.equal(wrapper(b).props.isSelected, true);
    act(() => wrapper(a).props.onPress());
    act(() => wrapper(b).props.onPress());
    assert.equal(got[0], withFile);
    assert.equal(got[1], noFile);
    const c = render(h(MCQImageItem, { option: noFile, index: 0, isSelected: false, onPress: () => undefined }));
    assert.equal(wrapper(c).props.isSelected, false);
  });

  await check('MCQImageItem: image that fails to load stays selectable', () => {
    const opt = option({ filename: 'cat.png', filetype: 6 }, KHMER_TEXT);
    const got: unknown[] = [];
    const r = render(h(MCQImageItem, { option: opt, index: 0, onPress: (o: unknown) => got.push(o) }));
    act(() => {
      images(r)[0].props.onError({});
    });
    assert.equal(placeholders(r).length, 1);
    assert.equal(labelled(r).length, 1); // the Pressable, once
    assert.equal(labelled(r)[0].props['aria-label'], KHMER_TEXT);
    act(() => wrapper(r).props.onPress());
    assert.equal(got[0], opt);
  });

  await check('tile text token reaches 4.5:1 on the tile fill in both themes', () => {
    const lum = (hex: string) => {
      const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(x => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
      return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    };
    const ratio = (a: string, b: string) => {
      const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
      return (hi + 0.05) / (lo + 0.05);
    };
    for (const t of [kidsTokens, corporateTokens]) {
      assert.ok(ratio(t.colors.onSurface, t.colors.surfaceVariant) >= 4.5, t.name);
    }
  });

  const dropOption = (file: unknown, text: string) =>
    ({ questionoptionid: 'drop-1', questionoptiontext: text, questionoptionfile: file }) as any;

  await check('DropItem: a picture option with no file name renders a labelled placeholder', () => {
    const r = render(h(DropItem, { option: dropOption({ filename: '', filetype: 6 }, 'Cat'), onPress: () => undefined } as any));
    assert.equal(placeholders(r).length, 1);
    assert.equal(placeholders(r)[0].props['aria-label'], 'Cat');
    const kh = render(h(DropItem, { option: dropOption({ filename: '', filetype: 6 }, KHMER_TEXT), onPress: () => undefined } as any));
    assert.equal(placeholders(kh)[0].props['aria-label'], KHMER_TEXT);
  });

  await check('DropItem: present picture renders the image; a load error swaps in the placeholder', () => {
    const r = render(h(DropItem, { option: dropOption({ filename: 'cat.png', filetype: 6 }, 'Cat'), onPress: () => undefined } as any));
    assert.equal(placeholders(r).length, 0);
    assert.equal(images(r).length, 1);
    act(() => {
      images(r)[0].props.onError({});
    });
    assert.equal(images(r).length, 0);
    assert.equal(placeholders(r)[0].props['aria-label'], 'Cat');
  });

  const dragOption = (file: unknown, text: string) =>
    ({
      questionoptionid: 'drag-1',
      questionassociate: { questionassociatetext: text, questionassociatefile: file },
    }) as any;
  const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

  await check('DragItem: a picture that fails to load shows the associate text on a placeholder and stays draggable-selectable', async () => {
    const opt = dragOption({ filename: 'cat.png', filetype: 6 }, KHMER_TEXT);
    const got: unknown[] = [];
    const r = render(h(DragItem, { option: opt, onPress: (o: unknown) => got.push(o) }));
    assert.equal(images(r).length, 1);
    act(() => {
      images(r)[0].props.onError({});
    });
    assert.equal(placeholders(r).length, 1);
    assert.equal(placeholders(r)[0].props['aria-label'], undefined); // parent carries it
    const els = labelled(r);
    assert.equal(els.length, 1);
    assert.equal(els[0].props['aria-label'], KHMER_TEXT);
    await act(async () => {
      await sleep(600); // let the zoom-in animation finish (press is ignored while opacity is 0)
    });
    const pressable = r.root.findAll(n => n.props.accessibilityLabel === KHMER_TEXT && typeof n.props.onPress === 'function')[0];
    act(() => pressable.props.onPress());
    assert.equal(got[0], opt);
    r.unmount();
  });

  await check('DragItem: no file name keeps the text tile; picture present renders the image', () => {
    const none = render(h(DragItem, { option: dragOption(null, 'Cat'), onPress: () => undefined }));
    assert.equal(images(none).length, 0);
    assert.equal(placeholders(none).length, 0);
    assert.ok(none.toJSON() && JSON.stringify(none.toJSON()).includes('Cat'));
    const pic = render(h(DragItem, { option: dragOption({ filename: 'cat.png', filetype: 6 }, 'Cat'), onPress: () => undefined }));
    assert.equal(images(pic).length, 1);
    assert.equal(placeholders(pic).length, 0);
    none.unmount();
    pic.unmount();
  });

  console.log(`\n${passed} checks passed`);
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
