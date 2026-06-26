# F-Droid Submission Instructions

## 📝 What the F-Droid Bot Means

The F-Droid bot comment "Add fastlane. Remove metadata/com.chiranth7.vaultx. Enable auto update" means:

1. **Use Fastlane format** ✅ (You already have this in `fastlane/metadata/`)
2. **Remove old metadata YAML** ✅ (Done - deleted `metadata/com.chiranth7.vaultx.yml`)
3. **Enable auto update** ✅ (F-Droid will auto-detect new versions from git tags)

## 🎯 How F-Droid Submission Works

F-Droid doesn't use metadata files from your repository. Instead, you submit metadata to their **fdroiddata** repository.

### Your Repository Structure (VaultX)
```
VaultX/
├── fastlane/metadata/android/en-US/  ← Keep this for Google Play/other stores
│   ├── title.txt
│   ├── short_description.txt
│   ├── full_description.txt
│   ├── changelogs/248.txt
│   └── images/phoneScreenshots/
├── android/                           ← F-Droid builds from here
└── (no metadata/ folder needed)       ← Removed as requested
```

### F-Droid's Repository (fdroiddata)
```
fdroiddata/
└── metadata/
    └── com.chiranth7.vaultx.yml      ← You submit this to F-Droid's repo
```

## 📤 Submission Process

### Step 1: Fork F-Droid Data Repository
```bash
# Go to https://gitlab.com/fdroid/fdroiddata
# Click "Fork" button
```

### Step 2: Clone Your Fork
```bash
git clone https://gitlab.com/YOUR_USERNAME/fdroiddata.git
cd fdroiddata
```

### Step 3: Create Metadata File
Create `metadata/com.chiranth7.vaultx.yml` in the fdroiddata repo:

```yaml
Categories:
  - Security

License: MIT

AuthorName: Chiranth Moger
AuthorEmail: chiranthmoger000@gmail.com
AuthorWebSite: https://github.com/Chiranth-Janardhan-moger

SourceCode: https://github.com/Chiranth-Janardhan-moger/vaultx-offline-password-manager
IssueTracker: https://github.com/Chiranth-Janardhan-moger/vaultx-offline-password-manager/issues
Changelog: https://github.com/Chiranth-Janardhan-moger/vaultx-offline-password-manager/blob/main/CHANGELOG.md

Summary: Secure offline password manager with autofill

Description: |-
    VaultX is a fully offline, privacy-first password manager that keeps your passwords 
    secure on your device. Your data never leaves your phone and never touches the cloud.
    
    Key Features:
    * 100% Offline - No internet connection required or requested
    * AES-256 Encryption - Military-grade security for all data
    * Biometric Unlock - Fingerprint and face unlock support
    * Android Autofill Service - Fill passwords in other apps seamlessly
    * Smart Categories - Auto-organizes passwords by service type
    * Master Password Generator - Create deterministic passwords
    * Secure Export/Import - Encrypted backup functionality
    * Multiple Themes - Dark/light modes with accessibility support
    * Password Strength Indicator - Real-time strength analysis
    * Auto-lock Timer - Configurable inactivity protection
    * Favorites System - Quick access to frequently used passwords
    * Search & Filter - Find passwords instantly
    
    Privacy & Security:
    * Zero network permissions - No internet access whatsoever
    * No analytics, tracking, or telemetry
    * No cloud storage or syncing
    * Open source and fully auditable
    * Encrypted local storage only (SQLite with AES-256)
    * Screenshot protection in sensitive screens
    * Secure clipboard handling with auto-clear
    * Screen recording protection
    
    Technical Details:
    * Built with React Native and Expo
    * Native Android autofill service implementation
    * Biometric authentication using Android Keystore
    * Material Design 3 UI with accessibility compliance
    * Supports Android 7.0+ (API level 24+)
    * APK size: ~15MB
    
    VaultX is perfect for users who prioritize privacy and want complete control 
    over their password data without any cloud dependencies.

RepoType: git
Repo: https://github.com/Chiranth-Janardhan-moger/vaultx-offline-password-manager

Builds:
  - versionName: 1.2.48
    versionCode: 248
    commit: v1.2.48
    subdir: android
    gradle:
      - yes
    prebuild: cd ../.. && npm ci && npx expo prebuild --platform android --clean
    scanignore:
      - android/app/debug.keystore
    scandelete:
      - node_modules
      - .expo

AutoUpdateMode: Version v%v
UpdateCheckMode: Tags
CurrentVersion: 1.2.48
CurrentVersionCode: 248
```

### Step 4: Commit and Push
```bash
git add metadata/com.chiranth7.vaultx.yml
git commit -m "New app: VaultX - Secure offline password manager"
git push origin master
```

### Step 5: Create Merge Request
1. Go to your fork on GitLab
2. Click "Create merge request"
3. Target: `fdroid/fdroiddata` repository
4. Title: "New app: VaultX"
5. Description: Brief description of your app
6. Submit!

## 🔄 Auto Update Explained

**AutoUpdateMode: Version v%v** means:
- F-Droid will automatically detect new versions
- When you create a new git tag like `v1.2.49`
- F-Droid will automatically create a new build entry
- You don't need to manually update the metadata for each release

**How it works:**
1. You release v1.2.49 in your repo
2. Create git tag: `git tag v1.2.49`
3. Push tag: `git push origin v1.2.49`
4. F-Droid bot automatically detects it
5. F-Droid builds and publishes the new version

## ✅ Checklist Before Submission

- [x] Removed `metadata/com.chiranth7.vaultx.yml` from your VaultX repo
- [x] Fastlane metadata exists in `fastlane/metadata/android/en-US/`
- [x] Git tag `v1.2.48` exists in your repo
- [ ] Add screenshots to `fastlane/metadata/android/en-US/images/phoneScreenshots/`
- [ ] Fork fdroiddata repository
- [ ] Create metadata file in fdroiddata repo
- [ ] Submit merge request to F-Droid

## 📚 Resources

- **F-Droid Data Repo**: https://gitlab.com/fdroid/fdroiddata
- **Submission Guide**: https://f-droid.org/docs/Submitting_to_F-Droid/
- **Metadata Reference**: https://f-droid.org/docs/Build_Metadata_Reference/
- **Your App Repo**: https://github.com/Chiranth-Janardhan-moger/vaultx-offline-password-manager

## 🎯 Summary

**What changed:**
- ❌ Deleted `metadata/com.chiranth7.vaultx.yml` from VaultX repo (as requested)
- ✅ Kept `fastlane/metadata/` structure (for other stores)
- ✅ You'll submit metadata to F-Droid's fdroiddata repo instead

**Next steps:**
1. Add screenshots to your Fastlane directory
2. Ensure git tag v1.2.48 exists
3. Fork and submit to fdroiddata repository
4. Wait for F-Droid review and approval

The F-Droid bot's request has been completed! Your VaultX repository is now properly structured for F-Droid submission.