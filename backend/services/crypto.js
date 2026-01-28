/**
 * Cryptographic Service
 * Handles encryption/decryption of authentication key files
 * Uses AES-256-GCM with HMAC signature verification
 */

import crypto from 'crypto';

// Master encryption key (in production, use environment variable)
const MASTER_KEY = process.env.MASTER_KEY || 'arecanut-pro-secure-master-key-2026!';
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;

/**
 * Derive encryption key from master key and salt
 */
function deriveKey(salt) {
    return crypto.pbkdf2Sync(MASTER_KEY, salt, 100000, KEY_LENGTH, 'sha512');
}

/**
 * Generate HMAC signature for data integrity
 */
function generateHMAC(data, key) {
    return crypto.createHmac('sha256', key).update(data).digest();
}

/**
 * Verify HMAC signature
 */
function verifyHMAC(data, signature, key) {
    const computed = generateHMAC(data, key);
    return crypto.timingSafeEqual(computed, signature);
}

export const CryptoService = {
    /**
     * Generate a unique key file for a user
     * @param {Object} userData - User information to embed
     * @returns {Buffer} Encrypted key file buffer
     */
    generateKeyFile(userData) {
        // Create payload with metadata
        const payload = {
            userId: userData.userId,
            username: userData.username,
            email: userData.email || '',
            role: userData.role || 'user',
            deviceLimit: userData.deviceLimit || 3,
            createdAt: new Date().toISOString(),
            expiresAt: userData.expiresAt || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
            permissions: userData.permissions || ['read', 'write'],
            keyId: crypto.randomUUID(),
            version: '1.0'
        };

        // Convert to JSON and buffer
        const payloadBuffer = Buffer.from(JSON.stringify(payload), 'utf8');

        // Generate random salt and IV
        const salt = crypto.randomBytes(SALT_LENGTH);
        const iv = crypto.randomBytes(IV_LENGTH);

        // Derive encryption key
        const encryptionKey = deriveKey(salt);

        // Encrypt the payload
        const cipher = crypto.createCipheriv(ALGORITHM, encryptionKey, iv);
        const encrypted = Buffer.concat([
            cipher.update(payloadBuffer),
            cipher.final()
        ]);
        const authTag = cipher.getAuthTag();

        // Create HMAC signature of encrypted data
        const hmacKey = deriveKey(Buffer.concat([salt, Buffer.from('hmac')]));
        const signature = generateHMAC(encrypted, hmacKey);

        // Build final key file structure:
        // [MAGIC(8)] [VERSION(2)] [SALT(32)] [IV(16)] [AUTH_TAG(16)] [HMAC(32)] [ENCRYPTED_DATA]
        const magic = Buffer.from('ARECAKEY', 'utf8'); // 8 bytes
        const version = Buffer.alloc(2);
        version.writeUInt16BE(1, 0);

        const keyFile = Buffer.concat([
            magic,           // 8 bytes - Magic identifier
            version,         // 2 bytes - File format version
            salt,            // 32 bytes - Salt for key derivation
            iv,              // 16 bytes - Initialization vector
            authTag,         // 16 bytes - GCM auth tag
            signature,       // 32 bytes - HMAC signature
            encrypted        // Variable - Encrypted payload
        ]);

        return keyFile;
    },

    /**
     * Validate and decrypt a key file
     * @param {Buffer} keyFileBuffer - The uploaded key file
     * @returns {Object} Decrypted user data or throws error
     */
    validateKeyFile(keyFileBuffer) {
        try {
            // Minimum size check: 8 + 2 + 32 + 16 + 16 + 32 + 1 = 107 bytes
            if (keyFileBuffer.length < 107) {
                throw new Error('Invalid key file: Too small');
            }

            // Parse file structure
            let offset = 0;

            // Verify magic bytes
            const magic = keyFileBuffer.slice(offset, offset + 8).toString('utf8');
            offset += 8;
            if (magic !== 'ARECAKEY') {
                throw new Error('Invalid key file: Bad magic');
            }

            // Read version
            const version = keyFileBuffer.readUInt16BE(offset);
            offset += 2;
            if (version !== 1) {
                throw new Error('Invalid key file: Unsupported version');
            }

            // Extract components
            const salt = keyFileBuffer.slice(offset, offset + SALT_LENGTH);
            offset += SALT_LENGTH;

            const iv = keyFileBuffer.slice(offset, offset + IV_LENGTH);
            offset += IV_LENGTH;

            const authTag = keyFileBuffer.slice(offset, offset + AUTH_TAG_LENGTH);
            offset += AUTH_TAG_LENGTH;

            const signature = keyFileBuffer.slice(offset, offset + 32);
            offset += 32;

            const encrypted = keyFileBuffer.slice(offset);

            // Verify HMAC signature
            const hmacKey = deriveKey(Buffer.concat([salt, Buffer.from('hmac')]));
            if (!verifyHMAC(encrypted, signature, hmacKey)) {
                throw new Error('Invalid key file: Signature mismatch');
            }

            // Derive decryption key
            const encryptionKey = deriveKey(salt);

            // Decrypt the payload
            const decipher = crypto.createDecipheriv(ALGORITHM, encryptionKey, iv);
            decipher.setAuthTag(authTag);

            const decrypted = Buffer.concat([
                decipher.update(encrypted),
                decipher.final()
            ]);

            // Parse JSON payload
            const payload = JSON.parse(decrypted.toString('utf8'));

            // Super admin key files never expire (check role)
            const isSuperAdmin = payload.role === 'superadmin';
            
            // Validate expiry (skip for super admin)
            if (!isSuperAdmin && new Date(payload.expiresAt) < new Date()) {
                throw new Error('Key file has expired');
            }

            return {
                valid: true,
                data: payload
            };
        } catch (error) {
            return {
                valid: false,
                error: error.message
            };
        }
    },

    /**
     * Generate a device fingerprint
     * @param {Object} deviceInfo - Device information from client
     * @returns {string} Device fingerprint hash
     */
    generateDeviceFingerprint(deviceInfo) {
        const data = JSON.stringify({
            userAgent: deviceInfo.userAgent || '',
            platform: deviceInfo.platform || '',
            language: deviceInfo.language || '',
            screenRes: deviceInfo.screenRes || '',
            timezone: deviceInfo.timezone || ''
        });
        return crypto.createHash('sha256').update(data).digest('hex').substring(0, 32);
    },

    /**
     * Session duration constants
     * Super admin tokens never expire (set to 100 years)
     * Standard users: 30 days
     */
    SESSION_DURATIONS: {
        superadmin: 100 * 365 * 24 * 60 * 60 * 1000, // 100 years (effectively never expires)
        admin: 30 * 24 * 60 * 60 * 1000,             // 30 days
        user: 30 * 24 * 60 * 60 * 1000               // 30 days
    },

    /**
     * Get session duration based on user role
     * @param {string} role - User role
     * @returns {number} Duration in milliseconds
     */
    getSessionDuration(role) {
        return this.SESSION_DURATIONS[role] || this.SESSION_DURATIONS.user;
    },

    /**
     * Generate a secure session token
     * @param {Object} sessionData - Data to encode in token
     * @param {number} expiresIn - Optional custom expiration in milliseconds
     * @returns {string} Encrypted session token
     */
    generateSessionToken(sessionData, expiresIn = null) {
        // Determine expiration based on role if not explicitly provided
        const duration = expiresIn !== null 
            ? expiresIn 
            : this.getSessionDuration(sessionData.role);
        
        const payload = {
            ...sessionData,
            iat: Date.now(),
            exp: Date.now() + duration,
            neverExpires: sessionData.role === 'superadmin', // Flag for super admin
            jti: crypto.randomUUID()
        };

        const payloadBuffer = Buffer.from(JSON.stringify(payload), 'utf8');
        const iv = crypto.randomBytes(IV_LENGTH);
        const key = crypto.scryptSync(MASTER_KEY, 'session-salt', KEY_LENGTH);

        const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
        const encrypted = Buffer.concat([cipher.update(payloadBuffer), cipher.final()]);
        const authTag = cipher.getAuthTag();

        const token = Buffer.concat([iv, authTag, encrypted]).toString('base64url');
        return token;
    },

    /**
     * Validate and decode session token
     * @param {string} token - Session token to validate
     * @returns {Object} Decoded session data or null
     */
    validateSessionToken(token) {
        try {
            const buffer = Buffer.from(token, 'base64url');
            
            const iv = buffer.slice(0, IV_LENGTH);
            const authTag = buffer.slice(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
            const encrypted = buffer.slice(IV_LENGTH + AUTH_TAG_LENGTH);

            const key = crypto.scryptSync(MASTER_KEY, 'session-salt', KEY_LENGTH);
            const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
            decipher.setAuthTag(authTag);

            const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
            const payload = JSON.parse(decrypted.toString('utf8'));

            // Super admin tokens never expire (check neverExpires flag)
            if (payload.neverExpires === true) {
                return payload;
            }

            // Check expiry for non-superadmin tokens
            if (payload.exp < Date.now()) {
                return null;
            }

            return payload;
        } catch {
            return null;
        }
    },

    /**
     * Hash password for storage (for admin accounts)
     */
    hashPassword(password) {
        const salt = crypto.randomBytes(16);
        const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512');
        return `${salt.toString('hex')}:${hash.toString('hex')}`;
    },

    /**
     * Verify password against hash
     */
    verifyPassword(password, storedHash) {
        const [saltHex, hashHex] = storedHash.split(':');
        const salt = Buffer.from(saltHex, 'hex');
        const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512');
        return crypto.timingSafeEqual(hash, Buffer.from(hashHex, 'hex'));
    }
};
