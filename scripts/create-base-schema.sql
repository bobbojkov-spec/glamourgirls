-- Base schema for glamourgirls database
-- Creates the essential girls and images tables

USE glamourgirls;

-- Create girls table
CREATE TABLE IF NOT EXISTS girls (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nm VARCHAR(255) NOT NULL COMMENT 'Full name',
  firstname VARCHAR(255) DEFAULT NULL,
  familiq VARCHAR(255) DEFAULT NULL COMMENT 'Surname',
  godini INT DEFAULT NULL COMMENT 'Era: 1=20-30s, 2=40s, 3=50s, 4=60s',
  isnew INT DEFAULT 1 COMMENT '1=not new, 2=new',
  isnewpix INT DEFAULT 1 COMMENT '1=no new photos, 2=has new photos',
  published INT DEFAULT 1 COMMENT '1=unpublished, 2=published',
  theirman VARCHAR(255) DEFAULT NULL,
  slug VARCHAR(255) DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_published (published),
  INDEX idx_firstname (firstname),
  INDEX idx_familiq (familiq),
  INDEX idx_slug (slug),
  INDEX idx_theirman (theirman)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create images table
CREATE TABLE IF NOT EXISTS images (
  id INT AUTO_INCREMENT PRIMARY KEY,
  girlid INT NOT NULL,
  path VARCHAR(500) NOT NULL,
  width INT DEFAULT NULL,
  height INT DEFAULT NULL,
  mytp INT NOT NULL COMMENT '3=thumbnails, 4=gallery, 5=HQ',
  thumbid INT DEFAULT NULL,
  mimetype VARCHAR(100) DEFAULT NULL,
  sz INT DEFAULT NULL COMMENT 'File size in bytes',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (girlid) REFERENCES girls(id) ON DELETE CASCADE,
  INDEX idx_girlid (girlid),
  INDEX idx_mytp (mytp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

