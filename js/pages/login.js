/**
 * Login Page Component
 * Key file upload authentication
 */

import { AuthService } from '../services/auth.js';

export const LoginPage = {
    selectedFile: null,
    isLoading: false,

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
                        <p>Secure Key File Authentication</p>
                    </div>

                    <div id="loginError" class="login-error" style="display: none;">
                        <i class="fas fa-exclamation-circle"></i>
                        <span id="errorMessage"></span>
                    </div>

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

                    <button class="login-btn primary" id="loginBtn" disabled>
                        <i class="fas fa-sign-in-alt"></i>
                        <span>Authenticate</span>
                    </button>

                    <div class="security-info">
                        <i class="fas fa-shield-alt"></i>
                        <p>Your key file is encrypted with AES-256-GCM and never leaves your device unencrypted.</p>
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
                            </div>
                            <button type="submit" class="btn btn-primary" id="createAdminBtn">
                                Create & Download Key File
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
        const uploadZone = document.getElementById('uploadZone');
        const fileInput = document.getElementById('keyFileInput');
        const loginBtn = document.getElementById('loginBtn');
        const setupBtn = document.getElementById('setupBtn');
        const setupModal = document.getElementById('setupModal');
        const setupForm = document.getElementById('setupForm');
        const cancelSetupBtn = document.getElementById('cancelSetupBtn');

        // File upload zone click (Safari compatible)
        uploadZone?.addEventListener('click', (e) => {
            // Prevent double triggers
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

        // Drag and drop (Safari compatible - needs dragenter)
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
            // Only remove class if leaving the zone entirely
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

        // Login button
        loginBtn?.addEventListener('click', () => this.handleLogin());

        // Setup button
        setupBtn?.addEventListener('click', () => {
            setupModal?.classList.add('active');
        });

        // Cancel setup
        cancelSetupBtn?.addEventListener('click', () => {
            setupModal?.classList.remove('active');
        });

        // Setup form submit
        setupForm?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSetup();
        });

        // Close modal on outside click
        setupModal?.addEventListener('click', (e) => {
            if (e.target === setupModal) {
                setupModal.classList.remove('active');
            }
        });
    },

    /**
     * Handle file selection
     */
    handleFileSelect(file) {
        // Validate file type
        if (!file.name.endsWith('.akey') && !file.name.endsWith('.key')) {
            this.showError('Invalid file type. Please select a .akey file.');
            return;
        }

        this.selectedFile = file;
        
        // Update UI
        const uploadZone = document.getElementById('uploadZone');
        const fileName = document.getElementById('fileName');
        const selectedFileName = document.getElementById('selectedFileName');
        const loginBtn = document.getElementById('loginBtn');

        uploadZone?.classList.add('has-file');
        if (fileName) fileName.style.display = 'flex';
        if (selectedFileName) selectedFileName.textContent = file.name;
        if (loginBtn) loginBtn.disabled = false;

        this.hideError();
    },

    /**
     * Handle login submission
     */
    async handleLogin() {
        if (!this.selectedFile || this.isLoading) return;

        const loginBtn = document.getElementById('loginBtn');
        
        this.isLoading = true;
        if (loginBtn) {
            loginBtn.disabled = true;
            loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Authenticating...</span>';
        }

        try {
            const result = await AuthService.login(this.selectedFile);
            
            // Success - call callback
            if (this.onLoginSuccess) {
                this.onLoginSuccess(result);
            }
        } catch (error) {
            this.showError(error.message);
            
            // Reset button
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
            
            // Download the key file
            AuthService.downloadKeyFile(result.keyFile, result.keyFileName);

            // Close modal and show success
            document.getElementById('setupModal')?.classList.remove('active');
            alert('Superadmin created! Your key file has been downloaded. Keep it safe!');
            
            // Hide setup section
            const setupSection = document.getElementById('setupSection');
            if (setupSection) setupSection.style.display = 'none';

        } catch (error) {
            alert(error.message);
        } finally {
            if (createBtn) {
                createBtn.disabled = false;
                createBtn.innerHTML = 'Create & Download Key File';
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

        const uploadZone = document.getElementById('uploadZone');
        const fileName = document.getElementById('fileName');
        const loginBtn = document.getElementById('loginBtn');
        const fileInput = document.getElementById('keyFileInput');

        uploadZone?.classList.remove('has-file');
        if (fileName) fileName.style.display = 'none';
        if (loginBtn) {
            loginBtn.disabled = true;
            loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> <span>Authenticate</span>';
        }
        if (fileInput) fileInput.value = '';

        this.hideError();
    }
};
