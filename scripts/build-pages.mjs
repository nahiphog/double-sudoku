import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';

// Pages serves directories rather than applying Vercel's catch-all rewrite.
const html = await readFile('index.html', 'utf8');
const sitemap = await readFile('sitemap.xml', 'utf8');
const base = 'https://nahiphog.github.io/double-sudoku/';
const routes = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(([, url]) => {
  if (!url.startsWith(base)) throw new Error(`Unexpected sitemap URL: ${url}`);
  return url.slice(base.length).replace(/\/$/, '');
});
for (const route of routes) {
  const directory = route ? `_site/${route}` : '_site';
  await mkdir(directory, { recursive: true });
  await writeFile(`${directory}/index.html`, html);
}
await copyFile('sitemap.xml', '_site/sitemap.xml');
await copyFile('robots.txt', '_site/robots.txt');
for (const file of ['hint-solver.js', 'hint-ui.js', 'hint-style.css']) {
  await copyFile(file, `_site/${file}`);
}
await writeFile('_site/.nojekyll', '');
console.log(`Built ${routes.length} pages.`);
