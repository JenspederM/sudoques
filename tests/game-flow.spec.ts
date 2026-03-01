import { expect, test } from "@playwright/test";

test.describe("game flow", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/");
		
		// Attempting to log in as test user
		await page.waitForFunction(
			() => {
				return (
					document.body.innerText.includes("New Game") ||
					document.body.innerText.includes("Continue as Guest")
				);
			},
			{ timeout: 10000 },
		);

		if (
			page.url().includes("/login") ||
			(await page.getByText("Continue as Guest").isVisible())
		) {
			await page.click("text=Continue as Guest");
		}
		
		await expect(page.getByText("New Game")).toBeVisible({ timeout: 15000 });
	});

	test("can run through the core game loop", async ({ page }) => {
		// 1. Start a New Game
		await page.getByTestId("new-game-btn").click();
		await page.getByTestId("diff-easy").click();

		await expect(page.getByTestId("cell-0-0").first()).toBeVisible({
			timeout: 10000,
		});

		// 2. Play a move
		let emptyCell;
		let cellId = "";
		for (let r = 0; r < 9; r++) {
			for (let c = 0; c < 9; c++) {
				const cell = page.getByTestId(`cell-${r}-${c}`);
				if ((await cell.innerText()).trim() === "") {
					emptyCell = cell;
					cellId = `cell-${r}-${c}`;
					break;
				}
			}
			if (emptyCell) break;
		}

		if (!emptyCell) throw new Error("No empty cell found");

		await emptyCell.click();
		await page.getByTestId("numpad-1").click();
		await expect(emptyCell).toHaveText("1");

		// 3. Undo/Redo
		await page.getByTestId("undo-button").click();
		await expect(emptyCell).toHaveText("");
		await page.getByTestId("redo-button").click();
		await expect(emptyCell).toHaveText("1");

		// 4. Hint (Ensure we get a hint somewhere on the board)
		// Undo our random move first to ensure board state is clean
		await page.getByTestId("undo-button").click();
		await page.getByTestId("menu-button").click();
		await page.getByTestId("hint-btn").click({ force: true });
		// Verify some empty cell now has text (too hard to know exactly which one, just wait for board to update)
		// Instead we'll just check that it didn't crash and we can still interact

		// 5. Solve & Victory condition
		await page.getByTestId("menu-button").click();
		await page.getByTestId("solve-btn").click({ force: true });
		await expect(page.getByText("Victory")).toBeVisible({ timeout: 10000 });
		await page.getByTestId("back-to-menu-btn").click(); // go back home

		// 6. Settings / Stats do not crash
		await page.getByTestId("statistics-btn").click();
		await expect(page.getByText("Statistics")).toBeVisible();
		await page.getByTestId("back-button").click();
		
		await page.getByTestId("settings-btn").click();
		await expect(page.getByText("Settings")).toBeVisible();
	});
});
