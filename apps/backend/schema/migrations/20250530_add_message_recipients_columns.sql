-- Populate existing rows with initial updated_at values
UPDATE message_recipients
  SET updated_at = created_at
  WHERE updated_at IS NULL;