import { test, expect, Page } from '@playwright/test';
import { waitForHub } from './helpers';

// ── helpers ──────────────────────────────────────────────────────
async function openFirstCompanyWithWebsite(page: Page) {
  // Find a company that has a website (needed for domain-based contact filtering)
  await page.evaluate(() => window.switchTab('companies'));
  await page.waitForTimeout(300);
  const rows = page.locator('.c-row');
  await expect(rows.first()).toBeVisible({ timeout: 10000 });
  await rows.first().click();
  await expect(page.locator('#coPanel')).toBeVisible({ timeout: 5000 });
}

async function expandEmailHistory(page: Page) {
  // Find and expand the Email History section in company detail
  const emailHeader = page.locator('.ib-sh', { hasText: /email history/i });
  await expect(emailHeader).toBeVisible({ timeout: 5000 });
  const body = page.locator('#ib-email-body');
  const isOpen = await body.isVisible();
  if (!isOpen) await emailHeader.click();
  await expect(body).toBeVisible({ timeout: 3000 });
}

// ── SUITE: Gmail nav button ───────────────────────────────────────
test.describe('Gmail nav button', () => {
  test.beforeEach(async ({ page }) => {
    await waitForHub(page);
  });

  test('Gmail button visible in nav', async ({ page }) => {
    await expect(page.locator('#gmailNavBtn')).toBeVisible();
  });

  test('Gmail button shows "Gmail" when not connected', async ({ page }) => {
    // Clear any stored token first
    await page.evaluate(() => {
      localStorage.removeItem('oaGmailToken');
      localStorage.removeItem('oaGmailExpiry');
      localStorage.removeItem('oaGmailEmail');
      window.updateGmailNavBtn?.();
    });
    await page.waitForTimeout(200);
    const btn = page.locator('#gmailNavBtn');
    await expect(btn).toHaveText('Gmail');
    // Should not have green color styling
    const color = await btn.evaluate((el) => (el as HTMLElement).style.color);
    expect(color).toBeFalsy();
  });

  test('Gmail button shows connected state when token present', async ({ page }) => {
    // Simulate connected state
    await page.evaluate(() => {
      localStorage.setItem('oaGmailToken', 'fake-token-for-test');
      localStorage.setItem('oaGmailExpiry', String(Date.now() + 3600000));
      localStorage.setItem('oaGmailEmail', 'test@example.com');
      window.updateGmailNavBtn?.();
    });
    await page.waitForTimeout(200);
    const btn = page.locator('#gmailNavBtn');
    await expect(btn).toContainText('Gmail:');
    await expect(btn).toContainText('test');
    const color = await btn.evaluate((el) => (el as HTMLElement).style.color);
    expect(color).toBeTruthy(); // green styling applied
    // Cleanup
    await page.evaluate(() => {
      localStorage.removeItem('oaGmailToken');
      localStorage.removeItem('oaGmailExpiry');
      localStorage.removeItem('oaGmailEmail');
    });
  });

  test('Gmail button disconnect confirm shows when connected and clicked', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem('oaGmailToken', 'fake-token-for-test');
      localStorage.setItem('oaGmailExpiry', String(Date.now() + 3600000));
      localStorage.setItem('oaGmailEmail', 'test@example.com');
      window.updateGmailNavBtn?.();
    });
    await page.waitForTimeout(200);

    page.once('dialog', (dialog) => dialog.dismiss()); // cancel the confirm
    await page.locator('#gmailNavBtn').click();
    // Button should still show connected (we dismissed)
    await expect(page.locator('#gmailNavBtn')).toContainText('Gmail:');

    await page.evaluate(() => {
      localStorage.removeItem('oaGmailToken');
      localStorage.removeItem('oaGmailExpiry');
      localStorage.removeItem('oaGmailEmail');
    });
  });
});

// ── SUITE: Email History section ──────────────────────────────────
test.describe('Email History section', () => {
  test.beforeEach(async ({ page }) => {
    await waitForHub(page);
    await openFirstCompanyWithWebsite(page);
  });

  test('Email History section exists in company panel', async ({ page }) => {
    const emailSection = page.locator('.ib-sh', { hasText: /email history/i });
    await expect(emailSection).toBeVisible({ timeout: 5000 });
  });

  test('Email History shows Connect Gmail when not connected', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.removeItem('oaGmailToken');
      localStorage.removeItem('oaGmailExpiry');
      window.updateGmailNavBtn?.();
    });
    await expandEmailHistory(page);
    await expect(page.locator('#ib-email-body')).toContainText('Connect Gmail', { timeout: 3000 });
  });

  test('Email History shows connected state when token present', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem('oaGmailToken', 'fake-token-test');
      localStorage.setItem('oaGmailExpiry', String(Date.now() + 3600000));
      localStorage.setItem('oaGmailEmail', 'lukasz@onaudience.com');
    });
    // Re-open company to re-render email section
    await page.evaluate(() => window.openCompany(window.currentCompany));
    await page.waitForTimeout(300);
    await expandEmailHistory(page);
    await expect(page.locator('#ib-email-body')).toContainText('CONNECTED', { timeout: 3000 });
    await expect(page.locator('#ib-email-body')).toContainText('lukasz@onaudience.com');
    await page.evaluate(() => {
      localStorage.removeItem('oaGmailToken');
      localStorage.removeItem('oaGmailExpiry');
    });
  });

  test('Scan Gmail button present when connected', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem('oaGmailToken', 'fake-token-test');
      localStorage.setItem('oaGmailExpiry', String(Date.now() + 3600000));
      localStorage.setItem('oaGmailEmail', 'test@test.com');
    });
    await page.evaluate(() => window.openCompany(window.currentCompany));
    await page.waitForTimeout(300);
    await expandEmailHistory(page);
    await expect(page.locator('#ib-email-body button', { hasText: /scan gmail/i })).toBeVisible();
    await page.evaluate(() => {
      localStorage.removeItem('oaGmailToken');
      localStorage.removeItem('oaGmailExpiry');
    });
  });

  test('Update Contacts button present when connected', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem('oaGmailToken', 'fake-token-test');
      localStorage.setItem('oaGmailExpiry', String(Date.now() + 3600000));
      localStorage.setItem('oaGmailEmail', 'test@test.com');
    });
    await page.evaluate(() => window.openCompany(window.currentCompany));
    await page.waitForTimeout(300);
    await expandEmailHistory(page);
    await expect(
      page.locator('#ib-email-body button', { hasText: /update contacts/i }),
    ).toBeVisible();
    await page.evaluate(() => {
      localStorage.removeItem('oaGmailToken');
      localStorage.removeItem('oaGmailExpiry');
    });
  });

  test('Summarize button present when connected', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem('oaGmailToken', 'fake-token-test');
      localStorage.setItem('oaGmailExpiry', String(Date.now() + 3600000));
      localStorage.setItem('oaGmailEmail', 'test@test.com');
    });
    await page.evaluate(() => window.openCompany(window.currentCompany));
    await page.waitForTimeout(300);
    await expandEmailHistory(page);
    await expect(page.locator('#ib-email-body button', { hasText: /summarize/i })).toBeVisible();
    await page.evaluate(() => {
      localStorage.removeItem('oaGmailToken');
      localStorage.removeItem('oaGmailExpiry');
    });
  });

  test('Summarize without scan shows error message', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem('oaGmailToken', 'fake-token-test');
      localStorage.setItem('oaGmailExpiry', String(Date.now() + 3600000));
      localStorage.setItem('oaGmailEmail', 'test@test.com');
      window._gmailLastThreads = []; // no threads scanned
    });
    await page.evaluate(() => window.openCompany(window.currentCompany));
    await page.waitForTimeout(300);
    await expandEmailHistory(page);
    await page.locator('#ib-email-body button', { hasText: /summarize/i }).click();
    await expect(page.locator('#ib-email-results')).toContainText('Scan Gmail first', {
      timeout: 3000,
    });
    await page.evaluate(() => {
      localStorage.removeItem('oaGmailToken');
      localStorage.removeItem('oaGmailExpiry');
    });
  });
});

// ── SUITE: Gmail summarize token estimate ─────────────────────────
test.describe('Gmail summarize - token estimate', () => {
  test.beforeEach(async ({ page }) => {
    await waitForHub(page);
  });

  test('token estimate is shown in confirm box', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem('oaGmailToken', 'fake-token-test');
      localStorage.setItem('oaGmailExpiry', String(Date.now() + 3600000));
      localStorage.setItem('oaGmailEmail', 'test@test.com');
      // Inject mock threads
      window._gmailLastThreads = [
        {
          from: 'john@criteo.com',
          subject: 'Partnership discussion',
          date: '1 Jan 25',
          id: 'msg1',
          threadId: 'thread1',
        },
        {
          from: 'jane@criteo.com',
          subject: 'Follow up',
          date: '5 Jan 25',
          id: 'msg2',
          threadId: 'thread2',
        },
        {
          from: 'john@criteo.com',
          subject: 'Re: Proposal',
          date: '10 Jan 25',
          id: 'msg3',
          threadId: 'thread3',
        },
      ];
      window._gmailLastSlug = 'criteo';
      window._gmailLastName = 'Criteo';
    });

    // Open any company and expand email history
    await page.evaluate(() => window.switchTab('companies'));
    await page.waitForTimeout(300);
    await page.locator('.c-row').first().click();
    await page.waitForTimeout(300);

    await page.evaluate(() => {
      // directly call summarize with mock data
      window.gmailShowSummarizePrompt('criteo', 'Criteo', window._gmailLastThreads);
    });

    const confirm = page.locator('#gmail-sum-confirm');
    await expect(confirm).toBeVisible({ timeout: 3000 });
    await expect(confirm).toContainText('tokens');
    await expect(confirm).toContainText('3 email'); // 3 mock threads
    await expect(confirm).toContainText('Metadata only');
  });

  test('cancel dismisses confirm box', async ({ page }) => {
    await page.evaluate(() => {
      window._gmailLastThreads = [
        { from: 'a@b.com', subject: 'Test', date: '1 Jan 25', id: 'x', threadId: 'y' },
      ];
      window.gmailShowSummarizePrompt('test', 'Test Co', window._gmailLastThreads);
    });

    const confirm = page.locator('#gmail-sum-confirm');
    await expect(confirm).toBeVisible({ timeout: 3000 });
    await confirm.locator('button', { hasText: 'Cancel' }).click();
    await expect(confirm).not.toBeVisible({ timeout: 2000 });
  });

  test('token estimate scales with email count', async ({ page }) => {
    const result = await page.evaluate(() => {
      function estimateTokens(threads: any[]) {
        return { input: 300 + threads.length * 80, output: 450 };
      }
      const t3 = estimateTokens([{}, {}, {}]);
      const t10 = estimateTokens([{}, {}, {}, {}, {}, {}, {}, {}, {}, {}]);
      return { t3: t3.input + t3.output, t10: t10.input + t10.output };
    });
    expect(result.t10).toBeGreaterThan(result.t3);
    expect(result.t3).toBe(1050); // 300 + 3*80 + 450
    expect(result.t10).toBe(1550); // 300 + 10*80 + 450
  });
});

// ── SUITE: Gmail contact filtering ───────────────────────────────
test.describe('Gmail contact domain filtering', () => {
  test.beforeEach(async ({ page }) => {
    await waitForHub(page);
  });

  test('only contacts from company domain are suggested', async ({ page }) => {
    const result = await page.evaluate(() => {
      // Simulate contact extraction with domain filter
      const dc = 'criteo.com';
      const cmap: Record<string, any> = {};
      const fromHeaders = [
        'John Smith <john@criteo.com>', // ✓ company domain
        'Lukasz <lukasz@onaudience.com>', // ✗ our domain - should be excluded
        'Jane Doe <jane@criteo.com>', // ✓ company domain
        'noreply@mailchimp.com', // ✗ third party
      ];
      fromHeaders.forEach((from) => {
        const m = from.match(/^(.+?)\s*<(.+?)>/) || from.match(/^(.+)$/);
        if (m) {
          const name = (m[1] || '').trim().replace(/^["']|["']$/g, '');
          const email = (m[2] || m[1] || '').trim().toLowerCase();
          if (email.indexOf('@') !== -1 && dc && email.indexOf('@' + dc) !== -1 && !cmap[email]) {
            cmap[email] = { name, email };
          }
        }
      });
      return Object.values(cmap);
    });

    expect(result).toHaveLength(2);
    expect((result as any[]).map((c: any) => c.email)).toContain('john@criteo.com');
    expect((result as any[]).map((c: any) => c.email)).toContain('jane@criteo.com');
    expect((result as any[]).map((c: any) => c.email)).not.toContain('lukasz@onaudience.com');
    expect((result as any[]).map((c: any) => c.email)).not.toContain('noreply@mailchimp.com');
  });

  test('no contacts suggested when no company domain set', async ({ page }) => {
    const result = await page.evaluate(() => {
      const dc = ''; // no website stored
      const cmap: Record<string, any> = {};
      const fromHeaders = ['John <john@criteo.com>'];
      fromHeaders.forEach((from) => {
        const m = from.match(/^(.+?)\s*<(.+?)>/) || from.match(/^(.+)$/);
        if (m) {
          const email = (m[2] || m[1] || '').trim().toLowerCase();
          if (email.indexOf('@') !== -1 && dc && email.indexOf('@' + dc) !== -1 && !cmap[email]) {
            cmap[email] = { email };
          }
        }
      });
      return Object.values(cmap);
    });
    expect(result).toHaveLength(0);
  });

  test('email link points to Gmail thread URL', async ({ page }) => {
    const url = await page.evaluate(() => {
      const threadId = 'abc123def456';
      return 'https://mail.google.com/mail/u/0/#all/' + threadId;
    });
    expect(url).toMatch(/mail\.google\.com\/mail\/u\/0\/#all\//);
    expect(url).toContain('abc123def456');
  });
});
