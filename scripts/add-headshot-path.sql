-- Adds metadata fields to track headshot storage identity
ALTER TABLE girls
  ADD COLUMN IF NOT EXISTS headshot_path VARCHAR(255),
  ADD COLUMN IF NOT EXISTS headshot_updated_at TIMESTAMP;

