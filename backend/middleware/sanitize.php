<?php
declare(strict_types=1);

function read_json(): array {
  $raw = file_get_contents('php://input');
  $data = json_decode($raw ?: "{}", true);
  if (!is_array($data)) $data = [];
  return $data;
}

function str_clean(?string $s, int $maxLen = 255): string {
  $s = trim((string)$s);
  if (mb_strlen($s) > $maxLen) $s = mb_substr($s, 0, $maxLen);
  return $s;
}

function int_range($v, int $min, int $max, int $default): int {
  if (!is_numeric($v)) return $default;
  $n = (int)$v;
  return max($min, min($max, $n));
}
