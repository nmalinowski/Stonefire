import { test, expect } from '@playwright/test';

test.describe('Profile UI Screenshots', () => {
    test('header profile button - desktop', async ({ page }) => {
        await page.goto('/');
        const btn = page.locator('#profileBtn');
        await expect(btn).toBeVisible();
        await page.screenshot({ path: 'tests/screenshots/header-profile-btn.png' });
    });

    test('header profile button - mobile fullscreen', async ({ page }) => {
        await page.setViewportSize({ width: 800, height: 400 });
        await page.goto('/');
        await page.evaluate(() => document.body.classList.add('fullscreen-mode'));
        await page.screenshot({ path: 'tests/screenshots/mobile-profile-btn.png' });
    });

    test('auth modal - desktop', async ({ page }) => {
        await page.goto('/');
        await page.evaluate(() => document.getElementById('auth-modal').classList.remove('hidden'));
        await page.screenshot({ path: 'tests/screenshots/auth-modal-desktop.png' });
    });

    test('auth modal - mobile bottom sheet', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 812 });
        await page.goto('/');
        await page.evaluate(() => document.getElementById('auth-modal').classList.remove('hidden'));
        await page.screenshot({ path: 'tests/screenshots/auth-modal-mobile.png' });
    });

    test('profile page - desktop', async ({ page }) => {
        await page.goto('/profile.html');
        await page.screenshot({ path: 'tests/screenshots/profile-desktop.png', fullPage: true });
    });

    test('profile page - mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 812 });
        await page.goto('/profile.html');
        await page.screenshot({ path: 'tests/screenshots/profile-mobile.png', fullPage: true });
    });

    test('profile page - with stats data', async ({ page }) => {
        await page.goto('/profile.html');
        await page.evaluate(() => {
            localStorage.setItem('stonefire.stats', JSON.stringify({
                games_played: 42, wins: 28, losses: 14,
                current_streak: 5, best_streak: 8,
                faction_stats: {
                    JURASSIC: { games: 20, wins: 15, losses: 5 },
                    CRETACEOUS: { games: 22, wins: 13, losses: 9 }
                }
            }));
        });
        await page.reload();
        await page.screenshot({ path: 'tests/screenshots/profile-with-stats.png', fullPage: true });
    });

    test('profile page - with saved game', async ({ page }) => {
        await page.goto('/profile.html');
        await page.evaluate(() => {
            localStorage.setItem('stonefire.saveGame', JSON.stringify({
                gameState: {},
                savedAt: Date.now()
            }));
        });
        await page.reload();
        await page.screenshot({ path: 'tests/screenshots/profile-with-save.png', fullPage: true });
    });
});
