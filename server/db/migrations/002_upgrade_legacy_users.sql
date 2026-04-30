USE travel_planner;

ALTER TABLE users
  CHANGE COLUMN password password_hash VARCHAR(255) NOT NULL,
  MODIFY COLUMN name VARCHAR(120) NOT NULL,
  MODIFY COLUMN email VARCHAR(190) NOT NULL,
  MODIFY COLUMN role ENUM('user', 'admin') NOT NULL DEFAULT 'user',
  ADD COLUMN phone VARCHAR(30) NULL AFTER role,
  ADD COLUMN profile_image VARCHAR(512) NULL AFTER phone,
  ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1 AFTER profile_image,
  ADD COLUMN last_login_at TIMESTAMP NULL DEFAULT NULL AFTER is_active,
  ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at;

ALTER TABLE users
  ADD UNIQUE KEY uq_users_email (email),
  ADD KEY idx_users_role (role),
  ADD KEY idx_users_created_at (created_at);
