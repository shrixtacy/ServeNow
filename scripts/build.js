#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Generate version based on timestamp
const version = `1.0.${Date.now()}`;
const buildTime = new Date().toISOString();

console.log(`Building version: ${version}`);

// Set environment variable
process.env.VITE_APP_VERSION = version;

// Update version.json
const versionJson = {
  version: version,
  buildTime: buildTime,
  environment: process.env.NODE_ENV || 'production'
};

fs.writeFileSync(
  path.join(__dirname, '../public/version.json'),
  JSON.stringify(versionJson, null, 2)
);

console.log('Updated version.json');

// Run the build
try {
  execSync('vite build', { stdio: 'inherit' });
  console.log('Build completed successfully');
} catch (error) {
  console.error('Build failed:', error);
  process.exit(1);
} 