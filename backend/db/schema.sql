-- CODD FIXED SCHEMA
-- NOTE: On CODD you must use your username database ONLY.
-- Database: rsangareddypeta1

USE rsangareddypeta1;

-- USERS
CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS profiles (
  user_id BIGINT UNSIGNED PRIMARY KEY,
  display_name VARCHAR(80) NOT NULL,
  theme VARCHAR(30) NOT NULL DEFAULT 'santa',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- GAME SESSIONS
CREATE TABLE IF NOT EXISTS game_sessions (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  puzzle_size INT NOT NULL,
  difficulty_level INT NOT NULL DEFAULT 1,
  seed VARCHAR(64) NULL,
  started_at DATETIME NOT NULL,
  ended_at DATETIME NULL,
  total_moves INT NOT NULL DEFAULT 0,
  duration_seconds INT NOT NULL DEFAULT 0,
  completed TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_sessions_user_time (user_id, started_at),
  INDEX idx_sessions_leaderboard (puzzle_size, completed, duration_seconds, total_moves),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS moves (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  session_id BIGINT UNSIGNED NOT NULL,
  move_no INT NOT NULL,
  tile_id INT NOT NULL,
  from_index INT NOT NULL,
  to_index INT NOT NULL,
  moved_at DATETIME NOT NULL,
  INDEX idx_moves_session (session_id, move_no),
  FOREIGN KEY (session_id) REFERENCES game_sessions(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ACHIEVEMENTS
CREATE TABLE IF NOT EXISTS achievements (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(60) NOT NULL UNIQUE,
  title VARCHAR(120) NOT NULL,
  description VARCHAR(255) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS user_achievements (
  user_id BIGINT UNSIGNED NOT NULL,
  achievement_id BIGINT UNSIGNED NOT NULL,
  unlocked_at DATETIME NOT NULL,
  PRIMARY KEY (user_id, achievement_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (achievement_id) REFERENCES achievements(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- STORY PROGRESS
CREATE TABLE IF NOT EXISTS story_progress (
  user_id BIGINT UNSIGNED PRIMARY KEY,
  node_key VARCHAR(80) NOT NULL DEFAULT 'start',
  updated_at DATETIME NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- CHALLENGES
CREATE TABLE IF NOT EXISTS challenges (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  creator_user_id BIGINT UNSIGNED NOT NULL,
  code VARCHAR(20) NOT NULL UNIQUE,
  puzzle_size INT NOT NULL,
  seed VARCHAR(64) NOT NULL,
  difficulty_level INT NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL,
  FOREIGN KEY (creator_user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_challenges_code (code)
) ENGINE=InnoDB;
