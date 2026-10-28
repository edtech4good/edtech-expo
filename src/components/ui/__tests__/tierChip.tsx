/**
 * TierChip (Level Detail's programme / level pills): a long tier name must not
 * run off the row. Issue #139: the 75-character Khmer programme name clipped
 * at the right edge with no ellipsis and no wrap.
 *
 * Two parts.
 *  1. Structure (react-test-renderer over react-native-web, see
 *     src/components/practices/__tests__/nativeStubs.ts): one line with a tail
 *     ellipsis, the full name as the accessibility label, a width cap, and the
 *     face and Khmer floor (13/20) following the TEXT's language.
 *  2. Layout, measured: the same component is server-rendered with its real
 *     react-native-web styles into a 375px-wide page in Chromium, and the
 *     chip's box is measured against its row. This needs the `playwright`
 *     package and an installed Chromium, neither of which is a dependency of
 *     this repo: point PLAYWRIGHT_MODULE at a playwright package directory
 *     (e.g. a sibling repo's node_modules/playwright). Without it part 2 is
 *     reported as SKIPPED, never as passed.
 *
 * The Khmer text is an opaque run of code points of the Khmer block (never
 * words), 75 of them, as long as the real programme name. Plain script run by
 * `tsx` (package.json `test:tierchip`). Exits non-zero on the first failure.
 */
import '../../practices/__tests__/nativeStubs';
import Module from 'node:module';
import assert from 'node:assert/strict';
import React from 'react';

const h = React.createElement;
let language: 'en' | 'km' = 'en';
const extra: Record<string, unknown> = {
  // The real useFont, over a store that only knows the interface language.
  '@/redux': { __esModule: true, useAppSelector: (select: (s: unknown) => unknown) => select({ setting: { language } }) },
  '@/redux/slices': { __esModule: true, getSelectedLanguage: (s: { setting: { language: string } }) => s.setting.language },
};
const anyModule = Module as any;
const load = anyModule._load;
anyModule._load = function (request: string, ...rest: unknown[]) {
  if (request === '@/services')
    return { __esModule: true, useFont: require('../../../services/hooks/useFont').default };
  if (request in extra) return extra[request];
  return load.call(this, request, ...rest);
};

// eslint-disable-next-line import/first
import TestRenderer, { act, ReactTestRenderer } from 'react-test-renderer';

const KHMER_FACE = 'NotoSansKhmerRegular';
const LATIN_FACE = 'PlusJakartaSansRegular';
const ZWSP = '​';

const khmerRun = (n: number): string =>
  String.fromCodePoint(...Array.from({ length: n }, (_, i) => 0x1780 + (i % 35)));
const KM_75 = khmerRun(75);
// The same run with a zero-width space every 5 code points, as content should carry at word breaks.
const KM_75_ZWSP = KM_75.match(/.{5}/gu)!.join(ZWSP);
const EN_35 = 'Sustainable Building Design Practice'.slice(0, 35);
assert.equal(KM_75.length, 75);
assert.equal(EN_35.length, 35);

let passed = 0;
function check(name: string, fn: () => void) {
  try {
    fn();
    passed += 1;
    console.log(`ok  ${name}`);
  } catch (e) {
    console.error(`FAIL ${name}`);
    throw e;
  }
}

const TierChip = () => require('../TierChip').default;

function structure() {
  const render = (label: string, textLanguage?: string) => {
    let r!: ReactTestRenderer;
    act(() => {
      r = TestRenderer.create(
        h(TierChip(), { label, backgroundColor: '#eee', color: '#000', textLanguage }),
      );
    });
    return r;
  };
  const textOf = (r: ReactTestRenderer, label: string) => {
    const t = r.root.findAll(n => n.props?.children === label && 'numberOfLines' in n.props)[0];
    assert.ok(t, `a Text carrying ${label.slice(0, 6)}...`);
    return t!;
  };

  for (const lang of ['en', 'km'] as const) {
    language = lang;
    for (const [name, label] of [['75-char Khmer run', KM_75], ['75-char Khmer run with ZWSP', KM_75_ZWSP], ['35-char Latin', EN_35]] as const) {
      check(`[${lang}] ${name}: one line, tail ellipsis, full name as the accessibility label, width capped`, () => {
        const r = render(label);
        const t = textOf(r, label);
        assert.equal(t.props.numberOfLines, 1);
        assert.equal(t.props.ellipsizeMode, 'tail');
        assert.equal(t.props.style.flexShrink, 1);
        const box = r.root.findAll(n => n.props?.accessibilityLabel === label)[0];
        assert.ok(box, 'the chip carries the full name');
        assert.equal(box.props.accessibilityRole, 'text');
        const style = Array.isArray(box.props.style) ? Object.assign({}, ...box.props.style) : box.props.style;
        assert.equal(style.maxWidth, '100%');
        assert.equal(style.minHeight, 24); // chips use min-height, never a fixed height
        assert.equal(style.height, undefined);
      });
    }
  }

  check('the face and the Khmer floor follow the text, not the interface', () => {
    language = 'en';
    let t = textOf(render(KM_75, 'km'), KM_75).props.style;
    assert.equal(t.fontFamily, KHMER_FACE);
    assert.equal(t.fontSize, 13);
    assert.equal(t.lineHeight, 20);
    t = textOf(render(EN_35), EN_35).props.style;
    assert.equal(t.fontFamily, LATIN_FACE);
    assert.equal(t.fontSize, 12);
    assert.equal(t.lineHeight, undefined);
    language = 'km';
    t = textOf(render(EN_35, 'en'), EN_35).props.style;
    assert.equal(t.fontFamily, LATIN_FACE);
    assert.equal(t.fontSize, 12);
    t = textOf(render(KM_75), KM_75).props.style;
    assert.equal(t.fontFamily, KHMER_FACE);
    assert.equal(t.fontSize, 13);
    assert.equal(t.lineHeight, 20);
  });
}

async function layout() {
  const where = process.env.PLAYWRIGHT_MODULE;
  let chromium: any;
  try {
    chromium = require(where ?? 'playwright').chromium;
  } catch {
    console.log('SKIPPED layout (part 2): playwright is not resolvable; set PLAYWRIGHT_MODULE to a playwright package directory');
    return false;
  }
  const { renderToStaticMarkup } = require('react-dom/server');
  const { AppRegistry } = require('react-native-web');
  const { View } = require('react-native-web');

  const pageFor = (labels: string[]) => {
    const Row = () =>
      h(
        View,
        { testID: 'row', style: { width: 335, flexDirection: 'row', flexWrap: 'wrap', gap: 6 } },
        labels.map((label, i) => h(TierChip(), { key: i, label, backgroundColor: i ? '#16729A' : '#eee', color: i ? '#fff' : '#000' })),
      );
    AppRegistry.registerComponent('App', () => Row);
    const { element, getStyleElement } = AppRegistry.getApplication('App', {});
    const body = renderToStaticMarkup(element);
    const css = renderToStaticMarkup(getStyleElement());
    return `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=375">${css}<body style="margin:20px">${body}`;
  };

  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  try {
    const context = await browser.newContext({ viewport: { width: 375, height: 700 } });
    const page = await context.newPage();
    const cases: Array<[string, string[]]> = [
      ['75-char Khmer run + short level chip', [KM_75, 'L2']],
      ['75-char Khmer run with ZWSP + short level chip', [KM_75_ZWSP, 'L2']],
      ['35-char Latin + short level chip', [EN_35, 'L2']],
      ['two long chips', [KM_75, EN_35 + ' ' + EN_35]],
    ];
    for (const [name, labels] of cases) {
      language = labels[0] === EN_35 ? 'en' : 'km';
      // The server render warns that another renderer (the test renderer above) is loaded; harmless.
      const warn = console.error;
      console.error = () => undefined;
      const html = pageFor(labels);
      console.error = warn;
      await page.setContent(html);
      const m = await page.evaluate(() => {
        const row = document.querySelector('[data-testid="row"]') as HTMLElement;
        const rr = row.getBoundingClientRect();
        const chips = Array.from(row.children).map(c => {
          const r = c.getBoundingClientRect();
          const text = c.firstElementChild as HTMLElement;
          return { left: r.left, right: r.right, height: r.height, textClipped: text.scrollWidth > text.clientWidth };
        });
        return { row: { left: rr.left, right: rr.right }, chips, pageScroll: document.documentElement.scrollWidth, viewport: window.innerWidth };
      });
      check(`[browser 375px] ${name}: every chip inside its row, one line, no page overflow`, () => {
        for (const c of m.chips) {
          assert.ok(c.left >= m.row.left - 0.5, `chip left ${c.left} >= row ${m.row.left}`);
          assert.ok(c.right <= m.row.right + 0.5, `chip right ${c.right} <= row ${m.row.right}`);
          assert.ok(c.height <= 28, `one line: chip height ${c.height} <= 28`);
        }
        assert.ok(m.pageScroll <= m.viewport, `page scrollWidth ${m.pageScroll} <= viewport ${m.viewport}`);
      });
      if (labels[0] === KM_75 || labels[0] === KM_75_ZWSP) {
        check(`[browser 375px] ${name}: the long text is actually truncated (ellipsis engaged)`, () => {
          assert.equal(m.chips[0].textClipped, true);
        });
      } else {
        check(`[browser 375px] ${name}: a text that fits is not truncated`, () => {
          assert.equal(m.chips[0].textClipped, false);
        });
      }
    }
  } finally {
    await browser.close();
  }
  return true;
}

structure();
layout().then(ran => {
  console.log(`${passed} checks passed${ran ? '' : ' (layout part SKIPPED)'}`);
}).catch(e => {
  console.error(e);
  process.exit(1);
});
