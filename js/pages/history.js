/**
 * History/Ledger Page Component
 * Transaction history and data management
 */

import { StateService } from '../services/state.js';
import { ApiService } from '../services/api.js';

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
                                    <th>Description</th>
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

                <!-- Edit Transaction Modal -->
                <div id="ledgerEditModal" class="ledger-edit-modal hidden">
                    <div class="ledger-edit-backdrop" data-close="true"></div>
                    <div class="ledger-edit-dialog">
                        <div class="ledger-edit-header">
                            <h4 id="ledgerEditTitle">Edit Transaction</h4>
                            <button type="button" class="ledger-edit-close" id="ledgerEditClose">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        <form id="ledgerEditForm" class="ledger-edit-form">
                            <div class="ledger-edit-grid">
                                <div class="form-group field-type">
                                    <label>Type</label>
                                    <input type="text" id="editType" class="form-control" readonly>
                                </div>
                                <div class="form-group field-date">
                                    <label>Date</label>
                                    <input type="date" id="editDate" name="date" class="form-control">
                                </div>
                                <div class="form-group field-qty">
                                    <label>Quantity (kg)</label>
                                    <input type="number" id="editQty" name="qty" class="form-control" step="0.1" placeholder="BUY / SELL qty">
                                </div>
                                <div class="form-group field-price">
                                    <label>Price (LKR/kg)</label>
                                    <input type="number" id="editPrice" name="price" class="form-control" step="0.01" placeholder="BUY / SELL price">
                                </div>
                                <div class="form-group field-inputQty">
                                    <label>Input (Raw kg)</label>
                                    <input type="number" id="editInputQty" name="inputQty" class="form-control" step="0.1" placeholder="PROCESS input">
                                </div>
                                <div class="form-group field-outputQty">
                                    <label>Output (Kernel kg)</label>
                                    <input type="number" id="editOutputQty" name="outputQty" class="form-control" step="0.1" placeholder="PROCESS output">
                                </div>
                                <div class="form-group field-category">
                                    <label>Category</label>
                                    <input type="text" id="editCategory" name="category" class="form-control" placeholder="Expense / Income category">
                                </div>
                                <div class="form-group field-amount">
                                    <label>Amount (LKR)</label>
                                    <input type="number" id="editAmount" name="amount" class="form-control" placeholder="Income / Expense / Loan / Adjustment">
                                </div>
                                <div class="form-group field-rawStockChange">
                                    <label>Raw Stock Δ (kg)</label>
                                    <input type="number" id="editRawDelta" name="rawStockChange" class="form-control" step="0.1" placeholder="Adjustment only">
                                </div>
                                <div class="form-group field-procStockChange">
                                    <label>Processed Stock Δ (kg)</label>
                                    <input type="number" id="editProcDelta" name="procStockChange" class="form-control" step="0.1" placeholder="Adjustment only">
                                </div>
                                <div class="form-group field-notes">
                                    <label>Notes</label>
                                    <input type="text" id="editNotes" name="notes" class="form-control" maxlength="500" placeholder="Description / buyer / reason">
                                </div>
                            </div>
                            <p class="ledger-edit-hint" id="ledgerEditHint">
                                Only fields you change will be updated. Leave others empty to keep current values.
                            </p>
                            <div class="ledger-edit-actions">
                                <button type="button" id="ledgerEditCancel" class="btn btn-secondary">Cancel</button>
                                <button type="submit" id="ledgerEditSave" class="btn btn-primary">Save Changes</button>
                            </div>
                        </form>
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

        // Edit modal elements
        this.editModal = document.getElementById('ledgerEditModal');
        this.editForm = document.getElementById('ledgerEditForm');
        this.editTitle = document.getElementById('ledgerEditTitle');
        this.editTypeInput = document.getElementById('editType');
        this.editDateInput = document.getElementById('editDate');
        this.editQtyInput = document.getElementById('editQty');
        this.editPriceInput = document.getElementById('editPrice');
        this.editInputQtyInput = document.getElementById('editInputQty');
        this.editOutputQtyInput = document.getElementById('editOutputQty');
        this.editCategoryInput = document.getElementById('editCategory');
        this.editAmountInput = document.getElementById('editAmount');
        this.editRawDeltaInput = document.getElementById('editRawDelta');
        this.editProcDeltaInput = document.getElementById('editProcDelta');
        this.editNotesInput = document.getElementById('editNotes');
        this.editHint = document.getElementById('ledgerEditHint');

        const closeBtn = document.getElementById('ledgerEditClose');
        const cancelBtn = document.getElementById('ledgerEditCancel');
        const backdrop = this.editModal?.querySelector('.ledger-edit-backdrop');

        const close = () => this.closeEditModal();

        closeBtn?.addEventListener('click', close);
        cancelBtn?.addEventListener('click', close);
        backdrop?.addEventListener('click', (e) => {
            if (e.target.getAttribute('data-close') === 'true') {
                close();
            }
        });

        this.editForm?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.submitEditForm();
        });

        // Close on Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.editModal && !this.editModal.classList.contains('hidden')) {
                this.closeEditModal();
            }
        });
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
                        <td colspan="7" class="table-empty">
                            <i class="fas fa-inbox"></i>
                            <p>No transactions yet</p>
                        </td>
                    </tr>
                `;
                return;
            }

            // Debug: Log transaction types
            const typeCounts = transactions.reduce((acc, t) => {
                acc[t.type] = (acc[t.type] || 0) + 1;
                return acc;
            }, {});
            console.log('Ledger transaction types:', typeCounts);

            tbody.innerHTML = transactions.map(t => this.renderRow(t)).join('');

            // Add edit handlers
            tbody.querySelectorAll('.edit-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const id = e.currentTarget.dataset.id;
                    await this.handleEdit(id);
                });
            });

            // Add delete handlers (desktop)
            tbody.querySelectorAll('.delete-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const id = e.currentTarget.dataset.id;
                    await this.handleDelete(id);
                });
            });

            // Add delete handlers (mobile)
            tbody.querySelectorAll('.mobile-delete-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const id = e.currentTarget.dataset.id;
                    await this.handleDelete(id);
                });
            });

            // Add description tooltip handlers (desktop)
            tbody.querySelectorAll('.description-icon').forEach(icon => {
                icon.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.showDescriptionTooltip(e.currentTarget);
                });
            });

            // Add description tooltip handlers (mobile)
            tbody.querySelectorAll('.mobile-description-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.showDescriptionTooltip(e.currentTarget);
                });
            });
        } catch (error) {
            console.error('Failed to load ledger:', error);
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="table-empty">
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
        let icon = '';
        let amountClass = '';
        let amountDisplay = '';
        const id = t._id || t.id;
        const dateObj = new Date(t.date);
        const date = dateObj.toISOString().split('T')[0];
        const dateFormatted = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const hasNotes = t.notes && t.notes.trim().length > 0;

        const typeLower = (t.type || '').toLowerCase();
        const amount = t.amount || 0;

        switch (t.type) {
            case 'BUY':
                badge = 'badge-buy';
                icon = 'fa-shopping-cart';
                details = `${t.qty} kg × ${t.price}`;
                stock = `+${t.qty} Raw`;
                cash = `<span class="text-red">${amount.toLocaleString()}</span>`;
                amountClass = 'negative';
                amountDisplay = `LKR ${Math.abs(amount).toLocaleString()}`;
                break;

            case 'SELL':
                badge = 'badge-sell';
                icon = 'fa-arrow-trend-up';
                details = `${t.qty} kg × ${t.price}`;
                stock = `−${t.qty} Ker`;
                cash = `<span class="text-green">+${amount.toLocaleString()}</span>`;
                amountClass = 'positive';
                amountDisplay = `+ LKR ${amount.toLocaleString()}`;
                break;

            case 'PROCESS':
                badge = 'badge-proc';
                icon = 'fa-cogs';
                details = `In: ${t.inputQty} kg → Out: ${t.outputQty} kg`;
                stock = `−${t.inputQty}R / +${t.outputQty}K`;
                amountClass = 'neutral';
                amountDisplay = `${t.recovery || ((t.outputQty / t.inputQty) * 100).toFixed(1)}% Recovery`;
                break;

            case 'INCOME':
                badge = 'badge-income';
                icon = 'fa-money-bill-wave';
                details = t.category || 'Income';
                cash = `<span class="text-green">+${amount.toLocaleString()}</span>`;
                amountClass = 'positive';
                amountDisplay = `+ LKR ${amount.toLocaleString()}`;
                break;

            case 'EXPENSE':
                badge = 'badge-exp';
                icon = 'fa-receipt';
                details = t.category || 'Expense';
                cash = `<span class="text-red">${amount.toLocaleString()}</span>`;
                amountClass = 'negative';
                amountDisplay = `LKR ${Math.abs(amount).toLocaleString()}`;
                break;

            case 'LOAN':
                badge = 'badge-loan';
                icon = 'fa-landmark';
                details = t.notes || (amount > 0 ? 'Loan Taken' : 'Loan Repayment');
                cash = amount > 0
                    ? `<span class="text-green">+${amount.toLocaleString()}</span>`
                    : `<span class="text-red">${amount.toLocaleString()}</span>`;
                amountClass = amount > 0 ? 'positive' : 'negative';
                amountDisplay = amount > 0 ? `+ LKR ${amount.toLocaleString()}` : `LKR ${Math.abs(amount).toLocaleString()}`;
                break;

            case 'ADJUSTMENT':
                badge = 'badge-adjust';
                icon = 'fa-sliders-h';
                details = 'Manual Adjustment';
                // Build stock description from deltas
                const rawDelta = t.rawStockChange || 0;
                const procDelta = t.procStockChange || 0;
                const stockParts = [];
                if (rawDelta) {
                    stockParts.push(`${rawDelta > 0 ? '+' : ''}${rawDelta} Raw`);
                }
                if (procDelta) {
                    stockParts.push(`${procDelta > 0 ? '+' : ''}${procDelta} Ker`);
                }
                stock = stockParts.length ? stockParts.join(' / ') : '-';

                if (amount !== 0) {
                    cash = amount > 0
                        ? `<span class="text-green">+${amount.toLocaleString()}</span>`
                        : `<span class="text-red">${amount.toLocaleString()}</span>`;
                    amountClass = amount > 0 ? 'positive' : 'negative';
                    amountDisplay = amount > 0
                        ? `+ LKR ${amount.toLocaleString()}`
                        : `LKR ${Math.abs(amount).toLocaleString()}`;
                } else {
                    amountClass = 'neutral';
                    amountDisplay = 'No cash change';
                    cash = '-';
                }
                break;

            default:
                // Handle unknown types gracefully
                console.warn('Unknown transaction type:', t.type);
                badge = 'badge-info';
                icon = 'fa-question-circle';
                details = t.category || t.type || 'Unknown';
                if (amount !== 0) {
                    cash = amount > 0
                        ? `<span class="text-green">+${amount.toLocaleString()}</span>`
                        : `<span class="text-red">${amount.toLocaleString()}</span>`;
                    amountClass = amount > 0 ? 'positive' : 'negative';
                    amountDisplay = amount > 0 ? `+ LKR ${amount.toLocaleString()}` : `LKR ${Math.abs(amount).toLocaleString()}`;
                }
                break;
        }

        // Description cell - show text when space allows, icon as fallback
        let descriptionCell = '<td class="description-cell">-</td>';
        const escapedNotes = hasNotes ? this.escapeHtml(t.notes) : '';
        if (hasNotes) {
            const truncatedNotes = t.notes.length > 50 ? t.notes.substring(0, 47) + '...' : t.notes;
            const showIcon = t.notes.length > 50;
            descriptionCell = `
                <td class="description-cell" data-row-id="${id}">
                    <span class="description-text">${this.escapeHtml(truncatedNotes)}</span>
                    <button class="description-icon ${showIcon ? 'always-visible' : ''}" data-description="${escapedNotes}" data-row-id="${id}" title="Click to view full description">
                        <i class="fas fa-info-circle"></i>
                    </button>
                </td>
            `;
        }

        // Mobile card template (hidden on desktop, shown on mobile)
        const mobileCard = `
            <div class="mobile-card">
                <div class="card-header">
                    <div class="card-type">
                        <span class="type-icon type-icon-${typeLower}">
                            <i class="fas ${icon}"></i>
                        </span>
                        <span class="type-label type-label-${typeLower}">${t.type}</span>
                    </div>
                    <div class="card-date">${dateFormatted}</div>
                </div>
                <div class="card-amount ${amountClass}">${amountDisplay}</div>
                <div class="card-divider"></div>
                <div class="card-row card-details">
                    <span>${details}</span>
                </div>
                ${stock !== '-' ? `
                <div class="card-row card-stock">
                    <span>Stock Change</span>
                    <span class="${stock.startsWith('-') || stock.startsWith('−') ? 'text-negative' : ''}">${stock}</span>
                </div>` : ''}
                <div class="card-divider"></div>
                <div class="card-actions">
                    ${hasNotes ? `
                    <button class="card-btn card-btn-info mobile-description-btn" data-description="${escapedNotes}" data-row-id="${id}">
                        <i class="fas fa-info-circle"></i> Details
                    </button>` : '<span></span>'}
                    <button class="card-btn card-btn-info mobile-edit-btn edit-btn" data-id="${id}">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="card-btn card-btn-delete mobile-delete-btn" data-id="${id}">
                        <i class="fas fa-trash-alt"></i> Delete
                    </button>
                </div>
            </div>
        `;

        return `
            <tr data-row-id="${id}" class="ledger-row ledger-row-${typeLower}">
                ${mobileCard}
                <td class="cell-date" data-label="Date">
                    ${date}<br>
                    <span class="badge ${badge}">${t.type}</span>
                </td>
                <td data-label="Type">${t.type}</td>
                <td data-label="Details">${details}</td>
                <td data-label="Stock">${stock}</td>
                <td data-label="Cash">${cash}</td>
                ${descriptionCell.replace('<td ', '<td data-label="Description" ')}
                <td data-label="Actions">
                    <button class="edit-btn" data-id="${id}" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="delete-btn" data-id="${id}" title="Delete">
                        <i class="fas fa-times"></i>
                    </button>
                </td>
            </tr>
        `;
    },

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    /**
     * Show description tooltip
     */
    showDescriptionTooltip(icon) {
        // Remove existing tooltip and highlight if any
        const existingTooltip = document.querySelector('.description-tooltip');
        if (existingTooltip) {
            const existingRowId = existingTooltip.getAttribute('data-row-id');
            if (existingRowId) {
                const existingRow = document.querySelector(`tr[data-row-id="${existingRowId}"]`);
                if (existingRow) {
                    existingRow.classList.remove('row-highlighted');
                }
            }
            existingTooltip.remove();
            // If clicking the same icon, just close it
            if (existingTooltip.getAttribute('data-icon-id') === icon.getAttribute('data-row-id')) {
                return;
            }
        }

        const description = icon.getAttribute('data-description');
        const rowId = icon.getAttribute('data-row-id');
        if (!description) return;

        // Highlight the row
        const row = document.querySelector(`tr[data-row-id="${rowId}"]`);
        if (row) {
            row.classList.add('row-highlighted');
        }

        // Create tooltip element
        const tooltip = document.createElement('div');
        tooltip.className = 'description-tooltip';
        tooltip.setAttribute('data-row-id', rowId);
        tooltip.setAttribute('data-icon-id', rowId);
        tooltip.innerHTML = `
            <div class="tooltip-header">
                <span><i class="fas fa-comment-alt"></i> Description</span>
                <button class="tooltip-close" title="Close">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="tooltip-content">
                ${description}
            </div>
        `;

        // Smart positioning to keep tooltip on screen
        const iconRect = icon.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const tooltipWidth = 350; // Approximate tooltip width
        const tooltipHeight = 150; // Approximate tooltip height
        const padding = 10;

        let top = iconRect.bottom + padding;
        let left = iconRect.left;

        // Check if tooltip goes off right edge
        if (left + tooltipWidth > viewportWidth - padding) {
            left = viewportWidth - tooltipWidth - padding;
        }

        // Check if tooltip goes off left edge
        if (left < padding) {
            left = padding;
        }

        // Check if tooltip goes off bottom edge
        if (top + tooltipHeight > viewportHeight - padding) {
            // Position above the icon instead
            top = iconRect.top - tooltipHeight - padding;
            // If still off screen, position at top of viewport
            if (top < padding) {
                top = padding;
            }
        }

        // Check if tooltip goes off top edge
        if (top < padding) {
            top = padding;
        }

        tooltip.style.position = 'fixed';
        tooltip.style.top = `${top}px`;
        tooltip.style.left = `${left}px`;
        tooltip.style.zIndex = '10000';

        document.body.appendChild(tooltip);

        // Close button handler
        const closeBtn = tooltip.querySelector('.tooltip-close');
        const removeTooltip = () => {
            if (row) {
                row.classList.remove('row-highlighted');
            }
            tooltip.remove();
            document.removeEventListener('click', handleOutsideClick);
            document.removeEventListener('scroll', handleScroll);
        };

        closeBtn.addEventListener('click', removeTooltip);

        // Close on outside click
        const handleOutsideClick = (e) => {
            if (!tooltip.contains(e.target) && e.target !== icon && !icon.contains(e.target)) {
                removeTooltip();
            }
        };

        // Close on scroll
        const handleScroll = () => {
            removeTooltip();
        };

        setTimeout(() => {
            document.addEventListener('click', handleOutsideClick);
            window.addEventListener('scroll', handleScroll, true);
        }, 100);
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
     * Handle transaction edit (async)
     */
    async handleEdit(id) {
        try {
            const response = await ApiService.getTransaction(id);
            const txn = response.data;

            if (!txn) {
                alert('Transaction not found.');
                return;
            }

            this.openEditModal({
                type: txn.type,
                date: txn.date ? txn.date.substring(0, 10) : '',
                qty: txn.qty ?? '',
                price: txn.price ?? '',
                inputQty: txn.inputQty ?? '',
                outputQty: txn.outputQty ?? '',
                amount: txn.amount ?? '',
                category: txn.category ?? '',
                notes: txn.notes ?? '',
                rawStockChange: txn.rawStockChange ?? '',
                procStockChange: txn.procStockChange ?? '',
                loanType: txn.amount > 0 ? 'TAKE' : 'REPAY'
            }, id);
        } catch (error) {
            console.error('Edit failed:', error);
            alert(`Failed to edit transaction: ${error.message}`);
        }
    },

    /**
     * Open the edit modal with pre-filled values
     */
    openEditModal(data, id) {
        this.currentEditId = id;
        if (!this.editModal) return;

        this.editTitle.textContent = `Edit ${data.type} Transaction`;
        const type = data.type || '';
        this.editTypeInput.value = type;
        this.editDateInput.value = data.date || '';
        this.editQtyInput.value = data.qty ?? '';
        this.editPriceInput.value = data.price ?? '';
        this.editInputQtyInput.value = data.inputQty ?? '';
        this.editOutputQtyInput.value = data.outputQty ?? '';
        this.editCategoryInput.value = data.category ?? '';
        this.editAmountInput.value = data.amount ?? '';
        this.editRawDeltaInput.value = data.rawStockChange ?? '';
        this.editProcDeltaInput.value = data.procStockChange ?? '';
        this.editNotesInput.value = data.notes ?? '';

        // Show only relevant fields for this type
        const allGroups = this.editForm.querySelectorAll('.form-group');
        allGroups.forEach(g => g.classList.add('hidden'));

        const baseFields = ['type', 'date', 'notes'];
        const fieldsByType = {
            BUY: ['qty', 'price'],
            SELL: ['qty', 'price'],
            PROCESS: ['inputQty', 'outputQty'],
            EXPENSE: ['category', 'amount'],
            INCOME: ['category', 'amount'],
            LOAN: ['amount'],
            ADJUSTMENT: ['rawStockChange', 'procStockChange', 'amount']
        };

        const activeFields = [...baseFields, ...(fieldsByType[type] || [])];
        activeFields.forEach(field => {
            const group = this.editForm.querySelector(`.field-${field}`);
            if (group) group.classList.remove('hidden');
        });

        // Hint text per type
        const hints = {
            BUY: 'Edit date, quantity, price or notes for this purchase.',
            SELL: 'Edit date, quantity, price or notes for this sale.',
            PROCESS: 'Edit date, input and output quantities or notes for this batch.',
            EXPENSE: 'Edit date, category, amount or notes for this expense.',
            INCOME: 'Edit date, category, amount or notes for this income.',
            LOAN: 'Edit date, amount or notes for this loan record.',
            ADJUSTMENT: 'Edit stock or cash deltas and reason for this adjustment.'
        };
        if (this.editHint) {
            this.editHint.textContent = hints[type] || 'Only relevant fields are shown for this transaction.';
        }

        this.editModal.classList.remove('hidden');
    },

    /**
     * Close the edit modal
     */
    closeEditModal() {
        if (this.editModal) {
            this.editModal.classList.add('hidden');
        }
        this.currentEditId = null;
    },

    /**
     * Submit the edit form (async)
     */
    async submitEditForm() {
        if (!this.currentEditId) return;
        const payload = {};

        const type = this.editTypeInput.value;

        const addNumberField = (field, input) => {
            const val = input.value;
            if (val !== '') {
                const num = parseFloat(val);
                if (!Number.isNaN(num)) {
                    payload[field] = num;
                }
            }
        };

        const addTextField = (field, input) => {
            const val = input.value.trim();
            if (val !== '') {
                payload[field] = val;
            }
        };

        if (this.editDateInput.value) {
            payload.date = this.editDateInput.value;
        }

        // Only consider fields that are relevant for this type
        const fieldsByType = {
            BUY: { nums: ['qty', 'price'], texts: ['notes'] },
            SELL: { nums: ['qty', 'price'], texts: ['notes'] },
            PROCESS: { nums: ['inputQty', 'outputQty'], texts: ['notes'] },
            EXPENSE: { nums: ['amount'], texts: ['category', 'notes'] },
            INCOME: { nums: ['amount'], texts: ['category', 'notes'] },
            LOAN: { nums: ['amount'], texts: ['notes'] },
            ADJUSTMENT: { nums: ['rawStockChange', 'procStockChange', 'amount'], texts: ['notes'] }
        };

        const mapFieldToInput = {
            qty: this.editQtyInput,
            price: this.editPriceInput,
            inputQty: this.editInputQtyInput,
            outputQty: this.editOutputQtyInput,
            amount: this.editAmountInput,
            rawStockChange: this.editRawDeltaInput,
            procStockChange: this.editProcDeltaInput,
            category: this.editCategoryInput,
            notes: this.editNotesInput
        };

        const config = fieldsByType[type] || { nums: [], texts: [] };

        config.nums.forEach(field => {
            const input = mapFieldToInput[field];
            if (input) addNumberField(field, input);
        });

        config.texts.forEach(field => {
            const input = mapFieldToInput[field];
            if (input) addTextField(field, input);
        });

        try {
            await ApiService.updateTransaction(this.currentEditId, payload);
            this.closeEditModal();
            await this.update();

            if (this.onDataChange) {
                this.onDataChange();
            }
        } catch (error) {
            console.error('Edit save failed:', error);
            alert(`Failed to save changes: ${error.message}`);
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
