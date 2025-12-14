import { createPuzzle } from "./puzzle-core.js";
import { makeTimer, formatMMSS } from "./timer-moves.js";
import { me, registerUser, loginUser, logoutUser, startSession, recordMove, endSession, leaderboard } from "./analytics-client.js";

// --- DOM ---
const boardEl = document.getElementById("board");
const sizeSelect = document.getElementById("sizeSelect");
const btnShuffle = document.getElementById("btnShuffle");
const btnReset = document.getElementById("btnReset");
const movesText = document.getElementById("movesText");
const timeText = document.getElementById("timeText");
const statusText = document.getElementById("statusText");
const winOverlay = document.getElementById("winOverlay");
const btnPlayAgain = document.getElementById("btnPlayAgain");

const authModal = document.getElementById("authModal");
const btnOpenAuth = document.getElementById("btnOpenAuth");
const btnCloseAuth = document.getElementById("btnCloseAuth");
const btnLogout = document.getElementById("btnLogout");
const userBadge = document.getElementById("userBadge");

const tabs = Array.from(document.querySelectorAll(".tab"));
const tabLogin = document.getElementById("tab-login");
const tabRegister = document.getElementById("tab-register");
const authMsg = document.getElementById("authMsg");

const loginEmail = document.getElementById("loginEmail");
const loginPass = document.getElementById("loginPass");
const btnLogin = document.getElementById("btnLogin");

const regName = document.getElementById("regName");
const regEmail = document.getElementById("regEmail");
const regPass = document.getElementById("regPass");
const btnRegister = document.getElementById("btnRegister");

const lbSizeSelect = document.getElementById("lbSizeSelect");
const btnRefreshLB = document.getElementById("btnRefreshLB");
const lbBody = document.getElementById("lbBody");

// --- State ---
let currentUser = null;
let sessionId = null;
let moveNo = 0;

// Put your Santa base image here:
const BASE_IMAGE_URL = "./assets/images/santa-base.jpg";

// Difficulty: for now fixed 1; later we’ll make it adaptive
let difficultyLevel = 1;

// --- Timer ---
const timer = makeTimer((sec) => {
  timeText.textContent = formatMMSS(sec);
});

function showStatus(msg) { statusText.textContent = msg; }
function showAuthMsg(msg) { authMsg.textContent = msg; }

function syncLeaderboardToGameSize() {
  const size = String(sizeSelect.value);
  lbSizeSelect.value = size;
}

// --- Puzzle ---
const puzzle = createPuzzle({
  boardEl,
  baseImageUrl: BASE_IMAGE_URL,
  onMove: async ({ moveNo: m, tileId, fromIndex, toIndex }) => {
    moveNo = m;
    movesText.textContent = String(moveNo);

    if (sessionId) {
      try { await recordMove(sessionId, moveNo, tileId, fromIndex, toIndex); }
      catch (e) { console.warn(e); }
    }

    if (moveNo === 1) timer.start();
  },
  onWin: async ({ moves }) => {
    timer.pause();
    winOverlay.classList.remove("hidden");
    showStatus("Completed! Saved to leaderboard.");

    if (sessionId) {
      try {
        await endSession(sessionId, true, timer.seconds(), moves);
      } catch (e) {
        console.warn(e);
      }
    }
    await refreshLeaderboard();
  }
});

function shuffleDepthFor(size, difficulty) {
  // safe baseline; later we’ll adapt dynamically
  const base = Math.max(30, size * size * 6);
  return base + (difficulty - 1) * (size * size * 3);
}

async function beginNewSession() {
  if (!currentUser) {
    sessionId = null;
    showStatus("You can play without login, but leaderboard saves only after login.");
    return;
  }
  const size = Number(sizeSelect.value);
  const seed = `${Date.now()}`; // later: deterministic share seeds
  const data = await startSession(size, difficultyLevel, seed);
  sessionId = data.session_id;
  showStatus(`Session started. (ID ${sessionId})`);
}

async function newGameShuffle() {
  winOverlay.classList.add("hidden");
  timer.reset();
  moveNo = 0;
  movesText.textContent = "0";
  timeText.textContent = "00:00";

  const size = Number(sizeSelect.value);
  puzzle.shuffle(size, shuffleDepthFor(size, difficultyLevel));

  syncLeaderboardToGameSize();
  await refreshLeaderboard();
  await beginNewSession();
}

function newGameResetSolved() {
  winOverlay.classList.add("hidden");
  timer.reset();
  moveNo = 0;
  movesText.textContent = "0";
  timeText.textContent = "00:00";

  const size = Number(sizeSelect.value);
  puzzle.resetToSolved(size);
  showStatus("Reset to solved. Click Shuffle to start a run.");
}

// --- Auth UI ---
function openAuth() { authModal.classList.remove("hidden"); showAuthMsg(""); }
function closeAuth() { authModal.classList.add("hidden"); showAuthMsg(""); }

tabs.forEach(t => t.addEventListener("click", () => {
  tabs.forEach(x => x.classList.remove("active"));
  t.classList.add("active");
  const which = t.dataset.tab;
  tabLogin.classList.toggle("active", which === "login");
  tabRegister.classList.toggle("active", which === "register");
}));

btnOpenAuth.addEventListener("click", openAuth);
btnCloseAuth.addEventListener("click", closeAuth);
authModal.addEventListener("click", (e) => { if (e.target === authModal) closeAuth(); });

btnRegister.addEventListener("click", async () => {
  try {
    const data = await registerUser(regName.value.trim() || "Santa Helper", regEmail.value.trim(), regPass.value);
    currentUser = data.user;
    applyUserState();
    closeAuth();
    showStatus("Registered and logged in.");
    await beginNewSession();
    await refreshLeaderboard();
  } catch (e) {
    showAuthMsg(e.message);
  }
});

btnLogin.addEventListener("click", async () => {
  try {
    const data = await loginUser(loginEmail.value.trim(), loginPass.value);
    currentUser = data.user;
    applyUserState();
    closeAuth();
    showStatus("Logged in.");
    await beginNewSession();
    await refreshLeaderboard();
  } catch (e) {
    showAuthMsg(e.message);
  }
});

btnLogout.addEventListener("click", async () => {
  try { await logoutUser(); } catch {}
  currentUser = null;
  sessionId = null;
  applyUserState();
  showStatus("Logged out.");
});

function applyUserState() {
  const isLogged = !!currentUser;
  btnOpenAuth.classList.toggle("hidden", isLogged);
  btnLogout.classList.toggle("hidden", !isLogged);
  userBadge.classList.toggle("hidden", !isLogged);
  if (isLogged) userBadge.textContent = `👤 ${currentUser.display_name}`;
}

// --- Leaderboard ---
async function refreshLeaderboard() {
  const size = Number(lbSizeSelect.value);
  try {
    const data = await leaderboard(size);
    const rows = data.rows || [];
    lbBody.innerHTML = rows.length
      ? rows.map(r => `
        <tr>
          <td>${escapeHtml(r.display_name)}</td>
          <td>${Number(r.duration_seconds)}</td>
          <td>${Number(r.total_moves)}</td>
          <td>${escapeHtml(String(r.started_at))}</td>
        </tr>
      `).join("")
      : `<tr><td colspan="4" class="muted">No completed runs yet for this size.</td></tr>`;
  } catch (e) {
    lbBody.innerHTML = `<tr><td colspan="4" class="muted">Leaderboard unavailable (login may be required).</td></tr>`;
  }
}

function escapeHtml(s){
  return s.replace(/[&<>"']/g, (c)=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" }[c]));
}

btnRefreshLB.addEventListener("click", refreshLeaderboard);
lbSizeSelect.addEventListener("change", refreshLeaderboard);

// --- Controls ---
btnShuffle.addEventListener("click", newGameShuffle);
btnReset.addEventListener("click", newGameResetSolved);
btnPlayAgain.addEventListener("click", newGameShuffle);
sizeSelect.addEventListener("change", async () => {
  newGameResetSolved();
  syncLeaderboardToGameSize();
  await refreshLeaderboard();
});


(async function init(){
  newGameResetSolved();
  try {
    const data = await me();
    currentUser = data.user;
  } catch {}
  applyUserState();
  await refreshLeaderboard();
})();
