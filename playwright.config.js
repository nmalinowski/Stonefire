import { defineConfig } from '@playwright/test';

export default defineConfig({
    testDir: './tests',
    timeout: 30000,
    use: {
        baseURL: 'http://localhost:8080',
        screenshot: 'only-on-failure',
    },
    webServer: {
        command: 'npx http-server . -p 8080 -s',
        port: 8080,
        reuseExistingServer: true,
    },
});
