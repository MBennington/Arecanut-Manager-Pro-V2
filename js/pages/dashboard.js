/**
 * Dashboard Page Component
 * Displays stats cards and charts
 */

import { StateService } from '../services/state.js';
import { Charts } from '../components/charts.js';

export const DashboardPage = {
    /**
     * Render the dashboard view
     * @returns {string} HTML template
     */
    render() {
        return `
            <div id="dashboard" class="view-section active">
                <!-- Stats Cards Grid -->
                <div class="dashboard-grid">
                    <div class="stat-card">
                        <span class="stat-label">Raw Stock</span>
                        <span class="stat-value" id="dashRawStock">0 kg</span>
                    </div>
                    <div class="stat-card orange">
                        <span class="stat-label">Processed</span>
                        <span class="stat-value" id="dashProcStock">0 kg</span>
                    </div>
                    <div class="stat-card blue">
                        <span class="stat-label">Cash</span>
                        <span class="stat-value" id="dashCash">LKR 0</span>
                    </div>
                    <div class="stat-card red">
                        <span class="stat-label">Recovery %</span>
                        <span class="stat-value" id="dashRecovery">0%</span>
                    </div>
                </div>

                <!-- Charts -->
                <div class="chart-card">
                    <h3>Cash Flow</h3>
                    <div class="chart-wrapper">
                        <canvas id="mainChart"></canvas>
                    </div>
                </div>
                
                <div class="chart-card">
                    <h3>Inventory</h3>
                    <div class="chart-wrapper">
                        <canvas id="stockChart"></canvas>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Update dashboard with latest data (async)
     */
    async update() {
        try {
            const stats = await StateService.calculateStats();

            // Update stat cards
            this.updateStatCard('dashRawStock', `${(stats.rawStock || 0).toFixed(1)} kg`);
            this.updateStatCard('dashProcStock', `${(stats.procStock || 0).toFixed(1)} kg`);
            this.updateStatCard('dashCash', `LKR ${(stats.cash || 0).toLocaleString()}`);
            
            // Update recovery with color coding
            const recoveryEl = document.getElementById('dashRecovery');
            if (recoveryEl) {
                recoveryEl.textContent = `${stats.avgRecovery || 0}%`;
                recoveryEl.style.color = (stats.avgRecovery < 24 && stats.processCount > 0) 
                    ? 'var(--danger)' 
                    : 'var(--text)';
            }

            // Update charts
            Charts.renderCashChart({
                dates: stats.chartDates || [],
                cashPoints: stats.cashPoints || []
            });

            Charts.renderStockChart({
                dates: stats.chartDates || [],
                rawPoints: stats.rawPoints || [],
                procPoints: stats.procPoints || []
            });

            return stats;
        } catch (error) {
            console.error('Dashboard update failed:', error);
            return {
                cash: 0,
                rawStock: 0,
                procStock: 0,
                avgRecovery: 0,
                processCount: 0,
                chartDates: [],
                cashPoints: [],
                rawPoints: [],
                procPoints: []
            };
        }
    },

    /**
     * Helper to update stat card value
     */
    updateStatCard(id, value) {
        const el = document.getElementById(id);
        if (el) {
            el.textContent = value;
        }
    }
};
