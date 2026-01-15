/**
 * User Model
 * Stores user information and key file metadata
 */

import mongoose from 'mongoose';
import { CryptoService } from '../services/crypto.js';

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, 'Username is required'],
        unique: true,
        trim: true,
        minlength: [3, 'Username must be at least 3 characters'],
        maxlength: [30, 'Username cannot exceed 30 characters']
    },
    email: {
        type: String,
        trim: true,
        lowercase: true,
        sparse: true // Allow null but enforce uniqueness when present
    },
    role: {
        type: String,
        enum: ['user', 'admin', 'superadmin'],
        default: 'user'
    },
    permissions: [{
        type: String,
        enum: ['read', 'write', 'delete', 'admin', 'manage_users']
    }],
    
    // Key file metadata
    keyFileId: {
        type: String,
        unique: true,
        sparse: true
    },
    keyFileCreatedAt: Date,
    keyFileExpiresAt: Date,
    keyFileRevoked: {
        type: Boolean,
        default: false
    },
    keyFileRevokedAt: Date,
    keyFileRevokedReason: String,
    
    // Device tracking
    deviceLimit: {
        type: Number,
        default: 3,
        min: 1,
        max: 10
    },
    
    // Admin password (only for admin roles, optional)
    passwordHash: String,
    
    // Account status
    isActive: {
        type: Boolean,
        default: true
    },
    lastLoginAt: Date,
    loginCount: {
        type: Number,
        default: 0
    },
    
    // Metadata
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    notes: String
}, {
    timestamps: true
});

// Indexes
userSchema.index({ username: 1 });
userSchema.index({ keyFileId: 1 });
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });

// Methods
userSchema.methods.setPassword = function(password) {
    this.passwordHash = CryptoService.hashPassword(password);
};

userSchema.methods.validatePassword = function(password) {
    if (!this.passwordHash) return false;
    return CryptoService.verifyPassword(password, this.passwordHash);
};

userSchema.methods.revokeKeyFile = function(reason = 'Manual revocation') {
    this.keyFileRevoked = true;
    this.keyFileRevokedAt = new Date();
    this.keyFileRevokedReason = reason;
};

userSchema.methods.toPublicJSON = function() {
    return {
        id: this._id,
        username: this.username,
        email: this.email,
        role: this.role,
        permissions: this.permissions,
        deviceLimit: this.deviceLimit,
        isActive: this.isActive,
        lastLoginAt: this.lastLoginAt,
        loginCount: this.loginCount,
        keyFileCreatedAt: this.keyFileCreatedAt,
        keyFileExpiresAt: this.keyFileExpiresAt,
        keyFileRevoked: this.keyFileRevoked,
        createdAt: this.createdAt
    };
};

// Static methods
userSchema.statics.findByKeyFileId = function(keyFileId) {
    return this.findOne({ keyFileId, keyFileRevoked: false, isActive: true });
};

const User = mongoose.model('User', userSchema);

export default User;
