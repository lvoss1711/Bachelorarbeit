// --- Session Validation ---
// Ensures the user has an active session before allowing access to the character creation page.
// If no session_id is found in the browser's local storage, the user is redirected to the start page.
const sessionId = localStorage.getItem('session_id');
if (!sessionId) {
    alert("Keine aktive Session gefunden! Bitte starte die Studie über die Startseite.");
    window.location.href = 'start.html';
}

// --- DOM Element Initialization ---
// Caching references to frequently used DOM elements to improve performance and code readability.
// This includes file inputs, image previews, placeholders, text inputs, and the main grid container.
const fileInputPortrait = document.getElementById('file-input-portrait');
const fileInputFullbody = document.getElementById('file-input-fullbody');
const imagePreviewPortrait = document.getElementById('image-preview-portrait');
const imagePreviewFullbody = document.getElementById('image-preview-fullbody');
const placeholderPortrait = document.getElementById('upload-placeholder-portrait');
const placeholderFullbody = document.getElementById('upload-placeholder-fullbody');
const nameInput = document.getElementById('name-input');
const addBtn = document.getElementById('add-btn');
const characterGrid = document.getElementById('character-grid');
const genderInput = document.getElementById('gender-input');

// --- Load Existing Characters ---
// Fetches the current session data from the PHP backend when the page loads.
// Iterates over any previously saved characters and dynamically builds the HTML cards to display them in the grid.
async function loadExistingCharacter() {
    try {
        const response = await fetch(`api.php?action=get_session_data&session_id=${sessionId}`);
        const data = await response.json();
        
        if (data.success && data.characters && data.characters.length > 0) {
            data.characters.forEach(char => {
                const newCard = document.createElement('div');
                newCard.className = "char-card-result";
                
                newCard.innerHTML = `
                    <div class="delete-wrapper">
                        <button onclick="this.closest('.char-card-result').remove()" class="btn-danger">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/>
                            </svg>
                        </button>
                    </div>
                    <div class="char-image-container" style="display: flex; gap: 4px; border: none; background: transparent;">
                        <img src="${char.portrait_base64}" alt="Portrait" style="flex: 1; border-radius: 1rem; border: 2px solid var(--color-yellow);" />
                        <img src="${char.fullbody_base64}" alt="Fullbody" style="flex: 1; border-radius: 1rem; border: 2px solid var(--color-yellow);" />
                    </div>
                    <div class="char-name">${char.name}</div>
                `;

                characterGrid.appendChild(newCard);
            });
        }
    } catch (err) {
        console.error("Fehler beim Laden der bestehenden Charaktere:", err);
    }
}

// Execute the function immediately upon script load.
loadExistingCharacter();

// Global variables to temporarily store the Base64 strings of uploaded images before submission.
let portraitSrc = '';
let fullbodySrc = '';

/**
 * --- Input Validation ---
 * Checks if all required fields (portrait image, fullbody image, and a non-empty name) are provided.
 * Enables the 'Add' button only when these conditions are met.
 */
function checkInputs() {
    addBtn.disabled = !(portraitSrc && fullbodySrc && nameInput.value.trim() !== '');
}

/**
 * --- Image Upload Handler ---
 * Processes local file selections via the FileReader API.
 * Converts the uploaded file into a Base64 string, caches it globally, updates the UI preview, 
 * and triggers the validation check.
 */
function handleUpload(event, previewElement, placeholderElement, type) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            // Cache the image data based on its type
            if (type === 'portrait') portraitSrc = e.target.result;
            if (type === 'fullbody') fullbodySrc = e.target.result;
            
            // Update the user interface
            previewElement.src = e.target.result;
            placeholderElement.classList.add('hidden');
            previewElement.classList.remove('hidden');
            
            checkInputs();
        };
        reader.readAsDataURL(file);
    }
}

// --- Event Listeners ---
// Attach the upload handler to the file inputs and the validation check to the name input field.
fileInputPortrait.addEventListener('change', e => handleUpload(e, imagePreviewPortrait, placeholderPortrait, 'portrait'));
fileInputFullbody.addEventListener('change', e => handleUpload(e, imagePreviewFullbody, placeholderFullbody, 'fullbody'));
nameInput.addEventListener('input', checkInputs);

// --- Save Character Logic ---
// Triggered when the user clicks the 'Add' button.
// Sends the assembled character data (name, gender, and Base64 images) to the PHP API for database storage.
// Upon success, it dynamically generates the UI card for the new character and resets the input form.
addBtn.addEventListener('click', async function() {
    if (portraitSrc && fullbodySrc && nameInput.value.trim() !== '') {
        const characterName = nameInput.value.trim();
        const originalBtnText = addBtn.innerHTML;
        addBtn.disabled = true;

        try {
            // Send payload to backend
            const response = await fetch('api.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'save_character',
                    session_id: sessionId,
                    name: characterName,
                    gender: genderInput.value, 
                    portrait: portraitSrc,
                    fullbody: fullbodySrc
                })
            });
            const data = await response.json();
            
            if(!data.success) {
                throw new Error(data.error || "Unbekannter API Fehler");
            }
            
        } catch (err) {
            console.error("Datenbankfehler:", err);
            alert("Fehler beim Speichern des Charakters. Ist der Server erreichbar?");
            addBtn.disabled = false;
            return;
        }
        
        // Construct and inject the new character card into the UI
        const newCard = document.createElement('div');
        newCard.className = "char-card-result";
        
        newCard.innerHTML = `
            <div class="delete-wrapper">
                <button onclick="this.closest('.char-card-result').remove()" class="btn-danger">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/>
                    </svg>
                </button>
            </div>
            <div class="char-image-container" style="display: flex; gap: 4px; border: none; background: transparent;">
                <img src="${portraitSrc}" alt="Portrait" style="flex: 1; border-radius: 1rem; border: 2px solid var(--color-yellow);" />
                <img src="${fullbodySrc}" alt="Fullbody" style="flex: 1; border-radius: 1rem; border: 2px solid var(--color-yellow);" />
            </div>
            <div class="char-name">${characterName}</div>
        `;

        characterGrid.appendChild(newCard);

        // Reset the form state for subsequent entries
        fileInputPortrait.value = ''; 
        fileInputFullbody.value = '';
        portraitSrc = ''; 
        fullbodySrc = '';
        imagePreviewPortrait.src = ''; 
        imagePreviewFullbody.src = '';
        nameInput.value = '';
        placeholderPortrait.classList.remove('hidden'); 
        placeholderFullbody.classList.remove('hidden');
        imagePreviewPortrait.classList.add('hidden'); 
        imagePreviewFullbody.classList.add('hidden');
        
        checkInputs();
    }
});