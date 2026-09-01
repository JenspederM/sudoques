export type TurbotFishTechnique = "Skyscraper" | "2-String Kite";

export type TurbotCell = {
	row: number;
	col: number;
};

export type TurbotHouse = {
	type: "row" | "column" | "box";
	index: number;
};

export type TurbotStrongLink = {
	house: TurbotHouse & { type: "row" | "column" };
	cells: [TurbotCell, TurbotCell];
};

export type TurbotFishPattern = {
	technique: TurbotFishTechnique;
	value: number;
	strongLinks: [TurbotStrongLink, TurbotStrongLink];
	bridgeHouse: TurbotHouse;
	bridgeCells: [TurbotCell, TurbotCell];
	/** Alternating end -> bridge -> bridge -> end order used for hint colours. */
	chain: [TurbotCell, TurbotCell, TurbotCell, TurbotCell];
	ends: [TurbotCell, TurbotCell];
	eliminations: TurbotCell[];
};

type CandidateGrid = ReadonlyArray<ReadonlyArray<ReadonlySet<number>>>;
type LineType = "row" | "column";

const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

function cellKey({ row, col }: TurbotCell) {
	return `${row},${col}`;
}

function sameCell(first: TurbotCell, second: TurbotCell) {
	return first.row === second.row && first.col === second.col;
}

function boxIndex({ row, col }: TurbotCell) {
	return Math.floor(row / 3) * 3 + Math.floor(col / 3);
}

function arePeers(first: TurbotCell, second: TurbotCell) {
	return (
		first.row === second.row ||
		first.col === second.col ||
		boxIndex(first) === boxIndex(second)
	);
}

function hasCandidate(
	candidates: CandidateGrid,
	cell: TurbotCell,
	value: number,
) {
	return candidates[cell.row]?.[cell.col]?.has(value) ?? false;
}

function cellsInLine(
	candidates: CandidateGrid,
	type: LineType,
	index: number,
	value: number,
) {
	const cells: TurbotCell[] = [];
	for (let offset = 0; offset < 9; offset++) {
		const cell =
			type === "row"
				? { row: index, col: offset }
				: { row: offset, col: index };
		if (hasCandidate(candidates, cell, value)) cells.push(cell);
	}
	return cells;
}

function strongLinks(candidates: CandidateGrid, type: LineType, value: number) {
	const links: TurbotStrongLink[] = [];
	for (let index = 0; index < 9; index++) {
		const cells = cellsInLine(candidates, type, index, value);
		if (cells.length !== 2) continue;
		const first = cells[0];
		const second = cells[1];
		if (!first || !second) continue;
		links.push({
			house: { type, index },
			cells: [first, second],
		});
	}
	return links;
}

function commonPeerEliminations(
	candidates: CandidateGrid,
	value: number,
	ends: [TurbotCell, TurbotCell],
	patternCells: readonly TurbotCell[],
) {
	const patternKeys = new Set(patternCells.map(cellKey));
	const eliminations: TurbotCell[] = [];
	for (let row = 0; row < 9; row++) {
		for (let col = 0; col < 9; col++) {
			const cell = { row, col };
			if (
				!patternKeys.has(cellKey(cell)) &&
				hasCandidate(candidates, cell, value) &&
				arePeers(cell, ends[0]) &&
				arePeers(cell, ends[1])
			) {
				eliminations.push(cell);
			}
		}
	}
	return eliminations;
}

function otherCell(link: TurbotStrongLink, cell: TurbotCell) {
	return sameCell(link.cells[0], cell) ? link.cells[1] : link.cells[0];
}

/**
 * Finds two parallel strong links that share one base line. Since both base
 * candidates cannot be true, at least one of the two outer ends must be true.
 */
export function findSkyscraper(
	candidates: CandidateGrid,
): TurbotFishPattern | null {
	for (const value of DIGITS) {
		for (const type of ["row", "column"] as const) {
			const links = strongLinks(candidates, type, value);
			for (let firstIndex = 0; firstIndex < links.length; firstIndex++) {
				const first = links[firstIndex];
				if (!first) continue;
				for (
					let secondIndex = firstIndex + 1;
					secondIndex < links.length;
					secondIndex++
				) {
					const second = links[secondIndex];
					if (!second) continue;
					const crossCoordinate = (cell: TurbotCell) =>
						type === "row" ? cell.col : cell.row;
					const sharedCoordinates = first.cells
						.map(crossCoordinate)
						.filter((coordinate) =>
							second.cells.some((cell) => crossCoordinate(cell) === coordinate),
						);
					if (sharedCoordinates.length !== 1) continue;

					const shared = sharedCoordinates[0];
					if (shared === undefined) continue;
					const firstBridge = first.cells.find(
						(cell) => crossCoordinate(cell) === shared,
					);
					const secondBridge = second.cells.find(
						(cell) => crossCoordinate(cell) === shared,
					);
					if (!firstBridge || !secondBridge) continue;
					const firstEnd = otherCell(first, firstBridge);
					const secondEnd = otherCell(second, secondBridge);
					const chain: TurbotFishPattern["chain"] = [
						firstEnd,
						firstBridge,
						secondBridge,
						secondEnd,
					];
					const ends: TurbotFishPattern["ends"] = [firstEnd, secondEnd];
					const eliminations = commonPeerEliminations(
						candidates,
						value,
						ends,
						chain,
					);
					if (eliminations.length === 0) continue;

					return {
						technique: "Skyscraper",
						value,
						strongLinks: [first, second],
						bridgeHouse: {
							type: type === "row" ? "column" : "row",
							index: shared,
						},
						bridgeCells: [firstBridge, secondBridge],
						chain,
						ends,
						eliminations,
					};
				}
			}
		}
	}
	return null;
}

/**
 * Finds orthogonal row/column strong links whose inner ends meet only through
 * one box. At least one of the two outer ends must contain the candidate.
 */
export function findTwoStringKite(
	candidates: CandidateGrid,
): TurbotFishPattern | null {
	for (const value of DIGITS) {
		const rowLinks = strongLinks(candidates, "row", value);
		const columnLinks = strongLinks(candidates, "column", value);
		for (const rowLink of rowLinks) {
			for (const columnLink of columnLinks) {
				for (const rowBridge of rowLink.cells) {
					for (const columnBridge of columnLink.cells) {
						if (
							sameCell(rowBridge, columnBridge) ||
							rowBridge.row === columnBridge.row ||
							rowBridge.col === columnBridge.col ||
							boxIndex(rowBridge) !== boxIndex(columnBridge)
						) {
							continue;
						}

						const rowEnd = otherCell(rowLink, rowBridge);
						const columnEnd = otherCell(columnLink, columnBridge);
						if (
							boxIndex(rowEnd) === boxIndex(rowBridge) ||
							boxIndex(columnEnd) === boxIndex(columnBridge) ||
							arePeers(rowEnd, columnEnd)
						) {
							continue;
						}

						const chain: TurbotFishPattern["chain"] = [
							rowEnd,
							rowBridge,
							columnBridge,
							columnEnd,
						];
						const ends: TurbotFishPattern["ends"] = [rowEnd, columnEnd];
						const eliminations = commonPeerEliminations(
							candidates,
							value,
							ends,
							chain,
						);
						if (eliminations.length === 0) continue;

						return {
							technique: "2-String Kite",
							value,
							strongLinks: [rowLink, columnLink],
							bridgeHouse: {
								type: "box",
								index: boxIndex(rowBridge),
							},
							bridgeCells: [rowBridge, columnBridge],
							chain,
							ends,
							eliminations,
						};
					}
				}
			}
		}
	}
	return null;
}
