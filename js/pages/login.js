/**
 * Login Page Component
 * Supports both Key File and Username/Password authentication
 */

import { AuthService } from '../services/auth.js';

export const LoginPage = {
    selectedFile: null,
    isLoading: false,
    activeTab: 'password', // 'password' or 'keyfile'

    /**
     * Render the login page
     */
    render() {
        return `
            <div class="auth-container" id="loginPage">
                <div class="login-card">
                    <div class="login-logo">
                        <i class="fas fa-seedling"></i>
                        <h1>Areca Pro</h1>
                        <p>Secure Authentication</p>
                    </div>

                    <div id="loginError" class="login-error" style="display: none;">
                        <i class="fas fa-exclamation-circle"></i>
                        <span id="errorMessage"></span>
                    </div>

                    <!-- Auth Method Tabs -->
                    <div class="auth-tabs">
                        <button class="auth-tab active" data-tab="password">
                            <i class="fas fa-lock"></i>
                            <span>Password</span>
                        </button>
                        <button class="auth-tab" data-tab="keyfile">
                            <i class="fas fa-key"></i>
                            <span>Key File</span>
                        </button>
                    </div>

                    <!-- Password Login Form -->
                    <div class="auth-panel active" id="passwordPanel">
                        <form id="passwordForm">
                            <div class="form-group">
                                <label for="loginUsername">
                                    <i class="fas fa-user"></i> Username
                                </label>
                                <input type="text" 
                                       class="form-control" 
                                       id="loginUsername" 
                                       placeholder="Enter your username"
                                       autocomplete="username"
                                       required>
                            </div>
                            <div class="form-group">
                                <label for="loginPassword">
                                    <i class="fas fa-lock"></i> Password
                                </label>
                                <div class="password-input-wrapper">
                                    <input type="password" 
                                           class="form-control" 
                                           id="loginPassword" 
                                           placeholder="Enter your password"
                                           autocomplete="current-password"
                                           required>
                                    <button type="button" class="toggle-password" id="togglePassword">
                                        <i class="fas fa-eye"></i>
                                    </button>
                                </div>
                            </div>
                            <button type="submit" class="login-btn primary" id="passwordLoginBtn">
                                <i class="fas fa-sign-in-alt"></i>
                                <span>Sign In</span>
                            </button>
                        </form>
                    </div>

                    <!-- Key File Login -->
                    <div class="auth-panel" id="keyfilePanel">
                        <div class="key-upload-zone" id="uploadZone">
                            <input type="file" id="keyFileInput" accept=".akey,.key">
                            <i class="fas fa-key"></i>
                            <h3>Drop your key file here</h3>
                            <p>or click to browse</p>
                            <div class="file-name" id="fileName" style="display: none;">
                                <i class="fas fa-check-circle"></i>
                                <span id="selectedFileName"></span>
                            </div>
                        </div>

                        <button class="login-btn primary" id="keyfileLoginBtn" disabled>
                            <i class="fas fa-sign-in-alt"></i>
                            <span>Authenticate</span>
                        </button>
                    </div>

                    <div class="security-info">
                        <i class="fas fa-shield-alt"></i>
                        <p>Your credentials are encrypted and securely transmitted.</p>
                    </div>

                    <div class="setup-section" id="setupSection">
                        <p>First time? Set up your admin account</p>
                        <button class="setup-btn" id="setupBtn">
                            <i class="fas fa-cog"></i> Initialize System
                        </button>
                    </div>
                </div>

                <!-- Setup Modal -->
                <div class="setup-modal" id="setupModal">
                    <div class="setup-modal-content">
                        <h2><i class="fas fa-user-shield"></i> Create Superadmin</h2>
                        <form id="setupForm">
                            <div class="form-group">
                                <label>Username</label>
                                <input type="text" class="form-control" id="setupUsername" required minlength="3">
                            </div>
                            <div class="form-group">
                                <label>Email (optional)</label>
                                <input type="email" class="form-control" id="setupEmail">
                            </div>
                            <div class="form-group">
                                <label>Admin Password</label>
                                <input type="password" class="form-control" id="setupPassword" required minlength="8">
                                <small class="form-hint">Min 8 characters. This will be your login password.</small>
                            </div>
                            <button type="submit" class="btn btn-primary" id="createAdminBtn">
                                Create Admin Account
                            </button>
                            <button type="button" class="btn btn-secondary" id="cancelSetupBtn" style="margin-top: 10px;">
                                Cancel
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Initialize event listeners
     */
    init(onLoginSuccess) {
        this.onLoginSuccess = onLoginSuccess;
        this.setupEventListeners();
    },

    /**
     * Setup all event listeners
     */
    setupEventListeners() {
        // Tab switching
        const tabs = document.querySelectorAll('.auth-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
        });

        // Password form
        const passwordForm = document.getElementById('passwordForm');
        passwordForm?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handlePasswordLogin();
        });

        // Toggle password visibility
        const togglePassword = document.getElementById('togglePassword');
        togglePassword?.addEventListener('click', () => this.togglePasswordVisibility());

        // Key file upload
        const uploadZone = document.getElementById('uploadZone');
        const fileInput = document.getElementById('keyFileInput');
        const keyfileLoginBtn = document.getElementById('keyfileLoginBtn');

        // File upload zone click (Safari compatible)
        uploadZone?.addEventListener('click', (e) => {
            if (e.target === fileInput) return;
            fileInput?.click();
        });

        // Touch support for mobile Safari
        uploadZone?.addEventListener('touchend', (e) => {
            if (e.target === fileInput) return;
            e.preventDefault();
            fileInput?.click();
        });

        // File input change
        fileInput?.addEventListener('change', (e) => {
            if (e.target.files?.length) {
                this.handleFileSelect(e.target.files[0]);
            }
        });

        // Drag and drop (Safari compatible)
        uploadZone?.addEventListener('dragenter', (e) => {
            e.preventDefault();
            e.stopPropagation();
            uploadZone.classList.add('dragover');
        });

        uploadZone?.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            uploadZone.classList.add('dragover');
        });

        uploadZone?.addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!uploadZone.contains(e.relatedTarget)) {
                uploadZone.classList.remove('dragover');
            }
        });

        uploadZone?.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            uploadZone.classList.remove('dragover');
            if (e.dataTransfer?.files?.length) {
                this.handleFileSelect(e.dataTransfer.files[0]);
            }
        });

        // Key file login button
        keyfileLoginBtn?.addEventListener('click', () => this.handleKeyFileLogin());

        // Setup button
        const setupBtn = document.getElementById('setupBtn');
        const setupModal = document.getElementById('setupModal');
        const setupForm = document.getElementById('setupForm');
        const cancelSetupBtn = document.getElementById('cancelSetupBtn');

        setupBtn?.addEventListener('click', () => {
            setupModal?.classList.add('active');
        });

        cancelSetupBtn?.addEventListener('click', () => {
            setupModal?.classList.remove('active');
        });

        setupForm?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSetup();
        });

        setupModal?.addEventListener('click', (e) => {
            if (e.target === setupModal) {
                setupModal.classList.remove('active');
            }
        });
    },

    /**
     * Switch between auth tabs
     */
    switchTab(tab) {
        this.activeTab = tab;
        
        // Update tab buttons
        document.querySelectorAll('.auth-tab').forEach(t => {
            t.classList.toggle('active', t.dataset.tab === tab);
        });

        // Update panels
        document.getElementById('passwordPanel')?.classList.toggle('active', tab === 'password');
        document.getElementById('keyfilePanel')?.classList.toggle('active', tab === 'keyfile');

        this.hideError();
    },

    /**
     * Toggle password visibility
     */
    togglePasswordVisibility() {
        const passwordInput = document.getElementById('loginPassword');
        const toggleBtn = document.getElementById('togglePassword');
        
        if (passwordInput && toggleBtn) {
            const isPassword = passwordInput.type === 'password';
            passwordInput.type = isPassword ? 'text' : 'password';
            toggleBtn.innerHTML = `<i class="fas fa-eye${isPassword ? '-slash' : ''}"></i>`;
        }
    },

    /**
     * Handle password login
     */
    async handlePasswordLogin() {
        if (this.isLoading) return;

        const username = document.getElementById('loginUsername')?.value?.trim();
        const password = document.getElementById('loginPassword')?.value;
        const loginBtn = document.getElementById('passwordLoginBtn');

        if (!username || !password) {
            this.showError('Please enter username and password');
            return;
        }

        this.isLoading = true;
        if (loginBtn) {
            loginBtn.disabled = true;
            loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Signing in...</span>';
        }

        try {
            const result = await AuthService.loginWithPassword(username, password);
            
            if (this.onLoginSuccess) {
                this.onLoginSuccess(result);
            }
        } catch (error) {
            this.showError(error.message);
            
            if (loginBtn) {
                loginBtn.disabled = false;
                loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> <span>Sign In</span>';
            }
        } finally {
            this.isLoading = false;
        }
    },

    /**
     * Handle file selection
     */
    handleFileSelect(file) {
        if (!file.name.endsWith('.akey') && !file.name.endsWith('.key')) {
            this.showError('Invalid file type. Please select a .akey file.');
            return;
        }

        this.selectedFile = file;
        
        const uploadZone = document.getElementById('uploadZone');
        const fileName = document.getElementById('fileName');
        const selectedFileName = document.getElementById('selectedFileName');
        const loginBtn = document.getElementById('keyfileLoginBtn');

        uploadZone?.classList.add('has-file');
        if (fileName) fileName.style.display = 'flex';
        if (selectedFileName) selectedFileName.textContent = file.name;
        if (loginBtn) loginBtn.disabled = false;

        this.hideError();
    },

    /**
     * Handle key file login
     */
    async handleKeyFileLogin() {
        if (!this.selectedFile || this.isLoading) return;

        const loginBtn = document.getElementById('keyfileLoginBtn');
        
        this.isLoading = true;
        if (loginBtn) {
            loginBtn.disabled = true;
            loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Authenticating...</span>';
        }

        try {
            const result = await AuthService.login(this.selectedFile);
            
            if (this.onLoginSuccess) {
                this.onLoginSuccess(result);
            }
        } catch (error) {
            this.showError(error.message);
            
            if (loginBtn) {
                loginBtn.disabled = false;
                loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> <span>Authenticate</span>';
            }
        } finally {
            this.isLoading = false;
        }
    },

    /**
     * Handle system initialization
     */
    async handleSetup() {
        const username = document.getElementById('setupUsername')?.value;
        const email = document.getElementById('setupEmail')?.value;
        const password = document.getElementById('setupPassword')?.value;
        const createBtn = document.getElementById('createAdminBtn');

        if (!username || !password) return;

        if (createBtn) {
            createBtn.disabled = true;
            createBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
        }

        try {
            const result = await AuthService.initializeSuperAdmin(username, email, password);
            
            // Download the key file if provided
            if (result.keyFile) {
                AuthService.downloadKeyFile(result.keyFile, result.keyFileName);
            }

            document.getElementById('setupModal')?.classList.remove('active');
            alert(`Admin account "${username}" created!\nYou can now login with your username and password.${result.keyFile ? '\n\nA backup key file has also been downloaded.' : ''}`);
            
            const setupSection = document.getElementById('setupSection');
            if (setupSection) setupSection.style.display = 'none';

            // Pre-fill username
            const usernameInput = document.getElementById('loginUsername');
            if (usernameInput) usernameInput.value = username;

        } catch (error) {
            alert(error.message);
        } finally {
            if (createBtn) {
                createBtn.disabled = false;
                createBtn.innerHTML = 'Create Admin Account';
            }
        }
    },

    /**
     * Show error message
     */
    showError(message) {
        const errorDiv = document.getElementById('loginError');
        const errorMsg = document.getElementById('errorMessage');
        
        if (errorDiv && errorMsg) {
            errorMsg.textContent = message;
            errorDiv.style.display = 'flex';
        }
    },

    /**
     * Hide error message
     */
    hideError() {
        const errorDiv = document.getElementById('loginError');
        if (errorDiv) errorDiv.style.display = 'none';
    },

    /**
     * Reset the login form
     */
    reset() {
        this.selectedFile = null;
        this.isLoading = false;

        // Reset password form
        document.getElementById('passwordForm')?.reset();

        // Reset key file upload
        const uploadZone = document.getElementById('uploadZone');
        const fileName = document.getElementById('fileName');
        const keyfileLoginBtn = document.getElementById('keyfileLoginBtn');
        const fileInput = document.getElementById('keyFileInput');
        const passwordLoginBtn = document.getElementById('passwordLoginBtn');

        uploadZone?.classList.remove('has-file');
        if (fileName) fileName.style.display = 'none';
        if (keyfileLoginBtn) {
            keyfileLoginBtn.disabled = true;
            keyfileLoginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> <span>Authenticate</span>';
        }
        if (passwordLoginBtn) {
            passwordLoginBtn.disabled = false;
            passwordLoginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> <span>Sign In</span>';
        }
        if (fileInput) fileInput.value = '';

        this.hideError();
    }
};
