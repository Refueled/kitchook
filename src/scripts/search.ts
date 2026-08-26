import MiniSearch, { type SearchResult } from 'minisearch';
import {
  matchesSearchFilters,
  recipeSearchOptions,
  searchIndexOptions,
  type SearchDocument,
  type SearchFilters,
  type StoredSearchResult,
} from '../lib/search';

const RESULT_LIMIT = 20;
const DEBOUNCE_MS = 160;

function initializeRecipeSearch(): void {
  const form = document.querySelector<HTMLFormElement>('[data-recipe-search]');
  if (!form) return;

  const queryInput = form.querySelector<HTMLInputElement>('[data-search-query]');
  const favoriteInput = form.querySelector<HTMLInputElement>('[data-search-favorite]');
  const categoryInputs = [...form.querySelectorAll<HTMLInputElement>('[data-search-category]')];
  const tagInputs = [...form.querySelectorAll<HTMLInputElement>('[data-search-tag]')];
  const status = document.querySelector<HTMLElement>('[data-search-status]');
  const help = document.querySelector<HTMLElement>('[data-search-help]');
  const resultList = document.querySelector<HTMLOListElement>('[data-search-results]');

  if (!queryInput || !favoriteInput || !status || !help || !resultList) return;

  let indexPromise: Promise<MiniSearch<SearchDocument>> | undefined;
  let debounceTimer: number | undefined;
  let requestSequence = 0;

  const loadIndex = (): Promise<MiniSearch<SearchDocument>> => {
    indexPromise ??= fetch('/search/index.json', { headers: { Accept: 'application/json' } })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Search index request failed (${response.status}).`);
        const index = MiniSearch.loadJSON<SearchDocument>(await response.text(), searchIndexOptions);
        if (index.documentCount < 1) throw new Error('Search index is empty.');
        return index;
      })
      .catch((error: unknown) => {
        indexPromise = undefined;
        throw error;
      });

    return indexPromise;
  };

  const readFilters = (): SearchFilters => ({
    favorite: favoriteInput.checked,
    categories: categoryInputs.filter(({ checked }) => checked).map(({ value }) => value),
    tags: tagInputs.filter(({ checked }) => checked).map(({ value }) => value),
  });

  const hasFilters = (filters: SearchFilters): boolean =>
    filters.favorite || filters.categories.length > 0 || filters.tags.length > 0;

  const syncUrl = (): void => {
    const url = new URL(window.location.href);
    const query = queryInput.value.trim();
    const filters = readFilters();

    url.searchParams.delete('q');
    url.searchParams.delete('favorite');
    url.searchParams.delete('category');
    url.searchParams.delete('tag');

    if (query) url.searchParams.set('q', query);
    if (filters.favorite) url.searchParams.set('favorite', 'true');
    for (const category of filters.categories) url.searchParams.append('category', category);
    for (const tag of filters.tags) url.searchParams.append('tag', tag);

    window.history.replaceState(null, '', url);
  };

  const restoreControls = (): void => {
    const parameters = new URLSearchParams(window.location.search);
    const selectedCategories = new Set(parameters.getAll('category'));
    const selectedTags = new Set(parameters.getAll('tag'));

    queryInput.value = parameters.get('q') ?? '';
    favoriteInput.checked = parameters.has('favorite') && parameters.get('favorite') !== 'false';
    for (const input of categoryInputs) input.checked = selectedCategories.has(input.value);
    for (const input of tagInputs) input.checked = selectedTags.has(input.value);
  };

  const setStatus = (message: string, isError = false): void => {
    status.textContent = message;
    status.classList.toggle('search-status--error', isError);
  };

  const showEmptyState = (): void => {
    resultList.replaceChildren();
    resultList.hidden = true;
    help.hidden = false;
    setStatus('Enter a search or choose a filter to find a recipe.');
  };

  const renderResults = (results: StoredSearchResult[]): void => {
    const fragment = document.createDocumentFragment();

    for (const result of results) {
      assertStoredResult(result);
      const item = document.createElement('li');
      item.className = 'search-result';
      const article = document.createElement('article');

      if (result.favorite) {
        const favorite = document.createElement('span');
        favorite.className = 'favorite-badge';
        favorite.textContent = '★ Favorite';
        article.append(favorite);
      }

      const heading = document.createElement('h2');
      const link = document.createElement('a');
      link.href = result.url;
      link.textContent = result.title;
      heading.append(link);
      article.append(heading);

      if (result.description) {
        const description = document.createElement('p');
        description.className = 'search-result__description';
        description.textContent = result.description;
        article.append(description);
      }

      const taxonomyParts: string[] = [];
      if (result.categoryValues.length > 0) {
        taxonomyParts.push(`Categories: ${result.categoryValues.join(', ')}`);
      }
      if (result.tagValues.length > 0) taxonomyParts.push(`Tags: ${result.tagValues.join(', ')}`);
      if (taxonomyParts.length > 0) {
        const taxonomy = document.createElement('p');
        taxonomy.className = 'search-result__taxonomy';
        taxonomy.textContent = taxonomyParts.join(' · ');
        article.append(taxonomy);
      }

      const metadata = createMetadata(result);
      if (metadata) article.append(metadata);

      item.append(article);
      fragment.append(item);
    }

    resultList.replaceChildren(fragment);
    resultList.hidden = false;
    help.hidden = true;
  };

  const runSearch = async (): Promise<void> => {
    const sequence = ++requestSequence;
    const query = queryInput.value.trim();
    const filters = readFilters();

    if (!query && !hasFilters(filters)) {
      showEmptyState();
      return;
    }

    resultList.hidden = true;
    help.hidden = true;
    setStatus('Loading recipe search…');

    try {
      const index = await loadIndex();
      if (sequence !== requestSequence) return;

      const filter = (candidate: SearchResult) => {
        const storedResult = candidate as StoredSearchResult;
        assertStoredResult(storedResult);
        return matchesSearchFilters(storedResult, filters);
      };
      const matches = (
        query
          ? index.search(query, { ...recipeSearchOptions, filter })
          : index.search(MiniSearch.wildcard, { filter })
      ) as StoredSearchResult[];
      const visibleResults = matches.slice(0, RESULT_LIMIT);

      if (visibleResults.length === 0) {
        resultList.replaceChildren();
        resultList.hidden = true;
        help.hidden = true;
        setStatus('No recipes matched. Try another spelling or remove a filter.');
        return;
      }

      renderResults(visibleResults);
      const recipeLabel = matches.length === 1 ? 'recipe' : 'recipes';
      setStatus(
        matches.length > RESULT_LIMIT
          ? `Showing the first ${RESULT_LIMIT} of ${matches.length} matching ${recipeLabel}.`
          : `${matches.length} matching ${recipeLabel}.`,
      );
    } catch (error: unknown) {
      if (sequence !== requestSequence) return;
      console.error('Recipe search failed.', error);
      resultList.replaceChildren();
      resultList.hidden = true;
      help.hidden = true;
      setStatus('Search could not be loaded. Refresh the page or browse all recipes instead.', true);
    }
  };

  const scheduleSearch = (): void => {
    window.clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(() => void runSearch(), DEBOUNCE_MS);
  };

  queryInput.addEventListener('input', () => {
    requestSequence += 1;
    syncUrl();
    scheduleSearch();
  });

  form.addEventListener('change', () => {
    syncUrl();
    window.clearTimeout(debounceTimer);
    void runSearch();
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    syncUrl();
    window.clearTimeout(debounceTimer);
    void runSearch();
  });

  window.addEventListener('popstate', () => {
    restoreControls();
    window.clearTimeout(debounceTimer);
    void runSearch();
  });

  restoreControls();
  void runSearch();
}

function createMetadata(result: StoredSearchResult): HTMLDListElement | undefined {
  const items: Array<[string, string, boolean?]> = [];
  if (result.totalMinutes !== undefined) items.push(['Total', `${result.totalMinutes} min`]);
  if (result.servings !== undefined) items.push(['Serves', String(result.servings)]);
  if (result.difficulty !== undefined) items.push(['Difficulty', result.difficulty, true]);
  if (items.length === 0) return undefined;

  const list = document.createElement('dl');
  list.className = 'recipe-meta recipe-meta--card search-result__meta';

  for (const [label, value, capitalize] of items) {
    const item = document.createElement('div');
    item.className = 'recipe-meta__item';
    const term = document.createElement('dt');
    const description = document.createElement('dd');
    term.textContent = label;
    description.textContent = value;
    if (capitalize) description.className = 'recipe-meta__difficulty';
    item.append(term, description);
    list.append(item);
  }

  return list;
}

function assertStoredResult(result: StoredSearchResult): void {
  const validDifficulty =
    result.difficulty === undefined || ['easy', 'medium', 'hard'].includes(result.difficulty);
  const validServings =
    result.servings === undefined ||
    typeof result.servings === 'string' ||
    typeof result.servings === 'number';

  if (
    typeof result.id !== 'string' ||
    typeof result.url !== 'string' ||
    !/^\/recipes\/[a-z0-9]+(?:-[a-z0-9]+)*\/$/.test(result.url) ||
    typeof result.title !== 'string' ||
    typeof result.description !== 'string' ||
    typeof result.favorite !== 'boolean' ||
    !Array.isArray(result.categoryValues) ||
    !result.categoryValues.every((value) => typeof value === 'string') ||
    !Array.isArray(result.tagValues) ||
    !result.tagValues.every((value) => typeof value === 'string') ||
    (result.totalMinutes !== undefined && typeof result.totalMinutes !== 'number') ||
    !validServings ||
    !validDifficulty
  ) {
    throw new Error('Search index contains malformed stored recipe metadata.');
  }
}

initializeRecipeSearch();
