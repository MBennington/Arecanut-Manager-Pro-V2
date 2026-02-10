/**
 * Transaction Controller
 * Handles all transaction-related business logic
 */

import Transaction from '../models/Transaction.js';

/**
 * @desc    Get all transactions
 * @route   GET /api/transactions
 * @access  Public
 */
export const getTransactions = async (req, res) => {
    try {
        // Default sort: date desc, then createdAt desc (latest entry within the same day first)
        const { type, startDate, endDate, limit = 100, sort = '-date -createdAt' } = req.query;
        
        // Build query
        const query = {};
        if (type) query.type = type;
        if (startDate || endDate) {
            query.date = {};
            if (startDate) query.date.$gte = new Date(startDate);
            if (endDate) query.date.$lte = new Date(endDate);
        }
        
        const transactions = await Transaction.find(query)
            .sort(sort)
            .limit(parseInt(limit))
            .lean();
        
        res.json({
            success: true,
            count: transactions.length,
            data: transactions
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * @desc    Get single transaction
 * @route   GET /api/transactions/:id
 * @access  Public
 */
export const getTransaction = async (req, res) => {
    try {
        const transaction = await Transaction.findById(req.params.id).lean();
        
        if (!transaction) {
            return res.status(404).json({
                success: false,
                error: 'Transaction not found'
            });
        }
        
        res.json({
            success: true,
            data: transaction
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * @desc    Create transaction
 * @route   POST /api/transactions
 * @access  Public
 */
export const createTransaction = async (req, res) => {
    try {
        const { type, date, qty, price, inputQty, outputQty, amount, category, notes, loanType } = req.body;
        
        // Debug logging
        console.log('Creating transaction:', { type, date, amount, category, notes });
        
        // Validate required fields
        if (!type) {
            return res.status(400).json({
                success: false,
                error: 'Transaction type is required'
            });
        }
        
        if (!date) {
            return res.status(400).json({
                success: false,
                error: 'Date is required'
            });
        }
        
        // Prepare transaction data
        const txnData = {
            type,
            date: new Date(date),
            notes: notes || ''
        };
        
        // Type-specific processing
        switch (type) {
            case 'BUY': {
                txnData.qty = parseFloat(qty);
                txnData.price = parseFloat(price);
                break;
            }
                
            case 'SELL': {
                txnData.qty = parseFloat(qty);
                txnData.price = parseFloat(price);
                const sellQty = txnData.qty || 0;
                if (sellQty <= 0) break;

                // --- Always treat sold kernel as produced from raw (inventory never goes negative) ---
                // 1. Get average recovery rate
                const stats = await Transaction.getStats();
                const hasProcessHistory = (stats.processCount || 0) > 0;
                const recovery = hasProcessHistory && stats.avgRecovery
                    ? stats.avgRecovery
                    : 25;

                // 2. For the full sold quantity: add kernel (implicit process) and reduce raw by recovery
                //    Raw needed to produce sellQty kernel = sellQty / (recovery/100)
                const rawNeeded = +(sellQty / (recovery / 100)).toFixed(3);

                await Transaction.create({
                    type: 'PROCESS',
                    date: new Date(date),
                    inputQty: rawNeeded,
                    outputQty: sellQty,
                    notes: `AUTO: Processed ${rawNeeded} raw → ${sellQty} kg kernel for sale`
                });

                // 3. SELL then only deducts the kernel we just "produced", so processed stock never goes negative
                break;
            }
                
            case 'PROCESS': {
                txnData.inputQty = parseFloat(inputQty);
                txnData.outputQty = parseFloat(outputQty);
                break;
            }
                
            case 'EXPENSE': {
                txnData.category = category;
                txnData.amount = -Math.abs(parseFloat(amount));
                break;
            }
                
            case 'INCOME': {
                txnData.category = category;
                txnData.amount = Math.abs(parseFloat(amount));
                break;
            }
                
            case 'ADJUSTMENT': {
                // Manual corrections: directly adjust cash and stock deltas.
                const cashDelta = Number(amount || 0);
                const rawDelta = Number(req.body.rawStockChange || 0);
                const procDelta = Number(req.body.procStockChange || 0);

                if (!cashDelta && !rawDelta && !procDelta) {
                    return res.status(400).json({
                        success: false,
                        error: 'At least one of cash, raw stock, or processed stock adjustment must be non-zero'
                    });
                }

                txnData.amount = cashDelta;
                txnData.rawStockChange = rawDelta;
                txnData.procStockChange = procDelta;
                break;
            }

            case 'LOAN': {
                const loanAmount = parseFloat(amount);
                if (loanType === 'TAKE') {
                    txnData.amount = Math.abs(loanAmount);
                    txnData.notes = `Loan Taken: ${notes}`;
                } else {
                    txnData.amount = -Math.abs(loanAmount);
                    txnData.notes = `Loan Repayment: ${notes}`;
                }
                break;
            }
                
            default:
                return res.status(400).json({
                    success: false,
                    error: `Unknown transaction type: ${type}`
                });
        }
        
        console.log('Transaction data to save:', txnData);
        
        const transaction = await Transaction.create(txnData);
        
        res.status(201).json({
            success: true,
            data: transaction
        });
    } catch (error) {
        console.error('Transaction creation error:', error);
        
        // Handle validation errors
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(e => e.message);
            console.error('Validation errors:', messages);
            return res.status(400).json({
                success: false,
                error: messages.join(', ')
            });
        }
        
        // Handle duplicate key errors
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                error: 'Duplicate entry error'
            });
        }
        
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * @desc    Update transaction
 * @route   PUT /api/transactions/:id
 * @access  Public
 */
export const updateTransaction = async (req, res) => {
    try {
        const transaction = await Transaction.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        
        if (!transaction) {
            return res.status(404).json({
                success: false,
                error: 'Transaction not found'
            });
        }
        
        res.json({
            success: true,
            data: transaction
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * @desc    Delete transaction
 * @route   DELETE /api/transactions/:id
 * @access  Public
 */
export const deleteTransaction = async (req, res) => {
    try {
        const transaction = await Transaction.findByIdAndDelete(req.params.id);
        
        if (!transaction) {
            return res.status(404).json({
                success: false,
                error: 'Transaction not found'
            });
        }
        
        res.json({
            success: true,
            data: {}
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * @desc    Delete all transactions
 * @route   DELETE /api/transactions
 * @access  Public
 */
export const deleteAllTransactions = async (req, res) => {
    try {
        await Transaction.deleteMany({});
        
        res.json({
            success: true,
            message: 'All transactions deleted'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * @desc    Get dashboard stats
 * @route   GET /api/transactions/stats
 * @access  Public
 */
export const getStats = async (req, res) => {
    try {
        const [stats, chartData] = await Promise.all([
            Transaction.getStats(),
            Transaction.getChartData()
        ]);
        
        // Inventory must never be shown as negative (clamp for display)
        const rawStock = Math.max(0, stats.totalRawStock || 0);
        const procStock = Math.max(0, stats.totalProcStock || 0);
        const rawPoints = (chartData.rawPoints || []).map(v => Math.max(0, v));
        const procPoints = (chartData.procPoints || []).map(v => Math.max(0, v));

        res.json({
            success: true,
            data: {
                cash: stats.totalCash || 0,
                rawStock,
                procStock,
                avgRecovery: parseFloat((stats.avgRecovery || 0).toFixed(1)),
                processCount: stats.processCount || 0,
                chartDates: chartData.dates,
                cashPoints: chartData.cashPoints,
                rawPoints,
                procPoints
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * @desc    Get market analytics for decision engine
 * @route   GET /api/transactions/analytics/:type
 * @access  Public
 */
export const getAnalytics = async (req, res) => {
    try {
        const { type } = req.params;
        
        if (!['BUY', 'SELL'].includes(type)) {
            return res.status(400).json({
                success: false,
                error: 'Type must be BUY or SELL'
            });
        }
        
        const analytics = await Transaction.getMarketAnalytics(type);
        
        // Get recent sell prices for buy analysis
        if (type === 'BUY') {
            const sellTxns = await Transaction.find({ type: 'SELL' })
                .sort({ date: -1 })
                .limit(3)
                .select('price')
                .lean();
            
            analytics.avgSellPrice = sellTxns.length > 0
                ? sellTxns.reduce((sum, t) => sum + (t.price || 0), 0) / sellTxns.length
                : 3000;
        }
        
        // Get recent buy prices for sell analysis
        if (type === 'SELL') {
            const buyTxns = await Transaction.find({ type: 'BUY' })
                .sort({ date: -1 })
                .limit(5)
                .select('price')
                .lean();
            
            analytics.avgBuyPrice = buyTxns.length > 0
                ? buyTxns.reduce((sum, t) => sum + (t.price || 0), 0) / buyTxns.length
                : 750;
        }
        
        res.json({
            success: true,
            data: analytics
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};
