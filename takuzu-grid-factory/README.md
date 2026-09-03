# takuzu-grid-factory

A Takuzu (Binairo) puzzle generator, written in Rust.

The program builds a complete grid, then removes cells for as long as the puzzle keeps a single solution. It handles every even size from 6x6 to 16x16. The grid size and the random seed both come from the command line, so any run can be replayed.

## The rules

A complete Takuzu grid follows three rules:

1. Each row and each column holds as many 0s as 1s.
2. No row and no column holds three identical cells in a row.
3. All rows are different, and all columns are different.

Rule 3 is optional in some variants. The flag `--allow-duplicate-lines` drops it.

## Run it

```sh
cargo run --release -- --size 6 --seed 42
```

```
size  : 6x6
rows  : 14 legal
seed  : 42
clues : 9/36

puzzle
1..00.
...0..
.0..1.
......
..1..0
....0.

solution
101001
010011
100110
001101
011010
110100
```

A dot marks a hidden cell. The `rows` line gives the number of legal rows for that size.

| Option | Effect |
| --- | --- |
| `-n`, `--size <SIZE>` | Side length of the grid: an even number from 6 to 16. The default is 6. |
| `-s`, `--seed <SEED>` | Seed of the generator. |
| `--allow-duplicate-lines` | Drop rule 3. |

## Seeds

The same seed and the same size always give the same grid and the same clues. The seed drives two steps: the value tried first on each branching cell, and the order of the cells during the dig.

Without `--seed`, the program draws a seed from the system entropy and prints it. Copy that number back into a new run to get the same puzzle again.

The thread count changes nothing in the result. A run with `RAYON_NUM_THREADS=1` prints the same puzzle as a run on every core.

## Speed

Times of a release build on 12 cores, over 8 seeds per size.

| Size | Median | Slowest seed |
| --- | --- | --- |
| 6x6 to 12x12 | under 0.02 s | 0.04 s |
| 14x14 | 0.07 s | 1.4 s |
| 16x16 | 1.3 s | 20 s |

The cost of a size changes a lot from one seed to the next, because it depends on the puzzle the dig walks into. A hard 16x16 keeps one uniqueness proof busy for seconds.

## How it works

The program keeps no table of grids. Only the legal rows are precomputed, as a statistic on the size: 14 rows for 6x6, 84 for 10x10, and 1,296 for 16x16.

One search does all the work. It runs on cells, not on whole rows.

1. It fills every forced cell. Two equal cells force their neighbor. A single gap between two equal cells takes the opposite value. A line that already holds its quota of 1s takes 0s everywhere else.
2. It drops the branch if a line breaks a rule, or if two complete lines of the same kind hold the same values.
3. When nothing moves anymore, it branches on the most constrained cell left, which is the cell in the emptiest row and column.

`generate` runs that search until the first complete grid. The seed picks the value tried first on each cell.

`dig` hides one cell at a time, in an order drawn from the seed. It keeps a removal when the puzzle still has one solution. The result is minimal by inclusion: no remaining clue can be removed.

`count_solutions` runs the same search and counts the grids that match a puzzle. It stops at a cap, because the digger only needs to know if the count is 1 or more than 1.

## Parallelism

The top of the search tree runs on the rayon pool. Each branching cell splits into two tasks while the depth stays under `PARALLEL_DEPTH`. Deeper nodes stay on one thread, where the work no longer pays for a task.

That tree is very uneven, so a shallow cut leaves one thread with most of the work. Measured on a 16x16 dig, a cut at depth 3 takes 26 s, and depth 5 takes 16 s. Depth 11 takes 9 s, and the curve flattens around 20.

The counter of solutions is atomic, and the cap only clamps the value the caller reads. Two threads can therefore pass the cap together without any change to the answer.

## What changed since v0.1

Version 0.1 enumerated every complete 6x6 grid: 11,222 grids without rule 3, and 4,140 with it. The whole table took 33,120 bytes, and a mask plus a scan answered every question. That approach dies with the grid size, because the number of complete grids explodes.

The work then went through three steps:

1. A solver that stacks legal rows replaced the table. It held up to 10x10. A 12x12 run passed two minutes, because a nearly minimal puzzle forces it to try too many row combinations.
2. The cell search with propagation replaced that solver. Digging became cheap. The generator still stacked rows, and it needed 18 s to build one 12x12 grid on an unlucky seed.
3. The generator moved to the same cell search, and the duplicate-line rule now stops a branch as soon as two complete lines match. That same 12x12 grid now takes 0.13 ms.

Rayon came last. It is what brings 16x16 into range.

## Tests

```sh
cargo test
```

The suite counts every complete 6x6 grid with the current solver. It finds 4,140 and 11,222 again, the numbers of the old exhaustive enumeration. The other tests check the rules on generated grids of every supported size, the minimality of the dug puzzles, and the reproducibility of a seed.

## Limits

- The size stops at 16, because a row is a bitmask in a `u16`.
- A 16x16 run can take 20 s on an unlucky seed. The dig is the part that pays.
- The digger is greedy. It gives a puzzle where no clue is redundant, not the puzzle with the fewest clues.
- The program rates no difficulty. Two puzzles of the same size can ask for very different work.

## Background

The algorithm was familiar before this repository started. Two earlier projects cover the same game:

- [binario_resolver](https://github.com/TomPlanche/binario_resolver): a Binairo solver.
- [binario_rs](https://github.com/TomPlanche/binario_rs): a Binairo game built with Tauri.

This repository keeps the generation side: it does not solve a given grid, it produces new ones.
