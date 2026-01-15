/**
 * Storage Service
 * Handles data persistence via Backend API with localStorage fallback
 */

import { ApiService } from './api.js';

// Check if API is available
let useApi = true;

async function checkApiAvailability() {
    try {
        await ApiService.checkHealth();
        useApi = true;
        console.log('✅ Using Backend API');
    } catch {
        useApi = false;
        console.log('⚠️ API unavailable, using localStorage');
    }
}

// Initialize on load
checkApiAvailability();

const STORAGE_KEY = 'arecaTransactions';

export const StorageService = {
    /**
     * Get all transactions
     * @returns {Promise<Array>} Array of transaction objects
     */
    async getTransactions() {
        if (useApi) {
            try {
                const response = await ApiService.getTransactions({ sort: 'date' });
                return response.data || [];
            } catch {
                return this._getFromLocalStorage();
            }
        }
        return this._getFromLocalStorage();
    },

    /**
     * Save/Create a transaction
     * @param {Object} transaction - Transaction object to add
     */
    async addTransaction(transaction) {
        if (useApi) {
            try {
                const response = await ApiService.createTransaction(transaction);
                return response.data;
            } catch (error) {
                console.error('API save failed, using localStorage:', error);
                return this._addToLocalStorage(transaction);
            }
        }
        return this._addToLocalStorage(transaction);
    },

    /**
     * Delete a transaction by ID
     * @param {string} id - Transaction ID to delete
     */
    async deleteTransaction(id) {
        if (useApi) {
            try {
                await ApiService.deleteTransaction(id);
                return true;
            } catch {
                return this._deleteFromLocalStorage(id);
            }
        }
        return this._deleteFromLocalStorage(id);
    },

    /**
     * Clear all transactions
     */
    async clearAll() {
        if (useApi) {
            try {
                await ApiService.deleteAllTransactions();
                return true;
            } catch {
                return this._clearLocalStorage();
            }
        }
        return this._clearLocalStorage();
    },

    /**
     * Check if using API
     */
    isUsingApi() {
        return useApi;
    },

    // LocalStorage fallback methods
    _getFromLocalStorage() {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch {
            return [];
        }
    },

    _addToLocalStorage(transaction) {
        const transactions = this._getFromLocalStorage();
        const newTxn = { ...transaction, id: Date.now(), _id: Date.now().toString() };
        transactions.push(newTxn);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
        return newTxn;
    },

    _deleteFromLocalStorage(id) {
        const transactions = this._getFromLocalStorage();
        const filtered = transactions.filter(t => 
            t.id !== id && t._id !== id && t._id !== id.toString()
        );
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
        return true;
    },

    _clearLocalStorage() {
        localStorage.removeItem(STORAGE_KEY);
        return true;
    }
};
