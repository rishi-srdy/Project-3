<?php
declare(strict_types=1);

require_once __DIR__ . "/connection.php";

try {
  $sql = file_get_contents(__DIR__ . "/schema.sql");
  if ($sql === false) {
    throw new RuntimeException("Could not read schema.sql");
  }

  $db = db();
  $db->exec($sql);

  echo "✅ Tables created successfully.";
} catch (Throwable $e) {
  echo "❌ Error creating tables: " . $e->getMessage();
}
