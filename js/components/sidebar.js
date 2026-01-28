/**
 * Sidebar Component
 * Handles navigation and mobile menu toggle
 */

export const Sidebar = {
    onNavigate: null,
    
    navItems: [
        { id: 'dashboard', icon: 'fa-chart-pie', label: 'Dashboard' },
        { id: 'decision', icon: 'fa-brain', label: 'Smart Decisions' },
        { id: 'buy', icon: 'fa-shopping-cart', label: 'Buy Stock' },
        { id: 'process', icon: 'fa-cogs', label: 'Process / Dehusk' },
        { id: 'sell', icon: 'fa-hand-holding-usd', label: 'Sell Stock' },
        { id: 'income', icon: 'fa-money-bill-wave', label: 'Income' },
        { id: 'expense', icon: 'fa-file-invoice-dollar', label: 'Expenses' },
        { id: 'loan', icon: 'fa-university', label: 'Loans' },
        { id: 'adjustments', icon: 'fa-sliders-h', label: 'Adjustments' },
        { id: 'history', icon: 'fa-history', label: 'Ledger' }
    ],

    pageTitles: {
        'dashboard': 'Dashboard',
        'decision': 'Smart Decision',
        'buy': 'Buy Stock',
        'process': 'Processing',
        'sell': 'Sales',
        'income': 'Income',
        'expense': 'Expenses',
        'loan': 'Loans',
        'adjustments': 'Adjustments',
        'history': 'Ledger',
        'admin': 'Admin Panel'
    },

    /**
     * Initialize sidebar with event listeners
     * @param {Function} onNavigate - Callback when navigation occurs
     */
    init(onNavigate) {
        this.onNavigate = onNavigate;
        
        // Render navigation items
        this.renderNavItems();
        
        // Mobile menu toggle
        const menuToggle = document.getElementById('menuToggle');
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('overlay');

        menuToggle?.addEventListener('click', () => {
            sidebar?.classList.add('open');
            overlay?.classList.add('active');
        });

        overlay?.addEventListener('click', () => {
            sidebar?.classList.remove('open');
            overlay?.classList.remove('active');
        });

        // Set initial active state
        this.setActive('dashboard');
    },

    /**
     * Render navigation items
     */
    renderNavItems() {
        const navLinks = document.getElementById('navLinks');
        if (!navLinks) return;

        navLinks.innerHTML = this.navItems.map((item, index) => `
            <li class="nav-item">
                <button class="nav-btn ${index === 0 ? 'active' : ''}" data-section="${item.id}">
                    <i class="fas ${item.icon}"></i>
                    <span>${item.label}</span>
                </button>
            </li>
        `).join('');

        // Add click handlers
        navLinks.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const sectionId = btn.dataset.section;
                this.handleNavigation(sectionId);
            });
        });
    },

    /**
     * Handle navigation click
     * @param {string} sectionId - The section to navigate to
     */
    handleNavigation(sectionId) {
        // Update page title
        const pageTitle = document.getElementById('pageTitle');
        if (pageTitle) {
            pageTitle.textContent = this.pageTitles[sectionId] || sectionId;
        }

        // Close mobile sidebar
        if (window.innerWidth <= 768) {
            document.getElementById('sidebar')?.classList.remove('open');
            document.getElementById('overlay')?.classList.remove('active');
        }

        // Call navigation callback
        if (this.onNavigate) {
            this.onNavigate(sectionId);
        }
    },

    /**
     * Set active navigation item
     * @param {string} sectionId - The section to mark as active
     */
    setActive(sectionId) {
        // Update nav buttons
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.section === sectionId);
        });

        // Update page title
        const pageTitle = document.getElementById('pageTitle');
        if (pageTitle) {
            pageTitle.textContent = this.pageTitles[sectionId] || sectionId;
        }
    }
};
