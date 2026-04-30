-- Voyage Planner Database Schema
-- Database: travel_planner

CREATE DATABASE IF NOT EXISTS travel_planner;
USE travel_planner;

-- 1. USERS Table
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('user', 'admin') DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. DESTINATIONS Table
CREATE TABLE destinations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    image_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. PLACES Table (Hotels, Restaurants, Attractions)
CREATE TABLE places (
    id INT AUTO_INCREMENT PRIMARY KEY,
    destination_id INT NOT NULL,
    name VARCHAR(150) NOT NULL,
    type ENUM('hotel', 'restaurant', 'attraction') NOT NULL,
    description TEXT,
    rating DECIMAL(3, 2) DEFAULT 0.00,
    image_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (destination_id) REFERENCES destinations(id) ON DELETE CASCADE
);

-- 4. ITINERARIES Table
CREATE TABLE itineraries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    destination_id INT NOT NULL,
    title VARCHAR(150) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (destination_id) REFERENCES destinations(id) ON DELETE CASCADE
);

-- 5. ITINERARY_DAYS Table
CREATE TABLE itinerary_days (
    id INT AUTO_INCREMENT PRIMARY KEY,
    itinerary_id INT NOT NULL,
    day_number INT NOT NULL,
    FOREIGN KEY (itinerary_id) REFERENCES itineraries(id) ON DELETE CASCADE
);

-- 6. ITINERARY_ITEMS Table (Activities)
CREATE TABLE itinerary_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    day_id INT NOT NULL,
    place_id INT NOT NULL,
    time_slot ENUM('morning', 'afternoon', 'evening') NOT NULL,
    notes TEXT,
    FOREIGN KEY (day_id) REFERENCES itinerary_days(id) ON DELETE CASCADE,
    FOREIGN KEY (place_id) REFERENCES places(id) ON DELETE CASCADE
);

-- 7. BOOKINGS Table
CREATE TABLE bookings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    itinerary_id INT NOT NULL,
    status ENUM('pending', 'confirmed', 'cancelled') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (itinerary_id) REFERENCES itineraries(id) ON DELETE CASCADE
);

-- =============================================
-- DEMO DATA
-- =============================================

-- Insert Roles
INSERT INTO users (name, email, password, role) VALUES 
('Test User', 'user@test.com', '123456', 'user'),
('System Admin', 'admin@test.com', '123456', 'admin');

-- Insert Sample Destination
INSERT INTO destinations (name, description, image_url) VALUES 
('Paris, France', 'The city of lights and romance.', 'https://picsum.photos/seed/paris/800/600');

-- Insert Sample Places
INSERT INTO places (destination_id, name, type, description, rating, image_url) VALUES 
(1, 'The Ritz Paris', 'hotel', 'Luxury hotel in the heart of Paris.', 4.9, 'https://picsum.photos/seed/ritz/800/600'),
(1, 'Le Meurice', 'restaurant', 'Fine dining experience.', 4.7, 'https://picsum.photos/seed/meurice/800/600'),
(1, 'Eiffel Tower', 'attraction', 'Iconic iron lattice tower.', 4.8, 'https://picsum.photos/seed/eiffel/800/600');

-- Insert Sample Itinerary
INSERT INTO itineraries (user_id, destination_id, title, start_date, end_date) VALUES 
(1, 1, 'Romantic Paris Getaway', '2026-06-01', '2026-06-03');

-- Insert Itinerary Days
INSERT INTO itinerary_days (itinerary_id, day_number) VALUES 
(1, 1), (1, 2);

-- Insert Itinerary Items
INSERT INTO itinerary_items (day_id, place_id, time_slot, notes) VALUES 
(1, 1, 'morning', 'Check-in and breakfast'),
(1, 3, 'afternoon', 'Visit the summit'),
(1, 2, 'evening', 'Dinner with a view');
