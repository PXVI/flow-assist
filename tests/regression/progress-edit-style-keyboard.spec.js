'use strict';

const { test, expect } = require('@playwright/test');
const { launchFlowAssist, getMainWindowPage, DEFAULT_E2E_PROFILE } = require('../helpers/electron-app');
const { waitForProfileLoaded, navigateToListView } = require('../helpers/wait-for-app');
const { copyProfileForMutation } = require('../helpers/profile-copy');

async function readEditStyles(editEl) {
  return editEl.evaluate(function (el) {
    var cs = window.getComputedStyle(el);
    var probe = document.createElement('span');
    probe.style.color = 'var(--text-primary)';
    document.body.appendChild(probe);
    var textPrimary = window.getComputedStyle(probe).color;
    probe.style.color = 'var(--text-muted)';
    var textMuted = window.getComputedStyle(probe).color;
    document.body.removeChild(probe);
    var rect = el.getBoundingClientRect();
    return {
      borderTopWidth: cs.borderTopWidth,
      borderTopStyle: cs.borderTopStyle,
      backgroundColor: cs.backgroundColor,
      color: cs.color,
      width: rect.width,
      height: rect.height,
      textPrimary: textPrimary,
      textMuted: textMuted
    };
  });
}

test.describe('Progress edit styling — keyboard flow', () => {
  test('task: keyboard add then edit has bordered primary editor', async () => {
    const mutPath = copyProfileForMutation(DEFAULT_E2E_PROFILE, 'prog-edit-kbd');
    const app = await launchFlowAssist({ profilePath: mutPath });
    try {
      const page = await getMainWindowPage(app);
      await waitForProfileLoaded(page);
      await navigateToListView(page);

      const title = 'ProgEditKbd ' + Date.now();
      await page.locator('#add-new-task-btn').click();
      await page.locator('#task-title').fill(title);
      await page.locator('#add-task-btn').click();
      const card = page.locator('#task-list .task-card').filter({ hasText: title });
      await expect(card).toBeVisible({ timeout: 15_000 });
      await card.locator('.task-bar').click();

      const note = 'KeyboardNote_' + Date.now();
      const progIn = card.locator(':scope > .task-body > .task-progress-block .progress-add .progress-text-in.rich-markdown-wysiwyg');
      await progIn.click();
      await page.keyboard.type(note);
      await card.locator('.add-progress-btn').click();

      const li = card.locator('.task-progress-block .progress-list .progress-item').filter({ hasText: note });
      await expect(li).toBeVisible({ timeout: 10_000 });
      await li.locator('.btn-edit-progress').click();

      const editEl = li.locator('.progress-edit-text.rich-markdown-wysiwyg');
      await expect(editEl).toBeVisible();
      await expect(li.locator('.progress-item-view')).toHaveClass(/hidden/);
      await expect(li.locator('.progress-item-edit')).not.toHaveClass(/hidden/);

      const styles = await readEditStyles(editEl);
      expect(styles.width).toBeGreaterThan(80);
      expect(styles.height).toBeGreaterThan(20);
      expect(styles.borderTopWidth).not.toBe('0px');
      expect(styles.borderTopStyle).not.toBe('none');
      expect(styles.color).toBe(styles.textPrimary);
      expect(styles.color).not.toBe(styles.textMuted);
    } finally {
      await app.close();
    }
  });

  test('task: bold progress re-edit keeps bordered primary editor', async () => {
    const mutPath = copyProfileForMutation(DEFAULT_E2E_PROFILE, 'prog-edit-bold-kbd');
    const app = await launchFlowAssist({ profilePath: mutPath });
    try {
      const page = await getMainWindowPage(app);
      await waitForProfileLoaded(page);
      await navigateToListView(page);

      const card = page.locator('#task-list .task-card').filter({ hasText: 'Mega parent' }).first();
      await card.locator('.task-bar').click();
      const progIn = card.locator(':scope > .task-body > .task-progress-block .progress-add .progress-text-in.rich-markdown-wysiwyg');
      const boldBtn = card.locator('.task-progress-block .rich-fmt-btn[data-rich-cmd="bold"]');
      await progIn.click();
      await boldBtn.click();
      const token = 'BoldEdit_' + Date.now();
      await page.keyboard.type(token);
      await card.locator('.add-progress-btn').click();

      const li = card.locator('.task-progress-block .progress-list .progress-item').filter({ hasText: token });
      await li.locator('.btn-edit-progress').click();
      const editEl = li.locator('.progress-edit-text.rich-markdown-wysiwyg');
      await expect(editEl).toBeVisible();
      await expect(li).toHaveClass(/progress-item--editing/);
      const styles = await readEditStyles(editEl);
      expect(styles.borderTopWidth).not.toBe('0px');
      expect(styles.color).toBe(styles.textPrimary);
    } finally {
      await app.close();
    }
  });
});
