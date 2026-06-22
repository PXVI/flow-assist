'use strict';

const { test, expect } = require('@playwright/test');
const { launchFlowAssist, getMainWindowPage } = require('../helpers/electron-app');
const { waitForProfileLoaded } = require('../helpers/wait-for-app');

test.describe('Add-task description — mixed bold/plain selection', () => {
  test('single click in empty description then type works', async () => {
    const app = await launchFlowAssist();
    try {
      const page = await getMainWindowPage(app);
      await waitForProfileLoaded(page);
      await page.locator('#add-new-task-btn').click();
      const desc = page.locator('#task-description');
      await desc.click();
      await page.keyboard.type('HelloWorld');
      await expect(desc).toContainText('HelloWorld');
    } finally {
      await app.close();
    }
  });

  test('click back into description after blur allows more typing', async () => {
    const app = await launchFlowAssist();
    try {
      const page = await getMainWindowPage(app);
      await waitForProfileLoaded(page);
      await page.locator('#add-new-task-btn').click();
      const desc = page.locator('#task-description');
      const title = page.locator('#task-title');

      await desc.click();
      await page.keyboard.type('FirstPass');
      await title.click();
      await desc.click();
      await page.keyboard.press('End');
      await page.keyboard.type(' SecondPass');
      await expect(desc).toContainText('FirstPass');
      await expect(desc).toContainText('SecondPass');
    } finally {
      await app.close();
    }
  });

  test('double-click and triple-click do not corrupt mixed formatting', async () => {
    const app = await launchFlowAssist();
    try {
      const page = await getMainWindowPage(app);
      await waitForProfileLoaded(page);
      await page.locator('#add-new-task-btn').click();
      const desc = page.locator('#task-description');
      await expect(desc).toBeVisible();

      await desc.evaluate(function (el) {
        el.innerHTML = '<b>BoldPart</b> plainPart';
        el.focus();
      });

      await desc.dblclick({ position: { x: 30, y: 12 } });
      await expect(desc).toHaveJSProperty('innerHTML', '<b>BoldPart</b> plainPart');

      await desc.click({ clickCount: 3, position: { x: 70, y: 12 } });
      await expect(desc).toHaveJSProperty('innerHTML', '<b>BoldPart</b> plainPart');
    } finally {
      await app.close();
    }
  });

  test('typing after bold leaves plain suffix outside bold tag when bold mode is off', async () => {
    const app = await launchFlowAssist();
    try {
      const page = await getMainWindowPage(app);
      await waitForProfileLoaded(page);
      await page.locator('#add-new-task-btn').click();
      const desc = page.locator('#task-description');

      await desc.evaluate(function (el) {
        el.innerHTML = '';
        el.focus();
        document.execCommand('insertText', false, 'BoldPart');
        var sel = window.getSelection();
        var n = el.firstChild;
        var r = document.createRange();
        r.setStart(n, 0);
        r.setEnd(n, 8);
        sel.removeAllRanges();
        sel.addRange(r);
        document.execCommand('bold', false, null);
        r.collapse(false);
        sel.removeAllRanges();
        sel.addRange(r);
        if (document.queryCommandState('bold')) document.execCommand('bold', false, null);
      });
      await page.keyboard.type(' plain');
      const html = await desc.innerHTML();
      expect(html).toMatch(/<b>BoldPart<\/b>\s* plain/);
      expect(html).not.toMatch(/<b>BoldPart plain/);
    } finally {
      await app.close();
    }
  });
});
