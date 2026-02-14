import { test, expect } from '@playwright/test';

test.describe('Sudoku Game Logic', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    
    // Wait for the auth or main content to load
    await page.waitForFunction(() => {
      return document.body.innerText.includes('New Game') || 
             document.body.innerText.includes('Continue as Guest');
    }, { timeout: 10000 });

    if (page.url().includes('/login') || (await page.getByText('Continue as Guest').isVisible())) {
      await page.click('text=Continue as Guest');
      // Wait for navigation back to home
      await page.waitForSelector('text=New Game', { timeout: 10000 });
    }
  });

  test('can start a new game and see the grid', async ({ page }) => {
    // Click New Game and wait for navigation to /new-game
    await page.getByText('New Game').click();
    await expect(page).toHaveURL(/\/new-game/);
    
    // Select Easy and wait for navigation to /game
    await page.getByText('Easy').click();
    await expect(page).toHaveURL(/\/game/);
    
    // Check if grid is visible with longer timeout
    await expect(page.getByTestId('cell-0-0').first()).toBeVisible({ timeout: 15000 });
  });

  test('timer increments', async ({ page }) => {
    await page.getByText('New Game').click();
    await page.getByText('Easy').click();
    
    // Wait for timer to show something other than 0:00
    const timer = page.getByTestId('timer');
    await expect(timer).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(3000);
    const time = await timer.innerText();
    expect(time).not.toBe('0:00');
  });

  test('can enter a number into an empty cell', async ({ page }) => {
    await page.click('text=New Game');
    await page.click('text=Easy');
    
    // Ensure grid is loaded
    await expect(page.getByTestId('cell-0-0').first()).toBeVisible({ timeout: 10000 });

    // Find an empty cell by checking all cells until one has no text
    let emptyCell;
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const cell = page.getByTestId(`cell-${r}-${c}`);
        if ((await cell.innerText()).trim() === '') {
          emptyCell = cell;
          break;
        }
      }
      if (emptyCell) break;
    }
    
    if (!emptyCell) throw new Error('No empty cell found in Easy mode');
    
    await emptyCell.click();
    await page.getByTestId('numpad-5').click();
    
    await expect(emptyCell).toHaveText('5');
  });

  test('can restart a game and clear inputs', async ({ page }) => {
    await page.click('text=New Game');
    await page.click('text=Easy');
    
    await expect(page.getByTestId('cell-0-0').first()).toBeVisible({ timeout: 10000 });

    let emptyCell;
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const cell = page.getByTestId(`cell-${r}-${c}`);
        if ((await cell.innerText()).trim() === '') {
          emptyCell = cell;
          break;
        }
      }
      if (emptyCell) break;
    }
    
    if (!emptyCell) throw new Error('No empty cell found');
    
    await emptyCell.click();
    await page.getByTestId('numpad-1').click();
    await expect(emptyCell).toHaveText('1');
    
    // Click Restart
    await page.getByTestId('restart-button').click();
    
    // Check if timer is 0:00 (approximately, timer starts immediately) and cell is empty
    const timerText = await page.getByTestId('timer').innerText();
    expect(timerText).toMatch(/0:0[0-2]/); // Allow for small delay
    await expect(emptyCell).toHaveText('');
  });
});
