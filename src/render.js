import { HEIGHT, WIDTH } from "./board.js";
import { getCells, PALETTE } from "./pieces.js";

const GRID = "#252b34";
const EMPTY = "#10141b";

export function renderGame(ctx, board, activePiece) {
  const size = ctx.canvas.width / WIDTH;
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.fillStyle = EMPTY;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  drawGrid(ctx, size, WIDTH, HEIGHT);

  for (let y = 0; y < HEIGHT; y += 1) {
    for (let x = 0; x < WIDTH; x += 1) {
      if (board[y][x]) {
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

function drawBlock(ctx, x, y, size, color) {
  drawBlockAt(ctx, x * size, y * size, size, color);
}

function drawBlockAt(ctx, x, y, size, color) {
  const inset = 2;
  const fill = PALETTE[color] ?? color;

  ctx.fillStyle = fill;
  ctx.fillRect(x + inset, y + inset, size - inset * 2, size - inset * 2);

  ctx.fillStyle = "rgba(255, 255, 255, 0.22)";
  ctx.fillRect(x + inset, y + inset, size - inset * 2, 4);

  ctx.strokeStyle = "rgba(0, 0, 0, 0.28)";
  ctx.lineWidth = 2;
  ctx.strokeRect(x + inset + 1, y + inset + 1, size - inset * 2 - 2, size - inset * 2 - 2);
}
