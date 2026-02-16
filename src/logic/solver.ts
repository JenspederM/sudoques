import type { Board } from "../types";

export type Technique =
	| "Naked Single"
	| "Hidden Single"
	| "Naked Pair"
	| "Naked Triple"
	| "Hidden Pair"
	| "Hidden Triple"
	| "Naked Quad"
	| "Hidden Quad"
	| "Pointing Pairs"
	| "Line/Box Reduction"
	| "Gurth's Theorem"
	| "BUG+1"
	| "X-Wing"
	| "Unique Rectangle Type 1"
	| "Chute Remote Pair"
	| "Simple Colouring"
	| "Y-Wing"
	| "Rectangle Elimination"
	| "Swordfish"
	| "XYZ-Wing"
	| "Tridagon"
	| "X-Cycle"
	| "XY-Chain"
	| "3D Medusa"
	| "Jellyfish"
	| "Unique Rectangle 2,3,4,5"
	| "Avoidable Rectangle"
	| "Twinned XY-Chain"
	| "Fireworks"
	| "SK Loop"
	| "Extended Unique Rectangle"
	| "Hidden Unique Rectangle"
	| "WXYZ-Wing"
	| "Aligned Pair Exclusion"
	| "Exocet"
	| "Grouped X-Cycle"
	| "Finned X-Wing"
	| "Finned Swordfish"
	| "Franken Swordfish"
	| "Alternating Inference Chain"
	| "Sue-de-Coq"
	| "Digit Forcing Chain"
	| "Nishio Forcing Chain"
	| "Cell Forcing Chain"
	| "Unit Forcing Chain"
	| "Almost Locked Set"
	| "Death Blossom"
	| "Pattern Overlay"
	| "Quad Forcing Chain"
	| "Bowman Bingo"
	| "Backtracking";

export interface SolveStep {
	technique: Technique;
	row: number;
	col: number;
	value: number;
}

export interface GradedBoard {
	difficulty: number;
	techniquesUsed: Set<Technique>;
	isSolvable: boolean;
	solution: Board | null;
}

const TECHNIQUE_SCORES: Record<Exclude<Technique, "Backtracking">, number> = {
	"Naked Single": 1, // Will be multiplied by F
	"Hidden Single": 2, // Will be multiplied by F
	"Naked Pair": 5, // Will be multiplied by F
	"Naked Triple": 10, // Will be multiplied by F
	"Hidden Pair": 10,
	"Hidden Triple": 25,
	"Naked Quad": 40,
	"Hidden Quad": 60,
	"Pointing Pairs": 20,
	"Line/Box Reduction": 20,
	"Gurth's Theorem": 80,
	"BUG+1": 30,
	"X-Wing": 30,
	"Unique Rectangle Type 1": 20,
	"Chute Remote Pair": 25,
	"Simple Colouring": 50,
	"Y-Wing": 50,
	"Rectangle Elimination": 25,
	Swordfish: 50,
	"XYZ-Wing": 60,
	Tridagon: 60,
	"X-Cycle": 60, // + chain length
	"XY-Chain": 50, // + chain length
	"3D Medusa": 80,
	Jellyfish: 80,
	"Unique Rectangle 2,3,4,5": 50,
	"Avoidable Rectangle": 60,
	"Twinned XY-Chain": 100,
	Fireworks: 100,
	"SK Loop": 100,
	"Extended Unique Rectangle": 90,
	"Hidden Unique Rectangle": 100,
	"WXYZ-Wing": 100,
	"Aligned Pair Exclusion": 140,
	Exocet: 300,
	"Grouped X-Cycle": 100, // + chain length
	"Finned X-Wing": 160,
	"Finned Swordfish": 190,
	"Franken Swordfish": 150,
	"Alternating Inference Chain": 100, // + chain length
	"Sue-de-Coq": 180,
	"Digit Forcing Chain": 120, // + chain length
	"Nishio Forcing Chain": 120, // + chain length
	"Cell Forcing Chain": 180, // + chain length
	"Unit Forcing Chain": 180, // + chain length
	"Almost Locked Set": 140,
	"Death Blossom": 200,
	"Pattern Overlay": 100,
	"Quad Forcing Chain": 200, // + chain length
	"Bowman Bingo": 100,
};

export class SudokuSolver {
	private board: Board;
	private candidates: Set<number>[][];
	private techniquesUsed: Set<Technique> = new Set();

	constructor(board: Board) {
		this.board = board.map((row) => [...row]);
		this.candidates = Array(9)
			.fill(null)
			.map((_, r) =>
				Array(9)
					.fill(null)
					.map((_, c) => {
						if (this.board[r]?.[c] !== null) return new Set<number>();
						return new Set([1, 2, 3, 4, 5, 6, 7, 8, 9]);
					}),
			);
		this.updateAllCandidates();
	}

	private updateAllCandidates() {
		for (let r = 0; r < 9; r++) {
			for (let c = 0; c < 9; c++) {
				const boardRow = this.board[r];
				if (boardRow && boardRow[c] !== null) {
					const candRow = this.candidates[r];
					if (candRow) candRow[c] = new Set();
				} else {
					for (let val = 1; val <= 9; val++) {
						if (!this.isValid(r, c, val)) {
							this.candidates[r]?.[c]?.delete(val);
						}
					}
				}
			}
		}
	}

	private isValid(row: number, col: number, num: number): boolean {
		for (let x = 0; x < 9; x++) {
			if (this.board[row]?.[x] === num) return false;
			if (this.board[x]?.[col] === num) return false;
		}

		const startRow = row - (row % 3);
		const startCol = col - (col % 3);
		for (let i = 0; i < 3; i++) {
			for (let j = 0; j < 3; j++) {
				if (this.board[i + startRow]?.[j + startCol] === num) return false;
			}
		}
		return true;
	}

	solve(): GradedBoard {
		let totalScore = 0;
		let changed = true;
		while (changed) {
			changed = false;
			const F = this.getCandidateDensityFactor();

			if (this.findNakedSingles()) {
				totalScore += TECHNIQUE_SCORES["Naked Single"] * F;
				changed = true;
				continue;
			}
			if (this.findHiddenSingles()) {
				totalScore += TECHNIQUE_SCORES["Hidden Single"] * F;
				changed = true;
				continue;
			}
			if (this.findPointingPairs()) {
				totalScore += TECHNIQUE_SCORES["Pointing Pairs"] * F;
				changed = true;
				continue;
			}
			if (this.findBoxLineReduction()) {
				totalScore += TECHNIQUE_SCORES["Line/Box Reduction"] * F;
				changed = true;
				continue;
			}
			if (this.findNakedPairs()) {
				totalScore += TECHNIQUE_SCORES["Naked Pair"] * F;
				changed = true;
				continue;
			}
			if (this.findHiddenPairs()) {
				totalScore += TECHNIQUE_SCORES["Hidden Pair"] * F;
				changed = true;
				continue;
			}
			if (this.findNakedTriples()) {
				totalScore += TECHNIQUE_SCORES["Naked Triple"] * F;
				changed = true;
				continue;
			}
			if (this.findHiddenTriples()) {
				totalScore += TECHNIQUE_SCORES["Hidden Triple"] * F;
				changed = true;
				continue;
			}
			if (this.findNakedQuads()) {
				totalScore += TECHNIQUE_SCORES["Naked Quad"] * F;
				changed = true;
				continue;
			}
			if (this.findHiddenQuads()) {
				totalScore += TECHNIQUE_SCORES["Hidden Quad"] * F;
				changed = true;
				continue;
			}
			if (this.findXWings()) {
				totalScore += TECHNIQUE_SCORES["X-Wing"] * F;
				changed = true;
				continue;
			}
			if (this.findSwordfish()) {
				totalScore += TECHNIQUE_SCORES.Swordfish * F;
				changed = true;
				continue;
			}
			if (this.findJellyfish()) {
				totalScore += TECHNIQUE_SCORES.Jellyfish * F;
				changed = true;
				continue;
			}
			if (this.findUniqueRectangles()) {
				totalScore += TECHNIQUE_SCORES["Unique Rectangle Type 1"] * F;
				changed = true;
				continue;
			}
			if (this.findYWings()) {
				totalScore += TECHNIQUE_SCORES["Y-Wing"] * F;
				changed = true;
				continue;
			}
			if (this.findXYZWings()) {
				totalScore += TECHNIQUE_SCORES["XYZ-Wing"] * F;
				changed = true;
				continue;
			}
			const xyChainResult = this.findXYChains();
			if (xyChainResult) {
				totalScore += (TECHNIQUE_SCORES["XY-Chain"] + xyChainResult.length) * F;
				changed = true;
				continue;
			}
			if (this.findSimpleColoring()) {
				totalScore += TECHNIQUE_SCORES["Simple Colouring"] * F;
				changed = true;
				continue;
			}
			if (this.findBUGPlusOne()) {
				totalScore += TECHNIQUE_SCORES["BUG+1"] * F;
				changed = true;
			}
		}

		let isFinished = this.board.every((row) =>
			row.every((cell) => cell !== null),
		);

		if (!isFinished) {
			if (this.backtrack()) {
				this.techniquesUsed.add("Backtracking");
				totalScore += 0; // Backtracking is not scored in the new scheme
				isFinished = true;
			} else {
				return {
					difficulty: 0,
					techniquesUsed: this.techniquesUsed,
					isSolvable: false,
					solution: null,
				};
			}
		}

		const normalizedScore = this.normalizeScore(totalScore);

		return {
			difficulty: normalizedScore,
			techniquesUsed: this.techniquesUsed,
			isSolvable: isFinished,
			solution: isFinished ? (this.board as Board) : null,
		};
	}

	private findBUGPlusOne(): boolean {
		let bugCell: { r: number; c: number; vals: number[] } | null = null;
		let multiCellCount = 0;

		for (let r = 0; r < 9; r++) {
			for (let c = 0; c < 9; c++) {
				if (this.board[r]?.[c] === null) {
					const candy = this.candidates[r]?.[c];
					if (!candy) return false;
					if (candy.size < 2) {
						// This should have been caught by Naked Singles or resulted in unsolvable
						return false;
					}
					if (candy.size === 2) {
						// OK
					} else if (candy.size === 3) {
						if (bugCell) {
							return false;
						}
						bugCell = { r, c, vals: Array.from(candy) };
						multiCellCount++;
					} else {
						return false;
					}
				}
			}
		}

		if (!bugCell || multiCellCount !== 1) return false;

		// Verify that every candidate in the multi-cell appears exactly thrice in its houses
		// and others appear twice.
		// Actually, the easiest way to find the Correct candidate:
		// The candidate that appears 3 times in its row, column, and box is the correct one.
		for (const val of bugCell.vals) {
			let rowCount = 0;
			let colCount = 0;
			let boxCount = 0;

			// Row
			for (let c = 0; c < 9; c++) {
				if (this.candidates[bugCell.r]?.[c]?.has(val)) rowCount++;
			}
			// Col
			for (let r = 0; r < 9; r++) {
				if (this.candidates[r]?.[bugCell.c]?.has(val)) colCount++;
			}
			// Box
			const startRow = Math.floor(bugCell.r / 3) * 3;
			const startCol = Math.floor(bugCell.c / 3) * 3;
			for (let r = 0; r < 3; r++) {
				for (let c = 0; c < 3; c++) {
					if (this.candidates[startRow + r]?.[startCol + c]?.has(val))
						boxCount++;
				}
			}

			if (rowCount === 3 && colCount === 3 && boxCount === 3) {
				this.applyMove(bugCell.r, bugCell.c, val, "BUG+1");
				return true;
			}
		}

		return false;
	}

	private getCandidateDensityFactor(): number {
		const C = this.countCandidates();
		return (C / 727) * 20;
	}

	private countCandidates(): number {
		let count = 0;
		for (let r = 0; r < 9; r++) {
			for (let c = 0; c < 9; c++) {
				count += this.candidates[r]?.[c]?.size ?? 0;
			}
		}
		return count;
	}

	private normalizeScore(score: number): number {
		if (score <= 0) return 0;
		// 9x9: Log5 (score) * 2
		// Log5(x) = ln(x) / ln(5)
		return (Math.log(score) / Math.log(5)) * 2;
	}

	private findNakedSingles(): boolean {
		let found = false;
		for (let r = 0; r < 9; r++) {
			for (let c = 0; c < 9; c++) {
				const boardRow = this.board[r];
				if (boardRow && boardRow[c] === null) {
					const candy = this.candidates[r]?.[c];
					if (candy?.size === 1) {
						const val = Array.from(candy)[0];
						if (val !== undefined) {
							this.applyMove(r, c, val, "Naked Single");
							found = true;
						}
					}
				}
			}
		}
		return found;
	}

	private findHiddenSingles(): boolean {
		let found = false;
		for (let val = 1; val <= 9; val++) {
			for (let i = 0; i < 9; i++) {
				// Check row
				const rowPositions = [];
				for (let c = 0; c < 9; c++) {
					if (
						this.board[i]?.[c] === null &&
						this.candidates[i]?.[c]?.has(val)
					) {
						rowPositions.push(c);
					}
				}
				if (rowPositions.length === 1) {
					const col = rowPositions[0];
					if (col !== undefined) {
						this.applyMove(i, col, val, "Hidden Single");
						found = true;
						continue;
					}
				}

				// Check col
				const colPositions = [];
				for (let r = 0; r < 9; r++) {
					if (
						this.board[r]?.[i] === null &&
						this.candidates[r]?.[i]?.has(val)
					) {
						colPositions.push(r);
					}
				}
				if (colPositions.length === 1) {
					const row = colPositions[0];
					if (row !== undefined) {
						this.applyMove(row, i, val, "Hidden Single");
						found = true;
						continue;
					}
				}

				// Check box
				const boxPositions = [];
				const startRow = Math.floor(i / 3) * 3;
				const startCol = (i % 3) * 3;
				for (let r = 0; r < 3; r++) {
					for (let c = 0; c < 3; c++) {
						if (
							this.board[startRow + r]?.[startCol + c] === null &&
							this.candidates[startRow + r]?.[startCol + c]?.has(val)
						) {
							boxPositions.push({ r: startRow + r, c: startCol + c });
						}
					}
				}
				if (boxPositions.length === 1) {
					const pos = boxPositions[0];
					if (pos) {
						this.applyMove(pos.r, pos.c, val, "Hidden Single");
						return true;
					}
				}
			}
		}
		return found;
	}

	private findPointingPairs(): boolean {
		for (let val = 1; val <= 9; val++) {
			for (let b = 0; b < 9; b++) {
				const startRow = Math.floor(b / 3) * 3;
				const startCol = (b % 3) * 3;
				const positions: { r: number; c: number }[] = [];
				for (let r = 0; r < 3; r++) {
					for (let c = 0; c < 3; c++) {
						const row = startRow + r;
						const col = startCol + c;
						if (
							this.board[row]?.[col] === null &&
							this.candidates[row]?.[col]?.has(val)
						) {
							positions.push({ r: row, c: col });
						}
					}
				}

				if (positions.length >= 2 && positions.length <= 3) {
					const firstPos = positions[0];
					if (!firstPos) continue;

					// Check if all are in same row
					if (positions.every((p) => p.r === firstPos.r)) {
						let removed = false;
						for (let c = 0; c < 9; c++) {
							// Only remove from outside the box
							if (c < startCol || c >= startCol + 3) {
								const candy = this.candidates[firstPos.r]?.[c];
								if (candy?.has(val)) {
									candy.delete(val);
									removed = true;
								}
							}
						}
						if (removed) {
							this.techniquesUsed.add("Pointing Pairs");
							return true;
						}
					}

					// Check if all are in same col
					if (firstPos && positions.every((p) => p.c === firstPos.c)) {
						let removed = false;
						for (let r = 0; r < 9; r++) {
							// Only remove from outside the box
							if (r < startRow || r >= startRow + 3) {
								const candy = this.candidates[r]?.[firstPos.c];
								if (candy?.has(val)) {
									candy.delete(val);
									removed = true;
								}
							}
						}
						if (removed) {
							this.techniquesUsed.add("Pointing Pairs");
							return true;
						}
					}
				}
			}
		}
		return false;
	}

	private findBoxLineReduction(): boolean {
		for (let val = 1; val <= 9; val++) {
			for (let i = 0; i < 9; i++) {
				// Check row i
				const rowPositions: number[] = [];
				for (let c = 0; c < 9; c++) {
					if (
						this.board[i]?.[c] === null &&
						this.candidates[i]?.[c]?.has(val)
					) {
						rowPositions.push(c);
					}
				}
				if (rowPositions.length >= 2 && rowPositions.length <= 3) {
					const firstCol = rowPositions[0];
					if (firstCol === undefined) continue;
					const boxIdx = Math.floor(i / 3) * 3 + Math.floor(firstCol / 3);
					if (
						rowPositions.every(
							(c) => Math.floor(c / 3) === Math.floor(firstCol / 3),
						)
					) {
						let removed = false;
						const startRow = Math.floor(boxIdx / 3) * 3;
						const startCol = (boxIdx % 3) * 3;
						for (let r = 0; r < 3; r++) {
							for (let c = 0; c < 3; c++) {
								const currR = startRow + r;
								const currC = startCol + c;
								if (currR !== i) {
									const candy = this.candidates[currR]?.[currC];
									if (candy?.has(val)) {
										candy.delete(val);
										removed = true;
									}
								}
							}
						}
						if (removed) {
							this.techniquesUsed.add("Line/Box Reduction");
							return true;
						}
					}
				}

				// Check col i
				const colPositions: number[] = [];
				for (let r = 0; r < 9; r++) {
					if (
						this.board[r]?.[i] === null &&
						this.candidates[r]?.[i]?.has(val)
					) {
						colPositions.push(r);
					}
				}
				if (colPositions.length >= 2 && colPositions.length <= 3) {
					const firstRow = colPositions[0];
					if (firstRow === undefined) continue;
					const boxIdx = Math.floor(firstRow / 3) * 3 + Math.floor(i / 3);
					if (
						colPositions.every(
							(r) => Math.floor(r / 3) === Math.floor(firstRow / 3),
						)
					) {
						let removed = false;
						const startRow = Math.floor(boxIdx / 3) * 3;
						const startCol = (boxIdx % 3) * 3;
						for (let r = 0; r < 3; r++) {
							for (let c = 0; c < 3; c++) {
								const currR = startRow + r;
								const currC = startCol + c;
								if (currC !== i) {
									const candy = this.candidates[currR]?.[currC];
									if (candy?.has(val)) {
										candy.delete(val);
										removed = true;
									}
								}
							}
						}
						if (removed) {
							this.techniquesUsed.add("Line/Box Reduction");
							return true;
						}
					}
				}
			}
		}
		return false;
	}

	private findNakedPairs(): boolean {
		for (let i = 0; i < 9; i++) {
			if (this.findNakedSubsetsInUnit(this.getCellsInRow(i), 2, "Naked Pair"))
				return true;
			if (this.findNakedSubsetsInUnit(this.getCellsInCol(i), 2, "Naked Pair"))
				return true;
			if (this.findNakedSubsetsInUnit(this.getCellsInBox(i), 2, "Naked Pair"))
				return true;
		}
		return false;
	}

	private findHiddenPairs(): boolean {
		for (let i = 0; i < 9; i++) {
			if (this.findHiddenSubsetsInUnit(this.getCellsInRow(i), 2, "Hidden Pair"))
				return true;
			if (this.findHiddenSubsetsInUnit(this.getCellsInCol(i), 2, "Hidden Pair"))
				return true;
			if (this.findHiddenSubsetsInUnit(this.getCellsInBox(i), 2, "Hidden Pair"))
				return true;
		}
		return false;
	}

	private findNakedTriples(): boolean {
		for (let i = 0; i < 9; i++) {
			if (this.findNakedSubsetsInUnit(this.getCellsInRow(i), 3, "Naked Triple"))
				return true;
			if (this.findNakedSubsetsInUnit(this.getCellsInCol(i), 3, "Naked Triple"))
				return true;
			if (this.findNakedSubsetsInUnit(this.getCellsInBox(i), 3, "Naked Triple"))
				return true;
		}
		return false;
	}

	private findHiddenTriples(): boolean {
		for (let i = 0; i < 9; i++) {
			if (
				this.findHiddenSubsetsInUnit(this.getCellsInRow(i), 3, "Hidden Triple")
			)
				return true;
			if (
				this.findHiddenSubsetsInUnit(this.getCellsInCol(i), 3, "Hidden Triple")
			)
				return true;
			if (
				this.findHiddenSubsetsInUnit(this.getCellsInBox(i), 3, "Hidden Triple")
			)
				return true;
		}
		return false;
	}

	private findNakedQuads(): boolean {
		for (let i = 0; i < 9; i++) {
			if (this.findNakedSubsetsInUnit(this.getCellsInRow(i), 4, "Naked Quad"))
				return true;
			if (this.findNakedSubsetsInUnit(this.getCellsInCol(i), 4, "Naked Quad"))
				return true;
			if (this.findNakedSubsetsInUnit(this.getCellsInBox(i), 4, "Naked Quad"))
				return true;
		}
		return false;
	}

	private findHiddenQuads(): boolean {
		for (let i = 0; i < 9; i++) {
			if (this.findHiddenSubsetsInUnit(this.getCellsInRow(i), 4, "Hidden Quad"))
				return true;
			if (this.findHiddenSubsetsInUnit(this.getCellsInCol(i), 4, "Hidden Quad"))
				return true;
			if (this.findHiddenSubsetsInUnit(this.getCellsInBox(i), 4, "Hidden Quad"))
				return true;
		}
		return false;
	}

	private getCellsInRow(r: number) {
		return Array.from({ length: 9 }, (_, c) => ({ r, c }));
	}
	private getCellsInCol(c: number) {
		return Array.from({ length: 9 }, (_, r) => ({ r, c }));
	}
	private getCellsInBox(b: number) {
		const startRow = Math.floor(b / 3) * 3;
		const startCol = (b % 3) * 3;
		const cells = [];
		for (let r = 0; r < 3; r++) {
			for (let c = 0; c < 3; c++) {
				cells.push({ r: startRow + r, c: startCol + c });
			}
		}
		return cells;
	}

	private findNakedSubsetsInUnit(
		cells: { r: number; c: number }[],
		size: number,
		technique: Technique,
	): boolean {
		const candidatesList: { r: number; c: number; candy: Set<number> }[] = [];
		for (const cell of cells) {
			if (this.board[cell.r]?.[cell.c] === null) {
				const candy = this.candidates[cell.r]?.[cell.c];
				if (candy && candy.size > 1 && candy.size <= size) {
					candidatesList.push({ r: cell.r, c: cell.c, candy });
				}
			}
		}
		if (candidatesList.length < size) return false;

		const combinations = this.getCombinations(candidatesList, size);
		for (const currentSet of combinations) {
			const combined = new Set<number>();
			for (const item of currentSet) {
				for (const val of item.candy) combined.add(val);
			}

			if (combined.size === size) {
				let removed = false;
				const subsetCells = new Set(currentSet.map((i) => `${i.r},${i.c}`));
				for (const cell of cells) {
					if (!subsetCells.has(`${cell.r},${cell.c}`)) {
						const cellCand = this.candidates[cell.r]?.[cell.c];
						if (cellCand) {
							for (const val of combined) {
								if (cellCand.has(val)) {
									cellCand.delete(val);
									removed = true;
								}
							}
						}
					}
				}
				if (removed) {
					this.techniquesUsed.add(technique);
					return true;
				}
			}
		}
		return false;
	}

	private findHiddenSubsetsInUnit(
		cells: { r: number; c: number }[],
		size: number,
		technique: Technique,
	): boolean {
		const valMap = new Map<number, { r: number; c: number }[]>();
		for (let val = 1; val <= 9; val++) {
			const positions = [];
			for (const cell of cells) {
				if (
					this.board[cell.r]?.[cell.c] === null &&
					this.candidates[cell.r]?.[cell.c]?.has(val)
				) {
					positions.push(cell);
				}
			}
			if (positions.length >= 2 && positions.length <= size)
				valMap.set(val, positions);
		}

		const vals = Array.from(valMap.keys());
		if (vals.length < size) return false;

		const combinations = this.getCombinations(vals, size);
		for (const currentVals of combinations) {
			const combinedPositions = new Set<string>();
			for (const v of currentVals) {
				const vals = valMap.get(v);
				if (vals) {
					for (const pos of vals) {
						combinedPositions.add(`${pos.r},${pos.c}`);
					}
				}
			}

			if (combinedPositions.size === size) {
				let removed = false;
				for (const posStr of combinedPositions) {
					const parts = posStr.split(",").map(Number);
					const r = parts[0];
					const c = parts[1];
					if (r !== undefined && c !== undefined) {
						const cellCand = this.candidates[r]?.[c];
						if (cellCand) {
							for (const val of Array.from(cellCand)) {
								if (!currentVals.includes(val)) {
									cellCand.delete(val);
									removed = true;
								}
							}
						}
					}
				}
				if (removed) {
					this.techniquesUsed.add(technique);
					return true;
				}
			}
		}
		return false;
	}

	private getCombinations<T>(arr: T[], size: number): T[][] {
		const results: T[][] = [];
		const combine = (start: number, current: T[]) => {
			if (current.length === size) {
				results.push([...current]);
				return;
			}
			for (let i = start; i < arr.length; i++) {
				const item = arr[i];
				if (item !== undefined) {
					current.push(item);
					combine(i + 1, current);
					current.pop();
				}
			}
		};
		combine(0, []);
		return results;
	}

	private findXWings(): boolean {
		for (let val = 1; val <= 9; val++) {
			if (this.findFishInUnits(val, 2, "X-Wing", true)) return true;
			if (this.findFishInUnits(val, 2, "X-Wing", false)) return true;
		}
		return false;
	}

	private findSwordfish(): boolean {
		for (let val = 1; val <= 9; val++) {
			if (this.findFishInUnits(val, 3, "Swordfish", true)) return true;
			if (this.findFishInUnits(val, 3, "Swordfish", false)) return true;
		}
		return false;
	}

	private findJellyfish(): boolean {
		for (let val = 1; val <= 9; val++) {
			if (this.findFishInUnits(val, 4, "Jellyfish", true)) return true;
			if (this.findFishInUnits(val, 4, "Jellyfish", false)) return true;
		}
		return false;
	}

	private findFishInUnits(
		val: number,
		size: number,
		technique: Technique,
		horizontal: boolean,
	): boolean {
		const unitLines: { idx: number; positions: number[] }[] = [];
		for (let i = 0; i < 9; i++) {
			const positions = [];
			for (let j = 0; j < 9; j++) {
				const r = horizontal ? i : j;
				const c = horizontal ? j : i;
				if (this.board[r]?.[c] === null && this.candidates[r]?.[c]?.has(val))
					positions.push(j);
			}
			if (positions.length >= 2 && positions.length <= size)
				unitLines.push({ idx: i, positions });
		}
		if (unitLines.length < size) return false;

		const combinations = this.getCombinations(unitLines, size);
		for (const currentLines of combinations) {
			const targetIndices = new Set<number>();
			for (const line of currentLines) {
				for (const pos of line.positions) targetIndices.add(pos);
			}

			if (targetIndices.size === size) {
				let removed = false;
				const sourceIndices = new Set(currentLines.map((l) => l.idx));
				for (const targetIdx of targetIndices) {
					for (let i = 0; i < 9; i++) {
						if (!sourceIndices.has(i)) {
							const r = horizontal ? i : targetIdx;
							const c = horizontal ? targetIdx : i;
							const candy = this.candidates[r]?.[c];
							if (candy?.has(val)) {
								candy.delete(val);
								removed = true;
							}
						}
					}
				}
				if (removed) {
					this.techniquesUsed.add(technique);
					return true;
				}
			}
		}
		return false;
	}

	private findYWings(): boolean {
		const bivalueCells: { r: number; c: number; vals: number[] }[] = [];
		for (let r = 0; r < 9; r++) {
			for (let c = 0; c < 9; c++) {
				const cand = this.candidates[r]?.[c];
				if (this.board[r]?.[c] === null && cand?.size === 2) {
					bivalueCells.push({ r, c, vals: Array.from(cand) });
				}
			}
		}

		for (let i = 0; i < bivalueCells.length; i++) {
			for (let j = 0; j < bivalueCells.length; j++) {
				if (i === j) continue;
				const pivot = bivalueCells[i];
				const pincer1 = bivalueCells[j];
				if (!pivot || !pincer1) continue;

				if (!this.areSeen(pivot.r, pivot.c, pincer1.r, pincer1.c)) continue;

				const common = pivot.vals.find((v) => pincer1.vals.includes(v));
				if (common === undefined) continue;

				const z = pincer1.vals.find((v) => v !== common);
				const y = pivot.vals.find((v) => v !== common);
				if (z === undefined || y === undefined || z === y) continue;

				for (let k = j + 1; k < bivalueCells.length; k++) {
					if (k === i) continue;
					const pincer2 = bivalueCells[k];
					if (!pincer2) continue;

					if (!this.areSeen(pivot.r, pivot.c, pincer2.r, pincer2.c)) continue;

					if (pincer2.vals.includes(y) && pincer2.vals.includes(z)) {
						let removed = false;
						for (let r = 0; r < 9; r++) {
							for (let c = 0; c < 9; c++) {
								if (
									this.board[r]?.[c] === null &&
									(r !== pincer1.r || c !== pincer1.c) &&
									(r !== pincer2.r || c !== pincer2.c) &&
									this.areSeen(r, c, pincer1.r, pincer1.c) &&
									this.areSeen(r, c, pincer2.r, pincer2.c)
								) {
									const cand = this.candidates[r]?.[c];
									if (cand?.has(z)) {
										cand.delete(z);
										removed = true;
									}
								}
							}
						}
						if (removed) {
							this.techniquesUsed.add("Y-Wing");
							return true;
						}
					}
				}
			}
		}
		return false;
	}

	private findXYZWings(): boolean {
		const trivalueCells: { r: number; c: number; vals: number[] }[] = [];
		const bivalueCells: { r: number; c: number; vals: number[] }[] = [];
		for (let r = 0; r < 9; r++) {
			for (let c = 0; c < 9; c++) {
				if (this.board[r]?.[c] === null) {
					const candy = this.candidates[r]?.[c];
					if (candy?.size === 3)
						trivalueCells.push({ r, c, vals: Array.from(candy) });
					else if (candy?.size === 2)
						bivalueCells.push({ r, c, vals: Array.from(candy) });
				}
			}
		}

		for (const pivot of trivalueCells) {
			for (let i = 0; i < bivalueCells.length; i++) {
				const wing1 = bivalueCells[i];
				if (!wing1) continue;
				if (!this.areSeen(pivot.r, pivot.c, wing1.r, wing1.c)) continue;
				if (!wing1.vals.every((v) => pivot.vals.includes(v))) continue;

				for (let j = i + 1; j < bivalueCells.length; j++) {
					const wing2 = bivalueCells[j];
					if (!wing2) continue;
					if (!this.areSeen(pivot.r, pivot.c, wing2.r, wing2.c)) continue;
					if (!wing2.vals.every((v) => pivot.vals.includes(v))) continue;

					// Z is the one candidate shared by all three
					const allThreeShared = pivot.vals.filter(
						(v) => wing1.vals.includes(v) && wing2.vals.includes(v),
					);
					if (allThreeShared.length !== 1) continue;
					const Z = allThreeShared[0];
					if (Z === undefined) continue;

					let removed = false;
					for (let r = 0; r < 9; r++) {
						for (let c = 0; c < 9; c++) {
							if (
								this.board[r]?.[c] === null &&
								(r !== pivot.r || c !== pivot.c) &&
								(r !== wing1.r || c !== wing1.c) &&
								(r !== wing2.r || c !== wing2.c)
							) {
								if (
									this.areSeen(r, c, pivot.r, pivot.c) &&
									this.areSeen(r, c, wing1.r, wing1.c) &&
									this.areSeen(r, c, wing2.r, wing2.c)
								) {
									const cellCand = this.candidates[r]?.[c];
									if (cellCand?.has(Z)) {
										cellCand.delete(Z);
										removed = true;
									}
								}
							}
						}
					}
					if (removed) {
						this.techniquesUsed.add("XYZ-Wing");
						return true;
					}
				}
			}
		}
		return false;
	}

	private findUniqueRectangles(): boolean {
		// Type 1
		for (let r1 = 0; r1 < 9; r1++) {
			for (let r2 = r1 + 1; r2 < 9; r2++) {
				for (let c1 = 0; c1 < 9; c1++) {
					for (let c2 = c1 + 1; c2 < 9; c2++) {
						const cells = [
							{ r: r1, c: c1 },
							{ r: r1, c: c2 },
							{ r: r2, c: c1 },
							{ r: r2, c: c2 },
						];

						// Must span exactly 2 boxes
						const boxes = new Set(
							cells.map((c) => Math.floor(c.r / 3) * 3 + Math.floor(c.c / 3)),
						);
						if (boxes.size !== 2) continue;

						const nullCells = cells.filter(
							(c) => this.board[c.r]?.[c.c] === null,
						);
						if (nullCells.length !== 4) continue;

						const cands = cells.map((c) => this.candidates[c.r]?.[c.c]);
						if (cands.some((c) => !c)) continue;

						// Look for two shared candidates
						const allCands = new Set<number>();
						for (const c of cands) {
							if (c) {
								for (const val of c) allCands.add(val);
							}
						}

						for (const v1 of allCands) {
							for (const v2 of allCands) {
								if (v1 >= v2) continue;

								const counts = cands.map((c) => {
									const hasV1 = c?.has(v1) ?? false;
									const hasV2 = c?.has(v2) ?? false;
									const isBivalue = c?.size === 2;
									return { hasV1, hasV2, isBivalue, size: c?.size ?? 0 };
								});

								// Type 1: Three cells are exactly {v1, v2}, one is {v1, v2, ...}
								const identical = counts.filter(
									(x) => x.hasV1 && x.hasV2 && x.isBivalue,
								);
								if (identical.length === 3) {
									const fourthIdx = counts.findIndex(
										(x) => !(x.hasV1 && x.hasV2 && x.isBivalue),
									);
									const fourth = counts[fourthIdx];
									if (fourth?.hasV1 && fourth.hasV2) {
										const cell = cells[fourthIdx];
										if (cell) {
											const cand = this.candidates[cell.r]?.[cell.c];
											if (cand) {
												cand.delete(v1);
												cand.delete(v2);
												this.techniquesUsed.add("Unique Rectangle Type 1");
												return true;
											}
										}
									}
								}
							}
						}
					}
				}
			}
		}
		return false;
	}

	private findXYChains(): { length: number } | null {
		const bivalueCells: { r: number; c: number; vals: number[] }[] = [];
		for (let r = 0; r < 9; r++) {
			for (let c = 0; c < 9; c++) {
				const cand = this.candidates[r]?.[c];
				if (this.board[r]?.[c] === null && cand?.size === 2) {
					bivalueCells.push({ r, c, vals: Array.from(cand) });
				}
			}
		}

		for (const startCell of bivalueCells) {
			for (const startVal of startCell.vals) {
				const endVal = startCell.vals.find((v) => v !== startVal);
				if (endVal === undefined) continue;
				const visited = new Set<string>([`${startCell.r},${startCell.c}`]);

				const findChain = (
					currR: number,
					currC: number,
					seekVal: number,
				): { length: number } | null => {
					for (const next of bivalueCells) {
						const key = `${next.r},${next.c}`;
						if (visited.has(key)) continue;
						if (!this.areSeen(currR, currC, next.r, next.c)) continue;

						if (next.vals.includes(seekVal)) {
							const otherVal = next.vals.find((v) => v !== seekVal);
							if (otherVal === undefined) continue;
							if (otherVal === startVal) {
								let removed = false;
								for (let r = 0; r < 9; r++) {
									for (let c = 0; c < 9; c++) {
										if (
											this.board[r]?.[c] === null &&
											(r !== startCell.r || c !== startCell.c) &&
											(r !== next.r || c !== next.c)
										) {
											if (
												this.areSeen(r, c, startCell.r, startCell.c) &&
												this.areSeen(r, c, next.r, next.c)
											) {
												const cand = this.candidates[r]?.[c];
												if (cand?.has(startVal)) {
													cand.delete(startVal);
													removed = true;
												}
											}
										}
									}
								}
								if (removed) {
									this.techniquesUsed.add("XY-Chain");
									return { length: visited.size };
								}
							}

							visited.add(key);
							const result = findChain(next.r, next.c, otherVal);
							if (result) return result;
							visited.delete(key);
						}
					}
					return null;
				};

				const result = findChain(startCell.r, startCell.c, endVal);
				if (result) return result;
			}
		}
		return null;
	}

	private findSimpleColoring(): boolean {
		for (let val = 1; val <= 9; val++) {
			const nodes: { r: number; c: number }[] = [];
			for (let r = 0; r < 9; r++) {
				for (let c = 0; c < 9; c++) {
					if (
						this.board[r]?.[c] === null &&
						this.candidates[r]?.[c]?.has(val)
					) {
						nodes.push({ r, c });
					}
				}
			}

			const adj = new Map<number, number[]>();
			for (let i = 0; i < 9; i++) {
				const houses = [
					nodes.filter((n) => n.r === i),
					nodes.filter((n) => n.c === i),
					nodes.filter(
						(n) => Math.floor(n.r / 3) * 3 + Math.floor(n.c / 3) === i,
					),
				];
				for (const house of houses) {
					if (house.length === 2) {
						const h1 = house[0];
						const h2 = house[1];
						if (h1 && h2) {
							const u = nodes.indexOf(h1);
							const v = nodes.indexOf(h2);
							if (!adj.has(u)) adj.set(u, []);
							if (!adj.has(v)) adj.set(v, []);
							adj.get(u)?.push(v);
							adj.get(v)?.push(u);
						}
					}
				}
			}

			const colors = new Map<number, number>();
			for (let i = 0; i < nodes.length; i++) {
				if (colors.has(i)) continue;
				const component: number[] = [];
				const queue: [number, number][] = [[i, 0]];
				colors.set(i, 0);
				while (queue.length > 0) {
					const first = queue.shift();
					if (!first) break;
					const [u, c] = first;
					component.push(u);
					for (const v of adj.get(u) || []) {
						if (!colors.has(v)) {
							colors.set(v, 1 - c);
							queue.push([v, 1 - c]);
						}
					}
				}

				// Rule 2: Twice in a House (Same color twice in a row/col/box)
				for (let color = 0; color <= 1; color++) {
					const coloredNodes = component
						.map((idx) => nodes[idx])
						.filter(
							(n): n is NonNullable<typeof n> =>
								n !== undefined && colors.get(nodes.indexOf(n)) === color,
						);
					for (let j = 0; j < 9; j++) {
						const rCount = coloredNodes.filter((n) => n.r === j).length;
						const cCount = coloredNodes.filter((n) => n.c === j).length;
						const bCount = coloredNodes.filter(
							(n) => Math.floor(n.r / 3) * 3 + Math.floor(n.c / 3) === j,
						).length;
						if (rCount > 1 || cCount > 1 || bCount > 1) {
							let removed = false;
							for (const nodeIdx of component) {
								if (colors.get(nodeIdx) === color) {
									const cell = nodes[nodeIdx];
									if (!cell) continue;
									const cand = this.candidates[cell.r]?.[cell.c];
									if (cand?.has(val)) {
										cand.delete(val);
										removed = true;
									}
								}
							}
							if (removed) {
								this.techniquesUsed.add("Simple Colouring");
								return true;
							}
						}
					}
				}

				// Rule 4: Two colors elsewhere (A cell not in the chain sees two different colors)
				for (let nIdx = 0; nIdx < nodes.length; nIdx++) {
					if (component.includes(nIdx)) continue;
					const node = nodes[nIdx];
					if (!node) continue;
					let sees0 = false;
					let sees1 = false;
					for (const cIdx of component) {
						const cNode = nodes[cIdx];
						if (cNode && this.areSeen(node.r, node.c, cNode.r, cNode.c)) {
							if (colors.get(cIdx) === 0) sees0 = true;
							else if (colors.get(cIdx) === 1) sees1 = true;
						}
					}
					if (sees0 && sees1) {
						const cand = this.candidates[node.r]?.[node.c];
						if (cand?.has(val)) {
							cand.delete(val);
							this.techniquesUsed.add("Simple Colouring");
							return true;
						}
					}
				}
			}
		}
		return false;
	}

	private areSeen(r1: number, c1: number, r2: number, c2: number): boolean {
		if (r1 === r2 || c1 === c2) return true;
		if (
			Math.floor(r1 / 3) === Math.floor(r2 / 3) &&
			Math.floor(c1 / 3) === Math.floor(c2 / 3)
		)
			return true;
		return false;
	}

	private applyMove(r: number, c: number, val: number, technique: Technique) {
		const boardRow = this.board[r];
		if (boardRow) boardRow[c] = val;
		this.techniquesUsed.add(technique);
		this.updateCandidatesAfterMove(r, c, val);
	}

	private updateCandidatesAfterMove(row: number, col: number, val: number) {
		if (this.candidates[row]?.[col]) this.candidates[row][col] = new Set();
		for (let i = 0; i < 9; i++) {
			this.candidates[row]?.[i]?.delete(val);
			this.candidates[i]?.[col]?.delete(val);
		}
		const startRow = row - (row % 3);
		const startCol = col - (col % 3);
		for (let i = 0; i < 3; i++) {
			for (let j = 0; j < 3; j++) {
				this.candidates[startRow + i]?.[startCol + j]?.delete(val);
			}
		}
	}

	private backtrack(): boolean {
		for (let r = 0; r < 9; r++) {
			for (let c = 0; c < 9; c++) {
				const boardRow = this.board[r];
				if (boardRow && boardRow[c] === null) {
					const candy = this.candidates[r]?.[c];
					if (!candy) return false;
					for (const val of Array.from(candy)) {
						if (this.isValid(r, c, val)) {
							boardRow[c] = val;
							if (this.backtrack()) return true;
							boardRow[c] = null;
						}
					}
					return false;
				}
			}
		}
		return true;
	}
}

export function gradePuzzle(board: Board): GradedBoard {
	const solver = new SudokuSolver(board);
	return solver.solve();
}
