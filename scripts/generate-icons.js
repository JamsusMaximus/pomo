#!/usr/bin/env node

/**
 * Simple PWA Icon Generator
 * Creates placeholder icons for testing PWA installation
 */

const fs = require("fs");
const path = require("path");

// Create simple SVG icons
const createSvgIcon = (size) =>
  `
<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <!-- Orange background -->
  <rect width="${size}" height="${size}" fill="#f97316"/>

  <!-- White circle background for icon -->
  <circle cx="${size / 2}" cy="${size / 2}" r="${size * 0.35}" fill="#ffffff"/>

  <!-- Lock icon -->
  <g transform="translate(${size / 2}, ${size / 2})">
    <!-- Lock body -->
    <rect x="${-size * 0.12}" y="${-size * 0.05}" width="${size * 0.24}" height="${size * 0.18}" rx="${size * 0.02}" fill="#f97316"/>

    <!-- Lock shackle -->
    <path d="M ${-size * 0.1} ${-size * 0.05}
             L ${-size * 0.1} ${-size * 0.12}
             A ${size * 0.1} ${size * 0.1} 0 0 1 ${size * 0.1} ${-size * 0.12}
             L ${size * 0.1} ${-size * 0.05}"
          fill="none" stroke="#f97316" stroke-width="${size * 0.025}"/>
  </g>

  <!-- Text "Lock.in" -->
  <text x="${size / 2}" y="${size * 0.85}"
        font-family="Arial, sans-serif"
        font-size="${size * 0.08}"
        font-weight="bold"
        fill="#ffffff"
        text-anchor="middle">Lock.in</text>
</svg>
`.trim();

// Output directory
const publicDir = path.join(__dirname, "..", "public");

// Generate icons
const sizes = [192, 512];

sizes.forEach((size) => {
  const svg = createSvgIcon(size);
  const filename = `icon-${size}.svg`;
  const filepath = path.join(publicDir, filename);

  fs.writeFileSync(filepath, svg);
  console.log(`✓ Created ${filename}`);
});

console.log("\n📝 Note: SVG icons created. For production, convert to PNG using:");
console.log("   - Online tool: https://cloudconvert.com/svg-to-png");
console.log("   - Or install ImageMagick and run:");
console.log("     convert icon-192.svg icon-192.png");
console.log("     convert icon-512.svg icon-512.png\n");
console.log("For now, update manifest.json to use .svg files instead of .png");
