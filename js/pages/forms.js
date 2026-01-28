/**
 * Form Pages Component
 * Buy, Process, Sell, Expense, and Loan forms
 */

import { StateService } from '../services/state.js';
import { AuthService } from '../services/auth.js';

export const FormsPage = {
    onSuccess: null,

    /**
     * Render all form views
     * @returns {string} HTML template
     */
    render() {
        return `
            <!-- Buy Stock Form -->
            <div id="buy" class="view-section">
                <div class="form-card">
                    <h2>
                        <i class="fas fa-shopping-cart" style="color: var(--primary)"></i>
                        Buy Stock
                    </h2>
                    <form id="buyForm">
                        <div class="form-group">
                            <label>Date</label>
                            <input type="date" class="form-control" name="date" required>
                        </div>
                        <div class="form-group">
                            <label>Quantity (kg)</label>
                            <input type="number" class="form-control" name="qty" step="0.1" required>
                        </div>
                        <div class="form-group">
                            <label>Price (LKR/kg)</label>
                            <input type="number" class="form-control" name="price" required>
                        </div>
                        <div class="form-group">
                            <label>Notes</label>
                            <input type="text" class="form-control" name="notes" placeholder="Seller name, etc.">
                        </div>
                        <button type="submit" class="btn btn-primary">Record Purchase</button>
                    </form>
                </div>
            </div>

            <!-- Process Form -->
            <div id="process" class="view-section">
                <div class="form-card">
                    <h2>
                        <i class="fas fa-cogs" style="color: var(--accent)"></i>
                        Processing
                    </h2>
                    <form id="processForm">
                        <div class="form-group">
                            <label>Date</label>
                            <input type="date" class="form-control" name="date" required>
                        </div>
                        <div class="form-group">
                            <label>Input (Raw kg)</label>
                            <input type="number" class="form-control" name="inputQty" id="procInput" step="0.1" required>
                            <small>Available: <span id="availRawStock">0</span> kg</small>
                        </div>
                        <div class="form-group">
                            <label>Output (Kernel kg)</label>
                            <input type="number" class="form-control" name="outputQty" id="procOutput" step="0.1" required>
                        </div>
                        <div class="form-group">
                            <label>Recovery: <span id="liveRecoveryCalc" class="live-calc">0%</span></label>
                        </div>
                        <div class="form-group">
                            <label>Batch Notes</label>
                            <input type="text" class="form-control" name="notes" placeholder="Batch details">
                        </div>
                        <button type="submit" class="btn btn-orange">Save Record</button>
                    </form>
                </div>
            </div>

            <!-- Sell Form -->
            <div id="sell" class="view-section">
                <div class="form-card">
                    <h2>
                        <i class="fas fa-hand-holding-usd" style="color: #1976D2"></i>
                        Sell Stock
                    </h2>
                    <form id="sellForm">
                        <div class="form-group">
                            <label>Date</label>
                            <input type="date" class="form-control" name="date" required>
                        </div>
                        <div class="form-group">
                            <label>Quantity (kg)</label>
                            <input type="number" class="form-control" name="qty" step="0.1" required>
                            <small>Available: <span id="availProcStock">0</span> kg</small>
                        </div>
                        <div class="form-group">
                            <label>Price (LKR/kg)</label>
                            <input type="number" class="form-control" name="price" required>
                        </div>
                        <div class="form-group">
                            <label>Buyer/Notes</label>
                            <input type="text" class="form-control" name="notes" placeholder="Buyer name, etc.">
                        </div>
                        <button type="submit" class="btn btn-blue">Record Sale</button>
                    </form>
                </div>
            </div>

            <!-- Income Form -->
            <div id="income" class="view-section">
                <div class="form-card">
                    <h2>
                        <i class="fas fa-money-bill-wave" style="color: #28a745"></i>
                        Income
                    </h2>
                    <form id="incomeForm">
                        <div class="form-group">
                            <label>Date</label>
                            <input type="date" class="form-control" name="date" required>
                        </div>
                        <div class="form-group">
                            <label>Category</label>
                            <select class="form-control" name="category" required>
                                <option value="Sale">Sale</option>
                                <option value="Service">Service</option>
                                <option value="Investment">Investment</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Amount (LKR)</label>
                            <input type="number" class="form-control" name="amount" required>
                        </div>
                        <div class="form-group">
                            <label>Description</label>
                            <input type="text" class="form-control" name="notes" placeholder="Income details">
                        </div>
                        <button type="submit" class="btn btn-success">Record Income</button>
                    </form>
                </div>
            </div>

            <!-- Expense Form -->
            <div id="expense" class="view-section">
                <div class="form-card">
                    <h2>
                        <i class="fas fa-file-invoice-dollar" style="color: var(--danger)"></i>
                        Expense
                    </h2>
                    <form id="expenseForm">
                        <div class="form-group">
                            <label>Date</label>
                            <input type="date" class="form-control" name="date" required>
                        </div>
                        <div class="form-group">
                            <label>Category</label>
                            <select class="form-control" name="category">
                                <option>Labour</option>
                                <option>Electricity</option>
                                <option>Transport</option>
                                <option>Other</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Amount (LKR)</label>
                            <input type="number" class="form-control" name="amount" required>
                        </div>
                        <div class="form-group">
                            <label>Description</label>
                            <input type="text" class="form-control" name="notes" placeholder="Expense details">
                        </div>
                        <button type="submit" class="btn btn-danger">Pay Expense</button>
                    </form>
                </div>
            </div>

            <!-- Loan Form -->
            <div id="loan" class="view-section">
                <div class="form-card">
                    <h2>
                        <i class="fas fa-university" style="color: #7B1FA2"></i>
                        Loans
                    </h2>
                    <form id="loanForm">
                        <div class="form-group">
                            <label>Date</label>
                            <input type="date" class="form-control" name="date" required>
                        </div>
                        <div class="form-group">
                            <label>Action</label>
                            <select class="form-control" name="loanType">
                                <option value="TAKE">Take Loan</option>
                                <option value="REPAY">Repay Loan</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Amount</label>
                            <input type="number" class="form-control" name="amount" required>
                        </div>
                        <div class="form-group">
                            <label>Lender</label>
                            <input type="text" class="form-control" name="notes" placeholder="Lender name">
                        </div>
                        <button type="submit" class="btn btn-purple">Save</button>
                    </form>
                </div>
            </div>

            <!-- Adjustments Form -->
            <div id="adjustments" class="view-section">
                <div class="form-card">
                    <h2>
                        <i class="fas fa-sliders-h" style="color: var(--info)"></i>
                        Adjustments
                    </h2>
                    <p style="color: var(--text-light); font-size: 0.9rem; margin-bottom: 16px;">
                        Manually correct stock and cash balances. Use positive values to increase and negative values to decrease.
                    </p>
                    <form id="adjustmentForm">
                        <div class="form-group">
                            <label>Date</label>
                            <input type="date" class="form-control" name="date" required>
                        </div>
                        <div class="form-group">
                            <label>Raw Stock Adjustment (kg)</label>
                            <input type="number" class="form-control" name="rawStockChange" step="0.1" placeholder="e.g. 5 or -5">
                        </div>
                        <div class="form-group">
                            <label>Processed Stock Adjustment (kg)</label>
                            <input type="number" class="form-control" name="procStockChange" step="0.1" placeholder="e.g. 3 or -3">
                        </div>
                        <div class="form-group">
                            <label>Cash Adjustment (LKR)</label>
                            <input type="number" class="form-control" name="amount" placeholder="e.g. 1000 or -1000">
                        </div>
                        <div class="form-group">
                            <label>Reason / Notes</label>
                            <input type="text" class="form-control" name="notes" placeholder="Reason for adjustment" maxlength="500">
                        </div>
                        <button type="submit" class="btn btn-blue">Apply Adjustment</button>
                    </form>
                </div>
            </div>
        `;
    },

    /**
     * Initialize form handlers
     * @param {Function} onSuccess - Callback after successful submission
     */
    init(onSuccess) {
        this.onSuccess = onSuccess;
        this.setupFormHandlers();
        this.setupLiveCalculation();
        this.setDefaultDates();
    },

    /**
     * Set up form submission handlers
     */
    setupFormHandlers() {
        const forms = {
            buyForm: 'BUY',
            processForm: 'PROCESS',
            sellForm: 'SELL',
            incomeForm: 'INCOME',
            expenseForm: 'EXPENSE',
            loanForm: 'LOAN',
            adjustmentForm: 'ADJUSTMENT'
        };

        Object.entries(forms).forEach(([formId, type]) => {
            const form = document.getElementById(formId);
            if (form) {
                form.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    await this.handleSubmit(e, type);
                });
            }
        });
    },

    /**
     * Handle form submission (async)
     */
    async handleSubmit(event, type) {
        const form = event.target;
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        
        // Check authentication first
        if (!AuthService.isAuthenticated()) {
            alert('Please log in to record transactions.');
            window.location.href = 'login.html';
            return;
        }
        
        // Show loading
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

        try {
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());

            // Prepare transaction data for API
            const txnData = {
                type,
                date: data.date,
                notes: data.notes || ''
            };

            // Add type-specific fields
            switch (type) {
                case 'BUY':
                    txnData.qty = parseFloat(data.qty);
                    txnData.price = parseFloat(data.price);
                    break;
                case 'PROCESS':
                    txnData.inputQty = parseFloat(data.inputQty);
                    txnData.outputQty = parseFloat(data.outputQty);
                    break;
                case 'SELL':
                    txnData.qty = parseFloat(data.qty);
                    txnData.price = parseFloat(data.price);
                    break;
                case 'INCOME':
                    txnData.category = data.category;
                    const incomeAmount = parseFloat(data.amount);
                    if (isNaN(incomeAmount) || incomeAmount <= 0) {
                        throw new Error('Please enter a valid amount greater than 0');
                    }
                    txnData.amount = incomeAmount;
                    break;
                case 'EXPENSE':
                    txnData.category = data.category;
                    txnData.amount = parseFloat(data.amount);
                    break;
                case 'LOAN':
                    txnData.amount = parseFloat(data.amount);
                    txnData.loanType = data.loanType;
                    break;

                case 'ADJUSTMENT':
                    txnData.rawStockChange = data.rawStockChange ? parseFloat(data.rawStockChange) : 0;
                    txnData.procStockChange = data.procStockChange ? parseFloat(data.procStockChange) : 0;
                    txnData.amount = data.amount ? parseFloat(data.amount) : 0;
                    break;
            }

            // Debug logging
            console.log('Submitting transaction:', txnData);

            // Save via API
            await StateService.addTransaction(txnData);

            // Reset form and show success
            form.reset();
            this.setDefaultDates();
            
            alert('Saved successfully!');

            if (this.onSuccess) {
                this.onSuccess();
            }
        } catch (error) {
            console.error('Save failed:', error);
            console.error('Error details:', error.message);
            
            // Check for authentication errors
            if (error.message.includes('authentication') || 
                error.message.includes('token') || 
                error.message.includes('Session expired') ||
                error.message.includes('401') ||
                error.message.includes('No authentication')) {
                alert('Your session has expired. Please log in again.');
                window.location.href = 'login.html';
            } else {
                // Show the actual error message
                alert(`Failed to save transaction:\n\n${error.message}`);
            }
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    },

    /**
     * Set up live recovery calculation
     */
    setupLiveCalculation() {
        const inputEl = document.getElementById('procInput');
        const outputEl = document.getElementById('procOutput');
        const calcEl = document.getElementById('liveRecoveryCalc');

        if (!inputEl || !outputEl || !calcEl) return;

        const updateCalc = () => {
            const input = parseFloat(inputEl.value) || 0;
            const output = parseFloat(outputEl.value) || 0;

            if (input > 0) {
                const recovery = ((output / input) * 100).toFixed(1);
                calcEl.textContent = `${recovery}%`;
                calcEl.classList.toggle('danger', parseFloat(recovery) < 24);
            } else {
                calcEl.textContent = '0%';
                calcEl.classList.remove('danger');
            }
        };

        inputEl.addEventListener('input', updateCalc);
        outputEl.addEventListener('input', updateCalc);
    },

    /**
     * Set default dates to today
     */
    setDefaultDates() {
        document.querySelectorAll('input[type="date"]').forEach(input => {
            input.valueAsDate = new Date();
        });
    },

    /**
     * Update available stock displays
     */
    updateAvailableStock(rawStock, procStock) {
        const rawEl = document.getElementById('availRawStock');
        const procEl = document.getElementById('availProcStock');

        if (rawEl) rawEl.textContent = (rawStock || 0).toFixed(1);
        if (procEl) procEl.textContent = (procStock || 0).toFixed(1);
    }
};
