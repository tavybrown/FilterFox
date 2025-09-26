/**
 * FilterFox Internationalization Module
 * Handles multi-language support and localization
 */

class FilterFoxI18n {
    constructor() {
        this.currentLanguage = 'en';
        this.messages = {};
        this.fallbackLanguage = 'en';
        this.rtlLanguages = ['ar', 'he', 'fa', 'ur'];
        this.dateFormatters = new Map();
        this.numberFormatters = new Map();
    }

    /**
     * Initialize internationalization
     */
    async init() {
        await this.loadMessages();
        this.detectLanguage();
        this.applyLanguage();
        this.setupLanguageObserver();
    }

    /**
     * Load all language messages
     */
    async loadMessages() {
        try {
            const response = await fetch(chrome.runtime.getURL('locales/messages.json'));
            this.messages = await response.json();
        } catch (error) {
            console.error('Failed to load language messages:', error);
            this.messages = { en: {} }; // Fallback
        }
    }

    /**
     * Detect user's preferred language
     */
    detectLanguage() {
        // Check stored preference first
        chrome.storage.sync.get(['preferredLanguage'], (result) => {
            if (result.preferredLanguage) {
                this.setLanguage(result.preferredLanguage);
                return;
            }

            // Use browser language
            const browserLang = navigator.language || navigator.userLanguage;
            const langCode = browserLang.split('-')[0];

            if (this.messages[langCode]) {
                this.setLanguage(langCode);
            } else {
                // Try to find similar language
                const similarLang = this.findSimilarLanguage(browserLang);
                this.setLanguage(similarLang || this.fallbackLanguage);
            }
        });
    }

    /**
     * Find similar language code
     */
    findSimilarLanguage(browserLang) {
        const availableLanguages = Object.keys(this.messages);
        
        // Check for exact match with region
        if (availableLanguages.includes(browserLang)) {
            return browserLang;
        }

        // Check for language family matches
        const langFamily = browserLang.split('-')[0];
        for (const lang of availableLanguages) {
            if (lang.startsWith(langFamily)) {
                return lang;
            }
        }

        return null;
    }

    /**
     * Set current language
     */
    setLanguage(langCode) {
        if (!this.messages[langCode]) {
            langCode = this.fallbackLanguage;
        }

        this.currentLanguage = langCode;
        
        // Store preference
        chrome.storage.sync.set({ preferredLanguage: langCode });
        
        // Update page direction for RTL languages
        this.updateTextDirection();
        
        // Update formatters
        this.setupFormatters();
        
        // Apply translations
        this.applyLanguage();
    }

    /**
     * Get translated message
     */
    getMessage(key, substitutions = {}) {
        const keys = key.split('.');
        let message = this.messages[this.currentLanguage];

        // Navigate through nested keys
        for (const k of keys) {
            if (message && typeof message === 'object' && k in message) {
                message = message[k];
            } else {
                // Fallback to English
                message = this.messages[this.fallbackLanguage];
                for (const fallbackKey of keys) {
                    if (message && typeof message === 'object' && fallbackKey in message) {
                        message = message[fallbackKey];
                    } else {
                        return key; // Return key if no translation found
                    }
                }
                break;
            }
        }

        if (typeof message !== 'string') {
            return key;
        }

        // Apply substitutions
        return this.applySubstitutions(message, substitutions);
    }

    /**
     * Apply substitutions to message
     */
    applySubstitutions(message, substitutions) {
        return message.replace(/\{\{(\w+)\}\}/g, (match, key) => {
            return substitutions[key] !== undefined ? substitutions[key] : match;
        });
    }

    /**
     * Apply language to DOM elements
     */
    applyLanguage() {
        // Update document language
        document.documentElement.lang = this.currentLanguage;

        // Update elements with data-i18n attribute
        const elements = document.querySelectorAll('[data-i18n]');
        elements.forEach(element => {
            const key = element.getAttribute('data-i18n');
            const message = this.getMessage(key);
            
            if (element.tagName === 'INPUT' && (element.type === 'text' || element.type === 'search')) {
                element.placeholder = message;
            } else {
                element.textContent = message;
            }
        });

        // Update elements with data-i18n-title attribute
        const titleElements = document.querySelectorAll('[data-i18n-title]');
        titleElements.forEach(element => {
            const key = element.getAttribute('data-i18n-title');
            element.title = this.getMessage(key);
        });

        // Update aria-label attributes
        const ariaElements = document.querySelectorAll('[data-i18n-aria]');
        ariaElements.forEach(element => {
            const key = element.getAttribute('data-i18n-aria');
            element.setAttribute('aria-label', this.getMessage(key));
        });
    }

    /**
     * Update text direction for RTL languages
     */
    updateTextDirection() {
        const isRtl = this.rtlLanguages.includes(this.currentLanguage);
        document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
        document.body.classList.toggle('rtl', isRtl);
    }

    /**
     * Setup number and date formatters
     */
    setupFormatters() {
        // Number formatter
        this.numberFormatters.set(this.currentLanguage, new Intl.NumberFormat(this.currentLanguage));

        // Date formatter
        this.dateFormatters.set(this.currentLanguage, new Intl.DateTimeFormat(this.currentLanguage, {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }));
    }

    /**
     * Format number according to locale
     */
    formatNumber(number) {
        const formatter = this.numberFormatters.get(this.currentLanguage);
        return formatter ? formatter.format(number) : number.toString();
    }

    /**
     * Format date according to locale
     */
    formatDate(date) {
        const formatter = this.dateFormatters.get(this.currentLanguage);
        return formatter ? formatter.format(date) : date.toLocaleDateString();
    }

    /**
     * Format relative time (e.g., "2 hours ago")
     */
    formatRelativeTime(date) {
        if (Intl.RelativeTimeFormat) {
            const rtf = new Intl.RelativeTimeFormat(this.currentLanguage, { numeric: 'auto' });
            const now = new Date();
            const diffTime = date - now;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (Math.abs(diffDays) < 1) {
                const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));
                if (Math.abs(diffHours) < 1) {
                    const diffMinutes = Math.ceil(diffTime / (1000 * 60));
                    return rtf.format(diffMinutes, 'minute');
                }
                return rtf.format(diffHours, 'hour');
            }
            
            return rtf.format(diffDays, 'day');
        }
        
        return this.formatDate(date);
    }

    /**
     * Get available languages
     */
    getAvailableLanguages() {
        return Object.keys(this.messages).map(code => ({
            code,
            name: this.getLanguageName(code),
            nativeName: this.getNativeLanguageName(code)
        }));
    }

    /**
     * Get language name in English
     */
    getLanguageName(code) {
        const names = {
            'en': 'English',
            'es': 'Spanish',
            'fr': 'French',
            'de': 'German',
            'ja': 'Japanese',
            'zh': 'Chinese',
            'pt': 'Portuguese'
        };
        return names[code] || code;
    }

    /**
     * Get language name in native language
     */
    getNativeLanguageName(code) {
        const nativeNames = {
            'en': 'English',
            'es': 'Español',
            'fr': 'Français',
            'de': 'Deutsch',
            'ja': '日本語',
            'zh': '中文',
            'pt': 'Português'
        };
        return nativeNames[code] || code;
    }

    /**
     * Setup language change observer
     */
    setupLanguageObserver() {
        // Listen for storage changes
        chrome.storage.onChanged.addListener((changes, namespace) => {
            if (namespace === 'sync' && changes.preferredLanguage) {
                this.setLanguage(changes.preferredLanguage.newValue);
            }
        });

        // Listen for DOM changes to apply translations to new elements
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        this.translateElement(node);
                    }
                });
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    /**
     * Translate a specific element and its children
     */
    translateElement(element) {
        // Translate the element itself if it has data-i18n
        if (element.hasAttribute && element.hasAttribute('data-i18n')) {
            const key = element.getAttribute('data-i18n');
            const message = this.getMessage(key);
            
            if (element.tagName === 'INPUT' && (element.type === 'text' || element.type === 'search')) {
                element.placeholder = message;
            } else {
                element.textContent = message;
            }
        }

        // Translate child elements
        if (element.querySelectorAll) {
            const childElements = element.querySelectorAll('[data-i18n]');
            childElements.forEach(child => {
                const key = child.getAttribute('data-i18n');
                const message = this.getMessage(key);
                
                if (child.tagName === 'INPUT' && (child.type === 'text' || child.type === 'search')) {
                    child.placeholder = message;
                } else {
                    child.textContent = message;
                }
            });
        }
    }

    /**
     * Get current language info
     */
    getCurrentLanguageInfo() {
        return {
            code: this.currentLanguage,
            name: this.getLanguageName(this.currentLanguage),
            nativeName: this.getNativeLanguageName(this.currentLanguage),
            isRtl: this.rtlLanguages.includes(this.currentLanguage)
        };
    }

    /**
     * Add translation to runtime
     */
    addTranslation(language, key, message) {
        if (!this.messages[language]) {
            this.messages[language] = {};
        }

        const keys = key.split('.');
        let target = this.messages[language];

        for (let i = 0; i < keys.length - 1; i++) {
            if (!target[keys[i]]) {
                target[keys[i]] = {};
            }
            target = target[keys[i]];
        }

        target[keys[keys.length - 1]] = message;
    }
}

// Initialize i18n when DOM is ready
if (typeof document !== 'undefined') {
    const i18n = new FilterFoxI18n();
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => i18n.init());
    } else {
        i18n.init();
    }

    // Make available globally
    window.FilterFoxI18n = i18n;
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FilterFoxI18n;
}