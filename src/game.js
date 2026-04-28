import { canPlace, createBoard, getTowerHeight, lockPiece, reachesTop } from "./board.js";
import { resolveMatches } from "./match.js";
import { createBag, createPiece, getCells, rotatePiece } from "./pieces.js";
import { renderGame, renderNext } from "./render.js";
import { collapseWeakTops, SCORE_TARGET, scoreStableRows } from "./stability.js";

const canvas = document.querySelector("#game");
const nextCanvas = document.querySelector("#next");
const ctx = canvas.getContext("2d");
const nextCtx = nextCanvas.getContext("2d");

const heightEl = document.querySelector("#height");
const scoreEl = document.querySelector("#score");
const stableEl = document.querySelector("#stable");
const collapsedEl = document.querySelector("#collapsed");
const burnedEl = document.querySelector("#burned");
const comboEl = document.querySelector("#combo");
const overlay = document.querySelector("#overlay");
const overlayTitle = document.querySelector("#overlay-title");
const overlayText = document.querySelector("#overlay-text");
const restartButton = document.querySelector("#restart");
const restartOverlayButton = document.querySelector("#restart-overlay");
const pauseButton = document.querySelector("#pause");

const DROP_INTERVAL = 650;
const SOFT_DROP_INTERVAL = 45;

let board;
let activePiece;
let nextPiece;
let bag;
let lastTime = 0;
let dropCounter = 0;
let softDrop = false;
let burnedTotal = 0;
let score = 0;
let collapsedTotal = 0;
let stableRows = 0;
let lastCombo = 0;
let state = "playing";

reset();
requestAnimationFrame(loop);

document.addEventListener("keydown", (event) => {
  if (event.code === "KeyR") {
    reset();
    return;
  }

  if (event.code === "KeyP") {
    togglePause();
    return;
  }

  if (state !== "playing") {
    return;
  }

  if (event.code === "ArrowLeft") {
    move(-1);
  } else if (event.code === "ArrowRight") {
    move(1);
  } else if (event.code === "ArrowDown") {
    softDrop = true;
  } else if (event.code === "ArrowUp" || event.code === "KeyX") {
    rotate(1);
  } else if (event.code === "KeyZ") {
    rotate(-1);
  } else if (event.code === "Space") {
    event.preventDefault();
    hardDrop();
  }
});

document.addEventListener("keyup", (event) => {
  if (event.code === "ArrowDown") {
    softDrop = false;
  }
});

restartButton.addEventListener("click", reset);
restartOverlayButton.addEventListener("click", reset);
pauseButton.addEventListener("click", togglePause);

function loop(time = 0) {
  const delta = time - lastTime;
  lastTime = time;

  if (state === "playing") {
    dropCounter += delta;
    const interval = softDrop ? SOFT_DROP_INTERVAL : DROP_INTERVAL;
    if (dropCounter >= interval) {
      drop();
      dropCounter = 0;
    }
  }

  draw();
  requestAnimationFrame(loop);
}

function reset() {
  board = createBoard();
  bag = createBag();
  activePiece = takePiece();
  nextPiece = takePiece();
  dropCounter = 0;
  burnedTotal = 0;
  score = 0;
  collapsedTotal = 0;
  stableRows = 0;
  lastCombo = 0;
  state = "playing";
  softDrop = false;
  updateUi();
  hideOverlay();
}

function takePiece() {
  if (bag.length === 0) {
    bag = createBag();
  }
  return createPiece(bag.pop());
}

function move(dx) {
  const moved = { ...activePiece, x: activePiece.x + dx };
  if (canPlace(board, getCells(moved))) {
    activePiece = moved;
  }
}

function rotate(direction) {
  const rotated = rotatePiece(activePiece, direction);
  const kicks = [0, -1, 1, -2, 2];

  for (const kick of kicks) {
    const kicked = { ...rotated, x: rotated.x + kick };
    if (canPlace(board, getCells(kicked))) {
      activePiece = kicked;
      return;
    }
  }
}

function drop() {
  const moved = { ...activePiece, y: activePiece.y + 1 };
  if (canPlace(board, getCells(moved))) {
    activePiece = moved;
    return;
  }

  settlePiece();
}

function hardDrop() {
  while (state === "playing") {
    const moved = { ...activePiece, y: activePiece.y + 1 };
    if (!canPlace(board, getCells(moved))) {
      settlePiece();
      return;
    }
    activePiece = moved;
  }
}

function settlePiece() {
  lockPiece(board, getCells(activePiece));

  const result = resolveMatches(board);
  burnedTotal += result.burned;
  lastCombo = result.combo;

  const collapse = collapseWeakTops(board);
  collapsedTotal += collapse.collapsed;

  const scoring = scoreStableRows(board);
  score += scoring.points;
  stableRows = scoring.stableRows;

  if (score >= SCORE_TARGET && reachesTop(board)) {
    state = "won";
    showOverlay("Башня выстояла", "Ты набрал достаточно стабильности и дотянулся до верхнего ряда.");
    updateUi();
    return;
  }

  activePiece = nextPiece;
  nextPiece = takePiece();

  if (!canPlace(board, getCells(activePiece))) {
    state = "lost";
    showOverlay("Хода нет", "Фигура не может появиться. Нажми R для новой попытки.");
  }

  updateUi();
}

function togglePause() {
  if (state === "playing") {
    state = "paused";
    showOverlay("Пауза", "Нажми P, чтобы продолжить.");
  } else if (state === "paused") {
    state = "playing";
    hideOverlay();
  }
}

function draw() {
  renderGame(ctx, board, state === "playing" || state === "paused" ? activePiece : null);
  renderNext(nextCtx, nextPiece);
}

function updateUi() {
  scoreEl.textContent = `${score}/${SCORE_TARGET}`;
  heightEl.textContent = String(getTowerHeight(board));
  stableEl.textContent = String(stableRows);
  collapsedEl.textContent = String(collapsedTotal);
  burnedEl.textContent = String(burnedTotal);
  comboEl.textContent = String(lastCombo);
  pauseButton.textContent = state === "paused" ? "Играть" : "Пауза";
}

function showOverlay(title, text) {
  overlayTitle.textContent = title;
  overlayText.textContent = text;
  overlay.hidden = false;
  updateUi();
}

function hideOverlay() {
  overlay.hidden = true;
  updateUi();
}
