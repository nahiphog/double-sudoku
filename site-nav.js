(() => {
  'use strict';
  const base = '/double-sudoku/';
  const mobile = !!window.SUDOKU_MOBILE;
  const path = location.pathname;
  const variant = document.documentElement.dataset.variant || (path.includes('/triple') ? 'triple' : 'double');
  const pages = [['daily','Daily'],['archive','Archive'],['generate','Generate'],['build','Custom build'],['simulation','Simulation'],['verify','Verify'],['play','Play'],['walkthrough','Walkthrough'],['techniques','Techniques']];
  let route = mobile ? new URLSearchParams(location.search).get('route') : path.startsWith(base) ? path.slice(base.length).replace(/^triple\/?/,'') : '';
  if (!route && /triple-build\.html$/.test(path)) route = 'build';
  if (!route && /techniques(?:\.html|\/)?$/.test(path)) route = 'techniques';
  if (!route && variant === 'triple' && ['#simulation','#walkthrough'].includes(location.hash)) route = location.hash.slice(1);
  if (!route) route = variant === 'triple' ? 'play' : mobile ? 'daily' : 'generate';
  const parts = route.split('/').filter(Boolean);
  const page = pages.some(([key])=>key===parts[0]) ? parts[0] : 'daily';
  const datePath = page === 'archive' ? parts.slice(1).join('/') : '';
  function href(kind, section, date = '') {
    const suffix = date ? '/' + date : '';
    if (mobile) {
      if(kind==='double' && section==='techniques') return 'techniques.html';
      if(kind==='triple' && section==='build') return 'triple-build.html';
      return `${kind==='triple'?'triple':'index'}.html?route=${section}${suffix}`;
    }
    // Query dates share one archive document, including dates created after build.
    return `${base}${kind==='triple'?'triple/':''}${section}${date?'?date='+date.replaceAll('/','-'):''}`;
  }
  const date = datePath || (page==='archive' ? (new URLSearchParams(location.search).get('date')||'').replaceAll('-','/') : '');
  if (variant === 'triple' && ['#simulation','#walkthrough'].includes(location.hash)) {
    history.replaceState(null, '', href('triple', page));
  }
  window.SudokuSite = { variant, page, date, href, mobile };
  document.documentElement.dataset.variant=variant;
  document.documentElement.dataset.section=page;
  const main=document.querySelector('main');
  main?.querySelector('nav')?.remove();
  const header=document.createElement('header');header.className='site-header';
  const label=document.createElement('p');label.className='site-kicker';label.textContent='SUDOKU · REPEATED DIGITS';header.append(label);
  const toggle=document.createElement('nav');toggle.className='variant-toggle';toggle.setAttribute('aria-label','Puzzle variant');
  for(const [kind,text] of [['double','Double Sudoku'],['triple','Triple Sudoku']]){
    const link=document.createElement('a');link.href=href(kind,page,date);link.textContent=text;link.dataset.variant=kind;
    if(kind===variant)link.setAttribute('aria-current','true');toggle.append(link);
  }
  const nav=document.createElement('nav');nav.className='site-tabs';nav.setAttribute('aria-label','Puzzle pages');
  for(const [key,text] of pages){
    const link=document.createElement('a');link.href=href(variant,key);link.textContent=text;link.dataset.nav=key;
    if(key===page){link.setAttribute('aria-current','page');link.classList.add('active');}nav.append(link);
  }
  header.append(toggle,nav);main?.prepend(header);
  if(variant==='double'&&page==='walkthrough'){
    const intro=document.createElement('section');intro.className='route-intro';
    intro.innerHTML='<h2>Double Sudoku walkthrough</h2><p>Load a puzzle below, then use the hint controls to show and apply one explained deduction at a time. Your progress is shared with Play.</p>';
    document.getElementById('playPage')?.prepend(intro);
  }
  if(variant==='triple')document.title=`${pages.find(([key])=>key===page)[1]} | Triple Sudoku`;
})();
