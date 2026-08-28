/** Return lines inside every level-two heading whose text ends in "Ingredients". */
export function getIngredientSectionLines(body: string): string[] {
  const ingredientLines: string[] = [];
  let inIngredientSection = false;

  for (const line of body.split(/\r?\n/)) {
    const heading = /^##\s+(.+?)\s*#*\s*$/.exec(line);

    if (heading) {
      inIngredientSection = /ingredients$/i.test(heading[1].trim());
      continue;
    }

    if (inIngredientSection) ingredientLines.push(line);
  }

  return ingredientLines;
}

/** Preserve the compact text representation used by the MiniSearch document. */
export function compactMarkdown(markdown: string): string {
  return markdown
    .replace(/<!--[^]*?-->/g, ' ')
    .replace(/[`*_~>[\]#()-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Extract compact searchable text from every matching ingredient section. */
export function extractIngredientSections(body: string): string {
  return compactMarkdown(getIngredientSectionLines(body).join('\n'));
}

/** Extract human-readable ingredient lines without list markers or subsection headings. */
export function extractIngredientLines(body: string): string[] {
  const ingredients: string[] = [];

  for (const sectionLine of getIngredientSectionLines(body)) {
    const line = sectionLine.trim();

    if (!line || /^#{1,6}(?:\s|$)/.test(line)) continue;

    const withoutListMarker = line
      .replace(/^[-+*]\s+(?:\[[ xX]\]\s+)?/, '')
      .replace(/^\d+[.)]\s+/, '')
      .trim();

    if (withoutListMarker) ingredients.push(withoutListMarker);
  }

  return ingredients;
}
