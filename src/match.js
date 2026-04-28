import { HEIGHT, WIDTH } from "./board.js";

const DIRECTIONS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

export function resolveMatches(board, minGroupSize = 3) {
  let totalBurned = 0;
  let combo = 0;

  while (true) {
    const groups = findGroups(board, minGroupSize);
    if (groups.length === 0) {
      break;
    }

    combo += 1;
    for (const group of groups) {
      for (const { x, y } of group) {
        board[y][x] = null;
        totalBurned += 1;
      }
    }

    applyGravity(board);
  }

  return { burned: totalBurned, combo };
}

export function findGroups(board, minGroupSize) {
  const visited = Array.from({ length: HEIGHT }, () => Array(WIDTH).fill(false));
  const groups = [];

  for (let y = 0; y < HEIGHT; y += 1) {
    for (let x = 0; x < WIDTH; x += 1) {
      const color = board[y][x];
      if (!color || visited[y][x]) {
        continue;
      }

      const group = floodFill(board, visited, x, y, color);
      if (group.length >= minGroupSize) {
        groups.push(group);
      }
    }
  }

  return groups;
}

function floodFill(board, visited, startX, startY, color) {
  const stack = [{ x: startX, y: startY }];
  const group = [];
  visited[startY][startX] = true;

  while (stack.length > 0) {
    const cell = stack.pop();
    group.push(cell);

    for (const [dx, dy] of DIRECTIONS) {
      const x = cell.x + dx;
      const y = cell.y + dy;
      if (x < 0 || x >= WIDTH || y < 0 || y >= HEIGHT) {
        continue;
      }
      if (visited[y][x] || board[y][x] !== color) {
        continue;
      }
      visited[y][x] = true;
      stack.push({ x, y });
    }
  }

  return group;
}

export function removeCells(board, cells) {
  for (const { x, y } of cells) {
    board[y][x] = null;
  }
}

export function applyGravity(board) {
  for (let x = 0; x < WIDTH; x += 1) {
    const column = [];
    for (let y = HEIGHT - 1; y >= 0; y -= 1) {
      if (board[y][x]) {
        column.push(board[y][x]);
      }
    }

    for (let y = HEIGHT - 1; y >= 0; y -= 1) {
      board[y][x] = column[HEIGHT - 1 - y] ?? null;
    }
  }
}
