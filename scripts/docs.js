(() => {
  'use strict';
  // A hash names a page (an article id) or a section inside one. Anything else opens the first page.
  function pageFor(hash, pages, sectionPage) {
    let id = String(hash || '').replace(/^#/, '');
    try { id = decodeURIComponent(id); } catch { /* keep the raw text */ }
    if (pages.includes(id)) return id;
    return Object.hasOwn(sectionPage, id) ? sectionPage[id] : pages[0];
  }
  // Every word has to appear; titles that start with the query come first, then titles, then sections.
  function search(query, entries) {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    const rank = entry => {
      const title = entry.title.toLowerCase();
      if (title.startsWith(words.join(' '))) return 0;
      if (!entry.section) return 1;
      return words.every(w => entry.section.toLowerCase().includes(w)) ? 2 : 3;
    };
    return entries
      .filter(entry => words.every(w => `${entry.title} ${entry.section} ${entry.text}`.toLowerCase().includes(w)))
      .map((entry, index) => ({ entry, index, rank: rank(entry) }))
      .sort((a, b) => a.rank - b.rank || a.index - b.index)
      .map(item => item.entry);
  }
  globalThis.DocsModel = { pageFor, search };
  if (typeof document === 'undefined') return;

  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  document.documentElement.classList.add('js');

  const articles = $$('.doc');
  const pages = articles.map(a => a.id);
  const sectionPage = {};
  for (const article of articles) for (const el of $$('[id]', article)) sectionPage[el.id] = article.id;
  const titleOf = article => $('h1', article).textContent.trim();

  const toc = $('.toc');
  const pager = $('.pager');
  const main = $('main');
  let current = null;
  let observer = null;

  function show(initial) {
    const hash = location.hash.slice(1);
    const id = pageFor(hash, pages, sectionPage);
    const article = document.getElementById(id);
    const changed = current !== article;
    if (changed) {
      for (const a of articles) a.classList.toggle('current', a === article);
      current = article;
      document.title = `${titleOf(article)} · Docs · Lucas van de Weerd`;
      for (const link of $$('.sidebar a')) {
        if (link.hash === `#${id}`) link.setAttribute('aria-current', 'page');
        else link.removeAttribute('aria-current');
      }
      buildToc(article);
      buildPager(article);
    }
    const target = hash && hash !== id ? document.getElementById(hash) : null;
    if (target && sectionPage[hash] === id) target.scrollIntoView();
    else if (changed) window.scrollTo(0, 0);
    if (changed && !initial) main.focus({ preventScroll: true });
  }

  function buildToc(article) {
    observer?.disconnect();
    const headings = $$('h2[id]', article);
    toc.hidden = headings.length < 2;
    toc.innerHTML = `<h2>On this page</h2><ul>${headings.map(h => `<li><a href="#${escape(h.id)}">${escape(h.textContent)}</a></li>`).join('')}</ul>`;
    if (!('IntersectionObserver' in window)) return;
    const links = new Map($$('a', toc).map(a => [a.hash.slice(1), a]));
    observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        for (const a of links.values()) a.removeAttribute('aria-current');
        links.get(entry.target.id)?.setAttribute('aria-current', 'true');
      }
    }, { rootMargin: '-80px 0px -70% 0px' });
    headings.forEach(h => observer.observe(h));
  }

  function buildPager(article) {
    const i = articles.indexOf(article);
    const prev = articles[i - 1], next = articles[i + 1];
    pager.hidden = false;
    pager.innerHTML =
      (prev ? `<a class="prev" href="#${escape(prev.id)}"><small>Previous</small>${escape(titleOf(prev))}</a>` : '') +
      (next ? `<a class="next" href="#${escape(next.id)}"><small>Next</small>${escape(titleOf(next))}</a>` : '');
  }

  // Copy buttons on code blocks
  for (const pre of $$('.doc pre')) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'copy';
    button.textContent = 'Copy';
    button.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText($('code', pre)?.textContent ?? pre.textContent);
        button.textContent = 'Copied';
      } catch {
        button.textContent = 'Select and copy';
      }
      setTimeout(() => { button.textContent = 'Copy'; }, 1600);
    });
    pre.append(button);
  }

  // Light, dark, or whatever the system uses
  const modes = ['system', 'light', 'dark'];
  const icons = { system: '◐', light: '☀', dark: '☾' };
  const modeButton = $('.mode');
  let mode = document.documentElement.dataset.mode || 'system';
  function setMode(next) {
    mode = next;
    if (mode === 'system') delete document.documentElement.dataset.mode;
    else document.documentElement.dataset.mode = mode;
    modeButton.textContent = icons[mode];
    modeButton.setAttribute('aria-label', `Colour mode: ${mode}. Change it`);
    try { if (mode === 'system') localStorage.removeItem('lucas-docs-mode'); else localStorage.setItem('lucas-docs-mode', mode); } catch { /* storage blocked: the choice lasts this visit */ }
  }
  modeButton.hidden = false;
  modeButton.addEventListener('click', () => setMode(modes[(modes.indexOf(mode) + 1) % modes.length]));
  setMode(mode);

  // Search over page titles and section headings
  const entries = articles.flatMap(article => {
    const title = titleOf(article);
    const text = $('.tagline', article)?.textContent ?? '';
    return [{ page: article.id, id: article.id, title, section: '', text },
      ...$$('h2[id], h3[id]', article).map(h => ({ page: article.id, id: h.id, title, section: h.textContent.trim(), text: '' }))];
  });
  const dialog = $('.search');
  const input = $('input', dialog);
  const results = $('ul', dialog);
  const searchButton = $('.search-open');
  let active = 0;
  function render() {
    const found = search(input.value, entries).slice(0, 30);
    active = 0;
    results.innerHTML = found.length
      ? found.map((e, i) => `<li><a href="#${escape(e.id)}"${i === 0 ? ' class="active"' : ''}>${escape(e.section || e.title)}${e.section ? `<small>${escape(e.title)}</small>` : ''}</a></li>`).join('')
      : input.value.trim() ? '<li><p>No page or section matches. Try one word, such as a project name.</p></li>' : '';
  }
  function openSearch() {
    if (dialog.open) return;
    input.value = '';
    render();
    dialog.showModal();
    input.focus();
  }
  searchButton.hidden = false;
  searchButton.addEventListener('click', openSearch);
  input.addEventListener('input', render);
  input.addEventListener('keydown', event => {
    const links = $$('a', results);
    if (!links.length) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      links[active].classList.remove('active');
      active = (active + (event.key === 'ArrowDown' ? 1 : -1) + links.length) % links.length;
      links[active].classList.add('active');
      links[active].scrollIntoView({ block: 'nearest' });
    } else if (event.key === 'Enter') {
      event.preventDefault();
      links[active].click();
    }
  });
  results.addEventListener('click', event => { if (event.target.closest('a')) dialog.close(); });
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  document.addEventListener('keydown', event => {
    const typing = event.target.closest('input, textarea, [contenteditable]');
    if ((event.key === 'k' && (event.metaKey || event.ctrlKey)) || (event.key === '/' && !typing)) {
      event.preventDefault();
      openSearch();
    }
  });

  // On a phone the page list folds away, and closes again after a choice
  const menu = $('.sidebar details');
  const narrow = matchMedia('(max-width: 820px)');
  menu.open = !narrow.matches;
  narrow.addEventListener('change', () => { menu.open = !narrow.matches; });
  $('.sidebar').addEventListener('click', event => {
    if (event.target.closest('a') && narrow.matches) menu.open = false;
  });

  addEventListener('hashchange', () => show(false));
  show(true);
})();
