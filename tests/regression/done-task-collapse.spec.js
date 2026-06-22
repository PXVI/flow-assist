'use strict';

const { test, expect } = require('@playwright/test');
const { launchFlowAssist, getMainWindowPage, DEFAULT_E2E_PROFILE } = require('../helpers/electron-app');
const { waitForProfileLoaded } = require('../helpers/wait-for-app');
const { copyProfileForMutation } = require('../helpers/profile-copy');

test.describe('List view — done tasks collapse', () => {
  test('main task collapses when marked Done', async () => {
    const mutPath = copyProfileForMutation(DEFAULT_E2E_PROFILE, 'done-collapse-main');
    const app = await launchFlowAssist({ profilePath: mutPath });
    try {
      const page = await getMainWindowPage(app);
      await waitForProfileLoaded(page);

      const title = 'E2E done collapse main ' + Date.now();
      await page.locator('#add-new-task-btn').click();
      await page.locator('#task-title').fill(title);
      await page.locator('#add-task-btn').click();

      const card = page.locator('#task-list .task-card').filter({ hasText: title });
      await expect(card).toBeVisible({ timeout: 15_000 });

      await card.locator('.task-bar').click();
      await expect(card).toHaveClass(/expanded/);
      await card.locator('.task-body-actions .status-btn[data-status="Done"]').click();

      const doneCard = page.locator('#completed-task-list .task-card').filter({ hasText: title });
      await expect(doneCard).toBeVisible({ timeout: 15_000 });
      await expect(doneCard).not.toHaveClass(/expanded/);
    } finally {
      await app.close();
    }
  });

  test('sub-task collapses when marked Done', async () => {
    const mutPath = copyProfileForMutation(DEFAULT_E2E_PROFILE, 'done-collapse-sub');
    const app = await launchFlowAssist({ profilePath: mutPath });
    try {
      const page = await getMainWindowPage(app);
      await waitForProfileLoaded(page);

      const parentTitle = 'E2E done collapse parent ' + Date.now();
      await page.locator('#add-new-task-btn').click();
      await page.locator('#task-title').fill(parentTitle);
      await page.locator('#add-task-btn').click();

      const card = page.locator('#task-list .task-card').filter({ hasText: parentTitle });
      await expect(card).toBeVisible({ timeout: 15_000 });
      await card.locator('.task-bar').click();

      const subTitle = 'E2E done collapse sub ' + Date.now();
      await card.locator('.btn-new-subtask').click();
      const block = card.locator('.new-subtask-block');
      await block.locator('.new-subtask-title-in').fill(subTitle);
      await block.locator('.add-subtask-submit-btn').click();

      const sub = card.locator('.subtask-card').filter({ hasText: subTitle });
      await expect(sub).toBeVisible({ timeout: 15_000 });
      await sub.locator('.subtask-bar').click();
      await expect(sub).toHaveClass(/expanded/);
      await sub.locator('.status-buttons-sub .status-btn[data-status="Done"]').click();

      await expect(sub).not.toHaveClass(/expanded/);
    } finally {
      await app.close();
    }
  });
});
