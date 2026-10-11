import { chromium, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const repository = fileURLToPath(new URL('..', import.meta.url));
const compose = (...args) =>
  execFileSync('docker', ['compose', ...args], { cwd: repository, stdio: 'pipe' });
const browser = await chromium.launch(
  process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {},
);
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const base = process.env.BASE_URL ?? 'http://localhost:4300';
try {
  await page.goto(base);
  await expect(page.locator('.connection')).toHaveText('En ligne');
  await page.locator('.intervention-card').filter({ hasText: '#45863' }).click();
  await expect(page.locator('#equipment')).toBeVisible();
  await page.locator('#equipment').fill('EQP-REAL-OUTAGE');
  await page.screenshot({ path: 'test-results/mobile-detail.png', fullPage: true });
  compose('stop', 'backend');
  await page.getByRole('button', { name: 'Valider l’intervention' }).click();
  await expect(page.locator('.connection')).toHaveText('Hors connexion');
  await expect(page.locator('.intervention-card').filter({ hasText: '#45863' })).toContainText(
    'Synchronisation en attente',
  );
  compose('start', 'backend');
  await expect
    .poll(
      async () => {
        try {
          return (await page.request.get(`${base}/api/interventions`)).status();
        } catch {
          return 0;
        }
      },
      { timeout: 30000 },
    )
    .toBe(200);
  await expect(
    page.getByRole('button', { name: 'Synchroniser maintenant', exact: true }),
  ).toBeEnabled();
  await page.getByRole('button', { name: 'Synchroniser maintenant', exact: true }).click();
  await expect(page.locator('.intervention-card').filter({ hasText: '#45863' })).toContainText(
    'Synchronisé',
  );
  const updated = await (await page.request.get(`${base}/api/interventions/45863`)).json();
  expect(updated.newEquipment).toBe('EQP-REAL-OUTAGE');
  console.log(
    'Arrêt et retour réels du backend : cache, sauvegarde locale et synchronisation validés.',
  );
} finally {
  compose('start', 'backend');
  await browser.close();
}
