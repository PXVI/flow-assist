'use strict';

const { test, expect } = require('@playwright/test');
const { launchFlowAssist, getMainWindowPage, DEFAULT_E2E_PROFILE } = require('../helpers/electron-app');
const { waitForProfileLoaded, navigateToListView } = require('../helpers/wait-for-app');
const { copyProfileForMutation } = require('../helpers/profile-copy');

function offsetYMD(ymd, days) {
  const d = new Date(ymd + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

async function stubAlert(page) {
  await page.evaluate(function () {
    window.__testLastAlert = '';
    window.alert = function (msg) {
      window.__testLastAlert = String(msg || '');
    };
  });
}

async function readAlert(page) {
  return page.evaluate(function () {
    return window.__testLastAlert || '';
  });
}

async function openAddTaskForm(page) {
  await page.locator('#add-new-task-btn').click();
  await expect(page.locator('#add-new-task-block')).toBeVisible();
}

test.describe('Date entry integrity', () => {
  test('blocks progress add when date is before assigned date', async () => {
    const mutPath = copyProfileForMutation(DEFAULT_E2E_PROFILE, 'date-integ-prog-add');
    const app = await launchFlowAssist({ profilePath: mutPath });
    try {
      const page = await getMainWindowPage(app);
      await waitForProfileLoaded(page);
      await navigateToListView(page);

      const assigned = '2026-06-15';
      const title = 'DateIntegProgAdd ' + Date.now();
      await openAddTaskForm(page);
      await page.locator('#task-title').fill(title);
      await page.locator('#task-assigned').fill(assigned);
      await page.locator('#task-eta').fill(assigned);
      await page.locator('#add-task-btn').click();
      await expect(page.locator('#task-list').getByText(title, { exact: true })).toBeVisible({ timeout: 15_000 });

      const card = page.locator('#task-list .task-card').filter({ hasText: title }).first();
      await card.locator('.task-bar').click();
      const progressList = card.locator(':scope > .task-body > .task-progress-block .progress-list .progress-item');
      const beforeCount = await progressList.count();

      await stubAlert(page);
      await card.locator(':scope > .task-body > .task-progress-block .progress-date-in').fill(offsetYMD(assigned, -1));
      await card.locator(':scope > .task-body > .task-progress-block .progress-text-in').evaluate(function (el) {
        el.textContent = 'Early progress';
      });
      await card.locator('.add-progress-btn').click();

      expect(await readAlert(page)).toMatch(/Progress date must be on or after the assigned date/i);
      await expect(progressList).toHaveCount(beforeCount);
    } finally {
      await app.close();
    }
  });

  test('blocks progress edit when date is before assigned date', async () => {
    const mutPath = copyProfileForMutation(DEFAULT_E2E_PROFILE, 'date-integ-prog-edit');
    const app = await launchFlowAssist({ profilePath: mutPath });
    try {
      const page = await getMainWindowPage(app);
      await waitForProfileLoaded(page);
      await navigateToListView(page);

      const assigned = '2026-07-01';
      const title = 'DateIntegProgEdit ' + Date.now();
      await openAddTaskForm(page);
      await page.locator('#task-title').fill(title);
      await page.locator('#task-assigned').fill(assigned);
      await page.locator('#task-eta').fill(assigned);
      await page.locator('#add-task-btn').click();
      await expect(page.locator('#task-list').getByText(title, { exact: true })).toBeVisible({ timeout: 15_000 });

      const card = page.locator('#task-list .task-card').filter({ hasText: title }).first();
      await card.locator('.task-bar').click();
      await card.locator(':scope > .task-body > .task-progress-block .progress-date-in').fill(assigned);
      await card.locator(':scope > .task-body > .task-progress-block .progress-text-in').evaluate(function (el) {
        el.textContent = 'Valid entry';
      });
      await card.locator('.add-progress-btn').click();
      await expect(card.locator(':scope > .task-body > .task-progress-block .progress-list .progress-item')).toHaveCount(1, { timeout: 10_000 });

      const li = card.locator(':scope > .task-body > .task-progress-block .progress-list .progress-item').first();
      await li.locator('.btn-edit-progress').click();
      await expect(li.locator('.progress-item-edit')).not.toHaveClass(/hidden/);

      await stubAlert(page);
      await li.locator('.progress-edit-date').fill(offsetYMD(assigned, -2));
      await li.locator('.progress-save-btn').click();

      expect(await readAlert(page)).toMatch(/Progress date must be on or after the assigned date/i);
      await expect(li.locator('.progress-item-edit')).not.toHaveClass(/hidden/);
      await expect(li.locator('.progress-item-view')).toHaveClass(/hidden/);
    } finally {
      await app.close();
    }
  });

  test('blocks task create when ETA is before assigned date', async () => {
    const mutPath = copyProfileForMutation(DEFAULT_E2E_PROFILE, 'date-integ-eta-create');
    const app = await launchFlowAssist({ profilePath: mutPath });
    try {
      const page = await getMainWindowPage(app);
      await waitForProfileLoaded(page);
      await navigateToListView(page);

      const assigned = '2026-08-10';
      const title = 'DateIntegEtaCreate ' + Date.now();
      const before = await page.locator('#task-list .task-card').count();

      await openAddTaskForm(page);
      await page.locator('#task-title').fill(title);
      await page.locator('#task-assigned').fill(assigned);
      await page.locator('#task-eta').fill(offsetYMD(assigned, -1));

      await stubAlert(page);
      await page.locator('#add-task-btn').click();

      expect(await readAlert(page)).toMatch(/ETA cannot be before the assigned date/i);
      await expect(page.locator('#task-list .task-card')).toHaveCount(before, { timeout: 5000 });
      await expect(page.locator('#task-list').getByText(title, { exact: true })).toHaveCount(0);
    } finally {
      await app.close();
    }
  });

  test('blocks task details save when ETA is before assigned date', async () => {
    const mutPath = copyProfileForMutation(DEFAULT_E2E_PROFILE, 'date-integ-eta-details');
    const app = await launchFlowAssist({ profilePath: mutPath });
    try {
      const page = await getMainWindowPage(app);
      await waitForProfileLoaded(page);
      await navigateToListView(page);

      const assigned = '2026-09-05';
      const eta = offsetYMD(assigned, 7);
      const title = 'DateIntegEtaDetails ' + Date.now();
      await openAddTaskForm(page);
      await page.locator('#task-title').fill(title);
      await page.locator('#task-assigned').fill(assigned);
      await page.locator('#task-eta').fill(eta);
      await page.locator('#add-task-btn').click();
      await expect(page.locator('#task-list').getByText(title, { exact: true })).toBeVisible({ timeout: 15_000 });

      const card = page.locator('#task-list .task-card').filter({ hasText: title }).first();
      await card.locator('.task-bar').click();
      await card.locator('.btn-update-details').click();
      await expect(card.locator('.task-details-block')).not.toHaveClass(/task-block-collapsed/);
      await card.locator('.task-detail-eta').fill(offsetYMD(assigned, -1));

      await stubAlert(page);
      await card.locator('.save-task-details-btn').click();

      expect(await readAlert(page)).toMatch(/ETA cannot be before the assigned date/i);
      await expect(card.locator('.meta-chip-eta .meta-value')).toHaveText(eta);
    } finally {
      await app.close();
    }
  });
});
