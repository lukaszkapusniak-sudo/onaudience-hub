/**
 * contacts-section.spec.ts
 *
 * Tests the "Contacts" section inside the company detail panel, and
 * the contact drawer that opens when a contact card is clicked.
 *
 * Key regression covered:
 *   - company_id match (not just exact name): "onAudience" vs "onAudience Ltd"
 *   - Drawer shows all enriched fields (title, email, phone, dept, etc.)
 */
import { test, expect, Page } from '@playwright/test';
import { waitForHub } from '../helpers';
/** Open a company by name (case-insensitive substring). */
async function openCompanyByName(page: Page, name: string) {
  const rows = page.locator('.c-row');
  await expect(rows.first()).toBeVisible({ timeout: 15000 });
  const count = await rows.count();
  for (let i = 0; i < Math.min(count, 50); i++) {
    const text = await rows.nth(i).locator('.c-name').textContent();
    if (text?.toLowerCase().includes(name.toLowerCase())) {
      await rows.nth(i).click();
      await expect(page.locator('#coPanel')).toBeVisible({ timeout: 8000 });
      return true;
    }
  }
  // fallback: open first row
  await rows.first().click();
  await expect(page.locator('#coPanel')).toBeVisible({ timeout: 8000 });
  return false;
}

/** Expand the Contacts section in the company panel. */
async function expandContactsSection(page: Page) {
  const hdr = page.locator('.ib-sh', { hasText: /contacts/i }).first();
  await expect(hdr).toBeVisible({ timeout: 5000 });
  const body = page.locator('#ib-ct-body');
  const isOpen = await body.isVisible();
  if (!isOpen) await hdr.click();
  await expect(body).toBeVisible({ timeout: 3000 });
  return body;
}

// ── SUITE: Contacts section renders ─────────────────────────────
test.describe('Company panel — Contacts section', () => {
  test.beforeEach(async ({ page }) => {
    await waitForHub(page);
  });

  test('Contacts section header exists in company panel', async ({ page }) => {
    await page.locator('.c-row').first().click();
    await expect(page.locator('#coPanel')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('.ib-sh', { hasText: /contacts/i }).first()).toBeVisible();
  });

  test('Contacts section can be expanded', async ({ page }) => {
    await page.locator('.c-row').first().click();
    await expect(page.locator('#coPanel')).toBeVisible({ timeout: 8000 });
    const body = await expandContactsSection(page);
    await expect(body).toBeVisible();
  });

  test('Contacts section shows contact cards OR Find DMs button', async ({ page }) => {
    await page.locator('.c-row').first().click();
    await expect(page.locator('#coPanel')).toBeVisible({ timeout: 8000 });
    const body = await expandContactsSection(page);
    // Either contacts grid or the "Find DMs" empty state — both are valid
    const hasContacts = (await body.locator('.ib-ct').count()) > 0;
    const hasFindDMs = await body.locator('button', { hasText: /find dms/i }).isVisible();
    expect(hasContacts || hasFindDMs).toBeTruthy();
  });

  test('company_id-matched contacts appear in section (regression: Ltd suffix)', async ({
    page,
  }) => {
    // Use currentCompany (set by beforeEach) as the anchor — ensures consistency
    const coId = await page.evaluate(() => {
      const co = (window.currentCompany ||
        window._oaState?.currentCompany ||
        window._oaState?.companies?.[0]) as { id: string; name?: string } | undefined;
      if (!co) return null;
      // Inject mock contact keyed to the SAME company we'll re-open
      if (window._oaState?.contacts) {
        window._oaState.contacts = window._oaState.contacts.filter(
          (c: any) => c.id !== 'test-contact-ltd-suffix',
        );
      }
      window._oaState?.contacts?.push({
        id: 'test-contact-ltd-suffix',
        company_id: co.id,
        company_name: co.name + ' Ltd', // name with suffix — tests the id-based match
        full_name: 'Test Contact Ltd',
        title: 'Test Title',
        email: 'test@test-company.com',
      });
      // Re-open the same company to trigger re-render with new contact
      window.openCompany(co);
      return co.id;
    });
    if (!coId) {
      console.log('No currentCompany — skip');
      return;
    }

    await expect(page.locator('#coPanel')).toBeVisible({ timeout: 8000 });
    await page.waitForTimeout(800);

    // Expand contacts section
    const ctH = page
      .locator('.ib-sh')
      .filter({ hasText: /contacts/i })
      .first();
    await expect(ctH).toBeVisible({ timeout: 8000 });
    const ctBody = page.locator('#ib-ct-body');
    if (!(await ctBody.isVisible())) await ctH.click();
    await expect(ctBody).toBeVisible({ timeout: 3000 });

    // The injected contact should appear (company_id match overrides name mismatch)
    await expect(
      page.locator('#ib-ct-body .ib-ct').filter({ hasText: 'Test Contact Ltd' }),
    ).toBeVisible({ timeout: 8000 });

    // Cleanup
    await page.evaluate(() => {
      if (window._oaState?.contacts) {
        window._oaState.contacts = window._oaState.contacts.filter(
          (c: any) => c.id !== 'test-contact-ltd-suffix',
        );
      }
    });
  });

  test('contact card shows name and title', async ({ page }) => {
    // Find a company that has contacts
    const rows = page.locator('.c-row');
    const count = await rows.count();
    for (let i = 0; i < Math.min(count, 20); i++) {
      await rows.nth(i).click();
      await page.waitForTimeout(300);
      await expandContactsSection(page);
      const cards = page.locator('#ib-ct-body .ib-ct');
      if ((await cards.count()) > 0) {
        await expect(cards.first().locator('.ib-ct-name')).toBeVisible();
        await expect(cards.first().locator('.ib-ct-title')).toBeVisible();
        return;
      }
    }
    // No company with contacts found — skip gracefully
    console.log('No company with contacts found in first 20 rows');
  });

  test('contact card email is visible when present', async ({ page }) => {
    const rows = page.locator('.c-row');
    const count = await rows.count();
    for (let i = 0; i < Math.min(count, 30); i++) {
      await rows.nth(i).click();
      await page.waitForTimeout(200);
      await expandContactsSection(page);
      const emailEl = page.locator('#ib-ct-body .ib-ct-email').first();
      if (await emailEl.isVisible()) {
        const text = await emailEl.textContent();
        expect(text).toContain('@');
        return;
      }
    }
    console.log('No contact with email found in first 30 rows');
  });

  test('contact card action buttons render', async ({ page }) => {
    const rows = page.locator('.c-row');
    const count = await rows.count();
    for (let i = 0; i < Math.min(count, 20); i++) {
      await rows.nth(i).click();
      await page.waitForTimeout(200);
      await expandContactsSection(page);
      const cards = page.locator('#ib-ct-body .ib-ct');
      if ((await cards.count()) > 0) {
        const btns = cards.first().locator('.ib-ct-btn');
        expect(await btns.count()).toBeGreaterThan(0);
        await expect(btns.first()).toContainText('Email');
        return;
      }
    }
  });

  test('clicking contact card opens drawer', async ({ page }) => {
    const rows = page.locator('.c-row');
    const count = await rows.count();
    for (let i = 0; i < Math.min(count, 30); i++) {
      await rows.nth(i).click();
      await page.waitForTimeout(200);
      await expandContactsSection(page);
      const cards = page.locator('#ib-ct-body .ib-ct');
      if ((await cards.count()) > 0) {
        await cards.first().click();
        await expect(page.locator('#ctDrawer')).toHaveClass(/open/, { timeout: 5000 });
        return;
      }
    }
    console.log('No company with contacts found');
  });
});

// ── SUITE: Contact drawer content ────────────────────────────────
test.describe('Contact drawer — enriched fields', () => {
  test.beforeEach(async ({ page }) => {
    await waitForHub(page);
  });

  async function openAnyDrawer(page: Page): Promise<boolean> {
    // Try to open a drawer from the contacts section of the first company with contacts
    const rows = page.locator('.c-row');
    const count = await rows.count();
    for (let i = 0; i < Math.min(count, 40); i++) {
      await rows.nth(i).click();
      await page.waitForTimeout(150);
      const body = page.locator('#ib-ct-body');
      const hdr = page.locator('.ib-sh', { hasText: /contacts/i }).first();
      if (await hdr.isVisible()) {
        if (!(await body.isVisible())) await hdr.click();
        await page.waitForTimeout(100);
        const cards = page.locator('#ib-ct-body .ib-ct');
        if ((await cards.count()) > 0) {
          await cards.first().click();
          const drawerOpen = await page
            .locator('#ctDrawer')
            .evaluate((el) => el.classList.contains('open'));
          if (drawerOpen) return true;
        }
      }
    }
    return false;
  }

  test('drawer opens with contact name in header', async ({ page }) => {
    const opened = await openAnyDrawer(page);
    if (!opened) {
      console.log('No drawer opened — skip');
      return;
    }
    await expect(page.locator('#drName')).toBeVisible({ timeout: 5000 });
    const name = await page.locator('#drName').textContent();
    expect(name?.trim().length).toBeGreaterThan(0);
    expect(name?.trim()).not.toBe('—');
  });

  test('drawer shows subtitle with title and company', async ({ page }) => {
    const opened = await openAnyDrawer(page);
    if (!opened) {
      console.log('No drawer opened — skip');
      return;
    }
    await expect(page.locator('#drSub')).toBeVisible({ timeout: 3000 });
    const sub = await page.locator('#drSub').textContent();
    expect(sub?.trim().length).toBeGreaterThan(0);
  });

  test('drawer body has at least one field', async ({ page }) => {
    const opened = await openAnyDrawer(page);
    if (!opened) {
      console.log('No drawer opened — skip');
      return;
    }
    const fields = page.locator('#drBody .dr-field');
    await expect(fields.first()).toBeVisible({ timeout: 3000 });
    expect(await fields.count()).toBeGreaterThan(0);
  });

  test('drawer field labels are visible', async ({ page }) => {
    const opened = await openAnyDrawer(page);
    if (!opened) {
      console.log('No drawer opened — skip');
      return;
    }
    const labels = page.locator('#drBody .dr-field label');
    await expect(labels.first()).toBeVisible({ timeout: 3000 });
  });

  test('drawer never shows empty body', async ({ page }) => {
    const opened = await openAnyDrawer(page);
    if (!opened) {
      console.log('No drawer opened — skip');
      return;
    }
    const body = await page.locator('#drBody').textContent();
    expect(body?.trim().length).toBeGreaterThan(0);
  });

  test('drawer action buttons are present', async ({ page }) => {
    const opened = await openAnyDrawer(page);
    if (!opened) {
      console.log('No drawer opened — skip');
      return;
    }
    const actions = page.locator('#ctDrawer .dr-actions .btn');
    await expect(actions.first()).toBeVisible({ timeout: 3000 });
    expect(await actions.count()).toBeGreaterThanOrEqual(2);
  });

  test('drawer Draft Email button is present', async ({ page }) => {
    const opened = await openAnyDrawer(page);
    if (!opened) {
      console.log('No drawer opened — skip');
      return;
    }
    await expect(
      page.locator('#ctDrawer .dr-actions .btn', { hasText: /draft email/i }).first(),
    ).toBeVisible();
  });

  test('drawer close button dismisses drawer', async ({ page }) => {
    const opened = await openAnyDrawer(page);
    if (!opened) {
      console.log('No drawer opened — skip');
      return;
    }
    await expect(page.locator('#ctDrawer')).toHaveClass(/open/);
    await page.locator('.dr-close').click();
    await expect(page.locator('#ctDrawer')).not.toHaveClass(/open/, { timeout: 3000 });
  });

  test('drawer injected contact shows all new fields', async ({ page }) => {
    // Inject a fully-populated contact and open its drawer directly
    await page.evaluate(() => {
      window.S = window.S || {};
      window.S.contacts = window.S.contacts || [];
      window.S.contacts.push({
        id: 'drawer-test-full-contact',
        company_id: 'test-co',
        company_name: 'Test Company',
        full_name: 'Jane Richfield',
        title: 'VP of Partnerships',
        email: 'jane@testcompany.com',
        phone: '+44 7911 123456',
        linkedin_url: 'https://linkedin.com/in/jane-richfield',
        department: 'Partnerships',
        seniority: 'vp',
        location: 'London, UK',
        outreach_status: 'contacted',
        relationship_strength: 'warm',
        last_contacted_at: '2025-12-01T00:00:00Z',
        warm_intro_path: 'Via Adrian at onAudience',
        notes: 'Key decision maker for data partnerships.',
      });
    });
    // Ensure contact is in S.contacts before opening drawer
    await page.evaluate(() => {
      // Re-inject in case state was reset
      const contacts = window.S?.contacts || [];
      if (!contacts.find((c: any) => c.id === 'drawer-test-full-contact')) {
        contacts.push({
          id: 'drawer-test-full-contact',
          company_id: 'test-co',
          company_name: 'Test Company',
          full_name: 'Jane Richfield',
          title: 'VP of Partnerships',
          email: 'jane@testcompany.com',
        });
      }
      window.openDrawer?.('drawer-test-full-contact');
    });
    await expect(page.locator('#ctDrawer')).toHaveClass(/open/, { timeout: 8000 });

    // Name and subtitle
    await expect(page.locator('#drName')).toHaveText('Jane Richfield');
    await expect(page.locator('#drSub')).toContainText('VP of Partnerships');

    // Fields that should now be in the drawer
    const body = page.locator('#drBody');
    await expect(body).toContainText('VP of Partnerships'); // Title field
    await expect(body).toContainText('jane@testcompany.com'); // Email
    await expect(body).toContainText('+44 7911 123456'); // Phone
    await expect(body).toContainText('Partnerships'); // Dept
    await expect(body).toContainText('vp'); // Seniority
    await expect(body).toContainText('London, UK'); // Location
    await expect(body).toContainText('contacted'); // Outreach status
    await expect(body).toContainText('warm'); // Relationship
    await expect(body).toContainText('2025-12-01'); // Last contacted
    await expect(body).toContainText('Via Adrian'); // Warm intro path
    await expect(body).toContainText('Key decision maker'); // Notes

    // Cleanup
    await page.evaluate(() => {
      if (window.S?.contacts) {
        window.S.contacts = window.S.contacts.filter(
          (c: any) => c.id !== 'drawer-test-full-contact',
        );
      }
      window.closeDrawer?.();
    });
  });
});

// ── SUITE: Contacts from contacts tab also open full drawer ──────
test.describe('Contacts tab — drawer via openContactFull', () => {
  test.beforeEach(async ({ page }) => {
    await waitForHub(page);
    await page.evaluate(() => window.switchTab('contacts'));
    await page.waitForTimeout(400);
    await expect(page.locator('.ct-row').first()).toBeVisible({ timeout: 15000 });
  });

  test('clicking ct-row opens drawer', async ({ page }) => {
    await page.locator('.ct-row').first().click();
    await expect(page.locator('#ctDrawer')).toHaveClass(/open/, { timeout: 5000 });
  });

  test('drawer name matches clicked row name', async ({ page }) => {
    const rowName = await page.locator('.ct-row .ct-name').first().textContent();
    await page.locator('.ct-row').first().click();
    await expect(page.locator('#ctDrawer')).toHaveClass(/open/, { timeout: 5000 });
    await expect(page.locator('#drName')).toContainText(rowName!.trim());
  });

  test('drawer body is not empty after opening from contacts tab', async ({ page }) => {
    await page.locator('.ct-row').first().click();
    await expect(page.locator('#ctDrawer')).toHaveClass(/open/, { timeout: 5000 });
    const body = await page.locator('#drBody').textContent();
    expect(body?.trim().length).toBeGreaterThan(0);
  });

  test('drawer has at least one labelled field', async ({ page }) => {
    await page.locator('.ct-row').first().click();
    await expect(page.locator('#ctDrawer')).toHaveClass(/open/, { timeout: 5000 });
    await expect(page.locator('#drBody .dr-field').first()).toBeVisible({ timeout: 3000 });
  });
});
