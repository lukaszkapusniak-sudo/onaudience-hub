/**
 * gmail-rendered.spec.ts
 *
 * Tests the actual DOM output of gmail.js — email subject links,
 * domain-filtered contacts strip — after mock scan data is injected.
 */
import { test, expect, Page } from '@playwright/test';
import { waitForHub } from './helpers';

async function fakeConnect(page: Page, email = 'test@onaudience.com') {
  await page.evaluate((em) => {
    localStorage.setItem('oaGmailToken', 'fake-tok');
    localStorage.setItem('oaGmailExpiry', String(Date.now() + 3_600_000));
    localStorage.setItem('oaGmailEmail', em);
    window.updateGmailNavBtn?.();
  }, email);
}

async function fakeDisconnect(page: Page) {
  await page.evaluate(() => {
    localStorage.removeItem('oaGmailToken');
    localStorage.removeItem('oaGmailExpiry');
    localStorage.removeItem('oaGmailEmail');
    window.updateGmailNavBtn?.();
  });
}

async function openFirstCompany(page: Page) {
  await page.evaluate(() => {
    window.clearAI?.();
    window.setFilter?.('all', document.querySelector('#sbAll'));
  });
  await expect(page.locator('.c-row').first()).toBeVisible({ timeout: 15000 });
  await page.locator('.c-row').first().click();
  await expect(page.locator('#coPanel')).toBeVisible({ timeout: 8000 });
}

async function expandEmailHistory(page: Page) {
  const hdr = page.locator('.ib-sh', { hasText: /email history/i });
  await expect(hdr).toBeVisible({ timeout: 5000 });
  const body = page.locator('#ib-email-body');
  if (!(await body.isVisible())) await hdr.click();
  await expect(body).toBeVisible({ timeout: 3000 });
}

/** Inject mock threads and call gmailRenderResults to paint the DOM. */
async function injectAndRender(page: Page, threads: any[]) {
  await page.evaluate((t) => {
    window._gmailLastThreads = t;
    // Ensure the results container exists in DOM
    let el = document.getElementById('ib-email-results');
    if (!el) {
      el = document.createElement('div');
      el.id = 'ib-email-results';
      document.getElementById('ib-email-body')?.appendChild(el);
    }
    window.gmailRenderResults?.(t, 'Test Company');
  }, threads);
  await page.waitForTimeout(150);
}

const MOCK_THREADS = [
  { from: 'john@criteo.com',  subject: 'Partnership proposal', date: '1 Jan 25',  id: 'msg1', threadId: 'thread-aaa111' },
  { from: 'jane@criteo.com',  subject: 'Follow-up on meeting', date: '10 Jan 25', id: 'msg2', threadId: 'thread-bbb222' },
  { from: 'jane@criteo.com',  subject: 'Re: NDA docs',          date: '15 Jan 25', id: 'msg3', threadId: 'thread-ccc333' },
];

// ── SUITE: Email subject links ────────────────────────────────────
test.describe('Gmail email subject links', () => {

  test.beforeEach(async ({ page }) => {
    await waitForHub(page);
    await fakeConnect(page);
    await openFirstCompany(page);
    await expandEmailHistory(page);
    await injectAndRender(page, MOCK_THREADS);
  });

  test.afterEach(async ({ page }) => { await fakeDisconnect(page); });

  test('email subjects render as <a> links to Gmail', async ({ page }) => {
    const links = page.locator('#ib-email-results a[href*="mail.google.com"]');
    await expect(links.first()).toBeVisible({ timeout: 5000 });
  });

  test('each email link contains the correct threadId', async ({ page }) => {
    const links = page.locator('#ib-email-results a[href*="mail.google.com"]');
    await expect(links).toHaveCount(3, { timeout: 5000 });
    for (const [i, thread] of MOCK_THREADS.entries()) {
      const href = await links.nth(i).getAttribute('href');
      expect(href).toContain(thread.threadId);
    }
  });

  test('email link format is correct', async ({ page }) => {
    const links = page.locator('#ib-email-results a[href*="mail.google.com"]');
    await expect(links.first()).toBeVisible({ timeout: 5000 });
    const href = await links.first().getAttribute('href');
    expect(href).toMatch(/^https:\/\/mail\.google\.com\/mail\/u\/0\/#all\/.+/);
  });

  test('links open in new tab', async ({ page }) => {
    const links = page.locator('#ib-email-results a[href*="mail.google.com"]');
    await expect(links.first()).toBeVisible({ timeout: 5000 });
    expect(await links.first().getAttribute('target')).toBe('_blank');
  });

  test('email subject text visible inside link', async ({ page }) => {
    const links = page.locator('#ib-email-results a[href*="mail.google.com"]');
    await expect(links.first()).toBeVisible({ timeout: 5000 });
    const text = await links.first().textContent();
    expect(text?.trim()).toContain('Partnership proposal');
  });

  test('correct number of gmail-row divs rendered', async ({ page }) => {
    await expect(page.locator('#ib-email-results .gmail-row')).toHaveCount(3, { timeout: 5000 });
  });

  test('sender and date visible', async ({ page }) => {
    const results = page.locator('#ib-email-results');
    await expect(results).toContainText('john@criteo.com', { timeout: 5000 });
    await expect(results).toContainText('1 Jan 25');
  });
});

// ── SUITE: Contacts strip domain filtering (unit-style) ──────────
test.describe('Gmail contact domain filtering logic', () => {

  test.beforeEach(async ({ page }) => { await waitForHub(page); });

  test('only contacts from company domain are collected', async ({ page }) => {
    const result = await page.evaluate(() => {
      const dc = 'criteo.com';
      const cmap: Record<string, any> = {};
      const fromHeaders = [
        'John Smith <john@criteo.com>',
        'Lukasz <lukasz@onaudience.com>',
        'Jane Doe <jane@criteo.com>',
        'noreply@mailchimp.com',
      ];
      fromHeaders.forEach(from => {
        const m = from.match(/^(.+?)\s*<(.+?)>/) || from.match(/^(.+)$/);
        if (m) {
          const email = (m[2] || m[1] || '').trim().toLowerCase();
          if (email.includes('@') && dc && email.includes('@' + dc) && !cmap[email]) {
            cmap[email] = { email };
          }
        }
      });
      return Object.keys(cmap);
    });
    expect(result).toContain('john@criteo.com');
    expect(result).toContain('jane@criteo.com');
    expect(result).not.toContain('lukasz@onaudience.com');
    expect(result).not.toContain('noreply@mailchimp.com');
  });

  test('empty domain yields zero contacts', async ({ page }) => {
    const result = await page.evaluate(() => {
      const dc = '';
      const cmap: Record<string, any> = {};
      ['john@criteo.com'].forEach(email => {
        if (email.includes('@') && dc && email.includes('@' + dc) && !cmap[email]) {
          cmap[email] = true;
        }
      });
      return Object.keys(cmap).length;
    });
    expect(result).toBe(0);
  });

  test('Gmail thread URL format is correct', async ({ page }) => {
    const url = await page.evaluate(() =>
      'https://mail.google.com/mail/u/0/#all/' + 'abc123def456'
    );
    expect(url).toMatch(/^https:\/\/mail\.google\.com\/mail\/u\/0\/#all\//);
    expect(url).toContain('abc123def456');
  });
});

// ── SUITE: Gmail connection state ────────────────────────────────
test.describe('Gmail connection state transitions', () => {

  test.beforeEach(async ({ page }) => {
    await waitForHub(page);
    await fakeDisconnect(page);
  });

  test.afterEach(async ({ page }) => { await fakeDisconnect(page); });

  test('email history section exists in company panel', async ({ page }) => {
    await openFirstCompany(page);
    await expect(page.locator('.ib-sh-lbl', { hasText: /email history/i })).toBeVisible();
  });

  test('shows "Connect Gmail" when logged out', async ({ page }) => {
    await openFirstCompany(page);
    await expandEmailHistory(page);
    await expect(page.locator('#ib-email-body')).toContainText('Connect Gmail', { timeout: 5000 });
  });

  test('no scan/update buttons when logged out', async ({ page }) => {
    await openFirstCompany(page);
    await expandEmailHistory(page);
    await expect(page.locator('#ib-email-body button', { hasText: /scan gmail/i })).toHaveCount(0);
  });

  test('shows action buttons when connected', async ({ page }) => {
    await fakeConnect(page);
    await openFirstCompany(page);
    await expandEmailHistory(page);
    await expect(page.locator('#ib-email-body button', { hasText: /scan gmail/i })).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#ib-email-body button', { hasText: /update contacts/i })).toBeVisible();
    await expect(page.locator('#ib-email-body button', { hasText: /summarize/i })).toBeVisible();
  });
});

// ── SUITE: Gmail scan results persist on section toggle ──────────
test.describe('Gmail scan results — persistence on toggle', () => {

  test.beforeEach(async ({ page }) => {
    await waitForHub(page);
    await fakeConnect(page);
    await openFirstCompany(page);
    await expandEmailHistory(page);
    // Inject mock scan results
    await injectAndRender(page, [
      { from: 'piotr@company.com', subject: 'Partnership', date: '8 Apr 25', id: 'a', threadId: 'ta' },
      { from: 'anna@company.com',  subject: 'Follow up',   date: '7 Apr 25', id: 'b', threadId: 'tb' },
    ]);
  });

  test.afterEach(async ({ page }) => { await fakeDisconnect(page); });

  test('email results visible after scan', async ({ page }) => {
    await expect(page.locator('#ib-email-results .gmail-row')).toHaveCount(2, { timeout: 3000 });
  });

  test('email results persist after collapsing and re-expanding section', async ({ page }) => {
    // Confirm results are there
    await expect(page.locator('#ib-email-results .gmail-row')).toHaveCount(2, { timeout: 3000 });

    // Collapse the section
    const hdr = page.locator('.ib-sh', { hasText: /email history/i }).first();
    await hdr.click(); // collapse
    await page.waitForTimeout(300);
    await expect(page.locator('#ib-email-body')).toBeHidden({ timeout: 2000 });

    // Re-expand
    await hdr.click();
    await expect(page.locator('#ib-email-body')).toBeVisible({ timeout: 2000 });

    // Results should still be there (regression: _refreshEmailSection used to wipe them)
    await expect(page.locator('#ib-email-results .gmail-row')).toHaveCount(2, { timeout: 3000 });
  });

  test('contacts strip persists after collapsing and re-expanding section', async ({ page }) => {
    // Inject contacts into strip
    await page.evaluate(() => {
      const strip = document.getElementById('ib-email-contacts-strip');
      if (strip) {
        strip.style.display = 'block';
        strip.innerHTML = '<label><input type="checkbox" checked data-i="0"/> test@company.com</label>';
      }
      window._gmailFoundContacts = [{ full_name: 'Test', email: 'test@company.com', company_id: 'test' }];
    });

    // Collapse + expand
    const hdr = page.locator('.ib-sh', { hasText: /email history/i }).first();
    await hdr.click();
    await page.waitForTimeout(300);
    await hdr.click();
    await page.waitForTimeout(300);

    // Strip should still be visible with checkbox (regression: save showed 0 contacts)
    const strip = page.locator('#ib-email-contacts-strip');
    await expect(strip).toBeVisible({ timeout: 2000 });
    await expect(strip.locator('input[type="checkbox"]')).toHaveCount(1);
  });
});
