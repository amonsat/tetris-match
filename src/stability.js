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
  for (let y = HEIGHT - 1; y >= 0; y -= 1) {
    const width = countRowBlocks(board, y);
    if (width === 0 || width >= MIN_SUPPORT_WIDTH || !hasBlocksAbove(board, y)) {
      continue;
    }

    const collapsed = clearAbove(board, y);
    return { collapsed, weakRow: y, weakWidth: width };
  }

  return { collapsed: 0, weakRow: null, weakWidth: 0 };
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

function clearAbove(board, row) {
  let collapsed = 0;

  for (let y = row - 1; y >= 0; y -= 1) {
    for (let x = 0; x < WIDTH; x += 1) {
      if (board[y][x]) {
        board[y][x] = null;
        collapsed += 1;
      }
    }
  }

  return collapsed;
}
