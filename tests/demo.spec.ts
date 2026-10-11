import { test, expect } from '@playwright/test';

test('parcours mobile : REST, IndexedDB, outbox, synchronisation et Worker', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('.connection')).toHaveText('En ligne');
  await expect(page.locator('.intervention-card')).toHaveCount(5);
  await page.screenshot({ path: 'test-results/mobile-list.png', fullPage: true });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBeTruthy();
  const onlinePut = page.waitForResponse(
    (r) => r.url().endsWith('/api/interventions/45821') && r.request().method() === 'PUT',
  );
  await page.locator('.intervention-card').filter({ hasText: '#45821' }).click();
  await expect(page.locator('#equipment')).toBeVisible();
  await page.locator('#equipment').fill('EQP-ONLINE-2026');
  await page.locator('#status').selectOption('DONE');
  await page.locator('#comment').fill('Contrôle en ligne terminé.');
  await page.getByRole('button', { name: 'Valider l’intervention' }).click();
  expect((await onlinePut).status()).toBe(200);
  await expect(
    page.getByRole('status').filter({ hasText: 'Intervention enregistrée sur le serveur' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Mode démo hors ligne' }).click();
  await expect(page.locator('.connection')).toHaveText('Hors connexion');
  await page.locator('.intervention-card').filter({ hasText: '#45835' }).click();
  await page.locator('#equipment').fill('EQP-OFFLINE-2026');
  await page.locator('#comment').fill('Saisie réalisée sur le terrain sans API.');
  await page.getByRole('button', { name: 'Valider l’intervention' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Enregistré localement' })).toBeVisible();
  await expect(page.locator('.intervention-card').filter({ hasText: '#45835' })).toContainText(
    'Synchronisation en attente',
  );
  const outbox = () =>
    page.evaluate(async () => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const r = indexedDB.open('mobioff-demo', 1);
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      });
      const changes = await new Promise<unknown[]>((resolve, reject) => {
        const r = db.transaction('pendingChanges').objectStore('pendingChanges').getAll();
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      });
      db.close();
      return changes;
    });
  expect(await outbox()).toHaveLength(1);
  // Hold the API across reload: demo mode itself deliberately is not persisted.
  await page.route('**/api/**', (route) => route.abort('connectionfailed'));
  await page.reload();
  await expect(page.locator('.intervention-card')).toHaveCount(5);
  await expect(page.locator('.connection')).toHaveText('Hors connexion');
  await page.locator('.intervention-card').filter({ hasText: '#45835' }).click();
  await expect(page.locator('#equipment')).toHaveValue('EQP-OFFLINE-2026');
  // A second local save coalesces into one entry with the original server version.
  await page.locator('#equipment').fill('EQP-OFFLINE-FINAL');
  await page.getByRole('button', { name: 'Valider l’intervention' }).click();
  await expect(page.locator('.intervention-card')).toHaveCount(5);
  expect(await outbox()).toHaveLength(1);
  await page.unroute('**/api/**');
  await page.getByRole('button', { name: 'Synchroniser maintenant', exact: true }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Synchronisation terminée' }),
  ).toBeVisible();
  await expect(page.locator('.intervention-card').filter({ hasText: '#45835' })).toContainText(
    'Synchronisé',
  );
  expect(await outbox()).toHaveLength(0);
  const server = await (await page.request.get('/api/interventions/45835')).json();
  expect(server.newEquipment).toBe('EQP-OFFLINE-FINAL');
  expect(server.version).toBe(4);
  const workerStarted = page.waitForEvent('worker');
  await page.getByRole('button', { name: 'Analyser les interventions' }).click();
  expect((await workerStarted).url()).toContain('worker-');
  await expect(page.locator('.analysis-result')).toContainText(/1\s000\s000 lignes simulées/);
  await expect(page.locator('.analysis-result')).toContainText('Temps de calcul');
  await page.screenshot({ path: 'test-results/mobile-analysis.png', fullPage: true });
  expect(errors).toEqual([]);
});

test('un conflit conserve la file locale et propose la version serveur', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.connection')).toHaveText('En ligne');
  await page.getByRole('button', { name: 'Mode démo hors ligne' }).click();
  await page.locator('.intervention-card').filter({ hasText: '#45842' }).click();
  await page.locator('#equipment').fill('LOCAL-CONFLICT');
  await page.getByRole('button', { name: 'Valider l’intervention' }).click();
  await expect(page.locator('.intervention-card')).toHaveCount(5);
  const remote = await (await page.request.get('/api/interventions/45842')).json();
  const update = await page.request.put('/api/interventions/45842', {
    data: {
      newEquipment: 'SERVER-CONCURRENT',
      comment: 'Autre technicien',
      status: 'DONE',
      version: remote.version,
    },
  });
  expect(update.status()).toBe(200);
  await page.getByRole('button', { name: 'Revenir en ligne' }).click();
  await expect(page.getByRole('alert')).toContainText(
    'Cette intervention a été modifiée depuis votre dernière consultation.',
  );
  await expect(page.locator('.intervention-card').filter({ hasText: '#45842' })).toContainText(
    'Conflit à résoudre',
  );
  await page.locator('.intervention-card').filter({ hasText: '#45842' }).click();
  await expect(page.locator('#equipment')).toHaveValue('LOCAL-CONFLICT');
  await expect(page.getByRole('button', { name: 'Valider l’intervention' })).toBeDisabled();
  await page
    .getByRole('button', { name: 'Charger la version serveur (abandonner la saisie locale)' })
    .click();
  await expect(page.locator('#equipment')).toHaveValue('SERVER-CONCURRENT');
  await expect(page.getByRole('button', { name: 'Valider l’intervention' })).toBeEnabled();
});

test('une panne API détectée par HTTP est synchronisée automatiquement au retour', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.locator('.connection')).toHaveText('En ligne');
  const current = await (await page.request.get('/api/interventions/45856')).json();
  await page.route('**/api/**', (route) =>
    route.fulfill({ status: 503, body: 'Service indisponible' }),
  );
  await page.locator('.intervention-card').filter({ hasText: '#45856' }).click();
  await expect(page.locator('.connection')).toHaveText('Hors connexion');
  await page.locator('#equipment').fill('EQP-AUTO-SYNC');
  await page.getByRole('button', { name: 'Valider l’intervention' }).click();
  await expect(page.locator('.intervention-card').filter({ hasText: '#45856' })).toContainText(
    'Synchronisation en attente',
  );
  await page.unroute('**/api/**');
  await expect(page.locator('.intervention-card').filter({ hasText: '#45856' })).toContainText(
    'Synchronisé',
    { timeout: 15000 },
  );
  await expect(page.locator('.connection')).toHaveText('En ligne');
  const updated = await (await page.request.get('/api/interventions/45856')).json();
  expect(updated.newEquipment).toBe('EQP-AUTO-SYNC');
  expect(updated.version).toBe(current.version + 1);
});
