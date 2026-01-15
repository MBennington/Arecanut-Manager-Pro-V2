/**
 * Decision Engine Page Component
 * Smart decision analysis based on historical data
 */

import { StateService } from '../services/state.js';

export const DecisionPage = {
    /**
     * Render the decision engine view
     * @returns {string} HTML template
     */
    render() {
        return `
            <div id="decision" class="view-section">
                <div class="form-card">
                    <h2 class="decision-engine-header">
                        <i class="fas fa-brain"></i> Decision Assistant
                    </h2>
                    <p class="decision-engine-desc">
                        Uses differential analysis of your history to recommend actions.
                    </p>
                    
                    <div class="form-group" style="margin-top: 20px;">
                        <label>I want to evaluate:</label>
                        <select id="decType" class="form-control">
                            <option value="BUY">Buying Raw Stock (Karunka)</option>
                            <option value="SELL">Selling Processed Kernel</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label>Proposed Price (LKR/kg)</label>
                        <input type="number" id="decPrice" class="form-control" placeholder="e.g. 750">
                    </div>
                    
                    <div class="form-group">
                        <label>Proposed Quantity (kg)</label>
                        <input type="number" id="decQty" class="form-control" placeholder="e.g. 100">
                    </div>

                    <button id="analyzeBtn" class="btn btn-analyze">
                        <i class="fas fa-search-dollar"></i> Analyze Market Data
                    </button>

                    <!-- Analysis Result Container -->
                    <div id="decisionResult" style="display: none;"></div>
                </div>
            </div>
        `;
    },

    /**
     * Initialize event listeners
     */
    init() {
        const analyzeBtn = document.getElementById('analyzeBtn');
        const decType = document.getElementById('decType');
        
        if (analyzeBtn) {
            analyzeBtn.addEventListener('click', () => this.runAnalysis());
        }

        if (decType) {
            decType.addEventListener('change', () => this.resetResult());
        }
    },

    /**
     * Reset the result display
     */
    resetResult() {
        const resultEl = document.getElementById('decisionResult');
        if (resultEl) {
            resultEl.style.display = 'none';
        }
    },

    /**
     * Run the decision analysis (async)
     */
    async runAnalysis() {
        const type = document.getElementById('decType')?.value;
        const price = parseFloat(document.getElementById('decPrice')?.value);
        const qty = parseFloat(document.getElementById('decQty')?.value);
        const resultEl = document.getElementById('decisionResult');
        const analyzeBtn = document.getElementById('analyzeBtn');

        if (!price || !qty) {
            alert('Please enter Price and Quantity');
            return;
        }

        // Show loading state
        if (analyzeBtn) {
            analyzeBtn.disabled = true;
            analyzeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyzing...';
        }

        try {
            // Get market analytics from API
            const analytics = await StateService.getMarketAnalytics(type);
            const { slope, acceleration, avgRecovery, avgSellPrice, avgBuyPrice } = analytics;

            let verdict = '';
            let cssClass = '';
            let advice = '';
            let breakEven = 0;

            if (type === 'BUY') {
                const avgSell = avgSellPrice || 3000;
                const maxBuy = (avgSell * (avgRecovery / 100)) - 30;
                breakEven = maxBuy;

                if (price < maxBuy) {
                    if (slope < 0 && acceleration < 0) {
                        verdict = 'WAIT';
                        cssClass = 'verdict-warn';
                        advice = 'Price is good, but market is dropping fast (High Negative Momentum). You might get it cheaper tomorrow.';
                    } else {
                        verdict = 'GO AHEAD';
                        cssClass = 'verdict-good';
                        advice = 'Good price (below break-even) and market is stable.';
                    }
                } else {
                    verdict = 'STOP';
                    cssClass = 'verdict-bad';
                    advice = `Price is too high. Your estimated break-even is LKR ${maxBuy.toFixed(0)}. You will lose money.`;
                }
            } else {
                const avgBuy = avgBuyPrice || 750;
                const minSell = (avgBuy / (avgRecovery / 100)) + 50;
                breakEven = minSell;

                if (price > minSell) {
                    if (slope > 0 && acceleration > 0) {
                        verdict = 'HOLD';
                        cssClass = 'verdict-warn';
                        advice = 'Profitable price, BUT market is accelerating upwards. Keep stock for a few days to maximize profit.';
                    } else {
                        verdict = 'SELL NOW';
                        cssClass = 'verdict-good';
                        advice = 'Great price. Market momentum is slowing or stable. Cash out now.';
                    }
                } else {
                    verdict = 'STOP';
                    cssClass = 'verdict-bad';
                    advice = `Price is below your break-even of LKR ${minSell.toFixed(0)}. Only sell if you need urgent cash.`;
                }
            }

            // Build formula explanation based on type
            let formulaHTML = '';
            if (type === 'BUY') {
                const avgSell = avgSellPrice || 3000;
                formulaHTML = `
                    <div class="formula-section">
                        <h4><i class="fas fa-calculator"></i> Formula Used (Buy Analysis)</h4>
                        <div class="formula-box">
                            <div class="formula-title">Break-Even Price (Max Buy Price):</div>
                            <code class="formula">MaxBuyPrice = (AvgSellPrice × Recovery%) − Buffer</code>
                            <div class="formula-calc">
                                = (${avgSell.toLocaleString()} × ${avgRecovery.toFixed(1)}%) − 30
                            </div>
                            <div class="formula-calc result">
                                = <strong>LKR ${breakEven.toFixed(0)}</strong>
                            </div>
                        </div>
                        <div class="formula-box">
                            <div class="formula-title">Market Momentum Analysis:</div>
                            <code class="formula">Slope = P<sub>current</sub> − P<sub>previous</sub></code>
                            <code class="formula">Acceleration = Slope<sub>current</sub> − Slope<sub>previous</sub></code>
                            <div class="formula-calc">
                                Slope = ${slope.toFixed(1)} (${slope < 0 ? 'Prices falling ↓' : slope > 0 ? 'Prices rising ↑' : 'Stable →'})
                            </div>
                            <div class="formula-calc">
                                Accel = ${acceleration.toFixed(2)} (${acceleration < 0 ? 'Slowing down' : acceleration > 0 ? 'Speeding up' : 'Constant'})
                            </div>
                        </div>
                        <div class="formula-logic">
                            <div class="formula-title">Decision Logic:</div>
                            <ul>
                                <li>If <strong>Price < MaxBuyPrice</strong> AND market stable → <span class="text-green">GO AHEAD</span></li>
                                <li>If <strong>Price < MaxBuyPrice</strong> BUT slope & accel negative → <span class="text-orange">WAIT</span></li>
                                <li>If <strong>Price ≥ MaxBuyPrice</strong> → <span class="text-red">STOP</span></li>
                            </ul>
                        </div>
                    </div>
                `;
            } else {
                const avgBuy = avgBuyPrice || 750;
                formulaHTML = `
                    <div class="formula-section">
                        <h4><i class="fas fa-calculator"></i> Formula Used (Sell Analysis)</h4>
                        <div class="formula-box">
                            <div class="formula-title">Break-Even Price (Min Sell Price):</div>
                            <code class="formula">MinSellPrice = (AvgBuyPrice ÷ Recovery%) + Buffer</code>
                            <div class="formula-calc">
                                = (${avgBuy.toLocaleString()} ÷ ${avgRecovery.toFixed(1)}%) + 50
                            </div>
                            <div class="formula-calc result">
                                = <strong>LKR ${breakEven.toFixed(0)}</strong>
                            </div>
                        </div>
                        <div class="formula-box">
                            <div class="formula-title">Market Momentum Analysis:</div>
                            <code class="formula">Slope = P<sub>current</sub> − P<sub>previous</sub></code>
                            <code class="formula">Acceleration = Slope<sub>current</sub> − Slope<sub>previous</sub></code>
                            <div class="formula-calc">
                                Slope = ${slope.toFixed(1)} (${slope > 0 ? 'Prices rising ↑' : slope < 0 ? 'Prices falling ↓' : 'Stable →'})
                            </div>
                            <div class="formula-calc">
                                Accel = ${acceleration.toFixed(2)} (${acceleration > 0 ? 'Speeding up' : acceleration < 0 ? 'Slowing down' : 'Constant'})
                            </div>
                        </div>
                        <div class="formula-logic">
                            <div class="formula-title">Decision Logic:</div>
                            <ul>
                                <li>If <strong>Price > MinSellPrice</strong> AND market slowing → <span class="text-green">SELL NOW</span></li>
                                <li>If <strong>Price > MinSellPrice</strong> BUT slope & accel positive → <span class="text-orange">HOLD</span></li>
                                <li>If <strong>Price ≤ MinSellPrice</strong> → <span class="text-red">STOP</span></li>
                            </ul>
                        </div>
                    </div>
                `;
            }

            // Render result
            if (resultEl) {
                resultEl.style.display = 'block';
                resultEl.className = `decision-box ${cssClass}`;
                resultEl.innerHTML = `
                    <div class="decision-header">
                        <i class="fas fa-gavel"></i> Verdict: ${verdict}
                    </div>
                    <p class="decision-advice">${advice}</p>
                    
                    <div class="math-row">
                        <span class="math-label">Proposed Price:</span>
                        <span class="math-val">LKR ${price.toLocaleString()}</span>
                    </div>
                    <div class="math-row">
                        <span class="math-label">Calculated Break-Even:</span>
                        <span class="math-val">LKR ${breakEven.toFixed(0)}</span>
                    </div>
                    <div class="math-row">
                        <span class="math-label">Avg Recovery Rate:</span>
                        <span class="math-val">${avgRecovery.toFixed(1)}%</span>
                    </div>
                    <div class="math-row">
                        <span class="math-label">Market Velocity (Slope):</span>
                        <span class="math-val">${slope.toFixed(1)}</span>
                    </div>
                    <div class="math-row">
                        <span class="math-label">Market Acceleration:</span>
                        <span class="math-val">${acceleration.toFixed(2)}</span>
                    </div>
                    ${formulaHTML}
                `;
            }
        } catch (error) {
            console.error('Analysis failed:', error);
            alert('Analysis failed. Please try again.');
        } finally {
            // Reset button
            if (analyzeBtn) {
                analyzeBtn.disabled = false;
                analyzeBtn.innerHTML = '<i class="fas fa-search-dollar"></i> Analyze Market Data';
            }
        }
    }
};
