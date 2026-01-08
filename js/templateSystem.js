
/**
 * Template System Logic
 * Handles loading templates and applying them to the card
 */

// State
let currentTemplateIndex = 0;
let currentGradeId = null;

function initTemplateSystem() {
    const templates = (window.cardConfig && window.cardConfig.templates) ? window.cardConfig.templates : [];

    // Bind Arrow Events
    // PIVOT: Navigation Arrows are now GLOBAL (outside container)
    const btnPrev = document.getElementById('navPrev');
    const btnNext = document.getElementById('navNext');

    if (!btnPrev || !btnNext) {
        console.warn("TemplateSystem: Navigation Arrows NOT FOUND");
    }

    if (btnPrev) btnPrev.onclick = () => navigateTemplate(-1);
    if (btnNext) btnNext.onclick = () => navigateTemplate(1);

    if (templates.length > 0) {
        // Initial Load or Refresh: Stay on current index
        selectTemplate(currentTemplateIndex);
    } else {
        updateHeaderTitle("No Templates");
    }
}

// Expose Grade State
if (typeof window.currentGradeId === 'undefined') window.currentGradeId = null;


// Simple Navigation Wrapper
function navigateTemplate(direction) {
    // Check if Editor is Open
    const panel = document.getElementById('editorPanel');
    if (panel && !panel.classList.contains('hidden')) {
        showToast("Please close the Editor before switching templates.", 'error');
        return;
    }

    const templates = (window.cardConfig && window.cardConfig.templates) ? window.cardConfig.templates : [];
    if (templates.length === 0) return;

    let newIndex = currentTemplateIndex + direction;

    // Wrap Around
    if (newIndex < 0) newIndex = templates.length - 1;
    if (newIndex >= templates.length) newIndex = 0;

    selectTemplate(newIndex);
}

// Logic to Apply Template (No Animation, Instant Switch)
function selectTemplate(index) {
    const templates = (window.cardConfig && window.cardConfig.templates) ? window.cardConfig.templates : [];
    if (!templates[index]) return;

    currentTemplateIndex = index;
    window.currentTemplateIndex = index; // CRITICAL: Expose for index.html access
    currentGradeId = null; // RESET GRADE: Always start with default grade when switching templates
    const tmpl = templates[index];

    // 1. Update Content
    applyContent(index, templates);

    // 2. Sync Header Title
    updateHeaderTitle(tmpl.name);
}

function updateHeaderTitle(text) {
    const header = document.getElementById('templateNameHeader');
    if (header) {
        header.textContent = text || "Untitled Template";
    }
}

function applyContent(index, templates) {
    const tmpl = templates[index];
    // updateCarouselSides removed - no sides
    const targetGrade = (tmpl.grades && tmpl.grades[currentGradeId]) ? currentGradeId : null;
    applyTemplate(tmpl, targetGrade);
    renderGradeSelector(tmpl);
}

// Deprecated old functions removed
function updateCarouselSides() { } // No-op
function render3SlotStructure() { }
function update3SlotContent() { }

function renderSlider() { }
function updateSliderVisuals() { }

function renderGradeSelector(tmpl) {
    const container = document.getElementById('gradeSelector');
    if (!container) return;
    container.innerHTML = '';

    if (!tmpl.grades) return;

    if (!tmpl.grades) return;

    // Dynamic Order (Defined by object keys order for now, or add an 'order' prop later if needed)
    const order = Object.keys(tmpl.grades);

    order.forEach(gKey => {
        if (!tmpl.grades[gKey]) return; // Should exist if iterating keys

        const grade = tmpl.grades[gKey];
        const btn = document.createElement('div');
        btn.className = 'grade-icon-btn';

        if (grade.icon) {
            btn.style.backgroundImage = `url('${grade.icon}')`;
        } else {
            // Fallback: Colored Circle with Letter
            const labelText = grade.symbol || (grade.label ? grade.label.charAt(0) : gKey.charAt(0));
            btn.textContent = labelText;
            btn.style.background = "#333";
            btn.style.lineHeight = "40px"; // match height
        }

        btn.onclick = () => {
            currentGradeId = gKey;
            window.currentGradeId = gKey; // SYNC EXTERNAL
            applyTemplate(tmpl, gKey); // Re-apply FULL template to reset base assets
            // Update active state
            document.querySelectorAll('.grade-icon-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // CRITICAL: Refresh Editor if open to target the new grade
            const editorPanel = document.getElementById('editorPanel');
            const editorControls = document.getElementById('editorControlsArea');
            if (editorPanel && !editorPanel.classList.contains('hidden') && typeof showEditor === 'function') {
                // Re-render Editor for the current template with new grade context
                const currentTemplate = window.cardConfig.templates[window.currentTemplateIndex];
                if (currentTemplate) {
                    showEditor(editorControls, currentTemplate);
                }
            }
        };

        container.appendChild(btn);
    });

    // Auto-hightlight default
    // We assume applyTemplate picked a default, let's find it.
    // Ideally applyTemplate returns the applied grade, but we can guess or rely on user click.
    // For now, let's just highlight the first one if currentGradeId sets null?
    // Actually applyTemplate handles logical default. We should sync UI.
}

/**
 * Applies a template to the card.
 * @param {Object} tmpl - The template object
 * @param {String} gradeId - Optional grade ID to apply immediately. Defaults to first grade if available.
 */
function applyTemplate(tmpl, gradeId = null) {
    // [DEBUG REMOVED]

    // ISOLATION FIX: Target .scene instead of global root
    const root = document.querySelector('.scene');
    if (!root) {
        console.error("Critical: .scene not found for template application");
        return;
    }

    // 0. RESET STATE (Independence Law)
    // NUCLEAR OPTION: Iterate ALL CSS variables and REMOVE them.
    // This forces fallback to style.css defaults, which is cleaner than 'initial'.

    // Protected variables (do not reset):
    const protectedVars = ['--card-width', '--card-height', '--card-radius'];

    const style = root.style;
    // Iterate backwards safely
    for (let i = style.length - 1; i >= 0; i--) {
        const prop = style[i];
        if (prop.startsWith('--') && !protectedVars.includes(prop)) {
            // Remove the property entirely so it doesn't persist as "initial"
            root.style.removeProperty(prop);
        }
    }
    // [DEBUG REMOVED]

    // Reset Numerics (Defaults that might not be in template)
    // Overwriting 'initial' with sensible defaults where needed
    root.style.setProperty('--holo-opacity', '0.6'); // Default visible for safety
    root.style.setProperty('--holo2-opacity', '0');
    root.style.setProperty('--holo-scale', '100%');
    root.style.setProperty('--holo2-scale', '200%');
    root.style.setProperty('--holo-pos-x', '50');
    root.style.setProperty('--holo-pos-y', '50');
    root.style.setProperty('--holo2-pos-x', '50');
    root.style.setProperty('--holo2-pos-y', '50');
    root.style.setProperty('--holo-repeats', '1');
    root.style.setProperty('--back-mask-opacity', '0');

    // Reset Card Art (Fix for Image Bleeding)
    // Target SCENE only (though root is already scene, we keep selectors specific)
    const cardArt = document.querySelector('.scene .card__art');
    const cardOverlay = document.querySelector('.scene .card__art-overlay');

    // CG MODIFICATION: Preserve User Image if attached to template instance
    if (tmpl.userImage) {
        // [DEBUG REMOVED]
        if (cardArt) {
            cardArt.src = tmpl.userImage;
            cardArt.classList.add('visible');
        }
        if (cardOverlay) {
            cardOverlay.src = tmpl.userImage;
            // cardOverlay.classList.add('visible'); // Optional: Overlay might depend on blend mode
        }
        // Restore Transform if available
        if (tmpl.userTransform && window.updateImageTransform) {
            // Use a small timeout to ensure the image is loaded/ready if needed, or just apply direct
            window.updateImageTransform(tmpl.userTransform);
        }
    } else {
        // Standard Reset
        if (cardArt) {
            cardArt.src = "";
            cardArt.classList.remove('visible');
        }
        if (cardOverlay) {
            cardOverlay.src = "";
            cardOverlay.classList.remove('visible');
        }
    }

    // 1. Apply Base Styles
    if (tmpl.styles) {
        Object.entries(tmpl.styles).forEach(([key, val]) => {
            root.style.setProperty(key, val);
        });
    }

    // 2. Apply Base Assets
    if (tmpl.assets) {
        const frameImg = document.querySelector('.card__frame');
        if (tmpl.assets.frame) {
            if (frameImg) {
                frameImg.src = tmpl.assets.frame;
                frameImg.style.display = 'block'; // Ensure visible
            }
            root.style.setProperty('--template-frame', `url('${tmpl.assets.frame}')`);
        } else {
            if (frameImg) {
                frameImg.src = '';
                frameImg.style.display = 'none'; // Hide broken icon
            }
            root.style.setProperty('--template-frame', 'none');
        }

        if (tmpl.assets.back) {
            root.style.setProperty('--template-back', `url('${tmpl.assets.back}')`);
        } else {
            root.style.setProperty('--template-back', 'none');
        }

        if (tmpl.assets.mask) {
            root.style.setProperty('--template-mask', `url('${tmpl.assets.mask}')`);
        } else {
            // If no mask is defined, default to fully visible (white gradient)
            // This ensures mask-composite: intersect doesn't hide everything
            root.style.setProperty('--template-mask', 'linear-gradient(#fff, #fff)');
        }
    }

    // 3. Apply Layout
    if (tmpl.layout) {
        applyLayout(tmpl.layout);
    }

    // Update Emboss State
    updateEmbossState(tmpl.styles);

    // Update Back Hologram State
    updateBackHoloState(tmpl.styles);

    // Update Grade Visibility
    updateGradeVisibility(tmpl.styles);

    // 4. Apply Grade (if requested or default exists)
    if (tmpl.grades) {
        // Default to first grade key if none specified
        const keys = Object.keys(tmpl.grades);
        const targetGrade = gradeId || keys[0];
        if (targetGrade && tmpl.grades[targetGrade]) {
            // CRITICAL: Sync global state so Editor knows which grade is active
            currentGradeId = targetGrade;
            window.currentGradeId = targetGrade;

            applyGrade(tmpl, targetGrade);
        }
    }
}

/**
 * Applies a specific grade from a template (overriding textures/colors).
 */
function applyGrade(tmpl, gradeId) {
    if (!tmpl.grades || !tmpl.grades[gradeId]) return;
    const grade = tmpl.grades[gradeId];

    // ISOLATION FIX: Target .scene
    const root = document.querySelector('.scene');
    if (!root) return;

    // [DEBUG REMOVED]

    // Override Layout (Position/Color/Size) - PER GRADE ISOLATION
    if (grade.layout) {
        applyLayout(grade.layout); // Will fully reset and overwrite base layout for this grade
    } else if (tmpl.layout) {
        // Fallback: Ensure base template layout is applied if grade has none
        // This fixes issues where switching grades might leave stale layout state
        // [DEBUG REMOVED]
        applyLayout(tmpl.layout);
    }

    // Override Styles (Accent Color, etc.)
    if (grade.styles) {
        Object.entries(grade.styles).forEach(([key, val]) => {
            // [DEBUG REMOVED] // Debug
            root.style.setProperty(key, val);
        });
        updateEmbossState(grade.styles);
        updateBackHoloState(grade.styles);
        // Merge styles for visibility check (Grade overrides Template)
        const effectiveStyles = { ...tmpl.styles, ...grade.styles };
        updateGradeVisibility(effectiveStyles);
    }

    // Override Assets (Texture, Mask)
    // Override Assets (Texture, Mask)
    if (grade.assets) {
        // Texture -> Mask Image (Luminance)
        if (typeof grade.assets.texture !== 'undefined') {
            if (grade.assets.texture) {
                root.style.setProperty('--holo-mask-texture', `url('${grade.assets.texture}')`);
            } else {
                // Explicit empty string means "Clear" (Set to visible/white default or none)
                // User wants to remove the global texture override.
                // We will set it to the "Show All" gradient.
                root.style.setProperty('--holo-mask-texture', "linear-gradient(#fff, #fff)");
            }
        }

        // Mask -> Template Mask shape
        if (typeof grade.assets.mask !== 'undefined') {
            if (grade.assets.mask) {
                root.style.setProperty('--template-mask', `url('${grade.assets.mask}')`);
            } else {
                root.style.setProperty('--template-mask', "linear-gradient(#fff, #fff)");
            }
        }

        // Back Image (Sample Card)
        if (typeof grade.assets.back !== 'undefined') {
            if (grade.assets.back) {
                root.style.setProperty('--template-back', `url('${grade.assets.back}')`);
                root.style.setProperty('--grade-texture', `url('${grade.assets.back}')`);
            } else {
                root.style.setProperty('--template-back', 'none');
                root.style.setProperty('--grade-texture', 'none');
            }
        }

        // Frame Image
        if (typeof grade.assets.frame !== 'undefined') {
            if (grade.assets.frame) {
                root.style.setProperty('--template-frame', `url('${grade.assets.frame}')`);
                const frameImg = document.querySelector('.card__frame');
                if (frameImg) frameImg.src = grade.assets.frame;
            } else {
                root.style.setProperty('--template-frame', 'none');
                const frameImg = document.querySelector('.card__frame');
                if (frameImg) frameImg.src = "";
            }
        }

        // Custom Hologram Map (Overrides Gradient)
        if (typeof grade.assets.holoMap !== 'undefined') {
            if (grade.assets.holoMap) {
                root.style.setProperty('--holo-bg-image', `url('${grade.assets.holoMap}')`);
                // We don't necessarily need to clear gradient, but let's be safe
                // root.style.setProperty('--holo-gradient', 'none'); 
            } else {
                // Remove property so fallback var(--holo-gradient) works!
                root.style.removeProperty('--holo-bg-image');
            }
        }

        // Back Image Mask
        if (typeof grade.assets.backMask !== 'undefined') {
            if (grade.assets.backMask) {
                root.style.setProperty('--back-mask', `url('${grade.assets.backMask}')`);
            } else {
                root.style.setProperty('--back-mask', 'none');
            }
        }

        // --- Back Image Special Effects ---
        const backBlurEl = document.querySelector('.scene .card__back-blur');
        if (backBlurEl) {
            // Reset
            backBlurEl.classList.remove('fx-halftone');
            root.style.setProperty('--back-filter-url', 'opacity(1)');

            const effect = (grade.styles && grade.styles['--back-effect']) ? grade.styles['--back-effect'] : 'none';

            if (effect === 'pen') {
                // Remove quotes to ensure CSS parsing
                root.style.setProperty('--back-filter-url', "url(#filter-pen)");
            } else if (effect === 'halftone') {
                backBlurEl.classList.add('fx-halftone');
            }
        }
    }

    // Update Grade Text on Card
    const gradeEl = document.querySelector('.scene .card__grade');
    if (gradeEl) {
        // Map common keys to display text? Or just use the first letter?
        // S -> S, gold -> S (or G?), silver -> A? 
        // Let's just use the first letter of the Label uppercase for now, or the key.
        // If config has label "Gold", display "G"? Or "S"? user card image had "S".
        // Let's default to first char of label.
        // Default to Symbol if set, then Label char, then ID char
        const text = grade.symbol || (grade.label ? grade.label.charAt(0).toUpperCase() : gradeId.charAt(0).toUpperCase());
        gradeEl.innerHTML = text;
    }
}

window.applyLayout = function applyLayout(layoutData) {
    // console.log('applyLayout called with:', layoutData); // DEBUG
    if (!layoutData) return;

    const map = {
        'name': '.scene .card__name',
        'grade': '.scene .card__grade',
        'edition': '.scene .card__edition',
        'label': '.scene .card__label',
        'backTitle': '.scene .card__back-title',
        'backBody': '.scene .card__back-body',
        'backInfo': '.scene .card__back-info'
    };

    // Input field mapping for maxLength
    const inputMap = {
        'name': 'nameInput',
        'grade': 'gradeInput',
        'edition': 'editionInput',
        'label': 'labelInput',
        'backTitle': 'backTitleInput',
        'backBody': 'backBodyInput',
        'backInfo': 'backInfoInput'
    };

    // Default styles to reset to (prevents bleeding between templates)
    const defaultStyles = {
        name: { bottom: '24px', left: '28px', right: '', top: '', fontSize: '26px', fontFamily: "'Teko', sans-serif", textAlign: 'left' },
        grade: { bottom: '12px', right: '27px', left: '', top: '', fontSize: '26px', fontFamily: "'Teko', sans-serif", textAlign: 'right' },
        edition: { bottom: '2px', left: '', right: '', top: '', fontSize: '9px', fontFamily: "'Teko', sans-serif", textAlign: '' },
        label: { bottom: '', left: '', right: '', top: '', fontSize: '12px', fontFamily: "'Teko', sans-serif", textAlign: '' },
        backTitle: { top: '20%', left: '50%', bottom: '', right: '', fontSize: '24px', fontFamily: "Arial, sans-serif", textAlign: 'center', color: '#ffffff' },
        backBody: { top: '40%', left: '50%', bottom: '', right: '', fontSize: '14px', fontFamily: "Arial, sans-serif", textAlign: 'center', color: '#ddd' },
        backInfo: { bottom: '15%', left: '50%', top: '', right: '', fontSize: '12px', fontFamily: "Arial, sans-serif", textAlign: 'center', color: '#aaa' }
    };

    // First: Reset all text elements to defaults
    Object.keys(map).forEach(key => {
        const el = document.querySelector(map[key]);
        if (el) {
            // 1. Clear Inline Styles
            el.style.cssText = '';

            // 2. Clear Advanced Inline Props Explicitly
            el.style.removeProperty('-webkit-text-fill-color');
            el.style.removeProperty('-webkit-text-stroke');
            el.style.removeProperty('background-image');
            el.style.removeProperty('background-clip');
            el.style.removeProperty('-webkit-background-clip');
            el.style.removeProperty('filter');
            el.style.removeProperty('mix-blend-mode');
            el.style.removeProperty('text-shadow');

            // 3. CRITICAL: Reset Classes (Prevent Ghost Classes)
            // We revert to the base class name based on the map key
            if (key === 'name') el.className = 'card__name';
            else if (key === 'grade') el.className = 'card__grade';
            else if (key === 'edition') el.className = 'card__edition';
            else if (key === 'label') el.className = 'card__label';
            else if (key === 'backTitle') el.className = 'card__back-title';
            else if (key === 'backBody') el.className = 'card__back-body';
            else if (key === 'backInfo') el.className = 'card__back-info';

            // Apply defaults
            const defaults = defaultStyles[key];
            if (defaults) {
                Object.keys(defaults).forEach(prop => {
                    if (defaults[prop]) {
                        el.style[prop] = defaults[prop];
                    }
                });
            }
        }
    });

    // Then: Apply template-specific layout (iterate over ALL map keys to prevent missing fields)
    Object.keys(map).forEach(key => {
        const selector = map[key];
        const userStyles = layoutData[key];
        const el = document.querySelector(selector);

        if (el) {
            // MERGE FIX: Combine Defaults with User Overrides
            // This ensures potential partial objects (e.g. just {color}) don't wipe out positioning defaults
            const defaults = defaultStyles[key] || {};
            const styles = { ...defaults, ...(userStyles || {}) };

            // Clear all position styles first (to ensure clean application of new merged set)
            el.style.left = '';
            el.style.right = '';
            el.style.top = '';
            el.style.bottom = '';
            el.style.width = 'auto';

            // Apply fontFamily
            if (styles.fontFamily) {
                el.style.fontFamily = styles.fontFamily;
            }

            // Apply fontSize with auto px
            if (styles.fontSize) {
                const fs = styles.fontSize;
                el.style.fontSize = (typeof fs === 'number' || /^\d+$/.test(fs)) ? fs + 'px' : fs;
            }

            // Apply color
            if (styles.color) {
                el.style.color = styles.color;
            }

            // Handle textAlign and position
            const textAlign = styles.textAlign || 'left';
            el.style.textAlign = textAlign;

            // Helper to add px if needed
            const addPx = (val) => {
                if (val === undefined || val === '') return '';
                return (typeof val === 'number' || /^\d+$/.test(val)) ? val + 'px' : val;
            };

            if (textAlign === 'center') {
                // Center: Anchor to 50% and use transform to center itself
                // This allows 'width: auto' so the box isn't huge, addressing user concern.
                el.style.width = 'auto';
                el.style.left = '50%';
                el.style.right = 'auto';
                el.style.marginLeft = '0';
                el.style.marginRight = '0';

                // Calculate Offset
                let offset = '0px';
                if (styles.left !== undefined && styles.left !== '') {
                    offset = addPx(styles.left);
                    // Positive Left = Move Right
                    el.style.transform = `translateX(calc(-50% + ${offset}))`;
                } else if (styles.right !== undefined && styles.right !== '') {
                    offset = addPx(styles.right);
                    // Positive Right = Move Left (standard CSS behavior for 'right' prop)
                    el.style.transform = `translateX(calc(-50% - ${offset}))`;
                } else {
                    el.style.transform = `translateX(-50%)`;
                }
            } else if (textAlign === 'right') {
                // Right alignment: position from right edge
                el.style.transform = 'none'; // Reset transform logic from center
                el.style.width = 'auto';
                el.style.left = 'auto';
                el.style.right = addPx(styles.right) || '28px';
            } else {
                // Left alignment (default): position from left edge
                el.style.transform = 'none'; // Reset transform logic
                el.style.width = 'auto';
                el.style.right = 'auto';
                el.style.left = addPx(styles.left) || '28px';
            }

            // Apply top/bottom regardless of alignment
            if (styles.top !== undefined && styles.top !== '') {
                el.style.top = addPx(styles.top);
                el.style.bottom = 'auto';
            }
            if (styles.bottom !== undefined && styles.bottom !== '') {
                el.style.bottom = addPx(styles.bottom);
                if (styles.top === undefined || styles.top === '') {
                    el.style.top = 'auto';
                }
            }
        }

        // Apply maxLength to input fields
        const inputId = inputMap[key];
        // Use userStyles directly for maxLength? Or merged? Merged is safer but defaults don't have maxLength?
        // Defaults in `defaultStyles` don't have maxLength currently.
        // Let's use the merged `styles` logic if we want defaults, 
        // BUT `styles` is local scope above. Let's re-merge or just use userStyles || defaultStyles.
        // Or better, just access the computed styles (but we don't have them easily accessible).
        // Let's re-access defaultStyles.
        const mergedForInput = { ...(defaultStyles[key] || {}), ...(userStyles || {}) };

        if (inputId) {
            const inputEl = document.getElementById(inputId);
            if (inputEl) {
                // Set maxLength (use template value or default to 50)
                const maxLen = mergedForInput.maxLength || 50;
                inputEl.maxLength = maxLen;

                // Truncate existing value if it exceeds maxLength
                if (inputEl.value.length > maxLen) {
                    inputEl.value = inputEl.value.substring(0, maxLen);
                    // Trigger input event to update card display
                    inputEl.dispatchEvent(new Event('input'));
                }
            }
        }
    });

    // --- APPLY SAMPLE TEXT DEFAULTS ---
    // --- APPLY SAMPLE TEXT DEFAULTS ---
    if (window.updateTextDefaults) {
        const newDefaults = {};
        if (layoutData.name && layoutData.name.sampleText) newDefaults.name = layoutData.name.sampleText;
        if (layoutData.grade && layoutData.grade.sampleText) newDefaults.grade = layoutData.grade.sampleText;
        if (layoutData.edition && layoutData.edition.sampleText) newDefaults.edition = layoutData.edition.sampleText;
        if (layoutData.label && layoutData.label.sampleText) newDefaults.label = layoutData.label.sampleText;

        // Back Defaults
        if (layoutData.backTitle && layoutData.backTitle.sampleText) newDefaults.backTitle = layoutData.backTitle.sampleText;
        if (layoutData.backBody && layoutData.backBody.sampleText) newDefaults.backBody = layoutData.backBody.sampleText;
        if (layoutData.backInfo && layoutData.backInfo.sampleText) newDefaults.backInfo = layoutData.backInfo.sampleText;

        window.updateTextDefaults(newDefaults);
    }

    // [NEW] Apply Back Content Mode (Label vs Text)
    // Defaults to 'label' if not specified
    const mode = layoutData.backContentMode || 'label';
    if (window.switchBackMode) {
        window.switchBackMode(mode);
    }
}

function updateEmbossState(styles) {
    const shine = document.querySelector('.card__shine');
    if (shine && styles) {
        if (styles['--emboss-mode'] === 'true') {
            shine.classList.add('emboss-mode');
        } else {
            shine.classList.remove('emboss-mode');
        }
    }
}

function updateBackHoloState(styles) {
    const backFace = document.querySelector('.card__back');
    if (backFace && styles) {
        if (styles['--back-holo-enabled'] === 'false') {
            backFace.classList.add('back-holo-disabled');
        } else {
            backFace.classList.remove('back-holo-disabled');
        }
    }
}

// Helper: Handle Grade Visibility (Card Text & Input Field)
function updateGradeVisibility(styles) {
    const displayVal = (styles && styles['--grade-display']) ? styles['--grade-display'] : 'block';

    // 1. Card Grade Text
    const cardGrade = document.querySelector('.scene .card__grade');
    if (cardGrade) {
        cardGrade.style.display = displayVal;
    }

    // 2. Input Field (UI)
    const gradeInput = document.getElementById('gradeInput');
    if (gradeInput && gradeInput.parentElement) {
        // Assuming input-group uses flex by default in CSS, but check standard display
        // If hidden, set none. If shown, restore to empty string (CSS default) or 'flex'
        if (displayVal === 'none') {
            gradeInput.parentElement.style.display = 'none';
        } else {
            gradeInput.parentElement.style.display = ''; // Restore CSS default
        }
    }
}
