'use strict';

const { test, expect } = require('@playwright/test');
const { launchFlowAssist, getMainWindowPage } = require('../helpers/electron-app');
const { waitForProfileLoaded } = require('../helpers/wait-for-app');

async function openNotesView(page) {
  await page.locator('.nav-btn[data-view="notes"]').click();
  await expect(page.locator('#view-notes')).toHaveClass(/active/);
}

test.describe('Notes view — search', () => {
  test('body search filters notes and Clear restores board', async () => {
    const app = await launchFlowAssist();
    try {
      const page = await getMainWindowPage(app);
      await waitForProfileLoaded(page);
      await openNotesView(page);

      const search = page.locator('#notes-search-input');
      const beforeCount = await page.locator('#notes-board .notes-card').count();
      expect(beforeCount).toBeGreaterThan(1);

      await search.fill('mega parent / 24 sub-tasks');
      await expect(page.locator('#notes-board .notes-card')).toHaveCount(1);
      await expect(page.locator('#notes-board .notes-card').first()).toContainText('VIS-QA');

      await page.locator('#notes-search-clear-btn').click();
      await expect(page.locator('#notes-board .notes-card')).toHaveCount(beforeCount);
    } finally {
      await app.close();
    }
  });

  test('checklist item search finds matching todo note', async () => {
    const app = await launchFlowAssist();
    try {
      const page = await getMainWindowPage(app);
      await waitForProfileLoaded(page);
      await openNotesView(page);

      await page.locator('#notes-search-input').fill('Markdown export slice boundaries');
      await expect(page.locator('#notes-board .notes-card')).toHaveCount(1);
      await expect(page.locator('#notes-board .notes-card--todo').first()).toContainText('Regression');
    } finally {
      await app.close();
    }
  });

  test('nonsense query shows search empty state', async () => {
    const app = await launchFlowAssist();
    try {
      const page = await getMainWindowPage(app);
      await waitForProfileLoaded(page);
      await openNotesView(page);

      await page.locator('#notes-search-input').fill('zzznomatchnotes999');
      await expect(page.locator('#notes-board .notes-empty-state')).toContainText('No notes match your search.');
      await expect(page.locator('#notes-board .notes-card')).toHaveCount(0);
    } finally {
      await app.close();
    }
  });

  test('search combines with created date filter', async () => {
    const app = await launchFlowAssist();
    try {
      const page = await getMainWindowPage(app);
      await waitForProfileLoaded(page);
      await openNotesView(page);

      await page.locator('#notes-search-input').fill('mega parent / 24 sub-tasks');
      await expect(page.locator('#notes-board .notes-card')).toHaveCount(1);

      await page.locator('#notes-filter-mode').selectOption('day');
      await page.locator('#notes-filter-day').fill('2026-05-09');
      await page.locator('#notes-filter-apply').click();
      await expect(page.locator('#notes-search-input')).toHaveValue('mega parent / 24 sub-tasks');
      await expect(page.locator('#notes-board .notes-card')).toHaveCount(1);

      await page.locator('#notes-filter-day').fill('2020-01-01');
      await page.locator('#notes-filter-apply').click();
      await expect(page.locator('#notes-board .notes-empty-state')).toContainText('No notes match your search.');
    } finally {
      await app.close();
    }
  });

  test('fuzzy typo tolerance finds notes by near-miss checklist text', async () => {
    const app = await launchFlowAssist();
    try {
      const page = await getMainWindowPage(app);
      await waitForProfileLoaded(page);
      await openNotesView(page);

      await page.locator('#notes-search-input').fill('Markdwn export slice boundaries');
      await expect(page.locator('#notes-board .notes-card')).toHaveCount(1);
      await expect(page.locator('#notes-board .notes-card--todo').first()).toContainText('Regression');
    } finally {
      await app.close();
    }
  });

  test('regex search finds notes by pattern', async () => {
    const app = await launchFlowAssist();
    try {
      const page = await getMainWindowPage(app);
      await waitForProfileLoaded(page);
      await openNotesView(page);

      await page.locator('#notes-search-input').fill('/VIS-QA.*24 sub-tasks/i');
      await expect(page.locator('#notes-board .notes-card')).toHaveCount(1);
      await expect(page.locator('#notes-board .notes-card').first()).toContainText('VIS-QA');
    } finally {
      await app.close();
    }
  });
});
