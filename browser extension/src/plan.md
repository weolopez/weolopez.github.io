Project Organization

Modular Folder Structure
The template follows a modular structure that separates shared code from browser-specific implementations.

css
Copy code
project-root/
├── src/
│   ├── background/
│   ├── content/
│   ├── popup/
│   ├── options/
│   ├── common/
│   └── manifest/
│       ├── chrome/
│       ├── firefox/
│       ├── edge/
│       └── safari/
├── build/
├── dist/
├── scripts/
├── tests/
├── locales/
├── webpack.config.js
├── package.json
└── README.md
src/: Contains all source code.
background/: Background scripts.
content/: Content scripts.
popup/: Popup UI and scripts.
options/: Options page UI and scripts.
common/: Shared utilities and modules.
manifest/: Browser-specific manifest files.
build/: Temporary files during the build process.
dist/: Final packaged extensions for distribution.
scripts/: Build and utility scripts.
tests/: Unit and integration tests.
locales/: Localization files.
webpack.config.js: Webpack configuration.
package.json: NPM package configuration.
README.md: Documentation.
Separate Manifest Files
Each browser has its own manifest file to handle specific configurations.

manifest/chrome/manifest.json
manifest/firefox/manifest.json
manifest/edge/manifest.json
manifest/safari/manifest.json
Core Functionality

Background Scripts
Handles extension events and background tasks.

javascript
Copy code
// src/background/index.js
import browser from 'webextension-polyfill';

browser.runtime.onInstalled.addListener(() => {
  console.log('Extension installed');
});

browser.alarms.create('periodicTask', { periodInMinutes: 5 });

browser.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'periodicTask') {
    // Perform periodic task
  }
});
Content Scripts
Interacts with web pages.

javascript
Copy code
// src/content/index.js
import browser from 'webextension-polyfill';

browser.runtime.onMessage.addListener((message) => {
  if (message.action === 'highlight') {
    document.body.style.backgroundColor = 'yellow';
  }
});
Popup Interfaces
Provides a user interface when the extension icon is clicked.

html
Copy code
<!-- src/popup/index.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Extension Popup</title>
</head>
<body>
  <button id="actionButton">Do Something</button>
  <script src="popup.js"></script>
</body>
</html>
javascript
Copy code
// src/popup/popup.js
import browser from 'webextension-polyfill';

document.getElementById('actionButton').addEventListener('click', () => {
  browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
    browser.tabs.sendMessage(tabs[0].id, { action: 'highlight' });
  });
});
Options Pages
Allows users to configure extension settings.

html
Copy code
<!-- src/options/index.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Extension Options</title>
</head>
<body>
  <input type="checkbox" id="enableFeature" />
  <label for="enableFeature">Enable Feature</label>
  <script src="options.js"></script>
</body>
</html>
javascript
Copy code
// src/options/options.js
import browser from 'webextension-polyfill';

const checkbox = document.getElementById('enableFeature');

browser.storage.sync.get('enableFeature').then((data) => {
  checkbox.checked = data.enableFeature || false;
});

checkbox.addEventListener('change', () => {
  browser.storage.sync.set({ enableFeature: checkbox.checked });
});
API Interactions
Uses WebExtensions APIs like storage, messaging, and tabs.

Storage: Stores user preferences and data.
Messaging: Communicates between different parts of the extension.
Tabs: Interacts with browser tabs.
Browser-Specific Adaptations

Handling Browser Differences
Use conditional code to handle browser-specific features.

javascript
Copy code
// src/common/utils.js
export function getBrowserInfo() {
  const userAgent = navigator.userAgent;
  if (userAgent.includes('Chrome')) return 'chrome';
  if (userAgent.includes('Firefox')) return 'firefox';
  if (userAgent.includes('Edg')) return 'edge';
  if (userAgent.includes('Safari')) return 'safari';
  return 'unknown';
}
javascript
Copy code
// Example usage
import { getBrowserInfo } from '../common/utils';

const browserName = getBrowserInfo();

if (browserName === 'firefox') {
  // Firefox-specific code
} else if (browserName === 'safari') {
  // Safari-specific code
}
Feature Availability
Use feature detection to ensure compatibility.

javascript
Copy code
if (typeof browser.notifications !== 'undefined') {
  // Notifications API is available
  browser.notifications.create({ /* ... */ });
} else {
  // Fallback or alternative implementation
}
Build System

Using Webpack
Configure Webpack to build and bundle the extension.

javascript
Copy code
// webpack.config.js
const path = require('path');

module.exports = {
  entry: {
    background: './src/background/index.js',
    content: './src/content/index.js',
    popup: './src/popup/popup.js',
    options: './src/options/options.js',
  },
  output: {
    path: path.resolve(__dirname, 'build'),
    filename: '[name].bundle.js',
  },
  // Additional configurations...
};
Generating Browser-Specific Packages
Use scripts to generate builds for each browser.

json
Copy code
// package.json scripts section
"scripts": {
  "build:chrome": "webpack --config webpack.chrome.config.js",
  "build:firefox": "webpack --config webpack.firefox.config.js",
  "build:edge": "webpack --config webpack.edge.config.js",
  "build:safari": "webpack --config webpack.safari.config.js",
  "build": "npm run build:chrome && npm run build:firefox && npm run build:edge && npm run build:safari"
}
Polyfills and Compatibility

WebExtension Polyfill
Integrate the WebExtension Polyfill to normalize API differences.

javascript
Copy code
// Install via npm
npm install webextension-polyfill
javascript
Copy code
// Import in your scripts
import browser from 'webextension-polyfill';
Fallbacks for Unsupported Features
Provide alternative implementations when features are not available.

javascript
Copy code
if (browser.storage.sync) {
  // Use sync storage
} else {
  // Fallback to local storage
}
Features Demonstrated

1. Cross-Origin XMLHttpRequests
javascript
Copy code
// src/background/xhr.js
import browser from 'webextension-polyfill';

function fetchData() {
  fetch('https://api.example.com/data')
    .then(response => response.json())
    .then(data => {
      // Process data
    })
    .catch(error => {
      console.error('Error fetching data:', error);
    });
}

browser.runtime.onMessage.addListener((message) => {
  if (message.action === 'fetchData') {
    fetchData();
  }
});
2. Storage (Local and Sync)
See Options Pages example.

3. Context Menus
javascript
Copy code
// src/background/contextMenus.js
import browser from 'webextension-polyfill';

browser.contextMenus.create({
  id: 'sampleContextMenu',
  title: 'Sample Context Menu',
  contexts: ['all'],
});

browser.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'sampleContextMenu') {
    // Handle context menu click
  }
});
4. Notifications
javascript
Copy code
// src/background/notifications.js
import browser from 'webextension-polyfill';

function showNotification() {
  browser.notifications.create({
    type: 'basic',
    iconUrl: browser.extension.getURL('icons/icon-48.png'),
    title: 'Notification Title',
    message: 'This is a sample notification.',
  });
}
5. Alarms and Background Tasks
See Background Scripts example.

6. Content Script Injection and Communication
See Content Scripts example.

7. Browser Action with Badge and Popup
javascript
Copy code
// src/background/browserAction.js
import browser from 'webextension-polyfill';

browser.browserAction.setBadgeText({ text: 'NEW' });
browser.browserAction.setBadgeBackgroundColor({ color: '#FF0000' });
8. Options Page with Settings Sync
See Options Pages example.

9. Internationalization (i18n)
json
Copy code
// locales/en/messages.json
{
  "extensionName": {
    "message": "My Extension",
    "description": "Name of the extension"
  }
}
html
Copy code
<!-- src/popup/index.html -->
<h1 data-i18n="extensionName"></h1>
javascript
Copy code
// src/popup/popup.js
document.querySelectorAll('[data-i18n]').forEach((element) => {
  const message = browser.i18n.getMessage(element.getAttribute('data-i18n'));
  element.textContent = message;
});
10. Message Passing
javascript
Copy code
// Background script
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getData') {
    sendResponse({ data: 'Sample Data' });
  }
});

// Content script
browser.runtime.sendMessage({ action: 'getData' }).then((response) => {
  console.log(response.data);
});
Documentation

Getting Started Guide
Setup Instructions

Clone the Repository
bash
Copy code
git clone https://github.com/yourusername/extension-template.git
Install Dependencies
bash
Copy code
cd extension-template
npm install
Development Environment Recommendations

Node.js v14 or higher
NPM v6 or higher
Visual Studio Code with relevant extensions (ESLint, Prettier)
Browsers: Latest versions of Chrome, Firefox, Edge, and Safari Technology Preview
Building and Testing Procedures

Build for All Browsers
bash
Copy code
npm run build
Build for Specific Browser
bash
Copy code
npm run build:chrome
npm run build:firefox
npm run build:edge
npm run build:safari
Run Unit Tests
bash
Copy code
npm test
Architecture Overview
Flow Diagrams
Explanation
The extension consists of background scripts that handle events and background tasks, content scripts that interact with web pages, a popup interface for user interactions, and an options page for configuration.
API Reference
Custom Functions
fetchData(): Fetches data from a remote API.
showNotification(): Displays a browser notification.
getBrowserInfo(): Returns the name of the current browser.
Usage Examples
See the code snippets provided in the Core Functionality section.
Browser Compatibility Guide
Feature	Chrome	Firefox	Edge	Safari
Storage Sync	✔️	✔️	✔️	❌
Context Menus	✔️	✔️	✔️	✔️
Notifications	✔️	✔️	✔️	✔️
Alarms	✔️	✔️	✔️	❌
Cross-Origin Requests	✔️	✔️	✔️	Limited
Known Limitations
Safari: Does not support storage sync; use local storage instead.
Cross-Origin Requests: Safari has stricter CORS policies.
Best Practices
Code Style
Use ESLint and Prettier for consistent code formatting.
Follow the Airbnb JavaScript style guide.
Performance Optimization
Minimize the use of background scripts.
Use event pages instead of persistent background pages when possible.
Security Considerations
Use Content Security Policies (CSP).
Avoid using eval() and dynamic code execution.
Troubleshooting
Common Issues
Extension Not Loading: Check for errors in the manifest file.
APIs Not Working: Verify permissions in the manifest.
Debugging Techniques
Chrome: Use the Extensions page (chrome://extensions) to inspect background scripts.
Firefox: Use the Debug Add-ons page (about:debugging).
Contribution Guidelines
Reporting Issues
Open an issue on the GitHub repository with detailed information.
Submitting Improvements
Fork the repository.
Create a feature branch.
Submit a pull request.
Testing

Unit Tests
Framework: Jest
javascript
Copy code
// tests/utils.test.js
import { getBrowserInfo } from '../src/common/utils';

test('should return a valid browser name', () => {
  expect(['chrome', 'firefox', 'edge', 'safari', 'unknown']).toContain(getBrowserInfo());
});
Integration Tests
Use Selenium WebDriver or Puppeteer for browser automation.
Example: Test the popup interface functionality.
Cross-Browser Testing Guide
Instructions
Build the extension for the target browser.
Load the unpacked extension in the browser.
Use developer tools to inspect and debug.
Recommended Tools
BrowserStack: For cross-browser testing.
WebDriverIO: For automated testing.
Additional Considerations

Performance
Best Practices
Lazy-load scripts when possible.
Optimize images and assets.
Efficient Resource Usage
Use debouncing and throttling for event handlers.
Clean up listeners when not needed.
Accessibility
Accessible UI Design
Use semantic HTML elements.
Provide ARIA labels where necessary.
Guidelines
Follow WCAG 2.1 standards.
Test with screen readers.
Security
Content Security Policies
Define CSP in the manifest to restrict resources.
json
Copy code
// manifest.json
"content_security_policy": "script-src 'self'; object-src 'self'"
Secure Data Handling
Avoid storing sensitive data unencrypted.
Use HTTPS for all network requests.
Localization
Setup
Use the __MSG_ notation in HTML files.
Store messages in locales/[lang]/messages.json.
Example Translations
json
Copy code
// locales/es/messages.json
{
  "extensionName": {
    "message": "Mi Extensión",
    "description": "Nombre de la extensión"
  }
}
Update Mechanism
Automatic Updates
Configure update URLs if hosting updates yourself.
Documentation
Explain how updates are handled in each browser.
Safari Adaptation
Guidance
Use Safari's Web Extension Converter tool.
bash
Copy code
xcrun safari-web-extension-converter project-root
Include Basic Safari Project
Wrap the extension in a native macOS app for Safari.
By following this template, developers can create cross-platform browser extensions with maximum portability and feature richness across different browsers.
