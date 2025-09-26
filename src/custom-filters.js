/**
 * FilterFox Custom Filter Management System
 * Allows users to create, edit, and manage custom blocking rules
 */

class FilterFoxCustomFilters {
    constructor() {
        this.customRules = [];
        this.compiledPatterns = new Map();
        this.ruleTypes = {
            BLOCK: 'block',
            ALLOW: 'allow',
            REDIRECT: 'redirect',
            MODIFY_HEADERS: 'modifyHeaders'
        };
        this.targetTypes = {
            URL: 'url',
            DOMAIN: 'domain',
            ELEMENT: 'element',
            SCRIPT: 'script',
            STYLE: 'style',
            IMAGE: 'image'
        };
    }

    /**
     * Initialize custom filter system
     */
    async init() {
        await this.loadCustomRules();
        this.setupRuleValidation();
        this.compilePatterns();
        this.setupAutoSave();
    }

    /**
     * Add a new custom rule
     */
    addRule(rule) {
        try {
            const validatedRule = this.validateRule(rule);
            const ruleId = this.generateRuleId();
            
            const customRule = {
                id: ruleId,
                ...validatedRule,
                created: Date.now(),
                modified: Date.now(),
                enabled: true,
                hitCount: 0
            };

            this.customRules.push(customRule);
            this.compilePattern(customRule);
            this.saveRules();

            return { success: true, ruleId };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Update an existing rule
     */
    updateRule(ruleId, updates) {
        try {
            const ruleIndex = this.customRules.findIndex(r => r.id === ruleId);
            if (ruleIndex === -1) {
                throw new Error('Rule not found');
            }

            const existingRule = this.customRules[ruleIndex];
            const updatedRule = {
                ...existingRule,
                ...this.validateRule(updates),
                modified: Date.now()
            };

            this.customRules[ruleIndex] = updatedRule;
            this.compilePattern(updatedRule);
            this.saveRules();

            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Delete a rule
     */
    deleteRule(ruleId) {
        const ruleIndex = this.customRules.findIndex(r => r.id === ruleId);
        if (ruleIndex === -1) {
            return { success: false, error: 'Rule not found' };
        }

        this.customRules.splice(ruleIndex, 1);
        this.compiledPatterns.delete(ruleId);
        this.saveRules();

        return { success: true };
    }

    /**
     * Toggle rule enabled/disabled state
     */
    toggleRule(ruleId) {
        const rule = this.customRules.find(r => r.id === ruleId);
        if (!rule) {
            return { success: false, error: 'Rule not found' };
        }

        rule.enabled = !rule.enabled;
        rule.modified = Date.now();
        this.saveRules();

        return { success: true, enabled: rule.enabled };
    }

    /**
     * Check if URL matches any custom rules
     */
    checkUrl(url, resourceType = 'main_frame') {
        const matchedRules = [];

        for (const rule of this.customRules) {
            if (!rule.enabled) continue;

            const pattern = this.compiledPatterns.get(rule.id);
            if (!pattern) continue;

            let matches = false;

            switch (rule.targetType) {
                case this.targetTypes.URL:
                    matches = this.matchUrl(pattern, url);
                    break;
                case this.targetTypes.DOMAIN:
                    matches = this.matchDomain(pattern, url);
                    break;
                default:
                    matches = this.matchUrl(pattern, url);
            }

            if (matches && this.matchResourceType(rule, resourceType)) {
                rule.hitCount++;
                matchedRules.push(rule);
            }
        }

        return this.processMatchedRules(matchedRules, url);
    }

    /**
     * Import rules from text (AdBlock Plus format)
     */
    importRulesFromText(rulesText) {
        const lines = rulesText.split('\n').map(line => line.trim()).filter(line => line);
        const imported = [];
        const errors = [];

        for (const line of lines) {
            try {
                if (line.startsWith('!') || line.startsWith('#')) {
                    // Skip comments
                    continue;
                }

                const rule = this.parseAdBlockRule(line);
                if (rule) {
                    const result = this.addRule(rule);
                    if (result.success) {
                        imported.push(result.ruleId);
                    } else {
                        errors.push({ line, error: result.error });
                    }
                }
            } catch (error) {
                errors.push({ line, error: error.message });
            }
        }

        return {
            imported: imported.length,
            errors: errors.length,
            details: { imported, errors }
        };
    }

    /**
     * Export rules to AdBlock Plus format
     */
    exportRulesToText() {
        const header = [
            '! FilterFox Custom Rules',
            `! Generated: ${new Date().toISOString()}`,
            `! Rules Count: ${this.customRules.length}`,
            '!'
        ];

        const rules = this.customRules.map(rule => {
            let ruleText = '';

            if (rule.ruleType === this.ruleTypes.BLOCK) {
                ruleText = rule.pattern;
                if (rule.options) {
                    ruleText += '$' + rule.options;
                }
            } else if (rule.ruleType === this.ruleTypes.ALLOW) {
                ruleText = '@@' + rule.pattern;
                if (rule.options) {
                    ruleText += '$' + rule.options;
                }
            }

            return ruleText;
        }).filter(rule => rule);

        return [...header, ...rules].join('\n');
    }

    /**
     * Get rule statistics
     */
    getRuleStats() {
        const total = this.customRules.length;
        const enabled = this.customRules.filter(r => r.enabled).length;
        const disabled = total - enabled;
        const totalHits = this.customRules.reduce((sum, r) => sum + r.hitCount, 0);
        const topRules = [...this.customRules]
            .sort((a, b) => b.hitCount - a.hitCount)
            .slice(0, 10);

        return {
            total,
            enabled,
            disabled,
            totalHits,
            topRules: topRules.map(r => ({
                id: r.id,
                name: r.name || r.pattern,
                hits: r.hitCount,
                pattern: r.pattern
            }))
        };
    }

    /**
     * Search rules by pattern or name
     */
    searchRules(query) {
        const searchTerm = query.toLowerCase();
        return this.customRules.filter(rule => {
            return rule.pattern.toLowerCase().includes(searchTerm) ||
                   (rule.name && rule.name.toLowerCase().includes(searchTerm)) ||
                   (rule.description && rule.description.toLowerCase().includes(searchTerm));
        });
    }

    /**
     * Validate rule object
     */
    validateRule(rule) {
        if (!rule.pattern || typeof rule.pattern !== 'string') {
            throw new Error('Pattern is required and must be a string');
        }

        if (!Object.values(this.ruleTypes).includes(rule.ruleType)) {
            throw new Error('Invalid rule type');
        }

        if (!Object.values(this.targetTypes).includes(rule.targetType)) {
            throw new Error('Invalid target type');
        }

        // Validate pattern syntax
        this.validatePattern(rule.pattern, rule.targetType);

        return {
            name: rule.name || '',
            description: rule.description || '',
            pattern: rule.pattern,
            ruleType: rule.ruleType,
            targetType: rule.targetType,
            options: rule.options || '',
            resourceTypes: rule.resourceTypes || ['main_frame']
        };
    }

    /**
     * Validate pattern syntax
     */
    validatePattern(pattern, targetType) {
        try {
            if (targetType === this.targetTypes.URL) {
                // Test if it's a valid regex or glob pattern
                if (pattern.startsWith('/') && pattern.endsWith('/')) {
                    // Regex pattern
                    new RegExp(pattern.slice(1, -1));
                } else {
                    // Glob pattern - convert to regex for testing
                    this.globToRegex(pattern);
                }
            } else if (targetType === this.targetTypes.DOMAIN) {
                // Basic domain validation
                const domainRegex = /^(\*\.)?[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*(\.[a-zA-Z]{2,})+$/;
                if (!domainRegex.test(pattern)) {
                    throw new Error('Invalid domain pattern');
                }
            }
        } catch (error) {
            throw new Error(`Invalid pattern syntax: ${error.message}`);
        }
    }

    /**
     * Parse AdBlock Plus rule format
     */
    parseAdBlockRule(ruleText) {
        let rule = {
            ruleType: this.ruleTypes.BLOCK,
            targetType: this.targetTypes.URL
        };

        // Check for whitelist rule
        if (ruleText.startsWith('@@')) {
            rule.ruleType = this.ruleTypes.ALLOW;
            ruleText = ruleText.substring(2);
        }

        // Split pattern and options
        const [pattern, options] = ruleText.split('$');
        rule.pattern = pattern;

        if (options) {
            rule.options = options;
            // Parse specific options
            const optionsList = options.split(',');
            rule.resourceTypes = [];

            for (const option of optionsList) {
                const trimmed = option.trim();
                if (['script', 'image', 'stylesheet', 'xmlhttprequest'].includes(trimmed)) {
                    rule.resourceTypes.push(trimmed);
                } else if (trimmed === 'domain') {
                    rule.targetType = this.targetTypes.DOMAIN;
                }
            }

            if (rule.resourceTypes.length === 0) {
                rule.resourceTypes = ['main_frame'];
            }
        }

        return rule;
    }

    /**
     * Compile pattern to regex
     */
    compilePattern(rule) {
        try {
            let regex;

            if (rule.targetType === this.targetTypes.URL) {
                if (rule.pattern.startsWith('/') && rule.pattern.endsWith('/')) {
                    // Already a regex
                    regex = new RegExp(rule.pattern.slice(1, -1), 'i');
                } else {
                    // Convert glob to regex
                    regex = this.globToRegex(rule.pattern);
                }
            } else if (rule.targetType === this.targetTypes.DOMAIN) {
                regex = this.domainToRegex(rule.pattern);
            }

            this.compiledPatterns.set(rule.id, regex);
        } catch (error) {
            console.error(`Failed to compile pattern for rule ${rule.id}:`, error);
        }
    }

    /**
     * Convert glob pattern to regex
     */
    globToRegex(glob) {
        const escaped = glob.replace(/[.+^${}()|[\]\\]/g, '\\$&');
        const pattern = escaped.replace(/\*/g, '.*').replace(/\?/g, '.');
        return new RegExp('^' + pattern + '$', 'i');
    }

    /**
     * Convert domain pattern to regex
     */
    domainToRegex(domain) {
        let pattern = domain;
        
        if (pattern.startsWith('*.')) {
            pattern = pattern.substring(2);
            pattern = '(.*\\.)?' + pattern.replace(/\./g, '\\.');
        } else {
            pattern = pattern.replace(/\./g, '\\.');
        }

        return new RegExp('^' + pattern + '$', 'i');
    }

    /**
     * Check URL against pattern
     */
    matchUrl(pattern, url) {
        return pattern.test(url);
    }

    /**
     * Check domain against pattern
     */
    matchDomain(pattern, url) {
        try {
            const domain = new URL(url).hostname;
            return pattern.test(domain);
        } catch {
            return false;
        }
    }

    /**
     * Check if resource type matches rule
     */
    matchResourceType(rule, resourceType) {
        if (!rule.resourceTypes || rule.resourceTypes.length === 0) {
            return true;
        }
        return rule.resourceTypes.includes(resourceType);
    }

    /**
     * Process matched rules and determine action
     */
    processMatchedRules(matchedRules, url) {
        if (matchedRules.length === 0) {
            return { action: 'allow' };
        }

        // Sort by priority: allow rules first, then block rules
        const sortedRules = matchedRules.sort((a, b) => {
            if (a.ruleType === this.ruleTypes.ALLOW && b.ruleType !== this.ruleTypes.ALLOW) {
                return -1;
            }
            if (b.ruleType === this.ruleTypes.ALLOW && a.ruleType !== this.ruleTypes.ALLOW) {
                return 1;
            }
            return 0;
        });

        const topRule = sortedRules[0];

        return {
            action: topRule.ruleType === this.ruleTypes.ALLOW ? 'allow' : 'block',
            rule: topRule,
            matchedRules: sortedRules
        };
    }

    /**
     * Generate unique rule ID
     */
    generateRuleId() {
        return 'rule_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Load rules from storage
     */
    async loadCustomRules() {
        try {
            const result = await chrome.storage.local.get(['customRules']);
            this.customRules = result.customRules || [];
        } catch (error) {
            console.error('Failed to load custom rules:', error);
            this.customRules = [];
        }
    }

    /**
     * Save rules to storage
     */
    async saveRules() {
        try {
            await chrome.storage.local.set({ customRules: this.customRules });
        } catch (error) {
            console.error('Failed to save custom rules:', error);
        }
    }

    /**
     * Compile all patterns
     */
    compilePatterns() {
        this.customRules.forEach(rule => this.compilePattern(rule));
    }

    /**
     * Setup rule validation
     */
    setupRuleValidation() {
        // Additional validation setup if needed
    }

    /**
     * Setup auto-save functionality
     */
    setupAutoSave() {
        // Auto-save rules every 5 minutes
        setInterval(() => {
            this.saveRules();
        }, 5 * 60 * 1000);
    }

    /**
     * Get all rules
     */
    getAllRules() {
        return [...this.customRules];
    }

    /**
     * Get rule by ID
     */
    getRule(ruleId) {
        return this.customRules.find(r => r.id === ruleId);
    }

    /**
     * Clear all rules
     */
    clearAllRules() {
        this.customRules = [];
        this.compiledPatterns.clear();
        this.saveRules();
        return { success: true };
    }

    /**
     * Backup rules
     */
    backupRules() {
        return {
            version: '1.0.0',
            timestamp: Date.now(),
            rules: this.customRules
        };
    }

    /**
     * Restore rules from backup
     */
    restoreRules(backup) {
        try {
            if (!backup.rules || !Array.isArray(backup.rules)) {
                throw new Error('Invalid backup format');
            }

            this.customRules = backup.rules;
            this.compilePatterns();
            this.saveRules();

            return { success: true, count: backup.rules.length };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FilterFoxCustomFilters;
} else if (typeof window !== 'undefined') {
    window.FilterFoxCustomFilters = FilterFoxCustomFilters;
}