import { test, expect } from '@playwright/test';

test.describe('Save Game', () => {
    test('profile page shows no-save state by default', async ({ page }) => {
        await page.goto('/profile.html');
        await page.evaluate(() => localStorage.removeItem('stonefire.saveGame'));
        await page.reload();
        await expect(page.locator('#no-save')).toBeVisible();
        await expect(page.locator('#save-exists')).toBeHidden();
    });

    test('profile page shows save when present', async ({ page }) => {
        await page.goto('/profile.html');
        await page.evaluate(() => {
            localStorage.setItem('stonefire.saveGame', JSON.stringify({
                gameState: { turn: 5 },
                savedAt: Date.now()
            }));
        });
        await page.reload();
        await expect(page.locator('#save-exists')).toBeVisible();
    });

    test('delete save button clears save', async ({ page }) => {
        await page.goto('/profile.html');
        await page.evaluate(() => {
            localStorage.setItem('stonefire.saveGame', JSON.stringify({
                gameState: { turn: 5 },
                savedAt: Date.now()
            }));
        });
        await page.reload();
        page.on('dialog', dialog => dialog.accept());
        await page.click('#delete-save-btn');
        await expect(page.locator('#no-save')).toBeVisible();
    });
});
