import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import type { Difficulty, HighScore } from "@/types";
import { DifficultyList } from "./DifficultyList";

const score = (difficulty: Difficulty, time: number) =>
	({
		puzzle: { difficulty },
		time,
	}) as HighScore;

describe("DifficultyList SSR", () => {
	test("renders records and completed-game counts for their difficulty", () => {
		const markup = renderToStaticMarkup(
			<DifficultyList
				scores={[score("easy", 130), score("easy", 65.9), score("hard", 600)]}
				isLoading={false}
				isUnavailable={false}
				onSelectDifficulty={() => {}}
				startingDifficulty={null}
			/>,
		);

		expect(markup).toContain('data-testid="diff-easy-best-time"');
		expect(markup).toContain("1:05");
		expect(markup).toContain('data-testid="diff-easy-completed-games"');
		expect(markup).toContain(">2</strong> games");
		expect(markup).toContain('data-testid="diff-hard-best-time"');
		expect(markup).toContain("10:00");
		expect(markup).toContain(">1</strong> game");
	});

	test("renders a clear per-card empty state for all difficulties", () => {
		const markup = renderToStaticMarkup(
			<DifficultyList
				scores={[]}
				isLoading={false}
				isUnavailable={false}
				onSelectDifficulty={() => {}}
				startingDifficulty={null}
			/>,
		);

		expect(markup.match(/>No record yet<\/strong>/g)).toHaveLength(6);
		expect(markup.match(/>0<\/strong> games/g)).toHaveLength(6);
		expect(markup.match(/data-testid="diff-[a-z]+"/g)).toHaveLength(6);
	});

	test("keeps every card identifiable and labelled as a game action", () => {
		const markup = renderToStaticMarkup(
			<DifficultyList
				scores={[]}
				isLoading={false}
				isUnavailable={false}
				onSelectDifficulty={() => {}}
				startingDifficulty={null}
			/>,
		);

		for (const label of [
			"Easy",
			"Normal",
			"Medium",
			"Hard",
			"Expert",
			"Master",
		]) {
			expect(markup).toContain(`aria-label="Start ${label} game.`);
		}
	});

	test("shows a non-misleading loading state before the first score snapshot", () => {
		const markup = renderToStaticMarkup(
			<DifficultyList
				scores={[]}
				isLoading={true}
				isUnavailable={false}
				onSelectDifficulty={() => {}}
				startingDifficulty={null}
			/>,
		);

		expect(markup.match(/Loading records…/g)).toHaveLength(6);
		expect(markup).not.toContain("No record yet");
		expect(markup).not.toContain(">0</strong> games");
		expect(markup).toContain("Records are loading");
	});

	test("shows an explicit unavailable state without hiding game actions", () => {
		const markup = renderToStaticMarkup(
			<DifficultyList
				scores={[]}
				isLoading={false}
				isUnavailable={true}
				onSelectDifficulty={() => {}}
				startingDifficulty={null}
			/>,
		);

		expect(markup.match(/>Records unavailable<\/output>/g)).toHaveLength(6);
		expect(markup).not.toContain("Loading records…");
		expect(markup).not.toContain("No record yet");
		expect(markup.match(/<button/g)).toHaveLength(6);
		expect(markup.match(/type="button"/g)).toHaveLength(6);
		expect(markup).toContain(
			"Start Easy game. Personal records are unavailable.",
		);
	});

	test("disables every option and identifies the requested game while starting", () => {
		const markup = renderToStaticMarkup(
			<DifficultyList
				scores={[]}
				isLoading={false}
				isUnavailable={false}
				onSelectDifficulty={() => {}}
				startingDifficulty="hard"
			/>,
		);

		expect(markup.match(/disabled=""/g)).toHaveLength(6);
		expect(markup).toContain('aria-label="Starting Hard game…"');
		expect(markup).toContain('aria-busy="true"');
		expect(markup.match(/aria-busy="false"/g)).toHaveLength(5);
	});
});
