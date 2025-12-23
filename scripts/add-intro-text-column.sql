-- Add intro_text column to girls table if it doesn't exist

SET @dbname = DATABASE();
SET @tablename = 'girls';
SET @columnname = 'introText';

SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' TEXT DEFAULT NULL')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

