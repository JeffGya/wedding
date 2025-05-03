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
  preferred_language TEXT DEFAULT 'en',
  email TEXT,
  code TEXT UNIQUE NOT NULL,
  can_bring_plus_one BOOLEAN DEFAULT 0,
  num_kids INTEGER DEFAULT 0,
  attending BOOLEAN,
  meal_preference TEXT,
  rsvp_deadline DATETIME,
  dietary TEXT,
  notes TEXT,
  responded_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

--ALTER TABLE guests ADD COLUMN preferred_language TEXT DEFAULT 'en';

-- Create the email_settings table
CREATE TABLE IF NOT EXISTS email_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  provider TEXT NOT NULL DEFAULT 'resend',
  api_key TEXT,
  from_name TEXT,
  from_email TEXT,
  enabled BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  sender_name TEXT,
  sender_email TEXT
);

-- Create the messages table
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subject TEXT NOT NULL,
  body_en TEXT NOT NULL,
  body_lt TEXT,
  status TEXT NOT NULL DEFAULT 'draft', -- draft, scheduled, sent
  scheduled_for DATETIME, -- only used when status is 'scheduled'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create the message_recipients table
CREATE TABLE IF NOT EXISTS message_recipients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  message_id INTEGER NOT NULL,
  guest_id INTEGER NOT NULL,
  email TEXT, -- actual email used at send-time
  language TEXT DEFAULT 'en', -- language used at send-time
  delivery_status TEXT DEFAULT 'pending', -- 'pending' when message is created; updated on delivery attempt
  delivery_error TEXT,
  status TEXT DEFAULT 'pending', -- pending, sent, failed
  error_message TEXT,
  sent_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (message_id) REFERENCES messages(id),
  FOREIGN KEY (guest_id) REFERENCES guests(id)
);

-- Create the templates table
CREATE TABLE IF NOT EXISTS templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_en TEXT NOT NULL,
  body_lt TEXT,
  html TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
