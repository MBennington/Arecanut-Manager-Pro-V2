/**
 * State Service
 * Manages application state and computed values via API
 */

import { StorageService } from './storage.js';
import { ApiService } from './api.js';

export const StateService = {
    // Cache for computed values
    _cache: null,
    _cacheTime: 0,
    _cacheTTL: 5000, // 5 second cache

    /**
     * Get all transactions
     */
    async getTransactions() {
        return StorageService.getTransactions();
    },

    /**
     * Add a new transaction
     */
    async addTransaction(transaction) {
        this._invalidateCache();
        return StorageService.addTransaction(transaction);
    },

    /**
     * Delete a transaction
     */
    async deleteTransaction(id) {
        this._invalidateCache();
        return StorageService.deleteTransaction(id);
    },

    /**
     * Clear all data
     */
    async clearAll() {
        this._invalidateCache();
        return StorageService.clearAll();
    },

    /**
     * Calculate all dashboard stats
     * Uses API when available for efficiency
     */
    async calculateStats() {
        // Check cache
        if (this._cache && (Date.now() - this._cacheTime) < this._cacheTTL) {
            return this._cache;
        }

        if (StorageService.isUsingApi()) {
            try {
                const response = await ApiService.getStats();
                this._cache = response.data;
                this._cacheTime = Date.now();
                return response.data;
            } catch (error) {
                console.error('Stats API failed:', error);
                return this._calculateStatsLocally();
            }
        }
        
        return this._calculateStatsLocally();
    },

    /**
     * Get transactions sorted for ledger display (newest first)
     */
    async getLedgerTransactions() {
        const transactions = await this.getTransactions();
        return [...transactions].sort((a, b) => 
            new Date(b.date) - new Date(a.date)
        );
    },

    /**
     * Get historical data for decision engine
     */
    async getHistoricalData(type) {
        const transactions = await this.getTransactions();
        return transactions
            .filter(t => t.type === type)
            .sort((a, b) => new Date(a.date) - new Date(b.date));
    },

    /**
     * Get market analytics for decision engine
     * Uses API when available
     */
    async getMarketAnalytics(type) {
        if (StorageService.isUsingApi()) {
            try {
                const response = await ApiService.getAnalytics(type);
                return response.data;
            } catch (error) {
                console.error('Analytics API failed:', error);
                return this._calculateAnalyticsLocally(type);
            }
        }
        
        return this._calculateAnalyticsLocally(type);
    },

    // Private helper methods
    _invalidateCache() {
        this._cache = null;
        this._cacheTime = 0;
    },

    async _calculateStatsLocally() {
        const transactions = await this.getTransactions();
        
        let cash = 0, rawStock = 0, procStock = 0;
        let totalRecovery = 0, processCount = 0;
        const chartData = {}, stockData = {};

        const sorted = [...transactions].sort((a, b) => 
            new Date(a.date) - new Date(b.date)
        );

        sorted.forEach(t => {
            if (t.amount) cash += t.amount;
            if (t.rawStockChange) rawStock += t.rawStockChange;
            if (t.procStockChange) procStock += t.procStockChange;
            
            if (t.type === 'PROCESS') {
                totalRecovery += parseFloat(t.recovery) || 0;
                processCount++;
            }

            const dateKey = new Date(t.date).toISOString().split('T')[0];
            chartData[dateKey] = cash;
            stockData[dateKey] = { raw: rawStock, proc: procStock };
        });

        const avgRecovery = processCount > 0 
            ? parseFloat((totalRecovery / processCount).toFixed(1))
            : 0;

        const chartDates = Object.keys(chartData).sort();

        return {
            cash,
            rawStock,
            procStock,
            avgRecovery,
            processCount,
            chartDates,
            cashPoints: chartDates.map(d => chartData[d]),
            rawPoints: chartDates.map(d => stockData[d].raw),
            procPoints: chartDates.map(d => stockData[d].proc)
        };
    },

    async _calculateAnalyticsLocally(type) {
        const transactions = await this.getTransactions();
        const history = transactions
            .filter(t => t.type === type)
            .sort((a, b) => new Date(a.date) - new Date(b.date));
        
        const procHistory = transactions.filter(t => t.type === 'PROCESS');

        let avgPrice = 0, slope = 0, acceleration = 0;

        if (history.length >= 2) {
            const recent = history.slice(-5);
            avgPrice = recent.reduce((sum, t) => sum + (t.price || 0), 0) / recent.length;

            const p2 = recent[recent.length - 1]?.price || 0;
            const p1 = recent[recent.length - 2]?.price || 0;
            slope = p2 - p1;

            if (recent.length >= 3) {
                const p0 = recent[recent.length - 3]?.price || 0;
                acceleration = slope - (p1 - p0);
            }
        }

        let avgRecovery = 25;
        if (procHistory.length > 0) {
            avgRecovery = procHistory.reduce((sum, t) => 
                sum + (parseFloat(t.recovery) || 0), 0
            ) / procHistory.length;
        }

        const result = { avgPrice, slope, acceleration, avgRecovery, historyCount: history.length };

        // Add type-specific averages
        if (type === 'BUY') {
            const sellTxns = transactions.filter(t => t.type === 'SELL').slice(-3);
            result.avgSellPrice = sellTxns.length > 0
                ? sellTxns.reduce((s, t) => s + (t.price || 0), 0) / sellTxns.length
                : 3000;
        }

        if (type === 'SELL') {
            const buyTxns = transactions.filter(t => t.type === 'BUY').slice(-5);
            result.avgBuyPrice = buyTxns.length > 0
                ? buyTxns.reduce((s, t) => s + (t.price || 0), 0) / buyTxns.length
                : 750;
        }

        return result;
    }
};
