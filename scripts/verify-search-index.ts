import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import MiniSearch from 'minisearch';
import { SEARCH_STORE_FIELDS, searchIndexOptions, type SearchDocument } from '../src/lib/search.ts';

const distDirectory = resolve('dist');
const artifactPath = resolve(distDirectory, 'search/index.json');
const recipesDirectory = resolve(distDirectory, 'recipes');

assert.ok(existsSync(artifactPath), 'dist/search/index.json was not generated.');
assert.ok(existsSync(recipesDirectory), 'dist/recipes/ was not generated.');

const serialized = readFileSync(artifactPath, 'utf8');
const plainIndex = JSON.parse(serialized) as {
  storedFields?: Record<string, Record<string, unknown>>;
};
const index = MiniSearch.loadJSON<SearchDocument>(serialized, searchIndexOptions);
const results = index.search(MiniSearch.wildcard);

assert.ok(index.documentCount > 0, 'Search index must contain at least one active recipe.');
assert.equal(results.length, index.documentCount, 'Wildcard results must enumerate every indexed recipe.');
assert.ok(plainIndex.storedFields, 'Serialized search index is missing stored fields.');

const allowedStoredFields = new Set<string>(SEARCH_STORE_FIELDS);
for (const storedFields of Object.values(plainIndex.storedFields)) {
  for (const field of Object.keys(storedFields)) {
    assert.ok(allowedStoredFields.has(field), `Unexpected stored search field: ${field}`);
  }
}

const indexedIds = new Set<string>();
for (const result of results) {
  assert.equal(typeof result.id, 'string', 'Every indexed recipe ID must be a string.');
  assert.match(result.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/, `Invalid indexed recipe ID: ${result.id}`);
  assert.ok(!indexedIds.has(result.id), `Duplicate indexed recipe ID: ${result.id}`);
  indexedIds.add(result.id);

  assert.equal(result.url, `/recipes/${result.id}/`, `Stored URL does not match recipe ID: ${result.id}`);
  assert.equal(typeof result.title, 'string', `Stored title is missing for ${result.id}`);
  assert.ok(result.title.trim(), `Stored title is blank for ${result.id}`);
  assert.equal(typeof result.description, 'string', `Stored description is invalid for ${result.id}`);
  assert.equal(typeof result.favorite, 'boolean', `Stored favorite is invalid for ${result.id}`);
  assert.ok(Array.isArray(result.categoryValues), `Stored categories are invalid for ${result.id}`);
  assert.ok(Array.isArray(result.tagValues), `Stored tags are invalid for ${result.id}`);
  assert.ok(
    existsSync(resolve(recipesDirectory, result.id, 'index.html')),
    `Indexed recipe route is missing for ${result.id}`,
  );
}

const generatedRouteIds = new Set(
  readdirSync(recipesDirectory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(resolve(recipesDirectory, entry.name, 'index.html')))
    .map((entry) => entry.name),
);

assert.deepEqual(
  [...indexedIds].sort(),
  [...generatedRouteIds].sort(),
  'Generated recipe routes and indexed active recipes must match exactly.',
);

const indexedTitles = results.map(({ title }) => title as string);
const alphabetizedTitles = [...indexedTitles].sort((left, right) => left.localeCompare(right, 'en'));
assert.deepEqual(indexedTitles, alphabetizedTitles, 'Wildcard results must preserve alphabetical recipe order.');

console.log(`Verified search index: ${results.length} active recipe${results.length === 1 ? '' : 's'}.`);
