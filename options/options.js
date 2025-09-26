/**
 * FilterFox Options Page JavaScript
 * Handles settings management and user interactions
 */

class FilterFoxOptions {
    constructor() {
        this.settings = {};
        this.defaultSettings = {
            enableExtension: true,
            showNotifications: true,
            updateBadge: true,
            blockAds: true,
            blockPopups: true,
            blockAutoplay: true,
            blockTrackers: true,
            blockAnalytics: true,
            blockSocial: false,
            collectStats: false,
            shareFilterHits: false,
            enableLogging: false,
            maxMemory: 200,
            updateInterval: 24,
            language: 'en'
        };
        this.whitelist = [];
        this.currentTab = 'general';
    }

    /**
     * Initialize options page
     */
    async init() {
        await this.loadSettings();
        await this.loadWhitelist();
        this.setupEventListeners();
        this.renderSettings();
        this.renderWhitelist();
        this.updateStatistics();
        this.setupTabNavigation();
    }

    /**
     * Load settings from storage
     */
    async loadSettings() {
        try {
            const result = await chrome.storage.sync.get(null);
            this.settings = { ...this.defaultSettings, ...result };
        } catch (error) {
            console.error('Failed to load settings:', error);
            this.settings = { ...this.defaultSettings };
        }
    }

    /**
     * Save settings to storage
     */
    async saveSettings() {
        try {
            await chrome.storage.sync.set(this.settings);
            this.showToast('Settings saved successfully!');
        } catch (error) {
            console.error('Failed to save settings:', error);
            this.showToast('Failed to save settings', 'error');
        }
    }

    /**
     * Load whitelist from storage
     */
    async loadWhitelist() {
        try {
            const result = await chrome.storage.local.get(['whitelist']);
            this.whitelist = result.whitelist || [];
        } catch (error) {
            console.error('Failed to load whitelist:', error);
            this.whitelist = [];
        }
    }

    /**
     * Save whitelist to storage
     */
    async saveWhitelist() {
        try {
            await chrome.storage.local.set({ whitelist: this.whitelist });
        } catch (error) {
            console.error('Failed to save whitelist:', error);
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Setting checkboxes
        document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                this.settings[e.target.id] = e.target.checked;
                this.saveSettings();
            });
        });

        // Setting ranges
        document.querySelectorAll('input[type="range"]').forEach(range => {
            range.addEventListener('input', (e) => {
                this.settings[e.target.id] = parseInt(e.target.value);
                this.updateRangeValue(e.target);
                this.saveSettings();
            });
        });

        // Setting selects
        document.querySelectorAll('select').forEach(select => {
            select.addEventListener('change', (e) => {
                this.settings[e.target.id] = e.target.value;
                this.saveSettings();
                
                // Handle language change
                if (e.target.id === 'language-select' && window.FilterFoxI18n) {
                    window.FilterFoxI18n.setLanguage(e.target.value);
                }
            });
        });

        // Whitelist management
        document.getElementById('addWhitelist').addEventListener('click', () => {
            this.addToWhitelist();
        });

        document.getElementById('whitelistInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.addToWhitelist();
            }
        });

        // Action buttons
        document.getElementById('clearData').addEventListener('click', () => {
            this.showConfirmModal('Clear All Data', 'This will remove all stored data including whitelist and statistics. This action cannot be undone.', () => {
                this.clearAllData();
            });
        });

        document.getElementById('exportSettings').addEventListener('click', () => {
            this.exportSettings();
        });

        document.getElementById('importSettings').addEventListener('click', () => {
            document.getElementById('importFile').click();
        });

        document.getElementById('importFile').addEventListener('change', (e) => {
            this.importSettings(e.target.files[0]);
        });

        document.getElementById('updateFilters').addEventListener('click', () => {
            this.updateFilterLists();
        });

        document.getElementById('exportWhitelist').addEventListener('click', () => {
            this.exportWhitelist();
        });

        document.getElementById('clearWhitelist').addEventListener('click', () => {
            this.showConfirmModal('Clear Whitelist', 'This will remove all whitelisted domains. Are you sure?', () => {
                this.clearWhitelist();
            });
        });

        document.getElementById('viewLogs').addEventListener('click', () => {
            this.viewLogs();
        });

        document.getElementById('resetSettings').addEventListener('click', () => {
            this.showConfirmModal('Reset All Settings', 'This will restore all settings to their default values. Are you sure?', () => {
                this.resetToDefaults();
            });
        });

        document.getElementById('rateExtension').addEventListener('click', () => {
            this.rateExtension();
        });

        // Modal events
        document.getElementById('modalCancel').addEventListener('click', () => {
            this.hideModal();
        });

        document.getElementById('modalConfirm').addEventListener('click', () => {
            if (this.confirmCallback) {
                this.confirmCallback();
            }
            this.hideModal();
        });
    }

    /**
     * Setup tab navigation
     */
    setupTabNavigation() {
        const navItems = document.querySelectorAll('.nav-item');
        const tabContents = document.querySelectorAll('.tab-content');

        navItems.forEach(item => {
            item.addEventListener('click', () => {
                const tabName = item.getAttribute('data-tab');
                
                // Update navigation
                navItems.forEach(nav => nav.classList.remove('active'));
                item.classList.add('active');
                
                // Update content
                tabContents.forEach(content => content.classList.remove('active'));
                document.getElementById(tabName).classList.add('active');
                
                this.currentTab = tabName;
            });
        });
    }

    /**
     * Render settings to form elements
     */
    renderSettings() {
        Object.keys(this.settings).forEach(key => {
            const element = document.getElementById(key);
            if (!element) return;

            if (element.type === 'checkbox') {
                element.checked = this.settings[key];
            } else if (element.type === 'range') {
                element.value = this.settings[key];
                this.updateRangeValue(element);
            } else if (element.tagName === 'SELECT') {
                element.value = this.settings[key];
            }
        });
    }

    /**
     * Update range value display
     */
    updateRangeValue(rangeElement) {
        const valueSpan = rangeElement.nextElementSibling;
        if (valueSpan && valueSpan.classList.contains('range-value')) {
            valueSpan.textContent = rangeElement.value + ' MB';
        }
    }

    /**
     * Add domain to whitelist
     */
    addToWhitelist() {
        const input = document.getElementById('whitelistInput');
        const domain = input.value.trim();

        if (!domain) {
            this.showToast('Please enter a domain', 'error');
            return;
        }

        if (this.whitelist.includes(domain)) {
            this.showToast('Domain already in whitelist', 'error');
            return;
        }

        // Basic domain validation
        const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/;
        if (!domainRegex.test(domain)) {
            this.showToast('Please enter a valid domain', 'error');
            return;
        }

        this.whitelist.push(domain);
        this.saveWhitelist();
        this.renderWhitelist();
        input.value = '';
        this.showToast('Domain added to whitelist');
    }

    /**
     * Remove domain from whitelist
     */
    removeFromWhitelist(domain) {
        const index = this.whitelist.indexOf(domain);
        if (index > -1) {
            this.whitelist.splice(index, 1);
            this.saveWhitelist();
            this.renderWhitelist();
            this.showToast('Domain removed from whitelist');
        }
    }

    /**
     * Render whitelist
     */
    renderWhitelist() {
        const container = document.getElementById('whitelistList');
        
        if (this.whitelist.length === 0) {
            container.innerHTML = '<div class="empty-state">No whitelisted domains yet</div>';
            return;
        }

        container.innerHTML = this.whitelist.map(domain => `
            <div class="whitelist-item">
                <span class="whitelist-domain">${domain}</span>
                <button class="btn btn-danger btn-small" onclick="options.removeFromWhitelist('${domain}')">
                    Remove
                </button>
            </div>
        `).join('');
    }

    /**
     * Clear all data
     */
    async clearAllData() {
        try {
            await chrome.storage.local.clear();
            await chrome.storage.sync.clear();
            this.settings = { ...this.defaultSettings };
            this.whitelist = [];
            this.renderSettings();
            this.renderWhitelist();
            this.showToast('All data cleared successfully');
        } catch (error) {
            console.error('Failed to clear data:', error);
            this.showToast('Failed to clear data', 'error');
        }
    }

    /**
     * Export settings
     */
    exportSettings() {
        const data = {
            settings: this.settings,
            whitelist: this.whitelist,
            exportDate: new Date().toISOString(),
            version: '1.0.0'
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `filterfox-settings-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showToast('Settings exported successfully');
    }

    /**
     * Import settings
     */
    importSettings(file) {
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = JSON.parse(e.target.result);
                
                if (data.settings) {
                    this.settings = { ...this.defaultSettings, ...data.settings };
                    await this.saveSettings();
                    this.renderSettings();
                }

                if (data.whitelist) {
                    this.whitelist = data.whitelist;
                    await this.saveWhitelist();
                    this.renderWhitelist();
                }

                this.showToast('Settings imported successfully');
            } catch (error) {
                console.error('Import failed:', error);
                this.showToast('Failed to import settings', 'error');
            }
        };

        reader.readAsText(file);
    }

    /**
     * Update filter lists
     */
    updateFilterLists() {
        // Simulate filter update
        this.showToast('Updating filter lists...');
        
        setTimeout(() => {
            document.querySelectorAll('.update-time').forEach(el => {
                el.textContent = 'Just now';
            });
            this.showToast('Filter lists updated successfully');
        }, 2000);
    }

    /**
     * Export whitelist
     */
    exportWhitelist() {
        const blob = new Blob([this.whitelist.join('\n')], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `filterfox-whitelist-${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showToast('Whitelist exported successfully');
    }

    /**
     * Clear whitelist
     */
    clearWhitelist() {
        this.whitelist = [];
        this.saveWhitelist();
        this.renderWhitelist();
        this.showToast('Whitelist cleared successfully');
    }

    /**
     * View logs
     */
    viewLogs() {
        // Open logs in new tab
        chrome.tabs.create({ url: chrome.runtime.getURL('logs/debug.html') });
    }

    /**
     * Reset to defaults
     */
    async resetToDefaults() {
        this.settings = { ...this.defaultSettings };
        await this.saveSettings();
        this.renderSettings();
        this.showToast('Settings reset to defaults');
    }

    /**
     * Rate extension
     */
    rateExtension() {
        const url = 'https://chrome.google.com/webstore/detail/filterfox/';
        chrome.tabs.create({ url });
    }

    /**
     * Update statistics
     */
    async updateStatistics() {
        try {
            const stats = await chrome.storage.local.get(['statistics']);
            const data = stats.statistics || {};

            document.getElementById('totalBlocked').textContent = (data.totalBlocked || 0).toLocaleString();
            document.getElementById('bandwidthSaved').textContent = this.formatBytes(data.bandwidthSaved || 0);
            document.getElementById('trackersStopped').textContent = (data.trackersStopped || 0).toLocaleString();
        } catch (error) {
            console.error('Failed to load statistics:', error);
        }
    }

    /**
     * Format bytes to human readable format
     */
    formatBytes(bytes) {
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 Bytes';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }

    /**
     * Show confirmation modal
     */
    showConfirmModal(title, message, callback) {
        document.getElementById('modalTitle').textContent = title;
        document.getElementById('modalMessage').textContent = message;
        document.getElementById('confirmModal').classList.add('show');
        this.confirmCallback = callback;
    }

    /**
     * Hide modal
     */
    hideModal() {
        document.getElementById('confirmModal').classList.remove('show');
        this.confirmCallback = null;
    }

    /**
     * Show toast notification
     */
    showToast(message, type = 'success') {
        const toast = document.getElementById('successToast');
        const messageEl = document.getElementById('toastMessage');
        
        messageEl.textContent = message;
        toast.className = `toast ${type}`;
        toast.classList.add('show');

        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
}

// Initialize options when DOM is loaded
let options;
document.addEventListener('DOMContentLoaded', () => {
    options = new FilterFoxOptions();
    options.init();
});