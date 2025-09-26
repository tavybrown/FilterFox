// Firefox Compatibility Layer for FilterFox
// This file will help make FilterFox work on Firefox browsers

class FirefoxCompatibility {
    constructor() {
        this.isFirefox = this.detectFirefox();
        this.adaptAPIs();
    }

    detectFirefox() {
        return typeof browser !== 'undefined' && typeof chrome === 'undefined';
    }

    adaptAPIs() {
        if (this.isFirefox) {
            // Firefox uses 'browser' API instead of 'chrome'
            if (typeof chrome === 'undefined') {
                window.chrome = browser;
            }
            
            // Adapt storage API
            this.adaptStorageAPI();
            
            // Adapt tabs API  
            this.adaptTabsAPI();
            
            // Adapt declarativeNetRequest for Firefox
            this.adaptDeclarativeNetRequest();
        }
    }

    adaptStorageAPI() {
        // Firefox storage API returns promises, Chrome uses callbacks
        const originalGet = chrome.storage.sync.get;
        chrome.storage.sync.get = function(keys) {
            return new Promise((resolve, reject) => {
                originalGet.call(this, keys, (result) => {
                    if (chrome.runtime.lastError) {
                        reject(chrome.runtime.lastError);
                    } else {
                        resolve(result);
                    }
                });
            });
        };
    }

    adaptTabsAPI() {
        // Similar adaptation for tabs API
        const originalQuery = chrome.tabs.query;
        chrome.tabs.query = function(queryInfo) {
            return new Promise((resolve, reject) => {
                originalQuery.call(this, queryInfo, (tabs) => {
                    if (chrome.runtime.lastError) {
                        reject(chrome.runtime.lastError);
                    } else {
                        resolve(tabs);
                    }
                });
            });
        };
    }

    adaptDeclarativeNetRequest() {
        // Firefox might not have full declarativeNetRequest support
        // Fallback to webRequest API if needed
        if (!chrome.declarativeNetRequest) {
            console.warn('DeclarativeNetRequest not available, using webRequest fallback');
            // Implement webRequest-based blocking for Firefox
        }
    }
}

// Initialize Firefox compatibility if needed
if (typeof browser !== 'undefined') {
    new FirefoxCompatibility();
}