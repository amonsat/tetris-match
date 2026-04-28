export const WIDTH = 10;
export const HEIGHT = 20;

export function createBoard() {
  return Array.from({ length: HEIGHT }, () => Array(WIDTH).fill(null));
}

export function canPlace(board, cells) {
  return cells.every(({ x, y }) => {
    if (x < 0 || x >= WIDTH || y >= HEIGHT) {
      return false;
    }
    return y < 0 || board[y][x] === null;
  });
}

export function lockPiece(board, cells) {
  for (const cell of cells) {
    if (cell.y >= 0 && cell.y < HEIGHT) {
      board[cell.y][cell.x] = cell.color;
    }
  }
}

export function getTowerHeight(board) {
  const firstFilledRow = board.findIndex((row) => row.some(Boolean));
  return firstFilledRow === -1 ? 0 : HEIGHT - firstFilledRow;
}

export function reachesTop(board) {
  return board[0].some(Boolean);
}

export function countRowBlocks(board, y) {
  return board[y].filter(Boolean).length;
}
