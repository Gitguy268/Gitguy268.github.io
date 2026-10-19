(() => {
  'use strict';
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const categories = ['players', 'spot', 'editors', 'tools', 'experiments'];
  const projects = $$('#website [data-project]').map(card => ({
    id: card.dataset.project, category: card.dataset.category, status: card.dataset.status,
    title: $('h3', card).textContent, description: $('p:not(.note)', card).textContent,
    credit: $('.project-credit', card).innerHTML, demo: card.dataset.demo || '', source: card.dataset.source || '',
    image: $('img', card)?.getAttribute('src') || '', alt: $('img', card)?.alt || '', card,
  }));
  const about = $$('#about p').map(p => p.textContent);
  const contact = { email: $('#about address a[href^="mailto:"]').getAttribute('href').slice(7), github: $('#about address a[href^="https://github.com/"]').href };
  const scripts = new Map();
  const styles = new Map();
  function loadScript(path) {
    if (!scripts.has(path)) scripts.set(path, new Promise((resolve,reject) => {
      const script = document.createElement('script'); script.src = path + '?v=20261018-1';
      script.onload = resolve; script.onerror = () => { scripts.delete(path); script.remove(); reject(new Error('This experience could not load. Please try again.')); };
      document.head.append(script);
    }));
    return scripts.get(path);
  }
  function loadStyle(path) {
    if (!styles.has(path)) styles.set(path, new Promise((resolve,reject) => {
      const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = path + '?v=20261018-1';
      link.onload = resolve; link.onerror = () => { styles.delete(path); link.remove(); reject(new Error('The desktop style could not load. Please try again.')); };
      document.head.append(link);
    }));
    return styles.get(path);
  }
  function links(project) {
    return `<div class="project-actions"><a class="action" href="docs/index.html#${escape(project.id)}">Docs</a>${project.demo ? `<a class="action" href="${escape(project.demo)}" target="_blank" rel="noopener noreferrer">Try it ↗</a>` : ''}${project.source ? `<a class="action" href="${escape(project.source)}" target="_blank" rel="noopener noreferrer">Source ↗</a>` : ''}</div>`;
  }
  function details(project, image = true) {
    return `${image && project.image ? `<img class="detail-image" src="${escape(project.image)}" alt="${escape(project.alt)}" width="720" height="450">` : ''}<p class="detail-category">${escape(project.category)} / ${project.status === 'public' ? 'Available online' : 'Not published yet'}</p><h2>${escape(project.title)}</h2><p>${escape(project.description)}</p>${links(project)}<p class="detail-credit">${project.credit}</p>`;
  }
  const cursors = ['system', 'vinyl', 'glass', 'spot'];
  function setCursor(name, save = true) {
    if (!cursors.includes(name)) return false;
    document.documentElement.dataset.cursor = name;
    if (save) try { localStorage.setItem('lucas-cursor', name); } catch { /* Storage blocked: the cursor still applies for this visit. */ }
    for (const button of $$('[data-cursor-pick]')) button.setAttribute('aria-pressed', String(button.dataset.cursorPick === name));
    return true;
  }
  let savedCursor = null;
  try { savedCursor = localStorage.getItem('lucas-cursor'); } catch { /* Storage blocked. */ }
  if (!setCursor(savedCursor, false)) setCursor('system', false);
  document.addEventListener('click', event => { const pick = event.target.closest('[data-cursor-pick]'); if (pick) setCursor(pick.dataset.cursorPick); });
  $('#cursor-picker').hidden = false;
  window.Portfolio = { $, $$, escape, projects, categories, about, contact, details, links, loadScript, loadStyle, navigate, cursors, setCursor };
  // The semantic project articles above are the single source of content for every experience.
  for (const id of ['qrcodeforeveryone', 'htmltopng', 'blacklabspotsshop']) {
    const project = projects.find(p => p.id === id);
    const card = project.card.cloneNode(true); card.removeAttribute('id');
    for (const key of Object.keys(card.dataset)) delete card.dataset[key];
    $('img', card).loading = 'lazy'; $('#featured-grid').append(card);
  }
  $('#featured').hidden = false;
  $('#project-controls').hidden = false;
  let filter = 'all';
  function filterProjects() {
    const query = $('#project-search').value.trim().toLowerCase(); let count = 0;
    for (const p of projects) {
      const match = (filter === 'all' || filter === p.category) && `${p.title} ${p.description} ${p.category}`.toLowerCase().includes(query);
      p.card.hidden = !match; if (match) count++;
    }
    for (const group of $$('#website .group:not(.about)')) group.hidden = !$('.project:not([hidden])', group);
    $('#empty-results').hidden = count > 0;
    const status = $('#results-summary'); status.hidden = false;
    status.textContent = `${count} of ${projects.length} projects${filter !== 'all' ? ` in ${filter}` : ''}${query ? ` matching “${$('#project-search').value.trim()}”` : ''}`;
    for (const button of $$('[data-filter]')) button.setAttribute('aria-pressed', String(button.dataset.filter === filter));
  }
  for (const button of $$('[data-filter]')) button.addEventListener('click', () => { filter = button.dataset.filter; filterProjects(); });
  $('#project-search').addEventListener('input', filterProjects);
  $('#reset-filters').addEventListener('click', () => { filter = 'all'; $('#project-search').value = ''; filterProjects(); $('#project-search').focus(); });
  // Press / or Ctrl+K on the website to jump to a project, like the search in documentation sites.
  const palette = document.createElement('dialog'); palette.className = 'palette'; palette.setAttribute('aria-label', 'Jump to a project');
  palette.innerHTML = `<div class="palette-body"><input type="text" enterkeyhint="go" placeholder="Jump to a project…" aria-label="Jump to a project" autocomplete="off" spellcheck="false"><nav aria-label="Matching projects">${projects.map(p => `<a href="#${escape(p.card.id)}">${escape(p.title)}<small>${escape(p.category)}</small></a>`).join('')}</nav><p class="palette-empty" hidden>No matching projects.</p><p class="palette-hint">Enter opens the first match · Esc closes</p></div>`;
  document.body.append(palette);
  const paletteInput = $('input', palette), paletteLinks = $$('a', palette);
  function filterPalette() {
    const query = paletteInput.value.trim().toLowerCase();
    paletteLinks.forEach((link, i) => { const p = projects[i]; link.hidden = !`${p.title} ${p.description} ${p.category}`.toLowerCase().includes(query); });
    $('.palette-empty', palette).hidden = paletteLinks.some(link => !link.hidden);
  }
  paletteInput.addEventListener('input', filterPalette);
  paletteInput.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); paletteLinks.find(link => !link.hidden)?.click(); } });
  palette.addEventListener('click', event => { if (event.target === palette || event.target.closest('a')) palette.close(); });
  document.addEventListener('keydown', event => {
    if (document.body.dataset.view !== 'website' || palette.open) return;
    const shortcut = event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey) && !event.altKey;
    const slash = event.key === '/' && !event.metaKey && !event.ctrlKey && !event.altKey && !event.target.closest('input,textarea,select,[contenteditable]');
    if (!shortcut && !slash) return;
    event.preventDefault(); paletteInput.value = ''; filterPalette(); palette.showModal();
  });
  const aliases = { '1':'website','2':'terminal','3':'desktop', website:'website', site:'website', terminal:'terminal', desktop:'desktop', windows:'desktop' };
  $('#boot-form').addEventListener('submit', event => {
    event.preventDefault(); const value = $('#boot-input').value.trim().toLowerCase();
    if (aliases[value]) { $('#boot-input').value = ''; navigate(aliases[value]); }
    else $('#boot-feedback').textContent = 'Choose 1 (website), 2 (terminal), or 3 (desktop).';
  });
  document.addEventListener('keydown', event => {
    if (document.body.dataset.view !== 'choose' || event.metaKey || event.ctrlKey || event.altKey || event.target.closest('input,textarea')) return;
    if (['1','2','3'].includes(event.key)) { event.preventDefault(); navigate(aliases[event.key]); }
  });
  const intro = $('#boot-typed'); const introText = intro.textContent; let typeTimer;
  function stopTyping() { clearTimeout(typeTimer); intro.textContent = introText; }
  function typeIntro() {
    stopTyping(); if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let length = 0; intro.textContent = '\u00a0';
    const tick = () => { intro.textContent = introText.slice(0, ++length); if (length < introText.length) typeTimer = setTimeout(tick, 21); };
    tick();
  }
  let routeVersion = 0; let mountedTerminal; let mountedDesktop;
  function anchorTarget() {
    try { return document.getElementById(decodeURIComponent(location.hash.slice(1))); } catch { return null; }
  }
  function getView() {
    const requested = new URL(location.href).searchParams.get('view');
    if (requested && ['website','terminal','desktop'].includes(requested)) return requested;
    if (!requested && anchorTarget()) return 'website';
    return 'choose';
  }
  function navigate(view) {
    const url = new URL(location.href); url.hash = ''; url.search = '';
    if (view !== 'choose') url.searchParams.set('view', view);
    history.pushState({}, '', url); route(true);
  }
  function setView(view) {
    stopTyping(); window.Glass?.pause(); mountedDesktop?.setActive(false); if (palette.open) palette.close();
    document.body.dataset.view = view;
    for (const id of ['chooser','website','terminal','desktop']) $('#'+id).hidden = id !== (view === 'choose' ? 'chooser' : view);
    document.title = `${view === 'choose' ? 'Choose your way in' : view === 'website' ? 'Projects' : view === 'terminal' ? 'Terminal' : 'Desktop'} — Lucas van de Weerd`;
  }
  async function route(focus = false) {
    const version = ++routeVersion; const view = getView(); setView(view); window.scrollTo(0,0);
    if (view === 'choose') { $('#boot-feedback').textContent = 'Click a choice, or type a number/name and press Enter.'; typeIntro(); }
    try {
      if (view === 'website') {
        // Glass is progressive enhancement: the portfolio must survive a failed asset.
        try { await loadScript('glass.js'); } catch { /* CSS glass remains readable. */ }
        if (version !== routeVersion) return;
        window.Glass?.resume();
        if (location.hash) {
          filter = 'all'; $('#project-search').value = ''; filterProjects();
          const target = anchorTarget();
          target?.scrollIntoView({behavior:'instant'});
          if (target) { target.tabIndex = -1; target.focus({preventScroll:true}); }
        }
      } else if (view === 'terminal') {
        await loadScript('scripts/terminal.js'); if (version !== routeVersion) return;
        if (!mountedTerminal) mountedTerminal = window.createTerminal($('#terminal'));
      } else if (view === 'desktop') {
        await Promise.all([loadStyle('styles/desktop.css'), loadScript('scripts/desktop.js')]);
        if (version !== routeVersion) return;
        if (!mountedDesktop) mountedDesktop = window.createDesktop($('#desktop'));
        mountedDesktop.setActive(true);
      }
      if (focus) {
        const target = view === 'choose' ? $('#boot-input') : view === 'terminal' ? $('#terminal input') : view === 'desktop' ? $('#desktop .desktop-icon') : $('#website .hero h1');
        if (target) { if (!target.matches('input,button,a')) target.tabIndex = -1; target.focus({preventScroll:true}); }
      }
    } catch (error) {
      if (version !== routeVersion) return;
      setView('choose'); $('#boot-feedback').textContent = error.message;
    }
  }
  document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest('a[href]'); if (!link || link.target === '_blank') return;
    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin || url.pathname !== location.pathname) return;
    if (url.searchParams.has('view') || url.hash) {
      event.preventDefault();
      if (url.hash && !url.searchParams.has('view')) url.searchParams.set('view','website');
      if (url.searchParams.get('view') === 'choose') url.searchParams.delete('view');
      history.pushState({},'',url); route(!url.hash);
    }
  });
  addEventListener('popstate', () => route());
  addEventListener('hashchange', () => route());
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { stopTyping(); window.Glass?.pause(); mountedDesktop?.setActive(false); }
    else { if (getView() === 'website') window.Glass?.resume(); if (getView() === 'desktop') mountedDesktop?.setActive(true); }
  });
  route();
})();
