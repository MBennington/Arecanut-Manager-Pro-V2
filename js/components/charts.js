/**
 * Charts Component
 * Chart.js wrapper for dashboard charts
 */

export const Charts = {
    // Chart instances
    cashChart: null,
    stockChart: null,

    /**
     * Initialize or update cash flow chart
     * @param {Object} data - Chart data with dates and cash points
     */
    renderCashChart(data) {
        const { dates, cashPoints } = data;
        const ctx = document.getElementById('mainChart')?.getContext('2d');
        
        if (!ctx) return;

        // Destroy existing chart
        if (this.cashChart) {
            this.cashChart.destroy();
        }

        this.cashChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: dates,
                datasets: [{
                    label: 'Cash',
                    data: cashPoints,
                    borderColor: '#2E7D32',
                    backgroundColor: 'rgba(46, 125, 50, 0.1)',
                    fill: true,
                    tension: 0.4,
                    borderWidth: 3,
                    pointRadius: 4,
                    pointBackgroundColor: '#2E7D32',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        titleFont: { size: 14 },
                        bodyFont: { size: 13 },
                        callbacks: {
                            label: (context) => `LKR ${context.raw.toLocaleString()}`
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { 
                            maxTicksLimit: 8,
                            font: { size: 11 }
                        }
                    },
                    y: {
                        grid: { color: 'rgba(0, 0, 0, 0.05)' },
                        ticks: {
                            callback: (value) => `LKR ${value.toLocaleString()}`,
                            font: { size: 11 }
                        }
                    }
                }
            }
        });
    },

    /**
     * Initialize or update stock chart
     * @param {Object} data - Chart data with dates and stock points
     */
    renderStockChart(data) {
        const { dates, rawPoints, procPoints } = data;
        const ctx = document.getElementById('stockChart')?.getContext('2d');
        
        if (!ctx) return;

        // Destroy existing chart
        if (this.stockChart) {
            this.stockChart.destroy();
        }

        this.stockChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: dates,
                datasets: [
                    {
                        label: 'Raw Stock',
                        data: rawPoints,
                        borderColor: '#F9A825',
                        backgroundColor: 'rgba(249, 168, 37, 0.1)',
                        stepped: true,
                        fill: true,
                        borderWidth: 2
                    },
                    {
                        label: 'Kernel',
                        data: procPoints,
                        borderColor: '#00796B',
                        backgroundColor: 'rgba(0, 121, 107, 0.1)',
                        stepped: true,
                        fill: true,
                        borderWidth: 2
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            boxWidth: 12,
                            padding: 15,
                            font: { size: 12 }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        callbacks: {
                            label: (context) => `${context.dataset.label}: ${context.raw.toFixed(1)} kg`
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { 
                            maxTicksLimit: 8,
                            font: { size: 11 }
                        }
                    },
                    y: {
                        grid: { color: 'rgba(0, 0, 0, 0.05)' },
                        ticks: {
                            callback: (value) => `${value} kg`,
                            font: { size: 11 }
                        }
                    }
                }
            }
        });
    },

    /**
     * Destroy all chart instances
     */
    destroy() {
        if (this.cashChart) {
            this.cashChart.destroy();
            this.cashChart = null;
        }
        if (this.stockChart) {
            this.stockChart.destroy();
            this.stockChart = null;
        }
    }
};
