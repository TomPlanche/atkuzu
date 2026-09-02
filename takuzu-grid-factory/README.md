# takuzu-grid-factory

A Takuzu (Binairo) puzzle generator for 6x6 grids, written in Rust.

Version 0.1 builds every valid 6x6 grid, then removes cells from one grid for as long as the puzzle keeps a single solution.

## The rules

A complete Takuzu grid follows three rules:

1. Each row and each column holds as many 0s as 1s.
2. No row and no column holds three identical cells in a row.
3. All rows are different, and all columns are different.

Rule 3 is optional in some variants. The code accepts both cases through the `distinct` flag.

## How it works

The set of complete 6x6 grids is small: 11,222 grids without rule 3, and 4,140 grids with it. A solver is therefore not needed. The program enumerates the whole set once, and answers every later question by a scan of that table.

1. `valid_rows` lists the 14 legal rows. A row is 6 bits in a `u8`.
2. `all_grids` stacks legal rows one by one. It drops a branch as soon as a column holds four 0s, four 1s, or three identical cells in a row.
3. `pack` writes a grid as 36 bits in a `u64`. Bit `6 * r + c` holds the cell at row `r` and column `c`. The full table takes 33,120 bytes.
4. `count_solutions` masks the table with the revealed cells and counts the grids that match. The count stops at a cap, because the digger only needs to know if the count is 1 or more.
5. `dig` starts from a complete grid and hides one cell at a time. It keeps a removal when the puzzle still has one solution. The result is minimal: no clue can be removed.

## Run it

```sh
cargo run --release
```

The program prints the size of each set, then the dug puzzle. A dot marks a hidden cell.

```
legal rows              : 14
grids (no uniqueness)   : 11222
grids (with uniqueness) : 4140
table size              : 33120 bytes
clues left              : 9
11.1..
1.11..
.1....
11....
......
......
```

## Limits of v0.1

- The grid size is fixed. `N` exists as a constant, but the row type (`u8`) and the packed grid (`u64`) also assume 6 columns.
- The output never changes. The program always picks the first grid of the table and digs in a fixed order, so 50 runs give the same puzzle.
- The dig order is not seeded, so a run cannot be replayed on purpose.

The next version answers these three points: a grid size given on the command line, and a seed that makes a run reproducible.

## Background

The algorithm was familiar before this repository started. Two earlier projects cover the same game:

- [binario_resolver](https://github.com/TomPlanche/binario_resolver): a Binairo solver.
- [binario_rs](https://github.com/TomPlanche/binario_rs): a Binairo game built with Tauri.

This repository keeps the generation side: it does not solve a given grid, it produces new ones.
