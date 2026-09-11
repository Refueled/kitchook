import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
const read = (relative) => readFileSync(path.join(root, relative), 'utf8');

const brandCss = read('packages/brand/brand.css');
const tokensCss = read('packages/brand/tokens.css');
const darkCss = read('packages/brand/dark.css');
const fontsCss = read('packages/brand/fonts.css');
const focusCss = read('packages/brand/focus.css');
const globalCss = read('src/styles/global.css');

test('the app consumes the shared identity instead of redeclaring it', () => {
  assert.match(globalCss, /@import\s+"@kitchook\/brand\/brand\.css";/);
  assert.doesNotMatch(globalCss, /@font-face/, 'global.css must not redeclare font faces');
  assert.doesNotMatch(globalCss, /--coral:\s*#e99898/, 'global.css must not redeclare brand tokens');
  assert.doesNotMatch(globalCss, /prefers-color-scheme:\s*dark/, 'dark tokens belong to @kitchook/brand');
});

test('brand.css exposes tokens, fonts, dark mode, and focus to consumers', () => {
  for (const part of ['./fonts.css', './tokens.css', './dark.css', './focus.css']) {
    assert.match(brandCss, new RegExp(`@import\\s+"${part.replaceAll('.', '\\.')}";`));
  }
});

test('every token the app relied on is still defined by the brand package', () => {
  const required = [
    '--ink', '--paper', '--surface', '--muted', '--border', '--shadow',
    '--yellow', '--coral', '--blue', '--mint', '--accent-ink', '--focus',
    '--border-width', '--shadow-offset', '--content-width', '--recipe-width',
    '--heading-font', '--body-font',
  ];

  for (const token of required) {
    assert.match(tokensCss, new RegExp(`${token}:`), `tokens.css must define ${token}`);
  }
});

test('base tokens stay light so a light-only surface can opt out of dark mode', () => {
  assert.doesNotMatch(tokensCss, /prefers-color-scheme/, 'dark overrides belong to dark.css');
});

test('dark mode keeps the named accents and re-points the foundations', () => {
  const dark = darkCss;
  for (const token of ['--ink', '--paper', '--surface', '--muted', '--border', '--shadow', '--focus']) {
    assert.match(dark, new RegExp(`${token}:`), `dark mode must override ${token}`);
  }
  assert.doesNotMatch(dark, /--coral:|--yellow:|--blue:|--mint:/, 'named accents keep their identity');
});

test('the focus contract is the documented 4px ring at 4px offset', () => {
  assert.match(focusCss, /outline:\s*4px solid transparent;/);
  assert.match(focusCss, /outline-offset:\s*4px;/);
  assert.match(focusCss, /outline-color:\s*var\(--focus\);/);
  assert.match(focusCss, /prefers-reduced-motion/);
});

test('font faces reference files the brand package ships', () => {
  const shipped = new Set(readdirSync(path.join(root, 'packages/brand/fonts')));
  const referenced = [...fontsCss.matchAll(/url\("\/fonts\/([^"]+)"\)/g)].map((match) => match[1]);

  assert.ok(referenced.length >= 5, 'all five families are declared');
  for (const file of referenced) {
    assert.ok(shipped.has(file), `packages/brand/fonts must ship ${file}`);
  }
});

test('the generator serves byte-identical copies of the brand fonts', () => {
  const served = readdirSync(path.join(root, 'public/fonts')).filter((name) => name.endsWith('.woff2'));

  for (const file of served) {
    const fromBrand = path.join(root, 'packages/brand/fonts', file);
    const fromPublic = path.join(root, 'public/fonts', file);
    assert.ok(readdirSync(path.join(root, 'packages/brand/fonts')).includes(file), `${file} must exist in @kitchook/brand`);
    assert.equal(
      readFileSync(fromPublic).equals(readFileSync(fromBrand)),
      true,
      `public/fonts/${file} must be byte-identical to the brand package copy`,
    );
  }
});
