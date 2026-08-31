import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const distDirectory = resolve(process.env.KITCHOOK_OUTPUT_DIR || 'dist');
const artifactPath = resolve(distDirectory, 'api/recipes.json');
const recipesDirectory = resolve(distDirectory, 'recipes');
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const arrayFields = ['aliases', 'tags', 'categories', 'cuisine', 'meal', 'ingredients'] as const;
const minuteFields = ['prepMinutes', 'cookMinutes', 'totalMinutes'] as const;
const allowedFields = new Set([
  'slug',
  'url',
  'title',
  'body',
  'description',
  ...arrayFields,
  ...minuteFields,
  'servings',
  'difficulty',
  'favorite',
  'source',
  'created',
  'updated',
  'image',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertNonEmptyString(value: unknown, label: string): asserts value is string {
  assert.equal(typeof value, 'string', `${label} must be a string.`);
  assert.ok(value.trim(), `${label} must not be blank.`);
}

function assertNoNullOrEmptyContainers(value: unknown, label: string): void {
  assert.notEqual(value, null, `${label} must not contain null.`);

  if (Array.isArray(value)) {
    assert.ok(value.length > 0, `${label} must not contain an empty array.`);
    value.forEach((item, index) => assertNoNullOrEmptyContainers(item, `${label}[${index}]`));
  } else if (isRecord(value)) {
    assert.ok(Object.keys(value).length > 0, `${label} must not contain an empty object.`);
    for (const [key, item] of Object.entries(value)) {
      assertNoNullOrEmptyContainers(item, `${label}.${key}`);
    }
  }
}

function assertDate(value: unknown, label: string): void {
  assertNonEmptyString(value, label);
  assert.match(value, datePattern, `${label} must use YYYY-MM-DD.`);
  assert.equal(
    new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10),
    value,
    `${label} must be a real calendar date.`,
  );
}

assert.ok(existsSync(artifactPath), 'dist/api/recipes.json was not generated.');
assert.ok(existsSync(recipesDirectory), 'dist/recipes/ was not generated.');

const parsed: unknown = JSON.parse(readFileSync(artifactPath, 'utf8'));
assert.ok(Array.isArray(parsed), 'Recipe API must contain a top-level array.');

const apiSlugs = new Set<string>();
const ordering: Array<{ title: string; slug: string }> = [];

for (const [index, value] of parsed.entries()) {
  const label = `Recipe API entry ${index}`;
  assert.ok(isRecord(value), `${label} must be an object.`);
  assertNoNullOrEmptyContainers(value, label);

  for (const field of Object.keys(value)) {
    assert.ok(allowedFields.has(field), `${label} contains unexpected field: ${field}`);
  }

  assertNonEmptyString(value.slug, `${label}.slug`);
  assert.match(value.slug, slugPattern, `${label}.slug is invalid: ${value.slug}`);
  assert.ok(!apiSlugs.has(value.slug), `Duplicate recipe API slug: ${value.slug}`);
  apiSlugs.add(value.slug);

  assertNonEmptyString(value.url, `${label}.url`);
  assert.equal(value.url, `/recipes/${value.slug}/`, `URL does not match slug: ${value.slug}`);
  assertNonEmptyString(value.title, `${label}.title`);
  assertNonEmptyString(value.body, `${label}.body`);
  ordering.push({ title: value.title, slug: value.slug });

  if (value.description !== undefined) {
    assertNonEmptyString(value.description, `${label}.description`);
  }

  for (const field of arrayFields) {
    if (value[field] === undefined) continue;
    assert.ok(Array.isArray(value[field]), `${label}.${field} must be an array.`);
    for (const [itemIndex, item] of value[field].entries()) {
      assertNonEmptyString(item, `${label}.${field}[${itemIndex}]`);
    }
  }

  for (const field of minuteFields) {
    if (value[field] === undefined) continue;
    assert.ok(
      Number.isInteger(value[field]) && (value[field] as number) >= 0,
      `${label}.${field} must be a nonnegative integer.`,
    );
  }

  if (value.servings !== undefined) {
    const validServings =
      (Number.isInteger(value.servings) && (value.servings as number) >= 0) ||
      (typeof value.servings === 'string' && Boolean(value.servings.trim()));
    assert.ok(validServings, `${label}.servings must be a nonnegative integer or non-blank string.`);
  }

  if (value.difficulty !== undefined) {
    assert.ok(
      ['easy', 'medium', 'hard'].includes(value.difficulty as string),
      `${label}.difficulty is invalid.`,
    );
  }
  if (value.favorite !== undefined) {
    assert.equal(value.favorite, true, `${label}.favorite may only be emitted when true.`);
  }

  if (value.source !== undefined) {
    assert.ok(isRecord(value.source), `${label}.source must be an object.`);
    for (const field of Object.keys(value.source)) {
      assert.ok(['name', 'url'].includes(field), `${label}.source contains unexpected field: ${field}`);
    }
    if (value.source.name !== undefined) {
      assertNonEmptyString(value.source.name, `${label}.source.name`);
    }
    if (value.source.url !== undefined) {
      assertNonEmptyString(value.source.url, `${label}.source.url`);
      assert.doesNotThrow(() => new URL(value.source.url as string), `${label}.source.url is invalid.`);
    }
  }

  if (value.created !== undefined) assertDate(value.created, `${label}.created`);
  if (value.updated !== undefined) assertDate(value.updated, `${label}.updated`);

  if (value.image !== undefined) {
    assert.ok(isRecord(value.image), `${label}.image must be an object.`);
    assert.deepEqual(
      Object.keys(value.image).sort(),
      ['format', 'height', 'src', 'width'],
      `${label}.image fields are invalid.`,
    );
    assertNonEmptyString(value.image.src, `${label}.image.src`);
    assert.match(value.image.src, /^\/(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$)).+/, `${label}.image.src must be root-relative.`);
    assert.ok(
      Number.isInteger(value.image.width) && (value.image.width as number) > 0,
      `${label}.image.width must be a positive integer.`,
    );
    assert.ok(
      Number.isInteger(value.image.height) && (value.image.height as number) > 0,
      `${label}.image.height must be a positive integer.`,
    );
    assertNonEmptyString(value.image.format, `${label}.image.format`);
    assert.match(value.image.format, /^[a-z0-9]+$/, `${label}.image.format is invalid.`);
    assert.ok(
      existsSync(resolve(distDirectory, `.${value.image.src}`)),
      `${label}.image.src does not reference a generated file.`,
    );
  }

  assert.ok(
    existsSync(resolve(recipesDirectory, value.slug, 'index.html')),
    `Recipe API route is missing for ${value.slug}.`,
  );
}

const alphabetized = [...ordering].sort(
  (left, right) =>
    left.title.localeCompare(right.title, 'en') || left.slug.localeCompare(right.slug, 'en'),
);
assert.deepEqual(ordering, alphabetized, 'Recipe API entries must be alphabetized by title and slug.');

const generatedRouteSlugs = new Set(
  readdirSync(recipesDirectory, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isDirectory() && existsSync(resolve(recipesDirectory, entry.name, 'index.html')),
    )
    .map((entry) => entry.name),
);
assert.deepEqual(
  [...apiSlugs].sort(),
  [...generatedRouteSlugs].sort(),
  'Generated recipe routes and recipe API slugs must match exactly.',
);

console.log(`Verified recipe API: ${parsed.length} active recipe${parsed.length === 1 ? '' : 's'}.`);
