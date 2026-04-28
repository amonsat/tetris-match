import { HEIGHT, WIDTH } from "./board.js";
import { getCells, PALETTE } from "./pieces.js";
import { getStableRows, getWeakRows } from "./stability.js";

const GRID = "#252b34";
const EMPTY = "#10141b";

export function renderGame(ctx, board, activePiece, effects = []) {
  const size = ctx.canvas.width / WIDTH;
  const hiddenCells = getHiddenCells(effects);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.fillStyle = EMPTY;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  drawGrid(ctx, size, WIDTH, HEIGHT);
  drawRowHints(ctx, board, size);

  for (let y = 0; y < HEIGHT; y += 1) {
    for (let x = 0; x < WIDTH; x += 1) {
      if (board[y][x] && !hiddenCells.has(getCellKey(x, y))) {
        drawBlock(ctx, x, y, size, board[y][x]);
      }
    }
  }

  if (activePiece) {
    for (const cell of getCells(activePiece)) {
      if (cell.y >= 0) {
        drawBlock(ctx, cell.x, cell.y, size, cell.color);
      }
    }
  }

  drawEffects(ctx, effects, size);
}

function getHiddenCells(effects) {
  const hiddenCells = new Set();

  for (const effect of effects) {
    if (effect.type !== "burn") {
      continue;
    }

    for (const cell of effect.cells) {
      hiddenCells.add(getCellKey(cell.x, cell.y));
    }
  }

  return hiddenCells;
}

function getCellKey(x, y) {
  return `${x}:${y}`;
}

export function renderNext(ctx, piece) {
  const size = 24;
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.fillStyle = "rgba(0, 0, 0, 0.16)";
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  if (!piece) {
    return;
  }

  const width = Math.max(...piece.blocks.map((block) => block.x)) + 1;
  const height = Math.max(...piece.blocks.map((block) => block.y)) + 1;
  const offsetX = Math.floor((ctx.canvas.width - width * size) / 2);
  const offsetY = Math.floor((ctx.canvas.height - height * size) / 2);

  for (const block of piece.blocks) {
    drawBlockAt(ctx, offsetX + block.x * size, offsetY + block.y * size, size, block.color);
  }
}

function drawGrid(ctx, size, width, height) {
  ctx.strokeStyle = GRID;
  ctx.lineWidth = 1;

  for (let x = 0; x <= width; x += 1) {
    const px = x * size + 0.5;
    ctx.beginPath();
    ctx.moveTo(px, 0);
    ctx.lineTo(px, height * size);
    ctx.stroke();
  }

  for (let y = 0; y <= height; y += 1) {
    const py = y * size + 0.5;
    ctx.beginPath();
    ctx.moveTo(0, py);
    ctx.lineTo(width * size, py);
    ctx.stroke();
  }
}

function drawRowHints(ctx, board, size) {
  const stableRows = getStableRows(board);
  const weakRows = getWeakRows(board);

  for (const y of stableRows) {
    ctx.fillStyle = "rgba(113, 214, 201, 0.09)";
    ctx.fillRect(0, y * size, WIDTH * size, size);
  }

  for (const y of weakRows) {
    ctx.fillStyle = "rgba(255, 112, 112, 0.15)";
    ctx.fillRect(0, y * size, WIDTH * size, size);
  }
}

function drawBlock(ctx, x, y, size, color) {
  drawBlockAt(ctx, x * size, y * size, size, color);
}

function drawEffects(ctx, effects, size) {
  for (const effect of effects) {
    if (effect.type === "burn") {
      for (const cell of effect.cells) {
        drawBurnEffect(ctx, cell.x, cell.y, size, cell.color, effect.progress);
      }
    }

    if (effect.type === "collapse") {
      for (const cell of effect.cells) {
        drawCollapseEffect(ctx, cell.x, cell.y, size, cell.color, effect.progress);
      }
    }
  }
}

function drawBurnEffect(ctx, x, y, size, color, progress) {
  const scale = 1 - progress * 0.62;
  const pulse = Math.sin(progress * Math.PI);
  const blockSize = size * scale;
  const px = x * size + (size - blockSize) / 2;
  const py = y * size + (size - blockSize) / 2;

  drawBlockAt(ctx, px, py, blockSize, color, 1);

  ctx.fillStyle = `rgba(255, 246, 189, ${0.45 * pulse})`;
  ctx.fillRect(x * size, y * size, size, size);
}

function drawCollapseEffect(ctx, x, y, size, color, progress) {
  const fall = progress * progress * size * 5;
  const wobble = Math.sin(progress * Math.PI * 6 + x) * 4 * (1 - progress);
  drawBlockAt(ctx, x * size + wobble, y * size + fall, size, color, 1 - progress);
}

function drawBlockAt(ctx, x, y, size, color, alpha = 1) {
  const inset = 2;
  const fill = PALETTE[color] ?? color;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = fill;
  ctx.fillRect(x + inset, y + inset, size - inset * 2, size - inset * 2);

  ctx.fillStyle = "rgba(255, 255, 255, 0.22)";
  ctx.fillRect(x + inset, y + inset, size - inset * 2, 4);

  ctx.strokeStyle = "rgba(0, 0, 0, 0.28)";
  ctx.lineWidth = 2;
  ctx.strokeRect(x + inset + 1, y + inset + 1, size - inset * 2 - 2, size - inset * 2 - 2);
  ctx.restore();
}
