/**
 * Authentication Routes
 * API endpoints for authentication and user management
 */

import express from 'express';
import {
    loginWithKeyFile,
    loginWithPassword,
    getCurrentUser,
    logout,
    logoutAll,
    createUser,
    getUsers,
    getActiveSessions,
    revokeUserKeyFile,
    regenerateKeyFile,
    terminateSession,
    initializeSuperAdmin,
    updateUserPassword
} from '../controllers/authController.js';
import { protect, requireRole, loginRateLimit, rateLimit } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.post('/init', rateLimit(10, 60000), initializeSuperAdmin); // 10 per minute
router.post('/login', loginRateLimit, loginWithKeyFile);
router.post('/login/password', loginRateLimit, loginWithPassword);

// Protected routes (require valid session)
router.get('/me', protect, getCurrentUser);
router.post('/logout', protect, logout);
router.post('/logout-all', protect, logoutAll);

// Admin routes
router.get('/users', protect, requireRole('admin', 'superadmin'), getUsers);
router.post('/users', protect, requireRole('admin', 'superadmin'), createUser);
router.post('/users/:id/revoke', protect, requireRole('admin', 'superadmin'), revokeUserKeyFile);
router.post('/users/:id/regenerate', protect, requireRole('admin', 'superadmin'), regenerateKeyFile);
router.post('/users/:id/password', protect, requireRole('admin', 'superadmin'), updateUserPassword);

router.get('/sessions', protect, requireRole('admin', 'superadmin'), getActiveSessions);
router.delete('/sessions/:id', protect, requireRole('admin', 'superadmin'), terminateSession);

export default router;
