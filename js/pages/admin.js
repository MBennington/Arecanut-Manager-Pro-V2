/**
 * Admin Panel Component
 * User management and session monitoring
 */

import { AuthService } from '../services/auth.js';

export const AdminPage = {
    users: [],
    sessions: [],
    activeTab: 'users',

    /**
     * Render the admin panel
     */
    render() {
        return `
            <div id="admin" class="view-section">
                <div class="admin-header">
                    <h2><i class="fas fa-user-shield"></i> Admin Panel</h2>
                    <button class="btn btn-sm btn-inline btn-primary" id="refreshAdminBtn">
                        <i class="fas fa-sync-alt"></i> Refresh
                    </button>
                </div>

                <!-- Stats -->
                <div class="admin-stats" id="adminStats">
                    <div class="admin-stat-card">
                        <div class="icon users"><i class="fas fa-users"></i></div>
                        <div class="info">
                            <h3 id="totalUsers">0</h3>
                            <p>Total Users</p>
                        </div>
                    </div>
                    <div class="admin-stat-card">
                        <div class="icon sessions"><i class="fas fa-desktop"></i></div>
                        <div class="info">
                            <h3 id="totalSessions">0</h3>
                            <p>Active Sessions</p>
                        </div>
                    </div>
                    <div class="admin-stat-card">
                        <div class="icon active"><i class="fas fa-user-clock"></i></div>
                        <div class="info">
                            <h3 id="activeUsers">0</h3>
                            <p>Users Online</p>
                        </div>
                    </div>
                </div>

                <!-- Tabs -->
                <div class="admin-tabs">
                    <button class="admin-tab active" data-tab="users">
                        <i class="fas fa-users"></i> Users
                    </button>
                    <button class="admin-tab" data-tab="sessions">
                        <i class="fas fa-desktop"></i> Active Sessions
                    </button>
                    <button class="admin-tab" data-tab="create">
                        <i class="fas fa-user-plus"></i> Create User
                    </button>
                </div>

                <!-- Users Tab -->
                <div class="admin-tab-content active" id="usersTab">
                    <div id="usersList">
                        <div class="admin-empty">
                            <i class="fas fa-spinner fa-spin"></i>
                            <p>Loading users...</p>
                        </div>
                    </div>
                </div>

                <!-- Sessions Tab -->
                <div class="admin-tab-content" id="sessionsTab">
                    <div id="sessionsList">
                        <div class="admin-empty">
                            <i class="fas fa-spinner fa-spin"></i>
                            <p>Loading sessions...</p>
                        </div>
                    </div>
                </div>

                <!-- Create User Tab -->
                <div class="admin-tab-content" id="createTab">
                    <div class="create-user-form">
                        <h3><i class="fas fa-user-plus"></i> Create New User</h3>
                        <form id="createUserForm">
                            <div class="form-group">
                                <label>Username *</label>
                                <input type="text" class="form-control" id="newUsername" required minlength="3">
                            </div>
                            <div class="form-group">
                                <label>Password *</label>
                                <input type="password" class="form-control" id="newPassword" required minlength="8" placeholder="Min 8 characters">
                                <small class="form-hint">User will use this password to login</small>
                            </div>
                            <div class="form-group">
                                <label>Email</label>
                                <input type="email" class="form-control" id="newEmail">
                            </div>
                            <div class="form-group">
                                <label>Role</label>
                                <select class="form-control" id="newRole">
                                    <option value="user">User</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Device Limit</label>
                                <input type="number" class="form-control" id="newDeviceLimit" value="3" min="1" max="10">
                            </div>
                            <div class="form-group">
                                <label>Key File Expires In (days)</label>
                                <input type="number" class="form-control" id="newExpiresDays" value="365" min="1" max="730">
                            </div>
                            <div class="form-group">
                                <label>Notes</label>
                                <input type="text" class="form-control" id="newNotes" placeholder="Optional notes">
                            </div>
                            <button type="submit" class="btn btn-primary" id="createUserBtn">
                                <i class="fas fa-user-plus"></i> Create User
                            </button>
                        </form>
                    </div>
                </div>

                <!-- Password Modal -->
                <div class="password-modal" id="passwordModal">
                    <div class="password-modal-content">
                        <h3><i class="fas fa-key"></i> Update Password</h3>
                        <p id="passwordModalUser"></p>
                        <form id="updatePasswordForm">
                            <input type="hidden" id="passwordUserId">
                            <div class="form-group">
                                <label>New Password</label>
                                <input type="password" class="form-control" id="newUserPassword" required minlength="8" placeholder="Min 8 characters">
                            </div>
                            <div class="form-group">
                                <label>Confirm Password</label>
                                <input type="password" class="form-control" id="confirmUserPassword" required minlength="8">
                            </div>
                            <div class="modal-actions">
                                <button type="submit" class="btn btn-primary" id="updatePasswordBtn">
                                    <i class="fas fa-save"></i> Update Password
                                </button>
                                <button type="button" class="btn btn-secondary" id="cancelPasswordBtn">
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Initialize admin panel
     */
    async init() {
        this.setupTabListeners();
        this.setupFormListeners();
        await this.loadData();
    },

    /**
     * Setup tab switching
     */
    setupTabListeners() {
        document.querySelectorAll('.admin-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const tabId = tab.dataset.tab;
                this.switchTab(tabId);
            });
        });

        // Refresh button
        document.getElementById('refreshAdminBtn')?.addEventListener('click', () => {
            this.loadData();
        });
    },

    /**
     * Setup form listeners
     */
    setupFormListeners() {
        document.getElementById('createUserForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.createUser();
        });

        // Password modal
        const passwordModal = document.getElementById('passwordModal');
        const updatePasswordForm = document.getElementById('updatePasswordForm');
        const cancelPasswordBtn = document.getElementById('cancelPasswordBtn');

        updatePasswordForm?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.updatePassword();
        });

        cancelPasswordBtn?.addEventListener('click', () => {
            this.hidePasswordModal();
        });

        // Close modal on outside click
        passwordModal?.addEventListener('click', (e) => {
            if (e.target === passwordModal) {
                this.hidePasswordModal();
            }
        });
    },

    /**
     * Switch active tab
     */
    switchTab(tabId) {
        this.activeTab = tabId;

        // Update tab buttons
        document.querySelectorAll('.admin-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabId);
        });

        // Update tab content
        document.querySelectorAll('.admin-tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabId}Tab`)?.classList.add('active');
    },

    /**
     * Load all admin data
     */
    async loadData() {
        try {
            const [usersRes, sessionsRes] = await Promise.all([
                AuthService.getUsers(),
                AuthService.getActiveSessions()
            ]);

            this.users = usersRes.data || [];
            this.sessions = sessionsRes.data || {};

            this.renderStats();
            this.renderUsers();
            this.renderSessions();
        } catch (error) {
            console.error('Failed to load admin data:', error);
        }
    },

    /**
     * Render stats cards
     */
    renderStats() {
        const totalUsers = document.getElementById('totalUsers');
        const totalSessions = document.getElementById('totalSessions');
        const activeUsers = document.getElementById('activeUsers');

        if (totalUsers) totalUsers.textContent = this.users.length;
        if (totalSessions) totalSessions.textContent = this.sessions.totalActiveSessions || 0;
        if (activeUsers) activeUsers.textContent = this.sessions.userStats?.length || 0;
    },

    /**
     * Render users list
     */
    renderUsers() {
        const container = document.getElementById('usersList');
        if (!container) return;

        if (!this.users.length) {
            container.innerHTML = `
                <div class="admin-empty">
                    <i class="fas fa-users"></i>
                    <p>No users found</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.users.map(user => this.renderUserCard(user)).join('');

        // Add action listeners
        container.querySelectorAll('.regenerate-btn').forEach(btn => {
            btn.addEventListener('click', () => this.regenerateKeyFile(btn.dataset.userId));
        });

        container.querySelectorAll('.revoke-btn').forEach(btn => {
            btn.addEventListener('click', () => this.revokeUser(btn.dataset.userId));
        });

        container.querySelectorAll('.password-btn').forEach(btn => {
            btn.addEventListener('click', () => this.showPasswordModal(btn.dataset.userId, btn.dataset.username));
        });
    },

    /**
     * Render single user card
     */
    renderUserCard(user) {
        const initials = user.username.substring(0, 2).toUpperCase();
        const statusClass = user.keyFileRevoked ? 'revoked' : (user.isActive ? 'active' : 'inactive');
        const statusText = user.keyFileRevoked ? 'Revoked' : (user.isActive ? 'Active' : 'Inactive');
        
        const expiresDate = user.keyFileExpiresAt 
            ? new Date(user.keyFileExpiresAt).toLocaleDateString()
            : 'N/A';

        const passwordStatus = user.hasPassword 
            ? '<span class="auth-badge password"><i class="fas fa-lock"></i> Password</span>'
            : '<span class="auth-badge no-password"><i class="fas fa-lock-open"></i> No Password</span>';

        return `
            <div class="user-card">
                <div class="avatar">${initials}</div>
                <div class="user-info">
                    <h4>
                        ${user.username}
                        <span class="role-badge ${user.role}">${user.role}</span>
                    </h4>
                    <p>${user.email || 'No email'}</p>
                    <div class="auth-badges">
                        ${passwordStatus}
                        <span class="auth-badge keyfile"><i class="fas fa-key"></i> Key File</span>
                    </div>
                </div>
                <div class="user-meta">
                    <span><i class="fas fa-desktop"></i> ${user.deviceLimit} devices</span>
                    <span><i class="fas fa-calendar"></i> Key expires: ${expiresDate}</span>
                    <span><i class="fas fa-sign-in-alt"></i> ${user.loginCount || 0} logins</span>
                    <span><span class="status-dot ${statusClass}"></span>${statusText}</span>
                </div>
                <div class="user-actions">
                    <button class="action-btn password password-btn" data-user-id="${user.id}" data-username="${user.username}">
                        <i class="fas fa-key"></i> ${user.hasPassword ? 'Change' : 'Set'} Password
                    </button>
                    <button class="action-btn regenerate regenerate-btn" data-user-id="${user.id}">
                        <i class="fas fa-redo"></i> New Key
                    </button>
                    ${!user.keyFileRevoked ? `
                        <button class="action-btn revoke revoke-btn" data-user-id="${user.id}">
                            <i class="fas fa-ban"></i> Revoke
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    },

    /**
     * Render sessions list
     */
    renderSessions() {
        const container = document.getElementById('sessionsList');
        if (!container) return;

        const sessions = this.sessions.sessions || [];

        if (!sessions.length) {
            container.innerHTML = `
                <div class="admin-empty">
                    <i class="fas fa-desktop"></i>
                    <p>No active sessions</p>
                </div>
            `;
            return;
        }

        container.innerHTML = sessions.map(session => this.renderSessionCard(session)).join('');

        // Add terminate listeners
        container.querySelectorAll('.terminate-btn').forEach(btn => {
            btn.addEventListener('click', () => this.terminateSession(btn.dataset.sessionId));
        });
    },

    /**
     * Render single session card
     */
    renderSessionCard(session) {
        const deviceIcon = session.deviceInfo?.device === 'Mobile' ? 'fa-mobile-alt' : 'fa-desktop';
        const lastActivity = new Date(session.lastActivityAt).toLocaleString();
        const createdAt = new Date(session.createdAt).toLocaleString();

        return `
            <div class="session-card">
                <div class="device-icon">
                    <i class="fas ${deviceIcon}"></i>
                </div>
                <div class="session-info">
                    <h5>${session.user?.username || 'Unknown'}</h5>
                    <p>
                        ${session.deviceInfo?.browser || 'Unknown'} on ${session.deviceInfo?.os || 'Unknown'}
                        ${session.deviceInfo?.ip ? `• ${session.deviceInfo.ip}` : ''}
                    </p>
                    <p>
                        <i class="fas fa-clock"></i> Last active: ${lastActivity}
                    </p>
                </div>
                <button class="terminate-btn" data-session-id="${session.id}">
                    <i class="fas fa-times"></i> Terminate
                </button>
            </div>
        `;
    },

    /**
     * Create new user
     */
    async createUser() {
        const btn = document.getElementById('createUserBtn');
        const originalText = btn.innerHTML;

        const password = document.getElementById('newPassword')?.value;
        if (!password || password.length < 8) {
            alert('Password must be at least 8 characters');
            return;
        }

        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';

        try {
            const userData = {
                username: document.getElementById('newUsername').value,
                password: password,
                email: document.getElementById('newEmail').value || undefined,
                role: document.getElementById('newRole').value,
                deviceLimit: parseInt(document.getElementById('newDeviceLimit').value),
                expiresInDays: parseInt(document.getElementById('newExpiresDays').value),
                notes: document.getElementById('newNotes').value || undefined
            };

            const result = await AuthService.createUser(userData);

            // Download key file as backup
            if (result.data.keyFile) {
                const downloadKey = confirm(`User "${userData.username}" created!\n\nWould you also like to download a backup key file?`);
                if (downloadKey) {
                    AuthService.downloadKeyFile(result.data.keyFile, result.data.keyFileName);
                }
            } else {
                alert(`User "${userData.username}" created!\nThey can now login with their username and password.`);
            }

            // Reset form
            document.getElementById('createUserForm').reset();

            // Reload users
            await this.loadData();
            this.switchTab('users');

        } catch (error) {
            alert('Error: ' + error.message);
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    },

    /**
     * Regenerate user's key file
     */
    async regenerateKeyFile(userId) {
        if (!confirm('Regenerate key file? This will invalidate the old key.')) return;

        try {
            const result = await AuthService.regenerateKeyFile(userId);
            AuthService.downloadKeyFile(result.data.keyFile, result.data.keyFileName);
            alert('New key file generated and downloaded.');
            await this.loadData();
        } catch (error) {
            alert('Error: ' + error.message);
        }
    },

    /**
     * Revoke user's key file
     */
    async revokeUser(userId) {
        const reason = prompt('Enter reason for revocation:');
        if (reason === null) return;

        try {
            await AuthService.revokeKeyFile(userId, reason);
            alert('Key file revoked. User has been logged out.');
            await this.loadData();
        } catch (error) {
            alert('Error: ' + error.message);
        }
    },

    /**
     * Terminate a session
     */
    async terminateSession(sessionId) {
        if (!confirm('Terminate this session?')) return;

        try {
            await AuthService.terminateSession(sessionId);
            await this.loadData();
        } catch (error) {
            alert('Error: ' + error.message);
        }
    },

    /**
     * Show password modal
     */
    showPasswordModal(userId, username) {
        const modal = document.getElementById('passwordModal');
        const userLabel = document.getElementById('passwordModalUser');
        const userIdInput = document.getElementById('passwordUserId');
        const passwordInput = document.getElementById('newUserPassword');
        const confirmInput = document.getElementById('confirmUserPassword');

        if (userLabel) userLabel.textContent = `Set password for: ${username}`;
        if (userIdInput) userIdInput.value = userId;
        if (passwordInput) passwordInput.value = '';
        if (confirmInput) confirmInput.value = '';

        modal?.classList.add('active');
        passwordInput?.focus();
    },

    /**
     * Hide password modal
     */
    hidePasswordModal() {
        const modal = document.getElementById('passwordModal');
        modal?.classList.remove('active');
    },

    /**
     * Update user password
     */
    async updatePassword() {
        const userId = document.getElementById('passwordUserId')?.value;
        const password = document.getElementById('newUserPassword')?.value;
        const confirm = document.getElementById('confirmUserPassword')?.value;
        const btn = document.getElementById('updatePasswordBtn');

        if (!password || password.length < 8) {
            alert('Password must be at least 8 characters');
            return;
        }

        if (password !== confirm) {
            alert('Passwords do not match');
            return;
        }

        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';

        try {
            await AuthService.updateUserPassword(userId, password);
            alert('Password updated successfully');
            this.hidePasswordModal();
            await this.loadData();
        } catch (error) {
            alert('Error: ' + error.message);
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    }
};
