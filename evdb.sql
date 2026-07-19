-- EV App Database Schema
-- Import this in MySQL Workbench (localhost) OR Azure MySQL (remove CREATE DATABASE lines for Azure)

CREATE DATABASE IF NOT EXISTS evdb;
USE evdb;

-- Users table (drivers + service centre admins)
CREATE TABLE users (
    userId INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL,
    password VARCHAR(255) NOT NULL,
    contact VARCHAR(20) NOT NULL,
    role VARCHAR(10) NOT NULL
);

-- Vehicles owned by users
CREATE TABLE vehicles (
    vehicleId INT AUTO_INCREMENT PRIMARY KEY,
    userId INT NOT NULL,
    model VARCHAR(100) NOT NULL,
    plateNumber VARCHAR(20) NOT NULL,
    batteryHealth INT NOT NULL,
    mileage INT NOT NULL,
    image VARCHAR(255),
    FOREIGN KEY (userId) REFERENCES users(userId)
);

-- Battery health logs (one vehicle can have many logs over time)
CREATE TABLE batteryLogs (
    logId INT AUTO_INCREMENT PRIMARY KEY,
    vehicleId INT NOT NULL,
    batteryHealth INT NOT NULL,
    mileage INT NOT NULL,
    logDate DATE NOT NULL,
    FOREIGN KEY (vehicleId) REFERENCES vehicles(vehicleId)
);

-- Charging stations managed by admins
CREATE TABLE chargingStations (
    stationId INT AUTO_INCREMENT PRIMARY KEY,
    stationName VARCHAR(100) NOT NULL,
    location VARCHAR(100) NOT NULL,
    available VARCHAR(10) NOT NULL
);

-- Charging sessions booked by users
CREATE TABLE chargingSessions (
    sessionId INT AUTO_INCREMENT PRIMARY KEY,
    userId INT NOT NULL,
    vehicleId INT NOT NULL,
    stationId INT NOT NULL,
    scheduledDate DATETIME NOT NULL,
    status VARCHAR(20) NOT NULL,
    FOREIGN KEY (userId) REFERENCES users(userId),
    FOREIGN KEY (vehicleId) REFERENCES vehicles(vehicleId),
    FOREIGN KEY (stationId) REFERENCES chargingStations(stationId)
);

-- Seed data
-- Passwords are SHA1 hashed. Plaintext: 'password123' for all seeded accounts
INSERT INTO users (username, email, password, contact, role) VALUES
('adminUser', 'admin@ev.com', SHA1('password123'), '91234567', 'admin'),
('john', 'john@ev.com', SHA1('password123'), '98765432', 'user'),
('sarah', 'sarah@ev.com', SHA1('password123'), '87654321', 'user');

INSERT INTO chargingStations (stationName, location, available) VALUES
('Woodlands Hub', 'Woodlands Ave 3', 'yes'),
('Jurong Point', 'Jurong West St 61', 'yes'),
('Tampines Mall', 'Tampines Central 1', 'no'),
('Orchard Central', 'Orchard Road', 'yes');

INSERT INTO vehicles (userId, model, plateNumber, batteryHealth, mileage, image) VALUES
(2, 'Tesla Model 3', 'SGX1234A', 92, 15000, NULL),
(2, 'BYD Atto 3', 'SGY5678B', 88, 22000, NULL),
(3, 'Hyundai Ioniq 5', 'SGZ9012C', 95, 8000, NULL);

INSERT INTO batteryLogs (vehicleId, batteryHealth, mileage, logDate) VALUES
(1, 100, 0, '2024-01-15'),
(1, 97, 5000, '2024-06-10'),
(1, 94, 10000, '2025-01-20'),
(1, 92, 15000, '2025-07-05'),
(2, 100, 0, '2023-11-01'),
(2, 93, 12000, '2024-08-15'),
(2, 88, 22000, '2025-06-01'),
(3, 100, 0, '2024-09-10'),
(3, 95, 8000, '2025-05-20');

INSERT INTO chargingSessions (userId, vehicleId, stationId, scheduledDate, status) VALUES
(2, 1, 1, '2026-07-20 14:00:00', 'scheduled'),
(2, 2, 2, '2026-07-22 09:30:00', 'scheduled'),
(3, 3, 4, '2026-07-25 18:00:00', 'scheduled');
