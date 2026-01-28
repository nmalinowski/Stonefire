import { test, expect } from '@playwright/test';

test.describe('Auth Flows', () => {
    test('auth modal opens on profile button click', async ({ page }) => {
        await page.goto('/');
        await page.click('#profileBtn');
        await expect(page.locator('#auth-modal')).toBeVisible();
    });

    test('auth modal closes on X', async ({ page }) => {
        await page.goto('/');
        await page.click('#profileBtn');
        await page.click('.auth-modal-close');
        await expect(page.locator('#auth-modal')).toBeHidden();
    });

    test('auth modal closes on Escape', async ({ page }) => {
        await page.goto('/');
        await page.click('#profileBtn');
        await page.keyboard.press('Escape');
        await expect(page.locator('#auth-modal')).toBeHidden();
    });

    test('auth modal closes on backdrop click', async ({ page }) => {
        await page.goto('/');
        await page.click('#profileBtn');
        await page.click('#auth-modal', { position: { x: 10, y: 10 } });
        await expect(page.locator('#auth-modal')).toBeHidden();
    });

    test('toggle between sign-in and sign-up', async ({ page }) => {
        await page.goto('/');
        await page.click('#profileBtn');
        await expect(page.locator('#auth-email-submit')).toHaveText('Sign In');
        await page.click('#auth-toggle-mode');
        await expect(page.locator('#auth-email-submit')).toHaveText('Sign Up');
    });

    test('shows error for empty email', async ({ page }) => {
        await page.goto('/');
        await page.click('#profileBtn');
        await page.click('#auth-email-submit');
        await expect(page.locator('#auth-error')).toBeVisible();
    });
});
