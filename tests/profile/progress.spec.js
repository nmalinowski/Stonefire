import { test, expect } from '@playwright/test';

test.describe('Progress Tracking', () => {
    test('profile page shows zero stats by default', async ({ page }) => {
        await page.goto('/profile.html');
        await page.evaluate(() => localStorage.removeItem('stonefire.stats'));
        await page.reload();
        await expect(page.locator('#stat-games')).toHaveText('0');
        await expect(page.locator('#stat-wins')).toHaveText('0');
        await expect(page.locator('#stat-winrate')).toHaveText('0%');
    });

    test('profile page renders populated stats', async ({ page }) => {
        await page.goto('/profile.html');
        await page.evaluate(() => {
            localStorage.setItem('stonefire.stats', JSON.stringify({
                games_played: 10, wins: 7, losses: 3,
                current_streak: 2, best_streak: 4,
                faction_stats: { JURASSIC: { games: 10, wins: 7, losses: 3 } }
            }));
        });
        await page.reload();
        await expect(page.locator('#stat-games')).toHaveText('10');
        await expect(page.locator('#stat-wins')).toHaveText('7');
        await expect(page.locator('#stat-winrate')).toHaveText('70%');
        await expect(page.locator('#stat-streak')).toHaveText('2');
        await expect(page.locator('#stat-best')).toHaveText('4');
        await expect(page.locator('.faction-stat-name')).toHaveText('JURASSIC');
    });
});
