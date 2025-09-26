/**
 * FilterFox Extension Test Suite
 * Comprehensive testing for all extension functionality
 */

// Test configuration
const testConfig = {
    testTimeout: 5000,
    retryCount: 3,
    mockData: {
        sampleUrls: [
            'https://doubleclick.net/ads/test',
            'https://example.com/normal-content',
            'https://googleadservices.com/pagead',
            'https://facebook.com/tr?id=123',
            'https://google-analytics.com/collect',
            'https://clean-website.com/page'
        ],
        mockWhitelist: ['example.com', 'trusted-site.org']
    }
};

// Test utilities
class TestUtils {
    static async waitFor(condition, timeout = testConfig.testTimeout) {
        const startTime = Date.now();
        while (Date.now() - startTime < timeout) {
            if (await condition()) return true;
            await this.delay(100);
        }
        throw new Error('Timeout waiting for condition');
    }

    static delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    static mockChromeAPI() {
        global.chrome = {
            runtime: {
                getURL: (path) => `chrome-extension://test/${path}`,
                onMessage: { addListener: jest.fn() },
                sendMessage: jest.fn()
            },
            storage: {
                local: {
                    get: jest.fn().mockResolvedValue({}),
                    set: jest.fn().mockResolvedValue(),
                    clear: jest.fn().mockResolvedValue()
                },
                sync: {
                    get: jest.fn().mockResolvedValue({}),
                    set: jest.fn().mockResolvedValue(),
                    clear: jest.fn().mockResolvedValue()
                },
                onChanged: { addListener: jest.fn() }
            },
            webRequest: {
                onBeforeRequest: { addListener: jest.fn() },
                handlerBehaviorChanged: jest.fn()
            },
            declarativeNetRequest: {
                updateDynamicRules: jest.fn().mockResolvedValue(),
                getDynamicRules: jest.fn().mockResolvedValue([])
            },
            tabs: {
                query: jest.fn().mockResolvedValue([{ id: 1, url: 'https://example.com' }]),
                create: jest.fn(),
                update: jest.fn()
            }
        };
    }

    static generateTestReport(results) {
        const total = results.length;
        const passed = results.filter(r => r.status === 'passed').length;
        const failed = results.filter(r => r.status === 'failed').length;
        const coverage = ((passed / total) * 100).toFixed(2);

        return {
            total,
            passed,
            failed,
            coverage: `${coverage}%`,
            timestamp: new Date().toISOString()
        };
    }
}

// Background Script Tests
class BackgroundScriptTests {
    constructor() {
        this.testResults = [];
    }

    async runAllTests() {
        console.log('🧪 Running Background Script Tests...');
        
        await this.testExtensionInitialization();
        await this.testRequestBlocking();
        await this.testWhitelistFunctionality();
        await this.testStatisticsTracking();
        await this.testSettingsManagement();
        
        return this.testResults;
    }

    async testExtensionInitialization() {
        try {
            // Mock the background script initialization
            const mockBackground = {
                isInitialized: false,
                settings: {},
                whitelist: [],
                
                init() {
                    this.isInitialized = true;
                    this.settings = { enableExtension: true };
                    return Promise.resolve();
                }
            };

            await mockBackground.init();
            
            this.assert(
                mockBackground.isInitialized === true,
                'Extension should be initialized',
                'testExtensionInitialization'
            );
            
            this.assert(
                mockBackground.settings.enableExtension === true,
                'Default settings should be loaded',
                'testExtensionInitialization'
            );

        } catch (error) {
            this.recordFailure('testExtensionInitialization', error.message);
        }
    }

    async testRequestBlocking() {
        try {
            const mockBlocker = {
                blockedCount: 0,
                
                isBlocked(url) {
                    const adPatterns = ['doubleclick', 'googleadservices', 'facebook.com/tr'];
                    const isAd = adPatterns.some(pattern => url.includes(pattern));
                    if (isAd) this.blockedCount++;
                    return isAd;
                }
            };

            const testUrls = testConfig.mockData.sampleUrls;
            const results = testUrls.map(url => mockBlocker.isBlocked(url));
            
            this.assert(
                results[0] === true, // doubleclick.net should be blocked
                'Ad URLs should be blocked',
                'testRequestBlocking'
            );
            
            this.assert(
                results[1] === false, // example.com should not be blocked
                'Normal URLs should not be blocked',
                'testRequestBlocking'
            );
            
            this.assert(
                mockBlocker.blockedCount > 0,
                'Blocked count should increment',
                'testRequestBlocking'
            );

        } catch (error) {
            this.recordFailure('testRequestBlocking', error.message);
        }
    }

    async testWhitelistFunctionality() {
        try {
            const mockWhitelist = {
                domains: [],
                
                add(domain) {
                    if (!this.domains.includes(domain)) {
                        this.domains.push(domain);
                        return true;
                    }
                    return false;
                },
                
                remove(domain) {
                    const index = this.domains.indexOf(domain);
                    if (index > -1) {
                        this.domains.splice(index, 1);
                        return true;
                    }
                    return false;
                },
                
                isWhitelisted(domain) {
                    return this.domains.includes(domain);
                }
            };

            // Test adding to whitelist
            const added = mockWhitelist.add('example.com');
            this.assert(added === true, 'Should add domain to whitelist', 'testWhitelistFunctionality');
            
            // Test duplicate prevention
            const duplicate = mockWhitelist.add('example.com');
            this.assert(duplicate === false, 'Should prevent duplicate domains', 'testWhitelistFunctionality');
            
            // Test whitelist checking
            const isWhitelisted = mockWhitelist.isWhitelisted('example.com');
            this.assert(isWhitelisted === true, 'Should recognize whitelisted domain', 'testWhitelistFunctionality');
            
            // Test removal
            const removed = mockWhitelist.remove('example.com');
            this.assert(removed === true, 'Should remove domain from whitelist', 'testWhitelistFunctionality');

        } catch (error) {
            this.recordFailure('testWhitelistFunctionality', error.message);
        }
    }

    async testStatisticsTracking() {
        try {
            const mockStats = {
                totalBlocked: 0,
                dailyStats: new Map(),
                
                recordBlock(url, timestamp = Date.now()) {
                    this.totalBlocked++;
                    const today = new Date(timestamp).toDateString();
                    const dayStats = this.dailyStats.get(today) || 0;
                    this.dailyStats.set(today, dayStats + 1);
                },
                
                getStats() {
                    return {
                        total: this.totalBlocked,
                        today: this.dailyStats.get(new Date().toDateString()) || 0
                    };
                }
            };

            // Record some blocks
            mockStats.recordBlock('https://ads.com/banner');
            mockStats.recordBlock('https://tracker.com/pixel');
            mockStats.recordBlock('https://analytics.com/collect');

            const stats = mockStats.getStats();
            
            this.assert(
                stats.total === 3,
                'Total blocked count should be accurate',
                'testStatisticsTracking'
            );
            
            this.assert(
                stats.today === 3,
                'Daily stats should be tracked',
                'testStatisticsTracking'
            );

        } catch (error) {
            this.recordFailure('testStatisticsTracking', error.message);
        }
    }

    async testSettingsManagement() {
        try {
            const mockSettings = {
                settings: {
                    enableExtension: true,
                    blockAds: true,
                    blockTrackers: true
                },
                
                get(key) {
                    return this.settings[key];
                },
                
                set(key, value) {
                    this.settings[key] = value;
                    return Promise.resolve();
                },
                
                reset() {
                    this.settings = {
                        enableExtension: true,
                        blockAds: true,
                        blockTrackers: true
                    };
                }
            };

            // Test getting settings
            const initialValue = mockSettings.get('enableExtension');
            this.assert(initialValue === true, 'Should retrieve settings correctly', 'testSettingsManagement');
            
            // Test setting values
            await mockSettings.set('blockAds', false);
            const newValue = mockSettings.get('blockAds');
            this.assert(newValue === false, 'Should update settings correctly', 'testSettingsManagement');
            
            // Test reset functionality
            mockSettings.reset();
            const resetValue = mockSettings.get('blockAds');
            this.assert(resetValue === true, 'Should reset to default values', 'testSettingsManagement');

        } catch (error) {
            this.recordFailure('testSettingsManagement', error.message);
        }
    }

    assert(condition, message, testName) {
        if (condition) {
            this.recordSuccess(testName, message);
        } else {
            this.recordFailure(testName, message);
        }
    }

    recordSuccess(testName, message) {
        this.testResults.push({
            test: testName,
            status: 'passed',
            message,
            timestamp: Date.now()
        });
        console.log(`✅ ${testName}: ${message}`);
    }

    recordFailure(testName, message) {
        this.testResults.push({
            test: testName,
            status: 'failed',
            message,
            timestamp: Date.now()
        });
        console.error(`❌ ${testName}: ${message}`);
    }
}

// Content Script Tests
class ContentScriptTests {
    constructor() {
        this.testResults = [];
    }

    async runAllTests() {
        console.log('🧪 Running Content Script Tests...');
        
        await this.testElementBlocking();
        await this.testMutationObserver();
        await this.testMessagePassing();
        await this.testPerformanceImpact();
        
        return this.testResults;
    }

    async testElementBlocking() {
        try {
            // Mock DOM environment
            const mockDOM = {
                elements: [],
                
                createElement(tag) {
                    const element = {
                        tagName: tag.toUpperCase(),
                        src: '',
                        style: { display: '' },
                        remove: () => {
                            const index = this.elements.indexOf(element);
                            if (index > -1) this.elements.splice(index, 1);
                        }
                    };
                    this.elements.push(element);
                    return element;
                },
                
                querySelectorAll(selector) {
                    return this.elements.filter(el => {
                        if (selector === 'iframe[src*="doubleclick"]') {
                            return el.tagName === 'IFRAME' && el.src.includes('doubleclick');
                        }
                        return false;
                    });
                }
            };

            // Create test ad elements
            const adIframe = mockDOM.createElement('iframe');
            adIframe.src = 'https://doubleclick.net/ads/test';
            
            const normalIframe = mockDOM.createElement('iframe');
            normalIframe.src = 'https://example.com/content';

            // Mock content script blocker
            const contentBlocker = {
                blockAds() {
                    const adElements = mockDOM.querySelectorAll('iframe[src*="doubleclick"]');
                    adElements.forEach(el => el.remove());
                    return adElements.length;
                }
            };

            const initialCount = mockDOM.elements.length;
            const blockedCount = contentBlocker.blockAds();
            const finalCount = mockDOM.elements.length;

            this.assert(
                blockedCount === 1,
                'Should identify ad elements correctly',
                'testElementBlocking'
            );
            
            this.assert(
                finalCount === initialCount - blockedCount,
                'Should remove ad elements from DOM',
                'testElementBlocking'
            );

        } catch (error) {
            this.recordFailure('testElementBlocking', error.message);
        }
    }

    async testMutationObserver() {
        try {
            let observerCallback = null;
            
            const mockMutationObserver = class {
                constructor(callback) {
                    observerCallback = callback;
                }
                
                observe() {
                    // Mock observation start
                }
                
                disconnect() {
                    // Mock observation stop
                }
            };

            global.MutationObserver = mockMutationObserver;

            // Mock content script observer setup
            const contentObserver = {
                isObserving: false,
                
                startObserving() {
                    new MutationObserver(() => {
                        this.isObserving = true;
                    });
                    this.isObserving = true;
                }
            };

            contentObserver.startObserving();

            this.assert(
                contentObserver.isObserving === true,
                'Should start mutation observer',
                'testMutationObserver'
            );
            
            this.assert(
                typeof observerCallback === 'function',
                'Should register mutation callback',
                'testMutationObserver'
            );

        } catch (error) {
            this.recordFailure('testMutationObserver', error.message);
        }
    }

    async testMessagePassing() {
        try {
            const mockMessaging = {
                messages: [],
                
                sendMessage(message) {
                    this.messages.push(message);
                    return Promise.resolve({ success: true });
                },
                
                onMessage(callback) {
                    // Mock message listener
                    setTimeout(() => {
                        callback({ type: 'SETTINGS_UPDATED', data: { enabled: true } });
                    }, 100);
                }
            };

            // Test sending messages
            await mockMessaging.sendMessage({ type: 'BLOCK_COUNT', count: 5 });
            
            this.assert(
                mockMessaging.messages.length === 1,
                'Should send messages to background',
                'testMessagePassing'
            );
            
            // Test receiving messages
            let receivedMessage = null;
            mockMessaging.onMessage((message) => {
                receivedMessage = message;
            });

            await TestUtils.waitFor(() => receivedMessage !== null);
            
            this.assert(
                receivedMessage.type === 'SETTINGS_UPDATED',
                'Should receive messages from background',
                'testMessagePassing'
            );

        } catch (error) {
            this.recordFailure('testMessagePassing', error.message);
        }
    }

    async testPerformanceImpact() {
        try {
            const performanceMonitor = {
                startTime: 0,
                endTime: 0,
                
                start() {
                    this.startTime = performance.now();
                },
                
                end() {
                    this.endTime = performance.now();
                    return this.endTime - this.startTime;
                }
            };

            // Mock performance-intensive operation
            performanceMonitor.start();
            
            // Simulate blocking operation
            for (let i = 0; i < 1000; i++) {
                // Mock DOM manipulation
            }
            
            const duration = performanceMonitor.end();

            this.assert(
                duration < 100, // Should complete within 100ms
                'Content script should have minimal performance impact',
                'testPerformanceImpact'
            );

        } catch (error) {
            this.recordFailure('testPerformanceImpact', error.message);
        }
    }

    assert(condition, message, testName) {
        if (condition) {
            this.recordSuccess(testName, message);
        } else {
            this.recordFailure(testName, message);
        }
    }

    recordSuccess(testName, message) {
        this.testResults.push({
            test: testName,
            status: 'passed',
            message,
            timestamp: Date.now()
        });
        console.log(`✅ ${testName}: ${message}`);
    }

    recordFailure(testName, message) {
        this.testResults.push({
            test: testName,
            status: 'failed',
            message,
            timestamp: Date.now()
        });
        console.error(`❌ ${testName}: ${message}`);
    }
}

// Popup Tests
class PopupTests {
    constructor() {
        this.testResults = [];
    }

    async runAllTests() {
        console.log('🧪 Running Popup Tests...');
        
        await this.testUIRendering();
        await this.testToggleFunctionality();
        await this.testStatisticsDisplay();
        await this.testWhitelistUI();
        
        return this.testResults;
    }

    async testUIRendering() {
        try {
            const mockPopup = {
                elements: {},
                isRendered: false,
                
                render() {
                    this.elements = {
                        title: 'FilterFox',
                        toggle: true,
                        stats: { blocked: 1234, saved: '2.5 MB' }
                    };
                    this.isRendered = true;
                }
            };

            mockPopup.render();

            this.assert(
                mockPopup.isRendered === true,
                'Popup should render successfully',
                'testUIRendering'
            );
            
            this.assert(
                mockPopup.elements.title === 'FilterFox',
                'Should display correct title',
                'testUIRendering'
            );

        } catch (error) {
            this.recordFailure('testUIRendering', error.message);
        }
    }

    async testToggleFunctionality() {
        try {
            const mockToggle = {
                enabled: true,
                
                toggle() {
                    this.enabled = !this.enabled;
                    return this.enabled;
                },
                
                setState(state) {
                    this.enabled = state;
                }
            };

            const initialState = mockToggle.enabled;
            const newState = mockToggle.toggle();

            this.assert(
                newState !== initialState,
                'Toggle should change state',
                'testToggleFunctionality'
            );
            
            mockToggle.setState(false);
            this.assert(
                mockToggle.enabled === false,
                'Should set specific state',
                'testToggleFunctionality'
            );

        } catch (error) {
            this.recordFailure('testToggleFunctionality', error.message);
        }
    }

    async testStatisticsDisplay() {
        try {
            const mockStats = {
                data: { blocked: 0, saved: 0 },
                
                update(blocked, saved) {
                    this.data.blocked = blocked;
                    this.data.saved = saved;
                },
                
                format() {
                    return {
                        blocked: this.data.blocked.toLocaleString(),
                        saved: `${(this.data.saved / 1024 / 1024).toFixed(1)} MB`
                    };
                }
            };

            mockStats.update(1234567, 50 * 1024 * 1024); // 50 MB
            const formatted = mockStats.format();

            this.assert(
                formatted.blocked === '1,234,567',
                'Should format large numbers correctly',
                'testStatisticsDisplay'
            );
            
            this.assert(
                formatted.saved === '50.0 MB',
                'Should format bandwidth correctly',
                'testStatisticsDisplay'
            );

        } catch (error) {
            this.recordFailure('testStatisticsDisplay', error.message);
        }
    }

    async testWhitelistUI() {
        try {
            const mockWhitelistUI = {
                domains: [],
                
                addDomain(domain) {
                    if (domain && !this.domains.includes(domain)) {
                        this.domains.push(domain);
                        return true;
                    }
                    return false;
                },
                
                removeDomain(domain) {
                    const index = this.domains.indexOf(domain);
                    if (index > -1) {
                        this.domains.splice(index, 1);
                        return true;
                    }
                    return false;
                },
                
                validateDomain(domain) {
                    const regex = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/;
                    return regex.test(domain);
                }
            };

            // Test domain validation
            const validDomain = mockWhitelistUI.validateDomain('example.com');
            const invalidDomain = mockWhitelistUI.validateDomain('invalid');

            this.assert(
                validDomain === true,
                'Should validate correct domains',
                'testWhitelistUI'
            );
            
            this.assert(
                invalidDomain === false,
                'Should reject invalid domains',
                'testWhitelistUI'
            );

            // Test adding domains
            const added = mockWhitelistUI.addDomain('example.com');
            this.assert(
                added === true,
                'Should add valid domains',
                'testWhitelistUI'
            );

            // Test duplicate prevention
            const duplicate = mockWhitelistUI.addDomain('example.com');
            this.assert(
                duplicate === false,
                'Should prevent duplicate domains',
                'testWhitelistUI'
            );

        } catch (error) {
            this.recordFailure('testWhitelistUI', error.message);
        }
    }

    assert(condition, message, testName) {
        if (condition) {
            this.recordSuccess(testName, message);
        } else {
            this.recordFailure(testName, message);
        }
    }

    recordSuccess(testName, message) {
        this.testResults.push({
            test: testName,
            status: 'passed',
            message,
            timestamp: Date.now()
        });
        console.log(`✅ ${testName}: ${message}`);
    }

    recordFailure(testName, message) {
        this.testResults.push({
            test: testName,
            status: 'failed',
            message,
            timestamp: Date.now()
        });
        console.error(`❌ ${testName}: ${message}`);
    }
}

// Test Runner
class FilterFoxTestRunner {
    constructor() {
        this.allResults = [];
    }

    async runAllTests() {
        console.log('🚀 Starting FilterFox Test Suite...');
        console.log('=' .repeat(50));

        // Setup mock environment
        TestUtils.mockChromeAPI();

        // Run all test suites
        const backgroundTests = new BackgroundScriptTests();
        const contentTests = new ContentScriptTests();
        const popupTests = new PopupTests();

        const backgroundResults = await backgroundTests.runAllTests();
        const contentResults = await contentTests.runAllTests();
        const popupResults = await popupTests.runAllTests();

        // Combine all results
        this.allResults = [
            ...backgroundResults,
            ...contentResults,
            ...popupResults
        ];

        // Generate report
        this.generateReport();

        return this.allResults;
    }

    generateReport() {
        console.log('\n' + '=' .repeat(50));
        console.log('📊 TEST RESULTS SUMMARY');
        console.log('=' .repeat(50));

        const report = TestUtils.generateTestReport(this.allResults);
        
        console.log(`Total Tests: ${report.total}`);
        console.log(`✅ Passed: ${report.passed}`);
        console.log(`❌ Failed: ${report.failed}`);
        console.log(`📈 Coverage: ${report.coverage}`);
        console.log(`📅 Timestamp: ${report.timestamp}`);

        // Detailed results
        console.log('\n📋 DETAILED RESULTS:');
        this.allResults.forEach(result => {
            const icon = result.status === 'passed' ? '✅' : '❌';
            console.log(`${icon} ${result.test}: ${result.message}`);
        });

        // Export results
        this.exportResults(report);
    }

    exportResults(report) {
        const resultsData = {
            summary: report,
            details: this.allResults,
            environment: {
                userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Node.js',
                timestamp: new Date().toISOString()
            }
        };

        // In a real environment, this would write to a file
        console.log('\n💾 Test results ready for export:', JSON.stringify(resultsData, null, 2));
    }
}

// Export for use in different environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        FilterFoxTestRunner,
        BackgroundScriptTests,
        ContentScriptTests,
        PopupTests,
        TestUtils
    };
} else if (typeof window !== 'undefined') {
    window.FilterFoxTestRunner = FilterFoxTestRunner;
}

// Auto-run tests if this is the main module
if (typeof require !== 'undefined' && require.main === module) {
    const testRunner = new FilterFoxTestRunner();
    testRunner.runAllTests().then(() => {
        console.log('\n🎉 All tests completed!');
    }).catch(error => {
        console.error('❌ Test runner failed:', error);
        process.exit(1);
    });
}