-- Increase profile_image column to MEDIUMTEXT to support base64 DataURL avatars
-- (VARCHAR(512) is far too small for image data URLs)
ALTER TABLE users
  MODIFY COLUMN profile_image MEDIUMTEXT NULL;
