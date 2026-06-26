# VaultX Autofill Service Guide

## Overview
VaultX now includes a system-wide Autofill Service that automatically fills your passwords in apps and browsers across Android.

## Features
- 🔐 **System-wide autofill** - Works in Chrome, Firefox, apps, and more
- 🔒 **Biometric authentication** - Requires fingerprint/face unlock before filling
- 📱 **Smart matching** - Automatically suggests passwords based on app/website
- 🚀 **Seamless experience** - No need to copy-paste passwords manually

## How to Enable

### Step 1: Enable in VaultX
1. Open VaultX
2. Go to **Settings**
3. Tap **General** section
4. Find **System Autofill** option
5. Toggle it ON

### Step 2: Set VaultX as Autofill Service
1. Android will open system settings
2. Select **VaultX** from the list
3. Tap **OK** to confirm
4. Return to VaultX

## How to Use

### In Apps
1. Open any app (e.g., Instagram, Twitter, Banking app)
2. Tap on the username or password field
3. You'll see "🔐 Fill with VaultX" in the autofill suggestions
4. Tap it
5. Authenticate with fingerprint/face
6. Password is filled automatically!

### In Browsers
1. Open Chrome, Firefox, or any browser
2. Navigate to a login page
3. Tap on the login fields
4. Select "🔐 Fill with VaultX"
5. Authenticate and fill

## How It Works

### Security
- **No passwords stored in system** - VaultX only provides passwords when you authenticate
- **Biometric required** - Every autofill requires fingerprint/face unlock
- **Encrypted vault** - Your passwords remain encrypted until needed
- **No internet** - Everything works offline

### Matching Logic
VaultX matches passwords based on:
1. **App package name** - For Android apps (e.g., com.instagram.android)
2. **Website domain** - For browsers (e.g., instagram.com)
3. **Service name** - Matches your saved service names

### Best Practices
- Use clear service names when saving passwords (e.g., "Instagram" not "IG")
- Save the full website URL for browser passwords
- Keep your vault unlocked when using autofill frequently

## Troubleshooting

### Autofill not appearing?
1. Make sure VaultX is set as the autofill service in Android Settings
2. Check that you have passwords saved for that app/website
3. Try restarting the app

### Wrong password suggested?
- Edit the password in VaultX and update the service name to match the app/website exactly

### Autofill not working in specific app?
- Some apps block autofill for security reasons
- Use the copy-paste method for these apps

## Disable Autofill

To disable:
1. Go to VaultX **Settings**
2. Tap **General**
3. Toggle **System Autofill** OFF

Or disable from Android Settings:
1. Open Android **Settings**
2. Go to **System** > **Languages & input** > **Autofill service**
3. Select **None**

## Privacy & Security

### What VaultX Can See
- Login form fields in apps/browsers
- App package names and website domains

### What VaultX Cannot See
- Your passwords (until you authenticate)
- Other app content or data
- Your browsing history

### Data Storage
- All passwords remain encrypted in VaultX
- No data is sent to external servers
- Autofill works 100% offline

## Requirements
- Android 8.0 (Oreo) or higher
- Biometric authentication enabled on device
- VaultX app installed and vault unlocked

## Support
If you encounter issues:
1. Check Android version (must be 8.0+)
2. Verify biometric is set up on your device
3. Restart VaultX and try again
4. Report issues on GitHub: https://github.com/Chiranth-Janardhan-moger/VaultX

---

**Note:** Autofill is an Android-only feature. iOS support may be added in future updates.
