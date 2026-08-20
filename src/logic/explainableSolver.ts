import type { Board, CellNotes, Difficulty, Technique } from "@/types";
import { findAlternatingInferenceChain } from "./alternatingInferenceChain";
import {
	findSkyscraper as findSkyscraperPattern,
	findTwoStringKite as findTwoStringKitePattern,
	type TurbotFishPattern,
} from "./turbotFish";

const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

type CandidateGrid = Set<number>[][];

type HintSearchNode = {
	candidates: CandidateGrid;
	steps: HintStep[];
	cost: number;
	pathKey: string;
};

export type HintTechnique =
	| Exclude<Technique, "Backtracking">
	| "Check for mistakes";
export type HintStepKind = "placement" | "elimination" | "correction";
export type HintCandidateGroup = "a" | "b";

export type CellRef = {
	row: number;
	col: number;
};

export type CandidateRef = CellRef & {
	value: number;
};

export type HintCandidate = CandidateRef & {
	group?: HintCandidateGroup;
};

export type HintCell = CellRef & {
	role: "focus" | "warning";
};

export type HouseRef = {
	type: "row" | "column" | "box";
	index: number;
};

export type HintStep = {
	technique: HintTechnique;
	kind: HintStepKind;
	title: string;
	summary: string;
	details: string[];
	pattern: HintCandidate[];
	eliminations: CandidateRef[];
	placement?: CandidateRef;
	cells?: HintCell[];
	houses?: HouseRef[];
};

export type ExplainableHint = {
	status: "hint" | "complete" | "invalid" | "stuck";
	message: string;
	steps: HintStep[];
};

export type HintTechniqueProfile = {
	difficulty?: Difficulty;
	/**
	 * Backtracking in legacy metadata is treated as search to replace, not as a
	 * logical ceiling; newly supported AIC hints may therefore supersede it.
	 */
	techniques?: readonly string[];
	notes?: CellNotes;
	/**
	 * The interactive game may opt into a harder logical continuation when the
	 * player's exact notes already record every deduction available inside the
	 * puzzle's advertised grading profile. Other callers keep the strict ceiling.
	 */
	allowBeyondProfileAfterRecordedNotes?: boolean;
};

type House = HouseRef & {
	cells: CellRef[];
};

const HOUSES: House[] = [
	...DIGITS.map((_, row) => ({
		type: "row" as const,
		index: row,
		cells: DIGITS.map((__, col) => ({ row, col })),
	})),
	...DIGITS.map((_, col) => ({
		type: "column" as const,
		index: col,
		cells: DIGITS.map((__, row) => ({ row, col })),
	})),
	...DIGITS.map((_, box) => {
		const startRow = Math.floor(box / 3) * 3;
		const startCol = (box % 3) * 3;
		return {
			type: "box" as const,
			index: box,
			cells: DIGITS.map((__, offset) => ({
				row: startRow + Math.floor(offset / 3),
				col: startCol + (offset % 3),
			})),
		};
	}),
];

function cellName({ row, col }: CellRef) {
	return `R${row + 1}C${col + 1}`;
}

function houseName({ type, index }: HouseRef) {
	if (type === "row") return `row ${index + 1}`;
	if (type === "column") return `column ${index + 1}`;
	return `box ${index + 1}`;
}

function cellKey({ row, col }: CellRef) {
	return `${row},${col}`;
}

function candidateKey({ row, col, value }: CandidateRef) {
	return `${row},${col},${value}`;
}

function uniqueCandidates<T extends CandidateRef>(items: T[]): T[] {
	const seen = new Set<string>();
	return items.filter((item) => {
		const key = candidateKey(item);
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});
}

function combinations<T>(items: T[], size: number): T[][] {
	const result: T[][] = [];
	const visit = (start: number, chosen: T[]) => {
		if (chosen.length === size) {
			result.push([...chosen]);
			return;
		}
		for (let index = start; index < items.length; index++) {
			const item = items[index];
			if (item === undefined) continue;
			chosen.push(item);
			visit(index + 1, chosen);
			chosen.pop();
		}
	};
	visit(0, []);
	return result;
}

function candidatesAt(candidates: CandidateGrid, cell: CellRef) {
	return candidates[cell.row]?.[cell.col] ?? new Set<number>();
}

function arePeers(a: CellRef, b: CellRef) {
	return (
		a.row === b.row ||
		a.col === b.col ||
		(Math.floor(a.row / 3) === Math.floor(b.row / 3) &&
			Math.floor(a.col / 3) === Math.floor(b.col / 3))
	);
}

function buildCandidates(board: Board): CandidateGrid {
	return DIGITS.map((_, row) =>
		DIGITS.map((__, col) => {
			if (board[row]?.[col] !== null) return new Set<number>();
			const used = new Set<number>();
			for (let index = 0; index < 9; index++) {
				const rowValue = board[row]?.[index];
				const colValue = board[index]?.[col];
				if (rowValue !== null && rowValue !== undefined) used.add(rowValue);
				if (colValue !== null && colValue !== undefined) used.add(colValue);
			}
			const startRow = Math.floor(row / 3) * 3;
			const startCol = Math.floor(col / 3) * 3;
			for (let rowOffset = 0; rowOffset < 3; rowOffset++) {
				for (let colOffset = 0; colOffset < 3; colOffset++) {
					const value = board[startRow + rowOffset]?.[startCol + colOffset];
					if (value !== null && value !== undefined) used.add(value);
				}
			}
			return new Set(DIGITS.filter((value) => !used.has(value)));
		}),
	);
}

function findNakedSingle(candidates: CandidateGrid): HintStep | null {
	for (let row = 0; row < 9; row++) {
		for (let col = 0; col < 9; col++) {
			const values = candidates[row]?.[col];
			if (values?.size !== 1) continue;
			const value = [...values][0];
			if (value === undefined) continue;
			const placement = { row, col, value };
			return {
				technique: "Naked Single",
				kind: "placement",
				title: `Only ${value} fits in ${cellName(placement)}`,
				summary: "Every other digit is excluded by the row, column, or box.",
				details: [
					`${cellName(placement)} has just one remaining candidate: ${value}.`,
					`Place ${value} in ${cellName(placement)}.`,
				],
				pattern: [placement],
				eliminations: [],
				placement,
				cells: [{ row, col, role: "focus" }],
			};
		}
	}
	return null;
}

function findHiddenSingle(candidates: CandidateGrid): HintStep | null {
	for (const house of HOUSES) {
		for (const value of DIGITS) {
			const positions = house.cells.filter((cell) =>
				candidatesAt(candidates, cell).has(value),
			);
			if (positions.length !== 1) continue;
			const target = positions[0];
			if (!target) continue;
			const placement = { ...target, value };
			return {
				technique: "Hidden Single",
				kind: "placement",
				title: `${value} has only one place in ${houseName(house)}`,
				summary: `${cellName(target)} is the only cell in ${houseName(house)} that can contain ${value}.`,
				details: [
					`Check every empty cell in ${houseName(house)} for candidate ${value}.`,
					`All positions except ${cellName(target)} are blocked, so place ${value} there.`,
				],
				pattern: [placement],
				eliminations: [],
				placement,
				cells: [{ ...target, role: "focus" }],
				houses: [{ type: house.type, index: house.index }],
			};
		}
	}
	return null;
}

function findPointing(candidates: CandidateGrid): HintStep | null {
	for (const box of HOUSES.filter((house) => house.type === "box")) {
		for (const value of DIGITS) {
			const positions = box.cells.filter((cell) =>
				candidatesAt(candidates, cell).has(value),
			);
			if (positions.length < 2 || positions.length > 3) continue;
			const sameRow = positions.every((cell) => cell.row === positions[0]?.row);
			const sameCol = positions.every((cell) => cell.col === positions[0]?.col);
			if (!sameRow && !sameCol) continue;

			const lineType = sameRow ? "row" : "column";
			const lineIndex = sameRow ? positions[0]?.row : positions[0]?.col;
			if (lineIndex === undefined) continue;
			const boxCells = new Set(box.cells.map(cellKey));
			const line = HOUSES.find(
				(house) => house.type === lineType && house.index === lineIndex,
			);
			if (!line) continue;
			const eliminations = line.cells
				.filter(
					(cell) =>
						!boxCells.has(cellKey(cell)) &&
						candidatesAt(candidates, cell).has(value),
				)
				.map((cell) => ({ ...cell, value }));
			if (eliminations.length === 0) continue;

			return {
				technique: "Pointing Pairs",
				kind: "elimination",
				title: `Pointing ${positions.length === 2 ? "pair" : "triple"} on ${value}`,
				summary: `Inside ${houseName(box)}, candidate ${value} is confined to ${houseName(line)}.`,
				details: [
					`The highlighted ${value}s are the only candidates for ${value} in ${houseName(box)}.`,
					`One of them must be true, so ${value} can be removed from the other marked cells in ${houseName(line)}.`,
				],
				pattern: positions.map((cell) => ({ ...cell, value })),
				eliminations,
				houses: [
					{ type: box.type, index: box.index },
					{ type: line.type, index: line.index },
				],
			};
		}
	}
	return null;
}

function findClaiming(candidates: CandidateGrid): HintStep | null {
	for (const line of HOUSES.filter((house) => house.type !== "box")) {
		for (const value of DIGITS) {
			const positions = line.cells.filter((cell) =>
				candidatesAt(candidates, cell).has(value),
			);
			if (positions.length < 2 || positions.length > 3) continue;
			const boxes = new Set(
				positions.map(
					(cell) => Math.floor(cell.row / 3) * 3 + Math.floor(cell.col / 3),
				),
			);
			if (boxes.size !== 1) continue;
			const boxIndex = [...boxes][0];
			if (boxIndex === undefined) continue;
			const box = HOUSES.find(
				(house) => house.type === "box" && house.index === boxIndex,
			);
			if (!box) continue;
			const lineCells = new Set(line.cells.map(cellKey));
			const eliminations = box.cells
				.filter(
					(cell) =>
						!lineCells.has(cellKey(cell)) &&
						candidatesAt(candidates, cell).has(value),
				)
				.map((cell) => ({ ...cell, value }));
			if (eliminations.length === 0) continue;

			return {
				technique: "Line/Box Reduction",
				kind: "elimination",
				title: `Claiming candidates for ${value}`,
				summary: `All ${value}s in ${houseName(line)} lie inside ${houseName(box)}.`,
				details: [
					`One of the highlighted candidates must place ${value} in ${houseName(box)}.`,
					`Remove ${value} from the other marked cells in that box.`,
				],
				pattern: positions.map((cell) => ({ ...cell, value })),
				eliminations,
				houses: [
					{ type: line.type, index: line.index },
					{ type: box.type, index: box.index },
				],
			};
		}
	}
	return null;
}

function subsetName(size: number, hidden: boolean): HintTechnique {
	if (hidden) {
		if (size === 2) return "Hidden Pair";
		if (size === 3) return "Hidden Triple";
		return "Hidden Quad";
	}
	if (size === 2) return "Naked Pair";
	if (size === 3) return "Naked Triple";
	return "Naked Quad";
}

function findNakedSubset(
	candidates: CandidateGrid,
	size: 2 | 3 | 4,
): HintStep | null {
	for (const house of HOUSES) {
		const eligible = house.cells.filter((cell) => {
			const count = candidatesAt(candidates, cell).size;
			return count >= 2 && count <= size;
		});
		for (const cells of combinations(eligible, size)) {
			const values = new Set<number>();
			for (const cell of cells) {
				for (const value of candidatesAt(candidates, cell)) values.add(value);
			}
			if (values.size !== size) continue;
			const selected = new Set(cells.map(cellKey));
			const eliminations: CandidateRef[] = [];
			for (const cell of house.cells) {
				if (selected.has(cellKey(cell))) continue;
				for (const value of values) {
					if (candidatesAt(candidates, cell).has(value)) {
						eliminations.push({ ...cell, value });
					}
				}
			}
			if (eliminations.length === 0) continue;
			const technique = subsetName(size, false);
			const valueList = [...values].sort().join(", ");
			return {
				technique,
				kind: "elimination",
				title: `${technique} in ${houseName(house)}`,
				summary: `${cells.map(cellName).join(", ")} contain only ${valueList}.`,
				details: [
					`These ${size} cells must contain the ${size} digits ${valueList} in some order.`,
					`Those digits can therefore be removed from every other marked cell in ${houseName(house)}.`,
				],
				pattern: cells.flatMap((cell) =>
					[...candidatesAt(candidates, cell)].map((value) => ({
						...cell,
						value,
					})),
				),
				eliminations: uniqueCandidates(eliminations),
				houses: [{ type: house.type, index: house.index }],
			};
		}
	}
	return null;
}

function findHiddenSubset(
	candidates: CandidateGrid,
	size: 2 | 3 | 4,
): HintStep | null {
	for (const house of HOUSES) {
		for (const values of combinations([...DIGITS], size)) {
			const cells = house.cells.filter((cell) =>
				values.some((value) => candidatesAt(candidates, cell).has(value)),
			);
			if (cells.length !== size) continue;
			if (
				!values.every((value) =>
					cells.some((cell) => candidatesAt(candidates, cell).has(value)),
				)
			)
				continue;
			const valueSet = new Set<number>(values);
			const eliminations = cells.flatMap((cell) =>
				[...candidatesAt(candidates, cell)]
					.filter((value) => !valueSet.has(value))
					.map((value) => ({ ...cell, value })),
			);
			if (eliminations.length === 0) continue;
			const technique = subsetName(size, true);
			const valueList = [...values].sort().join(", ");
			return {
				technique,
				kind: "elimination",
				title: `${technique} in ${houseName(house)}`,
				summary: `Digits ${valueList} can appear only in ${cells.map(cellName).join(", ")}.`,
				details: [
					`Those ${size} digits must occupy the highlighted ${size} cells.`,
					`Remove every other marked candidate from those cells.`,
				],
				pattern: cells.flatMap((cell) =>
					values
						.filter((value) => candidatesAt(candidates, cell).has(value))
						.map((value) => ({ ...cell, value })),
				),
				eliminations,
				houses: [{ type: house.type, index: house.index }],
			};
		}
	}
	return null;
}

function fishName(size: 2 | 3 | 4): HintTechnique {
	if (size === 2) return "X-Wing";
	if (size === 3) return "Swordfish";
	return "Jellyfish";
}

function findFish(candidates: CandidateGrid, size: 2 | 3 | 4): HintStep | null {
	for (const value of DIGITS) {
		for (const horizontal of [true, false]) {
			const lines = DIGITS.map((_, index) => {
				const positions = DIGITS.flatMap((__, position) => {
					const cell = horizontal
						? { row: index, col: position }
						: { row: position, col: index };
					return candidatesAt(candidates, cell).has(value) ? [position] : [];
				});
				return { index, positions };
			}).filter(
				(line) => line.positions.length >= 2 && line.positions.length <= size,
			);

			for (const baseLines of combinations(lines, size)) {
				const coverIndices = new Set(
					baseLines.flatMap((line) => line.positions),
				);
				if (coverIndices.size !== size) continue;
				const baseIndices = new Set(baseLines.map((line) => line.index));
				const eliminations: CandidateRef[] = [];
				for (const cover of coverIndices) {
					for (let other = 0; other < 9; other++) {
						if (baseIndices.has(other)) continue;
						const cell = horizontal
							? { row: other, col: cover }
							: { row: cover, col: other };
						if (candidatesAt(candidates, cell).has(value)) {
							eliminations.push({ ...cell, value });
						}
					}
				}
				if (eliminations.length === 0) continue;
				const technique = fishName(size);
				const pattern = baseLines.flatMap((line) =>
					line.positions.map((position) => ({
						row: horizontal ? line.index : position,
						col: horizontal ? position : line.index,
						value,
					})),
				);
				const baseType = horizontal ? "row" : "column";
				const coverType = horizontal ? "column" : "row";
				return {
					technique,
					kind: "elimination",
					title: `${technique} on ${value}`,
					summary: `${value} is locked into ${size} ${baseType}s and the same ${size} ${coverType}s.`,
					details: [
						`In each highlighted ${baseType}, candidate ${value} appears only in the highlighted ${coverType}s.`,
						`Those ${size} placements must occupy different ${coverType}s, so remove ${value} from the other marked cells there.`,
					],
					pattern,
					eliminations,
					houses: [
						...baseLines.map((line) => ({
							type: baseType as HouseRef["type"],
							index: line.index,
						})),
						...[...coverIndices].map((index) => ({
							type: coverType as HouseRef["type"],
							index,
						})),
					],
				};
			}
		}
	}
	return null;
}

function turbotFishHint(pattern: TurbotFishPattern): HintStep {
	const houses = [
		...pattern.strongLinks.map((link) => link.house),
		pattern.bridgeHouse,
	].filter(
		(house, index, all) =>
			all.findIndex(
				(candidate) =>
					candidate.type === house.type && candidate.index === house.index,
			) === index,
	);
	const [firstLink, secondLink] = pattern.strongLinks;
	const [firstBridge, secondBridge] = pattern.bridgeCells;
	const [firstEnd, secondEnd] = pattern.ends;
	const firstHouse = houseName(firstLink.house);
	const secondHouse = houseName(secondLink.house);
	const bridge = houseName(pattern.bridgeHouse);
	const summary =
		pattern.technique === "Skyscraper"
			? `${firstHouse} and ${secondHouse} each have exactly two places for ${pattern.value}, joined through ${bridge}.`
			: `A row and a column each have exactly two places for ${pattern.value}, with one end of each link meeting in ${bridge}.`;
	const details =
		pattern.technique === "Skyscraper"
			? [
					`The highlighted candidates form two strong links: ${pattern.value} must appear at one end of each link.`,
					`${cellName(firstBridge)} and ${cellName(secondBridge)} see each other in ${bridge}, so they cannot both be ${pattern.value}. At least one outer end, ${cellName(firstEnd)} or ${cellName(secondEnd)}, must therefore be ${pattern.value}; remove it from cells that see both outer ends.`,
				]
			: [
					`The highlighted candidates form one strong link in ${firstHouse} and one in ${secondHouse}.`,
					`${cellName(firstBridge)} and ${cellName(secondBridge)} see each other in ${bridge}, so they cannot both be ${pattern.value}. At least one outer end, ${cellName(firstEnd)} or ${cellName(secondEnd)}, must therefore be ${pattern.value}; remove it from cells that see both outer ends.`,
				];

	return {
		technique: pattern.technique,
		kind: "elimination",
		title: `${pattern.technique} on ${pattern.value}`,
		summary,
		details,
		pattern: pattern.chain.map((cell, index) => ({
			...cell,
			value: pattern.value,
			group: index % 2 === 0 ? "a" : "b",
		})),
		eliminations: pattern.eliminations.map((cell) => ({
			...cell,
			value: pattern.value,
		})),
		houses,
	};
}

function findSkyscraperHint(candidates: CandidateGrid): HintStep | null {
	const pattern = findSkyscraperPattern(candidates);
	return pattern ? turbotFishHint(pattern) : null;
}

function findTwoStringKiteHint(candidates: CandidateGrid): HintStep | null {
	const pattern = findTwoStringKitePattern(candidates);
	return pattern ? turbotFishHint(pattern) : null;
}

type BivalueCell = CellRef & { values: [number, number] };

function getBivalueCells(candidates: CandidateGrid): BivalueCell[] {
	const cells: BivalueCell[] = [];
	for (let row = 0; row < 9; row++) {
		for (let col = 0; col < 9; col++) {
			const values = [...(candidates[row]?.[col] ?? [])];
			if (values.length !== 2) continue;
			const first = values[0];
			const second = values[1];
			if (first !== undefined && second !== undefined) {
				cells.push({ row, col, values: [first, second] });
			}
		}
	}
	return cells;
}

function findYWing(candidates: CandidateGrid): HintStep | null {
	const bivalue = getBivalueCells(candidates);
	for (const pivot of bivalue) {
		for (let firstIndex = 0; firstIndex < bivalue.length; firstIndex++) {
			const first = bivalue[firstIndex];
			if (!first || first === pivot || !arePeers(pivot, first)) continue;
			const sharedWithFirst = pivot.values.filter((value) =>
				first.values.includes(value),
			);
			if (sharedWithFirst.length !== 1) continue;
			const firstLink = sharedWithFirst[0];
			const outer = first.values.find((value) => value !== firstLink);
			if (firstLink === undefined || outer === undefined) continue;

			for (
				let secondIndex = firstIndex + 1;
				secondIndex < bivalue.length;
				secondIndex++
			) {
				const second = bivalue[secondIndex];
				if (!second || second === pivot || !arePeers(pivot, second)) continue;
				const sharedWithSecond = pivot.values.filter((value) =>
					second.values.includes(value),
				);
				if (
					sharedWithSecond.length !== 1 ||
					sharedWithSecond[0] === firstLink ||
					!second.values.includes(outer)
				)
					continue;

				const excluded = new Set([
					cellKey(pivot),
					cellKey(first),
					cellKey(second),
				]);
				const eliminations: CandidateRef[] = [];
				for (let row = 0; row < 9; row++) {
					for (let col = 0; col < 9; col++) {
						const cell = { row, col };
						if (
							excluded.has(cellKey(cell)) ||
							!arePeers(cell, first) ||
							!arePeers(cell, second) ||
							!candidatesAt(candidates, cell).has(outer)
						)
							continue;
						eliminations.push({ ...cell, value: outer });
					}
				}
				if (eliminations.length === 0) continue;
				return {
					technique: "Y-Wing",
					kind: "elimination",
					title: `Y-Wing removes ${outer}`,
					summary: `${cellName(pivot)} is the pivot; ${cellName(first)} and ${cellName(second)} are its pincers.`,
					details: [
						`Whichever candidate is true in ${cellName(pivot)}, one pincer must contain ${outer}.`,
						`Any cell that sees both pincers therefore cannot contain ${outer}.`,
					],
					pattern: [pivot, first, second].flatMap((cell, index) =>
						cell.values.map((value) => ({
							row: cell.row,
							col: cell.col,
							value,
							group: index === 0 ? "a" : "b",
						})),
					),
					eliminations,
				};
			}
		}
	}
	return null;
}

function findXYZWing(candidates: CandidateGrid): HintStep | null {
	const bivalue = getBivalueCells(candidates);
	const trivalue: Array<CellRef & { values: number[] }> = [];
	for (let row = 0; row < 9; row++) {
		for (let col = 0; col < 9; col++) {
			const values = [...(candidates[row]?.[col] ?? [])];
			if (values.length === 3) trivalue.push({ row, col, values });
		}
	}

	for (const pivot of trivalue) {
		const pivotValues = new Set(pivot.values);
		const wings = bivalue.filter(
			(cell) =>
				arePeers(pivot, cell) &&
				cell.values.every((value) => pivotValues.has(value)),
		);
		for (const [first, second] of combinations(wings, 2)) {
			if (!first || !second) continue;
			const common = first.values.filter((value) =>
				second.values.includes(value),
			);
			const union = new Set([...first.values, ...second.values]);
			if (common.length !== 1 || union.size !== 3) continue;
			const value = common[0];
			if (value === undefined) continue;
			const excluded = new Set([
				cellKey(pivot),
				cellKey(first),
				cellKey(second),
			]);
			const eliminations: CandidateRef[] = [];
			for (let row = 0; row < 9; row++) {
				for (let col = 0; col < 9; col++) {
					const cell = { row, col };
					if (
						excluded.has(cellKey(cell)) ||
						!arePeers(cell, pivot) ||
						!arePeers(cell, first) ||
						!arePeers(cell, second) ||
						!candidatesAt(candidates, cell).has(value)
					)
						continue;
					eliminations.push({ ...cell, value });
				}
			}
			if (eliminations.length === 0) continue;
			return {
				technique: "XYZ-Wing",
				kind: "elimination",
				title: `XYZ-Wing removes ${value}`,
				summary: `${cellName(pivot)} is linked to the two highlighted wings.`,
				details: [
					`The pivot contains three candidates, while each wing contains two of them.`,
					`Candidate ${value} must occur in the pivot or a wing, so cells seeing all three cannot contain it.`,
				],
				pattern: [pivot, first, second].flatMap((cell, index) =>
					cell.values.map((candidate) => ({
						row: cell.row,
						col: cell.col,
						value: candidate,
						group: index === 0 ? "a" : "b",
					})),
				),
				eliminations,
			};
		}
	}
	return null;
}

function findUniqueRectangle(candidates: CandidateGrid): HintStep | null {
	for (let firstRow = 0; firstRow < 8; firstRow++) {
		for (let secondRow = firstRow + 1; secondRow < 9; secondRow++) {
			for (let firstCol = 0; firstCol < 8; firstCol++) {
				for (let secondCol = firstCol + 1; secondCol < 9; secondCol++) {
					const cells = [
						{ row: firstRow, col: firstCol },
						{ row: firstRow, col: secondCol },
						{ row: secondRow, col: firstCol },
						{ row: secondRow, col: secondCol },
					];
					const boxes = new Set(
						cells.map(
							(cell) => Math.floor(cell.row / 3) * 3 + Math.floor(cell.col / 3),
						),
					);
					if (boxes.size !== 2) continue;
					const candidateSets = cells.map((cell) =>
						candidatesAt(candidates, cell),
					);
					if (candidateSets.some((set) => set.size < 2)) continue;
					for (const [firstValue, secondValue] of combinations(
						[...DIGITS],
						2,
					)) {
						if (firstValue === undefined || secondValue === undefined) continue;
						const exactPair = candidateSets.map(
							(set) =>
								set.size === 2 && set.has(firstValue) && set.has(secondValue),
						);
						if (exactPair.filter(Boolean).length !== 3) continue;
						const roofIndex = exactPair.findIndex((exact) => !exact);
						const roof = cells[roofIndex];
						const roofCandidates = candidateSets[roofIndex];
						if (
							!roof ||
							!roofCandidates?.has(firstValue) ||
							!roofCandidates.has(secondValue)
						)
							continue;
						const eliminations = [
							{ ...roof, value: firstValue },
							{ ...roof, value: secondValue },
						];
						return {
							technique: "Unique Rectangle Type 1",
							kind: "elimination",
							title: `Unique Rectangle on ${firstValue}/${secondValue}`,
							summary: `Three corners contain only ${firstValue}/${secondValue}; ${cellName(roof)} is the roof.`,
							details: [
								`Leaving ${firstValue} or ${secondValue} in the roof could create a deadly two-solution rectangle.`,
								`Remove both candidates from ${cellName(roof)} to preserve the puzzle's unique solution.`,
							],
							pattern: cells.flatMap((cell) => [
								{ ...cell, value: firstValue },
								{ ...cell, value: secondValue },
							]),
							eliminations,
						};
					}
				}
			}
		}
	}
	return null;
}

function findSimpleColoring(candidates: CandidateGrid): HintStep | null {
	for (const value of DIGITS) {
		const nodes: CellRef[] = [];
		for (let row = 0; row < 9; row++) {
			for (let col = 0; col < 9; col++) {
				if (candidates[row]?.[col]?.has(value)) nodes.push({ row, col });
			}
		}
		const nodeIndices = new Map(
			nodes.map((node, index) => [cellKey(node), index]),
		);
		const adjacency = new Map<number, Set<number>>();
		for (const house of HOUSES) {
			const linked = house.cells.filter((cell) =>
				candidatesAt(candidates, cell).has(value),
			);
			if (linked.length !== 2) continue;
			const first = nodeIndices.get(cellKey(linked[0] as CellRef));
			const second = nodeIndices.get(cellKey(linked[1] as CellRef));
			if (first === undefined || second === undefined) continue;
			if (!adjacency.has(first)) adjacency.set(first, new Set());
			if (!adjacency.has(second)) adjacency.set(second, new Set());
			adjacency.get(first)?.add(second);
			adjacency.get(second)?.add(first);
		}

		const globallyVisited = new Set<number>();
		for (const start of adjacency.keys()) {
			if (globallyVisited.has(start)) continue;
			const colors = new Map<number, 0 | 1>([[start, 0]]);
			const component: number[] = [];
			const queue = [start];
			while (queue.length > 0) {
				const current = queue.shift();
				if (current === undefined) break;
				globallyVisited.add(current);
				component.push(current);
				const color = colors.get(current) ?? 0;
				for (const next of adjacency.get(current) ?? []) {
					if (!colors.has(next)) {
						colors.set(next, color === 0 ? 1 : 0);
						queue.push(next);
					}
				}
			}
			if (component.length < 2) continue;
			const pattern: HintCandidate[] = component.flatMap((index) => {
				const node = nodes[index];
				if (!node) return [];
				return [{ ...node, value, group: colors.get(index) === 0 ? "a" : "b" }];
			});

			for (const color of [0, 1] as const) {
				const sameColor = component.filter(
					(index) => colors.get(index) === color,
				);
				const contradiction = combinations(sameColor, 2).some(
					([first, second]) => {
						const firstNode = first === undefined ? undefined : nodes[first];
						const secondNode = second === undefined ? undefined : nodes[second];
						return (
							!!firstNode && !!secondNode && arePeers(firstNode, secondNode)
						);
					},
				);
				if (!contradiction) continue;
				const eliminations = sameColor.flatMap((index) => {
					const node = nodes[index];
					return node ? [{ ...node, value }] : [];
				});
				return {
					technique: "Simple Colouring",
					kind: "elimination",
					title: `Simple Colouring contradiction on ${value}`,
					summary:
						"Two candidates with the same colour see each other, so that colour must be false.",
					details: [
						`Strong links alternate between the two displayed colours.`,
						`The conflicting colour would place ${value} twice in one house, so remove every candidate of that colour in the chain.`,
					],
					pattern,
					eliminations,
				};
			}

			const componentSet = new Set(component);
			for (let index = 0; index < nodes.length; index++) {
				if (componentSet.has(index)) continue;
				const node = nodes[index];
				if (!node) continue;
				const seesA = component.some(
					(chainIndex) =>
						colors.get(chainIndex) === 0 &&
						!!nodes[chainIndex] &&
						arePeers(node, nodes[chainIndex] as CellRef),
				);
				const seesB = component.some(
					(chainIndex) =>
						colors.get(chainIndex) === 1 &&
						!!nodes[chainIndex] &&
						arePeers(node, nodes[chainIndex] as CellRef),
				);
				if (!seesA || !seesB) continue;
				return {
					technique: "Simple Colouring",
					kind: "elimination",
					title: `Two-colour trap on ${value}`,
					summary: `${cellName(node)} sees both colours in the strong-link chain.`,
					details: [
						`Exactly one colour in the chain must be true.`,
						`${cellName(node)} sees a ${value} of each colour, so it cannot contain ${value}.`,
					],
					pattern,
					eliminations: [{ ...node, value }],
				};
			}
		}
	}
	return null;
}

function findXYChain(candidates: CandidateGrid): HintStep | null {
	const cells = getBivalueCells(candidates);
	for (const start of cells) {
		for (const targetValue of start.values) {
			const outgoing = start.values.find((value) => value !== targetValue);
			if (outgoing === undefined) continue;
			const visited = new Set([cellKey(start)]);

			const search = (
				current: BivalueCell,
				needed: number,
				path: BivalueCell[],
			): { chain: BivalueCell[]; eliminations: CandidateRef[] } | null => {
				if (path.length >= 10) return null;
				for (const next of cells) {
					if (
						visited.has(cellKey(next)) ||
						!arePeers(current, next) ||
						!next.values.includes(needed)
					)
						continue;
					const other = next.values.find((value) => value !== needed);
					if (other === undefined) continue;
					const nextPath = [...path, next];
					if (other === targetValue && nextPath.length >= 3) {
						const chainCells = new Set(nextPath.map(cellKey));
						const eliminations: CandidateRef[] = [];
						for (let row = 0; row < 9; row++) {
							for (let col = 0; col < 9; col++) {
								const cell = { row, col };
								if (
									chainCells.has(cellKey(cell)) ||
									!arePeers(cell, start) ||
									!arePeers(cell, next) ||
									!candidatesAt(candidates, cell).has(targetValue)
								)
									continue;
								eliminations.push({ ...cell, value: targetValue });
							}
						}
						if (eliminations.length > 0)
							return { chain: nextPath, eliminations };
					}
					visited.add(cellKey(next));
					const result = search(next, other, nextPath);
					visited.delete(cellKey(next));
					if (result) return result;
				}
				return null;
			};

			const result = search(start, outgoing, [start]);
			if (!result) continue;
			return {
				technique: "XY-Chain",
				kind: "elimination",
				title: `XY-Chain removes ${targetValue}`,
				summary: `A chain of ${result.chain.length} bivalue cells links two endpoints containing ${targetValue}.`,
				details: [
					`Follow the alternating candidates through ${result.chain.map(cellName).join(" → ")}.`,
					`Whichever value starts the chain, one endpoint must contain ${targetValue}; cells seeing both endpoints cannot contain it.`,
				],
				pattern: result.chain.flatMap((cell, index) =>
					cell.values.map((value) => ({
						row: cell.row,
						col: cell.col,
						value,
						group: index % 2 === 0 ? "a" : "b",
					})),
				),
				eliminations: result.eliminations,
			};
		}
	}
	return null;
}

function findBUGPlusOne(candidates: CandidateGrid): HintStep | null {
	const unsolved: CellRef[] = [];
	let triValue: CellRef | null = null;
	for (let row = 0; row < 9; row++) {
		for (let col = 0; col < 9; col++) {
			const count = candidates[row]?.[col]?.size ?? 0;
			if (count === 0) continue;
			unsolved.push({ row, col });
			if (count === 3 && triValue === null) triValue = { row, col };
			else if (count !== 2) return null;
		}
	}
	if (!triValue || unsolved.length === 0) return null;
	const values = [...candidatesAt(candidates, triValue)];
	for (const value of values) {
		const validPattern = HOUSES.every((house) => {
			const containsTriValue = house.cells.some(
				(cell) => cell.row === triValue?.row && cell.col === triValue?.col,
			);
			return DIGITS.every((candidate) => {
				const count = house.cells.filter((cell) =>
					candidatesAt(candidates, cell).has(candidate),
				).length;
				if (count === 0) return true;
				if (containsTriValue && candidate === value) return count === 3;
				return count === 2;
			});
		});
		if (!validPattern) continue;
		const placement = { ...triValue, value };
		return {
			technique: "BUG+1",
			kind: "placement",
			title: `BUG+1 resolves ${cellName(triValue)}`,
			summary:
				"Every unsolved cell is bivalue except one cell with three candidates.",
			details: [
				`Without the extra ${value}, the grid would form a deadly Bivalue Universal Grave pattern.`,
				`The extra candidate must be true, so place ${value} in ${cellName(triValue)}.`,
			],
			pattern: unsolved.flatMap((cell) =>
				[...candidatesAt(candidates, cell)].map((candidate) => ({
					...cell,
					value: candidate,
				})),
			),
			eliminations: [],
			placement,
			cells: [{ ...triValue, role: "focus" }],
		};
	}
	return null;
}

function findAIC(candidates: CandidateGrid): HintStep | null {
	const result = findAlternatingInferenceChain(candidates);
	if (!result || result.eliminations.length === 0) return null;

	const first = result.chain[0];
	const last = result.chain.at(-1);
	if (!first || !last) return null;

	const candidateLabel = (candidate: CandidateRef) =>
		`${candidate.value} in ${cellName(candidate)}`;
	const compactCandidateLabel = (candidate: CandidateRef) =>
		`${cellName(candidate)}(${candidate.value})`;
	const eliminationText = result.eliminations
		.map((candidate) => `${candidate.value} from ${cellName(candidate)}`)
		.join(", ");
	const chainText = result.links.reduce(
		(text, link) =>
			`${text} ${link.strength === "strong" ? "=" : "–"} ${compactCandidateLabel(link.to)}`,
		compactCandidateLabel(first),
	);

	return {
		technique: "Alternating Inference Chain",
		kind: "elimination",
		title:
			result.eliminations.length === 1
				? `Remove ${eliminationText}`
				: `AIC removes ${result.eliminations.length} candidates`,
		summary: `A ${result.linkCount}-link chain proves that at least one of ${candidateLabel(first)} and ${candidateLabel(last)} must be true.`,
		details: [
			'In the chain, "=" marks a strong link (at least one is true) and "–" marks a weak link (both cannot be true).',
			`Chain: ${chainText}.`,
			`The marked candidate conflicts with both endpoints. Since at least one endpoint must be true, remove ${eliminationText}.`,
		],
		pattern: result.chain.map((candidate, index) => ({
			...candidate,
			group: index % 2 === 0 ? "a" : "b",
		})),
		eliminations: result.eliminations,
	};
}

function hasSolution(board: Board): boolean {
	const candidates = buildCandidates(board);
	let best: { row: number; col: number; values: number[] } | null = null;
	for (let row = 0; row < 9; row++) {
		for (let col = 0; col < 9; col++) {
			if (board[row]?.[col] !== null) continue;
			const values = [...(candidates[row]?.[col] ?? [])];
			if (values.length === 0) return false;
			if (!best || values.length < best.values.length)
				best = { row, col, values };
		}
	}
	if (!best) return true;
	for (const value of best.values) {
		const next = board.map((row) => [...row]);
		const targetRow = next[best.row];
		if (!targetRow) continue;
		targetRow[best.col] = value;
		if (hasSolution(next)) return true;
	}
	return false;
}

function findCellForcingChain(
	board: Board,
	candidates: CandidateGrid,
): HintStep | null {
	const cells: Array<CellRef & { values: number[] }> = [];
	for (let row = 0; row < 9; row++) {
		for (let col = 0; col < 9; col++) {
			const values = [...(candidates[row]?.[col] ?? [])];
			if (values.length > 1) cells.push({ row, col, values });
		}
	}
	cells.sort((a, b) => a.values.length - b.values.length);
	for (const cell of cells) {
		const viable: number[] = [];
		const impossible: number[] = [];
		for (const value of cell.values) {
			const assumed = board.map((row) => [...row]);
			const assumedRow = assumed[cell.row];
			if (!assumedRow) continue;
			assumedRow[cell.col] = value;
			if (hasSolution(assumed)) viable.push(value);
			else impossible.push(value);
		}
		if (impossible.length === 0) continue;
		const eliminations = impossible.map((value) => ({
			row: cell.row,
			col: cell.col,
			value,
		}));
		if (viable.length === 1) {
			const value = viable[0];
			if (value === undefined) continue;
			const placement = { row: cell.row, col: cell.col, value };
			return {
				technique: "Cell Forcing Chain",
				kind: "placement",
				title: `Forcing chain resolves ${cellName(cell)}`,
				summary: `Every candidate except ${value} leads to a contradiction.`,
				details: [
					`Test each candidate in ${cellName(cell)} and follow its consequences through the grid.`,
					`${impossible.join(", ")} cannot complete the puzzle, so ${value} must be true.`,
				],
				pattern: cell.values.map((candidate) => ({
					row: cell.row,
					col: cell.col,
					value: candidate,
				})),
				eliminations,
				placement,
				cells: [{ ...cell, role: "focus" }],
			};
		}
		return {
			technique: "Cell Forcing Chain",
			kind: "elimination",
			title: `Forcing chain in ${cellName(cell)}`,
			summary: `${impossible.join(", ")} lead to contradictions and can be removed.`,
			details: [
				`Assume each marked candidate in turn and follow the consequences.`,
				`The red candidates leave the puzzle without a valid completion, so eliminate them.`,
			],
			pattern: cell.values.map((value) => ({
				row: cell.row,
				col: cell.col,
				value,
			})),
			eliminations,
			cells: [{ ...cell, role: "focus" }],
		};
	}
	return null;
}

// These weights model cognitive load, not raw step count or puzzle difficulty.
// The bounded look-ahead below minimizes the cost of the complete explanation
// leading to a placement, with stable tie-breakers for deterministic hints.
const HUMAN_TECHNIQUE_COST: Partial<Record<HintTechnique, number>> = {
	"Naked Single": 0.5,
	"Hidden Single": 1,
	"Pointing Pairs": 2.2,
	"Line/Box Reduction": 2.4,
	"Naked Pair": 2.8,
	"Hidden Pair": 3.2,
	"Naked Triple": 4.6,
	"Hidden Triple": 5,
	"X-Wing": 5.2,
	Skyscraper: 5.5,
	"2-String Kite": 5.7,
	"Naked Quad": 6.2,
	"Hidden Quad": 6.8,
	"Y-Wing": 6.4,
	"Unique Rectangle Type 1": 6.6,
	"XYZ-Wing": 7.2,
	Swordfish: 7.6,
	"Simple Colouring": 8.2,
	"XY-Chain": 9,
	"BUG+1": 9.5,
	Jellyfish: 10.5,
	"Alternating Inference Chain": 14,
	"Cell Forcing Chain": 24,
};

const DIFFICULTY_TECHNIQUE_CEILING: Record<Difficulty, number> = {
	easy: 1,
	normal: 3.2,
	medium: 5.2,
	hard: 7.6,
	expert: 10.5,
	master: 24,
};

const MAX_HINT_SEARCH_DEPTH = 20;
const HINT_SEARCH_BEAM_WIDTH = 8;
const MAX_FORCING_FALLBACKS = 8;

const ELIMINATION_FINDERS: Array<
	(candidates: CandidateGrid) => HintStep | null
> = [
	findPointing,
	findClaiming,
	(candidates) => findNakedSubset(candidates, 2),
	(candidates) => findHiddenSubset(candidates, 2),
	(candidates) => findNakedSubset(candidates, 3),
	(candidates) => findHiddenSubset(candidates, 3),
	(candidates) => findNakedSubset(candidates, 4),
	(candidates) => findHiddenSubset(candidates, 4),
	(candidates) => findFish(candidates, 2),
	findSkyscraperHint,
	findTwoStringKiteHint,
	findYWing,
	(candidates) => findFish(candidates, 3),
	findXYZWing,
	findUniqueRectangle,
	findSimpleColoring,
	findXYChain,
	(candidates) => findFish(candidates, 4),
	findAIC,
];

function techniqueFamily(technique: HintTechnique) {
	if (technique.includes("Single") || technique === "BUG+1") return "placement";
	if (technique === "Pointing Pairs" || technique === "Line/Box Reduction")
		return "locked";
	if (
		technique.includes("Pair") ||
		technique.includes("Triple") ||
		technique.includes("Quad")
	)
		return "subset";
	if (
		technique === "X-Wing" ||
		technique === "Skyscraper" ||
		technique === "2-String Kite" ||
		technique === "Swordfish" ||
		technique === "Jellyfish"
	)
		return "fish";
	if (technique.includes("Wing")) return "wing";
	if (technique.includes("Chain") || technique === "Simple Colouring")
		return "chain";
	if (technique.includes("Rectangle")) return "uniqueness";
	return technique;
}

function referencedCells(step: HintStep) {
	return new Set(
		[
			...step.pattern,
			...step.eliminations,
			...(step.placement ? [step.placement] : []),
		].map(cellKey),
	);
}

function humanTechniqueCost(technique: HintTechnique) {
	return HUMAN_TECHNIQUE_COST[technique] ?? 18;
}

function humanStepCost(step: HintStep, previous?: HintStep) {
	const base = humanTechniqueCost(step.technique);
	const patternCells = new Set(step.pattern.map(cellKey)).size;
	const visualLoad = Math.max(0, patternCells - 2) * 0.12;
	const houseLoad = Math.max(0, (step.houses?.length ?? 0) - 1) * 0.08;
	const eliminationLoad = Math.max(0, step.eliminations.length - 4) * 0.025;
	if (!previous) return base + visualLoad + houseLoad + eliminationLoad;

	const familySwitch =
		techniqueFamily(previous.technique) === techniqueFamily(step.technique)
			? 0
			: 0.35;
	const previousCells = referencedCells(previous);
	const sharesContext = [...referencedCells(step)].some((cell) =>
		previousCells.has(cell),
	);
	const continuityBonus = sharesContext ? 0.2 : 0;
	return (
		base +
		visualLoad +
		houseLoad +
		eliminationLoad +
		familySwitch -
		continuityBonus
	);
}

function cloneCandidates(candidates: CandidateGrid): CandidateGrid {
	return candidates.map((row) => row.map((cell) => new Set(cell)));
}

function candidateGridKey(candidates: CandidateGrid) {
	return candidates
		.flatMap((row) => row.map((cell) => [...cell].sort().join("")))
		.join("|");
}

function stepKey(step: HintStep) {
	return `${step.technique}:${step.eliminations
		.map(candidateKey)
		.sort()
		.join("|")}:${step.placement ? candidateKey(step.placement) : ""}`;
}

function compareSearchNodes(first: HintSearchNode, second: HintSearchNode) {
	return (
		first.cost - second.cost ||
		first.steps.length - second.steps.length ||
		first.pathKey.localeCompare(second.pathKey)
	);
}

function techniqueCeiling(profile?: HintTechniqueProfile) {
	if (!profile) return Number.POSITIVE_INFINITY;
	let difficultyLimit = profile.difficulty
		? DIFFICULTY_TECHNIQUE_CEILING[profile.difficulty]
		: Number.POSITIVE_INFINITY;
	const advertised = profile.techniques ?? [];
	if (advertised.length === 0) return difficultyLimit;

	// Older records can say that the previous grader needed Backtracking while
	// still carrying a pre-reranking difficulty such as Hard. Backtracking is not
	// a human hint ceiling, so let newly supported logical AICs replace that search
	// instead of preserving a stale "no next step" result.
	if (advertised.includes("Backtracking")) {
		difficultyLimit = Math.max(
			difficultyLimit,
			HUMAN_TECHNIQUE_COST["Alternating Inference Chain"] ?? difficultyLimit,
		);
	}

	const rankedCosts: number[] = [];
	let hasUnrankedTechnique = false;
	for (const technique of advertised) {
		if (technique === "Backtracking") {
			hasUnrankedTechnique = true;
			continue;
		}
		const cost = HUMAN_TECHNIQUE_COST[technique as HintTechnique];
		if (cost === undefined) hasUnrankedTechnique = true;
		else rankedCosts.push(cost);
	}
	const advertisedLimit = hasUnrankedTechnique
		? difficultyLimit
		: Math.max(HUMAN_TECHNIQUE_COST["Hidden Single"] ?? 1, ...rankedCosts);
	return Math.min(difficultyLimit, advertisedLimit);
}

function techniqueAllowed(technique: HintTechnique, ceiling: number) {
	return humanTechniqueCost(technique) <= ceiling;
}

function findPlacement(candidates: CandidateGrid, ceiling: number) {
	const single = findNakedSingle(candidates) ?? findHiddenSingle(candidates);
	if (single) return single;
	return techniqueAllowed("BUG+1", ceiling) ? findBUGPlusOne(candidates) : null;
}

function findEliminationAlternatives(
	candidates: CandidateGrid,
	ceiling: number,
) {
	const alternatives = ELIMINATION_FINDERS.flatMap((find) => {
		const step = find(candidates);
		return step && techniqueAllowed(step.technique, ceiling) ? [step] : [];
	});
	const unique = new Map<string, HintStep>();
	for (const step of alternatives) {
		const signature = step.eliminations.map(candidateKey).sort().join("|");
		const existing = unique.get(signature);
		if (!existing || humanStepCost(step) < humanStepCost(existing)) {
			unique.set(signature, step);
		}
	}
	return [...unique.values()].sort(
		(first, second) =>
			humanStepCost(first) - humanStepCost(second) ||
			stepKey(first).localeCompare(stepKey(second)),
	);
}

function applyEliminations(candidates: CandidateGrid, step: HintStep) {
	let changed = false;
	for (const elimination of step.eliminations) {
		const cell = candidates[elimination.row]?.[elimination.col];
		if (cell?.delete(elimination.value)) changed = true;
	}
	return changed;
}

function setsEqual(first: ReadonlySet<number>, second: ReadonlySet<number>) {
	if (first.size !== second.size) return false;
	return [...first].every((value) => second.has(value));
}

const NOTE_RECORDABLE_SUBSETS = new Set<HintTechnique>([
	"Naked Pair",
	"Hidden Pair",
	"Naked Triple",
	"Hidden Triple",
	"Naked Quad",
	"Hidden Quad",
]);

/**
 * The solver has already proved the subset from the board's legal candidates.
 * Notes are consulted only to decide whether the player has recorded that exact
 * pattern, never to establish that the pattern is valid.
 */
function hasRecordedSubsetPattern(step: HintStep, notes?: CellNotes) {
	if (!notes || !NOTE_RECORDABLE_SUBSETS.has(step.technique)) return false;

	const patternByCell = new Map<string, Set<number>>();
	for (const candidate of step.pattern) {
		const key = cellKey(candidate);
		const values = patternByCell.get(key) ?? new Set<number>();
		values.add(candidate.value);
		patternByCell.set(key, values);
	}
	if (patternByCell.size < 2) return false;

	return [...patternByCell.entries()].every(([key, expected]) => {
		const [rowText, colText] = key.split(",");
		const row = Number(rowText);
		const col = Number(colText);
		const recorded = notes[row]?.[col];
		return recorded !== undefined && setsEqual(recorded, expected);
	});
}

function hasRecordedEliminationResult(
	candidates: CandidateGrid,
	step: HintStep,
	notes?: CellNotes,
) {
	if (!notes) return false;
	const affectedCells = new Map<string, CellRef>();
	for (const elimination of step.eliminations) {
		affectedCells.set(cellKey(elimination), elimination);
	}
	return (
		affectedCells.size > 0 &&
		[...affectedCells.values()].every(({ row, col }) => {
			const recorded = notes[row]?.[col];
			const remaining = candidates[row]?.[col];
			return (
				recorded !== undefined &&
				recorded.size > 0 &&
				remaining !== undefined &&
				setsEqual(recorded, remaining)
			);
		})
	);
}

/**
 * Candidate notes are user input, so they never alter or prove a deduction. We
 * first derive each step from Sudoku constraints, then hide it only when either
 * an independently found subset pattern is recorded exactly in all pattern cells,
 * or every affected cell already records the exact post-elimination candidates.
 * Sparse, extra, or different notes leave the hint visible.
 */
function omitRecordedEliminations(
	initialCandidates: CandidateGrid,
	steps: HintStep[],
	notes?: CellNotes,
) {
	if (!notes) return { steps, recordedCount: 0 };

	const candidates = cloneCandidates(initialCandidates);
	const visibleSteps: HintStep[] = [];
	let recordedCount = 0;

	for (const step of steps) {
		if (step.kind !== "elimination" || step.eliminations.length === 0) {
			visibleSteps.push(step);
			continue;
		}

		const hasRecordedPattern = hasRecordedSubsetPattern(step, notes);
		const changed = applyEliminations(candidates, step);
		const isFullyRecorded =
			hasRecordedPattern ||
			hasRecordedEliminationResult(candidates, step, notes);

		if (changed && isFullyRecorded) recordedCount++;
		else visibleSteps.push(step);
	}

	return { steps: visibleSteps, recordedCount };
}

function hasEmptyUnsolvedCell(board: Board, candidates: CandidateGrid) {
	for (let row = 0; row < 9; row++) {
		for (let col = 0; col < 9; col++) {
			if (
				board[row]?.[col] === null &&
				(candidates[row]?.[col]?.size ?? 0) === 0
			)
				return true;
		}
	}
	return false;
}

function findHumanHintPath(
	board: Board,
	initialCandidates: CandidateGrid,
	profile?: HintTechniqueProfile,
) {
	const ceiling = techniqueCeiling(profile);
	const start: HintSearchNode = {
		candidates: cloneCandidates(initialCandidates),
		steps: [],
		cost: 0,
		pathKey: "",
	};
	let frontier = [start];
	const bestCostByState = new Map([[candidateGridKey(start.candidates), 0]]);
	const forcingFallbacks: HintSearchNode[] = [];
	let bestSolution: HintSearchNode | null = null;

	const initialPlacement = findPlacement(start.candidates, ceiling);
	if (initialPlacement) return [initialPlacement];

	for (let depth = 0; depth < MAX_HINT_SEARCH_DEPTH; depth++) {
		const nextByState = new Map<string, HintSearchNode>();
		for (const node of frontier) {
			if (bestSolution && node.cost >= bestSolution.cost) continue;
			const alternatives = findEliminationAlternatives(
				node.candidates,
				ceiling,
			);
			if (alternatives.length === 0) forcingFallbacks.push(node);
			for (const step of alternatives) {
				const nextCandidates = cloneCandidates(node.candidates);
				if (!applyEliminations(nextCandidates, step)) continue;
				if (hasEmptyUnsolvedCell(board, nextCandidates)) continue;
				const cost = node.cost + humanStepCost(step, node.steps.at(-1));
				const steps = [...node.steps, step];
				const pathKey = `${node.pathKey}>${stepKey(step)}`;
				const placement = findPlacement(nextCandidates, ceiling);
				if (placement) {
					const solution: HintSearchNode = {
						candidates: nextCandidates,
						steps: [...steps, placement],
						cost: cost + humanStepCost(placement, step),
						pathKey: `${pathKey}>${stepKey(placement)}`,
					};
					if (!bestSolution || compareSearchNodes(solution, bestSolution) < 0) {
						bestSolution = solution;
					}
					continue;
				}

				const stateKey = candidateGridKey(nextCandidates);
				const knownCost = bestCostByState.get(stateKey);
				if (knownCost !== undefined && knownCost <= cost) continue;
				bestCostByState.set(stateKey, cost);
				const candidate = {
					candidates: nextCandidates,
					steps,
					cost,
					pathKey,
				};
				const existing = nextByState.get(stateKey);
				if (!existing || compareSearchNodes(candidate, existing) < 0) {
					nextByState.set(stateKey, candidate);
				}
			}
		}

		frontier = [...nextByState.values()]
			.filter((node) => !bestSolution || node.cost < bestSolution.cost)
			.sort(compareSearchNodes)
			.slice(0, HINT_SEARCH_BEAM_WIDTH);
		if (frontier.length === 0) break;
	}

	if (bestSolution) return bestSolution.steps;

	if (!techniqueAllowed("Cell Forcing Chain", ceiling)) {
		return forcingFallbacks.sort(compareSearchNodes)[0]?.steps ?? [];
	}

	const fallbackPool = [...forcingFallbacks, ...frontier]
		.sort(compareSearchNodes)
		.slice(0, MAX_FORCING_FALLBACKS);
	let bestForcing: HintSearchNode | null = null;
	for (const node of fallbackPool) {
		const forcing = findCellForcingChain(board, node.candidates);
		if (!forcing) continue;
		const candidate: HintSearchNode = {
			...node,
			steps: [...node.steps, forcing],
			cost: node.cost + humanStepCost(forcing, node.steps.at(-1)),
			pathKey: `${node.pathKey}>${stepKey(forcing)}`,
		};
		if (!bestForcing || compareSearchNodes(candidate, bestForcing) < 0) {
			bestForcing = candidate;
		}
	}
	if (bestForcing) return bestForcing.steps;

	return forcingFallbacks.sort(compareSearchNodes)[0]?.steps ?? [];
}

function findWrongEntry(
	current: Board,
	initial: Board,
	solution?: Board,
): HintStep | null {
	if (!solution) return null;
	for (let row = 0; row < 9; row++) {
		for (let col = 0; col < 9; col++) {
			if (initial[row]?.[col] !== null) continue;
			const value = current[row]?.[col];
			const expected = solution[row]?.[col];
			if (value === null || value === expected) continue;
			return {
				technique: "Check for mistakes",
				kind: "correction",
				title: `Recheck ${cellName({ row, col })}`,
				summary: `${value} conflicts with the puzzle's valid solution path.`,
				details: [
					`Remove ${value} from ${cellName({ row, col })} before requesting a logical hint.`,
					"The correct value is deliberately not revealed.",
				],
				pattern: [],
				eliminations: [],
				cells: [{ row, col, role: "warning" }],
			};
		}
	}
	return null;
}

/**
 * Builds a human-readable path to the next placement without changing the board.
 * The solution is used only to flag an incorrect player entry; all deductions are
 * derived from Sudoku constraints and candidate logic. When supplied, the profile
 * prevents hints from exceeding the puzzle's advertised logical technique level.
 * Legacy Backtracking metadata can be replaced by a newly supported AIC, and the
 * interactive caller can also opt into a continuation after the player's notes
 * already record every level-appropriate deduction.
 */
export function findExplainableHint(
	current: Board,
	initial: Board,
	solution?: Board,
	profile?: HintTechniqueProfile,
): ExplainableHint {
	const wrongEntry = findWrongEntry(current, initial, solution);
	if (wrongEntry) {
		return {
			status: "invalid",
			message: "Fix the marked entry before continuing.",
			steps: [wrongEntry],
		};
	}

	if (current.every((row) => row.every((value) => value !== null))) {
		return {
			status: "complete",
			message: "The puzzle is already complete.",
			steps: [],
		};
	}

	const candidates = buildCandidates(current);
	for (let row = 0; row < 9; row++) {
		for (let col = 0; col < 9; col++) {
			if (
				current[row]?.[col] !== null ||
				(candidates[row]?.[col]?.size ?? 0) > 0
			)
				continue;
			const cell = { row, col };
			return {
				status: "invalid",
				message: `${cellName(cell)} has no valid candidates.`,
				steps: [
					{
						technique: "Check for mistakes",
						kind: "correction",
						title: `No candidates remain in ${cellName(cell)}`,
						summary: "At least one existing entry creates a contradiction.",
						details: [
							"Review the values that share this row, column, and box.",
						],
						pattern: [],
						eliminations: [],
						cells: [{ ...cell, role: "warning" }],
					},
				],
			};
		}
	}

	const levelPath = findHumanHintPath(current, candidates, profile);
	const recordedLevelPath = omitRecordedEliminations(
		candidates,
		levelPath,
		profile?.notes,
	);
	let steps = recordedLevelPath.steps;
	let usedBeyondProfileFallback = false;
	if (
		profile?.allowBeyondProfileAfterRecordedNotes &&
		levelPath.length > 0 &&
		steps.length === 0 &&
		recordedLevelPath.recordedCount === levelPath.length
	) {
		const unrestrictedPath = findHumanHintPath(current, candidates);
		const recordedUnrestrictedPath = omitRecordedEliminations(
			candidates,
			unrestrictedPath,
			profile.notes,
		);
		if (recordedUnrestrictedPath.steps.length > 0) {
			steps = recordedUnrestrictedPath.steps;
			usedBeyondProfileFallback = true;
		}
	}
	if (steps.at(-1)?.placement) {
		return {
			status: "hint",
			message: usedBeyondProfileFallback
				? "Your notes already cover the level-appropriate eliminations. A further logical technique finds the next value."
				: steps.length === 1
					? "One logical step finds the next value."
					: `${steps.length} human-readable steps lead to the next value.`,
			steps,
		};
	}

	if (steps.length > 0) {
		return {
			status: "hint",
			message: usedBeyondProfileFallback
				? "Your notes already cover the level-appropriate eliminations. This further deduction advances the puzzle."
				: profile
					? "These level-appropriate eliminations advance the puzzle, but do not yet force a value."
					: "These eliminations advance the puzzle, but do not yet force a value.",
			steps,
		};
	}

	return {
		status: "stuck",
		message: profile
			? "No logical deduction was found within this puzzle's technique level."
			: "No supported logical deduction was found from the current position.",
		steps: [],
	};
}
