//! Takuzu / Binairo puzzle generator.
//!
//! Both the grid size and the random seed come from the command line, so a run is reproducible: the same seed and the
//! same size always print the same puzzle and the same clues. See [`takuzu`] for the rules and the search itself.

mod takuzu;

use clap::Parser;
use rand::{RngExt, SeedableRng};
use rand_chacha::ChaCha8Rng;
use std::process::ExitCode;
use takuzu::{MAX_SIZE, MIN_SIZE, Takuzu};

#[derive(Parser)]
#[command(version, about = "Generates a Takuzu / Binairo puzzle and its solution")]
struct Args {
    /// Side length of the grid: an even number from 6 to 16
    #[arg(short = 'n', long, default_value_t = 6, value_parser = parse_size)]
    size: usize,

    /// Seed of the generator; the same seed always gives the same puzzle. A random one is drawn when omitted, and
    /// printed so the run can be replayed
    #[arg(short, long)]
    seed: Option<u64>,

    /// Drop the "all rows and all columns are different" rule
    #[arg(long)]
    allow_duplicate_lines: bool,
}

/// Rejects unusable sizes while parsing, so the error reads like any other clap error.
fn parse_size(raw: &str) -> Result<usize, String> {
    let size: usize = raw
        .parse()
        .map_err(|_| format!("`{raw}` is not a number between {MIN_SIZE} and {MAX_SIZE}"))?;

    Takuzu::check_size(size).map_err(|err| err.to_string())
}

fn main() -> ExitCode {
    let args = Args::parse();
    let takuzu = match Takuzu::new(args.size, !args.allow_duplicate_lines) {
        Ok(takuzu) => takuzu,
        Err(err) => {
            eprintln!("error: {err}");

            return ExitCode::FAILURE;
        },
    };

    let seed = args.seed.unwrap_or_else(|| rand::rng().random());
    let mut rng = ChaCha8Rng::seed_from_u64(seed);

    let Some(solution) = takuzu.generate(&mut rng) else {
        eprintln!("error: no {0}x{0} grid satisfies the rules", takuzu.size());

        return ExitCode::FAILURE;
    };

    let puzzle = takuzu.dig(&solution, &mut rng);
    let cells = takuzu.size() * takuzu.size();

    println!("size  : {0}x{0}", takuzu.size());
    println!("rows  : {} legal", takuzu.rows().len());
    println!("seed  : {seed}");
    println!("clues : {}/{cells}", puzzle.clues());
    println!("\npuzzle\n{}", takuzu.render_puzzle(&puzzle));
    println!("\nsolution\n{}", takuzu.render_grid(&solution));

    ExitCode::SUCCESS
}
