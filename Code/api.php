<?php
// === API CONFIGURATION & HEADERS ===
// Allow cross-origin requests (CORS) and ensure the API responds with UTF-8 encoded JSON.
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, GET");

// === DATABASE CONNECTION ===
// Initialize connection to the local MySQL database.
$host = "localhost";
$user = "root"; // Your phpMyAdmin username
$pass = "";     // Your phpMyAdmin password
$db   = "spielboard_db";

$conn = new mysqli($host, $user, $pass, $db);
if ($conn->connect_error) {
    die(json_encode(["error" => "Verbindung fehlgeschlagen: " . $conn->connect_error]));
}

// === REQUEST PARSING ===
// The frontend sends data either as JSON via POST body or via GET parameters.
// This section normalizes the input into a single array and extracts the requested 'action'.
$data = json_decode(file_get_contents("php://input"), true);
if (!is_array($data)) { $data = []; }
$action = $_GET['action'] ?? ($data['action'] ?? '');

// === API ROUTING (ACTION HANDLERS) ===

if ($action === 'start_session') {
    // --- START SESSION ---
    // Creates a new unique session identifier for a specific proband (study participant)
    // and saves it to the 'sessions' table to track their progress.
    $proband_id = $conn->real_escape_string($data['proband_id']);
    $session_id = uniqid('sess_'); 

    $sql = "INSERT INTO sessions (session_id, proband_id) VALUES ('$session_id', '$proband_id')";
    if ($conn->query($sql) === TRUE) {
        echo json_encode(["success" => true, "session_id" => $session_id]);
    } else {
        echo json_encode(["error" => $conn->error]);
    }
}

elseif ($action === 'save_character') {
    // --- SAVE CHARACTER ---
    // Saves a newly created character (name, gender, and base64 images) linked to a specific session.
    $session_id = $conn->real_escape_string($data['session_id']);
    $name = $conn->real_escape_string($data['name']);
    $gender = $conn->real_escape_string($data['gender'] ?? ''); // gender for accurate AI prompting
    $portrait = $conn->real_escape_string($data['portrait']);
    $fullbody = $conn->real_escape_string($data['fullbody']);

    $sql = "INSERT INTO characters (session_id, name, gender, portrait_base64, fullbody_base64) VALUES ('$session_id', '$name', '$gender', '$portrait', '$fullbody')";
    
    if ($conn->query($sql) === TRUE) echo json_encode(["success" => true]);
    else echo json_encode(["error" => $conn->error]);
}

elseif ($action === 'update_prompt') {
    // --- UPDATE PROMPT ---
    // Updates only the text prompt of a specific frame.
    // If the frame doesn't exist yet in the database, it creates a new empty frame entry with just the text.
    $session_id = $conn->real_escape_string($data['session_id']);
    $scene_frame_id = $conn->real_escape_string($data['scene_frame_id']);
    $prompt = $conn->real_escape_string($data['prompt']);

    // Check if the frame already exists
    $check = $conn->query("SELECT id FROM frames WHERE session_id = '$session_id' AND scene_frame_id = '$scene_frame_id'");
    
    if ($check->num_rows > 0) {
        // Frame exists: Overwrite ONLY the text, keep everything else untouched!
        $sql = "UPDATE frames SET prompt_text='$prompt' WHERE session_id='$session_id' AND scene_frame_id='$scene_frame_id'";
    } else {
        // Frame does not exist: Create a new row, populated only with the text prompt
        $sql = "INSERT INTO frames (session_id, scene_frame_id, prompt_text, pose_base64, result_base64, character_name) VALUES ('$session_id', '$scene_frame_id', '$prompt', '', '', '')";
    }

    if ($conn->query($sql) === TRUE) echo json_encode(["success" => true]);
    else echo json_encode(["error" => $conn->error]);
}

elseif ($action === 'save_frame') {
    // --- SAVE FULL FRAME ---
    // Updates or inserts a complete frame record, including the text prompt, the captured pose,
    // the AI-generated result, the selected character, and the JSON string representing the version history.
    $session_id = $conn->real_escape_string($data['session_id']);
    $scene_frame_id = $conn->real_escape_string($data['scene_frame_id']);
    $prompt = $conn->real_escape_string($data['prompt']);
    $pose = $conn->real_escape_string($data['pose']);
    $result = $conn->real_escape_string($data['result']);
    $character_name = $conn->real_escape_string($data['character_name'] ?? '');
    
    // Capture the visual history array string to persist soft-deleted items across reloads.
    $history = $conn->real_escape_string($data['history'] ?? '[]'); 

    $check = $conn->query("SELECT id FROM frames WHERE session_id = '$session_id' AND scene_frame_id = '$scene_frame_id'");
    if ($check->num_rows > 0) {
        $sql = "UPDATE frames SET prompt_text='$prompt', pose_base64='$pose', result_base64='$result', character_name='$character_name', history_base64='$history' WHERE session_id='$session_id' AND scene_frame_id='$scene_frame_id'";
    } else {
        $sql = "INSERT INTO frames (session_id, scene_frame_id, prompt_text, pose_base64, result_base64, character_name, history_base64) VALUES ('$session_id', '$scene_frame_id', '$prompt', '$pose', '$result', '$character_name', '$history')";
    }

    if ($conn->query($sql) === TRUE) echo json_encode(["success" => true]);
    else echo json_encode(["error" => $conn->error]);
}

elseif ($action === 'get_session_data') {
    // --- GET SESSION DATA ---
    // Retrieves all relevant data (proband ID, characters, frames) for a single session.
    // Used when the frontend loads the storyboard to restore the previous state.
    $session_id = $conn->real_escape_string($_GET['session_id']);
    
    // Find the proband ID associated with this session
    $session_result = $conn->query("SELECT proband_id FROM sessions WHERE session_id = '$session_id'");
    $proband_id = ($session_result->num_rows > 0) ? $session_result->fetch_assoc()['proband_id'] : 'Unbekannt';

    $char_result = $conn->query("SELECT * FROM characters WHERE session_id = '$session_id'");
    $characters = [];
    while($row = $char_result->fetch_assoc()) {
        $characters[] = $row;
    }

    $frames_result = $conn->query("SELECT * FROM frames WHERE session_id = '$session_id'");
    $frames = [];
    while($row = $frames_result->fetch_assoc()) {
        $frames[] = $row;
    }

    echo json_encode([
        "success" => true,
        "proband_id" => $proband_id, // Pass ID to the frontend
        "characters" => $characters, 
        "frames" => $frames
    ]);
}


elseif ($action === 'get_proband_overview') {
    // --- GET PROBAND OVERVIEW ---
    // A comprehensive query that fetches the entire history of a specific study participant across MULTIPLE sessions.
    // This allows the frontend to determine if the user is in the 'Introduction' or 'Task' phase.
    $session_id = $conn->real_escape_string($_GET['session_id']);
    
    // 1. Find the proband ID for the current session
    $prob_res = $conn->query("SELECT proband_id FROM sessions WHERE session_id = '$session_id'");
    if ($prob_res->num_rows > 0) {
        $proband_id = $prob_res->fetch_assoc()['proband_id'];
        
        // 2. Load ALL sessions for this proband chronologically (oldest first)
        $sess_result = $conn->query("SELECT session_id FROM sessions WHERE proband_id = '$proband_id' ORDER BY created_at ASC");
        $sessions = [];
        $session_ids = [];
        
        while($row = $sess_result->fetch_assoc()) {
            $sessions[] = $row['session_id'];
            $session_ids[] = "'" . $row['session_id'] . "'";
        }
        
        $session_in_clause = implode(",", $session_ids);
        
        $characters = [];
        $frames = [];
        
        if (!empty($session_ids)) {
            // 3. Load all characters from all associated sessions
            $char_result = $conn->query("SELECT * FROM characters WHERE session_id IN ($session_in_clause)");
            while($row = $char_result->fetch_assoc()) { $characters[] = $row; }
            
            // 4. Load all frames from all associated sessions
            $frames_result = $conn->query("SELECT * FROM frames WHERE session_id IN ($session_in_clause)");
            while($row = $frames_result->fetch_assoc()) { $frames[] = $row; }
        }
        
        echo json_encode([
            "success" => true,
            "proband_id" => $proband_id,
            "sessions" => $sessions,
            "characters" => $characters,
            "frames" => $frames
        ]);
    } else {
        echo json_encode(["success" => false, "error" => "Session nicht gefunden"]);
    }
}

elseif ($action === 'get_all_sessions') {
    // --- GET ALL SESSIONS ---
    // Administrative endpoint to retrieve the complete database of all probands and their sessions.
    $result = $conn->query("SELECT * FROM sessions ORDER BY proband_id ASC, created_at DESC");
    $sessions = [];
    
    while($row = $result->fetch_assoc()) {
        $proband = $row['proband_id'];
        if(!isset($sessions[$proband])) {
            $sessions[$proband] = [];
        }
        $sessions[$proband][] = $row;
    }
    
    echo json_encode(["success" => true, "data" => $sessions]);
}

elseif ($action === 'delete_frame') {
    // --- DELETE FRAME (SOFT DELETE) ---
    // Instead of physically removing the row via 'DELETE FROM', this endpoint updates an `is_deleted` flag.
    // This preserves analytical data for the study while hiding it from the active UI.
    $session_id = $conn->real_escape_string($data['session_id']);
    $scene_frame_id = $conn->real_escape_string($data['scene_frame_id']);
    
    $conn->query("UPDATE frames SET is_deleted = 1 WHERE session_id = '$session_id' AND scene_frame_id = '$scene_frame_id'");
    echo json_encode(["success" => true]);
}


elseif ($action === 'add_global_character') {
    // --- ADD GLOBAL CHARACTER FOR ADMINS ---
    // Allows admins to seed the database with preset characters (e.g., Dave and Sara) 
    // that are available across all user sessions.
    $name = $conn->real_escape_string($data['name']);
    $gender = $conn->real_escape_string($data['gender']);
    $portrait = $conn->real_escape_string($data['portrait']);
    $fullbody = $conn->real_escape_string($data['fullbody']);

    $sql = "INSERT INTO global_characters (name, gender, portrait_base64, fullbody_base64) VALUES ('$name', '$gender', '$portrait', '$fullbody')";
    if ($conn->query($sql) === TRUE) echo json_encode(["success" => true]);
    else echo json_encode(["error" => $conn->error]);
}

elseif ($action === 'get_global_characters') {
    // --- GET GLOBAL CHARACTERS ---
    // Retrieves the pre-defined characters available for selection in the storyboard.
    $result = $conn->query("SELECT * FROM global_characters");
    $chars = [];
    while($row = $result->fetch_assoc()) {
        $chars[] = $row;
    }
    echo json_encode(["success" => true, "characters" => $chars]);
}

elseif ($action === 'delete_global_character') {
    // --- DELETE GLOBAL CHARACTER ---
    // Admin tool to remove a global character preset.
    $id = (int)$data['id'];
    $conn->query("DELETE FROM global_characters WHERE id = $id");
    echo json_encode(["success" => true]);
}

$conn->close();
?>