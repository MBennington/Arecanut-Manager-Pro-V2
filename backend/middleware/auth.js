/**
 * Authentication Middleware
 * Validates session tokens and protects routes
 */

import Session from '../models/Session.js';
import { CryptoService } from '../services/crypto.js';

/**
 * Protect routes - Require valid session token
 */
export const protect = async (req, res, next) => {
    try {
        // Get token from header
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: 'No authentication token provided'
            });
        }

        const token = authHeader.replace('Bearer ', '');

        // Validate token cryptographically
        const decoded = CryptoService.validateSessionToken(token);
        
        if (!decoded) {
            return res.status(401).json({
                success: false,
                error: 'Invalid or expired token'
            });
        }

        // Verify session exists and is active in database
        const session = await Session.findOne({
            sessionToken: token,
            isActive: true,
            expiresAt: { $gt: new Date() }
        });

        if (!session) {
            return res.status(401).json({
                success: false,
                error: 'Session expired or invalidated'
            });
        }

        // Update session activity
        session.updateActivity();
        await session.save();

        // Attach user data to request
        req.user = decoded;
        req.session = session;

        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(401).json({
            success: false,
            error: 'Authentication failed'
        });
    }
};

/**
 * Optional auth - Attach user if token present, but don't require it
 */
export const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.replace('Bearer ', '');
            const decoded = CryptoService.validateSessionToken(token);
            
            if (decoded) {
                const session = await Session.findOne({
                    sessionToken: token,
                    isActive: true,
                    expiresAt: { $gt: new Date() }
                });

                if (session) {
                    session.updateActivity();
                    await session.save();
                    req.user = decoded;
                    req.session = session;
                }
            }
        }

        next();
    } catch {
        next();
    }
};

/**
 * Require specific role
 */
export const requireRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                error: `Access denied. Required role: ${roles.join(' or ')}`
            });
        }

        next();
    };
};

/**
 * Require specific permission
 */
export const requirePermission = (...permissions) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }

        const userPermissions = req.user.permissions || [];
        const hasPermission = permissions.some(p => userPermissions.includes(p));

        if (!hasPermission) {
            return res.status(403).json({
                success: false,
                error: `Access denied. Required permission: ${permissions.join(' or ')}`
            });
        }

        next();
    };
};

/**
 * Rate limiting by IP
 */
const rateLimitMap = new Map();

export const rateLimit = (maxRequests = 100, windowMs = 60000) => {
    return (req, res, next) => {
        const ip = req.ip || req.connection?.remoteAddress || 'unknown';
        const now = Date.now();
        
        if (!rateLimitMap.has(ip)) {
            rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
            return next();
        }

        const record = rateLimitMap.get(ip);
        
        if (now > record.resetAt) {
            record.count = 1;
            record.resetAt = now + windowMs;
            return next();
        }

        record.count++;
        
        if (record.count > maxRequests) {
            return res.status(429).json({
                success: false,
                error: 'Too many requests, please try again later'
            });
        }

        next();
    };
};

/**
 * Login rate limiting (stricter)
 */
export const loginRateLimit = rateLimit(5, 60000); // 5 attempts per minute
