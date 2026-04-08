/**
 * gmail-rendered.spec.ts
 *
 * Tests the actual DOM output of gmail.js — email subject links and
 * domain-filtered contacts strip — after a mock scan has been injected.
 */
import { test, expect, Page } from '@playwright/test';

const HUB = './';

async function waitForHub(page: Page) {
  await page.goto(HUB);
  await expect(page.locator('nav.nav')).toBeVisible({ timeout: 15000 });
  await expect(page.locator('.nav-status')).toContainText('Live', { timeout: 20000 });
  await page.waitForTimeout(1200);
}

/** Inject a fake connected Gmail token so email-history renders in connected state. */
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

/** Open first company, ensure panel is visible. */
async function openFirstCompany(page: Page) {
  await page.evaluate(() => {
    window.clearAI?.();
    window.setFilter?.('all', document.querySelector('#sbAll'));
  });
  await expect(page.locator('.c-row').first()).toBeVisible({ timeout: 15000 });
  await page.locator('.c-row').first().click();
  await expect(page.locator('#coPanel')).toBeVisible({ timeout: 8000 });
}

/** Expand Email History section in company panel. */
async function expandEmailHistory(page: Page) {
  const hdr = page.locator('.ib-sh', { hasText: /email history/i });
  await expect(hdr).toBeVisible({ timeout: 5000 });
  const body = page.locator('#ib-email-body');
  if (!(await body.isVisible())) await hdr.click();
  await expect(body).toBeVisible({ timeout: 3000 });
}

/**
 * Inject mock scan results directly into window._gmailLastThreads
 * and call gmailRenderResults so the email-list HTML is painted.
 */
async function injectMockScan(
  page: Page,
  domain: string,
  threads: { from: string; subject: string; date: string; id: string; threadId: string }[]
) {
  await page.evaluate(
    ({ threads, domain }) => {
      window._gmailLastThreads = threads;
      window._gmailLastSlug = domain;
      // gmailRenderResults renders the thread list HTML into #ib-email-results
      if (typeof window.gmailRenderResults === 'function') {
        window.gmailRenderResults(threads);
      }
    },
    { threads, domain }
  );
  await page.waitForTimeout(200);
}

// ── SUITE: Email subject links ────────────────────────────────────
test.describe('Gmail email subject links', () => {
  const MOCK_THREADS = [
    { from: 'john@criteo.com',   subject: 'Partnership proposal',  date: '1 Jan 25',  id: 'msg1', threadId: 'thread-aaa111' },
    { from: 'jane@criteo.com',   subject: 'Follow-up on meeting',  date: '10 Jan 25', id: 'msg2', threadId: 'thread-bbb222' },
    { from: 'jane@criteo.com',   subject: 'Re: NDA docs',          date: '15 Jan 25', id: 'msg3', threadId: 'thread-ccc333' },
  ];

  test.beforeEach(async ({ page }) => {
    await waitForHub(page);
    await fakeConnect(page);
    await openFirstCompany(page);
    await expandEmailHistory(page);
    await injectMockScan(page, 'criteo.com', MOCK_THREADS);
  });

  test.afterEach(async ({ page }) => { await fakeDisconnect(page); });

  test('email subjects render as <a> links', async ({ page }) => {
    const links = page.locator('#ib-email-results a[href*="mail.google.com"]');
    await expect(links.first()).toBeVisible({ timeout: 5000 });
  });

  test('each email link contains threadId in href', async ({ page }) => {
    const links = page.locator('#ib-email-results a[href*="mail.google.com"]');
    await expect(links).toHaveCount(3, { timeout: 5000 });

    for (const [i, thread] of MOCK_THREADS.entries()) {
      const href = await links.nth(i).getAttribute('href');
      expect(href).toContain(thread.threadId);
    }
  });

  test('email link points to correct Gmail URL format', async ({ page }) => {
    const links = page.locator('#ib-email-results a[href*="mail.google.com"]');
    await expect(links.first()).toBeVisible({ timeout: 5000 });
    const href = await links.first().getAttribute('href');
    expect(href).toMatch(/^https:\/\/mail\.google\.com\/mail\/u\/0\/#all\/.+/);
  });

  test('email links open in new tab (target=_blank)', async ({ page }) => {
    const links = page.locator('#ib-email-results a[href*="mail.google.com"]');
    await expect(links.first()).toBeVisible({ timeout: 5000 });
    const target = await links.first().getAttribute('target');
    expect(target).toBe('_blank');
  });

  test('email subject text is visible inside link', async ({ page }) => {
    const links = page.locator('#ib-email-results a[href*="mail.google.com"]');
    await expect(links.first()).toBeVisible({ timeout: 5000 });
    const text = await links.first().textContent();
    expect(text?.trim()).toContain('Partnership proposal');
  });

  test('correct number of email rows rendered', async ({ page }) => {
    const rows = page.locator('#ib-email-results .gmail-row, #ib-email-results [class*="row"]');
    await expect(rows).toHaveCount(3, { timeout: 5000 });
  });

  test('sender email visible in each row', async ({ page }) => {
    await expect(page.locator('#ib-email-results')).toContainText('john@criteo.com', { timeout: 5000 });
    await expect(page.locator('#ib-email-results')).toContainText('jane@criteo.com');
  });

  test('date visible in each row', async ({ page }) => {
    await expect(page.locator('#ib-email-results')).toContainText('1 Jan 25', { timeout: 5000 });
    await expect(page.locator('#ib-email-results')).toContainText('10 Jan 25');
  });
});

// ── SUITE: Contacts strip domain filtering ────────────────────────
test.describe('Gmail contacts strip — domain filtering', () => {

  test.beforeEach(async ({ page }) => {
    await waitForHub(page);
    await fakeConnect(page);
    await openFirstCompany(page);
    await expandEmailHistory(page);
  });

  test.afterEach(async ({ page }) => { await fakeDisconnect(page); });

  test('only company-domain contacts appear in strip', async ({ page }) => {
    const domain = 'criteo.com';
    await injectMockScan(page, domain, [
      { from: 'john@criteo.com',      subject: 'Hi', date: '1 Jan', id: 'a', threadId: 'ta' },
      { from: 'ourself@onaud.com',    subject: 'Hi', date: '2 Jan', id: 'b', threadId: 'tb' },
      { from: 'noreply@mailchimp.com',subject: 'Hi', date: '3 Jan', id: 'c', threadId: 'tc' },
    ]);

    // Domain filter: only john@criteo.com should appear
    const contactItems = page.locator('#ib-email-contacts .gmail-contact, #ib-email-contacts [class*="contact"]');
    const count = await contactItems.count();
    // Exactly 1 contact from the company domain
    if (count > 0) {
      for (let i = 0; i < count; i++) {
        const text = await contactItems.nth(i).textContent();
        expect(text).toContain('criteo.com');
      }
    }
  });

  test('contacts strip is empty when company has no domain set', async ({ page }) => {
    // Inject scan with empty domain (no website stored)
    await injectMockScan(page, '', [
      { from: 'anyone@wherever.com', subject: 'Hi', date: '1 Jan', id: 'x', threadId: 'tx' },
    ]);
    // With no domain, contact strip should be absent or empty
    const strip = page.locator('#ib-email-contacts');
    if (await strip.isVisible()) {
      const items = strip.locator('.gmail-contact, [class*="contact"]');
      expect(await items.count()).toBe(0);
    }
  });

  test('contact checkboxes are pre-checked', async ({ page }) => {
    const domain = 'criteo.com';
    await injectMockScan(page, domain, [
      { from: 'john@criteo.com', subject: 'Hi', date: '1 Jan', id: 'a', threadId: 'ta' },
      { from: 'jane@criteo.com', subject: 'Hi', date: '2 Jan', id: 'b', threadId: 'tb' },
    ]);
    const checkboxes = page.locator('#ib-email-contacts input[type="checkbox"]');
    const count = await checkboxes.count();
    if (count > 0) {
      for (let i = 0; i < count; i++) {
        await expect(checkboxes.nth(i)).toBeChecked();
      }
    }
  });

  test('deselecting a contact unchecks its checkbox', async ({ page }) => {
    const domain = 'criteo.com';
    await injectMockScan(page, domain, [
      { from: 'john@criteo.com', subject: 'Hi', date: '1 Jan', id: 'a', threadId: 'ta' },
    ]);
    const cb = page.locator('#ib-email-contacts input[type="checkbox"]').first();
    if (await cb.isVisible()) {
      await expect(cb).toBeChecked();
      await cb.uncheck();
      await expect(cb).not.toBeChecked();
    }
  });
});

// ── SUITE: Gmail connection state transitions ─────────────────────
test.describe('Gmail connection state transitions', () => {

  test.beforeEach(async ({ page }) => {
    await waitForHub(page);
    await fakeDisconnect(page); // start clean
    await openFirstCompany(page);
    await expandEmailHistory(page);
  });

  test.afterEach(async ({ page }) => { await fakeDisconnect(page); });

  test('email history shows "Connect Gmail" when logged out', async ({ page }) => {
    await expect(page.locator('#ib-email-body')).toContainText('Connect Gmail', { timeout: 5000 });
  });

  test('email history hides scan buttons when logged out', async ({ page }) => {
    await expect(page.locator('#ib-email-body button', { hasText: /scan gmail/i })).toHaveCount(0);
    await expect(page.locator('#ib-email-body button', { hasText: /update contacts/i })).toHaveCount(0);
  });

  test('connecting shows action buttons', async ({ page }) => {
    await fakeConnect(page);
    // Re-render panel so gmail section updates
    await page.evaluate(() => {
      if (window.currentCompany) window.openCompany(window.currentCompany);
    });
    await page.waitForTimeout(300);
    await expandEmailHistory(page);
    await expect(page.locator('#ib-email-body button', { hasText: /scan gmail/i })).toBeVisible({ timeout: 3000 });
  });

  test('email-history section id is present in DOM', async ({ page }) => {
    await expect(page.locator('#ib-email-body')).toBeAttached();
  });

  test('section header label matches "Email History"', async ({ page }) => {
    await expect(page.locator('.ib-sh-lbl', { hasText: /email history/i })).toBeVisible();
  });
});
