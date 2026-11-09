const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
  testDir: './tests/browser',
  use: { browserName: 'chromium', channel: 'msedge', baseURL: 'http://127.0.0.1:4173', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
  webServer: { command: 'node scripts/preview-mobile.mjs', url: 'http://127.0.0.1:4173', reuseExistingServer: false },
});
