import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';

// Query routes always load the same bundled entry point, with no server rewrites.
function mobileLinks(text) {
  return text.replace(/href="\/double-sudoku\/([^"?#]*)"/g, (_, path) => {
    if (path.endsWith('.css') || path.endsWith('.svg')) return `href="${path}"`;
    if(path.replace(/\/$/, '')==='quadruple/build')return 'href="quadruple-build.html"';
    if(path.startsWith('quadruple/'))return `href="quadruple.html?route=${path.slice(10).replace(/\/$/,'')}"`;
    if (path.replace(/\/$/, '') === 'triple/build') return 'href="triple-build.html"';
    if (path.startsWith('triple/')) return `href="triple.html?route=${path.slice(7).replace(/\/$/, '')}"`;
    const route = path.replace(/^double\//, '').replace(/\/$/, '');
    return `href="${['techniques', 'triple', 'quadruple'].includes(route) ? route + '.html' : 'index.html?route=' + route}"`;
  }).replaceAll('src="/double-sudoku/', 'src="');
}
await mkdir('dist', { recursive: true });
for (const file of ['index.html', 'techniques.html', 'triple.html', 'triple-build.html', 'quadruple.html', 'quadruple-build.html']) {
  let html = mobileLinks(await readFile(file, 'utf8'));
  html = html.replace('<head>', '<head><script>window.SUDOKU_MOBILE=true;</script>');
  if (file === 'techniques.html') html = html.replace('</head>', '<link rel="stylesheet" href="mobile.css"></head>').replace('width=device-width,initial-scale=1', 'width=device-width,initial-scale=1,viewport-fit=cover');
  await writeFile(`dist/${file}`, html);
}
for (const file of ['hint-solver.js', 'hint-style.css', 'mobile.css', 'progress.js', 'triple-sudoku.js', 'triple-ui.js', 'triple.css', 'triple-simulation.js', 'triple-simulation-worker.js', 'triple-display.js', 'triple-worker.js', 'triple-build.js', 'triple-hints.js', 'triple-hint-worker.js', 'triple-walkthrough.js', 'site-nav.js', 'site-shell.css', 'site-icon.svg', 'quadruple-sudoku.js', 'quadruple-ui.js', 'quadruple.css', 'quadruple-worker.js', 'quadruple-display.js', 'quadruple-build.js', 'quadruple-simulation.js', 'quadruple-simulation-worker.js', 'quadruple-hints.js', 'quadruple-hint-worker.js', 'quadruple-walkthrough.js']) await copyFile(file, `dist/${file}`);
await writeFile('dist/hint-ui.js', mobileLinks(await readFile('hint-ui.js', 'utf8')));
console.log('Built offline mobile assets in dist/.');
