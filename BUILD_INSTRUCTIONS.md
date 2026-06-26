# VaultX - Build Instructions

## 🚀 Build Optimized APK

### Prerequisites
- Node.js installed
- Android SDK configured
- Java JDK 17+ installed

### Build Commands

#### 1. Clean Build (Recommended)
```bash
cd android
./gradlew clean
./gradlew assembleRelease
```

#### 2. Quick Build
```bash
cd android
./gradlew assembleRelease
```

#### 3. Build with Logs
```bash
cd android
./gradlew assembleRelease --info
```

### Output Location
The optimized APKs will be generated at:
```
android/app/build/outputs/apk/release/app-armeabi-v7a-release.apk  (32-bit ARM)
android/app/build/outputs/apk/release/app-arm64-v8a-release.apk   (64-bit ARM)
```

**Note:** Two separate APKs are generated for better optimization:
- **armeabi-v7a** — For older 32-bit ARM devices
- **arm64-v8a** — For modern 64-bit ARM devices (recommended)

## 📦 Optimizations Applied

### ✅ APK Size Reduction
- **R8 Full Mode**: Aggressive code shrinking and obfuscation
- **ProGuard**: Optimized with 5 optimization passes
- **Resource Shrinking**: Removes unused resources automatically
- **PNG Crunching**: Compresses all PNG images
- **Architecture Splitting**: Separate APKs for v7a (32-bit) and v8a (64-bit)
- **Disabled Features**: GIF, WebP, animated images support

### 🔒 Security Features
- **Screenshot Protection**: Configurable in Settings → General → Block Screenshots
  - **Default (Enabled)**: Blocks screenshots, screen recording, and screen sharing
  - **Disabled**: Allows screenshots only, screen recording and sharing remain blocked
  - **Note**: Requires app restart to take effect
- **Autofill Service**: System-wide password autofill (Android 8.0+)
  - Works in all apps and browsers
  - Requires biometric authentication
  - Smart password matching
  - See AUTOFILL_GUIDE.md for setup
- **FLAG_SECURE**: Native Android security flag prevents screen capture
- **Encrypted Storage**: All passwords encrypted with AES-256
- **Biometric Authentication**: Fingerprint/Face unlock support
- **Auto-lock Timer**: Configurable 1/5/10/30 minute inactivity lock
- **Double-tap Lock**: Quick lock feature
- **Removed Logging**: All Log statements stripped in release
- **Meta-data Cleanup**: Removed unused Expo update configs

### ✅ Splash Screen Removed
- No splash screen delay
- Direct app launch
- Faster startup time

### ✅ Permissions Minimized
- Only 2 permissions: Biometric + Vibrate
- Removed: Internet, Storage, System Alert Window
- No network access required
- Maximum privacy and security

### ✅ Manifest Cleanup
- Removed roundIcon reference
- Removed deep link intent filters
- Removed backup rules (allowBackup=false)
- Removed queries section
- Simplified to essentials only

### ✅ Theme Optimization
- Removed splash screen styles
- Removed drawable references
- Transparent status/navigation bars
- Minimal color resources

## 📊 Expected Results

### APK Size Reduction
- **arm64-v8a (64-bit)**: ~12-18 MB
- **armeabi-v7a (32-bit)**: ~10-15 MB
- **Total reduction**: 60-70% from universal APK

### Startup Performance
- No splash screen delay
- Instant app launch
- Optimized native code with R8

### Security
- Code obfuscation enabled
- No backup allowed
- Minimal permissions
- Offline-first architecture

## 🔧 Troubleshooting

### Biometric Authentication Not Working

If fingerprint/biometric authentication doesn't work in the APK:

1. **Ensure plugin is configured in app.json:**
   ```json
   "plugins": [
     "expo-router",
     "expo-secure-store",
     ["expo-local-authentication", {
       "faceIDPermission": "Allow VaultX to use Face ID"
     }]
   ]
   ```

2. **Rebuild after prebuild:**
   ```bash
   npx expo prebuild --clean
   cd android
   ./gradlew clean
   ./gradlew assembleRelease
   ```

3. **Check device has biometric enrolled:**
   - Go to Settings → Security → Fingerprint
   - Ensure at least one fingerprint is registered

4. **Check app permissions:**
   ```bash
   adb shell dumpsys package com.chiranth7.vaultx | grep permission
   ```

5. **Common issues:**
   - Biometric works in Expo Go but not in APK → **Need to add plugin to app.json and rebuild**
   - "Biometric unlock not available" → SecureStore item not saved with `requireAuthentication: true`
   - Device doesn't support biometric → App will hide the fingerprint button

### Build Fails
```bash
cd android
./gradlew clean
rm -rf .gradle build
./gradlew assembleRelease
```

### Check Build Size
```bash
cd android/app/build/outputs/apk/release
ls -lh *.apk
```

You should see:
- `app-armeabi-v7a-release.apk` (32-bit ARM)
- `app-arm64-v8a-release.apk` (64-bit ARM)

### Analyze APK
```bash
# Install APK Analyzer
npm install -g apk-analyzer

# Analyze
apk-analyzer android/app/build/outputs/apk/release/app-release.apk
```

## 📱 Installation

### Install on Device

**For 64-bit devices (recommended):**
```bash
adb install android/app/build/outputs/apk/release/app-arm64-v8a-release.apk
```

**For 32-bit devices:**
```bash
adb install android/app/build/outputs/apk/release/app-armeabi-v7a-release.apk
```

### Install with Overwrite

**64-bit:**
```bash
adb install -r android/app/build/outputs/apk/release/app-arm64-v8a-release.apk
```

**32-bit:**
```bash
adb install -r android/app/build/outputs/apk/release/app-armeabi-v7a-release.apk
```

### Check Device Architecture
```bash
adb shell getprop ro.product.cpu.abi
```
- If output is `arm64-v8a` → Use 64-bit APK
- If output is `armeabi-v7a` → Use 32-bit APK

## 🎯 Production Release

For production release with proper signing:

1. Generate keystore:
```bash
keytool -genkeypair -v -storetype PKCS12 -keystore vaultx-release.keystore -alias vaultx -keyalg RSA -keysize 2048 -validity 10000
```

2. Update `android/app/build.gradle`:
```gradle
signingConfigs {
    release {
        storeFile file('vaultx-release.keystore')
        storePassword 'YOUR_PASSWORD'
        keyAlias 'vaultx'
        keyPassword 'YOUR_PASSWORD'
    }
}
```

3. Build signed APK:
```bash
cd android
./gradlew assembleRelease
```

---

**VaultX** - Secure, Fast, Minimal 🔐
