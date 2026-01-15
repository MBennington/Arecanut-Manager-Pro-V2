/**
 * API Service
 * Handles all HTTP requests to the backend with authentication
 */

// Use relative URL in production, localhost in development
const API_BASE = window.location.hostname === 'localhost' 
    ? 'http://localhost:5000/api' 
    : '/api';
const TOKEN_KEY = 'areca_session_token';

/**
 * Get stored auth token
 */
function getToken() {
    return sessionStorage.getItem(TOKEN_KEY);
}

/**
 * Generic fetch wrapper with authentication and error handling
 */
async function request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const token = getToken();
    
    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            ...options.headers
        },
        ...options
    };

    try {
        const response = await fetch(url, config);
        const data = await response.json();
        
        if (!response.ok) {
            // Handle auth expiration
            if (response.status === 401) {
                sessionStorage.removeItem(TOKEN_KEY);
                sessionStorage.removeItem('areca_user');
                window.dispatchEvent(new CustomEvent('auth:expired'));
            }
            throw new Error(data.error || 'Request failed');
        }
        
        return data;
    } catch (error) {
        console.error(`API Error [${endpoint}]:`, error.message);
        throw error;
    }
}

export const ApiService = {
    // Transaction CRUD
    async getTransactions(params = {}) {
        const query = new URLSearchParams(params).toString();
        const endpoint = query ? `/transactions?${query}` : '/transactions';
        return request(endpoint);
    },

    async getTransaction(id) {
        return request(`/transactions/${id}`);
    },

    async createTransaction(data) {
        return request('/transactions', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    async updateTransaction(id, data) {
        return request(`/transactions/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },

    async deleteTransaction(id) {
        return request(`/transactions/${id}`, {
            method: 'DELETE'
        });
    },

    async deleteAllTransactions() {
        return request('/transactions', {
            method: 'DELETE'
        });
    },

    // Stats & Analytics
    async getStats() {
        return request('/transactions/stats');
    },

    async getAnalytics(type) {
        return request(`/transactions/analytics/${type}`);
    },

    // Health check (no auth required)
    async checkHealth() {
        const response = await fetch(`${API_BASE}/health`);
        if (!response.ok) throw new Error('Health check failed');
        return response.json();
    }
};
