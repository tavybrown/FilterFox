// FilterFox Content Script - Injected into web pages
class FilterFoxContent {
    constructor() {
        this.blockedCount = 0;
        this.enabled = true;
        this.filters = {
            adsFilter: true,
            trackersFilter: true,
            socialFilter: false,
            annoyancesFilter: false
        };
        
        this.init();
    }

    async init() {
        // Load settings from storage
        await this.loadSettings();
        
        if (!this.enabled) return;
        
        // Start blocking immediately
        this.blockAds();
        this.blockTrackers();
        this.blockSocialMedia();
        this.blockAnnoyances();
        
        // Set up mutation observer for dynamic content
        this.setupMutationObserver();
        
        // Listen for settings changes
        this.listenForUpdates();
        
        console.log('🦊 FilterFox: Content script initialized');
    }

    async loadSettings() {
        try {
            const result = await chrome.storage.sync.get([
                'enabled',
                'adsFilter',
                'trackersFilter',
                'socialFilter',
                'annoyancesFilter',
                'whitelist'
            ]);
            
            this.enabled = result.enabled !== false;
            this.filters = {
                adsFilter: result.adsFilter !== false,
                trackersFilter: result.trackersFilter !== false,
                socialFilter: result.socialFilter || false,
                annoyancesFilter: result.annoyancesFilter || false
            };
            
            // Check if current site is whitelisted
            const whitelist = result.whitelist || [];
            const currentHostname = window.location.hostname;
            if (whitelist.includes(currentHostname)) {
                this.enabled = false;
            }
        } catch (error) {
            console.error('FilterFox: Error loading settings:', error);
        }
    }

    blockAds() {
        if (!this.filters.adsFilter) return;
        
        const adSelectors = [
            // Google Ads
            '.adsbygoogle',
            'ins.adsbygoogle',
            '[class*="google-ad"]',
            '[id*="google_ads"]',
            
            // Generic ad selectors
            '.ad',
            '.ads',
            '.advertisement',
            '.ad-banner',
            '.ad-container',
            '.ad-wrapper',
            '[class*="ad-"]',
            '[id*="ad-"]',
            '[class*="advertisement"]',
            '[id*="advertisement"]',
            
            // Sponsored content
            '[class*="sponsored"]',
            '[class*="promotion"]',
            '[data-ad]',
            '[data-advertisement]',
            
            // Popular ad networks
            '.amazon-ad',
            '.facebook-ad',
            '.twitter-ad',
            '.doubleclick',
            '.adsystem',
            '.pubmatic',
            '.criteo',
            '.outbrain',
            '.taboola',
            
            // Video ads
            '.video-ad',
            '.preroll-ad',
            '.overlay-ad'
        ];
        
        adSelectors.forEach(selector => {
            this.hideElements(selector, 'ad');
        });
        
        // Block iframe ads
        this.blockIframeAds();
    }

    blockTrackers() {
        if (!this.filters.trackersFilter) return;
        
        const trackerSelectors = [
            // Analytics
            '[src*="google-analytics"]',
            '[src*="googletagmanager"]',
            '[src*="facebook.com/tr"]',
            '[src*="connect.facebook.net"]',
            '[src*="analytics.twitter.com"]',
            '[src*="linkedin.com/li.lms"]',
            
            // Tracking pixels
            '[width="1"][height="1"]',
            'img[width="1"][height="1"]',
            
            // Heatmap tools
            '[src*="hotjar"]',
            '[src*="crazyegg"]',
            '[src*="mouseflow"]',
            
            // Other trackers
            '[src*="mixpanel"]',
            '[src*="segment.com"]',
            '[src*="amplitude.com"]'
        ];
        
        trackerSelectors.forEach(selector => {
            this.hideElements(selector, 'tracker');
        });
    }

    blockSocialMedia() {
        if (!this.filters.socialFilter) return;
        
        const socialSelectors = [
            // Facebook widgets
            '.fb-like',
            '.fb-share-button',
            '.fb-comments',
            '.facebook-widget',
            
            // Twitter widgets
            '.twitter-tweet',
            '.twitter-follow-button',
            '.twitter-share-button',
            
            // Other social widgets
            '.linkedin-share',
            '.pinterest-widget',
            '.instagram-widget',
            '.youtube-subscribe',
            
            // Social login buttons (optional)
            '.social-login',
            '[class*="social-share"]'
        ];
        
        socialSelectors.forEach(selector => {
            this.hideElements(selector, 'social');
        });
    }

    blockAnnoyances() {
        if (!this.filters.annoyancesFilter) return;
        
        const annoyanceSelectors = [
            // Cookie notices (be careful with these)
            '.cookie-banner',
            '.cookie-notice',
            '.gdpr-banner',
            
            // Newsletter popups
            '.newsletter-popup',
            '.email-signup',
            '.subscribe-popup',
            
            // Notification requests
            '.notification-popup',
            '.push-notification',
            
            // Survey popups
            '.survey-popup',
            '.feedback-popup',
            
            // Chat widgets (optional)
            '.chat-widget',
            '.support-widget'
        ];
        
        annoyanceSelectors.forEach(selector => {
            this.hideElements(selector, 'annoyance');
        });
    }

    hideElements(selector, type = 'unknown') {
        try {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                if (!element.classList.contains('filterfox-blocked')) {
                    element.classList.add('filterfox-blocked');
                    element.style.setProperty('display', 'none', 'important');
                    this.incrementBlockedCount(type);
                }
            });
        } catch (error) {
            console.error(`FilterFox: Error hiding elements with selector ${selector}:`, error);
        }
    }

    blockIframeAds() {
        const iframes = document.querySelectorAll('iframe');
        iframes.forEach(iframe => {
            const src = iframe.src || '';
            const adDomains = [
                'doubleclick.net',
                'googlesyndication.com',
                'amazon-adsystem.com',
                'facebook.com/tr',
                'googleadservices.com',
                'adsystem.com',
                'ads.yahoo.com',
                'bing.com/ads'
            ];
            
            if (adDomains.some(domain => src.includes(domain))) {
                iframe.style.setProperty('display', 'none', 'important');
                this.incrementBlockedCount('iframe-ad');
            }
        });
    }

    setupMutationObserver() {
        const observer = new MutationObserver(mutations => {
            if (!this.enabled) return;
            
            mutations.forEach(mutation => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            // Re-run blocking on new elements
                            this.blockNewElement(node);
                        }
                    });
                }
            });
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    blockNewElement(element) {
        // Check if the new element or its children match our selectors
        if (this.filters.adsFilter) {
            this.checkElementForAds(element);
        }
        if (this.filters.trackersFilter) {
            this.checkElementForTrackers(element);
        }
        if (this.filters.socialFilter) {
            this.checkElementForSocial(element);
        }
        if (this.filters.annoyancesFilter) {
            this.checkElementForAnnoyances(element);
        }
    }

    checkElementForAds(element) {
        const adPatterns = ['ad', 'advertisement', 'sponsored', 'promotion'];
        const className = element.className || '';
        const id = element.id || '';
        
        if (adPatterns.some(pattern => 
            className.toLowerCase().includes(pattern) || 
            id.toLowerCase().includes(pattern)
        )) {
            element.style.setProperty('display', 'none', 'important');
            this.incrementBlockedCount('dynamic-ad');
        }
    }

    checkElementForTrackers(element) {
        if (element.tagName === 'SCRIPT' || element.tagName === 'IMG') {
            const src = element.src || '';
            const trackingDomains = [
                'google-analytics.com',
                'googletagmanager.com',
                'facebook.com/tr',
                'twitter.com/i/adsct'
            ];
            
            if (trackingDomains.some(domain => src.includes(domain))) {
                element.style.setProperty('display', 'none', 'important');
                this.incrementBlockedCount('dynamic-tracker');
            }
        }
    }

    checkElementForSocial(element) {
        const className = element.className || '';
        const socialPatterns = ['fb-', 'twitter-', 'social-share', 'linkedin-'];
        
        if (socialPatterns.some(pattern => className.includes(pattern))) {
            element.style.setProperty('display', 'none', 'important');
            this.incrementBlockedCount('dynamic-social');
        }
    }

    checkElementForAnnoyances(element) {
        const className = element.className || '';
        const annoyancePatterns = ['popup', 'modal', 'overlay', 'newsletter'];
        
        if (annoyancePatterns.some(pattern => className.toLowerCase().includes(pattern))) {
            // Be more careful with annoyances - some might be legitimate
            if (this.isLikelyAnnoyance(element)) {
                element.style.setProperty('display', 'none', 'important');
                this.incrementBlockedCount('dynamic-annoyance');
            }
        }
    }

    isLikelyAnnoyance(element) {
        // More sophisticated check for annoyances
        const text = element.textContent || '';
        const annoyanceKeywords = [
            'subscribe to our newsletter',
            'get notifications',
            'allow notifications',
            'cookies policy',
            'accept cookies'
        ];
        
        return annoyanceKeywords.some(keyword => 
            text.toLowerCase().includes(keyword)
        );
    }

    async incrementBlockedCount(type) {
        this.blockedCount++;
        
        try {
            // Update storage
            const hostname = window.location.hostname;
            const storageKey = `blocked_${hostname}`;
            
            const result = await chrome.storage.local.get([
                'blockedToday',
                'blockedTotal',
                'timeSaved',
                storageKey
            ]);
            
            const blockedToday = (result.blockedToday || 0) + 1;
            const blockedTotal = (result.blockedTotal || 0) + 1;
            const timeSaved = (result.timeSaved || 0) + 0.5; // Assume 0.5s saved per blocked item
            const siteBlocked = (result[storageKey] || 0) + 1;
            
            await chrome.storage.local.set({
                blockedToday,
                blockedTotal,
                timeSaved,
                [storageKey]: siteBlocked
            });
            
            // Notify background script
            chrome.runtime.sendMessage({
                action: 'incrementBlocked',
                type: type,
                hostname: hostname
            });
            
        } catch (error) {
            console.error('FilterFox: Error updating blocked count:', error);
        }
    }

    listenForUpdates() {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.action === 'updateSettings') {
                this.loadSettings().then(() => {
                    if (this.enabled) {
                        this.blockAds();
                        this.blockTrackers();
                        this.blockSocialMedia();
                        this.blockAnnoyances();
                    } else {
                        this.unblockAll();
                    }
                });
            }
        });
    }

    unblockAll() {
        const blockedElements = document.querySelectorAll('.filterfox-blocked');
        blockedElements.forEach(element => {
            element.classList.remove('filterfox-blocked');
            element.style.removeProperty('display');
        });
    }

    showNotification(message) {
        // Create and show a notification
        const notification = document.createElement('div');
        notification.className = 'filterfox-notification';
        notification.innerHTML = `
            <div class="filterfox-notification-content">
                <span class="filterfox-notification-icon">🦊</span>
                <span class="filterfox-notification-text">${message}</span>
                <button class="filterfox-notification-close">&times;</button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Auto-hide after 3 seconds
        setTimeout(() => {
            notification.classList.add('slide-out');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
        
        // Manual close
        notification.querySelector('.filterfox-notification-close').addEventListener('click', () => {
            notification.classList.add('slide-out');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        });
    }
}

// Initialize FilterFox when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new FilterFoxContent();
    });
} else {
    new FilterFoxContent();
}

// Also initialize immediately for dynamic content
new FilterFoxContent();