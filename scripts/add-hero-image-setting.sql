-- Add hero image setting to database
-- This stores the path to the selected hero image

-- Create a simple settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS site_settings (
  id SERIAL PRIMARY KEY,
  setting_key VARCHAR(255) UNIQUE NOT NULL,
  setting_value TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert or update hero image setting (default: NULL = no hero image)
INSERT INTO site_settings (setting_key, setting_value)
VALUES ('hero_image_path', NULL)
ON CONFLICT (setting_key) DO NOTHING;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_site_settings_key ON site_settings(setting_key);

