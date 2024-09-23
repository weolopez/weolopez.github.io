const fs = require('fs-extra');
const path = require('path');
const webpack = require('webpack');
const config = require('../webpack.config.js');

const distDir = path.resolve(__dirname, '../dist');

async function build() {
  // Clean build directory
  await fs.emptyDir(distDir);

  // Run Webpack
  webpack(config, (err, stats) => {
    if (err || stats.hasErrors()) {
      console.error(err || stats.toJson().errors);
      return;
    }

    // Copy manifest files
    const browsers = ['chrome', 'firefox', 'edge', 'safari'];
    browsers.forEach(browser => {
      const manifestSrc = path.resolve(__dirname, `../src/manifest/${browser}/manifest.json`);
      const manifestDest = path.resolve(distDir, browser, 'manifest.json');
    });
    fs.copySync('src', 'dist');


    console.log('Build complete.');
  });
}

build();