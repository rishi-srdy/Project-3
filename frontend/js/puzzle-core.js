import { neighborsOfEmpty, indexToRC, shuffleByRandomMoves, isSolved } from "./solvability.js";

/**
 * Mandatory:
 * - Numbers always visible on tiles
 * - Drag tile into empty slot to move
 * - Click-to-move also supported
 */
export function createPuzzle({ boardEl, baseImageUrl, onMove, onWin }) {
  let size = 4;
  let board = [];
  let moves = 0;
  let locked = false;

  function setGrid() {
    boardEl.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
    boardEl.style.gridTemplateRows = `repeat(${size}, 1fr)`;
  }

  function tileStyleFor(tileId) {
    const solvedIndex = tileId - 1;
    const { r, c } = indexToRC(solvedIndex, size);

    const bgSize = `${size * 100}% ${size * 100}%`;
    const posX = (c * 100) / (size - 1);
    const posY = (r * 100) / (size - 1);

    return {
      backgroundImage: `url('${baseImageUrl}')`,
      backgroundSize: bgSize,
      backgroundPosition: `${posX}% ${posY}%`,
      backgroundRepeat: "no-repeat"
    };
  }

  function render() {
    boardEl.innerHTML = "";

    const { emptyIdx, candidates } = neighborsOfEmpty(board, size);
    const movableSet = new Set(candidates);
    let emptyTileEl = null;

    board.forEach((tileId, idx) => {
      const tile = document.createElement("div");
      tile.className = "tile";
      tile.setAttribute("data-idx", String(idx));
      tile.setAttribute("data-tile", String(tileId));

      if (tileId === 0) {
        tile.classList.add("empty");
        emptyTileEl = tile;
      } else {
        Object.assign(tile.style, tileStyleFor(tileId));
        tile.appendChild(Object.assign(document.createElement("div"), { className: "shade" }));

        // ✅ Numbers are ALWAYS shown (mandatory)
        const num = document.createElement("div");
        num.className = "num";
        num.textContent = String(tileId);
        tile.appendChild(num);
      }

      // Mark movable
      if (!locked && tileId !== 0 && movableSet.has(idx)) tile.classList.add("movable");

      // Click-to-move
      tile.addEventListener("click", () => {
        if (locked) return;
        if (tileId === 0) return;
        if (!movableSet.has(idx)) return;
        moveTile(idx, emptyIdx);
      });

      // Drag support only for movable tiles
      if (!locked && tileId !== 0 && movableSet.has(idx)) {
        tile.setAttribute("draggable", "true");

        tile.addEventListener("dragstart", (e) => {
          tile.classList.add("dragging");
          e.dataTransfer.setData("text/plain", String(idx));
          e.dataTransfer.effectAllowed = "move";
          if (emptyTileEl) emptyTileEl.classList.add("drop-target");
        });

        tile.addEventListener("dragend", () => {
          tile.classList.remove("dragging");
          if (emptyTileEl) emptyTileEl.classList.remove("drop-target");
        });
      }

      boardEl.appendChild(tile);
    });

    // Empty tile drop handling
    if (emptyTileEl && !locked) {
      emptyTileEl.addEventListener("dragover", (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
      });

      emptyTileEl.addEventListener("drop", (e) => {
        e.preventDefault();
        const fromIdx = Number(e.dataTransfer.getData("text/plain"));
        if (!Number.isFinite(fromIdx)) return;

        // Validate adjacency again (important)
        const { emptyIdx: curEmptyIdx, candidates: curCandidates } = neighborsOfEmpty(board, size);
        if (!curCandidates.includes(fromIdx)) return;

        moveTile(fromIdx, curEmptyIdx);
      });
    }
  }

  function moveTile(fromIdx, emptyIdx) {
    const tileId = board[fromIdx];
    board[emptyIdx] = tileId;
    board[fromIdx] = 0;

    moves += 1;
    onMove?.({ moveNo: moves, tileId, fromIndex: fromIdx, toIndex: emptyIdx });

    render();

    if (isSolved(board, size)) {
      locked = true;
      onWin?.({ moves });
    }
  }

  function resetToSolved(newSize = size) {
    size = newSize;
    moves = 0;
    locked = false;
    setGrid();
    const n = size * size;
    board = [];
    for (let i = 1; i <= n - 1; i++) board.push(i);
    board.push(0);
    render();
  }

  function shuffle(newSize = size, shuffleDepth = 120) {
    size = newSize;
    moves = 0;
    locked = false;
    setGrid();
    board = shuffleByRandomMoves(size, shuffleDepth);
    render();
  }

  function getState() {
    return { size, board: [...board], moves, locked };
  }

  function setLocked(v) {
    locked = v;
    render();
  }

  return { render, resetToSolved, shuffle, getState, setLocked };
}