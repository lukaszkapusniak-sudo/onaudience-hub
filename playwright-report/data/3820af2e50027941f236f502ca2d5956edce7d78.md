# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: smoke/boot.spec.ts >> hub loads without blank screen
- Location: tests/smoke/boot.spec.ts:3:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('nav')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('nav')

```

# Page snapshot

```yaml
- generic [ref=e2]:
  - heading "404" [level=1] [ref=e3]
  - paragraph [ref=e4]:
    - strong [ref=e5]: There isn't a GitHub Pages site here.
  - paragraph [ref=e6]:
    - text: If you're trying to publish one,
    - link "read the full documentation" [ref=e7] [cursor=pointer]:
      - /url: https://help.github.com/pages/
    - text: to learn how to set up
    - strong [ref=e8]: GitHub Pages
    - text: for your repository, organization, or user account.
  - generic [ref=e9]:
    - link "GitHub Status" [ref=e10] [cursor=pointer]:
      - /url: https://githubstatus.com
    - text: —
    - link "@githubstatus" [ref=e11] [cursor=pointer]:
      - /url: https://twitter.com/githubstatus
  - link [ref=e12] [cursor=pointer]:
    - /url: /
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test('hub loads without blank screen', async ({ page }) => {
  4  |   await page.goto('/');
> 5  |   await expect(page.locator('nav')).toBeVisible();
     |                                     ^ Error: expect(locator).toBeVisible() failed
  6  |   await expect(page.locator('text=Sales Intelligence Hub')).toBeVisible();
  7  | });
  8  | 
  9  | test('stats bar renders', async ({ page }) => {
  10 |   await page.goto('/');
  11 |   await expect(page.locator('text=ALL')).toBeVisible();
  12 |   await expect(page.locator('text=CLIENTS')).toBeVisible();
  13 | });
  14 | 
  15 | test('no fatal JS errors on load', async ({ page }) => {
  16 |   const errors: string[] = [];
  17 |   page.on('pageerror', e => errors.push(e.message));
  18 |   await page.goto('/');
  19 |   await page.waitForTimeout(3000);
  20 |   expect(errors.filter(e => !e.includes('403'))).toHaveLength(0);
  21 | });
  22 | 
```