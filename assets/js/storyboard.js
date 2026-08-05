document.addEventListener('DOMContentLoaded', async () => {

    // --- Session Validation ---
    // Checks if a study session is active. If not, redirects to the login screen.
    // This relies on the browser's localStorage for state persistence between page reloads.
    const sessionId = localStorage.getItem('session_id');
    if (!sessionId) {
        alert("Keine aktive Session gefunden! Bitte starte die Studie über die Startseite.");
        window.location.href = 'start.html';
        return;
    }

    // --- Load global data ---
    let globalCharacters = [];
    let initialData = null;
    let globalSessionCount = 1;

    // --- Data Initialization ---
    // Fetches the globally available characters and the current session's saved state (frames, characters) 
    // from the PHP backend[cite: 13].
    try {
        const charRes = await fetch(`api.php?action=get_global_characters`);
        const charData = await charRes.json();
        if (charData.success && charData.characters) {
            globalCharacters = charData.characters;
        }

        const sessionRes = await fetch(`api.php?action=get_session_data&session_id=${sessionId}`);
        initialData = await sessionRes.json();
    } catch (e) {
        console.error("Fehler beim Laden:", e);
    }

    const scenesContainer = document.getElementById('scenes-container');
    const addSceneBtn = document.getElementById('add-scene-btn');

    // --- Study Flow Control ---
    // Determines the current phase of the user study based on how many sessions the user has created.
    // Session 1 is treated as the "Introduction", >= 2 triggers the "Tasks" phase. 
    // It dynamically updates the UI (task titles, button visibilities) accordingly.
    try {
        const overviewRes = await fetch(`api.php?action=get_proband_overview&session_id=${sessionId}&t=${Date.now()}`);
        const overviewData = await overviewRes.json();

        if (overviewData.success && overviewData.sessions) {
            globalSessionCount = overviewData.sessions.length;
            const probandId = overviewData.proband_id;

            const taskTitle = document.getElementById('task-title');
            const continueTasksBtn = document.getElementById('continue-tasks-btn');

            if (globalSessionCount === 1) {
                if (taskTitle) taskTitle.innerText = "Introduction";
                if (addSceneBtn) addSceneBtn.style.display = 'none';

                if (continueTasksBtn) {
                    continueTasksBtn.classList.remove('hidden');
                    continueTasksBtn.style.display = 'flex';

                    continueTasksBtn.addEventListener('click', () => {
                        showStartTasksModal(async () => {
                            continueTasksBtn.innerHTML = "Lade Tasks...";
                            try {
                                const startRes = await fetch('api.php', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ action: 'start_session', proband_id: probandId })
                                });
                                const startData = await startRes.json();

                                if (startData.success) {
                                    localStorage.setItem('session_id', startData.session_id);
                                    window.location.href = 'index.html';
                                } else {
                                    alert("Fehler beim Starten der Aufgaben: " + startData.error);
                                    continueTasksBtn.innerHTML = "Continue to Tasks";
                                }
                            } catch (err) {
                                alert("Verbindungsfehler zum Server.");
                                continueTasksBtn.innerHTML = "Continue to Tasks";
                            }
                        });
                    });
                }
            } else if (globalSessionCount >= 2) {
                if (taskTitle) taskTitle.innerText = "Task 1-3";
            }
        }
    } catch (e) {
        console.error("Fehler beim Prüfen der Session-Anzahl:", e);
    }

    // --- Custom UI Modals ---
    // The following functions (showStartTasksModal, showPoseActionModal, showConfirmModal) 
    // build custom DOM overlays instead of using the browser's default alert/confirm dialogues.
    function showStartTasksModal(onComplete) {
        const overlay = document.createElement('div');
        overlay.className = 'custom-modal-overlay';
        const modal = document.createElement('div');
        modal.className = 'custom-modal';

        const text = document.createElement('p');
        text.innerText = "Please inform the supervisor that you finished the Introduction.";
        text.style.fontWeight = "bold";
        text.style.fontSize = "1.5rem";
        text.style.marginBottom = "1.5rem";
        text.style.textAlign = "center";

        const btnContainer = document.createElement('div');
        btnContainer.style.display = "flex";
        btnContainer.style.gap = "1rem";

        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'btn-cancel';
        cancelBtn.style.flex = "1";
        cancelBtn.style.fontSize = "18px";
        cancelBtn.style.borderRadius = "15px";
        cancelBtn.innerText = 'Cancel';

        const confirmBtn = document.createElement('button');
        confirmBtn.className = 'btn-primary';
        confirmBtn.style.flex = "1";
        confirmBtn.style.fontSize = "18px";
        confirmBtn.style.background = '#4BADB5';
        confirmBtn.style.color = 'white';
        confirmBtn.innerText = 'Start Tasks';

        btnContainer.appendChild(cancelBtn);
        btnContainer.appendChild(confirmBtn);
        modal.appendChild(text);
        modal.appendChild(btnContainer);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        setTimeout(() => overlay.classList.add('active'), 10);

        cancelBtn.addEventListener('click', () => {
            overlay.classList.remove('active');
            setTimeout(() => overlay.remove(), 300);
        });

        confirmBtn.addEventListener('click', () => {
            overlay.classList.remove('active');
            setTimeout(() => overlay.remove(), 300);
            onComplete();
        });
    }

    function showPoseActionModal(onUploadCallback, onCameraCallback) {
        const overlay = document.createElement('div');
        overlay.className = 'custom-modal-overlay';
        const modal = document.createElement('div');
        modal.className = 'custom-modal';

        const text = document.createElement('p');
        text.innerText = "Edit pose";
        text.style.fontWeight = "bold";
        text.style.fontSize = "1.2rem";
        text.style.marginBottom = "1.5rem";

        const btnContainer = document.createElement('div');
        btnContainer.style.display = "flex";
        btnContainer.style.flexDirection = "column";
        btnContainer.style.gap = "0.75rem";

        const uploadBtn = document.createElement('button');
        uploadBtn.className = 'btn-primary';
        uploadBtn.style.background = '#4BADB5';
        uploadBtn.style.width = '100%';
        uploadBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:0.5rem; vertical-align:middle;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg> Bild uploaden';

        const camBtn = document.createElement('button');
        camBtn.className = 'btn-primary';
        camBtn.style.background = '#4BADB5';
        camBtn.style.width = '100%';
        camBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:0.5rem; vertical-align:middle;"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg> Start camera';

        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'btn-cancel';
        cancelBtn.style.width = '100%';
        cancelBtn.style.marginTop = '0.5rem';
        cancelBtn.innerText = 'Cancel';

        
        btnContainer.appendChild(camBtn);
        btnContainer.appendChild(cancelBtn);

        modal.appendChild(text);
        modal.appendChild(btnContainer);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        setTimeout(() => overlay.classList.add('active'), 10);

        const closeModal = () => {
            overlay.classList.remove('active');
            setTimeout(() => overlay.remove(), 300);
        };

        cancelBtn.addEventListener('click', closeModal);
        uploadBtn.addEventListener('click', () => { closeModal(); setTimeout(onUploadCallback, 300); });
        camBtn.addEventListener('click', () => { closeModal(); onCameraCallback(); });
    }

    function showConfirmModal(message, onConfirmCallback) {
        const overlay = document.createElement('div');
        overlay.className = 'custom-modal-overlay';
        const modal = document.createElement('div');
        modal.className = 'custom-modal';

        const text = document.createElement('p');
        text.innerText = message;
        text.style.fontWeight = "bold";
        text.style.fontSize = "1.2rem";
        text.style.marginBottom = "1.5rem";

        const btnContainer = document.createElement('div');
        btnContainer.style.display = "flex";
        btnContainer.style.gap = "1rem";

        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'btn-cancel';
        cancelBtn.style.flex = "1";
        cancelBtn.style.borderRadius = "15px";
        cancelBtn.innerText = 'Cancel';

        const confirmBtn = document.createElement('button');
        confirmBtn.className = 'btn-primary';
        confirmBtn.style.flex = "1";
        confirmBtn.style.background = 'var(--color-danger)';
        confirmBtn.style.color = 'white';
        confirmBtn.innerText = 'Delete';

        btnContainer.appendChild(cancelBtn);
        btnContainer.appendChild(confirmBtn);

        modal.appendChild(text);
        modal.appendChild(btnContainer);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        setTimeout(() => overlay.classList.add('active'), 10);

        const closeModal = () => {
            overlay.classList.remove('active');
            setTimeout(() => overlay.remove(), 300);
        };

        cancelBtn.addEventListener('click', closeModal);
        confirmBtn.addEventListener('click', () => {
            closeModal();
            onConfirmCallback();
        });
    }

    // --- ComfyUI configuration ---
    const COMFY_URL = "http://127.0.0.1:8188";
    let currentStyle = "Sketch";

    // --- ComfyUI Bridge ---
    // Helper functions to handle communication with the local Stable Diffusion instance (ComfyUI).
    // Includes converting images for upload, sending the generation payload, and polling for the result.

    // Fetches an image from a given URL and converts it into a Base64 string.
    async function getBase64FromUrl(url) {
        const response = await fetch(url);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    // Converts a Base64 image string back into a file blob and uploads it to the ComfyUI server.
    async function uploadImageToComfy(base64Data, filename) {
        const response = await fetch(base64Data);
        const blob = await response.blob();
        const formData = new FormData();
        formData.append('image', blob, filename);
        const res = await fetch(`${COMFY_URL}/upload/image`, { method: 'POST', body: formData });
        const data = await res.json();
        return data.name;
    }

    // Submits the assembled JSON workflow to the ComfyUI API to trigger the image generation.
    // It returns a unique prompt ID that is needed to track the status of this specific generation job.
    async function queueComfyPrompt(workflow) {
        const res = await fetch(`${COMFY_URL}/prompt`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: workflow }) });
        const data = await res.json();
        return data.prompt_id;
    }

    // Actively polls the ComfyUI history endpoint every 500 milliseconds to check if a job is finished.
    // Once the generation linked to the promptId appears in the history, it extracts the filename 
    // from the specific "SaveImage" node (node 320) and returns the full URL to display the image.
    async function waitForComfyImage(promptId) {
        return new Promise((resolve) => {
            const interval = setInterval(async () => {
                const res = await fetch(`${COMFY_URL}/history/${promptId}`);
                const history = await res.json();
                if (history[promptId]) {
                    clearInterval(interval);
                    const outputs = history[promptId].outputs;
                    if (outputs["320"] && outputs["320"].images) resolve(`${COMFY_URL}/view?filename=${outputs["320"].images[0].filename}&type=output`);
                    else resolve(null);
                }
            }, 500);
        });
    }

    let sceneCount = 1;

    // --- Creating Frames ---
    // This massive function creates the DOM elements for an individual storyboard frame. 
    // It embeds all the necessary sub-components: character selection, camera/upload view, 
    // text prompting, history thumbnails, and the generation controls.
    function createFrameElement(sceneId, frameIndex, existingData = null) {
        const sceneFrameId = `${sceneId}.${frameIndex}`;
        const frameDiv = document.createElement('div');
        frameDiv.className = "frame-card";

        let charOptionsHtml = globalCharacters.map(c => `
            <div class="char-option" data-name="${c.name}" style="flex: 1; border: 3px solid transparent; border-radius: 0.75rem; cursor: pointer; overflow: hidden; background: white; opacity: 0.5; transition: 0.2s; display: flex; flex-direction: column;">
                <img src="${c.portrait_base64}" style="width: 100%; height: 110px; object-fit: contain; padding: 0.5rem; display: block; image-rendering: high-quality;">
                <div style="padding: 0.5rem; font-weight: bold; color: var(--color-purple); text-align: center; text-transform: uppercase; font-size: 0.9rem; background: var(--color-card-dark); border-top: 1px solid rgba(0,0,0,0.05);">${c.name}</div>
            </div>
        `).join('');

        if (globalCharacters.length === 0) {
            charOptionsHtml = `<div style="color: white; padding: 1rem;">Keine Charaktere gefunden! Bitte sag dem Versuchsleiter Bescheid.</div>`;
        }

        frameDiv.innerHTML = `
            <div class="frame-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                <span style="font-weight: bold; color: var(--color-purple);">Scene ${sceneId} - Frame ${frameIndex}</span>
                
                <div class="frame-actions" style="display: flex; gap: 0.5rem;">
                    <button class="btn-edit-frame hidden" title="Frame bearbeiten" style="background: white; border-radius: 50%; width: 32px; height: 32px; border: none; color: var(--color-purple); cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 5px rgba(0,0,0,0.2); transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </button>

                    <div class="delete-frame-btn" title="Frame löschen" style="background: var(--color-danger); color: white; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 2px 5px rgba(0,0,0,0.2); transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </div>
                </div>
            </div>

            <div class="edit-only-section" style="color: var(--color-purple); font-size: 0.8rem; font-weight: bold; text-transform: uppercase; margin-bottom: 0.25rem;">Characters</div>
            <div class="char-selector-container edit-only-section" style="display: flex; gap: 0.5rem; margin-bottom: 0.5rem;">
                ${charOptionsHtml}
            </div>

            <div class="edit-only-section" style="color: var(--color-purple); font-size: 0.8rem; font-weight: bold; text-transform: uppercase; margin-bottom: 0.25rem;">Frame</div>
            <div class="main-image-area" style="position: relative; width: 100%; aspect-ratio: 1344/768; background: var(--color-card-dark); border: 2px solid var(--color-purple); border-radius: 0.75rem; overflow: hidden; margin-bottom: 0.5rem; cursor: pointer;" title="Click here to start camera">
                <div class="cam-toggle-area" style="position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; color: var(--color-purple); transition: background 0.2s;">
                    <div class="cam-ui" style="display: flex; flex-direction: column; align-items: center;">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 1rem;">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline>
                        </svg>
                        <span style="font-weight: bold; font-size: 1.1rem;">Add pose</span>
                    </div>
                </div>
                <img class="main-img hidden" src="" style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; z-index: 5; background: #e6e6e6;" alt="Main View" />
                <video class="live-video hidden" autoplay playsinline style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; z-index: 10; background: #000;"></video>
            </div>

            <input type="file" class="file-input hidden" accept="image/*" />

            <div class="camera-controls edit-only-section hidden" style="display: flex; gap: 0.5rem; margin-bottom: 0.5rem;">
                <button class="btn-primary stop-cam-btn" style="flex: 1; background: #666; color: white;">Stop Cam</button>  
                <button class="btn-primary cam-capture-btn" style="flex: 1; background: var(--color-danger); color: white;">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="12" cy="12" r="10"></circle>
  <circle cx="12" cy="12" r="4" fill="currentColor"></circle>
</svg>

                </button>
            </div>

            <div class="thumb-container edit-only-section hidden" style="display: flex; justify-content: flex-start; margin-bottom: 0.5rem;">
                <div class="thumb-wrapper" style="position: relative; height: 120px; aspect-ratio: 1344 / 768; border: 2px solid var(--color-yellow); border-radius: 0.5rem; overflow: hidden; cursor: pointer; background: #000; box-shadow: 0 2px 5px rgba(0,0,0,0.2);" title="Pose bearbeiten">
                    <img class="thumb-img" src="" style="width: 100%; height: 100%; object-fit: cover; opacity: 0.9; transition: opacity 0.2s;" onmouseover="this.style.opacity=0.6" onmouseout="this.style.opacity=0.9" />
                    <div class="edit-pose-btn" style="position: absolute; top: 0.5rem; right: 0.5rem; background: rgba(0,0,0,0.7); color: white; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(2px); transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </div>
                </div>
            </div>

            <div class="edit-only-section" style="color: var(--color-purple); font-size: 0.8rem; font-weight: bold; text-transform: uppercase; margin-bottom: 0.25rem;">Background</div>
            <div class="prompt-wrapper" style="position: relative; margin-bottom: 0.5rem;">
                <textarea spellcheck="false" placeholder="Describe the background of your scene e.g. dense jungle foliage, large tropical leaves..." class="textarea-field desc-input edit-only-section" style="margin-bottom: 0; width: 100%;"></textarea>
                
                <button class="btn-save-prompt edit-only-section hidden" title="Prompt bestätigen" style="position: absolute; bottom: 10px; right: 10px; background: #4BADB5; border: none; border-radius: 50%; width: 32px; height: 32px; color: white; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px rgba(0,0,0,0.3); transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </button>

                <div class="prompt-locked hidden" style="background: rgba(20, 42, 63, 0.05); padding: 0.75rem; padding-right: 3rem; border-radius: 0.5rem; min-height: 80px; position: relative; border: 1px solid rgba(20, 42, 63, 0.1);">
                    <strong style="color: var(--color-purple); font-size: 0.8rem; text-transform: uppercase;">Description</strong><br>
                    <span class="prompt-display-text" style="white-space: pre-wrap; color: rgba(20, 22, 29, 0.973); font-size: 0.95rem;"></span>
                    
                    <button class="btn-edit-prompt edit-only-element" title="Prompt bearbeiten" style="position: absolute; top: 10px; right: 10px; background: white; border-radius: 50%; width: 32px; height: 32px; border: none; color: var(--color-purple); cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 5px rgba(0,0,0,0.2); transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </button>
                </div>
            </div>
            
            <div class="history-container edit-only-section hidden" style="display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 0.5rem; padding-top: 0.5rem; border-top: 1px solid rgba(255,255,255,0.1);">
                <span style="width: 100%; font-size: 0.8rem; color: var(--color-purple); font-weight: bold;">Previous:</span>
            </div>

            <div class="generate-actions edit-only-section" style="display: flex; gap: 0.5rem;">
                <button class="btn-primary generate-btn" style="flex: 1;" disabled>Generate frame</button>
                
                <button class="btn-primary confirm-frame-btn hidden" style="flex: 0 0 60px; background: #4BADB5; color: white;" title="Fertig! (Vorschau anzeigen)">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </button>
            </div>

            <canvas class="capture-canvas hidden" width="1344" height="768"></canvas>
        `;

        // --- Frame Logic Bindings ---
        // Attaches event listeners for all the newly created DOM nodes within this specific frame.
        // Handles character selection highlighting, triggering soft-deletes via the API, 
        // and toggling the UI between editing and preview mode.

        // Handles the visual toggle, ensuring only the clicked character is highlighted
        const charOptions = frameDiv.querySelectorAll('.char-option');
        charOptions.forEach(opt => {
            opt.addEventListener('click', () => {
                charOptions.forEach(o => {
                    o.style.borderColor = 'transparent';
                    o.style.opacity = '0.5';
                    o.classList.remove('active-char');
                });
                opt.style.borderColor = 'var(--color-yellow)';
                opt.style.opacity = '1';
                opt.classList.add('active-char');
            });
        });

        // Upon user confirmation, it asynchronously tells the backend API to soft-delete 
        // the frame from the database and visually removes the element from the DOM.
        const deleteFrameBtn = frameDiv.querySelector('.delete-frame-btn');
        deleteFrameBtn.addEventListener('click', () => {
            showConfirmModal(`Do you really want to delete \nScene ${sceneId} - Frame ${frameIndex} ?`, async () => {
                try {
                    await fetch('api.php', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'delete_frame', session_id: sessionId, scene_frame_id: sceneFrameId })
                    });
                    frameDiv.remove();
                } catch (e) { console.error("Fehler beim Löschen:", e); }
            });
        });

        // Caches references to all the interactive elements inside this specific frame 
        // to avoid repeatedly querying the DOM. It also initializes the local state variables 
        // that track the active webcam stream, images in base64 format, and the frame's history.
        const fileInput = frameDiv.querySelector('.file-input');
        const thumbWrapper = frameDiv.querySelector('.thumb-wrapper');
        const mainImg = frameDiv.querySelector('.main-img');
        const thumbImg = frameDiv.querySelector('.thumb-img');
        const camUi = frameDiv.querySelector('.cam-ui');
        const mainImageArea = frameDiv.querySelector('.main-image-area');
        const thumbContainer = frameDiv.querySelector('.thumb-container');
        const historyContainer = frameDiv.querySelector('.history-container');
        const descInput = frameDiv.querySelector('.desc-input');

        const btnSavePrompt = frameDiv.querySelector('.btn-save-prompt');
        const promptLocked = frameDiv.querySelector('.prompt-locked');
        const promptDisplayText = frameDiv.querySelector('.prompt-display-text');
        const btnEditPrompt = frameDiv.querySelector('.btn-edit-prompt');

        const generateBtn = frameDiv.querySelector('.generate-btn');
        const confirmFrameBtn = frameDiv.querySelector('.confirm-frame-btn');
        const btnEditFrame = frameDiv.querySelector('.btn-edit-frame');

        const liveVideo = frameDiv.querySelector('.live-video');
        const cameraControls = frameDiv.querySelector('.camera-controls');
        const stopCamBtn = frameDiv.querySelector('.stop-cam-btn');
        const camCaptureBtn = frameDiv.querySelector('.cam-capture-btn');
        const captureCanvas = frameDiv.querySelector('.capture-canvas');

        let stream = null;
        let hasImage = false;
        let poseBase64 = null;
        let currentResultBase64 = null;
        let frameHistory = []; 

        // --- Preview vs. Edit Mode Toggle ---
        // Switches the frame's UI context. 
        // 'isPreview = true' hides all editing tools (camera, character selection, inputs) and locks the prompt.
        // 'isPreview = false' restores the editing view, carefully checking the current state 
        // (e.g., only unhiding the camera controls if a stream is actually active)
        const setPreviewMode = (isPreview) => {
            const sections = frameDiv.querySelectorAll('.edit-only-section');
            const elements = frameDiv.querySelectorAll('.edit-only-element');

            if (isPreview) {
                lockPrompt();
                sections.forEach(s => s.classList.add('hidden'));
                elements.forEach(e => e.classList.add('hidden'));
                btnEditFrame.classList.remove('hidden');
                mainImageArea.style.pointerEvents = 'none';
            } else {
                sections.forEach(s => {
                    if (s.classList.contains('thumb-container') && !hasImage) return;
                    if (s.classList.contains('history-container') && historyContainer.children.length <= 1) return;
                    if (s.classList.contains('btn-save-prompt')) { checkInputs(); return; }
                    if (s.classList.contains('desc-input')) {
                        if (promptLocked.classList.contains('hidden')) s.classList.remove('hidden');
                        return;
                    }
                    if (s.classList.contains('camera-controls') && !stream) return;

                    s.classList.remove('hidden');
                });
                elements.forEach(e => e.classList.remove('hidden'));
                btnEditFrame.classList.add('hidden');
                mainImageArea.style.pointerEvents = 'auto';
                checkInputs();
            }
        };

        btnEditFrame.addEventListener('click', () => setPreviewMode(false));
        confirmFrameBtn.addEventListener('click', () => setPreviewMode(true));

        // Helper to stringify the history array before sending it to the database.
        const getHistoryArray = () => {
            return JSON.stringify(frameHistory);
        };

        // takes the text from the textarea, hides the input field, 
        // and displays the text in a stylized, read-only div.
        const lockPrompt = () => {
            const dText = descInput.value.trim();
            if (dText) {
                descInput.classList.add('hidden');
                btnSavePrompt.classList.add('hidden');
                promptDisplayText.textContent = dText;
                promptLocked.classList.remove('hidden');
            }
        };

        // reverses the lock action, bringing the textarea back into focus for editing.
        const unlockPrompt = () => {
            promptLocked.classList.add('hidden');
            descInput.classList.remove('hidden');
            if (descInput.value.trim() !== '') btnSavePrompt.classList.remove('hidden');
            descInput.focus();
        };

        // When the user clicks edit on the prompt, it visually unlockslocks the text
        btnEditPrompt.addEventListener('click', unlockPrompt);

        // When the user clicks save on the prompt, it visually locks the text 
        // and immediately syncs this specific update to the PHP backend API.
        btnSavePrompt.addEventListener('click', async () => {
            lockPrompt();
            checkInputs();
            try {
                await fetch('api.php', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'update_prompt', session_id: sessionId, scene_frame_id: sceneFrameId, prompt: descInput.value.trim() })
                });
                if (!existingData) existingData = {};
                existingData.prompt_text = descInput.value.trim();
            } catch (error) {
                alert("Fehler beim Speichern des Textes: " + error.message);
                unlockPrompt();
            }
        });

        // --- Input Validation ---
        // Continuously evaluates whether the frame has enough data (either text or an image) 
        // to enable the "Generate frame" button. It also toggles the visibility of the prompt save button.
        const checkInputs = () => {
            const hasDesc = descInput.value.trim() !== '';
            generateBtn.disabled = !(hasDesc || hasImage);

            if (hasDesc && promptLocked.classList.contains('hidden')) btnSavePrompt.classList.remove('hidden');
            else btnSavePrompt.classList.add('hidden');
        };

        // --- Restore data ---
        // Populates frame with data from the backend.
        // It restores images, the active character, prompt texts, and historical generations.
        if (existingData) {
            if (existingData.prompt_text) descInput.value = existingData.prompt_text;
            if (existingData.pose_base64 && existingData.pose_base64.length > 10) {
                poseBase64 = existingData.pose_base64;
                hasImage = true;
                thumbImg.src = poseBase64;
                thumbContainer.classList.remove('hidden');
            }
            if (existingData.result_base64 && existingData.result_base64.length > 10) {
                currentResultBase64 = existingData.result_base64;
                mainImg.src = currentResultBase64;
                mainImg.classList.remove('hidden');
                camUi.classList.add('hidden');
                generateBtn.innerHTML = "Regenerate";
                confirmFrameBtn.classList.remove('hidden');
            } else if (hasImage) {
                mainImg.src = poseBase64;
                mainImg.classList.remove('hidden');
                camUi.classList.add('hidden');
            }

            if (existingData.character_name) {
                const charOpt = frameDiv.querySelector(`.char-option[data-name="${existingData.character_name}"]`);
                if (charOpt) charOpt.click();
            } else if (charOptions.length > 0) {
                charOptions[0].click();
            }

            if (existingData.history_base64 && existingData.history_base64 !== '[]') {
                try {
                    const parsed = JSON.parse(existingData.history_base64);
                    // Abwärtskompatibilität für alte reine String-Arrays
                    frameHistory = parsed.map(item => typeof item === 'string' ? { src: item, is_deleted: false } : item);

                    // Nur nicht-gelöschte Bilder anzeigen
                    [...frameHistory].reverse().forEach(item => {
                        if (!item.is_deleted) addHistoryThumbnail(item.src);
                    });
                } catch (e) { console.error("Fehler beim Laden der Historie", e); }
            }

            if (existingData.prompt_text) lockPrompt();
            checkInputs();

            if (currentResultBase64) {
                setPreviewMode(true);
            }

        } else if (charOptions.length > 0) {
            charOptions[0].click();
        }

        // --- Camera & Upload Logic ---
        // Native browser API integration (getUserMedia) to capture live webcam feeds for posing.
        // It captures a still image to an invisible canvas, converts it to base64, and updates the frame.
        const openPoseModal = () => { 
            showPoseActionModal(() => { fileInput.click(); }, () => { startCamera(); }); 
        };

        thumbWrapper.addEventListener('click', (e) => {
            if (hasImage) {
                openPoseModal();
            } else {
                // if their is no image automatically start camera
                startCamera();
            }
        });

        mainImageArea.addEventListener('click', (e) => { 
            if (e.target !== liveVideo) {
                if (!camUi.classList.contains('hidden')) {
                    startCamera();
                } 
                else {
                    openPoseModal();
                }
            }
        });

        const stopCamera = () => {
            if (stream) { stream.getTracks().forEach(track => track.stop()); stream = null; }
 
            liveVideo.classList.add('hidden');
            cameraControls.classList.add('hidden');
            
            if (!hasImage && !currentResultBase64) {
                camUi.classList.remove('hidden');
            } else {
                mainImg.classList.remove('hidden');
            }
        };

// Requests access to the user's webcam using the native MediaDevices API.
        // It specifically asks for a 1344x768 resolution to match the aspect ratio 
        // expected by the ComfyUI generation workflow. It then updates the UI to show the live feed.
        const startCamera = async () => {
            if (!stream) {
                try {
                    stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1344, height: 768 } });
                    liveVideo.srcObject = stream;
                    liveVideo.classList.remove('hidden');
                    cameraControls.classList.remove('hidden');
                    mainImg.classList.add('hidden');
                    camUi.classList.add('hidden');
                } catch (err) { alert("Kamera konnte nicht gestartet werden."); }
            }
        };

        stopCamBtn.addEventListener('click', stopCamera);

        // Handles taking a snapshot from the live video feed.
        // It draws the current video frame onto a hidden HTML <canvas>, extracts it 
        // as a slightly compressed JPEG Base64 string, and updates the UI (main view and thumbnail).
        camCaptureBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!stream) return;
            const ctx = captureCanvas.getContext('2d');
            ctx.drawImage(liveVideo, 0, 0, captureCanvas.width, captureCanvas.height);
            poseBase64 = captureCanvas.toDataURL('image/jpeg', 0.9);
            hasImage = true;
            mainImg.src = poseBase64;
            mainImg.classList.remove('hidden');
            thumbImg.src = poseBase64;
            thumbContainer.classList.remove('hidden');
            stopCamera();
            checkInputs();
        });

        // Allows the user to trigger the webcam capture using the 'Space' or 'Enter' keys while the camera is active.
        document.addEventListener('keydown', (e) => { if ((e.code === 'Space' || e.code === 'Enter') && stream) { e.preventDefault(); camCaptureBtn.click(); } });

        // Serves as an alternative to the webcam. The user(admin) can upload a local file,
        // the FileReader API converts the image into a Base64 string.
        // It updates the UI just like the webcam capture and ensures the camera stream is stopped.
        //(It was for the development stage to easily test if everything works)
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    poseBase64 = event.target.result;
                    hasImage = true;
                    mainImg.src = poseBase64;
                    mainImg.classList.remove('hidden');
                    camUi.classList.add('hidden');
                    thumbImg.src = poseBase64;
                    thumbContainer.classList.remove('hidden');
                    checkInputs();
                    if (stream) stopCamera();
                };
                reader.readAsDataURL(file);
            }
        });

        descInput.addEventListener('input', checkInputs);

// A helper function called after a successful generation from the ComfyUI API.
        // It swaps out the pose image for the final AI-generated result and locks the text prompt.
        const showResult = (imgSrc) => {
            if (imgSrc) {
                mainImg.src = imgSrc;
                mainImg.classList.remove('hidden');
                camUi.classList.add('hidden');
                if (hasImage) thumbContainer.classList.remove('hidden');
            }
            lockPrompt();
        };

        // --- History / Soft Delete ---
        // Dynamically adds visual thumbnails for previous generations in a specific frame. 
        // Manages switching between active images and handles soft-deletions in the backend payload.
       // Creates and appends a visual thumbnail for a previously generated image.
        function addHistoryThumbnail(base64Str) {
            historyContainer.classList.remove('hidden');
            
            // Build the physical DOM structure for the thumbnail and its delete overlay.
            const thumb = document.createElement('div');
            thumb.style.cssText = "position: relative; flex: none; height: 60px; aspect-ratio: 1344/768; border: 2px solid var(--color-purple); border-radius: 0.5rem; overflow: hidden; cursor: pointer; transition: transform 0.2s;";

            thumb.innerHTML = `
                <img src="${base64Str}" style="width: 100%; height: 100%; object-fit: cover;">
                <div class="delete-history-btn" title="delete version" style="position: absolute; top: 2px; right: 2px; background: var(--color-danger); color: white; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 1px 3px rgba(0,0,0,0.3); transition: transform 0.2s; z-index: 10;" onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </div>
            `;

            // Simple hover effects for better UX.
            thumb.addEventListener('mouseenter', () => thumb.style.transform = "scale(1.05)");
            thumb.addEventListener('mouseleave', () => thumb.style.transform = "scale(1)");

            // --- Delete History Item ---
            const deleteBtn = thumb.querySelector('.delete-history-btn');
            deleteBtn.addEventListener('click', (e) => {
                // Prevent the click from bubbling up and triggering the thumbnail swap event below.
                e.stopPropagation();

                showConfirmModal("Are you sure you want to delete this version?", async () => {
                    // Visually remove the thumbnail from the DOM.
                    thumb.remove();

                    // Hide the entire history section if this was the last remaining thumbnail.
                    if (historyContainer.children.length <= 1) {
                        historyContainer.classList.add('hidden');
                    }

                    // Soft-Delete Implementation: 
                    // Instead of destroying the image data, we flag it as deleted in our local state array. 
                    // This way all versions are still displayed on the admin page
                    const itemToMark = frameHistory.find(h => h.src === base64Str && !h.is_deleted);
                    if (itemToMark) itemToMark.is_deleted = true;

                    const activeCharOpt = frameDiv.querySelector('.active-char');
                    const selectedCharName = activeCharOpt ? activeCharOpt.dataset.name : '';

                    // Sync the updated state (with the newly soft-deleted item) to the backend database.
                    try {
                        await fetch('api.php', {
                            method: 'POST', headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                action: 'save_frame',
                                session_id: sessionId,
                                scene_frame_id: sceneFrameId,
                                prompt: descInput.value.trim(),
                                pose: poseBase64 || '',
                                result: currentResultBase64,
                                character_name: selectedCharName,
                                history: getHistoryArray() // Converts the array to a JSON string
                            })
                        });
                    } catch (err) { console.error("Fehler beim Speichern der Historie:", err); }
                });
            });

            // --- Swap Active Image with History Item ---
            // Allows the user to restore a previous generation by clicking its thumbnail.
            thumb.addEventListener('click', async (e) => {
                // Ignore clicks if the user was actually trying to click the delete button.
                if (e.target.closest('.delete-history-btn')) return;

                // Swap the currently active result with the clicked historical image.
                const temp = currentResultBase64;
                currentResultBase64 = base64Str;
                base64Str = temp;
                
                // Update the visual UI to reflect the swap.
                showResult(currentResultBase64);
                thumb.querySelector('img').src = base64Str;
                generateBtn.innerHTML = "Saving...";

                // Adjust the local state array so the history correctly tracks which image is where.
                const itemToSwap = frameHistory.find(h => h.src === currentResultBase64 && !h.is_deleted);
                if (itemToSwap) itemToSwap.src = base64Str;

                const activeCharOpt = frameDiv.querySelector('.active-char');
                const selectedCharName = activeCharOpt ? activeCharOpt.dataset.name : '';

                // Save the new arrangement (active image vs. history images) to the server.
                try {
                    await fetch('api.php', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            action: 'save_frame',
                            session_id: sessionId,
                            scene_frame_id: sceneFrameId,
                            prompt: descInput.value.trim(),
                            pose: poseBase64 || '',
                            result: currentResultBase64,
                            character_name: selectedCharName,
                            history: getHistoryArray()
                        })
                    });
                    generateBtn.innerHTML = "Regenerate";
                    if (!existingData) existingData = {};
                    existingData.result_base64 = currentResultBase64;
                } catch (err) { setTimeout(() => generateBtn.innerHTML = "Regenerate", 2000); }
            });

            // Insert the new thumbnail at the beginning of the list (right after the "Previous:" label).
            historyContainer.insertBefore(thumb, historyContainer.children[1]);
        }

        // --- Image Generation ---
        // Builds the specific JSON workflow required by ComfyUI. 
        // It injects negative/positive prompts dynamically based on the selected character's 
        // gender and pre-defined visual tags (e.g., clothing, hair) to ensure consistency.
        generateBtn.addEventListener('click', async () => {

            // Ensure the user has selected a character before attempting to generate.
            // This is crucial because the character dictates the visual tags and IPAdapter references.
            const activeCharOpt = frameDiv.querySelector('.active-char');
            if (!activeCharOpt) return alert("Bitte wähle oben einen Charakter aus!");
            const selectedCharName = activeCharOpt.dataset.name;
            const charData = globalCharacters.find(c => c.name === selectedCharName);

            if (!charData) return alert("Charakter-Daten nicht gefunden!");

            // Lock the UI to prevent multiple concurrent API calls.
            const originalBtnText = generateBtn.innerHTML;
            generateBtn.innerHTML = "Generating...";
            generateBtn.disabled = true;

            try {
                // --- Step 1: Upload Pose Reference ---
                // If the user captured a webcam pose or uploaded an image, it must first be 
                // sent to the ComfyUI server so it can be referenced by the ControlNet node later.
                let poseFile = null;
                if (hasImage && poseBase64) {
                    poseFile = await uploadImageToComfy(poseBase64, `pose_${Date.now()}.jpg`);
                }

                // --- Step 2: Construct the ComfyUI Node Graph ---
                // This JSON object represents the exact node layout of a Stable Diffusion workflow in ComfyUI.
                // It defines the routing for the base model, IPAdapters (for character consistency), 
                // ControlNet (for posing), and the samplers.
                // Note: Hardcoded for a 1344x768 resolution.
                const workflow = {
                    "3": { "inputs": { "seed": 0, "steps": 5, "cfg": 2.0, "sampler_name": "euler", "scheduler": "sgm_uniform", "denoise": 1, "model": ["329", 0], "positive": ["331", 0], "negative": ["331", 1], "latent_image": ["5", 0] }, "class_type": "KSampler" },
                    "4": { "inputs": { "ckpt_name": "dreamshaperXL_lightningDPMSDE.safetensors" }, "class_type": "CheckpointLoaderSimple" },
                    "5": { "inputs": { "width": 1344, "height": 768, "batch_size": 1 }, "class_type": "EmptyLatentImage" },
                    "6": { "inputs": { "text": "PLATZHALTER", "clip": ["4", 1] }, "class_type": "CLIPTextEncode" },
                    "7": { "inputs": { "text": "PLATZHALTER", "clip": ["4", 1] }, "class_type": "CLIPTextEncode" },
                    "8": { "inputs": { "samples": ["3", 0], "vae": ["4", 2] }, "class_type": "VAEDecode" },
                    "10": { "inputs": { "strength": 0.88, "start_percent": 0, "end_percent": 0.973, "positive": ["6", 0], "negative": ["7", 0], "control_net": ["12", 0], "image": ["324", 0] }, "class_type": "ControlNetApplyAdvanced" },
                    "12": { "inputs": { "control_net_name": "OpenPoseXL2.safetensors" }, "class_type": "ControlNetLoader" },
                    "29": { "inputs": { "interpolation": "LANCZOS", "crop_position": "center", "sharpening": 0.1, "image": ["319", 0] }, "class_type": "PrepImageForClipVision" },
                    "30": { "inputs": { "preset": "PLUS FACE (portraits)", "model": ["4", 0] }, "class_type": "IPAdapterUnifiedLoader" },
                    "31": { "inputs": { "weight": 0.95, "start_at": 0, "end_at": 0.679, "weight_type": "style transfer", "model": ["30", 0], "ipadapter": ["30", 1], "image": ["29", 0] }, "class_type": "IPAdapter" },
                    "32": { "inputs": { "image": "PLATZHALTER" }, "class_type": "LoadImage" },
                    "67": { "inputs": { "image": "PLATZHALTER" }, "class_type": "LoadImage" },
                    "145": { "inputs": { "images": ["8", 0] }, "class_type": "PreviewImage" },
                    "311": { "inputs": { "ckpt_name": "depth_anything_v2_vitl.pth", "resolution": 1024, "image": ["313", 0] }, "class_type": "DepthAnythingV2Preprocessor" },
                    "313": { "inputs": { "target_width": 1344, "target_height": 768, "padding_color": "white", "interpolation": "area", "image": ["67", 0] }, "class_type": "ResizeAndPadImage" },
                    "319": { "inputs": { "target_width": 1024, "target_height": 576, "padding_color": "white", "interpolation": "area", "image": ["32", 0] }, "class_type": "ResizeAndPadImage" },
                    "320": { "inputs": { "filename_prefix": "ComfyUI", "images": ["8", 0] }, "class_type": "SaveImage" },
                    "324": { "inputs": { "detect_hand": "enable", "detect_body": "enable", "detect_face": "enable", "resolution": 1024, "bbox_detector": "yolox_l.onnx", "pose_estimator": "dw-ll_ucoco_384_bs5.torchscript.pt", "scale_stick_for_xinsr_cn": "disable", "image": ["313", 0] }, "class_type": "DWPreprocessor" },
                    "325": { "inputs": { "image": "PLATZHALTER" }, "class_type": "LoadImage" },
                    "326": { "inputs": { "target_width": 1024, "target_height": 576, "padding_color": "white", "interpolation": "area", "image": ["325", 0] }, "class_type": "ResizeAndPadImage" },
                    "327": { "inputs": { "interpolation": "LANCZOS", "crop_position": "center", "sharpening": 0.1, "image": ["326", 0] }, "class_type": "PrepImageForClipVision" },
                    "328": { "inputs": { "preset": "PLUS (high strength)", "model": ["31", 0] }, "class_type": "IPAdapterUnifiedLoader" },
                    "329": { "inputs": { "weight": 0.65, "start_at": 0, "end_at": 0.434, "weight_type": "style transfer", "model": ["328", 0], "ipadapter": ["328", 1], "image": ["327", 0] }, "class_type": "IPAdapter" },
                    "331": { "inputs": { "strength": 0.52, "start_percent": 0, "end_percent": 0.878, "positive": ["10", 0], "negative": ["10", 1], "control_net": ["333", 0], "image": ["311", 0] }, "class_type": "ControlNetApplyAdvanced" },
                    "333": { "inputs": { "control_net_name": "sai_xl_depth_256lora.safetensors" }, "class_type": "ControlNetLoader" }
                };

                // Randomize the seed for variations on regeneration.
                workflow["3"].inputs.seed = Math.floor(Math.random() * 1000000000);

                // --- Step 3: Dynamic Prompt & Style Injection ---
                // Inject specific reference images into the IPAdapter nodes based on which character is active.
                // Additionally, append heavily weighted visual tags to force the AI to respect character designs.
                let charVisualTags = "";
                const charIndex = globalCharacters.findIndex(c => c.name === selectedCharName);
                if (charIndex === 0) { // Specific configuration for the first character (Dave)
                    workflow["32"].inputs.image = "dave_portrait.png";
                    workflow["325"].inputs.image = "dave_fullbody.png";
                    charVisualTags = "(1boy:1.5), (solo:1.5), shirt, monochrome, short_sleeves, shoes, pants, facial_hair, t-shirt, sneakers, mustache, lineart, old_man";
                } else { // Specific configuration for the second character (Sara)
                    workflow["32"].inputs.image = "sara_portrait.png";
                    workflow["325"].inputs.image = "sara_fullbody.png";
                    charVisualTags = "(1girl:1.5), (solo:1.5), shoulderlength_hair, shirt, monochrome, short_sleeves, greyscale, shoes, long_pants, denim, t-shirt, sneakers, jeans, lineart";
                }

                // Global Negative Prompt: Prevents common AI artifacts like text, extra limbs, or background clutter.
                workflow["7"].inputs.text += ", (shading:1.8), (gradients:1.8), (grey:1.8), (text:1.5), (speech bubble:1.5), (words:1.5), (letters:1.5), (watermark:1.5), unprompted elements, random background objects, clutter, distracting background, out of context, messy composition, disconnected items, (multiple people:1.5), (twins:1.5), (clones:1.5), (duplicate:1.5), (two people:1.5), (extra people:1.5), (extra faces:1.5), split screen, grid, collage, background characters";

                // Global Positive Prompt Assembly: Combines character traits, gender weights, the user's custom input, and the core artistic style.
                let genderPrompt = charData.gender === "female" ? "(1girl:1.5), (solo:1.5), woman, female, " : (charData.gender === "male" ? "(1boy:1.5), (solo:1.5), man, male, " : "(solo:1.5), ");
                const basePrompt = "Coloring Book, lineart, black and white, clean lines, artistic style, clear focus on subject";
                workflow["6"].inputs.text = `${charData.name}, ${charVisualTags}, ${genderPrompt}${descInput.value.trim()}, ${basePrompt}, ${currentStyle}`;

                // Workflow Routing: If a pose image was uploaded, route the KSampler inputs through the ControlNet nodes.
                // If not, bypass ControlNet entirely.
                if (hasImage && poseFile) {
                    workflow["67"].inputs.image = poseFile;
                    workflow["3"].inputs.positive = ["331", 0];
                    workflow["3"].inputs.negative = ["331", 1];
                } else {
                    workflow["3"].inputs.positive = ["6", 0];
                    workflow["3"].inputs.negative = ["7", 0];
                }

                // --- Step 4: Execute & Wait ---
                const promptId = await queueComfyPrompt(workflow);
                const imageUrl = await waitForComfyImage(promptId);

                // --- Step 5: Process Results & Sync to Database ---
                if (imageUrl) {
                    showResult(imageUrl);
                    try {
                        const resultBase64 = await getBase64FromUrl(imageUrl);
                        
                        // Push the previous image into the local history array before overwriting it.
                        if (currentResultBase64) {
                            frameHistory.push({ src: currentResultBase64, is_deleted: false });
                            addHistoryThumbnail(currentResultBase64);
                        }
                        currentResultBase64 = resultBase64;

                        // Synchronizes the newly generated frame state back to the PHP backend.
                        // This includes the new image, the active text prompt, and the updated history array.
                        await fetch('api.php', {
                            method: 'POST', headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                action: 'save_frame',
                                session_id: sessionId,
                                scene_frame_id: sceneFrameId,
                                prompt: descInput.value.trim(),
                                pose: poseBase64 || '',
                                result: resultBase64,
                                character_name: selectedCharName,
                                history: getHistoryArray()
                            })
                        });

                        generateBtn.innerHTML = "Regenerate";
                        confirmFrameBtn.classList.remove('hidden');

                        // Update local caching object
                        if (!existingData) existingData = {};
                        existingData.result_base64 = resultBase64;
                        existingData.pose_base64 = poseBase64;
                        existingData.prompt_text = descInput.value.trim();
                        existingData.character_name = selectedCharName;
                    } catch (error) {
                        generateBtn.innerHTML = "Save Error!";
                        generateBtn.style.background = "var(--color-danger)";
                    }
                }
            } catch (e) {
                generateBtn.innerHTML = "Error!";
            }

            // --- Step 6: Cleanup ---
            // Reset button states and trigger an input check to ensure proper UI behavior after completion or failure.
            setTimeout(() => {
                if (generateBtn.innerHTML !== "Regenerate") generateBtn.innerHTML = currentResultBase64 ? "Regenerate" : "Generate frame";
                generateBtn.style.background = "";
                checkInputs();
            }, 3000);
        });

        return frameDiv;
    }

    // --- DOM Initialization ---
    // Finds all 'btn-add-frame' buttons in the DOM and binds the frame creation logic to them.
    // Calculates the correct frame index to append based on the existing frames in the scene.
    function initAddFrameButtons() {
        document.querySelectorAll('.btn-add-frame').forEach(btn => {
            if (!btn.dataset.initialized) {
                btn.dataset.initialized = "true";
                btn.addEventListener('click', function () {
                    const sceneBlock = this.closest('.scene-block');
                    const wrapper = this.closest('.frames-wrapper');

                    let maxIdx = 0;
                    const frameHeaders = wrapper.querySelectorAll('.frame-header span');
                    frameHeaders.forEach(header => {
                        const match = header.innerText.match(/Frame (\d+)/);
                        if (match) {
                            const fId = parseInt(match[1]);
                            if (fId > maxIdx) maxIdx = fId;
                        }
                    });

                    const nextIdx = maxIdx + 1;

                    wrapper.insertBefore(createFrameElement(sceneBlock.dataset.sceneId, nextIdx), this);
                });
            }
        });
    }

    // Restores the scenes and frames from the data fetched from the API during page load.
    // Rebuilds the DOM hierarchy (Scene -> Frames) if data exists, otherwise creates an empty Scene 1.
    function loadExistingFrames() {
        scenesContainer.innerHTML = '';

        if (initialData && initialData.success && initialData.frames && initialData.frames.length > 0) {
            let maxSceneId = 1;
            initialData.frames.forEach(frame => {
                if (frame.is_deleted == 1 || frame.is_deleted === "1") return;

                const parts = frame.scene_frame_id.split('.');
                const sId = parseInt(parts[0]);
                const fId = parseInt(parts[1]);

                if (sId > maxSceneId) maxSceneId = sId;
                let sceneBlock = document.querySelector(`.scene-block[data-scene-id="${sId}"]`);

                if (!sceneBlock) {
                    sceneBlock = document.createElement('div');
                    sceneBlock.className = "scene-block";
                    sceneBlock.style.position = "relative";
                    sceneBlock.dataset.sceneId = sId;

                    sceneBlock.innerHTML = `
                        <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem; margin-top: 1rem;">
                            <h2 class="scene-title" style="margin: 0;">Scene ${sId}</h2>
                        </div>
                        <div class="scene-container"><div class="frames-wrapper"><button class="btn-add-frame"><svg class="plus" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#85C6CC" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg><span>Add Frame</span></button></div></div>`;
                        scenesContainer.appendChild(sceneBlock);
                    initAddFrameButtons();
                }
                const wrapper = sceneBlock.querySelector('.frames-wrapper');
                wrapper.insertBefore(createFrameElement(sId, fId, frame), wrapper.querySelector('.btn-add-frame'));
            });
            sceneCount = maxSceneId;
        } else {
            sceneCount = 1;
            const scene1 = document.createElement('div');
            scene1.className = "scene-block";
            scene1.style.position = "relative";
            scene1.dataset.sceneId = 1;
            scene1.innerHTML = `<div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem; margin-top: 1rem;"><h2 class="scene-title" style="margin: 0;">Scene 1</h2></div><div class="scene-container"><div class="frames-wrapper"><button class="btn-add-frame"><svg class="plus" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#85C6CC" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg><span>Add Frame</span></button></div></div>`;
            scenesContainer.appendChild(scene1);
            initAddFrameButtons();
        }
    }

    initAddFrameButtons();
    setTimeout(loadExistingFrames, 200);

    // --- Study Completion Logic ---
    // Manages the transition between adding a new scene, marking a task as done, 
    // and finally finishing the study once a specific threshold (e.g., 3 active scenes) is met.

    let isTaskDonePhase = true; // These boolean flags track the participant's current step within the study workflow.
    let isFinishPhase = false;

    if (addSceneBtn) {
        // Initialize the button to the "Task done" state by default.
        addSceneBtn.innerHTML = `
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            Task done
        `;

        // --- Supervisor Checkpoint Modal ---
        // Generates a custom modal that forces the participant to pause and talk to the study supervisor.
        // This is a crucial control mechanism for the user study to ensure tasks are completed 
        // properly before the participant moves on to the next scene or finishes the experiment.
        function showSupervisorModal(onComplete) {
            const overlay = document.createElement('div');
            overlay.className = 'custom-modal-overlay';
            const modal = document.createElement('div');
            modal.className = 'custom-modal';

            const text = document.createElement('p');
            text.innerText = "Inform the study supervisor.";
            text.style.fontWeight = "bold";
            text.style.fontSize = "2rem";
            text.style.marginBottom = "1.5rem";

            const btnContainer = document.createElement('div');
            btnContainer.style.display = "flex";
            btnContainer.style.gap = "1rem";

            const cancelBtn = document.createElement('button');
            cancelBtn.className = 'btn-cancel';
            cancelBtn.style.flex = "1";
            cancelBtn.style.fontSize = "20px";
            cancelBtn.style.borderRadius = "15px";
            cancelBtn.innerText = 'Cancel';

            const confirmBtn = document.createElement('button');
            confirmBtn.className = 'btn-primary';
            confirmBtn.style.flex = "1";
            confirmBtn.style.fontSize = "20px";
            confirmBtn.style.background = '#4BADB5';
            confirmBtn.style.color = 'white';
            confirmBtn.innerText = 'Done';

            btnContainer.appendChild(cancelBtn);
            btnContainer.appendChild(confirmBtn);
            modal.appendChild(text);
            modal.appendChild(btnContainer);
            overlay.appendChild(modal);
            document.body.appendChild(overlay);

            setTimeout(() => overlay.classList.add('active'), 10);

            // Close modal without advancing the state if the user cancels.
            cancelBtn.addEventListener('click', () => {
                overlay.classList.remove('active');
                setTimeout(() => overlay.remove(), 300);
            });

            // If confirmed (supervisor gives the go-ahead), close modal and trigger the callback.
            confirmBtn.addEventListener('click', () => {
                overlay.classList.remove('active');
                setTimeout(() => overlay.remove(), 300);
                onComplete();
            });
        }

        // --- Dynamic Button Logic ---
        // This single button handles three different actions depending on the current phase.
        addSceneBtn.addEventListener('click', () => {
            
            // Phase 3: The study is fully completed. Route the user to the final overview page.
            if (isFinishPhase) {
                window.location.href = 'overview.html';
                return;
            }

            // Phase 1: The user claims they are done with the current task/scene.
            if (isTaskDonePhase) {
                showSupervisorModal(() => {
                    // Once the supervisor confirms, we move out of the "Task Done" phase.
                    isTaskDonePhase = false;

                    // Count how many scenes the user has created so far.
                    const activeScenes = scenesContainer.querySelectorAll('.scene-block').length;

                    // Study Completion Logic: 
                    // If the user is in the main tasks session (globalSessionCount >= 2) 
                    // and has completed the required number of scenes (>= 3), trigger the finish phase.
                    if (globalSessionCount >= 2 && activeScenes >= 3) {
                        isFinishPhase = true;
                        
                        // Visually upgrade the button to a red "Finish & Overview" button.
                        addSceneBtn.innerHTML = `
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 0.5rem;">
                              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                              <line x1="3" y1="9" x2="21" y2="9"></line>
                              <line x1="9" y1="21" x2="9" y2="9"></line>
                            </svg>
                            Finish & Overview
                        `;
                        addSceneBtn.style.background = 'var(--color-danger)';
                        addSceneBtn.style.color = 'white';
                    } else {
                        // Otherwise, just prepare the button to add the next scene.
                        addSceneBtn.innerHTML = `
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                            Add Scene
                        `;
                        addSceneBtn.style.background = '';
                        addSceneBtn.style.color = '';
                    }
                });
                return; // Stop execution here so we don't accidentally add a scene yet.
            }

            // Phase 2: The user clicks "Add Scene".
            // We increment the scene counter, generate the DOM structure for a new scene block,
            // and inject it into the main container.
            sceneCount++;
            const scene = document.createElement('div');
            scene.className = "scene-block";
            scene.style.position = "relative";
            scene.dataset.sceneId = sceneCount;

            scene.innerHTML = `
                <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem; margin-top: 1rem;">
                    <h2 class="scene-title" style="margin: 0;">Scene ${sceneCount}</h2>
                </div>
                <div class="scene-container">
                    <div class="frames-wrapper">
                        <button class="btn-add-frame">
                            <svg class="plus" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#85C6CC" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                            <span>Add Frame</span>
                        </button>
                    </div>
                </div>`;
            
            scenesContainer.appendChild(scene);
            
            // Attach the frame-creation event listeners to the newly created "Add Frame" button.
            initAddFrameButtons();

            // Reset the cycle: Now that a new scene is added, the user must complete tasks again.
            // Change the button back to its initial "Task done" state.
            isTaskDonePhase = true;
            addSceneBtn.innerHTML = `
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                Task done
            `;
        });
    }


});