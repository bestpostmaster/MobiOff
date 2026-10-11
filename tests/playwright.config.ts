import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: '.',
  testMatch: '*.spec.ts',
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  expect: { timeout: 10000 },
  use: {
    baseURL: process.env['BASE_URL'] ?? 'http://localhost:4300',
    viewport: { width: 390, height: 844 },
    launchOptions: process.env['CHROME_PATH'] ? { executablePath: process.env['CHROME_PATH'] } : {},
    trace: 'retain-on-failure',
  },
});
