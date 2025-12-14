const API = "../backend/index.php";

export async function api(action, payload = null, query = {}) {
  const url = new URL(API, window.location.href);
  url.searchParams.set("action", action);
  Object.entries(query).forEach(([k, v]) => url.searchParams.set(k, String(v)));

  const opts = payload
    ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }
    : { method: "GET" };

  let res;
  try {
    res = await fetch(url.toString(), opts);
  } catch (e) {
    // Network / server not running / CORS / wrong path
    throw new Error("Could not reach server. Make sure PHP server is running and URL paths are correct.");
  }

  const rawText = await res.text(); // read once
  let data = null;

  try {
    data = rawText ? JSON.parse(rawText) : null;
  } catch {
    data = null; // backend returned HTML/warnings instead of JSON
  }

  // Prefer backend-provided message
  const backendMsg =
    data && typeof data === "object" && (data.error || data.message)
      ? (data.error || data.message)
      : null;

  if (!res.ok) {
    // If backendMsg exists, show it; otherwise show HTTP status + small snippet
    const snippet = rawText ? rawText.slice(0, 140) : "";
    throw new Error(backendMsg || `Request failed (HTTP ${res.status}). ${snippet}`);
  }

  if (!data || data.ok !== true) {
    throw new Error(backendMsg || "Request failed.");
  }

  return data;
}

export async function me() { return api("me"); }
export async function registerUser(display_name, email, password) {
  return api("register", { display_name, email, password });
}
export async function loginUser(email, password) { return api("login", { email, password }); }
export async function logoutUser() { return api("logout"); }

export async function startSession(puzzle_size, difficulty_level, seed = "") {
  return api("start_session", { puzzle_size, difficulty_level, seed });
}
export async function recordMove(session_id, move_no, tile_id, from_index, to_index) {
  return api("record_move", { session_id, move_no, tile_id, from_index, to_index });
}
export async function endSession(session_id, completed, duration_seconds, total_moves) {
  return api("end_session", { session_id, completed, duration_seconds, total_moves });
}
export async function leaderboard(size) {
  return api("leaderboard", null, { size });
}
