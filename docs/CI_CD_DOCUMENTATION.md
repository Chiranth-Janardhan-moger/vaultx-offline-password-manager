# 🚀 VaultX CI/CD Pipeline Documentation

VaultX uses GitHub Actions to automate code validation, security scanning, dependency updates, and release publication. The pipeline is designed to be highly secure, offline-build compatible (for F-Droid compliance), and fully automated.

---

## 🛠️ Workflows Overview

### 1. **Android CI (Debug Build & Test)**
*   **File**: [.github/workflows/android.yml](file:///D:/VaultX/.github/workflows/android.yml)
*   **Triggers**: 
    *   Pushes to `main`
    *   Pull Requests targeting `main`
    *   Manual trigger (`workflow_dispatch`)
*   **Purpose**: Validates the Gradle Wrapper, runs JS/TS lint (`npm run lint`), runs Android lint (`gradle lintDebug`), executes unit tests (`gradle testDebugUnitTest`), and compiles a debug APK.
*   **Artifacts**: Uploads `vaultx-debug-apk` (retained for 7 days).

### 2. **Android CD (Release Build & Publish)**
*   **File**: [.github/workflows/release.yml](file:///D:/VaultX/.github/workflows/release.yml)
*   **Triggers**: 
    *   Push of a version tag (matching `v*`)
    *   Manual trigger with custom version tag (`workflow_dispatch`)
*   **Purpose**: Builds production-ready, signed release APK and AAB, generates SHA256 checksums, and uploads them to both GitHub and GitLab Releases.
*   **Artifacts**: Uploads signed release builds and checksums (retained for 30 days).

### 3. **Security Scanning (CodeQL & Dependency Review)**
*   **File**: [.github/workflows/security.yml](file:///D:/VaultX/.github/workflows/security.yml)
*   **Triggers**: 
    *   Pushes/PRs on `main`
    *   Scheduled run (every Sunday at 03:00 UTC)
*   **Purpose**: Performs static code analysis via CodeQL (scanning JS/TS and Java/Kotlin compiler outputs) and runs a Dependency Review on incoming Pull Requests.

### 4. **Dependabot Updates**
*   **File**: [.github/dependabot.yml](file:///D:/VaultX/.github/dependabot.yml)
*   **Triggers**: Weekly (Mondays)
*   **Purpose**: Scans package lockfiles (`/package.json` for npm and `/android` for Gradle) for outdated dependencies and opens automated pull requests.

---

## 🔒 Security Best Practices Implemented

*   **Action Pinning**: Every third-party GitHub Action in the workflow files is pinned to a specific commit SHA (rather than a mutable version tag) to prevent supply chain compromises.
*   **Minimal Permissions**: Access permissions are explicitly defined on each job (e.g. `contents: write` for release creation, `security-events: write` for uploading CodeQL alerts).
*   **Keystore Security**: The signing keystore is stored as a Base64-encoded GitHub Secret. The pipeline decodes it temporarily during build time and guarantees cleanup via an `always()` block step, leaving no traces on the runner.
*   **No Credentials in Environment/Logs**: Passwords and secrets are passed as system environment variables and git configurations but are masked by GitHub Actions runner security.
