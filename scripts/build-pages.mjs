import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
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
for (const page of ['daily','archive','generate','build','simulation','verify','play','walkthrough','techniques']) {
  if (!routes.includes('triple/'+page)) routes.push('triple/'+page);
}
if (!routes.includes('walkthrough')) routes.push('walkthrough');
for (const route of routes) {
  const directory = route ? `_site/${route}` : '_site';
  await mkdir(directory, { recursive: true });
  await writeFile(`${directory}/index.html`, route === 'triple/build' ? tripleBuild : (route === 'triple' || route.startsWith('triple/')) ? triple : route === 'techniques' ? techniques : html);
}
await copyFile('sitemap.xml', '_site/sitemap.xml');
await copyFile('robots.txt', '_site/robots.txt');
for (const file of ['hint-solver.js', 'hint-ui.js', 'hint-style.css', 'progress.js', 'mobile.css', 'triple-sudoku.js', 'triple-ui.js', 'triple.css', 'triple-simulation.js', 'triple-simulation-worker.js', 'triple-display.js', 'triple-worker.js', 'triple-build.js', 'triple-hints.js', 'triple-hint-worker.js', 'triple-walkthrough.js', 'site-nav.js', 'site-shell.css']) {
  await copyFile(file, `_site/${file}`);
}
await writeFile('_site/.nojekyll', '');
console.log(`Built ${routes.length} pages.`);
