/**
 * Main Application Entry Point
 * Arecanut Manager Pro with Authentication
 * 
 * This file orchestrates all components, handles authentication,
 * and manages the application lifecycle.
 */

import { AuthService } from './services/auth.js';
import { Sidebar } from './components/sidebar.js';
import { Header } from './components/header.js';
import { DashboardPage } from './pages/dashboard.js';
import { DecisionPage } from './pages/decision.js';
import { FormsPage } from './pages/forms.js';
import { HistoryPage } from './pages/history.js';
import { LoginPage } from './pages/login.js';
import { AdminPage } from './pages/admin.js';

/**
 * Main Application Controller
 */
const App = {
    currentSection: 'dashboard',
    isAuthenticated: false,
    currentUser: null,

    /**
     * Initialize the application
     */
    async init() {
        console.log('🌴 Arecanut Manager Pro v2.0 - Initializing...');
        
        // Check authentication status
        this.isAuthenticated = AuthService.isAuthenticated();
        this.currentUser = AuthService.getUser();

        // Listen for auth expiration
        window.addEventListener('auth:expired', () => {
            this.handleAuthExpired();
        });

        if (this.isAuthenticated) {
            // Verify session is still valid on server
            try {
                const userData = await AuthService.getCurrentUser();
                if (userData) {
                    this.currentUser = userData.user;
                    this.renderMainApp();
                } else {
                    this.renderLoginPage();
                }
            } catch {
                this.renderLoginPage();
            }
        } else {
            this.renderLoginPage();
        }
        
        console.log('✅ Application ready');
    },

    /**
     * Render the login page
     */
    renderLoginPage() {
        const appRoot = document.getElementById('appRoot');
        appRoot.innerHTML = LoginPage.render();
        
        LoginPage.init((result) => {
            this.handleLoginSuccess(result);
        });
    },

    /**
     * Handle successful login
     */
    handleLoginSuccess(result) {
        this.isAuthenticated = true;
        this.currentUser = result.user;
        this.renderMainApp();
    },

    /**
     * Handle auth expiration
     */
    handleAuthExpired() {
        alert('Your session has expired. Please log in again.');
        this.isAuthenticated = false;
        this.currentUser = null;
        this.renderLoginPage();
    },

    /**
     * Render the main application
     */
    renderMainApp() {
        const appRoot = document.getElementById('appRoot');
        
        // Build main app layout
        appRoot.innerHTML = `
            <!-- Mobile Overlay -->
            <div class="overlay" id="overlay"></div>

            <!-- Sidebar Component -->
            <nav class="sidebar" id="sidebar">
                <div class="brand">
                    <i class="fas fa-seedling"></i>
                    <span>Areca Pro</span>
                </div>
                <ul class="nav-links" id="navLinks">
                    <!-- Navigation items injected by JavaScript -->
                </ul>
                <div class="sidebar-footer">
                    <div style="margin-bottom: 10px; font-size: 0.85rem;">
                        <i class="fas fa-user"></i> ${this.currentUser?.username || 'User'}
                    </div>
                    <button id="logoutBtn" style="background: rgba(255,255,255,0.1); border: none; color: white; padding: 8px 15px; border-radius: 6px; cursor: pointer; width: 100%; font-size: 0.85rem;">
                        <i class="fas fa-sign-out-alt"></i> Logout
                    </button>
                </div>
            </nav>

            <!-- Main Content Area -->
            <main class="main-content">
                <!-- Header Component -->
                <header class="header">
                    <div class="header-left">
                        <button class="menu-toggle" id="menuToggle">
                            <i class="fas fa-bars"></i>
                        </button>
                        <h1 class="page-title" id="pageTitle">Dashboard</h1>
                    </div>
                    <div class="header-stats">
                        <div class="header-cash" id="cashDisplay">LKR 0</div>
                        <div class="header-stock">
                            <span title="Raw Stock">
                                <i class="fas fa-leaf"></i>
                                <span id="headerRaw">0</span>
                            </span>
                            <span class="divider">|</span>
                            <span title="Processed Stock">
                                <i class="fas fa-box-open"></i>
                                <span id="headerProc">0</span>
                            </span>
                        </div>
                    </div>
                </header>

                <!-- Content Area - Dynamic Views -->
                <div class="content-area" id="contentArea">
                    <!-- Views injected by JavaScript -->
                </div>
            </main>
        `;

        // Render all views
        this.renderViews();
        
        // Initialize components
        this.initializeComponents();
        
        // Load initial data
        this.refreshData();
    },

    /**
     * Render all view templates into the content area
     */
    renderViews() {
        const contentArea = document.getElementById('contentArea');
        if (!contentArea) {
            console.error('Content area not found');
            return;
        }

        // Include admin panel for admin users
        const adminView = ['admin', 'superadmin'].includes(this.currentUser?.role) 
            ? AdminPage.render() 
            : '';

        contentArea.innerHTML = `
            ${DashboardPage.render()}
            ${DecisionPage.render()}
            ${FormsPage.render()}
            ${HistoryPage.render()}
            ${adminView}
        `;
    },

    /**
     * Initialize all components with their callbacks
     */
    initializeComponents() {
        // Build navigation items based on user role
        const isAdmin = ['admin', 'superadmin'].includes(this.currentUser?.role);

        // Update sidebar navigation items
        Sidebar.navItems = [
            { id: 'dashboard', icon: 'fa-chart-pie', label: 'Dashboard' },
            { id: 'decision', icon: 'fa-brain', label: 'Smart Decisions' },
            { id: 'buy', icon: 'fa-shopping-cart', label: 'Buy Stock' },
            { id: 'process', icon: 'fa-cogs', label: 'Process / Dehusk' },
            { id: 'sell', icon: 'fa-hand-holding-usd', label: 'Sell Stock' },
            { id: 'income', icon: 'fa-money-bill-wave', label: 'Income' },
            { id: 'expense', icon: 'fa-file-invoice-dollar', label: 'Expenses' },
            { id: 'loan', icon: 'fa-university', label: 'Loans' },
            { id: 'adjustments', icon: 'fa-sliders-h', label: 'Adjustments' },
            { id: 'history', icon: 'fa-history', label: 'Ledger' },
            ...(isAdmin ? [{ id: 'admin', icon: 'fa-user-shield', label: 'Admin Panel' }] : [])
        ];

        Sidebar.pageTitles = {
            ...Sidebar.pageTitles,
            adjustments: 'Adjustments',
            admin: 'Admin Panel'
        };

        // Initialize sidebar with navigation callback
        Sidebar.init((sectionId) => {
            this.navigateTo(sectionId);
        });

        // Initialize forms with success callback
        FormsPage.init(async () => {
            await this.refreshData();
            this.navigateTo('dashboard');
        });

        // Initialize decision page
        DecisionPage.init();

        // Initialize history page with data change callback
        HistoryPage.init(async () => {
            await this.refreshData();
        });

        // Initialize admin panel if user is admin
        if (isAdmin) {
            AdminPage.init();
        }

        // Setup logout button
        document.getElementById('logoutBtn')?.addEventListener('click', () => {
            this.handleLogout();
        });
    },

    /**
     * Handle logout
     */
    async handleLogout() {
        if (!confirm('Are you sure you want to logout?')) return;

        await AuthService.logout();
        this.isAuthenticated = false;
        this.currentUser = null;
        this.renderLoginPage();
    },

    /**
     * Navigate to a section
     * @param {string} sectionId - The section ID to show
     */
    async navigateTo(sectionId) {
        this.currentSection = sectionId;

        // Hide all sections
        document.querySelectorAll('.view-section').forEach(el => {
            el.classList.remove('active');
        });

        // Show target section
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.classList.add('active');
        }

        // Update sidebar active state
        Sidebar.setActive(sectionId);

        // Re-initialize page-specific components
        if (sectionId === 'decision') {
            DecisionPage.init();
        } else if (sectionId === 'history') {
            await HistoryPage.update();
        } else if (sectionId === 'admin') {
            await AdminPage.init();
        }
    },

    /**
     * Refresh all data displays (async)
     */
    async refreshData() {
        try {
            // Update dashboard and get stats
            const stats = await DashboardPage.update();

            // Update header stats
            Header.updateStats(stats);

            // Update available stock in forms
            FormsPage.updateAvailableStock(stats.rawStock, stats.procStock);

            // Update history table
            await HistoryPage.update();
        } catch (error) {
            console.error('Failed to refresh data:', error);
        }
    }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

// Export for potential external use
window.ArecaApp = App;
