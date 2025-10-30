#!/usr/bin/env node

// Simple SVG icon generator for PWA
const fs = require('fs');
const path = require('path');

const iconSizes = [
    { size: 192, name: 'icon-192.png' },
    { size: 512, name: 'icon-512.png' },
    { size: 180, name: 'icon-180.png' },
    { size: 150, name: 'icon-150.png' },
    { size: 310, name: 'icon-310.png' },
    { size: 32, name: 'icon-32.png' },
    { size: 16, name: 'icon-16.png' }
];

// Create SVG icons
function createSVGIcon(size, text = 'WE', bgColor = '#000000', textColor = '#ffffff') {
    const fontSize = Math.floor(size * 0.4);
    const borderWidth = Math.max(1, size * 0.02);
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${size}" height="${size}" fill="${bgColor}"/>
    <rect x="${size * 0.05}" y="${size * 0.05}" width="${size * 0.9}" height="${size * 0.9}" 
          fill="none" stroke="${textColor}" stroke-width="${borderWidth}"/>
    <text x="${size / 2}" y="${size / 2}" font-family="Arial, sans-serif" 
          font-size="${fontSize}" font-weight="bold" text-anchor="middle" 
          dominant-baseline="middle" fill="${textColor}">${text}</text>
</svg>`;
}

// Create safari pinned tab icon
function createSafariIcon() {
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
    <rect width="16" height="16" fill="#000000"/>
    <text x="8" y="8" font-family="Arial, sans-serif" font-size="6" 
          font-weight="bold" text-anchor="middle" dominant-baseline="middle" 
          fill="#ffffff">WE</text>
</svg>`;
}

// Generate all icons
console.log('Generating PWA icons...');

iconSizes.forEach(({ size, name }) => {
    const svgContent = createSVGIcon(size);
    const svgPath = path.join(__dirname, name.replace('.png', '.svg'));
    fs.writeFileSync(svgPath, svgContent);
    console.log(`Generated ${svgPath}`);
});

// Generate safari pinned tab
const safariSvg = createSafariIcon();
const safariPath = path.join(__dirname, 'safari-pinned-tab.svg');
fs.writeFileSync(safariPath, safariSvg);
console.log(`Generated ${safariPath}`);

console.log('Icon generation complete!');
console.log('Note: SVG icons are generated. For production, convert to PNG using a tool like inkscape or online converters.');
