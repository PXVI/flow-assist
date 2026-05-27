'use strict';

const { test, expect } = require('@playwright/test');
const { launchFlowAssist, getMainWindowPage, DEFAULT_E2E_PROFILE } = require('../helpers/electron-app');
const { waitForProfileLoaded } = require('../helpers/wait-for-app');
const { copyProfileForMutation } = require('../helpers/profile-copy');

test.describe('List view — revert Done status', () => {
  test('Done main task reverts to Ongoing and moves to active list', async () => {
    const mutPath = copyProfileForMutation(DEFAULT_E2E_PROFILE, 'status-revert');
    const app = await launchFlowAssist({ profilePath: mutPath });
    try {
      const page = await getMainWindowPage(app);
      await waitForProfileLoaded(page);

      const title = 'E2E status revert ' + Date.now();
      await page.locator('#add-new-task-btn').click();
      await page.locator('#task-title').fill(title);
      await page.locator('#add-task-btn').click();

      const card = page.locator('#task-list .task-card').filter({ hasText: title });
      await expect(card).toBeVisible({ timeout: 15_000 });

      await card.locator('.task-bar').click();
      await card.locator('.task-body-actions .status-btn[data-status="Done"]').click();

      const doneCard = page.locator('#completed-task-list .task-card').filter({ hasText: title });
      await expect(doneCard).toBeVisible({ timeout: 15_000 });
      await expect(page.locator('#task-list .task-card').filter({ hasText: title })).toHaveCount(0);

      const ongoingBtn = doneCard.locator('.task-body-actions .status-btn[data-status="Ongoing"]');
      if (!(await ongoingBtn.isVisible())) {
        await doneCard.locator('.task-bar').click();
      }
      await ongoingBtn.click();

      const activeCard = page.locator('#task-list .task-card').filter({ hasText: title });
      await expect(activeCard).toBeVisible({ timeout: 15_000 });
      await expect(page.locator('#completed-task-list .task-card').filter({ hasText: title })).toHaveCount(0);
      await expect(activeCard.locator('.task-body-actions .status-btn[data-status="Ongoing"]')).toHaveClass(/active/);

      await activeCard.locator('.btn-update-status-changes').click();
      await expect(activeCard.locator('.task-update-status-changes-block .task-update-current')).toContainText('Current status: Ongoing');
    } finally {
      await app.close();
    }
  });
});
