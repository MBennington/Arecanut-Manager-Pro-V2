/**
 * Session Model
 * Tracks active user sessions and device information
 */

import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    
    // Session identification
    sessionToken: {
        type: String,
        required: true,
        unique: true
    },
    
    // Device information
    deviceFingerprint: {
        type: String,
        required: true
    },
    deviceInfo: {
        userAgent: String,
        platform: String,
        browser: String,
        os: String,
        device: String,
        ip: String,
        location: String
    },
    
    // Session status
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },
    
    // Timestamps
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    lastActivityAt: {
        type: Date,
        default: Date.now
    },
    expiresAt: {
        type: Date,
        required: true,
        index: true
    },
    
    // Super admin sessions never expire
    neverExpires: {
        type: Boolean,
        default: false
    },
    
    // Termination info
    terminatedAt: Date,
    terminatedReason: {
        type: String,
        enum: ['logout', 'expired', 'revoked', 'device_limit', 'admin_action', null]
    }
}, {
    timestamps: false // We manage our own timestamps
});

// Compound indexes for efficient queries
sessionSchema.index({ user: 1, isActive: 1 });
sessionSchema.index({ user: 1, deviceFingerprint: 1 });
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

// Methods
sessionSchema.methods.terminate = function(reason = 'logout') {
    this.isActive = false;
    this.terminatedAt = new Date();
    this.terminatedReason = reason;
};

sessionSchema.methods.updateActivity = function() {
    this.lastActivityAt = new Date();
};

// Static methods
sessionSchema.statics.getActiveSessionsForUser = function(userId) {
    return this.find({
        user: userId,
        isActive: true,
        $or: [
            { neverExpires: true },
            { expiresAt: { $gt: new Date() } }
        ]
    }).sort({ lastActivityAt: -1 });
};

sessionSchema.statics.countActiveDevices = function(userId) {
    return this.distinct('deviceFingerprint', {
        user: userId,
        isActive: true,
        $or: [
            { neverExpires: true },
            { expiresAt: { $gt: new Date() } }
        ]
    });
};

sessionSchema.statics.terminateAllForUser = async function(userId, reason = 'admin_action') {
    return this.updateMany(
        { user: userId, isActive: true },
        { 
            isActive: false, 
            terminatedAt: new Date(),
            terminatedReason: reason 
        }
    );
};

sessionSchema.statics.terminateOldestSession = async function(userId) {
    const oldest = await this.findOne({
        user: userId,
        isActive: true
    }).sort({ createdAt: 1 });
    
    if (oldest) {
        oldest.terminate('device_limit');
        await oldest.save();
        return oldest;
    }
    return null;
};

sessionSchema.statics.getActiveSessions = function() {
    return this.find({
        isActive: true,
        $or: [
            { neverExpires: true },
            { expiresAt: { $gt: new Date() } }
        ]
    })
    .populate('user', 'username email role')
    .sort({ lastActivityAt: -1 });
};

sessionSchema.statics.getSessionStats = async function() {
    const stats = await this.aggregate([
        {
            $match: {
                isActive: true,
                $or: [
                    { neverExpires: true },
                    { expiresAt: { $gt: new Date() } }
                ]
            }
        },
        {
            $group: {
                _id: '$user',
                sessionCount: { $sum: 1 },
                devices: { $addToSet: '$deviceFingerprint' },
                lastActivity: { $max: '$lastActivityAt' }
            }
        },
        {
            $lookup: {
                from: 'users',
                localField: '_id',
                foreignField: '_id',
                as: 'userInfo'
            }
        },
        {
            $unwind: '$userInfo'
        },
        {
            $project: {
                userId: '$_id',
                username: '$userInfo.username',
                role: '$userInfo.role',
                sessionCount: 1,
                deviceCount: { $size: '$devices' },
                lastActivity: 1
            }
        }
    ]);
    
    return stats;
};

const Session = mongoose.model('Session', sessionSchema);

export default Session;
