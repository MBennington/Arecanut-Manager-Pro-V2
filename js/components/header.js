/**
 * Header Component
 * Top navigation bar with stats display
 */

export const Header = {
    /**
     * Update header statistics
     * @param {Object} stats - Stats object with cash, rawStock, procStock
     */
    updateStats(stats) {
        const { cash, rawStock, procStock } = stats;

        // Update cash display
        const cashEl = document.getElementById('cashDisplay');
        if (cashEl) {
            cashEl.textContent = `LKR ${cash.toLocaleString()}`;
            cashEl.classList.toggle('text-red', cash < 0);
        }

        // Update raw stock
        const rawEl = document.getElementById('headerRaw');
        if (rawEl) {
            rawEl.textContent = rawStock.toFixed(0);
        }

        // Update processed stock
        const procEl = document.getElementById('headerProc');
        if (procEl) {
            procEl.textContent = procStock.toFixed(0);
        }
    },

    /**
     * Set page title
     * @param {string} title - Page title to display
     */
    setTitle(title) {
        const titleEl = document.getElementById('pageTitle');
        if (titleEl) {
            titleEl.textContent = title;
        }
    }
};
