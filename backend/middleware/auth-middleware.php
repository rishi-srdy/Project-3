<?php
declare(strict_types=1);

function require_auth(): int {
  if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(["ok" => false, "error" => "Not authenticated"]);
    exit;
  }
  return (int)$_SESSION['user_id'];
}
