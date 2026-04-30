USE travel_planner;

-- Expand profile_image to TEXT so it can store base64 data URLs
ALTER TABLE users
  MODIFY COLUMN profile_image TEXT NULL;
