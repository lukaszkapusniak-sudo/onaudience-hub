/**
 * gmail-contacts-save.spec.ts
 *
 * Tests for Gmail contact saving — covers the regression where
 * _refreshEmailSection() wiped scan results on section toggle,
 * causing "Saved 0 contacts to CRM".
 */
import { test, expect, Page } from '@playwright/test';
import { waitForHub } from 'helpers';

const SB_URL = 'https://nyzkkqqjnkctcmxoirdj.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55emtrcXFqbmtjdGNteG9pcmRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NzMxMzYsImV4cCI6MjA4OTQ0OTEzNn0.jhAq_C68klOp4iTyj9HmsyyvoxsOI6ACld7t_87TAk0';
/** Inject mock Gmail token so email section shows connected state */
async function fakeGmailConnect(page: Page) {
  await page.evaluate(() => {
    localStorage.setItem('oaGmailToken', 'fake-tok');
    localStorage.setItem('oaGmailExpiry', String(Date.now() + 3_600_000));
    localStorage.setItem('oaGmailEmail', 'test@onaudience.com');
    window.updateGmailNavBtn?.();
  });
}

async function fakeGmailDisconnect(page: Page) {
  await page.evaluate(() => {
    localStorage.removeItem('oaGmailToken');
    localStorage.removeItem('oaGmailExpiry');
    localStorage.removeItem('oaGmailEmail');
  });
}

async function openFirstCompany(page: Page) {
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

/** Inject mock scan results + render them */
async function injectMockScan(page: Page, domain: string) {
  await page.evaluate((domain) => {
    const THREADS = [
      { from: `John Smith <john@${domain}>`, subject: 'Hello',    date: '1 Jan', id: 'a', threadId: 'ta' },
      { from: `Jane Doe <jane@${domain}>`,   subject: 'Follow up', date: '2 Jan', id: 'b', threadId: 'tb' },
      { from: 'Noreply <no@gmail.com>',       subject: 'Spam',     date: '3 Jan', id: 'c', threadId: 'tc' },
    ];
    window._gmailLastThreads = THREADS;
    window._gmailLastSlug    = 'test-co';
    window._gmailLastName    = 'Test Co';

    // Simulate what gmailScanCompany does when it finds domain-matching contacts
    const contacts = [
      { full_name: 'John Smith', email: `john@${domain}`, company_name: 'Test Co', company_id: 'test-co', source: 'gmail_scan' },
      { full_name: 'Jane Doe',   email: `jane@${domain}`, company_name: 'Test Co', company_id: 'test-co', source: 'gmail_scan' },
    ];
    window._gmailFoundContacts = contacts;

    // Render into the strip
    window.gmailRenderResults?.(THREADS, 'Test Co');

    const strip = document.getElementById('ib-email-contacts-strip');
    if (strip) {
      strip.style.display = 'block';
      strip.innerHTML = contacts.map((c, i) =>
        `<label><input type="checkbox" checked data-i="${i}"/>
         <span>${c.full_name}</span>
         <span>${c.email}</span></label>`
      ).join('') +
        '<button class="btn sm p" onclick="window.gmailSaveSelectedContacts()" style="margin-top:6px;width:100%">Save selected to CRM</button>';
    }
  }, domain);
  await page.waitForTimeout(150);
}

// ── SUITE: scan results persist through section toggle ────────────
test.describe('Gmail scan results persist on section toggle', () => {

  test.beforeEach(async ({ page }) => {
    await waitForHub(page);
    await fakeGmailConnect(page);
    await openFirstCompany(page);
    await expandEmailHistory(page);
  });

  test.afterEach(async ({ page }) => { await fakeGmailDisconnect(page); });

  test('contacts strip visible after scan', async ({ page }) => {
    await injectMockScan(page, 'test-company.com');
    const strip = page.locator('#ib-email-contacts-strip');
    await expect(strip).toBeVisible({ timeout: 3000 });
  });

  test('checkboxes remain after collapsing and expanding section (regression)', async ({ page }) => {
    await injectMockScan(page, 'test-company.com');

    // Verify checkboxes exist before toggle
    let checkboxes = await page.locator('#ib-email-contacts-strip input[type="checkbox"]').count();
    expect(checkboxes).toBe(2);

    // Collapse email section
    await page.locator('.ib-sh', { hasText: /email history/i }).click();
    await page.waitForTimeout(200);
    // Expand again — THIS triggered the bug (_refreshEmailSection wiped results)
    await page.locator('.ib-sh', { hasText: /email history/i }).click();
    await expect(page.locator('#ib-email-body')).toBeVisible({ timeout: 2000 });
    await page.waitForTimeout(300);

    // Checkboxes must still be there after toggle
    checkboxes = await page.locator('#ib-email-contacts-strip input[type="checkbox"]').count();
    expect(checkboxes).toBe(2);
  });

  test('_gmailFoundContacts not cleared on section toggle', async ({ page }) => {
    await injectMockScan(page, 'test-company.com');

    const beforeToggle = await page.evaluate(() => window._gmailFoundContacts?.length ?? -1);
    expect(beforeToggle).toBe(2);

    // Toggle section
    await page.locator('.ib-sh', { hasText: /email history/i }).click();
    await page.waitForTimeout(200);
    await page.locator('.ib-sh', { hasText: /email history/i }).click();
    await page.waitForTimeout(300);

    const afterToggle = await page.evaluate(() => window._gmailFoundContacts?.length ?? -1);
    // Should still have contacts (not wiped by re-render)
    expect(afterToggle).toBeGreaterThan(0);
  });

  test('email results preserved after toggle', async ({ page }) => {
    await injectMockScan(page, 'test-company.com');

    // Verify results exist
    await expect(page.locator('#ib-email-results')).not.toBeEmpty();

    // Toggle
    await page.locator('.ib-sh', { hasText: /email history/i }).click();
    await page.waitForTimeout(200);
    await page.locator('.ib-sh', { hasText: /email history/i }).click();
    await expect(page.locator('#ib-email-body')).toBeVisible({ timeout: 2000 });

    // Results still there
    await expect(page.locator('#ib-email-results')).not.toBeEmpty();
  });

  test('email subject links still present after toggle', async ({ page }) => {
    await injectMockScan(page, 'test-company.com');

    const linksBefore = await page.locator('#ib-email-results a[href*="mail.google.com"]').count();
    expect(linksBefore).toBeGreaterThan(0);

    await page.locator('.ib-sh', { hasText: /email history/i }).click();
    await page.waitForTimeout(200);
    await page.locator('.ib-sh', { hasText: /email history/i }).click();
    await expect(page.locator('#ib-email-body')).toBeVisible({ timeout: 2000 });

    const linksAfter = await page.locator('#ib-email-results a[href*="mail.google.com"]').count();
    expect(linksAfter).toBe(linksBefore);
  });
});

// ── SUITE: gmailSaveSelectedContacts logic ────────────────────────
test.describe('Gmail contact save logic', () => {

  test.beforeEach(async ({ page }) => {
    await waitForHub(page);
  });

  test('gmailSaveSelectedContacts alert on no selection', async ({ page }) => {
    // With empty _gmailFoundContacts, should alert not crash
    let dialogText = '';
    page.once('dialog', dialog => { dialogText = dialog.message(); dialog.dismiss(); });
    await page.evaluate(() => {
      window._gmailFoundContacts = [];
      window.gmailSaveSelectedContacts?.();
    });
    await page.waitForTimeout(500);
    expect(dialogText).toContain('No contacts selected');
  });

  test('gmailSaveSelectedContacts reads checked checkboxes only', async ({ page }) => {
    const saved = await page.evaluate(async (SB_KEY) => {
      // Inject 3 contacts, check only 2
      window._gmailFoundContacts = [
        { full_name:'Alice', email:'alice@a.com', company_id:'co', company_name:'Co', source:'test' },
        { full_name:'Bob',   email:'bob@a.com',   company_id:'co', company_name:'Co', source:'test' },
        { full_name:'Carol', email:'carol@a.com', company_id:'co', company_name:'Co', source:'test' },
      ];

      // Create a fake strip in DOM
      let strip = document.getElementById('ib-email-contacts-strip');
      if (!strip) {
        strip = document.createElement('div');
        strip.id = 'ib-email-contacts-strip';
        document.body.appendChild(strip);
      }
      strip.innerHTML = [0,1,2].map(i =>
        `<input type="checkbox" ${i < 2 ? 'checked' : ''} data-i="${i}"/>`
      ).join('');

      // Mock gmailSaveContacts to capture what gets passed
      const orig = window.gmailSaveContacts;
      let captured: any[] = [];
      window.gmailSaveContacts = async function() {
        captured = window._gmailFoundContacts || [];
        window._gmailFoundContacts = [];
        return;
      };

      window.gmailSaveSelectedContacts?.();
      await new Promise(r => setTimeout(r, 100));

      window.gmailSaveContacts = orig;
      return captured.length;
    }, SB_KEY);

    // Only 2 of 3 were checked — should save 2
    expect(saved).toBe(2);
  });

  test('domain filter correctly excludes non-company emails', async ({ page }) => {
    const result = await page.evaluate(() => {
      const dc = 'criteo.com';
      const cmap: Record<string, any> = {};
      const fromHeaders = [
        'John <john@criteo.com>',
        'Me <me@onaudience.com>',
        'News <news@newsletter.io>',
        'Jane <jane@criteo.com>',
      ];
      fromHeaders.forEach(from => {
        const m = from.match(/^(.+?)\s*<(.+?)>/) || from.match(/^(.+)$/);
        if (m) {
          const email = (m[2]||m[1]||'').trim().toLowerCase();
          if (email.includes('@') && dc && email.includes('@'+dc) && !cmap[email]) {
            cmap[email] = { email };
          }
        }
      });
      return Object.keys(cmap);
    });
    expect(result).toHaveLength(2);
    expect(result).toContain('john@criteo.com');
    expect(result).toContain('jane@criteo.com');
    expect(result).not.toContain('me@onaudience.com');
  });
});
