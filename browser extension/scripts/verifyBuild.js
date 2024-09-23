const fs = require('fs');
const path = require('path');

const distDir = path.resolve(__dirname, '../dist');
const expectedFiles = [
  'background.js',
  'content.js',
  'popup.js',
  'options.js',
  'popup.html',
  'options.html',
  'background.html',
  'content.html'
];

function verifyFiles() {
  let allFilesPresent = true;

  expectedFiles.forEach(file => {
    const filePath = path.join(distDir, file);
    if (!fs.existsSync(filePath)) {
      console.error(`Missing file: ${file}`);
      allFilesPresent = false;
    }
  });

  if (allFilesPresent) {
    console.log('All necessary files are included in the build output.');
  } else {
    console.error('Some files are missing in the build output.');
  }
}

verifyFiles();