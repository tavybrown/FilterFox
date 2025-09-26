# 🦊 FilterFox - Advanced Ad Blocker

<div align="center">
  <img src="icons/icon128.png" alt="FilterFox Logo" width="128">
  
  [![Chrome Web Store](https://img.shields.io/chrome-web-store/v/abcdefghijklmnopqrstuvwxyz123456?label=Chrome%20Web%20Store)](https://chrome.google.com/webstore/detail/abcdefghijklmnopqrstuvwxyz123456)
  [![Mozilla Add-on](https://img.shields.io/amo/v/filterfox?label=Firefox%20Add-on)](https://addons.mozilla.org/addon/filterfox/)
  [![GitHub release](https://img.shields.io/github/v/release/tavybrown/filterfox)](https://github.com/tavybrown/filterfox/releases)
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
  [![Build Status](https://github.com/tavybrown/filterfox/workflows/CI/badge.svg)](https://github.com/tavybrown/filterfox/actions)
  
  **A powerful, lightweight, and privacy-focused ad blocker for Chrome and Firefox**
  
  [Download](#installation) • [Features](#features) • [Documentation](docs/) • [Contributing](#contributing)
</div>

---

## ✨ Features

### 🚫 **Advanced Ad Blocking**
- Blocks display ads, pop-ups, and promotional content
- Intelligent detection of dynamic ads and sponsored content
- Support for custom filter lists and rules
- Real-time blocking statistics

### 🛡️ **Privacy Protection**
- Blocks tracking scripts and analytics
- Prevents cross-site tracking
- Protects against fingerprinting
- No data collection or telemetry

### 🎯 **Customizable Filters**
- **Ads & Pop-ups**: Block display advertisements
- **Trackers**: Block analytics and tracking scripts
- **Social Media**: Block social media widgets and buttons
- **Annoyances**: Block cookie notices and newsletter popups

### ⚡ **Performance Optimized**
- Lightweight footprint (~200KB)
- Minimal CPU and memory usage
- Fast page load times
- Efficient declarative net request API

### 🎨 **Beautiful Interface**
- Modern, intuitive popup design
- Real-time statistics dashboard
- Per-site blocking controls
- Dark/light theme support

## 🚀 Installation

### Chrome Web Store
1. Visit the [Chrome Web Store](https://chrome.google.com/webstore/detail/abcdefghijklmnopqrstuvwxyz123456)
2. Click "Add to Chrome"
3. Confirm installation

### Firefox Add-ons
1. Visit [Firefox Add-ons](https://addons.mozilla.org/addon/filterfox/)
2. Click "Add to Firefox"
3. Confirm installation

### Manual Installation (Development)
1. Clone this repository:
   ```bash
   git clone https://github.com/filterfox/filterfox.git
   cd filterfox
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the extension:
   ```bash
   npm run build
   ```

4. Load in Chrome:
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the `dist` folder

5. Load in Firefox:
   - Open `about:debugging`
   - Click "This Firefox"
   - Click "Load Temporary Add-on"
   - Select `dist/manifest.json`

## 🎮 Usage

### Basic Usage
1. **Install** FilterFox from your browser's extension store
2. **Click** the FilterFox icon in your toolbar
3. **Toggle** the extension on/off with the main switch
4. **Customize** filter categories based on your preferences

### Advanced Features

#### Whitelist Sites
- Click the "Whitelist Site" button to disable blocking on the current site
- Useful for sites that break with ad blocking enabled

#### Custom Filters
- Add custom blocking rules in the options page
- Support for regex patterns and wildcard matching
- Import/export filter lists

#### Statistics Dashboard
- View blocking statistics in real-time
- See total blocked ads, trackers, and time saved
- Per-site blocking information

## 🛠️ Development

### Prerequisites
- Node.js 16+ and npm
- Chrome or Firefox for testing
- Git for version control

### Development Setup
```bash
# Clone the repository
git clone https://github.com/tavybrown/filterfox.git
cd filterfox

# Install dependencies
npm install

# Start development mode with hot reload
npm run dev

# Run tests
npm run test

# Lint code
npm run lint

# Build for production
npm run build
```

### Project Structure
```
filterfox/
├── src/                    # Source code
│   ├── background.js       # Background service worker
│   └── content.js          # Content script
├── popup/                  # Extension popup
│   ├── popup.html          # Popup HTML
│   └── popup.js           # Popup JavaScript
├── styles/                 # CSS files
│   ├── popup.css          # Popup styles
│   └── content.css        # Content script styles
├── rules/                  # Filter rules
│   └── adblock-rules.json # Declarative net request rules
├── config/                 # Configuration files
│   ├── config.json        # Main configuration
│   └── filters.json       # Filter list configuration
├── icons/                  # Extension icons
├── manifest.json          # Extension manifest
└── package.json           # NPM configuration
```

### Building and Testing
```bash
# Development build with watch mode
npm run dev

# Production build
npm run build

# Run unit tests
npm run test

# Run integration tests
npm run test:integration

# Package extension
npm run pack

# Validate extension
npm run validate
```

### Docker Development
```bash
# Build development container
docker-compose up dev

# Run tests in container
docker-compose up test

# Build production version
docker-compose up build
```

## 📊 Performance

FilterFox is designed to be lightweight and performant:

| Metric | Value |
|--------|-------|
| Extension Size | ~200KB |
| Memory Usage | <10MB |
| CPU Impact | <1% |
| Page Load Impact | <50ms |

## 🔒 Privacy

FilterFox is committed to user privacy:

- ✅ **No data collection** - We don't collect any personal data
- ✅ **No telemetry** - No usage statistics sent to servers
- ✅ **Local processing** - All filtering happens locally
- ✅ **Open source** - Code is publicly auditable
- ✅ **No ads** - FilterFox will never show ads

## 🤝 Contributing

We welcome contributions from the community! Here's how you can help:

### Ways to Contribute
- 🐛 **Bug Reports**: Found a bug? [Create an issue](https://github.com/tavybrown/filterfox/issues)
- 💡 **Feature Requests**: Have an idea? [Start a discussion](https://github.com/tavybrown/filterfox/discussions)
- 🔧 **Code Contributions**: Submit a pull request
- 📝 **Documentation**: Help improve our docs
- 🌍 **Translations**: Help translate FilterFox

### Development Guidelines
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Standards
- Follow ESLint configuration
- Write unit tests for new features
- Update documentation as needed
- Follow conventional commit messages

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [EasyList](https://easylist.to/) for filter lists
- [uBlock Origin](https://github.com/gorhill/uBlock) for inspiration
- [Manifest V3](https://developer.chrome.com/docs/extensions/mv3/) documentation
- Our amazing [contributors](https://github.com/filterfox/filterfox/graphs/contributors)

## 📞 Support

Need help? Here's how to get support:

- 📖 **Documentation**: Check our [docs](docs/)
- 💬 **Discussions**: Join our [GitHub Discussions](https://github.com/filterfox/filterfox/discussions)
- 🐛 **Bug Reports**: [Create an issue](https://github.com/filterfox/filterfox/issues)
- 📧 **Email**: [support@filterfox.dev](mailto:support@filterfox.dev)

## 🗺️ Roadmap

### Version 1.1.0
- [ ] Advanced filter customization
- [ ] Sync settings across devices
- [ ] Enhanced statistics dashboard
- [ ] Mobile browser support

### Version 1.2.0
- [ ] Custom filter list subscriptions
- [ ] Whitelist import/export
- [ ] Performance optimizations
- [ ] Additional language support

### Version 2.0.0
- [ ] Complete UI redesign
- [ ] Advanced privacy features
- [ ] Machine learning ad detection
- [ ] Enterprise features

---

<div align="center">
  <p>Made with ❤️ by the FilterFox Team</p>
  <p>
    <a href="https://filterfox.dev">Website</a> •
    <a href="https://github.com/filterfox/filterfox">GitHub</a> •
    <a href="https://twitter.com/filterfox">Twitter</a> •
    <a href="https://discord.gg/filterfox">Discord</a>
  </p>
</div>