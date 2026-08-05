-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Erstellungszeit: 04. Aug 2026 um 12:08
-- Server-Version: 10.4.32-MariaDB
-- PHP-Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Datenbank: `spielboard_db`
--

-- --------------------------------------------------------

-- === CHARACTERS TABLE (additional feature not relevant for the study)===
-- Stores the custom characters created by the participants during a specific session.
-- The 'gender' column ensures that the AI receives the correct prompting tags (e.g., 1boy/1girl).
CREATE TABLE `characters` (
  `id` int(11) NOT NULL,
  `session_id` varchar(50) NOT NULL,
  `name` varchar(100) DEFAULT NULL,
  `portrait_base64` longtext DEFAULT NULL,
  `fullbody_base64` longtext DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `gender` varchar(20) DEFAULT ''
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

-- === FRAMES TABLE ===
-- Stores the individual storyboard panels generated during the session.
-- Features the complete state of a frame, including the AI prompt, pose, and result images.
-- 'history_base64' persists previous generations for comparison, while 'is_deleted' enables the soft-delete functionality.
CREATE TABLE `frames` (
  `id` int(11) NOT NULL,
  `session_id` varchar(50) NOT NULL,
  `scene_frame_id` varchar(20) NOT NULL,
  `prompt_text` text DEFAULT NULL,
  `pose_base64` longtext DEFAULT NULL,
  `result_base64` longtext DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `character_name` varchar(100) DEFAULT '',
  `history_base64` longtext DEFAULT NULL,
  `is_deleted` tinyint(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

-- === GLOBAL CHARACTERS TABLE ===
-- Allows the study supervisor to seed the database with pre-defined character presets.
-- These characters are globally available to all probands across all sessions.
CREATE TABLE `global_characters` (
  `id` int(11) NOT NULL,
  `name` varchar(100) DEFAULT NULL,
  `gender` varchar(20) DEFAULT NULL,
  `portrait_base64` longtext DEFAULT NULL,
  `fullbody_base64` longtext DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

-- === SESSIONS TABLE ===
-- Core tracking mechanism for the user study.
-- Links a specific participant (proband_id) to a unique session instance (session_id).
CREATE TABLE `sessions` (
  `session_id` varchar(50) NOT NULL,
  `proband_id` varchar(50) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Indizes der exportierten Tabellen
--

--
-- Indizes für die Tabelle `characters`
--
ALTER TABLE `characters`
  ADD PRIMARY KEY (`id`),
  ADD KEY `session_id` (`session_id`);

--
-- Indizes für die Tabelle `frames`
--
ALTER TABLE `frames`
  ADD PRIMARY KEY (`id`),
  ADD KEY `session_id` (`session_id`);

--
-- Indizes für die Tabelle `global_characters`
--
ALTER TABLE `global_characters`
  ADD PRIMARY KEY (`id`);

--
-- Indizes für die Tabelle `sessions`
--
ALTER TABLE `sessions`
  ADD PRIMARY KEY (`session_id`);

--
-- AUTO_INCREMENT für exportierte Tabellen
--

--
-- AUTO_INCREMENT für Tabelle `characters`
--
ALTER TABLE `characters`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT für Tabelle `frames`
--
ALTER TABLE `frames`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT für Tabelle `global_characters`
--
ALTER TABLE `global_characters`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- Constraints der exportierten Tabellen
--

--
-- Constraints der Tabelle `characters`
-- Ensure referential integrity: A character must belong to a valid session.
ALTER TABLE `characters`
  ADD CONSTRAINT `characters_ibfk_1` FOREIGN KEY (`session_id`) REFERENCES `sessions` (`session_id`);

--
-- Constraints der Tabelle `frames`
-- Ensure referential integrity: A frame must belong to a valid session.
ALTER TABLE `frames`
  ADD CONSTRAINT `frames_ibfk_1` FOREIGN KEY (`session_id`) REFERENCES `sessions` (`session_id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;