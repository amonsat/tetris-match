import { canPlace, createBoard, getTowerHeight, lockPiece, reachesTop } from "./board.js";
import { applyGravity, findGroups, removeCells } from "./match.js";
import { createBag, createPiece, getCells, rotatePiece } from "./pieces.js";
import { renderGame, renderNext } from "./render.js";
import { findWeakCollapse } from "./stability.js";

const canvas = document.querySelector("#game");
const nextCanvas = document.querySelector("#next");
const ctx = canvas.getContext("2d");
const nextCtx = nextCanvas.getContext("2d");

const heightEl = document.querySelector("#height");
const collapsedEl = document.querySelector("#collapsed");
const burnedEl = document.querySelector("#burned");
const comboEl = document.querySelector("#combo");
const overlay = document.querySelector("#overlay");
const overlayTitle = document.querySelector("#overlay-title");
const overlayText = document.querySelector("#overlay-text");
const playArea = document.querySelector(".play-area");
const restartButton = document.querySelector("#restart");
const restartOverlayButton = document.querySelector("#restart-overlay");
const pauseButton = document.querySelector("#pause");

const DROP_INTERVAL = 650;
const SOFT_DROP_INTERVAL = 45;
const BURN_ANIMATION_MS = 260;
const COLLAPSE_ANIMATION_MS = 360;
const GESTURE_THRESHOLD = 34;
const BOTTOM_ZONE_RATIO = 0.22;

let board;
let activePiece;
let nextPiece;
let bag;
let lastTime = 0;
let dropCounter = 0;
let softDrop = false;
let burnedTotal = 0;
let collapsedTotal = 0;
let lastCombo = 0;
let effects = [];
let state = "playing";
let runId = 0;
let gesture = null;

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
bindGestureControls();

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
  collapsedTotal = 0;
  lastCombo = 0;
  state = "playing";
  softDrop = false;
  effects = [];
  runId += 1;
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
  if (state !== "playing") {
    return;
  }

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

function bindGestureControls() {
  playArea.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse" && !window.matchMedia("(max-width: 720px)").matches) {
      return;
    }

    if (event.target.closest("button")) {
      return;
    }

    event.preventDefault();
    playArea.setPointerCapture(event.pointerId);

    const rect = playArea.getBoundingClientRect();
    const side = event.clientX < rect.left + rect.width / 2 ? "left" : "right";
    const isBottom = event.clientY > rect.bottom - rect.height * BOTTOM_ZONE_RATIO;

    gesture = {
      id: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      side,
      handled: false,
      repeatId: null,
    };

    if (isBottom) {
      drop();
      gesture.repeatId = window.setInterval(drop, SOFT_DROP_INTERVAL);
      return;
    }

    move(side === "left" ? -1 : 1);
  });

  playArea.addEventListener("pointermove", (event) => {
    if (!gesture || gesture.id !== event.pointerId || gesture.handled || state !== "playing") {
      return;
    }

    const dx = event.clientX - gesture.startX;
    const dy = event.clientY - gesture.startY;
    if (Math.abs(dy) < GESTURE_THRESHOLD || Math.abs(dy) < Math.abs(dx) * 1.15) {
      return;
    }

    gesture.handled = true;
    stopGestureRepeat();
    if (dy < 0) {
      rotate(gesture.side === "left" ? -1 : 1);
    } else {
      hardDrop();
    }
  });

  playArea.addEventListener("pointerup", endGesture);
  playArea.addEventListener("pointercancel", endGesture);
  playArea.addEventListener("lostpointercapture", endGesture);
}

function endGesture(event) {
  if (!gesture || gesture.id !== event.pointerId) {
    return;
  }

  stopGestureRepeat();
  gesture = null;
}

function stopGestureRepeat() {
  if (!gesture) {
    return;
  }

  if (gesture.repeatId !== null) {
    window.clearInterval(gesture.repeatId);
    gesture.repeatId = null;
  }
}

async function settlePiece() {
  if (state !== "playing") {
    return;
  }

  const currentRun = runId;
  state = "resolving";
  lockPiece(board, getCells(activePiece));
  activePiece = null;

  const result = await resolveMatchesWithAnimation(currentRun);
  if (currentRun !== runId) {
    return;
  }
  lastCombo = result.combo;
  updateUi();

  const collapsePreview = findWeakCollapse(board);
  if (collapsePreview.cells.length > 0) {
    removeCells(board, collapsePreview.cells);
    await playEffect({ type: "collapse", cells: collapsePreview.cells }, COLLAPSE_ANIMATION_MS, currentRun);
    if (currentRun !== runId) {
      return;
    }
  }

  collapsedTotal += collapsePreview.cells.length;

  if (reachesTop(board)) {
    state = "won";
    showOverlay("Башня готова", "Ты дотянулся до верхнего ряда после сгораний и обвалов.");
    updateUi();
    return;
  }

  activePiece = nextPiece;
  nextPiece = takePiece();
  state = "playing";

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
  const shouldShowPiece = state === "playing" || state === "paused";
  renderGame(ctx, board, shouldShowPiece ? activePiece : null, effects);
  renderNext(nextCtx, nextPiece);
}

async function resolveMatchesWithAnimation(currentRun) {
  let totalBurned = 0;
  let combo = 0;

  while (currentRun === runId) {
    const groups = findGroups(board, 3);
    if (groups.length === 0) {
      break;
    }

    const cells = groups.flat().map((cell) => ({
      ...cell,
      color: board[cell.y][cell.x],
    }));

    combo += 1;
    await playEffect({ type: "burn", cells }, BURN_ANIMATION_MS, currentRun);
    if (currentRun !== runId) {
      break;
    }

    removeCells(board, cells);
    totalBurned += cells.length;
    burnedTotal = burnedTotal + cells.length;
    lastCombo = combo;
    updateUi();
    applyGravity(board);
  }

  return { burned: totalBurned, combo };
}

async function playEffect(baseEffect, duration, currentRun) {
  const started = performance.now();

  return new Promise((resolve) => {
    function step(now) {
      if (currentRun !== runId) {
        effects = [];
        resolve();
        return;
      }

      const progress = Math.min(1, (now - started) / duration);
      effects = [{ ...baseEffect, progress }];

      if (progress >= 1) {
        effects = [];
        resolve();
        return;
      }

      requestAnimationFrame(step);
    }

    requestAnimationFrame(step);
  });
}

function updateUi() {
  heightEl.textContent = String(getTowerHeight(board));
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
