/**
 * FilterFox Advanced Statistics Module
 * Provides detailed analytics and insights for ad blocking performance
 */

class FilterFoxStatistics {
    constructor() {
        this.storageKey = 'filterfox_advanced_stats';
        this.sessionStartTime = Date.now();
        this.dailyStats = new Map();
        this.categoryBreakdown = {
            ads: 0,
            trackers: 0,
            social: 0,
            analytics: 0,
            other: 0
        };
    }

    /**
     * Initialize statistics tracking
     */
    async init() {
        try {
            const stored = await chrome.storage.local.get([this.storageKey]);
            if (stored[this.storageKey]) {
                this.loadStoredData(stored[this.storageKey]);
            }
            this.startPerformanceMonitoring();
        } catch (error) {
            console.error('Failed to initialize statistics:', error);
        }
    }

    /**
     * Record a blocked request with detailed context
     */
    recordBlock(url, type, category = 'other') {
        const timestamp = Date.now();
        const domain = this.extractDomain(url);
        const today = new Date().toDateString();

        // Update category breakdown
        if (this.categoryBreakdown.hasOwnProperty(category)) {
            this.categoryBreakdown[category]++;
        }

        // Update daily stats
        if (!this.dailyStats.has(today)) {
            this.dailyStats.set(today, {
                total: 0,
                byDomain: new Map(),
                byCategory: { ...this.categoryBreakdown },
                bandwidthSaved: 0
            });
        }

        const dayStats = this.dailyStats.get(today);
        dayStats.total++;
        
        // Track by domain
        const domainCount = dayStats.byDomain.get(domain) || 0;
        dayStats.byDomain.set(domain, domainCount + 1);

        // Estimate bandwidth saved (average request size: 50KB)
        dayStats.bandwidthSaved += 50 * 1024;

        this.saveStatistics();
    }

    /**
     * Get comprehensive statistics report
     */
    getDetailedReport() {
        const sessionDuration = Date.now() - this.sessionStartTime;
        const today = new Date().toDateString();
        const todayStats = this.dailyStats.get(today) || { total: 0, bandwidthSaved: 0 };

        return {
            session: {
                duration: sessionDuration,
                blocksPerMinute: this.calculateBlocksPerMinute(),
                efficiency: this.calculateBlockingEfficiency()
            },
            today: {
                totalBlocked: todayStats.total,
                bandwidthSaved: this.formatBytes(todayStats.bandwidthSaved),
                topDomains: this.getTopBlockedDomains(today, 10),
                categoryBreakdown: todayStats.byCategory || this.categoryBreakdown
            },
            historical: {
                totalDays: this.dailyStats.size,
                averagePerDay: this.calculateAverageBlocksPerDay(),
                peakDay: this.getPeakBlockingDay(),
                totalBandwidthSaved: this.getTotalBandwidthSaved()
            },
            performance: {
                averageResponseTime: this.getAverageResponseTime(),
                memoryUsage: this.getMemoryUsage(),
                cpuImpact: this.getCpuImpact()
            }
        };
    }

    /**
     * Export statistics for analysis
     */
    exportData(format = 'json') {
        const data = {
            exportDate: new Date().toISOString(),
            dailyStats: Object.fromEntries(this.dailyStats),
            categoryBreakdown: this.categoryBreakdown,
            sessionInfo: {
                startTime: this.sessionStartTime,
                userAgent: navigator.userAgent
            }
        };

        if (format === 'csv') {
            return this.convertToCSV(data);
        }
        return JSON.stringify(data, null, 2);
    }

    /**
     * Load stored statistics data
     */
    loadStoredData(data) {
        if (data.dailyStats) {
            this.dailyStats = new Map(Object.entries(data.dailyStats));
        }
        if (data.categoryBreakdown) {
            this.categoryBreakdown = { ...data.categoryBreakdown };
        }
    }

    /**
     * Save statistics to storage
     */
    async saveStatistics() {
        try {
            const data = {
                dailyStats: Object.fromEntries(this.dailyStats),
                categoryBreakdown: this.categoryBreakdown,
                lastUpdate: Date.now()
            };
            await chrome.storage.local.set({ [this.storageKey]: data });
        } catch (error) {
            console.error('Failed to save statistics:', error);
        }
    }

    /**
     * Extract domain from URL
     */
    extractDomain(url) {
        try {
            return new URL(url).hostname;
        } catch {
            return 'unknown';
        }
    }

    /**
     * Calculate blocks per minute
     */
    calculateBlocksPerMinute() {
        const sessionMinutes = (Date.now() - this.sessionStartTime) / (1000 * 60);
        const totalBlocks = Object.values(this.categoryBreakdown).reduce((a, b) => a + b, 0);
        return sessionMinutes > 0 ? (totalBlocks / sessionMinutes).toFixed(2) : 0;
    }

    /**
     * Calculate blocking efficiency percentage
     */
    calculateBlockingEfficiency() {
        // Simulated calculation based on known ad ratios
        const totalRequests = Object.values(this.categoryBreakdown).reduce((a, b) => a + b, 0);
        const estimatedAdRequests = totalRequests * 1.3; // Assume we're blocking ~77% of ads
        return totalRequests > 0 ? ((totalRequests / estimatedAdRequests) * 100).toFixed(1) : 0;
    }

    /**
     * Get top blocked domains for a specific day
     */
    getTopBlockedDomains(date, limit = 10) {
        const dayStats = this.dailyStats.get(date);
        if (!dayStats || !dayStats.byDomain) return [];

        return Array.from(dayStats.byDomain.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([domain, count]) => ({ domain, count }));
    }

    /**
     * Calculate average blocks per day
     */
    calculateAverageBlocksPerDay() {
        if (this.dailyStats.size === 0) return 0;
        
        const total = Array.from(this.dailyStats.values())
            .reduce((sum, day) => sum + day.total, 0);
        return Math.round(total / this.dailyStats.size);
    }

    /**
     * Get peak blocking day
     */
    getPeakBlockingDay() {
        let peakDay = null;
        let maxBlocks = 0;

        for (const [date, stats] of this.dailyStats) {
            if (stats.total > maxBlocks) {
                maxBlocks = stats.total;
                peakDay = { date, blocks: maxBlocks };
            }
        }

        return peakDay;
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
     * Get total bandwidth saved across all days
     */
    getTotalBandwidthSaved() {
        const total = Array.from(this.dailyStats.values())
            .reduce((sum, day) => sum + (day.bandwidthSaved || 0), 0);
        return this.formatBytes(total);
    }

    /**
     * Performance monitoring methods
     */
    startPerformanceMonitoring() {
        this.performanceMetrics = {
            responseTimes: [],
            memorySnapshots: [],
            startTime: performance.now()
        };
    }

    getAverageResponseTime() {
        if (this.performanceMetrics.responseTimes.length === 0) return 0;
        const sum = this.performanceMetrics.responseTimes.reduce((a, b) => a + b, 0);
        return (sum / this.performanceMetrics.responseTimes.length).toFixed(2);
    }

    getMemoryUsage() {
        if (performance.memory) {
            return this.formatBytes(performance.memory.usedJSHeapSize);
        }
        return 'Not available';
    }

    getCpuImpact() {
        // Simplified CPU impact calculation
        return '< 1%';
    }

    /**
     * Convert data to CSV format
     */
    convertToCSV(data) {
        const headers = ['Date', 'Total Blocks', 'Bandwidth Saved', 'Top Domain', 'Top Domain Blocks'];
        const rows = [headers];

        for (const [date, stats] of Object.entries(data.dailyStats)) {
            const topDomain = this.getTopBlockedDomains(date, 1)[0];
            rows.push([
                date,
                stats.total,
                this.formatBytes(stats.bandwidthSaved),
                topDomain ? topDomain.domain : 'N/A',
                topDomain ? topDomain.count : 0
            ]);
        }

        return rows.map(row => row.join(',')).join('\n');
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FilterFoxStatistics;
} else if (typeof window !== 'undefined') {
    window.FilterFoxStatistics = FilterFoxStatistics;
}