import mysql from 'mysql2/promise';
import { env } from './env';

export const pool = mysql.createPool({
  host: env.dbHost,
  port: env.dbPort,
  user: env.dbUser,
  password: env.dbPassword,
  database: env.dbName,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4',
});

export async function healthcheckDatabase() {
  const connection = await pool.getConnection();
  try {
    await connection.ping();
  } finally {
    connection.release();
  }
}

export async function ensureAppTables() {
  const connection = await pool.getConnection();
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS destinations (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(191) NOT NULL,
        type ENUM('hotel', 'restaurant', 'attraction') NOT NULL DEFAULT 'attraction',
        description TEXT NULL,
        location VARCHAR(191) NULL,
        image_url TEXT NULL,
        price_range VARCHAR(80) NULL,
        rating DECIMAL(3,2) NOT NULL DEFAULT 4.5,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_destinations_name (name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS places (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        destination_id BIGINT UNSIGNED NOT NULL,
        external_id VARCHAR(191) NULL,
        name VARCHAR(191) NOT NULL,
        type ENUM('hotel', 'restaurant', 'attraction', 'place') NOT NULL DEFAULT 'place',
        location VARCHAR(191) NULL,
        rating DECIMAL(3,2) NULL,
        image_url TEXT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_places_destination_id (destination_id),
        INDEX idx_places_external_id (external_id),
        CONSTRAINT fk_places_destination FOREIGN KEY (destination_id) REFERENCES destinations(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS itineraries (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        destination_id BIGINT UNSIGNED NOT NULL,
        title VARCHAR(191) NOT NULL,
        destination VARCHAR(191) NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        status ENUM('draft', 'confirmed', 'upcoming', 'completed') NOT NULL DEFAULT 'draft',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_itineraries_user_id (user_id),
        INDEX idx_itineraries_destination_id (destination_id),
        CONSTRAINT fk_itineraries_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_itineraries_destination FOREIGN KEY (destination_id) REFERENCES destinations(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS itinerary_days (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        itinerary_id BIGINT UNSIGNED NOT NULL,
        day_number INT NOT NULL,
        day_date DATE NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_itinerary_days (itinerary_id, day_number),
        INDEX idx_itinerary_days_itinerary_id (itinerary_id),
        CONSTRAINT fk_itinerary_days_itinerary FOREIGN KEY (itinerary_id) REFERENCES itineraries(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS itinerary_items (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        day_id BIGINT UNSIGNED NOT NULL,
        itinerary_id BIGINT UNSIGNED NOT NULL,
        place_id BIGINT UNSIGNED NOT NULL,
        place_name VARCHAR(191) NOT NULL,
        time_slot VARCHAR(30) NOT NULL DEFAULT '09:00',
        notes TEXT NULL,
        image_url TEXT NULL,
        location VARCHAR(191) NULL,
        price DECIMAL(10,2) NOT NULL DEFAULT 0,
        currency VARCHAR(10) NOT NULL DEFAULT 'USD',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_itinerary_items_day_id (day_id),
        INDEX idx_itinerary_items_itinerary_id (itinerary_id),
        INDEX idx_itinerary_items_place_id (place_id),
        CONSTRAINT fk_itinerary_items_day FOREIGN KEY (day_id) REFERENCES itinerary_days(id) ON DELETE CASCADE,
        CONSTRAINT fk_itinerary_items_itinerary FOREIGN KEY (itinerary_id) REFERENCES itineraries(id) ON DELETE CASCADE,
        CONSTRAINT fk_itinerary_items_place FOREIGN KEY (place_id) REFERENCES places(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS blog_posts (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        author_name VARCHAR(120) NOT NULL,
        title VARCHAR(191) NOT NULL,
        slug VARCHAR(191) NOT NULL,
        excerpt TEXT NOT NULL,
        content LONGTEXT NOT NULL,
        cover_image TEXT NULL,
        tags_json TEXT NULL,
        status ENUM('pending', 'approved') NOT NULL DEFAULT 'pending',
        approved_by INT NULL,
        approved_at DATETIME NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_blog_posts_slug (slug),
        INDEX idx_blog_posts_status (status),
        INDEX idx_blog_posts_user_id (user_id),
        CONSTRAINT fk_blog_posts_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_blog_posts_approved_by FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        itinerary_id BIGINT UNSIGNED NULL,
        place_id BIGINT UNSIGNED NULL,
        place_name VARCHAR(191) NULL,
        booking_type VARCHAR(30) NOT NULL DEFAULT 'hotel',
        flight_name VARCHAR(191) NULL,
        hotel_name VARCHAR(191) NOT NULL,
        location VARCHAR(191) NULL,
        image_url TEXT NULL,
        check_in DATE NOT NULL,
        check_out DATE NOT NULL,
        guests INT NOT NULL DEFAULT 1,
        flight_details_json LONGTEXT NULL,
        status ENUM('pending', 'confirmed', 'cancelled') NOT NULL DEFAULT 'confirmed',
        total_price DECIMAL(10,2) NOT NULL DEFAULT 0,
        currency VARCHAR(10) NOT NULL DEFAULT 'USD',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_bookings_user_id (user_id),
        INDEX idx_bookings_itinerary_id (itinerary_id),
        INDEX idx_bookings_place_id (place_id),
        INDEX idx_bookings_status (status),
        INDEX idx_bookings_created_at (created_at),
        CONSTRAINT fk_bookings_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_bookings_itinerary FOREIGN KEY (itinerary_id) REFERENCES itineraries(id) ON DELETE SET NULL,
        CONSTRAINT fk_bookings_place FOREIGN KEY (place_id) REFERENCES places(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS contact_messages (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        name VARCHAR(120) NOT NULL,
        email VARCHAR(190) NOT NULL,
        topic VARCHAR(120) NOT NULL,
        destination VARCHAR(160) NULL,
        start_date VARCHAR(30) NULL,
        end_date VARCHAR(30) NULL,
        message_body TEXT NOT NULL,
        status ENUM('new', 'replied') NOT NULL DEFAULT 'new',
        reply_text TEXT NULL,
        replied_at DATETIME NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_contact_messages_user_id (user_id),
        INDEX idx_contact_messages_status (status),
        CONSTRAINT fk_contact_messages_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS favorites (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        item_id VARCHAR(191) NOT NULL,
        title VARCHAR(191) NOT NULL,
        city VARCHAR(120) NOT NULL,
        country VARCHAR(120) NOT NULL,
        image_url TEXT NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        currency VARCHAR(10) NOT NULL,
        rating DECIMAL(3,2) NOT NULL,
        property_type VARCHAR(80) NOT NULL,
        saved_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_favorites_user_item (user_id, item_id),
        INDEX idx_favorites_user_id (user_id),
        CONSTRAINT fk_favorites_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
  } finally {
    connection.release();
  }
}

export async function runSchemaUpgrades() {
  const connection = await pool.getConnection();
  try {
    // Upgrade profile_image from VARCHAR(512) → MEDIUMTEXT to support base64 DataURLs
    await connection.query(`
      ALTER TABLE users MODIFY COLUMN profile_image MEDIUMTEXT NULL
    `).catch(() => {/* ignore if already MEDIUMTEXT or DB not ready */});

    await connection.query(`
      ALTER TABLE places ADD COLUMN external_id VARCHAR(191) NULL AFTER destination_id
    `).catch(() => undefined);

    await connection.query(`
      ALTER TABLE places ADD COLUMN location VARCHAR(191) NULL AFTER type
    `).catch(() => undefined);

    await connection.query(`
      ALTER TABLE itinerary_items ADD COLUMN itinerary_id BIGINT UNSIGNED NULL AFTER day_id
    `).catch(() => undefined);

    await connection.query(`
      ALTER TABLE itinerary_items ADD COLUMN place_name VARCHAR(191) NULL AFTER place_id
    `).catch(() => undefined);

    await connection.query(`
      ALTER TABLE itinerary_items ADD COLUMN price DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER location
    `).catch(() => undefined);

    await connection.query(`
      ALTER TABLE itinerary_items ADD COLUMN currency VARCHAR(10) NOT NULL DEFAULT 'USD' AFTER price
    `).catch(() => undefined);

    await connection.query(`
      ALTER TABLE places ADD COLUMN image_url TEXT NULL AFTER rating
    `).catch(() => undefined);

    await connection.query(`
      ALTER TABLE destinations ADD COLUMN type ENUM('hotel', 'restaurant', 'attraction') NOT NULL DEFAULT 'attraction' AFTER name
    `).catch(() => undefined);

    await connection.query(`
      ALTER TABLE destinations ADD COLUMN description TEXT NULL AFTER type
    `).catch(() => undefined);

    await connection.query(`
      ALTER TABLE destinations ADD COLUMN location VARCHAR(191) NULL AFTER description
    `).catch(() => undefined);

    await connection.query(`
      ALTER TABLE destinations ADD COLUMN image_url TEXT NULL AFTER location
    `).catch(() => undefined);

    await connection.query(`
      ALTER TABLE destinations ADD COLUMN price_range VARCHAR(80) NULL AFTER image_url
    `).catch(() => undefined);

    await connection.query(`
      ALTER TABLE destinations ADD COLUMN rating DECIMAL(3,2) NOT NULL DEFAULT 4.5 AFTER price_range
    `).catch(() => undefined);

    await connection.query(`
      DELETE duplicate_destinations
      FROM destinations AS duplicate_destinations
      INNER JOIN destinations AS canonical_destinations
        ON duplicate_destinations.name = canonical_destinations.name
       AND duplicate_destinations.type = canonical_destinations.type
       AND COALESCE(duplicate_destinations.location, '') = COALESCE(canonical_destinations.location, '')
       AND duplicate_destinations.id > canonical_destinations.id
    `).catch(() => undefined);

    await connection.query(`
      DELETE FROM destinations
      WHERE TRIM(COALESCE(location, '')) = ''
    `).catch(() => undefined);

    await connection.query(`
      ALTER TABLE destinations DROP INDEX uq_destinations_name
    `).catch(() => undefined);

    await connection.query(`
      ALTER TABLE destinations ADD UNIQUE KEY uq_destinations_identity (name, type, location)
    `).catch(() => undefined);

    await connection.query(`
      ALTER TABLE itineraries ADD COLUMN destination VARCHAR(191) NOT NULL DEFAULT '' AFTER title
    `).catch(() => undefined);

    await connection.query(`
      ALTER TABLE itineraries ADD COLUMN status ENUM('draft', 'confirmed', 'upcoming', 'completed') NOT NULL DEFAULT 'draft' AFTER end_date
    `).catch(() => undefined);

    await connection.query(`
      ALTER TABLE itinerary_days ADD COLUMN day_date DATE NULL AFTER day_number
    `).catch(() => undefined);

    await connection.query(`
      ALTER TABLE itinerary_items ADD COLUMN image_url TEXT NULL AFTER notes
    `).catch(() => undefined);

    await connection.query(`
      ALTER TABLE itinerary_items ADD COLUMN location VARCHAR(191) NULL AFTER image_url
    `).catch(() => undefined);

    await connection.query(`
      ALTER TABLE itinerary_items MODIFY COLUMN time_slot VARCHAR(30) NOT NULL DEFAULT '09:00'
    `).catch(() => undefined);

    await connection.query(`
      CREATE INDEX idx_itinerary_items_itinerary_id ON itinerary_items (itinerary_id)
    `).catch(() => undefined);

    await connection.query(`
      UPDATE itinerary_items it
      INNER JOIN itinerary_days d ON d.id = it.day_id
      SET it.itinerary_id = d.itinerary_id
      WHERE it.itinerary_id IS NULL
    `).catch(() => undefined);

    await connection.query(`
      UPDATE itinerary_items it
      INNER JOIN places p ON p.id = it.place_id
      SET it.place_name = p.name
      WHERE it.place_name IS NULL OR it.place_name = ''
    `).catch(() => undefined);

    await connection.query(`
      ALTER TABLE itinerary_items MODIFY COLUMN itinerary_id BIGINT UNSIGNED NOT NULL
    `).catch(() => undefined);

    await connection.query(`
      ALTER TABLE itinerary_items MODIFY COLUMN place_name VARCHAR(191) NOT NULL
    `).catch(() => undefined);

    await connection.query(`
      ALTER TABLE itinerary_items ADD CONSTRAINT fk_itinerary_items_itinerary FOREIGN KEY (itinerary_id) REFERENCES itineraries(id) ON DELETE CASCADE
    `).catch(() => undefined);

    await connection.query(`
      ALTER TABLE blog_posts ADD COLUMN author_name VARCHAR(120) NOT NULL DEFAULT 'User' AFTER user_id
    `).catch(() => undefined);

    await connection.query(`
      ALTER TABLE blog_posts ADD COLUMN slug VARCHAR(191) NULL AFTER title
    `).catch(() => undefined);

    await connection.query(`
      ALTER TABLE blog_posts ADD COLUMN excerpt TEXT NULL AFTER slug
    `).catch(() => undefined);

    await connection.query(`
      ALTER TABLE blog_posts ADD COLUMN cover_image TEXT NULL AFTER content
    `).catch(() => undefined);

    await connection.query(`
      ALTER TABLE blog_posts ADD COLUMN tags_json TEXT NULL AFTER cover_image
    `).catch(() => undefined);

    await connection.query(`
      ALTER TABLE blog_posts ADD COLUMN approved_by INT NULL AFTER status
    `).catch(() => undefined);

    await connection.query(`
      ALTER TABLE blog_posts ADD COLUMN approved_at DATETIME NULL AFTER approved_by
    `).catch(() => undefined);

    await connection.query(`
      ALTER TABLE blog_posts ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at
    `).catch(() => undefined);

    await connection.query(`
      ALTER TABLE bookings ADD COLUMN itinerary_id BIGINT UNSIGNED NULL AFTER user_id
    `).catch(() => undefined);

    await connection.query(`
      ALTER TABLE bookings ADD COLUMN place_id BIGINT UNSIGNED NULL AFTER itinerary_id
    `).catch(() => undefined);

    await connection.query(`
      ALTER TABLE bookings ADD COLUMN place_name VARCHAR(191) NULL AFTER place_id
    `).catch(() => undefined);

    await connection.query(`
      ALTER TABLE bookings ADD COLUMN hotel_name VARCHAR(191) NOT NULL DEFAULT 'Booking' AFTER itinerary_id
    `).catch(() => undefined);

    await connection.query(`
      ALTER TABLE bookings ADD COLUMN booking_type VARCHAR(30) NOT NULL DEFAULT 'hotel' AFTER itinerary_id
    `).catch(() => undefined);

    await connection.query(`
      ALTER TABLE bookings ADD COLUMN flight_name VARCHAR(191) NULL AFTER booking_type
    `).catch(() => undefined);

    await connection.query(`
      ALTER TABLE bookings ADD COLUMN flight_details_json LONGTEXT NULL AFTER guests
    `).catch(() => undefined);

    await connection.query(`
      ALTER TABLE bookings ADD COLUMN location VARCHAR(191) NULL AFTER hotel_name
    `).catch(() => undefined);

    await connection.query(`
      ALTER TABLE bookings ADD COLUMN image_url TEXT NULL AFTER location
    `).catch(() => undefined);

    await connection.query(`
      ALTER TABLE bookings ADD COLUMN check_in DATE NULL AFTER image_url
    `).catch(() => undefined);

    await connection.query(`
      ALTER TABLE bookings ADD COLUMN check_out DATE NULL AFTER check_in
    `).catch(() => undefined);

    await connection.query(`
      ALTER TABLE bookings ADD COLUMN guests INT NOT NULL DEFAULT 1 AFTER check_out
    `).catch(() => undefined);

    await connection.query(`
      ALTER TABLE bookings ADD COLUMN total_price DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER status
    `).catch(() => undefined);

    await connection.query(`
      ALTER TABLE bookings ADD COLUMN currency VARCHAR(10) NOT NULL DEFAULT 'USD' AFTER total_price
    `).catch(() => undefined);

    await connection.query(`
      ALTER TABLE bookings ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at
    `).catch(() => undefined);

    await connection.query(`
      ALTER TABLE bookings MODIFY COLUMN status ENUM('pending', 'confirmed', 'cancelled') NOT NULL DEFAULT 'confirmed'
    `).catch(() => undefined);

    await connection.query(`
      CREATE INDEX idx_bookings_place_id ON bookings (place_id)
    `).catch(() => undefined);

    await connection.query(`
      UPDATE bookings
      SET place_name = COALESCE(NULLIF(place_name, ''), NULLIF(flight_name, ''), hotel_name)
      WHERE place_name IS NULL OR place_name = ''
    `).catch(() => undefined);

    await connection.query(`
      UPDATE bookings b
      INNER JOIN itineraries i ON i.id = b.itinerary_id
      INNER JOIN places p ON p.destination_id = i.destination_id AND p.name = b.place_name
      SET b.place_id = p.id
      WHERE b.place_id IS NULL AND b.itinerary_id IS NOT NULL AND b.place_name IS NOT NULL AND b.place_name <> ''
    `).catch(() => undefined);

    await connection.query(`
      ALTER TABLE bookings ADD CONSTRAINT fk_bookings_place FOREIGN KEY (place_id) REFERENCES places(id) ON DELETE SET NULL
    `).catch(() => undefined);

    await connection.query(`
      UPDATE blog_posts SET author_name = COALESCE(NULLIF(author_name, ''), 'User')
    `).catch(() => undefined);

    await connection.query(`
      UPDATE blog_posts SET slug = CONCAT('post-', id) WHERE slug IS NULL OR slug = ''
    `).catch(() => undefined);

    await connection.query(`
      UPDATE blog_posts SET excerpt = LEFT(content, 180) WHERE excerpt IS NULL OR excerpt = ''
    `).catch(() => undefined);

    await connection.query(`
      ALTER TABLE blog_posts MODIFY COLUMN slug VARCHAR(191) NOT NULL
    `).catch(() => undefined);

    await connection.query(`
      ALTER TABLE blog_posts MODIFY COLUMN excerpt TEXT NOT NULL
    `).catch(() => undefined);

    await connection.query(`
      CREATE UNIQUE INDEX uq_blog_posts_slug ON blog_posts (slug)
    `).catch(() => undefined);
  } finally {
    connection.release();
  }
}
