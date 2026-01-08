/**
 * Modal System
 * Replaces native confirm() with a styled modal dialog.
 */

const Modal = {
    /**
     * Show a confirmation modal
     * @param {string} message - Question to ask
     * @param {Function} onConfirm - Callback if user clicks Yes
     * @param {Function} onCancel - Callback if user clicks No (optional)
     */
    confirm(message, onConfirm, onCancel) {
        // Remove existing logic modal if any
        const existing = document.getElementById('custom-confirm-modal');
        if (existing) document.body.removeChild(existing);

        const modal = document.createElement('div');
        modal.id = 'custom-confirm-modal';
        modal.className = 'custom-modal-overlay';

        modal.innerHTML = `
            <div class="custom-modal">
                <div class="custom-modal-content">
                    <h3>Confirm Action</h3>
                    <p>${message}</p>
                </div>
                <div class="custom-modal-actions">
                    <button id="modalCancelBtn" class="modal-btn cancel">Cancel</button>
                    <button id="modalConfirmBtn" class="modal-btn confirm">Confirm</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Animation
        requestAnimationFrame(() => modal.classList.add('visible'));

        // Event Handlers
        const close = () => {
            modal.classList.remove('visible');
            setTimeout(() => {
                if (modal.parentNode) document.body.removeChild(modal);
            }, 300);
        };

        document.getElementById('modalConfirmBtn').onclick = () => {
            if (onConfirm) onConfirm();
            close();
        };

        document.getElementById('modalCancelBtn').onclick = () => {
            if (onCancel) onCancel();
            close();
        };

        // Close on background click
        modal.onclick = (e) => {
            if (e.target === modal) {
                if (onCancel) onCancel();
                close();
            }
        };
    },

    /**
     * Show a prompt modal
     * @param {string} message - Question to ask
     * @param {string} placeholder - Default text
     * @param {Function} onConfirm - Callback(value) if user clicks Confirm
     */
    prompt(message, placeholder, onConfirm) {
        // Remove existing
        const existing = document.getElementById('custom-confirm-modal');
        if (existing) document.body.removeChild(existing);

        const modal = document.createElement('div');
        modal.id = 'custom-confirm-modal';
        modal.className = 'custom-modal-overlay';

        modal.innerHTML = `
            <div class="custom-modal">
                <div class="custom-modal-content">
                    <h3>Input Required</h3>
                    <p>${message}</p>
                    <input type="text" id="modalPromptInput" value="${placeholder || ''}" class="modal-input" />
                </div>
                <div class="custom-modal-actions">
                    <button id="modalCancelBtn" class="modal-btn cancel">Cancel</button>
                    <button id="modalConfirmBtn" class="modal-btn confirm">Confirm</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const input = document.getElementById('modalPromptInput');
        input.focus();
        input.select();

        // Animation
        requestAnimationFrame(() => modal.classList.add('visible'));

        const close = () => {
            modal.classList.remove('visible');
            setTimeout(() => {
                if (modal.parentNode) document.body.removeChild(modal);
            }, 300);
        };

        document.getElementById('modalConfirmBtn').onclick = () => {
            if (onConfirm) onConfirm(input.value);
            close();
        };

        document.getElementById('modalCancelBtn').onclick = close;

        // Enter key support
        input.onkeydown = (e) => {
            if (e.key === 'Enter') {
                if (onConfirm) onConfirm(input.value);
                close();
            }
        };

        modal.onclick = (e) => {
            if (e.target === modal) close();
        };
    }
};

window.Modal = Modal;
