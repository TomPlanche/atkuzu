//! Takuzu / Binairo core, generic over the grid size.
//!
//! Representation: a row is a `u16` bitmask (bit `c` is the cell at column `c`) and a grid is `size` rows, so every
//! rule is checked on whole rows with bit tricks. The size is a runtime value carried by [`Takuzu`], not a constant.
//! Supported sizes are the even numbers from 6 to 16, the widest row a `u16` holds.
//!
//! Nothing is precomputed beyond the list of legal rows, which serves as a size statistic. The number of complete
//! grids explodes with the size (11,222 for 6x6 without the uniqueness rule, orders of magnitude more beyond), so one
//! search builds the grid and the same search, capped at two solutions, validates the puzzle. Its top levels run on
//! the rayon pool.

use rand::{Rng, RngExt, seq::SliceRandom};
use std::fmt;
use std::sync::atomic::{AtomicUsize, Ordering};

/// Smallest supported grid size.
pub const MIN_SIZE: usize = 6;

/// Largest supported grid size: a whole row must fit in a [`Row`].
pub const MAX_SIZE: usize = 16;

/// One row of a grid: bit `c` holds the cell at column `c`.
pub type Row = u16;

/// Cell value standing for "not decided yet" while solving.
const UNKNOWN: u8 = 2;

/// Depth under which the search splits its two branches across the rayon pool.
///
/// The tree is very uneven, so a shallow cut leaves one thread with most of the work. Measured on a 16x16 dig, 3 gives
/// 26 s, 5 gives 16 s, 11 gives 9 s, and the curve flattens around 20. Small grids never go that deep.
const PARALLEL_DEPTH: usize = 20;

/// Rejected grid size, with the offending value.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct InvalidSize(pub usize);

impl fmt::Display for InvalidSize {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(
            f,
            "invalid size {}: it must be even, and between {MIN_SIZE} and {MAX_SIZE}",
            self.0
        )
    }
}

impl std::error::Error for InvalidSize {}

/// A puzzle: which cells are revealed, and what they hold.
///
/// `values[r]` only carries the bits set in `mask[r]`; the hidden cells are always 0.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Puzzle {
    /// Revealed cells, one bitmask per row.
    pub mask: Vec<Row>,
    /// Values of the revealed cells, one bitmask per row.
    pub values: Vec<Row>,
}

impl Puzzle {
    /// Number of revealed cells.
    #[must_use]
    pub fn clues(&self) -> u32 {
        self.mask.iter().map(|m| m.count_ones()).sum()
    }
}

/// The rules of a Takuzu board of a given size.
#[derive(Debug, Clone)]
pub struct Takuzu {
    size: usize,
    /// Mask of the `size` low bits.
    full: Row,
    /// `size / 2`: the number of 1s, and of 0s, in every line.
    half: u8,
    /// Every legal row for this size.
    rows: Vec<Row>,
    /// Whether the "all rows and all columns are different" rule applies.
    distinct_lines: bool,
}

impl Takuzu {
    /// Builds the rules for a `size` x `size` board.
    ///
    /// # Errors
    ///
    /// Returns [`InvalidSize`] when `size` is odd, below [`MIN_SIZE`] or above [`MAX_SIZE`].
    pub fn new(size: usize, distinct_lines: bool) -> Result<Self, InvalidSize> {
        Self::check_size(size)?;

        let bits = u32::try_from(size).map_err(|_| InvalidSize(size))?;
        let half = u8::try_from(size / 2).map_err(|_| InvalidSize(size))?;
        let full = Row::MAX >> (Row::BITS - bits);
        let rows = (0..=full).filter(|&r| Self::is_legal_row(r, size, half)).collect();

        Ok(Self {
            size,
            full,
            half,
            rows,
            distinct_lines,
        })
    }

    /// Checks a grid size without building anything, for early validation such as CLI parsing.
    ///
    /// # Errors
    ///
    /// Returns [`InvalidSize`] when `size` is odd, below [`MIN_SIZE`] or above [`MAX_SIZE`].
    pub const fn check_size(size: usize) -> Result<usize, InvalidSize> {
        if size < MIN_SIZE || size > MAX_SIZE || !size.is_multiple_of(2) {
            return Err(InvalidSize(size));
        }

        Ok(size)
    }

    /// Board side length.
    #[must_use]
    pub const fn size(&self) -> usize {
        self.size
    }

    /// Every legal row: balanced, and without three identical cells in a row.
    #[must_use]
    pub fn rows(&self) -> &[Row] {
        &self.rows
    }

    /// A line is legal when it is balanced and holds no run of three identical cells.
    fn is_legal_row(row: Row, size: usize, half: u8) -> bool {
        row.count_ones() == u32::from(half)
            && (0..size - 2).all(|i| {
                let window = (row >> i) & 0b111;

                window != 0 && window != 0b111
            })
    }

    /// Builds one complete grid, drawing the value of each branching cell from `rng`.
    ///
    /// The same seed always yields the same grid. The search is the solver of [`Self::count_solutions`] stopped on its
    /// first solution: stacking legal rows instead looks simpler, but it backtracks so much past 12x12 that building a
    /// single 14x14 grid took seconds.
    ///
    /// Returns `None` only if the rules admit no grid at all, which cannot happen for the supported sizes.
    #[must_use]
    pub fn generate<R: Rng + ?Sized>(&self, rng: &mut R) -> Option<Vec<Row>> {
        // One value preference per cell: the search tries that value first, which is where the randomness comes from.
        let cells = self.size * self.size;
        let first: Vec<u8> = (0..cells).map(|_| u8::from(rng.random_bool(0.5))).collect();
        let board = self.build(&vec![UNKNOWN; cells], &first)?;

        Some(
            (0..self.size)
                .map(|r| (0..self.size).fold(0, |acc, c| acc | (Row::from(board[r * self.size + c]) << c)))
                .collect(),
        )
    }

    /// Depth-first search for the first complete board, trying `first[cell]` before the other value.
    fn build(&self, board: &[u8], first: &[u8]) -> Option<Vec<u8>> {
        let mut board = board.to_vec();

        if !self.propagate(&mut board) {
            return None;
        }

        let Some(cell) = self.most_constrained_cell(&board) else {
            return Some(board);
        };

        for value in [first[cell], 1 - first[cell]] {
            board[cell] = value;

            if let Some(complete) = self.build(&board, first) {
                return Some(complete);
            }
        }

        None
    }

    /// Number of grids matching `puzzle`, stopping at `cap`.
    ///
    /// A puzzle is well formed when this returns 1 for `cap = 2`.
    ///
    /// The search works on cells rather than on whole rows: it fills in the forced cells (two equal cells force their
    /// neighbour, a gap between two equal cells is forced, a line already holding its `size / 2` 1s is completed with
    /// 0s) until nothing moves, then branches on the most constrained cell left. Enumerating legal rows would be
    /// shorter to write, but its cost explodes past 10x10, and proving that a nearly minimal puzzle has a single
    /// solution is exactly what [`Self::dig`] asks for on every cell.
    ///
    /// The top of that search runs on the rayon pool, which is what makes 14x14 and 16x16 practical. The result does
    /// not depend on the thread count: the counter is atomic and the cap only clamps the returned value, so a given
    /// seed always yields the same puzzle.
    #[must_use]
    pub fn count_solutions(&self, puzzle: &Puzzle, cap: usize) -> usize {
        let mut board = vec![UNKNOWN; self.size * self.size];

        for (r, (&mask, &values)) in puzzle.mask.iter().zip(&puzzle.values).enumerate() {
            for c in 0..self.size {
                if mask >> c & 1 == 1 {
                    board[r * self.size + c] = u8::from(values >> c & 1 == 1);
                }
            }
        }

        let found = AtomicUsize::new(0);

        self.count(&board, cap, &found, 0);

        // Threads racing past the cap may overshoot it, so the caller still sees exactly what a single thread counts.
        found.load(Ordering::Relaxed).min(cap)
    }

    /// Cell `i` of `line`, where lines are the `size` rows followed by the `size` columns.
    const fn line_cell(&self, line: usize, i: usize) -> usize {
        if line < self.size {
            line * self.size + i
        } else {
            i * self.size + line - self.size
        }
    }

    /// Depth-first count of the boards completing `board`, stopping once `found` reaches `cap`.
    ///
    /// The two branches of a cell run in parallel while `depth` stays under [`PARALLEL_DEPTH`], which splits the tree
    /// into at most 2^[`PARALLEL_DEPTH`] tasks for the rayon pool to steal from. Deeper nodes stay sequential, where
    /// the work no longer pays for a task.
    fn count(&self, board: &[u8], cap: usize, found: &AtomicUsize, depth: usize) {
        if found.load(Ordering::Relaxed) >= cap {
            return;
        }

        let mut board = board.to_vec();

        if !self.propagate(&mut board) {
            return;
        }

        let Some(cell) = self.most_constrained_cell(&board) else {
            found.fetch_add(1, Ordering::Relaxed);

            return;
        };

        let mut zero = board.clone();
        zero[cell] = 0;
        board[cell] = 1;

        if depth < PARALLEL_DEPTH {
            rayon::join(
                || self.count(&zero, cap, found, depth + 1),
                || self.count(&board, cap, found, depth + 1),
            );

            return;
        }

        self.count(&zero, cap, found, depth + 1);

        if found.load(Ordering::Relaxed) < cap {
            self.count(&board, cap, found, depth + 1);
        }
    }

    /// Fills in every forced cell, and reports whether the board is still consistent.
    fn propagate(&self, board: &mut [u8]) -> bool {
        let mut changed = true;

        while changed {
            changed = false;

            for line in 0..2 * self.size {
                if !self.propagate_line(line, board, &mut changed) {
                    return false;
                }
            }
        }

        !self.duplicate_lines(board)
    }

    /// Applies the "no three identical cells" rule and the balance rule to one line.
    fn propagate_line(&self, line: usize, board: &mut [u8], changed: &mut bool) -> bool {
        for i in 0..self.size - 2 {
            let window = [
                self.line_cell(line, i),
                self.line_cell(line, i + 1),
                self.line_cell(line, i + 2),
            ];
            let values = window.map(|cell| board[cell]);
            let holes = values.iter().map(|&v| usize::from(v == UNKNOWN)).sum::<usize>();

            if holes == 0 {
                if values[0] == values[1] && values[1] == values[2] {
                    return false;
                }

                continue;
            }

            if holes > 1 {
                continue;
            }

            let hole = values
                .iter()
                .position(|&v| v == UNKNOWN)
                .expect("exactly one unknown cell");
            let (left, right) = match hole {
                0 => (values[1], values[2]),
                1 => (values[0], values[2]),
                _ => (values[0], values[1]),
            };

            if left == right {
                board[window[hole]] = 1 - left;
                *changed = true;
            }
        }

        let mut ones = 0;
        let mut zeros = 0;

        for i in 0..self.size {
            match board[self.line_cell(line, i)] {
                1 => ones += 1,
                0 => zeros += 1,
                _ => {},
            }
        }

        if ones > self.half || zeros > self.half {
            return false;
        }

        let fill = if ones == self.half {
            0
        } else if zeros == self.half {
            1
        } else {
            return true;
        };

        for i in 0..self.size {
            let cell = self.line_cell(line, i);

            if board[cell] == UNKNOWN {
                board[cell] = fill;
                *changed = true;
            }
        }

        true
    }

    /// The unknown cell sitting in the emptiest row and column, or `None` once the board is complete.
    fn most_constrained_cell(&self, board: &[u8]) -> Option<usize> {
        let holes: Vec<usize> = (0..2 * self.size)
            .map(|line| {
                (0..self.size)
                    .filter(|&i| board[self.line_cell(line, i)] == UNKNOWN)
                    .count()
            })
            .collect();

        (0..board.len())
            .filter(|&cell| board[cell] == UNKNOWN)
            .min_by_key(|&cell| holes[cell / self.size] + holes[self.size + cell % self.size])
    }

    /// Reports whether two complete lines of the same kind hold the same values, which the third rule forbids.
    ///
    /// Checking this on every node, and not only on a finished board, is what keeps the search from thrashing: a
    /// duplicate row found at the leaf sends the search back to a branch that rebuilds almost the same board.
    fn duplicate_lines(&self, board: &[u8]) -> bool {
        if !self.distinct_lines {
            return false;
        }

        let mut values = [0; 2 * MAX_SIZE];
        let mut complete = [false; 2 * MAX_SIZE];

        for line in 0..2 * self.size {
            let cells = (0..self.size).map(|i| board[self.line_cell(line, i)]);

            complete[line] = true;

            for (i, cell) in cells.enumerate() {
                if cell == UNKNOWN {
                    complete[line] = false;

                    break;
                }

                values[line] |= Row::from(cell) << i;
            }
        }

        let same = |i: usize, j: usize| complete[i] && complete[j] && values[i] == values[j];

        (0..self.size).any(|i| (i + 1..self.size).any(|j| same(i, j)))
            || (self.size..2 * self.size).any(|i| (i + 1..2 * self.size).any(|j| same(i, j)))
    }

    /// Every cell revealed: the starting point of [`Self::dig`].
    #[must_use]
    pub fn full_puzzle(&self, solution: &[Row]) -> Puzzle {
        Puzzle {
            mask: vec![self.full; self.size],
            values: solution.to_vec(),
        }
    }

    /// Greedy digging: hides cells in an order derived from `rng`, keeping every removal that preserves solution
    /// uniqueness. The result is minimal by inclusion, meaning no remaining clue can be removed.
    ///
    /// The same seed and the same solution always yield the same clues.
    #[must_use]
    pub fn dig<R: Rng + ?Sized>(&self, solution: &[Row], rng: &mut R) -> Puzzle {
        let mut puzzle = self.full_puzzle(solution);
        let mut cells: Vec<(usize, usize)> = (0..self.size)
            .flat_map(|r| (0..self.size).map(move |c| (r, c)))
            .collect();

        cells.shuffle(rng);

        for (r, c) in cells {
            let bit: Row = 1 << c;

            puzzle.mask[r] &= !bit;
            puzzle.values[r] &= !bit;

            if self.count_solutions(&puzzle, 2) != 1 {
                puzzle.mask[r] |= bit;
                puzzle.values[r] |= solution[r] & bit;
            }
        }

        puzzle
    }

    /// Renders a complete grid as `size` lines of 0s and 1s.
    #[must_use]
    pub fn render_grid(&self, grid: &[Row]) -> String {
        self.render(grid, &vec![self.full; self.size])
    }

    /// Renders a puzzle, hidden cells shown as `.`.
    #[must_use]
    pub fn render_puzzle(&self, puzzle: &Puzzle) -> String {
        self.render(&puzzle.values, &puzzle.mask)
    }

    fn render(&self, values: &[Row], mask: &[Row]) -> String {
        (0..self.size)
            .map(|r| {
                (0..self.size)
                    .map(|c| {
                        if mask[r] >> c & 1 == 0 {
                            '.'
                        } else if values[r] >> c & 1 == 1 {
                            '1'
                        } else {
                            '0'
                        }
                    })
                    .collect::<String>()
            })
            .collect::<Vec<_>>()
            .join("\n")
    }
}

#[cfg(test)]
mod tests {
    use super::{InvalidSize, MAX_SIZE, MIN_SIZE, Puzzle, Row, Takuzu};
    use rand::SeedableRng;
    use rand_chacha::ChaCha8Rng;

    fn rules(size: usize) -> Takuzu {
        Takuzu::new(size, true).expect("supported size")
    }

    fn empty_puzzle(size: usize) -> Puzzle {
        Puzzle {
            mask: vec![0; size],
            values: vec![0; size],
        }
    }

    /// Recomputes every rule from scratch, independently of the bit tricks used during the search.
    fn is_valid(size: usize, grid: &[Row], distinct_lines: bool) -> bool {
        let cell = |r: usize, c: usize| (grid[r] >> c) & 1;
        let lines: Vec<Vec<u16>> = (0..size)
            .map(|r| (0..size).map(|c| cell(r, c)).collect())
            .chain((0..size).map(|c| (0..size).map(|r| cell(r, c)).collect()))
            .collect();

        let balanced = lines.iter().all(|l| l.iter().filter(|&&v| v == 1).count() * 2 == size);
        let no_triple = lines.iter().all(|l| l.windows(3).all(|w| w[0] != w[1] || w[1] != w[2]));
        let distinct = !distinct_lines
            || (lines[..size].iter().collect::<std::collections::HashSet<_>>().len() == size
                && lines[size..].iter().collect::<std::collections::HashSet<_>>().len() == size);

        balanced && no_triple && distinct
    }

    #[test]
    fn rejects_unsupported_sizes() {
        assert_eq!(Takuzu::new(7, true).unwrap_err(), InvalidSize(7));
        assert_eq!(Takuzu::new(MIN_SIZE - 2, true).unwrap_err(), InvalidSize(MIN_SIZE - 2));
        assert_eq!(Takuzu::new(MAX_SIZE + 2, true).unwrap_err(), InvalidSize(MAX_SIZE + 2));
        assert!(Takuzu::new(MIN_SIZE, true).is_ok());
        assert!(Takuzu::new(MAX_SIZE, true).is_ok());
    }

    #[test]
    fn legal_row_counts_match_known_values() {
        assert_eq!(rules(6).rows().len(), 14);
        assert_eq!(rules(8).rows().len(), 34);
        assert_eq!(rules(10).rows().len(), 84);
        assert_eq!(rules(12).rows().len(), 208);
        assert_eq!(rules(14).rows().len(), 518);
        assert_eq!(rules(16).rows().len(), 1296);
    }

    /// The reference numbers of complete 6x6 grids, as counted by the previous exhaustive enumeration.
    #[test]
    fn counts_every_6x6_grid() {
        assert_eq!(rules(6).count_solutions(&empty_puzzle(6), usize::MAX), 4140);

        let loose = Takuzu::new(6, false).expect("supported size");

        assert_eq!(loose.count_solutions(&empty_puzzle(6), usize::MAX), 11_222);
    }

    #[test]
    fn generates_valid_grids() {
        for size in [6, 8, 10, 12, 14, 16] {
            let takuzu = rules(size);
            let mut rng = ChaCha8Rng::seed_from_u64(u64::try_from(size).unwrap());
            let grid = takuzu.generate(&mut rng).expect("a grid exists");

            assert!(is_valid(size, &grid, true), "invalid {size}x{size} grid: {grid:?}");
        }
    }

    #[test]
    fn same_seed_gives_the_same_puzzle() {
        let takuzu = rules(8);
        let run = |seed| {
            let mut rng = ChaCha8Rng::seed_from_u64(seed);
            let grid = takuzu.generate(&mut rng).expect("a grid exists");
            let puzzle = takuzu.dig(&grid, &mut rng);

            (grid, puzzle)
        };

        assert_eq!(run(42), run(42));
        assert_ne!(run(42), run(43));
    }

    #[test]
    fn dug_puzzles_are_unique_and_minimal() {
        for size in [6, 8, 10] {
            let takuzu = rules(size);
            let mut rng = ChaCha8Rng::seed_from_u64(7);
            let solution = takuzu.generate(&mut rng).expect("a grid exists");
            let puzzle = takuzu.dig(&solution, &mut rng);

            assert_eq!(
                takuzu.count_solutions(&puzzle, 2),
                1,
                "{size}x{size} puzzle is not unique"
            );

            for r in 0..size {
                for c in 0..size {
                    let bit: Row = 1 << c;

                    if puzzle.mask[r] & bit == 0 {
                        continue;
                    }

                    let mut smaller = puzzle.clone();
                    smaller.mask[r] &= !bit;
                    smaller.values[r] &= !bit;

                    assert!(
                        takuzu.count_solutions(&smaller, 2) > 1,
                        "clue ({r}, {c}) of the {size}x{size} puzzle is redundant"
                    );
                }
            }
        }
    }

    #[test]
    fn renders_hidden_cells_as_dots() {
        let takuzu = rules(6);
        let mut rng = ChaCha8Rng::seed_from_u64(1);
        let solution = takuzu.generate(&mut rng).expect("a grid exists");
        let puzzle = takuzu.dig(&solution, &mut rng);
        let rendered = takuzu.render_puzzle(&puzzle);

        assert_eq!(rendered.lines().count(), 6);
        assert!(rendered.lines().all(|l| l.chars().count() == 6));
        assert_eq!(
            u32::try_from(rendered.matches(['0', '1']).count()).unwrap(),
            puzzle.clues()
        );
        assert!(
            takuzu
                .render_grid(&solution)
                .chars()
                .all(|c| c == '0' || c == '1' || c == '\n')
        );
    }
}
