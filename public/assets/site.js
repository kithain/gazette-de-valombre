(() => {
  const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr');
  const dialog = document.querySelector('.search-dialog');
  const field = document.querySelector('#site-search');
  const results = document.querySelector('.search-results');
  const status = document.querySelector('.search-status');
  let index;
  let pendingIndex;
  let lastTrigger;

  async function getIndex() {
    if (index) return index;
    pendingIndex ||= fetch(`${document.body.dataset.base}/assets/search-index.json`).then(response => {
      if (!response.ok) throw new Error('Recherche indisponible');
      return response.json();
    }).catch(error => { pendingIndex = null; throw error; });
    index = await pendingIndex;
    return index;
  }

  async function search() {
    const query = normalize(field.value.trim());
    try {
      const items = await getIndex();
      if (query !== normalize(field.value.trim())) return;
      const tokens = query.split(/\s+/).filter(Boolean);
      const found = items.filter(item => tokens.every(token => normalize(`${item.title} ${item.excerpt} ${item.category} ${item.location || ''}`).includes(token)));
      results.replaceChildren();
      status.textContent = query ? `${found.length} article${found.length > 1 ? 's' : ''} trouvé${found.length > 1 ? 's' : ''}` : 'Quelques pages à découvrir';
      for (const item of found.slice(0, query ? 30 : 5)) {
        const link = document.createElement('a');
        link.href = item.path;
        const category = document.createElement('span');
        category.className = 'kicker'; category.textContent = item.category;
        const title = document.createElement('strong'); title.textContent = item.title;
        const excerpt = document.createElement('p'); excerpt.textContent = item.excerpt;
        link.append(category, title, excerpt); results.append(link);
      }
      if (!found.length) {
        const empty = document.createElement('p');
        empty.textContent = 'Essayez un autre mot : un quartier, une enseigne ou le nom d’une affaire.';
        results.append(empty);
      }
    } catch {
      status.textContent = 'La recherche est momentanément indisponible.';
      results.replaceChildren();
      const link = document.createElement('a'); link.href = `${document.body.dataset.base}/archives/`;
      link.textContent = 'Consulter tous les articles dans les archives'; results.append(link);
    }
  }

  document.querySelectorAll('[data-search-open]').forEach(button => button.addEventListener('click', () => {
    lastTrigger = button; dialog.showModal(); document.body.classList.add('dialog-open');
    field.focus(); search();
  }));
  const close = () => dialog.close();
  document.querySelector('[data-search-close]')?.addEventListener('click', close);
  dialog?.addEventListener('click', event => { if (event.target === dialog) {
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) close();
  }});
  dialog?.addEventListener('close', () => { document.body.classList.remove('dialog-open'); lastTrigger?.focus(); });
  field?.addEventListener('input', search);
  document.addEventListener('keydown', event => {
    if (event.key === '/' && !dialog?.open && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) && !event.metaKey && !event.ctrlKey && !event.altKey) {
      event.preventDefault(); document.querySelector('[data-search-open]')?.click();
    }
  });

  const archiveSearch = document.querySelector('#archive-search');
  const category = document.querySelector('#archive-category');
  function filterArchive() {
    const tokens = normalize(archiveSearch.value.trim()).split(/\s+/).filter(Boolean);
    let count = 0;
    document.querySelectorAll('.archive-row').forEach(row => {
      const matches = (!category.value || row.dataset.category === category.value) && tokens.every(token => normalize(row.dataset.search).includes(token));
      row.hidden = !matches; if (matches) count++;
    });
    document.querySelector('.archive-count').textContent = `${count} article${count > 1 ? 's' : ''}`;
    document.querySelector('.archive-empty').hidden = count > 0;
    const params = new URLSearchParams();
    if (archiveSearch.value) params.set('q', archiveSearch.value);
    if (category.value) params.set('rubrique', category.value);
    history.replaceState(null, '', `${location.pathname}${params.size ? '?' + params : ''}`);
  }
  if (archiveSearch && category) {
    const params = new URLSearchParams(location.search);
    archiveSearch.value = params.get('q') || ''; category.value = params.get('rubrique') || '';
    archiveSearch.addEventListener('input', filterArchive); category.addEventListener('change', filterArchive);
    filterArchive();
  }
  document.querySelector('[data-print]')?.addEventListener('click', () => window.print());
  let toastTimer;
  const toast = message => {
    const element = document.querySelector('.toast'); element.textContent = message; element.classList.add('visible');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => element.classList.remove('visible'), 3500);
  };
  document.querySelector('[data-copy-link]')?.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(location.href); toast('Le lien de cet article a été copié.'); }
    catch { toast('Vous pouvez copier l’adresse de l’article depuis la barre du navigateur.'); }
  });
})();
