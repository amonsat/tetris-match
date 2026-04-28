import { countRowBlocks, HEIGHT, WIDTH } from "./board.js";

export const MIN_SUPPORT_WIDTH = 3;
export const MASS_PER_SUPPORT = 6;
export const FLOOR_BOOST_MULTIPLIER = 2;

export function findCollapseCells(board, rules) {
  const cells = new Map();

  if (rules.narrowSupport) {
    addCells(cells, findWeakCollapse(board).cells);
  }

  if (rules.floatingIslands) {
    addCells(cells, findFloatingIslands(board).cells);
  }

  if (rules.overhangs) {
    addCells(cells, findWideOverhang(board).cells);
  }

  if (rules.centerMass) {
    addCells(cells, findBadCenterMass(board).cells);
  }

  if (rules.massSupport) {
    addCells(cells, findOverloadedSupport(board, rules.massPerSupport, rules.fullRowMode).cells);
  }

  return { cells: [...cells.values()] };
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

function findFloatingIslands(board) {
  const supported = Array.from({ length: HEIGHT }, () => Array(WIDTH).fill(false));
  const stack = [];

  for (let x = 0; x < WIDTH; x += 1) {
    if (board[HEIGHT - 1][x]) {
      supported[HEIGHT - 1][x] = true;
      stack.push({ x, y: HEIGHT - 1 });
    }
  }

  while (stack.length > 0) {
    const cell = stack.pop();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const x = cell.x + dx;
      const y = cell.y + dy;
      if (x < 0 || x >= WIDTH || y < 0 || y >= HEIGHT) {
        continue;
      }
      if (!board[y][x] || supported[y][x]) {
        continue;
      }
      supported[y][x] = true;
      stack.push({ x, y });
    }
  }

  const cells = [];
  for (let y = 0; y < HEIGHT; y += 1) {
    for (let x = 0; x < WIDTH; x += 1) {
      if (board[y][x] && !supported[y][x]) {
        cells.push({ x, y, color: board[y][x] });
      }
    }
  }

  return { cells };
}

function findWideOverhang(board) {
  for (let y = HEIGHT - 2; y >= 0; y -= 1) {
    const rowWidth = countRowBlocks(board, y);
    const supportWidth = countRowBlocks(board, y + 1);
    if (rowWidth >= supportWidth + 2 && supportWidth > 0) {
      return { cells: getCellsAbove(board, y + 1) };
    }
  }

  return { cells: [] };
}

function findBadCenterMass(board) {
  const firstFilledRow = board.findIndex((row) => row.some(Boolean));
  if (firstFilledRow === -1 || firstFilledRow === HEIGHT - 1) {
    return { cells: [] };
  }

  for (let supportY = HEIGHT - 1; supportY > firstFilledRow; supportY -= 1) {
    const supportXs = getFilledXs(board, supportY);
    if (supportXs.length === 0 || !hasBlocksAbove(board, supportY)) {
      continue;
    }

    const upperCells = getCellsAbove(board, supportY);
    const center = upperCells.reduce((sum, cell) => sum + cell.x, 0) / upperCells.length;
    const minSupport = Math.min(...supportXs) - 0.5;
    const maxSupport = Math.max(...supportXs) + 0.5;

    if (center < minSupport || center > maxSupport) {
      return { cells: upperCells };
    }
  }

  return { cells: [] };
}

function findOverloadedSupport(board, massPerSupport = MASS_PER_SUPPORT, fullRowMode = "none") {
  const capacity = Math.max(1, Number(massPerSupport) || MASS_PER_SUPPORT);

  for (let supportY = HEIGHT - 1; supportY > 0; supportY -= 1) {
    const support = countRowBlocks(board, supportY);
    if (support === 0 || !hasBlocksAbove(board, supportY)) {
      continue;
    }

    if (fullRowMode === "floor" && support === WIDTH) {
      return { cells: [] };
    }

    const upperCells = getCellsAbove(board, supportY);
    const multiplier = fullRowMode === "boost" && hasFullRowSupport(board, supportY)
      ? FLOOR_BOOST_MULTIPLIER
      : 1;

    if (upperCells.length > support * capacity * multiplier) {
      return { cells: upperCells };
    }
  }

  return { cells: [] };
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

function getFilledXs(board, y) {
  const xs = [];
  for (let x = 0; x < WIDTH; x += 1) {
    if (board[y][x]) {
      xs.push(x);
    }
  }
  return xs;
}

function hasFullRowSupport(board, y) {
  return countRowBlocks(board, y) === WIDTH || (y + 1 < HEIGHT && countRowBlocks(board, y + 1) === WIDTH);
}

function addCells(target, cells) {
  for (const cell of cells) {
    target.set(`${cell.x}:${cell.y}`, cell);
  }
}
