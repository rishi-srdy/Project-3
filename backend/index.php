<?php
declare(strict_types=1);

ini_set('display_errors', '0');
error_reporting(E_ALL);

header("Content-Type: application/json; charset=utf-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

session_start();

require_once __DIR__ . "/db/connection.php";
require_once __DIR__ . "/middleware/sanitize.php";
require_once __DIR__ . "/middleware/auth-middleware.php";

function json_ok(array $data = []): void {
  echo json_encode(array_merge(["ok" => true], $data));
  exit;
}
function json_fail(string $msg, int $code = 400): void {
  http_response_code($code);
  echo json_encode(["ok" => false, "error" => $msg]);
  exit;
}

$action = $_GET['action'] ?? '';

try {
  switch ($action) {

    // ---------- AUTH ----------
    case "register": {
      $in = read_json();
      $email = strtolower(str_clean($in['email'] ?? '', 190));
      $pass  = (string)($in['password'] ?? '');
      $name  = str_clean($in['display_name'] ?? 'Santa Helper', 80);

      if (!filter_var($email, FILTER_VALIDATE_EMAIL)) json_fail("Invalid email");
      if (strlen($pass) < 8) json_fail("Password must be at least 8 chars");

      $pdo = db();
      $pdo->beginTransaction();
      $stmt = $pdo->prepare("INSERT INTO users(email, password_hash) VALUES (?, ?)");
      $hash = password_hash($pass, PASSWORD_DEFAULT);
      $stmt->execute([$email, $hash]);
      $uid = (int)$pdo->lastInsertId();

      $stmt2 = $pdo->prepare("INSERT INTO profiles(user_id, display_name, theme) VALUES (?, ?, 'santa')");
      $stmt2->execute([$uid, $name]);
      $pdo->commit();

      $_SESSION['user_id'] = $uid;
      json_ok(["user" => ["id"=>$uid, "email"=>$email, "display_name"=>$name, "theme"=>"santa"]]);
      break;
    }

    case "login": {
      $in = read_json();
      $email = strtolower(str_clean($in['email'] ?? '', 190));
      $pass  = (string)($in['password'] ?? '');

      $pdo = db();
      $stmt = $pdo->prepare("SELECT u.id, u.email, u.password_hash, p.display_name, p.theme
                             FROM users u JOIN profiles p ON p.user_id=u.id
                             WHERE u.email=? LIMIT 1");
      $stmt->execute([$email]);
      $row = $stmt->fetch();
      if (!$row || !password_verify($pass, $row['password_hash'])) json_fail("Invalid credentials", 401);

      $_SESSION['user_id'] = (int)$row['id'];
      json_ok(["user" => ["id" => (int)$row['id'], "email"=>$row['email'], "display_name"=>$row['display_name'], "theme"=>$row['theme']]]);
      break;
    }

    case "logout": {
      session_destroy();
      json_ok();
      break;
    }

    case "me": {
      if (!isset($_SESSION['user_id'])) { json_ok(["user"=>null]); break; }
      $uid = (int)$_SESSION['user_id'];
      $pdo = db();
      $stmt = $pdo->prepare("SELECT u.id, u.email, p.display_name, p.theme
                             FROM users u JOIN profiles p ON p.user_id=u.id
                             WHERE u.id=? LIMIT 1");
      $stmt->execute([$uid]);
      $row = $stmt->fetch();
      json_ok(["user" => $row ? [
        "id" => (int)$row['id'],
        "email" => $row['email'],
        "display_name" => $row['display_name'],
        "theme" => $row['theme']
      ] : null]);
      break;
    }

    // ---------- GAME SESSIONS ----------
    case "start_session": {
      $uid = require_auth();
      $in = read_json();
      $size = int_range($in['puzzle_size'] ?? 4, 3, 10, 4);
      $difficulty = int_range($in['difficulty_level'] ?? 1, 1, 5, 1);
      $seed = str_clean($in['seed'] ?? '', 64);
      $now = (new DateTimeImmutable("now"))->format("Y-m-d H:i:s");

      $pdo = db();
      $stmt = $pdo->prepare("INSERT INTO game_sessions(user_id, puzzle_size, difficulty_level, seed, started_at)
                             VALUES (?, ?, ?, ?, ?)");
      $stmt->execute([$uid, $size, $difficulty, $seed ?: null, $now]);
      $sid = (int)$pdo->lastInsertId();
      json_ok(["session_id" => $sid]);
      break;
    }

    case "record_move": {
      $uid = require_auth();
      $in = read_json();
      $sid = int_range($in['session_id'] ?? 0, 1, PHP_INT_MAX, 0);
      $moveNo = int_range($in['move_no'] ?? 1, 1, 1000000, 1);
      $tileId = int_range($in['tile_id'] ?? 0, 0, 1000000, 0);
      $from = int_range($in['from_index'] ?? 0, 0, 1000000, 0);
      $to = int_range($in['to_index'] ?? 0, 0, 1000000, 0);

      if ($sid <= 0) json_fail("Invalid session_id");

      $pdo = db();
      // ensure session belongs to user
      $chk = $pdo->prepare("SELECT id FROM game_sessions WHERE id=? AND user_id=? LIMIT 1");
      $chk->execute([$sid, $uid]);
      if (!$chk->fetch()) json_fail("Session not found", 404);

      $now = (new DateTimeImmutable("now"))->format("Y-m-d H:i:s");
      $stmt = $pdo->prepare("INSERT INTO moves(session_id, move_no, tile_id, from_index, to_index, moved_at)
                             VALUES (?, ?, ?, ?, ?, ?)");
      $stmt->execute([$sid, $moveNo, $tileId, $from, $to, $now]);

      $upd = $pdo->prepare("UPDATE game_sessions SET total_moves = GREATEST(total_moves, ?) WHERE id=?");
      $upd->execute([$moveNo, $sid]);

      json_ok();
      break;
    }

    case "end_session": {
      $uid = require_auth();
      $in = read_json();
      $sid = int_range($in['session_id'] ?? 0, 1, PHP_INT_MAX, 0);
      $completed = !empty($in['completed']) ? 1 : 0;
      $duration = int_range($in['duration_seconds'] ?? 0, 0, 10000000, 0);
      $moves = int_range($in['total_moves'] ?? 0, 0, 10000000, 0);

      $pdo = db();
      $chk = $pdo->prepare("SELECT id FROM game_sessions WHERE id=? AND user_id=? LIMIT 1");
      $chk->execute([$sid, $uid]);
      if (!$chk->fetch()) json_fail("Session not found", 404);

      $now = (new DateTimeImmutable("now"))->format("Y-m-d H:i:s");
      $stmt = $pdo->prepare("UPDATE game_sessions
                             SET ended_at=?, completed=?, duration_seconds=?, total_moves=?
                             WHERE id=?");
      $stmt->execute([$now, $completed, $duration, $moves, $sid]);

      json_ok();
      break;
    }

    // ---------- LEADERBOARD ----------
    case "leaderboard": {
      $size = int_range($_GET['size'] ?? 4, 3, 10, 4);
      $pdo = db();
      $stmt = $pdo->prepare("
        SELECT p.display_name, gs.puzzle_size, gs.duration_seconds, gs.total_moves, gs.started_at
        FROM game_sessions gs
        JOIN profiles p ON p.user_id = gs.user_id
        WHERE gs.completed=1 AND gs.puzzle_size=?
        ORDER BY gs.duration_seconds ASC, gs.total_moves ASC
        LIMIT 10
      ");
      $stmt->execute([$size]);
      json_ok(["rows" => $stmt->fetchAll()]);
      break;
    }

    default:
      json_fail("Unknown action", 404);
  }

} catch (Throwable $e) {
  json_fail("Server error: " . $e->getMessage(), 500);
}
