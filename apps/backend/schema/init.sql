-- Create the users table
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  passwordHash TEXT NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create the guests table
CREATE TABLE IF NOT EXISTS guests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id INTEGER,
  group_label TEXT UNIQUE,
  name TEXT NOT NULL,
  email TEXT,
  code TEXT UNIQUE NOT NULL,
  can_bring_plus_one BOOLEAN DEFAULT 0,
  num_kids INTEGER DEFAULT 0,
  attending BOOLEAN,
  dietary TEXT,
  notes TEXT,
  responded_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create the email_settings table
CREATE TABLE IF NOT EXISTS email_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  provider TEXT NOT NULL DEFAULT 'resend',
  api_key TEXT,
  from_name TEXT,
  from_email TEXT,
  enabled BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
