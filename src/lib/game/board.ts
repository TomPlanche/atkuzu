// Shared Takuzu board logic used by both the random /play board and the
// /daily boards. Pure, size-agnostic functions so the two routes can't drift.

/** The only sizes `takuzu-grid-factory` is asked to generate, on either route. */
export type BoardSize = 6 | 8 | 12;

export const BOARD_SIZES: BoardSize[] = [6, 8, 12];

export type Cell = 0 | 1 | null;

export const parseRow = (row: string): Cell[] =>
  row.split("").map((ch) => (ch === "0" ? 0 : ch === "1" ? 1 : null));

export const parseGrid = (rows: string[]): Cell[][] => rows.map(parseRow);

/** Splits a flat row-major board string (as published in daily files) into `size`-char rows. */
export const chunkRows = (flat: string, size: number): string[] =>
  Array.from({ length: size }, (_, r) => flat.slice(r * size, (r + 1) * size));

export const cloneGrid = (grid: Cell[][]): Cell[][] => grid.map((row) => [...row]);

export const getColumn = (grid: Cell[][], c: number): Cell[] => grid.map((row) => row[c]);

export const isFull = (grid: Cell[][]): boolean =>
  grid.every((row) => row.every((c) => c !== null));

/** Row-major, no separators, `0`/`1` only. Matches the ADR's solution encoding. */
export const encodeGrid = (grid: Cell[][]): string =>
  grid.map((row) => row.map((c) => (c === null ? "" : String(c))).join("")).join("");

const checkTriples = (line: Cell[], markAt: (i: number) => void) => {
  for (let i = 0; i < line.length - 2; i++) {
    const [a, b, c] = [line[i], line[i + 1], line[i + 2]];

    if (a !== null && a === b && b === c) {
      markAt(i);
      markAt(i + 1);
      markAt(i + 2);
    }
  }
};

const lineKey = (line: Cell[]) => line.join(",");

/**
 * Live rule check: three in a row, an unbalanced line, or a duplicate line.
 * Marks every cell that takes part in a broken rule. A duplicate line marks
 * the whole line. An unbalanced line marks only the cells holding the value
 * that goes over the limit.
 *
 * @param grid - The current board state.
 * @param size - Board side length.
 * @returns A same-shape grid where each `true` cell breaks a rule.
 */
export const computeInvalid = (grid: Cell[][], size: number): boolean[][] => {
  const invalid = Array.from({ length: size }, () => Array<boolean>(size).fill(false));

  const mark = (r: number, c: number) => {
    invalid[r][c] = true;
  };

  const checkBalance = (line: Cell[], markAt: (i: number) => void) => {
    const zeros = line.filter((v) => v === 0).length;
    const ones = line.filter((v) => v === 1).length;

    const overflowing = zeros > size / 2 ? 0 : ones > size / 2 ? 1 : null;
    if (overflowing !== null) {
      line.forEach((v, i) => {
        if (v === overflowing) {
          markAt(i);
        }
      });
    }
  };

  for (let r = 0; r < size; r++) {
    checkTriples(grid[r], (c) => mark(r, c));
    checkBalance(grid[r], (c) => mark(r, c));
  }

  for (let c = 0; c < size; c++) {
    const column = getColumn(grid, c);

    checkTriples(column, (r) => mark(r, c));
    checkBalance(column, (r) => mark(r, c));
  }

  // Duplicate rows
  for (let i = 0; i < size; i++) {
    if (!grid[i].every((v) => v !== null)) {
      continue;
    }

    for (let j = i + 1; j < size; j++) {
      if (grid[j].every((v) => v !== null) && lineKey(grid[i]) === lineKey(grid[j])) {
        for (let c = 0; c < size; c++) {
          mark(i, c);
          mark(j, c);
        }
      }
    }
  }

  // Duplicate columns
  for (let i = 0; i < size; i++) {
    const colI = getColumn(grid, i);

    if (!colI.every((v) => v !== null)) {
      continue;
    }

    for (let j = i + 1; j < size; j++) {
      const colJ = getColumn(grid, j);
      if (colJ.every((v) => v !== null) && lineKey(colI) === lineKey(colJ)) {
        for (let r = 0; r < size; r++) {
          mark(r, i);
          mark(r, j);
        }
      }
    }
  }

  return invalid;
};
