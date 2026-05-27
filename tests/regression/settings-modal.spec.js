'use strict';

const { test, expect } = require('@playwright/test');
const { launchFlowAssist, getMainWindowPage, DEFAULT_E2E_PROFILE } = require('../helpers/electron-app');
const { waitForProfileLoaded } = require('../helpers/wait-for-app');
const { copyProfileForMutation } = require('../helpers/profile-copy');

test.describe('Settings modal', () => {
  test('opens and cancel dismisses', async () => {
    const app = await launchFlowAssist();
    try {
      const page = await getMainWindowPage(app);
      await waitForProfileLoaded(page);
      const modal = page.locator('#settings-modal');

      await expect(modal).toHaveAttribute('aria-hidden', 'true');
      await page.locator('#settings-btn').click();
      await expect(modal).toHaveAttribute('aria-hidden', 'false');
      await expect(page.getByRole('dialog', { name: /settings/i })).toBeVisible();

      await page.locator('#settings-cancel-btn').click();
      await expect(modal).toHaveAttribute('aria-hidden', 'true');
    } finally {
      await app.close();
    }
  });

  test('work days and week start persist after save and reload', async () => {
    const mutPath = copyProfileForMutation(DEFAULT_E2E_PROFILE, 'settings-work-week');
    const app = await launchFlowAssist({ profilePath: mutPath });
    try {
      const page = await getMainWindowPage(app);
      await waitForProfileLoaded(page);

      await page.locator('#settings-btn').click();
      await page.locator('#setting-work-day-5').uncheck();
      await page.locator('#setting-week-start').selectOption('0');
      await page.locator('#settings-save-btn').click();
      await expect(page.locator('#settings-modal')).toHaveAttribute('aria-hidden', 'true');

      await page.reload();
      await waitForProfileLoaded(page);

      await page.locator('#settings-btn').click();
      await expect(page.locator('#setting-work-day-5')).not.toBeChecked();
      await expect(page.locator('#setting-week-start')).toHaveValue('0');

      await page.locator('#setting-work-day-5').check();
      await page.locator('#setting-week-start').selectOption('1');
      await page.locator('#settings-save-btn').click();
    } finally {
      await app.close();
    }
  });

  test('omit no concerns in summary is checked by default and persists after save', async () => {
    const mutPath = copyProfileForMutation(DEFAULT_E2E_PROFILE, 'settings-omit-concerns');
    const app = await launchFlowAssist({ profilePath: mutPath });
    try {
      const page = await getMainWindowPage(app);
      await waitForProfileLoaded(page);

      await page.locator('#settings-btn').click();
      const cb = page.locator('#setting-omit-no-concerns-summary');
      await expect(cb).toBeChecked();
      await cb.uncheck();
      await page.locator('#settings-save-btn').click();
      await expect(page.locator('#settings-modal')).toHaveAttribute('aria-hidden', 'true');

      await page.reload();
      await waitForProfileLoaded(page);

      await page.locator('#settings-btn').click();
      await expect(page.locator('#setting-omit-no-concerns-summary')).not.toBeChecked();

      await page.locator('#setting-omit-no-concerns-summary').check();
      await page.locator('#settings-save-btn').click();
    } finally {
      await app.close();
    }
  });

  test('theme Refined persists after save and reload', async () => {
    const mutPath = copyProfileForMutation(DEFAULT_E2E_PROFILE, 'settings-theme');
    const app = await launchFlowAssist({ profilePath: mutPath });
    try {
      const page = await getMainWindowPage(app);
      await waitForProfileLoaded(page);

      await page.locator('#settings-btn').click();
      await page.locator('#setting-theme').selectOption('refined');
      await page.locator('#settings-save-btn').click();
      await expect(page.locator('#settings-modal')).toHaveAttribute('aria-hidden', 'true');

      await page.reload();
      await waitForProfileLoaded(page);

      await page.locator('#settings-btn').click();
      await expect(page.locator('#setting-theme')).toHaveValue('refined');

      await page.locator('#setting-theme').selectOption('classic');
      await page.locator('#settings-save-btn').click();
    } finally {
      await app.close();
    }
  });
});
