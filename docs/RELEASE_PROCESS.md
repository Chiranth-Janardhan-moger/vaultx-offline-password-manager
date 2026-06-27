# 📦 Release Process Documentation

This document describes how to execute a new release of VaultX, verifying F-Droid compliance and leveraging the automated CD pipeline.

---

## 🏗️ 1. Pre-Release Verification & F-Droid Compliance

Before creating a new version tag, perform these verification checks:

1.  **Dependencies Compliance**:
    *   Ensure all project dependencies are open-source (FLOSS-compliant).
    *   No Firebase, Google Play Services, or closed-source libraries should be present in `package.json` or `build.gradle`.
2.  **No Network Permissions**:
    *   Check `android/app/src/main/AndroidManifest.xml` to verify that no network permission (`android.permission.INTERNET`) has been added.
3.  **Local Build Verification**:
    *   Run a local compilation test using the Android Studio bundled JDK:
        ```powershell
        $env:JAVA_HOME="C:\Program Files\Android\Android Studio\jbr"
        .\android\gradlew.bat -p android assembleRelease
        ```

---

## 🏷️ 2. Executing a New Release

VaultX release processes are fully automated using Git Tags.

### Step 1: Bump Version Numbers
Update the application version inside `app.json`, `package.json`, and the gradle configuration:
```bash
npm run version:patch   # For patch updates (e.g. 1.3.4 -> 1.3.5)
npm run version:minor   # For minor updates (e.g. 1.3.4 -> 1.4.0)
npm run version:major   # For major updates (e.g. 1.3.4 -> 2.0.0)
```
Ensure all local files are committed and pushed to the `main` branch.

### Step 2: Create and Push Git Tag
Create a signed git version tag and push it to GitHub. This triggers the **Android CD** workflow automatically:
```bash
git tag v1.3.5
git push origin v1.3.5
```

---

## 🤖 3. CD Pipeline Execution Flow

Once the tag is pushed (or triggered manually via `workflow_dispatch`):
1.  **Build Phase**:
    *   The runner checks out code, installs dependencies (`npm ci`), and prepares JDK 21.
    *   Decodes `ANDROID_KEYSTORE_BASE64` to `android/app/release.keystore`.
    *   Compiles signed release binaries (`assembleRelease` and `bundleRelease`).
    *   Deletes the local keystore file immediately.
2.  **Asset Renaming & Verification**:
    *   Renames builds to `vaultx-v<version>.apk` and `vaultx-v<version>.aab`.
    *   Calculates SHA256 hashes and saves them to text files.
3.  **GitHub Release Publication**:
    *   Creates a new GitHub Release corresponding to the tag.
    *   Uploads APK, AAB, and checksums.
4.  **GitLab/F-Droid Publication**:
    *   Executes `scripts/gitlab_release_upload.py` to upload the builds to your GitLab repository.
    *   This makes the release immediately accessible to F-Droid's automatic update check script (which scans Git Tags and uploads).
