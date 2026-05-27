'use strict';

const { test, expect } = require('@playwright/test');
const { launchFlowAssist, getMainWindowPage, DEFAULT_E2E_PROFILE } = require('../helpers/electron-app');
const { waitForProfileLoaded } = require('../helpers/wait-for-app');
const { copyProfileForMutation } = require('../helpers/profile-copy');

test.describe('List view — tabs and sort', () => {
  test('list filter tabs switch without error', async () => {
    const app = await launchFlowAssist();
    try {
      const page = await getMainWindowPage(app);
      await waitForProfileLoaded(page);

      await page.locator('.list-view-tab[data-list-filter="today"]').click();
      await expect(page.locator('#view-list')).toHaveClass(/active/);

      await page.locator('.list-view-tab[data-list-filter="archive"]').click();
      await page.locator('.list-view-tab[data-list-filter="all"]').click();
      await expect(page.locator('.list-view-tab[data-list-filter="all"]')).toHaveClass(/active/);
    } finally {
      await app.close();
    }
  });

  test('Effort Wise week range follows Settings week start day', async () => {
    const app = await launchFlowAssist();
    try {
      const page = await getMainWindowPage(app);
      await waitForProfileLoaded(page);

      await page.locator('#settings-btn').click();
      await page.locator('#setting-week-start').selectOption('0');
      await page.locator('#settings-save-btn').click();
      await expect(page.locator('#settings-modal')).toHaveAttribute('aria-hidden', 'true');

      await page.locator('.list-view-tab[data-list-filter="effortwise"]').click();
      await page.locator('.effort-wise-granularity-btn[data-effort-granularity="week"]').click();

      const goto = page.locator('#effort-wise-goto-date');
      await goto.evaluate(function (el) {
        el.value = '2026-05-27';
        el.dispatchEvent(new Event('change', { bubbles: true }));
      });

      await expect(page.locator('#effort-wise-period-label')).toContainText('May 24, 2026');
      await expect(page.locator('#effort-wise-period-label')).toContainText('May 30, 2026');

      await page.locator('#settings-btn').click();
      await page.locator('#setting-week-start').selectOption('1');
      await page.locator('#settings-save-btn').click();
      await expect(page.locator('#settings-modal')).toHaveAttribute('aria-hidden', 'true');

      await goto.evaluate(function (el) {
        el.value = '2026-05-27';
        el.dispatchEvent(new Event('change', { bubbles: true }));
      });

      await expect(page.locator('#effort-wise-period-label')).toContainText('May 25, 2026');
      await expect(page.locator('#effort-wise-period-label')).toContainText('May 31, 2026');
    } finally {
      await app.close();
    }
  });

  test('Effort Wise tab shows toolbar and Day/Week granularity', async () => {
    const app = await launchFlowAssist();
    try {
      const page = await getMainWindowPage(app);
      await waitForProfileLoaded(page);

      await page.locator('.list-view-tab[data-list-filter="effortwise"]').click();
      await expect(page.locator('.list-view-tab[data-list-filter="effortwise"]')).toHaveClass(/active/);
      const toolbar = page.locator('#effort-wise-toolbar');
      await expect(toolbar).toBeVisible();
      await expect(page.locator('#effort-wise-period-label')).not.toBeEmpty();
      await expect(page.locator('#effort-wise-spent-value')).toBeVisible();
      await expect(page.locator('#effort-wise-capacity-value')).toBeVisible();
      await expect(page.locator('#effort-wise-spent-value')).not.toContainText('hrs');
      await expect(page.locator('#effort-wise-capacity-value')).not.toContainText('hrs');

      await page.locator('.effort-wise-granularity-btn[data-effort-granularity="week"]').click();
      await expect(page.locator('#effort-wise-spent-value')).toBeVisible();
      await expect(page.locator('.effort-wise-granularity-btn[data-effort-granularity="week"]')).toHaveClass(/active/);

      await page.locator('#effort-wise-prev-btn').click();
      await expect(toolbar).toBeVisible();
      await expect(page.locator('#effort-wise-period-label')).not.toBeEmpty();
    } finally {
      await app.close();
    }
  });

  test('sort menu opens and closes; selecting an option closes menu', async () => {
    const app = await launchFlowAssist();
    try {
      const page = await getMainWindowPage(app);
      await waitForProfileLoaded(page);

      const wrap = page.locator('.main-task-filter-wrap');
      await page.locator('#main-task-filter-btn').click();
      await expect(wrap).toHaveClass(/open/);

      const firstOpt = wrap.locator('#main-task-filter-menu .filter-option').first();
      await firstOpt.click();
      await expect(wrap).not.toHaveClass(/open/);
    } finally {
      await app.close();
    }
  });

  test('completed task section lists Done area', async () => {
    const app = await launchFlowAssist();
    try {
      const page = await getMainWindowPage(app);
      await waitForProfileLoaded(page);

      await expect(page.locator('section.completed-tasks-section')).toBeVisible();
      await expect(page.locator('#completed-task-list')).toBeAttached();
    } finally {
      await app.close();
    }
  });

  test('Add New Task button is in main heading row', async () => {
    const app = await launchFlowAssist();
    try {
      const page = await getMainWindowPage(app);
      await waitForProfileLoaded(page);

      const btn = page.locator('#add-new-task-btn');
      await expect(btn).toBeVisible();
      await expect(page.locator('.main-tasks-heading-row')).toContainText('Add New Task');
      await expect(btn.locator('xpath=ancestor::div[contains(@class,"main-tasks-heading-row")]')).toHaveCount(1);
    } finally {
      await app.close();
    }
  });

  test('Done Hide persists in profile after reload', async () => {
    const mutPath = copyProfileForMutation(DEFAULT_E2E_PROFILE, 'done-hide-persist');
    const app = await launchFlowAssist({ profilePath: mutPath });
    try {
      const page = await getMainWindowPage(app);
      await waitForProfileLoaded(page);

      const hideBtn = page.locator('#completed-tasks-hide-btn');
      const list = page.locator('#completed-task-list');

      await hideBtn.click();
      await expect(hideBtn).toHaveText('Unhide');
      await expect(list).toBeHidden();

      await page.reload();
      await waitForProfileLoaded(page);

      await expect(hideBtn).toHaveText('Unhide');
      await expect(list).toBeHidden();
    } finally {
      await app.close();
    }
  });

  test('Done Hide toggles completed task list visibility', async () => {
    const app = await launchFlowAssist();
    try {
      const page = await getMainWindowPage(app);
      await waitForProfileLoaded(page);

      const hideBtn = page.locator('#completed-tasks-hide-btn');
      const list = page.locator('#completed-task-list');

      await expect(hideBtn).toHaveText('Hide');
      await expect(list).toBeVisible();

      await hideBtn.click();
      await expect(hideBtn).toHaveText('Unhide');
      await expect(list).toBeHidden();

      await hideBtn.click();
      await expect(hideBtn).toHaveText('Hide');
      await expect(list).toBeVisible();
    } finally {
      await app.close();
    }
  });
});
