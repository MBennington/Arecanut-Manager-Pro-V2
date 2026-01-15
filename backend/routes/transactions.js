/**
 * Transaction Routes
 * API endpoints for transaction operations
 */

import express from 'express';
import {
    getTransactions,
    getTransaction,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    deleteAllTransactions,
    getStats,
    getAnalytics
} from '../controllers/transactionController.js';

const router = express.Router();

// Stats & Analytics (must be before /:id routes)
router.get('/stats', getStats);
router.get('/analytics/:type', getAnalytics);

// CRUD routes
router.route('/')
    .get(getTransactions)
    .post(createTransaction)
    .delete(deleteAllTransactions);

router.route('/:id')
    .get(getTransaction)
    .put(updateTransaction)
    .delete(deleteTransaction);

export default router;
