import { defineConfig } from '@playwright/test'

const external = process.env.E2E_BASE_URL

export default defineConfig({
  testDir: './e2e',
  testMatch: /.*\.spec\.ts/,
  workers: 1, // tests share one local database
  fullyParallel: false,
  retries: 0,
  timeout: 120_000,
  expect: { timeout: 10_000 },
  reporter: [['line']],
  outputDir: 'test-results',
  use: {
    baseURL: external ?? 'http://localhost:5173',
    viewport: { width: 420, height: 860 },
    trace: 'on-first-retry',
    actionTimeout: 10_000,
  },
  webServer: external
    ? undefined
    : { command: 'pnpm dev --port 5173', url: 'http://localhost:5173', reuseExistingServer: true, timeout: 60_000 },
})
