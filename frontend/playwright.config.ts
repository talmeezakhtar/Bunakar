import { defineConfig, devices } from '@playwright/test'

/**
 * End-to-end tests against the production build (`vite preview`). The site is built pointing at
 * a fake API host, `http://api.test`, and each test answers those requests itself (e2e/api.ts),
 * so no backend or database is needed.
 *
 * Projects: three viewports for layout and accessibility, plus a WebGL-off run (the 2D fallbacks)
 * and a reduced-motion run. Locally it uses the installed Chrome; CI installs Chromium.
 */
const chrome = process.env.CI ? {} : { channel: 'chrome' as const }
// WebGL in headless Chrome comes from SwiftShader (software rendering).
const webgl = { args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'] }

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : 4,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], ...chrome, viewport: { width: 1440, height: 900 }, launchOptions: webgl } },
    { name: 'tablet', grep: /@layout/, use: { ...devices['Desktop Chrome'], ...chrome, viewport: { width: 768, height: 1024 }, launchOptions: webgl } },
    {
      name: 'phone',
      grep: /@layout|@phone/,
      use: { ...devices['Pixel 7'], ...chrome, viewport: { width: 390, height: 844 }, launchOptions: webgl },
    },
    {
      name: 'no-webgl',
      grep: /@fallback/,
      use: { ...devices['Desktop Chrome'], ...chrome, viewport: { width: 1440, height: 900 }, launchOptions: { args: ['--disable-webgl', '--disable-3d-apis'] } },
    },
    { name: 'reduced-motion', grep: /@motion/, use: { ...devices['Desktop Chrome'], ...chrome, viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce', launchOptions: webgl } },
  ],
  webServer: {
    command: 'npm run build && npx vite preview --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: { VITE_API_URL: 'http://api.test' },
  },
})
