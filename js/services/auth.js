/**
 * Authentication Service
 * Handles key file authentication and session management
 */

// Use relative URL in production, localhost in development
const API_BASE = window.location.hostname === 'localhost' 
    ? 'http://localhost:5000/api' 
    : '/api';
const TOKEN_KEY = 'areca_session_token';
const USER_KEY = 'areca_user';

export const AuthService = {
    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        const token = this.getToken();
        const user = this.getUser();
        return !!(token && user);
    },

    /**
     * Get stored token
     */
    getToken() {
        return sessionStorage.getItem(TOKEN_KEY);
    },

    /**
     * Get stored user data
     */
    getUser() {
        try {
            const data = sessionStorage.getItem(USER_KEY);
            return data ? JSON.parse(data) : null;
        } catch {
            return null;
        }
    },

    /**
     * Store authentication data
     */
    setAuth(token, user) {
        sessionStorage.setItem(TOKEN_KEY, token);
        sessionStorage.setItem(USER_KEY, JSON.stringify(user));
    },

    /**
     * Clear authentication data
     */
    clearAuth() {
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

        // Store auth data
        this.setAuth(data.data.token, data.data.user);

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
            window.dispatchEvent(new CustomEvent('auth:expired'));
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
    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const base64 = reader.result.split(',')[1] || reader.result;
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }
};
