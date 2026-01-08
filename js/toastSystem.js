/**
 * Toast Notification System
 * Replaces native alerts with non-blocking, styled notifications.
 */

const Toast = {
    init() {
        if (!document.getElementById('toast-container')) {
            const container = document.createElement('div');
            container.id = 'toast-container';
            document.body.appendChild(container); // Append to body, fixed position via CSS
        }
    },

    /**
     * Show a toast message
     * @param {string} message - Text to display
     * @param {string} type - 'success', 'error', 'info'
     * @param {number} duration - ms to show (default 3000)
     */
    show(message, type = 'info', duration = 3000) {
        this.init(); // Ensure container exists
        const container = document.getElementById('toast-container');

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;

        // Icon based on type
        let icon = 'ℹ️';
        if (type === 'success') icon = '✅';
        if (type === 'error') icon = '⚠️';

        toast.innerHTML = `
            <span class="toast-icon">${icon}</span>
            <span class="toast-message">${message}</span>
        `;

        container.appendChild(toast);

        // Animation Entry
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        // Auto Dismiss
        setTimeout(() => {
            toast.classList.remove('show');
            // Remove from DOM after transition
            setTimeout(() => {
                if (toast.parentNode) container.removeChild(toast);
            }, 300); // Match CSS transition duration
        }, duration);
    }
};

window.Toast = Toast;
