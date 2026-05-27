'use strict';

const path = require('path');
const { test, expect } = require('@playwright/test');
const { launchFlowAssist, getMainWindowPage, DEFAULT_E2E_PROFILE } = require('../helpers/electron-app');

const ALT_EMPTY_PROFILE = path.join(__dirname, '..', 'fixtures', 'alt-empty.fa.json');
const { waitForProfileLoaded, navigateToListView } = require('../helpers/wait-for-app');
const { copyProfileForMutation } = require('../helpers/profile-copy');

/** Previous calendar week (Mon–Sun) matching default summary date logic. */
function prevWeekRangeYMD() {
  function toYMD(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  function parseYMD(ymd) {
    const parts = ymd.split('-');
    return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  }
  function addDays(ymd, n) {
    const date = parseYMD(ymd);
    date.setDate(date.getDate() + n);
    return toYMD(date);
  }
  function getWeekStartYMD(ymd, weekStartDay) {
    const date = parseYMD(ymd);
    const day = date.getDay();
    const diff = (day - weekStartDay + 7) % 7;
    date.setDate(date.getDate() - diff);
    return toYMD(date);
  }
  const today = toYMD(new Date());
  const weekStartDay = 1;
  const thisWeekStart = getWeekStartYMD(today, weekStartDay);
  const from = addDays(thisWeekStart, -7);
  const to = addDays(from, 6);
  const mid = addDays(from, 2);
  return { from, to, mid };
}

test.describe('Summary view', () => {
  test('generate summary fills output; export options modal opens and closes', async () => {
    const app = await launchFlowAssist();
    try {
      const page = await getMainWindowPage(app);
      await waitForProfileLoaded(page);
      await page.locator('.nav-btn[data-view="summary"]').click();
      await expect(page.locator('#view-summary')).toHaveClass(/active/);

      await expect(page.locator('#summary-from')).toBeVisible();
      await expect(page.locator('#summary-to')).toBeVisible();

      await page.locator('#generate-summary-btn').click();
      await expect(page.locator('#summary-output')).toContainText(/./, { timeout: 30_000 });

      await page.locator('#export-options-btn').click();
      const exportModal = page.locator('#export-options-modal');
      await expect(exportModal).toHaveAttribute('aria-hidden', 'false');
      await page.locator('#export-options-done-btn').click();
      await expect(exportModal).toHaveAttribute('aria-hidden', 'true');
    } finally {
      await app.close();
    }
  });

  test('export format select changes value', async () => {
    const app = await launchFlowAssist();
    try {
      const page = await getMainWindowPage(app);
      await waitForProfileLoaded(page);
      await page.locator('.nav-btn[data-view="summary"]').click();
      await page.locator('#summary-export-format').selectOption('confluence-markdown');
      await expect(page.locator('#summary-export-format')).toHaveValue('confluence-markdown');
    } finally {
      await app.close();
    }
  });

  test('backdated assigned date: task with in-range progress appears in summary lists', async () => {
    const mutPath = copyProfileForMutation(DEFAULT_E2E_PROFILE, 'summary-backdated-assigned');
    const app = await launchFlowAssist({ profilePath: mutPath });
    const { from, to, mid } = prevWeekRangeYMD();
    const taskTitle = 'E2E Summary backdated ' + Date.now();
    try {
      const page = await getMainWindowPage(app);
      await waitForProfileLoaded(page);
      await navigateToListView(page);

      await page.locator('#add-new-task-btn').click();
      await page.locator('#task-title').fill(taskTitle);
      await page.locator('#add-task-btn').click();
      await expect(page.locator('#task-list').getByText(taskTitle)).toBeVisible({ timeout: 15_000 });

      const card = page.locator('#task-list .task-card').filter({ hasText: taskTitle }).first();
      await card.locator('.task-bar').click();
      await card.locator('.btn-update-details').click();
      await expect(card.locator('.task-details-block')).toBeVisible();
      await card.locator('.task-detail-assigned').fill(mid);
      await card.locator('.save-task-details-btn').click();

      const progDate = card.locator(':scope > .task-body > .task-progress-block .progress-date-in');
      await progDate.fill(mid);
      await card.locator(':scope > .task-body > .task-progress-block .progress-effort-in').fill('2');
      const progText = card.locator(':scope > .task-body > .task-progress-block .progress-add .progress-text-in');
      await progText.evaluate(function (el) {
        el.textContent = 'Work in summary range';
      });
      await card.locator('.add-progress-btn').click();

      await page.locator('.nav-btn[data-view="summary"]').click();
      await page.locator('#summary-from').fill(from);
      await page.locator('#summary-to').fill(to);
      await page.locator('#generate-summary-btn').click();

      const output = page.locator('#summary-output');
      await expect(output).toContainText(taskTitle, { timeout: 30_000 });
      await expect(output.getByText('Cumulative Summary', { exact: false })).toBeVisible();
    } finally {
      await app.close();
    }
  });

  test('HTML/CSS export omits empty concerns when setting enabled', async () => {
    const mutPath = copyProfileForMutation(ALT_EMPTY_PROFILE, 'summary-omit-concerns-export');
    const app = await launchFlowAssist({ profilePath: mutPath });
    const { from, to, mid } = prevWeekRangeYMD();
    const taskTitle = 'E2E Summary omit empty ' + Date.now();
    try {
      const page = await getMainWindowPage(app);
      await waitForProfileLoaded(page);
      await navigateToListView(page);

      await page.locator('#add-new-task-btn').click();
      await page.locator('#task-title').fill(taskTitle);
      await page.locator('#add-task-btn').click();
      await expect(page.locator('#task-list').getByText(taskTitle)).toBeVisible({ timeout: 15_000 });

      await page.evaluate(
        async ({ title, assignedYMD, progressYMD }) => {
          const res = await window.taskAPI.loadTasks();
          const data = res.data;
          const t = (data.tasks || []).find(function (x) { return x.title === title; });
          if (!t) throw new Error('task not found: ' + title);
          t.assigned_date = assignedYMD;
          t.progress_updates = [{
            id: 'e2e-prog-' + Date.now(),
            text: 'Progress without concerns',
            date_added: progressYMD,
            effort_consumed_hours: 1,
            categories: []
          }];
          await window.taskAPI.saveTasks(data);
        },
        { title: taskTitle, assignedYMD: mid, progressYMD: mid }
      );

      await page.reload();
      await waitForProfileLoaded(page);

      await page.locator('.nav-btn[data-view="summary"]').click();
      await page.locator('#summary-from').fill(from);
      await page.locator('#summary-to').fill(to);
      await page.locator('#generate-summary-btn').click();
      await expect(page.locator('#summary-output')).toContainText(taskTitle, { timeout: 30_000 });

      await page.locator('#export-summary-btn').click();
      const htmlBody = page.locator('.summary-export-tab-panel.is-active .summary-export-text-split[data-copy-id="html"]');
      await expect(htmlBody).toBeVisible({ timeout: 15_000 });
      const htmlWithOmit = await htmlBody.inputValue();
      const rowWithOmit = htmlWithOmit.match(
        new RegExp(
          '<tr[^>]*>[\\s\\S]*?' + taskTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[\\s\\S]*?</tr>'
        )
      );
      expect(rowWithOmit).toBeTruthy();
      expect(rowWithOmit[0]).not.toMatch(/Concerns:/);

      await page.locator('#settings-btn').click();
      await page.locator('#setting-omit-no-concerns-summary').uncheck();
      await page.locator('#settings-save-btn').click();
      await expect(page.locator('#settings-modal')).toHaveAttribute('aria-hidden', 'true');

      await page.locator('#generate-summary-btn').click();
      await page.locator('#export-summary-btn').click();
      await expect(htmlBody).toBeVisible({ timeout: 15_000 });
      const htmlWithoutOmit = await htmlBody.inputValue();
      const rowWithoutOmit = htmlWithoutOmit.match(
        new RegExp(
          '<tr[^>]*>[\\s\\S]*?' + taskTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[\\s\\S]*?</tr>'
        )
      );
      expect(rowWithoutOmit).toBeTruthy();
      expect(rowWithoutOmit[0]).toMatch(/Concerns:/);
      expect(rowWithoutOmit[0]).toMatch(/None/);
    } finally {
      await app.close();
    }
  });

  test('HTML/CSS export: progress without categories keeps number and note on same line', async () => {
    const mutPath = copyProfileForMutation(ALT_EMPTY_PROFILE, 'summary-progress-inline-export');
    const app = await launchFlowAssist({ profilePath: mutPath });
    const { from, to, mid } = prevWeekRangeYMD();
    const taskTitle = 'E2E Summary progress inline ' + Date.now();
    const progressNote = 'Inline note without category tags';
    try {
      const page = await getMainWindowPage(app);
      await waitForProfileLoaded(page);
      await navigateToListView(page);

      await page.locator('#add-new-task-btn').click();
      await page.locator('#task-title').fill(taskTitle);
      await page.locator('#add-task-btn').click();
      await expect(page.locator('#task-list').getByText(taskTitle)).toBeVisible({ timeout: 15_000 });

      await page.evaluate(
        async ({ title, assignedYMD, progressYMD, note }) => {
          const res = await window.taskAPI.loadTasks();
          const data = res.data;
          const t = (data.tasks || []).find(function (x) { return x.title === title; });
          if (!t) throw new Error('task not found: ' + title);
          t.assigned_date = assignedYMD;
          t.progress_updates = [{
            id: 'e2e-prog-' + Date.now(),
            text: note,
            date_added: progressYMD,
            effort_consumed_hours: 2,
            categories: []
          }];
          await window.taskAPI.saveTasks(data);
        },
        { title: taskTitle, assignedYMD: mid, progressYMD: mid, note: progressNote }
      );

      await page.reload();
      await waitForProfileLoaded(page);

      await page.locator('.nav-btn[data-view="summary"]').click();
      await page.locator('#summary-from').fill(from);
      await page.locator('#summary-to').fill(to);
      await page.locator('#generate-summary-btn').click();
      await expect(page.locator('#summary-output')).toContainText(taskTitle, { timeout: 30_000 });

      await page.locator('#export-options-btn').click();
      await page.locator('#export-opt-show-progress-hrs').uncheck();
      await page.locator('#export-options-done-btn').click();

      await page.locator('#export-summary-btn').click();
      const htmlBody = page.locator('.summary-export-tab-panel.is-active .summary-export-text-split[data-copy-id="html"]');
      await expect(htmlBody).toBeVisible({ timeout: 15_000 });
      const html = await htmlBody.inputValue();
      const row = html.match(
        new RegExp(
          '<tr[^>]*>[\\s\\S]*?' + taskTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[\\s\\S]*?</tr>'
        )
      );
      expect(row).toBeTruthy();
      const rowHtml = row[0];
      expect(rowHtml).toContain('export-progress-item--inline');
      expect(rowHtml).toContain('export-progress-line');
      expect(rowHtml).toMatch(
        /export-progress-line[\s\S]*export-progress-num[\s\S]*export-progress-text[\s\S]*Inline note without category tags/
      );
      expect(rowHtml).not.toContain('export-progress-num-cell');
      expect(rowHtml).not.toContain('export-progress-content');
      expect(rowHtml).not.toContain('export-progress-text--indented');
    } finally {
      await app.close();
    }
  });

  test('legacy open vs assigned mismatch: task still listed when progress is in range', async () => {
    const mutPath = copyProfileForMutation(DEFAULT_E2E_PROFILE, 'summary-legacy-open-mismatch');
    const app = await launchFlowAssist({ profilePath: mutPath });
    const { from, to, mid } = prevWeekRangeYMD();
    const taskTitle = 'E2E Summary legacy mismatch ' + Date.now();
    const today = new Date().toISOString().slice(0, 10);
    try {
      const page = await getMainWindowPage(app);
      await waitForProfileLoaded(page);
      await navigateToListView(page);

      await page.locator('#add-new-task-btn').click();
      await page.locator('#task-title').fill(taskTitle);
      await page.locator('#add-task-btn').click();
      await expect(page.locator('#task-list').getByText(taskTitle)).toBeVisible({ timeout: 15_000 });

      await page.evaluate(
        async ({ title, assignedYMD, openYMD, progressYMD }) => {
          const res = await window.taskAPI.loadTasks();
          const data = res.data;
          const t = (data.tasks || []).find(function (x) { return x.title === title; });
          if (!t) throw new Error('task not found: ' + title);
          t.assigned_date = assignedYMD;
          (t.status_changes || []).forEach(function (c) {
            if (c.status === 'Open') c.date = openYMD;
          });
          t.progress_updates = [{
            id: 'e2e-prog-' + Date.now(),
            text: 'Legacy mismatch progress',
            date_added: progressYMD,
            effort_consumed_hours: 1.5,
            categories: []
          }];
          await window.taskAPI.saveTasks(data);
        },
        { title: taskTitle, assignedYMD: mid, openYMD: today, progressYMD: mid }
      );

      await page.reload();
      await waitForProfileLoaded(page);

      await page.locator('.nav-btn[data-view="summary"]').click();
      await page.locator('#summary-from').fill(from);
      await page.locator('#summary-to').fill(to);
      await page.locator('#generate-summary-btn').click();

      await expect(page.locator('#summary-output')).toContainText(taskTitle, { timeout: 30_000 });
    } finally {
      await app.close();
    }
  });
});
