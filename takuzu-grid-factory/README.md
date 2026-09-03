# takuzu-grid-factory

A Takuzu (Binairo) puzzle generator, written in Rust.

The program builds a complete grid, then removes cells for as long as the puzzle keeps a single solution. The grid size and the random seed both come from the command line, so any run can be replayed.

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

| Option                    | Effect                                                 |
| ------------------------- | ------------------------------------------------------ |
| `-n`, `--size <SIZE>`     | Side length of the grid: 6, 8 or 10. The default is 6. |
| `-s`, `--seed <SEED>`     | Seed of the generator.                                 |
| `--allow-duplicate-lines` | Drop rule 3.                                           |

## Seeds

The same seed and the same size always give the same grid and the same clues. The seed drives two steps: the order of the candidate rows during the build, and the order of the cells during the dig.

Without `--seed`, the program draws a seed from the system entropy and prints it. Copy that number back into a new run to get the same puzzle again.

## How it works

The program keeps no table of grids. Only the legal rows are precomputed: 14 rows for 6x6, 34 for 8x8, and 84 for 10x10. A row is a bitmask in a `u16`, so bit tricks check a whole row at once.

1. `generate` stacks legal rows one by one, in an order drawn from the seed. It drops a branch as soon as a column holds too many 0s, too many 1s, or three identical cells in a row.
2. `count_solutions` counts the grids that match a puzzle, and stops at a cap. The digger only needs to know if the count is 1 or more than 1.
3. `dig` hides one cell at a time, in an order drawn from the seed. It keeps a removal when the puzzle still has one solution. The result is minimal by inclusion: no remaining clue can be removed.

The solver works on cells, not on whole rows. It first fills every forced cell. Two equal cells force their neighbor. A single gap between two equal cells takes the opposite value. A line that already holds its quota of 1s takes 0s everywhere else. When nothing moves anymore, it branches on the most constrained cell left.

A 10x10 puzzle takes a few milliseconds.

## Why the exhaustive table went away

Version 0.1 enumerated every complete 6x6 grid: 11,222 grids without rule 3, and 4,140 with it. The whole table took 33,120 bytes, and a mask plus a scan answered every question. That approach dies with the grid size, because the number of complete grids explodes.

A solver that enumerates legal rows replaced it first. That solver held up to 10x10. A 12x12 run passed two minutes, because a nearly minimal puzzle forces too many row combinations. The cell solver described above replaced it in turn.

## Limits

- The size stops at 10. A `u16` row holds up to 16 columns, but 12x12 digging needs a faster solver first.
- The digger is greedy. It gives a puzzle where no clue is redundant, not the puzzle with the fewest clues.
- The program rates no difficulty. Two puzzles of the same size can ask for very different work.

## Background

The algorithm was familiar before this repository started. Two earlier projects cover the same game:

- [binario_resolver](https://github.com/TomPlanche/binario_resolver): a Binairo solver.
- [binario_rs](https://github.com/TomPlanche/binario_rs): a Binairo game built with Tauri.

This repository keeps the generation side: it does not solve a given grid, it produces new ones.
