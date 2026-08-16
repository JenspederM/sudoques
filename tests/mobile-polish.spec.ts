import { expect, test, type Locator, type Page } from "@playwright/test";

async function openHome(page: Page) {
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

	await expect(page.getByTestId("new-game-btn")).toBeVisible({
		timeout: 15000,
	});
}

async function expectMotionAtRest(locator: Locator) {
	await expect(locator).toBeVisible();
	const styles = await locator.evaluate((element) => {
		const computed = getComputedStyle(element);
		return {
			opacity: computed.opacity,
			transform: computed.transform,
		};
	});

	expect(styles.opacity).toBe("1");
	expect(["none", "matrix(1, 0, 0, 1, 0, 0)"]).toContain(styles.transform);
}

test.describe("mobile navigation polish", () => {
	test.use({ viewport: { width: 320, height: 480 } });

	test("reduced motion renders pages, menus, dialogs, and hints at rest", async ({
		page,
	}) => {
		await page.emulateMedia({ reducedMotion: "reduce" });
		await openHome(page);

		await page.getByTestId("new-game-btn").click();
		await expect(page).toHaveURL(/\/new-game$/);
		await expectMotionAtRest(page.locator("main"));

		const difficultyOptions = page
			.getByTestId("difficulty-list")
			.locator('[role="button"]');
		await expect(difficultyOptions).toHaveCount(6);
		for (const difficulty of await difficultyOptions.all()) {
			await expectMotionAtRest(difficulty);
		}

		await page.getByTestId("diff-easy").click();
		await expect(page.getByTestId("cell-0-0").first()).toBeVisible({
			timeout: 15000,
		});

		await page.getByTestId("menu-button").click();
		await expectMotionAtRest(page.getByTestId("game-menu-panel"));
		await page.getByTestId("game-menu-panel").getByText("About").click();
		await expectMotionAtRest(page.getByTestId("dialog-overlay"));
		await expectMotionAtRest(page.getByTestId("dialog-content"));

		await page.getByTestId("dialog-overlay").click({ position: { x: 1, y: 1 } });
		await page.getByTestId("menu-button").click();
		await page.getByTestId("hint-btn").click();
		await expectMotionAtRest(page.getByTestId("hint-panel"));
	});

	test("difficulty options stay within the viewport and keep vertical scroll and tap feedback", async ({
		page,
	}) => {
		await page.emulateMedia({ reducedMotion: "no-preference" });
		await openHome(page);
		await page.getByTestId("new-game-btn").click();

		const list = page.getByTestId("difficulty-list");
		await expect(list).toBeVisible();
		const initialMetrics = await list.evaluate((element) => {
			const computed = getComputedStyle(element);
			const maxScrollTop = element.scrollHeight - element.clientHeight;
			element.scrollTop = maxScrollTop;
			return {
				maxScrollTop,
				scrollTop: element.scrollTop,
				hasHorizontalOverflow: element.scrollWidth > element.clientWidth,
				overflowX: computed.overflowX,
				overflowY: computed.overflowY,
			};
		});

		expect(initialMetrics.overflowX).toBe("hidden");
		expect(initialMetrics.overflowY).toBe("auto");
		expect(initialMetrics.hasHorizontalOverflow).toBe(false);
		expect(initialMetrics.maxScrollTop).toBeGreaterThan(0);
		expect(initialMetrics.scrollTop).toBeGreaterThan(0);

		await list.evaluate((element) => {
			element.scrollTop = 0;
		});
		const easy = page.getByTestId("diff-easy");
		await easy.hover();
		expect(
			await list.evaluate(
				(element) => element.scrollWidth > element.clientWidth,
			),
		).toBe(false);

		const box = await easy.boundingBox();
		if (!box) throw new Error("Easy difficulty option has no bounding box");
		await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
		await page.mouse.down();
		await expect
			.poll(() => easy.evaluate((element) => getComputedStyle(element).transform))
			.not.toBe("none");
		expect(
			await list.evaluate(
				(element) => element.scrollWidth > element.clientWidth,
			),
		).toBe(false);
		await page.mouse.move(1, 1);
		await page.mouse.up();
	});
});
