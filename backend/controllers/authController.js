/**
 * Authentication Controller
 * Handles key file authentication, session management, and admin functions
 */

import User from '../models/User.js';
import Session from '../models/Session.js';
import { CryptoService } from '../services/crypto.js';
import crypto from 'crypto';

/**
 * @desc    Authenticate with username and password
 * @route   POST /api/auth/login/password
 * @access  Public
 */
export const loginWithPassword = async (req, res) => {
    try {
        const { username, password, deviceInfo } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                error: 'Username and password are required'
            });
        }

        // Find user by username
        const user = await User.findOne({ username, isActive: true });
        
        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Invalid username or password'
            });
        }

        // Check if user has password set
        if (!user.passwordHash) {
            return res.status(401).json({
                success: false,
                error: 'Password login not enabled for this account. Use key file.'
            });
        }

        // Validate password
        if (!user.validatePassword(password)) {
            return res.status(401).json({
                success: false,
                error: 'Invalid username or password'
            });
        }

        // Check if key file is revoked
        if (user.keyFileRevoked) {
            return res.status(403).json({
                success: false,
                error: 'Account access has been revoked'
            });
        }

        // Generate device fingerprint
        const deviceFingerprint = CryptoService.generateDeviceFingerprint(deviceInfo || {});

        // Check device limit
        const activeDevices = await Session.countActiveDevices(user._id);
        
        if (activeDevices.length >= user.deviceLimit) {
            const existingSession = await Session.findOne({
                user: user._id,
                deviceFingerprint,
                isActive: true,
                expiresAt: { $gt: new Date() }
            });

            if (!existingSession) {
                await Session.terminateOldestSession(user._id);
            }
        }

        // Create session
        const sessionData = {
            userId: user._id.toString(),
            username: user.username,
            role: user.role,
            permissions: user.permissions,
            deviceFingerprint
        };

        const sessionToken = CryptoService.generateSessionToken(sessionData);
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

        const parsedDeviceInfo = parseDeviceInfo(deviceInfo);

        await Session.create({
            user: user._id,
            sessionToken,
            deviceFingerprint,
            deviceInfo: {
                ...parsedDeviceInfo,
                ip: req.ip || req.connection?.remoteAddress
            },
            expiresAt
        });

        // Update login stats
        user.lastLoginAt = new Date();
        user.loginCount += 1;
        await user.save();

        res.json({
            success: true,
            data: {
                token: sessionToken,
                user: user.toPublicJSON(),
                expiresAt
            }
        });
    } catch (error) {
        console.error('Password login error:', error);
        res.status(500).json({
            success: false,
            error: 'Authentication failed'
        });
    }
};

/**
 * @desc    Authenticate with key file
 * @route   POST /api/auth/login
 * @access  Public
 */
export const loginWithKeyFile = async (req, res) => {
    try {
        const { keyFile, deviceInfo } = req.body;

        if (!keyFile) {
            return res.status(400).json({
                success: false,
                error: 'Key file is required'
            });
        }

        // Decode base64 key file
        let keyFileBuffer;
        try {
            keyFileBuffer = Buffer.from(keyFile, 'base64');
        } catch {
            return res.status(400).json({
                success: false,
                error: 'Invalid key file format'
            });
        }

        // Validate and decrypt key file
        const validation = CryptoService.validateKeyFile(keyFileBuffer);
        
        if (!validation.valid) {
            return res.status(401).json({
                success: false,
                error: validation.error || 'Invalid key file'
            });
        }

        const keyData = validation.data;

        // Find user by key file ID
        const user = await User.findByKeyFileId(keyData.keyId);
        
        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Key file not registered or has been revoked'
            });
        }

        // Check if user is active
        if (!user.isActive) {
            return res.status(403).json({
                success: false,
                error: 'Account is disabled'
            });
        }

        // Generate device fingerprint
        const deviceFingerprint = CryptoService.generateDeviceFingerprint(deviceInfo || {});

        // Check device limit
        const activeDevices = await Session.countActiveDevices(user._id);
        
        if (activeDevices.length >= user.deviceLimit) {
            // Check if this device is already logged in
            const existingSession = await Session.findOne({
                user: user._id,
                deviceFingerprint,
                isActive: true,
                expiresAt: { $gt: new Date() }
            });

            if (!existingSession) {
                // Terminate oldest session to make room
                await Session.terminateOldestSession(user._id);
            }
        }

        // Create new session
        const sessionData = {
            userId: user._id.toString(),
            username: user.username,
            role: user.role,
            permissions: user.permissions,
            deviceFingerprint
        };

        const sessionToken = CryptoService.generateSessionToken(sessionData);
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        // Parse device info for storage
        const parsedDeviceInfo = parseDeviceInfo(deviceInfo);

        await Session.create({
            user: user._id,
            sessionToken,
            deviceFingerprint,
            deviceInfo: {
                ...parsedDeviceInfo,
                ip: req.ip || req.connection?.remoteAddress
            },
            expiresAt
        });

        // Update user login stats
        user.lastLoginAt = new Date();
        user.loginCount += 1;
        await user.save();

        res.json({
            success: true,
            data: {
                token: sessionToken,
                user: user.toPublicJSON(),
                expiresAt
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            error: 'Authentication failed'
        });
    }
};

/**
 * @desc    Validate session and get current user
 * @route   GET /api/auth/me
 * @access  Private
 */
export const getCurrentUser = async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        // Get active sessions count
        const activeSessions = await Session.getActiveSessionsForUser(user._id);

        res.json({
            success: true,
            data: {
                user: user.toPublicJSON(),
                activeSessions: activeSessions.length
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
 * @desc    Logout (terminate session)
 * @route   POST /api/auth/logout
 * @access  Private
 */
export const logout = async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        
        if (token) {
            const session = await Session.findOne({ sessionToken: token, isActive: true });
            if (session) {
                session.terminate('logout');
                await session.save();
            }
        }

        res.json({
            success: true,
            message: 'Logged out successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * @desc    Logout from all devices
 * @route   POST /api/auth/logout-all
 * @access  Private
 */
export const logoutAll = async (req, res) => {
    try {
        await Session.terminateAllForUser(req.user.userId, 'logout');

        res.json({
            success: true,
            message: 'Logged out from all devices'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * @desc    Create new user and generate key file (Admin only)
 * @route   POST /api/auth/users
 * @access  Admin
 */
export const createUser = async (req, res) => {
    try {
        const { username, password, email, role, permissions, deviceLimit, expiresInDays, notes } = req.body;

        // Validate admin permissions
        if (!['admin', 'superadmin'].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                error: 'Admin access required'
            });
        }

        // Only superadmin can create admins
        if (role === 'admin' && req.user.role !== 'superadmin') {
            return res.status(403).json({
                success: false,
                error: 'Only superadmin can create admin users'
            });
        }

        // Validate password if provided
        if (password && password.length < 8) {
            return res.status(400).json({
                success: false,
                error: 'Password must be at least 8 characters'
            });
        }

        // Check if username exists
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                error: 'Username already exists'
            });
        }

        // Generate key file data
        const keyId = crypto.randomUUID();
        const expiresAt = new Date(Date.now() + (expiresInDays || 365) * 24 * 60 * 60 * 1000);

        // Create user first
        const user = await User.create({
            username,
            email,
            role: role || 'user',
            permissions: permissions || ['read', 'write'],
            deviceLimit: deviceLimit || 3,
            keyFileId: keyId,
            keyFileCreatedAt: new Date(),
            keyFileExpiresAt: expiresAt,
            createdBy: req.user.userId,
            notes
        });

        // Set password if provided
        if (password) {
            user.setPassword(password);
            await user.save();
        }

        // Generate encrypted key file
        const keyFileBuffer = CryptoService.generateKeyFile({
            userId: user._id.toString(),
            username: user.username,
            email: user.email,
            role: user.role,
            permissions: user.permissions,
            deviceLimit: user.deviceLimit,
            expiresAt: expiresAt.toISOString()
        });

        // Update user with correct keyId from the generated file
        const validation = CryptoService.validateKeyFile(keyFileBuffer);
        if (validation.valid) {
            user.keyFileId = validation.data.keyId;
            await user.save();
        }

        res.status(201).json({
            success: true,
            data: {
                user: user.toPublicJSON(),
                keyFile: keyFileBuffer.toString('base64'),
                keyFileName: `${username}_keyfile.akey`
            }
        });
    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * @desc    Get all users (Admin only)
 * @route   GET /api/auth/users
 * @access  Admin
 */
export const getUsers = async (req, res) => {
    try {
        if (!['admin', 'superadmin'].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                error: 'Admin access required'
            });
        }

        const users = await User.find()
            .select('-passwordHash')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            count: users.length,
            data: users.map(u => u.toPublicJSON())
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * @desc    Get active sessions (Admin only)
 * @route   GET /api/auth/sessions
 * @access  Admin
 */
export const getActiveSessions = async (req, res) => {
    try {
        if (!['admin', 'superadmin'].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                error: 'Admin access required'
            });
        }

        const sessions = await Session.getActiveSessions();
        const stats = await Session.getSessionStats();

        res.json({
            success: true,
            data: {
                totalActiveSessions: sessions.length,
                sessions: sessions.map(s => ({
                    id: s._id,
                    user: s.user,
                    deviceInfo: s.deviceInfo,
                    createdAt: s.createdAt,
                    lastActivityAt: s.lastActivityAt,
                    expiresAt: s.expiresAt
                })),
                userStats: stats
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
 * @desc    Revoke user's key file (Admin only)
 * @route   POST /api/auth/users/:id/revoke
 * @access  Admin
 */
export const revokeUserKeyFile = async (req, res) => {
    try {
        if (!['admin', 'superadmin'].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                error: 'Admin access required'
            });
        }

        const user = await User.findById(req.params.id);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        // Revoke key file
        user.revokeKeyFile(req.body.reason || 'Revoked by admin');
        await user.save();

        // Terminate all sessions
        await Session.terminateAllForUser(user._id, 'revoked');

        res.json({
            success: true,
            message: 'Key file revoked and all sessions terminated'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * @desc    Regenerate key file for user (Admin only)
 * @route   POST /api/auth/users/:id/regenerate
 * @access  Admin
 */
export const regenerateKeyFile = async (req, res) => {
    try {
        if (!['admin', 'superadmin'].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                error: 'Admin access required'
            });
        }

        const user = await User.findById(req.params.id);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        const { expiresInDays } = req.body;
        const expiresAt = new Date(Date.now() + (expiresInDays || 365) * 24 * 60 * 60 * 1000);

        // Generate new key file
        const keyFileBuffer = CryptoService.generateKeyFile({
            userId: user._id.toString(),
            username: user.username,
            email: user.email,
            role: user.role,
            permissions: user.permissions,
            deviceLimit: user.deviceLimit,
            expiresAt: expiresAt.toISOString()
        });

        // Get new keyId
        const validation = CryptoService.validateKeyFile(keyFileBuffer);
        
        // Update user
        user.keyFileId = validation.data.keyId;
        user.keyFileCreatedAt = new Date();
        user.keyFileExpiresAt = expiresAt;
        user.keyFileRevoked = false;
        user.keyFileRevokedAt = null;
        user.keyFileRevokedReason = null;
        await user.save();

        // Terminate old sessions
        await Session.terminateAllForUser(user._id, 'revoked');

        res.json({
            success: true,
            data: {
                user: user.toPublicJSON(),
                keyFile: keyFileBuffer.toString('base64'),
                keyFileName: `${user.username}_keyfile.akey`
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
 * @desc    Terminate specific session (Admin only)
 * @route   DELETE /api/auth/sessions/:id
 * @access  Admin
 */
export const terminateSession = async (req, res) => {
    try {
        if (!['admin', 'superadmin'].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                error: 'Admin access required'
            });
        }

        const session = await Session.findById(req.params.id);
        
        if (!session) {
            return res.status(404).json({
                success: false,
                error: 'Session not found'
            });
        }

        session.terminate('admin_action');
        await session.save();

        res.json({
            success: true,
            message: 'Session terminated'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * @desc    Initialize superadmin (First time setup)
 * @route   POST /api/auth/init
 * @access  Public (only works if no superadmin exists)
 */
export const initializeSuperAdmin = async (req, res) => {
    try {
        // Check if superadmin already exists
        const existingSuperAdmin = await User.findOne({ role: 'superadmin' });
        
        if (existingSuperAdmin) {
            return res.status(400).json({
                success: false,
                error: 'System already initialized'
            });
        }

        const { username, email, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                error: 'Username and password are required'
            });
        }

        // Generate key file
        const keyId = crypto.randomUUID();
        const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

        // Create superadmin user
        const user = new User({
            username,
            email,
            role: 'superadmin',
            permissions: ['read', 'write', 'delete', 'admin', 'manage_users'],
            deviceLimit: 5,
            keyFileId: keyId,
            keyFileCreatedAt: new Date(),
            keyFileExpiresAt: expiresAt
        });

        // Set password for admin panel access
        user.setPassword(password);
        
        // Generate key file
        const keyFileBuffer = CryptoService.generateKeyFile({
            userId: user._id.toString(),
            username: user.username,
            email: user.email,
            role: user.role,
            permissions: user.permissions,
            deviceLimit: user.deviceLimit,
            expiresAt: expiresAt.toISOString()
        });

        // Update keyId
        const validation = CryptoService.validateKeyFile(keyFileBuffer);
        user.keyFileId = validation.data.keyId;
        await user.save();

        res.status(201).json({
            success: true,
            message: 'Superadmin created successfully',
            data: {
                user: user.toPublicJSON(),
                keyFile: keyFileBuffer.toString('base64'),
                keyFileName: `${username}_superadmin.akey`
            }
        });
    } catch (error) {
        console.error('Init error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * @desc    Update user password (Admin only)
 * @route   POST /api/auth/users/:id/password
 * @access  Admin
 */
export const updateUserPassword = async (req, res) => {
    try {
        const { id } = req.params;
        const { password, removePassword } = req.body;

        if (!['admin', 'superadmin'].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                error: 'Admin access required'
            });
        }

        const user = await User.findById(id);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        // Prevent non-superadmins from modifying superadmin passwords
        if (user.role === 'superadmin' && req.user.role !== 'superadmin') {
            return res.status(403).json({
                success: false,
                error: 'Cannot modify superadmin account'
            });
        }

        if (removePassword) {
            // Remove password (disable password login)
            user.passwordHash = null;
            await user.save();

            return res.json({
                success: true,
                message: 'Password login disabled',
                data: user.toPublicJSON()
            });
        }

        if (!password || password.length < 8) {
            return res.status(400).json({
                success: false,
                error: 'Password must be at least 8 characters'
            });
        }

        // Set new password
        user.setPassword(password);
        await user.save();

        res.json({
            success: true,
            message: 'Password updated successfully',
            data: user.toPublicJSON()
        });
    } catch (error) {
        console.error('Update password error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Helper function to parse user agent
function parseDeviceInfo(deviceInfo = {}) {
    const ua = deviceInfo.userAgent || '';
    
    let browser = 'Unknown';
    let os = 'Unknown';
    let device = 'Desktop';

    if (ua.includes('Chrome')) browser = 'Chrome';
    else if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Safari')) browser = 'Safari';
    else if (ua.includes('Edge')) browser = 'Edge';

    if (ua.includes('Windows')) os = 'Windows';
    else if (ua.includes('Mac')) os = 'macOS';
    else if (ua.includes('Linux')) os = 'Linux';
    else if (ua.includes('Android')) { os = 'Android'; device = 'Mobile'; }
    else if (ua.includes('iPhone') || ua.includes('iPad')) { os = 'iOS'; device = 'Mobile'; }

    return {
        userAgent: ua,
        platform: deviceInfo.platform || '',
        browser,
        os,
        device
    };
}
