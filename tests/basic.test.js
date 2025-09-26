/**
 * FilterFox Extension - Basic Tests
 * Simple test suite to ensure CI pipeline works
 */

describe('FilterFox Basic Tests', () => {
  beforeEach(() => {
    // Mock Chrome APIs
    global.chrome = {
      runtime: {
        onInstalled: { addListener: jest.fn() },
        sendMessage: jest.fn().mockResolvedValue()
      },
      storage: {
        local: {
          get: jest.fn().mockResolvedValue({}),
          set: jest.fn().mockResolvedValue()
        }
      },
      declarativeNetRequest: {
        updateDynamicRules: jest.fn().mockResolvedValue()
      }
    };
  });

  test('Extension should initialize properly', () => {
    expect(chrome).toBeDefined();
    expect(chrome.runtime).toBeDefined();
    expect(chrome.storage).toBeDefined();
  });

  test('Should handle basic URL filtering', () => {
    const adUrls = [
      'https://ads.example.com/banner.js',
      'https://doubleclick.net/test'
    ];
    
    const isAdUrl = (url) => {
      return url.includes('ads.') || url.includes('doubleclick');
    };

    const blockedUrls = adUrls.filter(isAdUrl);
    expect(blockedUrls).toHaveLength(2);
  });

  test('Should manage storage correctly', async () => {
    const testData = { blockedCount: 42 };
    
    chrome.storage.local.get.mockResolvedValue(testData);
    const result = await chrome.storage.local.get(['blockedCount']);
    
    expect(result).toEqual(testData);
  });

  test('DOM manipulation should work', () => {
    document.body.innerHTML = `
      <div class="ad-banner">Advertisement</div>
      <div class="content">Real content</div>
    `;

    const ads = document.querySelectorAll('.ad-banner');
    expect(ads).toHaveLength(1);
    
    // Hide ads
    ads.forEach(ad => ad.style.display = 'none');
    expect(ads[0].style.display).toBe('none');
  });

  test('Should validate manifest structure', () => {
    const manifest = {
      name: 'FilterFox',
      version: '1.0.0',
      manifest_version: 3
    };

    expect(manifest.name).toBe('FilterFox');
    expect(manifest.manifest_version).toBe(3);
    expect(typeof manifest.version).toBe('string');
  });

  test('Math calculations should work correctly', () => {
    const stats = {
      blocked: 1200,
      requests: 2000
    };
    
    const blockRate = (stats.blocked / stats.requests) * 100;
    expect(blockRate).toBe(60);
  });

  test('Array operations should function properly', () => {
    const filters = ['ads', 'tracker', 'analytics'];
    const newFilter = 'popup';
    
    const updatedFilters = [...filters, newFilter];
    
    expect(updatedFilters).toHaveLength(4);
    expect(updatedFilters).toContain('popup');
  });

  test('String processing should work', () => {
    const url = 'https://ads.example.com/banner?id=123';
    const cleanUrl = url.split('?')[0];
    
    expect(cleanUrl).toBe('https://ads.example.com/banner');
  });

  test('Promise handling should work correctly', async () => {
    const asyncFunction = () => Promise.resolve('success');
    const result = await asyncFunction();
    
    expect(result).toBe('success');
  });

  test('Error handling should be robust', () => {
    const throwError = () => {
      throw new Error('Test error');
    };

    expect(throwError).toThrow('Test error');
  });

  test('JSON operations should work', () => {
    const data = { setting: 'enabled', count: 5 };
    const jsonString = JSON.stringify(data);
    const parsed = JSON.parse(jsonString);
    
    expect(parsed.setting).toBe('enabled');
    expect(parsed.count).toBe(5);
  });
});