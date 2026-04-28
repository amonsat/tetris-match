export const COLORS = ["cyan", "rose", "gold", "violet"];

export const PALETTE = {
  cyan: "#32d6c6",
  rose: "#f06f8f",
  gold: "#f5c34d",
  violet: "#9b7cf2",
};

const SHAPES = [
  [[0, 1], [1, 1], [2, 1], [3, 1]],
  [[0, 0], [0, 1], [1, 1], [2, 1]],
  [[2, 0], [0, 1], [1, 1], [2, 1]],
  [[1, 0], [2, 0], [0, 1], [1, 1]],
  [[0, 0], [1, 0], [1, 1], [2, 1]],
  [[1, 0], [0, 1], [1, 1], [2, 1]],
  [[0, 0], [1, 0], [0, 1], [1, 1]],
];

export function createBag() {
  return shuffle([...SHAPES.keys()]);
}

export function createPiece(shapeIndex = randomInt(SHAPES.length)) {
  const colors = createPieceColors(SHAPES[shapeIndex].length);

  return {
    blocks: SHAPES[shapeIndex].map(([x, y], index) => ({
      x,
      y,
      color: colors[index],
    })),
    x: 3,
    y: -1,
  };
}

export function rotatePiece(piece, direction) {
  const rotated = piece.blocks.map((block) => ({
    ...block,
    x: direction > 0 ? -block.y : block.y,
    y: direction > 0 ? block.x : -block.x,
  }));

  const minX = Math.min(...rotated.map((block) => block.x));
  const minY = Math.min(...rotated.map((block) => block.y));

  return {
    ...piece,
    blocks: rotated.map((block) => ({
      ...block,
      x: block.x - minX,
      y: block.y - minY,
    })),
  };
}

export function getCells(piece) {
  return piece.blocks.map((block) => ({
    x: piece.x + block.x,
    y: piece.y + block.y,
    color: block.color,
  }));
}

function randomInt(max) {
  return Math.floor(Math.random() * max);
}

function createPieceColors(count) {
  const pool = shuffle(COLORS.flatMap((color) => [color, color]));
  return pool.slice(0, count);
}

function shuffle(items) {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}
