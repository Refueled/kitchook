import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { loadInstanceConfig } from '../src/lib/instance-config.ts';

function temporaryContentDirectory(config) {
  const directory = mkdtempSync(join(tmpdir(), 'kitchook-config-'));
  writeFileSync(join(directory, 'instance.config.json'), config);
  return directory;
}

test('loads and normalizes the supported instance configuration', () => {
  const directory = temporaryContentDirectory(
    '{"title":" Family Recipes ","description":" Dinner notes ","canonicalOrigin":"https://recipes.example.com/"}',
  );

  try {
    assert.deepEqual(loadInstanceConfig(directory), {
      title: 'Family Recipes',
      description: 'Dinner notes',
      canonicalOrigin: 'https://recipes.example.com',
    });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('rejects unknown fields and invalid canonical origins with the config path', () => {
  const directory = temporaryContentDirectory(
    '{"title":"Recipes","description":"Notes","canonicalOrigin":"https://example.com/cookbook","extra":true}',
  );

  try {
    assert.throws(
      () => loadInstanceConfig(directory),
      new RegExp(`Invalid instance configuration at ${join(directory, 'instance.config.json').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`),
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('an alternate content directory builds routes, search, API output, and configured metadata', () => {
  const outputDirectory = resolve('dist');
  const result = spawnSync(process.execPath, ['node_modules/astro/bin/astro.mjs', 'build'], {
    cwd: resolve('.'),
    env: {
      ...process.env,
      KITCHOOK_CONTENT_DIR: resolve('tests/fixtures/alternate-cookbook'),
    },
    encoding: 'utf8',
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);

  const html = readFileSync(join(outputDirectory, 'index.html'), 'utf8');
  assert.match(html, /Weeknight Notes/);
  assert.match(html, /https:\/\/recipes\.example\.test\//);
  assert.ok(existsSync(join(outputDirectory, 'recipes/lemon-rice/index.html')));
  assert.deepEqual(
    JSON.parse(readFileSync(join(outputDirectory, 'api/recipes.json'), 'utf8')).map(({ slug }) => slug),
    ['lemon-rice'],
  );
  assert.ok(existsSync(join(outputDirectory, 'search/index.json')));
});
