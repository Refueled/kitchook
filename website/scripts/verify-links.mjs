import { readdir, readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

const output = resolve(process.argv[2] ?? 'dist');
const htmlFiles = [];

async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) await walk(path);
    else if (entry.name.endsWith('.html')) htmlFiles.push(path);
  }
}

async function exists(path) {
  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
}

function localPath(href) {
  if (!href || href.startsWith('#') || /^(?:[a-z]+:|\/\/)/i.test(href)) return null;
  const pathname = href.split(/[?#]/, 1)[0];
  return pathname.startsWith('/') ? pathname.slice(1) : pathname;
}

await walk(output);
const broken = [];
for (const htmlFile of htmlFiles) {
  const html = await readFile(htmlFile, 'utf8');
  for (const match of html.matchAll(/\bhref=(?:"([^"]*)"|'([^']*)')/gi)) {
    const href = match[1] ?? match[2];
    const path = localPath(href);
    if (path === null) continue;
    const target = resolve(output, path || '.');
    const candidates = path.endsWith('/') || !path.includes('.')
      ? [resolve(target, 'index.html'), target]
      : [target];
    if (!(await Promise.all(candidates.map(exists))).some(Boolean)) {
      broken.push(`${htmlFile.replace(`${output}/`, '')}: ${href}`);
    }
  }
}

if (broken.length) {
  console.error(`Broken local links:\n${broken.join('\n')}`);
  process.exit(1);
}

console.log(`Verified local links in ${htmlFiles.length} HTML files.`);
