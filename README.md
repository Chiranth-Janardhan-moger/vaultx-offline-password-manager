# 🔐 VaultX — Secure Open Source Password Manager (Offline-first)

<div align="center">

**Military-grade encryption • Open Source Password Manager • Zero cloud dependency**

[![React Native](https://img.shields.io/badge/React%20Native-0.74-blue.svg)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-52-black.svg)](https://expo.dev/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

[Features](#-features) • [Screenshots](#-screenshots) • [Installation](#-installation) • [Security](#-security) • [Build](#-build)

</div>

---

## 📱 What is VaultX?

VaultX is a secure, **open source password manager** that is fully offline and privacy-first. Built with React Native and Expo, your passwords never leave your device, never touch the cloud, and are protected with military-grade AES-256 encryption.

### Why VaultX?

- ✅ **100% Offline** — No internet connection required or used
- ✅ **Zero Cloud Sync** — Your data stays on your device only
- ✅ **No Backend** — No servers, no APIs, no data collection
- ✅ **Open Source** — Fully transparent and auditable code
- ✅ **Military-grade Encryption** — AES-256 + PBKDF2 key derivation
- ✅ **Beautiful UI** — Modern, smooth animations, dark mode support
- ✅ **Smart Categories** — Auto-organize passwords by service type
- ✅ **Master Password System** — Generate consistent passwords deterministically

---

## ✨ Features

### 🔒 Security Features

- **AES-256 Encryption** — Military-grade encryption for all stored data
- **PBKDF2 Key Derivation** — Secure key generation with salt
- **6-Digit PIN Lock** — Visual PIN entry with single-box focus
- **Biometric Authentication** — Fingerprint/Face ID support
- **Password Fallback** — Unlock with master password if PIN forgotten
- **Security Question Recovery** — Single question for account recovery
- **Auto-lockout Protection** — Locks after failed attempts
- **Screenshot Protection** — Prevents screenshots in sensitive screens
- **No Plaintext Storage** — All passwords encrypted at rest
- **Secure Backup System** — Export with user-controlled encryption
- **Built-in 2FA/TOTP Authenticator** — Secure, local generation of 6-digit Time-based One-Time Passwords (TOTP) from base32 secrets
- **Clipboard Security & Monitor** — Clipboard is monitored and cleared to prevent other background apps from snooping copied passwords

### 🎨 User Experience

- **Beautiful Category System** — Passwords organized in gradient folders
- **Smart Auto-categorization** — Automatically sorts by service type (Google, Banking, Social Media, etc.)
- **Smooth Animations** — Staggered entrance, slide-in, fade effects
- **Dark Mode Support** — System, Light, Dark themes
- **Enhanced Contrast Mode** — Pure black AMOLED / Pure white themes
- **Optional Borders** — Toggle borders for better visibility
- **Service-specific Icons** — 50+ branded icons for popular services
- **Long-press Delete** — Smooth delete animation with confirmation
- **Copy to Clipboard** — One-tap copy for username/password
- **Password Visibility Toggle** — Show/hide passwords easily
- **Floating Action Button** — Quick access to add/generate passwords
- **Dashboard Folder & Category Tabs** — Fast, interactive dashboard filters to navigate and filter entries by categories instantly

### 🗂️ Password & Identity Management

- **Add Known Passwords** — Store existing credentials securely
- **Identity & Payment Cards** — Secure templates for storing Identity Cards (Passports, Driving Licenses, IDs) and Credit/Debit Cards with custom fields
- **Native Android Autofill Integration** — Autofill credentials seamlessly inside other apps and web browsers using Android's system Autofill service framework
- **Generate Master Passwords** — Deterministic password generation
- **View by Category** — Browse passwords in organized folders
- **Search & Filter** — Find passwords quickly
- **Copy Credentials** — One-tap copy with visual feedback
- **Password Strength Indicator** — Visual strength meter
- **Notes Support** — Add additional information to entries
- **Phone Number Masking** — Privacy protection (90XXXXX93)

### 🎯 Smart Categories

VaultX automatically categorizes your passwords into:

- 🔵 **Google Services** — Gmail, Drive, YouTube, etc.
- 💰 **Banking & Finance** — Banks, payment apps, crypto
- 📱 **Social Media** — Facebook, Instagram, Twitter, etc.
- 🛒 **Shopping** — Amazon, eBay, online stores
- 🎮 **Gaming** — Steam, Epic, PlayStation, Xbox
- 💼 **Work & Productivity** — Slack, Notion, Trello, etc.
- 📦 **Other** — Everything else

### 🔑 Master Password System

Generate strong, consistent passwords for any service:

1. Set up your master password once
2. Enter service name (e.g., "gmail")
3. Get a unique, deterministic password
4. Same input always generates same password
5. No storage needed — regenerate anytime

### 🚀 Performance Optimizations

- **Optimized APK Size** — 60-70% reduction (15-25 MB)
- **R8 Full Mode** — Aggressive code shrinking
- **ProGuard Enabled** — Code obfuscation and optimization
- **Resource Shrinking** — Removes unused resources
- **PNG Compression** — Optimized image assets
- **No Splash Screen** — Instant app launch
- **Minimal Permissions** — Only Biometric + Vibrate

---

## 📸 Screenshots
<img width="8000" height="3125" alt="VaultX Offline Password Manager - Secure Dashboard, Categories, and Card Wallet View" src="https://github.com/user-attachments/assets/edabb54a-0e75-4449-ad95-3d84bbca057f" />
<img width="8000" height="3125" alt="VaultX - Biometric Authentication and Master Password Generator UI Screens" src="https://github.com/user-attachments/assets/a8ab23da-3adf-43d3-9fbc-1d8101ab833a" />

---

## 🚀 Installation

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- Android Studio (for Android builds)
- Xcode (for iOS builds, macOS only)

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/Chiranth-Janardhan-moger/vaultx-offline-password-manager.git
   cd vaultx-offline-password-manager
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npx expo start
   ```

4. **Run on device**
   - Press `a` for Android
   - Press `i` for iOS
   - Scan QR code with Expo Go app

### Required Packages

```bash
npx expo install expo-file-system expo-secure-store expo-local-authentication expo-crypto expo-sharing expo-screen-capture expo-navigation-bar expo-clipboard expo-document-picker
npm install crypto-js react-native-get-random-values
```

---

## 🔨 Build APK

### Development Build

```bash
cd android
./gradlew clean
./gradlew assembleRelease
```

### Output Location

```
android/app/build/outputs/apk/release/app-release.apk
```

### Build Optimizations Applied

- ✅ R8 full mode enabled
- ✅ ProGuard with 5 optimization passes
- ✅ Resource shrinking enabled
- ✅ PNG crunching enabled
- ✅ Architecture filtering (ARM only)
- ✅ Logging removed in release
- ✅ Code obfuscation enabled

**Expected APK Size:** 15-25 MB (60-70% reduction)

See [BUILD_INSTRUCTIONS.md](BUILD_INSTRUCTIONS.md) for detailed build guide.

---

## 🔐 Security

### Encryption Details

- **Algorithm:** AES-256-CBC
- **Key Derivation:** PBKDF2 with 10,000 iterations
- **Salt:** Random 16-byte salt per vault
- **IV:** Random initialization vector per encryption
- **Key Storage:** Expo SecureStore (hardware-backed on supported devices)

### Security Architecture

```
User Credentials (PIN/Password/Question)
           ↓
    PBKDF2 (10,000 iterations)
           ↓
    Encryption Key (256-bit)
           ↓
    AES-256-CBC Encryption
           ↓
    Encrypted Vault Storage
```

### Privacy Features

- **No Network Access** — Internet permission removed
- **No Analytics** — Zero tracking or telemetry
- **No Cloud Sync** — Data never leaves device
- **No Backup to Cloud** — Backup disabled (allowBackup=false)
- **Screenshot Protection** — Sensitive screens protected
- **Phone Number Masking** — Only shows first 2 and last 2 digits

### Security Best Practices

1. Use a strong master password (12+ characters)
2. Enable biometric authentication
3. Choose a memorable security question answer
4. Export backups regularly to secure location
5. Use unique passwords for each service
6. Never share your master password

---

## 🎨 Themes

VaultX supports multiple theme modes:

- **System** — Follows device theme
- **Light** — Clean white interface
- **Dark** — Easy on the eyes
- **Enhanced Contrast** — Pure black AMOLED / Pure white
- **Show Borders** — Optional borders for better visibility

---

## 📦 Tech Stack

- **Framework:** React Native + Expo
- **Language:** TypeScript
- **Navigation:** Expo Router (file-based routing)
- **Storage:** Expo SecureStore + FileSystem
- **Encryption:** crypto-js (AES-256)
- **Authentication:** Expo Local Authentication (Biometric)
- **UI:** React Native core components
- **Icons:** Ionicons
- **Animations:** React Native Animated API

---

## 🗂️ Project Structure

```
vaultx/
├── app/                    # Expo Router pages
│   ├── index.tsx          # Welcome screen
│   ├── setup.tsx          # Initial setup
│   ├── login.tsx          # PIN/biometric login
│   ├── dashboard.tsx      # Main password list
│   ├── add.tsx            # Add password
│   ├── generate-password.tsx  # Master password generator
│   ├── settings.tsx       # App settings
│   ├── export.tsx         # Backup export
│   ├── import.tsx         # Backup restore
│   ├── recover.tsx        # Account recovery
│   └── category/[id].tsx  # Category detail pages
├── components/            # Reusable components
│   └── Screen.tsx         # Base screen wrapper
├── context/               # React Context providers
│   └── ThemeProvider.tsx  # Theme management
├── lib/                   # Core utilities
│   ├── vault.ts          # Vault data structure
│   ├── secure.ts         # Encryption functions
│   ├── crypto-shim.ts    # React Native crypto polyfills
│   ├── categories.ts     # Category system
│   ├── service-icons.ts  # Service icon mapping
│   └── password-generator.ts  # Master password logic
├── assets/                # Images and fonts
├── android/               # Native Android code
├── docs/                  # CI/CD and Release documentation
└── BUILD_INSTRUCTIONS.md  # Build guide
```

---

## 🚀 CI/CD & Releases Automation

VaultX features a fully automated CI/CD pipeline built with GitHub Actions:
*   **Continuous Integration**: Automated Gradle Wrapper validation, JS/TS linting, Android linting, unit tests, and debug compilation on every Push/PR targeting `main` ([CI Guide](docs/CI_CD_DOCUMENTATION.md)).
*   **Security & CodeQL Scanning**: Static analysis scanning for JS/TS and compiled Java/Kotlin sources alongside automated dependency review checks.
*   **Secure Release Delivery**: Version tag pushes automatically compile production-signed APK/AAB builds, generate SHA256 checksums, and publish releases to GitHub and GitLab REST API. See the [GitHub Secrets Guide](docs/GITHUB_SECRETS_GUIDE.md) and [Release Process Documentation](docs/RELEASE_PROCESS.md) for setup instructions.

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Maintain consistent code style
- Add comments for complex logic
- Test on both Android and iOS
- Ensure security features are not compromised

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- Built with [Expo](https://expo.dev/)
- Icons by [Ionicons](https://ionic.io/ionicons)
- Encryption by [crypto-js](https://github.com/brix/crypto-js)
- Inspired by 1Password, Bitwarden, and KeePass

---

## ⭐ Support

If you find VaultX useful, please consider:

- ⭐ **Starring this repository** on GitHub
- 🐛 **Reporting bugs** via Issues
- 💡 **Suggesting features** via Discussions
- 🔀 **Contributing code** via Pull Requests
- 📢 **Sharing with friends** who need a secure password manager

---

## 📞 Contact

- **GitHub:** [@Chiranth-Janardhan-moger](https://github.com/Chiranth-Janardhan-moger)
- **Issues:** [Report a bug](https://github.com/Chiranth-Janardhan-moger/vaultx-offline-password-manager/issues)
- **Discussions:** [Feature requests](https://github.com/Chiranth-Janardhan-moger/vaultx-offline-password-manager/discussions)

---

<div align="center">

**Made with ❤️ for privacy and security**

VaultX — Your passwords, your device, your control.

[⬆ Back to Top](#-vaultx--secure-offline-password-manager)

</div>
