-- ============================================
-- SEO & Modern Architecture Database Migration
-- ============================================

-- Add SEO fields to girls table if they don't exist
ALTER TABLE girls 
ADD COLUMN IF NOT EXISTS seo_title VARCHAR(255) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS meta_description TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS meta_keywords TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS og_title VARCHAR(255) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS og_description TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS og_image VARCHAR(500) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS canonical_url VARCHAR(500) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS h1_title VARCHAR(255) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS intro_text TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS old_url VARCHAR(500) DEFAULT NULL COMMENT 'For redirect mapping';

-- Add SEO fields to images table
ALTER TABLE images
ADD COLUMN IF NOT EXISTS alt_text VARCHAR(500) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS caption TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS display_order INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS seo_filename VARCHAR(255) DEFAULT NULL;

-- Create tags table
CREATE TABLE IF NOT EXISTS tags (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tag_name VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(100) NOT NULL UNIQUE,
  description TEXT DEFAULT NULL,
  seo_title VARCHAR(255) DEFAULT NULL,
  meta_description TEXT DEFAULT NULL,
  h1_title VARCHAR(255) DEFAULT NULL,
  intro_text TEXT DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_slug (slug),
  INDEX idx_tag_name (tag_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create actress_tags junction table
CREATE TABLE IF NOT EXISTS actress_tags (
  id INT AUTO_INCREMENT PRIMARY KEY,
  girlid INT NOT NULL,
  tag_id INT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (girlid) REFERENCES girls(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
  UNIQUE KEY unique_girl_tag (girlid, tag_id),
  INDEX idx_girlid (girlid),
  INDEX idx_tag_id (tag_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create redirects table for old URLs
CREATE TABLE IF NOT EXISTS url_redirects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  old_url VARCHAR(500) NOT NULL UNIQUE,
  new_url VARCHAR(500) NOT NULL,
  redirect_type INT DEFAULT 301 COMMENT '301 = permanent, 302 = temporary',
  girlid INT DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (girlid) REFERENCES girls(id) ON DELETE SET NULL,
  INDEX idx_old_url (old_url),
  INDEX idx_new_url (new_url),
  INDEX idx_girlid (girlid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create sitemap_cache table for tracking sitemap updates
CREATE TABLE IF NOT EXISTS sitemap_cache (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sitemap_type VARCHAR(50) NOT NULL COMMENT 'actresses, galleries, static, index',
  last_generated DATETIME NOT NULL,
  content_hash VARCHAR(64) DEFAULT NULL,
  INDEX idx_sitemap_type (sitemap_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

