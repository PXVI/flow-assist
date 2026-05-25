'use strict';

const { test, expect } = require('@playwright/test');
const { launchFlowAssist, getMainWindowPage } = require('../helpers/electron-app');
const { waitForProfileLoaded } = require('../helpers/wait-for-app');

test.describe('Top bar metrics', () => {
  test('shows date and productivity pills with hrs after load', async () => {
    const app = await launchFlowAssist();
    try {
      const page = await getMainWindowPage(app);
      await waitForProfileLoaded(page);

      await expect(page.locator('#top-bar-metrics')).toBeVisible();
      const dateVal = page.locator('#top-bar-date-value');
      await expect(dateVal).toBeVisible();
      await expect(dateVal).toHaveText(/\b(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\b/);

      const todayPv = page.locator('#top-bar-today-productivity-value');
      await expect(todayPv).toHaveText(/\d+(\.\d)? hrs \/ \d+(\.\d)? hrs/);
      await expect(todayPv.locator('.top-bar-metric-spent')).toHaveCount(1);

      const weekPv = page.locator('#top-bar-week-productivity-value');
      await expect(weekPv).toHaveText(/\d+(\.\d)? hrs \/ \d+(\.\d)? hrs/);
      await expect(page.locator('.top-bar-metric-pill')).toHaveCount(3);
    } finally {
      await app.close();
    }
  });
});
