#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Get bump type or specific version from command line
const arg = process.argv[2] || 'patch';

// Read app.json
const appJsonPath = path.join(__dirname, '../app.json');
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

// Read build.gradle
const buildGradlePath = path.join(__dirname, '../android/app/build.gradle');
const buildGradle = fs.readFileSync(buildGradlePath, 'utf8');

// Get current version
const currentVersion = appJson.expo.version;
let newVersion;

// Check if arg is a specific version (e.g., "1.4.2")
if (/^\d+\.\d+\.\d+$/.test(arg)) {
  // Set specific version
  newVersion = arg;
  console.log(`📌 Setting specific version: ${currentVersion} → ${newVersion}`);
} else {
  // Bump version based on type
  const versionParts = currentVersion.split('.').map(Number);
  
  switch (arg) {
    case 'major':
      versionParts[0]++;
      versionParts[1] = 0;
      versionParts[2] = 0;
      break;
    case 'minor':
      versionParts[1]++;
      versionParts[2] = 0;
      break;
    case 'patch':
    default:
      versionParts[2]++;
      break;
  }
  
  newVersion = versionParts.join('.');
  console.log(`✅ Version bumped (${arg}): ${currentVersion} → ${newVersion}`);
}

// Update app.json
appJson.expo.version = newVersion;
fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + '\n');

// Update build.gradle versionName
const updatedBuildGradle = buildGradle.replace(
  /versionName\s+"[^"]+"/,
  `versionName "${newVersion}"`
);
fs.writeFileSync(buildGradlePath, updatedBuildGradle);

console.log(`   - app.json updated`);
console.log(`   - android/app/build.gradle updated`);
