// FilterFox Background Service Worker
class FilterFoxBackground {
    constructor() {
        this.init();
    }

    init() {
        // Initialize default settings
        this.initializeSettings();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Set up declarative net request rules
        this.updateDeclarativeRules();
        
        console.log('🦊 FilterFox: Background service worker initialized');
    }

    async initializeSettings() {
        try {
            const result = await chrome.storage.sync.get([
                'enabled',
                'adsFilter',
                'trackersFilter',
                'socialFilter',
                'annoyancesFilter',
                'whitelist',
                'customFilters',
                'firstRun'
            ]);
            
            // Set default values if not already set
            const defaults = {
                enabled: true,
                adsFilter: true,
                trackersFilter: true,
                socialFilter: false,
                annoyancesFilter: false,
                whitelist: [],
                customFilters: [],
                firstRun: true
            };
            
            const toSet = {};
            for (const [key, defaultValue] of Object.entries(defaults)) {
                if (result[key] === undefined) {
                    toSet[key] = defaultValue;
                }
            }
            
            if (Object.keys(toSet).length > 0) {
                await chrome.storage.sync.set(toSet);
            }
            
            // Initialize daily stats if needed
            await this.initializeDailyStats();
            
        } catch (error) {
            console.error('FilterFox: Error initializing settings:', error);
        }
    }

    async initializeDailyStats() {
        try {
            const result = await chrome.storage.local.get([
                'blockedToday',
                'blockedTotal',
                'timeSaved',
                'lastResetDate',
                'installDate'
            ]);
            
            const today = new Date().toDateString();
            const toSet = {};
            
            // Reset daily stats if it's a new day
            if (result.lastResetDate !== today) {
                toSet.blockedToday = 0;
                toSet.lastResetDate = today;
            }
            
            // Initialize other stats if not set
            if (result.blockedTotal === undefined) toSet.blockedTotal = 0;
            if (result.timeSaved === undefined) toSet.timeSaved = 0;
            if (result.installDate === undefined) toSet.installDate = Date.now();
            
            if (Object.keys(toSet).length > 0) {
                await chrome.storage.local.set(toSet);
            }
        } catch (error) {
            console.error('FilterFox: Error initializing daily stats:', error);
        }
    }

    setupEventListeners() {
        // Handle extension installation
        chrome.runtime.onInstalled.addListener((details) => {
            this.handleInstalled(details);
        });
        
        // Handle messages from content scripts and popup
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            this.handleMessage(request, sender, sendResponse);
            return true; // Keep the message channel open for async responses
        });
        
        // Handle tab updates
        chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
            this.handleTabUpdated(tabId, changeInfo, tab);
        });
        
        // Handle keyboard shortcuts
        chrome.commands.onCommand.addListener((command) => {
            this.handleCommand(command);
        });
        
        // Handle web navigation
        chrome.webNavigation.onBeforeNavigate.addListener((details) => {
            this.handleNavigation(details);
        });
    }

    async handleInstalled(details) {
        if (details.reason === 'install') {
            // First time installation
            await this.showWelcomePage();
            await this.setDefaultIcon();
        } else if (details.reason === 'update') {
            // Extension update
            console.log('FilterFox updated to version', chrome.runtime.getManifest().version);
        }
    }

    async handleMessage(request, sender, sendResponse) {
        try {
            switch (request.action) {
                case 'incrementBlocked':
                    await this.incrementBlockedStats(request);
                    sendResponse({ success: true });
                    break;
                
                case 'toggleExtension':
                    await this.toggleExtension(request.enabled);
                    sendResponse({ success: true });
                    break;
                
                case 'updateFilter':
                    await this.updateFilter(request.filter, request.enabled);
                    sendResponse({ success: true });
                    break;
                
                case 'getStats':
                    const stats = await this.getStats();
                    sendResponse(stats);
                    break;
                
                case 'clearStats':
                    await this.clearStats();
                    sendResponse({ success: true });
                    break;
                
                case 'exportSettings':
                    const settings = await this.exportSettings();
                    sendResponse(settings);
                    break;
                
                case 'importSettings':
                    await this.importSettings(request.settings);
                    sendResponse({ success: true });
                    break;
                
                default:
                    sendResponse({ error: 'Unknown action' });
            }
        } catch (error) {
            console.error('FilterFox: Error handling message:', error);
            sendResponse({ error: error.message });
        }
    }

    async handleTabUpdated(tabId, changeInfo, tab) {
        if (changeInfo.status === 'complete' && tab.url) {
            // Update badge with blocked count for this tab
            await this.updateTabBadge(tabId, tab.url);
        }
    }

    async handleCommand(command) {
        if (command === 'toggle-extension') {
            const result = await chrome.storage.sync.get(['enabled']);
            const newEnabled = !result.enabled;
            await this.toggleExtension(newEnabled);
        }
    }

    async handleNavigation(details) {
        if (details.frameId === 0) { // Main frame only
            // Reset page-specific blocked count
            const hostname = new URL(details.url).hostname;
            await chrome.storage.local.remove(`blocked_${hostname}`);
        }
    }

    async incrementBlockedStats(request) {
        try {
            const result = await chrome.storage.local.get([
                'blockedToday',
                'blockedTotal',
                'timeSaved'
            ]);
            
            const blockedToday = (result.blockedToday || 0) + 1;
            const blockedTotal = (result.blockedTotal || 0) + 1;
            const timeSaved = (result.timeSaved || 0) + 0.5;
            
            await chrome.storage.local.set({
                blockedToday,
                blockedTotal,
                timeSaved
            });
            
            // Update badge
            await this.updateBadge(blockedToday);
            
            // Notify popup if open
            chrome.runtime.sendMessage({
                action: 'statsUpdated',
                stats: { blockedToday, blockedTotal, timeSaved }
            }).catch(() => {
                // Popup might not be open, ignore error
            });
            
        } catch (error) {
            console.error('FilterFox: Error incrementing stats:', error);
        }
    }

    async toggleExtension(enabled) {
        try {
            await chrome.storage.sync.set({ enabled });
            
            // Update icon
            await this.updateIcon(enabled);
            
            // Notify all content scripts
            const tabs = await chrome.tabs.query({});
            for (const tab of tabs) {
                try {
                    await chrome.tabs.sendMessage(tab.id, {
                        action: 'updateSettings'
                    });
                } catch (error) {
                    // Tab might not have content script, ignore
                }
            }
            
        } catch (error) {
            console.error('FilterFox: Error toggling extension:', error);
        }
    }

    async updateFilter(filterName, enabled) {
        try {
            await chrome.storage.sync.set({ [filterName]: enabled });
            
            // Update declarative rules
            await this.updateDeclarativeRules();
            
            // Notify content scripts
            const tabs = await chrome.tabs.query({});
            for (const tab of tabs) {
                try {
                    await chrome.tabs.sendMessage(tab.id, {
                        action: 'updateSettings'
                    });
                } catch (error) {
                    // Tab might not have content script, ignore
                }
            }
            
        } catch (error) {
            console.error('FilterFox: Error updating filter:', error);
        }
    }

    async updateDeclarativeRules() {
        try {
            // Get current filter settings
            const result = await chrome.storage.sync.get([
                'adsFilter',
                'trackersFilter',
                'socialFilter'
            ]);
            
            const rules = [];
            let ruleId = 1;
            
            // Ad blocking rules
            if (result.adsFilter !== false) {
                rules.push({
                    id: ruleId++,
                    priority: 1,
                    action: { type: 'block' },
                    condition: {
                        urlFilter: '*doubleclick.net*',
                        resourceTypes: ['script', 'image', 'sub_frame']
                    }
                });
                
                rules.push({
                    id: ruleId++,
                    priority: 1,
                    action: { type: 'block' },
                    condition: {
                        urlFilter: '*googlesyndication.com*',
                        resourceTypes: ['script', 'image', 'sub_frame']
                    }
                });
            }
            
            // Tracker blocking rules
            if (result.trackersFilter !== false) {
                rules.push({
                    id: ruleId++,
                    priority: 1,
                    action: { type: 'block' },
                    condition: {
                        urlFilter: '*google-analytics.com*',
                        resourceTypes: ['script', 'image']
                    }
                });
                
                rules.push({
                    id: ruleId++,
                    priority: 1,
                    action: { type: 'block' },
                    condition: {
                        urlFilter: '*facebook.com/tr*',
                        resourceTypes: ['script', 'image', 'ping']
                    }
                });
            }
            
            // Update rules
            const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
            const removeRuleIds = existingRules.map(rule => rule.id);
            
            await chrome.declarativeNetRequest.updateDynamicRules({
                removeRuleIds,
                addRules: rules
            });
            
        } catch (error) {
            console.error('FilterFox: Error updating declarative rules:', error);
        }
    }

    async updateIcon(enabled = null) {
        try {
            if (enabled === null) {
                const result = await chrome.storage.sync.get(['enabled']);
                enabled = result.enabled !== false;
            }
            
            const iconPath = enabled ? {
                16: 'icons/icon16.png',
                32: 'icons/icon32.png',
                48: 'icons/icon48.png',
                128: 'icons/icon128.png'
            } : {
                16: 'icons/icon16-disabled.png',
                32: 'icons/icon32-disabled.png',
                48: 'icons/icon48-disabled.png',
                128: 'icons/icon128-disabled.png'
            };
            
            await chrome.action.setIcon({ path: iconPath });
            
        } catch (error) {
            console.error('FilterFox: Error updating icon:', error);
        }
    }

    async updateBadge(count) {
        try {
            const text = count > 999 ? '999+' : count.toString();
            await chrome.action.setBadgeText({ text });
            await chrome.action.setBadgeBackgroundColor({ color: '#667eea' });
        } catch (error) {
            console.error('FilterFox: Error updating badge:', error);
        }
    }

    async updateTabBadge(tabId, url) {
        try {
            const hostname = new URL(url).hostname;
            const result = await chrome.storage.local.get([`blocked_${hostname}`]);
            const count = result[`blocked_${hostname}`] || 0;
            
            const text = count > 0 ? (count > 99 ? '99+' : count.toString()) : '';
            await chrome.action.setBadgeText({ text, tabId });
        } catch (error) {
            console.error('FilterFox: Error updating tab badge:', error);
        }
    }

    async setDefaultIcon() {
        await this.updateIcon(true);
    }

    async showWelcomePage() {
        try {
            await chrome.tabs.create({
                url: chrome.runtime.getURL('welcome/welcome.html')
            });
        } catch (error) {
            console.error('FilterFox: Error showing welcome page:', error);
        }
    }

    async getStats() {
        try {
            const result = await chrome.storage.local.get([
                'blockedToday',
                'blockedTotal',
                'timeSaved',
                'installDate'
            ]);
            
            return {
                blockedToday: result.blockedToday || 0,
                blockedTotal: result.blockedTotal || 0,
                timeSaved: result.timeSaved || 0,
                installDate: result.installDate || Date.now()
            };
        } catch (error) {
            console.error('FilterFox: Error getting stats:', error);
            return null;
        }
    }

    async clearStats() {
        try {
            await chrome.storage.local.set({
                blockedToday: 0,
                blockedTotal: 0,
                timeSaved: 0
            });
            
            // Clear site-specific stats
            const result = await chrome.storage.local.get();
            const keysToRemove = Object.keys(result).filter(key => key.startsWith('blocked_'));
            if (keysToRemove.length > 0) {
                await chrome.storage.local.remove(keysToRemove);
            }
            
        } catch (error) {
            console.error('FilterFox: Error clearing stats:', error);
        }
    }

    async exportSettings() {
        try {
            const syncData = await chrome.storage.sync.get();
            const localData = await chrome.storage.local.get();
            
            return {
                sync: syncData,
                local: localData,
                exportDate: Date.now(),
                version: chrome.runtime.getManifest().version
            };
        } catch (error) {
            console.error('FilterFox: Error exporting settings:', error);
            return null;
        }
    }

    async importSettings(settings) {
        try {
            if (settings.sync) {
                await chrome.storage.sync.set(settings.sync);
            }
            if (settings.local) {
                await chrome.storage.local.set(settings.local);
            }
            
            // Update rules and UI
            await this.updateDeclarativeRules();
            await this.updateIcon();
            
        } catch (error) {
            console.error('FilterFox: Error importing settings:', error);
        }
    }
}

// Initialize the background service worker
new FilterFoxBackground();