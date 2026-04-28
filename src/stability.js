import { countRowBlocks, HEIGHT, WIDTH } from "./board.js";

export const MIN_SUPPORT_WIDTH = 3;

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
