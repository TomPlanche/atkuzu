//! Library half of the crate: the `takuzu` module is shared between the native CLI bin
//! (`main.rs`, used offline by `scripts/generate-daily.ts`) and the wasm bindings (`wasm.rs`,
//! used client-side by `/play`), so the search logic exists in exactly one place.

pub mod takuzu;

#[cfg(target_arch = "wasm32")]
mod wasm;
