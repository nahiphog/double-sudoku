import { mkdir, readFile, writeFile, copyFile, rm } from 'node:fs/promises';
import path from 'node:path';

// Remove retired routes from previous local builds as well as fresh deployments.
const outputRoot = path.resolve('_site');
for (const route of ['daily', 'archive', 'double/daily', 'double/archive', 'triple/daily', 'triple/archive']) {
  const target = path.resolve(outputRoot, route);
  if (!target.startsWith(outputRoot + path.sep)) throw new Error('Invalid output path');
  await rm(target, { recursive: true, force: true });
}
import { examples, renderExample } from './technique-examples.mjs';

// Pages serves directories rather than applying Vercel's catch-all rewrite.
const html = await readFile('index.html', 'utf8');
let techniques = await readFile('techniques.html', 'utf8');
for (const example of examples) {
  techniques = techniques.replace(`<!-- example:${example.id} -->`, renderExample(example));
}
const triple = await readFile('triple.html', 'utf8');
const tripleBuild = await readFile('triple-build.html', 'utf8');
const sitemap = await readFile('sitemap.xml', 'utf8');
const base = 'https://nahiphog.github.io/double-sudoku/';
const routes = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(([, url]) => {
  if (!url.startsWith(base)) throw new Error(`Unexpected sitemap URL: ${url}`);
  return url.slice(base.length).replace(/\/$/, '');
});
for (const route of routes) {
  const directory = route ? `_site/${route}` : '_site';
  await mkdir(directory, { recursive: true });
  await writeFile(`${directory}/index.html`, route === 'triple/build' ? tripleBuild : route.startsWith('triple/') ? triple : route === 'double/techniques' ? techniques : html);
}
// Keep old bookmarks working while sending visitors to the namespaced URLs.
const aliases = new Map([['', 'double/generate'], ['double', 'double/generate'], ['triple', 'triple/play']]);
for (const route of routes) if (route.startsWith('double/')) aliases.set(route.slice(7), route);
for (const [alias, target] of aliases) {
  const directory = alias ? `_site/${alias}` : '_site';
  const url = `/double-sudoku/${target}/`;
  const redirect = alias === 'triple' ? `['#simulation','#walkthrough'].includes(location.hash)?'/double-sudoku/triple/'+location.hash.slice(1)+'/'+location.search:` : '';
  await mkdir(directory, { recursive: true });
  await writeFile(`${directory}/index.html`, `<!doctype html><html lang="en"><meta charset="utf-8"><title>Sudoku</title><link rel="canonical" href="${base}${target}/"><script>location.replace(${redirect}${JSON.stringify(url)}+location.search+location.hash)</script><a href="${url}">Continue to Sudoku</a></html>`);
}
await copyFile('sitemap.xml', '_site/sitemap.xml');
await copyFile('robots.txt', '_site/robots.txt');
for (const file of ['hint-solver.js', 'hint-ui.js', 'hint-style.css', 'progress.js', 'mobile.css', 'triple-sudoku.js', 'triple-ui.js', 'triple.css', 'triple-simulation.js', 'triple-simulation-worker.js', 'triple-display.js', 'triple-worker.js', 'triple-build.js', 'triple-hints.js', 'triple-hint-worker.js', 'triple-walkthrough.js', 'site-nav.js', 'site-shell.css', 'site-icon.svg']) {
  await copyFile(file, `_site/${file}`);
}
await writeFile('_site/.nojekyll', '');
console.log(`Built ${routes.length} pages.`);
