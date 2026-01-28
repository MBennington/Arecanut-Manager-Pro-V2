/**
 * Authentication Service
 * Handles key file authentication and session management
 * Uses localStorage for persistent "stay logged in" functionality
 */

// Use relative URL in production, localhost in development
const API_BASE = window.location.hostname === 'localhost' 
    ? 'http://localhost:5000/api' 
    : '/api';
const TOKEN_KEY = 'areca_session_token';
const USER_KEY = 'areca_user';
const EXPIRES_KEY = 'areca_session_expires';
const NEVER_EXPIRES_KEY = 'areca_never_expires';

// Migration flag to track if we've cleaned up old sessionStorage data
const MIGRATED_KEY = 'areca_migrated_v2';

export const AuthService = {
    /**
     * Initialize - clean up old sessionStorage data (one-time migration)
     */
    _migrate() {
        if (!localStorage.getItem(MIGRATED_KEY)) {
            // Clear old sessionStorage data from previous version
            sessionStorage.removeItem(TOKEN_KEY);
            sessionStorage.removeItem(USER_KEY);
            // Mark as migrated
            localStorage.setItem(MIGRATED_KEY, 'true');
        }
    },

    /**
     * Check if user is authenticated
     * Validates token exists and hasn't expired locally
     */
    isAuthenticated() {
        // Run migration check
        this._migrate();
        
        const token = this.getToken();
        const user = this.getUser();
        
        if (!token || !user) {
            return false;
        }

        // Check if session has expired locally (for non-superadmin users)
        const neverExpires = localStorage.getItem(NEVER_EXPIRES_KEY) === 'true';
        if (!neverExpires) {
            const expiresAt = localStorage.getItem(EXPIRES_KEY);
            // Only check expiration if we have a stored expiration date
            if (expiresAt) {
                try {
                    const expiryDate = new Date(expiresAt);
                    if (expiryDate < new Date()) {
                        // Session expired, clear auth data
                        this.clearAuth();
                        return false;
                    }
                } catch {
                    // Invalid date format, clear and return false
                    this.clearAuth();
                    return false;
                }
            }
        }

        return true;
    },

    /**
     * Get stored token
     * Uses localStorage for persistent login across browser sessions
     */
    getToken() {
        return localStorage.getItem(TOKEN_KEY);
    },

    /**
     * Get stored user data
     */
    getUser() {
        try {
            const data = localStorage.getItem(USER_KEY);
            return data ? JSON.parse(data) : null;
        } catch {
            return null;
        }
    },

    /**
     * Store authentication data
     * Saves to localStorage to persist across browser sessions
     * @param {string} token - Session token
     * @param {Object} user - User data
     * @param {string|Date} expiresAt - Date or ISO string when session expires
     * @param {boolean} neverExpires - If true, session never expires (super admin)
     */
    setAuth(token, user, expiresAt = null, neverExpires = false) {
        // Clear all old data first to ensure clean state
        this.clearAuth();
        
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(USER_KEY, JSON.stringify(user));
        
        // Store expiration as ISO string
        if (expiresAt) {
            const expiryStr = expiresAt instanceof Date 
                ? expiresAt.toISOString() 
                : String(expiresAt);
            localStorage.setItem(EXPIRES_KEY, expiryStr);
        }
        
        localStorage.setItem(NEVER_EXPIRES_KEY, neverExpires ? 'true' : 'false');
    },

    /**
     * Clear authentication data
     */
    clearAuth() {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        localStorage.removeItem(EXPIRES_KEY);
        localStorage.removeItem(NEVER_EXPIRES_KEY);
        // Also clear any old sessionStorage data
        sessionStorage.removeItem(TOKEN_KEY);
        sessionStorage.removeItem(USER_KEY);
    },

    /**
     * Get device information for fingerprinting
     */
    getDeviceInfo() {
        return {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
            screenRes: `${screen.width}x${screen.height}`,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        };
    },

    /**
     * Login with key file
     * @param {File} keyFile - The uploaded key file
     */
    async login(keyFile) {
        // Read file as base64
        const base64 = await this.fileToBase64(keyFile);

        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                keyFile: base64,
                deviceInfo: this.getDeviceInfo()
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Login failed');
        }

        // Store auth data with expiration info for persistent login
        this.setAuth(
            data.data.token, 
            data.data.user, 
            data.data.expiresAt,
            data.data.neverExpires || false
        );

        return data.data;
    },

    /**
     * Login with username and password
     * @param {string} username - The username
     * @param {string} password - The password
     */
    async loginWithPassword(username, password) {
        const response = await fetch(`${API_BASE}/auth/login/password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username,
                password,
                deviceInfo: this.getDeviceInfo()
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Login failed');
        }

        // Store auth data with expiration info for persistent login
        this.setAuth(
            data.data.token, 
            data.data.user, 
            data.data.expiresAt,
            data.data.neverExpires || false
        );

        return data.data;
    },

    /**
     * Logout current session
     */
    async logout() {
        try {
            const token = this.getToken();
            if (token) {
                await fetch(`${API_BASE}/auth/logout`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
            }
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            this.clearAuth();
        }
    },

    /**
     * Logout from all devices
     */
    async logoutAll() {
        try {
            const token = this.getToken();
            if (token) {
                await fetch(`${API_BASE}/auth/logout-all`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
            }
        } catch (error) {
            console.error('Logout all error:', error);
        } finally {
            this.clearAuth();
        }
    },

    /**
     * Get current user info from server
     */
    async getCurrentUser() {
        const token = this.getToken();
        if (!token) return null;

        const response = await fetch(`${API_BASE}/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            if (response.status === 401) {
                this.clearAuth();
            }
            return null;
        }

        const data = await response.json();
        return data.data;
    },

    /**
     * Make authenticated request
     */
    async request(endpoint, options = {}) {
        const token = this.getToken();
        const hadToken = !!token;
        
        const config = {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                ...options.headers
            }
        };

        const response = await fetch(`${API_BASE}${endpoint}`, config);
        const data = await response.json();

        if (response.status === 401) {
            this.clearAuth();
            // Only dispatch auth:expired if user was logged in (had a token)
            if (hadToken) {
                window.dispatchEvent(new CustomEvent('auth:expired'));
            }
        }

        if (!response.ok) {
            throw new Error(data.error || 'Request failed');
        }

        return data;
    },

    // Admin functions
    /**
     * Initialize superadmin (first time setup)
     */
    async initializeSuperAdmin(username, email, password) {
        const response = await fetch(`${API_BASE}/auth/init`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Initialization failed');
        }

        return data.data;
    },

    /**
     * Create new user (admin only)
     */
    async createUser(userData) {
        return this.request('/auth/users', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    },

    /**
     * Get all users (admin only)
     */
    async getUsers() {
        return this.request('/auth/users');
    },

    /**
     * Get active sessions (admin only)
     */
    async getActiveSessions() {
        return this.request('/auth/sessions');
    },

    /**
     * Revoke user's key file (admin only)
     */
    async revokeKeyFile(userId, reason) {
        return this.request(`/auth/users/${userId}/revoke`, {
            method: 'POST',
            body: JSON.stringify({ reason })
        });
    },

    /**
     * Update user password (admin only)
     */
    async updateUserPassword(userId, password) {
        return this.request(`/auth/users/${userId}/password`, {
            method: 'POST',
            body: JSON.stringify({ password })
        });
    },

    /**
     * Remove user password (admin only)
     */
    async removeUserPassword(userId) {
        return this.request(`/auth/users/${userId}/password`, {
            method: 'POST',
            body: JSON.stringify({ removePassword: true })
        });
    },

    /**
     * Regenerate key file (admin only)
     */
    async regenerateKeyFile(userId, expiresInDays = 365) {
        return this.request(`/auth/users/${userId}/regenerate`, {
            method: 'POST',
            body: JSON.stringify({ expiresInDays })
        });
    },

    /**
     * Terminate session (admin only)
     */
    async terminateSession(sessionId) {
        return this.request(`/auth/sessions/${sessionId}`, {
            method: 'DELETE'
        });
    },

    /**
     * Download key file
     */
    downloadKeyFile(base64Data, filename) {
        const binary = atob(base64Data);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        
        const blob = new Blob([bytes], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    /**
     * Convert file to base64
     */
    /**
     * Convert file to base64 (Safari compatible)
     */
    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = () => {
                try {
                    // Handle both data URL and raw base64
                    const result = reader.result;
                    const base64 = result.includes(',') 
                        ? result.split(',')[1] 
                        : result;
                    resolve(base64);
                } catch (e) {
                    reject(new Error('Failed to process file'));
                }
            };
            
            reader.onerror = () => {
                reject(new Error('Failed to read file'));
            };
            
            // Safari sometimes needs a slight delay
            setTimeout(() => {
                try {
                    reader.readAsDataURL(file);
                } catch (e) {
                    reject(new Error('Browser does not support file reading'));
                }
            }, 10);
        });
    }
};
