<?php
declare(strict_types=1);

function env_load(string $path): array {
  if (!file_exists($path)) return [];
  $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
  $env = [];
  foreach ($lines as $line) {
    if (str_starts_with(trim($line), '#')) continue;
    $parts = explode('=', $line, 2);
    if (count($parts) !== 2) continue;
    $k = trim($parts[0]);
    $v = trim($parts[1]);
    $env[$k] = $v;
  }
  return $env;
}

function db(): PDO {
  static $pdo = null;
  if ($pdo) return $pdo;

  $env = env_load(__DIR__ . '/../../deployment/.env'); // create this file based on .env.example
  $host = $env['DB_HOST'] ?? 'localhost';
  $name = $env['DB_NAME'] ?? 'christmas_puzzle';
  $user = $env['DB_USER'] ?? 'root';
  $pass = $env['DB_PASS'] ?? '';
  $charset = $env['DB_CHARSET'] ?? 'utf8mb4';

  $dsn = "mysql:host={$host};dbname={$name};charset={$charset}";
  $pdo = new PDO($dsn, $user, $pass, [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
  ]);
  return $pdo;
}
