//! Takuzu / Binairo 6x6: exhaustive enumeration + puzzle generation.
//!
//! Guiding idea: the space of complete 6x6 grids is tiny:
//! 11,222 without the row/column uniqueness rule, 4,140 with it.
//! So everything can be precomputed, no solver needed.
//!
//! Representation: a row = 6 bits (u8), a grid = 6 rows ([u8; 6]) or 36 bits packed into a u64 (bit 6*r + c).

const N: usize = 6;
const FULL: u8 = 0b11_1111;

/// The 14 legal rows: 3 zeros, 3 ones, no triplet.
#[must_use]
pub fn valid_rows() -> Vec<u8> {
    (0u8..=FULL)
        .filter(|&r| {
            r.count_ones() == 3
                && (0..=3).all(|i| {
                    let w = (r >> i) & 0b111; // the 3-bit window at position i

                    w != 0 && w != 0b111 // the window must not be all 0s or all 1s
                })
        })
        .collect()
}

///
/// Recursively generates all valid grids of size `k` x `k`.
///
/// `g` is the current grid being built, `cnt` tracks the number of 1s already placed per column,
/// `rows` is the list of valid rows, `distinct` indicates whether the grid must have distinct rows/columns,
/// and `out` is the list of valid grids.
fn go(
    k: usize,
    g: &mut [u8; N],
    cnt: [u8; N], // number of 1s already placed per column
    rows: &[u8],
    distinct: bool,
    out: &mut Vec<[u8; N]>,
) {
    if k == N {
        if distinct {
            let cols: [u8; N] = core::array::from_fn(|c| (0..N).fold(0u8, |a, r| a | (((g[r] >> c) & 1) << r)));

            for i in 0..N {
                for j in i + 1..N {
                    if cols[i] == cols[j] {
                        return;
                    }
                }
            }
        }

        out.push(*g);

        return;
    }

    'next: for &r in rows {
        // "all rows distinct" rule
        if distinct && g[..k].contains(&r) {
            continue;
        }

        // no three identical cells vertically
        if k >= 2 {
            let ones3 = g[k - 1] & g[k - 2] & r;
            let zeros3 = !g[k - 1] & !g[k - 2] & !r & FULL;

            if ones3 | zeros3 != 0 {
                continue;
            }
        }

        // at most three 0s and three 1s per column
        let mut nc = cnt;
        let placed = u8::try_from(k + 1).expect("k < N, so k + 1 fits in a u8");

        for (c, ones) in nc.iter_mut().enumerate() {
            *ones += (r >> c) & 1;

            if *ones > 3 || placed - *ones > 3 {
                continue 'next;
            }
        }

        g[k] = r;

        go(k + 1, g, nc, rows, distinct, out);
    }
}

/// All valid complete grids. `distinct` enables the "all rows and all columns are different" rule.
#[must_use]
pub fn all_grids(distinct: bool) -> Vec<[u8; N]> {
    let rows = valid_rows();
    let mut out = Vec::new();

    go(0, &mut [0u8; N], [0u8; N], &rows, distinct, &mut out);

    out
}

/// Grid -> 36 bits.
#[must_use]
pub fn pack(g: &[u8; N]) -> u64 {
    (0..N).fold(0u64, |a, r| a | (u64::from(g[r]) << (6 * r)))
}

/// Number of solutions to a puzzle (mask of revealed cells + values), capped at `cap`. With the full table, no solver
/// is needed.
#[must_use]
pub fn count_solutions(table: &[u64], mask: u64, given: u64, cap: usize) -> usize {
    let mut n = 0;

    for &s in table {
        if s & mask == given {
            n += 1;

            if n == cap {
                break;
            }
        }
    }
    n
}

/// Greedy digging: starts from a full grid and removes cells as long as solution uniqueness is preserved. The result is
/// minimal in the inclusion sense (no clue can be removed).
#[must_use]
pub fn dig(table: &[u64], sol: u64, order: &[u8]) -> u64 {
    let mut mask = (1u64 << 36) - 1;

    for &c in order {
        let cand = mask & !(1 << c);

        if count_solutions(table, cand, sol & cand, 2) == 1 {
            mask = cand;
        }
    }

    mask
}

fn main() {
    println!("legal rows              : {}", valid_rows().len());
    println!("grids (no uniqueness)   : {}", all_grids(false).len());

    let table: Vec<u64> = all_grids(true).iter().map(pack).collect();
    println!("grids (with uniqueness) : {}", table.len());
    println!("table size              : {} bytes", table.len() * 8);

    // Example dig with a fixed order (to be replaced with a shuffle).
    let sol = table[0];
    let order: Vec<u8> = (0..36).rev().collect();
    let mask = dig(&table, sol, &order);
    println!("clues left              : {}", mask.count_ones());

    for r in 0..N {
        let line: String = (0..N)
            .map(|c| {
                let b = 6 * r + c;
                if mask >> b & 1 == 0 {
                    '.'
                } else if sol >> b & 1 == 1 {
                    '1'
                } else {
                    '0'
                }
            })
            .collect();
        println!("{line}");
    }
}
