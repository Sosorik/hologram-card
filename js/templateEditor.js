
/**
 * Unified Template Editor (Admin Dashboard)
 * Manages Full Templates (Frame + Texture + Layout) in one place.
 */

let activeEditItem = null;
let activeGradeId = null;

// Global Font Options - Used across all font selectors in the editor
const FONT_OPTIONS = [
    'Pretendard, sans-serif',
    'Outfit, sans-serif',
    'Inter, sans-serif',
    'Arial, sans-serif',
    'Helvetica, sans-serif',
    'Times New Roman, serif',
    'Georgia, serif',
    'Courier New, monospace',
    'Teko, sans-serif',
    'cursive',
    'fantasy'
];

// Helper: Toast - Uses global Toast system (toastSystem.js)
function showToast(message, type = 'success') {
    if (window.Toast && Toast.show) {
        Toast.show(message, type);
    } else {
        console.warn('[templateEditor] Toast system not loaded, message:', message);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const toggleBtn = document.getElementById('editorToggleBtn');
    const panel = document.getElementById('editorPanel');
    // Static closeBtn removed (handled dynamically)
    const container = document.getElementById('editorControlsArea');
    const exportBtn = document.getElementById('exportConfigBtn');

    toggleBtn.addEventListener('click', () => {
        try {
            if (!window.cardConfig) {
                alert("Critical Error: cardConfig not loaded. Please restart the server or check the console.");
                return;
            }
            panel.classList.toggle('hidden');
            if (!panel.classList.contains('hidden')) {
                showMainMenu(container);
            }
        } catch (e) {
            console.error("Editor Crash:", e);
            alert("Editor Error: " + e.message + "\nCheck console for details.");
        }
    });

    // Static close listener removed

    // Environment Detection: Always assume Server/Local for now as per user request
    const isLocal = true; // window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    exportBtn.innerText = "Save to Server";
    exportBtn.addEventListener('click', () => {
        if (!isLocal) {
            // Static Mode: Download JSON
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(window.cardConfig, null, 2));
            const downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.setAttribute("href", dataStr);
            downloadAnchorNode.setAttribute("download", "card_config_backup.json");
            document.body.appendChild(downloadAnchorNode); // required for firefox
            downloadAnchorNode.click();
            downloadAnchorNode.remove();
            showToast("Config Downloaded (Serverless Mode)");
            return;
        }

        exportBtn.innerText = "Saving...";
        exportBtn.innerText = "Saving...";
        fetch('/save-config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(window.cardConfig)
        })
            .then(async res => {
                const text = await res.text();
                if (!res.ok) {
                    throw new Error(`Server Error (${res.status}): ${text}`);
                }
                try {
                    return JSON.parse(text);
                } catch (e) {
                    throw new Error("Invalid Server Response: " + text.substring(0, 100));
                }
            })
            .then(data => {
                if (data.success) {
                    showToast("Configuration Saved!");
                    exportBtn.innerText = "Saved!";
                    setTimeout(() => exportBtn.innerText = "Save to Server", 2000);
                } else {
                    throw new Error(data.error || "Unknown Error");
                }
            })
            .catch(err => {
                console.error("Save Failed:", err);
                showToast("Failed: " + err.message, 'error');
                exportBtn.innerText = "Save to Server";
            });
    });
});

function showMainMenu(container) {
    container.innerHTML = '';
    createHeader(container, "Template Manager >");

    const templates = window.cardConfig.templates || [];

    // Create New Button
    createButton(container, "+ Create New Template", () => showCreateWizard(container), "#4CAF50");

    // List Items
    const list = document.createElement('div');
    list.style.maxHeight = "400px";
    list.style.overflowY = "auto";

    templates.forEach(item => {
        const row = document.createElement('div');
        row.style.background = "#333";
        row.style.padding = "10px";
        row.style.marginBottom = "5px";
        row.style.borderRadius = "4px";
        row.style.display = "flex";
        row.style.justifyContent = "space-between";
        row.style.alignItems = "center";
        row.style.cursor = "pointer";
        row.style.transition = "background 0.2s";

        // CLICK HANDLER
        row.onclick = (e) => {
            console.log("Template Item Clicked:", item.id); // [DEBUG] Track clicks
            try {
                showEditor(container, item);
            } catch (err) {
                console.error("Editor Launch Error:", err);
                alert("Click Error: " + err.message);
            }
        };

        row.onmouseover = () => row.style.background = "#444";
        row.onmouseout = () => row.style.background = "#333";

        // Label
        const label = document.createElement('span');
        label.textContent = item.name;
        label.style.flexGrow = "1";
        label.style.paddingRight = "10px"; // Gap for buttons
        // Click bubbles to row
        row.appendChild(label);

        // Container for buttons
        const btnGroup = document.createElement('div');
        btnGroup.style.display = 'flex';
        btnGroup.style.gap = '10px';

        // Duplicate Button
        const dupBtn = document.createElement('button');
        dupBtn.textContent = "Copy";
        dupBtn.style.padding = "4px 8px";
        dupBtn.style.fontSize = "12px";
        dupBtn.style.background = "#2196F3";
        dupBtn.style.color = "white";
        dupBtn.style.border = "none";
        dupBtn.style.borderRadius = "4px";
        dupBtn.style.cursor = "pointer";
        dupBtn.onclick = (e) => {
            e.stopPropagation(); // Stop bubbling
            duplicateTemplate(container, item);
        };
        btnGroup.appendChild(dupBtn);

        row.appendChild(btnGroup);
        list.appendChild(row);
    });
    container.appendChild(list);
}

function duplicateTemplate(container, original) {
    // 1. Robust Deep Copy using structuredClone (modern/safe)
    // fallback to JSON if needed, but structuredClone handles more edge cases
    let clone;
    try {
        clone = structuredClone(original);
    } catch (e) {
        console.warn("structuredClone failed, falling back to JSON:", e);
        clone = JSON.parse(JSON.stringify(original));
    }

    // 2. Explicitly Break References for Critical Objects
    // Unlink layout and grades just to be absolutely paranoid
    if (original.layout) {
        clone.layout = JSON.parse(JSON.stringify(original.layout));
    }
    if (original.grades) {
        clone.grades = JSON.parse(JSON.stringify(original.grades));
    }

    // 3. Modify Unique Fields
    clone.id = original.id + "_copy_" + Date.now();
    clone.name = original.name + " (Copy)";

    // 4. Add to config
    if (!window.cardConfig.templates) window.cardConfig.templates = [];
    window.cardConfig.templates.push(clone);

    showToast(`Template Duplicated! (ID: ${clone.id})`);
    // [DEBUG REMOVED]

    // 5. Refresh System & UI
    initTemplateSystem();

    // 6. Select the new clone
    const newIndex = window.cardConfig.templates.length - 1;
    selectTemplate(newIndex);

    // 7. Force Editor Reset
    // Ensure we are targeting the NEW clone
    activeEditItem = clone;

    // Default to 'gold' if available in Fancy/Copy scenarios, else first key
    if (clone.grades && clone.grades['gold']) {
        activeGradeId = 'gold';
    } else if (clone.grades) {
        activeGradeId = Object.keys(clone.grades)[0];
    } else {
        activeGradeId = null;
    }

    // 8. Open Editor
    showEditor(container, clone);
}

function showCreateWizard(container) {
    container.innerHTML = '';
    createHeader(container, "New Template Wizard");

    const idInput = createInputWithReturn(container, "ID (unique)", `tmpl_${Date.now()}`);
    const nameInput = createInputWithReturn(container, "Name", "New Card Style");

    const assets = {};

    createSection(container, '1. Visual Assets');
    createAssetUploader(container, "Frame Image", 'frames', (url) => assets.frame = url);
    createAssetUploader(container, "Back/Thumbnail", 'frames', (url) => assets.back = url);
    createAssetUploader(container, "Mask (Optional)", 'frames', (url) => assets.mask = url);

    createSection(container, '2. Hologram Texture');
    createAssetUploader(container, "Holo Pattern (Texture)", 'textures', (url) => assets.texture = url);

    createButton(container, "Create Template", () => {
        if (!idInput.value || !nameInput.value) return showToast("ID and Name required", 'error');

        // Construct Template
        const newTemplate = {
            id: idInput.value,
            name: nameInput.value,
            thumbnail: assets.back || "",
            assets: {
                frame: assets.frame || "",
                back: assets.back || "",
                mask: assets.mask || "",
                texture: assets.texture || "" // Stored here for reference
            },
            styles: {
                "--accent-color": "#ffffff",
                "--font-family": "'Teko', sans-serif",
                "--grade-mix-blend": "overlay",
                "--holo-blend-mode": "color-dodge",
                "--holo-mask-texture": "url('assets/textures/Holo_mask_Basic.png')",
                "--back-effect": "none",
                "--back-blur": "1px",
                "--back-grayscale": "100%",
                "--back-brightness": "157%",
                "--back-mask": "url('assets/frames/1766702545638_1766554460216_back_mask.png')",
                "--back-mask-color": "#000000",
                "--back-mask-blend": "darken",
                "--holo-opacity": "0.55",
                "--holo-bg-image": "linear-gradient(115deg, transparent 25%, rgba(255,0,128,0.7) 40%, rgba(0,255,255,0.7) 45%, rgba(255,215,0,0.7) 50%, transparent 60%)",
                "--holo-gradient": "linear-gradient(115deg, transparent 25%, rgba(255,0,128,0.7) 40%, rgba(0,255,255,0.7) 45%, rgba(255,215,0,0.7) 50%, transparent 60%)",
                "--holo-scale": "142.9%",
                "--holo-repeats": 0.7,
                "--back-mask-opacity": "0",
                "--holo-move-scale": "3x",
                "--holo-saturation": "3",
                "--holo-brightness": "0.7",
                "--holo-contrast": "2.9",
                "--art-overlay-opacity": "0.2",
                "--art-overlay-blend": "multiply",
                "--holo2-mask": "var(--template-mask)",
                "--holo2-mask-texture": "var(--holo-mask-texture)",
                "--holo2-scale": "200%",
                "--holo2-opacity": "1",
                "--holo2-blend-mode": "soft-light",
                "--holo2-pos-x": "65%",
                "--holo2-pos-y": "46%"
            },
            layout: {
                name: { bottom: "24px", left: "28px", fontSize: "26px", textAlign: "left", maxLength: 20 },
                grade: { bottom: "12px", right: "27px", fontSize: "26px", maxLength: 10 },
                edition: { bottom: "2px", fontSize: "9px", maxLength: 15 },
                label: { fontSize: "12px", maxLength: 10 }
            }
        };

        window.cardConfig.templates.push(newTemplate);
        showToast("Template Created!");

        initTemplateSystem(); // Refresh UI

        // Fix: Select the newly created template so we see it!
        const newIndex = window.cardConfig.templates.length - 1;
        selectTemplate(newIndex);

        showEditor(container, newTemplate); // Go to edit

    }, "#D4AF37");

    createButton(container, "Cancel", () => showMainMenu(container), "#666");
}



function showEditor(container, item) {
    // [DEBUG REMOVED]

    // Check if we are switching to a NEW item, or if activeGradeId is unset
    if (activeEditItem !== item || !activeGradeId) {
        activeEditItem = item;

        // CG FIX: Respect globally selected grade (from loadCardToMain)
        if (window.currentGradeId && item.grades && item.grades[window.currentGradeId]) {
            activeGradeId = window.currentGradeId;
        }
        // Default to first grade if available
        else if (item.grades) {
            activeGradeId = Object.keys(item.grades)[0];
        } else {
            activeGradeId = null;
        }
    } else {
        // Even if activeEditItem matches, if window.currentGradeId changed externally (e.g. loadCard), sync it.
        if (window.currentGradeId && item.grades && item.grades[window.currentGradeId] && activeGradeId !== window.currentGradeId) {
            activeGradeId = window.currentGradeId;
        }
    }

    container.innerHTML = '';
    createHeader(container, `Edit: ${item.name}`);

    // --- AUTO-MIGRATION: Update defaults to vivid settings if stuck on old defaults ---
    const stylesToMigrate = (activeGradeId && item.grades) ? item.grades[activeGradeId].styles : item.styles;
    if (stylesToMigrate) {
        if (stylesToMigrate['--holo-blend-mode'] === 'screen') {
            stylesToMigrate['--holo-blend-mode'] = 'color-dodge';
        }
        if (stylesToMigrate['--holo-opacity'] === '0.7' || stylesToMigrate['--holo-opacity'] === '0.6') {
            stylesToMigrate['--holo-opacity'] = '1.0';
        }
    }

    // Apply (with grade if exists)
    applyTemplate(item, activeGradeId);

    // Helper: Active Update with DEBOUNCE (Fixes Freeze)
    let updateDebounceTimer;
    const performActiveUpdate = () => {
        if (updateDebounceTimer) clearTimeout(updateDebounceTimer);

        updateDebounceTimer = setTimeout(() => {
            applyTemplate(item, activeGradeId);
        }, 50); // 50ms delay for responsiveness
    };

    // --- HELPER DEFINITIONS (Scoped) ---
    const targetStyles = (activeGradeId && item.grades) ? item.grades[activeGradeId].styles : item.styles;

    // Add Asset Uploader Helper
    const addAssetUploader = (parent, label, key, folder, onUpdate) => {
        let initialVal = "";
        if (activeGradeId && item.grades) {
            initialVal = item.grades[activeGradeId].assets[key];
        } else {
            initialVal = item.assets[key];
        }
        createAssetUploader(parent, label, folder, (url) => {
            if (activeGradeId && item.grades) {
                // Grade Specific
                item.grades[activeGradeId].assets[key] = url;
                if (onUpdate) onUpdate(url, true);
                applyGrade(item, activeGradeId);
            } else {
                // Global
                item.assets[key] = url;
                if (onUpdate) onUpdate(url, false);
                performActiveUpdate();
            }
            showToast(`${label} Updated`);
        }, initialVal);
    };

    const createSimpleSlider = (parent, label, key, defVal, callback = null, min = 0, max = 1, step = 0.05) => {
        const row = document.createElement('div');
        row.style.marginBottom = "10px";
        const val = targetStyles[key] || defVal;

        const top = document.createElement('div');
        top.style.display = 'flex';
        top.style.justifyContent = 'space-between';

        const lbl = document.createElement('label');
        lbl.textContent = `${label}: ${val}`;
        lbl.style.fontSize = "11px";
        lbl.style.color = "#ccc";

        const input = document.createElement('input');
        input.type = "range";
        input.min = min;
        input.max = max;
        input.step = step;
        input.value = parseFloat(val) || 0;
        input.style.width = "60%";

        input.oninput = () => {
            let finalVal = input.value;
            if (callback) finalVal = callback(input.value);
            targetStyles[key] = finalVal;
            lbl.textContent = `${label}: ${finalVal}`;

            // Direct update for Layer 2 position
            if (key === '--holo2-pos-x' || key === '--holo2-pos-y') {
                const sceneEl = document.querySelector('.scene');
                if (sceneEl) sceneEl.style.setProperty(key, input.value);

                const shine2 = document.querySelector('.card__shine-layer2');
                if (shine2) {
                    const posX = parseFloat(targetStyles['--holo2-pos-x']) || 50;
                    const posY = parseFloat(targetStyles['--holo2-pos-y']) || 50;
                    shine2.style.backgroundPosition = `${posX}% ${posY}%`;
                }
            } else {
                performActiveUpdate();
            }
        };

        top.appendChild(lbl);
        top.appendChild(input);
        row.appendChild(top);
        parent.appendChild(row);
    };

    // --- GROUP 1: CORE SECTIONS (Always Open) ---
    const coreSection = createCollapsibleSection(container, "1. Core Settings & Grades", true); // Default Open

    // Template Name
    createInputWithReturn(coreSection, "Template Name", item.name).addEventListener('input', (e) => {
        item.name = e.target.value;
        const header = container.querySelector('h3');
        if (header) header.textContent = `Edit: ${item.name}`;

        // Update Main View Header without resetting selection
        const mainHeader = document.getElementById('templateNameHeader');
        if (mainHeader) mainHeader.textContent = item.name;
    });

    // Hide Grade Toggle
    const hideGradeRow = document.createElement('div');
    hideGradeRow.style.display = 'flex';
    hideGradeRow.style.alignItems = 'center';
    hideGradeRow.style.marginBottom = '15px';
    hideGradeRow.style.gap = '8px';

    const hideGradeChk = document.createElement('input');
    hideGradeChk.type = 'checkbox';
    // Check current styles (grade specific or global)
    const currentStylesForVis = (activeGradeId && item.grades) ? item.grades[activeGradeId].styles : item.styles;
    hideGradeChk.checked = (currentStylesForVis && currentStylesForVis['--grade-display'] === 'none');

    hideGradeChk.onchange = (e) => {
        const val = e.target.checked ? 'none' : 'block';
        // Set to target styles
        if (activeGradeId && item.grades) {
            if (!item.grades[activeGradeId].styles) item.grades[activeGradeId].styles = {};
            item.grades[activeGradeId].styles['--grade-display'] = val;
        } else {
            if (!item.styles) item.styles = {};
            item.styles['--grade-display'] = val;
        }
        performActiveUpdate();
    };

    const hideGradeLbl = document.createElement('label');
    hideGradeLbl.textContent = "Hide Grade on Card (등급 숨기기)";
    hideGradeLbl.style.fontSize = "12px";
    hideGradeLbl.style.color = "#ccc";

    hideGradeRow.appendChild(hideGradeChk);
    hideGradeRow.appendChild(hideGradeLbl);
    coreSection.appendChild(hideGradeRow);

    // TEMPLATE REORDERING
    const tmplOrderRow = document.createElement('div');
    tmplOrderRow.style.display = 'flex';
    tmplOrderRow.style.gap = '10px';
    tmplOrderRow.style.marginBottom = '15px';
    tmplOrderRow.style.marginTop = '5px';

    const moveUpBtn = document.createElement('button');
    moveUpBtn.innerHTML = "⬆ Move Template Up"; // or Left
    moveUpBtn.className = 'action-btn';
    moveUpBtn.style.flex = "1";
    moveUpBtn.style.fontSize = "11px";
    moveUpBtn.onclick = () => {
        const idx = window.cardConfig.templates.indexOf(item);
        if (idx > 0) {
            // Swap with previous
            const temp = window.cardConfig.templates[idx - 1];
            window.cardConfig.templates[idx - 1] = item;
            window.cardConfig.templates[idx] = temp;

            // Update global index to follow the item
            window.currentTemplateIndex = idx - 1;

            showToast("Template Moved Up");
            initTemplateSystem(); // Refresh carousel
            selectTemplate(window.currentTemplateIndex); // Ensure active
            showEditor(container, item); // Refresh editor
        } else {
            showToast("Already at first position");
        }
    };

    const moveDownBtn = document.createElement('button');
    moveDownBtn.innerHTML = "⬇ Move Template Down"; // or Right
    moveDownBtn.className = 'action-btn';
    moveDownBtn.style.flex = "1";
    moveDownBtn.style.fontSize = "11px";
    moveDownBtn.onclick = () => {
        const idx = window.cardConfig.templates.indexOf(item);
        if (idx < window.cardConfig.templates.length - 1) {
            // Swap with next
            const temp = window.cardConfig.templates[idx + 1];
            window.cardConfig.templates[idx + 1] = item;
            window.cardConfig.templates[idx] = temp;

            // Update global index
            window.currentTemplateIndex = idx + 1;

            showToast("Template Moved Down");
            initTemplateSystem();
            selectTemplate(window.currentTemplateIndex);
            showEditor(container, item);
        } else {
            showToast("Already at last position");
        }
    };

    tmplOrderRow.appendChild(moveUpBtn);
    tmplOrderRow.appendChild(moveDownBtn);
    coreSection.appendChild(tmplOrderRow);

    // Grade Management
    const gradeTabs = document.createElement('div');
    gradeTabs.style.display = 'flex';
    gradeTabs.style.gap = '10px';
    gradeTabs.style.marginBottom = '10px';
    gradeTabs.style.flexWrap = 'wrap';

    if (item.grades && Object.keys(item.grades).length > 0) {
        Object.keys(item.grades).forEach(gKey => {
            const gBtn = document.createElement('button');
            gBtn.textContent = item.grades[gKey].label;
            gBtn.className = 'action-btn';
            if (gKey === activeGradeId) {
                gBtn.style.backgroundColor = "#D4AF37";
                gBtn.style.color = "#000";
                gBtn.style.fontWeight = "bold";
                gBtn.style.border = "1px solid #D4AF37";
            } else {
                gBtn.style.color = "#ccc";
                gBtn.style.borderColor = "#555";
            }
            gBtn.onclick = () => {
                activeGradeId = gKey;

                // Fix: Sync global state so it doesn't revert on re-render
                window.currentGradeId = gKey;

                // Apply visual change immediately
                applyGrade(item, gKey);

                showEditor(container, item);
            };
            gradeTabs.appendChild(gBtn);
        });
    } else {
        const noGradeMsg = document.createElement('div');
        noGradeMsg.textContent = "No grades defined. Add one below.";
        noGradeMsg.style.color = "#666";
        noGradeMsg.style.fontSize = "12px";
        noGradeMsg.style.marginBottom = "5px";
        coreSection.appendChild(noGradeMsg);
    }
    coreSection.appendChild(gradeTabs);

    // GRADE REORDERING (Only if grades exist)
    if (activeGradeId && item.grades && Object.keys(item.grades).length > 1) {
        const gradeOrderRow = document.createElement('div');
        gradeOrderRow.style.display = 'flex';
        gradeOrderRow.style.gap = '5px';
        gradeOrderRow.style.marginBottom = '10px';
        gradeOrderRow.style.justifyContent = 'flex-end'; // Align right

        const shiftLeftBtn = document.createElement('button');
        shiftLeftBtn.innerHTML = "⬅ Move Grade Left";
        shiftLeftBtn.className = 'action-btn';
        shiftLeftBtn.style.padding = "2px 8px";
        shiftLeftBtn.style.fontSize = "10px";
        shiftLeftBtn.onclick = () => {
            const keys = Object.keys(item.grades);
            const idx = keys.indexOf(activeGradeId);
            if (idx > 0) {
                // Construct new object with swapped keys
                const newGrades = {};
                // Add keys before swap target
                for (let i = 0; i < idx - 1; i++) newGrades[keys[i]] = item.grades[keys[i]];
                // Swap
                newGrades[keys[idx]] = item.grades[keys[idx]];
                newGrades[keys[idx - 1]] = item.grades[keys[idx - 1]];
                // Add remaining
                for (let i = idx + 1; i < keys.length; i++) newGrades[keys[i]] = item.grades[keys[i]];

                item.grades = newGrades;
                showToast("Grade Moved Left");
                initTemplateSystem();
                showEditor(container, item);
            }
        };

        const shiftRightBtn = document.createElement('button');
        shiftRightBtn.innerHTML = "➡ Move Grade Right";
        shiftRightBtn.className = 'action-btn';
        shiftRightBtn.style.padding = "2px 8px";
        shiftRightBtn.style.fontSize = "10px";
        shiftRightBtn.onclick = () => {
            const keys = Object.keys(item.grades);
            const idx = keys.indexOf(activeGradeId);
            if (idx < keys.length - 1) {
                // Construct new object
                const newGrades = {};
                for (let i = 0; i < idx; i++) newGrades[keys[i]] = item.grades[keys[i]];
                // Swap
                newGrades[keys[idx + 1]] = item.grades[keys[idx + 1]];
                newGrades[keys[idx]] = item.grades[keys[idx]];
                // Add remaining
                for (let i = idx + 2; i < keys.length; i++) newGrades[keys[i]] = item.grades[keys[i]];

                item.grades = newGrades;
                showToast("Grade Moved Right");
                initTemplateSystem();
                showEditor(container, item);
            }
        };

        gradeOrderRow.appendChild(shiftLeftBtn);
        gradeOrderRow.appendChild(shiftRightBtn);
        coreSection.appendChild(gradeOrderRow);
    }

    const actionsRow = document.createElement('div');
    actionsRow.style.display = 'flex';
    actionsRow.style.gap = '10px';
    actionsRow.style.marginBottom = '10px';

    const addBtn = document.createElement('button');
    addBtn.innerText = "+ Add Grade";
    addBtn.className = 'action-btn';
    addBtn.style.background = "#4CAF50";
    addBtn.onclick = () => {
        Modal.prompt("Enter ID for new grade (e.g., 'platinum', 'sr'):", "", (key) => {
            if (key) {
                if (!item.grades) item.grades = {};
                Modal.prompt(`Enter Display Label for '${key}':`, key.charAt(0).toUpperCase() + key.slice(1), (label) => {
                    const source = (activeGradeId && item.grades[activeGradeId]) ? item.grades[activeGradeId] : item;

                    item.grades[key] = {
                        label: label || key,
                        assets: { ...source.assets },
                        styles: { ...source.styles }
                    };
                    activeGradeId = key;
                    showToast(`Grade ${key} added!`);
                    initTemplateSystem();
                    showEditor(container, item);
                });
            }
        });
    };
    actionsRow.appendChild(addBtn);

    if (activeGradeId && item.grades && item.grades[activeGradeId]) {
        const renameBtn = document.createElement('button');
        renameBtn.innerText = "Rename Grade";
        renameBtn.className = 'action-btn';
        renameBtn.onclick = () => {
            Modal.prompt("New Label:", item.grades[activeGradeId].label, (newLabel) => {
                if (newLabel) {
                    item.grades[activeGradeId].label = newLabel;
                    initTemplateSystem();
                    showEditor(container, item);
                }
            });
        };
        actionsRow.appendChild(renameBtn);

        const deleteBtn = document.createElement('button');
        deleteBtn.innerText = "Delete Grade";
        deleteBtn.className = 'action-btn';
        deleteBtn.style.background = "#ff4444";
        deleteBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();

            const gradeLabel = item.grades[activeGradeId].label;
            const doDelete = () => {
                delete item.grades[activeGradeId];
                if (Object.keys(item.grades).length === 0) {
                    delete item.grades;
                    activeGradeId = null;
                } else {
                    activeGradeId = Object.keys(item.grades)[0];
                }
                showToast(`Grade '${gradeLabel}' deleted.`);
                initTemplateSystem();
                showEditor(container, item);
            };

            if (window.Modal) {
                Modal.confirm(`Are you sure you want to delete the grade '${gradeLabel}'?`, doDelete);
            } else if (confirm(`Are you sure you want to delete the grade '${gradeLabel}'?`)) {
                doDelete();
            }
        };
        actionsRow.appendChild(deleteBtn);
    }
    coreSection.appendChild(actionsRow);


    // --- GRADE CUSTOM SYMBOL ---
    if (activeGradeId && item.grades && item.grades[activeGradeId]) {
        const gradeObj = item.grades[activeGradeId];
        // Symbol input (Text or Helper for Emoji?)
        createInputWithReturn(coreSection, "Grade Symbol (Icon Text)", gradeObj.symbol || "").addEventListener('input', (e) => {
            gradeObj.symbol = e.target.value;
            // Immediate update? Symbol is used in applyGrade which updates TEXT content of .card__grade
            performActiveUpdate();
            // Also refresh selector to show symbol potentially?
            renderGradeSelector(item);
        });
    }

    // --- GROUP 2: BASE LAYER ---
    const baseSection = createCollapsibleSection(container, "2. Base Layer (Frame & Mark)");
    addAssetUploader(baseSection, "Frame Image", 'frame', 'frames');

    // Back Image is now managed per-mode in Section 6 (Back Content Mode)

    // Thumbnail Image (Gallery Preview)
    createSubHeader(baseSection, "Thumbnail (썸네일)");
    const currentThumbnail = (activeGradeId && item.grades && item.grades[activeGradeId])
        ? (item.grades[activeGradeId].thumbnail || "")
        : (item.thumbnail || "");
    createAssetUploader(baseSection, "Thumbnail Image (갤러리용)", "frames", (url) => {
        if (activeGradeId && item.grades && item.grades[activeGradeId]) {
            item.grades[activeGradeId].thumbnail = url;
        } else {
            item.thumbnail = url;
        }
        showToast("Thumbnail Updated");
    }, currentThumbnail);

    addAssetUploader(baseSection, "Back Image Mask (Black=Hide)", 'backMask', 'frames', (url, isGrade) => {
        const tStyles = isGrade ? item.grades[activeGradeId].styles : item.styles;
        tStyles['--back-mask'] = url ? `url('${url}')` : 'none';
    });

    createSubHeader(baseSection, "Back Mask Settings");
    createDropdown(baseSection, "Back Mask Blend", targetStyles['--back-mask-blend'] || 'normal',
        ['normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten', 'color-dodge', 'soft-light'],
        (val) => { targetStyles['--back-mask-blend'] = val; performActiveUpdate(); }
    );
    createColorPicker(baseSection, "Back Mask Color", targetStyles["--back-mask-color"] || "#ffffff", (val) => {
        targetStyles["--back-mask-color"] = val; performActiveUpdate();
    });
    createSimpleSlider(baseSection, "Back Mask Opacity", "--back-mask-opacity", "0");

    // Grade Icon (Moved from original spot to here, fitting well in Base/Core)
    if (activeGradeId) {
        createSubHeader(baseSection, "Grade Icon");
        const currentIcon = (item.grades && item.grades[activeGradeId]) ? item.grades[activeGradeId].icon : "";
        createAssetUploader(baseSection, "Grade Button Icon", "icons", (url) => {
            if (item.grades && item.grades[activeGradeId]) {
                item.grades[activeGradeId].icon = url;
                showToast("Icon Updated");
                // Refresh to show updated icon in Grade Selector
                showEditor(container, item);
            }
        }, currentIcon);
    }


    // --- GROUP 3: HOLOGRAM LAYER 1 ---
    const holo1Section = createCollapsibleSection(container, "3. Hologram Layer 1 (Main)");

    // Shape Mask
    addAssetUploader(holo1Section, "Hologram Shape Mask (Alpha)", 'mask', 'frames');

    // Color Map
    createSubHeader(holo1Section, "Hologram Color Map");
    const mapPresets = [

        // 0: Rainbow Standard (Converted to Calc Mode for Seamless Repeats)
        "repeating-linear-gradient(115deg, transparent 0, rgba(255, 0, 128, 0.7) calc(15% / var(--holo-repeats, 1)), rgba(0, 255, 255, 0.7) calc(20% / var(--holo-repeats, 1)), rgba(255, 215, 0, 0.7) calc(25% / var(--holo-repeats, 1)), transparent calc(35% / var(--holo-repeats, 1)), transparent calc(100% / var(--holo-repeats, 1)))",
        // 1: Diagonal Rainbow
        "repeating-linear-gradient(135deg, rgba(255,0,0,0.8) 0, rgba(255,165,0,0.8) calc(14% / var(--holo-repeats, 1)), rgba(255,255,0,0.8) calc(28% / var(--holo-repeats, 1)), rgba(0,128,0,0.8) calc(42% / var(--holo-repeats, 1)), rgba(0,0,255,0.8) calc(57% / var(--holo-repeats, 1)), rgba(75,0,130,0.8) calc(71% / var(--holo-repeats, 1)), rgba(238,130,238,0.8) calc(85% / var(--holo-repeats, 1)), rgba(255,0,0,0.8) calc(100% / var(--holo-repeats, 1)))",
        // 2: Horizontal Rainbow
        "repeating-linear-gradient(to bottom, rgba(255,0,0,0.8) 0, rgba(255,255,0,0.8) calc(8% / var(--holo-repeats, 1)), rgba(0,255,0,0.8) calc(16% / var(--holo-repeats, 1)), rgba(0,255,255,0.8) calc(25% / var(--holo-repeats, 1)), rgba(0,0,255,0.8) calc(33% / var(--holo-repeats, 1)), rgba(255,0,255,0.8) calc(41% / var(--holo-repeats, 1)), rgba(255,0,0,0.8) calc(50% / var(--holo-repeats, 1)))",
        // 3: W-Wave
        "repeating-linear-gradient(135deg, transparent 0, rgba(255,0,0,0.5) calc(10% / var(--holo-repeats, 1)), rgba(0,255,0,0.5) calc(20% / var(--holo-repeats, 1)), transparent calc(30% / var(--holo-repeats, 1))), repeating-linear-gradient(45deg, transparent 0, rgba(0,0,255,0.5) calc(10% / var(--holo-repeats, 1)), rgba(255,255,0,0.5) calc(20% / var(--holo-repeats, 1)), transparent calc(30% / var(--holo-repeats, 1)))",
        // 4: Star (Galaxy)
        "radial-gradient(white, rgba(255,255,255,0.2) 2px, transparent 3px), radial-gradient(white, rgba(255,255,255,0.15) 1px, transparent 2px), linear-gradient(115deg, #f00, #ff0, #0f0, #0ff, #00f, #f0f)",
        // 5: Conic (Manual tiling usually ok, but lets leave as is)
        "conic-gradient(from 0deg, rgba(255,0,0,0.8) 0deg 90deg, rgba(0,255,0,0.8) 90deg 180deg, rgba(0,0,255,0.8) 180deg 270deg, rgba(255,255,0,0.8) 270deg 360deg)",
        // 6: Gold (Convert to Calc?)
        "repeating-linear-gradient(45deg, #BF953F 0, #FCF6BA calc(10% / var(--holo-repeats, 1)), #B38728 calc(20% / var(--holo-repeats, 1)), #FBF5B7 calc(30% / var(--holo-repeats, 1)), #AA771C calc(40% / var(--holo-repeats, 1)), #BF953F calc(50% / var(--holo-repeats, 1)))",
        // 7: Full Conic
        "conic-gradient(from 180deg at 50% 50%, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)",
        // 8: Vertical (세로) - Rainbow vertical LINE (90deg)
        "repeating-linear-gradient(90deg, transparent 0%, rgba(255,0,0,0.7) 44%, rgba(255,165,0,0.8) 46%, rgba(255,255,0,0.8) 48%, rgba(0,255,0,0.9) 50%, rgba(0,255,255,0.8) 52%, rgba(0,0,255,0.8) 54%, rgba(128,0,255,0.7) 56%, transparent 100%)",
        // 9: Horizontal (가로) - Rainbow horizontal LINE (180deg)
        "repeating-linear-gradient(180deg, transparent 0%, rgba(255,0,0,0.7) 44%, rgba(255,165,0,0.8) 46%, rgba(255,255,0,0.8) 48%, rgba(0,255,0,0.9) 50%, rgba(0,255,255,0.8) 52%, rgba(0,0,255,0.8) 54%, rgba(128,0,255,0.7) 56%, transparent 100%)"
    ];
    const presetOptions = ["Custom", "Rainbow Standard", "Diagonal Rainbow", "Horizontal Rainbow (Dense)", "W-Wave (ZigZag)", "Star (Galaxy)", "Square (Chessboard)", "Gold", "Conic", "Vertical (세로)", "Horizontal (가로)"];
    let currentPreset = "Custom";
    const currentBg = targetStyles['--holo-gradient'];
    if (currentBg) {
        const idx = mapPresets.indexOf(currentBg);
        if (idx !== -1) currentPreset = presetOptions[idx + 1];
    }

    createDropdown(holo1Section, "Gradient Preset", currentPreset, presetOptions, (val) => {
        let grad = "";
        if (val === "Rainbow Standard") grad = mapPresets[0];
        if (val === "Diagonal Rainbow") grad = mapPresets[1];
        if (val === "Horizontal Rainbow (Dense)") grad = mapPresets[2];
        if (val === "W-Wave (ZigZag)") grad = mapPresets[3];
        if (val === "Star (Galaxy)") grad = mapPresets[4];
        if (val === "Square (Chessboard)") grad = mapPresets[5];
        if (val === "Gold") grad = mapPresets[6];
        if (val === "Conic") grad = mapPresets[7];
        if (val === "Vertical (세로)") grad = mapPresets[8];
        if (val === "Horizontal (가로)") grad = mapPresets[9];

        // Updated Indices for Calc Mode (Seamless Repeating)
        // 0: Rainbow, 1: Diag, 2: Horiz, 3: Wave, 6: Gold
        // Note: 8 (Vertical) and 9 (Horizontal) removed from calc mode to allow position movement
        const calcModeIndices = [0, 1, 2, 3, 6];
        const isCalcMode = calcModeIndices.includes(mapPresets.indexOf(grad));

        targetStyles['--holo-gradient'] = grad;
        if (isCalcMode) {
            targetStyles['--holo-scale'] = "100% 100%";
        } else if (mapPresets.indexOf(grad) === 8) {
            // Vertical (90deg): X axis movement - scale X large, Y normal
            targetStyles['--holo-scale'] = "1000% 100%";
        } else if (mapPresets.indexOf(grad) === 9) {
            // Horizontal (180deg): Y axis movement - scale Y large, X normal
            targetStyles['--holo-scale'] = "100% 1000%";
        } else {
            const r = parseFloat(targetStyles['--holo-repeats']) || 1;
            targetStyles['--holo-scale'] = (100 / r) + "%";
        }
        performActiveUpdate();
    });

    addAssetUploader(holo1Section, "Custom Map Image (Overrides Preset)", 'holoMap', 'textures', (url, isGrade) => {
        const tStyles = isGrade ? item.grades[activeGradeId].styles : item.styles;
        if (url) {
            tStyles['--holo-gradient'] = `url('${url}')`;
        } else {
            tStyles['--holo-gradient'] = mapPresets[0];
        }
        performActiveUpdate();
    });

    // Embossing
    createSubHeader(holo1Section, "Embossing (Bump Map)");
    addAssetUploader(holo1Section, "Emboss Pattern (Texture)", 'texture', 'textures', (url, isGrade) => {
        const tStyles = isGrade ? item.grades[activeGradeId].styles : item.styles;
        tStyles["--holo-mask-texture"] = url ? `url('${url}')` : 'none';
        performActiveUpdate();
    });

    // Texture Settings (Size & Repeat)
    const txRow = document.createElement('div');
    txRow.style.display = 'flex';
    txRow.style.gap = '10px';
    txRow.style.marginBottom = '10px';
    txRow.style.padding = '0 10px';

    const currentSize = targetStyles['--holo-mask-size'] || 'auto';
    createDropdown(txRow, "Texture Size", currentSize, ["auto", "cover", "100% 100%", "50%", "200%"], (val) => {
        targetStyles['--holo-mask-size'] = val;
        performActiveUpdate();
    });

    const currentRep = targetStyles['--holo-mask-repeat'] || 'repeat';
    createDropdown(txRow, "Texture Repeat", currentRep, ["repeat", "no-repeat"], (val) => {
        targetStyles['--holo-mask-repeat'] = val;
        performActiveUpdate();
    });
    holo1Section.appendChild(txRow);

    const embossRow = document.createElement('div');
    embossRow.style.padding = "0 10px 10px 10px";
    embossRow.style.display = "flex";
    embossRow.style.gap = "8px";
    embossRow.style.alignItems = "center";
    const chk = document.createElement('input');
    chk.type = "checkbox";
    chk.checked = targetStyles['--emboss-mode'] === 'true';
    chk.onchange = (e) => {
        targetStyles['--emboss-mode'] = e.target.checked ? 'true' : 'false';
        performActiveUpdate();
    };
    const lbl = document.createElement('label');
    lbl.textContent = "Enable Emboss Effect";
    lbl.style.fontSize = "12px";
    lbl.style.color = "#ccc";
    embossRow.appendChild(chk);
    embossRow.appendChild(lbl);
    holo1Section.appendChild(embossRow);

    // Hologram Adjustments
    createSubHeader(holo1Section, "Adjustments");
    createSimpleSlider(holo1Section, "Light Amount (Opacity)", "--holo-opacity", "0.6", null, 0, 1, 0.05);

    // Repeats Slider
    // Pattern Scale Slider (Replaces Repeats)
    const repeatsRow = document.createElement('div');
    repeatsRow.style.marginBottom = "10px";

    // Convert existing repeats/scale to a rough % value for the slider
    // If we were using Repeats (e.g. 2), Scale was likely 100%. 
    // Now we want Scale to be the driver. Default to 150% or read existing scale?
    // Let's parse the current scale. If it's "100% 100%", check repeats.
    let currentScaleVal = 150;
    const s = targetStyles['--holo-scale'];
    if (s && s.includes('%')) currentScaleVal = parseFloat(s);
    if (currentScaleVal < 100) currentScaleVal = 100; // Enforce Min

    const repWrapper = document.createElement('div');
    repWrapper.style.display = 'flex';
    repWrapper.style.justifyContent = 'space-between';
    const repLbl = document.createElement('label');
    repLbl.textContent = `Pattern Scale: ${currentScaleVal}%`;
    repLbl.style.fontSize = "12px";
    repLbl.style.color = "#ccc";
    const repInput = document.createElement('input');
    repInput.type = "range";
    repInput.min = 100;
    repInput.max = 400;
    repInput.step = 10;
    repInput.value = currentScaleVal;
    repInput.style.width = "60%";
    repInput.oninput = () => {
        const val = repInput.value;
        repLbl.textContent = `Pattern Scale: ${val}%`;

        // Check if current gradient is Vertical or Horizontal
        const currentGrad = targetStyles['--holo-gradient'] || '';
        const gradientIndex = mapPresets.indexOf(currentGrad);

        if (gradientIndex === 8) {
            // Vertical (90deg): X axis scale, Y stays at 100%
            targetStyles['--holo-scale'] = `${val}% 100%`;
        } else if (gradientIndex === 9) {
            // Horizontal (180deg): Y axis scale, X stays at 100%
            targetStyles['--holo-scale'] = `100% ${val}%`;
        } else {
            // Normal gradients
            targetStyles['--holo-scale'] = `${val}%`;
        }

        // Reset Density to 1 (Standard) so gradients don't compress themselves
        targetStyles['--holo-repeats'] = 1;

        performActiveUpdate();
    };
    repWrapper.appendChild(repLbl);
    repWrapper.appendChild(repInput);
    repeatsRow.appendChild(repWrapper);
    holo1Section.appendChild(repeatsRow);

    // Hologram Layer 1 Position Controls
    createSubHeader(holo1Section, "Position");

    // Position X Slider for Layer 1
    const holo1PosXVal = parseFloat(targetStyles['--holo-pos-x']) || 50;
    const posX1Row = document.createElement('div');
    posX1Row.style.marginBottom = "10px";
    const posX1Wrapper = document.createElement('div');
    posX1Wrapper.style.display = 'flex';
    posX1Wrapper.style.justifyContent = 'space-between';
    const posX1Lbl = document.createElement('label');
    posX1Lbl.textContent = `Position X: ${holo1PosXVal}%`;
    posX1Lbl.style.fontSize = "12px";
    posX1Lbl.style.color = "#ccc";
    const posX1Input = document.createElement('input');
    posX1Input.type = "range";
    posX1Input.min = 0;
    posX1Input.max = 100;
    posX1Input.step = 1;
    posX1Input.value = holo1PosXVal;
    posX1Input.style.width = "60%";
    posX1Input.oninput = () => {
        const val = posX1Input.value;
        posX1Lbl.textContent = `Position X: ${val}%`;
        targetStyles['--holo-pos-x'] = val;
        // Directly apply to .scene for immediate effect
        const sceneEl = document.querySelector('.scene');
        if (sceneEl) sceneEl.style.setProperty('--holo-pos-x', val);
        // Also directly update shine element background-position
        const shine = document.querySelector('.card__shine');
        if (shine) {
            const posY = parseFloat(targetStyles['--holo-pos-y']) || 50;
            shine.style.backgroundPosition = `${val}% ${posY}%`;
        }
    };
    posX1Wrapper.appendChild(posX1Lbl);
    posX1Wrapper.appendChild(posX1Input);
    posX1Row.appendChild(posX1Wrapper);
    holo1Section.appendChild(posX1Row);

    // Position Y Slider for Layer 1
    const holo1PosYVal = parseFloat(targetStyles['--holo-pos-y']) || 50;
    const posY1Row = document.createElement('div');
    posY1Row.style.marginBottom = "10px";
    const posY1Wrapper = document.createElement('div');
    posY1Wrapper.style.display = 'flex';
    posY1Wrapper.style.justifyContent = 'space-between';
    const posY1Lbl = document.createElement('label');
    posY1Lbl.textContent = `Position Y: ${holo1PosYVal}%`;
    posY1Lbl.style.fontSize = "12px";
    posY1Lbl.style.color = "#ccc";
    const posY1Input = document.createElement('input');
    posY1Input.type = "range";
    posY1Input.min = 0;
    posY1Input.max = 100;
    posY1Input.step = 1;
    posY1Input.value = holo1PosYVal;
    posY1Input.style.width = "60%";
    posY1Input.oninput = () => {
        const val = posY1Input.value;
        posY1Lbl.textContent = `Position Y: ${val}%`;
        targetStyles['--holo-pos-y'] = val;
        // Directly apply to .scene for immediate effect
        const sceneEl = document.querySelector('.scene');
        if (sceneEl) sceneEl.style.setProperty('--holo-pos-y', val);
        // Also directly update shine element background-position
        const shine = document.querySelector('.card__shine');
        if (shine) {
            const posX = parseFloat(targetStyles['--holo-pos-x']) || 50;
            shine.style.backgroundPosition = `${posX}% ${val}%`;
        }
    };
    posY1Wrapper.appendChild(posY1Lbl);
    posY1Wrapper.appendChild(posY1Input);
    posY1Row.appendChild(posY1Wrapper);
    holo1Section.appendChild(posY1Row);

    // Back Hologram Toggle (in Layer 1 section)
    createSubHeader(holo1Section, "Back Face Hologram");
    const backHoloRow = document.createElement('div');
    backHoloRow.style.padding = "10px";
    backHoloRow.style.display = "flex";
    backHoloRow.style.gap = "8px";
    backHoloRow.style.alignItems = "center";

    const backHoloChk = document.createElement('input');
    backHoloChk.type = "checkbox";
    backHoloChk.checked = targetStyles['--back-holo-enabled'] !== 'false';
    backHoloChk.onchange = (e) => {
        targetStyles['--back-holo-enabled'] = e.target.checked ? 'true' : 'false';
        performActiveUpdate();
    };

    const backHoloLbl = document.createElement('label');
    backHoloLbl.textContent = "Enable Back Hologram Effect";
    backHoloLbl.style.fontSize = "12px";
    backHoloLbl.style.color = "#ccc";

    backHoloRow.appendChild(backHoloChk);
    backHoloRow.appendChild(backHoloLbl);
    holo1Section.appendChild(backHoloRow);

    // --- GROUP 4: HOLOGRAM LAYER 2 ---
    const holo2Section = createCollapsibleSection(container, "4. Hologram Layer 2 (Depth)");
    createSimpleSlider(holo2Section, "Layer 2 Opacity", "--holo2-opacity", "0");
    createSimpleSlider(holo2Section, "Layer 2 Scale", "--holo2-scale", "200%", (val) => val + "%", 100, 500, 5);
    createSimpleSlider(holo2Section, "Layer 2 Position X", "--holo2-pos-x", "50", null, 0, 100, 1);
    createSimpleSlider(holo2Section, "Layer 2 Position Y", "--holo2-pos-y", "50", null, 0, 100, 1);

    createDropdown(holo2Section, "Layer 2 Blend Mode", targetStyles['--holo2-blend-mode'] || "color-dodge",
        ["color-dodge", "screen", "overlay", "soft-light", "hard-light"],
        (val) => { targetStyles['--holo2-blend-mode'] = val; performActiveUpdate(); }
    );

    let currentPreset2 = "Custom";
    const currentBg2 = targetStyles['--holo2-gradient'];
    if (currentBg2) {
        const idx = mapPresets.indexOf(currentBg2);
        if (idx !== -1) currentPreset2 = presetOptions[idx + 1];
    }
    createDropdown(holo2Section, "Layer 2 Pattern", currentPreset2, presetOptions, (val) => {
        let grad = "";
        if (val === "Rainbow Standard") grad = mapPresets[0];
        if (val === "Diagonal Rainbow") grad = mapPresets[1];
        if (val === "Horizontal Rainbow (Dense)") grad = mapPresets[2];
        if (val === "W-Wave (ZigZag)") grad = mapPresets[3];
        if (val === "Star (Galaxy)") grad = mapPresets[4];
        if (val === "Square (Chessboard)") grad = mapPresets[5];
        if (val === "Gold") grad = mapPresets[6];
        if (val === "Conic") grad = mapPresets[7];
        if (val === "Vertical (세로)") grad = mapPresets[8];
        if (val === "Horizontal (가로)") grad = mapPresets[9];

        targetStyles['--holo2-gradient'] = grad;
        performActiveUpdate();
    });

    addAssetUploader(holo2Section, "Layer 2 Custom Map", 'holo2Map', 'textures', (url, isGrade) => {
        const tStyles = isGrade ? item.grades[activeGradeId].styles : item.styles;
        tStyles['--holo2-gradient'] = url ? `url('${url}')` : 'none';
        performActiveUpdate();
    });

    addAssetUploader(holo2Section, "Layer 2 Texture (Sparkles)", 'holo2Texture', 'textures', (url, isGrade) => {
        const tStyles = isGrade ? item.grades[activeGradeId].styles : item.styles;
        tStyles['--holo2-mask-texture'] = url ? `url('${url}')` : 'linear-gradient(#fff, #fff)';
        performActiveUpdate();
    });

    addAssetUploader(holo2Section, "Layer 2 Mask (Shape)", 'holo2Mask', 'masks', (url, isGrade) => {
        const tStyles = isGrade ? item.grades[activeGradeId].styles : item.styles;
        tStyles['--holo2-mask'] = url ? `url('${url}')` : 'var(--template-mask)';
        performActiveUpdate();
    });

    // --- GROUP 5: GLOSSY COATING (Spot UV) ---
    const coatingSection = createCollapsibleSection(container, "5. Glossy Coating (Spot UV)");

    // Enable/Disable Toggle
    const isCoatingOn = parseFloat(targetStyles['--coating-opacity']) > 0;
    createToggle(coatingSection, "Enable Coating", isCoatingOn, (val) => {
        if (val) {
            // Turn On (Restore previous or set default 1)
            const prev = coatingSection.dataset.lastOpacity || "1";
            targetStyles['--coating-opacity'] = prev;
            // Update slider visual if possible (re-render)
            performActiveUpdate();
        } else {
            // Turn Off
            coatingSection.dataset.lastOpacity = targetStyles['--coating-opacity'] || "1";
            targetStyles['--coating-opacity'] = "0";
            performActiveUpdate();
        }
    });

    createSimpleSlider(coatingSection, "Intensity (Opacity)", "--coating-opacity", "0", null, 0, 1, 0.1);

    addAssetUploader(coatingSection, "Coating Mask (B/W)", 'coatingMask', 'masks', (url, isGrade) => {
        const tStyles = isGrade ? item.grades[activeGradeId].styles : item.styles;
        // Default to none if cleared
        tStyles['--coating-mask'] = url ? `url('${url}')` : 'none';
        performActiveUpdate();
    });

    // --- GROUP 6: LAYOUT ---
    const layoutSection = createCollapsibleSection(container, "6. Text Layout (Position/Color)");

    // --- SCOPE LOGIC ---
    let targetLayoutObj = item.layout;
    let scopeLabel = "Applying to: Global Template (All Levels)";
    let scopeColor = "#888";

    // Determine if we are editing a specific grade
    const currentGradeContext = window.currentGradeId;
    if (currentGradeContext && item.grades && item.grades[currentGradeContext]) {
        const gradeObj = item.grades[currentGradeContext];
        // Auto-Initialize Grade Layout if missing
        if (!gradeObj.layout) {
            gradeObj.layout = JSON.parse(JSON.stringify(item.layout));
        } else {
            // CRITICAL: Ensure Reference Isolation (Deep Check)
            // If grade layout is somehow same ref as global layout, break it.
            if (gradeObj.layout === item.layout) {
                console.warn("Fixed Shared Reference in Layout");
                gradeObj.layout = JSON.parse(JSON.stringify(item.layout));
            }
        }
        targetLayoutObj = gradeObj.layout;
        scopeLabel = `Applying to Override: ${currentGradeContext.toUpperCase()} Grade Only`;
        scopeColor = "#D4AF37";
    }

    // Ensure Back Fields Exist in Target Object
    ['backTitle', 'backBody', 'backInfo'].forEach(field => {
        if (!targetLayoutObj[field]) {
            targetLayoutObj[field] = { fontSize: "14px", color: "#ffffff", textAlign: "center", maxLength: 30 };
        }
    });

    // Visual Indicator
    const scopeBanner = document.createElement('div');
    scopeBanner.style.padding = "8px";
    scopeBanner.style.marginBottom = "10px";
    scopeBanner.style.background = "#222";
    scopeBanner.style.borderLeft = `4px solid ${scopeColor}`;
    scopeBanner.style.color = scopeColor;
    scopeBanner.style.fontSize = "12px";
    scopeBanner.style.fontWeight = "bold";
    scopeBanner.textContent = scopeLabel;
    layoutSection.appendChild(scopeBanner);

    // --- TABS: front vs back ---
    const tabContainer = document.createElement('div');
    tabContainer.style.display = "flex";
    tabContainer.style.gap = "10px";
    tabContainer.style.marginBottom = "15px";

    const contentContainer = document.createElement('div');

    const createTabBtn = (text, type) => {
        const btn = document.createElement('button');
        btn.textContent = text;
        btn.style.flex = "1";
        btn.style.padding = "8px";
        btn.style.background = "#444";
        btn.style.border = "none";
        btn.style.cursor = "pointer";
        btn.dataset.type = type;
        btn.onclick = () => renderLayoutFields(type);
        return btn;
    };

    const frontTab = createTabBtn("Front Layout", "front");
    const backTab = createTabBtn("Back Layout", "back");
    frontTab.style.background = "#3d8b40"; // Active Default

    tabContainer.appendChild(frontTab);
    tabContainer.appendChild(backTab);
    layoutSection.appendChild(tabContainer);
    layoutSection.appendChild(contentContainer);

    const layoutQuestions = {
        name: "카드 이름 (Front)",
        edition: "에디션/그룹 (Front)",
        grade: "등급/랭크 (Front)",
        label: "로고/라벨 (Back)",
        backTitle: "뒷면 제목 (Heading)",
        backBody: "뒷면 본문 (Body Text)",
        backInfo: "뒷면 하단 정보 (Info/Link)"
    };

    const frontFields = ['name', 'edition', 'grade'];
    const backFields = ['label', 'backTitle', 'backBody', 'backInfo'];

    const renderLayoutFields = (type) => {
        // Use global font options for consistency
        const fontOptions = FONT_OPTIONS;

        // Toggle Active State
        frontTab.style.background = type === 'front' ? "#3d8b40" : "#444";
        backTab.style.background = type === 'back' ? "#3d8b40" : "#444";
        contentContainer.innerHTML = ''; // Clear

        const fields = type === 'front' ? frontFields : backFields;

        // [NEW] Back Content Mode Selector (Only on Back Tab)
        // Allows template creator to define which inputs end-users see.
        if (type === 'back') {
            const modeDiv = document.createElement('div');
            modeDiv.style.marginBottom = "15px";
            modeDiv.style.padding = "10px";
            modeDiv.style.background = "#2a2a2a";
            modeDiv.style.border = "1px solid #444";
            modeDiv.style.borderRadius = "4px";

            const modeLabel = document.createElement('div');
            modeLabel.textContent = "Back Content Mode";
            modeLabel.style.fontWeight = "bold";
            modeLabel.style.color = "#D4AF37";
            modeLabel.style.marginBottom = "5px";
            modeDiv.appendChild(modeLabel);

            const modeSelect = document.createElement('select');
            modeSelect.style.width = "100%";
            modeSelect.style.padding = "5px";
            modeSelect.style.background = "#333";
            modeSelect.style.color = "white";
            modeSelect.style.border = "1px solid #555";

            const options = [
                { val: 'label', txt: 'Label Mode (Logo + Font)' },
                { val: 'text', txt: 'Text Mode (Title + Body + Info)' }
            ];

            options.forEach(opt => {
                const op = document.createElement('option');
                op.value = opt.val;
                op.textContent = opt.txt;
                if ((targetLayoutObj.backContentMode || 'label') === opt.val) {
                    op.selected = true;
                }
                modeSelect.appendChild(op);
            });

            modeSelect.onchange = () => {
                targetLayoutObj.backContentMode = modeSelect.value;
                performActiveUpdate();
                renderLayoutFields('back'); // Re-render to show correct fields
            };

            modeDiv.appendChild(modeSelect);

            // --- MODE-SPECIFIC BACK IMAGE UPLOADERS ---
            const currentMode = targetLayoutObj.backContentMode || 'label';

            const imageUploadContainer = document.createElement('div');
            imageUploadContainer.style.marginTop = "12px";
            imageUploadContainer.style.padding = "10px";
            imageUploadContainer.style.background = "#222";
            imageUploadContainer.style.borderRadius = "4px";

            // Label for the uploader
            const imageLabel = document.createElement('div');
            imageLabel.style.fontSize = "11px";
            imageLabel.style.color = "#aaa";
            imageLabel.style.marginBottom = "8px";

            if (currentMode === 'label') {
                imageLabel.textContent = "📷 Back Image for Label Mode";
            } else {
                imageLabel.textContent = "📷 Back Image for Text Mode";
            }
            imageUploadContainer.appendChild(imageLabel);

            // Current image preview
            const assetKey = currentMode === 'label' ? 'backImageLabel' : 'backImageText';
            const targetAssets = (activeGradeId && item.grades && item.grades[activeGradeId])
                ? item.grades[activeGradeId].assets
                : item.assets;
            const currentUrl = targetAssets ? targetAssets[assetKey] || "" : "";

            // Preview row
            const previewRow = document.createElement('div');
            previewRow.style.display = "flex";
            previewRow.style.alignItems = "center";
            previewRow.style.gap = "10px";
            previewRow.style.marginBottom = "8px";

            if (currentUrl) {
                const preview = document.createElement('img');
                preview.src = currentUrl;
                preview.style.width = "50px";
                preview.style.height = "70px";
                preview.style.objectFit = "cover";
                preview.style.borderRadius = "4px";
                preview.style.border = "1px solid #555";
                previewRow.appendChild(preview);

                const urlText = document.createElement('span');
                urlText.textContent = currentUrl.split('/').pop().substring(0, 20) + "...";
                urlText.style.fontSize = "10px";
                urlText.style.color = "#888";
                previewRow.appendChild(urlText);
            } else {
                const noImg = document.createElement('span');
                noImg.textContent = "No image set";
                noImg.style.fontSize = "11px";
                noImg.style.color = "#666";
                previewRow.appendChild(noImg);
            }
            imageUploadContainer.appendChild(previewRow);

            // Upload button
            const uploadBtn = document.createElement('label');
            uploadBtn.style.display = "inline-block";
            uploadBtn.style.padding = "6px 12px";
            uploadBtn.style.background = "#4a4a4a";
            uploadBtn.style.color = "#fff";
            uploadBtn.style.borderRadius = "4px";
            uploadBtn.style.cursor = "pointer";
            uploadBtn.style.fontSize = "11px";
            uploadBtn.textContent = "Choose Image";

            const fileInput = document.createElement('input');
            fileInput.type = "file";
            fileInput.accept = "image/*";
            fileInput.style.display = "none";
            fileInput.onchange = (e) => {
                const file = e.target.files[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = (evt) => {
                    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

                    if (!isLocal) {
                        // Static mode - use data URL directly
                        const target = (activeGradeId && item.grades && item.grades[activeGradeId])
                            ? item.grades[activeGradeId]
                            : item;
                        if (!target.assets) target.assets = {};
                        target.assets[assetKey] = evt.target.result;
                        performActiveUpdate();
                        renderLayoutFields('back');
                        showToast("Back Image Set (Temporary)", "info");
                        return;
                    }

                    // Server upload
                    fetch('/upload-asset', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            filename: file.name,
                            data: evt.target.result,
                            folder: 'frames'
                        })
                    })
                        .then(r => r.json())
                        .then(d => {
                            if (d.success) {
                                const target = (activeGradeId && item.grades && item.grades[activeGradeId])
                                    ? item.grades[activeGradeId]
                                    : item;
                                if (!target.assets) target.assets = {};
                                target.assets[assetKey] = d.url;
                                performActiveUpdate();
                                renderLayoutFields('back');
                                showToast("Back Image Uploaded!", "success");
                            } else {
                                showToast("Upload failed: " + d.error, "error");
                            }
                        })
                        .catch(err => {
                            console.error(err);
                            showToast("Upload error", "error");
                        });
                };
                reader.readAsDataURL(file);
            };
            uploadBtn.appendChild(fileInput);
            imageUploadContainer.appendChild(uploadBtn);

            // Delete button (if image exists)
            if (currentUrl) {
                const deleteBtn = document.createElement('button');
                deleteBtn.textContent = "✕ Remove";
                deleteBtn.style.marginLeft = "8px";
                deleteBtn.style.padding = "6px 10px";
                deleteBtn.style.background = "#600";
                deleteBtn.style.color = "#fff";
                deleteBtn.style.border = "none";
                deleteBtn.style.borderRadius = "4px";
                deleteBtn.style.cursor = "pointer";
                deleteBtn.style.fontSize = "11px";
                deleteBtn.onclick = () => {
                    const target = (activeGradeId && item.grades && item.grades[activeGradeId])
                        ? item.grades[activeGradeId]
                        : item;
                    if (target.assets) {
                        delete target.assets[assetKey];
                    }
                    performActiveUpdate();
                    renderLayoutFields('back');
                    showToast("Back Image Removed", "info");
                };
                imageUploadContainer.appendChild(deleteBtn);
            }

            modeDiv.appendChild(imageUploadContainer);
            contentContainer.appendChild(modeDiv);
        }

        // Filter fields based on Back Content Mode
        let filteredFields = fields;
        if (type === 'back') {
            const currentMode = targetLayoutObj.backContentMode || 'label';
            if (currentMode === 'label') {
                filteredFields = ['label']; // Only show label controls
            } else {
                filteredFields = ['backTitle', 'backBody', 'backInfo']; // Show text fields
            }
        }

        filteredFields.forEach(elem => {
            if (!targetLayoutObj[elem]) targetLayoutObj[elem] = {}; // Safety

            let headerText = elem.charAt(0).toUpperCase() + elem.slice(1);
            const hDiv = document.createElement('div');
            hDiv.textContent = headerText;
            hDiv.style.fontWeight = "bold";
            hDiv.style.color = "#D4AF37";
            hDiv.style.marginTop = "10px";
            contentContainer.appendChild(hDiv);

            if (layoutQuestions[elem]) {
                const sub = document.createElement('div');
                sub.textContent = layoutQuestions[elem];
                sub.style.color = "#888";
                sub.style.fontSize = "11px";
                sub.style.marginBottom = "5px";
                contentContainer.appendChild(sub);
            }

            const props = targetLayoutObj[elem];

            // Common Inputs Helper
            const addCtrl = (el) => contentContainer.appendChild(el);

            // Sample Text
            // createInputWithReturn(contentContainer, "Default Sample Text", props.sampleText || "").addEventListener('input', (e) => {
            //     props.sampleText = e.target.value;
            //     performActiveUpdate();
            // });

            // Color Picker
            createColorPicker(contentContainer, "Text Color", props.color || "#000000", (val) => {
                props.color = val;
                performActiveUpdate();
            });

            // Font Size (New Helper needed if not exists, using simple input for now or slider)
            // But we have createInput which is text. Let's use createSimpleSlider logic or text input.
            // Using createInput for explicit px value usually in this codebase
            // Font Size
            createInput(contentContainer, "Font Size (e.g. 24px)", props.fontSize || "14px", (val) => {
                props.fontSize = val;

                // CRITICAL FIX: Direct DOM Update for Instant Feedback
                // Bypass applyTemplate debounce and logic for immediate visual check
                const map = {
                    'name': '.scene .card__name',
                    'grade': '.scene .card__grade',
                    'edition': '.scene .card__edition',
                    'label': '.scene .card__label',
                    'backTitle': '.scene .card__back-title',
                    'backBody': '.scene .card__back-body',
                    'backInfo': '.scene .card__back-info'
                };
                const selector = map[elem];
                if (selector) {
                    const el = document.querySelector(selector);
                    if (el) {
                        el.style.fontSize = (typeof val === 'number' || /^\d+$/.test(val)) ? val + 'px' : val;
                        // Set Override for autoFitText
                        const numericVal = parseInt(val);
                        if (!isNaN(numericVal)) {
                            el.dataset.userFontSize = numericVal;
                        }
                    }
                }

                performActiveUpdate();
            });

            // Position (Bottom/Top/Left/Right)
            // Position (Bottom/Top/Left/Right)
            const posRow = document.createElement('div');
            // User Request: Use 1-column layout instead of 2-column grid
            posRow.style.display = 'flex';
            posRow.style.flexDirection = 'column';
            posRow.style.gap = '8px';

            ['bottom', 'top', 'left', 'right'].forEach(pos => {
                createInput(posRow, pos, props[pos] || "", (val) => {
                    if (val === "") delete props[pos];
                    else props[pos] = val;
                    performActiveUpdate();
                });
            });
            contentContainer.appendChild(posRow);


            // Max Length
            const maxLengthRow = document.createElement('div');
            maxLengthRow.style.marginBottom = "8px";
            maxLengthRow.style.display = "flex";
            maxLengthRow.style.justifyContent = "space-between";
            maxLengthRow.style.alignItems = "center";
            const maxLengthLabel = document.createElement('label');
            maxLengthLabel.textContent = `Max Length: ${props.maxLength || 20}`;
            maxLengthLabel.style.fontSize = "11px";
            maxLengthLabel.style.color = "#ccc";
            const maxLengthInput = document.createElement('input');
            maxLengthInput.type = "range";
            maxLengthInput.min = 1;
            maxLengthInput.max = 100;
            maxLengthInput.value = props.maxLength || 20;
            maxLengthInput.style.width = "50%";
            maxLengthInput.oninput = () => {
                props.maxLength = parseInt(maxLengthInput.value);
                maxLengthLabel.textContent = `Max Length: ${props.maxLength}`;
                // Live update input attribute
                const inputId = elem + (elem.startsWith('back') ? 'Input' : 'Input');
                // Wait, IDs logic involves 'Input' suffix. 
                // Front: nameInput, editionInput, gradeInput.
                // Back: labelInput, backTitleInput, backBodyInput...
                let domId = elem + 'Input';
                // if (elem === 'label') domId = 'labelInput'; // matches
                const inputEl = document.getElementById(domId);
                if (inputEl) inputEl.maxLength = props.maxLength;
                performActiveUpdate();
            };
            maxLengthRow.appendChild(maxLengthLabel);
            maxLengthRow.appendChild(maxLengthInput);
            contentContainer.appendChild(maxLengthRow);

            // Font Family
            const fontRow = document.createElement('div');
            fontRow.style.marginBottom = "8px";
            const fontLabel = document.createElement('label');
            fontLabel.textContent = "Font: ";
            fontLabel.style.fontSize = "11px";
            fontLabel.style.color = "#ccc";
            const fontSelect = document.createElement('select');
            fontSelect.style.width = "60%";
            fontSelect.style.background = "#333";
            fontSelect.style.color = "white";
            fontOptions.forEach(font => {
                const opt = document.createElement('option');
                opt.value = font;
                opt.textContent = font.split(',')[0];
                if (props.fontFamily === font) opt.selected = true;
                fontSelect.appendChild(opt);
            });
            fontSelect.onchange = () => {
                props.fontFamily = fontSelect.value;
                performActiveUpdate();
            };
            fontRow.appendChild(fontLabel);
            fontRow.appendChild(fontSelect);
            contentContainer.appendChild(fontRow);

            // Text Align
            const alignRow = document.createElement('div');
            alignRow.style.marginBottom = "8px";
            const alignLabel = document.createElement('label');
            alignLabel.textContent = "Align: ";
            alignLabel.style.fontSize = "11px";
            alignLabel.style.color = "#ccc";
            const alignSelect = document.createElement('select');
            alignSelect.style.background = "#333";
            alignSelect.style.color = "white";
            [
                { value: 'left', label: 'Left' },
                { value: 'center', label: 'Center' },
                { value: 'right', label: 'Right' },
                { value: 'justify', label: 'Justify' }
            ].forEach(opt => {
                const optEl = document.createElement('option');
                optEl.value = opt.value;
                optEl.textContent = opt.label;
                if (props.textAlign === opt.value) optEl.selected = true;
                alignSelect.appendChild(optEl);
            });
            alignSelect.onchange = () => {
                props.textAlign = alignSelect.value;
                performActiveUpdate();
            };
            alignRow.appendChild(alignLabel);
            alignRow.appendChild(alignSelect);
            contentContainer.appendChild(alignRow);
        });
    };

    // Initialize Front View
    renderLayoutFields('front');

    // --- GROUP 6: EXTRA STYLES ---
    const styleSection = createCollapsibleSection(container, "6. Extra/Global Styles");
    if (targetStyles) {
        Object.keys(targetStyles).forEach(key => {
            if (key === '--holo-bg-image' || key === '--template-frame' || key === '--template-back' || key === '--template-mask') return;
            // Filter already displayed
            if (key.includes('holo') || key.includes('back-mask') || key.includes('emboss')) return;

            if (key.includes('blend')) {
                createDropdown(styleSection, key, targetStyles[key], ['normal', 'multiply', 'screen', 'overlay', 'color-dodge', 'hard-light', 'soft-light', 'difference'], (val) => {
                    targetStyles[key] = val;
                    performActiveUpdate();
                });
            } else if (key.includes('color')) {
                createColorPicker(styleSection, key, targetStyles[key], (val) => {
                    targetStyles[key] = val;
                    performActiveUpdate();
                });
            } else {
                createInput(styleSection, key, targetStyles[key], (val) => {
                    targetStyles[key] = val;
                    performActiveUpdate();
                });
            }
        });
    }

    // --- GROUP 7: DANGER ---
    const dangerZone = createCollapsibleSection(container, "⚠ Danger Zone");
    const deleteTmplBtn = document.createElement('button');
    deleteTmplBtn.innerText = "Delete Entire Template";
    deleteTmplBtn.style.width = "100%";
    deleteTmplBtn.style.background = "#d32f2f";
    deleteTmplBtn.style.color = "white";
    deleteTmplBtn.style.border = "none";
    deleteTmplBtn.style.padding = "10px";
    deleteTmplBtn.style.borderRadius = "4px";
    deleteTmplBtn.style.cursor = "pointer";
    deleteTmplBtn.style.fontWeight = "bold";
    deleteTmplBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();

        const doDelete = () => {
            const idx = window.cardConfig.templates.indexOf(item);
            if (idx > -1) {
                window.cardConfig.templates.splice(idx, 1);
                showToast("Template Deleted");
                initTemplateSystem();
                showMainMenu(container);
            }
        };

        if (window.Modal) {
            Modal.confirm(`CRITICAL: Delete template "${item.name}"?\nThis cannot be undone.`, doDelete);
        } else if (confirm(`CRITICAL: Delete template "${item.name}"?\nThis cannot be undone.`)) {
            doDelete();
        }
    };
    dangerZone.appendChild(deleteTmplBtn);

    createButton(container, "Back to Main Menu", () => showMainMenu(container), "#666");

}

function activeUpdate() {
    applyTemplate(activeEditItem, activeGradeId);
}

// --- Components ---

function createButton(parent, text, onClick, color = "#555") {
    const btn = document.createElement('button');
    btn.textContent = text;
    btn.className = "action-btn";
    btn.style.marginBottom = "10px";
    btn.style.background = color;
    btn.onclick = onClick;
    parent.appendChild(btn);
    return btn;
}

function createInputWithReturn(parent, label, value) {
    const row = document.createElement('div');
    row.className = 'control-row';
    const lbl = document.createElement('label');
    lbl.textContent = label;
    const input = document.createElement('input');
    input.type = 'text';
    input.style.width = "100%";
    input.value = value;
    row.appendChild(lbl);
    row.appendChild(input);
    parent.appendChild(row);
    return input;
}

function createInput(parent, label, value, onChange) {
    const row = document.createElement('div');
    row.className = 'control-row';
    const lbl = document.createElement('label');
    lbl.textContent = label;
    const input = document.createElement('input');
    input.type = 'text';
    input.value = value;
    input.addEventListener('input', (e) => onChange(e.target.value));

    // Keyboard Shortcuts: Arrow Up/Down
    input.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault();
            // Regex to split number and unit
            const match = input.value.match(/^(-?\d+(\.\d+)?)(.*)$/);
            if (match) {
                let num = parseFloat(match[1]);
                const unit = match[3] || '';
                const increment = e.shiftKey ? 10 : 1;

                if (e.key === 'ArrowUp') num += increment;
                else num -= increment;

                num = Math.round(num * 100) / 100;
                input.value = num + unit;
                onChange(input.value);
            }
        }
    });

    row.appendChild(lbl);
    row.appendChild(input);
    parent.appendChild(row);
}

function createToggle(parent, label, value, onChange) {
    const row = document.createElement('div');
    row.className = 'control-row';
    row.style.display = 'flex';
    row.style.alignItems = 'center';
    row.style.gap = '10px';
    row.style.marginBottom = '10px';
    row.style.padding = '5px 10px';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = value;
    checkbox.style.width = '18px';
    checkbox.style.height = '18px';
    checkbox.style.cursor = 'pointer';

    const lbl = document.createElement('label');
    lbl.textContent = label;
    lbl.style.color = '#ccc';
    lbl.style.fontSize = '12px';
    lbl.style.cursor = 'pointer';

    checkbox.onchange = () => {
        onChange(checkbox.checked);
    };

    lbl.onclick = () => {
        checkbox.checked = !checkbox.checked;
        onChange(checkbox.checked);
    };

    row.appendChild(checkbox);
    row.appendChild(lbl);
    parent.appendChild(row);
}

function createDropdown(parent, label, value, options, onChange) {
    const row = document.createElement('div');
    row.className = 'control-row';
    const lbl = document.createElement('label');
    lbl.textContent = label;
    const select = document.createElement('select');
    options.forEach(opt => {
        const o = document.createElement('option');
        o.value = opt;
        o.textContent = opt;
        if (opt === value) o.selected = true;
        select.appendChild(o);
    });
    select.addEventListener('change', (e) => onChange(e.target.value));
    row.appendChild(lbl);
    row.appendChild(select);
    parent.appendChild(row);
}

function createColorPicker(parent, label, value, onChange) {
    const row = document.createElement('div');
    row.className = 'control-row';
    const lbl = document.createElement('label');
    lbl.textContent = label;
    const input = document.createElement('input');
    input.type = 'color';
    input.value = value;
    input.style.width = "40px";
    input.addEventListener('input', (e) => onChange(e.target.value));
    row.appendChild(lbl);
    row.appendChild(input);
    parent.appendChild(row);
}

/**
 * Helper to create file uploader with persistence and delete
 */
/**
 * Helper to create file uploader with persistence and delete
 */
function createAssetUploader(parent, label, folder, onUpload, initialValue = "", backdropUrl = null) {
    const row = document.createElement('div');
    row.className = 'control-row';
    row.style.flexDirection = "column";
    row.style.alignItems = "flex-start";
    row.style.marginBottom = "10px";
    row.style.padding = "10px";
    row.style.borderRadius = "8px";

    // Backdrop for Texture visualization
    if (backdropUrl) {
        row.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url('${backdropUrl}')`;
        row.style.backgroundSize = "cover";
        row.style.backgroundPosition = "center";
        row.style.border = "1px solid rgba(255,255,255,0.3)";
    }

    // Label & Actions Row
    const topRow = document.createElement('div');
    topRow.style.display = "flex";
    topRow.style.justifyContent = "space-between";
    topRow.style.width = "100%";
    topRow.style.marginBottom = "5px";

    const lbl = document.createElement('label');
    lbl.textContent = label;
    if (backdropUrl) lbl.style.textShadow = "0 1px 2px black"; // Ensure readability
    topRow.appendChild(lbl);

    row.appendChild(topRow);

    // Current Value Status / Preview
    const currentContainer = document.createElement('div');
    currentContainer.style.fontSize = "11px";
    currentContainer.style.color = backdropUrl ? "#fff" : "#aaa"; // Brighter if on backdrop
    if (backdropUrl) currentContainer.style.textShadow = "0 1px 2px black";
    currentContainer.style.marginBottom = "5px";
    currentContainer.style.display = "flex";
    currentContainer.style.alignItems = "center";
    currentContainer.style.gap = "10px";

    // Delete Button (Hidden if empty)
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = "✕";
    deleteBtn.title = "Remove Asset";
    deleteBtn.style.background = "#500";
    deleteBtn.style.color = "#fff";
    deleteBtn.style.border = "none";
    deleteBtn.style.borderRadius = "4px";
    deleteBtn.style.cursor = "pointer";
    deleteBtn.style.padding = "2px 6px";
    deleteBtn.style.fontSize = "10px";
    deleteBtn.style.display = "none"; // Init hidden

    const updatePreview = (val) => {
        if (val) {
            // Show filename or truncate url
            const parts = val.split('/');
            const name = parts[parts.length - 1];
            currentContainer.innerHTML = `<span>Current: <b>${name}</b></span>`;
            deleteBtn.style.display = "inline-block";
            currentContainer.appendChild(deleteBtn);
        } else {
            currentContainer.textContent = "Current: (Empty)";
            deleteBtn.style.display = "none";
        }
    };

    updatePreview(initialValue);

    // Delete Handler
    deleteBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();

        const doDelete = () => {
            onUpload(""); // Send empty string
            updatePreview("");
            input.value = ""; // Clear file input
        };

        if (window.Modal) {
            Modal.confirm("Remove this asset?", doDelete);
        } else if (confirm("Remove this asset?")) {
            doDelete();
        }
    };

    row.appendChild(currentContainer);

    // File Input
    const input = document.createElement('input');
    input.type = "file";
    input.accept = "image/*";
    row.appendChild(input);

    // Status Text
    const status = document.createElement('span');
    status.style.fontSize = "10px";
    status.style.color = backdropUrl ? "#ddd" : "#888"; // Readability
    row.appendChild(status);

    input.onchange = () => {
        if (!input.files[0]) return;
        const file = input.files[0];
        status.textContent = "Uploading...";
        status.style.color = "#888";

        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target.result;

            // Upload to Server
            fetch('/upload-asset', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    filename: file.name,
                    data: dataUrl,
                    folder: folder || 'uploads'
                })
            })
                .then(r => r.json())
                .then(d => {
                    if (d.success) {
                        status.textContent = "Saved to Server!";
                        status.style.color = "#4CAF50";
                        onUpload(d.url); // Use Server URL
                        updatePreview(d.url);
                    } else {
                        status.textContent = "Error: " + d.error;
                        status.style.color = "#f44336";
                        console.error("Upload failed:", d.error);
                    }
                })
                .catch(err => {
                    status.textContent = "Network Error";
                    status.style.color = "#f44336";
                    console.error("Upload network error:", err);
                });
        };
        reader.readAsDataURL(file);
    };
    parent.appendChild(row);
}

function createHeader(parent, text) {
    const headerRow = document.createElement('div');
    headerRow.style.display = "flex";
    headerRow.style.justifyContent = "space-between";
    headerRow.style.alignItems = "center";
    headerRow.style.marginBottom = "10px";
    headerRow.style.borderBottom = "1px solid #333";
    headerRow.style.paddingBottom = "5px";

    const h3 = document.createElement('h3');
    h3.textContent = text;
    h3.style.color = "#D4AF37";
    h3.style.margin = "0";

    const closeBtn = document.createElement('div'); // Div pretending to be button for styling safety
    closeBtn.textContent = "X";
    closeBtn.style.color = "#888";
    closeBtn.style.fontSize = "18px";
    closeBtn.style.fontWeight = "bold";
    closeBtn.style.cursor = "pointer";
    closeBtn.style.padding = "0 5px";
    closeBtn.onmouseover = () => closeBtn.style.color = "white";
    closeBtn.onmouseout = () => closeBtn.style.color = "#888";
    closeBtn.onclick = () => {
        const panel = document.getElementById('editorPanel');
        if (panel) panel.classList.add('hidden');
    };

    headerRow.appendChild(h3);
    headerRow.appendChild(closeBtn);
    parent.appendChild(headerRow);
}

function createCollapsibleSection(parent, title, isOpen = false) {
    const container = document.createElement('div');
    container.style.border = "1px solid #444";
    container.style.borderRadius = "4px";
    container.style.marginBottom = "10px";
    container.style.overflow = "hidden";

    // Header (Clickable)
    const header = document.createElement('div');
    header.style.background = "#333";
    header.style.padding = "10px";
    header.style.cursor = "pointer";
    header.style.display = "flex";
    header.style.justifyContent = "space-between";
    header.style.alignItems = "center";
    header.style.userSelect = "none";

    const titleSpan = document.createElement('span');
    titleSpan.textContent = title;
    titleSpan.style.fontWeight = "bold";
    titleSpan.style.color = "#eee";

    const icon = document.createElement('span');
    icon.textContent = isOpen ? "▼" : "▶";
    icon.style.fontSize = "12px";
    icon.style.color = "#888";

    header.appendChild(titleSpan);
    header.appendChild(icon);

    // Content Area
    const content = document.createElement('div');
    content.style.padding = "10px";
    content.style.background = "#222";
    content.style.display = isOpen ? "block" : "none";

    // Toggle Logic
    header.onclick = () => {
        const isCurrentlyOpen = content.style.display === "block";
        content.style.display = isCurrentlyOpen ? "none" : "block";
        icon.textContent = isCurrentlyOpen ? "▶" : "▼";
    };

    container.appendChild(header);
    container.appendChild(content);
    parent.appendChild(container);

    return content; // Return content area so widgets can be added there
}

function createSection(parent, title) {
    const div = document.createElement('div');
    div.className = 'editor-section';
    const h4 = document.createElement('h4');
    h4.textContent = title;
    div.appendChild(h4);
    parent.appendChild(div);
    return div;
}

function createSubHeader(parent, title) {
    const div = document.createElement('div');
    div.style.padding = "5px 0";
    div.style.fontWeight = "bold";
    div.style.color = "#D4AF37";
    div.style.fontSize = "12px";
    div.textContent = title.toUpperCase();
    parent.appendChild(div);
}

// --- RESTORED COMPATIBILITY SHIM ---
// This function was added to support Gallery -> Editor transition.
// Re-added after revert to prevent crashes.
window.startEditingSession = function (template, gradeId) {
    // [DEBUG REMOVED]
    activeEditItem = template;
    activeGradeId = gradeId;

    // Reset History for new session
    editHistory = [];
    historyIndex = -1;

    // Show Editor
    const editorOverlay = document.getElementById('templateEditorOverlay');
    const editorPanel = document.getElementById('editorPanel');

    if (editorOverlay && editorPanel) {
        editorOverlay.classList.remove('hidden');
        editorPanel.classList.add('visible');

        // Ensure Main Menu is HIDDEN and Editor is SHOWN
        const mainMenu = editorPanel.querySelector('.editor-main-menu');
        const contentArea = editorPanel.querySelector('#editorContentArea');
        if (mainMenu) mainMenu.style.display = 'none';
        if (contentArea) contentArea.style.display = 'block';

        // Render (FIXED: Calls showEditor which exists in this version)
        if (typeof showEditor === 'function') {
            showEditor(editorPanel, template);
        } else {
            console.error("showEditor function missing!");
        }
    }
};
