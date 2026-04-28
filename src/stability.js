import { countRowBlocks, HEIGHT, WIDTH } from "./board.js";

export const STABLE_ROW_WIDTH = 6;
export const MIN_SUPPORT_WIDTH = 3;
export const SCORE_TARGET = 180;

export function scoreStableRows(board) {
  let points = 0;
  let stableRows = 0;

  for (let y = 0; y < HEIGHT; y += 1) {
    const width = countRowBlocks(board, y);
    if (width >= STABLE_ROW_WIDTH) {
      stableRows += 1;
      points += (width - STABLE_ROW_WIDTH + 1) * 10;
    }
  }

  return { points, stableRows };
}

export function collapseWeakTops(board) {
  const collapse = findWeakCollapse(board);
  if (collapse.cells.length === 0) {
    return { collapsed: 0, weakRow: null, weakWidth: 0, cells: [] };
  }

  clearCells(board, collapse.cells);
  return {
    collapsed: collapse.cells.length,
    weakRow: collapse.weakRow,
    weakWidth: collapse.weakWidth,
    cells: collapse.cells,
  };
}

export function findWeakCollapse(board) {
  for (let y = HEIGHT - 1; y >= 0; y -= 1) {
    const width = countRowBlocks(board, y);
    if (width === 0 || width >= MIN_SUPPORT_WIDTH || !hasBlocksAbove(board, y)) {
      continue;
    }

    return { cells: getCellsAbove(board, y), weakRow: y, weakWidth: width };
  }

  return { cells: [], weakRow: null, weakWidth: 0 };
}

export function getWeakRows(board) {
  const weakRows = new Set();

  for (let y = HEIGHT - 1; y >= 0; y -= 1) {
    const width = countRowBlocks(board, y);
    if (width > 0 && width < MIN_SUPPORT_WIDTH && hasBlocksAbove(board, y)) {
      weakRows.add(y);
    }
  }

  return weakRows;
}

export function getStableRows(board) {
  const stableRows = new Set();

  for (let y = 0; y < HEIGHT; y += 1) {
    if (countRowBlocks(board, y) >= STABLE_ROW_WIDTH) {
      stableRows.add(y);
    }
  }

  return stableRows;
}

function hasBlocksAbove(board, row) {
  for (let y = row - 1; y >= 0; y -= 1) {
    if (board[y].some(Boolean)) {
      return true;
    }
  }
  return false;
}

function getCellsAbove(board, row) {
  const cells = [];

  for (let y = row - 1; y >= 0; y -= 1) {
    for (let x = 0; x < WIDTH; x += 1) {
      if (board[y][x]) {
        cells.push({ x, y, color: board[y][x] });
      }
    }
  }

  return cells;
}

function clearCells(board, cells) {
  for (const { x, y } of cells) {
    board[y][x] = null;
  }
}
