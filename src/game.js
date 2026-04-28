import { canPlace, createBoard, getTowerHeight, lockPiece, reachesTop } from "./board.js";
import { applyGravity, findGroups, removeCells, resolveMatches } from "./match.js";
import { createBag, createPiece, getCells, rotatePiece } from "./pieces.js";
import { renderGame, renderNext } from "./render.js";
import { findCollapseCells } from "./stability.js";

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
const gestureHelp = document.querySelector("#gesture-help");
const playArea = document.querySelector(".play-area");
const helpButton = document.querySelector("#help");
const restartButton = document.querySelector("#restart");
const restartOverlayButton = document.querySelector("#restart-overlay");
const pauseButton = document.querySelector("#pause");
const settingsButton = document.querySelector("#settings");
const settingsModal = document.querySelector("#settings-modal");
const settingsCloseButton = document.querySelector("#settings-close");
const ruleInputs = document.querySelectorAll("[data-rule]");
const massPerSupportInput = document.querySelector("#mass-per-support");
const tapMoveEnabledInput = document.querySelector("#tap-move-enabled");
const swipeMoveEnabledInput = document.querySelector("#swipe-move-enabled");
const swipeDropEnabledInput = document.querySelector("#swipe-drop-enabled");
const bottomDropEnabledInput = document.querySelector("#bottom-drop-enabled");
const collapsePreviewEnabledInput = document.querySelector("#collapse-preview-enabled");

const DROP_INTERVAL = 650;
const SOFT_DROP_INTERVAL = 45;
const BURN_ANIMATION_MS = 260;
const COLLAPSE_ANIMATION_MS = 360;
const GESTURE_THRESHOLD = 34;
const BOTTOM_ZONE_RATIO = 0.22;
const TAP_DELAY_MS = 90;

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
helpButton.addEventListener("click", toggleGestureHelp);
settingsButton.addEventListener("click", toggleSettings);
settingsCloseButton.addEventListener("click", hideSettings);
settingsModal.addEventListener("click", (event) => {
  if (event.target === settingsModal) {
    hideSettings();
  }
});
bindGestureControls();
preventBrowserGestures();

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
  hideGestureHelp();
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

    if (!gestureHelp.hidden) {
      hideGestureHelp();
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
      tapTimer: null,
    };

    if (isBottom && bottomDropEnabledInput.checked) {
      drop();
      gesture.repeatId = window.setInterval(drop, SOFT_DROP_INTERVAL);
      return;
    }

    gesture.tapTimer = window.setTimeout(() => {
      if (!gesture || gesture.id !== event.pointerId || gesture.handled || state !== "playing" || !tapMoveEnabledInput.checked) {
        return;
      }
      gesture.handled = true;
      move(side === "left" ? -1 : 1);
    }, TAP_DELAY_MS);
  });

  playArea.addEventListener("pointermove", (event) => {
    if (!gesture || gesture.id !== event.pointerId || gesture.handled || state !== "playing") {
      return;
    }

    const dx = event.clientX - gesture.startX;
    const dy = event.clientY - gesture.startY;

    if (swipeMoveEnabledInput.checked && Math.abs(dx) >= GESTURE_THRESHOLD && Math.abs(dx) > Math.abs(dy) * 1.15) {
      gesture.handled = true;
      stopGestureRepeat();
      clearTapTimer();
      move(dx < 0 ? -1 : 1);
      return;
    }

    if (Math.abs(dy) < GESTURE_THRESHOLD || Math.abs(dy) < Math.abs(dx) * 1.15) {
      return;
    }

    gesture.handled = true;
    stopGestureRepeat();
    clearTapTimer();
    if (dy < 0) {
      rotate(gesture.side === "left" ? -1 : 1);
    } else if (swipeDropEnabledInput.checked) {
      hardDrop();
    }
  });

  playArea.addEventListener("pointerup", endGesture);
  playArea.addEventListener("pointercancel", endGesture);
  playArea.addEventListener("lostpointercapture", endGesture);
}

function toggleGestureHelp() {
  const shouldShow = gestureHelp.hidden;
  gestureHelp.hidden = !shouldShow;
  helpButton.setAttribute("aria-pressed", String(shouldShow));
}

function hideGestureHelp() {
  gestureHelp.hidden = true;
  helpButton.setAttribute("aria-pressed", "false");
}

function preventBrowserGestures() {
  let lastTouchEnd = 0;

  document.addEventListener("touchmove", (event) => {
    if (event.target.closest(".play-area")) {
      event.preventDefault();
    }
  }, { passive: false });

  document.addEventListener("touchend", (event) => {
    const now = Date.now();
    if (event.target.closest(".play-area") && now - lastTouchEnd < 330) {
      event.preventDefault();
    }
    lastTouchEnd = now;
  }, { passive: false });

  document.addEventListener("gesturestart", (event) => {
    event.preventDefault();
  });
}

function endGesture(event) {
  if (!gesture || gesture.id !== event.pointerId) {
    return;
  }

  if (!gesture.handled && state === "playing" && tapMoveEnabledInput.checked) {
    move(gesture.side === "left" ? -1 : 1);
  }

  clearTapTimer();
  stopGestureRepeat();
  gesture = null;
}

function clearTapTimer() {
  if (!gesture || gesture.tapTimer === null) {
    return;
  }

  window.clearTimeout(gesture.tapTimer);
  gesture.tapTimer = null;
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

  const collapsePreview = findCollapseCells(board, getCollapseSettings());
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
  renderGame(ctx, board, shouldShowPiece ? activePiece : null, effects, shouldShowPiece ? getCollapsePreviewCells() : []);
  renderNext(nextCtx, nextPiece);
}

function getCollapsePreviewCells() {
  if (!collapsePreviewEnabledInput.checked || !activePiece || state !== "playing") {
    return [];
  }

  const previewBoard = board.map((row) => [...row]);
  const previewPiece = getLandingPiece(activePiece, previewBoard);
  lockPiece(previewBoard, getCells(previewPiece));
  resolveMatches(previewBoard);

  return findCollapseCells(previewBoard, getCollapseSettings()).cells;
}

function getLandingPiece(piece, targetBoard) {
  let landed = piece;

  while (true) {
    const moved = { ...landed, y: landed.y + 1 };
    if (!canPlace(targetBoard, getCells(moved))) {
      return landed;
    }
    landed = moved;
  }
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

function toggleSettings() {
  const shouldShow = settingsModal.hidden;
  settingsModal.hidden = !shouldShow;
  settingsButton.setAttribute("aria-expanded", String(shouldShow));
}

function hideSettings() {
  settingsModal.hidden = true;
  settingsButton.setAttribute("aria-expanded", "false");
}

function getCollapseSettings() {
  const rules = {};
  for (const input of ruleInputs) {
    rules[input.dataset.rule] = input.checked;
  }
  rules.massPerSupport = Number(massPerSupportInput.value) || 6;
  return rules;
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
