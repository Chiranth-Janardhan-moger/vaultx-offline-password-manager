# F-Droid Compliance Report for VaultX

## Overview
VaultX has been designed and configured to be fully compliant with F-Droid's strict requirements for privacy, security, and open-source standards.

## ✅ Compliance Status

### 1. **No Network Permissions**
- ✅ Zero network permissions in AndroidManifest.xml
- ✅ No INTERNET, ACCESS_NETWORK_STATE, or ACCESS_WIFI_STATE permissions
- ✅ Completely offline functionality

### 2. **No Proprietary Dependencies**
- ✅ No Google Play Services
- ✅ No Firebase or Google Analytics
- ✅ No proprietary SDKs or closed-source libraries
- ✅ All dependencies are open-source

### 3. **No Tracking or Analytics**
- ✅ No telemetry or usage tracking
- ✅ No crash reporting services
- ✅ No user behavior analytics
- ✅ No data collection of any kind

### 4. **No Auto-Update Mechanisms**
- ✅ Expo Updates disabled (`expo.modules.updates.ENABLED = false`)
- ✅ No over-the-air updates
- ✅ Updates only through F-Droid

### 5. **Open Source Requirements**
- ✅ MIT License (F-Droid compatible)
- ✅ Complete source code available on GitHub
- ✅ No obfuscated or proprietary code
- ✅ Reproducible builds

### 6. **Privacy-First Design**
- ✅ All data stored locally with AES-256 encryption
- ✅ No cloud storage or syncing
- ✅ No external API calls
- ✅ Screenshot protection enabled

## 📋 F-Droid Metadata Configuration

### Package Information
- **Package ID**: `com.chiranth7.vaultx` (lowercase for F-Droid compliance)
- **Category**: Security (single category as recommended)
- **License**: MIT
- **Version**: 1.2.48 (248)

### Build Configuration
```yaml
Builds:
  - versionName: 1.2.48
    versionCode: 248
    commit: v1.2.48
    subdir: android
    gradle:
      - yes
    prebuild: 
      - cd ../..
      - npm ci
      - npx expo prebuild --platform android --clean
    scanignore:
      - android/app/debug.keystore
    scandelete:
      - node_modules
      - .expo
```

### Key F-Droid Optimizations
1. **Commit Tags**: Uses specific version tags instead of `HEAD`
2. **npm ci**: Uses `npm ci` for reproducible builds
3. **Scan Configuration**: Properly ignores debug keystore and deletes build artifacts
4. **Subdir**: Correctly specifies Android subdirectory

## 🔒 Security Features

### Encryption
- AES-256 encryption for all stored data
- Android Keystore integration for biometric authentication
- Secure key derivation using PBKDF2

### Privacy Protection
- Screenshot prevention in sensitive screens
- Secure clipboard handling with auto-clear
- Screen recording protection
- No data leakage to external services

### Permissions (Minimal Set)
```xml
<uses-permission android:name="android.permission.USE_BIOMETRIC"/>
<uses-permission android:name="android.permission.USE_FINGERPRINT"/>
<uses-permission android:name="android.permission.VIBRATE"/>
<uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>
<uses-permission android:name="android.permission.BIND_AUTOFILL_SERVICE"/>
```

## 🏗️ Build Requirements

### Prerequisites
- Node.js 18+
- npm or yarn
- Android SDK 34
- Java 17

### Build Process
1. Clone repository
2. Install dependencies: `npm ci`
3. Generate Android project: `npx expo prebuild --platform android --clean`
4. Build APK: `cd android && ./gradlew assembleRelease`

### Reproducible Builds
- Locked dependency versions in package-lock.json
- Deterministic build configuration
- No build-time network requests
- Consistent build environment

## 📱 App Features Compliant with F-Droid

### Core Functionality
- **Password Management**: Store, organize, and retrieve passwords securely
- **Autofill Service**: Native Android autofill integration
- **Biometric Authentication**: Fingerprint and face unlock
- **Categories**: Smart organization of password entries
- **Search**: Fast local search functionality
- **Export/Import**: Encrypted backup and restore

### UI/UX Features
- **Material Design 3**: Modern, accessible interface
- **Dark/Light Themes**: System-aware theming
- **Accessibility**: Full screen reader and keyboard navigation support
- **Responsive Design**: Optimized for various screen sizes

## 🚫 Anti-Features (None)

VaultX has **zero anti-features** as defined by F-Droid:
- ❌ No ads
- ❌ No tracking
- ❌ No non-free network services
- ❌ No non-free dependencies
- ❌ No known security vulnerabilities
- ❌ No upstream non-free components

## 📊 Technical Specifications

### App Size
- APK Size: ~15MB
- Minimal resource usage
- Efficient native modules

### Performance
- Fast startup time
- Smooth animations with React Native Reanimated
- Optimized database queries
- Memory-efficient encryption

### Compatibility
- Minimum Android 7.0 (API 24)
- Target Android 14 (API 34)
- Supports ARM64, ARMv7, x86, x86_64 architectures

## 🔍 Code Quality

### Static Analysis
- ESLint configuration for code quality
- TypeScript for type safety
- Proper error handling
- Security best practices

### Testing
- Manual testing on multiple devices
- Security audit of encryption implementation
- Privacy review of data handling

## 📝 Documentation

### User Documentation
- Comprehensive README.md
- Feature documentation in FEATURES_IMPLEMENTED.md
- Build instructions in BUILD_INSTRUCTIONS.md
- Autofill guide in AUTOFILL_GUIDE.md

### Developer Documentation
- Code comments and documentation
- Architecture decisions documented
- API documentation for native modules

## 🎯 F-Droid Submission Checklist

- ✅ Package name in lowercase
- ✅ No network permissions
- ✅ No proprietary dependencies
- ✅ No tracking or analytics
- ✅ Open source license (MIT)
- ✅ Complete source code available
- ✅ Reproducible builds
- ✅ Proper F-Droid metadata
- ✅ Version tags in git repository
- ✅ No anti-features
- ✅ Privacy-focused design
- ✅ Security best practices
- ✅ Accessibility compliance

## 📞 Contact Information

- **Developer**: Chiranth Moger
- **Email**: chiranthmoger000@gmail.com
- **GitHub**: https://github.com/Chiranth-Janardhan-moger/vaultx-offline-password-manager
- **Issues**: https://github.com/Chiranth-Janardhan-moger/vaultx-offline-password-manager/issues

## 📄 License

VaultX is licensed under the MIT License, which is fully compatible with F-Droid's requirements for free and open-source software.

---

**Last Updated**: January 2026
**F-Droid Compliance Version**: 1.2.48