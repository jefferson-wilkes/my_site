CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS game_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  score INTEGER NOT NULL,
  caught INTEGER NOT NULL,
  missed INTEGER NOT NULL,
  pounces INTEGER NOT NULL,
  avg_laser_y REAL NOT NULL,
  avg_speed REAL NOT NULL,
  total_laser_dist REAL NOT NULL,
  movement_frequency REAL NOT NULL,
  movement_smoothness REAL NOT NULL,
  time_stationary REAL NOT NULL,
  played_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_game_sessions_user ON game_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_score ON game_sessions(score DESC);
