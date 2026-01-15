/**
 * History/Ledger Page Component
 * Transaction history and data management
 */

import { StateService } from '../services/state.js';

export const HistoryPage = {
    onDataChange: null,

    /**
     * Render the history view
     * @returns {string} HTML template
     */
    render() {
        return `
            <div id="history" class="view-section">
                <div class="card">
                    <div class="table-header">
                        <h3>Ledger</h3>
                        <button id="resetBtn" class="reset-btn">
                            <i class="fas fa-trash-alt"></i> Reset All
                        </button>
                    </div>
                    <div class="table-responsive">
                        <table id="ledgerTable">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Type</th>
                                    <th>Details</th>
                                    <th>Stock</th>
                                    <th>Cash</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody id="ledgerBody">
                                <tr>
                                    <td colspan="6" class="table-empty">
                                        <i class="fas fa-spinner fa-spin"></i>
                                        <p>Loading...</p>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Initialize event handlers
     * @param {Function} onDataChange - Callback when data changes
     */
    init(onDataChange) {
        this.onDataChange = onDataChange;
        
        const resetBtn = document.getElementById('resetBtn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.handleReset());
        }
    },

    /**
     * Update the ledger table (async)
     */
    async update() {
        const tbody = document.getElementById('ledgerBody');
        if (!tbody) return;

        try {
            const transactions = await StateService.getLedgerTransactions();

            if (!transactions || transactions.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="6" class="table-empty">
                            <i class="fas fa-inbox"></i>
                            <p>No transactions yet</p>
                        </td>
                    </tr>
                `;
                return;
            }

            tbody.innerHTML = transactions.map(t => this.renderRow(t)).join('');

            // Add delete handlers
            tbody.querySelectorAll('.delete-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const id = e.currentTarget.dataset.id;
                    await this.handleDelete(id);
                });
            });
        } catch (error) {
            console.error('Failed to load ledger:', error);
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="table-empty">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>Failed to load data</p>
                    </td>
                </tr>
            `;
        }
    },

    /**
     * Render a single table row
     */
    renderRow(t) {
        let badge = '';
        let details = '';
        let stock = '-';
        let cash = '-';
        const id = t._id || t.id;
        const date = new Date(t.date).toISOString().split('T')[0];

        switch (t.type) {
            case 'BUY':
                badge = 'badge-buy';
                details = `${t.qty}kg @ ${t.price}`;
                stock = `+${t.qty} Raw`;
                cash = `<span class="text-red">${(t.amount || 0).toLocaleString()}</span>`;
                break;

            case 'SELL':
                badge = 'badge-sell';
                details = `${t.qty}kg @ ${t.price}`;
                stock = `-${t.qty} Ker`;
                cash = `<span class="text-green">+${(t.amount || 0).toLocaleString()}</span>`;
                break;

            case 'PROCESS':
                badge = 'badge-proc';
                details = `In:${t.inputQty} / Out:${t.outputQty}`;
                stock = `-${t.inputQty}R / +${t.outputQty}K`;
                break;

            case 'EXPENSE':
                badge = 'badge-exp';
                details = t.category || 'Expense';
                cash = `<span class="text-red">${(t.amount || 0).toLocaleString()}</span>`;
                break;

            case 'LOAN':
                badge = 'badge-loan';
                details = t.notes || 'Loan';
                cash = t.amount > 0
                    ? `<span class="text-green">+${(t.amount || 0).toLocaleString()}</span>`
                    : `<span class="text-red">${(t.amount || 0).toLocaleString()}</span>`;
                break;
        }

        return `
            <tr>
                <td>
                    ${date}<br>
                    <span class="badge ${badge}">${t.type}</span>
                </td>
                <td>${t.type}</td>
                <td>${details}</td>
                <td>${stock}</td>
                <td>${cash}</td>
                <td>
                    <button class="delete-btn" data-id="${id}" title="Delete">
                        <i class="fas fa-times"></i>
                    </button>
                </td>
            </tr>
        `;
    },

    /**
     * Handle transaction deletion (async)
     */
    async handleDelete(id) {
        if (!confirm('Delete this transaction?')) return;

        try {
            await StateService.deleteTransaction(id);
            await this.update();
            
            if (this.onDataChange) {
                this.onDataChange();
            }
        } catch (error) {
            console.error('Delete failed:', error);
            alert('Failed to delete. Please try again.');
        }
    },

    /**
     * Handle data reset (async)
     */
    async handleReset() {
        if (!confirm('Reset all data? This cannot be undone.')) return;

        try {
            await StateService.clearAll();
            await this.update();
            
            if (this.onDataChange) {
                this.onDataChange();
            }
        } catch (error) {
            console.error('Reset failed:', error);
            alert('Failed to reset. Please try again.');
        }
    }
};
