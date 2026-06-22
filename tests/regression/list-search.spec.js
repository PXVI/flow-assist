'use strict';

const { test, expect } = require('@playwright/test');
const { launchFlowAssist, getMainWindowPage, DEFAULT_E2E_PROFILE } = require('../helpers/electron-app');
const { waitForProfileLoaded, navigateToListView } = require('../helpers/wait-for-app');
const { copyProfileForMutation } = require('../helpers/profile-copy');

test.describe('List view — task search', () => {
  test('description search filters tasks and Clear restores list', async () => {
    const app = await launchFlowAssist();
    try {
      const page = await getMainWindowPage(app);
      await waitForProfileLoaded(page);
      await navigateToListView(page);

      const search = page.locator('#list-search-input');
      const beforeCount = await page.locator('#task-list .task-card').count();
      expect(beforeCount).toBeGreaterThan(1);

      await search.fill('visibility toggles');
      await expect(page.locator('#task-list .task-card')).toHaveCount(1);
      await expect(page.locator('#task-list .task-card').first()).toContainText('Mega parent');

      await page.locator('#list-search-clear-btn').click();
      await expect(page.locator('#task-list .task-card')).toHaveCount(beforeCount);
    } finally {
      await app.close();
    }
  });

  test('progress note search finds parent task', async () => {
    const mutPath = copyProfileForMutation(DEFAULT_E2E_PROFILE, 'list-search-progress');
    const app = await launchFlowAssist({ profilePath: mutPath });
    try {
      const page = await getMainWindowPage(app);
      await waitForProfileLoaded(page);
      await navigateToListView(page);

      const card = page.locator('#task-list .task-card').filter({ hasText: 'Mega parent' }).first();
      await card.locator('.task-bar').click();
      const progIn = card.locator(':scope > .task-body > .task-progress-block .progress-add .progress-text-in');
      const note = 'SearchOnlyProgress ' + Date.now();
      await progIn.evaluate(function (el, text) {
        el.innerHTML = '';
        el.focus();
        el.textContent = text;
      }, note);
      await card.locator('.add-progress-btn').click();

      await page.locator('#list-search-input').fill(note);
      await expect(page.locator('#task-list .task-card')).toHaveCount(1);
      await expect(page.locator('#task-list .task-card').first()).toContainText('Mega parent');
    } finally {
      await app.close();
    }
  });

  test('bug number and tag search find matching tasks', async () => {
    const app = await launchFlowAssist();
    try {
      const page = await getMainWindowPage(app);
      await waitForProfileLoaded(page);
      await navigateToListView(page);

      await page.locator('#list-search-input').fill('5001');
      await expect(page.locator('#completed-task-list .task-card').filter({ hasText: '[T05] Dropped main' })).toHaveCount(1);

      await page.locator('#list-search-clear-btn').click();
      await page.locator('#list-search-input').fill('#visibility');
      await expect(page.locator('#task-list .task-card').filter({ hasText: 'Mega parent' })).toHaveCount(1);
    } finally {
      await app.close();
    }
  });

  test('nonsense query shows search empty state', async () => {
    const app = await launchFlowAssist();
    try {
      const page = await getMainWindowPage(app);
      await waitForProfileLoaded(page);
      await navigateToListView(page);

      await page.locator('#list-search-input').fill('zzznomatchquery999');
      await expect(page.locator('#task-list .empty-state')).toContainText('No tasks match your search.');
      await expect(page.locator('#task-list .task-card')).toHaveCount(0);
    } finally {
      await app.close();
    }
  });

  test('fuzzy typo tolerance finds tasks with near-miss spelling', async () => {
    const app = await launchFlowAssist();
    try {
      const page = await getMainWindowPage(app);
      await waitForProfileLoaded(page);
      await navigateToListView(page);

      await page.locator('#list-search-input').fill('visibilty toggles');
      await expect(page.locator('#task-list .task-card').filter({ hasText: 'Mega parent' })).toHaveCount(1);
    } finally {
      await app.close();
    }
  });

  test('regex search matches task title patterns', async () => {
    const app = await launchFlowAssist();
    try {
      const page = await getMainWindowPage(app);
      await waitForProfileLoaded(page);
      await navigateToListView(page);

      await page.locator('#list-search-input').fill('/\\[T05\\].*Dropped/i');
      await expect(page.locator('#completed-task-list .task-card').filter({ hasText: '[T05] Dropped main' })).toHaveCount(1);
      await expect(page.locator('#task-list .task-card')).toHaveCount(0);
    } finally {
      await app.close();
    }
  });

  test('search query persists across list tabs and respects tab filter', async () => {
    const app = await launchFlowAssist();
    try {
      const page = await getMainWindowPage(app);
      await waitForProfileLoaded(page);
      await navigateToListView(page);

      await page.locator('#list-search-input').fill('Mega parent');
      await expect(page.locator('#task-list .task-card')).toHaveCount(1);

      await page.locator('.list-view-tab[data-list-filter="archive"]').click();
      await expect(page.locator('#list-search-input')).toHaveValue('Mega parent');
      await expect(page.locator('#task-list .task-card')).toHaveCount(0);
      await expect(page.locator('#task-list .empty-state')).toContainText('No tasks match your search.');

      await page.locator('.list-view-tab[data-list-filter="all"]').click();
      await expect(page.locator('#task-list .task-card')).toHaveCount(1);
    } finally {
      await app.close();
    }
  });
});
