import { expect, test } from "@playwright/test";

test.describe("Sudoku Game Logic", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/");

		// Wait for the auth or main content to load
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
			// Wait for navigation back to home
			await page.waitForSelector("text=New Game", { timeout: 10000 });
		}
	});

	test("can start a new game and see the grid", async ({ page }) => {
		// Click New Game and wait for navigation to /new-game
		await page.getByText("New Game").click();
		await expect(page).toHaveURL(/\/new-game/);

		// Select Easy and wait for navigation to /game
		await page.getByText("Easy").click();
		await expect(page).toHaveURL(/\/game/);

		// Check if grid is visible with longer timeout
		await expect(page.getByTestId("cell-0-0").first()).toBeVisible({
			timeout: 15000,
		});
	});

	test("timer increments", async ({ page }) => {
		await page.getByText("New Game").click();
		await page.getByText("Easy").click();

		// Wait for timer to show something other than 0:00
		const timer = page.getByTestId("timer");
		await expect(timer).toBeVisible({ timeout: 15000 });
		await page.waitForTimeout(3000);
		const time = await timer.innerText();
		expect(time).not.toBe("0:00");
	});

	test("hint explains the next step without changing the board", async ({
		page,
	}) => {
		await page.getByText("New Game").click();
		await page.getByText("Easy").click();
		await expect(page.getByTestId("cell-0-0")).toBeVisible({ timeout: 15000 });

		const undoButton = page.getByTestId("undo-button");
		await expect(undoButton).toBeDisabled();
		await page.getByTestId("menu-button").click();
		await page.getByTestId("hint-btn").click();

		const hintPanel = page.getByTestId("hint-panel");
		await expect(hintPanel).toBeVisible();
		await expect(hintPanel).toHaveAttribute("data-disclosure-stage", "technique");
		await expect(
			page.locator('[data-hint-candidate="placement"]'),
		).toHaveCount(0);

		await page.getByTestId("show-hint-location").click();
		await expect(hintPanel).toHaveAttribute("data-disclosure-stage", "location");
		await expect(
			page.locator('[data-hint-candidate="placement"]'),
		).toHaveCount(0);

		await page.getByTestId("show-full-hint").click();
		await expect(hintPanel).toHaveAttribute("data-disclosure-stage", "details");
		await expect(
			page.locator('[data-hint-candidate="placement"]'),
		).toHaveCount(1);
		await expect(undoButton).toBeDisabled();
	});

	test("hint panel stays usable when collapsed on a narrow phone", async ({
		page,
	}) => {
		await page.setViewportSize({ width: 320, height: 568 });
		await page.getByText("New Game").click();
		await page.getByText("Easy").click();
		await expect(page.getByTestId("cell-0-0")).toBeVisible({ timeout: 15000 });
		await page.getByTestId("menu-button").click();
		await page.getByTestId("hint-btn").click();

		const hintPanel = page.getByTestId("hint-panel");
		await expect(hintPanel).toHaveAttribute("data-collapsed", "false");
		const expandedBox = await hintPanel.boundingBox();
		expect(expandedBox).not.toBeNull();
		if (!expandedBox) throw new Error("Expanded hint panel has no bounding box");
		expect(expandedBox.x).toBeGreaterThanOrEqual(0);
		expect(expandedBox.x + expandedBox.width).toBeLessThanOrEqual(321);
		expect(expandedBox.y + expandedBox.height).toBeLessThanOrEqual(569);

		await page.getByTestId("collapse-hint").click();
		await expect(hintPanel).toHaveAttribute("data-collapsed", "true");
		const collapsedBox = await hintPanel.boundingBox();
		expect(collapsedBox).not.toBeNull();
		if (!collapsedBox) throw new Error("Collapsed hint panel has no bounding box");
		expect(collapsedBox.height).toBeLessThan(expandedBox.height);
		expect(collapsedBox.x + collapsedBox.width).toBeLessThanOrEqual(321);
		expect(collapsedBox.y + collapsedBox.height).toBeLessThanOrEqual(569);

		await page.getByTestId("expand-hint").click();
		await expect(hintPanel).toHaveAttribute("data-collapsed", "false");
		await expect(hintPanel).toHaveAttribute("data-disclosure-stage", "technique");
		expect(
			await page.evaluate(
				() => document.documentElement.scrollWidth <= window.innerWidth,
			),
		).toBe(true);
	});

	test("shows an invalid-entry warning immediately", async ({ page }) => {
		await page.getByText("New Game").click();
		await page.getByText("Easy").click();
		await expect(page.getByTestId("cell-0-0")).toBeVisible({ timeout: 15000 });

		let target: ReturnType<typeof page.getByTestId> | undefined;
		let conflictingValue: string | undefined;
		for (let row = 0; row < 9 && !target; row++) {
			const values = await Promise.all(
				Array.from({ length: 9 }, (_, col) =>
					page.getByTestId(`cell-${row}-${col}`).innerText(),
				),
			);
			const emptyCol = values.findIndex((value) => value.trim() === "");
			conflictingValue = values.find((value) => /^[1-9]$/.test(value.trim()))?.trim();
			if (emptyCol >= 0 && conflictingValue) {
				target = page.getByTestId(`cell-${row}-${emptyCol}`);
			}
		}
		if (!target || !conflictingValue) {
			throw new Error("Could not find an empty cell and row value");
		}

		await target.click();
		await page.getByTestId(`numpad-${conflictingValue}`).click();
		await page.getByTestId("menu-button").click();
		await page.getByTestId("hint-btn").click();

		const hintPanel = page.getByTestId("hint-panel");
		await expect(hintPanel).toHaveAttribute("data-disclosure-stage", "details");
		await expect(page.getByTestId("hint-heading")).toContainText("Recheck");
		await expect(page.getByText("The correct value is deliberately not revealed.")).toBeVisible();
		await expect(page.getByTestId("show-hint-location")).toHaveCount(0);
		await expect(page.getByTestId("show-full-hint")).toHaveCount(0);
	});

	test("can enter a number into an empty cell", async ({ page }) => {
		await page.click("text=New Game");
		await page.click("text=Easy");

		// Ensure grid is loaded
		await expect(page.getByTestId("cell-0-0").first()).toBeVisible({
			timeout: 10000,
		});

		// Find an empty cell by checking all cells until one has no text
		let emptyCell;
		for (let r = 0; r < 9; r++) {
			for (let c = 0; c < 9; c++) {
				const cell = page.getByTestId(`cell-${r}-${c}`);
				if ((await cell.innerText()).trim() === "") {
					emptyCell = cell;
					break;
				}
			}
			if (emptyCell) break;
		}

		if (!emptyCell) throw new Error("No empty cell found in Easy mode");

		await emptyCell.click();
		await page.getByTestId("numpad-5").click();

		await expect(emptyCell).toHaveText("5");
	});
});
