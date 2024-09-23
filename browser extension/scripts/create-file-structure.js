const fs = require('fs');
const path = require('path');

// Helper function to create directories
const createDirectory = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`Directory created: ${dirPath}`);
  }
};

// Helper function to create files with optional content
const createFile = (filePath, content = '') => {
  fs.writeFileSync(filePath, content);
  console.log(`File created: ${filePath}`);
};

// Define folder structure
const folders = [
  'src/background',
  'src/content',
  'src/popup',
  'src/options',
  'src/common',
  'src/manifest/chrome',
  'src/manifest/firefox',
  'src/manifest/edge',
  'src/manifest/safari',
  'build',
  'dist',
  'scripts',
  'tests',
  'locales'
];

// Define files to be created with optional content
const files = [
  { path: 'webpack.config.js', content: '// Webpack configuration' },
  { path: 'package.json', content: '{"name": "extension-template", "version": "1.0.0"}' },
  { path: 'README.md', content: '# Cross-Platform Browser Extension Template' },
  { path: 'src/popup/index.html', content: '<!-- Popup HTML -->' },
  { path: 'src/popup/popup.js', content: '// Popup JS' },
  { path: 'src/background/index.js', content: '// Background script' },
  { path: 'src/content/index.js', content: '// Content script' },
  { path: 'src/options/index.html', content: '<!-- Options HTML -->' },
  { path: 'src/options/options.js', content: '// Options JS' },
  { path: 'src/manifest/chrome/manifest.json', content: '{ "name": "Chrome Extension" }' },
  { path: 'src/manifest/firefox/manifest.json', content: '{ "name": "Firefox Extension" }' },
  { path: 'src/manifest/edge/manifest.json', content: '{ "name": "Edge Extension" }' },
  { path: 'src/manifest/safari/manifest.json', content: '{ "name": "Safari Extension" }' }
];

// Create folders
folders.forEach((folder) => createDirectory(path.join(__dirname, folder)));

// Create files
files.forEach((file) => createFile(path.join(__dirname, file.path), file.content));

console.log('Folder structure created successfully.');

