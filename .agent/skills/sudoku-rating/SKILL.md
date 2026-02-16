---
name: sudoku-rating
description: Grade Sudoku puzzles using SudokuWiki.org's grading system. Use when you need to work on grading sudoku puzzles.
---

# Grading Puzzles - SudokuWiki.org

Source: https://www.sudokuwiki.org/Grading_Puzzles

## Candidate Density

The weighting factor based on 'rounds' has become difficult to maintain with so many puzzle variants. My recent insight in assessing the grading system is to look at candidate density - the total number of candidates on the board at any one step. More unsolved cells means more candidates to search for a pattern. The harder puzzles have more candidates per cell than simpler ones. This seems an ideal measure of the board.

This table is a typical solve path with the number of candidates from start to end.

| Step | Candidates C | F = C / 727 * 20 |
| :--- | :--- | :--- |
| 2 | 219 | 6.0 |
| 3 | 206 | 5.7 |
| 4 | 185 | 5.1 |
| 5 | 162 | 4.4 |
| 6 | 148 | 4.1 |
| 7 | 133 | 3.6 |
| 8 | 123 | 3.4 |
| 9 | 112 | 3.1 |
| 10 | 102 | 2.8 |
| 11 | 96 | 2.6 |
| 12 | 93 | 2.6 |
| 13 | 91 | 2.5 |
| 14 | 84 | 2.3 |
| 15 | 81 | 2.2 |
| 16 | 77 | 2.1 |
| 17 | 74 | 2.0 |
| 18 | 72 | 2.0 |
| 19 | 70 | 1.9 |
| 20 | 68 | 1.9 |
| 21 | 65 | 1.8 |
| 22 | 62 | 1.7 |
| 23 | 58 | 1.6 |
| 24 | 54 | 1.5 |
| 25 | 48 | 1.3 |
| 26 | 39 | 1.1 |
| 27 | 30 | 0.8 |
| 28 | 19 | 0.5 |
| 29 | 14 | 0.4 |
| 30 | 8 | 0.2 |



On a 9x9 board there are 727 total candidate slots. I create a factor by multiplying the fraction C/720 by 20. The factor F is multiplied by the points for that strategy.

Since singles are common and easy and I further reduce their contribution by ignoring how many are found in the step and multiply by 1 and 2 for Naked and Hidden respectively.

## Strategy Scores

**score * factor**

| Strategy | Score |
| :--- | :--- |
| [Naked Singles](https://www.sudokuwiki.org/Getting_Started) | F |
| [Hidden Singles](https://www.sudokuwiki.org/Getting_Started) | F x 2 |
| [Naked Pair](https://www.sudokuwiki.org/Naked_Candidates) | 5 x F |
| [Naked Triple](https://www.sudokuwiki.org/Naked_Candidates) | 10 x F |
| [Hidden Pair](https://www.sudokuwiki.org/Hidden_Candidates) | 10 |
| [Hidden Triple](https://www.sudokuwiki.org/Hidden_Candidates) | 25 |
| [Naked Quad](https://www.sudokuwiki.org/Naked_Candidates) | 40 |
| [Hidden Quad](https://www.sudokuwiki.org/Hidden_Candidates) | 60 |
| [Pointing Pairs](https://www.sudokuwiki.org/Intersection_Removal) | 20 |
| [Line/Box Reduction](https://www.sudokuwiki.org/Intersection_Removal) | 20 |
| [Gurths Theorem](https://www.sudokuwiki.org/gurths_theorem) | 80 |
| [Bi-value Universal Grave](https://www.sudokuwiki.org/BUG) | 30 |
| [X-Wing](https://www.sudokuwiki.org/X_Wing_Strategy) | 30 |
| [Unique Rectangle Type 1](https://www.sudokuwiki.org/Unique_Rectangle) | 20 |
| [Chute Remote Pair](https://www.sudokuwiki.org/Chute_Remote_Pair) | 25 |
| [Simple Colouring](https://www.sudokuwiki.org/Singles_Chains) | 50 |
| [Y-Wing](https://www.sudokuwiki.org/Y_Wing_Strategy) | 50 |
| [Rectangle Elimination](https://www.sudokuwiki.org/Rectangle_Elimination) | 25 |
| [Sword-Fish](https://www.sudokuwiki.org/Sword_Fish_Strategy) | 50 |
| [XYZ Wing](https://www.sudokuwiki.org/XYZ_Wing) | 60 |
| [Tridagon](https://www.sudokuwiki.org/Tridagons) | 60 |
| [X-Cycle](https://www.sudokuwiki.org/X_Cycles) | 60 + chain length |
| [XY-Chain](https://www.sudokuwiki.org/XY_Chains) | 50 + chain length |
| [3D Medusa](https://www.sudokuwiki.org/3D_Medusa) | 80 |
| [Jelly-Fish](https://www.sudokuwiki.org/Jelly_Fish_Strategy) | 80 |
| [Unique Rectangle 2,3,4,5](https://www.sudokuwiki.org/Unique_Rectangles) | 50 |
| [Avoidable Rectangle](https://www.sudokuwiki.org/Avoidable_Rectangles) | 60 |
| [Twinned XY-Chains](https://www.sudokuwiki.org/Twinned_XY_Chains) | 100 |
| [Fireworks](https://www.sudokuwiki.org/Fireworks) | 100 |
| [SK Loops](https://www.sudokuwiki.org/SK_Loops) | 100 |
| [Extended Unique Rectangle](https://www.sudokuwiki.org/Extended_Unique_Rectangles) | 90 |
| [Hidden Unique Rectangle](https://www.sudokuwiki.org/Hidden_Unique_Rectangles) | 100 |
| [WXYZ Wing](https://www.sudokuwiki.org/WXYZ_Wing) | 100 |
| [Aligned Pair Exclusion](https://www.sudokuwiki.org/Aligned_Pair_Exclusion) | 140 |
| [Exocet](https://www.sudokuwiki.org/Exocet) | 300 |
| [Grouped X-Cycle](https://www.sudokuwiki.org/Grouped_X_Cycles) | 100 + chain length |
| [Finned X-Wing](https://www.sudokuwiki.org/Finned_X_Wing) | 160 |
| [Finned Sword-Fish](https://www.sudokuwiki.org/Finned_Swordfish) | 190 |
| [Franken Sword-Fish](https://www.sudokuwiki.org/Franken_Sword_Fish) | 150 |
| [Alternating Infer. Chains](https://www.sudokuwiki.org/Alternating_Inference_Chains) | 100 + chain length |
| [Sue-de-Coq](https://www.sudokuwiki.org/Sue_De_Coq) | 180 |
| [Digit Forcing Chain](https://www.sudokuwiki.org/Digit_Forcing_Chains) | 120 + chain length |
| [Nishio Forcing Chain](https://www.sudokuwiki.org/Nishio_Forcing_Chains) | 120 + chain length |
| [Cell Forcing Chain](https://www.sudokuwiki.org/Cell_Forcing_Chains) | 180 + chain length |
| [Unit Forcing Chain](https://www.sudokuwiki.org/Unit_Forcing_Chains) | 180 + chain length |
| [Almost Locked Sets](https://www.sudokuwiki.org/Almost_Locked_Sets) | 140 |
| [Death Blossom](https://www.sudokuwiki.org/Death_Blossom) | 200 |
| [Pattern Overlay](https://www.sudokuwiki.org/Pattern_Overlay) | 100 |
| [Quad Forcing Chain](https://www.sudokuwiki.org/Quad_Forcing_Chains) | 200 + chain length |
| [Bowman Bingo](https://www.sudokuwiki.org/Bowmans_Bingo) | 100 |

In the old scheme points were awarded for eliminations + extra points for solving a cell. I have come round to the idea that if you have found a pattern then it doesn't really matter how many candidates are removed. Dropping this notion is one of the big changes in the new scheme and it should avoid fruitful strategies inflating a grade.

Now the sum of the scores for each step is the puzzle score. For vanilla Sudoku this gives a score from anywhere between 20 and 12,000+. To reduce any fixation on too many decimal places I normalize the score to a number between 1 and 10 with a log function.

9x9: Log5 (score) * 2

6x6: Log4 (score) * 2

Currently the division of the spectrum of puzzles into the named grades is as follows - and might change in the near future. Most randomly produced puzzles will be easy with extremes being the fewest.

| Grade | Score |
| :--- | :--- |
| Easy | < 3 |
| Normal | 3 to < 4 |
| Medium | 4 to < 5 |
| Hard | 5 to < 7 |
| Expert | 7 to < 9 |
| Master | 9+ |antigravity