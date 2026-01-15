/**
 * Transaction Model
 * Schema for all transaction types: BUY, SELL, PROCESS, EXPENSE, LOAN
 */

import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['BUY', 'SELL', 'PROCESS', 'EXPENSE', 'LOAN'],
        required: [true, 'Transaction type is required'],
        index: true
    },
    date: {
        type: Date,
        required: [true, 'Date is required'],
        index: true
    },
    
    // Financial fields
    amount: {
        type: Number,
        default: 0
    },
    price: {
        type: Number,
        min: [0, 'Price cannot be negative']
    },
    
    // Quantity fields
    qty: {
        type: Number,
        min: [0, 'Quantity cannot be negative']
    },
    inputQty: {
        type: Number,
        min: [0, 'Input quantity cannot be negative']
    },
    outputQty: {
        type: Number,
        min: [0, 'Output quantity cannot be negative']
    },
    
    // Stock changes (computed on save)
    rawStockChange: {
        type: Number,
        default: 0
    },
    procStockChange: {
        type: Number,
        default: 0
    },
    
    // Processing specific
    recovery: {
        type: Number,
        min: [0, 'Recovery cannot be negative'],
        max: [100, 'Recovery cannot exceed 100%']
    },
    
    // Expense specific
    category: {
        type: String,
        enum: ['Labour', 'Electricity', 'Transport', 'Other', null]
    },
    
    // General
    notes: {
        type: String,
        trim: true,
        maxlength: [500, 'Notes cannot exceed 500 characters']
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Compound index for efficient date-range queries
transactionSchema.index({ date: -1, type: 1 });

// Pre-save middleware to compute derived fields
transactionSchema.pre('save', function(next) {
    switch (this.type) {
        case 'BUY':
            this.amount = -(this.qty * this.price);
            this.rawStockChange = this.qty;
            this.procStockChange = 0;
            break;
            
        case 'SELL':
            this.amount = this.qty * this.price;
            this.rawStockChange = 0;
            this.procStockChange = -this.qty;
            break;
            
        case 'PROCESS':
            this.amount = 0;
            this.rawStockChange = -this.inputQty;
            this.procStockChange = this.outputQty;
            this.recovery = ((this.outputQty / this.inputQty) * 100).toFixed(1);
            break;
            
        case 'EXPENSE':
            // Amount should be negative (already set by controller)
            this.rawStockChange = 0;
            this.procStockChange = 0;
            break;
            
        case 'LOAN':
            // Amount can be positive (take) or negative (repay)
            this.rawStockChange = 0;
            this.procStockChange = 0;
            break;
    }
    next();
});

// Static method: Get aggregated stats
transactionSchema.statics.getStats = async function() {
    const result = await this.aggregate([
        {
            $group: {
                _id: null,
                totalCash: { $sum: '$amount' },
                totalRawStock: { $sum: '$rawStockChange' },
                totalProcStock: { $sum: '$procStockChange' },
                avgRecovery: { 
                    $avg: { 
                        $cond: [{ $eq: ['$type', 'PROCESS'] }, '$recovery', null] 
                    } 
                },
                processCount: {
                    $sum: { $cond: [{ $eq: ['$type', 'PROCESS'] }, 1, 0] }
                }
            }
        }
    ]);
    
    return result[0] || {
        totalCash: 0,
        totalRawStock: 0,
        totalProcStock: 0,
        avgRecovery: 0,
        processCount: 0
    };
};

// Static method: Get chart data
transactionSchema.statics.getChartData = async function() {
    const transactions = await this.find()
        .sort({ date: 1 })
        .select('date amount rawStockChange procStockChange')
        .lean();
    
    let runningCash = 0;
    let runningRaw = 0;
    let runningProc = 0;
    
    const chartData = {};
    
    transactions.forEach(t => {
        const dateKey = t.date.toISOString().split('T')[0];
        runningCash += t.amount || 0;
        runningRaw += t.rawStockChange || 0;
        runningProc += t.procStockChange || 0;
        
        chartData[dateKey] = {
            cash: runningCash,
            raw: runningRaw,
            proc: runningProc
        };
    });
    
    const dates = Object.keys(chartData).sort();
    
    return {
        dates,
        cashPoints: dates.map(d => chartData[d].cash),
        rawPoints: dates.map(d => chartData[d].raw),
        procPoints: dates.map(d => chartData[d].proc)
    };
};

// Static method: Get market analytics for decision engine
transactionSchema.statics.getMarketAnalytics = async function(type) {
    const history = await this.find({ type })
        .sort({ date: -1 })
        .limit(5)
        .select('price')
        .lean();
    
    const procHistory = await this.find({ type: 'PROCESS' })
        .select('recovery')
        .lean();
    
    let avgPrice = 0, slope = 0, acceleration = 0;
    
    if (history.length >= 2) {
        // Reverse to get chronological order
        const recent = history.reverse();
        avgPrice = recent.reduce((sum, t) => sum + (t.price || 0), 0) / recent.length;
        
        const p2 = recent[recent.length - 1]?.price || 0;
        const p1 = recent[recent.length - 2]?.price || 0;
        slope = p2 - p1;
        
        if (recent.length >= 3) {
            const p0 = recent[recent.length - 3]?.price || 0;
            acceleration = slope - (p1 - p0);
        }
    }
    
    // Calculate average recovery
    let avgRecovery = 25; // Default
    if (procHistory.length > 0) {
        avgRecovery = procHistory.reduce((sum, t) => sum + (parseFloat(t.recovery) || 0), 0) / procHistory.length;
    }
    
    return { avgPrice, slope, acceleration, avgRecovery, historyCount: history.length };
};

const Transaction = mongoose.model('Transaction', transactionSchema);

export default Transaction;
