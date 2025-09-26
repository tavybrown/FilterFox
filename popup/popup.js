// FilterFox Popup JavaScript
class FilterFoxPopup {
    constructor() {
        this.initializeElements();
        this.loadSettings();
        this.loadStats();
        this.getCurrentTabInfo();
        this.bindEvents();
    }

    initializeElements() {
        // Main toggle
        this.enableToggle = document.getElementById('enableToggle');
        
        // Stats elements
        this.blockedToday = document.getElementById('blockedToday');
        this.blockedTotal = document.getElementById('blockedTotal');
        this.timeSaved = document.getElementById('timeSaved');
        
        // Site info
        this.currentUrl = document.getElementById('currentUrl');
        this.siteStatus = document.getElementById('siteStatus');
        this.siteBlocked = document.getElementById('siteBlocked');
        
        // Action buttons
        this.whitelistBtn = document.getElementById('whitelistBtn');
        this.reportBtn = document.getElementById('reportBtn');
        this.optionsBtn = document.getElementById('optionsBtn');
        this.aboutBtn = document.getElementById('aboutBtn');
        
        // Filter checkboxes
        this.adsFilter = document.getElementById('adsFilter');
        this.trackersFilter = document.getElementById('trackersFilter');
        this.socialFilter = document.getElementById('socialFilter');
        this.annoyancesFilter = document.getElementById('annoyancesFilter');
    }

    async loadSettings() {
        try {
            const result = await chrome.storage.sync.get([
                'enabled',
                'adsFilter',
                'trackersFilter', 
                'socialFilter',
                'annoyancesFilter'
            ]);
            
            this.enableToggle.checked = result.enabled !== false;
            this.adsFilter.checked = result.adsFilter !== false;
            this.trackersFilter.checked = result.trackersFilter !== false;
            this.socialFilter.checked = result.socialFilter || false;
            this.annoyancesFilter.checked = result.annoyancesFilter || false;
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }

    async loadStats() {
        try {
            const result = await chrome.storage.local.get([
                'blockedToday',
                'blockedTotal',
                'timeSaved',
                'lastResetDate'
            ]);
            
            // Check if we need to reset daily stats
            const today = new Date().toDateString();
            if (result.lastResetDate !== today) {
                await chrome.storage.local.set({
                    blockedToday: 0,
                    lastResetDate: today
                });
                this.blockedToday.textContent = '0';
            } else {
                this.blockedToday.textContent = this.formatNumber(result.blockedToday || 0);
            }
            
            this.blockedTotal.textContent = this.formatNumber(result.blockedTotal || 0);
            this.timeSaved.textContent = this.formatTime(result.timeSaved || 0);
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }

    async getCurrentTabInfo() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab) {
                const url = new URL(tab.url);
                this.currentUrl.textContent = url.hostname;
                
                // Check if site is whitelisted
                const result = await chrome.storage.sync.get(['whitelist']);
                const whitelist = result.whitelist || [];
                const isWhitelisted = whitelist.includes(url.hostname);
                
                this.siteStatus.textContent = isWhitelisted ? 'Whitelisted' : 'Protected';
                this.siteStatus.className = `site-status ${isWhitelisted ? 'whitelisted' : 'protected'}`;
                
                this.whitelistBtn.textContent = isWhitelisted ? 
                    '🛡️ Remove from Whitelist' : '🛡️ Whitelist Site';
                
                // Get page-specific blocked count
                const pageStats = await chrome.storage.local.get([`blocked_${url.hostname}`]);
                const pageBlocked = pageStats[`blocked_${url.hostname}`] || 0;
                this.siteBlocked.textContent = `${pageBlocked} blocked on this page`;
            }
        } catch (error) {
            console.error('Error getting tab info:', error);
            this.currentUrl.textContent = 'Unknown';
        }
    }

    bindEvents() {
        // Main toggle
        this.enableToggle.addEventListener('change', (e) => {
            this.toggleExtension(e.target.checked);
        });
        
        // Filter toggles
        this.adsFilter.addEventListener('change', (e) => {
            this.updateFilter('adsFilter', e.target.checked);
        });
        
        this.trackersFilter.addEventListener('change', (e) => {
            this.updateFilter('trackersFilter', e.target.checked);
        });
        
        this.socialFilter.addEventListener('change', (e) => {
            this.updateFilter('socialFilter', e.target.checked);
        });
        
        this.annoyancesFilter.addEventListener('change', (e) => {
            this.updateFilter('annoyancesFilter', e.target.checked);
        });
        
        // Action buttons
        this.whitelistBtn.addEventListener('click', () => {
            this.toggleWhitelist();
        });
        
        this.reportBtn.addEventListener('click', () => {
            this.reportIssue();
        });
        
        this.optionsBtn.addEventListener('click', () => {
            chrome.runtime.openOptionsPage();
            window.close();
        });
        
        this.aboutBtn.addEventListener('click', () => {
            this.showAbout();
        });
    }

    async toggleExtension(enabled) {
        try {
            await chrome.storage.sync.set({ enabled });
            
            // Send message to background script
            chrome.runtime.sendMessage({
                action: 'toggleExtension',
                enabled: enabled
            });
            
            // Update UI
            document.body.classList.toggle('disabled', !enabled);
        } catch (error) {
            console.error('Error toggling extension:', error);
        }
    }

    async updateFilter(filterName, enabled) {
        try {
            await chrome.storage.sync.set({ [filterName]: enabled });
            
            // Notify background script
            chrome.runtime.sendMessage({
                action: 'updateFilter',
                filter: filterName,
                enabled: enabled
            });
        } catch (error) {
            console.error('Error updating filter:', error);
        }
    }

    async toggleWhitelist() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab) return;
            
            const url = new URL(tab.url);
            const hostname = url.hostname;
            
            const result = await chrome.storage.sync.get(['whitelist']);
            let whitelist = result.whitelist || [];
            
            const isWhitelisted = whitelist.includes(hostname);
            
            if (isWhitelisted) {
                whitelist = whitelist.filter(site => site !== hostname);
            } else {
                whitelist.push(hostname);
            }
            
            await chrome.storage.sync.set({ whitelist });
            
            // Refresh the current tab info
            this.getCurrentTabInfo();
            
            // Reload the current tab
            chrome.tabs.reload(tab.id);
        } catch (error) {
            console.error('Error toggling whitelist:', error);
        }
    }

    reportIssue() {
        const reportUrl = 'https://github.com/filterfox/filterfox/issues/new';
        chrome.tabs.create({ url: reportUrl });
        window.close();
    }

    showAbout() {
        alert('FilterFox v1.0.0\\n\\nA powerful and lightweight ad blocker.\\n\\nMade with ❤️ by the FilterFox Team');
    }

    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }

    formatTime(seconds) {
        if (seconds >= 3600) {
            return Math.floor(seconds / 3600) + 'h';
        } else if (seconds >= 60) {
            return Math.floor(seconds / 60) + 'm';
        }
        return seconds + 's';
    }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new FilterFoxPopup();
});

// Listen for stats updates
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'statsUpdated') {
        // Reload stats when they're updated
        const popup = new FilterFoxPopup();
        popup.loadStats();
        popup.getCurrentTabInfo();
    }
});