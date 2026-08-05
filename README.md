# Spielboard - User Study Application

This repository contains the frontend interfaces, administrative tools, and database structure for the "Spielboard" user study. The application is designed to track participant sessions, collect demographic data, and interface with a local ComfyUI AI backend to generate storyboards.

---

## Project Structure & File Overview

### 1. Database Communication (Backend)
*   **`spielboard_db.sql`**: The MySQL database dump that initializes the required schema. It creates the tables necessary to track participant sessions (`sessions`), user-created characters (`characters`), generated storyboard panels (`frames`), and admin-defined preset characters (`global_characters`).
    **`api.php`**: This is the central backend script. It acts as the bridge between the frontend and the MySQL database. 

### 2. Study Procedure (Frontend)
These files manage the actual user study experience for the participants.

*   **`welcome.html`**: The initial landing page that greets the participant and introduces the study before directing them to the demographic questionnaire.
*   **`demoqu.html`**: A page that embeds a Google Forms demographic questionnaire via an iframe. It uses a load-event heuristic to ensure the participant submits the form before they can proceed to the study.
    **`start.html`**: The entry point of the application. It handles session creation and assigns a unique `session_id` to the participant. The participant also enters their ProbID, which facilitates later evaluation.
*   **`index.html`**: The main participant menu (Dashboard), providing access to the core storyboarding tool (and in future implementation the character page).
*   **`character.html`**: The user interface where participants can upload portrait and full-body reference images to create their custom characters (enabled for study context).
*   **`character.js`**: The client-side logic for `character.html`. It communicates with the PHP backend to save character data.
    **`storyboard.html`**: The core interactive canvas of the study. This is where participants compose scenes, select their characters, and write text prompts.
*   **`storyboard.js`**: The logic for the storyboard editor. It handles webcam interactions for capturing poses, manages the state of individual frames, and sends generation requests to `api.php`.
*   **`overview.html`**: A summary page for participants to review their generated storyboards across different tasks/sessions. It acts as a final review step and assistence durin the second Interview.
*   **`questionaire.html`**: The post-task survey (UES and CSI) accessed after the participant has completed their storyboard tasks and interviews.
*   **`thanks.html`**: The final screen of the study, thanking the user for participating.

### 3. Administrative Tools
These files are reserved for the study supervisor to configure the system and evaluate the collected data.

*   **`admin.html`**: The central administrative dashboard. It provides an overview of all recorded participant sessions and offers quick links to evaluation views and system configuration tools.
*   **`admin_warmup.html`**: For local AI setups. It sends a dummy workflow to the ComfyUI API to force the heavy AI models (ControlNet, IP-Adapter, Dreamshaper) into the GPU's VRAM, preventing long loading times for the first participant.
*   **`admin_characters.html`**: An interface for the admin to create, manage, and delete global character presets (necessary for the study context).
*   **`admin_session.html`**: A detailed evaluation view for a specific participant's session. It displays the final storyboard along with metadata like text prompts, reference poses, and the full generation history (including soft-deleted frames).
*   **`admin_print.html`**: A clean, printer-friendly view of a completed storyboard. It utilizes specific CSS `@media print` queries to format the layout for A4 paper, hiding UI elements and applying a discreet watermark. The objective is to send all participants a pdf with their storyboards.

### 4. Aesthetic
*   **`style.css`**: The global CSS stylesheet defining the color theme, grid layouts, component cards, and responsive design of the application.