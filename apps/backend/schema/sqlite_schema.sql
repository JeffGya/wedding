CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  passwordHash TEXT NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE sqlite_sequence(name,seq);
CREATE TABLE email_settings (
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
CREATE TABLE messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subject TEXT NOT NULL,
  body_en TEXT NOT NULL,
  body_lt TEXT,
  status TEXT NOT NULL DEFAULT 'draft', -- draft, scheduled, sent
  scheduled_for DATETIME, -- only used when status is 'scheduled'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE message_recipients (
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
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP, resend_message_id TEXT, updated_at DATETIME,
  FOREIGN KEY (message_id) REFERENCES messages(id),
  FOREIGN KEY (guest_id) REFERENCES guests(id)
);
CREATE TABLE templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_en TEXT NOT NULL,
  body_lt TEXT,
  html TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE guest_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  rsvp_open BOOLEAN NOT NULL DEFAULT 0,
  rsvp_deadline DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  enable_global_countdown BOOLEAN NOT NULL DEFAULT FALSE,
  wedding_date DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE guests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id INTEGER,
  group_label TEXT,
  name TEXT NOT NULL,
  preferred_language TEXT DEFAULT 'en',
  email TEXT,
  code TEXT UNIQUE,
  can_bring_plus_one BOOLEAN DEFAULT 0,
  is_primary BOOLEAN NOT NULL DEFAULT 1,
  attending BOOLEAN,
  rsvp_deadline DATETIME,
  dietary TEXT,
  notes TEXT,
  rsvp_status TEXT CHECK(rsvp_status IN ('pending','attending','not_attending')) NOT NULL DEFAULT 'pending',
  responded_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
