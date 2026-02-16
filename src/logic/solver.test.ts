import { expect, test } from "bun:test";
import { parsePuzzle } from "./sudoku";
import { gradePuzzle } from "./solver";

test("gradePuzzle - Pointing Pair/Triple", () => {
    const puzzleStr = "070010050900300007000080000000000200012004900000100005003900406006001070780530000";
    const board = parsePuzzle(puzzleStr);
    const graded = gradePuzzle(board);

    expect(graded.isSolvable).toBe(true);
    expect(graded.techniquesUsed.has("Pointing Pair/Triple")).toBe(true);
});

test("gradePuzzle - Naked Pair", () => {
    const puzzleStr = "000005094000940300020007000400060008301000500008000070052070000007009000800302060";
    const board = parsePuzzle(puzzleStr);
    const graded = gradePuzzle(board);

    expect(graded.isSolvable).toBe(true);
    expect(graded.techniquesUsed.has("Naked Pair")).toBe(true);
});

test("gradePuzzle - Hidden Pair", () => {
    const puzzleStr = "300000000040600008100004035800000600000000080500002900604030000005700820073500040";
    const board = parsePuzzle(puzzleStr);
    const graded = gradePuzzle(board);

    expect(graded.isSolvable).toBe(true);
    expect(graded.techniquesUsed.has("Hidden Pair")).toBe(true);
});

test("gradePuzzle - X-Wing", () => {
    const puzzleStr = "009020000060000057800030010500009040702600000094003206000060008600000009000004100";
    const board = parsePuzzle(puzzleStr);
    const graded = gradePuzzle(board);

    expect(graded.isSolvable).toBe(true);
    expect(graded.techniquesUsed.has("X-Wing")).toBe(true);
});

test("gradePuzzle - XY-Wing", () => {
    const puzzleStr = "070209080900300600500040000000506040700000100402000053000000000000851000086003002";
    const board = parsePuzzle(puzzleStr);
    const graded = gradePuzzle(board);

    expect(graded.isSolvable).toBe(true);
    expect(graded.techniquesUsed.has("XY-Wing")).toBe(true);
});

test("gradePuzzle - XYZ-Wing", () => {
    const puzzleStr = "017000200000300907932000804000571080000402000080936000806000473709003000003000620";
    const board = parsePuzzle(puzzleStr);
    const graded = gradePuzzle(board);

    expect(graded.isSolvable).toBe(true);
    expect(graded.techniquesUsed.has("XYZ-Wing")).toBe(true);
});

test("gradePuzzle - Swordfish", () => {
    const puzzleStr = "000000042700200000000509800200090006050046000090802700000010903000000567006000008";
    const board = parsePuzzle(puzzleStr);
    const graded = gradePuzzle(board);

    expect(graded.isSolvable).toBe(true);
    expect(graded.techniquesUsed.has("Swordfish")).toBe(true);
});

test("gradePuzzle - Jellyfish", () => {
    const puzzleStr = "000503900600001080900000003043008010560000370000090006000200090020030040008004630";
    const board = parsePuzzle(puzzleStr);
    const graded = gradePuzzle(board);

    expect(graded.isSolvable).toBe(true);
    expect(graded.techniquesUsed.has("Jellyfish")).toBe(true);
});

test("gradePuzzle - XY-Chain", () => {
    const puzzleStr = "800400057250000640097300800000070406000905000904060000008001720019000085530007004";
    const board = parsePuzzle(puzzleStr);
    const graded = gradePuzzle(board);

    expect(graded.isSolvable).toBe(true);
    expect(graded.techniquesUsed.has("XY-Chain")).toBe(true);
});
