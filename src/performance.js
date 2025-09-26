/**
 * FilterFox Performance Optimization Module
 * Implements caching, lazy loading, and resource optimization
 */

class FilterFoxPerformance {
    constructor() {
        this.cache = new Map();
        this.requestQueue = [];
        this.batchSize = 100;
        this.debounceTimeout = null;
        this.observerCache = new WeakMap();
        this.performanceMetrics = {
            startTime: performance.now(),
            blockedRequests: 0,
            cacheHits: 0,
            cacheMisses: 0,
            averageProcessingTime: 0
        };
    }

    /**
     * Initialize performance optimizations
     */
    init() {
        this.setupRequestBatching();
        this.initializeLazyLoading();
        this.setupMemoryManagement();
        this.startPerformanceMonitoring();
        this.optimizeEventListeners();
    }

    /**
     * Optimized URL pattern matching with caching
     */
    isBlocked(url, useCache = true) {
        const startTime = performance.now();
        
        if (useCache && this.cache.has(url)) {
            this.performanceMetrics.cacheHits++;
            return this.cache.get(url);
        }

        this.performanceMetrics.cacheMisses++;
        const result = this.performBlockCheck(url);
        
        // Cache result with TTL
        if (this.cache.size > 10000) {
            this.cleanupCache();
        }
        this.cache.set(url, { result, timestamp: Date.now() });

        // Update performance metrics
        const processingTime = performance.now() - startTime;
        this.updateAverageProcessingTime(processingTime);

        return result;
    }

    /**
     * Perform the actual block check with optimized regex
     */
    performBlockCheck(url) {
        // Optimized pattern matching using compiled regex
        const compiledPatterns = this.getCompiledPatterns();
        
        for (const pattern of compiledPatterns) {
            if (pattern.test(url)) {
                this.performanceMetrics.blockedRequests++;
                return true;
            }
        }
        return false;
    }

    /**
     * Get pre-compiled regex patterns for better performance
     */
    getCompiledPatterns() {
        if (!this.compiledPatterns) {
            const patterns = [
                /doubleclick\.net/,
                /googleadservices\.com/,
                /googlesyndication\.com/,
                /amazon-adsystem\.com/,
                /facebook\.com\/tr/,
                /google-analytics\.com/,
                /googletagmanager\.com/,
                /scorecardresearch\.com/,
                /quantserve\.com/,
                /outbrain\.com/,
                /taboola\.com/,
                /adsystem\.com/
            ];
            this.compiledPatterns = patterns;
        }
        return this.compiledPatterns;
    }

    /**
     * Batch request processing to reduce overhead
     */
    setupRequestBatching() {
        chrome.webRequest.onBeforeRequest.addListener(
            (details) => {
                this.requestQueue.push(details);
                
                if (this.requestQueue.length >= this.batchSize) {
                    this.processBatch();
                } else {
                    this.debounceBatchProcessing();
                }
            },
            { urls: ["<all_urls>"] },
            ["blocking"]
        );
    }

    /**
     * Process requests in batches for efficiency
     */
    processBatch() {
        const batch = this.requestQueue.splice(0, this.batchSize);
        const startTime = performance.now();

        batch.forEach(details => {
            if (this.isBlocked(details.url)) {
                chrome.webRequest.handlerBehaviorChanged();
            }
        });

        const processingTime = performance.now() - startTime;
        console.log(`Processed batch of ${batch.length} requests in ${processingTime.toFixed(2)}ms`);
    }

    /**
     * Debounce batch processing to optimize performance
     */
    debounceBatchProcessing() {
        clearTimeout(this.debounceTimeout);
        this.debounceTimeout = setTimeout(() => {
            if (this.requestQueue.length > 0) {
                this.processBatch();
            }
        }, 50);
    }

    /**
     * Initialize lazy loading for DOM elements
     */
    initializeLazyLoading() {
        // Intersection Observer for lazy loading
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.loadElement(entry.target);
                    observer.unobserve(entry.target);
                }
            });
        }, {
            rootMargin: '50px',
            threshold: 0.1
        });

        // Observe elements that should be lazy loaded
        document.addEventListener('DOMContentLoaded', () => {
            const lazyElements = document.querySelectorAll('[data-lazy]');
            lazyElements.forEach(element => observer.observe(element));
        });
    }

    /**
     * Load element with performance tracking
     */
    loadElement(element) {
        const startTime = performance.now();
        
        // Simulate element loading
        element.removeAttribute('data-lazy');
        element.classList.add('loaded');
        
        const loadTime = performance.now() - startTime;
        console.log(`Element loaded in ${loadTime.toFixed(2)}ms`);
    }

    /**
     * Memory management and cleanup
     */
    setupMemoryManagement() {
        // Periodic cache cleanup
        setInterval(() => {
            this.cleanupCache();
            this.cleanupObservers();
        }, 300000); // 5 minutes

        // Listen for memory pressure events
        if ('memory' in performance) {
            this.monitorMemoryUsage();
        }
    }

    /**
     * Clean up expired cache entries
     */
    cleanupCache() {
        const now = Date.now();
        const maxAge = 600000; // 10 minutes

        for (const [url, data] of this.cache.entries()) {
            if (now - data.timestamp > maxAge) {
                this.cache.delete(url);
            }
        }

        // If still too large, remove oldest entries
        if (this.cache.size > 10000) {
            const entries = Array.from(this.cache.entries());
            entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
            entries.slice(0, 2000).forEach(([url]) => this.cache.delete(url));
        }
    }

    /**
     * Clean up unused observers
     */
    cleanupObservers() {
        // WeakMap automatically cleans up when elements are garbage collected
        // Additional cleanup for any persistent references
        this.observerCache = new WeakMap();
    }

    /**
     * Monitor memory usage and optimize accordingly
     */
    monitorMemoryUsage() {
        setInterval(() => {
            const memory = performance.memory;
            const usage = memory.usedJSHeapSize / memory.jsHeapSizeLimit;

            if (usage > 0.8) {
                console.warn('High memory usage detected, performing cleanup');
                this.aggressiveCleanup();
            }
        }, 60000); // Check every minute
    }

    /**
     * Aggressive cleanup when memory usage is high
     */
    aggressiveCleanup() {
        // Clear cache
        this.cache.clear();
        
        // Force garbage collection if available
        if (window.gc) {
            window.gc();
        }

        // Reset performance metrics
        this.performanceMetrics.cacheHits = 0;
        this.performanceMetrics.cacheMisses = 0;
    }

    /**
     * Start performance monitoring
     */
    startPerformanceMonitoring() {
        // Performance observer for measuring timing
        if ('PerformanceObserver' in window) {
            const observer = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                entries.forEach(entry => {
                    if (entry.name.includes('filterfox')) {
                        this.trackPerformanceEntry(entry);
                    }
                });
            });

            observer.observe({ entryTypes: ['measure', 'navigation'] });
        }

        // Regular performance reporting
        setInterval(() => {
            this.reportPerformanceMetrics();
        }, 300000); // Every 5 minutes
    }

    /**
     * Track performance entry
     */
    trackPerformanceEntry(entry) {
        console.log(`Performance: ${entry.name} took ${entry.duration.toFixed(2)}ms`);
    }

    /**
     * Report performance metrics
     */
    reportPerformanceMetrics() {
        const metrics = {
            ...this.performanceMetrics,
            cacheEfficiency: (this.performanceMetrics.cacheHits / 
                (this.performanceMetrics.cacheHits + this.performanceMetrics.cacheMisses) * 100).toFixed(2),
            uptime: performance.now() - this.performanceMetrics.startTime,
            memoryUsage: performance.memory ? performance.memory.usedJSHeapSize : 'N/A'
        };

        console.log('FilterFox Performance Metrics:', metrics);
    }

    /**
     * Optimize event listeners with passive flags
     */
    optimizeEventListeners() {
        // Use passive listeners for scroll and touch events
        const passiveEvents = ['scroll', 'touchstart', 'touchmove', 'wheel'];
        
        passiveEvents.forEach(eventType => {
            document.addEventListener(eventType, this.handlePassiveEvent.bind(this), {
                passive: true,
                capture: false
            });
        });
    }

    /**
     * Handle passive events efficiently
     */
    handlePassiveEvent(event) {
        // Throttle event handling
        if (!this.lastEventTime || Date.now() - this.lastEventTime > 16) {
            this.lastEventTime = Date.now();
            // Process event
        }
    }

    /**
     * Update average processing time
     */
    updateAverageProcessingTime(newTime) {
        const count = this.performanceMetrics.blockedRequests;
        const currentAverage = this.performanceMetrics.averageProcessingTime;
        this.performanceMetrics.averageProcessingTime = 
            (currentAverage * (count - 1) + newTime) / count;
    }

    /**
     * Get current performance statistics
     */
    getPerformanceStats() {
        return {
            ...this.performanceMetrics,
            cacheSize: this.cache.size,
            cacheEfficiency: (this.performanceMetrics.cacheHits / 
                (this.performanceMetrics.cacheHits + this.performanceMetrics.cacheMisses) * 100) || 0,
            memoryUsage: performance.memory ? {
                used: performance.memory.usedJSHeapSize,
                total: performance.memory.totalJSHeapSize,
                limit: performance.memory.jsHeapSizeLimit
            } : null
        };
    }

    /**
     * Benchmark performance
     */
    async benchmark(iterations = 1000) {
        const testUrls = [
            'https://doubleclick.net/ads',
            'https://example.com/normal',
            'https://googleadservices.com/pagead',
            'https://clean-site.com/content'
        ];

        const startTime = performance.now();
        
        for (let i = 0; i < iterations; i++) {
            const url = testUrls[i % testUrls.length];
            this.isBlocked(url);
        }

        const endTime = performance.now();
        const averageTime = (endTime - startTime) / iterations;

        return {
            totalTime: endTime - startTime,
            averageTime,
            requestsPerSecond: 1000 / averageTime,
            cacheEfficiency: this.getPerformanceStats().cacheEfficiency
        };
    }
}

// Initialize performance optimizations
if (typeof chrome !== 'undefined' && chrome.runtime) {
    const performanceOptimizer = new FilterFoxPerformance();
    performanceOptimizer.init();
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FilterFoxPerformance;
}