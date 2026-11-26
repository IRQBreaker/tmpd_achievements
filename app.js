(() => {
  'use strict';

  const STORAGE_KEY = 'tmpd.achievements.v1';
  const APP_ID = 'tmpd-achievements';
  const categories = window.TMPD_CATEGORIES;
  const $ = id => document.getElementById(id);
  const normalize = text => text.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[’‘]/g, "'").toLowerCase();
  const slug = text => normalize(text).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const entries = categories.flatMap(category => (category.groups || [{id: 'items', items: category.items}]).flatMap(group =>
    group.items.map(name => ({
      id: `${category.id}/${group.id}/${slug(name)}`,
      name, categoryId: category.id, groupId: group.id,
      search: normalize(`${category.name} ${group.name || ''} ${name}`)
    }))
  ));
  const knownIds = new Set(entries.map(entry => entry.id));
  let completed = new Set();
  let selectedCategory = categories[0].id;
  let filter = 'all';
  let query = '';
  let storageWritable = true;
  let damagedStorage = false;
  let updatedAt = null;
  let pendingConfirmation = null;
  let toastTimer;

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function decodeProgress(text) {
    const data = JSON.parse(text);
    if (!data || data.app !== APP_ID || data.version !== 1 || !Array.isArray(data.completed) ||
        data.completed.length > 10000 || data.completed.some(id => typeof id !== 'string' || !knownIds.has(id))) {
      throw new Error('This is not a compatible TMPD backup. Choose a JSON file exported by this journal.');
    }
    return {completed: new Set(data.completed), updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : null};
  }

  function payload() {
    return {app: APP_ID, version: 1, updatedAt, completed: entries.filter(entry => completed.has(entry.id)).map(entry => entry.id)};
  }

  function showToast(message) {
    clearTimeout(toastTimer);
    $('toast').textContent = message;
    $('toast').hidden = false;
    toastTimer = setTimeout(() => { $('toast').hidden = true; }, 6500);
  }

  function renderStorageStatus() {
    const status = $('save-status');
    status.classList.toggle('warning', !storageWritable || damagedStorage);
    status.textContent = damagedStorage ? 'Saved data could not be read. Export this session before closing.' :
      storageWritable ? 'Progress saved on this device' : 'Browser storage unavailable. Export before closing.';
    status.title = updatedAt ? `Last change: ${new Date(updatedAt).toLocaleString()}` : '';
  }

  function save() {
    updatedAt = new Date().toISOString();
    if (!damagedStorage) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload()));
        storageWritable = true;
      } catch {
        if (storageWritable) showToast('Your browser could not save progress. Export a backup before closing.');
        storageWritable = false;
      }
    }
    renderStorageStatus();
  }

  function load() {
    let saved;
    try { saved = localStorage.getItem(STORAGE_KEY); }
    catch { storageWritable = false; }
    if (saved !== undefined && saved !== null) {
      try {
        const data = decodeProgress(saved);
        completed = data.completed;
        updatedAt = data.updatedAt;
      } catch {
        damagedStorage = true;
        showToast('Saved progress could not be read. It has been left untouched. Import a backup or reset to repair storage.');
      }
    }
    renderStorageStatus();
  }

  function buildNavigation() {
    for (const category of categories) {
      const button = element('button', 'category-button');
      button.type = 'button';
      button.dataset.category = category.id;
      const img = element('img');
      img.src = category.image;
      img.alt = '';
      img.width = 46;
      img.height = 46;
      const label = element('span', 'category-label');
      label.append(element('span', 'category-name', category.name), element('span', 'category-count'));
      const bar = element('progress');
      bar.setAttribute('aria-label', `${category.name} progress`);
      button.append(img, label, bar);
      button.addEventListener('click', () => {
        selectedCategory = category.id;
        query = '';
        $('search').value = '';
        render();
      });
      $('category-nav').append(button);
    }
  }

  function updateProgress() {
    let finishedCategories = 0;
    for (const category of categories) {
      const items = entries.filter(entry => entry.categoryId === category.id);
      const count = items.filter(entry => completed.has(entry.id)).length;
      const button = document.querySelector(`[data-category="${category.id}"]`);
      const countLabel = button.querySelector('.category-count');
      button.setAttribute('aria-pressed', String(!query && selectedCategory === category.id));
      countLabel.textContent = `${count} / ${items.length} ${count === items.length ? 'complete ✓' : 'completed'}`;
      countLabel.classList.toggle('complete', count === items.length);
      const bar = button.querySelector('progress');
      bar.max = items.length;
      bar.value = count;
      if (count === items.length) finishedCategories++;
    }
    $('total-completed').textContent = completed.size;
    $('total-count').textContent = entries.length;
    $('total-percent').replaceChildren(document.createTextNode(Math.round(completed.size / entries.length * 100)), element('span', '', '%'));
    $('overall-bar').max = entries.length;
    $('overall-bar').value = completed.size;
    $('categories-completed').textContent = `${finishedCategories} / ${categories.length} categories complete`;
    $('progress-message').textContent = completed.size === 0 ? 'A fresh start. Make your first mark.' :
      completed.size === entries.length ? 'Every achievement recorded. A journal well travelled.' :
      `${entries.length - completed.size} more achievements out there. Keep exploring.`;
  }

  function render() {
    updateProgress();
    const category = categories.find(item => item.id === selectedCategory);
    const matching = entries.filter(entry => query ? entry.search.includes(query) : entry.categoryId === selectedCategory);
    const count = matching.filter(entry => completed.has(entry.id)).length;
    const visible = matching.filter(entry => filter === 'all' || (filter === 'completed' ? completed.has(entry.id) : !completed.has(entry.id)));
    $('checklist-title').textContent = query ? 'Search results' : category.name;
    $('category-kicker').textContent = query ? 'ACROSS YOUR ENTIRE JOURNAL' : category.kicker;
    $('category-description').textContent = query ? `${matching.length} achievement${matching.length === 1 ? '' : 's'} matching “${$('search').value.trim()}”` : category.description;
    $('category-art').hidden = Boolean(query);
    $('category-art').src = category.image;
    $('filter-all').textContent = matching.length;
    $('filter-remaining').textContent = matching.length - count;
    $('filter-completed').textContent = count;
    $('list-summary').textContent = `${count} / ${matching.length} complete`;
    document.querySelectorAll('[data-filter]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === filter)));

    const fragment = document.createDocumentFragment();
    for (const currentCategory of categories) {
      for (const group of currentCategory.groups || [{id: 'items', name: currentCategory.name}]) {
        const groupEntries = visible.filter(entry => entry.categoryId === currentCategory.id && entry.groupId === group.id);
        if (!groupEntries.length) continue;
        const section = element('section', 'group');
        if (query || currentCategory.groups) {
          const heading = element('div', 'group-heading');
          const img = element('img');
          img.src = group.image || currentCategory.image;
          img.alt = '';
          img.width = 44;
          img.height = 44;
          const title = element('h3', '', query && currentCategory.groups ? `${currentCategory.name} / ${group.name}` : group.name);
          title.id = `heading-${currentCategory.id}-${group.id}`;
          section.setAttribute('aria-labelledby', title.id);
          const groupMatches = matching.filter(entry => entry.categoryId === currentCategory.id && entry.groupId === group.id);
          const groupCompleted = groupMatches.filter(entry => completed.has(entry.id)).length;
          heading.append(img, title, element('span', '', `${groupCompleted} / ${groupMatches.length}`));
          section.append(heading);
        } else {
          section.setAttribute('aria-label', currentCategory.name);
        }
        const list = element('div', 'achievement-list');
        for (const entry of groupEntries) {
          const label = element('label', 'achievement');
          const checkbox = element('input');
          checkbox.type = 'checkbox';
          checkbox.checked = completed.has(entry.id);
          checkbox.dataset.entry = entry.id;
          label.append(checkbox, element('span', '', entry.name));
          list.append(label);
        }
        section.append(list);
        fragment.append(section);
      }
    }
    $('checklists').replaceChildren(fragment);
    $('empty-state').hidden = visible.length !== 0;
    $('empty-title').textContent = filter === 'remaining' && matching.length && count === matching.length ? 'All checked off.' :
      filter === 'completed' && matching.length ? 'No completed achievements yet.' : 'No achievements found';
    $('empty-description').textContent = filter === 'remaining' && matching.length && count === matching.length ? 'This part of your journal is complete. Time for the next adventure.' :
      filter === 'completed' && matching.length ? 'Your completed achievements will appear here.' : 'Try another search or filter.';
  }

  function confirmAction(title, description, buttonText, action) {
    $('confirm-title').textContent = title;
    $('confirm-description').textContent = description;
    $('accept-confirm').textContent = buttonText;
    pendingConfirmation = action;
    $('confirm-dialog').showModal();
  }

  $('checklists').addEventListener('change', event => {
    const checkbox = event.target;
    if (!checkbox.matches('input[data-entry]')) return;
    const inputs = [...$('checklists').querySelectorAll('input')];
    const previousIndex = inputs.indexOf(checkbox);
    const id = checkbox.dataset.entry;
    if (checkbox.checked) completed.add(id); else completed.delete(id);
    save();
    render();
    // Rebuilding filtered lists must not strand keyboard focus on the document.
    const nextInputs = [...$('checklists').querySelectorAll('input')];
    const focusTarget = nextInputs.find(input => input.dataset.entry === id) || nextInputs[Math.min(previousIndex, nextInputs.length - 1)] || $('clear-filters');
    focusTarget.focus({preventScroll: true});
  });

  $('search').addEventListener('input', () => { query = normalize($('search').value.trim()); render(); });
  document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => { filter = button.dataset.filter; render(); }));
  $('clear-filters').addEventListener('click', () => { query = ''; filter = 'all'; $('search').value = ''; render(); $('search').focus(); });
  document.addEventListener('keydown', event => {
    if (event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey &&
        !event.target.matches('input, textarea, [contenteditable]') && !document.querySelector('dialog[open]')) {
      event.preventDefault();
      $('search').focus();
    }
  });

  $('help-button').addEventListener('click', () => $('help-dialog').showModal());
  $('cancel-confirm').addEventListener('click', () => $('confirm-dialog').close());
  $('accept-confirm').addEventListener('click', () => {
    const action = pendingConfirmation;
    $('confirm-dialog').close();
    if (action) action();
  });
  $('confirm-dialog').addEventListener('close', () => { pendingConfirmation = null; });

  $('export-button').addEventListener('click', () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload(), null, 2)], {type: 'application/json'}));
    const link = element('a');
    link.href = url;
    link.download = `tmpd-progress-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast('Backup exported. Keep it somewhere safe.');
  });

  $('import-button').addEventListener('click', () => $('import-file').click());
  $('import-file').addEventListener('change', async () => {
    const file = $('import-file').files[0];
    $('import-file').value = '';
    if (!file) return;
    try {
      if (file.size > 1024 * 1024) throw new Error('This file is too large. Choose a TMPD JSON backup smaller than 1 MB.');
      let imported;
      try { imported = decodeProgress(await file.text()); }
      catch { throw new Error('This is not a compatible TMPD backup. Choose a JSON file exported by this journal.'); }
      confirmAction('Replace progress with this backup?',
        `This backup has ${imported.completed.size} of ${entries.length} achievements completed. It will replace your current ${completed.size} completed achievements. Export your current progress first if you want to keep it.`,
        'Import backup', () => {
          completed = imported.completed;
          damagedStorage = false;
          save();
          render();
          showToast(storageWritable ? 'Backup imported and saved on this device.' : 'Backup imported for this session. Browser storage is unavailable; export before closing.');
        });
    } catch (error) { showToast(error.message); }
  });

  $('reset-button').addEventListener('click', () => confirmAction('Reset all progress?',
    'This will clear every checked achievement on this device. Export a backup first if you want to keep your progress.', 'Reset progress', () => {
      completed = new Set();
      damagedStorage = false;
      save();
      render();
      showToast(storageWritable ? 'Progress reset. A fresh journal awaits.' : 'Progress reset for this session. Browser storage is unavailable.');
    }));

  window.addEventListener('storage', event => {
    if (event.key !== STORAGE_KEY && event.key !== null) return;
    try {
      const data = event.newValue === null ? {completed: new Set(), updatedAt: null} : decodeProgress(event.newValue);
      completed = data.completed;
      updatedAt = data.updatedAt;
      damagedStorage = false;
      renderStorageStatus();
      render();
      showToast('Progress updated from another tab.');
    } catch { showToast('Another tab saved unreadable progress. This tab’s checklist has been kept.'); }
  });

  load();
  buildNavigation();
  render();
})();
