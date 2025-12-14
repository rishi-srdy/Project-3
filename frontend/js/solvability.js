export function makeSolvedBoard(size) {
  const n = size * size;
  const arr = [];
  for (let i = 1; i <= n - 1; i++) arr.push(i);
  arr.push(0); // 0 = empty
  return arr;
}

export function indexToRC(index, size) {
  return { r: Math.floor(index / size), c: index % size };
}

export function rcToIndex(r, c, size) {
  return r * size + c;
}

export function neighborsOfEmpty(board, size) {
  const emptyIdx = board.indexOf(0);
  const { r, c } = indexToRC(emptyIdx, size);
  const candidates = [];
  if (r > 0) candidates.push(rcToIndex(r - 1, c, size));
  if (r < size - 1) candidates.push(rcToIndex(r + 1, c, size));
  if (c > 0) candidates.push(rcToIndex(r, c - 1, size));
  if (c < size - 1) candidates.push(rcToIndex(r, c + 1, size));
  return { emptyIdx, candidates };
}

export function isSolved(board, size) {
  const solved = makeSolvedBoard(size);
  return solved.every((v, i) => v === board[i]);
}

/**
 * Solvable shuffle by applying random valid moves from the solved state.
 * shuffleDepth scales with size/difficulty outside.
 */
export function shuffleByRandomMoves(size, shuffleDepth, rng = Math.random) {
  let board = makeSolvedBoard(size);
  let lastSwapFrom = -1;

  for (let step = 0; step < shuffleDepth; step++) {
    const { emptyIdx, candidates } = neighborsOfEmpty(board, size);
    // avoid immediate backtracking to look more "random"
    const filtered = candidates.filter(idx => idx !== lastSwapFrom);
    const pickFrom = (filtered.length ? filtered : candidates);
    const choice = pickFrom[Math.floor(rng() * pickFrom.length)];

    // swap chosen tile into empty
    const tile = board[choice];
    board[emptyIdx] = tile;
    board[choice] = 0;

    lastSwapFrom = emptyIdx;
  }

  // ensure not accidentally solved
  if (isSolved(board, size) && shuffleDepth > 5) {
    return shuffleByRandomMoves(size, shuffleDepth + 7, rng);
  }
  return board;
}
