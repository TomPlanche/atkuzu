//! wasm bindings for `/play`: one call generates a puzzle and its solution client-side, no
//! server involved (unlike `/daily`, which stays on the native CLI path in `main.rs`).

use crate::takuzu::Takuzu;
use rand::SeedableRng;
use rand_chacha::ChaCha8Rng;
use wasm_bindgen::prelude::*;

/// A generated puzzle and its solution, flat row-major strings (`.` for a hidden cell in
/// `puzzle`, `0`/`1` only in `solution`) — the same shape `$lib/game/board.ts`'s
/// `chunkRows`/`parseGrid` already consume for `/daily`'s archive files.
#[wasm_bindgen(getter_with_clone)]
pub struct GeneratedPuzzle {
    pub puzzle: String,
    pub solution: String,
}

/// Generates a `size`x`size` puzzle for `seed`. The same seed always yields the same puzzle.
///
/// # Errors
///
/// Returns a `JsError` if `size` is unsupported (see [`Takuzu::check_size`]).
#[wasm_bindgen]
pub fn generate_puzzle(size: usize, seed: u64) -> Result<GeneratedPuzzle, JsError> {
    let takuzu = Takuzu::new(size, true).map_err(|err| JsError::new(&err.to_string()))?;
    let mut rng = ChaCha8Rng::seed_from_u64(seed);

    let Some(solution) = takuzu.generate(&mut rng) else {
        return Err(JsError::new(&format!("no {size}x{size} grid satisfies the rules")));
    };

    let puzzle = takuzu.dig(&solution, &mut rng);

    Ok(GeneratedPuzzle {
        puzzle: takuzu.render_puzzle(&puzzle).replace('\n', ""),
        solution: takuzu.render_grid(&solution).replace('\n', ""),
    })
}
