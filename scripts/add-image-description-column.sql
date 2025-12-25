-- Add description column to images table for storing formatted dimensions and file size
-- Format: "2557 × 3308 px (24.2 MB)"
-- Only populated for images where longer side > 1200px

ALTER TABLE images 
ADD COLUMN IF NOT EXISTS description TEXT DEFAULT NULL;

-- Add index for faster queries if needed
CREATE INDEX IF NOT EXISTS idx_images_description ON images(description) WHERE description IS NOT NULL;

