const { test, expect } = require('@playwright/test');
async function nav(page, name) {
  const menu = page.getByRole('button', { name: 'Toggle navigation' });
  if (await menu.isVisible()) await menu.click();
  await page.getByRole('button', { name }).click();
}
async function openJob(page, title = 'Senior Product Designer') {
  await page.getByRole('button', { name: `View ${title}`, exact: false }).click();
}
async function fillPerson(page) {
  await page.getByLabel('First name', { exact: true }).fill('Alex');
  await page.getByLabel('Last name', { exact: true }).fill('Morgan');
  await page.getByLabel('Email address', { exact: true }).fill('alex@example.com');
}
test.beforeEach(async ({ page }) => {
  await page.goto('/');
});
test('search combines title and location, and clear restores results', async ({ page }) => {
  await page.locator('#searchInput').fill('Designer');
  await page.locator('#locationInput').fill('Europe');
  await page.getByRole('button', { name: 'Find my next job' }).click();
  await expect(page.locator('.job-card')).toHaveCount(1);
  await expect(page.locator('#resultCount')).toContainText('1 opportunity');
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await expect(page.locator('.job-card')).toHaveCount(6);
});
test('saved jobs remain a filtered view after selection, unsaving, and reload', async ({
  page,
}) => {
  await page
    .locator('#jobList')
    .getByRole('button', { name: 'Save Senior Product Designer', exact: true })
    .click();
  await page
    .locator('#jobList')
    .getByRole('button', { name: 'Save Brand Designer', exact: true })
    .click();
  await nav(page, /Saved jobs/);
  await expect(page.locator('.job-card')).toHaveCount(2);
  await openJob(page, 'Brand Designer');
  await expect(page.locator('#jobDetail')).toContainText('Brand Designer');
  await page
    .locator('#jobDetail')
    .getByRole('button', { name: 'Unsave Brand Designer', exact: true })
    .click();
  await expect(page.locator('.job-card')).toHaveCount(1);
  await page.reload();
  await expect(page.locator('#savedCount')).toHaveText('1');
});
test('empty search recovers and remote filter composes with discipline', async ({ page }) => {
  await page.locator('#searchInput').fill('nonexistent role');
  await page.getByRole('button', { name: 'Find my next job' }).click();
  await expect(page.locator('.empty')).toBeVisible();
  await page.locator('#emptyReset').click();
  await page.getByRole('button', { name: 'Engineering', exact: true }).last().click();
  await page.getByRole('button', { name: 'Remote only' }).click();
  await expect(page.locator('.job-card')).toHaveCount(1);
  await expect(page.locator('.job-card')).toContainText('Product Engineer');
});
test('profile persists, modal traps focus and Escape returns focus', async ({ page }) => {
  await page.locator('#profileBtn').click();
  await fillPerson(page);
  await page.getByRole('button', { name: 'Save profile', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(page.locator('#profileBtn')).toBeFocused();
  await page.reload();
  await page.locator('#profileBtn').click();
  await expect(page.getByLabel('First name', { exact: true })).toHaveValue('Alex');
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => !!document.activeElement.closest('dialog'))).toBe(true);
  }
});
test('application retains back navigation data and validates résumé before saving an honest draft', async ({
  page,
}) => {
  await openJob(page);
  await page.getByRole('button', { name: 'Prepare application' }).click();
  await fillPerson(page);
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByLabel('Why this role?').fill('I love thoughtful products.');
  await page.getByRole('button', { name: 'Save draft' }).click();
  await expect(page.locator('#fileError')).toContainText('choose a résumé');
  await page.locator('#resume').setInputFiles({
    name: 'resume.exe',
    mimeType: 'application/octet-stream',
    buffer: Buffer.from('invalid'),
  });
  await expect(page.locator('#fileError')).toContainText('PDF, DOC, or DOCX');
  await page.locator('#resume').setInputFiles({
    name: 'resume.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4 sample'),
  });
  await page.getByRole('button', { name: '← Back', exact: true }).click();
  await expect(page.getByLabel('First name', { exact: true })).toHaveValue('Alex');
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByLabel('Why this role?')).toHaveValue('I love thoughtful products.');
  await page.getByRole('button', { name: 'Save draft' }).click();
  await expect(page.getByRole('dialog')).toContainText('No application has been sent');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download draft' }).click();
  expect((await download).suggestedFilename()).toBe('ezjobs-draft-1.txt');
  await page.getByRole('button', { name: 'Back to jobs', exact: true }).click();
  await page.reload();
  await openJob(page);
  await expect(page.getByRole('button', { name: 'Edit application draft' })).toBeVisible();
});
test('corrupt storage cannot crash the app', async ({ page }) => {
  await page.evaluate(() => {
    localStorage.setItem('ezjobs-saved', '{bad json');
    localStorage.setItem('ezjobs-profile', '42');
    localStorage.setItem('ezjobs-drafts', '[null]');
  });
  await page.reload();
  await expect(page.locator('.job-card')).toHaveCount(6);
  await page.locator('#profileBtn').click();
  await expect(page.getByLabel('First name', { exact: true })).toHaveValue('');
});
test('no horizontal overflow or runtime errors, and mobile details are reachable', async ({
  page,
}, testInfo) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.reload();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `test-results/${testInfo.project.name}-home.png`, fullPage: true });
  await openJob(page);
  await expect(page.getByRole('button', { name: 'Prepare application' })).toBeVisible();
  if (testInfo.project.name === 'mobile') {
    await page.getByRole('button', { name: 'Back to results' }).click();
    await expect(page.locator('#jobList')).toBeVisible();
  }
  expect(errors).toEqual([]);
});

test('blocked storage degrades gracefully and does not claim profile persistence', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new DOMException('Blocked', 'SecurityError');
      },
    });
  });
  await page.reload();
  await expect(page.locator('.job-card')).toHaveCount(6);
  await page.locator('#profileBtn').click();
  await fillPerson(page);
  await page.getByRole('button', { name: 'Save profile', exact: true }).click();
  await expect(page.locator('#toast')).toContainText('storage is unavailable');
});

test('privacy clearing requires confirmation and removes only EZJobs data', async ({ page }) => {
  await page
    .locator('#jobList')
    .getByRole('button', { name: 'Save Senior Product Designer', exact: true })
    .click();
  await page.evaluate(() => localStorage.setItem('unrelated-key', 'keep'));
  await page.getByRole('button', { name: 'Your data & privacy' }).click();
  await page.getByRole('button', { name: 'Clear my saved data' }).click();
  expect(await page.evaluate(() => localStorage.getItem('ezjobs-saved'))).toBe('[1]');
  await page.getByRole('button', { name: 'Confirm: delete all local data' }).click();
  expect(await page.evaluate(() => localStorage.getItem('ezjobs-saved'))).toBeNull();
  expect(await page.evaluate(() => localStorage.getItem('unrelated-key'))).toBe('keep');
  await expect(page.locator('#savedCount')).toHaveText('0');
});

test('layout fits narrow phones, tablets, and desktop widths', async ({ page }) => {
  for (const width of [320, 768, 1024]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
});
