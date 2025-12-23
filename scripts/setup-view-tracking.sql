-- Add views column to girls table if it doesn't exist
ALTER TABLE girls 
ADD COLUMN IF NOT EXISTS views INT DEFAULT 0;

-- Create views_log table for detailed view tracking
CREATE TABLE IF NOT EXISTS views_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  girlid INT NOT NULL,
  viewed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_girlid (girlid),
  INDEX idx_viewed_at (viewed_at),
  FOREIGN KEY (girlid) REFERENCES girls(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

