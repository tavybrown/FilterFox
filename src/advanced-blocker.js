/**
 * FilterFox Advanced Blocking Engine
 * Sophisticated content blocking with ML-based detection and heuristics
 */

class FilterFoxAdvancedBlocker {
    constructor() {
        this.blockingStrategies = new Map();
        this.heuristicRules = [];
        this.mlModel = null;
        this.blockingStats = {
            totalBlocked: 0,
            byCategory: new Map(),
            byStrategy: new Map(),
            falsePositives: 0
        };
        this.learningData = [];
        this.adaptiveThresholds = {
            confidence: 0.75,
            heuristic: 0.8,
            ml: 0.85
        };
    }

    /**
     * Initialize advanced blocking engine
     */
    async init() {
        this.setupBlockingStrategies();
        this.loadHeuristicRules();
        await this.initializeMachineLearning();
        this.setupAdaptiveLearning();
        this.startPerformanceMonitoring();
    }

    /**
     * Setup different blocking strategies
     */
    setupBlockingStrategies() {
        // Pattern-based blocking
        this.blockingStrategies.set('pattern', {
            name: 'Pattern Matching',
            weight: 0.6,
            check: (url, context) => this.checkPatterns(url, context)
        });

        // Heuristic analysis
        this.blockingStrategies.set('heuristic', {
            name: 'Heuristic Analysis',
            weight: 0.8,
            check: (url, context) => this.checkHeuristics(url, context)
        });

        // Machine learning prediction
        this.blockingStrategies.set('ml', {
            name: 'ML Prediction',
            weight: 0.9,
            check: (url, context) => this.checkMachineLearning(url, context)
        });

        // Behavioral analysis
        this.blockingStrategies.set('behavioral', {
            name: 'Behavioral Analysis',
            weight: 0.7,
            check: (url, context) => this.checkBehavior(url, context)
        });

        // Domain reputation
        this.blockingStrategies.set('reputation', {
            name: 'Domain Reputation',
            weight: 0.5,
            check: (url, context) => this.checkReputation(url, context)
        });
    }

    /**
     * Main blocking decision engine
     */
    async shouldBlock(url, context = {}) {
        const startTime = performance.now();
        
        try {
            // Quick pre-filters
            const prefilterResult = this.prefilterCheck(url, context);
            if (prefilterResult.definitive) {
                this.updateStats('prefilter', prefilterResult.block);
                return prefilterResult;
            }

            // Run all blocking strategies
            const strategyResults = [];
            
            for (const [name, strategy] of this.blockingStrategies) {
                try {
                    const result = await strategy.check(url, context);
                    strategyResults.push({
                        name,
                        weight: strategy.weight,
                        ...result
                    });
                } catch (error) {
                    console.warn(`Strategy ${name} failed:`, error);
                }
            }

            // Aggregate results using weighted scoring
            const decision = this.aggregateDecision(strategyResults, url, context);
            
            // Update learning data
            this.collectLearningData(url, context, strategyResults, decision);
            
            // Update statistics
            this.updateStats('advanced', decision.block);
            
            const processingTime = performance.now() - startTime;
            decision.processingTime = processingTime;
            
            return decision;
            
        } catch (error) {
            console.error('Advanced blocking failed:', error);
            return { block: false, confidence: 0, reason: 'Error in processing' };
        }
    }

    /**
     * Pre-filter check for quick decisions
     */
    prefilterCheck(url, context) {
        // Whitelist check
        if (this.isWhitelisted(url)) {
            return { block: false, confidence: 1.0, reason: 'Whitelisted', definitive: true };
        }

        // Known bad domains
        if (this.isKnownMalicious(url)) {
            return { block: true, confidence: 1.0, reason: 'Known malicious', definitive: true };
        }

        // First-party resources
        if (context.initiator && this.isFirstParty(url, context.initiator)) {
            return { block: false, confidence: 0.9, reason: 'First-party', definitive: false };
        }

        return { definitive: false };
    }

    /**
     * Pattern-based blocking check
     */
    checkPatterns(url, context) {
        const patterns = [
            // Ad networks
            { regex: /doubleclick\.net/i, category: 'ads', weight: 0.9 },
            { regex: /googlesyndication\.com/i, category: 'ads', weight: 0.9 },
            { regex: /amazon-adsystem\.com/i, category: 'ads', weight: 0.8 },
            
            // Tracking
            { regex: /google-analytics\.com/i, category: 'tracking', weight: 0.8 },
            { regex: /googletagmanager\.com/i, category: 'tracking', weight: 0.7 },
            { regex: /facebook\.com\/tr/i, category: 'tracking', weight: 0.9 },
            
            // Social widgets
            { regex: /widgets\.pinterest\.com/i, category: 'social', weight: 0.6 },
            { regex: /connect\.facebook\.net/i, category: 'social', weight: 0.7 },
            
            // Suspicious patterns
            { regex: /\/ads?[\/\?]/i, category: 'ads', weight: 0.6 },
            { regex: /[\/\.]ad[sv]?\./i, category: 'ads', weight: 0.5 },
            { regex: /track(ing|er)/i, category: 'tracking', weight: 0.4 }
        ];

        let maxConfidence = 0;
        let category = 'unknown';
        let matchedPattern = null;

        for (const pattern of patterns) {
            if (pattern.regex.test(url)) {
                if (pattern.weight > maxConfidence) {
                    maxConfidence = pattern.weight;
                    category = pattern.category;
                    matchedPattern = pattern.regex.source;
                }
            }
        }

        return {
            block: maxConfidence > 0.5,
            confidence: maxConfidence,
            category,
            reason: matchedPattern ? `Pattern match: ${matchedPattern}` : 'No pattern match',
            details: { matchedPattern }
        };
    }

    /**
     * Heuristic analysis
     */
    checkHeuristics(url, context) {
        let score = 0;
        const factors = [];

        // URL structure analysis
        const urlAnalysis = this.analyzeUrlStructure(url);
        score += urlAnalysis.score * 0.3;
        factors.push(`URL structure: ${urlAnalysis.score.toFixed(2)}`);

        // Domain analysis
        const domainAnalysis = this.analyzeDomain(url);
        score += domainAnalysis.score * 0.4;
        factors.push(`Domain analysis: ${domainAnalysis.score.toFixed(2)}`);

        // Request context analysis
        if (context.resourceType) {
            const contextScore = this.analyzeContext(context);
            score += contextScore * 0.3;
            factors.push(`Context: ${contextScore.toFixed(2)}`);
        }

        const confidence = Math.min(score, 1.0);

        return {
            block: confidence > this.adaptiveThresholds.heuristic,
            confidence,
            reason: `Heuristic analysis: ${factors.join(', ')}`,
            details: { factors, urlAnalysis, domainAnalysis }
        };
    }

    /**
     * Analyze URL structure for suspicious patterns
     */
    analyzeUrlStructure(url) {
        let suspiciousScore = 0;
        const factors = [];

        try {
            const urlObj = new URL(url);
            
            // Check for suspicious subdomains
            const subdomains = urlObj.hostname.split('.');
            if (subdomains.length > 3) {
                suspiciousScore += 0.2;
                factors.push('Deep subdomain');
            }

            // Check for ad-related keywords in path
            const adKeywords = ['ad', 'ads', 'banner', 'popup', 'track', 'analytics'];
            const path = urlObj.pathname.toLowerCase();
            
            for (const keyword of adKeywords) {
                if (path.includes(keyword)) {
                    suspiciousScore += 0.3;
                    factors.push(`Ad keyword: ${keyword}`);
                    break;
                }
            }

            // Check for suspicious parameters
            const suspiciousParams = ['utm_', 'fb_', 'gclid', 'ref', 'source'];
            for (const param of suspiciousParams) {
                if (urlObj.search.includes(param)) {
                    suspiciousScore += 0.1;
                    factors.push(`Tracking param: ${param}`);
                }
            }

            // Check for random-looking domains
            if (this.looksRandom(urlObj.hostname)) {
                suspiciousScore += 0.4;
                factors.push('Random-looking domain');
            }

        } catch (error) {
            suspiciousScore += 0.5; // Invalid URLs are suspicious
            factors.push('Invalid URL structure');
        }

        return {
            score: Math.min(suspiciousScore, 1.0),
            factors
        };
    }

    /**
     * Analyze domain characteristics
     */
    analyzeDomain(url) {
        let suspiciousScore = 0;
        const factors = [];

        try {
            const urlObj = new URL(url);
            const domain = urlObj.hostname;

            // Check domain age (simulated - would use real domain info in production)
            if (this.isNewDomain(domain)) {
                suspiciousScore += 0.3;
                factors.push('New domain');
            }

            // Check for ad network patterns
            const adNetworkPatterns = [
                'ads', 'ad-', 'adsystem', 'doubleclick', 'googlesyndication',
                'amazon-adsystem', 'facebook', 'outbrain', 'taboola'
            ];

            for (const pattern of adNetworkPatterns) {
                if (domain.includes(pattern)) {
                    suspiciousScore += 0.6;
                    factors.push(`Ad network pattern: ${pattern}`);
                    break;
                }
            }

            // Check TLD suspicion
            const suspiciousTlds = ['.tk', '.ml', '.ga', '.cf', '.click', '.download'];
            for (const tld of suspiciousTlds) {
                if (domain.endsWith(tld)) {
                    suspiciousScore += 0.4;
                    factors.push(`Suspicious TLD: ${tld}`);
                    break;
                }
            }

        } catch (error) {
            factors.push('Domain analysis failed');
        }

        return {
            score: Math.min(suspiciousScore, 1.0),
            factors
        };
    }

    /**
     * Analyze request context
     */
    analyzeContext(context) {
        let contextScore = 0;

        // Resource type analysis
        const suspiciousTypes = {
            'script': 0.4,
            'xmlhttprequest': 0.6,
            'image': 0.2,
            'sub_frame': 0.7
        };

        if (suspiciousTypes[context.resourceType]) {
            contextScore += suspiciousTypes[context.resourceType];
        }

        // Third-party context
        if (context.initiator && !this.isFirstParty(context.url, context.initiator)) {
            contextScore += 0.3;
        }

        // Request method
        if (context.method === 'POST') {
            contextScore += 0.2; // POST requests from ads/trackers are more suspicious
        }

        return Math.min(contextScore, 1.0);
    }

    /**
     * Machine learning prediction (simplified model)
     */
    checkMachineLearning(url, context) {
        // Simplified ML model - in production this would use a trained model
        const features = this.extractFeatures(url, context);
        const prediction = this.mlPredict(features);

        return {
            block: prediction.confidence > this.adaptiveThresholds.ml,
            confidence: prediction.confidence,
            reason: `ML prediction: ${prediction.reasoning}`,
            details: { features, prediction }
        };
    }

    /**
     * Extract features for ML model
     */
    extractFeatures(url, context) {
        const features = {};

        try {
            const urlObj = new URL(url);
            
            // URL-based features
            features.domainLength = urlObj.hostname.length;
            features.pathLength = urlObj.pathname.length;
            features.paramCount = (urlObj.search.match(/[&?]/g) || []).length;
            features.subdomainCount = urlObj.hostname.split('.').length - 2;
            
            // Content features
            features.hasAdKeywords = /ad[sv]?|banner|popup|track/i.test(url) ? 1 : 0;
            features.hasRandomString = this.looksRandom(urlObj.hostname) ? 1 : 0;
            
            // Context features
            features.resourceType = this.encodeResourceType(context.resourceType);
            features.isThirdParty = context.initiator && !this.isFirstParty(url, context.initiator) ? 1 : 0;

        } catch (error) {
            // Default features for invalid URLs
            Object.keys(features).forEach(key => features[key] = 0);
        }

        return features;
    }

    /**
     * Simplified ML prediction
     */
    mlPredict(features) {
        // Simplified linear model weights (would be trained in production)
        const weights = {
            domainLength: -0.01,
            pathLength: -0.005,
            paramCount: 0.1,
            subdomainCount: 0.2,
            hasAdKeywords: 0.8,
            hasRandomString: 0.6,
            resourceType: 0.3,
            isThirdParty: 0.4
        };

        let score = 0.5; // Base score
        const reasoning = [];

        for (const [feature, value] of Object.entries(features)) {
            if (weights[feature] && value) {
                const contribution = weights[feature] * value;
                score += contribution;
                
                if (Math.abs(contribution) > 0.1) {
                    reasoning.push(`${feature}: ${contribution.toFixed(2)}`);
                }
            }
        }

        // Apply sigmoid function to normalize
        const confidence = 1 / (1 + Math.exp(-score));

        return {
            confidence,
            reasoning: reasoning.join(', ') || 'No significant features'
        };
    }

    /**
     * Behavioral analysis
     */
    checkBehavior(url, context) {
        let behaviorScore = 0;
        const factors = [];

        // Check request frequency
        const frequency = this.getRequestFrequency(url);
        if (frequency > 10) { // More than 10 requests in short time
            behaviorScore += 0.4;
            factors.push('High request frequency');
        }

        // Check for redirect chains
        if (context.redirectChain && context.redirectChain.length > 2) {
            behaviorScore += 0.3;
            factors.push('Multiple redirects');
        }

        // Check for popup behavior
        if (context.windowType === 'popup') {
            behaviorScore += 0.6;
            factors.push('Popup window');
        }

        const confidence = Math.min(behaviorScore, 1.0);

        return {
            block: confidence > 0.5,
            confidence,
            reason: `Behavioral analysis: ${factors.join(', ')}`,
            details: { factors }
        };
    }

    /**
     * Domain reputation check
     */
    checkReputation(url, context) {
        try {
            const domain = new URL(url).hostname;
            const reputation = this.getDomainReputation(domain);

            return {
                block: reputation.score < 0.3,
                confidence: Math.abs(reputation.score - 0.5) * 2,
                reason: `Domain reputation: ${reputation.reason}`,
                details: { reputation }
            };
        } catch (error) {
            return {
                block: false,
                confidence: 0,
                reason: 'Reputation check failed'
            };
        }
    }

    /**
     * Aggregate decisions from all strategies
     */
    aggregateDecision(strategyResults, url, context) {
        let weightedScore = 0;
        let totalWeight = 0;
        let blockReasons = [];
        let allowReasons = [];

        for (const result of strategyResults) {
            const weight = result.weight * (result.confidence || 0);
            weightedScore += (result.block ? 1 : 0) * weight;
            totalWeight += weight;

            if (result.block) {
                blockReasons.push(`${result.name}: ${result.reason}`);
            } else {
                allowReasons.push(`${result.name}: ${result.reason}`);
            }
        }

        const finalScore = totalWeight > 0 ? weightedScore / totalWeight : 0;
        const shouldBlock = finalScore > this.adaptiveThresholds.confidence;

        return {
            block: shouldBlock,
            confidence: finalScore,
            reason: shouldBlock ? blockReasons.join('; ') : allowReasons.join('; '),
            details: {
                strategyResults,
                weightedScore,
                totalWeight,
                threshold: this.adaptiveThresholds.confidence
            }
        };
    }

    /**
     * Utility methods
     */
    isWhitelisted(url) {
        // Simplified whitelist check
        return false; // Would check actual whitelist
    }

    isKnownMalicious(url) {
        // Simplified malicious domain check
        const maliciousDomains = ['known-malware.com', 'phishing-site.net'];
        try {
            const domain = new URL(url).hostname;
            return maliciousDomains.includes(domain);
        } catch {
            return false;
        }
    }

    isFirstParty(url, initiator) {
        try {
            const urlDomain = new URL(url).hostname;
            const initiatorDomain = new URL(initiator).hostname;
            return urlDomain === initiatorDomain || 
                   urlDomain.endsWith(`.${initiatorDomain}`) ||
                   initiatorDomain.endsWith(`.${urlDomain}`);
        } catch {
            return false;
        }
    }

    looksRandom(string) {
        // Check if string looks randomly generated
        const vowels = string.match(/[aeiou]/gi) || [];
        const consonants = string.match(/[bcdfghjklmnpqrstvwxyz]/gi) || [];
        const vowelRatio = vowels.length / string.length;
        
        // Random strings typically have unusual vowel ratios
        return vowelRatio < 0.1 || vowelRatio > 0.7;
    }

    isNewDomain(domain) {
        // Simplified new domain check (would use real domain age data)
        return Math.random() < 0.1; // 10% chance of being "new"
    }

    encodeResourceType(type) {
        const types = {
            'main_frame': 1,
            'sub_frame': 2,
            'script': 3,
            'xmlhttprequest': 4,
            'image': 5,
            'other': 0
        };
        return types[type] || 0;
    }

    getRequestFrequency(url) {
        // Simplified frequency tracking
        return Math.floor(Math.random() * 20);
    }

    getDomainReputation(domain) {
        // Simplified reputation system
        const knownGood = ['google.com', 'microsoft.com', 'apple.com'];
        const knownBad = ['doubleclick.net', 'googleadservices.com'];

        if (knownGood.includes(domain)) {
            return { score: 0.9, reason: 'Known good domain' };
        } else if (knownBad.includes(domain)) {
            return { score: 0.1, reason: 'Known ad network' };
        } else {
            return { score: 0.5, reason: 'Unknown domain' };
        }
    }

    /**
     * Learning and adaptation methods
     */
    collectLearningData(url, context, strategyResults, decision) {
        this.learningData.push({
            timestamp: Date.now(),
            url,
            context,
            strategyResults,
            decision,
            features: this.extractFeatures(url, context)
        });

        // Keep only recent learning data
        if (this.learningData.length > 10000) {
            this.learningData = this.learningData.slice(-5000);
        }
    }

    setupAdaptiveLearning() {
        // Periodically adjust thresholds based on performance
        setInterval(() => {
            this.adaptThresholds();
        }, 300000); // Every 5 minutes
    }

    adaptThresholds() {
        // Analyze recent performance and adjust thresholds
        const recentData = this.learningData.slice(-1000);
        if (recentData.length < 100) return;

        const falsePositiveRate = this.calculateFalsePositiveRate(recentData);
        const falseNegativeRate = this.calculateFalseNegativeRate(recentData);

        // Adjust thresholds based on error rates
        if (falsePositiveRate > 0.05) { // Too many false positives
            this.adaptiveThresholds.confidence += 0.01;
            this.adaptiveThresholds.heuristic += 0.01;
        } else if (falseNegativeRate > 0.1) { // Too many false negatives
            this.adaptiveThresholds.confidence -= 0.01;
            this.adaptiveThresholds.heuristic -= 0.01;
        }

        // Keep thresholds in reasonable bounds
        Object.keys(this.adaptiveThresholds).forEach(key => {
            this.adaptiveThresholds[key] = Math.max(0.3, Math.min(0.95, this.adaptiveThresholds[key]));
        });
    }

    calculateFalsePositiveRate(data) {
        // Simplified calculation - would use user feedback in production
        return Math.random() * 0.1; // 0-10% simulated rate
    }

    calculateFalseNegativeRate(data) {
        // Simplified calculation - would use user feedback in production
        return Math.random() * 0.15; // 0-15% simulated rate
    }

    updateStats(strategy, blocked) {
        this.blockingStats.totalBlocked += blocked ? 1 : 0;
        
        const strategyCount = this.blockingStats.byStrategy.get(strategy) || 0;
        this.blockingStats.byStrategy.set(strategy, strategyCount + (blocked ? 1 : 0));
    }

    startPerformanceMonitoring() {
        setInterval(() => {
            this.logPerformanceMetrics();
        }, 60000); // Every minute
    }

    logPerformanceMetrics() {
        const stats = {
            totalBlocked: this.blockingStats.totalBlocked,
            strategiesUsed: Array.from(this.blockingStats.byStrategy.entries()),
            thresholds: this.adaptiveThresholds,
            learningDataSize: this.learningData.length
        };

        console.log('Advanced Blocker Performance:', stats);
    }

    /**
     * Initialize ML components
     */
    async initializeMachineLearning() {
        // In production, this would load a trained model
        this.mlModel = {
            loaded: true,
            version: '1.0.0',
            accuracy: 0.89
        };
    }

    loadHeuristicRules() {
        // Load additional heuristic rules
        this.heuristicRules = [
            { pattern: 'ads/', weight: 0.7 },
            { pattern: 'banner', weight: 0.6 },
            { pattern: 'popup', weight: 0.8 }
        ];
    }

    /**
     * Get comprehensive statistics
     */
    getAdvancedStats() {
        return {
            blocking: this.blockingStats,
            thresholds: this.adaptiveThresholds,
            learning: {
                dataPoints: this.learningData.length,
                modelAccuracy: this.mlModel?.accuracy || 0
            },
            strategies: Array.from(this.blockingStrategies.keys())
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FilterFoxAdvancedBlocker;
} else if (typeof window !== 'undefined') {
    window.FilterFoxAdvancedBlocker = FilterFoxAdvancedBlocker;
}