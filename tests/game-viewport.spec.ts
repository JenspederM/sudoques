import { expect, test, type Page } from "@playwright/test";

async function openGame(page: Page) {
	await page.goto("/");
	await page.waitForFunction(
		() =>
			document.body.innerText.includes("New Game") ||
			document.body.innerText.includes("Continue as Guest"),
		{ timeout: 10000 },
	);

	if (
		page.url().includes("/login") ||
		(await page.getByText("Continue as Guest").isVisible())
	) {
		await page.getByText("Continue as Guest").click();
	}

	await page.getByTestId("new-game-btn").click();
	await page.getByTestId("diff-easy").click();
	await expect(page.getByTestId("sudoku-grid")).toBeVisible({ timeout: 15000 });
	await page.waitForTimeout(500);
}

async function expectGameToFit(page: Page, safeBottom: number) {
	await page.evaluate((inset) => {
		document.documentElement.style.setProperty("--safe-bottom", `${inset}px`);
	}, safeBottom);

	const viewport = page.viewportSize();
	if (!viewport) throw new Error("The test page has no viewport");

	const selectors = [
		"page-header",
		"sudoku-grid",
		"undo-button",
		"note-toggle",
		"numpad-1",
		"numpad-9",
		"numpad-delete",
	];

	for (const testId of selectors) {
		const element = page.getByTestId(testId);
		await expect(element).toBeVisible();
		const box = await element.boundingBox();
		if (!box) throw new Error(`${testId} has no bounding box`);

		expect(box.x).toBeGreaterThanOrEqual(0);
		expect(box.y).toBeGreaterThanOrEqual(0);
		expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 0.5);
		expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 0.5);
	}

	const board = await page.getByTestId("sudoku-grid").boundingBox();
	const deleteKey = await page.getByTestId("numpad-delete").boundingBox();
	if (!board || !deleteKey) throw new Error("Game controls have no bounds");

	expect(Math.abs(board.width - board.height)).toBeLessThanOrEqual(1);
	expect(viewport.height - (deleteKey.y + deleteKey.height)).toBeGreaterThanOrEqual(
		Math.max(safeBottom, 32) - 1,
	);
	expect(
		await page.evaluate(
			() => document.documentElement.scrollWidth <= window.innerWidth,
		),
	).toBe(true);
	expect(
		await page.locator("main").evaluate(
			(element) => element.scrollHeight <= element.clientHeight + 1,
		),
	).toBe(true);
}

test.describe("short game viewports", () => {
	test("keeps the full game and bottom gutter visible at 375x667", async ({
		page,
	}) => {
		await page.setViewportSize({ width: 375, height: 667 });
		await openGame(page);
		await expectGameToFit(page, 0);
	});

	test("keeps the delete key above a simulated safe area at 320x568", async ({
		page,
	}) => {
		await page.setViewportSize({ width: 320, height: 568 });
		await openGame(page);
		await expectGameToFit(page, 34);
	});
});
