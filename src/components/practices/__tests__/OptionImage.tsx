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
import en from '../../../locales/en.json';
import km from '../../../locales/km.json';
import {
  hasImageSource,
  placeholderLabel,
  shouldShowPlaceholder,
} from '../../../utils/optionImage';
import MCQImageItem from '../MCQImageItem';
import OptionImage from '../OptionImage';

const h = React.createElement;
const KHMER_TEXT = 'ឆ្មាតូចមួយក្បាលកំពុងដេកលើកៅអីឈើ';

// react-native-web warns about the (native-correct) accessibility* prop names.
const warn = console.warn;
console.warn = (...a: unknown[]) => {
  if (!String(a[0]).includes('is deprecated')) warn(...a);
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
const images = (r: ReactTestRenderer) => r.root.findAll(n => n.type === 'img');
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

  await check('accessibility: label announced, role image (static) or button (tappable)', () => {
    const p1 = placeholders(render(h(OptionImage, { source: '', label: 'Cat' })))[0];
    assert.equal(p1.props.role, 'img');
    const p2 = placeholders(render(h(OptionImage, { source: '', label: 'Cat', tappable: true })))[0];
    assert.equal(p2.props.role, 'button');
    assert.equal(p2.props['aria-label'], 'Cat');
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
    assert.equal(placeholders(r)[0].props['aria-label'], KHMER_TEXT);
    act(() => wrapper(r).props.onPress());
    assert.equal(got[0], opt);
  });

  console.log(`\n${passed} checks passed`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
